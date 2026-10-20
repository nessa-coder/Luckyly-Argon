/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';
import { RequiredAnalyticsEvent } from '../types/luckyly.ts';

export interface AnalyticsEventRecord {
  id: string;
  eventName: RequiredAnalyticsEvent | string;
  userId?: string;
  sessionId: string;
  timestamp: string;
  environment: 'development' | 'production';
  pageOrStep?: string;
  status?: 'success' | 'failure' | 'initiated';
  metadata?: Record<string, any>;
}

// Global anonymous session ID (preserved per browser tab)
let activeSessionId = '';
function getSessionId(): string {
  if (!activeSessionId) {
    activeSessionId = 'sess_' + Math.random().toString(36).substring(2, 10);
  }
  return activeSessionId;
}

// In-memory buffer of recent analytics events
const inMemoryEvents: AnalyticsEventRecord[] = [];

// Sensitive field keys that must NEVER be recorded in analytics (Section 13)
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'refreshtoken',
  'accesstoken',
  'secret',
  'phonenumber',
  'phone',
  'email',
  'captchatoken',
  'rawtext',
  'freetext',
  'answers',
]);

/**
 * Strips any sensitive fields, credentials, or PII before storing.
 */
function sanitizeMetadata(raw?: Record<string, any>): Record<string, any> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(raw)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      continue; // Drop completely
    }
    // Also skip if value is obviously an email
    if (typeof val === 'string' && val.includes('@') && val.includes('.')) {
      continue;
    }
    if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeMetadata(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

/**
 * Authoritative tracking function for all Luckyly application events.
 */
export function trackEvent(
  eventName: RequiredAnalyticsEvent | string,
  params?: {
    userId?: string;
    pageOrStep?: string;
    status?: 'success' | 'failure' | 'initiated';
    metadata?: Record<string, any>;
  }
): AnalyticsEventRecord {
  const eventId = 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const now = new Date().toISOString();
  const environment =
    typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'
      ? 'production'
      : 'development';

  const record: AnalyticsEventRecord = {
    id: eventId,
    eventName,
    userId: params?.userId,
    sessionId: getSessionId(),
    timestamp: now,
    environment,
    pageOrStep: params?.pageOrStep,
    status: params?.status,
    metadata: sanitizeMetadata(params?.metadata),
  };

  // 1. Maintain in-memory log
  inMemoryEvents.unshift(record);
  if (inMemoryEvents.length > 500) {
    inMemoryEvents.pop();
  }

  // 2. Safe async write to Firestore analytics_events (fire and forget, skipped in isolated test mode)
  if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test') {
    try {
      const eventDoc = doc(db, 'analytics_events', eventId);
      setDoc(eventDoc, record).catch(err => {
        // In development or test, silent fallback is expected
        console.debug('[Analytics] Firestore log note:', err?.message);
      });
    } catch (e) {
      // Graceful offline fallback
    }
  }

  // 3. Debug logging in console
  console.debug(`[Luckyly Analytics] ${eventName}`, record);

  return record;
}

/**
 * Returns recorded events from in-memory cache for inspections and tests.
 */
export function getAnalyticsEvents(): AnalyticsEventRecord[] {
  return [...inMemoryEvents];
}

/**
 * Clears in-memory events for clean automated test runs.
 */
export function clearAnalyticsEvents(): void {
  inMemoryEvents.length = 0;
}

/**
 * Compute key funnel conversion rates from memory or test runs.
 */
export function calculateFunnelMetrics(events: AnalyticsEventRecord[] = inMemoryEvents) {
  const countEvent = (name: string) => events.filter(e => e.eventName === name).length;

  const landingViews = countEvent('landing_page_view');
  const ctaClicks = countEvent('signup_cta_click');
  const signupsStarted = countEvent('signup_started');
  const signupsCompleted = countEvent('signup_completed');
  const signupsFailed = countEvent('signup_failed');
  const verificationPassed = countEvent('human_verification_passed');
  const verificationFailed = countEvent('human_verification_failed');
  const qStarted = countEvent('questionnaire_started');
  const qCompleted = countEvent('questionnaire_completed');

  return {
    landingViews,
    ctaClicks,
    signupsStarted,
    signupsCompleted,
    signupsFailed,
    verificationPassed,
    verificationFailed,
    questionnaireStarted: qStarted,
    questionnaireCompleted: qCompleted,
    conversionRate:
      landingViews > 0 ? Math.round((signupsCompleted / landingViews) * 100) : 0,
    questionnaireCompletionRate:
      qStarted > 0 ? Math.round((qCompleted / qStarted) * 100) : 0,
  };
}
