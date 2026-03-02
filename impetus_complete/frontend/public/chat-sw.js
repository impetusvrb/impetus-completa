/* IMPETUS Chat - Service Worker para PWA */
const CACHE_NAME = 'impetus-chat-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/chat', '/']);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate' && event.request.url.includes('/chat')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/chat').then((r) => r || caches.match('/'))
      )
    );
  }
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'IMPETUS Chat';
  const options = { body: data.body || 'Nova mensagem' };
  event.waitUntil(self.registration.showNotification(title, options));
});
