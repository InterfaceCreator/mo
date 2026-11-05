// Связь для игры вдвоём 👫 — напрямую между телефонами (WebRTC), без серверов.
// Как телефоны находят друг друга: обмен QR-кодами.
//   1) Один показывает код («приглашение»: адрес телефона в домашней Wi-Fi и ключи шифрования).
//   2) Второй сканирует его камерой и показывает свой код («ответ»).
//   3) Первый сканирует ответ — соединились. Дальше данные идут напрямую по Wi-Fi.
// Связь пропала (телефон уснул, ушли из Wi-Fi) — обменяться кодами заново.
// Код короткий: из описания соединения берём только нужное (ключи, отпечаток, адреса), остальное собираем обратно сами.
export const PLAYERS = ['mama', 'motya'];
const ICE = [{ urls: 'stun:stun.l.google.com:19302' }];         // вдруг пригодится (разные подсети); в одной Wi-Fi хватает и без него

let me = null, pc = null, dc = null, paired = false, lostT = 0;
const H = { state: () => {}, msg: () => {}, spy: () => {} };
export const net = {
  state: 'off',                                  // off — один; wait — обмениваемся кодами; on — играем вместе
  step: null,                                    // что показываем: 'offer' (приглашение) / 'answer' (ответ) / null
  code: '',                                      // текст кода для QR
  link: 'on', spies: 0, partnerOnline: false,
  onState(f) { H.state = f; }, onMsg(f) { H.msg = f; }, onSpy(f) { H.spy = f; },
  send(m) { if (dc?.readyState === 'open') try { dc.send(JSON.stringify(m)); } catch (e) {} },
  sendSpy() {},                                  // наблюдателя без сервера нет
  get listening() { return paired; },
  get online() { return true; },
  watching: () => false,
};
const set = s => { net.state = s; H.state(s); };
const other = () => me === 'mama' ? 'motya' : 'mama';
export function netStart(who) { me = who; }

