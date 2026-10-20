-- ======================================================================
-- LUCKYLY PRODUCTION ANALYTICS QUERIES (PostgreSQL / Cloud SQL / Supabase)
-- High-throughput, Zero-trust Reporting and Behavioral Analysis
-- ======================================================================

-- ----------------------------------------------------------------------
-- QUERY 1: 3-STEP CONVERSION FUNNEL
-- Measures unique session drop-off: page_view -> click_cta -> signup_success
-- ----------------------------------------------------------------------
WITH funnel_stages AS (
  SELECT
    session_id,
    bool_or(event_name = 'page_view') AS step1_page_view,
    bool_or(event_name IN ('click_cta', 'click', 'cta_join')) AS step2_click_cta,
    bool_or(event_name IN ('signup_success', 'auth_success', 'turnstile_passed')) AS step3_signup_success
  FROM analytics_events
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY session_id
)
SELECT
  COUNT(*) AS total_sessions,
  COUNT(CASE WHEN step1_page_view THEN 1 END) AS step1_page_views,
  COUNT(CASE WHEN step1_page_view AND step2_click_cta THEN 1 END) AS step2_clicks,
  COUNT(CASE WHEN step1_page_view AND step2_click_cta AND step3_signup_success THEN 1 END) AS step3_signups,
  -- Step-to-step conversion percentages
  ROUND(
    100.0 * COUNT(CASE WHEN step1_page_view AND step2_click_cta THEN 1 END) / 
    NULLIF(COUNT(CASE WHEN step1_page_view THEN 1 END), 0), 
    2
  ) AS step1_to_step2_pct,
  ROUND(
    100.0 * COUNT(CASE WHEN step1_page_view AND step2_click_cta AND step3_signup_success THEN 1 END) / 
    NULLIF(COUNT(CASE WHEN step1_page_view AND step2_click_cta THEN 1 END), 0), 
    2
  ) AS step2_to_step3_pct,
  ROUND(
    100.0 * COUNT(CASE WHEN step1_page_view AND step2_click_cta AND step3_signup_success THEN 1 END) / 
    NULLIF(COUNT(CASE WHEN step1_page_view THEN 1 END), 0), 
    2
  ) AS overall_conversion_pct
FROM funnel_stages;


-- ----------------------------------------------------------------------
-- QUERY 2: 24-HOUR CLICK HEATMAP
-- Top 10 most clicked element_id values within the past 24 hours
-- ----------------------------------------------------------------------
SELECT
  element_id,
  COUNT(*) AS total_clicks,
  COUNT(DISTINCT session_id) AS unique_clickers,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS pct_of_total_clicks
FROM analytics_events
WHERE
  element_id IS NOT NULL 
  AND element_id <> ''
  AND created_at >= NOW() - INTERVAL '24 hours'
  AND (event_name LIKE '%click%' OR event_name = 'click_cta')
GROUP BY element_id
ORDER BY total_clicks DESC
LIMIT 10;


-- ----------------------------------------------------------------------
-- QUERY 3: SURVEY BREAKDOWN
-- Aggregates survey responses grouped by question_id and distinct answer values,
-- calculating counts, breakdown percentages, and total unique participants.
-- ----------------------------------------------------------------------
WITH parsed_answers AS (
  SELECT
    question_id,
    user_id,
    CASE 
      WHEN jsonb_typeof(answer) = 'array' THEN jsonb_array_elements_text(answer)
      WHEN jsonb_typeof(answer) = 'string' THEN answer #>> '{}'
      ELSE answer::text
    END AS normalized_answer
  FROM survey_responses
),
question_totals AS (
  SELECT
    question_id,
    COUNT(*) AS total_responses_for_question,
    COUNT(DISTINCT user_id) AS unique_participants_for_question
  FROM parsed_answers
  GROUP BY question_id
)
SELECT
  p.question_id,
  p.normalized_answer AS answer_option,
  COUNT(*) AS option_count,
  COUNT(DISTINCT p.user_id) AS unique_respondents,
  ROUND(100.0 * COUNT(*) / qt.total_responses_for_question, 2) AS breakdown_pct,
  qt.unique_participants_for_question AS total_question_participants
FROM parsed_answers p
JOIN question_totals qt ON p.question_id = qt.question_id
GROUP BY 
  p.question_id, 
  p.normalized_answer, 
  qt.total_responses_for_question,
  qt.unique_participants_for_question
ORDER BY 
  p.question_id, 
  option_count DESC;
