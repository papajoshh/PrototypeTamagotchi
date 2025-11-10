// Tamagotchi Service Worker
// Versión del cache (cambiar para forzar actualización)
const CACHE_VERSION = 'tamagotchi-v2'; // Incrementado para notificaciones
const CACHE_NAME = `${CACHE_VERSION}`;

// Recursos para cachear en la instalación
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Instalación: Cachear assets principales
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Service worker installed');
        // Forzar activación inmediata
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activación: Limpiar caches antiguos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        // Tomar control de todas las páginas inmediatamente
        return self.clients.claim();
      })
  );
});

// Fetch: Estrategia de cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests externos (APIs, CDNs, etc.)
  if (url.origin !== location.origin) {
    return;
  }

  // Estrategia: Cache First con Network Fallback
  // Intenta servir desde cache, si falla va a la red
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', url.pathname);
          return cachedResponse;
        }

        // No está en cache, ir a la red
        console.log('[SW] Fetching from network:', url.pathname);
        return fetch(request)
          .then((networkResponse) => {
            // Si es una respuesta válida, cachearla para el futuro
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  // Cachear assets (imágenes, JS, CSS)
                  if (shouldCache(url.pathname)) {
                    console.log('[SW] Caching new resource:', url.pathname);
                    cache.put(request, responseToCache);
                  }
                });
            }

            return networkResponse;
          })
          .catch((error) => {
            console.error('[SW] Fetch failed:', error);

            // Si falla la red y no hay cache, mostrar página offline
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }

            throw error;
          });
      })
  );
});

// Determinar si un recurso debe ser cacheado
function shouldCache(pathname) {
  // Cachear assets estáticos
  const extensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2'];
  return extensions.some(ext => pathname.endsWith(ext)) || pathname === '/' || pathname.endsWith('.html');
}

// Mensajes desde la app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting...');
    self.skipWaiting();
  }
});

// ============ NOTIFICACIONES ============
// Event listener para cuando se hace click en una notificación
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);

  event.notification.close();

  // Abrir o enfocar la app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if ('focus' in client) {
            return client.focus();
          }
        }
        // Si no, abrir nueva ventana
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Event listener para cuando se cierra una notificación
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

console.log('[SW] Service Worker loaded');
