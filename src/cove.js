// Пиратская бухта ⚓ — мир и корабль (три сектора, sectors.js):
//   🌿 Луг (x −130…−66): ворота в западной стене базы у домика, дорожка к морю, цветы, зверюшки.
//   🏖️ Бухта (x −200…−130): пляж, отмель (в отлив — сухая, в лужицах верёвки и ракушки), причал со сломанным
//      кораблём и капитаном Ершом, пушка в форте, песочница для замка, скалы с пещерой (открыта только в отлив),
//      Крабий остров (в отлив туда ведёт песчаная коса).
//   🌊 Море (x −360…−200): маяк на острове, Кокосовый остров, затонувший корабль с добрым осьминогом, стайки рыб.
// Прилив и отлив меняются сами (covecore.js): вода поднимается и опускается, открывается и закрывается пещера.
// Корабль чинят по частям (корпус → палуба → мачта → парус) и потом правят сами: джойстик — куда плыть,
// ветер (видно по флагу) — по ветру быстро, против — медленно. В море можно плавать и нырять 🤿 (запас воздуха 🫧).
import { T, scene, group, box, mat, camera, damp, dampAngle } from './engine.js';
import { solid, tree, addCollider, onLevelReset } from './world.js';
import { makeLabel, puff, confetti, sprite, emojiTex } from './fx.js';
import { addCritter, addButterfly } from './fun.js';
import { water } from './terrain.js';
import { createLampPost } from './daynight.js';
import { input } from './input.js';
import { COVE, SHORE, FLAT_Y, SHELF_Y, DEEP_Y, ISLE_Y, ISLE_RIM, ISLES, SANDBAR, PIER, MOOR, CAVE, CASTLE, FORT, CAPTAIN, BOUNDS, WRECK,
  seaLevel, lowTide, tideLeft, floorAt, inSeaArea, coveSave, STAGES, MAT, canBuild, seeded, palm, rock, V3 } from './covecore.js';
import { relief, noise, flatMask, grassColor, sandColor } from './relief.js';
import { buildCoveFun, buildSeaFun, funItems, funUse, updateFun, onRepaint, setLighthouse } from './covefun.js';
import { buildCovePlay, buildSeaPlay, playItems, playUse, updateCovePlay, hideParrot, LIGHT_H, COCO_PALMS } from './coveplay.js';

const Z0 = COVE.z0, Z1 = COVE.z1, ZM = (Z0 + Z1) / 2, ZL = Z1 - Z0;
const ROAD_Z = 43;
const SAND = 0xf3dfa8, WET = 0xd8c08a, ROCK = 0x8a8f9a;
let st = null;       // луг
let cv = null;       // бухта (пляж, отмель, пещера)
let sea = null;      // море
let ship = null;     // корабль — живёт вне секторов (плавает через оба)
let swim = { cam: false, swim: false, air: AIR(), hud: null, tint: null };
function AIR() { return 25; }
onLevelReset(() => { st = cv = sea = ship = null; hudOff(); swim = { cam: false, swim: false, air: AIR(), hud: null, tint: null }; });

const lab = (x, y, z, text, color = '#ffe14d', w = 5.6, h = 1.3) => { const l = makeLabel(w, h); l.position.set(x, y, z); scene.add(l); l.userData.set(text, { color }); return l; };
const sign = (g, x, z, text, color) => { box(g, 0.25, 2.8, 0.25, 0x6a3f1e, x, 1.4, z); box(g, 2.6, 0.7, 0.12, 0xc8a87a, x, 2.6, z); return lab(x, 3.6, z, text, color, 5.2, 1.2); };
// вода во всю ширину сектора; уровень — по приливу (каждый кадр)
function seaPlane(g, x0, x1) {
  const w = x1 - x0, m = water(g, w, seaLevel(), 0x2f9ae8); m.scale.y = ZL / w; m.position.set((x0 + x1) / 2, seaLevel(), ZM);
  m.material.map.repeat.set(w / 8, ZL / 8); m.userData.dynamic = true; return m;
}
// граница: каменная гряда (визуально) + невидимая стена от дна до неба
function ridge(g, x0, x1, z0, z1, y0 = DEEP_Y - 1) {
  const R = seeded(Math.abs(Math.round(x0 * 7 + z0 * 13)) + 5), long = (x1 - x0) > (z1 - z0);
  const n = Math.ceil((long ? x1 - x0 : z1 - z0) / 3.2);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = long ? x0 + t * (x1 - x0) : (x0 + x1) / 2, z = long ? (z0 + z1) / 2 : z0 + t * (z1 - z0), h = 1.6 + R() * 2.2;
    box(g, 3.4, h - y0, 3.4, i % 2 ? ROCK : 0x7a7f8a, x, (y0 + h) / 2, z, { shadow: false });
  }
  addCollider({ x0, x1, z0, z1, y0, y1: 12 });
}
// остров: песчаная кромка (чтобы выйти из воды) и сам остров — «круг» из трёх брусков
function isle(g, I, color = SAND) {
  const disk = (r, top, c) => { for (const [a, b] of [[2, 1.4], [1.4, 2], [1.75, 1.75]]) solid(g, r * a, top - DEEP_Y + 0.5, r * b, c, I.x, DEEP_Y - 0.5, I.z, { studs: true }); };
  disk(I.r + 1.6, ISLE_RIM, WET); disk(I.r, ISLE_Y, color);
}

