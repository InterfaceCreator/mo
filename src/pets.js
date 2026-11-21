// Питомцы: каталог, загон (гуляют и приносят монеты), копилка, картинки для коллекции.
import { B } from './balance.js';
import { T, scene, group, box, damp, dampAngle, compactModel } from './engine.js';
import { buildBeast, buildBird, buildDino, buildGorilla, animateAnimal } from './animals.js';
import { makeLabel, puff, confetti } from './fx.js';
import { PEN, onLevelReset } from './world.js';

// редкости — от них зависят яйцо, время вылупления и доход
export const RARITY = [
  { name: 'Обычное', color: '#9aa8bd', base: 0xffffff, stripe: 0x3fc3ff },
  { name: 'Необычное', color: '#3fae2a', base: 0xdfffd0, stripe: 0x3fae2a },
  { name: 'Редкое', color: '#2f8fe0', base: 0xbfe6ff, stripe: 0x2f7fe0 },
  { name: 'Эпическое', color: '#b84dff', base: 0xffb3e6, stripe: 0xb84dff },
  { name: 'Легендарное', color: '#ffb300', base: 0xfff0a0, stripe: 0xffb300, glow: 0x553300 },
  { name: 'Мифическое', color: '#ff3b3b', base: 0xff6a3d, stripe: 0x8b0000, glow: 0x661100 },
  { name: 'Небесное', color: '#22c8f0', base: 0x1a2a6a, stripe: 0xffffff, glow: 0x223a80, pattern: 'stars' },
].map((R, i) => ({ ...R, hatch: B.HATCH[i], income: B.INCOME[i] }));

