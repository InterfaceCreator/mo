// Бункер 🛡️ — отдельная подземная локация (вход — люк на даче, bunker.js). Вид сверху, «в разрезе», без потолка.
// Всё под землёй засыпано: комнаты за бетонными стенами полны земли, между ними — земля, глина и камень.
// Лопатой ⛏️ (держать кнопку / клавиша E) раскапываешь проходы и комнаты. Откопал комнату целиком — она «оживает»:
//   🛏️ Спальня (двухъярусные кровати), 🍳 Кухня, 📡 Штаб (экран, рация, красная кнопка тревоги 🚨),
//   📦 Склад (сундук с монетами раз в 10 минут), 🦕 Музей (скелет динозавра — когда найдены 3 кости 🦴),
//   💰 Сокровищница (за камнем — клад), 🤸 Игровая (батут и бассейн с шариками), 🚙 Гараж (вездеход).
// Кости динозавра спрятаны в земле проходов — рядом с ними из земли сыплются искорки ✨.
// В прихожей — лестница наверх, на дачу. Сохранение: save.bunker.g — какие клетки выкопаны, r — откопанные комнаты, f — находки.
import { T, scene, group, box, BOX, studTex, mat } from './engine.js';
import { solid, addCollider, onLevelReset, door } from './world.js';
import { makeLabel, puff, chips, confetti } from './fx.js';
import { addChest } from './craft.js';
import { addPad } from './fun.js';
import { bunkerData, hash, dig, digHold, BUNKER_OUT } from './bunker.js';

const S = 1.5, GW = 28, GH = 22, WH = 3, X0 = -GW * S / 2, Z0 = -GH * S / 2;
const cx = i => X0 + (i + 0.5) * S, cz = j => Z0 + (j + 0.5) * S;
// материалы: 0 — пусто, 1 — бетон (не копается), 2 — земля, 3 — глина, 4 — камень
const MAT = { 2: { c: 0x8a5a2b, hp: 2, chip: 0x6a4020 }, 3: { c: 0xc0743a, hp: 3, chip: 0xa05a2a }, 4: { c: 0x8f8fa0, hp: 4, chip: 0x6f6f80 } };
export const ROOMS = [
  { id: 'hall', name: 'Прихожая', icon: '🚪', i0: 11, i1: 16, j0: 18, j1: 20, open: true, doors: [[13, 17], [14, 17], [10, 19], [17, 19]] },
  { id: 'sleep', name: 'Спальня', icon: '🛏️', i0: 2, i1: 7, j0: 10, j1: 14, doors: [[4, 9], [5, 9], [8, 12]] },
  { id: 'hq', name: 'Штаб', icon: '📡', i0: 11, i1: 16, j0: 10, j1: 14, doors: [[13, 9], [14, 9], [13, 15], [14, 15], [10, 12], [17, 12]] },
  { id: 'food', name: 'Кухня', icon: '🍳', i0: 20, i1: 25, j0: 10, j1: 14, doors: [[22, 9], [23, 9], [19, 12]] },
  { id: 'play', name: 'Игровая', icon: '🤸', i0: 2, i1: 7, j0: 18, j1: 20, doors: [[4, 17], [5, 17], [8, 19]] },
  { id: 'garage', name: 'Гараж', icon: '🚙', i0: 20, i1: 25, j0: 18, j1: 20, doors: [[22, 17], [23, 17], [19, 19]] },
  { id: 'store', name: 'Склад', icon: '📦', i0: 2, i1: 7, j0: 2, j1: 6, doors: [[8, 4], [8, 5], [4, 7], [5, 7]] },
  { id: 'museum', name: 'Музей', icon: '🦕', i0: 20, i1: 25, j0: 2, j1: 6, doors: [[19, 4], [19, 5], [22, 7], [23, 7]] },
  { id: 'gold', name: 'Сокровищница', icon: '💰', i0: 12, i1: 15, j0: 2, j1: 5, hard: true, doors: [[13, 6], [14, 6]] },
];
const BONE_CELLS = [{ id: 'bone1', i: 9, j: 3 }, { id: 'bone2', i: 18, j: 13 }, { id: 'bone3', i: 5, j: 16 }];
export const BONES = BONE_CELLS.length;
export const ROOM_COINS = 40, KLAD = { coins: 150, crystal: 3 }, ALL_COINS = 300;
export const BUNKER_SPAWN = { x: cx(13.5), z: cz(18.6), face: Math.PI };
export const bonesFound = save => BONE_CELLS.filter(b => bunkerData(save).f[b.id]).length;

