/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUCKYLY SUPABASE CLIENT UTILITY & DUAL-SYNC PERSISTENCE
 * Initializes Supabase client with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 * Handles dual-sync database operations for:
 * 1. Waitlist members (`waitlist_users`)
 * 2. Market research questionnaire responses (`questionnaire_responses`)
 * 3. Behavioral session analytics events (`analytics_events`)
 * Includes graceful fallback check for preview environments when keys are missing.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && import.meta?.env) ? import.meta.env : (process.env as any || {});
const rawUrl = env.VITE_SUPABASE_URL as string | undefined;
const rawAnonKey = env.VITE_SUPABASE_ANON_KEY as string | undefined;

let supabaseWarned = false;
if ((!rawUrl || !rawAnonKey) && !supabaseWarned) {
  supabaseWarned = true;
  console.warn('[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is undefined. Operating in fallback mode.');
}

// Fallback check: Verify if real credentials have been provided
export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawAnonKey &&
  rawUrl.trim() !== '' &&
  rawAnonKey.trim() !== '' &&
  rawUrl !== 'https://your-project.supabase.co' &&
  !rawAnonKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
);

// Fallback initialization so calling client methods never throws fatal errors
const SUPABASE_URL = isSupabaseConfigured
  ? rawUrl!
  : 'https://preview-fallback.supabase.co';

const SUPABASE_ANON_KEY = isSupabaseConfigured
  ? rawAnonKey!
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.preview_fallback_key';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export interface WaitlistUserRecord {
  id?: string;
  email: string;
  member_badge_id?: string;
  pioneer_badge_id?: string;
  coin_balance: number;
  amazon_region?: string;
  created_at?: string;
}

export interface QuestionnaireResponseRecord {
  id?: string;
  user_id?: string;
  email: string;
  answers: Record<string, any>;
  amazon_region?: string;
  coins_awarded?: number;
  created_at?: string;
}

export interface AnalyticsEventRecord {
  id?: string;
  session_id: string;
  user_id?: string;
  event_name: string;
  element_id?: string;
  metadata?: Record<string, any>;
  url?: string;
  created_at?: string;
}

export interface SupabaseInsertResult {
  success: boolean;
  isDuplicate: boolean;
  isFallback: boolean;
  error?: string | null;
}

/**
 * Inserts waitlist user into Supabase `waitlist_users` table:
 * Payload: { email, member_badge_id, coin_balance: 1500, amazon_region: 'US' }
 */
export async function insertWaitlistUserToSupabase(payload: {
  email: string;
  member_badge_id?: string;
  pioneer_badge_id?: string;
  coin_balance?: number;
  amazon_region?: string;
  created_at?: Date;
}): Promise<SupabaseInsertResult> {
  const cleanEmail = payload.email.trim().toLowerCase();
  const badgeId = payload.member_badge_id || payload.pioneer_badge_id || 'TKT-MEMBER-INITIAL';
  const balance = payload.coin_balance ?? 1500;
  const region = (payload.amazon_region || 'US').trim().toUpperCase();

  const record: Record<string, any> = {
    email: cleanEmail,
    member_badge_id: badgeId,
    pioneer_badge_id: badgeId,
    coin_balance: balance,
    amazon_region: region,
  };

  if (!isSupabaseConfigured) {
    console.info(
      '[Supabase] Keys missing during preview. Continuing gracefully with local persistence (localStorage luckyly_member_user).'
    );
    return {
      success: true,
      isDuplicate: false,
      isFallback: true,
    };
  }

  try {
    const { error } = await supabase
      .from('waitlist_users')
      .insert([record]);

    if (error) {
      const isDuplicate =
        error.code === '23505' ||
        error.message?.toLowerCase().includes('duplicate') ||
        error.message?.toLowerCase().includes('unique') ||
        error.message?.toLowerCase().includes('already exists') ||
        (error as any).status === 409;

      if (isDuplicate) {
        console.info('[Supabase] Duplicate email recognized, returning member status retained:', cleanEmail);
        return { success: true, isDuplicate: true, isFallback: false };
      }

      console.warn('[Supabase] waitlist_users notice:', error.message || error);
      return { success: true, isDuplicate: false, isFallback: false, error: error.message };
    }

    console.info('[Supabase] Successfully saved waitlist user to waitlist_users:', cleanEmail);
    return { success: true, isDuplicate: false, isFallback: false };
  } catch (err: any) {
    console.warn('[Supabase] Handled preview exception gracefully:', err?.message || err);
    return { success: true, isDuplicate: false, isFallback: true, error: err?.message };
  }
}

/**
 * Updates preferred Amazon region for a waitlist user in Supabase `waitlist_users`.
 */
