const CACHE_NAME = 'fxv-wb-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
];

// Firebase domains to cache responses from
const FIREBASE_HOSTS = [
  'firestore.googleapis.com',
  'firebase.googleapis.com',
];

// Install: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - App shell (index.html): cache-first, fall back to network
// - Firebase requests: network-first, fall back to cache
// - Everything else: network-first, fall back to cache
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Firebase: network-first so data stays fresh when online,
  // but cached version works offline
  if (FIREBASE_HOSTS.some(host => url.hostname.includes(host))) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // App shell: cache-first
  if (url.pathname === '/' || url.pathname.endsWith('index.html')) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // Default: network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
