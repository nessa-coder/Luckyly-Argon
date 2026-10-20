/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AuditLog } from '../types/luckyly.ts';
import { getRecentAuditLogs } from '../services/auditService.ts';
import { subscribeToLiveRegistrationCount, calculateMilestoneProgress } from '../services/milestoneService.ts';
import { ShieldCheck, CheckCircle2, Activity, Scale, Users, Award, Lock, Sparkles, ChevronDown } from 'lucide-react';
import { MILESTONE_TARGETS } from '../config/constants.ts';
import { useBehavioralAnalytics } from '../hooks/useBehavioralAnalytics.ts';

interface TransparencyCenterProps {
  onSelectAction?: () => void;
}

export const TransparencyCenter: React.FC<TransparencyCenterProps> = ({
  onSelectAction,
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(true);
  const [liveUserCount, setLiveUserCount] = useState<number>(0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const { trackFaqToggle } = useBehavioralAnalytics();

  useEffect(() => {
    getRecentAuditLogs(15).then(logs => {
      setAuditLogs(logs);
      setLoadingLogs(false);
    });

    const unsubscribe = subscribeToLiveRegistrationCount(count => {
      setLiveUserCount(count);
    });

    return () => unsubscribe();
  }, []);

  const progress = calculateMilestoneProgress(liveUserCount);

  return (
    <section id="transparency" className="py-20 sm:py-28 bg-[#07080a] border-b border-amber-500/15 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-5xl h-72 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12 text-slate-100 relative z-10">
      
        {/* Transparency Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Public Transparency System</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Honest Numbers. Equal Odds. Real Accountability.
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Luckyly operates with total public transparency. We never charge money, never sell extra entries, and count every real registered member openly.
          </p>
        </div>

        {/* Real Platform Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-[#111319] border border-amber-500/25">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Real Registrations</span>
            </div>
            <div className="text-2xl font-black text-amber-300 mt-1 font-mono">
              {liveUserCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Verified unique signups</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#111319] border border-amber-500/25">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Next Milestone</span>
            </div>
            <div className="text-2xl font-black text-white mt-1 font-mono">
              {progress.nextMilestone.targetCount}
            </div>
            <div className="text-[10px] text-amber-300/80 mt-1">{progress.percentToNext}% achieved</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#111319] border border-amber-500/25">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span>Equal Odds Rule</span>
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">1:1</div>
            <div className="text-[10px] text-slate-400 mt-1">No paid multipliers</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#111319] border border-amber-500/25">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Payment Required</span>
            </div>
            <div className="text-2xl font-black text-white mt-1">$0.00</div>
            <div className="text-[10px] text-amber-400/80 mt-1">100% Free waitlist</div>
          </div>
        </div>

        {/* 4 Pillars of Phase 1 Transparency */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#111319] border border-amber-500/25 space-y-6">
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>Our Core Commitments to the Luckyly Community</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: '1. Transparent Milestone Progression',
                summary: 'All members participate equally in community milestone unlocks. Early signups earn member coin entitlements, and all tier rewards are illustrative concepts under evaluation without pay-to-win mechanics.',
                details: 'Every registered member starts on equal footing. There are no paid fast-tracks, token multipliers, or hidden tier skips. Unlocks occur organically as membership milestones are reached.',
              },
              {
                title: '2. No Money or Cryptocurrency',
                summary: 'Phase 1 is strictly free. We will never ask you for a credit card, banking credentials, or cryptocurrency tokens to join the waitlist or earn rewards.',
                details: 'Luckyly Coins are internal non-monetary units for early community engagement. They are never sold, cannot be converted to fiat currency or crypto, and require zero financial risk.',
              },
              {
                title: '3. Live Milestone Progression',
                summary: 'Milestone tiers unlock as community goals are achieved. Our initial illustrative milestone is 200 registered members showcasing an example $5 Amazon gift card unlock concept.',
                details: 'All milestone targets and thresholds are published publicly and refreshed in real-time. Members can inspect community progress without gatekeeping or obscured counts.',
              },
              {
                title: '4. Immutable Ledger & Audit Trails',
                summary: 'All coin allocations and user milestones are permanently written to an auditable double-entry ledger so member entitlements cannot be silently manipulated.',
                details: 'Every welcome allocation, survey bonus, and syndicate linkage produces an immutable timestamped event log accessible in the real-time public audit feed below.',
              },
            ].map((commitment, idx) => {
              const isExpanded = expandedIndex === idx;
              return (
                <div
                  key={commitment.title}
                  className="rounded-2xl bg-[#0b0c10] border border-amber-500/30 hover:border-amber-400/50 transition-all overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => {
                      const willBeOpen = !isExpanded;
                      setExpandedIndex(willBeOpen ? idx : null);
                      trackFaqToggle(commitment.title, willBeOpen, 'TransparencyCenter');
                    }}
                    className="w-full p-5 text-left flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-900/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{commitment.title}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-light">
                        {commitment.summary}
                      </p>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-amber-400 shrink-0 mt-1 transition-transform duration-300 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 text-[11px] sm:text-xs text-amber-300/90 font-light leading-relaxed border-t border-slate-800/80 bg-[#07080d]/60">
                      {commitment.details}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Real-time System Audit Feed */}
        <div className="p-6 rounded-3xl bg-[#0e1017] border border-amber-500/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Real-Time Public Audit Log
              </h4>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Double-entry events
            </span>
          </div>

          {loadingLogs ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-10 bg-slate-900 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              Audit log initialized. As registrations occur, events appear here.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {auditLogs.map(log => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-[#08090d] border border-slate-800 text-xs flex items-center justify-between gap-3 font-mono"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-amber-300 font-bold">{log.eventType}</span>
                    <span className="text-slate-400 truncate text-[11px]">{log.reason}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </section>
  );
};
