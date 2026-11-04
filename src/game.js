// Правила: украл яйцо → унёс в загон → оно вылупилось → питомец приносит монеты → прокачка → новые зоны.
import { B } from './balance.js';
import { T, scene, sky } from './engine.js';
import { PEN, level, portals, unlockPortal, clearLevel, groundY, bake } from './world.js';
import { LOCS, backFrom, defineAllNests, STARS_IN, petHouse } from './locations.js';
import { updateFun, addPad, nearestFind } from './fun.js';
import { updateExtras } from './extras.js';
import { spawnVasya, updateVasya } from './vasya.js';
import { updateTrack } from './track.js';
import { updateAutumn } from './autumn.js';
import { FRIENDS, spawnFriends, updateFriends, befriend, heartsOf, metFriend, meet, MAX_HEARTS } from './friends.js';
import { startKidGame, updateKidGame, kidGameOn } from './kidgames.js';
import { buildKids, updateKidSpots, startMini, updateMini, miniGame, miniOn } from './kids.js';
import { buildPlayground, updatePlayground } from './playground.js';
import { dressHero, ward, openWardrobe, wardOpen } from './clothes.js';
import { buildHouse, updateHouse, onClothesPad, updateHome, onWardPad, onUpgradePad, openUpgrades } from './home.js';
import { openSpot, openBasket } from './furniture.js';
import { buildRareBox, updateRareBox } from './rarebox.js';
import { openMap } from './map.js';
import { questNow, questNext } from './quests.js';
import { nests, buildNests, updateNests, nestNear, takeEgg, returnEgg, releaseNest, refillLeft,
  buildIncubators, incubators, freeIncubator, placeEgg, updateIncubators, setIncSlots, eggMesh, setLuck, VARIANT_NAME, VARIANT_INFO } from './eggs.js';
import { buildPlots, refreshPlot, onPlotPad, PLOTS, effectText, buildMailbox, updateMailbox, nearMailbox } from './buildings.js';
import { buildGuards, updateGuards, wake, dropBanana } from './guards.js';
import { RARITY, SPECIES, rollPet, buildPen, updatePen, petIncome, petName, rebuildPen, penIncome, fmt, setPenBonus, addPending, modelThumb } from './pets.js';
import { buildBase, onShopPad, onTreadmill, updateTreadmill } from './base.js';
import { updateCraft, onBenchPad, TOOLS, RES, RECIPES, SCROLL_WHERE, known, made, canCraft, craft } from './craft.js';
import { save, persist, profile, stored } from './save.js';
import { takeNote, resetNotes, takeKidNote, kidNoteReady } from './notes.js';
import { setCoins, setSun, setSpeed, setItems, toast, petNote, notify, bindNotes, bindBook, openShop, shopOpen, setRes, openCraft, bindInventory, craftOpen, fade, setStars, setEffects, setQuest, openBuilding, openFusion, showNote, onBellHold, setKidHud } from './ui.js';
import { puff, confetti, sprite, emojiTex, makeLabel, fireworks } from './fx.js';
import { SFX } from './sfx.js';

// баланс — в balance.js
const { SPEED_MAX, PEN_MAX, INC_MAX, speedCost, treadNeed, INC_COST, penCost, BANANA_COST, BANANA_PACK, SURPRISE_COST, POTION_COST, COMPASS_COST } = B;
export const speedMul = lv => 1 + B.SPEED_STEP * (lv - 1);

let hero, carry = null, fullWarn = 0, wasOnPad = false, wasOnBench = false, wasOnPlot = null, wasMail = false, wasOnCloth = false, wasOnWard = false, wasOnUp = false;
const tmp = new T.Vector3();

let cam = null, portalCool = 0, moving = false;

export function initGame(h, camera) {
  hero = h; cam = camera; hero.carrying = null;
  if (!save.chests) save.chests = {}; if (save.chestAt) { save.chests.tower = save.chestAt; delete save.chestAt; }   // старое сохранение
  if (!save.build) save.build = {}; if (!save.daily) save.daily = { last: 0, streak: 0 }; if (!save.eggs) save.eggs = {};
  save.inc.forEach((e, i) => { if (e && incubators[i]) placeEgg(incubators[i], e.r, e.end, null, e.loc, e.v); });
  setIncSlots(save.incSlots);
  rebuildPen(save.pets, save.penCap);
  if (!save.notes) save.notes = []; bindNotes(save.notes, persist);
  document.getElementById('mapBtn').onclick = () => { SFX.tap(); openMap({ loc: level.id, hero: { x: hero.pos.x, z: hero.pos.z, face: hero.face }, save }); };
  // маме: держать 🔔 3 секунды — записки Василия с нуля (для проверки)
  if (profile === 'mama') onBellHold(() => {
    if (!confirm('Сбросить записки Василия и начать с первой?')) return;
    resetNotes(save); save.notes = save.notes.filter(n => !n.keep); bindNotes(save.notes, persist); persist(); toast('🐱 Записки сброшены — заходи в лес');
  });
  applyBonuses();
  offlineIncome();
  defineAllNests();
  bindBook(() => save.found, { all: EGG_KINDS, seen: () => save.eggs, thumb: e => modelThumb('egg:' + e.key, sc => ({ root: eggMesh(sc, e.r, 1, e.v) }), { yaw: 0.3, size: 128 }) },
    { list: () => FRIENDS.map(f => ({ name: f.name, place: f.place, met: metFriend(save, f.id), hearts: heartsOf(save, f.id), max: MAX_HEARTS,
      tip: f.special || `любит ${f.k === 'banana' ? '🍌' : RES[f.k]}`, thumb: modelThumb('friend:' + f.id, s => f.build(s), { yaw: 0.5, size: 160, dist: 1.6 }) })) });
  bindInventory(inventory);
  dressHero(hero.model, ward(save).wear);          // купленная одежда — на героя
  enter('base', LOCS.base.spawn);
}

