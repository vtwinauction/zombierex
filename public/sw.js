/* ZOMBIEREX Service Worker — offline shell + media/API cache */
const SHELL_CACHE = "zrx-shell-v4";
const MEDIA_CACHE = "zrx-media-v4";
const API_CACHE = "zrx-api-v4";
const CORE = ["/", "/favicon.ico", "/manifest.webmanifest"];
const MAX_MEDIA = 200;
const MAX_API = 100;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => ![SHELL_CACHE, MEDIA_CACHE, API_CACHE].includes(k))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING" || event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data === "PURGE_CACHES" || event.data?.type === "PURGE_CACHES") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
  }
});

function shouldCacheMedia(url) {
  const path = url.pathname.toLowerCase();
  return /\.(jpg|jpeg|png|webp|avif|gif|mp4|webm|mov|mkv)(\?|$)/i.test(path);
}

function shouldCacheApi(url) {
  // Cache GET API calls that are safe to replay offline (public read endpoints, not server functions or auth)
  return url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/public/hooks/");
}

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxItems) return;
  const toDelete = keys.slice(0, keys.length - maxItems);
  await Promise.all(toDelete.map((req) => cache.delete(req)));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache server functions, auth endpoints, or webhooks
  if (
    url.pathname.startsWith("/_serverFn") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/api/public/hooks/") ||
    // Never cache authenticated HTML — it must not survive on a shared device.
    url.pathname.startsWith("/_authenticated")
  ) {
    return;
  }

  // HTML navigation → network-first, fall back to cached shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches
            .open(SHELL_CACHE)
            .then((c) => c.put(req, copy))
            .catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/"))),
    );
    return;
  }

  // Media assets → stale-while-revalidate with LRU trim
  if (shouldCacheMedia(url)) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) {
              cache
                .put(req, res.clone())
                .then(() => trimCache(MEDIA_CACHE, MAX_MEDIA))
                .catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  // Safe GET API responses → stale-while-revalidate
  if (shouldCacheApi(url)) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) {
              cache
                .put(req, res.clone())
                .then(() => trimCache(API_CACHE, MAX_API))
                .catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  // Static assets → cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches
            .open(SHELL_CACHE)
            .then((c) => c.put(req, copy))
            .catch(() => {});
        }
        return res;
      });
    }),
  );
});
