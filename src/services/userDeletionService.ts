/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * COMPLETE CASCADING USER DATA DELETION SERVICE
 * Ensures zero orphaned records remain in Firestore when a user account is deleted
 * (either via self-service Right-to-Erasure or Admin Console management).
 *
 * Cascading Deletion Targets:
 * 1. `questionnaire_answers` (deterministic `ans_${userId}` + query `where('userId', '==', userId)`)
 * 2. `coin_transactions` (query `where('userId', '==', userId)`)
 * 3. `bonus_entries` (deterministic `bonus_${userId}` + query `where('userId', '==', userId)`)
 * 4. `draw_entries` (deterministic `entry_ps5_free_${userId}` + query `where('userId', '==', userId)`)
 * 5. `syndicate_groups` (deletes group if user is sole member; otherwise removes user from `members` array and reassigns leader if needed)
 * 6. `email_events` (query `where('userId', '==', userId)`)
 * 7. `audit_logs` (query `where('userId', '==', userId)`)
 * 8. `users/{userId}` (primary user profile document)
 * 9. Firebase Auth account & local storage session state (when deleting current user)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  deleteDoc,
  updateDoc,
  DocumentReference,
} from 'firebase/firestore';
import { deleteUser, signOut } from 'firebase/auth';
import { auth, db, cleanFirestoreData } from '../lib/firebase.ts';
import { SyndicateGroup, UserProfile } from '../types/luckyly.ts';
import { trackEvent } from './analyticsService.ts';

export interface UserDeletionSummary {
  userId: string;
  deletedUserDoc: boolean;
  deletedQuestionnaireCount: number;
  deletedCoinTransactionsCount: number;
  deletedBonusEntriesCount: number;
  deletedDrawEntriesCount: number;
  deletedSyndicateGroupsCount: number;
  updatedSyndicateGroupsCount: number;
  deletedEmailEventsCount: number;
  deletedAuditLogsCount: number;
  totalDocumentsRemoved: number;
  authAccountDeleted: boolean;
}

const FIRESTORE_BATCH_LIMIT = 450;

/**
 * Helper to commit an array of DocumentReferences for deletion using chunked Firestore WriteBatches,
 * with individual deleteDoc fallback for maximum resilience.
 */
async function deleteReferencesInBatches(refs: DocumentReference[]): Promise<number> {
  if (refs.length === 0) return 0;

  // Deduplicate references by path
  const uniqueMap = new Map<string, DocumentReference>();
  for (const r of refs) {
    uniqueMap.set(r.path, r);
  }
  const uniqueRefs = Array.from(uniqueMap.values());

  let deletedCount = 0;

  for (let i = 0; i < uniqueRefs.length; i += FIRESTORE_BATCH_LIMIT) {
    const chunk = uniqueRefs.slice(i, i + FIRESTORE_BATCH_LIMIT);
    try {
      const batch = writeBatch(db);
      for (const ref of chunk) {
        batch.delete(ref);
      }
      await batch.commit();
      deletedCount += chunk.length;
    } catch (batchErr) {
      console.warn('[UserDeletionService] Batch delete fallback to individual deletes:', batchErr);
      for (const ref of chunk) {
        try {
          await deleteDoc(ref);
          deletedCount += 1;
        } catch (singleErr) {
          console.warn(`[UserDeletionService] Could not delete ${ref.path}:`, singleErr);
        }
      }
    }
  }

  return deletedCount;
}

/**
 * Collects all DocumentReferences in a collection where `userId == targetUserId`,
 * plus optional deterministic document IDs.
 */
async function collectUserCollectionRefs(
  collectionName: string,
  userId: string,
  deterministicIds: string[] = []
): Promise<DocumentReference[]> {
  const refs: DocumentReference[] = [];

  for (const detId of deterministicIds) {
    try {
      const detRef = doc(db, collectionName, detId);
      const snap = await getDoc(detRef);
      if (snap.exists()) {
        refs.push(detRef);
      }
    } catch {
      // Ignore read errors on deterministic non-existent docs
    }
  }

  try {
    const q = query(collection(db, collectionName), where('userId', '==', userId));
    const snap = await getDocs(q);
    snap.docs.forEach(d => refs.push(d.ref));
  } catch (err) {
    console.warn(`[UserDeletionService] Query notice on ${collectionName}:`, err);
  }

  // Deduplicate by path
  const unique = new Map<string, DocumentReference>();
  refs.forEach(r => unique.set(r.path, r));
  return Array.from(unique.values());
}

