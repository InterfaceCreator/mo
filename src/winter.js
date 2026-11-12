// Зимняя долина ❄️: портал в западной стене базы. Снег идёт всё время, всё белое, ёлки в снегу.
// Развлечения:
//   ⛄ снеговики — подбеги к сугробу: начнёшь катать ком (он растёт, пока бежишь); прикати к кругу — встанет на место.
//      Три кома — снеговик готов и сам наряжается (морковка, угольки, шапка, шарф). Три снежка в снеговика — развалится.
//   ❄️ снежки — кнопка над прыжком (в руках до 5, сами лепятся снова); мишени на стрельбище, снеговики, второй игрок.
//   🛷 горка — наверху красная площадка: садишься на санки и мчишь вниз.
//   ⛸️ каток — на льду скользко, разгоняйся и катайся.
// Вдвоём (duo.js): снежки летят и попадают во второго игрока, снеговиков лепите вместе (видно у обоих), ком и санки видно у второго.
import { T, scene, group, box, camera, ECO, mat } from './engine.js';
import { level, groundY, solid, portal, clouds, onLevelReset, addCollider } from './world.js';
import { buildTerrain } from './terrain.js';
import { defineNests } from './eggs.js';
import { makeLabel, puff, confetti } from './fx.js';

export const WINTER = {
  size: 160, edge: 70,
  spawn: { x: 0, z: 52 },
  hill: { x: 0, z0: -10, z1: -48, w: 10, h: 10 },          // горка: внизу z0, наверху z1
  rink: { x: 34, z: 8, rx: 13, rz: 9 },                    // каток
  yard: { x: -30, z: 12, spots: [[-37, 6], [-30, 4], [-23, 6]], heaps: [[-38, 22], [-30, 26], [-22, 22], [-44, 14]] },   // двор снеговиков
  range: { line: { x: -34, z: -18 }, targets: [[-42, -34], [-36, -36], [-30, -36], [-24, -34]] },                      // стрельбище
  igloo: { x: -48, z: 42 }, cocoa: { x: 20, z: 40 },
  nests: [[28, -34, 2, 'peng'], [-24, -52, 3, 'peng'], [62, 22, 3, 'bear'], [50, -54, 4, 'bear', 1.3], [-40, -60, 2, 'peng']],
  // забавы из winterfun.js: ледяные головоломки, поющие сосульки, рыбалка, ворота совы, снежная битва, мама-пингвин
  ponds: [{ x: -56, z: -40 }, { x: -56, z: -18 }, { x: -56, z: 4 }],
  simon: { x: 14, z: 22 }, lake: { x: 50, z: -22, r: 11 }, gate: { x: 46, z: 46 }, fort: { x: -20, z: 32 }, mama: { x: -38, z: 28 },
};
const W = WINTER;
const near = (x, z, o, r) => Math.hypot(x - o.x, z - o.z) < r;
const inRink = (x, z, pad = 0) => ((x - W.rink.x) / (W.rink.rx + pad)) ** 2 + ((z - W.rink.z) / (W.rink.rz + pad)) ** 2 < 1;
const onHill = (x, z, pad = 0) => Math.abs(x - W.hill.x) < W.hill.w / 2 + pad && z < W.hill.z0 + pad && z > W.hill.z1 - 8 - pad;
const SNOW = 0xf4f8ff;

