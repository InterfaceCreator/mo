// Осенняя долина: портал из бывшей пещеры на базе. Рыжие холмы, листопад, тёплое небо.
// Развлечения: кучи листьев (прыгни — фонтан листьев и находки), колесо обозрения (круг над долиной, звезда наверху),
// горка из сена (залез по тюкам — съехал), тыквенная грядка 🎃, жёлуди под дубами 🌰, яблоня трясётся от прыжка 🍎,
// пруд с утками и островком, большой клён с лестницей вокруг ствола, каменный холм с кристаллами.
import { T, scene, group, box } from './engine.js';
import { C, level, groundY, solid, tree, portal, clouds, addCollider, onLevelReset } from './world.js';
import { buildTerrain, water } from './terrain.js';
import { defineNests } from './eggs.js';
import { addStar, addCritter, addDuck, addRotor } from './fun.js';
import { addRock } from './craft.js';
import { makeLabel, puff } from './fx.js';
import { FRIEND_HOMES } from './friends.js';

// где что лежит (карта и деревья тоже берут отсюда)
export const AUTUMN = {
  size: 160, edge: 70,
  spawn: { x: 0, z: 52 },
  pond: { x: -32, z: 10, r: 10, island: 2.6 },
  fair: { x: 24, z: 16, r: 16 }, wheel: { x: 30, z: 10, R: 8.5 },
  patch: { x0: -50, x1: -24, z0: -28, z1: -10 }, house: { x: -37, z: -38 },
  orchard: { x0: 24, x1: 52, z0: -44, z1: -16 },
  slide: { x: -8, z: -40 }, maple: { x: -52, z: 34 }, rocks: { x: 46, z: 46 },
  bowl: { x0: -20, x1: -2, z0: -24, z1: -20 },             // тыквенный боулинг Тимура (kids.js)
  piles: [[-10, 36], [14, 40], [-20, 22], [6, 4], [-12, -12], [10, -22], [-44, -2], [40, -6], [-24, 40], [52, 14], [-4, -58], [30, -54]],
  nests: [[10, -8, 1, 'boar'], [-18, 28, 2, 'deer'], [44, -52, 3, 'brownbear'], [-54, -54, 3, 'boar', 1.3], [56, 30, 2, 'goose']],
};
const A = AUTUMN;
const near = (x, z, o, r) => Math.hypot(x - o.x, z - o.z) < r;
const inRect = (x, z, R, pad = 0) => x > R.x0 - pad && x < R.x1 + pad && z > R.z0 - pad && z < R.z1 + pad;

// рельеф: пологие холмы, ровные места под постройки, пруд, каменный холм
function height(x, z) {
  if (Math.max(Math.abs(x), Math.abs(z)) > A.edge) return 10;                        // скалы по краю
  const P = A.pond, dp = Math.hypot(x - P.x, z - P.z);
  if (dp < P.island) return 1;
  if (dp < P.r) return -3;
  const R = A.rocks, dr = Math.hypot(x - R.x, z - R.z);
  if (dr < 12) return 1 + Math.max(0, Math.round(4.5 - dr / 2.5));                    // каменный холм: ступени к вершине
  if (near(x, z, A.fair, A.fair.r + 2) || inRect(x, z, A.patch, 3) || inRect(x, z, A.bowl, 2) || inRect(x, z, A.orchard, 2) || near(x, z, A.spawn, 14) ||
      near(x, z, A.slide, 12) || near(x, z, A.house, 8) || near(x, z, A.maple, 7)) return 1;
  const v = 1.2 * Math.sin(x / 16) + Math.cos(z / 13) + 0.8 * Math.sin((x + z) / 23);
  return Math.max(0, Math.min(3, Math.round(1 + v)));
}
function color(x, z, h) {
  if (h < -2) return 0x2f6fb0;
  if (h < 0) return 0xd9c27a;
  if (h >= 8) return 0x8a6a5a;
  if (Math.hypot(x - A.rocks.x, z - A.rocks.z) < 12) return h > 3 ? 0xb5aa9a : 0xa59a8a;
  if (inRect(x, z, A.patch)) return 0x8a5a2b;                                          // вспаханная грядка
  if (near(x, z, A.fair, A.fair.r)) return 0xe0c27a;                                    // утоптанная площадь ярмарки
  const v = (Math.sin(x * 0.31) + Math.cos(z * 0.27)) * 0.5;
  return v > 0.45 ? 0xe0a83a : v < -0.45 ? 0xb8a640 : 0xccae44;                         // рыжая, золотая, оливковая трава
}

