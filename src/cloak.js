// Волшебный плащ-невидимка 👻
// 1. Невидимость и полупрозрачность для героя и напарника в Duo.
// 2. «БУ!» 👻 — подкрадись к сторожу или жителю со спины, напугай и выбей золотые монетки!
// 3. Призрачное парение и левитация 🪶 — герой парит над землёй, высоко прыгает и мягко планирует.
// 4. Прохождение сквозь заборы 🚪 — привидение проходит сквозь любые деревянные заборы.
// 5. «Призрачное зрение» и Огоньки 🔮 — скрытые фиолетовые огоньки, видимые ТОЛЬКО в плаще!
import { T, scene, group } from './engine.js';
import { SFX } from './sfx.js';
import { puff, confetti } from './fx.js';
import { toast, setCoins } from './ui.js';
import { duoSend } from './duo.js';
import { guards } from './guards.js';
import { getSchool } from './school.js';
import { friendsHere } from './friends.js';
import { villageNpcs } from './village.js';
import { vasyaPos } from './vasya.js';
import { onLevelReset, groundY } from './world.js';

export const CLOAK_DUR = 40;      // длительность невидимости (секунды)
export const CLOAK_COOL = 10;     // время перезарядки после окончания (секунды)

// ---------- полупрозрачность модели ----------
export function setMeshInvis(root, on) {
  if (!root) return;
  root.traverse(m => {
    if (!m.isMesh || m.userData.egg || m.name === 'egg') return;
    if (on) {
      if (!m.userData.origMat) m.userData.origMat = m.material;
      if (!m.userData.invisMat) {
        const mat = m.userData.origMat.clone();
        mat.transparent = true;
        mat.opacity = 0.22;
        mat.depthWrite = false;
        m.userData.invisMat = mat;
      }
      m.material = m.userData.invisMat;
    } else {
      if (m.userData.origMat) {
        m.material = m.userData.origMat;
      }
    }
  });
}

// включить / выключить невидимость
export function toggleCloak(hero) {
  if (!hero) return;
  if (hero.invisT > 0) {
    endCloak(hero, true);
    return;
  }
  if (hero.invisCool > 0) {
    SFX.nope();
    toast(`⏳ Плащ заряжается…<small>осталось ${Math.ceil(hero.invisCool)} с</small>`);
    return;
  }
  // включение!
  hero.invisT = CLOAK_DUR;
  hero.invisCool = CLOAK_DUR + CLOAK_COOL;
  hero.sparkT = 0;
  setMeshInvis(hero.model.root, true);
  SFX.whoosh();
  SFX.purr();
  puff('✨', hero.pos.clone().setY(hero.pos.y + 1.8), { size: 2.2, rise: 1.0, life: 1.5 });
  confetti(hero.pos.clone().setY(hero.pos.y + 1.8), 60);
  toast('👻 Ты невидим!<small>пари над землёй, пугай сторожей «БУ!» и ищи призрачные огоньки 🔮</small>');
  document.getElementById('ghostVision')?.classList.add('on');
  duoSend({ t: 'invis', on: true });
}

function endCloak(hero, manual = false) {
  hero.invisT = 0;
  hero.spookCool = 0;
  hero.invisCool = Math.min(hero.invisCool, CLOAK_COOL);
  setMeshInvis(hero.model.root, false);
  if (hero.model?.body) hero.model.body.position.y = 0;
  document.getElementById('ghostVision')?.classList.remove('on');
  SFX.pop();
  puff('💨', hero.pos.clone().setY(hero.pos.y + 1.8), { size: 1.8, rise: 0.8 });
  puff('✨', hero.pos.clone().setY(hero.pos.y + 2.2), { size: 1.4, rise: 0.6 });
  toast(manual ? '✨ Плащ снят' : '✨ Плащ отключился!<small>ты снова на земле</small>');
  duoSend({ t: 'invis', on: false });
}

// ---------- Кнопка «БУ!» 👻 ----------
let catSpookedUntil = 0;