// ---------- строения: что они дают ----------
const lvl = id => save.build[id] || 0;
const DECO = ['fountain', 'flowers', 'statue'];
function applyBonuses() {
  const deco = DECO.reduce((k, id) => k + (lvl(id) ? B.BUILD[id].deco : 0), 0);
  setPenBonus((save.tools.house ? 1.25 : 1) * (1 + B.BUILD.feeder.bonus * lvl('feeder')) * (1 + deco));
  setLuck(1 + B.BUILD.beacon.luck * lvl('beacon'));
}
// время вылупления: быстрое яйцо и Инкубаторная ускоряют
const hatchTime = (r, v) => RARITY[r].hatch * (v === 'quick' ? 0.4 : 1) * (1 - B.BUILD.hatchery.faster * lvl('hatchery')) * 1000;
// копилка: пока игра была закрыта, питомцы зарабатывали (часть дохода, не дольше, чем вмещает копилка)
function offlineIncome() {
  const lv = lvl('bank'), away = (Date.now() - (save.lastSeen || Date.now())) / 1000;
  if (!lv || away < 60) return;
  const gain = Math.floor(penIncome() * B.OFFLINE_RATE * Math.min(away, B.BUILD.bank.hours[lv - 1] * 3600));
  if (gain <= 0) return;
  addPending(gain);
  notify({ icon: '🏦', title: `Пока тебя не было: +${fmt(gain)} монет`, text: 'забери их на золотой плите у загона' });
  setTimeout(() => toast(`🏦 Пока тебя не было, питомцы заработали ${fmt(gain)}<small>монеты ждут на золотой плите у загона</small>`), 800);
}
// все виды яиц для коллекции: 7 редкостей × (обычное + 6 особых)
const EGG_KINDS = RARITY.flatMap((R, r) => [null, ...Object.keys(B.VARIANTS)].map(v => ({ key: `${r}:${v || 'plain'}`, r, v, name: (v ? VARIANT_NAME[v] + ' ' : '') + R.name.toLowerCase() })));

// перейти в локацию: всё старое убираем, строим новое, героя ставим на точку появления.
// Яйцо в руках остаётся в руках (оно — часть героя)
function enter(id, spawn) {
  clearLevel(); level.id = id;
  const L = LOCS[id];
  sky(L.sky);
  const w = L.build(save, profile);
  buildNests(id); buildGuards(nests);
  if (id === 'base') { buildBase(); buildIncubators(); setIncSlots(save.incSlots); buildPen(save.pets, save.penCap); buildPlots(save); buildMailbox(); spawnVasya(); }
  spawnFriends(id, save);                          // друзья: Ряба на базе, Ёжик, Совёнок, Лисичка, Медвежонок в лесу
  buildKids(id, w);                                // места для игр детей: футбол, боулинг, цветные плиты, челнок
  if (id === 'base') { buildPlayground(w || scene); buildHouse(w || scene, profile, save); }
  buildRareBox(id, save);                          // сундучок с редкой одеждой (база, лес, осень)   // качели, карусель, пузыри, мяч; свой домик и ларёк одежды
  if (w) bake(w);                                  // неподвижное склеиваем — меньше работы видеокарте
  hero.pos.set(spawn.x, groundY(spawn.x, spawn.z), spawn.z); hero.vel.set(0, 0, 0);
  hero.face = spawn.face; hero.model.root.rotation.y = spawn.face; hero.safe = hero.pos.clone();
  hero.swing = hero.climb = null; hero.stun = 0;
  cam.yaw = spawn.face + Math.PI; cam.init = false;
  portalCool = 1;
}
function goThrough(pt) {
  if (moving) return;
  moving = true; SFX.portal();
  const from = level.id;
  fade(true, () => {
    enter(pt.to, pt.spawn || (pt.to === 'base' ? backFrom(from) : LOCS[pt.to].spawn)); fade(false); moving = false;
    // маме на входе в лес — записка от Василия
    if (pt.to === 'forest' && profile === 'mama') {
      // если игра открыта ещё в одной вкладке и та ушла по запискам дальше — продолжаем с её места, а не повторяем
      const disk = stored()?.vasya, mine = save.vasya;
      if (disk && (!mine || disk.round > mine.round || (disk.round === mine.round && disk.i > mine.i))) save.vasya = disk;
      const note = takeNote(save);
      if (note) { notify({ icon: '🐱', title: 'Записка от Василия', text: note.t, love: note.love, keep: true, read: true }); showNote(note, SFX); }
    }
  });
}

function dropCarry() {
  hero.model.root.remove(carry.mesh);
  carry = hero.carrying = null;
}
// Моте — записка от мамы за маленький подвиг (не чаще раза в полторы минуты)
function kidMoment() {
  if (profile !== 'motya' || !kidNoteReady(save)) return;
  const note = takeKidNote(save);
  notify({ icon: '💌', title: 'Записка от мамы', text: note.t, keep: true, read: true });
  showNote(note, SFX);
}
// дружба выросла на сердечко: награда; на 5-м — лучшие друзья и редкое яйцо
function friendUp(f, h) {
  const hearts = '❤️'.repeat(h) + '🤍'.repeat(MAX_HEARTS - h);
  SFX.fanfare(); confetti(hero.pos, 50); stat('friendHearts');
  if (h < MAX_HEARTS) {
    const coins = B.FRIEND_GIFT[h - 1] || 0; save.coins += coins;
    setTimeout(() => toast(`💕 ${f.name}: дружба ${hearts}<small>подарок другу — ответный подарок тебе: +${coins} монет</small>`), 1800);
    notify({ icon: '💕', title: `${f.name}: ${hearts}`, text: `дружба крепнет! +${coins} монет` });
  } else {
    // лучшие друзья: редкое яйцо в инкубатор (или кристаллы, если все заняты)
    const inc = freeIncubator(); let gift;
    if (inc) { placeEgg(inc, B.FRIEND_BEST_EGG, Date.now() + hatchTime(B.FRIEND_BEST_EGG, null), null, 'forest', null); saveInc(); gift = 'эпическое яйцо — уже в инкубаторе 🥚'; }
    else { save.res.crystal = (save.res.crystal || 0) + B.FRIEND_BEST_CRYSTALS; gift = `${B.FRIEND_BEST_CRYSTALS} кристаллов 💎`; }
    setTimeout(() => toast(`💛 ${f.name}: вы лучшие друзья!<small>подарок: ${gift}</small>`), 1800);
    notify({ icon: '💛', title: `${f.name} — лучший друг!`, text: `подарок: ${gift}` });
  }
  persist(); setTimeout(kidMoment, 3500);
}
const stat = k => { (save.stats || (save.stats = {}))[k] = (save.stats[k] || 0) + 1; persist(); };

