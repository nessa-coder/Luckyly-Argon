/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BUG REPORT MODAL — "REPORT TO NESSA"
 * Structured community issue reporting with strict 300-char limit,
 * anti-spam human verification puzzle, and 15-minute cooldown.
 */

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, ShieldCheck, RefreshCw, Send, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useUser } from '../context/UserContext.tsx';
import {
  BUG_CATEGORIES,
  getBugReportCooldownRemaining,
  submitBugReport,
} from '../services/bugReportService.ts';
import { generateChallenge, verifyChallenge, VerificationChallenge } from '../services/verificationService.ts';
import { BugReportCategory } from '../types/luckyly.ts';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BugReportModal: React.FC<BugReportModalProps> = ({ isOpen, onClose }) => {
  const { user, userProfile } = useAuth();
  const { memberUser } = useUser();

  const [category, setCategory] = useState<BugReportCategory>('visual');
  const [description, setDescription] = useState<string>('');
  const [reporterEmail, setReporterEmail] = useState<string>('');
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState<number>(0);

  // Human verification puzzle state
  const [challenge, setChallenge] = useState<VerificationChallenge | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [verificationPassed, setVerificationPassed] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Initialize and check cooldown whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const remaining = getBugReportCooldownRemaining();
      setCooldownRemainingMs(remaining);
      setReporterEmail(userProfile?.email || user?.email || memberUser?.email || '');
      setDescription('');
      setCategory('visual');
      setSubmitSuccess(false);
      setSubmitError(null);
      setVerificationPassed(false);
      setSelectedAnswer(null);
      setVerificationError(null);

      // Generate verification puzzle
      const newChallenge = generateChallenge();
      setChallenge(newChallenge);
    }
  }, [isOpen, userProfile, user]);

  // Live countdown timer for active cooldown
  useEffect(() => {
    if (!isOpen || cooldownRemainingMs <= 0) return;
    const interval = setInterval(() => {
      const remaining = getBugReportCooldownRemaining();
      setCooldownRemainingMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, cooldownRemainingMs]);

  if (!isOpen) return null;

  const handleRefreshChallenge = () => {
    const newChallenge = generateChallenge();
    setChallenge(newChallenge);
    setSelectedAnswer(null);
    setVerificationPassed(false);
    setVerificationError(null);
  };

  const handleSelectAnswer = (option: number) => {
    if (!challenge) return;
    setSelectedAnswer(option);
    const result = verifyChallenge(challenge.id, option);
    if (result.success) {
      setVerificationPassed(true);
      setVerificationError(null);
    } else {
      setVerificationPassed(false);
      setVerificationError('Incorrect answer. Please solve the puzzle to verify you are human.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownRemainingMs > 0) return;

    if (!verificationPassed) {
      setVerificationError('Please solve the human verification puzzle before submitting.');
      return;
    }

    if (!description.trim()) {
      setSubmitError('Please describe the issue in the box below.');
      return;
    }

    if (description.length > 300) {
      setSubmitError('Description exceeds the 300-character maximum.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const result = await submitBugReport({
      category,
      description: description.trim(),
      reporterEmail: reporterEmail.trim() || undefined,
      userId: userProfile?.userId || user?.uid || memberUser?.memberBadgeId,
      verificationToken: 'verified_puzzle',
    });

    setIsSubmitting(false);

    if (result.success) {
      setSubmitSuccess(true);
      setCooldownRemainingMs(getBugReportCooldownRemaining());
    } else {
      setSubmitError(result.error || 'Failed to submit bug report. Please try again.');
      if (result.cooldownRemainingMs) {
        setCooldownRemainingMs(result.cooldownRemainingMs);
      }
    }
  };

  const formatRemainingTime = (ms: number) => {
    const totalSec = Math.ceil(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bug-report-title"
    >
      <div className="relative w-full max-w-lg bg-neutral-950 border border-amber-500/40 rounded-2xl shadow-2xl shadow-amber-950/40 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Nessa theme */}
        <div className="px-6 py-5 border-b border-neutral-800/80 bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl shadow-inner">
              🐾
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="bug-report-title" className="text-lg font-serif font-bold text-amber-200">
                  Report to Nessa
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  Direct Triage
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Spotted a hairball in the gears? Send the details straight to nessa@luckyly.org.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-1 focus:ring-amber-400"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-neutral-300">
          {submitSuccess ? (
            /* Success confirmation view */
            <div className="py-8 px-4 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/50">
                <CheckCircle size={32} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-white">Nessa Received Your Report</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
                  Thank you for helping us polish Luckyly! A diagnostic ticket has been recorded and an alert dispatched to <span className="text-amber-300 font-mono">nessa@luckyly.org</span>.
                </p>
              </div>

              <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800 text-xs text-neutral-400 max-w-sm mx-auto">
                <p className="font-mono text-amber-400/90 mb-1">Anti-Spam Cooldown Active</p>
                <p>Next report available in ~15 minutes.</p>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-semibold text-xs tracking-wider uppercase hover:from-amber-400 hover:to-amber-500 transition-all shadow-md shadow-amber-950/40"
                >
                  Return to Website
                </button>
              </div>
            </div>
          ) : (
            /* Form view */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Cooldown Active Banner */}
              {cooldownRemainingMs > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-xl flex items-center gap-3 text-amber-200 text-xs">
                  <Lock size={16} className="text-amber-400 shrink-0" />
                  <div>
                    <span className="font-semibold">Anti-Spam Guard Active:</span> You recently submitted a report. Please wait{' '}
                    <span className="font-mono font-bold text-amber-300">
                      {formatRemainingTime(cooldownRemainingMs)}
                    </span>{' '}
                    before sending another.
                  </div>
                </div>
              )}

              {/* 1. Category Selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-200 uppercase tracking-wider mb-2">
                  1. Issue Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BUG_CATEGORIES.map(cat => {
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`text-left p-2.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 text-amber-200 shadow-sm shadow-amber-950/30'
                            : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm">{cat.icon}</span>
                          <span className="font-medium text-[11px] truncate">{cat.label}</span>
                        </div>
                        <span className="text-[10px] text-neutral-400 line-clamp-1 leading-tight">
                          {cat.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Description Box with 300 character strict limit */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="bug-description" className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                    2. Describe What Happened (Max 300 chars)
                  </label>
                  <span
                    className={`text-[11px] font-mono ${
                      description.length >= 300
                        ? 'text-red-400 font-bold'
                        : description.length > 250
                        ? 'text-amber-400'
                        : 'text-neutral-400'
                    }`}
                  >
                    {description.length} / 300
                  </span>
                </div>

                <textarea
                  id="bug-description"
                  rows={4}
                  maxLength={300}
                  value={description}
                  onChange={e => setDescription(e.target.value.slice(0, 300))}
                  placeholder="Explain what button you clicked or what went wrong so Nessa and the team can fix it quickly..."
                  disabled={cooldownRemainingMs > 0 || isSubmitting}
                  className="w-full px-3.5 py-3 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-xs text-white placeholder-neutral-500 resize-none outline-none transition-all disabled:opacity-50"
                />
              </div>

              {/* Optional Reporter Email */}
              <div>
                <label htmlFor="reporter-email" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Your Email (Optional, for status follow-up)
                </label>
                <input
                  id="reporter-email"
                  type="email"
                  value={reporterEmail}
                  onChange={e => setReporterEmail(e.target.value)}
                  placeholder="you@domain.com"
                  disabled={cooldownRemainingMs > 0 || isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-xs text-white placeholder-neutral-500 outline-none transition-all disabled:opacity-50"
                />
              </div>

              {/* 3. Anti-Spam Human Verification Puzzle */}
              <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                    <ShieldCheck size={14} className="text-amber-400" />
                    <span>Human Verification Guard</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshChallenge}
                    className="text-[11px] text-neutral-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                    title="Get a new puzzle"
                  >
                    <RefreshCw size={11} /> Refresh
                  </button>
                </div>

                {challenge ? (
                  <div className="space-y-2">
                    <p className="text-xs text-neutral-200 font-medium">
                      Solve to unlock submission: <span className="font-mono text-amber-200">{challenge.question}</span>
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {challenge.options.map((opt, idx) => {
                        const isChosen = selectedAnswer === opt;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectAnswer(opt)}
                            disabled={cooldownRemainingMs > 0 || isSubmitting}
                            className={`py-2 px-3 rounded-lg border text-xs font-mono font-semibold transition-all ${
                              isChosen
                                ? verificationPassed
                                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                                  : 'bg-red-500/20 border-red-400 text-red-300'
                                : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-amber-400/60 hover:text-white'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400">Loading puzzle challenge...</p>
                )}

                {verificationPassed && (
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle size={12} /> Verification passed. Ready to send.
                  </p>
                )}

                {verificationError && (
                  <p className="text-[11px] text-red-400 flex items-center gap-1.5">
                    <AlertTriangle size={12} /> {verificationError}
                  </p>
                )}
              </div>

              {submitError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-1 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    cooldownRemainingMs > 0 ||
                    !verificationPassed ||
                    !description.trim() ||
                    isSubmitting
                  }
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-amber-950/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Send to Nessa</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
