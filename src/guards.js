// Сторожа: спят у гнезда, просыпаются, когда яйцо украли, смешно гонятся до границы своей территории.
// Поймали — забирают яйцо и идут спать. Никого не обижают.
// Территория (zone у гнезда): { kind: 'corridor', x0, x1, border } — коридор до красной полосы,
// { kind: 'track', x0, x1, border } — Дорожка: то же, но у линии зверь не останавливается, а закручивается и исчезает,
// или { kind: 'ring', x, z, R } — круг вокруг гнезда.
import { B } from './balance.js';
import { T, scene, group, box, damp, dampAngle, clamp, compactModel } from './engine.js';
import { buildGorilla, buildBeast, buildBird, buildDino, setEyes, animateAnimal } from './animals.js';
import { spawnZ, puff } from './fx.js';
import { onLevelReset, groundY, level, nearColliders } from './world.js';

const KINDS = {
  capy: { s: 2, build: p => buildBeast(p, { body: 0x9a6a3c, head: 0x8a5a2e, snout: 0x6e4422, ear: 'round', w: 1, h: 0.8, d: 1.5, hd: 0.75, leg: 0.32 }) },
  goose: { s: 2.1, build: p => buildBird(p, { body: 0xffffff, beak: 0xff9f1a, neck: 0.5, wing: 0xeeeeee }) },
  dino: { s: 2.3, build: p => buildDino(p, { body: 0x5fbf5a, belly: 0xc8f0a0, spikes: 0xffd93b }) },
  lizard: { s: 2.2, build: p => buildDino(p, { body: 0xff9a3d, belly: 0xffe0a0, spikes: 0xff3b1a }) },
  peng: { s: 2.2, build: p => buildBird(p, { body: 0x2b2b3a, beak: 0xffa31a, wing: 0x1e1e2a, legC: 0xffa31a }) },
  boar: { s: 2, build: p => buildBeast(p, { body: 0x6a4a34, head: 0x7a5a40, snout: 0xc89a7a, nose: 0x3a2a2a, tusks: true, ear: 'point', quills: 0x4a3424, tail: 'stub', w: 1, h: 0.75, d: 1.4, hd: 0.7, leg: 0.32 }) },
  deer: { s: 1.9, build: p => buildBeast(p, { body: 0xb5793e, antlers: 0xe8d4b0, spots: 0xf2e2c4, ear: 'point', snout: 0xe0b080, tail: 'stub', leg: 0.6, w: 0.75, d: 1.2 }) },
  brownbear: { s: 2.1, build: p => buildBeast(p, { body: 0x7a4a24, snout: 0xc89a6a, ear: 'round', w: 1.1, h: 0.9, d: 1.5, hd: 0.8, leg: 0.4 }) },
  dragon: { s: 3.6, build: p => buildDino(p, { body: 0xd8261a, belly: 0xffb020, spikes: 0xffd23f, wings: 0xff6a1a }) },   // босс Дорожки (1-й круг)
  icedragon: { s: 3.8, build: p => buildDino(p, { body: 0x5fb8f0, belly: 0xe8f8ff, spikes: 0xffffff, wings: 0xbfe9ff }) },   // 2-й круг
  golddragon: { s: 4.0, build: p => buildDino(p, { body: 0xffb81a, belly: 0xfff3a0, spikes: 0xff7a1a, wings: 0xffe14d }) },  // 3-й и дальше
  gorilla: { s: 1.6, build: p => buildGorilla(p) },                                           // бьёт себя в грудь, когда заметит
  bear: { s: 2.1, build: p => buildBeast(p, { body: 0xf4f8ff, snout: 0xdfe8f5, ear: 'round', w: 1.1, h: 0.9, d: 1.5, hd: 0.8, leg: 0.4 }) },
};

// банановые шкурки и ловушки: сторож наступил — поскользнулся (банан) или сидит в клетке (ловушка)
const bananas = [];
export function dropBanana(pos, mesh, kind = 'banana') { bananas.push({ x: pos.x, z: pos.z, mesh, kind, t: 25 }); }
function updateBananas(dt) {
  for (let i = bananas.length - 1; i >= 0; i--) if ((bananas[i].t -= dt) <= 0) { scene.remove(bananas[i].mesh); bananas.splice(i, 1); }
}
function bananaUnder(p, r) {
  const i = bananas.findIndex(b => Math.hypot(b.x - p.x, b.z - p.z) < r);
  if (i < 0) return null;
  const kind = bananas[i].kind;
  scene.remove(bananas[i].mesh); bananas.splice(i, 1); return kind;
}

