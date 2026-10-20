/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useUser } from '../context/UserContext.tsx';
import { Sparkles, CheckCircle2, Calendar } from 'lucide-react';
import { LuckylyLogo } from './LuckylyLogo.tsx';

interface WaitlistInvitationProps {
  onOpenQuestionnaire: () => void;
}

export const WaitlistInvitation: React.FC<WaitlistInvitationProps> = ({
  onOpenQuestionnaire,
}) => {
  const { user, userProfile, signInWithGoogle } = useAuth();
  const { memberUser } = useUser();
  const isEnrolled = Boolean(user || memberUser);
  const isQuestionnaireCompleted = Boolean(
    userProfile?.questionnaireCompleted ||
    userProfile?.has_completed_questionnaire ||
    memberUser?.questionnaireCompleted
  );
  const activeCoins = memberUser ? memberUser.coinBalance : (userProfile?.totalCoins ?? 0);
  const activeDisplayName = userProfile?.displayName || (memberUser?.email ? memberUser.email.split('@')[0] : 'Member');

  return (
    <section id="join" className="py-24 sm:py-32 bg-[#050608] relative overflow-hidden">
      
      {/* Ambient Radial Illumination */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-gradient-to-t from-red-950/20 via-amber-500/10 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 text-center">
        
        {/* Brand Emblem */}
        <div className="mb-6 flex justify-center">
          <div className="p-3 rounded-2xl bg-gradient-to-b from-[#141622]/80 to-[#07080c]/80 border border-amber-500/25 shadow-lg shadow-amber-500/10 backdrop-blur-sm">
            <LuckylyLogo size={44} variant="emblem" />
          </div>
        </div>

        {/* Section Pre-tag */}
        <div className="text-[11px] uppercase tracking-[0.25em] font-semibold text-amber-400/80 mb-3 font-mono">
          Help Shape Luckyly
        </div>

        {/* Requested Heading */}
        <h2 className="text-3xl sm:text-5xl font-luxury font-bold text-white tracking-tight leading-tight mb-4">
          Help us make Luckyly better.
        </h2>

        {/* Requested Text */}
        <p className="text-base sm:text-lg text-slate-300 font-light leading-relaxed max-w-xl mx-auto mb-10">
          Tell us what rewards you'd love to see. Your feedback will help shape what we build next.
        </p>

        {/* Simple CTA Card */}
        <div className="max-w-md mx-auto p-7 sm:p-8 rounded-3xl bg-[#090b10] border border-amber-500/30 shadow-2xl backdrop-blur-md">
          {!isEnrolled ? (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <h3 className="text-xl font-luxury font-bold text-white mb-1">
                  Want to be part of it?
                </h3>
                <p className="text-xs text-amber-300/80 font-light">
                  Join the waitlist. It's free.
                </p>
              </div>

              <button
                onClick={signInWithGoogle}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-red-800 via-red-700 to-red-900 hover:from-red-700 hover:to-red-800 text-amber-50 font-semibold text-sm sm:text-base border border-amber-400/35 shadow-xl shadow-red-950/50 flex items-center justify-center gap-3 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="w-5 h-5 bg-white rounded-full p-0.5 shadow-sm"
                />
                <span>Join the Waitlist</span>
              </button>

              <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 font-light pt-1">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  100% Free
                </span>
                <span>·</span>
                <span>No Credit Card</span>
                <span>·</span>
                <span>Unsubscribe Anytime</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-amber-400/80">
                    Waitlist Member
                  </div>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    {activeDisplayName}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                    Coins Earned
                  </div>
                  <div className="text-base font-bold text-amber-300 font-mono">
                    {activeCoins.toLocaleString()} Coins
                  </div>
                </div>
              </div>

              {!isQuestionnaireCompleted ? (
                <button
                  onClick={onOpenQuestionnaire}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 text-amber-100 border border-amber-400/40 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-950/40"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Answer a few quick questions (+100 Coins)</span>
                </button>
              ) : (
                <div className="w-full py-3 px-4 rounded-xl bg-[#0e1017] border border-amber-500/25 text-amber-300 text-xs font-medium flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>You're on the waitlist! Responses recorded.</span>
                </div>
              )}
            </div>
          )}

          {/* Official Launch Milestone */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] font-mono text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-amber-400/80" />
            <span>Target Platform Launch: October 16, 2026</span>
          </div>
        </div>

      </div>
    </section>
  );
};
