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
import { updatePlane } from './easter.js';
import { FOOD, kitchen, buildPickups, updatePickups, openKitchen, kitchenOpen, dishFx, RECIPES as DISHES, openHelper, coopMsg, bestDish, dishOf } from './food.js';
import { updateWinter, throwBall, remoteBall, setSnowman, winterAmmo, sled as sledMesh } from './winter.js';
import { friendNear, canTreat, treatFriend } from './friends.js';
import { FRIENDS, spawnFriends, updateFriends, befriend, heartsOf, metFriend, meet, MAX_HEARTS } from './friends.js';
import { startKidGame, updateKidGame, kidGameOn } from './kidgames.js';
import { buildKids, updateKidSpots, startMini, updateMini, miniGame, miniOn } from './kids.js';
import { buildPlayground, updatePlayground } from './playground.js';
import { dressHero, ward, openWardrobe, wardOpen } from './clothes.js';
import { buildHouse, updateHouse, onClothesPad, updateHome, onWardPad, onUpgradePad, openUpgrades, onKitchenPad } from './home.js';
import { openSpot, openBasket } from './furniture.js';
import { buildRareBox, updateRareBox } from './rarebox.js';
import { initDuo, duoToggle, duoState, together, houseFor, homeSave, visiting, applySide, buildDuoBase, updateDuo, duoAt, duoWhere, duoResume, duoMe, initSpy, spyTarget, spyInfo, duoLink, duoPartner, onDuoExtra, duoSend, partnerPos } from './duo.js';
import { panel } from './furniture.js';
import { net, qrHost, qrAccept, duoOff } from './net.js';
import { makeQR, scanQR } from './qr.js';
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

export const SPY = new URLSearchParams(location.search).has('spy');
const SPY_ON = false;                                   // наблюдатель вернётся, когда будет сервер-посредник   // наблюдатель 👁 (duo.js)
let wasOnKit = false;
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
  document.getElementById('mapBtn').onclick = () => { SFX.tap(); const d = duoAt(); openMap({ loc: level.id, hero: { x: hero.pos.x, z: hero.pos.z, face: hero.face }, save, duo: d && { ...d, loc: duoWhere(), name: profile === 'mama' ? 'Мотя' : 'Мама' } }); };
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
  if (SPY) initSpyMode();
  else {
    initDuo({ hero, save, profile, onLayout: relayout, onEvent: duoEvent });
    onDuoExtra(winterMsg);                          // снежки и снеговики второго игрока
    document.getElementById('duoBtn').onclick = () => { SFX.tap(); duoPanel(); };
    duoResume();
  }
  enter('base', LOCS.base.spawn);
}

