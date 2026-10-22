// Звери из брусков: четвероногие, птицы и динозаврики. Ими собираются и питомцы, и сторожа.
// У каждого: root (двигаем и поворачиваем), body (качаем), legs (машем), глаза открытые/закрытые.
import { group, box, damp } from './engine.js';

function eyes(head, z, dx, y, s, list) {
  for (const sx of [-1, 1]) {
    const o = group(head, sx * dx, y, z);
    box(o, s, s * 1.1, 0.04, 0xffffff, 0, 0, 0, { shadow: false });
    box(o, s * 0.55, s * 0.7, 0.05, 0x1a1a1a, 0, -s * 0.08, 0.01, { shadow: false });
    box(o, s * 0.2, s * 0.2, 0.05, 0xffffff, -s * 0.12, s * 0.12, 0.02, { shadow: false });
    const c = box(head, s * 1.1, s * 0.22, 0.05, 0x1a1a1a, sx * dx, y - s * 0.1, z, { shadow: false });
    c.visible = false; list.open.push(o); list.closed.push(c);
  }
}
export function setEyes(m, open) { for (const o of m.eyes.open) o.visible = open; for (const c of m.eyes.closed) c.visible = !open; }

// четвероногий: o = { body, belly, head, ear, tail, snout, nose, horn, mane, patch, w, h, d, leg, hd }
export function buildBeast(p, o) {
  const root = group(p), body = group(root);
  const w = o.w || 0.8, h = o.h || 0.6, d = o.d || 1.0, leg = o.leg || 0.35, hd = o.hd || 0.62;
  const by = leg + h / 2, legs = [];
  box(body, w, h, d, o.body, 0, by, 0);
  if (o.belly) box(body, w * 0.8, 0.04, d * 0.7, o.belly, 0, leg - 0.01, 0, { shadow: false });
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const L = group(body, sx * (w / 2 - 0.13), leg, sz * (d / 2 - 0.16)); legs.push(L);
    box(L, 0.22, leg, 0.22, o.legC || o.body, 0, -leg / 2, 0);
  }
  // длинная шея (жираф): голова поднята высоко
  const nk = o.neck || 0;
  if (nk) { const n = box(body, hd * 0.45, nk + 0.3, hd * 0.45, o.body, 0, by + h * 0.3 + nk / 2, d / 2 - 0.05); n.rotation.x = 0.25; }
  const head = group(body, 0, by + h * 0.45 + nk, d / 2 + hd * 0.25 + nk * 0.25);
  box(head, hd, hd * 0.92, hd * 0.9, o.head || o.body);
  const E = { open: [], closed: [] };
  eyes(head, hd * 0.46, hd * 0.22 * (o.eye || 1) ** 0.5, hd * 0.06 + (o.eye > 1 ? hd * 0.2 : 0), hd * 0.24 * (o.eye || 1), E);
  // рисунок на теле: пятна, полоски, шерсть-завитки, горб, панцирь, иголки
  if (o.spots) for (let i = 0; i < 6; i++) { const sx = i % 2 ? 1 : -1, sz = ((i * 37) % 7 / 7 - 0.5) * d * 0.8, sy = ((i * 53) % 5 / 5 - 0.4) * h * 0.6; box(body, 0.03, h * 0.28, d * 0.18, o.spots, sx * (w / 2 + 0.01), by + sy, sz, { shadow: false }); box(body, w * 0.25, 0.03, d * 0.16, o.spots, ((i * 29) % 5 / 5 - 0.4) * w, by + h / 2 + 0.01, sz * 0.8, { shadow: false }); }
  if (o.stripes) for (let i = 0; i < 4; i++) box(body, w + 0.02, h * 0.85, 0.09, o.stripes, 0, by + 0.04, -d / 2 + 0.2 + i * d / 4.2, { shadow: false });
  if (o.wool) for (let i = 0; i < 10; i++) box(body, 0.32, 0.26, 0.32, o.wool, ((i % 3) - 1) * w * 0.33, by + h / 2 + 0.06, -d / 2 + 0.2 + Math.floor(i / 3) * d * 0.28);
  if (o.hump) box(body, w * 0.55, 0.36, d * 0.36, o.hump, 0, by + h / 2 + 0.18, -d * 0.05);
  if (o.shell) { box(body, w + 0.16, h * 0.7, d + 0.1, o.shell, 0, by + h * 0.3, 0); box(body, w * 0.8, 0.14, d * 0.8, o.shellTop || o.shell, 0, by + h * 0.68, 0); for (const [x, z] of [[-0.18, -0.2], [0.18, -0.2], [0, 0.18]]) box(body, 0.2, 0.05, 0.2, o.shellDot || 0xffffff, x * w * 2, by + h * 0.76, z * d * 1.5, { shadow: false }); }
  if (o.quills) for (let i = 0; i < 12; i++) { const q = box(body, 0.1, 0.32, 0.1, o.quills, ((i % 4) - 1.5) * w * 0.25, by + h / 2 + 0.1, -d / 2 + 0.15 + Math.floor(i / 4) * d * 0.3); q.rotation.x = -0.5; }
  if (o.antlers) for (const sx of [-1, 1]) { const a = group(head, sx * hd * 0.22, hd * 0.45, -hd * 0.1); a.rotation.z = -sx * 0.35; box(a, 0.07, 0.55, 0.07, o.antlers, 0, 0.27, 0); box(a, 0.24, 0.06, 0.06, o.antlers, sx * 0.1, 0.4, 0); box(a, 0.06, 0.2, 0.06, o.antlers, sx * 0.2, 0.5, 0); }
  if (o.tusks) for (const sx of [-1, 1]) { const t = box(head, 0.07, 0.24, 0.07, 0xfffbe8, sx * hd * 0.2, -hd * 0.32, hd * 0.6, { shadow: false }); t.rotation.x = -0.5; }
  if (o.trunk) { const tr = group(head, 0, -hd * 0.1, hd * 0.45); box(tr, hd * 0.22, hd * 0.22, hd * 0.3, o.head || o.body, 0, 0, 0.12); const t2 = box(tr, hd * 0.18, hd * 0.55, hd * 0.18, o.head || o.body, 0, -hd * 0.3, 0.22); t2.rotation.x = 0.2; }
  if (o.bigEars) for (const sx of [-1, 1]) { const e = box(head, 0.05, hd * 0.9, hd * 0.8, o.bigEars, sx * hd * 0.55, 0, -hd * 0.1); e.rotation.y = sx * 0.4; }
  if (o.patch) for (const sx of [-1, 1]) box(head, hd * 0.3, hd * 0.34, 0.03, o.patch, sx * hd * 0.22, hd * 0.04, hd * 0.45, { shadow: false });
  if (o.snout) box(head, hd * 0.5, hd * 0.34, hd * 0.25, o.snout, 0, -hd * 0.2, hd * 0.52);
  box(head, hd * 0.16, hd * 0.1, 0.06, o.nose || 0x3a2a2a, 0, o.snout ? -hd * 0.1 : -hd * 0.12, o.snout ? hd * 0.66 : hd * 0.47, { shadow: false });
  const ec = o.earC || o.head || o.body;
  for (const sx of [-1, 1]) {
    if (o.ear === 'long') { const e = box(head, hd * 0.2, hd * 0.85, hd * 0.12, ec, sx * hd * 0.2, hd * 0.82, -hd * 0.1); e.rotation.z = -sx * 0.12; }
    else if (o.ear === 'point') { const e = box(head, hd * 0.26, hd * 0.34, hd * 0.12, ec, sx * hd * 0.3, hd * 0.6, -hd * 0.1); e.rotation.z = -sx * 0.25; }
    else if (o.ear === 'flop') { const e = box(head, hd * 0.14, hd * 0.5, hd * 0.32, ec, sx * hd * 0.55, hd * 0.12, -hd * 0.05); e.rotation.z = sx * 0.2; }
    else if (o.ear === 'round') box(head, hd * 0.24, hd * 0.24, hd * 0.12, ec, sx * hd * 0.32, hd * 0.52, -hd * 0.12);
  }
  if (o.horn) { const hn = box(head, hd * 0.12, hd * 0.55, hd * 0.12, o.horn, 0, hd * 0.68, hd * 0.2); hn.rotation.x = 0.35; }
  if (o.mane) o.mane.forEach((c, i) => box(body, 0.14, 0.2, 0.22, c, 0, by + h / 2 + 0.06, d / 2 - 0.1 - i * 0.2));
  const tc = o.tailC || o.body;
  if (o.tail === 'puff') box(body, 0.3, 0.3, 0.3, tc, 0, by + h * 0.25, -d / 2 - 0.1);
  else if (o.tail === 'long') { const t = box(body, 0.14, 0.14, 0.7, tc, 0, by + h * 0.4, -d / 2 - 0.3); t.rotation.x = -0.5; }
  else if (o.tail === 'big') { const t = box(body, 0.34, 0.34, 0.75, tc, 0, by + h * 0.3, -d / 2 - 0.3); t.rotation.x = -0.4; box(body, 0.34, 0.34, 0.2, 0xffffff, 0, by + h * 0.55, -d / 2 - 0.62); }
  else if (o.tail === 'curl') box(body, 0.16, 0.16, 0.16, tc, 0, by + h * 0.35, -d / 2 - 0.08);
  else if (o.tail === 'fin') box(body, w * 0.9, 0.08, 0.35, tc, 0, leg + 0.06, -d / 2 - 0.15);
  else if (o.tail === 'stub') box(body, 0.12, 0.12, 0.18, tc, 0, by + h * 0.2, -d / 2 - 0.06);
  if (o.wings) for (const sx of [-1, 1]) { const wg = box(body, 0.5, 0.06, 0.6, o.wings, sx * (w / 2 + 0.22), by + h * 0.4, 0); wg.rotation.z = sx * 0.4; }
  return { root, body, head, legs, eyes: E, phase: Math.random() * 6, kind: 'beast' };
}

