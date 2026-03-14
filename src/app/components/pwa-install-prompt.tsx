// ══════════════════════════════════════════════════════════════
// NEON DELIVERY — PWA Install Prompt v3
// Aggressive install banner, iOS manual instructions,
// full-screen splash, permissions manager, online/offline
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Download,
  X,
  Bell,
  Camera,
  Mic,
  MapPin,
  Shield,
  CheckCircle2,
  Smartphone,
  Zap,
  WifiOff,
  Share,
  Plus,
  ArrowDown,
  Sparkles,
  ChevronRight,
  ExternalLink,
  MonitorSmartphone,
} from "lucide-react";
import {
  promptInstall,
  isStandalone,
  isInstalled,
  canPromptInstall,
  getPlatform,
  getBrowser,
  canAutoPrompt,
  requestNotificationPermission,
  requestCameraPermission,
  requestMicrophonePermission,
  requestLocationPermission,
  checkPermissions,
  type PermissionStatus,
} from "../services/pwa";

// ═══ MAIN INSTALL BANNER — Shows for both Android/Chrome and iOS ═══
export function PWAInstallBanner() {
  const [canInstall, setCanInstall] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showFullBanner, setShowFullBanner] = useState(false);
  const platform = getPlatform();
  const browser = getBrowser();

  useEffect(() => {
    if (isStandalone() || isInstalled()) {
      setInstalled(true);
      return;
    }

    // Check dismissal (show again after 4 hours)
    const dismissedAt = localStorage.getItem("pwa-install-dismissed");
    if (dismissedAt) {
      const hours = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60);
      if (hours < 4) {
        setDismissed(true);
        return;
      }
      localStorage.removeItem("pwa-install-dismissed");
    }

    // FIXED: Use the centralized install callback system from pwa.ts
    // The listener is already registered at module load time (captureInstallPrompt)
    import("../services/pwa").then(({ onInstallChange: oic }) => {
      oic((canInstallNow: boolean) => {
        if (canInstallNow) {
          setCanInstall(true);
        } else {
          setInstalled(true);
          setCanInstall(false);
        }
      });
    });

    // If beforeinstallprompt was already captured before this component mounted
    if (canPromptInstall()) {
      setCanInstall(true);
    }

    // For iOS/Safari — always show manual install guide
    if (platform === "ios") {
      setTimeout(() => {
        if (!isStandalone()) {
          setCanInstall(true);
        }
      }, 2000);
    }

    // FIXED: For ALL browsers that support beforeinstallprompt (Chrome, Edge, Samsung),
    // also show a fallback banner after 5s if the event hasn't fired yet.
    // This handles Samsung Internet and cases where manifest takes time to load.
    if (canAutoPrompt()) {
      setTimeout(() => {
        if (!canPromptInstall() && !isStandalone()) {
          console.log("[PWA] beforeinstallprompt not fired after 5s, showing fallback banner");
          setCanInstall(true);
        }
      }, 5000);
    }

    // For browsers that DON'T support beforeinstallprompt at all (Firefox, etc)
    if (!canAutoPrompt() && platform !== "ios") {
      setTimeout(() => {
        if (!isStandalone()) {
          setCanInstall(true);
        }
      }, 2000);
    }

    // Show expanded banner after a delay
    setTimeout(() => setShowFullBanner(true), 1500);
  }, []);

  const handleInstall = async () => {
    // FIXED: For iOS, always show the iOS guide
    if (platform === "ios") {
      setShowIOSGuide(true);
      return;
    }

    // FIXED: If beforeinstallprompt was captured, use it directly without React state delays
    // Chrome strictly requires prompt.prompt() to be called immediately in the click handler
    if (canPromptInstall()) {
      const accepted = await promptInstall();
      if (accepted) {
        setInstalled(true);
      }
      return;
    }

    // FIXED: If prompt not available (Samsung Internet, Edge fallback),
    // show manual install guide instead of doing nothing
    console.log("[PWA] No native prompt available, showing manual guide");
    setShowIOSGuide(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  if (installed || dismissed || !canInstall) return null;

  return (
    <>
      <AnimatePresence>
        {showFullBanner && (
          <motion.div
            initial={{ y: 120, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 120, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 250 }}
            className="fixed bottom-4 left-3 right-3 z-[9999] max-w-md mx-auto"
          >
            <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#0d0d1a]/98 backdrop-blur-xl shadow-2xl shadow-cyan-500/20">
              {/* Animated gradient border */}
              <div className="absolute top-0 left-0 right-0 h-[2px]">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                  style={{ width: "200%" }}
                />
              </div>

              {/* Glow effect */}
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-20 bg-cyan-500/10 rounded-full blur-3xl" />

              <div className="relative p-4">
                <div className="flex items-start gap-3">
                  {/* Animated App Icon */}
                  <div className="flex-shrink-0 relative">
                    <motion.div
                      animate={{
                        boxShadow: [
                          "0 0 15px rgba(0,240,255,0.3)",
                          "0 0 30px rgba(0,240,255,0.5)",
                          "0 0 15px rgba(0,240,255,0.3)",
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#0d0d1a] border-2 border-cyan-500/40 flex items-center justify-center"
                    >
                      <div className="relative">
                        <motion.div
                          animate={{ rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 3, repeat: Infinity }}
                        >
                          <Zap className="w-7 h-7 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
                        </motion.div>
                      </div>
                    </motion.div>
                    {/* Install badge */}
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#0d0d1a]"
                    >
                      <ArrowDown className="w-2.5 h-2.5 text-white" />
                    </motion.div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                      Instalar NeonDelivery
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                      {platform === "ios"
                        ? "Adicione a tela inicial para acesso rapido!"
                        : "Instale gratis e use como app nativo!"}
                    </p>

                    {/* Features pills */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[
                        { icon: "⚡", text: "Rapido" },
                        { icon: "🔔", text: "Notificacoes" },
                        { icon: "📱", text: "Tela cheia" },
                        { icon: "📡", text: "Offline" },
                      ].map((f) => (
                        <span
                          key={f.text}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] text-gray-400"
                        >
                          <span>{f.icon}</span>
                          {f.text}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Close */}
                  <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleDismiss}
                    className="flex-1 py-2.5 rounded-xl text-[11px] font-semibold text-gray-500 bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                  >
                    Agora nao
                  </button>
                  <motion.button
                    onClick={handleInstall}
                    disabled={installing}
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    className="flex-[2] py-2.5 rounded-xl text-[11px] font-bold text-black bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-300 hover:to-purple-400 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-lg shadow-cyan-500/20"
                  >
                    {installing ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full"
                      />
                    ) : (
                      <>
                        {platform === "ios" ? (
                          <Share className="w-3.5 h-3.5" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        {platform === "ios"
                          ? "Como Instalar"
                          : "Instalar App Gratis"}
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Safari arrow pointing to share button */}
      <AnimatePresence>
        {showFullBanner && platform === "ios" && browser === "safari" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-[9998] flex justify-center pb-2 pointer-events-none"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="flex flex-col items-center"
            >
              <div className="px-3 py-1 rounded-lg bg-cyan-500/20 backdrop-blur-sm border border-cyan-500/30 mb-1">
                <span className="text-[9px] text-cyan-400 font-semibold">
                  Toque no icone de compartilhar abaixo
                </span>
              </div>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#00f0ff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Install Guide Modal */}
      <IOSInstallGuide
        open={showIOSGuide}
        onClose={() => setShowIOSGuide(false)}
        platform={platform}
        browser={browser}
      />
    </>
  );
}

// ═══ iOS / MANUAL INSTALL GUIDE ═══
function IOSInstallGuide({
  open,
  onClose,
  platform,
  browser,
}: {
  open: boolean;
  onClose: () => void;
  platform: string;
  browser: string;
}) {
  const isIOS = platform === "ios";
  const isSamsung = browser === "samsung";

  const steps = isIOS
    ? [
        {
          icon: <Share className="w-6 h-6 text-blue-400" />,
          title: "Toque em Compartilhar",
          desc: 'Toque no icone de compartilhar na barra do Safari (quadrado com seta para cima)',
          highlight: true,
        },
        {
          icon: <Plus className="w-6 h-6 text-cyan-400" />,
          title: '"Adicionar a Tela de Inicio"',
          desc: "Role para baixo no menu e toque nesta opcao",
          highlight: false,
        },
        {
          icon: <CheckCircle2 className="w-6 h-6 text-green-400" />,
          title: 'Toque em "Adicionar"',
          desc: "O app aparecera na sua tela inicial como um aplicativo nativo!",
          highlight: false,
        },
      ]
    : isSamsung
    ? [
        {
          icon: <MonitorSmartphone className="w-6 h-6 text-cyan-400" />,
          title: "Samsung Internet",
          desc: "Use o Chrome para melhor compatibilidade, ou siga os passos abaixo",
          highlight: true,
        },
        {
          icon: <ExternalLink className="w-6 h-6 text-purple-400" />,
          title: 'Menu > "Adicionar a tela inicial"',
          desc: 'Toque no menu (≡) embaixo a direita e selecione "Adicionar pagina a" > "Tela inicial"',
          highlight: false,
        },
        {
          icon: <Shield className="w-6 h-6 text-yellow-400" />,
          title: "Seguranca Samsung",
          desc: 'Se aparecer alerta de seguranca, toque "Instalar mesmo assim". O app e 100% seguro (PWA web)',
          highlight: false,
        },
        {
          icon: <CheckCircle2 className="w-6 h-6 text-green-400" />,
          title: "Pronto!",
          desc: "O app aparecera na sua tela inicial como um aplicativo nativo!",
          highlight: false,
        },
      ]
    : [
        {
          icon: <MonitorSmartphone className="w-6 h-6 text-cyan-400" />,
          title: "Instalacao Manual",
          desc: "Seu navegador requer instalacao manual pelo menu",
          highlight: true,
        },
        {
          icon: <ExternalLink className="w-6 h-6 text-purple-400" />,
          title: 'Menu > "Instalar App"',
          desc: 'Toque nos 3 pontos (⋮) e selecione "Instalar aplicativo" ou "Adicionar a tela inicial"',
          highlight: false,
        },
        {
          icon: <CheckCircle2 className="w-6 h-6 text-green-400" />,
          title: "Confirme a instalacao",
          desc: "O app sera instalado e aparecera na sua tela inicial!",
          highlight: false,
        },
      ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 250 }}
            className="w-full max-w-sm bg-[#0d0d1a] border border-cyan-500/20 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient top bar */}
            <div className="h-[3px] bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500" />

            {/* Header */}
            <div className="p-5 pb-2 text-center">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#0d0d1a] border-2 border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/20"
              >
                <Zap className="w-8 h-8 text-cyan-400" />
              </motion.div>

              <h2 className="text-lg font-bold text-white">
                {isIOS ? "Instalar no iPhone/iPad" : "Instalar NeonDelivery"}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {isIOS
                  ? "Siga os 3 passos abaixo no Safari"
                  : "Siga os passos abaixo"}
              </p>
            </div>

            {/* Steps */}
            <div className="px-5 space-y-3 pb-2">
              {steps.map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.15 }}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    step.highlight
                      ? "border-cyan-500/30 bg-cyan-500/5"
                      : "border-white/5 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center relative">
                    {step.icon}
                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 text-[10px] font-bold text-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {step.title}
                    </p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-700 flex-shrink-0" />
                </motion.div>
              ))}
            </div>

            {/* iOS Safari indicator */}
            {isIOS && browser !== "safari" && (
              <div className="mx-5 mt-3 p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-[10px] text-yellow-400 text-center font-medium">
                  ⚠️ Para instalar no iOS, use o Safari! Outros navegadores nao suportam.
                </p>
              </div>
            )}

            {/* Close button */}
            <div className="p-5 pt-4">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                className="w-full py-3 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-cyan-400 to-purple-500 transition-all"
              >
                Entendi!
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══ MINI INSTALL BUTTON (floating, for persistent reminder) ═══
export function PWAMiniInstallButton() {
  const [visible, setVisible] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const platform = getPlatform();
  const browser = getBrowser();

  useEffect(() => {
    if (isStandalone() || isInstalled()) return;

    // Show mini button after dismiss or after a while
    const checkInterval = setInterval(() => {
      const dismissed = localStorage.getItem("pwa-install-dismissed");
      if (dismissed && !isInstalled()) {
        setVisible(true);
        clearInterval(checkInterval);
      }
    }, 5000);

    return () => clearInterval(checkInterval);
  }, []);

  const handleClick = async () => {
    if (platform === "ios" || !canAutoPrompt()) {
      setShowIOSGuide(true);
      return;
    }
    const accepted = await promptInstall();
    if (accepted) setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleClick}
        className="fixed bottom-20 right-4 z-[9998] w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/30"
      >
        <Download className="w-5 h-5 text-white" />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-cyan-400/40"
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.button>

      <IOSInstallGuide
        open={showIOSGuide}
        onClose={() => setShowIOSGuide(false)}
        platform={platform}
        browser={browser}
      />
    </>
  );
}

// ═══ PERMISSIONS MODAL ═══
export function PermissionsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [permissions, setPermissions] = useState<{
    camera: PermissionStatus;
    microphone: PermissionStatus;
    location: PermissionStatus;
    notifications: PermissionStatus;
  }>({
    camera: "prompt",
    microphone: "prompt",
    location: "prompt",
    notifications: "prompt",
  });
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      checkPermissions().then(setPermissions);
    }
  }, [open]);

  const requestPermission = useCallback(
    async (type: "camera" | "microphone" | "location" | "notifications") => {
      setRequesting(type);
      let granted = false;

      switch (type) {
        case "camera":
          granted = await requestCameraPermission();
          break;
        case "microphone":
          granted = await requestMicrophonePermission();
          break;
        case "location":
          granted = await requestLocationPermission();
          break;
        case "notifications":
          const perm = await requestNotificationPermission();
          granted = perm === "granted";
          if (granted) {
            // Immediately register the push subscription now that we have permission
            const currentUser = localStorage.getItem("currentUser");
            if (currentUser) {
              try {
                const userData = JSON.parse(currentUser);
                if (userData.username) {
                  import("../services/pwa").then((m) => {
                    m.registerPushSubscription(userData.username);
                  });
                }
              } catch (e) {}
            }
          }
          break;
      }

      setPermissions((prev) => ({
        ...prev,
        [type]: granted ? "granted" : "denied",
      }));
      setRequesting(null);
    },
    []
  );

  const requestAll = async () => {
    const types: Array<
      "notifications" | "camera" | "microphone" | "location"
    > = ["notifications", "camera", "microphone", "location"];
    for (const type of types) {
      if (permissions[type] !== "granted") {
        await requestPermission(type);
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  };

  const allGranted = Object.values(permissions).every((p) => p === "granted");

  const permissionItems = [
    {
      key: "notifications" as const,
      icon: Bell,
      label: "Notificacoes",
      desc: "Receba alertas de pedidos e mensagens",
      color: "text-yellow-400",
      bg: "from-yellow-500/20 to-orange-500/20",
      border: "border-yellow-500/30",
    },
    {
      key: "camera" as const,
      icon: Camera,
      label: "Camera",
      desc: "Reconhecimento facial e fotos",
      color: "text-cyan-400",
      bg: "from-cyan-500/20 to-blue-500/20",
      border: "border-cyan-500/30",
    },
    {
      key: "microphone" as const,
      icon: Mic,
      label: "Microfone",
      desc: "Mensagens de audio no chat",
      color: "text-purple-400",
      bg: "from-purple-500/20 to-pink-500/20",
      border: "border-purple-500/30",
    },
    {
      key: "location" as const,
      icon: MapPin,
      label: "Localizacao",
      desc: "Rastreamento de entregas",
      color: "text-green-400",
      bg: "from-green-500/20 to-emerald-500/20",
      border: "border-green-500/30",
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25 }}
            className="w-full max-w-sm bg-[#0d0d1a] border border-cyan-500/20 rounded-2xl overflow-hidden shadow-2xl shadow-cyan-500/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-5 pb-3">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Permissoes do App
                  </h2>
                  <p className="text-xs text-gray-500">
                    Necessarias para funcionar 100%
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="ml-auto p-1.5 rounded-lg hover:bg-white/10"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Permission items */}
            <div className="px-5 space-y-2.5">
              {permissionItems.map((item) => {
                const status = permissions[item.key];
                const isRequesting = requesting === item.key;
                const Icon = item.icon;

                return (
                  <motion.div
                    key={item.key}
                    layout
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      status === "granted"
                        ? "border-green-500/30 bg-green-500/5"
                        : `${item.border} bg-gradient-to-r ${item.bg}`
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        status === "granted" ? "bg-green-500/20" : "bg-black/30"
                      }`}
                    >
                      {status === "granted" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : (
                        <Icon className={`w-5 h-5 ${item.color}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {item.label}
                      </p>
                      <p className="text-[10px] text-gray-500">{item.desc}</p>
                    </div>
                    {status !== "granted" && (
                      <button
                        onClick={() => requestPermission(item.key)}
                        disabled={isRequesting}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors disabled:opacity-50"
                      >
                        {isRequesting ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full"
                          />
                        ) : status === "denied" ? (
                          "Bloqueado"
                        ) : (
                          "Permitir"
                        )}
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="p-5 pt-4 space-y-2.5">
              {!allGranted && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={requestAll}
                  className="w-full py-3 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-300 hover:to-purple-400 transition-all flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Permitir Tudo
                </motion.button>
              )}
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-300 transition-colors"
              >
                {allGranted ? "Tudo Pronto!" : "Pular por agora"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══ ONLINE/OFFLINE INDICATOR ═══
export function OnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };
    const handleOffline = () => {
      setOnline(false);
      setShowReconnected(false);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-red-500/90 backdrop-blur-sm py-2.5 px-4 flex items-center justify-center gap-2 safe-top"
        >
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <WifiOff className="w-4 h-4 text-white" />
          </motion.div>
          <span className="text-xs font-semibold text-white">
            Sem conexao — Modo offline ativo
          </span>
        </motion.div>
      )}
      {showReconnected && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-green-500/90 backdrop-blur-sm py-2.5 px-4 flex items-center justify-center gap-2 safe-top"
        >
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span className="text-xs font-semibold text-white">
            Conexao restaurada!
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══ PWA UPDATE BANNER ═══
export function PWAUpdateBanner() {
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setHasUpdate(true);
            }
          });
        }
      });
    });
  }, []);

  if (!hasUpdate) return null;

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-[9999] bg-purple-600/90 backdrop-blur-sm py-2.5 px-4 flex items-center justify-center gap-3"
    >
      <Zap className="w-4 h-4 text-white" />
      <span className="text-xs font-semibold text-white">
        Nova versao disponivel!
      </span>
      <button
        onClick={() => {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: "SKIP_WAITING",
            });
          }
          window.location.reload();
        }}
        className="px-3 py-1 rounded-lg bg-white/20 text-white text-xs font-bold hover:bg-white/30 transition-colors"
      >
        Atualizar
      </button>
    </motion.div>
  );
}

