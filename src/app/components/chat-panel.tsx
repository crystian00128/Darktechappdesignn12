import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Mic,
  Camera,
  Image as ImageIcon,
  Video,
  Phone,
  Check,
  CheckCheck,
  Play,
  Pause,
  Square,
  X,
  Paperclip,
  ChevronLeft,
  MessageSquare,
  Trash2,
} from "lucide-react";
import * as api from "../services/api";
import * as sfx from "../services/sounds";
import { showLocalNotification } from "../services/pwa";

interface Contact {
  username: string;
  name: string;
  photo: string;
  role: string;
}

interface Message {
  id: string;
  from: string;
  to: string;
  text: string;
  type: string;
  timestamp: string;
  read: boolean;
  mediaId?: string;
  audioUrl?: string;
  audioDuration?: number;
  imageUrl?: string;
}

interface ChatPanelProps {
  currentUsername: string;
  contacts: Contact[];
  accentColor?: string;
  groupedContacts?: { label: string; contacts: Contact[]; gradient: string }[];
  onStartCall?: (to: string, type: "voice" | "video", toName: string) => void;
  autoOpenChat?: string;
}

const getAvatarText = (text: string | null | undefined): string => {
  if (!text || typeof text !== "string") return "??";
  return text.substring(0, 2).toUpperCase();
};

// ─── Audio Waveform Visual ──────────────────────
function AudioWaveform({ playing, color = "#00f0ff" }: { playing: boolean; color?: string }) {
  return (
    <div className="flex items-center gap-[2px] h-6">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[2px] rounded-full"
          style={{ backgroundColor: color }}
          animate={playing ? { height: [4, 12 + Math.random() * 12, 4], opacity: [0.5, 1, 0.5] }
            : { height: 4, opacity: 0.4 }}
          transition={playing ? { duration: 0.4 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.03 } : { duration: 0.3 }}
        />
      ))}
    </div>
  );
}

