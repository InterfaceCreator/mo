// Свой дракон Моти 🐉: подарок «за то, что лёг спать как герой».
// На базе стоит огромная коробка с бантом — подошёл, она лопается конфетти, и появляется дракон.
// Кнопка 🐉 — сесть / слезть. На драконе прыжок — взмах крыльями (летишь вверх), джойстик — куда лететь,
// кнопка 🔥 — дыхнуть огнём. Дракон «прикреплён» к герою, поэтому летает с ним и через порталы.
// Вдвоём по сети: мама видит Мотиного дракона и может сесть сзади — Мотя её катает (второе седло).
import { T, scene, group, box, mat } from './engine.js';
import { onLevelReset } from './world.js';
import { puff, confetti, makeLabel } from './fx.js';

export const GIFT = { x: 0, z: 27 };                 // прямо на дорожке перед точкой появления — не пропустишь
// расцветки: зелёный — Мотин, красный — мамин (подарок)
const PAL = {
  green: { body: 0x2fae6a, dark: 0x1f8a50, belly: 0xffe08a, wing: 0xff7a3a, wingDark: 0xd8501a, horn: 0xffd23f, saddle: 0xd8261a },
  red: { body: 0xd8261a, dark: 0x9a1410, belly: 0xffd8a0, wing: 0xffb03a, wingDark: 0xff7a1a, horn: 0xfff0b0, saddle: 0xffffff },
};
export const SADDLE_Y = 2.4;                 // где сидит герой (над землёй)

let gift = null, D = null, fireT = 0;
onLevelReset(() => { gift = null; });

// дракон смотрит вперёд (+z): тело, шея и голова, хвост, четыре лапы, крылья, седло
function buildModel(parent, color) {
  const C = PAL[color] || PAL.green;
  const g = group(parent, 0, 0, 0), body = group(g, 0, 0, 0);
  box(body, 1.8, 1.4, 3.2, C.body, 0, 1.6, 0); box(body, 1.5, 0.3, 2.8, C.belly, 0, 0.98, 0.05);
  const legs = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const L = group(body, sx * 0.7, 1.1, sz * 1.05); box(L, 0.55, 1.1, 0.65, C.dark, 0, -0.55, 0); box(L, 0.6, 0.2, 0.8, C.belly, 0, -1.0, 0.1); legs.push(L); }
  const neck = box(body, 0.8, 0.8, 1.5, C.body, 0, 2.55, 1.9); neck.rotation.x = -0.65;
  const head = group(body, 0, 3.15, 2.75);
  box(head, 1.1, 0.9, 1.3, C.body, 0, 0, 0); box(head, 0.85, 0.5, 0.8, C.body, 0, -0.15, 0.9); box(head, 0.75, 0.16, 0.7, C.belly, 0, -0.38, 0.85);
  for (const sx of [-1, 1]) {
    box(head, 0.06, 0.26, 0.26, 0xffffff, sx * 0.56, 0.12, 0.25); box(head, 0.07, 0.14, 0.14, 0x1d1d23, sx * 0.57, 0.1, 0.3);
    const h = box(head, 0.16, 0.5, 0.16, C.horn, sx * 0.3, 0.6, -0.4); h.rotation.x = -0.5;
    box(head, 0.1, 0.08, 0.06, 0x1d1d23, sx * 0.16, -0.05, 1.31, { shadow: false });   // ноздри
  }
  for (let i = 0; i < 4; i++) box(body, 0.14, 0.32, 0.3, C.horn, 0, 2.38, -1.55 - i * 0.45);   // шипы на спине (за седлом)
  const tail = group(body, 0, 1.55, -1.6);
  let t = tail; [[0.8, 1.1], [0.6, 1.0], [0.45, 0.9], [0.3, 0.8]].forEach(([s, l], i) => { const seg = group(t, 0, 0, i ? -l : 0); box(seg, s, s, l, C.body, 0, 0, -l / 2); t = seg; });
  const spade = box(t, 0.7, 0.12, 0.6, C.horn, 0, 0, -0.95); spade.rotation.y = 0.78;
  const wings = [];
  for (const sx of [-1, 1]) {
    const w = group(body, sx * 0.85, 2.2, 0.3);
    box(w, 3.2, 0.14, 0.2, C.dark, sx * 1.6, 0.05, 0.9);                                    // кость крыла
    box(w, 3.0, 0.08, 1.9, C.wing, sx * 1.5, 0, 0); box(w, 1.4, 0.09, 1.2, C.wingDark, sx * 2.4, 0, -0.3);
    wings.push({ w, sx });
  }
  box(body, 1.1, 0.25, 1.1, C.saddle, 0, 2.38, 0.1); box(body, 1.12, 0.35, 0.2, C.saddle, 0, 2.55, 0.65);   // седло
  box(body, 1.0, 0.22, 0.9, 0xff7ac8, 0, 2.37, -0.95);                                                     // второе седло — для мамы
  return { g, body, legs, head, tail, wings, phase: 0 };
}

