// Игра вдвоём 👫: второй герой в мире, его загон с питомцами и его домик (в гости можно зайти).
// Связь — net.js. Каждый играет в своей игре со своим прогрессом; друг другу шлём только то, что надо показать:
// где я и что на мне надето (10 раз в секунду), мои питомцы и мебель (когда меняются).
// Раскладка базы вдвоём: мама — левый загон и домик в углу у завала, Мотя — правый загон и домик в северо-восточном углу.
// Пока играешь один, всё как раньше: свой загон слева, свой домик у завала.
import { T, scene, group, dampAngle } from './engine.js';
import { level, PEN, setPenSide, otherRoam, onLevelReset } from './world.js';
import { WALK } from './player.js';
import { buildHero, animateHero, LOOK_OF } from './hero.js';
import { dressHero } from './clothes.js';
import { buildPet, petIncome } from './pets.js';
import { animateAnimal } from './animals.js';
import { makeLabel, puff } from './fx.js';
import { HOUSE, HOUSE2, buildHouse } from './home.js';
import { incubators, eggMesh } from './eggs.js';
import { net, startDuo, stopDuo } from './net.js';
import { PROFILES } from './save.js';

const LOST_KEEP = 40;                    // связь пропала: столько секунд второй загон и домик ещё стоят (вдруг сейчас вернётся)
let me = null, other = null, save = null, hero = null, onLayout = () => {}, onEvent = () => {};
let card = null, myCard = '', penSig = '', layout = false, lostT = 0, sendT = 0, idleT = 0, cardT = 0, lastSent = '';
let rh = null;                           // второй герой: { m, label, buf, carry, wear }
let penPets = [];
onLevelReset(() => { penPets = []; });

export const duoName = () => PROFILES[other]?.name || '';
export const duoState = () => net.state;
export const together = () => layout;                       // раскладка «вдвоём» (второй загон и домик стоят)
export const myRight = () => layout && me === 'motya';      // мой загон справа?
export const houseFor = owner => layout && owner === 'motya' ? HOUSE2 : HOUSE;
export const visiting = () => !!level.owner && level.owner !== me;
// сохранение хозяина дома, в котором я сейчас (своё или второго игрока — только посмотреть)
export const homeSave = owner => !owner || owner === me ? save : card ? { home: card.home, pets: card.pets || [], track: card.track, stars: card.stars || {} } : save;
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
  net.onMsg(m => {
    if (m.t === 'card') { card = m; if (!layout) setLayout(true); else cardChanged(); }
    else if (m.t === 'p') { if (layout) { ensureHero(); rh.buf.push({ ...m, at: performance.now() }); if (rh.buf.length > 30) rh.buf.shift(); } }
    else if (m.t === 'left') { onEvent('left'); setLayout(false); }
    else if (m.t === 'lost') onEvent('lost');
  });
}
// кнопка 👫: позвать / закончить
export async function duoToggle() {
  if (net.state !== 'off') { stopDuo(); mark(false); return 'off'; }
  mark(true);
  return startDuo(me, other);
}
// страница перезагрузилась посреди игры вдвоём — подключаемся снова сами
const SK = 'egg-duo';
function mark(on) { try { on ? sessionStorage.setItem(SK, me) : sessionStorage.removeItem(SK); } catch (e) {} }
export function duoResume() { let w = null; try { w = sessionStorage.getItem(SK); } catch (e) {} if (w === me) startDuo(me, other); }
export const duoStop = () => { if (net.state !== 'off') stopDuo(); mark(false); };

