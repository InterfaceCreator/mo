// Раскопки в Долине динозавров 🦴⛏️: площадка 20×20, копать можно вглубь на 8 слоёв (песок → глина → камень, на дне скала).
// Под землёй в случайных местах спрятаны находки: окаменелости для музея (сначала те, которых ещё нет), кристаллы, янтарь,
// монетки; глубже — реже и ценнее: сундук с кладом и золотое динозавровое яйцо (в инкубатор).
// Где-то рядом находка — из земли сыплются искорки ✨. Каждый день площадка засыпается заново и прячет новое.
// Копает кубик перед собой (от ног до головы), иначе — под ногами; из ямы — кнопка ⬆️. Лопата — у Профессора (или с дачи).
import { T, scene, group, box, BOX, studTex } from './engine.js';
import { solid, addCollider } from './world.js';
import { makeLabel, puff, chips, confetti } from './fx.js';
import { toast } from './ui.js';
import { SFX } from './sfx.js';
import { dig, digHold } from './bunker.js';
import { dinoSave, addFossil, FOSSILS } from './dinoquest.js';
import { persist } from './save.js';

export const DPIT = { x0: 400, z0: 80, n: 20, depth: 8 };
const N = DPIT.n, DEP = DPIT.depth, X0 = DPIT.x0, Z0 = DPIT.z0;
const KIND = [{ c: 0x7fd85a, hp: 1, chip: 0x5fc84a }, { c: 0xe8c88a, hp: 1, chip: 0xd0b070 }, { c: 0xd08a4a, hp: 2, chip: 0xb06a30 }, { c: 0x8f8fa0, hp: 3, chip: 0x6f6f80 }];
const kindOf = L => L === 0 ? 0 : L <= 2 ? 1 : L <= 4 ? 2 : 3;
const today = () => new Date().toDateString();
const hash = (i, j, L) => { const s = Math.sin(i * 12.9898 + j * 78.233 + L * 37.719) * 43758.5453; return s - Math.floor(s); };
const cellAt = (x, z) => { const i = Math.floor(x - X0), j = Math.floor(z - Z0); return i >= 0 && j >= 0 && i < N && j < N ? { i, j, k: j * N + i } : null; };
export const inDinoPit = p => p.x > X0 - 0.5 && p.x < X0 + N + 0.5 && p.z > Z0 - 0.5 && p.z < Z0 + N + 0.5 && p.y > -DEP - 2;
// находки (кроме окаменелостей): эмодзи, название, редкость (1 — обычная, 2 — редкая, 3 — очень редкая, 4 — легендарная),
// на какой глубине бывает (слои), вес (как часто), что даёт. give(save, ev) → подпись для сообщения
const res = (save, k, n) => { save.res[k] = (save.res[k] || 0) + n; };
const egg = (r, v) => (save, ev) => { ev.giveEgg = { r, v }; return 'уже летит в инкубатор 🐣'; };
const LOOT = {
  coins:    { e: '🪙', name: 'Монетки', tier: 1, L: [1, 3], w: 30, give: s => { s.coins += 25; return '+25 монет'; } },
  bag:      { e: '💰', name: 'Мешочек монет', tier: 1, L: [2, 4], w: 14, give: s => { s.coins += 60; return '+60 монет'; } },
  crystal:  { e: '💎', name: 'Кристалл', tier: 1, L: [2, 5], w: 16, give: s => { res(s, 'crystal', 2); return '+2 кристалла'; } },
  pebble:   { e: '🪨', name: 'Красивый камешек', tier: 1, L: [1, 3], w: 10, give: s => { res(s, 'stone', 1); s.coins += 10; return '+10 монет и камень'; } },
  toy:      { e: '🧸', name: 'Древняя игрушка-динозаврик', tier: 1, L: [1, 4], w: 8, give: s => { s.coins += 30; return '+30 монет · кто-то играл ею миллион лет назад 😄'; } },
  amber:    { e: '🟠', name: 'Янтарь с древним комариком', tier: 2, L: [3, 5], w: 10, give: s => { s.coins += 40; return '+40 монет · комарику миллионы лет!'; } },
  nugget:   { e: '🟡', name: 'Золотой самородок', tier: 2, L: [3, 6], w: 8, give: s => { s.coins += 80; return '+80 монет'; } },
  druse:    { e: '🔮', name: 'Кристальная друза', tier: 2, L: [4, 7], w: 6, give: s => { res(s, 'crystal', 5); return '+5 кристаллов'; } },
  egg_spots:{ e: '🥚', name: 'Пятнистое динозавровое яйцо', tier: 2, L: [3, 6], w: 6, give: egg(2, 'spots') },
  map:      { e: '🗺️', name: 'Карта сокровищ', tier: 2, L: [2, 3], w: 0, give: () => 'на площадке загорелся маяк — там зарыто самое ценное!' },
  egg_rainbow: { e: '🌈', name: 'Радужное яйцо', tier: 3, L: [5, 7], w: 3, give: egg(3, 'rainbow') },
  egg_crystal: { e: '💠', name: 'Кристальное яйцо', tier: 3, L: [5, 7], w: 3, give: egg(3, 'crystal') },
  goldegg:  { e: '🥚', name: 'Золотое динозавровое яйцо', tier: 3, L: [6, 7], w: 3, give: egg(4, 'gold') },
  egg_giant:{ e: '🥚', name: 'Огромное динозавровое яйцо', tier: 3, L: [6, 7], w: 2, give: egg(4, 'giant') },
  chest:    { e: '🧰', name: 'Сундук с кладом', tier: 3, L: [6, 7], w: 0, give: s => { s.coins += 150; res(s, 'crystal', 3); return '+150 монет и 3 кристалла'; } },
  egg_sun:  { e: '☀️', name: 'Солнечное яйцо дракона', tier: 4, L: [7, 7], w: 0, give: egg(5, 'sun') },
};
export const LOOT_INFO = LOOT;
const TIER = ['', '', '✨ Редкая находка! ', '🌟 Очень редкая находка! ', '🏆 ЛЕГЕНДАРНАЯ НАХОДКА! '];

