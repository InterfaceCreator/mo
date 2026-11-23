// Огород на даче 🌱: 3 грядки по 4 лунки.
// Подошёл к пустой лунке — 🌱 посадить (семена за монетки). Растёт по настоящим часам, но только пока полито:
// вода держится 20 минут, потом росток просит пить (💧 над ним) и не растёт. Воду набираешь в колодце 🪣 (лейка на 6 поливов).
// Созрело — ✨, 🧺 собрать. Урожай: продать у крыльца домика 💰, угостить друга в школе (❤️), отдать тёте Вале (особый обед).
import { T, scene, group, box } from './engine.js';
import { onLevelReset } from './world.js';
import { sprite, emojiTex, puff } from './fx.js';
import { DACHA } from './dacha.js';

const MIN = 60 * 1000;
export const CROPS = {
  carrot: { icon: '🥕', name: 'Морковка', seed: 10, sell: 25, grow: 5 * MIN },
  straw: { icon: '🍓', name: 'Клубника', seed: 20, sell: 50, grow: 15 * MIN },
  cucumber: { icon: '🥒', name: 'Огурец', seed: 30, sell: 80, grow: 30 * MIN },
  pumpkin: { icon: '🎃', name: 'Тыква', seed: 50, sell: 160, grow: 60 * MIN },
};
const WET = 20 * MIN, CAN = 6;
export const WELL = DACHA.well, PORCH = { x: DACHA.house.x, z: DACHA.house.z - 5 };
export const SLOTS = DACHA.beds.flatMap(B => [-3, -1, 1, 3].map(dx => ({ x: B.x + dx, z: B.z })));

export const garden = save => save.garden || (save.garden = { slots: SLOTS.map(() => null), crop: {}, can: 0 });
let st = null;
onLevelReset(() => { st = null; });

// ---------- рост: считаем по часам (и пока игры не было) ----------
function grow(P, now = Date.now()) {
  if (!P) return;
  const until = Math.min(now, P.wet || 0);
  if (until > P.last) P.grown = Math.min(CROPS[P.s].grow, P.grown + (until - P.last));
  P.last = now;
}
const ripe = P => P && P.grown >= CROPS[P.s].grow;
const thirsty = (P, now = Date.now()) => P && !ripe(P) && (P.wet || 0) <= now;
const stage = P => !P ? -1 : ripe(P) ? 3 : P.grown < CROPS[P.s].grow * 0.25 ? 0 : P.grown < CROPS[P.s].grow * 0.6 ? 1 : 2;

