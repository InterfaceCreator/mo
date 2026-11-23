// Движение героя: бег относительно камеры, прыжок, гравитация, столкновения с блоками мира.
import { T, damp, dampAngle } from './engine.js';
import { nearColliders } from './world.js';
import { HERO_H } from './hero.js';

export const WALK = 9, JUMP_V = 12.5, GRAVITY = 34, RADIUS = 0.45, STEP = 1.05;   // ступеньку в 1 блок герой перешагивает сам
const COYOTE = 0.12;    // можно прыгнуть чуть позже, чем сошёл с края

export function makePlayer(model, spawn) {
  model.root.position.set(spawn.x, 0, spawn.z);
  model.root.rotation.y = spawn.face;
  return { model, pos: model.root.position, vel: new T.Vector3(), face: spawn.face, grounded: true, airT: 0, speed: 0, speedMul: 1, stun: 0 };
}

// высота опоры под точкой (x, z) — самая высокая крыша блока не выше y + STEP
function groundAt(x, z, y, invis = false) {
  let g = -Infinity;
  const r = RADIUS * 0.7;
  for (const c of nearColliders(x - r, x + r, z - r, z + r)) { if (c.off || c.ghost || (invis && c.fence)) continue;
    if (x + r <= c.x0 || x - r >= c.x1 || z + r <= c.z0 || z - r >= c.z1) continue;
    if (c.y1 <= y + STEP && c.y1 > g) g = c.y1;
  }
  return g;
}

// выталкивание из стен по горизонтали (круг против прямоугольника)
function pushOut(p, invis = false) {
  for (const c of nearColliders(p.x - RADIUS, p.x + RADIUS, p.z - RADIUS, p.z + RADIUS)) { if (c.off || c.ghost || (invis && c.fence)) continue;
    if (c.y1 <= p.y + STEP || c.y0 >= p.y + HERO_H) continue;     // низкий блок — на него можно шагнуть
    const nx = Math.max(c.x0, Math.min(p.x, c.x1)), nz = Math.max(c.z0, Math.min(p.z, c.z1));
    let dx = p.x - nx, dz = p.z - nz; const d2 = dx * dx + dz * dz;
    if (d2 >= RADIUS * RADIUS) continue;
    if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (RADIUS - d) / d; p.x += dx * k; p.z += dz * k; }
    else {   // центр внутри блока — выталкиваем к ближней стороне
      const o = [p.x - c.x0 + RADIUS, c.x1 - p.x + RADIUS, p.z - c.z0 + RADIUS, c.z1 - p.z + RADIUS], m = Math.min(...o);
      if (m === o[0]) p.x -= o[0]; else if (m === o[1]) p.x += o[1]; else if (m === o[2]) p.z -= o[2]; else p.z += o[3];
    }
  }
}

