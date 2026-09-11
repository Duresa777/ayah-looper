const CACHE_NAME = 'ayah-looper-v1';

// The files we want to save to the phone for instant loading
const ASSETS = [
  '/',
  '/index.html',
  '/library.html',
  '/faq.html',
  '/app.js',
  '/favicon.png',
  '/manifest.json'
];

// Install the Service Worker and cache the files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// When the app requests a file, check the cache first for lightning-fast speeds
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
