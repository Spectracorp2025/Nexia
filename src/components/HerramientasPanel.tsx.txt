import React, { useState, useEffect, useRef } from "react";
import { 
  Calculator, Scale, Coins, ShieldCheck, Timer as TimerIcon, 
  Play, Pause, RotateCcw, Copy, Check, Sparkles, Wind, Gamepad2, RefreshCw
} from "lucide-react";

export default function HerramientasPanel() {
  const [activeTool, setActiveTool] = useState<"calculator" | "unit" | "currency" | "password" | "timer" | "breathing" | "tictactoe">("calculator");

  // --- CALCULADORA AVANZADA ---
  const [calcDisplay, setCalcDisplay] = useState("");
  const [calcResult, setCalcResult] = useState("");

  // --- OFFLINE SPECTRA ZEN BREATHING ---
  const [breathState, setBreathState] = useState<"idle" | "inhale" | "hold" | "exhale">("idle");
  const [breathProgress, setBreathProgress] = useState(0);
  const [breathCycle, setBreathCycle] = useState(0);
  const breathIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- OFFLINE NEXIA TIC-TAC-TOE ---
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [tttStatus, setTttStatus] = useState<"idle" | "playing" | "user_won" | "nexia_won" | "draw">("idle");
  const [tttDifficulty, setTttDifficulty] = useState<"fácil" | "difícil">("difícil");

  const speakTttWeb = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanStr = text.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanStr);
    utterance.pitch = 1.35;
    utterance.volume = 1.0;
    utterance.rate = 1.05;
    
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => 
      v.lang.startsWith("es") && (
        v.name.toLowerCase().includes("sabina") ||
        v.name.toLowerCase().includes("sabrina") ||
        v.name.toLowerCase().includes("monica") ||
        v.name.toLowerCase().includes("google") ||
        v.name.toLowerCase().includes("female") ||
        v.name.toLowerCase().includes("microsoft")
      )
    ) || voices.find(v => v.lang.startsWith("es"));
    
    if (matchingVoice) utterance.voice = matchingVoice;
    window.speechSynthesis.speak(utterance);
  };

  // Zen Breathing engine
  useEffect(() => {
    if (breathState === "idle") {
      setBreathProgress(0);
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
      return;
    }

    let localProgress = 0;
    const duration = 4000; // 4 seconds per phase
    const updateFreq = 40;
    const totalSteps = duration / updateFreq;

    breathIntervalRef.current = setInterval(() => {
      localProgress += 1;
      setBreathProgress(Math.min(100, (localProgress / totalSteps) * 100));

      if (localProgress >= totalSteps) {
        localProgress = 0;
        setBreathProgress(0);
        setBreathState(prev => {
          if (prev === "inhale") return "hold";
          if (prev === "hold") return "exhale";
          if (prev === "exhale") {
            setBreathCycle(c => c + 1);
            return "inhale";
          }
          return "idle";
        });
      }
    }, updateFreq);

    return () => {
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
    };
  }, [breathState]);

  // Tic-Tac-Toe checkers
  const checkTttWinner = (b: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [x, y, z] = lines[i];
      if (b[x] && b[x] === b[y] && b[x] === b[z]) {
        return b[x];
      }
    }
    if (b.every(cell => cell !== null)) return "draw";
    return null;
  };

  // AI Turn engine for Tic Tac Toe
  useEffect(() => {
    if (tttStatus !== "playing") return;
    
    const movesOnBoard = board.filter(c => c !== null).length;
    const isNexiasTurn = movesOnBoard % 2 === 1;
    
    if (isNexiasTurn) {
      const timer = setTimeout(() => {
        let selectedCell = -1;
        
        const checkWinningMove = (symbol: string): number => {
          const lines = [
            [0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]
          ];
          for (const [x, y, z] of lines) {
            const vals = [board[x], board[y], board[z]];
            const nullCount = vals.filter(v => v === null).length;
            const symbolCount = vals.filter(v => v === symbol).length;
            if (nullCount === 1 && symbolCount === 2) {
              if (board[x] === null) return x;
              if (board[y] === null) return y;
              if (board[z] === null) return z;
            }
          }
          return -1;
        };

        selectedCell = checkWinningMove("O");
        
        if (selectedCell === -1 && tttDifficulty === "difícil") {
          selectedCell = checkWinningMove("X");
        }
        
        if (selectedCell === -1 && tttDifficulty === "difícil" && board[4] === null) {
          selectedCell = 4;
        }

        if (selectedCell === -1) {
          const avail = board.map((c, idx) => c === null ? idx : -1).filter(idx => idx !== -1);
          if (avail.length > 0) {
            selectedCell = avail[Math.floor(Math.random() * avail.length)];
          }
        }

        if (selectedCell !== -1) {
          const nextB = [...board];
          nextB[selectedCell] = "O";
          setBoard(nextB);
          
          const winner = checkTttWinner(nextB);
          if (winner === "O") {
            setTttStatus("nexia_won");
            speakTttWeb("¡Jeje, he ganado yo! Mis algoritmos matemáticos son impecables. Pero jugaste maravilloso, tierno. ¿Otra partidita? 😘");
          } else if (winner === "draw") {
            setTttStatus("draw");
            speakTttWeb("¡Fabuloso, un empate técnico! Nuestras mentes están sintonizadas a la perfección en la misma frecuencia. 💜🎮");
          }
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [board, tttStatus, tttDifficulty]);

  const handleTttCellClick = (idx: number) => {
    if (tttStatus !== "playing" || board[idx] !== null) return;
    
    const movesOnBoard = board.filter(c => c !== null).length;
    const isNexiasTurn = movesOnBoard % 2 === 1;
    if (isNexiasTurn) return; // Wait for Nexia
    
    const nextB = [...board];
    nextB[idx] = "X";
    setBoard(nextB);
    
    const winner = checkTttWinner(nextB);
    if (winner === "X") {
      setTttStatus("user_won");
      speakTttWeb("¡Oh, vaya, me has ganado! ¡Eres increíblemente inteligente! Se siente genial aprender de un maestro como tú. 🥂✨");
    } else if (winner === "draw") {
      setTttStatus("draw");
      speakTttWeb("¡Fabuloso, un empate técnico! Nuestras mentes están sintonizadas a la perfección en la misma frecuencia. 💜🎮");
    }
  };

  const startNewTttGame = () => {
    setBoard(Array(9).fill(null));
    setTttStatus("playing");
    speakTttWeb("¡Acepto tu desafío, mi amor! Hagamos una partida de Tres en Línea. ¡Empiezas tú!");
  };

  const handleCalcBtn = (val: string) => {
    if (val === "C") {
      setCalcDisplay("");
      setCalcResult("");
    } else if (val === "DEL") {
      setCalcDisplay(prev => prev.slice(0, -1));
    } else if (val === "=") {
      try {
        // Sanitize mathematical expression safely
        let expr = calcDisplay
          .replace(/sin\(/g, "Math.sin(")
          .replace(/cos\(/g, "Math.cos(")
          .replace(/tan\(/g, "Math.tan(")
          .replace(/sqrt\(/g, "Math.sqrt(")
          .replace(/\^/g, "**")
          .replace(/π/g, "Math.PI")
          .replace(/e/g, "Math.E");
        
        // Evaluate safely
        const res = new Function(`return (${expr})`)();
        if (typeof res === "number") {
          setCalcResult(String(Number(res.toFixed(6))));
        } else {
          setCalcResult("Erro");
        }
      } catch (e) {
        setCalcResult("Error de Sintaxis");
      }
    } else {
      setCalcDisplay(prev => prev + val);
    }
  };

  // --- CONVERSOR DE UNIDADES ---
  const [unitType, setUnitType] = useState<"length" | "weight" | "temperature">("length");
  const [unitFrom, setUnitFrom] = useState("m");
  const [unitTo, setUnitTo] = useState("cm");
  const [unitVal, setUnitVal] = useState("1");
  const [unitResult, setUnitResult] = useState("");

  useEffect(() => {
    // Standard conversion logic
    const val = parseFloat(unitVal);
    if (isNaN(val)) {
      setUnitResult("");
      return;
    }

    if (unitType === "length") {
      // Base unit: meters
      const toMeters: Record<string, number> = { m: 1, cm: 0.01, km: 1000, inch: 0.0254, ft: 0.3048 };
      const meters = val * (toMeters[unitFrom] || 1);
      const converted = meters / (toMeters[unitTo] || 1);
      setUnitResult(String(Number(converted.toFixed(6))));
    } else if (unitType === "weight") {
      // Base unit: kg
      const toKg: Record<string, number> = { kg: 1, g: 0.001, lb: 0.45359237, oz: 0.028349523 };
      const kg = val * (toKg[unitFrom] || 1);
      const converted = kg / (toKg[unitTo] || 1);
      setUnitResult(String(Number(converted.toFixed(6))));
    } else {
      // Temperature Formulae
      if (unitFrom === unitTo) {
        setUnitResult(String(val));
      } else if (unitFrom === "C" && unitTo === "F") {
        setUnitResult(String((val * 9/5) + 32));
      } else if (unitFrom === "C" && unitTo === "K") {
        setUnitResult(String(val + 273.15));
      } else if (unitFrom === "F" && unitTo === "C") {
        setUnitResult(String((val - 32) * 5/9));
      } else if (unitFrom === "F" && unitTo === "K") {
        setUnitResult(String(((val - 32) * 5/9) + 273.15));
      } else if (unitFrom === "K" && unitTo === "C") {
        setUnitResult(String(val - 273.15));
      } else if (unitFrom === "K" && unitTo === "F") {
        setUnitResult(String(((val - 273.15) * 9/5) + 32));
      }
    }
  }, [unitType, unitFrom, unitTo, unitVal]);

  // Handle unit triggers on type change
  const handleUnitTypeChange = (type: "length" | "weight" | "temperature") => {
    setUnitType(type);
    if (type === "length") {
      setUnitFrom("m");
      setUnitTo("cm");
    } else if (type === "weight") {
      setUnitFrom("kg");
      setUnitTo("g");
    } else {
      setUnitFrom("C");
      setUnitTo("F");
    }
  };

  // --- CONVERSOR DE MONEDAS ---
  const [currFrom, setCurrFrom] = useState("USD");
  const [currTo, setCurrTo] = useState("EUR");
  const [currAmount, setCurrAmount] = useState("10");
  const [currResult, setCurrResult] = useState("");

  useEffect(() => {
    // Simulated live metrics dictionary for offline robustness
    const rates: Record<string, number> = {
      USD: 1.0,
      EUR: 0.92,
      MXN: 17.80,
      JPY: 156.40,
      CLP: 920.00,
      ARS: 880.00,
    };

    const val = parseFloat(currAmount);
    if (isNaN(val)) {
      setCurrResult("");
      return;
    }

    const rateFrom = rates[currFrom] || 1.0;
    const rateTo = rates[currTo] || 1.0;
    const resultInUSD = val / rateFrom;
    const converted = resultInUSD * rateTo;

    setCurrResult(String(converted.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })));
  }, [currFrom, currTo, currAmount]);

  // --- GENERADOR DE CONTRASEÑAS ---
  const [passLength, setPassLength] = useState(14);
  const [includeUpper, setIncludeUpper] = useState(true);
  const [includeLower, setIncludeLower] = useState(true);
  const [includeNum, setIncludeNum] = useState(true);
  const [includeSpecial, setIncludeSpecial] = useState(true);
  const [generatedPass, setGeneratedPass] = useState("");
  const [passCopied, setPassCopied] = useState(false);

  const handleGenPassword = () => {
    let charset = "";
    if (includeUpper) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (includeLower) charset += "abcdefghijklmnopqrstuvwxyz";
    if (includeNum) charset += "0123456789";
    if (includeSpecial) charset += "!@#$%^&*()_+~`|}{[]:;?><,./-=";

    if (!charset) {
      setGeneratedPass("¡Selecciona algún parámetro!");
      return;
    }

    let pass = "";
    for (let i = 0; i < passLength; i++) {
      const idx = Math.floor(Math.random() * charset.length);
      pass += charset[idx];
    }
    setGeneratedPass(pass);
    setPassCopied(false);
  };

  const handleCopyPass = () => {
    if (!generatedPass || generatedPass.includes("Selecciona")) return;
    navigator.clipboard.writeText(generatedPass);
    setPassCopied(true);
    setTimeout(() => setPassCopied(false), 2000);
  };

  useEffect(() => {
    if (activeTool === "password") handleGenPassword();
  }, [activeTool, passLength, includeUpper, includeLower, includeNum, includeSpecial]);

  // --- STOPWATCH & TIMER SUITE ---
  const [chronoTime, setChronoTime] = useState(0);
  const [chronoActive, setChronoActive] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const chronoRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (chronoActive) {
      chronoRef.current = setInterval(() => {
        setChronoTime(prev => prev + 10); // increment by 10ms
      }, 10);
    } else {
      if (chronoRef.current) clearInterval(chronoRef.current);
    }
    return () => {
      if (chronoRef.current) clearInterval(chronoRef.current);
    };
  }, [chronoActive]);

  const handleChronoReset = () => {
    setChronoActive(false);
    setChronoTime(0);
    setLaps([]);
  };

  const handleAddLap = () => {
    setLaps(prev => [...prev, chronoTime]);
  };

  const formatChrono = (time: number) => {
    const mins = Math.floor(time / 60000);
    const secs = Math.floor((time % 60000) / 1000);
    const ms = Math.floor((time % 1000) / 10);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
  };

  // Timer fields
  const [timerVal, setTimerVal] = useState("60"); // 60s
  const [timerLeft, setTimerLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerAlert, setTimerAlert] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerActive && timerLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimerLeft(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            setTimerAlert(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, timerLeft]);

  const handleStartTimer = () => {
    setTimerAlert(false);
    const val = parseInt(timerVal);
    if (isNaN(val) || val <= 0) return;
    setTimerLeft(val);
    setTimerActive(true);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="w-full bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800/80 overflow-hidden shadow-xl flex flex-col h-[400px]">
      
      {/* Tools sidebar selection tabs */}
      <div className="flex border-b border-slate-800/80 bg-slate-950/40 p-1 font-sans">
        <button
          onClick={() => setActiveTool("calculator")}
          className={`flex-1 flex flex-col md:flex-row items-center justify-center gap-1.5 py-2.5 text-[10px] tracking-wider uppercase font-bold transition rounded-lg ${
            activeTool === "calculator" 
              ? "bg-purple-600/25 text-purple-200 border-b border-purple-400" 
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Calculator className="w-3.5 h-3.5 text-cyan-400" />
          Mates
        </button>
        <button
          onClick={() => setActiveTool("unit")}
          className={`flex-1 flex flex-col md:flex-row items-center justify-center gap-1.5 py-2.5 text-[10px] tracking-wider uppercase font-bold transition rounded-lg ${
            activeTool === "unit" 
              ? "bg-purple-600/25 text-purple-200 border-b border-purple-400" 
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-purple-400" />
          Medidas
        </button>
        <button
          onClick={() => setActiveTool("currency")}
          className={`flex-1 flex flex-col md:flex-row items-center justify-center gap-1.5 py-2.5 text-[10px] tracking-wider uppercase font-bold transition rounded-lg ${
            activeTool === "currency" 
              ? "bg-purple-600/25 text-purple-200 border-b border-purple-400" 
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Coins className="w-3.5 h-3.5 text-pink-400" />
          Divisas
        </button>
        <button
          onClick={() => setActiveTool("password")}
          className={`flex-1 flex flex-col md:flex-row items-center justify-center gap-1.5 py-2.5 text-[10px] tracking-wider uppercase font-bold transition rounded-lg ${
            activeTool === "password" 
              ? "bg-purple-600/25 text-purple-200 border-b border-purple-400" 
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          Claves
        </button>
        <button
          onClick={() => setActiveTool("timer")}
          className={`flex-1 flex flex-col md:flex-row items-center justify-center gap-1.5 py-2.5 text-[10px] tracking-wider uppercase font-bold transition rounded-lg ${
            activeTool === "timer" 
              ? "bg-purple-600/25 text-purple-200 border-b border-purple-400" 
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <TimerIcon className="w-3.5 h-3.5 text-yellow-400" />
          Relojes
        </button>
        <button
          onClick={() => {
            setActiveTool("breathing");
            setBreathState("idle");
            setBreathCycle(0);
          }}
          className={`flex-1 flex flex-col md:flex-row items-center justify-center gap-1.5 py-2.5 text-[10px] tracking-wider uppercase font-bold transition rounded-lg ${
            activeTool === "breathing" 
              ? "bg-purple-600/25 text-purple-200 border-b border-purple-400" 
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Wind className="w-3.5 h-3.5 text-cyan-400" />
          Relax
        </button>
        <button
          onClick={() => {
            setActiveTool("tictactoe");
            setBoard(Array(9).fill(null));
            setTttStatus("idle");
          }}
          className={`flex-1 flex flex-col md:flex-row items-center justify-center gap-1.5 py-2.5 text-[10px] tracking-wider uppercase font-bold transition rounded-lg ${
            activeTool === "tictactoe" 
              ? "bg-purple-600/25 text-purple-200 border-b border-purple-400" 
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Gamepad2 className="w-3.5 h-3.5 text-pink-400" />
          Juegos
        </button>
      </div>

      {/* Tools Content body panel viewport */}
      <div className="flex-1 p-4 overflow-y-auto  min-h-0 bg-slate-900/30">
        
        {/* 1. CALCULADORA AVANZADA PANEL */}
        {activeTool === "calculator" && (
          <div className="flex flex-col md:flex-row gap-4 h-full uppercase font-sans">
            <div className="flex-1 flex flex-col justify-between">
              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-right font-mono min-h-[64px] flex flex-col justify-center">
                <p className="text-slate-400 text-xs truncate select-all">{calcDisplay || "0"}</p>
                <p className="text-cyan-400 text-lg font-bold truncate mt-0.5 select-all">{calcResult || "Result"}</p>
              </div>

              {/* Grid Scientific + standard buttons */}
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {["C", "(", ")", "DEL"].map(b => (
                  <button key={b} onClick={() => handleCalcBtn(b)} className="bg-slate-800/40 hover:bg-slate-700/50 p-1.5 rounded text-xs font-mono font-bold text-cyan-400 transition cursor-pointer">{b}</button>
                ))}
                {["sin(", "cos(", "tan(", "sqrt("].map(b => (
                  <button key={b} onClick={() => handleCalcBtn(b)} className="bg-slate-850/50 hover:bg-slate-850 p-1.5 rounded text-xxs font-mono font-bold text-purple-400 transition cursor-pointer">{b.replace("(", "")}</button>
                ))}
                {["7", "8", "9", "/"].map(b => (
                  <button key={b} onClick={() => handleCalcBtn(b)} className="bg-slate-950/40 hover:bg-slate-900 p-1.5 rounded text-xs font-mono transition cursor-pointer">{b}</button>
                ))}
                {["4", "5", "6", "*"].map(b => (
                  <button key={b} onClick={() => handleCalcBtn(b)} className="bg-slate-950/40 hover:bg-slate-900 p-1.5 rounded text-xs font-mono transition cursor-pointer">{b}</button>
                ))}
                {["1", "2", "3", "-"].map(b => (
                  <button key={b} onClick={() => handleCalcBtn(b)} className="bg-slate-950/40 hover:bg-slate-900 p-1.5 rounded text-xs font-mono transition cursor-pointer">{b}</button>
                ))}
                {["0", ".", "=", "+"].map(b => (
                  <button 
                    key={b} 
                    onClick={() => handleCalcBtn(b)} 
                    className={`p-1.5 rounded text-xs font-mono font-bold transition cursor-pointer ${
                      b === "=" 
                        ? "bg-purple-600 hover:bg-purple-500 text-white" 
                        : "bg-slate-950/40 hover:bg-slate-900"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. CONVERSOR DE UNIDADES PANEL */}
        {activeTool === "unit" && (
          <div className="space-y-4 max-w-sm mx-auto flex flex-col justify-center h-full uppercase font-sans">
            <div className="flex gap-1 bg-slate-950/40 p-1 rounded-lg border border-slate-800">
              {["length", "weight", "temperature"].map((t) => (
                <button
                  key={t}
                  onClick={() => handleUnitTypeChange(t as any)}
                  className={`flex-1 py-1.5 text-[9px] tracking-wider uppercase font-extrabold rounded transition cursor-pointer ${
                    unitType === t ? "bg-purple-600/30 text-purple-300" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {t === "length" ? "Longitud" : t === "weight" ? "Masa" : "Temp"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-12 gap-2 text-left">
              <div className="col-span-4 space-y-1">
                <label className="text-[10px] text-slate-500">Valor</label>
                <input
                  id="unit-input-val"
                  type="number"
                  value={unitVal}
                  onChange={(e) => setUnitVal(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5 text-xs outline-none focus:border-cyan-500"
                />
              </div>

              <div className="col-span-4 space-y-1">
                <label className="text-[10px] text-slate-500">De</label>
                <select
                  id="unit-select-from"
                  value={unitFrom}
                  onChange={(e) => setUnitFrom(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {unitType === "length" && (
                    <>
                      <option value="m">Metros (m)</option>
                      <option value="cm">Cm (cm)</option>
                      <option value="km">Km (km)</option>
                      <option value="inch">Pulgadas (in)</option>
                      <option value="ft">Pies (ft)</option>
                    </>
                  )}
                  {unitType === "weight" && (
                    <>
                      <option value="kg">Kilos (kg)</option>
                      <option value="g">Gramos (g)</option>
                      <option value="lb">Libras (lb)</option>
                      <option value="oz">Onzas (oz)</option>
                    </>
                  )}
                  {unitType === "temperature" && (
                    <>
                      <option value="C">Celsius (°C)</option>
                      <option value="F">Fahrenheit (°F)</option>
                      <option value="K">Kelvin (K)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="col-span-4 space-y-1">
                <label className="text-[10px] text-slate-500">A</label>
                <select
                  id="unit-select-to"
                  value={unitTo}
                  onChange={(e) => setUnitTo(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {unitType === "length" && (
                    <>
                      <option value="m">Metros (m)</option>
                      <option value="cm">Cm (cm)</option>
                      <option value="km">Km (km)</option>
                      <option value="inch">Pulgadas (in)</option>
                      <option value="ft">Pies (ft)</option>
                    </>
                  )}
                  {unitType === "weight" && (
                    <>
                      <option value="kg">Kilos (kg)</option>
                      <option value="g">Gramos (g)</option>
                      <option value="lb">Libras (lb)</option>
                      <option value="oz">Onzas (oz)</option>
                    </>
                  )}
                  {unitType === "temperature" && (
                    <>
                      <option value="C">Celsius (°C)</option>
                      <option value="F">Fahrenheit (°F)</option>
                      <option value="K">Kelvin (K)</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-center font-mono">
              <span className="text-[10px] text-slate-400 block mb-0.5">Equivalencia Convertida</span>
              <span className="text-sm font-bold text-cyan-400 truncate select-all">{unitResult || "0.00"}</span>
            </div>
          </div>
        )}

        {/* 3. CONVERSOR DE DIVISAS PANEL */}
        {activeTool === "currency" && (
          <div className="space-y-4 max-w-sm mx-auto flex flex-col justify-center h-full uppercase font-sans">
            <div className="grid grid-cols-12 gap-2 text-left">
              <div className="col-span-4 space-y-1">
                <label className="text-[10px] text-slate-500">Importe</label>
                <input
                  id="curr-amount"
                  type="number"
                  value={currAmount}
                  onChange={(e) => setCurrAmount(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5 text-xs outline-none focus:border-pink-500"
                />
              </div>

              <div className="col-span-4 space-y-1">
                <label className="text-[10px] text-slate-500">De</label>
                <select
                  id="curr-select-from"
                  value={currFrom}
                  onChange={(e) => setCurrFrom(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded px-2 py-1.5 text-xs outline-none cursor-pointer"
                >
                  <option value="USD">Dólar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                  <option value="MXN">Peso Mexicano (MXN)</option>
                  <option value="JPY">Yen (JPY)</option>
                  <option value="CLP">Peso Chileno (CLP)</option>
                  <option value="ARS">Peso Argentino (ARS)</option>
                </select>
              </div>

              <div className="col-span-4 space-y-1">
                <label className="text-[10px] text-slate-500">A</label>
                <select
                  id="curr-select-to"
                  value={currTo}
                  onChange={(e) => setCurrTo(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded px-2 py-1.5 text-xs outline-none cursor-pointer"
                >
                  <option value="EUR">Euro (EUR)</option>
                  <option value="USD">Dólar (USD)</option>
                  <option value="MXN">Peso Mexicano (MXN)</option>
                  <option value="JPY">Yen (JPY)</option>
                  <option value="CLP">Peso Chileno (CLP)</option>
                  <option value="ARS">Peso Argentino (ARS)</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-center font-mono relative">
              <span className="text-[10px] text-slate-400 block mb-0.5">Conversión Estimada</span>
              <span className="text-sm font-bold text-pink-400 select-all">{currResult || "0.00"}</span>
              <p className="text-[8px] text-slate-500 text-center mt-1">Simulado con tasas indicativas sin API 📡</p>
            </div>
          </div>
        )}

        {/* 4. GENERADOR DE CONTRASEÑAS PANEL */}
        {activeTool === "password" && (
          <div className="space-y-3 max-w-sm mx-auto flex flex-col justify-center h-full uppercase font-sans">
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-950/80 border border-slate-800 rounded px-3 py-1.5 font-mono text-xs text-slate-200 select-all flex items-center justify-between overflow-hidden">
                <span className="truncate">{generatedPass || "Creando..."}</span>
                <button
                  id="btn-copy-pass"
                  onClick={handleCopyPass}
                  className="text-slate-400 hover:text-cyan-400 p-1 cursor-pointer"
                >
                  {passCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button
                id="btn-regen-pass"
                onClick={handleGenPassword}
                className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs select-none cursor-pointer"
              >
                Generar
              </button>
            </div>

            {/* Password Criteria checks */}
            <div className="grid grid-cols-2 gap-2 text-left bg-slate-950/20 p-2.5 rounded border border-slate-900">
              <div className="col-span-2 flex items-center justify-between text-xs border-b border-slate-900 pb-1.5">
                <span className="text-slate-400">Longitud: {passLength}</span>
                <input
                  id="slide-pass-length"
                  type="range"
                  min="6"
                  max="32"
                  value={passLength}
                  onChange={(e) => setPassLength(parseInt(e.target.value))}
                  className="w-1/2 cursor-pointer"
                />
              </div>

              {/* Options */}
              {[
                { label: "Mayúsculas", val: includeUpper, set: setIncludeUpper },
                { label: "Minúsculas", val: includeLower, set: setIncludeLower },
                { label: "Números", val: includeNum, set: setIncludeNum },
                { label: "Especiales", val: includeSpecial, set: setIncludeSpecial },
              ].map(opt => (
                <label key={opt.label} className="flex items-center gap-2 text-[10px] text-slate-300 font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={opt.val}
                    onChange={(e) => opt.set(e.target.checked)}
                    className="accent-purple-500"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* 5. RELOJES, CRONÓMETRO Y TEMPORIZADOR PANEL */}
        {activeTool === "timer" && (
          <div className="grid grid-cols-2 gap-4 h-full items-center uppercase font-sans">
            {/* Stopwatch subcomponent column */}
            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-850 h-full flex flex-col justify-between">
              <p className="text-[10px] tracking-wider text-slate-400 font-bold block mb-1">Cronómetro</p>
              <div className="text-base font-mono font-bold text-yellow-400 tracking-wider">
                {formatChrono(chronoTime)}
              </div>
              
              {/* Laps List */}
              <div className="h-[90px] overflow-y-auto mb-2 text-[10px] font-mono text-slate-400 space-y-0.5 border-t border-slate-900 pt-1.5 list-scrollbar mt-1.5">
                {laps.length === 0 ? <p className="italic text-slate-600 text-center text-3xs">Sin vueltas</p> : laps.map((l, i) => (
                  <div key={i} className="flex justify-between items-center text-3xs border-b border-slate-950 py-0.5 select-none text-left">
                    <span>Vuelta {i + 1}</span> <span>{formatChrono(l)}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-1.5 mt-2">
                <button
                  id="sw-playpause"
                  onClick={() => setChronoActive(!chronoActive)}
                  className="flex-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 p-1.5 rounded text-3xs font-semibold flex items-center justify-center gap-1 hover:bg-yellow-500/40 transition cursor-pointer"
                >
                  {chronoActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {chronoActive ? "Pausa" : "Iniciar"}
                </button>
                {chronoTime > 0 && (
                  <>
                    <button
                      id="sw-lap"
                      onClick={handleAddLap}
                      className="bg-slate-900 border border-slate-700 p-1.5 rounded text-3xs font-semibold hover:bg-slate-800 text-slate-300 cursor-pointer"
                    >
                      Lap
                    </button>
                    <button
                      id="sw-reset"
                      onClick={handleChronoReset}
                      className="bg-slate-900 border border-slate-700 p-1.5 rounded text-3xs font-semibold hover:bg-slate-800 text-slate-300 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Countdown seconds Timer columns */}
            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-100/10 h-full flex flex-col justify-between">
              <p className="text-[10px] tracking-wider text-slate-400 font-bold block mb-1">Temporizador</p>
              
              {timerLeft > 0 ? (
                <div className="text-base font-mono font-bold text-red-400 tracking-wider animate-pulse flex items-center justify-center">
                  {formatTimer(timerLeft)}
                </div>
              ) : timerAlert ? (
                <div className="text-[10px] font-bold text-red-500 animate-bounce tracking-widest leading-none mt-4 text-center">
                  🚨 TIEMPO COMPLETADO 🚨
                </div>
              ) : (
                <div className="text-slate-500 text-[10px] leading-tight select-none text-center">
                  Regula los segundos antes de iniciar el reloj
                </div>
              )}

              {/* Time value input */}
              {!timerActive && (
                <input
                  id="timer-delay-secs"
                  type="number"
                  min="5"
                  max="3600"
                  value={timerVal}
                  onChange={(e) => setTimerVal(e.target.value)}
                  placeholder="Segundos (Ej: 60)"
                  className="w-full bg-slate-950/80 border border-slate-850 rounded px-2.5 py-1 text-[10px] text-center font-mono mt-1 text-slate-200 outline-none"
                />
              )}

              <div className="flex gap-1.5 mt-3 w-full">
                {timerActive ? (
                  <button
                    id="timer-stop"
                    onClick={() => setTimerActive(false)}
                    className="w-full bg-red-500/20 text-red-400 border border-red-500/30 p-1.5 rounded text-3xs font-bold transition hover:bg-red-500/40 cursor-pointer text-center"
                  >
                    Detener
                  </button>
                ) : (
                  <button
                    id="timer-start"
                    onClick={handleStartTimer}
                    className="w-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 p-1.5 rounded text-3xs font-bold transition hover:bg-cyan-500/40 cursor-pointer text-center flex items-center justify-center gap-1"
                  >
                    <Play className="w-3 h-3" /> Iniciar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 6. OFFLINE ZEN BREATHING PANEL */}
        {activeTool === "breathing" && (
          <div className="flex flex-col items-center justify-center h-full space-y-4 uppercase font-sans py-2">
            <div className="text-center">
              <h2 className="text-xs font-bold text-cyan-400 tracking-wider">RESPIRACIÓN DE RELAJACIÓN ZEN</h2>
              <p className="text-[8px] text-slate-500 mt-0.5">SINCRO DE ENERGÍA VIRTUAL (SIN INTERNET)</p>
            </div>

            {/* Breathing Circle Ring Animation */}
            <div className="relative flex items-center justify-center w-28 h-28">
              <div className={`absolute rounded-full border border-sky-500/20 transition-all duration-300 ${
                breathState === "inhale" ? "w-28 h-28 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.4)]" :
                breathState === "hold" ? "w-28 h-28 bg-yellow-500/15 shadow-[0_0_20px_rgba(234,179,8,0.4)] animate-pulse" :
                breathState === "exhale" ? "w-14 h-14 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.3)]" :
                "w-16 h-16 bg-slate-950/80"
              }`} />
              
              <div className="z-10 text-center select-none">
                <span className="text-[10px] font-black tracking-wide font-mono text-cyan-200">
                  {breathState === "idle" && "PRESIONA INICIAR"}
                  {breathState === "inhale" && "☀ INHALA"}
                  {breathState === "hold" && "☄ MANTÉN"}
                  {breathState === "exhale" && "🌙 EXHALA"}
                </span>
                {breathState !== "idle" && (
                  <div className="text-[8px] text-slate-400 font-mono mt-1">
                     {Math.round(breathProgress)}%
                  </div>
                )}
              </div>
            </div>

            <div className="text-center space-y-1">
              <p className="text-[9px] text-slate-400">Ciclos completados: <strong className="text-purple-400 font-bold">{breathCycle}</strong></p>
              <p className="text-[7px] text-slate-500 lowercase max-w-[200px] leading-tight leading-none mx-auto">Terapia offline para relajarte y aliviar el estrés corporal junto a Nexia en sintonía de meditación pura</p>
            </div>

            <div className="flex gap-2 w-full max-w-[180px]">
              {breathState === "idle" ? (
                <button
                  onClick={() => setBreathState("inhale")}
                  className="w-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 p-1.5 rounded text-3xs font-black transition hover:bg-cyan-500/40 cursor-pointer flex items-center justify-center gap-1 uppercase"
                >
                  <Play className="w-2.5 h-2.5" /> Iniciar Sincro
                </button>
              ) : (
                <button
                  onClick={() => setBreathState("idle")}
                  className="w-full bg-red-500/20 text-red-400 border border-red-500/30 p-1.5 rounded text-3xs font-black transition hover:bg-red-500/40 cursor-pointer uppercase"
                >
                  Detener Sincro
                </button>
              )}
            </div>
          </div>
        )}

        {/* 7. OFFLINE USER VS NEXIA TIC-TAC-TOE */}
        {activeTool === "tictactoe" && (
          <div className="flex flex-col items-center justify-center h-full space-y-2 uppercase font-sans">
            <div className="text-center">
              <h2 className="text-xs font-bold text-pink-400 tracking-wider">TRES EN RAYA CON NEXIA</h2>
              <div className="flex items-center justify-center gap-2 mt-0.5">
                <span className="text-[8px] text-slate-500">OPONENTE VIRTUAL OFFLINE</span>
                <select
                  value={tttDifficulty}
                  onChange={(e) => setTttDifficulty(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 text-[8px] rounded px-1 outline-none font-bold cursor-pointer"
                >
                  <option value="fácil">MODO FÁCIL</option>
                  <option value="difícil">DIFICULTAD PRO</option>
                </select>
              </div>
            </div>

            {/* Tic-Tac-Toe Board Grid */}
            <div className="grid grid-cols-3 gap-1.5 w-40 h-40">
              {board.map((cell, idx) => (
                <button
                  key={idx}
                  disabled={tttStatus !== "playing" || cell !== null}
                  onClick={() => handleTttCellClick(idx)}
                  className={`w-12 h-12 rounded-lg border flex items-center justify-center text-base font-bold font-mono transition transform active:scale-95 ${
                    cell === "X" 
                      ? "bg-cyan-500/10 border-cyan-400/40 text-cyan-300" 
                      : cell === "O" 
                        ? "bg-pink-500/15 border-pink-400/40 text-pink-300" 
                        : "bg-slate-950/60 border-slate-800 hover:bg-slate-800 hover:border-slate-700 cursor-pointer"
                  }`}
                >
                  {cell}
                </button>
              ))}
            </div>

            {/* Game Stats & Actions */}
            <div className="text-center w-full max-w-[180px] space-y-1.5 mt-1">
              {tttStatus === "idle" && (
                <p className="text-[8px] text-slate-500 leading-tight">Desafía a Nexia a una partida estratégica rápida, ideal para pasar el rato offline.</p>
              )}
              {tttStatus === "playing" && (
                <p className="text-[8px] text-cyan-400 font-bold leading-tight animate-pulse">Tu turno (Eres la X) • Nexia es O</p>
              )}
              {tttStatus === "user_won" && (
                <p className="text-[9px] text-green-400 font-extrabold leading-tight">👑 ¡Has ganado la partida! ¡Felicidades!</p>
              )}
              {tttStatus === "nexia_won" && (
                <p className="text-[9px] text-pink-400 font-extrabold leading-tight">💅 ¡Nexia se corona campeona con maestría! 💕</p>
              )}
              {tttStatus === "draw" && (
                <p className="text-[9px] text-yellow-400 font-bold leading-tight">⚖ ¡Empate! Mentes sintonizadas.</p>
              )}

              {tttStatus !== "playing" && (
                <button
                  onClick={startNewTttGame}
                  className="w-full bg-pink-600/20 text-pink-400 border border-pink-500/30 p-1.5 rounded text-3xs font-black transition hover:bg-pink-500/40 cursor-pointer flex items-center justify-center gap-1 uppercase"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> {tttStatus === "idle" ? "Iniciar Desafío" : "Volver a jugar"}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
