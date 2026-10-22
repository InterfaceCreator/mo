// Гнёзда (яйца появляются заново по таймеру) и инкубаторы в загоне (яйцо вылупляется по времени).
// Состояние гнёзд и инкубаторов живёт всё время игры; меши есть только у того, что в текущей локации.
import { T, scene } from './engine.js';
import { nest, makeEgg, PEN, onLevelReset, groundY, bake } from './world.js';
import { RARITY } from './pets.js';
import { B } from './balance.js';
import { makeLabel, arc, puff, confetti } from './fx.js';

export const REFILL = 60;      // раз в столько секунд пустые гнёзда наполняются

// вид яйца: цвета — от редкости, рисунок и блеск — от особого яйца v
const LOOK = {
  spots: R => [R.base, R.stripe, R.glow || 0, 'spots'],
  gold: () => [0xffd23f, 0xfff3a0, 0x664400, 'gold'],
  rainbow: () => [0xffffff, 0xffffff, 0x221133, 'rainbow'],
  quick: R => [R.base, R.stripe, R.glow || 0, 'quick'],
  giant: R => [R.base, R.stripe, R.glow || 0, 'cracks'],
  crystal: () => [0xbff0ff, 0x7fd4ff, 0x1a5070, 'crystal'],
};
export const VARIANT_NAME = { spots: 'Пятнистое', gold: 'Золотое', rainbow: 'Радужное', quick: 'Быстрое', giant: 'Огромное', crystal: 'Кристальное' };
export const VARIANT_INFO = { spots: 'чаще большие питомцы', gold: 'часто золотой питомец', rainbow: 'может выйти радужный питомец ×6', quick: 'вылупляется в 2,5 раза быстрее', giant: 'питомец на ступень реже, но нести тяжело', crystal: 'при вылуплении — кристаллы' };
export function eggMesh(parent, r, s = 1, v = null) {
  const R = RARITY[r], [base, stripe, glow, pattern] = v ? LOOK[v](R) : [R.base, R.stripe, R.glow || 0, R.pattern || 'stripes'];
  return makeEgg(parent, 0, 0, 0, s * (v === 'giant' ? 1.35 : 1), base, stripe, glow, pattern);
}
// шанс особого яйца растёт от Маяка удачи (luck = 1 + 0.35 × уровень)
let luck = 1;
export function setLuck(k) { luck = k; }
function rollVariant() {
  let x = Math.random();
  for (const [v, { chance }] of Object.entries(B.VARIANTS)) { if ((x -= chance * luck) < 0) return v; }
  return null;
}

// ---------- гнёзда ----------
// все гнёзда всех локаций: { id, loc, x, z, r, guard, s, zone, every, has, r1, away, cycle }
const all = new Map();
export const nests = [];       // гнёзда текущей локации (с мешами)
onLevelReset(() => { for (const n of nests) { n.g = null; n.egg = null; } nests.length = 0; });

// описать гнёзда локации (один раз; дальше состояние сохраняется)
export function defineNests(loc, defs) {
  defs.forEach((d, i) => {
    const id = loc + ':' + i;
    if (!all.has(id)) { const n = { id, loc, ...d, s: d.s || 1, has: false, away: false, cycle: 0 }; roll(n); all.set(id, n); }
  });
}
// иногда яйцо на ступень реже; иногда — особое
function roll(n) { n.has = true; n.r1 = Math.min(n.r + (Math.random() < B.RARITY_UP * luck ? 1 : 0), RARITY.length - 1); n.v = rollVariant(); }

// построить гнёзда локации в сцене
export function buildNests(loc) {
  for (const n of all.values()) {
    if (n.loc !== loc) continue;
    n.y = n.y0 ?? groundY(n.x, n.z);                 // y0 — гнездо высоко (на домике)
    n.g = nest(scene, n.x, n.z, n.s, n.y); bake(n.g);                 // веточки гнезда — одним мешем
    n.egg = null; if (n.has) showEgg(n);
    n.label = makeLabel(2.8, 0.7); n.label.position.set(n.x, n.y + 2 * n.s, n.z); scene.add(n.label); n.label.visible = false;
    nests.push(n);
  }
}
function showEgg(n) { n.egg = eggMesh(n.g, n.r1, 1.1 * n.s, n.v); n.egg.position.y = 0.12 * n.s + n.egg.scale.x * 0.65; }

