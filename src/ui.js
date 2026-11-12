// Интерфейс поверх игры: монеты, таймер яиц, коллекция, карточка нового питомца.
import { SPECIES, SPECIES_IDS, RARITY, petThumb, petIncome, fmt } from './pets.js';
import { goFull } from './fs.js';
import { VERSION } from './version.js';

document.getElementById('ver').textContent = VERSION;   // номер сборки внизу стартового экрана

const $ = id => document.getElementById(id);
export const ui = { open: false };

let shown = -1;
export function setCoins(n) {
  if (n === shown) return;
  const el = $('coins'); if (shown >= 0 && n > shown) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  shown = n; $('coinsN').textContent = fmt(n);
}
export function setSun(sec) { sec = Math.ceil(sec); $('sunT').textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; }

export function openOv(id) { $(id).classList.add('on'); ui.open = true; }
export function closeOv(el) { el.classList.remove('on'); ui.open = !!document.querySelector('.ov.on'); }
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeOv(b.closest('.ov'))));
document.querySelectorAll('.ov').forEach(o => o.addEventListener('pointerdown', e => { if (e.target === o) closeOv(o); }));

// коллекция: найденные — цветные, ненайденные — силуэты
// eggs: { all: [{ key, r, v, name }], seen: { key: true }, thumb(key) }
// friends.list() → [{ name, met, hearts, max, tip, thumb }] — страница «Друзья»
export function bindBook(getFound, eggs, friends) {
  $('bookBtn').addEventListener('click', () => {
    const found = getFound(), grid = $('grid'); grid.innerHTML = '';
    // по местам: кого где искать
    for (const [home, title] of [['forest', '🌲 Лес'], ['desert', '🏜️ Пустыня'], ['ice', '❄️ Лёд'], ['autumn', '🍂 Осень'], ['track', '🏁 Дорожка']]) {
      const ids = SPECIES_IDS.filter(id => SPECIES[id].home[0] === home);
      const h = document.createElement('div'); h.className = 'sec'; h.style.gridColumn = '1 / -1';
      h.textContent = `${title} — ${ids.filter(id => found[id]).length} из ${ids.length}`; grid.appendChild(h);
      for (const id of ids) {
        const sp = SPECIES[id], R = RARITY[sp.r], has = !!found[id];
        const c = document.createElement('div'); c.className = 'cell' + (has ? '' : ' unk'); c.style.borderColor = R.color;
        c.innerHTML = `<img src="${petThumb(id)}" alt=""><div class="n">${has ? sp.name : '?'}</div>`;
        grid.appendChild(c);
      }
    }
    // друзья: кого встретил — портрет и сердечки; кого нет — силуэт
    if (friends) {
      const list = friends.list(), fh = document.createElement('div'); fh.className = 'sec'; fh.style.gridColumn = '1 / -1';
      fh.textContent = `👫 Друзья — ${list.filter(f => f.hearts >= f.max).length} лучших из ${list.length}`; grid.appendChild(fh);
      for (const f of list) {
        const c = document.createElement('div'); c.className = 'cell friend' + (f.met ? '' : ' unk'); c.style.borderColor = f.hearts >= f.max ? '#ffc21a' : '#ff8ab3';
        c.innerHTML = `<img src="${f.thumb}" alt=""><div class="n">${f.met ? f.name : '?'}</div><div class="h">${f.met ? '❤️'.repeat(f.hearts) + '🤍'.repeat(f.max - f.hearts) : ''}</div><div class="tip">${f.met ? f.tip + '<br>' : ''}📍 ${f.place}</div>`;
        grid.appendChild(c);
      }
    }
    // яйца: все редкости × все виды — в конце, клетки поменьше
    const seen = eggs.seen(), eh = document.createElement('div'); eh.className = 'sec'; eh.style.gridColumn = '1 / -1';
    eh.textContent = `🥚 Яйца — ${eggs.all.filter(e => seen[e.key]).length} из ${eggs.all.length}`; grid.appendChild(eh);
    for (const e of eggs.all) {
      const c = document.createElement('div'); c.className = 'cell egg' + (seen[e.key] ? '' : ' unk'); c.style.borderColor = RARITY[e.r].color;
      c.innerHTML = `<img src="${eggs.thumb(e)}" alt=""><div class="n">${seen[e.key] ? e.name : '?'}</div>`;
      grid.appendChild(c);
    }
    $('bookBtn').querySelector('.dot').style.display = 'none';
    openOv('book');
  });
}

