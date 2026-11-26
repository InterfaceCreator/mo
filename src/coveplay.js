// Пиратская бухта ⚓ — чем там заняться (мир и корабль — cove.js, общее — covecore.js):
//   ⚓ Капитан Ёрш у причала: просит починить корабль, показывает, что уже есть и где искать остальное.
//   🪵🪢🌲🧵 Материалы: доски выносит на берег, верёвки — в лужицах отмели и на Крабьем острове, бревно — в пещере
//      (только в отлив), ткань — в бочках (стреляй из пушки 💣). Каждый день — новые.
//   🍾 Бутылки с посланием (две в день): карта сокровищ-картинка и загадка («найди такую ракушку») или письмо русалки.
//   💣 Пушка в форте: прицелиться (джойстик — поворот и дальность, точки показывают полёт) и попасть в бочки, бутылки, плот.
//   🗺️ Клад по карте: на картинке — примета (🐢 ⚓ 🌴 🐚 🗼 🥥), сколько шагов 👣 и куда; копать ⛏️ у ❌.
//   🦜 Попугай Кеша (за починенный корабль): сидит на плече, подсказывает 🔥 тепло / ❄️ холодно; кнопкой — летит,
//      им управляешь сам, сверху видно ❌ клада.
//   🏰 Песочный замок: строй из песка, ставь флажки и зови волну 🌊 — что устояло, то и звёзды.
//   🏝️ Острова: сундук на маяке, кокосы, Крабий остров с крабами и сундуком; под водой — затонувший корабль,
//      сундук в трюме, жемчужины в ракушках и добрый осьминог Оська.
import { T, scene, group, box, mat, damp, dampAngle, BOX as BOXG } from './engine.js';
import { solid, addCollider, onLevelReset, groundY } from './world.js';
import { makeLabel, puff, confetti, sprite, emojiTex, arc } from './fx.js';
import { toast, openOv } from './ui.js';
import { SFX } from './sfx.js';
import { input } from './input.js';
import { buildHero, compactHero } from './hero.js';
import { persist } from './save.js';
import { COVE, SHORE, FLAT_Y, DEEP_Y, ISLE_Y, ISLES, SANDBAR, PIER, CAVE, CASTLE, FORT, CAPTAIN, BOUNDS, WRECK,
  seaLevel, lowTide, tideLeft, floorAt, coveSave, STAGES, MAT, canBuild, dayRand, seeded, rock, V3, WHO, today } from './covecore.js';
import { BOTTLE, BOTTLE_SIGN } from './mamanotes.js';

export const LIGHT_H = 13.6;                                         // высота башни маяка
export const COCO_PALMS = [[-309, 75], [-301, 81], [-305, 83.5]];
const LANDMARKS = [
  { id: 'turtle', e: '🐢', name: 'камень-черепаха', x: -150, z: 16 },
  { id: 'palms', e: '🌴', name: 'две пальмы', x: -141, z: 98 },
  { id: 'anchor', e: '⚓', name: 'старый якорь', x: -158, z: 58 },
  { id: 'shell', e: '🐚', name: 'большая ракушка', x: -146, z: -22 },
  { id: 'light', e: '🗼', name: 'маяк', x: ISLES.light.x, z: ISLES.light.z, isle: true },
  { id: 'coco', e: '🥥', name: 'Кокосовый остров', x: ISLES.coco.x, z: ISLES.coco.z, isle: true },
];
const DIRS = { sea: [-1, 0, '🌊', 'к морю'], land: [1, 0, '🌿', 'от моря'], north: [0, -1, '⬆️', 'вверх по карте'], south: [0, 1, '⬇️', 'вниз по карте'] };
const STEP = 2.5;                                                    // один след 👣 — 2.5 м
const SHELL_COLORS = [[0xff7ac8, '#ff7ac8', 'розовая'], [0x3fa7ff, '#3fa7ff', 'голубая'], [0xffd23f, '#ffd23f', 'жёлтая'], [0x9b6bff, '#9b6bff', 'фиолетовая'], [0x5fd35f, '#5fd35f', 'зелёная']];
const BARRELS = [[-196, -8], [-212, 8], [-226, -16]], BOTTLE_ROCK = { x: -205, z: 16, h: 1.4 }, RAFT = { x: -238, z0: -22, z1: 22 };
const CANNON = { x: FORT.x - 1.5, z: FORT.z, y: 1.2 };

let cp = null, sp = null, pq = null;
export const coveDebug = () => ({ cp, sp, pq });                        // для проверок из консоли
export const hideParrot = () => { if (pq) pq.root.visible = false; };   // бухта далеко — Кешу не видно                                // бухта, море, попугай (вне секторов)
onLevelReset(() => { cp = sp = pq = null; });

const lab = (x, y, z, text, color = '#ffffff', w = 5, h = 1.2) => { const l = makeLabel(w, h); l.position.set(x, y, z); scene.add(l); l.userData.set(text, { color }); return l; };
const near = (p, x, z, r) => Math.hypot(p.x - x, p.z - z) < r;
const coins = (ev, n) => { ev.coins = (ev.coins || 0) + n; };
function chestMesh(g, x, y, z, s = 1) {
  const c = group(g, x, y, z); c.userData.dynamic = true;
  box(c, 1.4 * s, 0.8 * s, 0.9 * s, 0x8a5a2b, 0, 0.4 * s, 0); box(c, 1.45 * s, 0.35 * s, 0.95 * s, 0xa0703f, 0, 0.95 * s, 0);
  box(c, 1.5 * s, 0.12 * s, 0.12 * s, 0xffd23f, 0, 0.8 * s, 0.46 * s); box(c, 0.22 * s, 0.3 * s, 0.06 * s, 0xffd23f, 0, 0.62 * s, 0.48 * s);
  return c;
}
// материал в копилку (корабль уже готов — монетки вместо досок)
function give(save, ev, k, n = 1) {
  const c = coveSave(save), [e, name] = MAT[k];
  if (c.stage >= 4) { coins(ev, 5 * n); ev.say = `${e} ${name[0].toUpperCase() + name.slice(1)}! Корабль уже готов — +${5 * n} монет`; return; }
  c.inv[k] = (c.inv[k] || 0) + n; ev.save = true;
  const S = STAGES[c.stage], need = S.need[k];
  ev.say = `${e} +${n} ${name}!<small>${need ? `для «${S.name}»: ${Math.min(c.inv[k], need)} из ${need}` : `в запасе: ${c.inv[k]}`}${canBuild(c) ? ' · всё есть — 🔨 к кораблю!' : ''}</small>`;
}

