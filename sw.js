self.addEventListener('install', event => {
  console.log('Service Worker installato');
  // Forza l'attivazione immediata del nuovo SW
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker attivato');
  // Prendi il controllo di tutti i client immediatamente
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  // Passa attraverso tutte le richieste senza interferire
  // per evitare problemi di routing su GitHub Pages
  return;
});
