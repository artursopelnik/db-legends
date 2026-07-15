/* Service Worker: macht die App offline nutzbar (App-Shell-Caching). */
const CACHE_NAME = 'dbl-qr-v20';
const ASSETS = [
  '/',
  '/index.html',
  '/de/',
  '/de/index.html',
  '/es/',
  '/es/index.html',
  '/pt/',
  '/pt/index.html',
  '/fr/',
  '/fr/index.html',
  '/ru/',
  '/ru/index.html',
  '/ja/',
  '/ja/index.html',
  '/app.js',
  '/i18n.js',
  '/lib/qrcode.js',
  '/fonts/bangers.woff2',
  '/manifest.webmanifest',
  '/promo-codes.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/bmc-button.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first mit Netzwerk-Fallback; erfolgreiche Antworten aktualisieren den Cache.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const reqPath = new URL(event.request.url).pathname;

  // Sitemap + robots.txt nie cachen – Crawler/GSC/Browser sollen immer die frische Version bekommen.
  if (reqPath === '/sitemap.xml' || reqPath === '/robots.txt') {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  // Promo-Codes immer zuerst frisch vom Netz holen (Fallback: Cache)
  if (reqPath.endsWith('promo-codes.json')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fromNetwork = fetch(event.request)
        .then((response) => {
          if (response.ok && new URL(event.request.url).origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fromNetwork;
    })
  );
});
