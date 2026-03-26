-- ============================================================================
-- Migration 034: Add course_id to diagnostic_tests and mock_exams
--
-- Links diagnostic tests and mock exams to specific courses.
-- Nullable for backward compatibility — existing records will be
-- backfilled to the SAT course.
-- ============================================================================

-- Add course_id to diagnostic_tests
ALTER TABLE diagnostic_tests ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
CREATE INDEX idx_diagnostic_tests_course_id ON diagnostic_tests(course_id);

-- Add course_id to mock_exams
ALTER TABLE mock_exams ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
CREATE INDEX idx_mock_exams_course_id ON mock_exams(course_id);

-- Backfill existing records to SAT course
UPDATE diagnostic_tests SET course_id = (SELECT id FROM courses WHERE slug = 'sat') WHERE course_id IS NULL;
UPDATE mock_exams SET course_id = (SELECT id FROM courses WHERE slug = 'sat') WHERE course_id IS NULL;

-- Add questions_per_module and adaptive_thresholds to SAT course config
UPDATE courses
SET config = config || '{
    "questions_per_module": 27,
    "adaptive_thresholds": {
        "hard_threshold": 0.7,
        "medium_threshold": 0.4
    },
    "difficulty_distributions": {
        "easy": {"E": 0.5, "M": 0.35, "H": 0.15},
        "medium": {"E": 0.33, "M": 0.34, "H": 0.33},
        "hard": {"E": 0.15, "M": 0.35, "H": 0.5}
    },
    "score_conversion": {
        "method": "linear",
        "theta_midpoint_score": 500,
        "theta_scale_factor": 100
    }
}'::jsonb
WHERE slug = 'sat';
