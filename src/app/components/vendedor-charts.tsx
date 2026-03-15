import { motion } from "motion/react";
import { useId, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, Wallet } from "lucide-react";

function NeonTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const displayLabel = payload[0]?.payload?.label || label;
  return (
    <div className="bg-[#0c0c14]/95 backdrop-blur-xl border border-[#1f1f2e] rounded-xl p-3 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
      <p className="text-gray-400 text-xs mb-1.5 font-medium">{displayLabel}</p>
      {payload.map((entry: any, i: number) => (
        <div key={`tt-${i}`} className="flex items-center gap-2 text-xs">
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
  totalSales: number;
  adminTax: number;
  driverTax: number;
  sellerProfit: number;
  adminCommissionRate: number;
}

export function VendedorDashboardCharts({ salesData, totalSales, adminTax, driverTax, sellerProfit, adminCommissionRate }: VendedorChartsProps) {
  const chartId = useId().replace(/:/g, "");
  const gradientId = `gradVendorSales-${chartId}`;
  const hasData = totalSales > 0;

  const chartSales = useMemo(() => salesData.length > 0
    ? salesData.map((d, i) => ({
        idx: `p${i}`,
        label: d.name || `d${i}`,
        vendas: d.vendas,
      }))
    : [
      { idx: "p0", label: "Seg", vendas: 0 }, { idx: "p1", label: "Ter", vendas: 0 },
      { idx: "p2", label: "Qua", vendas: 0 }, { idx: "p3", label: "Qui", vendas: 0 },
      { idx: "p4", label: "Sex", vendas: 0 }, { idx: "p5", label: "Sab", vendas: 0 },
      { idx: "p6", label: "Dom", vendas: 0 },
    ], [salesData]);

  const idxToLabel = useMemo(() => {
    const map: Record<string, string> = {};
    chartSales.forEach((d) => { map[d.idx] = d.label; });
    return map;
  }, [chartSales]);

  const pieData = useMemo(() => hasData ? [
    { id: "pie-admin", name: `Taxa Admin (${adminCommissionRate}%)`, value: adminTax, color: "#ff00ff" },
    { id: "pie-driver", name: "Taxa Motorista", value: driverTax, color: "#ff9f00" },
    { id: "pie-profit", name: "Lucro Vendedor", value: Math.max(0, sellerProfit), color: "#00ff41" },
  ] : [
    { id: "pie-admin", name: "Taxa Admin", value: 25, color: "#ff00ff" },
    { id: "pie-driver", name: "Taxa Motorista", value: 15, color: "#ff9f00" },
    { id: "pie-profit", name: "Lucro Vendedor", value: 60, color: "#00ff41" },
  ], [hasData, adminTax, driverTax, sellerProfit, adminCommissionRate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* Hidden SVG for gradient definitions - outside Recharts to avoid duplicate key warnings */}
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>

      {/* Area Chart - Vendas Total */}
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
            <h3 className="text-white font-bold text-sm">Vendas Total</h3>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartSales} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#1f1f2e" />
                <XAxis key="xaxis" dataKey="idx" tick={{ fill: "#666", fontSize: 10 }} axisLine={{ stroke: "#1f1f2e" }} tickLine={false} tickFormatter={(v) => idxToLabel[v] || v} />
                <YAxis key="yaxis" tick={{ fill: "#666", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip key="tooltip" content={<NeonTooltip />} />
                <Area key="area-vendas" type="monotone" dataKey="vendas" name="Vendas" stroke="#00f0ff" strokeWidth={2} fill={`url(#${gradientId})`}
                  dot={{ fill: "#00f0ff", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: "#00f0ff", stroke: "#050508", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {!hasData && (
            <p className="text-gray-600 text-[10px] text-center mt-1 italic">Dados aparecerao apos vendas</p>
          )}
        </div>
      </motion.div>

      {/* Pie Chart - Faturamento Distribution */}
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
            <h3 className="text-white font-bold text-sm">Distribuicao do Faturamento</h3>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie key="pie-dist" data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" nameKey="name" strokeWidth={0} isAnimationActive={false}>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-v-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip key="pie-tooltip" content={<PieTooltip />} />
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
          {!hasData && (
            <p className="text-gray-600 text-[10px] text-center mt-1 italic">Valores simulados</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
