/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';

interface CelebrationToastProps {
  notice: {
    amount: number;
    title: string;
    subtitle: string;
  } | null;
  onClose: () => void;
  onViewLedger: () => void;
}

export const CelebrationToast: React.FC<CelebrationToastProps> = ({
  notice,
  onClose,
  onViewLedger,
}) => {
  if (!notice) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#12141a] border-2 border-amber-400/80 rounded-3xl p-4 text-slate-100 shadow-2xl shadow-black/80 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 text-2xl font-black shrink-0 shadow-lg border border-amber-200">
          🪙
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Coin Reward Credited
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <h4 className="font-extrabold text-sm text-white mt-0.5">
            {notice.title}
          </h4>
          <p className="text-[11px] text-slate-300 mt-1 leading-snug">
            {notice.subtitle}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onViewLedger();
              }}
              className="text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
            >
              <span>View in Coin Ledger</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
