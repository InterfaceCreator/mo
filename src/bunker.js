// Вход в бункер ⛏️ на даче (идея Моти): за забором участка, слева, — холмик 5×5 кубиков земли и лопата.
// Взял лопату — копаешь как в Майнкрафте: кнопка ⛏️ (держишь — копает без остановки, на компьютере — клавиша E).
// Копает кубик перед собой (от ног до головы — так сама получается лесенка вниз), иначе — под ногами.
// Жёлтая рамка — где копать: середину 3×3 на 3 кубика вглубь. Выкопал — на дне стальной люк с колесом:
// встал на него — люк открывается, и ты внизу, в большом бункере (bunkerloc.js — отдельная локация).
// Из ямы — кнопка ⬆️. Сохранение: save.bunker.e — глубина каждого столбика, save.bunker.open — люк откопан.
import { T, scene, group, box, BOX, studTex } from './engine.js';
import { solid, addCollider, onLevelReset } from './world.js';
import { makeLabel, puff, chips, confetti } from './fx.js';

export const PIT = { x0: -59.6, z0: 192, n: 5, depth: 4 };
const N = PIT.n, DEP = PIT.depth, X0 = PIT.x0, Z0 = PIT.z0;
const ROOM = { i0: 1, i1: 3, j0: 1, j1: 3, d: 3 };              // шахта: клетки и глубина
export const HATCH = { x: X0 + 2.5, z: Z0 + 2.5, y: -ROOM.d };   // люк — на дне шахты, посередине
export const SHOVEL = { x: X0 + 2.5, z: Z0 - 2.2 };
export const BUNKER_OUT = { x: X0 + 2.5, z: Z0 - 1.4, face: 0 };  // куда выходишь из бункера — на край шахты
// виды земли: 0 — трава, 1 — земля, 2 — глина, 3 — камень
export const KIND = [
  { c: 0x6fd04a, hp: 1, chip: 0x4cc23a },
  { c: 0x8a5a2b, hp: 1, chip: 0x6a4020 },
  { c: 0xc0743a, hp: 2, chip: 0xa05a2a },
  { c: 0x8f8fa0, hp: 3, chip: 0x6f6f80 },
];
const kindOf = L => L === 0 ? 0 : L <= 2 ? 1 : 2;

let st = null;
onLevelReset(() => { st = null; });
// сохранение: e — глубина столбиков у входа, open — люк откопан, g/r/f — бункер внутри (bunkerloc.js)
export function bunkerData(save) {
  if (!save.bunker || save.bunker.d !== undefined) save.bunker = { e: '0'.repeat(N * N), open: 0, g: '', r: {}, f: {} };   // d — старый вид (до переделки), начинаем заново
  return save.bunker;
}
const isRoom = (i, j) => i >= ROOM.i0 && i <= ROOM.i1 && j >= ROOM.j0 && j <= ROOM.j1;
const cellAt = (x, z) => { const i = Math.floor(x - X0), j = Math.floor(z - Z0); return i >= 0 && j >= 0 && i < N && j < N ? { i, j, k: j * N + i } : null; };
export const hash = (i, j, L) => { const s = Math.sin(i * 12.9898 + j * 78.233 + L * 37.719) * 43758.5453; return s - Math.floor(s); };
export const inPit = p => p.x > X0 - 0.5 && p.x < X0 + N + 0.5 && p.z > Z0 - 0.5 && p.z < Z0 + N + 0.5 && p.y > -DEP - 2;

// лопата: держишь кнопку или клавишу E — копает (общая для входа и бункера)
export const dig = { hold: false, tap: false };
export function digHold(on) { dig.hold = on; if (on) dig.tap = true; }
addEventListener('keydown', e => { if (e.code === 'KeyE' && !e.repeat && e.target?.tagName !== 'INPUT') digHold(true); });
addEventListener('keyup', e => { if (e.code === 'KeyE') digHold(false); });
addEventListener('pointerup', () => digHold(false)); addEventListener('pointercancel', () => digHold(false));

