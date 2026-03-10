const CACHE_NAME = 'hamusata-v11.0.0';

const urlsToCache = [
  '/',
  '/404',
  '/favicon.ico',
  '/manifest.json',
  '/css/style.css',
  '/css/mobile-menu.css',
  '/js/script.js',
  '/js/lang-switch.js',
  '/lang/lang.json',
  '/icon.webp',
  '/hamusata_399-120.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate';

  if (isNavigation) {
    // Navigation: Network First but with a fix for theme params
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          return response;
        })
        .catch(() => {
          // If offline, try to match the exact URL (with params) first, then fallback to '/'
          return caches.match(event.request).then(response => {
            return response || caches.match('/');
          });
        })
    );
  } else {
    // Assets: Cache First, but Network update if possible
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          }
          return networkResponse;
        }).catch(() => null);

        return cached || fetchPromise;
      })
    );
  }
});
