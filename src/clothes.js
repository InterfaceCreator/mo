// Одежда: магазин одежды на базе 👕 и шкаф дома. Купленное — твоё навсегда, переодеваться можно сколько угодно.
// Слоты: костюм героя, шапка, одежда, штаны, обувь, плащ, очки, на спину. Юбки, блузки и туфли — только у мамы (who). Вещи надеваются поверх героя (новые кубики на голове, туловище, руках).
// У Моти и у мамы — свой гардероб (своё сохранение).
import { T, group, box, damp, mat } from './engine.js';
import { buildHero, LOOK_OF } from './hero.js';
import { modelThumb } from './pets.js';
import { openOv } from './ui.js';

const GOLD = 0xffc21a, BLACK = 0x1d1d23, WHITE = 0xffffff;
export const SLOTS = [['suit', '🦸 Герои'], ['hat', '🎩 Шапки'], ['shirt', '👕 Одежда'], ['legs', '👖 Штаны'], ['shoes', '👟 Обувь'], ['cape', '🧣 Плащи'], ['glasses', '🕶️ Очки'], ['back', '🪽 На спину']];
const dragonWon = save => (save.track?.round || 1) > 1;
// price — монеты; unlock — особая вещь: даётся бесплатно за подвиг
export const CLOTHES = [
  // костюмы героев — на всё тело: маска, перчатки, сапоги, эмблема (suit() ниже). Вместо футболки, не вместе с ней
  { id: 'h_spider', slot: 'suit', icon: '🕷️', name: 'Человек-паук', price: 8000, body: 0xd8261a, arms: 0xd8261a, legs: 0x2a4ab8, boots: 0xd8261a, gloves: 0xd8261a, mask: 0xd8261a, look: 'spider' },
  { id: 'h_bat', slot: 'suit', icon: '🦇', name: 'Бэтмен', price: 8000, body: 0x6a6f7a, arms: 0x6a6f7a, legs: 0x3a3f4a, boots: BLACK, gloves: BLACK, mask: BLACK, top: true, belt: 0xffd23f, cape: BLACK, look: 'bat' },
  { id: 'h_super', slot: 'suit', icon: '🦸', name: 'Супермен', price: 8000, body: 0x2a5ad8, arms: 0x2a5ad8, legs: 0x2a5ad8, boots: 0xd8261a, belt: 0xffd23f, cape: 0xd8261a, look: 'super' },
  { id: 'h_flash', slot: 'suit', icon: '⚡', name: 'Флэш', price: 8000, body: 0xd8261a, arms: 0xd8261a, legs: 0xd8261a, boots: 0xffd23f, gloves: 0xd8261a, mask: 0xd8261a, top: true, belt: 0xffd23f, look: 'flash' },
  { id: 'h_wonder', slot: 'suit', icon: '⭐', name: 'Чудо-женщина', price: 8000, body: 0xd8261a, arms: 0xf2c29a, legs: 0x2a4ab8, boots: 0xd8261a, gloves: GOLD, look: 'wonder' },
  { id: 'h_hulk', slot: 'suit', icon: '💪', name: 'Халк', price: 10000, body: 0x5fa83a, arms: 0x5fa83a, legs: 0x7a3fa8, boots: 0x5fa83a, mask: 0x5fa83a, skin: true, look: 'hulk' },
  { id: 'h_panther', slot: 'suit', icon: '🐾', name: 'Чёрная пантера', price: 10000, body: 0x1d1d23, arms: 0x1d1d23, legs: 0x1d1d23, boots: 0x1d1d23, gloves: 0x1d1d23, mask: 0x1d1d23, look: 'panther' },
  { id: 'h_cap', slot: 'suit', icon: '🛡️', name: 'Капитан Америка', price: 10000, body: 0x2a4ab8, arms: 0x2a4ab8, legs: 0x2a4ab8, boots: 0xd8261a, gloves: 0xd8261a, mask: 0x2a4ab8, top: true, look: 'cap' },
  { id: 'h_thor', slot: 'suit', icon: '🔨', name: 'Тор', price: 12000, body: 0x3a3f4a, arms: 0xf2c29a, legs: 0x2b2b33, boots: 0x2b2b33, gloves: 0x9aa4ad, cape: 0xd8261a, look: 'thor' },
  { id: 'h_iron', slot: 'suit', icon: '🤖', name: 'Железный человек', price: 15000, body: 0xc8201a, arms: 0xc8201a, legs: 0xc8201a, boots: GOLD, gloves: GOLD, mask: 0xc8201a, look: 'iron' },
  // редкие: в магазине не продаются — только в сундучках 🎁 (rarebox.js); rare — где искать
  { id: 'r_robot', slot: 'suit', icon: '🤖', name: 'Костюм робота', rare: 'base', body: 0xb9c2cc, arms: 0x9aa4ad, legs: 0x9aa4ad, boots: 0x6a6f7a, gloves: 0x6a6f7a, mask: 0xb9c2cc, look: 'robot' },
  { id: 'r_balloons', slot: 'back', icon: '🎈', name: 'Воздушные шарики', rare: 'base' },
  { id: 'r_stars', slot: 'glasses', icon: '🤩', name: 'Очки-звёздочки', rare: 'base' },
  { id: 'r_rainbow', slot: 'cape', icon: '🌈', name: 'Радужный плащ', rare: 'base', rainbow: [0xff4a4a, 0xff9f1a, 0xffd23f, 0x4ad04a, 0x3fa7ff, 0x9b6bff] },
  { id: 'r_ninja', slot: 'suit', icon: '🥷', name: 'Костюм ниндзя', rare: 'forest', body: 0x1d1d23, arms: 0x1d1d23, legs: 0x1d1d23, boots: 0x1d1d23, gloves: 0x1d1d23, mask: 0x1d1d23, belt: 0xd8261a, look: 'ninja' },
  { id: 'r_wizard', slot: 'hat', icon: '🧙', name: 'Шляпа волшебника', rare: 'forest' },
  { id: 'r_unicorn', slot: 'hat', icon: '🦄', name: 'Рог единорога', rare: 'forest' },
  { id: 'r_butterfly', slot: 'back', icon: '🦋', name: 'Крылья бабочки', rare: 'forest' },
  { id: 'r_pumpkin', slot: 'hat', icon: '🎃', name: 'Тыквенная голова', rare: 'autumn' },
  { id: 'r_leaves', slot: 'hat', icon: '🍁', name: 'Корона из листьев', rare: 'autumn' },
  { id: 'r_pirate', slot: 'suit', icon: '🏴‍☠️', name: 'Капитан пиратов', rare: 'autumn', body: 0xb01e1e, arms: 0xb01e1e, legs: 0xf2e8d0, boots: 0x1d1d23, gloves: null, belt: 0x1d1d23, look: 'pirate' },
  { id: 'r_gold', slot: 'suit', icon: '🌟', name: 'Золотой костюм', rare: 'autumn', body: GOLD, arms: GOLD, legs: GOLD, boots: 0xe0a000, gloves: 0xe0a000, mask: GOLD, top: true, look: 'gold' },
  { id: 'cap', slot: 'hat', icon: '🧢', name: 'Красная кепка', price: 250 },
  { id: 'party', slot: 'hat', icon: '🥳', name: 'Праздничный колпак', price: 400 },
  { id: 'ushanka', slot: 'hat', icon: '🧤', name: 'Шапка-ушанка', price: 500 },
  { id: 'cowboy', slot: 'hat', icon: '🤠', name: 'Ковбойская шляпа', price: 700 },
  { id: 'pirate', slot: 'hat', icon: '🏴‍☠️', name: 'Пиратская шляпа', price: 1100 },
  { id: 'crown', slot: 'hat', icon: '👑', name: 'Корона', price: 5000 },
  { id: 'horns', slot: 'hat', icon: '🐲', name: 'Рожки дракона', price: 0, unlock: dragonWon, lock: 'победи дракона на Дорожке' },
  { id: 'tee_red', slot: 'shirt', icon: '🟥', name: 'Красная футболка', price: 150, color: 0xe2442a },
  { id: 'tee_blue', slot: 'shirt', icon: '🟦', name: 'Синяя футболка', price: 150, color: 0x3f8fff },
  { id: 'tee_green', slot: 'shirt', icon: '🟩', name: 'Зелёная футболка', price: 150, color: 0x4ad04a },
  { id: 'tee_yellow', slot: 'shirt', icon: '🟨', name: 'Жёлтая футболка', price: 150, color: 0xffd23f },
  { id: 'sailor', slot: 'shirt', icon: '⚓', name: 'Тельняшка', price: 600, color: WHITE, stripes: 0x2a5aa8 },
  { id: 'super', slot: 'shirt', icon: '⚡', name: 'Костюм супергероя', price: 1500, color: 0x2a5aa8, bolt: GOLD },
  { id: 'dino', slot: 'shirt', icon: '🦖', name: 'Костюм динозавра', price: 2000, color: 0x5fbf5a, spikes: 0xffd93b },
  // блузки — только у мамы (who: 'mama'): bow — бант у ворота, frill — рюши, dots — горошек, flowers — цветочки, puff — фонарики на рукавах
  { id: 'bl_white', slot: 'shirt', who: 'mama', icon: '🎀', name: 'Белая блузка с бантом', price: 600, color: 0xfdfcf8, bow: 0x1d1d23 },
  { id: 'bl_pink', slot: 'shirt', who: 'mama', icon: '🌸', name: 'Розовая блузка', price: 700, color: 0xffb3cf, frill: 0xffffff },
  { id: 'bl_dots', slot: 'shirt', who: 'mama', icon: '⚪', name: 'Блузка в горошек', price: 900, color: 0x2a3a6a, dots: 0xffffff, bow: 0xffffff },
  { id: 'bl_blue', slot: 'shirt', who: 'mama', icon: '💙', name: 'Голубая блузка с рюшами', price: 1100, color: 0xbfe0ff, frill: 0xffffff, puff: true },
  { id: 'bl_flower', slot: 'shirt', who: 'mama', icon: '🌼', name: 'Блузка в цветочек', price: 1400, color: 0xfff3c8, flowers: [0xff5a8a, 0x3fa7ff, 0xffa020], puff: true },
  { id: 'bl_silk', slot: 'shirt', who: 'mama', icon: '💜', name: 'Шёлковая блузка', price: 2500, color: 0xb98ae8, bow: 0xffd23f, shine: true },
  // штаны: kind — shorts (шорты, ниже — ноги и носки), pants (брюки), skirt (юбка — только у мамы)
  { id: 'sh_jeans', slot: 'legs', kind: 'shorts', icon: '🩳', name: 'Джинсовые шорты', price: 300, color: 0x3f6fb8, seam: 0xe8c45a },
  { id: 'sh_red', slot: 'legs', kind: 'shorts', icon: '🟥', name: 'Красные шорты', price: 300, color: 0xe2442a },
  { id: 'sh_foot', slot: 'legs', kind: 'shorts', icon: '⚽', name: 'Футбольные шорты', price: 450, color: 0xffffff, stripe: 0x2a5ad8 },
  { id: 'sh_beach', slot: 'legs', kind: 'shorts', icon: '🌺', name: 'Пляжные шорты', price: 600, color: 0x2fbfb0, flowers: [0xff5a8a, 0xffd23f] },
  { id: 'sh_check', slot: 'legs', kind: 'shorts', icon: '🟫', name: 'Шорты в клетку', price: 650, color: 0xc0392b, check: 0x1d1d23 },
  { id: 'sh_camo', slot: 'legs', kind: 'shorts', icon: '🪖', name: 'Камуфляжные шорты', price: 800, color: 0x6a7a3a, camo: [0x3a4a22, 0x9a8a5a] },
  { id: 'pt_jeans', slot: 'legs', kind: 'pants', icon: '👖', name: 'Синие джинсы', price: 600, color: 0x2f5aa0, seam: 0xe8c45a, belt: 0x6a3f1e },
  { id: 'pt_sport', slot: 'legs', kind: 'pants', icon: '🏃', name: 'Спортивные штаны', price: 700, color: 0x1d1d23, stripe: 0xffffff },
  { id: 'pt_cargo', slot: 'legs', kind: 'pants', icon: '🎒', name: 'Брюки-карго', price: 900, color: 0xa08a5a, pockets: 0x8a7448 },
  { id: 'pt_red', slot: 'legs', kind: 'pants', icon: '❤️', name: 'Красные брюки', price: 900, color: 0xd8261a },
  { id: 'pt_pyjama', slot: 'legs', kind: 'pants', icon: '😴', name: 'Пижамные штаны', price: 1000, color: 0x8ac8ff, dots: 0xffffff },
  { id: 'pt_check', slot: 'legs', kind: 'pants', icon: '🏴', name: 'Клетчатые брюки', price: 1300, color: 0x2e6b3a, check: 0x1d1d23 },
  { id: 'pt_camo', slot: 'legs', kind: 'pants', icon: '🪖', name: 'Камуфляжные штаны', price: 1500, color: 0x6a7a3a, camo: [0x3a4a22, 0x9a8a5a], belt: 0x1d1d23 },
  { id: 'pt_gold', slot: 'legs', kind: 'pants', icon: '✨', name: 'Золотые брюки', price: 6000, color: GOLD, shine: true, belt: 0xe0a000 },
  { id: 'sk_red', slot: 'legs', kind: 'skirt', who: 'mama', icon: '💃', name: 'Красная юбка', price: 700, color: 0xd8261a },
  { id: 'sk_jeans', slot: 'legs', kind: 'skirt', who: 'mama', icon: '👖', name: 'Джинсовая юбка', price: 800, color: 0x3f6fb8, seam: 0xe8c45a },
  { id: 'sk_check', slot: 'legs', kind: 'skirt', who: 'mama', icon: '🏴', name: 'Юбка в клетку', price: 1000, color: 0xc0392b, check: 0x1d1d23 },
  { id: 'sk_dots', slot: 'legs', kind: 'skirt', who: 'mama', icon: '⚪', name: 'Юбка в горошек', price: 1100, color: 0x1d1d23, dots: 0xffffff },
  { id: 'sk_long', slot: 'legs', kind: 'skirt', who: 'mama', icon: '🌷', name: 'Длинная юбка в цветочек', price: 1600, color: 0xfff3c8, flowers: [0xff5a8a, 0x3fa7ff, 0x5fd35f], long: true },
  { id: 'sk_tutu', slot: 'legs', kind: 'skirt', who: 'mama', icon: '🩰', name: 'Юбка-пачка', price: 2000, color: 0xffb3cf, tutu: true },
  { id: 'sk_gold', slot: 'legs', kind: 'skirt', who: 'mama', icon: '✨', name: 'Золотая юбка', price: 6000, color: GOLD, shine: true },
  // обувь: tall — сапоги до колена, lace — шнурки, glow — светится, heel — каблук (мамина), flip — ласты
  { id: 'so_red', slot: 'shoes', icon: '👟', name: 'Красные кеды', price: 250, color: 0xe2442a, sole: WHITE, lace: WHITE },
  { id: 'so_blue', slot: 'shoes', icon: '👟', name: 'Синие кроссовки', price: 400, color: 0x2a5ad8, sole: WHITE, lace: 0xffd23f },
  { id: 'so_boots', slot: 'shoes', icon: '🥾', name: 'Ботинки-вездеходы', price: 600, color: 0x6a3f1e, sole: 0x2b1a0a, lace: 0xe8c45a, mid: true },
  { id: 'so_rain', slot: 'shoes', icon: '☔', name: 'Жёлтые резиновые сапоги', price: 700, color: 0xffd23f, sole: 0x1d1d23, tall: true },
  { id: 'so_cowboy', slot: 'shoes', icon: '🤠', name: 'Ковбойские сапоги', price: 1200, color: 0x9a5a2a, sole: 0x4a2a12, tall: true, spur: 0xb9c2cc },
  { id: 'so_valenki', slot: 'shoes', icon: '❄️', name: 'Валенки', price: 800, color: 0x9aa0a8, sole: 0x7a8088, tall: true },
  { id: 'so_army', slot: 'shoes', icon: '🪖', name: 'Берцы', price: 1000, color: 0x1d1d23, sole: 0x111114, lace: 0x3a3a44, mid: true },
  { id: 'so_glow', slot: 'shoes', icon: '💡', name: 'Светящиеся кроссовки', price: 2000, color: WHITE, sole: 0x3fe0ff, lace: 0xff5ad8, glow: true },
  { id: 'so_flip', slot: 'shoes', icon: '🤿', name: 'Ласты', price: 900, color: 0x2fbfb0, flip: true },
  { id: 'so_gold', slot: 'shoes', icon: '👑', name: 'Золотые ботинки', price: 5000, color: GOLD, sole: 0xe0a000, mid: true, shine: true },
  { id: 'so_heels', slot: 'shoes', who: 'mama', icon: '👠', name: 'Красные туфли', price: 900, color: 0xd8261a, heel: true },
  { id: 'so_ballet', slot: 'shoes', who: 'mama', icon: '🩰', name: 'Балетки', price: 600, color: 0xffb3cf, bow: 0xff5a8a },
  { id: 'so_whiteb', slot: 'shoes', who: 'mama', icon: '👢', name: 'Белые сапожки', price: 1500, color: 0xfdfcf8, sole: 0xd8d8d8, tall: true, heel: true },
  { id: 'cape_red', slot: 'cape', icon: '🦸', name: 'Красный плащ', price: 800, color: 0xe2442a },
  { id: 'cape_star', slot: 'cape', icon: '🌟', name: 'Звёздный плащ', price: 2500, color: 0x5a3fbf, star: GOLD },
  { id: 'sun', slot: 'glasses', icon: '🕶️', name: 'Тёмные очки', price: 300 },
  { id: 'round', slot: 'glasses', icon: '👓', name: 'Круглые очки', price: 250 },
  { id: 'rocket', slot: 'back', icon: '🚀', name: 'Рюкзак-ракета', price: 2500 },
  { id: 'wings', slot: 'back', icon: '🪽', name: 'Крылья ангела', price: 3000 },
  { id: 'dwings', slot: 'back', icon: '🐉', name: 'Крылья дракона', price: 0, unlock: dragonWon, lock: 'победи дракона на Дорожке' },
];
const byId = id => CLOTHES.find(c => c.id === id);
export const RARE_WHERE = { base: 'на базе', forest: 'в Лесу', autumn: 'в Осени' };
export const rareOf = loc => CLOTHES.filter(c => c.rare === loc);
export const ward = save => save.ward || (save.ward = { own: {}, wear: {} });

