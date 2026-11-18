// Мебель дома 🛋️, питомцы дома 🐾 и полка трофеев 🏆.
// В комнате 7 мест под мебель: перед каждым — круглая кнопка на полу. Встал на неё — выбираешь, что поставить сюда
// (купить, переставить с другого места или убрать). Батут подбрасывает, на пианино играет музыка, в телевизоре мультики,
// в аквариуме плавают рыбки. У лежанки под окном выбираешь до трёх любимых питомцев — они сидят на ней и смотрят на тебя
// (по комнате не бегают, чтобы не путаться под ногами).
import { T, scene, group, box, mat, dampAngle } from './engine.js';
import { addCollider, onLevelReset } from './world.js';
import { animateAnimal } from './animals.js';
import { makeLabel, puff, confetti } from './fx.js';
import { buildPet, petName, modelThumb } from './pets.js';
import { openOv } from './ui.js';

// w, d — сколько места занимает (по x и по z, если смотрит вперёд); h — высота (для столкновений)
export const FURNITURE = [
  { id: 'plant', icon: '🪴', name: 'Большой цветок', price: 150, w: 1.4, d: 1.4, h: 2.4, build: g => { box(g, 1.1, 0.9, 1.1, 0xc85a3a, 0, 0.45, 0); for (const [x, y, z, s] of [[0, 1.4, 0, 0.8], [-0.4, 1.8, 0.2, 0.6], [0.4, 1.9, -0.2, 0.6], [0, 2.3, 0, 0.5]]) box(g, s, s, s, 0x3fae2a, x, y, z); } },
  { id: 'lamp', icon: '🌙', name: 'Ночник-луна', price: 250, w: 1.2, d: 1.2, h: 2.6, build: g => { box(g, 0.8, 0.12, 0.8, 0x555a6a, 0, 0.06, 0); box(g, 0.12, 2, 0.12, 0x555a6a, 0, 1, 0); box(g, 0.9, 0.9, 0.5, 0xfff0a0, 0, 2.3, 0).material = mat(0xfff0a0, { emissive: 0x806000 }); box(g, 0.5, 0.9, 0.52, 0x2b2b3a, 0.3, 2.3, 0); } },
  { id: 'toys', icon: '🧸', name: 'Ящик с игрушками', price: 300, w: 2.4, d: 1.6, h: 1.4, build: g => {
    box(g, 2.2, 1, 1.4, 0xff7ac8, 0, 0.5, 0); box(g, 2.3, 0.15, 1.5, 0xffffff, 0, 1.05, 0);
    box(g, 0.6, 0.7, 0.5, 0x9a6a35, -0.5, 1.45, 0); box(g, 0.45, 0.45, 0.4, 0x9a6a35, -0.5, 2.0, 0); for (const sx of [-1, 1]) box(g, 0.14, 0.14, 0.1, 0x9a6a35, -0.5 + sx * 0.2, 2.25, 0);   // мишка
    box(g, 0.5, 0.5, 0.5, 0x3fa7ff, 0.5, 1.4, 0.2); } },
  { id: 'books', icon: '📚', name: 'Полка с книжками', price: 400, w: 2.6, d: 1, h: 3, build: g => {
    box(g, 2.6, 3, 0.8, 0x9a5a2a, 0, 1.5, -0.1); for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) box(g, 0.3, 0.7, 0.6, [0xe2442a, 0x3f8fff, 0xffd23f, 0x4ad04a, 0x9b6bff, 0xff7ac8][(i + r) % 6], -1 + i * 0.38, 0.55 + r * 0.95, 0.05); } },
  { id: 'table', icon: '🪑', name: 'Стол и стулья', price: 500, w: 3, d: 2.6, h: 1.2, build: g => {
    box(g, 2.2, 0.15, 1.4, 0xc98a45, 0, 1.05, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.14, 1, 0.14, 0x9a5a2a, sx * 0.95, 0.5, sz * 0.55);
    for (const sz of [-1, 1]) { box(g, 0.8, 0.12, 0.7, 0xff7b22, 0, 0.6, sz * 1.05); box(g, 0.8, 0.8, 0.12, 0xff7b22, 0, 1.0, sz * 1.38); }
    box(g, 0.4, 0.3, 0.4, 0xffffff, 0.4, 1.28, 0); box(g, 0.3, 0.2, 0.3, 0xff5a5a, 0.4, 1.5, 0); } },          // торт на столе
  { id: 'sofa', icon: '🛋️', name: 'Диван', price: 600, w: 3, d: 1.6, h: 1.6, build: g => {
    box(g, 3, 0.6, 1.4, 0xe2442a, 0, 0.4, 0); box(g, 3, 1, 0.4, 0xd8261a, 0, 1.0, -0.55); for (const sx of [-1, 1]) box(g, 0.35, 0.9, 1.4, 0xd8261a, sx * 1.35, 0.6, 0);
    for (const sx of [-1, 1]) box(g, 0.6, 0.5, 0.15, 0xffd23f, sx * 0.6, 1.0, -0.3); } },
  { id: 'bed', icon: '🛏️', name: 'Кровать', price: 700, w: 2.4, d: 3.2, h: 1.4, build: g => {
    box(g, 2.4, 0.5, 3.2, 0x9a5a2a, 0, 0.25, 0); box(g, 2.2, 0.35, 3, 0xffffff, 0, 0.67, 0); box(g, 2.25, 0.12, 2, 0x3f8fff, 0, 0.88, 0.45);
    box(g, 1.4, 0.3, 0.7, 0xffffff, 0, 0.95, -1.05); box(g, 2.4, 1.6, 0.25, 0x9a5a2a, 0, 0.8, -1.6); box(g, 0.5, 0.5, 0.06, 0xffd23f, 0, 1.3, -1.46, { shadow: false }); } },
  { id: 'tramp', icon: '🟥', name: 'Батут', price: 800, w: 2.8, d: 2.8, h: 0.6, bounce: true, build: g => {
    box(g, 2.8, 0.45, 2.8, 0x3a3a44, 0, 0.22, 0); box(g, 2.5, 0.12, 2.5, 0xff4a4a, 0, 0.5, 0); for (const sx of [-1, 1]) box(g, 0.5, 0.05, 2.3, 0xffffff, sx * 0.6, 0.58, 0, { shadow: false }); } },
  { id: 'tv', icon: '📺', name: 'Телевизор', price: 900, w: 2.6, d: 1, h: 2.4, build: (g, it) => {
    box(g, 2.6, 0.8, 0.9, 0x6a4a34, 0, 0.4, -0.1); box(g, 2.3, 1.4, 0.18, 0x1d1d23, 0, 1.6, -0.2);
    const scr = new T.Mesh(new T.PlaneGeometry(2.05, 1.15), new T.MeshBasicMaterial({ color: 0x3fa7ff })); scr.position.set(0, 1.6, -0.1); g.add(scr); it.screen = scr;
    const pic = []; for (let i = 0; i < 3; i++) { const b = new T.Mesh(new T.PlaneGeometry(0.35, 0.35), new T.MeshBasicMaterial({ color: [0xffd23f, 0xff5a8a, 0x5fd35f][i] })); b.position.set(-0.6 + i * 0.6, 1.5, -0.09); g.add(b); pic.push(b); }
    it.pic = pic; } },
  { id: 'piano', icon: '🎹', name: 'Пианино', price: 1000, w: 2.6, d: 1.4, h: 2, build: g => {
    box(g, 2.6, 1.9, 0.9, 0x1d1d23, 0, 0.95, -0.25); box(g, 2.5, 0.12, 0.6, 0xffffff, 0, 1.0, 0.45);
    for (let i = 0; i < 9; i++) box(g, 0.08, 0.13, 0.35, 0x1d1d23, -1.0 + i * 0.25, 1.06, 0.33, { shadow: false }); box(g, 2.6, 0.5, 0.5, 0x1d1d23, 0, 0.7, 0.45); } },
  { id: 'fish', icon: '🐠', name: 'Аквариум', price: 1100, w: 2.6, d: 1.2, h: 2.4, build: (g, it) => {
    box(g, 2.6, 0.9, 1.1, 0x6a4a34, 0, 0.45, 0);
    const glass = new T.Mesh(new T.BoxGeometry(2.4, 1.3, 1), new T.MeshLambertMaterial({ color: 0x6fd0ff, transparent: true, opacity: 0.45 })); glass.position.set(0, 1.55, 0); g.add(glass);
    box(g, 2.3, 0.15, 0.9, 0xffe0a0, 0, 0.98, 0, { shadow: false }); for (const [x, c] of [[-0.8, 0x3fae2a], [0.7, 0x2e8b57]]) box(g, 0.15, 0.8, 0.15, c, x, 1.4, -0.2, { shadow: false });
    it.fish = [0xff7b22, 0xffd23f, 0xff5a8a].map((c, i) => { const f = group(g, 0, 1.4 + i * 0.25, 0); box(f, 0.3, 0.18, 0.08, c, 0, 0, 0, { shadow: false }); box(f, 0.1, 0.16, 0.06, c, -0.2, 0, 0, { shadow: false }); return { f, ph: i * 2 }; });
  } },
  // ещё вещи: на два этажа мест больше, чем было вещей
  { id: 'beanbag', icon: '🫘', name: 'Кресло-мешок', price: 350, w: 1.8, d: 1.8, h: 1, build: g => { box(g, 1.6, 0.6, 1.6, 0x9b6bff, 0, 0.3, 0); box(g, 1.3, 0.5, 1.2, 0x9b6bff, 0, 0.75, -0.2); box(g, 1.2, 0.15, 0.9, 0xb38cff, 0, 0.63, 0.25, { shadow: false }); } },
  { id: 'easel', icon: '🎨', name: 'Мольберт с картиной', price: 450, w: 1.6, d: 1.4, h: 2.6, build: g => {
    for (const sx of [-1, 1]) { const l = box(g, 0.1, 2.4, 0.1, 0x9a6a35, sx * 0.55, 1.2, 0); l.rotation.z = sx * 0.12; } const b = box(g, 0.1, 2.3, 0.1, 0x9a6a35, 0, 1.1, -0.45); b.rotation.x = -0.35;
    box(g, 1.4, 1.1, 0.06, 0xffffff, 0, 1.75, 0.08); for (const [x, y, c] of [[-0.3, 1.9, 0xffd23f], [0.25, 1.6, 0x3f8fff], [0, 1.95, 0xff5a8a], [0.35, 2.0, 0x4ad04a]]) box(g, 0.3, 0.3, 0.03, c, x, y, 0.12, { shadow: false });
    box(g, 1.3, 0.08, 0.2, 0x9a6a35, 0, 1.15, 0.12); } },
  { id: 'horse', icon: '🦄', name: 'Лошадка-качалка', price: 550, w: 2, d: 1.2, h: 1.8, build: (g, it) => {
    const r = group(g, 0, 0, 0); box(r, 2, 0.12, 0.25, 0xd8261a, 0, 0.1, -0.35); box(r, 2, 0.12, 0.25, 0xd8261a, 0, 0.1, 0.35);
    box(r, 1.2, 0.55, 0.5, 0xffffff, 0, 0.85, 0); box(r, 0.4, 0.7, 0.4, 0xffffff, 0.65, 1.3, 0); box(r, 0.45, 0.3, 0.35, 0xffffff, 0.85, 1.55, 0);
    box(r, 0.12, 0.35, 0.12, 0xffd23f, 0.95, 1.85, 0); for (let i = 0; i < 4; i++) box(r, 0.12, 0.2, 0.42, [0xff7ac8, 0x9b6bff, 0x3fa7ff, 0x5fd35f][i], 0.5 - i * 0.14, 1.65 - i * 0.1, 0, { shadow: false });
    for (const [x, z] of [[-0.45, -0.18], [-0.45, 0.18], [0.45, -0.18], [0.45, 0.18]]) box(r, 0.15, 0.6, 0.15, 0xffffff, x, 0.4, z);
    box(r, 0.4, 0.15, 0.55, 0xff5a8a, -0.1, 1.15, 0); it.tick = t => { r.rotation.z = Math.sin(t * 2.2) * 0.12; }; } },
  { id: 'kicker', icon: '⚽', name: 'Настольный футбол', price: 650, w: 2.6, d: 1.6, h: 1.4, build: (g, it) => {
    box(g, 2.4, 0.6, 1.3, 0x9a5a2a, 0, 1.0, 0); box(g, 2.2, 0.05, 1.1, 0x4ad04a, 0, 1.31, 0, { shadow: false }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.16, 0.7, 0.16, 0x6a3f1e, sx * 1.05, 0.35, sz * 0.5);
    const rods = []; for (let i = 0; i < 4; i++) { const rd = group(g, -0.75 + i * 0.5, 1.45, 0); box(rd, 0.06, 0.06, 1.9, 0xb9c2cc, 0, 0, 0); for (const z of [-0.3, 0.3]) box(rd, 0.12, 0.3, 0.12, i % 2 ? 0x3f8fff : 0xe2442a, 0, -0.12, z); rods.push(rd); }
    box(g, 0.14, 0.14, 0.14, 0xffffff, 0, 1.38, 0.1, { shadow: false }); it.tick = t => rods.forEach((rd, i) => { rd.position.z = Math.sin(t * 3 + i) * 0.15; }); } },
  { id: 'tent', icon: '⛺', name: 'Палатка-вигвам', price: 700, w: 2.6, d: 2.6, h: 3, build: g => {
    for (let i = 0; i < 6; i++) box(g, 2.4 - i * 0.4, 0.5, 2.4 - i * 0.4, i % 2 ? 0xffd23f : 0xff7b22, 0, 0.25 + i * 0.5, 0);
    box(g, 0.8, 1.2, 0.1, 0x5a3a20, 0, 0.6, 1.21); for (const sx of [-1, 1]) { const st = box(g, 0.08, 1, 0.08, 0x9a6a35, sx * 0.2, 3.3, 0); st.rotation.z = sx * 0.3; } } },
  { id: 'dino', icon: '🦖', name: 'Большой игрушечный динозавр', price: 900, w: 2.8, d: 1.4, h: 2.6, build: g => {
    const c = 0x5fbf5a; box(g, 1.6, 1, 0.9, c, 0, 1.0, 0); box(g, 0.7, 0.9, 0.6, c, 0.9, 1.8, 0); box(g, 0.8, 0.5, 0.6, c, 1.3, 2.2, 0); box(g, 0.3, 0.12, 0.62, 0xffffff, 1.6, 2.05, 0, { shadow: false });
    for (const sz of [-0.2, 0.2]) box(g, 0.12, 0.12, 0.05, 0x1a1a1a, 1.45, 2.35, sz + Math.sign(sz) * 0.12, { shadow: false });
    box(g, 1, 0.4, 0.4, c, -1.1, 0.9, 0); box(g, 0.6, 0.3, 0.3, c, -1.7, 0.75, 0); for (const sz of [-0.3, 0.3]) for (const x of [-0.4, 0.5]) box(g, 0.35, 0.6, 0.35, c, x, 0.3, sz);
    for (let i = 0; i < 4; i++) box(g, 0.2, 0.3, 0.12, 0xffd93b, -0.6 + i * 0.45, 1.65, 0); } },
  { id: 'castle', icon: '🏰', name: 'Игрушечный замок', price: 1200, w: 2.8, d: 2.4, h: 3, build: (g, it) => {
    box(g, 2.2, 1.4, 1.8, 0xd8dde4, 0, 0.7, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { box(g, 0.6, 2.2, 0.6, 0xc0c8d0, sx * 1.1, 1.1, sz * 0.9); box(g, 0.75, 0.25, 0.75, 0xff5a8a, sx * 1.1, 2.3, sz * 0.9); }
    box(g, 0.7, 0.9, 0.08, 0x8a5a2b, 0, 0.45, 0.91); for (let i = 0; i < 5; i++) box(g, 0.25, 0.25, 0.25, 0xc0c8d0, -0.8 + i * 0.4, 1.5, 0.8);
    const flags = [-1, 1].map(sx => { box(g, 0.06, 0.8, 0.06, 0x8a8a8a, sx * 1.1, 2.8, -0.9); const f = group(g, sx * 1.1, 3.05, -0.9); box(f, 0.5, 0.3, 0.04, 0xe2442a, 0.25, 0, 0, { shadow: false }); return f; });
    it.tick = t => flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 4 + i) * 0.3; }); } },
  { id: 'arcade', icon: '🕹️', name: 'Игровой автомат', price: 1300, w: 1.6, d: 1.4, h: 2.8, build: (g, it) => {
    box(g, 1.4, 2.6, 1.1, 0x3a2a6a, 0, 1.3, -0.1); box(g, 1.45, 0.4, 1.15, 0xff5a8a, 0, 2.45, -0.1); const top = box(g, 1.3, 0.3, 0.08, 0xffd23f, 0, 2.45, 0.48); top.material = mat(0xffd23f, { emissive: 0x806000 });
    const scr = new T.Mesh(new T.PlaneGeometry(1.05, 0.8), new T.MeshBasicMaterial({ color: 0x1d1d23 })); scr.position.set(0, 1.85, 0.46); g.add(scr);
    const dot = new T.Mesh(new T.PlaneGeometry(0.15, 0.15), new T.MeshBasicMaterial({ color: 0xffd23f })); dot.position.set(0, 1.85, 0.47); g.add(dot);
    box(g, 1.3, 0.2, 0.5, 0x2b2b3a, 0, 1.25, 0.55); box(g, 0.08, 0.25, 0.08, 0x1d1d23, -0.3, 1.45, 0.6); box(g, 0.14, 0.14, 0.14, 0xe2442a, -0.3, 1.6, 0.6); for (const x of [0.15, 0.4]) box(g, 0.14, 0.06, 0.14, x > 0.3 ? 0x3fa7ff : 0x5fd35f, x, 1.38, 0.6);
    it.tick = t => { dot.position.x = Math.sin(t * 2.6) * 0.4; dot.position.y = 1.85 + Math.sin(t * 3.7) * 0.28; }; } },
  { id: 'slide', icon: '🛝', name: 'Домашняя горка', price: 1400, w: 1.6, d: 3.2, h: 2.4, build: g => {
    // сзади — лесенка, наверху — площадка, вперёд и вниз — красный скат с бортиками
    for (const sx of [-1, 1]) box(g, 0.1, 2.2, 0.1, 0x3fa7ff, sx * 0.5, 1.1, -1.35);
    for (let i = 0; i < 4; i++) box(g, 1.0, 0.08, 0.08, 0xffd23f, 0, 0.4 + i * 0.5, -1.35);
    for (const sx of [-1, 1]) box(g, 0.1, 2.0, 0.1, 0x3fa7ff, sx * 0.5, 1.0, -0.75);
    box(g, 1.1, 0.15, 0.75, 0xffd23f, 0, 2.05, -1.05);
    const L = Math.hypot(1.95, 1.9), a = Math.atan2(1.95, 1.9);
    const ramp = group(g, 0, 1.05, 0.25); ramp.rotation.x = a;
    box(ramp, 0.9, 0.1, L, 0xff5a5a, 0, 0, 0); for (const sx of [-1, 1]) box(ramp, 0.08, 0.25, L, 0xffffff, sx * 0.48, 0.12, 0);
    box(g, 0.9, 0.1, 0.5, 0xff5a5a, 0, 0.08, 1.4); } },
  { id: 'rocketbed', icon: '🚀', name: 'Кровать-ракета', price: 1600, w: 2.4, d: 3.2, h: 2, build: (g, it) => {
    box(g, 2.2, 0.8, 2.8, 0xe8eef4, 0, 0.5, 0.1); box(g, 1.6, 0.6, 0.6, 0xe2442a, 0, 0.6, 1.75); box(g, 1, 0.5, 0.4, 0xe2442a, 0, 0.65, 2.15);
    box(g, 2, 0.3, 2.2, 0x3f8fff, 0, 1.0, 0.15); box(g, 1.2, 0.3, 0.5, 0xffffff, 0, 1.05, -0.9);
    for (const sx of [-1, 1]) box(g, 0.2, 1, 1, 0xe2442a, sx * 1.2, 0.5, -1.1); box(g, 0.5, 0.5, 0.06, 0x7fd4ff, 0.7, 0.65, 0.1 + 1.41, { shadow: false });
    const fl = group(g, 0, 0.5, -1.55); box(fl, 0.9, 0.5, 0.3, 0xff9f1a, 0, 0, 0, { shadow: false }); box(fl, 0.5, 0.3, 0.3, 0xffe14d, 0, 0, -0.25, { shadow: false });
    it.tick = t => { fl.scale.z = 0.8 + Math.abs(Math.sin(t * 9)) * 0.6; }; } },
];
const byId = id => FURNITURE.find(f => f.id === id);
// места: центр, куда смотрит мебель (поворот), кнопка — перед ней, ближе к середине комнаты
const spots = list => list.map(([x, z, r]) => ({ x, z, r, bx: x + Math.sin(r) * 2.2, bz: z + Math.cos(r) * 2.2 }));
// home — первый этаж (7 мест), loft — второй (6 мест)
const FLOORS = {
  home: spots([[-10, -3.5, Math.PI / 2], [-10, 2.5, Math.PI / 2], [10, -3.5, -Math.PI / 2], [10, 2.5, -Math.PI / 2], [-6.5, 7.3, Math.PI], [6.5, 7.3, Math.PI], [-10.2, -7.3, Math.PI / 2]]),
  loft: spots([[-5, -5.8, 0], [0.5, -5.8, 0], [6, -5.8, 0], [-5, 5.8, Math.PI], [6, 5.8, Math.PI], [8.8, 0, -Math.PI / 2]]),
};
const FLOOR_NAME = { home: '1-м этаже', loft: '2-м этаже' };
const BASKET = { x: 6.5, z: -7.7, pad: { x: 6.5, z: -5.6 } }, SHELF = { x: 9.5, z: -8.85 };   // лежанка — у северной стены, под окном
const HOME_PETS = 3;
export const homeOf = save => {
  const H = save.home || (save.home = { own: {}, spots: [], pets: [] });
  if (!H.loft) H.loft = [];
  H.spots.length = FLOORS.home.length; H.loft.length = FLOORS.loft.length;
  return H;
};
const arr = (H, floor) => floor === 'loft' ? H.loft : H.spots;
const petKey = p => `${p.s}:${p.big ? 1 : 0}${p.gold ? 1 : 0}${p.rainbow ? 1 : 0}`;
const petByKey = (save, k) => save.pets.find(p => petKey(p) === k);

