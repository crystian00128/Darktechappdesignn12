import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { SidebarLayout } from "../components/sidebar-layout";
import { motion, AnimatePresence } from "motion/react";
import * as api from "../services/api";
import * as sfx from "../services/sounds";
import { StatCard } from "../components/stat-card";
import { useCallSystem } from "../hooks/useCallSystem";
import { IncomingCallOverlay, ActiveCallOverlay } from "../components/call-overlays";
import { VendedorDashboardCharts } from "../components/vendedor-charts";
import * as notif from "../services/notifications";
import * as pwa from "../services/pwa";
import {
  LayoutDashboard, MessageSquare, Package, FileText, Ticket, Wallet, Truck,
  DollarSign, ShoppingBag, TrendingUp, Copy, Check, Power, Plus, X, Users,
  ClipboardList, Trash2, Clock, CheckCircle2, UserPlus, RefreshCw, ArrowLeft,
  Shield, Zap, Send, ChevronLeft, CheckCheck, Mic, Phone, Video, Camera, Image as ImageIcon,
  Paperclip, Play, Pause, Square, MicOff, PhoneOff, VideoOff, Maximize2, QrCode, Loader2,
  Navigation,
} from "lucide-react";

// ─── Shared Neon Components ─────────────────────────────────────────
function NeonText({ children, color = "#00f0ff", className = "" }: { children: React.ReactNode; color?: string; className?: string }) {
  return (
    <motion.span className={className} style={{ color }}
      animate={{ textShadow: [`0 0 6px ${color}40`, `0 0 14px ${color}60`, `0 0 6px ${color}40`] }}
      transition={{ duration: 2.5, repeat: Infinity }}
    >{children}</motion.span>
  );
}

