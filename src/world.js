// Основа мира: текущая локация, её твёрдые блоки (с сеткой для быстрых проверок) и общие строительные кусочки.
// Локации собираются в locations.js; при переходе всё, что не помечено userData.keep, убирается со сцены.
import { T, scene, group, box } from './engine.js';
import { makeLabel } from './fx.js';

export const C = {
  grass: 0x5fd84a, grassDark: 0x4cc23a, sand: 0xf6a623, wall: 0xb8672a, wallBand: 0xff7b22, leaf: 0x7fe04a,
  fence: 0xffc21a, fenceDark: 0xff9a1a, trunk: 0x8a5a2b, nest: 0x9a5b2e, red: 0xff3b3b, white: 0xffffff, stone: 0xb9b9c8,
};

// ---------- текущая локация ----------
// ground(x, z) — высота земли (у рельефа), иначе 0; safe — безопасное место у портала { x, z, r }: туда сторожа не бегут
export const level = { id: null, ground: null, safe: null };
export const groundY = (x, z) => level.ground ? level.ground(x, z) : 0;

// ---------- твёрдые блоки ----------
// { x0, x1, y0, y1, z0, z1, cam?, ghost?, off? }: cam — заслоняет камеру, ghost — только для камеры (кроны), off — убран (открытая дверь)
export const colliders = [];
const CELL = 8, grid = new Map();
let stamp = 0;
const key = (i, j) => i * 100003 + j;
export function addCollider(c) {
  colliders.push(c);
  for (let i = Math.floor(c.x0 / CELL); i <= Math.floor(c.x1 / CELL); i++)
    for (let j = Math.floor(c.z0 / CELL); j <= Math.floor(c.z1 / CELL); j++) {
      const k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(c);
    }
  return c;
}
// блоки, которые могут пересекаться с прямоугольником x0..x1, z0..z1 (каждый — один раз)
const found = [];
export function nearColliders(x0, x1, z0, z1) {
  found.length = 0; stamp++;
  for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++)
    for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) {
      const list = grid.get(key(i, j)); if (!list) continue;
      for (const c of list) if (c.stamp !== stamp) { c.stamp = stamp; found.push(c); }
    }
  return found;
}
// точка внутри блока, который заслоняет камеру?
export function blocksCamera(x, y, z) {
  const list = grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
  if (list) for (const c of list) if (c.cam && !c.off && x > c.x0 && x < c.x1 && y > c.y0 && y < c.y1 && z > c.z0 && z < c.z1) return true;
  return false;
}

// ---------- смена локации ----------
export const trees = [];       // деревья можно рубить топором (craft.js)
export const spinners = [];    // то, что медленно движется само (облака)
export const portals = [];     // { x, z, w, to, locked, ... }
const resetters = [];
export const onLevelReset = f => resetters.push(f);
export function clearLevel() {
  colliders.length = 0; grid.clear(); trees.length = 0; spinners.length = 0; portals.length = 0;
  for (const o of [...scene.children]) {
    if (o.userData.keep) continue;
    scene.remove(o);
    o.traverse(m => {
      if (m.isSprite) return;
      if (m.geometry && !m.geometry.userData.cached) m.geometry.dispose();
      if (m.material && !m.material.userData.cached && !m.material.map) m.material.dispose();
    });
  }
  for (const f of resetters) f();
  level.ground = null; level.safe = null;
}

// ---------- строительные кусочки ----------
// твёрдый блок: x, z — центр, y — низ блока
export function solid(p, w, h, d, color, x, y, z, { studs = true, cam = false, shadow = true } = {}) {
  const m = box(p, w, h, d, color, x, y + h / 2, z, { studs, shadow });
  addCollider({ x0: x - w / 2, x1: x + w / 2, y0: y, y1: y + h, z0: z - d / 2, z1: z + d / 2, cam });
  return m;
}

