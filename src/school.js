// Школа 🏫: двор с флагом и большое здание без крыши (камера сверху).
// Холл с расписанием и дневником → длинный коридор → четыре кабинета (у каждого предмета свой учитель и обстановка),
// столовая с поварихой, учительская (мамин стул) и библиотека (мамины занятия).
// Школа живёт по звонку: урок — класс сидит в кабинете своего предмета, учитель у доски;
// перемена — ребята бегают по коридору, обедают в столовой, учителя отдыхают в учительской.
// Мотя садится за свободную парту в любом кабинете — открывается урок этого предмета (lessons.js → openRoom).
import { T, scene, group, box, dampAngle } from './engine.js';
import { solid, portal, clouds, onLevelReset } from './world.js';
import { makeLabel, puff } from './fx.js';
import { buildHero, compactHero, animateHero, PEOPLE } from './hero.js';
import { dressHero } from './clothes.js';
import { todayList } from './lessons.js';

export const SCHOOL = { spawn: { x: 0, z: 14, face: Math.PI } };
export const SUBJECTS = {
  math: { icon: '➕', name: 'Математика', color: 0xff5a5a },
  abc: { icon: '📖', name: 'Буквы', color: 0x3fa7ff },
  world: { icon: '🌍', name: 'Мир вокруг', color: 0x4ad04a },
  shapes: { icon: '🔺', name: 'Фигуры и цвета', color: 0xffb020 },
  erudit: { icon: '🧠', name: 'Эрудит', color: 0x9b6bff },          // мамины занятия
  poetry: { icon: '📜', name: 'Поэзия', color: 0xd8a040 },
  books: { icon: '📚', name: 'Книжный клуб', color: 0x3fa7ff },
};
export const KID_SUBJ = ['math', 'abc', 'world', 'shapes'], MAMA_SUBJ = ['erudit', 'poetry', 'books'];
const hex = c => '#' + c.toString(16).padStart(6, '0');

// ---------- план здания ----------
const H = 4.8, WALL = 0xe8a07a, BAND = 0xffffff;
const B = { x0: -31, x1: 31, z0: -29, z1: 7 };                       // всё здание
const COR = { z0: -14, z1: -8, z: -11 };                             // коридор
const RZ0 = B.z0, RZ1 = COR.z0;                                      // кабинеты — к северу от коридора
const ROOM = { math: -23.25, abc: -7.75, world: 7.75, shapes: 23.25 };   // центр кабинета по x
const ROWS = [-24.2, -21.6, -19, -16.4];                             // ряды парт (стульчик — на 1.15 южнее)
const MY_SEAT = 2;                                                   // «твоя парта» — всегда свободна для Моти
const CANTEEN = { x0: B.x0, x1: -7, door: -18.5 }, STAFF = { x0: 7, x1: 18, door: 12.5 }, LIB = { x0: 18, x1: B.x1, door: 24.5 };
const DIARY = { x: -4.5, z: 3 };
const LESSON_T = 50, BREAK_T = 30;                                   // сколько длится урок и перемена (секунды игры)

export const TEACHERS = [
  { s: 'math', name: 'Марья Ивановна', look: { skin: 0xf6d0b0, shirt: 0x8a3a6a, pants: 0x2b2b3a, shoes: 0x1d1d23, sole: 0x111114, hair: 0x6a3a1a, hairHi: 0x8a5a2a, style: 'long', cheeks: true }, wear: { shirt: 'bl_white', legs: 'sk_check', shoes: 'so_heels', glasses: 'round' } },
  { s: 'abc', name: 'Анна Петровна', look: { skin: 0xf8d0ae, shirt: 0x3a6ad8, pants: 0x2b2b3a, shoes: 0x1d1d23, sole: 0x111114, hair: 0xd8b060, hairHi: 0xf0d080, style: 'long', cheeks: true }, wear: { glasses: 'round' } },
  { s: 'world', name: 'Пётр Николаевич', look: { skin: 0xf2c29a, shirt: 0x4a8a4a, pants: 0x5a4a3a, shoes: 0x3a2a1a, sole: 0x1a1a1a, hair: 0x8a8a8a, hairHi: 0xa8a8a8, style: 'crop', beard: 0x9a9a9a }, wear: { glasses: 'round' } },
  { s: 'shapes', name: 'Светлана Игоревна', look: { skin: 0xffd9b8, shirt: 0xff8a3a, pants: 0x3a2a6a, shoes: 0xff5a8a, sole: 0xffffff, hair: 0x2a1a10, hairHi: 0x4a2a18, style: 'long', apron: 0x9ad8ff, cheeks: true }, wear: {} },
];
const COOK = { name: 'Тётя Валя', look: { skin: 0xf6c9a6, shirt: 0xffffff, pants: 0x3a4a7a, shoes: 0xffffff, sole: 0xd8d8d8, hair: 0x7a4a2a, hairHi: 0x7a4a2a, style: 'crop', hat: 'scarf', hatC: 0xffffff, apron: 0xffffff, cheeks: true } };
// одноклассники: кто и в чём
export const CLASSMATES = [
  ['kolya', 'Коля', { shirt: 'sc_jacket', legs: 'pt_school', bag: 'bp_red' }],
  ['olya', 'Оля', { shirt: 'sc_vest', legs: 'pt_school2', bag: 'bp_unicorn' }],
  ['petya', 'Петя', { shirt: 'sc_shirt', legs: 'pt_school', bag: 'bp_car' }],
  ['masha', 'Маша', { shirt: 'sc_jacket2', legs: 'pt_school2', bag: 'bp_bear' }],
  ['sonya', 'Соня', { shirt: 'sc_shirt', legs: 'pt_school2', bag: 'bp_space' }],
  ['timur', 'Тимур', { shirt: 'sc_jacket', legs: 'pt_school', bag: 'bp_dino' }],
  ['alisa', 'Алиса', { shirt: 'sc_vest', legs: 'pt_school', bag: 'bp_school' }],
];