let st = null;
onLevelReset(() => { st = null; });

export function buildAutumn(save) {
  const w = group(scene), rnd = seeded(11);
  buildTerrain(w, { size: A.size, cell: 4, height, color, cliff: 7, grass: 1800, grassHue: 0.08 });   // трава рыже-жёлтая
  water(w, A.size, -0.35, 0x4a9fd8);
  st = { piles: [], pumpkins: [], acorns: [], apples: [], cabins: [], wheel: null, slideT: 0, rideCool: 0 };

  // дом: портал на базу и круг, куда сторожа не заходят
  portal(w, { x: A.spawn.x, z: A.spawn.z + 8, to: 'base', color: 0x9b6bff, label: '🏠 База', rot: Math.PI });
  level.safe = { x: A.spawn.x, z: A.spawn.z + 2, r: 10 };
  const ring = new T.Mesh(new T.RingGeometry(9.4, 10, 48), new T.MeshBasicMaterial({ color: 0xffb02e, transparent: true, opacity: 0.6, side: T.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(level.safe.x, groundY(0, A.spawn.z) + 0.06, level.safe.z); w.add(ring);
  const welcome = makeLabel(7, 1.75); welcome.position.set(0, groundY(0, 44) + 5, 44); scene.add(welcome); welcome.userData.set('🍂 Осенняя долина', { color: '#ffd23f' });

  defineNests('autumn', A.nests.map(([x, z, r, guard, s]) => ({ x, z, r, guard, s, zone: { kind: 'ring', x, z } })));

  fair(w, save); pond(w, save); patch(w, save); orchard(w); slide(w, save); maple(w, save); rocks(save);

  // деревья: рыжие, красные, золотые, кое-где тёмные ёлки — не на тропах и не у построек
  const busy = [[A.spawn, 15], [A.fair, A.fair.r + 3], [A.pond, A.pond.r + 4], [A.slide, 11], [A.maple, 8], [A.rocks, 13], [A.house, 8],
    ...A.piles.map(([x, z]) => [{ x, z }, 3]), ...A.nests.map(([x, z]) => [{ x, z }, 7]), ...FRIEND_HOMES('autumn').map(o => [o, o.area || 5])];
  const free = (x, z) => Math.max(Math.abs(x), Math.abs(z)) < A.edge - 5 && !inRect(x, z, A.patch, 4) && !inRect(x, z, A.bowl, 4) && !inRect(x, z, A.orchard, 3) && !busy.some(([o, r]) => near(x, z, o, r));
  const KINDS = ['maple', 'rust', 'golden', 'maple', 'rust', 'golden', 'pine'];
  const oaks = [];
  for (let i = 0, n = 0; i < 900 && n < 85; i++) {
    const x = rnd() * 140 - 70, z = rnd() * 140 - 70; if (!free(x, z)) continue;
    const k = KINDS[Math.floor(rnd() * KINDS.length)]; tree(w, x, z, 0.8 + rnd() * 0.6, groundY(x, z), k); n++;
    if (k === 'rust' && oaks.length < 14) oaks.push([x, z]);
  }
  // жёлуди под рыжими дубами
  for (const [x, z] of oaks) { const a = rnd() * 6.28, ax = x + Math.cos(a) * 3, az = z + Math.sin(a) * 3; addAcorn(ax, az); }
  // кучи листьев
  for (const [x, z] of A.piles) addPile(x, z);
  // зверушки
  for (let i = 0; i < 4; i++) addCritter('squirrel', -20 + i * 14, 30 - i * 12, { x: -20 + i * 14, z: 30 - i * 12, r: 8 });
  addCritter('deer', -40, -46, { x: -40, z: -46, r: 10 }); addCritter('deer', 50, -2, { x: 50, z: -2, r: 10 });
  addCritter('hedgehog', 4, 30, { x: 4, z: 30, r: 6 });
  clouds(w, 10);
  return w;
}

// ---------- ярмарка и колесо обозрения ----------
function fair(w, save) {
  const F = A.fair, W = A.wheel, y = groundY(W.x, W.z), cy = y + W.R + 2.4;
  // опоры: две буквы «Л» по бокам колеса
  for (const sz of [-1.8, 1.8]) for (const sx of [-1, 1]) { const b = box(w, 0.6, W.R + 4, 0.6, 0x8a5a2b, W.x + sx * 2.6, y + (W.R + 2.4) / 2, W.z + sz, { studs: false }); b.rotation.z = sx * 0.28; }
  addCollider({ x0: W.x - 4, x1: W.x + 4, y0: y, y1: y + 1, z0: W.z - 2.2, z1: W.z + 2.2 });
  // колесо: обод, спицы, ступица — крутится
  const wheel = group(scene, W.x, cy, W.z); wheel.userData.dynamic = true;
  for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, b = box(wheel, 0.35, 2.8, 0.35, i % 2 ? 0xff5a8a : 0xffd23f, Math.cos(a) * W.R, Math.sin(a) * W.R, 0, { studs: false }); b.rotation.z = a; }
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, b = box(wheel, 0.18, W.R, 0.18, 0xffffff, Math.cos(a) * W.R / 2, Math.sin(a) * W.R / 2, 0, { studs: false }); b.rotation.z = a - Math.PI / 2; }
  box(wheel, 1.2, 1.2, 1.2, 0xff7b22, 0, 0, 0);
  addRotor(wheel, 0.22, 'z');
  // кабинки висят на ободе и не переворачиваются
  for (let i = 0; i < 8; i++) {
    const c = group(scene); c.userData.dynamic = true;
    box(c, 1.6, 1.3, 1.4, [0x3fa7ff, 0x5fd35f, 0xff5a5a, 0x9b6bff][i % 4], 0, -0.9, 0); box(c, 1.9, 0.25, 1.7, 0xffffff, 0, -0.1, 0, { studs: false });
    st.cabins.push({ c, i });
  }
  st.wheel = { g: wheel, cx: W.x, cy, cz: W.z };
  // посадка: жёлтая площадка перед колесом
  box(w, 3, 0.15, 2.2, 0xffd23f, W.x, y + 0.08, W.z + 3.6, { shadow: false });
  const lab = makeLabel(6, 1.5); lab.position.set(W.x, y + 2.8, W.z + 3.6); scene.add(lab); lab.userData.set('🎡 Колесо — встань сюда', { color: '#ffffff' });
  st.ridePad = { x: W.x, z: W.z + 3.6, y };
  addStar(save, 'autumn-wheel', W.x, W.z + 2.2, cy + W.R - 1.2);      // наверху — кабинка проезжает мимо звезды
  // палатки ярмарки с полосатыми крышами, гирлянды с лампочками, фонари
  for (const [x, z, col] of [[12, 22, 0xff5a5a], [14, 6, 0x3fa7ff], [36, 26, 0x5fd35f], [20, 30, 0x9b6bff]]) {
    const g = groundY(x, z);
    solid(w, 4, 1.2, 2, 0xc98a45, x, g, z); for (const sx of [-1, 1]) box(w, 0.25, 2.8, 0.25, 0xffffff, x + sx * 1.9, g + 1.4, z - 0.9, { studs: false });
    for (let i = 0; i < 4; i++) box(w, 1.1, 0.3, 2.6, i % 2 ? 0xffffff : col, x - 1.6 + i * 1.07, g + 2.9, z, { studs: false });
    for (let i = 0; i < 3; i++) box(w, 0.5, 0.5, 0.5, [0xff8a1a, 0xffd23f, 0xe2442a][i], x - 1 + i, g + 1.45, z, { shadow: false });   // тыквы и яблоки на прилавке
  }
  const glow = c => new T.MeshBasicMaterial({ color: c });
  const posts = [[8, 2], [8, 30], [40, 30], [40, 2]];
  for (const [x, z] of posts) { const g = groundY(x, z); box(w, 0.35, 5, 0.35, 0x5a3a1a, x, g + 2.5, z, { studs: false }); box(w, 0.7, 0.8, 0.7, 0xffb02e, x, g + 5.2, z).material = glow(0xffc04a); }
  for (let k = 0; k < posts.length; k++) {
    const [ax, az] = posts[k], [bx, bz] = posts[(k + 1) % posts.length];
    for (let i = 1; i < 12; i++) { const t = i / 12, x = ax + (bx - ax) * t, z = az + (bz - az) * t, sag = Math.sin(t * Math.PI) * 1.4; box(w, 0.3, 0.3, 0.3, [0xff5a5a, 0xffd23f, 0x5fd35f, 0x3fa7ff][i % 4], x, groundY(x, z) + 4.9 - sag, z, { shadow: false }).material = glow([0xff7a7a, 0xffe14d, 0x8fff8f, 0x7fd4ff][i % 4]); }
  }
  // тюки сена — посидеть
  for (const [x, z] of [[18, 14], [20, 18], [16, 12]]) solid(w, 2, 1, 1.2, 0xe8c45a, x, groundY(x, z), z);
}

// ---------- пруд: утки, листья на воде, камни-переходы к островку со звездой ----------
function pond(w, save) {
  const P = A.pond;
  for (const sx of [0, 1]) addDuck(() => P.x + (sx ? 3 : -3), P.z - 6, 12);
  for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 3.5 + (i % 4) * 1.4; const lf = box(w, 0.5, 0.04, 0.4, [0xe2442a, 0xff8a1a, 0xffc22a][i % 3], P.x + Math.cos(a) * r, -0.32, P.z + Math.sin(a) * r, { shadow: false }); lf.rotation.y = a; }
  for (let i = 0; i < 3; i++) solid(w, 1.4, 3.3, 1.4, 0x9a9aaa, P.x + 8 - i * 2.5, -3, P.z, { studs: true });   // верх камня — на 0,3
  addStar(save, 'autumn-island', P.x, P.z, groundY(P.x, P.z));
  tree(w, P.x - 1.2, P.z + 1.2, 0.6, groundY(P.x, P.z), 'maple');
}

