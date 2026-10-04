/* GlobalYouXuan service worker: push notifications + instant page switching.
   Pages: served from cache instantly and refreshed in the background (stale-while-revalidate),
   so switching tabs never waits on the network or on the Pages .html -> pretty-URL redirect.
   Assets: URLs carry a content hash (tools/build_assets.py), so they are cache-first. */
/*BUILD:START*/
const VERSION = "gyx-sw-497736cb097a";
const PAGES = ["shop", "community", "free-zone", "member", "login", "face-translate"];
const PRECACHE = [
 "aimusic-guest-link.js?v=1249880ada",
 "assets/member-logo.webp?v=0ee42fa49d",
 "auth.js?v=93eff74c12",
 "business-growth-cloud.js?v=cd8f13a033",
 "community-page.js?v=25033a8fb8",
 "core-foundation.js?v=9ea1d035b2",
 "entry-auth-modal.js?v=5491ec2e37",
 "face-translate.js?v=ec5c141ebc",
 "fixed-modules.js?v=6a99050cd1",
 "free-zone-tools.js?v=1c03b3e11a",
 "guest-register-gate.js?v=91043a9a3b",
 "home-ios-nav-lock.js?v=d8e6ffa0b8",
 "home-register-support.js?v=7914ba843a",
 "home-spare-time-plan.js?v=3419fc9c63",
 "home.css?v=5b1a755ceb",
 "i18n-member.js?v=2d6c27e2ba",
 "i18n.js?v=95de92a7cf",
 "knowledge-decision-v2.js?v=cbed3f88fb",
 "learning-loop.js?v=ad84f9f2ce",
 "member-accordion.css?v=f8b48d4ccb",
 "member-accordion.js?v=d1a1b270f9",
 "member-action-layout.css?v=36185dde4a",
 "member-bootstrap.js?v=54196056c7",
 "member-checkout.js?v=eae30958be",
 "member-cloud-service.js?v=35a48fda19",
 "member-dashboard-v2.css?v=a9a5f7eff3",
 "member-dashboard-v2.js?v=f960464020",
 "member-delivery-content.js?v=b696898ba9",
 "member-download-action.js?v=8b4d752dae",
 "member-fold-refresh-fix.js?v=3f8dcaa41e",
 "member-growth-execution.js?v=4465228243",
 "member-growth-favorite.js?v=2c15cb2f4a",
 "member-inbox.js?v=74a6014fc5",
 "member-order-watch.js?v=84dac43dc4",
 "member-page.css?v=00396209b2",
 "member-payment.js?v=1eff2d1319",
 "member-points.css?v=0f2a22b978",
 "member-points.js?v=790ecadafc",
 "member-profile-support-v4.js?v=5b877a44ac",
 "member-state-sync.js?v=02854b07d8",
 "member.js?v=6d74ffa00d",
 "search-actions-v2.js?v=c59f16c0d7",
 "site-ui.js?v=8108814ecc",
 "site.css?v=826461de42",
 "speed-boost.js?v=1f3037b729",
 "supabase-client.js?v=d351e72333",
 "support-payment-intent.js?v=021131882f",
 "ui-stability.js?v=ccd0b26a97",
 "vendor/supabase-js-2.112.0.umd.js?v=5911578d8a"
];
/*BUILD:END*/
const PAGE_KEY = new Map();
for (const p of PAGES) { PAGE_KEY.set('/' + p, p); PAGE_KEY.set('/' + p + '.html', p); }
PAGE_KEY.set('/', 'shop');
PAGE_KEY.set('/index.html', 'shop');
const pageCacheKey = p => new Request(self.location.origin + '/__page/' + p);

async function fetchPage(p) {
  // canonical pretty URL: no redirect, so the response can answer any navigation
  const res = await fetch('/' + p, { credentials: 'same-origin', cache: 'no-cache' });
  if (!res || !res.ok || res.redirected || res.type !== 'basic') return null;
  return res;
}

async function refreshPage(p) {
  try {
    const res = await fetchPage(p);
    if (res) await (await caches.open(VERSION)).put(pageCacheKey(p), res.clone());
    return res;
  } catch (e) { return null; }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.allSettled(PRECACHE.map(u => cache.add(new Request(u, { cache: 'reload' }))));
    await Promise.allSettled(PAGES.map(p => refreshPage(p)));
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

async function servePage(event, p) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(pageCacheKey(p));
  const fresh = refreshPage(p);
  event.waitUntil(fresh);
  if (cached) return cached;
  const res = await fresh;
  return res || fetch(event.request);
}

async function networkFirstDocument(request) {
  try {
    return await fetch(request);
  } catch (e) {
    const cache = await caches.open(VERSION);
    return (await cache.match(pageCacheKey('shop'))) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok && res.type === 'basic') cache.put(request, res.clone()).catch(() => {});
  return res;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/cdn-cgi/')) return;

  if (request.mode === 'navigate') {
    const p = PAGE_KEY.get(url.pathname);
    event.respondWith(p ? servePage(event, p) : networkFirstDocument(request));
    return;
  }

  if (/\.(js|css|webp|png|jpg|svg)$/.test(url.pathname) && url.searchParams.has('v')) {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type !== 'GYX_SHOW_NOTIFICATION') return;
  const title = data.title || 'GlobalYouXuan';
  const options = {
    body: data.body || '',
    icon: 'assets/member-logo.webp?v=0ee42fa49d',
    badge: 'assets/member-logo.webp?v=0ee42fa49d',
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
    icon: payload.icon || 'assets/member-logo.webp?v=0ee42fa49d',
    badge: payload.badge || 'assets/member-logo.webp?v=0ee42fa49d',
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
