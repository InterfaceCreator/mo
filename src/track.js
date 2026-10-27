// Дорожка: прямая трасса, звери стоят по одному друг за другом, каждый сильнее.
// Унёс яйцо зверя за свою линию — зверь бежит к линии, закручивается и исчезает, ворота к следующему открываются.
// Последний — дракон-босс с огненным яйцом. Победил дракона — в следующий раз всё начинается заново.
import { B } from './balance.js';
import { T, scene, group, box } from './engine.js';
import { C, solid, tree, portal, addCollider, clouds, onLevelReset, bake } from './world.js';
import { makeLabel, puff } from './fx.js';
import { defineNests, nestsOf, retireNest, refillNest } from './eggs.js';
import { vanishGuard } from './guards.js';

export const LINE_Z = -6;                                         // твоя линия: за ней ты в безопасности
let STAGES = B.TRACK;                                             // звери текущего круга (B.trackStages)
const HALF = 7;                                                   // трасса от x = −7 до 7
export const stageZ = k => STAGES[k].boss ? -170 : -26 - k * 22; // где стоит гнездо k-го зверя
const gateZ = k => stageZ(k) + 11;                                // ворота перед k-м зверем
const ZONE = { kind: 'track', x0: -HALF, x1: HALF, border: LINE_Z };

let st = null;                                                    // всё, что двигается на Дорожке
onLevelReset(() => { st = null; });

// линия финиша — шашечки
let checkTex = null;
function checks() {
  if (checkTex) return checkTex;
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 16; const c = cv.getContext('2d');
  for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? '#1d1d23' : '#ffffff'; c.fillRect(i * 8, j * 8, 8, 8); }
  checkTex = new T.CanvasTexture(cv); checkTex.magFilter = T.NearestFilter; return checkTex;
}
// светящаяся завеса над линией: снизу яркая, кверху тает
function glowTex() {
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 64; const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 64, 0, 0); g.addColorStop(0, 'rgba(255,225,77,1)'); g.addColorStop(1, 'rgba(255,225,77,0)');
  c.fillStyle = g; c.fillRect(0, 0, 4, 64); return new T.CanvasTexture(cv);
}

