import { ReactNode } from "react";
import { motion } from "motion/react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: "cyan" | "purple" | "pink" | "green";
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
}

const colorMap = {
  cyan: {
    bg: "from-[#00f0ff]/15 to-[#00f0ff]/5",
    border: "border-[#00f0ff]/25",
    shadow: "shadow-[0_0_15px_rgba(0,240,255,0.15)]",
    icon: "bg-[#00f0ff]/15 text-[#00f0ff]",
    glow: "#00f0ff",
  },
  purple: {
    bg: "from-[#8b5cf6]/15 to-[#8b5cf6]/5",
    border: "border-[#8b5cf6]/25",
    shadow: "shadow-[0_0_15px_rgba(139,92,246,0.15)]",
    icon: "bg-[#8b5cf6]/15 text-[#8b5cf6]",
    glow: "#8b5cf6",
  },
  pink: {
    bg: "from-[#ff00ff]/15 to-[#ff00ff]/5",
    border: "border-[#ff00ff]/25",
    shadow: "shadow-[0_0_15px_rgba(255,0,255,0.15)]",
    icon: "bg-[#ff00ff]/15 text-[#ff00ff]",
    glow: "#ff00ff",
  },
  green: {
    bg: "from-[#00ff41]/15 to-[#00ff41]/5",
    border: "border-[#00ff41]/25",
    shadow: "shadow-[0_0_15px_rgba(0,255,65,0.15)]",
    icon: "bg-[#00ff41]/15 text-[#00ff41]",
    glow: "#00ff41",
  },
};

export function StatCard({ title, value, icon, color, trend, onClick }: StatCardProps) {
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, boxShadow: `0 0 25px ${c.glow}25` }}
      className={`relative bg-gradient-to-br ${c.bg} border ${c.border} rounded-2xl p-4 ${c.shadow} backdrop-blur-sm ${onClick ? "cursor-pointer active:scale-[0.97] transition-transform" : ""}`}
      onClick={onClick}
    >
      {/* Subtle top glow */}
      <motion.div
        className="absolute top-0 left-[20%] right-[20%] h-[1px] rounded-full"
        style={{ background: `linear-gradient(90deg, transparent, ${c.glow}40, transparent)` }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-gray-400 text-xs font-medium mb-1.5 truncate">{title}</p>
          <h3 className="text-2xl md:text-3xl font-bold text-white truncate">{value}</h3>
          {trend && (
            <div className="flex items-center gap-1 mt-0.5">
              <span
                className={`text-xs font-medium ${
                  trend.isPositive ? "text-[#00ff41]" : "text-[#ff006e]"
                }`}
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-gray-600 text-[10px] hidden sm:inline">vs. mês anterior</span>
            </div>
          )}
        </div>
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className={`${c.icon} p-2.5 rounded-xl shrink-0 ml-2`}
        >
          <div className="w-5 h-5">{icon}</div>
        </motion.div>
      </div>
    </motion.div>
  );
}