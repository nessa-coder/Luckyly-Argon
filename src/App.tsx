/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar, NavTab } from './components/Navbar.tsx';
import { HeroWaitlist } from './components/HeroWaitlist.tsx';
import { IllustrativeRewards } from './components/IllustrativeRewards.tsx';
import { HowItWorks } from './components/HowItWorks.tsx';
import { VisionSection } from './components/VisionSection.tsx';
import { WaitlistInvitation } from './components/WaitlistInvitation.tsx';
import { AboutPage } from './components/AboutPage.tsx';
import { FaqSection } from './components/FaqSection.tsx';
import { TransparencyCenter } from './components/TransparencyCenter.tsx';
import { QuestionnaireModal } from './components/QuestionnaireModal.tsx';
import { CoinLedgerView } from './components/CoinLedgerView.tsx';
import { EmailInboxModal } from './components/EmailInboxModal.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { CelebrationToast } from './components/CelebrationToast.tsx';
import { LegalModal } from './components/LegalModal.tsx';
import { FirstPrizeRevealModal } from './components/FirstPrizeRevealModal.tsx';
import { BonusEntryModal } from './components/BonusEntryModal.tsx';
import { LuckylyLogo } from './components/LuckylyLogo.tsx';
import { DrawShowcase } from './components/DrawShowcase.tsx';
import { OnboardingFlow } from './components/OnboardingFlow.tsx';
import { soundService } from './services/soundService.ts';
import { Draw, DrawEntry } from './types/luckyly.ts';
import { ensureSeedDrawsExist, subscribeToDraws, getUserAllEntries } from './services/drawService.ts';
import { subscribeToUserEmails } from './services/emailService.ts';
import { trackEvent } from './services/analyticsService.ts';
import { UserProvider, useUser } from './context/UserContext.tsx';
import { useBehavioralAnalytics } from './hooks/useBehavioralAnalytics.ts';
import { CopiedBadgeToast } from './components/CopiedBadgeToast.tsx';
import { NessaProvider } from './context/NessaContext.tsx';
import { NessaMascot } from './components/NessaMascot.tsx';
import { HelpUsImproveButton } from './components/HelpUsImproveButton.tsx';
import { BugReportModal } from './components/BugReportModal.tsx';