// ================= постройка: бухта =================
export function buildCovePlay(g, save) {
  const c = coveSave(save), R = seeded(31);
  cp = { g, t: 0, save, picks: [], bottles: [], targets: [], balls: [], aim: [], said: {}, hintT: 0, capSaid: false };
  // капитан Ёрш
  const pg = group(g, CAPTAIN.x, 0, CAPTAIN.z); pg.userData.dynamic = true;
  const pm = buildHero(pg, { skin: 0xf2c29a, shirt: 0x2a5aa8, pants: 0x1d1d23, shoes: 0x3a2a1a, sole: 0x1d1d1d, hair: 0x2a1a10, hairHi: 0x2a1a10, style: 'crop', hat: 'scarf', hatC: 0xd8261a, beard: 0x2a1a10, stripes: 0xffffff });
  compactHero(pm); pm.root.rotation.y = -Math.PI / 2; cp.cap = { g: pg, m: pm };
  lab(CAPTAIN.x, 4.4, CAPTAIN.z, '⚓ Капитан Ёрш · 💬', '#ffe14d', 5.6, 1.2);
  // приметы для клада
  { const tg = group(g, -150, 0, 16); tg.rotation.y = 0.5;                       // камень-черепаха: панцирь из камня, голова, лапы
    box(tg, 3.6, 1.2, 4.2, 0x7a9a6a, 0, 0.6, 0, { studs: true }); box(tg, 2.8, 0.8, 3.2, 0x8aaa78, 0, 1.6, 0, { studs: true }); box(tg, 1.6, 0.5, 1.8, 0x9aba88, 0, 2.2, 0);
    for (const [dx, dz] of [[-0.7, -0.8], [0.7, -0.8], [0, 0.6], [-0.7, 0.6], [0.7, 0.6]]) box(tg, 0.7, 0.08, 0.7, 0x5a7a4a, dx, 2.0, dz, { shadow: false });
    box(tg, 1.3, 1.1, 1.4, 0x8a9a80, 0, 0.9, 2.6); for (const sx of [-1, 1]) { box(tg, 0.18, 0.22, 0.1, 0x1a1a1a, sx * 0.35, 1.15, 3.32); box(tg, 1.1, 0.6, 1.2, 0x7a8a70, sx * 1.9, 0.3, 1.4); box(tg, 1.1, 0.6, 1.2, 0x7a8a70, sx * 1.9, 0.3, -1.5); }
    box(tg, 0.6, 0.4, 0.8, 0x7a8a70, 0, 0.3, -2.4);
    addCollider({ x0: -152.4, x1: -147.6, z0: 13.4, z1: 18.6, y0: 0, y1: 2.3 }); }
  for (const dz of [-1.6, 1.6]) { const p = group(g, -141, 0, 98 + dz); for (let i = 0; i < 6; i++) box(p, 0.5, 1, 0.5, 0x8a5a2b, 0, 0.5 + i, 0); for (let k = 0; k < 5; k++) { const lf = box(p, 2.8, 0.1, 0.8, 0x2e9a2e, Math.cos(k * 1.26) * 1.2, 6, Math.sin(k * 1.26) * 1.2); lf.rotation.y = -k * 1.26; lf.rotation.z = -0.3; } addCollider({ x0: -141.4, x1: -140.6, z0: 98 + dz - 0.4, z1: 98 + dz + 0.4, y0: 0, y1: 6 }); }
  const an = group(g, -158, 0, 58); box(an, 0.4, 3, 0.4, 0x5a6470, 0, 1.5, 0); box(an, 2.4, 0.35, 0.4, 0x5a6470, 0, 0.3, 0); for (const sx of [-1, 1]) box(an, 0.4, 0.8, 0.4, 0x5a6470, sx * 1.1, 0.6, 0); box(an, 1.4, 0.3, 0.4, 0x5a6470, 0, 2.7, 0); an.rotation.z = 0.25;
  addCollider({ x0: -159, x1: -157, z0: 57.6, z1: 58.4, y0: 0, y1: 3 });
  const sh = group(g, -146, 0, -22); for (let i = 0; i < 5; i++) { const r = box(sh, 0.5, 1.6 - Math.abs(i - 2) * 0.3, 2.2 - Math.abs(i - 2) * 0.3, 0xffc0d0, (i - 2) * 0.48, 0.8, 0); r.rotation.z = (i - 2) * 0.25; }
  addCollider({ x0: -147.3, x1: -144.7, z0: -23.1, z1: -20.9, y0: 0, y1: 1.6 });
  // доски на берегу (8 в день), верёвки в лужицах (2) и на Крабьем острове (1), ракушки на отмели (видны в отлив)
  const Rp = dayRand('plank'), okZ = z => Math.abs(z - 43) > 4 && !(z > SANDBAR.z0 - 3 && z < SANDBAR.z1 + 3);
  for (let i = 0, n = 0; i < 60 && n < 8; i++) { const x = -171.5 + Rp() * 5, z = -30 + Rp() * 136; if (!okZ(z)) continue; addPick(g, c, 'pl' + n, 'plank', x, floorAt(x, z), z, Rp() * 3); n++; }
  for (let i = 0, n = 0; i < 60 && n < 2; i++) { const x = -187 + Rp() * 14, z = -28 + Rp() * 130; if (!okZ(z)) continue; addPick(g, c, 'rp' + n, 'rope', x, FLAT_Y, z); n++; }
  addPick(g, c, 'rp2', 'rope', ISLES.crab.x + 2, ISLE_Y, ISLES.crab.z - 2);
  for (let i = 0, n = 0; i < 60 && n < 6; i++) { const x = -188 + Rp() * 16, z = -30 + Rp() * 136; if (!okZ(z)) continue; addPick(g, c, 'sh' + n, n % 2 ? 'star' : 'shell', x, FLAT_Y, z); n++; }
  if (c.stage < 3 && !c.inv.log) addPick(g, c, 'log', 'log', -180, FLAT_Y, 121.5);
  addPick(g, c, 'cave', 'chest', -175.5, FLAT_Y, 126);
  buildCave(g, c);
  addPick(g, c, 'crab', 'chest', ISLES.crab.x - 1.5, ISLE_Y, ISLES.crab.z + 2.5);
  // бутылки с посланиями
  const Rb = dayRand('bottle');
  for (let i = 0; i < (WHO === 'mama' ? 3 : 2); i++) {                  // третья — записка для мамы 💌
    let z; do { z = -28 + Rb() * 134; } while (!okZ(z));
    const x = -169 + Rb() * 2.5, bg = group(g, x, 0.15, z); bg.userData.dynamic = true;
    const b = box(bg, 0.32, 0.8, 0.32, 0x3fbf7a, 0, 0.3, 0, { shadow: false }); b.material = new T.MeshLambertMaterial({ color: i === 2 ? 0xff9ac8 : 0x5fd8a0, transparent: true, opacity: 0.8 });
    box(bg, 0.16, 0.2, 0.16, 0x9a6a3c, 0, 0.8, 0); box(bg, 0.2, 0.4, 0.04, 0xfff3d0, 0, 0.3, 0, { shadow: false }); bg.rotation.z = 1.2; bg.rotation.y = Rb() * 6;
    const sp2 = box(g, 0.22, 0.22, 0.22, 0xffffff, x, 1.3, z, { shadow: false }); sp2.material = new T.MeshBasicMaterial({ color: 0xfff6c0 }); sp2.userData.dynamic = true;   // искорка-блик
    cp.bottles.push({ i, x, z, g: bg, s: sp2 }); bg.visible = sp2.visible = !c.got['b' + i];
  }
  // загадка «найди ракушку»: 5 цветных ракушек на пляже (появляются, когда прочитал записку)
  const Rs = dayRand('shells'); cp.puzzle = { want: Math.floor(Rs() * 5), shells: [] };
  for (let i = 0; i < 5; i++) {
    let x, z; do { x = -166 + Rs() * 30; z = -30 + Rs() * 134; } while (Math.abs(z - 43) < 5 || (x > -167 && x < -155 && z > -6 && z < 10) || (x > CASTLE.x0 - 2 && x < CASTLE.x0 + 12 && z > CASTLE.z0 - 2 && z < CASTLE.z0 + 12));
    const sg = group(g, x, groundY(x, z), z); sg.userData.dynamic = true; sg.userData.y = groundY(x, z);
    for (let k = 0; k < 4; k++) { const r = box(sg, 0.22, 0.4 - Math.abs(k - 1.5) * 0.1, 0.7, SHELL_COLORS[i][0], (k - 1.5) * 0.2, 0.2, 0); r.rotation.z = (k - 1.5) * 0.25; }
    cp.puzzle.shells.push({ i, x, z, g: sg });
  }
  // форт с пушкой
  for (const [x0, x1, z0, z1] of [[FORT.x - 7, FORT.x + 2, FORT.z - 6, FORT.z - 5], [FORT.x - 7, FORT.x + 2, FORT.z + 5, FORT.z + 6], [FORT.x - 7, FORT.x - 6, FORT.z - 6, FORT.z - 2], [FORT.x - 7, FORT.x - 6, FORT.z + 2, FORT.z + 6]])
    solid(g, x1 - x0, 1.6, z1 - z0, 0xa8a090, (x0 + x1) / 2, 0, (z0 + z1) / 2);
  solid(g, 4, 0.4, 4, 0x9a8a70, CANNON.x, 0, CANNON.z, { studs: true });
  const cg = group(g, CANNON.x, 0.4, CANNON.z); cg.userData.dynamic = true;
  for (const sx of [-0.5, 0.5]) { box(cg, 0.2, 0.8, 1.6, 0x8a5a2b, sx, 0.4, 0); for (const sz of [-0.55, 0.55]) box(cg, 0.15, 0.6, 0.6, 0x5a3a1a, sx * 1.4, 0.3, sz); }
  const barrel = group(cg, 0, 0.85, 0); box(barrel, 0.55, 0.55, 2, 0x2b2b33, 0, 0, 0.6); box(barrel, 0.7, 0.7, 0.3, 0x3a3f48, 0, 0, 1.55); box(barrel, 0.5, 0.5, 0.5, 0x3a3f48, 0, 0, -0.5);
  cg.rotation.y = -Math.PI / 2; cp.cannon = { g: cg, barrel, yaw: 0, pow: 0.4, cool: 0 };
  lab(CANNON.x, 3.4, CANNON.z, '💣 Пушка', '#ffe14d', 3.6, 0.9);
  for (let i = 0; i < 4; i++) box(g, 0.45, 0.45, 0.45, 0x2b2b33, FORT.x + 1, 0.22 + (i > 2 ? 0.4 : 0), FORT.z + 3 + (i % 3) * 0.5);   // горка ядер
  const ballGeo = new T.SphereGeometry(0.32, 10, 8); cp.ballGeo = ballGeo; cp.ballMat = mat(0x1d1d23);
  for (let i = 0; i < 12; i++) { const d = box(g, 0.4, 0.4, 0.4, 0xffffff, 0, -50, 0, { shadow: false }); d.material = new T.MeshBasicMaterial({ color: 0xfff3a0 }); d.userData.dynamic = true; cp.aim.push(d); }
  // мишени: бочки на воде, бутылки на камне, плот с мишенью
  BARRELS.forEach(([x, z], i) => {
    const bg = group(g, x, 0, z); bg.userData.dynamic = true;
    box(bg, 1.3, 1.6, 1.3, 0x9a6a3a, 0, 0, 0); for (const y of [-0.5, 0.5]) box(bg, 1.36, 0.14, 1.36, 0x3a3f48, 0, y, 0);
    cp.targets.push({ kind: 'barrel', i, g: bg, x, z, r: 1.7, y: 0, back: 0 });
  });
  solid(g, 2.4, BOTTLE_ROCK.h - DEEP_Y, 2.4, 0x8a8f9a, BOTTLE_ROCK.x, DEEP_Y, BOTTLE_ROCK.z);
  for (let i = 0; i < 3; i++) {
    const bg = group(g, BOTTLE_ROCK.x, BOTTLE_ROCK.h, BOTTLE_ROCK.z - 0.8 + i * 0.8); bg.userData.dynamic = true;
    box(bg, 0.3, 0.7, 0.3, [0x3fbf7a, 0x8a5a2b, 0x3fa7ff][i], 0, 0.35, 0); box(bg, 0.14, 0.2, 0.14, 0xd8d8d8, 0, 0.8, 0);
    cp.targets.push({ kind: 'bottle', i, g: bg, x: BOTTLE_ROCK.x, z: BOTTLE_ROCK.z - 0.8 + i * 0.8, r: 1.15, y: BOTTLE_ROCK.h + 0.4, back: 0 });
  }
  const rg = group(g, RAFT.x, 0, 0); rg.userData.dynamic = true;
  for (let i = 0; i < 5; i++) box(rg, 0.6, 0.4, 3.4, 0xb07a3a, (i - 2) * 0.62, 0, 0);
  const board = group(rg, 0, 1.8, 0); [[2.6, 0xffffff], [1.9, 0xd8261a], [1.2, 0xffffff], [0.55, 0xd8261a]].forEach(([s, col], k) => box(board, 0.1 + k * 0.02, s, s, col, 0, 0, 0, { shadow: false }));
  box(rg, 0.15, 1.2, 0.15, 0x6a3f1e, 0, 0.6, 0);
  cp.targets.push({ kind: 'raft', g: rg, x: RAFT.x, z: 0, r: 2.1, y: 1.8, back: 0 });
  // песочница для замка
  const S = CASTLE, W = S.n * S.s;
  box(g, W + 0.6, 0.06, W + 0.6, 0xe8d090, S.x0 + W / 2, 0.03, S.z0 + W / 2, { shadow: false });
  for (const [dx, dz, w, d] of [[W / 2, -0.3, W + 0.6, 0.2], [W / 2, W + 0.3, W + 0.6, 0.2], [W + 0.3, W / 2, 0.2, W + 0.6]]) box(g, w, 0.3, d, 0xd8b070, S.x0 + dx, 0.15, S.z0 + dz, { shadow: false });
  lab(S.x0 + W / 2, 3.2, S.z0 - 1.2, '🏰 Песочный замок', '#ffe14d', 5, 1.1);
  box(g, 0.5, 0.6, 0.5, 0xff5a3a, S.x0 + W + 1.2, 0.3, S.z0 - 0.6); box(g, 0.2, 0.6, 0.06, 0xff5a3a, S.x0 + W + 1.2, 0.8, S.z0 - 0.35);   // ведёрко
  const im = new T.InstancedMesh(new T.BoxGeometry(S.s * 0.96, S.s * 0.8, S.s * 0.96), mat(0xf0d488, { studs: true }), S.n * S.n * 4); im.count = 0; im.userData.dynamic = true; im.castShadow = true; g.add(im);
  const H = Array.isArray(c.castle?.h) && c.castle.h.length === 64 ? c.castle.h.slice() : Array(64).fill(0), FL = Array.isArray(c.castle?.f) && c.castle.f.length === 64 ? c.castle.f.slice() : Array(64).fill(0);
  cp.castle = { im, H, FL, flags: [], wave: null, cool: 0 };
  const wv = box(g, 1.4, 1.6, W + 2, 0xbfe8ff, 0, -50, S.z0 + W / 2, { shadow: false }); wv.material = new T.MeshLambertMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.75 }); wv.userData.dynamic = true; cp.castle.wv = wv;
  castleDraw();
  // Крабий остров: крабы и король крабов
  cp.crabs = [];
  for (let i = 0; i < 4; i++) {
    const cg2 = group(g, ISLES.crab.x, ISLE_Y, ISLES.crab.z); cg2.userData.dynamic = true;
    box(cg2, 0.8, 0.35, 0.6, 0xe2442a, 0, 0.25, 0); for (const sx of [-1, 1]) { box(cg2, 0.3, 0.25, 0.3, 0xff6a4a, sx * 0.55, 0.35, 0.35); box(cg2, 0.08, 0.25, 0.08, 0x1a1a1a, sx * 0.15, 0.55, 0.2); }
    cp.crabs.push({ g: cg2, a: i * 1.6, r: 2.5 + i * 0.8, sp: 0.4 + i * 0.1 });
  }
  const king = group(g, ISLES.crab.x - 2, ISLE_Y, ISLES.crab.z - 1); king.userData.dynamic = true;
  box(king, 1.8, 0.7, 1.3, 0xd8261a, 0, 0.5, 0); for (const sx of [-1, 1]) box(king, 0.7, 0.5, 0.6, 0xff5a3a, sx * 1.2, 0.8, 0.7); box(king, 0.8, 0.35, 0.6, 0xffd23f, 0, 1.05, 0);
  for (const sx of [-1, 1]) box(king, 0.15, 0.4, 0.15, 0x1a1a1a, sx * 0.3, 1, 0.5);
  cp.king = king; lab(ISLES.crab.x, 4, ISLES.crab.z, '🦀 Крабий остров', '#ffffff', 5, 1.1);
  // ❌ клада (видно только сверху, из полёта попугая)
  const xm = group(g, 0, -50, 0); xm.userData.dynamic = true; const xmM = new T.MeshBasicMaterial({ color: 0xff2a2a });
  for (const a of [Math.PI / 4, -Math.PI / 4]) { const b = new T.Mesh(new T.BoxGeometry(4.5, 0.3, 0.9), xmM); b.rotation.y = a; xm.add(b); }
  xm.visible = false; cp.xMark = xm;                                         // красный крест на песке — видно только из полёта Кеши
}
function addPick(g, c, id, kind, x, y, z, rot = 0) {
  if (c.got[id] && kind !== 'log') return;
  const pg = group(g, x, y, z); pg.userData.dynamic = true; pg.rotation.y = rot;
  if (kind === 'plank') { box(pg, 1.8, 0.18, 0.45, 0xa8743f, 0, 0.1, 0); box(pg, 1.2, 0.19, 0.06, 0x7a4a22, 0, 0.1, 0.12, { shadow: false }); }
  else if (kind === 'rope') { for (let k = 0; k < 3; k++) box(pg, 0.9 - k * 0.2, 0.14, 0.9 - k * 0.2, k % 2 ? 0xd8b878 : 0xc8a060, 0, 0.08 + k * 0.14, 0); }
  else if (kind === 'log') { const l = box(pg, 0.8, 0.8, 5, 0x8a5a2b, 0, 0.4, 0); l.rotation.y = 0.4; box(pg, 0.82, 0.82, 0.1, 0xd8b070, 0, 0.4, 2.5).rotation.y = 0.4; }
  else if (kind === 'chest') chestMesh(pg, 0, 0, 0, 0.8);
  else if (kind === 'crystal') { const col = [0x7fe8ff, 0xb88aff, 0xff7ac8][Math.floor(Math.random() * 3)], m = new T.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: 0.8 }); for (const [w, h, dx, rz] of [[0.35, 1.1, 0, 0], [0.28, 0.8, 0.3, -0.4], [0.28, 0.7, -0.28, 0.45]]) { const b = new T.Mesh(BOXG, m); b.scale.set(w, h, w); b.position.set(dx, h / 2, 0); b.rotation.z = rz; pg.add(b); } }
  else if (kind === 'treasure') { const ch = chestMesh(pg, 0, 0, 0, 1.5); for (const m of ch.children) if (m.material?.color?.getHex() === 0x8a5a2b) m.material = new T.MeshLambertMaterial({ color: 0xd8a020, emissive: 0x402800 }); }
  else if (kind === 'star') { for (let k = 0; k < 5; k++) { const a = box(pg, 0.18, 0.1, 0.5, 0xff8a3a, Math.sin(k * 1.257) * 0.22, 0.08, Math.cos(k * 1.257) * 0.22); a.rotation.y = k * 1.257; } box(pg, 0.22, 0.12, 0.22, 0xffb060, 0, 0.1, 0); }
  else { for (let k = 0; k < 4; k++) { const r = box(pg, 0.16, 0.3 - Math.abs(k - 1.5) * 0.06, 0.55, 0xffc0d0, (k - 1.5) * 0.15, 0.14, 0); r.rotation.z = (k - 1.5) * 0.3; } }
  cp.picks.push({ id, kind, x, y, z, g: pg, low: kind === 'shell' || kind === 'star' });
}
// ---------- 🕳️ пещера: озеро с кристаллами и рыбками, зал факелов, тайная дверь, сокровищница ----------
const TORCHES = [[-169, 117], [-169, 127], [-155, 117], [-155, 127]];
function buildCave(g, c) {
  const C = CAVE, R = seeded(808);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; addPick(g, c, 'cr' + i, 'crystal', -194 + Math.cos(a) * 4.6, FLAT_Y, 122 + Math.sin(a) * 5.2); }   // кристаллы вокруг озера
  cp.fish = [0, 1, 2, 3].map(i => { const f = box(g, 0.25, 0.25, 0.6, [0x7fffd4, 0xffd23f, 0xff7ac8, 0x7fd4ff][i], -194, -1.3, 122, { shadow: false }); f.material = new T.MeshBasicMaterial({ color: f.material.color }); f.userData.dynamic = true; return f; });
  lab(-193, 4.2, 122, '💧 Подземное озеро', '#bfe8ff', 4.6, 1.1);
  // зал факелов: 4 факела у стен; зажжёшь все — откроется дверь в сокровищницу
  cp.torches = TORCHES.map(([x, z], i) => {
    solid(g, 0.5, 1.6, 0.5, 0x5a4a3a, x, 0, z, { studs: false }); box(g, 0.9, 0.3, 0.9, 0x3a3f48, x, 1.75, z);
    const fl = group(g, x, 1.9, z); fl.userData.dynamic = true;
    [[0.5, 0.7, 0xff5a1a], [0.35, 1, 0xff9a1a], [0.2, 1.2, 0xffe14d]].forEach(([w, h, col]) => { const f = new T.Mesh(BOXG, new T.MeshBasicMaterial({ color: col })); f.scale.set(w, h, w); f.position.y = h / 2; fl.add(f); });
    fl.visible = !!(c.got.torch & (1 << i));
    return { i, x, z, fl };
  });
  lab(-162, 4.4, 122, '🔥 Зажги все 4 факела', '#ffe14d', 5, 1.1);
  const D = C.door;
  solid(g, 1, 9, D.z0 - C.z0, 0x7a7f8a, D.x, -1, (C.z0 + D.z0) / 2, { cam: true }); solid(g, 1, 9, C.z1 - D.z1, 0x7a7f8a, D.x, -1, (D.z1 + C.z1) / 2, { cam: true });
  solid(g, 1, 3, D.z1 - D.z0, 0x7a7f8a, D.x, 3.4, (D.z0 + D.z1) / 2, { cam: true });
  const dg = group(g, D.x, 0, (D.z0 + D.z1) / 2); dg.userData.dynamic = true;
  box(dg, 0.9, 3.4, D.z1 - D.z0, 0x8a8478, 0, 1.7, 0, { studs: true }); const sun = new T.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x6a4a00 });
  for (const [w, h, y] of [[0.1, 1, 1.9], [0.1, 0.4, 1.9]]) { const b = new T.Mesh(BOXG, sun); b.scale.set(w + 0.92, h, h); b.position.set(0, y, 0); dg.add(b); }
  cp.door = { g: dg, col: addCollider({ x0: D.x - 0.5, x1: D.x + 0.5, z0: D.z0, z1: D.z1, y0: 0, y1: 3.4 }), open: false };
  // сокровищница: гора золота, кубки, корона, самоцветы и большой сундук
  const gold = new T.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x5a4000 });
  for (let i = 0; i < 40; i++) { const b = new T.Mesh(BOXG, gold); const s2 = 0.3 + R() * 0.4; b.scale.set(s2 * 1.4, s2 * 0.4, s2 * 1.4); const a = R() * 6.28, r = R() * 3.2; b.position.set(-141 + Math.cos(a) * r, 0.1 + (3.2 - r) * 0.35 + R() * 0.2, 122 + Math.sin(a) * r * 0.8); b.rotation.y = R() * 3; g.add(b); }
  for (const [x, z, col] of [[-143, 119, 0xff3a6a], [-139, 125, 0x3fd8ff], [-138, 119.5, 0x5fd35f], [-144, 125.5, 0xb88aff]]) { const m = new T.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: 0.6 }); const b = new T.Mesh(BOXG, m); b.scale.set(0.5, 0.5, 0.5); b.position.set(x, 0.6, z); b.rotation.set(0.6, 0.6, 0); g.add(b); }
  for (const [x, z] of [[-145, 121], [-137, 123]]) { box(g, 0.25, 0.5, 0.25, 0xffd23f, x, 0.25, z); box(g, 0.5, 0.4, 0.5, 0xffd23f, x, 0.7, z); }   // кубки
  const crown = group(g, -141, 1.55, 122); crown.userData.dynamic = true; box(crown, 0.9, 0.3, 0.9, 0xffd23f); for (const [dx, dz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) box(crown, 0.18, 0.35, 0.18, 0xffd23f, dx, 0.3, dz); box(crown, 0.2, 0.2, 0.2, 0xff3a6a, 0, 0.05, 0.46, { shadow: false }); cp.crown = crown;
  addPick(g, c, 'cavegold', 'treasure', -136, 0, 122, -Math.PI / 2);
  lab(-141, 4.6, 122, '💰 Сокровищница пиратов', '#ffe14d', 6, 1.4);
}
function castleDraw() {
  const K = cp.castle, S = CASTLE, m4 = new T.Matrix4(); let n = 0;
  for (let i = 0; i < S.n; i++) for (let j = 0; j < S.n; j++) for (let k = 0; k < K.H[i * 8 + j]; k++) { m4.makeTranslation(S.x0 + (i + 0.5) * S.s, 0.06 + S.s * 0.4 + k * S.s * 0.8, S.z0 + (j + 0.5) * S.s); K.im.setMatrixAt(n++, m4); }
  K.im.count = n; K.im.instanceMatrix.needsUpdate = true;
  for (const f of K.flags) f.visible = false;
  let fi = 0;
  for (let idx = 0; idx < 64; idx++) if (K.FL[idx]) {
    const i = Math.floor(idx / 8), j = idx % 8;
    if (!K.flags[fi]) { const s = group(cp.g); s.userData.dynamic = true; box(s, 0.06, 0.9, 0.06, 0x6a3f1e, 0, 0.1, 0, { shadow: false }); box(s, 0.04, 0.32, 0.5, [0xff3a3a, 0xffd23f, 0x3fa7ff][fi % 3], 0, 0.38, 0.25, { shadow: false }); K.flags[fi] = s; }
    K.flags[fi].visible = true; K.flags[fi].position.set(S.x0 + (i + 0.5) * S.s, 0.5 + K.H[idx] * S.s * 0.8, S.z0 + (j + 0.5) * S.s); fi++;
  }
}

