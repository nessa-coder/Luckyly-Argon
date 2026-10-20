/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DRAW SHOWCASE & 5-PERSON SYNDICATE/GROUP EXPERIENCE
 * Displays:
 * 1. Grand Prize Hero: Sony PlayStation 5 Console, milestone progress bar, and live countdown timer.
 * 2. Active Entry Confirmation: 1 Free Active Ticket + 1,600 total Coin balance.
 * 3. "Play with Friends & Family" Syndicate Section:
 *    - Unique Group Share ID and "Copy Invite Link" button (https://luckyly.org/join?group=<GROUP_ID>)
 *    - Pool mechanic explanation
 *    - Strict 5-member maximum cap enforced in Firestore schema and UI counter ("X / 5 spots filled")
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Ticket,
  Coins,
  Users,
  Copy,
  Check,
  Share2,
  Clock,
  ShieldCheck,
  Gift,
  Flame,
  UserPlus,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  Info,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useUser } from '../context/UserContext.tsx';
import { useBehavioralAnalytics } from '../hooks/useBehavioralAnalytics.ts';
import { SyndicateGroup, SyndicateMember } from '../types/luckyly.ts';
import {
  getOrCreateUserSyndicate,
  joinSyndicateGroup,
  subscribeToSyndicateGroup,
} from '../services/syndicateService.ts';
import { subscribeToLiveRegistrationCount } from '../services/milestoneService.ts';
import { NessaIcon } from './NessaIcon.tsx';
import { PLANNED_LAUNCH_DATE, MILESTONE_TARGETS, FIRST_MILESTONE_PRIZE } from '../config/constants.ts';
import { LuckylyMysteryBox } from './LuckylyMysteryBox.tsx';

interface DrawShowcaseProps {
  onOpenLedger?: () => void;
  onExploreMoreRewards?: () => void;
  onOpenQuestionnaire?: () => void;
}

