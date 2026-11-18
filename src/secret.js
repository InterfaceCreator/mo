// Тайная комната 🏮 — за зеркалом в своём домике: постой у зеркала пару секунд, оно замерцает и откроется.
// У мамы — тихий вечерний уголок: фонарики плывут в воздухе, за окном звёзды и луна, на диване спит Василий,
//   на столике у свечи — письмо (подойди — откроется).
// У Моти — секретная база: батут, светящиеся кристаллы, паровозик по кругу, пол-дискотека (загорается под ногами),
//   сундук с сокровищем (раз в день).
import { T, scene, group, box, mat } from './engine.js';
import { solid, door, onLevelReset } from './world.js';
import { makeLabel, puff, confetti, spawnZ } from './fx.js';
import { buildCat } from './vasya.js';
import { addPad } from './fun.js';

export const SECRET = { spawn: { x: 0, z: 3.5, face: Math.PI } };
// письмо маме (можно поправить текст здесь)
export const LETTER = `Нашла всё-таки 🙂

Я спрятал это письмо подальше — в надежде, что однажды ты до него доберёшься. Некоторые вещи проще написать, чем сказать.

Ты очень хорошая, Бубнилка. Смешная, сильная, тёплая — и даже не представляешь, сколько радости приносишь людям вокруг.

И даже если порой бывает грустно — знай, это временно. Такую, как ты, впереди ждёт только счастье. Потому что ты правда его заслуживаешь.

Вот. Теперь ты знаешь ❤️`;

export const KID_LETTER = `Ну привет, чемпион!
Я знал, что ты найдёшь эту комнату.
Ты сильный, смелый и добрый, и даже зомби тебя не пугают. Мама тобой гордится, и я тоже.
Открою секрет: ты её самая большая радость. Обнимай её почаще ❤️`;

let st = null;
onLevelReset(() => { st = null; });
const glow = c => mat(c, { emissive: c });

function room(w, RW, RD, H, wall, floor) {
  solid(w, RW + 2, 1, RD + 2, 0x3a3a44, 0, -1.2, 0, { studs: false });
  solid(w, RW, 0.2, RD, floor, 0, -0.2, 0, { studs: false });
  const hw = RW / 2, hd = RD / 2;
  solid(w, RW + 0.8, H, 0.4, wall, 0, 0, -hd - 0.2, { studs: false, cam: true });
  solid(w, 0.4, H, RD, wall, -hw - 0.2, 0, 0, { studs: false, cam: true }); solid(w, 0.4, H, RD, wall, hw + 0.2, 0, 0, { studs: false, cam: true });
  solid(w, hw - 1.2, H, 0.4, wall, -(hw + 1.2) / 2, 0, hd + 0.2, { studs: false, cam: true }); solid(w, hw - 1.2, H, 0.4, wall, (hw + 1.2) / 2, 0, hd + 0.2, { studs: false, cam: true });
  solid(w, 2.4, H - 3.2, 0.4, wall, 0, 3.2, hd + 0.2, { studs: false });
  // дверь назад, в домик — к зеркалу
  box(w, 2.2, 3, 0.2, 0x9a5a2a, 0, 1.5, hd + 0.05);
  door({ x: 0, z: hd - 0.4, w: 2.2, to: 'home', label: '🏠 Домик', spawn: { x: -1.6, z: -5.2, face: 0 } });
  const l = makeLabel(3.6, 0.9, { face: Math.PI }); l.position.set(0, 3.7, hd - 0.3); scene.add(l); l.userData.set('🚪 Назад, в домик', { color: '#ffffff' });
  return { hw, hd };
}

export function buildSecret(save, who) {
  const w = group(scene);
  st = { who, save, lanterns: [], tiles: [], train: null, cat: null, letter: null, chest: null, readT: 0, purrT: 0, zT: 0 };
  if (who === 'mama') mamaRoom(w); else motyaRoom(w, save);
  giftBox(w, save, who);
  return w;
}