// план бункера: материал каждой клетки и номер комнаты (−1 — проход)
const PLAN = (() => {
  const t = new Array(GW * GH), room = new Array(GW * GH).fill(-1);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const r = hash(i, j, 7), k = j * GW + i;
    t[k] = (i === 0 || j === 0 || i === GW - 1 || j === GH - 1) ? 1 : r < 0.12 + (j < 8 ? 0.2 : 0) ? 4 : r < 0.4 ? 3 : 2;
  }
  ROOMS.forEach((R, ri) => {
    for (let j = R.j0 - 1; j <= R.j1 + 1; j++) for (let i = R.i0 - 1; i <= R.i1 + 1; i++) {
      const k = j * GW + i, inside = i >= R.i0 && i <= R.i1 && j >= R.j0 && j <= R.j1;
      if (inside) { t[k] = R.open ? 0 : R.hard ? 4 : 2; room[k] = ri; } else t[k] = 1;
    }
  });
  ROOMS.forEach(R => { for (const [i, j] of R.doors) t[j * GW + i] = R.hard ? 4 : 2; });
  for (const b of BONE_CELLS) t[b.j * GW + b.i] = 2;
  return { t, room };
})();

let st = null;
onLevelReset(() => { st = null; });
const dugAt = k => st.dug[k] === 1;
const isOpen = k => PLAN.t[k] === 0 || dugAt(k);
const isEarth = k => PLAN.t[k] >= 2 && !dugAt(k);
const cellAt = (x, z) => { const i = Math.floor((x - X0) / S), j = Math.floor((z - Z0) / S); return i >= 0 && j >= 0 && i < GW && j < GH ? { i, j, k: j * GW + i } : null; };
const rect = R => ({ x0: X0 + R.i0 * S, x1: X0 + (R.i1 + 1) * S, z0: Z0 + R.j0 * S, z1: Z0 + (R.j1 + 1) * S });

export function buildBunkerLoc(save, who) {
  const w = group(scene), B = bunkerData(save);
  const g0 = B.g || '';
  st = { save, who, w, dug: Array.from({ length: GW * GH }, (_, k) => g0[k] === '1' ? 1 : 0), cols: [], hp: new Map(), dig: null, t: 0, sparkT: 0,
    labels: [], rooms: [], alarm: 0, alarmPad: null, lights: [], blink: [] };
  // пол и бетонные стены
  solid(w, GW * S, 1, GH * S, 0x3f342a, 0, -1, 0, { studs: false });   // южная внешняя стена — низкая: камера обычно смотрит с юга
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) if (PLAN.t[j * GW + i] === 1) solid(w, S, j === GH - 1 ? 0.8 : WH, S, (i + j) % 2 ? 0xa8acb4 : 0x9ea2aa, cx(i), 0, cz(j));
  // земля: у каждой клетки свой твёрдый блок, кубики рисуются одним мешем
  for (let k = 0; k < GW * GH; k++) {
    const i = k % GW, j = (k - i) / GW;
    st.cols.push(PLAN.t[k] >= 2 ? addCollider({ x0: X0 + i * S, x1: X0 + (i + 1) * S, z0: Z0 + j * S, z1: Z0 + (j + 1) * S, y0: 0, y1: WH, off: dugAt(k) }) : null);
  }
  st.mesh = new T.InstancedMesh(BOX, new T.MeshLambertMaterial({ map: studTex }), GW * GH * 2);
  st.mesh.frustumCulled = false; st.mesh.receiveShadow = true; st.mesh.userData.dynamic = true;
  scene.add(st.mesh);
  redraw();
  st.mark = new T.Mesh(BOX, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false }));
  st.mark.scale.set(S * 1.03, WH * 1.01, S * 1.03); st.mark.visible = false; st.mark.userData.dynamic = true; scene.add(st.mark);
  // комнаты: подписи с процентами, откопанные — с мебелью
  ROOMS.forEach((R, ri) => {
    const q = rect(R), lb = makeLabel(5.6, 1.3); lb.position.set((q.x0 + q.x1) / 2, WH + 1.8, (q.z0 + q.z1) / 2); scene.add(lb);
    st.labels[ri] = lb; st.rooms[ri] = { pct: -1, built: false };
    if (R.open || B.r[R.id]) furnish(ri);
    roomLabel(ri);
  });
  return w;
}