export const guards = [];
onLevelReset(() => { guards.length = 0; bananas.length = 0; });

// герой уже в безопасности? В коридоре — за красной полосой; на открытом месте — у портала
// (зелёный круг) или очень далеко от гнезда: сторож не бежит через весь лес
const LEASH = 70;
function safe(zn, p) {
  if (zn.kind !== 'ring') return p.z > zn.border;
  const S = level.safe;
  return (S && Math.hypot(p.x - S.x, p.z - S.z) < S.r) || Math.hypot(p.x - zn.x, p.z - zn.z) > LEASH;
}
// в коридоре сторож не выходит за полосу; на открытом месте — не заходит в зелёный круг
function keepIn(zn, p) {
  if (zn.kind !== 'ring') { p.x = clamp(p.x, zn.x0 + 1, zn.x1 - 1); p.z = Math.min(p.z, zn.border - (zn.kind === 'track' ? 0 : 0.8)); return; }
  const S = level.safe; if (!S) return;
  const dx = p.x - S.x, dz = p.z - S.z, d = Math.hypot(dx, dz), m = S.r + 1;
  if (d < m && d > 0.01) { p.x = S.x + dx / d * m; p.z = S.z + dz / d * m; }
}

// сторож тоже упирается в деревья, камни и стены (низкие ступеньки перешагивает), но скользит вдоль них
function bump(p, r) {
  for (const c of nearColliders(p.x - r, p.x + r, p.z - r, p.z + r)) {
    if (c.off || c.ghost || c.y1 <= p.y + 1.05 || c.y0 >= p.y + 2.5) continue;
    const nx = Math.max(c.x0, Math.min(p.x, c.x1)), nz = Math.max(c.z0, Math.min(p.z, c.z1));
    const dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.z += dz * k; }
  }
}

export function buildGuards(nests) {
  for (const n of nests) {
    if (!n.guard) continue;
    const K = KINDS[n.guard], g = group(scene), m = K.build(g);
    const s = K.s * (n.s > 1 ? 1.15 : 1); m.root.scale.setScalar(s); compactModel(m);
    // спит рядом с гнездом: в коридоре — ближе к середине, на открытом месте — в сторону центра карты
    const zn = n.zone, home = new T.Vector3();
    if (zn.kind === 'ring') { const d = Math.hypot(n.x, n.z) || 1; home.set(n.x - n.x / d * 3.4, 0, n.z - n.z / d * 3.4); }
    else { const dx = n.x - (zn.x0 + zn.x1) / 2; home.set(dx ? n.x - Math.sign(dx) * 3.4 : n.x, 0, dx ? n.z : n.z + 4.5); }
    home.y = groundY(home.x, home.z);
    g.position.copy(home);
    const face = Math.atan2(n.x - home.x, n.z - home.z);
    const gd = { nest: n, g, m, s, home, face, state: 'sleep', t: Math.random() * 2, speed: n.chase || B.CHASE[n.r] };
    sleepPose(gd, true); guards.push(gd);
  }
}

// клетка вокруг попавшегося сторожа
function cage(gd) {
  const c = group(gd.g), r = gd.s * 0.9, h = gd.s * 1.6;
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; box(c, 0.12, h, 0.12, 0x8a8f9a, Math.cos(a) * r, h / 2, Math.sin(a) * r, { studs: false }); }
  box(c, r * 2.1, 0.15, r * 2.1, 0x6a6f7a, 0, h, 0, { studs: false });
  return c;
}

function sleepPose(gd, on) {
  setEyes(gd.m, !on);
  gd.m.root.scale.y = gd.s * (on ? 0.82 : 1);
}

// Дорожка: у зверя унесли яйцо за линию — он бежит к линии, закручивается волчком и исчезает
export function vanishGuard(nest) {
  const gd = guards.find(g => g.nest === nest); if (!gd || gd.state === 'charge' || gd.state === 'vanish' || gd.state === 'gone') return;
  if (gd.cage) { gd.g.remove(gd.cage); gd.cage = null; }
  gd.m.body.rotation.z = 0; sleepPose(gd, false); gd.state = 'charge'; gd.t = 3;
}

