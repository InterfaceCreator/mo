// Аквапарк 🎢 — новая часть базы за южной стеной (проход через арку за верстаком).
// Башня с лестницей, наверху три горки — все в большой бассейн:
//   🟢 Спираль — два витка вокруг столба, весело и не страшно;
//   🔵 Труба — длинная, извилистая, над водой; внутри огоньки и секретная монетка (раз в день);
//   🔴 Камикадзе — почти отвесная, внизу трамплин: вылетаешь в бассейн, дальность полёта — на табло (рекорд).
// Встал на цветной коврик у горки — поехал. Нажал прыжок — спрыгнул. В воду — «плюх» с брызгами.
import { T, scene, group, box } from './engine.js';
import { solid, addCollider, onLevelReset } from './world.js';
import { water } from './terrain.js';
import { makeLabel, puff } from './fx.js';
import { DACHA_GATE } from './dacha.js';
import { createLampPost } from './daynight.js';

export const PARK = { x0: -66, x1: 66, z0: 66, z1: 106, gate: { x: 0, w: 12 } };
export const POOL = { x0: -8, x1: 38, z0: 74, z1: 102, floor: -1, surf: -0.25 };
export const TOWER_P = { x: -24, z: 86, h: 14, s: 10 };        // площадка 10×10 на высоте 14
const TOP = TOWER_P.h, TX0 = TOWER_P.x - 5, TX1 = TOWER_P.x + 5, TZ0 = TOWER_P.z - 5, TZ1 = TOWER_P.z + 5;
const V = (x, y, z) => new T.Vector3(x, y, z);

// горки: путь — точки по поверхности; prof — как растёт скорость (0..1 → доля пути); exit — скорость на вылете
const SPIRAL = (() => {
  const c = { x: TOWER_P.x, z: TZ1 + 6 }, r = 5.5, pts = [V(TOWER_P.x, TOP + 0.1, TZ1 - 0.6)];
  for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 4, y = TOP - 0.4 - (TOP - 1.6) * i / 48; pts.push(V(c.x + Math.sin(a) * r, y, c.z - Math.cos(a) * r)); }
  pts.push(V(c.x + 6, 1.1, c.z - r), V(POOL.x0 - 1, 0.8, c.z - r), V(POOL.x0 + 2, 0.5, c.z - r));
  return pts;
})();
const TUBE = [V(TX1 - 0.6, TOP + 0.1, 89), V(TX1 + 2, TOP - 0.6, 89), V(-11, 11.5, 92.5), V(-4, 9.5, 87.5), V(2, 7.8, 92.5), V(8, 6.2, 87.5), V(14, 4.8, 92.5), V(20, 3.4, 87.5), V(26, 2.1, 91), V(31, 1.2, 91), V(34, 0.6, 91)];
const KAMI = [V(TX1 - 0.6, TOP + 0.1, 83.5), V(TX1 + 1.2, TOP - 0.3, 83.5), V(TX1 + 2.6, TOP - 2.2, 83.5), V(-13.5, 3.2, 83.5), V(-12, 1.6, 83.5), V(-10.6, 1.7, 83.5), V(-9.4, 2.5, 83.5)];
export const SLIDES = [
  { id: 'spiral', name: '🟢 Спираль', color: 0x4ad04a, rail: 0xffffff, pts: SPIRAL, dur: 8.5, prof: t => 0.55 * t + 0.45 * t * t, exit: [5, 1.5], pad: V(TOWER_P.x, TOP, TZ1 - 1.6) },
  { id: 'tube', name: '🔵 Труба', color: 0x3fa7ff, rail: 0x2a6ad8, pts: TUBE, dur: 6.5, prof: t => 0.45 * t + 0.55 * t * t, exit: [3, 1.5], tube: true, pad: V(TX1 - 1.6, TOP, 89) },
  { id: 'kami', name: '🔴 Камикадзе', color: 0xff4a4a, rail: 0xffd23f, pts: KAMI, dur: 3.2, prof: t => 0.12 * t + 0.88 * t * t, exit: [15, 8.5], jump: true, pad: V(TX1 - 1.6, TOP, 83.5) },
];