// клад: монеты, кристаллы, иногда предмет
function digPrize() {
  stat('digs'); SFX.star();
  const x = Math.random(), coins = 80 + Math.floor(Math.random() * 120);
  save.coins += coins;
  let extra = '';
  if (x < 0.4) { const n = 1 + Math.floor(Math.random() * 3); save.res.crystal = (save.res.crystal || 0) + n; extra = ` и ${n} 💎`; }
  else if (x < 0.6) { if (!save.items) save.items = {}; save.items.potion = (save.items.potion || 0) + 1; extra = ' и зелье 🧪'; }
  else if (x < 0.8) { save.bananas += 2; extra = ' и 2 банана 🍌'; }
  persist(); confetti(hero.pos, 40);
  toast(`💰 Клад! +${coins} монет${extra}<small>новый клад тут будет завтра</small>`);
}
// колодец желаний: бросил 25 монет — что-то выпало
function wish() {
  if (save.coins < 25) { SFX.nope(); toast('🪙 Нужно 25 монет, чтобы бросить в колодец'); return; }
  save.coins -= 25; const x = Math.random(); let t;
  if (x < 0.35) t = 'Плюх… 💧 желание запомнено!';
  else if (x < 0.65) { save.coins += 40; t = '+40 монет 🪙'; }
  else if (x < 0.8) { save.bananas += 1; t = 'банан 🍌'; }
  else if (x < 0.93) { save.res.crystal = (save.res.crystal || 0) + 1; t = 'кристалл 💎'; }
  else { save.coins += 250; t = 'ДЖЕКПОТ! +250 монет 🎉'; confetti(hero.pos, 60); }
  SFX.coins(); persist(); toast(`🪙 Колодец: ${t}`);
}
// бобр: сдать готовое задание или напомнить, что нужно
function talkBeaver(qs) {
  meet(save, 'borya');
  if (!qs) { toast('🦫 Спасибо за всё! Ты лучший помощник в лесу 💛'); return; }
  if (!qs.ready) { toast(`🦫 ${qs.q.text}<small>сейчас ${qs.have} из ${qs.q.goal} · награда: ${qs.q.rewardText}</small>`); SFX.tap(); return; }
  const r = qs.q.reward; qs.q.take?.(save);
  if (r.coins) save.coins += r.coins;
  if (r.crystal) save.res.crystal = (save.res.crystal || 0) + r.crystal;
  if (r.bananas) save.bananas += r.bananas;
  for (const [k, n] of Object.entries(r.items || {})) { if (!save.items) save.items = {}; save.items[k] = (save.items[k] || 0) + n; }
  let egg = '';
  if (r.egg) { const inc = freeIncubator(); if (inc) { placeEgg(inc, 3, Date.now() + hatchTime(3, 'rainbow'), null, 'forest', 'rainbow'); saveInc(); } else { save.coins += 2000; egg = ' (инкубаторы заняты — вместо яйца +2000 монет)'; } }
  questNext(save); persist(); SFX.fanfare(); confetti(hero.pos, 70);
  const bh = befriend(save, 'borya'); if (bh) setTimeout(() => friendUp(FRIENDS.find(f => f.id === 'borya'), bh), 2500);   // задания — это дружба с Борей
  const next = questNow(save);
  toast(`🦫 Спасибо! Держи: ${qs.q.rewardText}${egg}<small>${next ? 'новое задание: ' + next.q.text : 'это было последнее задание!'}</small>`);
  notify({ icon: '🦫', title: 'Задание бобра выполнено', text: `награда: ${qs.q.rewardText}` });
  kidMoment();
}

function saveInc() { save.inc = incubators.map(i => i.full ? { r: i.r, end: i.end, loc: i.loc, v: i.v } : null); persist(); }

// предметы с кнопками над прыжком: банан и ловушка падают позади героя, батут встаёт перед ним
const ITEMS = [{ id: 'banana', icon: '🍌' }, { id: 'trap', icon: '🪤' }, { id: 'pad', icon: '🟥' }, { id: 'potion', icon: '🧪' }, { id: 'compass', icon: '🧭' }];
const itemCount = id => id === 'banana' ? save.bananas : (save.items?.[id] || 0);
function useItem(id) {
  if (itemCount(id) <= 0 || hero.climb) return;
  // на Дорожке батут перебросил бы через ворота — там каждого зверя надо пройти честно
  if (id === 'pad' && level.id === 'track') { SFX.nope(); toast('🟥 На Дорожке батут не работает<small>каждого зверя — только честно!</small>'); return; }
  if (id === 'banana') save.bananas--; else save.items[id]--;
  persist();
  // зелье и компас включаются, когда нажал; повторное нажатие добавляет время
  if (id === 'potion') { hero.boostT = (hero.boostT || 0) + B.POTION_TIME; SFX.levelUp(); puff('🧪', hero.pos.clone().setY(hero.pos.y + 3.4), { size: 1.4 }); return; }
  if (id === 'compass') { hero.compassT = (hero.compassT || 0) + B.COMPASS_TIME; SFX.tap(); puff('🧭', hero.pos.clone().setY(hero.pos.y + 3.4), { size: 1.4 }); return; }
  const dir = id === 'pad' ? 1 : -1, f = new T.Vector3(Math.sin(hero.face), 0, Math.cos(hero.face));
  const pos = hero.pos.clone().addScaledVector(f, dir * (id === 'pad' ? 2.6 : 1.6));
  if (id === 'pad') { addPad(pos.x, pos.z); SFX.place(); return; }
  const m = sprite(emojiTex(id === 'trap' ? '🪤' : '🍌'), id === 'trap' ? 1.4 : 1.1); m.position.set(pos.x, groundY(pos.x, pos.z) + 0.5, pos.z); scene.add(m);
  dropBanana(pos, m, id); SFX.banana();
}

function levelUp() {
  save.speed++; save.tread = 0; persist();
  confetti(hero.pos); puff('👟', hero.pos.clone().setY(hero.pos.y + 3.4), { size: 1.6 }); SFX.levelUp();
}

