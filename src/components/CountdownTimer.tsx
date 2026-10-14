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

  // Determine alert level
  let colorClasses = "text-blue-700 border-blue-200 bg-blue-50/80 shadow-xs";
  let pulseClass = "";
  if (remainingSeconds <= 15 && remainingSeconds > 0) {
    colorClasses = "text-red-700 border-red-300 bg-red-50 shadow-xs";
    pulseClass = "animate-pulse";
  } else if (remainingSeconds <= 45 && remainingSeconds > 0) {
    colorClasses = "text-amber-700 border-amber-300 bg-amber-50 shadow-xs";
  }

  if (size === "board") {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <div
          className={`flex items-center gap-4 px-8 py-4 rounded-3xl border-2 shadow-lg transition-all duration-300 ${colorClasses} ${pulseClass}`}
        >
          {isPaused ? (
            <Pause className="w-10 h-10 text-amber-600 animate-pulse" />
          ) : (
            <Clock className="w-10 h-10 text-blue-600" />
          )}
          <span className="font-mono text-6xl sm:text-7xl font-black tracking-tight">{formatted}</span>
        </div>
        {isPaused && (
          <span className="mt-2 text-xs uppercase tracking-widest text-amber-700 font-bold bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
            TIMER PAUSED
          </span>
        )}
      </div>
    );
  }

  if (size === "lg") {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border ${colorClasses} ${className}`}>
        <Clock className="w-5 h-5" />
        <span className="font-mono text-2xl font-black">{formatted}</span>
        {isPaused && <span className="text-xs uppercase font-bold text-amber-700 ml-1">(PAUSED)</span>}
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
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-bold ${colorClasses} ${pulseClass} ${className}`}>
      {isPaused ? <Pause className="w-4 h-4 text-amber-600" /> : <Clock className="w-4 h-4" />}
      <span className="text-base sm:text-lg tracking-tight">{formatted}</span>
      {isPaused && <span className="text-[10px] uppercase font-semibold text-amber-700">PAUSED</span>}
    </div>
  );
};
