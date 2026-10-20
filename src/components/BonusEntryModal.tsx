/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUCKYLY EXCLUSIVE COMPLIMENTARY BONUS ENTRY EXPERIENCE
 * 
 * Concept & Wording:
 * "A COMPLIMENTARY LUCKYLY PRIVILEGE"
 * "# Your Bonus Entry"
 * "A little something extra, from us to you."
 * "No Coin purchase required. Your bonus entry is separate from your Luckyly Coin balance."
 * Button: "Reveal My Bonus"
 * 
 * Visual Design:
 * - Premium black background (#08090d / #0e1017) with refined gold accents and restrained red details.
 * - Refined gift-box reward-reveal visual with origami facets and signature gold emblem.
 * - Elegant reveal transition and confetti chime.
 * - Zero coins deducted; strictly separate from coin balance.
 * - Responsive composition for desktop, mobile, and tablet.
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Gift,
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Coins,
  Ticket,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { LuckylyLogo } from './LuckylyLogo.tsx';
import {
  getBonusEntryStatus,
  claimComplimentaryBonusEntry,
  BonusEntryRecord,
} from '../services/bonusEntryService.ts';
import { FIRST_MILESTONE_PRIZE, CURRENT_CAMPAIGN_ID } from '../config/constants.ts';
import { recordTicketClaimProgress } from '../services/milestoneService.ts';
import { soundService } from '../services/soundService.ts';
import { trackEvent } from '../services/analyticsService.ts';
import { useUser } from '../context/UserContext.tsx';

interface BonusEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuestionnaire?: () => void;
}

