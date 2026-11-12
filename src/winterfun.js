// Зимние забавы ❄️ (Зимняя долина, winter.js — сама долина):
//   🧊 ледяные головоломки — три пруда: на льду скользишь, пока не упрёшься в камень или в край. Доберись до флажка 🚩.
//   🎵 поющие сосульки — сосульки играют мелодию, повтори её, наступая на плиты; каждый круг на ноту длиннее.
//   🎣 рыбалка — встань у лунки на озере, кнопка 🎣: закинул — жди, поплавок дёрнулся — тяни! Шесть видов рыбы, рыба — на кухню.
//   🦉 ворота снежной совы — задачки на счёт и логику: встань на плиту с ответом. Пять верных — ворота открываются, за ними сундук.
//   🐧 потерявшиеся пингвинята — шестеро разбрелись по долине; подойди — пойдут за тобой; отведи к маме-пингвину у иглу.
//   ❄️ снежная битва — Коля и Оля в снежной крепости: кто первый попадёт пять раз.
//   ✨ золотые звёзды — десять штук спрятаны по долине (как в Лесу).
import { T, scene, group, box, mat } from './engine.js';
import { groundY, solid, addCollider, onLevelReset } from './world.js';
import { makeLabel, puff, confetti, sprite, emojiTex } from './fx.js';
import { buildBird, animateAnimal } from './animals.js';
import { buildHero, animateHero, PEOPLE } from './hero.js';
import { addStar } from './fun.js';
import { input } from './input.js';
import { WINTER, ballTargets } from './winter.js';
import { kitchen } from './food.js';

const W = WINTER;
let F = null;
onLevelReset(() => { F = null; });
const label = (text, x, z, up, colr = '#ffffff', wd = 5) => { const l = makeLabel(wd, wd / 4); l.position.set(x, groundY(x, z) + up, z); scene.add(l); l.userData.set(text, { color: colr }); return l; };
const wsave = save => { const w = save.winter || (save.winter = { sm: [0, 0, 0] }); w.puz ||= {}; w.fish ||= {}; w.chicks ||= {}; return w; };

export function buildWinterFun(save) {
  F = { save, ev: null, ponds: [], ctl: null, simon: null, fish: null, gate: null, chicks: [], mama: null, battle: null };
  ponds(); simon(); lake(); gate(); penguins(save); fort();
  // десять золотых звёзд
  const H = W.hill, S = [[0, H.z1 - 6, 2], [W.igloo.x, W.igloo.z, 4.6], [W.rink.x, W.rink.z, 0], [W.lake.x, W.lake.z, 0], [W.cocoa.x, W.cocoa.z, 3.2],
    [64, 64, 0], [-64, -64, 0], [W.fort.x, W.fort.z - 2, 1.6], [W.simon.x, W.simon.z, 0], [W.gate.x, W.gate.z - 6, 0]];
  S.forEach(([x, z, up], i) => addStar(save, `winter-${i + 1}`, x, z, groundY(x, z) + up));
}

