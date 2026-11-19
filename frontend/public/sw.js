const CACHE_NAME = 'sampada-v4';
const SHELL_URLS = ['/', '/manifest.webmanifest'];

// ponytail: precache only the shell. Hashed assets are cached on first use;
// fetching every asset here duplicated the whole first page load.
async function precache() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(SHELL_URLS);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// The new worker waits until the user accepts the update (the UI sends
// SKIP_WAITING), so nobody is swapped out mid-session.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function fetchWithTimeout(request, ms) {
  return Promise.race([
    fetch(request),
    new Promise((resolve) => setTimeout(() => resolve(undefined), ms)),
  ]);
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // API calls: network-first with a 3s timeout. The cache answers ONLY when
  // the network itself fails (timeout/offline) — a server response, including
  // any error, is authoritative and always passes through, so a logged-out or
  // auth-failed call is never masked by a stale cached 2xx.
  if (url.pathname.startsWith('/api/')) {
    const offline = () =>
      new Response(JSON.stringify({ success: false, message: 'Offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    event.respondWith(
      fetchWithTimeout(event.request, 3000).then(async (response) => {
        if (response === undefined) {
          const cached = await caches.match(event.request);
          return cached || offline();
        }
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(event.request);
        return cached || offline();
      })
    );
    return;
  }

  // Hashed assets and fonts: immutable — cache-first, then network + cache.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/fonts/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }
        return response;
      }))
    );
    return;
  }

  // Navigation and everything else: network-first. Navigation responses must
  // NOT race a short timeout — a slow network once served a stale precached
  // shell pointing at deleted hashed assets (blank screens, dead buttons, the
  // old hero). Only a genuinely failed/absent network response falls back.
  event.respondWith(
    fetch(event.request).then(async (response) => {
      if (response && response.ok && url.pathname === '/') {
        const cache = await caches.open(CACHE_NAME)
        cache.put('/', response.clone())
      }
      return response
    }).catch(async () => {
      return (await caches.match(event.request)) || caches.match('/')
    })
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/logo-192.png',
    badge: '/logo-192.png',
    tag: data.tag || 'sampada-notification',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(data.title || 'Sampada', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(url);
      } else {
        self.clients.openWindow(url);
      }
    })
  );
});
