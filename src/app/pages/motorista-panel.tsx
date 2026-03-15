import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  Power,
  MessageSquare,
  FileText,
  Check,
  DollarSign,
  Package,
  LogOut,
  Loader,
  MapPin,
  Truck,
  ChevronRight,
  ChevronLeft,
  Users,
  Store,
  Send,
  CheckCheck,
  Mic,
  Phone,
  Video,
  Camera,
  Image as ImageIcon,
  Paperclip,
  Play,
  Pause,
  Trash2,
  X,
  MicOff,
  PhoneOff,
  VideoOff,
  Maximize2,
  Bell,
  Navigation,
  CheckCircle2,
  Clock,
  Percent,
  Banknote,
  Star,
  BarChart3,
  Wallet,
  Calendar,
  LocateFixed,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { useUserCreator } from "../hooks/useUserCreator";
import { useCallSystem } from "../hooks/useCallSystem";
import { IncomingCallOverlay, ActiveCallOverlay } from "../components/call-overlays";
import { MotoristaDashboardCharts } from "../components/motorista-charts";
import { NotificationBell } from "../components/notification-bell";
import * as notif from "../services/notifications";
import * as pwa from "../services/pwa";
import * as api from "../services/api";
import * as sfx from "../services/sounds";

/* ── Neon Avatar with rotating green border ── */
function NeonAvatar({ photo, name, size = "md" }: { photo?: string; name?: string; size?: "sm" | "md" | "lg" }) {
  const sizeMap = {
    sm: { outer: "w-8 h-8", inner: "inset-[2px]", text: "text-xs", dot: "w-2 h-2 -bottom-0.5 -right-0.5 border-[1.5px]" },
    md: { outer: "w-10 h-10", inner: "inset-[2px]", text: "text-sm", dot: "w-2.5 h-2.5 bottom-0 right-0 border-[1.5px]" },
    lg: { outer: "w-16 h-16", inner: "inset-[3px]", text: "text-xl", dot: "w-3 h-3 bottom-0 right-0 border-2" },
  };
  const s = sizeMap[size];
  const initial = name && name.length > 0 ? name.charAt(0).toUpperCase() : "?";
  return (
    <div className={`relative ${s.outer} shrink-0`}>
      <motion.div className="absolute inset-0 rounded-full" style={{ background: "conic-gradient(from 0deg, #00ff41, #00f0ff, #00ff41, transparent, #00ff41)" }} animate={{ rotate: [0, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
      <motion.div className="absolute inset-[-2px] rounded-full pointer-events-none" animate={{ boxShadow: ["0 0 6px rgba(0,255,65,0.2), 0 0 12px rgba(0,255,65,0.1)", "0 0 12px rgba(0,255,65,0.4), 0 0 24px rgba(0,255,65,0.15)", "0 0 6px rgba(0,255,65,0.2), 0 0 12px rgba(0,255,65,0.1)"] }} transition={{ duration: 2, repeat: Infinity }} />
      <div className={`absolute ${s.inner} rounded-full bg-[#0a0a0f] flex items-center justify-center overflow-hidden`}>
        {photo && (photo.startsWith("http") || photo.startsWith("data:")) ? (
          <img src={photo} alt={name} className="w-full h-full object-cover rounded-full" />
        ) : (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-[#ff00ff]/30 to-[#00f0ff]/20 flex items-center justify-center">
            <span className={`${s.text} font-bold text-white`}>{initial}</span>
          </div>
        )}
      </div>
      <motion.div className={`absolute ${s.dot} bg-[#00ff41] rounded-full border-[#0a0a0f]`} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
    </div>
  );
}

/* ── Interactive Particle Background ── */
function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    let mouse = { x: -999, y: -999 };
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const pt = "touches" in e ? e.touches[0] : e;
      if (pt) { mouse.x = pt.clientX - rect.left; mouse.y = pt.clientY - rect.top; }
    };
    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("touchmove", handleMove);
    const particles: { x: number; y: number; vx: number; vy: number; r: number; color: string; alpha: number }[] = [];
    const colors = ["#ff00ff", "#00f0ff", "#00ff41", "#8b5cf6"];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * 1000, y: Math.random() * 1000,
        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2 + 0.5, color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.5 + 0.2,
      });
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        const dx = mouse.x - p.x; const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) { p.vx -= dx * 0.0003; p.vy -= dy * 0.0003; }
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
      });
      // grid lines
      ctx.strokeStyle = "rgba(255,0,255,0.03)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < canvas.width; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
      for (let y = 0; y < canvas.height; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-auto" />;
}

/* ── Mini Stat Card for mobile ── */
function MiniStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#12121a]/90 border border-[#1f1f2e] rounded-xl p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-gray-400 text-[10px] uppercase tracking-wider truncate">{label}</p>
        <p className="text-white font-bold text-sm truncate">{value}</p>
      </div>
    </motion.div>
  );
}

// ─── GlowCard ───────────────────────────────────
function GlowCard({ children, className = "", glowColor = "#ff00ff" }: { children: React.ReactNode; className?: string; glowColor?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`relative rounded-2xl overflow-hidden ${className}`}>
      <motion.div className="absolute inset-0 rounded-2xl p-[1px]"
        style={{ background: `conic-gradient(from 0deg, ${glowColor}30, transparent, ${glowColor}15, transparent)` }}
        animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
      <div className="relative bg-[#0c0c14] rounded-2xl m-[1px]">{children}</div>
    </motion.div>
  );
}

// ─── Audio Waveform Visual ──────────────────────
function AudioWaveform({ playing, color = "#00f0ff" }: { playing: boolean; color?: string }) {
  return (
    <div className="flex items-center gap-[2px] h-5">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div key={i} className="w-[2px] rounded-full"
          style={{ backgroundColor: color, height: playing ? undefined : `${4 + Math.sin(i * 0.8) * 4}px` }}
          animate={playing ? { height: [4, 4 + Math.random() * 14, 4 + Math.random() * 8, 4] } : {}}
          transition={playing ? { duration: 0.4 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.03 } : {}}
        />
      ))}
    </div>
  );
}

// ─── Call Overlay ────────────────────────────────
interface ChatContact { username: string; name: string; photo: string; role: string; }
interface ChatMsg { id: string; from: string; to: string; text: string; type: string; timestamp: string; read: boolean; audioUrl?: string; audioDuration?: number; imageUrl?: string; mediaId?: string; }

function CallOverlay({ contact, type, accentColor, onEnd }: { contact: ChatContact; type: "voice" | "video"; accentColor: string; onEnd: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [connected, setConnected] = useState(false);
  useEffect(() => { const t = setTimeout(() => setConnected(true), 2000); return () => clearTimeout(t); }, []);
  useEffect(() => { if (!connected) return; const i = setInterval(() => setElapsed((p) => p + 1), 1000); return () => clearInterval(i); }, [connected]);
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex flex-col items-center justify-center"
      style={{ background: `radial-gradient(ellipse at center, ${accentColor}15 0%, #050508 70%)` }}>
      {[80, 120, 160].map((size, i) => (
        <motion.div key={i} className="absolute rounded-full border" style={{ width: size, height: size, borderColor: `${accentColor}15` }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5 }} />
      ))}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="relative">
          <NeonAvatar photo={contact.photo} name={contact.name} size="lg" />
          {type === "video" && connected && (
            <motion.div className="absolute -top-1 -right-1 p-1 rounded-full bg-[#ff006e]" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}><div className="w-2 h-2 bg-white rounded-full" /></motion.div>
          )}
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-lg">{contact.name}</p>
          <p className="text-gray-500 text-xs">{contact.role === "vendedor" ? "Vendedor" : "Cliente"}</p>
        </div>
        <motion.div animate={{ opacity: connected ? 1 : [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: connected ? 0 : Infinity }}>
          <p className="font-mono text-sm" style={{ color: accentColor }}>{connected ? fmt(elapsed) : type === "video" ? "Chamada de video..." : "Ligando..."}</p>
        </motion.div>
        {type === "video" && connected && (
          <div className="w-56 h-36 rounded-2xl bg-[#12121a] border border-[#1f1f2e] flex items-center justify-center overflow-hidden mt-2">
            <motion.div className="w-full h-full relative" style={{ background: `linear-gradient(135deg, ${accentColor}10, #0a0a1280)` }}>
              <div className="absolute inset-0 flex items-center justify-center"><Video className="w-8 h-8 text-gray-700" /></div>
              <div className="absolute bottom-2 right-2 w-14 h-10 rounded-lg bg-[#1f1f2e] border border-[#2a2a3e] flex items-center justify-center"><NeonAvatar photo={undefined} name="Eu" size="sm" /></div>
            </motion.div>
          </div>
        )}
        <div className="flex items-center gap-5 mt-4">
          {type === "video" && (<button className="p-3 rounded-full bg-[#1f1f2e] text-gray-400"><VideoOff className="w-5 h-5" /></button>)}
          <button className="p-3 rounded-full bg-[#1f1f2e] text-gray-400"><MicOff className="w-5 h-5" /></button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onEnd} className="p-4 rounded-full bg-[#ff006e] text-white shadow-[0_0_20px_rgba(255,0,110,0.5)]"><PhoneOff className="w-6 h-6" /></motion.button>
          {type === "voice" && (<button className="p-3 rounded-full bg-[#1f1f2e] text-gray-400"><Maximize2 className="w-5 h-5" /></button>)}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Motorista Chat Component (Fullscreen, Tabbed, WhatsApp-style) ───