// ================= 🌿 ЛУГ =================
export function buildMeadow(g, save) {
  const { x0, x1 } = COVE.meadow, R = seeded(2024);
  st = { gullT: 3 };
  solid(g, x1 - x0 + 1, 1, ZL, 0x6fd04a, (x0 + x1 + 1) / 2, -1, ZM, { studs: true });
  solid(g, x1 - x0, 3, 1.4, 0x3f9e3a, (x0 + x1) / 2, 0, Z0 + 0.7, { cam: true });
  solid(g, x1 - x0, 3, 1.4, 0x3f9e3a, (x0 + x1) / 2, 0, Z1 - 0.7, { cam: true });
  solid(g, 1.4, 3, -6 - Z0, 0x3f9e3a, x1 - 0.7, 0, (Z0 - 6) / 2, { cam: true });   // к северу от стены базы — изгородь
  // дорожка от ворот к морю
  box(g, x1 - x0 + 1, 0.06, 3, 0xe9d9a6, (x0 + x1 + 1) / 2, 0.03, ROAD_Z, { shadow: false });
  for (let x = x0 + 2; x < x1; x += 4) box(g, 0.5, 0.07, 0.5, 0xd8c890, x, 0.035, ROAD_Z + (x % 8 ? 1.9 : -1.9), { shadow: false });
  // холмы луга: ровно у дорожки и по краям (у базы и у пляжа)
  const N = noise(11), flat = flatMask([[x0 - 2, x1 + 2, ROAD_Z - 5, ROAD_Z + 5], [x1 - 8, x1 + 2, Z0, Z1], [x0 - 2, x0 + 4, Z0, Z1]], 12);
  const H = relief(g, { id: 'meadow', x0, x1, z0: Z0 + 1.4, z1: Z1 - 1.4, height: (x, z) => (N(x, z, 20) * 8 - 2.6) * flat(x, z), color: grassColor() });
  for (let i = 0, n = 0; i < 300 && n < 34; i++) {
    const x = x0 + 3 + R() * (x1 - x0 - 6), z = Z0 + 3 + R() * (ZL - 6);
    if (Math.abs(z - ROAD_Z) < 6) continue;
    tree(g, x, z, 0.9 + R() * 0.5, H(x, z), ['oak', 'birch', 'apple', 'pine'][Math.floor(R() * 4)]); n++;
  }
  for (let i = 0; i < 110; i++) {
    const x = x0 + R() * (x1 - x0), z = Z0 + 3 + R() * (ZL - 6); if (Math.abs(z - ROAD_Z) < 2.5) continue;
    const y = H(x, z); box(g, 0.08, 0.4, 0.08, 0x3fae3a, x, y + 0.2, z, { shadow: false }); box(g, 0.3, 0.2, 0.3, [0xff5a8a, 0xffd23f, 0xffffff, 0x9b6bff, 0x7fd4ff][i % 5], x, y + 0.45, z, { shadow: false });
  }
  [['bunny', -84, 20], ['hedgehog', -100, 66], ['bunny', -116, 90], ['squirrel', -92, -10], ['deer', -110, 0]].forEach(([k, x, z]) => addCritter(k, x, z, { x, z, r: 8 }));
  for (const [x, z] of [[-80, 50], [-102, 36], [-120, 56]]) addButterfly(x, z);
  sign(g, -73, ROAD_Z + 4.5, '⚓ Пиратская бухта →');
  sign(g, -112, ROAD_Z - 4.5, '🌊 Море уже слышно!', '#bfe8ff');
  createLampPost(g, -78, ROAD_Z - 2.5, 0); createLampPost(g, -104, ROAD_Z + 2.5, 0); createLampPost(g, -126, ROAD_Z - 2.5, 0);
}