const M4 = new T.Matrix4(), COL = new T.Color(), V1 = new T.Vector3(), Q0 = new T.Quaternion(), SC = new T.Vector3(S, S, S);
function redraw() {
  let n = 0;
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const k = j * GW + i; if (!isEarth(k)) continue;
    const side = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const ii = i + a, jj = j + b; return ii >= 0 && jj >= 0 && ii < GW && jj < GH && isOpen(jj * GW + ii); });
    for (let L = side ? 0 : 1; L < 2; L++) {
      M4.compose(V1.set(cx(i), S * (L + 0.5), cz(j)), Q0, SC); st.mesh.setMatrixAt(n, M4);
      COL.setHex(MAT[PLAN.t[k]].c).multiplyScalar((0.88 + hash(i, j, L) * 0.2) * (L === 1 ? 0.92 : 1)); st.mesh.setColorAt(n, COL);
      n++;
    }
  }
  st.mesh.count = n; st.mesh.instanceMatrix.needsUpdate = true; if (st.mesh.instanceColor) st.mesh.instanceColor.needsUpdate = true;
}
function roomPct(ri) {
  const R = ROOMS[ri]; if (R.open) return 1;
  let a = 0, b = 0;
  for (let j = R.j0; j <= R.j1; j++) for (let i = R.i0; i <= R.i1; i++) { b++; if (dugAt(j * GW + i)) a++; }
  return a / b;
}
function roomLabel(ri) {
  const R = ROOMS[ri], done = st.rooms[ri].built, pct = Math.floor(roomPct(ri) * 100);
  if (st.rooms[ri].pct === pct && st.rooms[ri].shown === done) return;
  st.rooms[ri].pct = pct; st.rooms[ri].shown = done;
  const txt = R.id === 'hall' ? '🚪 Прихожая · копай дальше ⛏️' : done ? `${R.icon} ${R.name}` : `${R.icon} ${R.name} · ${pct}%`;
  st.labels[ri].userData.set(txt, { color: done ? '#ffffff' : '#ffe14d' });
}

// кнопка ⛏️ в бункере
export function bunkerLocItems(hero) {
  if (!st || hero.climb || !st.save.tools.shovel) return [];
  return [{ id: 'g_dig', icon: '⛏️', hold: digHold }];
}

// раз в кадр. События: { sfx, coins, got, say, room, bone, all, alarm }
export function updateBunkerLoc(dt, hero, save) {
  const ev = { sfx: [], coins: 0, got: {} };
  if (!st) return ev;
  st.t += dt;
  const p = hero.pos, B = bunkerData(save), has = !!save.tools.shovel;
  hero.digTool = has ? 'shovel' : null;
  // цель — клетка земли прямо перед героем
  let tg = null;
  if (has && hero.grounded && !hero.climb) {
    for (const d of [1.0, 0.7]) { const c = cellAt(p.x + Math.sin(hero.face) * d, p.z + Math.cos(hero.face) * d); if (c && isEarth(c.k)) { tg = c; break; } }
  }
  st.mark.visible = !!tg && !st.dig;
  if (tg) st.mark.position.set(cx(tg.i), WH / 2, cz(tg.j));
  if (st.dig) {
    const D = st.dig; D.t = Math.min(1, D.t + dt / 0.42);
    if (!D.hit && D.t >= 0.55) { D.hit = true; hit(D.tg, ev); }
    if (D.t >= 1) st.dig = null;
  } else if ((dig.hold || dig.tap) && tg) {
    st.dig = { t: 0, tg, hit: false };
    hero.face = Math.atan2(cx(tg.i) - p.x, cz(tg.j) - p.z); hero.model.root.rotation.y = hero.face;
  } else if (dig.tap && has && !tg) ev.say = '⛏️ Подойди к стенке из земли<small>и встань к ней лицом — бетон лопатой не взять</small>';
  dig.tap = false;
  hero.dig = st.dig;

  // искорки у спрятанных костей
  if ((st.sparkT -= dt) <= 0) {
    st.sparkT = 0.45;
    for (const b of BONE_CELLS) {
      if (B.f[b.id]) continue;
      const x = cx(b.i), z = cz(b.j);
      if (Math.hypot(p.x - x, p.z - z) < 6) puff('✨', new T.Vector3(x + (Math.random() - 0.5) * 1.6, WH * Math.random(), z + (Math.random() - 0.5) * 1.6), { size: 0.55, rise: 0.6, life: 0.9 });
    }
  }
  // штаб: экран и рация мигают; красная кнопка — тревога 🚨
  for (const b of st.blink) b.m.material.color.setHex(Math.sin(st.t * b.f + b.o) > 0 ? b.on : b.off);
  if (st.alarmPad) {
    const A = st.alarmPad, on = Math.hypot(p.x - A.x, p.z - A.z) < 0.8 && p.y < 0.6;
    if (on && !A.was && st.alarm <= 0) { st.alarm = 4; ev.alarm = true; }
    A.was = on; A.top.position.y = on ? 0.12 : 0.2;
  }
  if (st.alarm > 0) {
    st.alarm -= dt; const red = Math.sin(st.alarm * 14) > 0;
    for (const l of st.lights) l.material.color.setHex(st.alarm > 0 && red ? 0xff2a2a : l.userData.c);
  }
  return ev;
}

