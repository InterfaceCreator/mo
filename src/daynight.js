// Смена времени суток 🌅☀️🌇🌙
// Плавный суточный цикл: солнечный день → тёплый закат → звёздная ночь с луной → нежный рассвет.
// Фонари вдоль дорог, свет из окон домика, мерцающий свет от костра.
import { T, scene, camera, sun, hemi, sunDisc, setSkyGrad, SUN_OFF, SUN_DIR, group, box } from './engine.js';
import { cloudNight, onLevelReset, addCollider } from './world.js';

export const DAY_CYCLE = 480; // Полный суточный цикл: 8 минут (480 секунд)

let st = null;
onLevelReset(() => {
  if (st) {
    if (st.stars) scene.remove(st.stars);
    if (st.moon) scene.remove(st.moon);
    if (st.lampLight) scene.remove(st.lampLight);
  }
  st = null;
});

// Создание звёздного купола
function createStars() {
  const N = 500, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const th = Math.random() * Math.PI * 2;
    const ph = 0.06 * Math.PI + Math.random() * 0.44 * Math.PI; // верхняя полусфера
    const r = 320;
    pos[i * 3] = Math.cos(th) * Math.cos(ph) * r;
    pos[i * 3 + 1] = Math.sin(ph) * r;
    pos[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * r;
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  const mat = new T.PointsMaterial({
    color: 0xffffff,
    size: 2.6,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false
  });
  const stars = new T.Points(geo, mat);
  stars.userData.dynamic = true;
  stars.userData.keep = true;
  stars.renderOrder = 0;
  scene.add(stars);
  return stars;
}

// Создание сияющего диска луны
function createMoon() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(64, 64, 8, 64, 64, 60);
  g.addColorStop(0, 'rgba(255,255,248,1)');
  g.addColorStop(0.35, 'rgba(235,245,255,0.92)');
  g.addColorStop(0.70, 'rgba(160,205,255,0.32)');
  g.addColorStop(1, 'rgba(160,205,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  const tex = new T.CanvasTexture(cv);
  const mat = new T.SpriteMaterial({ map: tex, fog: false, depthWrite: false, transparent: true, opacity: 0 });
  const s = new T.Sprite(mat);
  s.scale.set(65, 65, 1);
  s.userData.dynamic = true;
  s.userData.keep = true;
  scene.add(s);
  return s;
}

// Текстура аккуратного сияющего ореола вокруг плафона фонаря
const glowTexture = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255, 235, 170, 0.95)');
  g.addColorStop(0.25, 'rgba(255, 190, 90, 0.45)');
  g.addColorStop(0.6, 'rgba(245, 140, 40, 0.10)');
  g.addColorStop(1, 'rgba(220, 100, 0, 0)');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  return new T.CanvasTexture(cv);
})();

// Текстура мягкого, широко рассеянного светового пятна под фонарём
const poolTexture = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255, 205, 110, 0.80)');
  g.addColorStop(0.25, 'rgba(255, 180, 80, 0.50)');
  g.addColorStop(0.55, 'rgba(240, 145, 45, 0.18)');
  g.addColorStop(0.80, 'rgba(220, 110, 20, 0.04)');
  g.addColorStop(1.0, 'rgba(180, 80, 0, 0)');
  c.fillStyle = g; c.fillRect(0, 0, 256, 256);
  return new T.CanvasTexture(cv);
})();

// Инициализация системы времени суток
export function initDayNight(save) {
  if (st) return st;

  // Настоящий источник света — ровно ОДИН и всегда на сцене: число источников не меняется — шейдеры не пересобираются,
  // а один источник телефон тянет спокойно. Ночью он «перелетает» к ближайшему к герою фонарю (с плавным переходом)
  // и освещает героя, стены, деревья. Остальные фонари — светящиеся плафоны, ореолы и пятна света на земле.
  const lampLight = new T.PointLight(0xffc070, 0, 13, 1);
  lampLight.userData.keep = true; scene.add(lampLight);
  st = {
    time: save?.dayTime ?? 100, // начинаем в середине солнечного дня
    nightK: 0,
    sunsetK: 0,
    sunriseK: 0,
    phase: 'day',
    stars: createStars(),
    moon: createMoon(),
    lamps: [],
    windows: [],
    lastSky: '',
    lampLight, lampAt: null, lampK: 0,
  };
  return st;
}

