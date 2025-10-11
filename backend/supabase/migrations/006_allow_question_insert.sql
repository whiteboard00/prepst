-- Allow backend to insert questions (for import script)
-- This is temporary - in production you'd use service role key

CREATE POLICY "Backend can insert questions"
ON questions
FOR INSERT
WITH CHECK (true);  -- Allow all inserts (backend will handle validation)

-- Note: In production, you should use SUPABASE_SERVICE_ROLE_KEY instead
-- and remove this policy, or restrict it to a specific service account