// ---------- подарок на базе ----------
export function buildGift(save, who) {
  if (save.dragon?.got) return;
  const mama = who === 'mama';                                       // маме — красный дракон в розовой коробке
  const g = group(scene, GIFT.x, 0, GIFT.z); g.userData.dynamic = true;
  const b = group(g, 0, 0, 0);
  const bc = mama ? 0xff9ac8 : 0x9b6bff, rc = mama ? 0xd8261a : 0xffd23f;
  box(b, 2.6, 2.4, 2.6, bc, 0, 1.2, 0); box(b, 2.7, 2.5, 0.5, rc, 0, 1.2, 0); box(b, 0.5, 2.5, 2.7, rc, 0, 1.2, 0);
  for (const sx of [-1, 1]) { const bw = box(b, 1.1, 0.7, 0.3, rc, sx * 0.55, 2.75, 0); bw.rotation.z = sx * 0.4; }
  const lb = makeLabel(5.5, 1.4); lb.position.set(GIFT.x, 4.6, GIFT.z); scene.add(lb); lb.userData.set(mama ? '🎁 Подарок для Юли ❤️' : '🎁 Подарок для Моти!', { color: mama ? '#ffd0e8' : '#ffe14d' });
  gift = { g, b, lb, t: 0 };
}
// вернёт true — коробку открыли
export function updateGift(dt, hero) {
  if (!gift) return false;
  const G = gift; G.t += dt;
  G.b.position.y = Math.abs(Math.sin(G.t * 3)) * 0.35; G.b.rotation.y = Math.sin(G.t * 1.3) * 0.15;
  if (Math.random() < dt * 4) puff('✨', new T.Vector3(GIFT.x + (Math.random() - 0.5) * 3, 1 + Math.random() * 3, GIFT.z + (Math.random() - 0.5) * 3), { size: 0.7, rise: 0.8 });
  if (Math.hypot(hero.pos.x - GIFT.x, hero.pos.z - GIFT.z) < 2.4) {
    scene.remove(G.g); scene.remove(G.lb); gift = null;
    confetti(new T.Vector3(GIFT.x, 2, GIFT.z), 220);
    return true;
  }
  return false;
}

// ---------- сесть / слезть ----------
export const riding = () => !!D;
// дракон на любом герое (свой или второго игрока): makeDragon(root) → animDragon(d, dt, {...})
export function makeDragon(root, color) { const d = buildModel(root, color); d.g.scale.setScalar(0.01); d.grow = 0; d.fireT = 0; return d; }
export function dropDragon(root, d) { if (d) root.remove(d.g); }
export function mount(hero, color) {
  if (D) return;
  D = makeDragon(hero.model.root, color);
  hero.fly = true;
  confetti(hero.pos.clone().setY(2), 60);
}
export function dismount(hero) {
  if (!D) return;
  hero.model.root.remove(D.g); D = null; hero.fly = false;
  puff('💨', hero.pos.clone().setY(1), { size: 1.4, rise: 0.6 });
}
export function breathe(d = D) { if (d) d.fireT = 0.8; }

// раз в кадр: крылья машут (в воздухе — сильно, на взмахе — быстро), лапы шагают по земле, огонь из пасти.
// st: { air, vy, speed, pos, face } — что делает тот, кто на драконе
export function animDragon(d, dt, st) {
  d.grow = Math.min(1, d.grow + dt * 3); d.g.scale.setScalar(0.3 + 0.7 * (1 - Math.pow(1 - d.grow, 3)));
  const air = st.air, up = st.vy > 1, now = performance.now();
  d.phase += dt * (air ? (up ? 16 : 7) : 2);
  for (const { w, sx } of d.wings) w.rotation.z = sx * (air ? Math.sin(d.phase) * (up ? 0.8 : 0.45) + 0.1 : 0.55 + Math.sin(d.phase) * 0.05);
  const walk = !air && st.speed > 0.5, s = Math.sin(now / 110);
  d.legs.forEach((L, i) => { L.rotation.x = air ? -0.5 : walk ? (i % 3 === 0 ? s : -s) * 0.6 : 0; });
  d.body.position.y = walk ? Math.abs(s) * 0.12 : air ? Math.sin(d.phase * 0.5) * 0.08 : 0;
  d.tail.rotation.y = Math.sin(now / 400) * 0.25; d.tail.rotation.x = air ? -0.2 : 0.15;
  d.head.rotation.x = d.fireT > 0 ? -0.15 : Math.sin(now / 600) * 0.05;
  if (d.fireT > 0) {
    d.fireT -= dt;
    if (Math.random() < dt * 30) {
      const f = st.face, k = 4.2 + Math.random() * 3, side = (Math.random() - 0.5) * 1.2;
      const p = new T.Vector3(st.pos.x + Math.sin(f) * k + Math.cos(f) * side, st.pos.y + 3 + Math.random() * 0.8, st.pos.z + Math.cos(f) * k - Math.sin(f) * side);
      puff(Math.random() < 0.8 ? '🔥' : '💥', p, { size: 1 + Math.random() * 0.8, rise: 0.6, life: 0.6 });
    }
  }
}
export function updateDragon(dt, hero) {
  if (D) animDragon(D, dt, { air: !hero.grounded, vy: hero.vel.y, speed: hero.speed, pos: hero.pos, face: hero.face });
}