export const DrawShowcase: React.FC<DrawShowcaseProps> = ({
  onOpenLedger,
  onExploreMoreRewards,
  onOpenQuestionnaire,
}) => {
  const { userProfile, user } = useAuth();
  const { memberUser, copyMemberBadgeId } = useUser();
  const activeUser = memberUser;
  const { handleMilestoneHoverStart, handleMilestoneHoverEnd, trackBadgeCopy } = useBehavioralAnalytics();

  const isQuestionnairePending = Boolean(
    (user || memberUser) &&
    !(userProfile?.questionnaireCompleted || memberUser?.questionnaireCompleted)
  );

  const [syndicate, setSyndicate] = useState<SyndicateGroup | null>(null);
  const [loadingSyndicate, setLoadingSyndicate] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [badgeCopied, setBadgeCopied] = useState<boolean>(false);
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [liveRegistrationCount, setLiveRegistrationCount] = useState<number>(4);

  useEffect(() => {
    const unsub = subscribeToLiveRegistrationCount(count => {
      const safeCount = (count >= 8 || count > 4) ? 4 : Math.max(4, count);
      setLiveRegistrationCount(safeCount);
    });
    return () => unsub();
  }, []);

  // Live countdown timer to October 16, 2026
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const targetDate = new Date('2026-10-16T23:59:59Z').getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, targetDate - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch or create user's personal syndicate group
  useEffect(() => {
    if (!userProfile?.userId) return;

    let unsub: (() => void) | null = null;

    setLoadingSyndicate(true);
    getOrCreateUserSyndicate(userProfile)
      .then(group => {
        setSyndicate(group);
        unsub = subscribeToSyndicateGroup(group.id, updated => {
          if (updated) setSyndicate(updated);
        });
      })
      .catch(err => {
        console.warn('[DrawShowcase] Syndicate initialization notice:', err);
      })
      .finally(() => {
        setLoadingSyndicate(false);
      });

    return () => {
      if (unsub) unsub();
    };
  }, [userProfile?.userId]);

  const inviteLink = syndicate
    ? `https://luckyly.org/join?group=${syndicate.groupCode}`
    : `https://luckyly.org/join`;

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // fallback
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim() || !userProfile) return;

    try {
      setIsJoining(true);
      setJoinError(null);
      setJoinSuccess(null);

      const updated = await joinSyndicateGroup(joinCodeInput.trim(), userProfile);
      setSyndicate(updated);
      setJoinSuccess(`Successfully joined syndicate ${updated.groupCode}!`);
      setJoinCodeInput('');
    } catch (err: any) {
      setJoinError(err?.message || 'Failed to join syndicate group.');
    } finally {
      setIsJoining(false);
    }
  };

  const activeBalance = activeUser ? activeUser.coinBalance : (userProfile?.totalCoins ?? 0);
  const userProgressPercent = Math.min(100, Math.max(0, (activeBalance / 1600) * 100));
  const hasSecuredTicket = activeBalance >= 1600;

  const isSignedUp = Boolean(userProfile || activeUser || user);
  const hasRaffleTicket = Boolean(
    hasSecuredTicket ||
    userProfile?.has_claimed_bonus ||
    activeUser?.bonusClaimed
  );
  const isMilestone200Unlocked = isSignedUp && hasRaffleTicket;

  // Generate unique milestone badge ticket_id (TKT-MEMBER-[hash]) automatically when balance hits 1,600 Coins
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

  const activeBadgeCode = ticketId || activeUser?.memberBadgeId || 'TKT-MEMBER-VERIFIED';

  const handleCopyBadge = async () => {
    trackBadgeCopy(activeBadgeCode, 'DrawShowcase');
    await copyMemberBadgeId(activeBadgeCode);
    setBadgeCopied(true);
    setTimeout(() => setBadgeCopied(false), 2000);
  };

  const membersCount = syndicate?.members.length || 1;
  const emptySlotsCount = Math.max(0, 5 - membersCount);

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* 0. Pending Questionnaire Action Banner (Prominently shown when member has not completed survey) */}
      {isQuestionnairePending && onOpenQuestionnaire && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/80 via-[#14121c] to-[#0a0b12] border-2 border-amber-500/50 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5 text-left w-full md:w-auto">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/25 to-red-950/40 border border-amber-500/50 flex items-center justify-center text-amber-300 shrink-0 shadow-lg">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white">
                  Pending Task: 6-Question Research Survey
                </span>
                <span className="text-[10px] font-mono font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  +100 Coins Boost
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Share your reward preferences to earn +100 Coins, reach 1,600 total, and activate your Member Pass.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onOpenQuestionnaire?.();
            }}
            className="w-full md:w-auto py-2.5 px-5 rounded-xl bg-gradient-to-r from-red-800 via-red-700 to-red-800 hover:from-red-700 text-amber-50 font-bold text-xs sm:text-sm border border-amber-400/50 shadow-xl shadow-red-950/60 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Complete Questionnaire (+100)</span>
            <ArrowRight className="w-4 h-4 text-amber-300" />
          </button>
        </div>
      )}

      {/* 1. Header Banner & Status Bar */}
      <div className="bg-gradient-to-r from-red-950/40 via-[#10121a] to-amber-950/30 border border-amber-500/30 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Verified Waitlist Member</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-luxury font-bold text-white">
              Community Milestone Showcase & Team Pools
            </h2>
            <p className="text-xs text-slate-400">
              Your member waitlist pass is registered in our Secure Entry History.
            </p>
          </div>
        </div>

        {/* Dual Stat Badges */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Active Ticket / Pass with Copy functionality */}
          <button
            type="button"
            onClick={handleCopyBadge}
            className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-[#090b12] hover:bg-[#121520] border border-red-500/40 hover:border-red-400/60 transition-all flex items-center gap-2.5 cursor-pointer text-left group"
            title="Click to copy Member Pass Badge ID"
            aria-label={`Copy Badge ID ${activeBadgeCode}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasSecuredTicket ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              <Ticket className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                <span>Member Pass</span>
                {badgeCopied ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-500 group-hover:text-amber-300 transition-colors" />
                )}
              </div>
              <div className="text-xs sm:text-sm font-bold text-white font-mono">
                {activeBadgeCode}
              </div>
            </div>
          </button>

          {/* Active Coin Balance */}
          <button
            onClick={() => {
              onOpenLedger?.();
            }}
            className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-[#090b12] border border-amber-500/40 hover:border-amber-400/70 transition-colors flex items-center gap-2.5 cursor-pointer text-left"
            title="Secure Entry History"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Coins className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <div className="text-[10px] text-amber-400/80 uppercase font-semibold">Total Coins</div>
              <div className="text-sm font-bold text-amber-300 font-mono">
                {activeBalance.toLocaleString()} Coins
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Interactive Expandable Milestone Rules & Disclosure Accordion */}
      <details className="group rounded-2xl bg-[#090b10] border border-amber-500/25 text-slate-300 text-xs shadow-xl overflow-hidden transition-all">
        <summary className="p-4 sm:p-5 flex items-center justify-between cursor-pointer list-none select-none hover:bg-white/[0.02] transition-colors">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold text-amber-300">View Milestone Rules & Delivery Details</span>
            <span className="text-slate-500 text-[11px] hidden sm:inline">· Click to view transparency terms</span>
          </div>
          <ChevronDown className="w-4 h-4 text-amber-400 transition-transform duration-300 group-open:rotate-180" />
        </summary>
        <div className="px-5 pb-5 pt-2 border-t border-amber-500/10 text-xs space-y-2.5 leading-relaxed text-slate-300/90">
          <p>
            <strong className="text-amber-200">100% Free & Equal Odds:</strong> Participation in community milestones is strictly free with zero purchase or cryptocurrency requirement. Every verified registrant maintains equal odds regardless of join date or coin balance.
          </p>
          <p>
            <strong className="text-amber-200">Active Milestone 1 Draw:</strong> The $5 Amazon Gift Card milestone draw is unlocked upon reaching 200 eligible registrations. Fulfilled digitally via official Amazon store voucher codes (.com, .co.uk, .ca, .de, .co.jp, .com.au).
          </p>
          <p>
            <strong className="text-amber-200">Illustrative Future Unlocks:</strong> Milestones beyond 200 scale by an illustrative +$5 increment per tier ($10 at 500, $15 at 1,500, $20 at 4,000, $25 at 10,000). All future rewards are illustrative examples only and subject to official legal terms before execution.
          </p>
        </div>
      </details>

      {/* 2. Milestone Tier Hero: 200 Registrations — $5 Amazon Gift Card (+ $5 every milestone) */}
      <div
        onMouseEnter={() => handleMilestoneHoverStart('milestone_200_tier', 'Milestone 1 — $5 Amazon Gift Card')}
        onMouseLeave={() => handleMilestoneHoverEnd('milestone_200_tier')}
        className="relative rounded-3xl bg-gradient-to-br from-[#12141f] via-[#0b0c12] to-[#07080c] border border-amber-500/35 overflow-hidden shadow-2xl transition-all"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-red-900/15 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-10 items-center">
          
          {/* Left: Active Milestone Prize Card / Luckyly Gold Mystery Vault Box */}
          <div className="lg:col-span-5 space-y-4">
            <LuckylyMysteryBox
              size="hero"
              targetCount={200}
              isUnlocked={isMilestone200Unlocked}
              prizeTitle="$5 Amazon Gift Card"
            />

            {/* Ticket Certificate Banner with Copy Action */}
            <button
              type="button"
              onClick={handleCopyBadge}
              className="p-3.5 rounded-xl bg-[#08090f] hover:bg-[#121520] border border-slate-800 hover:border-amber-500/40 transition-all flex items-center justify-between text-xs font-mono w-full cursor-pointer group"
              title="Click to copy badge ID"
            >
              <div className="flex items-center gap-2 text-slate-400">
                <Ticket className={`w-4 h-4 ${hasSecuredTicket ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span>Pass Status:</span>
                <span className={`font-bold ${hasSecuredTicket ? 'text-emerald-300' : 'text-amber-400'}`}>
                  Badge [{activeBadgeCode}]
                </span>
              </div>
              <span className={`font-bold text-[11px] px-2 py-0.5 rounded border flex items-center gap-1 ${
                hasSecuredTicket
                  ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30'
                  : 'text-amber-300 bg-amber-950/40 border-amber-500/30'
              }`}>
                {badgeCopied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-300" />
                    <span>COPIED!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-400 group-hover:text-amber-300" />
                    <span>{hasSecuredTicket ? 'COPY BADGE ID' : `${Math.max(0, 1600 - activeBalance)} COINS`}</span>
                  </>
                )}
              </span>
            </button>
          </div>

          {/* Right: Milestone Progress & Scheduled Tiers */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Community Milestone Schedule · +$5 Every Milestone</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-luxury font-bold text-white leading-tight">
                Community Milestones & Prize Growth
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl font-light">
                Our free community milestone starts with a $5 Amazon gift card at 200 registrations. Each subsequent milestone adds another $5 as an illustrative future milestone concept.
              </p>
            </div>

            {/* Target 200 Registrations Progress Strip */}
            <div className="p-4 rounded-2xl bg-[#08090f] border border-amber-500/25 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-amber-300 font-semibold uppercase tracking-wider text-[11px]">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Milestone 1 Progress (200 Members)</span>
                </span>
                <span className="text-[11px] font-mono text-amber-300 font-bold">
                  {liveRegistrationCount} / 200 ({Math.min(100, Math.round((liveRegistrationCount / 200) * 100))}%)
                </span>
              </div>

              <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-amber-300 rounded-full transition-all duration-500 shadow-sm shadow-amber-400/50"
                  style={{ width: `${Math.min(100, Math.max(0, (liveRegistrationCount / 200) * 100))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>{Math.max(0, 200 - liveRegistrationCount)} more verified signups needed to unlock $5 Amazon Draw</span>
                <span className="text-amber-400/80 font-mono">100% Free Entry</span>
              </div>
            </div>

            {/* Compact Milestone Tiers Grid: Luckyly Gold Mystery Vault Boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
              {MILESTONE_TARGETS.map(m => {
                const isUnlocked = m.isFirstMilestone && isMilestone200Unlocked;
                return (
                  <LuckylyMysteryBox
                    key={m.id}
                    size="compact"
                    targetCount={m.targetCount}
                    isUnlocked={isUnlocked}
                    prizeTitle={m.prizeTitle || `$${m.prizeAmount} Prize`}
                  />
                );
              })}
            </div>

            {/* Live Countdown Timer */}
            <div className="p-4 rounded-2xl bg-[#08090f] border border-amber-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-amber-300 font-semibold uppercase tracking-wider text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Target Launch Countdown
                </span>
                <span className="text-[11px] font-mono text-slate-400">{PLANNED_LAUNCH_DATE}</span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center pt-1">
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-lg sm:text-2xl font-black text-amber-300 font-mono">
                    {timeLeft.days}
                  </div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider">Days</div>
                </div>

                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-lg sm:text-2xl font-black text-white font-mono">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider">Hours</div>
                </div>

                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-lg sm:text-2xl font-black text-white font-mono">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider">Mins</div>
                </div>

                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-lg sm:text-2xl font-black text-amber-400 font-mono">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider">Secs</div>
                </div>
              </div>
            </div>

            {/* Individual Qualification Progress Bar (Tied directly to: (userBalance / 1600) * 100) */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>Member Pass Qualification</span>
                </span>
                <span className="text-amber-300 font-mono font-bold">
                  {activeBalance} / 1,600 Coins ({Math.round(userProgressPercent)}%)
                </span>
              </div>

              <div className="w-full h-2.5 bg-[#08090f] rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-amber-300 rounded-full transition-all duration-500 shadow-sm shadow-amber-400/50"
                  style={{ width: `${userProgressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                {!hasSecuredTicket && onOpenQuestionnaire ? (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenQuestionnaire();
                    }}
                    className="text-amber-400 hover:text-amber-300 font-medium underline cursor-pointer text-left flex items-center gap-1"
                  >
                    <span>Complete Survey / Trivia to unlock pass (+100 Coins) →</span>
                  </button>
                ) : (
                  <span>
                    {hasSecuredTicket
                      ? '100% Qualified · Member Pass Unlocked'
                      : 'Earn 1,600 Coins via Waitlist + Questionnaire to unlock pass'}
                  </span>
                )}
                <span className="text-amber-400 font-medium font-mono">
                  {hasSecuredTicket && activeBadgeCode ? `Badge [${activeBadgeCode}]` : `${Math.max(0, 1600 - activeBalance)} Coins to Unlock`}
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 3. "Play with Friends & Family" 5-Person Team Pool Mechanic */}
      <div
        onMouseEnter={() => handleMilestoneHoverStart('syndicate_5person_pool', 'Play with Friends & Family (5-Person Team Pool)')}
        onMouseLeave={() => handleMilestoneHoverEnd('syndicate_5person_pool')}
        className="rounded-3xl bg-gradient-to-b from-[#11131b] via-[#0c0e14] to-[#08090d] border-2 border-amber-500/40 p-6 sm:p-10 shadow-2xl space-y-8 transition-all"
      >
        
        {/* Team Pool Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-amber-500/20 pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold tracking-widest uppercase">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>5-PERSON TEAM POOL</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-luxury font-bold text-white tracking-tight">
              Play with Friends & Family
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Form a 5-person team pool with friends or family to progress through community milestone tiers together! Strictly capped at 5 members per pool.
            </p>
          </div>

          {/* Member Capacity Counter */}
          <div className="px-5 py-3 rounded-2xl bg-[#090b12] border border-amber-400/50 text-center shrink-0">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Pool Roster
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono">
              {membersCount} <span className="text-slate-500 font-normal">/ 5 spots filled</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">
              {emptySlotsCount > 0 ? `${emptySlotsCount} spots open` : 'Pool Full (Max 5)'}
            </span>
          </div>
        </div>

        {/* Team Pool Share ID & Instant Copy Link Button */}
        <div className="p-5 rounded-2xl bg-[#08090f] border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Your Unique Team Pool ID
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono tracking-widest flex items-center justify-center sm:justify-start gap-2">
              <span>{syndicate?.groupCode || 'LKY-XXXX'}</span>
              <span className="text-[10px] font-sans font-bold bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/40">
                ACTIVE
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopyInviteLink}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-red-700 via-red-600 to-red-800 hover:from-red-600 hover:to-red-700 text-amber-100 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-red-950/60 border border-amber-400/50 flex items-center justify-center gap-2 cursor-pointer group"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Invite Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
                  <span>Copy Invite Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 5-Slot Visual Roster Display */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
              Team Pool Members (Max 5)
            </span>
            <span>All members share milestone progress privileges</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Render Filled Slots */}
            {syndicate?.members.map((member, index) => (
              <div
                key={member.userId}
                className="p-4 rounded-2xl bg-gradient-to-b from-[#131522] to-[#0a0c14] border border-amber-500/40 relative overflow-hidden flex flex-col justify-between h-36 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-amber-400/80 font-bold">
                    Slot {index + 1} of 5
                  </span>
                  {member.isLeader && (
                    <span className="text-[9px] uppercase font-bold bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-full font-mono">
                      LEADER
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 font-bold text-sm shrink-0">
                    {member.photoURL ? (
                      <img src={member.photoURL} alt={member.displayName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      member.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-white truncate">
                      {member.displayName}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {member.userId === userProfile?.userId ? '(You)' : 'Verified Member'}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <Ticket className="w-3 h-3" />
                  <span>1 Member Pass Pooled</span>
                </div>
              </div>
            ))}

            {/* Render Empty Open Slots up to 5 */}
            {Array.from({ length: emptySlotsCount }).map((_, i) => (
              <button
                key={`empty-slot-${i}`}
                onClick={handleCopyInviteLink}
                className="p-4 rounded-2xl bg-[#07080d]/60 border border-dashed border-amber-500/25 hover:border-amber-400/60 transition-colors flex flex-col items-center justify-center h-36 gap-2 text-center group cursor-pointer"
                title="Click to copy invite link for this spot"
              >
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 text-slate-500 group-hover:text-amber-400 group-hover:border-amber-400/40 flex items-center justify-center transition-colors">
                  <UserPlus className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div className="text-xs font-semibold text-slate-400 group-hover:text-amber-200 transition-colors">
                  + Invite Spot {membersCount + i + 1}
                </div>
                <span className="text-[9px] text-slate-600 group-hover:text-amber-400/80 font-mono">
                  Share invite link
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Join An Existing Team Pool by Code Form */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            Have a friend's Team Pool Code? Enter it below to join their 5-person crew:
          </div>

          <form onSubmit={handleJoinByCode} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={joinCodeInput}
              onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. LKY-8X92"
              maxLength={12}
              className="px-3.5 py-2.5 rounded-xl bg-[#08090f] border border-slate-700 text-white text-xs font-mono uppercase focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 placeholder:text-slate-600 w-36"
            />
            <button
              type="submit"
              disabled={isJoining || !joinCodeInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-200 text-xs font-bold transition-colors cursor-pointer shrink-0 border border-amber-500/30"
            >
              {isJoining ? 'Joining...' : 'Join Crew'}
            </button>
          </form>
        </div>

        {joinError && (
          <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{joinError}</span>
          </div>
        )}

        {joinSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{joinSuccess}</span>
          </div>
        )}

      </div>

    </div>
  );
};
