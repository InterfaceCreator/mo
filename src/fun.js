// То, ради чего интересно бродить: звёзды в укромных местах, батуты, зверушки, крылья мельницы, водопад.
// Всё — объекты текущей локации; локации расставляют их функциями add…
import { T, scene, group, box, damp, dampAngle } from './engine.js';
import { addCollider, onLevelReset, groundY, trees, bake, level } from './world.js';
import { buildBeast, buildBird, animateAnimal } from './animals.js';
import { puff, confetti } from './fx.js';

const stars = [], scrolls = [], pads = [], critters = [], rotors = [], flows = [], flutters = [], swimmers = [], leaves = [];
onLevelReset(() => { stars.length = scrolls.length = pads.length = critters.length = rotors.length = flows.length = flutters.length = swimmers.length = leaves.length = 0; });
let leafT = 0;

// ---------- звёзды ----------
const STAR_GEO = (() => {
  const s = new T.Shape();
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.42 : 1; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
  const g = new T.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false }); g.center(); g.userData.cached = true; return g;
})();
const STAR_MAT = new T.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x8a5a00 }); STAR_MAT.userData.cached = true;
// звезда: id — уникальный на всю игру; y — высота (по умолчанию над землёй)
export function addStar(save, id, x, z, y) {
  if (save.stars?.[id]) return;
  const m = new T.Mesh(STAR_GEO, STAR_MAT); m.castShadow = true;
  const by = (y ?? groundY(x, z)) + 1.4; m.position.set(x, by, z); scene.add(m);
  stars.push({ id, x, z, y: by, m });
}
export const starsLeft = () => stars.length;

// ---------- свитки с рецептами: нашёл — на верстаке открылся новый предмет ----------
export function addScroll(save, id, x, z, y) {
  if (save.recipes?.[id]) return;
  const by = (y ?? groundY(x, z)) + 1.3, g = group(scene, x, by, z);
  const paper = new T.Mesh(new T.CylinderGeometry(0.28, 0.28, 1.3, 12), new T.MeshLambertMaterial({ color: 0xe8d8b0 }));
  paper.rotation.z = Math.PI / 2; paper.castShadow = true; g.add(paper);
  for (const sx of [-1, 1]) box(g, 0.12, 0.7, 0.7, 0xa0622a, sx * 0.7, 0, 0, { shadow: false });
  box(g, 0.2, 0.62, 0.62, 0xff3b3b, 0, 0, 0, { shadow: false });
  scrolls.push({ id, x, z, y: by, g });
}
// ближайший свиток; если свитков не осталось — ближайшая звезда
export function nearestFind(p) {
  let best = null, bd = Infinity;
  for (const o of scrolls.length ? scrolls : stars) { const d = Math.hypot(o.x - p.x, o.z - p.z); if (d < bd) { bd = d; best = o; } }
  return best;
}

// ---------- батуты: встал — подбросило ----------
export function addPad(x, z, power = 24) {
  const y = groundY(x, z), g = group(scene, x, y, z);
  box(g, 3.2, 0.5, 3.2, 0x3a3a44, 0, 0.25, 0);
  const top = box(g, 2.8, 0.15, 2.8, 0xff4a4a, 0, 0.55, 0);
  for (const sx of [-1, 1]) box(g, 0.6, 0.06, 2.6, 0xffffff, sx * 0.7, 0.65, 0, { shadow: false });   // белые полосы поверх красного
  addCollider({ x0: x - 1.6, x1: x + 1.6, y0: y, y1: y + 0.6, z0: z - 1.6, z1: z + 1.6 });
  pads.push({ x, z, y: y + 0.6, g, top, power, t: 0, r: 1.5 });
}

