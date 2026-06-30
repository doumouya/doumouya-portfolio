/* Tombstone service worker — TEMPORARY.
 *
 * The portfolio SW was dropped while the UI is in flux (the app-shell precache caused
 * stale-cache friction during development). This file replaces the old worker: when a
 * browser that still has the old SW registered does its periodic update check, it fetches
 * THIS, which on activate wipes every cache, unregisters itself, and reloads open tabs —
 * fully removing the worker and its stale caches from returning visitors.
 *
 * New visitors don't register any SW (the page no longer calls register()). Once we're
 * confident all clients have cycled through this tombstone, it can be deleted outright.
 * A real RedPash-lean, content-hashed SW will replace it when the UI is finalized.
 */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) client.navigate(client.url);
    })(),
  );
});