// ---------- мамина комната: тихо и тепло ----------
function mamaRoom(w) {
  const { hw, hd } = room(w, 14, 12, 5.5, 0x3b3466, 0x6a4a3a);
  // ковёр, диван с подушками, на нём спит Василий
  box(w, 7, 0.04, 5, 0x7a4a6a, 0, 0.02, -1, { shadow: false }); box(w, 6, 0.05, 4, 0x9a5a7a, 0, 0.03, -1, { shadow: false });
  solid(w, 5, 0.9, 1.6, 0xd8b8a0, -2, 0, -4.6); box(w, 5, 1.2, 0.5, 0xc8a890, -2, 1.4, -5.3);
  for (const [x, c] of [[-3.8, 0xffb3cf], [-0.2, 0xbfe0ff]]) box(w, 0.9, 0.7, 0.3, c, x, 1.25, -5);
  const cat = group(scene, -2, 0.95, -4.5); cat.userData.dynamic = true; const cm = buildCat(cat); cat.rotation.y = 0.6; cm.root.scale.setScalar(0.8);
  st.cat = { g: cat, x: -2, z: -4.5 };
  // столик со свечой и письмом
  solid(w, 1.6, 0.8, 1.1, 0x8a5a3a, 3.2, 0, -2.5);
  box(w, 0.25, 0.4, 0.25, 0xfff3d6, 3.6, 1.0, -2.6); const fl = box(w, 0.12, 0.2, 0.12, 0xffb02e, 3.6, 1.3, -2.6, { shadow: false }); fl.material = glow(0xffb02e);
  const letter = group(scene, 2.9, 0.82, -2.4); letter.userData.dynamic = true;
  box(letter, 0.9, 0.04, 0.65, 0xfff8ea, 0, 0, 0); box(letter, 0.2, 0.06, 0.2, 0xd8261a, 0, 0.03, 0.1);   // конверт с сургучным сердечком… просто печатью
  st.letter = { g: letter, x: 2.9, z: -2.4, flame: fl };
  const ll = makeLabel(2.6, 0.65); ll.position.set(2.9, 2.1, -2.4); scene.add(ll); ll.userData.set('💌 Письмо', { color: '#ffe0ea' });
  // окно: ночное небо, звёзды и луна
  box(w, 5.2, 3, 0.1, 0xffffff, 0, 3, -hd + 0.05); box(w, 5, 2.8, 0.12, 0x101838, 0, 3, -hd + 0.08);
  for (let i = 0; i < 24; i++) { const s = box(w, 0.08, 0.08, 0.05, 0xffffff, -2.3 + (i * 37 % 46) / 10, 1.8 + (i * 23 % 24) / 10, -hd + 0.16, { shadow: false }); s.material = glow(0xfff8d0); }
  const moon = box(w, 0.7, 0.7, 0.05, 0xfff3c0, 1.6, 3.8, -hd + 0.17, { shadow: false }); moon.material = glow(0xfff3c0);
  // полка с книгами и растение, торшер
  box(w, 0.4, 2.2, 2.6, 0x8a5a3a, -hw + 0.4, 1.1, 2); [0xd8261a, 0x3fa7ff, 0x5fd35f, 0xffd23f, 0x9b6bff].forEach((c, i) => box(w, 0.3, 0.6, 0.3, c, -hw + 0.4, 1.6, 1.1 + i * 0.4));
  box(w, 0.8, 0.7, 0.8, 0xc85a3a, hw - 1, 0.35, 3.5); for (const [x, y, z] of [[0, 1, 0], [-0.3, 1.3, 0.1], [0.3, 1.25, -0.1], [0, 1.6, 0]]) box(w, 0.5, 0.5, 0.5, 0x4ad04a, hw - 1 + x, y, 3.5 + z);
  box(w, 0.12, 2.6, 0.12, 0x555a6a, hw - 1, 1.3, -4.5); const lamp = box(w, 0.9, 0.6, 0.9, 0xfff0a0, hw - 1, 2.8, -4.5); lamp.material = glow(0xffd890);
  // фонарики плывут в воздухе
  for (let i = 0; i < 16; i++) {
    const g = group(scene, -hw + 1.5 + (i * 53 % 110) / 10, 3.4 + (i % 4) * 0.4, -hd + 1.5 + (i * 29 % 90) / 10); g.userData.dynamic = true;   // повыше — над головой
    const c = [0xff9a3a, 0xff7a5a, 0xffb84a, 0xff8ab0][i % 4];
    box(g, 0.3, 0.38, 0.3, c, 0, 0, 0).material = mat(c, { emissive: new T.Color(c).multiplyScalar(0.55).getHex() }); box(g, 0.34, 0.06, 0.34, 0x6a3f2a, 0, 0.21, 0); box(g, 0.34, 0.06, 0.34, 0x6a3f2a, 0, -0.21, 0);
    st.lanterns.push({ g, y0: g.position.y, ph: i * 0.7 });
  }
  const hi = makeLabel(5, 1.25, { face: 0 }); hi.position.set(0, 4.8, -hd + 0.5); scene.add(hi); hi.userData.set('🏮 Тайная комната', { color: '#ffe0b0' });
}