// kind: 'oak' — дуб (по умолчанию), 'pine' — ёлка, 'birch' — берёза, 'apple' — яблоня
export function tree(p, x, z, s = 1, y = 0, kind = 'oak') {
  const g = group(p, x, y, z);
  solid(p, 1.2 * s, 3 * s, 1.2 * s, kind === 'birch' ? 0xf2f0e6 : C.trunk, x, y, z, { cam: true });
  if (kind === 'birch') for (let i = 0; i < 3; i++) box(g, 1.22 * s, 0.15 * s, 1.22 * s, 0x2b2b2b, 0, (0.7 + i * 0.9) * s, 0, { shadow: false });
  if (kind === 'pine') {
    // ёлка — ярусы, сужающиеся кверху
    [[4.2, 1.6, 3.4], [3.2, 1.5, 4.8], [2.2, 1.4, 6.1], [1.2, 1.2, 7.2]].forEach(([w, h, yy]) => box(g, w * s, h * s, w * s, 0x2e8b3a, 0, yy * s, 0, { studs: true }));
  } else {
    // осенние: клён (красный), золотое, рыжее, яблоня в рыжей листве
    const AUT = { maple: [0xe2442a, 0xff6a3d], golden: [0xffc22a, 0xffdb5a], rust: [0xff8a1a, 0xffab4a], aapple: [0xf09a2a, 0xffc04a] }[kind];
    const leaf = AUT ? AUT[0] : kind === 'birch' ? 0x9be36a : C.leaf, top = AUT ? AUT[1] : kind === 'birch' ? 0xb5ec84 : 0x6ad13c;
    box(g, 4 * s, 2.6 * s, 4 * s, leaf, 0, 4.1 * s, 0, { studs: true });
    box(g, 2.8 * s, 1.6 * s, 2.8 * s, top, 0, 6 * s, 0, { studs: true });
    if (kind === 'apple' || kind === 'aapple') for (const [ax, ay, az] of [[1.5, 3.6, 1.2], [-1.4, 4.4, 1.6], [1.7, 4.8, -1], [-1.2, 3.4, -1.6], [0.4, 3.3, 2.05]]) box(g, 0.45 * s, 0.45 * s, 0.45 * s, 0xff3b3b, ax * s, ay * s, az * s, { shadow: false });
  }
  // крона не твёрдая, но камера сквозь неё не проходит — иначе весь экран зелёный
  const cw = kind === 'pine' ? 2.1 : 2;
  addCollider({ x0: x - cw * s, x1: x + cw * s, y0: y + 2.8 * s, y1: y + (kind === 'pine' ? 7.8 : 6.8) * s, z0: z - cw * s, z1: z + cw * s, cam: true, ghost: true });
  trees.push({ x, z, y, s, crown: g, kind });
}

export function fence(p, x0, z0, x1, z1, gaps = []) {
  // столбики через 2 единицы + две перекладины; «gaps» — проходы [[from, to]] вдоль линии
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 2), dx = (x1 - x0) / len, dz = (z1 - z0) / len;
  const inGap = t => gaps.some(([a, b]) => t > a && t < b);
  for (let i = 0; i <= n; i++) {
    const t = i * len / n; if (inGap(t)) continue;
    solid(p, 0.5, 1.5, 0.5, C.fence, x0 + dx * t, 0, z0 + dz * t, { studs: false });
  }
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) * len / n; if (inGap(t)) continue;
    const seg = len / n, horiz = Math.abs(dx) > Math.abs(dz);
    const w = horiz ? seg : 0.25, d = horiz ? 0.25 : seg;
    box(p, w, 0.22, d, C.fenceDark, x0 + dx * t, 0.55, z0 + dz * t, { studs: false });
    solid(p, w, 0.22, d, C.fenceDark, x0 + dx * t, 1.05, z0 + dz * t, { studs: false });
  }
}