export function buildBunker(w, save, who) {
  const B = bunkerData(save);
  st = { save, who, d: [...B.e].map(Number), cols: [], hp: new Map(), t: 0, dig: null, sparkT: 0, pct: -1, said: {}, hatch: null, label: null };
  while (st.d.length < N * N) st.d.push(0);
  const X1 = X0 + N, Z1 = Z0 + N, mx = (X0 + X1) / 2, mz = (Z0 + Z1) / 2;
  // дно и стенки ямы снаружи — твёрдые, чтобы не уйти под землю
  solid(w, N + 2, 1, N + 2, 0x4a4a55, mx, -DEP - 1, mz);
  for (const [y0, y1, c] of [[-3, -1, KIND[1].c], [-DEP - 1, -3, KIND[2].c]]) {
    const h = y1 - y0;
    solid(w, N + 2, h, 1, c, mx, y0, Z0 - 0.5); solid(w, N + 2, h, 1, c, mx, y0, Z1 + 0.5);
    solid(w, 1, h, N, c, X0 - 0.5, y0, mz); solid(w, 1, h, N, c, X1 + 0.5, y0, mz);
  }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++)
    st.cols.push(addCollider({ x0: X0 + i, x1: X0 + i + 1, z0: Z0 + j, z1: Z0 + j + 1, y0: -DEP - 1, y1: -st.d[j * N + i], cam: true }));   // cam — камера в яме упирается в стенки
  st.mesh = new T.InstancedMesh(BOX, new T.MeshLambertMaterial({ map: studTex }), N * N * DEP);
  st.mesh.frustumCulled = false; st.mesh.castShadow = st.mesh.receiveShadow = true; st.mesh.userData.dynamic = true;
  scene.add(st.mesh);
  redraw();
  st.mark = new T.Mesh(BOX, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false }));
  st.mark.scale.setScalar(1.04); st.mark.visible = false; st.mark.userData.dynamic = true; scene.add(st.mark);
  st.label = makeLabel(6.4, 1.5); st.label.position.set(mx, 4, mz); scene.add(st.label);
  if (!save.tools.shovel) {
    const g = group(scene, SHOVEL.x, 0, SHOVEL.z); g.userData.dynamic = true;
    box(g, 1.3, 0.35, 1.0, KIND[1].c, 0, 0.17, 0); box(g, 0.8, 0.25, 0.6, 0x9a6a3b, 0.15, 0.45, 0.05);
    const sh = group(g, 0, 0.3, 0); sh.rotation.z = 0.25;
    box(sh, 0.5, 0.6, 0.08, 0x9aa4ad, 0, 0.25, 0); box(sh, 0.12, 1.5, 0.12, 0x8a5a2b, 0, 1.25, 0); box(sh, 0.45, 0.12, 0.12, 0x6a3f1e, 0, 2.0, 0);
    const lb = makeLabel(5.4, 1.2); lb.position.set(SHOVEL.x, 3.2, SHOVEL.z); scene.add(lb); lb.userData.set('⛏️ Лопата — бери и копай!', { color: '#ffe14d' });
    st.shovel = { g, lb };
  }
  if (B.open) buildHatch(); else buildFrame();
  setLabel();
}

