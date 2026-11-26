// Лесная дорога и Долина динозавров 🦖 — продолжение базы на восток (три сектора, sectors.js):
//   🌲 Лес (x 66…200): ворота в восточной стене базы, извилистая дорога, ручей с мостиком, домик на дереве
//      со смотровой площадкой (видно вулкан), поляна прыгучих грибов, зайчики, белки, олени, бабочки, указатели.
//   🌴 Джунгли (x 200…300): пальмы, папоротники, огромные листья, попугаи — «уже совсем близко!».
//   🦖 Долина (x 300…430): арка из костей, сонный вулкан (пыхтит и иногда выплёвывает кристаллы 💎 — собирай;
//      на вершину можно запрыгать по уступам — вулкан подбрасывает вверх), озеро с длинношеим бронтозавром,
//      гуляющие динозаврики, катание на трицератопсе 🦕, полёт на птеродактиле 🪽, четыре гнезда с динозавровыми
//      яйцами (одно сторожит Сонный Рекс — добрый и неуклюжий), «птеродактиль-почта» — относит яйцо в инкубатор,
//      волшебный пенёк «домой». Из яиц Долины вылупляются динозаврики (pets.js, home 'dinos').
// Ничего страшного: динозавры добрые, никто не рычит, сторожа как везде — смешно гоняются и забирают яйцо.
import { T, scene, group, box, mat } from './engine.js';
import { solid, tree, addCollider, door, onLevelReset } from './world.js';
import { makeLabel, puff, confetti, arc } from './fx.js';
import { addMushroom, addCritter, addButterfly } from './fun.js';
import { water } from './terrain.js';
import { createLampPost } from './daynight.js';
import { defineNests } from './eggs.js';
import { buildDino, animateAnimal } from './animals.js';
import { buildQuests, questItems, questUse, passDone, dinoSave, BUSY, SLIDE_PTS, LOST_SPOTS } from './dinoquest.js';
import { relief, noise, flatMask, grassColor } from './relief.js';
import { buildPlay, playItems, playUse, setFlyPath, BUSY2, danceLeft } from './dinoplay.js';
import { buildDinoPit, pitItems, pitClimbOut, DPIT } from './dinopit.js';

export const DINO = { gate: { x: 66, z: 43, w: 6 }, forest: { x0: 66, x1: 200 }, jungle: { x0: 200, x1: 300 }, valley: { x0: 300, x1: 430 }, z0: -30, z1: 120 };
export const VALLEY_SPAWN = { x: 312, z: 40, face: Math.PI / 2 };          // волшебный пенёк с базы — сюда
export const GATE_SPAWN = { x: 58, z: 43, face: -Math.PI / 2 };            // пенёк «домой» — к воротам базы, внутрь
const TRI = { x: 330, z: 30 }, PERCH = { x: 318, z: 72, h: 3 }, POST = { x: 309, z: 52 }, HOME_PAD = { x: 309, z: 30 }, VOLC = { x: 395, z: 5, r: 15, h: 13 }, LAKE = { x: 350, z: 84, s: 26 };

// гнёзда Долины: [x, z, редкость, сторож, размер]; pet: 'dinos' — из яиц вылупляются динозаврики
defineNests('base', [
  { x: 332, z: 12, r: 2, guard: 'dino', s: 1.2, pet: 'dinos', zone: { kind: 'ring', x: 332, z: 12 } },
  { x: 356, z: -8, r: 3, guard: 'dino', s: 1.2, pet: 'dinos', zone: { kind: 'ring', x: 356, z: -8 } },
  { x: 372, z: 62, r: 3, guard: 'dino', s: 1.2, pet: 'dinos', zone: { kind: 'ring', x: 372, z: 62 } },
  { x: 382, z: 32, r: 4, guard: 'trex', s: 1.5, pet: 'dinos', zone: { kind: 'ring', x: 382, z: 32 } },
]);

