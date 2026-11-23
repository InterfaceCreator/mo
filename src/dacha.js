// Дача 🏡: из аквапарка — калитка в южной стене, за ней длинная деревенская дорога
// (берёзы и яблони, полевые цветы, ручеёк с мостиком, скамейка, указатель), а в конце — участок:
// забор-штакетник, бревенчатый домик с крылечком и дымком из трубы, колодец, яблони, будка, пугало и грядки,
// теплица, беседка с самоваром, костровище с зефиром, садовые качели и ягодные кусты.
// Все высоты крыш, притолок и навесов увеличены (3.8м+), чтобы персонаж любого роста не проходил сквозь крыши.
// Полная интерактивность: посадка на скамейки и пеньки, анимация чаепития и жарки маршмеллоу на костре, раскачивающиеся качели.
import { T, group, box, mat, scene } from './engine.js';
import { solid, tree, addCollider, onLevelReset } from './world.js';
import { water } from './terrain.js';
import { makeLabel, puff, confetti } from './fx.js';
import { buildHero, compactHero, PEOPLE } from './hero.js';
import { BANYA } from './spa.js';
import { PIT } from './bunker.js';
import { createLampPost, registerLamp, registerWindow, getNightK, runSleepScreen, dismissSleepScreen, setDayTime } from './daynight.js';

export const DACHA_BED = { x: -38.6, z: 199.8, y: 0.52 };

export const DACHA_GATE = { x: -38, z: 107, w: 6 };
export const DACHA = { x0: -46, x1: 46, z0: 182, z1: 208, house: { x: -36, z: 198 }, well: { x: -22, z: 188 }, beds: [194, 197.5, 201].map(z => ({ x: -21, z })) };
const GROUND = { x0: -66, x1: 66, z0: 105, z1: 213 };
const ROAD = [[-38, 106], [-37.5, 116], [-34, 128], [-27, 140], [-25, 151], [-28, 164], [-30, 175], [-30, 183]];
const STREAM_Z = 146;
const BERRY_COOLDOWN = 3 * 60 * 1000; // 3 минуты (180 000 мс) на созревание ягод

// Места для сидения в беседке (скамейки вокруг стола)
// y = 0.25 обеспечивает идеальную посадку: при анимации сидения (y_leg_min = +0.29)
// ноги и бёдра ложатся ровно на поверхность скамьи (y = 0.54) без зависания в воздухе
export const GAZEBO_BENCHES = [
  { x: 22, z: 189.55, y: 0.25, face: 0 },          // южная скамья -> смотрит на север к столу
  { x: 22, z: 192.45, y: 0.25, face: Math.PI },   // северная скамья -> смотрит на юг к столу
  { x: 23.4, z: 191, y: 0.25, face: -Math.PI / 2 } // восточная скамья -> смотрит на запад к столу
];

// Пеньки вокруг костра (4 берёзовых чурбака для сидения)
// y = 0.35 обеспечивает точную посадку: 0.35 + 0.29 = 0.64 (ровно верх чурбака)
export const CAMP_STUMPS = [
  { x: 34.8, z: 201, y: 0.35, face: Math.PI / 2 },    // западный пенёк -> смотрит на восток к костру
  { x: 39.2, z: 201, y: 0.35, face: -Math.PI / 2 },   // восточный пенёк -> смотрит на запад к костру
  { x: 37, z: 198.8, y: 0.35, face: 0 },              // южный пенёк -> смотрит на север к костру
  { x: 37, z: 203.2, y: 0.35, face: Math.PI }         // северный пенёк -> смотрит на юг к костру
];

// Яблони на дачном участке, которые можно трясти
const APPLE_TREES = [
  [-44.5, 186], [-44, 205.5], [-15.5, 186.5], [-26, 205.5],
  [13, 203], [30, 186.5], [42, 205]
];

let st = null;
onLevelReset(() => { if (st?.bedLabel) scene.remove(st.bedLabel); st = null; });