// ---------- как выглядит лунка ----------
function drawSlot(k, P) {
  const S = st.slots[k];
  if (S.g) scene.remove(S.g);
  S.g = group(scene, SLOTS[k].x, 0.25, SLOTS[k].z); S.g.userData.dynamic = true;
  const sg = stage(P), dry = thirsty(P), leaf = dry ? 0xb8b84a : 0x4ad04a;
  if (sg < 0) { box(S.g, 0.7, 0.06, 0.7, 0x6a4a2a, 0, 0.03, 0, { shadow: false }); return; }   // пустая лунка
  box(S.g, 0.8, 0.14, 0.8, 0x4a2e16, 0, 0.07, 0, { shadow: false });
  if (sg === 0) box(S.g, 0.08, 0.25, 0.08, leaf, 0, 0.25, 0, { shadow: false });
  else if (sg === 1) for (const [x, z, r] of [[-0.12, 0, 0.5], [0.12, 0.05, -0.5], [0, -0.12, 0.2]]) { const l = box(S.g, 0.12, 0.45, 0.2, leaf, x, 0.35, z, { shadow: false }); l.rotation.z = r; }
  else if (sg === 2) { box(S.g, 0.7, 0.6, 0.7, leaf, 0, 0.45, 0); box(S.g, 0.45, 0.3, 0.45, dry ? 0xc8c85a : 0x6ad13c, 0, 0.85, 0); }
  else {
    const s = P.s;
    if (s === 'carrot') { for (const [x, r] of [[-0.1, 0.4], [0.1, -0.4], [0, 0]]) { const l = box(S.g, 0.1, 0.55, 0.14, 0x3fae3a, x, 0.45, 0, { shadow: false }); l.rotation.z = r; } box(S.g, 0.32, 0.18, 0.32, 0xff8a1a, 0, 0.15, 0); }
    if (s === 'straw') { box(S.g, 0.75, 0.4, 0.75, 0x3fae3a, 0, 0.3, 0); for (const [x, z] of [[0.3, 0.3], [-0.32, 0.1], [0.05, -0.34], [-0.1, 0.36]]) box(S.g, 0.18, 0.2, 0.18, 0xff3b3b, x, 0.3, z, { shadow: false }); }
    if (s === 'cucumber') { box(S.g, 0.7, 0.35, 0.7, 0x3fae3a, 0, 0.3, 0); for (const [x, z, r] of [[0.25, 0.2, 0.3], [-0.25, -0.15, -0.4]]) { const c = box(S.g, 0.16, 0.16, 0.55, 0x2e8b3a, x, 0.2, z); c.rotation.y = r; } }
    if (s === 'pumpkin') { box(S.g, 1, 0.75, 1, 0xff8a1a, 0, 0.45, 0); box(S.g, 1.04, 0.6, 0.4, 0xff9f40, 0, 0.45, 0, { shadow: false }); box(S.g, 0.14, 0.3, 0.14, 0x3fae3a, 0, 0.95, 0); }
  }
  // значок над лункой: пить хочет — 💧, созрело — ✨
  const e = dry ? '💧' : sg === 3 ? CROPS[P.s].icon : '';
  if (e) { const sp = sprite(emojiTex(e), 0.7); sp.position.y = 1.6; S.g.add(sp); S.icon = sp; } else S.icon = null;
}

// лейка в руке героя: корпус, носик, ручка (держит за ручку, носик — вперёд)
function canModel(parent) {
  const g = group(parent); g.position.set(0, -0.15, 0.25);
  const c = group(g, 0, 0, 0);
  box(c, 0.34, 0.34, 0.44, 0x3fae5a, 0, -0.1, 0.25); box(c, 0.36, 0.06, 0.46, 0x2e8b4a, 0, 0.08, 0.25, { shadow: false });
  const sp = box(c, 0.07, 0.07, 0.55, 0x2e8b4a, 0, -0.02, 0.62); sp.rotation.x = -0.45;
  box(c, 0.13, 0.05, 0.13, 0x9aa4ad, 0, 0.1, 0.88, { shadow: false });                     // ситечко на носике
  g.userData.tip = group(c, 0, 0.1, 0.92);                                                    // отсюда льётся вода
  box(c, 0.06, 0.06, 0.34, 0x2e8b4a, 0, 0.2, 0.15);                                         // ручка сверху
  g.userData.tilt = c; g.visible = false;
  return g;
}
export function buildGarden(save, hero) {
  const G = garden(save);
  st = { save, slots: SLOTS.map(() => ({ g: null, key: '' })), t: 0, glow: 0, act: null };
  // ведро на верёвке и ручка ворота у колодца
  const W = WELL, wg = group(scene, W.x, 0, W.z); wg.userData.dynamic = true;
  st.rope = box(wg, 0.04, 1, 0.04, 0xc8a87a, 0, 2, 0, { shadow: false });
  st.bucket = group(wg, 0, 1.6, 0); box(st.bucket, 0.42, 0.42, 0.42, 0x8a8a8a, 0, 0, 0); box(st.bucket, 0.46, 0.06, 0.46, 0x6a6f7a, 0, 0.2, 0, { shadow: false }); st.water = box(st.bucket, 0.36, 0.05, 0.36, 0x3fb8ff, 0, 0.18, 0, { shadow: false }); st.water.visible = false;
  st.crank = group(wg, 1.25, 2.2, 0); box(st.crank, 0.1, 0.1, 0.5, 0x6a3f1e, 0, 0, 0.25); box(st.crank, 0.1, 0.35, 0.1, 0x6a3f1e, 0, 0.17, 0.5);
  setBucket(0);
  // лейка — как инструмент в правой руке (показывается, когда в ней есть вода и ты на даче)
  const tools = hero?.model?.tools;
  if (tools && !tools.can) tools.can = canModel(tools.axe.parent);
  st.hero = hero;
  for (const P of G.slots) grow(P);
  SLOTS.forEach((_, k) => { st.slots[k].key = keyOf(G.slots[k]); drawSlot(k, G.slots[k]); });
}
const keyOf = P => P ? `${P.s}|${stage(P)}|${thirsty(P)}` : '';

