// ══════════════════════════════════════════════════════════════
// NEON DELIVERY — Service Worker v4 (Samsung-safe PWA)
// Real HTTPS caching, dynamic PNG icon generation,
// push notifications, offline support
// ══════════════════════════════════════════════════════════════

const CACHE_VERSION = 'neon-delivery-v4';
const STATIC_CACHE = 'neon-static-v4';
const DYNAMIC_CACHE = 'neon-dynamic-v4';
const ICON_CACHE = 'neon-icons-v4';
const OFFLINE_URL = '/offline.html';
const MAX_DYNAMIC_CACHE = 100;

// Icon URLs that we generate dynamically via Canvas (OffscreenCanvas in SW)
const GENERATED_ICON_URLS = [
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/screenshot-narrow.png',
  '/icons/screenshot-wide.png',
];

const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon.svg',
];

const EXCLUDED_DOMAINS = [
  'supabase.co',
  'googleapis.com',
  'unsplash.com',
];

// ══════════════════════════════════════════════════════════════
// ICON GENERATION (OffscreenCanvas in Service Worker)
// Samsung blocks data: and blob: URLs in manifests.
// We generate real PNGs served from HTTPS /icons/*.png paths.
// ══════════════════════════════════════════════════════════════

function generateIconBlob(size, maskable) {
  try {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');

    if (maskable) {
      // Maskable icons need a safe zone (inner 80% circle)
      // Fill entire canvas with background color for safe padding
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, size, size);
    }

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, size, size);
    bg.addColorStop(0, '#00f0ff');
    bg.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = bg;

    // Rounded rect
    const r = size * 0.15;
    const margin = maskable ? size * 0.1 : 0;
    const s = size - margin * 2;
    const x0 = margin;
    const y0 = margin;
    const rr = maskable ? s * 0.2 : r;

    ctx.beginPath();
    ctx.moveTo(x0 + rr, y0);
    ctx.lineTo(x0 + s - rr, y0);
    ctx.quadraticCurveTo(x0 + s, y0, x0 + s, y0 + rr);
    ctx.lineTo(x0 + s, y0 + s - rr);
    ctx.quadraticCurveTo(x0 + s, y0 + s, x0 + s - rr, y0 + s);
    ctx.lineTo(x0 + rr, y0 + s);
    ctx.quadraticCurveTo(x0, y0 + s, x0, y0 + s - rr);
    ctx.lineTo(x0, y0 + rr);
    ctx.quadraticCurveTo(x0, y0, x0 + rr, y0);
    ctx.closePath();
    ctx.fill();

    // Neon circle
    const cx = size / 2;
    const cy = size * 0.40;
    const cr = size * 0.22;

    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = size * 0.025;
    ctx.stroke();

    // Lightning bolt
    ctx.fillStyle = '#ffffff';
    const ls = size * 0.12;
    ctx.beginPath();
    ctx.moveTo(cx - ls * 0.1, cy - ls * 0.9);
    ctx.lineTo(cx + ls * 0.5, cy - ls * 0.9);
    ctx.lineTo(cx + ls * 0.05, cy - ls * 0.05);
    ctx.lineTo(cx + ls * 0.55, cy - ls * 0.05);
    ctx.lineTo(cx - ls * 0.15, cy + ls * 1.1);
    ctx.lineTo(cx + ls * 0.2, cy + ls * 0.15);
    ctx.lineTo(cx - ls * 0.35, cy + ls * 0.15);
    ctx.closePath();
    ctx.fill();

    // "NEON" text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.13}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NEON', cx, size * 0.72);

    // "DELIVERY" text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = `600 ${size * 0.075}px sans-serif`;
    ctx.fillText('DELIVERY', cx, size * 0.84);

    return canvas.convertToBlob({ type: 'image/png' });
  } catch (e) {
    console.error('[SW] OffscreenCanvas icon generation failed:', e);
    return null;
  }
}