const RAINBOW = [0xff5a5a, 0xffd93b, 0x5fd35f, 0x3fa7ff, 0x9b6bff];
// home — в каких местах этот зверь вылупляется (из яиц тамошних гнёзд); так у каждого места свои питомцы
const F = ['forest', 'base'], D = ['desert'], I = ['ice'], TR = ['track'], AU = ['autumn'];
export const SPECIES = {
  // --- Лес ---
  chick:    { name: 'Цыплёнок', r: 0, home: F, build: p => buildBird(p, { body: 0xffe14d, beak: 0xff9f1a, tuft: true }) },
  bunny:    { name: 'Зайка', r: 0, home: F, build: p => buildBeast(p, { body: 0xffffff, ear: 'long', earC: 0xffd0e0, tail: 'puff', nose: 0xff8fb0, w: 0.7, d: 0.8, leg: 0.25 }) },
  piglet:   { name: 'Поросёнок', r: 1, home: F, build: p => buildBeast(p, { body: 0xffb3c7, snout: 0xff8fae, nose: 0xd45d7f, ear: 'point', tail: 'curl', leg: 0.28 }) },
  duckling: { name: 'Утёнок', r: 0, home: F, build: p => buildBird(p, { body: 0xfff07a, beak: 0xff8a1a, flat: true, legC: 0xff8a1a }) },
  frog:     { name: 'Лягушонок', r: 1, home: F, build: p => buildBeast(p, { body: 0x6fd14a, belly: 0xd8f5a0, eye: 1.6, leg: 0.16, w: 0.85, h: 0.45, d: 0.8, hd: 0.6, nose: 0x3a8a2a, tail: 'none' }) },
  puppy:    { name: 'Щенок', r: 1, home: F, build: p => buildBeast(p, { body: 0xc68642, head: 0xd9a066, ear: 'flop', earC: 0x7a4a21, tail: 'long', snout: 0xf0d2a8 }) },
  kitten:   { name: 'Котёнок', r: 2, home: F, build: p => buildBeast(p, { body: 0xff9f40, ear: 'point', tail: 'long', snout: 0xffe0b8, nose: 0xff6f91, w: 0.7, stripes: 0xe07a20 }) },
  lamb:     { name: 'Ягнёнок', r: 2, home: F, build: p => buildBeast(p, { body: 0xfafafa, head: 0x4a4048, wool: 0xffffff, ear: 'flop', earC: 0x4a4048, legC: 0x4a4048, tail: 'puff', w: 0.85 }) },
  hedgehog: { name: 'Ёжик', r: 2, home: F, build: p => buildBeast(p, { body: 0x9a7b5a, head: 0xd9b48c, quills: 0x5a4030, snout: 0xd9b48c, nose: 0x222222, ear: 'round', leg: 0.18, w: 0.8, h: 0.5, d: 0.85, tail: 'none' }) },
  gorilla:  { name: 'Горилла', r: 3, home: ['forest'], own: true, build: p => buildGorilla(p, { size: 0.55 }) },   // только из яйца из гнезда гориллы в лесу
  fox:      { name: 'Лисёнок', r: 3, home: F, build: p => buildBeast(p, { body: 0xff7a1a, ear: 'point', earC: 0x3a2a2a, tail: 'big', snout: 0xffffff, belly: 0xffffff, legC: 0x3a2a2a }) },
  panda:    { name: 'Панда', r: 3, home: F, build: p => buildBeast(p, { body: 0xffffff, ear: 'round', earC: 0x222222, legC: 0x222222, patch: 0x222222, tail: 'puff', w: 0.95, h: 0.75, d: 1.05 }) },
  // Осенняя долина
  squirrel: { name: 'Бельчонок', r: 1, home: AU, build: p => buildBeast(p, { body: 0xd9702a, belly: 0xffe0b8, ear: 'point', tail: 'big', tailC: 0xd9702a, snout: 0xffe0b8, w: 0.6, d: 0.8, leg: 0.25 }) },
  raccoon:  { name: 'Енотик', r: 2, home: AU, build: p => buildBeast(p, { body: 0x8a8a92, head: 0x9a9aa2, patch: 0x2b2b33, snout: 0xe8e8ee, ear: 'point', tail: 'big', tailC: 0x6a6a72, stripes: 0x4a4a52, w: 0.75, d: 0.95 }) },
  moose:    { name: 'Лосёнок', r: 3, home: AU, build: p => buildBeast(p, { body: 0x7a5a3a, head: 0x8a6a48, antlers: 0xe8d4b0, snout: 0x9a7a5a, ear: 'point', leg: 0.6, w: 0.85, d: 1.25, tail: 'stub' }) },
  firedragon: { name: 'Огненный дракончик', r: 5, home: TR, build: p => buildDino(p, { body: 0xff4a1a, belly: 0xffd23f, spikes: 0xffe14d, wings: 0xff8a1a }) },   // только из огненного яйца босса
  icedragon: { name: 'Ледяной дракончик', r: 5, home: TR, build: p => buildDino(p, { body: 0x5fb8f0, belly: 0xe8f8ff, spikes: 0xffffff, wings: 0xbfe9ff }) },   // из ледяного яйца (2-й круг)
  golddragon: { name: 'Золотой дракончик', r: 6, home: TR, build: p => buildDino(p, { body: 0xffb81a, belly: 0xfff3a0, spikes: 0xff7a1a, wings: 0xffe14d }) },  // из солнечного яйца (3-й круг и дальше)
  // подарки из тайных комнат — больше нигде не бывают
  spacedragon: { name: 'Космический дракончик', r: 6, home: [], own: true, build: p => buildDino(p, { body: 0x2a2f8a, belly: 0x9b6bff, spikes: 0x7fe8ff, wings: 0xff7ac8 }) },
  cupdragon: { name: 'Золотой дракончик-участник', r: 4, home: [], own: true, keep: true, build: p => cupDragon(p) },   // за соревнования (21.11.2026): гуляет всегда, места не занимает
  starfox:  { name: 'Звёздная лисичка', r: 6, home: [], own: true, build: p => buildBeast(p, { body: 0xff8ad0, ear: 'point', earC: 0x9b6bff, tail: 'big', tailC: 0xffffff, snout: 0xffe6f4, belly: 0xffe6f4, spots: 0xffd23f, nose: 0x9b6bff, legC: 0x9b6bff }) },
  owl:      { name: 'Совёнок', r: 3, home: F, build: p => buildBird(p, { body: 0x9c7a54, head: 0xb08a60, belly: 0xe8d4b0, eye: 1.5, tufts: true, beak: 0xffc21a, legC: 0xffc21a }) },
  fawn:     { name: 'Оленёнок', r: 3, home: F, build: p => buildBeast(p, { body: 0xc98a4a, spots: 0xffffff, antlers: 0x8a5a2b, ear: 'point', tail: 'stub', snout: 0xe0b080, leg: 0.5, w: 0.7, d: 1.0 }) },
  unicorn:  { name: 'Единорог', r: 4, home: F, build: p => buildBeast(p, { body: 0xffffff, horn: 0xffd23f, ear: 'point', mane: RAINBOW, tail: 'long', tailC: 0xff7ac8, leg: 0.5, d: 1.15 }) },
  moonbunny:{ name: 'Лунный кролик', r: 6, home: F, build: p => buildBeast(p, { body: 0xe8f0ff, ear: 'long', earC: 0x9fb8ff, tail: 'puff', tailC: 0xffffff, nose: 0x7f9fff, eye: 1.2, spots: 0xffe680, w: 0.75, d: 0.85, leg: 0.3 }) },
  dragon:   { name: 'Дракончик', r: 5, home: F, build: p => buildDino(p, { body: 0xff4a3d, belly: 0xffd93b, wings: 0xb71c1c, spikes: 0xffd93b }) },
  // --- Пустыня ---
  turtle:   { name: 'Черепашка', r: 2, home: D, build: p => buildBeast(p, { body: 0x8bc34a, shell: 0x3e8e41, shellTop: 0x2e7d32, shellDot: 0xffd23f, leg: 0.18, h: 0.45, tail: 'stub', hd: 0.5 }) },
  camel:    { name: 'Верблюжонок', r: 2, home: D, build: p => buildBeast(p, { body: 0xd9a35a, hump: 0xc98a45, ear: 'round', snout: 0xe8c08a, tail: 'long', leg: 0.6, w: 0.75, d: 1.1 }) },
  lion:     { name: 'Львёнок', r: 3, home: D, build: p => buildBeast(p, { body: 0xffc04d, head: 0xffc04d, ear: 'round', earC: 0xc06a1a, tail: 'long', snout: 0xffe6a8, mane: [0xc06a1a, 0xc06a1a, 0xc06a1a], w: 0.85 }) },
  flamingo: { name: 'Фламинго', r: 3, home: D, build: p => buildBird(p, { body: 0xff8fbf, beak: 0x2b2b33, legC: 0xff6fa8, legLen: 0.9, neck: 0.5 }) },
  parrot:   { name: 'Попугай', r: 3, home: D, build: p => buildBird(p, { body: 0x3fd35f, head: 0xff4a4a, wing: 0x3fa7ff, crest: 0xffd23f, tailC: 0x3fa7ff, beak: 0x2b2b33 }) },
  elephant: { name: 'Слонёнок', r: 4, home: D, build: p => buildBeast(p, { body: 0xa0a8b8, trunk: true, bigEars: 0xb8c0d0, tusks: true, tail: 'stub', w: 1.0, h: 0.85, d: 1.2, hd: 0.8, leg: 0.45 }) },
  giraffe:  { name: 'Жирафик', r: 4, home: D, build: p => buildBeast(p, { body: 0xffd23f, spots: 0xc0702a, neck: 1.2, horn: 0xc0702a, ear: 'point', tail: 'long', leg: 0.8, w: 0.7, d: 1.0, hd: 0.5 }) },
  sunlion:  { name: 'Солнечный лев', r: 6, home: D, build: p => buildBeast(p, { body: 0xffe680, head: 0xfff0a0, ear: 'round', earC: 0xff9f1a, tail: 'long', tailC: 0xff7a1a, snout: 0xfff6d0, mane: [0xff7a1a, 0xffb020, 0xff7a1a, 0xffb020], w: 0.9, leg: 0.45 }) },
  phoenix:  { name: 'Феникс', r: 5, home: D, build: p => buildBird(p, { body: 0xff5a1a, head: 0xffb020, wing: 0xffd23f, crest: 0xff2a1a, tailC: 0xffd23f, beak: 0xffe680, legC: 0xff8a1a }) },
  // --- Лёд ---
  seal:     { name: 'Тюлень', r: 3, home: I, build: p => buildBeast(p, { body: 0xb8c4d0, head: 0xc8d4e0, snout: 0xe8eef4, nose: 0x2b2b33, tail: 'fin', leg: 0.12, h: 0.55, w: 0.8, d: 1.2, ear: 'none' }) },
  penguin:  { name: 'Пингвинёнок', r: 3, home: I, build: p => buildBird(p, { body: 0x2b2b3a, belly: 0xffffff, beak: 0xffa31a, wing: 0x1e1e2a, legC: 0xffa31a }) },
  arcticfox:{ name: 'Песец', r: 4, home: I, build: p => buildBeast(p, { body: 0xf4f8ff, ear: 'point', tail: 'big', tailC: 0xffffff, snout: 0xffffff, nose: 0x2b2b33 }) },
  polar:    { name: 'Белый мишка', r: 4, home: I, build: p => buildBeast(p, { body: 0xf4f8ff, snout: 0xdfe8f5, ear: 'round', tail: 'puff', w: 0.95, h: 0.75, d: 1.1, hd: 0.7 }) },
  aurora:   { name: 'Олень северного сияния', r: 6, home: I, build: p => buildBeast(p, { body: 0xdff6ff, antlers: 0x7fffd4, spots: 0x9b6bff, ear: 'point', snout: 0xffffff, tail: 'stub', leg: 0.65, w: 0.75, d: 1.2 }) },
  icedragon:{ name: 'Ледяной дракон', r: 5, home: I, build: p => buildDino(p, { body: 0x7fd4ff, belly: 0xe8f8ff, wings: 0x3fa7ff, spikes: 0xffffff }) },
};
// золотой дракончик с медалью участника на шее
function cupDragon(p) {
  const m = buildDino(p, { body: 0xffc21a, belly: 0xfff3a0, spikes: 0xff7a1a, wings: 0xffe680 });
  const b = m.body;
  box(b, 0.5, 0.05, 0.06, 0x3fa7ff, 0, 1.36, 0.56, { shadow: false });            // ленточка
  box(b, 0.24, 0.24, 0.05, 0xffd23f, 0, 1.18, 0.6, { shadow: false });            // медаль
  return m;
}
export const SPECIES_IDS = Object.keys(SPECIES).sort((a, b) => SPECIES[a].r - SPECIES[b].r);