// Регистрация фонаря для включения/выключения света
export function registerLamp(bulbMesh, poolMesh, haloMesh, lx, lz) {
  if (!st) initDayNight();
  if (bulbMesh && typeof bulbMesh === 'object' && !bulbMesh.isObject3D && bulbMesh.bulb) {
    st.lamps.push(bulbMesh);
  } else {
    st.lamps.push({
      bulb: bulbMesh,
      pool: poolMesh,
      halo: haloMesh,
      x: lx ?? bulbMesh?.position?.x ?? 0,
      z: lz ?? bulbMesh?.position?.z ?? 0
    });
  }
}

// Регистрация окна дома (днём голубое, ночью уютный янтарный свет)
export function registerWindow(glassMesh) {
  if (!st) initDayNight();
  st.windows.push(glassMesh);
}

// Создание красивого дачного фонарного столба с ярким сиянием
export function createLampPost(parent, x, z, rotY = 0) {
  const lp = group(parent, x, 0, z);
  lp.rotation.y = rotY;

  // Опора столба и коллизия (коллизия — в мировых координатах: группа lp повёрнута и сдвинута)
  box(lp, 0.35, 3.4, 0.35, 0x3d352e, 0, 1.7, 0);
  addCollider({ x0: x - 0.18, x1: x + 0.18, y0: 0, y1: 3.4, z0: z - 0.18, z1: z + 0.18 });
  box(lp, 0.6, 0.3, 0.6, 0x5a4d40, 0, 0.15, 0);
  // Металлический/деревянный кронштейн фонаря
  box(lp, 0.7, 0.12, 0.12, 0x2b241e, 0.3, 3.25, 0);
  box(lp, 0.1, 0.5, 0.1, 0x2b241e, 0.18, 2.95, 0);

  // Корпус фонаря
  box(lp, 0.55, 0.12, 0.55, 0x1f1d1a, 0.55, 3.38, 0); // крышка фонаря
  box(lp, 0.45, 0.08, 0.45, 0x1f1d1a, 0.55, 2.82, 0); // донышко фонаря

  // Светящийся плафон
  const bulbMat = new T.MeshBasicMaterial({ color: 0x8a7f66 });
  const bulbGeo = new T.BoxGeometry(0.38, 0.48, 0.38);
  const bulb = new T.Mesh(bulbGeo, bulbMat);
  bulb.position.set(0.55, 3.1, 0);
  bulb.userData.dynamic = true;
  lp.add(bulb);

  // Яркий сияющий ореол вокруг плафона
  const haloMat = new T.SpriteMaterial({
    map: glowTexture,
    blending: T.AdditiveBlending,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false
  });
  const halo = new T.Sprite(haloMat);
  halo.position.set(0.55, 3.1, 0);
  halo.scale.set(2.4, 2.4, 1);
  halo.userData.dynamic = true;
  lp.add(halo);

  // Мягкое широкое световое пятно на земле под фонарём (аддитивное смешивание)
  // Координаты пятна в мировом пространстве: смещены в сторону свисания плафона
  const lx = x + Math.cos(rotY) * 0.55;
  const lz = z - Math.sin(rotY) * 0.55;
  const poolMat = new T.MeshBasicMaterial({
    map: poolTexture,
    blending: T.AdditiveBlending, // свет ДОБАВЛЯЕТСЯ к текстуре земли
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: T.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2   // поверх дорожек (они чуть выше земли)
  });
  const poolGeo = new T.PlaneGeometry(12.0, 12.0); // пятно света ~6 м вокруг столба
  const pool = new T.Mesh(poolGeo, poolMat);
  pool.position.set(lx, 0.1, lz);                    // выше дорожек (0.08) — иначе пятно прячется под ними
  pool.rotation.x = -Math.PI / 2;
  pool.userData.dynamic = true;
  parent.add(pool);

  registerLamp(bulb, pool, halo, lx, lz);
  return { group: lp, bulb, pool, halo };
}

