import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, Save, User, Phone, Loader2, Check, X, Edit3, Shield } from "lucide-react";
import * as api from "../services/api";

interface UserProfileProps {
  username: string;
  role: string;
  glowColor?: string;
  onProfileUpdate?: (data: { name: string; photo: string; whatsapp: string }) => void;
}

export function UserProfile({ username, role, glowColor = "#00f0ff", onProfileUpdate }: UserProfileProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editName, setEditName] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editPhoto, setEditPhoto] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.getUserProfile(username);
      if (res.success) {
        setProfile(res.user);
        setEditName(res.user.name || "");
        setEditWhatsapp(res.user.whatsapp || "");
        setEditPhoto(res.user.photo || "");
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [username]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      alert("Imagem muito grande. Maximo 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoPreview(result);
      setEditPhoto(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.updateUserProfile(username, {
        name: editName,
        photo: editPhoto,
        whatsapp: editWhatsapp,
      });
      if (res.success) {
        setProfile(res.user);
        setSaved(true);
        setEditing(false);
        setPhotoPreview(null);
        setTimeout(() => setSaved(false), 2000);

        // Update localStorage
        try {
          const cu = JSON.parse(localStorage.getItem("currentUser") || "{}");
          if (cu.username === username) {
            cu.name = editName;
            cu.photo = editPhoto;
            cu.whatsapp = editWhatsapp;
            localStorage.setItem("currentUser", JSON.stringify(cu));
          }
        } catch { /* silent */ }

        onProfileUpdate?.({ name: editName, photo: editPhoto, whatsapp: editWhatsapp });
      }
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    vendedor: "Vendedor",
    cliente: "Cliente",
    motorista: "Motorista",
  };

  const roleColors: Record<string, string> = {
    admin: "#00f0ff",
    vendedor: "#8b5cf6",
    cliente: "#00ff41",
    motorista: "#ff00ff",
  };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center py-12">
        <motion.div className="w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: `${glowColor}40`, borderTopColor: "transparent" }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
      </motion.div>
    );
  }

  if (!profile) return null;

  const initial = (profile.name || username || "?").charAt(0).toUpperCase();
  const displayPhoto = photoPreview || profile.photo;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Profile Card */}
      <div className="relative rounded-2xl overflow-hidden">
        <motion.div
          className="absolute inset-0 rounded-2xl p-[1px]"
          style={{ background: `conic-gradient(from 0deg, ${glowColor}20, transparent, ${glowColor}10, transparent)` }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        <div className="relative bg-[#0c0c14]/90 backdrop-blur-xl rounded-2xl border border-[#1f1f2e]/50 m-[1px]">
          {/* Banner */}
          <div className="h-24 rounded-t-2xl relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${glowColor}15, ${roleColors[role] || glowColor}10, transparent)` }}>
            <motion.div className="absolute inset-0"
              style={{ background: `radial-gradient(circle at 30% 50%, ${glowColor}15, transparent 70%)` }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            {/* Floating particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full"
                style={{ backgroundColor: glowColor, left: `${15 + i * 15}%`, top: `${30 + (i % 3) * 20}%` }}
                animate={{ y: [-5, 5, -5], opacity: [0.2, 0.6, 0.2] }}
                transition={{ duration: 2 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
              />
            ))}
          </div>

          {/* Avatar */}
          <div className="flex justify-center -mt-10 relative z-10">
            <div className="relative">
              <div className="w-20 h-20 relative">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ background: `conic-gradient(from 0deg, ${glowColor}, ${roleColors[role] || "#00ff41"}, ${glowColor}, transparent, ${glowColor})` }}
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-[-3px] rounded-full pointer-events-none"
                  animate={{ boxShadow: [`0 0 8px ${glowColor}30`, `0 0 16px ${glowColor}50`, `0 0 8px ${glowColor}30`] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <div className="absolute inset-[3px] rounded-full bg-[#0c0c14] flex items-center justify-center overflow-hidden">
                  {displayPhoto && (displayPhoto.startsWith("http") || displayPhoto.startsWith("data:")) ? (
                    <img src={displayPhoto} alt={profile.name} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="w-full h-full rounded-full flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${glowColor}30, ${roleColors[role] || "#8b5cf6"}20)` }}>
                      <span className="text-2xl font-bold text-white">{initial}</span>
                    </div>
                  )}
                </div>
              </div>

              {editing && (
                <motion.button
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-2 rounded-full border-2 border-[#0c0c14]"
                  style={{ background: `linear-gradient(135deg, ${glowColor}, ${roleColors[role] || glowColor})` }}
                >
                  <Camera className="w-3.5 h-3.5 text-black" />
                </motion.button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
          </div>

          {/* Info */}
          <div className="px-5 pb-5 pt-3">
            {!editing ? (
              <>
                <div className="text-center mb-4">
                  <motion.h2
                    className="text-xl font-bold text-white mb-0.5"
                    animate={{ textShadow: [`0 0 6px ${glowColor}00`, `0 0 12px ${glowColor}30`, `0 0 6px ${glowColor}00`] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    {profile.name || username}
                  </motion.h2>
                  <p className="text-gray-500 text-sm">@{username}</p>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                      style={{ color: roleColors[role] || glowColor, backgroundColor: `${roleColors[role] || glowColor}12`, borderColor: `${roleColors[role] || glowColor}30` }}>
                      <Shield className="w-2.5 h-2.5 inline mr-1" />
                      {roleLabels[role] || role}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-[#0a0a12]/60 rounded-xl p-3 border border-[#1f1f2e]/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <User className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-500 text-[10px] uppercase tracking-wider">Nome</span>
                    </div>
                    <p className="text-white text-sm font-medium truncate">{profile.name || "-"}</p>
                  </div>
                  <div className="bg-[#0a0a12]/60 rounded-xl p-3 border border-[#1f1f2e]/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Phone className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-500 text-[10px] uppercase tracking-wider">WhatsApp</span>
                    </div>
                    <p className="text-white text-sm font-medium truncate">{profile.whatsapp || "-"}</p>
                  </div>
                </div>

                {profile.createdAt && (
                  <p className="text-gray-600 text-[10px] text-center mb-4">
                    Membro desde {new Date(profile.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: `0 0 25px ${glowColor}30` }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setEditing(true)}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border"
                  style={{ color: glowColor, backgroundColor: `${glowColor}10`, borderColor: `${glowColor}25` }}
                >
                  <Edit3 className="w-4 h-4" /> Editar Perfil
                </motion.button>

                <AnimatePresence>
                  {saved && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-3 flex items-center justify-center gap-1.5 text-[#00ff41] text-xs font-medium"
                    >
                      <Check className="w-3.5 h-3.5" /> Perfil atualizado com sucesso!
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div>
                  <label className="text-gray-500 text-[10px] uppercase tracking-wider mb-1 block">Nome</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#0a0a12] border border-[#1f1f2e] rounded-xl text-white text-sm focus:outline-none transition-colors"
                    style={{ "--tw-ring-color": glowColor } as any}
                    onFocus={(e) => e.target.style.borderColor = `${glowColor}50`}
                    onBlur={(e) => e.target.style.borderColor = "#1f1f2e"}
                    placeholder="Seu nome completo"
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-[10px] uppercase tracking-wider mb-1 block">WhatsApp</label>
                  <input
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#0a0a12] border border-[#1f1f2e] rounded-xl text-white text-sm focus:outline-none transition-colors"
                    onFocus={(e) => e.target.style.borderColor = `${glowColor}50`}
                    onBlur={(e) => e.target.style.borderColor = "#1f1f2e"}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                {photoPreview && (
                  <div className="flex items-center gap-2 p-2 bg-[#0a0a12]/60 rounded-xl border border-[#1f1f2e]/30">
                    <img src={photoPreview} alt="Preview" className="w-10 h-10 rounded-lg object-cover" />
                    <span className="text-gray-400 text-xs flex-1">Nova foto selecionada</span>
                    <button onClick={() => { setPhotoPreview(null); setEditPhoto(profile.photo || ""); }} className="p-1 text-gray-500 hover:text-[#ff006e]">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setEditing(false); setPhotoPreview(null); setEditName(profile.name || ""); setEditWhatsapp(profile.whatsapp || ""); setEditPhoto(profile.photo || ""); }}
                    className="flex-1 py-2.5 bg-[#1f1f2e] text-gray-300 font-semibold rounded-xl hover:bg-[#2a2a3e] transition-colors text-sm"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: `0 0 25px ${glowColor}30` }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-2.5 font-bold text-black text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                    style={{ background: `linear-gradient(135deg, ${glowColor}, ${roleColors[role] || glowColor})` }}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <><Save className="w-4 h-4" /> Salvar</>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