// ---------- 🧊 ледяные головоломки ----------
// 7×7 клеток по 2 шага; # — камень, G — флажок (на нём останавливаешься), E — вход (снизу посередине)
const LEVELS = [
  ['.....#.', 'G......', '.......', '.......', '.......', '.......', '...E...'],
  ['.......', '.G.....', '#...#..', '.#.....', '....#..', '.......', '###E..#'],
  ['##....#', '.....#.', '.G.....', '..##..#', '.#...##', '.......', '...E...'],
];
const PRIZE = [50, 100, 200], CELL = 2;
const tileXZ = (o, r, c) => ({ x: o.x + (c - 3) * CELL, z: o.z + (r - 3) * CELL });
function ponds() {
  W.ponds.forEach((o, i) => {
    const g = LEVELS[i], y = groundY(o.x, o.z);
    // снежный бортик вокруг пруда (выше шага — не перешагнёшь), проход снизу посередине
    for (let k = -4; k <= 4; k++) for (const [dx, dz] of [[k, -4], [k, 4], [-4, k], [4, k]]) {
      if (dz === 4 && dx === 0) continue;
      const x = o.x + dx * CELL, z = o.z + dz * CELL; solid(scene, CELL, 1.7, CELL, (dx + dz) % 2 ? 0xffffff : 0xe8f0fa, x, y, z, { studs: false });
    }
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
      const { x, z } = tileXZ(o, r, c), ch = g[r][c];
      if (ch === '#') { solid(scene, 1.7, 1.3, 1.7, 0x8a96a6, x, y, z); box(scene, 1.5, 0.25, 1.5, 0xffffff, x, y + 1.42, z); }
      if (ch === 'G') { box(scene, 1.9, 0.06, 1.9, 0x5fd35f, x, y + 0.04, z, { shadow: false }); box(scene, 0.1, 2.2, 0.1, 0x6a3f1e, x, y + 1.1, z); box(scene, 0.8, 0.5, 0.05, 0xd8261a, x + 0.45, y + 1.9, z); }
      if (ch === 'E') box(scene, 1.9, 0.06, 1.9, 0xffffff, x, y + 0.04, z, { shadow: false });
    }
    const e = tileXZ(o, 7, 3);
    label(`🧊 Головоломка ${i + 1}${wsave(F.save).puz[i] ? ' ✅' : ''}`, o.x, o.z - 9, 3.4, '#bfe8ff', 5);
    label('встань на белое и выбирай куда — скользишь до камня', e.x, e.z + 1, 2.4, '#ffffff', 6.5);
    F.ponds.push({ o, g, y, i });
  });
}
// где на льду можно остановиться: камень или край — стоп; флажок — стоп на нём
function slideEnd(P, r, c, dr, dc) {
  let R = r, C = c;
  for (;;) { const r2 = R + dr, c2 = C + dc; if (r2 < 0 || c2 < 0 || r2 > 6 || c2 > 6 || P.g[r2][c2] === '#') break; R = r2; C = c2; if (P.g[R][C] === 'G') break; }
  return [R, C];
}
function updatePonds(dt, hero, yaw, ev) {
  const p = hero.pos, K = F.ctl;
  if (!K) {                                                         // встал на вход — управление прудом
    for (const P of F.ponds) { const e = tileXZ(P.o, 6, 3); if (Math.abs(p.x - e.x) < 0.9 && Math.abs(p.z - e.z) < 0.9 && hero.grounded && !hero.climb) { F.ctl = { P, r: 6, c: 3, slide: null, armed: false }; ev.say = `🧊 Головоломка ${P.i + 1}: доберись до флажка 🚩<small>джойстик в сторону — скользишь до камня · прыжок — выйти</small>`; break; } }
    return;
  }
  const P = K.P;
  if (K.slide) {                                                    // скольжу
    const S = K.slide; S.t += dt / S.dur;
    const k = Math.min(1, S.t), q = { x: S.a.x + (S.b.x - S.a.x) * k, z: S.a.z + (S.b.z - S.a.z) * k };
    p.set(q.x, P.y, q.z); hero.vel.set(0, 0, 0);
    if (S.t >= 1) {
      K.slide = null; K.r = S.r; K.c = S.c; ev.sfx.push('tap');
      if (P.g[K.r][K.c] === 'G') {                                    // флажок!
        const w = wsave(F.save), first = !w.puz[P.i]; w.puz[P.i] = true;
        ev.coins = first ? PRIZE[P.i] : 10; ev.sfx.push('fanfare'); confetti(new T.Vector3(p.x, P.y + 2, p.z), 80);
        ev.say = first ? `🚩 Головоломка ${P.i + 1} решена! +${PRIZE[P.i]} монет${P.i < 2 ? '<small>следующая — сложнее 🧊</small>' : '<small>ты решил самую сложную! 🧠</small>'}` : '🚩 Снова решена! +10 монет';
        ev.stat = 'puzzles'; leave(hero, 1.2);
      }
    }
    return;
  }
  const t = tileXZ(P.o, K.r, K.c); p.set(t.x, P.y, t.z); hero.vel.x = hero.vel.z = 0;
  if (hero.jumped) { leave(hero, 0); return; }                       // прыжок — выйти к входу
  const m = input.move, mag = Math.hypot(m.x, m.y);
  if (mag < 0.3) { K.armed = true; return; }                        // отпустил джойстик — можно следующий ход
  if (!K.armed || mag < 0.6) return;
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const wx = rx * m.x - fx * m.y, wz = rz * m.x - fz * m.y;
  const [dr, dc] = Math.abs(wx) > Math.abs(wz) ? [0, Math.sign(wx)] : [Math.sign(wz), 0];
  K.armed = false; hero.face = Math.atan2(dc, dr);
  if (K.r === 6 && K.c === 3 && dr === 1) { leave(hero, 0); return; }  // со входа назад — вышел
  const [R, C] = slideEnd(P, K.r, K.c, dr, dc);
  if (R === K.r && C === K.c) { ev.sfx.push('nope'); return; }
  const a = tileXZ(P.o, K.r, K.c), b = tileXZ(P.o, R, C), d = Math.hypot(b.x - a.x, b.z - a.z);
  K.slide = { a, b, r: R, c: C, t: 0, dur: d / 12 }; ev.sfx.push('boing');
}
function leave(hero, delay) {
  const K = F.ctl; if (!K) return;
  const go = () => { const e = tileXZ(K.P.o, 7, 3); hero.pos.set(e.x, K.P.y, e.z + 1.2); hero.vel.set(0, 0, 0); hero.face = 0; if (F) F.ctl = null; };
  if (delay) { K.slide = { a: tileXZ(K.P.o, K.r, K.c), b: tileXZ(K.P.o, K.r, K.c), r: K.r, c: K.c, t: -99, dur: 1 }; setTimeout(go, delay * 1000); } else go();
}
export const inPond = () => !!F?.ctl;

