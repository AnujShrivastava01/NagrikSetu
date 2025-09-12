const CACHE_NAME = 'nagriksetu-cache-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/logo.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

// Network-first for API, cache-first for others
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, websockets, and unsupported schemes
  if (request.method !== 'GET' || 
      url.protocol === 'ws:' || 
      url.protocol === 'wss:' ||
      url.protocol === 'chrome-extension:' ||
      url.protocol === 'moz-extension:' ||
      url.protocol === 'safari-extension:') {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful responses
          if (response.status === 200) {
            const respClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              try {
                cache.put(request, respClone);
              } catch (error) {
                console.warn('Failed to cache API response:', error);
              }
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request)
          .then((response) => {
            // Only cache successful responses
            if (response.status === 200) {
              const respClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                try {
                  cache.put(request, respClone);
                } catch (error) {
                  console.warn('Failed to cache response:', error);
                }
              });
            }
            return response;
          })
          .catch(() => caches.match('/index.html'))
      );
    })
  );
});
