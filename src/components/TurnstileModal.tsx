/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUCKYLY CLOUDFLARE TURNSTILE & MULTI-PROVIDER AUTHENTICATION MODAL
 * Replaces client-only math challenges with Cloudflare Turnstile bot verification.
 * Supports:
 * - Server-side token validation via /api/auth/verify-turnstile
 * - Preserved user gestures (eliminating popup-blocker triggers)
 * - Multi-provider selection: Google (Active), Apple & Microsoft (State-aware)
 * - Actionable error diagnostics (unauthorized domains, popup blockers, account conflicts)
 * - Luxury-tech dark aesthetic adhering to Luckyly brand guidelines
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  X,
  CheckCircle2,
  Lock,
  ExternalLink,
  Mail,
} from 'lucide-react';
import { verifyTurnstileTokenOnServer } from '../lib/turnstileService.ts';
import { SupportedAuthProvider, getFriendlyAuthErrorMessage } from '../lib/authService.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useUser } from '../context/UserContext.tsx';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        params: {
          sitekey: string;
          theme?: 'light' | 'dark' | 'auto';
          callback?: (token: string) => void;
          'error-callback'?: (errorCode: any) => void;
          'expired-callback'?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

interface TurnstileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TurnstileModal: React.FC<TurnstileModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { authenticate, authError, clearAuthError } = useAuth();
  const [turnstileVerified, setTurnstileVerified] = useState<boolean>(false);
  const [verificationProof, setVerificationProof] = useState<string | null>(null);
  const [verifyingToken, setVerifyingToken] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authenticatingProvider, setAuthenticatingProvider] = useState<SupportedAuthProvider | null>(null);
  const [turnstileLoaded, setTurnstileLoaded] = useState<boolean>(false);
  const [widgetId, setWidgetId] = useState<string | null>(null);

  // Email waitlist state
  const [waitlistEmail, setWaitlistEmail] = useState<string>('');
  const [submittingEmail, setSubmittingEmail] = useState<boolean>(false);
  const [emailSuccess, setEmailSuccess] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Cloudflare Turnstile public sitekey (official test dummy sitekey default)
  const siteKey =
    (import.meta as any).env?.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setTurnstileVerified(false);
      setVerificationProof(null);
      setVerifyingToken(false);
      setErrorMessage(null);
      setAuthenticatingProvider(null);
      setWaitlistEmail('');
      setSubmittingEmail(false);
      setEmailSuccess(false);
      clearAuthError();
    }
  }, [isOpen]);

  // Load Cloudflare Turnstile script
  useEffect(() => {
    if (!isOpen) return;

    if (window.turnstile) {
      setTurnstileLoaded(true);
      return;
    }

    const scriptId = 'cf-turnstile-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => setTurnstileLoaded(true);
      script.onerror = () => {
        setErrorMessage('Failed to load bot-protection script. Please check your connection.');
      };
      document.body.appendChild(script);
    } else {
      setTurnstileLoaded(true);
    }
  }, [isOpen]);

  // Render Turnstile widget once container and script are ready
  useEffect(() => {
    if (!isOpen || !turnstileLoaded || !containerRef.current || turnstileVerified) return;

    try {
      if (window.turnstile) {
        if (widgetId) {
          window.turnstile.reset(widgetId);
        } else {
          const id = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: 'dark',
            callback: (token: string) => {
              handleTokenReceived(token);
            },
            'error-callback': () => {
              setErrorMessage('Verification challenge encountered an error. Please reload.');
            },
            'expired-callback': () => {
              setTurnstileVerified(false);
              setVerificationProof(null);
              setErrorMessage('Verification token expired. Please complete the challenge again.');
            },
          });
          setWidgetId(id);
        }
      }
    } catch (e) {
      console.warn('Turnstile render warning:', e);
    }
  }, [isOpen, turnstileLoaded, turnstileVerified]);

  // Handle Turnstile token emitted by client widget
  const handleTokenReceived = async (token: string) => {
    setVerifyingToken(true);
    setErrorMessage(null);

    const result = await verifyTurnstileTokenOnServer(token);
    setVerifyingToken(false);

    if (result.success && result.verificationProof) {
      setTurnstileVerified(true);
      setVerificationProof(result.verificationProof);
      setErrorMessage(null);
    } else {
      setErrorMessage(result.error || 'Verification failed. Please retry.');
      if (window.turnstile && widgetId) {
        window.turnstile.reset(widgetId);
      }
    }
  };

  // Direct user-gesture authentication handler (guarantees popup is never blocked)
  const handleProviderSelect = async (provider: SupportedAuthProvider) => {
    setErrorMessage(null);
    clearAuthError();
    setAuthenticatingProvider(provider);

    try {
      await authenticate(provider);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      const friendlyMsg = getFriendlyAuthErrorMessage(err);
      setErrorMessage(friendlyMsg);
    } finally {
      setAuthenticatingProvider(null);
    }
  };

  const { registerMember } = useUser();
  const isEmailSubmittingRef = React.useRef<boolean>(false);

  // Email waitlist registration handler
  const handleEmailWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail.trim() || submittingEmail || isEmailSubmittingRef.current) return;

    isEmailSubmittingRef.current = true;
    setSubmittingEmail(true);
    setErrorMessage(null);

    try {
      // 1. Register Member User in persistent localStorage
      await registerMember(waitlistEmail.trim());

      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: waitlistEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to register email on waitlist.');
      }
      setEmailSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1600);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to join waitlist. Please try again.');
    } finally {
      setSubmittingEmail(false);
      isEmailSubmittingRef.current = false;
    }
  };

  if (!isOpen) return null;

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
              <h3 className="font-bold text-base text-white">Join Free Waitlist</h3>
              <p className="text-[11px] text-slate-400">Cloudflare verification & secure authentication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Cloudflare Turnstile Verification */}
        {!turnstileVerified ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#0a0c13] border border-slate-800 text-center space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-amber-400 font-mono block">
                Bot Protection
              </span>
              <p className="text-sm font-medium text-slate-200">
                Please complete the security check to continue to account registration.
              </p>
              <div className="py-2 flex justify-center">
                <div ref={containerRef} className="min-h-[65px] flex items-center justify-center" />
              </div>
              {verifyingToken && (
                <div className="flex items-center justify-center gap-2 text-xs text-amber-300 font-medium animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Validating security token with server...</span>
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <div className="text-[11px] text-slate-500 text-center">
              Protects our community against automated bot registrations and duplicate submissions.
            </div>
          </div>
        ) : (
          /* Step 2: Human Verified -> Google Sign-In & Email Waitlist */
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">Human Verification Confirmed</div>
                <div className="text-[11px] text-slate-300">Continue with Google or register your email for the waitlist.</div>
              </div>
            </div>

            {/* Google Sign-In & Email Waitlist Input */}
            <div className="space-y-3 pt-1">
              {/* Google Sign-In (Active) */}
              <button
                type="button"
                disabled={authenticatingProvider !== null || submittingEmail}
                onClick={() => handleProviderSelect('google')}
                className="w-full py-3.5 px-4 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-3 transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
              >
                {authenticatingProvider === 'google' ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#1E293B"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#1E293B"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#1E293B"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#1E293B"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>
                  {authenticatingProvider === 'google' ? 'Connecting to Google...' : 'Continue with Google'}
                </span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-1.5">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-[#111319] px-3 text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                  or email waitlist
                </span>
                <div className="border-t border-slate-800 w-full" />
              </div>

              {/* Email Waitlist Input */}
              <form onSubmit={handleEmailWaitlistSubmit} className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="email"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      disabled={submittingEmail}
                      className="w-full pl-9 pr-3 py-3 rounded-xl bg-[#090b12] border border-amber-500/25 focus:border-amber-400 focus:outline-none text-white text-xs sm:text-sm placeholder:text-slate-500 disabled:opacity-50"
                    />
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingEmail || !waitlistEmail.trim()}
                    className="py-3 px-4 rounded-xl bg-gradient-to-r from-red-800 via-red-700 to-red-900 hover:from-red-700 hover:to-red-800 text-amber-50 font-bold text-xs sm:text-sm border border-amber-400/40 shadow-md shadow-red-950/40 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none shrink-0"
                  >
                    {submittingEmail ? 'Joining...' : 'Join Waitlist'}
                  </button>
                </div>

                {emailSuccess && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs text-center font-medium animate-in fade-in duration-200">
                    ✓ You're on the waitlist! We'll keep you updated.
                  </div>
                )}
              </form>
            </div>

            {/* Error Message Diagnostic Box */}
            {(errorMessage || authError) && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Authentication Notice</span>
                </div>
                <p className="leading-relaxed pl-6">{errorMessage || authError}</p>
              </div>
            )}

            <div className="pt-2 text-[10px] text-slate-500 text-center leading-normal">
              By continuing, you register for the free Luckyly Phase 1 waitlist. No payments or commitments required.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
