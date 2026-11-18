// Просьбы в школе ❗ и «живые» облачка 💭.
// Каждый день у двух ребят и одного учителя есть просьба — над головой горит ❗ (готово отдать — ✅).
//   ребята: найти потерянную вещь (лежит где-то в школе), принести еду из столовой, получить сегодня пятёрку;
//   учителя: стереть с доски (постоять у доски), отнести журнал в учительскую.
// За помощь — ❤️ дружбы и монетки. Над всеми жителями иногда всплывают облачка с репликами,
// а тот, у кого просьба, зовёт: «Мотя, иди сюда!».
import { T, scene } from './engine.js';
import { sprite, emojiTex, puff } from './fx.js';
import { getSchool, ROOM, RZ0, SUBJECTS } from './school.js';
import { school, todayList } from './lessons.js';

const today = () => new Date().toDateString();
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// где может лежать потерянная вещь (в проходах — чтобы можно было подойти)
const SPOTS = [
  { x: ROOM.math, z: -18.2, where: 'в кабинете математики' }, { x: ROOM.math - 6, z: -15.4, where: 'в кабинете математики, у стены' },
  { x: ROOM.abc, z: -18.2, where: 'в кабинете букв' }, { x: ROOM.abc + 6.2, z: -24, where: 'в кабинете букв, у окна' },
  { x: ROOM.world - 5, z: -17, where: 'в кабинете «Мир вокруг», у аквариума' }, { x: ROOM.shapes + 6, z: -24, where: 'в кабинете рисования' },
  { x: 20.5, z: -5.5, where: 'в библиотеке' }, { x: 29, z: 4.5, where: 'в библиотеке, у полок' },
  { x: -10, z: 5.5, where: 'в столовой' }, { x: -25.5, z: 5.8, where: 'в столовой, в углу' },
  { x: 5.5, z: 4.6, where: 'в холле, у вешалки' }, { x: 29, z: -12.5, where: 'в самом конце коридора' }, { x: -29, z: -9.6, where: 'в коридоре, у цветка' },
];
const LOST = [['✏️', 'ластик', 'ластик'], ['📕', 'книжку', 'книжка'], ['🧢', 'кепку', 'кепка'], ['🖍️', 'фломастер', 'фломастер'], ['🧸', 'мишку', 'мишка'], ['🎒', 'рюкзак', 'рюкзак']];   // кого/что — что
const GIRLS = ['olya', 'masha', 'sonya', 'alisa'];
const la = q => GIRLS.includes(q.who) ? 'а' : '';                 // потерял / потеряла
const FOOD = [['🧃', 'компот'], ['🥟', 'пирожок'], ['🍎', 'яблоко'], ['🍩', 'булочку']];
const STAFF_TABLE = { x: 12.5, z: -0.5 };

let S = null;   // { save, who, list, items: [{q, s, x, z}], marks: Map(npc → sprite), bubbles: [], bubT, erase }

// ---------- просьбы на сегодня ----------
function makeDay(save, st) {
  const kids = shuffle(st.kids).slice(0, 2), T0 = pick(Object.values(st.teachers)), L = todayList(save), Sch = school(save);
  const list = kids.map(n => {
    const r = Math.random(), sub = L.find(s => Sch.today.grade[s] !== 5);
    if (r < 0.15 && sub) return { who: n.id, name: n.name, type: 'grade', subj: sub, state: 'new' };
    if (r < 0.4) { const [e, what] = pick(FOOD); return { who: n.id, name: n.name, type: 'food', e, what, state: 'new' }; }
    const [e, what, nom] = pick(LOST), sp = Math.floor(Math.random() * SPOTS.length);
    return { who: n.id, name: n.name, type: 'find', e, what, nom, sp, state: 'new' };
  });
  list.push(Math.random() < 0.5 ? { who: 't_' + T0.s, s: T0.s, name: T0.name, type: 'erase', state: 'new' } : { who: 't_' + T0.s, s: T0.s, name: T0.name, type: 'journal', e: '📒', state: 'new' });
  return { day: today(), list };
}
const keyOf = n => n.kind === 'kid' ? n.id : n.kind === 'teacher' ? 't_' + n.s : 'cook';

