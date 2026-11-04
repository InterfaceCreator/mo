// Игра вдвоём 👫 и наблюдатель 👁.
// Вдвоём: второй герой в мире, его загон с питомцами и его домик (в гости можно зайти). Связь — net.js.
// Каждый играет в своей игре со своим прогрессом; друг другу шлём только то, что надо показать:
// где я и что на мне надето (10 раз в секунду), мои питомцы, мебель, постройки (когда меняются).
// Раскладка базы вдвоём: мама — левый загон и домик в углу у завала, Мотя — правый загон и домик в северо-восточном углу.
// Пока играешь один, всё как раньше: свой загон слева, свой домик у завала.
// Наблюдатель (?spy) смотрит «глазами» выбранного игрока: его мир, его загон и домик, второго игрока, если они вдвоём.
// Сам наблюдатель невидим и ничего не трогает.
import { T, scene, group, dampAngle } from './engine.js';
import { level, PEN, setPenSide, otherRoam, onLevelReset } from './world.js';
import { WALK } from './player.js';
import { buildHero, animateHero, LOOK_OF } from './hero.js';
import { dressHero } from './clothes.js';
import { buildPet, petIncome, rebuildPen } from './pets.js';
import { animateAnimal } from './animals.js';
import { makeLabel, puff } from './fx.js';
import { HOUSE, HOUSE2, buildHouse } from './home.js';
import { incubators, eggMesh, nestSnap, nestApply } from './eggs.js';
import { guardSnap, guardApply, guardFollow } from './guards.js';
import { net, netStart, duoOn, duoOff, PLAYERS } from './net.js';
import { PROFILES } from './save.js';

const LOST_KEEP = 40;                    // связь пропала: столько секунд второй загон и домик ещё стоят (вдруг сейчас вернётся)
let me = null, other = null, save = null, hero = null, onLayout = () => {}, onEvent = () => {}, onGo = () => {};
let SPY = false;                          // я — наблюдатель (me — тот, за кем смотрю)
let worldT = 0, worldIdle = 0, lastWorld = '', uiLast = {};
let myCard = '', penSig = '', layout = false, lostT = 0, sendT = 0, idleT = 0, cardT = 0, lastSent = '';
const R = {};                             // другие игроки: { card, buf, m, label, carry, carryKey, wear, face, seen }
let penPets = [];
onLevelReset(() => { penPets = []; });
const rem = who => R[who] || (R[who] = { card: null, buf: [], m: null, seen: 0 });
const lastOf = who => { const b = R[who]?.buf; return b && b[b.length - 1]; };

export const duoName = (who = other) => PROFILES[who]?.name || '';
export const duoState = () => net.state;
export const duoMe = () => me;
export const together = () => layout;                       // раскладка «вдвоём» (второй загон и домик стоят)
export const myRight = () => layout && me === 'motya';      // мой загон справа?
export const houseFor = owner => layout && owner === 'motya' ? HOUSE2 : HOUSE;
export const visiting = () => !SPY && !!level.owner && level.owner !== me;
// сохранение хозяина дома, в котором я сейчас (своё или второго игрока — только посмотреть)
const asSave = c => ({ home: c.home, pets: c.pets || [], track: c.track, stars: c.stars || {} });
export const homeSave = owner => !owner || owner === me ? save : R[owner]?.card ? asSave(R[owner].card) : save;
const locKey = () => (level.id === 'home' || level.id === 'loft') ? `${level.id}:${level.owner || me}` : level.id;