export function findSpookTarget(hero, levelId) {
  if (!hero || hero.invisT <= 0) return null;
  const p = hero.pos, R = 4.0;
  const now = Date.now();

  // 1. Сторожа
  for (const gd of guards) {
    if (gd.state === 'gone' || gd.state === 'vanish' || gd.state === 'slip') continue;
    if (gd.spookedUntil && now < gd.spookedUntil) continue;
    if (Math.hypot(p.x - gd.g.position.x, p.z - gd.g.position.z) < R) {
      return { type: 'guard', raw: gd, pos: gd.g.position, name: 'сторожа' };
    }
  }

  // 2. Друзья на локации (Тётя Галя, Дядя Гена, Соня, Коля, Оля, Курочка Ряба, лесные зверушки)
  for (const n of friendsHere()) {
    if (n.spookedUntil && now < n.spookedUntil) continue;
    if (n.g && Math.hypot(p.x - n.g.position.x, p.z - n.g.position.z) < R && Math.abs(p.y - n.g.position.y) < 3.0) {
      return { type: 'friend', raw: n, pos: n.g.position, name: n.f?.name || 'друга' };
    }
  }

  // 3. Жители деревни / дачи
  for (const n of villageNpcs()) {
    if (n.spookedUntil && now < n.spookedUntil) continue;
    if (n.pos && Math.hypot(p.x - n.pos.x, p.z - n.pos.z) < R && Math.abs(p.y - n.pos.y) < 3.0) {
      return { type: 'villager', raw: n, pos: n.pos, name: n.name };
    }
  }

  // 4. Кот Василий
  if (!catSpookedUntil || now >= catSpookedUntil) {
    const vp = vasyaPos();
    if (vp && Math.hypot(p.x - vp.x, p.z - vp.z) < R) {
      return { type: 'vasya', raw: null, pos: new T.Vector3(vp.x, 0, vp.z), name: 'кота Василия' };
    }
  }

  // 5. Школа (учителя, повариха, дети)
  if (levelId === 'school') {
    const sc = getSchool();
    if (sc) {
      for (const tn of Object.values(sc.teachers)) {
        if (tn.spookedUntil && now < tn.spookedUntil) continue;
        if (Math.hypot(p.x - tn.pos.x, p.z - tn.pos.z) < R) return { type: 'npc', raw: tn, pos: tn.pos, name: tn.name };
      }
      if (sc.cook && (!sc.cook.spookedUntil || now >= sc.cook.spookedUntil)) {
        if (Math.hypot(p.x - sc.cook.pos.x, p.z - sc.cook.pos.z) < R) {
          return { type: 'npc', raw: sc.cook, pos: sc.cook.pos, name: 'Тётю Валю' };
        }
      }
      for (const kn of sc.kids) {
        if (kn.spookedUntil && now < kn.spookedUntil) continue;
        if (Math.hypot(p.x - kn.pos.x, p.z - kn.pos.z) < R) return { type: 'npc', raw: kn, pos: kn.pos, name: kn.name };
      }
    }
  }
  return null;
}

