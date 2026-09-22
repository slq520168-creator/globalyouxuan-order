/* GlobalYouXuan service worker: push notifications + instant navigation */
const VERSION = 'gyx-sw-v20260921-speed-3';
const CORE_ASSETS = [
  './',
  'shop.html',
  'member.html',
  'community.html',
  'free-zone.html',
  'login.html',
  'index.html',
  'face-translate.html',
  'i18n.js?v=20260921-face-2',
  'i18n-member.js?v=20260921-face-2',
  'site.css',
  'home.css?v=20260822-card-title-1',
  'member-page.css?v=20260811-member-security-3',
  'member-accordion.css?v=20260917-access-box-style-1',
  'member-dashboard-v2.css?v=20260812-confirmed-profile-2',
  'member-action-layout.css?v=20260819-modal-height-1',
  'member-points.css?v=20260817-delivery-reader-2',
  'member-accordion.css?v=20260813-no-content-flash-1',
  'admin-panel-lock.css',
  'face-translate.js?v=20260921-face-2',
  'manifest.webmanifest',
  'assets/member-logo.webp'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.allSettled(CORE_ASSETS.map(u => cache.add(new Request(u, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isNavigation(request) {
  return request.mode === 'navigate' || (request.method === 'GET' && request.destination === 'document');
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: false });
  const network = fetch(request).then(response => {
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  if (cached) return cached;
  const fresh = await network;
  return fresh || Response.error();
}

async function networkFirstHtml(request) {
  const cache = await caches.open(VERSION);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      const url = new URL(request.url);
      const key = url.pathname.split('/').pop() || './';
      cache.put(new Request(key, { method: 'GET' }), fresh.clone()).catch(() => {});
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (e) {
    const url = new URL(request.url);
    const key = url.pathname.split('/').pop() || './';
    return (await cache.match(request)) || (await cache.match(key)) || (await cache.match('./')) || (await cache.match('shop.html')) || Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/cdn-cgi/')) return;

  if (isNavigation(request)) {
    event.respondWith(networkFirstHtml(request));
    return;
  }

  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.startsWith('/assets/')) {
    event.respondWith(staleWhileRevalidate(request, VERSION));
  }
});

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type !== 'GYX_SHOW_NOTIFICATION') return;
  const title = data.title || 'GlobalYouXuan';
  const options = {
    body: data.body || '',
    icon: 'assets/member-logo.webp',
    badge: 'assets/member-logo.webp',
    data: { url: data.url || 'shop.html' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data ? event.data.text() : '' }; }
  const title = payload.title || 'GlobalYouXuan';
  const options = {
    body: payload.body || '',
    icon: payload.icon || 'assets/member-logo.webp',
    badge: payload.badge || 'assets/member-logo.webp',
    data: { url: payload.url || 'shop.html' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || 'shop.html', self.location.origin).href;
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of list) {
      if ('focus' in client) {
        if ('navigate' in client) await client.navigate(target);
        return client.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(target);
  })());
});
