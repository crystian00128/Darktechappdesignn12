import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Phone, PhoneOff, Video, VideoOff, MicOff, Mic, Maximize2, ShieldAlert } from "lucide-react";
import type { CallData } from "../hooks/useCallSystem";

/* ── Neon Avatar (standalone for call overlays) ── */
function CallAvatar({ photo, name, size = 80 }: { photo?: string; name?: string; size?: number }) {
  const initial = name && name.length > 0 ? name.charAt(0).toUpperCase() : "?";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <motion.div className="absolute inset-0 rounded-full"
        style={{ background: "conic-gradient(from 0deg, #00ff41, #00f0ff, #00ff41, transparent, #00ff41)" }}
        animate={{ rotate: [0, 360] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
      <motion.div className="absolute inset-[-3px] rounded-full pointer-events-none"
        animate={{ boxShadow: ["0 0 10px rgba(0,255,65,0.3)", "0 0 20px rgba(0,255,65,0.5)", "0 0 10px rgba(0,255,65,0.3)"] }}
        transition={{ duration: 1.5, repeat: Infinity }} />
      <div className="absolute inset-[3px] rounded-full bg-[#0a0a0f] flex items-center justify-center overflow-hidden">
        {photo && (photo.startsWith("http") || photo.startsWith("data:")) ? (
          <img src={photo} alt={name} className="w-full h-full object-cover rounded-full" />
        ) : (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-[#ff00ff]/30 to-[#00f0ff]/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{initial}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Audio Visualizer ── */
function AudioVisualizer({ isActive, accent }: { isActive: boolean; accent: string }) {
  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{ backgroundColor: accent }}
          animate={isActive ? {
            height: [4, 12 + Math.random() * 16, 4],
            opacity: [0.4, 1, 0.4],
          } : { height: 4, opacity: 0.3 }}
          transition={{
            duration: 0.4 + Math.random() * 0.3,
            repeat: Infinity,
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  );
}

/* ── Incoming Call Overlay (fullscreen, with Accept/Decline) ── */
export function IncomingCallOverlay({
  call,
  onAnswer,
  onDecline,
}: {
  call: CallData;
  onAnswer: () => void;
  onDecline: () => void;
}) {
  // Guard against null call
  if (!call) return null;

  const isVideo = call.type === "video";
  const accent = isVideo ? "#8b5cf6" : "#00f0ff";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center"
      style={{ background: `radial-gradient(ellipse at center, ${accent}10 0%, #030305 60%)` }}
    >
      {/* Pulsing rings */}
      {[100, 150, 200, 260].map((s, i) => (
        <motion.div key={i} className="absolute rounded-full border"
          style={{ width: s, height: s, borderColor: `${accent}15` }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }} />
      ))}

      {/* Scanning line effect */}
      <motion.div className="absolute inset-x-0 h-[1px]"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}40, transparent)` }}
        animate={{ top: ["20%", "80%", "20%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />

      <div className="relative z-10 flex flex-col items-center gap-6 px-8">
        {/* Incoming label */}
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full border"
          style={{ borderColor: `${accent}30`, backgroundColor: `${accent}10` }}>
          {isVideo ? <Video className="w-4 h-4" style={{ color: accent }} /> : <Phone className="w-4 h-4" style={{ color: accent }} />}
          <span className="text-sm font-medium" style={{ color: accent }}>
            {isVideo ? "Chamada de Video" : "Chamada de Voz"}
          </span>
        </motion.div>

        {/* Avatar with pulse */}
        <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          <CallAvatar photo={call.fromPhoto} name={call.fromName} size={100} />
        </motion.div>

        {/* Name */}
        <div className="text-center">
          <p className="text-white font-bold text-2xl">{call.fromName}</p>
          <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}
            className="text-gray-400 text-sm mt-1">
            Chamando...
          </motion.p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-8 mt-6">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onDecline}
              className="w-16 h-16 rounded-full bg-[#ff006e] flex items-center justify-center shadow-[0_0_30px_rgba(255,0,110,0.5)]"
            >
              <motion.div animate={{ rotate: [0, 135] }} transition={{ duration: 0.3 }}>
                <PhoneOff className="w-7 h-7 text-white" />
              </motion.div>
            </motion.button>
            <span className="text-gray-400 text-xs font-medium">Recusar</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onAnswer}
              animate={{ boxShadow: ["0 0 20px rgba(0,255,65,0.3)", "0 0 40px rgba(0,255,65,0.5)", "0 0 20px rgba(0,255,65,0.3)"] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-16 h-16 rounded-full bg-[#00ff41] flex items-center justify-center"
            >
              <Phone className="w-7 h-7 text-black" />
            </motion.button>
            <span className="text-gray-400 text-xs font-medium">Atender</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Connected / Outgoing Call Overlay ── */
export function ActiveCallOverlay({
  call,
  isConnected,
  isOutgoing,
  currentUserPhoto,
  currentUserName,
  onEnd,
  isMuted = false,
  onToggleMute,
  micBlocked = false,
}: {
  call: CallData;
  isConnected: boolean;
  isOutgoing: boolean;
  currentUserPhoto?: string;
  currentUserName?: string;
  onEnd: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  micBlocked?: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    if (!isConnected) return;
    const i = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(i);
  }, [isConnected]);

  // Guard against null call (race condition during state transitions)
  if (!call) return null;

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const isVideo = call.type === "video";
  const accent = isVideo ? "#8b5cf6" : "#00f0ff";
  
  // The other person's info
  const otherName = isOutgoing ? (call.toName || call.to) : call.fromName;
  const otherPhoto = isOutgoing ? (call.toPhoto || "") : call.fromPhoto;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center"
      style={{ background: `radial-gradient(ellipse at center, ${accent}10 0%, #030305 70%)` }}
    >
      {/* Pulsing rings */}
      {[90, 130, 170].map((s, i) => (
        <motion.div key={i} className="absolute rounded-full border"
          style={{ width: s, height: s, borderColor: `${accent}12` }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5 }} />
      ))}

      <div className="relative z-10 flex flex-col items-center gap-5 px-8">
        {/* Status label */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full"
          style={{ backgroundColor: `${accent}15`, border: `1px solid ${accent}25` }}>
          {isConnected ? (
            <motion.div className="w-2 h-2 rounded-full bg-[#00ff41]"
              animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
          ) : (
            <motion.div className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }}
              animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity }} />
          )}
          <span className="text-xs font-medium" style={{ color: isConnected ? "#00ff41" : accent }}>
            {isConnected ? (isVideo ? "Video Chamada" : "Chamada de Voz") : "Chamando..."}
          </span>
        </div>

        {/* Avatar */}
        <motion.div animate={!isConnected ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}>
          <CallAvatar photo={otherPhoto} name={otherName} size={90} />
        </motion.div>

        {/* Name & Timer */}
        <div className="text-center">
          <p className="text-white font-bold text-xl">{otherName}</p>
          <motion.p animate={!isConnected ? { opacity: [0.4, 1, 0.4] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="font-mono text-sm mt-1" style={{ color: isConnected ? "#00ff41" : accent }}>
            {isConnected ? fmt(elapsed) : isVideo ? "Chamada de video..." : "Ligando..."}
          </motion.p>
        </div>

        {/* Audio visualizer when connected */}
        {isConnected && !isVideo && (
          <AudioVisualizer isActive={!isMuted} accent={accent} />
        )}

        {/* Video preview (when connected + video call) */}
        {isVideo && isConnected && (
          <div className="w-60 h-40 rounded-2xl bg-[#12121a] border border-[#1f1f2e] flex items-center justify-center overflow-hidden mt-2">
            <div className="w-full h-full relative" style={{ background: `linear-gradient(135deg, ${accent}10, #0a0a1280)` }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <Video className="w-8 h-8 text-gray-700" />
              </div>
              <div className="absolute bottom-2 right-2 w-16 h-12 rounded-lg bg-[#1f1f2e] border border-[#2a2a3e] flex items-center justify-center">
                <CallAvatar photo={currentUserPhoto} name={currentUserName || "Eu"} size={32} />
              </div>
            </div>
          </div>
        )}

        {/* Mute indicator */}
        {isMuted && isConnected && !micBlocked && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ff006e]/20 border border-[#ff006e]/30"
          >
            <MicOff className="w-3 h-3 text-[#ff006e]" />
            <span className="text-xs text-[#ff006e] font-medium">Microfone Mudo</span>
          </motion.div>
        )}

        {/* Mic blocked indicator */}
        {micBlocked && isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ff8800]/15 border border-[#ff8800]/30"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-[#ff8800]" />
            <span className="text-xs text-[#ff8800] font-medium">Microfone bloqueado — apenas ouvindo</span>
          </motion.div>
        )}

        {/* Control buttons */}
        <div className="flex items-center gap-5 mt-4">
          {isVideo && (
            <button onClick={() => setIsVideoOff(!isVideoOff)}
              className={`p-3.5 rounded-full transition-colors ${isVideoOff ? "bg-[#ff006e]/20 text-[#ff006e]" : "bg-[#1f1f2e] text-gray-400"}`}>
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}
          <button onClick={onToggleMute}
            className={`p-3.5 rounded-full transition-colors ${isMuted ? "bg-[#ff006e]/20 text-[#ff006e]" : "bg-[#1f1f2e] text-gray-400"}`}>
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onEnd}
            className="p-4 rounded-full bg-[#ff006e] text-white shadow-[0_0_25px_rgba(255,0,110,0.5)]"
          >
            <PhoneOff className="w-6 h-6" />
          </motion.button>
          {!isVideo && (
            <button className="p-3.5 rounded-full bg-[#1f1f2e] text-gray-400">
              <Maximize2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}