/* AXIS PWA service worker.
 * Private pages, API routes, authentication responses and user-uploaded media are NEVER cached.
 * Only versioned Next.js static assets and public app icons may be cached.
 */
const CACHE_PREFIX = "axis-public-static-";
const CACHE_NAME = `${CACHE_PREFIX}v6`;
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


self.addEventListener("push", event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data ? event.data.text() : "" }; }
  const title = typeof payload.title === "string" && payload.title ? payload.title : "إشعار جديد من AXIS";
  const options = {
    body: typeof payload.body === "string" ? payload.body : "فيه تحديث جديد يخص حسابك.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: typeof payload.tag === "string" ? payload.tag : undefined,
    data: { url: typeof payload.url === "string" ? payload.url : "/notifications" },
    dir: "rtl",
    lang: "ar",
    renotify: false
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const destination = new URL(
    typeof event.notification.data?.url === "string" ? event.notification.data.url : "/notifications",
    self.location.origin
  );
  const targetUrl = destination.origin === self.location.origin ? destination.href : new URL("/notifications", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async clients => {
    for (const client of clients) {
      if ("focus" in client) {
        await client.focus();
        if ("navigate" in client && client.url !== targetUrl) await client.navigate(targetUrl);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(targetUrl);
  }));
});
