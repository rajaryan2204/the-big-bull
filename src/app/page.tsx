"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Shield,
  Monitor,
  Lock,
} from "lucide-react";
import { BullLogo } from "@/src/components/BullLogo";
import { detectIncognito } from "@/src/lib/detectIncognito";
import { IncognitoBarrier } from "@/src/components/IncognitoBarrier";

export default function StudentParticipantPortal() {
  const router = useRouter();
  const [teamCode, setTeamCode] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);

  // Incognito Security Enforcement
  const [isIncognito, setIsIncognito] = useState<boolean | null>(null);
  const [browserName, setBrowserName] = useState<string>("Browser");
  const [requireIncognito, setRequireIncognito] = useState<boolean>(true);
  const [checkingIncognito, setCheckingIncognito] = useState<boolean>(true);

  const demoTeams = [
    { code: "BULLS-101", name: "Apex Predators" },
    { code: "BULLS-102", name: "Wall Street Wolves" },
    { code: "BULLS-103", name: "Quantum Bulls" },
    { code: "BULLS-104", name: "Silicon Mavericks" },
    { code: "BULLS-105", name: "Galactic Capital" },
    { code: "BULLS-106", name: "Cyber Strikers" },
    { code: "BULLS-107", name: "Alpha Centauri" },
    { code: "BULLS-108", name: "Golden Horns" },
  ];

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
    fetch("/api/game/state")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.game) {
          setRequireIncognito(data.game.requireIncognito !== false);
        }
      })
      .catch(() => {});

    checkIncognitoStatus();

    fetch("/api/auth/team/me")
      .then((res) => {
        if (res.ok) router.replace("/team");
      })
      .catch(() => {})
      .finally(() => setCheckingExisting(false));
  }, [router, checkIncognitoStatus]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamCode.trim() || !accessCode.trim()) {
      setError("Please enter both Team Code and Secret Access Code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/team/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamCode: teamCode.trim(), accessCode: accessCode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed. Check your code.");
      }

      if (data.token) {
        sessionStorage.setItem("bigbull_team_token", data.token);
      }

      router.push("/team");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickSelect = (code: string) => {
    setTeamCode(code);
    setAccessCode(code);
    setError(null);
  };

  // Block normal browsing if Incognito is required
  if (requireIncognito && isIncognito === false) {
    return (
      <IncognitoBarrier
        browserName={browserName}
        onRecheck={checkIncognitoStatus}
        isChecking={checkingIncognito}
      />
    );
  }

  if (checkingExisting || (requireIncognito && isIncognito === null)) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-semibold text-slate-600 tracking-wide">
          Verifying secure participant terminal...
        </span>
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 select-none font-sans"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-slate-200/80 pb-3 max-w-md mx-auto w-full">
        <BullLogo size="sm" />
        <div className="flex items-center gap-2">
          {requireIncognito && isIncognito && (
            <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold flex items-center gap-1">
              <Shield className="w-3 h-3 text-blue-600" />
              Incognito Verified
            </span>
          )}
          <Link
            href="/smartboard"
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition"
            title="Smart Board Display"
          >
            <Monitor className="w-4 h-4" />
          </Link>
          <Link
            href="/admin"
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition"
            title="Admin Console"
          >
            <Lock className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Main Student Login Card */}
      <main className="max-w-md mx-auto w-full my-auto py-4 sm:py-6 space-y-4 sm:space-y-5">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold uppercase tracking-wider mb-1">
            Participant Exam Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Team Log In
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Enter your team credentials to access the live quiz terminal.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 text-left">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-5 sm:p-6 space-y-4">
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 tracking-wide uppercase">
                Team Identifier
              </label>
              <input
                type="text"
                placeholder="e.g. BULLS-101"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-base focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition outline-none"
                required
                autoCapitalize="characters"
                autoCorrect="off"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 tracking-wide uppercase">
                Secret Access Code
              </label>
              <input
                type="password"
                placeholder="Enter secret code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-base focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-sm shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 min-h-[48px]"
            >
              {loading ? (
                <span>Authorizing...</span>
              ) : (
                <>
                  <span>Connect Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 1-Tap Squad Autofill for Quick Demo Access */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>Quick Squads (1-Tap Fill)</span>
              <span className="text-blue-600 font-bold">5,000 Coins</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {demoTeams.map((t) => (
                <button
                  key={t.code}
                  type="button"
                  onClick={() => quickSelect(t.code)}
                  className={`p-2.5 rounded-xl text-left border transition text-xs font-medium flex items-center justify-between active:scale-[0.98] ${
                    teamCode === t.code
                      ? "bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-xs"
                      : "bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-blue-50/40 hover:border-blue-300"
                  }`}
                >
                  <span className="truncate font-mono">{t.code}</span>
                  {teamCode === t.code && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer with Discreet Portal Links for Hosts */}
      <footer className="text-center text-[11px] text-slate-500 max-w-md mx-auto w-full pt-3 space-y-2">
        <div>Protected live exam environment • 1 Active Session Per Squad</div>
        <div className="flex items-center justify-center gap-3 pt-1 border-t border-slate-200/60 text-slate-400">
          <Link
            href="/smartboard"
            className="hover:text-blue-600 transition flex items-center gap-1 font-medium"
          >
            <span>Smart Board:</span>
            <code className="text-slate-600 font-mono">/smartboard</code>
          </Link>
          <span>•</span>
          <Link
            href="/admin"
            className="hover:text-blue-600 transition flex items-center gap-1 font-medium"
          >
            <span>Host Admin:</span>
            <code className="text-slate-600 font-mono">/admin</code>
          </Link>
        </div>
      </footer>
    </div>
  );
}
