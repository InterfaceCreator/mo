// Занятия в Долине динозавров 🦖 (строятся вместе с Долиной, dinoland.js):
//   📒 Паспорт исследователя — 12 заданий с галочками, за каждое +30 монет; всё выполнил — Радужный динозаврик 🌈.
//   🧑‍🔬 Профессор Палыч у входа — показывает паспорт, рассказывает факты, выдаёт лопату (если её нет).
//   🦴 Раскопки — песчаные холмики (каждый день новые): копаешь лопатой ⛏️ — внутри окаменелость. 8 видов — в музей.
//   🥚 Мама-динозавр потеряла 5 яиц — каждый день они спрятаны в новых местах; нашёл все — награда и яйцо в инкубатор.
//   🔥 «Пол — это лава»: прыгай по камням и гейзерам к сундуку над лавой (наступил на лаву — «горячо!», снова на старт).
//   🚡 Канатка с площадки сундука — через всю долину к раскопкам.  🎢 Лавовая горка — с вершины вулкана в озеро.
//   🏁 Гонки на трицератопсе: два круга, жми прыжок или 💨 — ускоряется. Рекорд времени.
import { T, scene, group, box, mat } from './engine.js';
import { solid } from './world.js';
import { makeLabel, puff, confetti, chips, sprite, emojiTex } from './fx.js';
import { toast, openOv } from './ui.js';
import { SFX } from './sfx.js';
import { eggMesh } from './eggs.js';
import { buildHero, compactHero, animateHero } from './hero.js';
import { buildDino, animateAnimal } from './animals.js';
import { persist } from './save.js';

export const TASKS = [
  ['ride', '🦕', 'Покататься на трицератопсе'], ['fly', '🪽', 'Полетать на птеродактиле'], ['egg', '🥚', 'Отправить яйцо почтой птеродактиля'],
  ['volcano', '🌋', 'Забраться на вершину вулкана'], ['crystals', '💎', 'Собрать 10 кристаллов вулкана'], ['fossil', '🦴', 'Откопать окаменелость'],
  ['museum', '🏛️', 'Собрать все 8 окаменелостей'], ['lost', '🦖', 'Найти потерянные яйца мамы-динозавра'], ['lava', '🔥', 'Пройти «Пол — это лава» до сундука'],
  ['zip', '🚡', 'Прокатиться на канатке'], ['slide', '🎢', 'Скатиться с лавовой горки'], ['race', '🏁', 'Проехать гонку быстрее 25 секунд'],
];
// вторая страница (dinoplay.js): дружба, озеро, кольца, динобол, музыка, прятки — награда Золотой Малыш Рекс
export const TASKS2 = [
  ['feed', '🍌', 'Покормить динозавра'], ['friend', '❤️', 'Подружиться с динозавром (5 ❤️)'], ['plesio', '🐢', 'Поплавать на плезиозавре'],
  ['fish', '🎣', 'Поймать рыбку в озере'], ['rings', '🎯', 'Пролететь 7 колец на птеродактиле'], ['football', '⚽', 'Забить 3 гола в динобол'],
  ['music', '🎵', 'Сыграть песенку на камнях'], ['hide', '🙈', 'Найти малыша в прятках'],
];
const ALL_TASKS = [...TASKS, ...TASKS2];
const TASK_COINS = 30;
export const FOSSILS = [['ammonite', '🐚', 'Аммонит'], ['tooth', '🦷', 'Зуб Рекса'], ['claw', '🦴', 'Коготь'], ['paw', '🐾', 'Отпечаток лапы'],
  ['bone', '🍖', 'Большая кость'], ['skull', '🦕', 'Череп трицератопса'], ['stoneegg', '🥚', 'Окаменевшее яйцо'], ['feather', '🪶', 'Перо птеродактиля']];