let st = null;
function pitData(save) {
  const d = dinoSave(save);
  if (d.pit?.day !== today()) {                                          // новый день — земля снова ровная, находки новые
    let s = 5; for (const ch of today()) s = (s * 31 + ch.charCodeAt(0)) % 2147483647;
    const R = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    const missing = FOSSILS.map(f => f[0]).filter(k => !d.fossils[k]).sort(() => R() - 0.5);
    const items = [], used = new Set();
    const put = (id, a0, a1) => { for (let a = 0; a < 50; a++) { const i = Math.floor(R() * N), j = Math.floor(R() * N), L = a0 + Math.floor(R() * (a1 - a0 + 1)); const key = j * N + i; if (used.has(key)) continue; used.add(key); items.push({ id, i, j, L }); return; } };
    const putLoot = id => put(id, LOOT[id].L[0], LOOT[id].L[1]);
    for (let n = 0; n < 6; n++) put('fossil:' + (missing[n] || FOSSILS[Math.floor(R() * FOSSILS.length)][0]), 1, 5);
    for (let n = 0; n < 4; n++) put('coins', 1, 1);                  // монетки у самой поверхности — чтобы находки попадались сразу
    putLoot('map'); putLoot('chest');                                  // карта сокровищ и сундук — каждый день
    if (R() < 0.2) putLoot('egg_sun');                                 // солнечное яйцо дракона — иногда, на самом дне
    const pool = Object.entries(LOOT).filter(([, l]) => l.w > 0), total = pool.reduce((a, [, l]) => a + l.w, 0);
    for (let n = 0; n < 14; n++) { let x = R() * total; for (const [id, l] of pool) if ((x -= l.w) < 0) { putLoot(id); break; } }
    d.pit = { day: today(), d: '0'.repeat(N * N), items, got: [] };
  }
  return d.pit;
}