// ---------- надеть на модель ----------
// m — модель из buildHero; wear — { slot: id }. Старая одежда снимается
export function dressHero(m, wear) {
  if (m.outfit) for (const g of m.outfit.groups) g.parent.remove(g);
  const parts = { head: group(m.head), body: group(m.body), armL: group(m.armL), armR: group(m.armR), legL: group(m.legL), legR: group(m.legR) };
  m.hair.visible = true;
  const o = m.outfit = { groups: Object.values(parts), cape: null, wings: [], flame: null, animate: animOutfit };
  const { TW, TH, TY, AW } = m.dims, H = parts.head, Bd = parts.body;
  const suitOn = !!byId(wear?.suit);
  for (const id of Object.values(wear || {})) {
    const c = byId(id); if (!c) continue;
    if (c.slot === 'suit') suit(parts, m, c, !!byId(wear.cape), o);
    if (c.slot === 'shirt' && suitOn) continue;                                      // костюм героя — вместо футболки
    if (c.slot === 'hat') { hat(H, c.id); if (c.id === 'r_pumpkin') m.hair.visible = false; }
    if (c.slot === 'glasses') glasses(H, c.id);
    if (c.slot === 'shirt') {
      box(Bd, TW + 0.05, TH + 0.04, 0.66, c.color, 0, TY, 0);                          // толще поло с воротником
      box(Bd, 0.64, 0.14, 0.66, c.color, 0, TY + TH / 2 + 0.03, 0);                     // ворот
      for (const a of [parts.armL, parts.armR]) box(a, AW + 0.05, 0.8, 0.54, c.color, 0, -0.36, 0);
      if (c.stripes) for (let i = 0; i < 4; i++) {
        box(Bd, TW + 0.07, 0.08, 0.68, c.stripes, 0, TY + TH / 2 - 0.18 - i * 0.24, 0, { shadow: false });
        for (const a of [parts.armL, parts.armR]) box(a, AW + 0.07, 0.08, 0.56, c.stripes, 0, -0.12 - i * 0.2, 0, { shadow: false });
      }
      if (c.bolt) {                                                                       // молния на груди и пояс
        for (const [x, y, r] of [[0.06, TY + 0.22, 0.5], [-0.02, TY, 0.5], [-0.08, TY - 0.2, 0.5]]) { const b = box(Bd, 0.12, 0.3, 0.03, c.bolt, x, y, 0.34, { shadow: false }); b.rotation.z = r; }
        box(Bd, 0.12, 0.08, 0.03, c.bolt, 0.02, TY + 0.08, 0.34, { shadow: false });
        box(Bd, TW + 0.08, 0.12, 0.69, c.bolt, 0, TY - TH / 2 + 0.08, 0);
      }
      if (c.bow || c.frill || c.dots || c.flowers || c.puff || c.shine) blouse(parts, m, c);
      if (c.spikes) {                                                                     // гребень на спине и хвост
        for (let i = 0; i < 4; i++) { const s = box(Bd, 0.16, 0.22, 0.16, c.spikes, 0, TY + TH / 2 - 0.1 - i * 0.28, -0.34); s.rotation.x = -0.6; }
        for (let i = 0; i < 4; i++) box(Bd, 0.34 - i * 0.07, 0.3 - i * 0.05, 0.3, c.color, 0, TY - TH / 2 + 0.05 - i * 0.04, -0.4 - i * 0.26);
        for (let i = 0; i < 3; i++) box(H, 0.14, 0.18, 0.14, c.spikes, 0, 0.55, 0.1 - i * 0.24);
      }
    }
    if (c.slot === 'legs' && !suitOn) legWear(parts, m, c);                          // костюм героя — вместо штанов и обуви
    if (c.slot === 'shoes' && !suitOn) shoes(parts, c);
    if (c.slot === 'cape') {
      const cp = group(Bd, 0, TY + TH / 2, -0.3);
      if (c.rainbow) c.rainbow.forEach((col, i) => box(cp, TW * 0.95, 1.55 / 6 + 0.01, 0.05, col, 0, -0.13 - i * 1.55 / 6, 0));
      else box(cp, TW * 0.95, 1.55, 0.05, c.color, 0, -0.78, 0);
      box(cp, TW + 0.1, 0.12, 0.14, c.color ?? c.rainbow[0], 0, 0, 0.06);
      if (c.star) for (const [x, y] of [[0, -0.5], [-0.25, -1.0], [0.25, -1.2]]) { const s = box(cp, 0.16, 0.16, 0.02, c.star, x, y, -0.035, { shadow: false }); s.rotation.z = 0.78; }
      o.cape = cp;
    }
    if (c.slot === 'back') {
      if (c.id === 'rocket') {
        for (const sx of [-1, 1]) {
          box(Bd, 0.26, 0.7, 0.26, 0xb9c2cc, sx * 0.2, TY + 0.05, -0.42); box(Bd, 0.2, 0.2, 0.2, 0xe2442a, sx * 0.2, TY + 0.48, -0.42);
        }
        const fl = group(Bd, 0, TY - 0.45, -0.42);
        for (const sx of [-1, 1]) { box(fl, 0.18, 0.4, 0.18, 0xff9f1a, sx * 0.2, -0.15, 0, { shadow: false }); box(fl, 0.1, 0.3, 0.1, 0xffe14d, sx * 0.2, -0.32, 0, { shadow: false }); }
        fl.visible = false; o.flame = fl;
      } else if (c.id === 'r_balloons') {                                              // три шарика на ниточках над плечом
        const bl = group(Bd, 0.35, TY + 0.3, -0.35);
        [[0xff4a4a, -0.3, 1.9], [0xffd23f, 0.15, 2.2], [0x3fa7ff, 0.45, 1.8]].forEach(([col, x, y]) => { box(bl, 0.02, y, 0.02, WHITE, x / 2, y / 2, 0, { shadow: false }); box(bl, 0.42, 0.5, 0.42, col, x, y + 0.2, 0); box(bl, 0.08, 0.08, 0.08, col, x, y - 0.08, 0); });
        o.balloons = bl;
      } else if (c.id === 'r_butterfly') {                                              // большие цветные крылья бабочки
        for (const sx of [-1, 1]) {
          const w = group(Bd, sx * 0.12, TY + 0.15, -0.34);
          box(w, 0.75, 0.75, 0.05, 0xff7ac8, sx * 0.4, 0.3, 0); box(w, 0.35, 0.35, 0.06, 0xffd23f, sx * 0.45, 0.35, 0); box(w, 0.55, 0.5, 0.05, 0x9b6bff, sx * 0.32, -0.3, 0);
          w.rotation.y = sx * 0.5; o.wings.push({ w, sx });
        }
      } else {
        const col = c.id === 'wings' ? WHITE : 0xd8261a, tip = c.id === 'wings' ? 0xe8f2ff : 0xff9f1a;
        for (const sx of [-1, 1]) {
          const w = group(Bd, sx * 0.15, TY + 0.25, -0.32);
          for (let i = 0; i < 3; i++) box(w, 0.9 - i * 0.2, 0.22, 0.06, i ? tip : col, sx * (0.45 - i * 0.05), 0.15 - i * 0.24, 0);
          w.rotation.y = sx * 0.5; o.wings.push({ w, sx });
        }
      }
    }
  }
  return m;
}
// плащ развевается на бегу, крылья машут, у ракеты — огонь в прыжке
function animOutfit(dt, speed, air) {
  // плащ висит за спиной: на бегу его отбрасывает назад (поворот вокруг плеч в сторону спины — положительный)
  if (this.cape) this.cape.rotation.x = damp(this.cape.rotation.x, Math.min(1.1, speed * 0.1 + (air ? 0.4 : 0)) + Math.sin(performance.now() / 180) * 0.04, 6, dt);
  const t = performance.now() / 1000;
  for (const { w, sx } of this.wings) w.rotation.y = sx * (0.5 + Math.sin(t * (air ? 14 : 3)) * (air ? 0.4 : 0.1));
  if (this.balloons) this.balloons.rotation.z = Math.sin(t * 1.6) * 0.08 - Math.min(0.3, speed * 0.03);
  if (this.flame) { this.flame.visible = air; this.flame.scale.y = 0.8 + Math.random() * 0.5; }
}

