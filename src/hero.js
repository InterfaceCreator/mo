// Герой в стиле аватара Roblox: ноги, туловище, руки — бруски, голова с причёской.
import { group, box, damp } from './engine.js';

export const HERO_H = 2.75;   // рост вместе с волосами — для столкновений и камеры

const LOOKS = {
  boy: { skin: 0xffd3a6, shirt: 0x2a2a30, pants: 0x1f1f24, shoes: 0xffffff, hair: 0x17161c, print: 0xdedede },
  girl: { skin: 0xffd9b8, shirt: 0xff7ac8, pants: 0x3f6fd8, shoes: 0xffffff, hair: 0x7a4422, print: 0xffffff, long: true },
};
export const LOOK_OF = { motya: 'boy', mama: 'girl' };

export function buildHero(parent, lookId = 'boy') {
  const root = group(parent), body = group(root);
  const L = LOOKS[lookId] || LOOKS.boy;

  // ноги — точка вращения в бедре
  const legL = group(body, -0.25, 1.0, 0), legR = group(body, 0.25, 1.0, 0);
  for (const leg of [legL, legR]) {
    box(leg, 0.48, 0.82, 0.5, L.pants, 0, -0.41, 0);
    box(leg, 0.5, 0.2, 0.58, L.shoes, 0, -0.9, 0.04);
  }
  // туловище (худи) с принтом
  const torso = box(body, 1.0, 1.0, 0.52, L.shirt, 0, 1.5, 0);
  box(body, 0.34, 0.3, 0.02, L.print, 0.12, 1.55, 0.27, { shadow: false });
  box(body, 0.6, 0.12, 0.54, L.shirt, 0, 2.0, 0);                       // капюшон-воротник

  // руки — точка вращения в плече
  const armL = group(body, -0.75, 1.95, 0), armR = group(body, 0.75, 1.95, 0);
  for (const arm of [armL, armR]) {
    box(arm, 0.48, 0.78, 0.5, L.shirt, 0, -0.36, 0);
    box(arm, 0.44, 0.22, 0.46, L.skin, 0, -0.86, 0);
  }

  // голова
  const head = group(body, 0, 2.36, 0);
  box(head, 0.7, 0.64, 0.66, L.skin, 0, 0, 0);
  box(head, 0.62, 0.7, 0.58, L.skin, 0, 0, 0);                           // скруглённые края
  // глаза и улыбка
  for (const sx of [-1, 1]) {
    box(head, 0.1, 0.17, 0.03, 0x1a1a1a, sx * 0.15, 0.04, 0.34, { shadow: false });
    box(head, 0.04, 0.05, 0.02, 0xffffff, sx * 0.15 - 0.02, 0.09, 0.355, { shadow: false });
  }
  box(head, 0.18, 0.04, 0.03, 0x1a1a1a, 0, -0.14, 0.34, { shadow: false });
  for (const sx of [-1, 1]) box(head, 0.05, 0.04, 0.03, 0x1a1a1a, sx * 0.1, -0.11, 0.34, { shadow: false });

  // волосы: шапка, затылок и торчащие пряди, как у мальчика на скриншотах
  const hair = group(head, 0, 0, 0);
  box(hair, 0.78, 0.2, 0.74, L.hair, 0, 0.36, -0.02);
  box(hair, 0.78, 0.5, 0.16, L.hair, 0, 0.14, -0.33);
  for (const sx of [-1, 1]) box(hair, 0.1, 0.36, 0.6, L.hair, sx * 0.37, 0.16, -0.04);
  [[-0.24, 0.2], [-0.08, 0.26], [0.08, 0.22], [0.24, 0.18]].forEach(([x, h], i) => {
    const s = box(hair, 0.18, h, 0.12, L.hair, x, 0.22 - h * 0.2, 0.33); s.rotation.z = (i - 1.5) * 0.12;
  });
  if (L.long) {
    // длинные волосы до плеч и ресницы
    box(hair, 0.82, 0.95, 0.16, L.hair, 0, -0.12, -0.36);
    for (const sx of [-1, 1]) { box(hair, 0.12, 0.8, 0.5, L.hair, sx * 0.4, -0.08, -0.1); box(head, 0.06, 0.04, 0.03, 0x1a1a1a, sx * 0.2, 0.15, 0.345, { shadow: false }); }
  } else for (const [x, z, r] of [[-0.2, -0.1, -0.4], [0.05, 0.05, 0.1], [0.24, -0.15, 0.45], [0, -0.3, -0.1]]) {
    const s = box(hair, 0.22, 0.24, 0.22, L.hair, x, 0.5, z); s.rotation.z = r; s.rotation.x = -0.3;
  }

  // инструменты в правой руке: рукоять вдоль локальной оси z, рабочая часть смотрит в −y (туда, куда бьёт удар)
  const grip = group(armR, 0, -0.86, 0.05); grip.rotation.x = 0.9;
  const tools = {};
  tools.axe = group(grip);
  box(tools.axe, 0.1, 0.1, 1.2, 0x8a5a2b, 0, 0, 0.42);
  box(tools.axe, 0.1, 0.5, 0.32, 0xb9c2cc, 0, -0.18, 0.92); box(tools.axe, 0.12, 0.08, 0.34, 0xe8eef4, 0, -0.42, 0.92, { shadow: false });
  box(tools.axe, 0.12, 0.16, 0.18, 0x7d868f, 0, 0.1, 0.92);
  tools.pick = group(grip);
  box(tools.pick, 0.1, 0.1, 1.2, 0x8a5a2b, 0, 0, 0.42);
  box(tools.pick, 0.12, 0.9, 0.16, 0x9aa4ad, 0, 0, 0.98);
  for (const sy of [-1, 1]) { const t = box(tools.pick, 0.1, 0.22, 0.14, 0xd8dee4, 0, sy * 0.5, 0.94, { shadow: false }); t.rotation.x = sy * 0.4; }
  for (const k in tools) tools[k].visible = false;
  // зонтик над головой (виден, когда герой планирует)
  const umbrella = group(body, 0, 3.0, 0);
  box(umbrella, 0.08, 1.1, 0.08, 0x6a3f1e, 0, 0.2, 0);
  [[2.2, 0.18, 0], [1.6, 0.18, 0.18], [0.9, 0.18, 0.36]].forEach(([w, h, y], i) => box(umbrella, w, h, w, i % 2 ? 0xffffff : 0xff4a6a, 0, 0.8 + y, 0, { studs: false }));
  umbrella.visible = false;

  return { root, body, legL, legR, armL, armR, head, torso, tools, umbrella, phase: 0, lean: 0 };
}