export function buildDinoPit(g, save) {
  const P = pitData(save);
  st = { g, save, d: [...P.d].map(Number), cols: [], hp: new Map(), dig: null, sparkT: 0 };
  const X1 = X0 + N, Z1 = Z0 + N, mx = (X0 + X1) / 2, mz = (Z0 + Z1) / 2;
  solid(g, N + 2, 1, N + 2, 0x4a4a55, mx, -DEP - 1, mz);                     // скала на дне
  for (const [y0, y1, c] of [[-3, -1, KIND[1].c], [-5, -3, KIND[2].c], [-DEP - 1, -5, KIND[3].c]]) {   // стенки ямы снаружи
    const h = y1 - y0;
    solid(g, N + 2, h, 1, c, mx, y0, Z0 - 0.5); solid(g, N + 2, h, 1, c, mx, y0, Z1 + 0.5);
    solid(g, 1, h, N, c, X0 - 0.5, y0, mz); solid(g, 1, h, N, c, X1 + 0.5, y0, mz);
  }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++)
    st.cols.push(addCollider({ x0: X0 + i, x1: X0 + i + 1, z0: Z0 + j, z1: Z0 + j + 1, y0: -DEP - 1, y1: -st.d[j * N + i], cam: true }));
  st.mesh = new T.InstancedMesh(BOX, new T.MeshLambertMaterial({ map: studTex }), N * N * DEP);
  st.mesh.frustumCulled = false; st.mesh.castShadow = st.mesh.receiveShadow = true; st.mesh.userData.dynamic = true; g.add(st.mesh);
  redraw();
  st.mark = new T.Mesh(BOX, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false }));
  st.mark.scale.setScalar(1.04); st.mark.visible = false; g.add(st.mark);
  // колышки с жёлтой лентой по углам и табличка
  for (const [x, z] of [[X0, Z0], [X1, Z0], [X0, Z1], [X1, Z1]]) box(g, 0.2, 1.3, 0.2, 0x8a5a2b, x, 0.65, z);
  for (const [x0, z0, x1, z1] of [[X0, Z0, X1, Z0], [X0, Z1, X1, Z1], [X0, Z0, X0, Z1], [X1, Z0, X1, Z1]]) box(g, Math.abs(x1 - x0) + 0.05, 0.08, Math.abs(z1 - z0) + 0.05, 0xffd23f, (x0 + x1) / 2, 1.1, (z0 + z1) / 2, { shadow: false });
  st.label = makeLabel(6.4, 1.4); st.label.position.set(mx, 4.6, Z0 - 1); scene.add(st.label); setLabel();
  // маяк над главным кладом (когда найдена карта сокровищ)
  st.beacon = new T.Mesh(new T.CylinderGeometry(0.6, 0.6, 14, 12, 1, true), new T.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.35, depthWrite: false, side: T.DoubleSide }));
  st.beacon.visible = false; g.add(st.beacon); showBeacon();
}
function bestItem(P) {                                                     // куда показывает карта: самое ценное, что ещё в земле
  const left = P.items.map((it, n) => ({ it, n })).filter(o => !P.got.includes(o.n) && !o.it.id.startsWith('fossil:'));
  return left.sort((a, b) => (LOOT[b.it.id]?.tier || 0) - (LOOT[a.it.id]?.tier || 0))[0];
}
function showBeacon() {
  const P = pitData(st.save), b = P.map && bestItem(P);
  st.beacon.visible = !!b && (LOOT[b.it.id]?.tier || 0) >= 3;
  if (st.beacon.visible) st.beacon.position.set(X0 + b.it.i + 0.5, 6, Z0 + b.it.j + 0.5);
}
function setLabel() { const P = pitData(st.save); st.label.userData.set(`🦴 Раскопки · копай вглубь ⛏️ · находок: ${P.got.length} из ${P.items.length}`, { color: '#ffe14d' }); }

