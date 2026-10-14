"use client";
import React, { useState } from "react";
import { AlertTriangle, Database, X, ExternalLink, Check } from "lucide-react";

interface DemoBannerProps {
  isDemoMode?: boolean;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ isDemoMode = true }) => {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isDemoMode) {
    return (
      <div className="bg-emerald-950/40 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-200/90 flex items-center justify-between gap-3 z-50">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong className="text-emerald-400 font-semibold">LIVE DATABASE CONNECTED:</strong> Neon Serverless PostgreSQL (Schema: <code className="text-white">bigbull</code>). Persistent audit logs, teams & questions active.
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-300 font-bold uppercase">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>POSTGRES ONLINE</span>
        </div>
      </div>
    );
  }

  const copyCommand = () => {
    navigator.clipboard.writeText("docker compose up -d");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="bg-amber-950/40 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-200/90 flex items-center justify-between gap-3 z-50">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong className="text-amber-400 font-semibold">DEMO MODE ACTIVE:</strong> Running in local-first demo store. Real-time gameplay, lifelines, scoring & timer are 100% operational.
          </span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="text-amber-400 underline hover:text-amber-300 font-medium whitespace-nowrap cursor-pointer text-[11px] flex items-center gap-1"
        >
          <Database className="w-3.5 h-3.5" />
          PostgreSQL Setup Info
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121217] border border-[#2d2d3d] rounded-2xl max-w-lg w-full p-6 text-neutral-200 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Database Persistence & Architecture</h3>
                <p className="text-xs text-neutral-400">Prisma ORM + PostgreSQL Configuration</p>
              </div>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-neutral-300">
              <p>
                THE BIG BULL is configured with a production-grade <strong>Prisma schema</strong> and <strong>PostgreSQL</strong> models.
              </p>
              <p>
                When running without Docker or PostgreSQL, the built-in <strong>Authoritative Demo Store</strong> automatically activates to ensure zero-friction local testing with 100% functional gameplay, atomic lifeline balances, and audit logs.
              </p>

              <div className="mt-4 p-3 rounded-lg bg-[#0a0a0e] border border-[#232330] space-y-2">
                <div className="text-[11px] font-mono text-neutral-400">To start local PostgreSQL via Docker Compose:</div>
                <div className="flex items-center justify-between bg-[#15151c] px-3 py-2 rounded font-mono text-amber-300">
                  <span>docker compose up -d</span>
                  <button
                    onClick={copyCommand}
                    className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2 py-1 rounded flex items-center gap-1 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : "Copy"}
                  </button>
                </div>
                <div className="text-[11px] text-neutral-400">
                  Followed by: <code className="text-amber-400">npx prisma migrate dev</code>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
