-- Drop the session_topics table as it's no longer used
-- Questions are now directly assigned to sessions via session_questions table
-- The study plan now uses session_questions which directly links sessions to specific questions

DROP TABLE IF EXISTS session_topics CASCADE;
