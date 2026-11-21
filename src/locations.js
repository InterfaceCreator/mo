// Локации: база (хаб с порталами) и места, куда через порталы попадают.
// Каждая локация строится заново при входе; что в ней сохраняется между заходами — живёт в save и в eggs.js.
import { B } from './balance.js';
import { T, scene, group, box } from './engine.js';
import { C, solid, tree, fence, clouds, portal, groundY, level, addCollider, PEN, TOWER, TREADMILL } from './world.js';
import { addZip, addRace, addDig, addWell, addArrow, addBeaver } from './extras.js';
import { buildTrack } from './track.js';
import { buildAutumn, AUTUMN } from './autumn.js';
import { FRIEND_HOMES } from './friends.js';
import { HOUSE, CLOTHES_SHOP, buildHome, buildLoft } from './home.js';
import { buildWinter, WINTER } from './winter.js';
import { buildSecret, SECRET } from './secret.js';
import { buildSchool, SCHOOL } from './school.js';
import { buildBunkerLoc, BUNKER_SPAWN } from './bunkerloc.js';
import { makeLabel } from './fx.js';
import { addStar, addScroll, addPad, addBunny, addCritter, addDuck, addButterfly, addRotor, addWaterfall, addMushroom, addPlates } from './fun.js';
import { buildTerrain, water } from './terrain.js';
import { defineNests } from './eggs.js';
import { addLoose, addRock, addDoor, addHook, addChest, buildWorkbench, WORKBENCH } from './craft.js';

// случайные числа с «зерном»: локация каждый раз одинаковая
function seeded(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ================= БАЗА =================
// все порталы — в один ряд в северной стене, одинаковой ширины: x — центр прохода
export const BASE_PORTALS = { autumn: -39, winter: -26, desert: -13, forest: 0, ice: 13, school: 26, track: 39 };
const PORTAL_W = 5.5;                                               // ширина прохода (столбы с аркой — по бокам)
const PORTAL_LOOK = {
  autumn: { color: 0xff8a1a, label: '🍂 Осень' }, winter: { color: 0x7fd4ff, label: '⛄ Зима' }, desert: { color: 0xffb02e, label: '🏜️ Пустыня' },
  forest: { color: 0x5fd84a, label: '🌲 Лес' }, ice: { color: 0x9ad8ff, label: '❄️ Лёд' }, school: { color: 0xffb020, label: '🏫 Школа' }, track: { color: 0xff5a3d, label: '🏁 Дорожка' },
};

function buildBase(save) {
  const w = group(scene);
  solid(w, 90, 1, 70, C.grass, 0, -1, 30);
  // западная и восточная стены — сплошные
  solid(w, 2, 12, 72, C.wall, -46, 0, 30, { cam: true }); solid(w, 2, 12, 72, C.wall, 46, 0, 30, { cam: true });
  // южной стены нет: база открыта в Аквапарк (park.js); полоса земли на стыке, чтобы не было щели
  solid(w, 92, 1, 1, C.grass, 0, -1, 65.5);              // z 65…66: ровно между землёй базы и Аквапарка
  // северная стена: семь порталов в ряд, между ними — простенки
  const xs = Object.values(BASE_PORTALS).sort((a, b) => a - b), half = PORTAL_W / 2 + 0.9;
  let x0 = -47;
  for (const px of [...xs, 47 + half]) {
    const x1 = px - half;
    if (x1 > x0 + 0.1) { solid(w, x1 - x0, 7, 2, C.wall, (x0 + x1) / 2, 0, -6, { cam: true }); box(w, x1 - x0, 0.8, 2.4, C.wallBand, (x0 + x1) / 2, 7.4, -6, { studs: true }); }   // ниже порталов — арки видно
    x0 = px + half;
  }
  for (const [id, px] of Object.entries(BASE_PORTALS)) {
    const L = PORTAL_LOOK[id], lock = LOCS[id]?.req && save.speed < LOCS[id].req;
    portal(w, { x: px, z: -6, w: PORTAL_W, to: id, color: L.color, label: L.label, locked: !!lock, req: LOCS[id]?.req || 0 });
  }

  // дорожки к порталам
  // дорожки — встык, одной высоты, края по сетке пупырышек (шаг 0.6): не налезают и узор не съезжает
  const road = (x0, x1, z0, z1) => solid(w, x1 - x0, 0.08, z1 - z0, 0xe9d9a6, (x0 + x1) / 2, 0, (z0 + z1) / 2, { shadow: false });
  road(-46.2, 46.2, -4.8, 2.4);                    // площадь вдоль всех порталов
  road(-3, 3, 2.4, 67);                            // центральная аллея: от порталов насквозь до дорожки Аквапарка (встык)
  road(-45, -3, 41.4, 44.4); road(3, 45, 41.4, 44.4);   // поперечная дорожка за загонами (перекрёсток на аллее)
  road(-37.8, -35.4, 44.4, 54);                    // к домику
  road(3, 6.6, 47.4, 49.8);                        // к магазину
  road(-6.6, -3, 52.2, 54.6);                      // к верстаку
  road(-34.8, -32.4, 37.2, 41.4);                  // к стадиону
  // детская площадка: песок от площади порталов до поперечной дорожки, между правым загоном и стеной
  box(w, 14.4, 0.04, 39, 0xf3dfa8, 37.8, 0.02, 21.9, { shadow: false, studs: true });
  // лесенка из кубиков (забирайся наверх) — на детской площадке
  for (let i = 0; i < 5; i++) solid(w, 3, 1 + i, 3, [0x3fa7ff, 0xff5a5a, 0xffd93b, 0x9b6bff, 0x40e0d0][i], 33.5, 0, 24 + i * 3, { cam: true });
  solid(w, 3.6, 5, 3.6, 0x3fa7ff, 33.5, 0, 39.3, { cam: true });

  // загоны: свой и для второго игрока (на этапе 4)
  fence(w, -30, 16, -8, 16, [[9, 13]]); fence(w, -30, 40, -8, 40); fence(w, -30, 16, -30, 40); fence(w, -8, 16, -8, 40, [[10, 14]]);
  fence(w, 8, 16, 30, 16, [[9, 13]]); fence(w, 8, 40, 30, 40); fence(w, 30, 16, 30, 40); fence(w, 8, 16, 8, 40, [[10, 14]]);
  solid(w, 21, 0.1, 23, C.grassDark, -19, 0, 28, { shadow: false }); solid(w, 21, 0.1, 23, C.grassDark, 19, 0, 28, { shadow: false });
  if (save.tools.house) petHouse();

  // деревья и площадка с лесенкой
  for (const [x, z, s, k] of [[-43.5, 20, 1, 'apple'], [-12, 47.5, 1.2, 'pine'], [38, 58, 1, 'birch'], [22, 50, 1.1, 'oak'], [-22, 58, 0.9, 'pine'], [24, 60, 1, 'apple']]) tree(w, x, z, s, 0, k);


  // башня с сундуком (верёвка)
  solid(w, 4, TOWER.h, 4, 0x8f8fa8, TOWER.x, 0, TOWER.z, { cam: true });
  box(w, 4.6, 0.6, 4.6, 0xff7b22, TOWER.x, TOWER.h - 0.3 + 0.01, TOWER.z, { studs: true });
  for (const [dx, dz] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]]) solid(w, 0.6, 0.8, 0.6, 0xff7b22, TOWER.x + dx, TOWER.h + 0.01, TOWER.z + dz, { studs: false });
  addHook(TOWER.x - 2.8, TOWER.z, TOWER.x, TOWER.h, TOWER.z);
  addChest('tower', TOWER.x + 0.6, TOWER.h, TOWER.z);

  // ресурсы на базе
  for (const [x, z] of [[-38, 0], [-36, 46], [-16, 56], [6, 64], [30, 52], [42, 42], [-43, 34], [4, 40]]) addLoose(x, z, 'wood');
  for (const [x, z] of [[-10, 12], [-4, 46], [30, 2], [44, 24], [-28, 52], [-4, 64], [-40, 40], [-20, 62], [40, 60]]) addLoose(x, z, 'stone');
  for (const [x, z] of [[-30, 50], [28, 4]]) addRock(x, z);
  for (const [x, z] of [[-42, 30], [-14, 44], [36, 30], [-12, 5], [22, 64], [42, 50]]) addLoose(x, z, 'leaf');
  buildWorkbench();
  clouds(w);
  return w;
}