// рельеф: снежные холмики, горка на севере, ровные площадки под каток, двор и стрельбище
function height(x, z) {
  if (Math.max(Math.abs(x), Math.abs(z)) > W.edge) return 10;
  const H = W.hill;
  if (onHill(x, z, 4)) {                                    // горка: от низа (z0) вверх к z1, наверху — площадка
    const k = Math.min(1, Math.max(0, (H.z0 - z) / (H.z0 - H.z1)));
    return Math.max(1, Math.round(1 + k * (H.h - 1)));
  }
  if (inRink(x, z, 3) || near(x, z, W.spawn, 14) || near(x, z, W.yard, 18) || near(x, z, { x: -33, z: -27 }, 14) || near(x, z, W.igloo, 8) || near(x, z, W.cocoa, 6)) return 1;
  if (W.ponds.some(o => Math.abs(x - o.x) < 11 && Math.abs(z - o.z) < 11) || near(x, z, W.simon, 9) || near(x, z, W.lake, W.lake.r + 4) || near(x, z, W.gate, 10) || near(x, z, W.fort, 12) || near(x, z, W.mama, 6)) return 1;
  const v = Math.sin(x / 14) + Math.cos(z / 11) + 0.6 * Math.sin((x - z) / 19);
  return Math.max(1, Math.min(3, Math.round(1.4 + v * 0.8)));
}
function color(x, z, h) {
  if (h >= 8 && !onHill(x, z, 4)) return 0xc8d4e2;                                     // скалы по краю — в инее
  if (inRink(x, z) || near(x, z, W.lake, W.lake.r) || W.ponds.some(o => Math.abs(x - o.x) < 7 && Math.abs(z - o.z) < 7)) return 0xa8dcf5;   // лёд: каток, озеро, пруды-головоломки
  if (onHill(x, z, 0)) return 0xe4eefa;                                                // накатанная горка
  const v = (Math.sin(x * 0.29) + Math.cos(z * 0.33)) * 0.5;
  return v > 0.5 ? 0xffffff : v < -0.5 ? 0xe2ecf8 : SNOW;
}

let st = null;
onLevelReset(() => { st = null; ballTargets.length = 0; });
// что ещё можно сбить снежком (winterfun.js): { x, y0, y1, z, r, on(), hit() }
export const ballTargets = [];