// ---------- строения: что они дают ----------
const lvl = id => save.build[id] || 0;
const DECO = ['fountain', 'flowers', 'statue'];
function applyBonuses() {
  const deco = DECO.reduce((k, id) => k + (lvl(id) ? B.BUILD[id].deco : 0), 0);
  setPenBonus((save.tools.house ? 1.25 : 1) * (1 + B.BUILD.feeder.bonus * lvl('feeder')) * (1 + deco) * (fedLeft() > 0 ? FED_MUL : 1));   // сытые питомцы — больше монет
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
function enter(id, spawn, owner = null) {
  clearLevel(); level.id = id;
  level.owner = id === 'home' || id === 'loft' ? owner || duoMe() : null;     // чей дом (вдвоём можно зайти в гости)
  const L = LOCS[id];
  sky(L.sky);
  if (id === 'base') applySide();                   // вдвоём Мотин загон — справа
  const w = level.owner ? L.build(homeSave(level.owner), level.owner) : L.build(save, profile);
  buildNests(id); buildGuards(nests);
  if (id === 'base') { buildBase(); buildIncubators(); setIncSlots(save.incSlots); buildPen(save.pets, save.penCap); buildPlots(save); buildMailbox(); spawnVasya(); }
  spawnFriends(id, save);                          // друзья: Ряба на базе, Ёжик, Совёнок, Лисичка, Медвежонок в лесу
  buildKids(id, w);                                // места для игр детей: футбол, боулинг, цветные плиты, челнок
  if (id === 'base') { buildPlayground(w || scene); buildHouse(w || scene, duoMe(), save, houseFor(duoMe())); buildDuoBase(w || scene); }
  buildPickups(id, save);                                // продукты для кухни: яйца, яблоки, ягоды, грибы, мёд, снег, какао
  buildRareBox(id, save);                          // сундучок с редкой одеждой (база, лес, осень)   // качели, карусель, пузыри, мяч; свой домик и ларёк одежды
  if (w) bake(w);                                  // неподвижное склеиваем — меньше работы видеокарте
  hero.pos.set(spawn.x, groundY(spawn.x, spawn.z), spawn.z); hero.vel.set(0, 0, 0);
  hero.face = spawn.face; hero.model.root.rotation.y = spawn.face; hero.safe = hero.pos.clone();
  hero.swing = hero.climb = null; hero.stun = 0;
  hero.sled = false; hero.ice = false;                // санки и каток — только в Зимней долине
  cam.yaw = spawn.face + Math.PI; cam.init = false;
  portalCool = 1;
}
function goThrough(pt) {
  if (moving) return;
  moving = true; SFX.portal();
  const from = level.id;
  const owner = pt.owner || ((pt.to === 'home' || pt.to === 'loft') ? level.owner : null), wasOwner = level.owner;
  fade(true, () => {
    const H = houseFor(wasOwner), out = from === 'home' ? { x: H.door.x, z: H.door.z - 2.4, face: Math.PI } : null;   // из дома — к его двери
    enter(pt.to, pt.spawn || (pt.to === 'base' ? out || backFrom(from) : LOCS[pt.to].spawn), owner); fade(false); moving = false;
    if (pt.to === 'home' && visiting() && pt.owner) toast(`🏠 В гостях у ${profile === 'mama' ? 'Моти' : 'мамы'}!<small>смотреть можно, а мебель переставляет хозяин</small>`);
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
const itemCount = id => id === 'treat' ? kitchen(save).dishes.length : id === 'snowball' ? winterAmmo() : id === 'banana' ? save.bananas : (save.items?.[id] || 0);
function useItem(id) {
  if (itemCount(id) <= 0 || hero.climb) return;
  // на Дорожке батут перебросил бы через ворота — там каждого зверя надо пройти честно
  if (id === 'treat') { treatNear(); return; }                                    // угостить жителя блюдом 🍽️
  if (id === 'snowball') { const b = throwBall(hero); if (b) { SFX.jump(); duoSend({ t: 'wb', b }); } return; }   // снежок ❄️ (Зимняя долина)
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
    { title: 'Продукты для кухни 🍳', cells: Object.keys(FOOD).map(k => { const n = k === 'pumpkin' ? (save.res.pumpkin || 0) : (kitchen(save).have[k] || 0); return { icon: FOOD[k][0], n, name: FOOD[k][1], sub: FOOD[k][2], dim: !n }; }) },
    { title: 'Блюда — съешь, будет польза', cells: kitchen(save).dishes.length ? kitchen(save).dishes.map((d, i) => { const r = DISHES.find(x => x.id === d.id); return { icon: r.icon, name: r.name, sub: '⭐'.repeat(d.s) + ' · ' + r.what, use: () => { const dd = kitchen(save).dishes.splice(i, 1)[0]; persist(); eatDish(dd); } }; }) : [{ icon: '🍳', name: 'Пока нет', sub: 'готовь на кухне в своём домике', dim: true }] },
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
  updateDuo(dt);
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
  hero.jumpT = Math.max(0, (hero.jumpT || 0) - dt); hero.jumpMul = hero.jumpT > 0 ? 1.3 : 1;   // грибной суп и мороженое — прыжок выше
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
  const onCloth = atBase && onClothesPad(p), onWard = level.id === 'home' && !visiting() && onWardPad(p);
  if ((onCloth && !wasOnCloth || onWard && !wasOnWard) && !wardOpen()) { SFX.tap(); openWardrobe({ save, profile, hero: hero.model, shop: onCloth, sfx: SFX, persist }); }
  wasOnCloth = onCloth; wasOnWard = onWard;
  // продукты для кухни: подошёл — забрал
  const food = updatePickups(dt, hero, save);
  if (food) { SFX[food.sfx]?.(); toast(food.say); persist(); if (food.recipe) notify({ icon: '📜', title: `Новый рецепт: ${food.recipe.icon} ${food.recipe.name}`, text: 'готовь на кухне в своём домике' }); }
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
  if (atBase && profile === 'mama') updatePlane(dt);   // пасхалка для мамы: самолётик с растяжкой «Юля ❤️»
  if (level.id === 'home' || level.id === 'loft') {   // мебель: встал на кнопку места — выбираешь, что поставить; на лежанке — питомцы
    const he = updateHome(dt, hero, profile);
    const onUp = level.id === 'home' && !visiting() && onUpgradePad(p);                       // доска «Улучшения дома»: второй этаж
    if (onUp && !wasOnUp && !wardOpen()) { SFX.tap(); openUpgrades({ save, sfx: SFX, persist, onBuy: () => { toast('🪜 Второй этаж построен!<small>лестница наверх — слева от двери</small>'); confetti(p, 80); } }); }
    wasOnUp = onUp;
    const onKit = level.id === 'home' && onKitchenPad(p);                       // кухня 🍳: встал на оранжевый коврик у плиты (в гостях — помогать готовить)
    if (onKit && !wasOnKit && !wardOpen() && !kitchenOpen()) { SFX.tap(); if (visiting()) openHelper(kitOpts()); else openKitchen(kitOpts()); }
    wasOnKit = onKit;
    for (const k of he.sfx || []) k.startsWith('note') ? SFX.note(+k.slice(4)) : SFX[k]?.();
    if (visiting()) he.spot = he.basket = null;          // в гостях — только смотреть
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

  // Зимняя долина: снегопад, снежки, снеговики, горка на санках, каток
  if (level.id === 'winter') {
    const we = updateWinter(dt, hero, partnerPos);
    for (const k of new Set(we.sfx)) SFX[k]?.();
    if (we.coins) { save.coins += we.coins; persist(); }
    if (we.say) toast(we.say);
    if (we.sm) { duoSend({ t: 'sm', ...we.sm }); persist(); }          // снеговик меняется у обоих
    if (we.built) { stat('snowmen'); setTimeout(kidMoment, 2500); }
    if (we.hitPartner) { snowScore.me++; duoSend({ t: 'wh' }); const O = OTHER(); toast(`❄️ Попал${profile === 'mama' ? 'а' : ''} в ${O.vin}!<small>счёт ${snowScore.me} : ${snowScore.them}</small>`); }
  } else hero.ice = false;
  // санки под героем, пока он едет с горки
  if (hero.sled && !hero.sledM) hero.sledM = sledMesh(hero.model.root, 0, -0.35, 0);
  if (!hero.sled && hero.sledM) { hero.model.root.remove(hero.sledM); hero.sledM = null; }

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

  fedCheck();
  setEffects([['🧪', hero.boostT], ['🦘', hero.jumpT], ['🐾', fedLeft()], ['🧭', hero.compassT], ['⏱', xe.raceT]]);
  setCoins(save.coins); setSpeed(save.speed); setItems([...(kitchen(save).dishes.length && friendNear(hero) ? [{ id: 'treat', icon: '🍽️' }] : []), ...(level.id === 'winter' ? [{ id: 'snowball', icon: '❄️' }] : []), ...ITEMS].map(i => ({ ...i, n: itemCount(i.id) })), useItem);
  setRes(save.res, level.id === 'autumn');
}


// ---------- вдвоём 👫 ----------
const OTHER = () => profile === 'mama' ? { im: 'Мотя', vin: 'Мотю', tv: 'Мотей', he: 'он' } : { im: 'Мама', vin: 'маму', tv: 'мамой', he: 'она' };
// игра вдвоём по QR: один показывает код, второй сканирует и показывает свой, первый сканирует ответ
let duoMsg = '', duoQR = '', duoQRfor = '';
async function duoPanel() {
  const st = duoState(), O = OTHER(), step = net.step;
  const btn = (id, text, bg) => `<button id="${id}" style="font:inherit;font-weight:bold;font-size:1.05em;padding:10px 18px;margin:4px;border:none;border-radius:16px;background:${bg};color:#fff;cursor:pointer">${text}</button>`;
  const err = duoMsg ? `<div style="color:#d8261a;margin:6px 0"><b>${duoMsg}</b></div>` : '';
  let html;
  if (st === 'on') html = `✅ Играем вместе с ${O.tv}!<br><small>${profile === 'mama' ? 'Загон и домик Моти — справа' : 'Твой загон и домик — справа, мамины — слева'}. В домик можно зайти в гости.</small><br><br>${btn('duoEnd', 'Закончить', '#ff7a6b')}`;
  else if (step === 'offer' || step === 'answer') {
    if (duoQRfor !== net.code) { duoQRfor = net.code; duoQR = await makeQR(net.code); }
    html = step === 'offer'
      ? `<b>1.</b> Пусть ${O.im.toLowerCase() === 'мама' ? 'мама' : 'Мотя'} нажмёт 👫 → «📷 Сканировать код» и наведёт камеру сюда:<br><img src="${duoQR}" style="width:min(64vw,300px);image-rendering:pixelated;margin:8px auto;display:block;background:#fff;border-radius:8px"><b>2.</b> Потом на экране у ${O.im === 'Мама' ? 'мамы' : 'Моти'} появится ответный код — отсканируй его:<br>${err}${btn('duoScan', '📷 Сканировать ответ', '#3fa7ff')}${btn('duoEnd', 'Отмена', '#9aa0aa')}`
      : `Почти готово! Пусть ${O.im === 'Мама' ? 'мама' : 'Мотя'} нажмёт «📷 Сканировать ответ» и наведёт камеру сюда:<br><img src="${duoQR}" style="width:min(64vw,300px);image-rendering:pixelated;margin:8px auto;display:block;background:#fff;border-radius:8px">${err}<small>соединимся сами, как только ${O.he} отсканирует</small><br>${btn('duoEnd', 'Отмена', '#9aa0aa')}`;
  } else if (step === 'joining') html = `⏳ Соединяемся…<br><small>телефоны должны быть в одной Wi-Fi</small><br><br>${btn('duoEnd', 'Отмена', '#9aa0aa')}`;
  else html = `Играть вместе с ${O.tv} — оба телефона в одной домашней Wi-Fi.<br><small>Один показывает код, второй сканирует его камерой — и наоборот. Каждый играет со своим загоном, домиком и монетами.</small><br>${err}<br>${btn('duoShow', '📱 Показать код', '#5fd35f')}${btn('duoScan', '📷 Сканировать код', '#3fa7ff')}`;
  panel('👫 Вдвоём', null, html);
  const on = (id, f) => { const b = document.getElementById(id); if (b) b.onclick = () => { SFX.tap(); f(); }; };
  on('duoShow', async () => { duoMsg = ''; document.getElementById('wardList').innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px">⏳ Готовим код…</div>'; await qrHost(); duoBtn(); duoPanel(); });
  on('duoScan', async () => {
    duoMsg = '';
    const r = await scanQR(net.step === 'offer' ? `Наведи камеру на код на телефоне ${O.im === 'Мама' ? 'мамы' : 'Моти'}` : 'Наведи камеру на QR-код на другом телефоне');
    if (!r) { duoPanel(); return; }
    if (r.error) duoMsg = r.error === 'camera' ? 'Разреши игре камеру: Safari спросит «Разрешить доступ к камере?» — нажми «Разрешить»' : 'Камера не включилась';
    else duoMsg = await qrAccept(r.text);
    duoBtn(); duoPanel();
  });
  on('duoEnd', () => { duoMsg = ''; duoOff(); duoBtn(); duoPanel(); });
}
function duoBtn() { const b = document.getElementById('duoBtn'); b.dataset.st = duoState(); }
function duoEvent(e) {
  duoBtn();
  const O = OTHER();
  if (e === 'on') { SFX.fanfare(); toast(profile === 'mama' ? '👫 Мотя пришёл! Играем вместе' : '👫 Ты у мамы! Играем вместе'); }
  if (e === 'left') toast(`👋 ${O.im} ${profile === 'mama' ? 'закончил' : 'закончила'} игру вдвоём`);
  if (e === 'lost') toast(`📶 Связь с ${O.tv} пропала<small>чтобы играть дальше, нажмите 👫 и снова обменяйтесь кодами</small>`);
  if (e === 'fail') { duoMsg = 'Не получилось соединиться. Проверь, что оба телефона в одной Wi-Fi, и начните заново'; }
  const pOpen = document.getElementById('ward').classList.contains('on') && document.getElementById('wardT').textContent === '👫 Вдвоём';
  if (pOpen) { if (e === 'on') document.querySelector('#ward [data-close]').click(); else if (e !== 'card') duoPanel(); }
}
// второй загон и домик появились / убрались — перестраиваем базу на том же месте
function relayout(on) {
  duoBtn();
  if (!on && level.owner && level.owner !== duoMe()) { if (!moving) { moving = true; fade(true, () => { enter('base', backFrom('home')); fade(false); moving = false; }); } return; }
  if (level.id !== 'base' || moving) return;
  moving = true;
  const at = { x: hero.pos.x, z: hero.pos.z, face: hero.face };
  fade(true, () => { enter('base', at); fade(false); moving = false; });
}

// ---------- наблюдатель 👁 (?spy) ----------
// смотрит за Мотей или мамой: камера летит за выбранным, мир — как у него. Сам невидим, ничего не трогает.
function initSpyMode() {
  document.body.classList.add('spy');
  hero.model.root.visible = false; hero.ghost = true;
  // наблюдателю нужен сервер-посредник, а игра вдвоём сейчас идёт напрямую по QR — пока выключен
  if (!SPY_ON) { const d = document.createElement('div'); d.id = 'spyBar'; d.innerHTML = '<b>👁</b><button>Наблюдатель пока выключен<small>игра вдвоём идёт напрямую по QR-кодам, без сервера — смотреть со стороны не через что</small></button>'; document.body.appendChild(d); return; }
  askPin(pin => {
    initSpy({ hero, save, pin, onLayout: relayout, onGo: spyGo, onEvent: () => spyBar() });
    const bar = document.createElement('div'); bar.id = 'spyBar'; document.body.appendChild(bar);
    bar.onclick = e => { const b = e.target.closest('button[data-w]'); if (b) { spyTarget(b.dataset.w); spyBar(); } };
    spyBar(); setInterval(spyBar, 1000);
  });
}
// мамин PIN — та же клавиатура, что при входе мамы
function askPin(done) {
  const ov = document.getElementById('pin'); let pin = '';
  const dots = () => ov.querySelectorAll('.dots span').forEach((d, i) => d.classList.toggle('on', i < pin.length));
  ov.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
    const k = b.dataset.k;
    if (k === 'x') return;
    if (k === 'b') { pin = pin.slice(0, -1); dots(); return; }
    if (pin.length >= 3) return;
    pin += k; dots();
    if (pin.length < 3) return;
    if (pin === '132') { ov.classList.remove('on'); done(pin); }
    else { SFX.nope(); setTimeout(() => { pin = ''; dots(); }, 400); }
  });
  dots(); ov.classList.add('on');
}
function spyBar() {
  const bar = document.getElementById('spyBar'); if (!bar) return;
  bar.innerHTML = '<b>👁</b>' + spyInfo().map(i => {
    const [loc, owner] = (i.loc || '').split(':');
    const where = !i.on ? 'не в игре' : (LOCS[loc]?.name || '…') + (owner && owner !== i.who ? ' (в гостях)' : '');
    return `<button data-w="${i.who}" class="${i.me ? 'on' : ''}">${i.who === 'mama' ? '👩' : '👦'} ${i.name}${i.duo ? ' 👫' : ''}<small>${where}${i.on ? ` · 🪙 ${fmt(i.coins || 0)} · 👟 ${i.speed}` : ''}</small></button>`;
  }).join('');
}
function spyGo(id, owner, at) {
  if (moving || !LOCS[id]) return;
  moving = true;
  fade(true, () => { enter(id, at, owner); fade(false); moving = false; });
}
// раз в кадр у наблюдателя: только то, что видно (никаких гнёзд, порталов, кнопок)
export function updateSpyGame(dt) {
  updateDuo(dt);                                   // яйца в гнёздах, сторожа, табло — приходят от игрока
  if (level.id === 'base') { updatePen(dt, { x: 1e4, y: 0, z: 1e4 }); updateHouse(dt); }
  if (level.id === 'home' || level.id === 'loft') updateHome(dt, hero, null);
}

// ---------- зимние забавы вдвоём ----------
const snowScore = { me: 0, them: 0 };
function winterMsg(m) {
  const O = OTHER();
  if (m.t === 'wb' && level.id === 'winter') remoteBall(m.b);                     // летит снежок второго игрока
  if (m.t === 'wh') {                                                            // в меня попали!
    snowScore.them++; SFX.pop(); puff('❄️', hero.pos.clone().setY(hero.pos.y + 2.6), { size: 1.6, rise: 0.8 });
    const el = document.getElementById('splat'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    toast(`❄️ ${O.im} ${profile === 'mama' ? 'попал' : 'попала'} в тебя снежком!<small>счёт ${snowScore.me} : ${snowScore.them} — кидай в ответ ❄️</small>`);
  }
  if (m.t === 'ck') coopMsg(m, kitOpts());                                       // готовим вместе
  if (m.t === 'dish') {                                                          // второй игрок угостил
    kitchen(save).dishes.push(m.d); persist(); SFX.fanfare();
    const r = dishOf(m.d); puff('💝', hero.pos.clone().setY(hero.pos.y + 3.4), { size: 1.6, rise: 1 });
    toast(`💝 ${O.im} ${profile === 'mama' ? 'угостил' : 'угостила'} тебя: ${r.icon} ${r.name}!<small>оно на кухне и в рюкзаке 🎒 — съешь, когда захочешь</small>`);
  }
  if (m.t === 'smAll') {                                                         // подключились: снеговики — как у мамы
    if (!save.winter) save.winter = { sm: [0, 0, 0] };
    m.sm.forEach((n, i) => { if ((save.winter.sm[i] || 0) !== n) { if (level.id === 'winter') setSnowman(i, n, true); else save.winter.sm[i] = n; } });
    persist();
  }
  if (m.t === 'sm') {                                                            // снеговика лепим вместе
    if (!save.winter) save.winter = { sm: [0, 0, 0] };
    if (level.id === 'winter') setSnowman(m.i, m.n); else save.winter.sm[m.i] = m.n;
    persist();
    if (m.n >= 3) toast(`⛄ ${O.im} ${profile === 'mama' ? 'долепил' : 'долепила'} снеговика!`);
  }
}

// ---------- еда: съел блюдо — польза ----------
function eatDish(d) {
  const { r, f } = dishFx(d), what = [];
  if (f.run) { hero.boostT = (hero.boostT || 0) + f.run; what.push(`👟 быстрее ${f.run} с`); }
  if (f.jump) { hero.jumpT = (hero.jumpT || 0) + f.jump; what.push(`🦘 прыжок выше ${f.jump} с`); }
  if (f.compass) { hero.compassT = (hero.compassT || 0) + f.compass; what.push(`🧭 компас ${f.compass} с`); }
  if (f.coins) { save.coins += f.coins; what.push(`+${f.coins} монет`); SFX.coins(); }
  if (f.party) { confetti(hero.pos.clone().setY(hero.pos.y + 2), 120); fireworks(hero.pos.clone(), 6, () => SFX.boom()); }
  stat('dishes'); persist(); SFX.levelUp();
  puff(r.icon, hero.pos.clone().setY(hero.pos.y + 3.4), { size: 1.6, rise: 0.8 }); puff('😋', hero.pos.clone().setY(hero.pos.y + 4.4), { size: 1.2 });
  toast(`😋 ${r.name}! ${'⭐'.repeat(d.s)}<small>${what.join(' · ')}</small>`);
}

// ---------- кухня: угостить, покормить, готовить вдвоём ----------
const FED_MUL = 1.25, FED_MIN = 10;                                             // сытые питомцы: +25% монет на 10 минут (на ⭐; 3 ⭐ — 20 минут)
const fedLeft = () => Math.max(0, ((save.food?.fed || 0) - Date.now()) / 1000);
let fedWas = false;
function fedCheck() { const on = fedLeft() > 0; if (on !== fedWas) { fedWas = on; applyBonuses(); } }
function kitOpts() {
  const O = OTHER();
  return { save, sfx: SFX, persist, eat: eatDish, feed: feedPets, give: giveDish,
    coop: { send: duoSend, partnerHere: () => level.id === 'home' && !!partnerPos(), together, name: O.im, tv: O.tv, rod: profile === 'mama' ? 'Моти' : 'мамы', dat: profile === 'mama' ? 'Моте' : 'Маме' } };
}
// питомцам: сытые приносят больше монет
function feedPets(d) {
  const { r } = dishFx(d), K = kitchen(save), mins = FED_MIN * [0, 1, 1.5, 2][d.s];
  K.fed = Math.max(Date.now(), K.fed || 0) + mins * 60000;
  fedWas = false; fedCheck(); persist(); SFX.collect(); stat('petsFed');
  for (let i = 0; i < 6; i++) setTimeout(() => puff(i % 2 ? '💕' : '🐾', hero.pos.clone().setY(hero.pos.y + 2.5).add(new T.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3)), { size: 1, rise: 1.2 }), i * 150);
  toast(`🐾 Питомцы съели: ${r.icon} ${r.name}! Ням-ням!<small>сытые питомцы ${mins} минут приносят больше монет (+25%)</small>`);
}
// второму игроку (вдвоём)
function giveDish(d) {
  const { r } = dishFx(d), O = OTHER();
  duoSend({ t: 'dish', d }); SFX.collect(); stat('dishesGiven'); persist();
  puff('💝', hero.pos.clone().setY(hero.pos.y + 3.4), { size: 1.4 });
  toast(`💝 Ты ${profile === 'mama' ? 'угостила' : 'угостил'} ${O.vin}: ${r.icon} ${r.name}!`);
}
// жителю рядом — лучшее блюдо (сердечко дружбы, не чаще раза в 15 минут)
function treatNear() {
  const n = friendNear(hero), i = bestDish(save); if (!n || i < 0) return;
  const d = kitchen(save).dishes[i], res = treatFriend(save, n, dishOf(d));
  if (!res.keep) { kitchen(save).dishes.splice(i, 1); stat('treats'); }
  persist(); SFX[res.keep ? 'tap' : 'collect']();
  toast(res.say);
  if (res.up) setTimeout(() => friendUp(res.up.f, res.up.h), 1200);
}
