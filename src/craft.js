// Крафт: ресурсы лежат по миру, на верстаке из них делаются вечные инструменты,
// а инструменты открывают новое: топор рубит деревья и завал на поляну, кирка бьёт камни и валун у пещеры,
// верёвка с крюком поднимает на стены и на башню с сундуком.
import { B } from './balance.js';
import { T, scene, group, box, dampAngle } from './engine.js';
import { trees, addCollider, onLevelReset, groundY } from './world.js';
import { puff, makeLabel, confetti, chips, emojiTex, sprite } from './fx.js';

// ресурсы: первые четыре собираются в мире, остальные делаются на верстаке
export const RES = { wood: '🪵', stone: '🪨', crystal: '💎', leaf: '🌿', plank: '🟫', brick: '🧱', thread: '🧵', acorn: '🌰', pumpkin: '🎃' };   // жёлуди и тыквы — из Осенней долины
export const RAW = ['wood', 'stone', 'crystal', 'leaf'];
// рецепты лесенкой: брёвна → доски → инструменты.
// type: mat — материал (+out в ресурсы), tool — вещь навсегда, item — расходник (+out штук).
// scroll — рецепт закрыт, пока не найден свиток 📜 в мире
export const RECIPES = [
  { id: 'plank', type: 'mat', icon: '🟫', name: 'Доска', info: 'из двух брёвен', need: { wood: 2 }, out: 1 },
  { id: 'brick', type: 'mat', icon: '🧱', name: 'Кирпич', info: 'из двух камней', need: { stone: 2 }, out: 1 },
  { id: 'thread', type: 'mat', icon: '🧵', name: 'Нить', info: 'сплетается из листьев', need: { leaf: 3 }, out: 1 },
  { id: 'axe', type: 'tool', icon: '🪓', name: 'Топор', info: 'рубит деревья и завалы', need: { wood: 3, stone: 2 } },
  { id: 'pick', type: 'tool', icon: '⛏️', name: 'Кирка', info: 'разбивает камни', need: { plank: 2, stone: 3 } },
  { id: 'rope', type: 'tool', icon: '🪝', name: 'Верёвка с крюком', info: 'залезть на стену или плато', need: { thread: 3, crystal: 2 } },
  { id: 'umbrella', scroll: true, type: 'tool', icon: '☂️', name: 'Зонтик', info: 'держи прыжок в воздухе — плавно летишь вниз', need: { thread: 4, plank: 2 } },
  { id: 'boots', scroll: true, type: 'tool', icon: '🦘', name: 'Сапоги-прыгуны', info: 'прыгаешь на треть выше', need: { thread: 2, plank: 2, crystal: 1 } },
  { id: 'trap', scroll: true, type: 'item', icon: '🪤', name: 'Ловушки ×2', info: 'брось позади — сторож попадётся и посидит 5 секунд', need: { plank: 2, thread: 1 }, out: 2 },
  { id: 'magnet', scroll: true, type: 'tool', icon: '🧲', name: 'Магнит', info: 'ресурсы собираются издалека', need: { brick: 3, crystal: 2 } },
  { id: 'house', scroll: true, type: 'tool', icon: '🏡', name: 'Домик для питомцев', info: 'загон приносит на четверть больше монет', need: { plank: 4, brick: 4, crystal: 2 } },
  { id: 'pad', scroll: true, type: 'item', icon: '🟥', name: 'Переносной батут', info: 'ставишь где угодно — подбрасывает высоко', need: { plank: 3, thread: 2, brick: 1 }, out: 1 },
  // осенние поделки: из желудей и тыкв Осенней долины — те же полезные вещи, только дешевле
  { id: 'acorntrap', autumn: true, give: 'trap', type: 'item', icon: '🪤', name: 'Ловушки из желудей ×2', info: 'сторож поскользнётся на желудях и посидит 5 секунд', need: { acorn: 4, thread: 1 }, out: 2 },
  { id: 'pumpkinpad', autumn: true, give: 'pad', type: 'item', icon: '🎃', name: 'Тыква-батут', info: 'упругая тыква — подбрасывает высоко, как батут', need: { pumpkin: 2, plank: 1 }, out: 1 },
  { id: 'acorncompass', autumn: true, give: 'compass', type: 'item', icon: '🧭', name: 'Компас из жёлудя', info: 'показывает на ближайший свиток или звезду', need: { acorn: 6, crystal: 1 }, out: 1 },
];
// где лежит свиток с рецептом (подсказка на верстаке)
export const SCROLL_WHERE = { umbrella: '🌲 где-то у гигантского дерева', boots: '🌲 где-то в руинах крепости', trap: '🌲 где-то на тайной поляне', magnet: '🌲 где-то у водопада', house: '🌲 где-то на склоне горы', pad: '🌲 где-то у мельницы' };
export const TOOLS = RECIPES.filter(r => r.type === 'tool');
export const known = (r, save) => !r.scroll || !!save.recipes?.[r.id];
export const made = (r, save) => r.type === 'tool' && !!save.tools[r.id];
export const canCraft = (r, save) => known(r, save) && !made(r, save) && Object.entries(r.need).every(([k, n]) => (save.res[k] || 0) >= n);
export function craft(r, save) {
  for (const [k, n] of Object.entries(r.need)) save.res[k] -= n;
  if (r.type === 'mat') save.res[r.id] = (save.res[r.id] || 0) + r.out;
  else if (r.type === 'tool') save.tools[r.id] = true;
  else { const id = r.give || r.id; (save.items || (save.items = {}))[id] = (save.items[id] || 0) + r.out; }
}
export const WORKBENCH = { x: 0, z: 57, pad: { x: 0, z: 53.5 } };

