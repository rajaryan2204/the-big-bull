"use client";
import React, { useMemo } from "react";
import { Wallet, Coins, Sparkles, CheckCircle2 } from "lucide-react";

interface CoinShowerModalProps {
  teamName?: string;
  teamCode?: string;
  counter: number;
}

export const CoinShowerModal: React.FC<CoinShowerModalProps> = ({
  teamName = "Your Team",
  teamCode = "",
  counter,
}) => {
  // Generate 24 floating coins with deterministic pseudorandom spread
  const coins = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      left: `${(i * 4.1 + 3) % 94}%`,
      delay: `${((i * 0.13) % 1.2).toFixed(2)}s`,
      duration: `${(1.4 + ((i * 0.17) % 0.8)).toFixed(2)}s`,
      size: i % 3 === 0 ? "w-8 h-8 text-base" : i % 2 === 0 ? "w-6 h-6 text-xs" : "w-7 h-7 text-sm",
    }));
  }, []);

  const progressPercent = Math.min(100, Math.round((counter / 5000) * 100));
  const isComplete = counter >= 5000;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-white text-center select-none overflow-hidden animate-in fade-in duration-300">
      {/* Falling Gold Coins Rain */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {coins.map((coin) => (
          <div
            key={coin.id}
            className="absolute top-0 animate-coin-drop"
            style={{
              left: coin.left,
              animationDelay: coin.delay,
              animationDuration: coin.duration,
            }}
          >
            <div
              className={`${coin.size} rounded-full bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 border border-amber-200 shadow-lg shadow-yellow-500/40 flex items-center justify-center font-black text-amber-950`}
            >
              🪙
            </div>
          </div>
        ))}
      </div>

      {/* Centerpiece Modal Content */}
      <div className="relative z-10 max-w-sm w-full p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-yellow-500/30 shadow-2xl shadow-yellow-500/10 space-y-5">
        {/* Pulsing Glowing Digital Wallet */}
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-2xl bg-yellow-400/20 blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 border-2 border-yellow-400/80 shadow-lg flex items-center justify-center text-yellow-300 animate-wallet-pulse">
            <Wallet className="w-10 h-10" />
            <Sparkles className="w-4 h-4 text-yellow-300 absolute -top-1.5 -right-1.5 animate-spin" style={{ animationDuration: "3s" }} />
          </div>
        </div>

        {/* Title & Team Details */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 text-[11px] font-bold tracking-wider uppercase">
            <Coins className="w-3.5 h-3.5" />
            <span>Granting Lifeline Capital</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {isComplete ? "Capital Credited!" : "Depositing Coins..."}
          </h2>
          <p className="text-xs text-slate-300 font-medium">
            Allocating to <span className="text-yellow-300 font-bold">{teamName}</span> {teamCode ? `[${teamCode}]` : ""}
          </p>
        </div>

        {/* Rolling Digital Counter */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-1">
          <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
            Account Balance
          </div>
          <div className="font-mono text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-300 tracking-tight">
            +{counter.toLocaleString()}
          </div>
          <div className="text-[11px] font-semibold text-yellow-400/90 font-mono">
            COINS
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-75 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>0 C</span>
            <span>{progressPercent}% Complete</span>
            <span>5,000 C</span>
          </div>
        </div>

        {/* Completion Indicator */}
        <div className="pt-1">
          {isComplete ? (
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>5,000 Coins Deposited! Entering Arena...</span>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 animate-pulse">
              Synchronizing wallet with central arena ledger...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