let st = null;
onLevelReset(() => { st = null; mashShow(false); mashCount(''); });

// ---------- кнопка «💨 Жми!» для камикадзе ----------
const razy = n => (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? 'раза' : 'раз';
// сила разгона p (0..1): каждое нажатие добавляет, но сила всё время утекает — жать надо до самого трамплина.
// 4 нажатия в секунду → ~13 м, 7 → ~18 м, 10 → ~22 м, быстрее — ещё дальше (предела нет, но каждый метр всё труднее)
const MASH_ADD = 0.05, MASH_LEAK = 0.8;
let mashEl = null;
function mashUI() {
  if (mashEl) return mashEl;
  const st0 = document.createElement('style');
  st0.textContent = `#mash{position:fixed;left:50%;bottom:calc(165px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:30;display:none;flex-direction:column;align-items:center;gap:8px;touch-action:none;user-select:none;-webkit-user-select:none}
#mash.on{display:flex}#mash .bar{width:200px;height:16px;border-radius:9px;background:rgba(0,0,0,.35);border:2px solid #fff;overflow:hidden}
#mash .bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ffd23f,#ff7b22,#ff3b3b);transition:width .08s}
#mash .n{font:800 18px system-ui,sans-serif;color:#fff;text-shadow:0 2px 3px rgba(0,0,0,.5)}
#mash button{width:132px;height:132px;border-radius:50%;border:5px solid #fff;background:radial-gradient(circle at 35% 30%,#ff8a7a,#ff3b3b 60%,#c41f1f);color:#fff;font:900 24px system-ui,sans-serif;box-shadow:0 6px 0 #8a1010,0 10px 18px rgba(0,0,0,.35);touch-action:none}
#mash.wait button{filter:grayscale(.7) brightness(.9)}
#mashCd{position:fixed;left:50%;top:22%;transform:translateX(-50%);z-index:31;font:900 130px system-ui,sans-serif;color:#ffe14d;-webkit-text-stroke:5px #c41f1f;paint-order:stroke fill;text-shadow:0 8px 0 #8a1010,0 12px 26px rgba(0,0,0,.5);pointer-events:none;display:none}
#mashCd.on{display:block;animation:cdpop .9s ease-out}@keyframes cdpop{0%{transform:translateX(-50%) scale(1.8);opacity:0}25%{transform:translateX(-50%) scale(1);opacity:1}100%{transform:translateX(-50%) scale(.9);opacity:1}}
#mash button.hit{transform:translateY(4px) scale(.94);box-shadow:0 2px 0 #8a1010,0 4px 10px rgba(0,0,0,.35)}`;
  document.head.appendChild(st0);
  mashEl = document.createElement('div'); mashEl.id = 'mash';
  mashEl.innerHTML = '<div class="n">💨 0</div><div class="bar"><i></i></div><button type="button">💨<br>ЖМИ!</button>';
  const btn = mashEl.querySelector('button');
  const hit = e => { e.preventDefault(); e.stopPropagation(); st?.mash?.add(); btn.classList.add('hit'); setTimeout(() => btn.classList.remove('hit'), 70); };
  btn.addEventListener('pointerdown', hit);
  for (const t of ['pointerup', 'pointermove', 'touchstart', 'touchend', 'click']) btn.addEventListener(t, e => { e.stopPropagation(); if (t !== 'pointermove') e.preventDefault(); }, { passive: false });
  document.body.appendChild(mashEl);
  return mashEl;
}
let cdEl = null;
function mashCount(t) {
  if (!cdEl) { cdEl = document.createElement('div'); cdEl.id = 'mashCd'; document.body.appendChild(cdEl); }
  cdEl.classList.remove('on'); if (!t) return;
  cdEl.textContent = t; void cdEl.offsetWidth; cdEl.classList.add('on');
}
function mashShow(on) { if (on) mashUI().classList.add('on'); else mashEl?.classList.remove('on'); }
function mashBar(k, n) { const m = mashUI(); m.querySelector('.bar i').style.width = Math.min(100, k * 180) + '%'; m.querySelector('.n').textContent = k > 0.45 ? `🔥 ${n} — огонь!` : k > 0.33 ? `💥 ${n}` : `💨 ${n}`; }

// кусок горки: брусок от a до b (лежит вдоль отрезка), сдвинут вбок на side и вверх на up
const Y = V(0, 1, 0);
function piece(w, a, b, wd, h, color, side = 0, up = 0) {
  const d = b.clone().sub(a), L = d.length(), r = d.clone().cross(Y).normalize();
  const m = box(w, wd, h, L + 0.05, color, 0, 0, 0, { shadow: true });
  m.position.copy(a).add(b).multiplyScalar(0.5).addScaledVector(r, side).addScaledVector(Y, up);
  m.lookAt(m.position.clone().add(d));
  return m;
}

function buildSlide(w, S) {
  const curve = S.curve = new T.CatmullRomCurve3(S.pts, false, 'centripetal');
  S.len = curve.getLength();
  const n = Math.ceil(S.len / 0.9), P = curve.getSpacedPoints(n);
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[i + 1];
    piece(w, a, b, 1.6, 0.2, S.color, 0, -0.1);                                          // жёлоб
    for (const sd of [-0.85, 0.85]) piece(w, a, b, 0.14, 0.55, S.rail, sd, 0.15);     // бортики
    if (S.tube && i % 2 === 0) {                                                       // труба: арки с огоньками — как туннель
      const c = i % 4 === 0 ? S.rail : S.color, d = b.clone().sub(a), r = d.clone().cross(Y).normalize();
      for (const sd of [-0.95, 0.95]) { const m = piece(w, a, a.clone().addScaledVector(d, 0.45 / d.length()), 0.16, 2.3, c, sd, 1.1); m.castShadow = false; }
      piece(w, a, a.clone().addScaledVector(d, 0.45 / d.length()), 2.06, 0.18, c, 0, 2.3);
      const lamp = box(w, 0.16, 0.16, 0.16, [0xffe14d, 0xff7ac8, 0x7fe8ff][i / 2 % 3], 0, 0, 0, { shadow: false });
      lamp.material = lampMat([0xffe14d, 0xff7ac8, 0x7fe8ff][i / 2 % 3]);
      lamp.position.copy(a).addScaledVector(Y, 2.15).addScaledVector(r, 0.6 * (i % 4 ? 1 : -1));
    }
    // опоры: столбик до земли (или до дна бассейна) каждые ~4 м
    if (i % 5 === 2 && a.y > 1.4) {
      const inPool = a.x > POOL.x0 && a.x < POOL.x1 && a.z > POOL.z0 && a.z < POOL.z1, g = inPool ? POOL.floor : 0;
      if (a.x > TX0 - 0.5 && a.x < TX1 + 0.5 && a.z > TZ0 - 0.5 && a.z < TZ1 + 0.5) continue;      // под площадкой не нужно
      box(w, 0.45, a.y - 0.25 - g, 0.45, 0xd8dde4, a.x, g + (a.y - 0.25 - g) / 2, a.z);
      if (!inPool) addCollider({ x0: a.x - 0.25, x1: a.x + 0.25, y0: 0, y1: a.y - 0.4, z0: a.z - 0.25, z1: a.z + 0.25 });
    }
  }
  // коврик старта на площадке и табличка
  box(w, 1.8, 0.08, 1.8, S.color, S.pad.x, TOP + 0.04, S.pad.z, { shadow: false, studs: true });
  const lb = makeLabel(4.2, 1.05); lb.position.set(S.pad.x, TOP + 3, S.pad.z); scene.add(lb); lb.userData.set(S.name, { color: '#ffffff' });
}
const lampMats = {};
function lampMat(c) { if (!lampMats[c]) { lampMats[c] = new T.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.9 }); lampMats[c].userData.cached = true; } return lampMats[c]; }