const PICK_R = 1.3;
const near = (p, x, z, r) => Math.hypot(p.x - x, p.z - z) < r;

// ---------- то, что лежит на земле ----------
// всё ниже — объекты текущей локации; локации расставляют их функциями add…
const loose = [], rocks = [], doors = [], hooks = [], chests = [];
onLevelReset(() => { loose.length = rocks.length = doors.length = hooks.length = chests.length = 0; });

function looseMesh(kind) {
  const g = group(scene);
  if (kind === 'wood') { const a = box(g, 1.1, 0.26, 0.26, 0x8a5a2b, 0, 0.13, 0); a.rotation.y = 0.5; const b = box(g, 1.0, 0.24, 0.24, 0xa06a35, 0, 0.36, 0); b.rotation.y = -0.6; }
  else if (kind === 'stone') { box(g, 0.6, 0.45, 0.55, 0x9a9aaa, 0, 0.22, 0); box(g, 0.35, 0.3, 0.35, 0xb5b5c4, 0.3, 0.15, 0.2); }
  else if (kind === 'leaf') { box(g, 1.1, 0.8, 1.1, 0x3fae2a, 0, 0.4, 0, { studs: true }); box(g, 0.7, 0.5, 0.7, 0x55c43a, 0.3, 0.9, -0.1, { studs: true }); box(g, 0.2, 0.2, 0.2, 0xff4a6a, -0.4, 0.75, 0.45, { shadow: false }); }
  else crystal(g, 0.6);
  return g;
}
function crystal(g, s) {
  const m = new T.MeshLambertMaterial({ color: 0x7fe8ff, emissive: 0x1a6080 });
  [[0, 1.2, 0, 0], [0.3, 0.8, 0.15, 0.4], [-0.3, 0.9, -0.1, -0.35]].forEach(([x, h, z, r]) => {
    const c = new T.Mesh(new T.BoxGeometry(0.35 * s * 2, h * s * 2, 0.35 * s * 2), m); c.position.set(x * s * 2, h * s, z * s * 2); c.rotation.z = r; c.castShadow = true; g.add(c);
  });
}
// веточка, камушек, кристалл или кустик (k: 'wood' | 'stone' | 'crystal' | 'leaf')
export function addLoose(x, z, k) { const y = groundY(x, z), g = looseMesh(k); g.position.set(x, y, z); loose.push({ x, y, z, k, g, cool: 0 }); }

// ---------- камни и кристаллы (кирка) ----------
// rich — в камне часто попадается кристалл
export function addRock(x, z, kind = 'boulder', rich = false) {
  const y = groundY(x, z), g = group(scene, x, y, z), r = kind === 'boulder' ? 1.3 : 0.9;
  if (kind === 'boulder') { box(g, 2.4, 1.8, 2.2, 0x8f8fa0, 0, 0.9, 0); box(g, 1.6, 1, 1.6, 0xa5a5b5, 0.2, 2.1, -0.1); box(g, 1, 0.8, 1.2, 0x7d7d8e, -0.9, 0.4, 0.8); }
  else crystal(g, 1);
  const col = addCollider({ x0: x - r, x1: x + r, y0: y, y1: y + (kind === 'boulder' ? 2.6 : 2.2), z0: z - r, z1: z + r });
  rocks.push({ x, y, z, g, col, kind, r, rich, hp: kind === 'boulder' ? 3 : 2, cool: 0 });
}