// подсказки в магазине: что даёт покупка сейчас и зачем она нужна
function speedGoal() {
  const next = Object.values(LOCS).filter(L => L.req > save.speed).sort((a, b) => a.req - b.req)[0];
  if (!next) return 'все места уже открыты — быстрее убегать от сторожей';
  const left = next.req - save.speed;
  return `${next.icon} ${next.name} откроется на уровне ${next.req} — ещё ${left}`;
}
const eggsRow = (n, add) => '🥚'.repeat(n) + (add ? ' + 🥚' : '');
function penNow() {
  const n = save.pets.length, wait = n - save.penCap;
  return wait > 0 ? `у тебя ${n} питомцев — ${wait} ждут места и не приносят монет!` : `у тебя ${n} питомцев — места пока хватает`;
}
const shopItems = () => [
  { icon: '👟', name: 'Скорость', what: 'бегаешь быстрее — сторожа не догонят. Бесплатно — на беговой дорожке',
    now: save.speed < SPEED_MAX ? `уровень ${save.speed} → ${save.speed + 1} · бег +${Math.round(B.SPEED_STEP * 100)}%` : `уровень ${save.speed} — самый быстрый`,
    goal: speedGoal(),
    cost: save.speed < SPEED_MAX ? speedCost(save.speed) : null, buy() { save.coins -= speedCost(save.speed); levelUp(); } },
  { icon: '🥚', name: 'Инкубатор', what: 'сколько яиц высиживается одновременно',
    now: save.incSlots < INC_MAX ? `${eggsRow(save.incSlots, true)} → ${save.incSlots + 1} ${save.incSlots + 1 < 5 ? 'яйца' : 'яиц'} сразу` : `${eggsRow(save.incSlots)} — больше не поместится`,
    goal: 'приносишь яйца, а все гнёзда заняты? — бери ещё',
    cost: save.incSlots < INC_MAX ? INC_COST[save.incSlots] : null, buy() { save.coins -= INC_COST[save.incSlots]; save.incSlots++; setIncSlots(save.incSlots); persist(); } },
  { icon: '🏡', name: 'Загон', what: 'монеты приносят только питомцы, которые гуляют в загоне',
    now: save.penCap < PEN_MAX ? `мест ${save.penCap} → ${save.penCap + B.PEN_STEP} · сейчас +${fmt(penIncome())} в секунду` : `${save.penCap} мест — загон самый большой`,
    goal: penNow(),
    cost: save.penCap < PEN_MAX ? penCost(save.penCap) : null, buy() { save.coins -= penCost(save.penCap); save.penCap += B.PEN_STEP; rebuildPen(save.pets, save.penCap); persist(); } },
  { icon: '🍌', name: `Бананы ×${BANANA_PACK}`, what: 'жёлтая кнопка 🍌 бросает шкурку позади — сторож поскользнётся и отстанет',
    now: `у тебя ${save.bananas} 🍌`, goal: 'помогает унести яйцо от быстрого сторожа',
    cost: BANANA_COST, buy() { save.coins -= BANANA_COST; save.bananas += BANANA_PACK; persist(); } },
  { icon: '🎁', name: 'Яйцо-сюрприз', what: 'сразу ложится в инкубатор; иногда попадается редкое',
    now: freeIncubator() ? 'обычное, редкое или даже легендарное, бывает особое — повезёт?' : 'все инкубаторы заняты — подожди, пока кто-то вылупится',
    goal: 'красть всё равно интереснее 😉',
    cost: freeIncubator() ? SURPRISE_COST : null, maxText: 'занято', buy() {
      save.coins -= SURPRISE_COST; const x = Math.random(), r = x < 0.45 ? 0 : x < 0.75 ? 1 : x < 0.92 ? 2 : x < 0.99 ? 3 : 4;
      const vs = Object.keys(B.VARIANTS), v = Math.random() < 0.25 ? vs[Math.floor(Math.random() * vs.length)] : null;
      placeEgg(freeIncubator(), r, Date.now() + hatchTime(r, v), null, 'forest', v); seeEgg(r, v); saveInc();
    } },
  { icon: '🧪', name: 'Зелье скорости', what: `кнопка 🧪 над прыжком — выпей, когда надо: ${B.POTION_TIME} секунд бежишь намного быстрее`,
    now: `у тебя ${itemCount('potion')} 🧪`, goal: 'пей прямо в погоне — от самого быстрого сторожа',
    cost: POTION_COST, buy() { save.coins -= POTION_COST; (save.items || (save.items = {})).potion = itemCount('potion') + 1; persist(); } },
  { icon: '🧭', name: 'Компас', what: `кнопка 🧭 над прыжком — ${B.COMPASS_TIME} секунд стрелка показывает на ближайший спрятанный свиток 📜 (а когда их нет — на звезду ⭐)`,
    now: `у тебя ${itemCount('compass')} 🧭`, goal: 'включай там, где ещё что-то не найдено',
    cost: COMPASS_COST, buy() { save.coins -= COMPASS_COST; (save.items || (save.items = {})).compass = itemCount('compass') + 1; persist(); } },
];

// верстак: материалы → инструменты → найденные рецепты (ненайденные — с подсказкой, где искать)
function craftSections() {
  const row = r => {
    const lockedR = !known(r, save);
    return {
      icon: r.icon, name: r.name,
      info: lockedR ? `рецепт не найден — ищи свиток 📜 ${SCROLL_WHERE[r.id] || ''}` : r.info + (r.type === 'mat' ? ` · есть ${save.res[r.id] || 0}` : r.type === 'item' ? ` · есть ${itemCount(r.give || r.id)}` : ''),
      chips: Object.entries(r.need).map(([k, n]) => ({ icon: RES[k], have: save.res[k] || 0, need: n })),
      state: lockedR ? 'locked' : made(r, save) ? 'done' : canCraft(r, save) ? 'can' : 'no',
      make() {
        craft(r, save); persist(); SFX.craft();
        if (r.id === 'house' && level.id === 'base') { petHouse(); confetti(new T.Vector3(-26, 0, 36.5), 60); }   // домик встаёт в загоне сразу
        if (r.type !== 'mat') { confetti(hero.pos, 50); puff(r.icon, hero.pos.clone().setY(hero.pos.y + 3.4), { size: 1.8, rise: 0.8, life: 2 }); }
      },
    };
  };
  return [
    { title: 'Материалы', rows: RECIPES.filter(r => r.type === 'mat').map(row) },
    { title: 'Инструменты', rows: RECIPES.filter(r => !r.scroll && !r.autumn && r.type !== 'mat').map(row) },
    { title: 'Рецепты из свитков 📜', rows: RECIPES.filter(r => r.scroll).map(row) },
    { title: 'Осенние поделки 🍂 — из желудей и тыкв', rows: RECIPES.filter(r => r.autumn).map(row) },
  ];
}