// замах инструментом: p — от 0 до 1. Замах над головой → удар вперёд → назад в «готовность»
const ease = t => t * t * (3 - 2 * t);
function swingArm(p) {
  if (p < 0.45) return -0.45 + (-3.0 + 0.45) * ease(p / 0.45);
  if (p < 0.6) return -3.0 + (3.0 - 0.75) * ((p - 0.45) / 0.15);
  return -0.75 + 0.3 * ease((p - 0.6) / 0.4);
}

// анимация: speed — скорость по земле, air — в воздухе
export function animateHero(m, dt, { speed = 0, maxSpeed = 1, air = false, vy = 0, carry = false, stun = false, tool = null, swing = -1, glide = false } = {}) {
  animMove(m, dt, speed, maxSpeed, air, vy);
  // планирует на зонтике: держит его обеими руками над головой, ноги болтаются
  m.umbrella.visible = glide; m.umbrella.position.y = carry ? 4.4 : 3.0;     // с яйцом в руках зонтик выше яйца
  if (glide) {
    m.armL.rotation.x = m.armR.rotation.x = -3.0; m.armL.rotation.z = -0.15; m.armR.rotation.z = 0.15;
    m.legL.rotation.x = Math.sin(performance.now() / 150) * 0.4; m.legR.rotation.x = -m.legL.rotation.x;
  }
  // инструмент в руке: держит наготове или бьёт обеими руками
  for (const k in m.tools) m.tools[k].visible = k === tool && !carry;
  if (tool && !carry) {
    if (swing >= 0) {
      const a = swingArm(swing);
      m.armR.rotation.x = a; m.armL.rotation.x = a * 0.9;
      m.armR.rotation.z = -0.1; m.armL.rotation.z = 0.45;        // левая рука тянется к рукояти
      m.body.rotation.x = swing < 0.45 ? -0.12 * ease(swing / 0.45) : swing < 0.65 ? 0.2 : damp(m.body.rotation.x, 0, 8, dt);
    } else if (speed < 1) {
      m.armR.rotation.x = damp(m.armR.rotation.x, -0.45, 12, dt);
    }
  }
  // несёт яйцо над головой — руки вверх
  if (carry) {
    m.armL.rotation.x = m.armR.rotation.x = -2.95;
    m.armL.rotation.z = -0.12; m.armR.rotation.z = 0.12;
  }
  // поймали — плюхнулся и сплющился
  const sy = stun ? 0.6 : 1;
  m.body.scale.y = damp(m.body.scale.y, sy, stun ? 20 : 8, dt);
  m.body.scale.x = m.body.scale.z = damp(m.body.scale.x, stun ? 1.25 : 1, stun ? 20 : 8, dt);
}
function animMove(m, dt, speed, maxSpeed, air, vy) {
  const k = Math.min(speed / maxSpeed, 1.3);
  if (air) {
    // прыжок: руки вверх, одна нога вперёд
    m.armL.rotation.x = damp(m.armL.rotation.x, -2.6, 14, dt); m.armR.rotation.x = damp(m.armR.rotation.x, -2.6, 14, dt);
    m.armL.rotation.z = damp(m.armL.rotation.z, -0.25, 14, dt); m.armR.rotation.z = damp(m.armR.rotation.z, 0.25, 14, dt);
    m.legL.rotation.x = damp(m.legL.rotation.x, vy > 0 ? -0.7 : -0.3, 12, dt); m.legR.rotation.x = damp(m.legR.rotation.x, 0.3, 12, dt);
    m.body.position.y = damp(m.body.position.y, 0, 12, dt);
  } else if (k > 0.05) {
    m.phase += dt * (6 + 7 * k);
    const s = Math.sin(m.phase), a = 0.35 + 0.65 * Math.min(k, 1);
    m.legL.rotation.x = s * a; m.legR.rotation.x = -s * a;
    m.armL.rotation.x = -s * a; m.armR.rotation.x = s * a;
    m.armL.rotation.z = damp(m.armL.rotation.z, 0, 14, dt); m.armR.rotation.z = damp(m.armR.rotation.z, 0, 14, dt);
    m.body.position.y = Math.abs(Math.cos(m.phase)) * 0.12 * a;
  } else {
    // стоит: лёгкое «дыхание»
    m.phase += dt * 2;
    for (const p of [m.legL, m.legR]) p.rotation.x = damp(p.rotation.x, 0, 12, dt);
    m.armL.rotation.x = damp(m.armL.rotation.x, Math.sin(m.phase) * 0.05, 10, dt); m.armR.rotation.x = damp(m.armR.rotation.x, -Math.sin(m.phase) * 0.05, 10, dt);
    m.armL.rotation.z = damp(m.armL.rotation.z, 0, 10, dt); m.armR.rotation.z = damp(m.armR.rotation.z, 0, 10, dt);
    m.body.position.y = damp(m.body.position.y, 0, 10, dt);
  }
  // при беге чуть наклоняется вперёд
  m.lean = damp(m.lean, air ? 0 : 0.12 * Math.min(k, 1), 8, dt); m.body.rotation.x = m.lean;
}