export function buildTrack(save) {
  const P = save.track || (save.track = { stage: 0, round: 1, wins: 0 });
  if (!P.round) P.round = 1;
  // победили дракона — следующий круг: звери другие и сильнее, яйца реже, босс новый
  if (P.stage >= B.TRACK.length) { P.stage = 0; P.round++; }
  STAGES = B.trackStages(P.round);
  defineNests('track', STAGES.map((S, k) => ({ x: 0, z: stageZ(k), r: S.r, guard: S.kind, s: S.boss ? 1.6 : 1, zone: ZONE, fixed: true, v0: S.v || null, chase: S.chase })));
  nestsOf('track').forEach((n, k) => {
    const S = STAGES[k];
    Object.assign(n, { r: S.r, guard: S.kind, chase: S.chase, v0: S.v || null, s: S.boss ? 1.6 : 1 });
    if (n.round !== P.round) { if (!n.away) n.has = false; n.round = P.round; }    // яйца нового круга — сразу новые
    n.off = k < P.stage; if (!n.off) refillNest(n);
  });

  const w = group(scene), END = stageZ(STAGES.length - 1) - 14;
  // земля вокруг (чуть ниже, чтобы не мерцала с трассой), трасса, разметка
  solid(w, 160, 1, 260, C.grass, 0, -1.05, -80, { studs: false });
  solid(w, HALF * 2, 1, 16 - END, 0xd9663a, 0, -1, (16 + END) / 2);
  for (let z = LINE_Z - 4; z > END + 2; z -= 6) box(w, 0.3, 0.02, 3, 0xffffff, 0, 0.01, z, { shadow: false });
  // бортики — красно-белые, как на гоночной трассе, за ними невысокая стенка
  for (let z = 15; z > END; z -= 2) for (const sx of [-1, 1]) box(w, 0.6, 0.5, 2, ((15 - z) / 2) % 2 ? C.red : C.white, sx * (HALF + 0.3), 0.25, z - 1, { shadow: false });
  // высокие стены: не перепрыгнуть ни прыжком, ни в сапогах — только по дорожке, мимо каждого зверя
  for (const sx of [-1, 1]) { solid(w, 1, 14, 16 - END, 0x8a5a2b, sx * (HALF + 1.1), 0, (16 + END) / 2, { cam: true }); solid(w, 1.4, 0.8, 16 - END, 0xff7b22, sx * (HALF + 1.1), 14, (16 + END) / 2); }
  solid(w, HALF * 2 + 3.2, 14, 1, 0x8a5a2b, 0, 0, 16.5, { cam: true });
  for (const sx of [-1, 1]) for (let z = 10; z > END; z -= 18) tree(w, sx * (13 + Math.abs(z) % 7), z, 0.9 + (Math.abs(z) % 3) * 0.15, 0, ['oak', 'pine', 'birch'][Math.abs(z) % 3]);

  // дом: портал на базу, цветочки
  portal(w, { x: 0, z: 12, to: 'base', color: 0x9b6bff, label: '🏠 База', rot: Math.PI });
  for (let i = 0; i < 10; i++) box(w, 0.35, 0.35, 0.35, [0xff5a8a, 0xffd93b, 0xffffff, 0x9b6bff][i % 4], -5.5 + (i % 5) * 0.4 + (i > 4 ? 10 : 0), 0.18, 2 + (i % 3), { shadow: false });

  // ТВОЯ ЛИНИЯ — шашечки, жёлтые полосы, светящаяся завеса, столбы с флажками
  const line = group(w); line.userData.dynamic = true;
  const flag = new T.Mesh(new T.PlaneGeometry(HALF * 2, 2.4), new T.MeshBasicMaterial({ map: checks() }));
  flag.rotation.x = -Math.PI / 2; flag.position.set(0, 0.03, LINE_Z); line.add(flag);
  const lit = new T.MeshBasicMaterial({ color: 0xffe14d });
  for (const dz of [-1.5, 1.5]) box(line, HALF * 2, 0.06, 0.6, 0xffe14d, 0, 0.03, LINE_Z + dz, { shadow: false }).material = lit;
  const curtain = new T.Mesh(new T.PlaneGeometry(HALF * 2, 5.6), new T.MeshBasicMaterial({ map: glowTex(), transparent: true, opacity: 0.55, side: T.DoubleSide, depthWrite: false }));
  curtain.position.set(0, 2.8, LINE_Z); line.add(curtain);
  // арка над линией — как финишные ворота на гонках: столбы в полоску, перекладина, флажки
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 7; i++) box(line, 1, 1, 1, i % 2 ? C.red : C.white, sx * (HALF + 0.6), 0.5 + i, LINE_Z, { shadow: false });
    const f = box(line, 1.8, 1.1, 0.06, sx < 0 ? C.red : 0x3fa7ff, sx * (HALF + 0.6) - sx * 1.2, 7.6, LINE_Z, { shadow: false }); f.userData.wave = sx;
  }
  const beam = new T.Mesh(new T.BoxGeometry(HALF * 2 + 2.2, 1.1, 0.5), new T.MeshBasicMaterial({ map: checks() }));
  beam.position.set(0, 7.5, LINE_Z); line.add(beam);
  for (const sx of [-1, 1]) box(line, 0.5, 0.5, 0.5, 0xffe14d, sx * 3, 6.8, LINE_Z, { shadow: false }).material = lit;   // фонарики
  const lineLabel = makeLabel(8, 2); lineLabel.position.set(0, 9.3, LINE_Z); line.add(lineLabel);
  lineLabel.userData.set('🏁 Твоя линия', { color: '#ffe14d' });
  const stageLabel = makeLabel(8, 1.6); stageLabel.position.set(0, 5.6, LINE_Z); line.add(stageLabel);

  // ворота перед каждым следующим зверем: закрыты, пока не победишь предыдущего
  const gates = [];
  for (let k = 1; k < STAGES.length; k++) {
    const z = gateZ(k), g = group(w, 0, 0, z), bars = group(g); g.userData.dynamic = true;     // ворота уезжают вниз — склеиваем их отдельно
    for (let i = 0; i < 8; i++) box(bars, 0.4, 4.6, 0.4, 0x6a6f7a, -HALF + 0.9 + i * (HALF * 2 - 1.8) / 7, 2.3, 0);
    box(bars, HALF * 2, 0.5, 0.5, 0x555a6a, 0, 4.4, 0); box(bars, HALF * 2, 0.5, 0.5, 0x555a6a, 0, 1.4, 0);
    bake(bars);
    const lab = makeLabel(7.5, 1.6); lab.position.set(0, 5.9, 0); g.add(lab);
    lab.userData.set(`🔒 сначала — ${STAGES[k - 1].name}`, { color: '#ffffff' });
    const col = addCollider({ x0: -HALF, x1: HALF, y0: 0, y1: 4.7, z0: z - 0.4, z1: z + 0.4 });   // выше прыжка даже в сапогах
    const open = k <= P.stage;
    if (open) { g.visible = false; col.off = true; }
    gates[k] = { g, col, lab, drop: 0 };
  }

  // ускорители: стрелки к линии; толкают, только когда несёшь яйцо домой
  const pads = [];
  for (let k = 0; k < STAGES.length; k++) for (const dz of [7, 16]) {
    const z = stageZ(k) + dz; if (z > LINE_Z - 6) continue;
    const x = (k + dz) % 2 ? 2.8 : -2.8, g = group(w, x, 0.04, z);
    for (let i = 0; i < 2; i++) for (const sx of [-1, 1]) { const b = box(g, 0.35, 0.04, 1.4, 0xffd23f, sx * 0.45, 0, 0.4 - i * 1.1, { shadow: false }); b.rotation.y = -sx * 0.6; }
    pads.push({ x, z, t: 0 });
  }

  // логово дракона в конце: башенки, флаги, факелы
  const L = END + 6;
  for (const sx of [-1, 1]) {
    solid(w, 4, 9, 4, 0x6a4a86, sx * 9.5, 0, L, { cam: true }); box(w, 4.6, 1, 4.6, 0xff5a3d, sx * 9.5, 9.5, L);
    box(w, 0.2, 3, 0.2, 0xffffff, sx * 9.5, 11.5, L); box(w, 1.6, 1, 0.06, 0xffd23f, sx * 9.5 + 0.8, 12.4, L, { shadow: false });
    for (const dz of [-10, 2]) { box(w, 0.4, 1.6, 0.4, 0x5a3a1a, sx * (HALF - 0.4), 0.8, L + dz); box(w, 0.6, 0.6, 0.6, 0xff8a1a, sx * (HALF - 0.4), 1.9, L + dz).material = new T.MeshBasicMaterial({ color: 0xffa020 }); }
  }
  solid(w, 24, 9, 2, 0x6a4a86, 0, 0, END - 1, { cam: true });
  box(w, 12, 1.4, 0.4, 0xff5a3d, 0, 7, END + 0.2);
  const lair = makeLabel(7, 1.6); lair.position.set(0, 9, END + 1); w.add(lair); lair.userData.set('🐉 Логово дракона', { color: '#ffe14d' });
  clouds(w, 8);

  st = { P, line, curtain, flag, stageLabel, gates, pads, boss: nestsOf('track')[STAGES.length - 1], fireT: 0, bossFx: { fire: '🔥', ice: '❄️', sun: '✨' }[STAGES[STAGES.length - 1].v] || '🔥' };
  stageText();
  return w;
}