function generateScreenshotBlob(width, height) {
  try {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    const bg = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 2);
    bg.addColorStop(0, '#12121f');
    bg.addColorStop(1, '#0a0a0f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    const cx = width / 2;
    const cy = height * 0.38;
    const iconSize = Math.min(width, height) * 0.18;

    // Neon circle
    ctx.beginPath();
    ctx.arc(cx, cy, iconSize * 0.6, 0, Math.PI * 2);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Lightning bolt
    ctx.fillStyle = '#00f0ff';
    const s = iconSize * 0.3;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.1, cy - s * 0.9);
    ctx.lineTo(cx + s * 0.5, cy - s * 0.9);
    ctx.lineTo(cx + s * 0.05, cy - s * 0.05);
    ctx.lineTo(cx + s * 0.55, cy - s * 0.05);
    ctx.lineTo(cx - s * 0.15, cy + s * 1.1);
    ctx.lineTo(cx + s * 0.2, cy + s * 0.15);
    ctx.lineTo(cx - s * 0.35, cy + s * 0.15);
    ctx.closePath();
    ctx.fill();

    // "NEON" text
    ctx.fillStyle = '#00f0ff';
    ctx.font = `bold ${iconSize * 0.4}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NEON', cx, cy + iconSize * 0.9);

    // "DELIVERY" text
    ctx.fillStyle = '#8b5cf6';
    ctx.font = `600 ${iconSize * 0.22}px sans-serif`;
    ctx.fillText('DELIVERY', cx, cy + iconSize * 1.2);

    return canvas.convertToBlob({ type: 'image/png' });
  } catch (e) {
    console.error('[SW] Screenshot generation failed:', e);
    return null;
  }
}

// Pre-generate all icons and cache them
async function cacheGeneratedIcons() {
  try {
    const cache = await caches.open(ICON_CACHE);

    const iconConfigs = [
      { url: '/icons/icon-192.png', size: 192, maskable: false },
      { url: '/icons/icon-512.png', size: 512, maskable: false },
      { url: '/icons/icon-maskable-192.png', size: 192, maskable: true },
      { url: '/icons/icon-maskable-512.png', size: 512, maskable: true },
    ];

    for (const config of iconConfigs) {
      const existing = await cache.match(config.url);
      if (existing) continue; // Already cached

      const blob = await generateIconBlob(config.size, config.maskable);
      if (blob) {
        const response = new Response(blob, {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Content-Length': blob.size.toString(),
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Generated-By': 'NeonDelivery-SW-v4',
          },
        });
        await cache.put(new Request(config.url), response);
        console.log('[SW] Cached generated icon:', config.url, `(${blob.size} bytes)`);
      }
    }

    // Screenshots
    const screenshotConfigs = [
      { url: '/icons/screenshot-narrow.png', w: 540, h: 720 },
      { url: '/icons/screenshot-wide.png', w: 720, h: 540 },
    ];

    for (const config of screenshotConfigs) {
      const existing = await cache.match(config.url);
      if (existing) continue;

      const blob = await generateScreenshotBlob(config.w, config.h);
      if (blob) {
        const response = new Response(blob, {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Content-Length': blob.size.toString(),
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
        await cache.put(new Request(config.url), response);
        console.log('[SW] Cached screenshot:', config.url);
      }
    }

    console.log('[SW] All icons and screenshots cached successfully');
  } catch (e) {
    console.error('[SW] Failed to cache icons:', e);
  }
}

// ═══ INSTALL ═══
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v4...');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Pre-caching app shell');
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.log('[SW] Pre-cache partial fail (ok in dev):', err.message);
        });
      }),
      // Generate and cache PNG icons immediately during install
      cacheGeneratedIcons(),
    ])
  );
  self.skipWaiting();
});

// ═══ ACTIVATE ═══
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v4...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Keep current caches only
            return name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== ICON_CACHE;
          })
          .map((name) => {
            console.log('[SW] Removing old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// ═══ FETCH ═══
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Skip excluded domains
  if (EXCLUDED_DOMAINS.some(d => url.hostname.includes(d))) return;

  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') return;

  // ═══ CRITICAL: Serve generated PNG icons from cache ═══
  // These URLs are referenced in manifest.json but don't exist as real files.
  // The SW intercepts and serves canvas-generated PNGs from the icon cache.
  // This gives Samsung/Chrome real HTTPS PNG responses (no blob: or data: URLs).
  if (GENERATED_ICON_URLS.some(iconUrl => url.pathname === iconUrl)) {
    event.respondWith(
      caches.match(request, { cacheName: ICON_CACHE }).then(async (cached) => {
        if (cached) {
          console.log('[SW] Serving cached icon:', url.pathname);
          return cached;
        }

        // Icon not cached yet — generate on the fly
        console.log('[SW] Icon not cached, generating:', url.pathname);
        await cacheGeneratedIcons();
        const freshCached = await caches.match(request, { cacheName: ICON_CACHE });
        if (freshCached) return freshCached;

        // Final fallback — return the SVG icon
        const svgCached = await caches.match('/icons/icon.svg');
        if (svgCached) return svgCached;

        return new Response('', { status: 404 });
      })
    );
    return;
  }

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

  // Static assets — Cache first
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
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
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
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
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
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
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
      version: 'v4',
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

  // Force re-generate icons (e.g. after SW update)
  if (event.data?.type === 'REGENERATE_ICONS') {
    cacheGeneratedIcons().then(() => {
      event.ports?.[0]?.postMessage({ type: 'ICONS_READY', success: true });
    });
  }
});