// окно строения на участке
function buildingInfo(pl) {
  const D = B.BUILD[pl.id], lv = lvl(pl.id), max = lv >= D.max, cost = max ? null : D.cost(lv + 1);
  return {
    icon: pl.icon, name: pl.name + (lv && D.max > 1 ? ` · уровень ${lv}` : ''), what: pl.what,
    now: lv ? effectText(pl.id, lv) : 'участок продаётся',
    next: max ? '' : effectText(pl.id, lv + 1) + (D.max > 1 ? ` (уровень ${lv + 1} из ${D.max})` : ''),
    cost, afford: cost !== null && save.coins >= cost, missing: cost === null ? 0 : cost - save.coins,
    buyText: lv ? '⬆ Улучшить' : '🔨 Построить',
    buy() {
      save.coins -= cost; save.build[pl.id] = lv + 1; persist(); applyBonuses(); refreshPlot(save, pl.id);
      confetti(new T.Vector3(pl.x, 0, pl.z), 60); SFX.fanfare();
      notify({ icon: pl.icon, title: lv ? `${pl.name}: уровень ${lv + 1}` : `Построено: ${pl.name}`, text: effectText(pl.id, lv + 1) });
    },
    extra: pl.id === 'fusion' && lv ? { label: '🔮 Слить питомцев', fn: () => openFusion(fusionGroups, SFX) } : null,
  };
}
// машина слияния: 3 одинаковых (вид и «ступень») → 1 на ступень выше: обычный → большой → золотой → радужный
const tier = p => p.rainbow ? 3 : p.gold ? 2 : p.big ? 1 : 0;
const TIER_NAME = ['обычный', 'большой', 'золотой', 'радужный'];
function fusionGroups() {
  const groups = {};
  for (const p of save.pets) { const k = p.s + ':' + tier(p); (groups[k] || (groups[k] = [])).push(p); }
  return Object.values(groups).filter(g => g.length >= 3 && tier(g[0]) < 3).map(g => {
    const t = tier(g[0]);
    return {
      s: g[0].s, n: g.length, name: petName(g[0]), next: `${TIER_NAME[t + 1]} ${SPECIES[g[0].s].name.toLowerCase()}`,
      merge() {
        for (const p of g.slice(0, 3)) save.pets.splice(save.pets.indexOf(p), 1);
        const data = { s: g[0].s, big: true, gold: t + 1 === 2, rainbow: t + 1 === 3 };
        save.pets.push(data); rebuildPen(save.pets, save.penCap); persist();
        notify({ pet: data.s, title: `🔮 Слияние: ${petName(data)}`, text: `+${fmt(petIncome(data))} монет в секунду` });
        toast(`🔮 Получился ${petName(data)}!`);
      },
    };
  });
}
// найденное яйцо — в коллекцию
function seeEgg(r, v) {
  const k = `${r}:${v || 'plain'}`;
  if (save.eggs[k]) return;
  save.eggs[k] = true; persist();
  if (v) toast(`🥚 Новое яйцо: ${VARIANT_NAME[v]} ${RARITY[r].name.toLowerCase()}<small>${VARIANT_INFO[v]}</small>`);
}
// ежедневный подарок: раз в 20 часов; дни подряд — подарок больше; на 7-й день — редкое яйцо
function claimDaily() {
  const now = Date.now(), d = save.daily;
  d.streak = now - d.last < 48 * 3600 * 1000 ? Math.min(d.streak + 1, B.DAILY_STREAK_MAX) : 1;
  d.last = now;
  const coins = Math.round(Math.max(150, penIncome() * 120) * d.streak), cr = d.streak;   // ~2 минуты дохода × дни подряд
  save.coins += coins; save.res.crystal = (save.res.crystal || 0) + cr;
  let egg = '';
  if (d.streak >= 3 && freeIncubator()) { const r = d.streak >= 7 ? 4 : d.streak >= 5 ? 3 : 2; placeEgg(freeIncubator(), r, now + hatchTime(r, 'quick'), null, 'forest', 'quick'); seeEgg(r, 'quick'); saveInc(); egg = ` и быстрое ${RARITY[r].name.toLowerCase()} яйцо`; }
  persist(); SFX.chest(); confetti(hero.pos, 80);
  toast(`📬 День ${d.streak} подряд: +${fmt(coins)} монет, +${cr} 💎${egg}<small>завтра подарок будет больше!</small>`);
  notify({ icon: '📬', title: `Подарок дня ${d.streak}`, text: `+${fmt(coins)} монет, +${cr} кристаллов${egg}` });
}

// рюкзак: ресурсы, инструменты, предметы, находки
const ITEM_INFO = { banana: ['Банан', 'сторож поскользнётся'], trap: ['Ловушка', 'сторож посидит в клетке'], pad: ['Батут', 'ставится перед тобой'], potion: ['Зелье скорости', `${B.POTION_TIME} с быстрого бега`], compass: ['Компас', 'стрелка к спрятанному'] };
function inventory() {
  const RES_NAME = { wood: 'Брёвна', stone: 'Камни', crystal: 'Кристаллы', leaf: 'Листья', plank: 'Доски', brick: 'Кирпичи', thread: 'Нити', acorn: 'Жёлуди', pumpkin: 'Тыквы' };
  const stars = id => Object.keys(save.stars || {}).filter(k => k.startsWith(id + '-')).length;
  return [
    { title: 'Ресурсы и материалы', cells: Object.keys(RES).map(k => ({ icon: RES[k], n: save.res[k] || 0, name: RES_NAME[k], dim: !save.res[k] })) },
    { title: 'Предметы', cells: ITEMS.map(i => ({ icon: i.icon, n: itemCount(i.id), name: ITEM_INFO[i.id][0], sub: ITEM_INFO[i.id][1], dim: !itemCount(i.id), use: itemCount(i.id) ? () => useItem(i.id) : null })) },
    { title: 'Инструменты — навсегда', cells: TOOLS.map(t => ({ icon: t.icon, name: t.name, sub: save.tools[t.id] ? t.info : known(t, save) ? 'сделай на верстаке 🔨' : 'найди свиток 📜', dim: !save.tools[t.id] })) },
    { title: 'Находки', cells: [
      ...Object.entries(STARS_IN).map(([id, n]) => ({ icon: '⭐', n: `${stars(id)}/${n}`, name: `${LOCS[id].icon} ${LOCS[id].name}`, sub: 'звёзды', dim: !stars(id) })),
      { icon: '📜', n: `${Object.keys(save.recipes || {}).length}/${RECIPES.filter(r => r.scroll).length}`, name: 'Рецепты', sub: 'свитки', dim: !Object.keys(save.recipes || {}).length },
      { icon: '🐾', n: `${Object.keys(save.found || {}).length}`, name: 'Питомцы', sub: 'видов найдено' },
    ] },
  ];
}

// стрелка компаса над героем
const arrow = (() => {
  const g = new T.Group(); g.userData.keep = true; g.visible = false;
  const m = new T.MeshBasicMaterial({ color: 0xffd23f });
  const shaft = new T.Mesh(new T.BoxGeometry(0.25, 0.25, 1.2), m); shaft.position.z = 0.2; g.add(shaft);
  const head = new T.Mesh(new T.ConeGeometry(0.45, 0.8, 4), m); head.rotation.x = Math.PI / 2; head.position.z = 1.1; g.add(head);
  g.rotation.order = 'YXZ';                     // сначала поворот по сторонам, потом наклон вверх-вниз
  scene.add(g); return g;
})();
const arrowLabel = (() => { const l = makeLabel(3.6, 0.9); l.userData.keep = true; l.visible = false; scene.add(l); return l; })();

