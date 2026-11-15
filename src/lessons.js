// Уроки 📚, расписание 📅 и дневник 📒.
// Школа — как настоящая: в будни по 3 урока (каждый день свои), в выходные закрыто. Каждый урок — раз в день
// и одна попытка исправить оценку. Сложность растёт: каждые 2 пройденных дня по предмету — новый уровень.
// Урок — 5 заданий с картинками и большими кнопками; вопрос читается вслух (кнопка 🔊).
// Ошибся — «попробуй ещё», ошибка считается. Оценка: 0 ошибок — 5, 1 — 4, 2–3 — 3, больше — 2.
// После всех уроков — домашнее задание (дома). За серию школьных дней — наклейки и призы.
// Дневник: оценки по дням; мама проверяет (вводит свой PIN) и подписывает — с комментарием и подарком.
import { SUBJECTS, KID_SUBJ } from './school.js';
import { openOv, closeOv } from './ui.js';

const $ = id => document.getElementById(id);
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// варианты ответа: правильный + 3 неправильных (случайных), перемешаны; a — номер правильного
const Q = (q, pic, right, wrong, say) => { const opts = shuffle([right, ...shuffle(wrong.filter(w => w !== right)).slice(0, 3)]); return { q, pic, opts, a: opts.indexOf(right), say: say || q }; };
const nums = (n, lo, hi) => [...Array(hi - lo + 1).keys()].map(i => i + lo).filter(x => x !== n);
const low = s => s.toLowerCase();

// ================= ЗАДАНИЯ ПО УРОВНЯМ =================
// [уровень, генератор]: на уроке — задания своего уровня и ниже, чаще — самого нового
const FRUIT = ['🍎', '🍌', '🍓', '🍐', '🍊', '🐣', '⭐', '🎈', '🐟', '🚗', '🧸', '🌸'];
const MATH = [
  [1, () => { const n = 1 + rnd(5), e = pick(FRUIT); return Q('Сколько тут?', e.repeat(n), n, nums(n, 1, 6)); }],
  [1, () => { const n = 1 + rnd(4); return Q(`Какое число после ${n}?`, `${n} ➡️ ❓`, n + 1, nums(n + 1, 1, 6)); }],
  [1, () => { let a = 1 + rnd(5), b = 1 + rnd(5); if (a === b) b = a % 5 + 1; return Q('Где больше?', `${a}   или   ${b}`, Math.max(a, b), [Math.min(a, b)], `Какое число больше: ${a} или ${b}?`); }],
  [2, () => { const n = 4 + rnd(7), e = pick(FRUIT); return Q('Сколько тут?', e.repeat(n), n, nums(n, 2, 10)); }],
  [2, () => { const n = 4 + rnd(6); return Q(`Какое число перед ${n}?`, `❓ ⬅️ ${n}`, n - 1, nums(n - 1, 1, 10)); }],
  [2, () => { let a = 2 + rnd(9), b = 2 + rnd(9); if (a === b) b = a > 2 ? a - 1 : a + 1; return Q('Где меньше?', `${a}   или   ${b}`, Math.min(a, b), [Math.max(a, b)], `Какое число меньше: ${a} или ${b}?`); }],
  [3, () => { const a = 1 + rnd(3), b = 1 + rnd(3), e = pick(FRUIT); return Q(`${a} + ${b} = ?`, `${e.repeat(a)} ➕ ${e.repeat(b)}`, a + b, nums(a + b, 1, 8), `Сколько будет ${a} плюс ${b}?`); }],
  [3, () => { const n = 2 + rnd(4), e = pick(FRUIT); return Q('Добавили ещё один. Сколько стало?', `${e.repeat(n)} ➕ ${e}`, n + 1, nums(n + 1, 1, 8)); }],
  [4, () => { const a = 2 + rnd(5), b = 1 + rnd(4), e = pick(FRUIT); return Q(`${a} + ${b} = ?`, `${e.repeat(a)} ➕ ${e.repeat(b)}`, a + b, nums(a + b, 2, 10), `Сколько будет ${a} плюс ${b}?`); }],
  [4, () => { const a = 3 + rnd(6), b = 1 + rnd(Math.min(3, a - 1)), e = pick(FRUIT); return Q(`${a} − ${b} = ?`, `${e.repeat(a - b)}${'❌'.repeat(b)}`, a - b, nums(a - b, 0, 9), `Было ${a}, убрали ${b}. Сколько осталось?`); }],
  [5, () => { const a = 1 + rnd(5), b = 1 + rnd(4); return Q(`${a} + ? = ${a + b}`, `${a} ➕ ❓ = ${a + b}`, b, nums(b, 1, 9), `Сколько нужно прибавить к ${a}, чтобы получилось ${a + b}?`); }],
  [5, () => { const k = pick([2, 5]), s = 1 + rnd(3), seq = [0, 1, 2, 3].map(i => (s + i) * k); return Q('Какое число дальше?', `${seq.join(', ')}, ❓`, (s + 4) * k, nums((s + 4) * k, k, 30).filter(x => x % k === 0).concat([(s + 4) * k + 1, (s + 4) * k - 1]), `Посмотри: ${seq.join(', ')}. Какое число будет дальше?`); }],
  [5, () => { const a = 5 + rnd(5), b = 2 + rnd(4); return Q(`${a} − ${b} = ?`, `${a} ➖ ${b}`, a - b, nums(a - b, 0, 10), `Сколько будет ${a} минус ${b}?`); }],
];
const WORDS = [['КОТ', '🐱'], ['ДОМ', '🏠'], ['МЯЧ', '⚽'], ['РЫБА', '🐟'], ['ЛИСА', '🦊'], ['СЛОН', '🐘'], ['АРБУЗ', '🍉'], ['БАНАН', '🍌'], ['УТКА', '🦆'], ['ЖИРАФ', '🦒'],
  ['ЗЕБРА', '🦓'], ['ТОРТ', '🎂'], ['РАКЕТА', '🚀'], ['МАШИНА', '🚗'], ['ГРИБ', '🍄'], ['ЛУНА', '🌙'], ['ВОЛК', '🐺'], ['ПИНГВИН', '🐧'], ['ЁЖИК', '🦔'], ['НОС', '👃'], ['ЕЛЬ', '🌲'], ['ОБЛАКО', '☁️'], ['ИНДЮК', '🦃'],
  ['САМОЛЁТ', '✈️'], ['ЦВЕТОК', '🌸'], ['ЧАСЫ', '⌚'], ['ШАР', '🎈'], ['ЯБЛОКО', '🍎'], ['ЮЛА', '🪀'], ['ПОЕЗД', '🚂'], ['ЛЕВ', '🦁'], ['ТИГР', '🐯'], ['КИТ', '🐳'], ['СОВА', '🦉'], ['ЗАЯЦ', '🐰'], ['ХЛЕБ', '🍞']];