// случайный питомец из яйца редкости r, найденного в месте loc; v — особое яйцо (влияет на мутации).
// Огромное яйцо даёт питомца на ступень реже
// яйца драконов Дорожки — всегда свой дракончик
const DRAGON_OF = { fire: 'firedragon', ice: 'icedragon', sun: 'golddragon' };
export function rollPet(r, loc = 'forest', v = null) {
  if (DRAGON_OF[v]) return { s: DRAGON_OF[v], big: false, gold: false, rainbow: false };
  if (v === 'giant') r = Math.min(r + 1, RARITY.length - 1);
  if (loc === 'winter') loc = 'ice';                       // в Зимней долине — те же звери, что во Льду
  let pool = loc === 'gorilla' ? ['gorilla'] : SPECIES_IDS.filter(id => SPECIES[id].r === r && SPECIES[id].home.includes(loc) && !SPECIES[id].own);
  if (!pool.length) pool = SPECIES_IDS.filter(id => SPECIES[id].r === r && !SPECIES[id].home.includes('track') && !SPECIES[id].own);   // дракончик — только из огненного яйца
  const rainbow = v === 'rainbow' && Math.random() < 0.25;
  const gold = !rainbow && Math.random() < B.GOLD.chance * (v === 'gold' ? 5 : 1);
  const big = Math.random() < B.BIG.chance * (v === 'spots' ? 3 : 1);
  return { s: pool[Math.floor(Math.random() * pool.length)], big, gold, rainbow };
}
export function petIncome(p) { return RARITY[SPECIES[p.s].r].income * (p.big ? B.BIG.mul : 1) * (p.gold ? B.GOLD.mul : 1) * (p.rainbow ? B.RAINBOW.mul : 1); }
export const petName = p => (p.rainbow ? 'Радужный ' : p.gold ? 'Золотой ' : '') + (p.big ? 'Большой ' : '') + SPECIES[p.s].name;