// ---------- гигантский гриб: шляпка пружинит, как батут ----------
export function addMushroom(x, z, h, power = 19, cap = 0xff4a4a) {
  const y = groundY(x, z), g = group(scene, x, y, z), cw = 2.4 + h * 0.35;
  box(g, 1.2, h, 1.2, 0xfff3d6, 0, h / 2, 0); addCollider({ x0: x - 0.6, x1: x + 0.6, y0: y, y1: y + h, z0: z - 0.6, z1: z + 0.6, cam: true });
  box(g, cw, 0.9, cw, cap, 0, h + 0.45, 0, { studs: true }); box(g, cw * 0.7, 0.5, cw * 0.7, cap, 0, h + 1.1, 0, { studs: true });
  for (let i = 0; i < 5; i++) box(g, 0.4, 0.06, 0.4, 0xffffff, ((i * 37) % 10 / 10 - 0.5) * cw * 0.8, h + 0.93, ((i * 53) % 10 / 10 - 0.5) * cw * 0.8, { shadow: false });
  addCollider({ x0: x - cw / 2, x1: x + cw / 2, y0: y + h, y1: y + h + 0.9, z0: z - cw / 2, z1: z + cw / 2 });
  bake(g);                                        // гриб неподвижный — одним мешем
  pads.push({ x, z, y: y + h + 0.9, g, top: null, power, t: 0, r: cw / 2 });
}

// ---------- каменный круг: встань на все плиты — откроется тайник ----------
const plates = [];
onLevelReset(() => { plates.length = 0; });
const PLATE_OFF = new T.MeshLambertMaterial({ color: 0x8f8fa0 }), PLATE_ON = new T.MeshLambertMaterial({ color: 0x7fffd4, emissive: 0x2a8070 });
PLATE_OFF.userData.cached = PLATE_ON.userData.cached = true;
export function addPlates(id, list, onSolved) {
  const set = { id, items: [], solved: false, onSolved };
  for (const [x, z] of list) { const y = groundY(x, z), m = box(scene, 2, 0.15, 2, 0x8f8fa0, x, y + 0.08, z, { shadow: false }); m.material = PLATE_OFF; set.items.push({ x, z, y, m, on: false }); }
  plates.push(set);
}

// ---------- зверушки: гуляют сами, убегают от героя ----------
const CRITTERS = {
  bunny: { s: 0.8, hop: true, build: (p, i) => buildBeast(p, { body: [0xffffff, 0xd9b38c, 0xb0b0b0][i % 3], ear: 'long', earC: 0xffd0e0, tail: 'puff', nose: 0xff8fb0, w: 0.7, d: 0.8, leg: 0.25 }) },
  squirrel: { s: 0.6, hop: true, build: p => buildBeast(p, { body: 0xd9702a, belly: 0xffe0b8, ear: 'point', tail: 'big', tailC: 0xd9702a, snout: 0xffe0b8, w: 0.6, d: 0.8, leg: 0.25 }) },
  deer: { s: 1.3, hop: false, build: p => buildBeast(p, { body: 0xb5793e, antlers: 0xe8d4b0, spots: 0xf2e2c4, ear: 'point', snout: 0xe0b080, tail: 'stub', leg: 0.6, w: 0.75, d: 1.2 }) },
  hedgehog: { s: 0.7, hop: false, build: p => buildBeast(p, { body: 0x9a7b5a, head: 0xd9b48c, quills: 0x5a4030, snout: 0xd9b48c, nose: 0x222222, ear: 'round', leg: 0.18, w: 0.8, h: 0.5, d: 0.85, tail: 'none' }) },
};
export function addCritter(kind, x, z, area) {
  const K = CRITTERS[kind], g = group(scene, x, groundY(x, z), z), m = K.build(g, critters.length);
  m.root.scale.setScalar(K.s);
  critters.push({ g, m, area, hop: K.hop, run: kind === 'deer' ? 9 : 6, target: new T.Vector3(x, 0, z), wait: Math.random() * 3, face: Math.random() * 6 });
}
export const addBunny = (x, z, area) => addCritter('bunny', x, z, area);

// утки плавают по реке туда-сюда; river(z) — где русло
export function addDuck(river, z0, len) {
  const g = group(scene), m = buildBird(g, { body: 0xffffff, head: 0x2e8b57, beak: 0xffa31a, flat: true, wing: 0xe8e8e8 });
  m.root.scale.setScalar(0.7); m.legs.forEach(L => L.visible = false);
  swimmers.push({ g, m, river, z0, len, t: Math.random() * 10 });
}
// бабочки: просто порхают кругами
export function addButterfly(x, z) {
  const g = group(scene, x, groundY(x, z) + 1.5, z), c = [0xff7ac8, 0xffd93b, 0x7fd4ff, 0xb38cff][flutters.length % 4];
  const wl = box(g, 0.35, 0.02, 0.3, c, -0.18, 0, 0, { shadow: false }), wr = box(g, 0.35, 0.02, 0.3, c, 0.18, 0, 0, { shadow: false });
  box(g, 0.06, 0.06, 0.3, 0x2b2b33, 0, 0, 0, { shadow: false });
  flutters.push({ g, wl, wr, cx: x, cz: z, a: Math.random() * 6, r: 2 + Math.random() * 3, sp: 0.5 + Math.random() * 0.6 });
}