const LETTERS = 'АБВГДЕЁЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ'.split('');
const VOWELS = 'АОУЫЭЯЁЮИЕ'.split('');
const ABC = [
  [1, () => { const l = pick(LETTERS); return Q(`Найди букву «${l}»`, '🔎', l, LETTERS, `Найди букву ${l}`); }],
  [1, () => { const [w, e] = pick(WORDS); return Q('На какую букву начинается?', e, w[0], LETTERS, `На какую букву начинается слово ${low(w)}?`); }],
  [2, () => { const [w, e] = pick(WORDS), wr = WORDS.filter(x => x[0][0] !== w[0]).map(x => x[1]); return Q(`Что начинается на букву «${w[0]}»?`, w[0], e, wr, `Что начинается на букву ${w[0]}?`); }],
  [2, () => { const l = pick(VOWELS); return Q('Найди гласную букву', '🗣️', l, LETTERS.filter(x => !VOWELS.includes(x)), 'Найди гласную букву. Её можно петь'); }],
  [3, () => { const [w, e] = pick(WORDS.filter(x => x[0].length <= 5)); return Q('Сколько букв в слове?', `${e} ${w}`, w.length, nums(w.length, 2, 7), `Сколько букв в слове ${low(w)}?`); }],
  [3, () => { const [w, e] = pick(WORDS); const l = w[w.length - 1]; return Q('На какую букву кончается?', `${e} ${w}`, l, LETTERS, `На какую букву кончается слово ${low(w)}?`); }],
  [4, () => { const [w, e] = pick(WORDS.filter(x => x[0].length >= 3 && x[0].length <= 6)); const i = 1 + rnd(w.length - 2); return Q('Какой буквы не хватает?', `${e} ${w.slice(0, i)}_${w.slice(i + 1)}`, w[i], LETTERS, `Какой буквы не хватает в слове ${low(w)}?`); }],
  [5, () => { const [w, e] = pick(WORDS.filter(x => x[0].length <= 5)), wr = WORDS.filter(x => x[0] !== w).map(x => x[0]); return Q('Найди слово', e, w, wr, 'Найди, как пишется это слово'); }],
  [5, () => { const [w, e] = pick(WORDS.filter(x => x[0].length <= 5)); const sc = shuffle(w.split('')).join(' '); return Q('Собери слово из букв', `${e}  ${sc}`, w, [shuffle(w.split('')).join(''), ...WORDS.filter(x => x[0] !== w && x[0].length === w.length).map(x => x[0])], 'Какое слово можно собрать из этих букв?'); }],
];
// мир вокруг
const HOMES = [['🐧', 'Пингвин', '❄️ Холод и лёд'], ['🐪', 'Верблюд', '🏜️ Пустыня'], ['🦔', 'Ёжик', '🌲 Лес'], ['🐟', 'Рыбка', '🌊 Вода'], ['🐄', 'Корова', '🏡 Ферма'], ['🦒', 'Жираф', '🌴 Жаркая Африка'], ['🐻‍❄️', 'Белый медведь', '❄️ Холод и лёд'], ['🐿️', 'Белка', '🌲 Лес'], ['🐬', 'Дельфин', '🌊 Вода'], ['🐔', 'Курица', '🏡 Ферма'], ['🦁', 'Лев', '🌴 Жаркая Африка'], ['🦂', 'Скорпион', '🏜️ Пустыня']];
const JOBS = [['🩺', 'Кто лечит людей?', '👩‍⚕️'], ['🚒', 'Кто тушит пожар?', '👨‍🚒'], ['🍞', 'Кто печёт хлеб?', '👨‍🍳'], ['✈️', 'Кто водит самолёт?', '👨‍✈️'], ['📚', 'Кто учит детей?', '👩‍🏫'], ['🚔', 'Кто ловит воров?', '👮'], ['🌾', 'Кто выращивает урожай?', '👨‍🌾'], ['🚀', 'Кто летит в космос?', '👩‍🚀']];
const TRANSPORT = [['Что едет по рельсам?', '🚂', ['🚗', '⛵', '✈️', '🚲']], ['Что плывёт по воде?', '⛵', ['🚗', '🚂', '🚲', '🚜']], ['Что летает в небе?', '✈️', ['🚗', '🚂', '⛵', '🚜']], ['На чём ездят по полю?', '🚜', ['⛵', '✈️', '🚀']], ['На чём летят в космос?', '🚀', ['🚗', '⛵', '🚂', '🚲']]];
const ODD = [[['🍎', '🍐', '🍌', '🚗'], '🚗'], [['🐱', '🐶', '🐰', '🍕'], '🍕'], [['🚗', '🚌', '🚂', '🐟'], '🐟'], [['⚽', '🏀', '🎾', '🥕'], '🥕'], [['🌹', '🌻', '🌷', '🦊'], '🦊'], [['🧤', '🧣', '🧢', '🍩'], '🍩'], [['🐟', '🐬', '🐳', '🐘'], '🐘'], [['☀️', '🌙', '⭐', '🍔'], '🍔']];
const WEATHER = [['🌧️', 'Идёт дождь. Что взять?', '☂️', ['🕶️', '⛸️', '🩴']], ['❄️', 'На улице снег. Что надеть?', '🧤', ['🩴', '🩳', '👙']], ['☀️', 'Жарко и солнце. Что надеть?', '🧢', ['🧤', '🧣', '🥾']], ['🌊', 'Идём на море. Что взять?', '🩱', ['🧤', '🧣', '⛸️']]];
const BODY = [['Чем мы видим?', '👀', ['👂', '👃', '👄']], ['Чем мы слышим?', '👂', ['👀', '👃', '🦶']], ['Чем мы нюхаем?', '👃', ['👀', '👂', '✋']], ['Чем мы ходим?', '🦶', ['👀', '👂', '👃']], ['Чем мы едим?', '👄', ['👂', '🦶', '👀']]];
const WORLD = [
  [1, () => { const [s, e] = pick([['❄️ Зима', '⛄'], ['🌷 Весна', '🌱'], ['☀️ Лето', '🏖️'], ['🍂 Осень', '🍁'], ['❄️ Зима', '🎿'], ['🍂 Осень', '🍄'], ['☀️ Лето', '🍉'], ['🌷 Весна', '🐣']]); return Q('Какое это время года?', e, s, ['❄️ Зима', '🌷 Весна', '☀️ Лето', '🍂 Осень']); }],
  [1, () => { const fly = pick(['🦅', '🦋', '🐝', '🦉', '🕊️', '🐞']); return Q('Кто умеет летать?', '🪽', fly, ['🐢', '🐘', '🐟', '🐌', '🐷', '🦔', '🐄']); }],
  [1, () => { const [e, s] = pick([['🌙', 'Ночью'], ['☀️', 'Днём'], ['😴', 'Ночью'], ['🏫', 'Днём']]); return Q('Когда это бывает?', e, s, ['Ночью', 'Днём']); }],
  [2, () => { const [e, n, h] = pick(HOMES); return Q(`Где живёт ${low(n)}?`, e, h, [...new Set(HOMES.map(x => x[2]))]); }],
  [2, () => { const [n, k] = pick([['🐱 Кошка', 4], ['🐔 Курица', 2], ['🕷️ Паук', 8], ['🐜 Муравей', 6], ['🐶 Собака', 4], ['🦆 Утка', 2], ['🐞 Божья коровка', 6], ['🐙 Осьминог', 8]]); return Q('Сколько лап?', n, k, [2, 4, 6, 8, 3, 5], `Сколько лап у животного ${low(n.split(' ').slice(1).join(' '))}?`); }],
  [3, () => { const [e, q, a] = pick(JOBS); return Q(q, e, a, JOBS.map(x => x[2])); }],
  [3, () => { const [q, a, wr] = pick(TRANSPORT); return Q(q, '🚦', a, wr); }],
  [4, () => { const [set, odd] = pick(ODD); return Q('Что лишнее?', shuffle(set).join(' '), odd, set); }],
  [4, () => { const [e, q, a, wr] = pick(WEATHER); return Q(q, e, a, wr); }],
  [5, () => { const [q, a, wr] = pick(BODY); return Q(q, '🧒', a, wr); }],
  [5, () => { const [y] = pick([['🥕'], ['🍎'], ['🥦'], ['🍌'], ['🥛'], ['🐟']]); return Q('Что полезнее всего кушать?', '😋', y, ['🍭', '🍟', '🥤', '🍬', '🍩']); }],
  [5, () => { const [a, b, big] = pick([['🐘', '🐭', '🐘'], ['🐳', '🐟', '🐳'], ['🌳', '🌷', '🌳'], ['🏠', '⚽', '🏠'], ['🦒', '🐱', '🦒']]); return Q('Кто или что больше?', `${a}   ${b}`, big, [a, b]); }],
];
// фигуры и цвета
const SHAPES = [['⚪', 'круг'], ['🔺', 'треугольник'], ['🟦', 'квадрат'], ['⭐', 'звезда'], ['❤️', 'сердечко'], ['🔷', 'ромб']];
const COLORS = [['🔴', 'красный'], ['🟢', 'зелёный'], ['🔵', 'синий'], ['🟡', 'жёлтый'], ['🟣', 'фиолетовый'], ['🟠', 'оранжевый'], ['⚫', 'чёрный'], ['⚪', 'белый']];
const THINGS = [['🍓', 'Красная'], ['🥒', 'Зелёный'], ['🍋', 'Жёлтый'], ['🫐', 'Синяя'], ['🍊', 'Оранжевый'], ['🍆', 'Фиолетовый'], ['🐸', 'Зелёная'], ['🌞', 'Жёлтое'], ['🍅', 'Красный'], ['🥕', 'Оранжевая']];
const colorWord = w => w.replace(/(ая|ое|ый|ий)$/, '');
const SHAPE_Q = [
  [1, () => { const [e, n] = pick(SHAPES); return Q(`Найди: ${n}`, '🔎', e, SHAPES.map(x => x[0]), `Найди фигуру ${n}`); }],
  [1, () => { const [e, n] = pick(COLORS); return Q(`Найди ${n} цвет`, '🎨', e, COLORS.map(x => x[0]), `Найди ${n} цвет`); }],
  [2, () => { const [e, n] = pick(THINGS); return Q('Какого цвета?', e, n, THINGS.filter(x => colorWord(x[1]) !== colorWord(n)).map(x => x[1])); }],
  [2, () => { const [e, n] = pick([['🍕', 'треугольник'], ['🍪', 'круг'], ['🎁', 'квадрат'], ['⚽', 'круг'], ['🧀', 'треугольник'], ['🖼️', 'квадрат']]); return Q('На какую фигуру похоже?', e, n, ['круг', 'треугольник', 'квадрат', 'звезда']); }],
  [3, () => { const a = pick(['🔴', '🟦', '⭐']), b = pick(['🟡', '🔺', '❤️']); return Q('Что дальше?', `${a}${b}${a}${b}${a} ❓`, b, [a, '🟢', '⚪', '🟣'], 'Посмотри на узор. Что будет дальше?'); }],
  [4, () => { const [e, n] = pick(SHAPES), k = 2 + rnd(4), others = shuffle(SHAPES.filter(x => x[0] !== e).map(x => x[0])).slice(0, 2); const all = shuffle([...Array(k).fill(e), ...others, ...others.slice(0, 1 + rnd(2))]); return Q(`Сколько тут: ${n}?`, all.join(''), k, nums(k, 1, 7), `Посчитай, сколько тут фигур ${n}`); }],
  [4, () => { const a = pick(['🔴', '🟦']), b = pick(['🟡', '🔺']), c = pick(['⭐', '❤️']); return Q('Что дальше?', `${a}${b}${c}${a}${b} ❓`, c, [a, b, '⚪'], 'Посмотри на узор. Что будет дальше?'); }],
  [5, () => { const [e] = pick(SHAPES), odd = pick(SHAPES.filter(x => x[0] !== e))[0]; return Q('Что лишнее?', shuffle([e, e, e, odd]).join(' '), odd, [e, '🟢', '⚫']); }],
  [5, () => { const a = pick(['🔴', '🟦']), b = pick(['🟡', '🔺']); return Q('Что дальше?', `${a}${a}${b}${a}${a}${b}${a} ❓`, a, [b, '⚪', '🟢'], 'Посмотри внимательно на узор. Что будет дальше?'); }],
];
const GEN = { math: MATH, abc: ABC, world: WORLD, shapes: SHAPE_Q };
export const MAX_LV = s => Math.max(...GEN[s].map(g => g[0]));
// lv — уровень ученика по предмету; n — сколько заданий
export function makeLesson(s, lv = 1, n = 5) {
  const top = GEN[s].filter(g => g[0] === Math.min(lv, MAX_LV(s))), all = GEN[s].filter(g => g[0] <= lv);
  const out = [], seen = new Set();
  for (let tries = 0; out.length < n && tries < 80; tries++) {
    const q = pick(Math.random() < 0.6 ? top : all)[1]();
    const k = q.q + q.pic; if (!seen.has(k) && q.a >= 0) { seen.add(k); out.push(q); }
  }
  return out;
}
export const gradeOf = errors => errors === 0 ? 5 : errors === 1 ? 4 : errors <= 3 ? 3 : 2;
export const COINS = { 5: 150, 4: 100, 3: 60, 2: 30 };