// Текущий коэффициент ночи (0 — день, 1 — глубокая ночь)
// объект ещё в сцене (сектор не выгружен) и виден (сектор не спрятан)
const inScene = o => { for (; o; o = o.parent) if (o === scene) return true; return false; };
const shown = o => { for (; o; o = o.parent) { if (!o.visible) return false; if (o === scene) return true; } return false; };

export function getNightK() {
  return st ? st.nightK : 0;
}

// Фаза суток ('day', 'sunset', 'night', 'sunrise')
export function getDayPhase() {
  return st ? st.phase : 'day';
}

export function getDayTime() {
  return st ? st.time : 100;
}

export function setDayTime(timeSec) {
  if (!st) initDayNight();
  st.time = (timeSec % DAY_CYCLE + DAY_CYCLE) % DAY_CYCLE;
}

// Переключение на конкретную или следующую фазу (для кнопки в интерфейсе)
export function skipToPhase(target) {
  if (!st) initDayNight();
  if (target === 'day') st.time = 80;
  else if (target === 'sunset') st.time = 245;
  else if (target === 'night') st.time = 320;
  else if (target === 'sunrise') st.time = 425;
  else {
    // Следующая фаза по кругу
    if (st.phase === 'day') st.time = 245;
    else if (st.phase === 'sunset') st.time = 320;
    else if (st.phase === 'night') st.time = 425;
    else st.time = 80;
  }
}

// Цветовые палитры для неба и освещения
const COL_DAY_HOR = new T.Color(0x8fd3ff);
const COL_DAY_TOP = new T.Color(0x3f8fe0);

const COL_SUNSET_HOR = new T.Color(0xe86438);
const COL_SUNSET_TOP = new T.Color(0x5a2560);

const COL_NIGHT_HOR = new T.Color(0x0a1226);
const COL_NIGHT_TOP = new T.Color(0x040714);

const COL_SUNRISE_HOR = new T.Color(0xe58265);
const COL_SUNRISE_TOP = new T.Color(0x3c5c9a);

const COL_WIN_DAY = new T.Color(0x9fdcff);
const COL_WIN_NIGHT = new T.Color(0xffc244);