// посадить модель: ноги вперёд, тело ниже, руки на парту
export function sitPose(m, k = 1) {
  m.legL.rotation.x = m.legR.rotation.x = -1.45 * k; m.body.position.y = -0.36 * k;
  m.armL.rotation.x = m.armR.rotation.x = -1.1 * k; m.armL.rotation.z = m.armR.rotation.z = 0;
}

let st = null;
onLevelReset(() => { st = null; });

// face — табличка на стене (не крутится за камерой); без face — вывеска над предметом
const label = (t, x, y, z, w, col = '#ffffff', face) => { const l = makeLabel(w, w / 4, { face }); l.position.set(x, y, z); scene.add(l); l.userData.set(t, { color: col }); return l; };
const N = 0, S_ = Math.PI, E = Math.PI / 2, W_ = -Math.PI / 2;     // куда смотрит табличка: +z, −z, +x, −x
const V = (x, z) => ({ x, z });

// стены толщиной 1 по линии; gaps — проёмы [от, до]
function wallX(w, z, x0, x1, gaps = []) { let a = x0; for (const [g0, g1] of [...gaps, [x1, x1]]) { if (g0 > a + 0.01) solid(w, g0 - a, H, 1, WALL, (a + g0) / 2, 0, z, { cam: true }); a = g1; } }
function wallZ(w, x, z0, z1, gaps = []) { let a = z0; for (const [g0, g1] of [...gaps, [z1, z1]]) { if (g0 > a + 0.01) solid(w, 1, H, g0 - a, WALL, x, 0, (a + g0) / 2, { cam: true }); a = g1; } }

function desk(w, x, z, top = 0xd9a066, chair = 0x3fa7ff) {
  box(w, 2.6, 0.14, 1.3, top, x, 1.05, z);
  for (const sx of [-1, 1]) box(w, 0.14, 1, 1.1, 0x8a5a2b, x + sx * 1.15, 0.5, z);
  solid(w, 2.8, 0.9, 1.5, top, x, 0, z).visible = false;                               // сквозь парту не пройти
  box(w, 1, 0.12, 0.9, chair, x, 0.62, z + 1.1); box(w, 1, 0.9, 0.12, chair, x, 1.05, z + 1.55);   // стульчик
  for (const sx of [-1, 1]) box(w, 0.1, 0.6, 0.1, 0x6a6f7a, x + sx * 0.4, 0.3, z + 1.1);
}
function chair(w, x, z, face, c = 0x8a3a6a) {                       // стул: сиденье и спинка (спинка — за спиной сидящего)
  const g = group(w, x, 0, z); g.rotation.y = face;
  box(g, 1, 0.12, 0.9, c, 0, 0.62, 0); box(g, 1, 0.9, 0.12, c, 0, 1.05, -0.45);
}
const plant = (w, x, z) => { box(w, 0.8, 0.7, 0.8, 0xc85a3a, x, 0.35, z); for (const [dx, y, dz] of [[0, 1, 0], [-0.3, 1.3, 0.1], [0.3, 1.25, -0.1], [0, 1.6, 0]]) box(w, 0.5, 0.5, 0.5, 0x4ad04a, x + dx, y, z + dz); };
function shelf(w, x, z, len, alongX) {                              // книжный шкаф у стены
  const [sw, sd] = alongX ? [len, 0.8] : [0.8, len];
  solid(w, sw, 3, sd, 0x8a5a2b, x, 0, z);
  for (let r = 0; r < 3; r++) for (let i = 0; i < len / 0.45 - 1; i++) {
    const c = [0xd8261a, 0x3fa7ff, 0x5fd35f, 0xffd23f, 0x9b6bff, 0xff8a3a][(i + r * 2) % 6], o = -len / 2 + 0.4 + i * 0.45;
    box(w, alongX ? 0.32 : 0.5, 0.6, alongX ? 0.5 : 0.32, c, x + (alongX ? o : (x < 0 ? 0.25 : -0.25)), 0.55 + r * 0.95, z + (alongX ? (z < -20 ? 0.25 : -0.25) : o), { shadow: false });
  }
}

