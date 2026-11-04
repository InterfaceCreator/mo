// Камера от третьего лица: позади и чуть выше героя, крутится пальцем/мышью,
// не проходит сквозь стены, а если её не трогать — сама плавно уходит за спину.
import { T, camera, clamp, damp, dampAngle } from './engine.js';
import { blocksCamera } from './world.js';

const PITCH_MIN = 0.02, PITCH_MAX = 1.25, PITCH_DEF = 0.32;
const DIST_MIN = 4, DIST_MAX = 18;
const RETURN_AFTER = 2000;     // мс без касания камеры — и она возвращается за спину
const HEAD = 2.3;              // куда смотрит камера: чуть выше плеч

const dir = new T.Vector3(), target = new T.Vector3();

export function makeCam(face) {
  return { yaw: face + Math.PI, pitch: PITCH_DEF, dist: innerWidth < innerHeight ? 12 : 10, cur: 10, ty: 0, init: false };
}

export function updateCam(c, dt, hero, { look, zoom, lastLook }) {
  // поворот пальцем: вправо — смотрим вправо, вниз — камера поднимается
  c.yaw -= look.dx;
  c.pitch = clamp(c.pitch + look.dy, PITCH_MIN, PITCH_MAX);
  if (zoom) c.dist = clamp(c.dist + zoom * 1.5, DIST_MIN, DIST_MAX);

  // сама за спину — только когда герой бежит, иначе камера крутилась бы на месте
  // и только когда бежит «от камеры»: бег вбок или к камере её не разворачивает
  const away = -Math.cos(c.yaw - hero.face);
  if (performance.now() - lastLook > RETURN_AFTER && hero.speed > 1.5 && away > 0) {
    const k = Math.min(hero.speed / 9, 1) * away;
    c.yaw = dampAngle(c.yaw, hero.face + Math.PI, 1.8 * k, dt);
    c.pitch = damp(c.pitch, PITCH_DEF, 1.2 * k, dt);
  }

  // точка, на которую смотрим: по высоте сглажена, чтобы прыжки не дёргали картинку
  const p = hero.pos;
  if (!c.init) { c.ty = p.y + HEAD; c.cur = c.dist; c.init = true; }
  c.ty = damp(c.ty, p.y + HEAD, hero.grounded ? 10 : 3, dt);
  target.set(p.x, c.ty, p.z);

  dir.set(Math.sin(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch), Math.cos(c.yaw) * Math.cos(c.pitch));

  // стены: камера придвигается к герою сразу, а отъезжает обратно плавно
  // идём от героя к камере мелкими шагами, пока не упрёмся в блок
  let allowed = c.dist;
  for (let d = 0.6; d < c.dist; d += 0.3) {
    if (blocksCamera(target.x + dir.x * d, target.y + dir.y * d, target.z + dir.z * d)) { allowed = Math.max(d - 0.5, 1.2); break; }
  }
  c.cur = allowed < c.cur ? allowed : damp(c.cur, allowed, 3, dt);

  camera.position.copy(target).addScaledVector(dir, c.cur);
  if (camera.position.y < 0.4) camera.position.y = 0.4;
  camera.lookAt(target);

  // камера почти в голове — прячем героя, чтобы не смотреть изнутри
  if (!hero.ghost) hero.model.root.visible = c.cur > 1.6;                 // ghost — наблюдатель: своего героя нет
}
