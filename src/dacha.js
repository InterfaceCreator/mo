// Дача 🏡: из аквапарка — калитка в южной стене, за ней длинная деревенская дорога
// (берёзы и яблони, полевые цветы, ручеёк с мостиком, скамейка, указатель), а в конце — участок:
// забор-штакетник, бревенчатый домик с крылечком и дымком из трубы, колодец, яблони, будка, пугало и грядки
// (пока пустые — на них потом будем сажать). Всё неподвижное — склеивается в общие меши (почти не грузит).
import { T, group, box, mat } from './engine.js';
import { solid, tree, addCollider, onLevelReset } from './world.js';
import { water } from './terrain.js';
import { makeLabel, puff } from './fx.js';
import { buildHero, compactHero, PEOPLE } from './hero.js';
import { scene } from './engine.js';
import { BANYA } from './spa.js';

export const DACHA_GATE = { x: -38, z: 107, w: 6 };
export const DACHA = { x0: -48, x1: -12, z0: 182, z1: 208, house: { x: -36, z: 198 }, well: { x: -22, z: 188 }, beds: [194, 197.5, 201].map(z => ({ x: -21, z })) };
const GROUND = { x0: -66, x1: 10, z0: 105, z1: 213 };
const ROAD = [[-38, 106], [-37.5, 116], [-34, 128], [-27, 140], [-25, 151], [-28, 164], [-30, 175], [-30, 183]];
const STREAM_Z = 146;