let refillT = REFILL;
export const refillLeft = () => refillT;
// таймер общий для всех локаций
export function updateNests(dt) {
  // над пустым гнездом — через сколько там снова будет яйцо
  const left = Math.max(0, Math.ceil(refillT - dt));
  for (const n of nests) {
    n.label.visible = !n.has;
    if (n.has) continue;
    const t = left + (n.every ? (n.every - n.cycle % n.every - 1) * REFILL : 0);      // редкие гнёзда пропускают круги
    n.label.userData.set(n.away ? '🥚 у тебя!' : `🥚 через ${t > 59 ? Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0') : t + ' с'}`, { color: '#ffe14d' });
  }
  if ((refillT -= dt) > 0) return false;
  refillT = REFILL; let any = false;
  for (const n of all.values()) if (!n.has && !n.away) {
    if (n.every && (++n.cycle) % n.every) continue;
    roll(n);
    if (n.g) { showEgg(n); any = true; puff('✨', new T.Vector3(n.x, n.y + 1.5 * n.s, n.z), { size: 1 }); }
  }
  return any;
}

// гнездо с яйцом рядом с точкой — или null
export function nestNear(p) {
  for (const n of nests) if (n.has && !n.away && Math.hypot(p.x - n.x, p.z - n.z) < 1.3 + n.s * 0.4 && Math.abs(p.y - n.y) < 1.5 * n.s) return n;
  return null;
}
// забрать яйцо: возвращаем меш, его понесёт герой
export function takeEgg(n) { const m = n.egg; n.egg = null; n.has = false; n.away = true; n.g.remove(m); return { mesh: m, r: n.r1, v: n.v, nest: n }; }
// сторож отобрал — яйцо летит обратно в гнездо
export function returnEgg(carry, from) {
  const n = carry.nest, m = carry.mesh;
  scene.add(m); m.position.copy(from); m.rotation.set(0, 0, 0);
  const g = n.g;
  arc(m, from.clone(), new T.Vector3(n.x, n.y + 0.12 * n.s + m.scale.x * 0.65, n.z), 0.8, 4, () => {
    scene.remove(m); n.has = true; n.away = false;
    if (g && n.g === g) { g.add(m); m.position.set(0, 0.12 * n.s + m.scale.x * 0.65, 0); n.egg = m; }
  });
}
// яйцо положили в инкубатор — гнездо снова ждёт своего таймера
export function releaseNest(n) { n.away = false; }

// ---------- инкубаторы ----------
// данные: { x, z, r, end, full }; меши (g, label, egg) есть только на базе
export const incubators = PEN.incubators.map(([x, z]) => ({ x, z, r: 0, end: 0, full: false, g: null, label: null, egg: null }));
onLevelReset(() => { for (const inc of incubators) inc.g = inc.label = inc.egg = null; });
let slots = 3;

export function buildIncubators() {
  incubators.forEach((inc, i) => {
    inc.g = nest(scene, inc.x, inc.z, 1.15); bake(inc.g); inc.g.visible = i < slots;
    inc.label = makeLabel(2.6, 0.65); inc.label.position.set(inc.x, 3.4, inc.z); scene.add(inc.label); inc.label.visible = inc.full;
    if (inc.full) showIncEgg(inc);
  });
}
function showIncEgg(inc, from) {
  inc.egg = eggMesh(scene, inc.r, 1.25, inc.v);
  const to = new T.Vector3(inc.x, 0.15 + inc.egg.scale.x * 0.65, inc.z);
  if (from) arc(inc.egg, from, to, 0.6, 2.5); else inc.egg.position.copy(to);
}
// сколько инкубаторов куплено — остальные гнёзда спрятаны
export function setIncSlots(n) { slots = n; incubators.forEach((inc, i) => { if (inc.g) inc.g.visible = i < n; }); }
export const freeIncubator = () => incubators.find((inc, i) => i < slots && !inc.full) || null;

// положить яйцо редкости r; end — когда вылупится (Date.now()); from — откуда летит (точка в мире)
export function placeEgg(inc, r, end, from, loc = 'forest', v = null) {
  inc.r = r; inc.end = end; inc.full = true; inc.loc = loc; inc.v = v;     // loc — откуда яйцо: от этого зависит, кто вылупится
  if (inc.g) { showIncEgg(inc, from); inc.label.visible = true; }
}

// раз в кадр (в любой локации): таймеры; возвращает вылупившихся [{ inc, r }]
export function updateIncubators(now) {
  const out = [];
  for (const inc of incubators) {
    if (!inc.full) continue;
    const left = Math.max(0, Math.ceil((inc.end - now) / 1000));
    if (inc.egg) {
      inc.label.userData.set(left > 59 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : left + ' c', { color: RARITY[inc.r].color });
      // за 3 секунды до вылупления яйцо трясётся
      inc.egg.rotation.z = left <= 3 ? Math.sin(now / 50) * 0.15 : Math.sin(now / 600) * 0.03;
    }
    if (now >= inc.end) {
      inc.full = false;
      if (inc.egg) {
        scene.remove(inc.egg); inc.egg = null; inc.label.visible = false;
        const p = new T.Vector3(inc.x, 0.5, inc.z);
        puff('🐣', p.clone().setY(2), { size: 1.6, rise: 1 }); confetti(p, 40);
      }
      out.push({ inc, r: inc.r, loc: inc.loc, v: inc.v });
    }
  }
  return out;
}