export function doSpook(hero, save, levelId) {
  if (!hero || hero.invisT <= 0) return;
  if ((hero.spookCool || 0) > 0) {
    SFX.nope();
    return;
  }

  const target = findSpookTarget(hero, levelId);
  if (!target) {
    SFX.nope();
    return;
  }

  hero.spookCool = 1.0;
  const now = Date.now();
  if (target.type === 'vasya') {
    catSpookedUntil = now + 8000;
  } else if (target.raw) {
    target.raw.spookedUntil = now + 8000;
  }

  const pos = target.pos;
  SFX.boom();
  SFX.coins();
  puff('😱', pos.clone().setY(pos.y + 2.6), { size: 2.2, rise: 1.2, life: 2.2 });
  puff('💫', pos.clone().setY(pos.y + 3.4), { size: 1.6, rise: 0.8, life: 2.5 });
  puff('🪙 +5', pos.clone().setY(pos.y + 4.0), { size: 1.8, rise: 1.0, life: 2.0 });
  confetti(pos.clone().setY(pos.y + 1.5), 80);

  save.coins = (save.coins || 0) + 5;
  setCoins(save.coins);

  if (target.type === 'guard') {
    target.raw.state = 'slip';
    target.raw.t = 4.0;
    if (target.raw.m?.body) target.raw.m.body.rotation.z = 0.35;
  } else if (target.type === 'vasya') {
    puff('🙀 МЯУ-У-У!', pos.clone().setY(2.2), { size: 1.8, rise: 1.0, life: 2.0 });
  } else if (target.type === 'npc' && target.raw?.g) {
    target.raw.g.rotation.y += Math.PI;
    target.raw.wait = 3.5;
  } else if (target.type === 'friend' && target.raw?.g) {
    target.raw.g.rotation.y += Math.PI;
    target.raw.wait = 3.5;
  } else if (target.type === 'villager' && target.raw?.g) {
    target.raw.g.rotation.y += Math.PI;
    if (target.raw.tasks) target.raw.tasks.unshift({ wait: 3.5, face: (target.raw.face || 0) + Math.PI });
  }
  toast(`👻 БУ-У-У!<small>Ты напугал ${target.name}! +5 монет 🪙</small>`);
}

