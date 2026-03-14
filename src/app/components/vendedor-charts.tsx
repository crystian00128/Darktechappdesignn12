import { motion } from "motion/react";
import { useId } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, Wallet } from "lucide-react";

function NeonTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0c0c14]/95 backdrop-blur-xl border border-[#1f1f2e] rounded-xl p-3 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
      <p className="text-gray-400 text-xs mb-1.5 font-medium">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-300">{entry.name}:</span>
          <span className="text-white font-bold">R$ {Number(entry.value).toFixed(2)}</span>
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

interface VendedorChartsProps {
  salesData: { name: string; vendas: number }[];
  metrics: any;
  adminCommissionRate: number;
}

export function VendedorDashboardCharts({ salesData, metrics, adminCommissionRate }: VendedorChartsProps) {
  const chartId = useId().replace(/:/g, "");
  const hasData = (metrics.totalSales || 0) > 0;

  // Transform salesData for recharts — ensure unique names
  const chartSales = salesData.length > 0
    ? salesData.map((d, i) => ({ ...d, name: d.name || `d${i}` }))
    : [
      { name: "Seg", vendas: 0 }, { name: "Ter", vendas: 0 }, { name: "Qua", vendas: 0 },
      { name: "Qui", vendas: 0 }, { name: "Sex", vendas: 0 }, { name: "Sab", vendas: 0 }, { name: "Dom", vendas: 0 },
    ];

  // Pie data
  const fixedFee = 0.99;
  const totalSales = metrics.totalSales || 0;
  const adminTax = metrics.adminTax || 0;
  const netSales = metrics.netSales || 0;
  const totalTransactions = (metrics.totalOrders || 0) + (metrics.directPixCount || 0);
  const totalFixed = totalTransactions * fixedFee;

  const pieData = hasData ? [
    { name: "Liquido", value: Math.max(0, netSales - totalFixed), color: "#00ff41" },
    { name: `Taxa Admin (${adminCommissionRate}%)`, value: adminTax, color: "#ff00ff" },
    { name: "Taxa Fixa (R$0,99)", value: totalFixed, color: "#8b5cf6" },
  ] : [
    { name: "Liquido", value: 70, color: "#00ff41" },
    { name: "Taxa Admin", value: 20, color: "#ff00ff" },
    { name: "Taxa Fixa", value: 10, color: "#8b5cf6" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* Area Chart - Sales */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl overflow-hidden">
        <motion.div className="absolute inset-0 rounded-2xl p-[1px]"
          style={{ background: "conic-gradient(from 0deg, #00f0ff20, transparent, #00f0ff10, transparent)" }}
          animate={{ rotate: [0, 360] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        <div className="relative bg-[#0c0c14]/90 backdrop-blur-xl rounded-2xl border border-[#1f1f2e]/50 m-[1px] p-4">
          <div className="flex items-center gap-2 mb-4">
            <motion.div className="p-2 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/20"
              animate={{ boxShadow: ["0 0 6px #00f0ff00", "0 0 12px #00f0ff30", "0 0 6px #00f0ff00"] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <TrendingUp className="w-4 h-4 text-[#00f0ff]" />
            </motion.div>
            <h3 className="text-white font-bold text-sm">Vendas da Semana</h3>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartSales} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gradVendorSales-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" />
                <XAxis dataKey="name" tick={{ fill: "#666", fontSize: 10 }} axisLine={{ stroke: "#1f1f2e" }} tickLine={false} />
                <YAxis tick={{ fill: "#666", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip content={<NeonTooltip />} />
                <Area type="monotone" dataKey="vendas" name="Vendas" stroke="#00f0ff" strokeWidth={2} fill={`url(#gradVendorSales-${chartId})`}
                  dot={{ fill: "#00f0ff", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: "#00f0ff", stroke: "#050508", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {!hasData && (
            <p className="text-gray-600 text-[10px] text-center mt-1 italic">Dados aparecerão após vendas</p>
          )}
        </div>
      </motion.div>

      {/* Pie Chart - Distribution */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl overflow-hidden">
        <motion.div className="absolute inset-0 rounded-2xl p-[1px]"
          style={{ background: "conic-gradient(from 0deg, #ff00ff20, transparent, #ff00ff10, transparent)" }}
          animate={{ rotate: [0, 360] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        <div className="relative bg-[#0c0c14]/90 backdrop-blur-xl rounded-2xl border border-[#1f1f2e]/50 m-[1px] p-4">
          <div className="flex items-center gap-2 mb-4">
            <motion.div className="p-2 rounded-lg bg-[#ff00ff]/10 border border-[#ff00ff]/20"
              animate={{ boxShadow: ["0 0 6px #ff00ff00", "0 0 12px #ff00ff30", "0 0 6px #ff00ff00"] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Wallet className="w-4 h-4 text-[#ff00ff]" />
            </motion.div>
            <h3 className="text-white font-bold text-sm">Distribuicao</h3>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" nameKey="name" strokeWidth={0}>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-v-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  formatter={(value: string) => <span className="text-gray-400 text-[10px]">{value}</span>}
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{ paddingTop: 6, fontSize: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {!hasData && (
            <p className="text-gray-600 text-[10px] text-center mt-1 italic">Valores simulados</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}