export function initDuo(o) {
  ({ hero, save } = o); me = o.profile; other = me === 'mama' ? 'motya' : 'mama';
  onLayout = o.onLayout; onEvent = o.onEvent;
  net.onState(s => {
    if (s === 'on') { lostT = 0; lastSent = ''; sendCard(true); onEvent('on'); }
    if (s === 'off') setLayout(false);
    if (s === 'wait' && layout) lostT = LOST_KEEP;
    if (s !== 'on') onEvent('state');                 // кнопка 👫: мигает / серая
  });
  net.onSpy(c => { try { c.send(card()); c.send({ t: 'ui', u: uiSnap(true) }); c.send(world()); } catch (e) {} });   // подключился наблюдатель — сразу всё о себе
  net.onMsg((m, who) => {
    if (who !== other) return;
    const r = rem(who);
    if (m.t === 'card') { r.card = m; if (net.state === 'on' && !layout) setLayout(true); else cardChanged(); }
    else if (m.t === 'p') { if (layout) push(r, m); }
    else if (m.t === 'left') { onEvent('left'); setLayout(false); }
    else if (m.t === 'lost') onEvent('lost');
  });
  netStart(me);                                       // на связь — чтобы второй игрок и наблюдатель могли найти
  // экран — наблюдателю, 4 раза в секунду; отдельным таймером: пока открыта записка или замок отдыха, игра стоит, а экран всё равно нужен
  setInterval(() => { if (!net.spies) { uiLast = {}; return; } const u = uiSnap(false); if (Object.keys(u).length) net.sendSpy({ t: 'ui', u }); }, 250);
}
// кнопка 👫: позвать / закончить
export function duoToggle() {
  if (net.state !== 'off') { duoOff(); mark(false); return 'off'; }
  mark(true); duoOn(); return 'ok';
}
// страница перезагрузилась посреди игры вдвоём — подключаемся снова сами
const SK = 'egg-duo';
function mark(on) { try { on ? sessionStorage.setItem(SK, me) : sessionStorage.removeItem(SK); } catch (e) {} }
export function duoResume() { let w = null; try { w = sessionStorage.getItem(SK); } catch (e) {} if (w === me) duoOn(); }
export const duoStop = () => { if (net.state !== 'off') duoOff(); mark(false); };

function setLayout(on) {
  if (layout === on) return;
  layout = on;
  if (!on && !SPY && R[other]) { R[other].card = null; R[other].buf = []; if (R[other].m) R[other].m.root.visible = false; }
  applySide();
  onLayout(on);
}
// Мотин загон вдвоём — справа: загон, копилка и инкубаторы переезжают
export function applySide() {
  setPenSide(myRight());
  incubators.forEach((inc, i) => { inc.x = PEN.incubators[i][0]; });
}

// ---------- на базе: домик и питомцы второго игрока ----------
export function buildDuoBase(w) {
  penPets = [];
  const c = R[other]?.card;
  if (!layout || !c) return;
  buildHouse(w, other, { home: c.home }, houseFor(other), false);
  buildPenPets();
}
function buildPenPets() {
  for (const p of penPets) scene.remove(p.g);
  const c = R[other]?.card; penPets = []; penSig = petsSig(c);
  if (!c) return;
  const Rm = otherRoam(), best = [...(c.pets || [])].sort((a, b) => petIncome(b) - petIncome(a)).slice(0, c.penCap || 6);
  for (const d of best) {
    const g = group(scene); g.userData.dynamic = true;
    let m; try { m = buildPet(g, d); } catch (e) { scene.remove(g); continue; }
    g.position.set(Rm.x0 + Math.random() * (Rm.x1 - Rm.x0), 0, Rm.z0 + Math.random() * (Rm.z1 - Rm.z0));
    penPets.push({ g, m, target: g.position.clone(), wait: Math.random() * 2, face: Math.random() * 6 });
  }
}
const petsSig = c => JSON.stringify([c?.penCap, (c?.pets || []).length, c?.pets?.slice(-3)]);
// пришла новая карточка второго игрока, а мы на базе — обновить его загон (домик обновится при следующем заходе)
function cardChanged() {
  if (level.id === 'base' && layout && petsSig(R[other]?.card) !== penSig) buildPenPets();
}