function setLayout(on) {
  if (layout === on) return;
  layout = on;
  if (!on) { card = null; if (rh) rh.m.root.visible = false; }
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
  if (!layout || !card) return;
  buildHouse(w, other, { home: card.home }, houseFor(other), false);
  buildPenPets();
}
function buildPenPets() {
  for (const p of penPets) scene.remove(p.g);
  penPets = []; penSig = petsSig(card);
  const R = otherRoam(), best = [...(card.pets || [])].sort((a, b) => petIncome(b) - petIncome(a)).slice(0, card.penCap || 6);
  for (const d of best) {
    const g = group(scene); g.userData.dynamic = true;
    let m; try { m = buildPet(g, d); } catch (e) { scene.remove(g); continue; }
    g.position.set(R.x0 + Math.random() * (R.x1 - R.x0), 0, R.z0 + Math.random() * (R.z1 - R.z0));
    penPets.push({ g, m, target: g.position.clone(), wait: Math.random() * 2, face: Math.random() * 6 });
  }
}
const petsSig = c => JSON.stringify([c?.penCap, (c?.pets || []).length, c?.pets?.slice(-3)]);

// ---------- второй герой ----------
function ensureHero() {
  if (rh) return rh;
  const m = buildHero(scene, LOOK_OF[other]); m.root.userData.keep = true; m.root.visible = false;
  const label = makeLabel(3, 0.75); label.position.y = 3.7; m.root.add(label);
  return (rh = { m, label, buf: [], carry: null, carryKey: '', wear: '', face: 0 });
}
function dress() {
  const w = JSON.stringify(card?.wear || {});
  if (w === rh.wear) return;
  rh.wear = w; dressHero(rh.m, card?.wear || {});
}
function setCarry(c) {
  const k = c ? `${c.r}:${c.v || ''}` : '';
  if (k === rh.carryKey) return;
  rh.carryKey = k;
  if (rh.carry) { rh.m.root.remove(rh.carry); rh.carry = null; }
  if (c) { const e = rh.carry = eggMesh(rh.m.root, c.r, 1, c.v); e.position.set(0, 2.95 + e.scale.y * 0.5, 0.1); }
}
const lerpA = (a, b, t) => a + (((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * t;

// раз в кадр
export function updateDuo(dt) {
  if (lostT > 0 && (lostT -= dt) <= 0 && net.state !== 'on') setLayout(false);   // долго нет связи — убираем второй загон
  if (net.state !== 'on') { if (rh) rh.m.root.visible = rh.m.root.visible && layout; }
  // отправляем, где я (10 раз в секунду; стою на месте — раз в секунду)
  if (net.state === 'on') {
    sendT -= dt; cardT -= dt;
    if (sendT <= 0) {
      const p = hero.pos, c = hero.carrying;
      const m = { t: 'p', k: locKey(), x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), f: +hero.face.toFixed(2),
        s: +(hero.animSpeed ?? hero.speed).toFixed(1), a: hero.grounded ? 0 : 1, vy: +hero.vel.y.toFixed(1), c: c ? { r: c.r, v: c.v || null } : null,
        tl: hero.toolOut || null, g: hero.gliding ? 1 : 0 };
      const j = JSON.stringify(m);
      sendT = 0.1; idleT -= 0.1;
      if (j !== lastSent || idleT <= 0) { net.send(m); lastSent = j; idleT = 1; }      // стою на месте — всё равно раз в секунду
    }
    if (cardT <= 0) { cardT = 2; sendCard(); }
  }
  // второй герой: плавно ведём к тому, где он был 0.15 с назад
  if (layout && card) {
    ensureHero(); dress();
    const b = rh.buf, now = performance.now(), at = now - 150;
    const last = b[b.length - 1];
    const show = !!last && last.k === locKey();
    rh.m.root.visible = show;
    if (show) {
      let a = b[0], c = last;
      for (let i = 0; i < b.length - 1; i++) if (b[i].at <= at && b[i + 1].at >= at) { a = b[i]; c = b[i + 1]; break; }
      if (at >= last.at) a = c = last;
      const t = c === a ? 1 : Math.min(1, Math.max(0, (at - a.at) / (c.at - a.at)));
      rh.m.root.position.set(a.x + (c.x - a.x) * t, a.y + (c.y - a.y) * t, a.z + (c.z - a.z) * t);
      rh.face = lerpA(a.f, c.f, t); rh.m.root.rotation.y = rh.face;
      const stale = net.state !== 'on' || now - last.at > 3000;
      rh.label.userData.set((stale ? '📶 ' : '') + duoName(), { color: stale ? '#ffb0b0' : '#ffffff' });
      setCarry(last.c); rh.label.position.y = last.c ? 4.9 : 3.7;           // с яйцом над головой — имя выше
      animateHero(rh.m, dt, { speed: stale ? 0 : c.s, maxSpeed: WALK, air: !!c.a && !stale, vy: c.vy, carry: !!last.c, tool: c.tl, glide: !!c.g });
    }
  }
  // питомцы во втором загоне гуляют
  if (penPets.length) {
    const R = otherRoam();
    for (const p of penPets) {
      const pos = p.g.position, dx = p.target.x - pos.x, dz = p.target.z - pos.z, d = Math.hypot(dx, dz);
      let spd = 0;
      if (d > 0.2) { spd = 1.6; pos.x += dx / d * spd * dt; pos.z += dz / d * spd * dt; p.face = dampAngle(p.face, Math.atan2(dx, dz), 6, dt); }
      else if ((p.wait -= dt) <= 0) { p.target.set(R.x0 + Math.random() * (R.x1 - R.x0), 0, R.z0 + Math.random() * (R.z1 - R.z0)); p.wait = 1.5 + Math.random() * 3.5; }
      p.m.root.rotation.y = p.face; animateAnimal(p.m, dt, spd, { hop: true });
    }
  }
}
// где сейчас второй игрок (для карты)
export const duoAt = () => { const l = layout && rh?.buf[rh.buf.length - 1]; return l && !l.k.includes(':') ? { x: l.x, z: l.z, face: l.f, who: other } : null; };
export const duoWhere = () => { const l = rh?.buf[rh.buf.length - 1]; return layout && l ? l.k.split(':')[0] : null; };

// свои питомцы, мебель, наряд — второму игроку (если что-то поменялось)
function sendCard(force) {
  const c = { t: 'card', wear: save.ward?.wear || {}, pets: save.pets, penCap: save.penCap, home: save.home || null,
    track: { round: save.track?.round || 1 }, stars: save.stars || {} };
  const j = JSON.stringify(c);
  if (!force && j === myCard) return;
  myCard = j; net.send(c);
}
// пришла новая карточка второго игрока, а мы на базе — обновить его загон (домик обновится при следующем заходе)
function cardChanged() {
  if (level.id === 'base' && layout && petsSig(card) !== penSig) buildPenPets();
}

// ---------- сердечки ----------
// рядом (ближе 5 шагов) — над героями всплывают сердечки. Считает каждый телефон сам — видно у обоих.
const HEARTS = ['❤️', '💕', '💖', '💗'], NEAR = 5;
let heartT = 0;
// раз в кадр (main.js)
export function duoAfterAnimate(dt) {
  const l = rh?.buf[rh.buf.length - 1];
  if (!rh?.m.root.visible || !l || net.state !== 'on') return;
  const a = hero.pos, b = rh.m.root.position;
  if (Math.hypot(a.x - b.x, a.z - b.z) > NEAR || Math.abs(a.y - b.y) > 1.5) return;
  if ((heartT -= dt) > 0) return;
  heartT = 0.8;
  const p = Math.random() < 0.5 ? a : b;
  puff(HEARTS[Math.floor(Math.random() * HEARTS.length)], new T.Vector3(p.x + (Math.random() - 0.5) * 0.8, p.y + 3.3, p.z + (Math.random() - 0.5) * 0.8), { size: 0.8, rise: 1.6, life: 1.5, dx: 0.3 });
}

// для проверок в консоли
export const duoDebug = () => ({ state: net.state, layout, visible: rh?.m.root.visible, last: rh?.buf[rh.buf.length - 1] });
