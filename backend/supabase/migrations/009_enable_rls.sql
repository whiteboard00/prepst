-- Re-enable RLS on questions table after import
-- Run this AFTER you've completed the question import

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- The existing policies will still be in place:
-- - "Questions viewable by authenticated users" (SELECT)
-- - "Allow anon inserts for import" (INSERT)
-- - "Service role can insert questions" (INSERT)

-- If you want to remove the anon insert policy after import for security:
-- DROP POLICY IF EXISTS "Allow anon inserts for import" ON questions;