// ---------- кабинеты ----------
const BOARD_TXT = { math: '2 + 3 = 5   ·   7 − 4 = 3', abc: 'МА-МА · МО-ТЯ · ШКО-ЛА', world: '🌍 Земля — наш дом', shapes: '🔺 🟦 🟡 — фигуры!' };
function classroom(w, s, who) {
  const cx = ROOM[s], U = SUBJECTS[s], col = U.color;
  // полоса цвета предмета по низу стен и коврик у доски
  box(w, 15.3, 0.6, 0.06, col, cx, 0.3, RZ0 + 0.53, { shadow: false, studs: false });
  box(w, 7, 0.03, 2.6, col, cx, 0.13, RZ0 + 2.2, { shadow: false, studs: true });
  // доска и полочка для мела
  box(w, 9, 3, 0.2, 0x8a5a2b, cx, 2.8, RZ0 + 0.6); box(w, 8.4, 2.6, 0.22, 0x2f4a3a, cx, 2.8, RZ0 + 0.62); box(w, 8, 0.15, 0.4, 0x8a5a2b, cx, 1.3, RZ0 + 0.8);
  st.boards[s] = label(BOARD_TXT[s], cx, 2.85, RZ0 + 0.78, 7.6, '#ffffff', N);
  // стол учителя и стул за ним
  solid(w, 3, 1.1, 1.4, 0x8a5a2b, cx + 4.5, 0, RZ0 + 3.2);
  for (let i = 0; i < 3; i++) box(w, 0.8, 0.15, 0.6, [0xd8261a, 0xffd23f, 0x3fa7ff][i], cx + 5.3, 1.18 + i * 0.15, RZ0 + 3.2);
  chair(w, cx + 4.5, RZ0 + 1.8, 0);
  // парты: 2 колонки × 4 ряда, проход посередине
  ROWS.forEach((z, r) => { for (const sx of [-1, 1]) { desk(w, cx + sx * 3.2, z); st.seats.push({ x: cx + sx * 3.2, z: z + 1.15, room: s, i: r * 2 + (sx > 0 ? 1 : 0) }); } });
  if (who !== 'mama') { const S = st.seats.find(q => q.room === s && q.i === MY_SEAT); label('🪑 Твоя парта', S.x, 2.4, S.z - 1.2, 3, '#ffe14d'); }
  // обстановка по предмету
  const wx = cx - 6.6;                                                 // у западной стены кабинета
  if (s === 'math') {
    label('1 2 3 4 5 6 7 8 9 10', cx, 4.5, RZ0 + 0.8, 5.6, '#7fd4ff', N);
    box(w, 0.2, 2, 2.6, 0x8a5a2b, wx, 1.9, -21);                       // счёты на стене
    for (let r = 0; r < 4; r++) { box(w, 0.06, 0.04, 2.4, 0x6a6f7a, wx + 0.15, 1.2 + r * 0.45, -21, { shadow: false }); for (let i = 0; i < 5; i++) box(w, 0.2, 0.3, 0.3, [0xff5a5a, 0xffd23f, 0x3fa7ff, 0x4ad04a][r], wx + 0.2, 1.2 + r * 0.45, -21.9 + i * 0.32 + r * 0.1, { shadow: false }); }
    label('+ − × =', wx + 0.2, 3.6, -21, 3, '#ffd23f', E);
  } else if (s === 'abc') {
    label('А Б В Г Д Е Ё Ж З И', cx, 4.5, RZ0 + 0.8, 5.6, '#ffd23f', N);
    shelf(w, wx, -21, 5, false);
  } else if (s === 'world') {
    box(w, 0.9, 0.9, 0.9, 0x3fa7ff, cx + 4, 1.65, RZ0 + 3.2); box(w, 0.5, 0.4, 0.92, 0x4ad04a, cx + 4.05, 1.75, RZ0 + 3.2); box(w, 0.1, 0.5, 0.1, 0x8a5a2b, cx + 4, 1.1, RZ0 + 3.2);   // глобус
    solid(w, 1.2, 0.9, 3, 0x2b2b3a, wx, 0, -20);                                       // аквариум
    box(w, 1.1, 1.1, 2.8, 0x7fd4ff, wx, 1.45, -20); for (const [y, z, c] of [[1.3, -20.8, 0xff8a1a], [1.6, -19.6, 0xffd23f], [1.2, -19.2, 0xff5a8a]]) box(w, 1.12, 0.18, 0.3, c, wx, y, z, { shadow: false });
    plant(w, cx + 6.2, -15.3); plant(w, cx - 6.2, -15.3);
    label('🐠 Аквариум', wx + 0.65, 2.55, -20, 3, '#7fd4ff', E);
  } else {
    for (const [i, z] of [-22.5, -19.5].entries()) {                  // мольберты с картинками
      const g = group(w, wx + 0.6, 0, z); g.rotation.y = Math.PI / 2;
      for (const sx of [-1, 1]) { const l = box(g, 0.1, 2.4, 0.1, 0x8a5a2b, sx * 0.5, 1.2, 0); l.rotation.z = sx * 0.12; }
      box(g, 1.6, 1.2, 0.08, 0xffffff, 0, 1.8, 0.06); box(g, 0.5, 0.5, 0.1, [0xff5a5a, 0x3fa7ff][i], -0.3, 1.9, 0.1, { shadow: false }); box(g, 0.4, 0.4, 0.1, [0xffd23f, 0x4ad04a][i], 0.35, 1.65, 0.1, { shadow: false });
    }
    box(w, 1, 1, 1, 0xff5a5a, cx + 6, 0.5, -16); box(w, 1, 0.5, 1, 0x3fa7ff, cx + 6, 0.25, -17.6); box(w, 0.6, 0.5, 0.6, 0x3fa7ff, cx + 6, 0.75, -17.6); box(w, 0.25, 0.5, 0.25, 0x3fa7ff, cx + 6, 1.25, -17.6);   // кубик и «пирамидка»
    label('🎨 Рисуем!', cx - 7.2, 3.7, -21, 3, '#ffd23f', E);
  }
  // табличка у двери (видна из коридора)
  const today = todayList(st.save).includes(s);
  st.signs[s] = label(`${U.icon} ${U.name}${today ? ' ⭐' : ''}`, cx, 4, RZ1 + 0.08, 5, today ? '#ffe14d' : hex(col), N);
}

