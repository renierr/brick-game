const CACHE = 'ricochet-v1';
const ASSETS = [
  './',
  'index.html',
  'help.html',
  'style.css',
  'js/tiles.js',
  'js/config.js',
  'js/state.js',
  'js/audio.js',
  'js/fx.js',
  'js/board.js',
  'js/actions.js',
  'js/sim.js',
  'js/render.js',
  'js/progress.js',
  'js/input.js',
  'js/main.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith(fetch(event.request, { cache: 'no-store' }).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached ||
    (event.request.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