let st = null;
onLevelReset(() => { st = null; });

export function buildRoom(w, save, floor = 'home') {
  const H = homeOf(save);
  st = { floor, save, items: [], plates: [], pets: [], wasOn: -1, noteT: 0, note: 0 };
  // кнопки мест: круглые, светятся; над пустым местом — «＋»
  const plateMat = new T.MeshBasicMaterial({ color: 0x9b6bff });
  FLOORS[floor].forEach((S, k) => {
    const m = new T.Mesh(new T.CylinderGeometry(0.6, 0.6, 0.08, 20), plateMat); m.position.set(S.bx, 0.04, S.bz); scene.add(m);
    const lab = makeLabel(1.6, 0.8); lab.position.set(S.bx, 1.2, S.bz); scene.add(lab);
    st.plates.push({ m, lab });
    place(k, arr(H, floor)[k]);
  });
  if (floor !== 'home') return;
  // лежанка для питомцев
  // лежанка на троих у стены; перед ней коврик — встал на него, выбираешь, кто живёт дома
  const B = BASKET;
  box(w, 3.8, 0.4, 1.8, 0x9a6a35, B.x, 0.2, B.z); box(w, 3.5, 0.12, 1.5, 0xffb3c7, B.x, 0.44, B.z, { shadow: false }); box(w, 3.8, 0.7, 0.25, 0x9a6a35, B.x, 0.55, B.z - 0.8);
  addCollider({ x0: B.x - 1.9, x1: B.x + 1.9, y0: 0, y1: 1.2, z0: B.z - 0.9, z1: B.z + 0.9 });
  box(w, 2.6, 0.05, 1.6, 0xffb3c7, B.pad.x, 0.03, B.pad.z, { shadow: false });
  const bl = makeLabel(4, 1); bl.position.set(B.x, 2.2, B.z); scene.add(bl); bl.userData.set('🐾 Питомцы дома', { color: '#ffffff' });
  for (const k of H.pets) addPet(k);
  // полка трофеев на северной стене: кубок за каждый пройденный круг Дорожки
  const S = SHELF, rounds = Math.max(0, (save.track?.round || 1) - 1), stars = Object.keys(save.stars || {}).length;
  for (const y of [2.4, 3.7]) box(w, 3.6, 0.15, 0.7, 0x9a5a2a, S.x, y, S.z + 0.35);
  for (let i = 0; i < 6; i++) {
    const has = i < rounds, x = S.x - 1.4 + (i % 3) * 1.4, y = i < 3 ? 2.5 : 3.8, c = has ? 0xffc21a : 0xd8d8e0;
    const cup = group(w, x, y, S.z + 0.4);
    box(cup, 0.4, 0.1, 0.4, c, 0, 0.05, 0); box(cup, 0.12, 0.3, 0.12, c, 0, 0.25, 0); box(cup, 0.55, 0.45, 0.55, c, 0, 0.6, 0);
    for (const sx of [-1, 1]) box(cup, 0.1, 0.3, 0.1, c, sx * 0.35, 0.65, 0);
    if (has) cup.children.forEach(o => { o.material = mat(0xffc21a, { emissive: 0x553300 }); });
  }
  const tl = makeLabel(6, 1.5, { face: 0 }); tl.position.set(S.x, 5.1, S.z + 0.6); scene.add(tl);
  tl.userData.set(`🏆 Кубков ${rounds} · ⭐ ${stars} · 🐣 ${save.pets.length}`, { color: '#ffe14d' });
}

