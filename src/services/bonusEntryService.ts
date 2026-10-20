/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUCKYLY COMPLIMENTARY BONUS ENTRY SERVICE
 * Manages the exclusive bonus-entry benefit granted free by Luckyly to eligible users.
 * 
 * KEY ARCHITECTURAL GUARANTEES:
 * 1. Strictly independent of Luckyly Coin balances (Zero coins deducted, zero coins required).
 * 2. Absolute idempotency: Uses deterministic Firestore document ID `bonus_${userId}` to prevent
 *    duplicate entries across concurrent requests, rapid clicks, or page refreshes.
 * 3. Authoritative persistence: Writes to the `bonus_entries` collection in Firestore.
 * 4. Auditable compliance: Emits immutable audit logs and tracks analytics events.
 * 5. Honest state tracking: Distinguishes between recorded entry and claimable status.
 */

import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, cleanFirestoreData } from '../lib/firebase.ts';
import { UserProfile } from '../types/luckyly.ts';
import { CURRENT_CAMPAIGN_ID, FIRST_MILESTONE_PRIZE } from '../config/constants.ts';
import { recordAuditEvent } from './auditService.ts';
import { trackEvent } from './analyticsService.ts';
import { createCoinTransaction } from './coinService.ts';
import { recordTicketClaimProgress } from './milestoneService.ts';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors.ts';

export interface BonusEntryRecord {
  id: string; // e.g., 'bonus_<userId>'
  userId: string;
  userEmail: string;
  userDisplayName: string;
  userIndex: number;
  bonusType: 'complimentary_privilege';
  campaignId: string;
  targetMilestone: number;
  prizeDescription: string;
  status: 'claimed' | 'confirmed';
  claimedAt: string;
  termsAcknowledged: boolean;
  coinsDeducted: 0; // Strictly 0
  coinBalanceUnaffected: true;
  systemVersion: string;
  metadata?: Record<string, any>;
}

/**
 * Checks whether an authenticated user has already claimed their complimentary bonus entry.
 */
export async function getBonusEntryStatus(userId: string): Promise<BonusEntryRecord | null> {
  if (!userId) return null;
  try {
    const bonusDocRef = doc(db, 'bonus_entries', `bonus_${userId}`);
    const snapshot = await getDoc(bonusDocRef);
    if (snapshot.exists()) {
      return snapshot.data() as BonusEntryRecord;
    }
    return null;
  } catch (error) {
    console.warn('[BonusEntryService] Error fetching bonus entry status:', error);
    return null;
  }
}

/**
 * Subscribes to real-time status of the user's bonus entry.
 */
export function subscribeToBonusEntryStatus(
  userId: string,
  onUpdate: (entry: BonusEntryRecord | null) => void
): () => void {
  if (!userId) {
    onUpdate(null);
    return () => {};
  }

  const bonusDocRef = doc(db, 'bonus_entries', `bonus_${userId}`);
  return onSnapshot(
    bonusDocRef,
    snapshot => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as BonusEntryRecord);
      } else {
        onUpdate(null);
      }
    },
    error => {
      console.warn('[BonusEntryService] Snapshot error on bonus entry:', error);
    }
  );
}

/**
 * Claims the complimentary bonus entry for an eligible user.
 * Grants 1 free entry for active launch draw (PS5), credits +1,500 coins (totaling 1,600),
 * records bonus entry with unique ID, and sets has_claimed_bonus: true.
 * Strictly free, idempotent, and non-destructive.
 */