// ---------- Призрачные огоньки 🔮 (Ghost Wisps) ----------
const WISPS_BY_LOC = {
  base: [
    // Порталы и спавн
    [-30, -5], [-20, -5], [-10, -5], [0, -5], [10, -5], [20, -5], [30, -5],
    // Центральная площадь, верстак, дорожки
    [0, 15], [0, 28], [0, 42], [8, 52], [-8, 52], [5, 30], [-5, 30], [12, 1], [-12, 1],
    // Загон питомцев
    [-26, 36.5], [-19, 28], [-15, 35], [-22, 22], [-28, 26],
    // Детская площадка
    [38, 15], [41.5, 31], [42, 10], [33.5, 39], [36, 25], [44, 20],
    // Футбольное поле
    [-35, 9], [-43.5, 20], [-38, 25], [-45, 12],
    // Бассейн и аквапарк
    [15, 88], [8, 56], [-24, 86], [-20, 70], [10, 85], [20, 95], [-26, 92], [0, 80],
    // Дорога на дачу
    [-30, 120], [-35, 145], [-28, 170], [-32, 135],
    // Дача и домики
    [-36, 198], [-42, 195], [-30, 205], [-25, 190], [-45, 208], [-38, 185],
  ],
  school: [
    // Школьный двор
    [0, 22], [0, 14], [-8, 16], [8, 16], [10, 8], [-10, 8], [5, 20], [-5, 20],
    // Коридор
    [-27, -1], [-20, -1], [-12, -1], [-4, -1], [4, -1], [12, -1], [20, -1], [27, -1],
    // Кабинет математики
    [-23.25, -27], [-26, -24], [-21, -24],
    // Кабинет русского
    [-7.75, -27], [-10, -24], [-5, -24],
    // Кабинет чтения
    [7.75, -27], [5, -24], [10, -24],
    // Кабинет изо
    [23.25, -27], [21, -24], [26, -24],
    // Столовая
    [-29.6, -1], [-28, 4], [-24, 4],
    // Учительская и библиотека
    [24.5, -4], [26, 3], [-4.5, 3], [4.5, 3],
    // Холл и вход
    [0, 5], [4, 2.4], [-4, 2.4],
  ],
  forest: [
    // Спавн и портал
    [0, 50], [0, 65], [-8, 55], [8, 55],
    // Большое дерево
    [22, 28], [24, 30], [20, 26], [22, 18], [12, 36],
    // Гора и пещера
    [5, -42], [2, -38], [8, -44], [-9, -54], [-12, -50], [-28, -52],
    // Мельница на холме
    [45, -8], [42, -5], [48, -12],
    // Руины крепости
    [-48, 12], [-52, 15], [-44, 8],
    // Плато
    [45, -40], [42, -38], [48, -42],
    // Мосты и река
    [-24, 0], [-20, 30], [-16, -20], [-10, 10],
    // Озеро и остров
    [82, 10], [80, 8], [84, 12], [82, 14],
    // Грибная поляна
    [-78, -64], [-75, -60], [-80, -68], [-66, -50],
    // Лабиринт
    [-80, 70], [-70, 75], [-85, 60], [-75, 80],
    // Деревня на деревьях
    [72, -74], [68, -70], [75, -78],
    // Каменный круг
    [-84, 0], [-80, 4], [-88, -4],
    // Корабль
    [64, -16], [66, -12], [62, -20], [66, 32],
    // Тайная поляна и лагерь
    [-52, 48], [-46, 44], [-33, 60], [21, 66], [10, 50], [0, 80],
  ],
  autumn: [
    // Тыквы и домик
    [-44, 28], [-40, 25], [-46, 32], [-38, 30],
    // Яблоневый сад
    [-36, -6], [-32, -4], [-40, -8], [-35, -12],
    // Ярмарка и клён
    [-18.5, 8], [-15, 12], [-22, 6], [-12, 15],
    // Горка и боулинг
    [-17.5, -26], [-20, -30], [-15, -22], [-22, -25],
    // Пруд и остров
    [0, 30], [4, 34], [-4, 28], [2, 26],
    // Кристаллы
    [30, -20], [35, -25], [25, -18], [32, -15],
    // Тропинки и поляны
    [0, 0], [15, 10], [-15, -10], [10, -30], [20, 25], [-25, 15],
  ],
  winter: [
    // Спавн и ларёк какао
    [0, 52], [5, 45], [-5, 45], [20, 40], [16, 42],
    // Горка для санок
    [0, -10], [0, -20], [0, -25], [0, -40], [0, -48],
    // Каток
    [34, 8], [38, 12], [30, 4], [36, 5], [32, 11], [25, 10],
    // Двор снеговиков
    [-30, 12], [-37, 6], [-23, 6], [-30, 26], [-25, 10],
    // Стрельбище и иглу
    [-34, -18], [-30, -36], [-48, 42], [-42, 38], [-15, -45],
    // Замёрзшее озеро и крепость
    [50, -22], [46, -18], [54, -25], [-20, 32], [-15, 28],
    // Долины и ёлки
    [14, 22], [46, 46], [-38, 28], [0, 40],
  ],
  desert: [
    [0, -10], [-5, -20], [5, -25], [-4, -35], [4, -45],
    [-5, -55], [5, -65], [-4, -75], [4, -82], [0, -88], [-3, -15], [3, -50],
  ],
  ice: [
    [0, -10], [4, -18], [-4, -25], [5, -35], [-5, -45],
    [4, -55], [-4, -65], [5, -75], [-3, -82], [0, -88], [-4, -15], [3, -40],
  ],
  bunker: [
    [0, 5], [0, -5], [-6, 0], [6, 0], [-10, -5], [10, -5], [-8, 8], [8, 8], [0, 12], [0, -12],
  ],
  secret: [
    [0, 0], [-4, 3], [4, 3], [-4, -3], [4, -3], [0, 6], [0, -6], [5, 0],
  ],
  track: [
    [0, 0], [0, -20], [0, -40], [0, -60], [0, -80], [0, -100],
    [0, -120], [0, -140], [0, -160], [0, -175], [-4, -50], [4, -110],
  ],
  home: [
    [0, 2], [2, 4], [-2, 4], [3, -2], [-3, -2], [0, -3],
  ],
  loft: [
    [-6, 0], [-4, 2], [-4, -2], [-8, 2], [-8, -2], [-6, 3],
  ],
};

let activeWisps = [];
onLevelReset(() => { activeWisps = []; catSpookedUntil = 0; });