// ================= 🏖️ БУХТА =================
export function buildCove(g, save) {
  const { beach: Bc, flat: F, shelf: S } = COVE, R = seeded(777);
  cv = { g, t: 0, waters: [], foam: null, gate: null, tideLab: null, tideT: 0, gullT: 2 };
  // пляж, отмель (в отлив сухая), склон под водой
  solid(g, Bc.x1 - Bc.x0, 1, 114 - Z0, SAND, (Bc.x0 + Bc.x1) / 2, -1, (Z0 + 114) / 2, { studs: true });
  solid(g, F.x1 - F.x0, 1, 126 - Z0, WET, (F.x0 + F.x1) / 2, FLAT_Y - 1, (Z0 + 126) / 2, { studs: true });
  solid(g, S.x1 - S.x0, 1, ZL, 0xc8b080, (S.x0 + S.x1) / 2, SHELF_Y - 1, ZM, { studs: true });
  // песчаная коса к Крабьему острову и сам остров
  solid(g, SANDBAR.x1 - SANDBAR.x0, FLAT_Y - SHELF_Y, SANDBAR.z1 - SANDBAR.z0, WET, (SANDBAR.x0 + SANDBAR.x1) / 2, SHELF_Y, (SANDBAR.z0 + SANDBAR.z1) / 2, { studs: true });
  isle(g, ISLES.crab);
  // скалы на севере, внутри — пещера (вход с юга, с отмели)
  const C = CAVE, top = 8, y0 = DEEP_Y - 1, cliff = (x0, x1, z0, z1, yb = y0, c = ROCK) => solid(g, x1 - x0, top - yb, z1 - z0, c, (x0 + x1) / 2, yb, (z0 + z1) / 2, { cam: true, studs: true });
  const floor = (x0, x1, z0, z1, y, c = 0x8a8478) => solid(g, x1 - x0, 1, z1 - z0, c, (x0 + x1) / 2, y - 1, (z0 + z1) / 2, { studs: true });
  cliff(S.x0, C.x0, 114, Z1); cliff(C.x1, Bc.x1, 114, Z1); cliff(C.x0, C.x1, C.z1, Z1);                 // стены пещеры
  cliff(C.x0, C.mouth.x0, 114, C.z0); cliff(C.mouth.x1, C.x1, 114, C.z0); cliff(C.mouth.x0, C.mouth.x1, 114, C.z0, 3.2);
  cliff(C.x0, C.x1, C.z0, C.z1, 5.2, 0x6f7480);                                     // свод
  cliff(-188.5, -187.5, C.z0, 119.5, y0, 0x7a7f8a); cliff(-188.5, -187.5, 124.5, C.z1, y0, 0x7a7f8a);   // проход к озеру
  cliff(-172.5, -171.5, C.z0, 119, y0, 0x7a7f8a); cliff(-172.5, -171.5, 125, C.z1, y0, 0x7a7f8a);       // проход в зал факелов
  const L = C.lake;                                                                  // пол: у озера, у входа, в залах
  floor(C.x0, -188, C.z0, L.z0, FLAT_Y); floor(C.x0, -188, L.z1, C.z1, FLAT_Y); floor(C.x0, L.x0, L.z0, L.z1, FLAT_Y); floor(L.x1, -188, L.z0, L.z1, FLAT_Y);
  floor(L.x0, L.x1, L.z0, L.z1, -2.2, 0x5a6a7a); floor(-190, -170, 126, C.z1, FLAT_Y); floor(-172, C.x1, 114, C.z1, 0, 0x9a9488);
  const lw = water(g, L.x1 - L.x0, -1, 0x3fd8ff); lw.scale.y = (L.z1 - L.z0) / (L.x1 - L.x0); lw.position.set((L.x0 + L.x1) / 2, -1, (L.z0 + L.z1) / 2); lw.userData.dynamic = true;
  const fall = new T.Mesh(new T.BoxGeometry(1.4, 6.2, 0.5), new T.MeshLambertMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.6 })); fall.position.set(-196.4, 2.1, 122); fall.userData.dynamic = true; g.add(fall); cv.fall = fall;   // подземный водопад
  for (let i = 0; i < 7; i++) box(g, 2 + R() * 2, 1 + R(), 2 + R() * 2, i % 2 ? 0x9aa0aa : 0x7a7f8a, -196 + i * 10 + R() * 3, top + 0.4, 117 + R() * 10, { shadow: false });   // гребень скал
  cv.gate = addCollider({ x0: C.mouth.x0, x1: C.mouth.x1, z0: C.mouth.z - 0.6, z1: C.mouth.z + 0.6, y0: -2, y1: 3.2 });
  const foam = new T.Mesh(new T.BoxGeometry(C.mouth.x1 - C.mouth.x0, 3.4, 0.5), new T.MeshLambertMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.7 }));
  foam.position.set((C.mouth.x0 + C.mouth.x1) / 2, 0.6, C.mouth.z); foam.userData.dynamic = true; g.add(foam); cv.foam = foam;
  lab((C.mouth.x0 + C.mouth.x1) / 2, 5, 113.5, '🕳️ Пещера · вход в отлив', '#ffffff', 5.4, 1.2);
  for (let i = 0; i < 26; i++) {                                                     // светящиеся кристаллы по стенам всей пещеры
    const x = C.x0 + 1 + R() * (C.x1 - C.x0 - 2), side = R() < 0.5, z = side ? C.z0 + 0.4 : C.z1 - 0.4, col = [0x7fe8ff, 0xb88aff, 0xff7ac8, 0x7fffb0][i % 4];
    const cr = box(g, 0.35 + R() * 0.3, 0.8 + R() * 1.2, 0.35, col, x, (x > -172 ? 0 : FLAT_Y) + 0.6 + R() * 2.5, z, { shadow: false }); cr.rotation.z = (R() - 0.5) * 0.8; cr.material = new T.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: 0.6 });
  }
  // гряда на юге, граница у берега склона
  ridge(g, S.x0, Bc.x1, Z0 - 1.5, Z0 + 1.5);
  // причал
  solid(g, PIER.x1 - PIER.x0, 0.3, PIER.z1 - PIER.z0, 0xb07a3a, (PIER.x0 + PIER.x1) / 2, PIER.y - 0.3, ROAD_Z, { studs: false });
  for (let x = PIER.x0 + 0.5; x < PIER.x1; x += 1) box(g, 0.9, 0.05, PIER.z1 - PIER.z0, x % 2 ? 0xc08a48 : 0xa8743a, x, PIER.y + 0.02, ROAD_Z, { shadow: false });
  for (let x = PIER.x0 + 0.3; x < PIER.x1 - 2; x += 4) for (const sz of [PIER.z0 + 0.2, PIER.z1 - 0.2]) { box(g, 0.35, PIER.y - SHELF_Y + 1.6, 0.35, 0x6a3f1e, x, (SHELF_Y + PIER.y + 1.6) / 2, sz); }
  for (const sz of [PIER.z0 + 0.2, PIER.z1 - 0.2]) box(g, PIER.x1 - PIER.x0 - 2, 0.12, 0.12, 0xd8c08a, (PIER.x0 + PIER.x1) / 2 - 1, PIER.y + 1.3, sz, { shadow: false });   // канаты-перила
  box(g, 0.6, 1, 0.6, 0x6a3f1e, PIER.x0 + 3, PIER.y + 0.5, PIER.z0 + 0.3);                                       // кнехт — к нему привязан корабль
  lab(PIER.x0 + 4, 4.2, ROAD_Z, '⛵ Причал', '#ffffff', 4, 1);
  // ворота-арка на пляж
  for (const sz of [-3.2, 3.2]) { box(g, 0.5, 4.6, 0.5, 0x6a3f1e, Bc.x1 - 1, 2.3, ROAD_Z + sz); }
  box(g, 0.5, 0.5, 7.4, 0x6a3f1e, Bc.x1 - 1, 4.6, ROAD_Z);
  lab(Bc.x1 - 1, 5.8, ROAD_Z, '⚓ Пиратская бухта', '#ffe14d', 7, 1.6);
  box(g, Bc.x1 - PIER.x1, 0.06, 3, 0xe0c890, (Bc.x1 + PIER.x1) / 2, 0.03, ROAD_Z, { shadow: false });          // дощатая дорожка к причалу
  // табличка прилива
  box(g, 0.3, 3, 0.3, 0x6a3f1e, -163, 1.5, 48); box(g, 3.2, 1.4, 0.15, 0x3f7fb0, -163, 3, 48);
  cv.tideLab = lab(-163, 4.4, 48, '🌊', '#ffffff', 6, 1.4);
  // лужицы на отмели
  for (const [x, z, s] of [[-178, 6, 3], [-184, 30, 2.4], [-176, 70, 3.2], [-182, 88, 2.6], [-186, -18, 2.8]]) box(g, s, 0.05, s * 0.8, 0x6fc8f0, x, FLAT_Y + 0.03, z, { shadow: false });
  // дюны на пляже (у воды, у построек и игр — ровно) и скалистый мыс на юге — забраться и смотреть на море
  const DUNE = [[-200, -157, Z0, Z1], [-133, -125, Z0, Z1], [-200, -125, ROAD_Z - 5, ROAD_Z + 5],
    [FORT.x - 9, FORT.x + 4, FORT.z - 9, FORT.z + 9], [-149, -128, 12, 43], [-142, -132, 46, 61], [-153, -143, 77, 95], [CASTLE.x0 - 3, CASTLE.x0 + 13, CASTLE.z0 - 3, CASTLE.z0 + 13],
    { c: [-150, 16, 12] }, { c: [-141, 98, 12] }, { c: [-158, 58, 12] }, { c: [-146, -22, 12] }, { c: [-152, 104, 5] }, { c: [-170.5, -26, 6] }, { c: [-163, 48, 3] }, { c: [CAPTAIN.x, CAPTAIN.z, 4] }];
  const ND = noise(23), dflat = flatMask(DUNE, 5); const shellFlat = flatMask([{ c: [-146, -22, 12] }], 3);   // мыс не налезает на место клада у ракушки
  const HB = relief(g, { id: 'cove', x0: -158, x1: -129, z0: Z0 + 1.5, z1: 113, cell: 1.5, side: 0xd8b878,
    color: (x, z, h) => h > 3 ? 0x9a9488 : sandColor()(x, z, h),
    height: (x, z) => { const cape = z < -24 ? (6.5 - Math.hypot(x + 138, z + 35) / 2.2) * shellFlat(x, z) : 0; return Math.max(cape, (ND(x, z, 9) * 5 - 1.9) * dflat(x, z)); } });
  cv.H = HB;
  // пальмы на пляже
  const busy = (x, z) => Math.abs(z - ROAD_Z) < 6 || (Math.abs(x - FORT.x) < 9 && Math.abs(z - FORT.z) < 9) || (x > CASTLE.x0 - 3 && x < CASTLE.x0 + 13 && z > CASTLE.z0 - 3 && z < CASTLE.z0 + 13) || z > 108 || (Math.abs(x - CAPTAIN.x) < 4 && Math.abs(z - CAPTAIN.z) < 4);
  for (let i = 0, n = 0; i < 200 && n < 18; i++) { const x = Bc.x0 + 6 + R() * (Bc.x1 - Bc.x0 - 8), z = Z0 + 4 + R() * (ZL - 10); if (busy(x, z)) continue; palm(g, x, z, 0.9 + R() * 0.4, HB(x, z)); n++; }
  for (let i = 0; i < 26; i++) { const x = Bc.x0 + 1 + R() * 36, z = Z0 + 3 + R() * 106; if (!busy(x, z)) box(g, 0.35, 0.12, 0.3, [0xffc0d0, 0xffffff, 0xffe0a0][i % 3], x, HB(x, z) + 0.06, z, { shadow: false }); }   // ракушки-украшения
  createLampPost(g, -134, ROAD_Z - 2.5, 0); createLampPost(g, -160, ROAD_Z + 3.2, 0);
  cv.waters.push(seaPlane(g, S.x0, SHORE));
  buildCoveFun(g, save);                                            // этап 4: лагерь, гамак, тарзанка, черепашата, вышка
  buildCovePlay(g, save);                                           // капитан, доски, бутылки, пушка, замок, клад, крабы, пещера
}

