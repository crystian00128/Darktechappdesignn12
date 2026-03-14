import { motion } from "motion/react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, Wallet, Truck, DollarSign } from "lucide-react";

function NeonTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const displayLabel = payload[0]?.payload?.displayLabel || payload[0]?.payload?.name || label;
  return (
    <div className="bg-[#0c0c14]/95 backdrop-blur-xl border border-[#1f1f2e] rounded-xl p-3 shadow-[0_0_20px_rgba(255,0,255,0.15)]">
      <p className="text-gray-400 text-xs mb-1.5 font-medium">{displayLabel}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-300">{entry.name}:</span>
          <span className="text-white font-bold">
            {typeof entry.value === "number" && entry.name !== "Entregas"
              ? `R$ ${entry.value.toFixed(2)}`
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ children, title, icon, color = "#ff00ff", className = "" }: {
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

interface MotoristaChartsProps {
  deliveryData: { name: string; entregas: number; ganhos: number }[];
  metrics: any;
}

export function MotoristaDashboardCharts({ deliveryData, metrics }: MotoristaChartsProps) {
  const hasData = (metrics.totalDeliveries || 0) > 0;

  // Use idx-based unique keys to prevent Recharts duplicate key warnings
  const chartDeliveries = (deliveryData.length > 0 ? deliveryData : [
    { name: "Seg", entregas: 0, ganhos: 0 },
    { name: "Ter", entregas: 0, ganhos: 0 },
    { name: "Qua", entregas: 0, ganhos: 0 },
    { name: "Qui", entregas: 0, ganhos: 0 },
    { name: "Sex", entregas: 0, ganhos: 0 },
    { name: "Sab", entregas: 0, ganhos: 0 },
    { name: "Dom", entregas: 0, ganhos: 0 },
  ]).map((d, i) => ({
    ...d,
    idx: `m${i}`,
    displayLabel: d.name || `m${i}`,
  }));

  // Build lookup for tick formatting
  const idxToLabel: Record<string, string> = {};
  chartDeliveries.forEach((d) => { idxToLabel[d.idx] = d.displayLabel; });

  // Pie data - delivery status breakdown
  const totalDelivered = metrics.totalDeliveries || 0;
  const totalPending = metrics.pendingDeliveries || 0;
  const totalActive = metrics.totalOrders || 0;
  const cancelled = Math.max(0, totalActive - totalDelivered - totalPending);

  const pieData = hasData ? [
    { name: "Entregues", value: totalDelivered, color: "#00ff41" },
    { name: "Pendentes", value: totalPending, color: "#ff9f00" },
    { name: "Outros", value: cancelled, color: "#8b5cf6" },
  ].filter(d => d.value > 0) : [
    { name: "Entregues", value: 60, color: "#00ff41" },
    { name: "Pendentes", value: 25, color: "#ff9f00" },
    { name: "Outros", value: 15, color: "#8b5cf6" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* Hidden SVG for gradient definitions - outside Recharts */}
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="gradMotoristaGanhos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ff00ff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ff00ff" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>

      {/* Area Chart - Ganhos */}
      <ChartCard title="Ganhos da Semana" icon={<DollarSign className="w-4 h-4" />} color="#ff00ff">
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartDeliveries} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#1f1f2e" />
              <XAxis key="xaxis" dataKey="idx" tick={{ fill: "#666", fontSize: 10 }} axisLine={{ stroke: "#1f1f2e" }} tickLine={false} tickFormatter={(v) => idxToLabel[v] || v} />
              <YAxis key="yaxis" tick={{ fill: "#666", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
              <Tooltip key="tooltip" content={<NeonTooltip />} />
              <Area key="area-ganhos" type="monotone" dataKey="ganhos" name="Ganhos" stroke="#ff00ff" strokeWidth={2} fill="url(#gradMotoristaGanhos)"
                dot={{ fill: "#ff00ff", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: "#ff00ff", stroke: "#050508", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {!hasData && (
          <p className="text-gray-600 text-[10px] text-center mt-1 italic">Dados aparecerão após entregas</p>
        )}
      </ChartCard>

      {/* Bar Chart - Entregas */}
      <ChartCard title="Entregas por Dia" icon={<Truck className="w-4 h-4" />} color="#00f0ff">
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartDeliveries} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid key="bar-grid" strokeDasharray="3 3" stroke="#1f1f2e" />
              <XAxis key="bar-xaxis" dataKey="idx" tick={{ fill: "#666", fontSize: 10 }} axisLine={{ stroke: "#1f1f2e" }} tickLine={false} tickFormatter={(v) => idxToLabel[v] || v} />
              <YAxis key="bar-yaxis" tick={{ fill: "#666", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip key="bar-tooltip" content={<NeonTooltip />} />
              <Bar key="bar-entregas" dataKey="entregas" name="Entregas" fill="#00f0ff" radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {!hasData && (
          <p className="text-gray-600 text-[10px] text-center mt-1 italic">Dados simulados</p>
        )}
      </ChartCard>

      {/* Pie Chart - Status Distribution */}
      <ChartCard title="Status das Entregas" icon={<Wallet className="w-4 h-4" />} color="#00ff41" className="lg:col-span-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie key="pie-status" data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value" strokeWidth={0} isAnimationActive={false}>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-m-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  key="pie-legend"
                  formatter={(value: string) => <span className="text-gray-400 text-[10px]">{value}</span>}
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{ paddingTop: 6, fontSize: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {[
              { label: "Total Entregas", value: String(totalDelivered), color: "#00ff41", icon: <Truck className="w-3.5 h-3.5" /> },
              { label: "Ganhos Totais", value: `R$ ${(metrics.totalCommission || 0).toFixed(2)}`, color: "#ff00ff", icon: <DollarSign className="w-3.5 h-3.5" /> },
              { label: "Pendentes", value: String(totalPending), color: "#ff9f00", icon: <TrendingUp className="w-3.5 h-3.5" /> },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-2.5 p-2.5 bg-[#0a0a12]/60 rounded-xl border border-[#1f1f2e]/40">
                <div className="p-1.5 rounded-lg" style={{ background: `${stat.color}15` }}>
                  <div style={{ color: stat.color }}>{stat.icon}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider">{stat.label}</p>
                  <p className="text-white font-bold text-sm">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        {!hasData && (
          <p className="text-gray-600 text-[10px] text-center mt-1 italic">Valores simulados - dados reais aparecerão após entregas</p>
        )}
      </ChartCard>
    </div>
  );
}