// ---------- уведомления: колокольчик сбоку, список — по нажатию ----------
// запись: { icon, pet (id вида — тогда вместо значка картинка), title, text, t, read }
let notes = [], notesChanged = () => {};
export function bindNotes(list, onChange) { notes = list; notesChanged = onChange; bellBadge(); }
function bellBadge() {
  const n = notes.filter(x => !x.read).length, b = $('bellBtn').querySelector('b');
  b.textContent = n > 9 ? '9+' : n; b.style.display = n ? 'block' : 'none';
}
export function notify(entry) {
  notes.unshift({ t: Date.now(), read: false, ...entry });
  // старые новости уходят, кроме записок Василия (keep) — их можно перечитывать
  for (let i = notes.length - 1; notes.length > 40 && i >= 0; i--) if (!notes[i].keep) notes.splice(i, 1);
  bellBadge(); notesChanged();
  const el = $('bellBtn'); el.classList.remove('ring'); void el.offsetWidth; el.classList.add('ring');
}
const ago = t => { const m = Math.floor((Date.now() - t) / 60000); return m < 1 ? 'только что' : m < 60 ? `${m} мин назад` : m < 1440 ? `${Math.floor(m / 60)} ч назад` : `${Math.floor(m / 1440)} дн назад`; };
// скрытое: держать колокольчик 3 секунды — onBellHold (сброс записок для проверки)
let bellHold = null, bellTimer = 0, bellHeld = false;
export const onBellHold = fn => { bellHold = fn; };
$('bellBtn').addEventListener('pointerdown', () => { bellHeld = false; clearTimeout(bellTimer); if (bellHold) bellTimer = setTimeout(() => { bellHeld = true; bellHold(); }, 3000); });
for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) $('bellBtn').addEventListener(ev, () => clearTimeout(bellTimer));
$('bellBtn').addEventListener('contextmenu', e => e.preventDefault());   // долгое нажатие на телефоне — без меню
$('bellBtn').addEventListener('click', () => {
  if (bellHeld) { bellHeld = false; return; }
  const list = $('notesList'); list.innerHTML = '';
  if (!notes.length) list.innerHTML = '<div class="empty">Пока ничего нет — укради яйцо! 🥚</div>';
  for (const n of notes) {
    const row = document.createElement('div'); row.className = 'note' + (n.read ? '' : ' new') + (n.love ? ' love' : '');
    const pic = n.pet ? `<img src="${petThumb(n.pet)}" alt="">` : `<div class="nic">${n.icon || '🔔'}</div>`;
    row.innerHTML = `${pic}<div class="t">${n.title}<small>${n.text || ''}</small><small class="ago">${ago(n.t)}</small></div>`;
    list.appendChild(row);
  }
  for (const n of notes) n.read = true;
  bellBadge(); notesChanged(); openOv('notes');
});
// вылупился питомец — в уведомления и коротко сверху; fresh — такого вида ещё не было
export function petNote(data, reward = 0, fresh = false) {
  const sp = SPECIES[data.s], R = RARITY[sp.r];
  const name = (data.gold ? 'Золотой ' : '') + (data.big ? 'Большой ' : '') + sp.name;
  notify({ pet: data.s, title: fresh ? `🐣 Новый питомец: ${name}` : `🐣 Вылупился: ${name}`, text: `${R.name} · +${petIncome(data)} монет в секунду` + (reward ? ` · подарок +${fmt(reward)}` : '') });
  toast(`🐣 ${name}!<small>${fresh ? 'такого ещё не было' : 'вылупился'} — смотри 🔔</small>`);
  if (fresh) $('bookBtn').querySelector('.dot').style.display = 'block';
}

