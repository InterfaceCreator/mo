// Детская площадка на базе (лужайка справа от главной дорожки, у портала во Льды):
//   качели — встань на сиденье, раскачаешься; карусель — встань на круг, покатаешься;
//   мыльные пузыри — лопай их (прыжком — до высоких); большой надувной мяч — пинай куда хочешь.
// С качелей и карусели можно спрыгнуть — нажми прыжок.
import { T, scene, group, box } from './engine.js';
import { groundY, solid, addCollider, onLevelReset } from './world.js';
import { makeLabel, puff } from './fx.js';
import { makeBall, stepBall } from './kids.js';
import { createLampPost } from './daynight.js';

// всё — на просторной «Детской площадке» на зелёной территории восточной части базы
export const PG = { swing: { x: 38, z: 10 }, carousel: { x: 48, z: 22, r: 3.2 }, bubbles: { x: 58, z: 10 }, ball: { x: 38, z: 17 } };
const SW_H = 4.4, SW_L = 3.2;                                     // высота перекладины качелей и длина верёвок
const BUB = new T.SphereGeometry(1, 12, 8); BUB.userData.cached = true;
const BUB_MAT = [0xff9ad5, 0x9ad8ff, 0xc8a8ff, 0xa8ffc8, 0xfff08a].map(c => { const m = new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.45, depthWrite: false }); m.userData.cached = true; return m; });

let st = null;
onLevelReset(() => { st = null; });