// ================= постройка: море =================
export function buildSeaPlay(g, save) {
  const c = coveSave(save), L = ISLES.light;
  sp = { g, t: 0, picks: [], oysters: [], coconuts: [], octo: null };
  const top = ISLE_Y + LIGHT_H + 0.4;
  if (!c.got.light) { const ch = chestMesh(g, L.x + 2, top, L.z + 2); sp.picks.push({ id: 'light', g: ch, x: L.x + 2, y: top, z: L.z + 2 }); }
  // кокосы на пальмах
  COCO_PALMS.forEach(([x, z], i) => {
    const cg = group(g, x, ISLE_Y + 6.6, z); cg.userData.dynamic = true;
    for (let k = 0; k < 3; k++) box(cg, 0.5, 0.5, 0.5, 0x7a5a2b, Math.cos(k * 2.1) * 0.4, -0.3, Math.sin(k * 2.1) * 0.4);
    cg.visible = !c.got['co' + i]; sp.coconuts.push({ i, x, z, g: cg });
  });
  // затонувший корабль: большой и полый — пробоина в борту, трюм, каюта капитана с золотым сундуком (ключ — у рака-отшельника)
  const W = WRECK, X0 = W.x - 8, X1 = W.x + 8, Z0 = W.z - 4, Z1 = W.z + 4, Y0 = DEEP_Y, YT = DEEP_Y + 4, WD = 0x5a3f28, WL = 0x6a4a30;
  const wall = (x0, x1, z0, z1, y0 = Y0, y1 = YT, col = WD) => solid(g, x1 - x0, y1 - y0, z1 - z0, col, (x0 + x1) / 2, y0, (z0 + z1) / 2, { studs: false });
  wall(X0, X1, Z1 - 0.6, Z1); wall(X0, W.x - 2, Z0, Z0 + 0.6); wall(W.x + 1.5, X1, Z0, Z0 + 0.6);            // борта; в южном — пробоина
  wall(W.x - 2, W.x + 1.5, Z0, Z0 + 0.6, YT - 1, YT);                                                    // над пробоиной
  wall(X0, X0 + 0.6, Z0, Z1); wall(X1 - 0.6, X1, Z0, Z1);                                                // корма и нос
  wall(W.x - 3.3, W.x - 2.7, Z0 + 0.6, W.z - 1, Y0, YT, WL); wall(W.x - 3.3, W.x - 2.7, W.z + 1, Z1 - 0.6, Y0, YT, WL);   // стенка каюты с дверью
  wall(X0, W.x - 2.7, Z0, Z1, YT - 0.4, YT, 0x4a3420);                                                   // крыша каюты
  for (let x = X0 + 1; x < X1; x += 1.6) box(g, 0.08, 4, 0.06, 0x3a2a1a, x, Y0 + 2, Z1 + 0.03, { shadow: false });   // доски обшивки
  for (const [x, z] of [[X1 + 0.8, W.z], [X1 + 1.8, W.z]]) box(g, 1.2, 3.2 - (x - X1), 6 - (x - X1) * 2.2, WD, x, Y0 + 1.6, z);   // нос клином
  box(g, 0.7, 0.2, Z1 - Z0, 0x4a3420, W.x + 2, YT + 0.1, W.z, { shadow: false }); box(g, 0.7, 0.2, Z1 - Z0, 0x4a3420, W.x + 5, YT + 0.1, W.z, { shadow: false }).rotation.z = 0.3;   // остатки палубы
  box(g, 0.5, 11, 0.5, 0x4a3420, W.x + 4, Y0 + 5.5, W.z + 1);                                            // сломанная мачта торчит из воды
  const mtop = box(g, 2.4, 1.4, 0.08, 0x8a7a6a, W.x + 4, Y0 + 9, W.z + 1.3, { shadow: false }); mtop.rotation.z = 0.2;   // обрывок паруса
  for (let i = 0; i < 14; i++) box(g, 0.5 + Math.random() * 0.6, 0.12, 0.5 + Math.random() * 0.6, [0x3f8f4a, 0x2e7a3a, 0x8a9a6a][i % 3], X0 + Math.random() * 16, Y0 + 0.5 + Math.random() * 3.4, i % 2 ? Z1 + 0.05 : Z0 - 0.05, { shadow: false });   // водоросли и ракушки на бортах
  // внутри: бочки и ящики в трюме, стол и фонарь в каюте
  for (const [x, z] of [[W.x + 4, Z1 - 1.5], [W.x + 5.2, Z1 - 1.6], [W.x + 6, Z0 + 1.5]]) { solid(g, 1, 1.3, 1, 0x7a5a3a, x, Y0, z, { studs: false }); box(g, 1.04, 0.12, 1.04, 0x3a3f48, x, Y0 + 0.65, z, { shadow: false }); }
  solid(g, 1.6, 0.9, 1, 0x7a5a3a, W.x - 6, Y0, W.z + 2.6, { studs: false });
  const lamp = box(g, 0.4, 0.5, 0.4, 0xffc244, W.x - 3.6, Y0 + 2.6, W.z + 2.5, { shadow: false }); lamp.material = new T.MeshBasicMaterial({ color: 0xffd060 });
  lab(W.x + 4, 3.2, W.z + 1, '⚓ Затонувший корабль · ныряй 🤿', '#ffffff', 6.4, 1.3);
  if (!c.got.wreck) { const ch = chestMesh(g, W.x - 6, Y0, W.z, 1.3); for (const m of ch.children) if (m.material?.color?.getHex() === 0x8a5a2b) { m.material = new T.MeshLambertMaterial({ color: 0xd8a020, emissive: 0x402800 }); } sp.picks.push({ id: 'wreck', g: ch, x: W.x - 6, y: Y0, z: W.z, lock: true }); }
  // дорожка из золотых монет: от пробоины через трюм в каюту
  const coinGeo = new T.CylinderGeometry(0.28, 0.28, 0.08, 12), coinM = new T.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x6a4a00 });
  sp.coins = [[W.x, Z0 - 1.5], [W.x, Z0 + 1.2], [W.x - 0.5, W.z - 1.6], [W.x - 1.4, W.z - 0.4], [W.x - 2.2, W.z], [W.x - 3.6, W.z], [W.x - 4.6, W.z - 0.8], [W.x + 2.6, W.z + 1.4], [W.x + 4.5, W.z], [W.x + 6.4, W.z + 1]].map(([x, z], i) => {
    const m = new T.Mesh(coinGeo, coinM); m.rotation.x = Math.PI / 2; m.position.set(x, Y0 + 0.6, z); m.userData.dynamic = true; g.add(m); m.visible = !c.got['gc' + i]; return { i, m, x, z };
  });
  // рак-отшельник с ключом: ползает по дну у кормы
  const hc = group(g, W.x - 16, Y0, W.z + 10); hc.userData.dynamic = true;
  [[1.2, 0.9, 1.2, 0, 0.6, 0, 0xff9a3a], [0.9, 0.7, 0.9, 0, 1.3, -0.1, 0xffe0b0], [0.55, 0.5, 0.55, 0, 1.85, -0.2, 0xff9a3a]].forEach(([w, h, d, x, y, z, col]) => box(hc, w, h, d, col, x, y, z));
  box(hc, 0.7, 0.4, 0.6, 0xe2442a, 0, 0.3, 0.75); for (const sx of [-1, 1]) { box(hc, 0.35, 0.3, 0.4, 0xff5a3a, sx * 0.45, 0.4, 1.15); box(hc, 0.08, 0.3, 0.08, 0x1a1a1a, sx * 0.18, 0.65, 0.95); for (let k = 0; k < 2; k++) box(hc, 0.5, 0.08, 0.1, 0xe2442a, sx * 0.5, 0.12, 0.4 - k * 0.4); }
  const key = group(hc, 0, 2.35, -0.2); const kM = new T.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x806000 });
  for (const [w, h, d, x, y] of [[0.5, 0.5, 0.1, 0, 0.5], [0.12, 0.8, 0.1, 0, 0], [0.25, 0.1, 0.1, 0.12, -0.2], [0.25, 0.1, 0.1, 0.12, -0.35]]) { const b = new T.Mesh(BOXG, kM); b.scale.set(w, h, d); b.position.set(x, y, 0); key.add(b); }
  key.visible = !c.got.key; sp.crab = { g: hc, key, a: 0 };
  // медузы: светятся, медленно поднимаются и опускаются; коснёшься — подбросят вверх
  sp.jellies = [[W.x + 15, W.z + 6, 0xff7ac8], [W.x - 14, W.z - 8, 0x7fd4ff], [W.x + 4, W.z + 12, 0xb88aff], [W.x - 10, W.z + 14, 0x7fffd4], [W.x + 14, W.z - 6, 0xffb0e0]].map(([x, z, col], i) => {
    const j = group(g, x, -4, z); j.userData.dynamic = true;
    const dm = new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.75 });
    const d1 = new T.Mesh(BOXG, dm); d1.scale.set(1.4, 0.6, 1.4); j.add(d1); const d2 = new T.Mesh(BOXG, dm); d2.scale.set(0.9, 0.4, 0.9); d2.position.y = 0.45; j.add(d2);
    const tent = []; for (let k = 0; k < 5; k++) { const tt = new T.Mesh(BOXG, dm); tt.scale.set(0.1, 1.3, 0.1); const a = k * 1.26; tt.position.set(Math.cos(a) * 0.45, -0.9, Math.sin(a) * 0.45); j.add(tt); tent.push(tt); }
    return { g: j, x, z, ph: i * 1.3, tent, cool: 0 };
  });
  // пузырьковые гейзеры: тут можно подышать, не всплывая
  sp.vents = [[W.x - 15, W.z - 2], [W.x + 12, W.z + 3]].map(([x, z]) => {
    box(g, 1.6, 0.8, 1.6, 0x6a6f7a, x, Y0 + 0.4, z); box(g, 0.8, 0.2, 0.8, 0x3a3f48, x, Y0 + 0.85, z, { shadow: false });
    const bm = new T.MeshBasicMaterial({ color: 0xe8f8ff, transparent: true, opacity: 0.7 });
    const bub = []; for (let k = 0; k < 10; k++) { const b = new T.Mesh(BOXG, bm); const s = 0.2 + Math.random() * 0.25; b.scale.set(s, s, s); b.userData.dynamic = true; b.userData.ph = Math.random(); b.userData.dx = (Math.random() - 0.5) * 0.8; g.add(b); bub.push(b); }
    return { x, z, bub };
  });
  // гигантская раковина: открывается раз в 12 секунд, внутри — большая розовая жемчужина
  const cg = group(g, W.x + 18, Y0, W.z + 10); cg.userData.dynamic = true;
  for (let k = 0; k < 5; k++) box(cg, 3.2, 0.6, 0.6, k % 2 ? 0xd8d0e8 : 0xc0b8d8, 0, 0.3, -1.2 + k * 0.6);
  const clid = group(cg, 0, 0.6, -1.5); for (let k = 0; k < 5; k++) box(clid, 3.2, 0.5, 0.6, k % 2 ? 0xe0d8f0 : 0xc8c0e0, 0, 0.25, 0.3 + k * 0.6);
  const bigPearl = new T.Mesh(new T.SphereGeometry(0.55, 14, 10), new T.MeshBasicMaterial({ color: 0xffc8e8 })); bigPearl.position.set(0, 1, 0); cg.add(bigPearl); bigPearl.visible = !c.got.clam;
  sp.clam = { g: cg, lid: clid, pearl: bigPearl, x: W.x + 18, z: W.z + 10, said: 0 };
  // морские коньки покачиваются у водорослей
  sp.horses = [[W.x - 6, W.z - 9, 0xffd23f], [W.x + 9, W.z + 9, 0xff8a3a], [W.x - 12, W.z + 6, 0xff7ac8]].map(([x, z, col], i) => {
    const h = group(g, x, -5, z); h.userData.dynamic = true;
    box(h, 0.35, 0.8, 0.3, col, 0, 0, 0); box(h, 0.3, 0.3, 0.55, col, 0, 0.55, 0.15); box(h, 0.12, 0.12, 0.3, col, 0, 0.5, 0.5); box(h, 0.2, 0.5, 0.2, col, 0, -0.6, -0.12).rotation.x = 0.6; box(h, 0.06, 0.08, 0.08, 0x1a1a1a, 0.16, 0.6, 0.2);
    for (let k = 0; k < 3; k++) box(g, 0.25, 2 + k * 0.6, 0.25, 0x2e9a4a, x + k * 0.5 - 0.5, Y0 + 1 + k * 0.3, z + 0.5, { shadow: false });
    return { g: h, y: -5, ph: i * 2 };
  });
  // ракушки с жемчугом — вокруг корабля, крупные; жемчужина светится
  for (let i = 0; i < 5; i++) {
    const a = i * 1.25 + 0.3, x = W.x + Math.cos(a) * 12, z = W.z + Math.sin(a) * 11;
    const og = group(g, x, DEEP_Y, z); og.userData.dynamic = true; og.scale.setScalar(1.6);
    box(og, 1, 0.25, 1, 0x8a8f9a, 0, 0.12, 0); const lid = group(og, 0, 0.25, -0.45); box(lid, 1, 0.22, 1, 0x9aa0aa, 0, 0.1, 0.45);
    box(og, 0.8, 0.05, 0.8, 0xffb0c8, 0, 0.27, 0, { shadow: false });
    const pearl = new T.Mesh(new T.SphereGeometry(0.22, 10, 8), new T.MeshBasicMaterial({ color: 0xfff6ff })); pearl.position.y = 0.45; og.add(pearl);
    pearl.visible = !c.got['pe' + i]; sp.oysters.push({ i, x, z, g: og, lid, pearl });
  }
  // осьминог Оська
  const og2 = group(g, W.x + 12, DEEP_Y, W.z - 9); og2.userData.dynamic = true;
  box(og2, 1.8, 1.8, 1.8, 0xb88aff, 0, 2.2, 0); box(og2, 1.5, 0.5, 1.5, 0xc8a0ff, 0, 3.2, 0);
  for (const sx of [-1, 1]) { box(og2, 0.4, 0.5, 0.1, 0xffffff, sx * 0.45, 2.4, 0.9); box(og2, 0.2, 0.3, 0.1, 0x1a1a1a, sx * 0.45, 2.35, 0.95); box(og2, 0.25, 0.12, 0.05, 0xff9ac8, sx * 0.7, 2, 0.9); }
  const legs = []; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, lg = group(og2, Math.cos(a) * 0.7, 1.3, Math.sin(a) * 0.7); box(lg, 0.35, 1.4, 0.35, 0xa070f0, 0, -0.6, 0); lg.rotation.y = -a; legs.push(lg); }
  sp.octo = { g: og2, legs, x: W.x + 12, z: W.z - 9, hiT: 0 };
}

