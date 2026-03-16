import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, MessageSquare, ChevronDown, ChevronUp, TrendingUp, Users } from "lucide-react";
import * as api from "../services/api";

interface RatingsCardProps {
  username: string;
  type: "vendor" | "driver";
  glowColor?: string;
}

export function RatingsCard({ username, type, glowColor = "#ff9f00" }: RatingsCardProps) {
  const [data, setData] = useState<{ average: number; total: number; ratings: any[] }>({ average: 0, total: 0, ratings: [] });
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRatings = useCallback(async () => {
    try {
      const res = type === "vendor" ? await api.getVendorRatings(username) : await api.getDriverRatings(username);
      if (res.success) {
        setData({ average: res.average || 0, total: res.total || 0, ratings: res.ratings || [] });
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [username, type]);

  useEffect(() => { loadRatings(); }, [loadRatings]);
  // Refresh every 30 seconds
  useEffect(() => { const i = setInterval(loadRatings, 30000); return () => clearInterval(i); }, [loadRatings]);

  if (loading) return null;

  // Star distribution
  const starDist = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    count: data.ratings.filter((r: any) => r.stars === s).length,
    pct: data.total > 0 ? (data.ratings.filter((r: any) => r.stars === s).length / data.total) * 100 : 0,
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl overflow-hidden">
      <motion.div className="absolute inset-0 rounded-2xl p-[1px]"
        style={{ background: `conic-gradient(from 0deg, ${glowColor}20, transparent, ${glowColor}10, transparent)` }}
        animate={{ rotate: [0, 360] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />
      <div className="relative bg-[#0c0c14]/90 backdrop-blur-xl rounded-2xl border border-[#1f1f2e]/50 m-[1px]">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <motion.div className="p-1.5 rounded-lg border"
              style={{ background: `${glowColor}10`, borderColor: `${glowColor}25` }}
              animate={{ boxShadow: [`0 0 4px ${glowColor}00`, `0 0 10px ${glowColor}30`, `0 0 4px ${glowColor}00`] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Star className="w-4 h-4" style={{ color: glowColor }} />
            </motion.div>
            <span className="text-white font-bold text-sm">Avaliacoes</span>
            {data.total > 0 && (
              <span className="ml-auto text-gray-500 text-[10px] flex items-center gap-1">
                <Users className="w-3 h-3" /> {data.total} avaliacao(oes)
              </span>
            )}
          </div>

          {data.total === 0 ? (
            <div className="py-4 text-center">
              <Star className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-xs">Nenhuma avaliacao ainda</p>
              <p className="text-gray-600 text-[10px] mt-1">As avaliacoes dos clientes aparecerao aqui</p>
            </div>
          ) : (
            <>
              {/* Average Rating Big Display */}
              <div className="flex items-center gap-4 mb-3">
                <div className="text-center">
                  <motion.p
                    className="text-3xl font-black"
                    style={{ color: glowColor }}
                    animate={{ textShadow: [`0 0 8px ${glowColor}40`, `0 0 16px ${glowColor}60`, `0 0 8px ${glowColor}40`] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                  >
                    {data.average.toFixed(1)}
                  </motion.p>
                  <div className="flex items-center gap-0.5 mt-0.5 justify-center">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3 h-3 ${s <= Math.round(data.average) ? "fill-current" : ""}`}
                        style={{ color: s <= Math.round(data.average) ? glowColor : "#333" }}
                      />
                    ))}
                  </div>
                </div>

                {/* Star Distribution Bars */}
                <div className="flex-1 space-y-1">
                  {starDist.map((d) => (
                    <div key={d.stars} className="flex items-center gap-1.5">
                      <span className="text-gray-500 text-[9px] w-2 text-right">{d.stars}</span>
                      <Star className="w-2.5 h-2.5" style={{ color: glowColor }} />
                      <div className="flex-1 h-1.5 bg-[#1f1f2e] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: glowColor }}
                          initial={{ width: 0 }}
                          animate={{ width: `${d.pct}%` }}
                          transition={{ duration: 0.8, delay: (5 - d.stars) * 0.1 }}
                        />
                      </div>
                      <span className="text-gray-600 text-[9px] w-4">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trend indicator */}
              {data.ratings.length >= 3 && (() => {
                const recent3 = data.ratings.slice(0, 3);
                const recentAvg = recent3.reduce((s: number, r: any) => s + r.stars, 0) / recent3.length;
                const trend = recentAvg >= data.average ? "up" : "down";
                return (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-3 ${trend === "up" ? "bg-[#00ff41]/5 border border-[#00ff41]/15" : "bg-[#ff006e]/5 border border-[#ff006e]/15"}`}>
                    <TrendingUp className={`w-3 h-3 ${trend === "up" ? "text-[#00ff41]" : "text-[#ff006e] rotate-180"}`} />
                    <span className={`text-[10px] font-medium ${trend === "up" ? "text-[#00ff41]" : "text-[#ff006e]"}`}>
                      Ultimas 3: {recentAvg.toFixed(1)} ({trend === "up" ? "tendencia positiva" : "tendencia de queda"})
                    </span>
                  </div>
                );
              })()}

              {/* Toggle Recent Reviews */}
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between py-2 px-2.5 bg-[#0a0a12]/60 rounded-xl border border-[#1f1f2e]/40 hover:border-[#1f1f2e] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3 text-gray-500" />
                  <span className="text-gray-400 text-[11px]">Avaliacoes recentes</span>
                </div>
                {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
              </motion.button>

              <AnimatePresence>
                {expanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }} className="overflow-hidden"
                  >
                    <div className="pt-2.5 space-y-2 max-h-[280px] overflow-y-auto">
                      {data.ratings.slice(0, 15).map((r: any, i: number) => (
                        <motion.div key={r.orderId || i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="p-2.5 bg-[#0a0a12]/60 rounded-xl border border-[#1f1f2e]/30"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} className={`w-2.5 h-2.5 ${s <= r.stars ? "fill-current" : ""}`}
                                    style={{ color: s <= r.stars ? glowColor : "#333" }}
                                  />
                                ))}
                              </div>
                              <span className="font-bold text-[10px]" style={{ color: glowColor }}>{r.stars}/5</span>
                            </div>
                            <span className="text-gray-600 text-[9px]">
                              {r.ratedAt ? new Date(r.ratedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500 text-[10px]">@{r.clientUsername}</span>
                            {r.orderId && <span className="text-gray-700 text-[9px]">#{r.orderId.slice(-6).toUpperCase()}</span>}
                          </div>
                          {r.comment && (
                            <p className="text-gray-300 text-[11px] mt-1 leading-relaxed italic">"{r.comment}"</p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