export function buildPlayground(w) {
  st = { seats: [], bubbles: [], bubT: 0, cool: 0, armed: true, pops: 0, car: null, ball: null };
  // качели: две стойки, перекладина, два сиденья на верёвках
  const S = PG.swing, y = groundY(S.x, S.z);
  for (const sx of [-1, 1]) for (const sz of [-0.9, 0.9]) { const b = box(w, 0.3, SW_H + 0.4, 0.3, 0x3fa7ff, S.x + sx * 3, y + SW_H / 2, S.z + sz); b.rotation.x = -sz * 0.2; }
  for (const sx of [-1, 1]) addCollider({ x0: S.x + sx * 3 - 0.2, x1: S.x + sx * 3 + 0.2, y0: y, y1: y + SW_H, z0: S.z - 1.1, z1: S.z + 1.1 });
  box(w, 6.4, 0.3, 0.3, 0xff5a5a, S.x, y + SW_H, S.z);
  for (const sx of [-1.4, 1.4]) {
    const g = group(scene, S.x + sx, y + SW_H, S.z); g.userData.dynamic = true;
    for (const rx of [-0.38, 0.38]) box(g, 0.06, SW_L, 0.06, 0xeeeeee, rx, -SW_L / 2, 0, { shadow: false });
    box(g, 0.95, 0.14, 0.6, 0xffd23f, 0, -SW_L, 0);
    st.seats.push({ g, x: S.x + sx, z: S.z, y, a: 0, ph: Math.random() * 6 });
  }
  const l1 = makeLabel(5.5, 1.4); l1.position.set(S.x, y + SW_H + 1.4, S.z); scene.add(l1); l1.userData.set('Качели — встань на сиденье', { color: '#ffffff' });

  // карусель: круг крутится сам, на нём лошадки на шестах, сверху полосатый купол
  const C = PG.carousel, cy = groundY(C.x, C.z), car = group(scene, C.x, cy, C.z); car.userData.dynamic = true;
  const disk = new T.Mesh(new T.CylinderGeometry(C.r, C.r, 0.35, 28), new T.MeshLambertMaterial({ color: 0xffb02e })); disk.position.y = 0.175; disk.receiveShadow = true; car.add(disk);
  box(car, 0.35, 3.4, 0.35, 0xffffff, 0, 1.9, 0);
  const roof = new T.Mesh(new T.ConeGeometry(C.r + 0.3, 1.4, 12), new T.MeshLambertMaterial({ color: 0xff5a8a })); roof.position.y = 4.2; car.add(roof);
  const HC = [0xffffff, 0x8a5a2b, 0x2b2b33, 0xffd23f, 0xff7ac8, 0x9ad8ff];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2, x = Math.sin(a) * 2.4, z = Math.cos(a) * 2.4, h = group(car, x, 0.35, z); h.rotation.y = a + Math.PI / 2;
    box(h, 0.1, 3.2, 0.1, 0xffd23f, 0, 1.6, 0, { shadow: false });
    box(h, 1.1, 0.5, 0.4, HC[i], 0, 1.1, 0); box(h, 0.35, 0.55, 0.3, HC[i], 0.55, 1.45, 0); box(h, 0.15, 0.5, 0.15, 0x2b2b33, -0.55, 1.05, 0);   // лошадка: тело, голова, хвост
  }
  addCollider({ x0: C.x - C.r * 0.8, x1: C.x + C.r * 0.8, y0: cy, y1: cy + 0.35, z0: C.z - C.r * 0.8, z1: C.z + C.r * 0.8 });
  addCollider({ x0: C.x - 0.25, x1: C.x + 0.25, y0: cy, y1: cy + 4, z0: C.z - 0.25, z1: C.z + 0.25 });
  st.car = { g: car, x: C.x, z: C.z, y: cy, rot: 0 };
  const l2 = makeLabel(5.5, 1.4); l2.position.set(C.x, cy + 5.6, C.z); scene.add(l2); l2.userData.set('🎠 Карусель', { color: '#ffffff' });

  // машина для мыльных пузырей
  const B = PG.bubbles, by = groundY(B.x, B.z);
  solid(w, 1.4, 1.1, 1.4, 0x9b6bff, B.x, by, B.z, { studs: false });
  box(w, 0.3, 0.9, 0.3, 0xffffff, B.x, by + 1.5, B.z); box(w, 0.8, 0.2, 0.8, 0xff7ac8, B.x, by + 2, B.z);
  const l3 = makeLabel(5.5, 1.4); l3.position.set(B.x, by + 3.4, B.z); scene.add(l3); l3.userData.set('🫧 Лопай пузыри!', { color: '#ffffff' });
  st.bub = { x: B.x, y: by + 2.2, z: B.z };

  // большой надувной мяч
  st.ball = makeBall(scene, 0.9, 'beach', PG.ball.x, PG.ball.z);

  // Фонари на детской площадке: качели, карусель, пузыри и горки
  createLampPost(w, S.x - 4.5, S.z, -Math.PI / 2);      // у качелей слева
  createLampPost(w, S.x + 4.5, S.z, Math.PI / 2);       // у качелей справа
  createLampPost(w, C.x - 4.5, C.z, -Math.PI / 2);      // у карусели слева
  createLampPost(w, C.x + 4.5, C.z, Math.PI / 2);       // у карусели справа
  createLampPost(w, B.x - 2.8, B.z, 0);                 // у машины пузырей
  createLampPost(w, 32, 24, 0);                         // у игровой лужайки
}

