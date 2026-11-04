// Игра хранится на устройстве — две копии:
//   CUR  — текущая версия: из неё игра запускается сразу, даже без интернета;
//   NEXT — новая версия: скачивается в фоне целиком (по списку files.json), пока играешь в старую.
// Новая версия включается, когда нажали «Обновить», или сама при следующем запуске. Файлы разных версий не смешиваются.
const CUR = 'game-current', NEXT = 'game-next', OLD = 'egg-thief';
const ROOT = new URL('./', self.location).href;                     // страница игры — одна, как её ни открывай (?test и т. п.)
const keyOf = url => { const u = new URL(url, ROOT); return u.pathname === new URL(ROOT).pathname || u.pathname.endsWith('/index.html') ? ROOT : u.origin + u.pathname; };

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  // прошлая версия скрипта хранила всё в одном кэше — делаем его текущей копией
  if (await caches.has(OLD)) { await copy(OLD, CUR); await caches.delete(OLD); }
  await self.clients.claim();
})()));

async function copy(from, to) {
  const a = await caches.open(from), b = await caches.open(to);
  for (const req of await a.keys()) { if (req.url.endsWith('__part')) continue; const res = await a.match(req); if (res) await b.put(keyOf(req.url), res); }
}
// новая версия скачана целиком (files.json кладётся последним) — делаем её текущей
async function swap() {
  if (!(await (await caches.open(NEXT)).match(keyOf('files.json')))) return false;
  await caches.delete(CUR); await copy(NEXT, CUR); await caches.delete(NEXT);
  return true;
}

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.searchParams.has('fresh')) return;
  // при каждом запуске сами проверяем, нет ли новой версии (страница старой версии об этом попросить не умеет);
  // через 3 секунды — чтобы не отнимать медленный интернет у самой игры
  if (req.mode === 'navigate') e.waitUntil(new Promise(r => setTimeout(r, 3000)).then(check));
  e.respondWith((async () => {
    if (req.mode === 'navigate') await swap();                       // запуск игры — самое время включить скачанную новую версию
    const cur = await caches.open(CUR), key = keyOf(req.url);
    const hit = await cur.match(key);
    if (hit) return hit;
    const res = await fetch(req);                                    // этого файла в копии ещё нет — берём из сети и запоминаем
    if (res.ok) cur.put(key, res.clone());
    return res;
  })());
});

// ---------- проверка и загрузка новой версии ----------
const curVersion = async () => { const m = await (await caches.open(CUR)).match(keyOf('files.json')); return m ? (await m.json()).version : ''; };
let job = null;                                                       // идёт загрузка: { version, done, total }
const tell = async msg => { for (const c of await self.clients.matchAll({ includeUncontrolled: true })) c.postMessage(msg); };

// сравниваем с версией своей копии; если она неизвестна (копия собрана по файлу) — тихо скачиваем полный комплект
async function check() {
  let man;
  try { man = await (await get('files.json')).json(); }
  catch (e) { return tell({ type: 'offline' }); }                    // нет связи — играем в сохранённой версии
  if (man.version === await curVersion()) { await caches.delete(NEXT); return tell({ type: 'latest', version: man.version }); }
  // (NEXT не стираем: там может лежать недокачанная прошлая попытка — check() продолжит её)
  const next = await caches.open(NEXT), ready = await next.match(keyOf('files.json'));
  if (ready && (await ready.json()).version === man.version) return tell({ type: 'ready', version: man.version });
  if (job) return tell({ type: 'progress', ...job });
  job = { version: man.version, done: 0, total: man.files.length };
  try {
    const c = await caches.open(NEXT), cur = await caches.open(CUR), H = man.hash || {};
    await c.delete(keyOf('files.json'));                                // пока не докачано — включать нечего (swap смотрит на files.json)
    // прошлая попытка не докачала — продолжаем с того же места (уже скачанное с тем же отпечатком не трогаем)
    const PART = ROOT + '__part';
    let part = {}; try { part = (await (await c.match(PART))?.json()) || {}; } catch (e) {}
    if (!man.hash) { await caches.delete(NEXT); part = {}; }
    const old = await manifest(cur);
    for (const f of man.files) {
      const k = keyOf(f), h = H[f];
      if (!(h && part[f] === h && await c.match(k))) {
        const same = h && old?.hash?.[f] === h && await cur.match(k);          // файл не менялся — берём из своей копии, не качаем
        await c.put(k, same || await get(f));
        if (h) { part[f] = h; await c.put(PART, new Response(JSON.stringify(part))); }
      }
      job.done++; tell({ type: 'progress', ...job });
    }
    await c.delete(PART);
    await c.put(keyOf('files.json'), new Response(JSON.stringify(man), { headers: { 'Content-Type': 'application/json' } }));
    tell({ type: 'ready', version: man.version });
  } catch (e) { tell({ type: 'failed', ...job }); }                  // связь пропала — в следующий раз продолжим с того же места
  job = null;
}
const manifest = async cache => { try { return await (await cache.match(keyOf('files.json')))?.json(); } catch (e) { return null; } };
// скачать файл: зависло дольше 25 секунд — обрываем и пробуем ещё (до 3 раз)
async function get(f) {
  for (let i = 0; ; i++) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 25000);
    try {
      const res = await fetch(new URL(f + (f.includes('?') ? '&' : '?') + 'fresh=' + Date.now(), ROOT), { cache: 'no-store', signal: ctl.signal });
      if (!res.ok) throw new Error(f);
      const body = await res.blob();                                  // дочитали целиком, пока таймер не сработал
      clearTimeout(t);
      return new Response(body, { headers: { 'Content-Type': res.headers.get('Content-Type') || '' } });
    } catch (e) {
      clearTimeout(t);
      if (i >= 2) throw e;
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
}

self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'check') e.waitUntil(check());
  if (d.type === 'apply') e.waitUntil(swap().then(ok => tell({ type: 'applied', ok })));
});
