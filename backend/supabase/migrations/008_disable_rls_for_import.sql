-- Temporarily disable RLS on questions table for import
-- We'll re-enable it after import is complete

ALTER TABLE questions DISABLE ROW LEVEL SECURITY;

-- Note: Remember to run 009_enable_rls.sql after import is complete!
