/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, cleanFirestoreData } from '../lib/firebase.ts';
import { QuestionnaireAnswer, UserProfile } from '../types/luckyly.ts';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors.ts';
import { QUESTIONNAIRE_QUESTIONS } from '../config/constants.ts';
import { createCoinTransaction } from './coinService.ts';
import { sendAutomatedEmail, createQuestionnaireRewardEmail } from './emailService.ts';
import { recordAuditEvent } from './auditService.ts';
import { trackEvent } from './analyticsService.ts';
import { saveQuestionnaireToSupabase, updateWaitlistUserRegionInSupabase } from '../lib/supabase.ts';

export function getQuestionnaireQuestions() {
  return QUESTIONNAIRE_QUESTIONS;
}

export async function submitQuestionnaire(params: {
  user: UserProfile;
  answers: Record<string, string | string[]>;
  amazon_region?: string;
}): Promise<{ answers: QuestionnaireAnswer; coinsAwarded: number }> {
  // Check if already completed
  if (params.user.questionnaireCompleted || params.user.has_completed_questionnaire) {
    throw new Error('Questionnaire reward has already been claimed for this account.');
  }

  const answerId = 'ans_' + params.user.userId;
  const answerRef = doc(db, 'questionnaire_answers', answerId);
  try {
    const existingSnap = await getDoc(answerRef);
    if (existingSnap.exists()) {
      throw new Error('Questionnaire answers already recorded.');
    }
  } catch (lookupErr: any) {
    if (lookupErr?.message?.includes('already recorded')) {
      throw lookupErr;
    }
    // Ignore non-existent document or lookup notice
  }

  const now = new Date().toISOString();
  const rewardCoins = 100;
  const rawRegion = params.amazon_region || (typeof params.answers?.q6_region === 'string' ? params.answers.q6_region : params.user.amazon_region || params.user.country || 'US');
  const resolvedRegion = String(rawRegion || 'US').toUpperCase();

  const questionnaireRecord: QuestionnaireAnswer = {
    id: answerId,
    userId: params.user.userId,
    questionnaireId: 'onboarding-q-v1',
    answers: params.answers,
    amazon_region: resolvedRegion,
    amazonRegion: resolvedRegion,
    submittedAt: now,
    rewardGranted: true,
  };

  // 1. Record answers in Firestore
  try {
    await setDoc(answerRef, cleanFirestoreData(questionnaireRecord));
  } catch (fsErr) {
    console.warn('[QuestionnaireService] Firestore questionnaire write notice:', fsErr);
    // Don't crash if secondary mirror write fails; proceed with state update
  }

  // 2. Dual-Sync: Save questionnaire response & update region in Supabase
  try {
    saveQuestionnaireToSupabase({
      userId: params.user.userId,
      email: params.user.email,
      answers: params.answers,
      amazon_region: resolvedRegion,
      coinsAwarded: rewardCoins,
    }).catch(supErr => {
      console.warn('[Dual-Sync] Supabase questionnaire sync notice:', supErr?.message || supErr);
    });

    if (params.user.email) {
      updateWaitlistUserRegionInSupabase(params.user.email, resolvedRegion).catch(() => {});
    }
  } catch (supSyncErr) {
    console.warn('[QuestionnaireService] Supabase sync notice:', supSyncErr);
  }

  // 3. Mark user completed in Firestore with both has_completed_questionnaire and questionnaireCompleted
  // and strictly enforce the 1,600 Coins maximum + save amazon_region
  const cappedCoins = Math.min(1600, (params.user.totalCoins || 1500) + rewardCoins);
  try {
    await updateDoc(doc(db, 'users', params.user.userId), cleanFirestoreData({
      has_completed_questionnaire: true,
      questionnaireCompleted: true,
      country: resolvedRegion,
      amazon_region: resolvedRegion,
      amazonRegion: resolvedRegion,
      totalCoins: cappedCoins,
      updatedAt: now,
    }));
  } catch (uErr) {
    console.warn('[QuestionnaireService] User profile update notice:', uErr);
  }

  // 4. Grant Coin Reward (+100) via CoinService (ledger + balance + audit log)
  try {
    await createCoinTransaction({
      userId: params.user.userId,
      amount: rewardCoins,
      type: 'QUESTIONNAIRE_REWARD',
      description: 'Onboarding questionnaire completion (+100 Luckyly Coins)',
      reason: 'Completed Luckyly onboarding survey',
      metadata: { questionnaireId: 'onboarding-q-v1', amazon_region: resolvedRegion },
    });
  } catch (txErr) {
    console.warn('[QuestionnaireService] Coin transaction notice:', txErr);
  }

  // 5. Track Coin Issuance Event
  try {
    trackEvent('coin_issuance_completed', {
      userId: params.user.userId,
      status: 'success',
      metadata: { amount: rewardCoins, type: 'questionnaire_reward', amazon_region: resolvedRegion },
    });
  } catch (trackErr) {
    console.warn('[QuestionnaireService] Analytics track notice:', trackErr);
  }

  // 6. Record audit event
  try {
    recordAuditEvent({
      eventType: 'QUESTIONNAIRE_COMPLETED',
      actorId: params.user.userId,
      actorType: 'USER',
      userId: params.user.userId,
      reason: 'Successfully completed onboarding questionnaire',
      metadata: { questionsAnswered: Object.keys(params.answers).length, amazon_region: resolvedRegion },
    }).catch(() => {});
  } catch (auditErr) {
    console.warn('[QuestionnaireService] Audit log notice:', auditErr);
  }

  // 7. Send confirmation email
  try {
    const emailData = createQuestionnaireRewardEmail(params.user.displayName, rewardCoins);
    sendAutomatedEmail({
      userId: params.user.userId,
      recipientEmail: params.user.email,
      type: 'questionnaire_reward',
      subject: emailData.subject,
      bodyHtml: emailData.bodyHtml,
      metadata: { rewardCoins, amazon_region: resolvedRegion },
    }).catch(() => {});
  } catch (mailErr) {
    console.warn('[QuestionnaireService] Email send notice:', mailErr);
  }

  return { answers: questionnaireRecord, coinsAwarded: rewardCoins };
}