export function initWisps(locId, save) {
  activeWisps = [];
  const coords = WISPS_BY_LOC[locId];
  if (!coords) return;
  save.wisps = save.wisps || {};
  const now = Date.now();

  for (let i = 0; i < coords.length; i++) {
    const [x, z] = coords[i];
    const key = `${locId}_${i}`;
    const gy = groundY(x, z);
    const y = (gy !== undefined && !isNaN(gy) ? gy : 0) + 1.4;

    const g = group(scene, x, y, z);
    g.userData.dynamic = true;
    g.visible = false; // виден только призраку

    // светящийся кристалл октаэдр
    const geo = new T.OctahedronGeometry(0.48, 0);
    const mat = new T.MeshBasicMaterial({ color: 0xd680ff });
    const crystal = new T.Mesh(geo, mat);
    g.add(crystal);

    // светящийся нимб
    const ringGeo = new T.TorusGeometry(0.7, 0.05, 6, 16);
    const ringMat = new T.MeshBasicMaterial({ color: 0x80d8ff });
    const ring = new T.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);

    const collectedAt = save.wisps[key];
    const isCollected = (collectedAt && typeof collectedAt === 'number' && (now - collectedAt < 90000));

    activeWisps.push({
      key, g, crystal, ring, x, z, y,
      phase: Math.random() * 6,
      collectedUntil: isCollected ? (collectedAt + 90000) : 0,
    });
  }
}

// раз в кадр (в game.js)
export function updateCloak(dt, hero, save) {
  if (!hero) return;
  if (hero.invisCool > 0) hero.invisCool = Math.max(0, hero.invisCool - dt);
  if (hero.spookCool > 0) hero.spookCool = Math.max(0, hero.spookCool - dt);

  const t = performance.now() / 1000;
  const invis = hero.invisT > 0;

  if (invis) {
    hero.invisT -= dt;
    // призрачная левитация: тело плавно покачивается в воздухе
    if (hero.model?.body) {
      hero.model.body.position.y = 0.36 + Math.sin(t * 5) * 0.12;
    }
    // волшебные искорки вокруг героя во время невидимости
    if ((hero.sparkT = (hero.sparkT || 0) - dt) <= 0) {
      hero.sparkT = 0.35 + Math.random() * 0.15;
      const sp = hero.pos.clone().add(new T.Vector3(
        (Math.random() - 0.5) * 1.2,
        0.5 + Math.random() * 1.8,
        (Math.random() - 0.5) * 1.2
      ));
      puff(Math.random() < 0.6 ? '✨' : '⭐', sp, { size: 0.65, rise: 0.6, life: 1.1 });
    }
    // если невидимость закончилась
    if (hero.invisT <= 0) {
      endCloak(hero, false);
    }
  }

  // обновление и сбор призрачных огоньков
  const now = Date.now();
  for (let i = 0; i < activeWisps.length; i++) {
    const w = activeWisps[i];
    const onCooldown = w.collectedUntil && now < w.collectedUntil;
    w.g.visible = invis && !onCooldown;
    if (!invis || onCooldown) continue;

    w.crystal.rotation.y += dt * 2.5;
    w.ring.rotation.z += dt * 3.5;
    w.g.position.y = w.y + Math.sin(t * 3 + w.phase) * 0.25;

    // сбор огонька
    const dist = Math.hypot(hero.pos.x - w.x, hero.pos.z - w.z);
    if (dist < 2.3 && Math.abs(hero.pos.y - w.y) < 2.8) {
      w.collectedUntil = now + 90000; // перезарядка 1.5 мин
      w.g.visible = false;
      save.wisps = save.wisps || {};
      save.wisps[w.key] = now;

      save.wispsTotal = (save.wispsTotal || 0) + 1;

      SFX.star();
      SFX.coins();
      puff('🔮', w.g.position.clone(), { size: 2.2, rise: 1.2, life: 1.6 });
      puff('✨', w.g.position.clone().setY(w.g.position.y + 0.5), { size: 1.6, rise: 0.8, life: 1.4 });
      confetti(w.g.position.clone(), 60);

      save.coins = (save.coins || 0) + 10;
      setCoins(save.coins);

      toast(`🔮 Призрачный огонёк пойман!<small>+10 монет 🪙 · Всего поймано: ${save.wispsTotal}</small>`);
    }
  }
}

export const isCloakActive = hero => !!(hero && hero.invisT > 0);
