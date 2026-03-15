import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShoppingBag, Package, RefreshCw, Clock, Check, Truck, MapPin,
  Navigation, CheckCircle2, X, ChevronDown, ChevronUp, MessageCircle, LocateFixed, Send, ChevronLeft, ArrowRight, Timer,
} from "lucide-react";
import * as api from "../services/api";

const ORDER_VISIBILITY_MINUTES = 15;

// Simplified steps for the progress tracker (merging sub-statuses)
const TRACKER_STEPS = [
  { key: "pending", label: "Pendente", icon: <Clock className="w-3.5 h-3.5" />, color: "#ff9f00", matches: ["pending", "pending_payment"] },
  { key: "accepted", label: "Aceito", icon: <Check className="w-3.5 h-3.5" />, color: "#00f0ff", matches: ["accepted"] },
  { key: "preparing", label: "Preparo", icon: <Package className="w-3.5 h-3.5" />, color: "#8b5cf6", matches: ["preparing", "delivering"] },
  { key: "driver_accepted", label: "Motorista", icon: <Truck className="w-3.5 h-3.5" />, color: "#00f0ff", matches: ["driver_accepted"] },
  { key: "on_the_way", label: "A Caminho", icon: <Navigation className="w-3.5 h-3.5" />, color: "#ff00ff", matches: ["on_the_way"] },
  { key: "delivered", label: "Entregue", icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "#00ff41", matches: ["delivered"] },
];

function getTrackerIndex(status: string): number {
  return TRACKER_STEPS.findIndex((s) => s.matches.includes(status));
}

function getStatusInfo(status: string) {
  const map: Record<string, { label: string; color: string; description: string }> = {
    pending: { label: "Pendente", color: "#ff9f00", description: "Aguardando confirmação do vendedor" },
    accepted: { label: "Aceito", color: "#00f0ff", description: "Pedido aceito! Em breve será preparado" },
    preparing: { label: "Preparando", color: "#8b5cf6", description: "Seu pedido está sendo preparado" },
    delivering: { label: "Enviado", color: "#ff9f00", description: "Pedido atribuído a um motorista" },
    driver_accepted: { label: "Motorista Aceitou", color: "#00f0ff", description: "O motorista aceitou! Envie sua localização no chat." },
    on_the_way: { label: "Motorista a Caminho", color: "#ff00ff", description: "O motorista saiu para entrega! Aguarde." },
    delivered: { label: "Entrega Concluída", color: "#00ff41", description: "Pedido entregue com sucesso!" },
    cancelled: { label: "Cancelado", color: "#ff006e", description: "Pedido cancelado" },
  };
  return map[status] || { label: status, color: "#666", description: "" };
}

// Countdown hook for active order visibility
function useOrderCountdown(createdAt: string, isActive: boolean) {
  const [remaining, setRemaining] = useState(() => {
    if (!isActive) return -1;
    const diff = ORDER_VISIBILITY_MINUTES * 60 * 1000 - (Date.now() - new Date(createdAt).getTime());
    return Math.max(0, diff);
  });

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      const diff = ORDER_VISIBILITY_MINUTES * 60 * 1000 - (Date.now() - new Date(createdAt).getTime());
      setRemaining(Math.max(0, diff));
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt, isActive]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const expired = remaining <= 0 && isActive;
  const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const progress = isActive ? remaining / (ORDER_VISIBILITY_MINUTES * 60 * 1000) : 0;
  return { remaining, mins, secs, expired, formatted, progress };
}

