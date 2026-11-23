/* Tapestry Acres — Meet the Herd · service worker
   App shell is cache-first (instant load, offline-capable at the farm).
   herd.json is network-first with a cached fallback (fresh when online, still
   browsable offline). Write POSTs (/name /reject /photo /suggest /vote) are
   never cached — they must hit the live daemon. */
const SHELL = 'herd-shell-v12-obscura';
const DATA = 'herd-data-v12';
const SHELL_FILES = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== SHELL && k !== DATA).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;                    // writes go straight to network

  if (url.pathname.endsWith('/herd.json')) {           // network-first, fall back to cache
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(DATA).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }
  // live admin queues — never cache (must reflect the vault right now)
  if (/\/(crops|gallery|sortqueue|healthz)$/.test(url.pathname)) return;

  // App shell: network-FIRST so updates land immediately, falling back to cache
  // only when offline (keeps the farm-field offline browse working). Avoids the
  // classic "stale SW shell hides my new deploy" trap.
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok && url.origin === location.origin) {
        const copy = res.clone();
        caches.open(SHELL).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
