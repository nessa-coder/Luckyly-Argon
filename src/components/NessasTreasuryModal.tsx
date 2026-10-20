/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NESSA'S TREASURY UNLOCK MODAL
 * Celebratory unlock step displaying:
 * - Nessa the Golden Cat & Treasury visual
 * - +1,500 Luckyly Coins credited
 * - 1 Free Entry Ticket for Sony PlayStation 5 Launch Giveaway
 * - Cumulative 1,600 Luckyly Coin balance
 */

import React, { useEffect } from 'react';
import { Sparkles, Ticket, Coins, ArrowRight, ShieldCheck } from 'lucide-react';
import { NessaIcon } from './NessaIcon.tsx';

interface NessasTreasuryModalProps {
  isOpen: boolean;
  onAdvanceToDraw: () => void;
  totalCoins?: number;
}

export const NessasTreasuryModal: React.FC<NessasTreasuryModalProps> = ({
  isOpen,
  onAdvanceToDraw,
  totalCoins = 1600,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto h-auto max-h-[85dvh] sm:max-h-[85vh] flex flex-col overflow-hidden rounded-2xl bg-zinc-900 border border-amber-500/30 shadow-2xl text-slate-100 text-center animate-in zoom-in-95 duration-300">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Scrollable Body */}
        <div
          style={{ WebkitOverflowScrolling: 'touch' }}
          className="flex-1 overflow-y-auto p-5 sm:p-7 pb-6 overscroll-contain scrollbar-thin scrollbar-thumb-amber-500/30"
        >
          {/* Mascot & Crown Animation */}
          <div className="relative mb-5 flex justify-center">
            <div className="relative">
              <div className="absolute -inset-3 bg-gradient-to-r from-amber-500/30 via-red-600/20 to-amber-400/30 rounded-full blur-xl animate-pulse" />
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-b from-[#1c1f2e] to-[#0a0c14] border-2 border-amber-400/60 p-2 flex items-center justify-center shadow-2xl">
                <NessaIcon size={76} />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 p-1.5 rounded-full shadow-lg border border-white">
                <Sparkles className="w-4 h-4 fill-slate-950" />
              </div>
            </div>
          </div>

          {/* Title & Tagline */}
          <div className="space-y-1.5 mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold tracking-widest uppercase">
              <span>NESSA'S TREASURY UNLOCKED</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-luxury font-bold text-white tracking-tight">
              Your Waitlist Bonus Is Active!
            </h3>
            <p className="text-xs sm:text-sm text-amber-200/80 max-w-sm mx-auto">
              Nessa has transferred your founding allocation and granted your complimentary member status.
            </p>
          </div>

          {/* Dual Reward Grant Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {/* Box 1: 1,500 Coins */}
            <div className="p-4 rounded-2xl bg-zinc-950/90 border border-amber-500/30 text-left relative overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400/80">Waitlist Bonus</span>
                <Coins className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-300 font-mono">
                +1,500
              </div>
              <p className="text-[11px] text-slate-400">Luckyly Coins credited to ledger</p>
            </div>

            {/* Box 2: 1 Free Pass */}
            <div className="p-4 rounded-2xl bg-zinc-950/90 border border-red-500/30 text-left relative overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-wider font-bold text-red-300/80">Member Status</span>
                <Ticket className="w-4 h-4 text-red-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono flex items-center gap-1.5">
                <span>1 Pass</span>
                <span className="text-xs text-emerald-400 font-sans font-bold">UNLOCKED</span>
              </div>
              <p className="text-[11px] text-slate-400">Member Pass (Illustrative Tiers)</p>
            </div>
          </div>

          {/* Balance Confirmation Bar */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Cumulative Coin Balance:</span>
            </div>
            <span className="font-mono font-bold text-amber-300 text-sm">
              {totalCoins.toLocaleString()} COINS
            </span>
          </div>
        </div>

        {/* Pinned Sticky Footer */}
        <div className="flex-shrink-0 p-4 sm:p-5 border-t border-white/10 bg-zinc-950/95 backdrop-blur-md pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5">
          <button
            onClick={onAdvanceToDraw}
            className="w-full py-3.5 sm:py-4 px-5 min-h-[48px] rounded-xl bg-gradient-to-r from-red-700 via-red-600 to-red-800 hover:from-red-600 hover:to-red-700 text-amber-100 font-bold text-sm sm:text-base transition-all shadow-xl shadow-red-950/60 border border-amber-400/50 flex items-center justify-center gap-2 cursor-pointer group hover:scale-[1.01]"
          >
            <span>View Milestone Showcase & Team Pools</span>
            <ArrowRight className="w-5 h-5 text-amber-300 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>
        </div>

      </div>
    </div>
  );
};

