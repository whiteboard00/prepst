-- Migration: Add estimated completion time to practice sessions
-- Purpose: Track estimated time to complete each practice session
-- Date: 2025-10-18

-- Add estimated_time_minutes column to practice_sessions table
ALTER TABLE practice_sessions
ADD COLUMN IF NOT EXISTS estimated_time_minutes INTEGER;

-- Add comment
COMMENT ON COLUMN practice_sessions.estimated_time_minutes IS 'Estimated time to complete the session in minutes (based on number of questions)';
