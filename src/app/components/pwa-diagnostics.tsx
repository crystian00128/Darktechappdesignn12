// ══════════════════════════════════════════════════════════════
// NEON DELIVERY — PWA Diagnostics Panel (Admin)
// Full PWA health check: VAPID, push subscriptions, SW status,
// install state, test push notifications
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Smartphone,
  Bell,
  Shield,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Send,
  Zap,
  Key,
  Monitor,
  Users,
  Globe,
  Download,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import {
  isStandalone,
  isInstalled,
  getPlatform,
  getBrowser,
  canAutoPrompt,
  canPromptInstall,
  registerPushSubscription,
} from "../services/pwa";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-42377006`;

interface DiagResult {
  vapid: {
    configured: boolean;
    publicKey: string;
    publicKeyPreview: string;
  };
  push: {
    totalUsers: number;
    usersWithPush: number;
    totalSubscriptions: number;
    details: Array<{
      username: string;
      devices: number;
      endpoints: string[];
    }>;
  };
  server: {
    version: string;
    timestamp: string;
    pushLibrary: string;
  };
}

export function PWADiagnosticsPanel() {
  const [diagnostics, setDiagnostics] = useState<DiagResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [testTarget, setTestTarget] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [swStatus, setSwStatus] = useState<{
    registered: boolean;
    active: boolean;
    version: string;
  } | null>(null);
  const [clientInfo, setClientInfo] = useState<any>(null);

  // Gather client-side PWA info
  useEffect(() => {
    const info = {
      platform: getPlatform(),
      browser: getBrowser(),
      standalone: isStandalone(),
      installed: isInstalled(),
      canAutoPrompt: canAutoPrompt(),
      canPromptNow: canPromptInstall(),
      notificationPermission:
        "Notification" in window ? Notification.permission : "unsupported",
      serviceWorkerSupported: "serviceWorker" in navigator,
      pushManagerSupported: "PushManager" in window,
      online: navigator.onLine,
      userAgent: navigator.userAgent.substring(0, 100),
    };
    setClientInfo(info);

    // Check SW status
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          // Ask SW for its status
          const messageChannel = new MessageChannel();
          messageChannel.port1.onmessage = (event) => {
            if (event.data?.type === "SW_STATUS") {
              setSwStatus({
                registered: true,
                active: event.data.active,
                version: event.data.version,
              });
            }
          };
          if (reg.active) {
            reg.active.postMessage({ type: "GET_STATUS" }, [
              messageChannel.port2,
            ]);
          }
          // Fallback
          setTimeout(() => {
            setSwStatus((prev) =>
              prev || { registered: true, active: !!reg.active, version: "?" }
            );
          }, 1000);
        })
        .catch(() => {
          setSwStatus({ registered: false, active: false, version: "none" });
        });
    }
  }, []);

  const fetchDiagnostics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/pwa/diagnostics`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const data = await res.json();
      if (data.success) {
        setDiagnostics(data.diagnostics);
      }
    } catch (e) {
      console.error("Diagnostics error:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDiagnostics();
  }, [fetchDiagnostics]);

  const sendTestPush = async () => {
    if (!testTarget.trim()) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API}/push/test`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetUsername: testTarget.trim() }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e) {
      setTestResult({ success: false, error: String(e) });
    }
    setTestLoading(false);
  };

  const reRegisterMyPush = async () => {
    try {
      const currentUser = localStorage.getItem("currentUser");
      if (currentUser) {
        const userData = JSON.parse(currentUser);
        if (userData.username) {
          const success = await registerPushSubscription(userData.username);
          alert(
            success
              ? "Push re-registrado com sucesso!"
              : "Falha ao re-registrar push. Verifique as permissoes."
          );
          fetchDiagnostics();
        }
      }
    } catch (e) {
      alert("Erro: " + e);
    }
  };

  const StatusBadge = ({
    ok,
    label,
    warn,
  }: {
    ok: boolean;
    label: string;
    warn?: boolean;
  }) => (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
        ok
          ? "bg-green-500/15 text-green-400 border border-green-500/20"
          : warn
            ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20"
            : "bg-red-500/15 text-red-400 border border-red-500/20"
      }`}
    >
      {ok ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : warn ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <XCircle className="w-3 h-3" />
      )}
      {label}
    </span>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Smartphone className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Diagnostico PWA
            </h3>
            <p className="text-[10px] text-gray-500">
              Status completo do aplicativo
            </p>
          </div>
        </div>
        <button
          onClick={fetchDiagnostics}
          disabled={loading}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 text-gray-400 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Client-Side Status Grid */}
      {clientInfo && (
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Dispositivo
              </span>
            </div>
            <div className="space-y-1">
              <StatusBadge
                ok={clientInfo.standalone}
                label={clientInfo.standalone ? "Standalone" : "Browser"}
                warn={!clientInfo.standalone}
              />
              <div className="text-[10px] text-gray-500 mt-1">
                {clientInfo.platform.toUpperCase()} /{" "}
                {clientInfo.browser.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Instalacao
              </span>
            </div>
            <div className="space-y-1">
              <StatusBadge
                ok={clientInfo.installed}
                label={clientInfo.installed ? "Instalado" : "Nao instalado"}
                warn={!clientInfo.installed}
              />
              {clientInfo.canAutoPrompt && !clientInfo.installed && (
                <div className="text-[10px] text-cyan-400 mt-1">
                  Prompt disponivel
                </div>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Notificacoes
              </span>
            </div>
            <StatusBadge
              ok={clientInfo.notificationPermission === "granted"}
              label={clientInfo.notificationPermission}
              warn={clientInfo.notificationPermission === "prompt"}
            />
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-3.5 h-3.5 text-green-400" />
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Service Worker
              </span>
            </div>
            <StatusBadge
              ok={!!swStatus?.active}
              label={
                swStatus
                  ? swStatus.active
                    ? `Ativo (${swStatus.version})`
                    : "Inativo"
                  : "Verificando..."
              }
              warn={!swStatus}
            />
          </div>
        </div>
      )}

      {/* Server-Side Status */}
      {diagnostics && (
        <div className="space-y-3">
          {/* VAPID */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-semibold text-white">
                  Chaves VAPID
                </span>
              </div>
              <StatusBadge
                ok={diagnostics.vapid.configured}
                label={diagnostics.vapid.configured ? "OK" : "Erro"}
              />
            </div>
            <p className="text-[10px] text-gray-500 font-mono break-all">
              {diagnostics.vapid.publicKeyPreview}
            </p>
            <p className="text-[10px] text-gray-600 mt-1">
              Chaves geradas automaticamente e armazenadas no banco.
              Protocolo VAPID ativo para push notifications.
            </p>
          </div>

          {/* Push Subscriptions */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-semibold text-white">
                  Push Subscriptions
                </span>
              </div>
              <StatusBadge
                ok={diagnostics.push.usersWithPush > 0}
                label={`${diagnostics.push.usersWithPush}/${diagnostics.push.totalUsers} usuarios`}
                warn={diagnostics.push.usersWithPush === 0}
              />
            </div>
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              <span>
                {diagnostics.push.totalSubscriptions} dispositivos registrados
              </span>
            </div>

            {/* Expandable details */}
            {diagnostics.push.details.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {expanded ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  {expanded ? "Ocultar detalhes" : "Ver detalhes"}
                </button>
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 space-y-1.5">
                        {diagnostics.push.details.map((d) => (
                          <div
                            key={d.username}
                            className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-black/20"
                          >
                            <span className="text-[10px] text-white font-mono">
                              @{d.username}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {d.devices} dispositivo
                              {d.devices > 1 ? "s" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Push Notification */}
      <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/5 to-purple-500/5 border border-cyan-500/20">
        <div className="flex items-center gap-2 mb-3">
          <Send className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-semibold text-white">
            Testar Push Notification
          </span>
        </div>
        <p className="text-[10px] text-gray-500 mb-2">
          Envie uma notificacao de teste para qualquer usuario. Funciona
          mesmo com o app fechado!
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={testTarget}
            onChange={(e) => setTestTarget(e.target.value)}
            placeholder="Username (ex: admin)"
            className="flex-1 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-xs text-white placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none"
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={sendTestPush}
            disabled={testLoading || !testTarget.trim()}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-xs font-bold text-black disabled:opacity-50 flex items-center gap-1.5"
          >
            {testLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Enviar
          </motion.button>
        </div>

        {testResult && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-2 p-2 rounded-lg text-[10px] ${
              testResult.success
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}
          >
            {testResult.success ? (
              <span>
                Enviado! {testResult.sent} entregue(s),{" "}
                {testResult.failed} falha(s). {testResult.devicesRegistered}{" "}
                dispositivo(s) registrado(s).
              </span>
            ) : (
              <span>
                {testResult.error}
                {testResult.hint && (
                  <span className="block text-yellow-400 mt-1">
                    Dica: {testResult.hint}
                  </span>
                )}
              </span>
            )}
          </motion.div>
        )}
      </div>

      {/* Re-register button */}
      <button
        onClick={reRegisterMyPush}
        className="w-full py-2.5 rounded-xl text-[11px] font-semibold text-gray-400 bg-white/5 hover:bg-white/10 border border-white/5 transition-colors flex items-center justify-center gap-2"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Re-registrar Meu Push
      </button>

      {/* Server info */}
      {diagnostics && (
        <div className="text-[9px] text-gray-700 text-center space-y-0.5">
          <p>
            Server {diagnostics.server.version} | Push Library:{" "}
            {diagnostics.server.pushLibrary}
          </p>
          <p>
            Ultimo check:{" "}
            {new Date(diagnostics.server.timestamp).toLocaleString("pt-BR")}
          </p>
        </div>
      )}
    </div>
  );
}
