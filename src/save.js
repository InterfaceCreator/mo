// Сохранение прогресса на устройстве — у каждого игрока своё.
import { B } from './balance.js';
export const PROFILES = {
  motya: { name: 'Мотя', kid: true },
  mama: { name: 'Мама', kid: false },
};
// ?test — отдельное сохранение для проверок, настоящее не трогаем
const KEY = id => 'egg-thief-v1-' + (new URLSearchParams(location.search).has('test') ? 'test-' : '') + id;
const DEF = () => ({
  coins: 0, pets: [], inc: [], found: {},
  speed: 1, tread: 0, incSlots: 3, penCap: B.PEN_START, bananas: 0,       // прокачка
  res: {}, tools: {}, opened: {}, chestAt: 0, stars: {},       // крафт и находки
  sessionStart: 0, lastSeen: 0, locked: false, yawned: false,  // таймер отдыха
});

export let save = DEF(), profile = null;
const reset = new URLSearchParams(location.search).has('reset');   // ?reset — начать заново (для проверки)

export function loadProfile(id) {
  profile = id;
  try { save = { ...DEF(), ...(reset ? {} : JSON.parse(localStorage.getItem(KEY(id)) || '{}')) }; } catch (e) { save = DEF(); }
  persist();
  return save;
}
let timer = 0;
const write = () => { clearTimeout(timer); timer = 0; if (!profile) return; save.lastSeen = Date.now(); try { localStorage.setItem(KEY(profile), JSON.stringify(save)); } catch (e) {} };
// записываем не чаще раза в полсекунды
export function persist() {
  if (timer || !profile) return;
  timer = setTimeout(write, 500);
}
// игру закрыли или свернули — записываем сразу, не дожидаясь полсекунды
addEventListener('pagehide', () => { if (timer) write(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && timer) write(); });
// что сейчас лежит в хранилище (могла записать другая вкладка с этой же игрой)
export function stored() { try { return JSON.parse(localStorage.getItem(KEY(profile)) || 'null'); } catch (e) { return null; } }
