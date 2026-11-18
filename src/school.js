// Школа 🏫: двор с флагом и здание без крыши (камера сверху). Внутри класс: доска, учительница Марья Ивановна,
// парты с одноклассниками в школьной форме. Садишься за свободную парту — открывается расписание и выбор урока;
// у двери — коврик дневника. Сами уроки, расписание и дневник — lessons.js.
import { T, scene, group, box } from './engine.js';
import { solid, portal, clouds, onLevelReset } from './world.js';
import { makeLabel, puff } from './fx.js';
import { buildHero, compactHero, PEOPLE } from './hero.js';
import { dressHero } from './clothes.js';

export const SCHOOL = { spawn: { x: 0, z: 12, face: Math.PI } };
export const SUBJECTS = {
  math: { icon: '➕', name: 'Математика', color: 0xff5a5a },
  abc: { icon: '🔤', name: 'Буквы', color: 0x3fa7ff },
  world: { icon: '🌍', name: 'Мир вокруг', color: 0x4ad04a },
  shapes: { icon: '🔺', name: 'Фигуры и цвета', color: 0xffb020 },
  erudit: { icon: '🧠', name: 'Эрудит', color: 0x9b6bff },          // мамины занятия
  poetry: { icon: '📜', name: 'Поэзия', color: 0xd8a040 },
  books: { icon: '📚', name: 'Книжный клуб', color: 0x3fa7ff },
};
export const KID_SUBJ = ['math', 'abc', 'world', 'shapes'], MAMA_SUBJ = ['erudit', 'poetry', 'books'];
const DIARY = { x: -11, z: -1 };
const TEACHER = { skin: 0xf6d0b0, shirt: 0x8a3a6a, pants: 0x2b2b3a, shoes: 0x1d1d23, sole: 0x111114, hair: 0x6a3a1a, hairHi: 0x8a5a2a, style: 'long', cheeks: true };
// посадить модель: ноги вперёд, тело ниже, руки на парту
export function sitPose(m, k = 1) {
  m.legL.rotation.x = m.legR.rotation.x = -1.45 * k; m.body.position.y = -0.36 * k;
  m.armL.rotation.x = m.armR.rotation.x = -1.1 * k; m.armL.rotation.z = m.armR.rotation.z = 0;
}
const DESKS = [];
for (const z of [-15, -10, -5]) for (const x of [-9.5, -5.5, 5.5, 9.5]) DESKS.push({ x, z });
// одноклассники за партами: кто, где сидит и в чём
const CLASS = [
  ['kolya', -9.5, -15, { shirt: 'sc_jacket', legs: 'pt_school', bag: 'bp_red' }],
  ['olya', -5.5, -15, { shirt: 'sc_vest', legs: 'pt_school2', bag: 'bp_unicorn' }],
  ['petya', 5.5, -15, { shirt: 'sc_shirt', legs: 'pt_school', bag: 'bp_car' }],
  ['masha', 9.5, -15, { shirt: 'sc_jacket2', legs: 'pt_school2', bag: 'bp_bear' }],
  ['sonya', -9.5, -10, { shirt: 'sc_shirt', legs: 'pt_school2', bag: 'bp_space' }],
  ['timur', 9.5, -10, { shirt: 'sc_jacket', legs: 'pt_school', bag: 'bp_dino' }],
  ['alisa', 5.5, -5, { shirt: 'sc_vest', legs: 'pt_school', bag: 'bp_school' }],
];

let st = null;
onLevelReset(() => { st = null; });

const label = (t, x, y, z, w, col = '#ffffff') => { const l = makeLabel(w, w / 4); l.position.set(x, y, z); scene.add(l); l.userData.set(t, { color: col }); return l; };