// mv — вектор джойстика (y < 0 — вперёд), camYaw — куда смотрит камера
export function updatePlayer(pl, dt, mv, camYaw, wantJump) {
  // лезет по верёвке: плавно поднимаемся к точке наверху
  // катание (колесо обозрения, горка): ride(t) говорит, где герой в момент t от 0 до 1
  if (pl.climb?.ride) {
    const c = pl.climb;
    // нажал прыжок или сдвинул джойстик (на скамейке/пеньке) — встал
    if (wantJump && c.t > 0.05 && c.onJump) c.onJump(c.t);                                      // горка с трамплином: прыжок = толчок, не соскок
    else if ((wantJump || (c.seat && Math.hypot(mv.x, mv.y) > 0.2)) && c.t > 0.05) {
      pl.climb = null; pl.relax = false; pl.dachaAnim = null; pl.sleeping = false; pl.sleep = false;
      pl.vel.set(Math.sin(pl.face) * (wantJump ? 3 : 1.5), wantJump ? JUMP_V * 0.6 : 0, Math.cos(pl.face) * (wantJump ? 3 : 1.5));
      pl.grounded = false; if (wantJump) pl.jumped = true;
      return;
    }
    c.t = Math.min(c.t + dt / c.dur, 1);
    const prev = pl.pos.clone(); pl.pos.copy(c.ride(c.t));
    pl.vel.set(0, 0, 0); pl.grounded = false; pl.speed = 0;
    if (c.face !== undefined) pl.model.root.rotation.y = pl.face = c.face;
    else if (pl.pos.distanceTo(prev) > 0.001) pl.model.root.rotation.y = pl.face = Math.atan2(pl.pos.x - prev.x, pl.pos.z - prev.z);
    if (c.t >= 1) { pl.climb = null; pl.relax = false; pl.dachaAnim = null; if (c.exit) { pl.vel.copy(c.exit); pl.coast = !!c.coast; } }   // coast — с горки летим по инерции
    return;
  }
  // канатная дорога: висим на ролике и едем по тросу вниз (трос чуть провисает)
  if (pl.climb?.zip) {
    const c = pl.climb; c.t = Math.min(c.t + dt / c.dur, 1);
    pl.pos.lerpVectors(c.from, c.to, c.t); pl.pos.y -= Math.sin(c.t * Math.PI) * c.sag + 2.6;
    pl.vel.set(0, 0, 0); pl.grounded = false; pl.speed = 0;
    pl.model.root.rotation.y = pl.face = Math.atan2(c.to.x - c.from.x, c.to.z - c.from.z);
    if (c.t >= 1) { pl.climb = null; pl.vel.set(Math.sin(pl.face) * 6, 2, Math.cos(pl.face) * 6); }   // соскок в конце
    return;
  }
  if (pl.climb) {
    const c = pl.climb; c.t = Math.min(c.t + dt / 0.9, 1);
    const k = c.t < 0.75 ? c.t / 0.75 : 1, h = c.t < 0.75 ? 0 : (c.t - 0.75) / 0.25;
    pl.pos.set(c.from.x + (c.to.x - c.from.x) * h, c.from.y + (c.to.y + 0.3 - c.from.y) * k, c.from.z + (c.to.z - c.from.z) * h);
    pl.vel.set(0, 0, 0); pl.grounded = false; pl.speed = 0;
    if (c.t >= 1) { pl.pos.copy(c.to); pl.climb = null; pl.grounded = true; }
    pl.model.root.rotation.y = pl.face = Math.atan2(c.to.x - c.from.x, c.to.z - c.from.z);
    return;
  }
  if (pl.stun > 0) { pl.stun -= dt; mv = { x: 0, y: 0 }; wantJump = false; }   // поймали — секунду сидит
  // направление «вперёд» = от камеры к герою, по земле
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
  let wx = rx * mv.x - fx * mv.y, wz = rz * mv.x - fz * mv.y;
  const mag = Math.min(Math.hypot(wx, wz), 1);
  // зонтик: держишь прыжок в воздухе — падаешь медленно и летишь вперёд быстрее; в невидимости — призрачное парение
  const invis = !!(pl.invisT > 0);
  pl.gliding = !!((pl.canGlide || invis) && pl.holdJump && !pl.grounded && pl.vel.y < 0);
  const target = (mag < 0.12 ? 0 : WALK * pl.speedMul * (0.35 + 0.65 * mag)) * (pl.gliding ? 1.5 : 1) * (pl.fly ? 1.7 : 1) * (invis ? 1.15 : 1);   // на драконе и призраком — быстрее     // слабое отклонение — шаг, сильное — бег
  const len = Math.hypot(wx, wz); if (len > 0.01) { wx /= len; wz /= len; }

  // разгон и торможение быстрые — управление «как в Roblox», без скольжения
  if (pl.grounded) pl.coast = false;
  const accel = pl.grounded ? (pl.ice ? 1.6 : 14) : pl.coast ? 0 : pl.gliding ? 4 : pl.fly ? 5 : 6;                 // ice — каток в Зимней долине: скользко
  pl.vel.x = damp(pl.vel.x, wx * target, accel, dt);
  pl.vel.z = damp(pl.vel.z, wz * target, accel, dt);
  if (target > 0) pl.face = dampAngle(pl.face, Math.atan2(wx, wz), 16, dt);

  // прыжок: призраком — выше и мягче, лунная гравитация
  pl.airT = pl.grounded ? 0 : pl.airT + dt;
  if (wantJump && pl.fly) { pl.vel.y = Math.max(pl.vel.y, 0) + 8; pl.vel.y = Math.min(pl.vel.y, 14); pl.grounded = false; pl.airT = COYOTE; pl.jumped = true; }   // дракон: взмах крыльями — в любой момент
  else if (wantJump && pl.airT < COYOTE) { pl.vel.y = JUMP_V * (pl.jumpMul || 1) * (invis ? 1.25 : 1); pl.grounded = false; pl.airT = COYOTE; pl.jumped = true; }
  else pl.jumped = false;
  pl.vel.y = Math.max(pl.vel.y - (pl.fly ? 9 : (invis ? GRAVITY * 0.55 : GRAVITY)) * dt, pl.gliding ? -2.5 : pl.fly ? -5 : -40);   // на драконе и призраком — плавно снижается

  const p = pl.pos;
  // по горизонтали — мелкими шагами, чтобы не проскочить сквозь тонкий забор
  const steps = Math.ceil(Math.hypot(pl.vel.x, pl.vel.z) * dt / (RADIUS * 0.8)) || 1;
  for (let i = 0; i < steps; i++) { p.x += pl.vel.x * dt / steps; p.z += pl.vel.z * dt / steps; pushOut(p, invis); }

  // по вертикали
  const before = p.y;
  p.y += pl.vel.y * dt;
  const g = groundAt(p.x, p.z, Math.max(before, p.y), invis);
  if (pl.vel.y <= 0 && p.y <= g) {                // приземлились или шагнули на невысокий блок
    p.y = g; pl.vel.y = 0; pl.grounded = true;
  } else if (pl.grounded && pl.vel.y <= 0 && p.y - g < STEP) {
    p.y = g; pl.vel.y = 0;                       // спуск со ступеньки — прилипаем к полу
  } else pl.grounded = false;
  // потолок: не влезаем головой в блок
  for (const c of nearColliders(p.x - RADIUS, p.x + RADIUS, p.z - RADIUS, p.z + RADIUS)) { if (c.off || c.ghost || (invis && c.fence)) continue;
    if (pl.vel.y > 0 && p.y + HERO_H > c.y0 && before + HERO_H <= c.y0 + 0.01 &&
        p.x + RADIUS * 0.7 > c.x0 && p.x - RADIUS * 0.7 < c.x1 && p.z + RADIUS * 0.7 > c.z0 && p.z - RADIUS * 0.7 < c.z1) {
      p.y = c.y0 - HERO_H; pl.vel.y = 0;
    }
  }
  if (pl.fly && p.y > 45) { p.y = 45; pl.vel.y = Math.min(pl.vel.y, 0); }      // выше облаков дракон не летает
  if (p.y < -30) { p.copy(pl.safe || p.set(0, 0, 0)); pl.vel.set(0, 0, 0); }    // на всякий случай: упал за край — на точку появления

  pl.model.root.rotation.y = pl.face;
  pl.speed = Math.hypot(pl.vel.x, pl.vel.z);
}
