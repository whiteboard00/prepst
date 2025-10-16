-- Migration: Add stimulus column to questions table
-- Purpose: Store passage/context for Reading and Writing questions
-- Date: 2025-10-15

-- Add stimulus column to questions table
-- This field stores the reading passage/context that appears before the question
-- Only used for English (Reading and Writing) questions; NULL for math questions
ALTER TABLE questions
ADD COLUMN stimulus TEXT;

-- Add comment
COMMENT ON COLUMN questions.stimulus IS 'Reading passage or context for English questions (NULL for math questions)';
