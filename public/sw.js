/* ZOMBIEREX Service Worker — offline shell + media cache
 *
 * Privacy rule: personalised HTML and API payloads are NEVER written to the
 * cache. Any page can be private (auth state is client-side, so the URL alone
 * cannot tell us), so navigations are network-only with a generic offline
 * shell fallback. Only immutable static assets and media are cached.
 */
const SHELL_CACHE = "zrx-shell-v5";
const MEDIA_CACHE = "zrx-media-v5";
const CORE = ["/", "/favicon.ico", "/manifest.webmanifest"];
const MAX_MEDIA = 200;


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
            .filter((k) => ![SHELL_CACHE, MEDIA_CACHE].includes(k))
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

function isPrivateAsset(url) {
  // Signed/expiring storage URLs and anything API-shaped is per-user data.
  return url.pathname.startsWith("/api/") || url.search.includes("token=");
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

  // Never touch server functions, auth endpoints, webhooks or API payloads.
  if (
    url.pathname.startsWith("/_serverFn") ||
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/reset-password") ||
    isPrivateAsset(url)
  ) {
    return;
  }

  // HTML navigation → network-only. Rendered HTML can contain the signed-in
  // user's data, so it is never persisted; offline falls back to the generic
  // app shell cached at install time.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/")));
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
