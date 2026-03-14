// ══════════════════════════════════════════════════════════════
// NEON DELIVERY — PWA Service v4 (FIXED: Install, Push, Manifest)
// FIXES: Chrome install prompt, push registration, SW probe,
//        Samsung Internet support, dynamic→static manifest
// ══════════════════════════════════════════════════════════════

import { projectId, publicAnonKey } from "/utils/supabase/info";

// ═══ SERVICE WORKER REGISTRATION ═══
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service Worker not supported');
    return null;
  }

  try {
    // FIXED: Removed overly strict content-type check that blocked SW registration
    // In some hosting environments, sw.js may be served with wrong content-type header
    // but still work perfectly fine. Let the browser handle validation.
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[PWA] Service Worker registered:', registration.scope);

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            console.log('[PWA] New Service Worker activated');
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.log('[PWA] Service Worker registration failed:', error);
    return null;
  }
}

// ═══ INSTALL PROMPT (FIXED: unified deferredPrompt) ═══
// CRITICAL FIX: Use window.__pwaInstallPrompt as THE SINGLE source of truth
// Both setupInstallPrompt() and PWAInstallBanner use this same reference

export function captureInstallPrompt() {
  // Register ASAP — BEFORE any component mounts
  // This ensures we never miss the beforeinstallprompt event
  if ((window as any).__pwaListenerAdded) return;
  (window as any).__pwaListenerAdded = true;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    (window as any).__pwaInstallPrompt = e;
    console.log('[PWA] ✅ beforeinstallprompt captured and stored globally');

    // Notify all callbacks
    const cbs = (window as any).__pwaInstallCallbacks || [];
    cbs.forEach((cb: (v: boolean) => void) => cb(true));
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] ✅ App installed successfully!');
    (window as any).__pwaInstallPrompt = null;
    localStorage.setItem('pwa-installed', 'true');
    localStorage.setItem('pwa-installed-at', Date.now().toString());

    const cbs = (window as any).__pwaInstallCallbacks || [];
    cbs.forEach((cb: (v: boolean) => void) => cb(false));
  });
}

// Call immediately on module load — earliest possible moment
captureInstallPrompt();

export function setupInstallPrompt(callback: (canInstall: boolean) => void) {
  if (!(window as any).__pwaInstallCallbacks) {
    (window as any).__pwaInstallCallbacks = [];
  }
  (window as any).__pwaInstallCallbacks.push(callback);

  // If prompt was already captured before this callback was added
  if ((window as any).__pwaInstallPrompt) {
    callback(true);
  }
}

export function onInstallChange(callback: (canInstall: boolean) => void) {
  setupInstallPrompt(callback);
}

export async function promptInstall(): Promise<boolean> {
  // FIXED: Use the global window reference that is SET by the global listener
  const prompt = (window as any).__pwaInstallPrompt;
  if (!prompt) {
    console.log('[PWA] ❌ No install prompt available (beforeinstallprompt never fired)');
    console.log('[PWA] This can mean: manifest issue, no SW, or browser doesn\'t support it');
    return false;
  }

  try {
    console.log('[PWA] Triggering install prompt...');
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    console.log('[PWA] Install outcome:', outcome);
    (window as any).__pwaInstallPrompt = null;
    return outcome === 'accepted';
  } catch (error) {
    console.error('[PWA] Install prompt error:', error);
    return false;
  }
}

export function canPromptInstall(): boolean {
  return !!(window as any).__pwaInstallPrompt;
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function isInstalled(): boolean {
  return isStandalone() || localStorage.getItem('pwa-installed') === 'true';
}

// ═══ PLATFORM DETECTION ═══
export function getPlatform(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/Android/.test(ua)) {
    return 'android';
  }
  return 'desktop';
}

