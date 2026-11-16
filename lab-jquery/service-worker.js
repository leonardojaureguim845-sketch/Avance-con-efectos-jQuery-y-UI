const CACHE_NAME = "deporzone-arena-v4";
const APP_SHELL = [
  "./",
  "./index.html",
  "./mobile.html",
  "./styles.css",
  "./script.js",
  "./lazy-loader.js",
  "./components/booking-view.js",
  "./pwa.js",
  "./manifest.json",
  "./mobile-manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("deporzone-") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (request.mode === "navigate") {
      event.respondWith(
        fetch(request).then(response => {
          if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
          return response;
        }).catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match(url.pathname.endsWith("/mobile.html") ? "./mobile.html" : "./index.html");
        })
      );
      return;
    }
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        return response;
      }))
    );
    return;
  }

  // Cache-first para jQuery/CDN y recursos externos después de su primera carga online.
  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok || response.type === "opaque") cache.put(request, response.clone());
        return response;
      } catch {
        return Response.error();
      }
    })
  );
});