// модель питомца; золотой — всё золотистое
const GOLD = new T.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x553300 }); GOLD.userData.cached = true;
// радужный: цвет плавно перетекает (меняется в updatePen)
const RAINBOW_MAT = new T.MeshLambertMaterial({ color: 0xff5a5a, emissive: 0x331133 }); RAINBOW_MAT.userData.cached = RAINBOW_MAT.userData.live = true;
export function buildPet(parent, p) {
  const m = SPECIES[p.s].build(parent);
  const k = p.big ? 1.5 : 1; m.root.scale.setScalar(k);
  const skin = p.rainbow ? RAINBOW_MAT : p.gold ? GOLD : null;
  if (skin) m.root.traverse(o => { if (o.isMesh && o.material.color && o.material.color.getHex() !== 0x1a1a1a && o.material.color.getHex() !== 0xffffff) o.material = skin; });
  return compactModel(m);
}

// ---------- загон ----------
// best — питомцы, которые сейчас приносят доход (данные); pets — их модели, только пока мы на базе
const pen = { best: [], pets: [], pending: 0, padLabel: null, coinPile: null, built: false };
onLevelReset(() => { pen.pets = []; pen.built = false; pen.padLabel = pen.coinPile = null; });
const rnd = (a, b) => a + Math.random() * (b - a);