function stageText() {
  const k = st.P.stage;
  const R = st.P.round;
  st.stageLabel.userData.set(k < STAGES.length ? `Круг ${R} · Зверь ${k + 1} из ${STAGES.length}: ${STAGES[k].name}` : `🏆 Круг ${R} пройден! Дальше — круг ${R + 1}`, { color: k < STAGES.length && R > 1 ? '#ffe14d' : '#ffffff' });
}

// раз в кадр на Дорожке. События: { dash: направление, win: { k, name, boss } }
export function updateTrack(dt, hero, save) {
  if (!st) return {};
  const ev = {}, p = hero.pos, t = performance.now() / 1000;
  // линия переливается
  st.curtain.material.opacity = 0.35 + Math.sin(t * 3) * 0.15;
  st.line.children.forEach(o => { if (o.userData.wave) o.rotation.y = Math.sin(t * 4) * 0.25 * o.userData.wave; });
  // ворота открываются: уезжают вниз
  for (const g of st.gates) if (g && g.open && g.g.visible) { g.g.position.y -= dt * 3; if (g.g.position.y < -4.8) g.g.visible = false; }
  // огонь над яйцом дракона
  if (st.boss && !st.boss.off && st.boss.has && (st.fireT -= dt) <= 0) {
    st.fireT = 0.35; puff(st.bossFx, new T.Vector3((Math.random() - 0.5) * 1.4, 1.6, st.boss.z + (Math.random() - 0.5) * 1.4), { size: 0.8, rise: 1.2, life: 0.8 });
  }
  // ускорители — только по пути домой с яйцом
  for (const pad of st.pads) {
    pad.t -= dt;
    if (pad.t <= 0 && hero.carrying && hero.vel.z > 1 && Math.abs(p.x - pad.x) < 1.6 && Math.abs(p.z - pad.z) < 1.3) { pad.t = 1; ev.dash = 0; }
  }
  // унёс яйцо за линию — этот зверь побеждён
  const c = hero.carrying, k = st.P.stage;
  if (c && c.nest.loc === 'track' && !c.nest.off && p.z > LINE_Z && nestsOf('track')[k] === c.nest) {
    vanishGuard(c.nest); retireNest(c.nest);
    st.P.stage = k + 1; st.P.wins++;
    const g = st.gates[k + 1]; if (g) { g.open = true; g.col.off = true; }
    ev.win = { k, name: STAGES[k].name, boss: !!STAGES[k].boss, round: st.P.round, next: STAGES[k + 1] && STAGES[k + 1].name };
    stageText();
  }
  return ev;
}