const M4 = new T.Matrix4(), COL = new T.Color();
function redraw() {
  const d = st.d, top = (i, j) => (i < 0 || j < 0 || i >= N || j >= N) ? 0 : d[j * N + i];
  let n = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    for (let L = d[j * N + i]; L < DEP; L++) {
      if (!(L === d[j * N + i] || top(i - 1, j) > L || top(i + 1, j) > L || top(i, j - 1) > L || top(i, j + 1) > L)) continue;
      M4.makeTranslation(X0 + i + 0.5, -L - 0.5, Z0 + j + 0.5); st.mesh.setMatrixAt(n, M4);
      COL.setHex(KIND[kindOf(L)].c).multiplyScalar(0.9 + hash(i, j, L) * 0.18); st.mesh.setColorAt(n, COL);
      n++;
    }
  }
  st.mesh.count = n; st.mesh.instanceMatrix.needsUpdate = true; if (st.mesh.instanceColor) st.mesh.instanceColor.needsUpdate = true;
}
function progress() {
  let s = 0;
  for (let j = ROOM.j0; j <= ROOM.j1; j++) for (let i = ROOM.i0; i <= ROOM.i1; i++) s += Math.min(st.d[j * N + i], ROOM.d);
  return s / ((ROOM.i1 - ROOM.i0 + 1) * (ROOM.j1 - ROOM.j0 + 1) * ROOM.d);
}
function setLabel() {
  if (bunkerData(st.save).open) { st.label.userData.set(`🛡️ Бункер ${st.who === 'mama' ? 'Юли' : 'Моти'}`, { color: '#ffe14d' }); return; }
  const pct = Math.floor(progress() * 100); if (pct === st.pct) return; st.pct = pct;
  st.label.userData.set(pct ? `🛡️ Вход в бункер: ${pct}%` : '🛡️ Тут спрятан бункер!', { color: '#ffe14d' });
}
// жёлтая рамка: куда и насколько глубоко копать
function buildFrame() {
  const g = group(scene); g.userData.dynamic = true; st.frame = g;
  const m = new T.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85 });
  const x0 = X0 + ROOM.i0, x1 = X0 + ROOM.i1 + 1, z0 = Z0 + ROOM.j0, z1 = Z0 + ROOM.j1 + 1, F = -ROOM.d, t = 0.09;
  const W = x1 - x0, D = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const bar = (w, h, d, x, y, z) => { const b = new T.Mesh(BOX, m); b.scale.set(w, h, d); b.position.set(x, y, z); g.add(b); };
  for (const y of [0.04, F + 0.04]) { bar(W, t, t, cx, y, z0); bar(W, t, t, cx, y, z1); bar(t, t, D, x0, y, cz); bar(t, t, D, x1, y, cz); }
  for (const x of [x0, x1]) for (const z of [z0, z1]) bar(t, -F, t, x, F / 2, z);
}
// стальной круглый люк с колесом-вентилем, жёлто-чёрная окантовка; над ним мерцают искорки
function buildHatch() {
  if (st.frame) { scene.remove(st.frame); st.frame = null; }
  const g = group(scene, HATCH.x, HATCH.y, HATCH.z); g.userData.dynamic = true;
  hatchModel(g);
  st.hatch = { g, wheel: g.userData.wheel, t: 0 };
}
// модель люка (и у входа, и внизу, в прихожей бункера)
export function hatchModel(g) {
  const cyl = (r, h, c, y, seg = 24) => { const m = new T.Mesh(new T.CylinderGeometry(r, r, h, seg), new T.MeshLambertMaterial({ color: c })); m.position.y = y; m.receiveShadow = true; g.add(m); return m; };
  cyl(1.35, 0.1, 0x2b2b2b, 0.05); cyl(1.25, 0.12, 0xffd23f, 0.07, 12);       // окантовка
  cyl(1.0, 0.14, 0x7d8590, 0.2);
  const wheel = group(g, 0, 0.55, 0);
  const ring = new T.Mesh(new T.TorusGeometry(0.55, 0.08, 6, 20), new T.MeshLambertMaterial({ color: 0xd84a3a })); ring.rotation.x = Math.PI / 2; wheel.add(ring);
  for (let k = 0; k < 3; k++) { const s = box(wheel, 1.1, 0.07, 0.07, 0xd84a3a, 0, 0, 0); s.rotation.y = k * Math.PI / 3; }
  box(wheel, 0.18, 0.18, 0.18, 0x5a6068, 0, 0, 0);
  g.userData.wheel = wheel;
  return g;
}

function canDig(c) {
  const d = st.d[c.k]; if (d >= DEP) return false;
  if (isRoom(c.i, c.j)) return !bunkerData(st.save).open && d < ROOM.d;   // дно шахты (где люк) глубже не копаем
  return true;
}
// кнопки у входа: ⛏️ копать (держать), ⬆️ вылезти
export function bunkerItems(hero) {
  if (!st || hero.climb || !st.save.tools.shovel) return [];
  const p = hero.pos, near = p.x > X0 - 2.5 && p.x < X0 + N + 2.5 && p.z > Z0 - 2.5 && p.z < Z0 + N + 2.5 && p.y < 1;
  if (!near) return [];
  const list = [{ id: 'g_dig', icon: '⛏️', hold: digHold }];
  if (p.y < -1.6) list.push({ id: 'g_up', icon: '⬆️' });
  return list;
}
export function climbOut(hero) {
  if (!st || hero.climb) return false;
  const p = hero.pos;
  const opts = [[p.x - X0, X0 - 0.8, p.z], [X0 + N - p.x, X0 + N + 0.8, p.z], [p.z - Z0, p.x, Z0 - 0.8], [Z0 + N - p.z, p.x, Z0 + N + 0.8]].sort((a, b) => a[0] - b[0]);
  hero.climb = { from: p.clone(), to: new T.Vector3(opts[0][1], 0, opts[0][2]), t: 0 }; hero.vel.set(0, 0, 0);
  return true;
}

