/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUCKYLY FEATURE CARDS / BENEFIT TILES COMPONENT
 * Clean square tiles with aspect-square.
 * Default view: Icon + Short Title only (explanation text hidden).
 * Interactive state: Smooth dark overlay (bg-black/95) reveals explanation text on hover/tap.
 */

import React, { useState } from 'react';
import { Zap, Sparkles, Ban, BellOff } from 'lucide-react';

export interface FeatureCardItem {
  id: string;
  title: string;
  explanation: string;
  icon: React.ElementType;
}

export const FEATURE_CARDS: FeatureCardItem[] = [
  {
    id: 'pure-rewards',
    title: 'Pure Rewards',
    explanation: 'A simple, uninterrupted rewards journey with clear rules and equal odds.',
    icon: Zap,
  },
  {
    id: 'more-to-come',
    title: 'More to Come',
    explanation: 'Community-shaped prize categories as membership reaches each target.',
    icon: Sparkles,
  },
  {
    id: 'no-ads',
    title: 'No Ads',
    explanation: 'Zero sponsored banners, tracking clutter, or commercial video interruptions.',
    icon: Ban,
  },
  {
    id: 'no-popups',
    title: 'No Pop-ups',
    explanation: 'No invasive dialogs, spin-to-win wheels, or fake countdown timers.',
    icon: BellOff,
  },
];

export const FeatureGrid: React.FC = () => {
  // Mobile tap state tracking
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const handleCardClick = (id: string) => {
    setActiveCardId(prev => (prev === id ? null : id));
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
      {FEATURE_CARDS.map(feature => {
        const IconComponent = feature.icon;
        const isActive = activeCardId === feature.id;

        return (
          <div
            key={feature.id}
            tabIndex={0}
            role="button"
            aria-label={`${feature.title}: ${feature.explanation}`}
            onClick={() => handleCardClick(feature.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCardClick(feature.id);
              }
            }}
            className="group relative aspect-square p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#11131a]/95 to-[#08090d]/95 border border-amber-500/25 hover:border-amber-400/50 shadow-lg shadow-black/40 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden focus:outline-none focus:ring-1 focus:ring-amber-400/50 select-none min-h-[44px]"
          >
            {/* 1. Default View: Only the icon and the short title (no paragraph body text) */}
            <div className="w-14 h-14 sm:w-18 sm:h-18 lg:w-20 lg:h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 mb-3 sm:mb-4 group-hover:bg-amber-500/15 group-hover:scale-105 transition-all duration-300 shadow-inner shadow-amber-500/5">
              <IconComponent className="w-7 h-7 sm:w-9 sm:h-9 lg:w-10 lg:h-10 text-amber-400 stroke-[1.75]" />
            </div>
            <h2 className="text-xs sm:text-sm lg:text-base font-bold text-white tracking-tight leading-snug px-1">
              {feature.title}
            </h2>

            {/* 2. Interactive State: Dark overlay reveals explanation text strictly on hover (desktop) or tap (mobile) */}
            <div
              className={`absolute inset-0 bg-black/95 p-4 sm:p-5 flex flex-col items-center justify-center text-center rounded-2xl transition-all duration-300 backdrop-blur-sm z-10 ${
                isActive
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus:opacity-100'
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mb-2 shadow-sm shadow-amber-400/50" />
              <span className="text-[11px] sm:text-xs uppercase tracking-wider font-bold text-amber-300 font-mono mb-1.5">
                {feature.title}
              </span>
              <p className="text-xs sm:text-sm text-slate-200 font-light leading-relaxed">
                {feature.explanation}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
