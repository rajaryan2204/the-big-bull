"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Monitor,
  Smartphone,
  ArrowRight,
  Copy,
  Check,
  Shield,
  Coins,
  Sparkles,
} from "lucide-react";
import { BullLogo } from "@/src/components/BullLogo";

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
    { code: "BULLS-101", name: "Apex Predators" },
    { code: "BULLS-102", name: "Wall Street Wolves" },
    { code: "BULLS-103", name: "Quantum Bulls" },
    { code: "BULLS-104", name: "Silicon Mavericks" },
    { code: "BULLS-105", name: "Galactic Capital" },
    { code: "BULLS-106", name: "Cyber Strikers" },
    { code: "BULLS-107", name: "Alpha Centauri" },
    { code: "BULLS-108", name: "Golden Horns" },
  ];

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <BullLogo size="sm" />

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            Arena Ready
          </span>

          <Link
            href="/admin"
            className="text-xs font-bold text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
          >
            Admin Log In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8 flex-1 flex flex-col justify-center">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Live Market Quiz Competition
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            THE BIG BULL
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
            Fast-paced, tactical team competition with live bidding, coin balances, lifelines, and real-time anti-cheat exam security.
          </p>
        </div>

        {/* 3 Portal Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Participant Join Card */}
          <Link
            href="/join"
            className="group p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                <Smartphone className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Participant Terminal
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect your squad from mobile phone or laptop. Locked in secure exam kiosk mode.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
              <span>Enter Quiz</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Smart Board Card */}
          <Link
            href="/board"
            className="group p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-blue-600 group-hover:text-white transition">
                <Monitor className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Smart Board View
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Projector / TV display showing live questions, countdown timer, and standings.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform">
              <span>Open Projector</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Admin Control Center Card */}
          <Link
            href="/admin"
            className="group p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-blue-600 group-hover:text-white transition">
                <Shield className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Admin Controller
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Host control room for stage progression, answer reveals, coin management, and security.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform">
              <span>Host Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>

        {/* Demo Squads Quick Copy */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Demo Squad Codes (Passcode is same as code)</span>
            <span className="text-blue-600 font-semibold">5,000 Coins / Squad</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {demoTeams.map((t) => (
              <button
                key={t.code}
                type="button"
                onClick={() => copyCode(t.code)}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 text-left transition flex items-center justify-between text-xs font-mono group cursor-pointer"
                title="Click to copy team code"
              >
                <span className="font-semibold text-slate-800">{t.code}</span>
                {copiedCode === t.code ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 text-center text-xs text-slate-500">
        THE BIG BULL • Real-Time Team Quiz & Market Competition Platform
      </footer>
    </div>
  );
}
