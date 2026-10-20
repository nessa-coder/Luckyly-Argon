/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUCKYLY SEQUENTIAL ONBOARDING FLOW COMPONENT
 * Flow:
 * 1. Step 1 (Immediate): Modal granting exactly 1,500 Coins upon successful verification.
 * 2. Step 2 (6-Question Sequence): Strictly 1 question at a time (Step 1 of 6 ... Step 6 of 6).
 *    User selects an option and clicks "Next" (min-h-[44px]).
 * 3. Reward Logic: Submitting Q6 adds +100 bonus Coins (total 1,600 Coins) and reveals Free Draw Ticket.
 * 4. Step 3 (Confirmation): Official Free Draw Ticket confirmation stub.
 * 5. Completion: Closes modal and smooth-scrolls directly to #milestones (with scroll-mt-20).
 * 
 * Mobile UI Fixes:
 * - Modal constraints: w-[95%] max-w-md max-h-[90vh] overflow-y-auto px-4 py-5
 * - Touch targets: All inputs, options, and buttons min-h-[44px]
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext.tsx';
import { useUser } from '../context/UserContext.tsx';
import {
  Coins,
  Sparkles,
  Ticket,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  X,
  ShieldCheck,
  ChevronLeft,
  RefreshCw,
  HelpCircle,
  Copy,
  Check,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import { QUESTIONNAIRE_QUESTIONS } from '../config/constants.ts';
import { submitQuestionnaire, submitMemberQuestionnaire } from '../services/questionnaireService.ts';
import { claimComplimentaryBonusEntry } from '../services/bonusEntryService.ts';
import { recordTicketClaimProgress } from '../services/milestoneService.ts';
import { trackEvent } from '../services/analyticsService.ts';

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  initialStep?: 1 | 2 | 3;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialStep = 1,
}) => {
  const { user, userProfile, updateUserAmazonRegion } = useAuth();
  const { memberUser, updateMemberUser, updateAmazonRegion, copyMemberBadgeId } = useUser();
  const activeUser = memberUser;
  const [badgeCopied, setBadgeCopied] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(initialStep);

  // Step 2: 6-Question sequence state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => ({
    q6_region: activeUser?.amazon_region || userProfile?.amazon_region || 'US',
  }));
  const [submittingSurvey, setSubmittingSurvey] = useState<boolean>(false);
  const [surveyError, setSurveyError] = useState<string | null>(null);
  const isSubmittingRef = React.useRef<boolean>(false);

  // Step 3: Bonus ticket confirmation state
  const [claimingTicket, setClaimingTicket] = useState<boolean>(false);
  const isClaimingRef = React.useRef<boolean>(false);

  // Reset or initialize step based on user profile
  useEffect(() => {
    if (isOpen) {
      isSubmittingRef.current = false;
      isClaimingRef.current = false;
      if (userProfile?.has_completed_questionnaire || userProfile?.questionnaireCompleted) {
        if (!userProfile?.has_claimed_bonus) {
          setCurrentStep(3);
        } else {
          setCurrentStep(1);
        }
      } else {
        setCurrentStep(initialStep);
      }
      setSurveyError(null);
      try {
        localStorage.setItem('hasSeenWelcome', 'true');
      } catch {
        // safe
      }
    }
  }, [isOpen, userProfile, initialStep]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem('hasSeenWelcome', 'true');
    } catch {}
    onClose();
  };

  // Step 1 -> Step 2
  const handleProceedToSurvey = () => {
    try {
      localStorage.setItem('hasSeenWelcome', 'true');
    } catch {
      // safe
    }
    trackEvent('onboarding_step_1_completed', {
      userId: user?.uid,
      metadata: { coins: 1500 },
    });
    setCurrentStep(2);
    setCurrentQuestionIndex(0);
  };

  const currentQ = QUESTIONNAIRE_QUESTIONS[currentQuestionIndex];
  const totalQuestions = QUESTIONNAIRE_QUESTIONS.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const currentAnswer = answers[currentQ?.id] || '';

  const handleSelectOption = (value: string) => {
    setSurveyError(null);
    if (currentQ?.id === 'q6_region') {
      updateAmazonRegion(value);
      if (userProfile) updateUserAmazonRegion(value).catch(() => {});
    }
    setAnswers(prev => ({ ...prev, [currentQ.id]: value }));
  };

  const handleNextQuestion = () => {
    if (!currentAnswer && currentQ?.required) {
      setSurveyError('Please select an option to continue.');
      return;
    }
    setSurveyError(null);
    if (!isLastQuestion) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    setSurveyError(null);
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Submitting Q6 -> Step 3
  const handleSurveyFinalSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentAnswer && currentQ?.required) {
      setSurveyError('Please select an option to complete the research.');
      return;
    }

    if (!userProfile && !memberUser) {
      setSurveyError('User session required to claim rewards.');
      return;
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSubmittingSurvey(true);
    setSurveyError(null);

    const selectedRegion = (answers.q6_region || activeUser?.amazon_region || userProfile?.amazon_region || 'US').toUpperCase();
    updateAmazonRegion(selectedRegion);

    try {
      if (userProfile) {
        await submitQuestionnaire({
          user: userProfile,
          answers,
          amazon_region: selectedRegion,
        });

        userProfile.totalCoins = 1600;
        userProfile.amazon_region = selectedRegion;
        userProfile.amazonRegion = selectedRegion;
        userProfile.has_completed_questionnaire = true;
        userProfile.questionnaireCompleted = true;

        claimComplimentaryBonusEntry(userProfile).catch(err => {
          console.warn('[OnboardingFlow] Ticket auto-claim notice:', err);
        });
      } else if (memberUser) {
        await submitMemberQuestionnaire({
          email: memberUser.email,
          memberBadgeId: memberUser.memberBadgeId,
          amazon_region: selectedRegion,
          answers,
        });

        updateMemberUser({
          ...memberUser,
          coinBalance: Math.min(1600, (memberUser.coinBalance || 1500) + 100),
          amazon_region: selectedRegion,
          amazonRegion: selectedRegion,
          questionnaireCompleted: true,
          bonusClaimed: true,
        });
      }

      try {
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#8B0000', '#F5D77F'],
        });
      } catch {
        // Fallback
      }

      trackEvent('onboarding_survey_6q_completed', {
        userId: user?.uid || memberUser?.memberBadgeId,
        metadata: {
          coinsAwarded: 100,
          totalCoins: 1600,
          amazon_region: selectedRegion,
        },
      });

      setCurrentStep(3);
    } catch (err: any) {
      console.warn('[OnboardingFlow] Survey submission note:', err);
      if (err?.message?.includes('already')) {
        if (userProfile) {
          userProfile.totalCoins = 1600;
          userProfile.has_completed_questionnaire = true;
          userProfile.questionnaireCompleted = true;
        } else if (memberUser) {
          updateMemberUser({
            ...memberUser,
            coinBalance: 1600,
            questionnaireCompleted: true,
          });
        }
        setCurrentStep(3);
      } else {
        setSurveyError(err?.message || 'Failed to submit responses. Please retry.');
      }
    } finally {
      setSubmittingSurvey(false);
      isSubmittingRef.current = false;
    }
  };

  // Step 3 -> Completion: Close modal and smooth scroll directly to #milestones
  const handleFinishAndScrollToMilestones = async () => {
    if (isClaimingRef.current) return;
    isClaimingRef.current = true;
    setClaimingTicket(true);
    if (userProfile && !userProfile.has_claimed_bonus) {
      try {
        await claimComplimentaryBonusEntry(userProfile);
      } catch (err) {
        console.warn('[OnboardingFlow] Finalize bonus error:', err);
      }
    } else if (memberUser && !memberUser.bonusClaimed) {
      updateMemberUser({
        ...memberUser,
        bonusClaimed: true,
        coinBalance: 1600,
      });
      recordTicketClaimProgress(memberUser.memberBadgeId).catch(() => {});
    }

    trackEvent('onboarding_completed', {
      userId: user?.uid,
      metadata: {
        finalCoins: 1600,
        targetSection: 'milestones',
      },
    });

    setClaimingTicket(false);
    isClaimingRef.current = false;
    
    onComplete();

    setTimeout(() => {
      const milestonesEl = document.getElementById('milestones');
      if (milestonesEl) {
        milestonesEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.location.hash = 'milestones';
      }
    }, 120);
  };

  const ticketCode = activeUser?.memberBadgeId || (userProfile
    ? `TKT-MEMBER-${userProfile.userId.substring(0, 8).toUpperCase()}`
    : 'TKT-MEMBER-VERIFIED');

  const handleCopyBadge = async () => {
    await copyMemberBadgeId(ticketCode);
    setBadgeCopied(true);
    setTimeout(() => setBadgeCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Dialog Container with exact constraints: w-[95%] max-w-md max-h-[90vh] overflow-y-auto px-4 py-5 */}
      <div className="w-[95%] max-w-md max-h-[90vh] overflow-y-auto px-4 py-5 rounded-2xl bg-zinc-900 border border-amber-500/30 shadow-2xl text-slate-100 flex flex-col justify-between scrollbar-thin scrollbar-thumb-amber-500/20">
        
        {/* Header */}
        <div className="pb-3 border-b border-white/10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              {currentStep === 1 && <Coins className="w-5 h-5" />}
              {currentStep === 2 && <HelpCircle className="w-5 h-5" />}
              {currentStep === 3 && <Ticket className="w-5 h-5 text-red-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                  {currentStep === 1 && 'Step 1 of 3'}
                  {currentStep === 2 && `Question ${currentQuestionIndex + 1} of ${totalQuestions}`}
                  {currentStep === 3 && 'Step 3 of 3'}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-[10px] text-slate-400 uppercase font-mono">
                  {currentStep === 1 && '1,500 Coins'}
                  {currentStep === 2 && '+100 Coins Boost'}
                  {currentStep === 3 && 'Pass Ready'}
                </span>
              </div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                {currentStep === 1 && 'Welcome Allocation'}
                {currentStep === 2 && `Research: Step ${currentQuestionIndex + 1} of ${totalQuestions}`}
                {currentStep === 3 && 'Member Pass Confirmed'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 py-1">
          
          {/* STEP 1: IMMEDIATE 1,500 COINS GRANT */}
          {currentStep === 1 && (
            <div className="space-y-4 text-center py-2 animate-in fade-in duration-200">
              {/* Gold Coin Grant Badge */}
              <div className="relative mx-auto w-20 h-20 sm:w-22 sm:h-22">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/30 via-red-600/20 to-amber-400/30 rounded-full blur-xl animate-pulse" />
                <div className="relative w-full h-full rounded-2xl bg-gradient-to-b from-[#1c1f2e] to-[#0a0c14] border-2 border-amber-400/60 p-2 flex flex-col items-center justify-center shadow-xl">
                  <Coins className="w-10 h-10 text-amber-400 stroke-[1.75]" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 p-1 rounded-full shadow border border-white">
                  <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                </div>
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-bold tracking-widest uppercase mb-1.5">
                  <CheckCircle2 className="w-3 h-3 text-amber-400" />
                  <span>Verification Confirmed</span>
                </span>
                <h4 className="text-xl sm:text-2xl font-luxury font-bold text-white tracking-tight">
                  You received 1,500 Coins!
                </h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto mt-1 leading-relaxed font-light">
                  Welcome to the Luckyly Phase 1 Waitlist. Your founding member allocation has been credited to your personal ledger.
                </p>
              </div>

              {/* Balance Summary Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#141624] via-[#0d0f17] to-[#090b10] border border-amber-500/30 flex items-center justify-between text-left shadow-lg">
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                    Current Coin Balance
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-300 mt-0.5">
                    1,500 <span className="text-xs font-normal text-amber-400/80">Coins</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Member #{userProfile?.userIndex || 1} · Founding Cohort
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-semibold">
                    +100 Next Step
                  </div>
                  <div className="text-xs text-slate-300 font-light mt-0.5">
                    6-Question Survey
                  </div>
                  <div className="text-[10px] text-amber-400/80 font-mono mt-0.5">
                    Target: 1,600 Coins
                  </div>
                </div>
              </div>

              {/* Expandable Coin Terms Accordion */}
              <details className="group rounded-xl bg-[#090b12] border border-amber-500/20 text-left text-xs overflow-hidden transition-all">
                <summary className="p-3 flex items-center justify-between cursor-pointer list-none select-none hover:bg-white/[0.02]">
                  <span className="text-[11px] text-amber-300 font-medium">View Coin Entitlement Details</span>
                  <ChevronDown className="w-3.5 h-3.5 text-amber-400 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <div className="px-3.5 pb-3 pt-1 text-[11px] text-slate-400 space-y-1.5 border-t border-amber-500/10 leading-relaxed">
                  <p>Luckyly Coins are internal virtual units for community milestone tracking. Coins are distributed via email rather than immediately upon signup.</p>
                  <p className="text-amber-200/90 font-mono">100% Free · Equal Odds · Zero Crypto or purchases.</p>
                </div>
              </details>
            </div>
          )}

          {/* STEP 2: 6-QUESTION MARKET RESEARCH SEQUENCE (STRICTLY ONE QUESTION AT A TIME) */}
          {currentStep === 2 && currentQ && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Progress Indicator */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-medium">
                  <span className="text-amber-300 font-mono">Step {currentQuestionIndex + 1} of {totalQuestions}</span>
                  <span className="text-slate-400">{Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-red-600 transition-all duration-300 ease-out"
                    style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                  />
                </div>
              </div>

              {/* Single Active Question Card (Google Forms Layout) */}
              <div className="p-4 sm:p-5 rounded-xl bg-zinc-950/95 border border-amber-500/30 space-y-3.5 shadow-xl">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span className="text-amber-400 font-bold uppercase tracking-wider">
                      Question {currentQuestionIndex + 1} of {totalQuestions}
                    </span>
                    <span className="text-red-400 font-medium">
                      * Required
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-white leading-snug">
                    {currentQ.text}
                    {currentQ.required && (
                      <span className="text-red-400 font-bold ml-1">*</span>
                    )}
                  </h4>
                  {currentQ.subtitle && (
                    <p className="text-xs text-slate-400 mt-1 font-light leading-relaxed">
                      {currentQ.subtitle}
                    </p>
                  )}
                </div>

                {/* Options list with Google Forms Circular Radio Controls */}
                <div className="space-y-2 pt-1">
                  {currentQ.options?.map(opt => {
                    const isSelected = currentAnswer === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelectOption(opt.value)}
                        className={`w-full min-h-[48px] p-3.5 rounded-xl text-left text-xs sm:text-sm font-medium transition-all border flex items-center gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 text-white ring-1 ring-amber-400/40 shadow-md'
                            : 'bg-zinc-900/90 border-white/10 hover:border-amber-500/40 text-slate-300 hover:bg-zinc-850'
                        }`}
                      >
                        {/* Circular Google Forms Radio */}
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

                        <span className="leading-snug flex-1">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                {surveyError && (
                  <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{surveyError}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: FREE DRAW TICKET CONFIRMATION (1,600 TOTAL COINS) */}
          {currentStep === 3 && (
            <div className="space-y-4 text-center py-2 animate-in fade-in duration-200">
              {/* Ticket Icon Badge */}
              <div className="relative mx-auto w-20 h-20 sm:w-22 sm:h-22">
                <div className="absolute inset-0 bg-gradient-to-r from-red-600/30 via-amber-500/30 to-red-600/30 rounded-full blur-xl animate-pulse" />
                <div className="relative w-full h-full rounded-2xl bg-gradient-to-b from-[#221015] to-[#0a0c14] border-2 border-red-500/60 p-2 flex flex-col items-center justify-center shadow-xl">
                  <Ticket className="w-10 h-10 text-red-400 stroke-[1.75]" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1 rounded-full shadow border border-white">
                  <CheckCircle2 className="w-3.5 h-3.5 fill-slate-950 text-white" />
                </div>
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold tracking-widest uppercase mb-1.5">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Member Credential Confirmed</span>
                </span>
                <h4 className="text-xl sm:text-2xl font-luxury font-bold text-white tracking-tight">
                  Member Pass Active!
                </h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto mt-1 leading-relaxed font-light">
                  Your Member Pass is recorded for upcoming community milestone unlocks. Zero Coins were deducted.
                </p>
              </div>

              {/* Official Pass Stub */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-[#17111b] via-[#0f1018] to-[#0a0b12] border-2 border-amber-500/40 text-left space-y-2.5 shadow-xl">
                <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-amber-400 font-bold tracking-wider">
                      Milestone Credential
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                      Member Pass (Illustrative Tiers)
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold">
                      ACTIVE
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block">Pass ID</span>
                    <button
                      type="button"
                      onClick={handleCopyBadge}
                      className="font-mono font-bold text-amber-300 text-xs flex items-center gap-1.5 hover:text-amber-200 cursor-pointer group mt-0.5"
                      title="Click to copy Pass ID"
                    >
                      <span>{ticketCode}</span>
                      {badgeCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-300 transition-colors" />
                      )}
                    </button>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-mono block">Total Luckyly Coins</span>
                    <span className="font-mono font-bold text-amber-300 text-xs sm:text-sm">
                      1,600 Coins
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Coins Deducted: 0</span>
                  <span className="text-amber-400/90 font-bold">1,500 Base + 100 Survey</span>
                </div>
              </div>

              {/* Expandable Pass Usage Accordion */}
              <details className="group rounded-xl bg-[#090b12] border border-amber-500/20 text-left text-xs overflow-hidden transition-all">
                <summary className="p-3 flex items-center justify-between cursor-pointer list-none select-none hover:bg-white/[0.02]">
                  <span className="text-[11px] text-amber-300 font-medium">View Milestone Pass Usage &amp; Rules</span>
                  <ChevronDown className="w-3.5 h-3.5 text-amber-400 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <div className="px-3.5 pb-3 pt-1 text-[11px] text-slate-400 space-y-1.5 border-t border-amber-500/10 leading-relaxed">
                  <p>Your Member Pass qualifies you for upcoming community milestone unlocks ($5 Amazon gift card at 200 registrations, with +$5 added at every subsequent milestone).</p>
                  <p className="text-amber-200/90 font-mono">Coins remain in your ledger. No purchases or crypto required.</p>
                </div>
              </details>
            </div>
          )}

        </div>


        {/* Footer Actions with min-h-[44px] touch targets */}
        <div className="pt-4 mt-2 border-t border-white/10">
          {currentStep === 1 && (
            <button
              type="button"
              onClick={handleProceedToSurvey}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-gradient-to-r from-red-800 via-red-700 to-red-900 hover:from-red-700 hover:to-red-800 text-amber-50 font-bold text-xs sm:text-sm border border-amber-400/40 shadow-xl shadow-red-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Continue to 6-Question Research (+100 Coins)</span>
              <ArrowRight className="w-4 h-4 text-amber-300" />
            </button>
          )}

          {currentStep === 2 && (
            <div className="flex items-center gap-2.5">
              {currentQuestionIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrevQuestion}
                  className="min-h-[44px] px-3.5 rounded-xl bg-[#141620] hover:bg-[#1a1d2c] text-slate-300 hover:text-white border border-white/10 text-xs font-medium flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </button>
              )}

              {!isLastQuestion ? (
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="flex-1 min-h-[44px] py-3 px-4 rounded-xl bg-gradient-to-r from-red-800 via-red-700 to-red-900 hover:from-red-700 hover:to-red-800 text-amber-50 font-bold text-xs sm:text-sm border border-amber-400/40 shadow-xl shadow-red-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Next Question ({currentQuestionIndex + 2} of {totalQuestions})</span>
                  <ArrowRight className="w-4 h-4 text-amber-300" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submittingSurvey}
                  onClick={handleSurveyFinalSubmit}
                  className="flex-1 min-h-[44px] py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs sm:text-sm border border-amber-300 shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingSurvey ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Crediting +100 Coins & Ticket...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-slate-950" />
                      <span>Submit & Unlock Free Ticket (1,600 Total)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <button
              type="button"
              disabled={claimingTicket}
              onClick={handleFinishAndScrollToMilestones}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs sm:text-sm border border-amber-400/50 shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              <span>Explore Milestones & Community Progression</span>
              <TrendingUp className="w-4 h-4 text-slate-950" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
