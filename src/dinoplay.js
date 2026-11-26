// Долина динозавров 🦖, этап 2 — друзья-динозавры, озеро и игры (строится вместе с Долиной):
//   🍌 Банановые пальмы у озера и 🌿 папоротники на юге — еда. Кормишь бронтозавра (🌿), трицератопса (🌿) и Рекса (🍌 — он вегетарианец!):
//      дружба до 5 ❤️. Полная дружба: бронтозавр катает с шеи в озеро, у трицератопса — золотое седло (в гонке бежит быстрее),
//      Рекс больше не гоняется — отдаёт яйцо сам.
//   🐢 Плезиозавр у мостков — катает по озеру.  🎣 Рыбалка с мостков: клюёт — жми 🎣!
//   🎯 Кольца в небе: полёт на птеродактиле, джойстиком направляешь его в кольца.
//   ⚽ Динобол: забей мяч в ворота динозаврику-вратарю.  🎵 Камни-ксилофон: сыграй песенку — все динозавры танцуют.
//   🙈 Прятки: малыш-динозаврик прячется в кустах, ищи (из нужного куста иногда хихикают 🤭).
import { T, scene, group, box, mat } from './engine.js';
import { solid, addCollider } from './world.js';
import { makeLabel, puff, confetti } from './fx.js';
import { toast } from './ui.js';
import { SFX } from './sfx.js';
import { input } from './input.js';
import { nestsOf } from './eggs.js';
import { buildDino, animateAnimal } from './animals.js';
import { makeBall, stepBall } from './kids.js';
import { passDone, dinoSave } from './dinoquest.js';
import { persist } from './save.js';

const PALMS = [[330, 70], [326, 86], [330, 102], [342, 108]], FERNS = [[306, 0], [315, -12], [304, -21]];
const BRONTO = { x: 354, z: 86 }, TRI = { x: 330, z: 30 }, REX_NEST = { x: 382, z: 32 };
const PIER = { x: 336, z: 84 }, LAKE = { x: 350, z: 84, r: 9.5 };
const FIELD = { x0: 368, x1: 397, z0: 96, z1: 116, gz: 106 }, STONES = { x: 342, z: 66.5 }, BABY = { x: 314, z: 104 };
const BUSHES = [[304, 92], [322, 92], [302, 112], [318, 114], [328, 106], [308, 100], [326, 116], [300, 102]];
export const BUSY2 = [[322, 346, 66, 112], [300, 320, -26, 6], [366, 399, 94, 118], [298, 332, 88, 119]];   // здесь пальмы Долины не сажаем
const FISH = [['🐟', 'Древняя рыбка'], ['🐠', 'Полосатая рыбка'], ['🦐', 'Креветка'], ['🐡', 'Рыба-ёж'], ['🦀', 'Крабик']];
const today = () => new Date().toDateString();
const NOTE_C = [0xff4a4a, 0xffd23f, 0x5fd35f, 0x3fa7ff], NOTE_E = ['🔴', '🟡', '🟢', '🔵'];
const LIKES = { bronto: ['leaf', '🌿', 'Бронтозавр'], tri: ['leaf', '🌿', 'Трицератопс'], rex: ['fruit', '🍌', 'Рекс'] };

let st = null;
const food = save => { const d = dinoSave(save); return d.food || (d.food = { fruit: 0, leaf: 0 }); };
const fr = save => { const d = dinoSave(save); return d.fr || (d.fr = { bronto: 0, tri: 0, rex: 0 }); };
const daily = (save, key) => { const d = dinoSave(save), D = d.daily?.day === today() ? d.daily : (d.daily = { day: today() }); return D[key] = (D[key] || 0) + 1; };   // сколько раз сегодня

