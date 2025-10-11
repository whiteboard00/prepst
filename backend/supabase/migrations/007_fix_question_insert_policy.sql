-- Drop the previous policy that isn't working
DROP POLICY IF EXISTS "Backend can insert questions" ON questions;

-- Create a new policy that allows anon role to insert
-- This is needed for the import script
CREATE POLICY "Allow anon inserts for import"
ON questions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Also allow service_role to insert (for when we use service role key)
CREATE POLICY "Service role can insert questions"
ON questions
FOR INSERT
TO service_role
WITH CHECK (true);