// раз в кадр. События: { sfx: [], say, coins }
export function updatePlayground(dt, hero) {
  if (!st) return {};
  const ev = { sfx: [] }, p = hero.pos, t = performance.now() / 1000;
  // карусель крутится всегда
  st.car.rot += dt * 0.9; st.car.g.rotation.y = st.car.rot;
  // качели: свободные — чуть покачиваются, на которой катаешься — летает
  for (const s of st.seats) { if (s !== st.riding) s.a = Math.sin(t * 1.3 + s.ph) * 0.06; s.g.rotation.x = -s.a; }
  if (!hero.climb) st.riding = null;
  st.cool -= dt;
  if (!hero.climb && st.cool <= 0) {
    let on = false;
    for (const s of st.seats) {
      const here = Math.abs(p.x - s.x) < 0.65 && Math.abs(p.z - s.z) < 0.8 && p.y < s.y + 1.6;
      if (!here) continue; on = true;
      if (hero.grounded && st.armed) {
        // раскачиваемся: сначала всё сильнее, в конце — тише
        const dur = 12, per = 2.6;
        hero.climb = { ride: k => {
          const amp = 0.95 * Math.min(1, k * 4) * (k > 0.85 ? (1 - k) / 0.15 : 1), a = amp * Math.sin(k * dur / per * Math.PI * 2);
          s.a = a; return new T.Vector3(s.x, s.y + SW_H - SW_L * Math.cos(a) + 0.1, s.z + SW_L * Math.sin(a));
        }, t: 0, dur, face: 0, exit: new T.Vector3(0, 2, 3) };
        st.riding = s; st.armed = false; st.cool = 1; ev.sfx.push('boing'); ev.say = '🛝 Качаемся! Выше, выше!<small>нажми прыжок — спрыгнешь</small>';
      }
    }
    // карусель: встал на круг — едешь по кругу вместе с лошадками
    const C = st.car, dc = Math.hypot(p.x - C.x, p.z - C.z);
    if (dc < PG.carousel.r - 0.2 && dc > 0.6 && p.y > C.y + 0.2 && p.y < C.y + 1) {
      on = true;
      if (hero.grounded && st.armed) {
        const a0 = Math.atan2(p.x - C.x, p.z - C.z) - C.rot, r = Math.max(1.6, Math.min(2.4, dc));
        hero.climb = { ride: () => { const a = a0 + C.rot; return new T.Vector3(C.x + Math.sin(a) * r, C.y + 0.36, C.z + Math.cos(a) * r); }, t: 0, dur: 14, exit: new T.Vector3(0, 3, 0) };
        st.armed = false; st.cool = 1; ev.sfx.push('boing'); ev.say = '🎠 Поехали по кругу!<small>нажми прыжок — спрыгнешь</small>';
      }
    }
    if (!on) st.armed = true;                                      // сошёл — можно снова
  }
  // мыльные пузыри: вылетают из машины, плывут и поднимаются; коснулся — лопнул
  if ((st.bubT -= dt) <= 0 && st.bubbles.length < 16) {
    st.bubT = 0.55;
    const r = 0.35 + Math.random() * 0.35, m = new T.Mesh(BUB, BUB_MAT[Math.floor(Math.random() * BUB_MAT.length)]); m.scale.setScalar(r);
    m.position.set(st.bub.x, st.bub.y, st.bub.z); scene.add(m);
    const a = Math.random() * Math.PI * 2, sp = 0.7 + Math.random() * 0.9;
    st.bubbles.push({ m, r, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 0.25 + Math.random() * 0.3, life: 14, ph: Math.random() * 6 });
  }
  for (let i = st.bubbles.length - 1; i >= 0; i--) {
    const b = st.bubbles[i], q = b.m.position;
    b.life -= dt; q.x += b.vx * dt; q.z += b.vz * dt; q.y += b.vy * dt + Math.sin(t * 2 + b.ph) * 0.01;
    const hit = Math.hypot(p.x - q.x, p.z - q.z) < b.r + 0.6 && q.y > p.y - b.r && q.y < p.y + 2 + b.r;
    if (hit || b.life <= 0) {
      scene.remove(b.m); st.bubbles.splice(i, 1);
      if (hit) {
        puff('✨', q.clone(), { size: 0.9, life: 0.6 }); ev.sfx.push('pop'); ev.coins = (ev.coins || 0) + 1;
        if (++st.pops % 10 === 0) ev.say = `🫧 Ты лопнул уже ${st.pops} пузырей!`;
      }
    } else if (b.life < 1) b.m.scale.setScalar(b.r * b.life);
  }
  // надувной мяч: лёгкий — высоко подпрыгивает
  if (stepBall(st.ball, dt, hero, { kick: 11, lift: 7, friction: 0.7, bounce: 0.7, box: { x0: -44, x1: 44, z0: -3, z1: 63 } })) ev.sfx.push('boing');
  return ev;
}