// домик для питомцев (сделан на верстаке) — в углу загона; вызывается и сразу после крафта
export function petHouse() {
  const w = group(scene);
  solid(w, 4, 2.6, 3.4, 0xffd9a0, -26, 0, 36.5, { studs: true });
  const roof = group(w, -26, 2.6, 36.5);
  for (const sx of [-1, 1]) { const r = box(roof, 2.6, 0.3, 3.8, 0xc0392b, sx * 1.05, 0.7, 0, { studs: true }); r.rotation.z = -sx * 0.6; }
  box(w, 1.2, 1.4, 0.1, 0x6a3f1e, -26, 0.7, 34.75, { studs: false });
  return w;
}

// ================= КОРИДОРЫ (Пустыня, Лёд) =================
const ZL = 100;
function buildCorridor(L) {
  const w = group(scene);
  const zone = { kind: 'corridor', x0: -9, x1: 9, border: -8 };
  // пол от тупика до площадки у портала
  solid(w, 18, 1, ZL + 20, L.floor, 0, -1, -(ZL + 6) / 2 + 7);
  for (const sx of [-1, 1]) {
    solid(w, 3, 10, ZL + 14, L.wall, sx * 10.5, 0, -ZL / 2 + 7, { cam: true });
    // по гребню можно пройти (забравшись по верёвке), блоки на нём — перепрыгивать
    solid(w, 3.2, 1.2, ZL + 14, L.band, sx * 10.5, 10, -ZL / 2 + 7);
    for (let z = -ZL + 4; z < 9; z += 9) solid(w, 2.4, 1.6, 2.4, L.top, sx * 10.5, 11.2, z);
  }
  solid(w, 24, 10, 3, L.wall, 0, 0, -ZL - 1.5, { cam: true });
  solid(w, 24, 10, 2, L.wall, 0, 0, 16, { cam: true });
  const border = new T.Mesh(new T.PlaneGeometry(18, 1.2), new T.MeshBasicMaterial({ color: C.red, transparent: true, opacity: 0.75 }));
  border.rotation.x = -Math.PI / 2; border.position.set(0, 0.03, zone.border); w.add(border);
  for (const [x, z] of [[-6, -21], [5, -36], [-5, -50], [6, -66], [-6, -82]]) solid(w, 3, 1.5, 3, L.top, x, 0, z, { cam: true });
  portal(w, { x: 0, z: 10, to: 'base', color: 0x9b6bff, label: '🏠 База', rot: Math.PI });
  defineNests(L.id, L.nests.map(([x, z, r, guard, s]) => ({ x, z, r, guard, s, zone })));
  addHook(-8.2, -28, -10.5, 11.2, -28); addHook(8.2, -55, 10.5, 11.2, -55);
  for (const [x, z, k] of L.loose || []) addLoose(x, z, k);
  for (const [x, z, rich] of L.rocks || []) addRock(x, z, 'boulder', rich);
  clouds(w, 8);
  return w;
}

// полая постройка W×H×D с комнатой высотой room внизу и дверью с одной стороны (door: 'x-', 'x+', 'z-', 'z+')
function hollow(w, x, y, z, W, H, D, color, door, room = 3.6, t = 0.7) {
  const DW = 1.8, DH = 3;                 // проём выше роста героя (2.75)
  // на склоне ставим по самой высокой точке вокруг, иначе у входа земля окажется выше пола
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1.6], [0, 1.6], [-1.6, 0], [1.6, 0]]) y = Math.max(y, groundY(x + dx * W / 2, z + dz * D / 2));
  const wall = (cx, cz, ww, dd) => solid(w, ww, room, dd, color, cx, y, cz, { cam: true });
  const sides = { 'z-': [x, z - D / 2 + t / 2, W, t], 'z+': [x, z + D / 2 - t / 2, W, t], 'x-': [x - W / 2 + t / 2, z, t, D], 'x+': [x + W / 2 - t / 2, z, t, D] };
  for (const [k, [cx, cz, ww, dd]] of Object.entries(sides)) {
    if (k !== door) { wall(cx, cz, ww, dd); continue; }
    // стена с проёмом: два куска по бокам и перемычка сверху
    const along = ww > dd, L = along ? ww : dd, piece = (L - DW) / 2;
    for (const sgn of [-1, 1]) {
      const off = sgn * (DW / 2 + piece / 2);
      wall(along ? cx + off : cx, along ? cz : cz + off, along ? piece : ww, along ? dd : piece);
    }
    solid(w, along ? DW : ww, room - DH, along ? dd : DW, color, cx, y + DH, cz, { cam: true });
  }
  solid(w, W, H - room, D, color, x, y + room, z, { cam: true });         // всё, что выше комнаты, — сплошное
  return y;
}