// ---------- дорога: одна плавная кривая на все три сектора ----------
const ROAD = [[60, 43], [78, 43], [92, 38], [106, 31], [120, 33], [134, 43], [148, 51], [162, 50], [176, 43], [190, 36], [204, 34], [218, 38], [232, 46], [246, 51], [260, 49], [274, 43], [288, 40], [302, 40], [318, 40]];
const curve = new T.CatmullRomCurve3(ROAD.map(([x, z]) => new T.Vector3(x, 0, z)));
const SAMPLES = (() => { const n = Math.ceil(curve.getLength() / 1.2), P = curve.getSpacedPoints(n); return P.map((p, i) => { const t = curve.getTangentAt(Math.min(1, i / n)), l = Math.hypot(t.x, t.z) || 1; return { x: p.x, z: p.z, rx: t.z / l, rz: -t.x / l }; }); })();
const roadDist = (x, z) => { let d = 1e9; for (let i = 0; i < SAMPLES.length; i += 3) { const q = SAMPLES[i]; d = Math.min(d, Math.hypot(q.x - x, q.z - z)); } return d; };
function roadRibbon(g, x0, x1) {
  const S = SAMPLES.filter(q => q.x >= x0 - 1.3 && q.x <= x1 + 1.3); if (S.length < 2) return;
  for (const [W, y, c] of [[2.2, 0.05, 0xd9b98a], [2.6, 0.045, 0xbfa070]]) {
    const pos = [], idx = [];
    S.forEach((q, i) => { pos.push(q.x - q.rx * W, y, q.z - q.rz * W, q.x + q.rx * W, y, q.z + q.rz * W); if (i < S.length - 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } });
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = new T.Mesh(geo, mat(c)); m.receiveShadow = true; g.add(m);
  }
}
function seeded(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
const sign = (g, x, z, text, color = '#ffe14d') => { box(g, 0.25, 2.8, 0.25, 0x6a3f1e, x, 1.4, z); box(g, 2.6, 0.7, 0.12, 0xc8a87a, x, 2.6, z); const l = makeLabel(5.2, 1.2); l.position.set(x, 3.6, z); scene.add(l); l.userData.set(text, { color }); };
// земля сектора и живая изгородь по краям (дальше — не пройти)
function ground(g, x0, x1, color, edges, hole = null) {
  const Z0 = DINO.z0, Z1 = DINO.z1, mz = (Z0 + Z1) / 2;
  if (!hole) solid(g, x1 - x0, 1, Z1 - Z0, color, (x0 + x1) / 2, -1, mz, { studs: true });
  else for (const [a, b, c, e] of [[x0, x1, Z0, hole.z0], [x0, x1, hole.z1, Z1], [x0, hole.x0, hole.z0, hole.z1], [hole.x1, x1, hole.z0, hole.z1]])   // с дыркой под раскопки
    solid(g, b - a, 1, e - c, color, (a + b) / 2, -1, (c + e) / 2, { studs: true });
  solid(g, x1 - x0, 3, 1.4, 0x3f9e3a, (x0 + x1) / 2, 0, Z0 + 0.7, { cam: true }); solid(g, x1 - x0, 3, 1.4, 0x3f9e3a, (x0 + x1) / 2, 0, Z1 - 0.7, { cam: true });
  for (const [ex, z0, z1] of edges) solid(g, 1.4, 3, z1 - z0, 0x3f9e3a, ex, 0, (z0 + z1) / 2, { cam: true });
}
// пальма: изогнутый ствол и листья во все стороны
function palm(g, x, z, s = 1, y = 0) {
  const p = group(g, x, y, z), lean = (Math.sin(x * 3.1 + z) * 0.5);
  for (let i = 0; i < 6; i++) box(p, 0.55 * s, 1.0 * s, 0.55 * s, i % 2 ? 0x9a6a3c : 0x8a5a2b, lean * i * 0.12 * s, (0.5 + i) * s, 0);
  const top = group(p, lean * 0.72 * s, 6 * s, 0);
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, lf = box(top, 3.2 * s, 0.12, 0.9 * s, k % 2 ? 0x3fae3a : 0x2e9a2e, Math.cos(a) * 1.4 * s, -0.25, Math.sin(a) * 1.4 * s); lf.rotation.y = -a; lf.rotation.z = -0.35; }
  for (let k = 0; k < 3; k++) box(top, 0.4, 0.4, 0.4, 0x7a5a2b, Math.cos(k * 2.1) * 0.35, -0.45, Math.sin(k * 2.1) * 0.35);   // кокосы
  addCollider({ x0: x - 0.4, x1: x + 0.4, z0: z - 0.4, z1: z + 0.4, y0: y, y1: y + 6 * s });
}
function fern(g, x, z, y = 0) { for (let k = 0; k < 4; k++) { const f = box(g, 1.6, 0.1, 0.45, 0x4cc23a, x, y + 0.35, z); f.rotation.y = k * 0.8; f.rotation.z = 0.3; } }
function flowers(g, R, x0, x1, n, cols, H = () => 0) {
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * (x1 - x0), z = DINO.z0 + 3 + R() * (DINO.z1 - DINO.z0 - 6); if (roadDist(x, z) < 3.5) continue;
    const y = H(x, z); box(g, 0.08, 0.4, 0.08, 0x3fae3a, x, y + 0.2, z, { shadow: false, studs: false }); box(g, 0.3, 0.2, 0.3, cols[i % cols.length], x, y + 0.45, z, { shadow: false, studs: false });
  }
}

// холмы сектора (relief.js): ровно у дорожки и в зонах zones; amp — высота холмов
const roadZone = { d: (x, z) => roadDist(x, z) - 4.5 };
function hills(g, id, x0, x1, zones, seed, amp = 8, scale = 20, margin = 10) {
  const N = noise(seed), flat = flatMask([roadZone, ...zones], margin);
  return relief(g, { id, x0, x1, z0: DINO.z0 + 1.4, z1: DINO.z1 - 1.4, height: (x, z) => (N(x, z, scale) * amp - amp * 0.32) * flat(x, z), color: grassColor(0.29) });
}

let st = null;              // состояние Долины (пересобирается вместе с сектором)
let fst = null;             // состояние леса и джунглей
onLevelReset(() => { st = null; fst = null; });

