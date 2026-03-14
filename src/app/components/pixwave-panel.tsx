import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap,
  Wifi,
  WifiOff,
  Check,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Receipt,
  Activity,
  Unplug,
  QrCode,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import * as api from "../services/api";

// ─── Neon helpers (matching admin panel style) ──────
function NeonText({ children, color = "#00f0ff", className = "" }: { children: React.ReactNode; color?: string; className?: string }) {
  return (
    <motion.span className={className} style={{ color }}
      animate={{ textShadow: [`0 0 6px ${color}40`, `0 0 14px ${color}60`, `0 0 6px ${color}40`] }}
      transition={{ duration: 2.5, repeat: Infinity }}
    >{children}</motion.span>
  );
}

function GlowCard({ children, className = "", glowColor = "#00f0ff" }: { children: React.ReactNode; className?: string; glowColor?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`relative rounded-2xl overflow-hidden ${className}`}>
      <motion.div className="absolute inset-0 rounded-2xl p-[1px]"
        style={{ background: `conic-gradient(from 0deg, ${glowColor}20, transparent, ${glowColor}10, transparent)` }}
        animate={{ rotate: [0, 360] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} />
      <div className="relative bg-[#0c0c14]/90 backdrop-blur-xl rounded-2xl border border-[#1f1f2e]/50 m-[1px]">
        {children}
      </div>
    </motion.div>
  );
}

