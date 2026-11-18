// Занятия в лесу: канатные дороги, гонка через кольца, клады под крестиками, колодец желаний,
// ускорители-стрелки и бобр Боря с заданиями. Всё — объекты текущей локации.
import { T, scene, group, box, compactModel } from './engine.js';
import { onLevelReset, groundY, addCollider } from './world.js';
import { buildBeast, animateAnimal } from './animals.js';
import { makeLabel, sprite, emojiTex, puff, confetti, chips } from './fx.js';

const zips = [], rings = [], digs = [], wells = [], arrows = [], npcs = [];
let race = null;
onLevelReset(() => { zips.length = rings.length = digs.length = wells.length = arrows.length = npcs.length = 0; race = null; });

// ---------- канатная дорога: from — откуда (верх вышки), to — куда; трос висит на столбах ----------
export function addZip(from, to) {
  const g = group(scene), d = to.clone().sub(from), len = d.length();
  const cable = box(g, 0.08, 0.08, len, 0x2b2b33, 0, 0, 0, { shadow: false });
  cable.position.copy(from).addScaledVector(d, 0.5); cable.lookAt(to);
  // столб в конце и «посадка» в начале (жёлтая площадка с ручкой)
  const ey = groundY(to.x, to.z); box(g, 0.4, to.y - ey + 0.4, 0.4, 0x8a5a2b, to.x, (to.y + ey) / 2, to.z, { studs: false });
  const hint = sprite(emojiTex('🚡'), 1.4); hint.position.set(from.x, from.y + 1.2, from.z); g.add(hint);
  zips.push({ from: from.clone(), to: to.clone(), len });
}

// ---------- кольца: гонка на время ----------
const RING_GEO = new T.TorusGeometry(2.2, 0.28, 8, 20); RING_GEO.userData.cached = true;
const RING_OFF = new T.MeshLambertMaterial({ color: 0xffb020, emissive: 0x553300 }), RING_ON = new T.MeshLambertMaterial({ color: 0x5fd35f, emissive: 0x1a5a1a });
RING_OFF.userData.cached = RING_ON.userData.cached = true;
// start — точка старта, list — центры колец по порядку, time — секунд на всё
export function addRace(id, start, list, time) {
  const pad = box(scene, 3, 0.15, 3, 0x3fa7ff, start.x, groundY(start.x, start.z) + 0.08, start.z, { shadow: false });
  const label = makeLabel(4, 1); label.position.set(start.x, groundY(start.x, start.z) + 3.2, start.z); scene.add(label);
  label.userData.set('⭕ Старт гонки', { color: '#ffffff' });
  list.forEach(([x, z], i) => {
    const nx = list[(i + 1) % list.length], y = groundY(x, z) + 2.6;
    const m = new T.Mesh(RING_GEO, RING_OFF); m.position.set(x, y, z); m.rotation.y = Math.atan2(nx[0] - x, nx[1] - z); scene.add(m);
    rings.push({ x, z, y, m, on: false });
  });
  race = { id, start, time, label, pad, t: 0, on: false, next: 0, cool: 0 };
}

// ---------- клады: крестик на земле, копать киркой; раз в сутки снова ----------
export function addDig(save, id, x, z) {
  const y = groundY(x, z), g = group(scene, x, y + 0.04, z);
  for (const r of [0.75, -0.75]) { const b = box(g, 2.2, 0.06, 0.45, 0xd02020, 0, 0, 0, { shadow: false }); b.rotation.y = r; }
  digs.push({ id, x, z, y, g });
  g.visible = !dugToday(save, id);
}
const DIG_EVERY = 20 * 3600 * 1000;
const dugToday = (save, id) => Date.now() - ((save.digs || {})[id] || 0) < DIG_EVERY;

// ---------- колодец желаний ----------
export function addWell(x, z) {
  const y = groundY(x, z), g = group(scene, x, y, z);
  // ровный каменный сруб 3.6×3.6, внутри вода
  for (const [sx, sz, ww, dd] of [[0, -1.5, 3.6, 0.6], [0, 1.5, 3.6, 0.6], [-1.5, 0, 0.6, 2.4], [1.5, 0, 0.6, 2.4]]) box(g, ww, 1.2, dd, 0x9a9aaa, sx, 0.6, sz, { studs: true });
  box(g, 2.4, 0.1, 2.4, 0x3f7fd0, 0, 0.9, 0, { shadow: false });
  for (const sx of [-1, 1]) box(g, 0.25, 2.6, 0.25, 0x8a5a2b, sx * 1.7, 1.3, 0, { studs: false });
  box(g, 4, 0.3, 1.4, 0xc0392b, 0, 2.75, 0, { studs: true });
  addCollider({ x0: x - 1.8, x1: x + 1.8, y0: y, y1: y + 1.2, z0: z - 1.8, z1: z + 1.8 });
  const label = makeLabel(5.6, 1.4); label.position.set(x, y + 4.2, z); scene.add(label); label.userData.set('🪙 Колодец желаний', { color: '#ffe14d' });
  wells.push({ x, z, y, near: false });
}