// ================= 🌊 МОРЕ =================
export function buildSea(g, save) {
  const { sea: S } = COVE, R = seeded(4242);
  sea = { g, t: 0, waters: [], fish: [], beam: null };
  solid(g, S.x1 - S.x0, 1, ZL, 0xc8b080, (S.x0 + S.x1) / 2, DEEP_Y - 1, ZM, { studs: true });
  ridge(g, S.x0, S.x1, Z0 - 1.5, Z0 + 1.5); ridge(g, S.x0, S.x1 + 0.5, Z1 - 1.5, Z1 + 1.5); ridge(g, S.x0 - 1.5, S.x0 + 1.5, Z0, Z1);
  // водоросли и камни на дне
  for (let i = 0; i < 60; i++) {
    const x = S.x0 + 4 + R() * (S.x1 - S.x0 - 8), z = Z0 + 4 + R() * (ZL - 8); if (Object.values(ISLES).some(I => Math.hypot(x - I.x, z - I.z) < I.r + 3)) continue;
    if (R() < 0.6) { const h = 1.5 + R() * 3; box(g, 0.3, h, 0.3, R() < 0.5 ? 0x2e9a4a : 0x4cc26a, x, DEEP_Y + h / 2, z, { shadow: false }); }
    else box(g, 1.4 + R(), 0.8, 1.2 + R(), R() < 0.5 ? 0xff7a8a : 0xffb060, x, DEEP_Y + 0.4, z, { shadow: false });   // кораллы
  }
  // 🗼 остров с маяком: башня в полоску, ступеньки вокруг, площадка с фонарём
  const L = ISLES.light; isle(g, L);
  for (let i = 0; i < 7; i++) solid(g, 4.4, LIGHT_H / 7, 4.4, i % 2 ? 0xd8261a : 0xffffff, L.x, ISLE_Y + i * LIGHT_H / 7, L.z, { cam: true, studs: false });
  // лестница вокруг башни — снаружи площадки (радиус 4.6), последняя ступенька — у прохода в перилах на востоке
  for (let i = 0; i < 16; i++) {
    const a = 0.35 - (15 - i) * 0.4, y = ISLE_Y + (LIGHT_H + 0.4) * (i + 1) / 16, r = 4.6;
    solid(g, 1.5, 0.3, 1.5, 0xb07a3a, L.x + Math.cos(a) * r, y - 0.3, L.z + Math.sin(a) * r, { studs: false });
    box(g, 0.2, y - 0.3 - ISLE_Y, 0.2, 0x8a5a2b, L.x + Math.cos(a) * r, (y - 0.3 + ISLE_Y) / 2, L.z + Math.sin(a) * r);
  }
  const top = ISLE_Y + LIGHT_H;
  solid(g, 7, 0.4, 7, 0x6a6f7a, L.x, top, L.z, { studs: false });
  for (const [dx, dz, w, d] of [[0, -3.4, 7, 0.2], [0, 3.4, 7, 0.2], [-3.4, 0, 0.2, 7], [3.4, -1.4, 0.2, 4.2]]) solid(g, w, 1.1, d, 0xffffff, L.x + dx, top + 0.4, L.z + dz, { studs: false });
  const lamp = box(g, 1.8, 1.8, 1.8, 0xfff3a0, L.x, top + 1.4, L.z); lamp.material = new T.MeshBasicMaterial({ color: 0xfff3a0 });
  box(g, 2.4, 0.4, 2.4, 0xd8261a, L.x, top + 2.5, L.z);
  const beam = group(g, L.x, top + 1.4, L.z); beam.userData.dynamic = true;
  const bm = new T.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.25, depthWrite: false });
  for (const s of [-1, 1]) { const b = new T.Mesh(new T.BoxGeometry(1.2, 1.2, 28), bm); b.position.z = s * 15; beam.add(b); }
  sea.beam = beam;
  lab(L.x, top + 4.6, L.z, '🗼 Маяк', '#ffffff', 4, 1);
  for (const [dx, dz] of [[-6, 3], [5, -6], [-3, -7]]) rock(g, L.x + dx, L.z + dz, 0.8, ISLE_Y);
  // 🥥 Кокосовый остров
  const K = ISLES.coco; isle(g, K, 0xf6e6b0);
  for (const [x, z] of COCO_PALMS) palm(g, x, z, 1.15, ISLE_Y);
  lab(K.x, 9.5, K.z, '🥥 Кокосовый остров', '#ffffff', 6, 1.3);
  // стайки рыб
  for (const [x, z, c] of [[-240, 30, 0xffd23f], [-280, 50, 0xff7a3a], [-226, 90, 0x7fd4ff], [-320, 20, 0xff7ac8], [-270, -14, 0x9b6bff]]) {
    const fg = group(g, x, DEEP_Y + 3, z); fg.userData.dynamic = true;
    for (let i = 0; i < 7; i++) { const f = box(fg, 0.18, 0.3, 0.6, c, (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 2.4, { shadow: false }); box(fg, 0.05, 0.25, 0.2, c, f.position.x, f.position.y, f.position.z - 0.38, { shadow: false }); }
    sea.fish.push({ g: fg, home: V3(x, DEEP_Y + 3, z), a: Math.random() * 6, run: 0, away: V3() });
  }
  sea.waters.push(seaPlane(g, S.x0, S.x1));
  buildSeaFun(g, save); setLighthouse(lamp, beam);                  // кит, дельфины, морские чудеса, ночной купец
  buildSeaPlay(g, save);                                            // затонувший корабль, осьминог, жемчуг, сундук маяка, кокосы
}