// птица (цыплёнок, гусь): o = { body, beak, legC, wing, neck }
// длинноногие (фламинго): o.legLen; сова: o.eye, o.tufts; попугай: o.crest, o.tailC; утка: o.flat (широкий клюв)
export function buildBird(p, o) {
  const root = group(p), body = group(root), legs = [], LL = o.legLen || 0.32, up = LL - 0.32;
  for (const sx of [-1, 1]) { const L = group(body, sx * 0.18, LL, 0); legs.push(L); box(L, 0.08, LL, 0.08, o.legC || 0xff9f1a, 0, -LL / 2, 0); box(L, 0.2, 0.05, 0.24, o.legC || 0xff9f1a, 0, -LL + 0.01, 0.06); }
  box(body, 0.75, 0.6, 0.85, o.body, 0, 0.62 + up, 0);
  box(body, 0.3, o.tailC ? 0.12 : 0.2, o.tailC ? 0.6 : 0.3, o.tailC || o.body, 0, 0.78 + up, o.tailC ? -0.65 : -0.5);   // хвостик
  if (o.belly) box(body, 0.5, 0.4, 0.04, o.belly, 0, 0.6 + up, 0.43, { shadow: false });
  for (const sx of [-1, 1]) { const wg = box(body, 0.1, 0.36, 0.55, o.wing || o.body, sx * 0.42, 0.66 + up, -0.02); wg.rotation.z = sx * 0.15; }
  const neck = o.neck || 0;
  if (neck) box(body, 0.32, neck, 0.32, o.body, 0, 0.9 + up + neck / 2, 0.3);
  const head = group(body, 0, 1.05 + up + neck, 0.3 + (neck ? 0.05 : 0));
  box(head, 0.5, 0.48, 0.48, o.head || o.body);
  const E = { open: [], closed: [] }, es = 0.13 * (o.eye || 1);
  eyes(head, 0.25, o.eye > 1 ? 0.13 : 0.13, 0.06, es, E);
  if (o.flat) box(head, 0.36, 0.08, 0.3, o.beak || 0xff9f1a, 0, -0.1, 0.34);
  else box(head, 0.22, 0.1, 0.24, o.beak || 0xff9f1a, 0, -0.06, 0.32);
  if (o.tuft) box(head, 0.1, 0.18, 0.1, o.body, 0, 0.32, 0);
  if (o.crest) for (let i = 0; i < 3; i++) { const c = box(head, 0.08, 0.26 - i * 0.05, 0.1, o.crest, 0, 0.34, 0.05 - i * 0.12); c.rotation.x = -0.3 - i * 0.2; }
  if (o.tufts) for (const sx of [-1, 1]) { const t = box(head, 0.1, 0.2, 0.08, o.body, sx * 0.18, 0.3, -0.05); t.rotation.z = -sx * 0.3; }
  return { root, body, head, legs, eyes: E, phase: Math.random() * 6, kind: 'bird' };
}