// ================= 🌲 ЛЕС =================
export function buildForestRoad(g, save) {
  const { x0, x1 } = DINO.forest, R = seeded(777);
  fst = { parrotT: 2, splashT: 0 };
  ground(g, x0, x1, 0x5fc84a, [[x0 + 0.7, DINO.z0, -6], [x0 + 0.7, 104, DINO.z1]]);   // у базы: изгородь севернее и южнее её стены
  roadRibbon(g, x0, x1);
  // ручей поперёк (x ≈ 120) и мостик на дороге
  const wm = water(g, 6, 0.06, 0x3fb0ff); wm.scale.set(1, (DINO.z1 - DINO.z0) / 6, 1); wm.position.set(120, 0.06, (DINO.z0 + DINO.z1) / 2); wm.material.map.repeat.set(0.75, (DINO.z1 - DINO.z0) / 8); wm.userData.dynamic = true;
  for (const sx of [-3.4, 3.4]) box(g, 0.8, 0.08, DINO.z1 - DINO.z0, 0x8a6a3a, 120 + sx, 0.05, (DINO.z0 + DINO.z1) / 2, { shadow: false });
  const bz = SAMPLES.reduce((a, q) => Math.abs(q.x - 120) < Math.abs(a.x - 120) ? q : a).z;
  solid(g, 9, 0.3, 5, 0x9c6a3c, 120, 0, bz, { studs: false });
  for (let i = 0; i < 9; i++) box(g, 0.9, 0.06, 5, i % 2 ? 0xa0703f : 0x8f6234, 115.9 + i, 0.33, bz, { shadow: false });
  for (const sz of [-2.4, 2.4]) { for (let i = 0; i < 5; i++) box(g, 0.18, 1.2, 0.18, 0x6a3f1e, 116.4 + i * 1.8, 0.9, bz + sz); solid(g, 9, 0.16, 0.16, 0x8a5a2b, 120, 1.4, bz + sz, { studs: false }); }
  fst.stream = { x: 120, bz };
  const H = hills(g, 'forest', x0, x1, [[x0 - 2, x0 + 8, DINO.z0, DINO.z1], [113, 127, DINO.z0, DINO.z1], { c: [142, 20, 11] }, [158, 188, 56, 92], { c: [70, 38, 5] }], 31, 9);
  // домик на дереве: толстый ствол, площадка на высоте 6, вокруг ствола — лесенка
  const TH = { x: 142, z: 20 };
  solid(g, 2.2, 11, 2.2, 0x8a5a2b, TH.x, 0, TH.z, { cam: true });
  box(g, 9, 3.2, 9, 0x6ad13c, TH.x, 11.2, TH.z, { studs: true }); box(g, 6, 2, 6, 0x7fe04a, TH.x, 13.4, TH.z, { studs: true });
  addCollider({ x0: TH.x - 4.5, x1: TH.x + 4.5, y0: 9.6, y1: 14.4, z0: TH.z - 4.5, z1: TH.z + 4.5, cam: true, ghost: true });   // крона: камера сквозь неё не лезет
  solid(g, 7, 0.4, 7, 0xa0703f, TH.x, 6, TH.z, { studs: false });
  for (const [dx, dz, w, d] of [[0, -3.4, 7, 0.2], [0, 3.4, 7, 0.2], [-3.4, 0, 0.2, 7], [3.4, 1.2, 0.2, 4.6]]) solid(g, w, 1.1, d, 0x8a5a2b, TH.x + dx, 6.4, TH.z + dz, { studs: false });   // перила (вход — с востока)
  box(g, 4.4, 2.6, 3.2, 0xc98a45, TH.x - 0.8, 7.7, TH.z - 1.4); box(g, 5, 0.3, 3.8, 0xc0392b, TH.x - 0.8, 9.1, TH.z - 1.4);   // домик с крышей
  box(g, 1.1, 1.6, 0.1, 0x6a3f1e, TH.x - 0.8, 7.2, TH.z + 0.22);
  for (let i = 0; i < 13; i++) {                                    // ступеньки вокруг ствола — снаружи площадки, последняя — у проёма в перилах (восток)
    const a = -0.45 - (12 - i) * 0.33, y = 0.45 * (i + 1), r = 4.6;
    solid(g, 1.4, 0.3, 1.4, 0xb07a3a, TH.x + Math.cos(a) * r, y - 0.3, TH.z + Math.sin(a) * r, { studs: false });
    box(g, 0.2, y - 0.3, 0.2, 0x8a5a2b, TH.x + Math.cos(a) * r, (y - 0.3) / 2, TH.z + Math.sin(a) * r);   // столбик под ступенькой
  }
  box(g, 0.2, 0.8, 0.2, 0x2b2b33, TH.x + 2.4, 6.8, TH.z - 2.4); const tel = box(g, 0.25, 0.25, 1.1, 0x3a3f48, TH.x + 2.4, 7.3, TH.z - 2.4); tel.rotation.y = -0.6; tel.rotation.x = -0.3;   // подзорная труба
  const thl = makeLabel(5, 1.2); thl.position.set(TH.x, 15.6, TH.z); scene.add(thl); thl.userData.set('🏡 Домик на дереве', { color: '#ffffff' });
  fst.tree = { ...TH, said: false };
  // поляна прыгучих грибов
  [[170, 72, 1.6, 0xff4a4a], [176, 66, 2.4, 0x9b6bff], [165, 64, 3.2, 0xff8a1a], [180, 76, 4.2, 0x3fa7ff], [172, 82, 5.4, 0xff5a8a]].forEach(([x, z, h, c]) => addMushroom(x, z, h, 19, c));
  const ml = makeLabel(5, 1.2); ml.position.set(172, 9, 72); scene.add(ml); ml.userData.set('🍄 Прыгучие грибы', { color: '#ffe14d' });
  // деревья (не на дороге, не у построек)
  for (let i = 0, n = 0; i < 400 && n < 70; i++) {
    const x = x0 + 3 + R() * (x1 - x0 - 6), z = DINO.z0 + 3 + R() * (DINO.z1 - DINO.z0 - 6);
    if (roadDist(x, z) < 5 || Math.abs(x - 120) < 6 || Math.hypot(x - TH.x, z - TH.z) < 8 || Math.hypot(x - 172, z - 72) < 14) continue;
    tree(g, x, z, 0.9 + R() * 0.5, H(x, z), ['oak', 'pine', 'birch', 'apple'][Math.floor(R() * 4)]); n++;
  }
  flowers(g, R, x0, x1, 90, [0xff5a8a, 0xffd23f, 0xffffff, 0x9b6bff], H);
  // зверюшки и бабочки
  [['bunny', 84, 20], ['bunny', 100, 62], ['squirrel', 150, 30], ['deer', 110, 80], ['hedgehog', 130, 10], ['bunny', 186, 20], ['deer', 160, 95]].forEach(([k, x, z]) => addCritter(k, x, z, { x, z, r: 9 }));
  for (const [x, z] of [[90, 50], [126, 40], [168, 60], [150, 74], [190, 50]]) addButterfly(x, z);
  sign(g, 74, 48.5, '🦖 Долина динозавров →');
  sign(g, 160, 44.5, '🦖 Долина — ещё 150 м');
  createLampPost(g, 72, 37.5, 0); createLampPost(g, 128, 38, 0); createLampPost(g, 190, 42, 0);
  // волшебный пенёк: уже был в Долине — отсюда можно сразу туда
  if (save.dino?.visited) {
    const px = 70, pz = 38;
    box(g, 1.6, 0.6, 1.6, 0x8a5a2b, px, 0.3, pz); box(g, 1.3, 0.06, 1.3, 0xc8a070, px, 0.62, pz, { shadow: false });
    const pl = makeLabel(4.6, 1.1); pl.position.set(px, 2.6, pz); scene.add(pl); pl.userData.set('✨ Пенёк: в Долину', { color: '#c8ffb0' });
    door({ x: px, z: pz, w: 1.6, to: 'base', label: '🦖 Долина', spawn: VALLEY_SPAWN });
    fst.stump = { x: px, z: pz };
  }
}

