import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Bell, X, MessageSquare, ShoppingBag, CreditCard, Phone, Check, Trash2, Code, UserPlus, Zap } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  timestamp: string;
  read: boolean;
}

const STORAGE_KEY = "app_notifications_v1";
const MAX_NOTIFICATIONS = 80;

function loadFromStorage(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_NOTIFICATIONS);
  } catch {
    return [];
  }
}

function saveToStorage(notifications: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
  } catch {}
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(() => loadFromStorage());
  const [flashNew, setFlashNew] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  // Update panel position when open
  useEffect(() => {
    if (open && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setPanelPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [open]);

  // Persist to localStorage whenever notifications change
  const persistNotifications = useCallback((updater: (prev: Notification[]) => Notification[]) => {
    setNotifications((prev) => {
      const next = updater(prev);
      saveToStorage(next);
      return next;
    });
  }, []);

  // Listen for push messages from service worker
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "NOTIFICATION_CLICKED") {
        const data = event.data.data;
        const notif: Notification = {
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: data.title || "Notificacao",
          body: data.body || "",
          type: data.type || "general",
          timestamp: new Date().toISOString(),
          read: false,
        };
        persistNotifications((prev) => [notif, ...prev].slice(0, MAX_NOTIFICATIONS));
        setFlashNew(true);
        setTimeout(() => setFlashNew(false), 2000);
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handler);
    }
    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handler);
      }
    };
  }, [persistNotifications]);

  // Listen for in-app notification events
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { title, body, type } = e.detail;
      const notif: Notification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: title || "Notificacao",
        body: body || "",
        type: type || "general",
        timestamp: new Date().toISOString(),
        read: false,
      };
      persistNotifications((prev) => [notif, ...prev].slice(0, MAX_NOTIFICATIONS));
      setFlashNew(true);
      setTimeout(() => setFlashNew(false), 2000);
    };
    window.addEventListener("app-notification" as any, handler);
    return () => window.removeEventListener("app-notification" as any, handler);
  }, [persistNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    persistNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    persistNotifications(() => []);
  };

  const deleteOne = (id: string) => {
    persistNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "chat_message": return <MessageSquare className="w-3.5 h-3.5 text-[#00f0ff]" />;
      case "new_order":
      case "order_status": return <ShoppingBag className="w-3.5 h-3.5 text-[#8b5cf6]" />;
      case "pix_confirmed": return <CreditCard className="w-3.5 h-3.5 text-[#00ff41]" />;
      case "pix_generated": return <CreditCard className="w-3.5 h-3.5 text-[#ff9f00]" />;
      case "incoming_call": return <Phone className="w-3.5 h-3.5 text-[#ff006e]" />;
      case "code_generated": return <Code className="w-3.5 h-3.5 text-[#ff9f00]" />;
      case "user_registered": return <UserPlus className="w-3.5 h-3.5 text-[#00ff41]" />;
      default: return <Bell className="w-3.5 h-3.5 text-[#ff9f00]" />;
    }
  };

  const getAccentColor = (type: string) => {
    switch (type) {
      case "chat_message": return "#00f0ff";
      case "new_order": case "order_status": return "#8b5cf6";
      case "pix_confirmed": return "#00ff41";
      case "pix_generated": return "#ff9f00";
      case "incoming_call": return "#ff006e";
      case "code_generated": return "#ff9f00";
      case "user_registered": return "#00ff41";
      default: return "#ff9f00";
    }
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}sem`;
  };

  // Group notifications by today/yesterday/older
  const groupNotifications = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;

    const groups: { label: string; items: Notification[] }[] = [
      { label: "Hoje", items: [] },
      { label: "Ontem", items: [] },
      { label: "Anteriores", items: [] },
    ];

    for (const n of notifications) {
      const ts = new Date(n.timestamp).getTime();
      if (ts >= today) groups[0].items.push(n);
      else if (ts >= yesterday) groups[1].items.push(n);
      else groups[2].items.push(n);
    }

    return groups.filter((g) => g.items.length > 0);
  };

  const groups = groupNotifications();

  return (
    <div className="relative">
      <motion.button
        ref={bellRef}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl bg-[#12121a] border border-[#1f1f2e] hover:border-[#00f0ff]/30 transition-colors"
      >
        <motion.div
          animate={flashNew ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          <Bell className="w-5 h-5 text-gray-400" />
        </motion.div>
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#ff006e] rounded-full flex items-center justify-center px-1"
          >
            <span className="text-white text-[9px] font-black">{unreadCount > 99 ? "99+" : unreadCount}</span>
          </motion.div>
        )}
        {unreadCount > 0 && (
          <motion.div
            className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-[#ff006e]"
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed w-[340px] max-h-[75vh] rounded-2xl overflow-hidden"
              style={{ top: panelPos.top, right: panelPos.right, zIndex: 99999 }}
            >
              <div className="bg-[#0c0c14]/98 backdrop-blur-xl border border-[#1f1f2e] rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-[#1f1f2e]">
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="p-1.5 rounded-lg bg-[#00f0ff]/10"
                      animate={{ boxShadow: ["0 0 4px #00f0ff00", "0 0 8px #00f0ff30", "0 0 4px #00f0ff00"] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Bell className="w-3.5 h-3.5 text-[#00f0ff]" />
                    </motion.div>
                    <h3 className="text-white font-bold text-sm">Notificacoes</h3>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-[#ff006e]/15 text-[#ff006e] rounded-full text-[10px] font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {notifications.length > 0 && (
                      <>
                        <button onClick={markAllRead} className="p-1.5 rounded-lg hover:bg-[#00f0ff]/10 text-gray-500 hover:text-[#00f0ff] transition-colors" title="Marcar como lidas">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={clearAll} className="p-1.5 rounded-lg hover:bg-[#ff006e]/10 text-gray-500 hover:text-[#ff006e] transition-colors" title="Limpar">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-[#1f1f2e] text-gray-500 hover:text-white transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Notifications List */}
                <div className="max-h-[55vh] overflow-y-auto scrollbar-thin">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4">
                      <motion.div
                        animate={{ opacity: [0.2, 0.5, 0.2] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <Bell className="w-8 h-8 text-gray-700 mb-2" />
                      </motion.div>
                      <p className="text-gray-600 text-xs text-center">Nenhuma notificacao</p>
                      <p className="text-gray-700 text-[10px] text-center mt-1">
                        Notificacoes aparecerao aqui automaticamente
                      </p>
                    </div>
                  ) : (
                    groups.map((group) => (
                      <div key={group.label}>
                        <div className="px-3 py-1.5 bg-[#0a0a12]/60 border-b border-[#1f1f2e]/30 sticky top-0 z-10">
                          <span className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">{group.label}</span>
                        </div>
                        {group.items.map((notif) => (
                          <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            layout
                            className={`group flex items-start gap-2.5 p-3 border-b border-[#1f1f2e]/30 hover:bg-[#12121a]/50 transition-colors cursor-pointer ${
                              !notif.read ? "bg-[#00f0ff]/[0.03]" : ""
                            }`}
                            onClick={() => {
                              persistNotifications((prev) =>
                                prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
                              );
                            }}
                          >
                            <div
                              className="p-1.5 rounded-lg border shrink-0 mt-0.5"
                              style={{
                                background: `${getAccentColor(notif.type)}08`,
                                borderColor: `${getAccentColor(notif.type)}20`,
                              }}
                            >
                              {getIcon(notif.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                {!notif.read && (
                                  <motion.div
                                    className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] shrink-0"
                                    animate={{ scale: [1, 1.3, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                  />
                                )}
                                <p className="text-white text-xs font-semibold truncate">{notif.title}</p>
                                <span className="text-gray-700 text-[10px] ml-auto shrink-0">{timeAgo(notif.timestamp)}</span>
                              </div>
                              <p className="text-gray-500 text-[11px] line-clamp-2 mt-0.5">{notif.body}</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteOne(notif.id); }}
                              className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#ff006e]/10 text-gray-700 hover:text-[#ff006e] transition-all shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="px-3 py-2 border-t border-[#1f1f2e] flex items-center justify-between">
                    <span className="text-gray-700 text-[10px]">{notifications.length} notificacao(es)</span>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-gray-700" />
                      <span className="text-gray-700 text-[10px]">Persistidas localmente</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}