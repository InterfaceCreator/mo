// Пиратская бухта ⚓ — общее для всех её модулей: где что лежит, прилив/отлив, сохранение, «день» для ежедневных штук.
// Бухта — продолжение базы на запад (за воротами в западной стене, у домика):
//   🌿 Луг (x −130…−66) → 🏖️ пляж (−170…−130) → отмель (−190…−170, в отлив сухая) → склон (−200…−190) → 🌊 море (−360…−200)
// Север (z 114…130) — скалы с пещерой (вход открыт только в отлив), юг (z −40) — каменная гряда.
import { T, group, box } from './engine.js';
import { addCollider } from './world.js';

export const COVE = { z0: -40, z1: 130, gate: { x: -66, z: 43 }, meadow: { x0: -130, x1: -66 }, beach: { x0: -170, x1: -130 }, flat: { x0: -190, x1: -170 }, shelf: { x0: -200, x1: -190 }, sea: { x0: -360, x1: -200 } };
export const SHORE = -168;                                       // западнее — море (можно плыть)
export const FLAT_Y = -0.8, SHELF_Y = -3, DEEP_Y = -7;          // верх отмели, склона и морского дна
export const ISLE_Y = 0.3, ISLE_RIM = -0.5;                      // верх острова и его песчаной кромки (чтобы выйти из воды)
// острова: маяк, кокосовый, крабий (к нему в отлив — по песчаной косе)
export const ISLES = { light: { x: -252, z: 8, r: 9 }, coco: { x: -305, z: 78, r: 8 }, crab: { x: -206, z: 96, r: 6.5 } };
export const SANDBAR = { x0: -201, x1: -189, z0: 93.5, z1: 98.5 };
export const PIER = { x0: -197, x1: -165, z0: 41.5, z1: 44.5, y: 0.5 };
export const MOOR = { x: -194, z: 37.5, face: -Math.PI / 2 };   // где стоит корабль (нос — на запад, в море)
// пещера в скалах: B — подземное озеро (запад), A — вход (с отмели, только в отлив), C — зал факелов, D — сокровищница за тайной дверью
export const CAVE = { x0: -198, x1: -134, z0: 116, z1: 128, mouth: { x0: -182, x1: -178, z: 115 }, lake: { x0: -197, x1: -191, z0: 118, z1: 126 }, door: { x: -150.5, z0: 120, z1: 124 } };
export const WRECK = { x: -230, z: 60 };
export const FORT = { x: -161, z: 2 };
export const CASTLE = { x0: -153, z0: 66, n: 8, s: 1.2 };       // песочница для замка: 8×8 клеток, море — с запада (i = 0)
export const CAPTAIN = { x: -169, z: 40 };
// кто играет: 'mama' | 'motya' — пасхалки для мамы (mamanotes.js) только в её профиле
export let WHO = null;
export const setWho = p => { WHO = p; };
export const BOUNDS = { x0: -355, x1: -66, z0: -36, z1: 126 };   // куда можно уплыть

// ---------- прилив и отлив: круг 5 минут, одинаковый у всех ----------
export const SEA_HI = -0.1, SEA_LO = -1.25, TIDE_PERIOD = 300;
const tideK = (now = Date.now()) => 0.5 + 0.5 * Math.cos(now / 1000 / TIDE_PERIOD * Math.PI * 2);   // 1 — полная вода
export const seaLevel = (now) => SEA_LO + (SEA_HI - SEA_LO) * tideK(now);
export const LOW_AT = -0.95;                                      // ниже — отлив: открыта пещера, сухая отмель
export const lowTide = () => seaLevel() < LOW_AT;
// сколько секунд до смены (отлив ↔ прилив)
export function tideLeft() {
  const low = lowTide(); let t = 0; const now = Date.now();
  while (t < TIDE_PERIOD && (seaLevel(now + t * 1000) < LOW_AT) === low) t += 2;
  return t;
}