// ---------- 🎵 поющие сосульки ----------
const COLORS = [0x3fa7ff, 0xff5a8a, 0xffd23f, 0x5fd35f];
function simon() {
  const o = W.simon, y = groundY(o.x, o.z), S = F.simon = { o, y, plates: [], seq: [], mode: 'idle', i: 0, t: 0, best: wsave(F.save).simon || 0, on: -1 };
  [[-3, 0], [0, -3], [3, 0], [0, 3]].forEach(([dx, dz], k) => {
    const x = o.x + dx, z = o.z + dz;
    const pl = box(scene, 2.2, 0.08, 2.2, COLORS[k], x, y + 0.05, z, { shadow: false }); pl.material = mat(COLORS[k], { emissive: 0 });
    const ic = group(scene, x + dx * 0.35, y, z + dz * 0.35);       // сосулька: столб из кубиков, сужается кверху
    [[0.9, 0], [0.75, 1], [0.6, 2], [0.45, 3], [0.3, 4]].forEach(([w, h]) => box(ic, w, 1, w, 0xe0f4ff, 0, h + 0.5, 0));
    const glow = box(ic, 0.5, 0.5, 0.5, COLORS[k], 0, 5.3, 0); glow.material = mat(COLORS[k], { emissive: 0 });
    S.plates.push({ x, z, pl, glow });
  });
  const st = { x: o.x, z: o.z + 6.5 };
  box(scene, 2.4, 0.08, 1.6, 0xffffff, st.x, y + 0.05, st.z, { shadow: false });
  S.start = st;
  S.label = label('🎵 Поющие сосульки — встань на белую плиту', o.x, o.z, 6.8, '#ffffff', 7);
}
function lightPlate(k, on) { const P = F.simon.plates[k]; P.pl.material.emissive.setHex(on ? COLORS[k] : 0); P.glow.material.emissive.setHex(on ? COLORS[k] : 0); P.pl.material.emissive.multiplyScalar(on ? 0.6 : 0); }
function updateSimon(dt, hero, ev) {
  const S = F.simon, p = hero.pos, onStart = Math.abs(p.x - S.start.x) < 1.2 && Math.abs(p.z - S.start.z) < 0.8;
  if (S.mode === 'idle') {
    if (onStart && !S.wasStart) { S.seq = [Math.floor(Math.random() * 4)]; S.seq.push(Math.floor(Math.random() * 4)); play(S); ev.say = '🎵 Слушай и смотри! Потом повтори — наступай на плиты по порядку'; }
    S.wasStart = onStart; return;
  }
  S.wasStart = onStart;
  if (S.mode === 'show') {                                          // играет мелодию: нота — 0.45 с света и 0.25 с паузы
    S.t -= dt;
    if (S.t <= 0) {
      if (S.on >= 0) { lightPlate(S.on, false); S.on = -1; S.t = 0.25; return; }
      if (S.i >= S.seq.length) { S.mode = 'input'; S.i = 0; S.label.userData.set(`🎵 Твоя очередь! Нот: ${S.seq.length}`, { color: '#ffe14d' }); return; }
      S.on = S.seq[S.i++]; lightPlate(S.on, true); ev.sfx.push('note' + S.on); S.t = 0.45;
    }
    return;
  }
  if (S.mode === 'input') {
    let on = -1; S.plates.forEach((P, k) => { if (Math.abs(p.x - P.x) < 1.1 && Math.abs(p.z - P.z) < 1.1 && p.y < S.y + 1) on = k; });
    if (on !== S.was && on >= 0) {
      lightPlate(on, true); setTimeout(() => { if (F?.simon === S) lightPlate(on, false); }, 300); ev.sfx.push('note' + on);
      if (on !== S.seq[S.i]) {                                       // ошибка — круг окончен
        const got = S.seq.length - 1, w = wsave(F.save);
        ev.sfx.push('nope'); S.mode = 'idle';
        if (got > (w.simon || 0)) { w.simon = got; ev.coins = got * 15; ev.say = `🎵 Ой, другая нота! Рекорд: ${got} ${got > 4 ? 'нот' : 'ноты'} — новый! +${got * 15} монет`; }
        else ev.say = `🎵 Ой, другая нота! Получилось ${got}. Рекорд — ${w.simon}. Встань на белую плиту — ещё раз`;
        S.label.userData.set('🎵 Поющие сосульки — встань на белую плиту', { color: '#ffffff' });
      } else if (++S.i >= S.seq.length) {                            // всё верно — нота длиннее
        if (S.seq.length >= 9) { const w = wsave(F.save); w.simon = 9; S.mode = 'idle'; ev.coins = 300; ev.sfx.push('fanfare'); ev.say = '🎵 Девять нот без ошибки! Ты мастер мелодий! +300 монет'; confetti(new T.Vector3(S.o.x, S.y + 3, S.o.z), 100); S.label.userData.set('🎵 Поющие сосульки — встань на белую плиту', { color: '#ffffff' }); }
        else { S.seq.push(Math.floor(Math.random() * 4)); ev.sfx.push('collect'); S.label.userData.set(`✅ Верно! Теперь ${S.seq.length} нот`, { color: '#9dffb0' }); setTimeout(() => { if (F?.simon === S && S.mode === 'input') play(S); }, 900); S.mode = 'wait'; }
      }
    }
    S.was = on;
  }
}
function play(S) { S.mode = 'show'; S.i = 0; S.t = 0.6; S.on = -1; S.label.userData.set('🎵 Слушай…', { color: '#bfe8ff' }); }

