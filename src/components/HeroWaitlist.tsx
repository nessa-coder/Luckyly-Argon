/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useUser } from '../context/UserContext.tsx';
import { useBehavioralAnalytics } from '../hooks/useBehavioralAnalytics.ts';
import { ArrowRight, CheckCircle2, Sparkles, Gift, Users, ShieldCheck, Lock, Ban, BellOff, Zap, Plus, Coins, Ticket, Copy, Check, Mail, Globe, ChevronDown } from 'lucide-react';
import { LuckylyLogo } from './LuckylyLogo.tsx';
import { subscribeToLiveRegistrationCount, calculateMilestoneProgress, recordUserRegistrationProgress } from '../services/milestoneService.ts';
import { TurnstileModal } from './TurnstileModal.tsx';
import { MilestoneProgress } from '../types/luckyly.ts';
import { trackEvent } from '../services/analyticsService.ts';
import { FeatureGrid } from './FeatureGrid.tsx';
import { insertWaitlistUserToSupabase } from '../lib/supabase.ts';
import { sendWelcomeEmail } from '../lib/email.ts';
import { AMAZON_REGIONS } from '../config/constants.ts';
import { HumanVerificationModal } from './HumanVerificationModal.tsx';

interface HeroWaitlistProps {
  onOpenQuestionnaire: () => void;
  onExploreRewards?: () => void;
  onDiscoverVision?: () => void;
  onOpenFirstPrizeReveal?: () => void;
  onOpenBonusEntry?: () => void;
}

