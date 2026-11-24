/**
 * CANCHAPLUS — SERVICE WORKER PWA (v2.0.0)
 * Gestión de Caché de Recursos Estáticos y Funcionamiento Sin Conexión
 */

const CACHE_NAME = 'canchaplus-shell-v3';

const APP_SHELL = [
  './',
  './index.html',
  './json/manifest.json',
  './css/styles.css',
  './js/app.js',
  './vendor/jquery-3.7.1.min.js',
  './vendor/purify.min.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/images/court-futbol.svg',
  './assets/images/court-futbol2.svg',
  './assets/images/court-wally.svg',
  './assets/images/court-wally2.svg',
  './assets/images/court-voley.svg',
  './assets/images/hero-stadium.svg'
];

// Instalación: Precargar shell de la aplicación
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        APP_SHELL.map(async (url) => {
          try {
            const response = await fetch(new Request(url, { cache: 'reload' }));
            if (response.ok) {
              await cache.put(url, response);
            }
          } catch (err) {
            console.warn(`[SW] No se pudo precachear: ${url}`);
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

// Activación: Limpieza de cachés anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('canchaplus-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Intercepción de peticiones (Fetch)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Las peticiones al backend API (/api/*) van directas a la red (Network Only / No caching de reservas privadas)
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(req).catch(() => {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'Modo sin conexión: El servidor backend no está disponible en este momento.'
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // Navegación (HTML de inicio)
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          if (fresh.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(req, fresh.clone());
          }
          return fresh;
        } catch {
          const cached = await caches.match(req);
          return cached || (await caches.match('./index.html'));
        }
      })()
    );
    return;
  }

  // Recursos estáticos (Cache First con actualización en segundo plano)
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      try {
        const response = await fetch(req);
        if (response.ok && url.origin === self.location.origin) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, response.clone());
        }
        return response;
      } catch (err) {
        return Response.error();
      }
    })()
  );
});
