/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Info, Ticket, Coins, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface RewardCategory {
  title: string;
  tag: string;
  description: string;
  image: string;
}

export const IllustrativeRewards: React.FC = () => {
  const [activeTitle, setActiveTitle] = React.useState<string | null>(null);
  const { userProfile } = useAuth();

  const userBalance = userProfile?.totalCoins ?? 0;
  const userProgressPercent = Math.min(100, Math.max(0, (userBalance / 1600) * 100));
  const hasSecuredTicket = userBalance >= 1600;

  const ticketId = React.useMemo(() => {
    if (!hasSecuredTicket) return null;
    const seed = `${userProfile?.userId || userProfile?.email || 'member'}_luckyly_member_pass`;
    let hash = 5381;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) + hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
    return `TKT-${hex.substring(0, 8)}`;
  }, [hasSecuredTicket, userProfile?.userId, userProfile?.email]);

  const categories: RewardCategory[] = [
    {
      title: 'Next-Gen Consoles & Gear',
      tag: 'Gaming · Illustrative',
      description: 'Illustrative future concept: Consoles, controllers, and battle-station accessories.',
      image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=1000&q=80',
    },
    {
      title: 'Noise-Canceling Audio',
      tag: 'Sound · Illustrative',
      description: 'Illustrative future concept: Studio headphones and premium wireless earbuds.',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80',
    },
    {
      title: 'Flagship Tech & Wearables',
      tag: 'Smart Tech · Illustrative',
      description: 'Illustrative future concept: Smartphones, watches, and daily pocket devices.',
      image: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=1000&q=80',
    },
    {
      title: 'Sneakers & Streetwear',
      tag: 'Style · Illustrative',
      description: 'Illustrative future concept: Limited sneaker drops and luxury lifestyle apparel.',
      image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1000&q=80',
    },
    {
      title: 'Concerts & Festivals',
      tag: 'Live Events · Illustrative',
      description: 'Illustrative future concept: Live performance passes and festival access.',
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1000&q=80',
    },
    {
      title: 'Weekend Escapes',
      tag: 'Getaways · Illustrative',
      description: 'Illustrative future concept: Scenic cabin retreats and coastal weekend stays.',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
    },
  ];

  return (
    <section id="future-rewards" className="py-20 sm:py-28 bg-[#050608] border-b border-amber-500/15 relative">
      <div id="example-rewards" className="absolute -top-24 pointer-events-none" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-8">
          <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.25em] font-semibold text-amber-400/90 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Future Milestone Concepts · Illustrative Examples Only</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-luxury font-bold text-white tracking-tight leading-tight mb-3">
            Things you'd love to win
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed max-w-xl mx-auto">
            Illustrative future wishlist categories for market research. Our active Milestone 1 reward at 200 members is a $5 Amazon Gift Card (+$5 per subsequent milestone).
          </p>
        </div>

        {/* Interactive Expandable Accordion Disclaimer */}
        <details className="group max-w-3xl mx-auto mb-8 rounded-2xl bg-[#0a0c12] border border-amber-500/25 text-xs text-slate-300 shadow-xl overflow-hidden transition-all">
          <summary className="p-4 sm:p-4.5 flex items-center justify-between cursor-pointer list-none select-none hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-semibold text-amber-300">Illustrative Examples Only Notice</span>
              <span className="text-slate-500 text-[11px] hidden sm:inline">· Click to view transparency details</span>
            </div>
            <ChevronDown className="w-4 h-4 text-amber-400 transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <div className="px-5 pb-5 pt-1 text-slate-300/90 leading-relaxed border-t border-amber-500/10 text-xs">
            These photographs represent illustrative reward categories people might want Luckyly to explore in the future. They are not active prizes, guaranteed awards, or official brand endorsements. For our Phase 1 launch, the active 200-member milestone draw is a $5 Amazon Gift Card, with future milestones scaling by +$5 ($10, $15, $20, $25) as illustrative community concepts.
          </div>
        </details>

        {/* User Individual Qualification Progress Bar & Ticket ID (Tied to: (userBalance / 1600) * 100) */}
        {userProfile && (
          <div className="max-w-3xl mx-auto mb-10 p-4 sm:p-5 rounded-2xl bg-[#08090f] border border-amber-500/30 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Your Member Milestone Qualification Progress</span>
              </span>
              <span className="font-mono font-bold text-amber-300">
                {userBalance} / 1,600 Coins ({Math.round(userProgressPercent)}%)
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#161822] overflow-hidden p-0.5 border border-amber-500/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-700 via-amber-500 to-amber-300 transition-all duration-500 shadow-sm shadow-amber-400/50"
                style={{ width: `${userProgressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400 font-mono">
              <span>
                {hasSecuredTicket ? '100% Complete · Member Pass Unlocked' : `${Math.max(0, 1600 - userBalance)} Coins to Unlock Member Pass`}
              </span>
              {hasSecuredTicket && ticketId && (
                <span className="text-emerald-400 font-bold bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-0.5 rounded flex items-center gap-1.5 shadow-sm">
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Waitlist Badge [{ticketId}]</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* 6 Clean Square Tile Cards (aspect-square) with Interactive Dark Overlay */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map(cat => {
            const isActive = activeTitle === cat.title;

            return (
              <div
                key={cat.title}
                tabIndex={0}
                role="button"
                aria-label={`${cat.title}: ${cat.description}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTitle(prev => (prev === cat.title ? null : cat.title));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveTitle(prev => (prev === cat.title ? null : cat.title));
                  }
                }}
                className="group relative aspect-square rounded-2xl bg-[#0b0c10] border border-amber-500/20 hover:border-amber-400/50 transition-all duration-300 overflow-hidden flex flex-col shadow-xl cursor-pointer focus:outline-none select-none min-h-[44px]"
              >
                {/* 1. Default View: Photo & Short Title only (no paragraph body text) */}
                <div className="relative w-full h-full overflow-hidden bg-black">
                  <img
                    src={cat.image}
                    alt={cat.title}
                    className="w-full h-full object-cover object-center filter brightness-90 group-hover:scale-105 group-hover:brightness-100 transition-all duration-500 ease-out"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/30 pointer-events-none" />
                  <div className="absolute top-3.5 left-3.5 text-[10px] uppercase tracking-wider font-mono px-2.5 py-0.5 rounded-full bg-black/80 text-amber-300 border border-amber-500/30 backdrop-blur-sm">
                    {cat.tag}
                  </div>
                  {/* Pinned Title in Default View */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="font-luxury font-semibold text-base sm:text-lg text-white leading-snug group-hover:text-amber-200 transition-colors">
                      {cat.title}
                    </h3>
                  </div>
                </div>

                {/* 2. Interactive State: Smooth dark overlay revealing explanation text on hover/tap */}
                <div
                  className={`absolute inset-0 bg-black/95 p-6 flex flex-col items-center justify-center text-center transition-all duration-300 backdrop-blur-sm z-10 ${
                    isActive
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus:opacity-100'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-2">
                    {cat.tag}
                  </span>
                  <h4 className="font-luxury font-bold text-base sm:text-lg text-white mb-2 leading-tight">
                    {cat.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed max-w-xs">
                    {cat.description}
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 w-full flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>ILLUSTRATIVE EXAMPLE ONLY</span>
                    <span className="text-amber-400/80">FUTURE CONCEPT</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