// поставить на место k мебель id (или убрать, если null)
function place(k, id) {
  const S = FLOORS[st.floor][k], old = st.items[k];
  if (old) { scene.remove(old.g); if (old.col) old.col.off = true; }
  st.items[k] = null;
  st.plates[k].lab.userData.set(id ? '' : '＋', { color: '#ffffff' });
  if (!id) return;
  const F = byId(id); if (!F) return;
  const g = group(scene, S.x, 0, S.z); g.rotation.y = S.r; g.userData.dynamic = true;
  const it = { id, g, F }; F.build(g, it);
  const side = Math.abs(Math.sin(S.r)) > 0.5, hw = (side ? F.d : F.w) / 2, hd = (side ? F.w : F.d) / 2;
  it.col = addCollider({ x0: S.x - hw, x1: S.x + hw, y0: 0, y1: F.h, z0: S.z - hd, z1: S.z + hd });
  st.items[k] = it;
}

function addPet(key) {
  const p = petByKey(st.save, key); if (!p) return;
  const g = group(scene, BASKET.x, 0.5, BASKET.z), m = buildPet(g, p);
  m.root.scale.multiplyScalar(1.2);
  st.pets.push({ key, g, m, face: 0, hop: Math.random() * 6 });
  seat();
}
// каждый — на своё место на лежанке: слева, посередине, справа
function seat() { st.pets.forEach((P, i) => { P.g.position.x = BASKET.x + (i - (st.pets.length - 1) / 2) * 1.15; });
}