function give(ev, k, n) { ev.got[k] = (ev.got[k] || 0) + n; st.save.res[k] = (st.save.res[k] || 0) + n; }
function hit(tg, ev) {
  const k = tg.k; if (!isEarth(k)) return;
  const M = MAT[PLAN.t[k]], B = bunkerData(st.save), pos = new T.Vector3(cx(tg.i), 1.6, cz(tg.j));
  chips(pos, M.chip, 7); ev.sfx.push(PLAN.t[k] === 4 ? 'mine' : 'dig');
  const left = (st.hp.get(k) ?? M.hp) - 1;
  if (left > 0) { st.hp.set(k, left); return; }
  st.hp.delete(k);
  st.dug[k] = 1; st.cols[k].off = true; B.g = st.dug.join('');
  chips(pos, M.c, 14); redraw(); ev.dug = true;
  // находки
  const bone = BONE_CELLS.find(b => b.i === tg.i && b.j === tg.j && !B.f[b.id]);
  if (bone) {
    B.f[bone.id] = 1; ev.bone = bonesFound(st.save); confetti(pos.clone().setY(0), 60); puff('🦴', pos.clone().setY(2.6), { size: 1.6, rise: 1.2, life: 1.8 });
    const mi = ROOMS.findIndex(R => R.id === 'museum'); if (st.rooms[mi].built) refreshMuseum(mi);
  } else {
    const r = Math.random(), t = PLAN.t[k];
    if (t === 4) { if (r < 0.08) give(ev, 'crystal', 1); else if (r < 0.45) give(ev, 'stone', 1); else if (r < 0.7) ev.coins += 3 + Math.floor(Math.random() * 3); }
    else if (r < 0.3) ev.coins += 1 + Math.floor(Math.random() * (t === 3 ? 3 : 2));
    if (ev.coins) puff('coin', pos.clone().setY(2.4), { size: 0.9, rise: 1.4 });
    for (const rk of Object.keys(ev.got)) puff(rk === 'crystal' ? '💎' : '🪨', pos.clone().setY(2.8), { size: 0.9, rise: 1.4 });
  }
  // комната откопана?
  const ri = PLAN.room[k];
  if (ri >= 0) {
    roomLabel(ri);
    if (roomPct(ri) >= 1 && !B.r[ROOMS[ri].id]) {
      const R = ROOMS[ri]; B.r[R.id] = 1; furnish(ri); roomLabel(ri); ev.room = R;
      const q = rect(R); confetti(new T.Vector3((q.x0 + q.x1) / 2, 0, (q.z0 + q.z1) / 2), 120);
      ev.coins += ROOM_COINS;
      if (R.id === 'gold') { ev.coins += KLAD.coins; give(ev, 'crystal', KLAD.crystal); }
      if (ROOMS.every(x => x.open || B.r[x.id])) { ev.all = true; ev.coins += ALL_COINS; }
    }
  }
}