export function setupQuests(save, who) {
  const st = getSchool(); if (!st) return;
  const Sc = school(save);
  if (!Sc.q || Sc.q.day !== today()) Sc.q = makeDay(save, st);
  S = { save, who, st, list: Sc.q.list, items: [], marks: new Map(), bubbles: [], bubT: 2, callT: 4, erase: 0 };
  for (const q of S.list) if (q.type === 'find' && q.state !== 'got' && q.state !== 'done') placeItem(q);
}
function placeItem(q) {
  const sp = SPOTS[q.sp], s = sprite(emojiTex(q.e), 0.9); s.position.set(sp.x, 0.7, sp.z); scene.add(s);
  S.items.push({ q, s, x: sp.x, z: sp.z, t: Math.random() * 6 });
}

// ---------- для окна разговора (chat.js) ----------
export const questFor = n => S?.list.find(q => q.who === keyOf(n) && q.state !== 'done') || null;
// что сказать и какие кнопки: { line, btn: [текст, действие: 'accept' | 'give'] | null }
export function questTalk(q, n) {
  const me = S.who === 'mama' ? 'Вы' : 'ты';
  if (q.type === 'find') {
    const where = SPOTS[q.sp].where;
    if (q.state === 'new') return { line: `Я потерял${la(q)} ${q.what}! Кажется, ${where}… Поможешь найти? ${q.e}`, btn: ['👍 Помогу найти!', 'accept'] };
    if (q.state === 'got') return { line: `Ой, это же ${q.nom || q.what}! ${q.e}`, btn: [`🎁 Вот, держи ${q.e}`, 'give'] };
    return { line: `Я потерял${la(q)} ${q.what}. Посмотри ${where} 🔎`, btn: null };
  }
  if (q.type === 'food') {
    if (q.state === 'new') return { line: `Я так проголодал${GIRLS.includes(q.who) ? 'ась' : 'ся'}… Принесёшь мне ${q.what} из столовой? ${q.e}`, btn: ['👍 Сейчас принесу!', 'accept'] };
    if (q.state === 'got') return { line: `Ой, это мне?! ${q.e}`, btn: [`🎁 Держи ${q.e}`, 'give'] };
    return { line: `Тётя Валя на раздаче даст ${q.what} ${q.e} — скажи, что для меня!`, btn: null };
  }
  if (q.type === 'grade') {
    const U = SUBJECTS[q.subj], g = school(S.save).today.grade[q.subj];
    if (q.state === 'new') return { line: `Спорим, ${me} не ${S.who === 'mama' ? 'получите' : 'получишь'} сегодня пятёрку по «${U.name}»? 😜`, btn: ['😎 Спорим, получу!', 'accept'] };
    if (g === 5) return { line: `Ну что, получил${S.who === 'mama' ? 'а' : ''} пятёрку? ${U.icon}`, btn: ['⭐ Смотри — пятёрка!', 'give'] };
    return { line: `Жду пятёрку по «${U.name}» ${U.icon}! Найди кабинет с табличкой`, btn: null };
  }
  if (q.type === 'erase') {
    if (q.state === 'new') return { line: `Поможешь мне? Сотри, пожалуйста, с доски в моём кабинете ${SUBJECTS[q.s].icon}`, btn: ['🧽 Конечно!', 'accept'] };
    return { line: 'Встань у доски — на цветной коврик — и подожди, пока доска станет чистой 🧽', btn: null };
  }
  if (q.type === 'journal') {
    if (q.state === 'new') return { line: 'Отнеси, пожалуйста, классный журнал в учительскую, на стол 📒', btn: ['📒 Отнесу!', 'accept'] };
    return { line: 'Учительская — справа по коридору. Положи журнал на стол 📒', btn: null };
  }
  return { line: 'Спасибо!', btn: null };
}
// действие из окна: accept — взялся помочь, give — отдал / показал. Вернёт текст ответа и награду { hearts, coins }
export function questAct(q, act) {
  if (act === 'accept') {
    q.state = q.type === 'journal' ? 'got' : 'go';
    if (q.type === 'journal') S.carry = q;
    persist();
    return { line: pick(['Ура! Спасибо! 🤗', 'Ты настоящий друг! ❤️', 'Вот здорово!']) };
  }
  q.state = 'done'; if (S.carry === q) S.carry = null; persist();
  const lines = { find: 'Ура, нашлось! Спасибо-спасибо! 🤗', food: 'Ммм, вкуснотища! Ты лучший! 😋', grade: 'Ого! Ты и правда умный! 🏆' };
  return { line: lines[q.type] || 'Спасибо!', reward: { hearts: 1, coins: 50 } };
}
// повариха: еду для друга даёт бесплатно
export const foodQuest = () => S?.list.find(q => q.type === 'food' && q.state === 'go') || null;
export function takeFood(q) { q.state = 'got'; persist(); }
const persist = () => { school(S.save).q.list = S.list; };