// ================= ЛЕС =================
// Открытая местность с ориентирами, которые видно издалека: гигантское дерево, гора со смотровой вышкой,
// мельница на холме, руины крепости, водопад, парящий остров. По всему лесу спрятано 10 звёзд.
export const FOREST = {
  size: 220, edge: 100,                                    // за краем — скалы
  river: z => 14 * Math.sin(z / 22) - 24,                 // русло петляет с севера на юг
  plateau: { x: 45, z: -40, r: 11, h: 8 },                // высокое плато — только по верёвке
  glade: { x0: -64, x1: -40, z0: 36, z1: 60 },            // тайная поляна за завалом (топор)
  mountain: { x: 5, z: -42, r: 22, h: 6.5 },              // гора с вышкой — можно забраться пешком
  cave: { x: -9, z: -54 },                                 // пещерка на склоне (в ней свиток)
  hill: { x: 45, z: -8 },                                  // холм с мельницей
  bigTree: { x: 22, z: 28 },                               // гигантское дерево с лестницей
  fort: { x: -48, z: 12 },                                 // руины крепости
  sky: { x: 60, z: 22 },                                   // батут к парящему острову
  log: { x: -20, z: -62 },                                 // полое бревно
  spawn: { x: 0, z: 60 },
  gorilla: { x: -70, z: 22 },                              // гнездо гориллы: из его яйца всегда вылупляется горилла
  // дальнее кольцо леса
  lake: { x: 82, z: 10, r: 16, island: 4.5 },               // озеро: на остров — по кочкам; в глубокую воду нельзя
  mush: { x: -78, z: -64 },                                // грибная роща
  maze: { x0: -94, z0: 56, n: 7, cell: 4 },                // лабиринт из кустов
  village: { x: 72, z: -74 },                              // деревня на деревьях
  circle: { x: -84, z: 0 },                                // каменный круг с плитами
  camp: { x: 21, z: 66 },                                  // лагерь бобра Бори
  zipTower: { x: 40, z: 84 },                              // вышка канатной дороги
  ship: { x: 64, z: -16 },                                 // пиратский корабль на берегу
  well: { x: -8, z: 86 },                                 // колодец желаний
  race: { x: 60, z: 44, rings: [[66, 52], [74, 60], [84, 66], [92, 76], [86, 88], [72, 92], [58, 88], [52, 74], [56, 58]] },   // гонка на восточном лугу
  digs: [[-30, 30], [55, -20], [-60, -40], [10, 90], [-90, 40], [90, 90], [-36, -88], [60, -52]],                            // клады
  arrows: [[62, 47, 0.6], [80, 63, 1.2], [90, 82, 2.8], [64, 90, -1.8], [10, 40, Math.PI], [-42, 74, Math.PI / 2], [30, -60, 0.4]],   // стрелки-ускорители
  zipEnds: [{ x: 86, z: 50 }, { x: 30, z: -90 }],          // куда привозят канатки
  // гнёзда; сторож гонится, пока не добежишь до зелёного круга у портала
  nests: [[38, 48, 0, 'goose'], [2, 18, 0, 'capy'], [-50, -14, 1, 'boar'], [30, 0, 2, 'deer'], [-12, -28, 2, 'brownbear'], [40, -66, 3, 'boar', 1.5], [-40, 86, 2, 'brownbear'], [88, -32, 3, 'deer']],
};
const near2 = (x, z, o, r) => Math.hypot(x - o.x, z - o.z) < r;
function forestHeight(x, z) {
  const F = FOREST, e = Math.max(Math.abs(x), Math.abs(z));
  if (z < -F.edge && z > -F.edge - 4 && Math.abs(x - F.river(-F.edge)) < 2.5) return -1;   // ниша за водопадом
  if (e > F.edge) return 10;                                                       // скалы по краю
  const L = F.lake, dl = Math.hypot(x - L.x, z - L.z);
  if (dl < L.island) return 1;                                                     // остров
  if (dl < L.r) return -3;                                                         // глубокое озеро
  const MZ = F.maze, mw = MZ.n * MZ.cell;
  if (x > MZ.x0 - 3 && x < MZ.x0 + mw + 3 && z > MZ.z0 - 3 && z < MZ.z0 + mw + 3) return 1;   // под лабиринтом ровно
  const G = F.glade;
  if (x > G.x0 && x < G.x1 && z > G.z0 && z < G.z1) return 0.5;                   // поляна
  if (x > G.x0 - 4 && x < G.x1 + 4 && z > G.z0 - 4 && z < G.z1 + 4) {             // скалы вокруг поляны, проход — с востока
    if (x > G.x1 && z > 44 && z < 52) return 0.5;
    return 8;
  }
  if (near2(x, z, F.plateau, F.plateau.r)) return F.plateau.h;
  const rd = Math.abs(x - F.river(z));
  if (rd < 1.8 && z > 4 && z < 14) return 0;                                      // островок посреди реки
  if (rd < 4) return -1;                                                           // река
  let h = 2.2 * Math.sin(x / 21) + 1.8 * Math.cos(z / 17) + 1.2 * Math.sin((x + z) / 29) + 1.6;
  const M = F.mountain, dm = Math.hypot(x - M.x, z - M.z);
  if (dm < M.r) h = Math.max(h, M.h * (1 - dm / M.r) + 0.5);
  const dh = Math.hypot(x - F.hill.x, z - F.hill.z);
  if (dh < 12) h = Math.max(h, 3.5 - dh * 0.15);
  if (rd < 8) h = Math.min(h, (rd - 4) * 0.3);                                     // пологий берег
  // ровные площадки: у портала, у гнёзд, у построек
  if (near2(x, z, F.spawn, 12)) h = 0.5;
  for (const [nx, nz] of F.nests) if (Math.hypot(x - nx, z - nz) < 6) h = Math.min(h, 1.5);
  for (const o of [F.fort, F.bigTree, F.sky, F.log, F.camp, F.zipTower, F.ship, F.well]) if (near2(x, z, o, o === F.fort ? 13 : 8)) h = 1;
  for (const [o, r] of [[F.mush, 16], [F.village, 16], [F.circle, 12]]) if (near2(x, z, o, r)) h = 1;
  if (dl < L.r + 4) h = Math.min(h, 1);                                             // берег озера пологий
  if (near2(x, z, F.cave, 6)) h = 1.5;
  return Math.max(0, Math.round(h * 2) / 2);
}
function forestColor(x, z, h) {
  if (h < -2) return 0x2f6fb0;                      // глубина
  if (h < 0) return 0xd9c27a;                       // песок на дне реки
  if (h >= 8) return 0x9a9aaa;                      // скалы
  if (h >= 5) return 0x8bd85a;                      // вершина горы
  if (near2(x, z, FOREST.spawn, 12)) return 0x7fe060;
  const v = (Math.sin(x * 0.37) + Math.cos(z * 0.41)) * 0.5;
  return v > 0.4 ? 0x6fd14a : v < -0.4 ? 0x5bc23e : 0x65cc44;
}

