/*
 * Istel service worker: lets the installed app open without a connection.
 * - Pages: network first, so every deploy shows up right away; the last good copy is used offline.
 * - Built files (/_expo/static, /assets, /icons): cache first. Their names change with every build.
 * - Anything else, including Supabase (another origin), is never touched.
 */
const SHELL = 'istel-shell-v3';
const STATIC = 'istel-static-v3';
const STATIC_LIMIT = 80;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.add('/')).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - STATIC_LIMIT)).map((k) => cache.delete(k)));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL).then((cache) => cache.put('/', copy));
          }
          return response;
        })
        .catch(() => caches.match('/', { cacheName: SHELL })),
    );
    return;
  }

  if (/^\/(_expo\/static|assets|icons)\//.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response.clone());
          trim(cache);
        }
        return response;
      }),
    );
  }
});
