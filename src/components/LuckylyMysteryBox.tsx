/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUCKYLY GOLD MYSTERY VAULT BOX COMPONENT
 * Renders the official Luckyly mystery vault box with the authentic brand emblem.
 * 
 * Rules:
 * 1. Future milestone prizes (500, 1,500, 4,000, 10,000) are permanently concealed
 *    under the Luckyly Gold Mystery Vault Box during Phase 1.
 * 2. Milestone 200 ($5 Amazon Gift Card) is also closed under the mystery box initially,
 *    and reveals only once the user has signed up and secured their free raffle bonus ticket.
 */

import React from 'react';
import { Lock, Unlock, Gift, Sparkles, Flame, ShieldCheck } from 'lucide-react';
import { LuckylyLogo } from './LuckylyLogo.tsx';

export interface LuckylyMysteryBoxProps {
  targetCount: number;
  isUnlocked?: boolean;
  prizeTitle?: string;
  size?: 'hero' | 'compact' | 'standard';
  className?: string;
  onUnlockClick?: () => void;
  onClick?: () => void;
  subtitle?: string;
}

export const LuckylyMysteryBox: React.FC<LuckylyMysteryBoxProps> = ({
  targetCount,
  isUnlocked = false,
  prizeTitle = '$5 Amazon Gift Card',
  size = 'standard',
  className = '',
  onUnlockClick,
  onClick,
  subtitle,
}) => {
  const isFirstMilestone = targetCount === 200;

  // COMPACT VARIANT: Used in the 5-column milestone progression grid
  if (size === 'compact') {
    if (isUnlocked && isFirstMilestone) {
      return (
        <div
          onClick={onClick}
          className={`relative p-3 rounded-2xl bg-gradient-to-b from-[#1c1a24] via-[#10121a] to-[#0a0c12] border-2 border-amber-400/60 shadow-lg shadow-amber-950/40 text-center transition-all group overflow-hidden cursor-pointer ${className}`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
          <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
            {targetCount.toLocaleString()} Users
          </div>
          <div className="text-xs sm:text-sm font-bold font-mono text-amber-300 mt-1 flex items-center justify-center gap-1">
            <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{prizeTitle}</span>
          </div>
          <div className="text-[9px] mt-1.5 font-mono uppercase tracking-wider">
            <span className="text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 inline-flex items-center gap-1">
              <Unlock className="w-2.5 h-2.5" />
              <span>Revealed Draw</span>
            </span>
          </div>
        </div>
      );
    }

    // Locked compact box with Luckyly Brand Emblem
    return (
      <div
        onClick={onClick}
        className={`relative p-3 rounded-2xl bg-gradient-to-b from-[#141622] via-[#0d0f17] to-[#07080c] border border-amber-500/40 hover:border-amber-400/80 shadow-md transition-all text-center group overflow-hidden cursor-pointer ${className}`}
        title={
          isFirstMilestone
            ? 'Milestone 1 — Unlocks once you sign up and claim your free raffle ticket'
            : `Milestone ${targetCount.toLocaleString()} — Undisclosed Luckyly Mystery Vault`
        }
      >
        {/* Subtle Gold Shimmer Top Bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent group-hover:via-amber-400 transition-all" />

        <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-400">
          <span>{targetCount.toLocaleString()} Users</span>
          <Lock className="w-3 h-3 text-amber-400/80 group-hover:text-amber-300 transition-colors" />
        </div>

        {/* Luckyly Brand Emblem In Relief */}
        <div className="my-1.5 flex items-center justify-center">
          <div className="relative p-1.5 rounded-xl bg-gradient-to-b from-amber-500/15 via-[#090b10] to-black border border-amber-500/30 group-hover:scale-105 group-hover:border-amber-400/60 transition-transform shadow-inner">
            <LuckylyLogo variant="emblem" size={24} />
          </div>
        </div>

        <div className="text-[11px] sm:text-xs font-bold text-amber-300 font-mono tracking-tight truncate">
          Luckyly Vault Box
        </div>

        <div className="text-[9px] mt-1 font-mono uppercase tracking-wider text-slate-400">
          {isFirstMilestone ? (
            <span className="text-amber-400/90 font-medium">Unlocks With Ticket</span>
          ) : (
            <span className="text-slate-500">Undisclosed Vault</span>
          )}
        </div>
      </div>
    );
  }

  // HERO VARIANT: Used as the prominent card on the left of DrawShowcase
  if (size === 'hero') {
    // UNLOCKED STATE: Revealed $5 Amazon Gift Card
    if (isUnlocked && isFirstMilestone) {
      return (
        <div
          onClick={onClick}
          className={`relative rounded-3xl overflow-hidden border-2 border-amber-400/70 bg-gradient-to-b from-[#181a26] via-[#10121a] to-[#090b10] p-6 flex flex-col justify-between aspect-video sm:aspect-square group shadow-2xl shadow-amber-950/40 transition-all cursor-pointer ${className}`}
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 animate-pulse" />
          
          <div className="flex items-center justify-between z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Vault Unlocked</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-amber-300 bg-black/70 px-2.5 py-0.5 rounded-full border border-amber-500/40">
              Target: {targetCount.toLocaleString()}
            </span>
          </div>

          <div className="text-center my-auto py-4 space-y-3 z-10 animate-in fade-in duration-500">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 via-red-950/40 to-black border-2 border-amber-400/60 mx-auto flex items-center justify-center text-amber-300 shadow-xl shadow-amber-950/50">
              <Gift className="w-10 h-10 text-amber-300 animate-bounce" />
            </div>
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-amber-400 font-bold block">
                First Community Milestone Prize
              </span>
              <h3 className="text-2xl sm:text-3xl font-luxury font-bold text-white mt-1">
                {prizeTitle}
              </h3>
              <p className="text-xs text-slate-300 mt-1.5 max-w-xs mx-auto leading-relaxed">
                Unlocked for verified ticket holders. Fulfilled digitally via official Amazon regional store voucher codes.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-amber-500/20 flex items-center justify-between text-[11px] text-slate-300 font-mono z-10">
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Active Draw Entry</span>
            </span>
            <span className="text-emerald-400 font-semibold">Equal Odds Guaranteed</span>
          </div>
        </div>
      );
    }

    // LOCKED HERO STATE: Luckyly Gold Mystery Vault Box
    return (
      <div
        onClick={onClick}
        className={`relative rounded-3xl overflow-hidden border-2 border-amber-500/50 hover:border-amber-400/80 bg-gradient-to-b from-[#181a28] via-[#0e1018] to-[#07080d] p-6 flex flex-col justify-between aspect-video sm:aspect-square group shadow-2xl transition-all cursor-pointer ${className}`}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Badges */}
        <div className="flex items-center justify-between z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Mystery Vault Box</span>
          </div>
          <span className="text-[11px] font-mono font-bold text-amber-400 bg-black/60 px-2.5 py-0.5 rounded-full border border-amber-500/30">
            Target: {targetCount.toLocaleString()}
          </span>
        </div>

        {/* Centered Luckyly Gold Vault Box */}
        <div className="text-center my-auto py-3 space-y-3 z-10">
          <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-b from-[#1e202f] via-[#12141d] to-[#090a10] border-2 border-amber-400/60 mx-auto flex items-center justify-center shadow-2xl shadow-black/80 group-hover:scale-105 transition-transform duration-300">
            {/* Vault Corner Rivets */}
            <span className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-400/80 shadow-sm" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400/80 shadow-sm" />
            <span className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-400/80 shadow-sm" />
            <span className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400/80 shadow-sm" />

            {/* Official Luckyly Brand Emblem */}
            <div className="p-2 rounded-xl bg-gradient-to-b from-amber-500/20 via-black to-black border border-amber-500/30 flex items-center justify-center shadow-inner">
              <LuckylyLogo variant="emblem" size={48} />
            </div>

            {/* Lock Seal Pip */}
            <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-md border border-amber-200">
              <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </div>

          <div>
            <span className="text-[11px] uppercase font-mono tracking-widest text-amber-400/90 font-bold block">
              {isFirstMilestone ? 'Milestone 1 Vault' : `Milestone ${targetCount.toLocaleString()} Vault`}
            </span>
            <h3 className="text-xl sm:text-2xl font-luxury font-bold text-white mt-0.5">
              Luckyly Mystery Box
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto leading-relaxed">
              {subtitle || (isFirstMilestone
                ? 'Reveals the $5 Amazon Gift Card draw details only after joining the waitlist and securing your free raffle ticket.'
                : 'Concealed under the Luckyly Gold Vault. Future milestone concepts unlock as community goals are met.')}
            </p>
          </div>
        </div>

        {/* Bottom Status Strip */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono z-10">
          <span className="text-amber-400 flex items-center gap-1 font-semibold">
            <Lock className="w-3 h-3" />
            <span>{isFirstMilestone ? 'Closed Until Ticket Claim' : 'Undisclosed Phase 1 Vault'}</span>
          </span>
          <span className="text-slate-400">Free Participation</span>
        </div>
      </div>
    );
  }

  // STANDARD CARD VARIANT (Default)
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl bg-gradient-to-b from-[#141622] via-[#0d0f17] to-[#07080c] border border-amber-500/40 text-center space-y-2 cursor-pointer ${className}`}
    >
      <div className="flex items-center justify-between text-xs font-mono text-slate-400">
        <span>Target: {targetCount.toLocaleString()}</span>
        <Lock className="w-3.5 h-3.5 text-amber-400" />
      </div>
      <div className="my-2 flex justify-center">
        <LuckylyLogo variant="emblem" size={36} />
      </div>
      <div className="text-sm font-bold text-white font-luxury">
        {isUnlocked ? prizeTitle : 'Luckyly Mystery Box'}
      </div>
      <div className="text-[10px] text-slate-400">
        {isUnlocked ? 'Active Unlocked Milestone' : 'Concealed Luckyly Vault'}
      </div>
    </div>
  );
};