// случайные числа с «зерном»: деревья и цветы каждый раз на тех же местах
function seeded(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

// Структура сохранения состояния дачи
export function dachaSave(s) {
  if (!s) return {};
  if (!s.dacha) s.dacha = {};
  const d = s.dacha;
  if (d.ghTime === undefined) d.ghTime = 0;
  if (d.ghWatered === undefined) d.ghWatered = false;
  if (d.teaTime === undefined) d.teaTime = 0;
  if (d.marshTime === undefined) d.marshTime = 0;
  if (d.berryTime === undefined) d.berryTime = 0;
  if (d.dogTime === undefined) d.dogTime = 0;
  if (d.appleTime === undefined) d.appleTime = 0;
  if (d.hasWood === undefined) d.hasWood = false;
  return d;
}

// Создание 3D-предметов в руке персонажа (чашка чая и веточка с зефиром)
function ensureProps(hero) {
  if (!hero?.model?.armR) return;
  const arm = hero.model.armR;
  if (!hero.model.teaCup) {
    const cup = group(arm, 0, -1.35, 0.15);
    cup.userData.dynamic = true;
    const body = box(cup, 0.22, 0.24, 0.22, 0xffffff, 0, 0, 0, { shadow: false });
    const tea = box(cup, 0.18, 0.04, 0.18, 0x8b4513, 0, 0.1, 0, { shadow: false });
    const handle = box(cup, 0.08, 0.16, 0.12, 0xffffff, 0.14, 0, 0, { shadow: false });
    body.userData.dynamic = tea.userData.dynamic = handle.userData.dynamic = true;
    cup.visible = false;
    hero.model.teaCup = cup;
  }
  if (!hero.model.marshStick) {
    const stick = group(arm, 0, -1.35, 0.15);
    stick.userData.dynamic = true;
    const wood = box(stick, 0.06, 0.06, 1.4, 0x8a5a2b, 0, 0, 0.65, { shadow: false });
    const mMesh = box(stick, 0.22, 0.22, 0.26, 0xfff0ea, 0, 0, 1.35, { shadow: false });
    wood.userData.dynamic = mMesh.userData.dynamic = true;
    stick.visible = false;
    hero.model.marshStick = stick;
    hero.model.marshMesh = mMesh;
  }
}

// Посадка персонажа в беседку за стол
export function sitGazebo(hero) {
  const b = GAZEBO_BENCHES.reduce((best, cur) =>
    Math.hypot(hero.pos.x - cur.x, hero.pos.z - cur.z) < Math.hypot(hero.pos.x - best.x, hero.pos.z - best.z) ? cur : best
  );
  hero.climb = {
    ride: () => new T.Vector3(b.x, b.y, b.z),
    t: 0,
    dur: 999999,
    face: b.face,
    seat: true,
    exit: new T.Vector3(Math.sin(b.face) * 1.5, 0.5, Math.cos(b.face) * 1.5)
  };
  hero.relax = true;
  return b;
}

// Посадка персонажа на пенёк у костра
export function sitCampfire(hero) {
  const s = CAMP_STUMPS.reduce((best, cur) =>
    Math.hypot(hero.pos.x - cur.x, hero.pos.z - cur.z) < Math.hypot(hero.pos.x - best.x, hero.pos.z - best.z) ? cur : best
  );
  hero.climb = {
    ride: () => new T.Vector3(s.x, s.y, s.z),
    t: 0,
    dur: 999999,
    face: s.face,
    seat: true,
    exit: new T.Vector3(Math.sin(s.face) * 1.5, 0.5, Math.cos(s.face) * 1.5)
  };
  hero.relax = true;
  return s;
}

// Запуск катания на садовых качелях с раскачиванием сиденья
export function startSwingRide(hero) {
  const SW_POS = { x: 13, z: 186.5 };
  const dur = 20, per = 2.4, H = 3.8;
  hero.climb = {
    ride: k => {
      const amp = 0.58 * Math.min(1, k * 3.5) * (k > 0.88 ? (1 - k) / 0.12 : 1);
      const a = amp * Math.sin(k * dur / per * Math.PI * 2);
      if (st && st.swingBench) {
        st.swingBench.rotation.x = -a;
      }
      if (hero.model?.root) {
        hero.model.root.rotation.x = -a;
      }
      return new T.Vector3(SW_POS.x, H - 2.96 * Math.cos(a) - 0.29, SW_POS.z + 2.96 * Math.sin(a) - 0.05 * Math.cos(a));
    },
    t: 0,
    dur,
    face: 0,
    seat: true,
    exit: new T.Vector3(0, 1.8, 2.4)
  };
  hero.relax = true;
}

export function buildDacha(w) {
  const R = seeded(4242), G = GROUND, mid = (a, b) => (a + b) / 2;
  st = { smokeT: 0, ghTomatoes: [], berryMeshes: [] };

  // земля, живая изгородь по краям (дальше — лес)
  const H = { x0: PIT.x0, x1: PIT.x0 + PIT.n, z0: PIT.z0, z1: PIT.z0 + PIT.n };
  for (const [x0, x1, z0, z1] of [[G.x0, G.x1, G.z0, H.z0], [G.x0, G.x1, H.z1, G.z1], [G.x0, H.x0, H.z0, H.z1], [H.x1, G.x1, H.z0, H.z1]])
    solid(w, x1 - x0, 1, z1 - z0, 0x6fd04a, mid(x0, x1), -1, mid(z0, z1));
  for (const [x0, x1, z0, z1] of [
    [G.x0, G.x0 + 1.4, G.z0, G.z1],
    [G.x1 - 1.4, G.x1, G.z0, G.z1],
    [G.x0, G.x1, G.z1 - 1.4, G.z1]
  ])
    solid(w, x1 - x0, 2.4, z1 - z0, 0x3f9e3a, mid(x0, x1), 0, mid(z0, z1), { cam: true });
  for (let i = 0; i < 40; i++) {
    const side = i % 3, t = R();
    const [x, z] = side === 0 ? [G.x0 - 3 - R() * 6, G.z0 + 6 + t * (G.z1 - G.z0)] : side === 1 ? [G.x1 + 3 + R() * 6, G.z0 + 6 + t * (G.z1 - G.z0)] : [G.x0 + t * (G.x1 - G.x0), G.z1 + 3 + R() * 6];
    tree(w, x, z, 1 + R() * 0.4, 0, R() < 0.5 ? 'pine' : 'oak');
  }

  // дорога: плавная грунтовка
  const curve = new T.CatmullRomCurve3(ROAD.map(([x, z]) => new T.Vector3(x, 0, z))), L = curve.getLength(), n = Math.ceil(L / 1.2);
  const P = curve.getSpacedPoints(n), road = [];
  const RW = 1.6, pos = [], nor = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const t = curve.getTangentAt(Math.min(1, i / n)), rx = t.z, rz = -t.x, l = Math.hypot(rx, rz) || 1, a = P[i];
    road.push({ x: a.x, z: a.z, rx: rx / l, rz: rz / l });
    pos.push(a.x - rx / l * RW, 0.05, a.z - rz / l * RW, a.x + rx / l * RW, 0.05, a.z + rz / l * RW);
    nor.push(0, 1, 0, 0, 1, 0); uv.push(0, i / 2, 1, i / 2);
    if (i < n) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const rg = new T.BufferGeometry();
  rg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); rg.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); rg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); rg.setIndex(idx);
  const rm = new T.Mesh(rg, mat(0xd9b98a)); rm.receiveShadow = true; w.add(rm);
  for (const sd of [-1, 1]) {
    const ep = [], en = [], eu = [], ei = [];
    road.forEach((q, i) => { const o1 = RW * sd, o2 = (RW + 0.35) * sd; ep.push(q.x + q.rx * o1, 0.045, q.z + q.rz * o1, q.x + q.rx * o2, 0.045, q.z + q.rz * o2); en.push(0, 1, 0, 0, 1, 0); eu.push(0, 0, 1, 0); if (i < n) { const k = i * 2; ei.push(...(sd > 0 ? [k, k + 2, k + 1, k + 1, k + 2, k + 3] : [k, k + 1, k + 2, k + 1, k + 3, k + 2])); } });
    const eg = new T.BufferGeometry(); eg.setAttribute('position', new T.Float32BufferAttribute(ep, 3)); eg.setAttribute('normal', new T.Float32BufferAttribute(en, 3)); eg.setAttribute('uv', new T.Float32BufferAttribute(eu, 2)); eg.setIndex(ei);
    const em = new T.Mesh(eg, mat(0xbfa070)); em.receiveShadow = true; w.add(em);
  }
  st.road = road;

  // ручеёк поперёк и мостик на дороге
  const bz = STREAM_Z, zs = x => bz + 2.4 * Math.sin(x * 0.11 + 0.8);
  const br = road.reduce((p, q) => Math.abs(q.z - zs(q.x)) < Math.abs(p.z - zs(p.x)) ? q : p);
  st.stream = [];
  {
    const SW = 1.5, wp = [], wi = [], wu = [], bank = [[], []];
    const xs = []; for (let x = G.x0 + 1.4; x <= G.x1 - 1.4; x += 1) xs.push(x);
    xs.forEach((x, i) => {
      const z = zs(x), dz = 2.4 * 0.11 * Math.cos(x * 0.11 + 0.8), l = Math.hypot(1, dz), nx = -dz / l, nz = 1 / l;
      wp.push(x + nx * SW, 0.06, z + nz * SW, x - nx * SW, 0.06, z - nz * SW); wu.push(0, i / 4, 1, i / 4);
      if (i < xs.length - 1) { const k = i * 2; wi.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
      for (const [sd, B] of [[1, bank[0]], [-1, bank[1]]]) B.push(x + nx * sd * SW, 0.05, z + nz * sd * SW, x + nx * sd * (SW + 0.8), 0.05, z + nz * sd * (SW + 0.8));
      st.stream.push({ x, z });
    });
    const wm = water(w, 4, 0.06, 0x3fb0ff), wg = new T.BufferGeometry();
    w.remove(wm);
    wg.setAttribute('position', new T.Float32BufferAttribute(wp, 3)); wg.setAttribute('uv', new T.Float32BufferAttribute(wu, 2)); wg.setIndex(wi); wg.computeVertexNormals();
    const stream = new T.Mesh(wg, wm.material); stream.receiveShadow = true; stream.userData.dynamic = true; w.add(stream);
    bank.forEach((B, b) => {
      const bi = [], bn = [], bu = []; for (let i = 0; i < xs.length; i++) { bn.push(0, 1, 0, 0, 1, 0); bu.push(0, 0, 1, 0); if (i < xs.length - 1) { const k = i * 2; bi.push(...(b ? [k, k + 2, k + 1, k + 1, k + 2, k + 3] : [k, k + 1, k + 2, k + 1, k + 3, k + 2])); } }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(B, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(bn, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(bu, 2)); g.setIndex(bi);
      const m = new T.Mesh(g, mat(0x5a7a32)); m.receiveShadow = true; w.add(m);
    });
    for (let i = 0; i < 46; i++) {
      const x = G.x0 + 3 + R() * (G.x1 - G.x0 - 6); if (Math.abs(x - br.x) < 4 || Math.abs(x - BANYA.x) < 2) continue;
      const side = R() < 0.5 ? -1 : 1, z = zs(x) + side * (1.3 + R() * 1.2), sz = 0.35 + R() * 0.5;
      if (R() < 0.6) { const st0 = box(w, sz * 1.3, sz * 0.7, sz, [0x9aa4ad, 0x8a8f9a, 0xb0b4bc][Math.floor(R() * 3)], x, sz * 0.3, z); st0.rotation.y = R() * 3; }
      else for (let k = 0; k < 4; k++) { const rx = x + (R() - 0.5) * 0.8, rz = z + (R() - 0.5) * 0.6, h = 1 + R() * 0.8; box(w, 0.08, h, 0.08, 0x3f8a2e, rx, h / 2, rz, { shadow: false, studs: false }); if (k % 2 === 0) box(w, 0.14, 0.4, 0.14, 0x7a4a24, rx, h + 0.15, rz, { shadow: false, studs: false }); }
    }
    for (let i = 0; i < 6; i++) { const x = G.x0 + 8 + i * 12 + R() * 4; if (Math.abs(x - br.x) < 4) continue; box(w, 0.6, 0.18, 0.5, 0x8a8f9a, x, 0.08, zs(x) + (R() - 0.5) * 1.2); }
  }
  const bridge = group(w, br.x, 0, br.z); bridge.rotation.y = Math.atan2(-br.rz, br.rx);
  for (let i = 0; i < 9; i++) box(bridge, 3.6, 0.18, 0.5, i % 2 ? 0x9c6a3c : 0x8a5a2b, 0, 0.22 + Math.sin(i / 8 * Math.PI) * 0.25, -2 + i * 0.5);
  for (const sx of [-1, 1]) { for (const zz of [-2, 0, 2]) box(bridge, 0.18, 1.1, 0.18, 0x6a3f1e, sx * 1.75, 0.75 + (zz ? 0 : 0.25), zz); box(bridge, 0.14, 0.14, 4.4, 0x8a5a2b, sx * 1.75, 1.3 + 0.1, 0); }

  // деревья вдоль дороги
  for (let i = 4; i < road.length - 6; i += 5) {
    const q = road[i]; if (Math.abs(q.z - zs(q.x)) < 5) continue;
    for (const sd of [-1, 1]) {
      const off = 5 + R() * 1.5;
      tree(w, q.x + q.rx * off * sd, q.z + q.rz * off * sd, 0.85 + R() * 0.3, 0, (i / 5 + (sd > 0 ? 1 : 0)) % 2 ? 'birch' : 'apple');
    }
  }
  for (let k = 0, placed = 0; k < 200 && placed < 34; k++) {
    const x = G.x0 + 4 + R() * (G.x1 - G.x0 - 8), z = G.z0 + 6 + R() * (DACHA.z0 - G.z0 - 10);
    if (x > BANYA.x - 9 && x < BANYA.x + 16 && Math.abs(z - BANYA.z) < 9) continue;
    if (Math.abs(z - zs(x)) < 5 || road.some(q => Math.hypot(q.x - x, q.z - z) < 9)) continue;
    tree(w, x, z, 0.8 + R() * 0.5, 0, ['birch', 'oak', 'pine', 'birch'][Math.floor(R() * 4)]); placed++;
  }
  for (let i = 0; i < road.length; i += 1) {
    if (R() < 0.45) continue; const q = road[i], sd = R() < 0.5 ? -1 : 1, off = 2.2 + R() * 1.6;
    const x = q.x + q.rx * off * sd, z = q.z + q.rz * off * sd;
    box(w, 0.08, 0.4, 0.08, 0x3fae3a, x, 0.2, z, { shadow: false, studs: false });
    box(w, 0.28, 0.2, 0.28, [0xff5a8a, 0xffd23f, 0xffffff, 0x9b6bff, 0xff7b22][Math.floor(R() * 5)], x, 0.45, z, { shadow: false, studs: false });
  }
  for (let i = 6; i < 30; i++) { const q = road[i]; box(w, 0.18, 1, 0.18, 0x8a5a2b, q.x - q.rx * 2.6, 0.5, q.z - q.rz * 2.6); if (i % 2) { const m = box(w, 0.1, 0.12, 1.3, 0x9c6a3c, q.x - q.rx * 2.6, 0.75, q.z - q.rz * 2.6); m.rotation.y = Math.atan2(q.rz, -q.rx) + Math.PI / 2; } }

  // скамейка и указатель на дороге
  const mq = road[Math.floor(road.length * 0.45)], bx = mq.x + mq.rx * 3, bzz = mq.z + mq.rz * 3;
  const bench = group(w, bx, 0, bzz); bench.rotation.y = Math.atan2(mq.rx, mq.rz);
  box(bench, 2.4, 0.14, 0.7, 0x9c6a3c, 0, 0.6, 0); box(bench, 2.4, 0.6, 0.12, 0x9c6a3c, 0, 1, -0.32); for (const sx of [-1, 1]) box(bench, 0.14, 0.6, 0.6, 0x6a3f1e, sx * 1, 0.3, 0);
  const sq = road[Math.floor(road.length * 0.55)], sx0 = sq.x - sq.rx * 3, sz0 = sq.z - sq.rz * 3;
  box(w, 0.25, 2.6, 0.25, 0x6a3f1e, sx0, 1.3, sz0);
  const sign = makeLabel(4.4, 1.1); sign.position.set(sx0, 3.2, sz0); scene.add(sign); sign.userData.set('🏡 Дача — уже близко!', { color: '#ffe14d' });

  // стога сена
  for (const [x, z] of [[-55, 125], [-6, 133], [-52, 160], [2, 168]]) { box(w, 3, 2, 3, 0xe8c45a, x, 1, z); box(w, 2, 0.8, 2, 0xf2d27a, x, 2.4, z); }

  // ---------- участок ----------
  const D = DACHA, gx = -30;
  box(w, D.x1 - D.x0, 0.03, D.z1 - D.z0, 0x7fd65a, mid(D.x0, D.x1), 0.02, mid(D.z0, D.z1), { shadow: false });
  // штакетник по периметру
  const picket = (x0, z0, x1, z1, gap) => {
    const len = Math.hypot(x1 - x0, z1 - z0), dx = (x1 - x0) / len, dz = (z1 - z0) / len;
    for (let t = 0; t <= len; t += 0.55) { const x = x0 + dx * t, z = z0 + dz * t; if (gap && x > gap[0] && x < gap[1]) continue; box(w, dz ? 0.25 : 0.12, 1.3, dz ? 0.12 : 0.25, 0xf2e6c8, x, 0.65, z, { shadow: false }); }
    for (const y of [0.45, 1]) {
      if (gap) { box(w, gap[0] - x0, 0.1, 0.08, 0xc8a87a, mid(x0, gap[0]), y, z0); box(w, x1 - gap[1], 0.1, 0.08, 0xc8a87a, mid(gap[1], x1), y, z0); }
      else box(w, dz ? 0.08 : len, 0.1, dz ? len : 0.08, 0xc8a87a, mid(x0, x1), y, mid(z0, z1));
    }
    if (gap) { addCollider({ x0: x0 - 0.15, x1: gap[0], y0: 0, y1: 1.3, z0: z0 - 0.15, z1: z0 + 0.15 }); addCollider({ x0: gap[1], x1: x1 + 0.15, y0: 0, y1: 1.3, z0: z0 - 0.15, z1: z0 + 0.15 }); }
    else addCollider({ x0: Math.min(x0, x1) - 0.15, x1: Math.max(x0, x1) + 0.15, y0: 0, y1: 1.3, z0: Math.min(z0, z1) - 0.15, z1: Math.max(z0, z1) + 0.15 });
  };
  picket(D.x0, D.z0, D.x1, D.z0, [gx - 2.2, gx + 2.2]); picket(D.x0, D.z1, D.x1, D.z1); picket(D.x0, D.z0, D.x0, D.z1); picket(D.x1, D.z0, D.x1, D.z1);

  // Ворота калитки (высота 3.8м — голова персонажа проходит с большим запасом!)
  for (const sx of [-1, 1]) box(w, 0.3, 3.8, 0.3, 0x8a5a2b, gx + sx * 2.3, 1.9, D.z0);
  box(w, 5, 0.3, 0.3, 0x8a5a2b, gx, 3.8, D.z0);
  const gs = makeLabel(4.4, 1.1, { face: Math.PI }); gs.position.set(gx, 4.5, D.z0 - 0.2); scene.add(gs); gs.userData.set('🏡 Дача', { color: '#ffe14d' });
  box(w, 0.15, 1.2, 0.15, 0x6a3f1e, gx + 3.4, 0.6, D.z0 - 0.6); box(w, 0.7, 0.5, 0.5, 0x3a6ad8, gx + 3.4, 1.4, D.z0 - 0.6);

  // Уютные фонари у ключевых ориентиров (на обочинах вне дороги)
  createLampPost(w, br.x - 3.2, br.z, Math.PI / 2);    // у мостика через ручей (на берегу)
  createLampPost(w, gx + 2.8, D.z0 - 0.5, Math.PI);    // у калитки дачи (сбоку от ворот)
  createLampPost(w, -18, 188, 0);                      // у колодца и грядок
  createLampPost(w, 0, 196, 0);                        // у входа в теплицу
  createLampPost(w, 13, 184, 0);                       // у садовых качелей
  createLampPost(w, 24, 175, 0);                       // у дорожки к бане

  // тропинка от калитки к крыльцу
  for (let z = D.z0 + 0.5; z < D.house.z - 4.2; z += 1.1) box(w, 1.1, 0.06, 0.8, 0xb9b9c8, gx - (z - D.z0) * 0.4 + (z % 2.2 > 1.1 ? 0.3 : -0.3), 0.05, z, { shadow: false });

  // бревенчатый домик
  const H0 = D.house, hw = 4.5, hd = 3.5, HX0 = H0.x - hw, HX1 = H0.x + hw, HZ0 = H0.z - hd, HZ1 = H0.z + hd, WH = 3.6;

  // Твёрдые стены по периметру дома с открытым дверным проёмом в центре (проём 1.8м: от H0.x - 0.9 до H0.x + 0.9)
  const WALL_THICK = 0.45;
  const frontWallW = (hw * 2 - 1.8) / 2; // 3.6м
  solid(w, hw * 2, WH, WALL_THICK, 0x8a5a2b, H0.x, 0, HZ1); // задняя стена
  solid(w, WALL_THICK, WH, hd * 2, 0x8a5a2b, HX0, 0, H0.z); // левая стена
  solid(w, WALL_THICK, WH, hd * 2, 0x8a5a2b, HX1, 0, H0.z); // правая стена
  solid(w, frontWallW, WH, WALL_THICK, 0x8a5a2b, H0.x - 0.9 - frontWallW / 2, 0, HZ0); // передняя левая стена
  solid(w, frontWallW, WH, WALL_THICK, 0x8a5a2b, H0.x + 0.9 + frontWallW / 2, 0, HZ0); // передняя правая стена
  box(w, 1.8, 1.2, WALL_THICK, 0x8a5a2b, H0.x, 3.0, HZ0); // перемычка над входом (дверной проём высотой 2.4м)

  // Брёвна стен
  for (let i = 0; i < 9; i++) {
    const y = 0.2 + i * 0.4, c = i % 2 ? 0x9c6a3c : 0x8a5a2b;
    box(w, hw * 2 + 0.5, 0.42, 0.42, c, H0.x, y, HZ1);
    box(w, 0.42, 0.42, hd * 2 + 0.5, c, HX0, y, H0.z);
    box(w, 0.42, 0.42, hd * 2 + 0.5, c, HX1, y, H0.z);
    if (i < 6) {
      box(w, frontWallW + 0.25, 0.42, 0.42, c, H0.x - 0.9 - frontWallW / 2, y, HZ0);
      box(w, frontWallW + 0.25, 0.42, 0.42, c, H0.x + 0.9 + frontWallW / 2, y, HZ0);
    } else {
      box(w, hw * 2 + 0.5, 0.42, 0.42, c, H0.x, y, HZ0);
    }
  }

  // Окна с тёплыми ставнями
  const win = (x, z, rotY) => {
    const g = group(w, x, 1.9, z); g.rotation.y = rotY;
    box(g, 1.5, 1.4, 0.1, 0xffffff, 0, 0, 0.25);
    const glass = box(g, 1.2, 1.1, 0.12, 0x9fdcff, 0, 0, 0.27);
    glass.userData.dynamic = true;
    registerWindow(glass);
    box(g, 0.08, 1.1, 0.14, 0xffffff, 0, 0, 0.29); box(g, 1.2, 0.08, 0.14, 0xffffff, 0, 0, 0.29);
    box(g, 1.8, 0.3, 0.12, 0xffffff, 0, 0.85, 0.27); box(g, 1.5, 0.12, 0.3, 0xffffff, 0, -0.75, 0.3);
    for (const sx of [-1, 1]) box(g, 0.55, 1.3, 0.1, 0x4a9a4a, sx * 1.05, 0, 0.27);
  };
  win(H0.x - 2.5, HZ0, Math.PI); win(H0.x + 2.5, HZ0, Math.PI); win(HX0, H0.z, -Math.PI / 2); win(HX1, H0.z, Math.PI / 2); win(H0.x, HZ1, 0);

  // Крыльцо и открытая деревянная дверь
  const doorLeaf = box(w, 1.15, 2.2, 0.08, 0x6a3f1e, H0.x + 0.85, 1.55, HZ0 + 0.6);
  doorLeaf.rotation.y = 1.35;
  box(doorLeaf, 0.08, 0.14, 0.08, 0xffd23f, 0.45, 0, 0.04);
  box(w, 1.5, 0.04, 0.8, 0x4a7c59, H0.x, 0.48, HZ0 + 0.5, { shadow: false }); // коврик у порога

  box(w, 3, 0.3, 1.4, 0x9c6a3c, H0.x, 0.15, HZ0 - 0.9);
  box(w, 3, 0.3, 0.7, 0x8a5a2b, H0.x, 0.45, HZ0 - 0.55);
  for (const sx of [-1, 1]) box(w, 0.2, 4.2, 0.2, 0x6a3f1e, H0.x + sx * 1.4, 2.1, HZ0 - 1.4);
  box(w, 3.4, 0.25, 1.8, 0xb8462a, H0.x, 4.25, HZ0 - 0.85);

  // Пол и потолочные балки домика (пол на высоте 0.45м встык со ступенькой крыльца)
  box(w, hw * 2 - 0.3, 0.12, hd * 2 - 0.3, 0xba8850, H0.x, 0.46, H0.z, { shadow: false });
  box(w, hw * 2 - 0.3, 0.1, hd * 2 - 0.3, 0x6b4423, H0.x, WH, H0.z, { shadow: false });

  // ---------------- УЮТНЫЙ ИНТЕРЬЕР ДОМИКА ----------------
  // 1. Русская печь в правом дальнем углу
  solid(w, 2.0, 2.3, 2.2, 0xf5f5ee, H0.x + 2.7, 0.5, H0.z + 2.0); // основание печи
  box(w, 0.7, 0.9, 1.8, 0xeaeae0, H0.x + 1.35, 0.97, H0.z + 2.0); // печная лежанка
  box(w, 0.85, 0.8, 0.35, 0x221814, H0.x + 2.7, 1.1, H0.z + 0.88); // устье печи (топка)
  box(w, 0.6, 0.18, 0.25, 0xff5511, H0.x + 2.7, 0.79, H0.z + 0.88); // горящие угли
  box(w, 0.7, 1.4, 0.7, 0xf5f5ee, H0.x + 2.7, 2.9, H0.z + 2.0); // дымоход к крыше
  box(w, 0.26, 0.26, 0.26, 0x2b2b2b, H0.x + 2.3, 2.45, H0.z + 1.4); // чугунок
  box(w, 0.22, 0.22, 0.22, 0x2b2b2b, H0.x + 2.65, 2.43, H0.z + 1.4);
  const stoveLight = new T.PointLight(0xff6611, 0.45, 6);
  stoveLight.position.set(H0.x + 2.7, 1.2, H0.z + 0.8);
  w.add(stoveLight);

  // 2. Деревенский обеденный стол и скамья у окна
  solid(w, 1.8, 0.9, 1.1, 0x9c6a3c, H0.x + 2.2, 0.5, H0.z - 1.5); // стол
  box(w, 1.8, 0.45, 0.35, 0x8a5a2b, H0.x + 2.2, 0.74, H0.z - 0.7); // скамья
  box(w, 0.32, 0.46, 0.32, 0xd4af37, H0.x + 2.2, 1.45, H0.z - 1.5); // пузатый золотой самовар
  box(w, 0.18, 0.2, 0.18, 0xcc3333, H0.x + 1.7, 1.35, H0.z - 1.5); // заварочный чайник
  box(w, 0.12, 0.15, 0.12, 0xffffff, H0.x + 2.6, 1.32, H0.z - 1.5); // чашка

  // 3. Тканый половичок (дорожка) через всю горницу
  box(w, 1.2, 0.02, 3.4, 0xb83828, H0.x, 0.53, H0.z + 0.4, { shadow: false });
  for (const sz of [-1.4, -0.7, 0, 0.7, 1.4]) {
    box(w, 1.1, 0.025, 0.07, 0xe8c44a, H0.x, 0.535, H0.z + 0.4 + sz, { shadow: false });
  }

  // 4. Подвесная люстра-лампа под потолком
  box(w, 0.04, 0.75, 0.04, 0x665544, H0.x, WH - 0.4, H0.z);
  const houseBulb = box(w, 0.38, 0.26, 0.38, 0xfff0aa, H0.x, WH - 0.85, H0.z, { shadow: false });
  houseBulb.userData.dynamic = true;
  st.houseLight = new T.PointLight(0xffdf88, 0.35, 18);
  st.houseLight.position.set(H0.x, WH - 0.85, H0.z);
  st.houseLight.userData.dynamic = true;
  w.add(st.houseLight);
  registerLamp(houseBulb, null, null, H0.x, H0.z);

  // 5. БОЛЬШАЯ УЮТНАЯ КРОВАТЬ (DACHA_BED: x: -38.6, z: 199.8)
  solid(w, 1.6, 0.75, 2.4, 0x7c4f24, DACHA_BED.x, 0.5, DACHA_BED.z).visible = false; // коллайдер кровати
  // 4 точёных столбика кровати
  for (const [px, pz, ph] of [[-39.35, 198.65, 0.9], [-37.85, 198.65, 0.9], [-39.35, 200.95, 1.4], [-37.85, 200.95, 1.4]]) {
    box(w, 0.16, ph, 0.16, 0x5a3416, px, 0.5 + ph / 2, pz);
  }
  // Резная деревянная спинка у изголовья
  box(w, 1.5, 0.95, 0.1, 0x7c4f24, DACHA_BED.x, 1.25, 200.95);
  box(w, 1.6, 0.12, 0.14, 0x9c6a3c, DACHA_BED.x, 1.75, 200.95);
  // Изножье кровати
  box(w, 1.5, 0.55, 0.1, 0x7c4f24, DACHA_BED.x, 0.82, 198.65);
  box(w, 1.6, 0.1, 0.14, 0x9c6a3c, DACHA_BED.x, 1.12, 198.65);
  // Деревянные боковины
  for (const sx of [-1, 1]) box(w, 0.1, 0.3, 2.2, 0x6a3f1e, DACHA_BED.x + sx * 0.72, 0.72, DACHA_BED.z);
  // Мягкий матрас
  box(w, 1.38, 0.28, 2.15, 0xf7f4ec, DACHA_BED.x, 0.76, DACHA_BED.z);
  // Лоскутное одеяло (patchwork quilt)
  box(w, 1.4, 0.08, 1.5, 0xcc3333, DACHA_BED.x, 0.91, DACHA_BED.z - 0.3);
  box(w, 1.4, 0.1, 0.2, 0xffffff, DACHA_BED.x, 0.93, DACHA_BED.z + 0.46);
  const quiltCols = [0xe8b839, 0x2e8540, 0x2980b9, 0xd35400, 0x8e44ad, 0x16a085, 0xd98880, 0xf39c12, 0x34495e];
  for (let qi = 0; qi < 3; qi++) {
    for (let qj = 0; qj < 3; qj++) {
      const qx = DACHA_BED.x - 0.42 + qi * 0.42;
      const qz = DACHA_BED.z - 0.75 + qj * 0.45;
      const qc = quiltCols[(qi * 3 + qj) % quiltCols.length];
      box(w, 0.38, 0.02, 0.4, qc, qx, 0.96, qz, { shadow: false });
    }
  }
  // Пышная белая подушка
  box(w, 1.05, 0.18, 0.52, 0xffffff, DACHA_BED.x, 0.98, DACHA_BED.z + 0.8);
  box(w, 0.8, 0.04, 0.32, 0xe0e4f0, DACHA_BED.x, 1.07, DACHA_BED.z + 0.8, { shadow: false });
  // Прикроватный коврик
  box(w, 0.8, 0.02, 2.2, 0x2c5c52, DACHA_BED.x + 1.15, 0.53, DACHA_BED.z, { shadow: false });
  // Прикроватная тумбочка с ночником
  box(w, 0.6, 0.55, 0.6, 0x7c4f24, DACHA_BED.x + 1.15, 0.79, DACHA_BED.z + 1.05);
  box(w, 0.14, 0.22, 0.14, 0xfff0a0, DACHA_BED.x + 1.15, 1.15, DACHA_BED.z + 1.05);
  box(w, 0.06, 0.08, 0.06, 0xff8800, DACHA_BED.x + 1.15, 1.28, DACHA_BED.z + 1.05, { shadow: false });

  // 3D-надпись над кроватью
  const bedLbl = makeLabel(3.8, 0.85, { face: 0 });
  bedLbl.position.set(DACHA_BED.x, 2.2, DACHA_BED.z);
  scene.add(bedLbl);
  bedLbl.userData.set('🛏️ Кровать (Сон)', { color: '#ffea7a' });
  st.bedLabel = bedLbl;

  // Фонарь над крыльцом
  const porchBulb = box(w, 0.28, 0.35, 0.28, 0x8a7f66, H0.x, 3.8, HZ0 - 1.2, { shadow: false });
  porchBulb.userData.dynamic = true;
  st.porchLight = new T.PointLight(0xffcf66, 0, 18);
  st.porchLight.position.set(H0.x, 3.7, HZ0 - 1.2);
  st.porchLight.userData.dynamic = true;
  w.add(st.porchLight);
  registerLamp(porchBulb, null, null, H0.x, HZ0 - 1.2);

  // Двускатная крыша дома
  for (const sx of [-1, 1]) { const r = box(w, hw * 2 + 1.2, 0.3, hd + 1.4, 0xc0392b, H0.x, WH + 1.35, H0.z + sx * (hd + 1.4) / 2 * 0.82); r.rotation.x = sx * 0.62; }
  for (const x of [HX0, HX1]) for (let i = 0; i < 6; i++) box(w, 0.36, 0.4, hd * 2 - i * 1.12, i % 2 ? 0x9c6a3c : 0x8a5a2b, x, WH + 0.2 + i * 0.4, H0.z);
  box(w, 0.9, 2.4, 0.9, 0xb0503a, H0.x + 2.4, WH + 2.0, H0.z + 1.2); box(w, 1.1, 0.25, 1.1, 0x8a3a2a, H0.x + 2.4, WH + 3.25, H0.z + 1.2);
  st.chimney = new T.Vector3(H0.x + 2.4, WH + 3.6, H0.z + 1.2);
  const hl = makeLabel(5, 1.25); hl.position.set(H0.x, WH + 4.8, H0.z); scene.add(hl); hl.userData.set('🏡 Домик в деревне', { color: '#ffffff' });

  // колодец с приподнятой крышей (3.95м)
  const Wl = D.well;
  for (const [dx, dz, ww, dd] of [[0, -0.8, 2, 0.4], [0, 0.8, 2, 0.4], [-0.8, 0, 0.4, 1.2], [0.8, 0, 0.4, 1.2]]) box(w, ww, 1, dd, 0x9aa4ad, Wl.x + dx, 0.5, Wl.z + dz);
  solid(w, 2, 1, 2, 0x9aa4ad, Wl.x, 0, Wl.z).visible = false;
  box(w, 1.2, 0.05, 1.2, 0x2a5ad8, Wl.x, 0.85, Wl.z, { shadow: false });
  for (const sx of [-1, 1]) box(w, 0.2, 4.0, 0.2, 0x6a3f1e, Wl.x + sx * 1, 2.0, Wl.z);
  box(w, 2.4, 0.15, 0.15, 0x6a3f1e, Wl.x, 2.8, Wl.z);
  for (const sx of [-1, 1]) { const r = box(w, 2.6, 0.12, 1.5, 0xc0392b, Wl.x, 3.95, Wl.z + sx * 0.55); r.rotation.x = sx * 0.45; }

  // грядки
  for (const B of D.beds) {
    box(w, 8, 0.25, 2, 0x5a3a1e, B.x, 0.12, B.z, { studs: true });
    for (const sz of [-1, 1]) box(w, 8.2, 0.3, 0.15, 0xc8a87a, B.x, 0.15, B.z + sz * 1.05, { shadow: false });
    for (const sx of [-1, 1]) box(w, 0.15, 0.3, 2.2, 0xc8a87a, B.x + sx * 4.05, 0.15, B.z, { shadow: false });
  }
  box(w, 0.15, 1.3, 0.15, 0x8a5a2b, D.beds[0].x - 5, 0.65, D.beds[0].z - 1.3); box(w, 1.9, 0.6, 0.08, 0xc8a87a, D.beds[0].x - 5, 1.35, D.beds[0].z - 1.3);
  const bl = makeLabel(1.8, 0.45, { face: Math.PI }); bl.position.set(D.beds[0].x - 5, 1.35, D.beds[0].z - 1.36); scene.add(bl); bl.userData.set('🌱 Грядки', { color: '#c8ffb0' });

  // пугало у грядок
  const sg = group(w, -15.5, 0, 197.5); sg.rotation.y = -Math.PI / 2;
  const sc = buildHero(sg, PEOPLE.scarecrow); sc.armL.rotation.z = -1.45; sc.armR.rotation.z = 1.45; compactHero(sc);
  box(w, 0.2, 1.4, 0.2, 0x8a5a2b, -15.5, 0.7, 197.5);

  // яблони у домика
  for (const [x, z] of [[-44.5, 186], [-44, 205.5], [-15.5, 186.5], [-26, 205.5]]) tree(w, x, z, 0.8, 0, 'apple');

  // Будка верного пса Дружка
  box(w, 1.6, 1.2, 1.8, 0x9c6a3c, -44.5, 0.6, 198);
  const dr = box(w, 1.9, 0.2, 2.1, 0xc0392b, -44.5, 1.35, 198); dr.rotation.z = 0.1;
  box(w, 0.1, 0.7, 0.6, 0x2b2b2b, -43.65, 0.45, 198, { shadow: false });
  solid(w, 1.8, 1.3, 2, 0x9c6a3c, -44.5, 0, 198).visible = false;
  const dhl = makeLabel(2.6, 0.65); dhl.position.set(-44.5, 2.0, 198); scene.add(dhl); dhl.userData.set('🐶 Дружок', { color: '#ffda79' });

  // Поленница с сухими берёзовыми дровами
  for (let i = 0; i < 9; i++) { const m = box(w, 0.4, 0.4, 1.6, i % 2 ? 0xb07a4a : 0x9c6a3c, -41.2 + (i % 3) * 0.45, 0.2 + Math.floor(i / 3) * 0.4, 203.5); m.rotation.x = Math.PI / 2; }
  const wpl = makeLabel(2.6, 0.65); wpl.position.set(-41.2, 1.85, 203.5); scene.add(wpl); wpl.userData.set('🪵 Поленница', { color: '#d2b48c' });

  // Скамейка у дома
  box(w, 2.4, 0.14, 0.7, 0x9c6a3c, -30.5, 0.6, 193.2); for (const s2 of [-1, 1]) box(w, 0.14, 0.6, 0.6, 0x6a3f1e, -30.5 + s2, 0.3, 193.2);

  // ---------- восточная часть дачного участка ----------
  for (let x = -13; x <= 36; x += 1.8) {
    const pz = 191 + Math.sin(x * 0.2) * 0.6;
    box(w, 1.2, 0.05, 0.85, 0xb9b9c8, x, 0.05, pz, { shadow: false });
  }

  // 1. Просторная теплица для помидоров и огурцов (x = 3, z = 200)
  const GH = { x: 3, z: 200, w: 7.2, d: 5.6 };
  box(w, GH.w, 0.25, GH.d, 0xd0d8e0, GH.x, 0.12, GH.z);
  for (const [gx0, gx1, gz0, gz1] of [
    [GH.x - 3.5, GH.x - 1.25, GH.z - 2.7, GH.z - 2.5],
    [GH.x + 1.25, GH.x + 3.5, GH.z - 2.7, GH.z - 2.5],
    [GH.x - 3.5, GH.x + 3.5, GH.z + 2.5, GH.z + 2.7],
    [GH.x - 3.6, GH.x - 3.4, GH.z - 2.7, GH.z + 2.7],
    [GH.x + 3.4, GH.x + 3.6, GH.z - 2.7, GH.z + 2.7]
  ]) {
    solid(w, gx1 - gx0, 3.8, gz1 - gz0, 0xbdecf6, mid(gx0, gx1), 0, mid(gz0, gz1));
  }
  for (const [cx, cz] of [
    [GH.x - 3.5, GH.z - 2.6], [GH.x + 3.5, GH.z - 2.6],
    [GH.x - 3.5, GH.z + 2.6], [GH.x + 3.5, GH.z + 2.6],
    [GH.x - 1.25, GH.z - 2.6], [GH.x + 1.25, GH.z - 2.6]
  ]) {
    box(w, 0.22, 3.8, 0.22, 0xd0d8e0, cx, 1.9, cz);
  }
  box(w, 2.5, 0.35, 0.22, 0xd0d8e0, GH.x, 3.8, GH.z - 2.6);
  box(w, GH.w + 0.4, 0.2, 0.2, 0xd0d8e0, GH.x, 4.95, GH.z);
  for (const sx of [-1, 1]) {
    const r = box(w, GH.w + 0.4, 0.08, GH.d / 2 + 0.5, 0xbdecf6, GH.x, 4.4, GH.z + sx * (GH.d / 4));
    r.rotation.x = sx * 0.36;
  }
  for (const sx of [-1.9, 1.9]) {
    box(w, 1.8, 0.25, 4.2, 0x5a3a1e, GH.x + sx, 0.2, GH.z, { studs: true });
    for (let bz = -1.4; bz <= 1.5; bz += 0.95) {
      box(w, 0.45, 0.8, 0.45, 0x3fae3a, GH.x + sx, 0.6, GH.z + bz, { shadow: false });
      const t1 = box(w, 0.22, 0.22, 0.22, 0xe82c2c, GH.x + sx + 0.14, 0.85, GH.z + bz + 0.1, { shadow: false });
      const t2 = box(w, 0.2, 0.2, 0.2, 0xe82c2c, GH.x + sx - 0.14, 0.65, GH.z + bz - 0.1, { shadow: false });
      const c1 = box(w, 0.14, 0.14, 0.35, 0x2e8b3a, GH.x + sx, 0.4, GH.z + bz + 0.15, { shadow: false });
      t1.userData.dynamic = t2.userData.dynamic = c1.userData.dynamic = true;
      st.ghTomatoes.push(t1, t2, c1);
    }
  }
  const ghl = makeLabel(3.8, 0.9, { face: Math.PI });
  ghl.position.set(GH.x, 4.3, GH.z - 2.8);
  scene.add(ghl);
  ghl.userData.set('🍅 Теплица', { color: '#ff6b6b' });
  st.ghLabel = ghl;

  // 2. Деревянная беседка для чаепития (x = 22, z = 191)
  const GZ = { x: 22, z: 191, s: 6.2 };
  box(w, GZ.s, 0.25, GZ.s, 0xa8743f, GZ.x, 0.12, GZ.z, { studs: true });
  for (const [px, pz] of [
    [GZ.x - 2.7, GZ.z - 2.7], [GZ.x + 2.7, GZ.z - 2.7],
    [GZ.x - 2.7, GZ.z + 2.7], [GZ.x + 2.7, GZ.z + 2.7]
  ]) {
    solid(w, 0.35, 4.0, 0.35, 0x6a3f1e, px, 0, pz);
  }
  box(w, GZ.s - 0.7, 0.85, 0.15, 0x8a5a2b, GZ.x, 0.65, GZ.z - 2.7);
  box(w, GZ.s - 0.7, 0.85, 0.15, 0x8a5a2b, GZ.x, 0.65, GZ.z + 2.7);
  box(w, 0.15, 0.85, GZ.s - 0.7, 0x8a5a2b, GZ.x + 2.7, 0.65, GZ.z);
  box(w, GZ.s + 0.6, 0.35, GZ.s + 0.6, 0xb8462a, GZ.x, 4.05, GZ.z);
  box(w, 4.6, 0.5, 4.6, 0xc0392b, GZ.x, 4.5, GZ.z);
  box(w, 2.4, 0.5, 2.4, 0x9c3222, GZ.x, 5.0, GZ.z);
  box(w, 0.45, 0.5, 0.45, 0xffd23f, GZ.x, 5.5, GZ.z);
  // Стол, скамьи, самовар и чашки
  solid(w, 2.4, 0.85, 1.4, 0x8a5a2b, GZ.x, 0, GZ.z).visible = false;
  box(w, 2.4, 0.12, 1.4, 0x8a5a2b, GZ.x, 0.85, GZ.z);
  box(w, 2.4, 0.12, 0.5, 0x9c6a3c, GZ.x, 0.48, GZ.z - 1.45);
  box(w, 2.4, 0.12, 0.5, 0x9c6a3c, GZ.x, 0.48, GZ.z + 1.45);
  box(w, 0.5, 0.12, 1.6, 0x9c6a3c, GZ.x + 1.4, 0.48, GZ.z); // восточная скамейка
  box(w, 0.45, 0.65, 0.45, 0xffd23f, GZ.x, 1.25, GZ.z);      // самовар
  box(w, 0.22, 0.2, 0.22, 0xffaa00, GZ.x, 1.6, GZ.z);
  box(w, 0.18, 0.14, 0.18, 0xffffff, GZ.x - 0.6, 0.95, GZ.z);  // чашки
  box(w, 0.18, 0.14, 0.18, 0xffffff, GZ.x + 0.6, 0.95, GZ.z);
  box(w, 0.35, 0.08, 0.35, 0xe8c45a, GZ.x, 0.95, GZ.z + 0.45); // баранки

  // Подвесной светильник под куполом беседки
  box(w, 0.06, 0.5, 0.06, 0x222222, GZ.x, 3.8, GZ.z, { shadow: false });
  const gzBulb = box(w, 0.35, 0.42, 0.35, 0x8a7f66, GZ.x, 3.35, GZ.z, { shadow: false });
  gzBulb.userData.dynamic = true;
  st.gazeboLight = new T.PointLight(0xffbe4d, 0, 18);
  st.gazeboLight.position.set(GZ.x, 3.2, GZ.z);
  st.gazeboLight.userData.dynamic = true;
  w.add(st.gazeboLight);
  registerLamp(gzBulb, null, null, GZ.x, GZ.z);

  const gzl = makeLabel(3.5, 0.8);
  gzl.position.set(GZ.x - 2.8, 3.8, GZ.z);
  gzl.rotation.y = -Math.PI / 2;
  scene.add(gzl);
  gzl.userData.set('🫖 Беседка', { color: '#ffe14d' });

  // 3. Костровище с пеньками (x = 37, z = 201)
  const CF = { x: 37, z: 201 };
  box(w, 6.5, 0.04, 6.5, 0x7a7a85, CF.x, 0.02, CF.z, { shadow: false });
  for (let a = 0; a < Math.PI * 2; a += 0.65) {
    const rx = CF.x + Math.cos(a) * 1.5, rz = CF.z + Math.sin(a) * 1.5;
    box(w, 0.45, 0.28, 0.45, 0x8a8f9a, rx, 0.14, rz);
  }
  box(w, 1.2, 0.2, 1.2, 0x4a2a1a, CF.x, 0.1, CF.z);
  box(w, 0.7, 0.35, 0.7, 0xff5a1e, CF.x, 0.25, CF.z);
  st.campfire = new T.Vector3(CF.x, 0.5, CF.z);

  // Живой свет и пятно на земле от костра
  st.campLight = new T.PointLight(0xff6818, 0, 22);
  st.campLight.position.set(CF.x, 1.2, CF.z);
  st.campLight.userData.dynamic = true;
  w.add(st.campLight);

  // Ореол огня на земле (мягкое аккуратное свечение)
  const ccv = document.createElement('canvas'); ccv.width = ccv.height = 128;
  const cctx = ccv.getContext('2d');
  const ccg = cctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  ccg.addColorStop(0, 'rgba(255, 140, 40, 0.20)');
  ccg.addColorStop(0.35, 'rgba(255, 100, 20, 0.10)');
  ccg.addColorStop(0.7, 'rgba(220, 70, 10, 0.03)');
  ccg.addColorStop(1, 'rgba(180, 50, 0, 0)');
  cctx.fillStyle = ccg; cctx.fillRect(0, 0, 128, 128);
  const campGlowMat = new T.MeshBasicMaterial({
    map: new T.CanvasTexture(ccv),
    blending: T.AdditiveBlending,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    side: T.DoubleSide
  });
  st.campGlow = new T.Mesh(new T.PlaneGeometry(14, 14), campGlowMat);
  st.campGlow.position.set(CF.x, 0.04, CF.z);
  st.campGlow.rotation.x = -Math.PI / 2;
  st.campGlow.userData.dynamic = true;
  w.add(st.campGlow);

  for (const s of CAMP_STUMPS) {
    solid(w, 0.8, 0.6, 0.8, 0xe8e8e8, s.x, 0, s.z);
    box(w, 0.7, 0.05, 0.7, 0xc4a070, s.x, 0.62, s.z, { shadow: false });
  }
  const cfl = makeLabel(3.4, 0.75);
  cfl.position.set(CF.x, 2.4, CF.z);
  scene.add(cfl);
  cfl.userData.set('🔥 Костровище', { color: '#ff9234' });

  // 4. Садовые качели с навесом (x = 13, z = 186.5)
  const SW = { x: 13, z: 186.5 };
  for (const sx of [-1.6, 1.6]) {
    solid(w, 0.2, 3.9, 0.2, 0x6a3f1e, SW.x + sx, 0, SW.z - 0.85);
    solid(w, 0.2, 3.9, 0.2, 0x6a3f1e, SW.x + sx, 0, SW.z + 0.85);
  }
  box(w, 3.6, 0.22, 0.22, 0x6a3f1e, SW.x, 3.8, SW.z);
  box(w, 3.8, 0.15, 2.4, 0x3fae3a, SW.x, 4.0, SW.z); // зелёный тент

  // Подвесная скамья качелей — НЕ ЗАПЕКАТЬ (userData.dynamic = true)!
  const swg = group(w, SW.x, 3.8, SW.z);
  swg.userData.dynamic = true;
  for (const sx of [-1.1, 1.1]) {
    const ch1 = box(swg, 0.06, 3.1, 0.06, 0xaaaaaa, sx, -1.55, -0.25, { shadow: false });
    const ch2 = box(swg, 0.06, 3.1, 0.06, 0xaaaaaa, sx, -1.55, 0.25, { shadow: false });
    ch1.userData.dynamic = ch2.userData.dynamic = true;
  }
  const seatM = box(swg, 2.4, 0.12, 0.8, 0x9c6a3c, 0, -3.1, 0);
  const backM = box(swg, 2.4, 0.6, 0.12, 0x9c6a3c, 0, -2.75, -0.35);
  const cushM = box(swg, 2.2, 0.08, 0.7, 0x4a9a4a, 0, -3.0, 0, { shadow: false });
  seatM.userData.dynamic = backM.userData.dynamic = cushM.userData.dynamic = true;
  st.swingBench = swg;

  const swl = makeLabel(3.2, 0.75);
  swl.position.set(SW.x, 4.4, SW.z);
  scene.add(swl);
  swl.userData.set('🛝 Качели', { color: '#a8ff78' });

  // 5. Деревья и плодоносящие ягодные кусты
  tree(w, 13, 203, 0.9, 0, 'apple');
  tree(w, 30, 186.5, 0.95, 0, 'apple');
  tree(w, 42, 187, 0.85, 0, 'birch');
  tree(w, 42, 205, 0.9, 0, 'apple');
  tree(w, 32, 196, 0.8, 0, 'pine');

  // Ягодные кусты смородины и малины
  for (let z = 185; z <= 205; z += 3.2) {
    box(w, 1.1, 0.95, 1.1, 0x3fae3a, 44.2, 0.47, z);
    const bm1 = box(w, 0.35, 0.35, 0.35, 0xd02040, 43.8, 0.6, z - 0.2, { shadow: false });
    const bm2 = box(w, 0.32, 0.32, 0.32, 0x302060, 43.8, 0.55, z + 0.2, { shadow: false });
    bm1.userData.dynamic = bm2.userData.dynamic = true;
    st.berryMeshes.push(bm1, bm2);
  }
  const byl = makeLabel(3.6, 0.75, { face: -Math.PI / 2 });
  byl.position.set(43.2, 2.0, 195);
  scene.add(byl);
  byl.userData.set('🫐 Ягодные кусты', { color: '#c77dff' });
  st.berryLabel = byl;

  return w;
}

// Проверка интерактивных зон дачи для вызова кнопок действий
export function dachaNear(p, save, hero) {
  if (!save) return [];
  const d = dachaSave(save);
  const now = Date.now();

  // Если персонаж спит в кровати
  if (hero?.sleeping || hero?.climb?.sleep) {
    return [{ id: 'g_dacha_wakeup', icon: '🚶' }];
  }

  // Если персонаж уже сидит в беседке, на пеньке или качелях
  if (hero?.climb?.seat) {
    if (Math.hypot(p.x - 22, p.z - 191) < 3.2) {
      return [{ id: 'g_dacha_tea', icon: '🫖' }, { id: 'g_dacha_stand', icon: '🚶' }];
    }
    if (Math.hypot(p.x - 37, p.z - 201) < 3.5) {
      return [{ id: 'g_dacha_marsh', icon: '🍡' }, { id: 'g_dacha_stand', icon: '🚶' }];
    }
    if (Math.hypot(p.x - 13, p.z - 186.5) < 2.5) {
      return [{ id: 'g_dacha_stand', icon: '🚶' }];
    }
  }

  // 0. Кровать в домике (Dacha Bed: x: -38.6, z: 199.8)
  if (Math.hypot(p.x - DACHA_BED.x, p.z - DACHA_BED.z) < 2.6) {
    return [{ id: 'g_dacha_sleep', icon: '🛌' }];
  }

  // 1. Теплица (Greenhouse: x: 3, z: 200)
  if (Math.abs(p.x - 3) < 3.2 && Math.abs(p.z - 200) < 2.8) {
    if (d.ghTime === 0 || now >= d.ghTime) {
      return [{ id: 'g_dacha_gh_harvest', icon: '🧺' }];
    }
    const btns = [];
    if (!d.ghWatered && save.garden && save.garden.can > 0) {
      btns.push({ id: 'g_dacha_gh_water', icon: '💧' });
    }
    btns.push({ id: 'g_dacha_gh_info', icon: '⏳' });
    return btns;
  }

  // 2. Беседка (Gazebo: x: 22, z: 191)
  if (Math.hypot(p.x - 22, p.z - 191) < 2.8) {
    return [{ id: 'g_dacha_tea', icon: '🫖' }, { id: 'g_dacha_sit_gazebo', icon: '🪑' }];
  }

  // 3. Костровище (Campfire: x: 37, z: 201)
  if (Math.hypot(p.x - 37, p.z - 201) < 3.2) {
    const btns = [{ id: 'g_dacha_marsh', icon: '🍡' }, { id: 'g_dacha_sit_camp', icon: '🪑' }];
    btns.push(d.hasWood ? { id: 'g_dacha_wood', icon: '🪵' } : { id: 'g_dacha_woodhint', icon: '🪵' });
    return btns;
  }

  // 4. Поленница у дома (Woodpile: x: -41.2, z: 203.5)
  if (Math.hypot(p.x - (-41.2), p.z - 203.5) < 2.2) {
    return [{ id: 'g_dacha_woodpile', icon: '🪵' }];
  }

  // 5. Ягодные кусты (Berry bushes: x: ~44, z: 183..206)
  if (Math.abs(p.x - 44.2) < 2.2 && p.z >= 183 && p.z <= 206) {
    const berryRipe = !d.berryTime || (now - d.berryTime >= BERRY_COOLDOWN);
    return [{ id: 'g_dacha_berry', icon: berryRipe ? '🫐' : '⏳' }];
  }

  // 6. Садовые качели (Swing: x: 13, z: 186.5)
  if (Math.hypot(p.x - 13, p.z - 186.5) < 2.0) {
    return [{ id: 'g_dacha_swing', icon: '🛝' }];
  }

  // 7. Собачья будка Дружка (Doghouse: x: -44.5, z: 198)
  if (Math.hypot(p.x - (-44.5), p.z - 198) < 2.4) {
    return [{ id: 'g_dacha_dog', icon: '🐶' }];
  }

  // 8. Дачные яблони
  const nearTree = APPLE_TREES.find(([tx, tz]) => Math.hypot(p.x - tx, p.z - tz) < 2.5);
  if (nearTree) {
    return [{ id: 'g_dacha_apple', icon: '🍎' }];
  }

  return [];
}

// Исполнение интерактивных действий на даче
export function dachaUse(act, hero, save, { toast, confetti, SFX, persist, MOTYA }) {
  const d = dachaSave(save);
  const now = Date.now();

  // 0. Лечь в кровать и пропустить ночь
  if (act === 'sleep') {
    dachaSleep(hero, save, { toast, confetti, SFX, persist, MOTYA });
    return;
  }

  // 0. Проснуться / встать с кровати
  if (act === 'wakeup') {
    dachaWakeup(hero, { toast, SFX });
    return;
  }

  // Сесть в беседке за стол
  if (act === 'sit_gazebo') {
    sitGazebo(hero);
    toast('🪑 Сел за стол в беседке<small>нажми 🫖 чтобы попить чай, или прыжок/джойстик чтобы встать</small>');
    return;
  }

  // Сесть на пенёк у костра
  if (act === 'sit_camp') {
    sitCampfire(hero);
    toast('🪑 Сел на пенёк у костра<small>нажми 🍡 чтобы пожарить маршмеллоу, или прыжок/джойстик чтобы встать</small>');
    return;
  }

  // Встать со скамейки / пенька / качелей
  if (act === 'stand') {
    hero.climb = null;
    hero.relax = false;
    hero.dachaAnim = null;
    if (hero.model?.root) hero.model.root.rotation.x = 0;
    if (hero.model?.teaCup) hero.model.teaCup.visible = false;
    if (hero.model?.marshStick) hero.model.marshStick.visible = false;
    toast('🚶 Встал со скамейки');
    return;
  }

  // 1. Сбор урожая из теплицы
  if (act === 'gh_harvest') {
    save.coins = (save.coins || 0) + 35;
    d.ghTime = now + 90000;
    d.ghWatered = false;
    persist();
    SFX.fanfare?.();
    SFX.coins?.();
    confetti(hero.pos.clone().setY(hero.pos.y + 1.8), 35);
    puff('🍅', hero.pos.clone().setY(hero.pos.y + 1.2), { size: 1.2, rise: 1.5, life: 1.0 });
    puff('🥒', hero.pos.clone().setY(hero.pos.y + 1.2), { size: 1.2, rise: 1.5, life: 1.0 });
    toast('🧺 Собрали сочные помидоры и огурцы из теплицы! +35 🪙<small>следующий сбор через 1.5 минуты</small>');
    return;
  }

  // 2. Полив теплицы
  if (act === 'gh_water') {
    if (!save.garden || save.garden.can <= 0) {
      SFX.nope?.();
      toast('🪣 Лейка пуста!<small>набери воды в колодце 🪣</small>');
      return;
    }
    save.garden.can--;
    d.ghWatered = true;
    d.ghTime = Math.max(now, (d.ghTime || now) - 60000);
    persist();
    SFX.splash?.();
    puff('💧', new T.Vector3(3, 0.8, 200), { size: 1.5, rise: 1.3, life: 1.0 });
    puff('🌱', new T.Vector3(3, 1.2, 200), { size: 1.2, rise: 1.2, life: 1.0 });
    toast(`💧 Теплица полита! Рост ускорился на 1 минуту! 🌱<small>в лейке ещё ${save.garden.can}</small>`);
    return;
  }

  // 3. Информация о созревании в теплице
  if (act === 'gh_info') {
    const sec = Math.max(1, Math.ceil(((d.ghTime || now) - now) / 1000));
    const hint = !d.ghWatered ? '<small>Полей из лейки 💧, чтобы ускорить созревание на 1 минуту!</small>' : '<small>Уже полито родниковой водой 💧</small>';
    toast(`⏳ Тепличные овощи созреют через ${sec} сек.${hint}`);
    return;
  }

  // 4. Чаепитие в беседке у самовара (с посадкой и анимацией глотков)
  if (act === 'tea') {
    const cd = 40000;
    const left = cd - (now - (d.teaTime || 0));
    if (left > 0) {
      if (!hero.climb?.seat) sitGazebo(hero);
      toast(`🫖 Самовар ещё закипает... Подожди ${Math.ceil(left / 1000)} сек! ♨️`);
      return;
    }
    d.teaTime = now;
    if (!hero.climb?.seat) sitGazebo(hero);
    hero.dachaAnim = 'tea';
    hero.dachaK = 0;
    ensureProps(hero);
    hero.boostT = Math.max(hero.boostT || 0, 30);
    save.coins = (save.coins || 0) + 20;
    persist();
    SFX.splash?.();
    SFX.levelUp?.();
    puff('♨️', new T.Vector3(22, 1.8, 191), { size: 1.4, rise: 1.6, life: 1.5 });
    puff('✨', hero.pos.clone().setY(hero.pos.y + 1.5), { size: 1.0, rise: 1.4, life: 1.2 });
    toast('🫖 Пьём ароматный чай с мятой и баранками в беседке... Вкуснотища! +20 🪙<small>⚡️ Скорость увеличена на 30 сек! (нажми прыжок или 🚶, чтобы встать)</small>');
    return;
  }

  // 5. Жарка маршмеллоу на костре (с посадкой на пенёк и анимацией подрумянивания)
  if (act === 'marsh') {
    const cd = 35000;
    const left = cd - (now - (d.marshTime || 0));
    if (left > 0) {
      if (!hero.climb?.seat) sitCampfire(hero);
      toast(`🍡 Зефирки ещё подрумяниваются... Подожди ${Math.ceil(left / 1000)} сек! 🔥`);
      return;
    }
    d.marshTime = now;
    if (!hero.climb?.seat) sitCampfire(hero);
    hero.dachaAnim = 'marsh';
    hero.dachaK = 0;
    hero.marshEaten = false;
    ensureProps(hero);
    save.coins = (save.coins || 0) + 15;
    persist();
    SFX.crunch?.();
    puff('🍡', new T.Vector3(37, 1.0, 201), { size: 1.3, rise: 1.4, life: 1.2 });
    puff('🔥', new T.Vector3(37, 0.8, 201), { size: 1.1, rise: 1.2, life: 0.8 });
    toast('🍡 Поджариваем маршмеллоу на костре до хрустящей корочки! Ням! +15 🪙<small>(нажми прыжок или 🚶, чтобы встать)</small>');
    return;
  }

  // 6. Подбросить дров в костёр
  if (act === 'wood') {
    if (!d.hasWood) return;
    d.hasWood = false;
    save.coins = (save.coins || 0) + 20;
    persist();
    SFX.whoosh?.();
    SFX.fanfare?.();
    puff('🔥', new T.Vector3(37, 1.2, 201), { size: 2.4, rise: 2.2, life: 1.5, dx: 0.8 });
    puff('✨', new T.Vector3(37, 1.5, 201), { size: 1.6, rise: 2.0, life: 1.5, dx: 1.0 });
    toast('🪵 Подбросил сухие берёзовые поленья! Костёр ярко пылает! +20 🪙🔥');
    return;
  }

  // Подсказка, где взять дрова
  if (act === 'woodhint') {
    toast('🪵 Нужны сухие дрова! Возьми охапку в поленнице у домика 🏡');
    return;
  }

  // 7. Взять дрова из поленницы
  if (act === 'woodpile') {
    if (d.hasWood) {
      toast('🪵 У тебя уже есть охапка сухих дров! Отнеси их к костровищу 🔥');
      return;
    }
    d.hasWood = true;
    persist();
    SFX.pick?.();
    puff('🪵', hero.pos.clone().setY(hero.pos.y + 1.2), { size: 1.1, rise: 1.2, life: 0.8 });
    toast('🪵 Взял охапку сухих берёзовых дров! Отнеси к костру 🔥');
    return;
  }

  // 8. Сбор ягод с кустов
  if (act === 'berry') {
    const left = BERRY_COOLDOWN - (now - (d.berryTime || 0));
    if (left > 0 && d.berryTime) {
      const min = Math.floor(left / 60000);
      const sec = Math.ceil((left % 60000) / 1000);
      const str = min > 0 ? `${min} мин ${sec} сек` : `${sec} сек`;
      toast(`⏳ Ягоды ещё наливаются соком... Созреют через ${str}! 🌿`);
      return;
    }
    d.berryTime = now;
    save.coins = (save.coins || 0) + 30;
    persist();
    SFX.pick?.();
    SFX.coins?.();
    puff('🫐', hero.pos.clone().setY(hero.pos.y + 1.2), { size: 1.3, rise: 1.5, life: 1.0 });
    puff('🍓', hero.pos.clone().setY(hero.pos.y + 1.2), { size: 1.3, rise: 1.5, life: 1.0 });
    toast('🫐 Собрана полная корзинка спелой малины и смородины! +30 🪙<small>следующий урожай через 3 минуты</small>');
    return;
  }

  // 9. Садовые качели
  if (act === 'swing') {
    startSwingRide(hero);
    SFX.boing?.();
    toast('🛝 Качаемся на уютных садовых качелях... Релакс! 🍃<small>нажми прыжок или 🚶, чтобы спрыгнуть</small>');
    return;
  }

  // 10. Собачья будка Дружка
  if (act === 'dog') {
    const cd = 30000;
    const left = cd - (now - (d.dogTime || 0));
    if (left > 0) {
      toast('🐶 Дружок сыт и сладко спит в будке... zzz... 🐾');
      return;
    }
    d.dogTime = now;
    save.coins = (save.coins || 0) + 10;
    persist();
    SFX.levelUp?.();
    puff('🐶', new T.Vector3(-44.5, 1.1, 198), { size: 1.4, rise: 1.5, life: 1.2 });
    puff('❤️', new T.Vector3(-44.5, 1.5, 198), { size: 1.2, rise: 1.6, life: 1.2 });
    toast('🐶 Дружок радостно завилял хвостом и встретил тебя лаем! +10 🪙❤️');
    return;
  }

  // 11. Яблоня
  if (act === 'apple') {
    const cd = 45000;
    const left = cd - (now - (d.appleTime || 0));
    if (left > 0) {
      toast(`🍎 Новые яблочки ещё зреют на ветках... Подожди ${Math.ceil(left / 1000)} сек! 🍏`);
      return;
    }
    d.appleTime = now;
    save.coins = (save.coins || 0) + 12;
    persist();
    SFX.crunch?.();
    SFX.coins?.();
    puff('🍎', hero.pos.clone().setY(hero.pos.y + 1.2), { size: 1.3, rise: 1.4, life: 1.0 });
    toast('🍎 С ветки упало сладкое спелое яблоко! Хрум! +12 🪙');
    return;
  }
}

// раз в кадр: анимация дыма, костра, самовара, качелей, посадки и анимаций
export function updateDacha(dt, hero, save) {
  if (!st) return;

  const d = dachaSave(save);
  const now = Date.now();
  const t = performance.now() / 1000;

  // 1. Отображение созревших томатов в теплице
  const ghRipe = !d.ghTime || now >= d.ghTime;
  if (st.ghTomatoes && st.ghTomatoes.length) {
    for (const m of st.ghTomatoes) m.visible = ghRipe;
  }
  if (st.ghLabel) {
    st.ghLabel.userData.set(ghRipe ? '🍅 Теплица (Спело! 🧺)' : '🌱 Теплица (Растёт ⏳)', { color: ghRipe ? '#ff4d4d' : '#7bed9f' });
  }

  // 2. Отображение ягод на кустах
  const berryRipe = !d.berryTime || (now - d.berryTime >= BERRY_COOLDOWN);
  if (st.berryMeshes && st.berryMeshes.length) {
    for (const m of st.berryMeshes) m.visible = berryRipe;
  }
  if (st.berryLabel) {
    st.berryLabel.userData.set(berryRipe ? '🫐 Ягоды (Спелые! 🧺)' : '🌿 Кусты (Зреют ⏳)', { color: berryRipe ? '#c77dff' : '#a8b5a0' });
  }

  // 3. Качели: плавное покачивание на ветру, когда свободны (а при катании раскачиваются с героем)
  if (st.swingBench && (!hero.climb || !hero.climb.seat || Math.hypot(hero.pos.x - 13, hero.pos.z - 186.5) > 3)) {
    st.swingBench.rotation.x = Math.sin(t * 1.2) * 0.05;
  }

  // Авто-посадка на качели, если персонаж встал на сиденье
  if (hero.grounded && !hero.climb && Math.abs(hero.pos.x - 13) < 0.9 && Math.abs(hero.pos.z - 186.5) < 0.8 && hero.pos.y < 1.4) {
    if ((st.swingCool = (st.swingCool || 0) + dt) > 0.4) {
      st.swingCool = 0;
      startSwingRide(hero);
    }
  } else {
    st.swingCool = 0;
  }

  // 4. Авто-посадка на скамейки в беседке или пеньки у костра при остановке на них
  if (hero.grounded && hero.speed < 0.3 && !hero.climb) {
    const nearBench = GAZEBO_BENCHES.find(b =>
      Math.abs(hero.pos.x - b.x) < 0.9 && Math.abs(hero.pos.z - b.z) < 0.9 && hero.pos.y >= 0.1 && hero.pos.y <= 1.0
    );
    const nearStump = CAMP_STUMPS.find(s =>
      Math.hypot(hero.pos.x - s.x, hero.pos.z - s.z) < 0.85 && hero.pos.y >= 0.1 && hero.pos.y <= 1.2
    );

    if (nearBench) {
      if ((st.sitWait = (st.sitWait || 0) + dt) > 0.45) {
        st.sitWait = 0;
        sitGazebo(hero);
        puff('😌', hero.pos.clone().setY(hero.pos.y + 2.5), { size: 0.8, rise: 0.8, life: 1.0 });
      }
    } else if (nearStump) {
      if ((st.sitWait = (st.sitWait || 0) + dt) > 0.45) {
        st.sitWait = 0;
        sitCampfire(hero);
        puff('😌', hero.pos.clone().setY(hero.pos.y + 2.5), { size: 0.8, rise: 0.8, life: 1.0 });
      }
    } else {
      st.sitWait = 0;
    }
  } else {
    st.sitWait = 0;
  }

  // 5. Анимации чаепития и жарки маршмеллоу
  if (hero.dachaAnim) {
    ensureProps(hero);
    if (hero.dachaAnim === 'tea') {
      if (hero.model.teaCup) hero.model.teaCup.visible = true;
      if (hero.model.marshStick) hero.model.marshStick.visible = false;
      hero.dachaK = (hero.dachaK || 0) + dt / 3.8;
      if (Math.random() < dt * 3) {
        puff('♨️', hero.pos.clone().add(new T.Vector3(0, 1.8, 0.2)), { size: 0.6, rise: 1.0, life: 0.8 });
      }
      if (hero.dachaK >= 1) {
        hero.dachaAnim = null;
        if (hero.model.teaCup) hero.model.teaCup.visible = false;
      }
    } else if (hero.dachaAnim === 'marsh') {
      if (hero.model.marshStick) hero.model.marshStick.visible = true;
      if (hero.model.teaCup) hero.model.teaCup.visible = false;
      hero.dachaK = (hero.dachaK || 0) + dt / 4.2;
      // Подрумянивание маршмеллоу: белый -> золотистый
      if (hero.model.marshMesh) {
        hero.model.marshMesh.material.color.setHex(hero.dachaK < 0.6 ? 0xfff0ea : 0xd48b3b);
      }
      // Искры от зефира над костром
      if (hero.dachaK < 0.72 && Math.random() < dt * 5) {
        puff('✨', hero.pos.clone().add(new T.Vector3(Math.sin(hero.face) * 1.3, 1.0, Math.cos(hero.face) * 1.3)), { size: 0.4, rise: 0.8, life: 0.6 });
      }
      if (hero.dachaK >= 0.72 && !hero.marshEaten) {
        hero.marshEaten = true;
        puff('🍡', hero.pos.clone().setY(hero.pos.y + 2.2), { size: 0.8, rise: 1.0, life: 0.9 });
        puff('😋', hero.pos.clone().setY(hero.pos.y + 2.6), { size: 0.9, rise: 1.2, life: 1.0 });
      }
      if (hero.dachaK >= 1) {
        hero.dachaAnim = null;
        hero.marshEaten = false;
        if (hero.model.marshStick) hero.model.marshStick.visible = false;
      }
    }
  } else {
    if (hero.model?.teaCup) hero.model.teaCup.visible = false;
    if (hero.model?.marshStick) hero.model.marshStick.visible = false;
  }

  // 6. Пар из самовара в беседке
  if ((st.samovarT = (st.samovarT ?? 0) - dt) <= 0) {
    st.samovarT = 2.2;
    if (Math.hypot(hero.pos.x - 22, hero.pos.z - 191) < 40) {
      puff('♨️', new T.Vector3(22, 1.8, 191), { size: 0.8, rise: 1.2, life: 1.4, dx: 0.15 });
    }
  }

  // 7. Рыбка в ручье
  if (st.stream && (st.fishT = (st.fishT ?? 3) - dt) <= 0) {
    st.fishT = 2.5 + Math.random() * 4;
    const q = st.stream[Math.floor(Math.random() * st.stream.length)];
    if (Math.hypot(hero.pos.x - q.x, hero.pos.z - q.z) < 30) {
      puff('🐟', new T.Vector3(q.x, 0.4, q.z), { size: 0.8, rise: 1.6, life: 0.7, dx: 0.8 });
      puff('💦', new T.Vector3(q.x, 0.3, q.z), { size: 0.6, rise: 0.8, life: 0.5 });
    }
  }

  // 8. Дымок из трубы домика
  if ((st.smokeT -= dt) <= 0 && Math.hypot(hero.pos.x - st.chimney.x, hero.pos.z - st.chimney.z) < 70) {
    st.smokeT = 0.5;
    puff('💨', st.chimney.clone().add(new T.Vector3((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4)), { size: 1.1, rise: 1.2, life: 2.2, dx: 0.3 });
  }

  // 9. Искры, дым и живой свет от костра
  if (st.campLight) {
    const nightK = getNightK();
    const t = performance.now() / 1000;
    const flk = 0.84 + Math.sin(t * 11) * 0.10 + Math.sin(t * 22.7) * 0.06;
    st.campLight.intensity = (0.35 + 0.45 * nightK) * flk;
    if (st.campGlow?.material) {
      st.campGlow.material.opacity = (0.12 + 0.15 * nightK) * flk;
    }
  }
  if (st.gazeboLight) {
    const nightK = getNightK();
    st.gazeboLight.intensity = nightK * 0.38;
  }
  if (st.porchLight) {
    const nightK = getNightK();
    st.porchLight.intensity = nightK * 0.35;
  }
  if (st.houseLight) {
    const nightK = getNightK();
    st.houseLight.intensity = nightK * 0.35;
  }
  if (st.campfire && (st.campT = (st.campT ?? 0) - dt) <= 0) {
    if (Math.hypot(hero.pos.x - st.campfire.x, hero.pos.z - st.campfire.z) < 50) {
      st.campT = 0.35;
      puff('✨', st.campfire.clone().add(new T.Vector3((Math.random() - 0.5) * 0.4, 0.35, (Math.random() - 0.5) * 0.4)), { size: 0.5, rise: 1.2, life: 1.1, dx: 0.2 });
      if (Math.random() < 0.4) puff('🔥', st.campfire.clone().add(new T.Vector3((Math.random() - 0.5) * 0.3, 0.25, (Math.random() - 0.5) * 0.3)), { size: 0.7, rise: 1.0, life: 0.8, dx: 0.1 });
      if (Math.random() < 0.3) puff('💨', st.campfire.clone().add(new T.Vector3(0, 0.6, 0)), { size: 0.8, rise: 1.3, life: 1.5, dx: 0.25 });
    }
  }
}

// Сон на даче в уютной кровати с пропуском ночи
export function dachaSleep(hero, save, { toast, confetti, SFX, persist, MOTYA }) {
  if (!hero) return;
  hero.pos.set(DACHA_BED.x, DACHA_BED.y + 0.15, DACHA_BED.z);
  hero.vel.set(0, 0, 0);
  hero.face = Math.PI;
  if (hero.model?.root) hero.model.root.rotation.y = Math.PI;
  hero.sleeping = true;
  hero.sleep = true;
  hero.climb = {
    seat: true,
    sleep: true,
    dur: 1e9,
    t: 0.1,
    ride: () => new T.Vector3(DACHA_BED.x, DACHA_BED.y + 0.15, DACHA_BED.z),
    face: Math.PI,
  };

  SFX.yawn?.();
  toast('😴 Спокойной ночи! Засыпаем...<small>нажми 🚶 или прыжок/джойстик, чтобы встать</small>');

  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      if (hero.sleeping || hero.climb?.sleep) {
        puff('💤', new T.Vector3(DACHA_BED.x + (Math.random() - 0.5) * 0.4, DACHA_BED.y + 1.2 + i * 0.3, DACHA_BED.z + 0.6), { size: 1.1 + i * 0.2, rise: 1.2, life: 1.8 });
      }
    }, i * 380);
  }

  runSleepScreen(() => {
    if (!hero.sleeping && !hero.climb?.sleep) return;
    hero.sleeping = false;
    hero.sleep = false;
    hero.climb = null;
    hero.pos.set(DACHA_BED.x + 1.2, 0.45, DACHA_BED.z);
    hero.vel.set(0, 0, 0);

    save.coins = (save.coins || 0) + 50;
    persist();
    SFX.fanfare?.();
    SFX.coins?.();
    confetti(hero.pos.clone().setY(hero.pos.y + 1.8), 40);
    toast('☀️ С добрым утром! Вы отлично выспались и полны сил! +50 🪙<small>наступил ясный солнечный день 🌅</small>');
  });
}

// Встать с кровати на даче
export function dachaWakeup(hero, { toast, SFX } = {}) {
  if (!hero) return;
  hero.sleeping = false;
  hero.sleep = false;
  hero.climb = null;
  hero.pos.set(DACHA_BED.x + 1.2, 0.45, DACHA_BED.z);
  hero.vel.set(0, 0, 0);
  dismissSleepScreen();
  if (toast) toast('🚶 Встал с кровати');
}
