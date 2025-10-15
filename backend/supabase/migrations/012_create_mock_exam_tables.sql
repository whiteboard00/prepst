-- Create enum for mock exam status
CREATE TYPE mock_exam_status AS ENUM ('not_started', 'in_progress', 'completed', 'abandoned');

-- Create enum for module type
CREATE TYPE module_type AS ENUM ('math_module_1', 'math_module_2', 'rw_module_1', 'rw_module_2');

-- Create enum for module status
CREATE TYPE module_status AS ENUM ('not_started', 'in_progress', 'completed');

-- Create enum for question status in mock exam
CREATE TYPE mock_question_status AS ENUM ('not_started', 'in_progress', 'answered', 'marked_for_review');

-- Mock Exams table
CREATE TABLE mock_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_type VARCHAR(50) DEFAULT 'full_length' CHECK (exam_type IN ('full_length', 'section_only')),
    status mock_exam_status DEFAULT 'not_started',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    total_score INTEGER CHECK (total_score >= 400 AND total_score <= 1600),
    math_score INTEGER CHECK (math_score >= 200 AND math_score <= 800),
    rw_score INTEGER CHECK (rw_score >= 200 AND rw_score <= 800),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mock Exam Modules table
CREATE TABLE mock_exam_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
    module_type module_type NOT NULL,
    module_number INTEGER NOT NULL CHECK (module_number IN (1, 2)),
    time_limit_minutes INTEGER NOT NULL DEFAULT 32,
    status module_status DEFAULT 'not_started',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    time_remaining_seconds INTEGER,
    raw_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exam_id, module_type)
);

-- Mock Exam Questions table (links questions to modules)
CREATE TABLE mock_exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES mock_exam_modules(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL,
    status mock_question_status DEFAULT 'not_started',
    user_answer TEXT[],
    is_correct BOOLEAN,
    is_marked_for_review BOOLEAN DEFAULT FALSE,
    answered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(module_id, question_id),
    UNIQUE(module_id, display_order)
);

-- Create indexes for faster lookups
CREATE INDEX idx_mock_exams_user_id ON mock_exams(user_id);
CREATE INDEX idx_mock_exams_status ON mock_exams(user_id, status);
CREATE INDEX idx_mock_exam_modules_exam_id ON mock_exam_modules(exam_id);
CREATE INDEX idx_mock_exam_modules_status ON mock_exam_modules(exam_id, status);
CREATE INDEX idx_mock_exam_questions_module_id ON mock_exam_questions(module_id);
CREATE INDEX idx_mock_exam_questions_display_order ON mock_exam_questions(module_id, display_order);

-- Create triggers for updated_at
CREATE TRIGGER update_mock_exams_updated_at BEFORE UPDATE ON mock_exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mock_exam_modules_updated_at BEFORE UPDATE ON mock_exam_modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mock_exam_questions_updated_at BEFORE UPDATE ON mock_exam_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mock_exams
CREATE POLICY "Users can view own mock exams" ON mock_exams
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mock exams" ON mock_exams
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mock exams" ON mock_exams
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mock exams" ON mock_exams
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for mock_exam_modules
CREATE POLICY "Users can view own mock exam modules" ON mock_exam_modules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM mock_exams
            WHERE mock_exams.id = mock_exam_modules.exam_id
            AND mock_exams.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own mock exam modules" ON mock_exam_modules
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM mock_exams
            WHERE mock_exams.id = mock_exam_modules.exam_id
            AND mock_exams.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own mock exam modules" ON mock_exam_modules
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM mock_exams
            WHERE mock_exams.id = mock_exam_modules.exam_id
            AND mock_exams.user_id = auth.uid()
        )
    );

-- RLS Policies for mock_exam_questions
CREATE POLICY "Users can view own mock exam questions" ON mock_exam_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM mock_exam_modules mem
            JOIN mock_exams me ON me.id = mem.exam_id
            WHERE mem.id = mock_exam_questions.module_id
            AND me.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own mock exam questions" ON mock_exam_questions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM mock_exam_modules mem
            JOIN mock_exams me ON me.id = mem.exam_id
            WHERE mem.id = mock_exam_questions.module_id
            AND me.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own mock exam questions" ON mock_exam_questions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM mock_exam_modules mem
            JOIN mock_exams me ON me.id = mem.exam_id
            WHERE mem.id = mock_exam_questions.module_id
            AND me.user_id = auth.uid()
        )
    );
