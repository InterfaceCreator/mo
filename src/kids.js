// Дети — ровесники Моти, у каждого своя игра. Подойди — позовёт играть:
//   Соня (база) — мячики наперегонки; Коля и Оля (база) — футбол: забей Коле 3 гола;
//   Алиса (Осень) — кормим уток желудями; Тимур (Осень) — тыквенный боулинг;
//   Маша (Лес) — «повтори за мной» на цветных плитах; Петя (Дорожка) — челнок до флажка наперегонки.
// Тут же — общие мячи: катятся, подпрыгивают, отскакивают от стен; толкнул — полетел.
import { T, scene, group, box, mat, clamp, damp, dampAngle } from './engine.js';
import { groundY, solid, nearColliders, onLevelReset, PEN } from './world.js';
import { buildBird } from './animals.js';
import { animateHero } from './hero.js';
import { nodeOf } from './friends.js';
import { AUTUMN } from './autumn.js';
import { puff, confetti, sprite, emojiTex, arc, makeLabel } from './fx.js';

// ---------- мячи ----------
const SPHERE = new T.SphereGeometry(1, 18, 12); SPHERE.userData.cached = true;
const tmpQ = new T.Quaternion(), AX = new T.Vector3();
function canvasMat(draw) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; draw(cv.getContext('2d'));
  const m = new T.MeshLambertMaterial({ map: new T.CanvasTexture(cv) }); m.userData.cached = true; return m;
}
let mats = null;
const M = () => mats || (mats = {
  // надувной мяч: полоски от полюса до полюса
  beach: canvasMat(c => ['#ff5a5a', '#ffffff', '#ffd23f', '#3fa7ff', '#ffffff', '#5fd35f'].forEach((f, i) => { c.fillStyle = f; c.fillRect(i * 128 / 6, 0, 128 / 6 + 1, 64); })),
  // футбольный: белый в чёрных пятнах
  foot: canvasMat(c => { c.fillStyle = '#fff'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#1d1d23'; for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) { c.beginPath(); c.arc(i * 16 + (j % 2) * 8 + 4, 10 + j * 22, 5, 0, 7); c.fill(); } }),
  pumpkin: canvasMat(c => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ff8a1a' : '#f07a10'; c.fillRect(i * 16, 0, 17, 64); } }),
});
export function makeBall(parent, r, kind, x, z) {
  const m = new T.Mesh(SPHERE, typeof kind === 'string' ? M()[kind] : mat(kind)); m.scale.setScalar(r); m.castShadow = true;
  m.position.set(x, groundY(x, z) + r, z); parent.add(m);
  return { m, r, v: new T.Vector3(), cool: 0, home: { x, z } };
}
// раз в кадр: катится, прыгает, отскакивает. o: { kick — сила толчка (0 — не толкается), lift, friction, bounce, box: {x0,x1,z0,z1} }
// Вернёт true, если герой только что толкнул
export function stepBall(b, dt, hero, o = {}) {
  const q = b.m.position, v = b.v, p = hero.pos; let kicked = false;
  b.cool -= dt;
  if (o.kick && b.cool <= 0) {
    const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
    if (d < b.r + 0.55 && q.y - b.r < p.y + 1.7 && q.y + b.r > p.y - 0.2) {
      // летит от героя — и туда, куда он бежал
      let ax = dx / (d || 1), az = dz / (d || 1); const hv = Math.hypot(hero.vel.x, hero.vel.z);
      if (hv > 1) { ax += hero.vel.x / hv; az += hero.vel.z / hv; const l = Math.hypot(ax, az) || 1; ax /= l; az /= l; }
      const sp = clamp(hv * 1.4 + 3, o.kick * 0.6, o.kick);
      v.set(ax * sp, o.lift ?? 3, az * sp); b.cool = 0.25; kicked = true;
    }
  }
  v.y -= 22 * dt;
  q.x += v.x * dt; q.z += v.z * dt; q.y += v.y * dt;
  const gy = groundY(q.x, q.z) + b.r;
  if (q.y <= gy) {
    q.y = gy; v.y = v.y < -3 ? -v.y * (o.bounce ?? 0.45) : 0;
    const f = Math.exp(-(o.friction ?? 1.1) * dt); v.x *= f; v.z *= f;
  }
  // стены, столбы, заборы
  for (const c of nearColliders(q.x - b.r, q.x + b.r, q.z - b.r, q.z + b.r)) {
    if (c.off || c.ghost || c.y1 <= q.y - b.r + 0.25 || c.y0 >= q.y + b.r) continue;
    const nx = clamp(q.x, c.x0, c.x1), nz = clamp(q.z, c.z0, c.z1), ex = q.x - nx, ez = q.z - nz, d2 = ex * ex + ez * ez;
    if (d2 >= b.r * b.r || d2 < 1e-8) continue;
    const d = Math.sqrt(d2); q.x += ex / d * (b.r - d); q.z += ez / d * (b.r - d);
    const vn = (v.x * ex + v.z * ez) / d; if (vn < 0) { v.x -= 1.7 * vn * ex / d; v.z -= 1.7 * vn * ez / d; }
  }
  const B = o.box;
  if (B) {
    if (q.x < B.x0 + b.r) { q.x = B.x0 + b.r; v.x = Math.abs(v.x) * 0.7; } if (q.x > B.x1 - b.r) { q.x = B.x1 - b.r; v.x = -Math.abs(v.x) * 0.7; }
    if (q.z < B.z0 + b.r) { q.z = B.z0 + b.r; v.z = Math.abs(v.z) * 0.7; } if (q.z > B.z1 - b.r) { q.z = B.z1 - b.r; v.z = -Math.abs(v.z) * 0.7; }
  }
  // катится — значит вертится
  const sp = Math.hypot(v.x, v.z);
  if (sp > 0.05) { AX.set(v.z, 0, -v.x).normalize(); tmpQ.setFromAxisAngle(AX, sp * dt / b.r); b.m.quaternion.premultiply(tmpQ); }
  return kicked;
}
const placeBall = (b, x, z) => { b.m.position.set(x, groundY(x, z) + b.r + 0.5, z); b.v.set(0, 0, 0); };

// ---------- дети бегают сами ----------
// не пробегают сквозь деревья и стены
function push(q) {
  const r = 0.4;
  for (const c of nearColliders(q.x - r, q.x + r, q.z - r, q.z + r)) {
    if (c.off || c.ghost || c.y1 <= q.y + 1.05 || c.y0 >= q.y + 2) continue;
    const nx = clamp(q.x, c.x0, c.x1), nz = clamp(q.z, c.z0, c.z1), dx = q.x - nx, dz = q.z - nz, d2 = dx * dx + dz * dz;
    if (d2 < r * r && d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; q.x += dx * k; q.z += dz * k; }
  }
}
// бежит к точке; вернёт, сколько осталось
function run(n, tx, tz, spd, dt) {
  const q = n.g.position, dx = tx - q.x, dz = tz - q.z, d = Math.hypot(dx, dz), s = Math.min(spd, d / Math.max(dt, 1e-3));
  if (d > 0.05 && spd > 0) { q.x += dx / d * s * dt; q.z += dz / d * s * dt; push(q); n.face = dampAngle(n.face, Math.atan2(dx, dz), 10, dt); }
  n.g.rotation.y = n.face;
  q.y = damp(q.y, groundY(q.x, q.z), 12, dt);
  animateHero(n.m, dt, { speed: d > 0.05 ? s : 0, maxSpeed: 8 });
  return d;
}
const look = (n, x, z, dt) => { n.face = dampAngle(n.face, Math.atan2(x - n.g.position.x, z - n.g.position.z), 8, dt); n.g.rotation.y = n.face; animateHero(n.m, dt, { speed: 0, maxSpeed: 8 }); };

// ---------- места для игр: строятся вместе с локацией ----------
let st = {};
let game = null;
onLevelReset(() => { st = {}; game = null; });

const FIELD = { x0: -44, x1: -26.5, z0: 3.5, z1: 14.5, z: 9, goalW: 7, goalH: 3.2 };     // футбольное поле в юго-западном углу базы; ворота — у восточного края
const KICKOFF = FIELD.x1 - 6;                                                   // откуда начинается розыгрыш
const FAR = -3, NEAR = 5;                                                       // челнок на Дорожке: флажок и старт
const PLATE_C = { x: -33, z: 54 }, PLATES = [[-2.4, -2.4, 0xff4a4a, '🔴'], [2.4, -2.4, 0xffd23f, '🟡'], [-2.4, 2.4, 0x4ad04a, '🟢'], [2.4, 2.4, 0x3f8fff, '🔵']];

export function buildKids(loc, w) {
  const P = w || scene;
  if (loc === 'base') {
    // футбольное поле: травка посветлее, белая разметка, ворота с сеткой
    const F = FIELD, cx = (F.x0 + F.x1) / 2, L = F.x1 - F.x0, D = F.z1 - F.z0;
    box(P, L, 0.04, D, 0x9fe88a, cx, 0.02, F.z, { shadow: false });
    for (const [w2, d2, x, z] of [[L, 0.15, cx, F.z0], [L, 0.15, cx, F.z1], [0.15, D, F.x0, F.z], [0.15, D, F.x1, F.z], [0.15, D, cx, F.z]]) box(P, w2, 0.06, d2, 0xffffff, x, 0.04, z, { shadow: false });
    for (const s of [-1, 1]) solid(P, 0.3, F.goalH, 0.3, 0xffffff, F.x1, 0, F.z + s * F.goalW / 2, { studs: false });
    box(P, 0.3, 0.3, F.goalW + 0.3, 0xffffff, F.x1, F.goalH, F.z);
    const net = new T.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }); net.userData.cached = true;
    for (const [w2, d2, x, z] of [[0.08, F.goalW, F.x1 + 1.3, F.z], [1.3, 0.08, F.x1 + 0.65, F.z - F.goalW / 2], [1.3, 0.08, F.x1 + 0.65, F.z + F.goalW / 2]]) {
      const m = new T.Mesh(new T.BoxGeometry(w2, F.goalH, d2), net); m.position.set(x, F.goalH / 2, z); scene.add(m);
      solid(P, w2, F.goalH, d2, 0xffffff, x, 0, z).visible = false;
    }
    st.ball = makeBall(scene, 0.45, 'foot', KICKOFF, F.z);
    st.goalT = 0;
  }
  if (loc === 'autumn') {
    // тыквенный боулинг: дорожка с бортиками, 6 кеглей треугольником, тыква на старте
    const L = AUTUMN.bowl, z = (L.z0 + L.z1) / 2, y = groundY((L.x0 + L.x1) / 2, z), cx = (L.x0 + L.x1) / 2;
    box(P, L.x1 - L.x0, 0.1, 3.2, 0xd9a066, cx, y + 0.05, z, { shadow: false });
    for (const s of [-1, 1]) solid(P, L.x1 - L.x0, 0.35, 0.3, 0xff7b22, cx, y, z + s * 1.75, { studs: false });
    solid(P, 0.4, 0.8, 3.8, 0x8a5a2b, L.x1 + 0.2, y, z, { studs: false });
    box(P, 0.2, 0.12, 3.2, 0xffffff, L.x0 + 4.5, y + 0.11, z, { shadow: false });
    const lab = makeLabel(5.5, 1.4); lab.position.set(L.x1 - 4, y + 3.2, z); scene.add(lab); lab.userData.set('🎳 Боулинг', { color: '#ffffff' });
    const pins = [];
    for (const [dx, dz] of [[0, 0], [0.75, -0.45], [0.75, 0.45], [1.5, -0.9], [1.5, 0], [1.5, 0.9]]) {
      const g = group(scene, L.x1 - 5.5 + dx, y + 0.1, z + dz);
      box(g, 0.32, 0.9, 0.32, 0xffffff, 0, 0.45, 0); box(g, 0.34, 0.12, 0.34, 0xe2442a, 0, 0.7, 0); box(g, 0.24, 0.24, 0.24, 0xffffff, 0, 1.0, 0);
      pins.push({ g, x: g.position.x, z: g.position.z, down: false, fall: 0, axis: new T.Vector3(0, 0, 1) });
    }
    const ball = makeBall(scene, 0.55, 'pumpkin', L.x0 + 3, z); box(ball.m, 0.15, 0.4, 0.15, 0x3a6a1a, 0, 1.05, 0);
    st.bowl = { pins, ball, y, z, x0: L.x0, x1: L.x1, start: L.x0 + 3 };
  }
  if (loc === 'forest') {
    // четыре цветные плиты перед Машей
    const y = groundY(PLATE_C.x, PLATE_C.z);
    st.plates = PLATES.map(([dx, dz, c, e], i) => {
      const m = new T.Mesh(new T.BoxGeometry(2, 0.2, 2), new T.MeshLambertMaterial({ color: c, emissive: 0 }));
      m.position.set(PLATE_C.x + dx, y + 0.1, PLATE_C.z + dz); m.receiveShadow = true; scene.add(m);
      return { m, i, x: m.position.x, z: m.position.z, y: y + 0.2, c: new T.Color(c), e, glow: 0 };
    });
  }
  if (loc === 'track') {
    // челнок: стартовая черта и два флажка — твой и Петин
    box(P, 9, 0.04, 0.3, 0xffffff, -2.5, 0.03, NEAR, { shadow: false });
    box(P, 9, 0.04, 0.3, 0xffe14d, -2.5, 0.03, FAR, { shadow: false });
    for (const [x, c] of [[-1.5, 0xff3b3b], [-5.5, 0x3fa7ff]]) { box(P, 0.12, 2.4, 0.12, 0xffffff, x, 1.2, FAR - 0.5); box(P, 0.9, 0.6, 0.06, c, x + 0.5, 2.05, FAR - 0.5); }
  }
}

// футбольный мяч на базе можно пинать и без игры; забил — «ГОЛ!»
export function updateKidSpots(dt, hero) {
  const ev = {};
  if (st.ball && game?.kind !== 'football') {
    if (stepBall(st.ball, dt, hero, { kick: 13, lift: 2.5, friction: 0.6, box: { x0: -45, x1: 45, z0: -3, z1: 63 } })) { ev.sfx = 'kick'; aim(st.ball); }
    if (goal(st.ball)) { puff('⚽', st.ball.m.position.clone().setY(3), { size: 2 }); ev.goal = true; setTimeout(() => st.ball && placeBall(st.ball, KICKOFF, FIELD.z), 1200); }
  }
  return ev;
}
// подсказка прицела: пнул примерно в сторону ворот — мяч сам подворачивает в створ (детям так легче попасть)
function aim(b) {
  const F = FIELD, q = b.m.position, v = b.v, sp = Math.hypot(v.x, v.z); if (v.x <= 0 || sp < 1) return;
  const gx = F.x1 + 0.5 - q.x, gz = clamp(q.z, F.z - F.goalW / 2 + 1, F.z + F.goalW / 2 - 1) - q.z, gl = Math.hypot(gx, gz);
  if (gl > 22 || (v.x * gx + v.z * gz) / (sp * gl) < 0.3) return;                                     // пнул совсем не туда — не помогаем
  const ax = v.x / sp * 0.35 + gx / gl * 0.65, az = v.z / sp * 0.35 + gz / gl * 0.65, l = Math.hypot(ax, az);
  v.x = ax / l * sp; v.z = az / l * sp;
}
// мяч в воротах?
function goal(b) {
  const q = b.m.position, F = FIELD;
  const inside = q.x > F.x1 && Math.abs(q.z - F.z) < F.goalW / 2 - b.r * 0.5 && q.y < F.goalH;
  if (inside && !b.inGoal) { b.inGoal = true; return true; }
  if (!inside) b.inGoal = false;
  return false;
}

// ---------- игры ----------
const rnd = (a, b) => a + Math.random() * (b - a);
const bump = (n, emoji) => puff(emoji, n.g.position.clone().setY(n.g.position.y + 2.8), { size: 1.2 });

const GAMES = {
  // Соня: 12 мячиков по базе — кто первый соберёт 6
  balls: {
    kids: ['sonya'], time: 70, title: '🔴 Мячики наперегонки!', rules: 'кто первый соберёт 6 мячиков — ты или Соня?',
    start(g) {
      g.mine = g.hers = 0; g.balls = [];
      const h = g.kids[0].home, cols = [0xff4a4a, 0xffd23f, 0x4ad04a, 0x3f8fff, 0xff7ac8, 0x9b6bff];
      for (let i = 0; i < 400 && g.balls.length < 12; i++) {
        const x = h.x + rnd(-26, 26), z = h.z + rnd(-30, 10);
        if (Math.abs(x) > 42 || z < 3 || z > 62 || Math.hypot(x - h.x, z - h.z) < 5) continue;
        if ([PEN, { x0: 8, x1: 30, z0: 16, z1: 40 }].some(R => x > R.x0 - 2 && x < R.x1 + 2 && z > R.z0 - 2 && z < R.z1 + 2)) continue;   // не за заборами загонов
        if (nearColliders(x - 1, x + 1, z - 1, z + 1).some(c => !c.off && c.y1 > 0.2 && c.y0 < 3 && x > c.x0 - 1 && x < c.x1 + 1 && z > c.z0 - 1 && z < c.z1 + 1)) continue;
        if (g.balls.some(b => Math.hypot(b.x - x, b.z - z) < 4)) continue;
        const m = new T.Mesh(SPHERE, mat(cols[g.balls.length % cols.length])); m.scale.setScalar(0.45); m.position.set(x, groundY(x, z) + 0.6, z); scene.add(m);
        g.balls.push({ m, x, z, y: groundY(x, z), on: true });
        puff('✨', m.position.clone().setY(m.position.y + 1), { size: 0.9 });
      }
    },
    step(g, dt, hero, ev) {
      const S = g.kids[0], p = hero.pos, t = performance.now() / 1000;
      const take = b => { b.on = false; scene.remove(b.m); };
      for (const b of g.balls) if (b.on) {
        b.m.position.y = b.y + 0.6 + Math.sin(t * 3 + b.x) * 0.15;
        if (Math.hypot(p.x - b.x, p.z - b.z) < 1.4 && Math.abs(p.y - b.y) < 2) { take(b); g.mine++; ev.sfx.push('collect'); puff('⭐', b.m.position.clone().setY(b.y + 2), { size: 1.2 }); }
      }
      if (g.aim && !g.aim.on) g.aim = null;
      if (!g.aim) { let best = 1e9; for (const b of g.balls) if (b.on) { const d = Math.hypot(b.x - S.g.position.x, b.z - S.g.position.z); if (d < best) { best = d; g.aim = b; } } }
      if (g.aim) { if (run(S, g.aim.x, g.aim.z, 5.6, dt) < 1) { take(g.aim); g.hers++; ev.sfx.push('pop'); bump(S, '🔴'); g.aim = null; } }
      else look(S, p.x, p.z, dt);
      g.status = `ты ${g.mine} · Соня ${g.hers} — до 6`;
      if (g.mine >= 6) return 'win';
      if (g.hers >= 6) return 'lose';
      if (!g.balls.some(b => b.on)) return g.mine > g.hers ? 'win' : 'lose';
    },
    timeout: g => g.mine > g.hers ? 'win' : 'lose',
    end(g) { for (const b of g.balls) if (b.on) scene.remove(b.m); },
    win: '🎉 Соня: Ты быстрее меня! Давай ещё?', lose: '😜 Соня: Я первая! Подойди — сыграем ещё!',
  },

  // Коля на воротах, Оля отбирает мяч. Забей 3 гола
  football: {
    kids: ['kolya', 'olya'], time: 90, title: '⚽ Футбол!', rules: 'забей Коле 3 гола — Оля будет отбирать мяч',
    start(g) { g.goals = 0; g.pause = 0; g.ocool = 0; g.shots = 0; g.catch = false; placeBall(st.ball, KICKOFF - 1, FIELD.z); },
    step(g, dt, hero, ev) {
      const F = FIELD, b = st.ball, q = b.m.position, [K, O] = g.kids;
      if (g.pause > 0) {
        if ((g.pause -= dt) <= 0) { placeBall(b, KICKOFF - 1, F.z); O.g.position.set(KICKOFF - 5, 0, F.z); }
        look(K, q.x, q.z, dt); look(O, hero.pos.x, hero.pos.z, dt);
      } else {
        // каждый удар Коля ловит не всегда — примерно 4 из 10 (первый удар — гол почти наверняка)
        if (stepBall(b, dt, hero, { kick: 13, lift: 2.5, friction: 0.6, box: { x0: F.x0 - 1, x1: F.x1 + 1.4, z0: F.z0 - 1, z1: F.z1 + 1 } })) { ev.sfx.push('kick'); aim(b); g.catch = Math.random() < (g.shots++ ? 0.4 : 0.1); }
        // Коля ходит в воротах за мячом
        const kz = q.x > F.x1 - 9 ? clamp(q.z, F.z - 1.2, F.z + 1.2) : F.z;
        if (run(K, F.x1 - 0.9, kz, 2.6, dt) < 0.1) look(K, q.x, q.z, dt);
        if (g.catch && Math.hypot(q.x - K.g.position.x, q.z - K.g.position.z) < 0.85 + b.r && q.y < 2.2 && b.v.x > -1) {
          g.catch = false;
          b.v.set(-Math.abs(b.v.x) * 0.6 - 4, 3, rnd(-3, 3)); ev.sfx.push('kick'); bump(K, '🧤'); ev.say = '🧤 Коля: Поймал! Бей ещё!';
        }
        // Оля бежит к мячу и выбивает его назад, к середине поля
        g.ocool -= dt;
        const od = run(O, q.x + 0.7, q.z, g.ocool > 0 ? 1.5 : 3.6, dt);
        if (od < 0.5 + b.r && g.ocool <= 0) { b.v.set(rnd(-9, -6), 3, rnd(-3, 3)); g.ocool = 1.6; ev.sfx.push('kick'); }
        if (goal(b)) {
          g.goals++; g.pause = 1.8; ev.sfx.push('fanfare'); confetti(q.clone().setY(0), 50); puff('⚽', q.clone().setY(3), { size: 2.2 });
          ev.say = g.goals < 3 ? `⚽ ГОЛ! ${g.goals} из 3` : '⚽ ГОЛ!';
        }
      }
      g.status = `голов: ${g.goals} из 3`;
      if (g.goals >= 3 && g.pause < 1) return 'win';
    },
    end() { setTimeout(() => st.ball && placeBall(st.ball, KICKOFF, FIELD.z), 1500); },
    win: '🎉 Коля и Оля: Три гола! Ты настоящий футболист!', lose: '😜 Коля: Не успел! Подойди — сыграем ещё!',
  },

  // Алиса: прыгнул у пруда — бросил жёлудь, утки плывут и едят
  ducks: {
    kids: ['alisa'], time: 60, title: '🦆 Накорми уток!', rules: 'прыгни у воды — бросишь жёлудь. Накорми уток 6 раз',
    start(g) {
      const P = AUTUMN.pond; g.fed = 0; g.food = []; g.cool = 0; g.ducks = [];
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * 6.28, d = group(scene, P.x + Math.cos(a) * 5, -0.3, P.z + Math.sin(a) * 5);
        const m = buildBird(d, { body: i % 2 ? 0xffffff : 0xc8a070, head: 0x2e8b57, beak: 0xffa31a, flat: true, wing: 0xe8e8e8 });
        m.root.scale.setScalar(0.9); m.legs.forEach(L => L.visible = false);
        g.ducks.push({ g: d, a, ph: Math.random() * 6 });
      }
    },
    step(g, dt, hero, ev) {
      const P = AUTUMN.pond, p = hero.pos, dp = Math.hypot(p.x - P.x, p.z - P.z), t = performance.now() / 1000;
      g.cool -= dt;
      if (hero.jumped && g.cool <= 0 && dp < P.r + 7) {
        g.cool = 0.5;
        const k = clamp(dp - 6, 1.5, P.r - 2.5), ux = (p.x - P.x) / (dp || 1), uz = (p.z - P.z) / (dp || 1);
        const to = new T.Vector3(P.x + ux * k + rnd(-1.5, 1.5), -0.25, P.z + uz * k + rnd(-1.5, 1.5));
        const s = sprite(emojiTex('🌰'), 0.7); scene.add(s);
        arc(s, p.clone().setY(p.y + 1.6), to, 0.7, 3, () => { if (g.over) { scene.remove(s); return; } g.food.push({ s, x: to.x, z: to.z }); puff('💦', to, { size: 0.9 }); });
      }
      for (const f of g.food) f.s.position.y = -0.15 + Math.sin(t * 3 + f.x) * 0.05;
      for (const D of g.ducks) {
        const q = D.g.position;
        let f = null, best = 1e9; for (const x of g.food) { const d = Math.hypot(x.x - q.x, x.z - q.z); if (d < best) { best = d; f = x; } }
        let tx, tz;
        if (f) { tx = f.x; tz = f.z; } else { D.a += dt * 0.3; tx = P.x + Math.cos(D.a + D.ph) * 5.5; tz = P.z + Math.sin(D.a + D.ph) * 5.5; }
        const dx = tx - q.x, dz = tz - q.z, d = Math.hypot(dx, dz), sp = f ? 3 : 1.2;
        if (d > 0.05) { q.x += dx / d * Math.min(sp * dt, d); q.z += dz / d * Math.min(sp * dt, d); D.g.rotation.y = dampAngle(D.g.rotation.y, Math.atan2(dx, dz), 6, dt); }
        q.y = -0.3 + Math.sin(t * 4 + D.ph) * 0.04;
        if (f && d < 0.6) {
          g.food.splice(g.food.indexOf(f), 1); scene.remove(f.s); g.fed++;
          ev.sfx.push('quack'); puff('💛', q.clone().setY(1.2), { size: 1 });
        }
      }
      look(g.kids[0], P.x, P.z, dt);
      g.status = `накормлено ${g.fed} из 6`;
      if (g.fed >= 6) return 'win';
    },
    end(g) { g.over = true; for (const D of g.ducks) setTimeout(() => scene.remove(D.g), 2500); for (const f of g.food) scene.remove(f.s); },
    win: '🎉 Алиса: Все утки сытые! Спасибо, что помог!', lose: '😜 Алиса: Утки ещё голодные… Подойди — попробуем ещё!',
  },

  // Тимур: толкни тыкву по дорожке — сбей все 6 кеглей за 3 броска
  bowling: {
    kids: ['timur'], time: 90, title: '🎳 Тыквенный боулинг!', rules: 'разбегись и толкни тыкву к кеглям — сбей все 6 за 3 броска',
    start(g) { g.rolls = 3; g.phase = 'ready'; resetPins(); placeBall(st.bowl.ball, st.bowl.start, st.bowl.z); },
    step(g, dt, hero, ev) {
      const B = st.bowl, b = B.ball, q = b.m.position;
      const box2 = { x0: B.x0, x1: B.x1, z0: B.z - 1.6, z1: B.z + 1.6 };
      if (stepBall(b, dt, hero, { kick: g.phase === 'ready' ? 12 : 0, lift: 1, friction: 0.35, box: box2 }) && g.phase === 'ready') { g.phase = 'roll'; g.rt = 0; g.rolls--; ev.sfx.push('kick'); }
      if (g.phase === 'roll') {
        g.rt += dt;
        for (const pin of B.pins) if (!pin.down && Math.hypot(q.x - pin.x, q.z - pin.z) < b.r + 0.3) { topple(pin, b.v.x, b.v.z, ev); b.v.multiplyScalar(0.85); }
        if (Math.hypot(b.v.x, b.v.z) < 0.4 || q.x > B.x1 - 0.8 || g.rt > 6) { g.phase = 'settle'; g.st = 1.3; }
      }
      updatePins(dt);
      const down = B.pins.filter(p => p.down).length;
      if (g.phase === 'settle' && (g.st -= dt) <= 0) {
        if (down === 6) { if (g.rolls === 2) g.result = ' Это СТРАЙК — с первого броска! 🎳'; return 'win'; }
        if (g.rolls <= 0) return 'lose';
        placeBall(b, B.start, B.z); puff('🎃', q.clone().setY(q.y + 1.5), { size: 1.2 }); g.phase = 'ready';
        ev.say = `🎳 Сбито ${down} из 6 — ещё ${g.rolls === 1 ? 'один бросок' : g.rolls + ' броска'}!`;
      }
      look(g.kids[0], q.x, q.z, dt);
      g.status = `сбито ${down} из 6 · бросков осталось: ${g.rolls}`;
    },
    end() { setTimeout(() => { if (st.bowl) { resetPins(); placeBall(st.bowl.ball, st.bowl.start, st.bowl.z); } }, 2000); },
    win: '🎉 Тимур: Все кегли лежат! Ты меткий!', lose: '😜 Тимур: Почти! Подойди — сыграем ещё!',
  },

  // Маша: плиты загораются по очереди — повтори. С каждым разом на одну больше: 2, 3, 4, 5
  simon: {
    kids: ['masha'], time: 150, title: '🎨 Повтори за мной!', rules: 'смотри, какие плиты загорятся, и наступи на них по порядку',
    start(g) { g.seq = []; addStep(g); addStep(g); g.miss = 0; g.phase = 'show'; g.i = 0; g.tt = 0.8; },
    step(g, dt, hero, ev) {
      const Mh = g.kids[0], p = hero.pos;
      for (const pl of st.plates) { pl.glow = Math.max(0, pl.glow - dt * 2); pl.m.material.emissive.copy(pl.c).multiplyScalar(pl.glow * 0.8); }
      const light = k => { st.plates[k].glow = 1; ev.sfx.push('note' + k); puff(st.plates[k].e, st.plates[k].m.position.clone().setY(st.plates[k].y + 1.2), { size: 1 }); };
      if (g.phase === 'show') {
        if ((g.tt -= dt) <= 0) {
          if (g.i < g.seq.length) { light(g.seq[g.i]); Mh.m.root.position.y = 0.4; g.i++; g.tt = 0.9; }
          else { g.phase = 'input'; g.i = 0; g.on = under(p); }
        }
        const k = g.seq[Math.max(0, g.i - 1)]; look(Mh, st.plates[k].x, st.plates[k].z, dt); Mh.m.root.position.y = Math.max(0, Mh.m.root.position.y - dt * 2);
      } else if (g.phase === 'input') {
        look(Mh, p.x, p.z, dt);
        const k = under(p);
        if (k !== g.on) {
          g.on = k;
          if (k !== null) {
            light(k);
            if (k === g.seq[g.i]) {
              if (++g.i === g.seq.length) {
                if (g.seq.length >= 5) return 'win';
                addStep(g); g.phase = 'show'; g.i = 0; g.tt = 1.4; bump(Mh, '👍'); ev.sfx.push('collect');
                ev.say = `🎨 Маша: Правильно! Теперь ${g.seq.length}…`;
              }
            } else {
              g.miss++; ev.sfx.push('nope'); bump(Mh, '❌');
              if (g.miss >= 3) return 'lose';
              g.phase = 'show'; g.i = 0; g.tt = 1.4; ev.say = '🎨 Маша: Не та! Смотри ещё раз 👀';
            }
          }
        }
      } else look(Mh, p.x, p.z, dt);
      g.status = g.phase === 'show' ? `смотри внимательно 👀 · плит: ${g.seq.length}` : `твой ход: ${g.i} из ${g.seq.length}` + (g.miss ? ` · ошибок ${g.miss} из 3` : '');
    },
    end() { if (st.plates) for (const pl of st.plates) pl.glow = 0; },
    win: '🎉 Маша: Ты всё запомнил! Вот это память!', lose: '😜 Маша: Сложно, да? Подойди — сыграем ещё!',
  },

  // Петя: челнок — до флажка и обратно 3 раза, наперегонки
  shuttle: {
    kids: ['petya'], time: 60, title: '🏃 Челнок с Петей!', rules: 'добеги до жёлтой черты и обратно 3 раза — кто быстрее?',
    start(g, hero) {
      hero.pos.set(-1.5, groundY(-1.5, NEAR + 1.5), NEAR + 1.5); hero.vel.set(0, 0, 0); hero.face = Math.PI; hero.model.root.rotation.y = Math.PI;
      const P = g.kids[0]; P.g.position.set(-5.5, 0, NEAR + 1.5); P.face = Math.PI;
      g.legs = g.pl = 0; g.clock = 0; g.sp = 9 * Math.max(1, hero.speedMul || 1) * 0.78;
    },
    ready(g, dt) { look(g.kids[0], -5.5, FAR, dt); },
    step(g, dt, hero, ev) {
      const p = hero.pos, P = g.kids[0];
      g.clock += dt;
      if (g.legs % 2 === 0 ? p.z < FAR : p.z > NEAR) { g.legs++; ev.sfx.push('collect'); puff(g.legs % 2 ? '🚩' : '✅', p.clone().setY(p.y + 3), { size: 1.2 }); }
      if (run(P, -5.5, g.pl % 2 === 0 ? FAR - 0.6 : NEAR + 0.6, g.sp, dt) < 0.2) g.pl++;
      g.status = `ты ${Math.floor(g.legs / 2)} из 3 · Петя ${Math.floor(g.pl / 2)} из 3 · ${g.clock.toFixed(1)} с`;
      if (g.legs >= 6) {
        const best = (g.save.kidBest || (g.save.kidBest = {})).shuttle;
        g.result = best ? (g.clock < best ? ` Новый рекорд: ${g.clock.toFixed(1)} с! 🏆` : ` Твоё время ${g.clock.toFixed(1)} с, рекорд — ${best.toFixed(1)} с`) : ` Твоё время ${g.clock.toFixed(1)} с — это рекорд!`;
        if (!best || g.clock < best) g.save.kidBest.shuttle = g.clock;
        return 'win';
      }
      if (g.pl >= 6) return 'lose';
    },
    win: '🎉 Петя: Ого, ты быстрый!', lose: '😜 Петя: Я первый! Подойди — сыграем ещё!',
  },
};