const M4 = new T.Matrix4(), COL = new T.Color();
function redraw() {
  const d = st.d, top = (i, j) => (i < 0 || j < 0 || i >= N || j >= N) ? 0 : d[j * N + i];
  let n = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    for (let L = d[j * N + i]; L < DEP; L++) {
      if (!(L === d[j * N + i] || top(i - 1, j) > L || top(i + 1, j) > L || top(i, j - 1) > L || top(i, j + 1) > L)) continue;
      M4.makeTranslation(X0 + i + 0.5, -L - 0.5, Z0 + j + 0.5); st.mesh.setMatrixAt(n, M4);
      COL.setHex(KIND[kindOf(L)].c).multiplyScalar(0.9 + hash(i, j, L) * 0.18); st.mesh.setColorAt(n, COL); n++;
    }
  }
  st.mesh.count = n; st.mesh.instanceMatrix.needsUpdate = true; if (st.mesh.instanceColor) st.mesh.instanceColor.needsUpdate = true;
}

export function pitItems(hero) {
  if (!st || hero.climb || !st.save.tools.shovel) return [];
  const p = hero.pos;
  if (!(p.x > X0 - 2.5 && p.x < X0 + N + 2.5 && p.z > Z0 - 2.5 && p.z < Z0 + N + 2.5 && p.y < 1)) return [];
  const out = [{ id: 'g_dig', icon: '⛏️', hold: digHold }];
  if (p.y < -1.6) out.push({ id: 'g_dino_pitup', icon: '⬆️' });
  return out;
}
export function pitClimbOut(hero) {
  if (!st || hero.climb) return;
  const p = hero.pos, o = [[p.x - X0, X0 - 0.8, p.z], [X0 + N - p.x, X0 + N + 0.8, p.z], [p.z - Z0, p.x, Z0 - 0.8], [Z0 + N - p.z, p.x, Z0 + N + 0.8]].sort((a, b) => a[0] - b[0]);
  hero.climb = { from: p.clone(), to: new T.Vector3(o[0][1], 0, o[0][2]), t: 0 }; hero.vel.set(0, 0, 0); SFX.climb();
}

// раз в кадр (в Долине). События: { save, giveEgg, big }
export function updateDinoPit(dt, hero, save) {
  const ev = {};
  if (!st) return ev;
  const p = hero.pos, P = pitData(save), has = !!save.tools.shovel;
  const inArea = p.x > X0 - 2 && p.x < X0 + N + 2 && p.z > Z0 - 2 && p.z < Z0 + N + 2 && p.y > -DEP - 1 && p.y < 1;
  if (inArea) { hero.digTool = has ? 'shovel' : null; hero.camFloor = inDinoPit(p) && p.y < -0.3 ? Math.min(0.4, p.y + 1.2) : undefined; }
  else if (st.wasIn) { hero.digTool = null; hero.camFloor = undefined; }
  st.wasIn = inArea;
  let tg = null;
  if (has && inArea && hero.grounded && !hero.climb) {
    const f = cellAt(p.x + Math.sin(hero.face) * 0.95, p.z + Math.cos(hero.face) * 0.95), h = cellAt(p.x, p.z);
    if (f && (!h || f.k !== h.k) && -st.d[f.k] >= p.y - 0.25 && -st.d[f.k] <= p.y + 3.05 && st.d[f.k] < DEP) tg = { ...f, down: false };
    else if (h && Math.abs(-st.d[h.k] - p.y) < 0.3 && st.d[h.k] < DEP) tg = { ...h, down: true };
  }
  st.mark.visible = !!tg && !st.dig;
  if (tg) st.mark.position.set(X0 + tg.i + 0.5, -st.d[tg.k] - 0.5, Z0 + tg.j + 0.5);
  if (st.dig) {
    const D = st.dig; D.t = Math.min(1, D.t + dt / 0.42);
    if (!D.hit && D.t >= 0.55) { D.hit = true; hit(D.tg, hero, ev); }
    if (D.t >= 1) st.dig = null;
  } else if (inArea && (dig.hold || dig.tap) && tg) {
    st.dig = { t: 0, tg, hit: false };
    if (!tg.down) { hero.face = Math.atan2(X0 + tg.i + 0.5 - p.x, Z0 + tg.j + 0.5 - p.z); hero.model.root.rotation.y = hero.face; }
  }
  if (inArea) { dig.tap = false; hero.dig = st.dig; }
  // искорки над находкой, если до неё близко (не глубже двух кубиков от верха столбика)
  if ((st.sparkT -= dt) <= 0) {
    st.sparkT = 0.5;
    P.items.forEach((it, n) => {
      if (P.got.includes(n)) return;
      const k = it.j * N + it.i, x = X0 + it.i + 0.5, z = Z0 + it.j + 0.5;
      if (it.L - st.d[k] <= 2 && Math.hypot(p.x - x, p.z - z) < 7) puff((LOOT[it.id]?.tier || 0) >= 3 ? '🌟' : '✨', new T.Vector3(x + (Math.random() - 0.5) * 0.6, -st.d[k] + 0.3, z + (Math.random() - 0.5) * 0.6), { size: 0.5, rise: 0.7, life: 0.9 });
    });
  }
  return ev;
}

