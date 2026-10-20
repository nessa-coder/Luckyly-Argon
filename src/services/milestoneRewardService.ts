/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MilestoneTarget, CohortTier } from '../types/luckyly.ts';
import { MILESTONE_TARGETS, DEFAULT_COHORTS } from '../config/constants.ts';

/**
 * Milestone Reward Rule Configuration (Section 8.2)
 *
 * NOTE: Unapproved reward rules are kept configurable and inactive (isApproved: false).
 * Calculation is strictly separated from issuance to prevent accidental payouts.
 */
export interface MilestoneRewardRule {
  milestoneId: string;
  milestoneTarget: number;
  cohortId: string;
  baseRewardCoins: number;
  multiplier: number;
  isApproved: boolean; // Must be true before any distribution can be issued
  description: string;
}

export interface UserMilestoneRewardCalculation {
  userId: string;
  userIndex: number;
  cohortId: string;
  milestoneId: string;
  milestoneTarget: number;
  calculatedCoins: number;
  isEligible: boolean;
  isApprovedForIssuance: boolean;
  idempotencyKey: string;
  reason: string;
}

// Configurable milestone rules: 200-Coin base reward at each applicable registration milestone, adjusted by tier progression
export const CONFIGURABLE_MILESTONE_RULES: MilestoneRewardRule[] = [
  {
    milestoneId: 'milestone-200',
    milestoneTarget: 200,
    cohortId: 'cohort-founding-10k',
    baseRewardCoins: 200,
    multiplier: 1.5,
    isApproved: false, // Inactive pending formal economics approval
    description: 'First milestone community bonus (Early adopter tier: 200 base x 1.5)',
  },
  {
    milestoneId: 'milestone-500',
    milestoneTarget: 500,
    cohortId: 'cohort-founding-10k',
    baseRewardCoins: 200,
    multiplier: 1.25,
    isApproved: false,
    description: 'Second milestone growth bonus (200 base x 1.25)',
  },
  {
    milestoneId: 'milestone-1500',
    milestoneTarget: 1500,
    cohortId: 'cohort-founding-10k',
    baseRewardCoins: 200,
    multiplier: 1.0,
    isApproved: false,
    description: 'Third milestone community bonus (200 base x 1.0)',
  },
  {
    milestoneId: 'milestone-4000',
    milestoneTarget: 4000,
    cohortId: 'cohort-founding-10k',
    baseRewardCoins: 200,
    multiplier: 1.0,
    isApproved: false,
    description: 'Fourth milestone community bonus (200 base x 1.0)',
  },
  {
    milestoneId: 'milestone-10000',
    milestoneTarget: 10000,
    cohortId: 'cohort-founding-10k',
    baseRewardCoins: 200,
    multiplier: 1.0,
    isApproved: false,
    description: 'Launch threshold community bonus (200 base x 1.0)',
  },
];

/**
 * Pure calculation function: Determines milestone reward entitlement for a user.
 * Idempotent, deterministic, and does not execute database writes.
 */
export function calculateUserMilestoneReward(params: {
  userId: string;
  userIndex: number;
  cohortId: string;
  milestoneTarget: number;
  ruleSet?: MilestoneRewardRule[];
}): UserMilestoneRewardCalculation {
  const rules = params.ruleSet || CONFIGURABLE_MILESTONE_RULES;
  const rule = rules.find(
    r => r.milestoneTarget === params.milestoneTarget && r.cohortId === params.cohortId
  );

  const milestoneId = `milestone-${params.milestoneTarget}`;
  const idempotencyKey = `ms_reward_${params.userId}_${milestoneId}`;

  // Early cohort eligibility: Registered before or at this milestone
  const isEligible = params.userIndex <= params.milestoneTarget;

  if (!rule || !isEligible) {
    return {
      userId: params.userId,
      userIndex: params.userIndex,
      cohortId: params.cohortId,
      milestoneId,
      milestoneTarget: params.milestoneTarget,
      calculatedCoins: 0,
      isEligible: false,
      isApprovedForIssuance: false,
      idempotencyKey,
      reason: `User index #${params.userIndex} not eligible for milestone target ${params.milestoneTarget}`,
    };
  }

  const calculatedCoins = Math.round(rule.baseRewardCoins * rule.multiplier);

  return {
    userId: params.userId,
    userIndex: params.userIndex,
    cohortId: params.cohortId,
    milestoneId,
    milestoneTarget: params.milestoneTarget,
    calculatedCoins,
    isEligible: true,
    isApprovedForIssuance: rule.isApproved,
    idempotencyKey,
    reason: `${rule.description}: ${rule.baseRewardCoins} coins x ${rule.multiplier} multiplier = ${calculatedCoins} coins`,
  };
}
