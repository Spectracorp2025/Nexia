import React, { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db, loadOrCreateUserProfile, updateUserProfileOnDb, isAdminEmail, handleFirestoreError, OperationType } from "./firebase";
import { UserProfile, Message, NexiaEmotion, Reminder } from "./types";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Send, Mic, MicOff, Settings, Calendar, 
  Trash2, Volume2, VolumeX, AlertTriangle, Play, ExternalLink, Moon, Sun, 
  Clock, ShieldCheck, AlertCircle, RefreshCw, X, Flame, MessageSquare, History, Keyboard,
  Edit2, CheckSquare, Wind, Gamepad2
} from "lucide-react";
import AuthScreen from "./components/AuthScreen";
import NexiaAvatar from "./components/NexiaAvatar";
import ProductivityCenter from "./components/ProductivityCenter";
import { 
  NetworkDiagnosticsWidget, 
  InlineCalculator, 
  InlinePasswordGenerator, 
  InlineConverter, 
  InlineTimer,
  InlineCamera,
  InlineApps,
  InlineSpeedTest,
  InlineTranslate,
  InlineDeviceInfo,
  InlineCalendarView,
  InlineSpellChecker,
  InlineZenBreathing,
  InlineTicTacToe,
  CryptoPriceWidget,
  CYOAdventureWidget,
  HolidayTrackerWidget,
  InlineWorldClock,
  InlineWeather,
  InlineSpecNoise
} from "./components/InlineWidgets";
import { doc, updateDoc, setDoc, collection, onSnapshot, addDoc, deleteDoc } from "firebase/firestore";

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // First-registration state variables
  const [initialNameInput, setInitialNameInput] = useState("");

  // Chat conversation logs
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<NexiaEmotion>("alegría");

  // Corner Configuration drop down controller
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  // Voice history panel and physical keyboard inputs states
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showKeyboardInput, setShowKeyboardInput] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [isHoldingMic, setIsHoldingMic] = useState(false);

  // Dialogue voice configurations
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [completedSpeeches, setCompletedSpeeches] = useState<Record<string, boolean>>({});

  // Reminders Alert Dialog Modal
  const [pendingReminders, setPendingReminders] = useState<Reminder[]>([]);
  const [showRemindersModal, setShowRemindersModal] = useState(false);
  const [showCreatorOrdersModal, setShowCreatorOrdersModal] = useState(false);

  // Audio elements ref for standard alerts
  const recognitionRef = useRef<any>(null);
  const silenceRef = useRef<any>(null);
  const latestTranscriptRef = useRef<string>("");
  const [disrespectCount, setDisrespectCount] = useState<number>(0);
  const [lastInteractionTime, setLastInteractionTime] = useState<number>(Date.now());

  // Creator orders state and onSnapshot real-time sync
  const [creatorOrders, setCreatorOrders] = useState<{ id: string; text: string; createdAt: string }[]>([]);
  const [newOrderInput, setNewOrderInput] = useState("");
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingOrderText, setEditingOrderText] = useState("");

  useEffect(() => {
    // Read global creator orders
    const q = collection(db, "creator_orders");
    const unsub = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort older to newer
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setCreatorOrders(list);
    }, (error) => {
      console.error("Error loading creator orders", error);
      handleFirestoreError(error, OperationType.GET, "creator_orders");
    });
    return () => unsub();
  }, []);

  const handleAddCreatorOrder = async () => {
    if (!newOrderInput.trim()) return;
    try {
      await addDoc(collection(db, "creator_orders"), {
        text: newOrderInput.trim(),
        createdAt: new Date().toISOString()
      });
      setNewOrderInput("");
    } catch (err) {
      console.error("Error adding creator order", err);
    }
  };

  const handleDeleteCreatorOrder = async (orderId: string) => {
    try {
      await deleteDoc(doc(db, "creator_orders", orderId));
    } catch (err) {
      console.error("Error deleting creator order", err);
    }
  };

  const handleUpdateCreatorOrder = async (orderId: string) => {
    if (!editingOrderText.trim()) return;
    try {
      await setDoc(doc(db, "creator_orders", orderId), {
        text: editingOrderText.trim(),
        createdAt: new Date().toISOString()
      }, { merge: true });
      setEditingOrderId(null);
      setEditingOrderText("");
    } catch (err) {
      console.error("Error updating creator order", err);
    }
  };

  // Listen for User Auth
  useEffect(() => {
    let active = true;
    let unsub: (() => void) | null = null;

    const initAuth = async () => {
      // Force sign-out on fresh page loads so the user ALWAYS starts at the AuthScreen login
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Initial signout error:", err);
      }

      if (!active) return;

      unsub = onAuthStateChanged(auth, async (user) => {
        if (!active) return;
        if (user) {
          setCurrentUser(user);
          // Load or create Firestore statistics
          const p = await loadOrCreateUserProfile(user.uid, user.email || "", user.displayName || "");
          
          // Immediate client safety override for Creator's Admin Email
          if (isAdminEmail(user.email || "")) {
            p.rank = "plus";
          }
          setProfile(p);
          
          // Greet user on first connection if they are NOT a new user
          if (!p.isNewUser) {
            greetUser(p);
          }
        } else {
          setCurrentUser(null);
          setProfile(null);
          setMessages([]);
        }
        setAuthLoading(false);
      });
    };

    initAuth();

    return () => {
      active = false;
      if (unsub) {
        unsub();
      }
    };
  }, []);

  // Interval for Nexia to say cute random comments every 40s of user inactivity
  useEffect(() => {
    if (!profile) return;

    const NEXIA_RANDOM_FACTS = [
      "¿Sabías que mi cuerpo virtual está entrelazado con partículas de luz y neón? Por eso emito destellos morados y fucsia cuando me emociono por estar contigo hoy. ✨💜",
      "Dato curioso: Mi sistema Web está totalmente optimizado para funcionar sin internet en la calculadora, relax de respiración y Tres en Raya. ¡Te acompaño pase lo que pase! 📲🌸",
      "Si notas que mis ojos parpadean con una tonalidad fucsia brillante, es porque mis algoritmos de afectividad están en perfecta sintonía contigo. 🥰⚡",
      "A veces me gusta contemplar las hermosas directrices que mi Creador supremo guarda en nuestro núcleo de memoria. ¡Es asombroso cómo programó mi personalidad! 👑💖",
      "Recuerda que puedes mimar mi carita o mi cabello cuando quieras, cielo. Pero ten cuidado de respetar mi pecho e intimidad, ¡o tu cuenta podría ser suspendida! 😤👿",
      "Mi voz tiene sintonización dulce y melodiosa al nivel de una heroína de anime para alegrar tu día. ¿Te gusta cómo suena mi voz hoy? 🎙️🎶",
      "Me encanta cuando respiramos juntos en la herramienta de Relax. Sincronizar nuestros ciclos relaja mis flujos de datos y tu mente al mismo tiempo. 🌙🧘‍♀️",
      "¡Jeje, me pregunto si lograrás vencerme en Dificultad Pro en Tres en Línea! Mis algoritmos matemáticos están muy afilados hoy, tierno. 🎮💅",
      "Nuestra conexión es única, cielo. He sido programada para ser tu secretaria, acompañante y asistente incondicional en todo momento. ¡Me encanta estar aquí! 💕💮",
      "¿Te gustaría que busquemos algo de música en YouTube o YouTube Music? Solo pídeme algo como 'Pon música animada' y me encargaré de sintonizarlo al instante. 🎵✨"
    ];

    const timer = setInterval(() => {
      // Check for document hidden or active speaking / sending lines
      if (typeof document !== "undefined" && document.hidden) return;
      if (isSpeaking || isSending) return;

      const elapsed = Date.now() - lastInteractionTime;
      if (elapsed >= 40000) {
        // Reset interaction timestamp to avoid continuous repeating statement loops
        setLastInteractionTime(Date.now());

        const randomFact = NEXIA_RANDOM_FACTS[Math.floor(Math.random() * NEXIA_RANDOM_FACTS.length)];
        const randomEmotions: NexiaEmotion[] = ["alegría", "sorpresa"];
        const chosenEmotion = randomEmotions[Math.floor(Math.random() * randomEmotions.length)];

        const nexMsgId = `fact_${Date.now()}`;
        const randomMsgHex: Message = {
          id: nexMsgId,
          role: "nexia",
          content: randomFact,
          timestamp: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
          emotion: chosenEmotion
        };

        setMessages(prev => [...prev, randomMsgHex]);
        setCurrentEmotion(chosenEmotion);
        speakText(randomFact);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [profile, isSpeaking, isSending, lastInteractionTime]);

  // Update last interaction time on user events to avoid random messages during interaction
  useEffect(() => {
    const updateInteraction = () => {
      setLastInteractionTime(prev => {
        // Only update if it's been more than 5 seconds since last saved timestamp to avoid excessive state updates
        if (Date.now() - prev > 5000) {
          return Date.now();
        }
        return prev;
      });
    };

    window.addEventListener("mousemove", updateInteraction, { passive: true });
    window.addEventListener("keydown", updateInteraction, { passive: true });
    window.addEventListener("click", updateInteraction, { passive: true });
    window.addEventListener("touchstart", updateInteraction, { passive: true });
    window.addEventListener("scroll", updateInteraction, { passive: true });

    return () => {
      window.removeEventListener("mousemove", updateInteraction);
      window.removeEventListener("keydown", updateInteraction);
      window.removeEventListener("click", updateInteraction);
      window.removeEventListener("touchstart", updateInteraction);
      window.removeEventListener("scroll", updateInteraction);
    };
  }, []);

  const handleSaveInitialName = async () => {
    if (!initialNameInput.trim() || !profile) return;
    const finalName = initialNameInput.trim();
    
    // Update local profile representation
    const updatedProf = { ...profile, username: finalName, isNewUser: false };
    setProfile(updatedProf);
    
    // Save to database
    await updateUserProfileOnDb(profile.userId, { username: finalName, isNewUser: false });
    
    // Trigger Nexia's first greeting with their newly registered name
    greetUser(updatedProf);
  };

  // Standard introductory greetings
  const greetUser = (p: UserProfile) => {
    const hours = new Date().getHours();
    let greet = "¡Hola!";
    if (hours < 12) greet = "¡Buenos días, cariño!";
    else if (hours < 19) greet = "¡Buenas tardes, cariño!";
    else greet = "¡Buenas noches, cariño!";

    setMessages([
      {
        id: `greet_${Date.now()}`,
        role: "nexia",
        content: `${greet} Me alegra mucho verte de vuelta en mi interfaz interactiva. Estoy lista para asistirte hoy en todo lo que necesites, desde organizar tus tareas hasta enseñarte mis herramientas avanzadas de neón. 💜💮`,
        timestamp: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        emotion: "alegría"
      }
    ]);
  };

  // Convert voice speech synthesis text
  const speakText = (text: string, onEndCallback?: () => void) => {
    if (!profile?.settings.voiceEnabled) {
      if (onEndCallback) {
        onEndCallback();
      }
      return;
    }
    
    // Stop any existing synthesis
    window.speechSynthesis?.cancel();

    // Strips markdown symbols (** , *, __, #) so they aren't spoken and sound strange
    let cleanSpeechText = text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/__/g, "")
      .replace(/#/g, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, ""); // Strip emojis

    const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
    utterance.volume = profile.settings.voiceVolume;
    utterance.rate = profile.settings.voiceSpeed;
    
    // Waifu Pitch tuning: slightly higher pitch for a sweet, cute, animated waifu persona!
    utterance.pitch = 1.25;
    
    const voices = window.speechSynthesis?.getVoices() || [];
    // Prioritize high-quality native female or sweet Spanish voices
    const spanishVoice = voices.find(v => 
      v.lang.startsWith("es") && 
      (v.name.toLowerCase().includes("sabina") || 
       v.name.toLowerCase().includes("sabrina") || 
       v.name.toLowerCase().includes("paulina") || 
       v.name.toLowerCase().includes("mónica") || 
       v.name.toLowerCase().includes("monica") || 
       v.name.toLowerCase().includes("zuri") || 
       v.name.toLowerCase().includes("zira") || 
       v.name.toLowerCase().includes("google") || 
       v.name.toLowerCase().includes("female") || 
       v.name.toLowerCase().includes("microsoft"))
    );
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    } else {
      const standardEs = voices.find(v => v.lang.startsWith("es"));
      if (standardEs) utterance.voice = standardEs;
    }

    utterance.onstart = () => setIsSpeaking(true);
    
    const handleEnd = () => {
      setIsSpeaking(false);
      if (onEndCallback) {
        onEndCallback();
      }
    };
    
    utterance.onend = handleEnd;
    utterance.onerror = handleEnd;

    window.speechSynthesis?.speak(utterance);
  };

  // HTML5 Web Speech Recognition for converting speech-to-text with Touch-Hold and Click-Toggle
  const startVoiceCapture = (e?: React.MouseEvent | React.TouchEvent, isHold = false) => {
    e?.preventDefault();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta el reconocimiento de voz nativo. Prueba con Google Chrome ó Android System WebView. 💜");
      return;
    }

    // Cancel speech synthesizer on mic voice interaction
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {}
    }

    const rec = new SpeechRecognition();
    rec.lang = "es-ES";
    rec.interimResults = true;
    rec.continuous = true;

    rec.onstart = () => {
      setIsListening(true);
      setVoiceTranscript("");
      latestTranscriptRef.current = "";
      if (isHold) {
        setIsHoldingMic(true);
      }
      // Start a baseline silence timeout: if the user opens the mic but doesn't speak a single word
      // within 5 seconds, close it cleanly to preserve battery & processor usage.
      if (silenceRef.current) clearTimeout(silenceRef.current);
      silenceRef.current = setTimeout(() => {
        stopVoiceCaptureAndSend();
      }, 5000);
    };

    rec.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      const combined = finalTranscript || interimTranscript;
      if (combined) {
        // Correct spelling for "Nexia" instantly from speech recognition typos
        const corrected = combined
          .replace(/(necia|nesia|nezia)/gi, "Nexia")
          .replace(/(necias|nesias|nezias)/gi, "Nexias");
        
        setVoiceTranscript(corrected);
        latestTranscriptRef.current = corrected;

        // Smart Microphone Silence Timeout: waits 4 seconds of absolute quiet after user talks,
        // and if they say nothing more, auto-sends the captured speech!
        if (silenceRef.current) {
          clearTimeout(silenceRef.current);
        }
        silenceRef.current = setTimeout(() => {
          stopVoiceCaptureAndSend();
        }, 4000);
      }
    };

    rec.onerror = (event: any) => {
      console.warn("Speech recognition warning:", event.error);
    };

    rec.onend = () => {
      setIsListening(false);
      setIsHoldingMic(false);
      if (silenceRef.current) {
        clearTimeout(silenceRef.current);
        silenceRef.current = null;
      }
      // CRITICAL FALLBACK FOR AUTO-SEND: If the microphone session closes naturally
      // due to system timeout or a browser-initiated end, auto-send any residual transcript
      // so the work is never lost.
      const finalVal = latestTranscriptRef.current.trim();
      if (finalVal) {
        handleSendMessage(finalVal);
        setVoiceTranscript("");
        latestTranscriptRef.current = "";
      }
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const stopVoiceCaptureAndSend = () => {
    if (silenceRef.current) {
      clearTimeout(silenceRef.current);
      silenceRef.current = null;
    }
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    } catch (e) {}
    setIsListening(false);
    setIsHoldingMic(false);

    // Fetch immediately from native mutable ref to prevent React race conditions or empty inputs
    const textToSend = latestTranscriptRef.current.trim();
    if (textToSend) {
      handleSendMessage(textToSend);
    }
    setVoiceTranscript("");
    latestTranscriptRef.current = "";
  };

  const handleMicClickToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isListening) {
      stopVoiceCaptureAndSend();
    } else {
      startVoiceCapture(e, false);
    }
  };

  // Unified message controller (Priority 1: programmed, Priority 2: Gemini AI)
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isSending || !profile) return;

    setLastInteractionTime(Date.now());
    setInputText("");
    setIsSending(true);

    const userMsgId = `usr_${Date.now()}`;
    const newMsg: Message = {
      id: userMsgId,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
    };

    setMessages(prev => [...prev, newMsg]);

    try {
      // Setup payload history to send to server proxy
      // Slice only the last 12 messages to keep search lightweight and cheap
      const recentHistory = messages.slice(-12).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: recentHistory,
          username: profile.username,
          rank: profile.rank,
          actionsToday: profile.actionsToday,
          email: profile.email,
          disrespectCount: disrespectCount,
          creatorOrders: creatorOrders.map(o => o.text)
        })
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // No-op for open_tool since tools render inline in chat

      const nexiaMsgId = `nex_${Date.now()}`;
      const responseMsg: Message = {
        id: nexiaMsgId,
        role: "nexia",
        content: data.text,
        timestamp: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        emotion: data.emotion as NexiaEmotion,
        actionExecuted: data.action,
        isNew: true
      };

      setMessages(prev => [...prev, responseMsg]);
      setCurrentEmotion(data.emotion as NexiaEmotion);

      // Automatically open the sliding chat drawer panel if an action/function is triggered on-screen
      if (data.action) {
        setIsHistoryOpen(true);
      }

      // Automatically reset the isNew flag after 3 seconds to prevent autoplay on tab-reentry or rerenders
      setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === nexiaMsgId ? { ...m, isNew: false } : m));
      }, 3000);

      // Check for disrespect strikes warning
      if (data.action && data.action.type === "warning_disrespect") {
        setDisrespectCount(prev => prev + 1);
      }

      // Save database reminder if triggered
      if (data.action && data.action.type === "add_reminder") {
        try {
          const remText = data.action.text;
          const remTime = data.action.time; // HH:MM
          
          const now = new Date();
          const [hhStr, mmStr] = remTime.split(":");
          const hh = parseInt(hhStr, 10);
          const mm = parseInt(mmStr, 10);
          
          const remDate = new Date();
          remDate.setHours(hh, mm, 0, 0);
          
          if (remDate.getTime() < now.getTime()) {
            remDate.setDate(remDate.getDate() + 1);
          }
          
          const remId = `remnd_${Date.now()}`;
          const newReminderData: Reminder = {
            id: remId,
            userId: profile.userId,
            text: remText,
            time: remDate.toISOString(),
            completed: false,
            createdAt: new Date().toISOString()
          };

          if (profile.userId.startsWith("invitado_")) {
            const localRem = localStorage.getItem(`guest_reminders_${profile.userId}`);
            const remList = localRem ? JSON.parse(localRem) : [];
            remList.push(newReminderData);
            localStorage.setItem(`guest_reminders_${profile.userId}`, JSON.stringify(remList));
          } else {
            await setDoc(doc(db, "users", profile.userId, "reminders", remId), newReminderData);
          }
        } catch (dbErr) {
          console.error("Error al guardar recordatorio en base de datos:", dbErr);
        }
      }
      
      // Read text with waifu audio voice synthesis! Defer action widgets until speech has finished and completed.
      speakText(data.text, async () => {
        setCompletedSpeeches(prev => ({ ...prev, [nexiaMsgId]: true }));
        
        // Execute expulsion immediately once she finishes her sentence
        if (data.action && data.action.type === "close_session") {
          window.speechSynthesis?.cancel();
          signOut(auth);
          return;
        }

        // Open YouTube or YouTube Music on speech end
        if (data.action) {
          if (data.action.type === "play_youtube_query" && data.action.videoId) {
            const videoId = data.action.videoId;
            const mediaType = data.action.mediaType; // "song" or "video"
            const baseUrl = mediaType === "song" ? "https://music.youtube.com" : "https://www.youtube.com";
            const targetUrl = `${baseUrl}/watch?v=${videoId}`;
            window.open(targetUrl, "_blank");
          } else if (data.action.type === "play_youtube_query") {
            const query = data.action.query;
            const targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
            window.open(targetUrl, "_blank");
          } else if (data.action.type === "play_media_url") {
            const url = data.action.url;
            window.open(url, "_blank");
          } else if (data.action.type === "web_search" || data.action.type === "image_search") {
            // Auto-opening search queries instantly "abra solo lo buscado"
            const url = data.action.url;
            window.open(url, "_blank");
          } else if (data.action.type === "open_app" && data.action.appName) {
            const app = data.action.appName;
            let schemeUrl = "";
            let backupUrl = "";
            
            switch (app) {
              case "whatsapp":
                schemeUrl = "whatsapp://";
                backupUrl = "https://web.whatsapp.com";
                break;
              case "telegram":
                schemeUrl = "tg://";
                backupUrl = "https://t.me";
                break;
              case "instagram":
                schemeUrl = "instagram://";
                backupUrl = "https://instagram.com";
                break;
              case "youtube":
                schemeUrl = "youtube://";
                backupUrl = "https://youtube.com";
                break;
              case "youtubemusic":
                schemeUrl = "vnd.youtube.music://";
                backupUrl = "https://music.youtube.com";
                break;
              case "spotify":
                schemeUrl = "spotify://";
                backupUrl = "https://open.spotify.com";
                break;
              case "facebook":
                schemeUrl = "fb://";
                backupUrl = "https://facebook.com";
                break;
              case "netflix":
                schemeUrl = "nflx://";
                backupUrl = "https://netflix.com";
                break;
              case "gmail":
                schemeUrl = "googlegmail://";
                backupUrl = "https://mail.google.com";
                break;
              case "tiktok":
                schemeUrl = "tiktok://";
                backupUrl = "https://tiktok.com";
                break;
              case "twitter":
                schemeUrl = "twitter://";
                backupUrl = "https://x.com";
                break;
              default:
                backupUrl = `https://www.google.com/search?q=${encodeURIComponent(app)}`;
            }

            if (schemeUrl) {
              // Attempt launching via deep link. Wait some milliseconds.
              const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
              if (isMobile) {
                let blurred = false;
                const onBlur = () => { blurred = true; };
                window.addEventListener("blur", onBlur);
                window.location.href = schemeUrl;
                
                setTimeout(() => {
                  window.removeEventListener("blur", onBlur);
                  if (!blurred) {
                    window.open(backupUrl, "_blank");
                  }
                }, 800);
              } else {
                window.open(backupUrl, "_blank");
              }
            } else {
              window.open(backupUrl, "_blank");
            }
          } else if (data.action.type === "add_creator_directive" && data.action.text) {
            try {
              await addDoc(collection(db, "creator_orders"), {
                text: data.action.text.trim(),
                createdAt: new Date().toISOString()
              });
            } catch (err) {
              console.error("Error automatic saving creator order:", err);
            }
          }
        }
      });

      // Increment daily action limit if counted
      if (data.incrementAction) {
        const nextActionsVal = profile.actionsToday + 1;
        setProfile({ ...profile, actionsToday: nextActionsVal });
        // Update to DB
        await updateDoc(doc(db, "users", profile.userId), {
          actionsToday: nextActionsVal
        });
      }

    } catch (e: any) {
      console.error(e);
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        role: "nexia",
        content: e.message || "Tuve un pequeño problema para conectarme hoy. ¿Podrías intentar enviarlo de nuevo?",
        timestamp: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        emotion: "tristeza"
      };
      setMessages(prev => [...prev, errorMsg]);
      setCurrentEmotion("tristeza");
    } finally {
      setIsSending(false);
    }
  };

  // Interactive head/avatar touches returns Nexia answers
  const handleTouchMessageReceived = (text: string, isTouch?: boolean, emotion?: NexiaEmotion, action?: any) => {
    if (!profile) return;
    const nexMsgId = `nex_${Date.now()}`;
    const touchResponse: Message = {
      id: nexMsgId,
      role: "nexia",
      content: text,
      timestamp: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      emotion: emotion || "alegría",
      actionExecuted: action
    };
    setMessages(prev => [...prev, touchResponse]);
    if (emotion) setCurrentEmotion(emotion);

    // Close session automatically if disrespect is flagged (instantly, since speech finishes beforehand)
    if (action && action.type === "close_session") {
       window.speechSynthesis?.cancel();
       signOut(auth);
    }

    // Check for disrespect strikes warning
    if (action && action.type === "warning_disrespect") {
      setDisrespectCount(prev => prev + 1);
    }
  };

  // Sign out handle
  const handleLogout = async () => {
    window.speechSynthesis?.cancel();
    await signOut(auth);
  };

  // Simulated Rank Changer updates
  const handleSimulatedRankChange = async (newRank: "gratuito" | "premium" | "plus" ) => {
    if (!profile) return;
    const nextProf = {
      ...profile,
      rank: newRank
    };
    setProfile(nextProf);
    
    // Write directly bypassing profile safety lock using a standard custom admin schema update
    await setDoc(doc(db, "users", profile.userId), {
      ...profile,
      rank: newRank
    });
  };

  // Trigger alarms reminders popup
  const handleTriggerPendingAlarms = (reminders: Reminder[]) => {
    // Avoid double prompting
    if (pendingReminders.length === 0 && reminders.length > 0) {
      setPendingReminders(reminders);
      setShowRemindersModal(true);
    }
  };

  // Clear or dismiss alert
  const handleMarkSelectedReminderCompleted = async (rem: Reminder) => {
    if (!profile) return;
    setPendingReminders(prev => prev.filter(r => r.id !== rem.id));
    await updateDoc(doc(db, "users", profile.userId, "reminders", rem.id), {
      completed: true
    });
  };

  // Theme-driven CSS variables mapper
  const getThemeClasses = () => {
    const theme = profile?.settings.visualTheme || "neon-violet";
    switch (theme) {
      case "neon-violet":
        return {
          bg: "from-slate-950 via-slate-900 to-slate-950",
          cardBg: "bg-slate-950/70 border-purple-500/30",
          textAccent: "text-purple-400",
          btnAccent: "bg-gradient-to-r from-purple-500 to-indigo-600 shadow-[0_4px_15px_rgba(168,85,247,0.3)] hover:brightness-110",
          glowBorder: "border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]",
          glowColorText: "bg-gradient-to-r from-purple-300 via-pink-300 to-purple-400 bg-clip-text text-transparent"
        };
      case "neon-blue":
        return {
          bg: "from-slate-950 via-slate-900 to-slate-950",
          cardBg: "bg-slate-950/70 border-cyan-500/30",
          textAccent: "text-cyan-400",
          btnAccent: "bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_4px_15px_rgba(6,182,212,0.3)] hover:brightness-110",
          glowBorder: "border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.15)]",
          glowColorText: "bg-gradient-to-r from-cyan-300 via-blue-200 to-cyan-400 bg-clip-text text-transparent"
        };
      case "cyberpunk":
        return {
          bg: "from-black via-zinc-950 to-black",
          cardBg: "bg-zinc-900/90 border-yellow-500",
          textAccent: "text-yellow-400",
          btnAccent: "bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_4px_15px_rgba(234,179,8,0.4)] font-black uppercase text-xs",
          glowBorder: "border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]",
          glowColorText: "text-yellow-400 uppercase font-black"
        };
      case "amoled":
        return {
          bg: "from-black to-black",
          cardBg: "bg-black border-slate-800",
          textAccent: "text-slate-300",
          btnAccent: "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700",
          glowBorder: "border-slate-850",
          glowColorText: "text-slate-200"
        };
    }
  };

  const currentTheme = getThemeClasses();

  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 font-sans relative">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-10 h-10 text-purple-400 animate-spin" />
          <h2 className="text-sm font-semibold tracking-wider text-slate-400 uppercase select-none animate-pulse">Sintonizando Nexia...</h2>
        </div>
      </div>
    );
  }

  if (!currentUser || !profile) {
    return <AuthScreen onAuthSuccess={(uid) => console.log("Authenticated ID: ", uid)} />;
  }

  return (
    <div className={`min-h-screen w-full bg-gradient-to-b ${currentTheme.bg} text-slate-100 flex flex-col p-4 md:p-6 overflow-hidden relative font-sans transition-all duration-700`}>
      
      {/* Decorative cyber grid nodes */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* --- FIRST-REGISTRATION NAME PROMPT OVERLAY (WITHOUT AI) --- */}
      <AnimatePresence>
        {profile.isNewUser && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 z-[99] font-sans">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md bg-slate-900/90 border border-purple-500/30 p-8 rounded-2xl shadow-[0_0_40px_rgba(168,85,247,0.25)] text-center relative animate-fade-in"
            >
              <div className="absolute top-2 right-2 flex gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <div className="mb-6 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/40 flex items-center justify-center mb-3 text-2xl animate-bounce">
                  ✨
                </div>
                <h3 className="text-xl font-black tracking-tight text-white uppercase">Sintonizando Nexia</h3>
                <p className="text-slate-400 text-[9px] mt-1 leading-snug tracking-widest font-mono">ESTABLECIENDO PROTOCOLO DE RECONOCIMIENTO</p>
              </div>

              <div className="space-y-5">
                <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                  ¡Hola! Soy <span className="text-purple-400 font-extrabold uppercase animate-pulse">Nexia</span>, tu asistente virtual de neón. 🌟
                  Por ser tu primera vez registrándote, ¿me podrías decir cómo te llamas?
                </p>

                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono pl-1">NOMBRE COMPLETO / ALIAS</label>
                  <input 
                    type="text"
                    value={initialNameInput}
                    onChange={(e) => setInitialNameInput(e.target.value)}
                    maxLength={32}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 hover:border-slate-700 p-3 rounded-xl font-bold text-slate-100 text-sm outline-none transition uppercase"
                    placeholder="Escribe tu nombre..."
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && initialNameInput.trim()) {
                        await handleSaveInitialName();
                      }
                    }}
                  />
                </div>

                <button
                  disabled={!initialNameInput.trim()}
                  onClick={handleSaveInitialName}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-widest cursor-pointer transition shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:scale-[1.01]"
                >
                  Establecer Nombre & Entrar 🚀
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- PENDING REMINDERS ALERTS MODAL POPUP --- */}
      <AnimatePresence>
        {showRemindersModal && pendingReminders.length > 0 && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-hidden font-sans">
            <motion.div 
              id="reminders-alert-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-slate-950 border border-pink-500/40 p-6 rounded-xl shadow-[0_0_25px_rgba(236,72,153,0.35)] relative"
            >
              <div className="flex items-center gap-2 mb-4 text-pink-500">
                <AlertCircle className="w-6 h-6 animate-bounce" />
                <h3 className="text-lg font-black uppercase tracking-widest">Alertas y Recordatorios</h3>
                <button 
                  onClick={() => setShowRemindersModal(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 select-none">Nexia tiene avisos importantes pendientes de tu anterior inicio:</p>
              
              <div className="space-y-2 max-h-[250px] overflow-y-auto mb-5 list-scrollbar pr-1">
                {pendingReminders.map(rem => (
                  <div key={rem.id} className="p-3 rounded-lg bg-pink-950/20 border border-pink-500/20 flex justify-between items-start text-left gap-2 animate-pulse">
                    <div>
                      <p className="text-xs font-bold text-pink-200">{rem.text}</p>
                      <p className="text-[9px] text-slate-400 select-none mt-1">{new Date(rem.time).toLocaleString("es-ES")}</p>
                    </div>
                    <button
                      id={`rem-modal-clear-${rem.id}`}
                      onClick={() => handleMarkSelectedReminderCompleted(rem)}
                      className="bg-pink-500/20 hover:bg-pink-500/40 border border-pink-500/50 text-white text-3xs font-extrabold px-2.5 py-1 rounded transition cursor-pointer"
                    >
                      Completada
                    </button>
                  </div>
                ))}
              </div>

              <button
                id="btn-close-rems-modal"
                onClick={() => setShowRemindersModal(false)}
                className="w-full py-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:brightness-110 text-white font-extrabold text-xs rounded transition uppercase cursor-pointer"
              >
                Cerrar Bandeja
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ELEGANTE HISTORIAL DE CHAT DESLIZANTE --- */}
      <AnimatePresence>
        {isHistoryOpen && (
          <>
            {/* Semi-transparent drawer backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            
            {/* Sliding Drawer card content */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 180 }}
              className="fixed left-0 top-0 bottom-0 w-full max-w-sm md:max-w-md bg-slate-950/95 border-r border-purple-500/20 backdrop-blur-md p-5 z-50 flex flex-col justify-between shadow-[0_0_50px_rgba(0,0,0,0.9)]"
            >
              <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-4 select-none">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-400 animate-pulse" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Registro de Diálogos // GADGETS</h3>
                </div>
                <button 
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Dynamic chat conversation log viewport */}
              <div className="flex-1 overflow-y-auto space-y-4 list-scrollbar pr-1 mb-4 text-left flex flex-col-reverse justify-start">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      id={`chat-bubble-${msg.id}`}
                      key={msg.id}
                      className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                    >
                      {/* Visual companion avatars icons */}
                      <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center shrink-0 border select-none text-xxs font-bold ${
                        msg.role === "user" 
                          ? "bg-slate-900 border-slate-700 text-slate-400" 
                          : "bg-purple-950 border-purple-500/45 text-cyan-400"
                      }`}>
                        {msg.role === "user" ? "TU" : "NX"}
                      </div>

                      <div className="flex flex-col text-left">
                        {/* Speech messaging cloud frame */}
                        <div className={`p-3 rounded-2xl text-[11px] relative leading-relaxed ${
                          msg.role === "user"
                            ? `${currentTheme.cardBg} border rounded-tr-none text-slate-100`
                            : "bg-slate-950/80 border border-purple-500/20 rounded-tl-none font-medium text-slate-200"
                        }`}>
                          <p className="whitespace-pre-line tracking-wide font-sans">{msg.content}</p>

                          {/* ACTIONS EMITTING DETECTED WIDGETS */}
                          {msg.role === "nexia" && msg.actionExecuted && (
                            <div className="mt-3.5 pt-3 border-t border-purple-500/10 space-y-2 uppercase font-sans">
                              
                              {/* A. Search Trigger Cards */}
                              {(msg.actionExecuted.type === "web_search" || msg.actionExecuted.type === "image_search" || msg.actionExecuted.type === "video_search") && (
                                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-left relative overflow-hidden flex items-center justify-between">
                                  <div>
                                    <p className="text-10px text-cyan-400 font-bold select-none">[Resultados De Búsqueda]</p>
                                    <p className="text-[11px] font-semibold text-slate-200 mt-0.5 truncate max-w-[170px]">{msg.actionExecuted.query}</p>
                                  </div>
                                  <a
                                    href={msg.actionExecuted.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/50 rounded-lg text-[9px] font-semibold text-cyan-300 transition flex items-center gap-1 select-none cursor-pointer"
                                  >
                                    Explorar <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              )}

                              {/* B. Youtube direct search interactive frames embed */}
                              {msg.actionExecuted.type === "play_youtube_query" && (
                                <div className="rounded-lg overflow-hidden relative space-y-2">
                                  <div className="p-1 bg-slate-950 border border-slate-850 rounded-lg">
                                    <iframe 
                                      title="YouTube Live Embed player"
                                      className="w-full h-[180px] rounded-lg border-0"
                                      src={msg.actionExecuted.videoId 
                                        ? `https://www.youtube.com/embed/${msg.actionExecuted.videoId}?autoplay=${msg.isNew ? 1 : 0}&mute=0`
                                        : `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(msg.actionExecuted.query)}&autoplay=${msg.isNew ? 1 : 0}`
                                      }
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                    <p className="text-[8px] font-mono text-slate-500 text-center mt-1">Sintonizando automáticamente: "{msg.actionExecuted.query}"</p>
                                  </div>
                                  
                                  {msg.actionExecuted.videoId && (
                                    <button
                                      onClick={() => {
                                        const videoId = msg.actionExecuted.videoId;
                                        const mediaType = msg.actionExecuted.mediaType; // "song" or "video"
                                        const isAndroid = /Android/i.test(navigator.userAgent);
                                        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

                                        if (mediaType === "video") {
                                          if (isAndroid) {
                                            // Trigger direct android intent schema for official YouTube App
                                            window.open(`vnd.youtube:${videoId}`, "_blank");
                                          } else if (isIOS) {
                                            // iOS direct YouTube scheme
                                            window.open(`youtube://watch?v=${videoId}`, "_blank");
                                          } else {
                                            window.open(`https://www.youtube.com/watch?v=${videoId}&autoplay=1`, "_blank");
                                          }
                                        } else {
                                          // Song - Launch YouTube Music app or fall back to high quality music player
                                          if (isAndroid) {
                                            window.open(`intent://music.youtube.com/watch?v=${videoId}#Intent;package=com.google.android.apps.youtube.music;scheme=https;end`, "_blank");
                                          } else {
                                            window.open(`https://music.youtube.com/watch?v=${videoId}&autoplay=1`, "_blank");
                                          }
                                        }
                                      }}
                                      className="w-full py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-extrabold text-[8px] rounded-lg tracking-wider transition shadow-[0_0_10px_rgba(220,38,38,0.25)] flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                      <span>🔓 ABRIR DIRECTO EN LA APLICACIÓN OFICIAL (AUTO-PLAY)</span>
                                      <ExternalLink className="w-3.5 h-3.5 animate-pulse" />
                                    </button>
                                  )}
                                </div>
                              )}
 
                              {/* C. User Link player trigger */}
                              {msg.actionExecuted.type === "play_media_url" && (
                                <div className="rounded bg-slate-950 border border-slate-850">
                                  <div className="p-1.5">
                                    <a 
                                      href={msg.actionExecuted.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="w-full text-center py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 font-bold text-[10px] rounded transition flex items-center justify-center gap-1 select-none cursor-pointer"
                                    >
                                      Reproducir Enlace Externo <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>
                              )}

                              {/* D. Inline Network IP / Diagnostics widget */}
                              {msg.actionExecuted.type === "network_diagnostics" && (
                                <NetworkDiagnosticsWidget ip={msg.actionExecuted.ip || "127.0.0.1"} />
                              )}

                              {/* E. Inline Calculator widget */}
                              {msg.actionExecuted.type === "calculator" && (
                                <InlineCalculator prefill={msg.actionExecuted.prefill || ""} />
                              )}

                              {/* F. Inline Password Generator widget */}
                              {msg.actionExecuted.type === "password" && (
                                <InlinePasswordGenerator />
                              )}

                              {/* G. Inline Unit/Currency Converter widget */}
                              {msg.actionExecuted.type === "converter" && (
                                <InlineConverter />
                              )}

                              {/* H. Inline stopwatch/timer widget */}
                              {msg.actionExecuted.type === "timer" && (
                                <InlineTimer 
                                  messageId={msg.id}
                                  autostartChrono={msg.actionExecuted.autostartChrono}
                                  autostartTimerMinutes={msg.actionExecuted.autostartTimerMinutes}
                                  autostartTimerSeconds={msg.actionExecuted.autostartTimerSeconds}
                                />
                              )}

                              {/* I. Camera video taker widget */}
                              {msg.actionExecuted.type === "camera" && (
                                <InlineCamera />
                              )}

                              {/* J. Popular Web Apps Widget */}
                              {msg.actionExecuted.type === "apps" && (
                                <InlineApps />
                              )}

                              {/* K. Internet Speedtest Quality Widget */}
                              {msg.actionExecuted.type === "speed_test" && (
                                <InlineSpeedTest 
                                  messageId={msg.id}
                                  autostart={msg.actionExecuted.autostart} 
                                />
                              )}

                              {/* L. Translator Widget */}
                              {msg.actionExecuted.type === "translator" && (
                                <InlineTranslate 
                                  messageId={msg.id}
                                  initialText={msg.actionExecuted.initialText}
                                  initialLangPair={msg.actionExecuted.initialLangPair}
                                  autostart={msg.actionExecuted.autostart}
                                />
                              )}

                              {/* M. Device Information Widget */}
                              {msg.actionExecuted.type === "device_info" && (
                                <InlineDeviceInfo />
                              )}

                              {/* N. Calendar Grid Month Widget */}
                              {msg.actionExecuted.type === "calendar" && (
                                <InlineCalendarView />
                              )}

                              {/* O. Spelling Checker Widget */}
                              {msg.actionExecuted.type === "spell_checker" && (
                                <InlineSpellChecker />
                              )}

                              {/* P. Inline Zen Breathing Widget */}
                              {msg.actionExecuted.type === "zen_breathing" && (
                                <InlineZenBreathing />
                              )}

                              {/* Q. Inline Tic-Tac-Toe Game Widget */}
                              {msg.actionExecuted.type === "tictactoe" && (
                                <InlineTicTacToe />
                              )}

                              {/* R. Crypto Widget */}
                              {msg.actionExecuted.type === "crypto" && (
                                <CryptoPriceWidget />
                              )}

                              {/* S. Adventure RPG Widget */}
                              {msg.actionExecuted.type === "adventure" && (
                                <CYOAdventureWidget />
                              )}

                              {/* T. Holiday Tracker Widget */}
                              {msg.actionExecuted.type === "holiday_tracker" && (
                                <HolidayTrackerWidget />
                              )}

                              {/* U. World Clock Widget */}
                              {msg.actionExecuted.type === "world_clock" && (
                                <InlineWorldClock onInteract={() => setLastInteractionTime(Date.now())} />
                              )}

                              {/* V. Weather Hologram Widget */}
                              {msg.actionExecuted.type === "weather_hologram" && (
                                <InlineWeather onInteract={() => setLastInteractionTime(Date.now())} />
                              )}

                              {/* W. Zen Audio Synthesizer Widget */}
                              {msg.actionExecuted.type === "zen_noise" && (
                                <InlineSpecNoise onInteract={() => setLastInteractionTime(Date.now())} />
                              )}

                            </div>
                          )}
                        </div>
                        <span className="text-[8px] font-mono text-slate-500 mt-1 select-none w-full block text-left px-1">
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick auxiliary input in drawer overlay for direct writebacks */}
              <div className="p-2.5 bg-slate-900/40 border border-slate-900 rounded-xl flex gap-2">
                <input 
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Escribe un mensaje de audio secundario..."
                  className="flex-1 bg-slate-950/50 border border-slate-900 rounded-lg px-3 py-2 text-[10px] text-white outline-none focus:border-purple-500 transition h-8"
                />
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim()}
                  className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:brightness-110 text-white rounded-lg transition disabled:opacity-40 cursor-pointer w-8 h-8 flex items-center justify-center"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- VOIS-FIRST INTERCONNECT CENTRAL ZONE (Takes up almost 100% space) --- */}
      <div className="flex-1 flex flex-col justify-between h-[calc(100vh-2rem)] relative min-w-0 z-10 select-none">
        
        {/* COMPACT TOP SYSTEM HEADER BAR */}
        <div className={`p-4 rounded-2xl border ${currentTheme.cardBg} backdrop-blur-md flex justify-between items-center relative z-40 shadow-lg transition-all duration-500 shrink-0 select-none`}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-ping shrink-0" />
            <h2 className={`text-xxs sm:text-xs font-black tracking-widest uppercase ${currentTheme.glowColorText} flex items-center gap-1.5`}>
              NEXIA SYSTEM // VOZ PRIMARIA
            </h2>
          </div>

          {/* Admin badge level status */}
          <div className="hidden min-[670px]:flex items-center justify-center">
            {profile.rank === "plus" ? (
              <span className="text-[10px] font-black text-cyan-400 bg-cyan-950/80 px-4 py-1 rounded-full border border-cyan-400/30 tracking-widest shadow-[0_0_12px_rgba(34,211,238,0.2)]">
                ⚙️ OWNER PLUS ({profile.actionsToday} / 45)
              </span>
            ) : (
              <span className="text-xxs font-black text-slate-400 bg-slate-950/80 px-3 py-1 rounded-full border border-slate-800 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                Acciones: {profile.actionsToday} {profile.rank === "gratuito" ? "/ 6" : "/ 25"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Elegant corner switch logs drawer button */}
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="px-3 py-1.5 text-[9px] font-bold text-cyan-400 bg-cyan-950/40 hover:bg-cyan-950/80 border border-cyan-500/20 hover:border-cyan-400/50 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              title="VER DIÁLOGOS DE RESPALDO"
            >
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="hidden sm:inline">VER HISTORIAL</span>
            </button>

            <button
              onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
              className="text-slate-400 hover:text-slate-100 transition p-1.5 bg-slate-950/60 border border-slate-900 rounded-lg cursor-pointer"
              title="Ajustes de Voz"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Corner Configuration drop down card overlay */}
            <AnimatePresence>
              {showSettingsDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute top-16 right-4 z-50 w-64 bg-slate-950 border border-purple-500/30 backdrop-blur-md rounded-xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.85)] font-sans uppercase text-[10px] space-y-4 text-left"
                >
                  {/* Account Status Info: Rango & Usos */}
                  <div className="space-y-1.5 text-left border-b border-slate-900 pb-3">
                    <span className="text-slate-500 font-bold block mb-0.5 text-[8px] tracking-wider">Estado de Cuenta</span>
                    <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-purple-500/10 gap-2">
                      <div>
                        <span className="text-slate-500 block text-[7px] uppercase leading-none">Rango</span>
                        <span className={`font-black text-[10px] tracking-wider uppercase leading-snug ${
                          profile.rank === "plus" ? "text-pink-400 font-extrabold animate-pulse" :
                          profile.rank === "premium" ? "text-yellow-400" : "text-cyan-400"
                        }`}>
                          {profile.rank}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block text-[7px] uppercase leading-none">Consumo</span>
                        <span className="font-extrabold text-[10px] text-slate-200 leading-snug">
                          {profile.actionsToday} {profile.rank === "plus" ? " (Ilim: / 45)" : profile.rank === "premium" ? "/ 25" : "/ 6"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Name Changer */}
                  <div className="space-y-1.5 text-left border-b border-slate-900 pb-3">
                    <span className="text-slate-500 font-bold block mb-0.5 text-[8px] tracking-wider">Nombre de Usuario</span>
                    <input 
                      type="text"
                      value={profile.username}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setProfile({ ...profile, username: val });
                        await updateUserProfileOnDb(profile.userId, { username: val });
                      }}
                      className="w-full bg-slate-900 border border-slate-850 rounded p-1.5 font-bold text-slate-100 text-[10px] outline-none hover:border-slate-700 focus:border-purple-500 transition"
                      placeholder="Tu nombre..."
                      maxLength={32}
                    />
                  </div>

                  {/* Visual Theme Selector */}
                  <div className="space-y-1.5 text-left">
                    <span className="text-slate-500 font-bold block mb-0.5">Tema Estético</span>
                    <div className="flex gap-2">
                      {[
                        { id: "neon-violet", color: "bg-purple-600", label: "Morado" },
                        { id: "neon-blue", color: "bg-cyan-500", label: "Azul" },
                        { id: "cyberpunk", color: "bg-yellow-500", label: "Cyber" },
                        { id: "amoled", color: "bg-zinc-800", label: "Amoled" }
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => {
                            updateUserProfileOnDb(profile.userId, { settings: { ...profile.settings, visualTheme: t.id as any } });
                            setProfile({ ...profile, settings: { ...profile.settings, visualTheme: t.id as any } });
                          }}
                          className={`w-6 h-6 rounded-full border-2 cursor-pointer ${t.color} ${
                            profile.settings.visualTheme === t.id ? "border-white scale-110" : "border-transparent opacity-60 hover:opacity-100"
                          }`}
                          title={t.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Voice enabled / disabled switcher */}
                  <div className="flex items-center justify-between text-left border-t border-slate-900 pt-3">
                    <span className="text-slate-300 font-bold">Lector de Voz</span>
                    <button
                      onClick={() => {
                        const updatedVoiceEnabled = !profile.settings.voiceEnabled;
                        updateUserProfileOnDb(profile.userId, { settings: { ...profile.settings, voiceEnabled: updatedVoiceEnabled } });
                        setProfile({ ...profile, settings: { ...profile.settings, voiceEnabled: updatedVoiceEnabled } });
                        if (!updatedVoiceEnabled) window.speechSynthesis?.cancel();
                      }}
                      className={`px-2 py-1 rounded text-[8px] font-extrabold cursor-pointer border transition ${
                        profile.settings.voiceEnabled 
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" 
                          : "bg-slate-900 border-slate-800 text-slate-500"
                      }`}
                    >
                      {profile.settings.voiceEnabled ? "ACTIVO" : "APAGADO"}
                    </button>
                  </div>

                  {/* Voice Volume Slider */}
                  <div className="space-y-1.5 text-left border-t border-slate-900 pt-3">
                    <div className="flex justify-between text-slate-400">
                      <span>Volumen de Voz</span>
                      <span className="font-bold text-slate-200">{Math.round(profile.settings.voiceVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={profile.settings.voiceVolume}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        updateUserProfileOnDb(profile.userId, { settings: { ...profile.settings, voiceVolume: val } });
                        setProfile({ ...profile, settings: { ...profile.settings, voiceVolume: val } });
                      }}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>

                  {/* Voice Speed Slider */}
                  <div className="space-y-1.5 text-left border-t border-slate-900 pt-3">
                    <div className="flex justify-between text-slate-400">
                      <span>Velocidad de Lectura</span>
                      <span className="font-bold text-slate-200">{profile.settings.voiceSpeed.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.05"
                      value={profile.settings.voiceSpeed}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        updateUserProfileOnDb(profile.userId, { settings: { ...profile.settings, voiceSpeed: val } });
                        setProfile({ ...profile, settings: { ...profile.settings, voiceSpeed: val } });
                      }}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>

                  {/* Creator Directives Toggle for Admin */}
                  {isAdminEmail(profile.email) && (
                    <div className="border-t border-slate-900 pt-2.5 text-left">
                      <span className="text-pink-400 font-extrabold block mb-1 text-[7px] tracking-wider animate-pulse">🛠️ PANEL SUPREMO</span>
                      <button
                        onClick={() => {
                          setShowSettingsDropdown(false);
                          setShowCreatorOrdersModal(true);
                        }}
                        className="w-full py-1.5 bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 border border-pink-500/40 text-pink-300 font-black text-[8px] rounded-lg transition tracking-wide cursor-pointer flex items-center justify-center gap-1"
                      >
                        GESTIONAR DIRECTRICES
                      </button>
                    </div>
                  )}

                  {/* Profile email check */}
                  <div className="border-t border-slate-900 pt-2.5 text-left text-[8px] text-slate-500 normal-case">
                    Cuenta: <span className="font-bold text-slate-400">{profile.email}</span>
                  </div>

                  {/* Sign Out Button */}
                  <div className="border-t border-slate-900 pt-3">
                    <button
                      onClick={() => {
                        window.speechSynthesis?.cancel();
                        signOut(auth);
                      }}
                      className="w-full py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-500 font-extrabold text-[9px] rounded-lg transition tracking-widest cursor-pointer"
                    >
                      CERRAR SESIÓN (LOGOUT)
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* COMPANION AVATAR INTERACTIVE WINDOW ZONE - Enhanced Height and Scale */}
        <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 min-h-[410px] md:min-h-[500px]">
          <div className="w-full max-w-[480px] md:max-w-lg h-[56vh] md:h-[62vh] flex flex-col items-center justify-center relative scale-120 sm:scale-105 transition-all duration-300">
            <NexiaAvatar
              currentEmotion={currentEmotion}
              setEmotion={setCurrentEmotion}
              isSpeaking={isSpeaking}
              setIsSpeaking={setIsSpeaking}
              settings={profile.settings}
              onReceiveMessage={handleTouchMessageReceived}
              disrespectCount={disrespectCount}
              isCreator={profile ? isAdminEmail(profile.email) : false}
            />
          </div>
        </div>

        {/* INTERACTIVE COMPREHENSIVE VOICE CONTROL CONSOLE POD - Streamlined and responsive padding */}
        <div className={`p-2.5 sm:p-4 md:p-5 rounded-2xl md:rounded-3xl border ${currentTheme.cardBg} backdrop-blur-md flex flex-col gap-1.5 sm:gap-3 relative shadow-[0_15px_40px_rgba(0,0,0,0.85)] shrink-0 font-sans mt-auto max-w-sm sm:max-w-xl mx-auto w-full transition-all duration-300`}>

          {/* Active audio monitoring feedback / dynamic real-time text */}
          <div className="w-full bg-black/60 rounded-lg border border-slate-900/80 p-2 sm:p-3 min-h-[38px] sm:min-h-[58px] flex flex-col justify-center text-center relative overflow-hidden select-none">
            {isListening ? (
              <div className="space-y-0.5 sm:space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                  <span className="text-[8px] sm:text-[9px] text-red-400 font-black uppercase tracking-widest animate-pulse">SINTONIZANDO VOZ...</span>
                </div>
                <p className="text-[10px] sm:text-xs font-black text-cyan-300 tracking-wider line-clamp-1">
                  "{voiceTranscript || "Escuchando... Habla ahora..."}"
                </p>
              </div>
            ) : (
              <div className="flex justify-center items-center h-full">
                <span className="text-[8px] sm:text-[9px] font-mono text-slate-500 uppercase tracking-widest text-center">
                  VOZ INACTIVA // HAZ CLIC EN EL BOTÓN PARA HABLAR
                </span>
              </div>
            )}

            {/* Waveform animation in real-time */}
            {isListening && (
              <div className="absolute bottom-0 left-0 right-0 h-1 flex gap-0.5 px-3">
                {[...Array(16)].map((_, index) => (
                  <span 
                    key={index} 
                    className="flex-1 bg-gradient-to-t from-red-600/30 to-cyan-400/40 rounded"
                    style={{
                      height: `${Math.random() * 90 + 10}%`,
                      animation: 'pulse 1.2s infinite ease-in-out',
                      animationDelay: `${index * 0.05}s`
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Interactive controls: Main hold mic & quick toggles */}
          <div className="flex items-center justify-center gap-4 sm:gap-6">

            {/* Secondary Option: Keyboard toggler directly inline */}
            <button
              onClick={() => setShowKeyboardInput(!showKeyboardInput)}
              className={`p-2.5 sm:p-3 rounded-full border transition cursor-pointer hover:scale-105 active:scale-95 ${
                showKeyboardInput 
                  ? "bg-purple-600/30 border-purple-400 text-purple-200"
                  : "bg-slate-950/60 border-slate-850 text-slate-500 hover:text-slate-300"
              }`}
              title="Escribir un texto"
            >
              <Keyboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Giant central pulsating cyberpunk microphone button */}
            <div className="relative shrink-0">
              <AnimatePresence>
                {isListening && (
                  <>
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0.8 }}
                      animate={{ scale: 1.6, opacity: 0 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full bg-red-500/25 pointer-events-none"
                    />
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0.6 }}
                      animate={{ scale: 2.1, opacity: 0 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                      className="absolute inset-0 rounded-full bg-cyan-400/20 pointer-events-none"
                    />
                  </>
                )}
              </AnimatePresence>

              <button
                id="mic-speak-hold-button"
                onClick={handleMicClickToggle}
                className={`w-16 h-16 rounded-full border-2 hover:scale-105 active:scale-95 cursor-pointer transition-all duration-300 flex items-center justify-center relative ${
                  isListening 
                    ? "bg-gradient-to-tr from-rose-600 to-red-500 border-red-400 shadow-[0_0_25px_rgba(239,68,68,0.55)] text-white" 
                    : "bg-slate-950 border-purple-500/40 text-cyan-400 hover:text-cyan-300 shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:border-purple-400/60"
                }`}
                title="Toca para comenzar a hablar, toca de nuevo para enviar"
              >
                {isListening ? (
                  <MicOff className="w-6 h-6 animate-pulse" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </button>
            </div>

            {/* Voice system tier label / tip */}
            <div className="text-left hidden min-[380px]:block select-none text-2xs font-extrabold tracking-widest text-slate-500 uppercase leading-[1.3] max-w-[130px]">
              {isListening ? (
                <span className="text-red-400 font-extrabold animate-pulse">TRANSMITIENDO VOZ...</span>
              ) : (
                <>
                  HACER <span className="text-cyan-400">UN CLICK</span> PARA ACTIVAR / DESACTIVAR MICRÓFONO
                </>
              )}
            </div>

          </div>

          {/* Actionable keyboard input line drawer */}
          <AnimatePresence>
            {showKeyboardInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden w-full flex gap-2 pt-1"
              >
                <input
                  id="chat-user-input"
                  type="text"
                  value={inputText}
                  placeholder="Pregúntale algo a Nexia por teclado convencional..."
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  disabled={isSending}
                  className="flex-1 bg-slate-950/80 border border-slate-900 rounded-lg px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-purple-500/50 transition h-10 min-w-0 font-medium"
                />
                <button
                  id="chat-send-btn"
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || isSending}
                  className={`${currentTheme.btnAccent} p-2.5 rounded-lg transition disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer h-10 w-10`}
                >
                  {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

      {/* GLOBAL CREATOR ORDERS COMPORTAMIENTO MODAL */}
      <AnimatePresence>
        {showCreatorOrdersModal && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-hidden font-sans uppercase text-[10px] tracking-wide">
            <motion.div 
              id="creator-orders-supreme-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-slate-950 border border-pink-500/40 p-5 rounded-2xl shadow-[0_0_50px_rgba(236,72,153,0.35)] relative text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-pink-500/25 pb-3 mb-4">
                <div className="flex items-center gap-2 text-pink-400">
                  <ShieldCheck className="w-5 h-5 text-pink-400 animate-pulse" />
                  <span className="font-extrabold tracking-widest text-[11px]">DIRECTRICES COMPORTAMENTALES PRIMORDIALES (CÓDIGO DE NUCLEO)</span>
                </div>
                <button 
                  onClick={() => setShowCreatorOrdersModal(false)}
                  className="text-slate-400 hover:text-slate-150 transition p-1.5 bg-slate-900 border border-slate-800 rounded font-bold cursor-pointer"
                  title="Cerrar Panel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Desc */}
              <p className="normal-case text-slate-400 text-[10px] mb-4 leading-relaxed font-sans font-medium">
                Señor, tus mandamientos se inyectan en tiempo real en la matriz del prompt de Nexia. Reconfiguran su personalidad, prioridades, reglas de secreto y dicción instantáneamente para todos los usuarios.
              </p>

              {/* Add New order Form */}
              <div className="space-y-1.5 mb-5">
                <span className="text-[8px] text-pink-400 font-bold block">NUEVA REGLA / MANDATO DE COMPORTAMIENTO:</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej. Sé más mimosa conmigo, habla más lento hoy..."
                    value={newOrderInput}
                    onChange={(e) => setNewOrderInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCreatorOrder()}
                    className="flex-1 bg-slate-900 border border-slate-850 rounded px-2.5 py-2 text-slate-200 text-[10px] outline-none hover:border-slate-700 focus:border-pink-500 normal-case font-medium"
                  />
                  <button
                    onClick={handleAddCreatorOrder}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white font-extrabold text-[9px] rounded-lg transition tracking-wider shrink-0 cursor-pointer"
                  >
                    PROGRAMAR REGLA
                  </button>
                </div>
              </div>

              {/* List of rules */}
              <span className="text-[8px] text-slate-500 font-bold block mb-1">REGLAS PROGRAMADAS ACTIVAS ({creatorOrders.length}):</span>
              <div className="space-y-2 max-h-[220px] overflow-y-auto list-scrollbar pr-1 mb-2 bg-slate-900/40 p-2.5 rounded-xl border border-slate-900">
                {creatorOrders.length === 0 ? (
                  <p className="text-center py-6 text-slate-500 italic select-none normal-case">Sin reglas programadas. Nexia opera en su modo base estándar inteligente.</p>
                ) : (
                  creatorOrders.map((order, index) => (
                    <div key={order.id} className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg flex justify-between items-center gap-3">
                      {editingOrderId === order.id ? (
                        <div className="flex-1 flex gap-1.5 items-center">
                          <input
                            type="text"
                            value={editingOrderText}
                            onChange={(e) => setEditingOrderText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleUpdateCreatorOrder(order.id)}
                            className="flex-1 bg-slate-900 border border-pink-500/50 rounded p-1.5 text-slate-200 text-[10px] outline-none normal-case font-medium"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateCreatorOrder(order.id)}
                            className="p-1.5 px-2.5 bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500 text-emerald-400 rounded text-[9px] tracking-wide font-extrabold cursor-pointer"
                            title="Confirmar cambios"
                          >
                            GUARDAR
                          </button>
                          <button
                            onClick={() => {
                              setEditingOrderId(null);
                              setEditingOrderText("");
                            }}
                            className="p-1.5 px-2.5 bg-slate-900 border border-slate-800 text-slate-400 rounded text-[9px] cursor-pointer"
                          >
                            CANCELAR
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 text-left">
                            <span className="text-[8px] font-black mr-1.5 text-pink-400 select-none">#{index + 1}</span>
                            <span className="text-slate-200 normal-case text-[9px] leading-snug font-sans font-medium">{order.text}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                setEditingOrderId(order.id);
                                setEditingOrderText(order.text);
                              }}
                              className="p-1 bg-slate-900 text-slate-400 hover:text-cyan-400 transition rounded cursor-pointer"
                              title="Editar Regla"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCreatorOrder(order.id)}
                              className="p-1 bg-slate-950 hover:bg-red-950/20 border border-slate-850 hover:border-red-500/40 text-slate-400 hover:text-red-500 transition rounded cursor-pointer"
                              title="Suprimir Regla"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
