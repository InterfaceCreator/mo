// Переезд на новый адрес 📦: прогресс лежит в браузере отдельно для каждого адреса (localStorage),
// поэтому новый сайт сам не видит прогресс со старого. На старом адресе (vercel / workers.dev) на экране выбора игрока —
// кнопка «Перенести на новый адрес»: оба сохранения (Мотя и мама) сжимаются и открывается новый адрес
// со ссылкой вида …/mo/#move=… Часть после # никуда не отправляется — она остаётся в браузере.
// Новый адрес при запуске (до выбора игрока) распаковывает: у игрока пусто — записывает; есть свой прогресс —
// спрашивает, какой оставить (заменённый кладётся в запасную копию). На старом адресе ничего не удаляется.
// Проверка без интернета: ?moveto=http://localhost:8081/ — куда переносить (а с ?test переносятся тестовые сохранения).
const Q = new URLSearchParams(location.search);
const NEW_URL = 'https://interfacecreator.github.io/mo/';
const TARGET = Q.get('moveto') || NEW_URL;
const TEST = Q.has('test');
const KEY = id => 'egg-thief-v1-' + (TEST ? 'test-' : '') + id;
const MOVED = 'egg-thief-moved' + (TEST ? '-test' : '');
const IDS = ['motya', 'mama'], NAME = { motya: 'Мотя', mama: 'Мама' };
const isNew = location.href.startsWith(NEW_URL);
const $ = id => document.getElementById(id);

const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
// «есть прогресс» — по содержимому: пустое сохранение создаётся сразу при выборе игрока
const hasProgress = s => !!s && ((s.pets?.length || 0) > 0 || (s.coins || 0) > 0 || (s.inc || []).some(Boolean) || (s.speed || 1) > 1);
const sum = s => s ? `🪙 ${s.coins || 0} · 🐣 ${s.pets?.length || 0} · 👟 ${s.speed || 1}` : 'пусто';

// ---------- упаковка: JSON → gzip → base64url (без сжатия — если браузер не умеет) ----------
const b64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64 = str => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; };
const through = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
async function pack(obj) {
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  if (typeof CompressionStream === 'function') return 'g' + b64(await through(raw, new CompressionStream('gzip')));
  return 'r' + b64(raw);
}
async function unpack(str) {
  const kind = str[0], bytes = unb64(str.slice(1));
  const raw = kind === 'g' ? await through(bytes, new DecompressionStream('gzip')) : bytes;
  return JSON.parse(new TextDecoder().decode(raw));
}

// ---------- старый адрес: кнопка «Перенести» ----------
function showButton() {
  const box = $('move'); if (!box || isNew) return;
  const saves = IDS.map(id => [id, read(KEY(id))]).filter(([, s]) => hasProgress(s));
  if (!saves.length) return;                                         // переносить нечего
  const when = +localStorage.getItem(MOVED) || 0;
  box.style.display = 'flex';
  box.innerHTML = when
    ? `<b>📦 Прогресс уже перенесён на новый адрес</b><a class="go" href="${TARGET}">▶ Играть на новом адресе</a><small><a href="#" id="moveAgain">перенести ещё раз</a> · здесь прогресс тоже остался</small>`
    : `<b>🏠 У игры новый адрес!</b><button id="moveGo">📦 Перенести прогресс на новый адрес</button><small>${saves.map(([id, s]) => `${NAME[id]}: ${sum(s)}`).join('<br>')}</small>`;
  const go = async e => {
    e?.preventDefault();
    box.innerHTML = '<b>📦 Упаковываем прогресс…</b>';
    try {
      const data = { v: 1, at: Date.now(), s: Object.fromEntries(saves.map(([id]) => [id, localStorage.getItem(KEY(id))])) };
      const link = TARGET + (TEST ? '?test' : '') + '#move=' + await pack(data);
      localStorage.setItem(MOVED, String(Date.now()));
      location.href = link;
    } catch (err) { box.innerHTML = `<b>Не получилось упаковать 😔</b><small>${err.message}</small>`; }
  };
  $('moveGo')?.addEventListener('click', go);
  $('moveAgain')?.addEventListener('click', go);
}

// ---------- новый адрес: приём ----------
// вопрос «какой прогресс оставить?» — когда у игрока на этом адресе уже есть свой
function ask(id, mine, theirs) {
  return new Promise(done => {
    const box = $('move'); box.style.display = 'flex';
    box.innerHTML = `<b>${NAME[id]}: здесь уже есть прогресс. Какой оставить?</b>
      <button data-k="new">📦 Перенесённый — ${sum(theirs)}</button>
      <button data-k="old" class="alt">🏠 Этот — ${sum(mine)}</button>
      <small>второй не пропадёт — сохраним запасную копию</small>`;
    box.querySelectorAll('button').forEach(b => b.onclick = () => done(b.dataset.k));
  });
}
export async function moveIn() {
  const m = location.hash.match(/^#move=(.+)$/);
  if (!m) { showButton(); return; }
  const box = $('move'); box.style.display = 'flex'; box.innerHTML = '<b>📦 Переносим прогресс…</b>';
  history.replaceState(null, '', location.pathname + location.search);   // чтобы перенос не повторился при перезапуске
  let data;
  try { data = await unpack(m[1]); } catch (e) { box.innerHTML = `<b>Ссылка с прогрессом повреждена 😔</b><small>открой старый адрес и нажми «Перенести» ещё раз</small>`; return; }
  const done = []; let moved = 0;
  for (const id of IDS) {
    const txt = data?.s?.[id]; if (!txt) continue;
    let theirs; try { theirs = JSON.parse(txt); } catch (e) { continue; }
    const mine = read(KEY(id));
    if (JSON.stringify(mine) === txt) { done.push(`${NAME[id]}: уже здесь`); continue; }
    let take = true;
    if (hasProgress(mine)) take = (await ask(id, mine, theirs)) === 'new';
    const keep = take ? mine : theirs;                                  // тот, что не выбрали, — в запасную копию
    if (keep && hasProgress(keep)) localStorage.setItem(KEY(id) + '-backup-' + Date.now(), JSON.stringify(keep));
    if (take) { localStorage.setItem(KEY(id), txt); moved++; }
    done.push(`${NAME[id]}: ${sum(take ? theirs : mine)}`);
  }
  box.innerHTML = `<b>${moved ? '✅ Прогресс перенесён!' : '✅ Готово — оставили здешний прогресс'}</b><small>${done.join('<br>') || 'переносить было нечего'}</small>`;
  setTimeout(() => { box.style.display = 'none'; }, 9000);
}
