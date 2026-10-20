/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { CoinTransaction } from '../types/luckyly.ts';
import { subscribeToUserCoinLedger } from '../services/coinService.ts';
import { Coins, ArrowUpRight, ArrowDownLeft, ShieldCheck, Info, X } from 'lucide-react';
import { LuckylyLogo } from './LuckylyLogo.tsx';

interface CoinLedgerViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CoinLedgerView: React.FC<CoinLedgerViewProps> = ({ isOpen, onClose }) => {
  const { userProfile } = useAuth();
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!userProfile) return;
    const unsubscribe = subscribeToUserCoinLedger(userProfile.userId, txs => {
      setTransactions(txs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userProfile]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#111319] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden text-slate-100 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-amber-500/20 flex items-center justify-between shrink-0 bg-[#0b0c10]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0e1017] border border-amber-500/40 flex items-center justify-center shadow-inner">
              <LuckylyLogo size={22} variant="emblem" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Luckyly Coin Ledger & Accounting
              </h3>
              <p className="text-xs text-slate-400">
                Authoritative double-entry audit history (Section 3 & 4 of Spec)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close coin ledger"
          >
            <X className="w-5 h-5 stroke-[1.75]" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Account Balance Display */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#12141c] via-[#0d0e14] to-[#08090b] border border-amber-500/40 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <LuckylyLogo size={20} variant="emblem" />
                  <span>Luckyly Coins</span>
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30">
                  Platform Balance
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-amber-300 mt-2 flex items-baseline gap-2 font-mono">
                {userProfile?.totalCoins.toLocaleString() || 0}
                <span className="text-sm font-bold text-amber-200/70">Coins</span>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Complimentary platform units credited to your account for joining the waitlist early and answering onboarding questions.
              </p>
            </div>

            {/* Three Separate Reward Categories Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-3 border-t border-slate-800/80">
              {/* Category 1: 1,500 Base Signup Entitlement */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-amber-500/20">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  1. Signup Entitlement
                </div>
                <div className="text-sm font-bold text-amber-300 font-mono mt-0.5">
                  1,500 Coins
                </div>
                <div className="text-[10px] text-amber-400/80 leading-tight mt-0.5">
                  Reserved for email delivery
                </div>
              </div>

              {/* Category 2: 100 Questionnaire Reward */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-amber-500/20">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  2. Questionnaire
                </div>
                <div className="text-sm font-bold text-amber-300 font-mono mt-0.5">
                  +100 Coins
                </div>
                <div className="text-[10px] text-emerald-400/90 leading-tight mt-0.5">
                  {userProfile?.questionnaireCompleted ? 'Earned & Credited' : 'Pending Completion'}
                </div>
              </div>

              {/* Category 3: 200 Milestone Rewards */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-amber-500/20">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  3. Milestones
                </div>
                <div className="text-sm font-bold text-amber-300 font-mono mt-0.5">
                  200 Base Coins
                </div>
                <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  Per unlocked milestone
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-300">{userProfile?.rewardTierName}</span>
              <span className="text-amber-300/80 font-mono">Member #{userProfile?.userIndex}</span>
            </div>
          </div>

          {/* Functional Separation: Complimentary Bonus Entry Card */}
          <div className="p-3.5 rounded-2xl bg-[#0b0c10] border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🎟️</span>
              <div>
                <div className="font-bold text-white text-xs">A Complimentary Luckyly Privilege</div>
                <div className="text-[11px] text-slate-400">Your bonus draw entry is completely separate from Coin balances.</div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                0 Coins Required
              </span>
            </div>
          </div>

          {/* V0.1 Scope Transparency Notice */}
          <div className="p-4 rounded-2xl bg-[#0b0c10] border border-amber-500/25 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Info className="w-4 h-4 text-amber-400" />
              <span>In-House Virtual Units Notice</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Luckyly Coins in this Phase 1 launch are in-house promotional platform units managed in an auditable ledger with no monetary or investment value.
            </p>
          </div>

          {/* Transaction Ledger Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Transaction History
                </h4>
                <span className="text-[11px] text-slate-400">
                  {transactions.length} entries recorded
                </span>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-14 bg-slate-900 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 bg-[#0b0c10] rounded-2xl border border-slate-800">
                <Coins className="w-8 h-8 text-amber-500/40 mx-auto mb-2" />
                <div className="text-xs font-semibold text-slate-300">No transactions recorded yet</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Sign in or complete onboarding to receive your initial Coins.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map(tx => {
                  const isPositive = tx.amount >= 0;
                  const dateFormatted = new Date(tx.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={tx.id}
                      className="p-3.5 rounded-xl bg-[#0b0c10] border border-slate-800/80 hover:border-amber-500/30 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isPositive
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-red-950/60 text-red-400 border border-red-500/40'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="font-semibold text-slate-200">
                            {tx.description}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{dateFormatted}</span>
                            <span>•</span>
                            <span className="font-mono text-amber-400/70">{tx.id}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-black text-sm ${
                            isPositive ? 'text-amber-400' : 'text-red-400'
                          }`}
                        >
                          {isPositive ? `+${tx.amount}` : tx.amount} Coins
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Balance: {tx.resultingBalance}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
