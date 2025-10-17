-- =====================================================
-- LEARNING ANALYTICS MONITORING QUERIES
-- =====================================================
-- Run these queries to monitor and verify the learning analytics system

-- =====================================================
-- 1. Check User Skill Mastery Tracking
-- =====================================================
-- Shows each user's mastery level for each skill/topic
-- Ordered by lowest mastery first to identify weak areas
SELECT 
  u.email,
  t.name as topic,
  usm.mastery_probability,
  usm.total_attempts,
  usm.correct_attempts,
  usm.learning_velocity,
  usm.plateau_flag,
  usm.last_practiced_at
FROM user_skill_mastery usm
JOIN users u ON u.id = usm.user_id
JOIN topics t ON t.id = usm.skill_id
ORDER BY usm.mastery_probability ASC;

-- =====================================================
-- 2. Check Confidence & Timing Data Collection
-- =====================================================
-- Verifies that confidence scores and timing data are being captured
SELECT 
  COUNT(*) as total_answered,
  AVG(confidence_score) as avg_confidence,
  AVG(time_spent_seconds) as avg_time_seconds,
  MIN(confidence_score) as min_confidence,
  MAX(confidence_score) as max_confidence,
  COUNT(DISTINCT sp.user_id) as unique_users
FROM session_questions sq
JOIN practice_sessions ps ON ps.id = sq.session_id
JOIN study_plans sp ON sp.id = ps.study_plan_id
WHERE sq.confidence_score IS NOT NULL;

-- =====================================================
-- 3. Check Learning Events Log
-- =====================================================
-- Shows what types of events are being logged
SELECT 
  event_type,
  COUNT(*) as count,
  MAX(created_at) as last_event
FROM learning_events
GROUP BY event_type
ORDER BY count DESC;

-- =====================================================
-- 4. Performance Snapshots Overview
-- =====================================================
-- Shows all performance snapshots created
SELECT 
  u.email,
  ps.snapshot_type,
  ps.predicted_sat_math,
  ps.predicted_sat_rw,
  ps.estimated_ability_math,
  ps.estimated_ability_rw,
  ps.questions_answered,
  ps.questions_correct,
  ROUND(100.0 * ps.questions_correct / NULLIF(ps.questions_answered, 0), 2) as accuracy_pct,
  ps.avg_confidence_score,
  ps.cognitive_efficiency_score,
  ps.created_at
FROM user_performance_snapshots ps
JOIN users u ON u.id = ps.user_id
ORDER BY ps.created_at DESC
LIMIT 50;

-- =====================================================
-- 5. User Progress Summary
-- =====================================================
-- Comprehensive view of each user's learning progress
SELECT 
  u.email,
  COUNT(DISTINCT usm.skill_id) as skills_tracked,
  AVG(usm.mastery_probability) as avg_mastery,
  SUM(usm.total_attempts) as total_attempts,
  SUM(usm.correct_attempts) as total_correct,
  ROUND(100.0 * SUM(usm.correct_attempts) / NULLIF(SUM(usm.total_attempts), 0), 2) as overall_accuracy,
  COUNT(CASE WHEN usm.plateau_flag = true THEN 1 END) as skills_at_plateau,
  MAX(usm.last_practiced_at) as last_practice
FROM users u
LEFT JOIN user_skill_mastery usm ON u.id = usm.user_id
GROUP BY u.id, u.email
ORDER BY avg_mastery DESC;

-- =====================================================
-- 6. Topic Difficulty Analysis (IRT Parameters)
-- =====================================================
-- Shows calibrated difficulty for questions
SELECT 
  t.name as topic,
  COUNT(qdp.question_id) as questions_calibrated,
  AVG(qdp.difficulty_param) as avg_difficulty_param,
  AVG(qdp.discrimination_param) as avg_discrimination_param,
  MIN(qdp.difficulty_param) as easiest,
  MAX(qdp.difficulty_param) as hardest,
  AVG(qdp.total_responses) as avg_responses,
  SUM(CASE WHEN qdp.is_calibrated = true THEN 1 ELSE 0 END) as fully_calibrated_count
FROM question_difficulty_params qdp
JOIN questions q ON q.id = qdp.question_id
JOIN topics t ON t.id = q.topic_id
GROUP BY t.id, t.name
ORDER BY avg_difficulty_param DESC;

