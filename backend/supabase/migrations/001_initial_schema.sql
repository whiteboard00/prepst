-- Create enum for section type
CREATE TYPE section_type AS ENUM ('math', 'reading_writing');

-- Create enum for session status
CREATE TYPE session_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped');

-- Categories table (Algebra, Advanced Math, etc.)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    section section_type NOT NULL,
    weight_in_section DECIMAL(5,2) NOT NULL CHECK (weight_in_section >= 0 AND weight_in_section <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, section)
);

-- Topics table (Linear equations, Percentages, etc.)
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    weight_in_category DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (weight_in_category >= 0 AND weight_in_category <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, category_id)
);

-- Create index for faster topic lookups by category
CREATE INDEX idx_topics_category_id ON topics(category_id);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study Plans table
CREATE TABLE study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    test_date DATE NOT NULL,
    current_math_score INTEGER CHECK (current_math_score >= 200 AND current_math_score <= 800),
    target_math_score INTEGER CHECK (target_math_score >= 200 AND target_math_score <= 800),
    current_rw_score INTEGER CHECK (current_rw_score >= 200 AND current_rw_score <= 800),
    target_rw_score INTEGER CHECK (target_rw_score >= 200 AND target_rw_score <= 800),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (test_date > start_date),
    CHECK (target_math_score >= current_math_score),
    CHECK (target_rw_score >= current_rw_score)
);

-- Create index for faster user lookups
CREATE INDEX idx_study_plans_user_id ON study_plans(user_id);
CREATE INDEX idx_study_plans_active ON study_plans(user_id, is_active) WHERE is_active = TRUE;

-- Practice Sessions table
CREATE TABLE practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_plan_id UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    session_number INTEGER NOT NULL,
    status session_status DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(study_plan_id, session_number)
);

-- Create indexes for session lookups
CREATE INDEX idx_practice_sessions_study_plan ON practice_sessions(study_plan_id);
CREATE INDEX idx_practice_sessions_scheduled_date ON practice_sessions(study_plan_id, scheduled_date);

-- Session Topics table (many-to-many relationship)
CREATE TABLE session_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    num_questions INTEGER NOT NULL CHECK (num_questions > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, topic_id)
);

-- Create indexes for session topic lookups
CREATE INDEX idx_session_topics_session_id ON session_topics(session_id);
CREATE INDEX idx_session_topics_topic_id ON session_topics(topic_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_plans_updated_at BEFORE UPDATE ON study_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_practice_sessions_updated_at BEFORE UPDATE ON practice_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_topics ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Categories and Topics are public read
CREATE POLICY "Categories are viewable by everyone" ON categories
    FOR SELECT USING (true);

CREATE POLICY "Topics are viewable by everyone" ON topics
    FOR SELECT USING (true);

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Study Plans - users can only access their own
CREATE POLICY "Users can view own study plans" ON study_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study plans" ON study_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study plans" ON study_plans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study plans" ON study_plans
    FOR DELETE USING (auth.uid() = user_id);

-- Practice Sessions - users can only access sessions from their study plans
CREATE POLICY "Users can view own practice sessions" ON practice_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM study_plans
            WHERE study_plans.id = practice_sessions.study_plan_id
            AND study_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own practice sessions" ON practice_sessions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM study_plans
            WHERE study_plans.id = practice_sessions.study_plan_id
            AND study_plans.user_id = auth.uid()
        )
    );

-- Session Topics - users can only access topics from their sessions
CREATE POLICY "Users can view own session topics" ON session_topics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM practice_sessions ps
            JOIN study_plans sp ON sp.id = ps.study_plan_id
            WHERE ps.id = session_topics.session_id
            AND sp.user_id = auth.uid()
        )
    );