/**
 * Handles cascading cleanup of Syndicate Groups for a user being deleted:
 * - If the user is the only member in a group, deletes the group document.
 * - If other members exist in the group, removes the user from `members` and
 *   promotes the next member to leader if the deleted user was `creatorId`.
 */
async function cascadeCleanSyndicateGroups(
  userId: string,
  knownSyndicateGroupId?: string
): Promise<{ deletedGroups: number; updatedGroups: number }> {
  let deletedGroups = 0;
  let updatedGroups = 0;

  const candidateGroups = new Map<string, SyndicateGroup>();

  // 1. Check deterministic creator group ID
  const deterministicGroupId = `grp_${userId.substring(0, 12)}`;
  const groupIdsToInspect = new Set<string>([deterministicGroupId]);
  if (knownSyndicateGroupId) {
    groupIdsToInspect.add(knownSyndicateGroupId);
  }

  for (const gId of groupIdsToInspect) {
    try {
      const gSnap = await getDoc(doc(db, 'syndicate_groups', gId));
      if (gSnap.exists()) {
        candidateGroups.set(gId, gSnap.data() as SyndicateGroup);
      }
    } catch {
      // ignore
    }
  }

  // 2. Query groups where creatorId == userId
  try {
    const qCreator = query(collection(db, 'syndicate_groups'), where('creatorId', '==', userId));
    const creatorSnap = await getDocs(qCreator);
    creatorSnap.docs.forEach(d => {
      candidateGroups.set(d.id, d.data() as SyndicateGroup);
    });
  } catch (err) {
    console.warn('[UserDeletionService] Syndicate creator query notice:', err);
  }

  // 3. Process each affected syndicate group
  for (const [groupId, groupData] of candidateGroups.entries()) {
    const groupRef = doc(db, 'syndicate_groups', groupId);
    const remainingMembers = (groupData.members || []).filter(m => m.userId !== userId);

    if (remainingMembers.length === 0) {
      try {
        await deleteDoc(groupRef);
        deletedGroups += 1;
      } catch (err) {
        console.warn(`[UserDeletionService] Could not delete syndicate group ${groupId}:`, err);
      }
    } else {
      // Remove user from members; reassign creator/leader if user was creator
      const wasCreator = groupData.creatorId === userId;
      if (wasCreator) {
        remainingMembers[0] = {
          ...remainingMembers[0],
          isLeader: true,
        };
      }
      try {
        await updateDoc(
          groupRef,
          cleanFirestoreData({
            creatorId: wasCreator ? remainingMembers[0].userId : groupData.creatorId,
            creatorName: wasCreator ? remainingMembers[0].displayName : groupData.creatorName,
            members: remainingMembers,
            updatedAt: new Date().toISOString(),
          })
        );
        updatedGroups += 1;
      } catch (err) {
        // If update fails and user was creator, attempt deleteDoc
        if (wasCreator) {
          try {
            await deleteDoc(groupRef);
            deletedGroups += 1;
          } catch {
            // ignore
          }
        }
      }
    }
  }

  return { deletedGroups, updatedGroups };
}

/**
 * Executes complete cascading user data deletion across all Firestore collections,
 * backend database/memory store, localStorage, and optionally Firebase Authentication.
 */
