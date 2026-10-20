-- ======================================================================
-- LUCKYLY PRODUCTION DATABASE SCHEMA (PostgreSQL / Cloud SQL / Supabase)
-- High-throughput, Zero-trust Schema for Authentication, Survey & Analytics
-- ======================================================================

-- Enable pgcrypto / uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------
-- 1. USERS & CORE BALANCE ALLOCATION
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id VARCHAR(128) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  picture TEXT,
  coins INTEGER NOT NULL DEFAULT 1500 CHECK (coins >= 0),
  amazon_region VARCHAR(32) NOT NULL DEFAULT 'US',
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);

-- ----------------------------------------------------------------------
-- 2. ONBOARDING SURVEY RESPONSES
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id VARCHAR(100) NOT NULL,
  answer JSONB NOT NULL,
  amazon_region VARCHAR(32) NOT NULL DEFAULT 'US',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Composite index on question_id and created_at for fast aggregation queries
CREATE INDEX IF NOT EXISTS idx_survey_responses_question_created 
  ON survey_responses (question_id, created_at);

CREATE INDEX IF NOT EXISTS idx_survey_responses_user_id 
  ON survey_responses (user_id);

-- ----------------------------------------------------------------------
-- 3. CLIENT-SIDE CLICKSTREAM & BEHAVIORAL TRACKING EVENTS
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(100) NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  element_id VARCHAR(100),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optimization indexes for conversion funnel and time-based partitioning
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created 
  ON analytics_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id 
  ON analytics_events (session_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_element_created 
  ON analytics_events (element_id, created_at DESC)
  WHERE element_id IS NOT NULL;
