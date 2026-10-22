// Таймер отдыха для Моти: через 20 минут герой зевает, через 25 — «обними маму».
// Мама снимает замок, подержав сердечко. После долгого перерыва всё начинается заново.
const FAST = new URLSearchParams(location.search).has('fast');   // ?fast — 1,5 минуты (для проверки)
const LIMIT = (FAST ? 1.5 : 25) * 60000, YAWN_AT = (FAST ? 0.75 : 20) * 60000;
const NEW_SESSION = 3600000, UNLOCK_AFTER = 3 * 3600000;        // час перерыва — новая сессия; 3 часа — замок снимается сам

// в начале игры: решаем, продолжается ли прошлая сессия
export function startRest(save) {
  const gap = Date.now() - (save.lastSeen || 0);
  if (gap > UNLOCK_AFTER) save.locked = false;
  if (!save.sessionStart || (gap > NEW_SESSION && !save.locked)) { save.sessionStart = Date.now(); save.yawned = false; }
}
// раз в кадр: 'yawn' — один раз зевнуть, 'lock' — пора отдыхать
export function checkRest(save) {
  if (save.locked) return 'lock';
  const t = Date.now() - save.sessionStart;
  if (t >= LIMIT) { save.locked = true; return 'lock'; }
  if (t >= YAWN_AT && !save.yawned) { save.yawned = true; return 'yawn'; }
  return null;
}
export function unlockRest(save) { save.locked = false; save.sessionStart = Date.now(); save.yawned = false; }