// ================= ⛵ КОРАБЛЬ =================
const HELM = V3(0, 2.4, -4.1);                                       // где стоит герой (локально: нос — +z)
function makeShip(save) {
  const root = group(scene, MOOR.x, seaLevel() - 0.7, MOOR.z); root.rotation.y = MOOR.face;
  const P = { wreck: group(root), hull: group(root), deck: group(root), mast: group(root), sail: group(root) };
  // 0 — обломки: днище набок, торчат доски
  const w = P.wreck; const wb = box(w, 3.6, 1.1, 7, 0x6a4a2a, 0.4, 0.2, 0); wb.rotation.z = 0.35;
  for (let i = 0; i < 6; i++) { const p = box(w, 0.25, 0.2 + i * 0.05, 2.4, 0x8a6a3a, -1.4 + i * 0.6, 0.9, -2 + (i % 3) * 1.6); p.rotation.x = 0.3 * (i % 2 ? 1 : -1); p.rotation.z = -0.4; }
  box(w, 0.35, 2.2, 0.35, 0x5a3a1a, 0.2, 1.4, 0.6).rotation.z = 0.6;
  // 1 — корпус
  const h = P.hull;
  const hullM = new T.MeshLambertMaterial({ color: 0x8a5a2b }), sailA = new T.MeshLambertMaterial({ color: 0xffffff }), sailB = new T.MeshLambertMaterial({ color: 0xd8261a }), flagM = new T.MeshLambertMaterial({ color: 0x2a5aa8 });   // свои материалы — корабль можно покрасить
  for (const b of [box(h, 4, 1.5, 9, 0x8a5a2b, 0, 0.75, 0), box(h, 3, 1.5, 2, 0x8a5a2b, 0, 0.95, 5.2), box(h, 1.8, 1.3, 1.4, 0x8a5a2b, 0, 1.15, 6.6)]) b.material = hullM;
  box(h, 4.06, 0.28, 9.06, 0xffd23f, 0, 1.3, 0); box(h, 3.06, 0.28, 2.06, 0xffd23f, 0, 1.4, 5.2);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) box(h, 0.06, 0.45, 0.45, 0x2b2b33, sx * 2.02, 0.85, -2 + i * 2);   // иллюминаторы
  // 2 — палуба, корма, штурвал, перила, пушечка на носу
  const d = P.deck;
  box(d, 3.8, 0.12, 8.8, 0xd8a868, 0, 1.52, 0); box(d, 4, 0.9, 2.6, 0x9a6a3a, 0, 1.95, -3.4); box(d, 3.9, 0.08, 2.5, 0xd8a868, 0, 2.42, -3.4);
  for (const sx of [-1, 1]) { box(d, 0.15, 0.6, 9, 0x6a3f1e, sx * 1.95, 1.9, 0.4); }
  const wheel = group(d, 0, 3.05, -2.6); for (let i = 0; i < 4; i++) { const s = box(wheel, 0.08, 1.3, 0.08, 0x6a3f1e); s.rotation.z = i * Math.PI / 4; } box(wheel, 0.3, 0.3, 0.2, 0xffd23f);
  box(d, 0.15, 0.7, 0.15, 0x6a3f1e, 0, 2.7, -2.7);
  box(d, 0.45, 0.45, 1.4, 0x2b2b33, 0, 1.85, 5.2); box(d, 0.9, 0.3, 0.6, 0x6a3f1e, 0, 1.65, 4.8);
  // 3 — мачта и «воронье гнездо»
  const m = P.mast; box(m, 0.45, 9.5, 0.45, 0x6a3f1e, 0, 6.2, 0.8); box(m, 1.6, 0.5, 1.6, 0x8a5a2b, 0, 9.4, 0.8); box(m, 5.4, 0.2, 0.2, 0x6a3f1e, 0, 7.9, 0.95);
  // 4 — парус в полоску и пиратский флаг
  const s = group(P.sail, 0, 5.5, 1.05);
  for (let i = 0; i < 5; i++) box(s, 5.2, 0.9, 0.1, 0xffffff, 0, 2.1 - i * 0.9, 0, { shadow: false }).material = i % 2 ? sailB : sailA;
  const flag = group(P.sail, 0, 11.3, 0.8); box(flag, 0.08, 1, 0.08, 0x2b2b33); const fl = group(flag, 0, 0.2, 0); box(fl, 0.05, 0.9, 1.5, 0x2a5aa8, 0, 0, -0.8, { shadow: false }).material = flagM;
  const sk = sprite(emojiTex('⭐'), 0.7); sk.position.set(0, 0, -0.8); fl.add(sk);
  const label = makeLabel(6, 1.4); label.position.set(0, 6.5, 0); root.add(label);
  ship = { root, P, sail: s, flag: fl, wheel, label, paintM: { hullM, sailA, sailB, flagM, sk }, pos: root.position, head: MOOR.face, speed: 0, wind: Math.random() * 6.28, windTo: 0, windT: 0, bumpT: 0, t: 0, stage: -1, home: true };
  ship.windTo = ship.wind;
  shipStage(coveSave(save).stage); paintShip(coveSave(save).paint);
}
// покраска (covefun.js — панель у капитана): цвет корпуса, двух полос паруса, флага и картинка на флаге
export function paintShip(pt) {
  if (!ship) return; const M = ship.paintM, P = { hull: 0x8a5a2b, a: 0xffffff, b: 0xd8261a, flag: 0x2a5aa8, icon: '⭐', ...(pt || {}) };
  M.hullM.color.setHex(P.hull); M.sailA.color.setHex(P.a); M.sailB.color.setHex(P.b); M.flagM.color.setHex(P.flag);
  if (M.icon !== P.icon) { M.icon = P.icon; M.sk.material.map = emojiTex(P.icon); M.sk.material.needsUpdate = true; }
}
function shipStage(stage) {
  if (!ship || ship.stage === stage) return;
  ship.stage = stage; const P = ship.P;
  P.wreck.visible = stage === 0; P.hull.visible = stage >= 1; P.deck.visible = stage >= 2; P.mast.visible = stage >= 3; P.sail.visible = stage >= 4;
  ship.label.visible = stage < 4;
  if (stage < 4) ship.label.userData.set(stage === 0 ? '🛠️ Сломанный корабль' : `🛠️ Корабль: ${stage} из 4`, { color: '#ffe14d' });
}
const helmPos = () => ship.root.localToWorld(HELM.clone());
const deepOK = (x, z) => x > BOUNDS.x0 && x < SHORE - 4 && z > BOUNDS.z0 && z < BOUNDS.z1 && floorAt(x, z) < seaLevel() - 1.3;
function updateShip(dt, hero, cam, ev) {
  const t = ship.t += dt, sl = seaLevel(), sailing = !!hero.climb?.ship;
  // ветер: раз в минуту поворачивает
  if ((ship.windT -= dt) <= 0) { ship.windT = 45 + Math.random() * 30; ship.windTo = ship.wind + (Math.random() - 0.5) * 3; }
  ship.wind = dampAngle(ship.wind, ship.windTo, 0.4, dt);
  if (sailing && !ship.camSet) { ship.camSet = true; cam.dist = Math.max(cam.dist, 16); cam.pitch = Math.max(cam.pitch, 0.35); }   // корабль большой — камера подальше
  if (!sailing) ship.camSet = false;
  if (sailing) {
    const mv = input.move, yaw = cam.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const wx = rx * mv.x - fx * mv.y, wz = rz * mv.x - fz * mv.y, mag = Math.min(Math.hypot(wx, wz), 1);
    if (mag > 0.15) ship.head = dampAngle(ship.head, Math.atan2(wx, wz), 1.3 * mag, dt);
    const wk = 0.5 + 0.5 * Math.cos(ship.head - ship.wind);               // 1 — ветер в спину, 0 — в лицо
    ship.speed = damp(ship.speed, mag > 0.15 ? (2.5 + 9.5 * wk) * mag : 0, 0.9, dt);
    const dx = Math.sin(ship.head), dz = Math.cos(ship.head), nx = ship.pos.x + dx * ship.speed * dt, nz = ship.pos.z + dz * ship.speed * dt;
    if (deepOK(nx + dx * 6, nz + dz * 6) && deepOK(nx, nz)) { ship.pos.x = nx; ship.pos.z = nz; ship.home = false; }
    else if (ship.speed > 0.5) { ship.speed = 0; if ((ship.bumpT -= dt) <= 0) { ship.bumpT = 3; ev.sfx.push('boing'); ev.say = '🪨 Мель! Тут мелко — поверни'; puff('💦', ship.pos.clone().add(V3(dx * 6, 1.5 - ship.pos.y + sl, dz * 6)), { size: 1.4, rise: 1 }); } }
    else ship.bumpT -= dt;
    ship.wheel.rotation.z = damp(ship.wheel.rotation.z, -mv.x * 1.2, 4, dt);
    cam.yaw = dampAngle(cam.yaw, ship.head + Math.PI, 0.9, dt);
    hero.climb.face = ship.head;
    if (ship.speed > 3 && Math.random() < dt * 4) puff('💦', ship.root.localToWorld(V3((Math.random() - 0.5) * 3, 0.6, 6.5)), { size: 0.8, rise: 0.6, life: 0.7 });
    if (Math.random() < dt * 0.8) { const a = ship.wind; puff('💨', ship.pos.clone().add(V3(-Math.sin(a) * 6, sl + 7 - ship.pos.y, -Math.cos(a) * 6)), { size: 1.2, rise: 0.2, life: 1.4, dx: Math.sin(a) * 2 }); }
  } else ship.speed = 0;
  ship.root.rotation.y = ship.head;
  ship.pos.y = sl - 0.7 + Math.sin(t * 1.3) * 0.08;
  ship.root.rotation.z = Math.sin(t * 0.9) * 0.03 + (sailing ? Math.min(ship.speed, 10) * 0.006 : 0);
  if (ship.stage === 0) ship.root.rotation.z = 0.12 + Math.sin(t) * 0.02;
  // флаг — по ветру; парус надувается, когда плывём
  ship.flag.rotation.y = ship.wind - ship.head + Math.PI;
  ship.sail.scale.z = damp(ship.sail.scale.z, sailing && ship.speed > 1 ? 4 : 1, 2, dt); ship.sail.position.z = 1.05 + (ship.sail.scale.z - 1) * 0.08;
}

