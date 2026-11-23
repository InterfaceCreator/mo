// Друзья: жители базы и леса. Подойди и постой рядом — друг скажет, чего ему хочется.
// Есть это в рюкзаке — дарим, дружба растёт на сердечко (не чаще раза в 15 минут). 5 сердечек — лучшие друзья.
// Василий дружит, когда его гладят; бобр Боря — за выполненные задания.
import { T, scene, group, box, damp, dampAngle, compactModel } from './engine.js';
import { onLevelReset, groundY } from './world.js';
import { buildBeast, buildBird, animateAnimal } from './animals.js';
import { makeLabel, puff } from './fx.js';
import { RES } from './craft.js';
import { buildCat } from './vasya.js';
import { buildHero, animateHero, compactHero, PEOPLE } from './hero.js';
import { B } from './balance.js';

export const MAX_HEARTS = 5;
const GAP = 15 * 60 * 1000;                                        // подарок одному другу — не чаще раза в 15 минут

// k — что любит (ресурс из рюкзака или 'banana'), n — сколько за раз; where — подсказка, где взять
export const FRIENDS = [
  { id: 'ryaba', place: 'база, у главной дорожки', name: 'Курочка Ряба', loc: 'base', x: -5, z: 14, k: 'stone', n: 2, where: 'камешки лежат по всей базе',
    hi: 'Ко-ко! Принесёшь 2 камешка? Курочкам они полезны!', yes: 'Ко-ко-ко! Ты мой друг!',
    build: p => buildBird(p, { body: 0xffffff, wing: 0xf0ece4, crest: 0xff3b3b, beak: 0xffb020, legC: 0xffb020 }) },
  { id: 'yosha', place: 'Лес, грибная роща — дальний угол', name: 'Ёжик Ёша', loc: 'forest', x: -66, z: -50, k: 'leaf', n: 3, where: 'листики — на кустах в лесу',
    hi: 'Фыр-фыр! Мне бы 3 листика — постелить в норке.', yes: 'Фыр! Теперь в норке мягко!',
    build: p => buildBeast(p, { body: 0x9a7b5a, head: 0xd9b48c, quills: 0x5a4030, snout: 0xd9b48c, nose: 0x222222, ear: 'round', leg: 0.18, w: 0.8, h: 0.5, d: 0.85, tail: 'none' }) },
  { id: 'uhu', place: 'Лес, у гигантского дерева', name: 'Совёнок Уху', loc: 'forest', x: 12, z: 36, k: 'crystal', n: 1, where: 'кристаллы — в пещере на базе (нужна кирка)',
    hi: 'Уху! Подаришь блестящий кристаллик?', yes: 'Уху-уху! Какой красивый!',
    build: p => buildBird(p, { body: 0x9c7a54, head: 0xb08a60, belly: 0xe8d4b0, eye: 1.5, tufts: true, beak: 0xffc21a, legC: 0xffc21a }) },
  { id: 'lisa', place: 'Лес, у озера', name: 'Лисичка Лиса', loc: 'forest', x: 66, z: 32, k: 'banana', n: 1, where: 'бананы — в магазине на базе',
    hi: 'Привет! Я так люблю бананы… Угостишь?', yes: 'Ням! Спасибо, друг!',
    build: p => buildBeast(p, { body: 0xff7a1a, ear: 'point', earC: 0x3a2a2a, tail: 'big', snout: 0xffffff, belly: 0xffffff, legC: 0x3a2a2a }) },
  { id: 'tyoma', place: 'Лес, у полого бревна под горой', name: 'Медвежонок Тёма', loc: 'forest', x: -28, z: -52, k: 'wood', n: 4, where: 'брёвна — руби деревья топором',
    hi: 'Я строю берлогу! Принесёшь 4 бревна?', yes: 'Ур-р! Берлога будет самая лучшая!',
    build: p => buildBeast(p, { body: 0x8a5a2e, snout: 0xd9a066, ear: 'round', w: 0.9, h: 0.7, d: 1.1, hd: 0.72, leg: 0.3 }) },
  // люди: scale — рост (1 — взрослый, 0.8 — ребёнок), r — с какого расстояния заговорит, stay — стоит на месте
  { id: 'galya', place: 'база, у магазина (справа от прилавка)', name: 'Тётя Галя', loc: 'base', x: 13, z: 51.5, human: true, scale: 1, r: 2.8, stay: true, work: 'shop', k: 'leaf', n: 3, where: 'листики — на кустах',
    hi: 'Здравствуй, покупатель! Принесёшь 3 листика? Заварю травяной чай.', yes: 'Ох, какой душистый будет чай! Спасибо!',
    build: p => buildHero(p, PEOPLE.galya) },
  { id: 'gena', place: 'база, у верстака (слева)', name: 'Дядя Гена', loc: 'base', x: -11.5, z: 55, human: true, scale: 1, r: 2.8, stay: true, work: 'hammer', k: 'plank', n: 2, where: 'доски делают из брёвен на верстаке',
    hi: 'Мастерим? Сделай на верстаке 2 доски и принеси мне — научу секретам!', yes: 'Вот это доски! Настоящий мастер растёт!',
    build: p => buildHero(p, PEOPLE.gena) },
  { id: 'misha', place: 'Дорожка, у линии', name: 'Тренер Миша', loc: 'track', x: 4.5, z: 1, human: true, scale: 1, r: 3.2, stay: true, special: 'побеждай зверей на Дорожке',
    talk: save => coachTip(save), build: p => buildHero(p, PEOPLE.misha) },
  { id: 'vanya', place: 'Лес, поляна у входа', name: 'Елисей', loc: 'forest', x: 10, z: 50, human: true, scale: 0.8, r: 2.8, special: 'играй с ним в догонялки и прятки',
    talk: save => ({ game: (save.kidGame = ((save.kidGame || 0) + 1) % 2) ? 'tag' : 'hide' }), build: p => buildHero(p, PEOPLE.vanya) },
  // Осенняя долина
  { id: 'pushinka', place: 'Осень, под большим клёном', name: 'Белочка Пушинка', loc: 'autumn', x: -44, z: 28, k: 'acorn', n: 5, where: 'жёлуди — под рыжими дубами и в кучах листьев',
    hi: 'Ой, привет! Мне на зиму нужно 5 жёлудей. Поможешь?', yes: 'Ура! Теперь зимой не проголодаюсь!',
    build: p => buildBeast(p, { body: 0xd9702a, belly: 0xffe0b8, ear: 'point', tail: 'big', tailC: 0xd9702a, snout: 0xffe0b8, w: 0.6, d: 0.8, leg: 0.25 }) },
  { id: 'timosha', place: 'Осень, у тыквенной грядки', name: 'Пугало Тимоша', loc: 'autumn', x: -36, z: -6, human: true, scale: 1.05, r: 2.8, stay: true, k: 'pumpkin', n: 2,
    where: 'тыквы растут на грядке рядом', hi: 'Я стерегу грядку! Принеси 2 тыквы — сделаю фонарики к празднику.', yes: 'Какие тыквы! Будут самые яркие фонарики!',
    build: p => buildHero(p, PEOPLE.scarecrow) },
  // дети — ровесники Моти: подойди — позовут играть (kids.js). Выиграл — дружба растёт
  { id: 'sonya', place: 'база, на детской площадке', name: 'Соня', loc: 'base', x: 40, z: 10, box: { x0: 35.5, x1: 44.5, z0: 9.6, z1: 14 }, run: 2.8, human: true, scale: 0.8, r: 2.8, special: 'собирай с ней мячики наперегонки',
    talk: () => ({ game: 'balls' }), build: p => buildHero(p, PEOPLE.sonya) },
  { id: 'kolya', place: 'база, футбольное поле у портала в Пустыню (на воротах)', name: 'Коля', loc: 'base', x: -27.4, z: 9, human: true, scale: 0.8, r: 2.6, stay: true, special: 'забей ему 3 гола',
    talk: () => ({ game: 'football' }), build: p => buildHero(p, PEOPLE.kolya) },
  { id: 'olya', place: 'база, футбольное поле у портала в Пустыню', name: 'Оля', loc: 'base', x: -37, z: 9, human: true, scale: 0.8, r: 2.6, stay: true, special: 'играй в футбол с ней и Колей',
    talk: () => ({ game: 'football' }), build: p => buildHero(p, PEOPLE.olya) },
  { id: 'masha', place: 'Лес, за речкой слева от входа', name: 'Маша', loc: 'forest', x: -33, z: 60, human: true, scale: 0.8, r: 2.8, stay: true, area: 10, special: 'повторяй за ней по цветным плитам',
    talk: () => ({ game: 'simon' }), build: p => buildHero(p, PEOPLE.masha) },
  { id: 'alisa', place: 'Осень, на берегу пруда', name: 'Алиса', loc: 'autumn', x: -18.5, z: 8, human: true, scale: 0.8, r: 2.8, stay: true, special: 'кормите вместе уток желудями',
    talk: () => ({ game: 'ducks' }), build: p => buildHero(p, PEOPLE.alisa) },
  { id: 'timur', place: 'Осень, тыквенный боулинг у грядки', name: 'Тимур', loc: 'autumn', x: -17.5, z: -26, human: true, scale: 0.8, r: 2.8, stay: true, special: 'сбей все кегли тыквой',
    talk: () => ({ game: 'bowling' }), build: p => buildHero(p, PEOPLE.timur) },
  { id: 'petya', place: 'Дорожка, у старта', name: 'Петя', loc: 'track', x: -5.5, z: 7, human: true, scale: 0.8, r: 2.6, stay: true, special: 'бегай с ним наперегонки — челнок до флажка',
    talk: () => ({ game: 'shuttle' }), build: p => buildHero(p, PEOPLE.petya) },
  // эти двое уже живут в игре — дружба с ними растёт по-своему
  { id: 'vasya', place: 'гуляет по базе', name: 'Кот Василий', loc: 'base', special: 'гладь его — подойди и постой рядом', build: p => buildCat(p) },
  { id: 'borya', place: 'Лес, лагерь у костра', name: 'Бобр Боря', loc: 'forest', special: 'выполняй его задания',
    build: p => buildBeast(p, { body: 0x8a5a2b, head: 0x9c6a3c, snout: 0xc89a6a, nose: 0x2b2b33, ear: 'round', tail: 'fin', tailC: 0x5a3a1a, w: 0.9, h: 0.75, d: 1.0, hd: 0.7, leg: 0.3 }) },
];
// где живут — чтобы лес не сажал там деревья
export const FRIEND_HOMES = loc => FRIENDS.filter(f => f.loc === loc && f.x !== undefined).map(f => ({ x: f.x, z: f.z, area: f.area }));

