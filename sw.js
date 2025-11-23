// Service Worker for Mechanic Hours PWA
// Stable cache naming to avoid reinstall each launch
const CACHE_VERSION = 'v1';
const CACHE_NAME = `mechanic-hours-${CACHE_VERSION}`;
// If hosted under GitHub Pages subpath (e.g., /CrickTime/), adjust BASE_PATH
// Detect build public URL (GitHub Pages build sets PUBLIC_URL env -> injected in asset paths).
const BASE_PATH = self.location.pathname.includes('/CrickTime/') ? '/CrickTime' : '';

const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`
  // Bundled assets will be cached on demand (runtime caching)
];

// Install event - cache resources and take control immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Fetch event - network first, then cache
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Normalize navigation requests for SPA routing
  const isNavigate = req.mode === 'navigate';
  if (isNavigate) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(`${BASE_PATH}/index.html`, copy));
          return resp;
        })
        .catch(() => caches.match(`${BASE_PATH}/index.html`))
    );
    return;
  }

  // Runtime caching: network first
  event.respondWith(
    fetch(req)
      .then((resp) => {
        if (resp && resp.status === 200 && req.method === 'GET' && (url.origin === location.origin)) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return resp;
      })
      .catch(() => caches.match(req))
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names.filter(n => n.startsWith('mechanic-hours-') && n !== CACHE_NAME)
        .map(old => caches.delete(old))
    )).then(() => self.clients.claim())
  );
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('SW: Clearing cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        // Notify all clients that cache was cleared
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'CACHE_CLEARED' });
          });
        });
      })
    );
  }
});
