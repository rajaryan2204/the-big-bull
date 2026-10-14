"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Key,
  ShieldAlert,
  ArrowRight,
  Users,
  Coins,
  CheckCircle2,
  Lock,
  Radio,
  Flame,
} from "lucide-react";

export default function TeamLoginPage() {
  const router = useRouter();
  const [teamCode, setTeamCode] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);

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

  useEffect(() => {
    fetch("/api/auth/team/me")
      .then((res) => {
        if (res.ok) router.replace("/team");
      })
      .catch(() => {})
      .finally(() => setCheckingExisting(false));
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamCode.trim() || !accessCode.trim()) {
      setError("Provide both Team Identifier and Secret Access Code.");
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
        throw new Error(data.error || "Authentication failed.");
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

  if (checkingExisting) {
    return (
      <div className="min-h-screen bg-[#030305] flex items-center justify-center font-mono text-xs text-amber-400">
        INITIALIZING TERMINAL GATEWAY...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#030305] text-white flex flex-col justify-between p-4 sm:p-6 select-none font-sans"
      onContextMenu={(e) => e.preventDefault()}
    >
      <header className="flex items-center justify-between border-b border-[#161622] pb-3 font-mono text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-amber-500 rounded-sm" />
          <span className="font-bold text-white tracking-widest uppercase">THE BIG BULL</span>
          <span className="text-neutral-600">//</span>
          <span className="text-amber-400">AUTHENTICATION GATEWAY</span>
        </div>
        <span className="text-[10px] text-neutral-400">PORT: 3000 // SECURE</span>
      </header>

      <main className="max-w-md mx-auto w-full my-auto space-y-6">
        <div className="space-y-1.5 text-center">
          <div className="font-mono text-[10px] uppercase tracking-widest text-amber-400 font-bold">
            PARTICIPANT TERMINAL LOG IN
          </div>
          <h1 className="text-2xl font-black text-white font-mono uppercase tracking-tight">
            CONNECT YOUR SQUAD
          </h1>
          <p className="text-xs text-neutral-400 font-mono">
            Enter assigned team credentials to bind your session to the live arena.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded bg-red-950/40 border border-red-500/50 text-red-200 text-xs flex items-center gap-2 font-mono">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3.5 bg-[#07070b] border border-[#1a1a26] p-6 rounded-lg">
          <div>
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-300 mb-1">
              TEAM CODE
            </label>
            <input
              type="text"
              placeholder="e.g. BULLS-101"
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 rounded bg-[#0e0e16] border border-[#232334] text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-300 mb-1">
              ACCESS CODE
            </label>
            <input
              type="password"
              placeholder="SECRET PASSCODE"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded bg-[#0e0e16] border border-[#232334] text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded bg-amber-500 hover:bg-amber-400 text-black font-mono font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>VERIFYING CREDENTIALS...</span>
            ) : (
              <>
                <span>AUTHORIZE TERMINAL</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 1-Tap Demo Credentials Loader */}
        <div className="bg-[#07070b] border border-[#1a1a26] p-4 rounded-lg space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span className="font-bold text-neutral-300">DEMO SQUADS (1-TAP AUTOFILL)</span>
            <span className="text-amber-400">5,000 COINS</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {demoTeams.map((t) => (
              <button
                key={t.code}
                type="button"
                onClick={() => quickSelect(t.code)}
                className={`p-2 rounded text-left border transition text-xs font-mono flex items-center justify-between ${
                  teamCode === t.code
                    ? "bg-amber-500/20 border-amber-500 text-amber-300"
                    : "bg-[#0c0c14] border-[#1e1e2c] text-neutral-300 hover:border-neutral-500"
                }`}
              >
                <span className="truncate">{t.code}</span>
                {teamCode === t.code && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer className="text-center font-mono text-[10px] text-neutral-400">
        RATE-LIMITED GATEWAY // HTTP-ONLY SESSION COOKIE ISSUANCE
      </footer>
    </div>
  );
}