// ================= кнопки =================
export function playItems(hero, save) {
  if (!cp && !sp) return [];
  const c = coveSave(save), p = hero.pos, out = [];
  if (hero.climb?.parrot) return [{ id: 'g_cove_land', icon: '🛬' }];   // другой id — кнопка перерисуется
  if (hero.climb?.cannon) return [{ id: 'g_cove_fire', icon: '💥' }];
  if (hero.climb) return [];
  if (cp) {
    if (near(p, CAPTAIN.x, CAPTAIN.z, 4)) out.push({ id: 'g_cove_cap', icon: '⚓' });
    if (near(p, CANNON.x, CANNON.z, 3.2) && p.y < 2.5) out.push({ id: 'g_cove_cannon', icon: '💣' });
    const S = CASTLE, W = S.n * S.s;
    const plot = p.x > S.x0 - 1.2 && p.x < S.x0 + W + 1.2 && p.z > S.z0 - 1.2 && p.z < S.z0 + W + 1.2 && p.y < 1;
    if (plot) {
      out.push({ id: 'g_cove_sand', icon: '🧱' }, { id: 'g_cove_flag', icon: '🚩' });
      if (cp.castle.H.some(h => h)) out.push({ id: 'g_cove_break', icon: '⛏️' }, { id: 'g_cove_wave', icon: '🌊' });   // в песочнице кирка ломает замок
    }
    if (c.got.map && !c.got.tr) {
      out.push({ id: 'g_cove_map', icon: '🗺️' });
      const tr = treasure(c);
      if (!plot && tr && near(p, tr.x, tr.z, 30) && !hero.inSea && p.y > -0.9) out.push({ id: 'g_cove_dig', icon: '⛏️' });
    }
  }
  if (c.parrot && !hero.inSea && pq && p.x < COVE.beach.x1 + 2) out.push({ id: 'g_cove_parrot', icon: '🦜' });   // только в бухте (там же, где Кеша на плече)
  if (sp) for (const k of sp.coconuts) if (k.g.visible && near(p, k.x, k.z, 2.6) && p.y > 0) { out.push({ id: 'g_cove_coco', icon: '🥥' }); break; }
  return out;
}
export function playUse(act, hero, save, ctx) {
  const c = coveSave(save);
  if (act === 'cap') return captainPanel(save);
  if (act === 'map') return mapPanel(save);
  if (act === 'parrot') return startFlight(hero, ctx);
  if (act === 'land') return endFlight(hero);
  if (act === 'fire') return fire();
  if (act === 'cannon' && cp && !hero.climb) {
    const C = cp.cannon;
    hero.climb = { t: 0, dur: 1e9, stand: true, cannon: true, face: -Math.PI / 2, ride: () => V3(CANNON.x + 1.4, 0.4, CANNON.z + 1.5) };
    SFX.tap(); toast('💣 К пушке!<small>джойстик ⬅️➡️ — повернуть · ⬆️⬇️ — дальше/ближе · 💥 — огонь · прыжок — отойти</small>');
    C.cool = 0; return;
  }
  if (act === 'coco' && sp) {
    const k = sp.coconuts.find(k => k.g.visible && near(hero.pos, k.x, k.z, 2.6)); if (!k) return;
    c.got['co' + k.i] = 1; persist(); k.g.visible = false;
    const nut = box(sp.g, 0.55, 0.55, 0.55, 0x7a5a2b, k.x, ISLE_Y + 6.3, k.z); nut.userData.dynamic = true;
    arc(nut, nut.position.clone(), V3(k.x + 1.2, ISLE_Y + 0.3, k.z + 1), 0.7, 1.2, () => { puff('🥥', nut.position.clone().setY(ISLE_Y + 1.5), { size: 1.2, rise: 1.2 }); setTimeout(() => { sp?.g.remove(nut); }, 400); });
    SFX.boing(); setTimeout(() => { SFX.coins(); toast('🥥 Кокос! Сладкое кокосовое молоко<small>+15 монет</small>'); }, 700);
    save.coins += 15; return;
  }
  if (act === 'sand' || act === 'flag') {
    const i0 = castleCell(hero); if (i0 < 0) return;
    const K = cp.castle;
    if (act === 'sand') { if (K.H[i0] >= 4) { SFX.nope(); toast('🏰 Выше нельзя — песок осыпется!'); return; } K.H[i0]++; SFX.place(); }
    else { if (!K.H[i0]) { SFX.nope(); toast('🚩 Флажок ставят на башню<small>сначала положи песок 🧱</small>'); return; } K.FL[i0] = K.FL[i0] ? 0 : 1; SFX.pop(); }
    castleDraw(); c.castle = { h: K.H, f: K.FL }; persist(); return;
  }
  if (act === 'break') {                                            // кирка: снять верхний кубик перед собой
    const i0 = castleCell(hero); if (i0 < 0) return;
    const K = cp.castle, S = CASTLE, i = Math.floor(i0 / 8), j = i0 % 8;
    if (!K.H[i0]) { SFX.nope(); toast('⛏️ Тут пусто<small>встань лицом к песку</small>'); return; }
    K.H[i0]--; if (!K.H[i0]) K.FL[i0] = 0;
    puff('💨', V3(S.x0 + (i + 0.5) * S.s, 0.4 + K.H[i0] * S.s * 0.8, S.z0 + (j + 0.5) * S.s), { size: 1, rise: 0.6, life: 0.6 }); SFX.dig?.() ?? SFX.pop();
    castleDraw(); c.castle = { h: K.H, f: K.FL }; persist(); return;
  }
  if (act === 'wave') {
    const K = cp.castle; if (K.wave) return;
    if (K.cool > 0) { SFX.nope(); toast(`🌊 Волна ещё не собралась<small>через ${Math.ceil(K.cool)} с</small>`); return; }
    const S = 2 + Math.floor(Math.random() * 3);
    K.wave = { t: 0, done: false, S }; SFX.whoosh?.(); toast(`${['', '', '🌊 Маленькая', '🌊🌊 Средняя', '🌊🌊🌊 Большая'][S]} волна идёт!<small>стенка выше ${S - 1} ${S - 1 > 1 ? 'кубиков' : 'кубика'} её остановит — но и сама обвалится</small>`); return;
  }
  if (act === 'dig') return dig(hero, save, ctx);
}
const castleCell = hero => {
  const S = CASTLE, p = hero.pos, at = (x, z) => { const i = Math.floor((x - S.x0) / S.s), j = Math.floor((z - S.z0) / S.s); return i >= 0 && j >= 0 && i < S.n && j < S.n ? i * 8 + j : -1; };
  const f = at(p.x + Math.sin(hero.face) * 1.3, p.z + Math.cos(hero.face) * 1.3);
  return f >= 0 ? f : at(p.x, p.z);
};