// ---------- 🎣 рыбалка ----------
export const FISH = [
  ['karas', '🐟', 'Карась', 40], ['okun', '🐠', 'Окунь', 25], ['ersh', '🐡', 'Ёрш', 15], ['rak', '🦞', 'Рак', 10], ['som', '🐋', 'Сом', 7], ['gold', '🌟', 'Золотая рыбка', 3],
];
function lake() {
  const L = W.lake, y = groundY(L.x, L.z), holes = [];
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2 + 0.4, x = L.x + Math.cos(a) * 5.5, z = L.z + Math.sin(a) * 5.5;
    const m = new T.Mesh(new T.CircleGeometry(0.9, 16), new T.MeshBasicMaterial({ color: 0x1d4a7a })); m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.03, z); scene.add(m);
    for (let k = 0; k < 6; k++) { const b = k / 6 * Math.PI * 2; box(scene, 0.5, 0.25, 0.5, 0xffffff, x + Math.cos(b) * 1.15, y + 0.12, z + Math.sin(b) * 1.15); }
    holes.push({ x, z });
  }
  F.fish = { holes, y, state: null };
  label('🎣 Рыбалка — встань у лунки, кнопка 🎣', L.x, L.z, 3.2, '#bfe8ff', 6);
}
export const atHole = hero => !!F?.fish && F.fish.holes.find(h => Math.hypot(hero.pos.x - h.x, hero.pos.z - h.z) < 1.6) || null;
export const fishState = () => F?.fish?.state?.k || null;
// нажали 🎣: закинуть / тянуть
export function fishButton(hero) {
  const R = F?.fish; if (!R) return null;
  const h = atHole(hero); if (!h) return null;
  const S = R.state;
  if (!S) {                                                         // закинуть: поплавок в лунку, ждём поклёвку 2–5 с
    const g = group(scene, h.x, R.y + 0.15, h.z); g.userData.dynamic = true;
    box(g, 0.25, 0.25, 0.25, 0xd8261a, 0, 0, 0); box(g, 0.2, 0.15, 0.2, 0xffffff, 0, 0.18, 0);
    R.state = { k: 'wait', h, g, t: 2 + Math.random() * 3 };
    return { say: '🎣 Закинул! Жди, когда поплавок дёрнется…', sfx: 'tap' };
  }
  if (S.k === 'wait') { scene.remove(S.g); R.state = null; return { say: '🎣 Рано! Рыба испугалась — закинь ещё раз', sfx: 'nope' }; }
  if (S.k === 'bite') {                                            // тянуть — поймал!
    scene.remove(S.g); R.state = null;
    let r = Math.random() * 100, f = FISH[0]; for (const x of FISH) { if ((r -= x[3]) < 0) { f = x; break; } }
    const w = wsave(F.save), first = !w.fish[f[0]]; w.fish[f[0]] = (w.fish[f[0]] || 0) + 1;
    const K = kitchen(F.save); if (f[0] !== 'gold') K.have.fish = (K.have.fish || 0) + 1;
    puff(f[1], new T.Vector3(h.x, R.y + 2, h.z), { size: 1.8, rise: 1.4, life: 2 });
    const all = FISH.every(x => w.fish[x[0]]), ev = { sfx: f[0] === 'gold' ? 'fanfare' : 'collect', stat: 'fish' };
    ev.say = f[0] === 'gold' ? '🌟 Золотая рыбка! Исполняю желание: +300 монет ✨' : `🎣 Поймал: ${f[1]} ${f[2]}!${first ? ' Новая рыба в коллекции!' : ''}<small>рыба — на кухню 🍳 · поймано видов: ${FISH.filter(x => w.fish[x[0]]).length} из ${FISH.length}</small>`;
    if (f[0] === 'gold') ev.coins = 300;
    if (first && all) { ev.coins = (ev.coins || 0) + 500; ev.say += '<small>🏆 ВСЕ шесть рыб пойманы! +500 монет</small>'; }
    return ev;
  }
  return null;
}
function updateFish(dt, hero, ev) {
  const S = F.fish.state; if (!S) return;
  if (!atHole(hero)) { scene.remove(S.g); F.fish.state = null; return; }   // ушёл от лунки — удочку убрал
  S.t -= dt;
  if (S.k === 'wait') { S.g.position.y = F.fish.y + 0.15 + Math.sin(performance.now() / 300) * 0.04; if (S.t <= 0) { S.k = 'bite'; S.t = 1.6; ev.sfx.push('pop'); puff('❗', new T.Vector3(S.h.x, F.fish.y + 2.2, S.h.z), { size: 1.6, rise: 0.4, life: 1.2 }); ev.say = '❗ Клюёт! Жми 🎣 скорее!'; } }
  else if (S.k === 'bite') { S.g.position.y = F.fish.y - 0.1 + Math.sin(performance.now() / 60) * 0.12; if (S.t <= 0) { scene.remove(S.g); F.fish.state = null; ev.say = '🐟 Сорвалась… Закинь ещё раз 🎣'; ev.sfx.push('nope'); } }
}

