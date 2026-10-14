"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  Monitor,
  Smartphone,
  Coins,
  ArrowRight,
  Key,
  Users,
  Copy,
  Check,
  TrendingUp,
  Activity,
  Flame,
  Radio,
  Lock,
} from "lucide-react";

export default function HomePage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [healthData, setHealthData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setHealthData(data))
      .catch(() => {});
  }, []);

  const demoTeams = [
    { code: "BULLS-101", name: "Apex Predators", desk: "Equities Pit" },
    { code: "BULLS-102", name: "Wall Street Wolves", desk: "Derivatives Pit" },
    { code: "BULLS-103", name: "Quantum Bulls", desk: "HFT Algorithm" },
    { code: "BULLS-104", name: "Silicon Mavericks", desk: "Tech Venture" },
    { code: "BULLS-105", name: "Galactic Capital", desk: "Deep Space Macro" },
    { code: "BULLS-106", name: "Cyber Strikers", desk: "Crypto & Defense" },
    { code: "BULLS-107", name: "Alpha Centauri", desk: "Quantitative Desk" },
    { code: "BULLS-108", name: "Golden Horns", desk: "Bullion Reserve" },
  ];

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#030305] text-white flex flex-col justify-between select-none font-sans">
      {/* Top Live Ticker Tape */}
      <div className="bg-[#08080d] border-b border-[#151520] px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-neutral-400">
        <div className="flex items-center gap-4 overflow-hidden">
          <span className="flex items-center gap-1.5 text-amber-400 font-bold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            THE BIG BULL EXCHANGE
          </span>
          <span className="hidden sm:inline text-neutral-600">//</span>
          <span className="hidden sm:inline text-neutral-300">
            TOTAL CAPITAL POOL: <strong className="text-amber-400">40,000 COINS</strong>
          </span>
          <span className="hidden sm:inline text-neutral-600">//</span>
          <span className="hidden md:inline text-neutral-300">
            SECURITY PROTOCOL: <strong className="text-emerald-400">3-STRIKE LOCKDOWN ACTIVE</strong>
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-neutral-500 font-mono text-[10px]">
            HOST: {healthData?.localIp || "localhost"}
          </span>
          <Link
            href="/admin"
            className="text-amber-400 hover:text-amber-300 text-[10px] font-bold uppercase tracking-wider underline flex items-center gap-1"
          >
            Admin Log In →
          </Link>
        </div>
      </div>

      {/* Main Terminal Shell */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col justify-between">
        {/* Arena Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#181824] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-xs text-amber-400 font-bold tracking-widest uppercase">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>LIVE COMPETITION ARENA // HIGH-STAKES QUIZ</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase font-mono">
              THE BIG BULL
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 font-mono">
              Think Smart. Play Strategic. Rule the Bull Market.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/board"
              className="px-4 py-2.5 rounded bg-[#101018] border border-[#262638] hover:border-amber-500 text-xs font-mono font-bold text-neutral-200 hover:text-white transition flex items-center gap-2"
            >
              <Monitor className="w-3.5 h-3.5 text-sky-400" />
              <span>SMART BOARD</span>
            </Link>

            <Link
              href="/join"
              className="px-4 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-black uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>JOIN TERMINAL</span>
            </Link>
          </div>
        </div>

        {/* 4 Primary Operational Stations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-8">
          {/* Station 1: Smart Board */}
          <Link
            href="/board"
            className="p-5 rounded-lg bg-[#07070b] border border-[#1a1a26] hover:border-sky-500/60 transition group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-sky-400 font-bold">
                <span>STATION 01</span>
                <Monitor className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white font-mono uppercase group-hover:text-sky-300">
                Arena Smart Board
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                Full-screen projection mode for audience and auditorium. Giant countdown timer, live response counter, and dramatic reveal sequence.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-sky-400 pt-2 border-t border-[#14141e]">
              <span>LAUNCH SCREEN</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* Station 2: Team Console */}
          <Link
            href="/team"
            className="p-5 rounded-lg bg-[#07070b] border border-[#1a1a26] hover:border-amber-500/60 transition group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-amber-400 font-bold">
                <span>STATION 02</span>
                <Radio className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white font-mono uppercase group-hover:text-amber-300">
                Combat Quiz Console
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                Strict exam terminal with mandatory full-screen lockdown. Touch answer buttons, answer locking, and tactical lifelines dock.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 pt-2 border-t border-[#14141e]">
              <span>ENTER CONSOLE</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* Station 3: Team Login */}
          <Link
            href="/join"
            className="p-5 rounded-lg bg-[#07070b] border border-[#1a1a26] hover:border-emerald-500/60 transition group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400 font-bold">
                <span>STATION 03</span>
                <Smartphone className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white font-mono uppercase group-hover:text-emerald-300">
                Participant Access
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                Secure access code verification with rate-limiting, 1-tap demo credentials loader, and HTTP-only cookie authentication.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 pt-2 border-t border-[#14141e]">
              <span>INITIALIZE LOGIN</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* Station 4: Admin Command */}
          <Link
            href="/admin"
            className="p-5 rounded-lg bg-[#07070b] border border-[#1a1a26] hover:border-red-500/60 transition group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-red-400 font-bold">
                <span>STATION 04</span>
                <Shield className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white font-mono uppercase group-hover:text-red-300">
                Admin Command
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                Real-time game orchestration, timer freeze/resume, question bank with CSV import/export, and live anti-cheat strike telemetry.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-red-400 pt-2 border-t border-[#14141e]">
              <span>COMMAND PANEL</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </Link>
        </div>

        {/* Squad Dossier & 1-Tap Access Table */}
        <section className="bg-[#06060a] border border-[#191924] rounded-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#161622] pb-3">
            <div>
              <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                <span>PRE-LOADED SQUAD CREDENTIALS // 8 PARTICIPANT DESKS</span>
              </div>
              <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                Click any team code to copy, or tap &apos;Launch&apos; to instantly initialize terminal.
              </p>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>STARTING STASH: <strong className="text-white">5,000 COINS</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {demoTeams.map((team) => (
              <div
                key={team.code}
                onClick={() => copyCode(team.code)}
                className="p-3 rounded bg-[#09090f] border border-[#1b1b26] hover:border-amber-500/50 cursor-pointer transition flex flex-col justify-between group"
              >
                <div>
                  <div className="text-[10px] font-mono text-neutral-400 uppercase">{team.desk}</div>
                  <div className="text-xs font-bold text-white mt-0.5 truncate">{team.name}</div>
                </div>

                <div className="mt-3 pt-2 border-t border-[#14141e] flex items-center justify-between font-mono text-xs">
                  <span className="text-amber-400 font-bold">{team.code}</span>
                  {copiedCode === team.code ? (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> COPIED
                    </span>
                  ) : (
                    <Copy className="w-3 h-3 text-neutral-600 group-hover:text-amber-400" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#161622] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-neutral-400">
            <div>
              MASTER ADMIN: <code className="text-amber-400 font-bold">admin</code> / <code className="text-amber-400 font-bold">bigbull2026</code>
            </div>
            <Link href="/admin" className="text-amber-400 hover:underline">
              Open Admin Command Center →
            </Link>
          </div>
        </section>
      </main>

      {/* Terminal Footer */}
      <footer className="border-t border-[#12121a] bg-[#050508] px-4 py-2.5 text-center font-mono text-[10px] text-neutral-400 flex items-center justify-between">
        <span>THE BIG BULL // LIVE PRO QUIZ COMPETITION</span>
        <span>VERSION 2.0 // EXAM LOCKDOWN ACTIVE</span>
      </footer>
    </div>
  );
}