export function setSpeed(lv) { $('speedN').textContent = 'Lv ' + lv; }
// кнопки предметов над прыжком: [{ id, icon, n }] — показываются только те, что есть
let itemsKey = '';
export function setItems(list, onUse) {
  const key = list.map(i => i.id + i.n).join('|'); if (key === itemsKey) return; itemsKey = key;
  const box = $('items'); box.innerHTML = '';
  for (const it of list) {
    if (!it.n) continue;
    const b = document.createElement('button'); b.innerHTML = `${it.icon}<b>${it.n}</b>`;
    b.onclick = () => onUse(it.id); box.appendChild(b);
  }
}
// всплывающее сообщение на пару секунд
let toastT = 0;
export function toast(html) {
  const t = $('toast'); t.innerHTML = html; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3200);
}

// ---------- выбор игрока ----------
const MAMA_PIN = '132';
// thumbs: { motya: url, mama: url }; возвращает Promise с id игрока
export function chooseProfile(thumbs, sfx) {
  document.querySelectorAll('.pcard').forEach(c => { c.querySelector('img').src = thumbs[c.dataset.p]; });
  return new Promise(done => {
    let pin = '';
    const dots = () => document.querySelectorAll('#pin .dots span').forEach((d, i) => d.classList.toggle('on', i < pin.length));
    const finish = id => { closeOv($('profiles')); closeOv($('pin')); done(id); };
    // выбрал игрока — сразу во весь экран
    document.querySelector('[data-p="motya"]').onclick = () => { goFull(); sfx.tap(); finish('motya'); };
    document.querySelector('[data-p="mama"]').onclick = () => { goFull(); sfx.tap(); pin = ''; dots(); openOv('pin'); };
    document.querySelectorAll('#pin [data-k]').forEach(b => b.onclick = () => {
      const k = b.dataset.k; sfx.tap();
      if (k === 'x') { closeOv($('pin')); return; }
      if (k === 'b') { pin = pin.slice(0, -1); dots(); return; }
      if (pin.length >= MAMA_PIN.length) return;
      pin += k; dots();
      if (pin.length < MAMA_PIN.length) return;
      if (pin === MAMA_PIN) setTimeout(() => finish('mama'), 200);
      else { sfx.nope(); const box = $('pinbox'); box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); setTimeout(() => { pin = ''; dots(); }, 450); }
    });
  });
}
$('who').addEventListener('click', () => location.reload());   // сменить игрока — заново на экран выбора

// ---------- игры с Елисеем: крупная надпись по центру — отсчёт, таймер, градусник «горячо — холодно» ----------
let kidShown = '';
export function setKidHud(h) {
  const el = $('kidhud');
  if (!h) { if (kidShown) { kidShown = ''; el.style.display = 'none'; } return; }
  const sec = h.t !== undefined ? Math.max(0, Math.ceil(h.t)) : 0;
  let html;
  if (h.mode === 'gen') html = `<b>${h.title}</b><span>${h.sub}</span>` + (h.big ? `<i class="big">${h.big}</i>` : '');   // игры детей (kids.js)
  else if (h.mode === 'count') html = h.kind === 'hide'
    ? `<b>🙈 Прятки!</b><span>Елисей прячется… не подглядывай!</span><i class="big">${h.n}</i>`
    : `<b>🏃 Догонялки!</b><span>Елисей убегает — сейчас догоняй!</span><i class="big">${h.n}</i>`;
  else if (h.mode === 'tag') html = `<b>🏃 Догони Елисея!</b><span>осталось ${sec} с</span>`;
  else {
    const word = { hot: '🔥 Горячо!', warm: '🙂 Тепло', cold: '❄️ Холодно' }[h.word];
    const trend = h.trend === 'warmer' ? '<em class="w">Теплее! ⬆</em>' : h.trend === 'colder' ? '<em class="c">Холоднее ⬇</em>' : '';
    html = `<b>🙈 Найди Елисея!</b><div class="therm"><i style="left:${Math.round(h.heat * 100)}%"></i></div><span>${word} ${trend} · ${sec} с</span><small>следи, где Елисей хихикает 🤭</small>`;
  }
  if (html === kidShown) return; kidShown = html;
  el.innerHTML = html; el.style.display = 'flex'; el.classList.toggle('hot', h.word === 'hot');
}

