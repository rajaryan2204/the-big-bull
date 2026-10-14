"use client";
import React, { useState } from "react";
import { AlertTriangle, Database, X, Check } from "lucide-react";

interface DemoBannerProps {
  isDemoMode?: boolean;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ isDemoMode = true }) => {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isDemoMode) {
    return (
      <div className="bg-emerald-50 border-b border-emerald-200/80 px-4 py-2 text-xs text-emerald-800 flex items-center justify-between gap-3 z-30">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong className="text-emerald-900 font-bold">Database Connected:</strong> Neon PostgreSQL (Schema: <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono text-[11px]">bigbull</code>). Persistent audit logs, teams & questions active.
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-700 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Postgres Live</span>
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
      <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2 text-xs text-amber-900 flex items-center justify-between gap-3 z-30">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong className="text-amber-900 font-bold">Local Demo Storage:</strong> Real-time gameplay, lifelines, scoring & timer are 100% operational in memory.
          </span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="text-amber-800 underline hover:text-amber-950 font-bold whitespace-nowrap cursor-pointer text-[11px] flex items-center gap-1"
        >
          <Database className="w-3.5 h-3.5" />
          DB Info
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 text-slate-800 shadow-xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Database Architecture</h3>
                <p className="text-xs text-slate-500">Prisma ORM + PostgreSQL Configuration</p>
              </div>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-600">
              <p>
                THE BIG BULL is configured with a production-grade <strong>Prisma schema</strong> and <strong>PostgreSQL</strong> models.
              </p>
              <p>
                When running without Docker or PostgreSQL, the built-in <strong>Authoritative Demo Store</strong> automatically activates to ensure zero-friction local testing with 100% functional gameplay, atomic lifeline balances, and audit logs.
              </p>

              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-[11px] text-slate-500 font-medium">To run local PostgreSQL via Docker:</div>
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200 font-mono text-slate-800">
                  <span>docker compose up -d</span>
                  <button
                    onClick={copyCommand}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1 rounded-md flex items-center gap-1 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : "Copy"}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