// ================= 🌴 ДЖУНГЛИ =================
export function buildJungle(g) {
  const { x0, x1 } = DINO.jungle, R = seeded(4321);
  ground(g, x0, x1, 0x4fb83a, []);
  roadRibbon(g, x0, x1);
  const H = hills(g, 'jungle', x0, x1, [], 47, 8, 16);
  for (let i = 0, n = 0; i < 400 && n < 55; i++) {
    const x = x0 + 2 + R() * (x1 - x0 - 4), z = DINO.z0 + 3 + R() * (DINO.z1 - DINO.z0 - 6);
    if (roadDist(x, z) < 5) continue;
    if (R() < 0.7) palm(g, x, z, 0.9 + R() * 0.5, H(x, z)); else tree(g, x, z, 1.1 + R() * 0.4, H(x, z), 'oak');
    n++;
  }
  for (let i = 0; i < 70; i++) { const x = x0 + R() * (x1 - x0), z = DINO.z0 + 3 + R() * (DINO.z1 - DINO.z0 - 6); if (roadDist(x, z) > 3.5) fern(g, x, z, H(x, z)); }
  for (let i = 0; i < 18; i++) {                                    // огромные листья у дороги
    const q = SAMPLES.filter(s => s.x >= x0 && s.x <= x1)[Math.floor(R() * 60)]; if (!q) continue;
    const sd = R() < 0.5 ? -1 : 1, lf = box(g, 2.6, 0.08, 1.2, 0x2e9a2e, q.x + q.rx * 4.2 * sd, 1.1, q.z + q.rz * 4.2 * sd); lf.rotation.z = sd * 0.5; lf.rotation.y = R() * 3;
  }
  flowers(g, R, x0, x1, 60, [0xff3b8a, 0xff8a1a, 0xffd23f], H);
  sign(g, 248, 56.5, '🌴 Джунгли · Долина совсем близко!', '#c8ffb0');
  createLampPost(g, 250, 44.5, 0);
}