// ---------- 🦉 ворота снежной совы ----------
const WIN_ODD = ['❄️', '⛄', '🧊', '🧣', '🛷', '🧤'], ODD = ['🔥', '🌴', '🍉', '☀️', '🏖️'];
const pickN = (arr, n) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };   // честное перемешивание
function question() {
  const k = Math.floor(Math.random() * 5), R = n => Math.floor(Math.random() * n);
  const nums = (a, lo = 0) => { const s = new Set([a]); while (s.size < 3) { const v = Math.max(lo, a + R(5) - 2); s.add(v); } return pickN([...s], 3); };
  if (k === 0) { const a = 1 + R(4), b = 1 + R(4), e = pickN(['⛄', '🐧', '❄️', '🍪'], 1)[0]; return { q: `${e.repeat(a)} + ${e.repeat(b)} = ?`, a: String(a + b), opts: nums(a + b, 1).map(String) }; }
  if (k === 1) { const n = 2 + R(6), e = pickN(['🐧', '⛄', '🦌', '🎄'], 1)[0]; return { q: `Сколько тут ${e}?  ${e.repeat(n)}`, a: String(n), opts: nums(n, 1).map(String) }; }
  if (k === 2) { const w = pickN(WIN_ODD, 3), o = pickN(ODD, 1)[0]; return { q: `Что лишнее зимой?  ${pickN([...w, o], 4).join(' ')}`, a: o, opts: pickN([o, w[0], w[1]], 3) }; }
  if (k === 3) { const step = 1 + R(2), s = 1 + R(3), seq = [s, s + step, s + 2 * step]; return { q: `Что дальше?  ${seq.join(', ')}, ?`, a: String(s + 3 * step), opts: nums(s + 3 * step, 1).map(String) }; }
  const a = 3 + R(4), b = 1 + R(a - 1), e = pickN(['🍪', '🐟', '🍎'], 1)[0]; return { q: `${e.repeat(a)} − ${e.repeat(b)} = ?`, a: String(a - b), opts: nums(a - b, 0).map(String) };
}
function sign() {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 384;
  const m = new T.Mesh(new T.PlaneGeometry(9, 3.4), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv), fog: false }));
  m.userData.draw = (q, done) => {
    const c = cv.getContext('2d'); c.fillStyle = '#2b4a7a'; c.fillRect(0, 0, 1024, 384); c.strokeStyle = '#bfe8ff'; c.lineWidth = 14; c.strokeRect(7, 7, 1010, 370);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    let fs = 78; c.font = `bold ${fs}px "Arial Rounded MT Bold","Trebuchet MS",sans-serif`; while (c.measureText(q).width > 960 && fs > 30) { fs -= 4; c.font = `bold ${fs}px "Arial Rounded MT Bold","Trebuchet MS",sans-serif`; }
    c.fillText(q, 512, 160);
    c.font = 'bold 60px sans-serif'; c.fillText('✅'.repeat(done) + '⬜'.repeat(5 - done), 512, 300);
    m.material.map.needsUpdate = true;
  };
  return m;
}
function gate() {
  const o = W.gate, y = groundY(o.x, o.z), gz = o.z - 1, G = F.gate = { o, y, plates: [], done: 0, open: false, cool: 0, chest: null };
  // ворота смотрят на юг: перед ними плиты с ответами, за ними — дворик из снежных стен, в нём сундук
  for (const sx of [-1, 1]) { solid(scene, 1.6, 6, 1.6, 0xbfe0f5, o.x + sx * 3.4, y, gz); solid(scene, 1, 3.4, 8, 0xf0f6ff, o.x + sx * 3.7, y, gz - 4.6); }
  solid(scene, 8.4, 3.4, 1, 0xf0f6ff, o.x, y, gz - 8.6);
  box(scene, 8.6, 1, 1.8, 0x9ad0f0, o.x, y + 6.5, gz);
  const owl = group(scene, o.x, y + 7, gz); box(owl, 1.2, 1.4, 1, 0xffffff, 0, 0.7, 0); for (const sx of [-1, 1]) { box(owl, 0.32, 0.32, 0.05, 0xffd23f, sx * 0.25, 1.05, 0.52); box(owl, 0.14, 0.14, 0.06, 0x1d1d23, sx * 0.25, 1.05, 0.55); } box(owl, 0.16, 0.2, 0.1, 0xff9f1a, 0, 0.8, 0.55);
  G.door = group(scene, o.x, y, gz); G.door.userData.dynamic = true;
  box(G.door, 5.2, 5.6, 0.5, 0x7fbfe6, 0, 2.8, 0); for (let i = 0; i < 4; i++) box(G.door, 5.2, 0.12, 0.55, 0xe8f6ff, 0, 0.7 + i * 1.4, 0);
  G.col = { x0: o.x - 2.6, x1: o.x + 2.6, y0: y, y1: y + 5.6, z0: gz - 0.3, z1: gz + 0.3 }; addCollider(G.col);
  G.sign = sign(); G.sign.position.set(o.x, y + 3.4, gz + 0.3); scene.add(G.sign);
  const ch = group(scene, o.x, y, gz - 5); box(ch, 1.6, 0.9, 1.1, 0x9a5a2a, 0, 0.45, 0); box(ch, 1.7, 0.4, 1.2, 0x7a4220, 0, 1.05, 0); box(ch, 0.3, 0.35, 0.08, 0xffd23f, 0, 0.75, 0.58);
  G.chest = { g: ch, x: o.x, z: gz - 5, taken: false };
  [-2.6, 0, 2.6].forEach(dx => {
    const x = o.x + dx, z = o.z + 3.5, pl = box(scene, 2, 0.08, 2, 0xffffff, x, y + 0.05, z, { shadow: false });
    const lb = makeLabel(2.4, 0.8); lb.position.set(x, y + 1.5, z); scene.add(lb);
    G.plates.push({ x, z, pl, lb, v: '' });
  });
  label('🦉 Ворота снежной совы: встань на плиту с ответом', o.x, o.z + 7.5, 2.6, '#ffffff', 7);
  next(G);
}
function next(G) { G.qq = question(); G.sign.userData.draw(G.qq.q, G.done); G.plates.forEach((P, i) => { P.v = G.qq.opts[i]; P.lb.userData.set(P.v, { color: '#ffffff' }); }); }
function updateGate(dt, hero, ev) {
  const G = F.gate, p = hero.pos;
  if (G.open) {
    G.door.position.y = Math.min(G.y + 5.5, G.door.position.y + dt * 3);
    const C = G.chest;
    if (!C.taken && Math.hypot(p.x - C.x, p.z - C.z) < 1.6) {
      C.taken = true; C.g.children[1].rotation.x = -0.9; C.g.children[1].position.z = -0.4; C.g.children[1].position.y = 1.4;
      const w = wsave(F.save), first = !w.gate; w.gate = (w.gate || 0) + 1;
      ev.coins = first ? 250 : 60; ev.sfx.push('chest'); confetti(new T.Vector3(C.x, G.y + 2, C.z), 80);
      ev.say = `🎁 Сундук совы! +${ev.coins} монет${first ? '<small>сова ещё придумает задачки — заходи снова 🦉</small>' : ''}`;
      G.cool = 60;
    }
    if (C.taken && (G.cool -= dt) <= 0) {                           // через минуту — новые задачки, ворота закрываются
      G.open = false; G.done = 0; C.taken = false; C.g.children[1].rotation.x = 0; C.g.children[1].position.set(0, 1.05, 0);
      G.door.position.y = G.y; G.col.off = false; next(G);
    }
    return;
  }
  let on = -1; G.plates.forEach((P, i) => { if (Math.abs(p.x - P.x) < 1 && Math.abs(p.z - P.z) < 1 && p.y < G.y + 1) on = i; });
  if (on !== G.was && on >= 0) {
    const P = G.plates[on];
    if (P.v === G.qq.a) {
      G.done++; ev.sfx.push('collect'); puff('✅', new T.Vector3(P.x, G.y + 2.4, P.z), { size: 1.4 });
      if (G.done >= 5) { G.open = true; G.col.off = true; G.sign.userData.draw('Молодец! Ворота открыты 🦉', 5); ev.sfx.push('fanfare'); ev.say = '🦉 Пять из пяти! Ворота открыты — забери сундук'; ev.stat = 'owl'; }
      else { ev.say = `✅ Верно! ${G.done} из 5`; next(G); }
    } else { ev.sfx.push('nope'); puff('🤔', new T.Vector3(P.x, G.y + 2.4, P.z), { size: 1.4 }); ev.say = '🤔 Не то. Подумай ещё — посчитай по картинкам'; }
  }
  G.was = on;
}

