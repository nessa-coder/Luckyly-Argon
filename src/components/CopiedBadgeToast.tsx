/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, Ticket, X } from 'lucide-react';

interface CopiedBadgeToastProps {
  badgeId: string | null;
  onClose: () => void;
}

export const CopiedBadgeToast: React.FC<CopiedBadgeToastProps> = ({ badgeId, onClose }) => {
  if (!badgeId) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-50 max-w-sm w-[90%] sm:w-auto bg-[#0d0f17] border-2 border-emerald-500/70 rounded-2xl p-3.5 sm:p-4 text-slate-100 shadow-2xl shadow-black/90 animate-in slide-in-from-bottom-5 fade-in duration-300 backdrop-blur-md"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>

        <div className="flex-1 min-w-0 pr-2">
          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-mono uppercase tracking-wider">
            <span>Copied to clipboard!</span>
          </div>
          <div className="text-[12px] text-white font-mono font-bold truncate mt-0.5 flex items-center gap-1">
            <Ticket className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-amber-300">{badgeId}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          aria-label="Dismiss toast"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