// ---------- двери в тайные места: разбираются один раз и навсегда ----------
// look: 'logs' (топор) или 'boulder' (кирка); col — твёрдый прямоугольник прохода; along — проход вдоль x или z
export function addDoor(save, { id, x, z, look, col, along = 'z' }) {
  const y = groundY(x, z), g = group(scene, x, y, z), tool = look === 'logs' ? 'axe' : 'pick';
  if (along === 'x') g.rotation.y = Math.PI / 2;
  if (look === 'logs') for (let i = 0; i < 4; i++) { const l = box(g, 1, 0.9, 6.2, i % 2 ? 0x8a5a2b : 0x9c6a35, (i % 2 - 0.5) * 0.4, 0.45 + i * 0.9, 0); l.rotation.x = (i % 2 ? 1 : -1) * 0.04; }
  else { box(g, 3.4, 3.4, 5.6, 0x8f8fa0, 0, 1.7, 0); box(g, 2.4, 1.4, 3.6, 0xa5a5b5, 0.3, 4, 0.3); box(g, 1.6, 1.2, 2, 0x7d7d8e, 1.6, 0.6, 2); }
  const c = addCollider({ ...col, y0: y - 1, y1: y + 5 });
  const d = { id, tool, x, y, z, g, col: c, hp: look === 'logs' ? 4 : 5 };
  if (save.opened[id]) { c.off = true; g.visible = false; }
  doors.push(d);
}

// ---------- крюки для верёвки: снизу (from) — забираемся наверх (to) ----------
export function addHook(fx, fz, tx, ty, tz) {
  const fy = groundY(fx, fz), g = group(scene), h = ty - fy;
  const top = box(g, 0.5, 0.5, 0.5, 0x555a6a, tx + (fx - tx) * 0.35, ty + 0.1, tz + (fz - tz) * 0.35, { studs: false });
  const rope = box(g, 0.14, h, 0.14, 0xd9b26b, fx + (tx - fx) * 0.25, fy + h / 2, fz + (tz - fz) * 0.25, { shadow: false });
  const hint = sprite(emojiTex('🪝'), 1.2); hint.position.set(fx, fy + 2.4, fz); g.add(hint);
  hooks.push({ from: new T.Vector3(fx, fy, fz), to: new T.Vector3(tx, ty, tz), rope, hint, top });
}

// ---------- сундук: монеты и кристаллы, потом новый через 10 минут ----------
export function addChest(id, x, y, z) {
  const g = group(scene, x, y, z);
  box(g, 1.6, 0.9, 1.1, 0xa0622a, 0, 0.45, 0); box(g, 1.7, 0.12, 1.2, 0xffc21a, 0, 0.7, 0);
  const lid = group(g, 0, 0.9, -0.55); box(lid, 1.6, 0.35, 1.1, 0xb8742f, 0, 0.17, 0.55); box(lid, 0.3, 0.3, 0.1, 0xffc21a, 0, 0.05, 1.12);
  const label = makeLabel(2.4, 0.6); label.position.set(x, y + 2.3, z); scene.add(label);
  chests.push({ id, x, y, z, g, lid, label });
}

// ---------- верстак (на базе) ----------
export function buildWorkbench() {
  const W = group(scene, WORKBENCH.x, 0, WORKBENCH.z);
  box(W, 4, 1.4, 2.2, 0xa0622a, 0, 0.7, 0, { studs: true }); box(W, 4.2, 0.2, 2.4, 0xc98a45, 0, 1.5, 0);
  const tools = group(W, 0, 1.6, 0); box(tools, 0.2, 0.15, 1.2, 0x8a5a2b, -1, 0.08, 0); box(tools, 0.5, 0.35, 0.2, 0x9aa4ad, -1, 0.2, -0.55); box(tools, 1, 0.12, 0.6, 0xd9b26b, 1, 0.06, 0.1);
  addCollider({ x0: WORKBENCH.x - 2.1, x1: WORKBENCH.x + 2.1, y0: 0, y1: 1.6, z0: WORKBENCH.z - 1.2, z1: WORKBENCH.z + 1.2 });
  const sign = makeLabel(4.4, 1.1); sign.position.set(WORKBENCH.x, 3.4, WORKBENCH.z); scene.add(sign); sign.userData.set('🔨 Верстак', { color: '#ffffff' });
  box(scene, 3, 0.12, 2.4, 0x3fa7ff, WORKBENCH.pad.x, 0.06, WORKBENCH.pad.z, { shadow: false });
}

