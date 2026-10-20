/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LuckylyLogo } from './LuckylyLogo.tsx';
import { Shield, Sparkles, Compass, Eye, ArrowRight } from 'lucide-react';

interface AboutPageProps {
  onJoinWaitlist: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onJoinWaitlist }) => {
  return (
    <div className="min-h-[85vh] bg-[#050608] text-slate-100 py-16 sm:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <LuckylyLogo size={48} />
          </div>
          <div className="text-[11px] uppercase tracking-[0.25em] font-semibold text-amber-400/80 mb-3">
            About Luckyly
          </div>
          <h1 className="text-3xl sm:text-5xl font-luxury font-bold text-white tracking-tight leading-tight mb-6">
            A new standard for rewards
          </h1>
          <p className="text-base sm:text-lg text-slate-300 font-light leading-relaxed max-w-2xl mx-auto">
            Luckyly was born from a simple realization: the digital rewards landscape has become overcrowded with shallow gimmicks, noisy gamification, and broken promises. We believe rewards should feel rare, elevated, and authentic.
          </p>
        </div>

        {/* Narrative Section 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 items-center">
          <div className="p-8 rounded-3xl bg-[#090b10] border border-amber-500/20 shadow-xl space-y-4">
            <div className="text-[10px] uppercase font-mono tracking-wider text-amber-400">
              ORIGINS & INSPIRATION
            </div>
            <h2 className="text-2xl font-luxury font-bold text-white">
              The Architecture of Restraint
            </h2>
            <p className="text-sm text-slate-300 font-light leading-relaxed">
              We draw inspiration from the quiet confidence of historic luxury houses combined with the precision of Swiss watchmaking and cutting-edge software architecture. Every visual element, from deep obsidian surfaces to brushed gold accents, is crafted to evoke exclusivity and anticipation.
            </p>
          </div>

          <div className="relative rounded-3xl overflow-hidden border border-amber-500/20 shadow-2xl aspect-[4/3] bg-black">
            <img
              src="/assets/hero-luxury.jpg"
              alt="Luckyly Architectural Atmosphere"
              className="w-full h-full object-cover filter brightness-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 text-[11px] font-mono text-amber-300/80">
              MINIMALISTIC · LUXURIOUS · MYSTERIOUS
            </div>
          </div>
        </div>

        {/* Narrative Section 2: Phase 1 Focus */}
        <div className="p-8 sm:p-10 rounded-3xl bg-[#0a0c12] border border-amber-500/25 mb-16 shadow-2xl">
          <div className="text-[10px] uppercase font-mono tracking-wider text-amber-400 mb-2">
            CURRENT MILESTONE
          </div>
          <h2 className="text-2xl font-luxury font-bold text-white mb-4">
            Phase 1: Listening Before Launching
          </h2>
          <div className="space-y-4 text-sm text-slate-300 font-light leading-relaxed">
            <p>
              In Phase 1, our public platform is focused on welcoming our earliest community through the waitlist and learning what rewards and features people value most.
            </p>
            <p>
              Our short questionnaire helps us understand what items, events, and experiences people are most excited about, helping us build a platform people genuinely enjoy.
            </p>
            <div className="p-4 rounded-xl bg-[#06070a] border border-slate-800 text-xs text-amber-200/90 font-mono">
              TARGET LAUNCH MILESTONE: OCTOBER 16, 2026
            </div>
          </div>
        </div>

        {/* Section 3: In-House Coins Philosophy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <div className="p-6 rounded-2xl bg-[#0b0d14] border border-amber-500/20">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-luxury font-bold text-white mb-2">
              In-House Luckyly Coins
            </h3>
            <p className="text-xs text-slate-300 font-light leading-relaxed">
              Luckyly Coins are internal promotional units tracked in an auditable ledger. They have zero monetary value, cannot be bought or traded, and exist strictly to reward early engagement within our platform.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0b0d14] border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-luxury font-bold text-white mb-2">
              Transparency & Trust
            </h3>
            <p className="text-xs text-slate-300 font-light leading-relaxed">
              We focus on clear rules, real user value, and honest communication. We make no speculative claims, require no purchases, and share regular updates with our waitlist members.
            </p>
          </div>
        </div>

        {/* Closing CTA */}
        <div className="text-center p-10 rounded-3xl bg-[#08090e] border border-amber-500/30">
          <h3 className="text-2xl font-luxury font-bold text-white mb-3">
            Join us at the beginning
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 font-light max-w-md mx-auto mb-6">
            Secure your spot on the waitlist today. Free, private, and part of the journey toward October 16, 2026.
          </p>
          <button
            onClick={onJoinWaitlist}
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-red-800 via-red-700 to-red-900 hover:from-red-700 text-amber-50 font-semibold text-sm border border-amber-400/40 shadow-xl shadow-red-950/60 inline-flex items-center gap-2 cursor-pointer transition-transform hover:-translate-y-0.5"
          >
            <span>Join the Waitlist</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
