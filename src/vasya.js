// Кот Василий: гуляет по базе по дорожкам; подошёл и встал рядом — садится, жмурится, мурчит, летят сердечки.
import { T, scene, group, box, damp, dampAngle, compactModel } from './engine.js';
import { onLevelReset } from './world.js';
import { makeLabel, puff } from './fx.js';

const C = { fur: 0x7c6d5a, dark: 0x3e3128, white: 0xf3eee6, eye: 0x9fd08a, nose: 0xe8968a, ear: 0xf2b8b0 };

// модель: полосатый кот с белой грудкой, «М» на лбу, зелёные глаза, длинный полосатый хвост
export function buildCat(p) {
  const root = group(p), body = group(root), legs = [];
  const LEG = 0.34, by = LEG + 0.28;
  box(body, 0.72, 0.56, 1.2, C.fur, 0, by, 0);
  box(body, 0.5, 0.42, 0.04, C.white, 0, by - 0.02, 0.61, { shadow: false });           // белая грудка
  for (let i = 0; i < 5; i++) box(body, 0.74, 0.42, 0.08, C.dark, 0, by + 0.08, -0.46 + i * 0.22, { shadow: false });
  box(body, 0.14, 0.02, 1.1, C.dark, 0, by + 0.29, 0, { shadow: false });                // полоска по спине
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const L = group(body, sx * 0.22, LEG, sz * 0.42); legs.push(L);
    box(L, 0.2, LEG, 0.2, C.fur, 0, -LEG / 2, 0);
    box(L, 0.21, 0.06, 0.21, C.dark, 0, -LEG * 0.4, 0, { shadow: false });
    box(L, 0.22, 0.08, 0.24, sz > 0 ? C.white : C.fur, 0, -LEG + 0.04, 0.02);             // лапки
  }
  // голова: щёки пошире, белая мордочка и подбородок
  const head = group(body, 0, by + 0.36, 0.72);
  box(head, 0.62, 0.5, 0.5, C.fur, 0, 0, 0);
  box(head, 0.72, 0.28, 0.44, C.fur, 0, -0.1, -0.01);
  box(head, 0.34, 0.2, 0.08, C.white, 0, -0.13, 0.26, { shadow: false });
  box(head, 0.22, 0.08, 0.3, C.white, 0, -0.25, 0.1, { shadow: false });
  box(head, 0.1, 0.07, 0.04, C.nose, 0, -0.05, 0.3, { shadow: false });
  for (const x of [-0.1, 0, 0.1]) box(head, 0.04, 0.14, 0.02, C.dark, x, 0.17, 0.255, { shadow: false });   // «М» на лбу
  const eyes = [];
  for (const sx of [-1, 1]) {
    const e = group(head, sx * 0.15, 0.05, 0.256); eyes.push(e);
    box(e, 0.13, 0.13, 0.02, C.eye, 0, 0, 0, { shadow: false });
    box(e, 0.035, 0.11, 0.02, 0x111111, 0, 0, 0.008, { shadow: false });
    box(head, 0.02, 0.05, 0.12, C.dark, sx * 0.361, -0.05, 0.02, { shadow: false });     // полоски на щеках
    box(head, 0.02, 0.04, 0.1, C.dark, sx * 0.361, 0.04, 0.0, { shadow: false });
    for (const r of [0.12, -0.08]) { const w = box(head, 0.34, 0.012, 0.012, 0xffffff, sx * 0.3, -0.12 + r * 0.2, 0.28, { shadow: false }); w.rotation.z = sx * r; }
    // ушки треугольником: широкое основание, узкий кончик
    const ear = group(head, sx * 0.19, 0.25, -0.06); ear.rotation.z = -sx * 0.2;
    box(ear, 0.24, 0.1, 0.08, C.fur, 0, 0.05, 0); box(ear, 0.16, 0.08, 0.08, C.fur, 0, 0.13, 0); box(ear, 0.08, 0.06, 0.08, C.dark, 0, 0.2, 0, { shadow: false });
    box(ear, 0.12, 0.1, 0.02, C.ear, 0, 0.08, 0.045, { shadow: false });
  }
  // хвост: цепочка звеньев, каждое качается чуть позже предыдущего
  const tail = []; let t = group(body, 0, by + 0.12, -0.6); t.rotation.x = 0.7;
  for (let i = 0; i < 5; i++) {
    box(t, 0.14, 0.14, 0.26, i % 2 ? C.dark : C.fur, 0, 0, -0.13); tail.push(t);
    t = group(t, 0, 0, -0.24); t.rotation.x = 0.12;
  }
  box(t, 0.12, 0.12, 0.12, C.dark, 0, 0, -0.04);
  return { root, body, head, legs, eyes, tail, phase: 0 };
}