// ---------- столовая, учительская, библиотека, холл ----------
const TABLES = [[-23, -3], [-14, -3], [-23, 3], [-14, 3]];
function canteen(w) {
  box(w, CANTEEN.x1 - CANTEEN.x0, 0.03, 15, 0xdfe8f0, (CANTEEN.x0 + CANTEEN.x1) / 2, 0.12, -0.5, { shadow: false, studs: true });   // плитка
  // раздача: стойка с кастрюлями, повариха за ней
  solid(w, 1.4, 1.1, 10, 0xd8d8d8, -28, 0, -1); box(w, 1.6, 0.12, 10.2, 0xb9c2cc, -28, 1.16, -1);
  for (const [z, c] of [[-4.5, 0xffd23f], [-2.5, 0xff8a3a], [-0.5, 0xffffff], [1.5, 0xd8261a], [3.5, 0x8a5a2b]]) { box(w, 0.9, 0.5, 0.9, 0x9aa4ad, -28, 1.47, z); box(w, 0.8, 0.06, 0.8, c, -28, 1.73, z, { shadow: false }); }
  label('🍲 Раздача', -28, 3.3, -1, 3.2, '#ffe14d');
  box(w, 0.2, 2.2, 4.5, 0x2b2b3a, CANTEEN.x0 + 0.62, 2.7, -1); label('Меню: каша · суп · компот · пирожок', CANTEEN.x0 + 0.78, 2.7, -1, 4.2, '#ffffff', E);
  // столы со скамейками; места, куда садятся ребята
  for (const [cx, cz] of TABLES) {
    box(w, 4.5, 0.14, 1.6, 0xffffff, cx, 1, cz); for (const sx of [-1, 1]) box(w, 0.2, 0.95, 1.2, 0x9aa4ad, cx + sx * 1.9, 0.48, cz);
    solid(w, 4.7, 0.9, 1.8, 0xffffff, cx, 0, cz).visible = false;
    for (const sz of [-1, 1]) {
      box(w, 4.3, 0.12, 0.5, 0x3fa7ff, cx, 0.6, cz + sz * 1.3); for (const sx of [-1, 1]) box(w, 0.15, 0.55, 0.4, 0x6a6f7a, cx + sx * 1.8, 0.28, cz + sz * 1.3);
      for (const sx of [-1, 1]) {
        st.spots.push({ x: cx + sx * 1.1, z: cz + sz * 1.3, face: sz > 0 ? Math.PI : 0 });
        box(w, 0.6, 0.05, 0.45, 0xffffff, cx + sx * 1.1, 1.1, cz + sz * 0.45, { shadow: false }); box(w, 0.35, 0.06, 0.25, [0xffd23f, 0xff8a3a, 0x8a5a2b][(st.spots.length) % 3], cx + sx * 1.1, 1.15, cz + sz * 0.45, { shadow: false });
      }
    }
  }
  st.signsTxt.push(label('🍽 Столовая', CANTEEN.door, 4, COR.z1 - 0.08, 4.4, '#ffd0a0', S_));
}
function staffRoom(w, who) {
  box(w, STAFF.x1 - STAFF.x0, 0.03, 15, 0xc8b0e0, (STAFF.x0 + STAFF.x1) / 2, 0.12, -0.5, { shadow: false });
  solid(w, 3, 1, 1.6, 0x8a5a2b, 12.5, 0, -0.5); box(w, 0.4, 0.5, 0.4, 0xd8d8d8, 13.4, 1.25, -0.5); box(w, 0.4, 0.3, 0.4, 0xffffff, 11.6, 1.15, -0.4);   // стол, чайник, кружки
  st.rest = [{ x: 10.4, z: -0.5, face: Math.PI / 2 }, { x: 14.6, z: -0.5, face: -Math.PI / 2 }, { x: 12.5, z: -2.6, face: 0 }, { x: 12.5, z: 1.6, face: Math.PI }];
  for (const R of st.rest) chair(w, R.x, R.z, R.face);
  shelf(w, 17.1, -1, 5, false); plant(w, 8, -6.5);
  // мамин учительский стол у окна: сядешь — «Учительская»
  solid(w, 3, 1, 1.1, 0x6a3f1e, 12.5, 0, 5.6); for (let i = 0; i < 3; i++) box(w, 0.7, 0.1, 0.5, 0xffffff, 11.6 + i * 0.9, 1.06, 5.6, { shadow: false });
  chair(w, 12.5, 4.3, 0, 0xd8261a);
  if (who === 'mama') { st.teach = { x: 12.5, z: 4.3 }; label('👩‍🏫 Твой стол', 12.5, 2.6, 4.3, 3.4, '#ffe14d'); }
  st.signsTxt.push(label('👩‍🏫 Учительская', STAFF.door, 4, COR.z1 - 0.08, 4.4, '#e0d0ff', S_));
}
function library(w, who) {
  box(w, LIB.x1 - LIB.x0, 0.03, 15, 0xe8d8b0, (LIB.x0 + LIB.x1) / 2, 0.12, -0.5, { shadow: false });
  shelf(w, 24.5, 6, 11, true); shelf(w, LIB.x1 - 0.9, -1, 9, false);
  for (const [x, z] of [[22, -2], [27.5, -2], [22, 2.2]]) { desk(w, x, z, 0xc98a45, 0x9b6bff); if (who === 'mama') st.seats.push({ x, z: z + 1.15, room: 'lib', i: st.seats.length }); }
  box(w, 1.6, 0.03, 1.2, 0xff7ac8, 27.5, 0.14, 3, { shadow: false });
  st.signsTxt.push(label(who === 'mama' ? '📚 Библиотека · твои занятия' : '📚 Библиотека', LIB.door, 4, COR.z1 - 0.08, 5, '#ffe0a0', S_));
}
function hall(w, save, who) {
  box(w, 14, 0.03, 15, 0xd8d0c0, 0, 0.12, -0.5, { shadow: false, studs: true });
  // дневник: столик и коврик
  solid(w, 1.6, 0.9, 1.1, 0x8a5a2b, DIARY.x, 0, DIARY.z + 1.7); box(w, 0.9, 0.12, 0.7, 0x2a5ad8, DIARY.x, 0.96, DIARY.z + 1.7);
  box(w, 2.2, 0.06, 1.8, 0x9b6bff, DIARY.x, 0.13, DIARY.z, { shadow: false });
  label('📒 Дневник', DIARY.x, 2.3, DIARY.z + 1.3, 3.2, '#e0d0ff');
  // расписание на стене (запад) и доска для маминых записок (восток)
  box(w, 0.2, 2.6, 5.4, 0x8a5a2b, -6.4, 2.6, -1); box(w, 0.22, 2.2, 5, 0x2f4a3a, -6.38, 2.6, -1);
  const L = todayList(save);
  label(L.length ? '📅 Уроки сегодня:' : '📅 Сегодня выходной', -6.24, 3.15, -1, 4.4, '#ffe14d', E);
  label(L.length ? L.map(s => SUBJECTS[s].name).join(' · ') : 'Можно потренироваться 🙂', -6.24, 2.25, -1, 4.6, '#ffffff', E);
  box(w, 0.2, 2.6, 5.4, 0x8a5a2b, 6.4, 2.6, -1); box(w, 0.22, 2.2, 5, 0x2f4a3a, 6.38, 2.6, -1);
  const note = who !== 'mama' && save.school?.mamaNote;
  st.hallBoard = label(note ? `💌 ${note}` : 'Хорошего дня! 🌞', 6.24, 2.65, -1, 4.6, note ? '#ffd0e0' : '#ffffff', W_);
  // вешалка с рюкзаками у входа
  box(w, 4, 0.15, 0.3, 0x8a5a2b, 4, 2.4, 6.3); for (let i = 0; i < 5; i++) box(w, 0.5, 0.6, 0.3, [0xd8261a, 0x3fa7ff, 0xff7ac8, 0x4ad04a, 0xffd23f][i], 2.4 + i * 0.8, 1.95, 6.2, { shadow: false });
  plant(w, -6, 5.6);
}

