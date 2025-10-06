-- Create a demo user for MVP testing
-- This bypasses Supabase Auth for now

-- First, drop the foreign key constraint from users to auth.users
-- We'll add it back when we implement proper authentication
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Insert a demo user with a fixed UUID
INSERT INTO users (id, email, full_name)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'demo@satprep.com',
    'Demo User'
)
ON CONFLICT (id) DO NOTHING;

-- Also update the users RLS policies to be permissive for MVP
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

CREATE POLICY "Allow all user operations for MVP" ON users
    FOR ALL USING (true) WITH CHECK (true);

-- Update RLS policies to be more permissive for MVP
-- We'll tighten these when we add proper auth

DROP POLICY IF EXISTS "Users can view own study plans" ON study_plans;
DROP POLICY IF EXISTS "Users can insert own study plans" ON study_plans;
DROP POLICY IF EXISTS "Users can update own study plans" ON study_plans;
DROP POLICY IF EXISTS "Users can delete own study plans" ON study_plans;

CREATE POLICY "Allow all study plan operations for MVP" ON study_plans
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own practice sessions" ON practice_sessions;
DROP POLICY IF EXISTS "Users can update own practice sessions" ON practice_sessions;

CREATE POLICY "Allow all practice session operations for MVP" ON practice_sessions
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own session topics" ON session_topics;

CREATE POLICY "Allow all session topic operations for MVP" ON session_topics
    FOR ALL USING (true) WITH CHECK (true);