export function buildPark(w, save, who) {
  st = { armed: true, fly: null, lastY: 0, coin: null, best: save.park?.best || 0, wasRide: false };
  // земля вокруг бассейна и дно бассейна (глубина по колено — выйти можно шагом)
  const P = PARK, B = POOL, mid = (a, b) => (a + b) / 2;
  solid(w, B.x0 - P.x0, 1, P.z1 - P.z0, 0x5fd84a, mid(P.x0, B.x0), -1, mid(P.z0, P.z1));
  solid(w, P.x1 - B.x1, 1, P.z1 - P.z0, 0x5fd84a, mid(B.x1, P.x1), -1, mid(P.z0, P.z1));
  solid(w, B.x1 - B.x0, 1, B.z0 - P.z0, 0x5fd84a, mid(B.x0, B.x1), -1, mid(P.z0, B.z0));
  solid(w, B.x1 - B.x0, 1, P.z1 - B.z1, 0x5fd84a, mid(B.x0, B.x1), -1, mid(B.z1, P.z1));
  solid(w, B.x1 - B.x0, 1, B.z1 - B.z0, 0x7fd4ff, mid(B.x0, B.x1), B.floor - 1, mid(B.z0, B.z1));      // голубое дно
  // бортик из белой плитки (низкий — перешагнёшь)
  for (const [x0, x1, z0, z1] of [[B.x0 - 1, B.x1 + 1, B.z0 - 1, B.z0], [B.x0 - 1, B.x1 + 1, B.z1, B.z1 + 1], [B.x0 - 1, B.x0, B.z0, B.z1], [B.x1, B.x1 + 1, B.z0, B.z1]])
    box(w, x1 - x0, 0.14, z1 - z0, 0xffffff, mid(x0, x1), 0.07, mid(z0, z1), { studs: true });
  const wt = water(w, B.x1 - B.x0, B.surf, 0x3fb8ff); wt.scale.y = (B.z1 - B.z0) / (B.x1 - B.x0); wt.position.set(mid(B.x0, B.x1), B.surf, mid(B.z0, B.z1));
  // стены парка
  solid(w, 2, 12, P.z1 - P.z0 + 1, 0xb8672a, P.x0, 0, mid(P.z0, P.z1) + 0.5, { cam: true });
  solid(w, 2, 12, P.z1 - P.z0 + 1, 0xb8672a, P.x1, 0, mid(P.z0, P.z1) + 0.5, { cam: true });
  // южная граница парка открыта на дачу (стена убрана, свободный проход по всей ширине)
  const G = DACHA_GATE;
  box(w, 0.22, 2.6, 0.22, 0x6a3f1e, G.x - 2.8, 1.3, P.z1 + 0.5);
  const dl = makeLabel(4.2, 1.05, { face: Math.PI }); dl.position.set(G.x - 2.8, 3.1, P.z1 + 0.5); scene.add(dl); dl.userData.set('🏡 На дачу', { color: '#ffe14d' });
  // дорожка от арки к лестнице
  // дорожка: от аллеи базы (x 0) на запад — мимо лестницы на башню — и вдоль западной стены до калитки на дачу
  solid(w, 42.2, 0.08, 2.4, 0xe9d9a6, -18.1, 0, 68.2, { shadow: false });          // x −39.2…3, z 67…69.4
  solid(w, 2.4, 0.08, P.z1 - 69.4, 0xe9d9a6, -38, 0, (69.4 + P.z1) / 2, { shadow: false });   // x −39.2…−36.8, z 69.4…106 — к калитке

  // Фонари в парке: освещение дорожки к башне и к даче
  createLampPost(w, 2.5, 66.5, 0);                       // у входа в парк справа
  createLampPost(w, -3.5, 66.5, Math.PI);                 // у входа в парк слева
  createLampPost(w, -24, 73, Math.PI / 2);               // у основания лестницы
  createLampPost(w, -36, 88, -Math.PI / 2);              // вдоль западной аллеи к даче
  createLampPost(w, -36, 103, -Math.PI / 2);             // перед калиткой на дачу

  // башня: четыре столба, площадка с бортиком, флажки; лестница с юга
  const T0 = TOWER_P;
  for (const [x, z] of [[TX0 + 0.6, TZ0 + 0.6], [TX1 - 0.6, TZ0 + 0.6], [TX0 + 0.6, TZ1 - 0.6], [TX1 - 0.6, TZ1 - 0.6]]) solid(w, 1.2, TOP - 0.6, 1.2, 0xffd23f, x, 0, z, { studs: false });
  solid(w, 3, TOP - 0.6, 3, 0x9b6bff, T0.x, 0, T0.z, { studs: false });
  solid(w, 10, 0.6, 10, 0x3fa7ff, T0.x, TOP - 0.6, T0.z);
  box(w, 10.4, 0.3, 10.4, 0xff7ac8, T0.x, TOP - 0.75, T0.z, { studs: false });
  // бортик: проёмы — лестница (юг), спираль (север), труба и камикадзе (восток)
  const rail = (x0, x1, z0, z1) => solid(w, Math.max(0.3, x1 - x0), 1.2, Math.max(0.3, z1 - z0), 0xffffff, mid(x0, x1), TOP, mid(z0, z1), { studs: false });
  rail(TX0, T0.x - 1.6, TZ0, TZ0 + 0.3); rail(T0.x + 1.6, TX1, TZ0, TZ0 + 0.3);                 // юг
  rail(TX0, T0.x - 1.2, TZ1 - 0.3, TZ1); rail(T0.x + 1.2, TX1, TZ1 - 0.3, TZ1);                 // север
  rail(TX0, TX0 + 0.3, TZ0, TZ1);                                                                // запад
  rail(TX1 - 0.3, TX1, TZ0, 82.5); rail(TX1 - 0.3, TX1, 84.5, 88); rail(TX1 - 0.3, TX1, 90, TZ1);  // восток
  for (const [x, z, c] of [[TX0 + 0.2, TZ0 + 0.2, 0xff4a4a], [TX1 - 0.2, TZ0 + 0.2, 0xffd23f], [TX0 + 0.2, TZ1 - 0.2, 0x4ad04a], [TX1 - 0.2, TZ1 - 0.2, 0x3fa7ff]]) {
    box(w, 0.15, 3.4, 0.15, 0xffffff, x, TOP + 1.7, z, { shadow: false }); box(w, 0.05, 0.8, 1.3, c, x, TOP + 3, z + 0.65, { shadow: false });
  }
  // лестница: 14 ступенек, от дорожки у арки к площадке
  for (let i = 0; i < TOP; i++) solid(w, 3, i + 1, 0.85, [0xff7ac8, 0xffd23f, 0x7fd4ff, 0x9ce06a][i % 4], T0.x, 0, TZ0 - 0.85 * (TOP - i) + 0.425, { studs: true });
  const tl = makeLabel(7, 1.75); tl.position.set(T0.x, TOP + 10, T0.z); scene.add(tl); tl.userData.set('🎢 Аквапарк', { color: '#ffe14d' });

  for (const S of SLIDES) buildSlide(w, S);
  // секретная монетка — в середине трубы (раз в день)
  const tube = SLIDES[1], today = new Date().toDateString();
  if (save.park?.coinDay !== today) {
    const k = 0.55, p = tube.curve.getPointAt(k), g = group(scene, p.x, p.y + 0.9, p.z); g.userData.dynamic = true;
    const c = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 0.1, 16), new T.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x6a4a00 })); c.rotation.x = Math.PI / 2; g.add(c);
    st.coin = { g, k };
  }
  // поплавки с метрами вдоль полёта с трамплина — видно, куда целиться
  const lip = KAMI[KAMI.length - 1];
  for (let d = 10; d <= 40; d += 5) {
    const x = lip.x + d, c = [0xffd23f, 0xff7b22, 0xff4a4a, 0xff7ac8, 0x9b6bff, 0x3fa7ff, 0x4ad04a][(d - 10) / 5];
    for (const dz of [-2.2, 2.2]) box(w, 0.7, 0.5, 0.7, c, x, POOL.surf + 0.1, lip.z + dz, { shadow: false });
    const ml = makeLabel(2.2, 0.8); ml.position.set(x, 1.3, lip.z - 2.2); scene.add(ml); ml.userData.set(d + ' м', { color: '#ffffff' });
  }
  // табло рекорда у трамплина
  box(w, 0.25, 3.2, 0.25, 0x8a5a2b, -12, 1.6, 79); box(w, 4.4, 1.6, 0.2, 0x2b2b3a, -12, 3.6, 79);
  st.board = makeLabel(4.2, 1.05, { face: Math.PI }); st.board.position.set(-12, 3.6, 78.88); scene.add(st.board);
  st.who = who; showBest();
  // вход в Аквапарк с базы (стены нет): вывеска на столбе у аллеи
  box(w, 0.3, 4.4, 0.3, 0x8a5a2b, 4.2, 2.2, 67); const gl = makeLabel(6, 1.5); gl.position.set(4.2, 5.4, 67); scene.add(gl); gl.userData.set('🎢 Аквапарк', { color: '#ffe14d' });
}
function showBest() { st.board.userData.set(st.best ? `🚀 Рекорд: ${st.best.toFixed(1)} м` : '🚀 Рекорд: прыгни!', { color: '#ffe14d' }); }