// ---------- тыквенная грядка, домик-тыква со звездой внутри ----------
function patch(w, save) {
  const R = A.patch;
  for (let x = R.x0 + 3; x < R.x1 - 1; x += 4) for (let z = R.z0 + 3; z < R.z1 - 1; z += 3.5) addPumpkin(x, z);
  // домик-тыква: стены с дверью на север, крыша — шапка с хвостиком
  const H = A.house, y = groundY(H.x, H.z), O = 0xff8a1a;
  solid(w, 7, 4.5, 1, O, H.x, y, H.z - 3, { cam: true });
  for (const sx of [-1, 1]) solid(w, 1, 4.5, 7, O, H.x + sx * 3, y, H.z, { cam: true });
  for (const sx of [-1, 1]) solid(w, 2.5, 4.5, 1, O, H.x + sx * 2.25, y, H.z + 3, { cam: true });
  solid(w, 2, 1.5, 1, O, H.x, y + 3, H.z + 3, { cam: true });
  solid(w, 7.4, 1, 7.4, 0xe07a10, H.x, y + 4.5, H.z, { cam: true }); box(w, 0.8, 1.6, 0.8, 0x3f8a2a, H.x, y + 6.3, H.z);
  for (const sx of [-2, 0, 2]) box(w, 0.3, 4.4, 0.06, 0xe07a10, H.x + sx, y + 2.25, H.z + 3.53, { shadow: false, studs: false });   // рёбра тыквы
  addStar(save, 'autumn-pumpkin', H.x, H.z - 1, y);
  // забор вокруг грядки (с проходом на север)
  for (let x = R.x0 - 1; x <= R.x1 + 1; x += 2) for (const z of [R.z0 - 1]) solid(w, 0.4, 1.2, 0.4, C.fence, x, groundY(x, z), z, { studs: false });
}
function addPumpkin(x, z) {
  const y = groundY(x, z), g = group(scene, x, y, z); g.userData.dynamic = true;
  box(g, 1.1, 0.8, 1.1, 0xff8a1a, 0, 0.4, 0); for (const sx of [-0.3, 0.3]) box(g, 0.06, 0.78, 1.12, 0xe07a10, sx, 0.4, 0, { shadow: false, studs: false });
  box(g, 0.16, 0.35, 0.16, 0x3f8a2a, 0, 0.95, 0, { shadow: false });
  st.pumpkins.push({ x, z, y, g, t: 0 });
}

