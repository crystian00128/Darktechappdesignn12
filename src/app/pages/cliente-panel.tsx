import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Check,
  Loader,
  Package,
  X,
  LogOut,
  Link,
  RefreshCw,
  MapPin,
  QrCode,
  Minus,
  Copy,
  Truck,
  Clock,
  ChefHat,
  Navigation,
  CheckCircle2,
} from "lucide-react";
import { useUserCreator } from "../hooks/useUserCreator";
import { useCallSystem } from "../hooks/useCallSystem";
import { IncomingCallOverlay, ActiveCallOverlay } from "../components/call-overlays";
import * as api from "../services/api";
import * as sfx from "../services/sounds";
import { ChatPanel } from "../components/chat-panel";
import { NotificationBell } from "../components/notification-bell";
import { ClienteOrdersTab } from "../components/cliente-orders-tab";

const getAvatarText = (text: string | null | undefined): string => {
  if (!text || typeof text !== "string") return "??";
  return text.substring(0, 2).toUpperCase();
};

export function ClientePanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"chat" | "adicionar" | "loja" | "pedidos">("chat");
  const [inviteCode, setInviteCode] = useState("");
  const [linkingCode, setLinkingCode] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState("");
  const [linkError, setLinkError] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<{ product: any; qty: number }[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"waiting" | "generating" | "pix_ready" | "polling" | "success" | "error" | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [pixInvoice, setPixInvoice] = useState<any>(null);
  const [pixError, setPixError] = useState("");
  const [pixCopied, setPixCopied] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [feePreview, setFeePreview] = useState<any>(null);
  const [loadingFees, setLoadingFees] = useState(false);
  const pixPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const { creator: vendedor, loading, refetch } = useUserCreator(currentUser.username);
  const callSystem = useCallSystem(currentUser.username);

  const handleStartCall = useCallback(async (to: string, type: "voice" | "video", _toName: string) => {
    await callSystem.startCall(to, type, currentUser.name || currentUser.username, currentUser.photo);
  }, [callSystem.startCall, currentUser.name, currentUser.username, currentUser.photo]);

  useEffect(() => {
    if (vendedor?.username) {
      loadProducts();
    }
    loadOrders();
  }, [vendedor]);

  const loadProducts = async () => {
    if (!vendedor?.username) return;
    try {
      const res = await api.getProducts(vendedor.username);
      if (res.success) setProducts(res.products?.filter((p: any) => p.active) || []);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await api.getClientOrders(currentUser.username);
      if (res.success) setOrders(res.orders || []);
    } catch (err) {
      console.error("Erro ao carregar pedidos:", err);
    }
  };

  const addToCart = (product: any) => {
    sfx.playClick();
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) => c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    sfx.playPinDelete();
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === productId);
      if (existing && existing.qty > 1) {
        return prev.map((c) => c.product.id === productId ? { ...c, qty: c.qty - 1 } : c);
      }
      return prev.filter((c) => c.product.id !== productId);
    });
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.product.price * c.qty, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);

  // Load fee preview when cart changes
  useEffect(() => {
    if (cart.length > 0 && vendedor?.username && cartTotal > 0) {
      setLoadingFees(true);
      api.getOrderFeePreview(vendedor.username, cartTotal)
        .then((res) => {
          if (res.success) setFeePreview(res.fees);
        })
        .catch(() => {})
        .finally(() => setLoadingFees(false));
    } else {
      setFeePreview(null);
    }
  }, [cartTotal, vendedor?.username, cart.length]);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setShowPaymentModal(true);
    setPaymentStatus("generating");
    setPixInvoice(null);
    setPixError("");
    setPixCopied(false);

    try {
      const orderRes = await api.createOrder({
        clientUsername: currentUser.username,
        vendorUsername: vendedor!.username,
        items: cart.map((c) => ({ name: c.product.name, price: c.product.price, qty: c.qty, productId: c.product.id })),
        total: cartTotal,
        deliveryAddress,
        paymentSource: "client",
      });

      if (!orderRes.success) throw new Error("Erro ao criar pedido");
      const orderId = orderRes.order?.id || `order-${Date.now()}`;

      try {
        const pixRes = await api.createPixwaveInvoice({
          description: `Pedido #${orderId.substring(0, 8)} - ${cart.map(c => c.product.name).join(", ")}`,
          price: cartTotal,
          externalId: orderId,
          metadata: {
            orderId,
            vendorUsername: vendedor!.username,
            clientUsername: currentUser.username,
          },
        });

        if (pixRes.success && pixRes.invoice) {
          setPixInvoice(pixRes.invoice);
          setPaymentStatus("pix_ready");

          if (pixPollingRef.current) clearInterval(pixPollingRef.current);
          pixPollingRef.current = setInterval(async () => {
            try {
              const statusRes = await api.getPixwaveInvoice(pixRes.invoice.id);
              if (statusRes.success && statusRes.invoice?.status === "paid") {
                if (pixPollingRef.current) clearInterval(pixPollingRef.current);
                setPaymentStatus("success");
                setCart([]);
                setDeliveryAddress("");
                loadOrders();
                setTimeout(() => {
                  setShowPaymentModal(false);
                  setPaymentStatus(null);
                  setShowCart(false);
                  setPixInvoice(null);
                }, 3000);
              } else if (statusRes.invoice?.status === "expired" || statusRes.invoice?.status === "cancelled") {
                if (pixPollingRef.current) clearInterval(pixPollingRef.current);
                setPaymentStatus("error");
                setPixError("PIX expirado ou cancelado. Tente novamente.");
              }
            } catch { /* silently continue polling */ }
          }, 5000);
          return;
        }
      } catch (pixErr) {
        console.log("PixWave unavailable, completing order directly:", pixErr);
      }

      sfx.playSuccess();
      setPaymentStatus("success");
      setCart([]);
      setDeliveryAddress("");
      loadOrders();
      setTimeout(() => {
        setShowPaymentModal(false);
        setPaymentStatus(null);
        setShowCart(false);
      }, 2500);

    } catch (err: any) {
      sfx.playError();
      console.error("Erro ao criar pedido:", err);
      setPaymentStatus("error");
      setPixError(err.message || "Erro ao processar pedido");
    }
  };

  useEffect(() => {
    return () => { if (pixPollingRef.current) clearInterval(pixPollingRef.current); };
  }, []);

  const handleCopyPix = (text: string) => {
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
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2000);
  };

  const closePaymentModal = () => {
    if (pixPollingRef.current) clearInterval(pixPollingRef.current);
    setShowPaymentModal(false);
    setPaymentStatus(null);
    setPixInvoice(null);
    setPixError("");
  };

  const handleAddVendedor = async () => {
    if (!inviteCode || inviteCode.trim() === "") {
      sfx.playWarning();
      setLinkError("Por favor, insira um codigo de convite");
      return;
    }
    try {
      setLinkingCode(true);
      setLinkError("");
      setLinkSuccess("");
      const response = await api.linkUser(currentUser.username, inviteCode.trim());
      if (response.success) {
        sfx.playSuccess();
        setLinkSuccess(`Conectado com sucesso ao vendedor ${response.creator?.name || response.message}!`);
        setInviteCode("");
        const updatedUser = { ...currentUser, createdBy: response.creator?.username };
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        refetch();
        setTimeout(() => { setActiveTab("chat"); setLinkSuccess(""); }, 2000);
      }
    } catch (err) {
      sfx.playError();
      setLinkError(err instanceof Error ? err.message : "Erro ao vincular codigo");
    } finally {
      setLinkingCode(false);
    }
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending_payment: { label: "Aguardando Pagamento", color: "#f59e0b" },
    pending: { label: "Pendente", color: "#ff9f00" },
    accepted: { label: "Aceito", color: "#00f0ff" },
    preparing: { label: "Preparando", color: "#8b5cf6" },
    delivering: { label: "Enviado", color: "#ff9f00" },
    driver_accepted: { label: "Motorista Aceitou", color: "#00f0ff" },
    on_the_way: { label: "Motorista a Caminho", color: "#ff00ff" },
    delivered: { label: "Entrega Concluída", color: "#00ff41" },
    cancelled: { label: "Cancelado", color: "#ff006e" },
  };

  const chatContacts = vendedor
    ? [{ username: vendedor.username, name: vendedor.name || "Vendedor", photo: vendedor.photo || "", role: vendedor.role }]
    : [];

  // ─── Sidebar unread badge polling ───
  const [totalUnread, setTotalUnread] = useState(0);
  useEffect(() => {
    if (!currentUser.username || chatContacts.length === 0) return;
    const poll = async () => {
      try {
        const contacts = chatContacts.map((c) => c.username);
        const res = await api.getUnreadCounts(currentUser.username, contacts);
        if (res.success) {
          const total = Object.values(res.counts || {}).reduce((a: number, b: any) => a + (b as number), 0);
          setTotalUnread(total as number);
        }
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [currentUser.username, chatContacts.length]);

  if (loading) {
    return (
      <div className="h-dvh bg-[#050508] flex items-center justify-center">
        <div className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="inline-block mb-4">
            <Loader className="w-12 h-12 text-[#00f0ff]" />
          </motion.div>
          <p className="text-white font-semibold text-base">Carregando dados...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "chat" as const, icon: <MessageSquare className="w-5 h-5" />, label: "Chat", badge: totalUnread > 0 ? totalUnread : undefined },
    { id: "loja" as const, icon: <ShoppingBag className="w-5 h-5" />, label: "Loja" },
    { id: "pedidos" as const, icon: <Package className="w-5 h-5" />, label: "Pedidos" },
    { id: "adicionar" as const, icon: <Plus className="w-5 h-5" />, label: "Vincular" },
  ];

  return (
    <div className="h-dvh bg-[#050508] flex flex-col relative overflow-hidden select-none">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div className="absolute top-[-10%] left-[-5%] w-[300px] h-[300px] rounded-full" style={{ background: "radial-gradient(circle, rgba(0,240,255,0.12) 0%, transparent 60%)" }}
          animate={{ x: [0, 60, -30, 0], y: [0, 40, -20, 0], scale: [1, 1.3, 0.9, 1] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute bottom-[-10%] right-[-5%] w-[300px] h-[300px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,0,255,0.1) 0%, transparent 60%)" }}
          animate={{ x: [0, -50, 30, 0], y: [0, -40, 20, 0], scale: [1.1, 0.8, 1.3, 1.1] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }} />
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: `linear-gradient(rgba(0,240,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.5) 1px, transparent 1px)`, backgroundSize: "50px 50px" }} />
        <motion.div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00f0ff]/15 to-transparent"
          animate={{ top: ["-2%", "102%"] }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-[#0a0a12]/80 backdrop-blur-xl border-b border-[#1f1f2e]/60 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex-1 min-w-0">
          <motion.h1 className="text-lg font-bold truncate">
            <motion.span className="bg-gradient-to-r from-[#00f0ff] via-[#8b5cf6] to-[#ff00ff] bg-clip-text text-transparent bg-[length:200%_auto]"
              animate={{ backgroundPosition: ["0% center", "200% center"] }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }}>
              Painel Cliente
            </motion.span>
          </motion.h1>
          {vendedor && (
            <p className="text-gray-500 text-xs truncate">Vendedor: <span className="text-[#00f0ff]">{vendedor.name}</span></p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <NotificationBell />
          {cartCount > 0 && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowCart(true)}
              className="relative p-2.5 rounded-xl bg-[#00f0ff]/15 text-[#00f0ff]">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ff006e] text-white text-[11px] rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            </motion.button>
          )}
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowLogoutConfirm(true)}
            className="p-2.5 rounded-xl bg-[#ff006e]/15 text-[#ff006e]">
            <LogOut className="w-5 h-5" />
          </motion.button>
        </div>
        <motion.div className="absolute bottom-0 left-0 right-0 h-[1px]"
          style={{ background: "linear-gradient(90deg, transparent, #00f0ff30, #8b5cf630, transparent)" }}
          animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 3, repeat: Infinity }} />
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden relative z-10">
        <AnimatePresence mode="wait">
          {/* Chat */}
          {activeTab === "chat" && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              {vendedor ? (
                <ChatPanel currentUsername={currentUser.username} contacts={chatContacts} accentColor="#00f0ff" onStartCall={handleStartCall} autoOpenChat={chatContacts.length === 1 ? chatContacts[0].username : undefined} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6">
                  <div className="bg-[#12121a] border border-[#1f1f2e] rounded-2xl p-8 text-center w-full max-w-sm">
                    <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-base mb-4">Nenhum vendedor conectado</p>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => setActiveTab("adicionar")}
                      className="w-full py-3 bg-gradient-to-r from-[#00f0ff] to-[#8b5cf6] text-white font-semibold rounded-xl text-sm">
                      Adicionar Vendedor
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Loja */}
          {activeTab === "loja" && (
            <motion.div key="loja" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-40">
                <h2 className="text-white font-bold text-lg">
                  {vendedor ? `Loja de ${vendedor.name}` : "Loja"}
                </h2>
                {!vendedor ? (
                  <div className="bg-[#12121a] border border-[#1f1f2e] rounded-2xl p-8 text-center">
                    <p className="text-gray-400 text-sm">Conecte-se a um vendedor para ver os produtos</p>
                  </div>
                ) : products.length === 0 ? (
                  <div className="bg-[#12121a] border border-[#1f1f2e] rounded-2xl p-8 text-center">
                    <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">O vendedor ainda nao adicionou produtos</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {products.map((product) => {
                      const inCart = cart.find((c) => c.product.id === product.id);
                      return (
                        <motion.div key={product.id} whileTap={{ scale: 0.97 }}
                          className="bg-[#12121a] border border-[#1f1f2e] rounded-2xl p-3 hover:border-[#00f0ff]/50 transition-all">
                          <div className="w-full aspect-square bg-gradient-to-br from-[#00f0ff]/20 to-[#8b5cf6]/20 rounded-xl mb-3 flex items-center justify-center">
                            <Package className="w-10 h-10 text-[#00f0ff]" />
                          </div>
                          <h3 className="text-white font-bold text-sm mb-1 truncate">{product.name}</h3>
                          <p className="text-[#00ff41] font-bold text-lg mb-2">R$ {Number(product.price).toFixed(2)}</p>
                          {inCart ? (
                            <div className="flex items-center justify-between">
                              <button onClick={() => removeFromCart(product.id)} className="w-9 h-9 rounded-lg bg-[#1f1f2e] text-white flex items-center justify-center">
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="text-white font-bold text-base">{inCart.qty}</span>
                              <button onClick={() => addToCart(product)} className="w-9 h-9 rounded-lg bg-[#00f0ff]/20 text-[#00f0ff] flex items-center justify-center">
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <motion.button whileTap={{ scale: 0.9 }} onClick={() => addToCart(product)}
                              className="w-full py-2.5 bg-gradient-to-r from-[#00f0ff] to-[#8b5cf6] text-white rounded-xl font-medium text-sm">
                              Adicionar
                            </motion.button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Floating Realizar Pagamento Bar */}
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-3"
                  >
                    <motion.div
                      className="relative overflow-hidden rounded-2xl"
                      animate={{ boxShadow: ["0 0 20px rgba(0,240,255,0.15)", "0 0 40px rgba(0,240,255,0.3)", "0 0 20px rgba(0,240,255,0.15)"] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <div className="bg-[#0c0c14]/95 backdrop-blur-xl border border-[#00f0ff]/30 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#00f0ff]/15 flex items-center justify-center">
                              <ShoppingCart className="w-4 h-4 text-[#00f0ff]" />
                            </div>
                            <div>
                              <p className="text-white text-sm font-semibold">{cartCount} {cartCount === 1 ? "item" : "itens"}</p>
                              <p className="text-gray-400 text-[11px]">no carrinho</p>
                            </div>
                          </div>
                          <p className="text-[#00ff41] font-bold text-xl">R$ {cartTotal.toFixed(2)}</p>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => { sfx.playClick(); setShowCart(true); }}
                          className="w-full py-3.5 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2"
                          style={{ background: "linear-gradient(135deg, #00f0ff, #8b5cf6, #ff00ff)" }}
                        >
                          <QrCode className="w-5 h-5" />
                          Realizar Pagamento
                        </motion.button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Pedidos - Enhanced Real-time Tracking */}
          {activeTab === "pedidos" && (
            <ClienteOrdersTab orders={orders} loadOrders={loadOrders} statusLabels={statusLabels} currentUsername={currentUser.username} currentUserName={currentUser.name} />
          )}

          {/* Adicionar Vendedor */}
          {activeTab === "adicionar" && (
            <motion.div key="adicionar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 flex items-center justify-center h-full overflow-y-auto pb-16">
              <div className="bg-[#12121a] border border-[#1f1f2e] rounded-2xl p-6 w-full max-w-sm">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00f0ff] to-[#8b5cf6] mb-3">
                    <Plus className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-white font-bold text-lg mb-1">Vincular Vendedor</h2>
                  <p className="text-gray-400 text-sm">Insira o codigo de convite</p>
                </div>
                <div className="space-y-4">
                  <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-4 bg-[#1f1f2e] border border-[#2a2a3e] rounded-xl text-white text-center text-xl font-mono tracking-widest focus:outline-none focus:border-[#00f0ff] transition-all"
                    placeholder="X-XXXX-XXXX" maxLength={12} />
                  <motion.button whileTap={{ scale: 0.98 }} onClick={handleAddVendedor}
                    className="w-full py-4 bg-gradient-to-r from-[#00f0ff] to-[#8b5cf6] text-white font-bold rounded-xl text-base flex items-center justify-center gap-2">
                    {linkingCode ? (
                      <><RefreshCw className="w-5 h-5 animate-spin" /> Vinculando...</>
                    ) : (
                      <><Link className="w-5 h-5" /> Conectar ao Vendedor</>
                    )}
                  </motion.button>
                  {linkError && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#ff006e] text-sm text-center bg-[#ff006e]/10 border border-[#ff006e]/30 rounded-lg p-3">
                      {linkError}
                    </motion.p>
                  )}
                  {linkSuccess && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center bg-[#00ff41]/10 border border-[#00ff41]/30 rounded-lg p-4">
                      <Check className="w-7 h-7 text-[#00ff41] mx-auto mb-2" />
                      <p className="text-[#00ff41] font-semibold text-sm">{linkSuccess}</p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a12]/95 backdrop-blur-xl border-t border-[#1f1f2e]/60">
        <motion.div className="absolute top-0 left-0 right-0 h-[1px]"
          style={{ background: "linear-gradient(90deg, transparent, #00f0ff40, #8b5cf640, #ff00ff40, transparent)" }}
          animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 3, repeat: Infinity }} />
        <div className="flex items-center justify-around px-2 py-2">
          {tabs.map((tab) => (
            <motion.button key={tab.id} onClick={() => { sfx.playNavigate(); setActiveTab(tab.id); }} whileTap={{ scale: 0.85 }}
              className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[56px]">
              {activeTab === tab.id && (
                <motion.div layoutId="clienteActiveTab" className="absolute inset-0 rounded-xl"
                  style={{ background: "linear-gradient(135deg, rgba(0,240,255,0.12), rgba(139,92,246,0.08))" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }} />
              )}
              {activeTab === tab.id && (
                <motion.div layoutId="clienteActiveDot" className="absolute -top-1 w-6 h-[2px] rounded-full bg-[#00f0ff]"
                  style={{ boxShadow: "0 0 8px rgba(0,240,255,0.6)" }} />
              )}
              <div className={`relative z-10 w-5 h-5 ${activeTab === tab.id ? "text-[#00f0ff]" : "text-gray-600"} transition-colors`}>
                {tab.icon}
                {tab.badge && tab.badge > 0 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2.5 min-w-[16px] h-[16px] bg-[#ff006e] rounded-full flex items-center justify-center px-1 text-[9px] font-black text-white shadow-[0_0_8px_rgba(255,0,110,0.6)] border border-[#0c0c14] z-20">
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </motion.span>
                )}
              </div>
              <span className={`relative z-10 text-[11px] font-medium ${activeTab === tab.id ? "text-[#00f0ff]" : "text-gray-600"} transition-colors`}>
                {tab.label}
              </span>
            </motion.button>
          ))}
        </div>
      </nav>

      {/* Cart Drawer */}
      <AnimatePresence>
        {showCart && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50" onClick={() => setShowCart(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25 }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-[#12121a] border-t border-[#1f1f2e] z-50 flex flex-col rounded-t-2xl">
              <div className="flex items-center justify-between p-4 border-b border-[#1f1f2e]">
                <h3 className="text-white font-bold text-lg">Carrinho ({cartCount})</h3>
                <button onClick={() => setShowCart(false)} className="p-2 hover:bg-[#1f1f2e] rounded-lg text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3 p-3 bg-[#1f1f2e] rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00f0ff]/20 to-[#8b5cf6]/20 flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-[#00f0ff]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{item.product.name}</p>
                      <p className="text-[#00ff41] text-sm">R$ {Number(item.product.price).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => removeFromCart(item.product.id)} className="w-8 h-8 rounded bg-[#12121a] text-white flex items-center justify-center">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-white font-bold w-4 text-center text-sm">{item.qty}</span>
                      <button onClick={() => addToCart(item.product)} className="w-8 h-8 rounded bg-[#00f0ff]/20 text-[#00f0ff] flex items-center justify-center">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-[#1f1f2e] space-y-3">
                <input type="text" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Endereco de entrega..."
                  className="w-full px-4 py-3 bg-[#1f1f2e] border border-[#2a2a3e] rounded-xl text-white focus:outline-none focus:border-[#00f0ff] text-base" />
                
                {/* Fee Breakdown */}
                {feePreview && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    className="bg-[#0a0a12] border border-[#1f1f2e]/50 rounded-xl p-3 space-y-1.5">
                    <p className="text-gray-500 text-[11px] uppercase tracking-wider font-medium mb-2">Distribuicao do Pagamento</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#ff006e]">Taxa Admin ({feePreview.adminRate}% + R$0,99)</span>
                      <span className="text-[#ff006e] font-medium">R$ {feePreview.adminTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#ff9f00]">Taxa Motorista ({feePreview.driverPercent}% + R${feePreview.driverFixa.toFixed(2)})</span>
                      <span className="text-[#ff9f00] font-medium">R$ {feePreview.driverTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#00ff41]">Lucro Vendedor</span>
                      <span className="text-[#00ff41] font-medium">R$ {feePreview.vendorProfit.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-[#1f1f2e]/30 my-1" />
                  </motion.div>
                )}
                {loadingFees && (
                  <div className="flex items-center justify-center py-2 gap-2">
                    <Loader className="w-3.5 h-3.5 text-gray-500 animate-spin" />
                    <span className="text-gray-500 text-xs">Calculando taxas...</span>
                  </div>
                )}

                <div className="flex justify-between text-lg">
                  <span className="text-white font-bold">Total</span>
                  <span className="text-[#00ff41] font-bold">R$ {cartTotal.toFixed(2)}</span>
                </div>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleCheckout}
                  className="w-full py-4 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #00f0ff, #8b5cf6, #ff00ff)" }}
                >
                  <QrCode className="w-5 h-5" />
                  Pagar com PIX
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center">
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              className="bg-[#12121a] border border-[#1f1f2e] rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-[#00f0ff]" /> Pagamento PIX
                </h3>
                <button onClick={closePaymentModal} className="p-2 hover:bg-[#1f1f2e] rounded-lg text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {paymentStatus === "generating" && (
                <div className="text-center py-10">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="inline-block mb-4">
                    <Loader className="w-10 h-10 text-[#00f0ff]" />
                  </motion.div>
                  <p className="text-white font-semibold text-base">Gerando pagamento PIX...</p>
                  <p className="text-gray-500 text-sm mt-1">Aguarde um momento</p>
                </div>
              )}

              {paymentStatus === "pix_ready" && pixInvoice && (
                <div className="space-y-4">
                  {pixInvoice.payment?.qrCodeImageUrl ? (
                    <motion.div
                      className="w-52 h-52 mx-auto bg-white rounded-2xl p-3 flex items-center justify-center"
                      animate={{ boxShadow: ["0 0 20px rgba(0,240,255,0.1)", "0 0 40px rgba(0,240,255,0.25)", "0 0 20px rgba(0,240,255,0.1)"] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <img src={pixInvoice.payment.qrCodeImageUrl} alt="QR Code PIX" className="w-full h-full" />
                    </motion.div>
                  ) : (
                    <div className="w-52 h-52 mx-auto bg-white rounded-2xl p-4 flex items-center justify-center">
                      <QrCode className="w-full h-full text-black" />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-white font-bold text-2xl">R$ {(pixInvoice.amount || cartTotal).toFixed(2)}</p>
                    <p className="text-gray-400 text-sm mt-1">Escaneie o QR Code ou copie o codigo PIX</p>
                  </div>

                  {/* Fee breakdown in payment modal */}
                  {feePreview && (
                    <div className="bg-[#0a0a12]/80 border border-[#1f1f2e]/40 rounded-xl p-3 space-y-1.5">
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider font-medium">Distribuicao</p>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#ff006e]/80">Admin ({feePreview.adminRate}% + R$0,99)</span>
                        <span className="text-[#ff006e] font-medium">R$ {feePreview.adminTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#ff9f00]/80">Motorista ({feePreview.driverPercent}% + R${feePreview.driverFixa.toFixed(2)})</span>
                        <span className="text-[#ff9f00] font-medium">R$ {feePreview.driverTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#00ff41]/80">Vendedor</span>
                        <span className="text-[#00ff41] font-medium">R$ {feePreview.vendorProfit.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  {pixInvoice.payment?.qrCode && (
                    <button onClick={() => handleCopyPix(pixInvoice.payment.qrCode)}
                      className="w-full flex items-center gap-2 px-4 py-3 bg-[#1f1f2e] border border-[#2a2a3e] rounded-xl group">
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-gray-400 text-xs mb-0.5">PIX Copia e Cola</p>
                        <p className="text-white text-xs font-mono truncate">{pixInvoice.payment.qrCode.substring(0, 40)}...</p>
                      </div>
                      {pixCopied ? (
                        <Check className="w-4 h-4 text-[#00ff41] shrink-0" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-500 group-hover:text-[#00f0ff] shrink-0" />
                      )}
                    </button>
                  )}
                  <div className="flex items-center justify-center gap-2 py-2">
                    <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-2 h-2 rounded-full bg-yellow-400" />
                    <span className="text-yellow-400 text-xs font-medium">Aguardando pagamento...</span>
                  </div>
                  {pixInvoice.payment?.paymentUrl && (
                    <a href={pixInvoice.payment.paymentUrl} target="_blank" rel="noopener noreferrer"
                      className="block w-full py-3 text-center bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] font-medium text-sm rounded-xl">
                      Abrir Pagina de Pagamento
                    </a>
                  )}
                </div>
              )}

              {paymentStatus === "success" && (
                <div className="text-center py-8">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#00ff41]/20 mb-4">
                    <Check className="w-8 h-8 text-[#00ff41]" />
                  </motion.div>
                  <p className="text-[#00ff41] font-bold text-lg">Pagamento Confirmado!</p>
                  <p className="text-gray-400 text-sm mt-1">R$ {(pixInvoice?.amount || cartTotal).toFixed(2)}</p>
                  <p className="text-gray-500 text-xs mt-2">Seu pedido foi enviado ao vendedor</p>
                  <div className="mt-3 flex items-center justify-center gap-1.5">
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: 2 }}>
                      <Package className="w-4 h-4 text-[#00f0ff]" />
                    </motion.div>
                    <span className="text-[#00f0ff] text-xs font-medium">Acompanhe na aba Pedidos</span>
                  </div>
                </div>
              )}

              {paymentStatus === "error" && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/20 mb-4">
                    <X className="w-7 h-7 text-red-400" />
                  </div>
                  <p className="text-red-400 font-bold text-base">{pixError || "Erro no pagamento"}</p>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={closePaymentModal}
                    className="mt-4 px-6 py-2.5 bg-[#1f1f2e] text-white rounded-xl text-sm font-medium">
                    Fechar
                  </motion.button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* === LOGOUT CONFIRMATION MODAL === */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md px-4"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm"
            >
              <motion.div
                className="absolute inset-0 rounded-2xl p-[1px]"
                style={{ background: "conic-gradient(from 0deg, #ff006e40, transparent, #ff006e20, transparent)" }}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative bg-[#0c0c14] border border-[#ff006e]/20 rounded-2xl p-6 m-[1px] shadow-[0_0_60px_rgba(255,0,110,0.15)]">
                <div className="text-center mb-5">
                  <motion.div
                    className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#ff006e]/10 mb-3"
                    animate={{ boxShadow: ["0 0 15px rgba(255,0,110,0.15)", "0 0 30px rgba(255,0,110,0.3)", "0 0 15px rgba(255,0,110,0.15)"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <LogOut className="w-7 h-7 text-[#ff006e]" />
                  </motion.div>
                  <h3 className="text-white font-bold text-lg">Sair do Painel?</h3>
                  <p className="text-gray-400 text-sm mt-1">Você será desconectado</p>
                </div>
                <div className="flex gap-3">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 py-3 bg-[#1f1f2e] text-gray-300 font-semibold rounded-xl text-sm hover:bg-[#2a2a3e] transition-colors"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    whileHover={{ boxShadow: "0 0 25px rgba(255,0,110,0.4)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { sfx.playWhoosh(); localStorage.removeItem("currentUser"); navigate("/"); }}
                    className="flex-1 py-3 bg-gradient-to-r from-[#ff006e] to-[#ff0040] text-white font-bold rounded-xl text-sm shadow-[0_0_20px_rgba(255,0,110,0.3)]"
                  >
                    Sair
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Call Overlays (Global) ── */}
      <AnimatePresence>
        {callSystem.incomingCall && (
          <IncomingCallOverlay
            call={callSystem.incomingCall}
            onAnswer={callSystem.answerCall}
            onDecline={callSystem.declineCall}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {(callSystem.outgoingCall || callSystem.isInCall) && (
          <ActiveCallOverlay
            call={(callSystem.activeCall || callSystem.outgoingCall)!}
            isConnected={callSystem.isInCall}
            isOutgoing={!!callSystem.outgoingCall}
            currentUserPhoto={currentUser.photo}
            currentUserName={currentUser.name}
            onEnd={callSystem.endCall}
            isMuted={callSystem.isMuted}
            onToggleMute={callSystem.toggleMute}
            micBlocked={callSystem.micBlocked}
          />
        )}
      </AnimatePresence>
    </div>
  );
}