export function buildSchool(save, who) {
  st = { save, who, boards: {}, signs: {}, signsTxt: [], seats: [], spots: [], rest: [], npcs: [], kids: [], teachers: {}, armed: {}, t: 0, teach: null, phase: 'break', left: 18, li: 0, lastRoom: null };
  const w = group(scene);
  // двор: травка, дорожка, клумбы, флаг, забор и портал домой
  solid(w, 90, 1, 80, 0x7fd65a, 0, -1, -5);
  solid(w, 5, 0.08, 18, 0xe9d9a6, 0, 0, 16, { shadow: false });
  for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) box(w, 0.8, 0.5, 0.8, [0xff5a8a, 0xffd23f, 0xff8a1a, 0x9b6bff, 0x3fa7ff][(i + (sx > 0 ? 2 : 0)) % 5], sx * 4.2, 0.25, 9.5 + i * 2.2);
  box(w, 0.25, 9, 0.25, 0xd8d8d8, 10, 4.5, 12); const flag = group(scene, 10, 8.2, 12); flag.userData.dynamic = true;
  box(flag, 2.4, 0.5, 0.06, 0xffffff, 1.2, 0.5, 0); box(flag, 2.4, 0.5, 0.06, 0x3a6ad8, 1.2, 0, 0); box(flag, 2.4, 0.5, 0.06, 0xd8261a, 1.2, -0.5, 0);
  st.flag = flag;
  for (const sx of [-1, 1]) solid(w, 0.4, 1.4, 20, 0xffffff, sx * 24, 0, 17);
  portal(w, { x: 0, z: 26, w: 8, to: 'base', color: 0x5fd84a, label: '🏠 На базу', rot: Math.PI });
  // пол
  solid(w, B.x1 - B.x0, 0.1, B.z1 - B.z0, 0xc89a6a, 0, 0, (B.z0 + B.z1) / 2, { shadow: false });
  box(w, B.x1 - B.x0, 0.03, COR.z1 - COR.z0, 0xd8d0c0, 0, 0.12, COR.z, { shadow: false, studs: true });       // коридор — плитка
  // стены: наружные, коридор, перегородки
  wallX(w, B.z0 - 0.5, B.x0 - 1, B.x1 + 1);
  wallX(w, B.z1 + 0.5, B.x0 - 1, B.x1 + 1, [[-2, 2]]); solid(w, 4, H - 3.6, 1, WALL, 0, 3.6, B.z1 + 0.5, { cam: true });   // вход и перемычка
  wallZ(w, B.x0 - 0.5, B.z0, B.z1); wallZ(w, B.x1 + 0.5, B.z0, B.z1);
  wallX(w, COR.z0 - 0.5, B.x0, B.x1, Object.values(ROOM).map(cx => [cx - 1.6, cx + 1.6]));
  for (const x of [-15.5, 0, 15.5]) wallZ(w, x, B.z0, COR.z0 - 1);
  wallX(w, COR.z1 + 0.5, B.x0, CANTEEN.x1 + 0.5, [[CANTEEN.door - 2, CANTEEN.door + 2]]);
  wallX(w, COR.z1 + 0.5, STAFF.x0 - 0.5, B.x1, [[STAFF.door - 1.6, STAFF.door + 1.6], [LIB.door - 1.6, LIB.door + 1.6]]);
  for (const x of [CANTEEN.x1, STAFF.x0, LIB.x0]) wallZ(w, x, COR.z1 + 1, B.z1);
  // белая полоса по верху наружных стен, окна снаружи
  for (const z of [B.z0 - 0.5, B.z1 + 0.5]) box(w, B.x1 - B.x0 + 2.2, 0.5, 1.2, BAND, 0, H + 0.25, z);
  for (const x of [B.x0 - 0.5, B.x1 + 0.5]) box(w, 1.2, 0.5, B.z1 - B.z0 + 2.2, BAND, x, H + 0.25, (B.z0 + B.z1) / 2);
  for (const x of [-26, -19, -12, 12, 19, 26]) { box(w, 2.6, 2.2, 0.1, 0xffffff, x, 3, B.z1 + 1.02); box(w, 2.2, 1.8, 0.12, 0x9fdcff, x, 3, B.z1 + 1.04); }
  for (const z of [-24, -18, -3, 3]) for (const x of [B.x0 - 1.02, B.x1 + 1.02]) { box(w, 0.1, 2.2, 2.6, 0xffffff, x, 3, z); box(w, 0.12, 1.8, 2.2, 0x9fdcff, x, 3, z); }
  label('🏫 ШКОЛА', 0, H + 1.4, B.z1 + 1.12, 7, '#ffe14d', N);
  // коридор: скамейки и цветы, вывеска «урок / перемена»
  for (const x of [-27, -12, 4, 20]) { box(w, 3, 0.12, 0.6, 0x3fa7ff, x, 0.6, COR.z1 - 0.6); for (const sx of [-1, 1]) box(w, 0.15, 0.55, 0.5, 0x6a6f7a, x + sx * 1.3, 0.28, COR.z1 - 0.6); }
  for (const x of [-30, 30]) plant(w, x, COR.z);
  st.status = label('', 0, 4.6, COR.z, 7, '#ffffff');
  for (const s of KID_SUBJ) classroom(w, s, who);
  canteen(w); staffRoom(w, who); library(w, who); hall(w, save, who);
  // люди
  for (const T0 of TEACHERS) {
    const n = npc(buildHero(null, T0.look), 1, T0.name, '#ffe0ea', { kind: 'teacher', s: T0.s }, T0.wear);
    st.teachers[T0.s] = n; place(n, { x: ROOM[T0.s] + 4.5, z: RZ0 + 1.8 }); n.face = 0;
  }
  st.cook = npc(buildHero(null, COOK.look), 1, COOK.name, '#ffe0c0', { kind: 'cook' }); place(st.cook, { x: -29.6, z: -1 }); st.cook.face = Math.PI / 2;
  for (const [id, name, wear] of CLASSMATES) {
    const n = npc(buildHero(null, PEOPLE[id]), 0.8, name, '#ffffff', { kind: 'kid', id }, wear);
    st.kids.push(n);
    const p = hallOrCor(); place(n, p);
  }
  startBreak(true);
  clouds(w, 6);
  return w;
}

