// Рельеф для секторов базы (бухта, лес, джунгли, Долина): холмы ступеньками из «столбиков», как в локациях за порталами.
// Холмы стоят на ровной земле сектора; там, где постройки, дорожки и игры, — земля остаётся ровной (маска flat).
// Каждый столбик — твёрдый блок; всё склеено в один меш. Высота земли регистрируется в world.groundY
// (по ней встают зверюшки, грибы, деревья). Соседние столбики отличаются не больше чем на 1 — везде можно зайти.
import { T, studTex, STUD } from './engine.js';
import { addCollider, setGroundPatch } from './world.js';

// гладкий шум 0…1 (value noise) и «холмы» из двух слоёв
export function noise(seed) {
  const R = (i, j) => { let h = (i * 374761393 + j * 668265263 + seed * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  const n = (x, z) => {
    const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
    const a = R(xi, zi), b = R(xi + 1, zi), c = R(xi, zi + 1), d = R(xi + 1, zi + 1);
    return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
  };
  return (x, z, scale = 24) => (n(x / scale, z / scale) * 2 + n(x / scale * 2.3 + 17, z / scale * 2.3 + 5)) / 3;
}

// маска «тут ровно»: зоны — прямоугольники [x0, x1, z0, z1], круги { c: [x, z, r] }, функции расстояния { d: (x, z) => м };
// 0 — внутри зоны (ровно), 1 — дальше margin метров от всех зон
export function flatMask(zones, margin = 6) {
  return (x, z) => {
    let m = Infinity;
    for (const Z of zones) {
      let d;
      if (Array.isArray(Z)) d = Math.hypot(Math.max(Z[0] - x, 0, x - Z[1]), Math.max(Z[2] - z, 0, z - Z[3]));
      else if (Z.c) d = Math.max(0, Math.hypot(x - Z.c[0], z - Z.c[1]) - Z.c[2]);
      else d = Math.max(0, Z.d(x, z));
      if (d < m) m = d; if (m <= 0) return 0;
    }
    return Math.min(1, m / margin);
  };
}

// построить кусок рельефа. height(x, z) → высота в метрах (округлится до целых ступенек);
// color(x, z, h) → цвет верха; side — цвет склонов. Возвращает h(x, z) — высоту земли (0 вне холмов)
export function relief(parent, { id, x0, x1, z0, z1, cell = 2, height, color, side = 0x9c6a3c }) {
  const nx = Math.round((x1 - x0) / cell), nz = Math.round((z1 - z0) / cell), H = new Int8Array(nx * nz);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) H[i * nz + j] = Math.max(0, Math.min(12, Math.round(height(x0 + (i + 0.5) * cell, z0 + (j + 0.5) * cell))));
  const at = (i, j) => (i < 0 || j < 0 || i >= nx || j >= nz) ? 0 : H[i * nz + j];
  // сглаживаем: ступенька к соседу (и к краю куска) — не выше 1, чтобы везде можно было зайти
  for (let pass = 0, changed = true; changed && pass < 40; pass++) {
    changed = false;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const k = i * nz + j, lim = Math.min(at(i + 1, j), at(i - 1, j), at(i, j + 1), at(i, j - 1)) + 1;
      if (H[k] > lim) { H[k] = lim; changed = true; }
    }
  }
  const pos = [], nor = [], uv = [], col = [], idx = [], cTop = new T.Color(), cSide = new T.Color(side), cSideDark = new T.Color(side).multiplyScalar(0.85);
  const quad = (a, b, c, d, nX, nY, nZ, uvs, color) => { const k = pos.length / 3; for (const v of [a, b, c, d]) { pos.push(...v); nor.push(nX, nY, nZ); col.push(color.r, color.g, color.b); } uv.push(...uvs); idx.push(k, k + 1, k + 2, k, k + 2, k + 3); };
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const y = at(i, j); if (!y) continue;
    const a0 = x0 + i * cell, a1 = a0 + cell, b0 = z0 + j * cell, b1 = b0 + cell;
    cTop.setHex(color(a0 + cell / 2, b0 + cell / 2, y));
    quad([a0, y, b1], [a1, y, b1], [a1, y, b0], [a0, y, b0], 0, 1, 0, [a0 / STUD, b1 / STUD, a1 / STUD, b1 / STUD, a1 / STUD, b0 / STUD, a0 / STUD, b0 / STUD], cTop);
    for (const [nh, [ax, az], [bx, bz], sx, sz] of [[at(i + 1, j), [a1, b1], [a1, b0], 1, 0], [at(i - 1, j), [a0, b0], [a0, b1], -1, 0], [at(i, j + 1), [a0, b1], [a1, b1], 0, 1], [at(i, j - 1), [a1, b0], [a0, b0], 0, -1]]) {
      if (nh >= y) continue;
      const ua = (sx ? az : ax) / STUD, ub = (sx ? bz : bx) / STUD;
      quad([ax, nh, az], [bx, nh, bz], [bx, y, bz], [ax, y, az], sx, 0, sz, [ua, nh / STUD, ub, nh / STUD, ub, y / STUD, ua, y / STUD], sx ? cSide : cSideDark);
    }
    addCollider({ x0: a0, x1: a1, y0: -1, y1: y, z0: b0, z1: b1, cam: true });   // камера не залезает внутрь холма
  }
  if (pos.length) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    const mesh = new T.Mesh(g, new T.MeshLambertMaterial({ map: studTex, vertexColors: true })); mesh.receiveShadow = true; mesh.castShadow = true; mesh.userData.dynamic = true; parent.add(mesh);
  }
  const h = (x, z) => at(Math.floor((x - x0) / cell), Math.floor((z - z0) / cell));
  setGroundPatch(id, { x0, x1, z0, z1, h });
  return h;
}

// цвет травы: выше — светлее, с лёгкой пестротой
export const grassColor = (base = 0.3) => (x, z, h) => new T.Color().setHSL(base + Math.sin(x * 0.7 + z * 0.3) * 0.015, 0.55, 0.42 + h * 0.03 + (Math.sin(x * 1.3) * Math.cos(z * 1.1)) * 0.02).getHex();
export const sandColor = () => (x, z, h) => new T.Color().setHSL(0.12, 0.6, 0.76 + h * 0.02 + Math.sin(x * 1.7 + z) * 0.015).getHex();
