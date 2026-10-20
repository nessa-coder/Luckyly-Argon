/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUCKYLY COOKIELESS BEHAVIORAL ANALYTICS & EVENT HOOK
 * Privacy-first, cookieless behavioral tracking under GDPR/CCPA.
 * 
 * Features:
 * - Cookieless ephemeral session ID (stored in memory/sessionStorage, zero cookies)
 * - Window PostHog & CustomEvent bridge (window.posthog && window.dispatchEvent)
 * - Full-stack server event sync via /api/analytics/event
 * - Automated scroll depth tracking (25%, 50%, 75%, 100%)
 * - Hero CTA engagement (focus, click, input)
 * - Milestone card 1.5s hover detection (card_id, card_title)
 * - FAQ accordion toggles (expand/collapse)
 * - Member Badge ID clipboard copy tracking
 */

import { useEffect, useRef, useCallback } from 'react';
import { saveAnalyticsEventToSupabase } from '../lib/supabase.ts';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';

// Window declaration for PostHog or custom analytics receivers
declare global {
  interface Window {
    posthog?: {
      capture: (eventName: string, properties?: Record<string, any>) => void;
      identify?: (distinctId: string, properties?: Record<string, any>) => void;
    };
  }
}

export interface AnalyticsPayload {
  eventName: string;
  properties?: Record<string, any>;
  elementId?: string;
  timestamp?: string;
}

// Memory-only fallback session ID (strictly cookieless)
let inMemorySessionId: string | null = null;

function getCookielessSessionId(): string {
  if (typeof window === 'undefined') return 'server_session';
  
  if (inMemorySessionId) return inMemorySessionId;

  try {
    const existing = window.sessionStorage.getItem('luckyly_cookieless_sid');
    if (existing) {
      inMemorySessionId = existing;
      return existing;
    }
    const newSid = 'cls_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    window.sessionStorage.setItem('luckyly_cookieless_sid', newSid);
    inMemorySessionId = newSid;
    return newSid;
  } catch {
    inMemorySessionId = 'cls_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    return inMemorySessionId;
  }
}

/**
 * Core event dispatcher: dispatches to PostHog, Window CustomEvent, and /api/analytics/event
 */
export function dispatchBehavioralEvent(
  eventName: string,
  properties: Record<string, any> = {},
  elementId?: string
) {
  const sessionId = getCookielessSessionId();
  const timestamp = new Date().toISOString();

  const payload = {
    ...properties,
    session_id: sessionId,
    timestamp,
    element_id: elementId,
    url: typeof window !== 'undefined' ? window.location.pathname : '',
  };

  // 1. PostHog Event Capture (if available)
  if (typeof window !== 'undefined' && window.posthog && typeof window.posthog.capture === 'function') {
    try {
      window.posthog.capture(eventName, payload);
    } catch (e) {
      console.debug('[PostHog] Capture note:', e);
    }
  }

  // 2. Window CustomEvent for local subscribers / test suites
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(
        new CustomEvent('luckyly:analytics', {
          detail: { eventName, properties: payload, elementId, timestamp },
        })
      );
    } catch {
      // Safe fallback
    }
  }

  // 3. Server Event Pipeline (/api/analytics/event)
  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    try {
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          event_name: eventName,
          element_id: elementId || null,
          metadata: properties,
        }),
        keepalive: true,
      }).catch(() => {
        // Silent network fallback for offline/isolated tests
      });
    } catch {
      // Ignore network errors in restricted contexts
    }
  }

  // 4. Dual-Sync: Supabase Analytics Event Storage
  saveAnalyticsEventToSupabase({
    sessionId,
    userId: properties?.userId || properties?.user_id,
    eventName,
    elementId,
    metadata: properties,
    url: payload.url,
  }).catch(() => {
    // Graceful offline fallback
  });

  // 5. Dual-Sync: Firestore Analytics Event Storage
  if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test') {
    try {
      const eventDocId = 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const eventDoc = doc(db, 'analytics_events', eventDocId);
      setDoc(eventDoc, {
        id: eventDocId,
        session_id: sessionId,
        event_name: eventName,
        element_id: elementId || null,
        metadata: properties,
        url: payload.url,
        timestamp,
      }).catch(() => {
        // Fallback silently if offline or unauthenticated
      });
    } catch {
      // Safe fallback
    }
  }
}