// ---------- блузки, штаны, юбки, обувь ----------
const FRONT = 0.335, LEGF = 0.275;                                                    // лицевая сторона кофты и штанины
const flatP = (p, w, h, x, y, z, col, r = 0) => { const b = box(p, w, h, 0.02, col, x, y, z, { shadow: false, studs: false }); b.rotation.z = r; return b; };
const shiny = (p, col) => p.traverse(o => { if (o.isMesh && o.material.color?.getHex() === col) o.material = mat(col, { emissive: col === GOLD ? 0x664400 : 0x332244 }); });
// узор на плоскости: горошек, цветочки, клетка, пятна; w×h — размер, (x, y) — центр, z — где лицевая сторона
function pattern(p, c, w, h, x, y, z) {
  if (c.dots) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) flatP(p, 0.07, 0.07, x - w / 3 + i * w / 3, y + h / 3 - j * h / 3, z, c.dots);
  if (c.flowers) [[-0.3, 0.3], [0.25, 0.1], [-0.1, -0.25], [0.3, -0.35]].forEach(([fx, fy], i) => { const col = c.flowers[i % c.flowers.length]; flatP(p, 0.1, 0.1, x + fx * w, y + fy * h, z, col, 0.78); flatP(p, 0.04, 0.04, x + fx * w, y + fy * h, z + 0.004, 0xffe14d); });
  if (c.check) { for (let i = -1; i <= 1; i++) flatP(p, 0.03, h, x + i * w / 3, y, z, c.check); for (let j = -1; j <= 1; j++) flatP(p, w, 0.03, x, y + j * h / 3, z, c.check); }
  if (c.camo) [[-0.2, 0.25, 0.18, 0.12], [0.2, 0, 0.14, 0.16], [-0.1, -0.3, 0.2, 0.1], [0.25, 0.35, 0.1, 0.1]].forEach(([fx, fy, fw, fh], i) => flatP(p, fw, fh, x + fx * w, y + fy * h, z, c.camo[i % 2]));
}
// блузка: поверх футболки — бант, рюши, горошек, цветочки, фонарики на рукавах
function blouse(P, m, c) {
  const { TW, TH, TY, AW } = m.dims, Bd = P.body;
  if (c.bow) { for (const sx of [-1, 1]) { const b = box(Bd, 0.18, 0.14, 0.06, c.bow, sx * 0.1, TY + TH / 2 - 0.08, FRONT + 0.02, { shadow: false }); b.rotation.z = sx * 0.3; } box(Bd, 0.08, 0.08, 0.07, c.bow, 0, TY + TH / 2 - 0.08, FRONT + 0.03, { shadow: false }); for (const sx of [-1, 1]) { const t = box(Bd, 0.06, 0.2, 0.04, c.bow, sx * 0.06, TY + TH / 2 - 0.24, FRONT + 0.02, { shadow: false }); t.rotation.z = -sx * 0.25; } }
  if (c.frill) for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) box(Bd, 0.12, 0.08, 0.04, c.frill, sx * 0.08, TY + TH / 2 - 0.15 - i * 0.14, FRONT + 0.01, { shadow: false });
  pattern(Bd, c, TW * 0.8, TH * 0.75, 0, TY - 0.05, FRONT + 0.002);
  if (c.puff) for (const a of [P.armL, P.armR]) box(a, AW + 0.12, 0.3, 0.62, c.color, 0, -0.08, 0);   // фонарики
  if (c.shine) shiny(Bd, c.color);
}
// штаны: шорты (ниже — ноги и носки), брюки или юбка (юбка — на поясе, ноги ходят под ней)
function legWear(P, m, c) {
  const { TW, TH, TY } = m.dims, Bd = P.body;
  if (c.kind === 'skirt') {
    const top = TY - TH / 2 + 0.12, len = c.long ? 0.95 : c.tutu ? 0.42 : 0.6;
    if (c.tutu) [[TW + 0.2, 0.16, 0], [TW + 0.4, 0.14, 0.13], [TW + 0.6, 0.14, 0.26]].forEach(([w, h, dy], i) => box(Bd, w, h, 0.66 + i * 0.2, i % 2 ? 0xffd0e0 : c.color, 0, top - 0.08 - dy, 0));
    else {
      box(Bd, TW + 0.1, len, 0.66, c.color, 0, top - len / 2, 0);
      box(Bd, TW + 0.18, 0.1, 0.74, c.color, 0, top - len + 0.05, 0);                        // подол чуть шире
      pattern(Bd, c, TW * 0.8, len * 0.8, 0, top - len / 2, FRONT + 0.002);
      if (c.seam) flatP(Bd, 0.03, len, 0, top - len / 2, FRONT + 0.003, c.seam);
    }
    box(Bd, TW + 0.12, 0.1, 0.68, c.color, 0, top, 0);                                        // пояс
    for (const l of [P.legL, P.legR]) { box(l, 0.44, 0.5, 0.46, m.skin, 0, -0.42, 0); box(l, 0.46, 0.12, 0.48, WHITE, 0, -0.73, 0); }   // ноги и носочки
    if (c.shine) shiny(Bd, c.color);
    return;
  }
  const short = c.kind === 'shorts', h = short ? 0.38 : 0.84, y = -h / 2 + 0.02;
  for (const [l, sx] of [[P.legL, -1], [P.legR, 1]]) {
    box(l, 0.52, h, 0.54, c.color, 0, y, 0);
    if (short) { box(l, 0.5, 0.42, 0.52, m.skin, 0, -0.56, 0); box(l, 0.5, 0.1, 0.52, WHITE, 0, -0.78, 0); }   // ноги и носки — поверх своих штанов
    else box(l, 0.54, 0.08, 0.56, c.color, 0, -0.8, 0);                                          // отворот
    pattern(l, c, 0.44, h * 0.8, 0, y, LEGF);
    if (c.stripe) box(l, 0.04, h, 0.56, c.stripe, sx * 0.25, y, 0, { shadow: false });         // лампасы
    if (c.seam) flatP(l, 0.02, h * 0.9, -sx * 0.12, y, LEGF + 0.002, c.seam);
    if (c.pockets) box(l, 0.06, 0.24, 0.3, c.pockets, sx * 0.28, y + 0.05, 0);
    if (c.shine) shiny(l, c.color);
  }
  if (c.belt) { box(Bd, TW + 0.08, 0.12, 0.69, c.belt, 0, TY - TH / 2 + 0.08, 0); flatP(Bd, 0.14, 0.1, 0, TY - TH / 2 + 0.08, FRONT + 0.015, GOLD); }
}
// обувь: поверх своей — кеды, ботинки, сапоги, туфли, ласты
function shoes(P, c) {
  for (const l of [P.legL, P.legR]) {
    // своя обувь — 0.5 × 0.58, от −1.0 до −0.8: новая должна быть чуть больше, чтобы своя не просвечивала
    if (c.flip) { box(l, 0.54, 0.24, 0.62, c.color, 0, -0.9, 0.04); box(l, 0.62, 0.05, 0.8, c.color, 0, -0.99, 0.5); continue; }
    if (c.heel) {
      const h = c.tall ? 0.5 : 0.24;
      box(l, 0.54, h, 0.62, c.color, 0, -1.0 + h / 2 + 0.03, 0.04); box(l, 0.14, 0.14, 0.14, c.sole || c.color, 0, -0.99, -0.22);   // каблук
      if (!c.tall) flatP(l, 0.3, 0.05, 0, -0.82, 0.355, 0xf2c29a);                                                  // вырез туфли
      continue;
    }
    if (c.bow && !c.lace) { box(l, 0.54, 0.24, 0.62, c.color, 0, -0.89, 0.04); box(l, 0.18, 0.1, 0.04, c.bow, 0, -0.84, 0.36, { shadow: false }); continue; }   // балетки
    const h = c.tall ? 0.5 : c.mid ? 0.32 : 0.22;
    const s = box(l, 0.54, h, 0.62, c.color, 0, -1.0 + h / 2 + 0.04, 0.04);
    const sole = box(l, 0.56, 0.07, 0.64, c.sole || c.color, 0, -0.98, 0.04, { shadow: false });
    if (c.lace) for (let i = 0; i < (c.mid ? 3 : 2); i++) flatP(l, 0.2, 0.03, 0, -0.84 + i * 0.07, 0.36, c.lace);
    if (c.spur) box(l, 0.06, 0.06, 0.16, c.spur, 0, -0.9, -0.34);
    if (c.glow) { sole.material = mat(c.sole, { emissive: c.sole }); }
    if (c.shine) { s.material = mat(c.color, { emissive: 0x664400 }); }
  }
}