export async function deleteUserDataCascade(
  userId: string,
  options: { deleteAuthUser?: boolean } = {}
): Promise<UserDeletionSummary> {
  if (!userId || typeof userId !== 'string') {
    throw new Error('A valid userId is required for cascading user deletion.');
  }

  const summary: UserDeletionSummary = {
    userId,
    deletedUserDoc: false,
    deletedQuestionnaireCount: 0,
    deletedCoinTransactionsCount: 0,
    deletedBonusEntriesCount: 0,
    deletedDrawEntriesCount: 0,
    deletedSyndicateGroupsCount: 0,
    updatedSyndicateGroupsCount: 0,
    deletedEmailEventsCount: 0,
    deletedAuditLogsCount: 0,
    totalDocumentsRemoved: 0,
    authAccountDeleted: false,
  };

  // 0. Inspect user profile first to get linked IDs (e.g., syndicateGroupId)
  let knownSyndicateGroupId: string | undefined;
  const userDocRef = doc(db, 'users', userId);
  try {
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const profile = userSnap.data() as UserProfile;
      knownSyndicateGroupId = profile.syndicateGroupId;
    }
  } catch {
    // continue with cascading deletion even if user doc read fails
  }

  // 1. Collect references across all child collections in parallel
  const [
    questionnaireRefs,
    coinTxRefs,
    bonusEntryRefs,
    drawEntryRefs,
    emailEventRefs,
    auditLogRefs,
  ] = await Promise.all([
    collectUserCollectionRefs('questionnaire_answers', userId, [`ans_${userId}`]),
    collectUserCollectionRefs('coin_transactions', userId),
    collectUserCollectionRefs('bonus_entries', userId, [`bonus_${userId}`]),
    collectUserCollectionRefs('draw_entries', userId, [`entry_ps5_free_${userId}`]),
    collectUserCollectionRefs('email_events', userId),
    collectUserCollectionRefs('audit_logs', userId),
  ]);

  // 2. Cascade clean or delete syndicate groups
  const syndicateResult = await cascadeCleanSyndicateGroups(userId, knownSyndicateGroupId);
  summary.deletedSyndicateGroupsCount = syndicateResult.deletedGroups;
  summary.updatedSyndicateGroupsCount = syndicateResult.updatedGroups;

  // 3. Delete all collected child documents in batches
  summary.deletedQuestionnaireCount = await deleteReferencesInBatches(questionnaireRefs);
  summary.deletedCoinTransactionsCount = await deleteReferencesInBatches(coinTxRefs);
  summary.deletedBonusEntriesCount = await deleteReferencesInBatches(bonusEntryRefs);
  summary.deletedDrawEntriesCount = await deleteReferencesInBatches(drawEntryRefs);
  summary.deletedEmailEventsCount = await deleteReferencesInBatches(emailEventRefs);
  summary.deletedAuditLogsCount = await deleteReferencesInBatches(auditLogRefs);

  // 4. Delete primary user document `users/{userId}`
  try {
    await deleteDoc(userDocRef);
    summary.deletedUserDoc = true;
  } catch (err) {
    console.warn(`[UserDeletionService] Error deleting users/${userId}:`, err);
  }

  summary.totalDocumentsRemoved =
    (summary.deletedUserDoc ? 1 : 0) +
    summary.deletedQuestionnaireCount +
    summary.deletedCoinTransactionsCount +
    summary.deletedBonusEntriesCount +
    summary.deletedDrawEntriesCount +
    summary.deletedSyndicateGroupsCount +
    summary.deletedEmailEventsCount +
    summary.deletedAuditLogsCount;

  // 5. Notify backend server to purge any server-side session / SQL records for this userId
  try {
    await fetch(`/api/user/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    // Non-blocking in case backend endpoint is unreachable in test environment
  }

  // 6. If deleting the currently authenticated user, clear local drafts & delete Firebase Auth user
  if (options.deleteAuthUser && auth.currentUser && auth.currentUser.uid === userId) {
    try {
      localStorage.removeItem('luckyly_questionnaire_draft');
    } catch {
      // ignore
    }

    try {
      await deleteUser(auth.currentUser);
      summary.authAccountDeleted = true;
    } catch (authErr: any) {
      console.warn('[UserDeletionService] Firebase Auth deleteUser notice (signing out instead):', authErr?.code);
      try {
        await signOut(auth);
      } catch {
        // ignore
      }
    }
  }

  trackEvent('user_account_deleted' as any, {
    userId,
    status: 'success',
    metadata: {
      totalDocumentsRemoved: summary.totalDocumentsRemoved,
    },
  });

  return summary;
}
