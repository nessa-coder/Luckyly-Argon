/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CohortTier, Question, SupportedRegion } from '../types/luckyly.ts';

export const SYSTEM_VERSION = 'v0.1.0';
export const CURRENT_CAMPAIGN_ID = 'luckyly-launch-campaign-2026';
export const PLANNED_LAUNCH_DATE = 'October 16, 2026';

// Base Signup Allocation: First 10,000 eligible signups are entitled to 1,500 Luckyly Coins each
export const BASE_SIGNUP_COINS = 1500;
export const MAX_BASE_SIGNUP_USERS = 10000;

// Approved Community Milestone Targets
// Milestone 1 (200 registrations) is a $5 Amazon Gift Card. Each subsequent milestone adds $5 as an illustrative example.
export const MILESTONE_TARGETS = [
  {
    id: 'milestone-200',
    targetCount: 200,
    label: '200 Members',
    description: 'First Community Milestone — First Draw Unlocked',
    isConfirmed: true,
    isFirstMilestone: true,
    prizeTitle: '$5 Amazon Gift Card',
    prizeAmount: 5,
    isIllustrative: false,
  },
  {
    id: 'milestone-500',
    targetCount: 500,
    label: '500 Members',
    description: 'Growth Milestone — Illustrative Reward Unlocked',
    isConfirmed: true,
    prizeTitle: '$10 Amazon Gift Card',
    prizeAmount: 10,
    isIllustrative: true,
  },
  {
    id: 'milestone-1500',
    targetCount: 1500,
    label: '1,500 Members',
    description: 'Expansion Milestone — Illustrative Reward Unlocked',
    isConfirmed: true,
    prizeTitle: '$15 Amazon Gift Card',
    prizeAmount: 15,
    isIllustrative: true,
  },
  {
    id: 'milestone-4000',
    targetCount: 4000,
    label: '4,000 Members',
    description: 'Major Growth Milestone — Illustrative Reward Unlocked',
    isConfirmed: true,
    prizeTitle: '$20 Amazon Gift Card',
    prizeAmount: 20,
    isIllustrative: true,
  },
  {
    id: 'milestone-10000',
    targetCount: 10000,
    label: '10,000 Members',
    description: 'Major Launch Threshold — Illustrative Reward Unlocked',
    isConfirmed: true,
    prizeTitle: '$25 Amazon Gift Card',
    prizeAmount: 25,
    isIllustrative: true,
  },
];

// Post-Signup First Milestone Announced Prize (Visible to registered users only)
export const FIRST_MILESTONE_PRIZE = {
  title: '$5 Amazon Gift Card',
  targetRegistrations: 200,
  category: 'Digital Voucher',
  description: 'First milestone community draw once our waitlist reaches 200 eligible members.',
  termsNotice: 'Announced upcoming draw upon reaching 200 registrations. Every eligible participant has an equal chance of winning regardless of signup date or coin balance. Fulfilled via regional Amazon gift voucher code.',
  stores: ['amazon.com', 'amazon.co.uk', 'amazon.ca', 'amazon.de', 'amazon.fr', 'amazon.co.jp', 'amazon.com.au'],
};

export const DEFAULT_AMAZON_REGION = 'US';

export interface AmazonRegionOption {
  code: string;
  label: string;
  shortLabel: string;
  flag: string;
  store: string;
}

