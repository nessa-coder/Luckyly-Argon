/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Heart, Shield, Users } from 'lucide-react';

interface VisionSectionProps {
  isDedicatedPage?: boolean;
}

export const VisionSection: React.FC<VisionSectionProps> = ({ isDedicatedPage = false }) => {
  const pillars = [
    {
      title: 'Things You Love',
      subtitle: 'Real Rewards',
      description:
        'We focus on rewards people actually get excited about — from consoles and headphones to concerts and weekend getaways.',
      icon: Sparkles,
    },
    {
      title: 'Community First',
      subtitle: 'Your Voice Matters',
      description:
        'Waitlist members help decide which rewards, categories, and features we prioritize next.',
      icon: Users,
    },
    {
      title: 'Simple and Honest',
      subtitle: 'No Gimmicks',
      description:
        'No hidden fees, no fake scarcity, and no complicated rules. Just straightforward rewards and clear updates.',
      icon: Shield,
    },
    {
      title: 'Better Shared',
      subtitle: 'Fun With Friends',
      description:
        'Moments and rewards are always better when you can experience and share them with the people you care about.',
      icon: Heart,
    },
  ];

  return (
    <section id="vision" className={`py-20 sm:py-28 bg-[#050608] border-b border-amber-500/15 relative ${isDedicatedPage ? 'min-h-[80vh]' : ''}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <div className="text-[11px] uppercase tracking-[0.25em] font-semibold text-amber-400/80 mb-3 font-mono">
            Our Vision
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-luxury font-bold text-white tracking-tight leading-tight mb-4">
            A fresh take on rewards
          </h2>
          <p className="text-sm sm:text-base text-slate-300 font-light leading-relaxed max-w-2xl mx-auto mb-8">
            Luckyly is built around a simple idea: creating an exciting, honest way to discover and win the things you love.
          </p>

          {/* Simple Relatable Vision Quote */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#090b10] border border-amber-500/25 text-base sm:text-lg text-amber-100 font-light leading-relaxed shadow-xl">
            <span className="font-serif text-3xl text-amber-400/60 leading-none mr-1">“</span>
            We are building Luckyly with our community from day one. Tell us what rewards matter to you, and we'll bring them to life when we launch on October 16, 2026.
            <span className="font-serif text-3xl text-amber-400/60 leading-none ml-1">”</span>
          </div>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map(pillar => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="p-6 rounded-2xl bg-[#0a0b0f] border border-amber-500/20 hover:border-amber-400/40 transition-all duration-300 shadow-xl flex flex-col justify-between group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#13151f] border border-amber-500/30 flex items-center justify-center text-amber-300 mb-5 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-amber-400/70 mb-1">
                    {pillar.subtitle}
                  </div>
                  <h3 className="font-luxury font-bold text-base text-white mb-2 leading-snug">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-slate-300 font-light leading-relaxed">
                    {pillar.description}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-900/80 text-[10px] text-amber-400/80 font-mono">
                  PHASE 1
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
