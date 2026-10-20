/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useUser } from '../context/UserContext.tsx';
import { Heart, ArrowRight, Sparkles, CheckCircle2, UserPlus, Users, TrendingUp, Gift, MessageSquare, ShieldCheck } from 'lucide-react';

interface HowItWorksProps {
  onJoinWaitlist: () => void;
  onOpenQuestionnaire?: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
  onOpenFaq?: () => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({
  onJoinWaitlist,
  onOpenQuestionnaire,
  onOpenTerms,
  onOpenPrivacy,
  onOpenFaq,
}) => {
  const { user, userProfile } = useAuth();
  const { memberUser } = useUser();
  const isEnrolled = Boolean(user || memberUser);
  const isQuestionnaireCompleted = Boolean(
    userProfile?.questionnaireCompleted ||
    userProfile?.has_completed_questionnaire ||
    memberUser?.questionnaireCompleted
  );

  const steps = [
    {
      number: '01',
      title: 'Join the Free Waitlist',
      description: 'Sign up in seconds and select your Amazon store region. 100% free with no purchase necessary. Eligible signups receive 1,500 Member Coins.',
      icon: UserPlus,
    },
    {
      number: '02',
      title: 'Join a Growing Community',
      description: 'Connect with a transparent group of members who value quality rewards, clear rules, and authentic community experiences.',
      icon: Users,
    },
    {
      number: '03',
      title: 'Follow Community Milestones',
      description: 'Reaching 200 members unlocks our active $5 Amazon Gift Card draw. Future milestones scale by +$5 as illustrative community targets.',
      icon: TrendingUp,
    },
    {
      number: '04',
      title: 'Explore Future Milestone Concepts',
      description: 'All showcase items beyond Milestone 1 are illustrative examples only. Registration tracks member standing with no paid purchases or pay-to-win.',
      icon: Gift,
    },
    {
      number: '05',
      title: 'Influence Future Reward Choices',
      description: 'Complete our short research questionnaire (+100 Member Coins) to tell our team what rewards you desire for our October 16, 2026 launch.',
      icon: MessageSquare,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-[#07080a] border-b border-amber-500/15 relative overflow-hidden">
      {/* Ambient warm glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-72 bg-gradient-to-r from-red-950/15 via-amber-500/10 to-red-950/15 blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10 text-center">
        
        {/* Subtle Heart / Community Accent */}
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 mx-auto mb-6 flex items-center justify-center text-amber-300">
          <Heart className="w-6 h-6 fill-amber-400/20 text-amber-400" />
        </div>

        {/* Section Heading */}
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-luxury font-bold text-white tracking-tight leading-tight mb-4">
          How Luckyly Works
        </h2>

        {/* Concise Subhead */}
        <p className="text-base sm:text-lg text-slate-300 font-light leading-relaxed max-w-2xl mx-auto mb-10">
          A straightforward, honest waitlist experience built on community milestones and member progression.
        </p>

        {/* Interactive Expandable Accordion for Rules & Delivery */}
        <details className="group max-w-3xl mx-auto mb-10 rounded-2xl bg-[#0b0c10] border border-amber-500/25 text-left text-xs text-slate-300 shadow-xl overflow-hidden transition-all">
          <summary className="p-4 flex items-center justify-between cursor-pointer list-none select-none hover:bg-white/[0.02] transition-colors">
            <span className="font-semibold text-amber-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>How Milestone Rewards & Amazon Region Codes Work</span>
            </span>
            <span className="text-amber-400 text-[11px] font-mono group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="px-5 pb-5 pt-2 border-t border-amber-500/10 space-y-2 text-slate-300/90 leading-relaxed">
            <p>
              • <strong className="text-amber-200">1,500 Initial Member Coins:</strong> Eligible signups within the first 10,000 receive 1,500 virtual Member Coins (plus +100 Coins for completing the research questionnaire to reach the 1,600 qualification threshold).
            </p>
            <p>
              • <strong className="text-amber-200">Active Milestone 1 ($5 Amazon Gift Card):</strong> Unlocked at 200 verified members. Selecting your preferred Amazon region (.com, .co.uk, .ca, .de, .co.jp, .com.au) ensures digital voucher compatibility.
            </p>
            <p>
              • <strong className="text-amber-200">+$5 Milestone Scaling (Illustrative Examples Only):</strong> Subsequent community milestones scale by +$5 ($10 at 500, $15 at 1,500, $20 at 4,000, $25 at 10,000) as illustrative future milestone concepts. Equal odds apply to all verified members.
            </p>
          </div>
        </details>

        {/* 5 Clear How It Works Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 text-left mb-14">
          {steps.map(step => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="p-5 rounded-2xl bg-[#0b0c10] border border-amber-500/20 hover:border-amber-400/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      STEP {step.number}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-2 leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-light">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Clean Call to Action & Navigation Links */}
        <div className="rounded-3xl bg-[#0b0c10]/90 border border-amber-500/25 p-6 sm:p-8 shadow-2xl max-w-3xl mx-auto text-center space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!isEnrolled ? (
              <button
                type="button"
                onClick={onJoinWaitlist}
                className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-gradient-to-r from-red-800 via-red-700 to-red-800 hover:from-red-700 text-amber-50 font-semibold text-sm border border-amber-400/40 shadow-lg shadow-red-950/40 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
              >
                <span>Join the Free Waitlist</span>
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </button>
            ) : !isQuestionnaireCompleted && onOpenQuestionnaire ? (
              <button
                type="button"
                onClick={onOpenQuestionnaire}
                className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-gradient-to-r from-red-800 via-red-700 to-red-800 hover:from-red-700 text-amber-100 font-semibold text-sm border border-amber-400/40 shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Tell Us What Rewards You Like (+100 Coins)</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                <span>You are on the waitlist with 1,500 Coins entitled!</span>
              </div>
            )}
          </div>

          {/* Quick Legal & Rules Links */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Full Transparency:</span>
            </span>
            {onOpenTerms && (
              <button
                type="button"
                onClick={onOpenTerms}
                className="hover:text-amber-300 transition-colors cursor-pointer underline underline-offset-2"
              >
                Terms of Use
              </button>
            )}
            {onOpenPrivacy && (
              <button
                type="button"
                onClick={onOpenPrivacy}
                className="hover:text-amber-300 transition-colors cursor-pointer underline underline-offset-2"
              >
                Privacy Policy
              </button>
            )}
            {onOpenFaq && (
              <button
                type="button"
                onClick={onOpenFaq}
                className="hover:text-amber-300 transition-colors cursor-pointer underline underline-offset-2"
              >
                FAQ
              </button>
            )}
          </div>
        </div>

      </div>
    </section>
  );
};
