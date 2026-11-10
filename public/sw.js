// Flores da Terra — service worker de atualização e funcionamento offline.
// Guarda o app-shell e os assets estáticos já carregados para o aplicativo
// continuar abrindo quando o celular estiver sem sinal ou Wi-Fi.
const CACHE_NAME = 'flores-da-terra-shell-v2';
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

  const url = new URL(request.url);

  // Navegação e index preferem a rede; o cache é fallback offline.
  if (request.mode === 'navigate' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => response)
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Cacheia somente arquivos do próprio aplicativo. Chamadas do Supabase e
  // outros domínios continuam seguindo a fila/cache de dados do React.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && (url.pathname.startsWith('/assets/') ||
          ['script', 'style', 'font', 'image'].includes(request.destination))) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
