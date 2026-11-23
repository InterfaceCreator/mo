// Жители базы 🏘 и ребята в аквапарке 🎢 — у каждого свой распорядок, с каждым можно поговорить (💬, chat.js).
//   👵 Бабушка Нина — сидит на лавочке у поперечной дорожки и вяжет;
//   👴 Дедушка Иван — садовник: ходит с лейкой от клумбы к сосне, дубу и фонтану, поливает;
//   📮 Почтальон Пётр — ходит по дорожкам: почтовый ящик, домик, арка в аквапарк, детская площадка;
//   👧👦 Даша и Егор — на детской площадке: догонялки, Егор ещё лазает по лесенке и спрыгивает;
//   🏊 Лёша, Вика и Ника — в аквапарке: по лестнице на башню, с горки (спираль, труба, камикадзе) — плюх! — плавают и снова наверх.
// Далеко от героя (за туманом) жители «спят» — не обсчитываются.
import { T, scene, group, box, dampAngle } from './engine.js';
import { solid, onLevelReset } from './world.js';
import { makeLabel, puff } from './fx.js';
import { buildHero, compactHero, animateHero } from './hero.js';
import { SLIDES, POOL, TOWER_P } from './park.js';
import { riding } from './dragon.js';

const V = (x, z, y = 0) => ({ x, z, y });
const pick = a => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);
let st = null;
export const villageNpcs = () => st?.npcs || [];
onLevelReset(() => { st = null; });

// облики
const LOOK = {
  nina: { skin: 0xf6d0b0, shirt: 0x9b6bff, pants: 0x5a3a6a, shoes: 0x6a3f1e, sole: 0x3a2a1a, hair: 0xd8d8d8, hairHi: 0xf0f0f0, style: 'crop', hat: 'scarf', hatC: 0xff7ac8, apron: 0xffd0e0, cheeks: true },
  ivan: { skin: 0xf2c29a, shirt: 0x4a8a4a, pants: 0x5a4a3a, shoes: 0x3a2a1a, sole: 0x1a1a1a, hair: 0xb0b0b0, hairHi: 0xd0d0d0, style: 'crop', hat: 'cap', hatC: 0xd8a040, beard: 0xd0d0d0, apron: 0x8a5a2b },
  petr: { skin: 0xf8d0ae, shirt: 0x3a6ad8, pants: 0x2b2b3a, shoes: 0x1d1d23, sole: 0x111114, hair: 0x6a3a1a, hairHi: 0x8a5a2a, style: 'crop', hat: 'cap', hatC: 0x3a6ad8 },
  dasha: { skin: 0xffdcc0, shirt: 0xffd23f, pants: 0xff7ac8, shoes: 0xffffff, sole: 0xff7ac8, hair: 0xc8762a, hairHi: 0xe8a050, style: 'long', cheeks: true, shorts: true },
  egor: { skin: 0xffd9b8, shirt: 0x4ad04a, pants: 0x3a6ad8, shoes: 0xff5a5a, sole: 0xffffff, hair: 0x2a1a10, hairHi: 0x4a2a18, style: 'crop', hat: 'cap', hatC: 0xff5a5a },
  lyosha: { skin: 0xffd9b8, shirt: 0x3fb8ff, pants: 0x3fb8ff, shoes: 0xffffff, sole: 0xffffff, hair: 0xf2c24a, hairHi: 0xffe08a, style: 'crop', shorts: true },
  vika: { skin: 0xf8d0ae, shirt: 0xff5a8a, pants: 0xff5a8a, shoes: 0xffffff, sole: 0xffffff, hair: 0x3a2318, hairHi: 0x55341f, style: 'long', shorts: true, cheeks: true },
  nika: { skin: 0xffe0c8, shirt: 0x9b6bff, pants: 0x9b6bff, shoes: 0xffffff, sole: 0xffffff, hair: 0xf2d27a, hairHi: 0xfff0b0, style: 'long', shorts: true },
};
export const PEOPLE_INFO = {
  nina: { name: 'Бабушка Нина', kind: 'adult', scale: 1 }, ivan: { name: 'Дедушка Иван', kind: 'adult', scale: 1 }, petr: { name: 'Почтальон Пётр', kind: 'adult', scale: 1 },
  dasha: { name: 'Даша', kind: 'kid', scale: 0.8 }, egor: { name: 'Егор', kind: 'kid', scale: 0.8 },
  lyosha: { name: 'Лёша', kind: 'kid', scale: 0.8 }, vika: { name: 'Вика', kind: 'kid', scale: 0.8 }, nika: { name: 'Ника', kind: 'kid', scale: 0.8 },
};

