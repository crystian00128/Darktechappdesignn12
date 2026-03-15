import { RouterProvider } from "react-router";
import { router } from "./routes";
import { useEffect, useState, useCallback } from "react";
import { AnimatePresence } from "motion/react";
import * as api from "./services/api";
import {
  registerServiceWorker,
  generateAndCacheIcons,
  registerPeriodicSync,
  isStandalone,
  registerPushSubscription,
  getPlatform,
} from "./services/pwa";
import {
  PermissionsModal,
  OnlineStatus,
  PWAUpdateBanner,
  PWASplashScreen,
} from "./components/pwa-install-prompt";

export default function App() {
  const [showPermissions, setShowPermissions] = useState(false);
  const [showSplash, setShowSplash] = useState(() => {
    // Show splash screen only in standalone mode (installed PWA)
    return isStandalone();
  });

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  useEffect(() => {
    // ═══ INIT DATABASE ═══
    const initDB = async () => {
      try {
        console.log("Inicializando banco de dados...");
        const response = await api.initDatabase();
        console.log("Banco inicializado:", response.message);
        console.log("Login Admin: username='admin', PIN='414243'");
      } catch (error) {
        console.error("Erro ao inicializar banco:", error);
        console.log("Use o botao 'Inicializar Banco' na tela de login");
      }
    };
    initDB();

    // ═══ PWA INITIALIZATION ═══
    const initPWA = async () => {
      console.log("[PWA] Inicializando PWA v5 (Samsung-safe)...");
      const platform = getPlatform();
      console.log("[PWA] Plataforma:", platform);

      // 1. Register Service Worker FIRST — so it can intercept /icons/*.png
      // for the manifest before the browser fetches them
      const registration = await registerServiceWorker();

      if (registration) {
        console.log("[PWA] Service Worker v5 registrado");

        // Wait for SW to be controlling the page (needed for icon intercepts)
        if (!navigator.serviceWorker.controller) {
          console.log("[PWA] Waiting for SW to claim control...");
          await new Promise<void>((resolve) => {
            navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
            // Timeout after 3s in case it's already controlling
            setTimeout(resolve, 3000);
          });
        }

        // 2. Ask SW to generate and cache PNG icons
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'REGENERATE_ICONS' });
          // Give it a moment to generate
          await new Promise(r => setTimeout(r, 500));
        }
      }

      // 3. Generate favicon + apple-touch-icon + ensure static manifest link
      generateAndCacheIcons();

      // 4. Add all PWA meta tags
      addPWAMetaTags();

      if (registration) {
        // 5. Auto-register push for logged-in user with retry
        setTimeout(async () => {
          const currentUser = localStorage.getItem("currentUser");
          if (currentUser) {
            try {
              const userData = JSON.parse(currentUser);
              if (userData.username) {
                // IMPORTANT FIX: Only auto-register if permission is ALREADY granted.
                // Requesting permission without a user gesture is silently blocked by browsers!
                if ('Notification' in window && Notification.permission === 'granted') {
                  console.log("[PWA] === Auto-registering push for:", userData.username, "===");
                  const success = await registerPushSubscription(userData.username);
                  if (!success) {
                    // Retry once after 5 seconds
                    setTimeout(async () => {
                      await registerPushSubscription(userData.username);
                    }, 5000);
                  }
                } else {
                  console.log("[PWA] Push permission not granted yet. Waiting for user interaction.");
                }
              }
            } catch (e) {
              console.log("[PWA] Could not auto-register push:", e);
            }
          }
        }, 3000);

        // 6. Register periodic sync
        await registerPeriodicSync("check-notifications", 15 * 60 * 1000);

        // 7. Pre-cache app routes via SW
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CACHE_URLS',
            urls: ['/', '/manifest.json', '/icons/icon.svg', '/cliente', '/vendedor', '/admin', '/motorista'],
          });
        }
      } else {
        console.log("[PWA] Service Worker nao registrado — push nao disponivel");
      }

      // 8. Show permissions modal on first visit
      const permAsked = localStorage.getItem("pwa-permissions-asked");
      if (!permAsked) {
        setTimeout(() => {
          setShowPermissions(true);
          localStorage.setItem("pwa-permissions-asked", "true");
        }, 5000);
      }

      // 9. Log standalone mode
      if (isStandalone()) {
        console.log("[PWA] Rodando em modo standalone/fullscreen (PWA instalado!)");
        document.documentElement.classList.add("pwa-standalone");

        // Request Fullscreen API for maximum immersion (hides navigation bar)
        // Only if display-mode is fullscreen but system hasn't auto-applied it
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          // Attempt fullscreen — some browsers allow it in standalone PWA context
          document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => {
            console.log("[PWA] Fullscreen API not auto-grantable — browser will handle via manifest");
          });
        }
      }
    };

    initPWA();
  }, []);

  return (
    <>
      {/* Splash Screen (only for installed PWA) */}
      <AnimatePresence>
        {showSplash && <PWASplashScreen onFinish={handleSplashFinish} />}
      </AnimatePresence>

      {/* Main App Router */}
      <RouterProvider router={router} />

      {/* PWA Components */}
      <OnlineStatus />
      <PWAUpdateBanner />
      <PermissionsModal
        open={showPermissions}
        onClose={() => setShowPermissions(false)}
      />
    </>
  );
}

// ═══ ADD PWA META TAGS ═══
function addPWAMetaTags() {
  const head = document.head;

  const setMeta = (name: string, content: string, property?: boolean) => {
    const attr = property ? "property" : "name";
    let tag = head.querySelector(`meta[${attr}="${name}"]`);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(attr, name);
      head.appendChild(tag);
    }
    tag.setAttribute("content", content);
  };

  // Viewport — fullscreen, safe area support
  const viewport = head.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute(
      "content",
      "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
    );
  }

  // Core PWA meta tags
  setMeta("theme-color", "#050508");
  setMeta("mobile-web-app-capable", "yes");
  setMeta("application-name", "NeonDelivery");
  setMeta("msapplication-TileColor", "#050508");
  setMeta("msapplication-navbutton-color", "#050508");
  setMeta("format-detection", "telephone=no");

  // iOS-specific meta tags
  setMeta("apple-mobile-web-app-capable", "yes");
  setMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
  setMeta("apple-mobile-web-app-title", "NeonDelivery");
  setMeta("apple-touch-fullscreen", "yes");

  // Open Graph (for when sharing the URL)
  setMeta("og:title", "NeonDelivery - Delivery Futurista", true);
  setMeta("og:description", "Sistema completo de delivery com design neon", true);
  setMeta("og:type", "website", true);

  // NOTE: Manifest and icon links are handled by generateAndCacheIcons()
  // Do NOT create a duplicate manifest here — it would overwrite the
  // dynamic manifest with PNG icons that Chrome Android requires.

  // Theme color for iOS status bar (dark mode variant)
  let themeColorDark = head.querySelector('meta[name="theme-color"][media]');
  if (!themeColorDark) {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("media", "(prefers-color-scheme: dark)");
    meta.setAttribute("content", "#050508");
    head.appendChild(meta);
  }
}