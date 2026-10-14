"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSocketClient } from "@/src/lib/socketClient";
import { soundFx } from "@/src/lib/soundFx";
import {
  ShieldAlert,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Eye,
  Percent,
  FastForward,
  LogOut,
  Maximize2,
  Clock,
  Coins,
  Shield,
  XCircle,
  Radio,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  GameState,
  TeamPublic,
  TeamPrivateState,
  LifelineType,
  LeaderboardEntry,
} from "@/src/types";

export default function TeamTerminalPage() {
  const router = useRouter();
  const [team, setTeam] = useState<TeamPublic | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [privateState, setPrivateState] = useState<TeamPrivateState | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [lockingIn, setLockingIn] = useState(false);
  const [connected, setConnected] = useState<boolean>(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Strict Kiosk & Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hasEnteredTerminal, setHasEnteredTerminal] = useState<boolean>(false);
  const [lockdownActive, setLockdownActive] = useState<boolean>(false);
  const [lockdownReason, setLockdownReason] = useState<string>("");
  const [strikes, setStrikes] = useState<number>(0);
  const [isDisqualified, setIsDisqualified] = useState<boolean>(false);

  // Modals
  const [confirmModal, setConfirmModal] = useState<{
    type: "answer" | "lifeline";
    data?: any;
  } | null>(null);

  const socketRef = useRef<any>(null);
  const lastIncidentTimeRef = useRef<number>(0);

  // 1. Initial Authentication Check
  useEffect(() => {
    fetch("/api/auth/team/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        if (!data.authenticated || !data.team) {
          router.replace("/join");
        } else {
          setTeam(data.team);
          setStrikes(data.team.strikesCount || 0);
          setIsDisqualified(data.team.isDisqualified || false);
          initSocket(data.team.id);
        }
      })
      .catch(() => {
        router.replace("/join");
      });
  }, [router]);

  // 2. Initialize Socket.IO connection
  const initSocket = (teamId: string) => {
    const token =
      sessionStorage.getItem("bigbull_team_token") ||
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("bigbull_team_token="))
        ?.split("=")[1];

    const socket = getSocketClient(token, "team");
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("game:state", (state: GameState) => {
      setGameState(state);
      if (state.status === "QUESTION_ACTIVE" && state.currentQuestion?.deadline) {
        const ms = new Date(state.currentQuestion.deadline).getTime();
        setRemainingSeconds(Math.max(0, Math.ceil((ms - Date.now()) / 1000)));
        setIsPaused(false);
      } else if (state.status === "QUESTION_PAUSED" && state.currentQuestion?.remainingOnPause) {
        setRemainingSeconds(Math.ceil(state.currentQuestion.remainingOnPause / 1000));
        setIsPaused(true);
      }
    });

    socket.on("timer:sync", (data: { remainingSeconds: number; isPaused: boolean }) => {
      setRemainingSeconds(data.remainingSeconds);
      setIsPaused(data.isPaused);
    });

    socket.on("team:private_state", (pState: TeamPrivateState) => {
      setPrivateState(pState);
      setTeam(pState.team);
      const sCount = pState.team.strikesCount || 0;
      setStrikes(sCount);
      const disq = !!pState.team.isDisqualified;
      setIsDisqualified(disq);
      if (!disq && sCount < 3) {
        setLockdownActive(false);
      }
      if (pState.currentAnswer) {
        setSelectedOption(pState.currentAnswer.selectedOption);
      }
    });

    socket.on("team:strike_update", (data: { strikesCount: number; isDisqualified: boolean; reason: string }) => {
      setStrikes(data.strikesCount);
      setIsDisqualified(data.isDisqualified);
      if (!data.isDisqualified && data.strikesCount < 3) {
        setLockdownActive(false);
      } else {
        soundFx.playStrikeAlarm();
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    });

    socket.on("team:disqualified", () => {
      setIsDisqualified(true);
      setLockdownActive(false);
      soundFx.playStrikeAlarm();
    });

    socket.on("leaderboard:updated", (lb: LeaderboardEntry[]) => {
      setLeaderboard(lb);
    });
  };

  // 3. Trigger Security Strike Incident (Debounced to avoid rapid multi-firing)
  const triggerSecurityStrike = useCallback(
    (reason: string) => {
      if (isDisqualified) return;
      const now = Date.now();
      // Debounce at least 2 seconds
      if (now - lastIncidentTimeRef.current < 2000) return;
      lastIncidentTimeRef.current = now;

      setLockdownActive(true);
      setLockdownReason(reason);
      soundFx.playStrikeAlarm();
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("team:record_strike", { reason }, (res: any) => {
          if (res) {
            setStrikes(res.strikesCount);
            if (res.isDisqualified) {
              setIsDisqualified(true);
            }
          }
        });
      } else {
        fetch("/api/team/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "record_strike", reason }),
        })
          .then((res) => res.json())
          .then((res) => {
            if (res && res.strikesCount !== undefined) {
              setStrikes(res.strikesCount);
              if (res.isDisqualified) setIsDisqualified(true);
            }
          })
          .catch(() => {});
      }
    },
    [isDisqualified]
  );

  // 4. Strict Fullscreen & Kiosk Listeners
  useEffect(() => {
    if (!hasEnteredTerminal) return;

    const handleFullscreenChange = () => {
      const isNowFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement
      );

      setIsFullscreen(isNowFullscreen);

      if (!isNowFullscreen && !isDisqualified) {
        triggerSecurityStrike("Exited Fullscreen Kiosk Mode");
      } else if (isNowFullscreen && !isDisqualified && strikes < 3) {
        // Returned to fullscreen safely
        setLockdownActive(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !isDisqualified) {
        triggerSecurityStrike("Minimized Window / Tab Switched");
      }
    };

    const handleBlur = () => {
      if (isDisqualified) return;
      if (document.hidden) {
        triggerSecurityStrike("Minimized Window / Tab Switched");
        return;
      }
      setTimeout(() => {
        if (!document.hasFocus() && !isDisqualified) {
          triggerSecurityStrike("Window Focus Lost / Desktop Minimized");
        }
      }, 400);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12 (DevTools)
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools)
      if (e.ctrlKey && e.shiftKey && ["I", "J", "C", "i", "j", "c"].includes(e.key)) {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+U / Cmd+U (View Source)
      if ((e.ctrlKey || e.metaKey) && ["u", "U"].includes(e.key)) {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+R / F5 (Page Refresh)
      if (e.key === "F5" || ((e.ctrlKey || e.metaKey) && ["r", "R"].includes(e.key))) {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+C / Ctrl+V / Ctrl+X
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "C", "V", "X"].includes(e.key)) {
        e.preventDefault();
        return false;
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Exam in progress. Leaving will count as a security violation.";
      return e.returnValue;
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasEnteredTerminal, triggerSecurityStrike, isDisqualified, strikes]);

  // Request Fullscreen Lock
  const enterFullscreen = async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if ((el as any).webkitRequestFullscreen) {
        await (el as any).webkitRequestFullscreen();
      }

      // Modern Chromium Keyboard Lock API (locks Escape key to prevent accidental exit)
      if ("keyboard" in navigator && (navigator as any).keyboard?.lock) {
        try {
          await (navigator as any).keyboard.lock(["Escape"]);
        } catch (e) {
          // Ignored if unsupported
        }
      }

      setIsFullscreen(true);
      setHasEnteredTerminal(true);
      setLockdownActive(false);
    } catch (err) {
      console.warn("Fullscreen request bypassed:", err);
      // Graceful mobile/iOS fallback: enter kiosk view anyway
      setIsFullscreen(true);
      setHasEnteredTerminal(true);
      setLockdownActive(false);
    }
  };

  const handleLogout = async () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    await fetch("/api/auth/team/logout", { method: "POST" });
    sessionStorage.removeItem("bigbull_team_token");
    router.replace("/join");
  };

  // Submit Answer (Dual: Socket + HTTP Fallback for Vercel)
  const submitAnswer = async (option: string) => {
    if (isDisqualified) return;
    setLockingIn(true);
    soundFx.playLockSound();

    let handled = false;
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(
        "team:submit_answer",
        { selectedOption: option },
        (res: { success: boolean; error?: string }) => {
          setLockingIn(false);
          setConfirmModal(null);
          if (!res.success) {
            alert(res.error || "Submission failed");
          }
        }
      );
      handled = true;
    }

    try {
      const res = await fetch("/api/team/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_answer", selectedOption: option }),
      });
      const data = await res.json();
      setLockingIn(false);
      setConfirmModal(null);
      if (!res.ok && !handled) {
        alert(data.error || "Submission failed");
      } else if (data.success) {
        setSelectedOption(option);
      }
    } catch (e) {
      if (!handled) setLockingIn(false);
    }
  };

  // Purchase Lifeline (Dual: Socket + HTTP Fallback)
  const buyLifeline = async (type: LifelineType) => {
    if (isDisqualified) return;
    soundFx.playCoinDing();

    let handled = false;
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(
        "team:buy_lifeline",
        { lifelineType: type },
        (res: { success: boolean; error?: string }) => {
          setConfirmModal(null);
          if (!res.success) {
            alert(res.error || "Purchase failed");
          }
        }
      );
      handled = true;
    }

    try {
      const res = await fetch("/api/team/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "buy_lifeline", lifelineType: type }),
      });
      const data = await res.json();
      setConfirmModal(null);
      if (!res.ok && !handled) {
        alert(data.error || "Purchase failed");
      }
    } catch (e) {}
  };

  // HTTP Polling Fallback for Team Terminal
  useEffect(() => {
    if (!hasEnteredTerminal) return;
    const pollInterval = setInterval(async () => {
      if (!socketRef.current || !socketRef.current.connected) {
        try {
          const res = await fetch("/api/game/state");
          const data = await res.json();
          if (data.success && data.game) {
            setGameState(data.game);
            if (data.leaderboard) setLeaderboard(data.leaderboard);
            if (data.game.status === "QUESTION_ACTIVE" && data.game.currentQuestion?.deadline) {
              const ms = new Date(data.game.currentQuestion.deadline).getTime();
              setRemainingSeconds(Math.max(0, Math.ceil((ms - Date.now()) / 1000)));
              setIsPaused(false);
            } else if (data.game.status === "QUESTION_PAUSED" && data.game.currentQuestion?.remainingOnPause) {
              setRemainingSeconds(Math.ceil(data.game.currentQuestion.remainingOnPause / 1000));
              setIsPaused(true);
            }
          }
        } catch (e) {}
      }
    }, 1500);
    return () => clearInterval(pollInterval);
  }, [hasEnteredTerminal]);

  const currentQ = gameState?.currentQuestion;
  const gameStatus = gameState?.status || "LOBBY";
  const lockedAnswer = privateState?.currentAnswer;
  const lifelines = privateState?.lifelines;
  const hasPassed = privateState?.hasPassed;

  const eliminatedOptions = lifelines?.["50_50_BLAST"]?.details?.eliminatedOptions || [];
  const hintText = lifelines?.["BULLS_HINT"]?.details?.hintText;
  const visualClueUrl = lifelines?.["VISION_BOOST"]?.details?.visualClueUrl;

  // Format Timer MM:SS
  const mins = Math.floor(Math.max(0, remainingSeconds) / 60);
  const secs = Math.max(0, remainingSeconds) % 60;
  const timerDisplay = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  // ==========================================
  // VIEW 1: GATEWAY (MANDATORY FULLSCREEN LOCK)
  // ==========================================
  if (!hasEnteredTerminal) {
    return (
      <div
        className="min-h-screen bg-[#040407] text-white flex flex-col justify-between p-6 select-none font-sans"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between border-b border-[#1c1c28] pb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded-sm" />
            <span className="font-mono text-xs uppercase tracking-widest text-amber-400 font-bold">
              THE BIG BULL // ARENA PROTOCOL
            </span>
          </div>
          <span className="font-mono text-[11px] text-neutral-400">
            TERMINAL: {team?.teamCode}
          </span>
        </div>

        <main className="max-w-lg mx-auto w-full text-center space-y-6 my-auto">
          <div className="w-16 h-16 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase font-mono">
              ARENA KIOSK LOCKDOWN
            </h1>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
              Active competition requires mandatory full-screen lockdown. Copying, right-clicking, and background tabs are strictly disabled.
            </p>
          </div>

          {/* 3-Strike Warning Notice */}
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 text-left space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-red-400 uppercase tracking-wider font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>STRICT 3-STRIKE DISQUALIFICATION RULE</span>
            </div>
            <ul className="list-disc list-inside text-neutral-300 text-[11px] space-y-1 leading-normal">
              <li>Minimizing the app or exiting full screen triggers a Strike.</li>
              <li>Switching tabs or losing browser focus triggers a Strike.</li>
              <li>
                <strong className="text-red-400">3rd Strike = AUTOMATIC DISQUALIFICATION.</strong> Your exam terminal will be permanently locked.
              </li>
            </ul>
          </div>

          <button
            onClick={enterFullscreen}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-black font-mono font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/20 hover:brightness-110 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
            <span>INITIALIZE SECURE FULLSCREEN & ENTER</span>
          </button>
        </main>

        <footer className="text-center font-mono text-[10px] text-neutral-400">
          SECURE COMPETITION SYSTEM // HOST AUTHORIZED
        </footer>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: ACTIVE COMBAT TRADING TERMINAL
  // ==========================================
  return (
    <div
      className="min-h-screen bg-[#040407] text-white flex flex-col justify-between select-none relative overflow-x-hidden font-sans"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
    >
      {/* ========================================================= */}
      {/* LOCKDOWN OVERLAY (TRIGGERED WHEN FULLSCREEN EXITED / MINIMIZED) */}
      {/* ========================================================= */}
      {lockdownActive && !isDisqualified && (
        <div className="fixed inset-0 z-50 bg-[#060609]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="max-w-md w-full p-8 rounded-2xl bg-red-950/30 border-2 border-red-500 shadow-2xl shadow-red-500/20 space-y-5">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500 text-red-400 flex items-center justify-center mx-auto animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <div className="font-mono text-xs uppercase tracking-widest text-red-400 font-bold">
                SECURITY VIOLATION DETECTED
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase font-mono">
                TERMINAL SUSPENDED
              </h2>
              <p className="text-xs text-neutral-300 font-mono mt-1">
                {lockdownReason || "Window Minimized or Fullscreen Exited"}
              </p>
            </div>

            {/* Strike Gauge */}
            <div className="p-4 rounded-xl bg-black/60 border border-red-500/40 text-center">
              <div className="text-[11px] font-mono uppercase text-neutral-400 font-bold mb-2">
                STRIKE PENALTY GAUGE
              </div>
              <div className="flex items-center justify-center gap-3">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-black text-sm border-2 transition-all ${
                      strikes >= s
                        ? "bg-red-600 border-red-400 text-white shadow-lg shadow-red-600/50"
                        : "bg-[#111116] border-[#222230] text-neutral-600"
                    }`}
                  >
                    #{s}
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs font-mono font-bold text-red-400">
                {strikes === 1 && "STRIKE 1 OF 3 ISSUED: 2 REMAINING"}
                {strikes === 2 && "STRIKE 2 OF 3: FINAL WARNING BEFORE DISQUALIFICATION"}
                {strikes >= 3 && "STRIKE 3 OF 3: MAXIMUM VIOLATION REACHED"}
              </div>
            </div>

            <button
              onClick={enterFullscreen}
              className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
              <span>RE-ENTER FULLSCREEN LOCKDOWN</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PERMANENT DISQUALIFICATION SCREEN (3 STRIKES EXCEEDED) */}
      {/* ========================================================= */}
      {isDisqualified && (
        <div className="fixed inset-0 z-50 bg-[#060609] flex flex-col items-center justify-center p-6 text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-red-600/20 border-2 border-red-500 text-red-500 flex items-center justify-center animate-bounce">
            <XCircle className="w-12 h-12" />
          </div>

          <div className="space-y-2 max-w-md">
            <span className="font-mono text-xs uppercase tracking-widest text-red-500 font-bold bg-red-950/60 px-3 py-1 rounded-full border border-red-500/40">
              DISQUALIFIED • EXAM TERMINATED
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white uppercase font-mono tracking-tight">
              TERMINAL PERMANENTLY LOCKED
            </h1>
            <p className="text-xs text-neutral-400 leading-relaxed font-mono">
              Team <strong className="text-white">{team?.teamCode}</strong> has exceeded the maximum limit of 3 security strikes (window minimizing / tab switching).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#101016] border border-[#232332] text-xs font-mono text-neutral-400 max-w-sm w-full">
            <div>Incident: 3 / 3 Anti-Cheat Strikes Triggered</div>
            <div className="mt-1 text-red-400 font-bold">Status: Marked Disqualified in Live Ledger</div>
          </div>

          <button
            onClick={handleLogout}
            className="px-6 py-2.5 rounded-xl border border-neutral-700 bg-neutral-900 text-xs font-mono text-neutral-300 hover:text-white"
          >
            Exit Terminal Session
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TOP COMBAT HUD BAR */}
      {/* ========================================================= */}
      <header className="border-b border-[#1c1c28] bg-[#08080d] px-4 py-2.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <div className="w-2.5 h-2.5 bg-amber-500 rounded-sm" />
            <span className="font-bold text-white tracking-wider">{team?.name}</span>
            <span className="text-neutral-400">[{team?.teamCode}]</span>
          </div>

          {/* Connection Pulse */}
          <span
            className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`}
            title={connected ? "Connected" : "Reconnecting"}
          />
        </div>

        {/* Tactical Coin Stash & Strike Gauge */}
        <div className="flex items-center gap-3">
          {/* Strikes Counter Indicator */}
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded border font-mono text-[10px] font-bold ${
              strikes === 0
                ? "bg-[#111116] border-[#222230] text-neutral-400"
                : strikes === 1
                ? "bg-amber-500/20 border-amber-500 text-amber-300"
                : "bg-red-600/20 border-red-500 text-red-300 animate-pulse"
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>STRIKES: {strikes}/3</span>
          </div>

          {/* Coin Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#12121a] border border-amber-500/40 text-amber-300 font-mono font-bold text-xs">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{(team?.currentBalance ?? 5000).toLocaleString()}</span>
          </div>

          <button
            onClick={handleLogout}
            className="p-1 rounded border border-[#272738] bg-[#14141c] text-neutral-400 hover:text-red-400"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* MAIN GAME WORKSPACE */}
      {/* ========================================================= */}
      <main className="flex-1 max-w-lg mx-auto w-full p-4 flex flex-col justify-between">
        {/* LOBBY / WAITING STATE */}
        {(gameStatus === "LOBBY" || gameStatus === "READY") && (
          <div className="my-auto text-center p-8 rounded-2xl bg-[#09090f] border border-[#1e1e2c] space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-amber-400 font-bold">
                ARENA SYNCHRONIZED
              </div>
              <h2 className="text-xl font-black text-white font-mono mt-1">
                STAND BY FOR ROUND 1
              </h2>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                Terminal is locked in exam mode. Do not minimize this screen. The host will launch the first challenge shortly.
              </p>
            </div>
          </div>
        )}

        {/* SKIPPED STATE (BULL'S PASS) */}
        {hasPassed && (
          <div className="my-auto text-center p-8 rounded-2xl bg-amber-950/20 border border-amber-500/40 space-y-3">
            <FastForward className="w-10 h-10 text-amber-400 mx-auto" />
            <h2 className="text-lg font-black text-white font-mono uppercase">
              BULL&apos;S PASS DEPLOYED
            </h2>
            <p className="text-xs text-neutral-300 leading-relaxed font-mono">
              Your team skipped this round. Virtual coin balance preserved for upcoming rounds.
            </p>
            <div className="text-[10px] text-neutral-400 font-mono">
              Global timer active on Smart Board...
            </div>
          </div>
        )}

        {/* ACTIVE QUESTION CONSOLE */}
        {(gameStatus === "QUESTION_ACTIVE" ||
          gameStatus === "QUESTION_PAUSED" ||
          gameStatus === "QUESTION_CLOSED" ||
          gameStatus === "ANSWER_REVEAL") &&
          currentQ &&
          !hasPassed && (
            <div className="flex flex-col gap-3.5">
              {/* Question Header & Brutal Monospace Timer */}
              <div className="flex items-center justify-between border-b border-[#1c1c28] pb-3">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    ROUND {(gameState?.currentQuestionIndex || 0) + 1} // {currentQ.question.category}
                  </span>
                  <div className="text-[11px] text-neutral-400 font-mono">
                    DIFFICULTY: {currentQ.question.difficulty}
                  </div>
                </div>

                {/* Digital Clock */}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded border font-mono font-bold text-lg ${
                    remainingSeconds <= 30
                      ? "bg-red-950/50 border-red-500 text-red-400 animate-pulse"
                      : remainingSeconds <= 60
                      ? "bg-orange-950/30 border-orange-500 text-orange-300"
                      : "bg-[#101016] border-[#222230] text-amber-400"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>{timerDisplay}</span>
                  {isPaused && <span className="text-[10px] text-amber-400 ml-1">PAUSED</span>}
                </div>
              </div>

              {/* Question Card */}
              <div className="p-4 rounded-xl bg-[#0a0a10] border border-[#20202e] space-y-2">
                <p className="text-sm sm:text-base font-bold text-white leading-snug">
                  {currentQ.question.text}
                </p>

                {/* Image if present */}
                {currentQ.question.imageUrl && (
                  <div className="rounded-lg overflow-hidden border border-[#222230] max-h-40 bg-black">
                    <img
                      src={currentQ.question.imageUrl}
                      alt="Question Reference"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Private Unlocked Clues */}
                {hintText && (
                  <div className="p-2.5 rounded bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-mono text-[10px] font-bold uppercase text-amber-400">
                        BULL&apos;S HINT CLUE:
                      </div>
                      <div className="text-[11px] mt-0.5">{hintText}</div>
                    </div>
                  </div>
                )}

                {visualClueUrl && (
                  <div className="p-2.5 rounded bg-purple-950/30 border border-purple-500/40 text-purple-200">
                    <div className="font-mono text-[10px] font-bold uppercase text-purple-400 mb-1 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>VISION BOOST CLUE:</span>
                    </div>
                    <img
                      src={visualClueUrl}
                      alt="Vision Clue"
                      className="rounded max-h-36 w-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* 4 Combat Option Buttons */}
              <div className="grid grid-cols-1 gap-2">
                {[
                  { key: "A", text: currentQ.question.optionA },
                  { key: "B", text: currentQ.question.optionB },
                  { key: "C", text: currentQ.question.optionC },
                  { key: "D", text: currentQ.question.optionD },
                ].map((opt) => {
                  const isEliminated = eliminatedOptions.includes(opt.key);
                  const isSelected = selectedOption === opt.key;
                  const isLocked = lockedAnswer?.selectedOption === opt.key;
                  const isReveal = gameStatus === "ANSWER_REVEAL";
                  const isCorrect = isReveal && currentQ.correctOption === opt.key;

                  let style = "bg-[#0d0d14] border-[#1e1e2c] text-neutral-200 hover:border-amber-500/50";
                  if (isEliminated) {
                    style = "bg-[#060608] border-[#14141c] text-neutral-700 line-through opacity-30 cursor-not-allowed";
                  } else if (isReveal) {
                    if (isCorrect) {
                      style = "bg-emerald-950/60 border-emerald-500 text-white font-bold ring-2 ring-emerald-500/60";
                    } else if (isLocked && !isCorrect) {
                      style = "bg-red-950/50 border-red-500 text-red-200 opacity-80";
                    } else {
                      style = "bg-[#08080c] border-[#161620] text-neutral-600 opacity-40";
                    }
                  } else if (isLocked) {
                    style = "bg-amber-500/20 border-amber-500 text-amber-200 font-bold ring-2 ring-amber-500/40";
                  } else if (isSelected) {
                    style = "bg-amber-500/10 border-amber-400 text-white";
                  }

                  return (
                    <button
                      key={opt.key}
                      type="button"
                      disabled={isEliminated || !!lockedAnswer || gameStatus !== "QUESTION_ACTIVE"}
                      onClick={() => setSelectedOption(opt.key)}
                      className={`p-3 rounded-lg border text-left transition flex items-center justify-between text-xs sm:text-sm font-sans ${style}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-6 h-6 rounded flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                            isCorrect
                              ? "bg-emerald-500 text-black"
                              : isLocked
                              ? "bg-amber-500 text-black"
                              : "bg-[#181822] text-amber-400"
                          }`}
                        >
                          {opt.key}
                        </span>
                        <span className="font-medium">{opt.text}</span>
                      </div>

                      {isLocked && (
                        <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 uppercase shrink-0">
                          <Lock className="w-3 h-3" />
                          <span>LOCKED</span>
                        </div>
                      )}

                      {isCorrect && (
                        <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 uppercase shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>CORRECT</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explicit Lock Button */}
              {!lockedAnswer && gameStatus === "QUESTION_ACTIVE" && (
                <button
                  type="button"
                  disabled={!selectedOption || lockingIn}
                  onClick={() => setConfirmModal({ type: "answer", data: selectedOption })}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-black font-mono font-black text-xs uppercase tracking-widest disabled:opacity-40 shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>LOCK IN SELECTION [{selectedOption || "NONE"}]</span>
                </button>
              )}

              {/* Locked Confirmation Banner */}
              {lockedAnswer && (
                <div className="p-2.5 rounded bg-[#0e0e16] border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between font-mono">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Answer Locked: Option {lockedAnswer.selectedOption}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400">AWAITING ROUND END</span>
                </div>
              )}
            </div>
          )}

        {/* TACTICAL COMBAT LIFELINES */}
        {gameStatus === "QUESTION_ACTIVE" && !hasPassed && !lockedAnswer && (
          <div className="mt-3 pt-3 border-t border-[#1a1a26]">
            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-2">
              <span className="font-bold uppercase tracking-wider text-neutral-300">
                TACTICAL LIFELINES
              </span>
              <span>ATOMIC DEDUCTION</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={lifelines?.BULLS_HINT?.purchased || (team?.currentBalance ?? 0) < 500}
                onClick={() =>
                  setConfirmModal({
                    type: "lifeline",
                    data: { type: "BULLS_HINT", cost: 500, title: "Bull's Hint" },
                  })
                }
                className="p-2 rounded bg-[#0b0b12] border border-[#1e1e2c] text-left hover:border-amber-500/40 transition disabled:opacity-30"
              >
                <div className="flex items-center justify-between font-mono text-[11px] font-bold text-amber-400">
                  <span>HINT</span>
                  <span>500 C</span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">Private text clue</div>
              </button>

              <button
                type="button"
                disabled={lifelines?.VISION_BOOST?.purchased || (team?.currentBalance ?? 0) < 1500}
                onClick={() =>
                  setConfirmModal({
                    type: "lifeline",
                    data: { type: "VISION_BOOST", cost: 1500, title: "Vision Boost" },
                  })
                }
                className="p-2 rounded bg-[#0b0b12] border border-[#1e1e2c] text-left hover:border-purple-500/40 transition disabled:opacity-30"
              >
                <div className="flex items-center justify-between font-mono text-[11px] font-bold text-purple-400">
                  <span>VISION</span>
                  <span>1,500 C</span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">Private optical clue</div>
              </button>

              <button
                type="button"
                disabled={lifelines?.["50_50_BLAST"]?.purchased || (team?.currentBalance ?? 0) < 2000}
                onClick={() =>
                  setConfirmModal({
                    type: "lifeline",
                    data: { type: "50_50_BLAST", cost: 2000, title: "50-50 Blast" },
                  })
                }
                className="p-2 rounded bg-[#0b0b12] border border-[#1e1e2c] text-left hover:border-amber-500/40 transition disabled:opacity-30"
              >
                <div className="flex items-center justify-between font-mono text-[11px] font-bold text-amber-400">
                  <span>50-50</span>
                  <span>2,000 C</span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">Eliminate 2 wrong</div>
              </button>

              <button
                type="button"
                disabled={lifelines?.BULLS_PASS?.purchased || (team?.currentBalance ?? 0) < 2500}
                onClick={() =>
                  setConfirmModal({
                    type: "lifeline",
                    data: { type: "BULLS_PASS", cost: 2500, title: "Bull's Pass" },
                  })
                }
                className="p-2 rounded bg-[#0b0b12] border border-[#1e1e2c] text-left hover:border-red-500/40 transition disabled:opacity-30"
              >
                <div className="flex items-center justify-between font-mono text-[11px] font-bold text-red-400">
                  <span>PASS</span>
                  <span>2,500 C</span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">Skip round safely</div>
              </button>
            </div>
          </div>
        )}

        {/* LEADERBOARD VIEW */}
        {gameStatus === "LEADERBOARD" && (
          <div className="my-auto p-4 rounded-xl bg-[#09090f] border border-[#1e1e2c] space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#1c1c28] pb-2">
              <span className="font-bold text-amber-400 uppercase">ARENA STANDINGS</span>
              <span className="text-white">Your Score: {team?.score} pts</span>
            </div>
            <div className="divide-y divide-[#181824] max-h-56 overflow-y-auto">
              {leaderboard.map((lb) => (
                <div
                  key={lb.teamId}
                  className={`py-1.5 px-1 flex items-center justify-between ${
                    lb.teamId === team?.id ? "text-amber-400 font-bold bg-amber-500/10 rounded" : "text-neutral-400"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-600">#{lb.rank}</span>
                    <span className="text-white">{lb.teamName}</span>
                  </div>
                  <span>{lb.score} PTS</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* CONFIRMATION ACTION MODAL */}
      {/* ========================================================= */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0c14] border border-[#262638] rounded-xl max-w-xs w-full p-5 text-center space-y-3 font-mono">
            {confirmModal.type === "answer" ? (
              <>
                <div className="text-xs uppercase tracking-widest text-amber-400 font-bold">
                  LOCK ANSWER COMMITMENT
                </div>
                <p className="text-xs text-neutral-300">
                  Lock Option <strong className="text-amber-400 text-sm">[{confirmModal.data}]</strong>? Once locked, you cannot alter your decision.
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 py-2 rounded bg-[#161622] text-neutral-400 text-xs hover:text-white"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={() => submitAnswer(confirmModal.data)}
                    className="flex-1 py-2 rounded bg-amber-500 text-black text-xs font-black uppercase hover:bg-amber-400"
                  >
                    CONFIRM LOCK
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-xs uppercase tracking-widest text-amber-400 font-bold">
                  PURCHASE LIFELINE
                </div>
                <p className="text-xs text-neutral-300">
                  Deduct <strong className="text-amber-400">{confirmModal.data.cost} Coins</strong> for{" "}
                  <strong className="text-white">{confirmModal.data.title}</strong>?
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 py-2 rounded bg-[#161622] text-neutral-400 text-xs hover:text-white"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={() => buyLifeline(confirmModal.data.type)}
                    className="flex-1 py-2 rounded bg-amber-500 text-black text-xs font-black uppercase hover:bg-amber-400"
                  >
                    DEDUCT & ACTIVATE
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* FOOTER BAR */}
      <footer className="border-t border-[#14141e] px-4 py-2 text-center font-mono text-[9px] text-neutral-400 flex items-center justify-between">
        <span>SECURITY LOCK ACTIVE // 3 STRIKES POLICY</span>
        <span>COPY/PASTE RESTRICTED</span>
      </footer>
    </div>
  );
}