// ---------- жители: ходят по точкам ----------
function npc(m, scale, name, col, extra, wear) {
  const g = group(scene); g.userData.dynamic = true; g.add(m.root);
  if (wear && Object.keys(wear).length) dressHero(m, wear);
  compactHero(m); m.root.scale.setScalar(scale);
  const lb = makeLabel(3, 0.75); lb.position.y = 3.4 * scale + 0.4; g.add(lb); lb.userData.set(name, { color: col });
  const n = { g, m, name, pos: g.position, path: [], speed: 2.4, face: 0, mode: 'stand', seat: null, place: 'hall', ph: Math.random() * 6, wait: 0, ...extra };
  st.npcs.push(n); return n;
}
const place = (n, p) => { n.pos.set(p.x, 0, p.z); n.place = placeOf(p.x, p.z); };
function placeOf(x, z) {
  if (z < COR.z0) return x < -15.5 ? 'math' : x < 0 ? 'abc' : x < 15.5 ? 'world' : 'shapes';
  if (z <= COR.z1) return 'cor';
  return x < CANTEEN.x1 ? 'canteen' : x < STAFF.x0 ? 'hall' : x < LIB.x0 ? 'staff' : 'lib';
}
// путь из своего места в коридор и из коридора — в нужное
function exitPts(pl, x) {
  if (ROOM[pl] !== undefined) return [V(ROOM[pl], RZ1 - 1), V(ROOM[pl], RZ1), V(ROOM[pl], COR.z)];
  if (pl === 'canteen') return [V(CANTEEN.door, COR.z1 + 2), V(CANTEEN.door, COR.z1), V(CANTEEN.door, COR.z)];
  if (pl === 'staff') return [V(STAFF.door, COR.z1 + 1.5), V(STAFF.door, COR.z1), V(STAFF.door, COR.z)];
  if (pl === 'lib') return [V(LIB.door, COR.z1 + 1.5), V(LIB.door, COR.z1), V(LIB.door, COR.z)];
  if (pl === 'hall') return [V(Math.max(-5, Math.min(5, x)), COR.z1 + 0.5), V(Math.max(-5, Math.min(5, x)), COR.z)];
  return [];
}
// внутри места: как подойти к точке (по проходам, чтобы не идти сквозь парты и столы)
function approach(pl, to) {
  if (ROOM[pl] !== undefined) { const cx = ROOM[pl]; return to.z > RZ0 + 2.6 ? [V(cx, to.z), V(to.x, to.z)] : [V(cx, to.z), V(to.x, to.z)]; }
  if (pl === 'canteen') return [V(-18.5, to.z), V(to.x, to.z)];
  return [V(to.x, to.z)];
}
function goTo(n, to, then) {
  const from = n.place, dest = placeOf(to.x, to.z);
  let path = [];
  if (from === dest && from !== 'cor') path = approach(dest, to);
  else {
    if (from !== 'cor') path.push(...exitPts(from, n.pos.x));
    if (dest !== 'cor') path.push(...exitPts(dest, to.x).reverse(), ...approach(dest, to));
    else path.push(V(to.x, COR.z), V(to.x, to.z));
  }
  n.path = path; n.mode = 'walk'; n.then = then || null; n.dest = dest; n.g.position.y = 0;
}
const corPoint = () => V(-28 + Math.random() * 56, COR.z + (Math.random() - 0.5) * 3);
const hallOrCor = () => Math.random() < 0.35 ? V(-5 + Math.random() * 10, -4 + Math.random() * 8) : corPoint();