// ---------- мебель ----------
const glow = c => { const m = new T.MeshBasicMaterial({ color: c }); return m; };
function lamp(g, x, z, face) {                     // светильник на стене: face — куда смотрит (по x или z)
  const m = box(g, face.x ? 0.12 : 0.9, 0.35, face.z ? 0.12 : 0.9, 0xfff2a0, x, 2.4, z, { shadow: false }); m.material = glow(0xfff2a0); m.userData.c = 0xfff2a0;
  st.lights.push(m); return m;
}
function furnish(ri) {
  const R = ROOMS[ri]; if (st.rooms[ri].built) return; st.rooms[ri].built = true;
  const q = rect(R), W = q.x1 - q.x0, D = q.z1 - q.z0, mx = (q.x0 + q.x1) / 2, mz = (q.z0 + q.z1) / 2;
  const g = group(scene); g.userData.dynamic = true; st.rooms[ri].g = g;
  const floor = (c, c2) => { for (let a = 0; a < W / S; a++) for (let b = 0; b < D / S; b++) box(g, S - 0.04, 0.05, S - 0.04, (a + b) % 2 && c2 ? c2 : c, q.x0 + (a + 0.5) * S, 0.03, q.z0 + (b + 0.5) * S, { shadow: false }); };
  lamp(g, q.x0 + 0.08, q.z0 + 1.1, { x: 1 }); lamp(g, q.x1 - 0.08, q.z0 + 1.1, { x: 1 }); lamp(g, q.x0 + 1.1, q.z0 + 0.08, { z: 1 }); lamp(g, q.x1 - 1.1, q.z0 + 0.08, { z: 1 });   // по углам — не в дверных проёмах
  const solidBox = (w, h, d, c, x, y, z) => { box(g, w, h, d, c, x, y + h / 2, z); addCollider({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y0: y, y1: y + h }); };
  if (R.id === 'hall') {
    floor(0x6a6e76, 0x5e626a);
    // лестница наверх (на дачу) у западной стены, в углу; сверху льётся свет
    const lx = q.x0 + 0.3, lz = cz(20);
    for (const sz of [-0.6, 0.6]) box(g, 0.14, 6, 0.14, 0x8a5a2b, lx, 3, lz + sz, { shadow: false });
    for (let y = 0.5; y < 6; y += 0.55) box(g, 0.1, 0.1, 1.2, 0xa0703f, lx, y, lz, { shadow: false });
    const beam = new T.Mesh(new T.CylinderGeometry(1.0, 1.3, 7, 16, 1, true), new T.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, depthWrite: false, side: T.DoubleSide }));
    beam.position.set(lx + 0.8, 3.5, lz); g.add(beam);
    door({ x: q.x0 + 0.7, z: lz, w: 1.6, side: true, to: 'base', label: '🏡 Дача', spawn: BUNKER_OUT });
    const ul = makeLabel(4.2, 1.0); ul.position.set(lx + 0.6, 4.2, lz); scene.add(ul); ul.userData.set('⬆️ Наверх, на дачу', { color: '#ffffff' });
    solidBox(2.6, 0.5, 0.7, 0x8a5a2b, q.x1 - 2, 0, q.z1 - 0.6);                                   // скамейка
    for (let k = 0; k < 3; k++) box(g, 0.12, 0.12, 0.4, 0x3a3f48, q.x1 - 2.4 + k * 0.6, 2.2, q.z0 + 0.25);   // крючки и каски
    for (let k = 0; k < 2; k++) box(g, 0.5, 0.3, 0.5, 0x5a7a3a, q.x1 - 2.1 + k * 0.6, 2.0, q.z0 + 0.4);
  } else if (R.id === 'sleep') {
    floor(0x9c6a3c, 0x8f6234);
    for (const bx of [q.x0 + 1.4, q.x0 + 4.4]) {                                                  // двухъярусные кровати у северной стены
      for (const y of [0, 1.6]) { box(g, 1.6, 0.35, 3, 0x6a7a8a, bx, y + 0.5, q.z0 + 1.6); box(g, 1.5, 0.22, 2.9, 0xffffff, bx, y + 0.78, q.z0 + 1.6); box(g, 1.52, 0.24, 1.6, y ? 0xff5a8a : 0x3a6ad8, bx, y + 0.8, q.z0 + 2.2); box(g, 1.1, 0.25, 0.55, 0xfff2c8, bx, y + 0.95, q.z0 + 0.5); }
      for (const [dx, dz] of [[-0.75, 0.15], [0.75, 0.15], [-0.75, 3.05], [0.75, 3.05]]) box(g, 0.12, 3.2, 0.12, 0x4a5a6a, bx + dx, 1.6, q.z0 + dz);
      addCollider({ x0: bx - 0.8, x1: bx + 0.8, z0: q.z0 + 0.1, z1: q.z0 + 3.1, y0: 0, y1: 3.2 });
    }
    box(g, 3.4, 0.04, 2.4, 0x4ab0a0, mx + 1, 0.06, q.z1 - 2, { shadow: false });                   // коврик
    const ted = group(g, q.x1 - 1, 0, q.z1 - 1.2); box(ted, 0.6, 0.7, 0.45, 0xa0703f, 0, 0.35, 0); box(ted, 0.5, 0.45, 0.45, 0xb07a4a, 0, 0.95, 0); for (const s of [-1, 1]) box(ted, 0.16, 0.16, 0.1, 0x8a5a2b, s * 0.2, 1.2, 0);   // мишка
  } else if (R.id === 'food') {
    floor(0xffffff, 0xe84a4a);
    solidBox(2.4, 0.12, 1.6, 0xa0703f, mx, 0.95, mz + 0.6); box(g, 2.4, 0.95, 1.6, 0x8a5a2b, mx, 0.48, mz + 0.6).scale.set(0.2, 0.95, 0.2);
    for (const [dx, dz] of [[-1.6, 0.6], [1.6, 0.6], [0, -0.7], [0, 1.9]]) box(g, 0.55, 0.6, 0.55, 0xd84a3a, mx + dx, 0.3, mz + 0.6 + dz);
    for (const [c, x] of [[0xe8e8e8, q.x0 + 0.9], [0x3a3f48, q.x0 + 2.2]]) solidBox(1.2, 1.4, 1.0, c, x, 0, q.z0 + 0.6);   // холодильник и плита
    box(g, 0.5, 0.3, 0.5, 0x9aa4ad, q.x0 + 2.2, 1.55, q.z0 + 0.6);                                                       // кастрюля
    for (let k = 0; k < 6; k++) box(g, 0.3, 0.38, 0.3, [0xd84a3a, 0x3a8ad8, 0xe8c040, 0x5ab05a][k % 4], q.x1 - 3.2 + k * 0.5, 1.75, q.z0 + 0.35, { shadow: false });
    box(g, 3.2, 0.08, 0.5, 0x8a5a2b, q.x1 - 2, 1.52, q.z0 + 0.35);
  } else if (R.id === 'hq') {
    floor(0x3a5a3a, 0x355235);
    solidBox(3.4, 1.0, 2.2, 0x6a4a2a, mx, 0, mz); box(g, 3.2, 0.05, 2.0, 0x3a8ad8, mx, 1.03, mz, { shadow: false });   // стол с картой
    for (const [x, z, w, d] of [[-0.8, -0.3, 1, 0.8], [0.7, 0.4, 0.8, 0.9], [0.2, -0.5, 0.5, 0.4]]) box(g, w, 0.03, d, 0x5ab05a, mx + x, 1.06, mz + z, { shadow: false });
    const scr = box(g, 3.6, 1.4, 0.1, 0x1a3a5a, mx, 1.9, q.z0 + 0.1, { shadow: false }); scr.material = glow(0x3ad8ff);   // экран
    st.blink.push({ m: scr, on: 0x3ad8ff, off: 0x2ab0e0, f: 2, o: 0 });
    for (let k = 0; k < 5; k++) { const l = box(g, 0.18, 0.18, 0.05, 0, q.x0 + 1 + k * 0.35, 1.4, q.z0 + 0.62, { shadow: false }); l.material = glow(0x5aff5a); st.blink.push({ m: l, on: [0x5aff5a, 0xff5a5a, 0xffd23f][k % 3], off: 0x204020, f: 3 + k, o: k }); }
    solidBox(2.2, 1.2, 0.8, 0x4a5a3a, q.x0 + 1.6, 0, q.z0 + 0.5); box(g, 0.05, 0.9, 0.05, 0x2b2b2b, q.x0 + 0.8, 1.65, q.z0 + 0.3);   // рация с антенной
    // красная кнопка тревоги
    const ax = q.x1 - 1.4, az = q.z1 - 1.4, base = new T.Mesh(new T.CylinderGeometry(0.7, 0.8, 0.12, 20), mat(0x3a3f48)); base.position.set(ax, 0.06, az); g.add(base);
    const top = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.2, 20), mat(0xff2a2a)); top.position.set(ax, 0.2, az); g.add(top);
    const al = makeLabel(2.2, 0.6); al.position.set(ax, 1.5, az); g.add(al); al.userData.set('🚨 Тревога', { color: '#ff8080' });
    st.alarmPad = { x: ax, z: az, top: base && top, was: false };
  } else if (R.id === 'store') {
    floor(0x7a7e86);
    for (const [x, z, s] of [[q.x0 + 1, q.z0 + 1, 1.2], [q.x0 + 2.3, q.z0 + 1, 1.2], [q.x0 + 1, q.z1 - 1, 1.1], [q.x1 - 1, q.z1 - 1.2, 1.2]]) {
      solidBox(s, s, s, 0xb07a3a, x, 0, z); box(g, s + 0.02, 0.12, s + 0.02, 0x8a5a2b, x, s * 0.5, z, { shadow: false });
    }
    box(g, 0.9, 0.9, 0.9, 0xc08a4a, q.x0 + 1, 1.65, q.z0 + 1);
    for (const [x, z, c] of [[q.x1 - 1, q.z0 + 1, 0x3a7a5a], [q.x1 - 2.1, q.z0 + 1, 0xd84a3a], [q.x1 - 1, q.z0 + 2.1, 0x3a6ad8]]) {
      const b = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 1.3, 14), mat(c)); b.position.set(x, 0.65, z); b.castShadow = true; g.add(b);
      addCollider({ x0: x - 0.5, x1: x + 0.5, z0: z - 0.5, z1: z + 0.5, y0: 0, y1: 1.3 });
    }
    addChest('bunker', mx + 0.5, 0, mz + 0.3);
  } else if (R.id === 'museum') {
    floor(0xe8e4dc, 0xdcd6cc);
    st.museum = g; refreshMuseum(ri);
  } else if (R.id === 'gold') {
    floor(0x6a6a72);
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4 - a; b++) for (let c = 0; c < 4 - a; c++) box(g, 0.55, 0.3, 0.55, a % 2 ? 0xffd23f : 0xffc21a, mx - 0.9 + (b + a / 2) * 0.6, 0.15 + a * 0.3, mz - 0.9 + (c + a / 2) * 0.6);   // гора золотых слитков
    addCollider({ x0: mx - 1.2, x1: mx + 1.2, z0: mz - 1.2, z1: mz + 1.2, y0: 0, y1: 1.2 });
    for (const [x, z] of [[q.x0 + 0.8, q.z0 + 0.8], [q.x1 - 0.8, q.z0 + 0.8], [q.x0 + 0.8, q.z1 - 0.8], [q.x1 - 0.8, q.z1 - 0.8]]) for (const [dx, h, r] of [[0, 1.4, 0], [0.3, 0.9, 0.4], [-0.3, 1, -0.35]]) { const c = box(g, 0.3, h, 0.3, 0x7fe8ff, x + dx, h / 2, z, { shadow: false }); c.material = glow(0x7fe8ff); c.rotation.z = r; }
  } else if (R.id === 'play') {
    floor(0xffd23f, 0x3fa7ff);
    addPad(q.x0 + 2, mz, 20);
    const px = q.x1 - 2.2, pz = mz;                                                              // бассейн с шариками
    for (const [w, d, x, z] of [[3.2, 0.2, 0, -1.5], [3.2, 0.2, 0, 1.5], [0.2, 3.2, -1.5, 0], [0.2, 3.2, 1.5, 0]]) box(g, w, 0.6, d, 0xff5a8a, px + x, 0.3, pz + z);
    for (let k = 0; k < 70; k++) box(g, 0.28, 0.28, 0.28, [0xff5a5a, 0xffd93b, 0x5fd35f, 0x3fa7ff, 0x9b6bff][k % 5], px - 1.2 + hash(k, 1, 2) * 2.4, 0.15 + hash(k, 2, 3) * 0.3, pz - 1.2 + hash(k, 3, 4) * 2.4, { shadow: false });
  } else if (R.id === 'garage') {
    floor(0x55585e);
    for (let a = 0; a < 3; a++) box(g, 0.2, 0.03, 1.2, 0xffd23f, q.x0 + 2 + a * 2.2, 0.06, mz, { shadow: false });
    const car = group(g, mx - 0.5, 0, mz); car.rotation.y = Math.PI / 2;                     // вездеход
    box(car, 2.2, 1.0, 3.6, 0x4a7a3a, 0, 1.0, 0); box(car, 2.0, 0.9, 1.8, 0x5a8a4a, 0, 1.95, -0.3); box(car, 1.9, 0.7, 0.05, 0x9fdcff, 0, 1.95, 0.62, { shadow: false });
    for (const sx of [-1, 1]) for (const sz of [-1.2, 1.2]) { const wl = new T.Mesh(new T.CylinderGeometry(0.55, 0.55, 0.45, 14), mat(0x2b2b2b)); wl.rotation.z = Math.PI / 2; wl.position.set(sx * 1.15, 0.55, sz); car.add(wl); }
    for (const sx of [-0.7, 0.7]) { const h = box(car, 0.35, 0.25, 0.05, 0xfff2a0, sx, 1.1, 1.82, { shadow: false }); h.material = glow(0xfff2a0); }
    addCollider({ x0: mx - 0.5 - 1.9, x1: mx - 0.5 + 1.9, z0: mz - 1.2, z1: mz + 1.2, y0: 0, y1: 2.4 });
    for (let k = 0; k < 3; k++) { const tr = new T.Mesh(new T.TorusGeometry(0.45, 0.18, 6, 14), mat(0x2b2b2b)); tr.rotation.x = Math.PI / 2; tr.position.set(q.x1 - 0.8, 0.18 + k * 0.36, q.z0 + 0.8); g.add(tr); }
  }
}
// музей: постаменты с найденными костями; все три — скелет динозавра
function refreshMuseum(ri) {
  const g = st.museum; if (!g) return;
  if (st.museumIn) g.remove(st.museumIn);
  const q = rect(ROOMS[ri]), mx = (q.x0 + q.x1) / 2, mz = (q.z0 + q.z1) / 2, n = bonesFound(st.save), m = group(g); st.museumIn = m;
  if (n >= BONES) skeleton(m, mx, 0, mz);
  else for (let k = 0; k < BONES; k++) {
    const x = mx - 2 + k * 2;
    box(m, 1, 1, 1, 0xc8c2b4, x, 0.5, mz);
    if (k < n) { const b = box(m, 0.9, 0.18, 0.18, 0xf4efe2, x, 1.15, mz); b.rotation.y = 0.6; box(m, 0.25, 0.25, 0.25, 0xf4efe2, x + 0.4, 1.15, mz - 0.3); box(m, 0.25, 0.25, 0.25, 0xf4efe2, x - 0.4, 1.15, mz + 0.3); }
  }
  const lb = makeLabel(3.6, 0.8); lb.position.set(mx, 3.4, q.z0 + 0.5); m.add(lb); lb.userData.set(n >= BONES ? '🦕 Мой динозавр!' : `🦴 Кости: ${n} из ${BONES}`, { color: '#ffffff' });
}
function skeleton(p, x, y, z) {
  const g = group(p, x, y, z), W = 0xf4efe2, D = 0xe0d8c4; g.scale.setScalar(1.5);
  box(g, 2.4, 0.15, 0.9, 0x6a3f1e, 0, 0.08, 0);
  for (const sx of [-0.6, 0.6]) box(g, 0.14, 1.1, 0.14, D, sx, 0.7, 0);
  box(g, 1.8, 0.16, 0.16, W, 0, 1.3, 0);
  for (let k = 0; k < 5; k++) box(g, 0.08, 0.6, 0.5, D, -0.6 + k * 0.3, 1.05, 0);
  const neck = box(g, 0.14, 0.8, 0.14, W, 1.0, 1.65, 0); neck.rotation.z = -0.5;
  box(g, 0.7, 0.35, 0.36, W, 1.35, 2.0, 0); box(g, 0.08, 0.08, 0.38, 0x2b2b2b, 1.4, 2.08, 0, { shadow: false });
  const tail = box(g, 1.2, 0.12, 0.12, W, -1.4, 1.15, 0); tail.rotation.z = 0.3;
  addCollider({ x0: x - 1.8, x1: x + 1.8, z0: z - 0.7, z1: z + 0.7, y0: 0, y1: 1 });
}
