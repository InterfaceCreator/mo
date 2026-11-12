// Кухня 🍳: продукты по миру, рецепты, готовка и блюда.
// Продукты лежат в разных местах и вырастают снова: яйца у Курочки Рябы и яблоки на базе, ягоды, грибы и мёд в Лесу,
// яблоки в осеннем саду, чистый снег и какао в Зимней долине. Тыквы — из Осени (как раньше). Муку, молоко и сахар продаёт тётя Галя.
// Рецепты: три — от тёти Гали сразу, остальные — записки 📜, спрятанные по миру (подошёл — рецепт твой).
// Готовка — у плиты в своём доме: положить продукты в кастрюлю → помешать (водить пальцем по кругу) → снять с огня вовремя.
// Чем точнее снял — тем больше звёздочек ⭐ и тем сильнее блюдо. Блюдо можно съесть (польза), отдать питомцам (сытые — больше монет),
// угостить жителя (сердечко дружбы) или второго игрока. Вдвоём можно готовить на одной кухне: хозяин кладёт продукты,
// мешают оба (у обоих кольцо растёт), снимает с огня любой — блюдо получают оба.
import { T, scene, group } from './engine.js';
import { groundY, nearColliders, onLevelReset } from './world.js';
import { sprite, emojiTex, puff } from './fx.js';
import { openOv, closeOv } from './ui.js';