// рисунок на яйце: stripes — волны (обычное), spots — пятна, rainbow — радуга, quick — молнии,
// crystal — грани, cracks — трещины (огромное), stars — звёзды (небесное), gold — блестящие полосы
const eggTexCache = {};
const hex = c => '#' + c.toString(16).padStart(6, '0');
function eggTex(base, stripe, pattern = 'stripes') {
  const k = base + '|' + stripe + '|' + pattern;
  if (eggTexCache[k]) return eggTexCache[k];
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
  const c = cv.getContext('2d');
  c.fillStyle = hex(base); c.fillRect(0, 0, 128, 128);
  c.fillStyle = hex(stripe); c.strokeStyle = hex(stripe);
  const wave = (y, th) => { c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= 128; x += 8) c.lineTo(x, y + Math.sin(x / 128 * Math.PI * 6) * 6); for (let x = 128; x >= 0; x -= 8) c.lineTo(x, y + th + Math.sin(x / 128 * Math.PI * 6) * 6); c.fill(); };
  if (pattern === 'stripes') { wave(38, 12); wave(78, 12); }
  else if (pattern === 'spots') { for (let i = 0; i < 14; i++) { c.beginPath(); c.arc((i * 37) % 128, (i * 59) % 128, 6 + (i % 3) * 4, 0, 7); c.fill(); } }
  else if (pattern === 'rainbow') { ['#ff5a5a', '#ff9f40', '#ffd93b', '#5fd35f', '#3fa7ff', '#9b6bff'].forEach((col, i) => { c.fillStyle = col; c.fillRect(0, i * 21.4, 128, 22); }); }
  else if (pattern === 'quick') { wave(60, 8); c.fillStyle = '#ffe14d'; for (const x of [16, 56, 96]) { c.beginPath(); c.moveTo(x + 10, 10); c.lineTo(x, 60); c.lineTo(x + 10, 58); c.lineTo(x + 2, 118); c.lineTo(x + 22, 52); c.lineTo(x + 12, 54); c.lineTo(x + 20, 10); c.fill(); } }
  else if (pattern === 'crystal') { c.globalAlpha = 0.7; for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? '#ffffff' : hex(stripe); c.beginPath(); const x = (i * 41) % 128, y = (i * 23) % 128; c.moveTo(x, y); c.lineTo(x + 26, y + 10); c.lineTo(x + 8, y + 34); c.fill(); } c.globalAlpha = 1; }
  else if (pattern === 'cracks') { wave(38, 12); wave(78, 12); c.strokeStyle = '#3a2a1a'; c.lineWidth = 3; for (let i = 0; i < 6; i++) { c.beginPath(); const x = (i * 23) % 128; c.moveTo(x, 0); c.lineTo(x + 8, 20); c.lineTo(x - 4, 40); c.lineTo(x + 6, 60); c.stroke(); } }
  else if (pattern === 'stars') { c.fillStyle = '#ffffff'; for (let i = 0; i < 24; i++) { const x = (i * 53) % 128, y = (i * 29) % 128, r = 1.5 + (i % 3); c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } c.fillStyle = '#ffe680'; for (const [x, y] of [[30, 40], [90, 80], [70, 20]]) { c.beginPath(); for (let j = 0; j < 10; j++) { const a = j / 10 * Math.PI * 2, rr = j % 2 ? 4 : 10; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill(); } }
  else if (pattern === 'fire') {
    // языки пламени снизу вверх: оранжевые, сверху жёлтые
    for (const [col, h] of [['#ff8a1a', 70], ['#ffd23f', 44]]) { c.fillStyle = col; c.beginPath(); c.moveTo(0, 128); for (let x = 0; x <= 128; x += 16) { c.lineTo(x + 8, 128 - h - (x % 32 ? 18 : 0)); c.lineTo(x + 16, 128 - h * 0.45); } c.lineTo(128, 128); c.fill(); }
  }
  else if (pattern === 'gold') { c.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 4; i++) { c.save(); c.translate(i * 40 - 20, 0); c.rotate(0.5); c.fillRect(0, -20, 10, 200); c.restore(); } }
  return (eggTexCache[k] = new T.CanvasTexture(cv));
}
const EGG_GEO = new T.SphereGeometry(0.5, 20, 16), eggMats = {};
EGG_GEO.userData.cached = true;
// яйцо стоит на точке (x, y, z); s — ширина
export function makeEgg(p, x, y, z, s, base, stripe, glow = 0, pattern = 'stripes') {
  const k = base + '|' + stripe + '|' + glow + '|' + pattern;
  if (!eggMats[k]) { eggMats[k] = new T.MeshLambertMaterial({ map: eggTex(base, stripe, pattern), emissive: glow, emissiveIntensity: 0.35 }); eggMats[k].userData.cached = true; }
  const m = new T.Mesh(EGG_GEO, eggMats[k]);
  m.scale.set(s, s * 1.3, s); m.position.set(x, y + s * 0.65, z); m.castShadow = true; p.add(m); return m;
}
export function nest(p, x, z, s = 1, y = 0) {
  const g = group(p, x, y, z);
  for (let i = 0; i < 12; i++) {                                   // кольцо из веточек
    const a = i / 12 * Math.PI * 2, b = box(g, 0.9 * s, 0.3 * s, 0.3 * s, i % 2 ? C.nest : 0x7d4622, Math.cos(a) * 0.75 * s, 0.18 * s + (i % 3) * 0.06 * s, Math.sin(a) * 0.75 * s);
    b.rotation.y = -a + Math.PI / 2; b.rotation.z = 0.25;
  }
  box(g, 1.3 * s, 0.15 * s, 1.3 * s, 0x7d4622, 0, 0.08 * s, 0);
  return g;
}

