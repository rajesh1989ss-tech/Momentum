/* Momentum service worker: the app opens instantly and fully offline.
   Served from cache first; a fresh copy is fetched in the background whenever there is signal,
   so updates to the app arrive on the next launch. Task data never passes through here. */
const CACHE = 'momentum-app-3.0';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-180.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('momentum-app-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const font = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== self.location.origin && !font) return;
  const nav = req.mode === 'navigate';
  e.respondWith(caches.open(CACHE).then(async cache => {
    const key = nav ? './index.html' : req;
    const hit = await cache.match(key, { ignoreSearch: nav });
    const fresh = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(fresh); return hit; }
    return (await fresh) || new Response('Momentum is offline and this file is not cached yet.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }));
});