export const FOOD = {
  egg: ['🥚', 'Яйцо', 'у Курочки Рябы на базе'], apple: ['🍎', 'Яблоко', 'под яблонями на базе и в осеннем саду'],
  berry: ['🫐', 'Ягоды', 'в Лесу'], mush: ['🍄', 'Грибы', 'в Лесу, в грибной роще'], honey: ['🍯', 'Мёд', 'в Лесу, у лагеря бобра'],
  snow: ['❄️', 'Чистый снег', 'в Зимней долине'], cocoa: ['🟤', 'Какао', 'у ларька в Зимней долине'],
  pumpkin: ['🎃', 'Тыква', 'в Осени, на грядке'], fish: ['🐟', 'Рыба', 'на рыбалке в Зиме, на озере'],
  flour: ['🌾', 'Мука', 'у тёти Гали'], milk: ['🥛', 'Молоко', 'у тёти Гали'], sugar: ['🍬', 'Сахар', 'у тёти Гали'],
};
export const SHOP = { flour: 20, milk: 20, sugar: 15 };              // цены у тёти Гали
// fx: что даёт блюдо (на 1 ⭐; 2 ⭐ — в полтора раза, 3 ⭐ — вдвое больше); find — где спрятана записка с рецептом
export const RECIPES = [
  { id: 'pancakes', icon: '🥞', name: 'Блинчики', need: { flour: 1, milk: 1, egg: 1 }, fx: { run: 40 }, what: 'бегаешь быстрее' },
  { id: 'applepie', icon: '🥧', name: 'Яблочный пирог', need: { flour: 1, apple: 2, sugar: 1 }, fx: { coins: 120 }, what: 'монеты' },
  { id: 'psoup', icon: '🍲', name: 'Тыквенный суп', need: { pumpkin: 1, milk: 1 }, fx: { compass: 45 }, what: 'компас покажет яйца и клады' },
  { id: 'msoup', icon: '🥣', name: 'Грибной суп', need: { mush: 2, milk: 1 }, fx: { jump: 45 }, what: 'прыгаешь выше', find: 'в Лесу, в грибной роще' },
  { id: 'cookies', icon: '🍪', name: 'Медовое печенье', need: { flour: 1, honey: 1, egg: 1 }, fx: { coins: 200 }, what: 'много монет', find: 'в Лесу, у лагеря бобра' },
  { id: 'icecream', icon: '🍨', name: 'Мороженое', need: { snow: 1, berry: 1, sugar: 1 }, fx: { jump: 60 }, what: 'прыгаешь выше', find: 'в Зиме, во дворе снеговиков' },
  { id: 'cocoa', icon: '☕', name: 'Какао', need: { cocoa: 1, milk: 1, sugar: 1 }, fx: { run: 30, coins: 40 }, what: 'согревает: быстрее и немного монет', find: 'в Зиме, у ларька с какао' },
  { id: 'salad', icon: '🥗', name: 'Фруктовый салат', need: { apple: 1, berry: 1, honey: 1 }, fx: { run: 50 }, what: 'бегаешь быстрее', find: 'в Осени, в саду' },
  { id: 'cupcake', icon: '🧁', name: 'Ягодный кекс', need: { flour: 1, berry: 2, sugar: 1, egg: 1 }, fx: { jump: 40, run: 20 }, what: 'выше и быстрее', find: 'в Осени, у большого клёна' },
  { id: 'fishpie', icon: '🥟', name: 'Рыбный пирог', need: { flour: 1, fish: 1, egg: 1 }, fx: { coins: 150, run: 20 }, what: 'монеты и быстрее', find: 'в Зиме, у озера с лунками' },
  { id: 'cake', icon: '🎂', name: 'Торт', need: { flour: 1, egg: 2, sugar: 1, berry: 2, honey: 1 }, fx: { coins: 500, party: 1 }, what: 'праздник и много монет', find: 'в Зиме, у иглу' },
];
// записки с рецептами: где лежат
const SCROLLS = {
  forest: [['msoup', { x: -72, z: -58 }], ['cookies', { x: 17, z: 62 }]],
  winter: [['icecream', { x: -30, z: 19 }], ['cocoa', { x: 16, z: 36 }], ['cake', { x: -48, z: 35 }], ['fishpie', { x: 50, z: -6 }]],
  autumn: [['salad', { x: 34, z: -24 }], ['cupcake', { x: -48, z: 30 }]],
};
const MUL = [0, 1, 1.5, 2];
export const kitchen = save => {
  const K = save.food || (save.food = { have: {}, dishes: [], best: {} });
  if (!K.known) K.known = { pancakes: true, applepie: true, psoup: true };            // рецепты тёти Гали — сразу
  return K;
};
const have = (save, k) => k === 'pumpkin' ? (save.res.pumpkin || 0) : (kitchen(save).have[k] || 0);
const take = (save, k, n) => { if (k === 'pumpkin') save.res.pumpkin -= n; else kitchen(save).have[k] -= n; };
export const canCook = (save, r) => Object.entries(r.need).every(([k, n]) => have(save, k) >= n);
export const knows = (save, id) => !!kitchen(save).known[id];
// лучшее блюдо (больше всего звёздочек) — его отдают жителю или питомцам
export const bestDish = save => { const D = kitchen(save).dishes; let i = -1; D.forEach((d, j) => { if (i < 0 || d.s > D[i].s) i = j; }); return i; };