-- =====================================================
-- 7. Recent Learning Events for a User
-- =====================================================
-- Replace 'user_email_here' with actual user email
-- Shows detailed learning progression for one user
SELECT 
  le.event_type,
  t.name as skill,
  le.mastery_before,
  le.mastery_after,
  (le.mastery_after - le.mastery_before) as mastery_change,
  le.event_data,
  le.created_at
FROM learning_events le
JOIN topics t ON t.id = le.skill_id
JOIN users u ON u.id = le.user_id
WHERE u.email = 'user_email_here'
ORDER BY le.created_at DESC
LIMIT 20;

-- =====================================================
-- 8. Skills Needing Attention (Low Mastery)
-- =====================================================
-- Identifies skills where users are struggling (mastery < 0.5)
SELECT 
  u.email,
  t.name as topic,
  usm.mastery_probability,
  usm.total_attempts,
  usm.correct_attempts,
  usm.learning_velocity,
  usm.last_practiced_at
FROM user_skill_mastery usm
JOIN users u ON u.id = usm.user_id
JOIN topics t ON t.id = usm.skill_id
WHERE usm.mastery_probability < 0.5
ORDER BY usm.mastery_probability ASC, usm.total_attempts DESC;

-- =====================================================
-- 9. High Performers (Mastery > 0.8)
-- =====================================================
-- Shows skills where users have high mastery
SELECT 
  u.email,
  t.name as topic,
  usm.mastery_probability,
  usm.total_attempts,
  usm.correct_attempts,
  usm.learning_velocity
FROM user_skill_mastery usm
JOIN users u ON u.id = usm.user_id
JOIN topics t ON t.id = usm.skill_id
WHERE usm.mastery_probability > 0.8
ORDER BY usm.mastery_probability DESC;

-- =====================================================
-- 10. Confidence vs Performance Analysis
-- =====================================================
-- Analyzes correlation between confidence and correctness
-- Note: is_correct is stored in ai_feedback.context_used JSONB field
SELECT 
  sq.confidence_score,
  COUNT(*) as total_questions,
  SUM(CASE 
    WHEN af.context_used->>'is_correct' = 'true' THEN 1 
    ELSE 0 
  END) as correct_count,
  ROUND(100.0 * SUM(CASE 
    WHEN af.context_used->>'is_correct' = 'true' THEN 1 
    ELSE 0 
  END) / COUNT(*), 2) as accuracy_pct,
  AVG(sq.time_spent_seconds) as avg_time_seconds
FROM session_questions sq
LEFT JOIN ai_feedback af ON af.session_question_id = sq.id
WHERE sq.confidence_score IS NOT NULL
GROUP BY sq.confidence_score
ORDER BY sq.confidence_score;

-- =====================================================
-- 11. Session Completion Statistics
-- =====================================================
-- Shows completed sessions and their snapshots
SELECT 
  ps.id as session_id,
  u.email,
  ps.status,
  COUNT(sq.id) as total_questions,
  SUM(CASE WHEN sq.status = 'answered' THEN 1 ELSE 0 END) as answered,
  ps.created_at,
  ps.updated_at,
  CASE 
    WHEN ups.id IS NOT NULL THEN 'Snapshot Created'
    ELSE 'No Snapshot'
  END as snapshot_status
FROM practice_sessions ps
JOIN study_plans sp ON sp.id = ps.study_plan_id
JOIN users u ON u.id = sp.user_id
LEFT JOIN session_questions sq ON sq.session_id = ps.id
LEFT JOIN user_performance_snapshots ups ON ups.related_id = ps.id AND ups.snapshot_type = 'session_complete'
GROUP BY ps.id, u.email, ps.status, ps.created_at, ps.updated_at, ups.id
ORDER BY ps.updated_at DESC
LIMIT 20;

-- =====================================================
-- 12. Learning Velocity Trends
-- =====================================================
-- Shows which skills are being learned fastest
SELECT 
  u.email,
  t.name as topic,
  usm.learning_velocity,
  usm.mastery_probability,
  usm.total_attempts,
  usm.last_practiced_at
FROM user_skill_mastery usm
JOIN users u ON u.id = usm.user_id
JOIN topics t ON t.id = usm.skill_id
WHERE usm.learning_velocity IS NOT NULL
ORDER BY usm.learning_velocity DESC
LIMIT 30;