// ═══ PWA SPLASH SCREEN (shown while app loads) ═══
export function PWASplashScreen({ onFinish }: { onFinish: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(onFinish, 300);
          return 100;
        }
        return p + Math.random() * 15 + 5;
      });
    }, 150);

    // Safety timeout
    const timeout = setTimeout(onFinish, 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onFinish]);

  return (
    <motion.div
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[99999] bg-[#0a0a0f] flex flex-col items-center justify-center"
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Logo */}
      <motion.div
        animate={{
          boxShadow: [
            "0 0 30px rgba(0,240,255,0.2)",
            "0 0 60px rgba(0,240,255,0.4)",
            "0 0 30px rgba(0,240,255,0.2)",
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-[#1a1a2e] to-[#0d0d1a] border-2 border-cyan-500/40 flex items-center justify-center mb-8"
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Zap className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.6)]" />
        </motion.div>
      </motion.div>

      {/* App name */}
      <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-1">
        NEON
      </h1>
      <p className="text-sm font-semibold text-purple-400 tracking-[4px] mb-8">
        DELIVERY
      </p>

      {/* Progress bar */}
      <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full"
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <p className="text-[10px] text-gray-600 mt-3 tracking-wider">
        CARREGANDO...
      </p>
    </motion.div>
  );
}