const PROF = { x: 318, z: 22 }, MAMA = { x: 351, z: 37 };
const DIG = { x0: 400, x1: 420, z0: 80, z1: 100 }, MUSEUM = { x: 395, z: 90 };   // DIG — глубокие раскопки (dinopit.js)
const LAVA = { x0: 411, x1: 428.5, z0: -27, z1: 24 }, LAVA_START = { x: 420, z: 28 }, PLAT = { x: 420, z: -25.5, y: 12 };
const ZIP = { from: new T.Vector3(417.5, PLAT.y + 2.6, -25.5), to: new T.Vector3(418, 3, 68), sag: 3, dur: 7 };
export const SLIDE_PTS = [[392.3, 13.1, 5], [388, 12, 10], [382, 10, 18], [374, 7.6, 30], [366, 5.2, 44], [358, 3, 58], [352, 1.3, 70], [348, 0.5, 78], [346, 0.3, 83]];
const SLIDE = new T.CatmullRomCurve3(SLIDE_PTS.map(([x, y, z]) => new T.Vector3(x, y, z)));
// где мама-динозавр «теряет» яйца: [x, z, высота]
export const LOST_SPOTS = [[328, 6, 0], [366, -14, 0], [312, 66, 0], [322, 77, 0], [338, 66, 0], [366, 72, 0], [386, 52, 0], [404, 42, 0], [395, -9.5, 1.6], [395, 16.5, 4.8],
  [424, 32, 0], [306, 12, 0], [356, 104, 0], [412, 108, 0], [374, 2, 0], [334, 96, 0]];
export const BUSY = [[DIG.x0 - 8, DIG.x1, DIG.z0 - 4, DIG.z1], [LAVA.x0 - 1, 430, -30, 32], [MAMA.x - 5, MAMA.x + 5, MAMA.z - 5, MAMA.z + 5], [PROF.x - 4, PROF.x + 4, PROF.z - 4, PROF.z + 4]];   // здесь пальмы не сажаем

