-- Migration: Add is_correct column to session_questions table
-- Purpose: Track whether user answers are correct for wrong answer tracking
-- Date: 2025-01-27

-- Add is_correct column to session_questions table
ALTER TABLE session_questions 
ADD COLUMN is_correct BOOLEAN DEFAULT NULL;

-- Add index for queries that filter by incorrect answers
CREATE INDEX idx_session_questions_incorrect 
ON session_questions(session_id, is_correct) 
WHERE is_correct = false;

-- Add index for queries that filter by correct answers
CREATE INDEX idx_session_questions_correct 
ON session_questions(session_id, is_correct) 
WHERE is_correct = true;

-- Add comment
COMMENT ON COLUMN session_questions.is_correct IS 'Tracks whether the user answer is correct (true), incorrect (false), or not yet answered (null)';
