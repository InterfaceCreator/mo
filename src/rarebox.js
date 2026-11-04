// Сундучки с нарядами 🎁: на базе, в Лесу и в Осени лежит по сундучку в случайном месте, над ним — золотой луч (видно издалека).
// Подбежал — открыл: редкая вещь этого места, которой нет в магазине (clothes.js, rare). Всё собрал — внутри монеты.
// Открыл — через 15 минут сундучок появится снова, уже в другом месте.
import { T, scene, group, box } from './engine.js';
import { groundY, nearColliders, onLevelReset, level, PEN_L, PEN_R } from './world.js';
import { puff, confetti } from './fx.js';
import { rareOf, ward } from './clothes.js';
import { PLOTS } from './buildings.js';

const AGAIN = 15 * 60 * 1000, COINS = 300;
// где искать место: границы локации и запретные зоны (вода, загоны)
const AREA = {
  base: { x0: -42, x1: 42, z0: 3, z1: 62, no: [PEN_L, PEN_R, { x0: 33, x1: 43, z0: 53, z1: 63 }] },   // и место под второй домик (игра вдвоём)
  forest: { x0: -90, x1: 90, z0: -90, z1: 90, no: [] },
  autumn: { x0: -62, x1: 62, z0: -62, z1: 62, no: [] },
};
const BEAM = (() => { const m = new T.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.45, depthWrite: false, fog: false }); m.userData.cached = true; return m; })();

let st = null;
onLevelReset(() => { st = null; });

const boxOf = save => save.rareBox || (save.rareBox = {});
// случайное свободное место: на земле, не в воде, не внутри построек, подальше от точки появления
function spot(loc) {
  const A = AREA[loc];
  for (let i = 0; i < 300; i++) {
    const x = A.x0 + Math.random() * (A.x1 - A.x0), z = A.z0 + Math.random() * (A.z1 - A.z0), y = groundY(x, z);
    if (y < 0 || y > 6 || A.no.some(R => x > R.x0 - 2 && x < R.x1 + 2 && z > R.z0 - 2 && z < R.z1 + 2)) continue;
    if (level.safe && Math.hypot(x - level.safe.x, z - level.safe.z) < level.safe.r + 4) continue;
    if (loc === 'base' && PLOTS.some(pl => Math.hypot(x - pl.x, z - pl.z) < 7)) continue;          // не на участках под постройки
    if (nearColliders(x - 1.5, x + 1.5, z - 1.5, z + 1.5).some(c => !c.off && c.y1 > y + 0.3 && c.y0 < y + 3 && x > c.x0 - 1.5 && x < c.x1 + 1.5 && z > c.z0 - 1.5 && z < c.z1 + 1.5)) continue;
    return { x: +x.toFixed(1), z: +z.toFixed(1) };
  }
  return null;
}

export function buildRareBox(loc, save) {
  if (!AREA[loc]) return;
  st = { loc, save, g: null };
  show();
}
// поставить сундучок, если пора (время ожидания вышло); место — сохранённое или новое
function show() {
  const S = boxOf(st.save), b = S[st.loc] || (S[st.loc] = { at: 0 });
  if (Date.now() < b.at || st.g) return;
  if (b.x === undefined) { const p = spot(st.loc); if (!p) return; Object.assign(b, p); }
  const y = groundY(b.x, b.z), g = group(scene, b.x, y, b.z); g.userData.dynamic = true;
  const ch = group(g, 0, 0.6, 0);
  box(ch, 1.4, 0.8, 1, 0x9b6bff, 0, 0, 0); box(ch, 1.5, 0.35, 1.1, 0x7a4ad8, 0, 0.55, 0);
  for (const x of [-0.5, 0.5]) box(ch, 0.14, 1.2, 1.12, 0xffd23f, x, 0.15, 0);
  box(ch, 0.26, 0.3, 0.06, 0xffd23f, 0, 0.1, 0.53); box(ch, 0.5, 0.25, 0.5, 0xff7ac8, 0, 0.85, 0);
  const beam = new T.Mesh(new T.CylinderGeometry(0.9, 1.1, 40, 12, 1, true), BEAM); beam.position.y = 20; g.add(beam);
  st.g = g; st.ch = ch; st.beam = beam; st.b = b;
}

// раз в кадр. Вернёт { item } — нашёл редкую вещь, или { coins } — всё уже собрано
export function updateRareBox(dt, hero) {
  if (!st) return {};
  if (!st.g) { if ((st.wait = (st.wait || 0) - dt) <= 0) { st.wait = 5; show(); } return {}; }
  const t = performance.now() / 1000, p = hero.pos, b = st.b;
  st.ch.rotation.y = t * 0.8; st.ch.position.y = 0.6 + Math.abs(Math.sin(t * 2)) * 0.25;
  st.beam.material.opacity = 0.4 + Math.sin(t * 3) * 0.12;
  if (Math.hypot(p.x - b.x, p.z - b.z) > 1.8 || Math.abs(p.y - st.g.position.y) > 2.5) return {};
  // открыл: вещь, которой ещё нет; сундучок пропадает, следующий — через 15 минут в другом месте
  const W = ward(st.save), left = rareOf(st.loc).filter(c => !W.own[c.id]), item = left[Math.floor(Math.random() * left.length)];
  const at = st.g.position.clone().setY(st.g.position.y + 1.5);
  confetti(at, 90); puff(item ? item.icon : '🪙', at.clone().setY(at.y + 1.5), { size: 2.4, rise: 1, life: 2.2 }); puff('✨', at, { size: 2, rise: 2 });
  scene.remove(st.g); st.g = null;
  Object.assign(b, { at: Date.now() + AGAIN, x: undefined, z: undefined });
  if (item) W.own[item.id] = true;
  return item ? { item, left: left.length - 1 } : { coins: COINS };
}
// для компаса и карты: где сейчас сундучок
export const rareBoxAt = () => st?.g ? { x: st.b.x, y: st.g.position.y + 1, z: st.b.z } : null;
