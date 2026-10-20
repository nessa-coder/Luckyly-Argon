/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  country: string;
  amazon_region?: string;
  amazonRegion?: string;
  joinedAt: string;
  cohortId: string;
  rewardTierName: string;
  totalCoins: number;
  userIndex: number;
  questionnaireCompleted: boolean;
  has_completed_questionnaire?: boolean;
  has_claimed_bonus?: boolean;
  bonusEntryId?: string;
  syndicateGroupId?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export type CoinTransactionType =
  | 'signup_reward'
  | 'questionnaire_reward'
  | 'QUESTIONNAIRE_REWARD'
  | 'bonus_reward'
  | 'draw_entry'
  | 'failed_draw_compensation'
  | 'admin_adjustment';

export interface CoinTransaction {
  id: string;
  userId: string;
  amount: number;
  type: CoinTransactionType;
  description: string;
  campaignId?: string;
  drawId?: string;
  previousBalance: number;
  resultingBalance: number;
  systemVersion: string;
  timestamp: string;
}

export type DrawStatus =
  | 'waiting_for_participants'
  | 'threshold_reached'
  | 'draw_executed'
  | 'minimum_not_reached';

export interface SupportedRegion {
  code: string;
  name: string;
  flag: string;
  currency: string;
  amazonStore: string;
}

export interface Draw {
  id: string;
  campaignId: string;
  title: string;
  description: string;
  prizeName: string;
  prizeValue: number;
  prizeCurrency: string;
  imageUrl?: string;
  eligibleRegions: string[]; // ['US', 'UK', 'DE', 'FR', 'CA', 'JP', 'AU', 'OTHER']
  minParticipants: number;
  currentParticipants: number;
  entryCostCoins: number; // 0 for free MVP
  deadline: string;
  status: DrawStatus;
  winnerUserId?: string;
  winnerDisplayName?: string;
  winnerRegion?: string;
  executedAt?: string;
  alternativeRewardCoins: number;
  termsAcknowledgedText: string;
  createdAt: string;
}

export interface DrawEntry {
  id: string;
  drawId: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  selectedRegion: string;
  regionEligibilityStatus: 'verified' | 'provisional';
  termsAcknowledged: boolean;
  campaignId: string;
  timestamp: string;
}

export interface QuestionOption {
  value: string;
  label: string;
  icon?: string;
}

export interface Question {
  id: string;
  text: string;
  subtitle?: string;
  type: 'single_choice' | 'multiple_choice' | 'text';
  options?: QuestionOption[];
  required: boolean;
}

export interface QuestionnaireAnswer {
  id: string;
  userId: string;
  questionnaireId: string;
  answers: Record<string, string | string[]>;
  amazon_region?: string;
  amazonRegion?: string;
  submittedAt: string;
  rewardGranted: boolean;
}

export type AuditActorType = 'SYSTEM' | 'USER' | 'ADMIN';

export interface AuditLog {
  id: string;
  timestamp: string;
  eventType: string;
  actorId: string;
  actorType: AuditActorType;
  userId?: string;
  drawId?: string;
  campaignId?: string;
  coinTxId?: string;
  previousState?: string;
  newState?: string;
  reason: string;
  systemVersion: string;
  metadata?: Record<string, any>;
}

export type EmailType =
  | 'welcome_waitlist'
  | 'questionnaire_reward'
  | 'draw_entered'
  | 'draw_result'
  | 'failed_draw_compensation'
  | 'product_update'
  | 'bug_report_alert';

export interface EmailEvent {
  id: string;
  userId: string;
  recipientEmail: string;
  type: EmailType;
  subject: string;
  bodyHtml: string;
  sentAt: string;
  status: 'delivered' | 'pending';
  metadata?: Record<string, any>;
}

export interface CohortTier {
  id: string;
  campaignId: string;
  name: string;
  minUserIndex: number;
  maxUserIndex: number;
  rewardCoins: number;
  badge: string;
  description: string;
  status: 'active' | 'filled' | 'upcoming';
}

export interface SystemConfiguration {
  id: string;
  activeCampaignId: string;
  signupEnabled: boolean;
  defaultFailedDrawCompensation: number;
  questionnaireRewardCoins: number;
  version: string;
  updatedAt: string;
}

export interface MilestoneTarget {
  id: string;
  targetCount: number;
  label: string;
  description: string;
  isConfirmed: boolean;
  isFirstMilestone?: boolean;
  prizeTitle?: string;
  prizeAmount?: number;
  isIllustrative?: boolean;
}

export interface MilestoneProgress {
  currentCount: number;
  nextMilestone: MilestoneTarget;
  percentToNext: number;
  allMilestones: MilestoneTarget[];
  milestonesReached: MilestoneTarget[];
}

export type RequiredAnalyticsEvent =
  | 'landing_page_view'
  | 'signup_cta_click'
  | 'signup_started'
  | 'signup_completed'
  | 'signup_failed'
  | 'human_verification_passed'
  | 'human_verification_failed'
  | 'phone_verification_started'
  | 'phone_verification_completed'
  | 'questionnaire_started'
  | 'questionnaire_completed'
  | 'questionnaire_abandoned'
  | 'milestone_viewed'
  | 'welcome_prize_revealed'
  | 'email_sent'
  | 'email_delivery_failed'
  | 'coin_entitlement_created'
  | 'coin_issuance_completed'
  | 'security_rate_limit_triggered';

/**
 * Future Feature: Referral Group Architecture (Section 9)
 * Inactive in Phase 1; prepared for future post-launch rollout.
 */
export interface SyndicateMember {
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
  joinedAt: string;
  isLeader: boolean;
}

export interface SyndicateGroup {
  id: string; // e.g. grp_12345
  groupCode: string; // e.g. LUCKY-8X92
  creatorId: string;
  creatorName: string;
  members: SyndicateMember[]; // Max 5 members strictly enforced
  memberIds?: string[];
  maxMembers: 5;
  status: 'active' | 'filled';
  createdAt: string;
  updatedAt: string;
}

export type BugReportCategory = 'visual' | 'account' | 'coins' | 'prize' | 'other';

export interface BugReportRecord {
  id: string;
  category: BugReportCategory;
  categoryLabel: string;
  description: string; // Strictly <= 300 characters
  reportedByEmail?: string;
  userId?: string;
  status: 'new' | 'investigating' | 'resolved';
  verificationToken?: string;
  userAgent?: string;
  viewport?: string;
  submittedAt: string;
}

