"use client";
import React, { useEffect, useState, useRef } from "react";
import { getSocketClient } from "@/src/lib/socketClient";
import { QRCodeView } from "@/src/components/QRCodeView";
import { soundFx } from "@/src/lib/soundFx";
import {
  Maximize2,
  Minimize2,
  Trophy,
  Users,
  CheckCircle2,
  Radio,
  Clock,
  Sparkles,
  Award,
  AlertTriangle,
  Flame,
  Volume2,
  VolumeX,
} from "lucide-react";
import { GameState, LeaderboardEntry } from "@/src/types";

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

  const prevStatusRef = useRef<string>("LOBBY");
  const prevSecondRef = useRef<number>(300);

  useEffect(() => {
    const socket = getSocketClient(null, "board");

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

  const status = gameState?.status || "LOBBY";
  const currentQ = gameState?.currentQuestion;

  // Trigger sound effects on stage transitions
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    if (prevStatus !== status) {
      if (status === "ANSWER_REVEAL") {
        soundFx.playRevealFanfare();
      } else if (status === "QUESTION_CLOSED") {
        soundFx.playTimeUpBuzzer();
      }
      prevStatusRef.current = status;
    }
  }, [status]);

  // Trigger countdown tick in final 10 seconds
  useEffect(() => {
    if (status === "QUESTION_ACTIVE" && !isPaused) {
      if (remainingSeconds <= 10 && remainingSeconds > 0 && remainingSeconds !== prevSecondRef.current) {
        soundFx.playTick(remainingSeconds <= 5);
        prevSecondRef.current = remainingSeconds;
      }
    }
  }, [remainingSeconds, status, isPaused]);

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

  const mins = Math.floor(Math.max(0, remainingSeconds) / 60);
  const secs = Math.max(0, remainingSeconds) % 60;
  const timerFormatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-[#030305] text-white flex flex-col justify-between select-none font-sans overflow-x-hidden">
      {/* Top Arena Broadcast Ticker Bar */}
      <header className="border-b border-[#14141e] bg-[#07070a] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
            <span className="uppercase tracking-widest">THE BIG BULL // ARENA SMART BROADCAST</span>
          </div>
          <span className="text-neutral-600 font-mono text-xs hidden sm:inline">//</span>
          <span className="text-neutral-400 font-mono text-xs hidden sm:inline">
            EVENT: {gameState?.title || "CHAMPIONSHIP ARENA"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Audio Mute/Unmute Toggle */}
          <button
            onClick={toggleMute}
            className={`p-1.5 rounded border transition cursor-pointer flex items-center gap-1.5 text-xs font-mono ${
              isMuted
                ? "border-red-500/40 bg-red-950/30 text-red-400"
                : "border-amber-500/40 bg-amber-950/20 text-amber-300"
            }`}
            title={isMuted ? "Unmute Arena Sound" : "Mute Arena Sound"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden md:inline">{isMuted ? "MUTED" : "AUDIO ON"}</span>
          </button>

          {/* Stage Status */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#0d0d14] border border-[#1f1f2e] font-mono text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                status === "QUESTION_ACTIVE"
                  ? "bg-red-500 animate-pulse"
                  : status === "QUESTION_PAUSED"
                  ? "bg-amber-400"
                  : "bg-emerald-400"
              }`}
            />
            <span className="font-bold text-white uppercase tracking-wider">{status.replace("_", " ")}</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded border border-[#222230] bg-[#0d0d14] hover:bg-[#161622] text-neutral-400 hover:text-white transition cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Presentation Stage */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full p-6 sm:p-10 flex flex-col justify-center">
        {/* LOBBY / READY VIEW */}
        {(status === "LOBBY" || status === "READY") && (
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 my-auto">
            <div className="space-y-6 max-w-2xl text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold uppercase tracking-widest">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>CHAMPIONSHIP ARENA OPEN</span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-black text-white uppercase font-mono tracking-tight leading-none">
                RULE THE <br />
                <span className="text-amber-400">BULL MARKET.</span>
              </h1>

              <p className="text-base text-neutral-300 font-mono leading-relaxed">
                8 Squads • 5,000 Coins Each • Strict 3-Strike Anti-Cheat Lockdown. Connect your phone terminals now.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-4 font-mono">
                <div className="p-4 rounded bg-[#09090f] border border-[#1a1a26]">
                  <div className="text-2xl font-black text-amber-400">
                    {gameState?.connectedTeamsCount || 0} / {gameState?.totalTeamsCount || 8}
                  </div>
                  <div className="text-[11px] text-neutral-400 uppercase mt-0.5">SQUADS INITIALIZED</div>
                </div>

                <div className="p-4 rounded bg-[#09090f] border border-[#1a1a26]">
                  <div className="text-2xl font-black text-white">
                    {gameState?.totalQuestions || 16}
                  </div>
                  <div className="text-[11px] text-neutral-400 uppercase mt-0.5">ROUNDS SCHEDULED</div>
                </div>
              </div>
            </div>

            {/* Dynamic QR Code Box */}
            <div className="bg-[#08080c] border border-amber-500/40 rounded-xl p-8 flex flex-col items-center text-center shadow-2xl">
              <QRCodeView size={240} />
              <div className="mt-4 font-mono text-[11px] text-neutral-400 max-w-xs">
                Scan with any phone camera on Wi-Fi to enter your team access code.
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
            <div className="flex flex-col gap-8 w-full my-auto">
              {/* Telemetry Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-[#181824] pb-6 font-mono">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded bg-amber-500 text-black font-black text-sm uppercase">
                    ROUND {(gameState?.currentQuestionIndex || 0) + 1} OF {gameState?.totalQuestions}
                  </span>
                  <span className="px-3 py-1 rounded bg-[#101018] border border-[#262638] text-xs font-bold text-neutral-300 uppercase">
                    {currentQ.question.category}
                  </span>
                  <span className="text-xs text-neutral-500 uppercase">
                    DIFFICULTY: {currentQ.question.difficulty}
                  </span>
                </div>

                {/* Massive Countdown Clock */}
                <div
                  className={`flex items-center gap-3 px-8 py-3 rounded-lg border-2 font-mono font-black text-5xl sm:text-6xl ${
                    remainingSeconds <= 30
                      ? "bg-red-950/60 border-red-500 text-red-500 animate-pulse"
                      : remainingSeconds <= 60
                      ? "bg-orange-950/40 border-orange-500 text-orange-400"
                      : "bg-[#0a0a10] border-amber-500/50 text-amber-400"
                  }`}
                >
                  <Clock className="w-10 h-10 shrink-0" />
                  <span>{timerFormatted}</span>
                  {isPaused && (
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded ml-2">
                      PAUSED
                    </span>
                  )}
                </div>
              </div>

              {/* Question Statement & Submission Counter */}
              <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
                <div className="flex-1 space-y-4">
                  <h2 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight font-sans tracking-tight">
                    {currentQ.question.text}
                  </h2>

                  {currentQ.question.imageUrl && (
                    <div className="rounded-lg overflow-hidden border border-[#222230] max-h-72 w-full max-w-xl bg-black">
                      <img
                        src={currentQ.question.imageUrl}
                        alt="Question Reference"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Response Gauge */}
                <div className="p-6 rounded-lg bg-[#08080d] border border-[#1e1e2c] flex flex-col items-center justify-center min-w-[240px] text-center font-mono">
                  <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest">
                    LOCKED SUBMISSIONS
                  </div>
                  <div className="text-4xl font-black text-amber-400 mt-1">
                    {answerCount.answeredCount} / {answerCount.totalCount || gameState?.totalTeamsCount || 8}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-2">
                    ANONYMOUS SERVER VERIFICATION
                  </div>
                </div>
              </div>

              {/* 4 Crisp High-Contrast Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 font-mono">
                {[
                  { key: "A", text: currentQ.question.optionA },
                  { key: "B", text: currentQ.question.optionB },
                  { key: "C", text: currentQ.question.optionC },
                  { key: "D", text: currentQ.question.optionD },
                ].map((opt) => {
                  const isReveal = status === "ANSWER_REVEAL";
                  const isCorrect =
                    isReveal && (currentQ.correctOption === opt.key || revealData?.correctOption === opt.key);

                  let cardStyle = "bg-[#09090f] border-[#1c1c28] text-neutral-200";
                  if (isReveal) {
                    if (isCorrect) {
                      cardStyle = "bg-emerald-950/80 border-emerald-400 text-white font-bold ring-2 ring-emerald-400";
                    } else {
                      cardStyle = "bg-[#060608] border-[#121218] text-neutral-700 opacity-40";
                    }
                  }

                  return (
                    <div
                      key={opt.key}
                      className={`p-6 rounded-lg border-2 flex items-center gap-5 transition-all ${cardStyle}`}
                    >
                      <div
                        className={`w-12 h-12 rounded flex items-center justify-center font-mono text-xl font-black shrink-0 ${
                          isCorrect
                            ? "bg-emerald-400 text-black"
                            : "bg-[#14141e] text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {opt.key}
                      </div>
                      <div className="text-xl sm:text-2xl font-sans font-semibold leading-snug">
                        {opt.text}
                      </div>
                      {isCorrect && (
                        <div className="ml-auto px-3 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 font-mono">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>CORRECT</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Solution Reveal Box */}
              {status === "ANSWER_REVEAL" && (
                <div className="p-6 rounded-lg bg-emerald-950/20 border border-emerald-500/40 text-emerald-100 flex items-start gap-4 animate-in fade-in">
                  <Sparkles className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-400">
                      SOLUTION DEBRIEF
                    </div>
                    <p className="mt-1 text-base text-neutral-200 font-sans leading-relaxed">
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
            <div className="text-center space-y-1 font-mono">
              <span className="text-xs text-amber-400 font-bold uppercase tracking-widest">
                ARENA LEADERBOARD
              </span>
              <h2 className="text-4xl font-black text-white uppercase">
                CURRENT CHAMPIONSHIP STANDINGS
              </h2>
            </div>

            <div className="bg-[#07070b] border border-[#1b1b26] rounded-lg overflow-hidden font-mono">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#181824] bg-[#0c0c12] text-xs font-bold uppercase text-amber-400">
                    <th className="py-4 px-6">Rank</th>
                    <th className="py-4 px-6">Squad</th>
                    <th className="py-4 px-6 text-center">Score</th>
                    <th className="py-4 px-6 text-center">Correct</th>
                    <th className="py-4 px-6 text-right">Coins</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#14141e]">
                  {leaderboard.map((entry, index) => (
                    <tr
                      key={entry.teamId}
                      className={index === 0 ? "bg-amber-500/10 font-bold" : "hover:bg-[#0c0c14]"}
                    >
                      <td className="py-4 px-6 font-mono text-lg font-black">#{entry.rank}</td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-white text-base font-sans">{entry.teamName}</div>
                        <div className="text-xs text-neutral-500 font-mono">{entry.teamCode}</div>
                      </td>
                      <td className="py-4 px-6 text-center text-lg font-black text-amber-400">
                        {entry.score.toLocaleString()} PTS
                      </td>
                      <td className="py-4 px-6 text-center text-neutral-300">
                        {entry.correctAnswers} / {entry.attemptedQuestions}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-amber-300">
                        💰 {entry.currentBalance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FINISHED VIEW */}
        {status === "FINISHED" && (
          <div className="max-w-2xl mx-auto w-full text-center space-y-6 my-auto font-mono">
            <Award className="w-16 h-16 text-amber-400 mx-auto" />
            <h1 className="text-4xl sm:text-6xl font-black text-white uppercase">
              CHAMPIONSHIP CONCLUDED
            </h1>
            {leaderboard.length > 0 && (
              <div className="p-8 rounded-lg bg-[#08080d] border-2 border-amber-500 space-y-4">
                <div className="text-xs text-amber-400 uppercase font-bold tracking-widest">
                  VICTORIOUS SQUAD
                </div>
                <div className="text-3xl font-black text-white font-sans">
                  {leaderboard[0].teamName}
                </div>
                <div className="text-sm text-neutral-400">{leaderboard[0].teamCode}</div>
                <div className="text-2xl font-black text-amber-400 pt-2 border-t border-[#181824]">
                  FINAL SCORE: {leaderboard[0].score.toLocaleString()} PTS
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Broadcast Footer Bar */}
      <footer className="border-t border-[#14141e] bg-[#07070a] px-6 py-2.5 flex items-center justify-between text-[11px] font-mono text-neutral-400">
        <span>THE BIG BULL ARENA BROADCAST // ZERO LATENCY</span>
        <span>SECURITY LOCKDOWN ENABLED</span>
      </footer>
    </div>
  );
}