// у чего стоит герой: { slot, P } | { well } | { porch }
export function gardenNear(p) {
  if (!st || p.z < DACHA.z0 - 1) return null;
  for (let k = 0; k < SLOTS.length; k++) if (Math.abs(p.x - SLOTS[k].x) < 0.95 && Math.abs(p.z - SLOTS[k].z) < 1.3) return { slot: k, P: garden(st.save).slots[k] };
  if (Math.hypot(p.x - WELL.x, p.z - WELL.z) < 2.6) return { well: true };
  if (Math.hypot(p.x - PORCH.x, p.z - PORCH.z) < 2.4) return { porch: true };
  return null;
}
export const isRipe = ripe, isThirsty = P => thirsty(P);

export function plant(k, s) {
  const G = garden(st.save), now = Date.now();
  G.slots[k] = { s, grown: 0, last: now, wet: 0 };
  st.save.coins -= CROPS[s].seed; redraw(k);
  puff('🌱', new T.Vector3(SLOTS[k].x, 1, SLOTS[k].z), { size: 1 });
}
export function water(k) {
  const G = garden(st.save), P = G.slots[k]; if (!P || G.can <= 0) return false;
  grow(P); P.wet = Date.now() + WET; G.can--; redraw(k);
  return true;
}
export function fill() { garden(st.save).can = CAN; }
export function harvest(k) {
  const G = garden(st.save), P = G.slots[k]; if (!ripe(P)) return null;
  G.crop[P.s] = (G.crop[P.s] || 0) + 1; G.slots[k] = null; redraw(k);
  puff(CROPS[P.s].icon, new T.Vector3(SLOTS[k].x, 1.2, SLOTS[k].z), { size: 1.3, rise: 1.4 });
  return P.s;
}
function redraw(k) { const P = garden(st.save).slots[k]; st.slots[k].key = keyOf(P); drawSlot(k, P); }

// ведро: k = 0 — наверху у ворота, 1 — внизу в колодце
function setBucket(k) { const y = 1.6 - k * 1.45; st.bucket.position.y = y; st.rope.scale.y = 2.2 - y; st.rope.position.y = (2.2 + y) / 2 + 0.2; }
// действия: набрать воды (ведро вниз-вверх, ворот крутится) и полить (лейку наклоняет, льётся вода)
export function startFill(hero) { if (st.act) return; st.act = { type: 'fill', t: 0, dur: 2, at: hero.pos.clone(), face: Math.atan2(WELL.x - hero.pos.x, WELL.z - hero.pos.z) }; }
export function startWater(hero, k) { if (st.act) return; const S = SLOTS[k]; st.act = { type: 'water', k, t: 0, dur: 1.6, at: hero.pos.clone(), face: Math.atan2(S.x - hero.pos.x, S.z - hero.pos.z) }; }
export const busy = () => !!st?.act;