// дорожки базы: точки и соседи — между соседними точками нет заборов и построек
const WP = { A: [-26, 1], B: [-12, 1], C: [0, 4], D: [12, 1], E: [26, 1], F: [-2, 14], G: [3, 22], H: [-3, 30], I: [2, 36], J: [-1, 44] };
const NB = { A: 'B', B: 'AC', C: 'BDF', D: 'CE', E: 'D', F: 'CG', G: 'FH', H: 'GI', I: 'HJ', J: 'I' };

let cat = null;
// где сейчас Василий (для карты) — или null, если он не на этой локации
export const vasyaPos = () => cat ? { x: cat.m.root.position.x, z: cat.m.root.position.z } : null;
onLevelReset(() => { cat = null; });

export function spawnVasya() {
  const m = compactModel(buildCat(scene)), at = 'G';
  m.root.position.set(WP[at][0], 0, WP[at][1]); m.root.scale.setScalar(1.15);
  const label = makeLabel(3.2, 0.8); label.userData.set('🐱 Василий', { color: '#ffffff' }); label.position.set(0, 1.85, 0); m.root.add(label);
  cat = { m, at, to: null, wait: 2, face: 0, petT: 0, heartT: 0, purrT: 0, near: false };
}

// раз в кадр на базе; события для game.js: { meow, purr, petted }
export function updateVasya(dt, hero) {
  if (!cat) return {};
  const ev = {}, m = cat.m, p = m.root.position, h = hero.pos, now = performance.now() / 1000;
  const dx = h.x - p.x, dz = h.z - p.z, dist = Math.hypot(dx, dz);
  if (dist > 80) return ev;                                          // далеко — кот дремлет на месте
  const petting = dist < 2.4 && hero.speed < 1.2 && Math.abs(h.y - p.y) < 1.5;
  if (dist < 3.5 && !cat.near) ev.meow = true;                    // подошёл — «мяу»
  cat.near = dist < 3.5;

  let speed = 0;
  if (petting) {
    // гладят: повернулся к герою, сел, зажмурился, мурчит; сердечки
    cat.face = dampAngle(cat.face, Math.atan2(dx, dz), 6, dt);
    cat.petT += dt; cat.wait = 3;
    if ((cat.heartT -= dt) <= 0) { cat.heartT = 0.7; puff(Math.random() < 0.5 ? '💕' : '❤️', new T.Vector3(p.x, p.y + 1.6, p.z), { size: 0.7, rise: 1.2, dx: (Math.random() - 0.5) * 0.6 }); }
    if ((cat.purrT -= dt) <= 0) { cat.purrT = 0.9; ev.purr = true; }
    if (cat.petT > 1.5 && !cat.happy) { cat.happy = true; ev.petted = true; }
  } else {
    cat.petT = 0; cat.happy = false;
    if (cat.to) {
      const [tx, tz] = WP[cat.to], vx = tx - p.x, vz = tz - p.z, d = Math.hypot(vx, vz);
      if (d < 0.2) { cat.at = cat.to; cat.to = null; cat.wait = 2 + Math.random() * 5; }
      else { speed = 1.6; p.x += vx / d * speed * dt; p.z += vz / d * speed * dt; cat.face = dampAngle(cat.face, Math.atan2(vx, vz), 8, dt); }
    } else if ((cat.wait -= dt) <= 0) {
      const n = NB[cat.at]; cat.to = n[Math.floor(Math.random() * n.length)];
    }
  }
  m.root.rotation.y = cat.face;

  // анимация: лапы при ходьбе, «сидит» на месте, хвост качается, глаза жмурятся, когда гладят
  m.phase += dt * (speed ? 9 : 2);
  const s = Math.sin(m.phase);
  m.legs.forEach((L, i) => { L.rotation.x = damp(L.rotation.x, speed ? (i === 0 || i === 3 ? s : -s) * 0.5 : 0, 20, dt); });
  const sit = speed ? 0 : 1;
  m.body.rotation.x = damp(m.body.rotation.x, -0.32 * sit, 6, dt);                    // сидит: зад ниже, грудь выше
  m.body.position.y = damp(m.body.position.y, -0.12 * sit, 6, dt);
  if (!speed) for (const L of [m.legs[2], m.legs[3]]) L.rotation.x = damp(L.rotation.x, -1.1, 8, dt);          // задние лапы поджаты
  m.head.rotation.x = damp(m.head.rotation.x, 0.3 * sit, 6, dt);
  m.head.rotation.z = petting ? Math.sin(now * 2) * 0.15 : damp(m.head.rotation.z, 0, 6, dt);  // трётся головой
  m.tail.forEach((t, i) => { t.rotation.y = Math.sin(now * (petting ? 3 : 1.6) - i * 0.6) * (petting ? 0.35 : 0.2); });
  m.tail[0].rotation.x = damp(m.tail[0].rotation.x, petting ? 1.2 : 0.7, 4, dt);     // довольный — хвост трубой
  const eyeY = petting ? 0.15 : (now % 4 < 0.12 ? 0.1 : 1);                            // жмурится; иногда моргает
  for (const e of m.eyes) e.scale.y = damp(e.scale.y, eyeY, 20, dt);
  return ev;
}
