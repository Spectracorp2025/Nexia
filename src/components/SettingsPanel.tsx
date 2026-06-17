import React, { useState } from "react";
import { UserProfile, UserSettings } from "../types";
import { updateUserProfileOnDb, DEFAULT_SETTINGS } from "../firebase";
import { 
  Sliders, Volume2, Sparkles, Paintbrush, Play, 
  User, ShieldAlert, KeyRound, Check, LogOut, Info 
} from "lucide-react";
import { auth } from "../firebase";

interface SettingsPanelProps {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  uid: string;
  onLogout: () => void;
  onSimulatedRankChange: (newRank: "gratuito" | "premium" | "plus" ) => void;
}

export default function SettingsPanel({
  profile,
  setProfile,
  uid,
  onLogout,
  onSimulatedRankChange
}: SettingsPanelProps) {
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [adminVerified, setAdminVerified] = useState(false);
  const [adminErr, setAdminErr] = useState<string | null>(null);

  const handleUpdateSettings = async (updates: Partial<UserSettings>) => {
    const nextSettings = {
      ...profile.settings,
      ...updates
    };
    const nextProfile = {
      ...profile,
      settings: nextSettings
    };
    setProfile(nextProfile);
    await updateUserProfileOnDb(uid, { settings: nextSettings });
  };

  const handleVerifyConsoleKey = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminErr(null);
    if (adminKey.toLowerCase() === "admin" || adminKey.toLowerCase() === "nexia123") {
      setAdminVerified(true);
    } else {
      setAdminErr("Clave incorrecta. Pista: ingresa 'admin' o 'nexia123'. 💜");
    }
  };

  const handleToggleRankSimulate = (rank: "gratuito" | "premium" | "plus") => {
    onSimulatedRankChange(rank);
  };

  return (
    <div className="w-full bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800/80 overflow-hidden shadow-xl flex flex-col h-[400px] uppercase font-sans">
      
      {/* Settings header switcher tab info */}
      <div className="flex border-b border-slate-800/80 bg-slate-950/40 p-3 items-center justify-between">
        <span className="text-xs font-black tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-purple-400" />
          Personalización & Ajustes
        </span>
        <button
          onClick={onLogout}
          className="bg-red-950/40 border border-red-500/20 text-red-400 hover:bg-red-500/10 text-9px font-bold px-2 py-1 rounded transition flex items-center gap-1 cursor-pointer"
        >
          <LogOut className="w-3 h-3" /> Cerrar sesión
        </button>
      </div>

      {/* Settings content layout panel */}
      <div className="flex-1 p-4 overflow-y-auto min-h-0 bg-slate-900/30 text-left space-y-4 font-sans">
        
        {/* Profile info metrics */}
        <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-lg border border-slate-850">
          <div className="text-left flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-slate-900 border border-purple-500/40 flex items-center justify-center font-black text-cyan-400 text-sm">
              {profile.username ? profile.username.substring(0, 2).toUpperCase() : "U"}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100">{profile.username || "Cargando..."}</p>
              <p className="text-[10px] text-slate-400 truncate lowcase">{profile.email}</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-block text-[9px] font-black uppercase px-2.5 py-1 rounded-full border shadow-sm ${
              profile.rank === "plus" 
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                : profile.rank === "premium" 
                  ? "bg-purple-500/20 border-purple-400 text-purple-300"
                  : "bg-slate-950/80 border-slate-700 text-slate-300"
            }`}>
              RANGO: {profile.rank}
            </span>
            <p className="text-[8px] text-slate-500 font-mono mt-1 text-right">
              Acciones de hoy: {profile.actionsToday} {profile.rank === "gratuito" ? "/ 6" : profile.rank === "premium" ? "/ 25" : "Ilimitado (real: / 45)"}
            </p>
          </div>
        </div>

        {/* Dynamic Voice Settings sliders */}
        <div className="space-y-2.5">
          <h4 className="text-[10px] text-slate-400 tracking-wider font-extrabold flex items-center gap-1.5 border-b border-slate-850 pb-1 uppercase">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> Sintetizador de Voz de Nexia
          </h4>
          
          <div className="grid grid-cols-2 gap-3 pb-1">
            <label className="flex items-center gap-2 text-xxs font-bold text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={profile.settings.voiceEnabled}
                onChange={(e) => handleUpdateSettings({ voiceEnabled: e.target.checked })}
                className="accent-cyan-400 cursor-pointer"
              />
              Habilitar Voz Lectora (TTS)
            </label>
            <label className="flex items-center gap-2 text-xxs font-bold text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={profile.settings.animationsEnabled}
                onChange={(e) => handleUpdateSettings({ animationsEnabled: e.target.checked })}
                className="accent-purple-400 cursor-pointer"
              />
              Efectos de Animación En Avatar
            </label>
          </div>

          {profile.settings.voiceEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-950/20 p-2.5 rounded border border-slate-950">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Volumen</span> <span>{Math.round(profile.settings.voiceVolume * 100)}%</span>
                </div>
                <input
                  id="slide-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={profile.settings.voiceVolume}
                  onChange={(e) => handleUpdateSettings({ voiceVolume: parseFloat(e.target.value) })}
                  className="w-full cursor-pointer accent-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Velocidad de Lectura</span> <span>{profile.settings.voiceSpeed}x</span>
                </div>
                <input
                  id="slide-speed"
                  type="range"
                  min="0.5"
                  max="1.8"
                  step="0.1"
                  value={profile.settings.voiceSpeed}
                  onChange={(e) => handleUpdateSettings({ voiceSpeed: parseFloat(e.target.value) })}
                  className="w-full cursor-pointer accent-purple-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Theme presets switcher */}
        <div className="space-y-2.5">
          <h4 className="text-[10px] text-slate-400 tracking-wider font-extrabold flex items-center gap-1.5 border-b border-slate-850 pb-1 uppercase">
            <Paintbrush className="w-3.5 h-3.5 text-pink-400" /> Temas Visuales e Interfaz
          </h4>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: "neon-violet", label: "Violeta Neón", color: "border-purple-500 hover:bg-purple-950/20" },
              { id: "neon-blue", label: "Azul Neón", color: "border-cyan-500 hover:bg-cyan-950/20" },
              { id: "cyberpunk", label: "Cyberpunk", color: "border-yellow-500 hover:bg-yellow-950/20" },
              { id: "amoled", label: "Amoled", color: "border-slate-800 hover:bg-slate-950/20" },
            ].map(theme => (
              <button
                key={theme.id}
                onClick={() => handleUpdateSettings({ visualTheme: theme.id as any })}
                className={`py-2 text-[9px] font-black uppercase text-center border rounded-lg transition relative ${theme.color} ${
                  profile.settings.visualTheme === theme.id 
                    ? "bg-purple-950/40 font-extrabold border-slate-100/50 scale-102"
                    : "text-slate-400"
                }`}
              >
                {theme.label}
                {profile.settings.visualTheme === theme.id && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full border border-slate-900" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Secure Simulated Firebase Admin panel */}
        <div className="border border-yellow-500/20 rounded-lg p-3 bg-yellow-950/5 mt-4 space-y-2.5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 text-yellow-500 text-[10px] font-black">
              <ShieldAlert className="w-4 h-4 animate-pulse" />
              Consola de Administración de Firebase
            </div>
            {!isAdminConsoleOpen && (
              <button
                onClick={() => setIsAdminConsoleOpen(true)}
                className="bg-yellow-500/10 hover:bg-yellow-500/25 text-yellow-400 font-bold border border-yellow-500/30 text-xxs px-2.5 py-0.5 rounded cursor-pointer transition select-none"
              >
                Abrir Consola
              </button>
            )}
          </div>

          {isAdminConsoleOpen && (
            <div className="space-y-3 pt-1 border-t border-yellow-500/10">
              <p className="text-[9px] text-yellow-300 leading-normal mb-1 font-semibold normal-case flex items-start gap-1">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Los usuarios estándar no pueden modificar su rango para evitar abusos. Esta sección simula el panel de Firebase del administrador para evaluar las cuotas de uso (Gratuito, Premium y Plus).
              </p>
              
              {!adminVerified ? (
                <form onSubmit={handleVerifyConsoleKey} className="flex gap-2">
                  <input
                    id="admin-key"
                    type="password"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    placeholder="Clave (ingresa 'admin')"
                    className="flex-1 bg-slate-950/90 border border-yellow-500/30 rounded px-2.5 py-1 text-xs outline-none text-slate-100 placeholder-slate-600 focus:border-yellow-400"
                  />
                  <button
                    id="btn-verify-admin"
                    type="submit"
                    className="bg-yellow-500 hover:bg-yellow-450 text-slate-950 font-extrabold px-3 py-1 rounded text-xxs cursor-pointer"
                  >
                    Entrar
                  </button>
                </form>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-1.5">
                    {[
                      { id: "gratuito", label: "Gratis (6 acciones)", color: "bg-slate-950 text-slate-400 border-slate-700" },
                      { id: "premium", label: "Premium (25 acciones)", color: "bg-purple-950/50 text-purple-300 border-purple-500/40" },
                      { id: "plus", label: "Plus (Ili - r45)", color: "bg-cyan-950/50 text-cyan-300 border-cyan-500/40" },
                    ].map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleToggleRankSimulate(r.id as any)}
                        className={`flex-1 py-1.5 font-bold uppercase rounded text-[9px] border cursor-pointer transition ${r.color} ${
                          profile.rank === r.id ? "ring-2 ring-yellow-400 scale-[1.03]" : "opacity-60"
                        }`}
                      >
                        {profile.rank === r.id && "⭐ "}
                        {r.id === "gratuito" ? "Gratuito" : r.id === "premium" ? "Premium" : "Plus"}
                      </button>
                    ))}
                  </div>
                  <p className="text-3xs text-slate-400 uppercase tracking-widest text-center mt-1 select-none">
                    ⭐ Rango sincronizado con Firestore exitosamente.
                  </p>
                </div>
              )}

              {adminErr && <p className="text-xxs text-red-400 mt-1 font-semibold">{adminErr}</p>}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