// ================= 🤿 ПЛАВАНИЕ И НЫРЯНИЕ =================
function hud() {
  if (!swim.hud) {
    swim.hud = document.createElement('div'); swim.hud.style.cssText = 'position:fixed;left:50%;top:58px;transform:translateX(-50%);z-index:30;font-size:24px;letter-spacing:2px;pointer-events:none;text-shadow:0 1px 3px #0006;display:none';
    swim.tint = document.createElement('div'); swim.tint.style.cssText = 'position:fixed;inset:0;z-index:5;pointer-events:none;background:linear-gradient(#2a8ad055,#0a3a7088);display:none';
    document.body.append(swim.hud, swim.tint);
  }
}
function hudOff() { if (swim?.hud) { swim.hud.style.display = 'none'; swim.tint.style.display = 'none'; } }
function updateSwim(dt, hero, ev) {
  hud();
  const p = hero.pos, sl = seaLevel(), area = inSeaArea(p);
  hero.sea = area ? sl : undefined;
  if (area && !swim.cam) { hero.camFloor = DEEP_Y - 1; swim.cam = true; } else if (!area && swim.cam) { hero.camFloor = undefined; swim.cam = false; }
  if (hero.inSea) { hero.swim = true; swim.swim = true; } else if (swim.swim) { hero.swim = false; swim.swim = false; }
  if (!hero.inSea && hero.dive) hero.dive = false;
  const under = hero.dive && p.y + 2.2 < sl;
  if (under) {
    swim.air -= dt;
    if (Math.random() < dt * 3) puff('🫧', p.clone().setY(p.y + 2.4), { size: 0.5, rise: 2, life: 1 });
    if (swim.air <= 0) { hero.dive = false; ev.say = '🫧 Воздух кончился — всплываем!<small>наверху вдохни и ныряй снова 🤿</small>'; ev.sfx.push('pop'); }
  } else swim.air = Math.min(AIR(), swim.air + dt * 8);
  if (hero.airRefill) { swim.air = Math.min(AIR(), swim.air + dt * 14); hero.airRefill = false; }   // пузырьковый гейзер у затонувшего корабля
  const n = Math.ceil(swim.air / AIR() * 5);
  swim.hud.style.display = hero.dive || swim.air < AIR() - 0.1 ? 'block' : 'none';
  swim.hud.textContent = '🫧'.repeat(n) + '·'.repeat(5 - n);
  swim.tint.style.display = camera.position.y < sl && camera.position.x < SHORE + 1 ? 'block' : 'none';
}