export function buildWinter(save) {
  const w = group(scene), rnd = seeded(23);
  buildTerrain(w, { size: W.size, cell: 4, height, color, side: 0xd8e4f2, cliff: 7, grass: 0 });
  st = { snowmen: [], heaps: [], targets: [], balls: [], roll: null, ammo: 5, ammoT: 0, sledCool: 0, flakes: null, save };
  if (!save.winter) save.winter = { sm: [0, 0, 0] };

  // дом: портал на базу, круг, куда сторожа не заходят
  portal(w, { x: W.spawn.x, z: W.spawn.z + 8, to: 'base', color: 0x7fd4ff, label: '🏠 База', rot: Math.PI });
  level.safe = { x: W.spawn.x, z: W.spawn.z + 2, r: 10 };
  const ring = new T.Mesh(new T.RingGeometry(9.4, 10, 48), new T.MeshBasicMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0.6, side: T.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(level.safe.x, groundY(0, W.spawn.z) + 0.06, level.safe.z); w.add(ring);
  label('❄️ Зимняя долина', 0, 44, 5, '#bfe8ff', 7);

  defineNests('winter', W.nests.map(([x, z, r, guard, s]) => ({ x, z, r, guard, s, zone: { kind: 'ring', x, z } })));

  hill(w); rink(w); yard(w, save); range(w); igloo(w); cocoa(w);
  // ёлки в снегу — не на площадках и не у гнёзд
  const busy = [[W.spawn, 15], [W.yard, 20], [{ x: -33, z: -27 }, 15], [W.igloo, 8], [W.cocoa, 7], ...W.nests.map(([x, z]) => [{ x, z }, 7]),
    ...W.ponds.map(o => [o, 12]), [W.simon, 10], [W.lake, W.lake.r + 5], [W.gate, 11], [W.fort, 13], [W.mama, 7]];
  for (let i = 0, n = 0; i < 400 && n < 70; i++) {
    const x = (rnd() - 0.5) * 2 * (W.edge - 5), z = (rnd() - 0.5) * 2 * (W.edge - 5);
    if (inRink(x, z, 5) || onHill(x, z, 5) || busy.some(([o, r]) => near(x, z, o, r))) continue;
    pine(w, x, z, 0.8 + rnd() * 0.6); n++;
  }
  clouds(w, 8);
  snowfall();
  return w;
}
function label(text, x, z, up, colr, wd = 5) { const l = makeLabel(wd, wd / 4); l.position.set(x, groundY(x, z) + up, z); scene.add(l); l.userData.set(text, { color: colr }); return l; }

// ёлка: ствол и три яруса, на каждом — снежная шапка
function pine(p, x, z, s) {
  const y = groundY(x, z);
  solid(p, 0.8 * s, 1.6 * s, 0.8 * s, 0x6a3f1e, x, y, z, { cam: true });
  [[3.4, 1.6], [2.6, 2.8], [1.7, 3.9], [0.8, 4.8]].forEach(([wd, h], i) => {
    box(p, wd * s, 1.1 * s, wd * s, i % 2 ? 0x1f6a3a : 0x2a7a44, x, y + h * s, z);
    box(p, wd * s * 0.86, 0.22 * s, wd * s * 0.86, 0xffffff, x, y + (h + 0.6) * s, z, { shadow: false });
  });
}

// ---------- горка 🛷 ----------
function hill(w) {
  const H = W.hill, topZ = H.z1 - 3, yTop = groundY(H.x, topZ);
  // красная площадка наверху и санки у неё; флажки по краям склона
  box(w, 3, 0.12, 2.4, 0xff4a4a, H.x, yTop + 0.06, topZ, { shadow: false });
  sled(w, H.x + 2.6, yTop, topZ + 0.5, 0.3);
  for (let i = 0; i <= 8; i++) for (const sx of [-1, 1]) {
    const z = H.z0 - (H.z0 - H.z1) * i / 8, x = H.x + sx * (H.w / 2 + 0.6), y = groundY(x, z);
    box(w, 0.12, 1.4, 0.12, 0x6a3f1e, x, y + 0.7, z); box(w, 0.5, 0.35, 0.04, i % 2 ? 0xff4a4a : 0x3fa7ff, x + sx * 0.25, y + 1.25, z, { shadow: false });
  }
  label('🛷 Горка — встань на красное', H.x, topZ, 3.4, '#ffffff', 6);
  label('🛷 Горка ↑', H.x + 6, H.z0 + 2, 2.6, '#ffffff', 4);
  st.sled = { x: H.x, z: topZ, y: yTop };
}
// санки: полозья и сиденье
export function sled(p, x, y, z, rot = 0) {
  const g = group(p, x, y, z); g.rotation.y = rot;
  for (const sx of [-1, 1]) { box(g, 0.1, 0.1, 1.8, 0xb9c2cc, sx * 0.4, 0.05, 0); box(g, 0.1, 0.25, 0.1, 0xb9c2cc, sx * 0.4, 0.2, 0.8); }
  box(g, 1, 0.12, 1.5, 0xd8261a, 0, 0.3, -0.05); box(g, 1, 0.3, 0.12, 0xd8261a, 0, 0.42, -0.75);
  return g;
}

// ---------- каток ⛸️ ----------
function rink(w) {
  const R = W.rink;
  for (let i = 0; i < 36; i++) {                                      // бортик из снежных кубиков по краю
    const a = i / 36 * Math.PI * 2, x = R.x + Math.cos(a) * (R.rx + 0.8), z = R.z + Math.sin(a) * (R.rz + 0.8);
    if (Math.abs(Math.sin(a)) > 0.95 && Math.cos(a) < 0) continue;     // проход с запада
    box(w, 1.2, 0.7, 1.2, i % 2 ? 0xffffff : 0xdfeaf6, x, groundY(x, z) + 0.35, z);
  }
  for (const [x, z] of [[R.x - R.rx - 3, R.z + 4], [R.x - R.rx - 3, R.z - 4]]) { box(w, 0.9, 0.5, 2.4, 0x8a5a2b, x, groundY(x, z) + 0.45, z); }   // лавочки
  label('⛸️ Каток — скользко!', R.x, R.z, 3.2, '#bfe8ff', 5);
}

// ---------- двор снеговиков ⛄ ----------
function yard(w, save) {
  W.yard.spots.forEach(([x, z], i) => {
    const y = groundY(x, z);
    const m = new T.Mesh(new T.RingGeometry(1.5, 1.8, 32), new T.MeshBasicMaterial({ color: 0x3fa7ff, transparent: true, opacity: 0.7, side: T.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.05, z); scene.add(m);
    const g = group(scene, x, y, z); g.userData.dynamic = true;
    st.snowmen.push({ x, z, y, g, ring: m, n: 0, hits: 0, wob: 0 });
    setSnowman(i, save.winter.sm[i] || 0, true);
  });
  for (const [x, z] of W.yard.heaps) {
    const y = groundY(x, z), g = group(w, x, y, z);
    box(g, 2.4, 0.7, 2, 0xffffff, 0, 0.35, 0); box(g, 1.6, 0.5, 1.4, 0xf4f8ff, 0.2, 0.9, -0.1); box(g, 0.8, 0.3, 0.8, 0xffffff, -0.3, 1.25, 0.1);
    st.heaps.push({ x, z, y });
  }
  label('⛄ Двор снеговиков', W.yard.x, W.yard.z + 2, 4, '#ffffff', 6);
  label('подбеги к сугробу — катай ком', W.yard.x, W.yard.z + 10, 2.4, '#e8f4ff', 6);
}
const SIZES = [1.15, 0.85, 0.6];                                  // низ, середина, голова
// поставить снеговику n комов (0…3); 3 — готов и наряжен
export function setSnowman(i, n, quiet) {
  const S = st?.snowmen[i]; if (!S) return;
  S.n = n; S.hits = 0;
  for (const c of [...S.g.children]) S.g.remove(c);
  let y = 0;
  for (let k = 0; k < n; k++) {
    const r = SIZES[k], b = group(S.g, 0, y + r, 0);
    box(b, r * 2, r * 1.8, r * 2, 0xffffff, 0, 0, 0); box(b, r * 1.6, r * 2, r * 1.6, 0xf6faff, 0, 0, 0); box(b, r * 2.2, r * 1.4, r * 1.6, 0xf9fcff, 0, 0, 0);   // «круглый» из кубиков
    y += r * 1.8;
  }
  if (n >= 3) {
    const r = SIZES[2], hy = SIZES[0] * 1.8 + SIZES[1] * 1.8 + r, H = group(S.g, 0, hy, 0), seedC = [0xd8261a, 0x3fa7ff, 0x5fd35f][i];
    for (const sx of [-1, 1]) box(H, 0.14, 0.14, 0.06, 0x1d1d23, sx * 0.2, 0.12, r * 1.05);                   // угольки
    { const c = box(H, 0.14, 0.14, 0.6, 0xff8a1a, 0, 0, r * 1.2); }                                           // морковка
    for (let k = 0; k < 5; k++) box(H, 0.09, 0.09, 0.05, 0x1d1d23, -0.24 + k * 0.12, -0.22 - Math.sin(k / 4 * Math.PI) * 0.08, r * 1.02);   // улыбка
    if (i === 1) { box(H, 1.1, 0.1, 1.1, 0x1d1d23, 0, r + 0.02, 0); box(H, 0.7, 0.6, 0.7, 0x1d1d23, 0, r + 0.35, 0); box(H, 0.72, 0.12, 0.72, 0xd8261a, 0, r + 0.12, 0); }   // цилиндр
    else { box(H, 0.9, 0.35, 0.9, seedC, 0, r + 0.1, 0); box(H, 0.3, 0.3, 0.3, 0xffffff, 0, r + 0.45, 0); }                                 // шапка с помпоном
    box(S.g, SIZES[1] * 2.1, 0.22, SIZES[1] * 2.1, seedC, 0, SIZES[0] * 1.8 + SIZES[1] * 1.8 - 0.05, 0);       // шарф
    box(S.g, 0.22, 0.6, 0.18, seedC, 0.4, SIZES[0] * 1.8 + SIZES[1] * 1.6 - 0.3, SIZES[1] * 0.95);
    for (const sx of [-1, 1]) { const a = box(S.g, 1.3, 0.1, 0.1, 0x6a3f1e, sx * (SIZES[1] + 0.55), SIZES[0] * 1.8 + SIZES[1], 0); a.rotation.z = sx * 0.4; }   // руки-веточки
    if (!quiet) { confetti(new T.Vector3(S.x, S.y + 3, S.z), 70); puff('⛄', new T.Vector3(S.x, S.y + 5, S.z), { size: 2.2, rise: 1.2, life: 2 }); }
  }
  if (st.save?.winter) st.save.winter.sm[i] = n;
}

// ---------- стрельбище 🎯 ----------
function range(w) {
  for (const [x, z] of W.range.targets) {
    const y = groundY(x, z), g = group(scene, x, y, z); g.userData.dynamic = true;
    box(g, 0.2, 1.4, 0.2, 0x6a3f1e, 0, 0.7, 0);
    const face = group(g, 0, 2.1, 0);
    [[1.6, 0xffffff], [1.2, 0xd8261a], [0.8, 0xffffff], [0.4, 0xd8261a]].forEach(([s, c], k) => box(face, s, s, 0.1, c, 0, 0, k * 0.02));
    st.targets.push({ x, z, y: y + 2.1, g, face, t: 0 });
  }
  const L = W.range.line, y = groundY(L.x, L.z);
  box(w, 14, 0.08, 0.4, 0x3fa7ff, L.x, y + 0.04, L.z, { shadow: false });
  label('🎯 Кидай снежки в мишени ❄️', L.x, L.z, 3, '#ffffff', 6);
}
function igloo(w) {
  const { x, z } = W.igloo, y = groundY(x, z);
  for (let k = 0; k < 5; k++) { const r = 3.4 - k * 0.65; solid(w, r * 2, 0.8, r * 2, k % 2 ? 0xf4f8ff : 0xffffff, x, y + k * 0.8, z); }
  box(w, 1.6, 1.6, 1.6, 0x9ad8ff, x, y + 0.8, z + 3.4);
  label('🏠 Иглу', x, z, 5.5, '#ffffff', 3);
}
function cocoa(w) {
  const { x, z } = W.cocoa, y = groundY(x, z);
  solid(w, 3.4, 1.1, 1.4, 0x9a5a2a, x, y, z);
  for (let i = 0; i < 4; i++) box(w, 0.9, 0.25, 2.2, i % 2 ? 0xffffff : 0xd8261a, x - 1.35 + i * 0.9, y + 2.6, z, { studs: false });
  for (const sx of [-1, 1]) box(w, 0.16, 2.4, 0.16, 0xffffff, x + sx * 1.5, y + 1.2, z - 0.5);
  for (let i = 0; i < 3; i++) { box(w, 0.3, 0.32, 0.3, 0xffffff, x - 0.8 + i * 0.8, y + 1.27, z); box(w, 0.24, 0.05, 0.24, 0x6a3f1e, x - 0.8 + i * 0.8, y + 1.44, z); }
  label('☕ Какао', x, z, 3.8, '#ffffff', 3);
}

// ---------- снегопад ----------
// хлопья вокруг камеры: падают, слегка качаются; вылетели из коробки — появляются сверху
function snowfall() {
  const N = ECO ? 450 : 900, pos = new Float32Array(N * 3), R = 26;
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 2 * R; pos[i * 3 + 1] = Math.random() * 22; pos[i * 3 + 2] = (Math.random() - 0.5) * 2 * R; }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
  const cv = document.createElement('canvas'); cv.width = cv.height = 32; const c = cv.getContext('2d');
  const gr = c.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gr; c.fillRect(0, 0, 32, 32);
  const m = new T.PointsMaterial({ size: 0.35, map: new T.CanvasTexture(cv), transparent: true, depthWrite: false, fog: false });
  const pts = new T.Points(g, m); pts.frustumCulled = false; pts.userData.dynamic = true; scene.add(pts);
  st.flakes = { pts, pos, N, R, drift: new Float32Array(N).map(() => Math.random() * 6) };
}
function updateSnow(dt) {
  const F = st.flakes; if (!F) return;
  const c = camera.position, P = F.pos, t = performance.now() / 1000, R = F.R;
  F.pts.position.set(Math.round(c.x / 4) * 4, Math.round((c.y - 8) / 2) * 2, Math.round(c.z / 4) * 4);   // коробка с хлопьями ездит за камерой рывками по 4 — хлопья не дёргаются
  for (let i = 0; i < F.N; i++) {
    const k = i * 3;
    P[k + 1] -= dt * (1.6 + (i % 5) * 0.25);
    P[k] += Math.sin(t * 0.8 + F.drift[i]) * dt * 0.5;
    if (P[k + 1] < 0) { P[k + 1] = 22; P[k] = (Math.random() - 0.5) * 2 * R; P[k + 2] = (Math.random() - 0.5) * 2 * R; }
  }
  F.pts.geometry.attributes.position.needsUpdate = true;
}

// ---------- снежки ❄️ ----------
const BALL_V = 17, BALL_UP = 5.5, BALL_G = 20;
export const winterAmmo = () => st ? st.ammo : 0;
// бросить снежок вперёд: вернёт данные для второго игрока (откуда и с какой скоростью)
export function throwBall(hero) {
  if (!st || st.ammo < 1 || hero.climb) return null;
  st.ammo--;
  const f = hero.face, p = hero.pos;
  const b = { x: p.x + Math.sin(f) * 0.7, y: p.y + 2.3, z: p.z + Math.cos(f) * 0.7, vx: Math.sin(f) * BALL_V + hero.vel.x * 0.3, vy: BALL_UP, vz: Math.cos(f) * BALL_V + hero.vel.z * 0.3 };
  spawnBall(b, true);
  return { x: +b.x.toFixed(2), y: +b.y.toFixed(2), z: +b.z.toFixed(2), vx: +b.vx.toFixed(2), vy: +b.vy.toFixed(2), vz: +b.vz.toFixed(2) };
}
// снежок второго игрока — только картинка (попал ли — решает тот, кто бросил)
export function remoteBall(b) { if (st) spawnBall({ ...b }, false); }
function spawnBall(b, mine) {
  const g = group(scene, b.x, b.y, b.z); g.userData.dynamic = true;
  box(g, 0.34, 0.34, 0.34, 0xffffff, 0, 0, 0); box(g, 0.26, 0.42, 0.26, 0xf4f8ff, 0, 0, 0);
  st.balls.push({ ...b, g, mine, t: 0 });
}
function updateBalls(dt, ev, partner) {
  for (const b of [...st.balls]) {
    b.t += dt; b.vy -= BALL_G * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    b.g.position.set(b.x, b.y, b.z); b.g.rotation.x += dt * 8;
    let hit = b.y < groundY(b.x, b.z) + 0.15 || b.t > 4;
    if (!hit && b.mine) {
      // мишени
      for (const Tg of st.targets) if (Tg.t <= 0 && Math.abs(b.x - Tg.x) < 0.9 && Math.abs(b.z - Tg.z) < 0.6 && Math.abs(b.y - Tg.y) < 0.9) { Tg.t = 3; hit = true; ev.coins = (ev.coins || 0) + 5; ev.sfx.push('pop'); ev.say = '🎯 Попал! +5 монет'; break; }
      // снеговики: три снежка — развалился
      if (!hit) st.snowmen.forEach((S, i) => {
        if (hit || !S.n || Math.hypot(b.x - S.x, b.z - S.z) > SIZES[0] + 0.3 || b.y > S.y + SIZES[0] * 1.8 + SIZES[1] * 1.8 + SIZES[2] * 2 || b.y < S.y) return;
        hit = true; S.wob = 1; S.hits++; ev.sfx.push('pop');
        if (S.hits >= 3) { setSnowman(i, 0); puff('💨', new T.Vector3(S.x, S.y + 1.5, S.z), { size: 2.4 }); ev.say = '💥 Снеговик развалился! Слепи нового ⛄'; ev.sm = { i, n: 0 }; }
      });
      if (!hit) for (const Tg of ballTargets) if (Tg.on() && Math.hypot(b.x - Tg.x, b.z - Tg.z) < Tg.r && b.y > Tg.y0 && b.y < Tg.y1) { hit = true; Tg.hit(); ev.sfx.push('pop'); break; }
      // второй игрок (рост 2.75 — с запасом на шапку)
      if (!hit && partner) { const q = partner(); if (q && Math.hypot(b.x - q.x, b.z - q.z) < 0.9 && b.y > q.y && b.y < q.y + 3.6) { hit = true; ev.hitPartner = true; ev.sfx.push('pop'); } }
    } else if (!hit) {
      for (const S of st.snowmen) if (S.n && Math.hypot(b.x - S.x, b.z - S.z) < SIZES[0] + 0.3 && b.y < S.y + 4) { hit = true; S.wob = 1; }
    }
    if (hit) { puff('❄️', new T.Vector3(b.x, Math.max(b.y, groundY(b.x, b.z) + 0.3), b.z), { size: 1, rise: 0.6, life: 0.6 }); scene.remove(b.g); st.balls.splice(st.balls.indexOf(b), 1); }
  }
}

// ---------- ком для снеговика ----------
export const rollingR = () => st?.roll ? +st.roll.r.toFixed(2) : 0;
function updateRoll(dt, hero, ev) {
  const p = hero.pos;
  if (!st.roll) {
    if (hero.carrying || hero.climb || hero.sled) return;
    for (const H of st.heaps) if (Math.hypot(p.x - H.x, p.z - H.z) < 2 && Math.abs(p.y - H.y) < 1.5) {
      const g = group(scene); g.userData.dynamic = true;
      box(g, 1, 1, 1, 0xffffff, 0, 0, 0); box(g, 0.8, 1.2, 0.8, 0xf4f8ff, 0, 0, 0); box(g, 1.2, 0.8, 0.8, 0xf9fcff, 0, 0, 0);
      st.roll = { g, r: 0.3, dist: 0, last: p.clone() };
      ev.say = '⛄ Катай ком — бегай по снегу, он растёт!<small>прикати его к синему кругу во дворе</small>'; ev.sfx.push('collect');
      break;
    }
    return;
  }
  const R = st.roll, d = Math.hypot(p.x - R.last.x, p.z - R.last.z); R.last.copy(p);
  if (hero.grounded && d < 2) { R.dist += d; R.r = Math.min(1.1, 0.3 + R.dist * 0.035); }
  const f = hero.face, s = R.r;
  R.g.scale.setScalar(s * 2); R.g.position.set(p.x + Math.sin(f) * (0.8 + s), groundY(p.x + Math.sin(f) * (0.8 + s), p.z + Math.cos(f) * (0.8 + s)) + s, p.z + Math.cos(f) * (0.8 + s));
  R.g.rotation.x += d * 1.2 / Math.max(0.3, s); R.g.rotation.y = f;
  if (hero.carrying || hero.climb) { dropRoll(); return; }
  // прикатил к кругу
  st.snowmen.forEach((S, i) => {
    if (!st.roll || S.n >= 3 || Math.hypot(R.g.position.x - S.x, R.g.position.z - S.z) > 1.9) return;
    if (R.r < 0.5) { if (!S.told) { S.told = true; ev.say = '⛄ Ком ещё маленький — покатай подольше'; } return; }
    S.told = false; dropRoll();
    setSnowman(i, S.n + 1); ev.sfx.push(S.n >= 3 ? 'fanfare' : 'pop'); ev.sm = { i, n: S.n };
    if (S.n >= 3) { ev.coins = (ev.coins || 0) + 50; ev.say = '⛄ Снеговик готов! +50 монет'; ev.built = true; }
    else ev.say = S.n === 1 ? '⛄ Низ готов! Катай ещё ком — для середины' : '⛄ Середина есть! Последний ком — голова';
  });
}
function dropRoll() { if (st.roll) { scene.remove(st.roll.g); st.roll = null; } }

// раз в кадр. partner() — где второй игрок (для снежков), или null
export function updateWinter(dt, hero, partner) {
  if (!st) return {};
  const ev = { sfx: [] }, p = hero.pos, t = performance.now() / 1000;
  updateSnow(dt);
  // снежки в руках лепятся сами: по одному в секунду, до пяти
  if (st.ammo < 5 && (st.ammoT += dt) > 1) { st.ammoT = 0; st.ammo++; }
  updateBalls(dt, ev, partner);
  updateRoll(dt, hero, ev);
  for (const Tg of st.targets) { if (Tg.t > 0) { Tg.t -= dt; Tg.face.rotation.x = Math.min(Math.PI / 2, Tg.face.rotation.x + dt * 8); } else Tg.face.rotation.x = Math.max(0, Tg.face.rotation.x - dt * 3); }
  for (const S of st.snowmen) if (S.wob > 0) { S.wob = Math.max(0, S.wob - dt * 2); S.g.rotation.z = Math.sin(t * 25) * 0.06 * S.wob; }
  // каток: скользко
  hero.ice = hero.grounded && (inRink(p.x, p.z) || near(p.x, p.z, W.lake, W.lake.r));   // каток и замёрзшее озеро — скользко
  // горка: встал на красную площадку наверху — на санках вниз
  st.sledCool -= dt;
  const S = st.sled;
  if (!hero.climb && st.sledCool <= 0 && hero.grounded && Math.abs(p.x - S.x) < 1.6 && Math.abs(p.z - S.z) < 1.3) {
    dropRoll();
    const H = W.hill, from = new T.Vector3(S.x, S.y + 0.35, S.z + 1), to = new T.Vector3(S.x, groundY(S.x, H.z0 + 14) + 0.35, H.z0 + 14);
    hero.climb = { ride: k => { const q = from.clone().lerp(to, k * k * (1.6 - 0.6 * k)); q.y = Math.max(groundY(q.x, q.z) + 0.35, from.y + (to.y - from.y) * Math.min(1, k * 1.08)); return q; }, t: 0, dur: 4.2, face: 0, exit: new T.Vector3(0, 1, 7) };
    hero.sled = true; st.sledCool = 2.5; ev.sfx.push('boing'); ev.say = '🛷 Уиии-и-и!';
  }
  if (hero.sled && !hero.climb) hero.sled = false;
  return ev;
}

function seeded(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