function desk(w, x, z) {
  box(w, 2.6, 0.14, 1.3, 0xd9a066, x, 1.05, z);
  for (const sx of [-1, 1]) box(w, 0.14, 1, 1.1, 0x8a5a2b, x + sx * 1.15, 0.5, z);
  solid(w, 2.8, 0.9, 1.5, 0xd9a066, x, 0, z).visible = false;                         // сквозь парту не пройти
  box(w, 1, 0.12, 0.9, 0x3fa7ff, x, 0.62, z + 1.1); box(w, 1, 0.9, 0.12, 0x3fa7ff, x, 1.05, z + 1.55);   // стульчик
  for (const sx of [-1, 1]) box(w, 0.1, 0.6, 0.1, 0x6a6f7a, x + sx * 0.4, 0.3, z + 1.1);
}

export function buildSchool(save, who) {
  st = { kids: [], seats: [], teacher: null, armed: {}, t: 0, teach: null };
  const w = group(scene);
  // двор: травка, дорожка, клумбы, флаг
  solid(w, 70, 1, 60, 0x7fd65a, 0, -1, 0);
  solid(w, 6, 0.08, 20, 0xe9d9a6, 0, 0, 10, { shadow: false });
  for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) box(w, 0.8, 0.5, 0.8, [0xff5a8a, 0xffd23f, 0xff8a1a, 0x9b6bff, 0x3fa7ff][(i + (sx > 0 ? 2 : 0)) % 5], sx * 4.2, 0.25, 5 + i * 2.2);
  box(w, 0.25, 9, 0.25, 0xd8d8d8, 10, 4.5, 6); const flag = group(scene, 10, 8.2, 6); flag.userData.dynamic = true;
  box(flag, 2.4, 0.5, 0.06, 0xffffff, 1.2, 0.5, 0); box(flag, 2.4, 0.5, 0.06, 0x3a6ad8, 1.2, 0, 0); box(flag, 2.4, 0.5, 0.06, 0xd8261a, 1.2, -0.5, 0);
  st.flag = flag;
  // забор двора и портал домой
  for (const sx of [-1, 1]) solid(w, 0.4, 1.4, 22, 0xffffff, sx * 22, 0, 12);
  portal(w, { x: 0, z: 22, w: 8, to: 'base', color: 0x5fd84a, label: '🏠 На базу', rot: Math.PI });
  // здание: стены без крыши, в передней — дверной проём
  const X0 = -15, X1 = 15, Z0 = -24, Z1 = 2, H = 4.8, WALL = 0xe8a07a, BAND = 0xffffff;
  solid(w, X1 - X0, 0.1, Z1 - Z0, 0xc89a6a, 0, 0, (Z0 + Z1) / 2, { shadow: false });                // пол-паркет
  for (let i = 0; i < 13; i++) box(w, 0.06, 0.02, Z1 - Z0, 0xb0845a, X0 + 1 + i * 2.3, 0.11, (Z0 + Z1) / 2, { shadow: false, studs: false });
  solid(w, X1 - X0 + 1, H, 1, WALL, 0, 0, Z0 - 0.5, { cam: true });
  for (const x of [X0 - 0.5, X1 + 0.5]) solid(w, 1, H, Z1 - Z0 + 1, WALL, x, 0, (Z0 + Z1) / 2, { cam: true });
  for (const [x0, x1] of [[X0, -2.5], [2.5, X1]]) solid(w, x1 - x0, H, 1, WALL, (x0 + x1) / 2, 0, Z1 + 0.5, { cam: true });
  solid(w, 5, H - 4, 1, WALL, 0, 4, Z1 + 0.5, { cam: true });                                 // над дверью
  for (const z of [Z0 - 0.5, Z1 + 0.5]) box(w, X1 - X0 + 1.2, 0.5, 1.2, BAND, 0, H + 0.25, z);
  for (const x of [X0 - 0.5, X1 + 0.5]) box(w, 1.2, 0.5, Z1 - Z0 + 1.2, BAND, x, H + 0.25, (Z0 + Z1) / 2);
  // окна на фасаде и боковых стенах
  for (const x of [-11, -6.5, 6.5, 11]) { box(w, 2.6, 2.2, 0.1, 0xffffff, x, 3.2, Z1 + 1.02); box(w, 2.2, 1.8, 0.12, 0x9fdcff, x, 3.2, Z1 + 1.04); }
  for (const z of [-19, -12, -5]) for (const x of [X0 - 1.02, X1 + 1.02]) { box(w, 0.1, 2.2, 2.6, 0xffffff, x, 3.2, z); box(w, 0.12, 1.8, 2.2, 0x9fdcff, x, 3.2, z); }
  label('🏫 ШКОЛА', 0, H + 1.8, Z1 + 1.2, 7, '#ffe14d');
  // доска, часы, плакаты
  box(w, 11, 3.1, 0.2, 0x8a5a2b, 0, 2.85, Z0 + 0.1); box(w, 10.4, 2.7, 0.22, 0x2f4a3a, 0, 2.85, Z0 + 0.12);
  box(w, 10, 0.15, 0.4, 0x8a5a2b, 0, 1.3, Z0 + 0.3);
  const note = who !== 'mama' && save.school?.mamaNote;                               // мамина записка на доске
  st.board = label(note ? `💌 ${note}` : 'Садись за свободную парту 🪑', 0, 2.95, Z0 + 0.4, 9.5, note ? '#ffd0e0' : '#ffffff');
  box(w, 1.1, 1.1, 0.1, 0xffffff, 8.5, 3.7, Z0 + 0.1); box(w, 0.08, 0.4, 0.12, 0x1d1d23, 8.5, 3.85, Z0 + 0.12); box(w, 0.3, 0.08, 0.12, 0x1d1d23, 8.62, 3.7, Z0 + 0.12);
  label('А Б В Г Д Е Ё Ж З', -11, 3.9, Z0 + 0.4, 5, '#ffd23f');
  label('1 2 3 4 5 6 7 8 9 10', 11.5, 3.3, Z0 + 0.4, 5, '#7fd4ff');
  // стол учителя с глобусом и книгами, сама учительница
  solid(w, 3.4, 1.1, 1.6, 0x8a5a2b, 10.5, 0, -20.5);
  box(w, 0.7, 0.7, 0.7, 0x3fa7ff, 11.5, 1.55, -20.5); box(w, 0.4, 0.3, 0.72, 0x4ad04a, 11.5, 1.6, -20.5);
  for (let i = 0; i < 3; i++) box(w, 0.8, 0.15, 0.6, [0xd8261a, 0xffd23f, 0x3fa7ff][i], 9.4, 1.18 + i * 0.15, -20.5);
  const tg = group(scene, 8.8, 0, -21.6); tg.userData.dynamic = true; const tm = buildHero(tg, TEACHER); tg.rotation.y = 0.25;
  dressHero(tm, { shirt: 'bl_white', legs: 'sk_check', shoes: 'so_heels', glasses: 'round' }); compactHero(tm);
  st.teacher = { g: tg, m: tm };
  label('👩‍🏫 Марья Ивановна', 8.8, 4.3, -21.6, 4.6, '#ffe0ea');
  // учительский стул за столом — только у мамы: «Учительская»
  box(w, 1, 0.12, 0.9, 0x8a3a6a, 10.5, 0.62, -22.3); box(w, 1, 0.9, 0.12, 0x8a3a6a, 10.5, 1.05, -22.75);
  if (who === 'mama') { st.teach = { x: 10.5, z: -22.3 }; label('👩‍🏫 Учительская', 10.5, 2.6, -22.3, 3.6, '#ffe14d'); }
  // парты: 4 колонки × 3 ряда, проход посередине
  for (const D of DESKS) desk(w, D.x, D.z);
  for (const [id, x, z, wear] of CLASS) {
    const g = group(scene, x, 0.12, z + 1.15); g.userData.dynamic = true; g.rotation.y = Math.PI;
    const m = buildHero(g, PEOPLE[id]); dressHero(m, wear); compactHero(m); g.scale.setScalar(0.8); sitPose(m);
    st.kids.push({ g, m, ph: Math.random() * 6 });
  }
  // свободные парты: подошёл к стульчику — садишься. Твоя — ближе к доске, с табличкой
  for (const D of DESKS) if (!CLASS.some(c => c[1] === D.x && c[2] === D.z)) st.seats.push({ x: D.x, z: D.z + 1.15 });
  label('🪑 Твоя парта', -5.5, 2.4, -10, 3.2, '#ffe14d');
  box(w, 0.5, 0.05, 0.35, 0xffffff, -5.5, 1.13, -10.2, { shadow: false });            // тетрадка на парте
  // дневник у двери: столик с тетрадкой
  solid(w, 1.6, 0.9, 1.1, 0x8a5a2b, DIARY.x, 0, DIARY.z - 1.6);
  box(w, 0.9, 0.12, 0.7, 0x2a5ad8, DIARY.x, 0.96, DIARY.z - 1.6);
  box(w, 2.2, 0.06, 1.8, 0x9b6bff, DIARY.x, 0.05, DIARY.z, { shadow: false });
  label('📒 Дневник', DIARY.x, 2.2, DIARY.z - 1.2, 3.2, '#e0d0ff');
  // шкаф с книгами и цветок
  solid(w, 1, 3.2, 4, 0x8a5a2b, X0 + 0.5, 0, -20); for (let i = 0; i < 8; i++) box(w, 0.3, 0.6, 0.35, [0xd8261a, 0x3fa7ff, 0x5fd35f, 0xffd23f][i % 4], X0 + 1.05, 0.9 + (i > 3 ? 1.2 : 0), -21.4 + (i % 4) * 0.9);
  box(w, 0.8, 0.7, 0.8, 0xc85a3a, X1 - 0.8, 0.35, -1); for (const [x, y, z] of [[0, 1, 0], [-0.3, 1.3, 0.1], [0.3, 1.25, -0.1], [0, 1.6, 0]]) box(w, 0.5, 0.5, 0.5, 0x4ad04a, X1 - 0.8 + x, y, -1 + z);
  clouds(w, 6);
  return w;
}

