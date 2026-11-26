// Пиратская бухта ⚓ — этап 4: живой пляж и новые занятия (мир — cove.js, первые этапы — coveplay.js):
//   🏕️ Лагерь: палатки, костёр с искрами, бочки и ящики, лодки, сети, фонарики, флажки; 😴 гамак между пальмами — качает.
//   🪢 Тарзанка над водой: раскачиваешься сам, прыжок — отпустить в нужный момент; буйки показывают дальность, рекорд.
//   🐢 Черепашата: у гнезда на пляже вылупляются (5 в день) и идут за тобой гуськом — не спеши, доведи их до моря.
//   🔭 Подзорная труба на вышке: смотришь вдаль (джойстик — куда), находишь морские чудеса: кит, дельфины, русалка,
//      тюлень, морская черепаха — в альбом.
//   🐋 Кит плавает по кругу и пускает фонтан — подплыви, и фонтан подбросит; 🐬 дельфины прыгают рядом с кораблём.
//   🎨 Покраска корабля у капитана: корпус, полосы паруса, флаг и картинка на флаге.
//   🌙 Ночью маяк гаснет — поднимись и зажги 💡: на свет приплывёт купец Синдбад с подарком.
import { T, scene, group, box, mat, camera, damp, dampAngle, BOX } from './engine.js';
import { solid, addCollider, onLevelReset } from './world.js';
import { makeLabel, puff, confetti, sprite, emojiTex } from './fx.js';
import { toast, openOv } from './ui.js';
import { buildHero } from './hero.js';
import { SFX } from './sfx.js';
import { input } from './input.js';
import { getNightK } from './daynight.js';
import { persist } from './save.js';
import { SHORE, ISLE_Y, ISLES, CAPTAIN, seaLevel, coveSave, palm, V3, WHO } from './covecore.js';
import { STARS, KEEPER, SKY } from './mamanotes.js';
import { eggMesh } from './eggs.js';
import { DEEP_Y, dayRand } from './covecore.js';

export const LH_TOP = ISLE_Y + 13.6 + 0.4;                             // площадка маяка
const CAMP = { x: -140, z: 28 }, HAMMOCK = { x: -137, z0: 51, z1: 57 }, TOWER = { x: -148, z: 84, h: 6 }, SCOPE = { x: -149.2, z: 82.8 };
const SWING = { x: -178, z: -26, y: 9.5, len: 7.2 }, NEST = { x: -152, z: 104 };
const WHALE = { x: -292, z: 28, r: 34 }, DOLPH = { x: -238, z: 100 };
const WONDERS = [
  { id: 'whale', e: '🐋', name: 'Кит' }, { id: 'dolph', e: '🐬', name: 'Дельфины' },
  { id: 'mermaid', e: '🧜‍♀️', name: 'Русалка Марина', x: -214, z: -24, y: 2.6 }, { id: 'seal', e: '🦭', name: 'Тюлень', x: -282, z: 112, y: 2.2 },
  { id: 'turtle', e: '🐢', name: 'Морская черепаха' },
];
let cf = null, sf = null, scope = null;                                  // пляж, море, режим подзорной трубы
let repaint = () => {};
export const onRepaint = fn => { repaint = fn; };
export const funDebug = () => ({ cf, sf });                             // для проверок из консоли
onLevelReset(() => { cf = sf = null; scopeOff(); });

