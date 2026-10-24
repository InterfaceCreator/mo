// Игра хранится на устройстве: запускается сразу из памяти (даже без интернета или на медленной сети),
// а свежие файлы тихо докачиваются в фоне — новая сборка появится со следующего запуска (видно по номеру внизу меню).
const CACHE = 'egg-thief';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// страница прислала список всех своих файлов (после первой загрузки) — сохраняем их все разом, чтобы следующий запуск был уже без сети
self.addEventListener('message', e => {
  const urls = (e.data && e.data.cache) || [];
  e.waitUntil(caches.open(CACHE).then(cache => Promise.all(urls.map(u => {
    const url = new URL(u, location), key = url.pathname === new URL('./', location).pathname ? new URL('./', location).href : url.href;
    if (url.origin !== location.origin) return null;
    return cache.match(key, { ignoreSearch: true }).then(hit => hit || fetch(url.href).then(r => r.ok && cache.put(key, r)).catch(() => {}));
  }))));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // страница игры — одна, как её ни открывай (?test и т. п.); файлы — по своему адресу
  const key = req.mode === 'navigate' ? new URL('./', location).href : req;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(key, { ignoreSearch: true });
    const fresh = fetch(req).then(res => { if (res.ok) cache.put(key, res.clone()); return res; });
    if (hit) { e.waitUntil(fresh.catch(() => {})); return hit; }       // есть в памяти — отдаём сразу, обновляем в фоне
    return fresh;                                                         // первый запуск — из сети
  }));
});