// ---------- продукты и записки в мире ----------
// [продукт, где (рядом с какой точкой), сколько штук, радиус, через сколько секунд вырастает снова]
const SPOTS = {
  base: [['egg', { x: -5, z: 14 }, 3, 3, 90], ['apple', { x: -44, z: 0 }, 2, 3, 120], ['apple', { x: 24, z: 60 }, 2, 3, 120]],
  forest: [['mush', { x: -78, z: -64 }, 5, 9, 90], ['berry', { x: 0, z: 60 }, 4, 14, 90], ['berry', { x: 21, z: 66 }, 3, 9, 90], ['honey', { x: 26, z: 60 }, 1, 4, 150]],
  autumn: [['apple', { x: 38, z: -30 }, 4, 12, 100]],
  winter: [['snow', { x: 0, z: 40 }, 4, 12, 60], ['cocoa', { x: 20, z: 37 }, 1, 1.5, 120]],
};
let pk = [];
onLevelReset(() => { pk = []; });
const left = {};                                                   // сколько ждать каждому месту (между заходами)
function freeSpot(o, r, rnd) {
  for (let i = 0; i < 40; i++) {
    const a = rnd() * Math.PI * 2, d = (r > 2 ? 1 : 0) + rnd() * r, x = o.x + Math.cos(a) * d, z = o.z + Math.sin(a) * d, y = groundY(x, z);
    if (y < 0) continue;
    if (nearColliders(x - 0.8, x + 0.8, z - 0.8, z + 0.8).some(c => !c.off && c.y1 > y + 0.2 && c.y0 < y + 2 && x > c.x0 - 0.8 && x < c.x1 + 0.8 && z > c.z0 - 0.8 && z < c.z1 + 0.8)) continue;
    return { x, z, y };
  }
  return null;
}
export function buildPickups(loc, save) {
  pk = [];
  let s = 7 + loc.length * 13; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  (SPOTS[loc] || []).forEach(([k, o, n, r, every], j) => {
    for (let i = 0; i < n; i++) {
      const p = freeSpot(o, r, rnd); if (!p) continue;
      const g = group(scene, p.x, p.y, p.z); g.userData.dynamic = true;
      const sp = sprite(emojiTex(FOOD[k][0]), 0.9); sp.position.y = 0.8; g.add(sp);
      const key = `${loc}:${j}:${i}`;
      pk.push({ k, x: p.x, z: p.z, y: p.y, g, sp, key, every });
      g.visible = !(left[key] > Date.now());
    }
  });
  // записки с рецептами, которых ещё нет: свиток над землёй и тонкий золотой луч
  for (const [id, o] of SCROLLS[loc] || []) {
    if (save && knows(save, id)) continue;
    const p = freeSpot(o, 2, rnd); if (!p) continue;
    const g = group(scene, p.x, p.y, p.z); g.userData.dynamic = true;
    const sp = sprite(emojiTex('📜'), 1.2); sp.position.y = 1; g.add(sp);
    const beam = new T.Mesh(new T.CylinderGeometry(0.25, 0.35, 9, 8, 1, true), new T.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.35, depthWrite: false, fog: false }));
    beam.position.y = 4.5; g.add(beam);
    pk.push({ scroll: id, x: p.x, z: p.z, y: p.y, g, sp, key: 'scroll:' + id });
  }
}
export const pickupsHere = () => pk.map(P => P.k || 'scroll:' + P.scroll);   // для проверок: что лежит в этой локации
// раз в кадр: подошёл — забрал; вернёт { say, sfx } или null
export function updatePickups(dt, hero, save) {
  if (!pk.length) return null;
  const p = hero.pos, t = performance.now() / 1000, now = Date.now();
  let ev = null;
  for (const P of pk) {
    if (!P.g.visible) { if (!P.scroll && now >= (left[P.key] || 0)) { P.g.visible = true; puff('✨', new T.Vector3(P.x, P.y + 1, P.z), { size: 0.8 }); } continue; }
    P.sp.position.y = (P.scroll ? 1 : 0.8) + Math.sin(t * 2 + P.x) * 0.12;
    if (Math.hypot(p.x - P.x, p.z - P.z) > 1.3 || Math.abs(p.y - P.y) > 1.8) continue;
    P.g.visible = false;
    if (P.scroll) {                                                    // нашёл записку — рецепт твой навсегда
      const r = RECIPES.find(x => x.id === P.scroll); kitchen(save).known[r.id] = true;
      puff(r.icon, new T.Vector3(P.x, P.y + 1.8, P.z), { size: 1.6, rise: 1.2, life: 2 }); puff('📜', new T.Vector3(P.x, P.y + 1, P.z), { size: 1.2 });
      ev = { say: `📜 Новый рецепт: ${r.icon} ${r.name}!<small>готовь на кухне 🍳 в своём домике</small>`, sfx: 'chest', recipe: r };
      continue;
    }
    left[P.key] = now + P.every * 1000;
    if (P.k === 'pumpkin') save.res.pumpkin = (save.res.pumpkin || 0) + 1; else { const H = kitchen(save).have; H[P.k] = (H[P.k] || 0) + 1; }
    puff(FOOD[P.k][0], new T.Vector3(P.x, P.y + 1.4, P.z), { size: 1, rise: 1.2 });
    ev = { say: `${FOOD[P.k][0]} +1 ${FOOD[P.k][1].toLowerCase()}<small>для кухни 🍳 в твоём домике</small>`, sfx: 'collect' };
  }
  return ev;
}

