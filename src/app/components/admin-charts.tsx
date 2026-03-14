import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar,
} from "recharts";
import {
  TrendingUp, DollarSign, Users, ShoppingBag, Zap, RefreshCw, Loader2,
  ArrowUpRight, ArrowDownRight, Percent, Wallet, BarChart3,
} from "lucide-react";
import * as api from "../services/api";

// ── Period Filter ──
const PERIODS = [
  { label: "7D", days: 7 },
  { label: "15D", days: 15 },
  { label: "30D", days: 30 },
  { label: "60D", days: 60 },
] as const;

function PeriodFilter({ selected, onChange, color = "#00f0ff" }: {
  selected: number; onChange: (days: number) => void; color?: string;
}) {
  return (
    <div className="flex items-center gap-1 bg-[#0a0a12] rounded-xl p-1 border border-[#1f1f2e]/50">
      {PERIODS.map((p) => (
        <motion.button
          key={p.days}
          onClick={() => onChange(p.days)}
          className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
          style={selected === p.days
            ? { background: `${color}20`, color, border: `1px solid ${color}30` }
            : { color: "#666", border: "1px solid transparent" }
          }
          whileTap={{ scale: 0.95 }}
        >
          {p.label}
        </motion.button>
      ))}
    </div>
  );
}

// ── Custom Tooltip ──
function NeonTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const displayLabel = payload[0]?.payload?.displayLabel || payload[0]?.payload?.label || label;
  return (
    <div className="bg-[#0c0c14]/95 backdrop-blur-xl border border-[#1f1f2e] rounded-xl p-3 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
      <p className="text-gray-400 text-xs mb-1.5 font-medium">{displayLabel}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-300">{entry.name}:</span>
          <span className="text-white font-bold">
            {typeof entry.value === "number" ? `R$ ${entry.value.toFixed(2)}` : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-[#0c0c14]/95 backdrop-blur-xl border border-[#1f1f2e] rounded-xl p-3 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
      <div className="flex items-center gap-2 text-xs">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.payload.color }} />
        <span className="text-white font-semibold">{d.name}</span>
      </div>
      <p className="text-gray-300 text-xs mt-1">R$ {Number(d.value).toFixed(2)}</p>
    </div>
  );
}

