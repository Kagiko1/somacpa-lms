/* SomaCPA service worker — offline-first for lesson content.
 * - App shell & static assets: cache-first
 * - Lesson pages & API reads: network-first, fall back to cache
 * - Audio MP3s: cached on demand via the "Save offline" button (see AudioBar)
 */
const STATIC_CACHE = "somacpa-static-v1";
const PAGES_CACHE = "somacpa-pages-v1";
const AUDIO_CACHE = "somacpa-audio-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(["/manifest.json", "/icon.svg", "/offline.html"])
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, PAGES_CACHE, AUDIO_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

const isAudio = (url) => /\.(mp3|m4a|ogg|wav)(\?|$)/i.test(url);
const isStatic = (url) =>
  url.includes("/_next/static/") || /\.(svg|png|jpg|jpeg|webp|ico|css|js)(\?|$)/i.test(url);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = request.url;

  // Audio: cache-first (already saved via AudioBar, or streamed then cached)
  if (isAudio(url)) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          return hit || Response.error();
        }
      })
    );
    return;
  }

  // Static assets: cache-first
  if (isStatic(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            return res;
          })
      )
    );
    return;
  }

  // Pages & API: network-first with offline fallback
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && new URL(url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(PAGES_CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(request).then((hit) => hit || caches.match("/offline.html"))
      )
  );
});