export function penPetsCount() { return pen.pets.length; }

// в загоне гуляют самые доходные питомцы — столько, сколько мест; остальные ждут в коллекции
// особые питомцы (keep) гуляют всегда и места не занимают
export function penBest(all, cap) {
  const keep = all.filter(p => SPECIES[p.s]?.keep), rest = all.filter(p => !SPECIES[p.s]?.keep);
  return [...rest.sort((a, b) => petIncome(b) - petIncome(a)).slice(0, cap), ...keep];
}
export function rebuildPen(all, cap, born) {
  const best = pen.best = penBest(all, cap);
  if (!pen.built) return;
  for (const p of [...pen.pets]) if (!best.includes(p.data)) { scene.remove(p.g); pen.pets.splice(pen.pets.indexOf(p), 1); }
  for (const d of best) if (!pen.pets.some(p => p.data === d)) addPenPet(d, d === born?.data ? born.from : null);
}
let bonus = 1;                                   // домик для питомцев: +25%
export function setPenBonus(k) { bonus = k; }
// добавить монет в копилку загона (доход, пока игра была закрыта)
export function addPending(n) { pen.pending += n; }
export function penIncome() { return pen.best.reduce((s, d) => s + petIncome(d), 0) * bonus; }

export function addPenPet(data, from) {
  const g = group(scene), m = buildPet(g, data);
  const R = PEN.roam;
  g.position.set(from ? from.x : rnd(R.x0, R.x1), 0, from ? from.z : rnd(R.z0, R.z1));
  const label = makeLabel(1.8, 0.45); label.position.y = (data.big ? 2.6 : 1.9); g.add(label);
  label.userData.set('+' + petIncome(data), { color: '#ffe14d', coin: true });
  const pet = { data, g, m, target: g.position.clone(), wait: rnd(0, 2), face: rnd(0, 6) };
  pen.pets.push(pet);
  return pet;
}

export function buildPen(all, cap) {
  pen.built = true; rebuildPen(all, cap);
  // копилка: золотая плита у входа, на ней растёт горка монет
  const pad = group(scene, PEN.pad.x, 0, PEN.pad.z);
  box(pad, 2.6, 0.16, 2.6, 0xffc21a, 0, 0.08, 0, { shadow: false });
  box(pad, 2.2, 0.06, 2.2, 0xffe680, 0, 0.18, 0, { shadow: false });
  pen.coinPile = group(pad, 0, 0.2, 0);
  for (let i = 0; i < 6; i++) { const c = box(pen.coinPile, 0.5, 0.12, 0.5, 0xffd23f, rnd(-0.6, 0.6), i * 0.12 + 0.06, rnd(-0.6, 0.6)); c.rotation.y = rnd(0, 1); }
  pen.padLabel = makeLabel(2.6, 0.65); pen.padLabel.position.y = 2.4; pad.add(pen.padLabel);
}