// --- ориентиры леса ---
function giantTree(w, save) {
  const { x, z } = FOREST.bigTree, y = groundY(x, z);
  addScroll(save, 'umbrella', x + 0.6, z, y);                           // свиток спрятан в дупле
  hollow(w, x, y, z, 5, 30, 5, 0x7a4a24, 'x-');                         // в стволе дупло, вход с запада
  for (const [s, h, dx, dz] of [[16, 5, 0, 0], [12, 4, 2, -1], [9, 4, -1, 2]]) box(w, s, h, s, [0x5fd84a, 0x6ad13c, 0x7fe04a][h % 3], x + dx, y + 26 + (16 - s) * 0.6, z + dz, { studs: true });
  // спиральная лестница вокруг ствола: каждая ступенька на блок выше — герой поднимается сам
  for (let i = 0; i < 20; i++) {
    const a = i * 0.55, sx = x + Math.cos(a) * 4.2, sz = z + Math.sin(a) * 4.2;
    solid(w, 2.2, 0.5, 2.2, i % 2 ? 0xc98a45 : 0xa0622a, sx, y + i + 0.5, sz);
  }
  // наверху — смотровая площадка вокруг ствола (последняя ступенька переходит в неё)
  const a = 20 * 0.55, lx = x + Math.cos(a) * 5, lz = z + Math.sin(a) * 5;
  solid(w, 4.4, 0.5, 4.4, 0xc98a45, lx, y + 20.5, lz);
  addChest('forest-tree', lx + Math.cos(a) * 1.2, y + 21, lz + Math.sin(a) * 1.2);
  addStar(save, 'forest-tree', lx - Math.sin(a) * 1.4, lz + Math.cos(a) * 1.4, y + 21);
  // висящая в воздухе площадка: пешком и с батута не достать — только долететь с дерева на зонтике
  solid(w, 5, 0.8, 5, 0x9b6bff, x, y + 15, z - 22);
  tree(w, x + 1.2, z - 23.2, 0.5, y + 15.8);
  addStar(save, 'forest-glide', x - 1, z - 21, y + 15.8);
}
function windmill(w, save) {
  const { x, z } = FOREST.hill;
  const y = hollow(w, x, groundY(x, z), z, 4.4, 11, 4.4, 0xf4ede0, 'z-');   // внутри мельницы — комната, вход с севера
  addScroll(save, 'pad', x, z + 0.5, y);
  box(w, 5, 2, 5, 0xc0392b, x, y + 12, z, { studs: true });
  solid(w, 7, 0.4, 7, 0xa0622a, x, y + 6, z);                         // балкон — сюда долетают с батута
  for (const [dx, dz] of [[-3.3, -3.3], [3.3, -3.3], [-3.3, 3.3], [3.3, 3.3]]) box(w, 0.3, 1, 0.3, 0x8a5a2b, x + dx, y + 6.9, z + dz, { studs: false });
  const hub = group(w, x, y + 9.5, z + 2.3); hub.userData.dynamic = true; box(hub, 0.8, 0.8, 0.8, 0x6a3f1e);
  for (let i = 0; i < 4; i++) { const arm = group(hub); arm.rotation.z = i * Math.PI / 2; box(arm, 0.6, 7, 0.15, 0xffffff, 0, 3.6, 0, { studs: false }); box(arm, 1.6, 5, 0.1, 0xe8d8b8, 0.9, 4, 0.05, { studs: false }); }
  addRotor(hub, 0.9);
  addPad(x - 5, z + 4);
  addStar(save, 'forest-mill', x + 2.5, z - 2.5, y + 6.4);
}
function fort(w, save) {
  const { x, z } = FOREST.fort, y = groundY(x, z), S = 0x9a9aaa, S2 = 0xb0b0bc;
  // стены квадратом 18×18 с проломами; высота «рваная»
  for (let i = -8; i <= 8; i += 2) for (const [px, pz] of [[i, -9], [i, 9], [-9, i], [9, i]]) {
    if ((pz === 9 && Math.abs(px) < 3) || (px === -9 && i > 2 && i < 6)) continue;      // ворота и пролом
    if (px <= -7 && pz >= 7) continue;                                                     // место полой башни
    const h = 2 + Math.abs(Math.round(Math.sin(i * 1.7 + px + pz) * 3));
    solid(w, 2, h, 2, (i / 2) % 2 ? S : S2, x + px, y, z + pz, { cam: true });
  }
  // угловые башни; к одной ведёт груда камней-ступенек, наверху звезда
  for (const [px, pz] of [[-9, -9], [9, -9], [9, 9]]) solid(w, 4, 7, 4, S, x + px, y, z + pz, { cam: true });
  hollow(w, x - 9, y, z + 9, 4.4, 7, 4.4, S, 'x-');                      // в этой башне тайник, вход снаружи
  addScroll(save, 'boots', x - 8.6, z + 9, y);
  for (let i = 1; i <= 6; i++) solid(w, 2.4, i, 2.4, S2, x + 9 - (7 - i) * 2.2, y, z - 5.8);
  addStar(save, 'forest-fort', x + 9, z - 9, y + 7);
  addChest('forest-fort', x, y, z);
}
function skyIsland(w, save) {
  // батут → летающие блоки → парящий остров со звездой и сундуком
  const { x, z } = FOREST.sky, y = groundY(x, z);
  addPad(x, z, 25);
  const steps = [[0, 5, 7], [2.5, 9.5, 8], [-1, 13.5, 9], [1.5, 17.5, 10], [-1.5, 21.5, 11], [1, 25.5, 12]];
  steps.forEach(([dx, dz, h], i) => solid(w, 2.6, 0.8, 2.6, [0xff5a5a, 0xffd93b, 0x5fd35f, 0x3fa7ff, 0x9b6bff, 0xff7ac8][i], x + dx, y + h - 0.8, z + dz));
  solid(w, 9, 2, 9, 0x6fd14a, x, y + 11, z + 32, { cam: true });
  box(w, 7, 1.5, 7, 0x9c6a3c, x, y + 10.25, z + 32);
  tree(w, x + 2.5, z + 34, 0.7, y + 13);
  addStar(save, 'forest-sky', x - 2, z + 31, y + 13);
  addChest('forest-sky', x - 2, y + 13, z + 34.5);
}
function lookout(w, save) {
  const M = FOREST.mountain, y = groundY(M.x, M.z);
  for (const [dx, dz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) solid(w, 0.4, 4, 0.4, 0x8a5a2b, M.x + dx, y, M.z + dz, { studs: false });
  box(w, 4.4, 0.4, 4.4, 0xc0392b, M.x, y + 4.2, M.z, { studs: true });
  addStar(save, 'forest-peak', M.x, M.z, y);
  // на склоне — маленькая пещерка из камней, вход смотрит на край карты
  const { x: cx, z: cz } = FOREST.cave;
  const cy = hollow(w, cx, groundY(cx, cz), cz, 5, 4.4, 5, 0x8f8fa0, 'z-', 3.6);
  box(w, 6, 1, 6, 0x9a9aaa, cx, cy + 4.9, cz, { studs: true });
  addScroll(save, 'house', cx, cz + 0.6, cy);
}
function waterfall(w, save) {
  const E = FOREST.edge, x = FOREST.river(-E);
  addWaterfall(x, -E + 0.1, -1, 10, 8);
  box(w, 8, 0.3, 2, 0xffffff, x, -0.45, -E + 1.5, { shadow: false });
  addStar(save, 'forest-fall', x + 2.5, -E + 3.5, groundY(x + 2.5, -E + 3.5));
  addScroll(save, 'magnet', x, -E - 2, -1);                              // в нише за водой
}
function hollowLog(w, save) {
  const { x, z } = FOREST.log, y = groundY(x, z);
  for (const [dy, dz, ww, hh] of [[0, 0, 10, 0.6], [3.6, 0, 10, 0.6]]) solid(w, ww, hh, 4.4, 0x8a5a2b, x, y + dy, z + dz);
  for (const sz of [-1, 1]) solid(w, 10, 3.6, 0.6, 0x7a4a24, x, y, z + sz * 1.9, { cam: true });
  addStar(save, 'forest-log', x, z, y + 0.6);
}

// --- дальнее кольцо ---
function lake(w, save) {
  const L = FOREST.lake;
  // кочки от западного берега до острова: прыгать с одной на другую
  const stones = [[-15, 0.4], [-12.2, -0.8], [-9.6, 0.7], [-7, -0.4], [-4.6, 0.5]];
  for (const [dx, dz] of stones) solid(w, 2, 0.6, 2, 0x9a9aaa, L.x + dx, -0.2, L.z + dz);
  tree(w, L.x + 1.5, L.z - 1.5, 0.8, 1, 'apple');
  addStar(save, 'forest-lake', L.x - 1.5, L.z + 1.5, 1);
  addChest('forest-lake', L.x + 1.8, 1, L.z + 1.8);
}
function mushrooms(w, save) {
  const M = FOREST.mush;
  // по шляпкам — всё выше и выше; на самом высоком — звезда
  for (const [dx, dz, h, c] of [[-6, 6, 0.6, 0xffd23f], [-3, 4, 3, 0xff4a4a], [2, 1, 5, 0x9b6bff], [6, -4, 7, 0xff4a4a], [0, -7, 9, 0x3fa7ff], [-8, -3, 2, 0xff7ac8], [9, 6, 4, 0xffd23f]])
    addMushroom(M.x + dx, M.z + dz, h, 19, c);
  addStar(save, 'forest-mush', M.x, M.z - 7, groundY(M.x, M.z - 7) + 10.3);
  for (let i = 0; i < 20; i++) { const a = i * 2.4, r = 4 + (i * 7) % 11, x = M.x + Math.cos(a) * r, z = M.z + Math.sin(a) * r; box(w, 0.25, 0.5, 0.25, 0xffffff, x, groundY(x, z) + 0.25, z, { shadow: false }); box(w, 0.8, 0.3, 0.8, [0xff4a4a, 0x9b6bff, 0x3fa7ff][i % 3], x, groundY(x, z) + 0.65, z, { shadow: false }); }
}
function maze(w, save) {
  // лабиринт: клетки n×n, проходы прорублены случайно, но каждый раз одинаково; вход — с востока
  const M = FOREST.maze, n = M.n, c = M.cell, rnd = seeded(11), y = 1;
  const seen = Array.from({ length: n }, () => Array(n).fill(false)), wallE = Array.from({ length: n }, () => Array(n).fill(true)), wallS = Array.from({ length: n }, () => Array(n).fill(true));
  const stack = [[0, 0]]; seen[0][0] = true;
  while (stack.length) {
    const [i, j] = stack[stack.length - 1];
    const next = [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n && !seen[a][b]);
    if (!next.length) { stack.pop(); continue; }
    const [a, b] = next[Math.floor(rnd() * next.length)];
    if (a !== i) wallE[Math.min(a, i)][j] = false; else wallS[i][Math.min(b, j)] = false;
    seen[a][b] = true; stack.push([a, b]);
  }
  const H = 6, hedge = 0x3fae2a, x0 = M.x0, z0 = M.z0, W = n * c;   // выше двух ростов героя: не перепрыгнуть и не подсмотреть
  // внешние стены (вход на восточной стороне посередине)
  solid(w, W + 1, H, 1, hedge, x0 + W / 2, y, z0);  solid(w, W + 1, H, 1, hedge, x0 + W / 2, y, z0 + W);
  solid(w, 1, H, W, hedge, x0, y, z0 + W / 2);
  const mid = Math.floor(n / 2);
  solid(w, 1, H, mid * c, hedge, x0 + W, y, z0 + mid * c / 2); solid(w, 1, H, (n - mid - 1) * c, hedge, x0 + W, y, z0 + (mid + 1) * c + (n - mid - 1) * c / 2);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (i < n - 1 && wallE[i][j]) solid(w, 1, H, c + 1, hedge, x0 + (i + 1) * c, y, z0 + j * c + c / 2);
    if (j < n - 1 && wallS[i][j]) solid(w, c + 1, H, 1, hedge, x0 + i * c + c / 2, y, z0 + (j + 1) * c);
  }
  // в центре — сундук и звезда
  const cx = x0 + mid * c + c / 2, cz = z0 + mid * c + c / 2;
  addChest('forest-maze', cx, y, cz + 1); addStar(save, 'forest-maze', cx, cz - 1, y);
}
function village(w, save) {
  // три дерева с домиками на высоте 8, между ними подвесные мосты; на первое дерево — лестница вокруг ствола
  const V = FOREST.village, T3 = [[V.x - 8, V.z + 8], [V.x + 6, V.z - 2], [V.x - 6, V.z - 12]], y = groundY(V.x, V.z), top = y + 8;
  for (const [tx, tz] of T3) {
    solid(w, 2.4, 13, 2.4, 0x7a4a24, tx, y, tz, { cam: true });
    solid(w, 7, 0.5, 7, 0xc98a45, tx, top - 0.5, tz);
    box(w, 8, 3, 8, 0x5fd84a, tx, top + 5.5, tz, { studs: true });
    for (const [dx, dz] of [[-3.3, -3.3], [3.3, -3.3], [-3.3, 3.3], [3.3, 3.3]]) box(w, 0.25, 1, 0.25, 0x8a5a2b, tx + dx, top + 0.5, tz + dz, { studs: false });
  }
  for (let i = 0; i < 8; i++) { const a = i * 0.42, sx = T3[0][0] + Math.cos(a) * 4.6, sz = T3[0][1] + Math.sin(a) * 4.6; solid(w, 1.8, 0.4, 1.8, 0xa0622a, sx, y + i + 0.6, sz); }   // ступеньки снаружи площадки — голова не упирается
  // мосты из досок
  for (const [[ax, az], [bx, bz]] of [[T3[0], T3[1]], [T3[1], T3[2]]]) {
    const len = Math.hypot(bx - ax, bz - az) - 7, ux = (bx - ax) / Math.hypot(bx - ax, bz - az), uz = (bz - az) / Math.hypot(bx - ax, bz - az);
    for (let k = 0; k < len; k += 1.2) solid(w, 1.4, 0.3, 1.4, k % 2.4 < 1.2 ? 0xc98a45 : 0xa0622a, ax + ux * (3.5 + k + 0.6), top - 0.3, az + uz * (3.5 + k + 0.6));
  }
  const [hx, hz] = T3[2];
  hollow(w, hx + 1.5, top, hz + 1.5, 3.4, 3.2, 3.4, 0xffd9a0, 'x-', 3.1);
  addStar(save, 'forest-village', hx - 1.5, hz - 1.5, top);
}
function stoneCircle(w, save) {
  const C0 = FOREST.circle, y = groundY(C0.x, C0.z);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; solid(w, 1.6, 3 + (i % 3), 1.2, 0x8f8fa0, C0.x + Math.cos(a) * 8, y, C0.z + Math.sin(a) * 8, { cam: true }); }
  box(w, 3, 0.6, 3, 0x9a9aaa, C0.x, y + 0.3, C0.z, { studs: true });
  // все четыре плиты зажглись — на камне в центре появляется звезда
  addPlates('forest-circle', [[C0.x + 4, C0.z], [C0.x - 4, C0.z], [C0.x, C0.z + 4], [C0.x, C0.z - 4]], () => addStar(save, 'forest-circle', C0.x, C0.z, y + 0.6));
}

