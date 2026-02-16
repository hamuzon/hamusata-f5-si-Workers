const CACHE_NAME = 'hamusata-v10.03.00';

const urlsToCache = [
  '/',
  '/404',
  '/BingSiteAuth.xml',
  '/LICENSE',
  '/README.md',
  '/favicon.ico',
  '/logo.webp',
  '/manifest.json',
  '/sub',
  '/terms',

  '/banner_icon_hamusata.png',
  '/banner_icon_hamusata.webp',
  '/hamusata.png',
  '/hamusata.webp',
  '/hamusata_399-120.webp',
  '/hamusata_798-240.webp',
  '/icon.png',
  '/icon.svg',
  '/icon.webp',
  '/icon_60.webp',
  '/icon_72.webp',
  '/icon_120.webp',
  '/icon_192.webp',
  '/icon_400.webp',
  '/icon_500_500.png',
  '/icon_500_500.webp',
  '/icon_800.webp',

  '/css/dark.css',
  '/css/dark-hc.css',
  '/css/dark-mc.css',
  '/css/globus.css',
  '/css/light.css',
  '/css/light-hc.css',
  '/css/light-mc.css',
  '/css/mobile-menu.css',
  '/css/style.css',
  '/css/style-home.css',
  '/css/style-links.css',
  '/css/style-lite.css',

  '/js/lang-switch.js',
  '/js/lang-switch-sub.js',
  '/js/links.js',
  '/js/links-sub.js',
  '/js/script.js',
  '/js/script-sub.js',
  '/js/style-links.js',

  '/lang/lang.json',
  '/lang/sub-lang.json',

  '/links/index.html',
  '/random/index.html',
  '/random/links.js',

  '/Image/apple.png',
  '/Image/Apple_1.png',
  '/Image/Apple_2.png',
  '/Image/Apple_3.png',
  '/Image/Apple_4.png',
  '/Image/Apple_5.jpg',
  '/Image/index.html',
  '/Image/mikan.png',
  '/Image/wallpaper.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const url of urlsToCache) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn('[ServiceWorker] Failed to cache:', url, e);
        }
      }
    }).then(() => self.skipWaiting())
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

  // HTML (Navigation) -> Network First
  // 画像やCSSなど (Assets) -> Cache First
  const isNavigation = event.request.mode === 'navigate' || event.request.destination === 'document';

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200) return networkResponse;
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then(cachedResponse => {
            return cachedResponse || caches.match('/404');
          });
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request)
          .then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200) return networkResponse;
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
            return networkResponse;
          })
          .catch(() => {
            if (event.request.destination === 'image') return caches.match('/icon.webp');
          });
      })
    );
  }
});
