// Строения на базе: участки с табличкой «Продаётся»; купил — на участке появляется постройка, дальше — уровни.
// Встал на плиту перед участком — открылось окно строения.
import { T, scene, group, box } from './engine.js';
import { addCollider, onLevelReset } from './world.js';
import { makeLabel } from './fx.js';
import { B } from './balance.js';

// x, z — центр участка 6×6; плита — с той стороны, откуда подходят (face: 'z+' — к югу, 'x+' — к востоку…)
export const PLOTS = [
  { id: 'bank', x: -20, z: 7, face: 'z+', icon: '🏦', name: 'Копилка', what: 'питомцы зарабатывают, даже пока игра закрыта' },
  { id: 'feeder', x: 20, z: 7, face: 'z+', icon: '🌾', name: 'Кормушка', what: 'сытые питомцы приносят больше монет' },
  { id: 'hatchery', x: -10, z: 7, face: 'z+', icon: '🔥', name: 'Инкубаторная', what: 'яйца вылупляются быстрее' },
  { id: 'beacon', x: 10, z: 7, face: 'z+', icon: '🗼', name: 'Маяк удачи', what: 'чаще попадаются особые и редкие яйца' },
  { id: 'fusion', x: -20, z: 50, face: 'z-', icon: '🔮', name: 'Машина слияния', what: '3 одинаковых питомца → 1 большой, 3 больших → золотой, 3 золотых → радужный' },
  { id: 'stadium', x: -38, z: 36, face: 'x+', icon: '🏟️', name: 'Стадион', what: 'беговая дорожка тренирует быстрее' },
  { id: 'fountain', x: 14, z: 61, face: 'z-', icon: '⛲', name: 'Фонтан', what: 'красиво! и +2% к доходу питомцев' },
  { id: 'flowers', x: -12, z: 61, face: 'z-', icon: '🌷', name: 'Клумба', what: 'красиво! и +2% к доходу питомцев' },
  { id: 'statue', x: 30, z: 61, face: 'z-', icon: '🗽', name: 'Золотая статуя', what: 'очень красиво! и +5% к доходу питомцев' },
];
const FACE = { 'z+': [0, 4.6], 'z-': [0, -4.6], 'x+': [4.6, 0], 'x-': [-4.6, 0] };
export const padOf = pl => ({ x: pl.x + FACE[pl.face][0], z: pl.z + FACE[pl.face][1] });

// что даёт уровень lv (для окна строения); lv = 0 — ещё не куплено
export function effectText(id, lv) {
  const D = B.BUILD[id];
  if (lv <= 0) return '';
  switch (id) {
    case 'bank': return `копит доход ${D.hours[lv - 1] < 1 ? D.hours[lv - 1] * 60 + ' минут' : D.hours[lv - 1] + ' ч'}, пока тебя нет`;
    case 'feeder': return `+${Math.round(D.bonus * lv * 100)}% к доходу`;
    case 'hatchery': return `вылупление быстрее на ${Math.round(D.faster * lv * 100)}%`;
    case 'beacon': return `особые яйца в ${(1 + D.luck * lv).toFixed(2).replace(/0$/, '')} раза чаще`;
    case 'stadium': return `дорожка тренирует в ${D.train[lv - 1]} раза быстрее`;
    case 'fusion': return 'сливай питомцев 🔮';
    default: return `+${Math.round(D.deco * 100)}% к доходу`;
  }
}

