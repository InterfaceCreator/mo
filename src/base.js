// Постройки на базе: магазин и беговая дорожка (тренирует скорость).
import { T, scene, group, box } from './engine.js';
import { SHOP, TREADMILL, addCollider, onLevelReset } from './world.js';
import { sprite, makeLabel } from './fx.js';

const tread = { stripes: [], bar: null, barCv: null, label: null };
onLevelReset(() => { tread.stripes = []; tread.bar = tread.label = null; lastPart = -1; });

export function buildBase() {
  // магазин: прилавок, полосатый навес, вывеска
  const s = group(scene, SHOP.x, 0, SHOP.z);
  box(s, 7, 2.2, 3, 0x8a5a2b, 0, 1.1, 0, { studs: true });
  box(s, 7.2, 0.3, 3.2, 0xffd23f, 0, 2.35, 0);
  for (const sx of [-1, 1]) box(s, 0.4, 4.6, 0.4, 0xffffff, sx * 3.45, 2.3, 1.45);   // чуть снаружи прилавка
  for (let i = 0; i < 8; i++) { const a = box(s, 0.95, 0.25, 3.8, i % 2 ? 0xffffff : 0xff4a4a, -3.33 + i * 0.95, 4.75, 0.4); a.rotation.x = 0.25; }
  for (let i = 0; i < 4; i++) box(s, 0.7, 0.7, 0.7, [0x3fa7ff, 0xff7ac8, 0x5fd35f, 0xffd93b][i], -2.4 + i * 1.6, 2.85, 0);
  addCollider({ x0: SHOP.x - 3.5, x1: SHOP.x + 3.5, y0: 0, y1: 2.5, z0: SHOP.z - 1.5, z1: SHOP.z + 1.5 });
  const sign = makeLabel(5, 1.25); sign.position.set(SHOP.x, 6.6, SHOP.z); scene.add(sign); sign.userData.set('🛒 Магазин', { color: '#ffffff' });
  // зелёная плита перед прилавком — встал на неё, и магазин открылся
  box(scene, 3, 0.12, 2.4, 0x5fd35f, SHOP.pad.x, 0.06, SHOP.pad.z, { shadow: false });

  // беговая дорожка
  const t = group(scene, TREADMILL.x, 0, TREADMILL.z);
  box(t, TREADMILL.w + 0.8, 0.3, TREADMILL.d + 0.6, 0x555a6a, 0, 0.15, 0);
  for (let i = 0; i < 8; i++) tread.stripes.push(box(t, TREADMILL.w, 0.06, 0.35, 0x2b2b33, 0, 0.33, -TREADMILL.d / 2 + i * TREADMILL.d / 8, { shadow: false }));
  box(t, TREADMILL.w, 0.04, TREADMILL.d, 0x3a3a44, 0, 0.31, 0, { shadow: false });
  for (const sx of [-1, 1]) { box(t, 0.25, 2.2, 0.25, 0x9aa4ad, sx * 1.9, 1.1, -TREADMILL.d / 2 + 0.3); }
  box(t, 4, 0.25, 0.35, 0xff5a5a, 0, 2.2, -TREADMILL.d / 2 + 0.3);
  addCollider({ x0: TREADMILL.x - 1.9, x1: TREADMILL.x + 1.9, y0: 0, y1: 0.32, z0: TREADMILL.z - 3.3, z1: TREADMILL.z + 3.3 });
  tread.label = makeLabel(3, 0.75); tread.label.position.set(TREADMILL.x, 4.3, TREADMILL.z - 2.7); scene.add(tread.label);
  tread.barCv = document.createElement('canvas'); tread.barCv.width = 256; tread.barCv.height = 40;
  tread.bar = sprite(new T.CanvasTexture(tread.barCv), 3, 0.47); tread.bar.position.set(TREADMILL.x, 3.6, TREADMILL.z - 2.7); scene.add(tread.bar);
}

export const onShopPad = p => Math.abs(p.x - SHOP.pad.x) < 1.6 && Math.abs(p.z - SHOP.pad.z) < 1.4 && p.y < 0.5;
export const onTreadmill = p => Math.abs(p.x - TREADMILL.x) < TREADMILL.w / 2 && Math.abs(p.z - TREADMILL.z) < TREADMILL.d / 2 && p.y < 0.6;

// level — текущий уровень скорости, part — заполнение полоски (0..1), running — кто-то бежит
let lastPart = -1;
export function updateTreadmill(dt, level, part, running) {
  if (!tread.label) return;
  if (running) for (const s of tread.stripes) { s.position.z += dt * 6; if (s.position.z > TREADMILL.d / 2) s.position.z -= TREADMILL.d; }
  tread.label.userData.set('👟 ' + level + ' → ' + (level + 1), { color: '#ffffff' });
  const q = Math.round(part * 100); if (q === lastPart) return; lastPart = q;
  const c = tread.barCv.getContext('2d'); c.clearRect(0, 0, 256, 40);
  c.fillStyle = '#2b2340'; c.beginPath(); c.roundRect ? c.roundRect(2, 2, 252, 36, 18) : c.rect(2, 2, 252, 36); c.fill();
  if (part > 0.02) { c.fillStyle = '#5fd35f'; c.beginPath(); const w = Math.max(28, 244 * part); c.roundRect ? c.roundRect(6, 6, w, 28, 14) : c.rect(6, 6, w, 28); c.fill(); }
  tread.bar.material.map.needsUpdate = true;
}