// ================= кнопки =================
export function coveItems(hero, save) {
  if (!cv && !sea) return [];
  const out = [], p = hero.pos, c = coveSave(save);
  if (hero.climb?.ship) return [];
  if (hero.inSea && !hero.climb) out.push(hero.dive ? { id: 'g_cove_up', icon: '⬆️' } : { id: 'g_cove_dive', icon: '🤿' });
  if (ship && !hero.climb) {
    const d = Math.hypot(p.x - ship.pos.x, p.z - ship.pos.z);
    if (c.stage >= 4 && d < 7.5 && p.y > ship.pos.y - 2 && !hero.dive) out.push({ id: 'g_cove_board', icon: '⛵' });
    if (c.stage >= 4 && !ship.home && p.x < PIER.x0 + 6 && p.y > 0 && Math.abs(p.z - ROAD_Z) < 3 && d > 14) out.push({ id: 'g_cove_bell', icon: '🔔' });
    if (canBuild(c) && (Math.hypot(p.x - CAPTAIN.x, p.z - CAPTAIN.z) < 5 || (d < 9 && p.y > -0.5))) out.push({ id: 'g_cove_build', icon: '🔨' });
  }
  return [...out, ...playItems(hero, save), ...funItems(hero, save)];
}
export function coveUse(act, hero, save, ctx) {
  const { toast, SFX } = ctx, c = coveSave(save);
  if (act === 'dive') { if (hero.inSea) { hero.dive = true; SFX.splash?.(); if (!c.dived) { c.dived = 1; toast('🤿 Ныряем!<small>прыжок — гребок вверх · ⬆️ — всплыть · следи за пузырьками 🫧</small>'); } } return; }
  if (act === 'up') { hero.dive = false; return; }
  if (act === 'board' && ship && c.stage >= 4) {
    if (ctx.carrying) { SFX.nope(); toast('🥚 С яйцом на корабль нельзя<small>сначала отнеси его домой</small>'); return; }
    hero.dive = false;
    hero.climb = { t: 0, dur: 1e9, stand: true, ship: true, face: ship.head, ride: () => helmPos() };
    SFX.whoosh?.(); toast('⛵ Капитан на мостике!<small>джойстик — куда плыть · флаг показывает ветер: по ветру — быстро · прыжок — спрыгнуть</small>');
    if (!c.sailed) { c.sailed = Date.now(); ctx.persist(); }
    return;
  }
  if (act === 'bell' && ship) { ship.pos.set(MOOR.x, ship.pos.y, MOOR.z); ship.head = MOOR.face; ship.home = true; puff('⛵', V3(MOOR.x, 3, MOOR.z), { size: 1.6, rise: 1.5 }); SFX.bell?.(); toast('🔔 Динь-динь! Корабль вернулся к причалу'); return; }
  if (act === 'build') {
    if (!canBuild(c)) return;
    const S = STAGES[c.stage]; for (const [k, n] of Object.entries(S.need)) c.inv[k] -= n;
    c.stage++; shipStage(c.stage); ctx.persist();
    for (let i = 0; i < 6; i++) setTimeout(() => ship && puff(i % 2 ? '🔨' : '✨', ship.pos.clone().add(V3((Math.random() - 0.5) * 5, 2 + Math.random() * 3 + seaLevel() - ship.pos.y, (Math.random() - 0.5) * 5)), { size: 1.2, rise: 1.2 }), i * 180);
    confetti(ship.pos.clone().setY(seaLevel() + 4), 40); SFX.craft?.() ?? SFX.fanfare();
    if (c.stage >= 4) { c.parrot = c.parrot || Date.now(); ctx.persist(); SFX.fanfare(); ctx.done?.(); }
    else toast(`${S.icon} ${S.name} — готово!<small>корабль: ${c.stage} из 4 · дальше: ${STAGES[c.stage].icon} ${STAGES[c.stage].name}</small>`);
    return;
  }
  if (funUse(act, hero, save, ctx)) return;
  playUse(act, hero, save, ctx);
}

