/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { generateVerificationChallenge, verifyHumanChallenge, VerificationChallenge } from '../services/verificationService.ts';

interface HumanVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
}

export const HumanVerificationModal: React.FC<HumanVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerified,
}) => {
  const [challenge, setChallenge] = useState<VerificationChallenge | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadNewChallenge();
      setSelectedOption(null);
      setErrorMessage(null);
      setIsSuccess(false);
    }
  }, [isOpen]);

  const loadNewChallenge = () => {
    const newChallenge = generateVerificationChallenge();
    setChallenge(newChallenge);
    setSelectedOption(null);
    setErrorMessage(null);
  };

  if (!isOpen || !challenge) return null;

  const handleVerify = () => {
    if (selectedOption === null) {
      setErrorMessage('Please select an answer to continue.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    setTimeout(() => {
      const result = verifyHumanChallenge(challenge.id, selectedOption);
      setIsVerifying(false);

      if (result.success) {
        setIsSuccess(true);
        setTimeout(() => {
          onVerified();
          onClose();
        }, 200);
      } else {
        setErrorMessage(result.error || 'Verification failed. Please try again.');
        loadNewChallenge();
      }
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#111319] border border-amber-500/35 rounded-3xl shadow-2xl overflow-hidden text-slate-100 p-6 sm:p-7">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-amber-500/20 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Human Verification</h3>
              <p className="text-[11px] text-slate-400">Public waitlist anti-abuse check</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
            <div className="text-base font-bold text-white">Verified Successfully</div>
            <p className="text-xs text-slate-300">Continuing to Google Sign-In...</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-[#090a0f] border border-slate-800/80 text-center">
              <span className="text-xs uppercase tracking-wider text-amber-400 font-mono block mb-1">
                Quick Security Challenge
              </span>
              <p className="text-sm font-semibold text-white">{challenge.question}</p>
            </div>

            {/* Answer Options */}
            <div className="grid grid-cols-2 gap-3">
              {challenge.options.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setSelectedOption(option);
                    setErrorMessage(null);
                  }}
                  className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                    selectedOption === option
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-400/30'
                      : 'bg-[#141620] border-slate-800 text-slate-200 hover:border-amber-500/40 hover:bg-[#1a1c28]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={loadNewChallenge}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New challenge</span>
              </button>

              <button
                type="button"
                disabled={isVerifying || selectedOption === null}
                onClick={handleVerify}
                className={`py-2.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  selectedOption !== null && !isVerifying
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isVerifying ? 'Checking...' : 'Verify & Continue'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 text-center">
          Protects our community against automated bot registrations.
        </div>
      </div>
    </div>
  );
};