// ---------- другие герои ----------
function push(r, m) { r.buf.push({ ...m, at: performance.now() }); r.seen = performance.now(); if (r.buf.length > 30) r.buf.shift(); }
function ensureHero(who) {
  const r = rem(who);
  if (r.m) return r;
  const m = r.m = buildHero(scene, LOOK_OF[who]); m.root.userData.keep = true; m.root.visible = false;
  r.label = makeLabel(3, 0.75); r.label.position.y = 3.7; m.root.add(r.label);
  Object.assign(r, { carry: null, carryKey: '', wear: '', face: 0 });
  return r;
}
function dress(r) {
  const w = JSON.stringify(r.card?.wear || {});
  if (w !== r.wear) { r.wear = w; dressHero(r.m, r.card?.wear || {}); }
}
function setCarry(r, c) {
  const k = c ? `${c.r}:${c.v || ''}` : '';
  if (k === r.carryKey) return;
  r.carryKey = k;
  if (r.carry) { r.m.root.remove(r.carry); r.carry = null; }
  if (c) { const e = r.carry = eggMesh(r.m.root, c.r, 1, c.v); e.position.set(0, 2.95 + e.scale.y * 0.5, 0.1); }
}
const lerpA = (a, b, t) => a + (((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * t;
// плавно ведём героя к тому, где он был 0.15 с назад
function drive(who, dt, online) {
  const r = ensureHero(who); dress(r);
  const b = r.buf, now = performance.now(), at = now - 150, last = b[b.length - 1];
  const show = !!last && last.k === locKey();
  r.m.root.visible = show;
  if (!show) return;
  let a = b[0], c = last;
  for (let i = 0; i < b.length - 1; i++) if (b[i].at <= at && b[i + 1].at >= at) { a = b[i]; c = b[i + 1]; break; }
  if (at >= last.at) a = c = last;
  const t = c === a ? 1 : Math.min(1, Math.max(0, (at - a.at) / (c.at - a.at)));
  r.m.root.position.set(a.x + (c.x - a.x) * t, a.y + (c.y - a.y) * t, a.z + (c.z - a.z) * t);
  r.face = lerpA(a.f, c.f, t); r.m.root.rotation.y = r.face;
  const stale = !online || now - last.at > 3000;
  r.label.userData.set((stale ? '📶 ' : '') + duoName(who), { color: stale ? '#ffb0b0' : '#ffffff' });
  setCarry(r, last.c); r.label.position.y = last.c ? 4.9 : 3.7;           // с яйцом над головой — имя выше
  animateHero(r.m, dt, { speed: stale ? 0 : c.s, maxSpeed: WALK, air: !!c.a && !stale, vy: c.vy, carry: !!last.c, tool: c.tl, glide: !!c.g, stun: !!last.st });
}

// раз в кадр
export function updateDuo(dt) {
  if (SPY) return updateSpy(dt);
  if (lostT > 0 && (lostT -= dt) <= 0 && net.state !== 'on') setLayout(false);   // долго нет связи — убираем второй загон
  // отправляем, где я — только если кто-то смотрит (второй игрок или наблюдатель); стою на месте — раз в секунду
  if (net.listening) {
    sendT -= dt; cardT -= dt;
    if (sendT <= 0) {
      const p = hero.pos, c = hero.carrying;
      const m = { t: 'p', k: locKey(), x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), f: +hero.face.toFixed(2),
        s: +(hero.animSpeed ?? hero.speed).toFixed(1), a: hero.grounded ? 0 : 1, vy: +hero.vel.y.toFixed(1), c: c ? { r: c.r, v: c.v || null } : null,
        tl: hero.toolOut || null, g: hero.gliding ? 1 : 0, d: layout ? 1 : 0, st: hero.stun > 0 ? 1 : 0 };
      const j = JSON.stringify(m);
      sendT = 0.1; idleT -= 0.1;
      if (j !== lastSent || idleT <= 0) { net.send(m); lastSent = j; idleT = 1; }
    }
    if (cardT <= 0) { cardT = 2; sendCard(); }
  }
  // наблюдателю — экран (плашки, сообщения, записки, окна) и мир (яйца в гнёздах, сторожа)
  if (net.spies) {
    if ((worldT -= dt) <= 0) { worldT = 0.2; const w = world(), j = JSON.stringify(w); if (j !== lastWorld || (worldIdle -= 0.2) <= 0) { net.sendSpy(w); lastWorld = j; worldIdle = 2; } }
  }
  if (layout && R[other]?.card) drive(other, dt, net.state === 'on');
  else if (R[other]?.m) R[other].m.root.visible = false;
  walkPets(dt);
}
function walkPets(dt) {
  if (!penPets.length) return;
  const Rm = otherRoam();
  for (const p of penPets) {
    const pos = p.g.position, dx = p.target.x - pos.x, dz = p.target.z - pos.z, d = Math.hypot(dx, dz);
    let spd = 0;
    if (d > 0.2) { spd = 1.6; pos.x += dx / d * spd * dt; pos.z += dz / d * spd * dt; p.face = dampAngle(p.face, Math.atan2(dx, dz), 6, dt); }
    else if ((p.wait -= dt) <= 0) { p.target.set(Rm.x0 + Math.random() * (Rm.x1 - Rm.x0), 0, Rm.z0 + Math.random() * (Rm.z1 - Rm.z0)); p.wait = 1.5 + Math.random() * 3.5; }
    p.m.root.rotation.y = p.face; animateAnimal(p.m, dt, spd, { hop: true });
  }
}
// где сейчас второй игрок (для карты)
export const duoAt = () => { const l = layout && lastOf(other); return l && !l.k.includes(':') ? { x: l.x, z: l.z, face: l.f, who: other } : null; };
export const duoWhere = () => { const l = lastOf(other); return layout && l ? l.k.split(':')[0] : null; };

// свои питомцы, мебель, наряд, постройки — второму игроку и наблюдателю (если что-то поменялось)
const card = () => ({ t: 'card', wear: save.ward?.wear || {}, pets: save.pets, penCap: save.penCap, home: save.home || null,
  track: { round: save.track?.round || 1 }, stars: save.stars || {}, build: save.build || {}, coins: Math.floor(save.coins || 0), speed: save.speed || 1 });
function sendCard(force) {
  const c = card(), j = JSON.stringify(c);
  if (!force && j === myCard) return;
  myCard = j; net.send(c);
}

// ---------- сердечки ----------
// рядом (ближе 5 шагов) — над героями всплывают сердечки. Считает каждый телефон сам — видно у обоих.
const HEARTS = ['❤️', '💕', '💖', '💗'], NEAR = 5;
let heartT = 0;
// раз в кадр (main.js)
export function duoAfterAnimate(dt) {
  const r = R[other], l = lastOf(other);
  if (!r?.m?.root.visible || !l || !layout) return;
  const a = SPY ? R[me]?.m?.root.position : hero.pos, b = r.m.root.position;
  if (!a || Math.hypot(a.x - b.x, a.z - b.z) > NEAR || Math.abs(a.y - b.y) > 1.5) return;
  if ((heartT -= dt) > 0) return;
  heartT = 0.8;
  const p = Math.random() < 0.5 ? a : b;
  puff(HEARTS[Math.floor(Math.random() * HEARTS.length)], new T.Vector3(p.x + (Math.random() - 0.5) * 0.8, p.y + 3.3, p.z + (Math.random() - 0.5) * 0.8), { size: 0.8, rise: 1.6, life: 1.5, dx: 0.3 });
}

// ---------- наблюдатель 👁 ----------
// смотрим «глазами» выбранного игрока: его сохранение (из карточки) подставляем в своё — база строится как у него
export function initSpy(o) {
  SPY = true; ({ hero, save } = o); document.querySelectorAll('.ov.on').forEach(e => e.classList.remove('on')); onLayout = o.onLayout; onGo = o.onGo; onEvent = o.onEvent || (() => {});
  me = 'motya'; other = 'mama';
  net.onMsg((m, who) => {
    const r = rem(who);
    if (m.t === 'card') { r.card = m; if (who === me) mirror(); else cardChanged(); onEvent('card'); }
    else if (m.t === 'p') { push(r, m); }
    else if (m.t === 'ui') { r.ui = Object.assign(r.ui || {}, m.u); if (who === me) uiApply(m.u); }
    else if (m.t === 'w') { if (who === me && m.k === locKey()) { nestApply(m.n); guardApply(m.g); } }
    else if (m.t === 'gone') { r.card = null; r.buf = []; if (r.m) r.m.root.visible = false; onEvent('gone'); }
    else if (m.t === 'hello') onEvent('hello');
  });
  netStart('spy', o.pin);
}
export function spyTarget(who) {
  if (who === me) return;
  me = who; other = who === 'mama' ? 'motya' : 'mama';
  for (const k of PLAYERS) if (R[k]?.m) R[k].m.root.visible = false;
  document.querySelectorAll('.ov.on').forEach(e => e.classList.remove('on'));    // окна прошлого — закрыть
  if (R[me]?.ui) uiApply(R[me].ui);
  mirror(true);
}
export const spyInfo = () => PLAYERS.map(who => {
  const r = R[who], l = lastOf(who);
  return { who, name: duoName(who), on: net.watching(who) && !!r?.card, coins: r?.card?.coins, speed: r?.card?.speed, loc: l?.k, duo: !!l?.d, me: who === me };
});
let mirrorSig = '';
function mirror(force) {
  const c = R[me]?.card;
  if (!c) return;
  const sig = petsSig(c) + JSON.stringify(c.build) + JSON.stringify(c.home);
  Object.assign(save, { pets: c.pets || [], penCap: c.penCap, home: c.home, build: c.build || {}, track: c.track, stars: c.stars || {}, coins: c.coins, speed: c.speed, ward: { own: {}, wear: c.wear || {} } });
  if (force || sig !== mirrorSig) { mirrorSig = sig; rebuildPen(save.pets, save.penCap); if (force) onLayout(layout); }
}
function updateSpy(dt) {
  const l = lastOf(me);
  // вдвоём ли тот, за кем смотрим (и видно ли второго)
  const lay = !!l?.d && !!R[other]?.card && net.watching(other);
  if (lay !== layout) setLayout(lay);
  if (R[me]?.card && l) {
    if (l.k !== locKey()) { const [id, owner] = l.k.split(':'); onGo(id, owner || null, { x: l.x, z: l.z, face: l.f }); }
    drive(me, dt, net.watching(me));
    hero.pos.copy(R[me].m.root.position); hero.face = R[me].face;      // камера летит за ним
  }
  if (layout && R[other]?.card) drive(other, dt, net.watching(other));
  else if (R[other]?.m) R[other].m.root.visible = false;
  guardFollow(dt);
  walkPets(dt);
}
export const isSpy = () => SPY;

// ---------- экран игрока — наблюдателю ----------
// плашки, сообщения, записки, окна (магазин, шкаф, коллекция…): что открыто и что в нём написано.
// Наблюдатель ставит у себя ровно так же — открывается и закрывается вместе с игроком, нажать там ничего нельзя.
const UI_IDS = ['hud', 'quest', 'sun', 'effects', 'kidhud', 'items', 'toast', 'note'];
function uiSnap(force) {
  const out = {}, els = new Set([...UI_IDS.map(id => document.getElementById(id)), ...document.querySelectorAll('.ov')]);
  for (const el of els) {
    if (!el?.id || el.id === 'profiles' || el.id === 'pin') continue;
    const shown = !el.classList.contains('ov') || el.classList.contains('on');
    const v = [el.className, el.getAttribute('style') || '', shown ? el.innerHTML : null], j = JSON.stringify(v);
    if (force || uiLast[el.id] !== j) { out[el.id] = v; uiLast[el.id] = j; }
  }
  return out;
}
function uiApply(u) {
  for (const [id, [cls, style, html]] of Object.entries(u)) {
    const el = document.getElementById(id); if (!el) continue;
    if (html !== null) el.innerHTML = html;
    el.className = cls; if (style) el.setAttribute('style', style); else el.removeAttribute('style');
  }
}
const world = () => ({ t: 'w', k: locKey(), n: nestSnap(), g: guardSnap() });

// для проверок в консоли
export const duoDebug = () => ({ state: net.state, layout, me, other, R: Object.fromEntries(Object.entries(R).map(([k, r]) => [k, { card: !!r.card, last: r.buf[r.buf.length - 1], vis: r.m?.root.visible }])) });
