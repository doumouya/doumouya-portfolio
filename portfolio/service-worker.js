/* Portfolio service worker — minimal offline app shell.
 *
 * Strategy (kept deliberately small; finalize precaching when the amenan-ui shell lands):
 *   - navigations: network-first, fall back to the cached shell — so fresh deploys win,
 *     yet the site still opens offline.
 *   - other same-origin GET assets: stale-while-revalidate (fast, refreshes in the background).
 *
 * Bump CACHE whenever the shell list changes so stale entries are purged on activate.
 */
const CACHE = "portfolio-v2";
const SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/apps/echarts-dashboard/index.html",
  "/apps/rbac-explorer/index.html",
];

self.addEventListener("install", (event) => {
  // addAll is atomic: if any shell URL 404s the install fails, so keep this list honest.
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  // Navigations: network-first so a new deploy is picked up immediately; cached shell offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match("/index.html"))),
    );
    return;
  }

  // Assets: serve from cache immediately, revalidate in the background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