// раз в кадр в комнате. Вернёт { spot: k } или { basket: true } — что открыть; sfx — звуки
export function updateRoom(dt, hero) {
  if (!st) return {};
  const ev = { sfx: [] }, p = hero.pos, t = performance.now() / 1000;
  // встал на кнопку места — окно выбора мебели (один раз за заход на кнопку)
  let on = -1;
  FLOORS[st.floor].forEach((S, k) => { if (Math.hypot(p.x - S.bx, p.z - S.bz) < 0.75 && p.y < 0.6) on = k; });
  if (st.floor === 'home' && Math.abs(p.x - BASKET.pad.x) < 1.3 && Math.abs(p.z - BASKET.pad.z) < 0.9 && p.y < 1) on = 99;
  if (on !== st.wasOn && on >= 0) ev[on === 99 ? 'basket' : 'spot'] = on === 99 ? true : on + 1;   // +1 — чтобы место 0 не было «ложью»
  st.wasOn = on;
  for (const pl of st.plates) pl.m.material.color.setHSL(0.75, 0.7, 0.55 + Math.sin(t * 3) * 0.08);
  for (const it of st.items) if (it) {
    // телевизор: мультик — фон меняет цвет, фигурки прыгают
    if (it.screen) { it.screen.material.color.setHSL((t * 0.1) % 1, 0.6, 0.6); it.pic.forEach((b, i) => { b.position.y = 1.45 + Math.abs(Math.sin(t * 3 + i)) * 0.3; }); }
    if (it.tick) it.tick(t);                                                   // качается, развевается, мигает
    if (it.fish) it.fish.forEach(({ f, ph }) => { f.position.x = Math.sin(t * 0.7 + ph) * 0.9; f.rotation.y = Math.cos(t * 0.7 + ph) > 0 ? 0 : Math.PI; });
    const S = it.g.position, d = Math.hypot(p.x - S.x, p.z - S.z);
    // батут: прыгнул сверху — высоко подбрасывает
    if (it.F.bounce && d < 1.4 && p.y < 0.9 && p.y > 0.3 && hero.vel.y <= 0) { hero.vel.y = 19; hero.grounded = false; ev.sfx.push('boing'); }
    // пианино: подошёл и стоишь рядом — играет мелодия
    if (it.id === 'piano' && d < 2.4 && (st.noteT -= dt) <= 0) {
      st.noteT = 0.32; const n = [0, 1, 2, 0, 0, 1, 2, 0, 2, 3, 3][st.note++ % 11]; ev.sfx.push('note' + n);
      if (st.note % 3 === 0) puff('🎵', S.clone().setY(2.6), { size: 0.9, rise: 1.2, dx: (Math.random() - 0.5) });
    }
  }
  // питомцы сидят на лежанке: смотрят на тебя, иногда подпрыгивают от радости
  for (const P of st.pets) {
    const q = P.g.position, d = Math.hypot(p.x - q.x, p.z - q.z);
    P.face = dampAngle(P.face, d < 8 ? Math.atan2(p.x - q.x, p.z - q.z) : 0, 4, dt); P.g.rotation.y = P.face;
    P.hop += dt; P.m.root.position.y = d < 4 ? Math.abs(Math.sin(P.hop * 5)) * 0.25 : 0;
    animateAnimal(P.m, dt, 0);
  }
  return ev;
}

