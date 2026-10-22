// Задания бобра Бори: по одному, по порядку. Прогресс считается с момента, когда задание выдано.
// short — коротко для строки сверху; text — что говорит бобр; goal — сколько нужно; stat(save) — счётчик
const stars = (s, loc) => Object.keys(s.stars || {}).filter(k => k.startsWith(loc + '-')).length;
const st = (s, k) => (s.stats || {})[k] || 0;

export const QUESTS = [
  { short: '🪵 брёвна', text: 'Привет! Я строю плотину. Принеси мне 6 брёвен 🪵', goal: 6, stat: s => s.res.wood || 0, absolute: true, take: s => { s.res.wood -= 6; },
    reward: { coins: 150 }, rewardText: '150 монет' },
  { short: '⭐ звёзды', text: 'По лесу спрятаны звёзды. Найди ещё 3 ⭐', goal: 3, stat: s => stars(s, 'forest'), reward: { items: { potion: 1 } }, rewardText: 'зелье скорости 🧪' },
  { short: '🥚 яйца', text: 'Сторожа совсем расслабились! Утащи 3 яйца в лесу 🥚', goal: 3, stat: s => st(s, 'eggsForest'), reward: { coins: 300 }, rewardText: '300 монет' },
  { short: '⛏️ кирка', text: 'Сделай на верстаке кирку ⛏️ — пригодится клады копать', goal: 1, stat: s => s.tools.pick ? 1 : 0, absolute: true, reward: { coins: 200, crystal: 2 }, rewardText: '200 монет и 2 💎' },
  { short: '🌿 лабиринт', text: 'В углу леса — лабиринт из кустов. Доберись до его середины и возьми звезду!', goal: 1, stat: s => s.stars?.['forest-maze'] ? 1 : 0, absolute: true, reward: { coins: 400 }, rewardText: '400 монет' },
  { short: '🚡 канатка', text: 'Прокатись по канатной дороге 🚡 — с вышки или с горы', goal: 1, stat: s => st(s, 'zips'), reward: { items: { compass: 2 } }, rewardText: '2 компаса 🧭' },
  { short: '❌ клады', text: 'Видел красные крестики ❌? Там клады! Выкопай 3 киркой', goal: 3, stat: s => st(s, 'digs'), reward: { coins: 500, crystal: 3 }, rewardText: '500 монет и 3 💎' },
  { short: '⭕ гонка', text: 'А теперь гонка! Пробеги все кольца ⭕, пока не кончилось время', goal: 1, stat: s => st(s, 'races'), reward: { coins: 600, bananas: 3 }, rewardText: '600 монет и 3 банана 🍌' },
  { short: '🐣 питомцы', text: 'Хочу увидеть малышей! Выведи ещё 5 питомцев 🐣', goal: 5, stat: s => st(s, 'hatched'), reward: { coins: 1000 }, rewardText: '1000 монет' },
  { short: '🏗️ стройка', text: 'Построй что-нибудь на базе 🏗️ — копилку, кормушку или фонтан', goal: 1, stat: s => Object.values(s.build || {}).reduce((a, b) => a + b, 0), reward: { coins: 1500 }, rewardText: '1500 монет' },
  { short: '⭐ все звёзды', text: 'Последнее задание: собери 12 звёзд в лесу ⭐ — тогда ты настоящий следопыт!', goal: 12, stat: s => stars(s, 'forest'), absolute: true, reward: { coins: 3000, egg: true }, rewardText: '3000 монет и радужное яйцо 🌈' },
];

// текущее задание и прогресс: { q, have, ready } или null, если все сделаны
export function questNow(save) {
  const Q = save.quest ||= { i: 0, base: null };
  const q = QUESTS[Q.i]; if (!q) return null;
  if (Q.base === null) Q.base = q.absolute ? 0 : q.stat(save);
  const have = Math.min(q.stat(save) - Q.base, q.goal);
  return { q, have, ready: have >= q.goal };
}
// сдать задание: награду выдаёт game.js; здесь — только следующее
export function questNext(save) { save.quest.i++; save.quest.base = null; }