const heartsText = h => '❤️'.repeat(h) + '🤍'.repeat(MAX_HEARTS - h);
const fs = save => save.friends || (save.friends = {});
export const heartsOf = (save, id) => (fs(save)[id] || {}).h || 0;
export const metFriend = (save, id) => !!fs(save)[id];
// познакомились (Василий — подошёл к нему, Боря — заговорил): появляется в книге друзей
export function meet(save, id) { const F = fs(save); if (!F[id]) F[id] = { h: 0, t: 0 }; }

// дружба +1 сердечко, если можно (не больше 5 и не чаще раза в 15 минут). Возвращает новое число или 0
export function befriend(save, id) {
  const F = fs(save), f = F[id] || (F[id] = { h: 0, t: 0 });
  if (f.h >= MAX_HEARTS || Date.now() - f.t < GAP) return 0;
  f.h++; f.t = Date.now(); return f.h;
}
// тренер подсказывает: кто следующий и хватит ли скорости убежать (с ускорителями — легче)
function coachTip(save) {
  const P = save.track || { stage: 0, round: 1 }, R = P.round || 1, S = B.trackStages(R)[P.stage];
  if (!S) return `Круг ${R} пройден! Заходи снова — начнётся круг ${R + 1}, звери будут сильнее! 🏆`;
  const lv = Math.ceil((S.chase / (9 * B.CARRY[S.r]) - 1) / B.SPEED_STEP + 1);
  const tip = save.speed >= lv ? 'Скорости хватает — беги!' : `Чтобы точно убежать, нужна скорость 👟 ${lv} (у тебя ${save.speed}). Стрелки-ускорители помогут!`;
  return `${R > 1 ? `Круг ${R}! ` : ''}Следующий — ${S.name}${S.boss ? ' 🐉' : ''}. Хватай яйцо и неси за линию! <small>${tip}</small>`;
}
// люди и звери с особой дружбой: найти живого (Елисей для игр)
export const nodeOf = id => here.find(n => n.f.id === id);

