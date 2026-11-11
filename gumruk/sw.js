// Offline cache. The version changes on every publish, so a new week's pack replaces the old copy.
// tools/assemble.py fills the four double-underscore markers below per site: the main page and the
// gumruk/ page each get their own worker, and both live in one origin's cache storage, so each keeps to its own
// prefix.
const PREFIX = 'gumruk';
const CACHE = PREFIX + '-24dc815405';
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "../icon-192.png", "../icon-512.png", "../apple-touch-icon.png"];
// Paths of other sites inside this worker's scope. Their pages belong to their own worker.
const OTHERS = [].map(p => new URL(p, self.registration.scope).pathname);
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX + '-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const keep = (req, res) => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
const mine = req => caches.open(CACHE).then(c => c.match(req));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    // Another site's page: leave it to the network and to that site's own worker.
    if (OTHERS.some(p => url.pathname.startsWith(p))) return;
    // Page: network first so new packs arrive, cached under its own URL; offline: that copy, else this site's index.
    e.respondWith(fetch(req).then(r => keep(req, r)).catch(() => mine(req).then(hit => hit || mine('./index.html'))));
  } else if (url.origin === location.origin && url.pathname.endsWith('/daily.json')) {
    // Daily pages: network first so today's page arrives, the last copy when offline.
    e.respondWith(fetch(req).then(r => keep(req, r)).catch(() => mine(req)));
  } else if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(mine(req).then(hit => hit || fetch(req).then(r => keep(req, r))));
  }
});