// ================= РАСПИСАНИЕ И ДНИ =================
const DAYS = ['в воскресенье', 'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу'];
const DAY_NAME = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
export const SCHEDULE = { 1: ['math', 'abc', 'world'], 2: ['abc', 'shapes', 'math'], 3: ['world', 'math', 'abc'], 4: ['shapes', 'abc', 'world'], 5: ['math', 'shapes', 'world'] };
const dkey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
export const school = save => {
  const S = save.school || (save.school = {});
  S.diary ||= []; S.best ||= {}; S.signs ||= []; S.lv ||= {}; S.days ||= []; S.stickers ||= [];
  if (S.today?.d !== dkey()) {
    S.today = { d: dkey(), tries: {}, grade: {}, hw: false };
    const base = SCHEDULE[new Date().getDay()];
    // мама попросила «завтра побольше …» — в первый учебный день этот предмет встаёт последним уроком
    if (base && S.focus && !S.focus.used) { const L = [...base]; if (!L.includes(S.focus.s)) L[2] = S.focus.s; S.today.list = L; S.focus.used = S.today.d; }
  }
  return S;
};
export const todayList = save => (save && school(save).today.list) || SCHEDULE[new Date().getDay()] || [];
export const levelOf = (save, s) => Math.min(MAX_LV(s), 1 + Math.floor((school(save).lv[s] || 0) / 2));
export const dayDone = save => { const S = school(save), L = todayList(save); return L.length > 0 && L.every(s => S.today.tries[s]); };
// когда этот предмет в следующий раз
const nextDay = s => { const t = new Date().getDay(); for (let i = 1; i <= 7; i++) { const d = (t + i) % 7; if (SCHEDULE[d]?.includes(s)) return d; } return 1; };
// серия: сколько школьных дней подряд (выходные не прерывают)
export function streak(save) {
  const set = new Set(school(save).days); let n = 0;
  const d = new Date(); if (!set.has(dkey(d))) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 60; i++) {
    const wd = d.getDay();
    if (wd === 0 || wd === 6) { d.setDate(d.getDate() - 1); continue; }
    if (!set.has(dkey(d))) break;
    n++; d.setDate(d.getDate() - 1);
  }
  return n;
}
// призы за школьные дни (всего, не обязательно подряд) — наклейки
export const STICKERS = [
  { n: 1, icon: '🌟', name: 'Первый день в школе', coins: 100 },
  { n: 3, icon: '🦖', name: 'Три дня учёбы', coins: 200 },
  { n: 5, icon: '🎒', name: 'Целая неделя! Рюкзак «Отличник»', coins: 300 },
  { n: 10, icon: '🎓', name: '10 дней! Шапочка выпускника', coins: 500 },
  { n: 15, icon: '📜', name: 'Конец четверти! Грамота', coins: 1000 },
  { n: 20, icon: '🏆', name: '20 дней! Кубок знаний', coins: 1500 },
];
// записать оценку: первая попытка — новая строка в дневнике; исправил — строка обновляется, если стало лучше.
// Вернёт { dayDone, sticker } — закончил все уроки дня, получил наклейку
export function addGrade(save, s, g) {
  const S = school(save), T = S.today;
  T.tries[s] = (T.tries[s] || 0) + 1;
  const row = S.diary.find(d => d.s === s && d.day === T.d && !d.hw);
  if (!row) S.diary.push({ t: Date.now(), day: T.d, s, g, signed: false });
  else if (g > row.g) { row.g = g; row.fixed = true; row.signed = false; }
  if (S.diary.length > 80) S.diary.splice(0, S.diary.length - 80);
  T.grade[s] = Math.max(T.grade[s] || 0, g);
  const out = {};
  S.best[s] = Math.max(S.best[s] || 0, g);
  if (g >= 3 && !(T.up ||= {})[s]) { T.up[s] = true; S.lv[s] = (S.lv[s] || 0) + 1; }   // уровень растёт от пройденных (на 3 и выше) уроков, раз в день по предмету
  if (g === 5 && S.bounty && (S.bounty.s === 'any' || S.bounty.s === s)) { out.bounty = S.bounty; S.bounty = null; }   // мамин приз за пятёрку
  if (!KID_SUBJ.includes(s)) return out;              // мамины занятия — без расписания и наклеек
  if (dayDone(save) && !S.days.includes(T.d)) {
    S.days.push(T.d); out.dayDone = true;
    const st = STICKERS.find(x => x.n === S.days.length);
    if (st && !S.stickers.includes(st.n)) { S.stickers.push(st.n); out.sticker = st; }
  }
  return out;
}
export const schoolDays = save => school(save).days.length;