export function ChatPanel({
  currentUsername,
  contacts,
  accentColor = "#00f0ff",
  groupedContacts,
  onStartCall,
  autoOpenChat,
}: ChatPanelProps) {
  const [selectedChat, setSelectedChat] = useState<string | null>(autoOpenChat || null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [micSimulated, setMicSimulated] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // ─── Presence & Last Messages ────────────────
  const [presenceMap, setPresenceMap] = useState<Record<string, boolean>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, { text: string; type: string; from: string; timestamp: string }>>({});

  // ─── Typing Indicator ───────────────────────
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlCacheRef = useRef<Map<string, string>>(new Map());
  const mediaLoadingRef = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const prevMessageCountRef = useRef<number>(0);

  // ─── Fetch unread counts ─────────────────────
  const loadUnreadCounts = useCallback(async () => {
    try {
      const allUn = [...new Set([...contacts.map(c => c.username), ...(groupedContacts?.flatMap(g => g.contacts.map(c => c.username)) || [])])];
      if (allUn.length === 0) return;
      const res = await api.getUnreadCounts(currentUsername, allUn);
      if (res.success) setUnreadCounts(res.counts || {});
    } catch {}
  }, [currentUsername, contacts, groupedContacts]);

  useEffect(() => {
    loadUnreadCounts();
    const interval = setInterval(loadUnreadCounts, 5000);
    return () => clearInterval(interval);
  }, [loadUnreadCounts]);

  // ─── Heartbeat & Presence Polling ────────────
  const allContactUsernames = contacts.map(c => c.username);
  const groupedContactUsernames = groupedContacts?.flatMap(g => g.contacts.map(c => c.username)) || [];
  const allUsernames = [...new Set([...allContactUsernames, ...groupedContactUsernames])];

  useEffect(() => {
    if (!currentUsername) return;
    // Send heartbeat immediately then every 15s
    api.sendHeartbeat(currentUsername).catch(() => {});
    const hbInterval = setInterval(() => {
      api.sendHeartbeat(currentUsername).catch(() => {});
    }, 15000);
    return () => clearInterval(hbInterval);
  }, [currentUsername]);

  useEffect(() => {
    if (allUsernames.length === 0) return;
    const loadPresence = async () => {
      try {
        const res = await api.checkPresence(allUsernames);
        if (res.success) setPresenceMap(res.presence || {});
      } catch {}
    };
    loadPresence();
    const interval = setInterval(loadPresence, 10000);
    return () => clearInterval(interval);
  }, [allUsernames.join(",")]);

  // ─── Last Messages Polling ───────────────────
  useEffect(() => {
    if (allUsernames.length === 0) return;
    const loadLastMsgs = async () => {
      try {
        const res = await api.getChatLastMessages(currentUsername, allUsernames);
        if (res.success) setLastMessages(res.lastMessages || {});
      } catch {}
    };
    loadLastMsgs();
    const interval = setInterval(loadLastMsgs, 8000);
    return () => clearInterval(interval);
  }, [currentUsername, allUsernames.join(",")]);

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

  // Clear unread for selected chat + mark read on server
  useEffect(() => {
    if (selectedChat) {
      if (unreadCounts[selectedChat]) {
        setUnreadCounts(prev => {
          const next = { ...prev };
          delete next[selectedChat];
          return next;
        });
      }
      api.markChatRead(currentUsername, selectedChat).catch(() => {});
    }
  }, [selectedChat]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const scrollToBottom = () => setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

  // ─── Helpers ──────────────────────────────────
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

  const generateSyntheticAudioBlob = async (durationSec: number): Promise<Blob> => {
    const sampleRate = 22050;
    const numSamples = sampleRate * durationSec;
    const dataSize = numSamples * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
    writeStr(0, "RIFF"); view.setUint32(4, 36 + dataSize, true); writeStr(8, "WAVE");
    writeStr(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
    view.setUint16(34, 16, true); writeStr(36, "data"); view.setUint32(40, dataSize, true);
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const freq = 440 * Math.pow(2, -t * 0.5);
      const envelope = Math.min(1, Math.min(t * 20, (durationSec - t) * 10));
      const sample = Math.sin(2 * Math.PI * freq * t) * 0.3 * envelope;
      view.setInt16(44 + i * 2, sample * 32767, true);
    }
    return new Blob([buffer], { type: "audio/wav" });
  };

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

  const hydrateMediaForMsg = useCallback(async (msg: Message) => {
    if (!msg.mediaId) return;
    const cacheKey = msg.mediaId;
    if (blobUrlCacheRef.current.has(cacheKey)) {
      if (msg.type === "audio") msg.audioUrl = blobUrlCacheRef.current.get(cacheKey)!;
      if (msg.type === "image") msg.imageUrl = blobUrlCacheRef.current.get(cacheKey)!;
      return;
    }
    if (mediaLoadingRef.current.has(cacheKey)) return;
    mediaLoadingRef.current.add(cacheKey);
    try {
      const base64 = await api.getMedia(msg.mediaId);
      if (base64) {
        const url = base64ToBlobUrl(base64, cacheKey);
        if (msg.type === "audio") msg.audioUrl = url;
        if (msg.type === "image") msg.imageUrl = url;
      }
    } catch (err) { console.error("Erro ao carregar media:", err); }
    finally { mediaLoadingRef.current.delete(cacheKey); }
  }, []);

  // ─── Load Messages ────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!selectedChat) return;
    try {
      const res = await api.getMessages(currentUsername, selectedChat);
      if (res.success) {
        const serverMsgs = (res.messages || []) as Message[];
        const mediaToFetch: Message[] = [];
        for (const msg of serverMsgs) {
          if (msg.mediaId) {
            const cached = blobUrlCacheRef.current.get(msg.mediaId);
            if (cached) {
              if (msg.type === "audio") msg.audioUrl = cached;
              if (msg.type === "image") msg.imageUrl = cached;
            } else { mediaToFetch.push(msg); }
          }
        }

        // Detect new incoming messages for push notification
        const incomingNew = serverMsgs.filter(m => m.from !== currentUsername && !m.read);
        if (incomingNew.length > 0 && serverMsgs.length > prevMessageCountRef.current && prevMessageCountRef.current > 0) {
          const lastMsg = incomingNew[incomingNew.length - 1];
          const senderContact = contacts.find(c => c.username === lastMsg.from);
          const senderName = senderContact?.name || lastMsg.from;
          // Send push notification if app is in background
          if (document.hidden) {
            showLocalNotification(
              `${senderName}`,
              lastMsg.type === "audio" ? "Mensagem de audio" : lastMsg.type === "image" ? "Foto" : lastMsg.text,
              `/${currentUsername}`,
              `chat-${lastMsg.from}`
            );
          }
          sfx.playMessageReceived();
        }
        prevMessageCountRef.current = serverMsgs.length;

        setMessages([...serverMsgs]);
        api.markMessagesRead(currentUsername, selectedChat, currentUsername).catch(() => {});
        if (mediaToFetch.length > 0) {
          await Promise.all(mediaToFetch.map((m) => hydrateMediaForMsg(m)));
          setMessages((prev) => prev.map((pm) => {
            if (pm.mediaId && blobUrlCacheRef.current.has(pm.mediaId)) {
              const url = blobUrlCacheRef.current.get(pm.mediaId)!;
              if (pm.type === "audio" && !pm.audioUrl) return { ...pm, audioUrl: url };
              if (pm.type === "image" && !pm.imageUrl) return { ...pm, imageUrl: url };
            }
            return pm;
          }));
        }
      }
    } catch (err) { console.error("Erro ao carregar mensagens:", err); }
  }, [currentUsername, selectedChat, hydrateMediaForMsg, contacts]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages();
      pollingRef.current = setInterval(loadMessages, 3000);
      return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    } else { setMessages([]); }
  }, [selectedChat, loadMessages]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) { audioPlayerRef.current.pause(); audioPlayerRef.current = null; }
      blobUrlCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrlCacheRef.current.clear();
    };
  }, []);

  // ─── Text Send ────────────────────────────────
  const handleSend = async () => {
    if (!message.trim() || !selectedChat || sending) return;
    const text = message.trim();
    setMessage("");
    setSending(true);
    sfx.playMessageSent();
    // Stop typing indicator
    api.sendTyping(currentUsername, selectedChat, false).catch(() => {});
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const fromName = currentUser.name || currentUsername;
    const tempMsg: Message = { id: `temp-${Date.now()}`, from: currentUsername, to: selectedChat, text, type: "text", timestamp: new Date().toISOString(), read: false };
    setMessages((prev) => [...prev, tempMsg]);
    try {
      await api.sendMessage(currentUsername, selectedChat, text);
      // Fire-and-forget push notification
      api.notifyNewMessage(selectedChat, fromName, text, "text").catch(() => {});
      await loadMessages();
    }
    catch (err) { console.error("Erro ao enviar:", err); }
    finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const formatTime = (ts: string) => { try { return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

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
    } catch {
      showToast("Microfone indisponivel — modo simulado");
      mediaRecorderRef.current = null;
      setMicSimulated(true);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    }
  };

  const stopRecording = async (cancel = false) => {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
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
    const localUrl = URL.createObjectURL(audioBlob);
    const tempId = `sending-audio-${Date.now()}`;
    blobUrlCacheRef.current.set(tempId, localUrl);
    const msg: Message = {
      id: tempId, from: currentUsername, to: selectedChat,
      text: `🎤 Audio (${formatDuration(duration)})`, type: "audio",
      timestamp: new Date().toISOString(), read: false, audioUrl: localUrl, audioDuration: duration,
    };
    setMessages((prev) => [...prev, msg]);
    scrollToBottom();
    try {
      const base64 = await blobToBase64(audioBlob);
      const mediaId = await api.uploadMedia(base64);
      blobUrlCacheRef.current.set(mediaId, localUrl);
      await api.sendMessage(currentUsername, selectedChat, `🎤 Audio (${formatDuration(duration)})`, "audio", { mediaId, audioDuration: duration });
      await loadMessages();
    } catch (e) { console.error("Erro ao enviar audio:", e); showToast("Erro ao enviar audio"); }
  };

  // ─── Audio Playback ───────────────────────────
  const toggleAudioPlay = async (msgId: string, msg: Message) => {
    if (playingAudioId === msgId) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
      return;
    }
    if (audioPlayerRef.current) audioPlayerRef.current.pause();
    let url = msg.audioUrl;
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
    audio.onerror = () => { setPlayingAudioId(null); showToast("Erro ao reproduzir"); };
    audio.play().catch(() => { showToast("Erro ao reproduzir"); setPlayingAudioId(null); });
    audioPlayerRef.current = audio;
    setPlayingAudioId(msgId);
  };

  // ─── Photo Sending ───────────────────────────
  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;
    setShowAttachMenu(false);
    const compressed = await compressImage(file);
    const localUrl = URL.createObjectURL(compressed);
    const tempId = `sending-img-${Date.now()}`;
    blobUrlCacheRef.current.set(tempId, localUrl);
    const msg: Message = {
      id: tempId, from: currentUsername, to: selectedChat,
      text: "📷 Foto", type: "image",
      timestamp: new Date().toISOString(), read: false, imageUrl: localUrl,
    };
    setMessages((prev) => [...prev, msg]);
    scrollToBottom();
    try {
      const base64 = await blobToBase64(compressed);
      const mediaId = await api.uploadMedia(base64);
      blobUrlCacheRef.current.set(mediaId, localUrl);
      await api.sendMessage(currentUsername, selectedChat, "📷 Foto", "image", { mediaId });
      await loadMessages();
    } catch (err) { console.error("Erro ao enviar foto:", err); showToast("Erro ao enviar foto"); }
    e.target.value = "";
  };

  const selectedContact = contacts.find((c) => c.username === selectedChat);
  const allContacts = contacts;

  return (
    <div className="h-full relative">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 rounded-xl text-white text-sm font-medium border backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)]"
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

      {/* Fullscreen Image Preview */}
      <AnimatePresence>
        {previewImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.button className="absolute top-4 right-4 p-2 bg-[#1f1f2e] rounded-full text-white z-10"
              whileTap={{ scale: 0.9 }} onClick={() => setPreviewImage(null)}
            ><X className="w-5 h-5" /></motion.button>
            <motion.img src={previewImage} initial={{ scale: 0.8 }} animate={{ scale: 1 }}
              className="max-w-full max-h-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedChat ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="h-full bg-[#0a0a12] border border-[#1f1f2e]/50 rounded-2xl p-4 overflow-y-auto flex flex-col">
          {groupedContacts ? (
            groupedContacts.map((group) => (
              <div key={group.label} className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-5 rounded-full" style={{ background: group.gradient }} />
                  <h3 className="text-white font-bold text-base">{group.label}</h3>
                  <span className="text-gray-500 text-xs ml-auto">{group.contacts.length}</span>
                </div>
                <div className="space-y-2.5">
                  {group.contacts.length > 0 ? (
                    group.contacts.map((contact, i) => (
                      <ContactCard key={contact.username} contact={contact}
                        accentColor={accentColor} onClick={() => setSelectedChat(contact.username)}
                        unreadCount={unreadCounts[contact.username] || 0} index={i}
                        isOnline={presenceMap[contact.username] ?? false}
                        lastMessage={lastMessages[contact.username]} currentUsername={currentUsername} />
                    ))
                  ) : (
                    <div className="py-6 text-center">
                      <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 3, repeat: Infinity }}>
                        <MessageSquare className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                      </motion.div>
                      <p className="text-gray-600 text-xs">Nenhum contato</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-5 rounded-full" style={{ background: `linear-gradient(180deg, ${accentColor}, #8b5cf6)` }} />
                <h3 className="text-white font-bold text-base">Contatos</h3>
                <span className="text-gray-500 text-xs ml-auto">{allContacts.length}</span>
              </div>
              {allContacts.length > 0 ? (
                allContacts.map((contact, i) => (
                  <ContactCard key={contact.username} contact={contact}
                    accentColor={accentColor} onClick={() => setSelectedChat(contact.username)}
                    unreadCount={unreadCounts[contact.username] || 0} index={i}
                    isOnline={presenceMap[contact.username] ?? false}
                    lastMessage={lastMessages[contact.username]} currentUsername={currentUsername} />
                ))
              ) : (
                <div className="py-10 text-center">
                  <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 3, repeat: Infinity }}>
                    <MessageSquare className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                  </motion.div>
                  <p className="text-gray-500 text-xs">Nenhum contato disponivel</p>
                  <p className="text-gray-600 text-[10px] mt-1">Seus vendedores aparecerão aqui</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
          className="fixed inset-0 z-[70] bg-[#050508] flex flex-col"
        >
          {selectedChat && selectedContact && (
            <>
              {/* Header */}
              <div className="relative shrink-0 bg-[#0a0a12]/95 backdrop-blur-xl border-b border-[#1f1f2e]/60 px-4 py-3 flex items-center gap-3">
                <motion.div className="absolute bottom-0 left-0 right-0 h-[1px]"
                  style={{ background: `linear-gradient(90deg, transparent, ${accentColor}30, transparent)` }}
                  animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 3, repeat: Infinity }}
                />
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSelectedChat(null)}
                  className="p-1.5 rounded-xl hover:bg-[#1f1f2e] text-gray-400 transition-colors shrink-0">
                  <ChevronLeft className="w-5 h-5" />
                </motion.button>
                <ChatNeonAvatar photo={selectedContact.photo} name={selectedContact.name} isOnline={presenceMap[selectedContact.username] ?? false} size="sm" />
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
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => onStartCall?.(selectedChat, "video", selectedContact.name)}
                    className="p-2 rounded-xl hover:bg-[#1f1f2e] transition-colors" style={{ color: accentColor }}>
                    <Video className="w-5 h-5" />
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => onStartCall?.(selectedChat, "voice", selectedContact.name)}
                    className="p-2 rounded-xl hover:bg-[#1f1f2e] transition-colors" style={{ color: accentColor }}>
                    <Phone className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3" onClick={() => setShowAttachMenu(false)}>
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="w-20 h-20 rounded-2xl bg-[#1f1f2e]/50 flex items-center justify-center mb-3">
                      <Send className="w-8 h-8 text-gray-600" />
                    </div>
                    <p className="text-lg font-medium text-gray-500">Inicie uma conversa</p>
                    <p className="text-sm text-gray-600">com {selectedContact.name}</p>
                  </div>
                ) : (
                  <>
                    <AnimatePresence initial={false}>
                      {messages.map((msg) => {
                        const isMine = msg.from === currentUsername;
                        const bubbleClass = isMine
                          ? "bg-gradient-to-br from-[#00f0ff]/15 to-[#8b5cf6]/15 border border-[#00f0ff]/10"
                          : "bg-[#1f1f2e] border border-[#2a2a3e]";
                        return (
                          <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[70%] rounded-2xl overflow-hidden ${bubbleClass}`}>
                              {/* Image */}
                              {msg.type === "image" ? (
                                msg.imageUrl ? (
                                  <div>
                                    <button onClick={() => setPreviewImage(msg.imageUrl!)} className="w-full">
                                      <img src={msg.imageUrl} alt="Foto" className="w-full max-h-[240px] object-cover" />
                                    </button>
                                    <div className={`flex items-center gap-1 px-3 py-1.5 ${isMine ? "justify-end" : "justify-start"}`}>
                                      <span className="text-gray-500 text-[10px]">{formatTime(msg.timestamp)}</span>
                                      {isMine && (msg.read ? <CheckCheck className="w-3 h-3 text-[#00f0ff]" /> : <Check className="w-3 h-3 text-gray-500" />)}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="px-4 py-6 flex flex-col items-center gap-2">
                                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                      className="w-6 h-6 border-2 border-t-transparent rounded-full"
                                      style={{ borderColor: `${accentColor}60`, borderTopColor: "transparent" }} />
                                    <span className="text-gray-500 text-[10px]">Carregando foto...</span>
                                  </div>
                                )
                              ) : msg.type === "audio" ? (
                                /* Audio */
                                <div className="px-4 py-2.5">
                                  <div className="flex items-center gap-2.5">
                                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => toggleAudioPlay(msg.id, msg)}
                                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                                      style={{ background: `linear-gradient(135deg, ${accentColor}, #8b5cf6)` }}>
                                      {playingAudioId === msg.id ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white ml-0.5" />}
                                    </motion.button>
                                    <div className="flex-1 min-w-0">
                                      <AudioWaveform playing={playingAudioId === msg.id} color={isMine ? accentColor : "#8b5cf6"} />
                                    </div>
                                    <span className="text-gray-500 text-[10px] font-mono shrink-0">{formatDuration(msg.audioDuration || 0)}</span>
                                  </div>
                                  <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                                    <span className="text-gray-500 text-[10px]">{formatTime(msg.timestamp)}</span>
                                    {isMine && (msg.read ? <CheckCheck className="w-3 h-3 text-[#00f0ff]" /> : <Check className="w-3 h-3 text-gray-500" />)}
                                  </div>
                                </div>
                              ) : (
                                /* Text */
                                <div className="px-4 py-2.5">
                                  <p className="text-white text-sm break-words">{msg.text}</p>
                                  <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                                    <span className="text-gray-500 text-[10px]">{formatTime(msg.timestamp)}</span>
                                    {isMine && (msg.read ? <CheckCheck className="w-3 h-3 text-[#00f0ff]" /> : <Check className="w-3 h-3 text-gray-500" />)}
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

              {/* Input */}
              <div className="relative shrink-0 bg-[#0a0a12]/95 backdrop-blur-xl border-t border-[#1f1f2e]/60 p-3">
                {/* Hidden file inputs */}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelected} />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelected} />

                {/* Attach menu */}
                <AnimatePresence>
                  {showAttachMenu && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full left-3 mb-2 bg-[#12121a] border border-[#1f1f2e] rounded-2xl p-2 flex flex-col gap-1 shadow-[0_0_30px_rgba(0,0,0,0.6)] min-w-[160px]">
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => { cameraInputRef.current?.click(); setShowAttachMenu(false); }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#1f1f2e] transition-colors text-left w-full">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, #ff006e, #ff00ff)` }}>
                          <Camera className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-white text-xs font-medium">Câmera</span>
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#1f1f2e] transition-colors text-left w-full">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, #8b5cf6, #00f0ff)` }}>
                          <ImageIcon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-white text-xs font-medium">Galeria</span>
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isRecording ? (
                  /* Recording UI */
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => stopRecording(true)}
                      className="p-2.5 rounded-xl bg-[#ff006e]/20 text-[#ff006e] shrink-0 border border-[#ff006e]/20">
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-[#12121a] rounded-xl border border-[#ff006e]/20">
                      <motion.div animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1, repeat: Infinity }}
                        className="w-2.5 h-2.5 rounded-full bg-[#ff006e] shrink-0" />
                      <span className="text-[#ff006e] font-mono text-sm font-bold">{formatDuration(recordingTime)}</span>
                      <div className="flex-1"><AudioWaveform playing={true} color="#ff006e" /></div>
                      {micSimulated && <span className="text-yellow-400 text-[10px]">(sim)</span>}
                    </div>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => stopRecording(false)}
                      className="p-3 rounded-xl text-white shrink-0"
                      style={{ background: `linear-gradient(135deg, ${accentColor}, #8b5cf6)` }}>
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
                    <input type="text" value={message} onChange={(e) => handleTypingInput(e.target.value)}
                      onKeyDown={handleKeyDown} placeholder="Mensagem..."
                      className="flex-1 px-4 py-3 bg-[#12121a] border border-[#1f1f2e]/60 rounded-xl text-white text-sm focus:outline-none focus:border-[#00f0ff]/40 transition-all placeholder-gray-600"
                      onFocus={() => setShowAttachMenu(false)}
                    />
                    {message.trim() ? (
                      <motion.button whileTap={{ scale: 0.9 }} onClick={handleSend} disabled={sending}
                        className="p-3 rounded-xl text-white disabled:opacity-30 shrink-0 transition-all"
                        style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #8b5cf6 100%)` }}>
                        <Send className="w-5 h-5" />
                      </motion.button>
                    ) : (
                      <motion.button whileTap={{ scale: 0.85 }} onMouseDown={startRecording}
                        className="p-3 rounded-xl text-white shrink-0 transition-all"
                        style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #8b5cf6 100%)` }}>
                        <Mic className="w-5 h-5" />
                      </motion.button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Neon Avatar (for contact list & chat header) ────────────────────
function ChatNeonAvatar({ photo, name, isOnline = true, size = "md" }: { photo?: string; name?: string; isOnline?: boolean; size?: "sm" | "md" | "lg" }) {
  const s = {
    sm: { outer: "w-10 h-10", inner: "inset-[2px]", text: "text-sm", dot: "w-2.5 h-2.5 -bottom-0.5 -right-0.5 border-[2px]" },
    md: { outer: "w-13 h-13", inner: "inset-[2.5px]", text: "text-base", dot: "w-3 h-3 bottom-0 right-0 border-2" },
    lg: { outer: "w-14 h-14", inner: "inset-[3px]", text: "text-lg", dot: "w-3.5 h-3.5 bottom-0 right-0 border-2" },
  }[size];
  const initial = name && name.length > 0 ? name.charAt(0).toUpperCase() : "?";
  const borderGradient = isOnline
    ? "conic-gradient(from 0deg, #00ff41, #00f0ff, #00ff41, transparent, #00ff41)"
    : "conic-gradient(from 0deg, #555, #888, #555, transparent, #555)";
  const glowColor = isOnline ? "rgba(0,255,65," : "rgba(150,150,150,";

  return (
    <div className={`relative ${s.outer} shrink-0`}>
      <motion.div className="absolute inset-0 rounded-full"
        style={{ background: borderGradient }}
        animate={{ rotate: [0, 360] }} transition={{ duration: isOnline ? 4 : 8, repeat: Infinity, ease: "linear" }}
      />
      {isOnline && (
        <motion.div className="absolute inset-[-2px] rounded-full pointer-events-none"
          animate={{ boxShadow: [`0 0 8px ${glowColor}0.2)`, `0 0 14px ${glowColor}0.4)`, `0 0 8px ${glowColor}0.2)`] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      <div className={`absolute ${s.inner} rounded-full bg-[#0c0c14] flex items-center justify-center overflow-hidden`}>
        {photo ? (
          <img src={photo} alt={name} className="w-full h-full object-cover rounded-full" />
        ) : (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00f0ff]/30 to-[#8b5cf6]/20 flex items-center justify-center">
            <span className={`${s.text} font-bold text-white`}>{initial}</span>
          </div>
        )}
      </div>
      <motion.div
        className={`absolute ${s.dot} rounded-full border-[#0c0c14] ${isOnline ? "bg-[#00ff41]" : "bg-gray-500"}`}
        animate={isOnline ? {
          scale: [1, 1.3, 1],
          boxShadow: ["0 0 3px rgba(0,255,65,0.5)", "0 0 8px rgba(0,255,65,0.8)", "0 0 3px rgba(0,255,65,0.5)"]
        } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </div>
  );
}

// ─── GlowCard (animated border card) ─────────────────────────────────
function ChatGlowCard({ children, glowColor = "#00f0ff", className = "" }: { children: React.ReactNode; glowColor?: string; className?: string }) {
  return (
    <motion.div className={`relative rounded-2xl overflow-hidden ${className}`}>
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

// ─── Professional Contact Card ───────────────────────────────────────
function ContactCard({
  contact, accentColor, onClick, unreadCount = 0, index = 0, isOnline = false,
  lastMessage, currentUsername,
}: {
  contact: Contact; accentColor: string; onClick: () => void; unreadCount?: number; index?: number;
  isOnline?: boolean; lastMessage?: { text: string; type: string; from: string; timestamp: string }; currentUsername?: string;
}) {
  const lastMsgPreview = lastMessage
    ? lastMessage.type === "audio" ? "🎤 Audio"
      : lastMessage.type === "image" ? "📷 Foto"
      : lastMessage.text.length > 35 ? lastMessage.text.substring(0, 35) + "..." : lastMessage.text
    : null;
  const lastMsgTime = lastMessage?.timestamp
    ? (() => { try { return new Date(lastMessage.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } })()
    : null;
  const lastMsgIsMine = lastMessage?.from === currentUsername;

  return (
    <motion.button
      key={contact.username}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left"
    >
      <ChatGlowCard glowColor={isOnline ? "#00ff41" : "#666"}>
        <div className="flex items-center gap-3.5 p-3.5">
          {/* Neon Avatar */}
          <div className="relative">
            <ChatNeonAvatar photo={contact.photo} name={contact.name} isOnline={isOnline} size="md" />
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] bg-[#ff006e] rounded-full flex items-center justify-center px-1.5 shadow-[0_0_10px_rgba(255,0,110,0.6)] border-2 border-[#0c0c14] z-10"
              >
                <span className="text-white text-[10px] font-black leading-none">{unreadCount > 99 ? "99+" : unreadCount}</span>
              </motion.div>
            )}
          </div>

          {/* Contact Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-white font-semibold text-sm truncate">{contact.name}</p>
              {unreadCount > 0 && (
                <motion.div className="w-1.5 h-1.5 rounded-full bg-[#ff006e] shrink-0"
                  animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </div>
            {lastMsgPreview ? (
              <p className={`text-xs truncate mt-0.5 ${unreadCount > 0 ? "text-gray-300 font-medium" : "text-gray-500"}`}>
                {lastMsgIsMine && <span className="text-gray-600">Você: </span>}{lastMsgPreview}
              </p>
            ) : (
              <p className="text-gray-500 text-xs truncate">@{contact.username}</p>
            )}
          </div>

          {/* Right side: time + Online status + Chat icon */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              {lastMsgTime && (
                <span className={`text-[10px] font-mono ${unreadCount > 0 ? "text-[#00f0ff]" : "text-gray-600"}`}>{lastMsgTime}</span>
              )}
              {isOnline ? (
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
      </ChatGlowCard>
    </motion.button>
  );
}