const cloudMat = new T.MeshBasicMaterial({ color: 0xffffff, fog: false }); cloudMat.userData.cached = true;   // облака не темнеют снизу
export function clouds(p, n = 14) {
  for (let i = 0; i < n; i++) {
    const g = group(p, Math.random() * 280 - 140, 40 + Math.random() * 18, Math.random() * 280 - 140);
    const k = 1 + Math.random() * 1.5;
    // облако из нескольких «клубов» разного размера
    for (const [w, h, d, dx, dy, dz] of [[12, 3, 6, 0, 0, 0], [7, 3, 5, 2, 2, 0], [6, 2.6, 4.5, -3.5, 1.4, 0.6], [5, 2, 4, 5, 0.8, -0.8], [4, 2, 3.4, -1, 3.4, 0]])
      box(g, w * k, h, d * k, 0xffffff, dx * k, dy, dz * k, { shadow: false }).material = cloudMat;
    g.userData.speed = 0.6 + Math.random() * 0.8; g.userData.dynamic = true; spinners.push(g);
  }
}

// портал: каменная арка с цветной «дымкой». face — куда смотрит лицевая сторона (входят навстречу ей)
// воронка портала: светлая середина и четыре закрученных рукава
const swirlTex = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d');
  const gr = c.createRadialGradient(128, 128, 4, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,.2)');
  c.fillStyle = gr; c.beginPath(); c.arc(128, 128, 128, 0, 7); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineCap = 'round';
  for (let k = 0; k < 4; k++) for (let i = 0; i < 60; i++) {
    const t0 = i / 60, t1 = (i + 1) / 60, a = k * Math.PI / 2;
    c.lineWidth = 3 + 14 * t0; c.beginPath();
    c.moveTo(128 + Math.cos(a + t0 * 7) * t0 * 124, 128 + Math.sin(a + t0 * 7) * t0 * 124); c.lineTo(128 + Math.cos(a + t1 * 7) * t1 * 124, 128 + Math.sin(a + t1 * 7) * t1 * 124); c.stroke();
  }
  return new T.CanvasTexture(cv);
})();
const DISC = new T.CircleGeometry(1, 48); DISC.userData.cached = true;
const RIM = new T.RingGeometry(0.93, 1, 48); RIM.userData.cached = true;
const GEM = new T.OctahedronGeometry(1); GEM.userData.cached = true;
export function portal(p, { x, z, w = 18, to, color, label, rot = 0, locked = false, req = 0 }) {
  const g = group(p, x, 0, z); g.rotation.y = rot;                 // каменная арка неподвижна — склеится с локацией; движется только то, что помечено dynamic
  const half = w / 2 + 1.5, H = 10.4, ARCH = 2.6;
  const light = new T.Color(color).lerp(new T.Color(0xffffff), 0.55), dark = new T.Color(color).multiplyScalar(0.62).getHex();
  // столбы: подножие, ствол с цветными поясами, капитель
  for (const sx of [-1, 1]) {
    const px = sx * half;
    box(g, 4.4, 1, 4.4, C.stone, px, 0.5, 0, { studs: true });
    box(g, 3.4, H - 1, 3.4, C.stone, px, 0.5 + (H - 1) / 2, 0, { studs: true });
    for (const y of [3.2, 6.6]) box(g, 3.7, 0.5, 3.7, color, px, y, 0);
    box(g, 4.2, 0.8, 4.2, dark, px, H + 0.4, 0, { studs: true });
  }
  // арка: кирпичики дугой от столба к столбу
  const n = 11;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, b = box(g, 2 * half / n + 0.35, 1.5, 2.8, i % 2 ? color : dark, -half + t * 2 * half, H + 0.9 + Math.sin(t * Math.PI) * ARCH, 0, { studs: true });
    b.rotation.z = Math.atan(Math.cos(t * Math.PI) * Math.PI * ARCH / (2 * half));
  }
  // наверху — светящийся кристалл, медленно крутится
  const gem = new T.Mesh(GEM, new T.MeshBasicMaterial({ color: light })); gem.scale.set(0.9, 1.3, 0.9); gem.position.set(0, H + ARCH + 2.6, 0); gem.userData.dynamic = true; g.add(gem);
  // воронка: овал между столбами, по краю — светлый обод; крутится
  const oval = group(g, 0, 4.9, 0); oval.scale.set(w / 2 - 0.1, 4.7, 1); oval.userData.dynamic = true;
  const swirl = new T.Mesh(DISC, new T.MeshBasicMaterial({ color, map: swirlTex, transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false })); oval.add(swirl);
  oval.add(new T.Mesh(RIM, new T.MeshBasicMaterial({ color: light, transparent: true, opacity: 0.9, side: T.DoubleSide, depthWrite: false })));
  // искорки поднимаются сквозь портал
  const N = 36, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * (w - 2); pos[i * 3 + 1] = Math.random() * 9.4; pos[i * 3 + 2] = (Math.random() - 0.5) * 1.6; }
  const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pos, 3));
  const sparks = new T.Points(pg, new T.PointsMaterial({ color: light, size: 0.4, transparent: true, opacity: 0.95, depthWrite: false })); sparks.position.y = 0.2; sparks.userData.dynamic = true; g.add(sparks);
  // светлое пятно на земле под порталом
  const glow = new T.Mesh(DISC, new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.scale.set(w / 2 + 1, 3, 1); glow.position.y = 0.06; glow.userData.dynamic = true; g.add(glow);
  // столбы твёрдые; портал стоит поперёк оси z (rot 0 или 180°) или поперёк оси x (rot ±90° — в боковой стене)
  const side = Math.abs(Math.sin(rot)) > 0.5;
  for (const sx of [-1, 1]) addCollider(side
    ? { x0: x - 1.7, x1: x + 1.7, y0: 0, y1: 10.4, z0: z + sx * half - 1.7, z1: z + sx * half + 1.7, cam: true }
    : { x0: x + sx * half - 1.7, x1: x + sx * half + 1.7, y0: 0, y1: 10.4, z0: z - 1.7, z1: z + 1.7, cam: true });
  const pt = { x, z, w, to, g, swirl, oval, gem, sparks, glow, label, req, locked, bars: null, col: null, side };
  if (label) { pt.sign = makeLabel(7, 1.75); pt.sign.userData.set(label, { color: '#ffffff' }); pt.sign.position.set(0, H + ARCH + 5.2, 0); g.add(pt.sign); }
  if (locked) {
    pt.bars = group(g); pt.bars.userData.dynamic = true;
    for (let i = 0; i < 9; i++) box(pt.bars, 0.5, 7, 0.5, 0x666a7a, -w / 2 + 1 + i * (w - 2) / 8, 3.5, 0.9, { studs: false });
    box(pt.bars, w, 0.6, 0.6, 0x555a6a, 0, 6.6, 0.9, { studs: false }); box(pt.bars, w, 0.6, 0.6, 0x555a6a, 0, 2, 0.9, { studs: false });
    pt.col = addCollider({ x0: x - w / 2, x1: x + w / 2, y0: 0, y1: 7, z0: z - 0.5, z1: z + 1.5 });
    // табличка на решётке: сколько скорости нужно (текст обновляет game.js)
    pt.lockSign = makeLabel(7, 1.75); pt.lockSign.position.set(0, 8.2, 1.2); g.add(pt.lockSign);
  }
  portals.push(pt);
  return pt;
}
// дверь: проход в другую локацию — как портал, только без арки (её рисует тот, кто ставит дверь)
// spawn — где появиться (иначе — как обычно для этой локации); side — проход поперёк оси x (люк, боковая дверь)
export function door({ x, z, w = 2.4, to, label, spawn = null, side = false }) { const pt = { x, z, w, to, label, spawn, locked: false, side, door: true }; portals.push(pt); return pt; }
export function unlockPortal(pt) { pt.locked = false; if (pt.col) pt.col.off = true; if (pt.lockSign) pt.lockSign.visible = false; }

