-- =====================================================
-- Add Admin Role Support
-- =====================================================
-- This migration adds admin role functionality to the users table

-- Add role column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Add constraint to ensure valid roles
ALTER TABLE users 
ADD CONSTRAINT chk_valid_role 
CHECK (role IN ('user', 'admin', 'moderator'));

-- Example: Set first user as admin (OPTIONAL - comment out if not needed)
-- UPDATE users 
-- SET role = 'admin' 
-- WHERE email = 'your_email@example.com';

-- Function to check if user is admin (can be used in RLS policies)
CREATE OR REPLACE FUNCTION is_user_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON COLUMN users.role IS 'User role: user (default), admin, or moderator';
COMMENT ON FUNCTION is_user_admin IS 'Check if a user has admin role';