// ── Glow Card ──
function ChartCard({ children, title, icon, color = "#00f0ff", className = "" }: {
  children: React.ReactNode; title: string; icon: React.ReactNode; color?: string; className?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`relative rounded-2xl overflow-hidden ${className}`}>
      <motion.div
        className="absolute inset-0 rounded-2xl p-[1px]"
        style={{ background: `conic-gradient(from 0deg, ${color}20, transparent, ${color}10, transparent)` }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />
      <div className="relative bg-[#0c0c14]/90 backdrop-blur-xl rounded-2xl border border-[#1f1f2e]/50 m-[1px] p-4">
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            className="p-2 rounded-lg"
            style={{ background: `${color}15`, border: `1px solid ${color}25` }}
            animate={{ boxShadow: [`0 0 6px ${color}00`, `0 0 12px ${color}30`, `0 0 6px ${color}00`] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div style={{ color }}>{icon}</div>
          </motion.div>
          <h3 className="text-white font-bold text-sm">{title}</h3>
        </div>
        {children}
      </div>
    </motion.div>
  );
}

// ── Main Dashboard Charts ──
export function AdminDashboardCharts() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);

  const load = useCallback(async () => {
    try {
      const res = await api.getAdminDetailedMetrics();
      if (res.success) setData(res.detailed);
    } catch (err) {
      console.error("Erro métricas detalhadas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Loader2 className="w-6 h-6 text-[#00f0ff]" />
        </motion.div>
      </div>
    );
  }

  if (!data) return null;

  const { dailySales, commissionPie, vendorBreakdown, totals } = data;

  // Generate mock data if no sales yet (for visual appeal)
  const hasData = totals.revenue > 0;
  const chartDailySales = hasData ? dailySales : dailySales.map((d: any, i: number) => ({
    ...d,
    total: [45, 78, 32, 95, 120, 55, 88][i] || 0,
  }));

  // Ensure unique keys for XAxis by adding idx field
  const chartDailySalesWithIdx = chartDailySales.map((d: any, i: number) => ({
    ...d,
    idx: `d${i}`,
    displayLabel: d.label || `d${i}`,
  }));

  return (
    <div className="space-y-4">
      {/* Hidden SVG for gradient definitions - outside Recharts to avoid duplicate key warnings */}
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>

      {/* Daily Sales Area Chart */}
      <ChartCard title="Vendas - Ultimos 7 Dias" icon={<TrendingUp className="w-4 h-4" />} color="#00f0ff">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartDailySalesWithIdx} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
               <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#1f1f2e" />
               <XAxis key="xaxis" dataKey="idx" tick={{ fill: "#666", fontSize: 10 }} axisLine={{ stroke: "#1f1f2e" }} tickLine={false} tickFormatter={(v: string) => chartDailySalesWithIdx.find((d: any) => d.idx === v)?.displayLabel || v} />
               <YAxis key="yaxis" tick={{ fill: "#666", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
               <Tooltip key="tooltip" content={<NeonTooltip />} />
               <Area
                 key="area-total"
                 type="monotone"
                 dataKey="total"
                 name="Vendas"
                 stroke="#00f0ff"
                 strokeWidth={2}
                 fill="url(#gradCyan)"
                 dot={{ fill: "#00f0ff", strokeWidth: 0, r: 3 }}
                 activeDot={{ r: 5, fill: "#00f0ff", stroke: "#050508", strokeWidth: 2 }}
                 isAnimationActive={false}
               />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {!hasData && (
          <p className="text-gray-600 text-[10px] text-center mt-1 italic">Dados simulados - vendas reais aparecerão aqui</p>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Vendor Comparison Bar Chart */}
        <ChartCard title="Comparativo Vendedores" icon={<BarChart3 className="w-4 h-4" />} color="#8b5cf6">
          {vendorBreakdown.length > 0 ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vendorBreakdown} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                   <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#1f1f2e" />
                   <XAxis
                     key="xaxis"
                     dataKey="name"
                     tick={{ fill: "#666", fontSize: 9 }}
                     axisLine={{ stroke: "#1f1f2e" }}
                     tickLine={false}
                     interval={0}
                     angle={-20}
                     textAnchor="end"
                     height={40}
                   />
                   <YAxis key="yaxis" tick={{ fill: "#666", fontSize: 9 }} axisLine={false} tickLine={false} />
                   <Tooltip key="tooltip" content={<NeonTooltip />} />
                   <Bar key="bar-sales" dataKey="totalSales" name="Vendas" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
                   <Bar key="bar-tax" dataKey="adminTax" name="Taxa Admin" fill="#00f0ff" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <div className="text-center">
                <Users className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                <p className="text-gray-600 text-xs">Nenhum vendedor cadastrado</p>
              </div>
            </div>
          )}
        </ChartCard>

        {/* Commission Distribution Pie Chart */}
        <ChartCard title="Distribuicao de Receita" icon={<Wallet className="w-4 h-4" />} color="#ff00ff">
          {totals.revenue > 0 ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                   <Pie key="pie-comm" data={commissionPie} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" strokeWidth={0} isAnimationActive={false}>
                     {commissionPie.map((entry: any, index: number) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                   <Tooltip key="pie-tooltip" content={<PieTooltip />} />
                   <Legend
                     key="pie-legend"
                     formatter={(value: string) => <span className="text-gray-400 text-[10px]">{value}</span>}
                     iconType="circle"
                     iconSize={8}
                     wrapperStyle={{ paddingTop: 8, fontSize: 10 }}
                   />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center gap-2">
              <motion.div className="w-20 h-20 rounded-full border-2 border-dashed border-[#1f1f2e] flex items-center justify-center"
                animate={{ borderColor: ["#1f1f2e", "#ff00ff30", "#1f1f2e"] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Percent className="w-6 h-6 text-gray-700" />
              </motion.div>
              <p className="text-gray-600 text-xs">Sem dados de receita</p>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

// ── Detailed Faturamento Tab ──
export function AdminFaturamentoCharts() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getAdminDetailedMetricsByPeriod(period);
      if (res.success) setData(res.detailed);
    } catch (err) {
      console.error("Erro metricas faturamento:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Loader2 className="w-6 h-6 text-[#00f0ff]" />
        </motion.div>
      </div>
    );
  }

  if (!data) return null;

  const { vendorBreakdown, dailySales, totals, commissionPie } = data;
  const vendorRanking = [...vendorBreakdown].sort((a: any, b: any) => b.totalSales - a.totalSales);

  // Ensure unique keys for Faturamento daily sales
  const dailySalesWithIdx = dailySales.map((d: any, i: number) => ({
    ...d,
    idx: `f${i}`,
    displayLabel: d.label || `f${i}`,
  }));

  return (
    <div className="space-y-4">
      {/* Period Filter + KPIs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <PeriodFilter selected={period} onChange={setPeriod} color="#00f0ff" />
        {loading && (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Loader2 className="w-4 h-4 text-[#00f0ff]" />
          </motion.div>
        )}
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Receita Total", value: totals.revenue, color: "#00f0ff", icon: <DollarSign className="w-4 h-4" /> },
          { label: "Taxa Admin", value: totals.adminTax, color: "#8b5cf6", icon: <Percent className="w-4 h-4" /> },
          { label: "Taxas Fixas", value: totals.fixedFees, color: "#ff9f00", icon: <Zap className="w-4 h-4" /> },
          { label: "Liquido Vendedores", value: totals.vendorNet, color: "#00ff41", icon: <Wallet className="w-4 h-4" /> },
        ].map((kpi) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0c0c14] border border-[#1f1f2e]/50 rounded-xl p-3"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <div className="p-1 rounded-md" style={{ background: `${kpi.color}15` }}>
                <div style={{ color: kpi.color }}>{kpi.icon}</div>
              </div>
              <span className="text-gray-500 text-[10px] uppercase tracking-wider">{kpi.label}</span>
            </div>
            <motion.p
              className="text-lg font-black"
              style={{ color: kpi.color }}
              animate={{ textShadow: [`0 0 4px ${kpi.color}30`, `0 0 8px ${kpi.color}50`, `0 0 4px ${kpi.color}30`] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              R$ {kpi.value.toFixed(2)}
            </motion.p>
          </motion.div>
        ))}
      </div>

      {/* Revenue Trend */}
      <ChartCard title={`Tendencia de Receita (${period} dias)`} icon={<TrendingUp className="w-4 h-4" />} color="#00f0ff">
        {/* Hidden SVG for gradient - outside Recharts */}
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <defs>
            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailySalesWithIdx} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid key="fat-grid" strokeDasharray="3 3" stroke="#1f1f2e" />
              <XAxis key="fat-xaxis" dataKey="idx" tick={{ fill: "#666", fontSize: 10 }} axisLine={{ stroke: "#1f1f2e" }} tickLine={false} tickFormatter={(v: string) => dailySalesWithIdx.find((d: any) => d.idx === v)?.displayLabel || v} />
              <YAxis key="fat-yaxis" tick={{ fill: "#666", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
              <Tooltip key="fat-tooltip" content={<NeonTooltip />} />
              <Area key="fat-area" type="monotone" dataKey="total" name="Receita" stroke="#00f0ff" strokeWidth={2.5} fill="url(#gradRevenue)"
                dot={{ fill: "#00f0ff", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: "#00f0ff", stroke: "#050508", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Per-Vendor Revenue */}
        <ChartCard title="Receita por Vendedor" icon={<BarChart3 className="w-4 h-4" />} color="#8b5cf6">
          {vendorBreakdown.length > 0 ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vendorBreakdown} margin={{ top: 5, right: 5, left: -15, bottom: 0 }} layout="vertical">
                  <CartesianGrid key="vb-grid" strokeDasharray="3 3" stroke="#1f1f2e" horizontal={false} />
                  <XAxis key="vb-xaxis" type="number" tick={{ fill: "#666", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                  <YAxis key="vb-yaxis" dataKey="name" type="category" tick={{ fill: "#aaa", fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip key="vb-tooltip" content={<NeonTooltip />} />
                  <Bar key="vb-net" dataKey="vendorNet" name="Liquido" fill="#00ff41" radius={[0, 4, 4, 0]} maxBarSize={20} stackId="a" isAnimationActive={false} />
                  <Bar key="vb-tax" dataKey="adminTax" name="Taxa Admin" fill="#00f0ff" radius={[0, 4, 4, 0]} maxBarSize={20} stackId="a" isAnimationActive={false} />
                  <Bar key="vb-fixed" dataKey="fixedFees" name="Taxa Fixa" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={20} stackId="a" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-gray-600 text-xs">Nenhum vendedor</p>
            </div>
          )}
        </ChartCard>

        {/* Commission Pie */}
        <ChartCard title="Distribuicao de Receita" icon={<Percent className="w-4 h-4" />} color="#ff00ff">
          {totals.revenue > 0 ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                   <Pie key="pie-comm" data={commissionPie} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0} isAnimationActive={false}>
                     {commissionPie.map((entry: any, index: number) => (
                       <Cell key={`cell-fat-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                   <Tooltip key="pie-tooltip" content={<PieTooltip />} />
                   <Legend
                     key="pie-legend"
                     formatter={(value: string) => <span className="text-gray-400 text-[10px]">{value}</span>}
                     iconType="circle"
                     iconSize={8}
                     wrapperStyle={{ paddingTop: 8, fontSize: 10 }}
                   />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center gap-2">
              <Percent className="w-8 h-8 text-gray-700" />
              <p className="text-gray-600 text-xs">Sem receita para distribuir</p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Vendor Ranking Table */}
      <ChartCard title="Ranking de Vendedores" icon={<Users className="w-4 h-4" />} color="#00ff41">
        {vendorRanking.length > 0 ? (
          <div className="space-y-2">
            {vendorRanking.map((v: any, i: number) => (
              <motion.div
                key={v.username}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 bg-[#0a0a12]/60 rounded-xl border border-[#1f1f2e]/40"
              >
                {/* Rank Badge */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-black text-xs ${
                  i === 0 ? "bg-[#ffd700]/15 text-[#ffd700] border border-[#ffd700]/30" :
                  i === 1 ? "bg-[#c0c0c0]/15 text-[#c0c0c0] border border-[#c0c0c0]/30" :
                  i === 2 ? "bg-[#cd7f32]/15 text-[#cd7f32] border border-[#cd7f32]/30" :
                  "bg-[#1f1f2e] text-gray-500 border border-[#1f1f2e]"
                }`}>
                  {i + 1}
                </div>

                {/* Avatar + Name */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00f0ff]/20 to-[#8b5cf6]/20 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">{(v.name || "?").charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-xs font-semibold truncate">{v.name}</p>
                    <p className="text-gray-600 text-[10px]">@{v.username} | {v.rate}% taxa</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right shrink-0">
                  <p className="text-[#00ff41] text-sm font-black">R$ {v.totalSales.toFixed(2)}</p>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-gray-500">{v.orderCount} ped</span>
                    <span className="text-[#00f0ff]">{v.clientCount}C</span>
                    <span className="text-[#ff00ff]">{v.driverCount}M</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-6 text-xs">Nenhum vendedor cadastrado</p>
        )}
      </ChartCard>
    </div>
  );
}