// раз в кадр (на базе). События: { sfx, coins, say, shovel, dug, open, enter }
export function updateBunker(dt, hero, save) {
  const ev = { sfx: [], coins: 0 };
  if (!st) return ev;
  st.t += dt;
  const p = hero.pos, B = bunkerData(save);
  if (st.shovel) {
    st.shovel.g.position.y = Math.abs(Math.sin(st.t * 2)) * 0.12;
    if (Math.hypot(p.x - SHOVEL.x, p.z - SHOVEL.z) < 1.7 && Math.abs(p.y) < 1.2) {
      save.tools.shovel = true; scene.remove(st.shovel.g); scene.remove(st.shovel.lb); st.shovel = null;
      confetti(p.clone(), 40); ev.shovel = true;
    }
  }
  const has = !!save.tools.shovel;
  const inArea = p.x > X0 - 2 && p.x < X0 + N + 2 && p.z > Z0 - 2 && p.z < Z0 + N + 2 && p.y > -DEP - 1 && p.y < 1;
  hero.digTool = has && (inArea || st.dig) ? 'shovel' : null;
  hero.camFloor = inPit(p) && p.y < -0.3 ? Math.min(0.4, p.y + 1.2) : undefined;

  // что копнём: кубик перед собой (от ног до головы), иначе — под ногами
  let tg = null;
  if (has && inArea && hero.grounded && !hero.climb) {
    const f = cellAt(p.x + Math.sin(hero.face) * 0.95, p.z + Math.cos(hero.face) * 0.95), h = cellAt(p.x, p.z);
    if (f && (!h || f.k !== h.k) && -st.d[f.k] >= p.y - 0.25 && -st.d[f.k] <= p.y + 3.05 && canDig(f)) tg = { ...f, down: false };
    else if (h && Math.abs(-st.d[h.k] - p.y) < 0.3 && canDig(h)) tg = { ...h, down: true };
  }
  st.mark.visible = !!tg && !st.dig;
  if (tg) st.mark.position.set(X0 + tg.i + 0.5, -st.d[tg.k] - 0.5, Z0 + tg.j + 0.5);
  if (st.dig) {
    const D = st.dig; D.t = Math.min(1, D.t + dt / 0.42);
    if (!D.hit && D.t >= 0.55) { D.hit = true; hit(D.tg, hero, ev); }
    if (D.t >= 1) st.dig = null;
  } else if (inArea && (dig.hold || dig.tap)) {
    if (tg) { st.dig = { t: 0, tg, hit: false }; if (!tg.down) { hero.face = Math.atan2(X0 + tg.i + 0.5 - p.x, Z0 + tg.j + 0.5 - p.z); hero.model.root.rotation.y = hero.face; } }
    else if (dig.tap && has && hero.grounded) {
      const h = cellAt(p.x, p.z);
      if (h && isRoom(h.i, h.j) && st.d[h.k] >= ROOM.d && !B.open) ev.say = '🛡️ Глубже не надо!<small>докопай остальные клетки в жёлтой рамке — там люк</small>';
    }
  }
  if (inArea) dig.tap = false;
  hero.dig = st.dig;

  // люк: колесо крутится, сверху мерцают искорки; встал на него — в бункер
  if (st.hatch) {
    st.hatch.wheel.rotation.y += dt * 0.8;
    if ((st.sparkT -= dt) <= 0) { st.sparkT = 0.35; puff('✨', new T.Vector3(HATCH.x + (Math.random() - 0.5) * 2, HATCH.y + 0.6 + Math.random(), HATCH.z + (Math.random() - 0.5) * 2), { size: 0.5, rise: 0.8, life: 0.9 }); }
    if (!hero.climb && hero.grounded && p.y < HATCH.y + 0.6 && Math.hypot(p.x - HATCH.x, p.z - HATCH.z) < 1.1) ev.enter = true;
  }
  return ev;
}

function hit(tg, hero, ev) {
  if (!canDig(tg)) return;
  const k = tg.k, L = st.d[k], K = KIND[kindOf(L)], B = bunkerData(st.save);
  const pos = new T.Vector3(X0 + tg.i + 0.5, -L - 0.2, Z0 + tg.j + 0.5), floor = -L - 1 + 0.05;
  chips(pos, K.chip, 6, floor); ev.sfx.push('dig');
  const left = (st.hp.get(k) ?? K.hp) - 1;
  if (left > 0) { st.hp.set(k, left); return; }
  st.hp.delete(k);
  st.d[k] = L + 1; st.cols[k].y1 = -(L + 1); B.e = st.d.join('');
  chips(pos, K.c, 10, floor);
  if (tg.down) { hero.pos.x += (X0 + tg.i + 0.5 - hero.pos.x) * 0.7; hero.pos.z += (Z0 + tg.j + 0.5 - hero.pos.z) * 0.7; }
  redraw(); ev.dug = true;
  if (kindOf(L) && Math.random() < 0.25) { ev.coins += 1 + Math.floor(Math.random() * 2); puff('coin', pos.clone().setY(pos.y + 1), { size: 0.8, rise: 1.4 }); }
  if (!B.open) {
    const was = st.pct; setLabel();
    if (was < 50 && st.pct >= 50 && !st.said[50]) { st.said[50] = 1; ev.say = '🛡️ Половина!<small>копай дальше в жёлтой рамке — там что-то железное…</small>'; }
    if (progress() >= 1) { B.open = 1; buildHatch(); setLabel(); ev.open = true; confetti(new T.Vector3(HATCH.x, HATCH.y, HATCH.z), 120); }
  }
}