function MotoristaChat({ currentUsername, currentUserName, currentUserPhoto, vendedorContacts, clienteContacts, onConversationChange, onStartCall }: { currentUsername: string; currentUserName?: string; currentUserPhoto?: string; vendedorContacts: ChatContact[]; clienteContacts: ChatContact[]; onConversationChange?: (open: boolean) => void; onStartCall?: (to: string, type: "voice" | "video", toName: string) => void }) {
  const [chatTab, setChatTab] = useState<"vendedor" | "clientes">("vendedor");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [micSimulated, setMicSimulated] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  // Calls are now handled via the shared call system
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // ─── Presence & Last Messages ────────────────
  const [presenceMap, setPresenceMap] = useState<Record<string, boolean>>({});
  const [lastMessagesMap, setLastMessagesMap] = useState<Record<string, { text: string; type: string; from: string; timestamp: string }>>({});
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allContacts = [...vendedorContacts, ...clienteContacts];
  const selectedContact = allContacts.find((c) => c.username === selectedChat);
  const activeContacts = chatTab === "vendedor" ? vendedorContacts : clienteContacts;

  const allContactUsernames = allContacts.map(c => c.username);
  useEffect(() => {
    if (allContactUsernames.length === 0) return;
    const loadPresence = async () => {
      try {
        const res = await api.checkPresence(allContactUsernames);
        if (res.success) setPresenceMap(res.presence || {});
      } catch {}
    };
    loadPresence();
    const interval = setInterval(loadPresence, 10000);
    return () => clearInterval(interval);
  }, [allContactUsernames.join(",")]);

  useEffect(() => {
    if (allContactUsernames.length === 0) return;
    const loadLastMsgs = async () => {
      try {
        const res = await api.getChatLastMessages(currentUsername, allContactUsernames);
        if (res.success) setLastMessagesMap(res.lastMessages || {});
      } catch {}
    };
    loadLastMsgs();
    const interval = setInterval(loadLastMsgs, 8000);
    return () => clearInterval(interval);
  }, [currentUsername, allContactUsernames.join(",")]);

  // ─── Typing Indicator Polling ───────────────
  useEffect(() => {
    if (!currentUsername) return;
    const pollTyping = async () => {
      try {
        const res = await api.checkTyping(currentUsername);
        if (res.success) setTypingMap(res.typing || {});
      } catch {}
    };
    pollTyping();
    const interval = setInterval(pollTyping, 2000);
    return () => clearInterval(interval);
  }, [currentUsername]);

  const handleTypingInput = useCallback((value: string) => {
    setMessage(value);
    if (!selectedChat || !currentUsername) return;
    api.sendTyping(currentUsername, selectedChat, value.length > 0).catch(() => {});
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (value.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        api.sendTyping(currentUsername, selectedChat, false).catch(() => {});
      }, 4000);
    }
  }, [selectedChat, currentUsername]);

  const scrollToBottom = () => setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  const blobUrlCacheRef = useRef<Map<string, string>>(new Map());
  const mediaLoadingRef = useRef<Set<string>>(new Set());

  const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => { const r = new FileReader(); r.onloadend = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(blob); });

  const base64ToBlobUrl = (base64: string, cacheKey: string): string => {
    const cached = blobUrlCacheRef.current.get(cacheKey);
    if (cached) return cached;
    try { const [header, data] = base64.split(","); const mime = header.match(/:(.*?);/)?.[1] || "audio/webm"; const binary = atob(data); const bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i); const blob = new Blob([bytes], { type: mime }); const url = URL.createObjectURL(blob); blobUrlCacheRef.current.set(cacheKey, url); return url; } catch { return ""; }
  };

  const generateSyntheticAudioBlob = async (dur: number): Promise<Blob> => {
    const sr = 22050, ns = sr * dur, ds = ns * 2, buf = new ArrayBuffer(44 + ds), v = new DataView(buf);
    const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, "RIFF"); v.setUint32(4, 36 + ds, true); ws(8, "WAVE"); ws(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); ws(36, "data"); v.setUint32(40, ds, true);
    for (let i = 0; i < ns; i++) { const t = i / sr; const env = Math.min(1, Math.min(t * 20, (dur - t) * 10)); v.setInt16(44 + i * 2, Math.sin(2 * Math.PI * 440 * Math.pow(2, -t * 0.5) * t) * 0.3 * env * 32767, true); }
    return new Blob([buf], { type: "audio/wav" });
  };

  const hydrateMediaForMsg = useCallback(async (msg: ChatMsg) => {
    if (!msg.mediaId) return;
    const ck = msg.mediaId;
    if (blobUrlCacheRef.current.has(ck)) { if (msg.type === "audio" && !msg.audioUrl) msg.audioUrl = blobUrlCacheRef.current.get(ck)!; if (msg.type === "image" && !msg.imageUrl) msg.imageUrl = blobUrlCacheRef.current.get(ck)!; return; }
    if (mediaLoadingRef.current.has(ck)) return;
    mediaLoadingRef.current.add(ck);
    try { const b64 = await api.getMedia(msg.mediaId); if (b64) { const url = base64ToBlobUrl(b64, ck); if (msg.type === "audio") msg.audioUrl = url; if (msg.type === "image") msg.imageUrl = url; } } catch (e) { console.error("Erro media:", e); } finally { mediaLoadingRef.current.delete(ck); }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!selectedChat) return;
    try {
      const res = await api.getMessages(currentUsername, selectedChat);
      if (res.success) {
        const msgs = (res.messages || []) as ChatMsg[];
        const toFetch: ChatMsg[] = [];
        for (const m of msgs) { if (m.mediaId) { const c = blobUrlCacheRef.current.get(m.mediaId); if (c) { if (m.type === "audio") m.audioUrl = c; if (m.type === "image") m.imageUrl = c; } else toFetch.push(m); } }
        setMessages([...msgs]);
        api.markMessagesRead(currentUsername, selectedChat, currentUsername).catch(() => {});
        if (toFetch.length > 0) { await Promise.all(toFetch.map((m) => hydrateMediaForMsg(m))); setMessages((prev) => prev.map((pm) => { if (pm.mediaId && blobUrlCacheRef.current.has(pm.mediaId)) { const url = blobUrlCacheRef.current.get(pm.mediaId)!; if (pm.type === "audio" && !pm.audioUrl) return { ...pm, audioUrl: url }; if (pm.type === "image" && !pm.imageUrl) return { ...pm, imageUrl: url }; } return pm; })); }
      }
    } catch (e) { console.error("Erro msgs:", e); }
  }, [currentUsername, selectedChat, hydrateMediaForMsg]);

  useEffect(() => { if (selectedChat) { loadMessages(); pollingRef.current = setInterval(loadMessages, 3000); return () => { if (pollingRef.current) clearInterval(pollingRef.current); }; } else setMessages([]); }, [selectedChat, loadMessages]);
  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => () => { if (audioPlayerRef.current) { audioPlayerRef.current.pause(); audioPlayerRef.current = null; } blobUrlCacheRef.current.forEach((u) => URL.revokeObjectURL(u)); blobUrlCacheRef.current.clear(); }, []);

  const handleSend = async () => {
    if (!message.trim() || !selectedChat || sending) return;
    const text = message.trim(); setMessage(""); setSending(true);
    api.sendTyping(currentUsername, selectedChat, false).catch(() => {});
    setMessages((prev) => [...prev, { id: `temp-${Date.now()}`, from: currentUsername, to: selectedChat, text, type: "text", timestamp: new Date().toISOString(), read: false }]);
    try {
      await api.sendMessage(currentUsername, selectedChat, text);
      api.notifyNewMessage(selectedChat, currentUserName || currentUsername, text, "text").catch(() => {});
      await loadMessages();
    } catch (e) { console.error("Erro envio:", e); } finally { setSending(false); }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const formatTime = (ts: string) => { try { return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const handleBack = () => { setSelectedChat(null); setMessages([]); stopRecording(true); if (audioPlayerRef.current) { audioPlayerRef.current.pause(); setPlayingAudioId(null); } onConversationChange?.(false); };

  const startRecording = async () => {
    try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const mr = new MediaRecorder(stream); audioChunksRef.current = []; mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); }; mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); }; mr.start(); mediaRecorderRef.current = mr; setMicSimulated(false); setIsRecording(true); setRecordingTime(0); recordingTimerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000); } catch { showToast("Microfone indisponivel — modo simulado"); mediaRecorderRef.current = null; setMicSimulated(true); setIsRecording(true); setRecordingTime(0); recordingTimerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000); }
  };
  const stopRecording = async (cancel = false) => {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    if (micSimulated) { const d = recordingTime; setIsRecording(false); setMicSimulated(false); if (!cancel && d >= 1) { const blob = await generateSyntheticAudioBlob(Math.min(d, 10)); await sendAudioMessage(blob, d); } return; }
    const mr = mediaRecorderRef.current; if (!mr || mr.state === "inactive") { setIsRecording(false); return; } if (cancel) { mr.stop(); setIsRecording(false); return; }
    const d = recordingTime; mr.onstop = async () => { mr.stream.getTracks().forEach((t) => t.stop()); if (audioChunksRef.current.length === 0 || d < 1) { setIsRecording(false); return; } await sendAudioMessage(new Blob(audioChunksRef.current, { type: "audio/webm" }), d); setIsRecording(false); }; mr.stop();
  };
  const sendAudioMessage = async (blob: Blob, duration: number) => {
    if (!selectedChat) return;
    const localUrl = URL.createObjectURL(blob); const tempId = `sending-audio-${Date.now()}`; blobUrlCacheRef.current.set(tempId, localUrl);
    setMessages((prev) => [...prev, { id: tempId, from: currentUsername, to: selectedChat, text: `🎤 Audio (${formatDuration(duration)})`, type: "audio", timestamp: new Date().toISOString(), read: false, audioUrl: localUrl, audioDuration: duration }]); scrollToBottom();
    try { const b64 = await blobToBase64(blob); const mediaId = await api.uploadMedia(b64); blobUrlCacheRef.current.set(mediaId, localUrl); await api.sendMessage(currentUsername, selectedChat, `🎤 Audio (${formatDuration(duration)})`, "audio", { mediaId, audioDuration: duration }); await loadMessages(); } catch (e) { console.error("Erro audio:", e); showToast("Erro ao enviar audio"); }
  };
  const toggleAudioPlay = async (msgId: string, msg: ChatMsg) => {
    if (playingAudioId === msgId) { audioPlayerRef.current?.pause(); setPlayingAudioId(null); return; }
    if (audioPlayerRef.current) audioPlayerRef.current.pause();
    let url = msg.audioUrl;
    if (!url && msg.mediaId) { const c = blobUrlCacheRef.current.get(msg.mediaId); if (c) url = c; else { showToast("Carregando audio..."); const b64 = await api.getMedia(msg.mediaId); if (b64) { url = base64ToBlobUrl(b64, msg.mediaId); setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, audioUrl: url } : m)); } } }
    if (!url) { showToast("Audio indisponivel"); return; }
    const audio = new Audio(url); audio.onended = () => setPlayingAudioId(null); audio.onerror = () => { setPlayingAudioId(null); showToast("Erro ao reproduzir"); };
    audio.play().catch(() => { showToast("Erro ao reproduzir"); setPlayingAudioId(null); }); audioPlayerRef.current = audio; setPlayingAudioId(msgId);
  };
  const compressImage = (file: File, maxW = 800): Promise<Blob> => new Promise((resolve) => { const img = new window.Image(); img.onload = () => { const c = document.createElement("canvas"); const s = Math.min(1, maxW / img.width); c.width = img.width * s; c.height = img.height * s; c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); c.toBlob((b) => resolve(b || file), "image/jpeg", 0.7); }; img.src = URL.createObjectURL(file); });
  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !selectedChat) return; setShowAttachMenu(false);
    const compressed = await compressImage(file); const localUrl = URL.createObjectURL(compressed); const tempId = `sending-img-${Date.now()}`; blobUrlCacheRef.current.set(tempId, localUrl);
    setMessages((prev) => [...prev, { id: tempId, from: currentUsername, to: selectedChat, text: "📷 Foto", type: "image", timestamp: new Date().toISOString(), read: false, imageUrl: localUrl }]); scrollToBottom();
    try { const b64 = await blobToBase64(compressed); const mediaId = await api.uploadMedia(b64); blobUrlCacheRef.current.set(mediaId, localUrl); await api.sendMessage(currentUsername, selectedChat, "📷 Foto", "image", { mediaId }); await loadMessages(); } catch (err) { console.error("Erro foto:", err); showToast("Erro ao enviar foto"); }
    e.target.value = "";
  };

  // ─── Fullscreen Conversation View ─────────────
  if (selectedChat && selectedContact) {
    const accentColor = selectedContact.role === "vendedor" ? "#8b5cf6" : "#00f0ff";
    return (
      <>
        <AnimatePresence>{toast && (<motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] px-4 py-2.5 rounded-xl text-white text-sm font-medium border backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)]" style={{ background: "linear-gradient(135deg, #1f1f2e 0%, #12121a 100%)", borderColor: `${accentColor}30` }}><div className="flex items-center gap-2"><motion.div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1, repeat: Infinity }} />{toast}</div></motion.div>)}</AnimatePresence>
        {/* Calls are handled via global call overlay in the parent panel */}
        <AnimatePresence>{previewImage && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}><motion.button className="absolute top-4 right-4 p-2 bg-[#1f1f2e] rounded-full text-white z-10" whileTap={{ scale: 0.9 }} onClick={() => setPreviewImage(null)}><X className="w-5 h-5" /></motion.button><motion.img src={previewImage} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="max-w-full max-h-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} /></motion.div>)}</AnimatePresence>

        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="fixed inset-0 z-[70] bg-[#050508] flex flex-col">
          {/* Header */}
          <div className="relative shrink-0 bg-[#0a0a12]/95 backdrop-blur-xl border-b border-[#1f1f2e]/60 px-4 py-3 flex items-center gap-3">
            <motion.div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}30, transparent)` }} animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 3, repeat: Infinity }} />
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleBack} className="p-1.5 rounded-xl hover:bg-[#1f1f2e] text-gray-400 transition-colors shrink-0"><ChevronLeft className="w-5 h-5" /></motion.button>
            <NeonAvatar photo={selectedContact.photo} name={selectedContact.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">{selectedContact.name}</p>
              <div className="flex items-center gap-1.5">
                {typingMap[selectedContact.username] ? (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#00f0ff] text-[11px] font-medium italic">digitando...</motion.span>
                ) : presenceMap[selectedContact.username] ? (
                  <><motion.div className="w-1.5 h-1.5 rounded-full bg-[#00ff41]" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} /><span className="text-[#00ff41] text-[11px] font-medium">Online</span></>
                ) : (
                  <><div className="w-1.5 h-1.5 rounded-full bg-gray-500" /><span className="text-gray-500 text-[11px] font-medium">Offline</span></>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <motion.button whileTap={{ scale: 0.85 }} onClick={() => onStartCall?.(selectedContact.username, "video", selectedContact.name)} className="p-2 rounded-xl hover:bg-[#1f1f2e] transition-colors" style={{ color: accentColor }}><Video className="w-5 h-5" /></motion.button>
              <motion.button whileTap={{ scale: 0.85 }} onClick={() => onStartCall?.(selectedContact.username, "voice", selectedContact.name)} className="p-2 rounded-xl hover:bg-[#1f1f2e] transition-colors" style={{ color: accentColor }}><Phone className="w-5 h-5" /></motion.button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" onClick={() => setShowAttachMenu(false)}>
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center h-full text-center">
                <motion.div animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.95, 1, 0.95] }} transition={{ duration: 3, repeat: Infinity }} className="w-20 h-20 rounded-2xl bg-[#1f1f2e]/50 flex items-center justify-center mb-3"><Send className="w-8 h-8 text-gray-600" /></motion.div>
                <p className="text-gray-500 text-sm font-medium">Inicie uma conversa</p><p className="text-gray-600 text-xs">com {selectedContact.name}</p>
              </div>
            ) : (
              <>
                <AnimatePresence initial={false}>
                  {messages.map((msg) => {
                    const isMine = msg.from === currentUsername;
                    const bubbleClass = isMine ? "bg-gradient-to-br from-[#ff00ff]/15 to-[#8b5cf6]/15 border border-[#ff00ff]/10" : "bg-[#12121a] border border-[#1f1f2e]/60";
                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.15 }} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl overflow-hidden ${bubbleClass}`}>
                          {msg.type === "image" ? (msg.imageUrl ? (<div><button onClick={() => setPreviewImage(msg.imageUrl!)} className="w-full"><img src={msg.imageUrl} alt="Foto" className="w-full max-h-[250px] object-cover rounded-t-2xl" /></button><div className={`flex items-center gap-1 px-3 py-1.5 ${isMine ? "justify-end" : "justify-start"}`}><span className="text-gray-600 text-[9px]">{formatTime(msg.timestamp)}</span>{isMine && (msg.read ? <CheckCheck className="w-3 h-3 text-[#ff00ff]" /> : <Check className="w-3 h-3 text-gray-600" />)}</div></div>) : (<div className="px-3 py-4 flex flex-col items-center gap-2"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-6 h-6 border-2 border-t-transparent rounded-full" style={{ borderColor: `${accentColor}60`, borderTopColor: "transparent" }} /><span className="text-gray-500 text-[10px]">Carregando foto...</span></div>)
                          ) : msg.type === "audio" ? (
                            <div className="px-4 py-2.5"><div className="flex items-center gap-2.5"><motion.button whileTap={{ scale: 0.85 }} onClick={() => toggleAudioPlay(msg.id, msg)} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${accentColor}, #8b5cf6)` }}>{playingAudioId === msg.id ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white ml-0.5" />}</motion.button><div className="flex-1 min-w-0"><AudioWaveform playing={playingAudioId === msg.id} color={isMine ? "#ff00ff" : "#8b5cf6"} /></div><span className="text-gray-500 text-[11px] font-mono shrink-0">{formatDuration(msg.audioDuration || 0)}</span></div><div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}><span className="text-gray-600 text-[9px]">{formatTime(msg.timestamp)}</span>{isMine && (msg.read ? <CheckCheck className="w-3 h-3 text-[#ff00ff]" /> : <Check className="w-3 h-3 text-gray-600" />)}</div></div>
                          ) : (
                            <div className="px-4 py-2.5"><p className="text-white text-sm break-words leading-relaxed">{msg.text}</p><div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : "justify-start"}`}><span className="text-gray-600 text-[9px]">{formatTime(msg.timestamp)}</span>{isMine && (msg.read ? <CheckCheck className="w-3 h-3 text-[#ff00ff]" /> : <Check className="w-3 h-3 text-gray-600" />)}</div></div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {/* Typing indicator bubble */}
                <AnimatePresence>
                  {selectedChat && typingMap[selectedChat] && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                      className="flex justify-start">
                      <div className="bg-[#1f1f2e] border border-[#2a2a3e] rounded-2xl px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          {[0, 1, 2].map(i => (
                            <motion.div key={i} className="w-2 h-2 rounded-full bg-[#ff00ff]"
                              animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="relative shrink-0 bg-[#0a0a12]/95 backdrop-blur-xl border-t border-[#1f1f2e]/60 p-3">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelected} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelected} />
            <AnimatePresence>{showAttachMenu && (<motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute bottom-full left-2 mb-2 bg-[#12121a] border border-[#1f1f2e] rounded-2xl p-2 shadow-[0_0_30px_rgba(0,0,0,0.6)] min-w-[160px]">
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => { cameraInputRef.current?.click(); setShowAttachMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#1f1f2e] transition-colors text-left"><div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ff006e, #ff00ff)" }}><Camera className="w-4 h-4 text-white" /></div><span className="text-white text-xs font-medium">Camera</span></motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#1f1f2e] transition-colors text-left"><div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #8b5cf6, #00f0ff)" }}><ImageIcon className="w-4 h-4 text-white" /></div><span className="text-white text-xs font-medium">Galeria</span></motion.button>
            </motion.div>)}</AnimatePresence>
            {isRecording ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => stopRecording(true)} className="p-2.5 rounded-xl bg-[#ff006e]/20 text-[#ff006e] shrink-0 border border-[#ff006e]/20"><Trash2 className="w-4 h-4" /></motion.button>
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-[#12121a] rounded-xl border border-[#ff006e]/20"><motion.div className="w-2.5 h-2.5 rounded-full bg-[#ff006e] shrink-0" animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1, repeat: Infinity }} /><span className="text-[#ff006e] font-mono text-sm font-bold">{formatDuration(recordingTime)}</span><div className="flex-1"><AudioWaveform playing={true} color="#ff006e" /></div></div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => stopRecording(false)} className="p-3 rounded-xl text-white shrink-0" style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #8b5cf6 100%)` }}><Send className="w-5 h-5" /></motion.button>
              </motion.div>
            ) : (
              <div className="flex items-center gap-2">
                <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); setShowAttachMenu(!showAttachMenu); }} className={`p-2 rounded-xl transition-colors shrink-0 ${showAttachMenu ? "bg-[#1f1f2e] text-white" : "hover:bg-[#1f1f2e] text-gray-500"}`}><Paperclip className="w-5 h-5" /></motion.button>
                <input type="text" value={message} onChange={(e) => handleTypingInput(e.target.value)} onKeyDown={handleKeyDown} onFocus={() => setShowAttachMenu(false)} placeholder="Mensagem..." className="flex-1 px-4 py-3 bg-[#12121a] border border-[#1f1f2e]/60 rounded-xl text-white text-sm focus:outline-none focus:border-[#ff00ff]/40 transition-all placeholder-gray-600" />
                {message.trim() ? (
                  <motion.button whileTap={{ scale: 0.9 }} onClick={handleSend} disabled={sending} className="p-3 rounded-xl text-white disabled:opacity-30 shrink-0" style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #8b5cf6 100%)` }}><Send className="w-5 h-5" /></motion.button>
                ) : (
                  <motion.button whileTap={{ scale: 0.85 }} onClick={startRecording} className="p-3 rounded-xl text-white shrink-0" style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #8b5cf6 100%)` }}><Mic className="w-5 h-5" /></motion.button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </>
    );
  }

  // ─── Contact List with Tabs ───────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-[#1f1f2e]/60 px-4 py-3">
        <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-[#ff00ff]" /> Conversas</h2>
        <div className="relative flex bg-[#0c0c14] rounded-xl border border-[#1f1f2e]/50 p-1">
          <motion.div className="absolute top-1 bottom-1 rounded-lg z-0" animate={{ left: chatTab === "vendedor" ? "4px" : "50%", width: "calc(50% - 4px)" }} transition={{ type: "spring", stiffness: 400, damping: 30 }} style={{ background: chatTab === "vendedor" ? "linear-gradient(135deg, #8b5cf615, #ff00ff15)" : "linear-gradient(135deg, #00f0ff15, #8b5cf615)" }} />
          <motion.div className="absolute top-0 rounded-xl" animate={{ left: chatTab === "vendedor" ? "25%" : "75%", x: "-50%" }} transition={{ type: "spring", stiffness: 400, damping: 30 }} style={{ width: 30, height: 2, background: chatTab === "vendedor" ? "#8b5cf6" : "#00f0ff", boxShadow: chatTab === "vendedor" ? "0 0 8px rgba(139,92,246,0.6)" : "0 0 8px rgba(0,240,255,0.6)" }} />
          {[
            { id: "vendedor" as const, label: "Vendedor", count: vendedorContacts.length, color: "#8b5cf6", icon: <Store className="w-3.5 h-3.5" /> },
            { id: "clientes" as const, label: "Clientes", count: clienteContacts.length, color: "#00f0ff", icon: <Users className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setChatTab(tab.id)} className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg font-semibold text-xs transition-colors ${chatTab === tab.id ? "text-white" : "text-gray-500"}`}>
              <span style={{ color: chatTab === tab.id ? tab.color : undefined }}>{tab.icon}</span><span>{tab.label}</span>
              <motion.span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: chatTab === tab.id ? `${tab.color}20` : "#1f1f2e", color: chatTab === tab.id ? tab.color : "#666" }} animate={chatTab === tab.id ? { boxShadow: [`0 0 4px ${tab.color}20`, `0 0 8px ${tab.color}40`, `0 0 4px ${tab.color}20`] } : {}} transition={{ duration: 2, repeat: Infinity }}>{tab.count}</motion.span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <AnimatePresence mode="wait">
          <motion.div key={chatTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {activeContacts.length === 0 ? (
              <GlowCard glowColor={chatTab === "vendedor" ? "#8b5cf6" : "#00f0ff"}>
                <div className="p-8 text-center">
                  <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 3, repeat: Infinity }}>{chatTab === "vendedor" ? <Store className="w-10 h-10 text-gray-700 mx-auto mb-2" /> : <Users className="w-10 h-10 text-gray-700 mx-auto mb-2" />}</motion.div>
                  <p className="text-gray-500 text-xs">Nenhum {chatTab === "vendedor" ? "vendedor vinculado" : "cliente disponível"}</p>
                  <p className="text-gray-600 text-[10px] mt-1">{chatTab === "vendedor" ? "Vincule-se a um vendedor" : "Os clientes do seu vendedor aparecerão aqui"}</p>
                </div>
              </GlowCard>
            ) : (
              <div className="space-y-2">
                {activeContacts.map((contact, i) => {
                  const isVendedorContact = contact.role === "vendedor";
                  const accent = isVendedorContact ? "#8b5cf6" : "#00f0ff";
                  const contactOnline = presenceMap[contact.username] ?? false;
                  const lastMsg = lastMessagesMap[contact.username];
                  const lastMsgPreview = lastMsg
                    ? lastMsg.type === "audio" ? "🎤 Audio"
                      : lastMsg.type === "image" ? "📷 Foto"
                      : lastMsg.text.length > 30 ? lastMsg.text.substring(0, 30) + "..." : lastMsg.text
                    : null;
                  const lastMsgTime = lastMsg?.timestamp
                    ? (() => { try { return new Date(lastMsg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } })()
                    : null;
                  return (
                    <motion.button key={contact.username} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} onClick={() => { setSelectedChat(contact.username); onConversationChange?.(true); }} whileTap={{ scale: 0.98 }} className="w-full text-left">
                      <GlowCard glowColor={contactOnline ? "#00ff41" : "#666"}>
                        <div className="flex items-center gap-3 p-3.5">
                          <NeonAvatar photo={contact.photo} name={contact.name} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm truncate">{contact.name}</p>
                            {lastMsgPreview ? (
                              <p className="text-gray-500 text-xs truncate mt-0.5">{lastMsg?.from === currentUsername && <span className="text-gray-600">Você: </span>}{lastMsgPreview}</p>
                            ) : (
                              <p className="text-gray-500 text-xs">@{contact.username}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <div className="flex items-center gap-1.5">
                              {lastMsgTime && <span className="text-[10px] font-mono text-gray-600">{lastMsgTime}</span>}
                              {contactOnline ? (
                                <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-[9px] font-semibold text-[#00ff41] bg-[#00ff41]/10 px-1.5 py-0.5 rounded-full border border-[#00ff41]/20">ON</motion.div>
                              ) : (
                                <span className="text-[9px] font-semibold text-gray-500 bg-gray-500/10 px-1.5 py-0.5 rounded-full border border-gray-500/20">OFF</span>
                              )}
                            </div>
                            <motion.div className="p-1.5 rounded-lg" style={{ backgroundColor: `${accent}15` }}><MessageSquare className="w-3.5 h-3.5" style={{ color: accent }} /></motion.div>
                          </div>
                        </div>
                      </GlowCard>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

type TabId = "entregas" | "chat" | "relatorios";

export function MotoristaPanel() {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(() => {
    try { return localStorage.getItem("motorista_online_" + JSON.parse(localStorage.getItem("currentUser") || "{}").username) === "true"; } catch { return false; }
  });
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("entregas");
  const [orders, setOrders] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [vendedorClients, setVendedorClients] = useState<any[]>([]);
  const [isChatConversationOpen, setIsChatConversationOpen] = useState(false);
  const [driverConfig, setDriverConfig] = useState<{ taxaFixa: number; taxaPercent: number }>({ taxaFixa: 5, taxaPercent: 8 });
  const [earningsData, setEarningsData] = useState<any>(null);
  const [earningsFilter, setEarningsFilter] = useState<number>(7);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [deliveryChatOrder, setDeliveryChatOrder] = useState<any>(null);
  const [deliveryChatMsgs, setDeliveryChatMsgs] = useState<any[]>([]);
  const [deliveryChatInput, setDeliveryChatInput] = useState("");
  const [sendingLocation, setSendingLocation] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any>(null);
  const [prevNewOrderCount, setPrevNewOrderCount] = useState(0);
  const [newOrderPulse, setNewOrderPulse] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showItemsPreview, setShowItemsPreview] = useState(false);
  const deliveryChatRef = useRef<HTMLDivElement>(null);
  const deliveryChatPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const { creator: vendedor, loading } = useUserCreator(currentUser.username);
  const callSystem = useCallSystem(currentUser.username);

  const [totalUnread, setTotalUnread] = useState(0);

  // ─── Heartbeat for presence ───
  useEffect(() => {
    if (!currentUser.username) return;
    api.sendHeartbeat(currentUser.username).catch(() => {});
    const hb = setInterval(() => api.sendHeartbeat(currentUser.username).catch(() => {}), 15000);
    return () => clearInterval(hb);
  }, [currentUser.username]);

  const handleStartCall = useCallback(async (to: string, type: "voice" | "video", _toName: string) => {
    await callSystem.startCall(to, type, currentUser.name || currentUser.username, currentUser.photo);
  }, [callSystem.startCall, currentUser.name, currentUser.username, currentUser.photo]);

  // Commission config - loads vendedor-specific rates for this driver
  const loadDriverConfig = useCallback(async () => {
    if (!vendedor?.username) return;
    try {
      const r = await api.getDriverCommission(vendedor.username, currentUser.username);
      if (r.success && r.config) {
        setDriverConfig({
          taxaFixa: r.config.taxaFixa ?? 5,
          taxaPercent: r.config.taxaPercent ?? 8,
        });
      }
    } catch { /* use defaults */ }
  }, [vendedor?.username, currentUser.username]);

  const loadVendedorClients = useCallback(async () => {
    if (!vendedor?.username) return;
    try {
      const r = await api.getUsersCreatedBy(vendedor.username);
      if (r.success) setVendedorClients((r.users || []).filter((u: any) => u.role === "cliente"));
    } catch (e) { console.error("Erro ao carregar clientes:", e); }
  }, [vendedor?.username]);

  const loadOrders = useCallback(async () => {
    try {
      const res = await api.getDriverOrders(currentUser.username);
      if (res.success) setOrders(res.orders || []);
    } catch (err) { console.error("Erro ao carregar entregas:", err); }
  }, [currentUser.username]);

  const loadMetrics = useCallback(async () => {
    try {
      const res = await api.getMetrics(currentUser.username);
      if (res.success) setMetrics(res.metrics || {});
    } catch (err) { console.error("Erro ao carregar metricas:", err); }
  }, [currentUser.username]);

  const loadEarnings = useCallback(async () => {
    setLoadingEarnings(true);
    try {
      const res = await api.getDriverEarnings(currentUser.username, earningsFilter);
      if (res.success) setEarningsData(res.earnings);
    } catch (err) { console.error("Erro ao carregar ganhos:", err); }
    finally { setLoadingEarnings(false); }
  }, [currentUser.username, earningsFilter]);

  useEffect(() => { loadOrders(); loadMetrics(); loadVendedorClients(); loadDriverConfig(); }, [loadOrders, loadMetrics, loadVendedorClients, loadDriverConfig]);
  useEffect(() => { if (activeTab === "relatorios") loadEarnings(); }, [activeTab, loadEarnings]);
  useEffect(() => { const i = setInterval(() => { loadVendedorClients(); loadOrders(); }, 8000); return () => clearInterval(i); }, [loadVendedorClients, loadOrders]);

  // ─── New order arrival detection with sound ───
  useEffect(() => {
    const currentNewCount = orders.filter((o) => ["accepted", "preparing", "delivering"].includes(o.status)).length;
    if (currentNewCount > prevNewOrderCount && prevNewOrderCount >= 0 && isOnline) {
      sfx.playNotification();
      setNewOrderPulse(true);
      setTimeout(() => setNewOrderPulse(false), 3000);
      if (activeTab !== "entregas") {
        setStatusToast("🔔 Novo pedido disponível para entrega!");
        setTimeout(() => setStatusToast(null), 4000);
      }
    }
    setPrevNewOrderCount(currentNewCount);
  }, [orders, isOnline]);

  const handleToggleOnline = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    localStorage.setItem("motorista_online_" + currentUser.username, String(newStatus));
    sfx.playToggle(newStatus);
    try { await api.setUserStatus(currentUser.username, newStatus); } catch (err) { console.error(err); }
    if (newStatus) {
      pwa.setPushEnabledForUser(currentUser.username, true);
      pwa.registerPushSubscription(currentUser.username).catch(() => {});
      setStatusToast("🟢 Você Está Online, Receberá pedidos e Notificações");
    } else {
      pwa.setPushEnabledForUser(currentUser.username, false);
      pwa.unregisterPushSubscription(currentUser.username).catch(() => {});
      setStatusToast("🔴 Você Está Off, Não receberá Pedidos e nem Notificações");
    }
    setTimeout(() => setStatusToast(null), 4000);
  };

  // Re-register push on mount if online
  useEffect(() => {
    if (isOnline && currentUser.username) {
      api.setUserStatus(currentUser.username, true).catch(() => {});
      pwa.setPushEnabledForUser(currentUser.username, true);
      pwa.registerPushSubscription(currentUser.username).catch(() => {});
    }
  }, []);

  const calcCommission = (total: number) => {
    const fixa = driverConfig.taxaFixa || 0;
    const perc = ((driverConfig.taxaPercent || 0) / 100) * total;
    return { fixa, perc, total: fixa + perc };
  };

  const handleAcceptOrder = async (order: any) => {
    try {
      await api.updateOrderStatus(order.id, { status: "driver_accepted", vendorUsername: order.vendorUsername, clientUsername: order.clientUsername, driverUsername: currentUser.username });
      sfx.playSuccess();
      notif.notifyOrderStatus("driver_accepted", order.id);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "driver_accepted", driverAcceptedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : o)));
      // Open delivery chat automatically
      setDeliveryChatOrder({ ...order, status: "driver_accepted" });
    } catch (err: any) { sfx.playError(); alert("Erro: " + err.message); }
  };

  const handleCollected = async (order: any) => {
    try {
      await api.updateOrderStatus(order.id, { status: "collected", vendorUsername: order.vendorUsername, clientUsername: order.clientUsername, driverUsername: currentUser.username });
      sfx.playCollected();
      notif.notifyOrderStatus("collected", order.id);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "collected", collectedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : o)));
      if (deliveryChatOrder?.id === order.id) setDeliveryChatOrder({ ...order, status: "collected", collectedAt: new Date().toISOString() });
    } catch (err: any) { sfx.playError(); alert("Erro: " + err.message); }
  };

  const handleOnTheWay = async (order: any) => {
    try {
      await api.updateOrderStatus(order.id, { status: "on_the_way", vendorUsername: order.vendorUsername, clientUsername: order.clientUsername, driverUsername: currentUser.username });
      sfx.playSuccess();
      notif.notifyOrderStatus("on_the_way", order.id);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "on_the_way", onTheWayAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : o)));
      if (deliveryChatOrder?.id === order.id) setDeliveryChatOrder({ ...order, status: "on_the_way", onTheWayAt: new Date().toISOString() });
    } catch (err: any) { sfx.playError(); alert("Erro: " + err.message); }
  };

  const handleConfirmDelivery = async (order: any) => {
    const comm = calcCommission(order.total || 0);
    try {
      await api.updateOrderStatus(order.id, {
        status: "delivered",
        vendorUsername: order.vendorUsername,
        clientUsername: order.clientUsername,
        driverUsername: currentUser.username,
        driverCommission: { fixa: comm.fixa, perc: comm.perc, total: comm.total, orderTotal: order.total || 0 },
      });
      sfx.playDeliveryComplete();
      notif.notifyOrderStatus("delivered", order.id);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "delivered", deliveredAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : o)));
      loadMetrics();
      if (deliveryChatOrder?.id === order.id) setDeliveryChatOrder(null);
      // Trigger celebration
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3500);
    } catch (err: any) { sfx.playError(); alert("Erro: " + err.message); }
  };

  // ─── Delivery Chat with Client ────────────────
  const loadDeliveryChatMsgs = useCallback(async () => {
    if (!deliveryChatOrder?.clientUsername) return;
    try {
      const res = await api.getMessages(currentUser.username, deliveryChatOrder.clientUsername);
      if (res.success) setDeliveryChatMsgs(res.messages || []);
    } catch {}
  }, [currentUser.username, deliveryChatOrder?.clientUsername]);

  useEffect(() => {
    if (deliveryChatOrder) {
      loadDeliveryChatMsgs();
      deliveryChatPollRef.current = setInterval(loadDeliveryChatMsgs, 3000);
      return () => { if (deliveryChatPollRef.current) clearInterval(deliveryChatPollRef.current); };
    } else {
      setDeliveryChatMsgs([]);
    }
  }, [deliveryChatOrder?.id, loadDeliveryChatMsgs]);

  useEffect(() => {
    if (deliveryChatRef.current) deliveryChatRef.current.scrollTop = deliveryChatRef.current.scrollHeight;
  }, [deliveryChatMsgs]);

  const handleSendDeliveryChat = async () => {
    if (!deliveryChatInput.trim() || !deliveryChatOrder) return;
    const text = deliveryChatInput.trim();
    setDeliveryChatInput("");
    try {
      await api.sendMessage(currentUser.username, deliveryChatOrder.clientUsername, text);
      api.notifyNewMessage(deliveryChatOrder.clientUsername, currentUser.name || currentUser.username, text, "text").catch(() => {});
      loadDeliveryChatMsgs();
    } catch {}
  };

  const handleSendMyLocation = async () => {
    if (!deliveryChatOrder || sendingLocation) return;
    setSendingLocation(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });
      const { latitude, longitude } = pos.coords;
      const locText = `📍 Minha localização: https://maps.google.com/?q=${latitude},${longitude}`;
      await api.sendMessage(currentUser.username, deliveryChatOrder.clientUsername, locText, "location");
      api.notifyNewMessage(deliveryChatOrder.clientUsername, currentUser.name || currentUser.username, "📍 Localização compartilhada", "location").catch(() => {});
      loadDeliveryChatMsgs();
    } catch (err) {
      alert("Não foi possível obter localização. Verifique as permissões do GPS.");
    } finally {
      setSendingLocation(false);
    }
  };

  // Order categories
  const newOrders = orders.filter((o) => ["accepted", "preparing", "delivering"].includes(o.status));
  const activeDeliveries = orders.filter((o) => ["driver_accepted", "collected", "on_the_way"].includes(o.status));
  const completedDeliveries = orders.filter((o) => o.status === "delivered");
  const totalEarned = completedDeliveries.reduce((sum, o) => {
    // Use stored actual commission if available (from backend), otherwise calculate
    if (o.driverCommission?.total) return sum + o.driverCommission.total;
    if (o.feeBreakdown?.driverTotal) return sum + o.feeBreakdown.driverTotal;
    return sum + calcCommission(o.total || 0).total;
  }, 0);

  // Delivery data for charts (last 7 days)
  const deliveryChartData = (() => {
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });
    return last7.map((date) => {
      const dayOrders = completedDeliveries.filter((o: any) => (o.updatedAt || o.createdAt || "").startsWith(date));
      const dayEarnings = dayOrders.reduce((sum: number, o: any) => {
        if (o.driverCommission?.total) return sum + o.driverCommission.total;
        if (o.feeBreakdown?.driverTotal) return sum + o.feeBreakdown.driverTotal;
        return sum + calcCommission(o.total || 0).total;
      }, 0);
      const dayLabel = new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3);
      return { name: dayLabel, entregas: dayOrders.length, ganhos: Math.round(dayEarnings * 100) / 100 };
    });
  })();

  const vendedorChatContacts: ChatContact[] = vendedor
    ? [{ username: vendedor.username, name: vendedor.name || "Vendedor", photo: vendedor.photo || "", role: "vendedor" }]
    : [];
  const activeClientUsernames = new Set(
    orders.filter((o) => ["delivering", "driver_accepted", "collected", "on_the_way"].includes(o.status) && o.driverUsername === currentUser.username).map((o) => o.clientUsername)
  );
  const clienteChatContacts: ChatContact[] = vendedorClients
    .filter((c: any) => activeClientUsernames.has(c.username))
    .map((c: any) => ({ username: c.username, name: c.name || c.username, photo: c.photo || "", role: "cliente" }));

  // ─── Sidebar unread badge polling ───
  const allChatContacts = [...vendedorChatContacts, ...clienteChatContacts];
  useEffect(() => {
    if (!currentUser.username || allChatContacts.length === 0) return;
    const poll = async () => {
      try {
        const contacts = allChatContacts.map((c) => c.username);
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
  }, [currentUser.username, allChatContacts.length]);

  const tabs: { id: TabId; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: "entregas", icon: <Truck className="w-5 h-5" />, label: "Entregas", badge: (newOrders.length + activeDeliveries.length) > 0 ? newOrders.length + activeDeliveries.length : undefined },
    { id: "chat", icon: <MessageSquare className="w-5 h-5" />, label: "Chat", badge: totalUnread > 0 ? totalUnread : undefined },
    { id: "relatorios", icon: <BarChart3 className="w-5 h-5" />, label: "Relatórios" },
  ];

  if (loading) {
    return (
      <div className="h-dvh bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="inline-block mb-4">
            <Loader className="w-12 h-12 text-[#ff00ff]" />
          </motion.div>
          <p className="text-white font-semibold">Carregando dados...</p>
        </div>
      </div>
    );
  }

  const isChat = activeTab === "chat" && isChatConversationOpen;

  return (
    <div className="h-dvh bg-[#0a0a0f] flex flex-col overflow-hidden relative">
      {/* Status Toast */}
      <AnimatePresence>
        {statusToast && (
          <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-2xl text-white text-sm font-semibold border backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.6)] max-w-[90vw] text-center"
            style={{ background: statusToast.includes("Online") ? "linear-gradient(135deg, rgba(0,255,65,0.2), rgba(0,240,255,0.15))" : "linear-gradient(135deg, rgba(255,0,60,0.2), rgba(255,0,110,0.15))", borderColor: statusToast.includes("Online") ? "rgba(0,255,65,0.4)" : "rgba(255,0,60,0.4)" }}
          >
            {statusToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Particle Background ── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <ParticleBackground />
        <motion.div className="absolute top-0 right-1/4 w-64 h-64 bg-[#ff00ff] rounded-full blur-[100px] opacity-15" animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }} transition={{ duration: 4, repeat: Infinity }} />
        <motion.div className="absolute bottom-0 left-1/4 w-64 h-64 bg-[#00f0ff] rounded-full blur-[100px] opacity-15" animate={{ scale: [1.2, 1, 1.2], opacity: [0.15, 0.25, 0.15] }} transition={{ duration: 4, repeat: Infinity, delay: 2 }} />
      </div>

      {/* ── Header ── */}
      {!isChat && (
        <div className="relative z-20 shrink-0 bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-[#1f1f2e]/60">
          <motion.div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, #ff00ff40, transparent)" }} animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 3, repeat: Infinity }} />
          <div className="px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <NeonAvatar photo={currentUser.photo} name={currentUser.name || currentUser.username} size="md" />
              <div className="min-w-0">
                <h1 className="text-white font-bold text-base truncate">{currentUser.name || currentUser.username}</h1>
                <p className="text-gray-500 text-[11px] truncate flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Motorista
                  {vendedor && <span className="text-[#8b5cf6]"> • {vendedor.name}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <NotificationBell />
              <motion.button onClick={() => setShowLogoutConfirm(true)} whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-[#ff006e]/10 text-[#ff006e]">
                <LogOut className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* ── Content Area ── */}
      <div className={`relative z-10 flex-1 overflow-hidden ${isChat ? "" : "pb-16"}`}>
        <AnimatePresence mode="wait">

          {/* ════════════ ENTREGAS ════════════ */}
          {activeTab === "entregas" && (
            <motion.div key="entregas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto overscroll-contain px-4 py-3 space-y-3">

              {/* ── BIG ONLINE/OFFLINE TOGGLE ── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl"
              >
                <motion.div className="absolute inset-0" style={{ background: isOnline ? "linear-gradient(135deg, rgba(0,255,65,0.08), rgba(0,240,255,0.05))" : "linear-gradient(135deg, rgba(255,0,255,0.05), rgba(100,100,120,0.05))" }} />
                <div className={`relative border rounded-2xl p-4 ${isOnline ? "border-[#00ff41]/30" : "border-[#2a2a3e]/60"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isOnline ? (
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-3 h-3 rounded-full bg-[#00ff41] shadow-[0_0_10px_rgba(0,255,65,0.6)]" />
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-gray-600" />
                        )}
                        <span className={`font-bold text-sm ${isOnline ? "text-[#00ff41]" : "text-gray-400"}`}>
                          {isOnline ? "Você Está Online" : "Você Está Offline"}
                        </span>
                      </div>
                      <p className="text-gray-500 text-[11px]">
                        {isOnline ? "Recebendo pedidos e notificações" : "Ative para receber pedidos e notificações"}
                      </p>
                    </div>
                    <motion.button
                      onClick={handleToggleOnline}
                      whileTap={{ scale: 0.92 }}
                      className={`relative w-20 h-10 rounded-full transition-all duration-300 ${isOnline ? "shadow-[0_0_25px_rgba(0,255,65,0.4)]" : ""}`}
                      style={{ background: isOnline ? "linear-gradient(135deg, #00ff41, #00f0ff)" : "#1f1f2e" }}
                    >
                      <motion.div
                        className="absolute top-1 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center"
                        animate={{ left: isOnline ? "calc(100% - 36px)" : "4px" }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <Power className={`w-4 h-4 ${isOnline ? "text-[#00ff41]" : "text-gray-400"}`} />
                      </motion.div>
                    </motion.button>
                  </div>
                  {isOnline && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-3 pt-3 border-t border-[#00ff41]/15">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <p className="text-[#00ff41] font-bold text-lg">{newOrders.length}</p>
                          <p className="text-gray-500 text-[9px] uppercase">Novos</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[#ff00ff] font-bold text-lg">{activeDeliveries.length}</p>
                          <p className="text-gray-500 text-[9px] uppercase">Em Rota</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[#00f0ff] font-bold text-lg">{completedDeliveries.length}</p>
                          <p className="text-gray-500 text-[9px] uppercase">Feitas</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* ── Commission Config Card ── */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="bg-[#12121a]/90 border border-[#8b5cf6]/20 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-[#8b5cf6]/15 flex items-center justify-center"><Wallet className="w-3.5 h-3.5 text-[#8b5cf6]" /></div>
                  <p className="text-white font-bold text-xs">Sua Comissao</p>
                  {vendedor && <span className="text-gray-500 text-[10px] ml-auto">por {vendedor.name}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-[#0a0a0f] rounded-lg p-2.5 border border-[#1f1f2e]/60 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Banknote className="w-3 h-3 text-[#00ff41]" />
                      <span className="text-[#00ff41] font-bold text-sm">R$ {driverConfig.taxaFixa.toFixed(2)}</span>
                    </div>
                    <p className="text-gray-500 text-[9px] uppercase">Taxa Fixa</p>
                  </div>
                  <div className="text-gray-600 text-lg font-light">+</div>
                  <div className="flex-1 bg-[#0a0a0f] rounded-lg p-2.5 border border-[#1f1f2e]/60 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Percent className="w-3 h-3 text-[#00f0ff]" />
                      <span className="text-[#00f0ff] font-bold text-sm">{driverConfig.taxaPercent}%</span>
                    </div>
                    <p className="text-gray-500 text-[9px] uppercase">Da Venda</p>
                  </div>
                  <div className="text-gray-600 text-lg font-light">=</div>
                  <div className="flex-1 bg-[#0a0a0f] rounded-lg p-2.5 border border-[#ff00ff]/20 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Star className="w-3 h-3 text-[#ff00ff]" />
                      <span className="text-[#ff00ff] font-bold text-sm">R$ {totalEarned.toFixed(0)}</span>
                    </div>
                    <p className="text-gray-500 text-[9px] uppercase">Ganho Total</p>
                  </div>
                </div>
              </motion.div>

              {/* ── NEW ORDERS (Solicitacoes) ── */}
              {newOrders.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  {/* New order arrival flash */}
                  <AnimatePresence>
                    {newOrderPulse && (
                      <motion.div initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }} exit={{ opacity: 0, scaleY: 0 }}
                        className="mb-2 p-2.5 rounded-xl border border-[#ff9f00]/40 overflow-hidden relative">
                        <motion.div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(255,159,0,0.15), rgba(255,0,255,0.08))" }}
                          animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.8, repeat: Infinity }} />
                        <div className="relative flex items-center gap-2">
                          <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>
                            <Bell className="w-5 h-5 text-[#ff9f00]" />
                          </motion.div>
                          <span className="text-[#ff9f00] font-bold text-xs">Nova entrega disponivel!</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="flex items-center gap-2 mb-2">
                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                      <Bell className="w-4 h-4 text-[#ff9f00]" />
                    </motion.div>
                    <h3 className="text-white font-bold text-sm">Novos Pedidos</h3>
                    <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                      className="ml-auto px-2 py-0.5 bg-[#ff9f00]/20 text-[#ff9f00] rounded-full text-[10px] font-bold">{newOrders.length}</motion.span>
                  </div>
                  <div className="space-y-2.5">
                    {newOrders.map((order, idx) => {
                      const comm = calcCommission(order.total || 0);
                      return (
                        <motion.div key={order.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.06 }}
                          className="relative overflow-hidden bg-[#12121a]/90 border border-[#ff9f00]/30 rounded-2xl shadow-[0_0_20px_rgba(255,159,0,0.06)]">
                          {/* Pulse bar top */}
                          <motion.div className="absolute top-0 left-0 right-0 h-[2px]"
                            style={{ background: "linear-gradient(90deg, transparent, #ff9f00, transparent)" }}
                            animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} />
                          <div className="p-3.5">
                            <div className="flex items-center justify-between mb-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[#ff9f00]/15 flex items-center justify-center">
                                  <Package className="w-4 h-4 text-[#ff9f00]" />
                                </div>
                                <div>
                                  <p className="text-white font-bold text-sm">#{order.id.slice(-6).toUpperCase()}</p>
                                  <p className="text-gray-400 text-[10px]">@{order.clientUsername}</p>
                                </div>
                              </div>
                              <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                                className="px-2.5 py-1 bg-[#ff9f00]/15 rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#ff9f00]" />
                                <span className="text-[#ff9f00] font-bold text-[10px]">NOVA</span>
                              </motion.div>
                            </div>
                            {order.deliveryAddress && (
                              <div className="flex items-start gap-1.5 mb-2.5 px-1">
                                <MapPin className="w-3.5 h-3.5 text-[#ff00ff] shrink-0 mt-0.5" />
                                <span className="text-gray-300 text-[11px] leading-tight">{order.deliveryAddress}</span>
                              </div>
                            )}
                            {/* Items */}
                            <div className="bg-[#0a0a0f]/60 rounded-xl p-2.5 mb-2.5">
                              {order.items?.slice(0, 3).map((item: any, i: number) => (
                                <div key={i} className="flex justify-between text-[11px] py-0.5">
                                  <span className="text-gray-300 truncate mr-2">{item.name} x{item.qty || 1}</span>
                                  <span className="text-white font-medium shrink-0">R$ {(Number(item.price) * (item.qty || 1)).toFixed(2)}</span>
                                </div>
                              ))}
                              {(order.items?.length || 0) > 3 && <p className="text-gray-500 text-[10px] mt-0.5">+{order.items.length - 3} itens</p>}
                              <div className="flex justify-between border-t border-[#1f1f2e]/60 pt-1.5 mt-1.5">
                                <span className="text-gray-400 text-[11px] font-medium">Total do Pedido</span>
                                <span className="text-white font-bold text-xs">R$ {(order.total || 0).toFixed(2)}</span>
                              </div>
                            </div>
                            {/* Commission breakdown */}
                            <div className="bg-[#00ff41]/5 border border-[#00ff41]/15 rounded-xl p-2.5 mb-3">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 font-medium">Sua Comissao neste pedido</p>
                              <div className="flex items-center gap-2 justify-between">
                                <div className="flex items-center gap-3 text-[11px]">
                                  <span className="text-gray-400">Fixa: <span className="text-white font-medium">R${comm.fixa.toFixed(2)}</span></span>
                                  <span className="text-gray-600">+</span>
                                  <span className="text-gray-400">{driverConfig.taxaPercent}%: <span className="text-white font-medium">R${comm.perc.toFixed(2)}</span></span>
                                </div>
                                <span className="text-[#00ff41] font-bold text-sm">R$ {comm.total.toFixed(2)}</span>
                              </div>
                            </div>
                            {/* Accept button */}
                            <motion.button whileTap={{ scale: 0.96 }} onClick={() => handleAcceptOrder(order)}
                              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-black"
                              style={{ background: "linear-gradient(135deg, #00ff41, #00f0ff)", boxShadow: "0 0 25px rgba(0,255,65,0.3)" }}>
                              <Navigation className="w-4 h-4" />
                              Aceitar Entrega
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── ENTREGAS ATIVAS (driver_accepted / on_the_way) ── */}
              {activeDeliveries.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                      <Navigation className="w-4 h-4 text-[#ff00ff]" />
                    </motion.div>
                    <h3 className="text-white font-bold text-sm">Em Andamento</h3>
                    <span className="ml-auto px-2 py-0.5 bg-[#ff00ff]/20 text-[#ff00ff] rounded-full text-[10px] font-bold">{activeDeliveries.length}</span>
                  </div>
                  <div className="space-y-2.5">
                    {activeDeliveries.map((order) => {
                      const comm = calcCommission(order.total || 0);
                      const isAccepted = order.status === "driver_accepted";
                      const isCollected = order.status === "collected";
                      const isOnWay = order.status === "on_the_way";
                      const statusColor = isAccepted ? "#00f0ff" : isCollected ? "#8b5cf6" : "#ff00ff";
                      const statusLabel = isAccepted ? "ACEITO" : isCollected ? "COLETADO" : "A CAMINHO";
                      // Elapsed timer
                      const startTime = order.driverAcceptedAt || order.updatedAt || order.createdAt;
                      const elapsedMs = startTime ? Date.now() - new Date(startTime).getTime() : 0;
                      const elapsedMin = Math.floor(elapsedMs / 60000);
                      const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);
                      return (
                        <motion.div key={order.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                          className="relative overflow-hidden bg-[#12121a]/90 border rounded-2xl shadow-[0_0_15px_rgba(255,0,255,0.08)]"
                          style={{ borderColor: `${statusColor}40` }}>
                          <motion.div className="absolute top-0 left-0 right-0 h-[2px]"
                            style={{ background: `linear-gradient(90deg, transparent, ${statusColor}, transparent)` }}
                            animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
                          <div className="p-3.5">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${statusColor}15` }}>
                                  {isOnWay ? <Navigation className="w-4 h-4" style={{ color: statusColor }} /> : isCollected ? <Package className="w-4 h-4" style={{ color: statusColor }} /> : <Truck className="w-4 h-4" style={{ color: statusColor }} />}
                                </div>
                                <div>
                                  <p className="text-white font-bold text-sm">#{order.id.slice(-6).toUpperCase()}</p>
                                  <p className="text-gray-400 text-[10px]">@{order.clientUsername}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <motion.span animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                                  className="px-2.5 py-1 rounded-full font-bold text-[10px] flex items-center gap-1"
                                  style={{ background: `${statusColor}20`, color: statusColor }}>
                                  {isOnWay ? <Navigation className="w-3 h-3" /> : isCollected ? <Package className="w-3 h-3" /> : <Check className="w-3 h-3" />} {statusLabel}
                                </motion.span>
                                <span className="text-gray-500 text-[9px] font-mono">{String(elapsedMin).padStart(2, "0")}:{String(elapsedSec).padStart(2, "0")}</span>
                              </div>
                            </div>
                            {order.deliveryAddress && (
                              <div className="flex items-start gap-1.5 mb-2.5 px-1">
                                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: statusColor }} />
                                <span className="text-gray-300 text-[11px] leading-tight">{order.deliveryAddress}</span>
                              </div>
                            )}
                            <div className="bg-[#0a0a0f]/60 rounded-xl p-2.5 mb-2.5">
                              {order.items?.slice(0, 3).map((item: any, i: number) => (
                                <div key={i} className="flex justify-between text-[11px] py-0.5">
                                  <span className="text-gray-300 truncate mr-2">{item.name} x{item.qty || 1}</span>
                                  <span className="text-white font-medium shrink-0">R$ {(Number(item.price) * (item.qty || 1)).toFixed(2)}</span>
                                </div>
                              ))}
                              {(order.items?.length || 0) > 3 && <p className="text-gray-500 text-[10px]">+{order.items.length - 3} itens</p>}
                            </div>
                            {/* 4-Stage Progress Bar */}
                            <div className="flex items-center gap-0.5 mb-2.5">
                              {[
                                { label: "Aceito", done: true, color: "#00f0ff" },
                                { label: "Coletado", done: ["collected", "on_the_way"].includes(order.status), color: "#8b5cf6" },
                                { label: "A Caminho", done: order.status === "on_the_way", color: "#ff00ff" },
                                { label: "Entregue", done: false, color: "#00ff41" },
                              ].map((step, si) => (
                                <div key={si} className="flex-1 flex flex-col items-center gap-0.5">
                                  <div className={`w-full h-1 rounded-full ${step.done ? "" : "bg-[#1f1f2e]"}`}
                                    style={step.done ? { backgroundColor: step.color, boxShadow: `0 0 6px ${step.color}40` } : {}} />
                                  <span className={`text-[7px] font-medium ${step.done ? "text-white" : "text-gray-600"}`}>{step.label}</span>
                                </div>
                              ))}
                            </div>
                            {/* Commission */}
                            <div className="bg-[#00ff41]/5 border border-[#00ff41]/15 rounded-xl p-2.5 mb-3">
                              <div className="flex items-center justify-between">
                                <p className="text-[9px] text-gray-500 uppercase">Sua Comissao</p>
                                <p className="text-[#00ff41] font-bold text-sm">R$ {comm.total.toFixed(2)}</p>
                              </div>
                            </div>
                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              {/* Chat with Client Button */}
                              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setDeliveryChatOrder(order)}
                                className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-[#8b5cf6]/15 text-[#8b5cf6] border border-[#8b5cf6]/25 hover:bg-[#8b5cf6]/25 transition-colors">
                                <MessageCircle className="w-3.5 h-3.5" /> Chat
                              </motion.button>

                              {/* Coletei o Pedido (after accepting) */}
                              {isAccepted && (
                                <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleCollected(order)}
                                  className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 text-white"
                                  style={{ background: "linear-gradient(135deg, #8b5cf6, #00f0ff)", boxShadow: "0 0 20px rgba(139,92,246,0.3)" }}>
                                  <Package className="w-3.5 h-3.5" /> Coletei
                                </motion.button>
                              )}
                              {/* Estou a Caminho (after collecting) */}
                              {isCollected && (
                                <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleOnTheWay(order)}
                                  className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 text-white"
                                  style={{ background: "linear-gradient(135deg, #ff00ff, #8b5cf6)", boxShadow: "0 0 20px rgba(255,0,255,0.3)" }}>
                                  <Navigation className="w-3.5 h-3.5" /> A Caminho
                                </motion.button>
                              )}
                              {isOnWay && (
                                <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleConfirmDelivery(order)}
                                  className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 text-black"
                                  style={{ background: "linear-gradient(135deg, #00ff41, #00f0ff)", boxShadow: "0 0 20px rgba(0,255,65,0.3)" }}>
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Pedido Entregue
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── COMPLETED ── */}
              {completedDeliveries.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00ff41]" />
                    <h3 className="text-white font-bold text-sm">Concluidas Hoje</h3>
                    <span className="ml-auto text-[#00ff41] text-[10px] font-bold">+R$ {totalEarned.toFixed(2)}</span>
                  </div>
                  <div className="space-y-1.5">
                    {[...completedDeliveries].reverse().slice(0, 6).map((order) => {
                      const realComm = order.driverCommission?.total || order.feeBreakdown?.driverTotal || null;
                      const comm = realComm !== null
                        ? { fixa: order.driverCommission?.fixa || 0, perc: order.driverCommission?.perc || 0, total: realComm }
                        : calcCommission(order.total || 0);
                      return (
                        <motion.button key={order.id} whileTap={{ scale: 0.97 }}
                          onClick={() => setSelectedOrderDetail(order)}
                          className="w-full text-left bg-[#12121a]/80 border border-[#1f1f2e] rounded-xl p-2.5 flex items-center gap-3 hover:border-[#00ff41]/30 transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-[#00ff41]/10 flex items-center justify-center shrink-0">
                            <Check className="w-4 h-4 text-[#00ff41]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-semibold text-xs">#{order.id.slice(-6).toUpperCase()}</p>
                            <p className="text-gray-500 text-[10px]">{new Date(order.updatedAt || order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[#00ff41] font-bold text-xs">+R$ {comm.total.toFixed(2)}</p>
                            <p className="text-gray-600 text-[9px]">R${comm.fixa.toFixed(2)} + R${(comm.total - comm.fixa).toFixed(2)}</p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── EMPTY STATE ── */}
              {orders.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-10">
                  {isOnline ? (
                    <>
                      <motion.div animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity }}
                        className="w-20 h-20 rounded-2xl bg-[#ff00ff]/10 flex items-center justify-center mb-4 border border-[#ff00ff]/20">
                        <Bell className="w-10 h-10 text-[#ff00ff]/60" />
                      </motion.div>
                      <p className="text-white font-semibold text-sm">Aguardando pedidos...</p>
                      <p className="text-gray-500 text-xs mt-1">Voce sera notificado quando um pedido chegar</p>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 rounded-2xl bg-[#1f1f2e]/50 flex items-center justify-center mb-4">
                        <Power className="w-10 h-10 text-gray-600" />
                      </div>
                      <p className="text-gray-400 font-semibold text-sm">Voce esta offline</p>
                      <p className="text-gray-600 text-xs mt-1">Ative o botao acima para receber entregas</p>
                    </>
                  )}
                </motion.div>
              )}
              <div className="h-4" />
            </motion.div>
          )}

          {/* ════════════ CHAT ════════════ */}
          {activeTab === "chat" && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <MotoristaChat currentUsername={currentUser.username} currentUserName={currentUser.name} currentUserPhoto={currentUser.photo} vendedorContacts={vendedorChatContacts} clienteContacts={clienteChatContacts} onConversationChange={setIsChatConversationOpen} onStartCall={handleStartCall} />
            </motion.div>
          )}

          {/* ════════════ RELATÓRIOS ════════════ */}
          {activeTab === "relatorios" && (
            <motion.div key="relatorios" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto overscroll-contain px-4 py-3 space-y-3">

              {/* ── Date Filter Bar ── */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-[#12121a]/90 border border-[#1f1f2e] rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-[#ff00ff]" />
                  <span className="text-gray-400 text-[10px] uppercase tracking-wider font-medium">Período</span>
                </div>
                <div className="flex gap-1.5">
                  {[
                    { label: "Hoje", value: 1 },
                    { label: "7 dias", value: 7 },
                    { label: "30 dias", value: 30 },
                    { label: "Este mês", value: new Date().getDate() },
                  ].map((f) => {
                    const isActive = earningsFilter === f.value;
                    return (
                      <motion.button key={f.label} whileTap={{ scale: 0.92 }}
                        onClick={() => setEarningsFilter(f.value)}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
                          isActive
                            ? "text-white shadow-[0_0_12px_rgba(255,0,255,0.3)]"
                            : "bg-[#0a0a0f] text-gray-500 border border-[#1f1f2e]/60 hover:text-gray-300"
                        }`}
                        style={isActive ? { background: "linear-gradient(135deg, #ff00ff30, #8b5cf620)", border: "1px solid rgba(255,0,255,0.4)" } : undefined}
                      >
                        {f.label}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-[#12121a]/90 border border-[#00ff41]/20 rounded-xl p-3 text-center">
                  <DollarSign className="w-4 h-4 text-[#00ff41] mx-auto mb-1" />
                  <p className="text-[#00ff41] font-bold text-lg">R$ {(earningsData?.totals?.earnings ?? totalEarned).toFixed(2)}</p>
                  <p className="text-gray-500 text-[9px] uppercase">Total Ganho</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                  className="bg-[#12121a]/90 border border-[#00f0ff]/20 rounded-xl p-3 text-center">
                  <Package className="w-4 h-4 text-[#00f0ff] mx-auto mb-1" />
                  <p className="text-[#00f0ff] font-bold text-lg">{earningsData?.totals?.deliveries ?? completedDeliveries.length}</p>
                  <p className="text-gray-500 text-[9px] uppercase">Entregas</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="bg-[#12121a]/90 border border-[#ff00ff]/20 rounded-xl p-3 text-center">
                  <Star className="w-4 h-4 text-[#ff00ff] mx-auto mb-1" />
                  <p className="text-[#ff00ff] font-bold text-lg">R$ {(earningsData?.totals?.avgPerDelivery ?? 0).toFixed(2)}</p>
                  <p className="text-gray-500 text-[9px] uppercase">Média/Entrega</p>
                </motion.div>
              </div>

              {/* Loading indicator */}
              {loadingEarnings && (
                <div className="flex items-center justify-center py-2 gap-2">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-[#ff00ff]/30 border-t-[#ff00ff] rounded-full" />
                  <span className="text-gray-500 text-xs">Carregando dados...</span>
                </div>
              )}

              {/* Recharts-based delivery charts with filtered data */}
              <MotoristaDashboardCharts
                deliveryData={earningsData?.dailyData?.map((d: any) => ({ name: d.label, entregas: d.entregas, ganhos: d.ganhos })) || deliveryChartData}
                metrics={metrics}
              />

              {/* Commission Config Display */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-[#12121a]/90 border border-[#8b5cf6]/20 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2.5">
                  <Wallet className="w-4 h-4 text-[#8b5cf6]" />
                  <h3 className="text-white font-bold text-xs">Calculo de Comissao</h3>
                </div>
                {vendedor && (
                  <div className="flex items-center gap-2 mb-2.5 p-2 bg-[#0a0a0f]/60 rounded-lg">
                    <NeonAvatar photo={vendedor.photo} name={vendedor.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-[11px] truncate">{vendedor.name}</p>
                      <p className="text-gray-500 text-[10px]">Definiu sua comissao</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[#0a0a0f] rounded-lg p-2.5 border border-[#1f1f2e]/60 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Banknote className="w-3 h-3 text-[#00ff41]" />
                      <span className="text-[#00ff41] font-bold text-sm">R$ {driverConfig.taxaFixa.toFixed(2)}</span>
                    </div>
                    <p className="text-gray-500 text-[9px] uppercase">Fixa</p>
                  </div>
                  <span className="text-gray-600 text-sm">+</span>
                  <div className="flex-1 bg-[#0a0a0f] rounded-lg p-2.5 border border-[#1f1f2e]/60 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Percent className="w-3 h-3 text-[#00f0ff]" />
                      <span className="text-[#00f0ff] font-bold text-sm">{driverConfig.taxaPercent}%</span>
                    </div>
                    <p className="text-gray-500 text-[9px] uppercase">%Venda</p>
                  </div>
                </div>
                <div className="mt-2.5 p-2.5 bg-[#ff00ff]/5 border border-[#ff00ff]/15 rounded-lg">
                  <p className="text-gray-400 text-[10px] mb-1">Exemplo: Pedido de R$ 100,00</p>
                  <p className="text-white text-xs">R$ {driverConfig.taxaFixa.toFixed(2)} + {driverConfig.taxaPercent}% = <span className="text-[#ff00ff] font-bold">R$ {(driverConfig.taxaFixa + (driverConfig.taxaPercent / 100) * 100).toFixed(2)}</span></p>
                </div>
              </motion.div>

              {/* Delivery History from API */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="bg-[#12121a]/90 border border-[#1f1f2e] rounded-xl p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-[#ff00ff]" />
                  <h3 className="text-white font-bold text-xs">Historico de Comissoes</h3>
                  {earningsData?.history && (
                    <span className="ml-auto text-[#00ff41] text-[10px] font-bold">{earningsData.history.length} entregas</span>
                  )}
                </div>
                {(earningsData?.history || completedDeliveries).length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {(earningsData?.history || [...completedDeliveries].reverse()).map((item: any, idx: number) => {
                      const comm = item.commission !== undefined
                        ? { fixa: item.taxaFixa || 0, perc: item.taxaPercent || 0, total: item.commission }
                        : calcCommission(item.total || 0);
                      const orderId = item.orderId || item.id || "";
                      const orderTotal = item.total || 0;
                      const dateStr = item.deliveredAt || item.updatedAt || item.createdAt || "";
                      // Try to find the full order for detail view
                      const fullOrder = completedDeliveries.find((o: any) => o.id === orderId);
                      return (
                        <motion.button key={`${orderId}-${idx}`} whileTap={{ scale: 0.97 }}
                          onClick={() => { if (fullOrder) setSelectedOrderDetail(fullOrder); }}
                          className="w-full text-left p-2.5 bg-[#0a0a0f]/60 rounded-lg border border-[#1f1f2e]/40 hover:border-[#00ff41]/20 transition-colors">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded bg-[#00ff41]/10 flex items-center justify-center">
                                <Check className="w-3 h-3 text-[#00ff41]" />
                              </div>
                              <div>
                                <p className="text-white font-semibold text-xs">#{orderId.slice(-6).toUpperCase()}</p>
                                {item.clientUsername && <p className="text-gray-600 text-[9px]">@{item.clientUsername}</p>}
                              </div>
                            </div>
                            <p className="text-[#00ff41] font-bold text-sm">+R$ {comm.total.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center justify-between pl-8">
                            <p className="text-gray-500 text-[10px]">{dateStr ? new Date(dateStr).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-"}</p>
                            <div className="flex gap-2 text-[10px]">
                              <span className="text-gray-400">R$<span className="text-[#00ff41]">{comm.fixa.toFixed(2)}</span></span>
                              <span className="text-gray-600">+</span>
                              <span className="text-gray-400"><span className="text-[#00f0ff]">R${(comm.total - comm.fixa).toFixed(2)}</span></span>
                            </div>
                          </div>
                          <div className="mt-1.5 pl-8">
                            <div className="w-full bg-[#1f1f2e] rounded-full h-1">
                              <div className="bg-gradient-to-r from-[#00ff41] to-[#00f0ff] h-1 rounded-full" style={{ width: `${Math.min(100, orderTotal > 0 ? (comm.total / orderTotal) * 100 : 50)}%` }} />
                            </div>
                            <p className="text-gray-600 text-[9px] mt-0.5">Pedido: R$ {orderTotal.toFixed(2)}</p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <BarChart3 className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-500 text-xs">Nenhuma entrega concluida</p>
                    <p className="text-gray-600 text-[10px] mt-1">Seus relatorios aparecerao aqui</p>
                  </div>
                )}
              </motion.div>
              <div className="h-4" />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Bottom Navigation Bar ── */}
      {!isChat && (
        <div className="relative z-30 shrink-0 bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-[#1f1f2e]/60">
          <motion.div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, #ff00ff30, #00f0ff30, transparent)" }} animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 3, repeat: Infinity }} />
          <div className="flex items-center justify-around px-1 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => { sfx.playNavigate(); setActiveTab(tab.id); setIsChatConversationOpen(false); }}
                  className={`flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-xl transition-all relative min-w-[52px] ${active ? "text-[#ff00ff]" : "text-gray-500"}`}
                >
                  {active && (
                    <motion.div layoutId="motorista-tab-glow" className="absolute inset-0 rounded-xl" style={{ backgroundColor: "rgba(255,0,255,0.1)" }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                  )}
                  <div className="relative z-10">
                    {tab.icon}
                    {tab.badge && (
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#ff006e] rounded-full flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">{tab.badge}</span>
                      </motion.div>
                    )}
                  </div>
                  <span className="relative z-10 text-[9px] font-semibold">{tab.label}</span>
                  {active && (
                    <motion.div layoutId="motorista-tab-dot" className="absolute -top-0.5 w-1 h-1 rounded-full" style={{ backgroundColor: "#ff00ff", boxShadow: "0 0 6px rgba(255,0,255,0.6)" }} />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Order Detail Modal ── */}
      <AnimatePresence>
        {selectedOrderDetail && (() => {
          const order = selectedOrderDetail;
          const realComm = order.driverCommission?.total || order.feeBreakdown?.driverTotal || null;
          const comm = realComm !== null
            ? { fixa: order.driverCommission?.fixa || 0, perc: order.driverCommission?.perc || 0, total: realComm }
            : calcCommission(order.total || 0);
          const statusColors: Record<string, string> = { delivered: "#00ff41", driver_accepted: "#00f0ff", collected: "#8b5cf6", on_the_way: "#ff00ff", accepted: "#ff9f00", preparing: "#ff9f00" };
          const statusLabels: Record<string, string> = { delivered: "Entregue", driver_accepted: "Aceito", collected: "Coletado", on_the_way: "A Caminho", accepted: "Novo", preparing: "Preparando" };
          const sc = statusColors[order.status] || "#8b5cf6";
          const sl = statusLabels[order.status] || order.status;
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md px-4 pb-4"
              onClick={() => setSelectedOrderDetail(null)}>
              <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md relative">
                <motion.div className="absolute inset-0 rounded-2xl p-[1px]"
                  style={{ background: `conic-gradient(from 0deg, ${sc}30, transparent, ${sc}15, transparent)` }}
                  animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />
                <div className="relative bg-[#0c0c14] rounded-2xl m-[1px] overflow-hidden max-h-[85vh] overflow-y-auto">
                  {/* Header */}
                  <div className="sticky top-0 z-10 bg-[#0c0c14]/95 backdrop-blur-xl border-b border-[#1f1f2e]/60 px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${sc}15`, border: `1px solid ${sc}30` }}>
                          <Package className="w-5 h-5" style={{ color: sc }} />
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-base">#{order.id.slice(-6).toUpperCase()}</h3>
                          <p className="text-gray-500 text-[10px]">{order.createdAt ? new Date(order.createdAt).toLocaleString("pt-BR") : "-"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: `${sc}20`, color: sc }}>{sl}</span>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSelectedOrderDetail(null)}
                          className="p-1.5 rounded-xl bg-[#1f1f2e] text-gray-400 hover:text-white transition-colors">
                          <X className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-4 space-y-4">
                    {/* Timeline */}
                    <div className="space-y-0">
                      {[
                        { label: "Pedido Criado", time: order.createdAt, color: "#ff9f00", done: true },
                        { label: "Aceito pelo Motorista", time: order.driverAcceptedAt, color: "#00f0ff", done: !!order.driverAcceptedAt },
                        { label: "Coletado do Vendedor", time: order.collectedAt, color: "#8b5cf6", done: !!order.collectedAt },
                        { label: "A Caminho", time: order.onTheWayAt, color: "#ff00ff", done: !!order.onTheWayAt },
                        { label: "Entregue", time: order.deliveredAt, color: "#00ff41", done: !!order.deliveredAt },
                      ].map((step, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full border-2 ${step.done ? "" : "border-gray-700 bg-transparent"}`}
                              style={step.done ? { backgroundColor: step.color, borderColor: step.color, boxShadow: `0 0 8px ${step.color}60` } : {}} />
                            {i < 4 && <div className={`w-[2px] h-6 ${step.done ? "" : "bg-gray-800"}`} style={step.done ? { backgroundColor: `${step.color}40` } : {}} />}
                          </div>
                          <div className="pb-2">
                            <p className={`text-xs font-medium ${step.done ? "text-white" : "text-gray-600"}`}>{step.label}</p>
                            {step.time && <p className="text-gray-500 text-[10px]">{new Date(step.time).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Client & Vendor info */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#0a0a0f] rounded-xl p-3 border border-[#1f1f2e]/60">
                        <p className="text-gray-500 text-[9px] uppercase tracking-wider mb-1">Cliente</p>
                        <p className="text-white font-semibold text-xs truncate">@{order.clientUsername}</p>
                      </div>
                      <div className="bg-[#0a0a0f] rounded-xl p-3 border border-[#1f1f2e]/60">
                        <p className="text-gray-500 text-[9px] uppercase tracking-wider mb-1">Vendedor</p>
                        <p className="text-white font-semibold text-xs truncate">@{order.vendorUsername}</p>
                      </div>
                    </div>

                    {/* Delivery Address */}
                    {order.deliveryAddress && (
                      <div className="bg-[#0a0a0f] rounded-xl p-3 border border-[#1f1f2e]/60">
                        <div className="flex items-center gap-1.5 mb-1">
                          <MapPin className="w-3 h-3 text-[#ff00ff]" />
                          <p className="text-gray-500 text-[9px] uppercase tracking-wider">Endereco de Entrega</p>
                        </div>
                        <p className="text-gray-200 text-xs leading-relaxed">{order.deliveryAddress}</p>
                      </div>
                    )}

                    {/* Order Items */}
                    <div className="bg-[#0a0a0f] rounded-xl p-3 border border-[#1f1f2e]/60">
                      <p className="text-gray-500 text-[9px] uppercase tracking-wider mb-2">Itens do Pedido</p>
                      <div className="space-y-1.5">
                        {(order.items || []).map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-gray-300">{item.name} <span className="text-gray-600">x{item.qty || 1}</span></span>
                            <span className="text-white font-medium">R$ {(Number(item.price) * (item.qty || 1)).toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="border-t border-[#1f1f2e]/60 pt-1.5 mt-1.5 flex justify-between">
                          <span className="text-gray-400 text-xs font-medium">Total</span>
                          <span className="text-white font-bold text-sm">R$ {(order.total || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Commission Breakdown */}
                    <div className="rounded-xl overflow-hidden">
                      <div className="bg-gradient-to-r from-[#00ff41]/10 to-[#00f0ff]/5 border border-[#00ff41]/20 rounded-xl p-4">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-3 font-medium flex items-center gap-1.5">
                          <Wallet className="w-3 h-3 text-[#00ff41]" /> Sua Comissao neste Pedido
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-xs">Taxa Fixa</span>
                            <span className="text-white font-medium text-xs">R$ {comm.fixa.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-xs">Taxa Percentual</span>
                            <span className="text-white font-medium text-xs">R$ {(comm.total - comm.fixa).toFixed(2)}</span>
                          </div>
                          <div className="border-t border-[#00ff41]/20 pt-2 flex justify-between items-center">
                            <span className="text-[#00ff41] font-bold text-xs">Total Comissao</span>
                            <motion.span animate={{ textShadow: ["0 0 6px rgba(0,255,65,0.3)", "0 0 12px rgba(0,255,65,0.6)", "0 0 6px rgba(0,255,65,0.3)"] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="text-[#00ff41] font-bold text-lg">R$ {comm.total.toFixed(2)}</motion.span>
                          </div>
                        </div>
                        {/* Visual progress */}
                        <div className="mt-3">
                          <div className="w-full bg-[#1f1f2e] rounded-full h-1.5">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (order.total || 0) > 0 ? (comm.total / (order.total || 1)) * 100 : 50)}%` }}
                              transition={{ duration: 1, delay: 0.3 }}
                              className="bg-gradient-to-r from-[#00ff41] to-[#00f0ff] h-1.5 rounded-full" />
                          </div>
                          <p className="text-gray-600 text-[9px] mt-1">{((comm.total / (order.total || 1)) * 100).toFixed(1)}% do valor do pedido</p>
                        </div>
                      </div>
                    </div>

                    {/* Fee Breakdown from order if available */}
                    {order.feeBreakdown && (
                      <div className="bg-[#0a0a0f] rounded-xl p-3 border border-[#1f1f2e]/60">
                        <p className="text-gray-500 text-[9px] uppercase tracking-wider mb-2">Divisao de Taxas</p>
                        <div className="space-y-1.5 text-xs">
                          {order.feeBreakdown.adminFee !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Admin ({order.feeBreakdown.adminRate || 0}% + R$0,99)</span>
                              <span className="text-[#ff9f00] font-medium">R$ {(order.feeBreakdown.adminFee || 0).toFixed(2)}</span>
                            </div>
                          )}
                          {order.feeBreakdown.driverTotal !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Motorista</span>
                              <span className="text-[#00ff41] font-medium">R$ {(order.feeBreakdown.driverTotal || 0).toFixed(2)}</span>
                            </div>
                          )}
                          {order.feeBreakdown.vendorNet !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Vendedor (liquido)</span>
                              <span className="text-[#00f0ff] font-medium">R$ {(order.feeBreakdown.vendorNet || 0).toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Logout Confirmation Modal ── */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md px-4" onClick={() => setShowLogoutConfirm(false)}>
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm"
            >
              <motion.div className="absolute inset-0 rounded-2xl p-[1px]"
                style={{ background: "conic-gradient(from 0deg, #ff006e40, transparent, #ff006e20, transparent)" }}
                animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />
              <div className="relative bg-[#0c0c14] border border-[#ff006e]/20 rounded-2xl p-6 m-[1px] shadow-[0_0_60px_rgba(255,0,110,0.15)]">
                <div className="text-center mb-5">
                  <motion.div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#ff006e]/10 mb-3"
                    animate={{ boxShadow: ["0 0 15px rgba(255,0,110,0.15)", "0 0 30px rgba(255,0,110,0.3)", "0 0 15px rgba(255,0,110,0.15)"] }}
                    transition={{ duration: 2, repeat: Infinity }}>
                    <LogOut className="w-7 h-7 text-[#ff006e]" />
                  </motion.div>
                  <h3 className="text-white font-bold text-lg">Sair do Painel?</h3>
                  <p className="text-gray-400 text-sm mt-1">Voce sera desconectado</p>
                </div>
                <div className="flex gap-3">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-[#1f1f2e] text-gray-300 font-semibold rounded-xl text-sm hover:bg-[#2a2a3e] transition-colors">
                    Cancelar
                  </motion.button>
                  <motion.button whileHover={{ boxShadow: "0 0 25px rgba(255,0,110,0.4)" }} whileTap={{ scale: 0.95 }} onClick={() => {
                      // Clear online state and push on manual logout
                      localStorage.setItem("motorista_online_" + currentUser.username, "false");
                      pwa.setPushEnabledForUser(currentUser.username, false);
                      pwa.unregisterPushSubscription(currentUser.username).catch(() => {});
                      api.setUserStatus(currentUser.username, false).catch(() => {});
                      localStorage.removeItem("currentUser"); navigate("/");
                    }}
                    className="flex-1 py-3 bg-gradient-to-r from-[#ff006e] to-[#ff0040] text-white font-bold rounded-xl text-sm shadow-[0_0_20px_rgba(255,0,110,0.3)]">
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

      {/* ═══ Delivery Chat Fullscreen Overlay ═══ */}
      <AnimatePresence>
        {deliveryChatOrder && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[75] bg-[#050508] flex flex-col"
          >
            {/* Chat Header */}
            <div className="shrink-0 bg-[#0a0a12]/95 backdrop-blur-xl border-b border-[#1f1f2e]/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setDeliveryChatOrder(null)}
                  className="p-1.5 rounded-xl hover:bg-[#1f1f2e] text-gray-400 transition-colors shrink-0">
                  <ChevronLeft className="w-5 h-5" />
                </motion.button>
                <NeonAvatar photo={(() => { const c = vendedorClients.find((cl: any) => cl.username === deliveryChatOrder.clientUsername); return c?.photo; })()} name={(() => { const c = vendedorClients.find((cl: any) => cl.username === deliveryChatOrder.clientUsername); return c?.name || deliveryChatOrder.clientUsername; })()} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{(() => { const c = vendedorClients.find((cl: any) => cl.username === deliveryChatOrder.clientUsername); return c?.name || `@${deliveryChatOrder.clientUsername}`; })()}</p>
                  <p className="text-gray-500 text-[10px]">Pedido #{deliveryChatOrder.id?.slice(-6).toUpperCase()}</p>
                </div>
                {/* Action Badge */}
                <motion.span
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="px-2 py-1 rounded-full text-[9px] font-bold"
                  style={{
                    background: deliveryChatOrder.status === "driver_accepted" ? "#00f0ff20" : deliveryChatOrder.status === "collected" ? "#8b5cf620" : deliveryChatOrder.status === "on_the_way" ? "#ff00ff20" : "#00ff4120",
                    color: deliveryChatOrder.status === "driver_accepted" ? "#00f0ff" : deliveryChatOrder.status === "collected" ? "#8b5cf6" : deliveryChatOrder.status === "on_the_way" ? "#ff00ff" : "#00ff41",
                  }}
                >
                  {deliveryChatOrder.status === "driver_accepted" ? "ACEITO" : deliveryChatOrder.status === "collected" ? "COLETADO" : deliveryChatOrder.status === "on_the_way" ? "A CAMINHO" : "ENTREGUE"}
                </motion.span>
              </div>

              {/* 4-Stage Delivery Progress Bar */}
              <div className="flex items-center gap-0.5 mt-2.5 mb-1">
                {[
                  { label: "Aceito", done: ["driver_accepted", "collected", "on_the_way", "delivered"].includes(deliveryChatOrder.status), color: "#00f0ff" },
                  { label: "Coletado", done: ["collected", "on_the_way", "delivered"].includes(deliveryChatOrder.status), color: "#8b5cf6" },
                  { label: "A Caminho", done: ["on_the_way", "delivered"].includes(deliveryChatOrder.status), color: "#ff00ff" },
                  { label: "Entregue", done: deliveryChatOrder.status === "delivered", color: "#00ff41" },
                ].map((step, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full h-1.5 rounded-full overflow-hidden bg-[#1f1f2e]">
                      {step.done ? (
                        <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.5, delay: i * 0.12 }}
                          className="h-full rounded-full" style={{ backgroundColor: step.color, boxShadow: `0 0 8px ${step.color}60` }} />
                      ) : null}
                    </div>
                    <span className={`text-[7px] font-semibold ${step.done ? "text-white" : "text-gray-600"}`}>{step.label}</span>
                  </div>
                ))}
              </div>

              {/* Action Bar */}
              <div className="flex gap-2 mt-1.5">
                {deliveryChatOrder.status === "driver_accepted" && (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleCollected(deliveryChatOrder)}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 text-white"
                    style={{ background: "linear-gradient(135deg, #8b5cf6, #00f0ff)", boxShadow: "0 0 15px rgba(139,92,246,0.25)" }}>
                    <Package className="w-3.5 h-3.5" /> Coletei o Pedido
                  </motion.button>
                )}
                {deliveryChatOrder.status === "collected" && (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleOnTheWay(deliveryChatOrder)}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 text-white"
                    style={{ background: "linear-gradient(135deg, #ff00ff, #8b5cf6)", boxShadow: "0 0 15px rgba(255,0,255,0.25)" }}>
                    <Navigation className="w-3.5 h-3.5" /> Estou a Caminho
                  </motion.button>
                )}
                {deliveryChatOrder.status === "on_the_way" && (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleConfirmDelivery(deliveryChatOrder)}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 text-black"
                    style={{ background: "linear-gradient(135deg, #00ff41, #00f0ff)", boxShadow: "0 0 15px rgba(0,255,65,0.25)" }}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Pedido Entregue
                  </motion.button>
                )}
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleSendMyLocation}
                  disabled={sendingLocation}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/25 disabled:opacity-50">
                  {sendingLocation ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-3.5 h-3.5 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full" />
                  ) : (
                    <LocateFixed className="w-3.5 h-3.5" />
                  )}
                  GPS
                </motion.button>
              </div>
            </div>

            {/* Delivery Address Quick View */}
            {deliveryChatOrder.deliveryAddress && (
              <div className="shrink-0 mx-4 mt-2 p-2.5 bg-[#12121a]/80 rounded-xl border border-[#ff00ff]/15 flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#ff00ff] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-400 text-[9px] uppercase tracking-wider">Endereco</p>
                  <p className="text-gray-200 text-[11px] leading-tight">{deliveryChatOrder.deliveryAddress}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-gray-400 text-[9px] uppercase tracking-wider">Comissao</p>
                  <p className="text-[#00ff41] font-bold text-xs">R$ {calcCommission(deliveryChatOrder.total || 0).total.toFixed(2)}</p>
                </div>
              </div>
            )}

            {/* Messages */}
            <div ref={deliveryChatRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {deliveryChatMsgs.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <motion.div animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.95, 1, 0.95] }} transition={{ duration: 3, repeat: Infinity }}
                    className="w-16 h-16 rounded-2xl bg-[#1f1f2e]/50 flex items-center justify-center mb-3">
                    <MessageCircle className="w-7 h-7 text-gray-600" />
                  </motion.div>
                  <p className="text-gray-500 text-sm font-medium">Chat de Entrega</p>
                  <p className="text-gray-600 text-[10px] mt-1">Converse com o cliente sobre a entrega</p>
                  <p className="text-[#00f0ff] text-[10px] mt-2 font-medium">Peca a localizacao ou envie a sua!</p>
                </div>
              )}
              {deliveryChatMsgs.map((msg: any) => {
                const isMine = msg.from === currentUser.username;
                const isLocation = msg.type === "location" || msg.text?.includes("maps.google.com");
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                      isMine
                        ? "bg-gradient-to-br from-[#ff00ff]/15 to-[#8b5cf6]/15 border border-[#ff00ff]/10"
                        : "bg-[#12121a] border border-[#1f1f2e]/60"
                    }`}>
                      {isLocation ? (
                        <a href={msg.text?.match(/https:\/\/maps\.google\.com[^\s]*/)?.[0] || "#"}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[#00f0ff] text-xs font-medium hover:underline">
                          <MapPin className="w-4 h-4 text-[#ff00ff]" />
                          <span>Ver Localizacao no Mapa</span>
                          <ArrowRight className="w-3 h-3" />
                        </a>
                      ) : (
                        <p className="text-white text-[13px] leading-relaxed break-words">{msg.text}</p>
                      )}
                      <p className={`text-[9px] mt-1 ${isMine ? "text-right text-gray-500" : "text-gray-600"}`}>
                        {(() => { try { return new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } })()}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Input */}
            <div className="shrink-0 bg-[#0a0a12]/95 backdrop-blur-xl border-t border-[#1f1f2e]/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={deliveryChatInput}
                  onChange={(e) => setDeliveryChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendDeliveryChat(); } }}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 px-4 py-2.5 bg-[#12121a] border border-[#1f1f2e] rounded-2xl text-white text-sm focus:outline-none focus:border-[#ff00ff]/40 placeholder-gray-600 transition-all"
                />
                <motion.button whileTap={{ scale: 0.85 }} onClick={handleSendDeliveryChat}
                  disabled={!deliveryChatInput.trim()}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 disabled:opacity-30 transition-all"
                  style={{ background: deliveryChatInput.trim() ? "linear-gradient(135deg, #ff00ff, #8b5cf6)" : "#1f1f2e" }}>
                  <Send className="w-4 h-4 text-white" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}