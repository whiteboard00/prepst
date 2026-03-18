-- Migration: Relax section constraints to support ACT and future courses
-- The diagnostic_test_questions table had a CHECK constraint limiting sections to math/reading_writing only

-- Drop the restrictive check constraint on diagnostic_test_questions.section
ALTER TABLE diagnostic_test_questions DROP CONSTRAINT IF EXISTS diagnostic_test_questions_section_check;

-- Add a more permissive check that allows any non-empty section value
ALTER TABLE diagnostic_test_questions ADD CONSTRAINT diagnostic_test_questions_section_check
  CHECK (section IS NOT NULL AND length(section) > 0);