// ================= МАМЕ — МИЛЫЕ СЛОВА ЗА ОЦЕНКУ =================
export const CHEER = {
  5: ['Умница! С тобой даже думать приятно ✨', 'Пятёрка! Ум — это очень привлекательно 😏', 'Отлично! Я и не сомневался в тебе ❤️', 'Блестяще! Можно я буду тобой гордиться? 🥹', 'Красотка, умница — и всё это одна Бубнилка 💫'],
  4: ['Почти идеально. Зато ты — идеальная 😊', 'Четвёрка! Пятёрку оставим на потом — будет повод вернуться 😉', 'Хорошо! Приятно смотреть, как ты стараешься 💐', 'Здорово! Ещё чуть-чуть — и станешь невыносимо умной 😄'],
  3: ['Тройка — не беда. Главное, что ты улыбаешься 🌸', 'Неплохо! Налей чаю — и давай ещё разок ☕', 'Тройка — это просто разминка. Я в тебя верю 💪'],
  2: ['Дурында, но всё равно самая милая ❤️', 'Двойка? Ну и ладно. Обнимаю тебя через экран 🤗', 'Ну ты и бубнилка! Попробуем ещё? 🥰', 'Двойка — не страшно. Ты хорошая не за оценки 💕'],
};
const cheer = g => `<div class="lcheer">${pick(CHEER[g])}</div>`;

// ================= ГОЛОС =================
let ruVoice = null;
const voices = () => { try { ruVoice = speechSynthesis.getVoices().find(v => /^ru/i.test(v.lang)) || null; } catch { } };
try { voices(); speechSynthesis.onvoiceschanged = voices; } catch { }
export function say(t) {
  try {
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t.replace(/[^\p{L}\p{N}\s.,!?+−-]/gu, ' '));
    u.lang = 'ru-RU'; if (ruVoice) u.voice = ruVoice; u.rate = 0.9; u.pitch = 1.1; speechSynthesis.speak(u);
  } catch { }
}

// ================= УРОК =================
// o: { sfx, lv, n, title, done(grade), back() — кнопка «Готово» }
export function openLesson(s, o) {
  const S = SUBJECTS[s] || { icon: '📝', name: 'Домашнее задание' }, qs = o.qs || makeLesson(s, o.lv, o.n); let i = 0, err = 0, busy = false;
  $('lessonT').textContent = o.title || `${S.icon} ${S.name}${o.lv ? ' · уровень ' + o.lv : ''}`;
  const show = () => {
    const q = qs[i];
    $('lessonBody').innerHTML = `<div class="lprog">${qs.map((_, k) => `<i class="${k < i ? 'ok' : k === i ? 'now' : ''}"></i>`).join('')}</div>
      <div class="lq">${q.q} <button class="lsay">🔊</button></div><div class="lpic${String(q.pic).length > 10 ? ' txt' : ''}">${q.pic}</div>
      <div class="lopts${q.opts.some(x => String(x).length > 6) ? ' txt' : ''}">${q.opts.map((x, k) => `<button data-k="${k}">${x}</button>`).join('')}</div>`;
    $('lessonBody').querySelector('.lsay').onclick = () => say(q.say);
    $('lessonBody').querySelectorAll('.lopts button').forEach(b => b.onclick = () => {
      if (busy) return; const k = +b.dataset.k;
      if (k === q.a) {
        busy = true; b.classList.add('right'); o.sfx.collect?.(); if (!o.quiet) say(pick(['Верно!', 'Молодец!', 'Правильно!', 'Отлично!']));
        setTimeout(() => { busy = false; i++; if (i < qs.length) show(); else finish(); }, 900);
      } else { err++; b.classList.add('wrong'); b.disabled = true; o.sfx.nope?.(); if (!o.quiet) say('Попробуй ещё'); }
    });
    if (!o.quiet) setTimeout(() => say(q.say), 250);
  };
  const finish = () => {
    const g = gradeOf(err);
    $('lessonBody').innerHTML = `<div class="lgrade g${g}">${g}</div>${o.cheer ? cheer(g) : `<div class="lq">${g === 5 ? 'Отлично! Пятёрка! 🎉' : g === 4 ? 'Хорошо! Четвёрка 👍' : g === 3 ? 'Тройка. Можно лучше 💪' : 'Двойка… Можно исправить! 💪'}</div>`}
      <div class="lnote" id="lessonNote"></div><div class="lopts col"><button id="lessonOk">✅ Готово</button></div>`;
    if (!o.quiet) say(g === 5 ? 'Отлично! Пятёрка!' : g === 4 ? 'Хорошо! Четвёрка' : g === 3 ? 'Тройка. Можно лучше' : 'Двойка. Можно исправить');
    const note = o.done(g); if (note) $('lessonNote').innerHTML = note;
    $('lessonOk').onclick = () => { if (o.back) o.back(); else closeOv($('lesson')); };
  };
  openOv('lesson'); show();
}