// ---------- окно кухни ----------
// o: { save, sfx, persist, eat(d) — съесть, feed(d) — питомцам, give(d) — второму игроку (если вдвоём), coop — готовить вдвоём }
let O = null, tab = 'book', cur = null;                            // cur — идёт готовка: { r, mode: solo/host/helper, … }
const $ = id => document.getElementById(id);
export function openKitchen(o) { O = o; tab = 'book'; cur = null; render(); openOv('cook'); }
export const kitchenOpen = () => $('cook').classList.contains('on');
// закрыли окно посреди готовки вдвоём — второму сказать
new MutationObserver(() => { if (!kitchenOpen() && cur && cur.mode !== 'solo' && !cur.over) { O?.coop?.send({ t: 'ck', a: 'cancel' }); cur = null; } }).observe($('cook'), { attributes: true, attributeFilter: ['class'] });
const stars = n => '⭐'.repeat(n) + '☆'.repeat(3 - n);
function tabs() {
  return `<div class="ktabs">${[['book', '📖 Рецепты'], ['shop', '🛒 Тётя Галя'], ['dish', '🍽 Мои блюда']].map(([k, t]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${t}</button>`).join('')}</div>`;
}
function render() {
  const S = O.save, K = kitchen(S), body = $('cookBody');
  let html = tabs();
  if (tab === 'book') html += '<div class="kgrid">' + RECIPES.map(r => {
    if (!knows(S, r.id)) return `<div class="kcard off"><div class="kic">📜</div><b>Секретный рецепт</b><small>записка спрятана<br>${r.find}</small></div>`;
    const ok = canCook(S, r);
    const ings = Object.entries(r.need).map(([k, n]) => `<span class="${have(S, k) >= n ? 'ok' : 'no'}" title="${FOOD[k][1]}">${FOOD[k][0]}${n > 1 ? '×' + n : ''}</span>`).join('');
    const miss = Object.entries(r.need).filter(([k, n]) => have(S, k) < n).map(([k]) => `${FOOD[k][0]} ${FOOD[k][2]}`).join('<br>');
    return `<div class="kcard"><div class="kic">${r.icon}</div><b>${r.name}</b><div class="king">${ings}</div><small>${r.what}</small><div class="kst">${K.best[r.id] ? stars(K.best[r.id]) : ''}</div>`
      + (ok ? `<button data-cook="${r.id}">🍳 Готовить</button>` : `<small class="kmiss">не хватает:<br>${miss}</small>`) + '</div>';
  }).join('') + '</div>' + (O.coop?.partnerHere() ? `<p class="khint">👫 ${O.coop.name} рядом — будете готовить вместе: мешаете оба, блюдо получат оба!</p>` : '');
  if (tab === 'shop') html += `<p class="khint">👩‍🍳 Тётя Галя: «Мука, молоко и сахар — у меня! Остальное найди сам: яйца у Курочки Рябы, ягоды и грибы в Лесу, снег в Зиме…»</p><div class="kgrid">`
    + Object.entries(SHOP).map(([k, price]) => `<div class="kcard"><div class="kic">${FOOD[k][0]}</div><b>${FOOD[k][1]}</b><small>у тебя: ${have(S, k)}</small><button data-buy="${k}" class="${S.coins >= price ? '' : 'no'}">${price} <i class="coin"></i></button></div>`).join('')
    + '</div><p class="khint">Твои продукты: ' + Object.keys(FOOD).map(k => `${FOOD[k][0]} ${have(S, k)}`).join(' · ') + '</p>';
  if (tab === 'dish') html += K.dishes.length ? '<div class="kgrid">' + K.dishes.map((d, i) => { const r = RECIPES.find(x => x.id === d.id); return `<div class="kcard"><div class="kic">${r.icon}</div><b>${r.name}</b><div class="kst">${stars(d.s)}</div><small>${r.what}</small><button data-eat="${i}">😋 Съесть</button><button data-feed="${i}" class="pet">🐾 Питомцам</button>${O.give && O.coop?.together() ? `<button data-give="${i}" class="give">💝 ${O.coop.dat}</button>` : ''}</div>`; }).join('') + '</div>'
      + '<p class="khint"><small>🐾 сытые питомцы приносят больше монет · жителям блюдо можно подарить — подойди к ним, появится кнопка 🍽️</small></p>'
    : '<p class="khint">Пока ничего нет — приготовь что-нибудь! 🍳<br><small>блюда можно съесть и потом — из рюкзака 🎒</small></p>';
  body.innerHTML = html;
  body.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { O.sfx.tap(); tab = b.dataset.t; render(); });
  body.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
    const k = b.dataset.buy, price = SHOP[k];
    if (S.coins < price) { O.sfx.nope(); return; }
    S.coins -= price; K.have[k] = (K.have[k] || 0) + 1; O.sfx.buy(); O.persist(); render();
  });
  const pick = b => { const d = K.dishes.splice(+b.dataset[Object.keys(b.dataset)[0]], 1)[0]; O.persist(); return d; };
  body.querySelectorAll('[data-eat]').forEach(b => b.onclick = () => { O.eat(pick(b)); render(); });
  body.querySelectorAll('[data-feed]').forEach(b => b.onclick = () => { O.feed(pick(b)); render(); });
  body.querySelectorAll('[data-give]').forEach(b => b.onclick = () => { O.give(pick(b)); render(); });
  body.querySelectorAll('[data-cook]').forEach(b => b.onclick = () => { O.sfx.tap(); cook(RECIPES.find(r => r.id === b.dataset.cook), O.coop?.partnerHere() ? 'host' : 'solo'); });
}

// ---------- готовка: три шага (вдвоём — host кладёт продукты, мешают оба, снимает любой) ----------
const NEED = Math.PI * 2 * 3;
function cook(r, mode) {
  const body = $('cookBody'), items = [];
  for (const [k, n] of Object.entries(r.need)) for (let i = 0; i < n; i++) items.push(k);
  cur = { r, mode, items, left: items.length, total: 0, step: 1, over: false, out: 0, sendT: 0 };
  if (mode === 'host') O.coop.send({ t: 'ck', a: 'start', id: r.id });
  const helper = mode === 'helper';
  body.innerHTML = `<div class="kstep" id="kStep">${helper ? `1. ${O.coop.name} кладёт продукты в кастрюлю… 👀` : '1. Положи продукты в кастрюлю 👇'}</div>
    ${mode !== 'solo' ? `<div class="kduo">👫 Готовим вместе с ${O.coop.tv}</div>` : ''}
    <div class="kpot" id="kPot"><div class="kring" id="kRing"></div><div class="kpan">🍲</div><div class="ksteam" id="kSteam">♨️</div></div>
    <div class="kitems" id="kItems">${items.map((k, i) => `<button data-i="${i}" ${helper ? 'disabled class="wait"' : ''}>${FOOD[k][0]}</button>`).join('')}</div>
    <div class="kheat" id="kHeat" hidden><div class="kgreen"></div><div class="kneedle" id="kNeedle"></div></div>
    <div id="kAct"></div>`;
  if (!helper) body.querySelectorAll('#kItems button').forEach(b => b.onclick = () => {
    if (b.disabled) return; addItem(+b.dataset.i);
    if (mode === 'host') O.coop.send({ t: 'ck', a: 'add', i: +b.dataset.i });
  });
}
function addItem(i) {
  const b = document.querySelector(`#kItems button[data-i="${i}"]`); if (!b || b.classList.contains('fly')) return;
  b.disabled = true; b.classList.add('fly'); O.sfx.pop?.();
  if (--cur.left === 0) setTimeout(stir, 450);
}
// 2. помешать: водить пальцем по кругу над кастрюлей (три оборота; вдвоём — обороты обоих складываются)
function stir() {
  if (!cur || cur.step !== 1) return;
  cur.step = 2;
  $('kStep').textContent = cur.mode === 'solo' ? '2. Помешай! Води пальцем по кругу 🥄' : '2. Мешайте вместе! Води пальцем по кругу 🥄';
  $('kItems').innerHTML = '';
  const pot = $('kPot'); pot.classList.add('stir');
  let last = null;
  const ang = e => { const R = pot.getBoundingClientRect(); return Math.atan2(e.clientY - (R.top + R.height / 2), e.clientX - (R.left + R.width / 2)); };
  pot.onpointerdown = e => { last = ang(e); pot.setPointerCapture?.(e.pointerId); };
  pot.onpointermove = e => {
    if (last === null || !cur || cur.step !== 2) return;
    const a = ang(e); let d = a - last; if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; last = a;
    stirBy(Math.abs(d));
    if (cur.mode !== 'solo') { cur.out += Math.abs(d); if (performance.now() - cur.sendT > 150) { O.coop.send({ t: 'ck', a: 'stir', v: +cur.out.toFixed(2) }); cur.out = 0; cur.sendT = performance.now(); } }
  };
  pot.onpointerup = pot.onpointercancel = () => { last = null; };
}
function stirBy(v) {
  if (!cur || cur.step !== 2) return;
  cur.total += v; $('kRing').style.setProperty('--p', Math.min(1, cur.total / NEED));
  $('kPot').querySelector('.kpan').style.transform = `rotate(${cur.total * 20}deg)`;
  if (cur.total >= NEED && cur.mode !== 'helper') { if (cur.mode === 'host') O.coop.send({ t: 'ck', a: 'heat' }); heat(); }   // перейти к огню решает хозяин кухни
}
// 3. снять с огня, когда стрелка в зелёном (вдвоём — снимает тот, кто первый нажал)
function heat() {
  if (!cur || cur.step === 3) return;
  cur.step = 3;
  const pot = $('kPot'); pot.onpointermove = pot.onpointerdown = null; pot.classList.remove('stir'); $('kRing').style.setProperty('--p', 1);
  O.sfx.tap();
  $('kStep').textContent = '3. Варится! Сними с огня, когда стрелка в зелёном 🟩';
  $('kHeat').hidden = false; $('kSteam').classList.add('on');
  $('kAct').innerHTML = '<button id="kOff" class="kbig">🧤 Снять с огня!</button>';
  const t0 = performance.now(); let pos = 0;
  (function tick() { if (!cur || cur.step !== 3) return; pos = (Math.sin((performance.now() - t0) / 520 - Math.PI / 2) + 1) / 2; $('kNeedle').style.left = (pos * 100) + '%'; cur.raf = requestAnimationFrame(tick); })();
  $('kOff').onclick = () => {
    const d = Math.abs(pos - 0.5), s = d < 0.08 ? 3 : d < 0.2 ? 2 : 1;
    if (cur.mode === 'helper') { O.coop.send({ t: 'ck', a: 'off', s }); $('kAct').innerHTML = '<small>⏳ снимаем…</small>'; }
    else finish(s);
  };
}
// готово: у хозяина кухни продукты тратятся, блюдо — ему (и второму игроку, если готовили вместе)
function finish(s) {
  if (!cur || cur.over) return;
  cancelAnimationFrame(cur.raf); cur.over = true;
  const r = cur.r, S = O.save, K = kitchen(S);
  if (cur.mode !== 'helper') for (const [k, n] of Object.entries(r.need)) take(S, k, n);
  K.dishes.push({ id: r.id, s }); K.best[r.id] = Math.max(K.best[r.id] || 0, s);
  if (cur.mode === 'host') O.coop.send({ t: 'ck', a: 'done', id: r.id, s });
  O.persist(); O.sfx[s === 3 ? 'fanfare' : 'levelUp']?.(); O.onCooked?.(r, s);
  const duo = cur.mode !== 'solo';
  $('cookBody').innerHTML = `<div class="kdone"><div class="kic big">${r.icon}</div><b>${r.name}</b><div class="kst big">${stars(s)}</div>
    <p>${s === 3 ? 'Идеально! Как у настоящего повара 👩‍🍳' : s === 2 ? 'Вкусно! Почти идеально' : 'Получилось! В следующий раз сними чуть точнее'}${duo ? `<br>👫 Приготовили вместе — блюдо есть и у ${O.coop.rod}!` : ''}</p>
    <button id="kEat" class="kbig">😋 Съесть сейчас</button> <button id="kKeep" class="kbig gray">🎒 Оставить на потом</button></div>`;
  $('kEat').onclick = () => { const i = K.dishes.length - 1, d = K.dishes.splice(i, 1)[0]; O.persist(); O.eat(d); cur = null; tab = 'book'; render(); };
  $('kKeep').onclick = () => { O.sfx.tap(); cur = null; tab = 'dish'; render(); };
}

