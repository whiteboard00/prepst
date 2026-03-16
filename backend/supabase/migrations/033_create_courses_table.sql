-- ============================================================================
-- Migration 033: Create courses abstraction layer
--
-- Introduces multi-course support. SAT becomes the first course.
-- All existing data continues to work — this is purely additive.
-- ============================================================================

-- Courses table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-course enrollment
CREATE TABLE user_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- Indexes
CREATE INDEX idx_courses_slug ON courses(slug);
CREATE INDEX idx_courses_active ON courses(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_courses_user_id ON user_courses(user_id);
CREATE INDEX idx_user_courses_course_id ON user_courses(course_id);

-- Add course_id to categories (nullable for backward compatibility)
ALTER TABLE categories ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
CREATE INDEX idx_categories_course_id ON categories(course_id);

-- Add course_id to study_plans (nullable for backward compatibility)
ALTER TABLE study_plans ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE SET NULL;
CREATE INDEX idx_study_plans_course_id ON study_plans(course_id);

-- Triggers
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_courses ENABLE ROW LEVEL SECURITY;

-- Courses are public read
CREATE POLICY "Courses are viewable by everyone" ON courses
    FOR SELECT USING (true);

-- Users can view their own enrollments
CREATE POLICY "Users can view own enrollments" ON user_courses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll themselves" ON user_courses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollments" ON user_courses
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- Seed SAT as the first course
-- ============================================================================
INSERT INTO courses (slug, name, description, icon, config) VALUES (
    'sat',
    'SAT',
    'The SAT is a standardized test widely used for college admissions in the United States.',
    '📝',
    '{
        "sections": [
            {"key": "math", "name": "Math", "score_min": 200, "score_max": 800},
            {"key": "reading_writing", "name": "Reading & Writing", "score_min": 200, "score_max": 800}
        ],
        "total_score_min": 400,
        "total_score_max": 1600,
        "score_increment": 10,
        "diagnostic": {
            "total_questions": 40,
            "section_distribution": {
                "math": 20,
                "reading_writing": 20
            },
            "difficulty_distribution": {"E": 0.33, "M": 0.34, "H": 0.33}
        },
        "mock_exam": {
            "modules": [
                {"key": "rw_module_1", "section": "reading_writing", "number": 1, "time_limit_minutes": 32},
                {"key": "rw_module_2", "section": "reading_writing", "number": 2, "time_limit_minutes": 32},
                {"key": "math_module_1", "section": "math", "number": 1, "time_limit_minutes": 32},
                {"key": "math_module_2", "section": "math", "number": 2, "time_limit_minutes": 32}
            ]
        }
    }'
);

-- Link existing categories to the SAT course
UPDATE categories SET course_id = (SELECT id FROM courses WHERE slug = 'sat');

-- Link existing study plans to the SAT course
UPDATE study_plans SET course_id = (SELECT id FROM courses WHERE slug = 'sat');
