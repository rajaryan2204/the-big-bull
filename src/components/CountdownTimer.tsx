"use client";
import React from "react";
import { Clock, Pause } from "lucide-react";

interface CountdownTimerProps {
  remainingSeconds: number;
  totalSeconds?: number;
  isPaused?: boolean;
  size?: "sm" | "md" | "lg" | "board";
  className?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  remainingSeconds,
  totalSeconds = 300,
  isPaused = false,
  size = "md",
  className = "",
}) => {
  const mins = Math.floor(Math.max(0, remainingSeconds) / 60);
  const secs = Math.max(0, remainingSeconds) % 60;
  const formatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  const progress = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0;

  // Determine alert level
  let colorClasses = "text-amber-400 border-amber-500/30 bg-amber-500/5";
  let pulseClass = "";
  if (remainingSeconds <= 30 && remainingSeconds > 0) {
    colorClasses = "text-red-500 border-red-500/40 bg-red-500/10";
    pulseClass = "animate-pulse";
  } else if (remainingSeconds <= 60 && remainingSeconds > 0) {
    colorClasses = "text-orange-400 border-orange-500/30 bg-orange-500/10";
  }

  if (size === "board") {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <div
          className={`flex items-center gap-4 px-8 py-4 rounded-3xl border-2 backdrop-blur-md shadow-2xl transition-all duration-300 ${colorClasses} ${pulseClass}`}
        >
          {isPaused ? (
            <Pause className="w-12 h-12 text-amber-400 animate-pulse" />
          ) : (
            <Clock className="w-12 h-12" />
          )}
          <span className="font-mono text-7xl font-black tracking-tight">{formatted}</span>
        </div>
        {isPaused && (
          <span className="mt-2 text-sm uppercase tracking-widest text-amber-400 font-bold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            TIMER FROZEN (PAUSED)
          </span>
        )}
      </div>
    );
  }

  if (size === "lg") {
    return (
      <div className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border ${colorClasses} ${className}`}>
        <Clock className="w-6 h-6" />
        <span className="font-mono text-3xl font-black">{formatted}</span>
        {isPaused && <span className="text-xs uppercase font-bold ml-1 text-amber-400">(PAUSED)</span>}
      </div>
    );
  }

  if (size === "sm") {
    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${colorClasses} ${className}`}>
        <Clock className="w-3.5 h-3.5" />
        <span>{formatted}</span>
      </div>
    );
  }

  // Default "md" for mobile team interface
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${colorClasses} ${pulseClass} ${className}`}>
      {isPaused ? <Pause className="w-5 h-5 text-amber-400" /> : <Clock className="w-5 h-5" />}
      <span className="font-mono text-2xl font-bold tracking-tight">{formatted}</span>
      {isPaused && <span className="text-[10px] font-semibold uppercase text-amber-400">PAUSED</span>}
    </div>
  );
};
