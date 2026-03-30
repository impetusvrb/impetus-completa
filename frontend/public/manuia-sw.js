/* global self */
/**
 * Service Worker mínimo — ManuIA Campo (push + notificação).
 * Escopo: raiz do site; não interfere com /chat-sw.js.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'ManuIA', body: event.data ? event.data.text() : '' };
  }
  const title = payload.title || 'ManuIA';
  const body = payload.body || '';
  const opts = {
    body,
    icon: '/manuia-app-icon.svg',
    badge: '/manuia-app-icon.svg',
    tag: payload.tag || 'manuia',
    data: payload.data || { url: '/app/manutencao/manuia-app' },
    requireInteraction: false
  };
  event.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/app/manutencao/manuia-app';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const c of clientList) {
        if (c.url && 'focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