// ---------- окна ----------
// место k: что поставить. Купить новое, переставить сюда купленное или убрать
export function openSpot(k, { save, sfx, persist }) {
  const H = homeOf(save), floor = st.floor, here = arr(H, floor);
  // где сейчас стоит вещь (на каком этаже и месте) — её можно перенести сюда
  const whereIs = id => { for (const f of Object.keys(FLOORS)) { const i = arr(H, f).indexOf(id); if (i >= 0) return { f, i }; } return null; };
  const render = () => panel(`🛋️ Место ${k + 1}: что поставить?`, [...FURNITURE].sort((a, b) => a.price - b.price).map(F => {   // от дешёвых к дорогим
    const isHere = here[k] === F.id, own = !!H.own[F.id], at = whereIs(F.id);
    const btn = isHere ? { text: 'Убрать', cls: 'take' }
      : own ? { text: at ? `Перенести сюда<small>сейчас на ${at.f === floor ? 'месте ' + (at.i + 1) : FLOOR_NAME[at.f]}</small>` : 'Поставить' }
      : { html: `${F.price} <i class="coin"></i>`, cls: save.coins >= F.price ? '' : 'no' };
    return { icon: F.icon, name: F.name, on: isHere, btn, click: b => {
      if (isHere) { here[k] = null; place(k, null); sfx.tap(); }
      else {
        if (!own) { if (save.coins < F.price) { sfx.nope(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; } save.coins -= F.price; H.own[F.id] = true; sfx.buy(); }
        else sfx.tap();
        if (at) { arr(H, at.f)[at.i] = null; if (at.f === floor) place(at.i, null); }
        here[k] = F.id; place(k, F.id); confetti(st.items[k].g.position, 30);
      }
      persist(); render();
    } };
  }));
  render();
}
// лежанка: кто из питомцев живёт дома (до трёх)
export function openBasket({ save, sfx, persist }) {
  const H = homeOf(save);
  const kinds = [...new Map(save.pets.map(p => [petKey(p), p])).values()];
  const render = () => panel(`🐾 Питомцы дома — ${H.pets.length} из ${HOME_PETS}`, kinds.length ? kinds.map(p => {
    const k = petKey(p), home = H.pets.includes(k);
    return { img: modelThumb('homepet:' + k, s => buildPet(s, p), { size: 128 }), name: petName(p), on: home,
      btn: home ? { text: 'В загон', cls: 'take' } : H.pets.length >= HOME_PETS ? { html: '<small>дома уже трое — сначала отправь кого-то в загон</small>', cls: 'no' } : { text: 'Домой' },
      click: () => {
        if (home) { H.pets.splice(H.pets.indexOf(k), 1); const i = st.pets.findIndex(P => P.key === k); if (i >= 0) { scene.remove(st.pets[i].g); st.pets.splice(i, 1); seat(); } sfx.tap(); }
        else if (H.pets.length < HOME_PETS) { H.pets.push(k); addPet(k); sfx.buy(); }
        else { sfx.nope(); return; }
        persist(); render();
      } };
  }) : null, 'Пока нет питомцев — принеси яйцо в инкубатор 🥚');
  render();
}
// общее окно-список карточек (то же, что у магазина одежды, только без картинки героя и вкладок)
export function panel(title, cards, empty) {
  const $ = id => document.getElementById(id);
  $('wardT').textContent = title; $('wardPic').style.display = $('wardTabs').style.display = 'none';
  const list = $('wardList'); list.innerHTML = cards ? '' : `<div style="grid-column:1/-1;text-align:center;padding:20px">${empty}</div>`;
  for (const c of cards || []) {
    const el = document.createElement('div'); el.className = 'wcard' + (c.on ? ' on' : '');
    el.innerHTML = (c.img ? `<img src="${c.img}" alt="" style="width:70%;aspect-ratio:1">` : `<div class="ic">${c.icon}</div>`) + `<div class="n">${c.name}</div>`;
    const b = document.createElement('button'); b.className = c.btn.cls || '';
    if (c.btn.html) b.innerHTML = c.btn.html; else b.innerHTML = c.btn.text;
    b.onclick = () => c.click(b);
    el.appendChild(b); list.appendChild(el);
  }
  openOv('ward');
}