// ---------- вдвоём: что прислал второй игрок про готовку ----------
// helper — гость в чужом доме: открывает кухню «помогать», ждёт, когда хозяин начнёт
export function openHelper(o) {
  O = o; cur = null;
  $('cookBody').innerHTML = `<div class="kdone"><div class="kic big">👩‍🍳</div><b>Кухня ${o.coop.rod}</b><p>Ждём, когда ${o.coop.name.toLowerCase() === 'мама' ? 'мама' : 'Мотя'} начнёт готовить —<br>будем мешать вместе! 🥄</p><small>готовит хозяин дома, а блюдо получите оба</small></div>`;
  openOv('cook');
}
export function coopMsg(m, o) {
  if (m.a === 'start') {                                    // хозяин начал готовить — открыть у себя и помогать
    O = o; const r = RECIPES.find(x => x.id === m.id); if (!r) return;
    if (!kitchenOpen()) openOv('cook');
    cook(r, 'helper'); O.sfx.tap();
    return;
  }
  if (!cur) return;
  if (m.a === 'add' && cur.mode === 'helper') addItem(m.i);
  if (m.a === 'stir') stirBy(m.v);
  if (m.a === 'heat' && cur.mode === 'helper') { cur.total = NEED; heat(); }
  if (m.a === 'off' && cur.mode === 'host') finish(m.s);
  if (m.a === 'done' && cur.mode === 'helper') finish(m.s);
  if (m.a === 'cancel') { cur = null; if (kitchenOpen()) { $('cookBody').innerHTML = `<p class="khint">🙈 ${O.coop.name} ${O.coop.name === 'Мама' ? 'отошла' : 'отошёл'} от плиты — готовка отменилась</p>`; setTimeout(() => { if (!cur && kitchenOpen()) closeOv($('cook')); }, 1800); } }
}
// что даёт блюдо с такими звёздочками
export function dishFx(d) { const r = RECIPES.find(x => x.id === d.id), k = MUL[d.s] || 1, f = {}; for (const [n, v] of Object.entries(r.fx)) f[n] = n === 'party' ? v : Math.round(v * k); return { r, f }; }
export const dishOf = d => RECIPES.find(x => x.id === d.id);