function OrderTrackingCard({ order, onOpenChat }: { order: any; onOpenChat?: (order: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const statusInfo = getStatusInfo(order.status);
  const currentStepIdx = getTrackerIndex(order.status);
  const isActive = !["delivered", "cancelled"].includes(order.status);
  const isCancelled = order.status === "cancelled";
  const countdown = useOrderCountdown(order.createdAt, isActive);

  // Time elapsed since creation
  const elapsed = (() => {
    const diff = Date.now() - new Date(order.createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min atrás`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h atrás`;
    return new Date(order.createdAt).toLocaleDateString("pt-BR");
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Animated border glow for active orders */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-2xl p-[1px]"
          style={{ background: `conic-gradient(from 0deg, ${statusInfo.color}30, transparent, ${statusInfo.color}15, transparent)` }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
      )}
      <div className={`relative bg-[#0c0c14] rounded-2xl m-[1px] border ${isActive ? `border-[${statusInfo.color}]/20` : isCancelled ? "border-[#ff006e]/15" : "border-[#00ff41]/15"}`}
        style={{ borderColor: isActive ? `${statusInfo.color}30` : undefined }}
      >
        {/* Status pulse bar */}
        {isActive && (
          <motion.div
            className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
            style={{ background: `linear-gradient(90deg, transparent, ${statusInfo.color}, transparent)` }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <motion.div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${statusInfo.color}15`, border: `1px solid ${statusInfo.color}30` }}
                animate={isActive ? { boxShadow: [`0 0 4px ${statusInfo.color}00`, `0 0 12px ${statusInfo.color}30`, `0 0 4px ${statusInfo.color}00`] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {isCancelled ? <X className="w-4 h-4" style={{ color: statusInfo.color }} /> :
                  order.status === "delivered" ? <CheckCircle2 className="w-4 h-4" style={{ color: statusInfo.color }} /> :
                    ["delivering", "driver_accepted", "on_the_way"].includes(order.status) ? <Truck className="w-4 h-4" style={{ color: statusInfo.color }} /> :
                      <ShoppingBag className="w-4 h-4" style={{ color: statusInfo.color }} />}
              </motion.div>
              <div>
                <p className="text-white font-bold text-sm">#{order.id.slice(-6).toUpperCase()}</p>
                <p className="text-gray-500 text-[10px]">{elapsed}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.span
                className="px-2.5 py-1 rounded-full text-[10px] font-bold border"
                style={{ color: statusInfo.color, backgroundColor: `${statusInfo.color}15`, borderColor: `${statusInfo.color}30` }}
                animate={isActive ? { boxShadow: [`0 0 4px ${statusInfo.color}00`, `0 0 8px ${statusInfo.color}25`, `0 0 4px ${statusInfo.color}00`] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {statusInfo.label.toUpperCase()}
              </motion.span>
            </div>
          </div>

          {/* Countdown Timer for active orders */}
          {isActive && (
            <div className="flex items-center gap-2 mb-2 px-0.5">
              <Timer className="w-3 h-3 text-gray-500" />
              <div className="flex-1 h-1.5 bg-[#1f1f2e] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    width: `${countdown.progress * 100}%`,
                    background: countdown.mins < 3 ? "linear-gradient(90deg, #ff006e, #ff9f00)" : `linear-gradient(90deg, ${statusInfo.color}80, ${statusInfo.color})`,
                  }}
                />
              </div>
              <motion.span
                className={`text-[10px] font-mono font-bold ${countdown.mins < 3 ? "text-[#ff006e]" : "text-gray-400"}`}
                animate={countdown.mins < 3 ? { opacity: [1, 0.4, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {countdown.formatted}
              </motion.span>
            </div>
          )}

          {/* Status Description */}
          <p className="text-gray-400 text-[11px] mb-3 pl-0.5">{statusInfo.description}</p>

          {/* Step-by-step Progress Tracker */}
          {!isCancelled && (
            <div className="mb-3">
              <div className="flex items-center justify-between px-0.5">
                {TRACKER_STEPS.map((step, i) => {
                  const isCompleted = currentStepIdx >= i;
                  const isCurrent = currentStepIdx === i;
                  const stepColor = isCompleted ? step.color : "#1f1f2e";

                  return (
                    <div key={step.key} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <motion.div
                          className="w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all"
                          style={{
                            backgroundColor: isCompleted ? `${step.color}20` : "#0a0a12",
                            borderColor: isCompleted ? step.color : "#1f1f2e",
                            color: isCompleted ? step.color : "#333",
                          }}
                          animate={isCurrent ? { scale: [1, 1.15, 1], boxShadow: [`0 0 4px ${step.color}00`, `0 0 12px ${step.color}40`, `0 0 4px ${step.color}00`] } : {}}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          {step.icon}
                        </motion.div>
                        <span className={`text-[8px] mt-1 font-medium text-center leading-tight ${isCompleted ? "text-gray-300" : "text-gray-600"}`}>
                          {step.label}
                        </span>
                      </div>
                      {i < TRACKER_STEPS.length - 1 && (
                        <div className="flex-1 h-0.5 mx-1 mb-4 rounded-full overflow-hidden bg-[#1f1f2e]">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: currentStepIdx > i ? TRACKER_STEPS[i + 1].color : "transparent" }}
                            initial={{ width: "0%" }}
                            animate={{ width: currentStepIdx > i ? "100%" : currentStepIdx === i ? "50%" : "0%" }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Driver Info for delivering status */}
          {order.driverUsername && order.status === "delivering" && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 p-2.5 bg-[#ff9f00]/5 border border-[#ff9f00]/15 rounded-xl mb-3">
              <motion.div className="w-8 h-8 rounded-full bg-[#ff9f00]/15 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <Truck className="w-4 h-4 text-[#ff9f00]" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-[#ff9f00] text-[11px] font-bold">Aguardando motorista aceitar</p>
                <p className="text-gray-400 text-[10px]">@{order.driverUsername}</p>
              </div>
              <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2.5 h-2.5 rounded-full bg-[#ff9f00]" />
            </motion.div>
          )}

          {/* Driver Info - Motorista Aceitou */}
          {order.driverUsername && order.status === "driver_accepted" && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-[#00f0ff]/5 border border-[#00f0ff]/20 rounded-xl mb-3">
              <div className="flex items-center gap-2.5 mb-2">
                <motion.div className="w-8 h-8 rounded-full bg-[#00f0ff]/15 flex items-center justify-center"
                  animate={{ boxShadow: ["0 0 4px rgba(0,240,255,0)", "0 0 12px rgba(0,240,255,0.3)", "0 0 4px rgba(0,240,255,0)"] }}
                  transition={{ duration: 2, repeat: Infinity }}>
                  <Check className="w-4 h-4 text-[#00f0ff]" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#00f0ff] text-[11px] font-bold">Motorista aceitou a entrega!</p>
                  <p className="text-gray-400 text-[10px]">@{order.driverUsername}</p>
                </div>
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2.5 h-2.5 rounded-full bg-[#00f0ff] shadow-[0_0_8px_rgba(0,240,255,0.5)]" />
              </div>
              <p className="text-[#00f0ff]/70 text-[10px] font-medium pl-10">
                Envie sua localizacao pelo chat para facilitar a entrega!
              </p>
            </motion.div>
          )}

          {/* Driver Info - Motorista a Caminho */}
          {order.driverUsername && order.status === "on_the_way" && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-[#ff00ff]/5 border border-[#ff00ff]/20 rounded-xl mb-3">
              <div className="flex items-center gap-2.5">
                <motion.div className="w-8 h-8 rounded-full bg-[#ff00ff]/15 flex items-center justify-center"
                  animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                  <Navigation className="w-4 h-4 text-[#ff00ff]" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#ff00ff] text-[11px] font-bold">Motorista saiu para entrega!</p>
                  <p className="text-gray-400 text-[10px]">@{order.driverUsername}</p>
                </div>
                <motion.div animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-[#ff00ff]">
                  <Navigation className="w-4 h-4" />
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Entrega Concluída */}
          {order.status === "delivered" && order.driverUsername && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 p-2.5 bg-[#00ff41]/5 border border-[#00ff41]/15 rounded-xl mb-3">
              <div className="w-8 h-8 rounded-full bg-[#00ff41]/15 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-[#00ff41]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#00ff41] text-[11px] font-bold">Entrega Concluída!</p>
                <p className="text-gray-400 text-[10px]">Entregue por @{order.driverUsername}</p>
              </div>
            </motion.div>
          )}

          {/* Chat with Driver Button */}
          {order.driverUsername && ["driver_accepted", "on_the_way"].includes(order.status) && onOpenChat && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => onOpenChat(order)}
              className="w-full mb-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-gradient-to-r from-[#8b5cf6]/15 to-[#00f0ff]/15 border border-[#8b5cf6]/25 text-[#8b5cf6] hover:from-[#8b5cf6]/25 hover:to-[#00f0ff]/25 transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Chat com Motorista
              <LocateFixed className="w-3.5 h-3.5 text-[#00f0ff]" />
              Enviar Localização
            </motion.button>
          )}

          {/* Delivery Address */}
          {order.deliveryAddress && (
            <div className="flex items-start gap-1.5 mb-3 px-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#8b5cf6] shrink-0 mt-0.5" />
              <span className="text-gray-400 text-[11px] leading-tight">{order.deliveryAddress}</span>
            </div>
          )}

          {/* Expandable Order Details */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between py-2 px-2.5 bg-[#0a0a12]/60 rounded-xl border border-[#1f1f2e]/40"
          >
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-[11px]">{order.items?.length || 0} item(ns)</span>
              <span className="text-white font-bold text-xs">R$ {Number(order.total).toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {order.paymentStatus === "paid" && (
                <span className="px-1.5 py-0.5 bg-[#00ff41]/10 text-[#00ff41] text-[9px] font-bold rounded">PIX</span>
              )}
              {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
            </div>
          </motion.button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-2.5 space-y-1">
                  {order.items?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-[11px] py-1 px-1">
                      <span className="text-gray-300">{item.name} <span className="text-gray-500">x{item.qty || 1}</span></span>
                      <span className="text-white font-medium">R$ {(Number(item.price) * (item.qty || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-[#1f1f2e]/60 pt-1.5 mt-1 px-1">
                    <span className="text-gray-400 text-[11px] font-medium">Total</span>
                    <span className="text-[#00ff41] font-bold text-xs">R$ {Number(order.total).toFixed(2)}</span>
                  </div>
                  {order.updatedAt && (
                    <p className="text-gray-600 text-[9px] px-1 pt-1">
                      Atualizado: {new Date(order.updatedAt).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export function ClienteOrdersTab({ orders, loadOrders, statusLabels, currentUsername, currentUserName }: {
  orders: any[];
  loadOrders: () => void;
  statusLabels: Record<string, { label: string; color: string }>;
  currentUsername?: string;
  currentUserName?: string;
}) {
  // Auto-polling for active orders
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasActiveOrders = orders.some((o) => !["delivered", "cancelled"].includes(o.status));

  // Delivery chat state
  const [chatOrder, setChatOrder] = useState<any>(null);
  const [chatMsgs, setChatMsgs] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingLoc, setSendingLoc] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const chatPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadChatMsgs = useCallback(async () => {
    if (!chatOrder?.driverUsername || !currentUsername) return;
    try {
      const res = await api.getMessages(currentUsername, chatOrder.driverUsername);
      if (res.success) setChatMsgs(res.messages || []);
    } catch {}
  }, [currentUsername, chatOrder?.driverUsername]);

  useEffect(() => {
    if (chatOrder) {
      loadChatMsgs();
      chatPollRef.current = setInterval(loadChatMsgs, 3000);
      return () => { if (chatPollRef.current) clearInterval(chatPollRef.current); };
    } else { setChatMsgs([]); }
  }, [chatOrder?.id, loadChatMsgs]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMsgs]);

  const handleSendChat = async () => {
    if (!chatInput.trim() || !chatOrder || !currentUsername) return;
    const text = chatInput.trim();
    setChatInput("");
    try {
      await api.sendMessage(currentUsername, chatOrder.driverUsername, text);
      api.notifyNewMessage(chatOrder.driverUsername, currentUserName || currentUsername, text, "text").catch(() => {});
      loadChatMsgs();
    } catch {}
  };

  const handleSendLocation = async () => {
    if (!chatOrder || !currentUsername || sendingLoc) return;
    setSendingLoc(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });
      const { latitude, longitude } = pos.coords;
      const locText = `📍 Minha localização: https://maps.google.com/?q=${latitude},${longitude}`;
      await api.sendMessage(currentUsername, chatOrder.driverUsername, locText, "location");
      api.notifyNewMessage(chatOrder.driverUsername, currentUserName || currentUsername, "📍 Localização compartilhada", "location").catch(() => {});
      loadChatMsgs();
    } catch {
      alert("Não foi possível obter localização. Verifique as permissões do GPS.");
    } finally { setSendingLoc(false); }
  };

  useEffect(() => {
    if (hasActiveOrders) {
      pollingRef.current = setInterval(loadOrders, 5000);
    } else {
      pollingRef.current = setInterval(loadOrders, 15000);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [hasActiveOrders, loadOrders]);

  const activeOrders = orders.filter((o) => {
    if (["delivered", "cancelled"].includes(o.status)) return false;
    // Hide active orders after 15 minutes
    const elapsed = Date.now() - new Date(o.createdAt).getTime();
    return elapsed < ORDER_VISIBILITY_MINUTES * 60 * 1000;
  });
  const completedOrders = orders.filter((o) => ["delivered", "cancelled"].includes(o.status));

  return (
    <motion.div key="pedidos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4 h-full overflow-y-auto pb-20">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-white font-bold text-lg">Meus Pedidos</h2>
          {hasActiveOrders && (
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="px-2 py-0.5 bg-[#00f0ff]/15 text-[#00f0ff] rounded-full text-[10px] font-bold"
            >
              {activeOrders.length} ativo(s)
            </motion.span>
          )}
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={loadOrders}
          className="p-2 bg-[#1f1f2e] text-[#00f0ff] rounded-xl hover:bg-[#2a2a3e] transition-colors">
          <RefreshCw className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Auto-refresh indicator */}
      {hasActiveOrders && (
        <div className="flex items-center justify-center gap-1.5">
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]"
          />
          <span className="text-gray-600 text-[10px]">Atualização automática a cada 5s</span>
        </div>
      )}

      {orders.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16">
          <motion.div
            animate={{ y: [0, -8, 0], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-20 h-20 rounded-2xl bg-[#00f0ff]/5 border border-[#00f0ff]/10 flex items-center justify-center mb-4"
          >
            <ShoppingBag className="w-10 h-10 text-[#00f0ff]/30" />
          </motion.div>
          <p className="text-gray-400 text-sm font-medium mb-1">Nenhum pedido realizado</p>
          <p className="text-gray-600 text-xs">Acesse a Loja para fazer pedidos</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Package className="w-4 h-4 text-[#00f0ff]" />
                </motion.div>
                <h3 className="text-white font-bold text-sm">Em Andamento</h3>
              </div>
              <div className="space-y-3">
                {[...activeOrders].reverse().map((order) => (
                  <OrderTrackingCard key={order.id} order={order} onOpenChat={currentUsername ? setChatOrder : undefined} />
                ))}
              </div>
            </div>
          )}

          {/* Completed Orders */}
          {completedOrders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <CheckCircle2 className="w-4 h-4 text-gray-500" />
                <h3 className="text-gray-400 font-bold text-sm">Finalizados</h3>
                <span className="ml-auto text-gray-600 text-[10px]">{completedOrders.length}</span>
              </div>
              <div className="space-y-2.5">
                {[...completedOrders].reverse().slice(0, 10).map((order) => (
                  <OrderTrackingCard key={order.id} order={order} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Delivery Chat Fullscreen Overlay ═══ */}
      <AnimatePresence>
        {chatOrder && currentUsername && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[75] bg-[#050508] flex flex-col"
          >
            <div className="shrink-0 bg-[#0a0a12]/95 backdrop-blur-xl border-b border-[#1f1f2e]/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setChatOrder(null)}
                  className="p-1.5 rounded-xl hover:bg-[#1f1f2e] text-gray-400 transition-colors shrink-0">
                  <ChevronLeft className="w-5 h-5" />
                </motion.button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff00ff]/20 to-[#8b5cf6]/15 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-[#ff00ff]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">Motorista @{chatOrder.driverUsername}</p>
                  <p className="text-gray-500 text-[10px]">Pedido #{chatOrder.id?.slice(-6).toUpperCase()}</p>
                </div>
                <motion.span animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}
                  className="px-2 py-1 rounded-full text-[9px] font-bold"
                  style={{ background: chatOrder.status === "driver_accepted" ? "#00f0ff20" : "#ff00ff20", color: chatOrder.status === "driver_accepted" ? "#00f0ff" : "#ff00ff" }}>
                  {chatOrder.status === "driver_accepted" ? "ACEITOU" : "A CAMINHO"}
                </motion.span>
              </div>
              <motion.button whileTap={{ scale: 0.96 }} onClick={handleSendLocation} disabled={sendingLoc}
                className="w-full mt-2.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                style={{ background: "linear-gradient(135deg, #00f0ff15, #8b5cf620)", border: "1px solid #00f0ff30" }}>
                {sendingLoc ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-3.5 h-3.5 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full" />
                ) : (<LocateFixed className="w-4 h-4 text-[#00f0ff]" />)}
                <span className="text-[#00f0ff]">Enviar Minha Localizacao</span>
                <MapPin className="w-3.5 h-3.5 text-[#ff00ff]" />
              </motion.button>
            </div>

            <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {chatMsgs.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <motion.div animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.95, 1, 0.95] }} transition={{ duration: 3, repeat: Infinity }}
                    className="w-16 h-16 rounded-2xl bg-[#1f1f2e]/50 flex items-center justify-center mb-3">
                    <MessageCircle className="w-7 h-7 text-gray-600" />
                  </motion.div>
                  <p className="text-gray-500 text-sm font-medium">Chat com o Motorista</p>
                  <p className="text-[#00f0ff] text-[10px] mt-2 font-medium">Envie sua localizacao para o motorista!</p>
                </div>
              )}
              {chatMsgs.map((msg: any) => {
                const isMine = msg.from === currentUsername;
                const isLocation = msg.type === "location" || msg.text?.includes("maps.google.com");
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${isMine ? "bg-gradient-to-br from-[#00f0ff]/15 to-[#8b5cf6]/15 border border-[#00f0ff]/10" : "bg-[#12121a] border border-[#1f1f2e]/60"}`}>
                      {isLocation ? (
                        <a href={msg.text?.match(/https:\/\/maps\.google\.com[^\s]*/)?.[0] || "#"} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[#00f0ff] text-xs font-medium hover:underline">
                          <MapPin className="w-4 h-4 text-[#ff00ff]" /> <span>Ver no Mapa</span> <ArrowRight className="w-3 h-3" />
                        </a>
                      ) : (<p className="text-white text-[13px] leading-relaxed break-words">{msg.text}</p>)}
                      <p className={`text-[9px] mt-1 ${isMine ? "text-right text-gray-500" : "text-gray-600"}`}>
                        {(() => { try { return new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } })()}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="shrink-0 bg-[#0a0a12]/95 backdrop-blur-xl border-t border-[#1f1f2e]/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 px-4 py-2.5 bg-[#12121a] border border-[#1f1f2e] rounded-2xl text-white text-sm focus:outline-none focus:border-[#00f0ff]/40 placeholder-gray-600 transition-all" />
                <motion.button whileTap={{ scale: 0.85 }} onClick={handleSendChat} disabled={!chatInput.trim()}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 disabled:opacity-30 transition-all"
                  style={{ background: chatInput.trim() ? "linear-gradient(135deg, #00f0ff, #8b5cf6)" : "#1f1f2e" }}>
                  <Send className="w-4 h-4 text-white" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}