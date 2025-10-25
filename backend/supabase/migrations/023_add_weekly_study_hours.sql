-- Add weekly_study_hours to study_plans table
-- This allows future batch generation to know how many questions to generate

ALTER TABLE study_plans
ADD COLUMN weekly_study_hours INTEGER DEFAULT 20;

COMMENT ON COLUMN study_plans.weekly_study_hours IS 'Hours per week user commits to studying (used to calculate questions per batch)';
