const CACHE_NAME = 'esp-cache-v7.9'; // Обязательно поднимите версию!
const URLS_TO_CACHE = [
  './', './index.html', './esp-full.html', './esp-lite.html',
  './manifest.json', './icon-192.png',
  './jspdf.umd.min.js', 
  './jspdf.plugin.autotable.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        URLS_TO_CACHE.map(url => fetch(url).then(r => { if(r.ok) return cache.put(url, r); }).catch(()=>{}))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.map(n => n !== CACHE_NAME ? caches.delete(n) : null)
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // CDN не кэшируем

  event.respondWith(
    fetch(event.request).then(res => {
      if (res && res.ok) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
      }
      return res;
    }).catch(() => caches.match(event.request))
  );
});