export const BonusEntryModal: React.FC<BonusEntryModalProps> = ({
  isOpen,
  onClose,
  onOpenQuestionnaire,
}) => {
  const { userProfile, user, signInWithGoogle } = useAuth();
  const { memberUser, updateMemberUser } = useUser();
  const [existingRecord, setExistingRecord] = useState<BonusEntryRecord | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkingInitialState, setCheckingInitialState] = useState<boolean>(true);

  // Check existing bonus record on modal open
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    if (userProfile?.userId) {
      setCheckingInitialState(true);
      getBonusEntryStatus(userProfile.userId)
        .then(record => {
          if (record) {
            setExistingRecord(record);
            setIsRevealed(true);
          } else {
            setIsRevealed(false);
          }
        })
        .finally(() => {
          setCheckingInitialState(false);
        });
    } else if (memberUser) {
      if (memberUser.bonusClaimed) {
        setIsRevealed(true);
      } else {
        setIsRevealed(false);
      }
      setCheckingInitialState(false);
    } else {
      setCheckingInitialState(false);
    }
  }, [isOpen, userProfile?.userId, memberUser]);

  if (!isOpen) return null;

  const handleReveal = async () => {
    if (!user && !memberUser) {
      setErrorMessage('Please sign in or join the waitlist to access your complimentary bonus entry.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (userProfile) {
        const result = await claimComplimentaryBonusEntry(userProfile);
        setExistingRecord(result.entry);
      } else if (memberUser) {
        updateMemberUser({ ...memberUser, bonusClaimed: true });
        recordTicketClaimProgress(memberUser.memberBadgeId).catch(() => {});
        const record: BonusEntryRecord = {
          id: `bonus_${memberUser.memberBadgeId}`,
          userId: memberUser.memberBadgeId,
          userEmail: memberUser.email,
          userDisplayName: memberUser.email.split('@')[0],
          userIndex: 1,
          bonusType: 'complimentary_privilege',
          campaignId: CURRENT_CAMPAIGN_ID,
          targetMilestone: FIRST_MILESTONE_PRIZE.targetRegistrations,
          prizeDescription: 'PlayStation 5 Console Launch Draw & $5 Amazon Gift Card Milestone Draw',
          status: 'confirmed',
          claimedAt: new Date().toISOString(),
          termsAcknowledged: true,
          coinsDeducted: 0,
          coinBalanceUnaffected: true,
          systemVersion: '1.0.0',
        };
        setExistingRecord(record);
      }
      setIsRevealed(true);

      // Play soft sound chime
      soundService.playOpeningSound();

      // Premium gold and ruby celebratory burst
      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.55 },
        colors: ['#D4AF37', '#8B1E22', '#F5D77F', '#FFFFFF'],
      });

      trackEvent('bonus_entry_revealed' as any, {
        userId: userProfile?.userId || memberUser?.memberBadgeId || 'member',
        status: 'success',
      });
    } catch (err: any) {
      console.error('[BonusEntryModal] Error claiming bonus:', err);
      setErrorMessage(
        err?.message || 'Could not record your bonus entry right now. Please retry.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-[#0e1017] border-2 border-amber-500/50 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-100 p-4 sm:p-7 flex flex-col max-h-[92vh]">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-36 bg-gradient-to-b from-amber-500/20 via-red-950/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer z-20"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto space-y-6 flex-1 pr-1">
          
          {/* 1. Header Wording as Approved */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>A COMPLIMENTARY LUCKYLY PRIVILEGE</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-luxury font-bold text-white tracking-tight">
              Your Bonus Entry
            </h2>

            <p className="text-sm text-amber-200/90 font-light">
              A little something extra, from us to you.
            </p>

            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed pt-0.5">
              No Coin purchase required. Your bonus entry is separate from your Luckyly Coin balance.
            </p>
          </div>

          {/* 2. Visual Presentation: Refined Gift-Box & Reveal Presentation */}
          <div className="relative rounded-2xl bg-gradient-to-br from-[#161822] via-[#10121a] to-[#0a0b10] border border-amber-500/40 p-6 shadow-2xl text-center space-y-4 overflow-hidden">
            {/* Shimmer accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

            {!isRevealed ? (
              /* Pre-reveal visual: Luxury gift box with subtle pulsation */
              <div className="space-y-4 py-2">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 bg-amber-500/20 rounded-2xl blur-lg animate-pulse" />
                  <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-amber-500/25 via-red-950/30 to-[#0e1017] border border-amber-500/50 flex items-center justify-center text-amber-300 shadow-xl">
                    <Gift className="w-10 h-10 text-amber-400 stroke-[1.5]" />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-semibold block">
                    Exclusive to Luckyly Members
                  </span>
                  <div className="text-sm font-medium text-slate-200">
                    Complimentary access to upcoming community milestone concepts
                  </div>
                  <div className="text-xs text-slate-400 font-light">
                    Granted free by Luckyly to verified community members.
                  </div>
                </div>
              </div>
            ) : (
              /* Post-reveal confirmed presentation */
              <div className="space-y-4 py-1 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-red-950/40 border border-amber-400/60 mx-auto flex items-center justify-center text-amber-300 shadow-lg">
                  <Ticket className="w-8 h-8 text-amber-400 stroke-[1.75]" />
                </div>

                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-mono uppercase">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Member Milestone Status Confirmed</span>
                  </div>

                  <div className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {FIRST_MILESTONE_PRIZE.title} Milestone Concept
                  </div>

                  <div className="text-xs text-amber-200/80">
                    Illustrative tier concept at {FIRST_MILESTONE_PRIZE.targetRegistrations} verified registrations
                  </div>

                  {existingRecord && (
                    <div className="text-[10px] font-mono text-slate-400 bg-black/50 py-1 px-3 rounded-lg border border-slate-800 max-w-xs mx-auto truncate">
                      Record ID: {existingRecord.id}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Functional Separation Reassurance Card */}
            <div className="p-3 rounded-xl bg-black/60 border border-amber-500/20 flex items-center justify-between text-xs text-left">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-slate-300">Cost in Luckyly Coins:</span>
              </div>
              <span className="font-mono font-bold text-emerald-400">0 Coins (Free)</span>
            </div>
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={handleReveal}
                  className="block mt-1 font-bold underline hover:text-red-200 cursor-pointer"
                >
                  Retry Entry Registration
                </button>
              </div>
            </div>
          )}

          {/* Legal and Equal Chances Compliance Clarification */}
          <div className="p-4 rounded-2xl bg-[#08090d] border border-amber-500/20 space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center gap-2 font-bold text-amber-400 text-[11px] uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Privilege & Eligibility Transparency</span>
            </div>
            <ul className="space-y-1 text-[11px] text-slate-400 leading-relaxed list-disc pl-4">
              <li>
                <strong className="text-slate-200">Independent of Coins:</strong> This complimentary privilege does not deduct any Coins and does not require coin purchases.
              </li>
              <li>
                <strong className="text-slate-200">Illustrative Unlocks:</strong> All featured prizes and gift cards are illustrative milestone concepts under evaluation prior to launch.
              </li>
              <li>
                <strong className="text-slate-200">Not a Guaranteed Prize:</strong> Registration records member waitlist standing only; it does not constitute a paid contest entry or guaranteed award.
              </li>
            </ul>
          </div>

          {/* Primary Action Button */}
          <div className="space-y-2.5 pt-1">
            {!isRevealed ? (
              !(userProfile?.questionnaireCompleted || memberUser?.questionnaireCompleted) ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center font-medium">
                    Step 2: Answer quick research trivia first (+100 Coins) to unlock your complimentary bonus draw entry!
                  </div>
                  {onOpenQuestionnaire && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenQuestionnaire();
                      }}
                      className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-red-800 via-red-700 to-red-900 hover:from-red-700 hover:to-red-800 text-amber-50 font-bold text-sm sm:text-base border border-amber-400/40 shadow-xl shadow-red-950/60 flex items-center justify-center gap-2.5 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Start Questionnaire (+100 Coins)</span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting || checkingInitialState}
                  onClick={handleReveal}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-red-800 via-red-700 to-red-900 hover:from-red-700 hover:to-red-800 text-amber-50 font-bold text-sm sm:text-base border border-amber-400/40 shadow-xl shadow-red-950/60 flex items-center justify-center gap-2.5 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-200" />
                      <span>Recording Your Free Bonus Entry...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Get My Free Bonus</span>
                    </>
                  )}
                </button>
              )
            ) : (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs text-center font-medium flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Complimentary Draw Entry Active &amp; Recorded</span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 px-5 rounded-xl bg-[#141620] hover:bg-[#1a1c28] text-slate-300 font-medium text-xs transition-colors cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