// ---------- звонок: урок ↔ перемена ----------
const lessonList = () => { const L = todayList(st.save); return L.length ? L : KID_SUBJ; };
function startLesson() {
  st.phase = 'lesson'; st.left = LESSON_T;
  const s = st.cur = lessonList()[st.li++ % lessonList().length], cx = ROOM[s];
  const seats = st.seats.filter(q => q.room === s && q.i !== MY_SEAT && !(st.heroSeat === q));
  if (st.heroSeat?.room === s && st.heroSeat.i !== MY_SEAT) seats.push(st.seats.find(q => q.room === s && q.i === MY_SEAT));
  st.kids.forEach((n, k) => { const S = seats[k]; n.seat = S; n.spot = null; n.act = 'class'; n.speed = 3.2; goTo(n, S, () => { n.mode = 'sit'; n.face = Math.PI; n.g.position.y = 0.12; }); });
  for (const T0 of TEACHERS) {
    const n = st.teachers[T0.s]; n.speed = 2.2;
    if (T0.s === s) goTo(n, V(cx, RZ0 + 2.2), () => { n.mode = 'teach'; n.face = 0; });
    else goTo(n, V(ROOM[T0.s] + 4.5, RZ0 + 1.8), () => { n.mode = 'sit'; n.face = 0; });
  }
  st.status.userData.set(`📖 Урок: ${SUBJECTS[s].icon} ${SUBJECTS[s].name}`, { color: '#ffe14d' });
  st.boards[s].userData.set('Урок идёт! Садись за свободную парту 🪑', { color: '#ffffff' });
  return s;
}
function startBreak(first) {
  st.phase = 'break'; st.left = first ? 18 : BREAK_T;
  if (st.cur) st.boards[st.cur].userData.set(BOARD_TXT[st.cur], { color: '#ffffff' });
  const spots = [...st.spots].sort(() => Math.random() - 0.5);
  st.kids.forEach((n, k) => {
    n.seat = null; n.spot = null;
    const r = (k + st.li) % 7;
    if (r < 3) { const S = n.spot = spots.pop(); n.speed = 2.8; n.act = 'eat'; goTo(n, S, () => { n.mode = 'sit'; n.face = S.face; n.g.position.y = 0.12; }); }   // обедать
    else if (r < 5) { n.act = 'tag'; n.speed = 5; goTo(n, corPoint()); }                         // догонялки по коридору
    else { n.act = 'walk'; n.speed = 2.4; goTo(n, hallOrCor()); }                                 // гуляют, болтают
    if (first) { place(n, n.act === 'eat' ? n.path.at(-1) : n.path.at(-1) || n.pos); n.path = []; if (n.then) n.then(); else n.mode = 'stand'; }
  });
  st.rest.forEach((R, k) => { const n = st.teachers[TEACHERS[k].s]; n.speed = 2.2; goTo(n, R, () => { n.mode = 'sit'; n.face = R.face; });
    if (first) { place(n, R); n.path = []; n.mode = 'sit'; n.face = R.face; } });
  st.status.userData.set('🔔 Перемена!', { color: '#ffffff' });
}

function stepNpc(n, dt, t) {
  let spd = 0;
  if (n.talking) { if (n.mode !== 'sit' && n.mode !== 'teach') n.face = Math.atan2(st.heroPos.x - n.pos.x, st.heroPos.z - n.pos.z); }   // разговаривает — стоит и смотрит на героя
  else if (n.path.length) {
    const p = n.path[0], dx = p.x - n.pos.x, dz = p.z - n.pos.z, d = Math.hypot(dx, dz), step = n.speed * dt;
    if (d <= step) { n.pos.x = p.x; n.pos.z = p.z; n.path.shift(); if (!n.path.length) { n.place = n.dest || placeOf(n.pos.x, n.pos.z); n.mode = 'stand'; n.wait = 1 + Math.random() * 3; if (n.then) { const f = n.then; n.then = null; f(); } } }
    else { n.pos.x += dx / d * step; n.pos.z += dz / d * step; n.face = Math.atan2(dx, dz); spd = n.speed; }
  } else if (st.phase === 'break' && n.kind === 'kid' && n.act !== 'eat' && (n.wait -= dt) <= 0) goTo(n, n.act === 'tag' ? corPoint() : hallOrCor());
  n.g.rotation.y = dampAngle(n.g.rotation.y, n.face, 10, dt);
  animateHero(n.m, dt, { speed: spd, maxSpeed: 4, sit: n.mode === 'sit' });
  // на уроке: ребята слушают (голова чуть двигается), учитель у доски машет рукой; в столовой — едят
  if (n.mode === 'sit' && n.kind === 'kid') {
    n.m.head.rotation.y = Math.sin(t * 0.7 + n.ph) * 0.3; n.m.head.rotation.x = Math.sin(t * 1.1 + n.ph) * 0.08;
    if (n.act === 'eat' && st.phase === 'break') n.m.armR.rotation.x = -1.1 - Math.abs(Math.sin(t * 3 + n.ph)) * 0.6;
  } else if (n.mode === 'teach') { n.m.armR.rotation.x = Math.sin(t * 1.2) * 0.25 - 0.9; n.m.armR.rotation.z = 0.2; }
}

