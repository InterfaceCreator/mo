// Общая 3D-основа: рендер, сцена, свет, кубики со «студами» как в Roblox.
export const T = window.THREE;

export const canvas = document.getElementById('c');
// на телефонах плотность пикселей ограничиваем — так держится 60 кадров
const DPR = Math.min(window.devicePixelRatio || 1, Math.min(screen.width, screen.height) < 500 ? 1.75 : 2);
// слабый планшет может не дать 3D с полными настройками — пробуем попроще
function makeRenderer() {
  let err;
  for (const o of [{ antialias: true, powerPreference: 'high-performance' }, { antialias: false }, { antialias: false, powerPreference: 'low-power', depth: true, stencil: false }]) {
    try { return new T.WebGLRenderer({ canvas, ...o }); } catch (e) { err = e; }
  }
  throw new Error('3D (WebGL) не запускается на этом устройстве: ' + (err && err.message));
}
export const renderer = makeRenderer();
renderer.setPixelRatio(DPR);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;

export const SKY = 0x8fd3ff;
export const scene = new T.Scene();
scene.background = new T.Color(SKY);
scene.fog = new T.Fog(SKY, 60, 150);
export const camera = new T.PerspectiveCamera(60, 1, 0.1, 400);

// небо: купол с переходом от насыщенного синего вверху к светлому у горизонта, и солнце
const skyGeo = new T.SphereGeometry(330, 24, 16), skyCol = [];
const skyTop = new T.Color(0x3f8fe0), skyHor = new T.Color(SKY);
const skyMesh = new T.Mesh(skyGeo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false }));
skyMesh.userData.keep = true; skyMesh.renderOrder = -1; scene.add(skyMesh);
function paintSky() {
  const pos = skyGeo.attributes.position, c = new T.Color(); skyCol.length = 0;
  for (let i = 0; i < pos.count; i++) { const k = Math.max(0, pos.getY(i) / 330); c.copy(skyHor).lerp(skyTop, Math.pow(k, 0.6)); skyCol.push(c.r, c.g, c.b); }
  skyGeo.setAttribute('color', new T.Float32BufferAttribute(skyCol, 3));
}
const sunDisc = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
  const g = c.createRadialGradient(64, 64, 8, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.25, 'rgba(255,245,200,.9)'); g.addColorStop(1, 'rgba(255,240,200,0)');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(cv), fog: false, depthWrite: false })); s.scale.set(70, 70, 1); s.userData.keep = true; scene.add(s); return s;
})();
// цвет неба у горизонта (и тумана) для локации; верх неба — насыщеннее
export function sky(c) {
  scene.background.set(c); scene.fog.color.set(c);
  skyHor.set(c); skyTop.set(c).multiplyScalar(0.55).lerp(new T.Color(0x2f7fe0), 0.5); paintSky();
}
paintSky();
// купол и солнце всегда вокруг камеры
export function followSky() { skyMesh.position.copy(camera.position); sunDisc.position.copy(camera.position).addScaledVector(SUN_DIR, 300); }

const hemi = new T.HemisphereLight(0xe2f2ff, 0x8fae6a, 0.7); hemi.userData.keep = true; scene.add(hemi);
export const sun = new T.DirectionalLight(0xfff1d8, 0.85);
const PHONE = Math.min(screen.width, screen.height) < 500;
sun.castShadow = true; sun.shadow.mapSize.set(PHONE ? 1024 : 2048, PHONE ? 1024 : 2048); sun.shadow.bias = -0.0005;
const SUN_SIZE = 26, SUN_OFF = new T.Vector3(14, 30, 10), SUN_DIR = SUN_OFF.clone().normalize();
Object.assign(sun.shadow.camera, { near: 1, far: 90, left: -SUN_SIZE, right: SUN_SIZE, top: SUN_SIZE, bottom: -SUN_SIZE });
sun.userData.keep = sun.target.userData.keep = true;
scene.add(sun, sun.target);
// тень считается только вокруг героя — солнце ездит за ним
export function followSun(p) { sun.position.copy(p).add(SUN_OFF); sun.target.position.copy(p); }

export function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = w < h ? 70 : 60;   // в портрете шире угол, иначе тесно
  camera.updateProjectionMatrix();
}

// ---------- материалы ----------
// одна серая текстура со студом; цвет задаёт материал
function studCanvas() {
  const S = 64, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d');
  c.fillStyle = '#e4e4e4'; c.fillRect(0, 0, S, S);
  c.fillStyle = 'rgba(0,0,0,.10)'; c.fillRect(0, S - 3, S, 3); c.fillRect(S - 3, 0, 3, S);     // шов между плитками
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(0, 0, S, 2); c.fillRect(0, 0, 2, S);
  const r = S * 0.3, cx = S / 2, cy = S / 2;
  c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.arc(cx + 3, cy + 4, r, 0, 7); c.fill();          // тень стада
  const g = c.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e0e0e0');
  c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 2; c.stroke();
  return cv;
}
export const studTex = new T.CanvasTexture(studCanvas());
studTex.wrapS = studTex.wrapT = T.RepeatWrapping; studTex.anisotropy = 8;

const matCache = new Map();
export function mat(color, { studs = false, emissive = 0 } = {}) {
  const k = color + (studs ? 's' : '') + '|' + emissive;
  if (!matCache.has(k)) { const m = new T.MeshLambertMaterial({ color, map: studs ? studTex : null, emissive }); m.userData.cached = true; matCache.set(k, m); }
  return matCache.get(k);
}

// ---------- геометрия ----------
// у кубика со студами UV растянуты по размеру грани: 1 стад = STUD единиц на любой стороне
export const STUD = 0.6;
const geoCache = new Map();
export const BOX = new T.BoxGeometry(1, 1, 1); BOX.userData.cached = true;   // общие геометрии и материалы при смене локации не удаляются
function studBoxGeo(w, h, d) {
  const k = `${w}|${h}|${d}`;
  if (geoCache.has(k)) return geoCache.get(k);
  const g = new T.BoxGeometry(w, h, d), uv = g.attributes.uv;
  // грани BoxGeometry: +x, -x, +y, -y, +z, -z — по 4 вершины
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
    const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / STUD, uv.getY(i) * dims[f][1] / STUD);
  }
  g.userData.cached = true; geoCache.set(k, g); return g;
}

export function group(p, x = 0, y = 0, z = 0) { const g = new T.Group(); g.position.set(x, y, z); if (p) p.add(g); return g; }
// кубик по центру (x, y, z)
export function box(p, w, h, d, color, x = 0, y = 0, z = 0, { shadow = true, studs = false } = {}) {
  const m = new T.Mesh(studs ? studBoxGeo(w, h, d) : BOX, mat(color, { studs }));
  if (!studs) m.scale.set(w, h, d);
  m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; p.add(m); return m;
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
// плавное приближение, не зависящее от частоты кадров
export const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
export function angleDiff(a, b) { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
export const dampAngle = (a, b, rate, dt) => a + angleDiff(a, b) * (1 - Math.exp(-rate * dt));
