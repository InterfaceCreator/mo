// Рельеф из «столбиков», как в Roblox: высота меняется ступеньками по клеткам.
// Всё склеено в один меш (быстро рисуется), а каждый столбик — твёрдый блок для героя и камеры.
import { T, studTex, STUD } from './engine.js';
import { addCollider, level, onLevelReset } from './world.js';

const BOTTOM = -4;

// size — сторона квадратной карты, cell — сторона клетки; height(x, z) — высота (уже ступенькой),
// color(x, z, h) — цвет верха клетки; side — цвет склонов.
// cliff — с этой высоты начинаются настоящие скалы; всё ниже сглаживается до ступенек не выше maxStep
export function buildTerrain(parent, { size, cell, height, color, side = 0x9c6a3c, cliff = 6, maxStep = 1, grass = 0 }) {
  const n = Math.round(size / cell), half = size / 2;
  const H = new Float32Array(n * n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) H[i * n + j] = height(-half + (i + 0.5) * cell, -half + (j + 0.5) * cell);
  // холм рядом с низиной опускаем, пока перепад не станет проходимым (скалы и дно реки не трогаем)
  for (let pass = 0, changed = true; changed && pass < 30; pass++) {
    changed = false;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const k = i * n + j; if (H[k] >= cliff || H[k] < 0) continue;
      for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) {
        if (a < 0 || b < 0 || a >= n || b >= n) continue;
        const nh = H[a * n + b]; if (nh >= cliff || nh < -1.5) continue;     // скалы и глубокая вода — не сглаживаем к ним
        if (H[k] > nh + maxStep) { H[k] = nh + maxStep; changed = true; }      // и у воды: берег на шаг выше дна
      }
    }
  }
  const h = (i, j) => (i < 0 || j < 0 || i >= n || j >= n) ? BOTTOM : H[i * n + j];

  const pos = [], nor = [], uv = [], col = [], idx = [];
  const cTop = new T.Color(), cSide = new T.Color(side), cSideDark = new T.Color(side).multiplyScalar(0.85);
  // четырёхугольник: 4 угла по порядку, нормаль, uv-координаты углов, цвет
  function quad(a, b, c, d, nx, ny, nz, uvs, color) {
    const k = pos.length / 3;
    for (const v of [a, b, c, d]) { pos.push(...v); nor.push(nx, ny, nz); col.push(color.r, color.g, color.b); }
    uv.push(...uvs); idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const y = h(i, j), x0 = -half + i * cell, x1 = x0 + cell, z0 = -half + j * cell, z1 = z0 + cell;
    cTop.setHex(color(x0 + cell / 2, z0 + cell / 2, y));
    quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], 0, 1, 0,
      [x0 / STUD, z1 / STUD, x1 / STUD, z1 / STUD, x1 / STUD, z0 / STUD, x0 / STUD, z0 / STUD], cTop);
    // склоны рисуем только там, где сосед ниже — и только открытую часть
    const sides = [
      [h(i + 1, j), [x1, z1], [x1, z0], 1, 0, 0],
      [h(i - 1, j), [x0, z0], [x0, z1], -1, 0, 0],
      [h(i, j + 1), [x0, z1], [x1, z1], 0, 0, 1],
      [h(i, j - 1), [x1, z0], [x0, z0], 0, 0, -1],
    ];
    for (const [nh, [ax, az], [bx, bz], nx, , nz] of sides) {
      if (nh >= y) continue;
      const ua = (nx ? az : ax) / STUD, ub = (nx ? bz : bx) / STUD;
      quad([ax, nh, az], [bx, nh, bz], [bx, y, bz], [ax, y, az], nx, 0, nz, [ua, nh / STUD, ub, nh / STUD, ub, y / STUD, ua, y / STUD], nx ? cSide : cSideDark);
    }
    addCollider({ x0, x1, y0: BOTTOM, y1: y, z0, z1, cam: true });
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  const mesh = new T.Mesh(g, new T.MeshLambertMaterial({ map: studTex, vertexColors: true }));
  mesh.receiveShadow = true; parent.add(mesh);

  level.ground = (x, z) => h(Math.floor((x + half) / cell), Math.floor((z + half) / cell));
  if (grass) tufts(parent, grass, size, (x, z) => { const y = level.ground(x, z); return y >= 0 && y < cliff - 1 ? y : null; });
  return mesh;
}

// пучки травы: тысячи травинок одним мешем (рисуются за один раз)
function tufts(parent, n, size, ground) {
  const geo = new T.BoxGeometry(0.12, 0.6, 0.12); geo.translate(0, 0.3, 0);
  const m = new T.InstancedMesh(geo, new T.MeshLambertMaterial({ color: 0xffffff }), n * 3);
  const o = new T.Object3D(), c = new T.Color(); let k = 0;
  for (let i = 0; i < n * 4 && k < n * 3; i++) {
    const x = (Math.random() - 0.5) * size, z = (Math.random() - 0.5) * size, y = ground(x, z);
    if (y === null) continue;
    for (let b = 0; b < 3 && k < n * 3; b++) {                       // пучок — три травинки, слегка наклонённые
      o.position.set(x + (Math.random() - 0.5) * 0.3, y, z + (Math.random() - 0.5) * 0.3);
      o.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * 3, (Math.random() - 0.5) * 0.5);
      o.scale.set(1, 0.6 + Math.random() * 0.8, 1); o.updateMatrix(); m.setMatrixAt(k, o.matrix);
      m.setColorAt(k, c.setHSL(0.27 + Math.random() * 0.06, 0.65, 0.32 + Math.random() * 0.15)); k++;
    }
  }
  m.count = k; m.instanceMatrix.needsUpdate = true; parent.add(m);
}

// вода — одна прозрачная плоскость; там, где земля выше, её просто не видно
const waters = [];
onLevelReset(() => { waters.length = 0; });
const rippleTex = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 26; i++) { c.fillStyle = `rgba(255,255,255,${0.5 + (i % 3) * 0.2})`; c.strokeStyle = 'rgba(200,235,255,.9)'; c.lineWidth = 3;
    const x = (i * 47) % 128, y = (i * 71) % 128; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 6, y - 4, x + 14, y); c.stroke(); }
  const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
})();
export function water(parent, size, y, color = 0x3fa7ff) {
  const tex = rippleTex.clone(); tex.needsUpdate = true; tex.repeat.set(size / 8, size / 8);
  const m = new T.Mesh(new T.PlaneGeometry(size, size), new T.MeshLambertMaterial({ color, map: tex, transparent: true, opacity: 0.78 }));
  m.rotation.x = -Math.PI / 2; m.position.y = y; parent.add(m);
  waters.push(tex);
  return m;
}
// блики на воде медленно плывут
export function updateWater(dt) { for (const t of waters) { t.offset.x += dt * 0.03; t.offset.y += dt * 0.05; } }