// ---------- Мотина секретная база: интересно ----------
function motyaRoom(w, save) {
  const { hw, hd } = room(w, 18, 14, 7, 0x2a2a5a, 0x3a3a6a);
  // пол-дискотека: плитки загораются под ногами
  for (let ix = 0; ix < 4; ix++) for (let iz = 0; iz < 3; iz++) {
    const x = -6 + ix * 1.6, z = 1 + iz * 1.6, m = box(scene, 1.5, 0.06, 1.5, 0x5a5a8a, x, 0.04, z, { shadow: false }); m.material = mat(0x5a5a8a, { emissive: 0 });
    st.tiles.push({ m, x, z, t: 0 });
  }
  // батут посередине
  addPad(3, 2, 17);
  // кристаллы по стенам
  for (let i = 0; i < 10; i++) {
    const x = i < 5 ? -hw + 0.6 : hw - 0.6, z = -hd + 1.5 + (i % 5) * 2.6, c = [0x7fe8ff, 0xff7ac8, 0x9b6bff, 0x5fd35f, 0xffd23f][i % 5];
    for (const [h, s, dy] of [[1.4, 0.5, 0.7], [0.9, 0.35, 0.45]]) { const b = box(w, s, h, s, c, x + (i < 5 ? 0.2 : -0.2), dy, z + (h < 1 ? 0.5 : 0)); b.material = glow(c); }
  }
  // паровозик по кругу у северной стены
  const tr = group(scene, 0, 0, -3.5); tr.userData.dynamic = true;
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; box(scene, 0.5, 0.05, 0.2, 0x8a5a3a, Math.cos(a) * 3, 0.03, -3.5 + Math.sin(a) * 2, { shadow: false }); }
  const loco = group(tr, 0, 0, 0); box(loco, 0.9, 0.6, 0.6, 0xd8261a, 0, 0.4, 0); box(loco, 0.4, 0.5, 0.5, 0x2b2b33, -0.3, 0.9, 0); box(loco, 0.18, 0.3, 0.18, 0x2b2b33, 0.3, 0.9, 0);
  const car = group(tr, 0, 0, 0); box(car, 0.8, 0.5, 0.6, 0x3fa7ff, 0, 0.35, 0); box(car, 0.5, 0.3, 0.4, 0xffd23f, 0, 0.75, 0);
  st.train = { loco, car, t: 0 };
  // ракета и динозавры на полке
  const rk = group(w, hw - 2.5, 0, 4); box(rk, 1, 3, 1, 0xffffff, 0, 1.5, 0); box(rk, 0.7, 0.8, 0.7, 0xd8261a, 0, 3.4, 0); for (const sx of [-1, 1]) box(rk, 0.3, 1, 1.4, 0xd8261a, sx * 0.6, 0.5, 0); box(rk, 0.4, 0.4, 0.05, 0x7fe8ff, 0, 2, 0.52);
  box(w, 4, 0.15, 0.7, 0x8a5a3a, -3, 3.2, -hd + 0.4); [0x5fbf5a, 0xffa31a, 0x9b6bff].forEach((c, i) => { box(w, 0.8, 0.5, 0.3, c, -4.2 + i * 1.2, 3.55, -hd + 0.4); box(w, 0.25, 0.35, 0.25, c, -3.8 + i * 1.2, 3.95, -hd + 0.4); });
  // сундук с сокровищем: раз в день
  const ch = group(scene, 6, 0, -5); ch.userData.dynamic = true;
  box(ch, 1.8, 1, 1.2, 0x9a5a2a, 0, 0.5, 0); const lid = group(ch, 0, 1, -0.6); box(lid, 1.9, 0.45, 1.3, 0x7a4220, 0, 0.2, 0.6); box(ch, 0.3, 0.4, 0.08, 0xffd23f, 0, 0.8, 0.62);
  st.chest = { g: ch, lid, x: 6, z: -5 };
  // столик с письмом для Моти: зелёный конверт со звездой
  solid(w, 1.4, 0.8, 1, 0x8a5a3a, -5.5, 0, -4.5);
  const letter = group(scene, -5.5, 0.82, -4.5); letter.userData.dynamic = true;
  box(letter, 0.9, 0.04, 0.65, 0xeaffea, 0, 0, 0); box(letter, 0.22, 0.06, 0.22, 0xffd23f, 0, 0.03, 0.1);
  st.letter = { g: letter, x: -5.5, z: -4.5, flame: null };
  const ll = makeLabel(3, 0.75); ll.position.set(-5.5, 2.2, -4.5); scene.add(ll); ll.userData.set('✉️ Письмо тебе', { color: '#9dffb0' });
  const cl = makeLabel(3.2, 0.8); cl.position.set(6, 2.6, -5); scene.add(cl); st.chestLabel = cl;
  chestLabel(save);
  const hi = makeLabel(6, 1.5, { face: 0 }); hi.position.set(0, 5.6, -hd + 0.5); scene.add(hi); hi.userData.set('🚀 Секретная база Моти', { color: '#9dffb0' });
}
// редкий подарок: светящаяся коробка, открывается один раз — внутри питомец, которого больше нигде нет
const GIFT = { mama: { s: 'starfox', x: 4.5, z: 1.5, c: 0xff8ab0 }, motya: { s: 'spacedragon', x: 6, z: -1.5, c: 0x6a5aff } };
function giftBox(w, save, who) {
  if (save.secretGift) return;
  const G = GIFT[who === 'mama' ? 'mama' : 'motya'];
  solid(w, 1.2, 0.5, 1.2, 0x8a5a3a, G.x, 0, G.z);                                  // подставка
  const g = group(scene, G.x, 1.2, G.z); g.userData.dynamic = true;
  box(g, 0.9, 0.9, 0.9, G.c, 0, 0, 0).material = glow(G.c);
  box(g, 0.95, 0.95, 0.2, 0xffd23f, 0, 0, 0); box(g, 0.2, 0.95, 0.95, 0xffd23f, 0, 0, 0);   // лента
  box(g, 0.45, 0.25, 0.12, 0xffd23f, -0.18, 0.55, 0); box(g, 0.45, 0.25, 0.12, 0xffd23f, 0.18, 0.55, 0);   // бантик
  const lb = makeLabel(3.4, 0.85); lb.position.set(G.x, 2.6, G.z); scene.add(lb); lb.userData.set('🎁 Редкий подарок!', { color: '#ffe14d' });
  st.gift = { g, lb, ...G };
}
const today = () => new Date().toDateString();
function chestLabel(save) { const done = save.secret?.day === today(); st.chestLabel.userData.set(done ? '🎁 Завтра — новое сокровище' : '🎁 Сокровище дня!', { color: done ? '#cfd6ff' : '#ffe14d' }); }