export function getBrowser(): 'chrome' | 'safari' | 'firefox' | 'edge' | 'samsung' | 'other' {
  const ua = navigator.userAgent || '';
  if (/SamsungBrowser/.test(ua)) return 'samsung';
  if (/Edg\//.test(ua)) return 'edge';
  if (/Chrome/.test(ua) && !/Edg/.test(ua) && !/SamsungBrowser/.test(ua)) return 'chrome';
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'safari';
  if (/Firefox/.test(ua)) return 'firefox';
  return 'other';
}

export function canAutoPrompt(): boolean {
  const browser = getBrowser();
  // These browsers support beforeinstallprompt
  return ['chrome', 'edge', 'samsung'].includes(browser);
}

// ═══ PUSH TOGGLE PREFERENCE (localStorage) ═══
const PUSH_ENABLED_KEY = "push_notifications_enabled";

/**
 * Check if the user has push notifications enabled via the in-app toggle.
 * Returns true if never explicitly disabled (default on).
 */
export function isPushEnabledForUser(username: string): boolean {
  try {
    const stored = localStorage.getItem(`${PUSH_ENABLED_KEY}_${username}`);
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
}

/**
 * Set the push toggle preference in localStorage.
 */
export function setPushEnabledForUser(username: string, enabled: boolean): void {
  try {
    localStorage.setItem(`${PUSH_ENABLED_KEY}_${username}`, String(enabled));
  } catch {}
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('[PWA] Notifications not supported in this browser');
    return 'denied';
  }

  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') {
    console.log('[PWA] Notifications were previously denied by user');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[PWA] Notification permission result:', permission);
    return permission;
  } catch (e) {
    console.error('[PWA] Error requesting notification permission:', e);
    return 'denied';
  }
}

async function getServerVapidKey(): Promise<string | null> {
  try {
    console.log('[PWA] Fetching VAPID key from server...');
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-42377006/push/vapid-key`,
      {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!res.ok) {
      console.error('[PWA] VAPID key request failed:', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    if (data.success && data.publicKey) {
      console.log('[PWA] ✅ VAPID key received:', data.publicKey.substring(0, 20) + '...');
      return data.publicKey;
    }
    console.error('[PWA] VAPID key response missing publicKey:', data);
    return null;
  } catch (e) {
    console.error('[PWA] Failed to get VAPID key from server:', e);
    return null;
  }
}

export async function subscribeToPush(registration: ServiceWorkerRegistration): Promise<PushSubscription | null> {
  if (!('PushManager' in window)) {
    console.log('[PWA] PushManager not supported in this browser');
    return null;
  }

  try {
    // Check for existing subscription first
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      console.log('[PWA] ✅ Existing push subscription found');
      return subscription;
    }

    const vapidKey = await getServerVapidKey();
    if (!vapidKey) {
      console.error('[PWA] ❌ Cannot subscribe to push — no VAPID key');
      return null;
    }

    console.log('[PWA] Creating new push subscription...');
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    console.log('[PWA] ✅ Push subscription created successfully');
    console.log('[PWA] Endpoint:', subscription.endpoint.substring(0, 60) + '...');
    return subscription;
  } catch (error: any) {
    console.error('[PWA] ❌ Push subscription failed:', error.message || error);
    if (error.message?.includes('permission')) {
      console.log('[PWA] Hint: User needs to grant notification permission first');
    }
    return null;
  }
}

export async function registerPushSubscription(username: string): Promise<boolean> {
  console.log(`[PWA] === Starting push registration for: ${username} ===`);

  try {
    // Step 0: Check user's in-app push toggle preference
    if (!isPushEnabledForUser(username)) {
      console.log('[PWA] Push skipped: User has push notifications disabled via in-app toggle.');
      return false;
    }

    // Step 1: Check browser support
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Push skipped: ServiceWorker not supported');
      return false;
    }
    if (!('PushManager' in window)) {
      console.warn('[PWA] Push skipped: PushManager not supported');
      return false;
    }
    console.log('[PWA] ✅ Step 1: Browser supports SW + Push');

    // Step 2: Check notification permission
    // If permission is "denied", the browser blocks re-requesting.
    // User must manually re-enable in browser/OS settings.
    if (!('Notification' in window)) {
      console.warn('[PWA] Push skipped: Notification API not available');
      return false;
    }

    const currentPermission = Notification.permission;
    if (currentPermission === 'denied') {
      // Silently skip — the PushToggle UI already shows "permission blocked" state
      console.log('[PWA] Push skipped: Notification permission is "denied". User can re-enable in browser settings.');
      return false;
    }

    if (currentPermission !== 'granted') {
      // Only request if still in "default" (prompt) state
      const permission = await requestNotificationPermission();
      if (permission !== 'granted') {
        console.log(`[PWA] Push skipped: Notification permission not granted ("${permission}").`);
        return false;
      }
    }
    console.log('[PWA] ✅ Step 2: Notification permission granted');

    // Step 3: Wait for SW to be ready (with timeout)
    console.log('[PWA] Step 3: Waiting for Service Worker to be ready...');
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
    ]) as ServiceWorkerRegistration | null;

    if (!registration) {
      console.error('[PWA] ❌ Step 3 FAIL: Service Worker not ready after 10s');
      // Try to register it now
      console.log('[PWA] Attempting emergency SW registration...');
      const emergencyReg = await registerServiceWorker();
      if (!emergencyReg) {
        console.error('[PWA] ❌ Emergency SW registration also failed');
        return false;
      }
      console.log('[PWA] ✅ Emergency SW registered, waiting for it to activate...');
      await new Promise(r => setTimeout(r, 2000));
    }

    const finalReg = registration || await navigator.serviceWorker.ready;
    console.log('[PWA] ✅ Step 3: Service Worker ready');

    // Step 4: Subscribe to push
    const subscription = await subscribeToPush(finalReg);
    if (!subscription) {
      console.error('[PWA] ❌ Step 4 FAIL: Could not create push subscription');
      return false;
    }
    console.log('[PWA] ✅ Step 4: Push subscription obtained');

    // Step 5: Send subscription to server
    console.log('[PWA] Step 5: Sending subscription to server...');
    const subJSON = subscription.toJSON();
    console.log('[PWA] Subscription JSON keys:', Object.keys(subJSON));

    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-42377006/push/subscribe`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, subscription: subJSON }),
      }
    );

    const data = await res.json();
    console.log('[PWA] Server response:', data);

    if (data.success) {
      console.log(`[PWA] ✅✅✅ Push FULLY registered for ${username} (${data.deviceCount} devices)`);
      localStorage.setItem('push-registered-user', username);
      localStorage.setItem('push-registered-at', Date.now().toString());
      return true;
    }

    console.error('[PWA] ❌ Step 5 FAIL: Server rejected subscription:', data.error);
    return false;
  } catch (error) {
    console.error('[PWA] ❌ CRITICAL Error registering push:', error);
    return false;
  }
}