// ---------- постройки ----------
const built = [];
onLevelReset(() => { built.length = 0; });
function looks(g, id) {
  switch (id) {
    case 'bank':
      box(g, 4.4, 3, 4.4, 0xffd23f, 0, 1.5, 0, { studs: true }); box(g, 5, 0.6, 5, 0xc98a00, 0, 3.3, 0);
      box(g, 1.6, 0.3, 0.4, 0x3a2a10, 0, 3.75, 0, { shadow: false });                       // щель для монет
      box(g, 1.2, 1.9, 0.1, 0x8a5a2b, 0, 0.95, 2.21, { studs: false }); break;
    case 'feeder':
      box(g, 5, 0.9, 2.4, 0xa0622a, 0, 0.45, 0, { studs: true }); box(g, 4.6, 0.3, 2, 0xffe14d, 0, 1, 0);
      for (const sx of [-1, 1]) box(g, 0.3, 2.6, 0.3, 0x8a5a2b, sx * 2.3, 1.3, 1.1); box(g, 5.4, 0.4, 3, 0xff5a5a, 0, 2.7, 0.3, { studs: true }); break;
    case 'hatchery':
      box(g, 4.4, 2.8, 4.4, 0xff9f40, 0, 1.4, 0, { studs: true }); box(g, 3, 2, 3, 0xff6a3d, 0, 3.8, 0, { studs: true });
      box(g, 1.6, 1.4, 0.6, 0xffe14d, 0, 5.3, 0, { studs: false });                          // «пламя» на крыше
      box(g, 1.4, 1.2, 0.1, 0xffe14d, 0, 1, 2.21, { studs: false }); break;
    case 'beacon':
      box(g, 3, 9, 3, 0xffffff, 0, 4.5, 0, { studs: true }); for (let i = 0; i < 3; i++) box(g, 3.05, 0.8, 3.05, 0xff5a5a, 0, 1.5 + i * 3, 0, { studs: true });
      box(g, 2.2, 1.4, 2.2, 0xffe14d, 0, 9.7, 0).material = new T.MeshBasicMaterial({ color: 0xfff3a0 }); break;
    case 'fusion':
      box(g, 4.4, 1, 4.4, 0x6a5a86, 0, 0.5, 0, { studs: true }); box(g, 3, 2.6, 3, 0x9b6bff, 0, 2.3, 0, { studs: true });
      box(g, 1.8, 1.8, 1.8, 0xff7ae0, 0, 4.4, 0).material = new T.MeshBasicMaterial({ color: 0xffa8f0 }); break;
    case 'stadium':
      for (let i = 0; i < 3; i++) box(g, 5, 0.8, 1.4, [0x3fa7ff, 0xffffff, 0x3fa7ff][i], 0, 0.4 + i * 0.8, -1.4 + i * 1.3, { studs: true });
      for (const sx of [-1, 1]) box(g, 0.3, 4, 0.3, 0xdddddd, sx * 2.4, 2, 1.8); box(g, 5.2, 1, 0.2, 0xff5a5a, 0, 3.6, 1.8, { studs: false }); break;
    case 'fountain':
      box(g, 5, 0.8, 5, 0xb9b9c8, 0, 0.4, 0, { studs: true }); box(g, 4.2, 0.2, 4.2, 0x3fa7ff, 0, 0.75, 0, { studs: false });
      box(g, 1, 2, 1, 0xb9b9c8, 0, 1.8, 0); box(g, 2.2, 0.3, 2.2, 0xb9b9c8, 0, 2.9, 0); box(g, 0.6, 0.8, 0.6, 0x7fd4ff, 0, 3.4, 0, { studs: false }); break;
    case 'flowers':
      box(g, 5, 0.5, 5, 0x7a4a24, 0, 0.25, 0, { studs: true });
      for (let i = 0; i < 16; i++) { const x = (i % 4 - 1.5) * 1.1, z = (Math.floor(i / 4) - 1.5) * 1.1; box(g, 0.2, 0.7, 0.2, 0x3fae2a, x, 0.85, z, { shadow: false }); box(g, 0.5, 0.4, 0.5, [0xff5a8a, 0xffd93b, 0xffffff, 0x9b6bff][i % 4], x, 1.35, z, { shadow: false }); } break;
    case 'statue':
      box(g, 3.6, 1.2, 3.6, 0xb9b9c8, 0, 0.6, 0, { studs: true });
      const gold = new T.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x553300 });
      for (const [w, h, d, y, x] of [[1.6, 2, 1, 2.2, 0], [0.6, 2, 0.6, 2.2, -1.1], [0.6, 2, 0.6, 2.2, 1.1], [1.2, 1.2, 1.2, 3.8, 0], [1.4, 0.4, 1.4, 4.5, 0], [0.6, 2.6, 0.6, 1.8, 0.4]]) box(g, w, h, d, 0xffd23f, x, y, 0).material = gold;
      break;
  }
}
// save.build — уровни строений
export function buildPlots(save) { for (const pl of PLOTS) buildPlot(save, pl); }
// после покупки или улучшения — участок перестраивается на месте
export function refreshPlot(save, id) {
  const i = built.findIndex(b => b.pl.id === id); if (i < 0) return;
  const b = built[i]; for (const o of [b.g, b.label, b.pad]) scene.remove(o);
  built.splice(i, 1); buildPlot(save, b.pl, b.solid);
}
function buildPlot(save, pl, solid = false) {
  {
    const lv = save.build?.[pl.id] || 0, g = group(scene, pl.x, 0, pl.z), pad = padOf(pl);
    const label = makeLabel(5.4, 1.35); label.position.set(pl.x, 7.4, pl.z); scene.add(label);
    if (lv) { looks(g, pl.id); if (!solid) addCollider({ x0: pl.x - 2.5, x1: pl.x + 2.5, y0: 0, y1: 3, z0: pl.z - 2.5, z1: pl.z + 2.5 }); solid = true; }
    else {
      // пустой участок: колышки по углам и табличка
      box(g, 6, 0.06, 6, 0xc9b98a, 0, 0.03, 0, { shadow: false });
      for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) box(g, 0.3, 1, 0.3, 0xffffff, dx, 0.5, dz, { studs: false });
      box(g, 0.25, 1.8, 0.25, 0x8a5a2b, 0, 0.9, 0, { studs: false }); box(g, 2.4, 1.2, 0.15, 0xf6deac, 0, 1.9, 0, { studs: false });
    }
    label.userData.set(lv ? `${pl.icon} ${pl.name}${B.BUILD[pl.id].max > 1 ? ' · ' + lv : ''}` : `${pl.icon} Продаётся`, { color: lv ? '#ffffff' : '#ffe14d' });
    const padMesh = box(scene, 2.6, 0.12, 2.2, lv ? 0x9b6bff : 0xffd23f, pad.x, 0.06, pad.z, { shadow: false });
    built.push({ pl, g, label, pad: padMesh, solid });
  }
}
export const onPlotPad = p => p.y < 0.5 ? PLOTS.find(pl => { const d = padOf(pl); return Math.abs(p.x - d.x) < 1.4 && Math.abs(p.z - d.z) < 1.2; }) || null : null;