export const onBenchPad = p => Math.abs(p.x - WORKBENCH.pad.x) < 1.6 && Math.abs(p.z - WORKBENCH.pad.z) < 1.4 && p.y < 0.5;

// подсказка «нужен такой-то инструмент» — не чаще раза в 3 секунды
let hintT = 0;
function needTool(icon, pos) { if (hintT > 0) return; hintT = 3; puff(icon, pos.clone().setY(pos.y + 3.4), { size: 1.4, rise: 0.4, life: 1.6 }); puff('❓', pos.clone().setY(pos.y + 4.3), { size: 0.8, rise: 0.4, life: 1.6 }); }

// удар достиг цели
function impact(tg, give, ev, save) {
  const o = tg.o, at = new T.Vector3(tg.x, o.y || 0, tg.z);
  if (tg.kind === 'tree') {
    ev.sfx.push('chop'); chips(at.clone().setY(at.y + 1.4), 0x8a5a2b, 7);
    o.crown.rotation.z = 0.12; setTimeout(() => { o.crown.rotation.z = -0.08; setTimeout(() => o.crown.rotation.z = 0, 90); }, 90);
    give('wood', 1, at.clone().setY(at.y + 1));
    if (Math.random() < 0.5) give('leaf', 1, at.clone().setY(at.y + 2));
    if ((o.hits = (o.hits || 0) + 1) >= 3) { o.hits = 0; o.cool = 45; o.crown.scale.setScalar(0.55); }
  } else if (tg.kind === 'rock') {
    ev.sfx.push('mine'); chips(at.clone().setY(at.y + 1), o.kind === 'boulder' ? 0x9a9aaa : 0x7fe8ff, 8);
    o.g.scale.setScalar(0.9); setTimeout(() => o.g.scale.setScalar(1), 80);
    if (--o.hp <= 0) {
      o.g.visible = false; o.col.off = true; o.cool = 60; chips(at.clone().setY(at.y + 1), 0x9a9aaa, 14);
      if (o.kind === 'boulder') { give('stone', 3, o.g.position); if (o.rich || Math.random() < 0.25) give('crystal', 1, o.g.position.clone().setY(o.y + 1)); }
      else give('crystal', 2, o.g.position);
    }
  } else {
    ev.sfx.push(o.tool === 'axe' ? 'chop' : 'mine'); chips(at.clone().setY(at.y + 1.5), o.tool === 'axe' ? 0x8a5a2b : 0x9a9aaa, 10);
    o.g.position.x += (Math.random() - 0.5) * 0.3; setTimeout(() => o.g.position.x = o.x, 80);
    if (--o.hp <= 0) {
      o.col.off = true; o.g.visible = false; save.opened[o.id] = true; ev.opened = o.id;
      confetti(at, 70); give(o.tool === 'axe' ? 'wood' : 'stone', 4, at.clone().setY(at.y + 1));
    }
  }
}