function hit(tg, hero, ev) {
  const k = tg.k, L = st.d[k]; if (L >= DEP) return;
  const K = KIND[kindOf(L)], save = st.save, P = pitData(save);
  const pos = new T.Vector3(X0 + tg.i + 0.5, -L - 0.2, Z0 + tg.j + 0.5), floor = -L - 1 + 0.05;
  chips(pos, K.chip, 6, floor); SFX[kindOf(L) === 3 ? 'mine' : 'dig']?.();
  const left = (st.hp.get(k) ?? K.hp) - 1;
  if (left > 0) { st.hp.set(k, left); return; }
  st.hp.delete(k); st.d[k] = L + 1; st.cols[k].y1 = -(L + 1); P.d = st.d.join(''); ev.save = true;
  chips(pos, K.c, 10, floor);
  if (tg.down) { hero.pos.x += (X0 + tg.i + 0.5 - hero.pos.x) * 0.7; hero.pos.z += (Z0 + tg.j + 0.5 - hero.pos.z) * 0.7; }
  redraw();
  const n = P.items.findIndex((it, idx) => it.i === tg.i && it.j === tg.j && it.L === L && !P.got.includes(idx));
  if (n < 0) { if (kindOf(L) >= 2 && Math.random() < 0.12) { save.coins += 2; puff('coin', pos.clone().setY(pos.y + 1), { size: 0.8, rise: 1.4 }); } return; }
  P.got.push(n); const it = P.items[n], d = dinoSave(save);
  if (it.id.startsWith('fossil:')) { confetti(pos.clone(), 50); SFX.chest(); ev.big = true; addFossil(save, it.id.slice(7), pos); }
  else {
    const l = LOOT[it.id] || LOOT.coins, what = l.give(save, ev);
    d.finds ||= {}; d.finds[it.id] = (d.finds[it.id] || 0) + 1;
    puff(l.e, pos.clone().setY(pos.y + 1.4), { size: 1.4 + l.tier * 0.3, rise: 1.4, life: 2 });
    confetti(pos.clone(), 40 + l.tier * 30); if (l.tier >= 3) { SFX.fanfare(); ev.big = true; } else SFX.chest();
    if (it.id === 'map') { P.map = 1; showBeacon(); }
    toast(`${TIER[l.tier]}${l.e} ${l.name}!<small>${what}</small>`);
  }
  showBeacon();
  setLabel(); persist();
}