const today = () => new Date().toDateString();
const dayRand = salt => { let s = 7; for (const ch of today() + salt) s = (s * 31 + ch.charCodeAt(0)) % 2147483647; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
const LOOT_E = { coins: '🪙', bag: '💰', crystal: '💎', pebble: '🪨', toy: '🧸', amber: '🟠', nugget: '🟡', druse: '🔮', egg_spots: '🥚', map: '🗺️', egg_rainbow: '🌈', egg_crystal: '💠', goldegg: '🥚', egg_giant: '🥚', chest: '🧰', egg_sun: '☀️' };
export const dinoSave = save => { const d = save.dino || (save.dino = {}); d.pass ||= {}; d.fossils ||= {}; return d; };

// ---------- паспорт ----------
export function passDone(save, id) {
  const d = dinoSave(save); if (d.pass[id]) return false;
  const T0 = ALL_TASKS.find(t => t[0] === id); if (!T0) return false;
  d.pass[id] = Date.now(); save.coins += TASK_COINS; persist();
  const page = TASKS.includes(T0) ? TASKS : TASKS2, n = page.filter(t => d.pass[t[0]]).length;
  setTimeout(() => { SFX.levelUp(); toast(`📒 Паспорт: ✅ ${T0[1]} ${T0[2]}!<small>+${TASK_COINS} монет · страница ${page === TASKS ? 1 : 2}: ${n} из ${page.length}</small>`); }, 900);   // после своего сообщения
  return true;
}
function openPassport(save, hero) {
  const d = dinoSave(save), n = TASKS.filter(t => d.pass[t[0]]).length, f = Object.keys(d.fossils).length;
  let intro = '«Здравствуй, юный исследователь! Вот твой паспорт. Выполняй задания — и получишь кое-что особенное!»';
  if (!save.tools.shovel) { save.tools.shovel = true; persist(); intro = '«Здравствуй! Держи лопату ⛏️ — пригодится на раскопках. А вот твой паспорт исследователя!»'; }
  else if (n === TASKS.length) intro = '«Ты настоящий палеонтолог! Все задания выполнены. Горжусь! 🎓»';
  else if (n) intro = ['«А ты знал, что у трицератопса было целых три рога?»', '«Птеродактили умели летать, но они не птицы!»', '«Самый большой динозавр был длиннее трёх автобусов!»', '«Динозавры откладывали яйца — прямо как курочки!»'][Math.floor(Math.random() * 4)];
  const row = ([id, ic, name]) => `<div style="display:flex;gap:8px;align-items:center;padding:6px 10px;border-radius:12px;background:${d.pass[id] ? '#d8f5c8' : '#f2f0ea'}"><b style="font-size:1.3em">${d.pass[id] ? '✅' : '⬜'}</b><span>${ic} ${name}${id === 'museum' ? ` (${f}/8)` : id === 'crystals' ? ` (${Math.min(10, d.crystals || 0)}/10)` : id === 'race' && d.raceBest ? ` (рекорд ${d.raceBest.toFixed(1)} с)` : id === 'rings' && d.ringsBest ? ` (лучшее ${d.ringsBest}/10)` : ''}</span></div>`;
  const n2 = TASKS2.filter(t => d.pass[t[0]]).length;
  document.getElementById('talkT').textContent = '📒 Паспорт исследователя';
  document.getElementById('talkBody').innerHTML = `<div class="lq tline">🧑‍🔬 Профессор Палыч: ${intro}</div>
    <div style="display:flex;flex-direction:column;gap:6px;margin:8px 0;max-height:52vh;overflow-y:auto">
      <b>Страница 1 · ${n} из ${TASKS.length} · награда — Радужный динозаврик 🌈${d.prize ? ' ✅' : ''}</b>${TASKS.map(row).join('')}
      <b style="margin-top:8px">Страница 2 · ${n2} из ${TASKS2.length} · награда — Золотой Малыш Рекс 👑${d.prize2 ? ' ✅' : ''}</b>${TASKS2.map(row).join('')}
    </div>
    <div class="lq">За каждое задание +${TASK_COINS} 🪙${Object.keys(d.finds || {}).length ? `<br>📦 Мои находки: ${Object.entries(d.finds).map(([id, n]) => `${LOOT_E[id] || '❓'}×${n}`).join(' ')}` : ''}</div>`;
  openOv('talk'); SFX.tap();
}

let st = null;
// ---------- постройка (из buildValley) ----------
export function buildQuests(g, save, raceCurve) {
  const d = dinoSave(save);
  st = { g, t: 0, save, raceCurve, lost: [], race: null, slide: null, zip: null, lavaSaid: 0 };
  // профессор у палатки
  const tent = group(g, PROF.x - 2.5, 0, PROF.z - 2);
  for (const sx of [-1, 1]) { const s = box(tent, 2.4, 0.15, 4, 0xc8b078, sx * 1, 1.3, 0); s.rotation.z = sx * 0.75; }
  box(tent, 0.15, 2.6, 0.15, 0x6a3f1e, 0, 1.3, 2); box(tent, 0.15, 2.6, 0.15, 0x6a3f1e, 0, 1.3, -2);
  box(g, 1.6, 0.9, 1, 0x8a5a2b, PROF.x + 1.6, 0.45, PROF.z - 1.6); box(g, 0.5, 0.06, 0.4, 0xffffff, PROF.x + 1.5, 0.93, PROF.z - 1.6, { shadow: false });   // столик с записями
  const pg = group(g, PROF.x, 0, PROF.z); pg.userData.dynamic = true;
  const pm = buildHero(pg, { skin: 0xf2c29a, shirt: 0xc8b078, pants: 0x8a6a3a, shoes: 0x5a3a1a, sole: 0x2a1a10, hair: 0xd8d8d8, hairHi: 0xf0f0f0, style: 'crop', hat: 'cap', hatC: 0xd8c08a, beard: 0xe8e8e8, apron: 0xb89a68 });
  compactHero(pm); pm.root.rotation.y = Math.PI / 2; st.prof = { g: pg, m: pm };
  const pl = makeLabel(5.4, 1.2); pl.position.set(PROF.x, 4.4, PROF.z); scene.add(pl); pl.userData.set('🧑‍🔬 Профессор Палыч · 📒', { color: '#ffe14d' });

  // музей под открытым небом: 8 постаментов
  st.museum = FOSSILS.map(([k, e], i) => {
    const x = MUSEUM.x, z = MUSEUM.z - 10.5 + i * 3;
    box(g, 1.4, 1, 1.4, 0xe8e4dc, x, 0.5, z); const s = sprite(emojiTex(e), 1.1); s.position.set(x, 1.7, z); g.add(s);
    const q = sprite(emojiTex('❓'), 0.8); q.position.set(x, 1.6, z); g.add(q);
    s.visible = !!d.fossils[k]; q.visible = !d.fossils[k];
    return { k, s, q };
  });
  st.museumLabel = makeLabel(5, 1.2); st.museumLabel.position.set(MUSEUM.x, 4, MUSEUM.z); scene.add(st.museumLabel);
  museumText();

  // мама-динозавр с гнездом
  const mg = group(g, MAMA.x, 0, MAMA.z); mg.userData.dynamic = true;
  const mm = buildDino(mg, { body: 0xff9ac8, belly: 0xfff0f6, spikes: 0xffd23f }); mm.root.scale.setScalar(3); st.mama = { g: mg, m: mm };
  const ng = group(g, MAMA.x + 3.2, 0, MAMA.z + 1); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; box(ng, 0.9, 0.3, 0.3, 0x9a5b2e, Math.cos(a) * 1.1, 0.2, Math.sin(a) * 1.1).rotation.y = -a; }
  st.mamaEggs = [0, 1, 2, 3, 4].map(i => { const e = eggMesh(ng, 2, 0.6, 'spots'); e.position.set(Math.cos(i * 1.26) * 0.5, 0.45, Math.sin(i * 1.26) * 0.5); return e; });
  st.mamaLabel = makeLabel(6.4, 1.5); st.mamaLabel.position.set(MAMA.x, 6.6, MAMA.z); scene.add(st.mamaLabel);
  if (d.lost?.day !== today()) d.lost = { day: today(), got: [], done: 0 };
  const R = dayRand('lost'), idx = LOST_SPOTS.map((_, i) => i).sort(() => R() - 0.5).slice(0, 5);
  st.lost = idx.map((si, i) => {
    const [x, z, y] = LOST_SPOTS[si], eg = group(g, x, y, z); eg.userData.dynamic = true;
    const e = eggMesh(eg, 2, 0.8, 'spots'); e.position.y = 0.55;
    eg.visible = !d.lost.got.includes(i) && !d.lost.done;
    return { i, x, y, z, g: eg };
  });
  mamaText();

  // «Пол — это лава»: лава, камни-ступеньки, гейзер, площадка с сундуком
  const lv = new T.Mesh(new T.PlaneGeometry(LAVA.x1 - LAVA.x0, LAVA.z1 - LAVA.z0), new T.MeshBasicMaterial({ color: 0xff7a1a })); lv.rotation.x = -Math.PI / 2;
  lv.position.set((LAVA.x0 + LAVA.x1) / 2, 0.06, (LAVA.z0 + LAVA.z1) / 2); lv.userData.dynamic = true; g.add(lv); st.lavaMesh = lv;
  for (let i = 0; i < 9; i++) box(g, 1.2, 0.06, 1.2, 0xffd23f, LAVA.x0 + 2 + (i * 7) % 15, 0.08, LAVA.z0 + 3 + i * 5.3, { shadow: false });
  st.stones = [];
  for (let i = 0; i < 13; i++) {
    const x = 419.5 + 3.2 * Math.sin(i * 1.3), z = 21 - i * 3.5, h = 0.6 + 0.4 * i, geyser = i === 12;
    solid(g, 2.4, h, 2.4, geyser ? 0x5a6a7a : 0x6a5a50, x, 0, z, { studs: true });
    if (geyser) { box(g, 1.6, 0.08, 1.6, 0x3fa7ff, x, h + 0.04, z, { shadow: false }); st.geyser = { x, z, h }; }
    st.stones.push({ x, z, h });
  }
  solid(g, 6, 0.4, 3.6, 0x8a6a5a, PLAT.x, PLAT.y - 0.4, PLAT.z, { studs: true });
  for (const sx of [-1, 1]) box(g, 0.4, PLAT.y - 0.4, 0.4, 0x6a5a50, PLAT.x + sx * 2.6, (PLAT.y - 0.4) / 2, PLAT.z);
  const ch = group(g, PLAT.x + 1.8, PLAT.y, PLAT.z); ch.userData.dynamic = true;
  box(ch, 1.4, 0.8, 1, 0xa0622a, 0, 0.4, 0); box(ch, 1.5, 0.12, 1.1, 0xffc21a, 0, 0.65, 0);
  const lid = group(ch, 0, 0.8, -0.5); box(lid, 1.4, 0.3, 1, 0xb8742f, 0, 0.15, 0.5); st.chest = { lid, g: ch };
  st.chestLabel = makeLabel(3, 0.8); st.chestLabel.position.set(PLAT.x + 1.8, PLAT.y + 2.2, PLAT.z); scene.add(st.chestLabel);
  const sl = makeLabel(5.4, 1.3); sl.position.set(LAVA_START.x, 3.4, LAVA_START.z); scene.add(sl); sl.userData.set('🔥 Пол — это лава! Прыгай к сундуку', { color: '#ffd0a0' });
  // канатка: столбы и трос с провисанием
  for (const [p, h] of [[ZIP.from, 3.2], [ZIP.to, 4]]) box(g, 0.3, h, 0.3, 0x3a3f48, p.x, (p.y - h / 2) + 0.3, p.z);
  for (let i = 0; i < 16; i++) {
    const a = cablePt(i / 16), b = cablePt((i + 1) / 16), m = new T.Mesh(new T.BoxGeometry(0.08, 0.08, a.distanceTo(b)), mat(0x2b2b33));
    m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); g.add(m);
  }
  const zl = makeLabel(3.6, 0.9); zl.position.set(ZIP.from.x - 1.5, PLAT.y + 3.6, ZIP.from.z); scene.add(zl); zl.userData.set('🚡 Канатка', { color: '#ffffff' });
  // лавовая горка: оранжевый жёлоб от вершины вулкана в озеро
  const N = 60;
  for (let i = 0; i < N; i++) {
    const a = SLIDE.getPointAt(i / N), b = SLIDE.getPointAt((i + 1) / N), seg = group(g); seg.position.copy(a).add(b).multiplyScalar(0.5); seg.lookAt(b);
    const L = a.distanceTo(b) + 0.05;
    box(seg, 1.8, 0.15, L, i % 2 ? 0xff8a2a : 0xffa040, 0, -0.1, 0, { shadow: false }); for (const sx of [-1, 1]) box(seg, 0.15, 0.5, L, 0xd8561a, sx * 0.95, 0.1, 0, { shadow: false });
    if (i % 6 === 3 && a.y > 1.2) box(g, 0.25, a.y - 0.2, 0.25, 0x8a6a5a, a.x, (a.y - 0.2) / 2, a.z);
  }
  const gl = makeLabel(4, 1); gl.position.set(SLIDE_PTS[0][0] - 0.5, 15.6, SLIDE_PTS[0][2]); scene.add(gl); gl.userData.set('🎢 Лавовая горка', { color: '#ffd0a0' });
  // гонки: флажки вдоль круга трицератопса
  for (let i = 0; i < 10; i++) { const p = st.raceCurve.getPointAt(i / 10), t = st.raceCurve.getTangentAt(i / 10); const fx = p.x + t.z * 3, fz = p.z - t.x * 3; box(g, 0.12, 2.4, 0.12, 0xffffff, fx, 1.2, fz); box(g, 0.05, 0.6, 0.9, i % 2 ? 0xff4a4a : 0xffd23f, fx, 2.1, fz + 0.45, { shadow: false }); }
  st.raceLabel = makeLabel(5, 1.2); st.raceLabel.position.set(338, 4.6, 33); scene.add(st.raceLabel);
  st.raceLabel.userData.set(d.raceBest ? `🏁 Гонки · рекорд ${d.raceBest.toFixed(1)} с` : '🏁 Гонки на трицератопсе', { color: '#ffe14d' });
}
const cablePt = k => new T.Vector3().lerpVectors(ZIP.from, ZIP.to, k).setY(ZIP.from.y + (ZIP.to.y - ZIP.from.y) * k - Math.sin(k * Math.PI) * ZIP.sag);

