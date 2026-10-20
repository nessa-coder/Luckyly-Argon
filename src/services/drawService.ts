/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase.ts';
import { Draw, DrawEntry, DrawStatus, UserProfile } from '../types/luckyly.ts';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors.ts';
import { INITIAL_SEED_DRAWS, CURRENT_CAMPAIGN_ID } from '../config/constants.ts';
import { recordAuditEvent } from './auditService.ts';
import { createCoinTransaction } from './coinService.ts';
import {
  sendAutomatedEmail,
  createDrawEnteredEmail,
  createDrawResultEmail,
  createFailedDrawCompensationEmail,
} from './emailService.ts';

// Initialize seed draws if collection is empty
export async function ensureSeedDrawsExist(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'draws'));
    if (snap.empty) {
      for (const draw of INITIAL_SEED_DRAWS) {
        await setDoc(doc(db, 'draws', draw.id), draw);
      }
    }
  } catch (error) {
    console.warn('Seed draws initialization note:', error);
  }
}

export function subscribeToDraws(onUpdate: (draws: Draw[]) => void) {
  return onSnapshot(
    collection(db, 'draws'),
    snapshot => {
      const draws = snapshot.docs.map(d => d.data() as Draw);
      if (draws.length === 0) {
        onUpdate(INITIAL_SEED_DRAWS);
      } else {
        onUpdate(draws);
      }
    },
    error => {
      console.warn('Could not read draws from Firestore, using initial seed draws:', error);
      onUpdate(INITIAL_SEED_DRAWS);
    }
  );
}

export async function getUserEntriesForDraw(
  userId: string,
  drawId: string
): Promise<DrawEntry[]> {
  try {
    const q = query(
      collection(db, 'draw_entries'),
      where('userId', '==', userId),
      where('drawId', '==', drawId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as DrawEntry);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'draw_entries');
  }
}

export async function getUserAllEntries(userId: string): Promise<DrawEntry[]> {
  try {
    const q = query(collection(db, 'draw_entries'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as DrawEntry);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'draw_entries');
  }
}

export async function enterDraw(params: {
  drawId: string;
  user: UserProfile;
  selectedRegion: string;
  termsAcknowledged: boolean;
}): Promise<DrawEntry> {
  if (!params.termsAcknowledged) {
    throw new Error('You must explicitly acknowledge the regional prize conditions.');
  }

  // 1. Fetch draw
  const drawRef = doc(db, 'draws', params.drawId);
  const drawSnap = await getDoc(drawRef);
  if (!drawSnap.exists()) {
    throw new Error('Draw not found.');
  }
  const drawData = drawSnap.data() as Draw;

  if (drawData.status !== 'waiting_for_participants' && drawData.status !== 'threshold_reached') {
    throw new Error(`This draw is no longer accepting entries (status: ${drawData.status}).`);
  }

  // 2. Validate Region
  if (!drawData.eligibleRegions.includes(params.selectedRegion)) {
    throw new Error(`Selected region ${params.selectedRegion} is not eligible for this draw.`);
  }

  // 3. Prevent duplicate entry by same user in this draw
  const existingEntries = await getUserEntriesForDraw(params.user.userId, params.drawId);
  if (existingEntries.length > 0) {
    throw new Error('You have already entered this draw.');
  }

  // 4. If entry cost > 0, deduct coins
  if (drawData.entryCostCoins > 0) {
    if (params.user.totalCoins < drawData.entryCostCoins) {
      throw new Error(`Insufficient Luckyly Coins. Required: ${drawData.entryCostCoins}, Available: ${params.user.totalCoins}`);
    }
    await createCoinTransaction({
      userId: params.user.userId,
      amount: -drawData.entryCostCoins,
      type: 'draw_entry',
      description: `Entry fee for draw: ${drawData.title}`,
      drawId: drawData.id,
      campaignId: drawData.campaignId,
      reason: `Entered draw ${drawData.id}`,
    });
  }

  // 5. Create draw entry
  const entryId = 'entry_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();
  const entry: DrawEntry = {
    id: entryId,
    drawId: params.drawId,
    userId: params.user.userId,
    userDisplayName: params.user.displayName || 'Luckyly Participant',
    userEmail: params.user.email,
    selectedRegion: params.selectedRegion,
    regionEligibilityStatus: 'verified',
    termsAcknowledged: true,
    campaignId: drawData.campaignId || CURRENT_CAMPAIGN_ID,
    timestamp: now,
  };

  try {
    await setDoc(doc(db, 'draw_entries', entryId), entry);

    // 6. Increment participant count on draw
    const newParticipantCount = (drawData.currentParticipants || 0) + 1;
    const shouldUpdateStatus =
      newParticipantCount >= drawData.minParticipants && drawData.status === 'waiting_for_participants';

    const updates: Partial<Draw> = {
      currentParticipants: newParticipantCount,
    };
    if (shouldUpdateStatus) {
      updates.status = 'threshold_reached';
    }

    await updateDoc(drawRef, updates);

    // 7. Audit log
    await recordAuditEvent({
      eventType: 'DRAW_ENTERED',
      actorId: params.user.userId,
      actorType: 'USER',
      userId: params.user.userId,
      drawId: params.drawId,
      campaignId: drawData.campaignId,
      reason: `Entered draw with region ${params.selectedRegion}`,
      metadata: {
        selectedRegion: params.selectedRegion,
        drawTitle: drawData.title,
        newParticipantCount,
      },
    });

    // 8. Send transactional email
    const emailContent = createDrawEnteredEmail(
      params.user.displayName,
      drawData.title,
      params.selectedRegion,
      drawData.minParticipants,
      drawData.deadline
    );
    await sendAutomatedEmail({
      userId: params.user.userId,
      recipientEmail: params.user.email,
      type: 'draw_entered',
      subject: emailContent.subject,
      bodyHtml: emailContent.bodyHtml,
      metadata: { drawId: params.drawId, selectedRegion: params.selectedRegion },
    });

    return entry;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `draw_entries/${entryId}`);
  }
}

