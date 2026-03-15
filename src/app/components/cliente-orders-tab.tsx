import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShoppingBag, Package, RefreshCw, Clock, Check, Truck, MapPin,
  Navigation, CheckCircle2, X, ChevronDown, ChevronUp, MessageCircle, LocateFixed, Send, ChevronLeft, ArrowRight,
} from "lucide-react";
import * as api from "../services/api";

const ORDER_STEPS = [
  { key: "pending", label: "Pendente", icon: <Clock className="w-3.5 h-3.5" />, color: "#ff9f00" },
  { key: "accepted", label: "Aceito", icon: <Check className="w-3.5 h-3.5" />, color: "#00f0ff" },
  { key: "preparing", label: "Preparando", icon: <Package className="w-3.5 h-3.5" />, color: "#8b5cf6" },
  { key: "delivering", label: "Enviado", icon: <Truck className="w-3.5 h-3.5" />, color: "#ff9f00" },
  { key: "driver_accepted", label: "Aceito", icon: <Check className="w-3.5 h-3.5" />, color: "#00f0ff" },
  { key: "on_the_way", label: "A Caminho", icon: <Navigation className="w-3.5 h-3.5" />, color: "#ff00ff" },
  { key: "delivered", label: "Entregue", icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "#00ff41" },
];

// Simplified steps for the progress tracker (merging sub-statuses)
const TRACKER_STEPS = [
  { key: "pending", label: "Pendente", icon: <Clock className="w-3.5 h-3.5" />, color: "#ff9f00", matches: ["pending"] },
  { key: "accepted", label: "Aceito", icon: <Check className="w-3.5 h-3.5" />, color: "#00f0ff", matches: ["accepted"] },
  { key: "preparing", label: "Preparo", icon: <Package className="w-3.5 h-3.5" />, color: "#8b5cf6", matches: ["preparing", "delivering"] },
  { key: "driver_accepted", label: "Motorista", icon: <Truck className="w-3.5 h-3.5" />, color: "#00f0ff", matches: ["driver_accepted"] },
  { key: "on_the_way", label: "A Caminho", icon: <Navigation className="w-3.5 h-3.5" />, color: "#ff00ff", matches: ["on_the_way"] },
  { key: "delivered", label: "Entregue", icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "#00ff41", matches: ["delivered"] },
];

function getTrackerIndex(status: string): number {
  return TRACKER_STEPS.findIndex((s) => s.matches.includes(status));
}

function getStepIndex(status: string): number {
  const idx = ORDER_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : -1;
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

function OrderTrackingCard({ order }: { order: any }) {
  const [expanded, setExpanded] = useState(false);
  const statusInfo = getStatusInfo(order.status);
  const currentStepIdx = getStepIndex(order.status);
  const isActive = !["delivered", "cancelled"].includes(order.status);
  const isCancelled = order.status === "cancelled";

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
                    order.status === "delivering" ? <Truck className="w-4 h-4" style={{ color: statusInfo.color }} /> :
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

          {/* Status Description */}
          <p className="text-gray-400 text-[11px] mb-3 pl-0.5">{statusInfo.description}</p>

          {/* Step-by-step Progress Tracker */}
          {!isCancelled && (
            <div className="mb-3">
              <div className="flex items-center justify-between px-0.5">
                {ORDER_STEPS.map((step, i) => {
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
                      {i < ORDER_STEPS.length - 1 && (
                        <div className="flex-1 h-0.5 mx-1 mb-4 rounded-full overflow-hidden bg-[#1f1f2e]">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: currentStepIdx > i ? ORDER_STEPS[i + 1].color : "transparent" }}
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

export function ClienteOrdersTab({ orders, loadOrders, statusLabels }: {
  orders: any[];
  loadOrders: () => void;
  statusLabels: Record<string, { label: string; color: string }>;
}) {
  // Auto-polling for active orders
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasActiveOrders = orders.some((o) => !["delivered", "cancelled"].includes(o.status));

  useEffect(() => {
    if (hasActiveOrders) {
      pollingRef.current = setInterval(loadOrders, 5000);
    } else {
      pollingRef.current = setInterval(loadOrders, 15000);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [hasActiveOrders, loadOrders]);

  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
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
                  <OrderTrackingCard key={order.id} order={order} />
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
    </motion.div>
  );
}