// ---------- постройка ----------
export function buildPlay(g, save, triSaddle) {
  st = { g, save, t: 0, palms: [], ferns: [], fish: null, rings: null, plesio: null, bronto: null, hide: null, presses: [], dance: 0, goals: 0, ballCool: 0, triSaddle };
  // банановые пальмы и папоротники
  PALMS.forEach(([x, z]) => {
    const p = group(g, x, 0, z);
    for (let i = 0; i < 6; i++) box(p, 0.6, 1, 0.6, i % 2 ? 0x9a6a3c : 0x8a5a2b, 0, 0.5 + i, 0);
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28, lf = box(p, 3.4, 0.12, 1, 0x3fae3a, Math.cos(a) * 1.5, 6, Math.sin(a) * 1.5); lf.rotation.y = -a; lf.rotation.z = -0.35; }
    const bunch = group(g, x, 5.3, z + 0.6); bunch.userData.dynamic = true;
    for (let k = 0; k < 4; k++) { const b = box(bunch, 0.22, 0.6, 0.22, 0xffd23f, (k - 1.5) * 0.24, 0, 0); b.rotation.z = 0.3; }
    addCollider({ x0: x - 0.4, x1: x + 0.4, z0: z - 0.4, z1: z + 0.4, y0: 0, y1: 6 });
    st.palms.push({ x, z, bunch, ready: 0 });
  });
  FERNS.forEach(([x, z]) => {
    const f = group(g, x, 0, z); f.userData.dynamic = true;
    for (let k = 0; k < 7; k++) { const l = box(f, 2.6, 0.12, 0.7, k % 2 ? 0x3fbe3a : 0x2e9a2e, 0, 0.6, 0); l.rotation.y = k * 0.9; l.rotation.z = 0.45; }
    st.ferns.push({ x, z, g: f, ready: 0 });
  });
  for (const [x, z, t] of [[PALMS[1][0] - 2, PALMS[1][1] - 3, '🍌 Банановые пальмы'], [FERNS[1][0] + 3, FERNS[1][1] + 3, '🌿 Папоротник — для динозавров']]) { const l = makeLabel(5, 1.2); l.position.set(x, 3.4, z); scene.add(l); l.userData.set(t, { color: '#c8ffb0' }); }
  // мостки, плезиозавр
  solid(g, 6, 0.3, 3, 0x9c6a3c, PIER.x + 1, 0, PIER.z, { studs: false });
  for (let i = 0; i < 6; i++) box(g, 0.9, 0.06, 3, i % 2 ? 0xa0703f : 0x8f6234, PIER.x - 1.5 + i, 0.33, PIER.z, { shadow: false });
  const pl = makeLabel(5.4, 1.2); pl.position.set(PIER.x, 3.2, PIER.z + 2.4); scene.add(pl); pl.userData.set('🐢 Плезиозавр · 🎣 Рыбалка', { color: '#ffffff' });
  const ps = group(g, LAKE.x - LAKE.r, 0, LAKE.z); ps.userData.dynamic = true; st.plesioM = plesio(ps); ps.rotation.y = Math.PI;
  st.bobber = box(g, 0.3, 0.3, 0.3, 0xff4a4a, PIER.x + 6.5, 0.2, PIER.z); st.bobber.visible = false;
  // кольца в небе (вдоль полёта птеродактиля; flyPath задаёт dinoland)
  st.ringsG = group(g); st.ringsG.userData.dynamic = true; st.ringsG.visible = false;
  // динобол: поле, ворота, вратарь, мяч
  box(g, FIELD.x1 - FIELD.x0, 0.04, FIELD.z1 - FIELD.z0, 0x7fd85a, (FIELD.x0 + FIELD.x1) / 2, 0.03, (FIELD.z0 + FIELD.z1) / 2, { shadow: false, studs: true });
  for (const [w, d, x, z] of [[FIELD.x1 - FIELD.x0, 0.15, (FIELD.x0 + FIELD.x1) / 2, FIELD.z0], [FIELD.x1 - FIELD.x0, 0.15, (FIELD.x0 + FIELD.x1) / 2, FIELD.z1], [0.15, FIELD.z1 - FIELD.z0, FIELD.x0, (FIELD.z0 + FIELD.z1) / 2], [0.15, FIELD.z1 - FIELD.z0, (FIELD.x0 + FIELD.x1) / 2, (FIELD.z0 + FIELD.z1) / 2]])
    box(g, w, 0.05, d, 0xffffff, x, 0.06, z, { shadow: false });
  for (const sz of [-3.2, 3.2]) solid(g, 0.3, 3, 0.3, 0xffffff, FIELD.x1 - 0.8, 0, FIELD.gz + sz, { studs: false });
  box(g, 0.3, 0.3, 6.7, 0xffffff, FIELD.x1 - 0.8, 3, FIELD.gz); box(g, 0.05, 3, 6.4, 0xdddddd, FIELD.x1 + 0.4, 1.5, FIELD.gz, { shadow: false });
  const kg = group(g, FIELD.x1 - 1.8, 0, FIELD.gz); kg.userData.dynamic = true;
  const km = buildDino(kg, { body: 0xffa040, belly: 0xfff0c8, spikes: 0x3fa7ff }); km.root.scale.setScalar(1.6); kg.rotation.y = -Math.PI / 2; st.keeper = { g: kg, m: km, z: FIELD.gz };
  st.ball = makeBall(g, 0.9, 'beach', FIELD.x0 + 10, FIELD.gz);
  st.fieldLabel = makeLabel(5.4, 1.2); st.fieldLabel.position.set((FIELD.x0 + FIELD.x1) / 2, 4, FIELD.z0); scene.add(st.fieldLabel);
  st.fieldLabel.userData.set('⚽ Динобол — забей вратарю!', { color: '#ffe14d' });
  // камни-ксилофон у озера; песенка — своя на каждый день
  st.stones = NOTE_C.map((c, i) => { const x = STONES.x + i * 4; const s = box(g, 2.2, 0.3, 2.2, c, x, 0.15, STONES.z); s.userData.dynamic = true; return { x, z: STONES.z, m: s, on: false }; });
  let s0 = 11; for (const ch of today()) s0 = (s0 * 31 + ch.charCodeAt(0)) % 2147483647;
  const R = () => { s0 = (s0 * 16807) % 2147483647; return (s0 - 1) / 2147483646; };
  st.melody = [0, 1, 2, 3].sort(() => R() - 0.5);                      // все четыре камня, потом ещё два — своя песенка на каждый день
  st.melody.push(Math.floor(R() * 4), Math.floor(R() * 4));
  const ml = makeLabel(7, 1.4); ml.position.set(STONES.x + 6, 3.2, STONES.z - 1.6); scene.add(ml); ml.userData.set('🎵 Сыграй: ' + st.melody.map(n => NOTE_E[n]).join(''), { color: '#ffffff' });
  // прятки: кусты и малыш
  BUSHES.forEach(([x, z], i) => { box(g, 2.6, 2.2, 2.6, i % 2 ? 0x3fae3a : 0x4cc23a, x, 1.1, z, { studs: true }); box(g, 1.8, 0.8, 1.8, 0x55c43a, x, 2.5, z, { studs: true }); });
  const bg = group(g, BABY.x, 0, BABY.z); bg.userData.dynamic = true;
  const bm = buildDino(bg, { body: 0x8fd14a, belly: 0xe8ffb0, spikes: 0xff7ac8 }); bm.root.scale.setScalar(0.9); st.baby = { g: bg, m: bm };
  const bl = makeLabel(4.6, 1.1); bl.position.set(BABY.x, 2.8, BABY.z); scene.add(bl); bl.userData.set('🙈 Малыш: «Поиграем в прятки?»', { color: '#ffe14d' }); st.babyLabel = bl;
  // Рекс-друг: не гоняется
  if (fr(save).rex >= 5) calmRex();
}
function plesio(root) {
  const C = 0x5fa8c8;
  box(root, 1.8, 0.9, 3, C, 0, 0.4, 0); box(root, 1.4, 0.3, 2.6, 0xd8f0ff, 0, 0.05, 0, { shadow: false });
  const neck = box(root, 0.5, 2.6, 0.5, C, 0, 1.5, 1.6); neck.rotation.x = 0.35;
  const head = group(root, 0, 2.7, 2.2); box(head, 0.8, 0.6, 1.1, C); for (const sx of [-1, 1]) box(head, 0.08, 0.16, 0.16, 0x1a1a1a, sx * 0.41, 0.1, 0.2);
  for (const [sx, sz] of [[-1, 0.8], [1, 0.8], [-1, -0.9], [1, -0.9]]) { const f = box(root, 1.1, 0.12, 0.5, 0x4a90b0, sx * 1.2, 0.2, sz); f.rotation.y = sx * 0.4; }
  box(root, 0.4, 0.4, 1.2, C, 0, 0.35, -2);
  return { root, head };
}
function calmRex() { for (const n of nestsOf('base')) if (n.guard === 'trex') n.calm = true; }
const ringPath = () => st?.flyPath;
export const setFlyPath = c => { if (!st) return; st.flyPath = c; buildRings(); };
function buildRings() {
  const g = st.ringsG; g.clear(); st.ringList = [];
  for (let i = 0; i < 10; i++) {
    const k = 0.08 + i * 0.085, base = st.flyPath.getPointAt(k), t = st.flyPath.getTangentAt(k);
    const ox = [0, 3, -3, 2, -2, 3.5, 0, -3.5, 2.5, 0][i], oy = [0, 1.5, -1, 2, 0, -1.5, 2.5, 1, -1, 0][i];
    const c = base.clone().add(new T.Vector3(-t.z, 0, t.x).normalize().multiplyScalar(ox)).add(new T.Vector3(0, oy - 2.3, 0));
    const r = new T.Mesh(new T.TorusGeometry(1.9, 0.22, 8, 24), new T.MeshBasicMaterial({ color: 0xffa020 }));
    r.position.copy(c); r.lookAt(c.clone().add(t)); g.add(r);
    st.ringList.push({ k, c, m: r, done: 0 });
  }
}

