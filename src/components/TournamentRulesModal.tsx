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
              <div className="text-[10px] uppercase font-bold text-blue-600">Total Questions</div>
              <div className="text-base font-black text-blue-950">40 Questions</div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-center">
              <div className="text-[10px] uppercase font-bold text-amber-600">Time Limit</div>
              <div className="text-base font-black text-amber-950">120 Sec (2 min)</div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
              <div className="text-[10px] uppercase font-bold text-emerald-600">Scoring</div>
              <div className="text-base font-black text-emerald-950">Pure Accuracy</div>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 text-center">
              <div className="text-[10px] uppercase font-bold text-purple-600">Starting Balance</div>
              <div className="text-base font-black text-purple-950">5,000 Coins</div>
            </div>
          </div>

          {/* Section 1: Event Overview */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <Trophy className="w-4 h-4 text-blue-600" />
              <span>1. Event Overview</span>
            </div>
            <p className="text-[11px] text-slate-700 leading-relaxed">
              <strong>THE BIG BULL</strong> is an exciting team-based quiz challenge that combines knowledge, strategy, and decision-making. Participants compete in teams while answering questions from <strong>General Knowledge, Space, Basic Technical Concepts, Science and Technology, and Logical Thinking</strong>.
            </p>
            <p className="text-[11px] text-slate-700 leading-relaxed">
              Each team starts with a balance of <strong>5,000 coins</strong>, which can be strategically used to purchase different lifelines during the game. Teams must carefully decide when to use their coins while maintaining their remaining balance throughout the event. The event tests participants&apos; knowledge, logical thinking, teamwork, strategic decision-making, and ability to perform under time constraints.
            </p>
          </div>

          {/* Section 2: Lifelines Marketplace */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <Coins className="w-4 h-4 text-amber-600" />
              <span>2. Tactical Lifelines (Purchased via Coins)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-amber-800">💡 BULL&apos;S HINT</span>
                  <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono">500 Coins</span>
                </div>
                <p className="text-slate-600 mt-1">A useful hint related to the question will be provided to the team.</p>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-purple-800">👁️ VISION BOOST</span>
                  <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono">1,500 Coins</span>
                </div>
                <p className="text-slate-600 mt-1">An image or visual clue related to the question will be displayed to help the team.</p>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-blue-800">⚡ 50-50 BLAST</span>
                  <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono">2,000 Coins</span>
                </div>
                <p className="text-slate-600 mt-1">Two incorrect options will be eliminated, leaving only two options to choose from.</p>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-emerald-800">⏩ BULL&apos;S PASS</span>
                  <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono">2,500 Coins</span>
                </div>
                <p className="text-slate-600 mt-1">The team can skip the current question and move on to the next question.</p>
              </div>
            </div>
          </div>

          {/* Section 3: Official Rules & Regulations */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>3. Rules & Regulations</span>
            </div>
            <ul className="space-y-1 pl-5 list-disc text-[11px] text-slate-700">
              <li><strong>Team Size:</strong> Each team will consist of 2–3 members.</li>
              <li><strong>Starting Balance:</strong> Every team will receive 5,000 coins at the beginning of the event.</li>
              <li>All teams will be seated separately.</li>
              <li>Every question will be displayed simultaneously on the main screen for all teams.</li>
              <li>Teams must discuss and submit their answer within the given time limit (120 seconds).</li>
              <li>Lifelines can be purchased only using the team&apos;s available coins.</li>
              <li>A team cannot use a lifeline if it does not have sufficient coins.</li>
              <li>Each lifeline can be used according to the rules specified by the organizers.</li>
              <li>Questions will primarily cover General Knowledge, Space, Basic Technical Concepts, Science and Technology, and Logical Thinking.</li>
              <li>Teams must maintain their remaining coin balance throughout the game.</li>
            </ul>
          </div>

          {/* Section 4: Winner Determination & Tie-Breaker Protocol */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-950 text-xs">
              <Scale className="w-4 h-4 text-blue-600" />
              <span>4. Winner Determination & Tie-Breaker Protocol</span>
            </div>
            <p className="text-[11px] text-blue-900/90 leading-relaxed">
              Winners are decided strictly by knowledge and accuracy. If two or more teams achieve the same score, tie-breaker factors are evaluated in the following order:
            </p>
            <ol className="space-y-1 pl-5 list-decimal text-[11px] font-medium text-blue-950">
              <li>
                <strong>Most Correct Answers:</strong> The squad that answers the most questions correctly wins.
              </li>
              <li>
                <strong className="text-blue-700">Fewest Lifelines Used (Primary Tie-Breaker):</strong> Teams that relied less on lifelines win the tie.
              </li>
              <li>
                <strong>Highest Remaining Coins:</strong> Teams with superior coin management rank higher.
              </li>
              <li>
                <strong>Fastest Cumulative Time:</strong> Total speed of submission across answered rounds.
              </li>
            </ol>
          </div>

          {/* Section 5: Anti-Cheating & Integrity */}
          <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-red-950 text-xs">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>5. Anti-Cheating Protocol (3-Strike Rule)</span>
            </div>
            <p className="text-[11px] text-red-900/90 leading-relaxed">
              Exiting fullscreen, switching tabs, minimizing the browser, or taking screenshots logs a strike. <strong>3 Strikes = Automatic Disqualification</strong> from the tournament.
            </p>
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
