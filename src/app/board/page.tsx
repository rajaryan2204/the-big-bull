"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { getSocketClient } from "@/src/lib/socketClient";
import { QRCodeView } from "@/src/components/QRCodeView";
import { soundFx } from "@/src/lib/soundFx";
import {
  Maximize2,
  Minimize2,
  Trophy,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Volume2,
  VolumeX,
  Radio,
  Play,
  Pause,
  Key,
  ChevronRight,
  X,
  RotateCcw,
} from "lucide-react";
import { GameState, LeaderboardEntry } from "@/src/types";
import { BullLogo } from "@/src/components/BullLogo";

export default function SmartBoardPage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [answerCount, setAnswerCount] = useState<{ answeredCount: number; totalCount: number }>({
    answeredCount: 0,
    totalCount: 0,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [revealData, setRevealData] = useState<{ correctOption?: string; explanation?: string } | null>(null);

  // Host Launch and Presentation Controls
  const [showHostModal, setShowHostModal] = useState<boolean>(false);
  const [hostUsername, setHostUsername] = useState<string>("bigbulls");
  const [hostPassword, setHostPassword] = useState<string>("questions");
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [isHostAuthenticated, setIsHostAuthenticated] = useState<boolean>(false);
  const [hostLoginLoading, setHostLoginLoading] = useState<boolean>(false);
  const [hostLoginError, setHostLoginError] = useState<string>("");

  // Auto-advance banner after 5-minute expiration
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const autoAdvanceTriggeredRef = useRef<boolean>(false);

  const prevStatusRef = useRef<string>("LOBBY");
  const prevSecondRef = useRef<number>(300);
  const socketRef = useRef<any>(null);

  // Check saved host token on initial mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedToken = sessionStorage.getItem("bigbull_admin_token");
      if (savedToken) {
        setHostToken(savedToken);
        setIsHostAuthenticated(true);
      }
    }
  }, []);

  // 1. Socket.IO Connection
  useEffect(() => {
    const socket = getSocketClient(null, "board");
    socketRef.current = socket;

    socket.on("game:state", (state: GameState) => {
      setGameState(state);
      if (state.status === "QUESTION_ACTIVE" && state.currentQuestion?.deadline) {
        const ms = new Date(state.currentQuestion.deadline).getTime();
        setRemainingSeconds(Math.max(0, Math.ceil((ms - Date.now()) / 1000)));
        setIsPaused(false);
      } else if (state.status === "QUESTION_PAUSED" && state.currentQuestion?.remainingOnPause) {
        setRemainingSeconds(Math.ceil(state.currentQuestion.remainingOnPause / 1000));
        setIsPaused(true);
      } else if (state.status === "ANSWER_REVEAL") {
        setRevealData({
          correctOption: state.currentQuestion?.correctOption || undefined,
          explanation: state.currentQuestion?.explanation || undefined,
        });
      }
    });

    socket.on("timer:sync", (data: { remainingSeconds: number; isPaused: boolean }) => {
      setRemainingSeconds(data.remainingSeconds);
      setIsPaused(data.isPaused);
    });

    socket.on("stats:answer_count", (stats: { answeredCount: number; totalCount: number }) => {
      setAnswerCount(stats);
    });

    socket.on("leaderboard:updated", (lb: LeaderboardEntry[]) => {
      setLeaderboard(lb);
    });

    socket.on("question:revealed", (data: { correctOption: string; explanation?: string }) => {
      setRevealData(data);
    });

    return () => {
      socket.off("game:state");
      socket.off("timer:sync");
      socket.off("stats:answer_count");
      socket.off("leaderboard:updated");
      socket.off("question:revealed");
    };
  }, []);

  // 2. High-Frequency HTTP Polling (1000ms interval for live multi-screen sync)
  const fetchGameState = useCallback(async () => {
    try {
      const res = await fetch("/api/game/state");
      const data = await res.json();
      if (data.success && data.game) {
        setGameState(data.game);
        if (data.leaderboard) setLeaderboard(data.leaderboard);
        if (data.answeredCount !== undefined) {
          setAnswerCount({
            answeredCount: data.answeredCount,
            totalCount: data.totalTeamsCount || 8,
          });
        }
        if (data.game.status === "QUESTION_ACTIVE" && data.game.currentQuestion?.deadline) {
          const ms = new Date(data.game.currentQuestion.deadline).getTime();
          setRemainingSeconds(Math.max(0, Math.ceil((ms - Date.now()) / 1000)));
          setIsPaused(false);
        } else if (data.game.status === "QUESTION_PAUSED" && data.game.currentQuestion?.remainingOnPause) {
          setRemainingSeconds(Math.ceil(data.game.currentQuestion.remainingOnPause / 1000));
          setIsPaused(true);
        } else if (data.game.status === "ANSWER_REVEAL" && data.game.currentQuestion) {
          setRevealData({
            correctOption: data.game.currentQuestion.correctOption || undefined,
            explanation: data.game.currentQuestion.explanation || undefined,
          });
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchGameState();
    const pollInterval = setInterval(fetchGameState, 1000);
    return () => clearInterval(pollInterval);
  }, [fetchGameState]);

  // 3. Smooth Local 1-Second Countdown Clock
  useEffect(() => {
    const clockInterval = setInterval(() => {
      if (gameState?.status === "QUESTION_ACTIVE" && gameState.currentQuestion?.deadline) {
        const deadlineMs = new Date(gameState.currentQuestion.deadline).getTime();
        const diffSecs = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
        setRemainingSeconds(diffSecs);
      }
    }, 1000);
    return () => clearInterval(clockInterval);
  }, [gameState]);

  // 4. Host Command Execution
  const handleHostCommand = async (action: string, options?: any) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (hostToken) {
        headers["Authorization"] = `Bearer ${hostToken}`;
      }

      const res = await fetch("/api/admin/game/control", {
        method: "POST",
        headers,
        body: JSON.stringify({ action, options }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Action failed");
      }

      if (data.game) {
        setGameState(data.game);
      }
      await fetchGameState();
      return data;
    } catch (e: any) {
      console.warn("Host command notice:", e.message);
      throw e;
    }
  };

  // 5. Host Login & Start Live Competition
  const handleHostLoginAndStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setHostLoginLoading(true);
    setHostLoginError("");

    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: hostUsername.trim(), password: hostPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.token) {
        throw new Error(data.error || "Invalid host credentials");
      }

      setHostToken(data.token);
      setIsHostAuthenticated(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("bigbull_admin_token", data.token);
      }

      // If game is in Lobby, automatically start Question 1!
      if (!gameState || gameState.status === "LOBBY" || gameState.status === "READY") {
        const ctrlRes = await fetch("/api/admin/game/control", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.token}`,
          },
          body: JSON.stringify({ action: "start_game" }),
        });
        const ctrlData = await ctrlRes.json();
        if (!ctrlRes.ok) {
          throw new Error(ctrlData.error || "Failed to start Question 1");
        }
        if (ctrlData.game) {
          setGameState(ctrlData.game);
          if (ctrlData.game.currentQuestion?.deadline) {
            const ms = new Date(ctrlData.game.currentQuestion.deadline).getTime();
            setRemainingSeconds(Math.max(0, Math.ceil((ms - Date.now()) / 1000)));
          }
        }
      }

      setShowHostModal(false);
      soundFx.playRevealFanfare();
      await fetchGameState();
    } catch (err: any) {
      setHostLoginError(err.message || "Failed to authenticate");
    } finally {
      setHostLoginLoading(false);
    }
  };

  // 6. Automatic 5-Minute Timer Expiry & Progression
  useEffect(() => {
    const curStatus = gameState?.status;
    if (curStatus === "QUESTION_ACTIVE" && remainingSeconds === 0 && !autoAdvanceTriggeredRef.current) {
      autoAdvanceTriggeredRef.current = true;
      soundFx.playTimeUpBuzzer();

      // Automatically reveal answer
      handleHostCommand("reveal_answer")
        .then(() => {
          // Start 15s transition countdown to next question
          setAutoAdvanceCountdown(15);
        })
        .catch(() => {
          setAutoAdvanceCountdown(15);
        });
    } else if (curStatus !== "QUESTION_ACTIVE") {
      autoAdvanceTriggeredRef.current = false;
    }
  }, [gameState?.status, remainingSeconds]);

  // Auto-advance countdown interval after reveal
  useEffect(() => {
    if (autoAdvanceCountdown === null) return;
    if (autoAdvanceCountdown <= 0) {
      setAutoAdvanceCountdown(null);
      const isLastQ =
        gameState &&
        gameState.currentQuestionIndex !== undefined &&
        gameState.totalQuestions !== undefined &&
        gameState.currentQuestionIndex + 1 >= gameState.totalQuestions;

      if (isLastQ) {
        handleHostCommand("show_leaderboard").catch(() => {});
      } else {
        handleHostCommand("next_question").catch(() => {});
      }
      return;
    }

    const timer = setTimeout(() => {
      setAutoAdvanceCountdown(autoAdvanceCountdown - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [autoAdvanceCountdown, gameState]);

  // 7. Sound Dispatcher
  useEffect(() => {
    if (!gameState) return;
    const currentStatus = gameState.status;
    const prevStatus = prevStatusRef.current;

    if (currentStatus === "ANSWER_REVEAL" && prevStatus !== "ANSWER_REVEAL") {
      soundFx.playRevealFanfare();
    } else if (currentStatus === "QUESTION_ACTIVE" && remainingSeconds === 0 && prevSecondRef.current > 0) {
      soundFx.playTimeUpBuzzer();
    } else if (currentStatus === "QUESTION_ACTIVE" && remainingSeconds <= 10 && remainingSeconds > 0) {
      if (remainingSeconds !== prevSecondRef.current) {
        soundFx.playTick(remainingSeconds <= 5);
      }
    }

    prevStatusRef.current = currentStatus;
    prevSecondRef.current = remainingSeconds;
  }, [gameState, remainingSeconds]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundFx.setMuted(next);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const status = gameState?.status || "LOBBY";
  const currentQ = gameState?.currentQuestion;

  const mins = Math.floor(Math.max(0, remainingSeconds) / 60);
  const secs = Math.max(0, remainingSeconds) % 60;
  const timerFormatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between select-none font-sans overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* ========================================================= */}
      {/* TOP SMART BOARD HEADER & PRESENTER BAR */}
      {/* ========================================================= */}
      <header className="border-b border-slate-200/80 bg-white px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xs gap-3">
        <div className="flex items-center gap-3">
          <BullLogo size="sm" />
          <span className="text-slate-300 hidden sm:inline">//</span>
          <span className="text-xs font-semibold text-slate-600 hidden sm:inline">
            Smart Board Broadcast • {gameState?.title || "Championship 2026"}
          </span>
        </div>

        {/* Quick Presenter Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Status Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 uppercase">
            <span
              className={`w-2 h-2 rounded-full ${
                status === "QUESTION_ACTIVE"
                  ? "bg-red-500 animate-pulse"
                  : status === "QUESTION_PAUSED"
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
            />
            <span>{status.replace("_", " ")}</span>
          </div>

          {/* Host Quick Buttons */}
          {isHostAuthenticated ? (
            <div className="flex items-center gap-1.5">
              {(status === "LOBBY" || status === "READY") && (
                <button
                  onClick={() => handleHostCommand("start_game")}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Launch Round 1"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Launch Round 1</span>
                </button>
              )}
              {status === "QUESTION_ACTIVE" && (
                <>
                  <button
                    onClick={() => handleHostCommand("pause_game")}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    title="Pause Question Timer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Pause</span>
                  </button>
                  <button
                    onClick={() => handleHostCommand("reveal_answer")}
                    className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                    title="Reveal Correct Answer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline">Reveal</span>
                  </button>
                </>
              )}

              {status === "QUESTION_PAUSED" && (
                <button
                  onClick={() => handleHostCommand("resume_game")}
                  className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume</span>
                </button>
              )}

              {(status === "ANSWER_REVEAL" || status === "QUESTION_CLOSED" || status === "QUESTION_ACTIVE") && (
                <button
                  onClick={() => handleHostCommand("next_question")}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                  title="Next Question"
                >
                  <span>Next Q</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => handleHostCommand("show_leaderboard")}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="Show Championship Standings"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden lg:inline">Standings</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowHostModal(true)}
              className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Host Login</span>
            </button>
          )}

          {/* Audio Toggle */}
          <button
            onClick={toggleMute}
            className={`p-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              isMuted
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-blue-200 bg-blue-50 text-blue-700"
            }`}
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* HOST LOGIN & START MODAL */}
      {/* ========================================================= */}
      {showHostModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-600 rounded-sm" />
                <h3 className="font-extrabold text-base text-slate-900">Host Launch Console</h3>
              </div>
              <button
                onClick={() => setShowHostModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-500">
                Enter your credentials to unlock live controls and begin the 5-minute timed rounds.
              </p>
            </div>

            {hostLoginError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                {hostLoginError}
              </div>
            )}

            <form onSubmit={handleHostLoginAndStart} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={hostUsername}
                  onChange={(e) => setHostUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono focus:border-blue-600 focus:bg-white outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={hostPassword}
                  onChange={(e) => setHostPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono focus:border-blue-600 focus:bg-white outline-hidden"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={hostLoginLoading}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm transition flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
              >
                {hostLoginLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Unlock & Start Competition (5-Min Rounds)</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MAIN PRESENTATION STAGE */}
      {/* ========================================================= */}
      <main className="flex-1 max-w-[1500px] mx-auto w-full p-4 sm:p-8 flex flex-col justify-center">
        {/* LOBBY / READY VIEW */}
        {(status === "LOBBY" || status === "READY") && (
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10 my-auto">
            <div className="space-y-6 max-w-2xl text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
                <Radio className="w-4 h-4 text-blue-600" />
                <span>Live Arena Open</span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-none">
                THE BIG BULL <br />
                <span className="text-blue-600">CHAMPIONSHIP</span>
              </h1>

              <p className="text-base text-slate-600 leading-relaxed">
                Scan the QR code with any phone camera to access the participant terminal. 5,000 Coins starting capital. Each round runs on a live 5-minute countdown clock.
              </p>

              {/* Host Start Button directly on Smart Board */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    if (isHostAuthenticated) {
                      handleHostCommand("start_game");
                    } else {
                      setShowHostModal(true);
                    }
                  }}
                  className="px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-base uppercase tracking-wider shadow-md shadow-blue-500/25 transition flex items-center justify-center gap-3 cursor-pointer min-h-[52px]"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>
                    {isHostAuthenticated
                      ? "Launch Round 1 (5-Min Live Timer)"
                      : "Start Live Competition (Host Login)"}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 font-mono">
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <div className="text-3xl font-black text-blue-600">
                    {gameState?.connectedTeamsCount || 0} / {gameState?.totalTeamsCount || 8}
                  </div>
                  <div className="text-xs text-slate-500 uppercase mt-1">Squads Connected</div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <div className="text-3xl font-black text-slate-900">
                    {gameState?.totalQuestions || 16}
                  </div>
                  <div className="text-xs text-slate-500 uppercase mt-1">5-Min Question Rounds</div>
                </div>
              </div>
            </div>

            {/* QR Code Card */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-8 flex flex-col items-center text-center shadow-lg">
              <QRCodeView size={240} />
              <div className="mt-4 text-xs font-semibold text-slate-600 max-w-xs">
                Scan with any phone camera to access the participant terminal.
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE QUESTION SCREEN */}
        {(status === "QUESTION_ACTIVE" ||
          status === "QUESTION_PAUSED" ||
          status === "QUESTION_CLOSED" ||
          status === "ANSWER_REVEAL") &&
          currentQ && (
            <div className="flex flex-col gap-6 w-full my-auto">
              {/* Telemetry Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div className="flex items-center gap-3">
                  <span className="px-3.5 py-1.5 rounded-full bg-blue-600 text-white font-black text-sm uppercase shadow-xs">
                    Round {(gameState?.currentQuestionIndex || 0) + 1} of {gameState?.totalQuestions}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 uppercase">
                    {currentQ.question.category}
                  </span>
                </div>

                {/* Massive 5-Minute Countdown Clock */}
                <div
                  className={`flex items-center gap-3 px-8 py-3 rounded-2xl border-2 font-mono font-black text-5xl sm:text-6xl shadow-sm ${
                    remainingSeconds <= 15
                      ? "bg-red-50 border-red-400 text-red-600 animate-pulse"
                      : remainingSeconds <= 45
                      ? "bg-amber-50 border-amber-300 text-amber-800"
                      : "bg-blue-50 border-blue-200 text-blue-800"
                  }`}
                >
                  <Clock className="w-10 h-10 shrink-0 text-current" />
                  <span>{timerFormatted}</span>
                  {isPaused && (
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded ml-2">
                      PAUSED
                    </span>
                  )}
                </div>
              </div>

              {/* Auto-Advance Notification Banner */}
              {autoAdvanceCountdown !== null && (
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-between gap-4 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
                    <span>
                      Time&apos;s Up! Next question will begin automatically in{" "}
                      <strong className="font-mono text-blue-700 text-base">{autoAdvanceCountdown}s</strong>
                    </span>
                  </div>
                  {isHostAuthenticated && (
                    <button
                      onClick={() => {
                        setAutoAdvanceCountdown(null);
                        handleHostCommand("next_question").catch(() => {});
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <span>Skip to Next Question</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Question Statement & Submissions Gauge */}
              <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight">
                    {currentQ.question.text}
                  </h2>

                  {currentQ.question.imageUrl && (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 max-h-72 w-full max-w-xl bg-slate-100 shadow-xs">
                      <img
                        src={currentQ.question.imageUrl}
                        alt="Question Reference"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Response Gauge */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col items-center justify-center min-w-[240px] text-center">
                  <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">
                    Locked Submissions
                  </div>
                  <div className="text-4xl font-black text-blue-600 mt-1">
                    {answerCount.answeredCount} / {answerCount.totalCount || gameState?.totalTeamsCount || 8}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2 font-medium">
                    Anonymous Server Verification
                  </div>
                </div>
              </div>

              {/* 4 Crisp Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {[
                  { key: "A", text: currentQ.question.optionA },
                  { key: "B", text: currentQ.question.optionB },
                  { key: "C", text: currentQ.question.optionC },
                  { key: "D", text: currentQ.question.optionD },
                ].map((opt) => {
                  const isReveal = status === "ANSWER_REVEAL";
                  const isCorrect =
                    isReveal && (currentQ.correctOption === opt.key || revealData?.correctOption === opt.key);

                  let cardStyle = "bg-white border-slate-200 text-slate-900";
                  if (isReveal) {
                    if (isCorrect) {
                      cardStyle = "bg-emerald-600 border-emerald-600 text-white font-bold shadow-md";
                    } else {
                      cardStyle = "bg-slate-50 border-slate-200 text-slate-400 opacity-50";
                    }
                  }

                  return (
                    <div
                      key={opt.key}
                      className={`p-5 sm:p-6 rounded-2xl border-2 flex items-center gap-5 transition-all shadow-xs ${cardStyle}`}
                    >
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black shrink-0 ${
                          isCorrect
                            ? "bg-white text-emerald-700"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {opt.key}
                      </div>
                      <div className="text-xl sm:text-2xl font-bold leading-snug">
                        {opt.text}
                      </div>
                      {isCorrect && (
                        <div className="ml-auto px-3.5 py-1 rounded-full bg-white text-emerald-700 text-xs font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Correct</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Solution Reveal Box */}
              {status === "ANSWER_REVEAL" && (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-4">
                  <Sparkles className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Solution Explanation
                    </div>
                    <p className="mt-1 text-base text-slate-800 leading-relaxed font-medium">
                      {currentQ.explanation || revealData?.explanation || "Solution revealed. Standings recalculated."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

        {/* LEADERBOARD BROADCAST */}
        {status === "LEADERBOARD" && (
          <div className="max-w-5xl mx-auto w-full my-auto space-y-6">
            <div className="text-center space-y-1">
              <span className="text-xs text-blue-600 font-bold uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Arena Leaderboard
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Championship Standings
              </h2>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-md">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-600">
                    <th className="py-4 px-6">Rank</th>
                    <th className="py-4 px-6">Squad</th>
                    <th className="py-4 px-6 text-center">Score</th>
                    <th className="py-4 px-6 text-center">Accuracy</th>
                    <th className="py-4 px-6 text-right">Coins</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaderboard.map((entry, index) => (
                    <tr
                      key={entry.teamId}
                      className={index === 0 ? "bg-blue-50/60 font-bold" : "hover:bg-slate-50/50"}
                    >
                      <td className="py-4 px-6 font-mono text-lg font-black text-slate-700">
                        #{entry.rank}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 text-base">{entry.teamName}</div>
                        <div className="flex items-center flex-wrap gap-2 mt-1">
                          <span className="text-xs text-slate-400 font-mono">{entry.teamCode}</span>
                          {entry.members && entry.members.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              <Users className="w-2.5 h-2.5 text-blue-600" />
                              {entry.members.join(", ")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center text-lg font-black text-blue-600">
                        {entry.score.toLocaleString()} pts
                      </td>
                      <td className="py-4 px-6 text-center text-slate-600 font-medium">
                        {entry.correctAnswers} / {entry.attemptedQuestions}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-slate-800">
                        💰 {entry.currentBalance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-3 px-6 flex items-center justify-between text-xs text-slate-500">
        <span>THE BIG BULL Live Presentation Engine</span>
        <span>Synced with Host Controller • 5-Min Timer</span>
      </footer>
    </div>
  );
}