// ---------- яблоневый сад: прыгни у яблони — падают яблоки ----------
function orchard(w) {
  const R = A.orchard;
  for (let x = R.x0 + 4; x < R.x1 - 2; x += 8) for (let z = R.z0 + 4; z < R.z1 - 2; z += 9) { tree(w, x, z, 1, groundY(x, z), 'aapple'); st.apples.push({ x, z, t: 0 }); }
  const lab = makeLabel(6, 1.5); lab.position.set((R.x0 + R.x1) / 2, 7, R.z1 + 2); scene.add(lab); lab.userData.set('🍎 Сад — подпрыгни у яблони!', { color: '#ffffff' });
}

// ---------- горка из сена: тюки-ступеньки наверх, оттуда — съезжаешь ----------
function slide(w, save) {
  const S = A.slide, y = groundY(S.x, S.z), HAY = 0xe8c45a, TOP = 6;
  solid(w, 4, TOP, 4, HAY, S.x, y, S.z, { cam: true });
  for (let i = 1; i < TOP; i++) solid(w, 2, i, 3, i % 2 ? HAY : 0xd9b048, S.x + 1 + (TOP - i) * 2, y, S.z);   // лесенка из тюков с востока
  // скат на запад: доска с бортиками
  const L = 15, ramp = group(w, S.x - 2 - L / 2 * Math.cos(0.38), y + TOP / 2, S.z); ramp.rotation.z = 0.38;    // западный конец ниже
  box(ramp, L, 0.3, 2.6, 0xff5a3d); for (const sz of [-1.3, 1.3]) box(ramp, L, 0.5, 0.2, 0xffd23f, 0, 0.35, sz);
  const lab = makeLabel(5.5, 1.4); lab.position.set(S.x, y + TOP + 2.6, S.z); scene.add(lab); lab.userData.set('🛝 Горка — залезь и съезжай', { color: '#ffffff' });
  st.slide = { x: S.x, z: S.z, top: y + TOP, y };
  addStar(save, 'autumn-slide', S.x + 1, S.z - 1, y + TOP);
}