export async function unregisterPushSubscription(username: string): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-42377006/push/unsubscribe`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, endpoint: subscription.endpoint }),
        }
      );
    }
    localStorage.removeItem('push-registered-user');
  } catch (e) {
    console.error('[PWA] Error unregistering push:', e);
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ═══ LOCAL NOTIFICATIONS ═══
export async function showLocalNotification(
  title: string,
  body: string,
  url?: string,
  tag?: string
) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      title,
      body,
      url,
      tag,
    });
    return;
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      tag: tag || 'neon-' + Date.now(),
      vibrate: [200, 100, 200],
      silent: false,
    } as any);
  }
}

// ═══ DEVICE PERMISSIONS ═══
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch { return false; }
}

export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch { return false; }
}

export async function requestLocationPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) { resolve(false); return; }
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { timeout: 10000 }
    );
  });
}

export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported';

export async function checkPermissions(): Promise<{
  camera: PermissionStatus;
  microphone: PermissionStatus;
  location: PermissionStatus;
  notifications: PermissionStatus;
}> {
  const result = {
    camera: 'prompt' as PermissionStatus,
    microphone: 'prompt' as PermissionStatus,
    location: 'prompt' as PermissionStatus,
    notifications: 'prompt' as PermissionStatus,
  };

  try {
    if ('permissions' in navigator) {
      const [cam, mic, geo] = await Promise.allSettled([
        navigator.permissions.query({ name: 'camera' as PermissionName }),
        navigator.permissions.query({ name: 'microphone' as PermissionName }),
        navigator.permissions.query({ name: 'geolocation' as PermissionName }),
      ]);
      if (cam.status === 'fulfilled') result.camera = cam.value.state as PermissionStatus;
      if (mic.status === 'fulfilled') result.microphone = mic.value.state as PermissionStatus;
      if (geo.status === 'fulfilled') result.location = geo.value.state as PermissionStatus;
    }
  } catch {}

  if ('Notification' in window) {
    result.notifications = Notification.permission as PermissionStatus;
  } else {
    result.notifications = 'unsupported';
  }

  return result;
}

// ═══ BACKGROUND SYNC ═══
export async function registerBackgroundSync(tag: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await (registration as any).sync.register(tag);
      return true;
    }
  } catch {}
  return false;
}

export async function registerPeriodicSync(tag: string, minInterval: number): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    if ('periodicSync' in registration) {
      const status = await navigator.permissions.query({
        name: 'periodic-background-sync' as PermissionName,
      });
      if (status.state === 'granted') {
        await (registration as any).periodicSync.register(tag, { minInterval });
        return true;
      }
    }
  } catch {}
  return false;
}

// ═══ WAKE LOCK ═══
let wakeLock: any = null;

export async function requestWakeLock(): Promise<boolean> {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await (navigator as any).wakeLock.request('screen');
      wakeLock.addEventListener('release', () => console.log('[PWA] Wake lock released'));
      return true;
    }
  } catch {}
  return false;
}

// ═══ GENERATE PWA ICONS (Canvas-based PNG) ═══
export function generateIcon(size: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#00f0ff');
  bg.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = bg;

  // Rounded rect
  const r = size * 0.15;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // Outer glow circle
  const cx = size / 2;
  const cy = size * 0.40;
  const cr = size * 0.28;

  ctx.beginPath();
  ctx.arc(cx, cy, cr + 4, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
  ctx.lineWidth = size * 0.02;
  ctx.stroke();

  // Main neon circle
  ctx.beginPath();
  ctx.arc(cx, cy, cr, 0, Math.PI * 2);
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = size * 0.025;
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = size * 0.08;
  ctx.stroke();

  // Lightning bolt
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = size * 0.06;
  const s = size * 0.13;
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

  // Reset shadow
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // "NEON" text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.13}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NEON', cx, size * 0.76);

  // "DELIVERY" text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = `600 ${size * 0.075}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillText('DELIVERY', cx, size * 0.88);

  // Corner accents
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = size * 0.005;
  ctx.globalAlpha = 0.4;
  const m = size * 0.08;
  const al = size * 0.06;

  ctx.beginPath();
  ctx.moveTo(m, m + al); ctx.lineTo(m, m); ctx.lineTo(m + al, m);
  ctx.stroke();
  ctx.strokeStyle = '#8b5cf6';
  ctx.beginPath();
  ctx.moveTo(size - m - al, m); ctx.lineTo(size - m, m); ctx.lineTo(size - m, m + al);
  ctx.stroke();
  ctx.strokeStyle = '#8b5cf6';
  ctx.beginPath();
  ctx.moveTo(m, size - m - al); ctx.lineTo(m, size - m); ctx.lineTo(m + al, size - m);
  ctx.stroke();
  ctx.strokeStyle = '#00f0ff';
  ctx.beginPath();
  ctx.moveTo(size - m, size - m - al); ctx.lineTo(size - m, size - m); ctx.lineTo(size - m - al, size - m);
  ctx.stroke();

  ctx.globalAlpha = 1;

  return canvas.toDataURL('image/png');
}