// костюм героя: поверх туловища, рук, ног и головы; у некоторых — плащ, щит или молот за спиной
function suit(P, m, c, ownCape, o) {
  const { TW, TH, TY, AW } = m.dims, Bd = P.body, H = P.head, F = 0.356;           // F — лицевая сторона головы
  const flat = (p, w, h, x, y, z, col, r = 0) => { const b = box(p, w, h, 0.02, col, x, y, z, { shadow: false }); b.rotation.z = r; return b; };
  const glow = c => mat(c, { emissive: c });
  box(Bd, TW + 0.05, TH + 0.04, 0.66, c.body, 0, TY, 0); box(Bd, 0.64, 0.14, 0.66, c.body, 0, TY + TH / 2 + 0.03, 0);   // толще поло с воротником — воротник не торчит
  for (const a of [P.armL, P.armR]) { box(a, AW + 0.05, 0.8, 0.54, c.arms, 0, -0.36, 0); if (c.gloves) box(a, 0.48, 0.28, 0.5, c.gloves, 0, -0.86, 0); }
  for (const l of [P.legL, P.legR]) { box(l, 0.52, 0.86, 0.54, c.legs, 0, -0.42, 0); box(l, 0.54, 0.3, 0.62, c.boots, 0, -0.86, 0.04); }
  if (c.belt) box(Bd, TW + 0.08, 0.12, 0.69, c.belt, 0, TY - TH / 2 + 0.08, 0);
  if (c.mask) {
    if (c.top) box(H, 0.74, 0.44, 0.7, c.mask, 0, 0.14, 0);                          // маска до носа — рот и подбородок видно
    else { box(H, 0.74, 0.68, 0.7, c.mask, 0, 0, 0); if (!c.skin) m.hair.visible = false; }
  }
  const eyesW = (w, h, r, col = WHITE) => { for (const sx of [-1, 1]) { flat(H, w + 0.05, h + 0.05, sx * 0.15, 0.06, F, BLACK, sx * r); flat(H, w, h, sx * 0.15, 0.06, F + 0.005, col, sx * r); } };
  switch (c.look) {
    case 'robot':
      box(H, 0.56, 0.22, 0.03, 0x2b2b3a, 0, 0.06, 0.36); for (const sx of [-1, 1]) box(H, 0.12, 0.08, 0.02, 0x7fe8ff, sx * 0.14, 0.06, 0.38, { shadow: false }).material = glow(0x7fe8ff);
      for (let i = 0; i < 3; i++) box(H, 0.08, 0.04, 0.02, 0x2b2b3a, -0.1 + i * 0.1, -0.16, 0.365, { shadow: false });
      box(H, 0.05, 0.3, 0.05, 0x6a6f7a, 0, 0.48, 0); box(H, 0.12, 0.12, 0.12, 0xff4a4a, 0, 0.66, 0).material = glow(0xff4a4a);
      box(Bd, 0.46, 0.34, 0.03, 0x2b2b3a, 0, TY + 0.1, 0.335); for (let i = 0; i < 3; i++) box(Bd, 0.08, 0.08, 0.02, [0x5fd35f, 0xffd23f, 0xff4a4a][i], -0.13 + i * 0.13, TY + 0.1, 0.35, { shadow: false }).material = glow([0x5fd35f, 0xffd23f, 0xff4a4a][i]);
      break;
    case 'ninja':
      flat(H, 0.62, 0.12, 0, 0.06, F, 0xf2c29a); eyesW(0.1, 0.05, 0, BLACK);
      box(H, 0.76, 0.1, 0.72, 0xd8261a, 0, 0.24, 0); for (const r of [0.4, -0.2]) { const t = box(H, 0.08, 0.36, 0.06, 0xd8261a, 0.1, 0.1, -0.4); t.rotation.z = r; }
      { const sw = group(Bd, -0.2, TY, -0.36); sw.rotation.z = -0.6; box(sw, 0.08, 1.1, 0.06, 0xb9c2cc, 0, 0.2, 0); box(sw, 0.24, 0.06, 0.1, 0xffd23f, 0, -0.35, 0); box(sw, 0.1, 0.3, 0.1, 0x6a3f1e, 0, -0.55, 0); }
      break;
    case 'pirate':
      box(Bd, TW + 0.1, 0.5, 0.7, 0xb01e1e, 0, TY - TH / 2 - 0.15, 0);                 // полы кафтана
      for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) box(Bd, 0.07, 0.07, 0.02, GOLD, sx * 0.14, TY + 0.25 - i * 0.22, 0.34, { shadow: false });
      flat(Bd, 0.3, 0.3, 0, TY + 0.38, 0.335, WHITE, 0.78);
      box(H, 1.06, 0.08, 0.72, BLACK, 0, 0.5, 0); box(H, 0.74, 0.38, 0.52, BLACK, 0, 0.7, 0); box(H, 0.16, 0.14, 0.03, WHITE, 0, 0.72, 0.27, { shadow: false });
      for (const sx of [-1, 1]) { const b = box(H, 0.42, 0.3, 0.08, BLACK, sx * 0.4, 0.62, 0.22); b.rotation.y = sx * 0.6; }
      flat(H, 0.16, 0.14, 0.15, 0.05, F + 0.004, BLACK); { const st = flat(H, 0.7, 0.03, 0, 0.14, F + 0.004, BLACK, 0.3); }   // повязка на глазу
      break;
    case 'gold':
      eyesW(0.14, 0.06, 0.1, BLACK);
      for (const p of [Bd, P.armL, P.armR, P.legL, P.legR, H]) p.traverse(o2 => { if (o2.isMesh && o2.material.color && o2.material.color.getHex() === GOLD) o2.material = mat(GOLD, { emissive: 0x664400 }); });
      flat(Bd, 0.3, 0.3, 0, TY + 0.18, 0.335, WHITE, 0.78);
      break;
    case 'spider': {
      eyesW(0.2, 0.13, 0.4);
      for (const y of [-0.18, 0.22]) flat(H, 0.7, 0.02, 0, y, F - 0.002, BLACK); flat(H, 0.02, 0.66, 0, 0, F - 0.002, BLACK);   // паутинка на маске
      for (const y of [TY - 0.3, TY, TY + 0.3]) flat(Bd, TW, 0.02, 0, y, 0.335, BLACK); flat(Bd, 0.02, TH, 0, TY, 0.335, BLACK);
      for (const sx of [-1, 1]) box(Bd, 0.08, TH, 0.66, 0x2a4ab8, sx * (TW / 2 + 0.03), TY, 0);   // синие бока
      flat(Bd, 0.12, 0.26, 0, (TY + 0.18), 0.34, BLACK); for (const sx of [-1, 1]) for (const dy of [-0.06, 0.06]) flat(Bd, 0.2, 0.025, sx * 0.13, (TY + 0.18) + dy, 0.34, BLACK, sx * (dy > 0 ? 0.5 : -0.5));
      break; }
    case 'bat':
      eyesW(0.14, 0.05, 0.1);
      for (const sx of [-1, 1]) box(H, 0.1, 0.24, 0.1, BLACK, sx * 0.24, 0.48, 0);   // ушки
      flat(Bd, 0.46, 0.26, 0, (TY + 0.18), 0.335, 0xffd23f); flat(Bd, 0.34, 0.08, 0, (TY + 0.18), 0.34, BLACK); for (const sx of [-1, 1]) flat(Bd, 0.1, 0.1, sx * 0.12, (TY + 0.18) + 0.05, 0.34, BLACK, 0.78);
      break;
    case 'super':
      flat(Bd, 0.36, 0.36, 0, (TY + 0.18), 0.335, 0xd8261a, 0.78); flat(Bd, 0.24, 0.24, 0, (TY + 0.18), 0.34, 0xffd23f, 0.78); flat(Bd, 0.12, 0.12, 0, (TY + 0.18), 0.32, 0xd8261a, 0.78);
      break;
    case 'flash':
      eyesW(0.14, 0.08, 0.15);
      for (const sx of [-1, 1]) { const w = box(H, 0.05, 0.26, 0.1, 0xffd23f, sx * 0.38, 0.12, 0); w.rotation.z = -sx * 0.5; }
      flat(Bd, 0.4, 0.4, 0, (TY + 0.18), 0.335, WHITE, 0.78); for (const [x, y] of [[0.05, 0.08], [0, 0], [-0.05, -0.08]]) flat(Bd, 0.08, 0.16, x, (TY + 0.18) + y, 0.34, 0xffd23f, 0.6);
      break;
    case 'wonder':
      for (const sx of [-1, 1]) flat(Bd, 0.32, 0.08, sx * 0.14, (TY + 0.18) + 0.05, 0.335, GOLD, sx * -0.5);
      for (const l of [P.legL, P.legR]) for (let i = 0; i < 3; i++) flat(l, 0.08, 0.08, 0, -0.2 - i * 0.22, 0.285, WHITE, 0.78);   // звёздочки на ногах
      box(H, 0.74, 0.1, 0.7, GOLD, 0, 0.3, 0); flat(H, 0.12, 0.12, 0, 0.3, F + 0.01, 0xd8261a, 0.78);   // диадема со звездой
      for (const a of [P.armL, P.armR]) box(a, 0.5, 0.18, 0.52, GOLD, 0, -0.62, 0);
      break;
    case 'hulk':
      for (const sx of [-1, 1]) { flat(H, 0.14, 0.05, sx * 0.15, 0.16, F + 0.002, BLACK, sx * -0.35); flat(H, 0.08, 0.12, sx * 0.15, 0.04, F + 0.002, BLACK); }
      flat(H, 0.2, 0.04, 0, -0.14, F + 0.002, BLACK);
      for (const y of [TY - 0.2, TY + 0.05]) flat(Bd, 0.36, 0.03, 0, y, 0.335, 0x3f8a2a); flat(Bd, 0.03, 0.5, 0, TY - 0.1, 0.335, 0x3f8a2a);
      break;
    case 'panther':
      eyesW(0.16, 0.08, 0.3);
      for (const sx of [-1, 1]) box(H, 0.1, 0.12, 0.1, BLACK, sx * 0.26, 0.38, 0);
      for (let i = 0; i < 7; i++) { const a = (i - 3) * 0.22; flat(Bd, 0.06, 0.12, Math.sin(a) * 0.32, TY + TH / 2 - 0.1 - Math.cos(a) * 0.12, 0.335, 0xc8cdd8, a); }
      break;
    case 'cap':
      for (const r of [0, 0.63, -0.63]) flat(Bd, 0.06, 0.3, 0, (TY + 0.18), 0.34, WHITE, r);
      for (let i = 0; i < 3; i++) flat(Bd, TW, 0.09, 0, TY - 0.18 - i * 0.16, 0.335, i % 2 ? WHITE : 0xd8261a);
      flat(H, 0.04, 0.14, -0.04, 0.24, F + 0.004, WHITE, -0.25); flat(H, 0.04, 0.14, 0.04, 0.24, F + 0.004, WHITE, 0.25); flat(H, 0.07, 0.03, 0, 0.22, F + 0.004, WHITE);   // буква на шлеме
      { const sh = group(Bd, 0, TY, -0.37); [[0.9, 0xd8261a], [0.7, WHITE], [0.5, 0xd8261a], [0.32, 0x2a4ab8]].forEach(([s, col], i) => { const b = box(sh, s, s, 0.06, col, 0, 0, -i * 0.012); b.rotation.z = 0.78; });
        for (const r of [0, 0.63, -0.63]) { const b = box(sh, 0.04, 0.2, 0.02, WHITE, 0, 0, -0.06); b.rotation.z = r; } }
      break;
    case 'thor':
      for (const [x, y] of [[-0.24, 0.22], [0.24, 0.22], [-0.24, -0.08], [0.24, -0.08]]) flat(Bd, 0.16, 0.16, x, TY + y, 0.335, 0xc8cdd8, 0.78);
      box(H, 0.78, 0.2, 0.74, 0xb9c2cc, 0, 0.44, 0); for (const sx of [-1, 1]) { const w = box(H, 0.06, 0.3, 0.3, WHITE, sx * 0.42, 0.5, -0.05); w.rotation.z = -sx * 0.5; }
      { const hm = group(Bd, 0.25, TY - 0.1, -0.39); hm.rotation.z = 0.5; box(hm, 0.1, 0.8, 0.1, 0x6a3f1e, 0, 0, 0); box(hm, 0.42, 0.28, 0.3, 0x9aa4ad, 0, 0.45, 0); }
      break;
    case 'iron':
      box(H, 0.52, 0.5, 0.03, GOLD, 0, -0.02, F); for (const sx of [-1, 1]) box(H, 0.16, 0.05, 0.02, 0x7fe8ff, sx * 0.13, 0.08, F + 0.02, { shadow: false }).material = glow(0x7fe8ff);
      flat(H, 0.16, 0.03, 0, -0.16, F + 0.02, 0x8a6a10);
      box(Bd, 0.2, 0.2, 0.04, 0x7fe8ff, 0, (TY + 0.18), 0.335).material = glow(0x7fe8ff);
      for (const a of [P.armL, P.armR]) box(a, AW + 0.07, 0.2, 0.56, GOLD, 0, -0.2, 0);
      for (const l of [P.legL, P.legR]) box(l, 0.54, 0.2, 0.56, GOLD, 0, -0.3, 0);
      break;
  }
  // плащ героя — если отдельный плащ не надет
  if (c.cape && !ownCape) {
    const cp = group(Bd, 0, TY + TH / 2, -0.34);
    box(cp, TW * 0.95, 1.75, 0.05, c.cape, 0, -0.88, 0); box(cp, TW + 0.1, 0.12, 0.14, c.cape, 0, 0, 0.06);
    o.cape = cp;
  }
}