let st = null;
onLevelReset(() => { st = null; });
// случайные числа с «зерном»: деревья и цветы каждый раз на тех же местах
function seeded(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

export function buildDacha(w) {
  const R = seeded(4242), G = GROUND, mid = (a, b) => (a + b) / 2;
  st = { smokeT: 0 };
  // земля, живая изгородь по краям (дальше — лес)
  solid(w, G.x1 - G.x0, 1, G.z1 - G.z0, 0x6fd04a, mid(G.x0, G.x1), -1, mid(G.z0, G.z1));
  for (const [x0, x1, z0, z1] of [[G.x0, G.x0 + 1.4, G.z0, G.z1], [G.x1 - 1.4, G.x1, G.z0 + 3, G.z1], [G.x0, G.x1, G.z1 - 1.4, G.z1], [G.x0, -47, G.z0, G.z0 + 3]])
    solid(w, x1 - x0, 2.4, z1 - z0, 0x3f9e3a, mid(x0, x1), 0, mid(z0, z1), { cam: true });
  for (let i = 0; i < 26; i++) {                                         // лес за изгородью
    const side = i % 3, t = R();
    const [x, z] = side === 0 ? [G.x0 - 3 - R() * 6, G.z0 + 6 + t * (G.z1 - G.z0)] : side === 1 ? [G.x1 + 3 + R() * 6, G.z0 + 6 + t * (G.z1 - G.z0)] : [G.x0 + t * (G.x1 - G.x0), G.z1 + 3 + R() * 6];
    tree(w, x, z, 1 + R() * 0.4, 0, R() < 0.5 ? 'pine' : 'oak');
  }

  // дорога: плавная грунтовка
  const curve = new T.CatmullRomCurve3(ROAD.map(([x, z]) => new T.Vector3(x, 0, z))), L = curve.getLength(), n = Math.ceil(L / 1.2);
  const P = curve.getSpacedPoints(n), road = [];
  // дорога — одна гладкая лента (без брусков, которые на поворотах налезают друг на друга углами)
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
  // обочина чуть темнее — аккуратный край
  for (const sd of [-1, 1]) {
    const ep = [], en = [], eu = [], ei = [];
    road.forEach((q, i) => { const o1 = RW * sd, o2 = (RW + 0.35) * sd; ep.push(q.x + q.rx * o1, 0.045, q.z + q.rz * o1, q.x + q.rx * o2, 0.045, q.z + q.rz * o2); en.push(0, 1, 0, 0, 1, 0); eu.push(0, 0, 1, 0); if (i < n) { const k = i * 2; ei.push(...(sd > 0 ? [k, k + 2, k + 1, k + 1, k + 2, k + 3] : [k, k + 1, k + 2, k + 1, k + 3, k + 2])); } });
    const eg = new T.BufferGeometry(); eg.setAttribute('position', new T.Float32BufferAttribute(ep, 3)); eg.setAttribute('normal', new T.Float32BufferAttribute(en, 3)); eg.setAttribute('uv', new T.Float32BufferAttribute(eu, 2)); eg.setIndex(ei);
    const em = new T.Mesh(eg, mat(0xbfa070)); em.receiveShadow = true; w.add(em);
  }
  st.road = road;
  // ручеёк поперёк и мостик на дороге
  // ручей: извилистая лента воды (рябь бежит — как в Лесу), тёмные берега, камни и камыши
  const bz = STREAM_Z, zs = x => bz + 2.4 * Math.sin(x * 0.11 + 0.8);
  const br = road.reduce((p, q) => Math.abs(q.z - zs(q.x)) < Math.abs(p.z - zs(p.x)) ? q : p);
  st.stream = [];
  {
    const SW = 1.5, wp = [], wi = [], wu = [], bank = [[], []];
    const xs = []; for (let x = G.x0 + 1.4; x <= G.x1 - 1.4; x += 1) xs.push(x);
    xs.forEach((x, i) => {
      const z = zs(x), dz = 2.4 * 0.11 * Math.cos(x * 0.11 + 0.8), l = Math.hypot(1, dz), nx = -dz / l, nz = 1 / l;
      wp.push(x + nx * SW, 0.06, z + nz * SW, x - nx * SW, 0.06, z - nz * SW); wu.push(0, i / 4, 1, i / 4);
      if (i < xs.length - 1) { const k = i * 2; wi.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }   // лицом вверх
      for (const [sd, B] of [[1, bank[0]], [-1, bank[1]]]) B.push(x + nx * sd * SW, 0.05, z + nz * sd * SW, x + nx * sd * (SW + 0.8), 0.05, z + nz * sd * (SW + 0.8));
      st.stream.push({ x, z });
    });
    const wm = water(w, 4, 0.06, 0x3fb0ff), wg = new T.BufferGeometry();   // берём материал с бегущей рябью, сама плоскость не нужна
    w.remove(wm);
    wg.setAttribute('position', new T.Float32BufferAttribute(wp, 3)); wg.setAttribute('uv', new T.Float32BufferAttribute(wu, 2)); wg.setIndex(wi); wg.computeVertexNormals();
    const stream = new T.Mesh(wg, wm.material); stream.receiveShadow = true; stream.userData.dynamic = true; w.add(stream);
    bank.forEach((B, b) => {
      const bi = [], bn = [], bu = []; for (let i = 0; i < xs.length; i++) { bn.push(0, 1, 0, 0, 1, 0); bu.push(0, 0, 1, 0); if (i < xs.length - 1) { const k = i * 2; bi.push(...(b ? [k, k + 2, k + 1, k + 1, k + 2, k + 3] : [k, k + 1, k + 2, k + 1, k + 3, k + 2])); } }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(B, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(bn, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(bu, 2)); g.setIndex(bi);
      const m = new T.Mesh(g, mat(0x5a7a32)); m.receiveShadow = true; w.add(m);
    });
    // камни по берегам и в воде, камыши
    for (let i = 0; i < 46; i++) {
      const x = G.x0 + 3 + R() * (G.x1 - G.x0 - 6); if (Math.abs(x - br.x) < 4 || Math.abs(x - BANYA.x) < 2) continue;
      const side = R() < 0.5 ? -1 : 1, z = zs(x) + side * (1.3 + R() * 1.2), sz = 0.35 + R() * 0.5;
      if (R() < 0.6) { const st0 = box(w, sz * 1.3, sz * 0.7, sz, [0x9aa4ad, 0x8a8f9a, 0xb0b4bc][Math.floor(R() * 3)], x, sz * 0.3, z); st0.rotation.y = R() * 3; }
      else for (let k = 0; k < 4; k++) { const rx = x + (R() - 0.5) * 0.8, rz = z + (R() - 0.5) * 0.6, h = 1 + R() * 0.8; box(w, 0.08, h, 0.08, 0x3f8a2e, rx, h / 2, rz, { shadow: false, studs: false }); if (k % 2 === 0) box(w, 0.14, 0.4, 0.14, 0x7a4a24, rx, h + 0.15, rz, { shadow: false, studs: false }); }
    }
    for (let i = 0; i < 6; i++) { const x = G.x0 + 8 + i * 12 + R() * 4; if (Math.abs(x - br.x) < 4) continue; box(w, 0.6, 0.18, 0.5, 0x8a8f9a, x, 0.08, zs(x) + (R() - 0.5) * 1.2); }   // камушки в воде
  }
  const bridge = group(w, br.x, 0, br.z); bridge.rotation.y = Math.atan2(-br.rz, br.rx);          // доски — поперёк, сам мост — вдоль дороги
  for (let i = 0; i < 9; i++) box(bridge, 3.6, 0.18, 0.5, i % 2 ? 0x9c6a3c : 0x8a5a2b, 0, 0.22 + Math.sin(i / 8 * Math.PI) * 0.25, -2 + i * 0.5);
  for (const sx of [-1, 1]) { for (const zz of [-2, 0, 2]) box(bridge, 0.18, 1.1, 0.18, 0x6a3f1e, sx * 1.75, 0.75 + (zz ? 0 : 0.25), zz); box(bridge, 0.14, 0.14, 4.4, 0x8a5a2b, sx * 1.75, 1.3 + 0.1, 0); }
  // деревья вдоль дороги: берёзы и яблони по обе стороны
  for (let i = 4; i < road.length - 6; i += 5) {
    const q = road[i]; if (Math.abs(q.z - zs(q.x)) < 5) continue;
    for (const sd of [-1, 1]) {
      const off = 5 + R() * 1.5;
      tree(w, q.x + q.rx * off * sd, q.z + q.rz * off * sd, 0.85 + R() * 0.3, 0, (i / 5 + (sd > 0 ? 1 : 0)) % 2 ? 'birch' : 'apple');
    }
  }
  // дальше от дороги — роща (не ближе 9 м к дороге)
  for (let k = 0, placed = 0; k < 200 && placed < 34; k++) {
    const x = G.x0 + 4 + R() * (G.x1 - G.x0 - 8), z = G.z0 + 6 + R() * (DACHA.z0 - G.z0 - 10);
    if (x > BANYA.x - 9 && x < BANYA.x + 16 && Math.abs(z - BANYA.z) < 9) continue;   // место под баню и джакузи          // место под баню
    if (Math.abs(z - zs(x)) < 5 || road.some(q => Math.hypot(q.x - x, q.z - z) < 9)) continue;
    tree(w, x, z, 0.8 + R() * 0.5, 0, ['birch', 'oak', 'pine', 'birch'][Math.floor(R() * 4)]); placed++;
  }
  // полевые цветы у обочин
  for (let i = 0; i < road.length; i += 1) {
    if (R() < 0.45) continue; const q = road[i], sd = R() < 0.5 ? -1 : 1, off = 2.2 + R() * 1.6;
    const x = q.x + q.rx * off * sd, z = q.z + q.rz * off * sd;
    box(w, 0.08, 0.4, 0.08, 0x3fae3a, x, 0.2, z, { shadow: false, studs: false });
    box(w, 0.28, 0.2, 0.28, [0xff5a8a, 0xffd23f, 0xffffff, 0x9b6bff, 0xff7b22][Math.floor(R() * 5)], x, 0.45, z, { shadow: false, studs: false });
  }
  // деревянный заборчик вдоль части дороги
  for (let i = 6; i < 30; i++) { const q = road[i]; box(w, 0.18, 1, 0.18, 0x8a5a2b, q.x - q.rx * 2.6, 0.5, q.z - q.rz * 2.6); if (i % 2) { const m = box(w, 0.1, 0.12, 1.3, 0x9c6a3c, q.x - q.rx * 2.6, 0.75, q.z - q.rz * 2.6); m.rotation.y = Math.atan2(q.rz, -q.rx) + Math.PI / 2; } }
  // скамейка и указатель на середине пути
  const mq = road[Math.floor(road.length * 0.45)], bx = mq.x + mq.rx * 3, bzz = mq.z + mq.rz * 3;
  const bench = group(w, bx, 0, bzz); bench.rotation.y = Math.atan2(mq.rx, mq.rz);
  box(bench, 2.4, 0.14, 0.7, 0x9c6a3c, 0, 0.6, 0); box(bench, 2.4, 0.6, 0.12, 0x9c6a3c, 0, 1, -0.32); for (const sx of [-1, 1]) box(bench, 0.14, 0.6, 0.6, 0x6a3f1e, sx * 1, 0.3, 0);
  const sq = road[Math.floor(road.length * 0.55)], sx0 = sq.x - sq.rx * 3, sz0 = sq.z - sq.rz * 3;
  box(w, 0.25, 2.6, 0.25, 0x6a3f1e, sx0, 1.3, sz0);
  const sign = makeLabel(4.4, 1.1); sign.position.set(sx0, 3.2, sz0); scene.add(sign); sign.userData.set('🏡 Дача — уже близко!', { color: '#ffe14d' });
  // стога сена в поле
  for (const [x, z] of [[-55, 125], [-6, 133], [-52, 160], [2, 168]]) { box(w, 3, 2, 3, 0xe8c45a, x, 1, z); box(w, 2, 0.8, 2, 0xf2d27a, x, 2.4, z); }

  // ---------- участок ----------
  const D = DACHA, gx = -30;
  box(w, D.x1 - D.x0, 0.03, D.z1 - D.z0, 0x7fd65a, mid(D.x0, D.x1), 0.02, mid(D.z0, D.z1), { shadow: false });
  // штакетник по периметру, калитка с дороги
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
  for (const sx of [-1, 1]) box(w, 0.3, 2.8, 0.3, 0x8a5a2b, gx + sx * 2.3, 1.4, D.z0);
  box(w, 5, 0.3, 0.3, 0x8a5a2b, gx, 2.85, D.z0);
  const gs = makeLabel(4.4, 1.1, { face: Math.PI }); gs.position.set(gx, 3.6, D.z0 - 0.2); scene.add(gs); gs.userData.set('🏡 Дача', { color: '#ffe14d' });
  box(w, 0.15, 1.2, 0.15, 0x6a3f1e, gx + 3.4, 0.6, D.z0 - 0.6); box(w, 0.7, 0.5, 0.5, 0x3a6ad8, gx + 3.4, 1.4, D.z0 - 0.6);   // почтовый ящик
  // тропинка от калитки к крыльцу
  for (let z = D.z0 + 0.5; z < D.house.z - 4.2; z += 1.1) box(w, 1.1, 0.06, 0.8, 0xb9b9c8, gx - (z - D.z0) * 0.4 + (z % 2.2 > 1.1 ? 0.3 : -0.3), 0.05, z, { shadow: false });

  // бревенчатый домик: стены из брёвен, окна с наличниками и ставнями, двускатная крыша, труба, крыльцо
  const H0 = D.house, hw = 4.5, hd = 3.5, HX0 = H0.x - hw, HX1 = H0.x + hw, HZ0 = H0.z - hd, HZ1 = H0.z + hd, WH = 3.2;
  solid(w, hw * 2, WH, hd * 2, 0x8a5a2b, H0.x, 0, H0.z).visible = false;
  for (let i = 0; i < 8; i++) {
    const y = 0.2 + i * 0.4, c = i % 2 ? 0x9c6a3c : 0x8a5a2b;
    box(w, hw * 2 + 0.5, 0.42, 0.42, c, H0.x, y, HZ0); box(w, hw * 2 + 0.5, 0.42, 0.42, c, H0.x, y, HZ1);
    box(w, 0.42, 0.42, hd * 2 + 0.5, c, HX0, y, H0.z); box(w, 0.42, 0.42, hd * 2 + 0.5, c, HX1, y, H0.z);
  }
  const win = (x, z, rotY) => {
    const g = group(w, x, 1.8, z); g.rotation.y = rotY;
    box(g, 1.5, 1.4, 0.1, 0xffffff, 0, 0, 0.25); box(g, 1.2, 1.1, 0.12, 0x9fdcff, 0, 0, 0.27); box(g, 0.08, 1.1, 0.14, 0xffffff, 0, 0, 0.29); box(g, 1.2, 0.08, 0.14, 0xffffff, 0, 0, 0.29);
    box(g, 1.8, 0.3, 0.12, 0xffffff, 0, 0.85, 0.27); box(g, 1.5, 0.12, 0.3, 0xffffff, 0, -0.75, 0.3);   // резной наличник и подоконник
    for (const sx of [-1, 1]) box(g, 0.55, 1.3, 0.1, 0x4a9a4a, sx * 1.05, 0, 0.27);                      // ставни
  };
  win(H0.x - 2.5, HZ0, Math.PI); win(H0.x + 2.5, HZ0, Math.PI); win(HX0, H0.z, -Math.PI / 2); win(HX1, H0.z, Math.PI / 2); win(H0.x, HZ1, 0);
  box(w, 1.4, 2.3, 0.12, 0x6a3f1e, H0.x, 1.15, HZ0 - 0.25); box(w, 0.15, 0.15, 0.1, 0xffd23f, H0.x + 0.45, 1.15, HZ0 - 0.33);   // дверь и ручка
  box(w, 3, 0.3, 1.4, 0x9c6a3c, H0.x, 0.15, HZ0 - 0.9); box(w, 3, 0.3, 0.7, 0x8a5a2b, H0.x, 0.45, HZ0 - 0.55);                   // крыльцо
  for (const sx of [-1, 1]) box(w, 0.2, 2.6, 0.2, 0x6a3f1e, H0.x + sx * 1.4, 1.6, HZ0 - 1.4);
  box(w, 3.4, 0.2, 1.8, 0xb8462a, H0.x, 2.95, HZ0 - 0.85);                                                                        // козырёк
  for (const sx of [-1, 1]) { const r = box(w, hw * 2 + 1.2, 0.3, hd + 1.4, 0xc0392b, H0.x, WH + 1.25, H0.z + sx * (hd + 1.4) / 2 * 0.82); r.rotation.x = sx * 0.62; }
  for (const x of [HX0, HX1]) for (let i = 0; i < 6; i++) box(w, 0.36, 0.4, hd * 2 - i * 1.12, i % 2 ? 0x9c6a3c : 0x8a5a2b, x, WH + 0.2 + i * 0.4, H0.z);   // фронтоны — на торцах (конёк вдоль домика)
  box(w, 0.9, 2.4, 0.9, 0xb0503a, H0.x + 2.4, WH + 1.9, H0.z + 1.2); box(w, 1.1, 0.25, 1.1, 0x8a3a2a, H0.x + 2.4, WH + 3.15, H0.z + 1.2);
  st.chimney = new T.Vector3(H0.x + 2.4, WH + 3.5, H0.z + 1.2);
  const hl = makeLabel(5, 1.25); hl.position.set(H0.x, WH + 4.6, H0.z); scene.add(hl); hl.userData.set('🏡 Домик в деревне', { color: '#ffffff' });

  // колодец с журавлём-воротом
  const Wl = D.well;
  for (const [dx, dz, ww, dd] of [[0, -0.8, 2, 0.4], [0, 0.8, 2, 0.4], [-0.8, 0, 0.4, 1.2], [0.8, 0, 0.4, 1.2]]) box(w, ww, 1, dd, 0x9aa4ad, Wl.x + dx, 0.5, Wl.z + dz);
  solid(w, 2, 1, 2, 0x9aa4ad, Wl.x, 0, Wl.z).visible = false;
  box(w, 1.2, 0.05, 1.2, 0x2a5ad8, Wl.x, 0.85, Wl.z, { shadow: false });
  for (const sx of [-1, 1]) box(w, 0.2, 2.6, 0.2, 0x6a3f1e, Wl.x + sx * 1, 1.3, Wl.z);
  box(w, 2.4, 0.15, 0.15, 0x6a3f1e, Wl.x, 2.2, Wl.z);                                      // ворот (ведро на верёвке — живое, garden.js)
  for (const sx of [-1, 1]) { const r = box(w, 2.6, 0.12, 1.4, 0xc0392b, Wl.x, 2.8, Wl.z + sx * 0.5); r.rotation.x = sx * 0.5; }
  // грядки (пока пустые — посадка будет потом)
  for (const B of D.beds) {
    box(w, 8, 0.25, 2, 0x5a3a1e, B.x, 0.12, B.z, { studs: true });
    for (const sz of [-1, 1]) box(w, 8.2, 0.3, 0.15, 0xc8a87a, B.x, 0.15, B.z + sz * 1.05, { shadow: false });
    for (const sx of [-1, 1]) box(w, 0.15, 0.3, 2.2, 0xc8a87a, B.x + sx * 4.05, 0.15, B.z, { shadow: false });
  }
  // табличка на колышке у края грядок (плоская — не закрывает обзор)
  box(w, 0.15, 1.3, 0.15, 0x8a5a2b, D.beds[0].x - 5, 0.65, D.beds[0].z - 1.3); box(w, 1.9, 0.6, 0.08, 0xc8a87a, D.beds[0].x - 5, 1.35, D.beds[0].z - 1.3);
  const bl = makeLabel(1.8, 0.45, { face: Math.PI }); bl.position.set(D.beds[0].x - 5, 1.35, D.beds[0].z - 1.36); scene.add(bl); bl.userData.set('🌱 Грядки', { color: '#c8ffb0' });
  // пугало у грядок (руки в стороны)
  const sg = group(w, -15.5, 0, 197.5); sg.rotation.y = -Math.PI / 2;
  const sc = buildHero(sg, PEOPLE.scarecrow); sc.armL.rotation.z = -1.45; sc.armR.rotation.z = 1.45; compactHero(sc);
  box(w, 0.2, 1.4, 0.2, 0x8a5a2b, -15.5, 0.7, 197.5);
  // яблони, будка, дрова, скамейка у дома
  for (const [x, z] of [[-44.5, 186], [-44, 205.5], [-15.5, 186.5], [-26, 205.5]]) tree(w, x, z, 0.8, 0, 'apple');
  box(w, 1.6, 1.2, 1.8, 0x9c6a3c, -44.5, 0.6, 198); const dr = box(w, 1.9, 0.2, 2.1, 0xc0392b, -44.5, 1.35, 198); dr.rotation.z = 0.1; box(w, 0.1, 0.7, 0.6, 0x2b2b2b, -43.65, 0.45, 198, { shadow: false });   // будка
  solid(w, 1.8, 1.3, 2, 0x9c6a3c, -44.5, 0, 198).visible = false;
  for (let i = 0; i < 9; i++) { const m = box(w, 0.4, 0.4, 1.6, i % 2 ? 0xb07a4a : 0x9c6a3c, -41.2 + (i % 3) * 0.45, 0.2 + Math.floor(i / 3) * 0.4, 203.5); m.rotation.x = Math.PI / 2; }   // поленница
  box(w, 2.4, 0.14, 0.7, 0x9c6a3c, -30.5, 0.6, 193.2); for (const s2 of [-1, 1]) box(w, 0.14, 0.6, 0.6, 0x6a3f1e, -30.5 + s2, 0.3, 193.2);
  return w;
}

// раз в кадр: дымок из трубы
export function updateDacha(dt, hero) {
  if (!st) return;
  // в ручье иногда выпрыгивает рыбка (если герой рядом)
  if (st.stream && (st.fishT = (st.fishT ?? 3) - dt) <= 0) {
    st.fishT = 2.5 + Math.random() * 4;
    const q = st.stream[Math.floor(Math.random() * st.stream.length)];
    if (Math.hypot(hero.pos.x - q.x, hero.pos.z - q.z) < 30) { puff('🐟', new T.Vector3(q.x, 0.4, q.z), { size: 0.8, rise: 1.6, life: 0.7, dx: 0.8 }); puff('💦', new T.Vector3(q.x, 0.3, q.z), { size: 0.6, rise: 0.8, life: 0.5 }); }
  }
  if ((st.smokeT -= dt) <= 0 && Math.hypot(hero.pos.x - st.chimney.x, hero.pos.z - st.chimney.z) < 70) {
    st.smokeT = 0.5; puff('💨', st.chimney.clone().add(new T.Vector3((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4)), { size: 1.1, rise: 1.2, life: 2.2, dx: 0.3 });
  }
}