// --- занятия ---
function camp(w) {
  const C0 = FOREST.camp, y = groundY(C0.x, C0.z);
  for (const [dx, col] of [[-5, 0xff7a3d], [5, 0x3fa7ff]]) {               // палатки: две наклонные стенки
    for (const sx of [-1, 1]) { const t = box(w, 0.3, 3.4, 4, col, C0.x + dx + sx * 0.95, y + 1.4, C0.z + 4, { studs: false }); t.rotation.z = sx * 0.55; }
    box(w, 1, 1.6, 0.1, 0x2b2b33, C0.x + dx, y + 0.8, C0.z + 2.05, { studs: false });
  }
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; box(w, 0.6, 0.4, 0.6, 0x8f8fa0, C0.x + Math.cos(a) * 1.2, y + 0.2, C0.z + Math.sin(a) * 1.2); }
  const fire = box(w, 0.9, 1, 0.9, 0xff8a1a, C0.x, y + 0.5, C0.z, { shadow: false });
  fire.material = new T.MeshBasicMaterial({ color: 0xffa020 });
  for (const [dx, dz, r] of [[-3, 0, 0], [3, 0, 0], [0, -3, Math.PI / 2]]) solid(w, r ? 3 : 0.9, 0.6, r ? 0.9 : 3, 0x8a5a2b, C0.x + dx, y, C0.z + dz);
  addBeaver(C0.x + 3, C0.z - 4);
}
function zipTower(w, save) {
  // вышка: лестница вокруг, наверху площадка, оттуда — канатка через лес к озеру
  const Z = FOREST.zipTower, y = groundY(Z.x, Z.z), H = 12;
  solid(w, 4, H, 4, 0xc98a45, Z.x, y, Z.z, { cam: true });
  solid(w, 4, 0.4, 4, 0xff5a5a, Z.x, y + H, Z.z);                         // площадка
  for (let i = 0; i <= H; i++) { const a = i * 0.5, sx = Z.x + Math.cos(a) * 3.3, sz = Z.z + Math.sin(a) * 3.3; solid(w, 2, 0.4, 2, i % 2 ? 0xa0622a : 0xc98a45, sx, y + i + 0.6, sz); }
  addStar(save, 'forest-zip', Z.x - 1, Z.z - 1, y + H + 0.4);
  const [e1, e2] = FOREST.zipEnds;
  addZip(new T.Vector3(Z.x + 1.2, y + H + 3, Z.z - 1.2), new T.Vector3(e1.x, groundY(e1.x, e1.z) + 3.2, e1.z));
  // вторая — с вершины горы вниз
  const M = FOREST.mountain, my = groundY(M.x + 2.5, M.z + 2.5);
  addZip(new T.Vector3(M.x + 2.5, my + 2.6, M.z + 2.5), new T.Vector3(e2.x, groundY(e2.x, e2.z) + 3.2, e2.z));
}
function ship(w, save) {
  const S = FOREST.ship, y = groundY(S.x, S.z);
  const by = hollow(w, S.x, y, S.z, 4.6, 4, 11, 0x7a4a24, 'x-', 3.4);   // корпус, вход сбоку
  solid(w, 4.6, by - y + 2, 11, 0x5a3a1a, S.x, y - 2, S.z);          // днище до земли — внутри ровный пол
  solid(w, 5, 0.6, 11.6, 0x5a3a1a, S.x, by + 4, S.z);
  solid(w, 3, 1.4, 3, 0x7a4a24, S.x, by + 4.6, S.z - 4.6);       // корма
  box(w, 0.5, 10, 0.5, 0x8a5a2b, S.x, by + 9, S.z, { studs: false });          // мачта
  box(w, 0.2, 5, 6, 0xf4f0e6, S.x + 0.4, by + 10, S.z, { studs: false });       // парус
  box(w, 0.1, 1.2, 2, 0x2b2b33, S.x, by + 14.4, S.z + 1, { studs: false });     // флаг
  addChest('forest-ship', S.x + 1, by, S.z + 3.5);
  addStar(save, 'forest-ship', S.x + 1, S.z - 3.5, by);
}

