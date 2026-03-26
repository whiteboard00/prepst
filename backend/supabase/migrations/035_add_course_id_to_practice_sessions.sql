-- Migration: Add course_id to practice_sessions for course-scoped queries
-- This allows practice sessions to be filtered by course without joining through study_plans

-- Add course_id column
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_practice_sessions_course_id ON practice_sessions(course_id);

-- Backfill existing practice sessions with SAT course_id
-- Derive from their study plan's course_id, or fall back to SAT course directly
UPDATE practice_sessions ps
SET course_id = COALESCE(
    (SELECT sp.course_id FROM study_plans sp WHERE sp.id = ps.study_plan_id),
    (SELECT id FROM courses WHERE slug = 'sat')
)
WHERE ps.course_id IS NULL;