// ---------- житель: модель, подпись, очередь дел ----------
function npc(id, x, z) {
  const I = PEOPLE_INFO[id], g = group(scene, x, 0, z); g.userData.dynamic = true;
  const m = compactHero(buildHero(g, LOOK[id])); m.root.scale.setScalar(I.scale);
  const lb = makeLabel(3.2, 0.8); lb.position.y = 3.4 * I.scale + 0.4; g.add(lb); lb.userData.set(I.name, { color: I.kind === 'kid' ? '#ffffff' : '#ffe0c0' });
  const n = { lb, lbY: lb.position.y, id, name: I.name, kind: I.kind, g, m, pos: g.position, face: 0, tasks: [], speed: 2, pose: 'stand', t: 0, ph: Math.random() * 6, busy: false };
  st.npcs.push(n); return n;
}
// дела: { go: точка, spd, y(n) — высота по пути }, { wait: сек, pose, face }, { slide: горка }, { fly: скорость }
const go = (x, z, o = {}) => ({ go: V(x, z), ...o });
const wait = (s, pose = 'stand', face) => ({ wait: s, pose, face });

// лавочка
function bench(w, x, z, rot) {
  const g = group(w, x, 0, z); g.rotation.y = rot;
  box(g, 2.6, 0.14, 0.7, 0x9c6a3c, 0, 0.6, 0); box(g, 2.6, 0.6, 0.12, 0x9c6a3c, 0, 1, -0.32);
  for (const sx of [-1, 1]) box(g, 0.14, 0.6, 0.6, 0x6a3f1e, sx * 1.05, 0.3, 0);
  solid(w, 2.6, 0.6, 0.7, 0x9c6a3c, x, 0, z).visible = false;
}

// ---------- распорядки ----------
const STAIR_X = TOWER_P.x, STAIR_Z0 = 69.1, STAIR_Z1 = 81, TOP = TOWER_P.h;
const stairY = z => z < STAIR_Z0 ? 0 : z >= STAIR_Z1 ? TOP : Math.floor((z - STAIR_Z0) / 0.85) + 1;
const LADDER_X = 56, LADDER_Z0 = 20.5;                   // лесенка из кубиков на детской площадке
const ladderY = z => z < LADDER_Z0 ? 0 : z > 39 ? 0 : Math.min(5, Math.floor((z - LADDER_Z0) / 3) + 1);
const inPool = (x, z) => x > POOL.x0 && x < POOL.x1 && z > POOL.z0 && z < POOL.z1;

