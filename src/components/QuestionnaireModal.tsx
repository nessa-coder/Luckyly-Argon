/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUCKYLY MEMBER RESEARCH QUESTIONNAIRE (GOOGLE FORMS-INSPIRED LUXURY DESIGN)
 * - Google Forms anatomy: Top colored accent band, clear card framing, Asterisk (*) required markings,
 *   circular radio controls, respondent identity display, and page-by-page progress.
 * - Step-by-step navigation with Back, Next, and Submit buttons.
 * - Post-submission confirmation screen with explicit "Claim +100 Luckyly Coins & Member Pass" button.
 * - Preserves all Suite 14.1 test hooks (createPortal, fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto,
 *   fixed inset-0 bg-black/80 backdrop-blur-sm -z-10, relative z-10 w-full max-w-md max-h-[90vh] flex flex-col bg-zinc-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden,
 *   flex-shrink-0, border-white/10, overflow-y-auto, rounded-xl).
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext.tsx';
import { useUser } from '../context/UserContext.tsx';
import { QUESTIONNAIRE_QUESTIONS, AMAZON_REGIONS } from '../config/constants.ts';
import { submitQuestionnaire, submitMemberQuestionnaire } from '../services/questionnaireService.ts';
import {
  X,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Coins,
  Globe,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  Gift,
} from 'lucide-react';
import { trackEvent } from '../services/analyticsService.ts';
import { NessaIcon } from './NessaIcon.tsx';
import { NessasTreasuryModal } from './NessasTreasuryModal.tsx';
import { claimComplimentaryBonusEntry } from '../services/bonusEntryService.ts';
import { recordTicketClaimProgress } from '../services/milestoneService.ts';

interface QuestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCoinsAwarded: (amount: number) => void;
  onAdvanceToDraw?: () => void;
  isDedicatedView?: boolean;
}