// ================= 🦖 ДОЛИНА =================
export function buildValley(g, save) {
  const { x0, x1 } = DINO.valley, R = seeded(99);
  st = { g, t: 0, save, dinos: [], crystals: [], eruptT: 12, smokeT: 0, ride: null, fly: null };
  ground(g, x0, x1, 0x8fd86a, [[x1 - 0.7, DINO.z0, DINO.z1]], { x0: DPIT.x0, x1: DPIT.x0 + DPIT.n, z0: DPIT.z0, z1: DPIT.z0 + DPIT.n });
  roadRibbon(g, x0, x1);
  // холмы — только там, где нет игр: вулкан, озеро, раскопки, гнёзда, трассы гонки и горки, канатка, места динозавриков
  const pathZone = (pts, r) => ({ d: (x, z) => { let m = 1e9; for (const [px, pz] of pts) m = Math.min(m, Math.hypot(px - x, pz - z)); return m - r; } });
  const triPts = TRI_PATH.getSpacedPoints(80).map(v => [v.x, v.z]);
  const H = hills(g, 'valley', x0, x1, [
    [x0 - 2, x0 + 8, DINO.z0, DINO.z1], [x1 - 6, x1 + 2, DINO.z0, DINO.z1],
    { c: [VOLC.x, VOLC.z, VOLC.r + 14] }, { c: [LAKE.x, LAKE.z, LAKE.s / 2 + 6] }, [DPIT.x0 - 4, DPIT.x0 + DPIT.n + 4, DPIT.z0 - 4, DPIT.z0 + DPIT.n + 4],
    ...BUSY, ...BUSY2, [414, 423, -28, 70],
    { c: [332, 12, 8] }, { c: [356, -8, 8] }, { c: [372, 62, 8] }, { c: [382, 32, 9] },
    { c: [TRI.x, TRI.z, 6] }, { c: [PERCH.x, PERCH.z, 5] }, { c: [POST.x, POST.z, 5] }, { c: [HOME_PAD.x, HOME_PAD.z, 5] },
    { c: [340, 40, 10] }, { c: [360, 26, 10] }, { c: [330, 60, 10] }, { c: [365, 48, 10] },
    pathZone(triPts, 6), pathZone(SLIDE_PTS.map(([x, , z]) => [x, z]), 5), ...LOST_SPOTS.map(([x, z]) => ({ c: [x, z, 3] })),
  ], 59, 11, 14, 4);
  // арка из огромных костей
  for (const sz of [-4.5, 4.5]) { solid(g, 1.2, 7, 1.2, 0xf4efe2, 304, 0, 40 + sz, { studs: false }); box(g, 1.8, 0.8, 1.8, 0xe8e0cc, 304, 7.2, 40 + sz); }
  box(g, 1, 1, 11, 0xf4efe2, 304, 7.8, 40); for (let i = 0; i < 5; i++) box(g, 0.4, 1.4, 0.3, 0xe0d8c4, 304, 7, 36 + i * 2);
  const al = makeLabel(8, 1.9); al.position.set(304, 10.2, 40); scene.add(al); al.userData.set('🦖 Долина динозавров', { color: '#ffe14d' });
  // вулкан: уступами (можно запрыгать наверх), в кратере — тёплая «лава»
  for (let i = 0; i < 8; i++) { const s = VOLC.r * 2 * (1 - i * 0.11); solid(g, s, 1.6, s, i % 2 ? 0x8a6a5a : 0x7a5a4a, VOLC.x, i * 1.6, VOLC.z, { cam: true }); }
  const lava = box(g, 4.2, 0.2, 4.2, 0xff7a1a, VOLC.x, 8 * 1.6 + 0.1, VOLC.z, { shadow: false }); lava.material = new T.MeshBasicMaterial({ color: 0xff8a2a });
  st.lava = lava;
  const vl = makeLabel(5, 1.2); vl.position.set(VOLC.x, VOLC.h + 4, VOLC.z); scene.add(vl); vl.userData.set('🌋 Сонный вулкан', { color: '#ffd0a0' });
  // озеро и бронтозавр в нём
  const lw = water(g, LAKE.s, 0.07, 0x3fb0ff); lw.position.set(LAKE.x, 0.07, LAKE.z); lw.userData.dynamic = true;
  box(g, LAKE.s + 2, 0.05, LAKE.s + 2, 0xf3dfa8, LAKE.x, 0.03, LAKE.z, { shadow: false });
  st.bronto = brachio(g, LAKE.x + 4, LAKE.z + 2);
  // пальмы и камни по краям долины
  for (let i = 0, n = 0; i < 200 && n < 26; i++) { const x = x0 + 4 + R() * (x1 - x0 - 8), z = DINO.z0 + 3 + R() * (DINO.z1 - DINO.z0 - 6); if (Math.abs(z - 40) < 34 && x < 420 || Math.hypot(x - VOLC.x, z - VOLC.z) < VOLC.r + 4 || Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.s / 2 + 4 || [...BUSY, ...BUSY2].some(([a, b, c, e]) => x > a && x < b && z > c && z < e)) continue; palm(g, x, z, 1.1 + R() * 0.4, H(x, z)); n++; }
  flowers(g, R, x0, x1, 50, [0xffd23f, 0xff8a1a, 0xffffff], H);
  // трицератопс: стоит под табличкой, на нём катаются
  const tri = group(g, TRI.x, 0, TRI.z); tri.userData.dynamic = true;
  const tm = buildDino(tri, { body: 0x6fa8dc, belly: 0xd8ecff, spikes: 0x3a6ad8 }); tm.root.scale.setScalar(2.4);
  box(tm.head, 1.05, 0.75, 0.12, 0xffe0a0, 0, 0.2, -0.42); for (const sx of [-0.22, 0.22]) { const r = box(tm.head, 0.1, 0.1, 0.45, 0xffffff, sx, 0.33, 0.45); r.rotation.x = -0.5; }
  const saddle = box(tm.body, 0.7, 0.12, 0.6, 0xd84a3a, 0, 1.45, 0.05);     // седло (с 5 ❤️ — золотое)
  saddle.material = new T.MeshLambertMaterial({ color: 0xd84a3a });
  addCollider({ x0: TRI.x - 1.9, x1: TRI.x + 1.9, z0: TRI.z - 1.1, z1: TRI.z + 1.1, y0: 0, y1: 2.6 });   // стоит боком (смотрит на восток)
  st.tri = { g: tri, m: tm, face: Math.PI / 2 }; tri.rotation.y = st.tri.face;
  sign(g, TRI.x - 3, TRI.z + 3, '🦕 Покатайся на трицератопсе!');
  // скала-насест и птеродактиль
  solid(g, 2.4, PERCH.h, 2.4, 0x9a8a80, PERCH.x, 0, PERCH.z);
  st.ptero = ptero(group(g, PERCH.x, PERCH.h, PERCH.z));
  sign(g, PERCH.x + 3, PERCH.z - 2.5, '🪽 Полетать на птеродактиле!');
  // птеродактиль-почта: с яйцом встань на гнёздышко — отнесут в инкубатор
  box(g, 2.6, 0.35, 2.6, 0x9a5b2e, POST.x, 0.17, POST.z); box(g, 2, 0.1, 2, 0xe8c45a, POST.x, 0.38, POST.z, { shadow: false });
  const pm = ptero(group(g, POST.x + 1.6, 1.8, POST.z)); pm.root.scale.setScalar(0.6); st.postBird = pm;
  sign(g, POST.x - 2.2, POST.z + 1.4, '🦅 Почта: яйцо — в инкубатор');
  // волшебный пенёк домой
  box(g, 1.6, 0.6, 1.6, 0x8a5a2b, HOME_PAD.x, 0.3, HOME_PAD.z); box(g, 1.3, 0.06, 1.3, 0xc8a070, HOME_PAD.x, 0.62, HOME_PAD.z, { shadow: false });
  const hl = makeLabel(4.6, 1.1); hl.position.set(HOME_PAD.x, 2.6, HOME_PAD.z); scene.add(hl); hl.userData.set('✨ Пенёк: домой', { color: '#c8ffb0' });
  door({ x: HOME_PAD.x, z: HOME_PAD.z, w: 1.6, to: 'base', label: '🏠 База', spawn: GATE_SPAWN });
  // гуляющие динозаврики
  [[0x8fd14a, 340, 40], [0xffb050, 360, 26], [0xb88aff, 330, 60], [0xff8ac8, 365, 48]].forEach(([c, x, z]) => {
    const dg = group(g, x, 0, z); dg.userData.dynamic = true;
    const m = buildDino(dg, { body: c, belly: 0xfff0d0, spikes: 0xffd23f }); m.root.scale.setScalar(1.5);
    st.dinos.push({ g: dg, m, home: { x, z }, to: null, wait: Math.random() * 3, face: Math.random() * 6, hi: 0 });
  });
  createLampPost(g, 310, 46.5, 0); createLampPost(g, 340, 46, 0);
  buildQuests(g, save, TRI_PATH);                                   // паспорт, яйца мамы, лава, канатка, горка, гонки
  const gold = on => { saddle.material.color.setHex(on ? 0xffd23f : 0xd84a3a); saddle.material.emissive.setHex(on ? 0x553300 : 0); };
  gold((dinoSave(save).fr?.tri || 0) >= 5);
  buildPlay(g, save, gold); setFlyPath(FLY_PATH);                   // этап 2: еда и дружба, озеро, кольца, динобол, музыка, прятки
  buildDinoPit(g, save);                                            // глубокие раскопки
}
// длинношеий бронтозавр
function brachio(g, x, z) {
  const b = group(g, x, 0, z); b.userData.dynamic = true; b.rotation.y = -0.6;
  const C = 0x6fc8a0, D = 0x5ab08a;
  for (const [lx, lz] of [[-1.3, -2], [1.3, -2], [-1.3, 2], [1.3, 2]]) box(b, 1.1, 3.4, 1.1, D, lx, 1.7, lz);
  box(b, 3.6, 3, 6.4, C, 0, 4.6, 0); box(b, 3, 0.6, 5.6, 0xd8fff0, 0, 3.2, 0, { shadow: false });
  const tail = box(b, 1.2, 1.2, 5, C, 0, 4.4, -5.2); tail.rotation.x = 0.35;
  const neck = group(b, 0, 5.4, 2.6);
  const n1 = box(neck, 1.2, 8, 1.2, C, 0, 4, 0.8); n1.rotation.x = 0.25;
  const head = group(neck, 0, 8, 2.8); box(head, 1.6, 1.2, 2.2, C, 0, 0, 0.4); box(head, 1.2, 0.3, 1, 0xd8fff0, 0, -0.45, 1);
  for (const sx of [-1, 1]) { box(head, 0.12, 0.3, 0.3, 0xffffff, sx * 0.8, 0.25, 0.7); box(head, 0.06, 0.16, 0.16, 0x1a1a1a, sx * 0.85, 0.25, 0.75); }
  addCollider({ x0: x - 3, x1: x + 3, z0: z - 3.5, z1: z + 3.5, y0: 0, y1: 6 });
  return { g: b, neck, head };
}
// птеродактиль: тело, длинный клюв, гребень и крылья, которые машут
function ptero(root) {
  root.userData.dynamic = true;
  const C = 0xb88aff, W = 0x9b6bff;
  box(root, 0.9, 0.8, 1.6, C, 0, 0.6, 0);
  const head = group(root, 0, 1.2, 0.9); box(head, 0.6, 0.55, 0.7, C); box(head, 0.25, 0.2, 1.1, 0xffd23f, 0, -0.08, 0.8); box(head, 0.12, 0.5, 0.7, 0xff7ac8, 0, 0.35, -0.4);
  for (const sx of [-1, 1]) box(head, 0.06, 0.14, 0.14, 0x1a1a1a, sx * 0.31, 0.1, 0.15);
  const wings = [-1, 1].map(sx => { const w = group(root, sx * 0.45, 0.8, 0); box(w, 2.6, 0.1, 1.2, W, sx * 1.3, 0, 0); return w; });
  return { root, head, wings };
}