function addStep(g) { let k; do k = Math.floor(Math.random() * 4); while (k === g.seq[g.seq.length - 1]); g.seq.push(k); }
// на какой плите стоит герой (или null)
function under(p) {
  for (const pl of st.plates) if (Math.abs(p.x - pl.x) < 1.05 && Math.abs(p.z - pl.z) < 1.05 && Math.abs(p.y - pl.y) < 0.5) return pl.i;
  return null;
}
// кегли: падают в сторону удара, задевают соседей
function topple(pin, vx, vz, ev) {
  pin.down = true; pin.fall = 0.001; const l = Math.hypot(vx, vz) || 1;
  pin.dx = vx / l; pin.dz = vz / l; pin.axis.set(pin.dz, 0, -pin.dx); ev.sfx.push('kick');
  setTimeout(() => {
    if (!st.bowl) return;
    for (const o of st.bowl.pins) if (!o.down && Math.hypot(o.x - pin.x, o.z - pin.z) < 0.95 && Math.random() < 0.7) topple(o, pin.dx + rnd(-0.5, 0.5), pin.dz + rnd(-0.5, 0.5), { sfx: [] });
  }, 140);
}
function updatePins(dt) {
  for (const pin of st.bowl.pins) if (pin.down && pin.fall < 1) { pin.fall = Math.min(1, pin.fall + dt / 0.3); pin.g.quaternion.setFromAxisAngle(pin.axis, pin.fall * Math.PI / 2); }
}
function resetPins() { for (const pin of st.bowl.pins) { pin.down = false; pin.fall = 0; pin.g.quaternion.identity(); } }