// ---------- почтовый ящик с ежедневным подарком ----------
export const MAILBOX = { x: 5, z: 30 };
const mail = { flag: null, label: null };
onLevelReset(() => { mail.flag = mail.label = null; });
export function buildMailbox() {
  const g = group(scene, MAILBOX.x, 0, MAILBOX.z);
  box(g, 0.3, 1.4, 0.3, 0x8a5a2b, 0, 0.7, 0, { studs: false }); box(g, 1.2, 0.9, 1.6, 0x3fa7ff, 0, 1.8, 0, { studs: true });
  mail.flag = box(g, 0.1, 0.6, 0.5, 0xff3b3b, 0.65, 2.2, -0.3, { studs: false });
  addCollider({ x0: MAILBOX.x - 0.7, x1: MAILBOX.x + 0.7, y0: 0, y1: 2.3, z0: MAILBOX.z - 0.9, z1: MAILBOX.z + 0.9 });
  mail.label = makeLabel(3.6, 0.9); mail.label.position.set(MAILBOX.x, 3.4, MAILBOX.z); scene.add(mail.label);
}
// ready — подарок ждёт; left — сколько секунд до следующего
export function updateMailbox(ready, left) {
  if (!mail.label) return;
  mail.flag.visible = ready; mail.flag.rotation.z = ready ? Math.sin(performance.now() / 200) * 0.3 : 0;
  mail.label.userData.set(ready ? '📬 Подарок!' : `📪 ${Math.floor(left / 3600)} ч ${Math.floor(left % 3600 / 60)} мин`, { color: ready ? '#ffe14d' : '#ffffff' });
}
export const nearMailbox = p => Math.hypot(p.x - MAILBOX.x, p.z - MAILBOX.z) < 2.2 && p.y < 0.5;
