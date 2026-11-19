// Общая 3D-основа: рендер, сцена, свет, кубики со «студами» как в Roblox.
export const T = window.THREE;

export const canvas = document.getElementById('c');
// экономный режим на телефонах и планшетах (сенсорный экран): простые тени, не самый мощный режим видеочипа,
// не больше 40 кадров в секунду (main.js); чёткость и сглаживание — как раньше, иначе картинка заметно хуже — чтобы телефон не грелся и дольше держал заряд. ?hq — полное качество, ?eco — экономно и на компьютере
const Q = new URLSearchParams(location.search);
export const PHONE = Math.min(screen.width, screen.height) < 500;
export const ECO = !Q.has('hq') && (Q.has('eco') || matchMedia('(pointer: coarse)').matches);
const DPR = Math.min(window.devicePixelRatio || 1, PHONE ? 1.75 : 2);
// слабый планшет может не дать 3D с полными настройками — пробуем попроще
function makeRenderer() {
  let err;
  const first = ECO ? { antialias: true } : { antialias: true, powerPreference: 'high-performance' };
  for (const o of [first, { antialias: false }, { antialias: false, powerPreference: 'low-power', depth: true, stencil: false }]) {
    try { return new T.WebGLRenderer({ canvas, ...o }); } catch (e) { err = e; }
  }
  throw new Error('3D (WebGL) не запускается на этом устройстве: ' + (err && err.message));
}
export const renderer = makeRenderer();
renderer.setPixelRatio(DPR);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = ECO ? T.PCFShadowMap : T.PCFSoftShadowMap;

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
// ночь (0 — день, 1 — ночь): тусклее свет, солнце прячется. Небо красит тот, кто зовёт (sky)
export function setNight(n) { hemi.intensity = 0.7 * (1 - 0.55 * n); sun.intensity = 0.85 * (1 - 0.75 * n); sunDisc.material.opacity = 1 - n; }
export const sun = new T.DirectionalLight(0xfff1d8, 0.85);
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

// ---------- склейка кубиков ----------
// Много неподвижных кусочков → один меш на «вид» материала. Цвет каждого кусочка пишется в его вершины,
// поэтому склеиваются и кусочки разных цветов: видеокарта рисует их одной командой, а выглядит всё так же.
const vcCache = new Map(), WHITE = new T.Color(1, 1, 1);
// материал можно «перекрасить в вершины», если он обычный матовый (как у mat())
// (userData.live — цвет меняется во время игры, например радужный питомец: такой не перекрашиваем)
export const paintable = m => !!m && m.isMeshLambertMaterial && m.userData?.cached && !m.userData.live && !m.vertexColors && !m.transparent && m.opacity === 1 && m.side === T.FrontSide && !m.emissiveMap && !m.alphaMap;
function vcMat(src) {
  const k = (src.map ? src.map.uuid : '-') + '|' + src.emissive.getHex() + '|' + src.emissiveIntensity;
  if (!vcCache.has(k)) { const m = new T.MeshLambertMaterial({ vertexColors: true, map: src.map, emissive: src.emissive.getHex(), emissiveIntensity: src.emissiveIntensity }); m.userData.cached = true; vcCache.set(k, m); }
  return vcCache.get(k);
}
// meshes — кусочки внутри root (на любой глубине); они переезжают в склеенные меши, лежащие прямо в root.
// split — тени как были (кто не бросал тень, тот и дальше не бросает); иначе все бросают тень
export function mergeMeshes(root, meshes, { split = false } = {}) {
  const buckets = new Map();
  for (const m of meshes) {
    if (!m.geometry.index || !m.material?.userData?.cached || Array.isArray(m.material)) continue;
    // матовые — по виду (цвет уйдёт в вершины); остальные (облака, золото, радужные) — только с тем же материалом
    const paint = paintable(m.material), M = m.material;
    const k = (paint ? 'p' + M.map?.uuid + '|' + M.emissive.getHex() + '|' + M.emissiveIntensity : 'm' + M.uuid) + '|' + (split ? m.castShadow : 1);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(m);
  }
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(), mm = new T.Matrix4(), nm = new T.Matrix3(), v = new T.Vector3(), out = [];
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    let nv = 0, ni = 0;
    for (const m of list) { nv += m.geometry.attributes.position.count; ni += m.geometry.index.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3), idx = (nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni));
    let vo = 0, io = 0;
    for (const m of list) {
      const g = m.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, I = g.index, c = m.material.color || WHITE, Cv = m.material.vertexColors ? g.attributes.color : null;
      mm.multiplyMatrices(inv, m.matrixWorld); nm.getNormalMatrix(mm);
      for (let i = 0; i < P.count; i++) {
        const j = (vo + i) * 3;
        v.fromBufferAttribute(P, i).applyMatrix4(mm); pos[j] = v.x; pos[j + 1] = v.y; pos[j + 2] = v.z;
        v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[j] = v.x; nor[j + 1] = v.y; nor[j + 2] = v.z;
        if (Cv) { col[j] = Cv.getX(i); col[j + 1] = Cv.getY(i); col[j + 2] = Cv.getZ(i); }   // уже склеенный кусок: цвета уже в вершинах
        else { col[j] = c.r; col[j + 1] = c.g; col[j + 2] = c.b; }
        if (U) { uv[(vo + i) * 2] = U.getX(i); uv[(vo + i) * 2 + 1] = U.getY(i); }
      }
      for (let i = 0; i < I.count; i++) idx[io + i] = I.getX(i) + vo;
      vo += P.count; io += I.count;
      m.parent.remove(m);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
    const paint = paintable(list[0].material), vc = paint || list[0].material.vertexColors;
    geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); if (vc) geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.setIndex(new T.BufferAttribute(idx, 1)); geo.computeBoundingSphere();
    const merged = new T.Mesh(geo, paint ? vcMat(list[0].material) : list[0].material);
    merged.castShadow = split ? list[0].castShadow : true; merged.receiveShadow = true;
    root.add(merged); out.push(merged);
  }
  return out;
}

// Зверь/птица/питомец: склеиваем кусочки, лежащие прямо в одной группе (они и так двигаются вместе).
// Группы (лапы, голова, хвост) остаются — анимация та же. Кусочки, на которые модель ссылается сама
// (глаза моргают, крыло машет), не трогаем. Звать после того, как модель достроена и раскрашена
export function compactModel(m) {
  if (!m?.root || m.compact) return m;
  const keep = new Set();
  const add = (v, d) => { if (!v || d > 3) return; if (v.isObject3D) { if (v.isMesh) keep.add(v); return; } if (Array.isArray(v)) v.forEach(x => add(x, d + 1)); else if (typeof v === 'object') Object.values(v).forEach(x => add(x, d + 1)); };
  for (const k in m) if (k !== 'root') add(m[k], 0);
  const groups = []; m.root.traverse(o => { if (!o.isMesh) groups.push(o); });
  for (const g of groups) if (g.visible) mergeMeshes(g, g.children.filter(c => c.isMesh && c.visible && !c.children.length && !keep.has(c)), { split: true });
  m.compact = true;
  return m;
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
// плавное приближение, не зависящее от частоты кадров
export const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));
export function angleDiff(a, b) { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
export const dampAngle = (a, b, rate, dt) => a + angleDiff(a, b) * (1 - Math.exp(-rate * dt));