export function updateDayNight(dt, hero, levelId, save) {
  if (!st) initDayNight(save);
  // фонари регистрируются при постройке локации раньше первого кадра — тогда время ещё не взято из сохранения
  if (save && !st.synced) { st.synced = true; if (save.dayTime != null) st.time = save.dayTime; }

  // Цикл смены суток работает на базе, в парке и на даче
  if (levelId !== 'base') {
    if (!st.offBase) {                                                // не на базе — дневной свет (ушли ночью — свет был лунный; небо красит сама локация)
      st.offBase = true;
      st.nightK = st.sunsetK = st.sunriseK = 0; st.phase = 'day'; st.lastSky = '';
      st.stars.material.opacity = 0;
      st.moon.material.opacity = 0;
      sun.color.set(0xfff1d8); sun.intensity = 0.85;
      hemi.color.set(0xe2f2ff); hemi.groundColor.set(0x8fae6a); hemi.intensity = 0.7;
      sunDisc.material.opacity = 1;
      if (st.lampLight) st.lampLight.intensity = 0; st.lampAt = null; st.lampK = 0;
      SUN_OFF.set(14, 30, 10); SUN_DIR.copy(SUN_OFF).normalize();
      cloudNight(0);
    }
    return;
  }

  st.offBase = false;
  // Обновление времени
  st.time = (st.time + dt) % DAY_CYCLE;
  if (save) save.dayTime = st.time;
  const p = st.time / DAY_CYCLE; // от 0.0 до 1.0

  // Фазы суточного цикла (480 сек = 8 мин):
  // 0.00 .. 0.50 (4.0 мин) — Солнечный день (nightK = 0)
  // 0.50 .. 0.625 (1.0 мин) — Закат (плавный переход 0 -> 1)
  // 0.625 .. 0.875 (2.0 мин) — Звёздная ночь (nightK = 1)
  // 0.875 .. 1.00 (1.0 мин) — Рассвет (плавный переход 1 -> 0)
  let nightK = 0, sunsetK = 0, sunriseK = 0, phase = 'day';

  if (p < 0.50) {
    nightK = 0;
    phase = 'day';
  } else if (p < 0.625) {
    const k = (p - 0.50) / 0.125;
    nightK = k * k * (3 - 2 * k); // smoothstep
    sunsetK = Math.sin(k * Math.PI);
    phase = 'sunset';
  } else if (p < 0.875) {
    nightK = 1;
    phase = 'night';
  } else {
    const k = (p - 0.875) / 0.125;
    nightK = 1 - k * k * (3 - 2 * k); // smoothstep
    sunriseK = Math.sin(k * Math.PI);
    phase = 'sunrise';
  }

  st.nightK = nightK;
  st.sunsetK = sunsetK;
  st.sunriseK = sunriseK;
  st.phase = phase;

  // 1. Плавный цвет неба и тумана
  const curHor = new T.Color().copy(COL_DAY_HOR);
  const curTop = new T.Color().copy(COL_DAY_TOP);

  if (sunsetK > 0) {
    curHor.lerp(COL_SUNSET_HOR, sunsetK);
    curTop.lerp(COL_SUNSET_TOP, sunsetK);
  }
  if (nightK > 0) {
    curHor.lerp(COL_NIGHT_HOR, nightK);
    curTop.lerp(COL_NIGHT_TOP, nightK);
  }
  if (sunriseK > 0) {
    curHor.lerp(COL_SUNRISE_HOR, sunriseK);
    curTop.lerp(COL_SUNRISE_TOP, sunriseK);
  }

  const skyKey = curHor.getHexString() + curTop.getHexString();     // небо перекрашиваем, только когда цвет изменился
  if (skyKey !== st.lastSky) { st.lastSky = skyKey; setSkyGrad(curHor, curTop); }

  // 2. Движение солнца и луны по небосводу + перемещение теней
  // Солнце всходит на востоке (+X), поднимается в зенит, заходит на западе (-X)
  const sunAngle = (p - 0.25) * Math.PI * 2;
  const sunX = Math.cos(sunAngle) * 22;
  const sunY = Math.max(4, Math.sin(sunAngle) * 32);
  const sunZ = 12 + Math.cos(sunAngle * 0.5) * 4;
  SUN_OFF.set(sunX, sunY, sunZ);
  SUN_DIR.copy(SUN_OFF).normalize();

  // Освещение: солнце и окружающий свет (hemi)
  if (sunsetK > 0.1) {
    sun.color.lerpColors(new T.Color(0xfff1d8), new T.Color(0xff7c32), sunsetK);
    sun.intensity = 0.85 * (1 - nightK * 0.7);
    hemi.color.lerpColors(new T.Color(0xe2f2ff), new T.Color(0xff9977), sunsetK);
    hemi.groundColor.lerpColors(new T.Color(0x8fae6a), new T.Color(0x503320), sunsetK);
    hemi.intensity = 0.7 * (1 - 0.5 * nightK);
    sunDisc.material.opacity = Math.max(0, 1 - nightK * 2);
  } else if (sunriseK > 0.1) {
    sun.color.lerpColors(new T.Color(0xfff1d8), new T.Color(0xffa575), sunriseK);
    sun.intensity = 0.85 * (1 - nightK * 0.7);
    hemi.color.lerpColors(new T.Color(0xe2f2ff), new T.Color(0xd8b4a0), sunriseK);
    hemi.groundColor.lerpColors(new T.Color(0x8fae6a), new T.Color(0x403328), sunriseK);
    hemi.intensity = 0.7 * (1 - 0.5 * nightK);
    sunDisc.material.opacity = Math.max(0, 1 - nightK * 2);
  } else if (nightK > 0.05) {
    // Ночное освещение: мягкий серебристо-лунный свет и глубокая ночная атмосфера
    sun.color.lerpColors(new T.Color(0xfff1d8), new T.Color(0x92b6ff), nightK);
    sun.intensity = 0.85 * (1 - 0.68 * nightK); // ~0.27 — лунный свет (настоящих фонарей-источников нет — ночь не должна быть слишком тёмной)
    hemi.color.lerpColors(new T.Color(0xe2f2ff), new T.Color(0x35508a), nightK);
    hemi.groundColor.lerpColors(new T.Color(0x8fae6a), new T.Color(0x22384e), nightK);
    hemi.intensity = 0.7 * (1 - 0.5 * nightK); // ~0.35 — мягкое ночное рассеяние
    sunDisc.material.opacity = Math.max(0, 1 - nightK * 2.5);
  } else {
    // Яркий день
    sun.color.set(0xfff1d8);
    sun.intensity = 0.85;
    hemi.color.set(0xe2f2ff);
    hemi.groundColor.set(0x8fae6a);
    hemi.intensity = 0.7;
    sunDisc.material.opacity = 1;
  }

  cloudNight(nightK);

  // 3. Звёздное небо и луна
  const tSec = performance.now() / 1000;
  if (st.stars) {
    st.stars.position.copy(camera.position);
    st.stars.rotation.y += dt * 0.005; // медленное вращение созвездий
    st.stars.material.opacity = Math.max(0, (nightK - 0.22) / 0.78) * (0.84 + Math.sin(tSec * 2.0) * 0.16);
  }
  if (st.moon) {
    // Луна находится напротив солнца
    st.moon.position.copy(camera.position).addScaledVector(SUN_DIR, -280);
    st.moon.material.opacity = Math.max(0, (nightK - 0.18) / 0.82);
  }

  // 4. Фонари, сияющие ореолы и мягкие световые пятна под ними
  if (st.lamps.length) {
    // Очищаем отвязанные фонари (если сектор пересоздавался)
    st.lamps = st.lamps.filter(l => inScene(l.bulb));
    const bulbColor = new T.Color(0x8a7f66).lerp(new T.Color(0xffbf55), nightK);
    const poolOpacity = nightK * 0.9;
    const haloOpacity = nightK * 0.85;

    for (const lamp of st.lamps) {
      if (lamp.bulb?.material) lamp.bulb.material.color.copy(bulbColor);
      if (lamp.pool?.material) { lamp.pool.material.opacity = poolOpacity; lamp.pool.visible = poolOpacity > 0.005; }   // днём не рисуем вовсе
      if (lamp.halo?.material) { lamp.halo.material.opacity = haloOpacity; lamp.halo.visible = haloOpacity > 0.005; }
    }
    // один настоящий свет — у ближайшего фонаря (до 16 м); сменился ближайший — гаснет, переезжает и разгорается
    let best = null, bd = 16;
    if (nightK > 0.05 && hero?.pos) for (const l of st.lamps) { const d = Math.hypot(l.x - hero.pos.x, l.z - hero.pos.z); if (d < bd && shown(l.bulb)) { bd = d; best = l; } }
    if (best !== st.lampAt) { st.lampK = Math.max(0, st.lampK - dt * 4); if (st.lampK <= 0) { st.lampAt = best; if (best) st.lampLight.position.set(best.x, 3.0, best.z); } }
    else st.lampK = Math.min(1, st.lampK + dt * 2);
  }
  if (st.lampLight) st.lampLight.intensity = st.lampAt ? 1.4 * nightK * st.lampK : 0;

  // 5. Окна домика (днём прозрачно-голубые, ночью тёплый янтарный уют)
  if (st.windows.length) {
    st.windows = st.windows.filter(w => inScene(w));
    const winColor = new T.Color().copy(COL_WIN_DAY).lerp(COL_WIN_NIGHT, nightK);
    for (const w of st.windows) {
      if (w?.material) w.material.color.copy(winColor);
    }
  }

  // 6. Обновление плашки времени в HUD (если она есть на странице)
  updateTimeHud(phase, p);
}

