import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { SidebarLayout } from "../components/sidebar-layout";
import { StatCard } from "../components/stat-card";
import {
  LayoutDashboard,
  Users,
  Ticket,
  Percent,
  Shield,
  Key,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  RefreshCw,
  Link2,
  UserPlus,
  Clock,
  CheckCircle2,
  GitBranch,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Zap,
  Minus,
  Plus,
  Loader2,
  Smartphone,
  Banknote,
  ArrowDownToLine,
  BadgeCheck,
  Calendar,
  Filter,
  Wallet,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as api from "../services/api";
import * as sfx from "../services/sounds";
import { PixwavePanel } from "../components/pixwave-panel";
import { AdminDashboardCharts, AdminFaturamentoCharts } from "../components/admin-charts";
import * as notif from "../services/notifications";
import { PWADiagnosticsPanel } from "../components/pwa-diagnostics";

// Neon glow text component
function NeonText({ children, color = "#00f0ff", className = "" }: { children: React.ReactNode; color?: string; className?: string }) {
  return (
    <motion.span
      className={className}
      style={{ color }}
      animate={{ textShadow: [`0 0 6px ${color}40`, `0 0 14px ${color}60`, `0 0 6px ${color}40`] }}
      transition={{ duration: 2.5, repeat: Infinity }}
    >
      {children}
    </motion.span>
  );
}

// Futuristic card wrapper
function GlowCard({ children, className = "", glowColor = "#00f0ff" }: { children: React.ReactNode; className?: string; glowColor?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl overflow-hidden ${className}`}
    >
      <motion.div
        className="absolute inset-0 rounded-2xl p-[1px]"
        style={{ background: `conic-gradient(from 0deg, ${glowColor}20, transparent, ${glowColor}10, transparent)` }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />
      <div className="relative bg-[#0c0c14]/90 backdrop-blur-xl rounded-2xl border border-[#1f1f2e]/50 m-[1px]">
        {children}
      </div>
    </motion.div>
  );
}

// Avatar with rotating green neon border
function NeonAvatar({ photo, name, size = "md" }: { photo?: string; name?: string; size?: "sm" | "md" | "lg" }) {
  const sizeMap = {
    sm: { outer: "w-10 h-10", inner: "inset-[2px]", text: "text-sm", dot: "w-2.5 h-2.5 -bottom-0.5 -right-0.5 border-[2px]" },
    md: { outer: "w-12 h-12", inner: "inset-[2px]", text: "text-base", dot: "w-3 h-3 bottom-0 right-0 border-2" },
    lg: { outer: "w-14 h-14", inner: "inset-[3px]", text: "text-lg", dot: "w-3.5 h-3.5 bottom-0 right-0 border-2" },
  };
  const s = sizeMap[size];
  const initial = name && name.length > 0 ? name.charAt(0).toUpperCase() : "?";

  return (
    <div className={`relative ${s.outer}`}>
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: "conic-gradient(from 0deg, #00ff41, #00f0ff, #00ff41, transparent, #00ff41)" }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-[-2px] rounded-full pointer-events-none"
        animate={{
          boxShadow: [
            "0 0 8px rgba(0,255,65,0.2), 0 0 16px rgba(0,255,65,0.1)",
            "0 0 14px rgba(0,255,65,0.4), 0 0 28px rgba(0,255,65,0.15)",
            "0 0 8px rgba(0,255,65,0.2), 0 0 16px rgba(0,255,65,0.1)",
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <div className={`absolute ${s.inner} rounded-full bg-[#0c0c14] flex items-center justify-center overflow-hidden`}>
        {photo ? (
          <img src={photo} alt={name} className="w-full h-full object-cover rounded-full" />
        ) : (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00f0ff]/30 to-[#8b5cf6]/20 flex items-center justify-center">
            <span className={`${s.text} font-bold text-white`}>{initial}</span>
          </div>
        )}
      </div>
      <motion.div
        className={`absolute ${s.dot} bg-[#00ff41] rounded-full border-[#0c0c14]`}
        animate={{ scale: [1, 1.3, 1], boxShadow: ["0 0 3px rgba(0,255,65,0.5)", "0 0 8px rgba(0,255,65,0.8)", "0 0 3px rgba(0,255,65,0.5)"] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN WITHDRAWAL REQUESTS COMPONENT
// ═══════════════════════════════════════════════════════════════
function AdminWithdrawalRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [dateFilterStart, setDateFilterStart] = useState(() => {
    const d = new Date(); d.setHours(0,0,0,0);
    return d.toISOString().split("T")[0];
  });
  const [dateFilterEnd, setDateFilterEnd] = useState(() => new Date().toISOString().split("T")[0]);
  const [datePreset, setDatePreset] = useState("hoje");

  const applyPreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    if (preset === "hoje") {
      setDateFilterStart(today);
      setDateFilterEnd(today);
    } else if (preset === "7dias") {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      setDateFilterStart(d.toISOString().split("T")[0]);
      setDateFilterEnd(today);
    } else if (preset === "30dias") {
      const d = new Date(now); d.setDate(d.getDate() - 29);
      setDateFilterStart(d.toISOString().split("T")[0]);
      setDateFilterEnd(today);
    } else if (preset === "mes") {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFilterStart(d.toISOString().split("T")[0]);
      setDateFilterEnd(today);
    } else if (preset === "tudo") {
      setDateFilterStart("2020-01-01");
      setDateFilterEnd(today);
    }
  };

  const loadRequests = useCallback(async () => {
    try {
      const res = await api.getAdminWithdrawalRequests();
      if (res.success) setRequests(res.requests || []);
    } catch (err) {
      console.error("Erro ao carregar solicitações de saque:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);
  useEffect(() => {
    const iv = setInterval(loadRequests, 10000);
    return () => clearInterval(iv);
  }, [loadRequests]);

  const handleComplete = async (withdrawalId: string) => {
    setCompleting(withdrawalId);
    try {
      const res = await api.completeWithdrawal(withdrawalId);
      if (res.success) {
        sfx.playSuccess();
        await loadRequests();
      } else {
        sfx.playError();
      }
    } catch (err) {
      console.error("Erro ao completar saque:", err);
      sfx.playError();
    } finally {
      setCompleting(null);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      const d = (r.requestedAt || "").split("T")[0];
      return d >= dateFilterStart && d <= dateFilterEnd;
    });
  }, [requests, statusFilter, dateFilterStart, dateFilterEnd]);

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const completedCount = requests.filter(r => r.status === "completed").length;
  const pendingTotal = requests.filter(r => r.status === "pending").reduce((s: number, r: any) => s + (r.amount || 0), 0);

  const fmtDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  };

  const getDeadlineStatus = (deadline: string) => {
    if (!deadline) return { label: "-", color: "#666", urgent: false };
    const now = new Date().getTime();
    const dl = new Date(deadline).getTime();
    const hoursLeft = (dl - now) / (1000 * 60 * 60);
    if (hoursLeft <= 0) return { label: "Expirado", color: "#ff006e", urgent: true };
    if (hoursLeft <= 6) return { label: `${Math.ceil(hoursLeft)}h restantes`, color: "#ff9f00", urgent: true };
    if (hoursLeft <= 12) return { label: `${Math.ceil(hoursLeft)}h restantes`, color: "#ff9f00", urgent: false };
    return { label: `${Math.ceil(hoursLeft)}h restantes`, color: "#00ff41", urgent: false };
  };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center py-20">
        <motion.div className="w-8 h-8 border-2 border-[#00f0ff] border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-xl flex items-center gap-2">
          <Banknote className="w-5 h-5 text-[#00f0ff]" />
          <NeonText>Solicitações de Saque</NeonText>
        </h2>
        <motion.button
          onClick={loadRequests}
          whileTap={{ scale: 0.95, rotate: 180 }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00f0ff]/10 text-[#00f0ff] rounded-lg hover:bg-[#00f0ff]/15 transition-colors text-xs font-medium border border-[#00f0ff]/20"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </motion.button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <GlowCard glowColor="#ff9f00">
          <div className="p-3 text-center">
            <NeonText color="#ff9f00" className="text-2xl font-black block">{pendingCount}</NeonText>
            <p className="text-gray-500 text-[11px] mt-0.5">Pendentes</p>
          </div>
        </GlowCard>
        <GlowCard glowColor="#00ff41">
          <div className="p-3 text-center">
            <NeonText color="#00ff41" className="text-2xl font-black block">{completedCount}</NeonText>
            <p className="text-gray-500 text-[11px] mt-0.5">Concluídos</p>
          </div>
        </GlowCard>
        <GlowCard glowColor="#ff006e">
          <div className="p-3 text-center">
            <NeonText color="#ff006e" className="text-lg font-black block">R$ {pendingTotal.toFixed(2)}</NeonText>
            <p className="text-gray-500 text-[11px] mt-0.5">Total Pendente</p>
          </div>
        </GlowCard>
      </div>

      {/* Date Filter */}
      <GlowCard glowColor="#8b5cf6">
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-3.5 h-3.5 text-[#8b5cf6]" />
            <span className="text-white text-xs font-semibold">Filtro por Data</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {[
              { id: "hoje", label: "Hoje" },
              { id: "7dias", label: "7 dias" },
              { id: "30dias", label: "30 dias" },
              { id: "mes", label: "Este mês" },
              { id: "tudo", label: "Tudo" },
            ].map((p) => (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => applyPreset(p.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  datePreset === p.id
                    ? "bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/40"
                    : "bg-[#1f1f2e]/50 text-gray-500 border border-[#1f1f2e] hover:text-gray-300"
                }`}
              >
                {p.label}
              </motion.button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFilterStart}
              onChange={(e) => { setDateFilterStart(e.target.value); setDatePreset("custom"); }}
              className="flex-1 px-2 py-1.5 bg-[#0c0c14] border border-[#1f1f2e] rounded-lg text-white text-xs focus:outline-none focus:border-[#8b5cf6]/50"
            />
            <span className="text-gray-600 text-xs">até</span>
            <input
              type="date"
              value={dateFilterEnd}
              onChange={(e) => { setDateFilterEnd(e.target.value); setDatePreset("custom"); }}
              className="flex-1 px-2 py-1.5 bg-[#0c0c14] border border-[#1f1f2e] rounded-lg text-white text-xs focus:outline-none focus:border-[#8b5cf6]/50"
            />
          </div>
        </div>
      </GlowCard>

      {/* Status Filter */}
      <div className="flex gap-2">
        {[
          { id: "all" as const, label: "Todos", color: "#00f0ff" },
          { id: "pending" as const, label: "Pendentes", color: "#ff9f00" },
          { id: "completed" as const, label: "Concluídos", color: "#00ff41" },
        ].map((f) => (
          <motion.button
            key={f.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setStatusFilter(f.id)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
              statusFilter === f.id
                ? ""
                : "border-[#1f1f2e] text-gray-500 hover:text-gray-300"
            }`}
            style={statusFilter === f.id ? {
              background: `linear-gradient(135deg, ${f.color}15, ${f.color}05)`,
              borderColor: `${f.color}40`,
              color: f.color,
            } : {}}
          >
            {f.label}
          </motion.button>
        ))}
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <GlowCard>
          <div className="py-10 text-center">
            <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 3, repeat: Infinity }}>
              <Wallet className="w-10 h-10 text-gray-700 mx-auto mb-2" />
            </motion.div>
            <p className="text-gray-600 text-xs">Nenhuma solicitação de saque encontrada</p>
            <p className="text-gray-700 text-[10px] mt-1">Ajuste os filtros ou aguarde novas solicitações</p>
          </div>
        </GlowCard>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req, idx) => {
            const isPending = req.status === "pending";
            const isCompleted = req.status === "completed";
            const deadline = isPending ? getDeadlineStatus(req.deadline) : null;
            const isCompleting = completing === req.id;

            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <GlowCard glowColor={isPending ? "#ff9f00" : "#00ff41"}>
                  <div className="p-4 space-y-3">
                    {/* Header Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <NeonAvatar name={req.vendorName || req.vendorUsername} size="sm" />
                        <div>
                          <h3 className="text-white font-semibold text-sm">{req.vendorName || "Vendedor"}</h3>
                          <p className="text-gray-500 text-[11px]">@{req.vendorUsername}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <NeonText
                          color={isPending ? "#ff9f00" : "#00ff41"}
                          className="text-xl font-black block"
                        >
                          R$ {(req.amount || 0).toFixed(2)}
                        </NeonText>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5"
                          style={{
                            background: isPending ? "rgba(255,159,0,0.12)" : "rgba(0,255,65,0.12)",
                            color: isPending ? "#ff9f00" : "#00ff41",
                          }}
                        >
                          {isPending ? (
                            <><Clock className="w-2.5 h-2.5" /> Pendente</>
                          ) : (
                            <><BadgeCheck className="w-2.5 h-2.5" /> Concluído</>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-[#0a0a12]/80 rounded-lg p-2 border border-[#1f1f2e]/30">
                        <span className="text-gray-600 block">PIX Destino</span>
                        <span className="text-white font-mono text-[10px] break-all">{req.pixAddress || "Não informado"}</span>
                      </div>
                      <div className="bg-[#0a0a12]/80 rounded-lg p-2 border border-[#1f1f2e]/30">
                        <span className="text-gray-600 block">Solicitado em</span>
                        <span className="text-white">{fmtDate(req.requestedAt)}</span>
                      </div>
                      {isPending && deadline && (
                        <div className="bg-[#0a0a12]/80 rounded-lg p-2 border border-[#1f1f2e]/30">
                          <span className="text-gray-600 block">Prazo</span>
                          <motion.span
                            className="font-semibold"
                            style={{ color: deadline.color }}
                            animate={deadline.urgent ? { opacity: [1, 0.5, 1] } : {}}
                            transition={deadline.urgent ? { duration: 1, repeat: Infinity } : {}}
                          >
                            {deadline.label}
                          </motion.span>
                        </div>
                      )}
                      {isCompleted && req.completedAt && (
                        <div className="bg-[#0a0a12]/80 rounded-lg p-2 border border-[#1f1f2e]/30">
                          <span className="text-gray-600 block">Concluído em</span>
                          <span className="text-[#00ff41]">{fmtDate(req.completedAt)}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    {isPending && (
                      <motion.button
                        whileHover={{ scale: 1.02, boxShadow: "0 0 25px rgba(0,255,65,0.3)" }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleComplete(req.id)}
                        disabled={isCompleting}
                        className="w-full py-3 font-bold text-black text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                        style={{ background: "linear-gradient(135deg, #00ff41 0%, #00f0ff 100%)" }}
                      >
                        {isCompleting ? (
                          <motion.div
                            className="w-4 h-4 border-2 border-black border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                          />
                        ) : (
                          <>
                            <BadgeCheck className="w-4 h-4" />
                            Transferência Realizada com Sucesso
                          </>
                        )}
                      </motion.button>
                    )}
                  </div>
                </GlowCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [copied, setCopied] = useState<string | false>(false);
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hierarchy, setHierarchy] = useState<any>(null);
  const [repairMessage, setRepairMessage] = useState("");
  const [metrics, setMetrics] = useState<any>({});
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [vendorRates, setVendorRates] = useState<Record<string, number>>({});
  const [savingRate, setSavingRate] = useState<string | null>(null);

  // ─── Heartbeat for presence ───
  useEffect(() => {
    api.sendHeartbeat("admin").catch(() => {});
    const hb = setInterval(() => api.sendHeartbeat("admin").catch(() => {}), 15000);
    return () => clearInterval(hb);
  }, []);

  const loadHierarchy = useCallback(async () => {
    try {
      const res = await api.getHierarchy();
      if (res.success) setHierarchy(res.hierarchy);
    } catch (err) {
      console.error("Erro ao carregar hierarquia:", err);
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    try {
      const res = await api.getMetrics("admin");
      if (res.success) setMetrics(res.metrics || {});
    } catch (err) {
      console.error("Erro ao carregar metricas:", err);
    }
  }, []);

  useEffect(() => {
    loadHierarchy();
    loadMetrics();
  }, [loadHierarchy, loadMetrics]);

  useEffect(() => {
    const interval = setInterval(() => { loadHierarchy(); loadMetrics(); }, 10000);
    return () => clearInterval(interval);
  }, [loadHierarchy, loadMetrics]);

  const vendedores = hierarchy?.vendedores || [];
  const adminStats = hierarchy?.admin?.stats || {};

  // Load commission rates for all vendors
  useEffect(() => {
    if (!vendedores.length) return;
    const loadRates = async () => {
      const rates: Record<string, number> = {};
      for (const v of vendedores) {
        try {
          const r = await api.getVendorCommission(v.username);
          if (r.success) rates[v.username] = r.rate;
          else rates[v.username] = 15;
        } catch { rates[v.username] = 15; }
      }
      setVendorRates(rates);
    };
    loadRates();
  }, [vendedores.length]);

  const handleSaveRate = async (username: string) => {
    const rate = vendorRates[username];
    if (rate === undefined) return;
    setSavingRate(username);
    try {
      const r = await api.setVendorCommission(username, rate);
      if (r.success) sfx.playSuccess();
      else sfx.playError();
    } catch { sfx.playError(); }
    finally { setSavingRate(null); }
  };
  const adminCodes = hierarchy?.admin?.codesGenerated || [];
  // Only show unused (pending) codes - used codes disappear
  const pendingAdminCodes = adminCodes.filter((c: any) => !c.used);

  const menuItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", id: "dashboard" },
    { icon: <Users className="w-5 h-5" />, label: "Hierarquia", id: "hierarquia" },
    { icon: <Ticket className="w-5 h-5" />, label: "Convites", id: "convite" },
    { icon: <Percent className="w-5 h-5" />, label: "Taxa", id: "taxa" },
    { icon: <Shield className="w-5 h-5" />, label: "Seguranca", id: "seguranca" },
    { icon: <Key className="w-5 h-5" />, label: "API", id: "api" },
    { icon: <TrendingUp className="w-5 h-5" />, label: "Faturamento", id: "faturamento" },
    { icon: <Banknote className="w-5 h-5" />, label: "Saques", id: "saques" },
    { icon: <Smartphone className="w-5 h-5" />, label: "PWA", id: "pwa" },
  ];

  const copyToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      if (document.execCommand("copy")) {
        setCopied(text);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Erro ao copiar:", err);
    }
    document.body.removeChild(textArea);
  };

  const handleGenerateCode = async () => {
    setLoading(true);
    try {
      const response = await api.generateInviteCode("vendedor", "admin");
      if (response.success) {
        sfx.playCodeAccepted();
        copyToClipboard(response.code.code);
        notif.notifyCodeGenerated(response.code.code);
        await loadHierarchy();
      }
    } catch (error) {
      sfx.playError();
      console.error("Erro ao gerar código:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "convite" || activeTab === "hierarquia") loadHierarchy();
  }, [activeTab]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  };

  const handleDeleteVendor = async (vendorUsername: string) => {
    setDeleting(true);
    try {
      const res = await api.deleteVendorCascade(vendorUsername);
      if (res.success) {
        sfx.playDelete();
        setDeleteConfirm(null);
        setExpandedVendor(null);
        await loadHierarchy();
        await loadMetrics();
      }
    } catch (err: any) {
      sfx.playError();
      console.error("Erro ao deletar vendedor:", err);
      alert("Erro ao deletar: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleEnterVendorPanel = (vendedor: any) => {
    const adminUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    localStorage.setItem("adminOriginalSession", JSON.stringify(adminUser));
    localStorage.setItem("currentUser", JSON.stringify({
      username: vendedor.username,
      name: vendedor.name || vendedor.username,
      role: "vendedor",
      photo: vendedor.photo || "",
      createdAt: vendedor.createdAt,
      adminViewing: true,
    }));
    navigate("/vendedor");
  };

  return (
    <SidebarLayout menuItems={menuItems} activeTab={activeTab} onTabChange={(t) => { sfx.playNavigate(); setActiveTab(t); }} title="Painel Admin" userKey="admin:admin">
      {/* ===================== DASHBOARD ===================== */}
      {activeTab === "dashboard" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="Vendedores"
              value={String(adminStats.totalVendedores || metrics.totalVendedores || 0)}
              icon={<Users className="w-full h-full" />}
              color="cyan"
              trend={{ value: 0, isPositive: true }}
            />
            <StatCard
              title="Faturamento"
              value={`R$ ${(metrics.totalSales || 0).toLocaleString()}`}
              icon={<DollarSign className="w-full h-full" />}
              color="green"
              trend={{ value: 0, isPositive: true }}
            />
            <StatCard
              title="Pedidos"
              value={String(metrics.totalOrders || 0)}
              icon={<ShoppingBag className="w-full h-full" />}
              color="purple"
              trend={{ value: 0, isPositive: true }}
            />
            <StatCard
              title="Taxa Recebida"
              value={`R$ ${(metrics.adminTax || 0).toLocaleString()}`}
              icon={<TrendingUp className="w-full h-full" />}
              color="pink"
              trend={{ value: 0, isPositive: true }}
            />
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <GlowCard glowColor="#00f0ff">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <motion.div
                    className="p-2 bg-[#00f0ff]/15 rounded-lg"
                    animate={{ boxShadow: ["0 0 8px rgba(0,240,255,0)", "0 0 12px rgba(0,240,255,0.3)", "0 0 8px rgba(0,240,255,0)"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <GitBranch className="w-4 h-4 text-[#00f0ff]" />
                  </motion.div>
                  <h3 className="text-white font-bold text-sm">Codigos</h3>
                </div>
                <NeonText color="#00f0ff" className="text-3xl font-black block">
                  {adminStats.totalCodesGenerated || 0}
                </NeonText>
                <div className="flex items-center gap-3 text-xs mt-1">
                  <span className="text-[#00ff41] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {adminStats.totalCodesUsed || 0}
                  </span>
                  <span className="text-[#ff9f00] flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {adminStats.totalCodesAvailable || 0}
                  </span>
                </div>
              </div>
            </GlowCard>

            <GlowCard glowColor="#8b5cf6">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <motion.div
                    className="p-2 bg-[#8b5cf6]/15 rounded-lg"
                    animate={{ boxShadow: ["0 0 8px rgba(139,92,246,0)", "0 0 12px rgba(139,92,246,0.3)", "0 0 8px rgba(139,92,246,0)"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Users className="w-4 h-4 text-[#8b5cf6]" />
                  </motion.div>
                  <h3 className="text-white font-bold text-sm">Clientes</h3>
                </div>
                <NeonText color="#8b5cf6" className="text-3xl font-black block">
                  {adminStats.totalClientes || 0}
                </NeonText>
                <p className="text-gray-500 text-xs mt-1">Via vendedores</p>
              </div>
            </GlowCard>

            <GlowCard glowColor="#ff00ff">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <motion.div
                    className="p-2 bg-[#ff00ff]/15 rounded-lg"
                    animate={{ boxShadow: ["0 0 8px rgba(255,0,255,0)", "0 0 12px rgba(255,0,255,0.3)", "0 0 8px rgba(255,0,255,0)"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Users className="w-4 h-4 text-[#ff00ff]" />
                  </motion.div>
                  <h3 className="text-white font-bold text-sm">Motoristas</h3>
                </div>
                <NeonText color="#ff00ff" className="text-3xl font-black block">
                  {adminStats.totalMotoristas || 0}
                </NeonText>
                <p className="text-gray-500 text-xs mt-1">Via vendedores</p>
              </div>
            </GlowCard>
          </div>

          {/* Charts - Real recharts */}
          <AdminDashboardCharts />
        </motion.div>
      )}

      {/* ===================== HIERARQUIA ===================== */}
      {activeTab === "hierarquia" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-xl flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-[#00f0ff]" />
              <NeonText>Hierarquia</NeonText>
            </h2>
            <motion.button
              onClick={loadHierarchy}
              whileTap={{ scale: 0.95, rotate: 180 }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00f0ff]/10 text-[#00f0ff] rounded-lg hover:bg-[#00f0ff]/15 transition-colors text-xs font-medium border border-[#00f0ff]/20"
            >
              <RefreshCw className="w-3.5 h-3.5" /> <span>Atualizar</span>
            </motion.button>
          </div>

          {/* Admin Node */}
          <GlowCard glowColor="#00f0ff">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <NeonAvatar name="AD" size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-base">Administrador</h3>
                  <p className="text-[#00f0ff] text-xs">@admin - Nivel Superior</p>
                </div>
                <div className="flex items-center gap-3">
                  {[
                    { val: adminStats.totalVendedores || 0, label: "Vend", color: "#00f0ff" },
                    { val: adminStats.totalClientes || 0, label: "Cli", color: "#8b5cf6" },
                    { val: adminStats.totalMotoristas || 0, label: "Mot", color: "#ff00ff" },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <NeonText color={s.color} className="text-xl font-black block">{s.val}</NeonText>
                      <p className="text-gray-500 text-[11px]">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Codes - compact */}
              {adminCodes.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-gray-500 text-xs font-semibold mb-2 flex items-center gap-1.5">
                    <Ticket className="w-3 h-3" /> Codigos do Admin
                  </h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    {adminCodes.map((code: any, i: number) => (
                      <div
                        key={`${code.code}-${i}`}
                        className={`flex items-center justify-between p-2.5 rounded-lg border ${
                          code.used ? "bg-[#00ff41]/5 border-[#00ff41]/15" : "bg-[#ff9f00]/5 border-[#ff9f00]/20"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {code.used ? (
                            <CheckCircle2 className="w-3 h-3 text-[#00ff41] shrink-0" />
                          ) : (
                            <Clock className="w-3 h-3 text-[#ff9f00] shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="text-white font-mono text-xs truncate block">{code.code}</span>
                            {code.used && code.usedBy && (
                              <p className="text-[#00ff41] text-[9px] truncate">@{code.usedBy}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(code.code)}
                          className="p-1 rounded-md hover:bg-[#00f0ff]/10 text-[#00f0ff] transition-colors shrink-0"
                        >
                          {copied === code.code ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vendedores Tree */}
              <div className="space-y-3">
                {vendedores.length === 0 ? (
                  <div className="text-center py-6 text-gray-600">
                    <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 3, repeat: Infinity }}>
                      <Users className="w-10 h-10 mx-auto mb-2" />
                    </motion.div>
                    <p className="text-xs">Nenhum vendedor cadastrado</p>
                    <p className="text-[10px] mt-1">Gere um codigo na aba "Convites"</p>
                  </div>
                ) : (
                  vendedores.map((vendedor: any) => (
                    <GlowCard key={vendedor.username} glowColor="#8b5cf6">
                      <div>
                        <div className="flex items-center justify-between p-3.5">
                          <button
                            onClick={() => setExpandedVendor(expandedVendor === vendedor.username ? null : vendedor.username)}
                            className="flex items-center gap-3 flex-1 text-left min-w-0"
                          >
                            <NeonAvatar photo={vendedor.photo} name={vendedor.name || vendedor.username} size="md" />
                            <div className="min-w-0">
                              <h3 className="text-white font-semibold text-sm truncate">{vendedor.name || "Vendedor"}</h3>
                              <p className="text-gray-500 text-xs truncate">
                                @{vendedor.username} · {vendedor.stats?.totalClientes || 0}C · {vendedor.stats?.totalMotoristas || 0}M
                              </p>
                              {vendedor.inviteCodeUsed && (
                                <p className="text-[#00f0ff]/60 text-[9px] font-mono truncate">{vendedor.inviteCodeUsed}</p>
                              )}
                            </div>
                          </button>
                          <div className="flex items-center gap-1.5 ml-2 shrink-0">
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={(e) => { e.stopPropagation(); handleEnterVendorPanel(vendedor); }}
                              className="p-2 bg-[#00f0ff]/10 text-[#00f0ff] rounded-lg hover:bg-[#00f0ff]/20 transition-colors border border-[#00f0ff]/20"
                              title="Entrar no painel"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(vendedor); }}
                              className="p-2 bg-[#ff006e]/10 text-[#ff006e] rounded-lg hover:bg-[#ff006e]/20 transition-colors border border-[#ff006e]/20"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </motion.button>
                            <button
                              onClick={() => setExpandedVendor(expandedVendor === vendedor.username ? null : vendedor.username)}
                              className="p-1.5 text-gray-500 hover:text-[#00f0ff] transition-colors"
                            >
                              {expandedVendor === vendedor.username ? (
                                <ChevronUp className="w-4 h-4 text-[#00f0ff]" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {expandedVendor === vendedor.username && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="bg-[#0a0a12]/60 p-4 space-y-4 border-t border-[#1f1f2e]/40">
                                {/* Códigos do Vendedor */}
                                <div>
                                  <h4 className="text-gray-500 text-xs font-semibold mb-2 flex items-center gap-1.5">
                                    <Ticket className="w-3 h-3" /> Codigos de {vendedor.name}
                                  </h4>
                                  {vendedor.codesGenerated?.cliente?.length > 0 && (
                                    <div className="mb-2">
                                      <p className="text-[#00f0ff] text-[11px] font-semibold mb-1">Clientes</p>
                                      <div className="space-y-1">
                                        {vendedor.codesGenerated.cliente.map((c: any, i: number) => (
                                          <div key={`c-${i}`} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${c.used ? "bg-[#00ff41]/5 border border-[#00ff41]/10" : "bg-[#ff9f00]/5 border border-[#ff9f00]/10"}`}>
                                            {c.used ? <CheckCircle2 className="w-3 h-3 text-[#00ff41] shrink-0" /> : <Clock className="w-3 h-3 text-[#ff9f00] shrink-0" />}
                                            <span className="text-white font-mono truncate">{c.code}</span>
                                            {c.used && c.usedBy && <span className="text-[#00ff41] text-[9px] shrink-0">@{c.usedBy}</span>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {vendedor.codesGenerated?.motorista?.length > 0 && (
                                    <div className="mb-2">
                                      <p className="text-[#ff00ff] text-[11px] font-semibold mb-1">Motoristas</p>
                                      <div className="space-y-1">
                                        {vendedor.codesGenerated.motorista.map((c: any, i: number) => (
                                          <div key={`m-${i}`} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${c.used ? "bg-[#00ff41]/5 border border-[#00ff41]/10" : "bg-[#ff9f00]/5 border border-[#ff9f00]/10"}`}>
                                            {c.used ? <CheckCircle2 className="w-3 h-3 text-[#00ff41] shrink-0" /> : <Clock className="w-3 h-3 text-[#ff9f00] shrink-0" />}
                                            <span className="text-white font-mono truncate">{c.code}</span>
                                            {c.used && c.usedBy && <span className="text-[#00ff41] text-[9px] shrink-0">@{c.usedBy}</span>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {!vendedor.codesGenerated?.cliente?.length && !vendedor.codesGenerated?.motorista?.length && (
                                    <p className="text-gray-600 text-[10px] italic">Nenhum codigo gerado</p>
                                  )}
                                </div>

                                {/* Clientes */}
                                <div>
                                  <h4 className="text-[#00f0ff] text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                                    <Users className="w-3 h-3" /> Clientes ({vendedor.clientes?.length || 0})
                                  </h4>
                                  {vendedor.clientes?.length > 0 ? (
                                    <div className="space-y-1">
                                      {vendedor.clientes.map((c: any) => (
                                        <div key={c.username} className="flex items-center gap-2 p-2 bg-[#0c0c14]/80 rounded-lg border border-[#1f1f2e]/40">
                                          <NeonAvatar photo={c.photo} name={c.name || c.username} size="sm" />
                                          <div className="flex-1 min-w-0">
                                            <span className="text-white text-xs font-medium truncate block">{c.name || c.username}</span>
                                            <span className="text-gray-600 text-[9px]">@{c.username}</span>
                                          </div>
                                          <span className="text-gray-600 text-[10px] shrink-0">{formatDate(c.registeredAt)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-gray-600 text-[10px] italic">Nenhum cliente</p>
                                  )}
                                </div>

                                {/* Motoristas */}
                                <div>
                                  <h4 className="text-[#ff00ff] text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                                    <Users className="w-3 h-3" /> Motoristas ({vendedor.motoristas?.length || 0})
                                  </h4>
                                  {vendedor.motoristas?.length > 0 ? (
                                    <div className="space-y-1">
                                      {vendedor.motoristas.map((m: any) => (
                                        <div key={m.username} className="flex items-center gap-2 p-2 bg-[#0c0c14]/80 rounded-lg border border-[#1f1f2e]/40">
                                          <NeonAvatar photo={m.photo} name={m.name || m.username} size="sm" />
                                          <div className="flex-1 min-w-0">
                                            <span className="text-white text-xs font-medium truncate block">{m.name || m.username}</span>
                                            <span className="text-gray-600 text-[9px]">@{m.username}</span>
                                          </div>
                                          <span className="text-gray-600 text-[10px] shrink-0">{formatDate(m.registeredAt)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-gray-600 text-[10px] italic">Nenhum motorista</p>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                  <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleEnterVendorPanel(vendedor)}
                                    className="flex-1 py-2 bg-[#00f0ff]/10 text-[#00f0ff] rounded-lg hover:bg-[#00f0ff]/20 transition-colors font-medium text-xs border border-[#00f0ff]/20 flex items-center justify-center gap-1.5"
                                  >
                                    <ExternalLink className="w-3 h-3" /> Entrar como Vendedor
                                  </motion.button>
                                  <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setDeleteConfirm(vendedor)}
                                    className="py-2 px-3 bg-[#ff006e]/10 text-[#ff006e] rounded-lg hover:bg-[#ff006e]/20 transition-colors font-medium text-xs border border-[#ff006e]/20 flex items-center gap-1.5"
                                  >
                                    <Trash2 className="w-3 h-3" /> Deletar
                                  </motion.button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </GlowCard>
                  ))
                )}
              </div>
            </div>
          </GlowCard>
        </motion.div>
      )}

      {/* ===================== CONVITES ===================== */}
      {activeTab === "convite" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <GlowCard>
            <div className="p-5">
              <h2 className="text-white font-bold text-lg mb-1">
                <NeonText>Gerar Codigo de Convite</NeonText>
              </h2>
              <p className="text-gray-500 text-xs mb-4">
                Gere codigos unicos para vendedores. Cada codigo so pode ser usado uma vez.
              </p>

              {/* Steps */}
              <div className="bg-[#00f0ff]/5 border border-[#00f0ff]/15 rounded-xl p-3 mb-4">
                <p className="text-[#00f0ff] text-xs font-medium mb-2">Como funciona:</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Admin gera codigo",
                    "Vendedor usa codigo",
                    "Codigo fica invalido",
                    "Vendedor vinculado",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <motion.span
                        className="w-4 h-4 shrink-0 rounded-full bg-[#00f0ff]/15 text-[#00f0ff] text-[9px] flex items-center justify-center font-bold mt-0.5"
                        animate={{ boxShadow: ["0 0 4px rgba(0,240,255,0)", "0 0 8px rgba(0,240,255,0.3)", "0 0 4px rgba(0,240,255,0)"] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                      >
                        {i + 1}
                      </motion.span>
                      <span className="text-gray-400 text-[11px] leading-tight">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(0,240,255,0.3)" }}
                whileTap={{ scale: 0.97 }}
                onClick={handleGenerateCode}
                disabled={loading}
                className="w-full py-3.5 font-bold text-white text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                style={{ background: "linear-gradient(135deg, #00f0ff 0%, #8b5cf6 100%)" }}
              >
                {loading ? (
                  <motion.div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                ) : copied ? (
                  <><Check className="w-4 h-4" /> Codigo Copiado!</>
                ) : (
                  <><Zap className="w-4 h-4" /> Gerar e Copiar Codigo</>
                )}
              </motion.button>
            </div>
          </GlowCard>

          {/* Code list */}
          <GlowCard glowColor="#8b5cf6">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-sm">Codigos Pendentes ({pendingAdminCodes.length})</h3>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-[#ff9f00] flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> {pendingAdminCodes.length} aguardando
                  </span>
                </div>
              </div>

              {pendingAdminCodes.length === 0 ? (
                <div className="text-center py-6">
                  <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 3, repeat: Infinity }}>
                    <Ticket className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  </motion.div>
                  <p className="text-gray-600 text-xs">Nenhum codigo pendente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...pendingAdminCodes].reverse().map((codeObj: any, i: number) => (
                    <motion.div
                      key={`${codeObj.code}-${i}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-3.5 rounded-xl border transition-all bg-[#ff9f00]/5 border-[#ff9f00]/20 hover:border-[#00f0ff]/30"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 rounded-lg shrink-0 bg-[#ff9f00]/15">
                            <Clock className="w-3.5 h-3.5 text-[#ff9f00]" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-white font-mono text-sm block truncate">{codeObj.code}</span>
                            <p className="text-gray-600 text-[11px]">{formatDate(codeObj.generatedAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 bg-[#ff9f00]/15 text-[#ff9f00] rounded-full text-[11px] font-medium">
                            Aguardando
                          </span>
                          <button
                            onClick={() => copyToClipboard(codeObj.code)}
                            className="p-1.5 rounded-lg hover:bg-[#00f0ff]/10 text-[#00f0ff] transition-colors"
                          >
                            {copied === codeObj.code ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </GlowCard>
        </motion.div>
      )}

      {/* ===================== TAXA ===================== */}
      {activeTab === "taxa" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <GlowCard>
            <div className="p-4">
              <h2 className="text-white font-bold text-lg mb-1">
                <NeonText>Configuracao de Taxas</NeonText>
              </h2>
              <p className="text-gray-500 text-xs mb-4">Defina a % de comissao por vendedor</p>
              <div className="space-y-3">
                {vendedores.length === 0 ? (
                  <p className="text-gray-600 text-center py-6 text-xs">Nenhum vendedor cadastrado</p>
                ) : (
                  vendedores.map((vendedor: any) => {
                    const rate = vendorRates[vendedor.username] ?? 15;
                    const isSaving = savingRate === vendedor.username;
                    return (
                      <motion.div key={vendedor.username}
                        className="p-4 bg-[#0a0a12]/60 rounded-xl border border-[#1f1f2e]/40 space-y-3"
                        whileHover={{ borderColor: "rgba(0,240,255,0.15)" }}
                      >
                        <div className="flex items-center gap-2.5">
                          <NeonAvatar photo={vendedor.photo} name={vendedor.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <h3 className="text-white font-semibold text-sm truncate">{vendedor.name || "Vendedor"}</h3>
                            <p className="text-gray-500 text-[11px]">@{vendedor.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <motion.button whileTap={{ scale: 0.85 }}
                            onClick={() => setVendorRates(prev => ({ ...prev, [vendedor.username]: Math.max(0, (prev[vendedor.username] ?? 15) - 1) }))}
                            className="w-9 h-9 rounded-lg bg-[#1f1f2e] text-gray-400 flex items-center justify-center hover:text-[#ff006e] hover:bg-[#ff006e]/10 transition-colors border border-[#1f1f2e]"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </motion.button>
                          <div className="flex-1 relative">
                            <input
                              type="number" min="0" max="100" step="1"
                              value={rate}
                              onChange={(e) => {
                                const v = Math.min(100, Math.max(0, Number(e.target.value)));
                                setVendorRates(prev => ({ ...prev, [vendedor.username]: v }));
                              }}
                              className="w-full text-center py-2 bg-[#0c0c14] border border-[#1f1f2e] rounded-xl text-white text-xl font-black focus:outline-none focus:border-[#00f0ff]/50 transition-all"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 font-bold text-sm">%</span>
                          </div>
                          <motion.button whileTap={{ scale: 0.85 }}
                            onClick={() => setVendorRates(prev => ({ ...prev, [vendedor.username]: Math.min(100, (prev[vendedor.username] ?? 15) + 1) }))}
                            className="w-9 h-9 rounded-lg bg-[#1f1f2e] text-gray-400 flex items-center justify-center hover:text-[#00ff41] hover:bg-[#00ff41]/10 transition-colors border border-[#1f1f2e]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.9 }}
                            onClick={() => handleSaveRate(vendedor.username)}
                            disabled={isSaving}
                            className="px-4 py-2 rounded-xl font-bold text-xs text-black transition-all disabled:opacity-50 flex items-center gap-1.5"
                            style={{ background: "linear-gradient(135deg, #00f0ff, #8b5cf6)" }}
                          >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Salvar
                          </motion.button>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <div className="flex-1 h-1.5 bg-[#1f1f2e] rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: rate > 30 ? "linear-gradient(90deg, #ff006e, #ff9f00)" : "linear-gradient(90deg, #00ff41, #00f0ff)", width: `${rate}%` }}
                              initial={false}
                              animate={{ width: `${rate}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                          <span className="text-gray-500 font-medium shrink-0">{rate}% Admin · {100 - rate}% Vendedor</span>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </GlowCard>
        </motion.div>
      )}

      {/* ===================== SEGURANCA ===================== */}
      {activeTab === "seguranca" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <GlowCard>
            <div className="p-4">
              <h2 className="text-white font-bold text-lg mb-1">
                <NeonText color="#ff006e">Seguranca</NeonText>
              </h2>
              <p className="text-gray-500 text-xs mb-3">Gerencie senhas e permissoes.</p>
              <div className="space-y-2">
                {vendedores.map((vendedor: any) => (
                  <div key={vendedor.username} className="p-3.5 bg-[#0a0a12]/60 rounded-xl border border-[#1f1f2e]/40 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <NeonAvatar photo={vendedor.photo} name={vendedor.name} size="sm" />
                      <div className="min-w-0">
                        <h3 className="text-white font-semibold text-sm truncate">{vendedor.name || "Vendedor"}</h3>
                        <p className="text-gray-500 text-xs">
                          {(vendedor.stats?.totalClientes || 0) + (vendedor.stats?.totalMotoristas || 0)} vinculados
                        </p>
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      className="px-2.5 py-1.5 bg-[#ff006e]/10 text-[#ff006e] rounded-lg hover:bg-[#ff006e]/20 transition-colors font-medium text-xs border border-[#ff006e]/20 shrink-0"
                    >
                      Trocar Senha
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>
          </GlowCard>

          {/* Repair */}
          <GlowCard glowColor="#8b5cf6">
            <div className="p-4">
              <h2 className="text-white font-bold text-lg mb-1">
                <NeonText color="#8b5cf6">Reparar Vinculos</NeonText>
              </h2>
              <p className="text-gray-500 text-xs mb-3">Reconstrua conexoes perdidas.</p>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(139,92,246,0.3)" }}
                whileTap={{ scale: 0.97 }}
                onClick={async () => {
                  try {
                    setRepairMessage("Reparando...");
                    const response = await api.repairLinks();
                    if (response.success) {
                      setRepairMessage("OK " + response.message);
                      loadHierarchy();
                    }
                  } catch (err: any) {
                    setRepairMessage("Erro: " + err.message);
                  }
                  setTimeout(() => setRepairMessage(""), 5000);
                }}
                className="w-full py-3.5 font-bold text-white text-sm rounded-xl flex items-center justify-center gap-2 transition-all"
                style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #00f0ff 100%)" }}
              >
                <RefreshCw className="w-4 h-4" /> Reparar Vinculos
              </motion.button>
              {repairMessage && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mt-2 text-xs text-center ${repairMessage.includes("OK") ? "text-[#00ff41]" : repairMessage.includes("Erro") ? "text-[#ff006e]" : "text-[#00f0ff]"}`}>
                  {repairMessage}
                </motion.p>
              )}
            </div>
          </GlowCard>
        </motion.div>
      )}

      {/* ===================== API / PIXWAVE ===================== */}
      {activeTab === "api" && (
        <PixwavePanel />
      )}

      {/* ===================== FATURAMENTO ===================== */}
      {activeTab === "faturamento" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AdminFaturamentoCharts />
        </motion.div>
      )}

      {/* ===================== SOLICITAÇÕES DE SAQUE ===================== */}
      {activeTab === "saques" && (
        <AdminWithdrawalRequests />
      )}

      {/* ===================== PWA DIAGNOSTICS ===================== */}
      {activeTab === "pwa" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <GlowCard glowColor="#8b5cf6">
            <div className="p-5">
              <PWADiagnosticsPanel />
            </div>
          </GlowCard>
        </motion.div>
      )}

      {/* ===================== DELETE MODAL ===================== */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-md w-full"
            >
              {/* Glow border */}
              <motion.div
                className="absolute inset-0 rounded-2xl p-[1px]"
                style={{ background: "conic-gradient(from 0deg, #ff006e40, transparent, #ff006e20, transparent)" }}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative bg-[#0c0c14] border border-[#ff006e]/20 rounded-2xl p-5 m-[1px] shadow-[0_0_40px_rgba(255,0,110,0.15)]">
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    className="p-2.5 bg-[#ff006e]/15 rounded-xl"
                    animate={{ boxShadow: ["0 0 8px rgba(255,0,110,0.2)", "0 0 16px rgba(255,0,110,0.4)", "0 0 8px rgba(255,0,110,0.2)"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <AlertTriangle className="w-6 h-6 text-[#ff006e]" />
                  </motion.div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Excluir Vendedor</h3>
                    <p className="text-gray-500 text-xs">Acao irreversivel</p>
                  </div>
                </div>

                <div className="bg-[#ff006e]/5 border border-[#ff006e]/15 rounded-xl p-3 mb-4 space-y-2">
                  <p className="text-white font-medium text-sm">
                    <span className="text-[#00f0ff] font-bold">{deleteConfirm.name || deleteConfirm.username}</span> (@{deleteConfirm.username})
                  </p>
                  <p className="text-[#ff006e] text-xs font-semibold">Serao removidos:</p>
                  <ul className="text-gray-300 text-xs space-y-1 ml-1">
                    {[
                      { dot: "#00f0ff", text: "Conta e todos os dados" },
                      { dot: "#8b5cf6", text: `${deleteConfirm.stats?.totalClientes || 0} cliente(s)` },
                      { dot: "#ff00ff", text: `${deleteConfirm.stats?.totalMotoristas || 0} motorista(s)` },
                      { dot: "#ff9f00", text: "Codigos, produtos, pedidos e chats" },
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <motion.div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.dot }}
                          animate={{ boxShadow: [`0 0 3px ${item.dot}40`, `0 0 6px ${item.dot}70`, `0 0 3px ${item.dot}40`] }}
                          transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                        />
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setDeleteConfirm(null)}
                    disabled={deleting}
                    className="flex-1 py-2.5 bg-[#1f1f2e] text-gray-300 font-semibold rounded-xl hover:bg-[#2a2a3e] transition-colors disabled:opacity-50 text-sm"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    whileHover={{ boxShadow: "0 0 25px rgba(255,0,110,0.4)" }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleDeleteVendor(deleteConfirm.username)}
                    disabled={deleting}
                    className="flex-1 py-2.5 font-bold text-white rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50 text-sm transition-all"
                    style={{ background: "linear-gradient(135deg, #ff006e 0%, #ff0040 100%)" }}
                  >
                    {deleting ? (
                      <motion.div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                    ) : (
                      <><Trash2 className="w-3.5 h-3.5" /> Excluir Tudo</>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </SidebarLayout>
  );
}