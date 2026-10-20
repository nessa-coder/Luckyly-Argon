/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { trackEvent } from './analyticsService.ts';

export interface VerificationChallenge {
  id: string;
  question: string;
  options: number[];
  timestamp: number;
}

export interface VerificationResult {
  success: boolean;
  token?: string;
  error?: string;
  rateLimited?: boolean;
}

// In-memory sliding window rate-limiter
interface RateLimitRecord {
  attempts: number[];
  blockedUntil?: number;
}

const clientRateLimits = new Map<string, RateLimitRecord>();
const MAX_ATTEMPTS_PER_WINDOW = 5;
const WINDOW_DURATION_MS = 60 * 1000; // 1 minute
const COOLDOWN_DURATION_MS = 2 * 60 * 1000; // 2 minutes

// Secret salt for ephemeral challenge token hashing (off-chain)
const CHALLENGE_SALT = 'luckyly-human-guard-' + Math.random().toString(36).substring(2);

/**
 * Explicitly records a verification attempt against a client ID for rate-limiting.
 */
export function recordVerificationAttempt(clientId: string): void {
  const now = Date.now();
  const record = clientRateLimits.get(clientId) || { attempts: [] };
  record.attempts.push(now);
  clientRateLimits.set(clientId, record);
}

/**
 * Check rate limit for a client identifier (session/fingerprint).
 */
export function checkRateLimit(clientId: string): { allowed: boolean; remainingCooldownMs?: number } {
  const now = Date.now();
  const record = clientRateLimits.get(clientId) || { attempts: [] };

  if (record.blockedUntil && record.blockedUntil > now) {
    trackEvent('security_rate_limit_triggered', {
      metadata: { reason: 'Rate limit active', remainingMs: record.blockedUntil - now },
    });
    return { allowed: false, remainingCooldownMs: record.blockedUntil - now };
  }

  // Filter out attempts older than sliding window
  record.attempts = record.attempts.filter(t => now - t < WINDOW_DURATION_MS);

  if (record.attempts.length >= MAX_ATTEMPTS_PER_WINDOW) {
    record.blockedUntil = now + COOLDOWN_DURATION_MS;
    clientRateLimits.set(clientId, record);
    trackEvent('security_rate_limit_triggered', {
      metadata: { reason: 'Exceeded max verification attempts in window', attempts: record.attempts.length },
    });
    return { allowed: false, remainingCooldownMs: COOLDOWN_DURATION_MS };
  }

  return { allowed: true };
}

/**
 * Generates an accessible, non-intrusive human verification challenge.
 */
export function generateVerificationChallenge(): VerificationChallenge {
  const numA = Math.floor(Math.random() * 8) + 2; // 2 to 9
  const numB = Math.floor(Math.random() * 8) + 2; // 2 to 9
  const correctAnswer = numA + numB;

  // Generate 3 unique distractors
  const distractors = new Set<number>();
  while (distractors.size < 3) {
    const delta = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 4) + 1);
    const candidate = correctAnswer + delta;
    if (candidate > 0 && candidate !== correctAnswer) {
      distractors.add(candidate);
    }
  }

  const options = Array.from(distractors);
  // Insert correct answer at a random slot
  const insertIndex = Math.floor(Math.random() * (options.length + 1));
  options.splice(insertIndex, 0, correctAnswer);

  const challengeId = 'ch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const challenge: VerificationChallenge = {
    id: challengeId,
    question: `Confirm you are human: What is ${numA} + ${numB}?`,
    options,
    timestamp: Date.now(),
  };

  // Cache answer privately
  activeChallenges.set(challengeId, {
    expected: correctAnswer,
    created: Date.now(),
  });

  // Expire after 3 minutes
  const timer = setTimeout(() => {
    activeChallenges.delete(challengeId);
  }, 3 * 60 * 1000);
  if (timer && typeof timer === 'object' && 'unref' in timer) {
    (timer as any).unref();
  }

  return challenge;
}

const activeChallenges = new Map<string, { expected: number; created: number }>();

/**
 * Verifies a challenge response. Enforces expiration, correctness, and rate limits.
 */
export function verifyHumanChallenge(
  challengeId: string,
  selectedAnswer: number,
  clientId = 'client_default',
  skipLatencyCheck = false
): VerificationResult {
  const now = Date.now();
  const rateLimitStatus = checkRateLimit(clientId);

  if (!rateLimitStatus.allowed) {
    trackEvent('human_verification_failed', {
      metadata: { reason: 'Rate limited', challengeId },
    });
    return {
      success: false,
      rateLimited: true,
      error: `Too many attempts. Please wait ${Math.ceil((rateLimitStatus.remainingCooldownMs || 0) / 1000)} seconds before trying again.`,
    };
  }

  // Record this attempt in rate-limiting history
  const record = clientRateLimits.get(clientId) || { attempts: [] };
  record.attempts.push(now);
  clientRateLimits.set(clientId, record);

  const cached = activeChallenges.get(challengeId);
  if (!cached) {
    trackEvent('human_verification_failed', {
      metadata: { reason: 'Challenge expired or missing', challengeId },
    });
    return {
      success: false,
      error: 'Challenge expired. Please refresh and try again.',
    };
  }

  // Anti-bot latency check: Human cannot respond in under 250 milliseconds
  if (!skipLatencyCheck && now - cached.created < 250) {
    trackEvent('human_verification_failed', {
      metadata: { reason: 'Impossible response latency (<250ms)', challengeId },
    });
    return {
      success: false,
      error: 'Unusually rapid response detected. Please try again.',
    };
  }

  activeChallenges.delete(challengeId);

  if (selectedAnswer !== cached.expected) {
    trackEvent('human_verification_failed', {
      metadata: { reason: 'Incorrect response', challengeId },
    });
    return {
      success: false,
      error: 'Incorrect answer. Please try again to verify you are human.',
    };
  }

  // Verification passed
  const token = 'tok_verified_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
  trackEvent('human_verification_passed', {
    metadata: { challengeId, latencyMs: now - cached.created },
  });

  return {
    success: true,
    token,
  };
}

// Aliases for developer convenience
export const generateChallenge = generateVerificationChallenge;
export const verifyChallenge = verifyHumanChallenge;
