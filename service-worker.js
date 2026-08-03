// =============================================
// SERVICE-WORKER.JS
// Enables: (1) real "Add to Home Screen" installability
//          (2) offline fallback for previously-visited pages
//          (3) instant repeat loads for CSS/JS/images
// -------------------------------------------------------------
// ZERO MAINTENANCE BY DESIGN:
//   - There is NO fixed list of files to precache. Whatever the visitor's
//     browser actually requests (any page, any CSS/JS/image) gets cached
//     automatically the first time it's fetched. Add a new blog post,
//     product image, or JS file on the site and this file needs ZERO
//     edits — nothing to update here.
//   - There is NO manual "cache version" to bump when you edit your CSS/
//     JS/HTML. Every same-origin file uses "stale-while-revalidate":
//     the cached copy is served instantly, AND a background fetch always
//     checks the network and refreshes the cache for next time. So the
//     very first load after you deploy a change might show the old
//     version once — the next load (a few seconds later) is always the
//     new one. No version bump, no cache-clearing step, ever.
//   - You only ever need to touch THIS file if you want to change the
//     caching *strategy* itself (e.g. stop caching a certain file type).
// =============================================

const CACHE_NAME = 'ebp-cache';

// The only thing worth precaching: the offline fallback page and the
// logo it displays — these are tiny, rarely change, and must be
// available even on a visitor's very first (offline) load.
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/assets/images/logo.png'];

// ── INSTALL ────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

// ── ACTIVATE — drop any old cache from a previous version of this file ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith('ebp-') && key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// ── FETCH ──────────────────────────────────────────────────────
// Same-origin GET requests only. Cross-origin (Amazon, EmailJS, GA,
// Meta Pixel, Google Fonts, Font Awesome CDN, Turnstile, etc.) are left
// completely alone — the browser handles those normally.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isHTML = request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html');

  // Only worth text-diffing HTML pages and same-origin JS/JSON — this is
  // where real content lives (page markup, products.js, posts.js, etc.).
  // Images/fonts/CSS are skipped: comparing them adds cost for content
  // that visitors rarely need an instant "update available" nudge for.
  const isWatchable = isHTML || /\.(js|json)$/.test(url.pathname);

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);

      // Always try the network in the background and update the cache —
      // this is what makes content-freshness automatic (no version bump).
      const networkFetch = fetch(request)
        .then(async (response) => {
          if (response && response.ok) {
            // If we already had a cached copy AND the fresh copy is
            // actually different text, tell every open tab so it can show
            // a "New content available" banner — instead of the visitor
            // only finding out on some future, unprompted reload.
            if (isWatchable && cached) {
              try {
                const [oldText, newText] = await Promise.all([
                  cached.clone().text(),
                  response.clone().text(),
                ]);
                if (oldText !== newText) {
                  const clients = await self.clients.matchAll({ type: 'window' });
                  clients.forEach((client) =>
                    client.postMessage({ type: 'EBP_UPDATE_AVAILABLE', url: request.url })
                  );
                }
              } catch (_) {
                // Diffing failed for some reason (e.g. opaque response) —
                // not worth breaking the fetch over, just skip the notice.
              }
            }
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      // Serve cache instantly if we have it; otherwise wait for network.
      if (cached) {
        networkFetch; // update cache + notify in the background, don't block on it
        return cached;
      }

      const fresh = await networkFetch;
      if (fresh) return fresh;

      // Nothing cached and network failed: HTML pages fall back to the
      // offline page; anything else just fails (e.g. a missing image).
      if (isHTML) return cache.match(OFFLINE_URL);
      return Response.error();
    })
  );
});
