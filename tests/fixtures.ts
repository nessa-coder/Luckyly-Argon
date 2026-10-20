/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, QuestionnaireAnswer, CoinTransaction } from '../src/types/luckyly.ts';
import { BASE_SIGNUP_COINS } from '../src/config/constants.ts';

/**
 * Section 17.1 Test Fixtures
 * All test users are explicitly flagged with `isTestAccount: true` and have test emails,
 * ensuring they are completely filtered out by `isEligibleRegistration()` and never
 * contaminate live public milestone counts or marketing email distributions.
 */

export interface TestUserFixture extends UserProfile {
  isTestAccount: boolean;
  isDeleted?: boolean;
}

export const FIXTURE_NEW_USER: TestUserFixture = {
  userId: 'test_user_new_001',
  email: 'pioneer.test@test.luckyly.org',
  displayName: 'Test Pioneer New',
  country: 'US',
  joinedAt: new Date().toISOString(),
  cohortId: 'cohort-founding-10k',
  rewardTierName: 'Founding Member (Top 10,000)',
  totalCoins: BASE_SIGNUP_COINS,
  userIndex: 42,
  questionnaireCompleted: false,
  role: 'user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isTestAccount: true,
};

export const FIXTURE_RETURNING_USER: TestUserFixture = {
  userId: 'test_user_returning_002',
  email: 'returning.test@test.luckyly.org',
  displayName: 'Test Pioneer Returning',
  country: 'US',
  joinedAt: '2026-10-01T12:00:00Z',
  cohortId: 'cohort-founding-10k',
  rewardTierName: 'Founding Member (Top 10,000)',
  totalCoins: 1600, // 1500 base + 100 questionnaire
  userIndex: 12,
  questionnaireCompleted: true,
  role: 'user',
  createdAt: '2026-10-01T12:00:00Z',
  updatedAt: '2026-10-02T15:30:00Z',
  isTestAccount: true,
};

export const FIXTURE_UNVERIFIED_USER: TestUserFixture = {
  userId: 'test_user_unverified_003',
  email: 'unverified.bot@test.luckyly.org',
  displayName: 'Unverified Attempt',
  country: 'US',
  joinedAt: new Date().toISOString(),
  cohortId: 'cohort-founding-10k',
  rewardTierName: 'Founding Member (Top 10,000)',
  totalCoins: 0,
  userIndex: 999,
  questionnaireCompleted: false,
  role: 'user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isTestAccount: true,
};

export const FIXTURE_QUESTIONNAIRE_COMPLETED_USER: TestUserFixture = {
  userId: 'test_user_q_done_004',
  email: 'qcompleted.test@test.luckyly.org',
  displayName: 'Questionnaire Done User',
  country: 'UK',
  joinedAt: new Date().toISOString(),
  cohortId: 'cohort-founding-10k',
  rewardTierName: 'Founding Member (Top 10,000)',
  totalCoins: 1600,
  userIndex: 88,
  questionnaireCompleted: true,
  role: 'user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isTestAccount: true,
};

export const FIXTURE_EARLY_ELIGIBLE_USER: TestUserFixture = {
  userId: 'test_user_early_eligible_005',
  email: 'early.user@test.luckyly.org',
  displayName: 'Early Adopter #75',
  country: 'DE',
  joinedAt: '2026-10-05T10:00:00Z',
  cohortId: 'cohort-founding-10k',
  rewardTierName: 'Founding Member (Top 10,000)',
  totalCoins: 1500,
  userIndex: 75, // Below 200 threshold
  questionnaireCompleted: false,
  role: 'user',
  createdAt: '2026-10-05T10:00:00Z',
  updatedAt: '2026-10-05T10:00:00Z',
  isTestAccount: true,
};

export const FIXTURE_LATER_INELIGIBLE_USER: TestUserFixture = {
  userId: 'test_user_later_ineligible_006',
  email: 'later.user@test.luckyly.org',
  displayName: 'Later Adopter #250',
  country: 'CA',
  joinedAt: '2026-10-10T12:00:00Z',
  cohortId: 'cohort-founding-10k',
  rewardTierName: 'Founding Member (Top 10,000)',
  totalCoins: 1500,
  userIndex: 250, // Above 200 threshold
  questionnaireCompleted: false,
  role: 'user',
  createdAt: '2026-10-10T12:00:00Z',
  updatedAt: '2026-10-10T12:00:00Z',
  isTestAccount: true,
};

export const FIXTURE_DELETED_USER: TestUserFixture = {
  userId: 'test_user_deleted_007',
  email: 'deleted.user@test.luckyly.org',
  displayName: 'Deleted Account',
  country: 'US',
  joinedAt: '2026-09-01T12:00:00Z',
  cohortId: 'cohort-founding-10k',
  rewardTierName: 'Founding Member (Top 10,000)',
  totalCoins: 0,
  userIndex: 10,
  questionnaireCompleted: false,
  role: 'user',
  createdAt: '2026-09-01T12:00:00Z',
  updatedAt: '2026-09-02T12:00:00Z',
  isTestAccount: true,
  isDeleted: true,
};