export const AMAZON_REGIONS: AmazonRegionOption[] = [
  { code: 'US', label: 'United States (.com)', shortLabel: 'US (.com)', flag: '🇺🇸', store: 'amazon.com' },
  { code: 'UK', label: 'United Kingdom (.co.uk)', shortLabel: 'UK (.co.uk)', flag: '🇬🇧', store: 'amazon.co.uk' },
  { code: 'CA', label: 'Canada (.ca)', shortLabel: 'CA (.ca)', flag: '🇨🇦', store: 'amazon.ca' },
  { code: 'DE', label: 'Germany / EU (.de)', shortLabel: 'DE / EU (.de)', flag: '🇩🇪', store: 'amazon.de' },
  { code: 'JP', label: 'Japan (.co.jp)', shortLabel: 'JP (.co.jp)', flag: '🇯🇵', store: 'amazon.co.jp' },
  { code: 'AU', label: 'Australia (.com.au)', shortLabel: 'AU (.com.au)', flag: '🇦🇺', store: 'amazon.com.au' },
  { code: 'OTHER', label: 'Other / International', shortLabel: 'International', flag: '🌐', store: 'amazon.com (International)' },
];

export const SUPPORTED_REGIONS: Record<string, SupportedRegion> = {
  US: {
    code: 'US',
    name: 'United States (.com)',
    flag: '🇺🇸',
    currency: 'USD ($)',
    amazonStore: 'amazon.com',
  },
  UK: {
    code: 'UK',
    name: 'United Kingdom (.co.uk)',
    flag: '🇬🇧',
    currency: 'GBP (£)',
    amazonStore: 'amazon.co.uk',
  },
  CA: {
    code: 'CA',
    name: 'Canada (.ca)',
    flag: '🇨🇦',
    currency: 'CAD ($)',
    amazonStore: 'amazon.ca',
  },
  DE: {
    code: 'DE',
    name: 'Germany / EU (.de)',
    flag: '🇩🇪',
    currency: 'EUR (€)',
    amazonStore: 'amazon.de',
  },
  FR: {
    code: 'FR',
    name: 'France / EU (.fr)',
    flag: '🇫🇷',
    currency: 'EUR (€)',
    amazonStore: 'amazon.fr',
  },
  JP: {
    code: 'JP',
    name: 'Japan (.co.jp)',
    flag: '🇯🇵',
    currency: 'JPY (¥)',
    amazonStore: 'amazon.co.jp',
  },
  AU: {
    code: 'AU',
    name: 'Australia (.com.au)',
    flag: '🇦🇺',
    currency: 'AUD ($)',
    amazonStore: 'amazon.com.au',
  },
  OTHER: {
    code: 'OTHER',
    name: 'Other / International',
    flag: '🌐',
    currency: 'USD ($)',
    amazonStore: 'amazon.com',
  },
};

export const DEFAULT_COHORTS: CohortTier[] = [
  {
    id: 'cohort-founding-10k',
    campaignId: CURRENT_CAMPAIGN_ID,
    name: 'Founding Member (Top 10,000)',
    minUserIndex: 1,
    maxUserIndex: 10000,
    rewardCoins: BASE_SIGNUP_COINS,
    badge: '🚀 Founding Member — Top 10,000',
    description: 'Entitled to 1,500 Luckyly Coins virtual allocation reserved for email distribution.',
    status: 'active',
  },
  {
    id: 'cohort-community',
    campaignId: CURRENT_CAMPAIGN_ID,
    name: 'Community Member',
    minUserIndex: 10001,
    maxUserIndex: 100000,
    rewardCoins: 500,
    badge: '✨ Community Wave — 10,001+',
    description: 'Standard waitlist member allocation.',
    status: 'upcoming',
  },
];