const PLANS = {
  nina: n => [wait(30, 'knit', 0)],
  // садовник: туда-обратно по своему кругу (не через верстак), у каждого места поливает
  ivan: n => {
    const P = [[-12, 57.2, Math.PI * 0], [-12, 45.6, 0], [22, 46, 0], [14, 57.2, 0]];
    n.k = ((n.k ?? -1) + 1) % 6; const i = [0, 1, 2, 3, 2, 1][n.k], [x, z, f] = P[i];
    return [go(x, z, { spd: 1.6 }), wait(rnd(4, 6), 'water', f)];
  },
  // почтальон: по дорожкам
  petr: n => {
    const R = [[1, 1], [1, 29, Math.PI / 2], [1, 42.9], [-36.6, 42.9], [-36.6, 52.6, 0], [-36.6, 42.9], [1, 42.9], [1, 64, 0], [1, 42.9], [30, 42.9, Math.PI / 2], [1, 42.9], [1, 29]];
    n.k = ((n.k ?? -1) + 1) % R.length; const [x, z, f] = R[n.k];
    return f !== undefined ? [go(x, z, { spd: 2.2 }), wait(rnd(2, 3.5), 'stand', f)] : [go(x, z, { spd: 2.2 })];
  },
  // Даша и Егор: догонялки (один убегает, другой ловит); Егор иногда лезет на лесенку и спрыгивает
  dasha: n => [go(rnd(36, 60), rnd(8, 28), { spd: 3.6 }), wait(rnd(0.3, 1))],
  egor: n => {
    if (Math.random() < 0.3) return [go(LADDER_X, LADDER_Z0 - 1, { spd: 3 }), go(LADDER_X, 38, { spd: 2.2, y: z => ladderY(z) }), wait(1.2, 'cheer', 0), { hop: V(LADDER_X, 40.5) }, go(48, 18, { spd: 3 })];
    const D = st.byId.dasha; return [{ chase: D, spd: 4.2, t: rnd(3, 6) }, wait(0.6, 'cheer')];
  },
  // аквапарк: из воды — к лестнице, наверх, к коврику горки, вниз — плюх, поплавать
  swim: n => {
    const T = [];
    if (n.pos.y < 0 || inPool(n.pos.x, n.pos.z)) {                                 // в воде: немного поплавать и вылезти у западного края
      T.push(go(rnd(POOL.x0 + 1, POOL.x0 + 12), rnd(POOL.z0 + 2, POOL.z1 - 2), { spd: 1.3, y: () => POOL.floor, swim: true }));
      const ez = rnd(POOL.z0 + 2, POOL.z0 + 10);
      T.push(go(POOL.x0 + 0.6, ez, { spd: 1.5, y: () => POOL.floor, swim: true }), go(POOL.x0 - 1.4, ez, { spd: 2 }));
    }
    const S = pick(SLIDES);
    T.push(go(-13, 70.2, { spd: 2.6 }), go(STAIR_X, 68.4, { spd: 2.6 }), go(STAIR_X, STAIR_Z1 + 0.6, { spd: 2.2, y: z => stairY(z) }));
    T.push(go(S.pad.x, S.pad.z, { spd: 2, y: () => TOP }), wait(rnd(0.5, 2), 'cheer'), { slide: S });
    return T;
  },
};

export function buildVillage(w, save) {
  st = { npcs: [], byId: {}, save };
  // лавочки: бабушкина у поперечной дорожки (в деревеньке) и на детской площадке
  // лавочки: бабушкина у поперечной дорожки (в деревеньке) и в детском парке развлечений
  bench(w, -26, 45.8, Math.PI);
  bench(w, 42, 16, Math.PI / 4);
  bench(w, 54, 16, -Math.PI / 4);
  bench(w, 42, 28, 3 * Math.PI / 4);
  const add = (id, x, z, plan) => { const n = npc(id, x, z); n.plan = plan || PLANS[id]; st.byId[id] = n; return n; };
  const nina = add('nina', -26, 45.9); nina.sit = true; nina.face = Math.PI; nina.pos.y = 0;
  add('ivan', -12, 57.2); add('petr', 1, 1);
  add('dasha', 46, 16); add('egor', 43, 15);
  for (const [id, x, z] of [['lyosha', -20, 70], ['vika', 10, 85], ['nika', 20, 95]]) { const n = add(id, x, z, PLANS.swim); if (inPool(x, z)) n.pos.y = POOL.floor; }
  return st;
}

// кто рядом (для 💬): не тот, кто катится с горки или висит в воздухе
export function nearVillager(p) {
  if (!st) return null;
  let best = null, bd = 1e9;
  for (const n of st.npcs) { if (n.busy) continue; const d = Math.hypot(n.pos.x - p.x, n.pos.z - p.z) + Math.abs(n.pos.y - p.y) * 0.5; if (d < 2.8 && d < bd) { bd = d; best = n; } }
  return best;
}