// ================= ВЫБОР УРОКА ЗА ПАРТОЙ =================
// o: { sfx, start(s, lv) }
export function openDay(save, o) {
  if (o.mama) return openMamaDay(save, o);
  const S = school(save), wd = new Date().getDay(), L = todayList(save);
  $('lessonT').textContent = `📅 ${DAY_NAME[wd]}`;
  let html;
  if (!L.length) html = `<div class="lpic">🎉</div><div class="lq">Сегодня выходной — школа отдыхает!</div><div class="lnote">Приходи в понедельник 👋</div>`;
  else {
    html = `<div class="lq">Уроки на сегодня:</div><div class="lday">` + L.map(s => {
      const U = SUBJECTS[s], n = S.today.tries[s] || 0, g = S.today.grade[s], lv = levelOf(save, s);
      const btn = !n ? `<button data-s="${s}">▶ Начать</button>` : n < 2 && g < 5 ? `<button data-s="${s}" class="fix">🔁 Исправить</button>` : `<span class="dok">✅</span>`;
      return `<div class="lrow"><span class="li">${U.icon}</span><span class="ln">${U.name}<small>уровень ${lv} ${'⭐'.repeat(lv)}</small></span>${g ? `<span class="dg g${g}">${g}</span>` : '<span></span>'}${btn}</div>`;
    }).join('') + '</div>';
    if (S.bounty) html += `<div class="lnote">🎁 Мама обещала <b>+${S.bounty.c}</b> монет за пятёрку ${S.bounty.s === 'any' ? 'по любому уроку' : `на уроке ${SUBJECTS[S.bounty.s].icon} «${SUBJECTS[S.bounty.s].name}»`}!</div>`;
    const rest = KID_SUBJ.filter(s => !L.includes(s));
    if (rest.length) html += `<div class="lnote">${rest.map(s => `${SUBJECTS[s].icon} ${SUBJECTS[s].name} — ${DAYS[nextDay(s)]}`).join(' · ')}</div>`;
    if (dayDone(save)) html += `<div class="lq">🎉 Все уроки на сегодня сделаны!</div><div class="lnote">${S.today.hw ? '📝 Домашка тоже готова. До завтра! 👋' : '📝 Дома тебя ждёт домашнее задание — открой дневник 📒 в рюкзаке'}</div>`;
  }
  const k = streak(save);
  if (k > 1) html += `<div class="lnote">🔥 Ходишь в школу ${k} дн. подряд!</div>`;
  $('lessonBody').innerHTML = html;
  $('lessonBody').querySelectorAll('[data-s]').forEach(b => b.onclick = () => { o.sfx.tap?.(); o.start(b.dataset.s, levelOf(save, b.dataset.s)); });
  openOv('lesson');
}