function StatMini({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-[#0a0a12]/60 rounded-xl border border-[#1f1f2e]/30 p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}15` }}>
          <div style={{ color }} className="w-4 h-4">{icon}</div>
        </div>
        <span className="text-gray-500 text-[11px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <NeonText color={color} className="text-xl font-bold block">{value}</NeonText>
    </div>
  );
}

const statusConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  pending: { color: "#f59e0b", label: "Pendente", icon: <Clock className="w-3.5 h-3.5" /> },
  paid: { color: "#00ff41", label: "Pago", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  expired: { color: "#6b7280", label: "Expirado", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  cancelled: { color: "#ef4444", label: "Cancelado", icon: <XCircle className="w-3.5 h-3.5" /> },
};

export function PixwavePanel() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loadingDash, setLoadingDash] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [testInvoice, setTestInvoice] = useState<any>(null);
  const [creatingTest, setCreatingTest] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadConfig = useCallback(async () => {
    try {
      const res = await api.getPixwaveConfig();
      if (res.success) {
        setConnected(res.connected);
        setConnectedAt(res.connectedAt || null);
      }
    } catch (err) { console.error("Erro config:", err); }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoadingDash(true);
    try {
      const res = await api.getPixwaveDashboard();
      if (res.success) setDashboard(res.stats);
    } catch (err) { console.error("Erro dashboard:", err); }
    finally { setLoadingDash(false); }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (connected) {
      loadDashboard();
      const interval = setInterval(loadDashboard, 15000);
      return () => clearInterval(interval);
    }
  }, [connected, loadDashboard]);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      const res = await api.savePixwaveConfig(apiKey.trim());
      if (res.success) {
        showToast("API Key validada e conectada com sucesso!", "success");
        setConnected(true);
        setConnectedAt(new Date().toISOString());
        setApiKey("");
        loadDashboard();
      } else {
        showToast(res.error || "Erro ao validar API Key", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Erro ao conectar", "error");
    } finally { setSaving(false); }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await api.disconnectPixwave();
      setConnected(false);
      setConnectedAt(null);
      setDashboard(null);
      showToast("PixWave desconectado", "success");
    } catch (err: any) {
      showToast(err.message || "Erro", "error");
    } finally { setDisconnecting(false); }
  };

  const handleTestInvoice = async () => {
    setCreatingTest(true);
    try {
      const res = await api.createPixwaveInvoice({
        description: "Teste de Integração PixWave",
        price: 10.00,
        externalId: `test-${Date.now()}`,
        metadata: { test: true },
      });
      if (res.success) {
        setTestInvoice(res.invoice);
        showToast("Invoice de teste criado!", "success");
        loadDashboard();
      } else {
        showToast(res.error || "Erro ao criar invoice", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Erro", "error");
    } finally { setCreatingTest(false); }
  };

  const formatDate = (ds: string) => {
    if (!ds) return "-";
    return new Date(ds).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    });
    showToast("Copiado!", "success");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 rounded-xl text-white text-xs font-medium flex items-center gap-2"
            style={{
              background: toast.type === "success"
                ? "linear-gradient(135deg, rgba(0,255,65,0.9), rgba(0,240,255,0.9))"
                : "linear-gradient(135deg, rgba(255,0,110,0.9), rgba(239,68,68,0.9))",
              boxShadow: toast.type === "success" ? "0 0 30px rgba(0,255,65,0.3)" : "0 0 30px rgba(255,0,110,0.3)",
            }}
          >
            {toast.type === "success" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Connection Status Header ──────────────── */}
      <GlowCard glowColor={connected ? "#00ff41" : "#00f0ff"}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.div
                className="p-3 rounded-xl"
                style={{ background: connected ? "rgba(0,255,65,0.1)" : "rgba(0,240,255,0.1)" }}
                animate={connected ? {
                  boxShadow: ["0 0 10px rgba(0,255,65,0)", "0 0 20px rgba(0,255,65,0.4)", "0 0 10px rgba(0,255,65,0)"],
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Zap className="w-6 h-6" style={{ color: connected ? "#00ff41" : "#00f0ff" }} />
              </motion.div>
              <div>
                <h2 className="text-white font-bold text-lg flex items-center gap-2">
                  <NeonText color={connected ? "#00ff41" : "#00f0ff"}>PIXWAVE API</NeonText>
                  {connected && (
                    <motion.span
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#00ff41]/10 text-[#00ff41] rounded-full text-[11px] font-medium border border-[#00ff41]/20"
                      animate={{ boxShadow: ["0 0 4px rgba(0,255,65,0)", "0 0 10px rgba(0,255,65,0.4)", "0 0 4px rgba(0,255,65,0)"] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Wifi className="w-3 h-3" /> CONECTADO
                    </motion.span>
                  )}
                  {!connected && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-600/10 text-gray-500 rounded-full text-[11px] font-medium border border-gray-600/20">
                      <WifiOff className="w-3 h-3" /> DESCONECTADO
                    </span>
                  )}
                </h2>
                <p className="text-gray-500 text-xs mt-0.5">
                  {connected
                    ? `Conectado desde ${connectedAt ? formatDate(connectedAt) : "-"}`
                    : "Configure sua API Key para ativar pagamentos PIX via DePix"
                  }
                </p>
              </div>
            </div>
            {connected && (
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleDisconnect} disabled={disconnecting}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20 hover:bg-red-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Unplug className="w-3 h-3" />
                {disconnecting ? "..." : "Desconectar"}
              </motion.button>
            )}
          </div>

          {/* API Key Input (when not connected) */}
          {!connected && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">API KEY PIXWAVE</label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="dpx_live_..."
                    className="w-full px-4 py-3 bg-[#0a0a12]/80 border border-[#1f1f2e]/60 rounded-xl text-white text-sm focus:outline-none focus:border-[#00f0ff]/50 focus:shadow-[0_0_15px_rgba(0,240,255,0.1)] transition-all placeholder-gray-600 pr-10"
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  />
                  <button onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-gray-600 text-[11px] mt-1.5">
                  Obtenha sua API Key em <span className="text-[#00f0ff]">pixwave.cash</span> → Configuracoes → API Keys
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(0,240,255,0.3)" }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={saving || !apiKey.trim()}
                className="w-full py-3.5 font-bold text-white text-sm rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #00f0ff 0%, #8b5cf6 100%)" }}
              >
                {saving ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    Validando e Conectando...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Conectar PixWave
                  </>
                )}
              </motion.button>
            </motion.div>
          )}
        </div>
      </GlowCard>

      {/* ─── Dashboard (when connected) ─────────────── */}
      {connected && dashboard && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <GlowCard glowColor="#00f0ff">
              <StatMini label="Total Invoices" value={dashboard.totalInvoices || 0} color="#00f0ff" icon={<Receipt className="w-full h-full" />} />
            </GlowCard>
            <GlowCard glowColor="#00ff41">
              <StatMini label="Pagos" value={dashboard.paid || 0} color="#00ff41" icon={<CheckCircle2 className="w-full h-full" />} />
            </GlowCard>
            <GlowCard glowColor="#f59e0b">
              <StatMini label="Pendentes" value={dashboard.pending || 0} color="#f59e0b" icon={<Clock className="w-full h-full" />} />
            </GlowCard>
            <GlowCard glowColor="#8b5cf6">
              <StatMini label="Receita PIX" value={`R$ ${(dashboard.totalRevenue || 0).toFixed(2)}`} color="#8b5cf6" icon={<DollarSign className="w-full h-full" />} />
            </GlowCard>
          </div>

          {/* Actions Row */}
          <div className="flex gap-3">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleTestInvoice} disabled={creatingTest}
              className="flex-1 py-3 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 border border-[#00f0ff]/30 bg-[#00f0ff]/5 hover:bg-[#00f0ff]/10 transition-colors disabled:opacity-50"
            >
              {creatingTest ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-3.5 h-3.5 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full" />
              ) : (
                <QrCode className="w-3.5 h-3.5 text-[#00f0ff]" />
              )}
              {creatingTest ? "Criando..." : "Criar Invoice Teste (R$ 10,00)"}
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={loadDashboard} disabled={loadingDash}
              className="px-4 py-3 rounded-xl text-gray-400 text-xs font-medium flex items-center gap-1.5 border border-[#1f1f2e]/50 hover:bg-[#1f1f2e]/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDash ? "animate-spin" : ""}`} />
              Atualizar
            </motion.button>
          </div>

          {/* Test Invoice Result */}
          <AnimatePresence>
            {testInvoice && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <GlowCard glowColor="#00ff41">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-bold text-sm flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-[#00ff41]" /> Invoice de Teste Criado
                      </h3>
                      <button onClick={() => setTestInvoice(null)} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {/* QR Code */}
                      {testInvoice.payment?.qrCodeImageUrl && (
                        <div className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl">
                          <img src={testInvoice.payment.qrCodeImageUrl} alt="QR Code PIX" className="w-48 h-48" />
                        </div>
                      )}
                      {/* Info */}
                      <div className="space-y-2.5">
                        <div className="p-2.5 bg-[#0a0a12]/60 rounded-lg border border-[#1f1f2e]/30">
                          <span className="text-gray-500 text-[9px] block mb-0.5">ID</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-white text-xs font-mono truncate flex-1">{testInvoice.id}</span>
                            <button onClick={() => copyToClipboard(testInvoice.id)} className="text-gray-500 hover:text-[#00f0ff] transition-colors shrink-0">
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="p-2.5 bg-[#0a0a12]/60 rounded-lg border border-[#1f1f2e]/30">
                          <span className="text-gray-500 text-[9px] block mb-0.5">Valor</span>
                          <NeonText color="#00ff41" className="text-sm font-bold">R$ {testInvoice.amount?.toFixed(2)}</NeonText>
                        </div>
                        <div className="p-2.5 bg-[#0a0a12]/60 rounded-lg border border-[#1f1f2e]/30">
                          <span className="text-gray-500 text-[9px] block mb-0.5">Status</span>
                          <span className="text-yellow-400 text-xs font-medium">{testInvoice.status}</span>
                        </div>
                        {testInvoice.payment?.qrCode && (
                          <div className="p-2.5 bg-[#0a0a12]/60 rounded-lg border border-[#1f1f2e]/30">
                            <span className="text-gray-500 text-[9px] block mb-0.5">PIX Copia e Cola</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-white text-[9px] font-mono truncate flex-1">{testInvoice.payment.qrCode.substring(0, 40)}...</span>
                              <button onClick={() => copyToClipboard(testInvoice.payment.qrCode)} className="text-gray-500 hover:text-[#00f0ff] transition-colors shrink-0">
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                        {testInvoice.payment?.paymentUrl && (
                          <a href={testInvoice.payment.paymentUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 justify-center py-2 rounded-lg bg-[#00f0ff]/10 text-[#00f0ff] text-xs font-medium border border-[#00f0ff]/20 hover:bg-[#00f0ff]/20 transition-colors">
                            <ExternalLink className="w-3 h-3" /> Abrir Pagina de Pagamento
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent Invoices */}
          <GlowCard glowColor="#8b5cf6">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#8b5cf6]" />
                  <NeonText color="#8b5cf6">Invoices Recentes</NeonText>
                </h3>
                <span className="text-gray-500 text-[11px]">{dashboard.totalInvoices || 0} total</span>
              </div>

              {(dashboard.recentInvoices || []).length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-600 text-xs">Nenhum invoice ainda</p>
                  <p className="text-gray-700 text-[10px]">Crie um invoice de teste acima</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(dashboard.recentInvoices || []).map((inv: any) => {
                    const sc = statusConfig[inv.status] || statusConfig.pending;
                    const isExpanded = expandedInvoice === inv.id;
                    return (
                      <motion.div key={inv.id} layout className="bg-[#0a0a12]/60 rounded-xl border border-[#1f1f2e]/30 overflow-hidden">
                        <button onClick={() => setExpandedInvoice(isExpanded ? null : inv.id)}
                          className="w-full flex items-center gap-3 p-3 text-left hover:bg-[#1f1f2e]/20 transition-colors"
                        >
                          <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${sc.color}15` }}>
                            <div style={{ color: sc.color }}>{sc.icon}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-medium truncate">{inv.description || inv.id}</p>
                            <p className="text-gray-600 text-[9px]">{formatDate(inv.createdAt)}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <NeonText color={sc.color} className="text-sm font-bold block">
                              R$ {(inv.amount || 0).toFixed(2)}
                            </NeonText>
                            <span className="text-[9px] font-medium" style={{ color: sc.color }}>{sc.label}</span>
                          </div>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-500 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }} className="overflow-hidden"
                            >
                              <div className="px-3 pb-3 space-y-1.5 border-t border-[#1f1f2e]/30 pt-2">
                                <div className="flex justify-between text-[9px]">
                                  <span className="text-gray-500">ID</span>
                                  <span className="text-gray-300 font-mono">{inv.id?.substring(0, 20)}...</span>
                                </div>
                                {inv.externalId && (
                                  <div className="flex justify-between text-[9px]">
                                    <span className="text-gray-500">External ID</span>
                                    <span className="text-gray-300 font-mono">{inv.externalId}</span>
                                  </div>
                                )}
                                {inv.paidAt && (
                                  <div className="flex justify-between text-[9px]">
                                    <span className="text-gray-500">Pago em</span>
                                    <span className="text-[#00ff41]">{formatDate(inv.paidAt)}</span>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </GlowCard>

          {/* Recent Webhooks */}
          {(dashboard.recentWebhooks || []).length > 0 && (
            <GlowCard glowColor="#ff00ff">
              <div className="p-5">
                <h3 className="text-white font-bold text-sm flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-[#ff00ff]" />
                  <NeonText color="#ff00ff">Webhooks Recebidos</NeonText>
                </h3>
                <div className="space-y-1.5">
                  {(dashboard.recentWebhooks || []).map((wh: any, i: number) => {
                    const sc = statusConfig[wh.status] || statusConfig.pending;
                    return (
                      <div key={i} className="flex items-center gap-2.5 p-2.5 bg-[#0a0a12]/60 rounded-lg border border-[#1f1f2e]/30">
                        <div className="p-1 rounded" style={{ backgroundColor: `${sc.color}15`, color: sc.color }}>
                          {sc.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium">{wh.event}</p>
                          <p className="text-gray-600 text-[9px]">{wh.invoiceId?.substring(0, 16)}...</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[9px] font-medium" style={{ color: sc.color }}>{sc.label}</span>
                          <p className="text-gray-600 text-[8px]">{formatDate(wh.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </GlowCard>
          )}
        </>
      )}
    </motion.div>
  );
}