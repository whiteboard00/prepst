-- Add RLS policies for session_questions table
-- This allows the backend to insert questions when creating study plans

-- Enable RLS on session_questions
ALTER TABLE session_questions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their session questions
CREATE POLICY "Users can view their own session questions"
ON session_questions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM practice_sessions ps
        JOIN study_plans sp ON ps.study_plan_id = sp.id
        WHERE ps.id = session_questions.session_id
        AND sp.user_id = auth.uid()
    )
);

-- Allow authenticated users to insert session questions for their own sessions
CREATE POLICY "Users can insert session questions for their sessions"
ON session_questions
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM practice_sessions ps
        JOIN study_plans sp ON ps.study_plan_id = sp.id
        WHERE ps.id = session_questions.session_id
        AND sp.user_id = auth.uid()
    )
);

-- Allow authenticated users to update their session question status
CREATE POLICY "Users can update their session question status"
ON session_questions
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM practice_sessions ps
        JOIN study_plans sp ON ps.study_plan_id = sp.id
        WHERE ps.id = session_questions.session_id
        AND sp.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM practice_sessions ps
        JOIN study_plans sp ON ps.study_plan_id = sp.id
        WHERE ps.id = session_questions.session_id
        AND sp.user_id = auth.uid()
    )
);
