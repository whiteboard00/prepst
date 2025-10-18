-- Migration: User Profile Enhancements
-- Description: Add profile fields, preferences, achievements, and streak tracking

-- 1. Enhance users table with profile fields
ALTER TABLE users
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS grade_level VARCHAR(20),
ADD COLUMN IF NOT EXISTS school_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS parent_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS study_goal TEXT;

-- 2. Create user preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  -- Theme and display settings
  theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  font_size VARCHAR(20) DEFAULT 'normal' CHECK (font_size IN ('small', 'normal', 'large')),
  reduce_animations BOOLEAN DEFAULT FALSE,

  -- Study preferences
  preferred_study_time VARCHAR(20) DEFAULT 'evening' CHECK (preferred_study_time IN ('morning', 'afternoon', 'evening', 'night')),
  session_length_preference INTEGER DEFAULT 30 CHECK (session_length_preference IN (15, 30, 45, 60)),
  learning_style VARCHAR(20) DEFAULT 'balanced' CHECK (learning_style IN ('visual', 'reading', 'practice', 'balanced')),
  difficulty_adaptation VARCHAR(20) DEFAULT 'balanced' CHECK (difficulty_adaptation IN ('aggressive', 'balanced', 'gentle')),

  -- Notification settings (JSONB for flexibility)
  email_notifications JSONB DEFAULT '{
    "daily_reminder": true,
    "weekly_progress": true,
    "achievement_unlocked": true,
    "streak_reminder": true,
    "parent_reports": false
  }'::jsonb,

  push_notifications JSONB DEFAULT '{
    "enabled": false,
    "daily_reminder": false,
    "achievement_unlocked": false
  }'::jsonb,

  -- Privacy settings
  profile_visibility VARCHAR(20) DEFAULT 'private' CHECK (profile_visibility IN ('private', 'friends', 'public')),
  show_on_leaderboard BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create user achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  achievement_name VARCHAR(100) NOT NULL,
  achievement_description TEXT,
  achievement_icon VARCHAR(50), -- emoji or icon name
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,

  UNIQUE(user_id, achievement_type)
);

-- Create index for faster queries
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked_at ON user_achievements(unlocked_at DESC);

-- 4. Create study streaks table
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_study_date DATE,
  streak_frozen_until DATE, -- For vacation mode
  total_study_days INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create user goals history table (track goal changes)
CREATE TABLE IF NOT EXISTS user_goal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  previous_math_target INTEGER,
  new_math_target INTEGER,
  previous_rw_target INTEGER,
  new_rw_target INTEGER,
  previous_test_date DATE,
  new_test_date DATE,
  change_reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Add RLS policies for new tables
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goal_history ENABLE ROW LEVEL SECURITY;

-- User preferences policies
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User achievements policies
CREATE POLICY "Users can view their own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (true); -- Controlled by backend

-- User streaks policies
CREATE POLICY "Users can view their own streaks"
  ON user_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
  ON user_streaks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks"
  ON user_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User goal history policies
CREATE POLICY "Users can view their own goal history"
  ON user_goal_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goal history"
  ON user_goal_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 7. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE
  ON user_preferences FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_streaks_updated_at BEFORE UPDATE
  ON user_streaks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 8. Insert default preferences for existing users
INSERT INTO user_preferences (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

-- 9. Initialize streaks for existing users
INSERT INTO user_streaks (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

-- 10. Define standard achievements (for reference only)
-- These will be inserted by the backend when conditions are met
-- Example structure:
-- INSERT INTO user_achievements (user_id, achievement_type, achievement_name, achievement_description, achievement_icon, metadata)
-- VALUES (user_id, 'first_session', 'First Steps', 'Complete your first practice session', '🎯', '{}'::jsonb);

COMMENT ON TABLE user_preferences IS 'User preferences for theme, notifications, and study settings';
COMMENT ON TABLE user_achievements IS 'Achievements and badges earned by users';
COMMENT ON TABLE user_streaks IS 'Study streak tracking for gamification';
COMMENT ON TABLE user_goal_history IS 'History of user goal changes for tracking progress adjustments';