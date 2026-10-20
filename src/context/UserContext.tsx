/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUCKYLY MEMBER USER CONTEXT & SESSION PERSISTENCE
 * Manages client-side member state, deterministic Member Pass ID generation,
 * localStorage hydration, and dual-sync database registration.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { dispatchBehavioralEvent } from '../hooks/useBehavioralAnalytics.ts';
import { insertWaitlistUserToSupabase, updateWaitlistUserRegionInSupabase } from '../lib/supabase.ts';
import { getStoredReferralCode, joinSyndicateGroup, clearStoredReferralCode } from '../services/syndicateService.ts';
import { recordUserRegistrationProgress } from '../services/milestoneService.ts';

export interface MemberUser {
  email: string;
  memberBadgeId: string;
  pioneerBadgeId?: string;
  coinBalance: number;
  amazon_region?: string;
  amazonRegion?: string;
  joinedAt: string;
  questionnaireCompleted?: boolean;
  bonusClaimed?: boolean;
}

export type PioneerUser = MemberUser;

interface UserContextType {
  memberUser: MemberUser | null;
  pioneerUser: MemberUser | null; // Backwards-compatible alias
  loading: boolean;
  registerMember: (email: string, amazonRegion?: string) => Promise<MemberUser>;
  registerPioneer: (email: string, amazonRegion?: string) => Promise<MemberUser>; // Backwards-compatible alias
  updateCoinBalance: (coins: number | ((prev: number) => number)) => void;
  updateAmazonRegion: (region: string) => void;
  updateMemberUser: (user: MemberUser) => void;
  updatePioneerUser: (user: MemberUser) => void; // Backwards-compatible alias
  copyMemberBadgeId: (explicitId?: string) => Promise<boolean>;
  copyPioneerBadgeId: (explicitId?: string) => Promise<boolean>; // Backwards-compatible alias
  copiedToast: { show: boolean; badgeId: string } | null;
  dismissCopiedToast: () => void;
  clearMemberUser: () => void;
  clearPioneerUser: () => void; // Backwards-compatible alias
}

const LOCAL_STORAGE_KEY = 'luckyly_member_user';
const LEGACY_STORAGE_KEY = 'luckyly_pioneer_user';

/**
 * Deterministic Member Pass ID Generator
 * Output format: TKT-MEMBER-[HASH8]
 */
export function generateMemberBadgeId(email: string, timestamp: number = Date.now()): string {
  const seed = `${email.trim().toLowerCase()}_${timestamp}`;
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  return `TKT-MEMBER-${hex.substring(0, 8)}`;
}