// находка из раскопок (dinopit.js) — в музей
export function addFossil(save, kind, pos) {
  const d = dinoSave(save), F = FOSSILS.find(f => f[0] === kind), fresh = !d.fossils[kind];
  d.fossils[kind] = (d.fossils[kind] || 0) + 1;
  puff(F[1], pos.clone().setY(pos.y + 1.4), { size: 1.6, rise: 1.4, life: 1.8 });
  const n = Object.keys(d.fossils).length;
  if (!fresh) save.coins += 15;
  toast(fresh ? `${F[1]} Окаменелость: ${F[2]}!<small>новая — в музей 🏛️ · ${n} из 8</small>` : `${F[1]} ${F[2]} — ещё одна!<small>+15 монет · в музее ${n} из 8</small>`);
  if (st) { const M = st.museum.find(x => x.k === kind); M.s.visible = true; M.q.visible = false; museumText(); }
  passDone(save, 'fossil'); if (n >= 8) passDone(save, 'museum');
}
function museumText() { const n = Object.keys(dinoSave(st.save).fossils).length; st.museumLabel.userData.set(`🏛️ Музей · ${n} из 8`, { color: '#ffffff' }); }
function mamaText() {
  const L = dinoSave(st.save).lost;
  st.mamaLabel.userData.set(L.done ? '🦖 Мама: «Спасибо! Все яйца дома 💕»' : `🦖 Мама: «Найди мои яйца!» ${L.got.length}/5`, { color: L.done ? '#c8ffb0' : '#ffe14d' });
  st.mamaEggs.forEach((e, i) => { e.visible = L.done || i < L.got.length; });
}

