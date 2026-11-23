// Динамический стриминг секторов / чанков для открытого мира (База, Дача и будущие зоны).
// Сектор вдали:
//   - скрывает меши (visible = false: 0 вызовов отрисовки и 0 нагрузки на GPU),
//   - отключает коллизии (c.off = true: физика игрока и камеры не проверяет далёкие стены),
//   - приостанавливает логику update (0 нагрузки на CPU).
// Сектор вблизи: плавно активируется, полностью сохраняя визуальное качество и интерактивность.
import { scene, group } from './engine.js';
import { captureColliders, removeColliders, onLevelReset, bake, removeChunks } from './world.js';

export class Sector {
  constructor({ id, bounds, center, build, update }) {
    this.id = id;
    this.bounds = bounds; // { x0, x1, z0, z1 }
    this.center = center || {
      x: (bounds.x0 + bounds.x1) / 2,
      z: (bounds.z0 + bounds.z1) / 2,
    };
    this.buildFn = build;
    this.updateFn = update;
    this.group = null;
    this.colliders = [];
    this.bakedChunks = [];
    this.built = false;
    this.active = false;
  }

  ensureBuilt(save, profile, hero) {
    if (this.built) return;
    this.group = group(scene);
    this.group.userData.sector = this.id;
    this.colliders = captureColliders(() => {
      this.buildFn(this.group, save, profile, hero);
    });
    this.bakedChunks = bake(this.group) || [];
    this.built = true;
  }

  activate(save, profile, hero) {
    this.ensureBuilt(save, profile, hero);
    if (!this.active) {
      this.active = true;
      if (this.group) this.group.visible = true;
      for (const m of this.bakedChunks) m.visible = true;
      for (const c of this.colliders) c.off = false;
    }
  }

  deactivate() {
    if (this.active) {
      this.active = false;
      if (this.group) this.group.visible = false;
      for (const m of this.bakedChunks) m.visible = false;
      for (const c of this.colliders) c.off = true;
    }
  }

  update(dt, hero, save) {
    if (!this.active) return;
    if (this.updateFn) this.updateFn(dt, hero, save);
  }

  dispose() {
    this.deactivate();
    if (this.built) {
      if (this.group) {
        scene.remove(this.group);
        this.group.traverse(o => {
          if (o.geometry && !o.geometry.userData?.cached) o.geometry.dispose();
          if (o.material && !o.material.userData?.cached && !o.material.map) o.material.dispose();
        });
        this.group = null;
      }
      if (this.bakedChunks.length) {
        removeChunks(this.bakedChunks);
        for (const m of this.bakedChunks) {
          scene.remove(m);
          if (m.geometry) m.geometry.dispose();
        }
        this.bakedChunks = [];
      }
      removeColliders(this.colliders);
      this.colliders = [];
      this.built = false;
    }
  }
}

let activeSectors = [];
let currentLoc = null;

// Дистанция загрузки (95 м) и выгрузки (125 м с гистерезисом 30 м)
// В тумане (Fog: 60..150м) переключение происходит абсолютно незаметно
const LOAD_DIST = 95;
const UNLOAD_DIST = 125;

export function initSectors(locId, sectorDefs, save, profile, hero) {
  clearSectors();
  currentLoc = locId;
  activeSectors = sectorDefs.map(d => new Sector(d));
  updateSectors(0, hero, save);
}

export function setupBaseSectors(w, save, profile, hero, builders) {
  clearSectors();
  currentLoc = 'base';

  // 1. Сектор Северной Базы (Порталы, площадь, загон, площадка, дом, кубок)
  const northCols = captureColliders(() => {
    builders.playground(w);
    builders.house(w, builders.duoMe(), save, builders.houseFor(builders.duoMe()));
    builders.cup(w, save, profile, builders.houseFor(builders.duoMe()));
    builders.duoBase(w);
  });
  const northBaked = bake(w) || [];
  const north = new Sector({
    id: 'base_north',
    bounds: { x0: -72, x1: 72, z0: -15, z1: 65 },
    build: () => {},
  });
  north.group = w;
  north.colliders = northCols;
  north.bakedChunks = northBaked;
  north.built = true;
  north.active = true;

  // 2. Сектор Аквапарка и Бани
  const g_park = group(scene);
  g_park.userData.sector = 'base_park';
  const parkCols = captureColliders(() => {
    builders.park(g_park, save, profile);
    builders.spa(g_park);
  });
  const parkBaked = bake(g_park) || [];
  const park = new Sector({
    id: 'base_park',
    bounds: { x0: -72, x1: 72, z0: 60, z1: 115 },
    build: () => {},
  });
  park.group = g_park;
  park.colliders = parkCols;
  park.bakedChunks = parkBaked;
  park.built = true;
  park.active = true;

  // 3. Сектор Дачи (Дорога, забор, дом дедушки и бабушки, огород, бункер)
  const g_dacha = group(scene);
  g_dacha.userData.sector = 'base_dacha';
  const dachaCols = captureColliders(() => {
    builders.dacha(g_dacha);
    builders.garden(save, hero);
    builders.bunker(g_dacha, save, profile);
  });
  const dachaBaked = bake(g_dacha) || [];
  const dacha = new Sector({
    id: 'base_dacha',
    bounds: { x0: -72, x1: 72, z0: 115, z1: 220 },
    build: () => {},
  });
  dacha.group = g_dacha;
  dacha.colliders = dachaCols;
  dacha.bakedChunks = dachaBaked;
  dacha.built = true;
  dacha.active = true;

  activeSectors = [north, park, dacha];

  // Сразу при входе выключаем далёкие секторы относительно спавна героя
  updateSectors(0, hero, save);
}

export function updateSectors(dt, hero, save) {
  if (!activeSectors.length || !hero) return;
  const p = hero.pos;

  for (const s of activeSectors) {
    const dx = Math.max(s.bounds.x0 - p.x, 0, p.x - s.bounds.x1);
    const dz = Math.max(s.bounds.z0 - p.z, 0, p.z - s.bounds.z1);
    const dist = Math.hypot(dx, dz);

    if (dist < LOAD_DIST) {
      if (!s.active) s.activate(save, null, hero);
    } else if (dist > UNLOAD_DIST) {
      if (s.active) s.deactivate();
    }

    if (s.active) {
      s.update(dt, hero, save);
    }
  }
}

export function isSectorActive(id) {
  if (!activeSectors.length) return true; // если стриминг не включен на уровне, всё активно
  const s = activeSectors.find(x => x.id === id);
  return s ? s.active : true;
}

export function clearSectors() {
  for (const s of activeSectors) {
    s.active = false;
    s.built = false;
    s.group = null;
    s.colliders = [];
    s.bakedChunks = [];
  }
  activeSectors = [];
  currentLoc = null;
}

onLevelReset(() => {
  clearSectors();
});