const lab = (x, y, z, text, color = '#ffffff', w = 5, h = 1.2) => { const l = makeLabel(w, h); l.position.set(x, y, z); scene.add(l); l.userData.set(text, { color }); return l; };
const near = (p, x, z, r) => Math.hypot(p.x - x, p.z - z) < r;
const coins = (ev, n) => { ev.coins = (ev.coins || 0) + n; };
const glow = c => new T.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.8 });
// светящаяся надпись для ночного неба (без тумана — видно издалека)
function skyText(text, w, h, color = '#fff6d0', px = 150) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; const x = cv.getContext('2d');
  x.font = `bold ${px}px Georgia,"Times New Roman",serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = '#ffd27a'; x.shadowBlur = 40; x.fillStyle = color; x.fillText(text, 512, 256); x.shadowBlur = 12; x.fillText(text, 512, 256);
  const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(cv), transparent: true, depthWrite: false, fog: false, opacity: 0 }));
  s.scale.set(w, h, 1); s.userData.dynamic = true; return s;
}

// ================= пляж =================
export function buildCoveFun(g, save) {
  const c = coveSave(save);
  cf = { g, t: 0, fire: [], babies: [], swing: null, hamT: 0 };
  // 🏕️ лагерь: две палатки, костёр, брёвна-скамейки, бочки, ящики, лодки, сеть, гирлянда флажков
  for (const [x, z, col] of [[CAMP.x + 3, CAMP.z - 5, 0xff9a3a], [CAMP.x + 4, CAMP.z + 5, 0x3fa7ff]]) {
    const t = group(g, x, 0, z); t.rotation.y = -Math.PI / 2;
    for (const sx of [-1, 1]) { const s = box(t, 2.6, 0.15, 3.6, col, sx * 1.05, 1.15, 0); s.rotation.z = sx * 0.85; }
    box(t, 0.15, 2.3, 0.15, 0x6a3f1e, 0, 1.15, 1.8); box(t, 1.2, 1.4, 0.05, 0x3a2a1a, 0, 0.7, 1.75, { shadow: false });
    addCollider({ x0: x - 1.8, x1: x + 1.8, z0: z - 2, z1: z + 2, y0: 0, y1: 2 });
  }
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; box(g, 0.5, 0.35, 0.5, 0x8a8f9a, CAMP.x + Math.cos(a) * 1.1, 0.17, CAMP.z + Math.sin(a) * 1.1); }
  for (let i = 0; i < 3; i++) { const l = box(g, 0.25, 0.25, 1.5, 0x6a3f1e, CAMP.x, 0.3, CAMP.z); l.rotation.y = i * 1.05; }
  for (let i = 0; i < 3; i++) { const f = box(g, 0.5 - i * 0.12, 0.6 + i * 0.25, 0.5 - i * 0.12, [0xff5a1a, 0xff9a1a, 0xffe14d][i], CAMP.x, 0.5 + i * 0.2, CAMP.z, { shadow: false }); f.material = glow([0xff5a1a, 0xff9a1a, 0xffe14d][i]); f.userData.dynamic = true; cf.fire.push(f); }
  for (const dz of [-2.8, 2.8]) solid(g, 2.6, 0.5, 0.6, 0x8a5a2b, CAMP.x - 0.5, 0, CAMP.z + dz, { studs: false });
  for (const [x, z, k] of [[-133, 22, 3], [-134, 36, 2], [-146, 34, 2]]) for (let i = 0; i < k; i++) { solid(g, 1, 1.2, 1, 0x9a6a3a, x + (i % 2) * 1.1, Math.floor(i / 2) * 1.2, z + (i > 1 ? 0.5 : 0), { studs: false }); box(g, 1.04, 0.12, 1.04, 0x3a3f48, x + (i % 2) * 1.1, Math.floor(i / 2) * 1.2 + 0.6, z + (i > 1 ? 0.5 : 0), { shadow: false }); }
  for (const [x, z] of [[-138, 16], [-136.6, 16.2], [-137.3, 17.4]]) { solid(g, 1.1, 1.1, 1.1, 0xc8a060, x, 0, z, { studs: false }); }
  for (const [x, z, r, col] of [[-165, 20, 0.5, 0x3fa7ff], [-166, 62, -0.4, 0xff7a3a]]) {   // лодочки на песке
    const b = group(g, x, 0, z); b.rotation.y = r; box(b, 1.6, 0.6, 3.6, col, 0, 0.3, 0); box(b, 1.2, 0.1, 3.2, 0xd8b070, 0, 0.55, 0); box(b, 1.4, 0.12, 0.3, 0x8a5a2b, 0, 0.62, 0.3);
    const o = box(b, 0.12, 0.12, 2.6, 0x8a5a2b, 0.5, 0.7, 0); o.rotation.y = 0.2;
    addCollider({ x0: x - 1.3, x1: x + 1.3, z0: z - 1.6, z1: z + 1.6, y0: 0, y1: 0.7 });
  }
  for (let i = 0; i < 6; i++) for (let k = 0; k < 6; k++) box(g, 0.06, 0.02, 2.4, 0x6a8a9a, -160 + i * 0.4, 0.03, 26 + k * 0.05, { shadow: false });   // сеть сохнет
  const cols = [0xff5a8a, 0xffd23f, 0x3fa7ff, 0x5fd35f, 0x9b6bff];
  for (const [x0, z0, x1, z1] of [[CAMP.x + 3, CAMP.z - 5, CAMP.x + 4, CAMP.z + 5]]) for (let i = 0; i <= 10; i++) { const k = i / 10; box(g, 0.25, 0.3, 0.05, cols[i % 5], x0 + (x1 - x0) * k + 0.6, 2.2 - Math.sin(k * Math.PI) * 0.4, z0 + (z1 - z0) * k, { shadow: false }); }
  for (const [x, z] of [[-144, 22], [-144, 34], [-133, 28]]) { box(g, 0.12, 2.2, 0.12, 0x6a3f1e, x, 1.1, z); const l = box(g, 0.4, 0.5, 0.4, 0xffc244, x, 2.4, z, { shadow: false }); l.material = glow(0xffc244); }
  lab(CAMP.x, 4.2, CAMP.z, '🏕️ Лагерь', '#ffe14d', 3.6, 0.9);
  // 😴 гамак между пальмами
  palm(g, HAMMOCK.x, HAMMOCK.z0 - 0.8, 0.9); palm(g, HAMMOCK.x, HAMMOCK.z1 + 0.8, 0.9);
  const hm = group(g, HAMMOCK.x, 1.3, (HAMMOCK.z0 + HAMMOCK.z1) / 2); hm.userData.dynamic = true;
  for (let i = 0; i < 7; i++) box(hm, 1.2, 0.08, 0.75, i % 2 ? 0xff7ac8 : 0xffe0f0, 0, -Math.sin((i + 0.5) / 7 * Math.PI) * 0.35, (i - 3) * 0.75, { shadow: false });
  for (const s of [-1, 1]) { const r = box(hm, 0.05, 0.05, 1.4, 0xd8c08a, 0, 0.35, s * 3.2); r.rotation.x = s * 0.35; }
  cf.ham = hm;
  // 🔭 вышка с подзорной трубой
  solid(g, 4, 0.4, 4, 0xa0703f, TOWER.x, TOWER.h - 0.4, TOWER.z, { studs: false });
  for (const [dx, dz] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) solid(g, 0.4, TOWER.h - 0.4, 0.4, 0x6a3f1e, TOWER.x + dx, 0, TOWER.z + dz, { studs: false });
  for (const [dx, dz, w, d] of [[0, -2, 4, 0.15], [-2, 0, 0.15, 4], [2, 0, 0.15, 4], [-1.3, 2, 1.4, 0.15], [1.3, 2, 1.4, 0.15]]) solid(g, w, 1, d, 0x8a5a2b, TOWER.x + dx, TOWER.h, TOWER.z + dz, { studs: false });
  for (let i = 0; i < 7; i++) { const y = 0.85 * (i + 1); solid(g, 1.4, 0.3, 0.9, 0xb07a3a, TOWER.x, y - 0.3, TOWER.z + 8 - i * 0.9, { studs: false }); box(g, 0.15, y - 0.3, 0.15, 0x6a3f1e, TOWER.x + 0.6, (y - 0.3) / 2, TOWER.z + 8 - i * 0.9); }
  const sc = group(g, SCOPE.x, TOWER.h, SCOPE.z); box(sc, 0.15, 1.1, 0.15, 0x2b2b33, 0, 0.55, 0); const tube = box(sc, 0.3, 0.3, 1.4, 0xc8a040, 0, 1.2, -0.3); tube.rotation.y = -Math.PI / 2; tube.rotation.x = 0.1;
  lab(TOWER.x, TOWER.h + 3.2, TOWER.z, '🔭 Вышка: смотри вдаль', '#ffffff', 5.4, 1.2);
  if (WHO === 'mama') buildStars(g);                                  // 🌟 созвездие для мамы — ночью в подзорную трубу
  // 🪢 тарзанка: столб на берегу и перекладина над водой; буйки — дальность
  solid(g, 1.2, SWING.y + 0.6, 1.2, 0x6a3f1e, -170.5, -0.8, SWING.z, { studs: false });
  box(g, 8.4, 0.5, 0.5, 0x6a3f1e, (SWING.x - 170.5) / 2, SWING.y + 0.3, SWING.z);
  const rope = group(g, SWING.x, SWING.y, SWING.z); rope.userData.dynamic = true;
  cf.ropeM = new T.MeshLambertMaterial({ color: 0xd8c08a });   // своя — в «лучший момент» верёвка зеленеет
  box(rope, 0.18, SWING.len, 0.18, 0xd8c08a, 0, -SWING.len / 2, 0, { shadow: false }).material = cf.ropeM; box(rope, 0.8, 0.12, 0.12, 0x8a5a2b, 0, -SWING.len, 0);
  cf.rope = rope;
  for (let k = 1; k <= 5; k++) { const bx = SWING.x - 4 - k * 4, b = group(g, bx, 0, SWING.z); b.userData.dynamic = true; box(b, 0.8, 0.8, 0.8, k % 2 ? 0xff5a3a : 0xffffff, 0, 0, 0); const l = makeLabel(1.6, 0.5); l.position.y = 1.2; b.add(l); l.userData.set(`${Math.round(-170.5 - bx)} м`, { color: '#ffffff' }); (cf.buoys ||= []).push(b); }
  lab(-171, SWING.y + 2, SWING.z, '🪢 Тарзанка', '#ffe14d', 4, 1);
  // 🐢 гнездо черепашат
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; box(g, 0.7, 0.35, 0.5, 0xe0c890, NEST.x + Math.cos(a) * 1.1, 0.17, NEST.z + Math.sin(a) * 1.1).rotation.y = -a; }
  cf.nestEggs = [0, 1, 2, 3, 4].map(i => { const e = box(g, 0.32, 0.38, 0.32, 0xfff6e0, NEST.x + Math.cos(i * 1.26) * 0.5, 0.25, NEST.z + Math.sin(i * 1.26) * 0.5, { shadow: false }); e.userData.dynamic = true; return e; });
  cf.nestLab = lab(NEST.x, 2.6, NEST.z, '🐢 Гнездо черепах', '#ffffff', 4.4, 1);
  const done = c.got?.turt;
  for (const e of cf.nestEggs) e.visible = !done && !c.got?.turtOut;
}
// ✨ буква и сердце из звёзд над морем за маяком (точечный рисунок из mamanotes.js), смотрят на пляж
function starSign(g) {
  const L = ISLES.light, grp = group(g, -480, 105, L.z + 2); grp.lookAt(-165, 8, L.z + 2);   // далеко за горизонтом, высоко — среди звёзд (камера видит до 400 м) grp.userData.dynamic = true;
  const sm = new T.MeshBasicMaterial({ color: 0xfff3c0, fog: false }), stars = [];
  const rows = SKY.length, cols = SKY[0].length, S = 5.2;
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) if (SKY[r][c] === '#') {   // порядок — слева направо, «рисует» луч
    const m = new T.Mesh(BOX, sm); m.scale.setScalar(2); m.position.set((c - (cols - 1) / 2) * S, ((rows - 1) / 2 - r) * S, 0); m.rotation.z = 0.785; m.visible = false; grp.add(m); stars.push(m);
  }
  return { g: grp, stars, t: 0 };
}
// 🌟 созвездие-сердце с именем: далеко над морем на северо-западе, видно ночью; в трубу — линии и подпись
const STAR_EYE = V3(SCOPE.x, TOWER.h + 1.6, SCOPE.z), STAR_DIR = V3(Math.sin(-1.75) * Math.cos(0.42), Math.sin(0.42), Math.cos(-1.75) * Math.cos(0.42));
function buildStars(g) {
  const C = STAR_EYE.clone().addScaledVector(STAR_DIR, 200), grp = group(g, C.x, C.y, C.z); grp.lookAt(STAR_EYE); grp.userData.dynamic = true;
  const sm = new T.MeshBasicMaterial({ color: 0xfff6d0, fog: false }), lm = new T.MeshBasicMaterial({ color: 0xffd27a, fog: false, transparent: true, opacity: 0.55 });
  const pts = []; for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2; pts.push(new T.Vector3(16 * Math.sin(t) ** 3 * 0.9, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.9 + 3, 0)); }
  const stars = pts.map((q, i) => { const m = new T.Mesh(BOX, sm); const s2 = i % 4 === 0 ? 1.3 : 0.85; m.scale.set(s2, s2, s2); m.position.copy(q); m.rotation.z = 0.785; grp.add(m); return m; });
  const lines = new T.Group(); grp.add(lines); lines.visible = false;
  pts.forEach((a, i) => { const b = pts[(i + 1) % pts.length], d = a.distanceTo(b), m = new T.Mesh(BOX, lm); m.scale.set(d, 0.22, 0.22); m.position.copy(a).add(b).multiplyScalar(0.5); m.rotation.z = Math.atan2(b.y - a.y, b.x - a.x); lines.add(m); });
  const name = skyText(STARS.name, 26, 13); name.position.set(0, 2, 0.5); grp.add(name);
  const cap = skyText(STARS.caption, 36, 18, '#ffffff', 50); cap.position.set(0, -12.5, 0.5); grp.add(cap);
  cf.stars = { grp, stars, lines, name, cap, found: false, hold: 0 };
}
function makeBaby(i) {
  const b = group(cf.g, NEST.x, 0, NEST.z); b.userData.dynamic = true;
  box(b, 0.55, 0.22, 0.6, 0x3f8f4a, 0, 0.18, 0); box(b, 0.25, 0.2, 0.25, 0x7fc86a, 0, 0.18, 0.38);
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) box(b, 0.15, 0.06, 0.22, 0x7fc86a, sx * 0.32, 0.1, sz * 0.2);
  return { g: b, i, pos: b.position, state: 'follow', t: Math.random() * 6 };
}

// ================= море =================
export function buildSeaFun(g, save) {
  sf = { g, t: 0, spoutT: 4, spout: 0, dol: [], lit: null, merchant: null };
  // 🐋 кит
  const w = group(g, WHALE.x + WHALE.r, 0, WHALE.z); w.userData.dynamic = true;
  box(w, 3.4, 2.4, 9, 0x3a5a8a, 0, 0, 0); box(w, 3, 1.4, 7.5, 0xd8e4f0, 0, -1, 0.4); box(w, 2.6, 2, 2.4, 0x3a5a8a, 0, 0.1, 5.2);
  const tail = group(w, 0, 0.3, -4.6); box(tail, 1.4, 1, 3, 0x3a5a8a, 0, 0, -1.4); box(tail, 5, 0.3, 1.4, 0x3a5a8a, 0, 0, -3);
  for (const sx of [-1, 1]) { box(w, 0.15, 0.4, 0.4, 0xffffff, sx * 1.72, 0.4, 4.4); box(w, 0.1, 0.22, 0.22, 0x1a1a1a, sx * 1.76, 0.4, 4.5); box(w, 2.2, 0.25, 1.2, 0x3a5a8a, sx * 2.4, -0.6, 2).rotation.z = sx * -0.4; }
  const sp = box(g, 0.9, 1, 0.9, 0xdff4ff, 0, -50, 0, { shadow: false }); sp.material = new T.MeshLambertMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.75 }); sp.userData.dynamic = true;
  sf.whale = { g: w, tail, sp, a: 0 };
  // 🐬 дельфины
  for (let i = 0; i < 3; i++) {
    const d = group(g, DOLPH.x, -50, DOLPH.z); d.userData.dynamic = true;
    box(d, 0.7, 0.7, 2.4, 0x7a9ab8, 0, 0, 0); box(d, 0.6, 0.4, 1, 0xdfe8f0, 0, -0.25, 0.2); box(d, 0.3, 0.25, 0.7, 0x7a9ab8, 0, -0.1, 1.5); box(d, 0.12, 0.6, 0.5, 0x6a8aa8, 0, 0.5, -0.1); box(d, 1, 0.12, 0.4, 0x6a8aa8, 0, 0, -1.3);
    sf.dol.push({ g: d, ph: i * 2.1 });
  }
  // чудеса для подзорной трубы: русалка и тюлень на камнях, морская черепаха
  for (const W of WONDERS.filter(w => w.x)) { seaRock(g, W.x, W.z, W.y, W.id === 'seal'); W.obj = (W.id === 'mermaid' ? mermaid : seal)(g, W.x, W.y, W.z); }
  sf.mermaid = WONDERS.find(w => w.id === 'mermaid').obj; sf.seal = WONDERS.find(w => w.id === 'seal').obj;
  sf.turtle = seaTurtle(g);
  sf.loot = spawnSeaLoot(save); sf.driftT = 60 + Math.random() * 60;   // 🌊 редкие находки и дрейфующие бочки
  // 🗼 на маяке: смотритель Фёдор, колокол и канатная дорога на пляж
  const L = ISLES.light, kg = group(g, L.x - 2.2, LH_TOP, L.z - 2); kg.userData.dynamic = true;
  const km = buildHero(kg, { skin: 0xf2c29a, shirt: 0x2a5aa8, pants: 0x1d1d23, shoes: 0x3a2a1a, sole: 0x1d1d1d, hair: 0xd8d8d8, hairHi: 0xf0f0f0, style: 'crop', hat: 'cap', hatC: 0x1d2a4a, beard: 0xe8e8e8, stripes: 0xffffff });
  km.root.rotation.y = Math.PI / 4; sf.keeper = { g: kg, m: km, said: 0 };
  lab(L.x - 2.2, LH_TOP + 3.6, L.z - 2, '🧓 Смотритель Фёдор', '#ffe14d', 5, 1.1);
  const bg = group(g, L.x - 2.4, LH_TOP, L.z + 2.4); for (const sx of [-0.7, 0.7]) box(bg, 0.15, 2.4, 0.15, 0x6a3f1e, sx, 1.2, 0); box(bg, 1.7, 0.18, 0.18, 0x6a3f1e, 0, 2.4, 0);
  const bell = group(bg, 0, 2.3, 0); bell.userData.dynamic = true; box(bell, 0.8, 0.8, 0.8, 0xffc23a, 0, -0.5, 0); box(bell, 1, 0.2, 1, 0xe8a820, 0, -0.95, 0); box(bell, 0.2, 0.25, 0.2, 0x6a4a1a, 0, -1.15, 0);
  sf.bell = { g: bell, x: L.x - 2.4, z: L.z + 2.4, swing: 0 };
  const ZF = V3(L.x + 3.2, LH_TOP + 3.2, L.z - 2.6), ZT = V3(-165, 3.4, -14); sf.zip = { from: ZF, to: ZT };
  box(g, 0.3, 3.4, 0.3, 0x6a3f1e, ZF.x, LH_TOP + 1.7, ZF.z); solid(g, 0.5, 4, 0.5, 0x6a3f1e, ZT.x + 0.6, 0, ZT.z);
  const len = ZF.distanceTo(ZT), cab = new T.Mesh(BOX, new T.MeshLambertMaterial({ color: 0x2b2b33 })); cab.scale.set(0.08, 0.08, len); cab.position.copy(ZF).add(ZT).multiplyScalar(0.5); cab.lookAt(ZT); g.add(cab);
  lab(ZF.x, LH_TOP + 4.2, ZF.z, '🚡 На пляж!', '#ffffff', 3.4, 0.9);
  // 💡 лампа маяка (ночью гаснет — зажги)
  sf.lampM = new T.MeshBasicMaterial({ color: 0xfff3a0 });
  sf.lamp = null;                                                    // берём меш лампы из cove.js — см. setLighthouse
  if (WHO === 'mama') sf.sky = starSign(g);                          // зажжёшь маяк ночью — над морем из звёзд загорится буква и сердце
}
// неровная скала из кубиков: широкая внизу, с уступами и водорослями у воды; top — высота верха
function seaRock(g, x, z, top, sandy = false) {
  const R = [[4.2, 3.6, -7, top - 1.6, 0, 0], [3.4, 3, top - 1.6, top - 0.6, 0.3, -0.2], [2.6, 2.4, top - 0.6, top, -0.2, 0.2], [1.6, 1.4, top - 1.2, top - 0.2, 1.6, 1.2], [1.4, 1.8, top - 1.4, top - 0.5, -1.7, -1]];
  R.forEach(([w, d, y0, y1, dx, dz], i) => solid(g, w, y1 - y0, d, (sandy ? [0xb89a6a, 0xc8aa78, 0xe0c890, 0xc0a070, 0xa88a5a] : [0x7a7f8a, 0x8a8f9a, 0x9aa0aa, 0x858a94, 0x6f747e])[i], x + dx, y0, z + dz, { studs: true }));
  for (let i = 0; i < 6; i++) { const a = i * 1.05; box(g, 0.5, 0.2, 0.9, 0x3f8f4a, x + Math.cos(a) * 2.1, -0.3, z + Math.sin(a) * 1.8, { shadow: false }).rotation.y = a; }
}
// русалка: девочка с длинными волосами, вместо ног — хвост, сидит на камне и машет рукой
function mermaid(g, x, y, z) {
  const r = group(g, x, y, z); r.userData.dynamic = true; r.rotation.y = 0.9;
  const m = buildHero(r, { skin: 0xffd9c0, shirt: 0xb88aff, pants: 0x2fbfa8, shoes: 0x2fbfa8, sole: 0x2fbfa8, hair: 0xe2442a, hairHi: 0xff7a5a, style: 'long', cheeks: true });
  m.legL.visible = m.legR.visible = false; m.body.position.y = -0.55;
  const tail = group(m.body, 0, 1.0, 0.1);
  [[0.9, 0.5, 0.8, 0, 0, 0.2], [0.8, 0.45, 0.8, 0, -0.05, 0.85], [0.6, 0.4, 0.7, 0, 0.05, 1.45], [0.45, 0.35, 0.6, 0, 0.2, 1.95]].forEach(([w, h, d, dx, dy, dz], i) => box(tail, w, h, d, i % 2 ? 0x3fd8c0 : 0x2fbfa8, dx, dy, dz));
  const fin = group(tail, 0, 0.35, 2.3); for (const sx of [-1, 1]) { const f = box(fin, 0.7, 0.12, 0.5, 0x7ff0e0, sx * 0.35, 0, 0.1); f.rotation.y = sx * 0.5; }
  box(m.head, 0.5, 0.12, 0.12, 0xffd23f, 0, 0.46, 0.25);                                   // корона-ракушка
  for (let i = 0; i < 3; i++) box(m.head, 0.12, 0.18, 0.12, 0xffd23f, -0.16 + i * 0.16, 0.58, 0.25);
  return { root: r, m, fin, position: r.position };
}
// тюлень: лежит на камне, поднимает голову, хлопает ластами
function seal(g, x, y, z) {
  const r = group(g, x, y, z); r.userData.dynamic = true; r.rotation.y = -0.6;
  box(r, 1.3, 0.9, 2.4, 0x4a5a6a, 0, 0.45, 0); box(r, 1.1, 0.5, 2, 0xc8d0d8, 0, 0.2, 0.1); box(r, 0.8, 0.5, 0.9, 0x4a5a6a, 0, 0.35, -1.5);
  for (const [dx, dz] of [[-0.3, 0.5], [0.35, -0.3], [-0.1, -0.8], [0.3, 0.7]]) box(r, 0.22, 0.04, 0.22, 0x2a3440, dx, 0.92, dz, { shadow: false });   // пятнышки
  const tail = group(r, 0, 0.3, -2); for (const sx of [-1, 1]) box(tail, 0.5, 0.12, 0.6, 0x3a4a5a, sx * 0.3, 0, -0.2).rotation.y = sx * 0.4;
  const head = group(r, 0, 1.0, 1.1); box(head, 0.95, 0.85, 0.95, 0x5a6a7a); box(head, 0.5, 0.35, 0.3, 0xd8dce4, 0, -0.15, 0.55);
  box(head, 0.18, 0.14, 0.1, 0x1a1a1a, 0, -0.02, 0.72);
  for (const sx of [-1, 1]) { box(head, 0.16, 0.2, 0.06, 0xffffff, sx * 0.25, 0.15, 0.48); box(head, 0.1, 0.14, 0.04, 0x1a1a1a, sx * 0.25, 0.14, 0.5); for (let k = 0; k < 2; k++) box(head, 0.4, 0.03, 0.03, 0x5a5a5a, sx * 0.35, -0.12 - k * 0.08, 0.66); }
  const fl = [-1, 1].map(sx => { const f = group(r, sx * 0.7, 0.3, 0.6); box(f, 0.6, 0.12, 0.45, 0x3a4a5a, sx * 0.25, 0, 0); return f; });
  return { root: r, head, fl, tail, position: r.position };
}
// морская черепаха: панцирь в шестиугольниках, голова, четыре ласты — плывёт у поверхности
function seaTurtle(g) {
  const r = group(g, -262, 0, 62); r.userData.dynamic = true;
  box(r, 1.8, 0.5, 2.2, 0x5a8a3a, 0, 0, 0); box(r, 1.3, 0.35, 1.6, 0x7aa84a, 0, 0.35, 0);
  for (const [dx, dz] of [[-0.35, -0.4], [0.35, -0.4], [0, 0.35], [-0.35, 0.35], [0.35, 0.35]]) box(r, 0.4, 0.06, 0.4, 0x9ac86a, dx, 0.54, dz, { shadow: false });
  box(r, 0.6, 0.5, 0.7, 0xc8d890, 0, 0.05, 1.35); for (const sx of [-1, 1]) box(r, 0.08, 0.1, 0.1, 0x1a1a1a, sx * 0.3, 0.15, 1.55);
  const fl = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => { const f = group(r, sx * 0.9, -0.05, sz * 0.6); box(f, 1, 0.1, 0.5, 0xb8c880, sx * 0.4, 0, 0); return { f, sx, sz }; });
  return { root: r, fl, position: r.position };
}
// ================= 🌊 редкие находки в море =================
// каждый день — новый набор в новых местах: на волнах (видно издалека по столбу света) и на дне (нужно нырять);
// плюс время от времени течение выносит дрейфующую бочку. Награды: монеты, редко — яйцо (радужное, иногда легендарное)
const SEA_LOOT = {
  chest: { name: 'Плавучий сундучок', say: n => `🧰 Плавучий сундучок! +${n} монет`, coins: [40, 70] },
  star: { name: 'Золотая морская звезда', say: n => `⭐ Золотая морская звезда! +${n} монет`, coins: [60, 90], deep: true },
  jug: { name: 'Древний кувшин', say: n => `🏺 Древний кувшин, полный монет! +${n}`, coins: [50, 80], deep: true },
  egg: { name: 'Яйцо в пузыре', egg: true },
  pearl: { name: 'Гигантская золотая жемчужина', say: n => `🟡 Гигантская золотая жемчужина! +${n} монет<small>такая попадается очень редко</small>`, coins: [200, 260], deep: true, big: true },
  barrel: { name: 'Дрейфующая бочка', say: n => `🛢️ Бочка с моря! +${n} монет`, coins: [15, 35] },
};
const seaFree = (x, z) => !Object.values(ISLES).some(I => Math.hypot(x - I.x, z - I.z) < I.r + 5) && Math.hypot(x - WRECK_X, z - WRECK_Z) > 16;
const WRECK_X = -230, WRECK_Z = 60;
function lootModel(g, kind, x, z) {
  const m = group(g, x, 0, z); m.userData.dynamic = true; const L = SEA_LOOT[kind];
  if (kind === 'chest' || kind === 'barrel') {
    if (kind === 'chest') { for (let i = 0; i < 4; i++) box(m, 0.5, 0.25, 2.2, 0xb07a3a, -0.8 + i * 0.55, 0, 0); box(m, 1.2, 0.7, 0.8, 0x8a5a2b, 0, 0.45, 0); box(m, 1.25, 0.3, 0.85, 0xa0703f, 0, 0.9, 0); box(m, 1.3, 0.1, 0.1, 0xffd23f, 0, 0.75, 0.43); }
    else { box(m, 1, 1.3, 1, 0x9a6a3a, 0, 0.2, 0); for (const y of [-0.2, 0.6]) box(m, 1.05, 0.1, 1.05, 0x3a3f48, 0, y, 0); }
  } else if (kind === 'egg') {
    const e = eggMesh(m, 3, 0.9, 'rainbow'); e.position.y = 0.9;
    const b = new T.Mesh(new T.SphereGeometry(1.1, 14, 10), new T.MeshLambertMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.35 })); b.position.y = 0.9; m.add(b);
  } else if (kind === 'star') { const sm = glow(0xffd23f); for (let k = 0; k < 5; k++) { const a = new T.Mesh(BOX, sm); a.scale.set(0.35, 0.15, 1); a.position.set(Math.sin(k * 1.257) * 0.45, 0.1, Math.cos(k * 1.257) * 0.45); a.rotation.y = k * 1.257; m.add(a); } }
  else if (kind === 'jug') { box(m, 0.9, 1.1, 0.9, 0xc8783a, 0, 0.55, 0); box(m, 0.5, 0.5, 0.5, 0xb0682a, 0, 1.3, 0); box(m, 0.65, 0.12, 0.65, 0xd8884a, 0, 1.6, 0); box(m, 0.1, 0.5, 0.3, 0xb0682a, 0.5, 1.1, 0); box(m, 0.6, 0.12, 0.6, 0xffd23f, 0, 1.68, 0); }
  else if (kind === 'pearl') { box(m, 1.6, 0.3, 1.6, 0x9aa0aa, 0, 0.15, 0); const p = new T.Mesh(new T.SphereGeometry(0.55, 14, 10), new T.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x806000 })); p.position.y = 0.75; m.add(p); }
  // столб света — видно с корабля издалека (у тех, что на волнах)
  if (!L.deep) { const beam = new T.Mesh(BOX, new T.MeshBasicMaterial({ color: kind === 'egg' ? 0xff9ad8 : 0xfff0a0, transparent: true, opacity: 0.28, depthWrite: false })); beam.scale.set(0.5, 18, 0.5); beam.position.y = 9; m.add(beam); }
  return m;
}
function spawnSeaLoot(save) {
  const c = coveSave(save), R = dayRand('sealoot'), list = [];
  const kinds = ['chest', 'chest', 'star', 'jug', ...(R() < 0.6 ? ['egg'] : []), ...(R() < 0.3 ? ['pearl'] : [])];
  kinds.forEach((kind, i) => {
    let x, z, n = 0; do { x = -345 + R() * 140; z = -28 + R() * 150; } while (!seaFree(x, z) && ++n < 40);
    const id = 'sl' + i; if (c.got[id]) return;
    list.push({ id, kind, x, z, m: lootModel(sf.g, kind, x, z), ph: R() * 6 });
  });
  return list;
}
function grabSeaLoot(L, ev, c) {
  const K = SEA_LOOT[L.kind]; sf.g.remove(L.m); L.gone = true;
  if (L.id) { c.got[L.id] = 1; ev.save = true; }
  puff('✨', L.m.position.clone().setY(L.m.position.y + 1.5), { size: 1.8, rise: 1.4 }); confetti(L.m.position.clone().setY(L.m.position.y + 1), 40);
  const eggRoll = K.egg || (L.kind === 'barrel' && Math.random() < 0.06);
  if (eggRoll) {
    const leg = Math.random() < 0.2; ev.giveEgg = { r: leg ? 4 : 3, v: 'rainbow' }; ev.big = true; ev.sfx.push('fanfare');
    ev.say = `🥚 ${leg ? 'Легендарное' : 'Эпическое'} радужное яйцо из моря!<small>${L.kind === 'barrel' ? 'было спрятано в бочке · ' : ''}уже в инкубаторе 🐣</small>`;
    c.seaEggs = (c.seaEggs || 0) + 1; return;
  }
  const n = K.coins[0] + Math.floor(Math.random() * (K.coins[1] - K.coins[0] + 1));
  coins(ev, n); ev.say = K.say(n); ev.sfx.push('chest', 'coins'); if (K.big) ev.big = true;
}
export const setLighthouse = (lamp, beam) => { if (sf) { sf.lamp = lamp; sf.beam = beam; } };
function makeMerchant() {
  const m = group(sf.g, -352, 0, 40); m.userData.dynamic = true;
  box(m, 3.6, 1.4, 8, 0x2a5aa8, 0, 0.7, 0); box(m, 2.6, 1.3, 1.8, 0x2a5aa8, 0, 0.85, 4.6); box(m, 3.65, 0.25, 8.05, 0xffd23f, 0, 1.2, 0); box(m, 3.4, 0.1, 7.6, 0xd8a868, 0, 1.45, 0);
  box(m, 0.4, 7, 0.4, 0x6a3f1e, 0, 4.9, 0.5); box(m, 4.4, 3.4, 0.1, 0xfff6e0, 0, 5.2, 0.7); box(m, 1.6, 1, 1.2, 0x9a6a3a, 0, 2, -2.8);
  for (let i = 0; i < 4; i++) { const l = box(m, 0.35, 0.45, 0.35, 0xffc244, (i % 2 ? 1 : -1) * 1.6, 2, -3 + i * 2, { shadow: false }); l.material = glow(0xffc244); }
  const l = makeLabel(5.6, 1.3); l.position.set(0, 9.5, 0); m.add(l); l.userData.set('🧳 Купец Синдбад', { color: '#ffe14d' });
  return { g: m, t: 0, gift: false, from: V3(-352, 0, 40), to: V3(-207, 0, 50) };   // встаёт у причала с северной стороны
}

// ================= кнопки =================
export function funItems(hero, save) {
  const p = hero.pos, out = [], c = coveSave(save);
  if (hero.climb?.scope) return [{ id: 'g_cove_scopeoff', icon: '👀' }];
  if (hero.climb) return [];
  if (cf) {
    if (near(p, SCOPE.x, SCOPE.z, 2.2) && p.y > TOWER.h - 0.5) out.push({ id: 'g_cove_scope', icon: '🔭' });
    if (near(p, HAMMOCK.x, (HAMMOCK.z0 + HAMMOCK.z1) / 2, 3) && p.y < 1) out.push({ id: 'g_cove_hammock', icon: '😴' });
    if (near(p, -170.5, SWING.z, 2.6) && p.y < 1.5) out.push({ id: 'g_cove_swing', icon: '🪢' });
  }
  if (c.stage >= 4 && near(p, CAPTAIN.x, CAPTAIN.z, 4)) out.push({ id: 'g_cove_paint', icon: '🎨' });
  if (sf && p.y > LH_TOP - 1) {
    if (near(p, sf.zip.from.x, sf.zip.from.z, 2.6)) out.push({ id: 'g_cove_zip', icon: '🚡' });
    if (near(p, sf.bell.x, sf.bell.z, 2.4)) out.push({ id: 'g_cove_bell2', icon: '🔔' });
  }
  if (sf && sf.lamp && getNightK() > 0.6 && !sf.lit && p.y > LH_TOP - 1 && near(p, ISLES.light.x, ISLES.light.z, 4)) out.push({ id: 'g_cove_lamp', icon: '💡' });
  return out;
}
export function funUse(act, hero, save, ctx) {
  const c = coveSave(save);
  if (act === 'hammock') {
    const t0 = performance.now(), cz = (HAMMOCK.z0 + HAMMOCK.z1) / 2;
    hero.climb = { t: 0, dur: 1e9, seat: true, lie: true, hammock: true, face: 0, ride: () => V3(HAMMOCK.x + Math.sin((performance.now() - t0) / 900) * 0.35, 0.95, cz - 1) };
    cf.hamT = 0; SFX.yawn?.(); toast('😴 Покачаться в гамаке…<small>джойстик — встать</small>'); return true;
  }
  if (act === 'swing') {
    const S = cf.swing = { a: 0.9, w: 0, t: 0, out: null };
    hero.climb = { t: 0, dur: 1e9, stand: true, swingR: true, face: -Math.PI / 2, ride: () => swingPos(S.a), onJump: () => swingRelease(hero) };
    SFX.whoosh?.(); toast('🪢 Держись крепче! Раскачиваемся…<small>прыжок — отпустить · лучше всего, когда верёвка зелёная ⭐</small>'); return true;
  }
  if (act === 'scope') { scopeOn(hero); return true; }
  if (act === 'scopeoff') { hero.climb = null; scopeOff(); return true; }
  if (act === 'lamp' && sf) {
    sf.lit = true; sf.merchant = sf.merchant || makeMerchant(); SFX.star(); confetti(V3(ISLES.light.x, LH_TOP + 3, ISLES.light.z), 30);
    if (WHO === 'mama') { toast(`🧓 Смотритель Фёдор: «${KEEPER[0]}»<small>${KEEPER[1]}</small>`); setTimeout(() => toast('💡 Смотри на небо… ✨<small>с моря кто-то плывёт на свет маяка 🧳</small>'), 6000); }
    else toast('💡 Маяк горит! Корабли видят дорогу<small>смотри — с моря кто-то плывёт на свет… 🧳</small>');
    return true;
  }
  if (act === 'paint') { paintPanel(save); return true; }
  if (act === 'zip' && sf) { hero.climb = { zip: true, from: sf.zip.from.clone(), to: sf.zip.to.clone(), t: 0, dur: 8, sag: 5 }; SFX.whoosh?.(); toast('🚡 Ух! С маяка прямо на пляж!'); return true; }
  if (act === 'bell2' && sf) {
    sf.bell.swing = 2.5; SFX.bell?.(); for (let i = 0; i < 6; i++) puff('🕊️', V3(sf.bell.x + (Math.random() - 0.5) * 12, LH_TOP + 4 + Math.random() * 4, sf.bell.z + (Math.random() - 0.5) * 12), { size: 1.2, rise: 2, life: 2, dx: 3 });
    if (!c.got.bell) { c.got.bell = 1; save.coins += 10; persist(); toast('🔔 Дон-дон! Чайки взлетели<small>смотритель Фёдор: «Так я зову корабли домой!» · +10 монет</small>'); }
    return true;
  }
  return false;
}

// ---------- 🪢 тарзанка ----------
const swingPos = a => V3(SWING.x + Math.sin(a) * SWING.len, SWING.y - Math.cos(a) * SWING.len - 2.4, SWING.z);
function swingRelease(hero) {
  const S = cf?.swing; if (!S) return;
  // всегда летим к морю; дальше — если отпустил, когда раскачался к воде (быстро и высоко)
  const k = Math.max(0, Math.min(1, -S.w / 1.44)), hi = Math.max(0, Math.min(1, -S.a / 1.15));
  hero.climb = null; S.rel = V3(-(8 + 10 * k + 7 * hi), 6 + 6 * hi, 0);   // скорость — в этом же кадре после player.js (он обнуляет её после onJump)
  S.out = { max: 0 }; SFX.jump?.();
}

// ---------- 🔭 подзорная труба ----------
function scopeOn(hero) {
  hero.climb = { t: 0, dur: 1e9, stand: true, scope: true, face: -Math.PI / 2, ride: () => V3(SCOPE.x + 0.9, TOWER.h, SCOPE.z) };
  scope = { yaw: -Math.PI / 2, pitch: -0.04, hold: {}, fog: [scene.fog.near, scene.fog.far] };
  scene.fog.near = 220; scene.fog.far = 420;
  if (!scope.vig) { scope.vig = document.createElement('div'); scope.vig.style.cssText = 'position:fixed;inset:0;z-index:6;pointer-events:none;background:radial-gradient(circle at 50% 50%, transparent 0 34vmin, #000c 36vmin, #000 60vmin)'; document.body.appendChild(scope.vig); }
  SFX.tap(); toast('🔭 Смотри вдаль! Джойстик — куда смотреть<small>найди морские чудеса: 🐋 🐬 🧜‍♀️ 🦭 🐢 · держи в центре круга</small>');
}
function scopeOff() {
  if (!scope) return;
  scene.fog.near = scope.fog[0]; scene.fog.far = scope.fog[1];
  camera.fov = 60; camera.updateProjectionMatrix(); scope.vig?.remove(); scope = null;
}

// ---------- 🎨 покраска корабля ----------
const PAL = { hull: [0x8a5a2b, 0x2a5aa8, 0xd8261a, 0x2e9a4a, 0x1d1d23, 0xffffff], a: [0xffffff, 0xffd23f, 0x7fd4ff, 0xffb0d0, 0xb0ffb0], b: [0xd8261a, 0x2a5aa8, 0x9b6bff, 0xff7a1a, 0x2e9a4a], flag: [0x2a5aa8, 0xd8261a, 0x1d1d23, 0x9b6bff, 0x2e9a4a], icon: ['⭐', '⚓', '🐬', '❤️', '🌙', '🦜', '🌈', '🐙'] };
function paintPanel(save) {
  const c = coveSave(save), P = c.paint || (c.paint = { hull: PAL.hull[0], a: PAL.a[0], b: PAL.b[0], flag: PAL.flag[0], icon: '⭐' });
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  const row = (k, name) => `<div style="margin:6px 0"><b>${name}</b><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">${PAL[k].map(v => k === 'icon'
    ? `<button data-k="${k}" data-v="${v}" style="font-size:26px;width:46px;height:46px;border-radius:12px;border:3px solid ${P[k] === v ? '#ff7a1a' : '#ddd'};background:#fff">${v}</button>`
    : `<button data-k="${k}" data-v="${v}" style="width:42px;height:42px;border-radius:50%;border:4px solid ${P[k] === v ? '#ff7a1a' : '#fff'};background:${hex(v)};box-shadow:0 1px 4px #0004"></button>`).join('')}</div></div>`;
  document.getElementById('talkT').textContent = '🎨 Покрасить корабль';
  const body = document.getElementById('talkBody');
  body.innerHTML = row('hull', '🛶 Корпус') + row('a', '⛵ Парус — полоски 1') + row('b', '⛵ Парус — полоски 2') + row('flag', '🚩 Флаг') + row('icon', '✨ Картинка на флаге');
  body.querySelectorAll('button[data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k; P[k] = k === 'icon' ? b.dataset.v : +b.dataset.v; persist(); repaint(P); SFX.pop(); paintPanel(save); });
  openOv('talk'); SFX.tap();
}

// ================= раз в кадр =================
export function updateFun(dt, hero, save, cam, act, ship) {
  const ev = { sfx: [] }, c = coveSave(save), p = hero.pos, sl = seaLevel();
  if (act.cove && cf) updateBeach(dt, hero, save, cam, ev, c, p, sl);
  if (act.sea && sf) updateSea(dt, hero, save, ev, c, p, sl, ship);
  if (scope && !hero.climb?.scope) scopeOff();
  if (scope) updateScope(dt, hero, save, ev, c);
  return ev;
}
function updateBeach(dt, hero, save, cam, ev, c, p, sl) {
  const t = cf.t += dt;
  // костёр
  cf.fire.forEach((f, i) => { f.scale.y = 1 + Math.sin(t * (9 + i * 3)) * 0.25; f.scale.x = f.scale.z = 1 + Math.sin(t * 7 + i) * 0.1; });
  if (Math.random() < dt * 2) puff(getNightK() > 0.5 ? '✨' : '💨', V3(CAMP.x, 1.8, CAMP.z), { size: 0.7, rise: 1.6, life: 1.2, dx: 0.3 });
  // гамак качается; в гамаке — дремлешь
  cf.ham.rotation.z = Math.sin(t * 1.1) * (hero.climb?.hammock ? 0.12 : 0.04);
  if (hero.climb?.hammock) {
    cf.hamT += dt; if (Math.random() < dt * 0.8) puff('💤', p.clone().setY(p.y + 1.6), { size: 0.7, rise: 1, life: 1.4 });
    if (cf.hamT > 8 && c.got.ham !== 1) { c.got.ham = 1; ev.save = true; coins(ev, 10); ev.say = '🌴 Хорошо отдохнул в гамаке! +10 монет'; }
  }
  // тарзанка
  const S = cf.swing;
  if (S && hero.climb?.swingR) {
    S.t += dt; const amp = 0.9 + Math.min(0.25, S.t * 0.03);
    S.a = Math.cos(S.t * 1.25) * amp; S.w = -Math.sin(S.t * 1.25) * amp * 1.25;
    cf.rope.rotation.z = S.a; hero.climb.face = S.w < 0 ? -Math.PI / 2 : Math.PI / 2;
    // лучший момент: летишь к морю и уже поднимаешься (примерно на ⅔ подъёма) — верёвка зеленеет, над героем звёздочка
    const th = (S.t * 1.25) % (Math.PI * 2), best = th > 1.85 && th < 2.55;
    cf.ropeM.color.setHex(best ? 0x3fe05a : 0xd8c08a); cf.ropeM.emissive.setHex(best ? 0x1a6020 : 0);
    if (best && !S.star) { S.star = true; puff('⭐', p.clone().setY(p.y + 3), { size: 1.2, rise: 0.6, life: 0.6 }); } else if (!best) S.star = false;
    if (!c.swingTip && S.t > 6) { c.swingTip = 1; ev.save = true; ev.say = '🪢 Подсказка: прыгай, когда верёвка станет зелёной ⭐<small>тогда улетишь дальше всего</small>'; }
  } else cf.rope.rotation.z = damp(cf.rope.rotation.z, 0, 2, dt);
  if (S?.rel) { hero.vel.copy(S.rel); S.rel = null; hero.grounded = false; hero.coast = true; }
  if (S?.out) {
    S.out.max = Math.max(S.out.max, -170.5 - p.x);                    // дальность — от столба тарзанки
    if (hero.inSea || hero.grounded) {
      const d = Math.round(Math.max(0, S.out.max)); cf.swing = null; hero.coast = false;                       // в воде — уже не летим по инерции
      if (hero.inSea) { puff('💦', p.clone().setY(sl + 0.5), { size: 2, rise: 1.5 }); ev.sfx.push('splash'); }
      const best = c.swingBest || 0; if (d > best) { c.swingBest = d; ev.save = true; }
      if (d > best && best) { coins(ev, 15); ev.say = `🪢 Плюх! ${d} м — новый рекорд! 🏆<small>+15 монет · было ${best} м</small>`; ev.big = true; }
      else ev.say = `🪢 Плюх! ${d} м<small>${best ? `рекорд — ${best} м · ` : ''}прыгай, когда верёвка зелёная ⭐ — улетишь дальше</small>`;
    }
  }
  // черепашата
  const near5 = near(p, NEST.x, NEST.z, 6);
  if (near5 && !c.got.turtOut && !c.got.turt) {
    c.got.turtOut = 1; ev.save = true; for (const e of cf.nestEggs) e.visible = false;
    cf.babies = [0, 1, 2, 3, 4].map(makeBaby); ev.say = '🐢 Вылупились черепашата! Они идут за тобой<small>отведи их к морю 🌊 — только не беги, малыши медленные</small>'; ev.sfx.push('hatch'); ev.big = true;
  }
  if (c.got.turtOut && !c.got.turt && !cf.babies.length && !cf.restored) { cf.restored = true; cf.babies = [0, 1, 2, 3, 4].map(makeBaby); }   // перезашёл — снова у гнезда
  let lead = p, home = 0;
  for (const b of cf.babies) {
    b.t += dt;
    if (b.state === 'sea') { b.pos.x -= dt * 4; b.pos.y = sl - 0.2; b.g.visible = b.pos.x > SHORE - 22; continue; }
    const dx = lead.x - b.pos.x, dz = lead.z - b.pos.z, d = Math.hypot(dx, dz), far = Math.hypot(p.x - b.pos.x, p.z - b.pos.z) > 14;
    if (far) { if (Math.random() < dt * 0.4) puff('💭', b.pos.clone().setY(0.9), { size: 0.6, rise: 0.5, life: 1 }); }
    else if (d > 1.2) { const v = Math.min(3.6, d * 2) * dt; b.pos.x += dx / d * v; b.pos.z += dz / d * v; b.g.rotation.y = Math.atan2(dx, dz); }
    b.pos.y = Math.max(0, b.pos.x > -170 ? 0 : -0.8) + Math.abs(Math.sin(b.t * 10)) * 0.05;
    if (b.pos.x < SHORE - 1) { b.state = 'sea'; coins(ev, 10); ev.sfx.push('pop'); puff('💚', b.pos.clone().setY(1), { size: 0.8, rise: 1 }); }
    lead = b.pos;
  }
  if (cf.babies.length && cf.babies.every(b => b.state === 'sea') && !c.got.turt) {
    c.got.turt = 1; ev.save = true; coins(ev, 30); c.turtles = (c.turtles || 0) + 5;
    ev.say = `🐢 Все черепашата в море! Они машут лапками 💚<small>+80 монет за сегодня · всего спасено: ${c.turtles} · завтра — новое гнездо</small>`; ev.big = true; ev.sfx.push('star');
    cf.nestLab.userData.set('🐢 Гнездо: завтра новое', { color: '#ffffff' });
  }
  // 🌟 созвездие: только ночью; найдено — видны линии, имя и подпись
  if (cf.stars) {
    const S = cf.stars, night = getNightK();
    S.grp.visible = night > 0.3;
    S.stars.forEach((m, i) => { const k = (0.75 + Math.sin(t * 2 + i * 1.7) * 0.25) * Math.min(1, night * 1.5); m.scale.setScalar((i % 4 === 0 ? 1.3 : 0.85) * k); });
    const show = S.found || !!c.mamaStars, op = show ? Math.min(1, night) : 0;
    S.lines.visible = show; S.name.material.opacity = damp(S.name.material.opacity, op, 1.2, dt); S.cap.material.opacity = damp(S.cap.material.opacity, S.found ? op : 0, 1.2, dt);
  }
  // буйки покачиваются
  for (const b of cf.buoys) b.position.y = sl + 0.2 + Math.sin(t * 2 + b.position.x) * 0.1;
}
function updateSea(dt, hero, save, ev, c, p, sl, ship) {
  const t = sf.t += dt, W = sf.whale;
  // кит плывёт по кругу, иногда пускает фонтан
  W.a += dt * 0.06; const wx = WHALE.x + Math.cos(W.a) * WHALE.r, wz = WHALE.z + Math.sin(W.a) * WHALE.r;
  W.g.position.set(wx, sl - 0.6 + Math.sin(t * 0.7) * 0.2, wz); W.g.rotation.y = -W.a;                     // голова (+z) — по ходу движения по кругу W.tail.rotation.x = Math.sin(t * 1.5) * 0.25;
  const head = W.g.localToWorld(V3(0, 1.4, 4.6));
  if ((sf.spoutT -= dt) <= 0) { sf.spoutT = 7; sf.spout = 2.2; }
  if (sf.spout > 0) {
    sf.spout -= dt; const h = Math.sin((1 - sf.spout / 2.2) * Math.PI) * 7;
    W.sp.position.set(head.x, head.y + h / 2, head.z); W.sp.scale.set(0.9, Math.max(0.1, h), 0.9);
    if (Math.random() < dt * 8) puff('💦', V3(head.x, head.y + h, head.z), { size: 1.2, rise: 0.8, life: 0.8 });
    if (hero.inSea && !hero.dive && Math.hypot(p.x - head.x, p.z - head.z) < 4 && h > 2) { hero.vel.y = 24; hero.seaJump = 1; hero.grounded = false; if (!sf.saidW) { sf.saidW = 1; ev.say = '🐋 Фонтан кита подбросил тебя! Уи-и-и!'; ev.big = true; } ev.sfx.push('boing'); }
  } else W.sp.position.y = -50;
  if (hero.inSea && Math.hypot(p.x - wx, p.z - wz) < 9 && !sf.saidNear) { sf.saidNear = 1; ev.say = '🐋 Это кит! Он добрый — подплыви к фонтану на голове'; }
  // дельфины: рядом с кораблём, когда плывёшь, иначе — у своего места
  const sailing = !!hero.climb?.ship && ship;
  sf.dol.forEach((d, i) => {
    const k = (t * 0.9 + d.ph) % (Math.PI * 2), jump = Math.max(0, Math.sin(k * 2));
    let cx, cz, dir;
    if (sailing) { const hd = ship.head, side = i - 1; cx = ship.pos.x + Math.sin(hd) * (5 + i * 2) + Math.cos(hd) * side * 4.5; cz = ship.pos.z + Math.cos(hd) * (5 + i * 2) - Math.sin(hd) * side * 4.5; dir = hd; }
    else { const a = t * 0.3 + d.ph; cx = DOLPH.x + Math.cos(a) * 8; cz = DOLPH.z + Math.sin(a) * 8; dir = a + Math.PI; }
    d.g.position.x = damp(d.g.position.x === 0 ? cx : d.g.position.x, cx, 3, dt); d.g.position.z = damp(d.g.position.z, cz, 3, dt);
    if (Math.abs(d.g.position.x - cx) > 30) { d.g.position.x = cx; d.g.position.z = cz; }
    d.g.position.y = sl - 0.8 + jump * 2.6; d.g.rotation.y = dir; d.g.rotation.x = -Math.cos(k * 2) * 0.6 * (jump > 0 ? 1 : 0);
    if (jump > 0.05 && jump < 0.15 && Math.random() < 0.3) puff('💦', d.g.position.clone(), { size: 0.7, rise: 0.4, life: 0.5 });
  });
  if (sailing && !sf.saidD) { sf.saidD = 1; ev.say = '🐬 Дельфины плывут рядом с кораблём!'; }
  // 🌊 находки: покачиваются на волнах / лежат на дне; подплыл, нырнул или подошёл на корабле — твоё
  const onShip = !!hero.climb?.ship && ship;
  for (const L of sf.loot) {
    if (L.gone) continue; const K = SEA_LOOT[L.kind], q = L.m.position;
    if (K.deep) { q.y = DEEP_Y + 0.05; L.m.rotation.y += dt * 0.5; }
    else { q.y = sl - 0.25 + Math.sin(t * 1.4 + L.ph) * 0.15; L.m.rotation.y = Math.sin(t * 0.5 + L.ph) * 0.4; if (L.kind === 'barrel') { q.x += dt * 0.6; if (q.x > SHORE - 8) L.gone = true, sf.g.remove(L.m); } }
    const d = Math.hypot(p.x - q.x, p.z - q.z);
    const got = K.deep ? (d < 2.2 && p.y < DEEP_Y + 3) : (d < 2.4 && p.y < sl + 2.5) || (onShip && Math.hypot(ship.pos.x - q.x, ship.pos.z - q.z) < 5);
    if (got) grabSeaLoot(L, ev, c);
  }
  if ((sf.driftT -= dt) <= 0) {                                         // течение выносит бочку
    sf.driftT = 120 + Math.random() * 90;
    if (sf.loot.filter(L => !L.gone && L.kind === 'barrel').length < 2) { let x, z, n = 0; do { x = -350 + Math.random() * 100; z = -25 + Math.random() * 145; } while (!seaFree(x, z) && ++n < 30); sf.loot.push({ kind: 'barrel', x, z, m: lootModel(sf.g, 'barrel', x, z), ph: Math.random() * 6 }); }
  }
  sf.loot = sf.loot.filter(L => !L.gone);
  // смотритель смотрит на героя, колокол качается
  const K = sf.keeper; if (near(p, ISLES.light.x, ISLES.light.z, 6) && p.y > LH_TOP - 1) {
    K.m.root.rotation.y = dampAngle(K.m.root.rotation.y, Math.atan2(p.x - K.g.position.x, p.z - K.g.position.z), 4, dt);
    if (!K.said) { K.said = 1; ev.say = ['🧓 «Здравствуй! Я смотритель маяка. Отсюда видно всю бухту!»<small>🚡 вниз — на канатке · 🔔 — позвонить в колокол</small>', '🧓 «Ночью маяк гаснет — зажги его 💡, и к нам приплывёт купец!»', '🧓 «Видишь кита? Он каждый день плавает у Кокосового острова»'][Math.floor(Math.random() * 3)]; }
  } else K.said = 0;
  if (sf.bell.swing > 0) { sf.bell.swing -= dt; sf.bell.g.rotation.z = Math.sin(sf.bell.swing * 9) * sf.bell.swing * 0.25; }
  // морская черепаха плавает
  const ta = t * 0.08, TU = sf.turtle; TU.root.position.set(-262 + Math.cos(ta) * 14, sl - 0.15 + Math.sin(t * 1.2) * 0.08, 62 + Math.sin(ta) * 9); TU.root.rotation.y = Math.atan2(-Math.sin(ta) * 14, Math.cos(ta) * 9);
  for (const F of TU.fl) F.f.rotation.y = F.sx * Math.sin(t * 2.4 + (F.sz > 0 ? 0 : 1.5)) * 0.5;
  // русалка машет рукой и хвостом, тюлень кивает и хлопает ластами
  const MM = sf.mermaid; MM.m.armR.rotation.x = -2.6 + Math.sin(t * 3) * 0.3; MM.m.armR.rotation.z = 0.4 + Math.sin(t * 3) * 0.3; MM.fin.rotation.x = Math.sin(t * 1.6) * 0.3;
  const SE = sf.seal; SE.head.rotation.x = -0.25 + Math.sin(t * 1.3) * 0.2; SE.fl.forEach((f, i) => { f.rotation.z = (i ? -1 : 1) * Math.abs(Math.sin(t * 4)) * 0.6; }); SE.tail.rotation.x = Math.sin(t * 2) * 0.2;
  // маяк: днём лампа просто светлая; ночью гаснет, пока не зажжёшь
  const night = getNightK() > 0.6;
  if (sf.lit && !night) { sf.lit = null; }
  const on = !night || sf.lit;
  if (sf.lamp) { sf.lamp.material.color.setHex(on ? 0xfff3a0 : 0x4a4a3a); sf.beam.visible = night && !!sf.lit; }
  if (sf.sky) {                                                       // звёзды загораются по одной, будто их рисует луч маяка
    const Sk = sf.sky; Sk.t = sf.lit && night ? Sk.t + dt : 0; Sk.g.visible = Sk.t > 0;
    const n = Math.floor((Sk.t - 2) * 8);
    Sk.stars.forEach((m, i) => { m.visible = i < n; if (m.visible) m.scale.setScalar(1.9 + Math.sin(t * 2.5 + i * 1.3) * 0.5); });
  }
  if (night && !sf.lit && p.y > LH_TOP - 1 && near(p, ISLES.light.x, ISLES.light.z, 5) && !sf.saidL) { sf.saidL = 1; ev.say = '💡 Маяк погас! Зажги его — жми 💡'; }
  // купец
  const M = sf.merchant;
  if (M) {
    if (!sf.lit && !night) { M.leave = true; }
    M.t += dt; const k = M.leave ? Math.max(0, 1 - (M.lt = (M.lt || 0) + dt) / 20) : Math.min(1, M.t / 25);
    M.g.position.lerpVectors(M.from, M.to, k * k * (3 - 2 * k)); M.g.position.y = sl - 0.6 + Math.sin(t * 1.3) * 0.08; M.g.rotation.y = M.leave ? Math.PI / 2 : -Math.PI / 2 + Math.PI;
    if (k >= 1 && !M.said) { M.said = true; ev.say = '🧳 Купец Синдбад приплыл к бухте!<small>подплыви или подойди к его кораблю у причала</small>'; ev.sfx.push('bell'); }
    if (k >= 0.99 && !M.gift && Math.hypot(p.x - M.g.position.x, p.z - M.g.position.z) < 16) {
      M.gift = true;
      if ((c.got.merch || 0) >= 3) { ev.say = '🧳 «Спасибо за свет! Подарки на сегодня кончились — приходи завтра»'; return; }
      c.got.merch = (c.got.merch || 0) + 1; ev.save = true;
      const egg = Math.random() < 0.35; coins(ev, 100); if (egg) ev.giveEgg = { r: 3, v: 'rainbow' };
      ev.say = `🧳 «Спасибо за свет маяка!» — Синдбад дарит подарок<small>+100 монет${egg ? ' и радужное яйцо 🥚 — уже в инкубаторе' : ''}</small>`; ev.big = true; ev.sfx.push('chest');
      confetti(M.g.position.clone().setY(sl + 4), 50);
    }
    if (M.leave && k <= 0) { sf.g.remove(M.g); sf.merchant = null; }
  }
}
function updateScope(dt, hero, save, ev, c) {
  scope.yaw -= input.move.x * 0.55 * dt; scope.pitch = Math.max(-0.3, Math.min(0.7, scope.pitch - input.move.y * 0.35 * dt));   // вверх — до неба (созвездие)
  const eye = V3(SCOPE.x, TOWER.h + 1.6, SCOPE.z), dir = V3(Math.sin(scope.yaw) * Math.cos(scope.pitch), Math.sin(scope.pitch), Math.cos(scope.yaw) * Math.cos(scope.pitch));
  camera.position.copy(eye); camera.lookAt(eye.clone().add(dir)); if (camera.fov !== 16) { camera.fov = 16; camera.updateProjectionMatrix(); }
  hero.model.root.visible = false;
  if (cf?.stars && getNightK() > 0.5) {                               // 🌟 мама нашла созвездие
    const S = cf.stars, ok = new T.Vector3().copy(S.grp.position).sub(eye).normalize().dot(dir) > Math.cos(0.12);
    S.hold = ok ? S.hold + dt : 0;
    if (S.hold > 1 && !S.found) { S.found = true; const first = !c.mamaStars; c.mamaStars = (c.mamaStars || 0) + 1; ev.save = true; ev.sfx.push('star'); ev.say = `🌟 Созвездие «${STARS.name}»<small>${STARS.caption}</small>`; if (first) ev.big = true; }
  }
  const seen = c.seen || (c.seen = {});
  const pos = { whale: sf?.whale.g.position, dolph: sf?.dol[0].g.position, turtle: sf?.turtle.root.position };
  for (const W of WONDERS) {
    const q0 = W.obj?.position || pos[W.id]; if (!q0) continue; const q = q0.clone(); q.y += W.obj ? 1 : 0;   // смотрим на середину фигурки
    const v = q.clone().sub(eye), d = v.length(); v.normalize();
    const ok = v.dot(dir) > Math.cos(0.07);
    scope.hold[W.id] = ok ? (scope.hold[W.id] || 0) + dt : 0;
    if (scope.hold[W.id] > 0.7 && !scope.done?.[W.id]) {
      (scope.done ||= {})[W.id] = 1;
      const fresh = !seen[W.id]; seen[W.id] = 1; ev.save = true;
      const n = WONDERS.filter(w => seen[w.id]).length;
      if (fresh) coins(ev, 20);
      ev.say = `🔭 ${W.e} ${W.name}!${fresh ? ' Новое в альбоме!' : ''}<small>${fresh ? '+20 монет · ' : ''}найдено ${n} из ${WONDERS.length}: ${WONDERS.map(w => seen[w.id] ? w.e : '❔').join(' ')}</small>`;
      ev.sfx.push('star');
      if (fresh && n === WONDERS.length) { coins(ev, 100); ev.say = '🔭 Все морские чудеса найдены! 🐋🐬🧜‍♀️🦭🐢<small>+100 монет — ты зоркий, как настоящий капитан!</small>'; ev.big = true; }
      puff('✨', q.clone().setY(q.y + 2), { size: 2.5, rise: 1.5 });
    }
  }
}