const waitMin = (save, id) => Math.ceil((GAP - (Date.now() - ((fs(save)[id] || {}).t || 0))) / 60000);

// ---------- жители на карте ----------
const here = [];
export const friendsHere = () => here;
onLevelReset(() => { here.length = 0; });

export function spawnFriends(loc, save) {
  for (const f of FRIENDS) {
    if (f.loc !== loc || f.x === undefined) continue;
    const g = group(scene, f.x, groundY(f.x, f.z), f.z), m = f.build(g); m.root.scale.setScalar(f.scale || 1.7); if (f.human) compactHero(m); else compactModel(m);
    const label = makeLabel(4.6, 1.15); label.position.set(0, f.human ? 3.4 * (f.scale || 1) : 2.6, 0); g.add(label);
    here.push({ f, g, m, label, home: new T.Vector3(f.x, 0, f.z), to: null, wait: Math.random() * 3, face: Math.random() * 6, near: false, stay: 0, hop: 0, shown: '' });
  }
  for (const n of here) setLabel(n, save);
}
function setLabel(n, save) {
  const met = metFriend(save, n.f.id), t = met ? `${n.f.name} ${heartsText(heartsOf(save, n.f.id))}` : `${n.f.name} ❔`;
  if (t !== n.shown) { n.shown = t; n.label.userData.set(t, { color: '#ffffff' }); }
}

