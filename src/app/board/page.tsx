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
  Medal,
  Award,
  FileText,
  XCircle,
  Filter,
} from "lucide-react";
import { GameState, LeaderboardEntry } from "@/src/types";
import { BullLogo } from "@/src/components/BullLogo";
import { EventCountdown } from "@/src/components/EventCountdown";

export default function SmartBoardPage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(120);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [answerCount, setAnswerCount] = useState<{ answeredCount: number; totalCount: number }>({
    answeredCount: 0,
    totalCount: 0,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [revealData, setRevealData] = useState<{ correctOption?: string; explanation?: string } | null>(null);

  // Championship Podium & Answer Sheet State
  const [viewMode, setViewMode] = useState<"DEFAULT" | "PODIUM">("DEFAULT");
  const [selectedTeamForSheet, setSelectedTeamForSheet] = useState<LeaderboardEntry | null>(null);
  const [answerSheetData, setAnswerSheetData] = useState<any | null>(null);
  const [sheetLoading, setSheetLoading] = useState<boolean>(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [sheetFilter, setSheetFilter] = useState<"ALL" | "CORRECT" | "INCORRECT" | "PASSED">("ALL");

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
  const prevSecondRef = useRef<number>(120);
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
      const res = await fetch("/api/game/state", { cache: "no-store" });
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

  // Open and load Answer Sheet for any team
  const openAnswerSheet = async (entry: LeaderboardEntry) => {
    setSelectedTeamForSheet(entry);
    setSheetLoading(true);
    setSheetError(null);
    setAnswerSheetData(null);
    setSheetFilter("ALL");

    try {
      const res = await fetch(`/api/game/answersheet?teamId=${encodeURIComponent(entry.teamId)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load answer sheet.");
      }
      setAnswerSheetData(data.answerSheet);
    } catch (e: any) {
      setSheetError(e.message || "Failed to load answer sheet.");
    } finally {
      setSheetLoading(false);
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
    <div className="h-screen max-h-screen overflow-hidden bg-slate-50 text-slate-900 flex flex-col justify-between select-none font-sans selection:bg-blue-600 selection:text-white">
      {/* ========================================================= */}
      {/* TOP SMART BOARD HEADER & PRESENTER BAR */}
      {/* ========================================================= */}
      <header className="border-b border-slate-200/80 bg-white px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xs gap-3 shrink-0">
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

              <button
                onClick={() => setViewMode(viewMode === "PODIUM" || status === "FINISHED" ? "DEFAULT" : "PODIUM")}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === "PODIUM" || status === "FINISHED"
                    ? "bg-amber-500 border-amber-600 text-white shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
                title="Toggle Championship Top 3 Podium & Results"
              >
                <Award className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Top 3 Podium</span>
              </button>

              {status !== "FINISHED" && (
                <button
                  onClick={() => {
                    if (confirm("Conclude championship and declare final winners?")) {
                      handleHostCommand("end_game").then(() => setViewMode("PODIUM"));
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Conclude Event"
                >
                  <span className="hidden sm:inline">End Event</span>
                </button>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={() => setViewMode(viewMode === "PODIUM" || status === "FINISHED" ? "DEFAULT" : "PODIUM")}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "PODIUM" || status === "FINISHED"
                    ? "bg-amber-500 border-amber-600 text-white shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
                title="Toggle Championship Top 3 Podium & Results"
              >
                <Award className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{viewMode === "PODIUM" || status === "FINISHED" ? "Live Board" : "Top 3 Results"}</span>
              </button>

              <button
                onClick={() => setShowHostModal(true)}
                className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Host Login</span>
              </button>
            </>
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
      <main
        className={`flex-1 max-w-[1500px] mx-auto w-full p-4 sm:p-6 lg:p-7 flex flex-col ${
          status === "FINISHED" || viewMode === "PODIUM" || status === "LEADERBOARD"
            ? "overflow-y-auto justify-start py-6"
            : "justify-center overflow-hidden"
        }`}
      >
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

              {/* Event Countdown to 16 Oct 11:30 AM */}
              <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm max-w-lg">
                <EventCountdown size="md" showDateBadge={true} />
              </div>

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

        {/* ACTIVE QUESTION SCREEN - PRISTINE BROADCAST VIEW */}
        {(status === "QUESTION_ACTIVE" ||
          status === "QUESTION_PAUSED" ||
          status === "QUESTION_CLOSED" ||
          status === "ANSWER_REVEAL") &&
          currentQ && (
            <div className="flex flex-col justify-between h-full w-full py-1 gap-4">
              {/* Telemetry Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="px-3.5 py-1.5 rounded-full bg-blue-600 text-white font-black text-xs sm:text-sm uppercase shadow-xs">
                    Round {(gameState?.currentQuestionIndex || 0) + 1} of {gameState?.totalQuestions}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 uppercase">
                    {currentQ.question.category}
                  </span>
                </div>

                {/* Massive 5-Minute Countdown Clock */}
                <div
                  className={`flex items-center gap-3 px-6 sm:px-8 py-2 rounded-2xl border-2 font-mono font-black text-4xl sm:text-5xl shadow-xs ${
                    remainingSeconds <= 15
                      ? "bg-red-50 border-red-400 text-red-600 animate-pulse"
                      : remainingSeconds <= 45
                      ? "bg-amber-50 border-amber-300 text-amber-800"
                      : "bg-blue-50 border-blue-200 text-blue-800"
                  }`}
                >
                  <Clock className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 text-current" />
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
                <div className="p-3 sm:p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-between gap-4 animate-in fade-in shrink-0">
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

              {/* Question Statement & Side Media/Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center flex-1 min-h-0 overflow-hidden py-1">
                {/* Left Column: Question text */}
                <div className={`${currentQ.question.imageUrl ? "lg:col-span-8" : "lg:col-span-9"} flex flex-col justify-center`}>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-[42px] font-black text-slate-900 leading-snug tracking-tight">
                    {currentQ.question.text}
                  </h2>
                </div>

                {/* Right Column: Visual Frame and Submissions Gauge */}
                <div className={`${currentQ.question.imageUrl ? "lg:col-span-4" : "lg:col-span-3"} flex flex-col gap-3 shrink-0`}>
                  {currentQ.question.imageUrl && (
                    <div className="w-full aspect-video rounded-2xl overflow-hidden border-2 border-slate-200/90 shadow-sm bg-slate-100 max-h-48">
                      <img
                        src={currentQ.question.imageUrl}
                        alt="Question Visual Reference"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Submissions Gauge */}
                  <div className="w-full p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-around text-center">
                    <div>
                      <div className="text-[10px] sm:text-[11px] text-slate-500 uppercase font-bold tracking-wider">
                        Locked Submissions
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-0.5">
                        {answerCount.answeredCount} / {answerCount.totalCount || gameState?.totalTeamsCount || 8}
                      </div>
                    </div>
                    <div className="h-8 w-px bg-slate-200" />
                    <div className="text-[10px] sm:text-[11px] text-slate-400 font-semibold uppercase">
                      Live Verified
                    </div>
                  </div>
                </div>
              </div>

              {/* Solution Reveal Box */}
              {status === "ANSWER_REVEAL" && (
                <div className="py-2.5 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center gap-3 shrink-0 animate-in fade-in">
                  <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="truncate">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 mr-2">
                      Solution Explanation:
                    </span>
                    <span className="text-sm text-slate-800 font-medium">
                      {currentQ.explanation || revealData?.explanation || "Solution revealed. Standings recalculated."}
                    </span>
                  </div>
                </div>
              )}

              {/* 4 Crisp Options in 2x2 Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 shrink-0">
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
                      cardStyle = "bg-emerald-600 border-emerald-600 text-white font-bold shadow-md scale-[1.01]";
                    } else {
                      cardStyle = "bg-slate-50 border-slate-200 text-slate-400 opacity-40";
                    }
                  }

                  return (
                    <div
                      key={opt.key}
                      className={`p-4 sm:p-5 rounded-2xl border-2 flex items-center gap-4 transition-all shadow-xs ${cardStyle}`}
                    >
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black shrink-0 ${
                          isCorrect
                            ? "bg-white text-emerald-700 shadow-sm"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {opt.key}
                      </div>
                      <div className="text-lg sm:text-xl font-bold leading-snug">
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
            </div>
          )}

        {/* LEADERBOARD BROADCAST */}
        {status === "LEADERBOARD" && viewMode !== "PODIUM" && (
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
                    <th className="py-4 px-6 text-right">Action</th>
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
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => openAnswerSheet(entry)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-slate-700 text-xs font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Answer Sheet</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* GRAND FINALE: TOP 3 PODIUM & FULL TOURNAMENT RESULTS */}
        {/* ========================================================= */}
        {(status === "FINISHED" || viewMode === "PODIUM") && (
          <div className="max-w-6xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
            {/* Finale Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs font-black uppercase tracking-wider shadow-2xs">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Championship Concluded • Official Tournament Standings</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
                THE BIG BULL <span className="text-amber-500">WINNERS PODIUM</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
                Official verified results of THE BIG BULL Championship 2026. Click any team below to inspect their full question-by-question answer sheet.
              </p>
            </div>

            {/* TOP 3 OLYMPIC PODIUM CARDS */}
            {leaderboard.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-end pt-4">
                {/* 2ND PLACE (SILVER) */}
                {leaderboard[1] && (
                  <div className="order-2 md:order-1 rounded-3xl bg-linear-to-b from-slate-200/50 via-slate-100/30 to-white border-2 border-slate-300 p-5 sm:p-6 shadow-md flex flex-col justify-between h-[370px] relative transition-transform hover:-translate-y-1">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-800 text-[11px] font-black uppercase tracking-wider border border-slate-300 flex items-center gap-1.5">
                          <Medal className="w-3.5 h-3.5 text-slate-600" />
                          <span>🥈 2nd Place • Runner Up</span>
                        </span>
                        <span className="font-mono text-xs text-slate-500 font-bold">
                          #{leaderboard[1].rank}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 truncate">
                          {leaderboard[1].teamName}
                        </h3>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {leaderboard[1].teamCode}
                        </div>
                      </div>

                      {leaderboard[1].members && leaderboard[1].members.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {leaderboard[1].members.map((m, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] font-semibold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-200">
                      <div className="grid grid-cols-3 gap-2 text-center font-mono">
                        <div className="p-2 rounded-xl bg-white border border-slate-200">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Score</div>
                          <div className="text-base font-black text-slate-900">
                            {leaderboard[1].score.toLocaleString()}
                          </div>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-slate-200">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Accuracy</div>
                          <div className="text-base font-black text-slate-800">
                            {leaderboard[1].attemptedQuestions > 0
                              ? `${Math.round((leaderboard[1].correctAnswers / leaderboard[1].attemptedQuestions) * 100)}%`
                              : "0%"}
                          </div>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-slate-200">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Coins</div>
                          <div className="text-base font-black text-slate-800">
                            {leaderboard[1].currentBalance.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => openAnswerSheet(leaderboard[1])}
                        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs min-h-[38px]"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Inspect Answer Sheet</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 1ST PLACE (GOLD) - ELEVATED CENTER */}
                {leaderboard[0] && (
                  <div className="order-1 md:order-2 rounded-3xl bg-linear-to-b from-amber-400/20 via-amber-100/40 to-white border-2 border-amber-400 p-6 sm:p-7 shadow-xl ring-2 ring-amber-400/30 flex flex-col justify-between h-[410px] relative transition-transform hover:-translate-y-1">
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 fill-current" />
                      <span>👑 TOURNAMENT CHAMPION</span>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider border border-amber-300">
                          🥇 1st Place
                        </span>
                        <span className="font-mono text-sm text-amber-700 font-black">#1</span>
                      </div>

                      <div>
                        <h3 className="text-2xl sm:text-3xl font-black text-amber-950 truncate">
                          {leaderboard[0].teamName}
                        </h3>
                        <div className="text-xs text-amber-800 font-mono mt-0.5">
                          Squad Code: {leaderboard[0].teamCode}
                        </div>
                      </div>

                      {leaderboard[0].members && leaderboard[0].members.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {leaderboard[0].members.map((m, idx) => (
                            <span
                              key={idx}
                              className="text-xs font-bold text-amber-950 bg-white/90 px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 pt-4 border-t border-amber-200/80">
                      <div className="grid grid-cols-3 gap-2 text-center font-mono">
                        <div className="p-2.5 rounded-xl bg-white border border-amber-200 shadow-2xs">
                          <div className="text-[10px] text-amber-600 font-bold uppercase">Points</div>
                          <div className="text-lg font-black text-amber-900">
                            {leaderboard[0].score.toLocaleString()}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-amber-200 shadow-2xs">
                          <div className="text-[10px] text-amber-600 font-bold uppercase">Accuracy</div>
                          <div className="text-lg font-black text-amber-900">
                            {leaderboard[0].attemptedQuestions > 0
                              ? `${Math.round((leaderboard[0].correctAnswers / leaderboard[0].attemptedQuestions) * 100)}%`
                              : "0%"}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-amber-200 shadow-2xs">
                          <div className="text-[10px] text-amber-600 font-bold uppercase">Coins</div>
                          <div className="text-lg font-black text-amber-900">
                            {leaderboard[0].currentBalance.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => openAnswerSheet(leaderboard[0])}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-md min-h-[42px]"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Inspect Champion Answer Sheet</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 3RD PLACE (BRONZE) */}
                {leaderboard[2] && (
                  <div className="order-3 md:order-3 rounded-3xl bg-linear-to-b from-amber-700/10 via-orange-100/30 to-white border-2 border-amber-600/30 p-5 sm:p-6 shadow-md flex flex-col justify-between h-[370px] relative transition-transform hover:-translate-y-1">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black uppercase tracking-wider border border-amber-300 flex items-center gap-1.5">
                          <Medal className="w-3.5 h-3.5 text-amber-700" />
                          <span>🥉 3rd Place • 2nd Runner Up</span>
                        </span>
                        <span className="font-mono text-xs text-amber-800 font-bold">
                          #{leaderboard[2].rank}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-amber-950 truncate">
                          {leaderboard[2].teamName}
                        </h3>
                        <div className="text-xs text-amber-800/80 font-mono mt-0.5">
                          {leaderboard[2].teamCode}
                        </div>
                      </div>

                      {leaderboard[2].members && leaderboard[2].members.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {leaderboard[2].members.map((m, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] font-semibold text-amber-900 bg-white px-2 py-0.5 rounded-md border border-amber-200 shadow-2xs"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 pt-4 border-t border-amber-200/60">
                      <div className="grid grid-cols-3 gap-2 text-center font-mono">
                        <div className="p-2 rounded-xl bg-white border border-slate-200">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Score</div>
                          <div className="text-base font-black text-slate-900">
                            {leaderboard[2].score.toLocaleString()}
                          </div>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-slate-200">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Accuracy</div>
                          <div className="text-base font-black text-slate-800">
                            {leaderboard[2].attemptedQuestions > 0
                              ? `${Math.round((leaderboard[2].correctAnswers / leaderboard[2].attemptedQuestions) * 100)}%`
                              : "0%"}
                          </div>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-slate-200">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Coins</div>
                          <div className="text-base font-black text-slate-800">
                            {leaderboard[2].currentBalance.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => openAnswerSheet(leaderboard[2])}
                        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs min-h-[38px]"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Inspect Answer Sheet</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FULL TOURNAMENT STANDINGS (RANKS 4+) */}
            {leaderboard.length > 3 && (
              <div className="space-y-3 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                    Tournament Finalists Standings
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    {leaderboard.length} Squads Verified
                  </span>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-600">
                          <th className="py-3.5 px-5">Rank</th>
                          <th className="py-3.5 px-5">Squad</th>
                          <th className="py-3.5 px-5 text-center">Score</th>
                          <th className="py-3.5 px-5 text-center">Accuracy</th>
                          <th className="py-3.5 px-5 text-right">Coins</th>
                          <th className="py-3.5 px-5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {leaderboard.slice(3).map((entry) => (
                          <tr key={entry.teamId} className="hover:bg-slate-50/70 transition">
                            <td className="py-3.5 px-5 font-mono text-base font-black text-slate-600">
                              #{entry.rank}
                            </td>
                            <td className="py-3.5 px-5">
                              <div className="font-bold text-slate-900">{entry.teamName}</div>
                              <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                                <span className="text-xs text-slate-400 font-mono">{entry.teamCode}</span>
                                {entry.members && entry.members.length > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                    <Users className="w-2.5 h-2.5 text-slate-500" />
                                    {entry.members.join(", ")}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-5 text-center font-mono font-bold text-blue-600">
                              {entry.score.toLocaleString()} pts
                            </td>
                            <td className="py-3.5 px-5 text-center text-xs text-slate-600">
                              {entry.correctAnswers}/{entry.attemptedQuestions} (
                              {entry.attemptedQuestions > 0
                                ? Math.round((entry.correctAnswers / entry.attemptedQuestions) * 100)
                                : 0}
                              %)
                            </td>
                            <td className="py-3.5 px-5 text-right font-mono font-semibold text-slate-800">
                              💰 {entry.currentBalance.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <button
                                onClick={() => openAnswerSheet(entry)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-slate-700 text-xs font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Answer Sheet</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* ANSWER SHEET INSPECTION MODAL */}
      {/* ========================================================= */}
      {selectedTeamForSheet && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in"
          onClick={() => setSelectedTeamForSheet(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">
                      {selectedTeamForSheet.teamName}
                    </h3>
                    <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                      {selectedTeamForSheet.teamCode}
                    </span>
                  </div>
                  {selectedTeamForSheet.members && selectedTeamForSheet.members.length > 0 && (
                    <p className="text-xs text-slate-500 font-medium">
                      Squad: {selectedTeamForSheet.members.join(", ")}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedTeamForSheet(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scorecard Summary Stats Bar */}
            {answerSheetData && (
              <div className="bg-white border-b border-slate-200 px-4 sm:px-5 py-3 grid grid-cols-2 sm:grid-cols-6 gap-2 text-center font-mono text-xs shrink-0">
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="text-[10px] text-blue-600 font-bold uppercase">Points</div>
                  <div className="text-base font-black text-blue-900">
                    {answerSheetData.summary.totalPoints.toLocaleString()}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[10px] text-emerald-600 font-bold uppercase">Correct</div>
                  <div className="text-base font-black text-emerald-900">
                    {answerSheetData.summary.correct}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-red-50 border border-red-200">
                  <div className="text-[10px] text-red-600 font-bold uppercase">Wrong</div>
                  <div className="text-base font-black text-red-900">
                    {answerSheetData.summary.incorrect}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="text-[10px] text-amber-600 font-bold uppercase">Passed</div>
                  <div className="text-base font-black text-amber-900">
                    {answerSheetData.summary.passed}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Accuracy</div>
                  <div className="text-base font-black text-slate-900">
                    {answerSheetData.summary.accuracyPercent}%
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Coins</div>
                  <div className="text-base font-black text-slate-900">
                    💰 {answerSheetData.summary.currentBalance.toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* Filter Tabs */}
            {answerSheetData && (
              <div className="px-4 sm:px-5 py-2 border-b border-slate-200 bg-slate-50/50 flex items-center gap-1.5 shrink-0 overflow-x-auto">
                <span className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter:</span>
                </span>
                {[
                  { key: "ALL", label: `All (${answerSheetData.items.length})` },
                  { key: "CORRECT", label: `Correct (${answerSheetData.summary.correct})` },
                  { key: "INCORRECT", label: `Wrong (${answerSheetData.summary.incorrect})` },
                  { key: "PASSED", label: `Passed (${answerSheetData.summary.passed})` },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setSheetFilter(f.key as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      sheetFilter === f.key
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {/* Modal Body / Questions List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {sheetLoading && (
                <div className="py-16 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">
                    Retrieving full 40-question scorecard...
                  </p>
                </div>
              )}

              {sheetError && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-center text-xs space-y-2">
                  <p className="font-bold">{sheetError}</p>
                  <button
                    onClick={() => openAnswerSheet(selectedTeamForSheet)}
                    className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold"
                  >
                    Retry
                  </button>
                </div>
              )}

              {answerSheetData && (
                <div className="space-y-3.5">
                  {answerSheetData.items
                    .filter((item: any) => {
                      if (sheetFilter === "CORRECT") return item.isCorrect === true;
                      if (sheetFilter === "INCORRECT") return item.isCorrect === false;
                      if (sheetFilter === "PASSED") return item.isPassed === true;
                      return true;
                    })
                    .map((item: any) => {
                      return (
                        <div
                          key={item.questionId || item.orderIndex}
                          className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3"
                        >
                          {/* Question Header & Verdict Tag */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-md bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                                Q{item.orderIndex + 1}
                              </span>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {item.category}
                              </span>
                            </div>

                            {/* Verdict Pill */}
                            <div>
                              {item.isPassed ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs">
                                  ⚡ Bull&apos;s Pass (Skipped)
                                </span>
                              ) : item.isCorrect === true ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Correct (+{item.pointsAwarded})</span>
                                </span>
                              ) : item.isCorrect === false ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 font-bold text-xs flex items-center gap-1">
                                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                                  <span>Wrong ({item.pointsAwarded})</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-bold text-xs">
                                  Unanswered (0 pts)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Question Text */}
                          <p className="text-sm font-bold text-slate-900 leading-snug">
                            {item.questionText}
                          </p>

                          {/* Clue thumbnail if available */}
                          {item.imageUrl && (
                            <div className="h-28 rounded-xl overflow-hidden border border-slate-200 max-w-xs bg-slate-100">
                              <img src={item.imageUrl} alt="Clue" className="w-full h-full object-cover" />
                            </div>
                          )}

                          {/* 4 Options Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {["A", "B", "C", "D"].map((key) => {
                              const optText = item.options[key];
                              const wasSelected = item.teamOption === key;
                              const isCorrectOpt = item.correctOption === key;

                              let optStyle = "bg-white border-slate-200 text-slate-700";
                              if (wasSelected) {
                                if (item.isCorrect) {
                                  optStyle = "bg-emerald-50 border-2 border-emerald-600 text-emerald-950 font-bold";
                                } else {
                                  optStyle = "bg-red-50 border-2 border-red-500 text-red-950 font-bold";
                                }
                              } else if (isCorrectOpt) {
                                optStyle = "bg-emerald-50/60 border border-emerald-400 text-emerald-900 font-semibold";
                              }

                              return (
                                <div
                                  key={key}
                                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${optStyle}`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] bg-slate-100 shrink-0">
                                      {key}
                                    </span>
                                    <span className="truncate">{optText}</span>
                                  </div>

                                  {wasSelected && (
                                    <span className="text-[10px] font-bold uppercase shrink-0 px-1.5 py-0.5 rounded bg-white border">
                                      {item.isCorrect ? "Picked ✓" : "Picked ✗"}
                                    </span>
                                  )}
                                  {!wasSelected && isCorrectOpt && (
                                    <span className="text-[10px] font-bold text-emerald-700 uppercase shrink-0">
                                      Correct
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Lifelines Used & Explanation */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.lifelinesUsed && item.lifelinesUsed.length > 0 && (
                                <>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                                    Lifelines:
                                  </span>
                                  {item.lifelinesUsed.map((lt: string) => (
                                    <span
                                      key={lt}
                                      className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-mono text-[10px] font-bold"
                                    >
                                      {lt.replace("_", " ")}
                                    </span>
                                  ))}
                                </>
                              )}
                              {item.timeTakenSeconds && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  • Time: {item.timeTakenSeconds}s
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Solution Explanation */}
                          {item.explanation && (
                            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 text-xs">
                              <span className="font-bold text-emerald-800 mr-1.5">Solution:</span>
                              <span>{item.explanation}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-mono">
                Verified Championship Audit Log
              </span>
              <button
                onClick={() => setSelectedTeamForSheet(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Close Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-slate-200/80 bg-white py-3 px-6 flex items-center justify-between text-xs text-slate-500">
        <span>THE BIG BULL Live Presentation Engine</span>
        <span>Synced with Host Controller • 5-Min Timer</span>
      </footer>
    </div>
  );
}