export function updateGame(dt) {
  const now = Date.now(), p = hero.pos;
  if (updateNests(dt)) SFX.refill();
  setSun(refillLeft());

  const atBase = level.id === 'base';

  // порталы: закрытый открывается, когда хватает скорости; вошёл в открытый — переход
  portalCool -= dt;
  for (const pt of portals) {
    if (pt.locked && save.speed >= pt.req) { unlockPortal(pt); confetti(new T.Vector3(pt.x, 0, pt.z + 2), 60); SFX.fanfare(); toast(`${pt.label}: портал открыт! 🎉`); notify({ icon: '🚪', title: `${pt.label}: портал открыт`, text: 'там новые гнёзда и новые питомцы' }); }
    if (pt.locked) {
      pt.lockSign.userData.set(`🔒 👟 ${save.speed} из ${pt.req}`, { color: '#ffe14d' });
      // подошёл к закрытому порталу — объясняем, что делать
      const near = Math.abs(p.x - pt.x) < pt.w / 2 + 2 && Math.abs(p.z - pt.z) < 7;
      if (near && !pt.told) {
        const left = pt.req - save.speed;
        toast(`${pt.label}: портал откроется на скорости 👟 ${pt.req} — ещё ${left} ${left === 1 ? 'уровень' : left < 5 ? 'уровня' : 'уровней'}<small>прокачай скорость в магазине 🛒 или бесплатно на беговой дорожке 👟</small>`);
        SFX.nope();
      }
      pt.told = near;
    }
    const along = pt.side ? p.z - pt.z : p.x - pt.x, across = pt.side ? p.x - pt.x : p.z - pt.z;   // портал в боковой стене повёрнут
    if (!pt.locked && portalCool <= 0 && !hero.climb && Math.abs(along) < pt.w / 2 && Math.abs(across) < 1.2 && p.y - groundY(pt.x, pt.z) < 4) goThrough(pt);
  }

  // подошёл к гнезду — яйцо само прыгает в руки, сторож просыпается
  if (!carry && hero.stun <= 0) {
    const n = nestNear(p);
    if (n) {
      carry = hero.carrying = takeEgg(n);
      hero.model.root.add(carry.mesh); carry.mesh.position.set(0, 2.95 + carry.mesh.scale.y * 0.5, 0.1);
      wake(n); SFX.pick(); seeEgg(carry.r, carry.v);
    }
  }
  hero.boostT = Math.max(0, (hero.boostT || 0) - dt); hero.compassT = Math.max(0, (hero.compassT || 0) - dt); hero.dashT = Math.max(0, (hero.dashT || 0) - dt);
  hero.speedMul = speedMul(save.speed) * (carry ? B.CARRY[carry.r] * (carry.v === 'giant' ? 0.9 : 1) : 1) * (hero.boostT > 0 ? B.POTION_MUL : 1) * (hero.dashT > 0 ? 1.8 : 1);   // редкое и огромное яйцо тяжелее; стрелки разгоняют
  hero.jumpMul = save.tools.boots ? 1.15 : 1;      // прыжок на треть выше (высота растёт как квадрат скорости)
  hero.canGlide = !!save.tools.umbrella;
  applyBonuses();

  // глубокая вода (озеро): плюх — и герой снова на берегу, где стоял последний раз
  if (hero.grounded && p.y > -0.6) { if (!hero.dry) hero.dry = new T.Vector3(); if ((hero.dryT = (hero.dryT || 0) - dt) <= 0) { hero.dry.copy(p); hero.dryT = 0.4; } }
  if (p.y < -2 && hero.dry) { puff('💦', p.clone().setY(0.5), { size: 1.8, rise: 1 }); SFX.caught(); p.copy(hero.dry); hero.vel.set(0, 0, 0); toast('💦 Глубоко! Прыгай по кочкам'); }

  // сторож догнал — яйцо летит обратно в гнездо
  const caught = updateGuards(dt, hero);
  if (caught && carry) {
    const c = carry; c.mesh.getWorldPosition(tmp); dropCarry(); returnEgg(c, tmp.clone());
    hero.stun = 1.1; puff('💫', p.clone().setY(p.y + 2.6), { size: 1.4, rise: 0.5 }); SFX.caught();
  }

  // с яйцом в загоне — кладём в свободный инкубатор
  const inPen = atBase && p.x > PEN.x0 && p.x < PEN.x1 && p.z > PEN.z0 && p.z < PEN.z1;
  if (carry && inPen) {
    const inc = freeIncubator();
    if (inc) {
      const c = carry; c.mesh.getWorldPosition(tmp); dropCarry(); releaseNest(c.nest);
      placeEgg(inc, c.r, now + hatchTime(c.r, c.v), tmp.clone(), c.nest.pet || c.nest.loc, c.v);   // pet — гнездо своего зверя (горилла)
      if (c.nest.loc === 'forest') stat('eggsForest');
      SFX.place(); saveInc();
    } else if (now > fullWarn) { fullWarn = now + 2500; puff('⏳', p.clone().setY(3.6), { size: 1.5 }); SFX.nope(); }
  }

  // вылупились: в загоне гуляют лучшие, сколько помещается
  for (const { inc, r, loc, v } of updateIncubators(now)) {
    const data = rollPet(r, loc, v);
    if (v === 'crystal') { const n = 3 + r; save.res.crystal = (save.res.crystal || 0) + n; toast(`💎 Кристальное яйцо: +${n} кристаллов`); }
    save.pets.push(data); stat('hatched'); rebuildPen(save.pets, save.penCap, { data, from: new T.Vector3(inc.x, 0, inc.z) });
    SFX.hatch();
    const fresh = !save.found[data.s];                 // такого ещё не было — подарок
    let reward = 0;
    if (fresh) { save.found[data.s] = true; reward = petIncome(data) * B.FIRST_FIND; save.coins += reward; }
    petNote(data, reward, fresh);
    saveInc();
  }

  // наступил на копилку — забрал монеты
  const got = updatePen(dt, p);
  if (got) { save.coins += got; SFX.coins(); persist(); }

  // беговая дорожка: стоишь на ней — растёт скорость
  const onT = atBase && !carry && onTreadmill(p) && save.speed < SPEED_MAX;
  hero.animSpeed = onT && hero.speed < 1 ? 9 : null;               // бежит на месте
  if (onT) {
    if (hero.speed < 1) hero.face = Math.PI;
    save.tread += dt * (lvl('stadium') ? B.BUILD.stadium.train[lvl('stadium') - 1] : 1); if (save.tread >= treadNeed(save.speed)) levelUp(); else if (Math.random() < dt) persist();
  }
  updateTreadmill(dt, save.speed, save.tread / treadNeed(save.speed), onT);

  // встал на зелёную плиту у магазина — открылся магазин
  const onPad = atBase && onShopPad(p);
  if (onPad && !wasOnPad && !shopOpen()) { SFX.tap(); openShop(shopItems, () => save.coins, SFX); }
  wasOnPad = onPad;

  // встал на плиту перед участком — открылось окно строения
  const plot = atBase ? onPlotPad(p) : null;
  if (plot && plot !== wasOnPlot) { SFX.tap(); openBuilding(() => buildingInfo(plot), SFX); }
  wasOnPlot = plot;
  // почтовый ящик: подарок дня
  if (atBase) {
    const left = Math.max(0, (save.daily.last + B.DAILY_EVERY * 1000 - now) / 1000);
    updateMailbox(left === 0, left);
    const atMail = nearMailbox(p);
    if (atMail && !wasMail) { if (left === 0) claimDaily(); else toast(`📪 Следующий подарок через ${Math.floor(left / 3600)} ч ${Math.floor(left % 3600 / 60)} мин<small>заходи каждый день — подарок растёт!</small>`); }
    wasMail = atMail;
  }

  // крафт: собрать, срубить, разбить, залезть
  const ev = updateCraft(dt, hero, save);
  for (const k of new Set(ev.sfx)) SFX[k]();
  if (ev.coins) save.coins += ev.coins;
  if (ev.sfx.length) persist();
  if (ev.opened) { SFX.fanfare(); kidMoment(); }      // разбил стену или разрубил завал

  // встал на синюю плиту у верстака — открылся верстак
  const onBench = atBase && onBenchPad(p);
  if (onBench && !wasOnBench && !craftOpen()) {
    SFX.tap();
    openCraft(craftSections, SFX);
  }
  wasOnBench = onBench;

  // звёзды, батуты, зверушки
  const fe = updateFun(dt, hero, save);
  if (fe.star) { save.coins += B.STAR_COINS; SFX.star(); persist(); if (p.y - groundY(p.x, p.z) > 4) kidMoment(); }   // звезда высоко — подвиг
  if (fe.bounce) SFX.boing();
  if (fe.plate) SFX.tap();
  if (fe.puzzle) {
    // загадка: раз в 10 минут за неё дают монеты и кристаллы; звезда появляется один раз
    const last = (save.puzzles || (save.puzzles = {}))[fe.puzzle] || 0;
    if (now - last > 600000) { save.puzzles[fe.puzzle] = now; save.coins += 200; save.res.crystal = (save.res.crystal || 0) + 2; persist(); toast('🗿 Плиты зажглись! +200 монет, +2 💎'); }
    SFX.fanfare(); confetti(p, 60); kidMoment();
  }
  if (fe.scroll) {
    const r = RECIPES.find(x => x.id === fe.scroll); SFX.star(); persist();
    toast(`📜 Новый рецепт: ${r.icon} ${r.name}!<small>сделай на верстаке 🔨 на базе</small>`);
    notify({ icon: r.icon, title: `📜 Новый рецепт: ${r.name}`, text: `${r.info} — сделай на верстаке 🔨` });
    kidMoment();
  }
  // кот Василий гуляет по базе; подойди и постой рядом — погладишь
  if (atBase) {
    const ve = updateVasya(dt, hero);
    if (ve.meow) { SFX.meow(); meet(save, 'vasya'); }
    if (ve.purr) SFX.purr();
    if (ve.petted) { const h = befriend(save, 'vasya'); if (h) friendUp(FRIENDS.find(f => f.id === 'vasya'), h); else if (!hero.vasyaToday) toast('🐱 Мур-мур! Василий доволен 💛'); hero.vasyaToday = true; }
  }

  // друзья: подошёл — разговор, есть подарок — дружба растёт
  const fr = updateFriends(dt, hero, save);
  if (fr.say) { SFX.tap(); toast(fr.say); }
  if (fr.up) friendUp(fr.up.f, fr.up.h);
  // игры с Елисеем: догонялки и прятки
  if (fr.game && !kidGameOn() && !miniOn()) {
    if (miniGame(fr.game)) { if (startMini(fr.game, hero, save)) SFX.tap(); }   // игры остальных детей (kids.js)
    else { startKidGame(fr.game, fr.n); SFX.tap(); }                             // что за игра — крупно по центру (setKidHud)
  }
  const kg = updateKidGame(dt, hero), mg = updateMini(dt, hero);
  setKidHud(kg.hud || mg.hud);                   // крупно по центру: отсчёт, таймер, «горячо — холодно», счёт
  for (const k of mg.sfx || []) k.startsWith('note') ? SFX.note(+k.slice(4)) : SFX[k]?.();
  if (mg.say && !mg.win && !mg.lose) toast(mg.say);
  if (mg.win) {
    SFX.fanfare(); confetti(p, 60); stat('kidWins');
    let up = false;
    for (const f of mg.kids) { const h = befriend(save, f.id); if (h) { friendUp(f, h); up = true; } }
    if (!up) save.coins += 30;
    persist(); toast(mg.say + (up ? '' : '<small>+30 монет</small>'));
  }
  if (mg.lose) { SFX.nope(); toast(mg.say); }
  const ks = updateKidSpots(dt, hero);           // футбольный мяч на базе — можно пинать и без игры
  if (ks.sfx) SFX.kick();
  if (ks.goal) { SFX.fanfare(); toast('⚽ ГОЛ!<small>позови Колю и Олю — сыграем на счёт</small>'); }
  // магазин одежды на базе и шкаф дома: встал на коврик — открылось окно
  const onCloth = atBase && onClothesPad(p), onWard = level.id === 'home' && onWardPad(p);
  if ((onCloth && !wasOnCloth || onWard && !wasOnWard) && !wardOpen()) { SFX.tap(); openWardrobe({ save, profile, hero: hero.model, shop: onCloth, sfx: SFX, persist }); }
  wasOnCloth = onCloth; wasOnWard = onWard;
  // сундучок с нарядом: редкая одежда, которой нет в магазине
  const rb = updateRareBox(dt, hero);
  if (rb.item) {
    SFX.chest(); stat('rareFound'); persist();
    toast(`🎁 Сундучок! Редкая вещь: ${rb.item.icon} ${rb.item.name}<small>надень её в магазине одежды 👕 или в шкафу дома${rb.left ? '' : ' · здесь ты нашёл всё — следующие сундучки с монетами'}</small>`);
    notify({ icon: rb.item.icon, title: `🎁 Редкая вещь: ${rb.item.name}`, text: 'такой нет в магазине — надень её в шкафу или в магазине одежды' });
    setTimeout(kidMoment, 2500);
  }
  if (rb.coins) { save.coins += rb.coins; SFX.coins(); persist(); toast(`🎁 Сундучок! +${rb.coins} монет<small>все редкие вещи этого места уже твои</small>`); }
  if (atBase) updateHouse(dt);
  if (level.id === 'home' || level.id === 'loft') {   // мебель: встал на кнопку места — выбираешь, что поставить; на лежанке — питомцы
    const he = updateHome(dt, hero);
    const onUp = level.id === 'home' && onUpgradePad(p);                       // доска «Улучшения дома»: второй этаж
    if (onUp && !wasOnUp && !wardOpen()) { SFX.tap(); openUpgrades({ save, sfx: SFX, persist, onBuy: () => { toast('🪜 Второй этаж построен!<small>лестница наверх — слева от двери</small>'); confetti(p, 80); } }); }
    wasOnUp = onUp;
    for (const k of he.sfx || []) k.startsWith('note') ? SFX.note(+k.slice(4)) : SFX[k]?.();
    if (!wardOpen() && he.spot) { SFX.tap(); openSpot(he.spot - 1, { save, sfx: SFX, persist }); }
    if (!wardOpen() && he.basket) { SFX.tap(); openBasket({ save, sfx: SFX, persist }); }
  }
  if (atBase) {
    const pg = updatePlayground(dt, hero);
    for (const k of new Set(pg.sfx)) SFX[k]();
    if (pg.say) toast(pg.say);
    if (pg.coins) save.coins += pg.coins;
  }
  if (kg.count) SFX.tap();
  if (kg.go) SFX.levelUp();
  if (kg.win || kg.lose) {
    const vanya = FRIENDS.find(f => f.id === 'vanya');
    if (kg.win) {
      SFX.fanfare(); confetti(p, 50); stat('kidWins');
      const h = befriend(save, 'vanya');
      if (h) friendUp(vanya, h); else { save.coins += 30; persist(); }
      toast(kg.win === 'tag' ? '🎉 Елисей: Ой, догнал! Ты быстрый!' : '🎉 Елисей: Нашёл! Ну ты и следопыт!');
    } else { SFX.nope(); toast(kg.lose === 'tag' ? '😜 Елисей: Ха-ха, не догнал! Подойди — сыграем ещё!' : '😜 Елисей: Я тут был! Подойди — сыграем ещё!'); }
  }

  // канатки, гонка, клады, колодец, стрелки и бобр
  const qs = questNow(save);
  const xe = updateExtras(dt, hero, save, { has: !!qs, ready: !!qs?.ready });
  if (xe.zip) { stat('zips'); SFX.boing(); }
  if (xe.raceStart) { SFX.tap(); toast('⭕ Гонка! Пробеги все кольца по порядку'); }
  if (xe.ring) SFX.coins();
  if (xe.raceWin) {
    stat('races'); SFX.fanfare();
    const first = !save.stars?.[xe.raceWin]; (save.stars || (save.stars = {}))[xe.raceWin] = true;
    save.coins += 150; persist(); toast(`🏁 Успел! +150 монет${first ? ' и ⭐' : ''}`); kidMoment();
  }
  if (xe.raceLose !== undefined) { SFX.nope(); toast(`⏱ Время вышло — ${xe.raceLose} колец. Попробуй ещё!<small>встань на синюю плиту старта</small>`); }
  if (xe.needPick) { SFX.nope(); toast('❌ Тут клад! Нужна кирка ⛏️<small>сделай её на верстаке 🔨</small>'); }
  if (xe.dig) digPrize();
  if (xe.well) wish();
  if (xe.dash !== undefined) { hero.dashT = 1.2; hero.vel.x = Math.sin(xe.dash) * 22; hero.vel.z = Math.cos(xe.dash) * 22; hero.face = xe.dash; SFX.boing(); }

  // Осенняя долина: кучи листьев, колесо, горка, тыквы, жёлуди, яблоки
  if (level.id === 'autumn') {
    const ae = updateAutumn(dt, hero, save);
    for (const k of new Set(ae.sfx)) SFX[k]();
    for (const [k, n] of Object.entries(ae.got || {})) save.res[k] = (save.res[k] || 0) + n;
    if (ae.coins) save.coins += ae.coins;
    if (ae.say) toast(ae.say);
    if (ae.sfx && ae.sfx.length) persist();
  }

  // Дорожка: унёс яйцо за свою линию — зверь закручивается и исчезает, открывается следующий
  if (level.id === 'track') {
    const te = updateTrack(dt, hero, save);
    if (te.dash !== undefined) { hero.dashT = 1.2; hero.vel.x = Math.sin(te.dash) * 22; hero.vel.z = Math.cos(te.dash) * 22; hero.face = te.dash; SFX.boing(); }
    if (te.win) {
      const R = te.win.round, coins = B.trackWin(te.win.k, R); save.coins += coins; stat('trackWins'); persist();
      SFX.fanfare(); confetti(p, te.win.boss ? 160 : 70);
      if (te.win.boss) {
        // праздник: небо темнеет, как вечером, и над Дорожкой — фейерверк
        sky(0x2c3270); fireworks(p.clone(), 12, () => SFX.boom());
        setTimeout(() => { if (level.id === 'track') sky(LOCS.track.sky); }, 7500);
        const egg = { 1: 'огненное яйцо 🔥', 2: 'ледяное яйцо ❄️', 3: 'солнечное яйцо ✨' }[Math.min(R, 3)];
        toast(`🏆 ${te.win.name} побеждён! +${fmt(coins)} монет<small>${egg} твоё — неси его в загон. Открыт круг ${R + 1}: звери сильнее, яйца реже!</small>`);
        notify({ icon: '🐉', title: `Круг ${R} пройден!`, text: `${egg} — твоё. В следующий раз — круг ${R + 1}: новые звери, быстрее, яйца реже` });
      } else toast(`🌀 Пуф! ${te.win.name} закручивается и исчезает… +${fmt(coins)} монет<small>ворота открыты — дальше ${te.win.next}</small>`);
      setTimeout(kidMoment, 2500);          // записка — после того, как зверь докрутится и исчезнет
      const mh = befriend(save, 'misha'); if (mh) setTimeout(() => friendUp(FRIENDS.find(f => f.id === 'misha'), mh), 4500);   // тренер гордится
    }
  }
  if (xe.talk) talkBeaver(qs);
  setQuest(qs ? `🦫 ${qs.q.short} ${qs.have}/${qs.q.goal}${qs.ready ? ' ✅' : ''}` : null);

  // компас: стрелка над головой смотрит на ближайшую находку
  const goal = hero.compassT > 0 ? nearestFind(p) : null;
  arrow.visible = arrowLabel.visible = !!goal;
  if (goal) {
    // стрелка смотрит прямо на находку — и вверх-вниз тоже; под ней — сколько идти и выше или ниже
    const dx = goal.x - p.x, dz = goal.z - p.z, dy = goal.y - (p.y + 1.4), flat = Math.hypot(dx, dz);
    arrow.position.set(p.x, p.y + 4.2, p.z);
    arrow.rotation.set(-Math.atan2(dy, Math.max(flat, 0.1)), Math.atan2(dx, dz), 0);
    arrowLabel.position.set(p.x, p.y + 5.3, p.z);
    const up = dy > 2.5 ? ' ⬆ выше' : dy < -2.5 ? ' ⬇ ниже' : '';
    arrowLabel.userData.set(flat < 3 ? (up ? up.trim() : 'тут! 👀') : `${Math.round(flat)} м${up}`, { color: '#ffe14d' });
  }
  const total = STARS_IN[level.id] || 0;
  setStars(Object.keys(save.stars || {}).filter(k => k.startsWith(level.id + '-')).length, total);

  setEffects([['🧪', hero.boostT], ['🧭', hero.compassT], ['⏱', xe.raceT]]);
  setCoins(save.coins); setSpeed(save.speed); setItems(ITEMS.map(i => ({ ...i, n: itemCount(i.id) })), useItem);
  setRes(save.res, level.id === 'autumn');
}