// раз в кадр. События для game.js: { say: текст, up: { f, h } } — сказал что-то или подружились сильнее
export function updateFriends(dt, hero, save) {
  const ev = {}, p = hero.pos;
  for (const n of here) {
    const g = n.g, q = g.position, dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz);
    let spd = 0;
    if (n.busy) { n.label.visible = !!n.ambient; continue; }           // играет — им управляет игра (сам с собой — подпись видна)
    if (d > 70) continue;                                              // далеко (за туманом) — «спит»: не ходит и не анимируется
    n.label.visible = true;
    if (d < (n.f.r || 2.6) && Math.abs(p.y - q.y) < 2) {
      // рядом: поворачивается к герою; постоял секунду — разговор (один раз за подход)
      n.face = dampAngle(n.face, Math.atan2(dx, dz), 8, dt);
      if (!n.near && hero.speed < 1.5 && (n.stay += dt) > 0.6 && (!ev.who || d < ev.who.d)) ev.who = { n, d };   // заговорит самый близкий
      // уже поговорили, а нужное только что появилось (сделал доски у верстака) — забирает подарок, не надо отходить
      else if (n.near && n.f.k && (n.check = (n.check || 0) - dt) <= 0) { n.check = 0.5; if (canGift(save, n.f) && (!ev.who || d < ev.who.d)) ev.who = { n, d }; }
    } else {
      if (d > (n.f.r || 2.6) + 0.8) { n.near = false; n.stay = 0; }
      // гуляет вокруг своего места
      if (n.to) {
        const vx = n.to.x - q.x, vz = n.to.z - q.z, l = Math.hypot(vx, vz);
        if (l < 0.2) { n.to = null; n.wait = 2 + Math.random() * 4; }
        else { spd = n.f.run || 1.2; q.x += vx / l * spd * dt; q.z += vz / l * spd * dt; n.face = dampAngle(n.face, Math.atan2(vx, vz), 6, dt); }
      } else if (!n.f.stay && (n.wait -= dt) <= 0) {
        const B = n.f.box;                                                // бегает по своей площадке (Соня) — или гуляет у дома
        if (B) { n.to = { x: B.x0 + Math.random() * (B.x1 - B.x0), z: B.z0 + Math.random() * (B.z1 - B.z0) }; n.wait = 0.3 + Math.random() * 1.2; }
        else { const a = Math.random() * 6.28, r = 1 + Math.random() * 2.5; n.to = { x: n.home.x + Math.cos(a) * r, z: n.home.z + Math.sin(a) * r }; }
      }
      q.y = damp(q.y, groundY(q.x, q.z), 10, dt);
    }
    g.rotation.y = n.face;
    // от радости подпрыгивает
    if (n.hop > 0) { n.hop -= dt; n.m.root.position.y = Math.abs(Math.sin(n.hop * 12)) * 0.6; } else n.m.root.position.y = 0;
    if (n.f.human) animateHero(n.m, dt, { speed: spd, maxSpeed: 3 }); else animateAnimal(n.m, dt, spd);
    // за работой (пока Мотя не подошёл): дядя Гена стучит молотком, тётя Галя раскладывает товар
    if (n.f.work && !n.near && d > (n.f.r || 2.6) + 0.5) {
      const t = performance.now() / 1000;
      if (n.f.work === 'hammer') { n.m.armR.rotation.x = -1.4 + Math.abs(Math.sin(t * 5)) * -0.9; if (Math.sin(t * 5) > 0.97 && Math.random() < 0.5) puff('✨', g.position.clone().add(new T.Vector3(Math.sin(n.face) * 1.2, 1.4, Math.cos(n.face) * 1.2)), { size: 0.5, rise: 0.5, life: 0.4 }); }
      else { n.m.armL.rotation.x = -0.8 + Math.sin(t * 2) * 0.4; n.m.armR.rotation.x = -0.8 - Math.sin(t * 2.3) * 0.4; n.face = dampAngle(n.face, n.f.workFace ?? n.face, 4, dt); }
    }
    setLabel(n, save);
  }
  // за кадр говорит только один — ближайший (чтобы реплики не перебивали друг друга)
  if (ev.who) { const n = ev.who.n; delete ev.who; n.near = true; Object.assign(ev, talk(n, hero, save)); }
  return ev;
}

