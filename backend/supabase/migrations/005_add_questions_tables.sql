-- Migration: Add questions and session_questions tables
-- Purpose: Store question bank and assign specific questions to practice sessions
-- Date: 2025-10-10

-- ============================================================================
-- QUESTIONS TABLE
-- ============================================================================
-- Stores the question bank (2,017 questions from JSON)

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity & Source (for traceability to original JSON)
    external_id VARCHAR(255) UNIQUE,  -- questionId from JSON
    source_uid UUID,                  -- uId from JSON

    -- Relationship to topics
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE RESTRICT,

    -- Question Metadata
    difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('E', 'M', 'H')),
    difficulty_score INTEGER CHECK (difficulty_score BETWEEN 1 AND 8),
    module VARCHAR(20) NOT NULL CHECK (module IN ('math', 'english')),

    -- Question Content
    question_type VARCHAR(10) NOT NULL CHECK (question_type IN ('mc', 'spr')),
    stem TEXT NOT NULL,  -- Question text (includes MathML)

    -- Answer Data (JSONB for flexibility)
    answer_options JSONB,           -- For multiple choice: {"a": "...", "b": "...", etc}
    correct_answer JSONB NOT NULL,  -- Array of correct answers
    acceptable_answers JSONB,       -- Alternative acceptable formats (for SPR)
    rationale TEXT,                 -- Explanation/solution

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_questions_topic_id ON questions(topic_id);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_module ON questions(module);
CREATE INDEX idx_questions_active ON questions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_questions_topic_difficulty ON questions(topic_id, difficulty);

-- Comment
COMMENT ON TABLE questions IS 'Question bank storage - contains all SAT practice questions';


-- ============================================================================
-- SESSION_QUESTIONS TABLE
-- ============================================================================
-- Links specific questions to practice sessions (replaces session_topics eventually)

CREATE TABLE session_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationships
    session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,

    -- Denormalized for performance (avoids join to questions table)
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE RESTRICT,

    -- Ordering
    display_order INTEGER NOT NULL,

    -- Status tracking (for future practice session feature)
    status VARCHAR(20) DEFAULT 'not_started'
        CHECK (status IN ('not_started', 'in_progress', 'answered', 'skipped', 'flagged')),

    -- Timing (for future analytics)
    started_at TIMESTAMPTZ,
    answered_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(session_id, question_id),  -- No duplicate questions in a session
    UNIQUE(session_id, display_order)  -- Order must be unique per session
);

-- Indexes for performance
CREATE INDEX idx_session_questions_session_id ON session_questions(session_id);
CREATE INDEX idx_session_questions_question_id ON session_questions(question_id);
CREATE INDEX idx_session_questions_topic_id ON session_questions(topic_id);
CREATE INDEX idx_session_questions_status ON session_questions(session_id, status);
CREATE INDEX idx_session_questions_order ON session_questions(session_id, display_order);

-- Comment
COMMENT ON TABLE session_questions IS 'Links specific questions to practice sessions with ordering and status tracking';


-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_questions ENABLE ROW LEVEL SECURITY;

-- Questions: Viewable by all authenticated users
CREATE POLICY "Questions viewable by authenticated users"
ON questions
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = TRUE);

-- Session Questions: Users can only see questions from their own sessions
CREATE POLICY "Users can view own session questions"
ON session_questions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM practice_sessions ps
        JOIN study_plans sp ON sp.id = ps.study_plan_id
        WHERE ps.id = session_questions.session_id
        AND sp.user_id = auth.uid()
    )
);

-- Session Questions: System can insert (we'll use service role for this)
-- No INSERT policy for regular users - only backend should create these


-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_questions_updated_at
BEFORE UPDATE ON questions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- HELPER FUNCTION (Optional)
-- ============================================================================

-- Function to get topic distribution for a session
-- This replaces the need for session_topics table
CREATE OR REPLACE FUNCTION get_session_topic_distribution(p_session_id UUID)
RETURNS TABLE (
    topic_id UUID,
    topic_name VARCHAR,
    num_questions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sq.topic_id,
        t.name,
        COUNT(*) as num_questions
    FROM session_questions sq
    JOIN topics t ON t.id = sq.topic_id
    WHERE sq.session_id = p_session_id
    GROUP BY sq.topic_id, t.name
    ORDER BY t.name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_session_topic_distribution IS 'Get topic breakdown for a practice session (replaces session_topics queries)';
