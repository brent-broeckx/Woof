// Woofdoku service worker: offline play after the first visit.
// VERSION and PRECACHE are filled in at build time (see vite.config.ts), so each deploy
// gets a fresh cache and every built asset (incl. lazy mini-game chunks) works offline.
const VERSION = 'woofdoku-dev';
const PRECACHE = [];
const CORE = [...new Set(['./', './index.html', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', ...PRECACHE])];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;

  // Pages: network first so updates arrive, cache as offline fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html', { ignoreVary: true })),
    );
    return;
  }

  // Hashed assets, icons and fonts: cache first, refresh in the background.
  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(req, { ignoreVary: true });
      const network = fetch(req)
        .then((res) => {
          if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

// Pup hunger reminders (Web Push, see src/net/push.ts and supabase/functions/push-reminders).
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Woofdoku', {
      body: data.body || 'Your pup misses you!',
      tag: data.tag || 'pup-hunger',
      renotify: true,
      icon: './icons/icon-192.png',
      data: { url: data.url || './' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.registration.scope));
      if (open) {
        open.postMessage({ type: 'open-pup' });
        return open.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