function GlowCard({ children, className = "", glowColor = "#00f0ff" }: { children: React.ReactNode; className?: string; glowColor?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`relative rounded-2xl overflow-hidden ${className}`}>
      <motion.div className="absolute inset-0 rounded-2xl p-[1px]"
        style={{ background: `conic-gradient(from 0deg, ${glowColor}20, transparent, ${glowColor}10, transparent)` }}
        animate={{ rotate: [0, 360] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />
      <div className="relative bg-[#0c0c14]/90 backdrop-blur-xl rounded-2xl border border-[#1f1f2e]/50 m-[1px]">
        {children}
      </div>
    </motion.div>
  );
}

function NeonAvatar({ photo, name, size = "md" }: { photo?: string; name?: string; size?: "sm" | "md" | "lg" }) {
  const s = {
    sm: { outer: "w-10 h-10", inner: "inset-[2px]", text: "text-sm", dot: "w-2.5 h-2.5 -bottom-0.5 -right-0.5 border-[2px]" },
    md: { outer: "w-12 h-12", inner: "inset-[2px]", text: "text-base", dot: "w-3 h-3 bottom-0 right-0 border-2" },
    lg: { outer: "w-14 h-14", inner: "inset-[3px]", text: "text-lg", dot: "w-3.5 h-3.5 bottom-0 right-0 border-2" },
  }[size];
  const initial = name && name.length > 0 ? name.charAt(0).toUpperCase() : "?";
  return (
    <div className={`relative ${s.outer} shrink-0`}>
      <motion.div className="absolute inset-0 rounded-full"
        style={{ background: "conic-gradient(from 0deg, #00ff41, #00f0ff, #00ff41, transparent, #00ff41)" }}
        animate={{ rotate: [0, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
      <motion.div className="absolute inset-[-2px] rounded-full pointer-events-none"
        animate={{ boxShadow: ["0 0 8px rgba(0,255,65,0.2)", "0 0 14px rgba(0,255,65,0.4)", "0 0 8px rgba(0,255,65,0.2)"] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <div className={`absolute ${s.inner} rounded-full bg-[#0c0c14] flex items-center justify-center overflow-hidden`}>
        {photo ? <img src={photo} alt={name} className="w-full h-full object-cover rounded-full" />
          : <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00f0ff]/30 to-[#8b5cf6]/20 flex items-center justify-center"><span className={`${s.text} font-bold text-white`}>{initial}</span></div>}
      </div>
      <motion.div className={`absolute ${s.dot} bg-[#00ff41] rounded-full border-[#0c0c14]`}
        animate={{ scale: [1, 1.3, 1], boxShadow: ["0 0 3px rgba(0,255,65,0.5)", "0 0 8px rgba(0,255,65,0.8)", "0 0 3px rgba(0,255,65,0.5)"] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </div>
  );
}

// ─── Vendedor Chat Component (Fullscreen, Tabbed, WhatsApp-style) ───
interface ChatContact { username: string; name: string; photo: string; role: string; }
interface ChatMsg { id: string; from: string; to: string; text: string; type: string; timestamp: string; read: boolean; audioUrl?: string; audioDuration?: number; imageUrl?: string; mediaId?: string; }

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
function CallOverlay({ contact, type, accentColor, onEnd }: { contact: ChatContact; type: "voice" | "video"; accentColor: string; onEnd: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [connected, setConnected] = useState(false);
  useEffect(() => { const t = setTimeout(() => setConnected(true), 2000); return () => clearTimeout(t); }, []);
  useEffect(() => { if (!connected) return; const i = setInterval(() => setElapsed((p) => p + 1), 1000); return () => clearInterval(i); }, [connected]);
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex flex-col items-center justify-center"
      style={{ background: `radial-gradient(ellipse at center, ${accentColor}15 0%, #050508 70%)` }}
    >
      {/* Pulsing rings */}
      {[80, 120, 160].map((size, i) => (
        <motion.div key={i} className="absolute rounded-full border" style={{ width: size, height: size, borderColor: `${accentColor}15` }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5 }}
        />
      ))}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="relative">
          <NeonAvatar photo={contact.photo} name={contact.name} size="lg" />
          {type === "video" && connected && (
            <motion.div className="absolute -top-1 -right-1 p-1 rounded-full bg-[#ff006e]"
              animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}
            ><div className="w-2 h-2 bg-white rounded-full" /></motion.div>
          )}
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-lg">{contact.name}</p>
          <p className="text-gray-500 text-xs">{contact.role === "motorista" ? "Motorista" : "Cliente"}</p>
        </div>
        <motion.div animate={{ opacity: connected ? 1 : [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: connected ? 0 : Infinity }}>
          <p className="font-mono text-sm" style={{ color: accentColor }}>
            {connected ? fmt(elapsed) : type === "video" ? "Chamada de video..." : "Ligando..."}
          </p>
        </motion.div>
        {type === "video" && connected && (
          <div className="w-56 h-36 rounded-2xl bg-[#12121a] border border-[#1f1f2e] flex items-center justify-center overflow-hidden mt-2">
            <motion.div className="w-full h-full relative"
              style={{ background: `linear-gradient(135deg, ${accentColor}10, #0a0a1280)` }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <Video className="w-8 h-8 text-gray-700" />
              </div>
              {/* Mini self-view */}
              <div className="absolute bottom-2 right-2 w-14 h-10 rounded-lg bg-[#1f1f2e] border border-[#2a2a3e] flex items-center justify-center">
                <NeonAvatar photo={undefined} name="Eu" size="sm" />
              </div>
            </motion.div>
          </div>
        )}
        {/* Action buttons */}
        <div className="flex items-center gap-5 mt-4">
          {type === "video" && (
            <button className="p-3 rounded-full bg-[#1f1f2e] text-gray-400"><VideoOff className="w-5 h-5" /></button>
          )}
          <button className="p-3 rounded-full bg-[#1f1f2e] text-gray-400"><MicOff className="w-5 h-5" /></button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onEnd}
            className="p-4 rounded-full bg-[#ff006e] text-white shadow-[0_0_20px_rgba(255,0,110,0.5)]"
          ><PhoneOff className="w-6 h-6" /></motion.button>
          {type === "voice" && (
            <button className="p-3 rounded-full bg-[#1f1f2e] text-gray-400"><Maximize2 className="w-5 h-5" /></button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function VendedorChat({ currentUsername, currentUserName, currentUserPhoto, clientes, motoristas, onStartCall }: { currentUsername: string; currentUserName?: string; currentUserPhoto?: string; clientes: ChatContact[]; motoristas: ChatContact[]; onStartCall?: (to: string, type: "voice" | "video", toName: string) => void }) {
  const [chatTab, setChatTab] = useState<"clientes" | "motoristas">("clientes");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Attachment menu
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [micSimulated, setMicSimulated] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Audio playback
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  // Calls are handled via the shared call system
  // Image preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  // Toast notification
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  // Clear chat confirmation
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  // ─── Presence & Last Messages ────────────────
  const [presenceMap, setPresenceMap] = useState<Record<string, boolean>>({});
  const [lastMessagesMap, setLastMessagesMap] = useState<Record<string, { text: string; type: string; from: string; timestamp: string }>>({});
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allContacts = [...clientes, ...motoristas];
  const selectedContact = allContacts.find((c) => c.username === selectedChat);
  const activeContacts = chatTab === "clientes" ? clientes : motoristas;

  // ─── Presence & Last Messages Polling ──────────
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

  // ─── Helpers: base64 <-> blob ──────────────────
  const blobUrlCacheRef = useRef<Map<string, string>>(new Map());
  const mediaLoadingRef = useRef<Set<string>>(new Set());

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const base64ToBlobUrl = (base64: string, cacheKey: string): string => {
    const cached = blobUrlCacheRef.current.get(cacheKey);
    if (cached) return cached;
    try {
      const [header, data] = base64.split(",");
      const mime = header.match(/:(.*?);/)?.[1] || "audio/webm";
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      blobUrlCacheRef.current.set(cacheKey, url);
      return url;
    } catch { return ""; }
  };

  // Generate synthetic WAV audio (sine wave tone) for simulated mode
  const generateSyntheticAudioBlob = async (durationSec: number): Promise<Blob> => {
    const sampleRate = 22050;
    const numSamples = sampleRate * durationSec;
    const bitsPerSample = 16;
    const dataSize = numSamples * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
    writeStr(0, "RIFF"); view.setUint32(4, 36 + dataSize, true); writeStr(8, "WAVE");
    writeStr(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
    view.setUint16(34, bitsPerSample, true); writeStr(36, "data"); view.setUint32(40, dataSize, true);
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const freq = 440 * Math.pow(2, -t * 0.5);
      const envelope = Math.min(1, Math.min(t * 20, (durationSec - t) * 10));
      const sample = Math.sin(2 * Math.PI * freq * t) * 0.3 * envelope;
      view.setInt16(44 + i * 2, sample * 32767, true);
    }
    return new Blob([buffer], { type: "audio/wav" });
  };

  // Fetch and cache media for a message (audio or image)
  const hydrateMediaForMsg = useCallback(async (msg: ChatMsg) => {
    if (!msg.mediaId) return;
    const cacheKey = msg.mediaId;
    if (blobUrlCacheRef.current.has(cacheKey)) {
      // Already cached
      if (msg.type === "audio" && !msg.audioUrl) msg.audioUrl = blobUrlCacheRef.current.get(cacheKey)!;
      if (msg.type === "image" && !msg.imageUrl) msg.imageUrl = blobUrlCacheRef.current.get(cacheKey)!;
      return;
    }
    if (mediaLoadingRef.current.has(cacheKey)) return; // Already fetching
    mediaLoadingRef.current.add(cacheKey);
    try {
      const base64 = await api.getMedia(msg.mediaId);
      if (base64) {
        const url = base64ToBlobUrl(base64, cacheKey);
        if (msg.type === "audio") msg.audioUrl = url;
        if (msg.type === "image") msg.imageUrl = url;
      }
    } catch (err) {
      console.error("Erro ao carregar media:", err);
    } finally {
      mediaLoadingRef.current.delete(cacheKey);
    }
  }, []);

  // ─── Load messages & hydrate media URLs ─────────
  const loadMessages = useCallback(async () => {
    if (!selectedChat) return;
    try {
      const res = await api.getMessages(currentUsername, selectedChat);
      if (res.success) {
        const serverMsgs = (res.messages || []) as ChatMsg[];
        // Hydrate media URLs from cache first
        const mediaToFetch: ChatMsg[] = [];
        for (const msg of serverMsgs) {
          if (msg.mediaId) {
            const cached = blobUrlCacheRef.current.get(msg.mediaId);
            if (cached) {
              if (msg.type === "audio") msg.audioUrl = cached;
              if (msg.type === "image") msg.imageUrl = cached;
            } else {
              mediaToFetch.push(msg);
            }
          }
        }
        setMessages([...serverMsgs]);
        api.markMessagesRead(currentUsername, selectedChat, currentUsername).catch(() => {});
        // Fetch uncached media in parallel then update state
        if (mediaToFetch.length > 0) {
          await Promise.all(mediaToFetch.map((m) => hydrateMediaForMsg(m)));
          // Force re-render with hydrated URLs
          setMessages((prev) => {
            return prev.map((pm) => {
              if (pm.mediaId && blobUrlCacheRef.current.has(pm.mediaId)) {
                const url = blobUrlCacheRef.current.get(pm.mediaId)!;
                if (pm.type === "audio" && !pm.audioUrl) return { ...pm, audioUrl: url };
                if (pm.type === "image" && !pm.imageUrl) return { ...pm, imageUrl: url };
              }
              return pm;
            });
          });
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error("Erro ao carregar mensagens:", err);
    }
  }, [currentUsername, selectedChat, hydrateMediaForMsg]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages();
      pollingRef.current = setInterval(loadMessages, 3000);
      return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    } else { setMessages([]); }
  }, [selectedChat, loadMessages]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) { audioPlayerRef.current.pause(); audioPlayerRef.current = null; }
      blobUrlCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrlCacheRef.current.clear();
    };
  }, []);

  const handleSend = async () => {
    if (!message.trim() || !selectedChat || sending) return;
    const text = message.trim();
    setMessage("");
    setSending(true);
    api.sendTyping(currentUsername, selectedChat, false).catch(() => {});
    const tempMsg: ChatMsg = { id: `temp-${Date.now()}`, from: currentUsername, to: selectedChat, text, type: "text", timestamp: new Date().toISOString(), read: false };
    setMessages((prev) => [...prev, tempMsg]);
    try {
      await api.sendMessage(currentUsername, selectedChat, text);
      api.notifyNewMessage(selectedChat, currentUserName || currentUsername, text, "text").catch(() => {});
      await loadMessages();
    } catch (err) { console.error("Erro ao enviar:", err); } finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const formatTime = (ts: string) => { try { return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const handleBack = () => { setSelectedChat(null); setMessages([]); stopRecording(true); if (audioPlayerRef.current) { audioPlayerRef.current.pause(); setPlayingAudioId(null); } };

  const handleClearChat = async () => {
    if (!selectedChat || clearing) return;
    setClearing(true);
    try {
      const res = await api.clearChat(currentUsername, selectedChat, currentUsername);
      if (res.success) {
        setMessages([]);
        blobUrlCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
        blobUrlCacheRef.current.clear();
        showToast(`${res.deletedMessages} mensagens apagadas para todos`);
      }
    } catch (err) {
      console.error("Erro ao limpar chat:", err);
      showToast("Erro ao apagar mensagens");
    } finally {
      setClearing(false);
      setShowClearConfirm(false);
    }
  };

  // ─── Audio Recording ──────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); };
      mr.start();
      mediaRecorderRef.current = mr;
      setMicSimulated(false);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    } catch (_err) {
      console.log("Mic not available, using simulated recording mode");
      showToast("Microfone indisponivel — modo simulado ativado");
      mediaRecorderRef.current = null;
      setMicSimulated(true);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    }
  };

  const stopRecording = async (cancel = false) => {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }

    // Simulated recording path — generate real synthetic audio
    if (micSimulated) {
      const duration = recordingTime;
      setIsRecording(false);
      setMicSimulated(false);
      if (!cancel && duration >= 1) {
        const blob = await generateSyntheticAudioBlob(Math.min(duration, 10));
        await sendAudioMessage(blob, duration);
      }
      return;
    }

    // Real MediaRecorder path
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") { setIsRecording(false); return; }
    if (cancel) { mr.stop(); setIsRecording(false); return; }

    const duration = recordingTime;
    mr.onstop = async () => {
      mr.stream.getTracks().forEach((t) => t.stop());
      if (audioChunksRef.current.length === 0 || duration < 1) { setIsRecording(false); return; }
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      await sendAudioMessage(blob, duration);
      setIsRecording(false);
    };
    mr.stop();
  };

  const sendAudioMessage = async (audioBlob: Blob, duration: number) => {
    if (!selectedChat) return;
    // 1. Create local blob URL for instant playback
    const localUrl = URL.createObjectURL(audioBlob);
    const tempId = `sending-audio-${Date.now()}`;
    blobUrlCacheRef.current.set(tempId, localUrl);
    const msg: ChatMsg = {
      id: tempId, from: currentUsername, to: selectedChat,
      text: `🎤 Audio (${formatDuration(duration)})`, type: "audio",
      timestamp: new Date().toISOString(), read: false, audioUrl: localUrl, audioDuration: duration,
    };
    setMessages((prev) => [...prev, msg]);
    scrollToBottom();
    try {
      // 2. Upload audio base64 to separate media store
      const base64 = await blobToBase64(audioBlob);
      const mediaId = await api.uploadMedia(base64);
      // 3. Cache the url under the mediaId too
      blobUrlCacheRef.current.set(mediaId, localUrl);
      // 4. Send message with mediaId reference (no inline data)
      await api.sendMessage(currentUsername, selectedChat, `🎤 Audio (${formatDuration(duration)})`, "audio", {
        mediaId, audioDuration: duration,
      });
      await loadMessages();
    } catch (e) { console.error("Erro ao enviar audio:", e); showToast("Erro ao enviar audio"); }
  };

  // ─── Audio Playback ───────────────────────────
  const toggleAudioPlay = async (msgId: string, msg: ChatMsg) => {
    if (playingAudioId === msgId) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
      return;
    }
    if (audioPlayerRef.current) audioPlayerRef.current.pause();

    let url = msg.audioUrl;
    // If no audioUrl yet, try to fetch media
    if (!url && msg.mediaId) {
      const cached = blobUrlCacheRef.current.get(msg.mediaId);
      if (cached) { url = cached; }
      else {
        showToast("Carregando audio...");
        const base64 = await api.getMedia(msg.mediaId);
        if (base64) {
          url = base64ToBlobUrl(base64, msg.mediaId);
          setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, audioUrl: url } : m));
        }
      }
    }
    if (!url) { showToast("Audio indisponivel"); return; }
    const audio = new Audio(url);
    audio.onended = () => setPlayingAudioId(null);
    audio.onerror = () => { setPlayingAudioId(null); showToast("Erro ao reproduzir audio"); };
    audio.play().catch(() => { showToast("Erro ao reproduzir audio"); setPlayingAudioId(null); });
    audioPlayerRef.current = audio;
    setPlayingAudioId(msgId);
  };

  // ─── Photo Sending ────────────────────────────
  const compressImage = (file: File, maxWidth = 800): Promise<Blob> =>
    new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.7);
      };
      img.src = URL.createObjectURL(file);
    });

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;
    setShowAttachMenu(false);
    // 1. Compress and show locally
    const compressed = await compressImage(file);
    const localUrl = URL.createObjectURL(compressed);
    const tempId = `sending-img-${Date.now()}`;
    blobUrlCacheRef.current.set(tempId, localUrl);
    const msg: ChatMsg = {
      id: tempId, from: currentUsername, to: selectedChat,
      text: "📷 Foto", type: "image",
      timestamp: new Date().toISOString(), read: false, imageUrl: localUrl,
    };
    setMessages((prev) => [...prev, msg]);
    scrollToBottom();
    try {
      // 2. Upload to media store
      const base64 = await blobToBase64(compressed);
      const mediaId = await api.uploadMedia(base64);
      blobUrlCacheRef.current.set(mediaId, localUrl);
      // 3. Send message with mediaId
      await api.sendMessage(currentUsername, selectedChat, "📷 Foto", "image", { mediaId });
      await loadMessages();
    } catch (err) { console.error("Erro ao enviar foto:", err); showToast("Erro ao enviar foto"); }
    e.target.value = "";
  };

  // ─── Fullscreen Conversation View ─────────────
  if (selectedChat && selectedContact) {
    const accentColor = selectedContact.role === "motorista" ? "#ff00ff" : "#00f0ff";
    return (
      <>
        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] px-4 py-2.5 rounded-xl text-white text-sm font-medium border backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)]"
              style={{ background: "linear-gradient(135deg, #1f1f2e 0%, #12121a 100%)", borderColor: `${accentColor}30` }}
            >
              <div className="flex items-center gap-2">
                <motion.div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }}
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1, repeat: Infinity }}
                />
                {toast}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Calls are handled via global call overlay in the parent panel */}

        {/* Image Preview */}
        <AnimatePresence>
          {previewImage && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
              onClick={() => setPreviewImage(null)}
            >
              <motion.button className="absolute top-4 right-4 p-2 bg-[#1f1f2e] rounded-full text-white z-10"
                whileTap={{ scale: 0.9 }} onClick={() => setPreviewImage(null)}
              ><X className="w-5 h-5" /></motion.button>
              <motion.img src={previewImage} initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                className="max-w-full max-h-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
          className="fixed inset-0 z-[70] bg-[#050508] flex flex-col"
        >
          {/* ── Header ────────────────────────── */}
          <div className="relative shrink-0 bg-[#0a0a12]/95 backdrop-blur-xl border-b border-[#1f1f2e]/60 px-4 py-3 flex items-center gap-3">
            <motion.div className="absolute bottom-0 left-0 right-0 h-[1px]"
              style={{ background: `linear-gradient(90deg, transparent, ${accentColor}30, transparent)` }}
              animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleBack}
              className="p-1.5 rounded-xl hover:bg-[#1f1f2e] text-gray-400 transition-colors shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
            <NeonAvatar photo={selectedContact.photo} name={selectedContact.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">{selectedContact.name}</p>
              <div className="flex items-center gap-1.5">
                {typingMap[selectedContact.username] ? (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#00f0ff] text-[11px] font-medium italic">
                    digitando...
                  </motion.span>
                ) : presenceMap[selectedContact.username] ? (
                  <>
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-[#00ff41]"
                      animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="text-[#00ff41] text-[11px] font-medium">Online</span>
                  </>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                    <span className="text-gray-500 text-[11px] font-medium">Offline</span>
                  </>
                )}
              </div>
            </div>
            {/* Call & action buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <motion.button whileTap={{ scale: 0.85 }} onClick={() => onStartCall?.(selectedContact.username, "video", selectedContact.name)}
                className="p-2 rounded-xl hover:bg-[#1f1f2e] transition-colors" style={{ color: accentColor }}>
                <Video className="w-5 h-5" />
              </motion.button>
              <motion.button whileTap={{ scale: 0.85 }} onClick={() => onStartCall?.(selectedContact.username, "voice", selectedContact.name)}
                className="p-2 rounded-xl hover:bg-[#1f1f2e] transition-colors" style={{ color: accentColor }}>
                <Phone className="w-5 h-5" />
              </motion.button>
              <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowClearConfirm(true)}
                className="p-2 rounded-xl hover:bg-[#ff003c]/15 transition-colors text-[#ff003c]/70 hover:text-[#ff003c]">
                <Trash2 className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* ── Clear Chat Confirmation Modal ─── */}
          <AnimatePresence>
            {showClearConfirm && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
                onClick={() => !clearing && setShowClearConfirm(false)}
              >
                <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
                  className="w-full max-w-sm bg-[#0a0a12] border border-[#ff003c]/30 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(255,0,60,0.15)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="px-5 pt-5 pb-3 text-center">
                    <motion.div className="w-14 h-14 rounded-2xl bg-[#ff003c]/10 border border-[#ff003c]/20 flex items-center justify-center mx-auto mb-3"
                      animate={{ boxShadow: ["0 0 15px rgba(255,0,60,0.1)", "0 0 30px rgba(255,0,60,0.25)", "0 0 15px rgba(255,0,60,0.1)"] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Trash2 className="w-7 h-7 text-[#ff003c]" />
                    </motion.div>
                    <h3 className="text-white font-bold text-base mb-1">Apagar Conversa</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Todas as mensagens com <span className="text-white font-semibold">{selectedContact?.name}</span> serão
                      apagadas <span className="text-[#ff003c] font-semibold">para todos</span>, incluindo fotos e áudios.
                    </p>
                    <p className="text-[#ff003c]/70 text-xs mt-2 font-medium">Esta ação não pode ser desfeita!</p>
                  </div>
                  {/* Actions */}
                  <div className="px-5 pb-5 pt-2 flex gap-3">
                    <motion.button whileTap={{ scale: 0.95 }}
                      onClick={() => setShowClearConfirm(false)} disabled={clearing}
                      className="flex-1 py-3 rounded-xl bg-[#1f1f2e] text-gray-300 font-semibold text-sm hover:bg-[#2a2a3e] transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }}
                      onClick={handleClearChat} disabled={clearing}
                      className="flex-1 py-3 rounded-xl bg-[#ff003c] text-white font-semibold text-sm hover:bg-[#ff003c]/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {clearing ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Apagar Tudo
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Messages ──────────────────────── */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" onClick={() => setShowAttachMenu(false)}>
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center h-full text-center">
                <motion.div animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.95, 1, 0.95] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-20 h-20 rounded-2xl bg-[#1f1f2e]/50 flex items-center justify-center mb-3"
                >
                  <Send className="w-8 h-8 text-gray-600" />
                </motion.div>
                <p className="text-gray-500 text-sm font-medium">Inicie uma conversa</p>
                <p className="text-gray-600 text-xs">com {selectedContact.name}</p>
              </div>
            ) : (
              <>
                <AnimatePresence initial={false}>
                  {messages.map((msg) => {
                    const isMine = msg.from === currentUsername;
                    const bubbleClass = isMine
                      ? "bg-gradient-to-br from-[#00f0ff]/15 to-[#8b5cf6]/15 border border-[#00f0ff]/10"
                      : "bg-[#12121a] border border-[#1f1f2e]/60";

                    return (
                      <motion.div key={msg.id} initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.15 }} className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[80%] rounded-2xl overflow-hidden ${bubbleClass}`}>
                          {/* Image message */}
                          {msg.type === "image" ? (
                            msg.imageUrl ? (
                              <div>
                                <button onClick={() => setPreviewImage(msg.imageUrl!)} className="w-full">
                                  <img src={msg.imageUrl} alt="Foto" className="w-full max-h-[250px] object-cover rounded-t-2xl" />
                                </button>
                                <div className={`flex items-center gap-1 px-3 py-1.5 ${isMine ? "justify-end" : "justify-start"}`}>
                                  <span className="text-gray-600 text-[9px]">{formatTime(msg.timestamp)}</span>
                                  {isMine && (msg.read ? <CheckCheck className="w-3 h-3 text-[#00f0ff]" /> : <Check className="w-3 h-3 text-gray-600" />)}
                                </div>
                              </div>
                            ) : (
                              <div className="px-3 py-4 flex flex-col items-center gap-2">
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                  className="w-6 h-6 border-2 border-t-transparent rounded-full"
                                  style={{ borderColor: `${accentColor}60`, borderTopColor: "transparent" }}
                                />
                                <span className="text-gray-500 text-[10px]">Carregando foto...</span>
                              </div>
                            )
                          ) : msg.type === "audio" ? (
                            /* Audio message */
                            <div className="px-4 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <motion.button whileTap={{ scale: 0.85 }} onClick={() => toggleAudioPlay(msg.id, msg)}
                                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                                  style={{ background: `linear-gradient(135deg, ${accentColor}, #8b5cf6)` }}
                                >
                                  {playingAudioId === msg.id ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white ml-0.5" />}
                                </motion.button>
                                <div className="flex-1 min-w-0">
                                  <AudioWaveform playing={playingAudioId === msg.id} color={isMine ? "#00f0ff" : "#8b5cf6"} />
                                </div>
                                <span className="text-gray-500 text-[11px] font-mono shrink-0">{formatDuration(msg.audioDuration || 0)}</span>
                              </div>
                              <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                                <span className="text-gray-600 text-[9px]">{formatTime(msg.timestamp)}</span>
                                {isMine && (msg.read ? <CheckCheck className="w-3 h-3 text-[#00f0ff]" /> : <Check className="w-3 h-3 text-gray-600" />)}
                              </div>
                            </div>
                          ) : (
                            /* Text message */
                            <div className="px-4 py-2.5">
                              <p className="text-white text-sm break-words leading-relaxed">{msg.text}</p>
                              <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
                                <span className="text-gray-600 text-[9px]">{formatTime(msg.timestamp)}</span>
                                {isMine && (msg.read ? <CheckCheck className="w-3 h-3 text-[#00f0ff]" /> : <Check className="w-3 h-3 text-gray-600" />)}
                              </div>
                            </div>
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
                            <motion.div key={i} className="w-2 h-2 rounded-full bg-[#00f0ff]"
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

          {/* ── Input Area ────────────────────── */}
          <div className="relative shrink-0 bg-[#0a0a12]/95 backdrop-blur-xl border-t border-[#1f1f2e]/60 p-3">
            {/* Hidden file inputs */}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelected} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelected} />

            {/* Attachment menu popup */}
            <AnimatePresence>
              {showAttachMenu && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full left-2 mb-2 bg-[#12121a] border border-[#1f1f2e] rounded-2xl p-2 shadow-[0_0_30px_rgba(0,0,0,0.6)] min-w-[160px]"
                >
                  <motion.button whileTap={{ scale: 0.95 }}
                    onClick={() => { cameraInputRef.current?.click(); setShowAttachMenu(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#1f1f2e] transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, #ff006e, #ff00ff)` }}>
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white text-xs font-medium">Camera</span>
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.95 }}
                    onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#1f1f2e] transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, #8b5cf6, #00f0ff)` }}>
                      <ImageIcon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white text-xs font-medium">Galeria</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recording UI */}
            {isRecording ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3"
              >
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => stopRecording(true)}
                  className="p-2.5 rounded-xl bg-[#ff006e]/20 text-[#ff006e] shrink-0 border border-[#ff006e]/20">
                  <Trash2 className="w-4 h-4" />
                </motion.button>
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-[#12121a] rounded-xl border border-[#ff006e]/20">
                  <motion.div className="w-2.5 h-2.5 rounded-full bg-[#ff006e] shrink-0"
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1, repeat: Infinity }}
                  />
                  <span className="text-[#ff006e] font-mono text-sm font-bold">{formatDuration(recordingTime)}</span>
                  <div className="flex-1"><AudioWaveform playing={true} color="#ff006e" /></div>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => stopRecording(false)}
                  className="p-3 rounded-xl text-white shrink-0"
                  style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #8b5cf6 100%)` }}
                >
                  <Send className="w-5 h-5" />
                </motion.button>
              </motion.div>
            ) : (
              /* Normal input */
              <div className="flex items-center gap-2">
                <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); setShowAttachMenu(!showAttachMenu); }}
                  className={`p-2 rounded-xl transition-colors shrink-0 ${showAttachMenu ? "bg-[#1f1f2e] text-white" : "hover:bg-[#1f1f2e] text-gray-500"}`}>
                  <Paperclip className="w-5 h-5" />
                </motion.button>
                <input
                  type="text" value={message} onChange={(e) => handleTypingInput(e.target.value)} onKeyDown={handleKeyDown}
                  onFocus={() => setShowAttachMenu(false)}
                  placeholder="Mensagem..."
                  className="flex-1 px-4 py-3 bg-[#12121a] border border-[#1f1f2e]/60 rounded-xl text-white text-sm focus:outline-none focus:border-[#00f0ff]/40 transition-all placeholder-gray-600"
                />
                {message.trim() ? (
                  <motion.button whileTap={{ scale: 0.9 }} onClick={handleSend} disabled={sending}
                    className="p-3 rounded-xl text-white disabled:opacity-30 shrink-0 transition-all"
                    style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #8b5cf6 100%)` }}
                  >
                    <Send className="w-5 h-5" />
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={startRecording}
                    className="p-3 rounded-xl text-white shrink-0 transition-all"
                    style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #8b5cf6 100%)` }}
                  >
                    <Mic className="w-5 h-5" />
                  </motion.button>
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      {/* Tab Switcher */}
      <div className="relative flex bg-[#0c0c14] rounded-xl border border-[#1f1f2e]/50 p-1">
        <motion.div className="absolute top-1 bottom-1 rounded-lg z-0"
          animate={{ left: chatTab === "clientes" ? "4px" : "50%", width: "calc(50% - 4px)" }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{ background: chatTab === "clientes" ? "linear-gradient(135deg, #00f0ff15, #8b5cf615)" : "linear-gradient(135deg, #ff00ff15, #8b5cf615)" }}
        />
        <motion.div className="absolute top-0 rounded-xl"
          animate={{ left: chatTab === "clientes" ? "25%" : "75%", x: "-50%" }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{ width: 30, height: 2, background: chatTab === "clientes" ? "#00f0ff" : "#ff00ff", boxShadow: chatTab === "clientes" ? "0 0 8px rgba(0,240,255,0.6)" : "0 0 8px rgba(255,0,255,0.6)" }}
        />
        {[
          { id: "clientes" as const, label: "Clientes", count: clientes.length, color: "#00f0ff", icon: <Users className="w-3.5 h-3.5" /> },
          { id: "motoristas" as const, label: "Motoristas", count: motoristas.length, color: "#ff00ff", icon: <Truck className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setChatTab(tab.id)}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg font-semibold text-xs transition-colors ${
              chatTab === tab.id ? "text-white" : "text-gray-500"
            }`}
          >
            <span style={{ color: chatTab === tab.id ? tab.color : undefined }}>{tab.icon}</span>
            <span>{tab.label}</span>
            <motion.span
              className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{ backgroundColor: chatTab === tab.id ? `${tab.color}20` : "#1f1f2e", color: chatTab === tab.id ? tab.color : "#666" }}
              animate={chatTab === tab.id ? { boxShadow: [`0 0 4px ${tab.color}20`, `0 0 8px ${tab.color}40`, `0 0 4px ${tab.color}20`] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {tab.count}
            </motion.span>
          </button>
        ))}
      </div>

      {/* Contact List */}
      <AnimatePresence mode="wait">
        <motion.div key={chatTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {activeContacts.length === 0 ? (
            <GlowCard glowColor={chatTab === "clientes" ? "#00f0ff" : "#ff00ff"}>
              <div className="p-8 text-center">
                <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 3, repeat: Infinity }}>
                  {chatTab === "clientes" ? <Users className="w-10 h-10 text-gray-700 mx-auto mb-2" /> : <Truck className="w-10 h-10 text-gray-700 mx-auto mb-2" />}
                </motion.div>
                <p className="text-gray-500 text-xs">Nenhum {chatTab === "clientes" ? "cliente" : "motorista"}</p>
                <p className="text-gray-600 text-[10px] mt-1">Gere um convite para adicionar</p>
              </div>
            </GlowCard>
          ) : (
            <div className="space-y-2">
              {activeContacts.map((contact, i) => {
                const isMotorista = contact.role === "motorista";
                const accentColor = isMotorista ? "#ff00ff" : "#00f0ff";
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
                  <motion.button key={contact.username} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelectedChat(contact.username)}
                    whileTap={{ scale: 0.98 }}
                    className="w-full text-left"
                  >
                    <GlowCard glowColor={contactOnline ? "#00ff41" : "#666"}>
                      <div className="flex items-center gap-3 p-3.5">
                        <NeonAvatar photo={contact.photo} name={contact.name} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">{contact.name}</p>
                          {lastMsgPreview ? (
                            <p className="text-gray-500 text-xs truncate mt-0.5">
                              {lastMsg?.from === currentUsername && <span className="text-gray-600">Você: </span>}{lastMsgPreview}
                            </p>
                          ) : (
                            <p className="text-gray-500 text-xs">@{contact.username}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <div className="flex items-center gap-1.5">
                            {lastMsgTime && (
                              <span className="text-[10px] font-mono text-gray-600">{lastMsgTime}</span>
                            )}
                            {contactOnline ? (
                              <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }}
                                className="text-[9px] font-semibold text-[#00ff41] bg-[#00ff41]/10 px-1.5 py-0.5 rounded-full border border-[#00ff41]/20">
                                ON
                              </motion.div>
                            ) : (
                              <span className="text-[9px] font-semibold text-gray-500 bg-gray-500/10 px-1.5 py-0.5 rounded-full border border-gray-500/20">
                                OFF
                              </span>
                            )}
                          </div>
                          <motion.div className="p-1.5 rounded-lg" style={{ backgroundColor: `${accentColor}15` }}
                            whileHover={{ backgroundColor: `${accentColor}25` }}
                          >
                            <MessageSquare className="w-3.5 h-3.5" style={{ color: accentColor }} />
                          </motion.div>
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
    </motion.div>
  );
}

// ─── Motorista Commission Tab Component ──────────────────────────────
function MotoristaCommissionTab({ vendorUsername, motoristas }: { vendorUsername: string; motoristas: any[] }) {
  const [configs, setConfigs] = useState<Record<string, { taxaFixa: string; taxaPercent: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loadedDrivers, setLoadedDrivers] = useState<Set<string>>(new Set());

  // Load configs for all motoristas
  useEffect(() => {
    motoristas.forEach(async (m) => {
      if (loadedDrivers.has(m.username)) return;
      try {
        const r = await api.getDriverCommission(vendorUsername, m.username);
        if (r.success && r.config) {
          setConfigs((prev) => ({
            ...prev,
            [m.username]: {
              taxaFixa: String(r.config.taxaFixa ?? 5),
              taxaPercent: String(r.config.taxaPercent ?? 8),
            },
          }));
          setLoadedDrivers((prev) => new Set(prev).add(m.username));
        }
      } catch {
        // Use defaults
        setConfigs((prev) => ({
          ...prev,
          [m.username]: prev[m.username] || { taxaFixa: "5", taxaPercent: "8" },
        }));
      }
    });
  }, [motoristas, vendorUsername]);

  const handleSave = async (driverUsername: string) => {
    const cfg = configs[driverUsername];
    if (!cfg) return;
    setSaving(driverUsername);
    try {
      await api.setDriverCommission(vendorUsername, driverUsername, Number(cfg.taxaFixa), Number(cfg.taxaPercent));
      setSaved(driverUsername);
      sfx.playCodeAccepted();
      setTimeout(() => setSaved(null), 2000);
    } catch (err: any) {
      sfx.playError();
      console.error("Erro ao salvar taxa:", err);
    } finally {
      setSaving(null);
    }
  };

  const updateConfig = (username: string, field: "taxaFixa" | "taxaPercent", value: string) => {
    setConfigs((prev) => ({
      ...prev,
      [username]: { ...(prev[username] || { taxaFixa: "5", taxaPercent: "8" }), [field]: value },
    }));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <GlowCard glowColor="#ff00ff">
        <div className="p-4">
          <h2 className="text-white font-bold text-lg mb-3"><NeonText color="#ff00ff">Comissoes Motoristas</NeonText></h2>
          {motoristas.length > 0 ? (
            <div className="space-y-3">
              {motoristas.map((m) => {
                const cfg = configs[m.username] || { taxaFixa: "5", taxaPercent: "8" };
                const isSaving = saving === m.username;
                const isSaved = saved === m.username;
                return (
                  <div key={m.username} className="p-4 bg-[#0a0a12]/60 rounded-xl border border-[#1f1f2e]/40 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <NeonAvatar photo={m.photo} name={m.name} size="md" />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-semibold text-sm truncate">{m.name}</h3>
                        <p className="text-gray-500 text-xs">@{m.username}</p>
                      </div>
                      {isSaved && (
                        <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                          className="text-[#00ff41] text-[10px] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Salvo!
                        </motion.span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Taxa Fixa (R$)</label>
                        <input type="number" value={cfg.taxaFixa} step="0.01" min="0"
                          onChange={(e) => updateConfig(m.username, "taxaFixa", e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#0c0c14] border border-[#1f1f2e] rounded-lg text-white text-xs focus:outline-none focus:border-[#ff00ff]/50 transition-all" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">% da Venda</label>
                        <input type="number" value={cfg.taxaPercent} min="0" max="100"
                          onChange={(e) => updateConfig(m.username, "taxaPercent", e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#0c0c14] border border-[#1f1f2e] rounded-lg text-white text-xs focus:outline-none focus:border-[#ff00ff]/50 transition-all" />
                      </div>
                    </div>
                    {/* Preview */}
                    <div className="bg-[#0c0c14] rounded-lg p-2.5 border border-[#1f1f2e]/30">
                      <p className="text-gray-500 text-[10px] mb-1">Exemplo: venda de R$ 100</p>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-[11px]">Fixo + % = </span>
                        <NeonText color="#00ff41" className="font-bold text-sm">
                          R$ {(Number(cfg.taxaFixa || 0) + (Number(cfg.taxaPercent || 0) / 100) * 100).toFixed(2)}
                        </NeonText>
                      </div>
                    </div>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleSave(m.username)}
                      disabled={isSaving}
                      className="w-full py-2.5 font-bold text-white text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #ff00ff 0%, #8b5cf6 100%)" }}
                    >
                      {isSaving ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />
                      ) : isSaved ? (
                        <><Check className="w-3.5 h-3.5" /> Salvo!</>
                      ) : (
                        "Salvar Comissao"
                      )}
                    </motion.button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-6 text-xs">Nenhum motorista cadastrado</p>
          )}
        </div>
      </GlowCard>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export function VendedorPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isOnline, setIsOnline] = useState(() => {
    try { return localStorage.getItem("vendedor_online_" + JSON.parse(localStorage.getItem("currentUser") || "{}").username) === "true"; } catch { return false; }
  });
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | false>(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", description: "", price: "" });
  const [generatedCodesCliente, setGeneratedCodesCliente] = useState<any[]>([]);
  const [generatedCodesMotorista, setGeneratedCodesMotorista] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixAmount, setPixAmount] = useState("");
  const [pixDescription, setPixDescription] = useState("");
  const [pixGenerating, setPixGenerating] = useState(false);
  const [pixInvoice, setPixInvoice] = useState<any>(null);
  const [pixStatus, setPixStatus] = useState<"idle" | "generating" | "waiting" | "paid" | "error">("idle");
  const [pixError, setPixError] = useState("");
  const [adminCommissionRate, setAdminCommissionRate] = useState(15);
  const pixPollingRef = useRef<any>(null);
  const [driverSelectOrder, setDriverSelectOrder] = useState<any>(null);
  const [driverPresence, setDriverPresence] = useState<Record<string, boolean>>({});
  const [assigningDriver, setAssigningDriver] = useState<string | null>(null);

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const isAdminViewing = currentUser.adminViewing === true;
  const callSystem = useCallSystem(currentUser.username);

  // ─── Heartbeat for presence ───
  useEffect(() => {
    if (!currentUser.username) return;
    api.sendHeartbeat(currentUser.username).catch(() => {});
    const hb = setInterval(() => api.sendHeartbeat(currentUser.username).catch(() => {}), 15000);
    return () => clearInterval(hb);
  }, [currentUser.username]);

  const [totalUnread, setTotalUnread] = useState(0);

  const handleStartCall = useCallback(async (to: string, type: "voice" | "video", _toName: string) => {
    await callSystem.startCall(to, type, currentUser.name || currentUser.username, currentUser.photo);
  }, [callSystem.startCall, currentUser.name, currentUser.username, currentUser.photo]);

  const handleBackToAdmin = () => {
    const adminSession = localStorage.getItem("adminOriginalSession");
    if (adminSession) { localStorage.setItem("currentUser", adminSession); localStorage.removeItem("adminOriginalSession"); }
    navigate("/admin");
  };

  const fetchCodes = async () => {
    try {
      const [clienteRes, motoristaRes] = await Promise.all([api.getInviteCodes("cliente"), api.getInviteCodes("motorista")]);
      if (clienteRes.success) {
        setGeneratedCodesCliente(clienteRes.codes.filter((c: any) => c.generatedBy === currentUser.username).map((code: any) => ({
          code: code.code, type: code.type, used: code.used, usedBy: code.usedBy || null, usedAt: code.usedAt || null,
          generatedAt: new Date(code.generatedAt).toLocaleDateString(),
        })));
      }
      if (motoristaRes.success) {
        setGeneratedCodesMotorista(motoristaRes.codes.filter((c: any) => c.generatedBy === currentUser.username).map((code: any) => ({
          code: code.code, type: code.type, used: code.used, usedBy: code.usedBy || null, usedAt: code.usedAt || null,
          generatedAt: new Date(code.generatedAt).toLocaleDateString(),
        })));
      }
    } catch (error) { console.error("Erro ao buscar codigos:", error); }
  };

  const loadCommissionRate = async () => {
    try {
      const r = await api.getVendorCommission(currentUser.username);
      if (r.success) setAdminCommissionRate(r.rate);
    } catch (e) { console.error("Erro ao carregar taxa:", e); }
  };

  useEffect(() => { loadMyUsers(); loadProducts(); loadOrders(); loadMetrics(); fetchCodes(); loadCommissionRate(); }, []);
  useEffect(() => {
    if (activeTab === "convite") fetchCodes();
    if (activeTab === "dashboard") { loadMetrics(); loadMyUsers(); }
    if (activeTab === "produtos") loadProducts();
    if (activeTab === "pedidos") loadOrders();
  }, [activeTab]);
  useEffect(() => { const i = setInterval(() => { fetchCodes(); loadMyUsers(); loadOrders(); }, 8000); return () => clearInterval(i); }, []);
  useEffect(() => { return () => { if (pixPollingRef.current) clearInterval(pixPollingRef.current); }; }, []);

  const loadMyUsers = async () => {
    try { setLoading(true); const r = await api.getUsersCreatedBy(currentUser.username); if (r.success) { const u = r.users || []; setClientes(u.filter((x: any) => x.role === "cliente")); setMotoristas(u.filter((x: any) => x.role === "motorista")); } } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const loadProducts = async () => { try { const r = await api.getProducts(currentUser.username); if (r.success) setProdutos(r.products || []); } catch (e) { console.error(e); } };
  const loadOrders = async () => { try { const r = await api.getVendorOrders(currentUser.username); if (r.success) setOrders(r.orders || []); } catch (e) { console.error(e); } };
  const loadMetrics = async () => { try { const r = await api.getMetrics(currentUser.username); if (r.success) { setMetrics(r.metrics || {}); if (r.metrics?.adminCommissionRate !== undefined) setAdminCommissionRate(r.metrics.adminCommissionRate); } } catch (e) { console.error(e); } };

  const handleToggleOnline = async () => {
    const n = !isOnline; setIsOnline(n);
    localStorage.setItem("vendedor_online_" + currentUser.username, String(n));
    sfx.playToggle(n);
    try { await api.setUserStatus(currentUser.username, n); } catch (e) { console.error(e); }
    if (n) {
      pwa.setPushEnabledForUser(currentUser.username, true);
      pwa.registerPushSubscription(currentUser.username).catch(() => {});
      setStatusToast("🟢 Sua loja está Online e você receberá notificações");
    } else {
      pwa.setPushEnabledForUser(currentUser.username, false);
      pwa.unregisterPushSubscription(currentUser.username).catch(() => {});
      setStatusToast("🔴 Sua loja está Fechada e você não receberá notificações");
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

  const pendingOrdersCount = orders.filter((o: any) => o.status === "pending").length;
  const menuItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", id: "dashboard" },
    { icon: <MessageSquare className="w-5 h-5" />, label: "Chat", id: "chat", badge: totalUnread || undefined },
    { icon: <ClipboardList className="w-5 h-5" />, label: "Pedidos", id: "pedidos", badge: pendingOrdersCount || undefined },
    { icon: <Package className="w-5 h-5" />, label: "Produtos", id: "produtos" },
    { icon: <FileText className="w-5 h-5" />, label: "Relatorios", id: "relatorios" },
    { icon: <Ticket className="w-5 h-5" />, label: "Convites", id: "convite" },
    { icon: <Wallet className="w-5 h-5" />, label: "Recebimentos", id: "recebimentos" },
    { icon: <Truck className="w-5 h-5" />, label: "Taxa Motorista", id: "taxa-motorista" },
  ];

  const handleGenerateCode = async (type: "cliente" | "motorista") => {
    try { const r = await api.generateInviteCode(type, currentUser.username); if (r.success) { sfx.playCodeAccepted(); copyToClipboard(r.code.code); notif.notifyCodeGenerated(r.code.code); await fetchCodes(); await loadMyUsers(); } } catch (e: any) { sfx.playError(); alert("Erro: " + e.message); }
  };

  const copyToClipboard = (text: string) => {
    const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.left = "-9999px";
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand("copy"); setCopied(text); setTimeout(() => setCopied(false), 2000); } catch (_) {}
    document.body.removeChild(ta);
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) return;
    try { const r = await api.createProduct(currentUser.username, { name: newProduct.name, description: newProduct.description, price: Number(newProduct.price) }); if (r.success) { setProdutos((p) => [...p, r.product]); setShowProductModal(false); setNewProduct({ name: "", description: "", price: "" }); } } catch (e: any) { alert("Erro: " + e.message); }
  };

  const handleDeleteProduct = async (id: string) => { try { await api.deleteProduct(currentUser.username, id); setProdutos((p) => p.filter((x) => x.id !== id)); } catch (e: any) { alert("Erro: " + e.message); } };

  const handleUpdateOrderStatus = async (order: any, newStatus: string) => {
    // Intercept "delivering" to open driver selection modal
    if (newStatus === "delivering" && !order.driverUsername) {
      setDriverSelectOrder(order);
      // Load driver presence
      if (motoristas.length > 0) {
        api.checkPresence(motoristas.map((m: any) => m.username)).then((res) => {
          if (res.success) setDriverPresence(res.presence || {});
        }).catch(() => {});
      }
      return;
    }
    try { await api.updateOrderStatus(order.id, { status: newStatus, vendorUsername: order.vendorUsername, clientUsername: order.clientUsername, driverUsername: order.driverUsername }); notif.notifyOrderStatus(newStatus, order.id); setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o))); } catch (e: any) { alert("Erro: " + e.message); }
  };

  const handleAssignDriverAndDeliver = async (driverUsername: string) => {
    if (!driverSelectOrder || assigningDriver) return;
    setAssigningDriver(driverUsername);
    try {
      await api.updateOrderStatus(driverSelectOrder.id, {
        status: "delivering",
        vendorUsername: driverSelectOrder.vendorUsername,
        clientUsername: driverSelectOrder.clientUsername,
        driverUsername,
      });
      notif.notifyOrderStatus("delivering", driverSelectOrder.id);
      setOrders((prev) => prev.map((o) => (o.id === driverSelectOrder.id ? { ...o, status: "delivering", driverUsername, updatedAt: new Date().toISOString() } : o)));
      setDriverSelectOrder(null);
    } catch (e: any) {
      alert("Erro ao atribuir motorista: " + e.message);
    } finally {
      setAssigningDriver(null);
    }
  };

  const FIXED_FEE = 0.99; // Taxa fixa constante descontada do vendedor
  const MIN_PIX_AMOUNT = 10; // Valor minimo da API PixWave

  const handleGeneratePix = async () => {
    const amount = parseFloat(pixAmount.replace(",", "."));
    if (!amount || amount < MIN_PIX_AMOUNT) {
      setPixError(`Valor minimo para gerar PIX: R$ ${MIN_PIX_AMOUNT.toFixed(2)}`);
      sfx.playError();
      return;
    }
    setPixGenerating(true);
    setPixStatus("generating");
    setPixError("");
    try {
      sfx.playNavigate();
      const taxaAdmin = parseFloat((amount * (adminCommissionRate / 100)).toFixed(2));
      const vendorReceives = parseFloat((amount - taxaAdmin - FIXED_FEE).toFixed(2));
      const res = await api.createPixwaveInvoice({
        description: pixDescription || `Venda direta - ${currentUser.name || currentUser.username}`,
        price: amount,
        externalId: `direct-pix-${Date.now()}`,
        metadata: { vendorUsername: currentUser.username, type: "direct_sale", adminCommission: taxaAdmin, fixedFee: FIXED_FEE, vendorNet: vendorReceives },
      });
      console.log("📥 PixWave invoice response:", JSON.stringify(res.invoice, null, 2));
      if (res.success && res.invoice) {
        setPixInvoice(res.invoice);
        setPixStatus("waiting");
        sfx.playCodeAccepted();
        notif.notifyPixGenerated(amount);
        if (pixPollingRef.current) clearInterval(pixPollingRef.current);
        pixPollingRef.current = setInterval(async () => {
          try {
            const statusRes = await api.getPixwaveInvoice(res.invoice.id);
            if (statusRes.success && statusRes.invoice?.status === "paid") {
              if (pixPollingRef.current) clearInterval(pixPollingRef.current);
              // Register direct sale
              await api.recordDirectPixSale({
                vendorUsername: currentUser.username,
                amount,
                invoiceId: res.invoice.id,
                description: pixDescription || "Venda direta PIX",
              });
              setPixStatus("paid");
              sfx.playSuccess();
              notif.notifyPixConfirmed(amount);
              loadMetrics();
              setTimeout(() => {
                setShowPixModal(false);
                setPixStatus("idle");
                setPixInvoice(null);
                setPixAmount("");
                setPixDescription("");
              }, 3500);
            } else if (statusRes.invoice?.status === "expired" || statusRes.invoice?.status === "cancelled") {
              if (pixPollingRef.current) clearInterval(pixPollingRef.current);
              setPixStatus("error");
              setPixError("PIX expirado ou cancelado. Tente novamente.");
              sfx.playError();
            }
          } catch { /* continue polling */ }
        }, 4000);
      } else {
        setPixStatus("error");
        const errMsg = res.error || "Erro ao gerar PIX";
        const diagnosticInfo = res.lastResponseBody ? JSON.stringify(res.lastResponseBody).substring(0, 200) : "";
        console.error("❌ PIX generation failed:", errMsg, "| Strategies:", res.strategiesAttempted, "| Last response:", diagnosticInfo);
        console.error("Full server response:", JSON.stringify(res));
        setPixError(errMsg);
        sfx.playError();
      }
    } catch (err: any) {
      setPixStatus("error");
      console.error("❌ PIX generation exception:", err);
      setPixError(err.message || "Erro ao gerar PIX");
      sfx.playError();
    } finally {
      setPixGenerating(false);
    }
  };

  const handleClosePixModal = () => {
    if (pixPollingRef.current) clearInterval(pixPollingRef.current);
    setShowPixModal(false);
    setPixStatus("idle");
    setPixInvoice(null);
    setPixAmount("");
    setPixDescription("");
    setPixError("");
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: "Pendente", color: "#ff9f00" }, accepted: { label: "Aceito", color: "#00f0ff" },
    preparing: { label: "Preparando", color: "#8b5cf6" }, delivering: { label: "Enviado", color: "#ff9f00" },
    driver_accepted: { label: "Motorista Aceitou", color: "#00f0ff" }, on_the_way: { label: "A Caminho", color: "#ff00ff" },
    delivered: { label: "Entregue", color: "#00ff41" }, cancelled: { label: "Cancelado", color: "#ff006e" },
  };

  const salesData = orders.length > 0 ? (() => {
    const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().split("T")[0]; });
    return last7.map((date) => ({ name: date.slice(5), vendas: orders.filter((o) => o.createdAt?.startsWith(date) && o.status !== "cancelled").reduce((s: number, o: any) => s + (o.total || 0), 0) }));
  })() : [];

  const chatContacts = [...clientes, ...motoristas].map((u) => ({ username: u.username, name: u.name || u.username, photo: u.photo || "", role: u.role }));

  // ─── Sidebar unread badge polling ───
  useEffect(() => {
    if (!currentUser.username || chatContacts.length === 0) return;
    const poll = async () => {
      try {
        const contacts = chatContacts.map((c: any) => c.username);
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

  // Online/Offline toggle as header action
  const headerAction = (
    <div className="flex items-center gap-2">
      {isOnline && (
        <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center gap-1.5 px-2 py-0.5 bg-[#00ff41]/15 rounded-full">
          <div className="w-1.5 h-1.5 bg-[#00ff41] rounded-full" />
          <span className="text-[#00ff41] text-[11px] font-medium">Online</span>
        </motion.div>
      )}
      <motion.button onClick={handleToggleOnline} whileTap={{ scale: 0.9 }}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs transition-all ${
          isOnline ? "text-black shadow-[0_0_20px_rgba(0,255,65,0.4)]" : "bg-[#1f1f2e] text-gray-500 hover:text-white border border-[#1f1f2e]"
        }`}
        style={isOnline ? { background: "linear-gradient(135deg, #00ff41 0%, #00f0ff 100%)" } : undefined}
      >
        <Power className="w-3.5 h-3.5" />
        {isOnline ? "ON" : "OFF"}
      </motion.button>
    </div>
  );

  return (
    <>
      {/* Admin Viewing Banner */}
      {isAdminViewing && (
        <motion.div initial={{ y: -50 }} animate={{ y: 0 }}
          className="fixed top-0 left-0 right-0 z-[60] px-4 py-2.5"
          style={{ background: "linear-gradient(135deg, #8b5cf6, #00f0ff)" }}
        >
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="w-4 h-4 text-white shrink-0" />
              <span className="text-white font-medium text-xs truncate">
                Visualizando: <span className="font-bold">@{currentUser.username}</span>
              </span>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleBackToAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white font-bold rounded-lg hover:bg-white/30 transition-colors border border-white/30 text-xs shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </motion.button>
          </div>
        </motion.div>
      )}

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

      <div className={isAdminViewing ? "pt-[40px]" : ""}>
        <SidebarLayout menuItems={menuItems} activeTab={activeTab} onTabChange={(t) => { sfx.playNavigate(); setActiveTab(t); }} title="Vendedor" headerAction={headerAction}
          onLogout={() => {
            localStorage.setItem("vendedor_online_" + currentUser.username, "false");
            pwa.setPushEnabledForUser(currentUser.username, false);
            pwa.unregisterPushSubscription(currentUser.username).catch(() => {});
            api.setUserStatus(currentUser.username, false).catch(() => {});
          }}
          centerAction={
            <motion.button
              onClick={() => { sfx.playSuccess(); setShowPixModal(true); }}
              whileTap={{ scale: 0.9 }}
              className="relative flex flex-col items-center justify-center w-[60px] h-[60px] rounded-full"
            >
              <motion.div
                className="absolute inset-[-3px] rounded-full"
                style={{ background: "conic-gradient(from 0deg, #00ff41, #00f0ff, #8b5cf6, #00ff41)", opacity: 0.6 }}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute inset-[-6px] rounded-full"
                animate={{ boxShadow: ["0 0 12px rgba(0,255,65,0.3)", "0 0 28px rgba(0,240,255,0.5)", "0 0 12px rgba(0,255,65,0.3)"] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="relative z-10 bg-gradient-to-br from-[#00ff41] to-[#00f0ff] w-[54px] h-[54px] rounded-full flex flex-col items-center justify-center shadow-[0_0_20px_rgba(0,255,65,0.4)]">
                <QrCode className="w-6 h-6 text-black" />
                <span className="text-black text-[8px] font-black mt-0.5 leading-none">PIX</span>
              </div>
            </motion.button>
          }
        >

          {/* ===================== DASHBOARD ===================== */}
          {activeTab === "dashboard" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard title="Vendas Hoje" value={`R$ ${(metrics.todaySales || 0).toLocaleString()}`} icon={<DollarSign className="w-full h-full" />} color="cyan" trend={{ value: 0, isPositive: true }} />
                <StatCard title="Total Mes" value={`R$ ${(metrics.totalSales || 0).toLocaleString()}`} icon={<ShoppingBag className="w-full h-full" />} color="green" trend={{ value: 0, isPositive: true }} />
                <StatCard title="Clientes" value={String(clientes.length)} icon={<Users className="w-full h-full" />} color="purple" trend={{ value: 0, isPositive: true }} />
                <StatCard title="Motoristas" value={String(motoristas.length)} icon={<Truck className="w-full h-full" />} color="pink" trend={{ value: 0, isPositive: true }} />
              </div>

              {/* Recharts-based dashboard charts */}
              <VendedorDashboardCharts salesData={salesData} metrics={metrics} adminCommissionRate={adminCommissionRate} />
            </motion.div>
          )}

          {/* ===================== CHAT ===================== */}
          {activeTab === "chat" && (
            <VendedorChat
              currentUsername={currentUser.username}
              currentUserName={currentUser.name}
              currentUserPhoto={currentUser.photo}
              clientes={chatContacts.filter((c) => c.role === "cliente")}
              motoristas={chatContacts.filter((c) => c.role === "motorista")}
              onStartCall={handleStartCall}
            />
          )}

          {/* ===================== PEDIDOS ===================== */}
          {activeTab === "pedidos" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Order Stats */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Pendentes", count: orders.filter((o: any) => o.status === "pending").length, color: "#ff9f00", icon: <Clock className="w-3.5 h-3.5" /> },
                  { label: "Aceitos", count: orders.filter((o: any) => o.status === "accepted" || o.status === "preparing").length, color: "#00f0ff", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                  { label: "Entregando", count: orders.filter((o: any) => o.status === "delivering").length, color: "#ff00ff", icon: <Truck className="w-3.5 h-3.5" /> },
                  { label: "Entregues", count: orders.filter((o: any) => o.status === "delivered").length, color: "#00ff41", icon: <Check className="w-3.5 h-3.5" /> },
                ].map((stat) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-[#12121a]/90 border border-[#1f1f2e] rounded-xl p-2.5 text-center"
                  >
                    <div className="flex items-center justify-center mb-1" style={{ color: stat.color }}>{stat.icon}</div>
                    <p className="text-white font-bold text-lg" style={{ textShadow: `0 0 8px ${stat.color}30` }}>{stat.count}</p>
                    <p className="text-gray-500 text-[9px] uppercase tracking-wider">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Pending Orders (need attention) */}
              {orders.filter((o: any) => o.status === "pending").length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                      <Clock className="w-4 h-4 text-[#ff9f00]" />
                    </motion.div>
                    <h3 className="text-white font-bold text-sm">Novos Pedidos</h3>
                    <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                      className="ml-auto px-2 py-0.5 bg-[#ff9f00]/20 text-[#ff9f00] rounded-full text-[10px] font-bold">
                      {orders.filter((o: any) => o.status === "pending").length}
                    </motion.span>
                  </div>
                  <div className="space-y-2.5">
                    {orders.filter((o: any) => o.status === "pending").map((order: any, idx: number) => (
                      <motion.div key={order.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                        className="relative overflow-hidden bg-[#12121a]/90 border border-[#ff9f00]/30 rounded-2xl shadow-[0_0_20px_rgba(255,159,0,0.06)]"
                      >
                        <motion.div className="absolute top-0 left-0 right-0 h-[2px]"
                          style={{ background: "linear-gradient(90deg, transparent, #ff9f00, transparent)" }}
                          animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
                        />
                        <div className="p-3.5">
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-[#ff9f00]/15 flex items-center justify-center">
                                <ShoppingBag className="w-4 h-4 text-[#ff9f00]" />
                              </div>
                              <div>
                                <p className="text-white font-bold text-sm">#{order.id.slice(-6).toUpperCase()}</p>
                                <p className="text-gray-400 text-[10px]">@{order.clientUsername}</p>
                              </div>
                            </div>
                            <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                              className="px-2.5 py-1 bg-[#ff9f00]/15 rounded-full flex items-center gap-1"
                            >
                              <Clock className="w-3 h-3 text-[#ff9f00]" />
                              <span className="text-[#ff9f00] font-bold text-[10px]">NOVO</span>
                            </motion.div>
                          </div>
                          {order.deliveryAddress && (
                            <div className="flex items-start gap-1.5 mb-2.5 px-1">
                              <Users className="w-3.5 h-3.5 text-[#8b5cf6] shrink-0 mt-0.5" />
                              <span className="text-gray-300 text-[11px] leading-tight">{order.deliveryAddress}</span>
                            </div>
                          )}
                          <div className="bg-[#0a0a12]/60 rounded-xl p-2.5 mb-2.5">
                            {order.items?.map((item: any, i: number) => (
                              <div key={i} className="flex justify-between text-[11px] py-0.5">
                                <span className="text-gray-300 truncate mr-2">{item.name} x{item.qty || 1}</span>
                                <span className="text-white font-medium shrink-0">R$ {(Number(item.price) * (item.qty || 1)).toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between border-t border-[#1f1f2e]/60 pt-1.5 mt-1.5">
                              <span className="text-gray-400 text-[11px] font-medium">Total</span>
                              <span className="text-white font-bold text-xs">R$ {(order.total || 0).toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <motion.button whileTap={{ scale: 0.95 }}
                              onClick={() => handleUpdateOrderStatus(order, "cancelled")}
                              className="flex-1 py-2.5 rounded-xl bg-[#ff006e]/10 text-[#ff006e] font-semibold text-xs border border-[#ff006e]/20 hover:bg-[#ff006e]/20 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <X className="w-3.5 h-3.5" /> Recusar
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.95 }}
                              onClick={() => handleUpdateOrderStatus(order, "accepted")}
                              className="flex-1 py-2.5 rounded-xl text-black font-bold text-xs flex items-center justify-center gap-1.5"
                              style={{ background: "linear-gradient(135deg, #00ff41, #00f0ff)", boxShadow: "0 0 20px rgba(0,255,65,0.3)" }}
                            >
                              <Check className="w-3.5 h-3.5" /> Aceitar
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Orders (accepted, preparing, delivering) */}
              {orders.filter((o: any) => ["accepted", "preparing", "delivering"].includes(o.status)).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-[#00f0ff]" />
                    <h3 className="text-white font-bold text-sm">Em Andamento</h3>
                    <span className="ml-auto px-2 py-0.5 bg-[#00f0ff]/20 text-[#00f0ff] rounded-full text-[10px] font-bold">
                      {orders.filter((o: any) => ["accepted", "preparing", "delivering", "driver_accepted", "on_the_way"].includes(o.status)).length}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {orders.filter((o: any) => ["accepted", "preparing", "delivering", "driver_accepted", "on_the_way"].includes(o.status)).map((order: any) => {
                      const statusInfo = statusLabels[order.status] || { label: order.status, color: "#888" };
                      const statusSteps = ["accepted", "preparing", "delivering", "driver_accepted", "on_the_way", "delivered"];
                      const currentStepIdx = statusSteps.indexOf(order.status);
                      const nextStatus = currentStepIdx >= 0 && currentStepIdx < statusSteps.length - 1 ? statusSteps[currentStepIdx + 1] : null;
                      const nextLabel = nextStatus ? (statusLabels[nextStatus]?.label || nextStatus) : null;

                      return (
                        <GlowCard key={order.id} glowColor={statusInfo.color}>
                          <div className="p-3.5">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${statusInfo.color}15` }}>
                                  {["delivering", "driver_accepted", "on_the_way"].includes(order.status) ? <Truck className="w-4 h-4" style={{ color: statusInfo.color }} /> : <ShoppingBag className="w-4 h-4" style={{ color: statusInfo.color }} />}
                                </div>
                                <div>
                                  <p className="text-white font-bold text-sm">#{order.id.slice(-6).toUpperCase()}</p>
                                  <p className="text-gray-400 text-[10px]">@{order.clientUsername}</p>
                                </div>
                              </div>
                              <motion.span
                                className="px-2.5 py-1 rounded-full font-bold text-[10px] border"
                                style={{ color: statusInfo.color, backgroundColor: `${statusInfo.color}15`, borderColor: `${statusInfo.color}30` }}
                                animate={{ boxShadow: [`0 0 4px ${statusInfo.color}00`, `0 0 10px ${statusInfo.color}30`, `0 0 4px ${statusInfo.color}00`] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                {statusInfo.label.toUpperCase()}
                              </motion.span>
                            </div>

                            {/* Progress Steps */}
                            <div className="flex items-center gap-1 mb-3 px-1">
                              {statusSteps.map((step, i) => {
                                const isActive = statusSteps.indexOf(order.status) >= i;
                                const stepColor = isActive ? statusInfo.color : "#1f1f2e";
                                return (
                                  <div key={step} className="flex items-center flex-1">
                                    <motion.div
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{ backgroundColor: stepColor }}
                                      animate={statusSteps.indexOf(order.status) === i ? { scale: [1, 1.4, 1] } : {}}
                                      transition={{ duration: 1.5, repeat: Infinity }}
                                    />
                                    {i < statusSteps.length - 1 && (
                                      <div className="flex-1 h-0.5 mx-0.5 rounded" style={{ backgroundColor: statusSteps.indexOf(order.status) > i ? statusInfo.color : "#1f1f2e" }} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Order Items Summary */}
                            <div className="bg-[#0a0a12]/60 rounded-lg p-2 mb-2.5">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-gray-400">{order.items?.length || 0} item(ns)</span>
                                <span className="text-white font-bold">R$ {(order.total || 0).toFixed(2)}</span>
                              </div>
                              {order.driverUsername && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Truck className="w-3 h-3 text-[#ff00ff]" />
                                  <span className="text-[#ff00ff] text-[10px] font-medium">@{order.driverUsername}</span>
                                </div>
                              )}
                            </div>

                            {/* Next Status Button - only show actionable buttons for vendor */}
                            {nextStatus && ["preparing", "delivering"].includes(nextStatus) && (
                              <motion.button whileTap={{ scale: 0.95 }}
                                onClick={() => handleUpdateOrderStatus(order, nextStatus)}
                                className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                                style={{
                                  background: `linear-gradient(135deg, ${statusInfo.color}, #8b5cf6)`,
                                  color: "#fff",
                                  boxShadow: `0 0 15px ${statusInfo.color}20`,
                                }}
                              >
                                {nextStatus === "preparing" && <><Package className="w-3.5 h-3.5" /> Preparar Pedido</>}
                                {nextStatus === "delivering" && <><Truck className="w-3.5 h-3.5" /> Enviar para Entrega</>}
                              </motion.button>
                            )}
                            {/* Informational status badges for driver-controlled steps */}
                            {["delivering", "driver_accepted", "on_the_way"].includes(order.status) && (
                              <div className="w-full py-2 rounded-xl text-[10px] font-medium text-center flex items-center justify-center gap-1.5 border"
                                style={{ borderColor: `${statusInfo.color}30`, color: statusInfo.color, background: `${statusInfo.color}08` }}>
                                {order.status === "delivering" && <><Loader2 className="w-3 h-3 animate-spin" /> Aguardando motorista aceitar</>}
                                {order.status === "driver_accepted" && <><Check className="w-3 h-3" /> Motorista aceitou - Conversando com cliente</>}
                                {order.status === "on_the_way" && <><Navigation className="w-3 h-3" /> Motorista a caminho da entrega</>}
                              </div>
                            )}
                          </div>
                        </GlowCard>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Completed/Cancelled Orders */}
              {orders.filter((o: any) => ["delivered", "cancelled"].includes(o.status)).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-gray-500" />
                    <h3 className="text-gray-400 font-bold text-sm">Finalizados</h3>
                    <span className="ml-auto text-gray-600 text-[10px]">
                      {orders.filter((o: any) => ["delivered", "cancelled"].includes(o.status)).length} pedido(s)
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {orders.filter((o: any) => ["delivered", "cancelled"].includes(o.status)).slice(0, 10).map((order: any) => {
                      const isCancelled = order.status === "cancelled";
                      return (
                        <div key={order.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isCancelled ? "bg-[#ff006e]/5 border-[#ff006e]/15" : "bg-[#00ff41]/5 border-[#00ff41]/15"}`}>
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isCancelled ? "bg-[#ff006e]/15" : "bg-[#00ff41]/15"}`}>
                            {isCancelled ? <X className="w-3.5 h-3.5 text-[#ff006e]" /> : <Check className="w-3.5 h-3.5 text-[#00ff41]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-xs">#{order.id.slice(-6).toUpperCase()}</p>
                            <p className="text-gray-500 text-[10px]">@{order.clientUsername}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-bold text-xs">R$ {(order.total || 0).toFixed(2)}</p>
                            <p className={`text-[10px] font-medium ${isCancelled ? "text-[#ff006e]" : "text-[#00ff41]"}`}>
                              {isCancelled ? "Cancelado" : "Entregue"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {orders.length === 0 && (
                <GlowCard>
                  <div className="p-8 text-center">
                    <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 3, repeat: Infinity }}>
                      <ClipboardList className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                    </motion.div>
                    <p className="text-gray-500 text-sm">Nenhum pedido ainda</p>
                    <p className="text-gray-600 text-[10px] mt-1">Os pedidos dos seus clientes aparecerao aqui</p>
                  </div>
                </GlowCard>
              )}
            </motion.div>
          )}

          {/* ===================== PRODUTOS ===================== */}
          {activeTab === "produtos" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-white font-bold text-lg"><NeonText>Produtos ({produtos.length})</NeonText></h2>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowProductModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 font-semibold text-white text-xs rounded-xl transition-all"
                  style={{ background: "linear-gradient(135deg, #00f0ff 0%, #8b5cf6 100%)" }}
                >
                  <Plus className="w-3.5 h-3.5" /> Novo
                </motion.button>
              </div>

              {produtos.length === 0 ? (
                <GlowCard>
                  <div className="p-8 text-center">
                    <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 3, repeat: Infinity }}>
                      <Package className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                    </motion.div>
                    <p className="text-gray-500 text-sm">Nenhum produto</p>
                    <p className="text-gray-600 text-[10px] mt-1">Clique em "Novo" para adicionar</p>
                  </div>
                </GlowCard>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {produtos.map((p) => (
                    <GlowCard key={p.id}>
                      <div className="p-4 group">
                        <div className="w-full h-24 bg-gradient-to-br from-[#00f0ff]/10 to-[#8b5cf6]/10 rounded-lg mb-3 flex items-center justify-center border border-[#1f1f2e]/30">
                          <Package className="w-9 h-9 text-[#00f0ff]/40" />
                        </div>
                        <h3 className="text-white font-bold text-sm mb-0.5 truncate">{p.name}</h3>
                        <p className="text-gray-500 text-xs line-clamp-2 mb-2">{p.description || "Sem descricao"}</p>
                        <div className="flex items-center justify-between">
                          <NeonText color="#00ff41" className="font-bold text-lg">R$ {Number(p.price).toFixed(2)}</NeonText>
                          <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleDeleteProduct(p.id)}
                            className="p-1.5 bg-[#ff006e]/10 text-[#ff006e] rounded-lg hover:bg-[#ff006e]/20 transition-colors opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </motion.button>
                        </div>
                      </div>
                    </GlowCard>
                  ))}
                </div>
              )}

              {/* Product Modal */}
              <AnimatePresence>
                {showProductModal && (
                  <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-3">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                      className="relative max-w-md w-full">
                      <motion.div className="absolute inset-0 rounded-2xl p-[1px]"
                        style={{ background: "conic-gradient(from 0deg, #00f0ff30, transparent, #8b5cf630, transparent)" }}
                        animate={{ rotate: [0, 360] }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      />
                      <div className="relative bg-[#0c0c14] border border-[#1f1f2e]/50 rounded-2xl p-5 m-[1px]">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-white font-bold text-lg"><NeonText>Novo Produto</NeonText></h3>
                          <button onClick={() => setShowProductModal(false)} className="p-1.5 hover:bg-[#1f1f2e] rounded-lg text-gray-500"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Nome</label>
                            <input type="text" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                              className="w-full px-3 py-2.5 bg-[#0a0a12] border border-[#1f1f2e] rounded-xl text-white text-sm focus:outline-none focus:border-[#00f0ff]/50 transition-all placeholder-gray-600" placeholder="Nome do produto" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Descricao</label>
                            <textarea value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                              className="w-full px-3 py-2.5 bg-[#0a0a12] border border-[#1f1f2e] rounded-xl text-white text-sm focus:outline-none focus:border-[#00f0ff]/50 resize-none transition-all placeholder-gray-600" rows={2} placeholder="Descricao" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Valor (R$)</label>
                            <input type="number" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                              className="w-full px-3 py-2.5 bg-[#0a0a12] border border-[#1f1f2e] rounded-xl text-white text-sm focus:outline-none focus:border-[#00f0ff]/50 transition-all placeholder-gray-600" placeholder="0,00" step="0.01" />
                          </div>
                          <motion.button whileTap={{ scale: 0.97 }} onClick={handleAddProduct}
                            className="w-full py-3 font-bold text-white text-sm rounded-xl transition-all"
                            style={{ background: "linear-gradient(135deg, #00f0ff 0%, #8b5cf6 100%)" }}
                          >Adicionar Produto</motion.button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ===================== RELATORIOS ===================== */}
          {activeTab === "relatorios" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard title="Valor Total" value={`R$ ${(metrics.totalSales || 0).toLocaleString()}`} icon={<DollarSign className="w-full h-full" />} color="cyan" />
                <StatCard title={`Taxa Admin (${adminCommissionRate}%)`} value={`R$ ${(metrics.adminTax || 0).toLocaleString()}`} icon={<TrendingUp className="w-full h-full" />} color="pink" />
                <StatCard title="Produtos" value={String(metrics.totalProducts || 0)} icon={<Package className="w-full h-full" />} color="purple" />
                <StatCard title="Liquido" value={`R$ ${(metrics.netSales || 0).toLocaleString()}`} icon={<Wallet className="w-full h-full" />} color="green" />
              </div>

              <GlowCard>
                <div className="p-4">
                  <h3 className="text-white font-bold text-base mb-3"><NeonText>Historico de Vendas</NeonText></h3>
                  {salesData.length > 0 ? (
                    <div className="h-[200px] flex items-end gap-2">
                      {salesData.map((d, i) => {
                        const max = Math.max(1, ...salesData.map((x) => x.vendas));
                        return (
                          <div key={d.name} className="flex-1 flex flex-col items-center gap-0.5">
                            <div className="w-full flex justify-center" style={{ height: "85%" }}>
                              <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(6, (d.vendas / max) * 100)}%` }}
                                transition={{ duration: 0.5, delay: i * 0.08 }}
                                className="w-full max-w-[32px] rounded-t-md relative group"
                                style={{ background: "linear-gradient(to top, #00f0ff40, #00f0ff)" }}
                              >
                                <motion.div className="absolute inset-0 rounded-t-md"
                                  animate={{ boxShadow: ["0 0 3px rgba(0,240,255,0.2)", "0 0 8px rgba(0,240,255,0.4)", "0 0 3px rgba(0,240,255,0.2)"] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                />
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[#00f0ff] text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">R${d.vendas}</div>
                              </motion.div>
                            </div>
                            <span className="text-gray-600 text-[10px]">{d.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-gray-600 text-xs">Sem dados</div>
                  )}
                </div>
              </GlowCard>
            </motion.div>
          )}

          {/* ===================== CONVITES ===================== */}
          {activeTab === "convite" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              {/* Info */}
              <GlowCard glowColor="#8b5cf6">
                <div className="p-4">
                  <p className="text-[#00f0ff] text-xs font-medium mb-2">Como funciona:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {["Gere codigo", "Envie para cadastro", "Codigo vira invalido", "Usuario vinculado"].map((t, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <motion.span className="w-4 h-4 shrink-0 rounded-full bg-[#00f0ff]/15 text-[#00f0ff] text-[8px] flex items-center justify-center font-bold mt-0.5"
                          animate={{ boxShadow: [`0 0 3px rgba(0,240,255,0)`, `0 0 6px rgba(0,240,255,0.3)`, `0 0 3px rgba(0,240,255,0)`] }}
                          transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                        >{i + 1}</motion.span>
                        <span className="text-gray-400 text-[11px] leading-tight">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </GlowCard>

              {/* Generate buttons */}
              <div className="grid grid-cols-2 gap-3">
                <GlowCard>
                  <div className="p-4">
                    <h2 className="text-white font-bold text-sm mb-1"><NeonText>Codigo Cliente</NeonText></h2>
                    <p className="text-gray-500 text-xs mb-3">Vinculado a voce</p>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleGenerateCode("cliente")}
                      className="w-full py-2.5 font-bold text-white text-xs rounded-xl flex items-center justify-center gap-1.5"
                      style={{ background: "linear-gradient(135deg, #00f0ff 0%, #8b5cf6 100%)" }}
                    >
                      {copied && String(copied).startsWith("C-") ? <><Check className="w-3 h-3" /> Copiado!</> : <><Zap className="w-3 h-3" /> Gerar</>}
                    </motion.button>
                  </div>
                </GlowCard>
                <GlowCard glowColor="#ff00ff">
                  <div className="p-4">
                    <h2 className="text-white font-bold text-sm mb-1"><NeonText color="#ff00ff">Codigo Motorista</NeonText></h2>
                    <p className="text-gray-500 text-xs mb-3">Vinculado a voce</p>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleGenerateCode("motorista")}
                      className="w-full py-2.5 font-bold text-white text-xs rounded-xl flex items-center justify-center gap-1.5"
                      style={{ background: "linear-gradient(135deg, #ff00ff 0%, #8b5cf6 100%)" }}
                    >
                      {copied && String(copied).startsWith("M-") ? <><Check className="w-3 h-3" /> Copiado!</> : <><Zap className="w-3 h-3" /> Gerar</>}
                    </motion.button>
                  </div>
                </GlowCard>
              </div>

              {/* Client codes */}
              <GlowCard>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#00f0ff]" /> Cliente ({generatedCodesCliente.length})
                    </h3>
                    <div className="flex gap-2 text-[11px]">
                      <span className="text-[#00ff41]">{generatedCodesCliente.filter((c) => c.used).length} usados</span>
                      <span className="text-[#ff9f00]">{generatedCodesCliente.filter((c) => !c.used).length} disp</span>
                    </div>
                  </div>
                  {generatedCodesCliente.length === 0 ? (
                    <p className="text-gray-600 text-center py-3 text-[10px]">Nenhum codigo</p>
                  ) : (
                    <div className="space-y-1.5">
                      {generatedCodesCliente.map((item, i) => (
                        <div key={`c-${item.code}-${i}`} className={`flex items-center justify-between p-2.5 rounded-lg border ${item.used ? "bg-[#00ff41]/5 border-[#00ff41]/15" : "bg-[#ff9f00]/5 border-[#ff9f00]/20"}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <motion.div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.used ? "bg-[#00ff41]" : "bg-[#ff9f00]"}`}
                              animate={item.used ? {} : { scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                            <div className="min-w-0">
                              <span className="text-white font-mono text-xs truncate block">{item.code}</span>
                              {item.used && item.usedBy ? <p className="text-[#00ff41] text-[10px]">@{item.usedBy}</p> : <p className="text-[#ff9f00] text-[10px]">Aguardando</p>}
                            </div>
                          </div>
                          {!item.used && (
                            <button onClick={() => copyToClipboard(item.code)} className="p-1 rounded-md hover:bg-[#00f0ff]/10 text-[#00f0ff] shrink-0">
                              {copied === item.code ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </GlowCard>

              {/* Driver codes */}
              <GlowCard glowColor="#ff00ff">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#ff00ff]" /> Motorista ({generatedCodesMotorista.length})
                    </h3>
                    <div className="flex gap-2 text-[11px]">
                      <span className="text-[#00ff41]">{generatedCodesMotorista.filter((c) => c.used).length} usados</span>
                      <span className="text-[#ff9f00]">{generatedCodesMotorista.filter((c) => !c.used).length} disp</span>
                    </div>
                  </div>
                  {generatedCodesMotorista.length === 0 ? (
                    <p className="text-gray-600 text-center py-3 text-[10px]">Nenhum codigo</p>
                  ) : (
                    <div className="space-y-1.5">
                      {generatedCodesMotorista.map((item, i) => (
                        <div key={`m-${item.code}-${i}`} className={`flex items-center justify-between p-2.5 rounded-lg border ${item.used ? "bg-[#00ff41]/5 border-[#00ff41]/15" : "bg-[#ff9f00]/5 border-[#ff9f00]/20"}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <motion.div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.used ? "bg-[#00ff41]" : "bg-[#ff9f00]"}`}
                              animate={item.used ? {} : { scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                            <div className="min-w-0">
                              <span className="text-white font-mono text-xs truncate block">{item.code}</span>
                              {item.used && item.usedBy ? <p className="text-[#00ff41] text-[10px]">@{item.usedBy}</p> : <p className="text-[#ff9f00] text-[10px]">Aguardando</p>}
                            </div>
                          </div>
                          {!item.used && (
                            <button onClick={() => copyToClipboard(item.code)} className="p-1 rounded-md hover:bg-[#ff00ff]/10 text-[#ff00ff] shrink-0">
                              {copied === item.code ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </GlowCard>
            </motion.div>
          )}

          {/* ===================== RECEBIMENTOS ===================== */}
          {activeTab === "recebimentos" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <GlowCard>
                <div className="p-5">
                  <h2 className="text-white font-bold text-lg mb-1"><NeonText>Recebimentos DEPIX</NeonText></h2>
                  <p className="text-gray-500 text-xs mb-4">Endereco da sua carteira</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Carteira DEPIX</label>
                      <input type="text" placeholder="0x..."
                        className="w-full px-3 py-2.5 bg-[#0a0a12] border border-[#1f1f2e] rounded-xl text-white text-sm focus:outline-none focus:border-[#00f0ff]/50 transition-all placeholder-gray-600" />
                    </div>
                    <motion.button whileTap={{ scale: 0.97 }}
                      className="w-full py-3 font-bold text-white text-sm rounded-xl transition-all"
                      style={{ background: "linear-gradient(135deg, #00f0ff 0%, #8b5cf6 100%)" }}
                    >Salvar</motion.button>
                  </div>
                </div>
              </GlowCard>
            </motion.div>
          )}

          {/* ===================== TAXA MOTORISTA ===================== */}
          {activeTab === "taxa-motorista" && (
            <MotoristaCommissionTab vendorUsername={currentUser.username} motoristas={motoristas} />
          )}

        </SidebarLayout>
      </div>

      {/* ── Driver Selection Modal ── */}
      <AnimatePresence>
        {driverSelectOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[100] flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget && !assigningDriver) setDriverSelectOrder(null); }}
          >
            <motion.div initial={{ scale: 0.85, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.85, opacity: 0, y: 20 }}
              className="relative max-w-sm w-full max-h-[85vh] flex flex-col"
            >
              <motion.div className="absolute inset-0 rounded-2xl p-[1.5px]"
                style={{ background: "conic-gradient(from 0deg, #ff00ff30, transparent, #8b5cf630, transparent)" }}
                animate={{ rotate: [0, 360] }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative bg-[#0a0a12] rounded-2xl border border-[#1f1f2e]/30 overflow-hidden m-[1.5px] flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5">
                    <motion.div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #ff00ff20, #8b5cf620)" }}
                      animate={{ boxShadow: ["0 0 8px rgba(255,0,255,0.1)", "0 0 16px rgba(255,0,255,0.25)", "0 0 8px rgba(255,0,255,0.1)"] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Truck className="w-5 h-5 text-[#ff00ff]" />
                    </motion.div>
                    <div>
                      <h3 className="text-white font-bold text-base">
                        <NeonText color="#ff00ff">Selecionar Motorista</NeonText>
                      </h3>
                      <p className="text-gray-500 text-[11px]">
                        Pedido #{driverSelectOrder.id?.slice(-6).toUpperCase()} — R$ {(driverSelectOrder.total || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {!assigningDriver && (
                    <button onClick={() => setDriverSelectOrder(null)} className="p-1.5 hover:bg-[#1f1f2e] rounded-lg text-gray-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Order summary */}
                <div className="px-5 pb-3 shrink-0">
                  <div className="bg-[#0c0c14] rounded-xl p-3 border border-[#1f1f2e]/40">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-3.5 h-3.5 text-[#00f0ff]" />
                      <span className="text-gray-400 text-[11px] font-medium">Itens do pedido</span>
                    </div>
                    <div className="space-y-1">
                      {driverSelectOrder.items?.slice(0, 4).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-[11px]">
                          <span className="text-gray-300 truncate mr-2">{item.name} x{item.qty || 1}</span>
                          <span className="text-white font-medium shrink-0">R$ {(Number(item.price) * (item.qty || 1)).toFixed(2)}</span>
                        </div>
                      ))}
                      {(driverSelectOrder.items?.length || 0) > 4 && (
                        <p className="text-gray-600 text-[10px]">+{driverSelectOrder.items.length - 4} mais...</p>
                      )}
                    </div>
                    <div className="flex justify-between border-t border-[#1f1f2e]/60 pt-1.5 mt-1.5">
                      <span className="text-gray-400 text-[11px] font-medium">Total</span>
                      <span className="text-white font-bold text-xs">R$ {(driverSelectOrder.total || 0).toFixed(2)}</span>
                    </div>
                    {driverSelectOrder.clientUsername && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Users className="w-3 h-3 text-[#00f0ff]" />
                        <span className="text-[#00f0ff] text-[10px] font-medium">@{driverSelectOrder.clientUsername}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Driver list */}
                <div className="flex-1 overflow-y-auto px-5 pb-5">
                  <p className="text-gray-400 text-xs font-medium mb-2 flex items-center gap-1.5">
                    <Truck className="w-3 h-3 text-[#ff00ff]" />
                    Motoristas disponíveis ({motoristas.length})
                  </p>

                  {motoristas.length === 0 ? (
                    <div className="py-8 text-center">
                      <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 3, repeat: Infinity }}>
                        <Truck className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                      </motion.div>
                      <p className="text-gray-500 text-sm">Nenhum motorista vinculado</p>
                      <p className="text-gray-600 text-[10px] mt-1">Gere um código de convite para motoristas</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Online drivers first */}
                      {[...motoristas].sort((a: any, b: any) => {
                        const aOnline = driverPresence[a.username] ? 1 : 0;
                        const bOnline = driverPresence[b.username] ? 1 : 0;
                        return bOnline - aOnline;
                      }).map((driver: any) => {
                        const isOnlineDriver = driverPresence[driver.username];
                        const isAssigning = assigningDriver === driver.username;
                        return (
                          <motion.div key={driver.username}
                            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                            className={`relative overflow-hidden rounded-xl border transition-all ${
                              isOnlineDriver
                                ? "bg-[#ff00ff]/5 border-[#ff00ff]/20 hover:border-[#ff00ff]/40"
                                : "bg-[#12121a] border-[#1f1f2e]/40 hover:border-[#1f1f2e]"
                            }`}
                          >
                            <div className="p-3 flex items-center gap-3">
                              {/* Avatar */}
                              <div className="relative shrink-0">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff00ff]/20 to-[#8b5cf6]/15 flex items-center justify-center overflow-hidden">
                                  {driver.photo ? (
                                    <img src={driver.photo} alt={driver.name} className="w-full h-full object-cover rounded-full" />
                                  ) : (
                                    <span className="text-white font-bold text-sm">{(driver.name || driver.username || "?").charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                <motion.div
                                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0a12] ${isOnlineDriver ? "bg-[#00ff41]" : "bg-gray-600"}`}
                                  animate={isOnlineDriver ? { scale: [1, 1.3, 1], boxShadow: ["0 0 3px rgba(0,255,65,0.5)", "0 0 8px rgba(0,255,65,0.8)", "0 0 3px rgba(0,255,65,0.5)"] } : {}}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                />
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-bold text-sm truncate">{driver.name || driver.username}</p>
                                <p className="text-gray-500 text-[10px] truncate">@{driver.username}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {isOnlineDriver ? (
                                    <>
                                      <motion.div className="w-1.5 h-1.5 rounded-full bg-[#00ff41]"
                                        animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                                      />
                                      <span className="text-[#00ff41] text-[10px] font-medium">Online</span>
                                    </>
                                  ) : (
                                    <>
                                      <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                                      <span className="text-gray-600 text-[10px] font-medium">Offline</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Assign button */}
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleAssignDriverAndDeliver(driver.username)}
                                disabled={!!assigningDriver}
                                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 ${
                                  isAssigning
                                    ? "bg-[#1f1f2e] text-gray-500"
                                    : isOnlineDriver
                                      ? "text-white shadow-[0_0_15px_rgba(255,0,255,0.2)]"
                                      : "bg-[#1f1f2e] text-gray-300 hover:bg-[#2a2a3e]"
                                }`}
                                style={!isAssigning && isOnlineDriver ? { background: "linear-gradient(135deg, #ff00ff, #8b5cf6)" } : undefined}
                              >
                                {isAssigning ? (
                                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="w-3.5 h-3.5 border-2 border-gray-600 border-t-[#ff00ff] rounded-full"
                                  />
                                ) : (
                                  <>
                                    <Send className="w-3 h-3" />
                                    Atribuir
                                  </>
                                )}
                              </motion.button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* Skip driver option */}
                  {motoristas.length > 0 && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        // Send to delivery without assigning a driver
                        const order = driverSelectOrder;
                        setDriverSelectOrder(null);
                        api.updateOrderStatus(order.id, { status: "delivering", vendorUsername: order.vendorUsername, clientUsername: order.clientUsername }).then(() => {
                          notif.notifyOrderStatus("delivering", order.id);
                          setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "delivering", updatedAt: new Date().toISOString() } : o)));
                        }).catch((e: any) => alert("Erro: " + e.message));
                      }}
                      disabled={!!assigningDriver}
                      className="w-full mt-3 py-2.5 bg-[#1f1f2e]/60 text-gray-500 rounded-xl text-[11px] font-medium hover:text-gray-300 hover:bg-[#1f1f2e] transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                    >
                      <Truck className="w-3 h-3" />
                      Enviar sem atribuir motorista
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PIX Generation Modal ── */}
      <AnimatePresence>
        {showPixModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[100] flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget && pixStatus !== "waiting") handleClosePixModal(); }}
          >
            <motion.div initial={{ scale: 0.85, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.85, opacity: 0, y: 20 }}
              className="relative max-w-sm w-full"
            >
              {/* Rotating border */}
              <motion.div className="absolute inset-0 rounded-2xl p-[1.5px]"
                style={{ background: pixStatus === "paid" ? "conic-gradient(from 0deg, #00ff41, #00f0ff, #00ff41)" : "conic-gradient(from 0deg, #00f0ff, #8b5cf6, #ff00ff, #00f0ff)" }}
                animate={{ rotate: [0, 360] }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative bg-[#0a0a12] rounded-2xl border border-[#1f1f2e]/30 overflow-hidden m-[1.5px]">
                {/* Header */}
                <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <motion.div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #00ff4120, #00f0ff20)" }}
                      animate={{ boxShadow: ["0 0 8px rgba(0,255,65,0.1)", "0 0 16px rgba(0,255,65,0.25)", "0 0 8px rgba(0,255,65,0.1)"] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <QrCode className="w-5 h-5 text-[#00ff41]" />
                    </motion.div>
                    <div>
                      <h3 className="text-white font-bold text-base">
                        <NeonText color={pixStatus === "paid" ? "#00ff41" : "#00f0ff"}>
                          {pixStatus === "paid" ? "Pagamento Confirmado!" : pixStatus === "waiting" ? "Aguardando PIX" : "Gerar PIX"}
                        </NeonText>
                      </h3>
                      <p className="text-gray-500 text-[11px]">
                        {pixStatus === "paid" ? "Valor adicionado as suas vendas" : pixStatus === "waiting" ? "Escaneie o QR Code" : "Defina o valor da cobranca"}
                      </p>
                    </div>
                  </div>
                  {pixStatus !== "waiting" && (
                    <button onClick={handleClosePixModal} className="p-1.5 hover:bg-[#1f1f2e] rounded-lg text-gray-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="px-5 pb-5">
                  {/* IDLE / INPUT STATE */}
                  {(pixStatus === "idle" || pixStatus === "generating" || pixStatus === "error") && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Valor (R$)</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00ff41]/60" />
                          <input
                            type="text" inputMode="decimal" value={pixAmount}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9.,]/g, "");
                              setPixAmount(v);
                            }}
                            placeholder="0,00"
                            className="w-full pl-9 pr-3 py-3 bg-[#0c0c14] border border-[#1f1f2e] rounded-xl text-white text-lg font-bold focus:outline-none focus:border-[#00ff41]/50 transition-all placeholder-gray-700"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Descricao (opcional)</label>
                        <input
                          type="text" value={pixDescription}
                          onChange={(e) => setPixDescription(e.target.value)}
                          placeholder="Ex: Venda balcao, produto X..."
                          className="w-full px-3 py-2.5 bg-[#0c0c14] border border-[#1f1f2e] rounded-xl text-white text-sm focus:outline-none focus:border-[#00f0ff]/50 transition-all placeholder-gray-600"
                        />
                      </div>

                      {/* Quick amount buttons */}
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Valor rapido</label>
                        <div className="grid grid-cols-4 gap-2">
                          {[10, 25, 50, 100].map((v) => (
                            <motion.button key={v} whileTap={{ scale: 0.93 }}
                              onClick={() => setPixAmount(String(v))}
                              className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                                pixAmount === String(v)
                                  ? "bg-[#00ff41]/15 text-[#00ff41] border-[#00ff41]/30"
                                  : "bg-[#0c0c14] text-gray-400 border-[#1f1f2e] hover:border-[#00f0ff]/30 hover:text-white"
                              }`}
                            >
                              R${v}
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      {/* Commission Breakdown */}
                      {(() => {
                        const val = parseFloat((pixAmount || "0").replace(",", "."));
                        if (!val || val <= 0) return null;
                        const taxaAdmin = parseFloat((val * (adminCommissionRate / 100)).toFixed(2));
                        const totalTaxas = parseFloat((taxaAdmin + FIXED_FEE).toFixed(2));
                        const liquido = parseFloat((val - totalTaxas).toFixed(2));
                        const belowMinimum = val < MIN_PIX_AMOUNT;
                        return (
                          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-xl p-[1px]">
                            <motion.div className="absolute inset-0 rounded-xl"
                              style={{ background: "conic-gradient(from 0deg, #00ff4130, #00f0ff30, #8b5cf630, #00ff4130)" }}
                              animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            />
                            <div className="relative bg-[#0a0a12] rounded-xl p-3.5 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400 text-xs">Valor do PIX</span>
                                <span className="text-white font-bold text-sm">R$ {val.toFixed(2)}</span>
                              </div>
                              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#1f1f2e]/50 to-transparent" />
                              <div className="flex items-center justify-between">
                                <span className="text-[#ff006e] text-xs flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" /> Taxa Admin ({adminCommissionRate}%)
                                </span>
                                <span className="text-[#ff006e] font-bold text-sm">- R$ {taxaAdmin.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[#ff9f00] text-xs flex items-center gap-1">
                                  <Zap className="w-3 h-3" /> Taxa fixa
                                </span>
                                <span className="text-[#ff9f00] font-bold text-sm">- R$ {FIXED_FEE.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-[10px]">Total descontos</span>
                                <span className="text-gray-400 font-bold text-xs">- R$ {totalTaxas.toFixed(2)}</span>
                              </div>
                              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#1f1f2e] to-transparent" />
                              <div className="flex items-center justify-between">
                                <span className="text-[#00ff41] text-xs font-semibold flex items-center gap-1">
                                  <Wallet className="w-3 h-3" /> Voce recebe
                                </span>
                                <motion.span
                                  className="font-black text-lg"
                                  style={{ color: liquido > 0 ? "#00ff41" : "#ff006e", textShadow: `0 0 12px ${liquido > 0 ? "rgba(0,255,65,0.4)" : "rgba(255,0,110,0.4)"}` }}
                                  animate={{ textShadow: liquido > 0 ? ["0 0 8px rgba(0,255,65,0.3)", "0 0 16px rgba(0,255,65,0.6)", "0 0 8px rgba(0,255,65,0.3)"] : ["0 0 8px rgba(255,0,110,0.3)", "0 0 16px rgba(255,0,110,0.6)", "0 0 8px rgba(255,0,110,0.3)"] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                >
                                  R$ {liquido.toFixed(2)}
                                </motion.span>
                              </div>
                              {belowMinimum && (
                                <p className="text-[#ff9f00] text-[10px] text-center mt-1 flex items-center justify-center gap-1">
                                  <Zap className="w-3 h-3" /> Valor minimo do PIX: R$ {MIN_PIX_AMOUNT.toFixed(2)}
                                </p>
                              )}
                              {!belowMinimum && liquido <= 0 && (
                                <p className="text-[#ff006e] text-[10px] text-center mt-1">Valor muito baixo apos taxas</p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })()}

                      {pixError && (
                        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-[#ff006e]/10 border border-[#ff006e]/20 rounded-xl"
                        >
                          <p className="text-[#ff006e] text-xs">{pixError}</p>
                        </motion.div>
                      )}

                      <motion.button whileTap={{ scale: 0.97 }} onClick={handleGeneratePix}
                        disabled={pixGenerating || !pixAmount || parseFloat(pixAmount.replace(",", ".")) < MIN_PIX_AMOUNT}
                        className="w-full py-3.5 font-bold text-sm rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{ background: pixGenerating ? "#1f1f2e" : "linear-gradient(135deg, #00ff41 0%, #00f0ff 100%)", color: pixGenerating ? "#888" : "#000" }}
                      >
                        {pixGenerating ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Gerando PIX...</>
                        ) : (
                          <><QrCode className="w-4 h-4" /> Gerar QR Code PIX</>
                        )}
                      </motion.button>
                    </div>
                  )}

                  {/* WAITING STATE - QR Code */}
                  {pixStatus === "waiting" && pixInvoice && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                      {/* Amount display with commission info */}
                      {(() => {
                        const val = parseFloat(pixAmount.replace(",", "."));
                        const taxaAdmin = parseFloat((val * (adminCommissionRate / 100)).toFixed(2));
                        const totalTaxas = parseFloat((taxaAdmin + FIXED_FEE).toFixed(2));
                        const liquido = parseFloat((val - totalTaxas).toFixed(2));
                        return (
                          <div className="space-y-2">
                            <div className="text-center">
                              <NeonText color="#00f0ff" className="text-2xl font-black">
                                R$ {val.toFixed(2)}
                              </NeonText>
                              <p className="text-[10px] text-gray-500 mt-0.5">Valor do PIX</p>
                            </div>
                            <div className="bg-[#0a0a12] rounded-xl p-3 border border-[#1f1f2e]/40 space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-[#ff006e]">Taxa Admin ({adminCommissionRate}%)</span>
                                <span className="text-[#ff006e] font-semibold">- R$ {taxaAdmin.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-[#ff9f00]">Taxa fixa</span>
                                <span className="text-[#ff9f00] font-semibold">- R$ {FIXED_FEE.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-[10px]">
                                <span className="text-gray-500">Total descontos</span>
                                <span className="text-gray-400 font-semibold">- R$ {totalTaxas.toFixed(2)}</span>
                              </div>
                              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#1f1f2e] to-transparent" />
                              <div className="flex justify-between text-sm">
                                <span className="text-[#00ff41] font-bold">Voce recebe</span>
                                <span className="text-[#00ff41] font-black">R$ {liquido.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* QR Code area */}
                      <div className="flex justify-center">
                        <motion.div
                          className="relative bg-white rounded-2xl p-3"
                          animate={{ boxShadow: ["0 0 15px rgba(0,255,65,0.15)", "0 0 30px rgba(0,255,65,0.3)", "0 0 15px rgba(0,255,65,0.15)"] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {(pixInvoice.payment?.qrCodeImageUrl || pixInvoice.qrCodeImageUrl) ? (
                            <img src={pixInvoice.payment?.qrCodeImageUrl || pixInvoice.qrCodeImageUrl} alt="QR Code PIX" className="w-48 h-48 rounded-lg" />
                          ) : pixInvoice.qrCode ? (
                            <img src={pixInvoice.qrCode} alt="QR Code PIX" className="w-48 h-48 rounded-lg" />
                          ) : (
                            <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded-lg">
                              <QrCode className="w-16 h-16 text-gray-400" />
                            </div>
                          )}
                          {/* Scanning effect */}
                          <motion.div className="absolute left-3 right-3 h-0.5 bg-[#00ff41]/60"
                            animate={{ top: ["12px", "192px", "12px"] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                          />
                        </motion.div>
                      </div>

                      {/* Copy Paste - PixWave returns brCode in payment.qrCode */}
                      {(pixInvoice.payment?.qrCode || pixInvoice.pixCopiaECola || pixInvoice.brCode) && (() => {
                        const pixCode = pixInvoice.payment?.qrCode || pixInvoice.pixCopiaECola || pixInvoice.brCode;
                        return (
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">PIX Copia e Cola</label>
                            <div className="flex gap-2">
                              <input type="text" readOnly value={pixCode}
                                className="flex-1 px-3 py-2 bg-[#0c0c14] border border-[#1f1f2e] rounded-lg text-white text-[10px] font-mono truncate"
                              />
                              <motion.button whileTap={{ scale: 0.9 }} onClick={() => copyToClipboard(pixCode)}
                                className="px-3 py-2 bg-[#00f0ff]/10 text-[#00f0ff] rounded-lg border border-[#00f0ff]/20 shrink-0"
                              >
                                {copied === pixCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              </motion.button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Payment URL fallback - if no QR code image, show link */}
                      {!(pixInvoice.payment?.qrCodeImageUrl || pixInvoice.qrCodeImageUrl || pixInvoice.qrCode) && (pixInvoice.paymentUrl || pixInvoice.payment?.paymentUrl || pixInvoice.invoiceUrl) && (
                        <a href={pixInvoice.paymentUrl || pixInvoice.payment?.paymentUrl || pixInvoice.invoiceUrl}
                          target="_blank" rel="noopener noreferrer"
                          className="w-full py-3 bg-gradient-to-r from-[#00ff41]/20 to-[#00f0ff]/20 text-[#00f0ff] rounded-xl text-xs font-bold text-center border border-[#00f0ff]/30 block hover:brightness-125 transition-all"
                        >
                          Abrir link de pagamento PIX
                        </a>
                      )}

                      {/* Status indicator */}
                      <div className="flex items-center justify-center gap-2 py-2">
                        <motion.div className="w-2 h-2 rounded-full bg-[#ff9f00]"
                          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        <span className="text-[#ff9f00] text-xs font-medium">Aguardando pagamento...</span>
                      </div>

                      <button onClick={handleClosePixModal}
                        className="w-full py-2.5 bg-[#1f1f2e] text-gray-400 rounded-xl text-xs font-medium hover:text-white transition-colors"
                      >
                        Cancelar
                      </button>
                    </motion.div>
                  )}

                  {/* PAID STATE */}
                  {pixStatus === "paid" && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-4">
                      <motion.div
                        className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, #00ff4120, #00f0ff20)" }}
                        animate={{ scale: [1, 1.1, 1], boxShadow: ["0 0 20px rgba(0,255,65,0.2)", "0 0 40px rgba(0,255,65,0.4)", "0 0 20px rgba(0,255,65,0.2)"] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <CheckCircle2 className="w-10 h-10 text-[#00ff41]" />
                      </motion.div>
                      {(() => {
                        const val = parseFloat(pixAmount.replace(",", "."));
                        const taxaAdmin = parseFloat((val * (adminCommissionRate / 100)).toFixed(2));
                        const totalTaxas = parseFloat((taxaAdmin + FIXED_FEE).toFixed(2));
                        const liquido = parseFloat((val - totalTaxas).toFixed(2));
                        return (
                          <>
                            <div>
                              <NeonText color="#00ff41" className="text-2xl font-black block mb-1">
                                R$ {val.toFixed(2)}
                              </NeonText>
                              <p className="text-gray-400 text-xs">Pagamento confirmado!</p>
                            </div>
                            <div className="bg-[#0a0a12] rounded-xl p-3 border border-[#1f1f2e]/40 text-left space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-[#ff006e]">Taxa Admin ({adminCommissionRate}%)</span>
                                <span className="text-[#ff006e] font-semibold">- R$ {taxaAdmin.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-[#ff9f00]">Taxa fixa</span>
                                <span className="text-[#ff9f00] font-semibold">- R$ {FIXED_FEE.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-[10px]">
                                <span className="text-gray-500">Total descontos</span>
                                <span className="text-gray-400 font-semibold">- R$ {totalTaxas.toFixed(2)}</span>
                              </div>
                              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#1f1f2e] to-transparent" />
                              <div className="flex justify-between text-sm">
                                <span className="text-[#00ff41] font-bold">Voce recebeu</span>
                                <span className="text-[#00ff41] font-black">R$ {liquido.toFixed(2)}</span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </motion.div>
                  )}
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
          />
        )}
      </AnimatePresence>
    </>
  );
}