// Обновление кнопки/индикатора в интерфейсе
function updateTimeHud(phase, p) {
  const btn = document.getElementById('timeBtn');
  const ic = document.getElementById('timeIcon');
  const lbl = document.getElementById('timeLbl');
  if (!btn) return;

  let icon = '☀️', text = 'День', cls = 'day';
  if (phase === 'sunset') {
    icon = '🌇'; text = 'Закат'; cls = 'sunset';
  } else if (phase === 'night') {
    icon = '🌙'; text = 'Ночь'; cls = 'night';
  } else if (phase === 'sunrise') {
    icon = '🌅'; text = 'Рассвет'; cls = 'sunrise';
  }

  if (ic && ic.textContent !== icon) ic.textContent = icon;
  if (lbl && lbl.textContent !== text) lbl.textContent = text;
  if (!btn.classList.contains(cls)) {
    btn.className = `pill ${cls}`;
  }
}

// Делаем функции переключения времени доступными глобально для тестов
if (typeof window !== 'undefined') {
  window.skipToPhase = skipToPhase;
  window.setDayTime = setDayTime;
  window.getDayPhase = getDayPhase;
  window.getDayTime = getDayTime;
  window.toggleTimeOfDay = () => skipToPhase();
}

// Экран сна и пропуска ночи с мягким затемнением
let sleepCutsceneTimer = null;