function stepNpc(n, dt, hero) {
  const now = performance.now() / 1000;
  // катается на драконе с Мотей: сидит на втором седле (модель меньше — поправка на рост), смотрит туда же
  if (n.rider) {
    if (!riding()) { n.rider = false; n.busy = false; n.tasks = [{ fly: new T.Vector3(0, 2, 0) }]; st.riderOff = n; return; }
    const s = n.m.root.scale.x, f = hero.face;
    n.pos.set(hero.pos.x - Math.sin(f) * 0.95 * (1 - s), hero.pos.y + 1.45 * (1 - s), hero.pos.z - Math.cos(f) * 0.95 * (1 - s));
    n.face = f; n.g.rotation.y = f; n.busy = true;
    animateHero(n.m, dt, { speed: 0, maxSpeed: 4, ride: 2 });
    return;
  }
  if (n.talking) {                                                // разговаривает — стоит (или сидит) и смотрит на героя
    if (!n.sit) n.face = Math.atan2(hero.pos.x - n.pos.x, hero.pos.z - n.pos.z);
    n.g.rotation.y = dampAngle(n.g.rotation.y, n.face, 8, dt);
    animateHero(n.m, dt, { speed: 0, maxSpeed: 4, sit: !!n.sit });
    return;
  }
  if (!n.tasks.length) n.tasks = n.plan(n);
  const A = n.tasks[0];
  let spd = 0, sit = !!n.sit;
  n.busy = false;
  if (A.go) {
    const p = A.go, dx = p.x - n.pos.x, dz = p.z - n.pos.z, d = Math.hypot(dx, dz), s = (A.spd || n.speed) * dt;
    if (d <= s) { n.pos.x = p.x; n.pos.z = p.z; n.tasks.shift(); } else { n.pos.x += dx / d * s; n.pos.z += dz / d * s; n.face = Math.atan2(dx, dz); spd = A.spd || n.speed; }
    n.pos.y = A.y ? A.y(n.pos.z) : 0;
    if (A.swim && Math.random() < dt * 2.5) puff(Math.random() < 0.5 ? '💦' : '💧', new T.Vector3(n.pos.x + Math.sin(n.face) * 0.8, POOL.surf + 0.3, n.pos.z + Math.cos(n.face) * 0.8), { size: 0.45, rise: 0.7, life: 0.5 });
  } else if (A.wait !== undefined) {
    if (A.face !== undefined) n.face = A.face;
    n.pose = A.pose; A.wait -= dt; if (A.wait <= 0) { n.tasks.shift(); n.pose = 'stand'; }
  } else if (A.chase) {
    const D = A.chase, dx = D.pos.x - n.pos.x, dz = D.pos.z - n.pos.z, d = Math.hypot(dx, dz), s = A.spd * dt;
    A.t -= dt;
    if (d > 0.9) { n.pos.x += dx / d * s; n.pos.z += dz / d * s; n.face = Math.atan2(dx, dz); spd = A.spd; }
    if (d < 0.95 || A.t <= 0) { n.tasks.shift(); if (d < 0.95) puff('😆', n.pos.clone().setY(2.6), { size: 0.9 }); }
  } else if (A.hop) {                                            // спрыгнуть с лесенки
    A.k = (A.k || 0) + dt / 0.6; const k = Math.min(1, A.k), from = A.from || (A.from = n.pos.clone());
    n.pos.x = from.x + (A.hop.x - from.x) * k; n.pos.z = from.z + (A.hop.z - from.z) * k; n.pos.y = from.y * (1 - k) + Math.sin(k * Math.PI) * 1.5;
    n.busy = true; if (k >= 1) { n.pos.y = 0; n.tasks.shift(); puff('💨', n.pos.clone().setY(0.4), { size: 1 }); }
  } else if (A.slide) {                                          // с горки: по той же траектории, что и герой
    const S = A.slide; A.k = (A.k || 0) + dt / S.dur; const k = Math.min(1, A.k);
    const q = S.curve.getPointAt(Math.min(1, S.prof(k))), q2 = S.curve.getPointAt(Math.min(1, S.prof(Math.min(1, k + 0.02))));
    n.pos.set(q.x, q.y + 0.3, q.z); if (q2.distanceTo(q) > 0.001) n.face = Math.atan2(q2.x - q.x, q2.z - q.z);
    sit = true; n.busy = true;
    if (k >= 1) {
      const tg = S.curve.getTangentAt(1), [fw, up] = S.exit, boost = S.jump ? rnd(1.2, 2.2) : 1;
      n.tasks.shift(); n.tasks.unshift({ fly: new T.Vector3(tg.x * fw * boost, up * (S.jump ? rnd(1, 1.6) : 1), tg.z * fw * boost) });
    }
  } else if (A.fly) {                                            // летит в бассейн
    A.fly.y -= 34 * dt; n.pos.addScaledVector(A.fly, dt); n.busy = true; sit = true;
    const wet = inPool(n.pos.x, n.pos.z), floor = wet ? POOL.floor : 0;   // упал в бассейн или на землю (спрыгнул с дракона)
    if (n.pos.y <= floor + 0.2) {
      n.pos.y = floor; n.tasks.shift();
      if (!wet) { puff('💨', n.pos.clone().setY(0.4), { size: 1.2 }); n.tasks = []; }
      else for (let i = 0; i < 8; i++) puff(i % 3 ? '💦' : '💧', new T.Vector3(n.pos.x + rnd(-1.5, 1.5), POOL.surf + 0.4 + Math.random() * 1.4, n.pos.z + rnd(-1.5, 1.5)), { size: 1.2, rise: 1.6, life: 0.9 });
      if (wet && Math.hypot(hero.pos.x - n.pos.x, hero.pos.z - n.pos.z) < 25) st.splash = true;
    }
  }
  n.g.rotation.y = dampAngle(n.g.rotation.y, n.face, 10, dt);
  const swimming = !!A.swim || (A.wait !== undefined && n.pos.y < -0.5);
  n.lb.position.y = swimming ? 1.6 : n.lbY;                                  // плывёт — подпись ниже, у головы
  animateHero(n.m, dt, { speed: spd, maxSpeed: 4, sit, air: !!(A.fly || A.hop), swim: swimming });
  // позы: вяжет (руки шевелятся), поливает (рука вперёд + капли), радуется (руки вверх)
  if (n.pose === 'knit') { n.m.armL.rotation.x = -0.9 + Math.sin(now * 6) * 0.15; n.m.armR.rotation.x = -0.9 - Math.sin(now * 6) * 0.15; }
  if (n.pose === 'water') { n.m.armR.rotation.x = -1.2; if (Math.random() < dt * 8) puff('💧', n.pos.clone().add(new T.Vector3(Math.sin(n.face) * 1.3, 1 + Math.random() * 0.4, Math.cos(n.face) * 1.3)), { size: 0.4, rise: -2, life: 0.5 }); }
  if (n.pose === 'cheer') { n.m.armL.rotation.x = n.m.armR.rotation.x = -2.8; }
}

// раз в кадр (на базе). Вернёт { splash } — кто-то рядом плюхнулся в бассейн (звук)
export function updateVillage(dt, hero) {
  if (!st) return {};
  st.splash = false; st.riderOff = null;
  const talkOpen = document.getElementById('talk')?.classList.contains('on');
  for (const n of st.npcs) {
    if (n.talking && !talkOpen) n.talking = false;
    if (!n.rider && Math.hypot(n.pos.x - hero.pos.x, n.pos.z - hero.pos.z) > 75) continue;      // далеко — «спит»
    stepNpc(n, dt, hero);
  }
  return { splash: st.splash, riderOff: st.riderOff };
}

// посадить ребёнка на дракона позади героя (герой уже на драконе)
export function takeRider(n) { if (!st) return; for (const o of st.npcs) o.rider = false; n.rider = true; n.talking = false; n.tasks = []; n.sit = false; }
export const rider = () => st?.npcs.find(n => n.rider) || null;
