"use client";
import React from "react";
import {
  X,
  Lightbulb,
  Eye,
  Zap,
  FastForward,
  ShieldAlert,
  Clock,
  Lock,
  Coins,
  Wallet,
  Award,
} from "lucide-react";

interface RulesInfoModalProps {
  onClose: () => void;
}

export const RulesInfoModal: React.FC<RulesInfoModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-blue-600 rounded-sm" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Lifelines & Competition Protocols
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-600">
          {/* Starting Capital Box */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Wallet className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                <span>5,000 Coins Starting Capital</span>
                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                  Wallet Grant
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Every team begins with a starting budget of 5,000 Coins. Coins can only be spent on the 4 tactical lifelines below. Unspent coins do not convert to points, but spending all coins leaves your team with zero lifelines.
              </p>
            </div>
          </div>

          {/* 4 Lifelines */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-blue-600" />
              <span>4 Tactical Lifelines & Pricing</span>
            </div>

            {/* Hint */}
            <div className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-200 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Lightbulb className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-slate-900 text-xs">💡 BULL&apos;S HINT</span>
                </div>
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md text-[11px]">
                  500 Coins
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 pl-8">
                A useful hint related to the question will be provided to the team.
              </p>
            </div>

            {/* Vision Boost */}
            <div className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-200 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Eye className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-slate-900 text-xs">👁️ VISION BOOST</span>
                </div>
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md text-[11px]">
                  1,500 Coins
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 pl-8">
                An image or visual clue related to the question will be displayed to help the team.
              </p>
            </div>

            {/* 50:50 Blast */}
            <div className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-200 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-500 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-slate-900 text-xs">⚡ 50-50 BLAST</span>
                </div>
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md text-[11px]">
                  2,000 Coins
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 pl-8">
                Two incorrect options will be eliminated, leaving only two options to choose from.
              </p>
            </div>

            {/* Bull's Pass */}
            <div className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-200 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <FastForward className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-slate-900 text-xs">⏩ BULL&apos;S PASS</span>
                </div>
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md text-[11px]">
                  2,500 Coins
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 pl-8">
                The team can skip the current question and move on to the next question.
              </p>
            </div>
          </div>

          {/* Rules & Regulations */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
              <span>Rules & Regulations</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-[11px] text-slate-700">
              <p>• <strong>Team Size:</strong> Each team will consist of 2–3 members.</p>
              <p>• <strong>Starting Balance:</strong> Every team receives 5,000 coins at the beginning.</p>
              <p>• All teams will be seated separately.</p>
              <p>• Every question is displayed simultaneously on the main screen for all teams.</p>
              <p>• Teams must discuss and submit their answer within the 120s time limit.</p>
              <p>• Lifelines can be purchased only using available coins (insufficient coins = cannot purchase).</p>
              <p>• Categories: General Knowledge, Space, Basic Technical Concepts, Science and Technology, Logical Thinking.</p>
              <p>• Teams must maintain their remaining coin balance throughout the game.</p>
              <p className="text-blue-700 font-semibold">• <strong>Winner Determination:</strong> Decided by most correct answers. Ties broken by fewest lifelines used, then highest remaining coins.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wide cursor-pointer transition"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
