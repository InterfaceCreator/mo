// Герой в стиле аватара Roblox: ноги, туловище, руки — бруски, голова с причёской.
import { group, box, damp, mergeMeshes } from './engine.js';

export const HERO_H = 2.75;   // рост вместе с волосами — для столкновений и камеры

// облики по фото: Мотя — русый «ёжик» с чёлкой, чёрное поло с молнией и белым логотипом, чёрные штаны, белые кроссовки;
// мама — длинные тёмные волосы, белый свитер оверсайз с красными сердечками, белые шорты в сердечко, белые носки
const LOOKS = {
  boy: { skin: 0xffd9b8, shirt: 0x1d1d23, pants: 0x18181d, shoes: 0xf6f6f6, sole: 0xd8d8d8, hair: 0x9a6a35, hairHi: 0xc49559, style: 'crop', polo: true },
  girl: { skin: 0xf8c9a8, shirt: 0xfbfaf6, pants: 0xf9f5f0, shoes: 0xffffff, sole: 0xffffff, hair: 0x3a2318, hairHi: 0x55341f, style: 'long', hearts: 0xb3142f, shorts: true, wide: true },
};
export const LOOK_OF = { motya: 'boy', mama: 'girl' };
// жители-люди: та же модель, свои вещи — hat ('cap' | 'scarf'), beard, apron, stripes (спортивный костюм), whistle
export const PEOPLE = {
  galya: { skin: 0xf6c9a6, shirt: 0x9b6bff, pants: 0x3a4a7a, shoes: 0x6a3f1e, sole: 0x4a2a12, hair: 0x7a4a2a, hairHi: 0x7a4a2a, style: 'crop', hat: 'scarf', hatC: 0xff5a7a, apron: 0xffffff, cheeks: true },
  gena: { skin: 0xf2c29a, shirt: 0x3fa7ff, pants: 0x2a5aa8, shoes: 0x4a3424, sole: 0x2a1a10, hair: 0x7a7a7a, hairHi: 0x7a7a7a, style: 'crop', hat: 'cap', hatC: 0xff7b22, beard: 0x8a8a8a, apron: 0x8a5a2b },
  misha: { skin: 0xf8d0ae, shirt: 0xd8261a, pants: 0xd8261a, shoes: 0xffffff, sole: 0xd8d8d8, hair: 0x2a1a10, hairHi: 0x2a1a10, style: 'crop', hat: 'cap', hatC: 0xffffff, stripes: 0xffffff, whistle: 0xffd23f },
  scarecrow: { skin: 0xf2d28a, shirt: 0xc0392b, pants: 0x3a5aa8, shoes: 0x8a5a2b, sole: 0x5a3a1a, hair: 0xe8c45a, hairHi: 0xffe08a, style: 'crop', hat: 'cap', hatC: 0x6a4a2a, apron: 0xe8c45a },   // пугало: соломенное, в клетчатой рубахе
  vanya: { skin: 0xffd9b8, shirt: 0x2fbf4a, pants: 0x3a6ad8, shoes: 0xff3b3b, sole: 0xffffff, hair: 0xf2c24a, hairHi: 0xffe08a, style: 'crop' },
  // дети — ровесники Моти, у каждого своя игра (kids.js)
  sonya: { skin: 0xffdcc0, shirt: 0xff7ac8, pants: 0xffffff, shoes: 0xff3b8a, sole: 0xffffff, hair: 0xc8762a, hairHi: 0xe8a050, style: 'long', shorts: true, cheeks: true },
  alisa: { skin: 0xf8d0ae, shirt: 0xffd23f, pants: 0x3fa7ff, shoes: 0x3fa7ff, sole: 0xffffff, hair: 0xf2d27a, hairHi: 0xfff0b0, style: 'long', hat: 'scarf', hatC: 0xff7b22 },
  timur: { skin: 0xe8b48a, shirt: 0xff7b22, pants: 0x5a3a1a, shoes: 0x2b2b33, sole: 0xffffff, hair: 0x1d1410, hairHi: 0x3a2a20, style: 'crop', hat: 'cap', hatC: 0x2e8b57 },
  masha: { skin: 0xffe0c8, shirt: 0x9b6bff, pants: 0xff7ac8, shoes: 0xffffff, sole: 0xffd23f, hair: 0x5a3a20, hairHi: 0x7a5232, style: 'long', hearts: 0xffd23f, cheeks: true },
  petya: { skin: 0xffd9b8, shirt: 0x3fa7ff, pants: 0x1d1d23, shoes: 0x5fd35f, sole: 0xffffff, hair: 0xa0522d, hairHi: 0xc8763a, style: 'crop', stripes: 0xffffff },
  kolya: { skin: 0xffd4b0, shirt: 0xe2442a, pants: 0xffffff, shoes: 0x1d1d23, sole: 0xffffff, hair: 0xf2c24a, hairHi: 0xffe08a, style: 'crop', stripes: 0xffffff, shorts: true },
  olya: { skin: 0xffd4b0, shirt: 0xe2442a, pants: 0xffffff, shoes: 0x1d1d23, sole: 0xffffff, hair: 0xf2c24a, hairHi: 0xffe08a, style: 'long', stripes: 0xffffff, shorts: true },
};