// ---------- запуск и ход игры ----------
export const miniGame = kind => !!GAMES[kind];
export const miniOn = () => !!game;
export function startMini(kind, hero, save) {
  const G = GAMES[kind]; if (game || !G) return false;
  const kids = G.kids.map(id => nodeOf(id)).filter(Boolean);
  if (kids.length < G.kids.length) return false;
  for (const k of kids) k.busy = true;
  game = { kind, G, kids, count: 3, t: G.time, save, status: '' };
  G.start(game, hero, save);
  return true;
}
// раз в кадр. События: { hud, sfx: [], say, win/lose: kind, kids: [f] }
export function updateMini(dt, hero) {
  if (!game) return {};
  const g = game, ev = { sfx: [] };
  if (g.count > 0) {
    const before = Math.ceil(g.count); g.count -= dt; const now = Math.ceil(g.count);
    if (now !== before && now > 0) ev.sfx.push('tap');
    ev.hud = { mode: 'gen', title: g.G.title, sub: g.G.rules, big: Math.max(1, now) };
    if (g.G.ready) g.G.ready(g, dt); else for (const k of g.kids) look(k, hero.pos.x, hero.pos.z, dt);
    if (g.count <= 0) ev.sfx.push('levelUp');
    return ev;
  }
  g.t -= dt;
  const res = g.G.step(g, dt, hero, ev) || (g.t <= 0 ? (g.G.timeout ? g.G.timeout(g) : 'lose') : null);
  ev.hud = { mode: 'gen', title: g.G.title, sub: g.status + (g.kind === 'shuttle' ? '' : ` · ⏱ ${Math.max(0, Math.ceil(g.t))} с`) };
  if (res) finish(ev, res === 'win');
  return ev;
}
function finish(ev, win) {
  const g = game; game = null;
  if (g.G.end) g.G.end(g);
  ev[win ? 'win' : 'lose'] = g.kind; ev.kids = g.kids.map(k => k.f);
  ev.say = (win ? g.G.win : g.G.lose) + (g.result || '');
  for (const k of g.kids) { k.m.root.position.y = 0; bump(k, win ? '🎉' : '😜'); }
  setTimeout(() => {
    for (const k of g.kids) {
      const q = k.g.position;
      if (Math.hypot(q.x - k.home.x, q.z - k.home.z) > 1) { puff('💨', q.clone().setY(q.y + 1), { size: 1.6 }); q.set(k.home.x, groundY(k.home.x, k.home.z), k.home.z); }
      k.busy = false; k.near = true;
    }
  }, 1500);
}
export function stopMini() { if (game) { const g = game; game = null; if (g.G.end) g.G.end(g); for (const k of g.kids) k.busy = false; } }