// раз в кадр. Возвращает события: { got: { wood: n, … }, coins, opened, sfx: [...] }
let hitT = 0;
const SWING = 0.5;     // секунд на один замах с ударом
export function updateCraft(dt, hero, save) {
  const p = hero.pos, ev = { got: {}, coins: 0, sfx: [] };
  const give = (k, n, at) => { ev.got[k] = (ev.got[k] || 0) + n; save.res[k] = (save.res[k] || 0) + n; puff(RES[k], at.clone().setY(at.y + 1.6), { size: 0.9, rise: 1.6 }); };
  hintT -= dt; hitT -= dt;
  const level = o => Math.abs(p.y - (o.y || 0)) < 1.6;     // герой на одной высоте с предметом (а не на стене над ним)

  // подобрать с земли
  for (const l of loose) {
    if (l.cool > 0) { if ((l.cool -= dt) <= 0) l.g.visible = true; continue; }
    if (level(l) && near(p, l.x, l.z, save.tools.magnet ? 6 : PICK_R)) { l.g.visible = false; l.cool = 40; give(l.k, 1, l.g.position); ev.sfx.push('collect'); }
  }

  // рядом что-то, что можно рубить или бить: инструмент в руке, замах, удар
  const ok = hero.grounded && !hero.carrying && !hero.climb;
  let target = null;
  for (const t of trees) {
    if (t.cool > 0) { t.cool -= dt; t.crown.scale.setScalar(Math.min(1, 0.55 + (1 - t.cool / 45) * 0.45)); continue; }
    if (target || !level(t) || !near(p, t.x, t.z, 0.6 * t.s + 1.2)) continue;
    if (!save.tools.axe) { needTool('🪓', new T.Vector3(t.x, t.y, t.z)); continue; }
    target = { kind: 'tree', o: t, tool: 'axe', x: t.x, z: t.z };
  }
  for (const r of rocks) {
    if (r.cool > 0) { if ((r.cool -= dt) <= 0) { r.g.visible = true; r.col.off = false; r.hp = r.kind === 'boulder' ? 3 : 2; } continue; }
    if (target || !level(r) || !near(p, r.x, r.z, r.r + 1.2)) continue;
    if (!save.tools.pick) { needTool('⛏️', new T.Vector3(r.x, r.y, r.z)); continue; }
    target = { kind: 'rock', o: r, tool: 'pick', x: r.x, z: r.z };
  }
  for (const d of doors) {
    if (d.col.off || target || !level(d) || !near(p, d.x, d.z, 3.6)) continue;
    if (!save.tools[d.tool]) { needTool(RECIPES.find(t => t.id === d.tool).icon, new T.Vector3(d.x, d.y, d.z)); continue; }
    target = { kind: 'door', o: d, tool: d.tool, x: d.x, z: d.z };
  }
  if (!ok) target = null;

  const sw = hero.swing;
  hero.toolOut = sw ? sw.tool : target ? target.tool : null;
  // стоит рядом — поворачивается к цели
  if (target && hero.speed < 1.5) {
    hero.face = dampAngle(hero.face, Math.atan2(target.x - p.x, target.z - p.z), 12, dt);
    hero.model.root.rotation.y = hero.face;
  }
  if (sw) {
    sw.t = Math.min(sw.t + dt / SWING, 1);
    // в момент удара — щепки, ресурс; если за время замаха отошёл — промах
    if (!sw.hit && sw.t >= 0.55) {
      sw.hit = true;
      const o = sw.target;
      if (ok && near(p, o.x, o.z, (o.kind === 'door' ? 3.6 : (o.o.r || 0.6 * o.o.s) + 1.8))) impact(o, give, ev, save);
    }
    if (sw.t >= 1) hero.swing = null;
  } else if (target && hitT <= 0) {
    hero.swing = { t: 0, tool: target.tool, target, hit: false }; hitT = SWING + 0.12;   // короткая пауза между ударами
  }

  // крюки: с верёвкой — подошёл к стене и забрался наверх
  for (const h of hooks) {
    h.rope.visible = !!save.tools.rope; h.hint.visible = !save.tools.rope;
    if (hero.climb || !level(h.from) || !near(p, h.from.x, h.from.z, 1.1)) continue;
    if (!save.tools.rope) { needTool('🪝', h.from); continue; }
    hero.climb = { from: p.clone(), to: h.to.clone(), t: 0 }; ev.sfx.push('climb');
  }

  // сундуки: открылся сам, когда подошёл; потом новый через 5 минут
  const now = Date.now();
  if (!save.chests) save.chests = {};
  for (const c of chests) {
    const left = Math.max(0, Math.ceil(((save.chests[c.id] || 0) + B.CHEST_EVERY * 1000 - now) / 1000));
    c.lid.rotation.x = left ? -1.1 : 0;
    c.label.userData.set(left ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : '🎁', { color: '#ffe14d' });
    if (!left && Math.abs(p.y - c.y) < 1 && near(p, c.x, c.z, 2)) {
      save.chests[c.id] = now; ev.coins += B.CHEST_COINS; give('crystal', B.CHEST_CRYSTALS, c.g.position);
      confetti(c.g.position, 50); puff('coin', c.g.position.clone().setY(c.y + 2), { size: 1.4, rise: 2 }); ev.sfx.push('chest');
    }
  }
  return ev;
}
