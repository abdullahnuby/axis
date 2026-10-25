/* AXIS PWA service worker.
 * Private pages, API routes, authentication responses and user-uploaded media are NEVER cached.
 * Only versioned Next.js static assets and public app icons may be cached.
 */
const CACHE_PREFIX = "axis-public-static-";
const CACHE_NAME = `${CACHE_PREFIX}v5`;
const PRECACHE_URLS = [
  "/offline.html",
  "/axis-mark.svg",
  "/axis-logo.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin") || url.pathname.startsWith("/login") || url.pathname.startsWith("/register") || url.pathname.startsWith("/verification") || url.pathname.startsWith("/profile") || url.pathname.startsWith("/feed") || url.pathname.startsWith("/settings") || url.pathname.startsWith("/notifications")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/axis-mark.svg" || url.pathname === "/axis-logo.svg") {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok && response.type === "basic") await cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match("/offline.html")) || Response.error();
    }));
  }
});
