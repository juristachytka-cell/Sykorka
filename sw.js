// Sýkorkina misia – service worker (aplikácia na ploche + rýchle načítanie)
// Stránky sa vždy najprv skúsia načítať zo siete (aby boli otázky dňa a rebríček aktuálne),
// súbory s otázkami, štýly, písma a obrázky sa berú z vyrovnávacej pamäte a na pozadí obnovujú.
// API (/api/…) a cudzie adresy sa nikdy neukladajú.
const CACHE = 'sykorka-v20261021b';
const CORE = [
  '/', '/styles.css', '/otazky.js?v=20261021b', '/otazky-en.js?v=20261021b',
  '/favicon.svg', '/favicon.ico', '/icon-192.png', '/icon-512.png', '/site.webmanifest',
  '/fonts/inter-latin-400-normal.woff2', '/fonts/inter-latin-600-normal.woff2', '/fonts/inter-latin-800-normal.woff2',
  '/fonts/inter-latin-ext-400-normal.woff2', '/fonts/inter-latin-ext-600-normal.woff2', '/fonts/inter-latin-ext-800-normal.woff2',
  '/fonts/nunito-latin-700-normal.woff2', '/fonts/nunito-latin-900-normal.woff2',
  '/fonts/nunito-latin-ext-700-normal.woff2', '/fonts/nunito-latin-ext-900-normal.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/vysledky')) return;

  // stránky: najprv sieť, bez siete posledná uložená verzia
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      if (res.ok && url.pathname === '/') { const copy = res.clone(); caches.open(CACHE).then(c => c.put('/', copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('/'))));
    return;
  }

  // ostatné súbory: rýchlo z pamäte, na pozadí aktualizovať
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req);
    const net = fetch(req).then(res => { if (res.ok && res.type === 'basic') c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