// ---------- угощение блюдом с кухни 🍽️ (food.js) ----------
// житель рядом (для кнопки «угостить»): ближайший, кто не занят игрой
export function friendNear(hero) {
  let best = null, bd = 1e9;
  for (const n of here) { if (n.busy) continue; const q = n.g.position, d = Math.hypot(hero.pos.x - q.x, hero.pos.z - q.z); if (d < (n.f.r || 2.6) + 0.6 && Math.abs(hero.pos.y - q.y) < 2 && d < bd) { best = n; bd = d; } }
  return best;
}
// любимые блюда: за них житель радуется особенно
const FAV = { galya: 'cake', ryaba: 'pancakes', yosha: 'msoup', uhu: 'cookies', lisa: 'salad', tyoma: 'cookies', vasya: 'fishpie', borya: 'applepie', pushinka: 'cupcake', timosha: 'psoup' };
// можно ли угостить сейчас: дружба не максимальная и прошло 15 минут после прошлого подарка
export const canTreat = (save, n) => heartsOf(save, n.f.id) < MAX_HEARTS && Date.now() - ((fs(save)[n.f.id] || {}).t || 0) >= GAP;
export function treatFriend(save, n, dish) {
  const f = n.f; if (!metFriend(save, f.id)) fs(save)[f.id] = { h: 0, t: 0 };
  if (heartsOf(save, f.id) >= MAX_HEARTS) return { say: `${f.name}: Спасибо! Мы и так лучшие друзья 💛`, keep: true };
  if (!canTreat(save, n)) return { say: `${f.name}: Спасибо, пока не хочется! Угости меня через ${waitMin(save, f.id)} мин 🙂`, keep: true };
  const nh = befriend(save, f.id); n.hop = 1.4;
  for (let i = 0; i < 5; i++) setTimeout(() => puff(i % 2 ? '😋' : '💕', n.g.position.clone().setY(n.g.position.y + 2.8), { size: 1.1, rise: 1.4, dx: (Math.random() - 0.5) * 1.2 }), i * 160);
  const fav = FAV[f.id] === dish.id;
  return { say: `${f.name}: ${fav ? `Ура, ${dish.name.toLowerCase()} — моё любимое! 😍` : `Ммм, ${dish.name.toLowerCase()}! Спасибо! 😋`}`, up: { f, h: nh } };
}

// что сказать и что сделать при встрече
// можно подарить прямо сейчас: есть сколько нужно, дружба не максимальная и прошло 15 минут
const canGift = (save, f) => have(save, f.k) >= f.n && heartsOf(save, f.id) < MAX_HEARTS && Date.now() - ((fs(save)[f.id] || {}).t || 0) >= GAP;
const have = (save, k) => k === 'banana' ? save.bananas : (save.res[k] || 0);
function take(save, k, n) { if (k === 'banana') save.bananas -= n; else save.res[k] -= n; }
function talk(n, hero, save) {
  const f = n.f, h = heartsOf(save, f.id), first = !metFriend(save, f.id);
  if (first) fs(save)[f.id] = { h: 0, t: 0 };
  if (f.talk) { const r = f.talk(save); return r.game ? { game: r.game, n } : { say: `${first ? 'Привет! ' : ''}${f.name}: ${r}` }; }
  const icon = f.k === 'banana' ? '🍌' : RES[f.k];
  if (h >= MAX_HEARTS) { n.hop = 0.8; puff('💛', n.g.position.clone().setY(n.g.position.y + 3), { size: 1.2 }); return { say: `${f.name}: Мы лучшие друзья! 💛` }; }
  if (Date.now() - fs(save)[f.id].t < GAP) return { say: `${f.name}: Спасибо за подарок! Приходи через ${waitMin(save, f.id)} мин 🙂` };
  if (have(save, f.k) >= f.n) {
    take(save, f.k, f.n);
    const nh = befriend(save, f.id); n.hop = 1.2;
    for (let i = 0; i < 4; i++) setTimeout(() => puff('💕', n.g.position.clone().setY(n.g.position.y + 2.6), { size: 1, rise: 1.4, dx: (Math.random() - 0.5) * 1.2 }), i * 180);
    return { say: `${f.name}: ${f.yes}`, up: { f, h: nh } };
  }
  return { say: `${first ? 'Привет! ' : ''}${f.name}: ${f.hi}<small>нужно ${icon}×${f.n} · ${f.where}</small>` };
}