// ---------- записка (мамин режим): на весь экран, игра стоит, пока не тапнешь ----------
let noteShown = false;
export const noteOpen = () => noteShown;
// note: { t, love?, kid? } — kid: Моте записка от мамы, иначе маме от Василия
export function showNote(note, sfx) {
  const n = $('note'); $('noteTxt').textContent = note.t; n.classList.toggle('love', !!note.love); n.classList.toggle('kid', !!note.kid);
  $('noteFrom').innerHTML = note.kid ? '<b>💌 Записка от мамы</b>' : '<b>Перед тем, как ты начнёшь…</b><br>🐱 записка от Василия';
  $('notePaw').textContent = note.kid ? '❤️' : '🐾';
  noteShown = true; n.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => n.classList.add('open'))); sfx.rustle();
  n.onclick = () => { if (!n.classList.contains('open')) return; n.classList.remove('open', 'on'); noteShown = false; sfx.tap(); };
}

// ---------- отдых ----------
// мама держит сердечко 3 секунды — можно играть дальше
export function showLock(onUnlock) {
  openOv('lock');
  const heart = $('heart'); let start = null;
  const stop = () => { start = null; heart.style.setProperty('--p', 0); };
  function tick() {
    if (start === null) return;
    const p = (performance.now() - start) / 3000; heart.style.setProperty('--p', Math.min(1, p));
    if (p < 1) { setTimeout(tick, 30); return; }
    start = null; closeOv($('lock')); onUnlock();
  }
  heart.onpointerdown = e => { e.preventDefault(); start = performance.now(); tick(); };
  heart.onpointerup = heart.onpointercancel = heart.onpointerleave = stop;
}