// ================= клад =================
function treasure(c) {
  if (c.tr?.day === c.day && LANDMARKS.some(l => l.id === c.tr.lm)) return c.tr;   // примету могли убрать — тогда новая карта
  const R = dayRand('treasure'), list = LANDMARKS.filter(l => !l.isle || c.stage >= 4);
  const lm = list[Math.floor(R() * list.length)];
  const dirs = lm.isle ? ['sea', 'land', 'north', 'south'] : lm.id === 'palms' ? ['sea', 'north', 'south'] : ['sea', 'land', 'north', 'south'];
  const dir = dirs[Math.floor(R() * dirs.length)], steps = lm.isle ? 3 : 2 + Math.floor(R() * 3);
  let dx = DIRS[dir][0], dz = DIRS[dir][1], x = lm.x + dx * steps * STEP, z = lm.z + dz * steps * STEP;
  if (lm.isle && lm.id === 'light' && dir === 'land') x = lm.x + steps * STEP;   // у маяка «от моря» — на восток острова
  c.tr = { day: c.day, lm: lm.id, dir, steps, x, z };
  return c.tr;
}
function mapPicture(tr) {
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 230; const x = cv.getContext('2d');
  const lm = LANDMARKS.find(l => l.id === tr.lm), D = DIRS[tr.dir];
  x.fillStyle = '#f0dca0'; x.fillRect(0, 0, 320, 230);
  if (lm.isle) { x.fillStyle = '#5fb8f0'; x.fillRect(0, 0, 320, 230); x.fillStyle = '#f0dca0'; x.beginPath(); x.arc(160, 115, 95, 0, 7); x.fill(); }
  else { x.fillStyle = '#5fb8f0'; x.fillRect(0, 0, 62, 230); x.font = '22px sans-serif'; for (let y = 20; y < 230; y += 48) x.fillText('🌊', 16, y + 10); }
  x.strokeStyle = '#8a5a2b'; x.lineWidth = 6; x.strokeRect(3, 3, 314, 224);
  const ox = lm.isle ? 160 : 175 - D[0] * 40, oy = 115 - D[1] * 50, L = 46 * (tr.steps + 0.6);
  const tx = ox + D[0] * Math.min(L, 120), ty = oy + D[1] * Math.min(L, 90);
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '46px sans-serif'; x.fillText(lm.e, ox, oy);
  x.font = '24px sans-serif';
  for (let s = 1; s <= tr.steps; s++) { const k = s / (tr.steps + 1); x.save(); x.translate(ox + (tx - ox) * k, oy + (ty - oy) * k); x.rotate(Math.atan2(D[1], D[0]) + Math.PI / 2); x.fillText('👣', 0, 0); x.restore(); }
  x.font = 'bold 44px sans-serif'; x.fillStyle = '#d8261a'; x.fillText('✖', tx, ty);
  return cv.toDataURL();
}
function mapPanel(save) {
  const c = coveSave(save), tr = treasure(c), lm = LANDMARKS.find(l => l.id === tr.lm), D = DIRS[tr.dir];
  document.getElementById('talkT').textContent = '🗺️ Карта сокровищ';
  document.getElementById('talkBody').innerHTML = `<img src="${mapPicture(tr)}" style="width:100%;max-width:340px;display:block;margin:0 auto;border-radius:12px">
    <div class="lq" style="font-size:1.25em;text-align:center;margin-top:8px">${lm.e} → ${'👣'.repeat(tr.steps)} ${D[2]} → ✖️ ⛏️</div>
    <div class="lq" style="text-align:center">Найди ${lm.e} ${lm.name}, пройди ${tr.steps} ${tr.steps > 4 ? 'шагов' : 'шага'} ${D[3]} и копай ⛏️${lm.isle ? '<br>⛵ это на острове — плыви на корабле!' : ''}${c.parrot ? '<br>🦜 Кеша подскажет: 🔥 тепло · ❄️ холодно' : ''}</div>`;
  openOv('talk'); SFX.tap();
}
function dig(hero, save, ctx) {
  const c = coveSave(save), tr = treasure(c), p = hero.pos, d = Math.hypot(p.x - tr.x, p.z - tr.z);
  puff('💨', p.clone().add(V3(Math.sin(hero.face), 0.4, Math.cos(hero.face))), { size: 1.2, rise: 0.6, life: 0.7 }); SFX.dig?.();
  if (d > 2.8) { toast(d < 6 ? '🔥 Горячо! Совсем рядом' : d < 12 ? '🌡️ Тепло… клад где-то близко' : '❄️ Холодно — тут пусто<small>посмотри на карту 🗺️</small>'); return; }
  c.got.tr = 1; c.treasures = (c.treasures || 0) + 1;
  const R = Math.random(), n = 150 + Math.floor(Math.random() * 16) * 10;
  const ch = chestMesh(cp?.g || scene, tr.x, -1.2, tr.z); ch.rotation.y = hero.face + Math.PI;
  arc(ch, V3(tr.x, -1.2, tr.z), V3(tr.x, Math.max(0, floorAt(tr.x, tr.z)), tr.z), 0.8, 1.5, () => { confetti(V3(tr.x, 2, tr.z), 60); puff('🪙', V3(tr.x, 2.4, tr.z), { size: 1.6, rise: 2 }); });
  save.coins += n; ctx.persist(); SFX.chest?.(); SFX.fanfare(); ctx.kid?.();
  const egg = R < 0.25;
  if (egg) ctx.egg?.({ r: 3, v: 'rainbow' });
  toast(`⚓ КЛАД! Сундук с сокровищами!<small>+${n} монет${egg ? ' и радужное яйцо 🥚 — уже в инкубаторе' : ''} · завтра — новая карта в бутылке 🍾</small>`);
}