// раз в кадр (только на базе): растёт; сменилась стадия — перерисовать; значки покачиваются.
// Вернёт { done: 'fill' | 'water', k } — закончилось действие
export function updateGarden(dt, hero) {
  if (!st) return {};
  const ev = {};
  st.t += dt;
  // лейка в руке: на даче и в ней есть вода (или как раз набираем / поливаем), но только пока стоим/ходим (не сидим)
  const inPlot = hero.pos.z > DACHA.z0 - 2 && hero.pos.x > DACHA.x0 - 2 && hero.pos.x < DACHA.x1 + 2;
  const seated = !!hero.sit || !!hero.relax || !!hero.climb?.seat || !!hero.sleeping || !!hero.sleep || !!hero.climb?.sleep;
  hero.gardenTool = (!seated && inPlot && garden(st.save).can > 0) || st.act ? 'can' : null;
  const can = hero.model.tools.can;
  if (st.act) {
    const A = st.act; A.t += dt; const k = A.t / A.dur;
    hero.pos.copy(A.at); hero.vel.set(0, 0, 0); hero.face = A.face; hero.model.root.rotation.y = A.face;
    if (A.type === 'fill') {
      const b = k < 0.35 ? k / 0.35 : k < 0.5 ? 1 : Math.max(0, 1 - (k - 0.5) / 0.4);   // вниз — внизу — вверх
      setBucket(b); st.crank.rotation.x += dt * (k < 0.35 ? 9 : k > 0.5 ? -9 : 0);
      if (k > 0.35 && !A.splash) { A.splash = true; st.water.visible = true; for (let i = 0; i < 6; i++) puff('💦', new T.Vector3(WELL.x + (Math.random() - 0.5), 1.1 + Math.random() * 0.5, WELL.z + (Math.random() - 0.5)), { size: 0.6, rise: 1.2, life: 0.7 }); }
      if (k > 0.92 && !A.pour) { A.pour = true; puff('💧', hero.pos.clone().setY(2.2), { size: 0.8, rise: 0.4, life: 0.8 }); }
    } else {
      if (can) can.userData.tilt.rotation.x = -Math.min(1, k * 4) * 0.9;                    // наклонить лейку
      // струйка из носика лейки: капли падают вниз, на росток
      if (k > 0.2 && can) {
        const tip = can.userData.tip.getWorldPosition(new T.Vector3());
        for (let i = 0; i < 2; i++) if (Math.random() < dt * 40) puff('💧', tip.clone().add(new T.Vector3((Math.random() - 0.5) * 0.15, -Math.random() * 0.3, (Math.random() - 0.5) * 0.15)), { size: 0.3 + Math.random() * 0.2, rise: -3.2, life: 0.4 });
      }
    }
    if (A.t >= A.dur) {
      st.act = null; if (can) can.userData.tilt.rotation.x = 0;
      if (A.type === 'fill') { setBucket(0); st.water.visible = false; fill(); ev.done = 'fill'; }
      else { water(A.k); ev.done = 'water'; ev.k = A.k; puff('✨', new T.Vector3(SLOTS[A.k].x, 1.2, SLOTS[A.k].z), { size: 1 }); }
    }
  }
  if ((st.glow -= dt) <= 0) {
    st.glow = 1;
    const G = garden(st.save), now = Date.now();
    G.slots.forEach((P, k) => { grow(P, now); const key = keyOf(P); if (key !== st.slots[k].key) redraw(k); });
  }
  for (const S of st.slots) if (S.icon) S.icon.position.y = 1.6 + Math.abs(Math.sin(st.t * 3)) * 0.2;
  if (Math.random() < dt * 2) {
    const G = garden(st.save), k = Math.floor(Math.random() * SLOTS.length);
    if (ripe(G.slots[k])) puff('✨', new T.Vector3(SLOTS[k].x + (Math.random() - 0.5), 1 + Math.random(), SLOTS[k].z), { size: 0.5, rise: 0.6, life: 0.8 });
  }
  return ev;
}
// сколько осталось до урожая (для подписи)
export function timeLeft(P) {
  if (!P) return '';
  const ms = CROPS[P.s].grow - P.grown, m = Math.ceil(ms / MIN);
  return m <= 1 ? 'меньше минуты' : m < 60 ? `${m} мин` : `${Math.floor(m / 60)} ч ${m % 60 ? (m % 60) + ' мин' : ''}`.trim();
}