// ---------- кнопки ----------
export function playItems(hero) {
  if (!st) return [];
  const p = hero.pos, out = [];
  if (st.fish && st.fish.phase !== 'off') return [{ id: 'g_dino_fish', icon: '🎣' }];
  if (hero.climb) return [];
  const F = food(st.save);
  if (PALMS.some(([x, z]) => Math.hypot(p.x - x, p.z - z) < 2.6)) out.push({ id: 'g_dino_banana', icon: '🍌' });
  if (FERNS.some(([x, z]) => Math.hypot(p.x - x, p.z - z) < 2.8)) out.push({ id: 'g_dino_leaf', icon: '🌿' });
  const who = feedNear(p); if (who) out.push({ id: 'g_dino_feed', icon: LIKES[who][1], n: F[LIKES[who][0]] || true });
  if (who === 'bronto' && fr(st.save).bronto >= 5) out.push({ id: 'g_dino_neck', icon: '🦕' });
  if (Math.hypot(p.x - PIER.x, p.z - PIER.z) < 3.5 && p.y < 1) out.push({ id: 'g_dino_plesio', icon: '🐢' }, { id: 'g_dino_fish', icon: '🎣' });
  if (Math.hypot(p.x - 318, p.z - 72) < 4.5 && p.y < 4) out.push({ id: 'g_dino_rings', icon: '🎯' });
  if (!st.hide && Math.hypot(p.x - BABY.x, p.z - BABY.z) < 3) out.push({ id: 'g_dino_hide', icon: '🙈' });
  return out;
}
function feedNear(p) {
  if (Math.hypot(p.x - BRONTO.x, p.z - BRONTO.z) < 7) return 'bronto';
  if (Math.hypot(p.x - TRI.x, p.z - TRI.z) < 4.8 && p.y < 3) return 'tri';
  if (Math.hypot(p.x - REX_NEST.x, p.z - REX_NEST.z) < 6) return 'rex';
  return null;
}

