/* Al Qadir Traders — offline support
   - App files (index.html, icons...): network first, so a new upload shows up at once; cached copy when offline.
   - Libraries/fonts from CDNs: served from cache, refreshed in the background. */
const VERSION = 'aq-ledger-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './favicon-32.png'];
const CDN_HOSTS = ['cdn.tailwindcss.com', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'upload.wikimedia.org', 'images.unsplash.com'];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    if (/traineddata/.test(url.pathname)) return;   // OCR language data caches itself

    if (url.origin === self.location.origin) {
        event.respondWith(
            fetch(req).then(res => {
                if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
                return res;
            }).catch(() =>
                caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
                    .then(hit => hit || new Response('Offline', { status: 503, statusText: 'Offline' }))
            )
        );
        return;
    }

    if (CDN_HOSTS.includes(url.hostname)) {
        event.respondWith(
            caches.open(VERSION).then(cache => cache.match(req).then(hit => {
                const net = fetch(req).then(res => {
                    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
                    return res;
                }).catch(() => hit);
                return hit || net;
            }))
        );
    }
});
