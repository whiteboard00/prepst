-- Relax mock exam score constraints for multi-course support
-- SAT: 400-1600 total, 200-800 per section
-- ACT: 1-36 composite, 1-36 per section

-- Drop restrictive SAT-only CHECK constraints
ALTER TABLE mock_exams DROP CONSTRAINT IF EXISTS mock_exams_total_score_check;
ALTER TABLE mock_exams DROP CONSTRAINT IF EXISTS mock_exams_math_score_check;
ALTER TABLE mock_exams DROP CONSTRAINT IF EXISTS mock_exams_rw_score_check;

-- Add relaxed constraints (allow any positive score)
ALTER TABLE mock_exams ADD CONSTRAINT mock_exams_total_score_check
  CHECK (total_score IS NULL OR total_score >= 0);
ALTER TABLE mock_exams ADD CONSTRAINT mock_exams_math_score_check
  CHECK (math_score IS NULL OR math_score >= 0);
ALTER TABLE mock_exams ADD CONSTRAINT mock_exams_rw_score_check
  CHECK (rw_score IS NULL OR rw_score >= 0);

-- Add section_scores JSONB column for dynamic multi-section score storage
-- e.g. {"english": 28, "math": 32, "reading": 30} for ACT
ALTER TABLE mock_exams ADD COLUMN IF NOT EXISTS section_scores JSONB;
