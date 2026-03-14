// ══════════════════════════════════════════════════════════════
// NEON DELIVERY — Service Worker v3 (Full PWA)
// Aggressive caching, offline support, push notifications,
// background sync — works like a native app
// ══════════════════════════════════════════════════════════════

const CACHE_VERSION = 'neon-delivery-v3';
const STATIC_CACHE = 'neon-static-v3';
const DYNAMIC_CACHE = 'neon-dynamic-v3';
const OFFLINE_URL = '/offline.html';
const MAX_DYNAMIC_CACHE = 100;

// Critical assets that MUST be cached for app shell
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon.svg',
];

// Domains to NEVER cache
const EXCLUDED_DOMAINS = [
  'supabase.co',
  'googleapis.com',
  'unsplash.com',
];

// ═══ INSTALL ═══
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v3...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.log('[SW] Pre-cache partial fail (ok in dev):', err.message);
      });
    })
  );
  self.skipWaiting();
});

// ═══ ACTIVATE ═══
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v3...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('[SW] Removing old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// ═══ FETCH — Stale-While-Revalidate + Network-First for API ═══
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Skip excluded domains
  if (EXCLUDED_DOMAINS.some(d => url.hostname.includes(d))) return;

  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') return;

  // Navigation requests — Network first, then cache, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offlinePage = await caches.match(OFFLINE_URL);
          if (offlinePage) return offlinePage;
          return new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts) — Cache first, network fallback
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Revalidate in background
          fetch(request).then((response) => {
            if (response.status === 200) {
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, response));
            }
          }).catch(() => {});
          return cached;
        }
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 408 }));
      })
    );
    return;
  }

  // Everything else — Network first with dynamic cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, clone);
            trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        return cached || new Response('Offline', { status: 503 });
      })
  );
});

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|webp|avif)(\?.*)?$/.test(pathname) ||
    pathname.startsWith('/assets/');
}

async function trimCache(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxSize) {
    await cache.delete(keys[0]);
    trimCache(cacheName, maxSize);
  }
}

// ══════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ══════════════════════════════════════════════════════════════
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received!');

  let data = {
    title: 'NeonDelivery',
    body: 'Nova notificacao!',
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
    tag: 'neon-notification',
    vibrate: [200, 100, 200, 100, 200],
    data: { url: '/' },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon.svg',
    badge: data.badge || '/icons/icon.svg',
    tag: data.tag || 'neon-notification',
    vibrate: data.vibrate || [200, 100, 200, 100, 200],
    data: data.data || { url: '/' },
    actions: data.actions || [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' },
    ],
    requireInteraction: true,
    renotify: true,
    silent: false,
    timestamp: Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => console.log('[SW] Notification displayed:', data.title))
      .catch((err) => console.error('[SW] Failed to show notification:', err))
  );
});

// ═══ NOTIFICATION CLICK ═══
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'close') return;

  const notifData = event.notification.data || {};
  const urlToOpen = notifData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.postMessage({ type: 'NOTIFICATION_CLICKED', data: notifData });
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        return self.clients.openWindow(urlToOpen);
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification dismissed:', event.notification.tag);
});

// ═══ BACKGROUND SYNC ═══
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-messages') event.waitUntil(syncMessages());
  if (event.tag === 'sync-status') event.waitUntil(syncStatus());
});

async function syncMessages() { console.log('[SW] Syncing pending messages...'); }
async function syncStatus() { console.log('[SW] Syncing user status...'); }

self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);
  if (event.tag === 'check-notifications') event.waitUntil(checkForNotifications());
});

async function checkForNotifications() { console.log('[SW] Periodic check...'); }

// ═══ MESSAGE FROM CLIENT ═══
self.addEventListener('message', (event) => {
  console.log('[SW] Message from client:', event.data?.type);

  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, url, tag } = event.data;
    self.registration.showNotification(title || 'NeonDelivery', {
      body: body || 'Nova notificacao',
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      tag: tag || 'neon-msg-' + Date.now(),
      vibrate: [200, 100, 200],
      data: { url: url || '/' },
      requireInteraction: true,
      renotify: true,
      silent: false,
      timestamp: Date.now(),
    });
  }

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'GET_STATUS') {
    event.ports?.[0]?.postMessage({
      type: 'SW_STATUS',
      active: true,
      version: 'v3',
      pushSupported: 'PushManager' in self,
    });
  }

  // Cache specific URLs on demand
  if (event.data?.type === 'CACHE_URLS') {
    const urls = event.data.urls || [];
    caches.open(STATIC_CACHE).then((cache) => {
      urls.forEach((url) => {
        cache.add(url).catch(() => {});
      });
    });
  }
});