// ---------- магазин ----------
// items: [{ icon, name, info, cost (null — максимум), buy() }]; coins() — сколько монет сейчас
export function openShop(getItems, coins, sfx) {
  const list = $('shopList');
  const render = () => {
    list.innerHTML = '';
    for (const it of getItems()) {
      const row = document.createElement('div'); row.className = 'item';
      const max = it.cost === null, can = !max && coins() >= it.cost;
      // что делает товар, что будет после покупки и зачем он нужен
      row.innerHTML = `<div class="ic">${it.icon}</div><div class="t">${it.name}<small>${it.what}</small>` +
        (it.now ? `<span class="now">${it.now}</span>` : '') + (it.goal ? `<span class="goal">${it.goal}</span>` : '') + `</div>`;
      const b = document.createElement('button');
      b.className = max ? 'max' : can ? '' : 'no';
      b.innerHTML = max ? (it.maxText || 'МАКС') : `${fmt(it.cost)} <i class="coin"></i>` + (can ? '' : `<small>ещё ${fmt(it.cost - coins())}</small>`);
      b.onclick = () => {
        if (max) return;
        if (coins() < it.cost) { sfx.nope(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
        it.buy(); sfx.buy(); render();
      };
      row.appendChild(b); list.appendChild(row);
    }
  };
  render(); openOv('shop');
}
export const shopOpen = () => $('shop').classList.contains('on');

// ---------- ресурсы и верстак ----------
const resShown = {};
// autumn — в Осенней долине: тогда видны и жёлуди с тыквами (а ещё — если они уже есть)
export function setRes(res, autumn = false) {
  for (const k of ['acorn', 'pumpkin']) { const on = autumn || (res[k] || 0) > 0; const el = $('r-' + k).parentElement; if (el.hidden === on) el.hidden = !on; }
  for (const k of ['wood', 'stone', 'crystal', 'leaf', 'acorn', 'pumpkin']) {
    const n = res[k] || 0; if (resShown[k] === n) continue;
    const el = $('r-' + k); if (resShown[k] !== undefined && n > resShown[k]) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    resShown[k] = n; el.textContent = n;
  }
}
// верстак: getSections() → [{ title, rows: [{ icon, name, info, chips: [{ icon, have, need }], state, make }] }]
// state: 'can' — хватает, 'no' — не хватает, 'done' — уже сделано, 'locked' — рецепт ещё не найден
export function openCraft(getSections, sfx) {
  const list = $('craftList');
  const render = () => {
    list.innerHTML = '';
    for (const sec of getSections()) {
      const h = document.createElement('div'); h.className = 'sec'; h.textContent = sec.title; list.appendChild(h);
      for (const r of sec.rows) {
        const row = document.createElement('div'); row.className = 'item' + (r.state === 'done' ? ' done' : r.state === 'locked' ? ' locked' : '');
        const chips = r.state === 'locked' ? '' : r.chips.map(c => `<span class="chip${c.have >= c.need || r.state === 'done' ? '' : ' no'}">${c.icon} ${r.state === 'done' ? c.need : Math.min(c.have, c.need) + '/' + c.need}</span>`).join('');
        row.innerHTML = `<div class="ic">${r.state === 'locked' ? '📜' : r.icon}</div><div class="t">${r.state === 'locked' ? '❓ ' + r.name : r.name}<small>${r.info}</small><div class="chips">${chips}</div></div>`;
        const b = document.createElement('button');
        b.className = r.state === 'done' ? 'max' : r.state === 'can' ? '' : 'no';
        b.textContent = r.state === 'done' ? '✓' : r.state === 'locked' ? '🔒' : '🔨';
        b.onclick = () => {
          if (r.state === 'done') return;
          if (r.state !== 'can') { sfx.nope(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
          r.make(); render();
        };
        row.appendChild(b); list.appendChild(row);
      }
    }
  };
  render(); openOv('craft');
}
export const craftOpen = () => $('craft').classList.contains('on');

// затемнение при переходе между локациями
export function fade(on, then) {
  const f = $('fade'); f.classList.toggle('on', on);
  if (then) setTimeout(then, 280);
}

// звёзды текущей локации: «⭐ 3/10»; total = 0 — счётчик скрыт
let starsShown = '';
export function setStars(got, total) {
  const t = total ? `${got}/${total}` : ''; if (t === starsShown) return; starsShown = t;
  $('starsP').style.display = total ? 'flex' : 'none'; $('starsN').textContent = t;
  if (got) { const el = $('starsP'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
}

// задание бобра в углу: «🦫 🪵 брёвна 2/6»; пусто — скрыто
let questShown = null;
export function setQuest(text) {
  if (text === questShown) return; questShown = text;
  const el = $('quest'); el.style.display = text ? 'flex' : 'none'; el.textContent = text || '';
}

// что сейчас действует и сколько осталось: [['🧪', секунд], …] — сверху посередине
let effKey = '';
export function setEffects(list) {
  const on = list.filter(([, t]) => t > 0), key = on.map(([i, t]) => i + Math.ceil(t)).join(' ');
  if (key === effKey) return; effKey = key;
  const el = $('effects'); el.style.display = on.length ? 'flex' : 'none';
  el.innerHTML = on.map(([i, t]) => `<span class="eff${t < 6 ? ' low' : ''}">${i} ${Math.ceil(t)}</span>`).join('');
}

// ---------- рюкзак: всё, что есть у игрока ----------
// getSections() → [{ title, cells: [{ icon, n, name, sub, dim, use }] }]; use — кнопка «использовать»
let invGet = null, invUse = null;
export function bindInventory(getSections) { invGet = getSections; }
function renderInv() {
  const list = $('invList'); list.innerHTML = '';
  for (const sec of invGet()) {
    const h = document.createElement('div'); h.className = 'sec'; h.textContent = sec.title; list.appendChild(h);
    const grid = document.createElement('div'); grid.className = 'invGrid';
    for (const c of sec.cells) {
      const cell = document.createElement('div'); cell.className = 'inv' + (c.dim ? ' dim' : '');
      cell.innerHTML = `<div class="ic">${c.icon}${c.n !== undefined ? `<b>${c.n}</b>` : ''}</div><div class="nm">${c.name}</div>` + (c.sub ? `<small>${c.sub}</small>` : '');
      if (c.use) { const b = document.createElement('button'); b.textContent = 'Использовать'; b.onclick = () => { closeOv($('inv')); c.use(); }; cell.appendChild(b); }
      grid.appendChild(cell);
    }
    list.appendChild(grid);
  }
}
$('invBtn').addEventListener('click', () => { renderInv(); openOv('inv'); });

// ---------- окно строения ----------
// b: { icon, name, what, now, next, cost (null — максимум), afford, buy(), extra: { label, fn } }
export function openBuilding(get, sfx) {
  const box = $('bldBody');
  const render = () => {
    const b = get();
    box.innerHTML = `<div class="bicon">${b.icon}</div><div class="bname">${b.name}</div><div class="bwhat">${b.what}</div>` +
      (b.now ? `<div class="bnow">сейчас: ${b.now}</div>` : '') + (b.next ? `<div class="bnext">${b.cost === null ? '' : 'после улучшения: '}${b.next}</div>` : '');
    const row = document.createElement('div'); row.className = 'brow';
    if (b.cost !== null) {
      const btn = document.createElement('button'); btn.className = b.afford ? '' : 'no';
      btn.innerHTML = `${b.buyText} · ${fmt(b.cost)} <i class="coin"></i>` + (b.afford ? '' : `<small>ещё ${fmt(b.missing)}</small>`);
      btn.onclick = () => { if (!get().afford) { sfx.nope(); btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake'); return; } get().buy(); sfx.buy(); render(); };
      row.appendChild(btn);
    } else { const m = document.createElement('div'); m.className = 'bmax'; m.textContent = 'Самый высокий уровень ⭐'; row.appendChild(m); }
    if (b.extra) { const e = document.createElement('button'); e.className = 'alt'; e.textContent = b.extra.label; e.onclick = () => { closeOv($('bld')); b.extra.fn(); }; row.appendChild(e); }
    box.appendChild(row);
  };
  render(); openOv('bld');
}

// ---------- машина слияния: groups = [{ s, name, next, n, merge() }] ----------
export function openFusion(getGroups, sfx) {
  const list = $('fusList');
  const render = () => {
    list.innerHTML = '';
    const gs = getGroups();
    if (!gs.length) list.innerHTML = '<div class="empty">Нужно 3 одинаковых питомца (вид и размер/цвет совпадают). Пока таких нет — выведи ещё! 🥚</div>';
    for (const g of gs) {
      const row = document.createElement('div'); row.className = 'item';
      row.innerHTML = `<img src="${petThumb(g.s)}" style="width:min(14vw,56px)" alt=""><div class="t">${g.name} ×${g.n}<small>3 → 1: ${g.next}</small></div>`;
      const b = document.createElement('button'); b.textContent = '🔮 Слить';
      b.onclick = () => { g.merge(); sfx.craft(); render(); };
      row.appendChild(b); list.appendChild(row);
    }
  };
  render(); openOv('fus');
}