// раз в кадр. Вернёт { sit: {x, z, room} } — сел за парту, { teach } — мамин стол, { diary }, { bell: 'урок…' }
export function updateSchool(dt, hero) {
  if (!st) return {};
  const ev = {}, p = hero.pos, t = (st.t += dt);
  st.flag.rotation.y = Math.sin(t * 1.5) * 0.15;
  st.heroSeat = hero.sit && st.seats.find(q => Math.abs(q.x - hero.sit.x) < 0.1 && Math.abs(q.z - hero.sit.z) < 0.1) || null;
  // звонок
  if ((st.left -= dt) <= 0) {
    const inside = p.z < B.z1 && p.x > B.x0 && p.x < B.x1;
    if (st.phase === 'break') { const s = startLesson(); if (inside) ev.bell = `🔔 Звонок на урок!<small>${SUBJECTS[s].icon} ${SUBJECTS[s].name} — ищи табличку у двери</small>`; }
    else { startBreak(); if (inside) ev.bell = '🔔 Перемена!<small>ребята побежали в столовую и по коридору</small>'; }
  }
  if (st.phase === 'break' && Math.floor(st.left) !== st.shownLeft) { st.shownLeft = Math.floor(st.left); st.status.userData.set(`🔔 Перемена · ещё ${st.shownLeft} с`, { color: '#ffffff' }); }
  st.heroPos = p;
  for (const n of st.npcs) stepNpc(n, dt, t);
  // свободные парты: подошёл к стульчику — садишься (занятые ребятами — нет)
  for (const S of st.seats) {
    const k = S.room + S.i, near = Math.hypot(p.x - S.x, p.z - S.z);
    const taken = st.kids.some(n => n.seat === S);
    if (near < 0.9 && p.y < 0.8 && hero.speed < 3 && !taken && st.armed[k] !== false) { ev.sit = S; st.armed[k] = false; st.lastRoom = S.room; }
    if (near > 1.6) st.armed[k] = true;
  }
  if (st.teach) {
    const T0 = st.teach, here = Math.hypot(p.x - T0.x, p.z - T0.z) < 0.9 && p.y < 0.8;
    if (here && st.armed.teach !== false) { ev.teach = T0; st.armed.teach = false; }
    if (Math.hypot(p.x - T0.x, p.z - T0.z) > 1.6) st.armed.teach = true;
  }
  const d = Math.abs(p.x - DIARY.x) < 1.1 && Math.abs(p.z - DIARY.z) < 0.9 && p.y < 0.8;
  if (d && st.armed.diary !== false) { ev.diary = true; st.armed.diary = false; }
  if (!d) st.armed.diary = true;
  return ev;
}
// учитель радуется оценке: облачко над головой (учитель этого предмета)
export function teacherSays(txt, s) {
  if (!st) return;
  const n = st.teachers[s] || st.teachers[st.lastRoom] || st.teachers.math, P = n.pos;
  puff(txt, new T.Vector3(P.x, 4.4, P.z), { size: 1.6, rise: 0.8, life: 2.2 });
}
// надпись на доске кабинета, где сидит Мотя (или в холле)
export function boardText(txt, s) { const b = st && (st.boards[s] || st.boards[st.lastRoom] || st.hallBoard); if (b) b.userData.set(txt, { color: '#ffffff' }); }
export const schoolNow = () => st && { phase: st.phase, cur: st.cur };
export const getSchool = () => st;                                  // для просьб и облачков (schoolq.js)
export { ROOM, RZ0, B as SCHOOL_BOX };
window.__schoolNow = schoolNow;

// ---------- для разговоров и столовой (chat.js) ----------
// кто рядом: ребёнок или учитель — в 3.3 м (дотянуться из прохода до парты), повариха — через стойку (3.8 м)
export function nearNpc(p) {
  if (!st) return null;
  let best = null, bd = 1e9;
  for (const n of st.npcs) { const d = Math.hypot(n.pos.x - p.x, n.pos.z - p.z), r = n.kind === 'cook' ? 3.8 : 3.3; if (d < r && d < bd) { bd = d; best = n; } }
  return best;
}
export function holdNpc(n, on) { if (n) n.talking = on; }
// позвать в столовую (на перемене): идёт к свободному месту и садится есть
export function kidToCanteen(n) {
  if (!st || st.phase !== 'break' || n.kind !== 'kid') return false;
  if (n.act === 'eat') return true;
  const S = st.spots.find(q => !st.kids.some(k => k.spot === q) && q !== st.heroSpot); if (!S) return false;
  n.spot = S; n.act = 'eat'; n.speed = 3; n.talking = false; goTo(n, S, () => { n.mode = 'sit'; n.face = S.face; n.g.position.y = 0.12; });
  return true;
}
// свободное место за столом в столовой, где стоит герой
export function lunchSpot(p) { return st?.spots.find(q => Math.hypot(q.x - p.x, q.z - p.z) < 0.9 && !st.kids.some(k => k.spot === q && k.mode === 'sit')) || null; }
export function setHeroSpot(S) { if (st) st.heroSpot = S; }
// кто ест за тем же столом
export function tableMates(S) { return st ? st.kids.filter(k => k.spot && k.mode === 'sit' && Math.abs(k.spot.x - S.x) < 2.5 && Math.abs(k.spot.z - S.z) < 3) : []; }