/**
 * Dual-sync submission helper for waitlist members answering the survey
 * even prior to complete Google OAuth registration.
 */
export async function submitMemberQuestionnaire(params: {
  email: string;
  memberBadgeId?: string;
  pioneerBadgeId?: string;
  amazon_region?: string;
  answers: Record<string, string | string[]>;
}): Promise<{ answers: QuestionnaireAnswer; coinsAwarded: number }> {
  const cleanEmail = params.email.trim().toLowerCase();
  const safeId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
  const badgeId = params.memberBadgeId || params.pioneerBadgeId;
  const answerId = 'ans_member_' + safeId;
  const now = new Date().toISOString();
  const rewardCoins = 100;
  const rawRegion = params.amazon_region || (typeof params.answers?.q6_region === 'string' ? params.answers.q6_region : 'US');
  const resolvedRegion = String(rawRegion || 'US').toUpperCase();

  const questionnaireRecord: QuestionnaireAnswer = {
    id: answerId,
    userId: 'member_' + (badgeId || safeId),
    questionnaireId: 'onboarding-q-v1',
    answers: params.answers,
    amazon_region: resolvedRegion,
    amazonRegion: resolvedRegion,
    submittedAt: now,
    rewardGranted: true,
  };

  // 1. Dual-Sync: Save to Supabase
  try {
    await saveQuestionnaireToSupabase({
      userId: questionnaireRecord.userId,
      email: cleanEmail,
      answers: params.answers,
      amazon_region: resolvedRegion,
      coinsAwarded: rewardCoins,
    });
  } catch (supErr) {
    console.warn('[QuestionnaireService] Supabase member questionnaire write notice:', supErr);
  }

  updateWaitlistUserRegionInSupabase(cleanEmail, resolvedRegion).catch(() => {});

  // 2. Dual-Sync: Save to Firestore
  try {
    const answerRef = doc(db, 'questionnaire_answers', answerId);
    await setDoc(answerRef, cleanFirestoreData({
      ...questionnaireRecord,
      email: cleanEmail,
      memberBadgeId: badgeId,
      pioneerBadgeId: badgeId,
      amazon_region: resolvedRegion,
      amazonRegion: resolvedRegion,
    }));
  } catch (fsErr) {
    console.debug('[Dual-Sync] Firestore questionnaire write notice:', fsErr);
  }

  // 3. Track event
  try {
    trackEvent('questionnaire_completed', {
      userId: questionnaireRecord.userId,
      status: 'success',
      metadata: {
        questionsAnswered: Object.keys(params.answers).length,
        memberBadgeId: badgeId,
        pioneerBadgeId: badgeId,
        amazon_region: resolvedRegion,
        email: cleanEmail,
      },
    });
  } catch {}

  return { answers: questionnaireRecord, coinsAwarded: rewardCoins };
}

// Backwards-compatible alias
export const submitPioneerQuestionnaire = submitMemberQuestionnaire;