// динозаврик на двух ногах (сторож) или дракончик с крыльями (питомец)
export function buildDino(p, o) {
  const root = group(p), body = group(root), legs = [];
  for (const sx of [-1, 1]) { const L = group(body, sx * 0.3, 0.55, -0.05); legs.push(L); box(L, 0.3, 0.55, 0.36, o.body, 0, -0.27, 0); box(L, 0.34, 0.12, 0.48, o.belly || o.body, 0, -0.5, 0.08); }
  box(body, 0.9, 0.85, 1.1, o.body, 0, 0.98, 0);
  box(body, 0.6, 0.6, 0.06, o.belly || o.body, 0, 0.92, 0.56, { shadow: false });
  const tail = box(body, 0.4, 0.4, 0.9, o.body, 0, 0.8, -0.9); tail.rotation.x = 0.25;
  for (const sx of [-1, 1]) { const a = box(body, 0.12, 0.3, 0.14, o.body, sx * 0.4, 1.0, 0.55); a.rotation.x = -0.6; }
  const head = group(body, 0, 1.65, 0.45);
  box(head, 0.75, 0.62, 0.8, o.body);
  box(head, 0.6, 0.18, 0.3, o.belly || o.body, 0, -0.2, 0.4);               // улыбка-морда
  const E = { open: [], closed: [] };
  eyes(head, 0.41, 0.2, 0.1, 0.2, E);
  for (let i = 0; i < 4; i++) box(body, 0.1, 0.18, 0.18, o.spikes || 0xffd93b, 0, 1.45 - i * 0.12, 0.25 - i * 0.35);
  if (o.wings) for (const sx of [-1, 1]) { const wg = box(body, 0.9, 0.06, 0.6, o.wings, sx * 0.85, 1.25, -0.1); wg.rotation.z = sx * 0.45; }
  return { root, body, head, legs, eyes: E, phase: Math.random() * 6, kind: 'dino' };
}

// походка: speed — насколько быстро идёт (0 — стоит), hop — питомцы подпрыгивают
export function animateAnimal(m, dt, speed, { hop = false } = {}) {
  const moving = speed > 0.1;
  m.phase += dt * (moving ? 5 + speed * 1.6 : 1.5);
  const s = Math.sin(m.phase), a = moving ? Math.min(0.25 + speed * 0.08, 0.8) : 0;
  m.legs.forEach((L, i) => { L.rotation.x = damp(L.rotation.x, (i === 0 || i === 3 ? s : -s) * a, 20, dt); });
  if (m.kind !== 'beast') m.legs.forEach((L, i) => { L.rotation.x = (i ? -s : s) * a; });
  const bob = moving ? (hop ? Math.abs(s) * 0.25 : Math.abs(s) * 0.06) : Math.sin(m.phase) * 0.015;
  m.body.position.y = bob;
}