// ---------- 🐧 пингвинята ----------
const CHICKS = [[60, -40], [-62, 50], [26, -6], [-14, -32], [40, 62], [-30, -64]];
const pengBuild = (p, s) => { const m = buildBird(p, { body: 0x2b2b3a, beak: 0xffa31a, wing: 0x1e1e2a, legC: 0xffa31a }); m.root.scale.setScalar(s); return m; };
function penguins(save) {
  const M = W.mama, w = wsave(save);
  const mg = group(scene, M.x, groundY(M.x, M.z), M.z); mg.userData.dynamic = true;
  F.mama = { g: mg, m: pengBuild(mg, 2.4), x: M.x, z: M.z };
  const all = CHICKS.every((_, i) => w.chicks[i]);
  F.mamaLabel = label(all ? '🐧 Мама-пингвин: все дома! Спасибо!' : '🐧 Мама-пингвин: «Мои детки потерялись!»', M.x, M.z, 4, '#ffffff', 6);
  CHICKS.forEach(([x, z], i) => {
    const home = w.chicks[i], px = home ? M.x + Math.cos(i) * 2.5 : x, pz = home ? M.z + Math.sin(i) * 2.5 : z;
    const g = group(scene, px, groundY(px, pz), pz); g.userData.dynamic = true;
    F.chicks.push({ i, g, m: pengBuild(g, 0.9), state: home ? 'home' : 'lost', face: 0, hop: Math.random() * 6 });
  });
}
function updateChicks(dt, hero, ev) {
  const p = hero.pos, t = performance.now() / 1000, M = F.mama;
  let k = 0;
  for (const C of F.chicks) {
    const q = C.g.position; let spd = 0;
    if (C.state === 'lost') { C.hop += dt; q.y = groundY(q.x, q.z) + Math.abs(Math.sin(C.hop * 3)) * 0.15; if (Math.hypot(p.x - q.x, p.z - q.z) < 2.2) { C.state = 'follow'; ev.sfx.push('pop'); puff('💛', q.clone().setY(q.y + 1.6), { size: 1 }); ev.say = '🐧 Пингвинёнок пошёл за тобой! Отведи его к маме у иглу'; } }
    else if (C.state === 'follow') {
      // идут гуськом за героем
      const back = 1.6 + k * 1.2, tx = p.x - Math.sin(hero.face) * back, tz = p.z - Math.cos(hero.face) * back, dx = tx - q.x, dz = tz - q.z, d = Math.hypot(dx, dz);
      if (d > 0.3) { spd = Math.min(d * 3, 10); q.x += dx / d * spd * dt; q.z += dz / d * spd * dt; C.face = Math.atan2(dx, dz); }
      if (d > 25) { q.x = tx; q.z = tz; }                                  // отстал (портал, горка) — догоняет сразу
      q.y = groundY(q.x, q.z); k++;
      if (Math.hypot(q.x - M.x, q.z - M.z) < 4.5 || Math.hypot(p.x - M.x, p.z - M.z) < 4.5) {   // подвёл к маме сам или пингвинёнок подбежал
        C.state = 'home'; const w = wsave(F.save); w.chicks[C.i] = true; ev.sfx.push('collect'); ev.coins = (ev.coins || 0) + 30;
        puff('💕', new T.Vector3(M.x, groundY(M.x, M.z) + 3.2, M.z), { size: 1.5 });
        const n = CHICKS.filter((_, i) => w.chicks[i]).length;
        if (n >= CHICKS.length) { ev.coins += 300; ev.sfx.push('fanfare'); ev.say = '🐧 Все шесть пингвинят дома! Мама-пингвин счастлива! +300 монет'; F.mamaLabel.userData.set('🐧 Мама-пингвин: все дома! Спасибо!', { color: '#ffffff' }); confetti(new T.Vector3(M.x, groundY(M.x, M.z) + 2, M.z), 100); ev.stat = 'chicks'; }
        else ev.say = `🐧 Пингвинёнок дома! +30 монет<small>нашлось ${n} из ${CHICKS.length} — остальные где-то в долине</small>`;
      }
    } else {                                                            // дома: топчутся вокруг мамы
      const a = t * 0.5 + C.i, tx = M.x + Math.cos(a) * 2.6, tz = M.z + Math.sin(a) * 2.6, dx = tx - q.x, dz = tz - q.z, d = Math.hypot(dx, dz);
      if (d > 0.1) { spd = Math.min(d * 2, 2); q.x += dx / d * spd * dt; q.z += dz / d * spd * dt; C.face = Math.atan2(dx, dz); }
      q.y = groundY(q.x, q.z);
    }
    C.g.rotation.y = C.face; animateAnimal(C.m, dt, spd, { hop: true });
  }
  M.g.rotation.y = Math.atan2(p.x - M.x, p.z - M.z); animateAnimal(M.m, dt, 0);
}
export const chicksFollowing = () => F ? F.chicks.filter(c => c.state === 'follow').length : 0;

