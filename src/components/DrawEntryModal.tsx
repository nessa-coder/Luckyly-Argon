/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext.tsx';
import { Draw, DrawEntry } from '../types/luckyly.ts';
import { SUPPORTED_REGIONS } from '../config/constants.ts';
import { enterDraw } from '../services/drawService.ts';
import { X, ShieldCheck, AlertTriangle, CheckCircle2, Globe2 } from 'lucide-react';

interface DrawEntryModalProps {
  draw: Draw | null;
  existingEntry?: DrawEntry;
  onClose: () => void;
  onEntrySuccess: (entry: DrawEntry) => void;
}

export const DrawEntryModal: React.FC<DrawEntryModalProps> = ({
  draw,
  existingEntry,
  onClose,
  onEntrySuccess,
}) => {
  const { userProfile, signInWithGoogle } = useAuth();
  const [selectedRegion, setSelectedRegion] = useState<string>('US');
  const [acknowledged, setAcknowledged] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successEntry, setSuccessEntry] = useState<DrawEntry | null>(existingEntry || null);

  if (!draw) return null;

  const eligibleRegionObjects = draw.eligibleRegions
    .map(code => SUPPORTED_REGIONS[code])
    .filter(Boolean);

  const handleEnter = async () => {
    if (!userProfile) {
      setError('Please sign in with Google to enter this draw.');
      return;
    }
    if (!selectedRegion) {
      setError('Please select an eligible prize region.');
      return;
    }
    if (!acknowledged) {
      setError('You must acknowledge that the prize is an Amazon Gift Card for your chosen region.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const entry = await enterDraw({
        drawId: draw.id,
        user: userProfile,
        selectedRegion,
        termsAcknowledged: true,
      });

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
      });

      setSuccessEntry(entry);
      onEntrySuccess(entry);
    } catch (err: any) {
      setError(err?.message || 'Failed to enter draw.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isExecuted = draw.status === 'draw_executed';
  const isFailed = draw.status === 'minimum_not_reached';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#111319] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-amber-500/20 flex items-center justify-between bg-[#0b0c10]">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🎟️</span>
            <div>
              <h3 className="font-bold text-base text-white">
                {existingEntry || successEntry ? 'Your Draw Entry' : 'Enter Regional Draw'}
              </h3>
              <p className="text-xs text-amber-200/60 truncate max-w-xs">{draw.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {successEntry ? (
            /* Successful Entry State */
            <div className="text-center py-4 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-white mb-1">
                You are Officially Entered!
              </h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto mb-5 leading-relaxed">
                Your entry has been recorded in the draw ledger. An official entry confirmation email has been dispatched to your email address.
              </p>

              {/* Receipt Box */}
              <div className="bg-[#0b0c10] border border-amber-500/25 rounded-2xl p-4 text-left text-xs space-y-2.5 mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-400">Designated Prize Region:</span>
                  <span className="font-bold text-amber-300">
                    {SUPPORTED_REGIONS[successEntry.selectedRegion]?.flag} {SUPPORTED_REGIONS[successEntry.selectedRegion]?.name || successEntry.selectedRegion}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amazon Marketplace:</span>
                  <span className="font-semibold text-slate-200">
                    {SUPPORTED_REGIONS[successEntry.selectedRegion]?.amazonStore}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Entry Reference:</span>
                  <span className="font-mono text-[11px] text-amber-400/80">
                    {successEntry.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Alternative Compensation:</span>
                  <span className="font-bold text-amber-400">
                    +{draw.alternativeRewardCoins} Coins if threshold not met
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-200 border border-amber-500/30 font-semibold text-xs transition-colors cursor-pointer"
              >
                Close & Return to Draws
              </button>
            </div>
          ) : isExecuted || isFailed ? (
            /* Concluded State */
            <div className="text-center py-6">
              <h4 className="text-base font-bold text-white mb-2">
                This draw has already concluded
              </h4>
              <p className="text-xs text-slate-400 mb-6">
                Status: {draw.status === 'draw_executed' ? 'Winner announced' : 'Minimum participants not reached (Alternative compensation distributed)'}.
              </p>
              <button
                onClick={onClose}
                className="py-2.5 px-6 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300"
              >
                Close
              </button>
            </div>
          ) : (
            /* Entry Form */
            <div className="space-y-5">
              
              {/* Prize Summary Banner */}
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#0b0c10] border border-amber-500/20">
                <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-amber-500/20">
                  {draw.imageUrl && (
                    <img src={draw.imageUrl} alt={draw.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">{draw.prizeName}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Est. Value: <strong className="text-amber-300">${draw.prizeValue}</strong></span>
                    <span>•</span>
                    <span className="text-amber-400 font-medium">Free MVP Entry</span>
                  </div>
                </div>
              </div>

              {/* SECTION 8: Region Selection */}
              <div>
                <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Globe2 className="w-4 h-4 text-amber-400" />
                  <span>Choose Your Prize Region (Amazon Store)</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {eligibleRegionObjects.map(region => {
                    const isSelected = selectedRegion === region.code;
                    return (
                      <button
                        key={region.code}
                        type="button"
                        onClick={() => setSelectedRegion(region.code)}
                        className={`p-3 rounded-2xl border text-left text-xs transition-all flex items-center gap-2.5 cursor-pointer ${
                          isSelected
                            ? 'bg-red-950/60 border-amber-400 text-white ring-1 ring-amber-400/50 shadow-md'
                            : 'bg-[#0b0c10] border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-amber-500/30'
                        }`}
                      >
                        <span className="text-xl">{region.flag}</span>
                        <div className="leading-tight">
                          <div className="font-semibold text-white">{region.name}</div>
                          <div className="text-[10px] text-amber-200/60">{region.amazonStore}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 8: Explicit Amazon Gift Card Disclaimer */}
              <div className="p-3.5 rounded-2xl bg-red-950/40 border border-amber-500/30 text-amber-200/90 text-xs space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>Regional Prize Condition:</strong> The prize is an Amazon gift card for the selected region ({SUPPORTED_REGIONS[selectedRegion]?.name}). Make sure you can use an Amazon gift card from this region before entering this draw. If you cannot use or receive the prize in the selected region, you may not be eligible to receive the prize.
                  </div>
                </div>
              </div>

              {/* Explicit Acknowledgment Checkbox */}
              <label className="flex items-start gap-3 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={e => setAcknowledged(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-amber-500/40 text-red-600 focus:ring-amber-500 focus:ring-offset-slate-900 cursor-pointer"
                />
                <span>
                  I confirm that I can redeem an Amazon Gift Card from{' '}
                  <strong className="text-amber-200">{SUPPORTED_REGIONS[selectedRegion]?.name}</strong> and I acknowledge the regional prize conditions and minimum participant threshold rules.
                </span>
              </label>

              {error && (
                <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-500/40 text-xs text-red-300 text-center">
                  {error}
                </div>
              )}

              {/* CTA */}
              {!userProfile ? (
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-700 via-red-600 to-red-800 hover:from-red-600 hover:to-red-700 text-amber-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-950/60 border border-amber-500/30"
                >
                  Sign in with Google to Enter
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEnter}
                  disabled={isSubmitting || !acknowledged}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-700 via-red-600 to-red-800 hover:from-red-600 hover:to-red-700 text-amber-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-xl shadow-red-950/60 border border-amber-400/40 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Registering Draw Entry...</span>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-amber-300" />
                      <span>Confirm Free Entry ({SUPPORTED_REGIONS[selectedRegion]?.flag} {selectedRegion})</span>
                    </>
                  )}
                </button>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
};