// ================= раз в кадр =================
export function updateCove(dt, hero, save, cam, act) {
  const ev = { sfx: [] }, p = hero.pos, sl = seaLevel(), c = coveSave(save);
  if (!ship && (act.cove || act.sea)) makeShip(save);
  if (ship) { ship.root.visible = act.cove || act.sea; shipStage(c.stage); updateShip(dt, hero, cam, ev); }
  if (act.cove && cv) {
    cv.t += dt;
    for (const w of cv.waters) w.position.y = sl;
    const low = sl < -0.95, inX = p.x > CAVE.x0 && p.x < CAVE.x1;
    if (inX && p.z > CAVE.mouth.z + 0.8) cv.inside = true; else if (!inX || p.z < CAVE.mouth.z - 1.2) cv.inside = false;   // вышел за проём — снаружи
    const inCave = cv.inside;
    cv.gate.off = low || inCave;                                    // прилив не пускает внутрь, но изнутри выйти можно всегда
    cv.foam.visible = !low; cv.foam.position.y = sl + 1.4;
    if ((cv.tideT -= dt) <= 0) { cv.tideT = 1; const m = Math.ceil(tideLeft() / 60); cv.tideLab.userData.set(low ? `🏖️ Отлив! Пещера открыта · ещё ${m} мин` : `🌊 Прилив · отлив через ${m} мин`, { color: '#ffffff' }); }
    if (!c.visited && p.x < COVE.beach.x1) { c.visited = Date.now(); ev.welcome = true; ev.save = true; }
    if (cv.low !== undefined && cv.low !== low && p.x < -120) { ev.say = low ? '🏖️ Отлив! Вода ушла<small>пещера в скалах открыта 🕳️ · на отмели — лужицы с находками</small>' : (cv.inside ? '🌊 Прилив! Вода поднимается<small>вход закрылся снаружи — но выйти из пещеры можно, волна тебя выпустит</small>' : '🌊 Прилив! Вода поднимается<small>пещера закрылась до следующего отлива</small>'); ev.sfx.push('splash'); }
    cv.low = low;
    if ((cv.gullT -= dt) <= 0) { cv.gullT = 3 + Math.random() * 4; if (p.x < -120) puff('🕊️', V3(p.x + (Math.random() - 0.5) * 20, 9 + Math.random() * 4, p.z + (Math.random() - 0.5) * 20), { size: 1, rise: 0.6, life: 2, dx: 2 }); }
  }
  if (act.sea && sea) {
    const t = sea.t += dt;
    for (const w of sea.waters) w.position.y = sl;
    sea.beam.rotation.y = t * 0.6;                                 // виден ночью, когда маяк зажгли (covefun.js)
    for (const f of sea.fish) {
      const q = f.g.position, d = q.distanceTo(p);
      if (d < 5 && hero.inSea) { f.run = 2; f.away.copy(q).sub(p).setY(0).normalize(); }
      if (f.run > 0) { f.run -= dt; q.addScaledVector(f.away, dt * 7); }
      else { f.a += dt * 0.5; q.x = damp(q.x, f.home.x + Math.cos(f.a) * 6, 1, dt); q.z = damp(q.z, f.home.z + Math.sin(f.a) * 6, 1, dt); }
      q.y = Math.min(sl - 1, f.home.y + Math.sin(t + f.a) * 0.5);
      f.g.rotation.y = f.run > 0 ? Math.atan2(f.away.x, f.away.z) : f.a + Math.PI;
    }
  }
  updateSwim(dt, hero, ev);
  const pe = updateCovePlay(dt, hero, save, cam, act, ship), fe = updateFun(dt, hero, save, cam, act, ship);
  for (const k in fe) { if (k === 'sfx') ev.sfx.push(...fe.sfx); else if (k === 'coins') ev.coins = (ev.coins || 0) + fe.coins; else if (k === 'say' && ev.say) ev.say2 = fe.say; else ev[k] = fe[k]; }
  for (const k in pe) { if (k === 'sfx') ev.sfx.push(...pe.sfx); else if (k === 'coins') ev.coins = (ev.coins || 0) + pe.coins; else if (k === 'say' && ev.say) ev.say2 = pe.say; else ev[k] = pe[k]; }
  return ev;
}
// бухта далеко (все её сектора спят): герой не в море, подсветка и пузырьки спрятаны
export function coveIdle(hero) {
  if (hero.sea !== undefined) hero.sea = undefined;
  if (swim.cam) { hero.camFloor = undefined; swim.cam = false; }
  if (swim.swim) { hero.swim = false; swim.swim = false; }
  hero.dive = false; hudOff();
  if (ship) ship.root.visible = false;
  hideParrot();
}
export const coveShip = () => ship;
onRepaint(paintShip);