export const generatePioneerBadgeId = generateMemberBadgeId;

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [memberUser, setMemberUser] = useState<MemberUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedToast, setCopiedToast] = useState<{ show: boolean; badgeId: string } | null>(null);

  // 1. Automatic Hydration from localStorage on App Mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as any;
        const badgeId = parsed.memberBadgeId || parsed.pioneerBadgeId;
        if (parsed && parsed.email && badgeId) {
          const region = (parsed.amazon_region || parsed.amazonRegion || 'US').toUpperCase();
          const normalized: MemberUser = {
            email: parsed.email,
            memberBadgeId: badgeId,
            pioneerBadgeId: badgeId,
            coinBalance: typeof parsed.coinBalance === 'number' ? parsed.coinBalance : 1500,
            amazon_region: region,
            amazonRegion: region,
            joinedAt: parsed.joinedAt || new Date().toISOString(),
            questionnaireCompleted: parsed.questionnaireCompleted,
            bonusClaimed: parsed.bonusClaimed,
          };
          setMemberUser(normalized);
          console.info('[UserContext] Successfully hydrated member state for:', normalized.email, normalized.memberBadgeId);
        }
      }
    } catch (err) {
      console.warn('[UserContext] Could not load persisted member user from localStorage:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Submit Email on Waitlist Flow (1,500 Member Coins Allocation + Amazon Region)
  const registerMember = useCallback(async (email: string, amazonRegion: string = 'US'): Promise<MemberUser> => {
    const cleanEmail = email.trim().toLowerCase();
    const timestamp = Date.now();
    const joinedAt = new Date().toISOString();

    let badgeId = generateMemberBadgeId(cleanEmail, timestamp);
    let initialBalance = 1500;
    let resolvedRegion = (amazonRegion || 'US').trim().toUpperCase();
    let existingQuestionnaireCompleted = false;
    let existingBonusClaimed = false;

    try {
      const existingRaw = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (existingRaw) {
        const existing = JSON.parse(existingRaw) as any;
        if (existing.email && existing.email.toLowerCase() === cleanEmail) {
          badgeId = existing.memberBadgeId || existing.pioneerBadgeId || badgeId;
          initialBalance = typeof existing.coinBalance === 'number' ? existing.coinBalance : 1500;
          resolvedRegion = amazonRegion || existing.amazon_region || existing.amazonRegion || 'US';
          existingQuestionnaireCompleted = !!existing.questionnaireCompleted;
          existingBonusClaimed = !!existing.bonusClaimed;
        }
      }
    } catch {
      // Safe fallback
    }

    const newUser: MemberUser = {
      email: cleanEmail,
      memberBadgeId: badgeId,
      pioneerBadgeId: badgeId,
      coinBalance: initialBalance,
      amazon_region: resolvedRegion,
      amazonRegion: resolvedRegion,
      joinedAt,
      questionnaireCompleted: existingQuestionnaireCompleted,
      bonusClaimed: existingBonusClaimed,
    };

    // Save to localStorage under primary key 'luckyly_member_user' and legacy key
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newUser));
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(newUser));
    } catch (e) {
      console.warn('[UserContext] Failed to write member user to localStorage:', e);
    }

    setMemberUser(newUser);

    // Auto-link to referrer's 5-person group if registered via referral link
    try {
      const pendingRef = getStoredReferralCode();
      if (pendingRef) {
        joinSyndicateGroup(pendingRef, {
          userId: badgeId,
          displayName: cleanEmail.split('@')[0] || 'Waitlist Member',
          email: cleanEmail,
        })
          .then(() => clearStoredReferralCode())
          .catch(err => console.debug('[UserContext] Auto-join referral group notice:', err));
      }
    } catch {
      // Safe fallback
    }

    // Track behavioral event
    dispatchBehavioralEvent('member_waitlist_registered', {
      email_domain: cleanEmail.split('@')[1] || '',
      member_badge_id: badgeId,
      initial_coins: initialBalance,
      amazon_region: resolvedRegion,
    });

    // Save directly to Supabase `waitlist_users` table
    insertWaitlistUserToSupabase({
      email: cleanEmail,
      member_badge_id: badgeId,
      pioneer_badge_id: badgeId,
      coin_balance: initialBalance,
      amazon_region: resolvedRegion,
    }).catch(err => console.debug('[UserContext] Supabase insert note:', err));

    // Sync with server waitlist endpoint asynchronously
    try {
      fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, amazon_region: resolvedRegion }),
      }).catch(err => console.debug('[UserContext] Server waitlist sync note:', err));
    } catch {
      // Non-blocking
    }

    // Record public registration count for real-time milestone progress
    recordUserRegistrationProgress(badgeId).catch(err =>
      console.debug('[UserContext] Milestone count record note:', err)
    );

    return newUser;
  }, []);

  // 3. Update Coin Balance & Persist
  const updateCoinBalance = useCallback((coins: number | ((prev: number) => number)) => {
    setMemberUser(prev => {
      if (!prev) return null;
      const nextBalance = typeof coins === 'function' ? coins(prev.coinBalance) : coins;
      const updated: MemberUser = {
        ...prev,
        coinBalance: nextBalance,
      };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('[UserContext] LocalStorage balance sync warning:', e);
      }
      return updated;
    });
  }, []);

  // 3a. Update Amazon Region & Persist
  const updateAmazonRegion = useCallback((region: string) => {
    const normalizedRegion = (region || 'US').trim().toUpperCase();
    setMemberUser(prev => {
      if (!prev) return null;
      const updated: MemberUser = {
        ...prev,
        amazon_region: normalizedRegion,
        amazonRegion: normalizedRegion,
      };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('[UserContext] LocalStorage region sync warning:', e);
      }
      updateWaitlistUserRegionInSupabase(prev.email, normalizedRegion).catch(() => {});
      return updated;
    });
  }, []);

  // 3b. Update Member User Object & Persist
  const updateMemberUser = useCallback((user: MemberUser) => {
    const region = (user.amazon_region || user.amazonRegion || 'US').toUpperCase();
    const normalized: MemberUser = {
      ...user,
      amazon_region: region,
      amazonRegion: region,
    };
    setMemberUser(normalized);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(normalized));
    } catch (e) {
      console.warn('[UserContext] LocalStorage sync warning:', e);
    }
  }, []);

  // 4. Copy Member Badge ID to Clipboard with Visual Toast & Behavioral Tracking
  const copyMemberBadgeId = useCallback(async (explicitId?: string): Promise<boolean> => {
    const idToCopy = explicitId || memberUser?.memberBadgeId || memberUser?.pioneerBadgeId || 'TKT-MEMBER-WAITLIST';
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(idToCopy);
      } else {
        const el = document.createElement('textarea');
        el.value = idToCopy;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }

      // Track 'Badge Hash Copy'
      dispatchBehavioralEvent('badge_hash_copied', {
        badge_id: idToCopy,
        source: 'UserContext_copyMemberBadgeId',
      });

      // Show toast
      setCopiedToast({ show: true, badgeId: idToCopy });
      setTimeout(() => {
        setCopiedToast(null);
      }, 2500);

      return true;
    } catch (err) {
      console.warn('[UserContext] Clipboard copy failed:', err);
      return false;
    }
  }, [memberUser]);

  const dismissCopiedToast = useCallback(() => {
    setCopiedToast(null);
  }, []);

  // 5. Clear Member User
  const clearMemberUser = useCallback(() => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Safe fallback
    }
    setMemberUser(null);
  }, []);

  return (
    <UserContext.Provider
      value={{
        memberUser,
        pioneerUser: memberUser, // Backwards-compatible alias
        loading,
        registerMember,
        registerPioneer: registerMember, // Backwards-compatible alias
        updateCoinBalance,
        updateAmazonRegion,
        updateMemberUser,
        updatePioneerUser: updateMemberUser, // Backwards-compatible alias
        copyMemberBadgeId,
        copyPioneerBadgeId: copyMemberBadgeId, // Backwards-compatible alias
        copiedToast,
        dismissCopiedToast,
        clearMemberUser,
        clearPioneerUser: clearMemberUser, // Backwards-compatible alias
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
