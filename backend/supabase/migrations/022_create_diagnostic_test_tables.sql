-- Migration: Create diagnostic test tables
-- Purpose: Track diagnostic assessments that initialize BKT mastery baselines
-- Date: 2025-10-23

-- Create enum for diagnostic test status
CREATE TYPE diagnostic_test_status AS ENUM ('not_started', 'in_progress', 'completed');

-- Create enum for diagnostic question status
CREATE TYPE diagnostic_question_status AS ENUM ('not_started', 'answered', 'marked_for_review');

-- Diagnostic Tests table
CREATE TABLE diagnostic_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status diagnostic_test_status DEFAULT 'not_started',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    total_questions INTEGER DEFAULT 40,
    total_correct INTEGER,
    math_correct INTEGER,
    rw_correct INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Diagnostic Test Questions table (links questions to diagnostic tests)
CREATE TABLE diagnostic_test_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES diagnostic_tests(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    section VARCHAR(20) NOT NULL CHECK (section IN ('math', 'reading_writing')),
    display_order INTEGER NOT NULL,
    status diagnostic_question_status DEFAULT 'not_started',
    user_answer TEXT[],
    is_correct BOOLEAN,
    is_marked_for_review BOOLEAN DEFAULT FALSE,
    answered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(test_id, question_id),
    UNIQUE(test_id, display_order)
);

-- Create indexes for faster lookups
CREATE INDEX idx_diagnostic_tests_user_id ON diagnostic_tests(user_id);
CREATE INDEX idx_diagnostic_tests_status ON diagnostic_tests(user_id, status);
CREATE INDEX idx_diagnostic_test_questions_test_id ON diagnostic_test_questions(test_id);
CREATE INDEX idx_diagnostic_test_questions_display_order ON diagnostic_test_questions(test_id, display_order);

-- Create triggers for updated_at
CREATE TRIGGER update_diagnostic_tests_updated_at BEFORE UPDATE ON diagnostic_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diagnostic_test_questions_updated_at BEFORE UPDATE ON diagnostic_test_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE diagnostic_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_test_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for diagnostic_tests
CREATE POLICY "Users can view own diagnostic tests" ON diagnostic_tests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diagnostic tests" ON diagnostic_tests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diagnostic tests" ON diagnostic_tests
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own diagnostic tests" ON diagnostic_tests
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for diagnostic_test_questions
CREATE POLICY "Users can view own diagnostic test questions" ON diagnostic_test_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM diagnostic_tests
            WHERE diagnostic_tests.id = diagnostic_test_questions.test_id
            AND diagnostic_tests.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own diagnostic test questions" ON diagnostic_test_questions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM diagnostic_tests
            WHERE diagnostic_tests.id = diagnostic_test_questions.test_id
            AND diagnostic_tests.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own diagnostic test questions" ON diagnostic_test_questions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM diagnostic_tests
            WHERE diagnostic_tests.id = diagnostic_test_questions.test_id
            AND diagnostic_tests.user_id = auth.uid()
        )
    );

-- Add comments
COMMENT ON TABLE diagnostic_tests IS 'Diagnostic assessments for establishing initial BKT mastery baselines';
COMMENT ON TABLE diagnostic_test_questions IS 'Questions assigned to diagnostic tests with user responses';
