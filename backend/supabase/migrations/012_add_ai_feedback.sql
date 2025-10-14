-- Create table to store AI-generated feedback
CREATE TABLE ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_question_id UUID NOT NULL REFERENCES session_questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feedback_type VARCHAR(50) NOT NULL DEFAULT 'both', -- 'explanation', 'hints', 'both'
    feedback_content JSONB NOT NULL, -- {explanation: string, hints: string[], learning_points: string[], key_concepts: string[]}
    context_used JSONB, -- Store context used for generation (for debugging)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_question_id, user_id, feedback_type)
);

-- Create indexes for performance
CREATE INDEX idx_ai_feedback_session_question ON ai_feedback(session_question_id);
CREATE INDEX idx_ai_feedback_user ON ai_feedback(user_id);
CREATE INDEX idx_ai_feedback_created_at ON ai_feedback(created_at DESC);

-- Add RLS policies
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- Users can only read their own feedback
CREATE POLICY "Users can view own feedback"
    ON ai_feedback
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own feedback (via backend)
CREATE POLICY "Users can insert own feedback"
    ON ai_feedback
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own feedback
CREATE POLICY "Users can delete own feedback"
    ON ai_feedback
    FOR DELETE
    USING (auth.uid() = user_id);