export function updateWorld(dt) {
  for (const g of spinners) { g.position.x += g.userData.speed * dt; if (g.position.x > 150) g.position.x = -150; }
  const t = performance.now() / 1000;
  for (const pt of portals) {
    if (pt.door) continue;
    pt.swirl.material.opacity = 0.7 + Math.sin(t * 3.3) * 0.12;
    pt.swirl.rotation.z -= dt * (pt.locked ? 0.4 : 1.6);
    pt.gem.rotation.y += dt * 1.2; pt.gem.position.y += Math.sin(t * 2) * 0.004;
    pt.glow.material.opacity = 0.25 + Math.sin(t * 2.5) * 0.1;
    if (!pt.locked) {
      const a = pt.sparks.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) { let y = a.getY(i) + dt * (1.2 + (i % 5) * 0.3); if (y > 9.4) y = 0; a.setY(i, y); }
      a.needsUpdate = true;
    }
    pt.sparks.visible = !pt.locked;
    if (!pt.locked && pt.bars && pt.bars.position.y > -7.5) pt.bars.position.y = Math.max(-7.5, pt.bars.position.y - dt * 6);
  }
}

// ---------- постройки базы (их координаты нужны другим модулям) ----------
export const SPAWN = { x: 0, z: 34, face: Math.PI };
// свой загон (второй, справа, — для мамы на этапе 4)
export const PEN = {
  x0: -30, x1: -8, z0: 16, z1: 40,
  roam: { x0: -28.5, x1: -15, z0: 22, z1: 38.5 },             // где гуляют питомцы
  pad: { x: -19, z: 19.5 },                                    // копилка у входа
  incubators: [[-11.5, 20], [-11.5, 23.5], [-11.5, 27], [-11.5, 30.5], [-11.5, 34], [-11.5, 37.5]],
};
export const SHOP = { x: 8, z: 52, pad: { x: 8, z: 48.5 } };
export const TREADMILL = { x: -8, z: 51, w: 3, d: 6 };
export const CAVE = { x0: -76, x1: -45, z0: 36, z1: 62, gap: [46, 52] };   // кристальная пещера за валуном (кирка)
export const TOWER = { x: 38, z: 24, h: 10 };                                // башня с сундуком (верёвка)