function startSlide(S, hero, ev) {
  const curve = S.curve, [fw, up] = S.exit;
  hero.climb = { park: S.id, t: 0, dur: S.dur, coast: true, ride: k => curve.getPointAt(Math.min(1, S.prof(k))).add(new T.Vector3(0, 0.38, 0)) };
  const tg = curve.getTangentAt(1); hero.climb.exit = V(tg.x * fw, up, tg.z * fw);
  // камикадзе: жмёшь кнопку 💨 (или прыжок) — разгоняешься; чем больше нажатий, тем дальше полетишь
  if (S.jump) {
    const cl = hero.climb, base = cl.exit.clone();
    st.mash = { n: 0, taps: 0, p: 0,
      add() { if (hero.climb !== cl) return; this.n++; this.taps++; this.p += MASH_ADD * (1 - this.p); this.apply(); },
      apply() { const k = this.p; cl.exit.set(base.x * (1 + 3 * k), base.y + 13 * k, base.z * (1 + 3 * k)); mashBar(k, this.n); } };
    cl.onJump = () => st.mash?.add();
    mashShow(true); mashBar(0, 0);
  }
  ev.sfx.push('whoosh');
  if (!S.jump) ev.say = `${S.name} — поехали!<small>нажми прыжок — спрыгнешь</small>`;
}
const inPool = p => p.x > POOL.x0 && p.x < POOL.x1 && p.z > POOL.z0 && p.z < POOL.z1;
function splash(p, big) {
  const n = big ? 9 : 3;
  for (let i = 0; i < n; i++) puff(i % 3 ? '💦' : '💧', V(p.x + (Math.random() - 0.5) * (big ? 3 : 1.2), POOL.surf + 0.4 + Math.random() * (big ? 1.6 : 0.5), p.z + (Math.random() - 0.5) * (big ? 3 : 1.2)), { size: big ? 1.3 : 0.8, rise: big ? 1.8 : 0.8, life: 0.9 });
}