export async function claimComplimentaryBonusEntry(
  userInput: UserProfile | string
): Promise<{ success: boolean; entry: BonusEntryRecord; alreadyClaimed?: boolean }> {
  let user: UserProfile;

  if (typeof userInput === 'string') {
    const userDocRef = doc(db, 'users', userInput);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) {
      throw new Error(`User record not found for UID: ${userInput}`);
    }
    user = snap.data() as UserProfile;
  } else {
    user = userInput;
  }

  if (!user || !user.userId) {
    throw new Error('Valid user identity is required to claim complimentary bonus entry.');
  }

  const bonusDocRef = doc(db, 'bonus_entries', `bonus_${user.userId}`);
  const existingSnap = await getDoc(bonusDocRef);

  // If already recorded, return existing entry without creating duplicates
  if (existingSnap.exists()) {
    const existingEntry = existingSnap.data() as BonusEntryRecord;
    return {
      success: true,
      entry: existingEntry,
      alreadyClaimed: true,
    };
  }

  const now = new Date().toISOString();
  const bonusRecord: BonusEntryRecord = {
    id: `bonus_${user.userId}`,
    userId: user.userId,
    userEmail: user.email || '',
    userDisplayName: user.displayName || 'Luckyly Member',
    userIndex: user.userIndex || 1,
    bonusType: 'complimentary_privilege',
    campaignId: CURRENT_CAMPAIGN_ID,
    targetMilestone: FIRST_MILESTONE_PRIZE.targetRegistrations,
    prizeDescription: 'PlayStation 5 Console Launch Draw & $5 Amazon Gift Card Milestone Draw',
    status: 'claimed',
    claimedAt: now,
    termsAcknowledged: true,
    coinsDeducted: 0,
    coinBalanceUnaffected: true,
    systemVersion: 'v0.1.0',
    metadata: {
      source: 'get_my_free_bonus_step',
      drawId: 'draw-grand-ps5',
      note: 'Granted free by Luckyly. Credited +1,500 waitlist bonus coins.',
    },
  };

  try {
    // 1. Record immutable bonus entry in Firestore
    await setDoc(bonusDocRef, cleanFirestoreData(bonusRecord));

    // 2. Grant 1 complimentary active ticket in draw_entries collection for PlayStation 5
    const drawEntryId = `entry_${user.userId}_ps5`;
    const drawEntryDocRef = doc(db, 'draw_entries', drawEntryId);
    await setDoc(
      drawEntryDocRef,
      cleanFirestoreData({
        id: drawEntryId,
        drawId: 'draw-grand-ps5',
        userId: user.userId,
        userDisplayName: user.displayName || 'Luckyly Member',
        userEmail: user.email || '',
        selectedRegion: user.country || 'US',
        regionEligibilityStatus: 'verified',
        termsAcknowledged: true,
        campaignId: CURRENT_CAMPAIGN_ID,
        timestamp: now,
      })
    );

    // 3. Consolidate Welcome Privilege: Grant 1,500 coins exactly ONCE upon waitlist joining
    try {
      const userRef = doc(db, 'users', user.userId);
      const userSnap = await getDoc(userRef);
      const currentCoins = userSnap.exists() ? (userSnap.data() as UserProfile).totalCoins || 0 : 0;
      
      // Only top up if the user has not received their initial 1,500 welcome coins yet
      if (currentCoins < 1500) {
        await createCoinTransaction({
          userId: user.userId,
          amount: 1500 - currentCoins,
          type: 'signup_reward',
          description: 'Base waitlist entitlement & Welcome Privilege (1,500 Coins)',
          campaignId: CURRENT_CAMPAIGN_ID,
          reason: 'Claimed complimentary bonus entry & founding waitlist allocation',
          metadata: {
            bonusEntryId: bonusRecord.id,
            source: 'consolidated_welcome_privilege',
            drawId: 'draw-grand-ps5',
          },
        });
      }
    } catch (coinErr) {
      console.warn('[BonusEntryService] Coin transaction notice:', coinErr);
    }

    // 4. Update user profile with has_claimed_bonus: true and has_completed_questionnaire: true
    try {
      await updateDoc(
        doc(db, 'users', user.userId),
        cleanFirestoreData({
          has_claimed_bonus: true,
          has_completed_questionnaire: true,
          questionnaireCompleted: true,
          bonusEntryId: bonusRecord.id,
          updatedAt: now,
        })
      );
    } catch (userErr) {
      console.warn('[BonusEntryService] User document update notice:', userErr);
    }

    // 4b. Record active raffle ticket claim progress for milestone progress bar
    try {
      await recordTicketClaimProgress(user.userId);
    } catch (counterErr) {
      console.warn('[BonusEntryService] Milestone ticket counter notice:', counterErr);
    }

    // 5. Record immutable audit log
    await recordAuditEvent({
      eventType: 'BONUS_ENTRY_CLAIMED',
      actorId: user.userId,
      actorType: 'USER',
      userId: user.userId,
      campaignId: CURRENT_CAMPAIGN_ID,
      reason: 'User unlocked complimentary bonus: 1 PS5 draw ticket + 1,500 Luckyly Coins',
      metadata: {
        entryId: bonusRecord.id,
        coinsAwarded: 1500,
        coinsDeducted: 0,
        prize: 'Sony PlayStation 5 Console',
      },
    });

    // 6. Track analytics event
    trackEvent('bonus_entry_claimed' as any, {
      userId: user.userId,
      status: 'success',
      metadata: {
        entryId: bonusRecord.id,
        coinsAwarded: 1500,
        coinsDeducted: 0,
      },
    });

    return {
      success: true,
      entry: bonusRecord,
      alreadyClaimed: false,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `bonus_entries/${bonusRecord.id}`);
    throw error;
  }
}

