/*
 * KritZaar service worker (Agent 2).
 *
 * Strategy
 *  - HTML pages and /data/*.json|xml : network-first (3 s timeout) with cache fallback, so a
 *    catalog takedown (removed entry, deleted game page -> 404) takes effect as soon as the
 *    person is online. A 404/410 from the network also evicts the cached copy.
 *  - /emulator/vendor/*               : cache-first (pinned, versioned files; cached on first use)
 *  - other same-origin JS/CSS/images  : stale-while-revalidate
 *  - Game files are NEVER cached here. They live in IndexedDB only. Range requests, archive/ROM
 *    extensions, big responses, /admin/ and cross-origin requests are not touched.
 *
 * Update flow: a new sw.js installs in the background and waits. pwa-install.js shows
 * "A new version is ready" and posts SKIP_WAITING when the person taps Reload.
 * On the very first install it activates immediately so offline works right away.
 * Bump VERSION when you rename/remove files or change this list.
 */

const VERSION = 'v1';
const SHELL_CACHE = `kz-shell-${VERSION}`;
const RUNTIME_CACHE = `kz-runtime-${VERSION}`;
const NETWORK_TIMEOUT_MS = 3000;
const MAX_CACHE_BYTES = 50 * 1024 * 1024;

// Must all exist: install fails (old worker stays active) if any is missing.
const CORE = [
  '/emulator/index.html', '/emulator/player.js', '/emulator/player.css', '/emulator/bundler.js',
  '/library/index.html', '/library/library.js', '/library/library.css',
  '/css/emulator-shared.css', '/css/catalog.css',
  '/js/storage.js', '/js/dropzone.js', '/js/pwa-install.js', '/js/catalog.js', '/js/search-ui.js',
  '/js/touch-controls.js', '/js/continue-playing.js',
  '/data/games.json', '/data/allowed-sources.json',
  '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'
];

// Cached if reachable; a miss does not block install. The Combiner fills in the real
// vendor file names (js-dos, zip library) and the catalog page once they are known.
const OPTIONAL = [
  '/', '/games/', '/games/index.html', '/legal/how-it-works.html',
  '/emulator/vendor/js-dos.js', '/emulator/vendor/js-dos.css',
  '/emulator/vendor/emulators/emulators.js', '/emulator/vendor/emulators/wdosbox.js',
  '/emulator/vendor/emulators/wdosbox.wasm', '/emulator/vendor/emulators/wlibzip.js',
  '/emulator/vendor/emulators/wlibzip.wasm', '/emulator/vendor/fflate/fflate.js',
];

const NEVER_CACHE_EXT = /\.(zip|jsdos|exe|com|bat|iso|img|rom|bin|7z|rar)$/i;

/* ---------- helpers ---------- */

// Cache key = origin + pathname, so ?game=<id> and ?v=1 variants share one entry.
const keyFor = (url) => new Request(url.origin + url.pathname);

// Redirected responses cannot be served to navigations; rebuild them as plain responses.
async function clean(res) {
  if (!res.redirected) return res;
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
}

function cacheable(res) {
  if (!res || !res.ok || res.status === 206) return false;
  const len = Number(res.headers.get('content-length') || 0);
  const cc = res.headers.get('cache-control') || '';
  return len <= MAX_CACHE_BYTES && !/no-store/i.test(cc);
}

// Look up a page under the forms a static host may serve it as.
async function matchPage(url) {
  const cache = await caches.open(RUNTIME_CACHE);
  const p = url.pathname;
  const alts = [p];
  if (p.endsWith('/')) alts.push(p + 'index.html');
  else if (p.endsWith('/index.html')) alts.push(p.slice(0, -10));
  else if (p.endsWith('.html')) alts.push(p.slice(0, -5));
  else alts.push(p + '.html');
  for (const alt of alts) {
    const hit = (await cache.match(url.origin + alt)) || (await caches.match(url.origin + alt));
    if (hit) return hit;
  }
  return null;
}

const OFFLINE_HTML = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
  + '<title>Offline</title><body style="font-family:system-ui;padding:2rem;max-width:32rem;margin:auto">'
  + '<h1>You are offline</h1><p>This page has not been saved for offline use yet. Games you already added to '
  + '<a href="/library/">My Games</a> still work.</p></body>';

/* ---------- strategies ---------- */

async function networkFirst(request, url) {
  const cache = await caches.open(RUNTIME_CACHE);
  const key = keyFor(url);
  const isNav = request.mode === 'navigate';
  const store = async (res) => {
    if (res.status === 404 || res.status === 410) await cache.delete(key);
    else if (cacheable(res)) await cache.put(key, await clean(res.clone()));
  };
  try {
    const net = fetch(request);
    net.then(store, () => {}); // keep the cache fresh even if we answer from it
    let res = await Promise.race([net, new Promise((r) => setTimeout(() => r(null), NETWORK_TIMEOUT_MS))]);
    if (!res) { // slow network: answer from cache if we have it, else keep waiting
      const hit = await matchPage(url);
      if (hit) return hit;
      res = await net;
    }
    return isNav ? clean(res) : res;
  } catch (e) {
    const hit = await matchPage(url);
    if (hit) return hit;
    if (isNav) return new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return Response.error();
  }
}

async function cacheFirst(request, url) {
  const cache = await caches.open(RUNTIME_CACHE);
  const key = keyFor(url);
  const hit = (await cache.match(key)) || (await caches.match(key));
  if (hit) return hit;
  const res = await fetch(request);
  if (cacheable(res)) cache.put(key, res.clone()).catch(() => {});
  return res;
}

async function staleWhileRevalidate(request, url) {
  const cache = await caches.open(RUNTIME_CACHE);
  const key = keyFor(url);
  const hit = (await cache.match(key)) || (await caches.match(key));
  const refresh = fetch(request).then((res) => {
    if (res.status === 404 || res.status === 410) cache.delete(key);
    else if (cacheable(res)) cache.put(key, res.clone());
    return res;
  }).catch(() => null);
  if (hit) return hit;
  return (await refresh) || Response.error();
}

/* ---------- lifecycle ---------- */

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // cache: 'reload' bypasses the HTTP cache so a new version never precaches stale files.
    const add = async (u) => {
      const res = await fetch(new Request(u, { cache: 'reload' }));
      if (!res.ok) throw new Error(`${u}: ${res.status}`);
      await cache.put(u, await clean(res));
    };
    await Promise.all(CORE.map(add));
    await Promise.allSettled(OPTIONAL.map(add));
    if (!self.registration.active) self.skipWaiting(); // first install: take over now
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, RUNTIME_CACHE]);
    for (const name of await caches.keys()) {
      if (name.startsWith('kz-') && !keep.has(name)) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;
  if (p === '/sw.js' || p.startsWith('/admin/') || p.startsWith('/cdn-cgi/') || NEVER_CACHE_EXT.test(p)) return;

  if (p.startsWith('/emulator/vendor/')) {
    event.respondWith(cacheFirst(request, url));
  } else if (request.mode === 'navigate' || p.startsWith('/data/') || /\.(html|json|xml)$/i.test(p)) {
    event.respondWith(networkFirst(request, url));
  } else {
    event.respondWith(staleWhileRevalidate(request, url));
  }
});
