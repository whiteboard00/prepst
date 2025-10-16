-- Migration: Add learning analytics columns to session_questions
-- Purpose: Track time spent, confidence scores, and question start times for BKT
-- Date: 2025-10-16

-- Add tracking columns to session_questions table
ALTER TABLE session_questions 
ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER,
ADD COLUMN IF NOT EXISTS confidence_score INTEGER CHECK (confidence_score BETWEEN 1 AND 5);

-- Note: started_at column already exists in the table from migration 005

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_session_questions_analytics 
ON session_questions(topic_id, status, answered_at) 
WHERE status = 'answered';

-- Add comments
COMMENT ON COLUMN session_questions.time_spent_seconds IS 'Time spent answering question in seconds (for cognitive load analysis)';
COMMENT ON COLUMN session_questions.confidence_score IS 'User confidence rating 1-5 (1=guessing, 5=very confident)';