// ---------- кнопки ----------
export function questItems(hero) {
  if (!st || hero.climb) return st?.race?.phase === 'go' ? [{ id: 'g_dino_boost', icon: '💨' }] : [];
  const p = hero.pos, out = [];
  if (Math.hypot(p.x - PROF.x, p.z - PROF.z) < 3.2) out.push({ id: 'g_dino_pass', icon: '📒' });
  if (p.y > PLAT.y - 0.5 && Math.hypot(p.x - ZIP.from.x, p.z - ZIP.from.z) < 2.6) out.push({ id: 'g_dino_zip', icon: '🚡' });
  if (p.y > 12 && Math.hypot(p.x - SLIDE_PTS[0][0], p.z - SLIDE_PTS[0][2]) < 2.4) out.push({ id: 'g_dino_slide', icon: '🎢' });
  if (Math.hypot(p.x - 330, p.z - 30) < 4.8 && p.y < 3) out.push({ id: 'g_dino_race', icon: '🏁' });
  return out;
}

export function questUse(act, hero, save) {
  if (!st) return;
  if (act === 'pass') return openPassport(save, hero);
  if (act === 'boost' && st.race?.phase === 'go') return boost();
  if (hero.climb) return;
  if (act === 'zip') { hero.climb = st.zip = { zip: true, from: ZIP.from.clone(), to: ZIP.to.clone(), t: 0, dur: ZIP.dur, sag: ZIP.sag }; SFX.whoosh(); toast('🚡 Ух! Едем на канатке!'); passDone(save, 'zip'); }
  if (act === 'slide') {
    hero.climb = st.slide = { t: 0, dur: 6.5, sitPose: true, ride: k => SLIDE.getPointAt(k).add(new T.Vector3(0, 0.15, 0)), exit: new T.Vector3(-1.5, 2, 4) };
    SFX.whoosh(); toast('🎢 Вжу-у-ух! По лавовой горке — в озеро!');
  }
  if (act === 'race') {
    const R = st.race = { phase: 'count', c: 3.4, shown: 4, time: 0, boost: 0 };
    hero.climb = R.climb = { t: 0, dur: 1e6, sitPose: true, tri: true, ride: k => st.raceCurve.getPointAt((k * 2) % 1).setY(2.75), onJump: () => boost() };
    toast('🏁 Гонка! Два круга<small>жми прыжок или 💨 — трицератопс бежит быстрее</small>');
  }
}
function boost() { const R = st.race; if (!R || R.phase !== 'go') return; R.boost = Math.min(1.6, R.boost + 0.28); puff('💨', st.save && R.climb ? R.climb.ride(R.climb.t).setY(1) : new T.Vector3(), { size: 0.9, rise: 0.4, life: 0.5 }); SFX.pop(); }

