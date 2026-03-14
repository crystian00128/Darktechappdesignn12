import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, BellOff } from "lucide-react";
import * as pwa from "../services/pwa";

interface PushToggleProps {
  username: string;
  /** Accent color for the toggle glow (default: #00f0ff) */
  accentColor?: string;
  /** Compact mode - icon only, no label */
  compact?: boolean;
}

export function PushToggle({ username, accentColor = "#00f0ff", compact = false }: PushToggleProps) {
  const [enabled, setEnabled] = useState<boolean>(() => pwa.isPushEnabledForUser(username));
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [permissionBlocked, setPermissionBlocked] = useState(false);

  // Check if permission is denied at browser level
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "denied") {
      setPermissionBlocked(true);
    }
  }, []);

  // On mount, if enabled AND permission is not denied, ensure push is registered
  useEffect(() => {
    if (enabled && username) {
      if ("Notification" in window && Notification.permission !== "denied") {
        pwa.registerPushSubscription(username).catch(() => {});
      }
    }
  }, []); // only on mount

  const handleToggle = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    const newState = !enabled;

    try {
      if (newState) {
        // Enable push — set preference FIRST so registerPushSubscription sees it
        pwa.setPushEnabledForUser(username, true);

        if ("Notification" in window && Notification.permission === "denied") {
          setPermissionBlocked(true);
          setEnabled(true);
          setShowTooltip(true);
          setTimeout(() => setShowTooltip(false), 4000);
          setLoading(false);
          return;
        }

        const success = await pwa.registerPushSubscription(username);
        if (success) {
          setEnabled(true);
          setPermissionBlocked(false);
        } else {
          if ("Notification" in window && Notification.permission === "denied") {
            setPermissionBlocked(true);
            setShowTooltip(true);
            setTimeout(() => setShowTooltip(false), 4000);
          }
          setEnabled(true);
        }
      } else {
        // Disable push — set preference FIRST
        pwa.setPushEnabledForUser(username, false);
        await pwa.unregisterPushSubscription(username);
        setEnabled(false);
      }
    } catch (err) {
      console.error("[PushToggle] Error toggling push:", err);
    } finally {
      setLoading(false);
    }
  }, [enabled, loading, username]);

  if (compact) {
    return (
      <div className="relative">
        <motion.button
          onClick={handleToggle}
          whileTap={{ scale: 0.9 }}
          disabled={loading}
          className={`relative p-2 rounded-xl border transition-all duration-300 ${
            enabled
              ? ""
              : "border-[#2a2a3e] bg-[#12121a] hover:border-[#3a3a4e]"
          }`}
          style={{
            ...(enabled
              ? {
                  borderColor: `${accentColor}30`,
                  background: `${accentColor}10`,
                }
              : {}),
          }}
          title={enabled ? "Desativar notificacoes push" : "Ativar notificacoes push"}
          onMouseEnter={() => permissionBlocked && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {loading ? (
            <motion.div
              className="w-4 h-4 border-2 rounded-full"
              style={{ borderColor: `${accentColor}40`, borderTopColor: accentColor }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
          ) : enabled ? (
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Bell className="w-4 h-4" style={{ color: accentColor }} />
            </motion.div>
          ) : (
            <BellOff className="w-4 h-4 text-gray-600" />
          )}

          {/* Active indicator dot */}
          {enabled && !loading && (
            <motion.div
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
              style={{ backgroundColor: "#00ff41", boxShadow: "0 0 6px rgba(0,255,65,0.6)" }}
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.button>

        {/* Tooltip for blocked permission */}
        <AnimatePresence>
          {showTooltip && permissionBlocked && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute top-full mt-2 right-0 w-56 p-2.5 rounded-xl bg-[#1a1a28] border border-[#ff006e]/30 text-[11px] text-gray-300 z-[99999] shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
            >
              <p className="text-[#ff006e] font-bold mb-1">Permissao bloqueada</p>
              <p>Reative as notificacoes nas configuracoes do navegador para este site.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full toggle with label
  return (
    <div className="relative">
      <motion.button
        onClick={handleToggle}
        whileTap={{ scale: 0.95 }}
        disabled={loading}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300 ${
          enabled
            ? ""
            : "border-[#2a2a3e] bg-[#12121a]/80 hover:border-[#3a3a4e]"
        }`}
        style={{
          ...(enabled
            ? {
                boxShadow: `0 0 15px ${accentColor}30`,
                background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}08)`,
                borderColor: `${accentColor}40`,
              }
            : {}),
        }}
        onMouseEnter={() => permissionBlocked && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {loading ? (
          <motion.div
            className="w-4 h-4 border-2 rounded-full shrink-0"
            style={{ borderColor: `${accentColor}40`, borderTopColor: accentColor }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
        ) : enabled ? (
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="shrink-0"
          >
            <Bell className="w-4 h-4" style={{ color: accentColor }} />
          </motion.div>
        ) : (
          <BellOff className="w-4 h-4 text-gray-600 shrink-0" />
        )}

        <span className={`text-[11px] font-semibold whitespace-nowrap ${
          enabled ? "text-white" : "text-gray-500"
        }`}>
          {loading ? "..." : enabled ? "Push ON" : "Push OFF"}
        </span>

        {/* Mini toggle indicator */}
        <div className={`relative w-8 h-[18px] rounded-full transition-all duration-300 shrink-0 ${
          enabled ? "" : "bg-[#1f1f2e]"
        }`}
          style={enabled ? { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}90)` } : undefined}
        >
          <motion.div
            className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-md"
            animate={{ left: enabled ? "calc(100% - 16px)" : "2px" }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </div>

        {/* Active glow pulse */}
        {enabled && !loading && (
          <motion.div
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
            style={{ backgroundColor: "#00ff41", boxShadow: "0 0 6px rgba(0,255,65,0.6)" }}
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Tooltip for blocked permission */}
      <AnimatePresence>
        {showTooltip && permissionBlocked && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute top-full mt-2 right-0 w-60 p-3 rounded-xl bg-[#1a1a28] border border-[#ff006e]/30 text-[11px] text-gray-300 z-[99999] shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
          >
            <p className="text-[#ff006e] font-bold mb-1">Permissao bloqueada</p>
            <p>As notificacoes foram bloqueadas no navegador. Para reativar, acesse as configuracoes do site no seu navegador e permita notificacoes.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