// ================= ДНЕВНИК =================
const MAMA_PIN = '132';
const day = t => { const d = new Date(t); return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`; };
// canSign — можно ли подписать (у Моти); homework() — открыть домашку (только дома, когда уроки дня сделаны)
export function openDiary(save, { sfx, canSign = true, onSigned, title = '📒 Дневник', homework = null, noPin = false } = {}) {
  const S = school(save);
  $('diaryT').textContent = title;
  const render = () => {
    const unsigned = S.diary.filter(d => !d.signed).length;
    const rows = [...S.diary].reverse().map(d => `<div class="drow"><span class="dd">${day(d.t)}</span><span class="ds">${d.hw ? '📝 Домашка' : `${SUBJECTS[d.s]?.icon || ''} ${SUBJECTS[d.s]?.name || d.s}`}${d.fixed ? ' <small>исправлено</small>' : ''}</span><span class="dg g${d.g}">${d.g}</span><span class="dsig">${d.signed ? '✍️' : ''}</span></div>`).join('');
    const last = S.signs[S.signs.length - 1];
    const stickers = STICKERS.map(x => `<span class="${S.stickers.includes(x.n) ? 'on' : ''}" title="${x.name}">${S.stickers.includes(x.n) ? x.icon : '▫️'}</span>`).join('');
    const week = S.diary.filter(d => Date.now() - d.t < 7 * 864e5), avg = week.length ? (week.reduce((a, d) => a + d.g, 0) / week.length).toFixed(1) : null;
    $('diaryBody').innerHTML = `<div class="dstick">${stickers}<small>школьных дней: ${S.days.length} · подряд: ${streak(save)}</small></div>`
      + (avg ? `<div class="lnote">📊 Средняя оценка за неделю: <b>${avg}</b></div>` : '')
      + (homework ? `<div class="lopts col"><button id="diaryHw">📝 Сделать домашнее задание</button></div>` : '')
      + (S.diary.length ? `<div class="dlist">${rows}</div>` : '<div class="lq">Пока оценок нет. Сходи в школу 🏫 и сядь за парту</div>')
      + (last ? `<div class="dmama">✍️ Мама: «${last.c}» <small>${day(last.t)}</small></div>` : '')
      + (canSign && unsigned ? `<div class="lopts col"><button id="diarySign">✍️ ${noPin ? 'Подписать' : 'Мама, проверь и подпиши'} (${unsigned})</button></div>` : '');
    const b = $('diarySign'); if (b) b.onclick = noPin ? () => commentStep() : pinStep;
    const h = $('diaryHw'); if (h) h.onclick = () => { closeOv($('diary')); homework(); };
  };
  // мама вводит свой PIN — и выбирает, что написать
  const pinStep = () => {
    let pin = '';
    const draw = () => {
      $('diaryBody').innerHTML = `<div class="lq">🔒 Мама, введи свой код</div><div class="dpin">${[0, 1, 2].map(k => `<span class="${k < pin.length ? 'on' : ''}"></span>`).join('')}</div>
        <div class="dkeys">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '✕', 0, '⌫'].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div>`;
      $('diaryBody').querySelectorAll('.dkeys button').forEach(b => b.onclick = () => {
        const k = b.dataset.k; sfx.tap?.();
        if (k === '✕') return render();
        if (k === '⌫') { pin = pin.slice(0, -1); return draw(); }
        pin += k; draw();
        if (pin.length < 3) return;
        if (pin === MAMA_PIN) setTimeout(commentStep, 200); else { sfx.nope?.(); setTimeout(() => { pin = ''; draw(); }, 400); }
      });
    };
    draw();
  };
  const commentStep = () => {
    const C = ['Молодец! Горжусь тобой ❤️', 'Умничка! Так держать 💪', 'Хорошо, но можно лучше 😊', 'Давай подтянем оценки вместе 📚'];
    $('diaryBody').innerHTML = `<div class="lq">✍️ Что написать Моте?</div><div class="lopts col">${C.map((c, k) => `<button data-k="${k}">${c}</button>`).join('')}</div>`;
    $('diaryBody').querySelectorAll('.lopts button').forEach(b => b.onclick = () => {
      const n = S.diary.filter(d => !d.signed).length, fives = S.diary.filter(d => !d.signed && d.g >= 4).length;
      S.diary.forEach(d => { d.signed = true; });
      S.signs.push({ t: Date.now(), c: C[+b.dataset.k] }); if (S.signs.length > 20) S.signs.shift();
      render(); onSigned && onSigned({ n, fives, c: C[+b.dataset.k] });
    });
  };
  openOv('diary'); render();
}
// домашнее задание: 3 вопроса по сегодняшним урокам. Оценка — в дневник отдельной строкой
export function homeworkQs(save) {
  const L = todayList(save), out = [];
  for (const s of shuffle(L)) out.push(...makeLesson(s, levelOf(save, s), 1));
  return out.slice(0, 3);
}
export function addHomework(save, g) {
  const S = school(save); S.today.hw = true;
  S.diary.push({ t: Date.now(), day: S.today.d, s: 'hw', hw: true, g, signed: false });
}

// ================= ЗАНЯТИЯ ДЛЯ МАМЫ =================
// 🧠 Эрудит: 5 вопросов на общие знания
const ER = [
  ['🏛️', 'Столица Франции?', 'Париж', ['Лион', 'Марсель', 'Ницца']], ['🏛️', 'Столица Японии?', 'Токио', ['Киото', 'Осака', 'Сеул']], ['🏛️', 'Столица Австралии?', 'Канберра', ['Сидней', 'Мельбурн', 'Перт']],
  ['🏛️', 'Столица Канады?', 'Оттава', ['Торонто', 'Монреаль', 'Ванкувер']], ['🏛️', 'Столица Турции?', 'Анкара', ['Стамбул', 'Измир', 'Анталья']], ['🏛️', 'Столица Бразилии?', 'Бразилиа', ['Рио-де-Жанейро', 'Сан-Паулу', 'Буэнос-Айрес']],
  ['🏛️', 'Столица Испании?', 'Мадрид', ['Барселона', 'Севилья', 'Лиссабон']], ['🏛️', 'Столица Египта?', 'Каир', ['Александрия', 'Луксор', 'Тунис']], ['🏛️', 'Столица Китая?', 'Пекин', ['Шанхай', 'Гонконг', 'Токио']],
  ['🪐', 'Сколько планет в Солнечной системе?', '8', ['7', '9', '10']], ['🪐', 'Самая большая планета?', 'Юпитер', ['Сатурн', 'Нептун', 'Земля']], ['🪐', 'Какую планету называют Красной?', 'Марс', ['Венера', 'Юпитер', 'Меркурий']],
  ['🪐', 'Самая маленькая планета Солнечной системы?', 'Меркурий', ['Марс', 'Венера', 'Плутон']], ['🚀', 'Первый человек в космосе?', 'Юрий Гагарин', ['Герман Титов', 'Нил Армстронг', 'Алексей Леонов']],
  ['🚀', 'В каком году Гагарин полетел в космос?', '1961', ['1957', '1965', '1969']], ['📖', 'Кто написал «Евгения Онегина»?', 'Пушкин', ['Лермонтов', 'Гоголь', 'Тургенев']],
  ['📖', 'Кто написал «Войну и мир»?', 'Толстой', ['Достоевский', 'Чехов', 'Тургенев']], ['📖', 'Кто написал «Преступление и наказание»?', 'Достоевский', ['Толстой', 'Гоголь', 'Чехов']],
  ['📖', 'Кто написал «Мастера и Маргариту»?', 'Булгаков', ['Пастернак', 'Набоков', 'Горький']], ['📖', 'Кто написал «Мёртвые души»?', 'Гоголь', ['Пушкин', 'Лермонтов', 'Гончаров']],
  ['📖', 'Кто написал «Каштанку»?', 'Чехов', ['Толстой', 'Бунин', 'Куприн']], ['📖', 'Кто написал «Ромео и Джульетту»?', 'Шекспир', ['Байрон', 'Диккенс', 'Гёте']],
  ['📖', 'Кто написал «Маленького принца»?', 'Сент-Экзюпери', ['Жюль Верн', 'Андерсен', 'Дюма']], ['🐈‍⬛', 'Как зовут кота в «Мастере и Маргарите»?', 'Бегемот', ['Матроскин', 'Леопольд', 'Мурзик']],
  ['🎨', 'Кто написал «Мону Лизу»?', 'Леонардо да Винчи', ['Микеланджело', 'Рафаэль', 'Ван Гог']], ['🩰', 'Кто написал музыку к «Лебединому озеру»?', 'Чайковский', ['Рахманинов', 'Глинка', 'Мусоргский']],
  ['🧪', 'Кто создал периодическую таблицу элементов?', 'Менделеев', ['Ломоносов', 'Павлов', 'Попов']], ['🧪', 'Химический символ золота?', 'Au', ['Ag', 'Fe', 'Go']], ['🧪', 'Какой металл жидкий при комнатной температуре?', 'Ртуть', ['Олово', 'Свинец', 'Алюминий']],
  ['🌊', 'Самый большой океан?', 'Тихий', ['Атлантический', 'Индийский', 'Северный Ледовитый']], ['⛰️', 'Самая высокая гора в мире?', 'Эверест', ['Эльбрус', 'Килиманджаро', 'Монблан']],
  ['🏞️', 'Самое глубокое озеро в мире?', 'Байкал', ['Ладожское', 'Онежское', 'Виктория']], ['🗼', 'В каком городе Эйфелева башня?', 'Париж', ['Лондон', 'Рим', 'Берлин']], ['🏟️', 'В каком городе Колизей?', 'Рим', ['Афины', 'Милан', 'Мадрид']],
  ['💴', 'Валюта Японии?', 'Иена', ['Юань', 'Вона', 'Рупия']], ['💷', 'Валюта Великобритании?', 'Фунт стерлингов', ['Евро', 'Доллар', 'Франк']],
  ['🐆', 'Самое быстрое наземное животное?', 'Гепард', ['Лев', 'Антилопа', 'Лошадь']], ['🐋', 'Самое большое животное на Земле?', 'Синий кит', ['Африканский слон', 'Кашалот', 'Жираф']],
  ['🐙', 'Сколько сердец у осьминога?', '3', ['1', '2', '4']], ['🕷️', 'Как называется боязнь пауков?', 'Арахнофобия', ['Клаустрофобия', 'Агорафобия', 'Акрофобия']],
  ['🦴', 'Сколько костей у взрослого человека?', '206', ['186', '226', '300']], ['🧬', 'Сколько хромосом у человека?', '46', ['23', '44', '48']], ['🫀', 'Самый большой орган человека?', 'Кожа', ['Печень', 'Сердце', 'Лёгкие']],
  ['☀️', 'Какой витамин вырабатывается от солнца?', 'D', ['C', 'A', 'B12']], ['🌈', 'Сколько цветов у радуги?', '7', ['5', '6', '8']], ['🎨', 'Синий + жёлтый = ?', 'Зелёный', ['Фиолетовый', 'Оранжевый', 'Коричневый']],
  ['📅', 'Сколько дней в високосном году?', '366', ['365', '364', '367']], ['⏱️', 'Сколько секунд в часе?', '3600', ['600', '360', '6000']], ['🎸', 'Сколько струн у классической гитары?', '6', ['4', '5', '7']],
  ['⚽', 'Сколько игроков одной команды на футбольном поле?', '11', ['9', '10', '12']], ['🏅', 'Где прошла зимняя Олимпиада 2014 года?', 'Сочи', ['Ванкувер', 'Турин', 'Пхёнчхан']],
  ['🕊️', 'Какая птица — символ мира?', 'Голубь', ['Лебедь', 'Аист', 'Журавль']], ['🎄', 'Город, где Женя Лукашин оказался в «Иронии судьбы»?', 'Ленинград', ['Москва', 'Киев', 'Рига']],
  ['🚢', 'Кто снял фильм «Титаник»?', 'Джеймс Кэмерон', ['Стивен Спилберг', 'Ридли Скотт', 'Кристофер Нолан']], ['📻', 'В чём измеряют частоту?', 'В герцах', ['В ваттах', 'В вольтах', 'В амперах']],
  ['🌵', 'Из какого растения делают текилу?', 'Агава', ['Кактус', 'Алоэ', 'Юкка']], ['🚩', 'В каком году распался СССР?', '1991', ['1989', '1993', '1985']],
];
// 📜 Поэзия: чьи строки, кто написал поэму
const POETS = ['Пушкин', 'Лермонтов', 'Есенин', 'Блок', 'Тютчев', 'Фет', 'Некрасов', 'Маяковский', 'Цветаева', 'Мандельштам'];
const LINES = [
  ['«Я помню чудное мгновенье…»', 'Пушкин'], ['«Мороз и солнце; день чудесный!»', 'Пушкин'], ['«У лукоморья дуб зелёный…»', 'Пушкин'], ['«Я вас любил: любовь ещё, быть может…»', 'Пушкин'], ['«Зима!.. Крестьянин, торжествуя…»', 'Пушкин'],
  ['«Белеет парус одинокой…»', 'Лермонтов'], ['«Выхожу один я на дорогу…»', 'Лермонтов'], ['«Скажи-ка, дядя, ведь не даром…»', 'Лермонтов'], ['«Тучки небесные, вечные странники!»', 'Лермонтов'],
  ['«Не жалею, не зову, не плачу…»', 'Есенин'], ['«Белая берёза под моим окном…»', 'Есенин'], ['«Ты жива ещё, моя старушка?»', 'Есенин'], ['«Отговорила роща золотая…»', 'Есенин'], ['«Гой ты, Русь, моя родная…»', 'Есенин'],
  ['«Ночь, улица, фонарь, аптека…»', 'Блок'], ['«Девушка пела в церковном хоре…»', 'Блок'],
  ['«Люблю грозу в начале мая…»', 'Тютчев'], ['«Умом Россию не понять…»', 'Тютчев'], ['«Ещё в полях белеет снег…»', 'Тютчев'],
  ['«Шёпот, робкое дыханье…»', 'Фет'], ['«Я пришёл к тебе с приветом…»', 'Фет'],
  ['«Однажды, в студёную зимнюю пору…»', 'Некрасов'], ['«Есть женщины в русских селеньях…»', 'Некрасов'], ['«Поэтом можешь ты не быть, но гражданином быть обязан»', 'Некрасов'],
  ['«Послушайте! Ведь, если звёзды зажигают…»', 'Маяковский'], ['«Я сразу смазал карту будня…»', 'Маяковский'],
  ['«Мне нравится, что вы больны не мной…»', 'Цветаева'], ['«Моим стихам, написанным так рано…»', 'Цветаева'],
  ['«Бессонница. Гомер. Тугие паруса…»', 'Мандельштам'],
];
const POEMS = [['«Мцыри»', 'Лермонтов'], ['«Демон»', 'Лермонтов'], ['«Руслан и Людмила»', 'Пушкин'], ['«Медный всадник»', 'Пушкин'], ['«Двенадцать»', 'Блок'], ['«Облако в штанах»', 'Маяковский'],
  ['«Анна Снегина»', 'Есенин'], ['«Чёрный человек»', 'Есенин'], ['«Кому на Руси жить хорошо»', 'Некрасов'], ['«Мороз, Красный нос»', 'Некрасов'], ['«Евгений Онегин»', 'Пушкин']];
const poetryLesson = () => shuffle([...shuffle(LINES).slice(0, 4).map(([l, a]) => Q('Чьи это строки?', l, a, POETS)), ...shuffle(POEMS).slice(0, 2).map(([p, a]) => Q(`Кто написал поэму ${p}?`, '🪶', a, POETS))]).slice(0, 5);
// 📚 Книжный клуб: герой — из какой книги, кто автор, чья это первая фраза
const BOOKS = [['Раскольников', '«Преступление и наказание»', 'Достоевский'], ['Сонечка Мармеладова', '«Преступление и наказание»', 'Достоевский'], ['Печорин', '«Герой нашего времени»', 'Лермонтов'],
  ['Обломов', '«Обломов»', 'Гончаров'], ['Базаров', '«Отцы и дети»', 'Тургенев'], ['Чичиков', '«Мёртвые души»', 'Гоголь'], ['Наташа Ростова', '«Война и мир»', 'Толстой'], ['Воланд', '«Мастер и Маргарита»', 'Булгаков'],
  ['Шариков', '«Собачье сердце»', 'Булгаков'], ['Остап Бендер', '«Двенадцать стульев»', 'Ильф и Петров'], ['Татьяна Ларина', '«Евгений Онегин»', 'Пушкин'], ['Чацкий', '«Горе от ума»', 'Грибоедов'],
  ['Ассоль', '«Алые паруса»', 'Грин'], ['Анна Каренина', '«Анна Каренина»', 'Толстой'], ['Элизабет Беннет', '«Гордость и предубеждение»', 'Джейн Остин'], ['Джейн Эйр', '«Джейн Эйр»', 'Шарлотта Бронте'],
  ['Скарлетт О’Хара', '«Унесённые ветром»', 'Маргарет Митчелл'], ['Дориан Грей', '«Портрет Дориана Грея»', 'Оскар Уайльд'], ['Джей Гэтсби', '«Великий Гэтсби»', 'Фицджеральд'], ['Холден Колфилд', '«Над пропастью во ржи»', 'Сэлинджер'],
  ['Эдмон Дантес', '«Граф Монте-Кристо»', 'Дюма'], ['Квазимодо', '«Собор Парижской Богоматери»', 'Гюго'], ['Жан Вальжан', '«Отверженные»', 'Гюго'], ['Шерлок Холмс', 'рассказы о Шерлоке Холмсе', 'Конан Дойл']];
const FIRST = [['«Все счастливые семьи похожи друг на друга…»', '«Анна Каренина»'], ['«Мой дядя самых честных правил…»', '«Евгений Онегин»'],
  ['«В начале июля, в чрезвычайно жаркое время, под вечер…»', '«Преступление и наказание»'], ['«Однажды весною, в час небывало жаркого заката, в Москве, на Патриарших прудах…»', '«Мастер и Маргарита»']];
const booksLesson = () => {
  const titles = [...new Set(BOOKS.map(b => b[1]).filter(t => t.startsWith('«')))], authors = [...new Set(BOOKS.map(b => b[2]))];
  const qs = shuffle(BOOKS).slice(0, 3).map(([h, t, a]) => Q(`Из какой книги ${h}?`, '📖', t, titles.filter(x => x !== t)));
  qs.push(...shuffle(BOOKS.filter(b => b[1].startsWith('«'))).slice(0, 1).map(([, t, a]) => Q(`Кто автор книги ${t}?`, '✍️', a, authors.filter(x => x !== a))));
  qs.push(...shuffle(FIRST).slice(0, 1).map(([l, t]) => Q('С этой фразы начинается…', l, t, titles.filter(x => x !== t))));
  return shuffle(qs);
};
const eruditLesson = () => shuffle(ER).slice(0, 5).map(([e, q, a, wr]) => Q(q, e, a, wr));

// мамины занятия за партой: без расписания, монеты — за первый раз в день
function openMamaDay(save, o) {
  const S = school(save);
  $('lessonT').textContent = '🎓 Занятия для мамы';
  const WHAT = { erudit: '5 вопросов обо всём на свете', poetry: 'чьи это строки? кто написал поэму?', books: 'герои, авторы и первые фразы книг' };
  $('lessonBody').innerHTML = `<div class="lq">Чем займёмся?</div><div class="lday">` + ['erudit', 'poetry', 'books'].map(s => {
    const U = SUBJECTS[s], g = S.today.grade[s], n = S.today.tries[s] || 0;
    return `<div class="lrow"><span class="li">${U.icon}</span><span class="ln">${U.name}<small>${WHAT[s]}${S.best[s] ? ` · лучшая: ${S.best[s]}` : ''}</small></span>${g ? `<span class="dg g${g}">${g}</span>` : '<span></span>'}<button data-s="${s}" class="${n ? 'fix' : ''}">${n ? '🔁 Ещё' : '▶ Начать'}</button></div>`;
  }).join('') + `</div><div class="lnote">Монеты — за первое занятие каждого вида в день</div>`;
  $('lessonBody').querySelectorAll('[data-s]').forEach(b => b.onclick = () => { o.sfx.tap?.(); o.start(b.dataset.s); });
  openOv('lesson');
}
export function openMamaLesson(s, o) {
  const QS = { erudit: eruditLesson, poetry: poetryLesson, books: booksLesson };
  openLesson(s, { ...o, qs: QS[s](), title: `${SUBJECTS[s].icon} ${SUBJECTS[s].name}`, quiet: true, cheer: true });
}

// ================= УЧИТЕЛЬСКАЯ (мама настраивает Мотину школу) =================
// ms — Мотино сохранение; changed() — записать его
export function openTeacher(ms, { sfx, changed, diary }) {
  const S = school(ms);
  const NOTES = ['Мотя, сегодня жду пятёрку! ❤️', 'Ты молодец! Мама гордится 💪', 'Учись хорошо — вечером сюрприз 🎁', 'Не торопись и думай 🤓'];
  $('lessonT').textContent = '👩‍🏫 Учительская';
  const render = (m = '') => {
    $('lessonBody').innerHTML = `${m ? `<div class="lnote">${m}</div>` : ''}
      <div class="tsec"><b>📝 Записка на доске для Моти</b><div class="lnote">${S.mamaNote ? `сейчас: «${S.mamaNote}»` : 'пока нет'}</div>
        <div class="tchips">${NOTES.map((t, k) => `<button data-n="${k}">${t}</button>`).join('')}</div>
        <div class="trow"><input id="tNote" maxlength="60" placeholder="или напиши свою…"><button id="tNoteOk">✓</button>${S.mamaNote ? '<button id="tNoteDel">✕</button>' : ''}</div></div>
      <div class="tsec"><b>🎁 Приз за пятёрку</b><div class="lnote">${S.bounty ? `сейчас: +${S.bounty.c} за пятёрку ${S.bounty.s === 'any' ? 'по любому уроку' : 'на уроке «' + SUBJECTS[S.bounty.s].name + '»'}` : 'пока нет'}</div>
        <div class="tchips">${['any', ...KID_SUBJ].map(s => `<button data-bs="${s}" class="${(S.bountyPick || 'any') === s ? 'on' : ''}">${s === 'any' ? '⭐ Любой урок' : SUBJECTS[s].icon + ' ' + SUBJECTS[s].name}</button>`).join('')}</div>
        <div class="tchips">${[200, 300, 500].map(c => `<button data-bc="${c}">+${c} 💰</button>`).join('')}${S.bounty ? '<button id="tBDel">✕ убрать</button>' : ''}</div></div>
      <div class="tsec"><b>📚 В следующий учебный день — побольше…</b><div class="lnote">${S.focus && !S.focus.used ? `выбрано: ${SUBJECTS[S.focus.s].icon} ${SUBJECTS[S.focus.s].name}` : 'обычное расписание'}</div>
        <div class="tchips">${KID_SUBJ.map(s => `<button data-f="${s}">${SUBJECTS[s].icon} ${SUBJECTS[s].name}</button>`).join('')}</div></div>
      <div class="lopts col"><button id="tDiary">📒 Дневник Моти</button></div>`;
    const B = $('lessonBody');
    B.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { S.mamaNote = NOTES[+b.dataset.n]; changed(); sfx.tap?.(); render('✅ Записка на доске'); });
    $('tNoteOk').onclick = () => { const t = $('tNote').value.trim(); if (!t) return; S.mamaNote = t.slice(0, 60); changed(); sfx.tap?.(); render('✅ Записка на доске'); };
    const nd = $('tNoteDel'); if (nd) nd.onclick = () => { S.mamaNote = null; changed(); render('Записка убрана'); };
    B.querySelectorAll('[data-bs]').forEach(b => b.onclick = () => { S.bountyPick = b.dataset.bs; render(); });
    B.querySelectorAll('[data-bc]').forEach(b => b.onclick = () => { S.bounty = { s: S.bountyPick || 'any', c: +b.dataset.bc }; changed(); sfx.tap?.(); render('🎁 Приз назначен — Мотя увидит его в расписании'); });
    const bd = $('tBDel'); if (bd) bd.onclick = () => { S.bounty = null; changed(); render('Приз убран'); };
    B.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { S.focus = { s: b.dataset.f }; changed(); sfx.tap?.(); render('📚 Готово: в следующий учебный день будет этот урок'); });
    $('tDiary').onclick = () => { closeOv($('lesson')); diary(); };
  };
  openOv('lesson'); render();
}