// высота дна (или земли) в точке — для корабля и «можно ли тут плыть»
const inR = (x, z, c, r) => Math.hypot(x - c.x, z - c.z) < r;
export function floorAt(x, z) {
  for (const k in ISLES) { const I = ISLES[k]; if (inR(x, z, I, I.r)) return ISLE_Y; if (inR(x, z, I, I.r + 1.6)) return ISLE_RIM; }
  if (x > SANDBAR.x0 && x < SANDBAR.x1 && z > SANDBAR.z0 && z < SANDBAR.z1) return FLAT_Y;
  if (inR(x, z, { x: WRECK.x + 4, z: WRECK.z + 1 }, 1.8)) return 4;   // мачта затонувшего корабля торчит из воды — корабль её обходит
  if (x > PIER.x0 - 0.5 && x < PIER.x1 && z > PIER.z0 - 0.5 && z < PIER.z1 + 0.5) return PIER.y;
  if (x > COVE.flat.x1) return 0;
  if (x > COVE.shelf.x1) return FLAT_Y;
  if (x > COVE.sea.x1) return SHELF_Y;
  return DEEP_Y;
}
export const inSeaArea = p => p.x < SHORE && p.x > BOUNDS.x0 - 4 && p.z > COVE.z0 && p.z < COVE.z1;

// ---------- сохранение ----------
export const today = () => new Date().toDateString();
export const dayRand = salt => { let s = 11; for (const ch of today() + salt) s = (s * 31 + ch.charCodeAt(0)) % 2147483647; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
export function coveSave(save) {
  const c = save.cove || (save.cove = {});
  c.inv ||= { plank: 0, rope: 0, cloth: 0, log: 0 }; c.stage ||= 0;
  if (c.day !== today()) { c.day = today(); c.got = {}; }      // ежедневное: доски, бутылки, бочки, сундуки, жемчуг, кокосы, клад
  c.got ||= {};
  return c;
}
// постройка корабля: что нужно на каждый этап
export const STAGES = [
  { id: 'hull', icon: '🛶', name: 'Корпус', need: { plank: 5 } },
  { id: 'deck', icon: '🪜', name: 'Палуба и штурвал', need: { plank: 4, rope: 2 } },
  { id: 'mast', icon: '🪵', name: 'Мачта', need: { log: 1, rope: 2 } },
  { id: 'sail', icon: '⛵', name: 'Парус и флаг', need: { cloth: 3 } },
];
export const MAT = { plank: ['🪵', 'доска', 'на берегу, у самой воды'], rope: ['🪢', 'верёвка', 'в лужицах на отмели и на Крабьем острове'], cloth: ['🧵', 'ткань', 'в бочках — стреляй из пушки 💣; бывает в бутылках'], log: ['🌲', 'бревно', 'в пещере — она открывается в отлив 🏖️'] };
export const canBuild = c => { const S = STAGES[c.stage]; return !!S && Object.entries(S.need).every(([k, n]) => (c.inv[k] || 0) >= n); };

// ---------- кусочки для постройки ----------
export function seeded(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
export function palm(g, x, z, s = 1, y = 0) {
  const p = group(g, x, y, z), lean = Math.sin(x * 3.1 + z) * 0.5;
  for (let i = 0; i < 6; i++) box(p, 0.55 * s, 1.0 * s, 0.55 * s, i % 2 ? 0x9a6a3c : 0x8a5a2b, lean * i * 0.12 * s, (0.5 + i) * s, 0);
  const top = group(p, lean * 0.72 * s, 6 * s, 0);
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, lf = box(top, 3.2 * s, 0.12, 0.9 * s, k % 2 ? 0x3fae3a : 0x2e9a2e, Math.cos(a) * 1.4 * s, -0.25, Math.sin(a) * 1.4 * s); lf.rotation.y = -a; lf.rotation.z = -0.35; }
  addCollider({ x0: x - 0.4, x1: x + 0.4, z0: z - 0.4, z1: z + 0.4, y0: y, y1: y + 6 * s });
  return { g: p, top };
}
// камень-глыба из нескольких кубиков
export function rock(g, x, z, s = 1, y = 0, color = 0x8a8f9a, collide = true) {
  box(g, 2.2 * s, 1.4 * s, 1.8 * s, color, x, y + 0.7 * s, z); box(g, 1.4 * s, 0.9 * s, 1.3 * s, 0x9aa0aa, x + 0.4 * s, y + 1.6 * s, z - 0.2 * s);
  if (collide) addCollider({ x0: x - 1.1 * s, x1: x + 1.1 * s, z0: z - 0.9 * s, z1: z + 0.9 * s, y0: y, y1: y + 2 * s });
}
export const V3 = (x, y, z) => new T.Vector3(x, y, z);