// ---------- большой клён: лестница вокруг ствола, наверху — площадка со звездой ----------
function maple(w, save) {
  const M = A.maple, y = groundY(M.x, M.z), H = 13;
  solid(w, 2.4, H, 2.4, C.trunk, M.x, y, M.z, { cam: true });
  // ступени — снаружи площадки (иначе головой о её дно), крона — выше роста героя
  for (let i = 0; i < H; i++) { const a = i * 0.5, r = 3.4; solid(w, 1.8, 0.4, 1.8, 0xa0622a, M.x + Math.cos(a) * r, y + i + 0.6, M.z + Math.sin(a) * r); }
  solid(w, 4.4, 0.5, 4.4, 0xa0622a, M.x, y + H, M.z);
  box(w, 9, 3, 9, 0xe2442a, M.x, y + H + 5, M.z); box(w, 6, 2, 6, 0xff6a3d, M.x, y + H + 7.4, M.z);
  addCollider({ x0: M.x - 4.5, x1: M.x + 4.5, y0: y + H + 3.5, y1: y + H + 8.4, z0: M.z - 4.5, z1: M.z + 4.5, cam: true, ghost: true });
  addStar(save, 'autumn-maple', M.x + 1, M.z + 1, y + H + 0.5);
}

// ---------- каменный холм: кристаллы под кирку, звезда на вершине ----------
function rocks(save) {
  const R = A.rocks;
  for (const [dx, dz] of [[-8, 4], [6, -7], [-4, -9], [8, 6]]) addRock(R.x + dx, R.z + dz, 'cluster');
  for (const [dx, dz] of [[-9, -2], [2, 9]]) addRock(R.x + dx, R.z + dz, 'boulder', true);
  addStar(save, 'autumn-rocks', R.x, R.z, groundY(R.x, R.z));
}