// раз в кадр: питомцы гуляют, монеты капают в копилку; герой на плите — забирает
export function updatePen(dt, heroPos) {
  const far = Math.hypot(heroPos.x - PEN.pad.x, heroPos.z - PEN.pad.z) > 80;   // герой далеко — питомцы «спят» (доход идёт)
  RAINBOW_MAT.color.setHSL((performance.now() / 4000) % 1, 0.8, 0.6);
  pen.pending += penIncome() * dt;                // доход идёт, где бы ни был герой
  if (!pen.built) return 0;
  const R = PEN.roam;
  for (const p of far ? [] : pen.pets) {
    const pos = p.g.position;
    const dx = p.target.x - pos.x, dz = p.target.z - pos.z, d = Math.hypot(dx, dz);
    let spd = 0;
    if (d > 0.2) { spd = 1.6; pos.x += dx / d * spd * dt; pos.z += dz / d * spd * dt; p.face = dampAngle(p.face, Math.atan2(dx, dz), 6, dt); }
    else if ((p.wait -= dt) <= 0) { p.target.set(rnd(R.x0, R.x1), 0, rnd(R.z0, R.z1)); p.wait = rnd(1.5, 5); }
    p.m.root.rotation.y = p.face;
    animateAnimal(p.m, dt, spd, { hop: true });
  }
  const n = Math.floor(pen.pending);
  pen.coinPile.visible = n > 0; pen.coinPile.scale.setScalar(damp(pen.coinPile.scale.x, Math.min(0.5 + n / 300, 1.4), 3, dt));
  pen.padLabel.visible = n > 0; pen.padLabel.userData.set('+' + fmt(n), { color: '#ffe14d', coin: true });
  if (n > 0 && Math.hypot(heroPos.x - PEN.pad.x, heroPos.z - PEN.pad.z) < 1.6 && heroPos.y < 0.5) {
    pen.pending -= n;
    puff('coin', new T.Vector3(PEN.pad.x, 1.2, PEN.pad.z), { size: 1.2, rise: 2.5 });
    return n;                               // столько монет забрали
  }
  return 0;
}

export function celebrate(pet) { confetti(pet.g.position); }

export function fmt(n) {
  n = Math.floor(n);
  if (n < 1000) return '' + n;
  const u = ['K', 'M', 'B', 'T']; let i = -1;
  while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
  return (n < 10 ? n.toFixed(1).replace(/\.0$/, '') : Math.floor(n)) + u[i];
}

// ---------- картинки для коллекции ----------
let thumbR = null; const thumbs = {};
// картинка модели (для коллекции и выбора игрока); build(scene) возвращает { root }
export function modelThumb(key, build, { yaw = 0.6, size = 160, dist = 1.9 } = {}) {   // dist — насколько далеко камера (в размерах модели)
  if (thumbs[key]) return thumbs[key];
  if (!thumbR) { try { thumbR = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); } catch (e) { thumbR = new T.WebGLRenderer({ alpha: true, preserveDrawingBuffer: true }); } }
  thumbR.setSize(size, size);
  const s = new T.Scene(); s.add(new T.HemisphereLight(0xffffff, 0x99aa88, 0.9)); const l = new T.DirectionalLight(0xffffff, 0.6); l.position.set(2, 4, 5); s.add(l);
  const m = build(s); m.root.rotation.y = yaw;
  // рамка — только по видимым частям (спрятанные зонтик и инструменты не в счёт)
  const bb = new T.Box3(); m.root.updateMatrixWorld(true);
  (function walk(o) { if (!o.visible) return; if (o.isMesh) bb.union(new T.Box3().setFromObject(o)); o.children.forEach(walk); })(m.root);
  const c = bb.getCenter(new T.Vector3()), sz = bb.getSize(new T.Vector3()).length();
  const cam = new T.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(c.x, c.y + sz * 0.35, c.z + sz * dist); cam.lookAt(c);
  thumbR.render(s, cam);
  return (thumbs[key] = thumbR.domElement.toDataURL());
}
export const petThumb = id => modelThumb('pet:' + id, s => SPECIES[id].build(s));