export function playUse(act, hero, save) {
  if (!st) return false;
  const p = hero.pos, F = food(save), now = Date.now();
  if (act === 'banana') {
    const P = st.palms.find(o => Math.hypot(p.x - o.x, p.z - o.z) < 2.6); if (!P) return true;
    if (P.ready > now) { toast('🍌 Бананы ещё растут<small>загляни чуть позже</small>'); return true; }
    P.ready = now + 40000; F.fruit++; persist(); SFX.pick(); puff('🍌', new T.Vector3(P.x, 4.5, P.z), { size: 1.2, rise: -1.5, life: 1 });
    toast(`🍌 Банан! Всего: ${F.fruit}<small>Рекс обожает бананы — он вегетарианец 😄</small>`); return true;
  }
  if (act === 'leaf') {
    const L = st.ferns.find(o => Math.hypot(p.x - o.x, p.z - o.z) < 2.8); if (!L) return true;
    if (L.ready > now) { toast('🌿 Папоротник отрастает<small>загляни чуть позже</small>'); return true; }
    L.ready = now + 30000; F.leaf++; persist(); SFX.pick(); puff('🌿', new T.Vector3(L.x, 1.2, L.z), { size: 1.2, rise: 1 });
    toast(`🌿 Папоротник! Всего: ${F.leaf}<small>бронтозавр и трицератопс любят папоротник</small>`); return true;
  }
  if (act === 'feed') {
    const who = feedNear(p); if (!who) return true;
    const [kind, icon, name] = LIKES[who], R = fr(save), d = dinoSave(save);
    if (!(F[kind] > 0)) { SFX.nope(); toast(`${icon} ${name} хочет ${kind === 'leaf' ? 'папоротник 🌿' : 'банан 🍌'}<small>${kind === 'leaf' ? 'папоротники — на юге долины' : 'банановые пальмы — у озера'}</small>`); return true; }
    F[kind]--; SFX.collect(); passDone(save, 'feed');
    const at = who === 'bronto' ? new T.Vector3(BRONTO.x, 10, BRONTO.z + 4) : who === 'tri' ? new T.Vector3(TRI.x, 4, TRI.z) : new T.Vector3(REX_NEST.x - 3.4, 6, REX_NEST.z);
    puff('😋', at, { size: 1.6, rise: 1 });
    d.fed ||= {};
    if (R[who] < 5 && (d.fed[who] || 0) + 60000 < now) {
      d.fed[who] = now; R[who]++; puff('❤️', at.clone().setY(at.y + 1), { size: 1.6, rise: 1.4 });
      if (R[who] >= 5) {
        confetti(at.clone().setY(0), 80); SFX.fanfare(); passDone(save, 'friend');
        toast(who === 'bronto' ? '🦕 Бронтозавр — твой друг! ❤️❤️❤️❤️❤️<small>теперь он катает с шеи прямо в озеро — жми 🦕 рядом с ним</small>'
          : who === 'tri' ? '🦕 Трицератопс — твой друг! ❤️❤️❤️❤️❤️<small>у него золотое седло — в гонке бежит быстрее</small>'
          : '🦖 Рекс — твой друг! ❤️❤️❤️❤️❤️<small>он больше не гоняется — бери яйцо из его гнезда</small>');
        if (who === 'tri') st.triSaddle?.(true); if (who === 'rex') calmRex();
      } else toast(`${icon} ${name}: «Ням-ням!» ❤️ ${R[who]} из 5<small>покормить снова можно через минуту</small>`);
    } else toast(R[who] >= 5 ? `${icon} ${name}: «Ням! Ты мой лучший друг!» 💕` : `${icon} ${name}: «Ням! Я пока сыт» 😊<small>покормить для ❤️ можно раз в минуту</small>`);
    persist(); return true;
  }
  if (act === 'neck' && !hero.climb) {
    const path = new T.CatmullRomCurve3([[352, 1, 83], [354, 5.5, 86], [356, 11, 90], [357, 13.5, 92.5], [353, 9, 88], [347, 4, 82], [342, 0.6, 77]].map(([x, y, z]) => new T.Vector3(x, y, z)));
    hero.climb = { t: 0, dur: 6, sitPose: true, ride: k => path.getPointAt(k).add(new T.Vector3(0, 0.2, 0)), exit: new T.Vector3(-2, 2, -3) };
    st.neck = hero.climb; SFX.whoosh(); toast('🦕 Бронтозавр поднимает тебя на шею… и — вжух в озеро!'); return true;
  }
  if (act === 'plesio' && !hero.climb) {
    hero.climb = st.plesio = { t: 0, dur: 20, sitPose: true, plesio: true, ride: k => { const a = Math.PI + k * Math.PI * 2; return new T.Vector3(LAKE.x + Math.cos(a) * LAKE.r, 1.3, LAKE.z - Math.sin(a) * LAKE.r); } };
    SFX.splash?.(); toast('🐢 Плезиозавр катает по озеру!<small>прыжок — спрыгнуть в воду</small>'); passDone(save, 'plesio'); return true;
  }
  if (act === 'fish') {
    const S = st.fish || (st.fish = { phase: 'off' });
    if (S.phase === 'off') { S.phase = 'wait'; S.t = 2 + Math.random() * 3; st.bobber.visible = true; SFX.swish?.(); toast('🎣 Закинул удочку… ждём, когда клюнет'); }
    else if (S.phase === 'bite') {
      const [e, name] = FISH[Math.floor(Math.random() * FISH.length)], n = daily(save, 'fish'), coins = n <= 5 ? 10 : 0;
      save.coins += coins; S.phase = 'off'; st.bobber.visible = false; SFX.coins(); puff(e, new T.Vector3(PIER.x + 6.5, 1.5, PIER.z), { size: 1.6, rise: 1.6 });
      toast(`${e} Поймал${st.save === save && save ? '' : ''}: ${name}!${coins ? ` +${coins} 🪙` : ''}<small>${coins ? 'рыбку отпускаем обратно 💦' : 'монетки за рыбку — 5 раз в день, а ловить можно сколько хочешь'}</small>`);
      passDone(save, 'fish'); persist();
    } else { S.phase = 'off'; st.bobber.visible = false; toast('🎣 Смотал удочку'); }
    return true;
  }
  if (act === 'rings' && !hero.climb && st.flyPath) {
    const R = st.rings = { ox: 0, oy: 0, last: 0, score: 0 };
    st.ringList.forEach(r => { r.done = 0; r.m.material.color.setHex(0xffa020); r.m.scale.setScalar(1); });
    st.ringsG.visible = true;
    hero.climb = R.climb = { t: 0, dur: 26, ptero: true, rings: true, ride: k => {
      const b = st.flyPath.getPointAt(k), t = st.flyPath.getTangentAt(Math.min(k, 0.999));
      return b.add(new T.Vector3(-t.z, 0, t.x).normalize().multiplyScalar(R.ox)).add(new T.Vector3(0, R.oy - 2.3, 0));
    } };
    SFX.whoosh(); toast('🎯 Кольца! Направляй птеродактиля джойстиком<small>влево-вправо и вверх-вниз — пролети через оранжевые кольца</small>'); return true;
  }
  if (act === 'hide' && !st.hide) {
    const i = Math.floor(Math.random() * BUSHES.length);
    st.hide = { i, t: 60, giggle: 2 }; st.baby.g.visible = false; st.babyLabel.userData.set('🙈 Малыш спрятался! Ищи в кустах', { color: '#ffe14d' });
    puff('💨', new T.Vector3(BABY.x, 1, BABY.z), { size: 1.4 }); SFX.pop(); toast('🙈 «Раз, два, три, четыре, пять — я иду тебя искать!»<small>малыш в одном из кустов — слушай, откуда хихикают 🤭</small>'); return true;
  }
  return false;
}