// Generate splash screen for iOS
export function generateSplashScreen(width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Background
  const bg = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 2);
  bg.addColorStop(0, '#12121f');
  bg.addColorStop(1, '#0a0a0f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Grid pattern
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }

  const cx = width / 2;
  const cy = height * 0.4;
  const iconSize = Math.min(width, height) * 0.2;

  // Outer ring glow
  ctx.beginPath();
  ctx.arc(cx, cy, iconSize * 0.7, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Main neon circle
  ctx.beginPath();
  ctx.arc(cx, cy, iconSize * 0.6, 0, Math.PI * 2);
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 30;
  ctx.stroke();

  // Lightning bolt
  ctx.fillStyle = '#00f0ff';
  ctx.shadowBlur = 20;
  const s = iconSize * 0.35;
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

  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // "NEON" text
  ctx.fillStyle = '#00f0ff';
  ctx.font = `bold ${iconSize * 0.45}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NEON', cx, cy + iconSize * 0.95);

  // "DELIVERY" text
  ctx.fillStyle = '#8b5cf6';
  ctx.font = `600 ${iconSize * 0.25}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillText('DELIVERY', cx, cy + iconSize * 1.3);

  // Loading bar
  const barW = width * 0.4;
  const barH = 4;
  const barY = cy + iconSize * 1.7;
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath();
  ctx.roundRect(cx - barW / 2, barY, barW, barH, 2);
  ctx.fill();

  const gradient = ctx.createLinearGradient(cx - barW / 2, 0, cx + barW / 2, 0);
  gradient.addColorStop(0, '#00f0ff');
  gradient.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(cx - barW / 2, barY, barW * 0.6, barH, 2);
  ctx.fill();

  // "Carregando..." text
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = `400 ${iconSize * 0.12}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.fillText('Carregando...', cx, barY + 24);

  return canvas.toDataURL('image/png');
}

// ═══ SETUP ICONS AND META (Samsung-safe: static manifest + SW-served PNGs) ═══
// FIXED: We NO LONGER create blob: URL manifests or data: URL icons in the manifest.
// Samsung Knox/One UI Security blocks blob: and data: origins as "unknown sources".
// Instead: manifest.json is static, and the Service Worker intercepts /icons/*.png
// requests and serves OffscreenCanvas-generated PNGs from cache.
// This function only handles favicon + apple-touch-icon (head tags, not manifest).

export function generateAndCacheIcons() {
  // Favicon
  const faviconUrl = generateIcon(32);
  let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (favicon) {
    favicon.href = faviconUrl;
  } else {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/png';
    favicon.href = faviconUrl;
    document.head.appendChild(favicon);
  }

  // Apple touch icon (180x180 is the recommended size)
  const appleTouchUrl = generateIcon(180);
  let appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (appleIcon) {
    appleIcon.href = appleTouchUrl;
  } else {
    appleIcon = document.createElement('link');
    appleIcon.rel = 'apple-touch-icon';
    appleIcon.href = appleTouchUrl;
    document.head.appendChild(appleIcon);
  }

  // Additional Apple touch icon sizes
  [152, 167, 180].forEach((size) => {
    const existing = document.querySelector<HTMLLinkElement>(`link[rel="apple-touch-icon"][sizes="${size}x${size}"]`);
    if (!existing) {
      const link = document.createElement('link');
      link.rel = 'apple-touch-icon';
      link.setAttribute('sizes', `${size}x${size}`);
      link.href = generateIcon(size);
      document.head.appendChild(link);
    }
  });

  // ═══ ENSURE STATIC MANIFEST LINK EXISTS (no blob: URLs!) ═══
  let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (manifestLink) {
    // If it was previously a blob URL, revert to static
    if (manifestLink.href.startsWith('blob:')) {
      URL.revokeObjectURL(manifestLink.href);
      manifestLink.href = '/manifest.json';
      console.log('[PWA] Reverted blob manifest to static /manifest.json');
    }
  } else {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = '/manifest.json';
    document.head.appendChild(manifestLink);
  }

  console.log('[PWA] ✅ Icons configured (favicon + apple-touch-icon). Manifest: static /manifest.json');
  console.log('[PWA] PNG icons for manifest are served by Service Worker from cache');

  // Ask SW to ensure icons are generated and cached
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'REGENERATE_ICONS' });
  }

  // iOS Splash screens
  if (getPlatform() === 'ios') {
    const splashConfigs = [
      { w: 1170, h: 2532, media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)' },
      { w: 1284, h: 2778, media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)' },
      { w: 1179, h: 2556, media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)' },
      { w: 1290, h: 2796, media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)' },
      { w: 750, h: 1334, media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)' },
      { w: 1125, h: 2436, media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)' },
      { w: 828, h: 1792, media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)' },
      { w: 1242, h: 2688, media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)' },
      { w: 1668, h: 2388, media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)' },
      { w: 2048, h: 2732, media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)' },
    ];

    const dpr = window.devicePixelRatio || 1;
    const screenW = Math.round(window.screen.width * dpr);
    const screenH = Math.round(window.screen.height * dpr);

    const matchingConfig = splashConfigs.find(
      (c) => (c.w === screenW && c.h === screenH) || (c.w === screenH && c.h === screenW)
    );

    if (matchingConfig) {
      const splashUrl = generateSplashScreen(matchingConfig.w, matchingConfig.h);
      const link = document.createElement('link');
      link.rel = 'apple-touch-startup-image';
      link.href = splashUrl;
      link.setAttribute('media', matchingConfig.media);
      document.head.appendChild(link);
      console.log('[PWA] iOS splash screen generated for', matchingConfig.w, 'x', matchingConfig.h);
    } else {
      const splashUrl = generateSplashScreen(screenW || 1170, screenH || 2532);
      const link = document.createElement('link');
      link.rel = 'apple-touch-startup-image';
      link.href = splashUrl;
      document.head.appendChild(link);
      console.log('[PWA] iOS fallback splash screen generated');
    }
  }

  console.log('[PWA] Icons and meta tags configured (manifest left as static)');
}