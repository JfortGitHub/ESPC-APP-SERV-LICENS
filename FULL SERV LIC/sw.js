// Меняем версию кэша, чтобы браузер сбросил старые файлы и скачал новые
const CACHE_NAME = 'esp-cache-v4.11'; 
const URLS_TO_CACHE = [
  './',
  './index.html',
  './esp-full.html',
  './esp-lite.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Установка: кэшируем файлы
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Активация: удаляем старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Перехват запросов: сначала сеть, при неудаче — кэш (Network First)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