function buildForest(save) {
  const F = FOREST, w = group(scene), rnd = seeded(7);
  buildTerrain(w, { size: F.size, cell: 4, height: forestHeight, color: forestColor, cliff: 7, grass: 2600 });
  water(w, F.size, -0.35);
  // мосты через реку
  for (const z of [30, -20]) {
    const x = F.river(z);
    solid(w, 14, 0.5, 4, 0xa0622a, x, -0.4, z);
    for (const sz of [-1, 1]) for (let i = -3; i <= 3; i++) box(w, 0.25, 1, 0.25, 0x8a5a2b, x + i * 2, 0.6, z + sz * 1.9, { studs: false });
  }
  // портал домой и зелёный круг безопасности вокруг него
  portal(w, { x: F.spawn.x, z: F.spawn.z + 8, to: 'base', color: 0x9b6bff, label: '🏠 База', rot: Math.PI });
  level.safe = { x: F.spawn.x, z: F.spawn.z + 2, r: 12 };
  const ring = new T.Mesh(new T.RingGeometry(11.4, 12, 48), new T.MeshBasicMaterial({ color: 0x5fff7a, transparent: true, opacity: 0.6, side: T.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(level.safe.x, 0.56, level.safe.z); w.add(ring);
  addPad(F.spawn.x + 8, F.spawn.z - 6);

  defineNests('forest', [
    ...F.nests.map(([x, z, r, guard, s]) => ({ x, z, r, guard, s, zone: { kind: 'ring', x, z } })),
    { x: -52, z: 48, r: 3, guard: null, s: 1.2, every: 2 },          // на тайной поляне — без сторожа
    { x: FOREST.lake.x - 1, z: FOREST.lake.z - 2.5, r: 3, guard: null, every: 2 },   // на острове
    { x: F.gorilla.x, z: F.gorilla.z, r: 3, guard: 'gorilla', s: 1.3, pet: 'gorilla', zone: { kind: 'ring', x: F.gorilla.x, z: F.gorilla.z } },
    { x: FOREST.village.x - 7.5, z: FOREST.village.z - 10.2, y0: groundY(FOREST.village.x, FOREST.village.z) + 8, r: 4, guard: null, every: 3 },  // на домике на дереве
  ]);

  giantTree(w, save); windmill(w, save); fort(w, save); skyIsland(w, save); lookout(w, save); waterfall(w, save); hollowLog(w, save);
  lake(w, save); mushrooms(w, save); maze(w, save); stoneCircle(w, save); village(w, save);
  camp(w); zipTower(w, save); ship(w, save);
  addWell(FOREST.well.x, FOREST.well.z);
  // гонка через кольца на восточном лугу
  addRace('forest-race', FOREST.race, FOREST.race.rings, 40);
  for (const [x, z] of FOREST.digs) addDig(save, 'f' + x + '_' + z, x, z);
  // стрелки-ускорители: вдоль гонки и на длинных лугах
  for (const [x, z, a] of FOREST.arrows) addArrow(x, z, a);

  // тайная поляна: завал из брёвен в проходе, деревья и цветы внутри
  const G = F.glade;
  addDoor(save, { id: 'glade', x: G.x1 + 2, z: 48, look: 'logs', col: { x0: G.x1, x1: G.x1 + 4, z0: 44, z1: 52 } });
  for (const [x, z, s] of [[-60, 40, 1], [-44, 40, 1.1], [-60, 56, 1.2], [-46, 56, 0.9]]) tree(w, x, z, s, groundY(x, z));
  for (let i = 0; i < 16; i++) { const x = G.x0 + 2 + rnd() * 20, z = G.z0 + 2 + rnd() * 20; box(w, 0.3, 0.5, 0.3, [0xff5a8a, 0xffd93b, 0xffffff, 0x9b6bff][i % 4], x, groundY(x, z) + 0.25, z, { shadow: false }); }
  for (const [x, z] of [[-56, 44], [-48, 54]]) addLoose(x, z, 'wood');
  addStar(save, 'forest-glade', -46, 44);
  // в углу поляны — густые кусты (сквозь них можно пройти), свиток внутри
  for (const [dx, dz, h] of [[0, 0, 2.2], [1.6, 0.4, 1.8], [-1.2, 1.4, 2], [0.6, -1.5, 1.6], [-1.4, -0.8, 1.9]]) box(w, 2.4, h, 2.4, 0x3fae2a, -53 + dx, groundY(-53, 58) + h / 2, 58 + dz, { studs: true });
  addScroll(save, 'trap', -53, 58);

  // плато: забраться по верёвке, наверху домик, сундук и звезда
  const P = F.plateau, dx = -P.x / Math.hypot(P.x, P.z), dz = -P.z / Math.hypot(P.x, P.z);
  addHook(P.x + dx * (P.r + 3.5), P.z + dz * (P.r + 3.5), P.x + dx * (P.r - 3), P.h, P.z + dz * (P.r - 3));
  const hut = group(w, P.x, P.h, P.z);
  box(hut, 5, 3, 4, 0xc98a45, 0, 1.5, 0, { studs: true }); box(hut, 6, 0.6, 5, 0xff5a5a, 0, 3.3, 0, { studs: true });
  box(hut, 1.2, 2, 0.1, 0x6a3f1e, 0, 1, 2.01, { studs: false });
  addCollider({ x0: P.x - 2.5, x1: P.x + 2.5, y0: P.h, y1: P.h + 3, z0: P.z - 2, z1: P.z + 2, cam: true });
  addChest('forest-plateau', P.x + dx * 4, P.h, P.z + dz * 4);
  addStar(save, 'forest-plateau', P.x - dx * 5, P.z - dz * 5, P.h);
  addStar(save, 'forest-island', F.river(9), 9, 0);

  // деревья, ресурсы, камни, зверушки — не в реке, не у построек, не у гнёзд и не у портала
  const busy = [[F.plateau, P.r + 3], [F.bigTree, 9], [F.hill, 7], [F.fort, 13], [F.sky, 7], [F.log, 8], [F.mountain, 4], [F.cave, 6], [F.spawn, 13], [F.mush, 16], [F.village, 16], [F.circle, 12], [F.camp, 10], [F.zipTower, 8], [F.ship, 12], [F.well, 4], [F.race, 4], [F.gorilla, 9], ...FRIEND_HOMES('forest').map(o => [o, o.area || 5]),
    ...F.race.rings.map(([x, z]) => [{ x, z }, 5]), ...F.digs.map(([x, z]) => [{ x, z }, 3]), ...F.arrows.map(([x, z]) => [{ x, z }, 3]), ...F.zipEnds.map(o => [o, 4])];
  const free = (x, z, pad = 0) => {
    if (Math.max(Math.abs(x), Math.abs(z)) > F.edge - 6) return false;
    if (Math.hypot(x - F.lake.x, z - F.lake.z) < F.lake.r + 4) return false;
    if (x > F.maze.x0 - 5 && x < F.maze.x0 + F.maze.n * F.maze.cell + 5 && z > F.maze.z0 - 5 && z < F.maze.z0 + F.maze.n * F.maze.cell + 5) return false;
    if (Math.abs(x - F.river(z)) < 7 + pad) return false;
    if (busy.some(([o, r]) => near2(x, z, o, r))) return false;
    if (Math.abs(x - F.sky.x) < 5 && z > F.sky.z && z < F.sky.z + 38) return false;
    if (x > G.x0 - 6 && x < G.x1 + 6 && z > G.z0 - 6 && z < G.z1 + 6) return false;
    return !F.nests.some(([nx, nz]) => Math.hypot(x - nx, z - nz) < 7 + pad);
  };
  const KINDS = ['oak', 'oak', 'pine', 'pine', 'birch', 'apple'];
  for (let i = 0, n = 0; i < 900 && n < 110; i++) { const x = rnd() * 196 - 98, z = rnd() * 196 - 98; if (free(x, z, 1)) { tree(w, x, z, 0.8 + rnd() * 0.6, groundY(x, z), KINDS[Math.floor(rnd() * KINDS.length)]); n++; } }
  for (let i = 0, n = 0; i < 500 && n < 40; i++) { const x = rnd() * 196 - 98, z = rnd() * 196 - 98; if (free(x, z)) { addLoose(x, z, n % 3 ? 'wood' : 'stone'); n++; } }
  for (let i = 0, n = 0; i < 200 && n < 6; i++) { const x = rnd() * 196 - 98, z = rnd() * 196 - 98; if (free(x, z, 2)) { addRock(x, z, 'boulder', n === 0); n++; } }
  for (let i = 0, n = 0; i < 500 && n < 30; i++) { const x = rnd() * 196 - 98, z = rnd() * 196 - 98; if (free(x, z)) { addLoose(x, z, 'leaf'); n++; } }
  const kinds = ['bunny', 'bunny', 'squirrel', 'deer', 'hedgehog'];
  for (let i = 0, n = 0; i < 500 && n < 14; i++) { const x = rnd() * 190 - 95, z = rnd() * 190 - 95; if (free(x, z)) { addCritter(kinds[n % kinds.length], x, z, { x, z, r: 9 }); n++; } }
  for (const [z0, len] of [[-60, 30], [-10, 25], [36, 20]]) addDuck(F.river, z0, len);
  for (let i = 0, n = 0; i < 400 && n < 12; i++) { const x = rnd() * 190 - 95, z = rnd() * 190 - 95; if (free(x, z)) { addButterfly(x, z); n++; } }
  // поляны цветов и грибы
  for (let i = 0; i < 260; i++) {
    const x = rnd() * 196 - 98, z = rnd() * 196 - 98; if (!free(x, z)) continue;
    const y = groundY(x, z);
    if (i % 6) box(w, 0.3, 0.5, 0.3, [0xff5a8a, 0xffd93b, 0xffffff, 0x9b6bff][i % 4], x, y + 0.25, z, { shadow: false });
    else { box(w, 0.25, 0.5, 0.25, 0xffffff, x, y + 0.25, z, { shadow: false }); box(w, 0.8, 0.3, 0.8, 0xff4a4a, x, y + 0.65, z, { shadow: false }); }
  }
  clouds(w, 10);
  return w;
}
export const STARS_IN = { forest: 19, autumn: 6, winter: 10 };

// ================= СПИСОК =================
export const LOCS = {
  school: { name: 'Школа', icon: '🏫', build: (save, profile) => buildSchool(save, profile), spawn: SCHOOL.spawn, sky: 0xa8dcff },
  bunker: { name: 'Бункер', icon: '🛡️', build: (save, profile) => buildBunkerLoc(save, profile), spawn: BUNKER_SPAWN, sky: 0x1e1812 },
  secret: { name: 'Тайная комната', icon: '🏮', build: (save, profile) => buildSecret(save, profile), spawn: SECRET.spawn, sky: 0x2a2850 },
  winter: { name: 'Зима', icon: '⛄', build: buildWinter, spawn: { x: WINTER.spawn.x, z: WINTER.spawn.z, face: Math.PI }, sky: 0xcfe6f7 },
  autumn: { name: 'Осень', icon: '🍂', build: buildAutumn, spawn: { x: AUTUMN.spawn.x, z: AUTUMN.spawn.z, face: Math.PI }, sky: 0xffcf9a },
  track: { name: 'Дорожка', icon: '🏁', build: buildTrack, spawn: { x: 0, z: 6, face: Math.PI }, sky: 0xbfe6ff },
  home: { name: 'Дом', icon: '🏠', build: (save, profile) => buildHome(save, profile), spawn: { x: 0, z: 5.5, face: Math.PI }, sky: 0xbfe6ff },
  loft: { name: 'Дом, 2 этаж', icon: '🏠', build: (save, profile) => buildLoft(save, profile), spawn: { x: -6, z: 0, face: Math.PI / 2 }, sky: 0xbfe6ff },
  base: { name: 'База', icon: '🏠', build: buildBase, spawn: { x: 0, z: 34, face: Math.PI }, sky: 0x8fd3ff },
  forest: { name: 'Лес', icon: '🌲', req: B.REQ.forest, build: buildForest, spawn: { x: FOREST.spawn.x, z: FOREST.spawn.z, face: Math.PI }, sky: 0x9fdcff },
  desert: {
    name: 'Пустыня', icon: '🏜️', req: B.REQ.desert, sky: 0xffe2a8, spawn: { x: 0, z: 4, face: Math.PI },
    build: () => buildCorridor({ id: 'desert', floor: 0xf6a623, wall: 0x9c4a1c, band: 0xff3b1a, top: 0xffd23f,
      nests: [[-6, -14, 2, 'lizard'], [6, -28, 2, 'capy'], [-6, -44, 3, 'lizard'], [6, -58, 3, 'capy'], [-5, -74, 4, 'lizard'], [0, -90, 5, 'lizard', 1.5]],
      rocks: [[4, -24, false]] }),
  },
  ice: {
    name: 'Лёд', icon: '❄️', req: B.REQ.ice, sky: 0xd6f0ff, spawn: { x: 0, z: 4, face: Math.PI },
    build: () => buildCorridor({ id: 'ice', floor: 0xbfe9ff, wall: 0x6fa8dc, band: 0xffffff, top: 0xe8f8ff,
      nests: [[-6, -14, 3, 'peng'], [6, -30, 4, 'bear'], [-6, -46, 4, 'peng'], [6, -62, 5, 'bear'], [0, -90, 6, 'bear', 1.6]],
      loose: [[-4, -40, 'crystal'], [5, -75, 'crystal']], rocks: [[-4, -20, true]] }),
  },
};
// куда ставить героя на базе, когда он вернулся из локации
export const backFrom = id => id === 'home' ? { x: HOUSE.door.x, z: HOUSE.door.z - 2.4, face: Math.PI } : BASE_PORTALS[id] !== undefined ? { x: BASE_PORTALS[id], z: 0, face: 0 } : { x: 0, z: 0, face: 0 };
// все гнёзда описываются сразу — их таймеры идут, даже если в локации ни разу не были
export function defineAllNests() {
  // (гнездо в пещере переехало: в бывшей пещере теперь портал в Осеннюю долину)
}
export { PEN };

// ---------- карта (🗺️): что где находится. Координаты — те же, что у построек ----------
// bounds — какую часть рисовать; areas — подложки (rect/circle), marks — значки мест; river — русло (в лесу)
export function mapData(id) {
  const F = FOREST;
  if (id === 'base') return {
    bounds: { x0: -70, x1: 50, z0: -10, z1: 214 }, ground: '#7fd86a',
    areas: [
      { rect: [-46, 46, -6, 66], fill: '#8fe07a' },
      { rect: [-30, -8, 16, 40], fill: '#c8e88a' }, { rect: [8, 30, 16, 40], fill: '#c8e88a' },
      { rect: [-46, 46, 66, 106], fill: '#8fe07a' }, { rect: [-66, 10, 106, 213], fill: '#7fd06a' }, { rect: [-48, -12, 182, 208], fill: '#c8e88a' }, { rect: [-66, 10, 145, 147.5], fill: '#7fd4ff' }, { rect: [-8, 38, 74, 102], fill: '#7fd4ff' }, { rect: [-29, -19, 81, 91], fill: '#3fa7ff' },
      { rect: [30.6, 45, 2.4, 41.4], fill: '#f3dfa8' }, { rect: [-46, 46, -4.8, 2.4], fill: '#efe2b8' }, { rect: [-3, 3, 2.4, 67], fill: '#efe2b8' }, { rect: [-39.2, 3, 67, 69.4], fill: '#efe2b8' }, { rect: [-39.2, -36.8, 69.4, 106], fill: '#efe2b8' }, { rect: [-45, 45, 41.4, 44.4], fill: '#efe2b8' },
    ],
    marks: [
      ['🍂', 'Осень', BASE_PORTALS.autumn, -6], ['⛄', 'Зима', BASE_PORTALS.winter, -6], ['🏜️', 'Пустыня', BASE_PORTALS.desert, -6], ['🌲', 'Лес', 0, -6], ['❄️', 'Лёд', BASE_PORTALS.ice, -6], ['🏫', 'Школа', BASE_PORTALS.school, -6], ['🏁', 'Дорожка', BASE_PORTALS.track, -6],
      ['🐣', 'Загон', -19, 28], ['🛒', 'Магазин', 8, 52], ['🔨', 'Верстак', WORKBENCH.x, WORKBENCH.z], ['👟', 'Тренировка', TREADMILL.x, TREADMILL.z],
      ['📬', 'Почта', 5, 30], ['🗼', 'Башня', TOWER.x, TOWER.z], ['🎠', 'Детская площадка', 38, 15], ['🏠', 'Мой дом', HOUSE.x, HOUSE.z], ['👕', 'Одежда', CLOTHES_SHOP.x, CLOTHES_SHOP.z], ['🥅', 'Футбол', -35, 9], ['🎢', 'Аквапарк', -24, 86], ['🏡', 'Дача', -36, 198], ['🌳', 'Дорога на дачу', -30, 140], ['🏊', 'Бассейн', 15, 88],
    ],
  };
  if (id === 'forest') return {
    bounds: { x0: -100, x1: 100, z0: -100, z1: 100 }, ground: '#6fcf5a', river: F.river,
    areas: [
      { circle: [F.mountain.x, F.mountain.z, F.mountain.r], fill: '#9fbf86' }, { circle: [F.plateau.x, F.plateau.z, F.plateau.r], fill: '#b08a5a' },
      { circle: [F.lake.x, F.lake.z, F.lake.r], fill: '#4aa8f0' }, { circle: [F.lake.x, F.lake.z, F.lake.island], fill: '#8fe07a' },
      { rect: [F.maze.x0, F.maze.x0 + F.maze.n * F.maze.cell, F.maze.z0, F.maze.z0 + F.maze.n * F.maze.cell], fill: '#3f9a3a' },
      { rect: [F.glade.x0, F.glade.x1, F.glade.z0, F.glade.z1], fill: '#a8e890' },
    ],
    marks: [
      ['🌀', 'На базу', F.spawn.x, F.spawn.z + 8], ['🌳', 'Дерево-великан', F.bigTree.x, F.bigTree.z], ['⛰️', 'Гора', F.mountain.x, F.mountain.z],
      ['🏡', 'Мельница', F.hill.x, F.hill.z], ['🏰', 'Крепость', F.fort.x, F.fort.z], ['☁️', 'Остров в небе', F.sky.x, F.sky.z], ['🪨', 'Плато', F.plateau.x, F.plateau.z],
      ['🪵', 'Бревно', F.log.x, F.log.z], ['🕳️', 'Пещерка', F.cave.x, F.cave.z], ['🍄', 'Грибы', F.mush.x, F.mush.z], ['🌿', 'Лабиринт', F.maze.x0 + 14, F.maze.z0 + 14],
      ['🏘️', 'Деревня', F.village.x, F.village.z], ['🗿', 'Камни', F.circle.x, F.circle.z], ['🦍', 'Горилла', F.gorilla.x, F.gorilla.z], ['⛺', 'Лагерь', F.camp.x, F.camp.z], ['🚡', 'Канатка', F.zipTower.x, F.zipTower.z],
      ['🏴‍☠️', 'Корабль', F.ship.x, F.ship.z], ['🪙', 'Колодец', F.well.x, F.well.z], ['⭕', 'Гонка', F.race.x, F.race.z], ['💧', 'Озеро', F.lake.x, F.lake.z + F.lake.r - 3],
      ['🌼', 'Тайная поляна', (F.glade.x0 + F.glade.x1) / 2, (F.glade.z0 + F.glade.z1) / 2], ['🟥', 'Цветные плиты', -33, 51],
    ],
  };
  if (id === 'autumn') { const U = AUTUMN; return {
    bounds: { x0: -72, x1: 72, z0: -72, z1: 72 }, ground: '#d9b048',
    areas: [
      { circle: [U.pond.x, U.pond.z, U.pond.r], fill: '#4a9fd8' }, { circle: [U.pond.x, U.pond.z, U.pond.island], fill: '#ccae44' },
      { circle: [U.fair.x, U.fair.z, U.fair.r], fill: '#e8cc8a' }, { rect: [U.patch.x0, U.patch.x1, U.patch.z0, U.patch.z1], fill: '#8a5a2b' },
      { rect: [U.orchard.x0, U.orchard.x1, U.orchard.z0, U.orchard.z1], fill: '#e0a040' }, { circle: [U.rocks.x, U.rocks.z, 11], fill: '#b5aa9a' },
    ],
    marks: [
      ['🌀', 'На базу', U.spawn.x, U.spawn.z + 8], ['🎡', 'Колесо', U.wheel.x, U.wheel.z], ['🎪', 'Ярмарка', U.fair.x - 8, U.fair.z + 8], ['💧', 'Пруд', U.pond.x, U.pond.z + U.pond.r - 2],
      ['🎃', 'Грядка', (U.patch.x0 + U.patch.x1) / 2, (U.patch.z0 + U.patch.z1) / 2], ['🏠', 'Домик-тыква', U.house.x, U.house.z], ['🍎', 'Сад', (U.orchard.x0 + U.orchard.x1) / 2, (U.orchard.z0 + U.orchard.z1) / 2],
      ['🛝', 'Горка', U.slide.x, U.slide.z], ['🎳', 'Боулинг', (U.bowl.x0 + U.bowl.x1) / 2, U.bowl.z0 - 2], ['🍁', 'Большой клён', U.maple.x, U.maple.z], ['💎', 'Кристаллы', U.rocks.x, U.rocks.z],
      ...U.piles.map(([x, z]) => ['🍂', '', x, z]),
    ],
  }; }
  if (id === 'track') return {
    bounds: { x0: -26, x1: 26, z0: -190, z1: 22 }, ground: '#7fd86a', rotate: 'landscape',   // лёжа — только на горизонтальном экране
    areas: [{ rect: [-7, 7, -184, 16], fill: '#e0784a' }, { rect: [-7, 7, -7.2, -4.8], fill: '#ffe14d' }],
    marks: [['🏠', 'База', 0, 12], ['🏁', 'Твоя линия', 0, -6], ['🏰', 'Логово', 0, -180]],
  };
  return null;
}