// ---------- код: короткая запись описания соединения ----------
// EGG1~o|a~кто~ufrag~pwd~отпечаток~setup~кандидаты (h|s,адрес,порт;…)
const b64 = hex => btoa(String.fromCharCode(...hex.split(':').map(h => parseInt(h, 16)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => [...atob(s.replace(/-/g, '+').replace(/_/g, '/'))].map(c => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()).join(':');
function encode(type, sdp) {
  const g = re => (sdp.match(re) || [])[1] || '';
  const cands = [];
  for (const m of sdp.matchAll(/a=candidate:\S+ 1 udp \d+ (\S+) (\d+) typ (host|srflx)/gi)) {
    const k = `${m[3][0]},${m[1]},${m[2]}`;
    if (!cands.includes(k) && cands.length < 5) cands.push(k);
  }
  return ['EGG1', type, me === 'mama' ? 'm' : 't', g(/a=ice-ufrag:(\S+)/), g(/a=ice-pwd:(\S+)/), b64(g(/a=fingerprint:sha-256 (\S+)/)), { actpass: 'x', active: 'c', passive: 'p' }[g(/a=setup:(\w+)/)] || 'c', cands.join(';')].join('~');
}
function decode(text) {
  const p = String(text).split('~');
  if (p[0] !== 'EGG1' || p.length < 8) return null;
  const [, type, who, ufrag, pwd, fp, setup, cl] = p;
  const S = { x: 'actpass', c: 'active', p: 'passive' }[setup] || 'active';
  const lines = ['v=0', 'o=- 4611731400430051336 2 IN IP4 127.0.0.1', 's=-', 't=0 0', 'a=group:BUNDLE 0', 'a=msid-semantic: WMS',
    'm=application 9 UDP/DTLS/SCTP webrtc-datachannel', 'c=IN IP4 0.0.0.0',
    `a=ice-ufrag:${ufrag}`, `a=ice-pwd:${pwd}`, 'a=ice-options:trickle', `a=fingerprint:sha-256 ${unb64(fp)}`, `a=setup:${S}`, 'a=mid:0', 'a=sctp-port:5000', 'a=max-message-size:262144'];
  (cl ? cl.split(';') : []).forEach((c, i) => {
    const [t, ip, port] = c.split(',');
    lines.push(t === 's' ? `a=candidate:${i + 1} 1 udp 1686052607 ${ip} ${port} typ srflx raddr 0.0.0.0 rport 0` : `a=candidate:${i + 1} 1 udp 2122260223 ${ip} ${port} typ host`);
  });
  lines.push('a=end-of-candidates');
  return { type: type === 'o' ? 'offer' : 'answer', who: who === 'm' ? 'mama' : 'motya', sdp: lines.join('\r\n') + '\r\n' };
}
// ждём, пока телефон соберёт свои адреса (не дольше 2.5 с)
const gather = p => new Promise(ok => {
  if (p.iceGatheringState === 'complete') return ok();
  const t = setTimeout(ok, 2500);
  p.addEventListener('icegatheringstatechange', () => { if (p.iceGatheringState === 'complete') { clearTimeout(t); ok(); } });
});

function fresh() {
  close();
  const p = pc = new RTCPeerConnection({ iceServers: ICE });
  p.onconnectionstatechange = () => {
    if (pc !== p) return;
    const s = p.connectionState;
    clearTimeout(lostT);
    if (s === 'failed' || s === 'closed') lost();
    else if (s === 'disconnected') lostT = setTimeout(() => { if (pc === p && p.connectionState !== 'connected') lost(); }, 6000);   // вдруг вернётся
  };
  p.ondatachannel = e => use(e.channel);
  return p;
}
function use(ch) {
  dc = ch;
  ch.onopen = () => { if (dc === ch) { paired = true; net.step = null; net.code = ''; set('on'); } };
  ch.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m?.t === 'bye') { lost(true); return; } if (m?.t) H.msg(m, other()); };
  ch.onclose = () => { if (dc === ch) lost(); };
}
function lost(bye) {
  if (!paired && net.state !== 'wait') return;
  const was = paired;
  paired = false; close(); net.step = null; net.code = '';
  if (was) H.msg({ t: bye ? 'left' : 'lost' }, other());
  set('off');
}
function close() {
  clearTimeout(lostT);
  const p = pc, c = dc; pc = dc = null;
  try { c?.close(); } catch (e) {} try { p?.close(); } catch (e) {}
}

// ---------- шаги ----------
// 1) показать приглашение
export async function qrHost() {
  const p = fresh();
  use(p.createDataChannel('egg', { ordered: true }));
  await p.setLocalDescription(await p.createOffer());
  await gather(p);
  if (pc !== p) return;
  net.code = encode('o', p.localDescription.sdp); net.step = 'offer'; set('wait');
}
// 2) / 3) отсканировали чужой код: приглашение — отвечаем; ответ — соединяемся. Вернёт ошибку текстом или ''
export async function qrAccept(text) {
  const d = decode(text);
  if (!d) return 'Это не код игры — наведи камеру на QR-код в игре на другом телефоне';
  if (d.who === me) return `Это код с телефона, где тоже ${me === 'mama' ? 'Мама' : 'Мотя'} — на втором телефоне выбери другого игрока`;
  try {
    if (d.type === 'offer') {
      const p = fresh();
      await p.setRemoteDescription({ type: 'offer', sdp: d.sdp });
      await p.setLocalDescription(await p.createAnswer());
      await gather(p);
      if (pc !== p) return '';
      net.code = encode('a', p.localDescription.sdp); net.step = 'answer'; set('wait');
      return '';
    }
    if (!pc || pc.signalingState !== 'have-local-offer') return 'Это ответ — его сканирует тот, кто показывал первый код. Начни заново: «Показать код»';
    await pc.setRemoteDescription({ type: 'answer', sdp: d.sdp });
    net.step = 'joining'; set('wait');
    setTimeout(() => { if (net.step === 'joining' && !paired) { close(); net.step = null; set('off'); H.msg({ t: 'fail' }, other()); } }, 12000);   // не соединились
    return '';
  } catch (e) { return 'Код не подошёл — начните заново: «Показать код»'; }
}
// закончить / отменить
export function duoOff() { if (paired) net.send({ t: 'bye' }); paired = false; close(); net.step = null; net.code = ''; set('off'); }
export const duoOn = qrHost;
