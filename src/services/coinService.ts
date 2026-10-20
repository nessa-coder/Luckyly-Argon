/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db, cleanFirestoreData } from '../lib/firebase.ts';
import { CoinTransaction, CoinTransactionType, UserProfile } from '../types/luckyly.ts';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors.ts';
import { SYSTEM_VERSION, CURRENT_CAMPAIGN_ID } from '../config/constants.ts';
import { recordAuditEvent } from './auditService.ts';

export async function createCoinTransaction(params: {
  userId: string;
  amount: number;
  type: CoinTransactionType;
  description: string;
  campaignId?: string;
  drawId?: string;
  actorId?: string;
  actorType?: 'SYSTEM' | 'USER' | 'ADMIN';
  reason?: string;
  metadata?: Record<string, any>;
}): Promise<CoinTransaction> {
  const userRef = doc(db, 'users', params.userId);
  const userSnap = await getDoc(userRef);

  let currentBalance = 0;
  if (userSnap.exists()) {
    const userData = userSnap.data() as UserProfile;
    currentBalance = userData.totalCoins || 0;
  }

  // Anti-Abuse Idempotency: Query transaction history to prevent duplicate grants
  try {
    const isWelcomeType = params.type === 'signup_reward' || (params.type as string) === 'welcome_privilege' || (params.type as string) === 'WELCOME_PRIVILEGE';
    const isQuestionnaireType = params.type === 'QUESTIONNAIRE_REWARD' || (params.type as string) === 'questionnaire_reward';

    if (isWelcomeType || isQuestionnaireType) {
      const q = query(
        collection(db, 'coin_transactions'),
        where('userId', '==', params.userId)
      );
      const snap = await getDocs(q);
      const existingTx = snap.docs.find(d => {
        const data = d.data() as CoinTransaction;
        if (isWelcomeType && (data.type === 'signup_reward' || (data.type as string) === 'welcome_privilege' || (data.type as string) === 'WELCOME_PRIVILEGE')) {
          return true;
        }
        if (isQuestionnaireType && (data.type === 'QUESTIONNAIRE_REWARD' || (data.type as string) === 'questionnaire_reward')) {
          return true;
        }
        return false;
      });

      if (existingTx) {
        console.info(`[CoinService Anti-Abuse] Duplicate ${params.type} prevented for user ${params.userId}. Existing transaction: ${existingTx.id}`);
        return existingTx.data() as CoinTransaction;
      }
    }
  } catch (checkErr) {
    console.warn('[CoinService] Anti-abuse idempotency check notice:', checkErr);
  }

  // Strict Maximums: Hardcode 1,600 Coins ceiling for initial onboarding sequence
  const MAX_ONBOARDING_COIN_LIMIT = 1600;
  const isCappedOnboardingType = params.type === 'signup_reward' || params.type === 'QUESTIONNAIRE_REWARD';
  
  let effectiveAmount = params.amount;
  if (isCappedOnboardingType) {
    const projected = currentBalance + params.amount;
    if (projected > MAX_ONBOARDING_COIN_LIMIT) {
      effectiveAmount = Math.max(0, MAX_ONBOARDING_COIN_LIMIT - currentBalance);
    }
  }

  const resultingBalance = isCappedOnboardingType
    ? Math.min(MAX_ONBOARDING_COIN_LIMIT, Math.max(0, currentBalance + effectiveAmount))
    : Math.max(0, currentBalance + params.amount);

  const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();

  const transaction: CoinTransaction = {
    id: txId,
    userId: params.userId,
    amount: effectiveAmount,
    type: params.type,
    description: params.description,
    campaignId: params.campaignId || CURRENT_CAMPAIGN_ID,
    previousBalance: currentBalance,
    resultingBalance,
    systemVersion: SYSTEM_VERSION,
    timestamp: now,
  };

  if (params.drawId) {
    transaction.drawId = params.drawId;
  }

  try {
    // 1. Write immutable ledger record with clean sanitized data
    await setDoc(doc(db, 'coin_transactions', txId), cleanFirestoreData(transaction));

    // 2. Update user aggregated balance (strictly capped at 1,600)
    if (userSnap.exists()) {
      await updateDoc(userRef, {
        totalCoins: resultingBalance,
        updatedAt: now,
      });
    }

    // 3. Write auditable event
    await recordAuditEvent({
      eventType: 'COIN_' + params.type.toUpperCase(),
      actorId: params.actorId || 'SYSTEM',
      actorType: params.actorType || 'SYSTEM',
      userId: params.userId,
      campaignId: params.campaignId || CURRENT_CAMPAIGN_ID,
      drawId: params.drawId,
      coinTxId: txId,
      previousState: `Balance: ${currentBalance} Coins`,
      newState: `Balance: ${resultingBalance} Coins (${params.amount >= 0 ? '+' : ''}${params.amount})`,
      reason: params.reason || params.description,
      metadata: {
        amount: params.amount,
        txType: params.type,
        resultingBalance,
        ...params.metadata,
      },
    });

    return transaction;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `coin_transactions/${txId}`);
  }
}

export async function getUserCoinLedger(userId: string): Promise<CoinTransaction[]> {
  try {
    const q = query(
      collection(db, 'coin_transactions'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as CoinTransaction);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'coin_transactions');
  }
}

export function subscribeToUserCoinLedger(
  userId: string,
  onUpdate: (transactions: CoinTransaction[]) => void
) {
  const q = query(
    collection(db, 'coin_transactions'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc')
  );
  return onSnapshot(
    q,
    snapshot => {
      const txs = snapshot.docs.map(doc => doc.data() as CoinTransaction);
      onUpdate(txs);
    },
    error => {
      handleFirestoreError(error, OperationType.GET, 'coin_transactions');
    }
  );
}