// ---------- «запекание» неподвижного ----------
// все неподвижные кубики локации одного материала склеиваются в один меш: рисуется в разы быстрее.
// Не трогаем то, что помечено userData.dynamic (облака, порталы, крылья мельницы) и материалы не из общего кэша
export function bake(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  (function walk(o) {
    if (o.userData.dynamic) return;
    if (o.isMesh && !o.isInstancedMesh && o.material?.userData?.cached && o.geometry.index) {
      if (!buckets.has(o.material)) buckets.set(o.material, []);
      buckets.get(o.material).push(o);
    }
    for (const c of o.children) walk(c);
  })(root);
  for (const [material, meshes] of buckets) {
    if (meshes.length < 2) continue;
    let nv = 0, ni = 0;
    for (const m of meshes) { nv += m.geometry.attributes.position.count; ni += m.geometry.index.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni);
    const v = new T.Vector3(), nm = new T.Matrix3(), mm = new T.Matrix4(), inv = root.matrixWorld.clone().invert();
    let vo = 0, io = 0;
    for (const m of meshes) {
      const g = m.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, I = g.index;
      mm.multiplyMatrices(inv, m.matrixWorld);        // в координаты root: склеенный меш лежит внутри него
      nm.getNormalMatrix(mm);
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(mm); pos.set([v.x, v.y, v.z], (vo + i) * 3);
        v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], (vo + i) * 3);
        uv.set([U.getX(i), U.getY(i)], (vo + i) * 2);
      }
      for (let i = 0; i < I.count; i++) idx[io + i] = I.getX(i) + vo;
      vo += P.count; io += I.count;
      m.parent.remove(m);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    geo.setIndex(new T.BufferAttribute(idx, 1)); geo.computeBoundingSphere();
    const merged = new T.Mesh(geo, material); merged.castShadow = merged.receiveShadow = true;
    root.add(merged);
  }
}