// ---------- кучи листьев и жёлуди ----------
function addPile(x, z) {
  const y = groundY(x, z), g = group(scene, x, y, z); g.userData.dynamic = true;
  box(g, 2.6, 0.7, 2.4, 0xe2442a, 0, 0.35, 0, { studs: false }); box(g, 1.8, 0.6, 1.8, 0xff8a1a, 0.2, 0.9, -0.1, { studs: false }); box(g, 1, 0.4, 1, 0xffc22a, -0.2, 1.3, 0.2, { studs: false });
  st.piles.push({ x, z, y, g, cool: 0 });
}
function addAcorn(x, z) {
  const y = groundY(x, z), g = group(scene, x, y, z); g.userData.dynamic = true;
  box(g, 0.32, 0.36, 0.32, 0xb5703a, 0, 0.2, 0, { shadow: false }); box(g, 0.38, 0.14, 0.38, 0x6a4a2a, 0, 0.42, 0, { shadow: false });
  st.acorns.push({ x, z, y, g, t: 0 });
}

// раз в кадр в долине. Возвращает { sfx: [...], coins, say, got: { acorn, pumpkin } }
export function updateAutumn(dt, hero, save) {
  if (!st) return {};
  const ev = { sfx: [], got: {} }, p = hero.pos, t = performance.now() / 1000;
  // кабинки колеса: по кругу вслед за ободом, всегда донизу
  if (st.wheel) { const W = st.wheel, a0 = W.g.rotation.z; for (const cb of st.cabins) { const a = a0 + cb.i / 8 * Math.PI * 2; cb.c.position.set(W.cx + Math.cos(a) * A.wheel.R, W.cy + Math.sin(a) * A.wheel.R, W.cz); } }
  st.rideCool -= dt;
  if (!hero.climb && st.rideCool <= 0) {
    // колесо: встал на жёлтую площадку — круг над долиной (16 секунд), сойдёшь там же
    const R = st.ridePad, onPad = Math.abs(p.x - R.x) < 1.5 && Math.abs(p.z - R.z) < 1.1;
    if (!onPad && Math.hypot(p.x - R.x, p.z - R.z) > 2.4) st.padArmed = true;            // сошёл с площадки — можно снова
    if (hero.grounded && onPad && st.padArmed !== false) {
      const W = st.wheel, rr = A.wheel.R, z = W.cz + 2.2, a0 = -Math.PI / 2;
      hero.climb = { ride: k => new T.Vector3(W.cx + Math.cos(a0 + k * Math.PI * 2) * rr, W.cy + Math.sin(a0 + k * Math.PI * 2) * rr - 1.2, z), t: 0, dur: 16, face: 0, exit: new T.Vector3(3, 3, 7) };   // в конце — соскок вперёд, мимо площадки
      st.rideCool = 3; st.padArmed = false; ev.sfx.push('boing'); ev.say = '🎡 Ух ты! Смотри, какая долина сверху!<small>нажми прыжок — спрыгнешь</small>';
    }
    // горка: стоишь наверху у западного края — едешь вниз
    const S = st.slide;
    if (hero.grounded && p.y > S.top - 0.4 && p.x < S.x - 0.6 && Math.abs(p.z - S.z) < 1.8) {
      const from = new T.Vector3(S.x - 2, S.top, S.z), to = new T.Vector3(S.x - 2 - 14, S.y + 0.2, S.z);
      hero.climb = { ride: k => from.clone().lerp(to, k * k * (2 - k)).setY(from.y + (to.y - from.y) * Math.min(1, k * 1.15)), t: 0, dur: 1.6, face: -Math.PI / 2, exit: new T.Vector3(-9, 2, 0) };
      st.rideCool = 2; ev.sfx.push('boing'); ev.say = '🛝 Уиии!';
    }
  }
  // кучи листьев: вбежал или прыгнул — фонтан листьев, подлетаешь, иногда находка
  for (const L of st.piles) {
    L.cool -= dt; L.g.scale.y = Math.min(1, L.g.scale.y + dt * 0.25);
    if (L.cool > 0 || Math.hypot(p.x - L.x, p.z - L.z) > 1.7 || p.y > L.y + 1.8 || (hero.speed < 1.5 && hero.vel.y > -1)) continue;
    L.cool = 5; L.g.scale.y = 0.25; hero.vel.y = 9; hero.grounded = false;
    for (let i = 0; i < 7; i++) setTimeout(() => puff(['🍂', '🍁', '🍂'][i % 3], new T.Vector3(L.x + (Math.random() - 0.5) * 2, L.y + 1, L.z + (Math.random() - 0.5) * 2), { size: 1, rise: 2.2 + Math.random(), life: 1.3, dx: (Math.random() - 0.5) * 2 }), i * 50);
    ev.sfx.push('collect');
    const r = Math.random();
    if (r < 0.25) { ev.got.acorn = (ev.got.acorn || 0) + 1; ev.say = '🌰 В листьях был жёлудь!'; }
    else if (r < 0.4) { ev.coins = (ev.coins || 0) + 10; ev.say = '🪙 В листьях была монетка!'; }
  }
  // тыквы и жёлуди: подошёл — забрал; через время вырастают снова
  for (const P of st.pumpkins) {
    if (!P.g.visible) { if ((P.t -= dt) <= 0) P.g.visible = true; continue; }
    if (Math.hypot(p.x - P.x, p.z - P.z) < 1.3 && Math.abs(p.y - P.y) < 1.5) { P.g.visible = false; P.t = 120; ev.got.pumpkin = (ev.got.pumpkin || 0) + 1; ev.sfx.push('collect'); puff('🎃', new T.Vector3(P.x, P.y + 1.5, P.z), { size: 1 }); }
  }
  for (const N of st.acorns) {
    if (!N.g.visible) { if ((N.t -= dt) <= 0) N.g.visible = true; continue; }
    N.g.rotation.y = t * 0.8;
    if (Math.hypot(p.x - N.x, p.z - N.z) < 1.1 && Math.abs(p.y - N.y) < 1.5) { N.g.visible = false; N.t = 90; ev.got.acorn = (ev.got.acorn || 0) + 1; ev.sfx.push('collect'); puff('🌰', new T.Vector3(N.x, N.y + 1.2, N.z), { size: 0.9 }); }
  }
  // яблони: подпрыгнул рядом — посыпались яблоки (раз в 25 секунд с одной яблони)
  for (const T2 of st.apples) {
    T2.t -= dt;
    if (T2.t <= 0 && hero.jumped && Math.hypot(p.x - T2.x, p.z - T2.z) < 3.4) {
      T2.t = 25; ev.coins = (ev.coins || 0) + 15; ev.sfx.push('coins'); ev.say = '🍎 Яблоки посыпались! +15 монет';
      for (let i = 0; i < 4; i++) puff('🍎', new T.Vector3(T2.x + (Math.random() - 0.5) * 3, groundY(T2.x, T2.z) + 4, T2.z + (Math.random() - 0.5) * 3), { size: 0.9, rise: -2.5, life: 1.2 });
    }
  }
  return ev;
}

function seeded(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
