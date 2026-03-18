import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  User,
  Phone,
  Check,
  Lock,
  ShieldAlert,
  ArrowLeft,
  Upload,
  X,
  ScanFace,
  Loader,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import * as api from "../services/api";
import * as sfx from "../services/sounds";

interface RegisterFlowProps {
  userType: "vendedor" | "cliente" | "motorista";
  onComplete: () => void;
}

/* ══════════════════════════════════════════════════════════════
   Photo Camera (vendedor/motorista)
   ══════════════════════════════════════════════════════════════ */
function PhotoCamera({
  onCapture,
  onCancel,
}: {
  onCapture: (base64: string) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      } catch {
        if (!cancelled) setError("Não foi possível acessar a câmera.");
      }
    })();
    return () => { cancelled = true; streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const capture = () => {
    const v = videoRef.current;
    if (!v) return;
    sfx.playPhotoSnap();
    const c = document.createElement("canvas");
    c.width = 480; c.height = 360;
    c.getContext("2d")!.drawImage(v, 0, 0, 480, 360);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(c.toDataURL("image/jpeg", 0.8));
  };

  if (error) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-[#ff006e]/20 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-[#ff006e]" />
        </div>
        <p className="text-[#ff006e] text-sm">{error}</p>
        <button onClick={onCancel} className="px-6 py-2 bg-[#1f1f2e] text-gray-300 rounded-xl text-sm">Voltar</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
      </div>
      <div className="flex gap-3">
        <button onClick={() => { sfx.playStepBack(); onCancel(); }} className="flex-1 py-3 bg-[#1f1f2e] border border-[#2a2a3e] text-gray-300 rounded-xl font-semibold text-sm">Cancelar</button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={capture}
          disabled={!ready}
          className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-[#00f0ff] to-[#8b5cf6] text-white shadow-[0_0_20px_rgba(0,240,255,0.3)] disabled:opacity-40"
        >
          <Camera className="w-4 h-4" />
          Capturar Foto
        </motion.button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Auto Face Camera — auto-detects, countdown, capture
   ══════════════════════════════════════════════════════════════ */
function AutoFaceCamera({
  onCapture,
  onCancel,
}: {
  onCapture: (base64: string) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [faceDetected, setFaceDetected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const faceStableRef = useRef(0);
  const capturedRef = useRef(false);
  const countdownRunning = useRef(false);
  const prevFaceDetected = useRef(false);

  // Start camera
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = s;
        const tryAssign = () => {
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.onloadedmetadata = () => { if (!cancelled) setReady(true); };
          } else {
            requestAnimationFrame(tryAssign);
          }
        };
        tryAssign();
      } catch {
        if (!cancelled) setError("Não foi possível acessar a câmera. Verifique as permissões.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Face detection loop
  useEffect(() => {
    if (!ready) return;
    const interval = setInterval(() => {
      if (capturedRef.current || countdownRunning.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = 160;
      canvas.height = 120;
      ctx.drawImage(video, 0, 0, 160, 120);
      const centerData = ctx.getImageData(30, 15, 100, 90);
      const pixels = centerData.data;
      let skinToneCount = 0;
      let totalBrightness = 0;
      const totalPixels = pixels.length / 4;
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        totalBrightness += (r + g + b) / 3;
        if (r > 60 && g > 40 && b > 20 && r > b && (r - g) > -50 && Math.abs(r - g) < 110) {
          skinToneCount++;
        }
      }
      const avgBrightness = totalBrightness / totalPixels;
      const skinRatio = skinToneCount / totalPixels;
      const detected = avgBrightness > 35 && avgBrightness < 245 && skinRatio > 0.12;
      setFaceDetected(detected);

      // Play sound when face first detected
      if (detected && !prevFaceDetected.current) {
        sfx.playFaceDetected();
      }
      prevFaceDetected.current = detected;

      if (detected) {
        faceStableRef.current++;
        if (faceStableRef.current >= 4 && !countdownRunning.current) {
          countdownRunning.current = true;
          startAutoCountdown();
        }
      } else {
        faceStableRef.current = 0;
      }
    }, 500);
    return () => clearInterval(interval);
  }, [ready]);

  const startAutoCountdown = () => {
    let count = 3;
    setCountdown(count);
    sfx.playCountdown(count);
    const timer = setInterval(() => {
      count--;
      setCountdown(count);
      if (count > 0) {
        sfx.playCountdown(count);
      }
      if (count <= 0) {
        clearInterval(timer);
        setCountdown(null);
        sfx.playCameraShutter();
        doCapture();
      }
    }, 1000);
  };

  const doCapture = () => {
    if (capturedRef.current) return;
    capturedRef.current = true;
    setAnalyzing(true);
    const video = videoRef.current;
    if (!video) return;
    const c = document.createElement("canvas");
    c.width = 480;
    c.height = 360;
    c.getContext("2d")!.drawImage(video, 0, 0, 480, 360);
    const base64 = c.toDataURL("image/jpeg", 0.8);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setTimeout(() => {
      setAnalyzing(false);
      sfx.playFaceMatch();
      onCapture(base64);
    }, 2000);
  };

  if (error) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-[#ff006e]/20 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-[#ff006e]" />
        </div>
        <p className="text-[#ff006e] text-sm">{error}</p>
        <button onClick={onCancel} className="px-6 py-2 bg-[#1f1f2e] text-gray-300 rounded-xl text-sm">Voltar</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
        <canvas ref={canvasRef} className="hidden" />

        {/* Face oval guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            className={`w-44 h-56 rounded-[50%] border-2 transition-colors duration-300 ${faceDetected ? "border-[#00ff41]" : "border-[#ff006e]"}`}
            animate={{
              boxShadow: faceDetected
                ? ["0 0 12px rgba(0,255,65,0.3)", "0 0 28px rgba(0,255,65,0.5)", "0 0 12px rgba(0,255,65,0.3)"]
                : ["0 0 12px rgba(255,0,110,0.3)", "0 0 28px rgba(255,0,110,0.5)", "0 0 12px rgba(255,0,110,0.3)"],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <div className="absolute top-[12%] left-[20%] w-6 h-6 border-t-2 border-l-2 border-[#00f0ff] rounded-tl-lg" />
          <div className="absolute top-[12%] right-[20%] w-6 h-6 border-t-2 border-r-2 border-[#00f0ff] rounded-tr-lg" />
          <div className="absolute bottom-[12%] left-[20%] w-6 h-6 border-b-2 border-l-2 border-[#00f0ff] rounded-bl-lg" />
          <div className="absolute bottom-[12%] right-[20%] w-6 h-6 border-b-2 border-r-2 border-[#00f0ff] rounded-br-lg" />

          <motion.div
            className="absolute left-[20%] right-[20%] h-[2px] bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent"
            animate={{ top: ["12%", "82%", "12%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Countdown */}
        <AnimatePresence>
          {countdown !== null && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-black/40">
              <motion.span key={countdown} initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ type: "spring", damping: 12 }}
                className="text-7xl font-black text-[#00f0ff] drop-shadow-[0_0_30px_rgba(0,240,255,0.9)]"
              >{countdown}</motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analyzing */}
        <AnimatePresence>
          {analyzing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                <ScanFace className="w-14 h-14 text-[#00f0ff]" />
              </motion.div>
              <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.2, repeat: Infinity }} className="text-[#00f0ff] font-bold text-sm tracking-wide">
                Registrando rosto...
              </motion.p>
              <div className="w-40 h-1 bg-[#1f1f2e] rounded-full overflow-hidden mt-1">
                <motion.div className="h-full bg-gradient-to-r from-[#00f0ff] to-[#8b5cf6] rounded-full" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 2, ease: "easeInOut" }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status badge */}
        {!countdown && !analyzing && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
            <motion.div animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.5, repeat: Infinity }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm ${faceDetected ? "bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/40" : "bg-[#ff006e]/20 text-[#ff006e] border border-[#ff006e]/40"}`}
            >
              {faceDetected ? "✓ Rosto detectado — aguarde..." : "⚠ Posicione seu rosto na área oval"}
            </motion.div>
          </div>
        )}
      </div>

      {!analyzing && countdown === null && (
        <button onClick={() => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; sfx.playStepBack(); onCancel(); }}
          className="w-full text-center text-gray-500 text-xs hover:text-gray-300 transition-colors py-1">
          ← Cancelar e voltar
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Username Input with Live Availability Check
   ══════════════════════════════════════════════════════════════ */
function UsernameInput({
  value,
  onChange,
  onAvailabilityChange,
}: {
  value: string;
  onChange: (v: string) => void;
  onAvailabilityChange: (available: boolean | null) => void;
}) {
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [reason, setReason] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const checkAvailability = useCallback(async (username: string) => {
    if (username.length < 2) {
      setAvailable(null);
      setReason("");
      onAvailabilityChange(null);
      return;
    }
    setChecking(true);
    try {
      const res = await api.checkUsername(username.toLowerCase());
      setAvailable(res.available);
      setReason(res.reason || "");
      onAvailabilityChange(res.available);
      if (res.available === false) {
        sfx.playUsernameTaken();
      } else if (res.available === true) {
        sfx.playClick();
      }
    } catch {
      setAvailable(null);
      onAvailabilityChange(null);
    } finally {
      setChecking(false);
    }
  }, [onAvailabilityChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\s/g, "").toLowerCase();
    onChange(v);
    setAvailable(null);
    setReason("");
    onAvailabilityChange(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.length >= 2) {
      debounceRef.current = setTimeout(() => checkAvailability(v), 600);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome de Usuário</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          className={`w-full px-4 py-3 pr-10 bg-[#1f1f2e] border rounded-xl text-white focus:outline-none text-sm transition-colors ${
            available === true ? "border-[#00ff41] focus:border-[#00ff41]" :
            available === false ? "border-[#ff006e] focus:border-[#ff006e]" :
            "border-[#2a2a3e] focus:border-[#00f0ff]"
          }`}
          placeholder="Digite seu usuário"
          autoCapitalize="off"
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {checking && <Loader className="w-4 h-4 text-[#00f0ff] animate-spin" />}
          {!checking && available === true && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
              <CheckCircle2 className="w-4 h-4 text-[#00ff41]" />
            </motion.div>
          )}
          {!checking && available === false && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: [1, 1.2, 1] }} transition={{ type: "spring" }}>
              <XCircle className="w-4 h-4 text-[#ff006e]" />
            </motion.div>
          )}
        </div>
      </div>
      <AnimatePresence>
        {available === false && reason && (
          <motion.p
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            className="text-[#ff006e] text-[10px] mt-1.5 font-semibold flex items-center gap-1"
          >
            <ShieldAlert className="w-3 h-3 shrink-0" />
            {reason}. Escolha outro nome!
          </motion.p>
        )}
        {available === true && (
          <motion.p
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            className="text-[#00ff41] text-[10px] mt-1.5 font-semibold flex items-center gap-1"
          >
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            Username disponível!
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main Registration Flow
   ══════════════════════════════════════════════════════════════ */
export function RegisterFlow({ userType, onComplete }: RegisterFlowProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    foto: null as string | null,
    faceData: null as string | null,
    nome: "",
    nomeLoja: "",
    whatsapp: "",
    username: "",
    pin: "",
    pinConfirm: "",
  });
  const [pinDots, setPinDots] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [faceSuccess, setFaceSuccess] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const inviteCode =
    (location.state as any)?.inviteCode ||
    new URLSearchParams(location.search).get("inviteCode") ||
    "";

  const hasValidCode = inviteCode && inviteCode.trim() !== "";

  // Play boot sound on mount
  useEffect(() => { sfx.playWhoosh(); }, []);

  /* ── PIN logic ── */
  const handlePinInput = (digit: number) => {
    if (pinDots.length < 6) {
      const newPinDots = [...pinDots, digit];
      setPinDots(newPinDots);
      sfx.playPinDigit(newPinDots.length - 1);

      if (newPinDots.length === 6) {
        if (step === 2) {
          setFormData((prev) => ({ ...prev, pin: newPinDots.join("") }));
          setTimeout(() => {
            sfx.playStepForward();
            setPinDots([]);
            setStep(3);
          }, 500);
        } else if (step === 3) {
          const pinConfirm = newPinDots.join("");
          if (formData.pin !== pinConfirm) {
            sfx.playError();
            setError("PINs não coincidem!");
            setPinDots([]);
            setTimeout(() => setError(""), 3000);
            return;
          }
          // Request notification permission immediately during user gesture
          if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
          }
          setTimeout(() => handleRegister(pinConfirm), 500);
        }
      }
    }
  };
  const handleDeletePin = () => {
    setPinDots(pinDots.slice(0, -1));
    sfx.playPinDelete();
  };

  /* ── Register vendedor/motorista ── */
  const handleRegister = async (_pinConfirm: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.registerUser({
        username: formData.username.toLowerCase(),
        pin: formData.pin || "000000",
        name: userType === "vendedor" ? formData.nomeLoja : formData.nome,
        role: userType,
        inviteCode,
        photo: formData.foto || undefined,
        faceData: formData.faceData || undefined,
        whatsapp: formData.whatsapp || undefined,
      });
      try { await api.repairLinks(); } catch {}

      sfx.playSuccess();
      localStorage.setItem("currentUser", JSON.stringify({
        username: formData.username.toLowerCase(),
        name: userType === "vendedor" ? formData.nomeLoja : formData.nome,
        photo: response.user.photo,
        tipo: userType,
        createdBy: response.user.createdBy || null,
      }));
      onComplete();
      navigate(`/${userType}`);
    } catch (err: any) {
      sfx.playError();
      setError(err.message || "Erro ao criar usuário");
      setPinDots([]);
    } finally {
      setLoading(false);
    }
  };

  /* ── Register cliente ── */
  const handleClientFaceRegister = async (faceBase64: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.registerUser({
        username: formData.username.toLowerCase(),
        pin: "000000",
        name: formData.nome,
        role: "cliente",
        inviteCode,
        faceData: faceBase64,
        whatsapp: formData.whatsapp || undefined,
      });
      try { await api.repairLinks(); } catch {}

      sfx.playSuccess();
      localStorage.setItem("currentUser", JSON.stringify({
        username: formData.username.toLowerCase(),
        name: formData.nome,
        photo: response.user.photo,
        tipo: "cliente",
        createdBy: response.user.createdBy || null,
      }));
      onComplete();
      navigate("/cliente");
    } catch (err: any) {
      sfx.playError();
      setError(err.message || "Erro ao criar usuário");
      setFaceSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  /* ── File upload ── */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxSize = 400;
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      setFormData((prev) => ({ ...prev, foto: canvas.toDataURL("image/jpeg", 0.8) }));
      sfx.playPhotoSnap();
    };
    img.src = URL.createObjectURL(file);
    e.target.value = "";
  };

  /* ── Validations ── */
  const validateStep1VendedorMotorista = () => {
    if (!formData.foto) {
      sfx.playWarning();
      setError("Foto de perfil é obrigatória! Tire uma foto ou faça upload.");
      setTimeout(() => setError(""), 4000);
      return false;
    }
    if (userType === "vendedor" && !formData.nomeLoja.trim()) {
      sfx.playWarning();
      setError("Nome da loja é obrigatório");
      setTimeout(() => setError(""), 3000);
      return false;
    }
    if (userType === "motorista" && !formData.nome.trim()) {
      sfx.playWarning();
      setError("Nome é obrigatório");
      setTimeout(() => setError(""), 3000);
      return false;
    }
    if (!formData.username.trim()) {
      sfx.playWarning();
      setError("Nome de usuário é obrigatório");
      setTimeout(() => setError(""), 3000);
      return false;
    }
    if (usernameAvailable === false) {
      sfx.playUsernameTaken();
      setError("Este nome de usuário já está em uso! Escolha outro.");
      setTimeout(() => setError(""), 4000);
      return false;
    }
    return true;
  };

  const validateStep1Cliente = () => {
    if (!formData.nome.trim()) {
      sfx.playWarning();
      setError("Nome é obrigatório");
      setTimeout(() => setError(""), 3000);
      return false;
    }
    if (!formData.whatsapp.trim()) {
      sfx.playWarning();
      setError("Número do WhatsApp é obrigatório");
      setTimeout(() => setError(""), 3000);
      return false;
    }
    if (!formData.username.trim()) {
      sfx.playWarning();
      setError("Nome de usuário é obrigatório");
      setTimeout(() => setError(""), 3000);
      return false;
    }
    if (usernameAvailable === false) {
      sfx.playUsernameTaken();
      setError("Este nome de usuário já está em uso! Escolha outro.");
      setTimeout(() => setError(""), 4000);
      return false;
    }
    return true;
  };

  const totalSteps = userType === "cliente" ? 2 : 3;
  const currentStep = userType === "cliente" ? (step === 1 ? 1 : 2) : step;

  return (
    <div className="h-dvh bg-[#0a0a0f] flex items-center justify-center p-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div className="absolute top-0 left-1/4 w-72 h-72 bg-[#00f0ff] rounded-full blur-[100px] opacity-15" animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }} transition={{ duration: 4, repeat: Infinity }} />
        <motion.div className="absolute bottom-0 right-1/4 w-72 h-72 bg-[#ff00ff] rounded-full blur-[100px] opacity-15" animate={{ scale: [1.2, 1, 1.2], opacity: [0.15, 0.25, 0.15] }} transition={{ duration: 4, repeat: Infinity, delay: 2 }} />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "linear-gradient(rgba(0,240,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="bg-[#12121a]/95 backdrop-blur-xl border border-[#1f1f2e] rounded-2xl p-5">
          {/* No invite code */}
          {!hasValidCode ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6"
              onAnimationComplete={() => sfx.playAccessDenied()}>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#ff006e]/20 border-2 border-[#ff006e]/50 mx-auto">
                <ShieldAlert className="w-10 h-10 text-[#ff006e]" />
              </div>
              <div>
                <h2 className="text-white font-bold text-2xl mb-3">Acesso Negado</h2>
                <p className="text-gray-400 leading-relaxed">
                  Você precisa de um <span className="text-[#00f0ff] font-semibold">código de convite válido</span> para criar uma conta.
                </p>
              </div>
              <motion.button whileTap={{ scale: 0.98 }} onClick={() => { sfx.playNavigate(); navigate("/"); }}
                className="w-full py-4 bg-gradient-to-r from-[#00f0ff] to-[#8b5cf6] text-white font-bold rounded-xl flex items-center justify-center gap-2">
                <ArrowLeft className="w-5 h-5" /> Voltar para Login
              </motion.button>
            </motion.div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-5">
                <h2 className="text-white font-bold text-2xl mb-1">
                  Criar Conta {userType.charAt(0).toUpperCase() + userType.slice(1)}
                </h2>
                <p className="text-gray-400 text-sm">Passo {currentStep} de {totalSteps}</p>
                <div className="flex gap-1.5 mt-3 justify-center">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <motion.div key={i} className={`h-1 rounded-full ${i < currentStep ? "bg-gradient-to-r from-[#00f0ff] to-[#8b5cf6]" : "bg-[#1f1f2e]"}`} style={{ width: `${100 / totalSteps}%`, maxWidth: 80 }}
                      animate={i < currentStep ? { boxShadow: ["0 0 4px rgba(0,240,255,0.3)", "0 0 8px rgba(0,240,255,0.5)", "0 0 4px rgba(0,240,255,0.3)"] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  ))}
                </div>
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-[#00f0ff]/10 border border-[#00f0ff]/30 rounded-full">
                  <Check className="w-3 h-3 text-[#00f0ff]" />
                  <span className="text-[#00f0ff] text-[10px] font-mono">{inviteCode}</span>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {/* ═══ VENDEDOR/MOTORISTA — Step 1 ═══ */}
                {(userType === "vendedor" || userType === "motorista") && step === 1 && (
                  <motion.div key="vm-s1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
                    {/* Photo */}
                    <div className="flex justify-center">
                      {showCamera ? (
                        <div className="w-full">
                          <PhotoCamera
                            onCapture={(b64) => { setFormData((p) => ({ ...p, foto: b64 })); setShowCamera(false); }}
                            onCancel={() => setShowCamera(false)}
                          />
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="relative inline-block mb-3">
                            <motion.div
                              className={`w-28 h-28 rounded-full flex items-center justify-center overflow-hidden border-2 ${formData.foto ? "border-[#00ff41] shadow-[0_0_20px_rgba(0,255,65,0.3)]" : "border-[#ff006e]/50 shadow-[0_0_20px_rgba(255,0,110,0.2)]"}`}
                              animate={!formData.foto ? { borderColor: ["rgba(255,0,110,0.5)", "rgba(255,0,110,1)", "rgba(255,0,110,0.5)"] } : {}}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              {formData.foto ? (
                                <img src={formData.foto} alt="Foto" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#00f0ff]/20 to-[#8b5cf6]/20 flex items-center justify-center">
                                  <User className="w-12 h-12 text-gray-500" />
                                </div>
                              )}
                            </motion.div>
                            {formData.foto && (
                              <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => { sfx.playDelete(); setFormData((p) => ({ ...p, foto: null })); }} className="absolute -top-1 -right-1 w-6 h-6 bg-[#ff006e] rounded-full flex items-center justify-center">
                                <X className="w-3 h-3 text-white" />
                              </motion.button>
                            )}
                          </div>
                          <div className="flex gap-2 justify-center">
                            <motion.button whileTap={{ scale: 0.95 }} onClick={() => { sfx.playClick(); setShowCamera(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#00f0ff] to-[#8b5cf6] text-white rounded-xl text-xs font-bold">
                              <Camera className="w-3.5 h-3.5" /> Câmera
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.95 }} onClick={() => { sfx.playClick(); fileInputRef.current?.click(); }} className="flex items-center gap-1.5 px-4 py-2 bg-[#1f1f2e] border border-[#2a2a3e] text-gray-300 rounded-xl text-xs font-bold">
                              <Upload className="w-3.5 h-3.5" /> Galeria
                            </motion.button>
                          </div>
                          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                          {!formData.foto && (
                            <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="text-[#ff006e] text-[10px] mt-2 font-semibold">
                              ⚠ Foto obrigatória para cadastro
                            </motion.p>
                          )}
                        </div>
                      )}
                    </div>

                    {!showCamera && (
                      <>
                        {userType === "vendedor" && (
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome da Loja</label>
                            <input type="text" value={formData.nomeLoja} onChange={(e) => setFormData((p) => ({ ...p, nomeLoja: e.target.value }))} className="w-full px-4 py-3 bg-[#1f1f2e] border border-[#2a2a3e] rounded-xl text-white focus:outline-none focus:border-[#00f0ff] text-sm" placeholder="Ex: Loja Tech Center" />
                          </div>
                        )}
                        {userType === "motorista" && (
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome Completo</label>
                            <input type="text" value={formData.nome} onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))} className="w-full px-4 py-3 bg-[#1f1f2e] border border-[#2a2a3e] rounded-xl text-white focus:outline-none focus:border-[#00f0ff] text-sm" placeholder="Digite seu nome" />
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1.5">WhatsApp</label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input type="tel" value={formData.whatsapp} onChange={(e) => setFormData((p) => ({ ...p, whatsapp: e.target.value }))} className="w-full pl-10 pr-4 py-3 bg-[#1f1f2e] border border-[#2a2a3e] rounded-xl text-white focus:outline-none focus:border-[#00f0ff] text-sm" placeholder="(00) 00000-0000" />
                          </div>
                        </div>
                        <UsernameInput
                          value={formData.username}
                          onChange={(v) => setFormData((p) => ({ ...p, username: v }))}
                          onAvailabilityChange={setUsernameAvailable}
                        />
                        <motion.button whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            if (validateStep1VendedorMotorista()) {
                              sfx.playStepForward();
                              setStep(2);
                            }
                          }}
                          className={`w-full py-3.5 font-bold rounded-xl text-sm transition-all ${
                            usernameAvailable === false
                              ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                              : "bg-gradient-to-r from-[#00f0ff] to-[#8b5cf6] text-white shadow-[0_0_25px_rgba(0,240,255,0.3)]"
                          }`}
                          disabled={usernameAvailable === false}
                        >
                          Continuar
                        </motion.button>
                      </>
                    )}
                  </motion.div>
                )}

                {/* ═══ CLIENTE — Step 1 ═══ */}
                {userType === "cliente" && step === 1 && (
                  <motion.div key="c-s1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
                    <div className="text-center mb-2">
                      <motion.div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00f0ff] to-[#8b5cf6] mb-3"
                        animate={{ boxShadow: ["0 0 15px rgba(0,240,255,0.3)", "0 0 30px rgba(0,240,255,0.5)", "0 0 15px rgba(0,240,255,0.3)"] }}
                        transition={{ duration: 2, repeat: Infinity }}>
                        <User className="w-8 h-8 text-white" />
                      </motion.div>
                      <p className="text-gray-400 text-xs">Preencha seus dados para continuar</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome Completo</label>
                      <input type="text" value={formData.nome} onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))} className="w-full px-4 py-3 bg-[#1f1f2e] border border-[#2a2a3e] rounded-xl text-white focus:outline-none focus:border-[#00f0ff] text-sm" placeholder="Digite seu nome completo" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Número WhatsApp</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input type="tel" value={formData.whatsapp} onChange={(e) => setFormData((p) => ({ ...p, whatsapp: e.target.value }))} className="w-full pl-10 pr-4 py-3 bg-[#1f1f2e] border border-[#2a2a3e] rounded-xl text-white focus:outline-none focus:border-[#00f0ff] text-sm" placeholder="(00) 00000-0000" />
                      </div>
                    </div>
                    <UsernameInput
                      value={formData.username}
                      onChange={(v) => setFormData((p) => ({ ...p, username: v }))}
                      onAvailabilityChange={setUsernameAvailable}
                    />
                    <motion.button whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (validateStep1Cliente()) {
                          sfx.playStepForward();
                          setStep(2);
                        }
                      }}
                      className={`w-full py-3.5 font-bold rounded-xl text-sm transition-all ${
                        usernameAvailable === false
                          ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-[#00f0ff] to-[#8b5cf6] text-white shadow-[0_0_25px_rgba(0,240,255,0.3)]"
                      }`}
                      disabled={usernameAvailable === false}
                    >
                      Continuar
                    </motion.button>
                  </motion.div>
                )}

                {/* ═══ CLIENTE — Step 2: Auto Face ═══ */}
                {userType === "cliente" && step === 2 && (
                  <motion.div key="c-s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                    {!faceSuccess ? (
                      <>
                        <div className="text-center mb-2">
                          <h3 className="text-white font-bold text-lg mb-0.5">Reconhecimento Facial</h3>
                          <p className="text-gray-400 text-xs">Posicione seu rosto na área oval — a captura é automática</p>
                        </div>
                        <AutoFaceCamera
                          onCapture={(base64) => {
                            setFormData((p) => ({ ...p, faceData: base64 }));
                            setFaceSuccess(true);
                            handleClientFaceRegister(base64);
                          }}
                          onCancel={() => { setStep(1); sfx.playStepBack(); }}
                        />
                      </>
                    ) : (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-4">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#00ff41]/20 border-2 border-[#00ff41]/50">
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.5 }}>
                            <Sparkles className="w-12 h-12 text-[#00ff41]" />
                          </motion.div>
                        </motion.div>
                        <div>
                          <h3 className="text-[#00ff41] font-bold text-xl mb-1">Rosto Registrado!</h3>
                          <p className="text-gray-400 text-sm">Ativando sua conta...</p>
                        </div>
                        {formData.faceData && (
                          <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-[#00ff41]/30">
                            <img src={formData.faceData} alt="Face" className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
                          </div>
                        )}
                        {loading && (
                          <div className="flex items-center justify-center gap-2 text-[#00f0ff] text-sm">
                            <Loader className="w-4 h-4 animate-spin" /> Criando conta...
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* ═══ VENDEDOR/MOTORISTA — Step 2 & 3: PIN ═══ */}
                {(userType === "vendedor" || userType === "motorista") && (step === 2 || step === 3) && (
                  <motion.div key={`pin-${step}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00f0ff] to-[#8b5cf6] mb-3">
                        <Lock className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-white font-bold text-lg mb-1">{step === 2 ? "Criar PIN" : "Confirmar PIN"}</h3>
                      <p className="text-gray-400 text-sm">{step === 2 ? "Digite um PIN de 6 dígitos" : "Digite novamente para confirmar"}</p>
                    </div>
                    <div className="flex justify-center gap-3">
                      {[...Array(6)].map((_, i) => (
                        <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 }}
                          className={`w-4 h-4 rounded-full border-2 transition-all ${pinDots[i] !== undefined ? "bg-[#00f0ff] border-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.5)]" : "border-gray-600"}`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <motion.button key={num} whileTap={{ scale: 0.9 }} onClick={() => handlePinInput(num)} className="aspect-square rounded-xl bg-[#1f1f2e] border border-[#2a2a3e] text-white text-xl font-bold hover:bg-[#2a2a3e] hover:border-[#00f0ff] transition-all">
                          {num}
                        </motion.button>
                      ))}
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => { sfx.playStepBack(); setPinDots([]); setStep(step === 3 ? 2 : 1); }} className="aspect-square rounded-xl bg-[#1f1f2e] border border-[#2a2a3e] text-gray-400 text-xs font-bold">Voltar</motion.button>
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => handlePinInput(0)} className="aspect-square rounded-xl bg-[#1f1f2e] border border-[#2a2a3e] text-white text-xl font-bold hover:bg-[#2a2a3e] hover:border-[#00f0ff] transition-all">0</motion.button>
                      <motion.button whileTap={{ scale: 0.9 }} onClick={handleDeletePin} className="aspect-square rounded-xl bg-[#ff006e]/20 border border-[#ff006e] text-[#ff006e] text-xl font-bold">←</motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 p-3 bg-[#ff006e]/10 border border-[#ff006e]/30 rounded-xl">
                    <p className="text-[#ff006e] text-xs text-center font-medium flex items-center justify-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {loading && !faceSuccess && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-[#00f0ff] text-sm text-center flex items-center justify-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" /> Criando usuário...
                </motion.div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}