// пиксельное сердечко на плоскости: две «горки» и ромбик; face — 'z+' спереди, 'z-' сзади, 'x+'/'x-' сбоку
function heart(p, color, x, y, z, s, face = 'z+') {
  const g = group(p, x, y, z);
  if (face === 'z-') g.rotation.y = Math.PI; else if (face === 'x+') g.rotation.y = Math.PI / 2; else if (face === 'x-') g.rotation.y = -Math.PI / 2;
  // пиксель-арт 5×4: ▪▪·▪▪ / ▪▪▪▪▪ / ·▪▪▪· / ··▪··
  const u = s / 5, rows = ['11011', '11111', '01110', '00100'];
  rows.forEach((r, j) => { for (let i = 0; i < 5; i++) if (r[i] === '1') box(g, u * 1.02, u * 1.02, 0.02, color, (i - 2) * u, (1.5 - j) * u, 0, { shadow: false, studs: false }); });
  return g;
}

export function buildHero(parent, lookId = 'boy') {
  const root = group(parent), body = group(root);
  const L = typeof lookId === 'object' ? lookId : LOOKS[lookId] || LOOKS.boy;
  const TW = L.wide ? 1.1 : 1.0, TH = L.wide ? 1.12 : 1.0, TY = L.wide ? 1.46 : 1.5, AW = L.wide ? 0.52 : 0.48;   // свитер оверсайз — шире и длиннее

  // ноги — точка вращения в бедре
  const legL = group(body, -0.25, 1.0, 0), legR = group(body, 0.25, 1.0, 0);
  for (const leg of [legL, legR]) {
    if (L.shorts) {
      // короткие шорты, ниже — ноги и белые носки
      box(leg, 0.5, 0.3, 0.52, L.pants, 0, -0.13, 0);
      for (const [dx, dy] of [[-0.12, -0.2], [0.12, -0.2]]) box(leg, 0.05, 0.05, 0.02, 0xe0607a, dx, dy, 0.265, { shadow: false, studs: false });   // мелкие сердечки на шортах
      box(leg, 0.42, 0.42, 0.44, L.skin, 0, -0.48, 0);
      box(leg, 0.44, 0.14, 0.46, 0xffffff, 0, -0.73, 0);
    } else box(leg, 0.48, 0.82, 0.5, L.pants, 0, -0.41, 0);
    box(leg, 0.5, 0.2, 0.58, L.shoes, 0, -0.9, 0.04);
    box(leg, 0.52, 0.06, 0.6, L.sole, 0, -0.98, 0.04, { shadow: false });
  }
  // туловище
  const torso = box(body, TW, TH, 0.52, L.shirt, 0, TY, 0);
  if (L.polo) {
    // воротник поло, молния, белая футболка под ним и логотип на груди
    box(body, 0.24, 0.07, 0.02, 0xffffff, 0, 1.95, 0.27, { shadow: false, studs: false });
    for (const sx of [-1, 1]) { const c = box(body, 0.26, 0.16, 0.06, L.shirt, sx * 0.15, 1.92, 0.28, { shadow: false }); c.rotation.z = sx * 0.5; }
    box(body, 0.04, 0.34, 0.02, 0xb9bec6, 0, 1.73, 0.27, { shadow: false, studs: false });
    box(body, 0.06, 0.08, 0.03, 0xd8dde4, 0, 1.58, 0.275, { shadow: false, studs: false });
    box(body, 0.1, 0.13, 0.02, 0xffffff, 0.24, 1.7, 0.27, { shadow: false, studs: false });
    box(body, 0.62, 0.12, 0.54, L.shirt, 0, 2.0, 0);                      // воротник сзади
  } else box(body, 0.6, 0.12, 0.54, L.shirt, 0, 2.0, 0);
  if (L.hearts) {
    // сердечки на свитере: спереди, сзади
    for (const [x, y] of [[-0.1, 1.82], [0.12, 1.55], [-0.12, 1.3], [0.36, 1.05], [-0.34, 1.0]]) heart(body, L.hearts, x, y, 0.27, 0.2);   // не под прядями волос
    for (const [x, y] of [[0.25, 1.75], [-0.28, 1.4], [0.1, 1.1]]) heart(body, L.hearts, x, y, -0.27, 0.2, 'z-');
  }

  // руки — точка вращения в плече
  const armL = group(body, -(TW / 2 + AW / 2 + 0.01), 1.95, 0), armR = group(body, TW / 2 + AW / 2 + 0.01, 1.95, 0);
  for (const [arm, side] of [[armL, -1], [armR, 1]]) {
    box(arm, AW, 0.78, 0.5, L.shirt, 0, -0.36, 0);
    box(arm, 0.44, 0.22, 0.46, L.skin, 0, -0.86, 0);
    if (L.hearts) heart(arm, L.hearts, side * (AW / 2 + 0.011), -0.3, 0, 0.2, side > 0 ? 'x+' : 'x-');
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

  const hair = group(head, 0, 0, 0);
  if (L.style === 'crop') {
    // короткая стрижка: шапочка, короткий затылок, чёлка набок; светлые кончики сверху
    box(hair, 0.76, 0.18, 0.72, L.hair, 0, 0.37, -0.02);
    box(hair, 0.76, 0.36, 0.14, L.hair, 0, 0.2, -0.33);
    for (const sx of [-1, 1]) box(hair, 0.08, 0.26, 0.56, L.hair, sx * 0.37, 0.22, -0.06);
    const f = box(hair, 0.64, 0.12, 0.14, L.hair, -0.03, 0.27, 0.32); f.rotation.z = 0.08;
    box(hair, 0.66, 0.06, 0.6, L.hairHi, 0, 0.48, 0.02);                    // выгоревшие кончики сверху
    for (const [x, z] of [[-0.16, 0.14], [0.12, 0.2], [0.02, -0.08]]) box(hair, 0.14, 0.06, 0.14, L.hairHi, x, 0.53, z);
  } else {
    // длинные волосы: макушка с пробором, по бокам, сзади ниже лопаток и две пряди спереди на груди
    box(hair, 0.78, 0.2, 0.74, L.hair, 0, 0.36, -0.02);
    box(hair, 0.4, 0.14, 0.14, L.hair, 0.16, 0.27, 0.32);                    // чёлка набок (пробор)
    box(hair, 0.22, 0.1, 0.14, L.hairHi, -0.2, 0.3, 0.32);
    for (const sx of [-1, 1]) box(hair, 0.1, 0.72, 0.62, L.hair, sx * 0.4, -0.02, -0.06);
    box(hair, 0.84, 1.55, 0.16, L.hair, 0, -0.42, -0.37);
    box(hair, 0.6, 0.2, 0.12, L.hairHi, 0, -1.15, -0.38);
    for (const sx of [-1, 1]) {
      box(hair, 0.18, 0.95, 0.12, L.hair, sx * 0.34, -0.62, 0.33);            // пряди спереди на свитере
      box(head, 0.1, 0.06, 0.02, 0xffa3a3, sx * 0.24, -0.08, 0.34, { shadow: false, studs: false });   // румянец
    }
  }
  // вещи жителей
  if (L.cheeks) for (const sx of [-1, 1]) box(head, 0.1, 0.06, 0.02, 0xffa3a3, sx * 0.24, -0.08, 0.34, { shadow: false, studs: false });
  if (L.hat === 'cap') {                                                   // кепка с козырьком
    box(head, 0.8, 0.22, 0.76, L.hatC, 0, 0.44, -0.02); box(head, 0.7, 0.06, 0.34, L.hatC, 0, 0.35, 0.48);
  } else if (L.hat === 'scarf') {                                          // платок: закрывает волосы, узелок сзади
    box(head, 0.8, 0.24, 0.76, L.hatC, 0, 0.42, -0.02);
    for (const sx of [-1, 1]) box(head, 0.08, 0.5, 0.62, L.hatC, sx * 0.39, 0.16, -0.06);
    box(head, 0.8, 0.5, 0.12, L.hatC, 0, 0.18, -0.37); box(head, 0.2, 0.2, 0.16, L.hatC, 0, -0.08, -0.46);
    for (const [x, y] of [[-0.2, 0.42], [0.15, 0.44], [0, 0.2]]) box(head, 0.06, 0.06, 0.02, 0xffffff, x, y, 0.37, { shadow: false, studs: false });
  }
  if (L.beard) {                                                           // борода и усы
    box(head, 0.66, 0.24, 0.08, L.beard, 0, -0.22, 0.33); box(head, 0.32, 0.06, 0.04, L.beard, 0, -0.09, 0.36, { shadow: false });
    for (const sx of [-1, 1]) box(head, 0.08, 0.3, 0.3, L.beard, sx * 0.33, -0.1, 0.18);
  }
  if (L.apron) {                                                           // фартук с кармашком
    box(body, TW * 0.8, TH * 0.78, 0.04, L.apron, 0, TY - TH * 0.08, 0.27, { shadow: false });
    box(body, 0.34, 0.2, 0.03, L.apron === 0xffffff ? 0xffd0e0 : 0x6a3f1e, 0, TY - TH * 0.25, 0.3, { shadow: false });
  }
  if (L.stripes) {                                                         // спортивный костюм: лампасы на руках и ногах
    for (const leg of [legL, legR]) for (const sx of [-1, 1]) box(leg, 0.02, 0.8, 0.08, L.stripes, sx * 0.245, -0.41, 0, { shadow: false, studs: false });
    for (const arm of [armL, armR]) for (const sx of [-1, 1]) box(arm, 0.02, 0.76, 0.08, L.stripes, sx * (AW / 2 + 0.005), -0.36, 0, { shadow: false, studs: false });
  }
  if (L.whistle) {                                                         // свисток на шнурке
    box(body, 0.02, 0.4, 0.02, 0x222222, 0, 1.78, 0.275, { shadow: false, studs: false }); box(body, 0.14, 0.08, 0.08, L.whistle, 0, 1.56, 0.29, { shadow: false });
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
  tools.shovel = group(grip);                                              // лопата: черенок, ручка-перекладина и штык
  box(tools.shovel, 0.1, 0.1, 1.3, 0x8a5a2b, 0, 0, 0.45, { studs: false }); box(tools.shovel, 0.36, 0.1, 0.1, 0x6a3f1e, 0, 0, -0.2, { studs: false });
  box(tools.shovel, 0.46, 0.07, 0.55, 0x9aa4ad, 0, 0, 1.33, { studs: false }); box(tools.shovel, 0.3, 0.08, 0.12, 0xd8dee4, 0, 0, 1.6, { studs: false, shadow: false });
  tools.venik = group(grip);                                               // банный веник: ручка и пучок листьев
  box(tools.venik, 0.09, 0.09, 0.55, 0x8a5a2b, 0, 0, 0.2, { studs: false });
  box(tools.venik, 0.36, 0.22, 0.7, 0x4a9a3a, 0, 0, 0.78, { studs: false }); box(tools.venik, 0.26, 0.3, 0.5, 0x5fbf4a, 0, 0.02, 0.92, { studs: false, shadow: false });
  tools.kovsh = group(grip);                                               // ковшик: длинная ручка и черпак с водой
  box(tools.kovsh, 0.08, 0.08, 0.75, 0x9c6a3c, 0, 0, 0.3, { studs: false });
  box(tools.kovsh, 0.36, 0.3, 0.36, 0xa8743f, 0, -0.08, 0.8, { studs: false }); box(tools.kovsh, 0.28, 0.04, 0.28, 0x3fa7ff, 0, 0.08, 0.8, { studs: false, shadow: false });
  for (const k in tools) tools[k].visible = false;
  // зонтик над головой (виден, когда герой планирует)
  const umbrella = group(body, 0, 3.0, 0);
  box(umbrella, 0.08, 1.1, 0.08, 0x6a3f1e, 0, 0.2, 0);
  [[2.2, 0.18, 0], [1.6, 0.18, 0.18], [0.9, 0.18, 0.36]].forEach(([w, h, y], i) => box(umbrella, w, h, w, i % 2 ? 0xffffff : 0xff4a6a, 0, 0.8 + y, 0, { studs: false }));
  umbrella.visible = false;

  return { root, body, legL, legR, armL, armR, head, hair, torso, tools, umbrella, phase: 0, lean: 0, dims: { TW, TH, TY, AW }, skin: L.skin };
}

// Житель собран из ~50 кусочков (глаза, пуговицы, волосы…) — склеиваем те, что двигаются вместе:
// голова со всем, что на ней, туловище с одеждой, каждая рука и нога. Анимация та же, рисовать в разы легче.
// Только для жителей: одежду на склеенной модели уже не переодеть (герой и второй игрок переодеваются — их не трогаем)
export function compactHero(m) {
  if (m.compact) return m;
  const piv = [m.root, m.body, m.legL, m.legR, m.armL, m.armR, m.head];
  const stop = new Set([...piv, ...Object.values(m.tools), m.umbrella]);
  const o = m.outfit;
  if (o) { if (o.cape) stop.add(o.cape); if (o.balloons) stop.add(o.balloons); if (o.flame) stop.add(o.flame); for (const w of o.wings) stop.add(w.w); }
  for (const p of piv) {
    const list = [];
    (function walk(n) { for (const c of n.children) { if (stop.has(c) || !c.visible) continue; if (c.isMesh) list.push(c); walk(c); } })(p);
    mergeMeshes(p, list, { split: true });
  }
  m.compact = true;
  return m;
}

// замах инструментом: p — от 0 до 1. Замах над головой → удар вперёд → назад в «готовность»
const ease = t => t * t * (3 - 2 * t);
function swingArm(p) {
  if (p < 0.45) return -0.45 + (-3.0 + 0.45) * ease(p / 0.45);
  if (p < 0.6) return -3.0 + (3.0 - 0.75) * ((p - 0.45) / 0.15);
  return -0.75 + 0.3 * ease((p - 0.6) / 0.4);
}

// анимация: speed — скорость по земле, air — в воздухе
export function animateHero(m, dt, { speed = 0, maxSpeed = 1, air = false, vy = 0, carry = false, stun = false, tool = null, swing = -1, glide = false, sit = false, ride = false, swim = false, spa = null, spaK = 0, dacha = null, dachaK = 0, sleep = false } = {}) {
  animMove(m, dt, speed, maxSpeed, air, vy);
  if (ride) {                                                              // верхом на драконе: сидит в седле, ноги по бокам, руки вперёд; ride 2 — сзади, на втором седле
    m.body.position.y = 1.45; m.body.position.z = ride === 2 ? -0.95 : 0; m.legL.rotation.x = m.legR.rotation.x = -1.1; m.legL.rotation.z = -0.45; m.legR.rotation.z = 0.45;
    m.armL.rotation.x = m.armR.rotation.x = -1.0; m.armL.rotation.z = -0.15; m.armR.rotation.z = 0.15;
  } else { m.legL.rotation.z = m.legR.rotation.z = 0; m.body.position.z = 0; }
  if (sit && !sleep) {                                                               // сидит за партой / скамейкой / на качелях: ноги вперёд, руки на столе/коленях
    m.legL.rotation.x = m.legR.rotation.x = -1.45; m.body.position.y = -0.36;
    m.armL.rotation.x = m.armR.rotation.x = -1.1; m.armL.rotation.z = m.armR.rotation.z = 0;
  }
  if (sleep) {
    m.body.rotation.x = -Math.PI / 2 + 0.05;
    m.body.position.y = 0.36 + Math.sin((m.sleepT = (m.sleepT || 0) + dt * 1.5)) * 0.03;
    m.body.position.z = -0.55;
    m.legL.rotation.x = m.legR.rotation.x = 0.04;
    m.legL.rotation.z = -0.06; m.legR.rotation.z = 0.06;
    m.armL.rotation.x = m.armR.rotation.x = -0.35;
    m.armL.rotation.z = -0.22; m.armR.rotation.z = 0.22;
    m.head.rotation.x = 0.22;
  }
  if (m.outfit) m.outfit.animate(dt, speed, air);                         // одежда из магазина: плащ развевается, крылья машут (clothes.js)
  // планирует на зонтике: держит его обеими руками над головой, ноги болтаются
  m.umbrella.visible = glide; m.umbrella.position.y = carry ? 4.4 : 3.0;     // с яйцом в руках зонтик выше яйца
  if (glide) {
    m.armL.rotation.x = m.armR.rotation.x = -3.0; m.armL.rotation.z = -0.15; m.armR.rotation.z = 0.15;
    m.legL.rotation.x = Math.sin(performance.now() / 150) * 0.4; m.legR.rotation.x = -m.legL.rotation.x;
  }
  // инструмент в руке: держит наготове или бьёт обеими руками (прячем, когда сидит или спит)
  for (const k in m.tools) m.tools[k].visible = k === tool && !carry && !sit && !sleep;
  if (tool && !carry && !sit && !sleep) {
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
  // баня и джакузи (spa.js): парится веником, плещет ковшиком на камни, отдыхает в пузырьках, брызгается
  if (spa) {
    const t = m.spaT = (m.spaT || 0) + dt;
    if (spa === 'venik') {                                                 // сидит на полке и хлещет себя веником по плечу и спине
      m.tools.venik.visible = true;
      m.armR.rotation.x = -2.5 + Math.sin(t * 8) * 0.7; m.armR.rotation.z = -0.35 + Math.sin(t * 8) * 0.25;
      m.armL.rotation.x = -0.5; m.armL.rotation.z = -0.15;
      m.body.rotation.x = 0.08 + Math.sin(t * 8) * 0.05;
    } else if (spa === 'kovsh') {                                          // зачерпнул — замах — плеснул вперёд на камни
      m.tools.kovsh.visible = true;
      const k = Math.min(1, spaK), a = k < 0.45 ? -0.3 - 0.5 * ease(k / 0.45) : k < 0.65 ? -0.8 - 1.2 * ease((k - 0.45) / 0.2) : -2.0 + 1.5 * ease((k - 0.65) / 0.35);
      m.armR.rotation.x = a; m.armR.rotation.z = 0.05; m.armL.rotation.x = -0.3;
      m.body.rotation.x = k > 0.45 && k < 0.8 ? 0.15 : 0.03;
    } else if (spa === 'jac' || spa === 'splash') {                        // откинулся на бортик, руки раскинуты, покачивается на воде
      m.body.rotation.x = -0.28; m.body.position.y += Math.sin(t * 1.6) * 0.05;
      if (spa === 'splash') {                                              // шлёпает ладошками по воде
        m.armL.rotation.x = -0.9 + Math.sin(t * 14) * 0.6; m.armR.rotation.x = -0.9 - Math.sin(t * 14) * 0.6;
        m.armL.rotation.z = -0.5; m.armR.rotation.z = 0.5;
      } else {
        m.armL.rotation.x = m.armR.rotation.x = -0.15 + Math.sin(t * 1.6) * 0.04; m.armL.rotation.z = -1.35; m.armR.rotation.z = 1.35;
        m.legL.rotation.x = -1.45 + Math.sin(t * 1.3) * 0.12; m.legR.rotation.x = -1.45 - Math.sin(t * 1.3) * 0.12;   // болтает ногами в воде
      }
    }
  }
  // чаепитие и жарка маршмеллоу на даче (dacha.js)
  if (dacha) {
    if (dacha === 'tea') {
      m.armL.rotation.x = -1.1; m.armL.rotation.z = -0.15;
      const sip = Math.max(0, Math.sin(dachaK * Math.PI * 4));
      m.armR.rotation.x = -1.1 - sip * 1.15;
      m.armR.rotation.z = -0.15 - sip * 0.3;
      m.head.rotation.x = sip * 0.18;
    } else if (dacha === 'marsh') {
      m.armL.rotation.x = -1.0; m.armL.rotation.z = -0.2;
      if (dachaK < 0.72) {
        m.armR.rotation.x = -1.45 + Math.sin(dachaK * Math.PI * 6) * 0.08;
        m.armR.rotation.z = -0.12;
        m.head.rotation.x = 0.15;
      } else {
        const eat = Math.sin((dachaK - 0.72) / 0.28 * Math.PI);
        m.armR.rotation.x = -1.45 - eat * 0.85;
        m.armR.rotation.z = -0.25 - eat * 0.2;
        m.head.rotation.x = eat * 0.2;
      }
    }
  }
  // плывёт: лёг на воду животом, гребёт руками по очереди (кроль), болтает ногами; чуть покачивается на волне
  if (swim) {
    m.swimT = (m.swimT || 0) + dt * (speed > 0.3 ? 5 : 2.2);
    const t = m.swimT;
    // тело поворачивается вокруг ступней: поднимаем к поверхности (стоим на дне — вода по пояс) и сдвигаем назад, чтобы пловец был по центру
    m.body.rotation.x = 1.35; m.body.position.y = 0.55 + Math.sin(t * 0.8) * 0.05; m.body.position.z = -1.3;
    m.armL.rotation.x = -(t % (Math.PI * 2)); m.armR.rotation.x = -((t + Math.PI) % (Math.PI * 2));
    m.armL.rotation.z = -0.15; m.armR.rotation.z = 0.15;
    m.legL.rotation.x = Math.sin(t * 2.6) * 0.45; m.legR.rotation.x = -Math.sin(t * 2.6) * 0.45;
    m.head.rotation.x = -0.9;                                             // голову поднимает над водой
  } else if (!dacha && !sleep && m.head.rotation.x) m.head.rotation.x = Math.abs(m.head.rotation.x) < 0.01 ? 0 : damp(m.head.rotation.x, 0, 10, dt);   // после плавания, сна, чая — голова обратно прямо
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
