"use client";
import React, { useEffect, useState } from "react";
import { Clock, Calendar, Sparkles } from "lucide-react";

interface EventCountdownProps {
  targetDate?: string | Date;
  size?: "sm" | "md" | "lg";
  showDateBadge?: boolean;
  className?: string;
}

export const EVENT_TARGET_DATE_ISO = "2026-10-16T11:30:00+05:30";

export const EventCountdown: React.FC<EventCountdownProps> = ({
  targetDate = EVENT_TARGET_DATE_ISO,
  size = "md",
  showDateBadge = true,
  className = "",
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false,
  });

  useEffect(() => {
    const targetMs = new Date(targetDate).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = targetMs - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const pad = (n: number) => n.toString().padStart(2, "0");

  const isSmall = size === "sm";
  const isLarge = size === "lg";

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {showDateBadge && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-2.5 shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>Scheduled: 16 October 2026 • 11:30 AM IST</span>
        </div>
      )}

      {/* 4 Time Digit Cards */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2.5">
        {/* Days */}
        <div className={`flex flex-col items-center justify-center rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 shadow-2xs ${
          isSmall ? "w-13 py-1.5" : isLarge ? "w-20 sm:w-24 py-3 sm:py-4" : "w-15 sm:w-18 py-2 sm:py-2.5"
        }`}>
          <span className={`font-mono font-black text-slate-900 tracking-tight leading-none ${
            isSmall ? "text-lg" : isLarge ? "text-3xl sm:text-4xl text-blue-700" : "text-xl sm:text-2xl text-blue-600"
          }`}>
            {pad(timeLeft.days)}
          </span>
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
            Days
          </span>
        </div>

        <span className={`font-mono font-black text-slate-300 ${isSmall ? "text-sm" : isLarge ? "text-2xl" : "text-lg"}`}>:</span>

        {/* Hours */}
        <div className={`flex flex-col items-center justify-center rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 shadow-2xs ${
          isSmall ? "w-13 py-1.5" : isLarge ? "w-20 sm:w-24 py-3 sm:py-4" : "w-15 sm:w-18 py-2 sm:py-2.5"
        }`}>
          <span className={`font-mono font-black text-slate-900 tracking-tight leading-none ${
            isSmall ? "text-lg" : isLarge ? "text-3xl sm:text-4xl text-blue-700" : "text-xl sm:text-2xl text-blue-600"
          }`}>
            {pad(timeLeft.hours)}
          </span>
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
            Hours
          </span>
        </div>

        <span className={`font-mono font-black text-slate-300 ${isSmall ? "text-sm" : isLarge ? "text-2xl" : "text-lg"}`}>:</span>

        {/* Minutes */}
        <div className={`flex flex-col items-center justify-center rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 shadow-2xs ${
          isSmall ? "w-13 py-1.5" : isLarge ? "w-20 sm:w-24 py-3 sm:py-4" : "w-15 sm:w-18 py-2 sm:py-2.5"
        }`}>
          <span className={`font-mono font-black text-slate-900 tracking-tight leading-none ${
            isSmall ? "text-lg" : isLarge ? "text-3xl sm:text-4xl text-blue-700" : "text-xl sm:text-2xl text-blue-600"
          }`}>
            {pad(timeLeft.minutes)}
          </span>
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
            Mins
          </span>
        </div>

        <span className={`font-mono font-black text-slate-300 ${isSmall ? "text-sm" : isLarge ? "text-2xl" : "text-lg"}`}>:</span>

        {/* Seconds */}
        <div className={`flex flex-col items-center justify-center rounded-xl sm:rounded-2xl bg-white border border-blue-200/80 shadow-2xs ${
          isSmall ? "w-13 py-1.5" : isLarge ? "w-20 sm:w-24 py-3 sm:py-4" : "w-15 sm:w-18 py-2 sm:py-2.5"
        }`}>
          <span className={`font-mono font-black text-blue-600 tracking-tight leading-none ${
            isSmall ? "text-lg" : isLarge ? "text-3xl sm:text-4xl text-blue-600" : "text-xl sm:text-2xl text-blue-600"
          }`}>
            {pad(timeLeft.seconds)}
          </span>
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-blue-500 mt-1">
            Secs
          </span>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 mt-2 flex items-center justify-center gap-1">
        <Clock className="w-3 h-3 text-slate-400" />
        <span>{timeLeft.isPast ? "Event is live or awaiting host launch" : "Live Event Countdown • 11:30 AM Sharp"}</span>
      </p>
    </div>
  );
};