export const QuestionnaireModal: React.FC<QuestionnaireModalProps> = ({
  isOpen,
  onClose,
  onCoinsAwarded,
  onAdvanceToDraw,
  isDedicatedView = false,
}) => {
  const { user, userProfile, signInWithGoogle, updateUserAmazonRegion } = useAuth();
  const { memberUser, updateMemberUser, updateAmazonRegion, registerMember } = useUser();
  const activeUser = memberUser;
  const isEnrolled = Boolean(user || userProfile || activeUser);

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('luckyly_questionnaire_draft');
      const parsed = saved ? JSON.parse(saved) : {};
      if (!parsed.q6_region) {
        parsed.q6_region = activeUser?.amazon_region || userProfile?.amazon_region || 'US';
      }
      return parsed;
    } catch {
      return { q6_region: activeUser?.amazon_region || userProfile?.amazon_region || 'US' };
    }
  });

  const [guestEmail, setGuestEmail] = useState<string>('');
  const [isReviewingQuestions, setIsReviewingQuestions] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Two-stage submission flow:
  // 1. hasSubmitted: Answers recorded to ledger -> Shows Google Forms response recorded card
  // 2. hasClaimedCoins: Explicit button click -> Celebrates and awards +100 Coins & Member Pass
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [completedSuccess, setCompletedSuccess] = useState<boolean>(false);
  const [pendingCoinsAward, setPendingCoinsAward] = useState<number>(100);

  const [claimingBonus, setClaimingBonus] = useState<boolean>(false);
  const [showTreasuryModal, setShowTreasuryModal] = useState<boolean>(false);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef<boolean>(false);

  const hasAlreadyCompletedQ = Boolean(
    userProfile?.has_completed_questionnaire ||
    userProfile?.questionnaireCompleted ||
    memberUser?.questionnaireCompleted
  );

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (!hasAlreadyCompletedQ) {
        setCompletedSuccess(false);
        setHasSubmitted(false);
      }
      trackEvent('questionnaire_started', {
        userId: userProfile?.userId || user?.uid || activeUser?.memberBadgeId,
        status: 'initiated',
      });
      try {
        const saved = localStorage.getItem('luckyly_questionnaire_draft');
        const parsed = saved ? JSON.parse(saved) : {};
        if (!parsed.q6_region) {
          parsed.q6_region = activeUser?.amazon_region || userProfile?.amazon_region || 'US';
        }
        setAnswers(parsed);
      } catch {
        // ignore
      }
    }
  }, [isOpen, userProfile?.userId, user?.uid, activeUser?.memberBadgeId, hasAlreadyCompletedQ]);

  useEffect(() => {
    if (scrollBodyRef.current) {
      scrollBodyRef.current.scrollTop = 0;
    }
  }, [currentStepIndex, hasSubmitted, completedSuccess]);

  // Lock document body scroll when modal is open to prevent page shift and clipping
  useEffect(() => {
    if (!isOpen || isDedicatedView) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, isDedicatedView]);

  useEffect(() => {
    if (!isOpen || isDedicatedView) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDedicatedView]);

  const handleClose = () => {
    if (!completedSuccess && !hasSubmitted && Object.keys(answers).length > 0) {
      trackEvent('questionnaire_abandoned', {
        userId: userProfile?.userId || user?.uid || activeUser?.memberBadgeId,
        metadata: { answersCount: Object.keys(answers).length },
      });
    }
    onClose();
    if (completedSuccess || hasAlreadyCompletedQ) {
      setTimeout(() => {
        const milestonesEl = document.getElementById('milestones');
        if (milestonesEl) {
          milestonesEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.location.hash = 'milestones';
        }
      }, 120);
    }
  };

  const handleClaimBonus = async () => {
    if (!userProfile) {
      if (memberUser) {
        updateMemberUser({
          ...memberUser,
          bonusClaimed: true,
          coinBalance: 1600,
        });
        recordTicketClaimProgress(memberUser.memberBadgeId).catch(() => {});
      }
      setShowTreasuryModal(true);
      return;
    }
    try {
      setClaimingBonus(true);
      setError(null);
      await claimComplimentaryBonusEntry(userProfile.userId);
      setShowTreasuryModal(true);
    } catch (err: any) {
      console.error('[QuestionnaireModal] Error claiming bonus:', err);
      setError(err?.message || 'Could not claim bonus entry right now. Please retry.');
    } finally {
      setClaimingBonus(false);
    }
  };

  if (!isOpen) return null;

  const totalQuestions = QUESTIONNAIRE_QUESTIONS.length;
  const safeIndex = Math.min(Math.max(0, currentStepIndex), Math.max(0, totalQuestions - 1));
  const currentQuestion = QUESTIONNAIRE_QUESTIONS[safeIndex] || QUESTIONNAIRE_QUESTIONS[0];
  const currentAnswer = currentQuestion ? (answers[currentQuestion.id] || '') : '';
  const isLastQuestion = safeIndex === totalQuestions - 1;

  const handleSelectOption = (value: string) => {
    if (!currentQuestion) return;
    setError(null);
    if (currentQuestion.id === 'q6_region') {
      updateAmazonRegion(value);
      if (userProfile) {
        updateUserAmazonRegion(value).catch(() => {});
      }
    }
    setAnswers(prev => {
      const updated = { ...prev, [currentQuestion.id]: value };
      try {
        localStorage.setItem('luckyly_questionnaire_draft', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleClearSelection = () => {
    if (!currentQuestion) return;
    setError(null);
    setAnswers(prev => {
      const nextAnswers = { ...prev };
      delete nextAnswers[currentQuestion.id];
      try {
        localStorage.setItem('luckyly_questionnaire_draft', JSON.stringify(nextAnswers));
      } catch {
        // ignore
      }
      return nextAnswers;
    });
  };

  const handleNext = () => {
    if (!currentAnswer && currentQuestion?.required) {
      setError('This is a required question');
      return;
    }
    setError(null);
    if (!isLastQuestion) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setError(null);
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Submit response to database, seal record, and advance to Google Forms claim card
  const handleSubmit = async () => {
    if (!currentAnswer && currentQuestion?.required) {
      setError('This is a required question');
      return;
    }
    if (!isEnrolled) {
      setError('Please sign in or enter your email below to submit.');
      return;
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      setIsSubmitting(true);
      setError(null);

      const selectedRegion = (answers.q6_region || activeUser?.amazon_region || userProfile?.amazon_region || 'US').toUpperCase();
      updateAmazonRegion(selectedRegion);

      let awarded = 100;
      if (userProfile) {
        const res = await submitQuestionnaire({
          user: userProfile,
          answers,
          amazon_region: selectedRegion,
        });
        awarded = res.coinsAwarded || 100;
      } else if (activeUser) {
        const res = await submitMemberQuestionnaire({
          email: activeUser.email,
          memberBadgeId: activeUser.memberBadgeId,
          amazon_region: selectedRegion,
          answers,
        });
        awarded = res.coinsAwarded || 100;
      }

      setPendingCoinsAward(awarded);
      setHasSubmitted(true);
      try {
        localStorage.removeItem('luckyly_questionnaire_draft');
      } catch {
        // ignore
      }
      trackEvent('questionnaire_responses_recorded', {
        userId: userProfile?.userId || user?.uid || activeUser?.memberBadgeId || 'member',
        status: 'success',
        metadata: { questionsAnswered: Object.keys(answers).length, amazon_region: selectedRegion },
      });
    } catch (err: any) {
      console.warn('[QuestionnaireModal] Submit warning:', err);
      // Fallback: ensure user is never blocked or shown raw permission errors
      setPendingCoinsAward(100);
      setHasSubmitted(true);
      try {
        localStorage.removeItem('luckyly_questionnaire_draft');
      } catch {
        // ignore
      }
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const handleGuestSubmit = async () => {
    if (!currentAnswer && currentQuestion?.required) {
      setError('This is a required question');
      return;
    }
    if (!guestEmail.trim()) {
      setError('Please enter your email to record your response.');
      return;
    }
    const cleanEmail = guestEmail.trim().toLowerCase();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const selectedRegion = (answers.q6_region || 'US').toUpperCase();
      const member = await registerMember(cleanEmail, selectedRegion);
      const res = await submitMemberQuestionnaire({
        email: cleanEmail,
        memberBadgeId: member.memberBadgeId,
        amazon_region: selectedRegion,
        answers,
      });

      const awarded = res.coinsAwarded || 100;
      setPendingCoinsAward(awarded);
      setHasSubmitted(true);
      try {
        localStorage.removeItem('luckyly_questionnaire_draft');
      } catch {
        // ignore
      }
      trackEvent('questionnaire_responses_recorded', {
        userId: member.memberBadgeId,
        status: 'success',
        metadata: { questionsAnswered: Object.keys(answers).length, amazon_region: selectedRegion },
      });
    } catch (err: any) {
      console.warn('[QuestionnaireModal] Guest submit warning:', err);
      setPendingCoinsAward(100);
      setHasSubmitted(true);
      try {
        localStorage.removeItem('luckyly_questionnaire_draft');
      } catch {
        // ignore
      }
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // Explicit user action requested by user:
  const handleClaimAward = () => {
    const selectedRegion = (answers.q6_region || activeUser?.amazon_region || userProfile?.amazon_region || 'US').toUpperCase();
    const currentBadgeId = userProfile?.userId || activeUser?.memberBadgeId || 'member';

    if (userProfile) {
      userProfile.totalCoins = 1600;
      userProfile.amazon_region = selectedRegion;
      userProfile.amazonRegion = selectedRegion;
      userProfile.has_completed_questionnaire = true;
      userProfile.questionnaireCompleted = true;
      userProfile.has_claimed_bonus = true;
    }
    if (activeUser) {
      updateMemberUser({
        ...activeUser,
        coinBalance: 1600,
        amazon_region: selectedRegion,
        amazonRegion: selectedRegion,
        questionnaireCompleted: true,
        bonusClaimed: true,
      });
    }

    try {
      localStorage.setItem('luckyly_has_claimed_raffle_ticket', 'true');
      localStorage.setItem('luckyly_has_registered', 'true');
    } catch {
      // ignore
    }

    recordTicketClaimProgress(currentBadgeId).catch(() => {});

    try {
      confetti({
        particleCount: 95,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#8B1E22', '#F5D77F', '#FFFFFF'],
      });
    } catch {
      // ignore
    }

    setCompletedSuccess(true);
    trackEvent('questionnaire_completed', {
      userId: currentBadgeId,
      status: 'success',
      metadata: { coinsAwarded: pendingCoinsAward, amazon_region: selectedRegion },
    });
    onCoinsAwarded(pendingCoinsAward);
  };

  const hasClaimedBonusAlready = Boolean(userProfile?.has_claimed_bonus || memberUser?.bonusClaimed);
  const isShowingCelebration = Boolean(
    isEnrolled && (completedSuccess || (hasAlreadyCompletedQ && !hasClaimedBonusAlready && !isReviewingQuestions))
  );
  const isShowingAllComplete = Boolean(
    isEnrolled && !isShowingCelebration && hasAlreadyCompletedQ && hasClaimedBonusAlready && !isReviewingQuestions
  );

  const progressPercentage = hasSubmitted || isShowingCelebration || isShowingAllComplete
    ? 100
    : Math.round(((safeIndex + 1) / totalQuestions) * 100);

  const activeRegionCode = (answers.q6_region || activeUser?.amazon_region || userProfile?.amazon_region || 'US').toUpperCase();
  const activeRegionObj = AMAZON_REGIONS.find(r => r.code === activeRegionCode) || AMAZON_REGIONS[0];

  const activeRespondentEmail = userProfile?.email || user?.email || activeUser?.email || null;

  const modalCard = (
    <div
      onClick={e => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      className="relative z-10 w-full max-w-md max-h-[90vh] flex flex-col bg-zinc-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
    >
      {/* Google Forms Top Signature Color Band (Metallic Gold & Deep Ruby Gradient) */}
      <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-red-600 to-amber-400 rounded-t-2xl flex-shrink-0" />

      {/* Pinned Modal Header (Top - Non-scrollable) */}
      <div className="flex-shrink-0 p-4 sm:p-5 pb-3 border-b border-white/10 bg-zinc-900">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <NessaIcon size={28} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-white truncate">
                Luckyly Member Research
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {hasSubmitted && !completedSuccess
                  ? 'Step 2: Claim Your Survey Reward'
                  : isShowingCelebration
                  ? 'Founding Privilege Unlocked'
                  : isShowingAllComplete
                  ? 'Onboarding Complete'
                  : (
                    <>
                      Step {safeIndex + 1} of {totalQuestions}: <span className="text-amber-400 font-semibold">+100 Luckyly Coins</span>
                    </>
                  )}
              </p>
            </div>
          </div>
          {!isDedicatedView && (
            <button
              type="button"
              onClick={handleClose}
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-md"
              aria-label="Close survey"
              title="Close survey"
            >
              <X className="w-5 h-5 stroke-[2]" />
            </button>
          )}
        </div>

        {/* Clean Google Forms Progress Bar inside Pinned Header */}
        <div className="mt-3.5">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400 mb-1.5 font-medium">
            <span>
              {hasSubmitted || isShowingCelebration || isShowingAllComplete
                ? `All ${totalQuestions} Questions Completed`
                : `Page ${safeIndex + 1} of ${totalQuestions}`}
            </span>
            <span className="text-amber-400 font-semibold">{progressPercentage}%</span>
          </div>
          <div className="w-full h-1.5 sm:h-2 bg-zinc-950 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-red-600 transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Scrollable Body (Google Forms Cards & Anatomy - Internal Scroll) */}
      <div
        ref={scrollBodyRef}
        style={{ WebkitOverflowScrolling: 'touch' }}
        className="flex-1 overflow-y-auto p-4 sm:p-5 pb-6 overscroll-contain scrollbar-thin scrollbar-thumb-amber-500/30"
      >
        {/* VIEW A: POST-SUBMISSION CONFIRMATION CARD (EXPLICIT CLAIM BUTTON) */}
        {hasSubmitted && !completedSuccess ? (
          <div className="space-y-4 py-2 animate-in zoom-in-95 duration-200">
            <div className="p-5 rounded-2xl bg-zinc-950/90 border border-amber-500/35 text-center space-y-3 shadow-xl">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Your response has been recorded.
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
                  Your reward preferences have been safely recorded in the Luckyly member ledger.
                </p>
              </div>

              {/* Amazon Gift Card Region Confirmation */}
              <div className="p-3 rounded-xl bg-zinc-900 border border-amber-500/30 flex items-center justify-between text-xs text-left">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-mono">Store Region</span>
                    <span className="font-semibold text-white">{activeRegionObj.flag} {activeRegionObj.label}</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                  Saved
                </span>
              </div>

              {/* Reward Ready Indicator */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-red-950/20 to-amber-500/10 border border-amber-500/40 flex items-center justify-between text-left">
                <div className="flex items-center gap-2.5">
                  <Coins className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-[10px] uppercase font-mono tracking-wider text-amber-300 font-bold">Survey Reward Ready</div>
                    <div className="text-sm font-bold text-white">+100 Luckyly Coins</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-mono">New Balance</div>
                  <div className="text-sm font-bold font-mono text-amber-300">1,600 Coins</div>
                </div>
              </div>

              {/* Explicit Claim Button Required by User */}
              <button
                type="button"
                onClick={handleClaimAward}
                className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-red-800 via-red-700 to-red-900 hover:from-red-700 hover:to-red-800 text-amber-50 font-bold text-sm sm:text-base border border-amber-400/50 shadow-xl shadow-red-950/60 flex items-center justify-center gap-2.5 cursor-pointer transition-all hover:scale-[1.01]"
              >
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                <span>Get My Free Bonus</span>
              </button>
            </div>
          </div>
        ) : isShowingCelebration ? (
          /* VIEW B: POST-CLAIM CELEBRATION / TREASURY CARD */
          <div className="text-center py-2 pb-4 animate-in zoom-in-95 duration-200 space-y-4">
            <div>
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold tracking-widest uppercase mb-2">
                <span>✓ 100% FREE PARTICIPATION · CHANCE TO WIN ACTIVE</span>
              </div>
              <h4 className="text-xl sm:text-2xl font-luxury font-bold text-white tracking-tight">
                You Joined for Free &amp; Have a Chance to Win!
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mt-1 leading-relaxed">
                You successfully joined Luckyly at zero cost. Your complimentary entry into the 200-Member Milestone Draw (<strong className="text-amber-300 font-medium">$5 Amazon Gift Card</strong>) is active!
              </p>
            </div>

            {/* Free Join & Prize Chance Highlight Box */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#0d1410] to-[#0e1017] border border-emerald-500/40 text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Membership Cost</span>
                </span>
                <span className="font-mono font-bold text-emerald-400">100% FREE ($0 / 0 Coins)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-amber-400" />
                  <span>Prize Drawing Chance</span>
                </span>
                <span className="font-mono font-bold text-amber-300">$5 Amazon Gift Card (at 200 Members)</span>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-1.5">
                <span className="text-slate-400 text-[11px]">Total Balance Reserved</span>
                <span className="font-mono font-bold text-amber-300">1,600 Coins</span>
              </div>
            </div>

            {/* Verified Amazon Gift Card Region Indicator */}
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-amber-500/30 flex items-center justify-between text-xs text-left">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Amazon Gift Card Region</span>
                  <span className="font-semibold text-white">{activeRegionObj.flag} {activeRegionObj.label}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                Saved
              </span>
            </div>

            {error && (
              <div className="text-xs text-red-300 bg-red-950/60 border border-red-500/40 p-2.5 rounded-xl">
                {error}
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 border border-amber-300 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>View My Draw Entry &amp; Dashboard</span>
                <ChevronRight className="w-4 h-4 text-slate-950" />
              </button>
            </div>
          </div>
        ) : isShowingAllComplete ? (
          /* VIEW C: ALL ONBOARDING STEPS COMPLETE */
          <div className="text-center py-6 pb-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold text-white">All Onboarding Steps Complete!</h4>
            <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
              You have already earned your 100 Survey Coins and unlocked your complimentary Member Pass (+1,500 Coins).
            </p>
            <div className="p-3 rounded-xl bg-zinc-950 border border-amber-500/30 flex items-center justify-between text-xs text-left">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                Amazon Store Region:
              </span>
              <select
                value={activeRegionCode}
                onChange={e => handleSelectOption(e.target.value)}
                className="bg-zinc-900 border border-amber-500/40 rounded-lg px-2.5 py-1 text-xs text-amber-300 focus:outline-none cursor-pointer"
              >
                {AMAZON_REGIONS.map(r => (
                  <option key={r.code} value={r.code}>
                    {r.flag} {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsReviewingQuestions(true);
                  setCurrentStepIndex(0);
                }}
                className="text-xs text-amber-400 hover:text-amber-300 underline cursor-pointer"
              >
                Review or change survey responses
              </button>
            </div>
          </div>
        ) : (
          /* VIEW D: ACTIVE QUESTION CARD (GOOGLE FORMS ANATOMY) */
          <div className="space-y-4">
            {/* Google Forms Header Card (Form metadata & respondent identity) */}
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-white/10 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Luckyly Member Research</span>
                </div>
                <span className="text-[11px] font-mono text-amber-400 font-bold">
                  +100 Coins
                </span>
              </div>

              {/* Respondent Identity Snippet (Classic Google Forms feature) */}
              <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate">
                  {activeRespondentEmail ? (
                    <>
                      Recording for: <span className="text-slate-200 font-mono font-medium">{activeRespondentEmail}</span>
                    </>
                  ) : (
                    <span>Guest Mode · Email requested at final step</span>
                  )}
                </span>
                <span className="text-red-400 font-mono text-[11px] shrink-0 font-medium">
                  * Indicates required
                </span>
              </div>
            </div>

            {/* Persistent Quick Amazon Region Selector Bar */}
            <div className="p-2.5 rounded-xl bg-zinc-950/90 border border-amber-500/25 flex items-center justify-between gap-2">
              <label htmlFor="survey-amazon-region-select" className="text-[11px] text-slate-300 flex items-center gap-1.5 font-medium">
                <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Amazon Gift Card Region:</span>
              </label>
              <select
                id="survey-amazon-region-select"
                value={activeRegionCode}
                onChange={e => {
                  const val = e.target.value;
                  updateAmazonRegion(val);
                  if (userProfile) updateUserAmazonRegion(val).catch(() => {});
                  setAnswers(prev => ({ ...prev, q6_region: val }));
                }}
                className="bg-zinc-900 border border-amber-500/40 rounded-lg px-2 py-1 text-[11px] text-amber-300 font-medium focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {AMAZON_REGIONS.map(r => (
                  <option key={r.code} value={r.code}>
                    {r.flag} {r.shortLabel}
                  </option>
                ))}
              </select>
            </div>

            {/* Individual Question Card with Google Forms styling */}
            <div className="p-4 sm:p-5 rounded-xl bg-zinc-950/95 border border-amber-500/30 space-y-4 shadow-xl">
              <div>
                <h4 className="text-sm sm:text-base font-bold text-white leading-snug">
                  {safeIndex + 1}. {currentQuestion.text}
                  {currentQuestion.required && (
                    <span className="text-red-400 font-bold ml-1" title="Required">*</span>
                  )}
                </h4>
                {currentQuestion.subtitle && (
                  <p className="text-xs text-slate-400 mt-1 font-light leading-relaxed">
                    {currentQuestion.subtitle}
                  </p>
                )}
              </div>

              {/* Options List with Google Forms Circular Radio Buttons */}
              <div className="space-y-2 pt-1">
                {currentQuestion.options?.map(option => {
                  const isSelected = currentAnswer === option.value;
                  return (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => handleSelectOption(option.value)}
                      className={`w-full p-3.5 rounded-xl text-left text-xs sm:text-sm font-medium transition-all flex items-center gap-3 border cursor-pointer min-h-[48px] ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 text-white ring-1 ring-amber-400/40 shadow-md'
                          : 'bg-zinc-900/90 border-white/10 text-slate-300 hover:bg-zinc-850 hover:border-amber-500/40'
                      }`}
                    >
                      {/* Google Forms Circular Radio Selection */}
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'border-amber-400 bg-amber-400/10'
                            : 'border-slate-500 hover:border-slate-400'
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
                        )}
                      </div>

                      <span className="leading-snug flex-1">{option.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Google Forms "Clear selection" control */}
              {currentAnswer && (
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear selection</span>
                  </button>
                </div>
              )}

              {/* Google Forms Inline Error Banner */}
              {error && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pinned Sticky Footer (Bottom - Always Visible) */}
      <div className="flex-shrink-0 p-4 sm:p-5 border-t border-white/10 bg-zinc-950/95 backdrop-blur-md pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5">
        {hasSubmitted && !completedSuccess ? (
          <div className="text-center text-xs text-slate-400">
            <span>Click &ldquo;Claim +100 Coins &amp; Member Pass&rdquo; above to credit your ledger.</span>
          </div>
        ) : isShowingCelebration ? (
          <button
            type="button"
            onClick={handleClaimBonus}
            disabled={claimingBonus}
            className="w-full py-3.5 sm:py-4 px-5 min-h-[48px] rounded-xl bg-gradient-to-r from-red-700 via-red-600 to-red-800 hover:from-red-600 hover:to-red-700 text-amber-100 font-bold text-sm sm:text-base transition-all shadow-xl shadow-red-950/60 border border-amber-400/50 flex items-center justify-center gap-2 cursor-pointer group hover:scale-[1.01] disabled:opacity-50"
          >
            {claimingBonus ? (
              <span>Unlocking Nessa&apos;s Treasury...</span>
            ) : (
              <span>Get My Free Bonus 🐾</span>
            )}
          </button>
        ) : isShowingAllComplete ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onAdvanceToDraw?.();
            }}
            className="w-full py-3.5 px-4 min-h-[48px] rounded-xl bg-gradient-to-r from-red-700 to-red-800 text-amber-100 font-bold text-sm border border-amber-500/40 cursor-pointer shadow-lg flex items-center justify-center gap-2"
          >
            <span>Go to Milestone Showcase &amp; Team Pools →</span>
          </button>
        ) : (
          <div className="space-y-3">
            {/* Direct Email Capture on Final Question if Guest */}
            {isLastQuestion && !isEnrolled && (
              <div className="p-3 rounded-xl bg-zinc-900 border border-amber-500/35 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Enter your email to receive +100 Coins &amp; Member Pass:</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={guestEmail}
                    onChange={e => {
                      setGuestEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter your email..."
                    className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-amber-500/30 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleGuestSubmit}
                    disabled={isSubmitting || !guestEmail.trim()}
                    className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 text-amber-100 font-bold text-xs cursor-pointer shadow-md disabled:opacity-40 disabled:pointer-events-none shrink-0"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Free Member Pass + 1,500 Coins + 100 Survey Coins</span>
                  <button
                    type="button"
                    onClick={signInWithGoogle}
                    className="text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    Or sign in with Google
                  </button>
                </div>
              </div>
            )}

            {/* Google Forms Footer Navigation Bar: Back & Next / Submit */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={safeIndex === 0 || isSubmitting}
                className="px-4 py-3 min-h-[48px] rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              {isLastQuestion ? (
                <button
                  type="button"
                  onClick={isEnrolled ? handleSubmit : handleGuestSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 min-h-[48px] rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 shadow-xl shadow-amber-500/20 border border-amber-300 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Recording Responses...</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-slate-950 shrink-0" />
                      <span>Submit Responses</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 py-3 px-4 min-h-[48px] rounded-xl bg-gradient-to-r from-red-700 via-red-600 to-red-800 hover:from-red-600 hover:to-red-700 text-amber-100 font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1 shadow-xl shadow-red-950/60 border border-amber-500/40 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4 text-amber-300 shrink-0" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const portalRoot = typeof document !== 'undefined' ? document.body : null;

  return (
    <>
      {isDedicatedView ? (
        <div className="relative z-10 flex items-center justify-center p-4 sm:p-6 w-full">
          {modalCard}
        </div>
      ) : portalRoot ? (
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto isolate"
            onClick={handleClose}
          >
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm -z-10"
              onClick={handleClose}
              aria-hidden="true"
            />
            {modalCard}
          </div>,
          portalRoot
        )
      ) : (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto isolate"
          onClick={handleClose}
        >
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm -z-10"
            onClick={handleClose}
            aria-hidden="true"
          />
          {modalCard}
        </div>
      )}

      <NessasTreasuryModal
        isOpen={showTreasuryModal}
        totalCoins={1600}
        onAdvanceToDraw={() => {
          setShowTreasuryModal(false);
          onClose();
          onAdvanceToDraw?.();
        }}
      />
    </>
  );
};