// раз в кадр. События: { sfx: [], say, coins, record }
export function updatePark(dt, hero, save) {
  if (!st) return {};
  const ev = { sfx: [] }, p = hero.pos, c = hero.climb;
  if (st.coin) st.coin.g.rotation.y += dt * 3;
  // едем по горке: поза «сидя», монетка в трубе
  const riding = c?.park;
  hero.slide = !!riding;
  if (riding && st.coin && riding === 'tube' && c.t > 0 && SLIDES[1].prof(c.t) >= st.coin.k - 0.02) {
    scene.remove(st.coin.g); st.coin = null;
    (save.park ||= {}).coinDay = new Date().toDateString();
    ev.coins = 30; ev.sfx.push('coins'); ev.say = '🪙 Секретная монетка в трубе! +30';
    puff('✨', p.clone().setY(p.y + 1.5), { size: 1.4 });
  }
  // отсчёт перед камикадзе: 3, 2, 1, ЖМИ!
  if (st.count) {
    const C = st.count;
    if (c?.park !== 'ready') { st.count = null; mashCount(''); mashShow(false); mashUI().classList.remove('wait'); }      // спрыгнул/телепорт — отмена
    else {
      C.t -= dt; const n = Math.ceil(C.t);
      if (n !== C.shown && n > 0) { C.shown = n; mashCount(String(n)); ev.sfx.push('pop'); }
      if (C.t <= 0) { st.count = null; mashCount('ЖМИ!'); setTimeout(() => mashCount(''), 700); mashUI().classList.remove('wait'); startSlide(C.S, hero, ev); }
    }
  }
  // камикадзе: кнопка «Жми!» видна, пока едешь; нажатия — щелчки
  if (st.mash) {
    if (st.mash.taps) { ev.sfx.push('tap'); st.mash.taps = 0; }
    const rk = hero.climb?.park;                                       // (после отсчёта горка могла начаться в этом же кадре)
    if (rk === 'kami') { st.mash.p -= MASH_LEAK * st.mash.p * dt; st.mash.apply(); }   // сила утекает
    else { st.lastMash = st.mash.n; mashShow(false); st.mash = null; }
  }
  // слезли с камикадзе на трамплине — летим, меряем дальность
  if (st.wasRide === 'kami' && !riding) st.fly = { x: p.x, z: p.z, t: 0 };
  st.wasRide = riding || false;
  // встал на коврик старта — поехали
  if (!c && hero.grounded && !hero.fly && !hero.passenger) {
    const S = SLIDES.find(S => Math.abs(p.x - S.pad.x) < 0.9 && Math.abs(p.z - S.pad.z) < 0.9 && Math.abs(p.y - TOP) < 0.5);
    if (S && st.armed) {
      st.armed = false;
      if (S.jump) {                                           // камикадзе: сначала отсчёт 3-2-1 — приготовить палец к кнопке
        const at = S.curve.getPointAt(0).add(V(0, 0.38, 0));
        hero.climb = { park: 'ready', t: 0, dur: 1e6, face: Math.PI / 2, ride: () => at.clone(), onJump() {} };
        st.count = { S, t: 3, shown: 3 }; mashCount('3'); ev.sfx.push('pop');
        mashShow(true); mashBar(0, 0); mashUI().classList.add('wait');
        ev.say = '🔴 Камикадзе! Приготовься жать 💨<small>чем быстрее жмёшь — тем дальше улетишь</small>';
      } else startSlide(S, hero, ev);
    }
    if (!S) st.armed = true;
  }
  // полёт с трамплина: приземлился — считаем метры
  if (st.fly) {
    st.fly.t += dt;
    const done = hero.grounded || (inPool(p) && p.y < POOL.surf + 0.1) || st.fly.t > 4;
    if (done) {
      const d = Math.hypot(p.x - st.fly.x, p.z - st.fly.z);
      if (inPool(p) && d > 1) {
        const rec = d > st.best;
        const taps = st.lastMash ? ` · 💨 ×${st.lastMash}` : '';
        ev.say = rec ? `🚀 ${d.toFixed(1)} м — новый рекорд! 🏆<small>нажал 💨 ${st.lastMash || 0} ${razy(st.lastMash || 0)}</small>` : `🚀 Полёт: ${d.toFixed(1)} м${taps}<small>рекорд — ${st.best.toFixed(1)} м. Жми ещё быстрее!</small>`;
        if (rec) { st.best = d; (save.park ||= {}).best = +d.toFixed(1); showBest(); ev.record = true; ev.sfx.push('fanfare'); }
      }
      st.fly = null;
    }
  }
  // плюх: вошёл в воду сверху
  if (inPool(p) && p.y < POOL.surf + 0.05 && st.lastY >= POOL.surf + 0.05 && !riding) {
    const big = hero.vel.y < -6 || st.lastY - p.y > 0.25;
    splash(p, big); if (big) ev.sfx.push('splash');
  }
  st.lastY = p.y;
  hero.swim = inPool(p) && p.y < POOL.surf - 0.3 && !hero.climb && !hero.fly;   // в воде — плывёт (поза в animateHero)
  return ev;
}
