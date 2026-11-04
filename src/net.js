// Связь между телефонами напрямую (WebRTC через PeerJS).
// Знакомит телефоны бесплатный сервер PeerJS: у каждого игрока постоянное имя в сети («eggthief-…-mama», «…-motya»).
// Пока игра открыта, телефон «на связи» с сервером (одно лёгкое соединение) — данные никуда не идут, пока никто не подключился.
//   Вдвоём 👫: Мотин телефон сам находит мамин по имени (мама только ждёт). Принимают друг друга, только если оба нажали 👫.
//   Наблюдатель 👁 (?spy): подключается к обоим, видит, где они и что на них надето. Его никто не видит, ему ничего не шлют, кроме этого.
// Что передаём: где герой и что на нём надето, питомцы в загоне, мебель в доме, постройки, монеты. Больше ничего.
const TEST = new URLSearchParams(location.search).has('test');
const ROOM = 'eggthief-m7q2k9' + (TEST ? '-test' : '');          // семейная «комната»: случайная приставка, чтобы не совпасть с чужими
const idOf = who => `${ROOM}-${who}`;
export const PLAYERS = ['mama', 'motya'];
const SPY_PIN = '132';                                           // наблюдателя пускают только с маминым PIN

let peer = null, me = null, lib = null, partner = null, wantDuo = false;
const spies = new Set(), watch = {}, tm = {};
const H = { state: () => {}, msg: () => {}, spy: () => {} };
export const net = {
  state: 'off',                                  // вдвоём: off — один; wait — ждём второго; on — играем вместе
  onState(f) { H.state = f; }, onMsg(f) { H.msg = f; }, onSpy(f) { H.spy = f; },
  // игрок: второму игроку и наблюдателю
  send(m) { if (partner?.open) put(partner, m); for (const c of spies) put(c, m); },
  sendSpy(m) { for (const c of spies) put(c, m); },                    // только наблюдателю (его экран)
  get spies() { return spies.size; },
  get listening() { return !!partner?.open || spies.size > 0; },          // кто-то смотрит — тогда и шлём
  get online() { return !!peer?.open; },
  watching: who => !!watch[who]?.open,
};
const put = (c, m) => { try { c.send(m); } catch (e) {} };
const set = s => { if (net.state !== s) { net.state = s; H.state(s); } };
const later = (k, f, ms) => { clearTimeout(tm[k]); tm[k] = setTimeout(f, ms); };

// библиотеку грузим после запуска игры, в фоне
function load() {
  if (window.Peer) return Promise.resolve();
  return lib || (lib = new Promise((ok, no) => {
    const s = document.createElement('script'); s.src = 'vendor/peerjs.min.js';
    s.onload = ok; s.onerror = () => { lib = null; no(new Error('peerjs')); }; document.head.appendChild(s);
  }));
}

// выйти на связь: who — 'mama', 'motya' или 'spy' (наблюдатель)
let spyPin = '';
export async function netStart(who, pin = '') {
  me = who; spyPin = pin;
  try { await load(); } catch (e) { later('open', () => netStart(who), 15000); return; }
  open();
}
function open() {
  try { peer?.destroy(); } catch (e) {}
  const p = peer = new window.Peer(idOf(me), { debug: 0 });
  p.on('open', () => { if (me === 'spy') spyCall(); else if (wantDuo && me !== 'mama') call(); });
  p.on('connection', c => {
    if (c.metadata?.spy) { if (c.metadata.pin === SPY_PIN) addSpy(c); else c.on('open', () => { try { c.close(); } catch (e) {} }); return; }
    if (me !== 'spy' && wantDuo && (me === 'mama' || !partner?.open)) use(c);
    else c.on('open', () => { try { c.close(); } catch (e) {} });          // 👫 не нажат — не принимаем
  });
  p.on('disconnected', () => { if (peer === p) later('re', () => { try { if (!p.destroyed) p.reconnect(); } catch (e) {} }, 2000); });
  p.on('error', e => {
    if (peer !== p) return;
    if (e.type === 'peer-unavailable') { if (me === 'spy') later('spy', spyCall, 4000); else if (wantDuo) later('call', call, 3000); return; }   // того ещё нет
    if (e.type === 'unavailable-id') { later('open', open, 4000); return; }         // наше имя ещё «занято» прошлым заходом — подождём
    later('open', open, 5000);                                                       // нет сети и прочее — заново
  });
}

// ---------- вдвоём ----------
export function duoOn() {
  wantDuo = true; set('wait');
  if (!peer) netStart(me); else if (me !== 'mama' && peer.open) call();
}
export function duoOff() {
  wantDuo = false; clearTimeout(tm.call);
  if (partner?.open) put(partner, { t: 'bye' });
  const c = partner; partner = null; try { c?.close(); } catch (e) {}
  set('off');
}
function call() {
  if (!wantDuo || !peer || peer.destroyed || partner?.open) return;
  if (peer.disconnected || !peer.open) { later('call', call, 2000); return; }
  use(peer.connect(idOf(me === 'mama' ? 'motya' : 'mama'), { reliable: true }));
  later('call', () => { if (!partner?.open) call(); }, 6000);       // не соединилось — ещё раз
}
function use(c) {
  if (partner && partner !== c) try { partner.close(); } catch (e) {}
  partner = c;
  c.on('open', () => { if (partner === c) { c.was = true; clearTimeout(tm.call); set('on'); } });
  c.on('data', m => { if (partner === c && m && m.t) { if (m.t === 'bye') drop(c, true); else H.msg(m, me === 'mama' ? 'motya' : 'mama'); } });
  c.on('close', () => drop(c));
  c.on('error', () => drop(c));
}
// связь пропала: ждём снова (Мотя сам звонит маме ещё раз)
function drop(c, bye) {
  if (partner !== c) return;
  partner = null; try { c.close(); } catch (e) {}
  if (!wantDuo) return;
  set('wait');
  if (c.was) H.msg({ t: bye ? 'left' : 'lost' }, me === 'mama' ? 'motya' : 'mama');
  if (me !== 'mama') later('call', call, 3000);
}

// ---------- наблюдатель ----------
function addSpy(c) {
  c.on('open', () => { spies.add(c); H.spy(c); });
  c.on('close', () => spies.delete(c)); c.on('error', () => spies.delete(c));
}
function spyCall() {
  if (!peer?.open) return;
  for (const who of PLAYERS) {
    if (watch[who]?.open || watch[who]?.pending) continue;
    const c = watch[who] = peer.connect(idOf(who), { reliable: true, metadata: { spy: 1, pin: spyPin } }); c.pending = true;
    c.on('open', () => { c.pending = false; H.msg({ t: 'hello' }, who); });
    c.on('data', m => { if (watch[who] === c && m?.t) H.msg(m, who); });
    const gone = () => { if (watch[who] !== c) return; delete watch[who]; H.msg({ t: 'gone' }, who); };
    c.on('close', gone); c.on('error', gone);
    setTimeout(() => { if (watch[who] === c && c.pending) { delete watch[who]; try { c.close(); } catch (e) {} } }, 6000);
  }
  later('spy', spyCall, 4000);                    // раз в 4 секунды — проверить, не появился ли кто-то
}