// раз в кадр. Вернёт { sit: {x, z} } — подошёл к свободному стульчику, { diary: true } — встал на коврик дневника
export function updateSchool(dt, hero) {
  if (!st) return {};
  const ev = {}, p = hero.pos, t = (st.t += dt);
  st.flag.rotation.y = Math.sin(t * 1.5) * 0.15;
  for (const K of st.kids) { K.m.head.rotation.y = Math.sin(t * 0.7 + K.ph) * 0.3; K.m.head.rotation.x = Math.sin(t * 1.1 + K.ph) * 0.08; }
  st.teacher.m.armR.rotation.x = Math.sin(t * 1.2) * 0.25 - 0.3;
  const on = (x, z, r = 1.2) => Math.abs(p.x - x) < r && Math.abs(p.z - z) < r * 0.85 && p.y < 0.8;
  for (const [k, S] of st.seats.entries()) {
    const here = Math.hypot(p.x - S.x, p.z - S.z) < 0.9 && p.y < 0.8 && hero.speed < 3;
    if (here && st.armed['s' + k] !== false) { ev.sit = S; st.armed['s' + k] = false; }
    if (Math.hypot(p.x - S.x, p.z - S.z) > 1.6) st.armed['s' + k] = true;
  }
  if (st.teach) {
    const T = st.teach, here = Math.hypot(p.x - T.x, p.z - T.z) < 0.9 && p.y < 0.8;
    if (here && st.armed.teach !== false) { ev.teach = T; st.armed.teach = false; }
    if (Math.hypot(p.x - T.x, p.z - T.z) > 1.6) st.armed.teach = true;
  }
  const d = on(DIARY.x, DIARY.z, 1);
  if (d && st.armed.diary !== false) { ev.diary = true; st.armed.diary = false; }
  if (!d) st.armed.diary = true;
  return ev;
}
// учительница радуется оценке: облачко над головой
export function teacherSays(txt) {
  if (!st) return;
  const T0 = st.teacher.g.position;
  puff(txt, new T.Vector3(T0.x, 5.2, T0.z), { size: 1.6, rise: 0.8, life: 2.2 });
}
export function boardText(txt) { if (st?.board) st.board.userData.set(txt, { color: '#ffffff' }); }