// ---------- раз в кадр (в Долине). Событие: { dance, save } ----------
export function updatePlay(dt, hero, save) {
  const ev = {};
  if (!st) return ev;
  st.t += dt;
  const p = hero.pos, t = st.t, now = Date.now();
  for (const P of st.palms) P.bunch.visible = P.ready <= now;
  for (const L of st.ferns) L.g.scale.setScalar(L.ready <= now ? 1 : 0.5);
  // плезиозавр плавает у мостков или катает героя
  const PL = st.plesioM.root;                                           // группа самого плезиозавра (не всей Долины!)
  if (st.plesio && hero.climb === st.plesio) { PL.position.set(p.x, 0, p.z); PL.rotation.y = hero.face; if (Math.random() < dt * 3) puff('💦', p.clone().setY(0.3), { size: 0.8, rise: 0.6, life: 0.6 }); }
  else { if (st.plesio) st.plesio = null; PL.position.set(LAKE.x - LAKE.r + Math.sin(t * 0.5) * 0.4, Math.sin(t * 1.5) * 0.1, LAKE.z); }
  st.plesioM.head.rotation.x = Math.sin(t * 1.2) * 0.15;
  // рыбалка
  const S = st.fish;
  if (S && S.phase !== 'off') {
    if (Math.hypot(p.x - PIER.x, p.z - PIER.z) > 5) { S.phase = 'off'; st.bobber.visible = false; }
    else if (S.phase === 'wait') { st.bobber.position.y = 0.2 + Math.sin(t * 3) * 0.05; if ((S.t -= dt) <= 0) { S.phase = 'bite'; S.t = 1.6; SFX.pop(); puff('❗', new T.Vector3(PIER.x + 6.5, 1.4, PIER.z), { size: 1.4, rise: 0.5 }); toast('🎣 Клюёт! Жми 🎣!'); } }
    else if (S.phase === 'bite') { st.bobber.position.y = -0.1 + Math.sin(t * 20) * 0.08; if ((S.t -= dt) <= 0) { S.phase = 'wait'; S.t = 2 + Math.random() * 3; toast('🐟 Сорвалась! Ждём ещё…'); } }
  }
  // бронтозавр: катание с шеи — плюх
  if (st.neck && hero.climb !== st.neck) { if (st.neck.t >= 1) { SFX.splash?.(); for (let i = 0; i < 5; i++) puff('💦', p.clone().add(new T.Vector3((Math.random() - 0.5) * 3, 0.5, (Math.random() - 0.5) * 3)), { size: 1.2, rise: 1.4 }); } st.neck = null; }
  // кольца: джойстик двигает птеродактиля, пролетел кольцо — засчитано
  const R = st.rings;
  if (R) {
    if (hero.climb === R.climb) {
      R.ox = Math.max(-4.5, Math.min(4.5, R.ox + input.move.x * 7 * dt)); R.oy = Math.max(-3.5, Math.min(3.5, R.oy - input.move.y * 7 * dt));
      const k = R.climb.t;
      for (const r of st.ringList) {
        r.m.rotation.z += dt;
        if (!r.done && k >= r.k && R.last < r.k) {
          if (p.distanceTo(r.c) < 2.1) { r.done = 1; R.score++; r.m.material.color.setHex(0x5fd35f); SFX.star(); puff('✨', r.c.clone(), { size: 1.8, rise: 1 }); }
          else { r.done = -1; r.m.material.color.setHex(0x9a9aa0); }
        }
      }
      R.last = k;
    } else {
      const d = dinoSave(save), best = !d.ringsBest || R.score > d.ringsBest; if (best) d.ringsBest = R.score;
      save.coins += R.score * 3; ev.save = true; SFX.fanfare();
      toast(`🎯 Колец: ${R.score} из 10!${best ? ' Новый рекорд 🏆' : ''}<small>+${R.score * 3} монет · для паспорта — 7 колец</small>`);
      if (R.score >= 7) passDone(save, 'rings');
      st.rings = null; st.ringsG.visible = false;
    }
  }
  // динобол
  const B = st.ball;
  stepBall(B, dt, hero, { kick: 15, box: { x0: FIELD.x0, x1: FIELD.x1 + 1, z0: FIELD.z0, z1: FIELD.z1 } });
  const K = st.keeper, q = B.m.position;
  K.z = FIELD.gz + Math.sin(t * 1.1) * 2.3;                            // вратарь ходит туда-сюда — лови момент и бей в пустой угол
  K.g.position.z = K.z; animateAnimal(K.m, dt, 1.5);
  if (q.x > FIELD.x1 - 2.4 && q.x < FIELD.x1 - 1.4 && Math.abs(q.z - K.z) < 1.3 && B.v.x > 0) { B.v.x = -Math.abs(B.v.x) * 0.8; puff('🧤', q.clone().setY(2.4), { size: 1, rise: 0.6 }); SFX.pop(); }
  if (q.x > FIELD.x1 - 0.9 && Math.abs(q.z - FIELD.gz) < 3) {
    st.goals++; confetti(q.clone(), 50); SFX.fanfare(); puff('⚽', q.clone().setY(3), { size: 1.8, rise: 1 });
    q.set(FIELD.x0 + 10, 0.9, FIELD.gz); B.v.set(0, 0, 0);
    st.fieldLabel.userData.set(`⚽ Динобол · голы: ${st.goals}`, { color: '#ffe14d' });
    if (st.goals === 3) { passDone(save, 'football'); if (daily(save, 'goal3') === 1) { save.coins += 30; ev.save = true; } toast('⚽ Три гола! Ты чемпион динобола 🏆<small>+30 монет (раз в день)</small>'); }
    else toast(`⚽ ГОЛ! ${st.goals}`);
  }
  // камни-ксилофон
  for (const [i, s] of st.stones.entries()) {
    const on = Math.abs(p.x - s.x) < 1.2 && Math.abs(p.z - s.z) < 1.2 && p.y < 0.8;
    if (on && !s.on) {
      SFX.note(i); puff('🎵', new T.Vector3(s.x, 1.4, s.z), { size: 1, rise: 1.2, life: 0.9 }); s.m.position.y = 0.05;
      st.presses.push(i); if (st.presses.length > 6) st.presses.shift();
      if (st.presses.length === 6 && st.presses.every((n, j) => n === st.melody[j])) {
        st.presses = []; ev.dance = 8; st.dance = 8; SFX.fanfare(); toast('🎵 Песенка! Все динозавры танцуют 💃🦖');
        if (daily(save, 'music') === 1) { save.coins += 25; ev.save = true; } passDone(save, 'music');
      }
    }
    if (!on) s.m.position.y = 0.15;
    s.on = on;
  }
  if (st.dance > 0) { st.dance -= dt; if (Math.random() < dt * 4) puff('🎵', new T.Vector3(330 + Math.random() * 50, 3 + Math.random() * 2, 20 + Math.random() * 60), { size: 1, rise: 1 }); }
  // прятки
  const H = st.hide;
  if (H) {
    const [bx, bz] = BUSHES[H.i];
    if ((H.giggle -= dt) <= 0) { H.giggle = 4 + Math.random() * 2; puff('🤭', new T.Vector3(bx, 3.4, bz), { size: 1.1, rise: 0.6, life: 1.2 }); }
    H.t -= dt;
    const found = Math.hypot(p.x - bx, p.z - bz) < 2.6;
    if (found || H.t <= 0) {
      st.hide = null; st.baby.g.visible = true; st.baby.g.position.set(bx + 1.8, 0, bz + 1.8);
      puff(found ? '🎉' : '😄', new T.Vector3(bx, 3, bz), { size: 1.6, rise: 1 });
      if (found) { confetti(new T.Vector3(bx, 1, bz), 50); SFX.fanfare(); const n = daily(save, 'hide'); if (n <= 3) save.coins += 20; ev.save = true; toast(`🙈 Нашёл! «Ой, ты меня нашёл!» 😄${n <= 3 ? ' +20 🪙' : ''}<small>поиграть ещё — подойди к малышу</small>`); passDone(save, 'hide'); }
      else toast('🙈 «Я тут! Не нашёл? Давай ещё раз!» 😄');
      st.babyLabel.userData.set('🙈 Малыш: «Ещё разок?»', { color: '#ffe14d' });
      setTimeout(() => { if (st && !st.hide) { st.baby.g.position.set(BABY.x, 0, BABY.z); } }, 4000);
    }
  } else { const b = st.baby.g; b.rotation.y = Math.atan2(p.x - b.position.x, p.z - b.position.z); animateAnimal(st.baby.m, dt, 0); if (st.dance > 0) b.position.y = Math.abs(Math.sin(t * 8)) * 0.6; }
  return ev;
}
export const danceLeft = () => st?.dance || 0;
