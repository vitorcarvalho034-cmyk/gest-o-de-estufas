// Flores da Terra — service worker de atualização.
// Mantém somente um app-shell mínimo e sempre busca HTML/JS atualizados na rede.
const CACHE_NAME = 'flores-da-terra-shell-v1';
const APP_SHELL = ['/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Navegação e index sempre vêm da rede; o cache é somente fallback offline.
  if (request.mode === 'navigate' || new URL(request.url).pathname === '/index.html') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => response)
        .catch(() => caches.match('/'))
    );
  }
});