// ================= капитан =================
function captainPanel(save) {
  const c = coveSave(save), done = c.stage >= 4;
  const intro = done ? `«Корабль твой, капитан! ${c.parrot ? 'Кеша 🦜 теперь с тобой — он летает и ищет клады. ' : ''}Плыви к маяку 🗼 и на Кокосовый остров 🥥, ныряй 🤿 у затонувшего корабля — там добрый осьминог и жемчуг!»`
    : c.stage === 0 ? '«Ахой, юнга! Мой корабль разбился о скалы. Поможешь починить? Всё нужное есть тут, в бухте!»'
    : ['«Ого, уже лучше! Ещё чуть-чуть — и в море!»', '«Знаешь, почему пираты носят повязку? Чтобы глаз привык к темноте трюма!»', '«Отлив открывает пещеру в скалах — там бывают сокровища!»'][Math.floor(Math.random() * 3)];
  const have = k => c.inv[k] || 0;
  const row = (S, i) => `<div style="display:flex;gap:8px;align-items:center;padding:6px 10px;border-radius:12px;background:${i < c.stage ? '#d8f5c8' : i === c.stage ? '#fff3c8' : '#f2f0ea'}"><b style="font-size:1.3em">${i < c.stage ? '✅' : S.icon}</b><span>${S.name}${i >= c.stage ? ': ' + Object.entries(S.need).map(([k, n]) => `${MAT[k][0]} ${i === c.stage ? Math.min(have(k), n) + '/' : ''}${n}`).join(' · ') : ''}</span></div>`;
  document.getElementById('talkT').textContent = '⚓ Капитан Ёрш';
  document.getElementById('talkBody').innerHTML = `<div class="lq tline">${intro}</div>
    <div style="display:flex;flex-direction:column;gap:6px;margin:8px 0">${STAGES.map(row).join('')}</div>
    ${done ? '' : `<div class="lq">${Object.entries(MAT).map(([k, [e, n, where]]) => `${e} ${n}: ${have(k)} — ${where}`).join('<br>')}</div>`}
    ${canBuild(c) ? '<div class="lq"><b>Всё есть! Жми 🔨 у корабля</b></div>' : ''}
    <div class="lq">${lowTide() ? '🏖️ Сейчас отлив' : '🌊 Сейчас прилив'} · смена через ${Math.ceil(tideLeft() / 60)} мин${c.treasures ? ` · кладов найдено: ${c.treasures} ⚓` : ''}${c.pearls ? ` · жемчужин: ${c.pearls} ⚪` : ''}</div>`;
  openOv('talk'); SFX.tap();
}
function bottlePanel(save, i, ev) {
  const c = coveSave(save);
  document.getElementById('talkT').textContent = '🍾 Послание в бутылке';
  if (i === 2) {                                                     // 💌 записка для мамы: каждый день следующая
    const n = Math.floor(new Date(today()).getTime() / 864e5), txt = BOTTLE[((n % BOTTLE.length) + BOTTLE.length) % BOTTLE.length];
    c.mamaNotes = (c.mamaNotes || 0) + 1; ev.save = true;
    document.getElementById('talkT').textContent = '💌 Записка в розовой бутылке';
    document.getElementById('talkBody').innerHTML = `<div style="background:#fff8f2;border-radius:16px;padding:22px 20px;box-shadow:inset 0 0 0 3px #ffd8e6;font-family:Georgia,'Times New Roman',serif;font-size:1.3em;line-height:1.45;color:#5a3040;text-align:center">${txt}<div style="text-align:right;margin-top:14px;font-size:1.2em">${BOTTLE_SIGN}</div></div>`;
    openOv('talk'); SFX.star(); confetti(V3(cp.bottles[2].x, 1.5, cp.bottles[2].z), 30); return;
  }
  if (i === 0) {
    c.got.map = 1; ev.save = true; treasure(c);
    setTimeout(() => mapPanel(save), 50); return;
  }
  const kind = dayRand('puz')() < 0.55 ? 'puzzle' : 'mermaid';
  if (kind === 'puzzle') {
    c.got.puz = 1; ev.save = true; const W = SHELL_COLORS[cp.puzzle.want];
    document.getElementById('talkBody').innerHTML = `<div style="text-align:center;font-size:64px;line-height:1.2"><span style="display:inline-block;width:90px;height:70px;border-radius:50% 50% 12px 12px;background:${W[1]};border:4px solid #fff;box-shadow:0 2px 6px #0003"></span></div>
      <div class="lq" style="text-align:center;font-size:1.2em">🔍 Найди на пляже такую же ракушку!</div><div class="lq" style="text-align:center">(${W[2]}) — за неё награда 🎁</div>`;
  } else {
    c.got.puz = 1; c.got.puzOk = 1; ev.save = true;
    if (c.stage < 4 && c.stage >= 2) give(save, ev, 'cloth'); else coins(ev, 30);
    document.getElementById('talkBody').innerHTML = `<div style="text-align:center;font-size:56px">🧜‍♀️💌</div><div class="lq tline">«Привет! Я русалка Марина. Видела, как ты чинишь корабль. Держи подарок из моего сундучка! Плавай осторожно и ищи жемчуг у затонувшего корабля ⚪»</div>
      <div class="lq" style="text-align:center">🎁 ${c.stage < 4 && c.stage >= 2 ? '🧵 ткань для паруса' : '+30 монет'}</div>`;
  }
  openOv('talk'); SFX.tap();
}

// ================= 💣 пушка =================
function aimVel(C) { const yaw = -Math.PI / 2 + C.yaw, v = 16 + 23 * C.pow, el = 0.55; return V3(Math.sin(yaw) * Math.cos(el) * v, Math.sin(el) * v, Math.cos(yaw) * Math.cos(el) * v); }
const muzzle = C => { const yaw = -Math.PI / 2 + C.yaw; return V3(CANNON.x + Math.sin(yaw) * 1.8, 1.9, CANNON.z + Math.cos(yaw) * 1.8); };
const BALL_G = 15;
function fire() {
  if (!cp) return; const C = cp.cannon; if (C.cool > 0) return;
  C.cool = 0.9;
  const m = new T.Mesh(cp.ballGeo, cp.ballMat); m.position.copy(muzzle(C)); cp.g.add(m);
  cp.balls.push({ m, v: aimVel(C) });
  SFX.boom?.() ?? SFX.pop(); puff('💨', muzzle(C), { size: 1.6, rise: 0.8, life: 0.8 });
  C.barrel.position.z = -0.35;
}
function hitTarget(tg, ev, save) {
  const c = coveSave(save);
  puff(tg.kind === 'barrel' ? '💥' : tg.kind === 'raft' ? '🎯' : '💥', tg.g.position.clone().setY(tg.g.position.y + tg.y + 1), { size: 1.8, rise: 1.4 });
  ev.sfx.push('pop');
  if (tg.kind === 'barrel') {
    tg.g.visible = false; tg.back = 18;
    if (!c.got['bar' + tg.i]) { c.got['bar' + tg.i] = 1; if (c.stage < 4) give(save, ev, tg.i === 1 && c.stage < 2 ? 'plank' : 'cloth'); else coins(ev, 20); ev.say = '💥 Бах! Бочка разлетелась!<small>' + (ev.say ? ev.say.replace(/<small>.*/, '') : '') + '</small>'; }
    else { coins(ev, 5); ev.say = '💥 Бах! Бочка! +5 монет'; }
  } else if (tg.kind === 'bottle') {
    tg.g.visible = false; tg.back = 0;                              // сбитая бутылка лежит, пока не собьёшь все три
    const left = cp.targets.filter(t => t.kind === 'bottle' && t.g.visible).length;
    if (!left) { coins(ev, 15); ev.say = '🍾 Все бутылки сбиты! +15 монет'; for (const t of cp.targets) if (t.kind === 'bottle') t.back = 14; }
    else ev.say = `🍾 Дзынь! Осталось ${left}`;
  } else { coins(ev, 25); tg.back = 0; ev.say = '🎯 Прямо в мишень на плоту! +25 монет'; tg.g.rotation.z = 0.4; ev.big = true; }
}

// ================= 🦜 попугай =================
function makeParrot() {
  const root = group(scene, 0, -50, 0);
  box(root, 0.45, 0.55, 0.5, 0xe2442a, 0, 0, 0); box(root, 0.38, 0.38, 0.38, 0xe2442a, 0, 0.42, 0.08); box(root, 0.14, 0.18, 0.2, 0xffd23f, 0, 0.36, 0.33);
  for (const sx of [-1, 1]) { box(root, 0.06, 0.1, 0.1, 0xffffff, sx * 0.19, 0.48, 0.15); box(root, 0.04, 0.06, 0.06, 0x1a1a1a, sx * 0.2, 0.48, 0.18); }
  box(root, 0.3, 0.12, 0.6, 0x3fa7ff, 0, -0.2, -0.45);
  const wings = [-1, 1].map(sx => { const w = group(root, sx * 0.24, 0.1, 0); box(w, 0.7, 0.08, 0.4, sx < 0 ? 0x3fa7ff : 0xffd23f, sx * 0.35, 0, 0); return w; });
  const l = makeLabel(2, 0.5); l.position.y = 1; root.add(l); l.userData.set('🦜 Кеша', { color: '#ffffff' });
  pq = { root, wings, label: l, pos: root.position, fly: null, t: 0, hintT: 0, face: 0 };
}
function startFlight(hero, ctx) {
  if (!pq || hero.climb || hero.inSea) return;
  const at = hero.pos.clone();
  hero.climb = { t: 0, dur: 1e9, stand: true, parrot: true, face: hero.face, ride: () => at.clone(), onJump: () => endFlight(hero) };
  pq.fly = { left: 45, vel: V3() }; hero.camAt = pq.pos;
  SFX.whoosh?.(); toast('🦜 Кеша полетел! Управляй им джойстиком<small>сверху видно, где ❌ клад · прыжок или 🛬 — вернуться</small>');
}
function endFlight(hero) {
  if (!pq?.fly) { if (hero.climb?.parrot) hero.climb = null; return; }
  pq.fly = null; hero.camAt = null; if (hero.climb?.parrot) hero.climb = null;
  puff('🦜', hero.pos.clone().setY(hero.pos.y + 3), { size: 1.2, rise: 1 });
}