// ---------- катание на трицератопсе: круг по лугу ----------
const TRI_PATH = new T.CatmullRomCurve3([[330, 30], [346, 18], [366, 14], [378, 26], [372, 50], [352, 58], [334, 54], [324, 42]].map(([x, z]) => new T.Vector3(x, 0, z)), true);
// ---------- полёт на птеродактиле: над озером, вулканом и обратно ----------
const FLY_PATH = new T.CatmullRomCurve3([[318, 6, 72], [332, 14, 88], [358, 19, 98], [388, 23, 66], [400, 24, 12], [372, 19, -12], [340, 15, 8], [322, 9, 46], [321.5, 7, 68]].map(([x, y, z]) => new T.Vector3(x, y, z)));

// кнопки рядом: 🦕 покататься, 🪽 полетать
export function dinoItems(hero) {
  if (!st) return [];
  const q = [...questItems(hero), ...playItems(hero), ...pitItems(hero)];
  if (hero.climb) return q;
  const p = hero.pos;
  if (Math.hypot(p.x - TRI.x, p.z - TRI.z) < 4.8 && p.y < 3) return [{ id: 'g_dino_ride', icon: '🦕' }, ...q];
  if (Math.hypot(p.x - PERCH.x, p.z - PERCH.z) < 4.5 && p.y < 4) return [{ id: 'g_dino_fly', icon: '🪽' }, ...q];
  return q;
}
export function dinoUse(act, hero, { toast, SFX, carrying, save }) {
  if (!st) return;
  if (act === 'pitup') return pitClimbOut(hero);
  if (act !== 'ride' && act !== 'fly') { if (!playUse(act, hero, save)) questUse(act, hero, save); return; }
  if (hero.climb) return;
  if (carrying) { SFX.nope(); toast('🥚 Сначала отнеси яйцо<small>на почту птеродактиля 🦅 у входа в долину</small>'); return; }
  if (act === 'ride') {
    const dur = 22;
    hero.climb = { t: 0, dur, sitPose: true, tri: true, ride: k => TRI_PATH.getPointAt(k % 1).setY(2.75) };
    SFX.boing(); toast('🦕 Поехали! Трицератопс катает тебя по долине<small>прыжок — спрыгнуть</small>'); passDone(save, 'ride');
  } else if (act === 'fly') {
    hero.climb = { t: 0, dur: 24, ptero: true, ride: k => FLY_PATH.getPointAt(k).add(new T.Vector3(0, -2.3, 0)) };
    SFX.whoosh(); toast('🪽 Полетели! Держись крепче<small>видно вулкан, озеро и бронтозавра</small>'); passDone(save, 'fly');
  }
}
// почта: с яйцом на гнёздышке
export const dinoPostNear = p => !!st && Math.hypot(p.x - POST.x, p.z - POST.z) < 1.6 && p.y < 1.2;
export function dinoPostSend(pos) {
  if (!st) return;
  const b = st.postBird.root, from = b.position.clone();
  arc(b, from, from.clone().add(new T.Vector3(-30, 25, 0)), 2.2, 4, () => { b.position.copy(from); });
  puff('🦅', pos.clone().setY(3), { size: 1.6, rise: 2, life: 1.6 });
}