function hat(H, id) {
  if (id === 'cap') { box(H, 0.8, 0.22, 0.76, 0xe2442a, 0, 0.44, -0.02); box(H, 0.7, 0.06, 0.34, 0xe2442a, 0, 0.35, 0.48); box(H, 0.12, 0.06, 0.12, WHITE, 0, 0.57, 0); }
  if (id === 'party') { [0xff7ac8, 0x3fa7ff, 0xffd23f, 0x5fd35f].forEach((c, i) => box(H, 0.56 - i * 0.14, 0.2, 0.56 - i * 0.14, c, 0, 0.5 + i * 0.2, 0)); box(H, 0.14, 0.14, 0.14, WHITE, 0, 1.33, 0); }
  if (id === 'ushanka') {
    box(H, 0.84, 0.3, 0.8, 0x7a5232, 0, 0.5, -0.02); box(H, 0.86, 0.16, 0.12, 0x5a3a20, 0, 0.44, 0.4);
    for (const sx of [-1, 1]) box(H, 0.12, 0.44, 0.52, 0x7a5232, sx * 0.43, 0.12, -0.04);
  }
  if (id === 'cowboy') { box(H, 1.3, 0.06, 1.2, 0x9a6a35, 0, 0.5, 0); box(H, 0.72, 0.42, 0.66, 0x9a6a35, 0, 0.74, 0); box(H, 0.74, 0.09, 0.68, 0x4a2a12, 0, 0.58, 0); }
  if (id === 'pirate') {
    box(H, 1.06, 0.08, 0.72, BLACK, 0, 0.5, 0); box(H, 0.74, 0.38, 0.52, BLACK, 0, 0.7, 0);
    box(H, 0.16, 0.14, 0.03, WHITE, 0, 0.72, 0.27, { shadow: false }); box(H, 0.26, 0.04, 0.03, WHITE, 0, 0.62, 0.27, { shadow: false });
    for (const sx of [-1, 1]) { const b = box(H, 0.42, 0.3, 0.08, BLACK, sx * 0.4, 0.62, 0.22); b.rotation.y = sx * 0.6; }
  }
  if (id === 'crown') {
    for (const [w, d, x, z] of [[0.78, 0.08, 0, 0.36], [0.78, 0.08, 0, -0.38], [0.08, 0.76, 0.38, 0], [0.08, 0.76, -0.38, 0]]) box(H, w, 0.2, d, GOLD, x, 0.58, z);
    for (const [x, z] of [[0, 0.36], [-0.3, 0.36], [0.3, 0.36], [0, -0.38], [0.38, 0], [-0.38, 0]]) box(H, 0.1, 0.16, 0.1, GOLD, x, 0.76, z);
    box(H, 0.1, 0.1, 0.03, 0xe2442a, 0, 0.58, 0.41, { shadow: false }); for (const sx of [-1, 1]) box(H, 0.08, 0.08, 0.03, 0x3f8fff, sx * 0.22, 0.58, 0.41, { shadow: false });
  }
  if (id === 'r_wizard') {                                                           // фиолетовый колпак со звёздами и полями
    box(H, 1.1, 0.06, 1.1, 0x5a3fbf, 0, 0.48, 0); [0.66, 0.52, 0.38, 0.26, 0.14].forEach((w, i) => { const b = box(H, w, 0.24, w, 0x6a4ad8, i * 0.03, 0.62 + i * 0.22, -i * 0.03); b.rotation.z = -i * 0.05; });
    for (const [x, y, z] of [[0.2, 0.7, 0.34], [-0.15, 0.95, 0.27], [0.05, 1.15, 0.2]]) { const s = box(H, 0.1, 0.1, 0.02, 0xffd23f, x, y, z, { shadow: false }); s.rotation.z = 0.78; }
  }
  if (id === 'r_unicorn') { [0.16, 0.12, 0.08, 0.05].forEach((w, i) => box(H, w, 0.16, w, i % 2 ? 0xffd23f : 0xffffff, 0, 0.56 + i * 0.15, 0.22 + i * 0.03)); for (let i = 0; i < 4; i++) box(H, 0.12, 0.18, 0.16, [0xff7ac8, 0x9b6bff, 0x3fa7ff, 0x5fd35f][i], 0, 0.5 - i * 0.12, -0.3 - i * 0.03); }
  if (id === 'r_pumpkin') {                                                          // голова — тыква с лицом
    box(H, 0.92, 0.8, 0.88, 0xff8a1a, 0, 0.04, 0); for (const x of [-0.3, 0, 0.3]) box(H, 0.06, 0.82, 0.9, 0xe07010, x, 0.04, 0);
    box(H, 0.12, 0.22, 0.12, 0x3a6a1a, 0, 0.55, 0);
    for (const sx of [-1, 1]) { const e = box(H, 0.16, 0.16, 0.02, 0x2b1a0a, sx * 0.18, 0.12, 0.45, { shadow: false }); e.rotation.z = 0.78; }
    box(H, 0.42, 0.1, 0.02, 0x2b1a0a, 0, -0.14, 0.45, { shadow: false }); for (const x of [-0.12, 0.12]) box(H, 0.08, 0.08, 0.02, 0xff8a1a, x, -0.1, 0.455, { shadow: false });
  }
  if (id === 'r_leaves') for (let i = 0; i < 8; i++) {                               // венок из осенних листьев
    const a = i / 8 * Math.PI * 2, l = box(H, 0.22, 0.26, 0.05, [0xe2442a, 0xff9f1a, 0xffd23f, 0xb5523a][i % 4], Math.sin(a) * 0.38, 0.5, Math.cos(a) * 0.38); l.rotation.y = a; l.rotation.z = 0.4;
  }
  if (id === 'horns') for (const sx of [-1, 1]) {
    const a = group(H, sx * 0.26, 0.48, -0.05); a.rotation.z = -sx * 0.45;
    box(a, 0.14, 0.3, 0.14, 0xfff3c8, 0, 0.12, 0); box(a, 0.1, 0.22, 0.1, 0xffd23f, 0, 0.36, 0); box(a, 0.06, 0.12, 0.06, 0xff9f1a, 0, 0.52, 0);
  }
}
function glasses(H, id) {
  if (id === 'r_stars') {                                                             // очки-звёздочки: розовые звёзды
    for (const sx of [-1, 1]) for (const r of [0, 0.78]) { const s = box(H, 0.22, 0.22, 0.02, r ? 0xffd23f : 0xff5a8a, sx * 0.16, 0.06, 0.36 + (r ? 0.005 : 0), { shadow: false }); s.rotation.z = r; }
    box(H, 0.1, 0.03, 0.02, 0xff5a8a, 0, 0.08, 0.36, { shadow: false }); return;
  }
  const dark = id === 'sun';
  for (const sx of [-1, 1]) {
    box(H, 0.24, dark ? 0.16 : 0.22, 0.02, BLACK, sx * 0.15, 0.05, 0.355, { shadow: false });
    box(H, 0.18, dark ? 0.12 : 0.16, 0.02, dark ? 0x2b2b3a : 0xcfe9ff, sx * 0.15, 0.05, 0.37, { shadow: false });
    box(H, 0.04, 0.04, 0.3, BLACK, sx * 0.34, 0.07, 0.2, { shadow: false });         // дужки
  }
  box(H, 0.08, 0.03, 0.02, BLACK, 0, 0.08, 0.36, { shadow: false });
}

