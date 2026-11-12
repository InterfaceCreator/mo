// Пасхалки для мамы 💌 (только в мамином профиле).
// Самолётик с растяжкой «Юля ❤️»: изредка пролетает над базой — первый раз через 2–4 минуты на базе, потом раз в 8–15 минут.
// Летит с запада на восток высоко над загонами, растяжка развевается за ним.
import { T, scene, group, box } from './engine.js';
import { onLevelReset } from './world.js';

let next = 120 + Math.random() * 120, fly = null;
onLevelReset(() => { fly = null; });                                  // ушли с базы — самолётик улетел вместе с локацией

const FROM = -130, TO = 130, Y = 27, Z = 22, SPEED = 13;
function banner() {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256;
  const c = cv.getContext('2d');
  c.fillStyle = '#fffaf2'; c.fillRect(0, 0, 1024, 256);
  c.strokeStyle = '#ff5a8a'; c.lineWidth = 18; c.strokeRect(9, 9, 1006, 238);
  c.font = 'bold 150px "Arial Rounded MT Bold","Trebuchet MS",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#e8204a'; c.fillText('Юля ❤️', 512, 136);
  const geo = new T.PlaneGeometry(16, 4, 16, 1);
  const m = new T.Mesh(geo, new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv), side: T.DoubleSide, fog: false }));
  m.userData.base = Float32Array.from(geo.attributes.position.array);
  return m;
}
function build() {
  const g = group(scene, FROM, Y, Z); g.userData.dynamic = true;
  const P = group(g, 0, 0, 0);                                        // самолётик: смотрит на восток (+x)
  box(P, 3.6, 1, 1, 0xd8261a, 0, 0, 0); box(P, 1.2, 0.8, 0.9, 0xffffff, 1.6, 0.05, 0);           // корпус и нос
  box(P, 0.9, 0.5, 0.8, 0x7fd4ff, 0.6, 0.6, 0);                                                  // кабина
  box(P, 1.2, 0.16, 6.4, 0xd8261a, 0.3, 0.1, 0); for (const sz of [-1, 1]) box(P, 1.22, 0.18, 0.8, 0xffffff, 0.3, 0.1, sz * 2.9);   // красное крыло с белыми кончиками
  box(P, 0.7, 1.1, 0.12, 0xd8261a, -1.6, 0.6, 0); box(P, 0.7, 0.1, 2.4, 0xffffff, -1.6, 0.1, 0); // хвост
  const prop = group(P, 2.3, 0.05, 0); box(prop, 0.08, 2.2, 0.25, 0x2b2b33, 0, 0, 0); box(prop, 0.08, 0.25, 2.2, 0x2b2b33, 0, 0, 0);
  for (let i = 0; i < 6; i++) box(g, 0.6, 0.05, 0.05, 0x6a5a4a, -2.4 - i * 0.6, -0.2 - i * 0.12, 0, { shadow: false });   // верёвка
  const b = banner(); b.position.set(-13.8, -1.4, 0); g.add(b);
  return { g, P, prop, b, t: 0 };
}
// раз в кадр на базе (только у мамы)
export function updatePlane(dt) {
  if (!fly) { if ((next -= dt) > 0) return; fly = build(); next = 480 + Math.random() * 420; }
  const F = fly, x = F.g.position.x + SPEED * dt;
  F.t += dt; F.g.position.x = x; F.g.position.y = Y + Math.sin(F.t * 0.8) * 0.6;
  F.P.rotation.x = Math.sin(F.t * 1.3) * 0.08;                         // покачивает крыльями
  F.prop.rotation.x += dt * 30;
  // растяжка развевается волной
  const pos = F.b.geometry.attributes.position, B = F.b.userData.base;
  for (let i = 0; i < pos.count; i++) { const bx = B[i * 3]; pos.array[i * 3 + 2] = Math.sin(bx * 0.6 - F.t * 6) * 0.45 * ((8 - bx) / 16); }
  pos.needsUpdate = true;
  if (x > TO) { scene.remove(F.g); fly = null; }
}
export const planeSoon = (s = 1) => { next = s; };                    // для проверки: прилетит через s секунд
export const planeAt = () => fly ? fly.g.position.clone() : null;