// Draw Execution Engine: Selects random winner among eligible entries
export async function executeDraw(drawId: string, executedByAdminId: string): Promise<Draw> {
  const drawRef = doc(db, 'draws', drawId);
  const drawSnap = await getDoc(drawRef);
  if (!drawSnap.exists()) {
    throw new Error('Draw not found.');
  }
  const draw = drawSnap.data() as Draw;

  // Fetch all entries for this draw
  const entriesSnap = await getDocs(
    query(collection(db, 'draw_entries'), where('drawId', '==', drawId))
  );
  const entries = entriesSnap.docs.map(d => d.data() as DrawEntry);

  if (entries.length === 0) {
    throw new Error('No entries found for this draw.');
  }

  // Server-side random selection
  const winnerIndex = Math.floor(Math.random() * entries.length);
  const winnerEntry = entries[winnerIndex];
  const now = new Date().toISOString();

  const updates: Partial<Draw> = {
    status: 'draw_executed',
    winnerUserId: winnerEntry.userId,
    winnerDisplayName: winnerEntry.userDisplayName,
    winnerRegion: winnerEntry.selectedRegion,
    executedAt: now,
  };

  await updateDoc(drawRef, updates);

  // Record Audit
  await recordAuditEvent({
    eventType: 'DRAW_EXECUTED',
    actorId: executedByAdminId,
    actorType: 'ADMIN',
    drawId,
    campaignId: draw.campaignId,
    userId: winnerEntry.userId,
    reason: `Draw executed with ${entries.length} participants. Winner chosen: ${winnerEntry.userDisplayName}`,
    metadata: {
      winnerUserId: winnerEntry.userId,
      winnerRegion: winnerEntry.selectedRegion,
      totalEntries: entries.length,
    },
  });

  // Notify winner and participants
  for (const entry of entries) {
    const isWinner = entry.userId === winnerEntry.userId;
    const emailData = createDrawResultEmail(
      entry.userDisplayName,
      draw.title,
      isWinner,
      winnerEntry.userDisplayName,
      winnerEntry.selectedRegion
    );
    await sendAutomatedEmail({
      userId: entry.userId,
      recipientEmail: entry.userEmail,
      type: 'draw_result',
      subject: emailData.subject,
      bodyHtml: emailData.bodyHtml,
      metadata: { drawId, isWinner },
    });
  }

  return { ...draw, ...updates } as Draw;
}

// Failed Draw Compensation Engine: Threshold not reached -> allocate alternative coin compensation
export async function cancelDrawMinimumNotReached(
  drawId: string,
  executedByAdminId: string
): Promise<Draw> {
  const drawRef = doc(db, 'draws', drawId);
  const drawSnap = await getDoc(drawRef);
  if (!drawSnap.exists()) {
    throw new Error('Draw not found.');
  }
  const draw = drawSnap.data() as Draw;

  const entriesSnap = await getDocs(
    query(collection(db, 'draw_entries'), where('drawId', '==', drawId))
  );
  const entries = entriesSnap.docs.map(d => d.data() as DrawEntry);

  const updates: Partial<Draw> = {
    status: 'minimum_not_reached',
    executedAt: new Date().toISOString(),
  };

  await updateDoc(drawRef, updates);

  // Audit event
  await recordAuditEvent({
    eventType: 'DRAW_CANCELLED_MINIMUM_NOT_REACHED',
    actorId: executedByAdminId,
    actorType: 'ADMIN',
    drawId,
    campaignId: draw.campaignId,
    reason: `Minimum threshold (${draw.minParticipants}) not reached. Participants count: ${entries.length}. Alternative compensation: ${draw.alternativeRewardCoins} Coins.`,
    metadata: {
      participantsCount: entries.length,
      alternativeRewardCoins: draw.alternativeRewardCoins,
    },
  });

  // Credit alternative reward coins to every participant's ledger
  for (const entry of entries) {
    await createCoinTransaction({
      userId: entry.userId,
      amount: draw.alternativeRewardCoins,
      type: 'failed_draw_compensation',
      description: `Compensation for cancelled draw: ${draw.title}`,
      drawId: draw.id,
      campaignId: draw.campaignId,
      reason: 'Minimum participant threshold not reached',
    });

    const emailData = createFailedDrawCompensationEmail(
      entry.userDisplayName,
      draw.title,
      draw.alternativeRewardCoins,
      entries.length,
      draw.minParticipants
    );
    await sendAutomatedEmail({
      userId: entry.userId,
      recipientEmail: entry.userEmail,
      type: 'failed_draw_compensation',
      subject: emailData.subject,
      bodyHtml: emailData.bodyHtml,
      metadata: { drawId, alternativeRewardCoins: draw.alternativeRewardCoins },
    });
  }

  return { ...draw, ...updates } as Draw;
}