export const QUESTIONNAIRE_QUESTIONS: Question[] = [
  {
    id: 'q1_category',
    text: 'What prize category excites you the most?',
    subtitle: 'Helps us prioritize future community drops',
    type: 'single_choice',
    required: true,
    options: [
      { value: 'tech', label: 'Next-Gen Tech & Electronics' },
      { value: 'gaming', label: 'Gaming Consoles & Gear' },
      { value: 'sneakers', label: 'Sneaker Drops & Streetwear' },
      { value: 'lifestyle', label: 'Lifestyle & Travel Experiences' },
      { value: 'gift_cards', label: 'Digital Gift Cards (Amazon, Apple)' },
    ],
  },
  {
    id: 'q2_frequency',
    text: 'Smaller prizes more often, or larger prizes less often?',
    subtitle: 'Frequency vs magnitude preference',
    type: 'single_choice',
    required: true,
    options: [
      { value: 'smaller_frequent', label: 'Smaller prizes more often' },
      { value: 'larger_infrequent', label: 'Larger prizes less often' },
      { value: 'combination', label: 'A balanced mix of both' },
    ],
  },
  {
    id: 'q3_next_drop',
    text: 'What would you choose for the next Luckyly drop?',
    subtitle: 'Vote on community milestone prize candidates',
    type: 'single_choice',
    required: true,
    options: [
      { value: 'ps5', label: 'PlayStation 5 or Next-Gen Console' },
      { value: 'iphone', label: 'Flagship Smartphone (iPhone / Galaxy)' },
      { value: 'dunk', label: 'Limited Edition Sneaker Drop' },
      { value: 'headphones', label: 'Noise-Canceling Wireless Headphones' },
      { value: 'trip', label: 'Weekend Getaway or Concert Festival Tickets' },
    ],
  },
  {
    id: 'q4_companions',
    text: 'Who would you participate with? (Friends, Family, Solo)',
    subtitle: 'Community dynamic and team pool preferences',
    type: 'single_choice',
    required: true,
    options: [
      { value: 'friends', label: 'Friends (Forming team pools & squads)' },
      { value: 'family', label: 'Family members' },
      { value: 'solo', label: 'Solo (Individual participant)' },
      { value: 'any', label: 'Any or all of the above' },
    ],
  },
  {
    id: 'q5_travel',
    text: 'Would you travel internationally for a highly desirable experience?',
    subtitle: 'Experience & travel prize feasibility',
    type: 'single_choice',
    required: true,
    options: [
      { value: 'yes_absolutely', label: 'Yes, absolutely' },
      { value: 'depends', label: 'It depends on the destination' },
      { value: 'domestic_only', label: 'Prefer domestic travel only' },
      { value: 'prefer_products', label: 'Prefer products or digital vouchers instead' },
    ],
  },
  {
    id: 'q6_region',
    text: 'Which Amazon marketplace region should we use for your $5 Amazon Gift Card code?',
    subtitle: 'Ensures your regional digital voucher code can be claimed in your country',
    type: 'single_choice',
    required: true,
    options: [
      { value: 'US', label: '🇺🇸 United States (.com)' },
      { value: 'UK', label: '🇬🇧 United Kingdom (.co.uk)' },
      { value: 'CA', label: '🇨🇦 Canada (.ca)' },
      { value: 'DE', label: '🇩🇪 Germany / EU (.de)' },
      { value: 'JP', label: '🇯🇵 Japan (.co.jp)' },
      { value: 'AU', label: '🇦🇺 Australia (.com.au)' },
      { value: 'OTHER', label: '🌐 Other / International' },
    ],
  },
];

export const INITIAL_SEED_DRAWS = [
  {
    id: 'draw-milestone-200-amazon-5',
    campaignId: CURRENT_CAMPAIGN_ID,
    title: '$5 Amazon Gift Card (First Milestone Draw)',
    description: 'First milestone community draw unlocked when the waitlist reaches 200 registered members. Equal winning chances for all eligible members.',
    prizeName: '$5 Amazon Gift Card',
    prizeValue: 5,
    prizeCurrency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=80',
    eligibleRegions: ['US', 'UK', 'DE', 'FR', 'CA', 'JP', 'AU', 'OTHER'],
    minParticipants: 200,
    currentParticipants: 0,
    entryCostCoins: 0,
    deadline: '2026-10-16T23:59:59Z',
    status: 'waiting_for_participants' as const,
    alternativeRewardCoins: 50,
    termsAcknowledgedText: 'Prize delivered as an Amazon Gift Card for the selected region. Equal chance draw among all eligible registered members.',
    createdAt: new Date().toISOString(),
  },
];