// ---------- крутится само (крылья мельницы) ----------
export function addRotor(obj, speed = 0.8, axis = 'z') { rotors.push({ obj, speed, axis }); }

// ---------- водопад: полосы «текут» вниз ----------
const flowTex = (() => {
  const cv = document.createElement('canvas'); cv.width = 32; cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = '#5fb8ff'; c.fillRect(0, 0, 32, 128);
  for (let i = 0; i < 9; i++) { c.fillStyle = `rgba(255,255,255,${0.25 + (i % 3) * 0.15})`; c.fillRect((i * 11) % 32, (i * 37) % 128, 3 + i % 3, 18 + (i * 7) % 20); }
  const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
})();
export function addWaterfall(x, z, y0, y1, w, rot = 0) {
  const tex = flowTex.clone(); tex.needsUpdate = true; tex.repeat.set(w / 3, (y1 - y0) / 6);
  const m = new T.Mesh(new T.PlaneGeometry(w, y1 - y0), new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, side: T.DoubleSide }));
  m.position.set(x, (y0 + y1) / 2, z); m.rotation.y = rot; scene.add(m);
  flows.push({ tex, x, z, y: y0 });
}

// раз в кадр. Возвращает события: { star: id, bounce: true }
export function updateFun(dt, hero, save) {
  const p = hero.pos, ev = {}, t = performance.now() / 1000;
  // звёзды крутятся и подпрыгивают; подошёл — собрал
  for (let i = stars.length - 1; i >= 0; i--) {
    const s = stars[i];
    s.m.rotation.y += dt * 2; s.m.position.y = s.y + Math.sin(t * 2 + i) * 0.2;
    if (Math.hypot(p.x - s.x, p.z - s.z) < 1.4 && Math.abs(p.y + 1.2 - s.y) < 1.8) {
      scene.remove(s.m); stars.splice(i, 1);
      (save.stars || (save.stars = {}))[s.id] = true; ev.star = s.id;
      confetti(s.m.position, 60); puff('⭐', s.m.position.clone().setY(s.y + 1), { size: 1.8, rise: 1.2, life: 1.6 });
    }
  }
  // свитки покачиваются; подошёл — рецепт твой
  for (let i = scrolls.length - 1; i >= 0; i--) {
    const sc = scrolls[i];
    sc.g.rotation.y += dt * 0.6;                                // свиток не светится и почти не двигается — его надо искать
    if (Math.hypot(p.x - sc.x, p.z - sc.z) < 1.4 && Math.abs(p.y + 1.2 - sc.y) < 1.8) {
      scene.remove(sc.g); scrolls.splice(i, 1);
      (save.recipes || (save.recipes = {}))[sc.id] = true; ev.scroll = sc.id;
      confetti(sc.g.position, 60); puff('📜', sc.g.position.clone().setY(sc.y + 1), { size: 1.8, rise: 1.2, life: 1.6 });
    }
  }
  // плиты-загадка: каждая загорается, когда на неё встал; все горят — тайник твой
  for (const set of plates) {
    if (set.solved) continue;
    for (const pl of set.items) if (!pl.on && Math.abs(p.x - pl.x) < 1.1 && Math.abs(p.z - pl.z) < 1.1 && Math.abs(p.y - pl.y) < 0.6) { pl.on = true; pl.m.material = PLATE_ON; ev.plate = true; }
    if (set.items.every(pl => pl.on)) { set.solved = true; ev.puzzle = set.id; set.onSolved?.(); }
  }
  // батут: стоишь сверху — подбрасывает
  for (const pd of pads) {
    pd.t = Math.max(0, pd.t - dt); if (pd.top) pd.top.scale.y = 1 - Math.sin(pd.t * 20) * 0.6 * pd.t;
    if (hero.grounded && Math.abs(p.y - pd.y) < 0.2 && Math.abs(p.x - pd.x) < pd.r && Math.abs(p.z - pd.z) < pd.r) {
      hero.vel.y = pd.power; hero.grounded = false; pd.t = 0.5; ev.bounce = true;
    }
  }
  // зайчики: гуляют, а если герой рядом — убегают прыжками
  for (const c of critters) {
    const g = c.g.position, dh = Math.hypot(p.x - g.x, p.z - g.z);
    if (dh < 5) { c.target.set(g.x + (g.x - p.x) / dh * 8, 0, g.z + (g.z - p.z) / dh * 8); c.wait = 0; }
    const dx = c.target.x - g.x, dz = c.target.z - g.z, d = Math.hypot(dx, dz);
    let spd = 0;
    if (d > 0.3) { spd = dh < 5 ? c.run : 2; g.x += dx / d * spd * dt; g.z += dz / d * spd * dt; c.face = dampAngle(c.face, Math.atan2(dx, dz), 8, dt); }
    else if ((c.wait -= dt) <= 0) { const A = c.area; c.target.set(A.x + (Math.random() - 0.5) * A.r * 2, 0, A.z + (Math.random() - 0.5) * A.r * 2); c.wait = 1 + Math.random() * 4; }
    g.y = damp(g.y, groundY(g.x, g.z), 12, dt);
    c.g.rotation.y = c.face; animateAnimal(c.m, dt, spd, { hop: c.hop });
  }
  for (const f of flutters) {
    f.a += dt * f.sp; f.g.position.x = f.cx + Math.cos(f.a) * f.r; f.g.position.z = f.cz + Math.sin(f.a * 1.3) * f.r;
    f.g.position.y = groundY(f.g.position.x, f.g.position.z) + 1.4 + Math.sin(f.a * 3) * 0.4;
    f.g.rotation.y = -f.a; const w = Math.sin(t * 18 + f.cx) * 0.9; f.wl.rotation.z = w; f.wr.rotation.z = -w;
  }
  for (const w of swimmers) {
    w.t += dt * 0.12; const k = (Math.sin(w.t) + 1) / 2, z = w.z0 + k * w.len, dir = Math.cos(w.t) > 0 ? 0 : Math.PI;
    w.g.position.set(w.river(z), -0.45 + Math.sin(t * 3 + w.z0) * 0.04, z); w.g.rotation.y = dir;
  }
  // с деревьев рядом с героем иногда кружась падают листья
  const autumn = level.id === 'autumn';                       // осенью листопад гуще и листья красно-рыжие
  if ((leafT -= dt) <= 0 && leaves.length < (autumn ? 50 : 20)) {
    leafT = autumn ? 0.07 : 0.25;
    const near = trees.filter(tr => tr.kind !== 'pine' && Math.abs(tr.x - p.x) < 22 && Math.abs(tr.z - p.z) < 22);
    if (near.length) {
      const tr = near[Math.floor(Math.random() * near.length)], m = box(scene, 0.3, 0.05, 0.22, (autumn ? [0xe2442a, 0xff8a1a, 0xffc22a, 0xb5541a] : [0x7fe04a, 0xc8e04a, 0xffb02e])[leaves.length % (autumn ? 4 : 3)], tr.x + (Math.random() - 0.5) * 3 * tr.s, tr.y + 3.4 * tr.s, tr.z + (Math.random() - 0.5) * 3 * tr.s, { shadow: false });
      leaves.push({ m, t: 0, ph: Math.random() * 6, floor: groundY(m.position.x, m.position.z) });
    }
  }
  for (let i = leaves.length - 1; i >= 0; i--) {
    const l = leaves[i]; l.t += dt;
    l.m.position.y -= dt * 1.1; l.m.position.x += Math.sin(l.t * 2.5 + l.ph) * dt * 1.2; l.m.rotation.set(Math.sin(l.t * 3 + l.ph), l.t, Math.cos(l.t * 2 + l.ph) * 0.8);
    if (l.m.position.y < l.floor + 0.05 || l.t > 8) { scene.remove(l.m); leaves.splice(i, 1); }
  }
  for (const r of rotors) r.obj.rotation[r.axis] += r.speed * dt;
  for (const f of flows) f.tex.offset.y += dt * 1.2;
  return ev;
}