// ---------- раз в кадр (в Долине) ----------
export function updateQuests(dt, hero, save) {
  const ev = {};
  if (!st) return ev;
  st.t += dt;
  const p = hero.pos, d = dinoSave(save), t = st.t;
  // профессор поворачивается к герою
  const pf = st.prof, near = Math.hypot(p.x - PROF.x, p.z - PROF.z) < 8;
  pf.m.root.rotation.y = near ? Math.atan2(p.x - PROF.x, p.z - PROF.z) : Math.PI / 2; animateHero(pf.m, dt, { speed: 0, maxSpeed: 4 });
  animateAnimal(st.mama.m, dt, 0);

  // потерянные яйца
  const L = d.lost;
  for (const e of st.lost) {
    if (!e.g.visible) continue;
    e.g.rotation.y += dt; e.g.position.y = e.y + Math.abs(Math.sin(t * 2 + e.i)) * 0.25;
    if (Math.random() < dt * 1.5) puff('✨', new T.Vector3(e.x, e.y + 1.4, e.z), { size: 0.5, rise: 0.6, life: 0.8 });
    if (Math.hypot(p.x - e.x, p.z - e.z) < 1.4 && Math.abs(p.y - e.y) < 1.6) {
      e.g.visible = false; L.got.push(e.i); ev.save = true; SFX.collect(); puff('🥚', new T.Vector3(e.x, e.y + 1.5, e.z), { size: 1.2, rise: 1.2 });
      toast(L.got.length < 5 ? `🥚 Нашлось яйцо мамы-динозавра! ${L.got.length} из 5` : '🥚 Все 5 яиц! Отнеси их маме-динозавру 🦖<small>она в середине луга</small>'); mamaText();
    }
  }
  if (!L.done && L.got.length >= 5 && Math.hypot(p.x - MAMA.x, p.z - MAMA.z) < 7) {
    L.done = 1; ev.save = true; ev.big = true; save.coins += 100; ev.giveEgg = { r: 3 };
    confetti(new T.Vector3(MAMA.x, 2, MAMA.z), 100); SFX.fanfare(); puff('💕', new T.Vector3(MAMA.x, 7, MAMA.z), { size: 2, rise: 1 });
    toast('🦖 Мама-динозавр: «Ура! Все мои яйца дома!»<small>+100 монет и динозавровое яйцо — в инкубатор 🥚</small>'); mamaText();
    passDone(save, 'lost');
  }

  // «пол — это лава»
  st.lavaMesh.material.color.setHSL(0.07 + Math.sin(t * 1.7) * 0.015, 1, 0.55);
  if (Math.random() < dt * 4) puff(Math.random() < 0.7 ? '🫧' : '🔥', new T.Vector3(LAVA.x0 + Math.random() * (LAVA.x1 - LAVA.x0), 0.3, LAVA.z0 + Math.random() * (LAVA.z1 - LAVA.z0)), { size: 0.7, rise: 0.8, life: 0.8 });
  if (p.x > LAVA.x0 && p.x < LAVA.x1 && p.z > LAVA.z0 && p.z < LAVA.z1 && p.y < 0.35 && !hero.climb) {
    hero.pos.set(LAVA_START.x, 0, LAVA_START.z); hero.vel.set(0, 0, 0); SFX.boing();
    puff('🔥', p.clone().setY(1), { size: 1.4, rise: 1 }); toast(['🔥 Ой, горячо! Назад на старт', '🔥 Ай-ай-ай, лава! Попробуй ещё', '🔥 Горячо-горячо! Прыгай по камушкам'][st.lavaSaid++ % 3]);
  }
  const G = st.geyser;
  if (Math.random() < dt * 3) puff('💦', new T.Vector3(G.x, G.h + 0.4, G.z), { size: 0.7, rise: 1.2, life: 0.6 });
  if (hero.grounded && Math.hypot(p.x - G.x, p.z - G.z) < 1.2 && Math.abs(p.y - G.h) < 0.25) { hero.vel.y = 24; hero.grounded = false; SFX.boing(); for (let i = 0; i < 5; i++) puff('💦', new T.Vector3(G.x, G.h + i * 1.2, G.z), { size: 1.1, rise: 2, life: 0.8 }); }
  const chestReady = d.chestDay !== today();
  st.chest.lid.rotation.x = chestReady ? 0 : -1.1;
  st.chestLabel.userData.set(chestReady ? '🎁' : '✅ завтра снова', { color: '#ffe14d' });
  if (chestReady && Math.abs(p.y - PLAT.y) < 1 && Math.hypot(p.x - (PLAT.x + 1.8), p.z - PLAT.z) < 2) {
    d.chestDay = today(); ev.save = true; ev.big = true; save.coins += 120; save.res.crystal = (save.res.crystal || 0) + 2;
    confetti(new T.Vector3(PLAT.x, PLAT.y, PLAT.z), 70); SFX.chest(); toast('🎁 Сундук над лавой! +120 монет и 2 💎<small>завтра он снова наполнится</small>');
    passDone(save, 'lava');
  }
  // горка: доехал — плюх в озеро
  if (st.slide && hero.climb !== st.slide) {
    if (st.slide.t >= 1) { SFX.splash?.(); for (let i = 0; i < 6; i++) puff('💦', p.clone().add(new T.Vector3((Math.random() - 0.5) * 3, 0.5, (Math.random() - 0.5) * 3)), { size: 1.2, rise: 1.6, life: 0.8 }); passDone(save, 'slide'); }
    st.slide = null;
  }
  if (st.zip && hero.climb !== st.zip) st.zip = null;

  // гонка
  const R = st.race;
  if (R) {
    if (hero.climb !== R.climb) {                                         // доехал или спрыгнул
      if (R.phase === 'go' && R.climb.t >= 1) {
        const time = R.time, rec = !d.raceBest || time < d.raceBest;
        if (rec) d.raceBest = time; ev.save = true; SFX.fanfare(); confetti(p.clone(), 60);
        toast(`🏁 Финиш! ${time.toFixed(1)} с${rec ? ' — новый рекорд! 🏆' : ''}<small>рекорд: ${d.raceBest.toFixed(1)} с · цель паспорта — быстрее 25 с</small>`);
        st.raceLabel.userData.set(`🏁 Гонки · рекорд ${d.raceBest.toFixed(1)} с`, { color: '#ffe14d' });
        if (time < 25) passDone(save, 'race');
      } else if (R.phase === 'go') toast('🏁 Гонка прервана<small>спрыгнул с трицератопса — попробуй ещё</small>');
      st.race = null;
    } else if (R.phase === 'count') {
      R.c -= dt; const s = Math.ceil(R.c);
      if (s !== R.shown && s > 0) { R.shown = s; toast(`🏁 ${s}…`); SFX.tap(); }
      if (R.c <= 0) { R.phase = 'go'; R.base = (d.fr?.tri || 0) >= 5 ? 30 : 34; R.climb.dur = R.base; toast('🏁 Вперёд! Жми прыжок или 💨'); SFX.levelUp(); }
    } else {
      R.time += dt; R.boost = Math.max(0, R.boost - dt * 0.7); R.climb.dur = (R.base || 34) / (1 + R.boost);
    }
  }

  // все задания паспорта — Радужный динозаврик
  if (!d.prize && TASKS.every(([id]) => d.pass[id])) {
    d.prize = Date.now(); ev.save = true; ev.big = true; ev.pet = { s: 'dinobaby', big: true, gold: false, rainbow: true };
  } else if (!d.prize2 && TASKS2.every(([id]) => d.pass[id])) {            // вторая страница — Золотой Малыш Рекс
    d.prize2 = Date.now(); ev.save = true; ev.big = true; ev.pet = { s: 'babyrex', big: false, gold: true, rainbow: false }; ev.page2 = true;
  }
  return ev;
}