export function useBehavioralAnalytics() {
  const firedScrollDepthsRef = useRef<Set<number>>(new Set());
  const hoverTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // 1. Automatic Scroll Depth Tracking (25%, 50%, 75%, 100%)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        
        if (scrollHeight <= 0) {
          ticking = false;
          return;
        }

        const scrollPercent = Math.min(100, Math.max(0, Math.round((scrollTop / scrollHeight) * 100)));
        const thresholds = [25, 50, 75, 100];

        for (const threshold of thresholds) {
          if (scrollPercent >= threshold && !firedScrollDepthsRef.current.has(threshold)) {
            firedScrollDepthsRef.current.add(threshold);
            dispatchBehavioralEvent(`scroll_depth_${threshold}`, {
              depth_percentage: threshold,
              page_height: document.documentElement.scrollHeight,
              scroll_position: Math.round(scrollTop),
            }, `scroll_${threshold}`);
          }
        }

        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check in case page starts scrolled or short
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 2. Hero CTA Engagement Trackers
  const trackHeroCTA = useCallback((action: 'focus' | 'click' | 'submit', metadata: Record<string, any> = {}) => {
    dispatchBehavioralEvent(`hero_cta_${action}`, {
      action,
      component: 'HeroWaitlist',
      ...metadata,
    }, 'hero-waitlist-email-input');
  }, []);

  // 3. Milestone Card Hover (> 1.5 seconds)
  const handleMilestoneHoverStart = useCallback((cardId: string, cardTitle: string) => {
    // Clear any previous timer for this card
    if (hoverTimersRef.current.has(cardId)) {
      clearTimeout(hoverTimersRef.current.get(cardId)!);
    }

    const timer = setTimeout(() => {
      dispatchBehavioralEvent('milestone_card_hover', {
        card_id: cardId,
        card_title: cardTitle,
        hover_duration_ms: 1500,
        component: 'DrawShowcase',
      }, `card-${cardId}`);
      hoverTimersRef.current.delete(cardId);
    }, 1500);

    hoverTimersRef.current.set(cardId, timer);
  }, []);

  const handleMilestoneHoverEnd = useCallback((cardId: string) => {
    if (hoverTimersRef.current.has(cardId)) {
      clearTimeout(hoverTimersRef.current.get(cardId)!);
      hoverTimersRef.current.delete(cardId);
    }
  }, []);

  // 4. FAQ Accordion Toggle Tracker
  const trackFaqToggle = useCallback((question: string, isExpanded: boolean, component: 'FAQ' | 'TransparencyCenter' = 'FAQ') => {
    dispatchBehavioralEvent('faq_accordion_toggle', {
      question,
      is_expanded: isExpanded,
      action: isExpanded ? 'expand' : 'collapse',
      component,
    });
  }, []);

  // 5. Member Badge Hash Copy Tracker
  const trackBadgeCopy = useCallback((badgeId: string, source: string = 'member_badge') => {
    dispatchBehavioralEvent('badge_hash_copied', {
      badge_id: badgeId,
      source,
    }, 'member-badge-copy-button');
  }, []);

  // Generic Tracker Helper
  const trackEvent = useCallback((eventName: string, properties?: Record<string, any>, elementId?: string) => {
    dispatchBehavioralEvent(eventName, properties, elementId);
  }, []);

  return {
    trackHeroCTA,
    handleMilestoneHoverStart,
    handleMilestoneHoverEnd,
    trackFaqToggle,
    trackBadgeCopy,
    trackEvent,
  };
}
