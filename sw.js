const CACHE_NAME = "hanium-traffic-shell-v3";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/app.js",
  "./js/config.js",
  "./js/csv.js",
  "./js/store.js",
  "./js/gps.js",
  "./js/data.js",
  "./js/analysis.js",
  "./js/video.js",
  "./js/notifications.js",
  "./js/monitor.js",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // CSV와 외부 GitHub Release MP4는 캐시하지 않는다.
  if (url.pathname.endsWith(".csv") || url.pathname.endsWith(".mp4") || url.pathname.endsWith(".gz")) {
    return;
  }

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (!response || !response.ok) return response;
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        return response;
      });
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || new URL("./#/", self.registration.scope).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      if (clients.length) {
        const client = clients[0];
        if ("navigate" in client) await client.navigate(url);
        if ("focus" in client) await client.focus();
        return;
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })
  );
});
