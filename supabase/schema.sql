-- =============================================================
-- LUCKYLY.ORG — DUAL-SYNC DATABASE SCHEMA REFERENCE
-- File: supabase/schema.sql
-- Tables: waitlist_users, questionnaire_responses, analytics_events
-- =============================================================

-- =============================================================
-- 1. TABLE: waitlist_users
-- =============================================================
CREATE TABLE IF NOT EXISTS public.waitlist_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    member_badge_id TEXT NOT NULL,
    pioneer_badge_id TEXT,
    coin_balance INTEGER NOT NULL DEFAULT 1500,
    amazon_region TEXT NOT NULL DEFAULT 'US',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.waitlist_users
    ADD COLUMN IF NOT EXISTS amazon_region TEXT NOT NULL DEFAULT 'US';

CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_users_email ON public.waitlist_users (lower(trim(email)));
CREATE INDEX IF NOT EXISTS idx_waitlist_users_member_badge_id ON public.waitlist_users (member_badge_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_users_badge_id ON public.waitlist_users (pioneer_badge_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_users_amazon_region ON public.waitlist_users (amazon_region);
CREATE INDEX IF NOT EXISTS idx_waitlist_users_created_at ON public.waitlist_users (created_at DESC);

ALTER TABLE public.waitlist_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert to waitlist_users"
    ON public.waitlist_users
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Allow public select on waitlist_users"
    ON public.waitlist_users
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow public update on waitlist_users"
    ON public.waitlist_users
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE public.waitlist_users IS 'Phase 1 Member waitlist registrations for luckyly.org';

-- =============================================================
-- 2. TABLE: questionnaire_responses
-- =============================================================
CREATE TABLE IF NOT EXISTS public.questionnaire_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    email TEXT NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    amazon_region TEXT NOT NULL DEFAULT 'US',
    coins_awarded INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.questionnaire_responses
    ADD COLUMN IF NOT EXISTS amazon_region TEXT NOT NULL DEFAULT 'US';

CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_email ON public.questionnaire_responses (lower(trim(email)));
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_user_id ON public.questionnaire_responses (user_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_amazon_region ON public.questionnaire_responses (amazon_region);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_created_at ON public.questionnaire_responses (created_at DESC);

ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert to questionnaire_responses"
    ON public.questionnaire_responses
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Allow public select on questionnaire_responses"
    ON public.questionnaire_responses
    FOR SELECT
    TO anon, authenticated
    USING (true);

COMMENT ON TABLE public.questionnaire_responses IS 'Market research question responses for luckyly.org';

-- =============================================================
-- 3. TABLE: analytics_events
-- =============================================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    user_id TEXT,
    event_name TEXT NOT NULL,
    element_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON public.analytics_events (session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON public.analytics_events (event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events (created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert to analytics_events"
    ON public.analytics_events
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Allow public select on analytics_events"
    ON public.analytics_events
    FOR SELECT
    TO anon, authenticated
    USING (true);

COMMENT ON TABLE public.analytics_events IS 'Detailed cookieless user session logs and audit trail';
