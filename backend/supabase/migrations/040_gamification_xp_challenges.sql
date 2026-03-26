-- XP / Points system
CREATE TABLE IF NOT EXISTS user_xp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL, -- 'question_correct', 'session_complete', 'streak_bonus', 'challenge_complete', 'perfect_session', 'mock_exam_complete'
    related_id TEXT, -- session_id, exam_id, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at);

-- Daily challenges
CREATE TABLE IF NOT EXISTS daily_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
    challenge_type TEXT NOT NULL, -- 'questions_count', 'accuracy_target', 'time_studied', 'streak_maintain'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    target_value INTEGER NOT NULL,
    xp_reward INTEGER NOT NULL DEFAULT 50,
    icon TEXT DEFAULT '🎯',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(challenge_date, challenge_type)
);

CREATE TABLE IF NOT EXISTS user_challenge_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
    current_value INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_user ON user_challenge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON daily_challenges(challenge_date);

-- Leaderboard materialized view (weekly)
CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_type TEXT NOT NULL DEFAULT 'weekly', -- 'weekly', 'monthly', 'all_time'
    period_start DATE NOT NULL,
    total_xp INTEGER NOT NULL DEFAULT 0,
    questions_answered INTEGER NOT NULL DEFAULT 0,
    accuracy REAL NOT NULL DEFAULT 0,
    rank INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_period ON leaderboard_entries(period_type, period_start, total_xp DESC);

-- RLS policies
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- Users can read their own XP
CREATE POLICY "users_read_own_xp" ON user_xp FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "service_manage_xp" ON user_xp FOR ALL USING (true);

CREATE POLICY "users_read_own_xp_tx" ON xp_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "service_manage_xp_tx" ON xp_transactions FOR ALL USING (true);

-- Anyone can read daily challenges
CREATE POLICY "anyone_read_challenges" ON daily_challenges FOR SELECT USING (true);
CREATE POLICY "service_manage_challenges" ON daily_challenges FOR ALL USING (true);

CREATE POLICY "users_read_own_progress" ON user_challenge_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "service_manage_progress" ON user_challenge_progress FOR ALL USING (true);

-- Leaderboard visible to all (opt-in handled at app level)
CREATE POLICY "anyone_read_leaderboard" ON leaderboard_entries FOR SELECT USING (true);
CREATE POLICY "service_manage_leaderboard" ON leaderboard_entries FOR ALL USING (true);
