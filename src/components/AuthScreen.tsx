import React, { useState } from "react";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { auth, loadOrCreateUserProfile } from "../firebase";
import { motion } from "motion/react";
import { Sparkles, Mail, Lock, User, KeyRound, AlertCircle, RefreshCw } from "lucide-react";

interface AuthScreenProps {
  onAuthSuccess: (userId: string) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "signup" | "recover">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!username.trim()) {
          throw new Error("Por favor introduce un nombre de usuario.");
        }
        // Signup
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Set display name in Auth
        await updateProfile(cred.user, { displayName: username });
        // Create user profile document in Firestore
        await loadOrCreateUserProfile(cred.user.uid, email, username);
        sessionStorage.setItem("nexia_active_session", "true");
        onAuthSuccess(cred.user.uid);
      } else if (mode === "login") {
        // Login
        const cred = await signInWithEmailAndPassword(auth, email, password);
        await loadOrCreateUserProfile(cred.user.uid, email, cred.user.displayName || "");
        sessionStorage.setItem("nexia_active_session", "true");
        onAuthSuccess(cred.user.uid);
      } else {
        // Recover password
        await sendPasswordResetEmail(auth, email);
        setInfo("Hemos enviado un correo para restablecer tu contraseña. Revisa tu bandeja de entrada o spam. 💜");
        setMode("login");
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message;
      if (err.code === "auth/invalid-credential") {
        errMsg = "Credenciales incorrectas. Verifica el correo y la contraseña.";
      } else if (err.code === "auth/email-already-in-use") {
        errMsg = "Este correo electrónico ya está registrado.";
      } else if (err.code === "auth/weak-password") {
        errMsg = "La contraseña debe tener al menos 6 caracteres.";
      } else if (err.code === "auth/invalid-email") {
        errMsg = "Formato de correo electrónico inválido.";
      } else if (err.code === "auth/operation-not-allowed") {
        errMsg = "firebase-auth-disabled"; // Sentinal value to trigger a highly diagnostic help window in the card
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await loadOrCreateUserProfile(cred.user.uid, cred.user.email || "", cred.user.displayName || "Sintonizado Google");
      sessionStorage.setItem("nexia_active_session", "true");
      onAuthSuccess(cred.user.uid);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al iniciar sesión con Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex align-center items-center justify-center p-4 bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 text-slate-100 overflow-hidden relative font-sans">
      
      {/* Background cyber grid and decorative nodes */}
      <div className="absolute inset-0 bg-[linear-gradient(deepskyblue_1px,transparent_1px),linear-gradient(90deg,deepskyblue_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-10 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        id="auth-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md bg-slate-900/70 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-8 shadow-2xl relative"
      >
        {/* Glow corner highlights */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400 rounded-tl-xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-purple-400 rounded-br-xl pointer-events-none" />

        <div className="text-center mb-8 relative">
          <style>{`
            @keyframes crystalFloat {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
            .animate-crystal-float {
              animation: crystalFloat 4s ease-in-out infinite;
            }
          `}</style>
          <div className="inline-flex items-center justify-center mb-4 select-none animate-crystal-float">
            <svg viewBox="0 0 100 100" className="w-20 h-20 filter drop-shadow-[0_0_20px_rgba(168,85,247,0.9)]">
              <defs>
                <linearGradient id="facet1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d8b4fe" />
                  <stop offset="100%" stopColor="#9333ea" />
                </linearGradient>
                <linearGradient id="facet2" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f0abfc" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
                <linearGradient id="facet3" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#581c87" />
                </linearGradient>
                <linearGradient id="facet4" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f472b6" />
                  <stop offset="100%" stopColor="#db2777" />
                </linearGradient>
              </defs>
              <polygon points="50,5 15,50 40,50 50,42" fill="url(#facet1)" opacity="0.95" />
              <polygon points="50,5 85,50 60,50 50,42" fill="url(#facet2)" opacity="0.95" />
              <polygon points="50,5 50,42 40,50 50,58 60,50 50,42" fill="url(#facet3)" opacity="0.9" />
              <polygon points="15,50 50,95 50,58 40,50" fill="url(#facet3)" opacity="0.95" />
              <polygon points="85,50 50,95 50,58 60,50" fill="url(#facet4)" opacity="0.95" />
              <circle cx="50" cy="50" r="6" fill="#ffffff" filter="blur(2px)" opacity="0.8" className="animate-pulse" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-fuchsia-300 to-indigo-400 bg-clip-text text-transparent uppercase">
            NEXIA COGNITIVE
          </h1>
          <p className="text-xs text-purple-300 font-semibold uppercase tracking-widest mt-1">Sintonizador Esencial Cognitivo</p>
        </div>

        <div className="space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3.5 bg-slate-950 border border-yellow-500/40 rounded-lg flex flex-col gap-2 text-left"
            >
              <div className="flex items-start gap-2 text-red-300 text-xs text-left">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            </motion.div>
          )}

          {info && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 bg-purple-950/40 border border-purple-500/50 rounded-lg flex items-start gap-2 text-purple-300 text-xs"
            >
              <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{info}</span>
            </motion.div>
          )}

          <div className="text-center py-2 px-1 text-xs text-slate-400">
            Inicia sesión de forma segura y rápida con tu cuenta de Google para comenzar a interactuar con Nexia. No requiere contraseñas adicionales.
          </div>

          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-14 flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:brightness-110 active:scale-[0.98] text-white rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(6,182,212,0.35)] transition duration-200 cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5 mr-1 shrink-0 bg-white p-0.5 rounded-full" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
                Iniciar sesión con Google
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