// раз в кадр. Вернёт { letter } — показать письмо, { coins } — сокровище
export function updateSecret(dt, hero) {
  if (!st) return {};
  const ev = {}, p = hero.pos, t = performance.now() / 1000;
  for (const L of st.lanterns) { L.g.position.y = L.y0 + Math.sin(t * 0.6 + L.ph) * 0.35; L.g.rotation.y = t * 0.2 + L.ph; }
  const Gf = st.gift;
  if (Gf) {
    Gf.g.rotation.y = t * 0.8; Gf.g.position.y = 1.2 + Math.sin(t * 2) * 0.15;
    if (Math.random() < dt * 3) puff('✨', new T.Vector3(Gf.x + (Math.random() - 0.5), 1.8, Gf.z + (Math.random() - 0.5)), { size: 0.6, rise: 0.8 });
    if (Math.hypot(p.x - Gf.x, p.z - Gf.z) < 1.7) {
      scene.remove(Gf.g); scene.remove(Gf.lb); confetti(new T.Vector3(Gf.x, 1.4, Gf.z), 140);
      st.gift = null; ev.gift = Gf.s;
    }
  }
  const nearL = Math.hypot(p.x - st.letter.x, p.z - st.letter.z) < 1.7;
  if (nearL && !st.wasL) ev.letter = st.who === 'mama' ? { t: LETTER, from: '<b>🏮 Письмо</b>', paw: '🐾' } : { t: KID_LETTER, from: '<b>✉️ Письмо</b>', paw: '⭐' };
  st.wasL = nearL;
  if (st.who === 'mama') {
    if ((st.zT -= dt) <= 0) { st.zT = 1.6; spawnZ(new T.Vector3(st.cat.x, 1.9, st.cat.z), 0.7); }      // Василий спит
    st.letter.flame.scale.y = 1 + Math.sin(t * 13) * 0.25;
    if (Math.hypot(p.x - st.cat.x, p.z - st.cat.z) < 2 && (st.purrT -= dt) <= 0) { st.purrT = 2.5; puff('💤', new T.Vector3(st.cat.x, 2.2, st.cat.z), { size: 0.9, rise: 0.6 }); ev.purr = true; }
  } else {
    for (const Tl of st.tiles) {
      const on = Math.abs(p.x - Tl.x) < 0.8 && Math.abs(p.z - Tl.z) < 0.8 && p.y < 0.6;
      if (on && Tl.t <= 0) { Tl.c = new T.Color().setHSL(Math.random(), 0.9, 0.55); ev.note = (ev.note ?? Math.floor(Math.random() * 4)); }
      Tl.t = on ? 1 : Math.max(0, Tl.t - dt * 0.8);
      if (Tl.c) Tl.m.material.emissive.copy(Tl.c).multiplyScalar(Tl.t);
    }
    const TR = st.train; TR.t += dt * 0.5;
    for (const [m, off] of [[TR.loco, 0], [TR.car, -0.45]]) { const a = TR.t + off; m.position.set(Math.cos(a) * 3, 0, Math.sin(a) * 2); m.rotation.y = -a; }
    const C = st.chest, S = st.save;
    if (Math.hypot(p.x - C.x, p.z - C.z) < 1.8 && S.secret?.day !== today()) {
      S.secret = { day: today() }; C.lid.rotation.x = -1.1; confetti(new T.Vector3(C.x, 1.6, C.z), 90);
      puff('💰', new T.Vector3(C.x, 2.2, C.z), { size: 1.8, rise: 1.4, life: 2 }); ev.coins = 150; chestLabel(S);
    }
  }
  return ev;
}