// ---------- раз в кадр ----------
export function updateForest(dt, hero) {
  if (!fst) return {};
  const ev = {}, p = hero.pos;
  if (fst.tree && !fst.tree.said && p.y > 5.5 && Math.hypot(p.x - fst.tree.x, p.z - fst.tree.z) < 4) { fst.tree.said = true; ev.say = '🔭 Отсюда видно вулкан!<small>дорога ведёт прямо в Долину динозавров 🦖</small>'; }
  if (fst.stream && Math.abs(p.x - fst.stream.x) < 3 && Math.abs(p.z - fst.stream.bz) > 3 && p.y < 0.3 && hero.speed > 1 && (fst.splashT -= dt) <= 0) { fst.splashT = 0.3; puff('💦', p.clone().setY(0.3), { size: 0.8, rise: 1, life: 0.6 }); }
  return ev;
}
export function updateJungle(dt, hero) {
  if (!fst) return;
  if ((fst.parrotT -= dt) <= 0) { fst.parrotT = 2 + Math.random() * 3; const p = hero.pos; if (p.x > DINO.jungle.x0 && p.x < DINO.jungle.x1) puff(Math.random() < 0.6 ? '🦜' : '🦋', new T.Vector3(p.x + (Math.random() - 0.5) * 16, 6 + Math.random() * 4, p.z + (Math.random() - 0.5) * 16), { size: 1.1, rise: 0.8, life: 1.6, dx: 1.5 }); }
}
export function updateValley(dt, hero, save) {
  const ev = {};
  if (!st) return ev;
  st.t += dt;
  const p = hero.pos, t = st.t;
  if (!save.dino?.visited && p.x > DINO.valley.x0 + 2) { save.dino = { ...(save.dino || {}), visited: Date.now() }; ev.welcome = true; }
  // вулкан пыхтит; иногда выплёвывает кристаллы
  if ((st.smokeT -= dt) <= 0) { st.smokeT = 0.6; puff('💨', new T.Vector3(VOLC.x + (Math.random() - 0.5) * 2, VOLC.h + 1.2, VOLC.z + (Math.random() - 0.5) * 2), { size: 2.2, rise: 2, life: 2.6, dx: 0.4 }); }
  st.lava.material.color.setHSL(0.07 + Math.sin(t * 2) * 0.02, 1, 0.55);
  if ((st.eruptT -= dt) <= 0) {
    st.eruptT = 25; ev.erupt = Math.hypot(p.x - VOLC.x, p.z - VOLC.z) < 90;
    for (let i = 0; i < 4 && st.crystals.length < 6; i++) {
      const a = Math.random() * Math.PI * 2, r = VOLC.r + 4 + Math.random() * 6, to = new T.Vector3(VOLC.x + Math.cos(a) * r, 0.8, VOLC.z + Math.sin(a) * r);
      const c = new T.Mesh(new T.OctahedronGeometry(0.55), new T.MeshLambertMaterial({ color: 0x7fe8ff, emissive: 0x1a6080 })); st.g.add(c);
      const cr = { m: c, x: to.x, z: to.z, ready: false }; st.crystals.push(cr);
      arc(c, new T.Vector3(VOLC.x, VOLC.h + 1, VOLC.z), to, 1.6, 10, () => { cr.ready = true; });
    }
    puff('✨', new T.Vector3(VOLC.x, VOLC.h + 2, VOLC.z), { size: 2.5, rise: 3, life: 1.5 });
  }
  for (let i = st.crystals.length - 1; i >= 0; i--) {
    const c = st.crystals[i]; c.m.rotation.y += dt * 2;
    if (c.ready) { c.m.position.y = 0.8 + Math.sin(t * 3 + i) * 0.15; if (Math.hypot(p.x - c.x, p.z - c.z) < 1.4 && p.y < 2) { st.g.remove(c.m); c.m.geometry.dispose(); st.crystals.splice(i, 1); ev.crystal = (ev.crystal || 0) + 1; const dd = dinoSave(save); dd.crystals = (dd.crystals || 0) + 1; if (dd.crystals >= 10) passDone(save, 'crystals'); puff('💎', c.m.position.clone().setY(2), { size: 1, rise: 1.4 }); } }
  }
  // на вершине вулкана тёплая лава подбрасывает вверх
  if (hero.grounded && p.y > VOLC.h - 0.5 && Math.hypot(p.x - VOLC.x, p.z - VOLC.z) < 2.3) { hero.vel.y = 24; hero.grounded = false; ev.lava = true; puff('🔥', p.clone().setY(p.y + 0.5), { size: 1.4, rise: 2 }); }
  // бронтозавр жуёт листья и покачивает шеей
  const B = st.bronto; B.neck.rotation.x = Math.sin(t * 0.4) * 0.12; B.neck.rotation.z = Math.sin(t * 0.25) * 0.15; B.head.rotation.x = Math.sin(t * 1.3) * 0.15;
  if (Math.random() < dt * 0.5) puff('🌿', B.head.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, -0.5, 0)), { size: 0.9, rise: 0.6, life: 1 });
  // динозаврики гуляют; рядом с героем — радуются
  for (const d of st.dinos) {
    const q = d.g.position; let spd = 0;
    if (Math.hypot(p.x - q.x, p.z - q.z) < 4) { d.face = Math.atan2(p.x - q.x, p.z - q.z); if ((d.hi -= dt) <= 0) { d.hi = 3; puff('💚', q.clone().setY(3.2), { size: 0.9, rise: 1 }); } }
    else if (d.to) { const dx = d.to.x - q.x, dz = d.to.z - q.z, l = Math.hypot(dx, dz); if (l < 0.3) { d.to = null; d.wait = 2 + Math.random() * 3; } else { spd = 2.2; q.x += dx / l * spd * dt; q.z += dz / l * spd * dt; d.face = Math.atan2(dx, dz); } }
    else if ((d.wait -= dt) <= 0) { const a = Math.random() * 6.28, r = 2 + Math.random() * 8; d.to = { x: d.home.x + Math.cos(a) * r, z: d.home.z + Math.sin(a) * r }; }
    d.g.rotation.y = d.face; animateAnimal(d.m, dt, spd);
  }
  // трицератопс: стоит или везёт героя
  const T3 = st.tri;
  if (hero.climb?.tri) {                                               // катание или гонка: трицератопс под героем
    T3.g.position.set(p.x, 0, p.z); T3.g.rotation.y = hero.face; animateAnimal(T3.m, dt, hero.climb.dur < 1000 ? 3 : 0); st.ride = true;
    if (Math.random() < dt * 2) puff('🐾', p.clone().setY(0.2), { size: 0.6, rise: 0.3, life: 0.8 });
  } else {
    if (st.ride) { st.ride = false; T3.g.position.set(TRI.x, 0, TRI.z); T3.g.rotation.y = T3.face; }
    animateAnimal(T3.m, dt, 0);
  }
  if (p.y > 12.5 && Math.hypot(p.x - VOLC.x, p.z - VOLC.z) < 4.5) passDone(save, 'volcano');
  // птеродактиль: машет крыльями; в полёте — несёт героя
  const P = st.ptero, flying = hero.climb?.ptero;                     // полёт или кольца: птеродактиль — над героем
  const flap = Math.sin(t * (flying ? 8 : 2.5)) * (flying ? 0.6 : 0.15);
  P.wings[0].rotation.z = flap; P.wings[1].rotation.z = -flap;
  if (flying) {
    const tg = FLY_PATH.getTangentAt(Math.min(hero.climb.t, 0.999));
    P.root.position.copy(p).add(new T.Vector3(0, 2.3, 0)); P.root.rotation.y = Math.atan2(tg.x, tg.z); st.fly = true;
  } else if (st.fly) { st.fly = false; P.root.position.set(PERCH.x, PERCH.h, PERCH.z); P.root.rotation.y = 0; }
  // песенка на камнях — все динозаврики танцуют
  if (danceLeft() > 0) for (const d of st.dinos) { d.g.position.y = Math.abs(Math.sin(t * 8 + d.home.x)) * 0.8; d.g.rotation.y += dt * 4; }
  else for (const d of st.dinos) d.g.position.y = 0;
  const pw = st.postBird; pw.wings[0].rotation.z = Math.sin(t * 2.2) * 0.15; pw.wings[1].rotation.z = -pw.wings[0].rotation.z;
  return ev;
}