function LuckylyMain() {
  // Cookieless Behavioral Analytics (automated scroll depth 25%, 50%, 75%, 100% and events)
  useBehavioralAnalytics();

  // Member Badge Local State & Clipboard Toast
  const { copiedToast, dismissCopiedToast } = useUser();

  const {
    user,
    userProfile,
    rewardEarnedNotice,
    clearRewardNotice,
    signInWithGoogle,
    showFirstPrizeReveal,
    setShowFirstPrizeReveal,
  } = useAuth();
  
  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(false);
  const [questionnaireOpen, setQuestionnaireOpen] = useState<boolean>(false);
  const [ledgerOpen, setLedgerOpen] = useState<boolean>(false);
  const [emailInboxOpen, setEmailInboxOpen] = useState<boolean>(false);
  const [adminOpen, setAdminOpen] = useState<boolean>(false);
  const [bonusEntryOpen, setBonusEntryOpen] = useState<boolean>(false);

  // Background draws data (preserved for transparency & admin ledger)
  const [draws, setDraws] = useState<Draw[]>([]);
  const [userEntries, setUserEntries] = useState<DrawEntry[]>([]);

  // Email count
  const [emailCount, setEmailCount] = useState<number>(0);

  // Legal Modal
  const [legalOpen, setLegalOpen] = useState<boolean>(false);
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms'>('privacy');

  // Bug Report to Nessa Modal
  const [bugReportOpen, setBugReportOpen] = useState<boolean>(false);

  const handleScrollToSection = (sectionId: string) => {
    if (activeTab !== 'home') {
      setActiveTab('home');
    }
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 120);
  };

  // Browser URL / Path routing support
  useEffect(() => {
    const handleLocationChange = () => {
      // 1. Parse and persist any referral group code from URL
      const searchParams = new URLSearchParams(window.location.search);
      const refCode = searchParams.get('group') || searchParams.get('ref') || searchParams.get('referral');
      if (refCode && refCode.trim()) {
        localStorage.setItem('luckyly_pending_referral_group', refCode.trim().toUpperCase());
      }

      const path = window.location.pathname.replace(/^\//, '').toLowerCase();
      if (path === 'dashboard' || path === 'draw' || path === 'join') {
        setActiveTab('draw');
      } else if (path === 'questionnaire') {
        setQuestionnaireOpen(true);
      } else if (path === 'bonus') {
        setBonusEntryOpen(true);
      } else if (path === 'vision') {
        setActiveTab('vision');
      } else if (path === 'about') {
        setActiveTab('about');
      } else if (path === 'faq') {
        setActiveTab('faq');
      } else if (path === 'transparency') {
        setActiveTab('transparency');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Post-Auth Redirection & Persistent Welcome Modal State
  const prevUserRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!user || !userProfile) {
      prevUserRef.current = null;
      return;
    }

    const hasCompletedQ = !!(userProfile.has_completed_questionnaire || userProfile.questionnaireCompleted);
    const hasClaimedBonus = !!userProfile.has_claimed_bonus;

    // Fresh sign-in only: trigger welcome modal strictly ONCE per user lifecycle using persistent localStorage
    if (prevUserRef.current !== user.uid) {
      prevUserRef.current = user.uid;
      const hasSeen = localStorage.getItem('hasSeenWelcome');
      if (!hasSeen && (!hasCompletedQ || !hasClaimedBonus)) {
        setOnboardingOpen(true);
        localStorage.setItem('hasSeenWelcome', 'true');
      }
    }
  }, [user, userProfile]);

  // Initial seed and real-time subscription
  useEffect(() => {
    trackEvent('landing_page_view');
    ensureSeedDrawsExist();

    // Attach user gesture listener for opening audio chime
    soundService.attachAutoplayUnlock();

    const unsubscribeDraws = subscribeToDraws(allDraws => {
      setDraws(allDraws);
    });

    return () => unsubscribeDraws();
  }, []);

  // Fetch and subscribe to user entries and transactional dispatches
  useEffect(() => {
    if (!userProfile) {
      setUserEntries([]);
      setEmailCount(0);
      return;
    }

    getUserAllEntries(userProfile.userId).then(entries => {
      setUserEntries(entries);
    });

    const unsubscribeEmails = subscribeToUserEmails(userProfile.userId, emails => {
      setEmailCount(emails.length);
    });

    return () => unsubscribeEmails();
  }, [userProfile]);

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      
      {/* Top Luxury Navbar */}
      <Navbar
        onOpenQuestionnaire={() => {
          setOnboardingOpen(false);
          setQuestionnaireOpen(true);
        }}
        onOpenLedger={() => setLedgerOpen(true)}
        onOpenEmailInbox={() => setEmailInboxOpen(true)}
        onOpenAdmin={() => setAdminOpen(true)}
        onOpenBonusEntry={() => setBonusEntryOpen(true)}
        onNavigateTab={tab => setActiveTab(tab)}
        onScrollToSection={handleScrollToSection}
        activeTab={activeTab}
        unreadEmailCount={emailCount}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <div>
            {/* 1. First Screen: Hero Section (Compact Brand, Primary Luckyly Benefits Above Fold, Action CTA & Milestones) */}
            <HeroWaitlist
              onOpenQuestionnaire={() => setQuestionnaireOpen(true)}
              onExploreRewards={() => handleScrollToSection('future-rewards')}
              onDiscoverVision={() => handleScrollToSection('how-it-works')}
              onOpenFirstPrizeReveal={() => setShowFirstPrizeReveal(true)}
              onOpenBonusEntry={() => setBonusEntryOpen(true)}
            />

            {/* 2. Future Rewards: Real recognizable consumer products and experiences (Directly beneath Hero) */}
            <IllustrativeRewards />

            {/* 3. How It Works: Straightforward waitlist experience (Immediately following Future Rewards) */}
            <HowItWorks
              onJoinWaitlist={() => {
                if (!user) {
                  signInWithGoogle();
                } else if (!userProfile?.questionnaireCompleted) {
                  setQuestionnaireOpen(true);
                } else {
                  handleScrollToSection('future-rewards');
                }
              }}
              onOpenQuestionnaire={() => setQuestionnaireOpen(true)}
              onOpenTerms={() => {
                setLegalTab('terms');
                setLegalOpen(true);
              }}
              onOpenPrivacy={() => {
                setLegalTab('privacy');
                setLegalOpen(true);
              }}
              onOpenFaq={() => handleScrollToSection('faq')}
            />

            {/* Nessa cat avatar module: hidden / commented out per landing page layout requirements */}
            {/* <div className="hidden" aria-hidden="true" id="nessa-cat-avatar-module" /> */}

            {/* 4. Transparency: Public accountability, thresholds, and immutable audit logs */}
            <TransparencyCenter />

            {/* 5. FAQ: Questions and answers in plain, clear language */}
            <FaqSection />

            {/* 6. Closing Invitation: Help us make Luckyly better / Want to be part of it? */}
            <WaitlistInvitation
              onOpenQuestionnaire={() => setQuestionnaireOpen(true)}
            />
          </div>
        )}

        {/* Dedicated Separate Pages */}
        {activeTab === 'vision' && (
          <VisionSection isDedicatedPage />
        )}

        {activeTab === 'about' && (
          <AboutPage
            onJoinWaitlist={() => {
              if (!user) {
                signInWithGoogle();
              } else {
                setActiveTab('home');
              }
            }}
          />
        )}

        {activeTab === 'faq' && (
          <FaqSection isDedicatedPage />
        )}

        {activeTab === 'transparency' && (
          <TransparencyCenter />
        )}

        {/* Draw Showcase & 5-Person Team Pool */}
        {(activeTab === 'draw' || activeTab === 'dashboard') && (
          <DrawShowcase
            onOpenLedger={() => setLedgerOpen(true)}
            onExploreMoreRewards={() => handleScrollToSection('future-rewards')}
            onOpenQuestionnaire={() => setQuestionnaireOpen(true)}
          />
        )}

        {/* Dedicated Questionnaire Screen */}
        {activeTab === 'questionnaire' && (
          <div className="py-8 px-4 max-w-xl mx-auto">
            <QuestionnaireModal
              isOpen={true}
              onClose={() => setActiveTab('home')}
              onCoinsAwarded={() => {}}
              onAdvanceToDraw={() => setActiveTab('draw')}
              isDedicatedView={true}
            />
          </div>
        )}

        {/* Dedicated Bonus Claim Screen */}
        {activeTab === 'bonus' && (
          <div className="py-8 px-4 max-w-xl mx-auto">
            <BonusEntryModal
              isOpen={true}
              onClose={() => setActiveTab('home')}
              onOpenQuestionnaire={() => setQuestionnaireOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Prominent Legal Disclaimer Box Directly Above Footer */}
      <div className="border-t border-amber-500/15 bg-[#06070a] py-6 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto p-4 sm:p-5 rounded-2xl bg-[#090b10] border border-amber-500/30 text-slate-300 text-xs shadow-xl">
          <div className="flex items-start gap-3 text-left">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px] sm:text-xs text-slate-300">
              <strong className="text-amber-300 font-semibold">Disclaimer: </strong>
              Luckyly.org is currently in an early member waitlist phase. All future prizes, rewards, and milestone figures beyond the active 200-member $5 Amazon Gift Card milestone are illustrative examples only of potential future community tier concepts. Registration grants member waitlist placement and coin balance tracking only; it does not constitute a paid contest, legal contract, or guaranteed award. Official rules, terms, and verified eligibility requirements will be published prior to any future platform launch.
            </div>
          </div>
        </div>
      </div>

      {/* Luxury Footer */}
      <footer className="border-t border-amber-500/15 bg-[#030406] py-14 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <LuckylyLogo size={30} />
            <span className="text-slate-700 hidden sm:inline">|</span>
            <span className="text-amber-200/70 font-light tracking-wider text-[11px] uppercase">
              Phase 1 Waitlist
            </span>
            <span className="text-slate-700 hidden sm:inline">·</span>
            <span className="text-slate-500 text-[11px] font-mono">
              Target Launch: October 16, 2026
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 text-slate-400 text-[11px] font-light">
            <button
              onClick={() => {
                setActiveTab('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Overview
            </button>
            <button
              onClick={() => {
                setActiveTab('vision');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Vision
            </button>
            <button
              onClick={() => {
                setActiveTab('about');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              About
            </button>
            <button
              onClick={() => handleScrollToSection('future-rewards')}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Future Rewards
            </button>
            <button
              onClick={() => handleScrollToSection('transparency')}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Transparency
            </button>
            <button
              onClick={() => handleScrollToSection('faq')}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              FAQ
            </button>
            <button
              onClick={() => setLedgerOpen(true)}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Coin Ledger
            </button>
            <button
              onClick={() => setEmailInboxOpen(true)}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Dispatches
            </button>
            <span className="text-slate-800">|</span>
            <button
              onClick={() => {
                setLegalTab('privacy');
                setLegalOpen(true);
              }}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => {
                setLegalTab('terms');
                setLegalOpen(true);
              }}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Terms of Use
            </button>
            <span className="text-slate-800">|</span>
            <button
              onClick={() => setBugReportOpen(true)}
              className="hover:text-amber-300 transition-colors cursor-pointer text-amber-400/90 font-medium"
            >
              Report to Nessa
            </button>
            <span className="text-slate-800">|</span>
            <a
              href="mailto:nessa@luckyly.org"
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Contact
            </a>
          </div>

          <div className="text-[11px] text-slate-500 font-mono text-center md:text-right">
            © 2026 Luckyly. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Modals & Overlays */}
      {/* 4-Step Sequential Onboarding Sequence */}
      <OnboardingFlow
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onComplete={() => {
          setOnboardingOpen(false);
          setActiveTab('home');
          setTimeout(() => {
            const milestonesEl = document.getElementById('milestones');
            if (milestonesEl) {
              milestonesEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        }}
      />

      <QuestionnaireModal
        isOpen={questionnaireOpen}
        onClose={() => setQuestionnaireOpen(false)}
        onCoinsAwarded={() => {
          // Handled via auth profile listener
        }}
        onAdvanceToDraw={() => {
          setQuestionnaireOpen(false);
          setActiveTab('draw');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <CoinLedgerView
        isOpen={ledgerOpen}
        onClose={() => setLedgerOpen(false)}
      />

      <EmailInboxModal
        isOpen={emailInboxOpen}
        onClose={() => setEmailInboxOpen(false)}
      />

      <AdminPanel
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        draws={draws}
      />

      <LegalModal
        isOpen={legalOpen}
        initialTab={legalTab}
        onClose={() => setLegalOpen(false)}
      />

      {/* Post-Signup First Milestone Announced Prize Reveal Modal */}
      <FirstPrizeRevealModal
        isOpen={showFirstPrizeReveal}
        onClose={() => setShowFirstPrizeReveal(false)}
        onOpenQuestionnaire={() => setQuestionnaireOpen(true)}
        userIndex={userProfile?.userIndex}
      />

      {/* A Complimentary Luckyly Privilege — Your Bonus Entry Modal */}
      <BonusEntryModal
        isOpen={bonusEntryOpen}
        onClose={() => setBonusEntryOpen(false)}
        onOpenQuestionnaire={() => setQuestionnaireOpen(true)}
      />

      {/* Real-time Coin Reward Celebration Toast */}
      <CelebrationToast
        notice={rewardEarnedNotice}
        onClose={clearRewardNotice}
        onViewLedger={() => setLedgerOpen(true)}
      />

      {/* Visual Member Badge Copied to Clipboard Notification Toast */}
      <CopiedBadgeToast
        badgeId={copiedToast?.badgeId || null}
        onClose={dismissCopiedToast}
      />

      {/* Floating Interactive Nessa Avatar with In-Place Video Animation */}
      <NessaMascot />

      {/* Floating 'Help Us Improve' Bug Report Trigger */}
      <HelpUsImproveButton onOpen={() => setBugReportOpen(true)} />

      {/* Bug Report to Nessa Modal */}
      <BugReportModal
        isOpen={bugReportOpen}
        onClose={() => setBugReportOpen(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <NessaProvider>
          <LuckylyMain />
        </NessaProvider>
      </UserProvider>
    </AuthProvider>
  );
}
