import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Zap, Lock, Code, ArrowRight, Database, Trash2, Fingerprint, Shield, Eye, ScanFace, Camera, AlertTriangle, X, Check } from "lucide-react";
import * as api from "../services/api";
import * as sfx from "../services/sounds";
import { registerPushSubscription } from "../services/pwa";
import { projectId, publicAnonKey } from "/utils/supabase/info";

// Interactive particle that follows mouse
function useMousePosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);
  return pos;
}

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "code">("login");
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [pinDots, setPinDots] = useState<number[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [initLoading, setInitLoading] = useState(false);
  const [initMessage, setInitMessage] = useState("");
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [faceStream, setFaceStream] = useState<MediaStream | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceVerifying, setFaceVerifying] = useState(false);
  const [faceResult, setFaceResult] = useState<"success" | "fail" | null>(null);
  const [storedFaceData, setStoredFaceData] = useState<string | null>(null);
  const faceVideoRef = useRef<HTMLVideoElement>(null);
  const faceCanvasRef = useRef<HTMLCanvasElement>(null);
  const faceStreamRef = useRef<MediaStream | null>(null);
  const navigate = useNavigate();
  const mouse = useMousePosition();
  const containerRef = useRef<HTMLDivElement>(null);
  const rippleId = useRef(0);

  // Auto-redirect if already logged in (persistent session)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("currentUser");
      if (stored) {
        const user = JSON.parse(stored);
        const role = user.role || user.tipo;
        if (role) {
          navigate(`/${role}`, { replace: true });
        }
      }
    } catch (_) {}
  }, [navigate]);

  // Click ripple effect
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const id = rippleId.current++;
    setRipples((prev) => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top, id }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 1500);
  }, []);

  const handleInitDatabase = async () => {
    setInitLoading(true);
    setInitMessage("");
    try {
      const response = await api.initDatabase();
      setInitMessage("OK " + response.message);
      setTimeout(() => setInitMessage(""), 3000);
    } catch (error: any) {
      setInitMessage("ERRO: " + error.message);
    } finally {
      setInitLoading(false);
    }
  };

  const handleDebugDB = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-42377006/debug/all`, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await response.json();
      if (result.success) {
        alert(`BANCO DE DADOS:\n\nAdmin: ${result.data.admin ? "EXISTE" : "NAO EXISTE"}\nVendedores: ${result.data.vendedores?.length || 0}\nClientes: ${result.data.clientes?.length || 0}\nMotoristas: ${result.data.motoristas?.length || 0}\nCodigos Vendedor: ${result.data.codesVendedor?.length || 0}\nCodigos Cliente: ${result.data.codesCliente?.length || 0}\nCodigos Motorista: ${result.data.codesMotorista?.length || 0}`);
      } else {
        alert("Erro: " + result.error);
      }
    } catch (error: any) {
      alert("Erro de conexao: " + error.message);
    }
  };

  const handleForceInit = async () => {
    setInitLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-42377006/force-init`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await response.json();
      if (result.success) {
        setInitMessage("OK " + result.message);
        alert("Admin criado com sucesso!");
      } else {
        setInitMessage("ERRO: " + result.error);
      }
    } catch (error: any) {
      setInitMessage("ERRO: " + error.message);
    } finally {
      setInitLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!confirm("ATENCAO: Isso vai remover TODAS as contas (exceto admin) e TODOS os codigos. Continuar?")) return;
    setCleanupLoading(true);
    try {
      const response = await api.cleanup();
      setInitMessage(`OK ${response.message}`);
      alert(`Limpeza concluida!\nVendedores: ${response.removed?.vendedores || 0}\nClientes: ${response.removed?.clientes || 0}\nMotoristas: ${response.removed?.motoristas || 0}`);
    } catch (error: any) {
      setInitMessage("ERRO: " + error.message);
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleUsernameSubmit = async () => {
    if (!username.trim()) { sfx.playWarning(); setError("Digite um nome de usuario"); return; }
    setLoading(true);
    setError("");
    try {
      const response = await api.loginStep1(username.toLowerCase());
      if (response.success) {
        sfx.playStepForward();
        setUserData(response.user);
        if (response.user.role === "cliente") {
          try {
            const faceRes = await api.loginFaceVerify(username.toLowerCase());
            if (faceRes.success && faceRes.faceData) {
              setStoredFaceData(faceRes.faceData);
              if (faceRes.user) setUserData(faceRes.user);
              setStep(3);
            } else {
              sfx.playError();
              setError("Dados faciais não encontrados. Contate seu vendedor.");
            }
          } catch (faceErr: any) {
            sfx.playError();
            setError(faceErr.message || "Erro ao buscar dados faciais");
          }
        } else {
          setStep(2);
        }
      }
    } catch (err: any) {
      sfx.playError();
      setError(err.message || "Usuario nao encontrado");
    } finally {
      setLoading(false);
    }
  };

  const handlePinInput = (digit: number) => {
    if (pinDots.length < 6) {
      const newPinDots = [...pinDots, digit];
      setPinDots(newPinDots);
      sfx.playPinDigit(newPinDots.length - 1);
      if (newPinDots.length === 6) {
        // Request permission immediately during the user gesture to avoid silent browser blocks
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }
        setTimeout(() => handleLogin(newPinDots.join("")), 300);
      }
    }
  };

  const handleDeletePin = () => { sfx.playPinDelete(); setPinDots(pinDots.slice(0, -1)); setError(""); };

  const handleLogin = async (pin: string) => {
    if (!userData) { setError("Usuario nao encontrado"); setPinDots([]); return; }
    setLoading(true);
    setError("");
    try {
      const response = await api.loginStep2(userData.username, pin);
      if (response.success) {
        sfx.playSuccess();
        localStorage.setItem("currentUser", JSON.stringify({
          username: response.user.username,
          name: response.user.name,
          photo: response.user.photo,
          role: response.user.role,
          tipo: response.user.role,
          createdBy: response.user.createdBy || null,
        }));
        // Register push notifications — delay slightly to ensure SW is ready
        setTimeout(() => {
          registerPushSubscription(response.user.username).then(success => {
            console.log("[LOGIN] Push registration result:", success);
            if (!success) {
              // Retry after 5s
              setTimeout(() => registerPushSubscription(response.user.username), 5000);
            }
          }).catch(e => console.log("Push registration deferred:", e));
        }, 1500);
        navigate(`/${response.user.role}`);
      }
    } catch (err: any) {
      sfx.playError();
      setError(err.message || "PIN incorreto");
      setPinDots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async () => {
    if (!inviteCode.trim()) { sfx.playWarning(); setCodeError("Digite um codigo"); return; }
    setLoading(true);
    setCodeError("");
    try {
      const response = await api.validateInviteCode(inviteCode.trim());
      if (response.success) {
        sfx.playCodeAccepted();
        const code = inviteCode.trim();
        navigate(`/register/${response.type}?inviteCode=${encodeURIComponent(code)}`, { state: { inviteCode: code } });
      }
    } catch (err: any) {
      sfx.playError();
      setCodeError(err.message || "Codigo invalido ou ja utilizado");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToUsername = () => {
    sfx.playStepBack();
    setStep(1); setPinDots([]); setError("");
    setFaceResult(null); setFaceVerifying(false); setStoredFaceData(null);
    faceStream?.getTracks().forEach(t => t.stop());
    faceStreamRef.current?.getTracks().forEach(t => t.stop());
    faceStreamRef.current = null;
    setFaceStream(null);
  };

  const startFaceCamera = async () => {
    // Stop any existing stream first
    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach(t => t.stop());
      faceStreamRef.current = null;
    }
    setFaceDetected(false);
    setFaceResult(null);
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      faceStreamRef.current = stream;
      setFaceStream(stream);
      // Use requestAnimationFrame loop to wait for the video element to appear in DOM
      const assignStream = () => {
        if (faceVideoRef.current) {
          faceVideoRef.current.srcObject = stream;
          faceVideoRef.current.play().catch(() => {});
        } else {
          requestAnimationFrame(assignStream);
        }
      };
      assignStream();
    } catch {
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  // Also assign stream when video element appears after render
  useEffect(() => {
    if (faceStream && faceVideoRef.current && !faceVideoRef.current.srcObject) {
      faceVideoRef.current.srcObject = faceStream;
      faceVideoRef.current.play().catch(() => {});
    }
  }, [faceStream]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      faceStreamRef.current?.getTracks().forEach(t => t.stop());
      faceStreamRef.current = null;
    };
  }, []);

  // Face detection for login camera
  useEffect(() => {
    if (step !== 3 || !faceStream) return;
    const interval = setInterval(() => {
      const video = faceVideoRef.current;
      const canvas = faceCanvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = 160; canvas.height = 120;
      ctx.drawImage(video, 0, 0, 160, 120);
      const centerData = ctx.getImageData(30, 15, 100, 90);
      const pixels = centerData.data;
      let skinToneCount = 0;
      const totalPixels = pixels.length / 4;
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        if (r > 60 && g > 40 && b > 20 && r > b && (r - g) > -50 && Math.abs(r - g) < 110) skinToneCount++;
      }
      const skinRatio = skinToneCount / totalPixels;
      setFaceDetected(skinRatio > 0.12);
    }, 500);
    return () => clearInterval(interval);
  }, [step, faceStream]);

  const handleFaceVerify = async () => {
    if (!faceVideoRef.current || !storedFaceData) return;
    sfx.playScanBeep();
    setFaceVerifying(true);
    setError("");

    // Request notification permission immediately during the click gesture
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    // Capture current frame
    const canvas = document.createElement("canvas");
    canvas.width = 480; canvas.height = 360;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(faceVideoRef.current, 0, 0, 480, 360);
    const capturedBase64 = canvas.toDataURL("image/jpeg", 0.8);

    // Compare faces using color histogram similarity
    try {
      const similarity = await compareFaces(storedFaceData, capturedBase64);
      console.log("📸 Face similarity:", similarity);

      // Stop camera
      faceStream?.getTracks().forEach(t => t.stop());
      faceStreamRef.current?.getTracks().forEach(t => t.stop());
      faceStreamRef.current = null;
      setFaceStream(null);

      if (similarity > 0.55) {
        sfx.playFaceMatch();
        setFaceResult("success");
        setTimeout(() => {
          sfx.playSuccess();
          if (userData) {
            localStorage.setItem("currentUser", JSON.stringify({
              username: userData.username,
              name: userData.name,
              photo: userData.photo,
              role: userData.role,
              tipo: userData.role,
              createdBy: userData.createdBy || null,
            }));
            // Register push notifications — delay slightly to ensure SW is ready
            setTimeout(() => {
              registerPushSubscription(userData.username).then(s => {
                if (!s) setTimeout(() => registerPushSubscription(userData.username), 5000);
              }).catch(() => {});
            }, 1500);
            navigate(`/${userData.role}`);
          }
        }, 1500);
      } else {
        sfx.playFaceFail();
        setFaceResult("fail");
      }
    } catch (err) {
      console.error("Erro na verificação facial:", err);
      sfx.playFaceFail();
      setFaceResult("fail");
    } finally {
      setFaceVerifying(false);
    }
  };

  // Compare two base64 images using color histogram
  const compareFaces = (stored: string, captured: string): Promise<number> => {
    return new Promise((resolve) => {
      const loadImage = (src: string): Promise<HTMLImageElement> =>
        new Promise((res) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => res(img);
          img.onerror = () => res(img);
          img.src = src;
        });

      Promise.all([loadImage(stored), loadImage(captured)]).then(([img1, img2]) => {
        const getHistogram = (img: HTMLImageElement) => {
          const c = document.createElement("canvas");
          c.width = 64; c.height = 64;
          const ctx = c.getContext("2d")!;
          ctx.drawImage(img, 0, 0, 64, 64);
          const data = ctx.getImageData(0, 0, 64, 64).data;
          const bins = 16;
          const histR = new Float32Array(bins);
          const histG = new Float32Array(bins);
          const histB = new Float32Array(bins);
          for (let i = 0; i < data.length; i += 4) {
            histR[Math.floor(data[i] / 256 * bins)]++;
            histG[Math.floor(data[i + 1] / 256 * bins)]++;
            histB[Math.floor(data[i + 2] / 256 * bins)]++;
          }
          // Normalize
          const total = data.length / 4;
          for (let i = 0; i < bins; i++) { histR[i] /= total; histG[i] /= total; histB[i] /= total; }
          return { histR, histG, histB };
        };

        const correlate = (a: Float32Array, b: Float32Array) => {
          let sumAB = 0, sumA2 = 0, sumB2 = 0;
          const meanA = a.reduce((s, v) => s + v, 0) / a.length;
          const meanB = b.reduce((s, v) => s + v, 0) / b.length;
          for (let i = 0; i < a.length; i++) {
            const da = a[i] - meanA, db = b[i] - meanB;
            sumAB += da * db; sumA2 += da * da; sumB2 += db * db;
          }
          const denom = Math.sqrt(sumA2 * sumB2);
          return denom === 0 ? 0 : sumAB / denom;
        };

        const h1 = getHistogram(img1);
        const h2 = getHistogram(img2);
        const corrR = correlate(h1.histR, h2.histR);
        const corrG = correlate(h1.histG, h2.histG);
        const corrB = correlate(h1.histB, h2.histB);
        const avg = (corrR + corrG + corrB) / 3;
        resolve(Math.max(0, Math.min(1, (avg + 1) / 2))); // Normalize to 0-1
      });
    });
  };

  const getUserInitial = () => {
    if (userData?.name) return userData.name.charAt(0).toUpperCase();
    return username.charAt(0).toUpperCase() || "?";
  };

  // Memoize particles to avoid re-renders changing their random positions
  const particles = useMemo(() => {
    const colors = ["#00f0ff", "#ff00ff", "#8b5cf6", "#00ff41", "#ff006e"];
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      w: 1 + Math.random() * 3,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      yMove: -(20 + Math.random() * 40),
      xMove: (Math.random() - 0.5) * 30,
      scaleTo: 1 + Math.random(),
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 8,
      glow: 4 + Math.random() * 8,
    }));
  }, []);

  return (
    <div
      ref={containerRef}
      onClick={handleBackgroundClick}
      className="h-dvh bg-[#050508] flex items-center justify-center relative overflow-hidden select-none"
    >
      {/* === ANIMATED BACKGROUND LAYER === */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Animated grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(0,240,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.5) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />

        {/* Mouse-following glow - hidden on mobile (touch) */}
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full pointer-events-none hidden md:block"
          animate={{ x: mouse.x - 250, y: mouse.y - 250 }}
          transition={{ type: "spring", damping: 30, stiffness: 200 }}
          style={{
            background: "radial-gradient(circle, rgba(0,240,255,0.08) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)",
          }}
        />

        {/* Main orbs - smaller on mobile */}
        <motion.div
          className="absolute top-[-10%] left-[10%] w-[250px] h-[250px] md:w-[500px] md:h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,240,255,0.15) 0%, transparent 60%)" }}
          animate={{
            x: [0, 80, -40, 0], y: [0, 60, -30, 0],
            scale: [1, 1.3, 0.9, 1], opacity: [0.15, 0.3, 0.1, 0.15],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-10%] right-[10%] w-[250px] h-[250px] md:w-[500px] md:h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,0,255,0.12) 0%, transparent 60%)" }}
          animate={{
            x: [0, -60, 40, 0], y: [0, -50, 30, 0],
            scale: [1.2, 0.8, 1.4, 1.2], opacity: [0.12, 0.25, 0.08, 0.12],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        />
        <motion.div
          className="absolute top-[40%] left-[50%] w-[200px] h-[200px] md:w-[400px] md:h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 60%)" }}
          animate={{
            x: [-100, -60, -140, -100], y: [-100, -65, -130, -100],
            scale: [1, 1.5, 0.7, 1], rotate: [0, 180, 360],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        {/* Floating particles - reduced count */}
        {particles.map((p) => (
          <motion.div
            key={`p-${p.id}`}
            className="absolute rounded-full"
            style={{
              width: p.w,
              height: p.w,
              left: p.left,
              top: p.top,
              backgroundColor: p.color,
              boxShadow: `0 0 ${p.glow}px ${p.color}`,
            }}
            animate={{
              y: [0, p.yMove, 0],
              x: [0, p.xMove, 0],
              opacity: [0, 0.8, 0],
              scale: [0, p.scaleTo, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Floating hexagons - fewer on mobile */}
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={`hex-${i}`}
            className="absolute border border-[#00f0ff]/10 rotate-45 hidden sm:block"
            style={{
              width: 40 + i * 20,
              height: 40 + i * 20,
              left: `${15 + i * 14}%`,
              top: `${10 + (i % 3) * 30}%`,
              borderRadius: "8px",
            }}
            animate={{
              rotate: [45, 135, 225, 315, 405],
              opacity: [0.05, 0.15, 0.05],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 10 + i * 3,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}

        {/* Scan line effect */}
        <motion.div
          className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00f0ff]/20 to-transparent"
          animate={{ top: ["-5%", "105%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Click ripple effects */}
      {ripples.map((r) => (
        <motion.div
          key={r.id}
          className="absolute rounded-full border pointer-events-none"
          style={{ left: r.x, top: r.y, borderColor: "#00f0ff" }}
          initial={{ width: 0, height: 0, opacity: 0.6, x: 0, y: 0 }}
          animate={{ width: 300, height: 300, opacity: 0, x: -150, y: -150 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      ))}

      {/* === MAIN CONTENT === */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md px-5 flex flex-col items-center max-h-dvh py-4"
      >
        {/* Logo Section */}
        <div className="text-center mb-4 shrink-0">
          <motion.div
            className="relative inline-flex items-center justify-center w-16 h-16 md:w-24 md:h-24 mb-3"
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Outer rotating ring */}
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: "conic-gradient(from 0deg, #00f0ff, #8b5cf6, #ff00ff, #00ff41, #00f0ff)",
                padding: "2px",
              }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            >
              <div className="w-full h-full rounded-2xl bg-[#0a0a12]" />
            </motion.div>
            {/* Inner icon */}
            <motion.div
              className="absolute inset-[3px] rounded-[14px] bg-gradient-to-br from-[#00f0ff] to-[#8b5cf6] flex items-center justify-center"
              animate={{
                boxShadow: [
                  "0 0 20px rgba(0,240,255,0.4), 0 0 40px rgba(139,92,246,0.2), inset 0 0 20px rgba(255,255,255,0.1)",
                  "0 0 40px rgba(139,92,246,0.5), 0 0 60px rgba(0,240,255,0.3), inset 0 0 30px rgba(255,255,255,0.15)",
                  "0 0 20px rgba(0,240,255,0.4), 0 0 40px rgba(139,92,246,0.2), inset 0 0 20px rgba(255,255,255,0.1)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Zap className="w-7 h-7 md:w-10 md:h-10 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
            </motion.div>
          </motion.div>

          <motion.h1
            className="text-3xl md:text-4xl font-black tracking-tight mb-1"
            whileHover={{ scale: 1.02 }}
          >
            <motion.span
              className="bg-gradient-to-r from-[#00f0ff] via-[#8b5cf6] to-[#ff00ff] bg-clip-text text-transparent bg-[length:200%_auto]"
              animate={{ backgroundPosition: ["0% center", "200% center"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              DELIVERY TECH
            </motion.span>
          </motion.h1>
          <motion.p
            className="text-gray-500 text-xs md:text-sm tracking-widest uppercase"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Sistema de Gestao Avancado
          </motion.p>
        </div>

        {/* Main Card */}
        <motion.div
          className="relative rounded-2xl overflow-hidden w-full shrink-0"
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {/* Card border glow */}
          <motion.div
            className="absolute inset-0 rounded-2xl p-[1px]"
            style={{ background: "conic-gradient(from 0deg, #00f0ff40, #8b5cf640, #ff00ff40, #00f0ff40)" }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          />
          <div className="relative bg-[#0c0c14]/95 backdrop-blur-xl rounded-2xl p-5 md:p-8 m-[1px]">
            {/* Mode Tabs */}
            <div className="flex gap-2 mb-5">
              {[
                { id: "login" as const, label: "Acessar Conta", icon: <Lock className="w-4 h-4" /> },
                { id: "code" as const, label: "Inserir Codigo", icon: <Code className="w-4 h-4" /> },
              ].map((tab) => (
                <motion.button
                  key={tab.id}
                  onClick={() => { sfx.playNavigate(); setMode(tab.id); setStep(1); setPinDots([]); setError(""); setCodeError(""); }}
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                    mode === tab.id
                      ? "text-white shadow-[0_0_25px_rgba(0,240,255,0.3)]"
                      : "bg-[#12121a] text-gray-500 hover:text-gray-300 border border-[#1f1f2e] hover:border-[#2a2a3e]"
                  }`}
                  style={mode === tab.id ? {
                    background: "linear-gradient(135deg, #00f0ff 0%, #8b5cf6 100%)",
                  } : undefined}
                >
                  <div className="flex items-center justify-center gap-2">
                    {tab.icon}
                    {tab.label}
                  </div>
                </motion.button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* LOGIN STEP 1 - Username */}
              {mode === "login" && step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -30, filter: "blur(10px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: 30, filter: "blur(10px)" }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-3">
                    <motion.div
                      className="relative inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 mb-3"
                      whileHover={{ scale: 1.1 }}
                    >
                      {/* Rotating border */}
                      <motion.div
                        className="absolute inset-0 rounded-2xl"
                        style={{ background: "conic-gradient(from 0deg, #00f0ff, transparent 40%, #8b5cf6, transparent 80%, #00f0ff)" }}
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      />
                      <div className="absolute inset-[2px] rounded-[14px] bg-[#0c0c14] flex items-center justify-center">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Fingerprint className="w-7 h-7 md:w-9 md:h-9 text-[#00f0ff]" />
                        </motion.div>
                      </div>
                    </motion.div>
                    <h3 className="text-white font-bold text-lg">Identificacao</h3>
                    <p className="text-gray-500 text-sm mt-1">Digite seu nome de usuario</p>
                  </div>

                  <div className="relative group">
                    <motion.div
                      className="absolute -inset-[1px] rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
                      style={{ background: "linear-gradient(135deg, #00f0ff, #8b5cf6)" }}
                      animate={{ opacity: [0, 0.5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUsernameSubmit()}
                      className="relative w-full px-5 py-4 bg-[#12121a] border border-[#1f1f2e] rounded-xl text-white text-base placeholder-gray-600 focus:outline-none focus:border-[#00f0ff] focus:shadow-[0_0_20px_rgba(0,240,255,0.15)] transition-all duration-300"
                      placeholder="@usuario"
                      autoFocus
                    />
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[#ff006e] text-sm text-center"
                    >
                      {error}
                    </motion.p>
                  )}

                  <motion.button
                    onClick={handleUsernameSubmit}
                    disabled={loading}
                    whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(0,240,255,0.4)" }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-4 rounded-xl font-bold text-white text-base flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #00f0ff 0%, #8b5cf6 100%)" }}
                  >
                    {loading ? (
                      <motion.div
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <>
                        Continuar
                        <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                          <ArrowRight className="w-5 h-5" />
                        </motion.span>
                      </>
                    )}
                  </motion.button>
                </motion.div>
              )}

              {/* LOGIN STEP 2 - PIN with Avatar */}
              {mode === "login" && step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 30, filter: "blur(10px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -30, filter: "blur(10px)" }}
                  transition={{ duration: 0.4 }}
                  className="space-y-3"
                >
                  {/* User Avatar with GREEN vibrant rotating border */}
                  <div className="text-center">
                    <motion.div
                      className="relative inline-flex items-center justify-center w-20 h-20 md:w-28 md:h-28 mb-2"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {/* Outer spinning green ring */}
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: "conic-gradient(from 0deg, #00ff41, #00f0ff, #00ff41, transparent, #00ff41)",
                        }}
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      />
                      {/* Second counter-rotating ring */}
                      <motion.div
                        className="absolute inset-[2px] rounded-full"
                        style={{
                          background: "conic-gradient(from 180deg, transparent, #00ff41, transparent, #00f0ff, transparent)",
                        }}
                        animate={{ rotate: [360, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                      />
                      {/* Pulsing green glow */}
                      <motion.div
                        className="absolute inset-[-4px] rounded-full"
                        animate={{
                          boxShadow: [
                            "0 0 15px rgba(0,255,65,0.3), 0 0 30px rgba(0,255,65,0.15), 0 0 45px rgba(0,240,255,0.1)",
                            "0 0 25px rgba(0,255,65,0.5), 0 0 50px rgba(0,255,65,0.25), 0 0 75px rgba(0,240,255,0.15)",
                            "0 0 15px rgba(0,255,65,0.3), 0 0 30px rgba(0,255,65,0.15), 0 0 45px rgba(0,240,255,0.1)",
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      {/* Avatar inner circle */}
                      <div className="absolute inset-[4px] rounded-full bg-[#0c0c14] flex items-center justify-center overflow-hidden">
                        {userData?.photo ? (
                          <img
                            src={userData.photo}
                            alt={userData.name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <motion.div
                            className="w-full h-full rounded-full bg-gradient-to-br from-[#00f0ff]/30 via-[#8b5cf6]/20 to-[#ff00ff]/30 flex items-center justify-center"
                            animate={{
                              background: [
                                "linear-gradient(135deg, rgba(0,240,255,0.3), rgba(139,92,246,0.2), rgba(255,0,255,0.3))",
                                "linear-gradient(270deg, rgba(0,255,65,0.3), rgba(0,240,255,0.2), rgba(139,92,246,0.3))",
                                "linear-gradient(135deg, rgba(0,240,255,0.3), rgba(139,92,246,0.2), rgba(255,0,255,0.3))",
                              ],
                            }}
                            transition={{ duration: 4, repeat: Infinity }}
                          >
                            <span className="text-3xl font-black text-white drop-shadow-[0_0_15px_rgba(0,255,65,0.5)]">
                              {getUserInitial()}
                            </span>
                          </motion.div>
                        )}
                      </div>
                      {/* Online indicator dot */}
                      <motion.div
                        className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-[#00ff41] rounded-full border-2 border-[#0c0c14]"
                        animate={{
                          scale: [1, 1.3, 1],
                          boxShadow: [
                            "0 0 5px rgba(0,255,65,0.5)",
                            "0 0 15px rgba(0,255,65,0.8)",
                            "0 0 5px rgba(0,255,65,0.5)",
                          ],
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    </motion.div>

                    <motion.h3
                      className="text-white font-bold text-base"
                      animate={{ textShadow: ["0 0 10px rgba(0,240,255,0)", "0 0 10px rgba(0,240,255,0.3)", "0 0 10px rgba(0,240,255,0)"] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {userData?.name || username}
                    </motion.h3>
                    <p className="text-gray-500 text-sm mt-0.5">@{userData?.username || username}</p>
                    <p className="text-[#00f0ff] text-xs mt-1.5 flex items-center justify-center gap-1">
                      <Shield className="w-3 h-3" />
                      Digite seu PIN de 6 digitos
                    </p>
                  </div>

                  {/* PIN Dots */}
                  <div className="flex justify-center gap-3.5">
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="relative"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: i * 0.06, type: "spring" }}
                      >
                        <motion.div
                          className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                            pinDots[i] !== undefined
                              ? "bg-[#00f0ff] border-[#00f0ff]"
                              : "border-[#2a2a3e]"
                          }`}
                          animate={pinDots[i] !== undefined ? {
                            scale: [1, 1.4, 1],
                            boxShadow: [
                              "0 0 8px rgba(0,240,255,0.5)",
                              "0 0 20px rgba(0,240,255,0.8)",
                              "0 0 8px rgba(0,240,255,0.5)",
                            ],
                          } : {}}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      </motion.div>
                    ))}
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0, color: ["#ff006e", "#ff4488", "#ff006e"] }}
                      transition={{ color: { duration: 1, repeat: Infinity } }}
                      className="text-sm text-center font-medium"
                    >
                      {error}
                    </motion.p>
                  )}

                  {/* PIN Pad */}
                  <div className="grid grid-cols-3 gap-2.5 mx-auto">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <motion.button
                        key={num}
                        whileHover={{
                          scale: 1.08,
                          borderColor: "#00f0ff",
                          boxShadow: "0 0 20px rgba(0,240,255,0.2)",
                        }}
                        whileTap={{
                          scale: 0.9,
                          boxShadow: "0 0 30px rgba(0,240,255,0.4)",
                          backgroundColor: "rgba(0,240,255,0.15)",
                        }}
                        onClick={() => handlePinInput(num)}
                        className="h-14 rounded-xl bg-[#12121a] border border-[#1f1f2e] text-white text-xl font-bold transition-colors duration-150"
                      >
                        {num}
                      </motion.button>
                    ))}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleBackToUsername}
                      className="h-14 rounded-xl bg-[#12121a] border border-[#1f1f2e] text-gray-500 text-xs font-bold hover:text-white hover:border-[#8b5cf6] transition-all"
                    >
                      Voltar
                    </motion.button>
                    <motion.button
                      whileHover={{
                        scale: 1.08,
                        borderColor: "#00f0ff",
                        boxShadow: "0 0 20px rgba(0,240,255,0.2)",
                      }}
                      whileTap={{
                        scale: 0.9,
                        boxShadow: "0 0 30px rgba(0,240,255,0.4)",
                        backgroundColor: "rgba(0,240,255,0.15)",
                      }}
                      onClick={() => handlePinInput(0)}
                      className="h-14 rounded-xl bg-[#12121a] border border-[#1f1f2e] text-white text-xl font-bold transition-colors duration-150"
                    >
                      0
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05, borderColor: "#ff006e" }}
                      whileTap={{ scale: 0.9, boxShadow: "0 0 20px rgba(255,0,110,0.3)" }}
                      onClick={handleDeletePin}
                      className="h-14 rounded-xl bg-[#ff006e]/10 border border-[#ff006e]/30 text-[#ff006e] text-xl font-bold hover:bg-[#ff006e]/20 transition-all"
                    >
                      &#8592;
                    </motion.button>
                  </div>

                  {loading && (
                    <div className="flex justify-center">
                      <motion.div
                        className="w-7 h-7 border-2 border-[#00f0ff] border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                  )}
                </motion.div>
              )}

              {/* LOGIN STEP 3 - Face Recognition (Clients) */}
              {mode === "login" && step === 3 && (
                <motion.div
                  key="step3-face"
                  initial={{ opacity: 0, x: 30, filter: "blur(10px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -30, filter: "blur(10px)" }}
                  transition={{ duration: 0.4 }}
                  className="space-y-3"
                >
                  {/* User info header */}
                  <div className="text-center">
                    <motion.div
                      className="relative inline-flex items-center justify-center w-18 h-18 md:w-20 md:h-20 mb-2"
                      whileHover={{ scale: 1.05 }}
                    >
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ background: "conic-gradient(from 0deg, #00f0ff, transparent 40%, #8b5cf6, transparent 80%, #00f0ff)" }}
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      />
                      <div className="absolute inset-[3px] rounded-full bg-[#0c0c14] flex items-center justify-center overflow-hidden">
                        {userData?.photo && userData.photo.startsWith("data:") ? (
                          <img src={userData.photo} alt="" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00f0ff]/30 to-[#8b5cf6]/20 flex items-center justify-center">
                            <span className="text-2xl font-black text-white">
                              {userData?.name?.charAt(0)?.toUpperCase() || "?"}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                    <h3 className="text-white font-bold text-base">{userData?.name || username}</h3>
                    <p className="text-[#00f0ff] text-xs mt-1 flex items-center justify-center gap-1">
                      <ScanFace className="w-3.5 h-3.5" />
                      Reconhecimento Facial
                    </p>
                  </div>

                  {/* Face Recognition Area */}
                  {!faceStream && !faceResult && (
                    <div className="text-center space-y-3">
                      <motion.div
                        animate={{ boxShadow: ["0 0 0 0 rgba(0,240,255,0.5)", "0 0 0 20px rgba(0,240,255,0)", "0 0 0 0 rgba(0,240,255,0)"] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-36 h-36 mx-auto rounded-full bg-gradient-to-br from-[#00f0ff]/20 to-[#8b5cf6]/20 border border-[#00f0ff]/30 flex items-center justify-center"
                      >
                        <ScanFace className="w-16 h-16 text-[#00f0ff]" />
                      </motion.div>
                      <p className="text-gray-400 text-xs">Posicione seu rosto na câmera para verificação</p>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={startFaceCamera}
                        className="w-full py-3.5 rounded-xl font-bold text-white text-base flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg, #00f0ff 0%, #8b5cf6 100%)" }}
                      >
                        <Camera className="w-4 h-4" />
                        Abrir Câmera
                      </motion.button>
                    </div>
                  )}

                  {/* Active Camera */}
                  {faceStream && !faceResult && (
                    <div className="space-y-3">
                      <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                        <video
                          ref={faceVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                          style={{ transform: "scaleX(-1)" }}
                        />
                        <canvas ref={faceCanvasRef} className="hidden" />

                        {/* Face oval guide */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <motion.div
                            className={`w-40 h-52 rounded-[50%] border-2 ${faceDetected ? "border-[#00ff41]" : "border-[#ff006e]"}`}
                            animate={{
                              boxShadow: faceDetected
                                ? ["0 0 10px rgba(0,255,65,0.3)", "0 0 25px rgba(0,255,65,0.5)", "0 0 10px rgba(0,255,65,0.3)"]
                                : ["0 0 10px rgba(255,0,110,0.3)", "0 0 25px rgba(255,0,110,0.5)", "0 0 10px rgba(255,0,110,0.3)"],
                            }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                          {/* Scan line */}
                          <motion.div
                            className="absolute left-[25%] right-[25%] h-[2px] bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent"
                            animate={{ top: ["20%", "75%", "20%"] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          />
                        </div>

                        {/* Status */}
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                          <motion.div
                            animate={{ opacity: [0.7, 1, 0.7] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold ${faceDetected ? "bg-[#00ff41]/20 text-[#00ff41]" : "bg-[#ff006e]/20 text-[#ff006e]"}`}
                          >
                            {faceDetected ? "✓ Rosto detectado" : "⚠ Posicione seu rosto"}
                          </motion.div>
                        </div>

                        {/* Verifying overlay */}
                        <AnimatePresence>
                          {faceVerifying && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2"
                            >
                              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                                <ScanFace className="w-10 h-10 text-[#00f0ff]" />
                              </motion.div>
                              <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-[#00f0ff] font-bold text-xs">
                                Verificando identidade...
                              </motion.p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="flex gap-2">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { faceStream?.getTracks().forEach(t => t.stop()); faceStreamRef.current?.getTracks().forEach(t => t.stop()); faceStreamRef.current = null; setFaceStream(null); }}
                          className="flex-1 py-2.5 bg-[#1f1f2e] border border-[#2a2a3e] text-gray-300 rounded-xl text-xs font-semibold"
                        >
                          Cancelar
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={handleFaceVerify}
                          disabled={!faceDetected || faceVerifying}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${faceDetected && !faceVerifying
                            ? "bg-gradient-to-r from-[#00f0ff] to-[#8b5cf6] text-white shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                            : "bg-gray-700 text-gray-400 cursor-not-allowed"
                            }`}
                        >
                          <ScanFace className="w-3.5 h-3.5" />
                          Verificar
                        </motion.button>
                      </div>
                    </div>
                  )}

                  {/* Face Result - Success */}
                  <AnimatePresence>
                    {faceResult === "success" && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-3 py-4"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring" }}
                          className="w-20 h-20 mx-auto rounded-full bg-[#00ff41]/20 border-2 border-[#00ff41]/50 flex items-center justify-center"
                        >
                          <Check className="w-10 h-10 text-[#00ff41]" />
                        </motion.div>
                        <div>
                          <h3 className="text-[#00ff41] font-bold text-lg">Identidade Confirmada!</h3>
                          <p className="text-gray-400 text-xs mt-1">Entrando no painel...</p>
                        </div>
                        <motion.div
                          className="w-8 h-8 mx-auto border-2 border-[#00ff41] border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Face Result - Fail */}
                  <AnimatePresence>
                    {faceResult === "fail" && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-3 py-2"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1, rotate: [0, -5, 5, -5, 0] }}
                          transition={{ rotate: { delay: 0.3, duration: 0.5 } }}
                          className="w-20 h-20 mx-auto rounded-full bg-[#ff006e]/20 border-2 border-[#ff006e]/50 flex items-center justify-center"
                        >
                          <AlertTriangle className="w-10 h-10 text-[#ff006e]" />
                        </motion.div>
                        <div>
                          <h3 className="text-[#ff006e] font-bold text-lg">Rosto Não Reconhecido</h3>
                          <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                            O rosto capturado não corresponde ao cadastrado.<br />
                            Certifique-se de estar em um local bem iluminado e tente novamente.
                          </p>
                        </div>
                        <div className="bg-[#ff006e]/5 border border-[#ff006e]/20 rounded-xl p-3">
                          <p className="text-[#ff006e] text-[10px] font-medium">
                            Se o problema persistir, entre em contato com seu vendedor para recadastrar seu rosto.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleBackToUsername}
                            className="flex-1 py-2.5 bg-[#1f1f2e] border border-[#2a2a3e] text-gray-300 rounded-xl text-xs font-semibold"
                          >
                            Voltar
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { setFaceResult(null); startFaceCamera(); }}
                            className="flex-1 py-2.5 bg-gradient-to-r from-[#00f0ff] to-[#8b5cf6] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            Tentar Novamente
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Back button */}
                  {!faceStream && !faceResult && (
                    <button
                      onClick={handleBackToUsername}
                      className="w-full text-center text-gray-500 text-xs hover:text-gray-300 transition-colors mt-2"
                    >
                      ← Voltar para identificação
                    </button>
                  )}

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[#ff006e] text-xs text-center"
                    >
                      {error}
                    </motion.p>
                  )}
                </motion.div>
              )}

              {/* CODE FORM */}
              {mode === "code" && (
                <motion.div
                  key="code"
                  initial={{ opacity: 0, x: 30, filter: "blur(10px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -30, filter: "blur(10px)" }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-3">
                    <motion.div
                      className="relative inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 mb-3"
                      whileHover={{ scale: 1.1, rotate: -5 }}
                    >
                      <motion.div
                        className="absolute inset-0 rounded-2xl"
                        style={{ background: "conic-gradient(from 0deg, #ff00ff, transparent 40%, #8b5cf6, transparent 80%, #ff00ff)" }}
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      />
                      <div className="absolute inset-[2px] rounded-[14px] bg-[#0c0c14] flex items-center justify-center">
                        <motion.div
                          animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 3, repeat: Infinity }}
                        >
                          <Code className="w-7 h-7 md:w-9 md:h-9 text-[#ff00ff]" />
                        </motion.div>
                      </div>
                    </motion.div>
                    <h3 className="text-white font-bold text-lg">Codigo de Convite</h3>
                    <p className="text-gray-500 text-sm mt-1">Insira o codigo recebido</p>
                  </div>

                  <div className="relative group">
                    <motion.div
                      className="absolute -inset-[1px] rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
                      style={{ background: "linear-gradient(135deg, #ff00ff, #8b5cf6)" }}
                    />
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
                      className="relative w-full px-5 py-4 bg-[#12121a] border border-[#1f1f2e] rounded-xl text-white text-center text-2xl font-mono tracking-[0.3em] placeholder-gray-600 focus:outline-none focus:border-[#ff00ff] focus:shadow-[0_0_20px_rgba(255,0,255,0.15)] transition-all duration-300"
                      placeholder="X-XXXX-XXXX"
                      maxLength={12}
                      autoFocus
                    />
                  </div>

                  {codeError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[#ff006e] text-sm text-center"
                    >
                      {codeError}
                    </motion.p>
                  )}

                  <motion.button
                    onClick={handleCodeSubmit}
                    disabled={loading}
                    whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(255,0,255,0.4)" }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-4 rounded-xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #ff00ff 0%, #8b5cf6 100%)" }}
                  >
                    {loading ? (
                      <motion.div
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <>
                        <Eye className="w-5 h-5" />
                        VALIDAR CODIGO
                      </>
                    )}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div className="text-center mt-3 shrink-0">
          <motion.p
            className="text-gray-600 text-[11px] tracking-wider"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            SISTEMA PROTEGIDO COM CRIPTOGRAFIA DE PONTA
          </motion.p>
        </motion.div>

        {/* Admin Tools Toggle */}
        <div className="text-center mt-2 shrink-0">
          <motion.button
            onClick={() => setShowAdmin(!showAdmin)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="text-gray-700 text-xs hover:text-gray-500 transition-colors"
          >
            {showAdmin ? "Ocultar Ferramentas" : "Ferramentas Admin"}
          </motion.button>
        </div>

        <AnimatePresence>
          {showAdmin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-2 shrink-0 w-full"
            >
              <div className="flex gap-2 flex-wrap justify-center">
                <motion.button
                  onClick={handleInitDatabase}
                  disabled={initLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-[#0c0c14] border border-[#00f0ff]/30 text-[#00f0ff] rounded-lg text-xs font-medium hover:border-[#00f0ff] hover:shadow-[0_0_15px_rgba(0,240,255,0.15)] transition-all disabled:opacity-50"
                >
                  <Database className="w-3 h-3" />
                  {initLoading ? "..." : "Inicializar"}
                </motion.button>
                <motion.button
                  onClick={handleDebugDB}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-[#0c0c14] border border-[#8b5cf6]/30 text-[#8b5cf6] rounded-lg text-xs font-medium hover:border-[#8b5cf6] hover:shadow-[0_0_15px_rgba(139,92,246,0.15)] transition-all"
                >
                  Ver Dados
                </motion.button>
                <motion.button
                  onClick={handleForceInit}
                  disabled={initLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-[#0c0c14] border border-[#ff9f00]/30 text-[#ff9f00] rounded-lg text-xs font-medium hover:border-[#ff9f00] hover:shadow-[0_0_15px_rgba(255,159,0,0.15)] transition-all disabled:opacity-50"
                >
                  Forcar Init
                </motion.button>
                <motion.button
                  onClick={handleCleanup}
                  disabled={cleanupLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-[#0c0c14] border border-[#ff006e]/30 text-[#ff006e] rounded-lg text-xs font-medium hover:border-[#ff006e] hover:shadow-[0_0_15px_rgba(255,0,110,0.15)] transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  {cleanupLoading ? "..." : "Limpar"}
                </motion.button>
              </div>
              {initMessage && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`mt-2 text-xs text-center ${initMessage.startsWith("OK") ? "text-[#00ff41]" : "text-[#ff006e]"}`}
                >
                  {initMessage}
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
