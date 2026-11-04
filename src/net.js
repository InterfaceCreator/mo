// Игра вдвоём: связь между двумя телефонами напрямую (WebRTC через PeerJS).
// Знакомит телефоны бесплатный сервер PeerJS: у каждого игрока постоянное имя в сети («eggthief-…-mama», «…-motya»),
// Мотин телефон сам находит мамин по имени — ничего вводить и сканировать не нужно. Дальше данные идут напрямую.
// Мама только ждёт, Мотя подключается к маме (и переподключается сам, если связь пропала).
// Что передаём: где герой и что на нём надето, питомцы в загоне, мебель в доме. Больше ничего.
const TEST = new URLSearchParams(location.search).has('test');
const ROOM = 'eggthief-m7q2k9' + (TEST ? '-test' : '');          // семейная «комната»: случайная приставка, чтобы не совпасть с чужими
const idOf = who => `${ROOM}-${who}`;

let peer = null, conn = null, me = null, them = null, retry = 0, wantOn = false, lib = null;
const H = { state: () => {}, msg: () => {} };
export const net = {
  state: 'off',                                  // off — один; wait — ждём второго; on — играем вместе
  onState(f) { H.state = f; }, onMsg(f) { H.msg = f; },
  send(m) { if (conn?.open) try { conn.send(m); } catch (e) {} },
  get partner() { return them; },
};
const set = s => { if (net.state !== s) { net.state = s; H.state(s); } };

// библиотеку грузим только когда позвали играть вдвоём
function load() {
  if (window.Peer) return Promise.resolve();
  return lib || (lib = new Promise((ok, no) => {
    const s = document.createElement('script'); s.src = 'vendor/peerjs.min.js';
    s.onload = ok; s.onerror = () => { lib = null; no(new Error('peerjs')); }; document.head.appendChild(s);
  }));
}

// начать: я — who, второй — other
export async function startDuo(who, other) {
  wantOn = true; me = who; them = other; set('wait');
  try { await load(); } catch (e) { set('off'); wantOn = false; return 'nolib'; }
  open();
  return 'ok';
}
export function stopDuo() {
  wantOn = false; clearTimeout(retry);
  net.send({ t: 'bye' });
  try { conn?.close(); } catch (e) {} conn = null;
  try { peer?.destroy(); } catch (e) {} peer = null;
  set('off');
}

function open() {
  if (!wantOn) return;
  try { peer?.destroy(); } catch (e) {}
  const p = peer = new window.Peer(idOf(me), { debug: 0 });
  p.on('open', () => { if (me !== 'mama') call(); });          // Мотя звонит маме; мама ждёт
  p.on('connection', c => { if (me === 'mama' || !conn?.open) use(c); });
  p.on('disconnected', () => { if (wantOn && peer === p) setTimeout(() => { try { if (!p.destroyed) p.reconnect(); } catch (e) {} }, 2000); });
  p.on('error', e => {
    if (peer !== p || !wantOn) return;
    if (e.type === 'peer-unavailable') { later(call, 3000); return; }       // второй ещё не нажал «вдвоём» — пробуем снова
    if (e.type === 'unavailable-id') { later(open, 4000); return; }         // наше имя ещё «занято» прошлым заходом — подождём
    later(open, 5000);                                                       // нет сети и прочее — заново
  });
}
const later = (f, ms) => { clearTimeout(retry); retry = setTimeout(() => wantOn && f(), ms); };
function call() {
  if (!wantOn || !peer || peer.destroyed || conn?.open) return;
  if (peer.disconnected) { later(open, 2000); return; }
  use(peer.connect(idOf(them), { reliable: true }));
  later(() => { if (!conn?.open) call(); }, 8000);              // не соединилось за 8 секунд — ещё раз
}
function use(c) {
  if (conn && conn !== c) try { conn.close(); } catch (e) {}
  conn = c;
  c.on('open', () => { if (conn === c) { clearTimeout(retry); set('on'); } });
  c.on('data', m => { if (conn === c && m && m.t) { if (m.t === 'bye') drop(c, true); else H.msg(m); } });
  c.on('close', () => drop(c));
  c.on('error', () => drop(c));
}
// связь пропала: ждём снова (Мотя сам звонит маме ещё раз)
function drop(c, bye) {
  if (conn !== c) return;
  conn = null; try { c.close(); } catch (e) {}
  if (!wantOn) return;
  set('wait'); H.msg({ t: bye ? 'left' : 'lost' });
  if (me !== 'mama') later(call, 1500);
}