export async function updateWaitlistUserRegionInSupabase(email: string, amazonRegion: string): Promise<SupabaseInsertResult> {
  const cleanEmail = email.trim().toLowerCase();
  const region = (amazonRegion || 'US').trim().toUpperCase();

  if (!isSupabaseConfigured) {
    return { success: true, isDuplicate: false, isFallback: true };
  }

  try {
    const { error } = await supabase
      .from('waitlist_users')
      .update({ amazon_region: region })
      .eq('email', cleanEmail);

    if (error) {
      return { success: true, isDuplicate: false, isFallback: false, error: error.message };
    }
    return { success: true, isDuplicate: false, isFallback: false };
  } catch (err: any) {
    return { success: true, isDuplicate: false, isFallback: true, error: err?.message };
  }
}

/**
 * Inserts market research questionnaire responses into Supabase `questionnaire_responses` table.
 */
export async function saveQuestionnaireToSupabase(payload: {
  userId?: string;
  email: string;
  answers: Record<string, any>;
  amazon_region?: string;
  coinsAwarded?: number;
}): Promise<SupabaseInsertResult> {
  const cleanEmail = payload.email.trim().toLowerCase();
  const inferredRegion = payload.amazon_region || (typeof payload.answers?.q6_region === 'string' ? payload.answers.q6_region : 'US');
  const record = {
    user_id: payload.userId || null,
    email: cleanEmail,
    answers: payload.answers,
    amazon_region: String(inferredRegion || 'US').toUpperCase(),
    coins_awarded: payload.coinsAwarded ?? 100,
  };

  if (!isSupabaseConfigured) {
    console.info('[Supabase] Operating in fallback mode for questionnaire persistence.');
    return { success: true, isDuplicate: false, isFallback: true };
  }

  try {
    const { error } = await supabase
      .from('questionnaire_responses')
      .insert([record]);

    if (error) {
      console.warn('[Supabase] questionnaire_responses notice:', error.message || error);
      return { success: true, isDuplicate: false, isFallback: false, error: error.message };
    }

    console.info('[Supabase] Successfully saved questionnaire response for:', cleanEmail);
    return { success: true, isDuplicate: false, isFallback: false };
  } catch (err: any) {
    console.warn('[Supabase] Handled questionnaire exception gracefully:', err?.message || err);
    return { success: true, isDuplicate: false, isFallback: true, error: err?.message };
  }
}

/**
 * Inserts session analytics events into Supabase `analytics_events` table.
 */
export async function saveAnalyticsEventToSupabase(payload: {
  sessionId: string;
  userId?: string;
  eventName: string;
  elementId?: string;
  metadata?: Record<string, any>;
  url?: string;
}): Promise<SupabaseInsertResult> {
  const record = {
    session_id: payload.sessionId,
    user_id: payload.userId || null,
    event_name: payload.eventName,
    element_id: payload.elementId || null,
    metadata: payload.metadata || {},
    url: payload.url || (typeof window !== 'undefined' ? window.location.pathname : null),
  };

  if (!isSupabaseConfigured) {
    return { success: true, isDuplicate: false, isFallback: true };
  }

  try {
    const { error } = await supabase
      .from('analytics_events')
      .insert([record]);

    if (error) {
      return { success: true, isDuplicate: false, isFallback: false, error: error.message };
    }

    return { success: true, isDuplicate: false, isFallback: false };
  } catch (err: any) {
    return { success: true, isDuplicate: false, isFallback: true, error: err?.message };
  }
}

/**
 * Fetches all records from Supabase tables for the Admin Intelligence Dashboard.
 */
export async function fetchSupabaseAdminData(): Promise<{
  waitlistUsers: WaitlistUserRecord[];
  questionnaireResponses: QuestionnaireResponseRecord[];
  analyticsEvents: AnalyticsEventRecord[];
  isConfigured: boolean;
}> {
  if (!isSupabaseConfigured) {
    return {
      waitlistUsers: [],
      questionnaireResponses: [],
      analyticsEvents: [],
      isConfigured: false,
    };
  }

  try {
    const [usersRes, surveyRes, eventsRes] = await Promise.allSettled([
      supabase.from('waitlist_users').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('questionnaire_responses').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('analytics_events').select('*').order('created_at', { ascending: false }).limit(200),
    ]);

    const waitlistUsers = usersRes.status === 'fulfilled' && !usersRes.value.error
      ? (usersRes.value.data as any[]).map(u => ({
          ...u,
          member_badge_id: u.member_badge_id || u.pioneer_badge_id,
          pioneer_badge_id: u.member_badge_id || u.pioneer_badge_id,
        }))
      : [];

    const questionnaireResponses = surveyRes.status === 'fulfilled' && !surveyRes.value.error
      ? (surveyRes.value.data as QuestionnaireResponseRecord[])
      : [];

    const analyticsEvents = eventsRes.status === 'fulfilled' && !eventsRes.value.error
      ? (eventsRes.value.data as AnalyticsEventRecord[])
      : [];

    return {
      waitlistUsers,
      questionnaireResponses,
      analyticsEvents,
      isConfigured: true,
    };
  } catch (err) {
    console.warn('[Supabase] Failed to fetch admin data:', err);
    return {
      waitlistUsers: [],
      questionnaireResponses: [],
      analyticsEvents: [],
      isConfigured: false,
    };
  }
}