// ---------- магазин и шкаф ----------
// shop — магазин (можно купить); иначе — шкаф дома (только купленное). hero — модель героя (переодеваем сразу)
export function openWardrobe({ save, profile, hero, shop, sfx, persist, onChange }) {
  const W = ward(save), $ = id => document.getElementById(id);
  let tab = 'hat';
  $('wardT').textContent = shop ? '👕 Магазин одежды' : '🚪 Шкаф';
  $('wardPic').style.display = $('wardTabs').style.display = '';                   // окно мебели их прячет (furniture.js)
  const look = LOOK_OF[profile] || 'boy';
  const pic = () => { const key = Object.values(W.wear).filter(Boolean).sort().join(',');
    $('wardPic').src = modelThumb(`dressed:${look}:${key}`, s => dressHero(buildHero(s, look), W.wear), { yaw: 0.45, size: 300, dist: 1.5 }); };
  const wear = (c, on) => { W.wear[c.slot] = on ? c.id : null; if (on && c.slot === 'suit') W.wear.shirt = null; if (on && c.slot === 'shirt') W.wear.suit = null; dressHero(hero, W.wear); persist(); onChange && onChange(); };
  const render = () => {
    $('wardTabs').innerHTML = SLOTS.map(([s, t]) => `<button class="${s === tab ? 'on' : ''}" data-s="${s}">${t}</button>`).join('');
    $('wardTabs').querySelectorAll('button').forEach(b => b.onclick = () => { sfx.tap(); tab = b.dataset.s; render(); });
    const list = $('wardList'); list.innerHTML = '';
    for (const c of CLOTHES.filter(c => c.slot === tab && (!c.who || c.who === profile))) {   // юбки и блузки — только у мамы
      const own = !!W.own[c.id], on = W.wear[c.slot] === c.id, free = c.unlock && c.unlock(save), locked = c.unlock && !free;
      const card = document.createElement('div'); card.className = 'wcard' + (on ? ' on' : '') + (!own && !shop ? ' off' : '') + (c.rare ? ' rare' : '');
      card.innerHTML = `<div class="ic">${c.icon}</div><div class="n">${c.name}</div>`;
      const b = document.createElement('button');
      if (own) { b.textContent = on ? 'Снять' : 'Надеть'; b.className = on ? 'take' : ''; }
      else if (c.rare) { b.innerHTML = `✨<small>найди 🎁 ${RARE_WHERE[c.rare]}</small>`; b.className = 'no'; }
      else if (locked) { b.innerHTML = `🔒<small>${c.lock}</small>`; b.className = 'no'; }
      else if (!shop) { b.innerHTML = '<small>купи в магазине одежды 👕</small>'; b.className = 'no'; }
      else if (free) b.textContent = 'Взять бесплатно';
      else { b.innerHTML = `${c.price} <i class="coin"></i>`; b.className = save.coins >= c.price ? '' : 'no'; }
      b.onclick = () => {
        if (own) { sfx.tap(); wear(c, !on); }
        else if (locked || !shop || c.rare) { sfx.nope(); return; }
        else {
          if (!free && save.coins < c.price) { sfx.nope(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
          if (!free) save.coins -= c.price;
          W.own[c.id] = true; sfx.buy(); wear(c, true);                                   // купил — сразу надел
        }
        render();
      };
      card.appendChild(b); list.appendChild(card);
    }
    pic();
  };
  render(); openOv('ward');
}
export const hatOn = hat;                                                          // шляпы на манекенах в ларьке (home.js)
export const wardOpen = () => document.getElementById('ward').classList.contains('on');