// ---------- облачка ----------
const BUB = {
  break: ['Ура, перемена!', 'Кто в столовую?', 'Догони меня!', 'Я первый!', 'Пойдём играть!', 'Смотри, как я умею!', 'Ха-ха!'],
  eat: ['Ммм, вкусно!', 'Компот — супер!', 'Добавки бы…', 'Ням-ням 😋'],
  lesson: ['Тсс…', 'Я знаю! ✋', 'А можно мне?', 'Интересно!'],
  teach: ['Внимание на доску!', 'Кто знает ответ?', 'Молодцы!', 'Пишем аккуратно ✍️'],
  teacher: ['Какой хороший день!', 'Чаю бы ☕', 'Скоро звонок'],
  cook: ['Кому добавки?', 'Каша горячая!', 'Мойте руки! 🧼'],
};
function bubbleTex(text) {
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 112; const c = cv.getContext('2d');
  c.font = 'bold 34px "Arial Rounded MT Bold","Trebuchet MS",sans-serif';
  const w = Math.min(300, c.measureText(text).width + 40), x = (320 - w) / 2;
  c.fillStyle = '#ffffff'; c.strokeStyle = '#2b2340'; c.lineWidth = 5;
  c.beginPath(); c.roundRect ? c.roundRect(x, 6, w, 70, 26) : c.rect(x, 6, w, 70); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(150, 74); c.lineTo(160, 104); c.lineTo(176, 74); c.fillStyle = '#ffffff'; c.fill(); c.stroke();
  c.fillRect(148, 68, 30, 8);
  c.fillStyle = '#2b2340'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold ${Math.min(34, Math.floor(34 * 260 / c.measureText(text).width))}px "Arial Rounded MT Bold","Trebuchet MS",sans-serif`; c.fillText(text, 160, 42);
  return new T.CanvasTexture(cv);
}
function say(n, text, life = 3) {
  const old = S.bubbles.find(b => b.n === n); if (old) { n.g.remove(old.s); old.s.material.map.dispose(); old.s.material.dispose(); S.bubbles.splice(S.bubbles.indexOf(old), 1); }
  const s = sprite(bubbleTex(text), 2.9, 1.02); s.position.y = n.m.root.scale.x * 3.4 + 1.5; n.g.add(s);
  S.bubbles.push({ n, s, t: life });
}

// раз в кадр. Вернёт { say, sfx: [], reward: {q, hearts, coins} }
export function updateQuests(dt, hero) {
  const st = getSchool(); if (!S || !st || S.st !== st) return {};
  const ev = { sfx: [] }, p = hero.pos, t = st.t;
  // значки над головами: ❗ — есть просьба, ✅ — можно отдать
  for (const n of st.npcs) {
    const q = questFor(n), ready = q && (q.state === 'got' || (q.type === 'grade' && q.state === 'go' && school(S.save).today.grade[q.subj] === 5));
    const want = q ? (ready ? '✅' : q.state === 'new' ? '❗' : '') : '';
    let m = S.marks.get(n);
    if (m && m.e !== want) { n.g.remove(m.s); S.marks.delete(n); m = null; }
    if (!m && want) { const s = sprite(emojiTex(want), 0.9); n.g.add(s); m = { s, e: want }; S.marks.set(n, m); }
    if (m) m.s.position.y = n.m.root.scale.x * 3.4 + 1.2 + Math.abs(Math.sin(t * 3)) * 0.25;
  }
  // потерянные вещи: подошёл — подобрал
  for (const it of [...S.items]) {
    it.t += dt; it.s.position.y = 0.7 + Math.sin(it.t * 3) * 0.15;
    if (Math.random() < dt * 1.2) puff('✨', new T.Vector3(it.x + (Math.random() - 0.5), 0.8 + Math.random(), it.z + (Math.random() - 0.5)), { size: 0.5, rise: 0.6, life: 0.8 });
    if (Math.hypot(p.x - it.x, p.z - it.z) < 1.3 && p.y < 1.5) {
      scene.remove(it.s); S.items.splice(S.items.indexOf(it), 1);
      it.q.state = 'got'; persist(); ev.sfx.push('pick');
      ev.say = `${it.q.e} Нашлось: ${it.q.nom || it.q.what}!<small>отнеси — ${it.q.name} ждёт ✅</small>`;
    }
  }
  // стереть доску: постоять на коврике у доски
  const er = S.list.find(q => q.type === 'erase' && q.state === 'go');
  if (er) {
    const cx = ROOM[er.s], on = Math.abs(p.x - cx) < 3.5 && Math.abs(p.z - (RZ0 + 2.2)) < 1.4 && p.y < 1;
    if (on && hero.speed < 1.5) {
      S.erase += dt; if (Math.random() < dt * 6) puff('🧽', new T.Vector3(cx + (Math.random() - 0.5) * 7, 2 + Math.random() * 1.6, RZ0 + 0.9), { size: 0.8, rise: 0.2, life: 0.6 });
      if (S.erase >= 2.5) {
        S.erase = 0; er.state = 'done'; persist(); st.boards[er.s].userData.set('✨ Чисто! Спасибо! ✨', { color: '#ffe14d' });
        ev.reward = { q: er, hearts: 0, coins: 40 }; ev.say = `🧽 Доска чистая!<small>${er.name}: «Спасибо, помощник!» · +40 монет</small>`;
      }
    } else S.erase = Math.max(0, S.erase - dt);
  }
  // журнал: донести до стола в учительской
  const jr = S.list.find(q => q.type === 'journal' && q.state === 'got');
  if (jr && Math.hypot(p.x - STAFF_TABLE.x, p.z - STAFF_TABLE.z) < 2.6) {
    jr.state = 'done'; S.carry = null; persist();
    ev.reward = { q: jr, hearts: 0, coins: 40 }; ev.say = `📒 Журнал на месте!<small>${jr.name}: «Спасибо, помощник!» · +40 монет</small>`;
  }
  // что несёшь — над головой
  const carrying = S.list.find(q => q.state === 'got' && q.type !== 'grade');
  const ce = carrying ? carrying.e : '';
  if (S.carryE !== ce) {
    if (S.carryS) { hero.model.root.remove(S.carryS); S.carryS = null; }
    if (ce) { S.carryS = sprite(emojiTex(ce), 0.8); S.carryS.position.y = 3.5; hero.model.root.add(S.carryS); }
    S.carryE = ce;
  }
  // облачки: время от времени кто-то рядом что-то говорит; у кого просьба — зовёт
  for (const b of [...S.bubbles]) { b.t -= dt; if (b.t <= 0) { b.n.g.remove(b.s); b.s.material.map.dispose(); b.s.material.dispose(); S.bubbles.splice(S.bubbles.indexOf(b), 1); } }
  if ((S.bubT -= dt) <= 0) {
    S.bubT = 1.6 + Math.random() * 1.8;
    const near = st.npcs.filter(n => Math.hypot(n.pos.x - p.x, n.pos.z - p.z) < 22 && !n.talking && !S.bubbles.some(b => b.n === n));
    if (near.length && S.bubbles.length < 3) {
      const n = pick(near), k = n.kind === 'cook' ? 'cook' : n.kind === 'teacher' ? (n.mode === 'teach' ? 'teach' : 'teacher') : n.mode === 'sit' ? (st.phase === 'lesson' ? 'lesson' : 'eat') : 'break';
      say(n, pick(BUB[k]));
    }
  }
  if ((S.callT -= dt) <= 0) {
    S.callT = 6 + Math.random() * 4;
    const callers = st.npcs.filter(n => { const q = questFor(n); const d = Math.hypot(n.pos.x - p.x, n.pos.z - p.z); return q && q.state === 'new' && d > 4 && d < 20 && !n.talking; });
    if (callers.length) say(pick(callers), S.who === 'mama' ? 'Помогите, пожалуйста! ❗' : pick(['Мотя, иди сюда! ❗', 'Мотя! Помоги! ❗', 'Эй, Мотя! ❗']), 3.5);
  }
  return ev;
}
