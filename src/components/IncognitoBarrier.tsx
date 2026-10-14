"use client";
import React, { useState } from "react";
import {
  ShieldAlert,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Laptop,
  Smartphone,
  Flame,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { soundFx } from "@/src/lib/soundFx";

interface IncognitoBarrierProps {
  browserName?: string;
  onRecheck?: () => void;
  isChecking?: boolean;
}

export function IncognitoBarrier({
  browserName = "Browser",
  onRecheck,
  isChecking = false,
}: IncognitoBarrierProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      soundFx.playLockSound();
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#030305] text-white flex flex-col justify-between p-4 sm:p-6 overflow-y-auto font-sans select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-[#1f1f2e] pb-3 font-mono text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-sm animate-pulse" />
          <span className="font-bold text-white tracking-widest uppercase">THE BIG BULL</span>
          <span className="text-neutral-600">//</span>
          <span className="text-red-400 font-bold">INVIGILATION SECURITY GATE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-red-950/60 border border-red-500/50 text-red-300 font-bold text-[10px] tracking-wider uppercase">
            BARRIER ACTIVE
          </span>
          <span className="text-[10px] text-neutral-400 hidden sm:inline">
            DETECTED: {browserName.toUpperCase()}
          </span>
        </div>
      </header>

      {/* Main Center Warning & Instructions */}
      <main className="max-w-xl mx-auto w-full my-auto py-6 space-y-6">
        {/* Urgent Warning Shield Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-[#140a0c] to-[#0a0709] border-2 border-red-500/60 shadow-2xl shadow-red-950/40 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-400 shadow-inner">
            <ShieldAlert className="w-9 h-9 animate-bounce" />
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-red-400 font-extrabold flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              INCOGNITO / PRIVATE WINDOW REQUIRED
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-mono uppercase tracking-tight mt-1">
              NORMAL BROWSING IS RESTRICTED
            </h1>
          </div>

          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans max-w-lg mx-auto">
            To ensure absolute integrity and block all third-party AI extensions, autofill plugins, and unauthorized caching,
            <span className="text-amber-400 font-bold"> THE BIG BULL Arena strictly enforces Private / Incognito browsing.</span>
          </p>
        </div>

        {/* Quick Instructions per Platform */}
        <div className="space-y-3 bg-[#08080d] border border-[#1b1b28] p-5 rounded-xl">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-neutral-300">
            <span className="uppercase text-amber-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              HOW TO OPEN IN PRIVATE MODE
            </span>
            <span className="text-[11px] text-neutral-400 font-normal">Step-by-step</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Chrome / Edge / Brave */}
            <div className="p-3.5 rounded-lg bg-[#0e0e16] border border-[#222232] space-y-1.5">
              <div className="font-bold text-white flex items-center gap-1.5 font-mono">
                <Laptop className="w-3.5 h-3.5 text-amber-400" />
                <span>Chrome / Edge / Brave</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Press <kbd className="px-1.5 py-0.5 rounded bg-[#1c1c28] text-amber-300 font-mono font-bold border border-[#333348]">Ctrl+Shift+N</kbd> (Windows)
                or <kbd className="px-1.5 py-0.5 rounded bg-[#1c1c28] text-amber-300 font-mono font-bold border border-[#333348]">Cmd+Shift+N</kbd> (Mac).
              </p>
            </div>

            {/* Safari & Apple */}
            <div className="p-3.5 rounded-lg bg-[#0e0e16] border border-[#222232] space-y-1.5">
              <div className="font-bold text-white flex items-center gap-1.5 font-mono">
                <Laptop className="w-3.5 h-3.5 text-sky-400" />
                <span>Apple Safari</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Press <kbd className="px-1.5 py-0.5 rounded bg-[#1c1c28] text-sky-300 font-mono font-bold border border-[#333348]">Cmd+Shift+N</kbd>, or tap
                Tabs icon <span className="font-bold text-white">❐</span> → <span className="text-sky-300 font-bold">&quot;Private&quot;</span>.
              </p>
            </div>

            {/* Firefox */}
            <div className="p-3.5 rounded-lg bg-[#0e0e16] border border-[#222232] space-y-1.5">
              <div className="font-bold text-white flex items-center gap-1.5 font-mono">
                <Laptop className="w-3.5 h-3.5 text-orange-400" />
                <span>Mozilla Firefox</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Press <kbd className="px-1.5 py-0.5 rounded bg-[#1c1c28] text-orange-300 font-mono font-bold border border-[#333348]">Ctrl+Shift+P</kbd> or
                Menu ☰ → <span className="text-orange-300 font-bold">&quot;New Private Window&quot;</span>.
              </p>
            </div>

            {/* Mobile Devices */}
            <div className="p-3.5 rounded-lg bg-[#0e0e16] border border-[#222232] space-y-1.5">
              <div className="font-bold text-white flex items-center gap-1.5 font-mono">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mobile Phones</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Tap Menu (Three Dots ︙ or Tabs ❐) → <span className="text-emerald-300 font-bold">&quot;New Incognito / Private Tab&quot;</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Copy Link Button */}
            <button
              onClick={handleCopyLink}
              className="flex-1 py-3 px-4 rounded-xl bg-[#14141f] border border-[#272738] hover:border-amber-500/50 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">COPIED LINK TO CLIPBOARD!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>COPY TERMINAL URL</span>
                </>
              )}
            </button>

            {/* Re-Check Button */}
            {onRecheck && (
              <button
                onClick={onRecheck}
                disabled={isChecking}
                className="py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isChecking ? "animate-spin" : ""}`} />
                <span>{isChecking ? "SCANNING BROWSER..." : "RE-VERIFY WINDOW"}</span>
              </button>
            )}
          </div>

          <div className="text-center font-mono text-[11px] text-neutral-400">
            Open the link above in your Incognito window to enter the competition.
          </div>
        </div>
      </main>

      {/* Bottom Footer Note */}
      <footer className="border-t border-[#1a1a26] pt-3 text-center font-mono text-[10px] text-neutral-400">
        ADMIN PARDON NOTICE: If your device uses enterprise restrictions or guest profiles, contact the Arena Admin to pardon your station.
      </footer>
    </div>
  );
}