// ---------- ускоритель: стрелки на земле, dir — куда разгоняют (угол) ----------
export function addArrow(x, z, dir) {
  const y = groundY(x, z), g = group(scene, x, y + 0.05, z); g.rotation.y = dir;
  for (let i = 0; i < 2; i++) for (const sx of [-1, 1]) { const b = box(g, 0.35, 0.05, 1.4, 0xffd23f, sx * 0.45, 0, -0.4 + i * 1.1, { shadow: false }); b.rotation.y = sx * 0.6; }
  arrows.push({ x, z, y, dir, t: 0 });
}

// ---------- бобр Боря ----------
export function addBeaver(x, z) {
  const g = group(scene, x, groundY(x, z), z), m = buildBeast(g, { body: 0x8a5a2b, head: 0x9c6a3c, snout: 0xc89a6a, nose: 0x2b2b33, ear: 'round', tail: 'fin', tailC: 0x5a3a1a, w: 0.9, h: 0.75, d: 1.0, hd: 0.7, leg: 0.3 });
  box(m.head, 0.22, 0.16, 0.05, 0xffffff, 0, -0.26, 0.47, { shadow: false });     // зубы
  compactModel(m);
  m.root.scale.setScalar(1.5); g.rotation.y = Math.PI;
  const mark = sprite(emojiTex('❗'), 1.4); mark.position.set(0, 3.4, 0); g.add(mark);
  const label = makeLabel(4, 1); label.position.set(0, 4.6, 0); g.add(label); label.userData.set('🦫 Бобр Боря', { color: '#ffffff' });
  addCollider({ x0: x - 1, x1: x + 1, y0: g.position.y, y1: g.position.y + 2, z0: z - 1.2, z1: z + 1.2 });
  npcs.push({ x, z, g, m, mark, near: false });
}

// раз в кадр. Возвращает события для game.js
export function updateExtras(dt, hero, save, questState) {
  const p = hero.pos, ev = {}, t = performance.now() / 1000;
  // канатка: подошёл к посадке наверху — поехали
  for (const z of zips) if (!hero.climb && hero.grounded && Math.hypot(p.x - z.from.x, p.z - z.from.z) < 1.4 && Math.abs(p.y + 2.6 - z.from.y) < 1.5) {
    hero.climb = { zip: true, from: z.from, to: z.to, t: 0, dur: z.len / 16, sag: z.len * 0.04 }; ev.zip = true;
  }
  // гонка
  if (race) {
    race.cool -= dt;
    if (!race.on && race.cool <= 0 && Math.abs(p.x - race.start.x) < 1.5 && Math.abs(p.z - race.start.z) < 1.5) {
      race.on = true; race.t = race.time; race.next = 0; for (const r of rings) { r.on = false; r.m.material = RING_OFF; } ev.raceStart = true;
    }
    if (race.on) {
      race.t -= dt;
      const r = rings[race.next];
      if (r && Math.hypot(p.x - r.x, p.z - r.z) < 2.4 && Math.abs(p.y + 1.4 - r.y) < 3) { r.on = true; r.m.material = RING_ON; race.next++; ev.ring = race.next; }
      if (race.next >= rings.length) { race.on = false; race.cool = 3; ev.raceWin = race.id; confetti(p, 80); }
      else if (race.t <= 0) { race.on = false; race.cool = 3; ev.raceLose = race.next; }
    }
    for (const r of rings) if (!r.on) r.m.rotation.z = Math.sin(t * 2 + r.x) * 0.1;
    ev.raceT = race.on ? race.t : 0;
  }
  // клад: стоишь на крестике с киркой — копаешь
  for (const d of digs) {
    if (!d.g.visible || Math.hypot(p.x - d.x, p.z - d.z) > 1.3 || Math.abs(p.y - d.y) > 1) continue;
    if (!save.tools.pick) { if (!d.told) { d.told = true; ev.needPick = true; } continue; }
    d.g.visible = false; (save.digs || (save.digs = {}))[d.id] = Date.now();
    chips(new T.Vector3(d.x, d.y + 0.5, d.z), 0x9c6a3c, 16); ev.dig = d.id;
  }
  // колодец: подошёл вплотную — бросил монетку; ещё раз — отойди и подойди снова
  for (const w of wells) { const near = Math.hypot(p.x - w.x, p.z - w.z) < 2.8 && p.y < w.y + 1.5; if (near && !w.near) ev.well = true; w.near = near; }
  // стрелки: на секунду разгоняют туда, куда смотрят
  for (const a of arrows) { a.t -= dt; if (a.t <= 0 && Math.hypot(p.x - a.x, p.z - a.z) < 1.3 && Math.abs(p.y - a.y) < 0.6) { a.t = 1; ev.dash = a.dir; } }
  // бобр: показывает, ждёт ли он тебя
  for (const n of npcs) {
    n.mark.visible = questState.has; n.mark.material.map = emojiTex(questState.ready ? '✅' : '❗');
    n.mark.position.y = 3.4 + Math.sin(t * 3) * 0.15;
    n.g.rotation.y = Math.atan2(p.x - n.x, p.z - n.z);
    animateAnimal(n.m, dt, 0);
    const near = Math.hypot(p.x - n.x, p.z - n.z) < 3.5;
    if (near && !n.near) ev.talk = true;
    n.near = near;
  }
  return ev;
}
