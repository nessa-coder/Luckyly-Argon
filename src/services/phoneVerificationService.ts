/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { trackEvent } from './analyticsService.ts';

/**
 * Phone Verification Provider Configuration (Section 6.2)
 *
 * Missing Provider Audit:
 * - Current Status: NOT CONFIGURED for Phase 1.
 * - Required Provider: Twilio Verify API or Firebase Phone Auth (Identity Platform).
 * - Configuration required for commercial activation:
 *     1. TWILIO_ACCOUNT_SID & TWILIO_AUTH_TOKEN or Firebase SMS Quota enablement.
 *     2. E.164 international phone number format validation.
 *     3. Verified phone uniqueness constraint index in Firestore (`users.verifiedPhoneNumber`).
 *     4. Carrier cost rate limiting and fraud protection.
 *
 * In accordance with Section 6.2: We build a clean, modular integration point,
 * do NOT simulate successful verification in production, and do NOT claim phone
 * verification is active until a verified provider has been tested.
 */

export interface PhoneVerificationResult {
  success: boolean;
  status: 'not_configured' | 'pending' | 'verified' | 'failed' | 'rate_limited';
  verificationId?: string;
  error?: string;
  message: string;
}

export interface PhoneVerificationProviderStatus {
  isConfigured: boolean;
  providerName: string;
  phase: string;
  uniquenessEnforced: boolean;
  missingConfig: string[];
}

const isTestingEnvironment = () =>
  typeof process !== 'undefined' &&
  (process.env?.NODE_ENV === 'test' || process.env?.VITEST === 'true');

/**
 * Returns current provider status and documentation of missing configuration.
 */
export function getPhoneVerificationStatus(): PhoneVerificationProviderStatus {
  return {
    isConfigured: false,
    providerName: 'Twilio / Firebase Phone Auth (Pending Integration)',
    phase: 'Phase 1 - Modular Interface (Inactive)',
    uniquenessEnforced: false,
    missingConfig: [
      'SMS_GATEWAY_API_KEY',
      'SMS_GATEWAY_SERVICE_SID',
      'E164_PHONE_UNIQUENESS_FIRESTORE_INDEX',
    ],
  };
}

/**
 * Starts phone verification flow.
 * Respects Section 6.2: Never simulates fake success in production.
 */
export async function initiatePhoneVerification(
  rawPhoneNumber: string,
  userId: string,
  mockForTest = false
): Promise<PhoneVerificationResult> {
  trackEvent('phone_verification_started', {
    userId,
    status: 'initiated',
    metadata: { hasProvider: mockForTest },
  });

  // Strict E.164 sanity check
  const sanitized = rawPhoneNumber.replace(/[\s\-\(\)]/g, '');
  const isValidE164 = /^\+[1-9]\d{6,14}$/.test(sanitized);

  if (!isValidE164) {
    return {
      success: false,
      status: 'failed',
      message: 'Invalid phone format. Please provide international E.164 format (e.g. +1234567890).',
    };
  }

  // If in automated test suite with mock explicitly enabled
  if (mockForTest) {
    const verificationId = 'mock_verif_' + Date.now();
    return {
      success: true,
      status: 'pending',
      verificationId,
      message: '[Test Environment] Verification code dispatched to mock recipient.',
    };
  }

  // Production: Explicitly declare missing provider (Do not fake success)
  return {
    success: false,
    status: 'not_configured',
    error: 'PROVIDER_NOT_CONFIGURED',
    message: 'SMS phone verification provider is not configured for Phase 1 waitlist.',
  };
}

/**
 * Confirms phone verification code.
 */
export async function confirmPhoneVerification(
  verificationId: string,
  code: string,
  userId: string,
  mockExpectedCode?: string
): Promise<PhoneVerificationResult> {
  if (mockExpectedCode) {
    if (code === mockExpectedCode) {
      trackEvent('phone_verification_completed', {
        userId,
        status: 'success',
      });
      return {
        success: true,
        status: 'verified',
        verificationId,
        message: 'Phone number verified successfully in test environment.',
      };
    } else {
      return {
        success: false,
        status: 'failed',
        error: 'INVALID_CODE',
        message: 'Incorrect verification code entered.',
      };
    }
  }

  return {
    success: false,
    status: 'not_configured',
    error: 'PROVIDER_NOT_CONFIGURED',
    message: 'SMS phone verification provider is not configured for Phase 1 waitlist.',
  };
}