// ================= раз в кадр =================
export function updateCovePlay(dt, hero, save, cam, act, ship) {
  const ev = { sfx: [] }, c = coveSave(save), p = hero.pos, sl = seaLevel(), low = sl < -0.95;
  if (act.cove && cp) updateCoveSector(dt, hero, save, cam, ev, c, p, sl, low);
  if (act.sea && sp) updateSeaSector(dt, hero, save, ev, c, p);
  // попугай
  if (c.parrot && (act.cove || act.sea) && !pq) makeParrot();
  if (pq) {
    pq.root.visible = !!c.parrot && (act.cove || act.sea);
    pq.t += dt; const flap = Math.sin(pq.t * (pq.fly ? 16 : 3)) * (pq.fly ? 0.8 : 0.1);
    pq.wings[0].rotation.z = flap; pq.wings[1].rotation.z = -flap;
    if (pq.fly) {
      const F = pq.fly, mv = input.move, yaw = cam.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const wx = rx * mv.x - fx * mv.y, wz = rz * mv.x - fz * mv.y;
      F.vel.x = damp(F.vel.x, wx * 14, 3, dt); F.vel.z = damp(F.vel.z, wz * 14, 3, dt);
      pq.pos.x = Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, pq.pos.x + F.vel.x * dt)); pq.pos.z = Math.max(BOUNDS.z0, Math.min(BOUNDS.z1, pq.pos.z + F.vel.z * dt));
      pq.pos.y = damp(pq.pos.y, 17, 1.5, dt);
      if (Math.hypot(F.vel.x, F.vel.z) > 1) pq.face = Math.atan2(F.vel.x, F.vel.z);
      pq.root.rotation.y = dampAngle(pq.root.rotation.y, pq.face, 6, dt);
      F.left -= dt; if (F.left <= 0 || !hero.climb?.parrot) { endFlight(hero); ev.say = '🦜 Кеша вернулся на плечо'; }
    } else {
      // на пляже и в море — на плече; ушёл с пляжа — Кеша летит к капитану и ждёт у него на плече
      const home = p.x > COVE.beach.x1 + 2;
      const tgt = home ? V3(CAPTAIN.x + 0.55, 2.45, CAPTAIN.z) : V3(p.x + Math.cos(hero.face) * -0.55, p.y + (hero.swim ? 1.2 : 2.45), p.z + Math.sin(hero.face) * 0.55);
      if (pq.fresh !== false) { pq.fresh = false; pq.pos.copy(tgt); }        // только что появился — сразу на месте
      const d = pq.pos.distanceTo(tgt);
      if (d > 2) { const k = Math.min(1, 16 * dt / d); pq.pos.lerp(tgt, k); pq.pos.y += Math.min(d, 6) * dt * 0.8; pq.face = Math.atan2(tgt.x - pq.pos.x, tgt.z - pq.pos.z); pq.wings[0].rotation.z = Math.sin(pq.t * 16) * 0.8; pq.wings[1].rotation.z = -pq.wings[0].rotation.z; }
      else { pq.pos.lerp(tgt, Math.min(1, dt * 12)); pq.face = home ? -Math.PI / 2 : hero.face; }
      pq.root.rotation.y = dampAngle(pq.root.rotation.y, pq.face, 8, dt);
      if (home) return ev;
      // подсказка «тепло-холодно», когда есть карта
      if (c.got.map && !c.got.tr && (pq.hintT -= dt) <= 0) {
        pq.hintT = 2.2; const tr = treasure(c), d = Math.hypot(p.x - tr.x, p.z - tr.z);
        if (d < 45) puff(d < 4 ? '🔥' : d < 12 ? '🌡️' : '❄️', pq.pos.clone().setY(pq.pos.y + 0.9), { size: 0.8, rise: 0.8, life: 1 });
      }
    }
    if (cp?.xMark) {
      const tr = c.got.tr ? null : treasure(c);
      cp.xMark.visible = !!(pq.fly && tr); if (tr) { cp.xMark.position.set(tr.x, Math.max(0, floorAt(tr.x, tr.z)) + 0.2, tr.z); cp.xMark.scale.setScalar(1 + Math.sin(pq.t * 5) * 0.08); }
    }
  }
  if (cp && !pq && cp.xMark) cp.xMark.visible = false;
  return ev;
}
function updateCoveSector(dt, hero, save, cam, ev, c, p, sl, low) {
  const t = cp.t += dt;
  // капитан смотрит на героя; зовёт, если корабль не готов
  const cd = Math.hypot(p.x - CAPTAIN.x, p.z - CAPTAIN.z);
  if (cd < 10) cp.cap.m.root.rotation.y = dampAngle(cp.cap.m.root.rotation.y, Math.atan2(p.x - CAPTAIN.x, p.z - CAPTAIN.z), 5, dt);
  if (cd < 9 && !cp.capSaid && c.stage === 0) { cp.capSaid = true; ev.say = '⚓ «Ахой, юнга! Подойди-ка!»<small>жми ⚓ рядом с капитаном</small>'; }
  if (cp.cap.m.armR) cp.cap.m.armR.rotation.x = cd < 9 ? -2.6 + Math.sin(t * 6) * 0.3 : damp(cp.cap.m.armR.rotation.x, 0, 4, dt);
  // находки на берегу
  for (const k of cp.picks) {
    if (!k.g.visible && !k.low) continue;
    if (k.low) { k.g.visible = low && !c.got[k.id]; if (!k.g.visible) continue; }
    if (k.kind === 'shell' || k.kind === 'star') k.g.position.y = k.y + Math.sin(t * 3 + k.x) * 0.06;
    if (Math.hypot(p.x - k.x, p.z - k.z) > 1.6 || Math.abs(p.y - k.y) > 2.2) continue;
    if (k.kind === 'log') { if (c.inv.log || c.stage >= 3) { k.g.visible = false; continue; } k.g.visible = false; give(save, ev, 'log'); ev.sfx.push('collect'); ev.say = '🌲 Бревно для мачты!<small>тяжёлое, но ты справишься 💪 · 🔨 у корабля</small>'; continue; }
    c.got[k.id] = 1; ev.save = true; k.g.visible = false;
    if (k.kind === 'plank') { give(save, ev, 'plank'); ev.sfx.push('collect'); }
    else if (k.kind === 'rope') { give(save, ev, 'rope'); ev.sfx.push('collect'); }
    else if (k.kind === 'crystal') { coins(ev, 8); c.crystals = (c.crystals || 0) + 1; ev.say = `💎 Кристалл из пещеры! +8 монет<small>${cp.picks.filter(x => x.kind === 'crystal' && x.g.visible).length ? 'у озера есть ещё' : 'все кристаллы собраны — завтра вырастут новые'}</small>`; ev.sfx.push('star'); }
    else if (k.kind === 'treasure') { coins(ev, 150); const egg = Math.random() < 0.4; if (egg) ev.giveEgg = { r: 3, v: 'rainbow' }; ev.say = `💰 Сокровище пиратов! +150 монет${egg ? ' и радужное яйцо 🥚' : ''}<small>завтра факелы погаснут — зажги их снова</small>`; ev.sfx.push('chest', 'coins'); ev.big = true; confetti(V3(k.x, 2, k.z), 70); }
    else if (k.kind === 'chest') { coins(ev, 40); if (c.stage < 4) give(save, ev, 'rope'); ev.say = `🧰 Сундучок! +40 монет${c.stage < 4 ? ' и 🪢 верёвка' : ''}`; ev.sfx.push('chest', 'coins'); confetti(V3(k.x, k.y + 1.5, k.z), 30); }
    else { coins(ev, 3); c.shells = (c.shells || 0) + 1; ev.say = `${k.kind === 'star' ? '⭐ Морская звезда' : '🐚 Ракушка'}! +3 монеты`; ev.sfx.push('pick'); }
  }
  // бутылки покачиваются у воды
  for (const b of cp.bottles) {
    if (!b.g.visible) continue;
    b.g.position.y = 0.15 + Math.sin(t * 2 + b.i) * 0.05; b.s.position.y = 0.9 + Math.sin(t * 3) * 0.15; b.s.rotation.y += 0.05; b.s.scale.setScalar(0.6 + Math.abs(Math.sin(t * 4 + b.i)) * 0.8);   // блик мигает
    if (Math.hypot(p.x - b.x, p.z - b.z) < 1.5 && p.y < 2) { b.g.visible = b.s.visible = false; c.got['b' + b.i] = 1; ev.save = true; ev.sfx.push('chest'); bottlePanel(save, b.i, ev); }
  }
  // загадка с ракушками
  for (const s of cp.puzzle.shells) {
    s.g.visible = !!c.got.puz && !c.got.puzOk && !s.gone;
    if (!s.g.visible) continue;
    s.g.rotation.y += dt * 0.6; s.g.position.y = (s.g.userData.y || 0) + Math.abs(Math.sin(t * 2 + s.i)) * 0.15;
    if (Math.hypot(p.x - s.x, p.z - s.z) < 1.4 && p.y < (s.g.userData.y || 0) + 2) {
      if (s.i === cp.puzzle.want) { c.got.puzOk = 1; ev.save = true; coins(ev, 40); if (c.stage < 4) give(save, ev, 'cloth'); ev.say = `🐚 Та самая ракушка! Молодец!<small>+40 монет${c.stage < 4 ? ' и 🧵 ткань' : ''}</small>`; ev.sfx.push('star'); confetti(V3(s.x, 1.5, s.z), 40); ev.big = true; }
      else { s.gone = true; ev.say = '🐚 Не та… Посмотри на картинку ещё раз 🍾'; ev.sfx.push('nope'); }
    }
  }
  // мишени
  for (const tg of cp.targets) {
    if (tg.back > 0 && (tg.back -= dt) <= 0) { tg.g.visible = true; tg.g.rotation.z = 0; }
    if (tg.kind === 'barrel') { tg.g.position.y = sl + 0.3 + Math.sin(t * 1.5 + tg.i) * 0.15; tg.g.rotation.x = Math.sin(t + tg.i) * 0.08; }
    if (tg.kind === 'raft') { tg.z = Math.sin(t * 0.35) * (RAFT.z1 - RAFT.z0) / 2; tg.g.position.set(RAFT.x, sl + 0.2 + Math.sin(t * 1.3) * 0.1, tg.z); tg.g.rotation.z = damp(tg.g.rotation.z, 0, 2, dt); }
  }
  // пушка: прицел, полёт ядер
  const C = cp.cannon; C.cool = Math.max(0, C.cool - dt); C.barrel.position.z = damp(C.barrel.position.z, 0, 6, dt);
  const aiming = !!hero.climb?.cannon;
  if (aiming) {
    C.yaw = Math.max(-0.9, Math.min(0.9, C.yaw - input.move.x * 1.1 * dt)); C.pow = Math.max(0, Math.min(1, C.pow - input.move.y * 0.7 * dt));
    C.g.rotation.y = -Math.PI / 2 + C.yaw; C.barrel.rotation.x = -0.55;
    hero.climb.face = -Math.PI / 2 + C.yaw;
    cam.yaw = dampAngle(cam.yaw, -Math.PI / 2 + C.yaw + Math.PI, 3, dt);
    const v = aimVel(C), q = muzzle(C);
    cp.aim.forEach((d, i) => { const tt = (i + 1) * 0.22; d.position.set(q.x + v.x * tt, q.y + v.y * tt - BALL_G * tt * tt / 2, q.z + v.z * tt); d.visible = d.position.y > sl - 0.5; });
  } else for (const d of cp.aim) d.position.y = -50;
  for (let i = cp.balls.length - 1; i >= 0; i--) {
    const B = cp.balls[i]; B.v.y -= BALL_G * dt; B.m.position.addScaledVector(B.v, dt);
    const q = B.m.position; let hit = null;
    for (const tg of cp.targets) if (tg.g.visible && Math.hypot(q.x - tg.g.position.x, q.y - (tg.g.position.y + (tg.kind === 'barrel' ? 0 : tg.y)), q.z - tg.g.position.z) < tg.r) { hit = tg; break; }
    if (hit) hitTarget(hit, ev, save);
    const floor = q.x < SHORE ? sl : 0;
    if (hit || q.y < floor) { if (!hit) { puff(q.x < SHORE ? '💦' : '💨', q.clone().setY(floor + 0.5), { size: 1.6, rise: 1.2 }); ev.sfx.push(q.x < SHORE ? 'splash' : 'land'); } cp.g.remove(B.m); cp.balls.splice(i, 1); }
  }
  // пещера: рыбки в озере, факелы, тайная дверь, корона блестит
  if (cp.fish) {
    cp.fish.forEach((f, i) => { const a = t * (0.6 + i * 0.15) + i * 1.6; f.position.set(-194 + Math.cos(a) * 2.2, -1.25, 122 + Math.sin(a) * 3); f.rotation.y = -a; });
    let lit = 0;
    for (const T4 of cp.torches) {
      if (!(c.got.torch & (1 << T4.i)) && Math.hypot(p.x - T4.x, p.z - T4.z) < 1.8) { c.got.torch = (c.got.torch || 0) | (1 << T4.i); ev.save = true; T4.fl.visible = true; ev.sfx.push('pop'); const n = cp.torches.filter(q => c.got.torch & (1 << q.i)).length; ev.say = n < 4 ? `🔥 Факел горит! ${n} из 4` : '🔥 Все факелы горят! Где-то открылась тайная дверь…'; puff('🔥', V3(T4.x, 3, T4.z), { size: 1.2, rise: 1 }); }
      T4.fl.visible = !!(c.got.torch & (1 << T4.i));
      if (T4.fl.visible) { lit++; T4.fl.scale.y = 1 + Math.sin(t * 10 + T4.i) * 0.15; }
    }
    const Dr = cp.door;
    if (lit === 4 && !Dr.open) { Dr.open = true; Dr.col.off = true; if (Math.hypot(p.x - CAVE.door.x, p.z - 122) < 30) ev.sfx.push('boom'); }
    else if (lit < 4 && Dr.open) { Dr.open = false; Dr.col.off = false; }   // новый день — факелы погасли, дверь закрылась
    Dr.g.position.y = damp(Dr.g.position.y, Dr.open ? -3.6 : 0, 1.5, dt);
    cp.crown.rotation.y += dt * 0.8;
    if (cv_fallSplash(p) && Math.random() < dt * 4) puff('💦', V3(-196.4 + (Math.random() - 0.5), -0.8, 122 + (Math.random() - 0.5)), { size: 0.8, rise: 0.8, life: 0.6 });
  }
  // песочный замок: волна
  const K = cp.castle; K.cool = Math.max(0, K.cool - dt);
  if (cp.wasLow && !low && !K.wave && K.H.some(h => h)) {           // начался прилив — волна сама бежит к замку
    K.wave = { t: 0, done: false, S: 3 };
    if (Math.hypot(p.x - CASTLE.x0 - 5, p.z - CASTLE.z0 - 5) < 45) ev.say = '🌊 Прилив! Волна бежит к замку из песка';
  }
  cp.wasLow = low;
  if (K.wave) {
    const S = CASTLE, W = S.n * S.s; K.wave.t += dt; const k = K.wave.t / 1.8;
    K.wv.position.set(S.x0 - 2 + k * (W + 4), 0.6, S.z0 + W / 2); K.wv.scale.y = 1 - k * 0.6;
    if (!K.wave.done && k > 0.5) { K.wave.done = true; castleWave(save, ev, K.wave.S || 3); }
    if (k >= 1) { K.wave = null; K.wv.position.y = -50; K.cool = 20; }
  }
  // Крабий остров
  for (const cr of cp.crabs) { cr.a += dt * cr.sp; cr.g.position.set(ISLES.crab.x + Math.cos(cr.a) * cr.r, ISLE_Y, ISLES.crab.z + Math.sin(cr.a) * cr.r); cr.g.rotation.y = -cr.a; }
  const kn = Math.hypot(p.x - ISLES.crab.x, p.z - ISLES.crab.z) < 8;
  cp.king.position.y = ISLE_Y + (kn ? Math.abs(Math.sin(t * 6)) * 0.4 : 0); cp.king.rotation.y = kn ? Math.sin(t * 3) * 0.5 : 0;
  if (kn && !cp.said.king) { cp.said.king = true; ev.say = '🦀 Король крабов танцует для тебя!'; }
}
// волна силой S бежит с моря по каждому ряду: что ниже — смывает (и слабеет), о стенку не ниже себя разбивается,
// но сбивает с неё верхний кубик. Поэтому даже крепкий замок понемногу размывается — его надо подстраивать
const cv_fallSplash = p => Math.hypot(p.x + 194, p.z - 122) < 20;
function castleWave(save, ev, S) {
  const K = cp.castle, c = coveSave(save), before = K.H.reduce((a, b) => a + b, 0);
  for (let j = 0; j < 8; j++) {
    let s = S;
    for (let i = 0; i < 8 && s > 0; i++) {
      const idx = i * 8 + j, h = K.H[idx]; if (!h) continue;
      if (h >= s) { K.H[idx]--; if (!K.H[idx]) K.FL[idx] = 0; break; }
      K.H[idx] = 0; K.FL[idx] = 0; s--;
    }
  }
  castleDraw(); c.castle = { h: K.H, f: K.FL }; ev.save = true;
  const blocks = K.H.reduce((a, b) => a + b, 0), flags = K.FL.reduce((a, b) => a + b, 0);
  const stars = blocks >= 36 && flags >= 2 ? 3 : blocks >= 22 ? 2 : blocks >= 10 ? 1 : 0, lost = before - blocks;
  if (stars) { coins(ev, stars * 15); c.castleBest = Math.max(c.castleBest || 0, stars); ev.say = `🏰 Замок устоял! ${'⭐'.repeat(stars)}<small>+${stars * 15} монет · волна смыла ${lost} · осталось ${blocks}${stars < 3 ? ' · для ⭐⭐⭐ — 36 кубиков и 2 флажка' : ''}</small>`; ev.sfx.push('star'); ev.big = stars === 3; confetti(V3(CASTLE.x0 + 5, 3, CASTLE.z0 + 5), 30 * stars); }
  else ev.say = `🌊 Волна всё смыла…<small>${blocks ? `осталось ${blocks} кубиков · ` : ''}строй стенку повыше со стороны моря — она примет волну на себя</small>`;
}
function updateSeaSector(dt, hero, save, ev, c, p) {
  const t = sp.t += dt;
  for (const k of sp.picks) {
    if (!k.g.visible) continue;
    if (Math.hypot(p.x - k.x, p.z - k.z) > 2 || Math.abs(p.y - k.y) > 2.2) continue;
    if (k.lock && !c.got.key) { if (!sp.lockSaid) { sp.lockSaid = 1; ev.say = '🔒 Золотой сундук заперт!<small>ключ 🗝️ носит на себе рак-отшельник — он ползает по дну у кормы</small>'; ev.sfx.push('nope'); } continue; }
    k.g.visible = false; c.got[k.id] = 1; ev.save = true; ev.sfx.push('chest', 'coins'); confetti(V3(k.x, k.y + 1.5, k.z), 40);
    if (k.id === 'light') { coins(ev, 50); ev.say = '🗼 Сундук смотрителя маяка! +50 монет<small>🔭 отсюда видно всю бухту</small>'; }
    else { coins(ev, 120); if (c.stage < 4) give(save, ev, 'cloth'); const egg = Math.random() < 0.35; if (egg) ev.giveEgg = { r: 3, v: 'rainbow' }; ev.say = `🗝️ Золотой сундук капитана открыт! +120 монет${c.stage < 4 ? ' и 🧵 ткань' : ''}${egg ? ' и радужное яйцо 🥚' : ''}`; ev.big = true; }
  }
  for (const o of sp.oysters) {
    const open = (Math.sin(t * 0.8 + o.i * 1.7) + 1) / 2; o.lid.rotation.x = -open * 0.9;
    if (o.pearl.visible && open > 0.25 && Math.hypot(p.x - o.x, p.z - o.z) < 2.3 && p.y < DEEP_Y + 3) {
      o.pearl.visible = false; c.got['pe' + o.i] = 1; c.pearls = (c.pearls || 0) + 1; ev.save = true; coins(ev, 15);
      const left = sp.oysters.filter(x => x.pearl.visible).length;
      ev.say = `⚪ Жемчужина! +15 монет<small>${left ? `в ракушках ещё ${left}` : 'все жемчужины собраны — завтра будут новые'}</small>`; ev.sfx.push('star');
    }
  }
  const under = p.y < seaLevel() - 1.5;
  // золотые монеты на дорожке
  for (const k of sp.coins) { if (!k.m.visible) continue; k.m.rotation.z += dt * 3; if (under && Math.hypot(p.x - k.x, p.z - k.z) < 1.2 && p.y < DEEP_Y + 2.5) { k.m.visible = false; c.got['gc' + k.i] = 1; ev.save = true; coins(ev, 3); ev.sfx.push('coins'); const left = sp.coins.filter(x => x.m.visible).length; ev.say = left ? `🪙 Золотая монета! +3 · ещё ${left}` : '🪙 Все золотые монеты собраны! Дорожка вела в каюту капитана…'; } }
  // рак-отшельник с ключом
  const HC = sp.crab; HC.a += dt * 0.25; const hx = WRECK.x - 16 + Math.cos(HC.a) * 5, hz = WRECK.z + 10 + Math.sin(HC.a) * 4;
  HC.g.position.set(hx, DEEP_Y + Math.abs(Math.sin(t * 6)) * 0.05, hz); HC.g.rotation.y = HC.a + Math.PI; HC.key.rotation.y += dt * 2;
  if (HC.key.visible && under && Math.hypot(p.x - hx, p.z - hz) < 2 && p.y < DEEP_Y + 3) { HC.key.visible = false; c.got.key = 1; ev.save = true; ev.say = '🗝️ Рак-отшельник отдал тебе ключ!<small>плыви в каюту капитана — через пробоину в борту, по дорожке из монет</small>'; ev.sfx.push('star'); ev.big = true; puff('🗝️', HC.g.position.clone().setY(DEEP_Y + 3), { size: 1.2, rise: 1.5 }); }
  // медузы подбрасывают
  for (const J of sp.jellies) {
    J.cool -= dt; const y = -4.2 + Math.sin(t * 0.6 + J.ph) * 1.2; J.g.position.y = y;
    const pul = 1 + Math.sin(t * 3 + J.ph) * 0.12; J.g.scale.set(pul, 2 - pul, pul); J.tent.forEach((tt, k) => { tt.rotation.x = Math.sin(t * 2 + k) * 0.3; });
    if (J.cool <= 0 && Math.hypot(p.x - J.x, p.z - J.z) < 1.6 && Math.abs(p.y + 1.2 - y) < 1.6) { J.cool = 0.8; hero.vel.y = 5.5; hero.vel.x += (p.x - J.x) * 2; hero.vel.z += (p.z - J.z) * 2; ev.sfx.push('boing'); J.g.scale.set(1.4, 0.6, 1.4); if (!sp.jellySaid) { sp.jellySaid = 1; ev.say = '🪼 Боинг! Медуза-батут подбросила тебя'; } }
  }
  // пузырьковые гейзеры: подышать
  for (const V of sp.vents) {
    for (const b of V.bub) { const k = (b.userData.ph + t * 0.25) % 1; b.position.set(V.x + b.userData.dx * k, DEEP_Y + 1 + k * (seaLevel() - DEEP_Y - 1), V.z + Math.sin(t * 2 + b.userData.ph * 6) * 0.3); }
    if (under && Math.hypot(p.x - V.x, p.z - V.z) < 1.8) { hero.airRefill = true; if (!sp.ventSaid) { sp.ventSaid = 1; ev.say = '🫧 Пузырьки! Тут можно подышать, не всплывая'; } }
  }
  // гигантская раковина
  const CL = sp.clam, ck = (t % 12) / 12, copen = ck < 0.4 ? Math.sin(ck / 0.4 * Math.PI) : 0;
  CL.lid.rotation.x = -copen * 1.1;
  if (CL.pearl.visible && under && Math.hypot(p.x - CL.x, p.z - CL.z) < 2.6 && p.y < DEEP_Y + 3.5) {
    if (copen > 0.3) { CL.pearl.visible = false; c.got.clam = 1; c.pearls = (c.pearls || 0) + 1; ev.save = true; coins(ev, 60); ev.say = '🩷 Огромная розовая жемчужина! +60 монет<small>такая бывает раз в день</small>'; ev.sfx.push('star'); ev.big = true; confetti(V3(CL.x, DEEP_Y + 2, CL.z), 40); }
    else if (!CL.said) { CL.said = 1; ev.say = '🐚 Гигантская раковина закрыта… подожди, она скоро откроется'; }
  }
  for (const H of sp.horses) { H.g.position.y = H.y + Math.sin(t * 1.5 + H.ph) * 0.4; H.g.rotation.y = Math.sin(t * 0.5 + H.ph) * 0.8; }
  const O = sp.octo;
  O.legs.forEach((l, k) => { l.rotation.x = Math.sin(t * 2 + k) * 0.4; });
  O.g.position.y = DEEP_Y + Math.sin(t * 1.2) * 0.3;
  const od = Math.hypot(p.x - O.x, p.z - O.z);
  if (od < 7 && p.y < seaLevel() - 1.5) {
    O.g.rotation.y = dampAngle(O.g.rotation.y, Math.atan2(p.x - O.x, p.z - O.z), 3, dt);
    if ((O.hiT -= dt) <= 0) { O.hiT = 2.5; puff('💜', O.g.position.clone().setY(DEEP_Y + 4), { size: 1, rise: 1 }); }
    if (!c.got.oct) { c.got.oct = 1; c.pearls = (c.pearls || 0) + 1; ev.save = true; coins(ev, 30); ev.say = '🐙 Осьминог Оська машет щупальцем и дарит жемчужину!<small>+30 монет · он очень рад гостям</small>'; ev.sfx.push('star'); ev.big = true; }
  }
}
