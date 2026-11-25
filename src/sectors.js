// Сектора открытого мира 🧱: база поделена на куски (площадь, аквапарк, дача; потом — новые зоны).
// Сектор живёт по расстоянию от героя до его границ:
//   < SHOW     — построен и виден, работает (логика, коллизии);
//   < PREBUILD — построен заранее, но спрятан (чтобы подойти — и сразу всё на месте, без рывка);
//   > HIDE     — спрятан: не рисуется, коллизии выключены, логика спит;
//   > DISPOSE  — выгружен целиком: геометрия, материалы, коллизии — память освобождается. Подойдёшь — построится снова.
// Всё состояние модулей (огород, бункер, дача…) хранится в сохранении, поэтому пересборка ничего не теряет.
// При постройке сектор запоминает всё, что он добавил: свою группу, то, что модули положили прямо в сцену (подписи),
// коллизии, деревья (их рубят топором), воду с рябью, склеенные меши — и при выгрузке убирает ровно это.
// Строится не больше одного сектора за кадр. ?perf — на экране видно, сколько миллисекунд строился каждый сектор.
import { scene, group } from './engine.js';
import { captureColliders, removeColliders, onLevelReset, bake, removeChunks, trees } from './world.js';
import { waters } from './terrain.js';

const SHOW = 95, HIDE = 125, PREBUILD = 150, DISPOSE = 230;   // туман — 60…150 м: появление и исчезновение не видно
const PERF = new URLSearchParams(location.search).has('perf');

class Sector {
  constructor({ id, bounds, build, keep = false }) {
    this.id = id; this.bounds = bounds; this.buildFn = build; this.keep = keep;   // keep — не выгружать (там земля базы)
    this.built = false; this.active = false; this.reset();
  }
  reset() { this.group = null; this.loose = []; this.colliders = []; this.chunks = []; this.trees = []; this.waters = []; }
  dist(p) {
    const b = this.bounds;
    return Math.hypot(Math.max(b.x0 - p.x, 0, p.x - b.x1), Math.max(b.z0 - p.z, 0, p.z - b.z1));
  }
  // построить: всё, что появилось в сцене и в общих списках за время постройки, — принадлежит сектору
  build() {
    const t0 = performance.now();
    const g = group(scene); g.userData.sector = this.id;
    const before = new Set(scene.children), tr0 = trees.length, wa0 = waters.length;
    this.colliders = captureColliders(() => this.buildFn(g));
    this.loose = scene.children.filter(o => o !== g && !before.has(o));
    this.trees = trees.slice(tr0); this.waters = waters.slice(wa0);
    this.chunks = bake(g) || [];
    this.group = g; this.built = true; this.active = true;
    perf(this.id, performance.now() - t0);
  }
  show(on) {
    if (this.active === on) return;
    this.active = on;
    if (this.group) this.group.visible = on;
    for (const o of this.loose) o.visible = on;
    for (const m of this.chunks) m.visible = on;
    // коллизии: прячем все, а при возврате — как было (открытая дверь остаётся открытой)
    if (on) for (const c of this.colliders) { c.off = !!c.offBefore; delete c.offBefore; }
    else for (const c of this.colliders) { c.offBefore = !!c.off; c.off = true; }
  }
  dispose() {
    if (!this.built || this.keep) return;
    this.show(false);
    const free = o => o.traverse(m => {
      if (m.geometry && !m.geometry.userData?.cached) m.geometry.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mt of mats) { if (mt.userData?.cached) continue; mt.map?.dispose(); mt.dispose(); }   // свои текстуры (подписи, вода) — тоже
    });
    for (const o of [this.group, ...this.loose]) { scene.remove(o); free(o); }
    removeChunks(this.chunks); removeColliders(this.colliders);
    const del = (arr, own) => { const s = new Set(own); for (let i = arr.length - 1; i >= 0; i--) if (s.has(arr[i])) arr.splice(i, 1); };
    del(trees, this.trees); del(waters, this.waters);
    this.reset(); this.built = false;
    perf(this.id, -1);
  }
}

let sectors = [];

// база: площадь (с землёй базы, всегда построена) + аквапарк и дача — по мере приближения
export function setupBaseSectors(w, save, profile, hero, B, at = hero.pos) {
  clearSectors();
  const north = new Sector({ id: 'base_north', bounds: { x0: -72, x1: 72, z0: -15, z1: 65 }, keep: true });
  north.colliders = captureColliders(() => {
    B.playground(w);
    B.house(w, B.duoMe(), save, B.houseFor(B.duoMe()));
    B.cup(w, save, profile, B.houseFor(B.duoMe()));
    B.duoBase(w);
  });
  north.chunks = bake(w) || [];
  north.group = w; north.built = north.active = true;
  sectors = [
    north,
    new Sector({ id: 'base_park', bounds: { x0: -72, x1: 72, z0: 60, z1: 115 }, build: g => { B.park(g, save, profile); B.spa(g); } }),
    new Sector({ id: 'base_dacha', bounds: { x0: -72, x1: 72, z0: 115, z1: 220 }, build: g => { B.dacha(g); B.garden(save, hero); B.bunker(g, save, profile); } }),
  ];
  // при входе: всё, что рядом с точкой появления, — сразу (герой не должен оказаться без земли под ногами)
  for (const s of sectors) if (!s.built && s.dist(at) < SHOW) s.build();
  updateSectors(0, at);
}

// раз в кадр (на базе). p — где герой
export function updateSectors(dt, p) {
  if (!sectors.length || !p) return;
  let builtNow = false;
  for (const s of sectors) {
    const d = s.dist(p);
    if (d < SHOW) { if (!s.built) { s.build(); builtNow = true; } s.show(true); }
    else if (d < PREBUILD && !s.built && !builtNow) { s.build(); s.show(false); builtNow = true; }   // заранее, по одному за кадр
    else if (d > DISPOSE) { if (s.keep) s.show(false); else s.dispose(); }
    else if (d > HIDE) s.show(false);
  }
}

// работает ли сектор (его логику обновлять). Нет секторов на уровне — всё «работает»
export function isSectorActive(id) {
  const s = sectors.find(x => x.id === id);
  return s ? s.built && s.active : true;
}
export const sectorInfo = () => sectors.map(s => ({ id: s.id, built: s.built, active: s.active }));

export function clearSectors() { sectors = []; }   // сами объекты убирает clearLevel при смене локации
onLevelReset(clearSectors);

// ?perf: сколько строился сектор (на телефоне — есть ли рывок)
let perfEl = null; const perfLog = [];
function perf(id, ms) {
  if (!PERF) return;
  perfLog.unshift(ms < 0 ? `🗑 ${id}: выгружен` : `🧱 ${id}: ${Math.round(ms)} мс`); perfLog.length = Math.min(perfLog.length, 6);
  if (!perfEl) { perfEl = document.createElement('div'); perfEl.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:50;background:#0009;color:#fff;font:12px monospace;padding:6px 8px;border-radius:8px;pointer-events:none;white-space:pre'; document.body.appendChild(perfEl); }
  perfEl.textContent = perfLog.join('\n');
}