export function runSleepScreen(onMorning) {
  let el = document.getElementById('sleepCurtain');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sleepCurtain';
    el.style.cssText = 'position:fixed;inset:0;background:radial-gradient(ellipse at center, #182245 0%, #090c16 100%);opacity:0;pointer-events:none;transition:opacity 0.75s ease-in-out;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;text-align:center;user-select:none;';
    el.innerHTML = `
      <div id="sleepMoonIcon" style="font-size:68px;margin-bottom:14px;filter:drop-shadow(0 0 18px rgba(255,230,120,0.5));transition:transform 0.6s ease;">🌙</div>
      <div id="sleepMainText" style="font-size:26px;font-weight:900;letter-spacing:0.5px;color:#ffeaa7;text-shadow:0 3px 10px rgba(0,0,0,0.7);">Спокойной ночи...</div>
      <div id="sleepSubText" style="font-size:16px;color:#c8d6e5;margin-top:8px;">Сладких снов 💤</div>
    `;
    document.body.appendChild(el);
  }
  const icon = document.getElementById('sleepMoonIcon');
  const t1 = document.getElementById('sleepMainText');
  const t2 = document.getElementById('sleepSubText');
  if (icon) icon.textContent = '🌙';
  if (t1) t1.textContent = 'Спокойной ночи...';
  if (t2) t2.textContent = 'Сладких снов 💤';

  el.style.pointerEvents = 'all';
  el.style.opacity = '1';

  clearTimeout(sleepCutsceneTimer);
  sleepCutsceneTimer = setTimeout(() => {
    // Переводим время на яркий солнечный день (80с в 480с суточном цикле)
    setDayTime(80);
    if (icon) icon.textContent = '☀️';
    if (t1) t1.textContent = 'Наступает утро! 🌅';
    if (t2) t2.textContent = 'Птицы поют, солнце взошло!';

    sleepCutsceneTimer = setTimeout(() => {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      if (onMorning) onMorning();
    }, 1100);
  }, 1200);
}

export function dismissSleepScreen() {
  clearTimeout(sleepCutsceneTimer);
  const el = document.getElementById('sleepCurtain');
  if (el) {
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
  }
}

