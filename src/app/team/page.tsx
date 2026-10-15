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
  Sparkles,
  Info,
  X,
  Wallet,
  FileText,
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
import { BullLogo } from "@/src/components/BullLogo";
import { CoinShowerModal } from "@/src/components/CoinShowerModal";
import { TournamentRulesModal } from "@/src/components/TournamentRulesModal";
import { EventCountdown } from "@/src/components/EventCountdown";

export default function TeamTerminalPage() {
  const router = useRouter();
  const [team, setTeam] = useState<TeamPublic | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [privateState, setPrivateState] = useState<TeamPrivateState | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(120);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [lockingIn, setLockingIn] = useState(false);
  const [connected, setConnected] = useState<boolean>(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Terms & Conditions Agreement & Coin Crediting State
  const [termsAgreed, setTermsAgreed] = useState<boolean>(false);
  const [isCreditingCoins, setIsCreditingCoins] = useState<boolean>(false);
  const [coinCounter, setCoinCounter] = useState<number>(0);
  const [hasPreviouslyAcceptedTerms, setHasPreviouslyAcceptedTerms] = useState<boolean>(false);
  const [showRulesInfoModal, setShowRulesInfoModal] = useState<boolean>(false);

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
  const [showClueModal, setShowClueModal] = useState<boolean>(false);

  const socketRef = useRef<any>(null);
  const lastIncidentTimeRef = useRef<number>(0);

  // 1. Initial Authentication Check
  useEffect(() => {
    fetch("/api/auth/team/me", { cache: "no-store" })
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
          const disq = !!data.team.isDisqualified || (data.team.strikesCount || 0) >= 3;
          setIsDisqualified(disq);
          if (data.privateState) {
            setPrivateState(data.privateState);
            if (data.privateState.currentAnswer) {
              setSelectedOption(data.privateState.currentAnswer.selectedOption);
            }
          }
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
      const disq = !!pState.team.isDisqualified || sCount >= 3;
      setIsDisqualified(disq);
      if (disq) {
        setLockdownActive(false);
      }
      if (pState.currentAnswer) {
        setSelectedOption(pState.currentAnswer.selectedOption);
      }
    });

    socket.on("team:strike_update", (data: { strikesCount: number; isDisqualified: boolean; reason: string }) => {
      setStrikes(data.strikesCount);
      const disq = data.isDisqualified || data.strikesCount >= 3;
      setIsDisqualified(disq);
      if (disq) {
        setLockdownActive(false);
      } else {
        setLockdownActive(true);
      }
      soundFx.playStrikeAlarm();
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
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
      if (now - lastIncidentTimeRef.current < 2500) return;
      lastIncidentTimeRef.current = now;

      // Immediate local strike increment for instant visual feedback
      setStrikes((prev) => {
        const next = prev + 1;
        if (next >= 3) {
          setIsDisqualified(true);
          setLockdownActive(false);
        } else {
          setLockdownActive(true);
        }
        return next;
      });

      soundFx.playStrikeAlarm();
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([300, 100, 300]);
      }

      setLockdownReason(reason);

      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("team:record_strike", { reason });
        socketRef.current.emit("team:security_incident", { reason });
      }

      fetch("/api/team/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "record_strike", reason, payload: { reason } }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && typeof data.strikesCount === "number") {
            setStrikes(data.strikesCount);
            if (data.isDisqualified || data.strikesCount >= 3) {
              setIsDisqualified(true);
              setLockdownActive(false);
            }
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
      if (!document.hasFocus() || document.hidden) {
        triggerSecurityStrike("Lost Browser Window Focus");
      }
    };

    const handleFullscreenChange = () => {
      const active = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(active);
      const supportsFullscreen = typeof document !== "undefined" && !!(
        document.fullscreenEnabled ||
        (document as any).webkitFullscreenEnabled ||
        (document as any).mozFullScreenEnabled ||
        (document as any).msFullscreenEnabled
      );
      if (supportsFullscreen && !active && hasEnteredTerminal && !isDisqualified) {
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

  // Reset selectedOption and answer state when moving to a new question
  const currentQId = gameState?.currentQuestion?.id;
  const prevQIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentQId && currentQId !== prevQIdRef.current) {
      prevQIdRef.current = currentQId;
      setSelectedOption(null);
      setPrivateState((prev) =>
        prev
          ? {
              ...prev,
              currentAnswer: null,
              hasPassed: false,
            }
          : null
      );
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
        const res = await fetch("/api/game/state", { cache: "no-store" });
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

  // Periodic private team state sync (strikes, disqualification, balance)
  useEffect(() => {
    const fetchTeamMe = async () => {
      try {
        const res = await fetch("/api/auth/team/me", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.team) {
            setTeam(data.team);
            setStrikes(data.team.strikesCount || 0);
            const disq = !!data.team.isDisqualified || (data.team.strikesCount || 0) >= 3;
            setIsDisqualified(disq);
            if (disq) {
              setLockdownActive(false);
            }
            if (data.privateState) {
              setPrivateState(data.privateState);
              if (data.privateState.currentAnswer) {
                setSelectedOption(data.privateState.currentAnswer.selectedOption);
              }
            }
          }
        }
      } catch {}
    };

    fetchTeamMe();
    const teamInterval = setInterval(fetchTeamMe, 1500);
    return () => clearInterval(teamInterval);
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
    } catch {
      // In iOS or unsupported webviews, allow entering terminal
    } finally {
      setHasEnteredTerminal(true);
      setLockdownActive(false);
    }
  };

  // Check previously accepted terms on team load
  useEffect(() => {
    if (team?.teamCode) {
      const accepted = sessionStorage.getItem(`bigbull_terms_accepted_${team.teamCode}`);
      if (accepted === "true") {
        setHasPreviouslyAcceptedTerms(true);
        setTermsAgreed(true);
      }
    }
  }, [team?.teamCode]);

  // Handle Claiming 5,000 Coins with Animation & Fanfare
  const handleClaimCoinsAndEnter = () => {
    if (!termsAgreed) return;
    setIsCreditingCoins(true);
    soundFx.playCoinShower();

    const startTime = Date.now();
    const duration = 2200;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutExpo
      const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(easeOut * 5000);
      setCoinCounter(current);

      if (progress >= 1) {
        clearInterval(interval);
        setCoinCounter(5000);
        if (team?.teamCode) {
          sessionStorage.setItem(`bigbull_terms_accepted_${team.teamCode}`, "true");
        }
        setHasPreviouslyAcceptedTerms(true);
        setTimeout(async () => {
          setIsCreditingCoins(false);
          await enterFullscreen();
        }, 700);
      }
    }, 30);
  };

  // Submit Answer with Immediate Verification & Sound
  const submitAnswer = async (option: string) => {
    if (!gameState?.currentQuestion || lockingIn) return;
    setLockingIn(true);
    setConfirmModal(null);
    soundFx.playLockSound();

    const timeTaken = Math.max(0, (gameState.currentQuestion.durationSeconds || 120) - remainingSeconds);

    const applyVerdict = (payload: any) => {
      const isCorrect = payload?.isCorrect ?? payload?.answer?.isCorrect;
      const correctOption = payload?.correctOption ?? payload?.answer?.correctOption;
      const explanation = payload?.explanation ?? payload?.answer?.explanation;
      const pointsAwarded = payload?.answer?.pointsAwarded ?? (isCorrect ? 1 : 0);

      setSelectedOption(option);
      setPrivateState((prev) => ({
        team: prev?.team || team || ({} as any),
        currentAnswer: {
          ...(payload?.answer || {}),
          id: payload?.answer?.id || `ans-${Date.now()}`,
          teamId: team?.id || "",
          selectedOption: option,
          isLocked: true,
          isCorrect,
          correctOption,
          explanation,
          pointsAwarded,
          submittedAt: payload?.answer?.submittedAt || new Date().toISOString(),
        },
        lifelines: prev?.lifelines || ({} as any),
        hasPassed: prev?.hasPassed || false,
        suspiciousFlagCount: prev?.suspiciousFlagCount || 0,
      }));

      // Update local team stats immediately for instant feedback
      if (team) {
        setTeam((prev) => {
          if (!prev) return prev;
          const scoreDelta = isCorrect ? 1 : 0;
          return {
            ...prev,
            score: Math.max(0, (prev.score || 0) + scoreDelta),
            correctAnswers: isCorrect ? (prev.correctAnswers || 0) + 1 : prev.correctAnswers,
            attemptedQuestions: (prev.attemptedQuestions || 0) + 1,
          };
        });
      }

      if (isCorrect === true) {
        soundFx.playRewardChime();
      } else if (isCorrect === false) {
        soundFx.playStrikeAlarm();
      }
    };

    let socketSuccess = false;
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(
        "team:submit_answer",
        { selectedOption: option, timeTakenSeconds: timeTaken },
        (res: any) => {
          if (res?.success) {
            socketSuccess = true;
            applyVerdict(res);
          }
        }
      );
    }

    try {
      const res = await fetch("/api/team/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_answer",
          selectedOption: option,
          timeTakenSeconds: timeTaken,
          payload: {
            gameQuestionId: gameState.currentQuestion.id,
            selectedOption: option,
            timeTakenSeconds: timeTaken,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok && !socketSuccess) {
        alert(data.error || "Submission failed.");
      } else if (data.success || data.answer) {
        applyVerdict(data);
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
          lifelineType: type,
          payload: { gameQuestionId: gameState.currentQuestion.id, lifelineType: type },
        }),
      });
      const data = await res.json();
      if (!res.ok && !socketSuccess) {
        alert(data.error || "Lifeline purchase failed.");
      } else if (data.lifeline || data.success) {
        soundFx.playCoinDing();
        if (team && data.newBalance !== undefined) {
          setTeam({ ...team, currentBalance: data.newBalance });
        }
        setPrivateState((prev) => {
          const currentLifelines = prev?.lifelines ? { ...prev.lifelines } : ({} as any);
          if (data.lifelines) {
            Object.assign(currentLifelines, data.lifelines);
          } else if (data.lifeline) {
            currentLifelines[type] = data.lifeline;
          }
          return {
            team: prev?.team || team || ({} as any),
            currentAnswer: prev?.currentAnswer || null,
            lifelines: currentLifelines,
            hasPassed: prev?.hasPassed || data.hasPassed || type === "BULLS_PASS",
            suspiciousFlagCount: prev?.suspiciousFlagCount || 0,
          };
        });
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
        onBypass={() => setIsIncognito(true)}
        isChecking={checkingIncognito}
      />
    );
  }

  // ==========================================
  // VIEW: PERMANENT DISQUALIFICATION SCREEN
  // ==========================================
  if (isDisqualified) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-5 font-sans select-none">
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-lg">
          <XCircle className="w-10 h-10" />
        </div>

        <div className="space-y-1.5 max-w-md w-full bg-white p-6 rounded-2xl shadow-xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
            Disqualified • Exam Terminated
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight pt-2">
            Terminal Locked
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            Team <strong className="text-slate-900">{team?.teamCode}</strong> exceeded the maximum limit of 3 security strikes.
          </p>

          <div className="p-3 my-2 rounded-xl bg-red-50 border border-red-200 text-center">
            <div className="flex items-center justify-center gap-3">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs bg-red-600 border border-red-600 text-white shadow-xs"
                >
                  #{s}
                </div>
              ))}
            </div>
            <div className="mt-1.5 text-[11px] font-semibold text-red-700">
              3 of 3 Security Violations Recorded
            </div>
          </div>



          <button
            onClick={handleLogout}
            className="w-full mt-2 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 font-semibold text-xs hover:bg-slate-100 cursor-pointer transition active:scale-[0.99]"
          >
            Exit Terminal
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: GATEWAY (TERMS & PROTOCOL OR FULLSCREEN RE-ENTRY)
  // ==========================================
  if (!hasEnteredTerminal) {
    if (!hasPreviouslyAcceptedTerms) {
      return (
        <div
          className="min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col justify-between p-3 sm:p-5 select-none font-sans relative"
          onContextMenu={(e) => e.preventDefault()}
        >
          {isCreditingCoins && (
            <CoinShowerModal
              teamName={team?.name || "Your Squad"}
              teamCode={team?.teamCode}
              counter={coinCounter}
            />
          )}

          {/* Top Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 max-w-lg mx-auto w-full">
            <div className="flex items-center gap-2">
              <BullLogo size="sm" showText={true} />
            </div>
            <div className="flex items-center gap-2">
              {requireIncognito && isIncognito && (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold flex items-center gap-1">
                  <Shield className="w-3 h-3 text-blue-600" />
                  Incognito Verified
                </span>
              )}
              <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {team?.teamCode}
              </span>
            </div>
          </div>

          {/* Main Terms & Lifelines Protocols Form */}
          <main className="max-w-lg mx-auto w-full my-auto py-3 space-y-3 sm:space-y-4">
            {/* Page Header */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-blue-600" />
                <span>Rules of Engagement & Lifelines Protocol</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                Competition Guidelines
              </h1>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Read the terms below to unlock your <strong className="text-blue-700">5,000 Coins</strong> starting capital and enter the live terminal.
              </p>
            </div>

            {/* Scrollable Terms & Lifelines Content Box */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-sm max-h-[52vh] sm:max-h-[56vh] overflow-y-auto space-y-3.5 text-xs">
              {/* 5,000 Coins Initial Grant Box */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Wallet className="w-4 h-4 text-yellow-300" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs sm:text-sm">
                    <span>5,000 Coins Starting Capital</span>
                    <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded-full font-bold">
                      Team Grant
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    Every squad is allocated <strong>5,000 Coins</strong> for tactical lifelines. Coins do not convert to points, but running out leaves you without assistance in decisive rounds.
                  </p>
                </div>
              </div>

              {/* 4 Lifelines Breakdown */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-blue-600" />
                  <span>The 4 Tactical Lifelines & Pricing</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Hint */}
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:border-blue-200 transition">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                        <span>BULL&apos;S HINT</span>
                      </span>
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                        500 Coins
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-600 leading-snug">
                      A useful hint related to the question will be provided to the team.
                    </p>
                  </div>

                  {/* Vision Boost */}
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:border-blue-200 transition">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>VISION BOOST</span>
                      </span>
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                        1,500 Coins
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-600 leading-snug">
                      An image or visual clue related to the question will be displayed to help the team.
                    </p>
                  </div>

                  {/* 50:50 */}
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:border-blue-200 transition">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>50-50 BLAST</span>
                      </span>
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                        2,000 Coins
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-600 leading-snug">
                      Two incorrect options will be eliminated, leaving only two options to choose from.
                    </p>
                  </div>

                  {/* Pass */}
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:border-blue-200 transition">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
                        <FastForward className="w-3.5 h-3.5 text-emerald-600" />
                        <span>BULL&apos;S PASS</span>
                      </span>
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                        2,500 Coins
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-600 leading-snug">
                      The team can skip the current question and move on to the next question.
                    </p>
                  </div>
                </div>
              </div>

              {/* Synchronized Clock & Rules */}
              <div className="space-y-1 pt-1.5 border-t border-slate-100 text-[11px]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Clock & Scoring Rules</span>
                </div>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5 pl-1">
                  <li><strong>2-Minute Live Clock (120s):</strong> Rounds last exactly 120 seconds synchronized across the SmartBoard and all devices.</li>
                  <li><strong>One-Lock Rule:</strong> Once an answer or pass is locked, it cannot be edited or retracted.</li>
                  <li><strong>Official Tie-Breaker Protocol:</strong> If total scores are equal: (1) Most Correct Answers, (2) Fewest Lifelines Used, (3) Highest Remaining Coins.</li>
                </ul>
              </div>

              {/* 3-Strike Rule */}
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-left space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-red-700 uppercase tracking-wider text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Strict Anti-Cheat & 3-Strike Disqualification</span>
                </div>
                <p className="text-slate-700 text-[11px] leading-relaxed">
                  Minimizing the browser, exiting fullscreen, or switching tabs logs an immediate Strike. <strong className="text-red-700 font-bold">Strike 3 = Permanent Disqualification</strong>.
                </p>
              </div>
            </div>

            {/* Checkbox Agreement */}
            <div
              onClick={() => setTermsAgreed(!termsAgreed)}
              className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${
                termsAgreed
                  ? "bg-blue-50/80 border-blue-400 text-blue-950"
                  : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              />
              <label className="text-[11.5px] font-semibold leading-relaxed cursor-pointer select-none">
                I have read, understood, and agreed to all Competition Rules, Security Protocols, and Lifeline Guidelines. Our team is ready to compete.
              </label>
            </div>

            {/* Claim 5,000 Coins Button */}
            <button
              disabled={!termsAgreed}
              onClick={handleClaimCoinsAndEnter}
              className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[48px] ${
                termsAgreed
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/25 active:scale-[0.99]"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Sparkles
                className={`w-4 h-4 ${termsAgreed ? "text-yellow-300 animate-spin" : "text-slate-400"}`}
                style={{ animationDuration: "3s" }}
              />
              <span>{termsAgreed ? "Agree & Claim 5,000 Coins Capital" : "Tick Agreement to Claim 5,000 Coins"}</span>
            </button>
          </main>

          <footer className="text-center text-[10px] text-slate-400 max-w-lg mx-auto w-full pt-1">
            The Big Bull • Secure Arena Protocol
          </footer>
        </div>
      );
    }

    // Previously accepted terms re-entry
    return (
      <div
        className="min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 select-none font-sans relative"
        onContextMenu={(e) => e.preventDefault()}
      >
        {isCreditingCoins && (
          <CoinShowerModal
            teamName={team?.name || "Your Squad"}
            teamCode={team?.teamCode}
            counter={coinCounter}
          />
        )}

        <div className="flex items-center justify-between border-b border-slate-200 pb-3 max-w-md mx-auto w-full">
          <div className="flex items-center gap-2">
            <BullLogo size="sm" showText={true} />
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

          <div className="space-y-2">
            <button
              onClick={enterFullscreen}
              className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-sm shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer min-h-[50px]"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Enter Fullscreen Terminal</span>
            </button>

            <button
              onClick={() => setHasPreviouslyAcceptedTerms(false)}
              className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs transition cursor-pointer"
            >
              Review Rules & Lifelines Guide
            </button>
          </div>
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
      {showRulesInfoModal && (
        <TournamentRulesModal
          isOpen={showRulesInfoModal}
          onClose={() => setShowRulesInfoModal(false)}
        />
      )}

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
                {(strikes === 0 || strikes === 1) && "Strike 1 of 3 issued. 2 warnings remaining."}
                {strikes === 2 && "Strike 2 of 3: FINAL WARNING before disqualification!"}
                {strikes >= 3 && "Maximum violations reached. Terminal locked."}
              </div>
            </div>

            <button
              onClick={enterFullscreen}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider shadow-sm transition flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Acknowledge Warning & Re-Enter Terminal</span>
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

          {/* Info Modal Button */}
          <button
            onClick={() => setShowRulesInfoModal(true)}
            className="p-1 rounded-md border border-slate-200 bg-slate-50 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
            title="View Rules & Lifelines Guide"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

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
          <div className="my-auto text-center p-4 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-blue-600 font-bold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                Arena Synchronized • Terminal Armed
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1.5">
                Waiting for Round 1
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 max-w-xs mx-auto leading-relaxed">
                Terminal is locked in secure exam mode. Host will launch the live round.
              </p>
            </div>

            {/* Live Event Countdown */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 my-2">
              <EventCountdown size="sm" showDateBadge={true} />
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

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowRulesInfoModal(true)}
                className="w-full py-2.5 px-3 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.99]"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>📜 Tournament Rules, Scoring Matrix & T&C</span>
              </button>
            </div>
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

                {/* Bull's Hint if unlocked */}
                {hintText && (
                  <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 text-xs flex items-start gap-2 animate-in fade-in">
                    <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="leading-snug">
                      <span className="font-bold text-blue-900">Bull&apos;s Hint: </span>
                      <span>{hintText}</span>
                    </div>
                  </div>
                )}

                {/* Vision Boost Clue if unlocked */}
                {visualClueUrl && (
                  <button
                    type="button"
                    onClick={() => setShowClueModal(true)}
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-purple-50 hover:bg-purple-100/80 border border-purple-200 text-purple-950 transition cursor-pointer text-left shrink-0 animate-in fade-in"
                  >
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-purple-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-purple-900 leading-tight">Vision Boost Clue Unlocked</div>
                        <div className="text-[10px] text-purple-600 font-medium">Tap to view full resolution diagram</div>
                      </div>
                    </div>
                    <div className="h-8 w-12 rounded-lg overflow-hidden border border-purple-300 shrink-0 bg-slate-900 shadow-xs">
                      <img src={visualClueUrl} alt="Clue" className="w-full h-full object-cover" />
                    </div>
                  </button>
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
                  const hasLockedEval = lockedAnswer && lockedAnswer.isCorrect !== undefined && lockedAnswer.isCorrect !== null;
                  const isLockedCorrect = hasLockedEval && lockedAnswer.isCorrect === true;
                  const isLockedIncorrect = hasLockedEval && lockedAnswer.isCorrect === false;
                  const isTargetCorrectOption = hasLockedEval && lockedAnswer.correctOption === opt.key;
                  const isRevealCorrect = isReveal && currentQ.correctOption === opt.key;

                  let style = "bg-white border-slate-200 text-slate-800 hover:border-blue-300 hover:bg-blue-50/20";
                  if (isEliminated) {
                    style = "bg-slate-100 border-slate-200 text-slate-400 line-through opacity-40 cursor-not-allowed";
                  } else if (hasLockedEval) {
                    if (isLocked) {
                      if (isLockedCorrect) {
                        style = "bg-emerald-600 border-emerald-600 text-white font-bold shadow-md";
                      } else {
                        style = "bg-red-600 border-red-600 text-white font-bold shadow-md";
                      }
                    } else if (isLockedIncorrect && isTargetCorrectOption) {
                      style = "bg-emerald-50 border-2 border-emerald-600 text-emerald-950 font-bold ring-1 ring-emerald-500/30";
                    } else {
                      style = "bg-slate-50 border-slate-200 text-slate-400 opacity-40";
                    }
                  } else if (isReveal) {
                    if (isRevealCorrect) {
                      style = "bg-emerald-600 border-emerald-600 text-white font-bold shadow-sm";
                    } else if (isLocked && !isRevealCorrect) {
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
                      disabled={isEliminated || !!lockedAnswer || gameStatus !== "QUESTION_ACTIVE" || remainingSeconds <= 0}
                      onClick={() => setSelectedOption(opt.key)}
                      className={`py-2 px-3 rounded-xl border text-left transition flex items-center justify-between text-xs font-sans min-h-[38px] active:scale-[0.99] cursor-pointer ${style}`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                            (hasLockedEval && isLocked) || (isReveal && isRevealCorrect)
                              ? "bg-white text-slate-900"
                              : (hasLockedEval && isLockedIncorrect && isTargetCorrectOption)
                              ? "bg-emerald-600 text-white"
                              : isLocked
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

                      {isEliminated && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase shrink-0 ml-1 bg-red-100/90 px-1.5 py-0.5 rounded">
                          <span>Eliminated</span>
                        </div>
                      )}

                      {hasLockedEval && isLocked && isLockedCorrect && (
                        <div className="flex items-center gap-1 text-[10px] font-black text-emerald-100 uppercase shrink-0 ml-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          <span>Correct ✓</span>
                        </div>
                      )}

                      {hasLockedEval && isLocked && isLockedIncorrect && (
                        <div className="flex items-center gap-1 text-[10px] font-black text-red-100 uppercase shrink-0 ml-1">
                          <XCircle className="w-3.5 h-3.5 text-white" />
                          <span>Incorrect ✗</span>
                        </div>
                      )}

                      {hasLockedEval && isLockedIncorrect && isTargetCorrectOption && (
                        <div className="flex items-center gap-1 text-[10px] font-black text-emerald-700 uppercase shrink-0 ml-1 bg-emerald-100 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Correct Answer</span>
                        </div>
                      )}

                      {!hasLockedEval && isLocked && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-100 uppercase shrink-0 ml-1">
                          <Lock className="w-3 h-3" />
                          <span>Locked</span>
                        </div>
                      )}

                      {isReveal && isRevealCorrect && !hasLockedEval && (
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
              {!lockedAnswer && gameStatus === "QUESTION_ACTIVE" && remainingSeconds > 0 && (
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

              {/* Round Time Expired Banner */}
              {!lockedAnswer && (gameStatus === "QUESTION_CLOSED" || (gameStatus === "QUESTION_ACTIVE" && remainingSeconds <= 0)) && (
                <div className="py-2.5 px-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-center gap-2 text-center shrink-0 animate-in fade-in">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                  <span>⏱️ Round Time Expired (120s) • Question Closed • Stand By</span>
                </div>
              )}

              {/* Immediate Verdict Banner */}
              {lockedAnswer && (
                <div className="shrink-0 space-y-1.5 animate-in fade-in duration-200">
                  {lockedAnswer.isCorrect === true ? (
                    <div className="py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs shadow-xs">
                      <div className="flex items-center justify-between font-bold">
                        <div className="flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Correct Answer!</span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                          Locked [{lockedAnswer.selectedOption}]
                        </span>
                      </div>
                      {lockedAnswer.explanation && (
                        <p className="text-[10px] text-emerald-900/90 font-medium mt-1 leading-snug">
                          <strong>Note:</strong> {lockedAnswer.explanation}
                        </p>
                      )}
                    </div>
                  ) : lockedAnswer.isCorrect === false ? (
                    <div className="py-2 px-3 rounded-xl bg-red-50 border border-red-300 text-red-950 text-xs shadow-xs">
                      <div className="flex items-center justify-between font-bold">
                        <div className="flex items-center gap-1.5 text-red-700">
                          <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>Incorrect Selection</span>
                        </div>
                        <span className="text-[10px] font-mono text-red-800 bg-red-100 px-1.5 py-0.5 rounded border border-red-200">
                          Correct: Option {lockedAnswer.correctOption || "—"}
                        </span>
                      </div>
                      {lockedAnswer.explanation && (
                        <p className="text-[10px] text-red-950/90 font-medium mt-1 leading-snug">
                          <strong>Note:</strong> {lockedAnswer.explanation}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="py-2 px-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Answer Locked: Option {lockedAnswer.selectedOption}</span>
                      </div>
                      <span className="text-[10px] text-blue-600 font-semibold">Verified</span>
                    </div>
                  )}
                </div>
              )}

              {/* Solution on Reveal (if not already shown in immediate verdict) */}
              {gameStatus === "ANSWER_REVEAL" && currentQ.explanation && !lockedAnswer?.explanation && (
                <div className="py-1.5 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px] flex items-center gap-1.5 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate"><strong>Solution:</strong> {currentQ.explanation}</span>
                </div>
              )}
            </div>
          )}

        {/* WHEN ANSWER LOCKED: LIVE SCORECARD SUMMARY (ZERO SCROLL) */}
        {gameStatus === "QUESTION_ACTIVE" && lockedAnswer && (
          <div className="pt-1.5 border-t border-slate-200 shrink-0">
            <div className="py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-600">
                Score: <strong className="text-blue-700">{(team?.score ?? 0).toLocaleString()} pts</strong>
              </span>
              <span className="text-slate-600">
                Accuracy: <strong className="text-emerald-700">{team?.correctAnswers ?? 0}</strong>/{team?.attemptedQuestions ?? 0}
              </span>
              <span className="text-slate-600">
                Coins: <strong className="text-amber-700">{(team?.currentBalance ?? 0).toLocaleString()} C</strong>
              </span>
            </div>
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

      {/* Vision Clue Full Image Modal */}
      {showClueModal && visualClueUrl && (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-in fade-in"
          onClick={() => setShowClueModal(false)}
        >
          <div
            className="bg-slate-950 border border-slate-700 rounded-2xl max-w-md w-full p-4 relative shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2.5 border-b border-slate-800">
              <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-purple-400" /> Vision Boost Diagram Clue
              </span>
              <button
                onClick={() => setShowClueModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="w-full mt-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center">
              <img src={visualClueUrl} alt="Vision Clue Diagram" className="w-full h-auto max-h-[60vh] object-contain" />
            </div>
            <button
              onClick={() => setShowClueModal(false)}
              className="mt-3.5 w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-md shadow-purple-600/30"
            >
              Done / Return to Combat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
