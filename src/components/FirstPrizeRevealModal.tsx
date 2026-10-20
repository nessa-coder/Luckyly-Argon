/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Gift, X, Sparkles, ShieldCheck, Info, CheckCircle2, ChevronDown } from 'lucide-react';
import { FIRST_MILESTONE_PRIZE } from '../config/constants.ts';
import { trackEvent } from '../services/analyticsService.ts';

interface FirstPrizeRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuestionnaire?: () => void;
  userIndex?: number;
}

export const FirstPrizeRevealModal: React.FC<FirstPrizeRevealModalProps> = ({
  isOpen,
  onClose,
  onOpenQuestionnaire,
  userIndex,
}) => {
  useEffect(() => {
    if (isOpen) {
      trackEvent('welcome_prize_revealed', {
        metadata: { prize: FIRST_MILESTONE_PRIZE.title, userIndex },
      });

      // Subtle gold celebratory burst
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#D4AF37', '#8B1E22', '#F5D77F'],
      });
    }
  }, [isOpen, userIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-[#0e1017] border-2 border-amber-500/50 rounded-3xl shadow-2xl overflow-hidden text-slate-100 p-6 sm:p-8 flex flex-col max-h-[92vh]">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto space-y-5 flex-1 pr-1">
          
          {/* Header */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Registered Member Exclusive</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-luxury font-bold text-white tracking-tight">
              First Milestone Prize Reveal
            </h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              Announced for when our community reaches <strong>200 members</strong>.
            </p>
          </div>

          {/* Visual Presentation: Luxury Unboxed Gift Card Card */}
          <div className="relative rounded-2xl bg-gradient-to-br from-[#161822] via-[#10121a] to-[#0a0b10] border border-amber-500/40 p-5 shadow-2xl text-center space-y-3 overflow-hidden">
            
            {/* Shimmer line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-red-950/40 border border-amber-500/50 mx-auto flex items-center justify-center text-amber-300 shadow-lg">
              <Gift className="w-7 h-7 text-amber-400" />
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                Target: 200 Registrations
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-0.5">
                {FIRST_MILESTONE_PRIZE.title}
              </div>
              <div className="text-xs text-amber-200/80 mt-1">
                Digital Amazon voucher code · 100% Free Entry
              </div>
            </div>

            {/* Region Availability Badges */}
            <div className="flex flex-wrap items-center justify-center gap-1 pt-1">
              {['US', 'UK', 'CA', 'DE', 'FR', 'JP'].map(r => (
                <span
                  key={r}
                  className="px-2 py-0.5 rounded bg-black/60 border border-slate-800 text-[10px] text-slate-300 font-mono"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>

          {/* Interactive Expandable Milestone & Non-Binding Notice Accordion */}
          <details className="group rounded-2xl bg-[#08090d] border border-amber-500/25 text-xs text-slate-300 overflow-hidden transition-all">
            <summary className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer list-none select-none hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>View Milestone Terms & Delivery Notice</span>
              </div>
              <ChevronDown className="w-4 h-4 text-amber-400 transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 pt-1 space-y-2 text-[11px] leading-relaxed text-slate-300/90 border-t border-amber-500/10">
              <p>
                <strong className="text-white">Free & Equal Odds:</strong> Participation is 100% free with zero fees. Every verified registrant maintains equal odds regardless of signup date or coin balance.
              </p>
              <p>
                <strong className="text-white">Milestone 1 Activation:</strong> Unlocks upon reaching 200 eligible registrations. Digital Amazon gift voucher delivered by email.
              </p>
              <p>
                <strong className="text-white">Illustrative Future Scaling:</strong> Subsequent milestone tiers add +$5 per unlock as illustrative community goals.
              </p>
            </div>
          </details>

          {/* Actions */}
          <div className="space-y-2.5 pt-2">
            {onOpenQuestionnaire && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenQuestionnaire();
                }}
                className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 text-amber-100 font-semibold text-xs sm:text-sm border border-amber-400/40 shadow-xl shadow-red-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Shape Next Prizes via Questionnaire (+100 Coins)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-5 rounded-xl bg-[#141620] hover:bg-[#1a1c28] text-slate-300 font-medium text-xs transition-colors cursor-pointer"
            >
              Continue to Dashboard
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
