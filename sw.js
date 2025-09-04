const CACHE_NAME = 'sorpresine-v1';
const urlsToCache = [
  './',
  './index.html',
  './home.html', 
  './collection.html',
  './style.css',
  './manifest.json'
];

self.addEventListener('install', event => {
  console.log('Service Worker installato');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aperta');
        return cache.addAll(urlsToCache);
      })
  );
  // Forza l'attivazione immediata del nuovo SW
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker attivato');
  // Prendi il controllo di tutti i client immediatamente
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Ritorna la risorsa dalla cache se disponibile, altrimenti fetch dalla rete
        return response || fetch(event.request);
      })
  );
});
