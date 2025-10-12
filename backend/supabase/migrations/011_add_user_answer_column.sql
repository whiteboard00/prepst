-- Add user_answer column to session_questions table to store submitted answers

ALTER TABLE session_questions 
ADD COLUMN user_answer JSONB DEFAULT NULL;

-- Add index for queries that filter by user_answer
CREATE INDEX idx_session_questions_user_answer ON session_questions(session_id) 
WHERE user_answer IS NOT NULL;

-- Comment
COMMENT ON COLUMN session_questions.user_answer IS 'Stores the user submitted answer as an array of strings (JSONB format)';

