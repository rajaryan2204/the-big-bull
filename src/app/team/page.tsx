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
  FastForward,
  LogOut,
  Maximize2,
  Clock,
  Coins,
  Shield,
  XCircle,
  Radio,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import {
  GameState,
  TeamPublic,
  TeamPrivateState,
  LifelineType,
  LeaderboardEntry,
} from "@/src/types";
import { detectIncognito } from "@/src/lib/detectIncognito";
import { IncognitoBarrier } from "@/src/components/IncognitoBarrier";

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

  // Incognito Security Enforcement
  const [isIncognito, setIsIncognito] = useState<boolean | null>(null);
  const [browserName, setBrowserName] = useState<string>("Browser");
  const [checkingIncognito, setCheckingIncognito] = useState<boolean>(true);

  const checkIncognitoStatus = useCallback(async () => {
    setCheckingIncognito(true);
    try {
      const res = await detectIncognito();
      setIsIncognito(res.isPrivate);
      setBrowserName(res.browserName);
    } catch {
      setIsIncognito(false);
    } finally {
      setCheckingIncognito(false);
    }
  }, []);

  useEffect(() => {
    checkIncognitoStatus();
  }, [checkIncognitoStatus]);

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

  // 3. Trigger Security Strike Incident (Debounced)
  const triggerSecurityStrike = useCallback(
    (reason: string) => {
      if (isDisqualified) return;
      const now = Date.now();
      if (now - lastIncidentTimeRef.current < 2000) return;
      lastIncidentTimeRef.current = now;

      soundFx.playStrikeAlarm();
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([300, 100, 300]);
      }

      setLockdownReason(reason);
      setLockdownActive(true);

      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("team:security_incident", { reason });
      }

      fetch("/api/team/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "team:security_incident", payload: { reason } }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.strikeUpdate) {
            setStrikes(data.strikeUpdate.strikesCount);
            setIsDisqualified(data.strikeUpdate.isDisqualified);
          }
        })
        .catch(() => {});
    },
    [isDisqualified]
  );

  // 4. Kiosk Mode Event Listeners
  useEffect(() => {
    if (!hasEnteredTerminal || isDisqualified) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerSecurityStrike("Tab Minimized or Switched Away");
      }
    };

    const handleWindowBlur = () => {
      triggerSecurityStrike("Lost Browser Window Focus");
    };

    const handleFullscreenChange = () => {
      const active = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(active);
      if (!active && hasEnteredTerminal && !isDisqualified) {
        triggerSecurityStrike("Exited Mandatory Fullscreen");
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "v", "x", "a", "s", "p", "u", "r", "t", "w", "n"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        return false;
      }
      if (["F12", "F5", "F11", "Escape"].includes(e.key)) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasEnteredTerminal, isDisqualified, triggerSecurityStrike]);

  // Reset selectedOption when moving to a new question
  const currentQId = gameState?.currentQuestion?.id;
  const prevQIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentQId && currentQId !== prevQIdRef.current) {
      prevQIdRef.current = currentQId;
      setSelectedOption(null);
    }
  }, [currentQId]);

  // Smooth 1-second countdown clock for active question
  useEffect(() => {
    const clockInterval = setInterval(() => {
      if (gameState?.status === "QUESTION_ACTIVE" && gameState.currentQuestion?.deadline) {
        const ms = new Date(gameState.currentQuestion.deadline).getTime();
        setRemainingSeconds(Math.max(0, Math.ceil((ms - Date.now()) / 1000)));
      }
    }, 1000);
    return () => clearInterval(clockInterval);
  }, [gameState]);

  // Unconditional HTTP Polling Fallback (Fast 1.5s interval for live synchronization)
  useEffect(() => {
    const fetchGameState = async () => {
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
      } catch {}
    };

    fetchGameState();
    const pollInterval = setInterval(fetchGameState, 1500);
    return () => clearInterval(pollInterval);
  }, []);

  // Enter Fullscreen Lock
  const enterFullscreen = async () => {
    try {
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        await docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
      setIsFullscreen(true);
      setHasEnteredTerminal(true);
      setLockdownActive(false);
    } catch {
      // In iOS or unsupported webviews, allow entering terminal
      setHasEnteredTerminal(true);
      setLockdownActive(false);
    }
  };

  // Submit Answer
  const submitAnswer = async (option: string) => {
    if (!gameState?.currentQuestion || lockingIn) return;
    setLockingIn(true);
    setConfirmModal(null);
    soundFx.playLockSound();

    let socketSuccess = false;
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(
        "team:submit_answer",
        { selectedOption: option, timeTakenSeconds: 300 - remainingSeconds },
        (res: any) => {
          if (res?.success) socketSuccess = true;
        }
      );
    }

    try {
      const res = await fetch("/api/team/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_answer",
          payload: {
            gameQuestionId: gameState.currentQuestion.id,
            selectedOption: option,
            timeTakenSeconds: 300 - remainingSeconds,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok && !socketSuccess) {
        alert(data.error || "Submission failed.");
      } else if (data.answer) {
        setSelectedOption(data.answer.selectedOption);
        if (privateState) {
          setPrivateState({ ...privateState, currentAnswer: data.answer });
        }
      }
    } catch {
      if (!socketSuccess) console.error("HTTP fallback submit error");
    } finally {
      setLockingIn(false);
    }
  };

  // Buy Lifeline
  const buyLifeline = async (type: LifelineType) => {
    if (!gameState?.currentQuestion) return;
    setConfirmModal(null);

    let socketSuccess = false;
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("team:buy_lifeline", { lifelineType: type }, (res: any) => {
        if (res?.success) {
          socketSuccess = true;
          soundFx.playCoinDing();
        }
      });
    }

    try {
      const res = await fetch("/api/team/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "buy_lifeline",
          payload: { gameQuestionId: gameState.currentQuestion.id, lifelineType: type },
        }),
      });
      const data = await res.json();
      if (!res.ok && !socketSuccess) {
        alert(data.error || "Lifeline purchase failed.");
      } else if (data.lifeline) {
        soundFx.playCoinDing();
        if (team && data.newBalance !== undefined) {
          setTeam({ ...team, currentBalance: data.newBalance });
        }
      }
    } catch {
      if (!socketSuccess) console.error("HTTP fallback lifeline error");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/team/logout", { method: "POST" });
      sessionStorage.removeItem("bigbull_team_token");
      router.replace("/join");
    } catch {
      router.replace("/join");
    }
  };

  const currentQ = gameState?.currentQuestion;
  const gameStatus = gameState?.status || "LOBBY";
  const lockedAnswer = privateState?.currentAnswer;
  const lifelines = privateState?.lifelines;
  const hasPassed = privateState?.hasPassed;

  const eliminatedOptions = lifelines?.["50_50_BLAST"]?.details?.eliminatedOptions || [];
  const hintText = lifelines?.["BULLS_HINT"]?.details?.hintText;
  const visualClueUrl = lifelines?.["VISION_BOOST"]?.details?.visualClueUrl;

  const mins = Math.floor(Math.max(0, remainingSeconds) / 60);
  const secs = Math.max(0, remainingSeconds) % 60;
  const timerDisplay = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  // ==========================================
  // VIEW 0: INCOGNITO ENFORCEMENT BARRIER
  // ==========================================
  const requireIncognito = gameState?.requireIncognito ?? true;
  if (requireIncognito && isIncognito === false) {
    return (
      <IncognitoBarrier
        browserName={browserName}
        onRecheck={checkIncognitoStatus}
        isChecking={checkingIncognito}
      />
    );
  }

  // ==========================================
  // VIEW 1: GATEWAY (MANDATORY FULLSCREEN LOCK)
  // ==========================================
  if (!hasEnteredTerminal) {
    return (
      <div
        className="min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 select-none font-sans"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 max-w-md mx-auto w-full">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-blue-600 rounded-sm" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
              THE BIG BULL
            </span>
          </div>
          <div className="flex items-center gap-2">
            {requireIncognito && isIncognito && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold flex items-center gap-1">
                <Shield className="w-3 h-3 text-blue-600" />
                Incognito Verified
              </span>
            )}
            <span className="font-mono text-xs font-semibold text-slate-600">
              {team?.teamCode}
            </span>
          </div>
        </div>

        <main className="max-w-md mx-auto w-full text-center space-y-5 my-auto py-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
              Exam Kiosk Lockdown
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              Active competition requires full-screen lock. Copying, right-clicking, and background tabs are strictly monitored.
            </p>
          </div>

          {/* 3-Strike Warning Notice */}
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-left space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-red-700 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Strict 3-Strike Disqualification Rule</span>
            </div>
            <ul className="list-disc list-inside text-slate-700 text-[11px] space-y-1">
              <li>Minimizing the app or exiting full screen triggers a Strike.</li>
              <li>Switching tabs or losing browser focus triggers a Strike.</li>
              <li>
                <strong className="text-red-700 font-bold">3rd Strike = Automatic Disqualification</strong>. Terminal will be permanently locked.
              </li>
            </ul>
          </div>

          <button
            onClick={enterFullscreen}
            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-sm shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer min-h-[50px]"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Enter Fullscreen Terminal</span>
          </button>
        </main>

        <footer className="text-center text-[11px] text-slate-400 max-w-md mx-auto w-full pt-3">
          Authorized Live Competition Terminal
        </footer>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: ACTIVE COMBAT TRADING TERMINAL
  // ==========================================
  return (
    <div
      className="h-[100dvh] max-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col justify-between select-none relative overflow-hidden font-sans"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
    >
      {/* LOCKDOWN OVERLAY (SUSPENDED ON STRIKE) */}
      {lockdownActive && !isDisqualified && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center animate-in fade-in duration-200">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-white border border-red-300 shadow-xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7 animate-pulse" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200 inline-block">
                Security Violation Detected
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Terminal Suspended
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                {lockdownReason || "Window Minimized or Fullscreen Exited"}
              </p>
            </div>

            {/* Strike Gauge */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[11px] font-semibold uppercase text-slate-500 mb-2">
                Strike Gauge (Max 3)
              </div>
              <div className="flex items-center justify-center gap-3">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm border transition-all ${
                      strikes >= s
                        ? "bg-red-600 border-red-600 text-white shadow-sm"
                        : "bg-white border-slate-300 text-slate-400"
                    }`}
                  >
                    #{s}
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs font-bold text-red-600">
                {strikes === 1 && "Strike 1 of 3 issued. 2 remaining."}
                {strikes === 2 && "Strike 2 of 3: FINAL WARNING before disqualification!"}
                {strikes >= 3 && "Maximum violations reached."}
              </div>
            </div>

            <button
              onClick={enterFullscreen}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider shadow-sm transition flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Re-Enter Fullscreen Terminal</span>
            </button>
          </div>
        </div>
      )}

      {/* DISQUALIFICATION SCREEN */}
      {isDisqualified && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-lg">
            <XCircle className="w-10 h-10" />
          </div>

          <div className="space-y-1.5 max-w-md bg-white p-6 rounded-2xl shadow-xl">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
              Disqualified • Exam Terminated
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight pt-2">
              Terminal Locked
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Team <strong className="text-slate-900">{team?.teamCode}</strong> exceeded the maximum limit of 3 security strikes.
            </p>

            <button
              onClick={handleLogout}
              className="w-full mt-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 font-semibold text-xs hover:bg-slate-100 cursor-pointer"
            >
              Exit Terminal
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TOP COMBAT HUD BAR - CLEAN WHITE & BLUE (COMPACT) */}
      {/* ========================================================= */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md px-3 py-1.5 sm:py-2 flex items-center justify-between sticky top-0 z-30 shadow-2xs shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-blue-600 rounded-sm shrink-0" />
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-900 truncate max-w-[130px] sm:max-w-none">{team?.name}</span>
            <span className="text-slate-400 font-mono text-[11px]">[{team?.teamCode}]</span>
          </div>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${connected ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`}
            title={connected ? "Connected" : "Reconnecting"}
          />
        </div>

        {/* Tactical Coin Stash & Strikes Gauge */}
        <div className="flex items-center gap-2">
          {/* Strikes Counter Indicator */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${
              strikes === 0
                ? "bg-slate-50 border-slate-200 text-slate-500"
                : strikes === 1
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "bg-red-50 border-red-300 text-red-700 animate-pulse"
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>{strikes}/3</span>
          </div>

          {/* Coin Badge */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-900 font-bold text-xs">
            <Coins className="w-3.5 h-3.5 text-blue-600" />
            <span>{(team?.currentBalance ?? 5000).toLocaleString()}</span>
          </div>

          <button
            onClick={handleLogout}
            className="p-1 rounded-md border border-slate-200 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* MAIN GAME WORKSPACE - 100% SINGLE SCREEN (NO SCROLL) */}
      {/* ========================================================= */}
      <main className="flex-1 max-w-md mx-auto w-full px-2.5 sm:px-3 py-1.5 sm:py-2 flex flex-col justify-between overflow-hidden">
        {/* LOBBY / WAITING STATE */}
        {(gameStatus === "LOBBY" || gameStatus === "READY") && (
          <div className="my-auto text-center p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-blue-600 font-bold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                Arena Synchronized
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1.5">
                Waiting for Round 1
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                Terminal is locked in secure exam mode. Do not leave this tab. The host will start the quiz shortly.
              </p>
            </div>

            {team?.members && team.members.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-center gap-1.5">
                  <Users className="w-3 h-3 text-blue-600" />
                  <span>
                    Squad Roster ({team.members.length} {team.members.length === 1 ? "Participant" : "Participants"})
                  </span>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {team.members.map((m, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-semibold"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SKIPPED STATE (BULL'S PASS) */}
        {hasPassed && (
          <div className="my-auto text-center p-5 sm:p-6 rounded-2xl bg-white border border-blue-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <FastForward className="w-5 h-5" />
            </div>
            <h2 className="text-base font-black text-slate-900">
              Bull&apos;s Pass Deployed
            </h2>
            <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
              Your squad safely passed this round. Virtual coin balance is preserved.
            </p>
          </div>
        )}

        {/* ACTIVE QUESTION CONSOLE - ZERO SCROLL PHONE LAYOUT */}
        {(gameStatus === "QUESTION_ACTIVE" ||
          gameStatus === "QUESTION_PAUSED" ||
          gameStatus === "QUESTION_CLOSED" ||
          gameStatus === "ANSWER_REVEAL") &&
          currentQ &&
          !hasPassed && (
            <div className="flex flex-col gap-2 shrink-0">
              {/* Question Sub-Header & Minimal Timer */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Q{(gameState?.currentQuestionIndex || 0) + 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-600 truncate max-w-[140px]">
                    {currentQ.question.category}
                  </span>
                </div>

                {/* Digital Clock */}
                <div
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-mono font-bold text-xs sm:text-sm border ${
                    remainingSeconds <= 15
                      ? "bg-red-50 border-red-300 text-red-700 animate-pulse"
                      : remainingSeconds <= 45
                      ? "bg-amber-50 border-amber-300 text-amber-800"
                      : "bg-blue-50 border-blue-200 text-blue-800"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{timerDisplay}</span>
                  {isPaused && <span className="text-[9px] text-amber-700 ml-1">PAUSED</span>}
                </div>
              </div>

              {/* Question Card */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5 shrink-0">
                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-3">
                  {currentQ.question.text}
                </p>

                {/* Compact Image thumbnail if present */}
                {currentQ.question.imageUrl && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 h-12 w-20 bg-slate-100 shrink-0">
                      <img
                        src={currentQ.question.imageUrl}
                        alt="Reference"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">Visual Clue Attached</span>
                  </div>
                )}

                {/* Private Unlocked Clues */}
                {hintText && (
                  <div className="p-1.5 rounded-lg bg-blue-50/80 border border-blue-200 text-blue-950 text-[11px] flex items-center gap-1.5">
                    <Lightbulb className="w-3 h-3 text-blue-600 shrink-0" />
                    <span className="truncate"><strong>Hint:</strong> {hintText}</span>
                  </div>
                )}

                {visualClueUrl && (
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-purple-50/80 border border-purple-200 text-[11px] text-purple-950">
                    <Eye className="w-3 h-3 text-purple-600 shrink-0" />
                    <div className="h-10 w-16 rounded overflow-hidden border border-purple-200 shrink-0">
                      <img src={visualClueUrl} alt="Clue" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] text-purple-700 font-bold">Vision Clue Unlocked</span>
                  </div>
                )}
              </div>

              {/* 4 Combat Option Buttons - High Contrast, Compact, Non-scrollable */}
              <div className="grid grid-cols-1 gap-1.5 shrink-0">
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

                  let style = "bg-white border-slate-200 text-slate-800 hover:border-blue-300 hover:bg-blue-50/20";
                  if (isEliminated) {
                    style = "bg-slate-100 border-slate-200 text-slate-400 line-through opacity-40 cursor-not-allowed";
                  } else if (isReveal) {
                    if (isCorrect) {
                      style = "bg-emerald-600 border-emerald-600 text-white font-bold shadow-sm";
                    } else if (isLocked && !isCorrect) {
                      style = "bg-red-50 border-red-300 text-red-800 opacity-90";
                    } else {
                      style = "bg-slate-50 border-slate-200 text-slate-400 opacity-50";
                    }
                  } else if (isLocked) {
                    style = "bg-blue-600 border-blue-600 text-white font-bold shadow-sm";
                  } else if (isSelected) {
                    style = "bg-blue-50 border-blue-500 text-blue-900 font-semibold ring-1 ring-blue-500/30";
                  }

                  return (
                    <button
                      key={opt.key}
                      type="button"
                      disabled={isEliminated || !!lockedAnswer || gameStatus !== "QUESTION_ACTIVE"}
                      onClick={() => setSelectedOption(opt.key)}
                      className={`py-2 px-3 rounded-xl border text-left transition flex items-center justify-between text-xs font-sans min-h-[38px] active:scale-[0.99] cursor-pointer ${style}`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCorrect || isLocked
                              ? "bg-white text-blue-700"
                              : isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {opt.key}
                        </span>
                        <span className="leading-tight truncate">{opt.text}</span>
                      </div>

                      {isLocked && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-100 uppercase shrink-0 ml-1">
                          <Lock className="w-3 h-3" />
                          <span>Locked</span>
                        </div>
                      )}

                      {isCorrect && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-white uppercase shrink-0 ml-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Correct</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Lock Button or Locked Confirmation Banner */}
              {!lockedAnswer && gameStatus === "QUESTION_ACTIVE" && (
                <button
                  type="button"
                  disabled={!selectedOption || lockingIn}
                  onClick={() => setConfirmModal({ type: "answer", data: selectedOption })}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider disabled:opacity-40 shadow-xs cursor-pointer flex items-center justify-center gap-1.5 min-h-[40px] shrink-0"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{selectedOption ? `Lock Answer [${selectedOption}]` : "Select an Option to Lock"}</span>
                </button>
              )}

              {lockedAnswer && (
                <div className="py-2 px-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Answer Locked: Option {lockedAnswer.selectedOption}</span>
                  </div>
                  <span className="text-[10px] text-blue-600 font-semibold">Waiting for Reveal</span>
                </div>
              )}

              {/* Solution on Reveal */}
              {gameStatus === "ANSWER_REVEAL" && currentQ.explanation && (
                <div className="py-1.5 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px] flex items-center gap-1.5 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate"><strong>Solution:</strong> {currentQ.explanation}</span>
                </div>
              )}
            </div>
          )}

        {/* LIFELINES 1-ROW BAR (ZERO SCROLLING) */}
        {gameStatus === "QUESTION_ACTIVE" && !hasPassed && !lockedAnswer && (
          <div className="pt-1.5 border-t border-slate-200 shrink-0">
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-1">
              <span>Tactical Lifelines</span>
              <span className="text-blue-600 font-mono">Bal: {(team?.currentBalance ?? 0).toLocaleString()} C</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {/* Hint */}
              <button
                type="button"
                disabled={lifelines?.BULLS_HINT?.purchased || (team?.currentBalance ?? 0) < 500}
                onClick={() =>
                  setConfirmModal({
                    type: "lifeline",
                    data: { type: "BULLS_HINT", cost: 500, title: "Bull's Hint" },
                  })
                }
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-center hover:border-blue-300 hover:bg-blue-50/30 transition disabled:opacity-40 active:scale-[0.98] flex flex-col items-center justify-center cursor-pointer"
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800">
                  <Lightbulb className="w-3 h-3 text-blue-600" />
                  <span>Hint</span>
                </div>
                <span className="text-[10px] text-blue-600 font-mono font-medium">500 C</span>
              </button>

              {/* Vision */}
              <button
                type="button"
                disabled={lifelines?.VISION_BOOST?.purchased || (team?.currentBalance ?? 0) < 1500}
                onClick={() =>
                  setConfirmModal({
                    type: "lifeline",
                    data: { type: "VISION_BOOST", cost: 1500, title: "Vision Boost" },
                  })
                }
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-center hover:border-blue-300 hover:bg-blue-50/30 transition disabled:opacity-40 active:scale-[0.98] flex flex-col items-center justify-center cursor-pointer"
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800">
                  <Eye className="w-3 h-3 text-blue-600" />
                  <span>Vision</span>
                </div>
                <span className="text-[10px] text-blue-600 font-mono font-medium">1.5k C</span>
              </button>

              {/* 50:50 */}
              <button
                type="button"
                disabled={lifelines?.["50_50_BLAST"]?.purchased || (team?.currentBalance ?? 0) < 2000}
                onClick={() =>
                  setConfirmModal({
                    type: "lifeline",
                    data: { type: "50_50_BLAST", cost: 2000, title: "50-50 Blast" },
                  })
                }
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-center hover:border-blue-300 hover:bg-blue-50/30 transition disabled:opacity-40 active:scale-[0.98] flex flex-col items-center justify-center cursor-pointer"
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>50:50</span>
                </div>
                <span className="text-[10px] text-blue-600 font-mono font-medium">2k C</span>
              </button>

              {/* Pass */}
              <button
                type="button"
                disabled={lifelines?.BULLS_PASS?.purchased || (team?.currentBalance ?? 0) < 2500}
                onClick={() =>
                  setConfirmModal({
                    type: "lifeline",
                    data: { type: "BULLS_PASS", cost: 2500, title: "Bull's Pass" },
                  })
                }
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-center hover:border-blue-300 hover:bg-blue-50/30 transition disabled:opacity-40 active:scale-[0.98] flex flex-col items-center justify-center cursor-pointer"
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800">
                  <FastForward className="w-3 h-3 text-emerald-600" />
                  <span>Pass</span>
                </div>
                <span className="text-[10px] text-blue-600 font-mono font-medium">2.5k C</span>
              </button>
            </div>
          </div>
        )}

        {/* LEADERBOARD VIEW */}
        {gameStatus === "LEADERBOARD" && (
          <div className="my-auto p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-900 text-sm">Leaderboard</span>
              <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Score: {team?.score} pts
              </span>
            </div>
            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {leaderboard.map((lb) => (
                <div
                  key={lb.teamId}
                  className={`py-2 px-1.5 flex items-center justify-between ${
                    lb.teamId === team?.id ? "text-blue-900 font-bold bg-blue-50/70 rounded-lg" : "text-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 font-mono text-slate-400">#{lb.rank}</span>
                    <span className="font-semibold text-slate-900">{lb.teamName}</span>
                  </div>
                  <span className="font-mono font-bold text-blue-700">{lb.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* CONFIRMATION ACTION MODAL */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xs w-full p-5 text-center space-y-3 shadow-xl">
            {confirmModal.type === "answer" ? (
              <>
                <div className="text-xs uppercase tracking-wide text-blue-600 font-bold">
                  Confirm Answer Lock
                </div>
                <p className="text-xs text-slate-600">
                  Lock in Option <strong className="text-blue-700 text-sm font-bold">[{confirmModal.data}]</strong>? You cannot change your choice once locked.
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => submitAnswer(confirmModal.data)}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm shadow-blue-500/20 cursor-pointer"
                  >
                    Confirm Lock
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-xs uppercase tracking-wide text-blue-600 font-bold">
                  Purchase Lifeline
                </div>
                <p className="text-xs text-slate-600">
                  Deduct <strong className="text-blue-700 font-bold">{confirmModal.data.cost} Coins</strong> for{" "}
                  <strong className="text-slate-900 font-bold">{confirmModal.data.title}</strong>?
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => buyLifeline(confirmModal.data.type)}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm shadow-blue-500/20 cursor-pointer"
                  >
                    Activate
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
