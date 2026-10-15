"use client";
import React from "react";
import {
  FileText,
  X,
  ShieldAlert,
  Coins,
  Trophy,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Scale,
} from "lucide-react";

interface TournamentRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TournamentRulesModal: React.FC<TournamentRulesModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight">
                THE BIG BULL Championship 2026
              </h2>
              <p className="text-[11px] text-slate-400">
                Official Rules, Scoring Matrix & Terms of Participation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close Rules"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-600">
          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-center">
              <div className="text-[10px] uppercase font-bold text-blue-600">Questions</div>
              <div className="text-base font-black text-blue-950">40 Rounds</div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-center">
              <div className="text-[10px] uppercase font-bold text-amber-600">Time per Q</div>
              <div className="text-base font-black text-amber-950">120 Sec (2m)</div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
              <div className="text-[10px] uppercase font-bold text-emerald-600">Correct Points</div>
              <div className="text-base font-black text-emerald-950">+1,000 Pts</div>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 text-center">
              <div className="text-[10px] uppercase font-bold text-purple-600">Starting Coins</div>
              <div className="text-base font-black text-purple-950">5,000 Coins</div>
            </div>
          </div>

          {/* Section 1: Scoring Matrix */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <Trophy className="w-4 h-4 text-blue-600" />
              <span>1. Authoritative Scoring Matrix</span>
            </div>
            <ul className="space-y-1.5 pl-5 list-disc text-[11px] text-slate-700">
              <li>
                <strong>Correct Answer:</strong> Awards <span className="text-emerald-700 font-bold">+1,000 Points</span> instantly to squad score.
              </li>
              <li>
                <strong>Incorrect Answer:</strong> Deducts <span className="text-red-700 font-bold">-200 Points</span> penalty from squad score.
              </li>
              <li>
                <strong>Bull&apos;s Pass / Unanswered:</strong> 0 points awarded or deducted. Coin balance preserved.
              </li>
              <li>
                <strong>One Lock per Question:</strong> Once an answer is locked, it cannot be edited or modified. Immediate verdict feedback is displayed.
              </li>
            </ul>
          </div>

          {/* Section 2: Lifelines Marketplace */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <Coins className="w-4 h-4 text-amber-600" />
              <span>2. Working Lifelines Economy (Starting Balance: 5,000 Coins)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="font-bold text-amber-700">💡 Bull&apos;s Hint (500 Coins):</span>
                <p className="text-slate-600 mt-0.5">Reveals deep conceptual clue and analytical hint text for the active question.</p>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="font-bold text-purple-700">🔍 Vision Boost (1,500 Coins):</span>
                <p className="text-slate-600 mt-0.5">Unlocks official high-resolution separate visual clue image diagram.</p>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="font-bold text-blue-700">💥 50:50 Blast (2,000 Coins):</span>
                <p className="text-slate-600 mt-0.5">Instantly removes 2 guaranteed incorrect options, leaving only 2 choices.</p>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="font-bold text-emerald-700">⏭️ Bull&apos;s Pass (2,500 Coins):</span>
                <p className="text-slate-600 mt-0.5">Safely skips the question with 0 penalty, preserving score and protecting accuracy.</p>
              </div>
            </div>
          </div>

          {/* Section 3: Official Tie-Breaker Protocol */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-950 text-xs">
              <Scale className="w-4 h-4 text-blue-600" />
              <span>3. Official Tie-Breaker Hierarchy (Winner Determination)</span>
            </div>
            <p className="text-[11px] text-blue-900/90 leading-relaxed">
              In case two or more squads finish with identical final scores, winners are determined strictly in the following priority order:
            </p>
            <ol className="space-y-1 pl-5 list-decimal text-[11px] font-medium text-blue-950">
              <li>
                <strong>Total Score:</strong> Squad with higher score ranks higher.
              </li>
              <li>
                <strong>Highest Correct Answers:</strong> Squad with more correct answers ranks higher.
              </li>
              <li>
                <strong className="text-blue-700">Fewest Lifelines Used (Primary Tie-Breaker):</strong> Squad that relied least on lifelines wins the tie!
              </li>
              <li>
                <strong>Highest Remaining Coins:</strong> Squad with superior resource management (more coins left) ranks higher.
              </li>
              <li>
                <strong>Fastest Response Time:</strong> Cumulative response speed across all answered questions.
              </li>
            </ol>
          </div>

          {/* Section 4: Security & Code of Conduct */}
          <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-red-950 text-xs">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>4. Anti-Cheating & Integrity Protocol (3-Strike Rule)</span>
            </div>
            <ul className="space-y-1 pl-5 list-disc text-[11px] text-red-900/90">
              <li>
                <strong>Incognito Enforcement:</strong> Terminal must be launched in an Incognito / Private browsing window.
              </li>
              <li>
                <strong>Fullscreen Lock:</strong> Students must maintain fullscreen mode throughout the contest.
              </li>
              <li>
                <strong>Tab Switching / App Minimization:</strong> Leaving the tab, switching apps, or backgrounding browser triggers an automatic security violation strike.
              </li>
              <li>
                <strong>3 Strikes = Immediate Disqualification:</strong> Upon receiving 3 strikes, the squad is locked out and disqualified from the tournament podium.
              </li>
              <li>
                <strong>Single Session:</strong> Only 1 device may be logged in per squad. Simultaneous logins will terminate prior sessions.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            Emergency Master Pass: <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono font-bold">bull2026</code>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-98 cursor-pointer"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
};