// ---------- ❄️ снежная битва ----------
function fort() {
  const o = W.fort, y = groundY(o.x, o.z);
  for (const dx of [-5, 0, 5]) { solid(scene, 3.4, 1.5, 1.2, 0xffffff, o.x + dx, y, o.z - 2); box(scene, 3.4, 0.3, 1.2, 0xf0f6ff, o.x + dx, y + 1.65, o.z - 2); }
  const kids = ['kolya', 'olya'].map((id, i) => {
    const x = o.x + (i ? 2.5 : -2.5), z = o.z - 3.6, g = group(scene, x, y, z); g.userData.dynamic = true;
    const m = buildHero(g, PEOPLE[id]); g.rotation.y = 0;
    const kid = { id, g, m, x, z, up: false, t: 1 + i * 1.3, hits: 0 };
    ballTargets.push({ x, z, r: 0.9, y0: y + 0.5, y1: y + 3.2, on: () => !!F?.battle && kid.up, hit: () => kidHit(kid) });
    return kid;
  });
  const pad = { x: o.x, z: o.z + 7 };
  box(scene, 2.6, 0.08, 1.8, 0x7fd4ff, pad.x, y + 0.05, pad.z, { shadow: false });
  F.fortSt = { o, y, kids, pad, balls: [] };
  F.fortLabel = label('❄️ Снежная битва с Колей и Олей — встань на голубое', o.x, o.z + 4, 3.6, '#ffffff', 8);
}
function kidHit(kid) {
  const B = F.battle; if (!B) return;
  B.me++; kid.up = false; kid.t = 1.5; puff('😆', kid.g.position.clone().setY(F.fortSt.y + 3), { size: 1.4 });
  F.pend = { say: `❄️ Попал! ${B.me} : ${B.them}`, sfx: 'pop' };
}
function updateBattle(dt, hero, ev) {
  const S = F.fortSt, p = hero.pos, onPad = Math.abs(p.x - S.pad.x) < 1.3 && Math.abs(p.z - S.pad.z) < 0.9;
  if (!F.battle) {
    for (const k of S.kids) { k.g.position.y = S.y - 0.9; }              // сидят за стеной, выглядывают макушки
    if (onPad && !F.wasPad) { F.battle = { me: 0, them: 0 }; ev.say = '❄️ Битва! Кидай снежки ❄️ в того, кто выглянет. До пяти попаданий!'; ev.sfx.push('levelUp'); for (const k of S.kids) { k.up = false; k.t = 1 + Math.random() * 2; } }
    F.wasPad = onPad;
  } else {
    const B = F.battle;
    if (Math.hypot(p.x - S.o.x, p.z - S.o.z) > 22) { F.battle = null; ev.say = '❄️ Битва прервана — ты ушёл далеко'; return; }
    for (const k of S.kids) {
      k.t -= dt;
      k.g.position.y += ((k.up ? S.y : S.y - 0.9) - k.g.position.y) * Math.min(1, dt * 10);
      k.g.rotation.y = Math.atan2(p.x - k.x, p.z - k.z);
      if (k.t <= 0) {
        if (!k.up) { k.up = true; k.t = 1.3; }
        else {                                                           // бросок: целится в героя, немного мимо
          const from = new T.Vector3(k.x, S.y + 2.3, k.z + 0.6), tt = 1.1, tx = p.x + (Math.random() - 0.5) * 2.8, tz = p.z + (Math.random() - 0.5) * 2.8;   // мажут примерно через раз
          const v = new T.Vector3((tx - from.x) / tt, (p.y + 1.3 - from.y + 0.5 * 20 * tt * tt) / tt, (tz - from.z) / tt);
          const g = group(scene, from.x, from.y, from.z); g.userData.dynamic = true; box(g, 0.34, 0.34, 0.34, 0xffffff, 0, 0, 0);
          S.balls.push({ g, p: from, v, t: 0 }); k.up = false; k.t = 1.2 + Math.random() * 1.8; ev.sfx.push('jump');
        }
      }
      animateHero(k.m, dt, { speed: 0, maxSpeed: 9, carry: k.up });
    }
    if (F.pend) { ev.say = F.pend.say; ev.sfx.push(F.pend.sfx); F.pend = null; }
    if (B.me >= 5 || B.them >= 5) {
      const win = B.me >= 5; F.battle = null;
      ev.say = win ? `🏆 Победа ${B.me} : ${B.them}! Коля и Оля: «Ты лучший снежкометатель!» +80 монет` : `❄️ Коля и Оля победили ${B.them} : ${B.me}. Ещё разок? Встань на голубое`;
      ev.sfx.push(win ? 'fanfare' : 'nope'); if (win) { ev.coins = 80; ev.friends = ['kolya', 'olya']; ev.stat = 'battles'; confetti(new T.Vector3(p.x, p.y + 2, p.z), 80); }
    }
  }
  // снежки детей
  for (const b of [...S.balls]) {
    b.t += dt; b.v.y -= 20 * dt; b.p.addScaledVector(b.v, dt); b.g.position.copy(b.p);
    const hitHero = Math.hypot(b.p.x - p.x, b.p.z - p.z) < 0.8 && b.p.y > p.y && b.p.y < p.y + 3;
    if (hitHero || b.p.y < groundY(b.p.x, b.p.z) || b.t > 3) {
      puff('❄️', b.p.clone(), { size: 0.9, rise: 0.5, life: 0.5 }); scene.remove(b.g); S.balls.splice(S.balls.indexOf(b), 1);
      if (hitHero && F.battle) { F.battle.them++; ev.hitMe = true; ev.sfx.push('pop'); ev.say = `💥 В тебя попали! ${F.battle.me} : ${F.battle.them}`; }
    }
  }
}

// раз в кадр в Зимней долине. yaw — куда смотрит камера (для головоломок)
export function updateWinterFun(dt, hero, yaw) {
  if (!F) return {};
  const ev = { sfx: [] };
  updatePonds(dt, hero, yaw, ev);
  updateSimon(dt, hero, ev);
  updateFish(dt, hero, ev);
  updateGate(dt, hero, ev);
  updateChicks(dt, hero, ev);
  updateBattle(dt, hero, ev);
  return ev;
}
export const winterFunDebug = () => F;