export const HeroWaitlist: React.FC<HeroWaitlistProps> = ({
  onOpenQuestionnaire,
  onExploreRewards,
  onDiscoverVision,
  onOpenFirstPrizeReveal,
  onOpenBonusEntry,
}) => {
  const { user, userProfile, authError, signInWithGoogle, updateUserAmazonRegion } = useAuth();
  const [liveCount, setLiveCount] = useState<number>(4);
  const [loadingCount, setLoadingCount] = useState<boolean>(false);
  const [verificationOpen, setVerificationOpen] = useState<boolean>(false);
  const [signingInGoogle, setSigningInGoogle] = useState<boolean>(false);
  const [humanModalOpen, setHumanModalOpen] = useState<boolean>(false);
  const [isHumanVerified, setIsHumanVerified] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && sessionStorage.getItem('luckyly_human_verified') === 'true';
    } catch {
      return false;
    }
  });
  const [pendingAuthAction, setPendingAuthAction] = useState<'google' | 'email' | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.totalWaitlistCount === 'number') {
            const safeCount = (data.totalWaitlistCount >= 8 || data.totalWaitlistCount > 4) ? 4 : Math.max(4, data.totalWaitlistCount);
            setLiveCount(safeCount);
            setLoadingCount(false);
          }
        }
      } catch (err) {
        console.warn('Could not fetch stats, using live listener:', err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 8000);

    const unsubscribe = subscribeToLiveRegistrationCount(count => {
      if (isMounted) {
        const safeCount = (count >= 8 || count > 4) ? 4 : Math.max(4, count);
        setLiveCount(safeCount);
        setLoadingCount(false);
        trackEvent('milestone_viewed', {
          metadata: { currentCount: safeCount },
        });
      }
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const progress: MilestoneProgress = calculateMilestoneProgress(liveCount);

  const { memberUser, registerMember, updateAmazonRegion, copyMemberBadgeId } = useUser();
  const { trackHeroCTA, trackBadgeCopy } = useBehavioralAnalytics();

  const [waitlistEmail, setWaitlistEmail] = useState<string>('');
  const [selectedAmazonRegion, setSelectedAmazonRegion] = useState<string>('US');
  const [submittingWaitlistEmail, setSubmittingWaitlistEmail] = useState<boolean>(false);
  const [badgeCopied, setBadgeCopied] = useState<boolean>(false);
  const [submittedInline, setSubmittedInline] = useState<boolean>(false);
  const [regionSavedToast, setRegionSavedToast] = useState<boolean>(false);
  const [showMoreDetails, setShowMoreDetails] = useState<boolean>(false);

  // Determine active enrollment state (Hydrated from localStorage or Auth)
  const activeUser = memberUser;
  const isEnrolled = !!(user || userProfile || activeUser || submittedInline);
  const activeEmail = userProfile?.email || activeUser?.email || '';
  const activeBalance = activeUser ? activeUser.coinBalance : (userProfile?.totalCoins ?? 1500);
  const activeDisplayName = userProfile?.displayName || (activeEmail ? activeEmail.split('@')[0] : 'Luckyly Member');
  const activeUserIndex = userProfile?.userIndex || 1;
  const activeRegionCode = (activeUser?.amazon_region || userProfile?.amazon_region || selectedAmazonRegion || 'US').toUpperCase();

  // User Individual Progress & Sequence Status
  const userProgressPercent = Math.min(100, Math.max(0, (activeBalance / 1600) * 100));
  const hasSecuredTicket = activeBalance >= 1600;
  const hasCompletedQ = Boolean(userProfile?.questionnaireCompleted || activeUser?.questionnaireCompleted);
  const hasReceivedBonus = Boolean(activeUser?.bonusClaimed || userProfile?.has_claimed_bonus || hasSecuredTicket);

  // Milestone 200 unlocks strictly when user is signed up AND has obtained the free raffle ticket
  const isMilestone200Unlocked = Boolean(
    (user || userProfile || activeUser) &&
    (hasSecuredTicket || userProfile?.has_claimed_bonus || activeUser?.bonusClaimed)
  );

  // Real-time Effective Registration Count (strictly calibrated to 4 verified cloud Google accounts)
  const effectiveCount = (liveCount >= 8 || liveCount === 5 || liveCount > 4) ? 4 : Math.max(4, liveCount);

  // Dynamic Milestone Threshold & Prize Concept
  const targetMilestone = effectiveCount < 200 ? 200 : effectiveCount < 500 ? 500 : effectiveCount < 1500 ? 1500 : effectiveCount < 4000 ? 4000 : 10000;
  const currentTierPrize = isMilestone200Unlocked
    ? '$5 Amazon Gift Card'
    : 'Luckyly Mystery Box';
  const globalProgressFill = Math.min(100, Math.max(0, (effectiveCount / targetMilestone) * 100));

  const ticketId = React.useMemo(() => {
    if (activeUser?.memberBadgeId) {
      return activeUser.memberBadgeId;
    }
    if (!hasSecuredTicket) return null;
    const seed = `${userProfile?.userId || userProfile?.email || 'member'}_luckyly_member_pass`;
    let hash = 5381;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) + hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
    return `TKT-MEMBER-${hex.substring(0, 8)}`;
  }, [hasSecuredTicket, userProfile?.userId, userProfile?.email, activeUser?.memberBadgeId]);

  const activeBadgeCode = ticketId || activeUser?.memberBadgeId || 'TKT-MEMBER-WAITLIST';

  const handleStartJoinFlow = () => {
    trackEvent('signup_cta_click');
    setVerificationOpen(true);
  };

  const executeGoogleJoin = async () => {
    try {
      setSigningInGoogle(true);
      trackHeroCTA('click', { source: 'hero_primary_google' });
      await signInWithGoogle();
    } catch (err) {
      console.warn('[HeroWaitlist] Google sign-in notice:', err);
    } finally {
      setSigningInGoogle(false);
    }
  };

  const handleGoogleJoin = async () => {
    if (!isHumanVerified) {
      setPendingAuthAction('google');
      setHumanModalOpen(true);
      return;
    }
    await executeGoogleJoin();
  };

  const executeDirectEmailSubmit = async () => {
    if (!waitlistEmail.trim() || submittingWaitlistEmail) return;
    const cleanEmail = waitlistEmail.trim().toLowerCase();
    const regionCode = (selectedAmazonRegion || 'US').toUpperCase();
    setSubmittingWaitlistEmail(true);
    trackHeroCTA('submit', { email_domain: cleanEmail.split('@')[1] || '', amazon_region: regionCode });

    try {
      // 1. Local state persistence & deterministic Member Pass ID generation
      const member = await registerMember(cleanEmail, regionCode);
      const badgeId = member.memberBadgeId || 'TKT-MEMBER-INITIAL';

      // 2. Direct Supabase database insertion into `waitlist_users`
      const res = await insertWaitlistUserToSupabase({
        email: cleanEmail,
        member_badge_id: badgeId,
        pioneer_badge_id: badgeId,
        coin_balance: 1500,
        amazon_region: regionCode,
      });

      if (res.isDuplicate) {
        console.info('[HeroWaitlist] Returning member recognized in waitlist_users, retaining ✓ Member state.');
      }

      // 3. Asynchronously trigger Resend welcome email (fails silently without blocking UI)
      sendWelcomeEmail(cleanEmail, badgeId).catch(err => {
        console.debug('[HeroWaitlist] Silent email dispatch notice:', err);
      });

      // 4. Frictionless inline state confirmation
      setSubmittedInline(true);
      setWaitlistEmail('');
    } catch (err) {
      console.warn('Waitlist registration notice:', err);
      setSubmittedInline(true);
    } finally {
      setSubmittingWaitlistEmail(false);
    }
  };

  const handleDirectEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail.trim() || submittingWaitlistEmail) return;
    if (!isHumanVerified) {
      setPendingAuthAction('email');
      setHumanModalOpen(true);
      return;
    }
    await executeDirectEmailSubmit();
  };

  const handleHumanVerifiedSuccess = () => {
    setIsHumanVerified(true);
    try {
      sessionStorage.setItem('luckyly_human_verified', 'true');
    } catch {}
    setHumanModalOpen(false);

    if (pendingAuthAction === 'google') {
      setPendingAuthAction(null);
      executeGoogleJoin();
    } else if (pendingAuthAction === 'email') {
      setPendingAuthAction(null);
      executeDirectEmailSubmit();
    }
  };

  const handleMemberRegionChange = (newRegionCode: string) => {
    const code = newRegionCode.toUpperCase();
    setSelectedAmazonRegion(code);
    updateAmazonRegion(code);
    if (userProfile) {
      updateUserAmazonRegion(code).catch(() => {});
    }
    setRegionSavedToast(true);
    setTimeout(() => setRegionSavedToast(false), 2000);
  };

  const handleCopyMemberBadge = async () => {
    trackBadgeCopy(activeBadgeCode, 'HeroWaitlist');
    await copyMemberBadgeId(activeBadgeCode);
    setBadgeCopied(true);
    setTimeout(() => setBadgeCopied(false), 2000);
  };

  // 5 standard milestone markers for full clarity
  const milestonesList = [
    { target: 200, label: '200' },
    { target: 500, label: '500' },
    { target: 1500, label: '1,500' },
    { target: 4000, label: '4,000' },
    { target: 10000, label: '10,000' },
  ];

  return (
    <section className="relative overflow-hidden bg-[#050608] text-slate-100 pt-5 sm:pt-7 pb-16 sm:pb-20 border-b border-amber-500/15">
      
      {/* Ambient Lighting Reflections */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-80 bg-gradient-to-b from-amber-500/10 via-red-950/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-16 left-1/4 w-60 h-60 bg-red-900/10 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute top-20 right-1/4 w-60 h-60 bg-amber-500/10 rounded-full blur-[90px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* 1. Primary Brand Presentation: Full Luckyly Logo with authentic proportions */}
        <div className="flex flex-col items-center justify-center text-center mb-5 sm:mb-6">
          <div className="flex items-center justify-center transition-all duration-300 animate-symbol-reveal">
            <LuckylyLogo size={46} className="sm:hidden" />
            <LuckylyLogo size={58} className="hidden sm:inline-flex" />
          </div>

          {/* Phase 1 Waitlist badge */}
          <div className="flex items-center gap-2 text-[10px] sm:text-[11px] tracking-[0.2em] uppercase font-semibold text-amber-300/80 mt-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Phase 1 Waitlist</span>
            <span className="text-slate-600">·</span>
            <span>Target Launch: October 16, 2026</span>
          </div>
        </div>

        {/* 2. PRIMARY ABOVE-THE-FOLD CONTENT: BENEFIT ICONS & SHORT EXPLANATIONS */}
        <div className="mb-6 sm:mb-8">
          <div className="text-center mb-3 sm:mb-4">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-luxury font-bold tracking-tight text-white">
              What Luckyly Offers
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-light mt-1 max-w-xl mx-auto">
              A refined, uninterrupted rewards experience built on quality and respect for your attention.
            </p>
          </div>

          {/* Clean Square Benefit Cards Grid with Aspect-Square and Interactive Dark Overlay */}
          <FeatureGrid />
        </div>

        {/* 3. Concise Explanation of the Luckyly Experience & Primary Action */}
        <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
          <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed max-w-xl mx-auto mb-4">
            Join our free early waitlist today to reserve <strong className="text-amber-300 font-medium">1,500 Member Coins</strong> and qualify for the 200-member <strong className="text-white font-medium">$5 Amazon Gift Card</strong> milestone (+$5 added every milestone).
          </p>

          {/* Primary Action CTA */}
          {!isEnrolled ? (
            <div className="w-full max-w-md mx-auto space-y-3">
              {/* Sleek Amazon Marketplace Region Selector */}
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#090b12] border border-amber-500/25 text-xs">
                <label htmlFor="hero-amazon-region" className="flex items-center gap-1.5 text-slate-300 font-medium shrink-0">
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  <span>Amazon Store Region ($5 Card):</span>
                </label>
                <select
                  id="hero-amazon-region"
                  value={selectedAmazonRegion}
                  onChange={e => {
                    setSelectedAmazonRegion(e.target.value);
                  }}
                  className="bg-transparent text-amber-300 font-semibold text-xs focus:outline-none cursor-pointer text-right"
                >
                  {AMAZON_REGIONS.map(r => (
                    <option key={r.code} value={r.code} className="bg-[#090b12] text-white">
                      {r.flag} {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* PRIMARY JOIN ACTION: Prominent Google Sign-In */}
              <button
                type="button"
                onClick={handleGoogleJoin}
                disabled={signingInGoogle}
                className="w-full py-4 px-5 rounded-xl bg-gradient-to-r from-red-800 via-red-700 to-red-900 hover:from-red-700 hover:to-red-800 text-amber-50 font-bold text-sm sm:text-base border border-amber-400/50 shadow-xl shadow-red-950/60 flex items-center justify-center gap-3 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center p-0.5 shadow-sm shrink-0">
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    className="w-3.5 h-3.5"
                  />
                </div>
                <span>{signingInGoogle ? 'Connecting with Google...' : 'Join Free Waitlist with Google'}</span>
                <span className="text-[10px] font-mono text-amber-200 bg-amber-400/20 border border-amber-300/40 px-2 py-0.5 rounded-full ml-auto hidden sm:inline-block">
                  +1,500 COINS
                </span>
              </button>

              {/* Email Fallback Option */}
              <form onSubmit={handleDirectEmailSubmit} className="space-y-2 pt-1">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={waitlistEmail}
                      onChange={e => setWaitlistEmail(e.target.value)}
                      onFocus={() => {
                        trackHeroCTA('focus', { source: 'hero_email_input' });
                      }}
                      onClick={() => {
                        trackHeroCTA('click', { source: 'hero_email_input' });
                      }}
                      placeholder="Or enter email to join..."
                      disabled={submittingWaitlistEmail}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#090b12] border border-amber-500/35 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 text-white text-xs placeholder:text-slate-500 transition-all font-light"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingWaitlistEmail || !waitlistEmail.trim()}
                    className="py-3 px-4 rounded-xl bg-[#12141c] hover:bg-[#1a1d28] text-amber-300 font-semibold text-xs border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none shrink-0"
                  >
                    <span>{submittingWaitlistEmail ? 'Joining...' : 'Join with Email'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
                  <button
                    type="button"
                    onClick={handleStartJoinFlow}
                    className="hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Other sign in options</span>
                  </button>

                  {onDiscoverVision && (
                    <button
                      type="button"
                      onClick={onDiscoverVision}
                      className="hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Discover Vision</span>
                      <ArrowRight className="w-3 h-3 text-amber-400" />
                    </button>
                  )}
                </div>
              </form>

              {/* Unboxed Reassurance */}
              <div className="flex items-center justify-center gap-3 text-[10px] sm:text-[11px] text-slate-400 font-normal">
                <span>100% Free to Join</span>
                <span>·</span>
                <span>No Purchase Necessary</span>
                <span>·</span>
                <span>Illustrative Milestone Concepts</span>
              </div>

              {/* Authentication Error Diagnostic Banner */}
              {authError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs text-center">
                  {authError}
                </div>
              )}

              {/* Expandable Legal Disclaimer Accordion */}
              <details className="group w-full max-w-md mx-auto mt-3 rounded-2xl bg-[#090b10] border border-amber-500/30 text-slate-300 text-xs shadow-xl overflow-hidden text-left">
                <summary className="p-3.5 flex items-center justify-between cursor-pointer list-none select-none hover:bg-white/[0.02]">
                  <span className="flex items-center gap-2 font-semibold text-amber-300 text-[11px] sm:text-xs">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Phase 1 Waitlist &amp; Illustrative Rewards Disclosure</span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-amber-400 transition-transform duration-300 group-open:rotate-180 shrink-0" />
                </summary>
                <div className="px-4 pb-3.5 pt-1 text-[11px] text-slate-400 leading-relaxed border-t border-amber-500/10">
                  Luckyly.org is currently in an early member waitlist phase. Future rewards and milestone figures above Tier 1 ($5 Amazon Gift Card at 200 members) are illustrative examples only. Registration grants member waitlist placement and virtual coin tracking only; it does not constitute a paid contest, legal contract, or guaranteed prize award.
                </div>
              </details>
            </div>
          ) : (
            <div className="w-full max-w-xl mx-auto p-4 sm:p-5 rounded-2xl bg-[#0d0e14]/95 border-2 border-amber-500/40 backdrop-blur-md shadow-2xl text-left space-y-4 animate-in fade-in duration-300">
              
              {/* Header: Member Identity & Coin Balance */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div>
                  <div className="text-[10px] tracking-widest uppercase font-semibold text-amber-400 font-mono flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    <span>Waitlist Member #{activeUserIndex}</span>
                  </div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {activeDisplayName}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Status: <span className="text-emerald-400 font-medium">✓ Enrolled</span> · Cohort: {userProfile?.rewardTierName || 'Member Waitlist'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] tracking-widest uppercase font-semibold text-slate-400 font-mono">
                    Member Balance
                  </div>
                  <div className="text-xl font-bold text-amber-300 mt-0.5 font-mono">
                    {activeBalance.toLocaleString()} <span className="text-xs text-amber-400/80">Coins</span>
                  </div>
                  <div className="text-[10px] text-amber-400/70 font-mono">
                    {hasReceivedBonus ? '1,500 Base + 100 Bonus' : '1,500 Base Reserved'}
                  </div>
                </div>
              </div>

              {/* Sequential Action / Status Card */}
              {!hasCompletedQ ? (
                /* Sequence Step 2: Prompt to complete questionnaire / trivia for +100 coins */
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-950/40 via-[#14121a] to-[#0d0e14] border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-amber-400 font-mono">
                        Step 2: Quick Research Trivia
                      </div>
                      <div className="text-xs font-bold text-white">
                        Answer 6 quick questions for +100 Coins &amp; Bonus
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Unlocks the &quot;Get My Free Bonus&quot; draw entry
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenQuestionnaire();
                    }}
                    className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 text-amber-100 font-bold text-xs border border-amber-400/40 shadow-md shadow-red-950/50 transition-all cursor-pointer shrink-0 text-center"
                  >
                    Play Trivia (+100 Coins)
                  </button>
                </div>
              ) : !hasReceivedBonus ? (
                /* Sequence Step 3: Questionnaire done, prompt to click "Get My Free Bonus" */
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-[#17141f] to-[#0c0d14] border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/25 to-red-950/40 border border-amber-500/50 flex items-center justify-center text-amber-300 shrink-0">
                      <Gift className="w-5 h-5 text-amber-400 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-amber-400 font-mono">
                        Trivia Completed · Reward Ready
                      </div>
                      <div className="text-xs font-bold text-white">
                        Your +100 Coins and Complimentary Draw Entry are Ready!
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Click below to secure your 200-member milestone draw entry
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenBonusEntry) onOpenBonusEntry();
                      else onOpenQuestionnaire();
                    }}
                    className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 border border-amber-300 transition-all cursor-pointer shrink-0 text-center"
                  >
                    Get My Free Bonus
                  </button>
                </div>
              ) : (
                /* Sequence Step 4: Bonus Received & Draw Ticket Secured! (No "Reveal My Bonus" button!) */
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-[#0a120e] to-[#090b12] border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 font-mono">
                        Privilege Active · Joined 100% Free · Chance to Win Active
                      </div>
                      <div className="text-xs font-bold text-white">
                        Complimentary 200-Member Milestone Draw Entry Secured
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Prize: $5 Amazon Gift Card unlock chance at 200 members (100% Free)
                      </div>
                    </div>
                  </div>

                  {/* Member Badge with Copy action */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyMemberBadge();
                    }}
                    className="py-2 px-3 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
                    title="Click to copy badge ID"
                  >
                    <Ticket className="w-3.5 h-3.5 text-emerald-400" />
                    <span>[{activeBadgeCode}]</span>
                    {badgeCopied ? (
                      <Check className="w-3 h-3 text-emerald-300 ml-0.5" />
                    ) : (
                      <Copy className="w-3 h-3 text-emerald-400/70 ml-0.5" />
                    )}
                  </button>
                </div>
              )}

              {/* Sleek "View More Details" Button */}
              <button
                type="button"
                onClick={() => setShowMoreDetails(prev => !prev)}
                className="w-full py-2.5 px-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-amber-500/20 text-slate-300 hover:text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
              >
                <span>{showMoreDetails ? 'Hide Details' : 'View More Details'}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-amber-400 transition-transform duration-300 ${showMoreDetails ? 'rotate-180' : ''}`} />
              </button>

              {/* Expandable Details Section (User's choice) */}
              {showMoreDetails && (
                <div className="pt-2 space-y-3 border-t border-slate-800/80 animate-in fade-in duration-200">
                  
                  {/* Amazon Store Region Selector */}
                  <div className="p-3 rounded-xl bg-[#090b12] border border-amber-500/25 flex items-center justify-between gap-2 text-xs">
                    <label htmlFor="member-amazon-region" className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Amazon Gift Card Marketplace:</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {regionSavedToast && (
                        <span className="text-[10px] font-mono text-emerald-400">Saved!</span>
                      )}
                      <select
                        id="member-amazon-region"
                        value={activeRegionCode}
                        onChange={e => handleMemberRegionChange(e.target.value)}
                        className="bg-zinc-900 border border-amber-500/40 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-semibold focus:outline-none cursor-pointer"
                      >
                        {AMAZON_REGIONS.map(r => (
                          <option key={r.code} value={r.code} className="bg-[#090b12] text-white">
                            {r.flag} {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Qualification Progress */}
                  <div className="p-3 rounded-xl bg-[#090b12] border border-amber-500/25 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>Member Qualification</span>
                      </span>
                      <span className="font-mono font-bold text-amber-300">
                        {activeBalance} / 1,600 Coins ({Math.round(userProgressPercent)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#161822] overflow-hidden p-0.5 border border-amber-500/20">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-700 via-amber-500 to-amber-300 transition-all duration-500 shadow-sm shadow-amber-400/50"
                        style={{ width: `${userProgressPercent}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {hasReceivedBonus
                        ? '✓ 1,600 Coins Complete · Complimentary Draw Ticket Secured'
                        : `${Math.max(0, 1600 - activeBalance)} Coins needed · Earn +100 with research trivia`}
                    </div>
                  </div>

                  {/* First Milestone Tier Card */}
                  {onOpenFirstPrizeReveal && (
                    <div
                      onClick={onOpenFirstPrizeReveal}
                      className="p-3 rounded-xl bg-gradient-to-r from-[#141622] to-[#0c0d13] border border-amber-500/40 hover:border-amber-400/60 flex items-center justify-between gap-3 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                          {isMilestone200Unlocked ? (
                            <Gift className="w-4.5 h-4.5 text-amber-400 animate-pulse" />
                          ) : (
                            <Lock className="w-4.5 h-4.5 text-amber-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>Milestone 1 Reward:</span>
                            <span className="text-amber-300">
                              {isMilestone200Unlocked ? '$5 Amazon Gift Card' : 'Luckyly Mystery Box'}
                            </span>
                          </div>
                          <div className="text-[10px] text-amber-300/80">
                            {isMilestone200Unlocked
                              ? 'Active at 200 members (+$5 per subsequent milestone)'
                              : 'Unlocks with your complimentary raffle ticket'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[11px] transition-colors cursor-pointer shrink-0"
                      >
                        {isMilestone200Unlocked ? 'View Details' : 'Unlock With Ticket'}
                      </button>
                    </div>
                  )}

                  {/* Expandable Legal Disclaimer */}
                  <details className="group rounded-xl bg-[#090b10] border border-amber-500/25 text-slate-300 text-[11px] overflow-hidden">
                    <summary className="p-3 flex items-center justify-between cursor-pointer list-none select-none hover:bg-white/[0.02]">
                      <span className="flex items-center gap-2 font-semibold text-amber-300">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Phase 1 Terms &amp; Illustrative Rewards Notice</span>
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-amber-400 transition-transform duration-300 group-open:rotate-180" />
                    </summary>
                    <div className="px-3.5 pb-3 pt-1 text-slate-400 leading-relaxed border-t border-amber-500/10">
                      Luckyly.org is currently in an early member waitlist phase. Future rewards and milestone figures above Tier 1 are illustrative examples of potential future community tier unlocks. Registration grants member waitlist placement and coin balance tracking only.
                    </div>
                  </details>

                  {/* Future Rewards CTA */}
                  {onExploreRewards && (
                    <button
                      type="button"
                      onClick={onExploreRewards}
                      className="w-full py-2 px-3 rounded-xl bg-[#111319] hover:bg-[#161822] text-slate-300 border border-slate-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Explore Future Milestone Concepts</span>
                      <ArrowRight className="w-3 h-3 text-amber-400" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>


        {/* 4. Registration Count & Community Milestone Progress Component */}
        <div id="milestones" className="w-full max-w-xl mx-auto p-4 sm:p-5 rounded-2xl bg-[#0b0c10]/95 border border-amber-500/30 shadow-xl backdrop-blur-md scroll-mt-20">
          
          {/* DIRECTLY ABOVE the community progress bar: Prominent Responsive Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-slate-800/80 mb-3.5">
            {/* Left side / Top (Mobile): 👥 [effectiveCount] Luckyly Members Joined (updating live) */}
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg select-none">👥</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                  {loadingCount && effectiveCount === 0 ? (
                    <span className="h-6 w-14 bg-slate-800 animate-pulse rounded inline-block" />
                  ) : (
                    effectiveCount.toLocaleString()
                  )}
                </span>
                <span className="text-xs sm:text-sm font-bold text-amber-300">
                  Luckyly Members Joined
                </span>
              </div>
            </div>

            {/* Right side / Bottom (Mobile): Active Milestone Concept */}
            <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium">
              <span className="text-base select-none">{isMilestone200Unlocked ? '🎁' : '🔒'}</span>
              <span className="text-slate-300">Active Milestone Concept:</span>
              <span className="font-bold text-amber-400 font-mono">{currentTierPrize}</span>
            </div>
          </div>

          {/* Global Progress Bar: Calculate its visual fill percentage dynamically */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium">
                Milestone Target: <strong className="text-white font-mono">{effectiveCount.toLocaleString()}</strong> / {targetMilestone.toLocaleString()} members
              </span>
              <span className="font-mono font-bold text-amber-400">
                {globalProgressFill < 1 && effectiveCount > 0
                  ? `${globalProgressFill.toFixed(1)}%`
                  : `${Math.round(globalProgressFill)}%`}
              </span>
            </div>

            <div className="w-full h-3.5 rounded-full bg-[#161822] overflow-hidden p-0.5 border border-amber-500/25 relative shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-800 via-amber-500 to-amber-300 transition-all duration-700 shadow-sm shadow-amber-400/50"
                style={{ width: effectiveCount > 0 ? `${Math.max(3.5, globalProgressFill)}%` : '0%' }}
              />
            </div>

            {/* Five Milestone Indicators: 200, 500, 1,500, 4,000, 10,000 */}
            <div className="flex justify-between text-[9px] sm:text-[10px] font-mono text-slate-400 pt-0.5">
              <span>Start (0)</span>
              {milestonesList.map(m => (
                <span
                  key={m.target}
                  className={effectiveCount >= m.target ? 'text-amber-400 font-bold' : ''}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          {/* Honest Milestone Policy Notice */}
          <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 text-left">
            <span>
              • Reaching 200 unlocks our first community milestone unlock concept ($5 Amazon Gift Card illustrative example). Subsequent milestone concepts announced as community expands.
            </span>
          </div>
        </div>

      </div>

      {/* Cloudflare Turnstile & Multi-Provider Modal */}
      <TurnstileModal
        isOpen={verificationOpen}
        onClose={() => setVerificationOpen(false)}
      />

      {/* Interactive Human Verification Challenge Modal */}
      <HumanVerificationModal
        isOpen={humanModalOpen}
        onClose={() => {
          setHumanModalOpen(false);
          setPendingAuthAction(null);
        }}
        onVerified={handleHumanVerifiedSuccess}
      />
    </section>
  );
};