export function wake(nest) {
  const gd = guards.find(g => g.nest === nest); if (!gd) return;
  gd.state = 'alert'; gd.t = 0.55; sleepPose(gd, false);
  puff(nest.guard === 'gorilla' ? '💪' : '❗', gd.g.position.clone().setY(gd.g.position.y + gd.s * 1.9), { size: 1.4, rise: 0.8, life: 0.9 });
  if (nest.guard === 'gorilla') puff('🦍', gd.g.position.clone().setY(gd.g.position.y + gd.s * 2.6), { size: 1.8, rise: 1, life: 1.2 });
}

// наблюдатель (duo.js): сторожа — как у игрока. [x, z, поворот, состояние]
const GST = ['sleep', 'alert', 'chase', 'slip', 'stomp', 'search', 'return', 'charge', 'vanish', 'gone'];
export const guardSnap = () => guards.map(gd => [+gd.g.position.x.toFixed(2), +gd.g.position.z.toFixed(2), +gd.face.toFixed(2), GST.indexOf(gd.state)]);
export function guardApply(list) {
  guards.forEach((gd, i) => {
    const v = list[i]; if (!v) return;
    gd.tx = v[0]; gd.tz = v[1]; gd.tf = v[2];
    const st = GST[v[3]] || 'sleep';
    if (st === gd.state) return;
    if ((st === 'sleep') !== (gd.state === 'sleep')) sleepPose(gd, st === 'sleep');
    if (st === 'alert') puff('❗', gd.g.position.clone().setY(gd.g.position.y + gd.s * 1.9), { size: 1.4, rise: 0.8, life: 0.9 });
    gd.state = st; gd.g.visible = st !== 'gone';
  });
}
// раз в кадр у наблюдателя: плавно к тому, где сторож у игрока
export function guardFollow(dt) {
  for (const gd of guards) {
    if (gd.tx === undefined || gd.state === 'gone') continue;
    const p = gd.g.position, dx = gd.tx - p.x, dz = gd.tz - p.z, d = Math.hypot(dx, dz);
    if (d > 6) { p.x = gd.tx; p.z = gd.tz; } else { p.x = damp(p.x, gd.tx, 10, dt); p.z = damp(p.z, gd.tz, 10, dt); }
    p.y = damp(p.y, groundY(p.x, p.z), 14, dt);
    gd.face = dampAngle(gd.face, gd.tf, 12, dt); gd.g.rotation.y = gd.face;
    if (gd.state === 'slip') gd.m.body.rotation.z = Math.sin(performance.now() / 110) * 0.35; else gd.m.body.rotation.z = 0;
    if (gd.state === 'stomp') gd.m.body.position.y = Math.abs(Math.sin(performance.now() / 70)) * 0.25;
    else if (gd.state !== 'sleep') animateAnimal(gd.m, dt, Math.min(d * 10, gd.speed * 1.3) / gd.s);
    else gd.m.body.position.y = damp(gd.m.body.position.y, 0, 5, dt);
  }
}
// hero: { pos, carrying }. Возвращает сторожа, который поймал героя, или null
export function updateGuards(dt, hero) {
  let caught = null;
  updateBananas(dt);
  for (const gd of guards) {
    if (gd.state === 'gone') continue;
    const p = gd.g.position, zn = gd.nest.zone, above = y => p.clone().setY(p.y + y);
    let spd = 0;
    if (gd.state === 'charge') {
      // несётся к линии; добежал (или долго бежит) — закручивается
      const dz = zn.border - p.z; spd = gd.speed * 1.15;
      if (dz > 0.4 && (gd.t -= dt) > 0) { p.z += Math.min(dz, spd * dt); p.x = damp(p.x, 0, 2, dt); gd.face = dampAngle(gd.face, 0, 10, dt); }
      else { gd.state = 'vanish'; gd.t = 1.2; puff('😵‍💫', above(gd.s * 1.9), { size: 1.4, rise: 0.6, life: 1.2 }); }
    } else if (gd.state === 'vanish') {
      // крутится всё быстрее, уменьшается и исчезает в облачке
      gd.t -= dt; const k = Math.max(0, gd.t / 1.2);
      gd.face += dt * (8 + (1 - k) * 30); gd.g.rotation.y = gd.face;
      gd.m.root.scale.setScalar(gd.s * (0.15 + 0.85 * k)); gd.g.position.y = p.y + (1 - k) * 1.5;
      if (gd.t <= 0) { gd.state = 'gone'; gd.g.visible = false; puff('💨', above(0.8), { size: 2.4, rise: 0.8, life: 1 }); puff('✨', above(1.6), { size: 1.6, rise: 1.4 }); }
      continue;
    } else if (gd.state === 'sleep') {
      gd.face = dampAngle(gd.face, Math.atan2(gd.nest.x - p.x, gd.nest.z - p.z), 3, dt);
      if ((gd.t -= dt) <= 0) { gd.t = 1.3; spawnZ(above(gd.s * 1.4), gd.s * 0.7); }
    } else if (gd.state === 'alert') {
      gd.face = dampAngle(gd.face, Math.atan2(hero.pos.x - p.x, hero.pos.z - p.z), 10, dt);
      if ((gd.t -= dt) <= 0) gd.state = 'chase';
    } else if (gd.state === 'chase') {
      // герой отдал яйцо или убежал со своей территории — погоня окончена
      if (!hero.carrying || hero.carrying.nest !== gd.nest || safe(zn, hero.pos)) { gd.state = 'stomp'; gd.t = 1.1; puff('😤', above(gd.s * 1.9), { size: 1.2 }); gd.search = 2.5; }
      else {
        const dx = hero.pos.x - p.x, dz = hero.pos.z - p.z, d = Math.hypot(dx, dz);
        spd = gd.speed * (d < B.LUNGE_R ? B.LUNGE : 1);          // вблизи — рывок
        if (d > 0.01) { p.x += dx / d * spd * dt; p.z += dz / d * spd * dt; }
        gd.face = dampAngle(gd.face, Math.atan2(dx, dz), 10, dt);
        if (d < 1.0 + gd.s * 0.35 && hero.pos.y - p.y < gd.s * 1.5) { caught = gd; gd.state = 'return'; gd.search = 0; puff('😊', above(gd.s * 1.9), { size: 1.2 }); }
        else {
          const hit = bananaUnder(p, 0.8 + gd.s * 0.3);
          if (hit === 'banana') { gd.state = 'slip'; gd.t = 1.8; puff('💫', above(gd.s * 1.6), { size: 1.4, rise: 0.4, life: 1.6 }); }
          if (hit === 'trap') { gd.state = 'slip'; gd.t = 5; gd.cage = cage(gd); puff('😵', above(gd.s * 1.9), { size: 1.4, rise: 0.4, life: 2 }); }
        }
      }
    } else if (gd.state === 'slip') {
      gd.m.body.rotation.z = Math.sin(gd.t * 9) * 0.35;                    // поскользнулся и качается
      if ((gd.t -= dt) <= 0) { gd.m.body.rotation.z = 0; gd.state = 'chase'; if (gd.cage) { gd.g.remove(gd.cage); gd.cage = null; } }
    } else if (gd.state === 'stomp') {
      gd.m.body.position.y = Math.abs(Math.sin(gd.t * 14)) * 0.25;      // топает на месте
      if ((gd.t -= dt) <= 0) { gd.state = 'search'; gd.t = gd.search || 0; if (gd.t) puff('❓', above(gd.s * 1.9), { size: 1.3, rise: 0.3, life: 2 }); }
    } else if (gd.state === 'search') {
      // озирается по сторонам — вдруг герой вернётся с яйцом
      gd.face += Math.sin(gd.t * 3) * dt * 2.5;
      if (hero.carrying && hero.carrying.nest === gd.nest && !safe(zn, hero.pos)) gd.state = 'chase';
      else if ((gd.t -= dt) <= 0) gd.state = 'return';
    } else if (gd.state === 'return') {
      const dx = gd.home.x - p.x, dz = gd.home.z - p.z, d = Math.hypot(dx, dz);
      if (d < 0.3) { gd.state = 'sleep'; gd.t = 0.5; sleepPose(gd, true); }
      else { spd = 4; p.x += dx / d * spd * dt; p.z += dz / d * spd * dt; gd.face = dampAngle(gd.face, Math.atan2(dx, dz), 8, dt); }
    }
    if (gd.state !== 'sleep') bump(p, 0.35 * gd.s);
    keepIn(zn, p);
    p.y = damp(p.y, groundY(p.x, p.z), 14, dt);                           // по ступенькам — вверх и вниз
    gd.g.rotation.y = gd.face;
    if (gd.state !== 'stomp' && gd.state !== 'slip' && gd.state !== 'search') animateAnimal(gd.m, dt, spd / gd.s);
    if (gd.state === 'sleep') gd.m.body.position.y = damp(gd.m.body.position.y, 0, 5, dt);
  }
  return caught;
}
