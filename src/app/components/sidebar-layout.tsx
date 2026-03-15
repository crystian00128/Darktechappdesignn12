import { ReactNode, useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, Menu, X, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router";
import { NotificationBell } from "./notification-bell";

interface MenuItem {
  icon: ReactNode;
  label: string;
  id: string;
  badge?: number;
}

interface SidebarLayoutProps {
  children: ReactNode;
  menuItems: MenuItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  title: string;
  headerAction?: ReactNode;
  centerAction?: ReactNode;
  onLogout?: () => void;
  userKey?: string;
}

export function SidebarLayout({
  children,
  menuItems,
  activeTab,
  onTabChange,
  title,
  headerAction,
  centerAction,
  onLogout,
  userKey,
}: SidebarLayoutProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const rippleId = useRef(0);

  // Detect mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleRipple = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const id = rippleId.current++;
    setRipples((prev) => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top, id }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 1200);
  }, []);

  // Memoize particles
  const particles = useMemo(() => {
    const colors = ["#00f0ff", "#ff00ff", "#8b5cf6", "#00ff41"];
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      w: 1 + Math.random() * 2,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      yMove: -(15 + Math.random() * 30),
      duration: 4 + Math.random() * 4,
      delay: Math.random() * 6,
      glow: 3 + Math.random() * 6,
    }));
  }, []);

  // Bottom nav items for mobile (max 5 visible + more)
  const allFilteredItems = menuItems.filter((m) => m.id !== "sair");
  const leftNavItems = centerAction ? allFilteredItems.slice(0, 2) : allFilteredItems.slice(0, 4);
  const rightNavItems = centerAction ? allFilteredItems.slice(2, 3) : [];
  const visibleItems = centerAction ? [...leftNavItems, ...rightNavItems] : leftNavItems;
  const hasMore = allFilteredItems.length > visibleItems.length;

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    onLogout?.();
    localStorage.removeItem("currentUser");
    localStorage.removeItem("adminOriginalSession");
    navigate("/");
  };

  return (
    <div
      ref={containerRef}
      onClick={handleRipple}
      className="h-dvh bg-[#050508] flex flex-col md:flex-row relative overflow-hidden select-none"
    >
      {/* === ANIMATED BACKGROUND === */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,240,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.5) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />

        {/* Orbs */}
        <motion.div
          className="absolute top-[-15%] left-[-5%] w-[200px] h-[200px] md:w-[400px] md:h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,240,255,0.12) 0%, transparent 60%)" }}
          animate={{ x: [0, 60, -30, 0], y: [0, 40, -20, 0], scale: [1, 1.3, 0.9, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-10%] right-[-5%] w-[200px] h-[200px] md:w-[400px] md:h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,0,255,0.1) 0%, transparent 60%)" }}
          animate={{ x: [0, -50, 30, 0], y: [0, -40, 20, 0], scale: [1.1, 0.8, 1.3, 1.1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <motion.div
          className="absolute top-[50%] left-[40%] w-[150px] h-[150px] md:w-[300px] md:h-[300px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 60%)" }}
          animate={{ x: [-75, -40, -100, -75], y: [-75, -40, -100, -75], rotate: [0, 180, 360] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Particles */}
        {particles.map((p) => (
          <motion.div
            key={`sp-${p.id}`}
            className="absolute rounded-full"
            style={{
              width: p.w,
              height: p.w,
              left: p.left,
              top: p.top,
              backgroundColor: p.color,
              boxShadow: `0 0 ${p.glow}px ${p.color}`,
            }}
            animate={{ y: [0, p.yMove, 0], opacity: [0, 0.7, 0], scale: [0, 1.2, 0] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}

        {/* Scan line */}
        <motion.div
          className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00f0ff]/15 to-transparent"
          animate={{ top: ["-2%", "102%"] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Ripples */}
      {ripples.map((r) => (
        <motion.div
          key={r.id}
          className="absolute rounded-full border pointer-events-none z-[5]"
          style={{ left: r.x, top: r.y, borderColor: "#00f0ff" }}
          initial={{ width: 0, height: 0, opacity: 0.4, x: 0, y: 0 }}
          animate={{ width: 200, height: 200, opacity: 0, x: -100, y: -100 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      ))}

      {/* === DESKTOP SIDEBAR === */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 72 }}
        className="relative z-10 bg-[#0a0a12]/90 backdrop-blur-xl border-r border-[#1f1f2e]/60 flex-col transition-all duration-300 hidden md:flex shrink-0"
      >
        {/* Sidebar glow edge */}
        <motion.div
          className="absolute top-0 right-0 w-[1px] h-full"
          style={{ background: "linear-gradient(to bottom, transparent, #00f0ff30, #8b5cf630, transparent)" }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        {/* Logo */}
        <div className="p-4 border-b border-[#1f1f2e]/60">
          <div className="flex items-center justify-between">
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-2.5"
                >
                  <motion.div
                    className="relative w-9 h-9 rounded-xl overflow-hidden"
                    whileHover={{ scale: 1.1 }}
                  >
                    <motion.div
                      className="absolute inset-0 rounded-xl"
                      style={{ background: "conic-gradient(from 0deg, #00f0ff, #8b5cf6, #ff00ff, #00f0ff)" }}
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="absolute inset-[2px] rounded-[10px] bg-gradient-to-br from-[#00f0ff] to-[#8b5cf6] flex items-center justify-center">
                      <span className="text-white font-black text-sm">D</span>
                    </div>
                  </motion.div>
                  <div>
                    <h2 className="text-white font-bold text-xs leading-tight">{title}</h2>
                    <motion.p
                      className="text-gray-600 text-[10px]"
                      animate={{ opacity: [0.4, 0.7, 0.4] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      Sistema Tech
                    </motion.p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-[#1f1f2e] text-gray-500 hover:text-[#00f0ff] transition-all"
            >
              {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {menuItems
            .filter((m) => m.id !== "sair")
            .map((item) => (
              <motion.button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.97 }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  activeTab === item.id
                    ? "text-white shadow-[0_0_15px_rgba(0,240,255,0.15)]"
                    : "text-gray-500 hover:text-gray-300 hover:bg-[#1f1f2e]/50"
                }`}
                style={
                  activeTab === item.id
                    ? { background: "linear-gradient(135deg, rgba(0,240,255,0.15), rgba(139,92,246,0.1))", border: "1px solid rgba(0,240,255,0.2)" }
                    : undefined
                }
              >
                <div className="relative w-5 h-5 flex-shrink-0">
                  {item.icon}
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-2 -right-2.5 min-w-[16px] h-[16px] bg-[#ff006e] rounded-full flex items-center justify-center px-1 text-[9px] font-black text-white shadow-[0_0_8px_rgba(255,0,110,0.6)] border border-[#0c0c14]">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="font-medium text-xs whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-[#1f1f2e]/60">
          <motion.button
            onClick={handleLogout}
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[#ff006e] hover:bg-[#ff006e]/10 transition-all"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-medium text-xs">Sair</span>}
          </motion.button>
        </div>
      </motion.aside>

      {/* === MAIN AREA === */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Header */}
        <header className="relative bg-[#0a0a12]/80 backdrop-blur-xl border-b border-[#1f1f2e]/60 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between shrink-0">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg hover:bg-[#1f1f2e] text-gray-400 mr-3"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <motion.h1
              className="text-base md:text-xl font-bold truncate"
              initial={false}
            >
              <motion.span
                className="bg-gradient-to-r from-[#00f0ff] via-[#8b5cf6] to-[#ff00ff] bg-clip-text text-transparent bg-[length:200%_auto]"
                animate={{ backgroundPosition: ["0% center", "200% center"] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              >
                {title}
              </motion.span>
            </motion.h1>
            <motion.p
              className="text-gray-600 text-[10px] md:text-xs tracking-wider hidden sm:block"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              PAINEL DE CONTROLE AVANCADO
            </motion.p>
          </div>

          {headerAction}

          {/* Notification Bell */}
          <div className="ml-2">
            <NotificationBell userKey={userKey} />
          </div>

          {/* Online status dot */}
          <motion.div
            className="w-2 h-2 rounded-full bg-[#00ff41] ml-3"
            animate={{
              boxShadow: ["0 0 4px rgba(0,255,65,0.5)", "0 0 12px rgba(0,255,65,0.8)", "0 0 4px rgba(0,255,65,0.5)"],
              scale: [1, 1.3, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6 pb-20 md:pb-6">
          {children}
        </main>

        {/* === MOBILE BOTTOM NAV === */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a12]/95 backdrop-blur-xl border-t border-[#1f1f2e]/60">
          {/* Top glow line */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-[1px]"
            style={{ background: "linear-gradient(90deg, transparent, #00f0ff40, #8b5cf640, #ff00ff40, transparent)" }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          <div className="flex items-center justify-around px-2 py-2">
            {leftNavItems.map((item) => (
              <motion.button
                key={item.id}
                onClick={() => { onTabChange(item.id); setMobileMenuOpen(false); }}
                whileTap={{ scale: 0.85 }}
                className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[56px]"
              >
                {activeTab === item.id && (
                  <motion.div
                    layoutId="activeTabMobile"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: "linear-gradient(135deg, rgba(0,240,255,0.12), rgba(139,92,246,0.08))" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {activeTab === item.id && (
                  <motion.div
                    layoutId="activeTabDot"
                    className="absolute -top-1 w-6 h-[2px] rounded-full"
                    style={{ backgroundColor: "#00f0ff", boxShadow: "0 0 8px rgba(0,240,255,0.6)" }}
                  />
                )}
                <div
                  className={`relative z-10 w-5 h-5 ${
                    activeTab === item.id ? "text-[#00f0ff]" : "text-gray-600"
                  } transition-colors`}
                >
                  {item.icon}
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-2 -right-2.5 min-w-[16px] h-[16px] bg-[#ff006e] rounded-full flex items-center justify-center px-1 text-[9px] font-black text-white shadow-[0_0_8px_rgba(255,0,110,0.6)] border border-[#0c0c14] z-20">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`relative z-10 text-[11px] font-medium ${
                    activeTab === item.id ? "text-[#00f0ff]" : "text-gray-600"
                  } transition-colors`}
                >
                  {item.label.split(" ")[0]}
                </span>
              </motion.button>
            ))}

            {centerAction && (
              <div className="-mt-5 relative z-20">
                {centerAction}
              </div>
            )}

            {rightNavItems.map((item) => (
              <motion.button
                key={item.id}
                onClick={() => { onTabChange(item.id); setMobileMenuOpen(false); }}
                whileTap={{ scale: 0.85 }}
                className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[56px]"
              >
                {activeTab === item.id && (
                  <motion.div
                    layoutId="activeTabMobile"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: "linear-gradient(135deg, rgba(0,240,255,0.12), rgba(139,92,246,0.08))" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {activeTab === item.id && (
                  <motion.div
                    layoutId="activeTabDot"
                    className="absolute -top-1 w-6 h-[2px] rounded-full"
                    style={{ backgroundColor: "#00f0ff", boxShadow: "0 0 8px rgba(0,240,255,0.6)" }}
                  />
                )}
                <div
                  className={`relative z-10 w-5 h-5 ${
                    activeTab === item.id ? "text-[#00f0ff]" : "text-gray-600"
                  } transition-colors`}
                >
                  {item.icon}
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-2 -right-2.5 min-w-[16px] h-[16px] bg-[#ff006e] rounded-full flex items-center justify-center px-1 text-[9px] font-black text-white shadow-[0_0_8px_rgba(255,0,110,0.6)] border border-[#0c0c14] z-20">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`relative z-10 text-[11px] font-medium ${
                    activeTab === item.id ? "text-[#00f0ff]" : "text-gray-600"
                  } transition-colors`}
                >
                  {item.label.split(" ")[0]}
                </span>
              </motion.button>
            ))}

            {hasMore && (
              <motion.button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                whileTap={{ scale: 0.85 }}
                className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[56px]"
              >
                <div className={`w-5 h-5 ${mobileMenuOpen ? "text-[#ff00ff]" : "text-gray-600"} transition-colors`}>
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </div>
                <span className={`text-[11px] font-medium ${mobileMenuOpen ? "text-[#ff00ff]" : "text-gray-600"} transition-colors`}>
                  Mais
                </span>
              </motion.button>
            )}
          </div>
        </nav>

        {/* Mobile expanded menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="md:hidden fixed bottom-[60px] left-2 right-2 z-50 bg-[#0c0c14]/98 backdrop-blur-2xl border border-[#1f1f2e]/60 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.6)]"
            >
              <motion.div
                className="absolute inset-0 rounded-2xl p-[1px]"
                style={{ background: "conic-gradient(from 0deg, #00f0ff20, #8b5cf620, #ff00ff20, #00f0ff20)" }}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative bg-[#0c0c14]/98 rounded-2xl p-3 m-[1px]">
                <div className="grid grid-cols-4 gap-2">
                  {menuItems
                    .filter((m) => m.id !== "sair")
                    .map((item) => (
                      <motion.button
                        key={item.id}
                        onClick={() => { onTabChange(item.id); setMobileMenuOpen(false); }}
                        whileTap={{ scale: 0.9 }}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all ${
                          activeTab === item.id
                            ? "text-[#00f0ff] bg-[#00f0ff]/10 border border-[#00f0ff]/20"
                            : "text-gray-500 hover:text-gray-300 hover:bg-[#1f1f2e]/50"
                        }`}
                      >
                        <div className="relative w-5 h-5">
                          {item.icon}
                          {item.badge && item.badge > 0 && (
                            <span className="absolute -top-2 -right-2.5 min-w-[16px] h-[16px] bg-[#ff006e] rounded-full flex items-center justify-center px-1 text-[9px] font-black text-white shadow-[0_0_8px_rgba(255,0,110,0.6)] border border-[#0c0c14] z-20">
                              {item.badge > 99 ? "99+" : item.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                      </motion.button>
                    ))}
                  <motion.button
                    onClick={handleLogout}
                    whileTap={{ scale: 0.9 }}
                    className="flex flex-col items-center gap-1 p-2.5 rounded-xl text-[#ff006e] hover:bg-[#ff006e]/10 transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-[11px] font-medium">Sair</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
              {/* Rotating glow border */}
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
                    onClick={confirmLogout}
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
    </div>
  );
}