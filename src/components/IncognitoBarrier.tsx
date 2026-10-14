"use client";
import React, { useState } from "react";
import {
  ShieldAlert,
  Copy,
  Check,
  RefreshCw,
  Laptop,
  Smartphone,
  Lock,
  ShieldCheck,
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
      className="fixed inset-0 z-50 bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 overflow-y-auto select-none font-sans"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-slate-200/80 pb-3 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-blue-600 rounded-sm" />
          <span className="font-bold text-slate-900 tracking-tight text-xs uppercase">
            THE BIG BULL
          </span>
          <span className="text-slate-300">//</span>
          <span className="text-blue-600 font-semibold text-xs">Security Invigilation</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-medium">
          Detected: {browserName}
        </span>
      </header>

      {/* Main Center Card */}
      <main className="max-w-md sm:max-w-lg mx-auto w-full my-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-5 sm:p-7 text-center space-y-4">
          {/* Badge Icon */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
            <Lock className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 inline-block">
              Private Browsing Required
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-2">
              Open in Incognito Mode
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed pt-1">
              To keep the competition 100% fair and block third-party extensions, AI solvers, and auto-fill, this terminal must be opened in an Incognito / Private window.
            </p>
          </div>

          {/* Shortcut Cards */}
          <div className="text-left space-y-2 pt-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Quick Shortcuts:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Chrome / Edge / Brave</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-slate-800 font-semibold shadow-2xs">Ctrl+Shift+N</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-slate-800 font-semibold shadow-2xs">Cmd+Shift+N</kbd>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Apple Safari (iPhone / Mac)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Tap Tabs icon <span className="font-bold text-slate-800">❐</span> → Select <span className="text-blue-600 font-semibold">&quot;Private&quot;</span>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 sm:col-span-2">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Android & Mobile Browsers</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Tap Menu (3 dots ︙) → Select <span className="text-blue-600 font-semibold">&quot;New Incognito tab&quot;</span>
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-3">
            <button
              onClick={handleCopyLink}
              className="flex-1 py-3.5 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.99] cursor-pointer min-h-[48px]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>Copy Competition Link</span>
                </>
              )}
            </button>

            {onRecheck && (
              <button
                onClick={onRecheck}
                disabled={isChecking}
                className="py-3.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 transition active:scale-[0.99] cursor-pointer disabled:opacity-60 min-h-[48px]"
              >
                <RefreshCw className={`w-4 h-4 ${isChecking ? "animate-spin" : ""}`} />
                <span>{isChecking ? "Checking..." : "Re-Check Status"}</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-600 max-w-md mx-auto w-full pt-3">
        Device restriction note: If your school/company device blocks incognito, ask the Admin to pardon your station.
      </footer>
    </div>
  );
}
