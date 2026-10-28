// Меняем версию кэша, чтобы браузер сбросил старые файлы и скачал новые
const CACHE_NAME = 'esp-cache-v6.3'; // ← обязательно поднять при следующем изменении
const URLS_TO_CACHE = [
  './',
  './index.html',
  './esp-full.html',
  './esp-lite.html',
  './manifest.json',
  './icon-192.png'
  // icon-512.png — добавьте, ТОЛЬКО если файл реально есть в репозитории
];

// Установка: кэшируем файлы (безопасно — по одному)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Не используем addAll — он атомарный и падает целиком при одном 404
      const results = await Promise.allSettled(
        URLS_TO_CACHE.map((url) =>
          fetch(url).then((resp) => {
            if (resp.ok) return cache.put(url, resp);
            console.warn('[SW] Не удалось закэшировать:', url, resp.status);
          }).catch((e) => console.warn('[SW] Ошибка fetch:', url, e.message))
        )
      );
      console.info('[SW] Кэширование завершено. Успешно:', results.filter(r => r.status === 'fulfilled').length, 'из', URLS_TO_CACHE.length);
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
            console.info('[SW] Удаляю старый кэш:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Перехват запросов: Network First с фолбэком на кэш
self.addEventListener('fetch', (event) => {
  // Пропускаем не-GET и запросы к сторонним доменам (CDN) — их не кэшируем
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    // Для CDN — обычный fetch без перехвата
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Кэшируем успешные ответы локальных файлов
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => {
        if (cached) return cached;
        // Если ни сети, ни кэша — отдаём заглушку для HTML
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return new Response(
            '<h1>Нет соединения</h1><p>Проверьте интернет и обновите страницу.</p>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
        return new Response('Offline', { status: 503 });
      }))
  );
});
