// Игры с Елисеем в лесу:
//   догонялки — Елисей убегает, догони за 30 секунд (он чуть медленнее, но петляет);
//   прятки — Елисей прячется у одного из мест рядом, найди за 60 секунд: «горячо 🔥 / тепло 🙂 / холодно ❄️».
import { T, damp, dampAngle } from './engine.js';
import { groundY, nearColliders, onLevelReset } from './world.js';
import { puff } from './fx.js';
import { animateHero } from './hero.js';

const TAG_TIME = 30, HIDE_TIME = 60, R = 32;                       // R — Елисей не убегает дальше этого от своей поляны
const SPOTS = [[18, 70], [30, 34], [-6, 84], [40, 89], [24, 52], [-2, 32]];   // где прячется: у палаток, у гигантского дерева, за колодцем…
let game = null;
onLevelReset(() => { game = null; });                              // ушёл из леса — игра кончилась

// n — Елисей (из friends.js): { g, m, home, busy }
export function startKidGame(kind, n) {
  if (game) return;
  n.busy = true;
  game = { kind, n, t: kind === 'tag' ? TAG_TIME : HIDE_TIME, count: 3, face: n.g.rotation.y };
  if (kind === 'hide') {
    puff('💨', n.g.position.clone().setY(n.g.position.y + 1), { size: 2 });
    const [x, z] = SPOTS[Math.floor(Math.random() * SPOTS.length)];
    game.spot = { x, z }; n.g.visible = false;                       // пока считаешь до трёх — убегает прятаться
  }
}
export const kidGameOn = () => !!game;

// раз в кадр. События: { count, go, win, lose, t, hint } и hud — что показать крупно по центру экрана:
//   { mode: 'count', kind, n } — отсчёт; { mode: 'tag', t } — догонялки; { mode: 'hide', t, heat 0..1, word, trend } — прятки
export function updateKidGame(dt, hero) {
  if (!game) return {};
  const ev = { t: 0 }, n = game.n, q = n.g.position, p = hero.pos;
  // отсчёт: 3, 2, 1 — поехали
  if (game.count > 0) {
    const before = Math.ceil(game.count); game.count -= dt; const now = Math.ceil(game.count);
    ev.hud = { mode: 'count', kind: game.kind, n: Math.max(1, now) };
    if (now !== before || game.counted === undefined) { game.counted = true; if (now > 0) ev.count = now; }
    if (game.count <= 0) {
      ev.go = game.kind; game.refD = null; game.gig = 0.3;
      if (game.kind === 'hide') { q.set(game.spot.x, groundY(game.spot.x, game.spot.z), game.spot.z); n.g.visible = true; n.m.root.scale.y = 0.55; }   // присел за укрытием
    }
    if (game.kind === 'tag') {
      // пока считаешь «3, 2, 1» — Елисей уже убегает: к старту он метрах в десяти
      const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz) || 1, spd = 3.4;
      q.x += dx / d * spd * dt; q.z += dz / d * spd * dt; push(q); q.y = damp(q.y, groundY(q.x, q.z), 12, dt);
      game.face = dampAngle(game.face, Math.atan2(dx, dz), 10, dt); n.g.rotation.y = game.face;
      animateHero(n.m, dt, { speed: spd, maxSpeed: 8 });
    }
    return ev;
  }
  game.t -= dt; ev.t = game.t;
  const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
  if (game.kind === 'tag') {
    // убегает от героя, петляет; у края поляны сворачивает обратно
    let ax = dx / (d || 1), az = dz / (d || 1);
    const zig = Math.sin(performance.now() / 380) * 0.45; [ax, az] = [ax - az * zig, az + ax * zig];
    const hx = n.home.x - q.x, hz = n.home.z - q.z, hd = Math.hypot(hx, hz);
    if (hd > R * 0.75) { const k = (hd - R * 0.75) / (R * 0.25); ax += hx / hd * k * 1.6; az += hz / hd * k * 1.6; }
    const l = Math.hypot(ax, az) || 1, spd = d < 4 ? 7.4 : 6.2;   // герой на 1-м уровне бежит 9 — догнать можно, если не упускать
    q.x += ax / l * spd * dt; q.z += az / l * spd * dt; push(q);
    q.y = damp(q.y, groundY(q.x, q.z), 12, dt);
    game.face = dampAngle(game.face, Math.atan2(ax, az), 10, dt); n.g.rotation.y = game.face;
    animateHero(n.m, dt, { speed: spd, maxSpeed: 8 });
    ev.hud = { mode: 'tag', t: game.t };
    if (game.t < TAG_TIME - 1.5 && d < 1.4 && Math.abs(p.y - q.y) < 2) return end(ev, true);   // первые полторы секунды не ловится
  } else {
    ev.hint = d < 8 ? 'hot' : d < 20 ? 'warm' : 'cold';
    // теплее/холоднее: сравниваем с тем, где был, когда сказали в прошлый раз (шаг — 3 метра)
    if (game.refD === null) game.refD = d;
    if (d < game.refD - 3) { game.refD = d; game.trend = 'warmer'; game.trendT = 2.5; }
    else if (d > game.refD + 3) { game.refD = d; game.trend = 'colder'; game.trendT = 2.5; }
    if ((game.trendT -= dt) <= 0) game.trend = null;
    ev.hud = { mode: 'hide', t: game.t, heat: Math.max(0, Math.min(1, 1 - (d - 2) / 40)), word: ev.hint, trend: game.trend };
    // Елисей хихикает: над укрытием вылетает «🤭» — видно над деревьями; когда времени меньше половины — чаще и крупнее
    if ((game.gig -= dt) <= 0) {
      const late = game.t < HIDE_TIME / 2; game.gig = late ? 2.5 : 5;
      puff('🤭', q.clone().setY(q.y + 3), { size: late ? 2.4 : 1.7, rise: 3, life: 1.8 });
      if (late) puff('✨', q.clone().setY(q.y + 4.5), { size: 1.6, rise: 2.5, life: 1.5 });
      ev.giggle = true;
    }
    animateHero(n.m, dt, { speed: 0, maxSpeed: 8 });
    if (d < 2.6 && Math.abs(p.y - q.y) < 2.5) return end(ev, true);
  }
  if (game.t <= 0) return end(ev, false);
  return ev;
}
// игра кончилась: Елисей прыгает от радости и возвращается на свою поляну
function end(ev, win) {
  const n = game.n, q = n.g.position;
  n.m.root.scale.y = n.m.root.scale.x;
  puff(win ? '🎉' : '😜', q.clone().setY(q.y + 3), { size: 1.6 });
  ev[win ? 'win' : 'lose'] = game.kind;
  const g = game; game = null;
  setTimeout(() => { puff('💨', q.clone().setY(q.y + 1), { size: 1.8 }); q.set(n.home.x, groundY(n.home.x, n.home.z), n.home.z); n.busy = false; g.n.near = true; }, 1500);
  return ev;
}
// не пробегает сквозь деревья и камни
function push(q) {
  const r = 0.4;
  for (const c of nearColliders(q.x - r, q.x + r, q.z - r, q.z + r)) {
    if (c.off || c.ghost || c.y1 <= q.y + 1.05 || c.y0 >= q.y + 2) continue;
    const nx = Math.max(c.x0, Math.min(q.x, c.x1)), nz = Math.max(c.z0, Math.min(q.z, c.z1)), dx = q.x - nx, dz = q.z - nz, d2 = dx * dx + dz * dz;
    if (d2 < r * r && d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; q.x += dx * k; q.z += dz * k; }
  }
}
export function stopKidGame() { if (game) { game.n.busy = false; game.n.g.visible = true; game = null; } }
