-- Migration: Seed ACT course with full configuration, categories, and topics
-- Based on the 2025 Enhanced ACT format

-- Insert ACT course
INSERT INTO courses (slug, name, description, icon, config, is_active)
VALUES (
  'act',
  'ACT',
  'Prepare for the ACT with adaptive practice across English, Math, and Reading. Includes optional Science section support.',
  'graduation-cap',
  '{
    "sections": [
      {"key": "english", "name": "English", "score_min": 1, "score_max": 36},
      {"key": "math", "name": "Math", "score_min": 1, "score_max": 36},
      {"key": "reading", "name": "Reading", "score_min": 1, "score_max": 36}
    ],
    "total_score_min": 1,
    "total_score_max": 36,
    "score_increment": 1,
    "questions_per_module": 45,
    "diagnostic": {
      "total_questions": 30,
      "section_distribution": {"english": 10, "math": 10, "reading": 10},
      "difficulty_distribution": {"E": 0.33, "M": 0.34, "H": 0.33}
    },
    "mock_exam": {
      "modules": [
        {"key": "english_module", "section": "english", "number": 1, "time_limit_minutes": 35},
        {"key": "math_module", "section": "math", "number": 1, "time_limit_minutes": 50},
        {"key": "reading_module", "section": "reading", "number": 1, "time_limit_minutes": 40}
      ]
    },
    "adaptive_thresholds": {
      "hard_threshold": 0.7,
      "medium_threshold": 0.4
    },
    "difficulty_distributions": {
      "easy": {"E": 0.50, "M": 0.35, "H": 0.15},
      "medium": {"E": 0.30, "M": 0.40, "H": 0.30},
      "hard": {"E": 0.15, "M": 0.35, "H": 0.50}
    },
    "score_conversion": {
      "method": "average",
      "description": "ACT composite is the average of section scores (1-36)"
    }
  }'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  config = EXCLUDED.config,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Get the ACT course ID for FK references
DO $$
DECLARE
  act_course_id UUID;
  -- English category IDs
  cat_grammar_id UUID;
  cat_rhetoric_id UUID;
  cat_punctuation_id UUID;
  cat_sentence_structure_id UUID;
  -- Math category IDs
  cat_algebra_id UUID;
  cat_geometry_id UUID;
  cat_statistics_id UUID;
  cat_number_id UUID;
  cat_functions_id UUID;
  -- Reading category IDs
  cat_key_ideas_id UUID;
  cat_craft_structure_id UUID;
  cat_integration_id UUID;
BEGIN
  SELECT id INTO act_course_id FROM courses WHERE slug = 'act';

  -- =====================================================
  -- ENGLISH CATEGORIES & TOPICS
  -- =====================================================

  -- Category: Grammar & Usage (30%)
  INSERT INTO categories (name, section, weight_in_section, course_id)
  VALUES ('Grammar & Usage', 'english', 30.0, act_course_id)
  RETURNING id INTO cat_grammar_id;

  INSERT INTO topics (name, category_id, weight_in_category) VALUES
    ('Subject-Verb Agreement', cat_grammar_id, 20.0),
    ('Pronoun Agreement & Case', cat_grammar_id, 15.0),
    ('Verb Tense & Form', cat_grammar_id, 20.0),
    ('Modifier Placement', cat_grammar_id, 15.0),
    ('Idioms & Word Choice', cat_grammar_id, 15.0),
    ('Parallelism', cat_grammar_id, 15.0);

  -- Category: Punctuation (25%)
  INSERT INTO categories (name, section, weight_in_section, course_id)
  VALUES ('Punctuation', 'english', 25.0, act_course_id)
  RETURNING id INTO cat_punctuation_id;

  INSERT INTO topics (name, category_id, weight_in_category) VALUES
    ('Commas', cat_punctuation_id, 30.0),
    ('Apostrophes', cat_punctuation_id, 20.0),
    ('Colons & Semicolons', cat_punctuation_id, 25.0),
    ('Dashes & Parentheses', cat_punctuation_id, 25.0);

  -- Category: Sentence Structure (20%)
  INSERT INTO categories (name, section, weight_in_section, course_id)
  VALUES ('Sentence Structure', 'english', 20.0, act_course_id)
  RETURNING id INTO cat_sentence_structure_id;

  INSERT INTO topics (name, category_id, weight_in_category) VALUES
    ('Run-ons & Fragments', cat_sentence_structure_id, 35.0),
    ('Subordination & Coordination', cat_sentence_structure_id, 35.0),
    ('Sentence Combining', cat_sentence_structure_id, 30.0);

  -- Category: Rhetorical Skills (25%)
  INSERT INTO categories (name, section, weight_in_section, course_id)
  VALUES ('Rhetorical Skills', 'english', 25.0, act_course_id)
  RETURNING id INTO cat_rhetoric_id;

  INSERT INTO topics (name, category_id, weight_in_category) VALUES
    ('Organization & Transitions', cat_rhetoric_id, 30.0),
    ('Style & Tone', cat_rhetoric_id, 25.0),
    ('Conciseness & Redundancy', cat_rhetoric_id, 25.0),
    ('Purpose & Strategy', cat_rhetoric_id, 20.0);

  -- =====================================================
  -- MATH CATEGORIES & TOPICS
  -- =====================================================

  -- Category: Algebra (35%)
  INSERT INTO categories (name, section, weight_in_section, course_id)
  VALUES ('Algebra', 'math', 35.0, act_course_id)
  RETURNING id INTO cat_algebra_id;

  INSERT INTO topics (name, category_id, weight_in_category) VALUES
    ('Linear Equations & Inequalities', cat_algebra_id, 25.0),
    ('Systems of Equations', cat_algebra_id, 20.0),
    ('Quadratic Equations', cat_algebra_id, 20.0),
    ('Polynomials & Factoring', cat_algebra_id, 15.0),
    ('Absolute Value', cat_algebra_id, 10.0),
    ('Exponents & Radicals', cat_algebra_id, 10.0);

  -- Category: Geometry (25%)
  INSERT INTO categories (name, section, weight_in_section, course_id)
  VALUES ('Geometry', 'math', 25.0, act_course_id)
  RETURNING id INTO cat_geometry_id;

  INSERT INTO topics (name, category_id, weight_in_category) VALUES
    ('Triangles & Pythagorean Theorem', cat_geometry_id, 25.0),
    ('Circles', cat_geometry_id, 20.0),
    ('Coordinate Geometry', cat_geometry_id, 20.0),
    ('Area & Perimeter', cat_geometry_id, 15.0),
    ('Volume & 3D Shapes', cat_geometry_id, 10.0),
    ('Trigonometry', cat_geometry_id, 10.0);

  -- Category: Statistics & Probability (20%)
  INSERT INTO categories (name, section, weight_in_section, course_id)
  VALUES ('Statistics & Probability', 'math', 20.0, act_course_id)
  RETURNING id INTO cat_statistics_id;

  INSERT INTO topics (name, category_id, weight_in_category) VALUES
    ('Mean, Median, Mode', cat_statistics_id, 25.0),
    ('Probability', cat_statistics_id, 25.0),
    ('Data Interpretation', cat_statistics_id, 25.0),
    ('Counting & Combinations', cat_statistics_id, 25.0);

  -- Category: Number & Quantity (10%)
  INSERT INTO categories (name, section, weight_in_section, course_id)
  VALUES ('Number & Quantity', 'math', 10.0, act_course_id)
  RETURNING id INTO cat_number_id;

  INSERT INTO topics (name, category_id, weight_in_category) VALUES
    ('Ratios & Proportions', cat_number_id, 35.0),
    ('Percentages', cat_number_id, 35.0),
    ('Number Properties', cat_number_id, 30.0);

  -- Category: Functions (10%)
  INSERT INTO categories (name, section, weight_in_section, course_id)
  VALUES ('Functions', 'math', 10.0, act_course_id)
  RETURNING id INTO cat_functions_id;

  INSERT INTO topics (name, category_id, weight_in_category) VALUES
    ('Function Notation & Evaluation', cat_functions_id, 35.0),
    ('Graphs of Functions', cat_functions_id, 35.0),
    ('Transformations', cat_functions_id, 30.0);

  -- =====================================================
  -- READING CATEGORIES & TOPICS
  -- =====================================================

  -- Category: Key Ideas & Details (55%)
  INSERT INTO categories (name, section, weight_in_section, course_id)
  VALUES ('Key Ideas & Details', 'reading', 55.0, act_course_id)
  RETURNING id INTO cat_key_ideas_id;

  INSERT INTO topics (name, category_id, weight_in_category) VALUES
    ('Main Idea & Central Theme', cat_key_ideas_id, 25.0),
    ('Supporting Details', cat_key_ideas_id, 20.0),
    ('Summarization', cat_key_ideas_id, 15.0),
    ('Sequence & Cause-Effect', cat_key_ideas_id, 20.0),
    ('Inferences & Conclusions', cat_key_ideas_id, 20.0);

  -- Category: Craft & Structure (28%)
  INSERT INTO categories (name, section, weight_in_section, course_id)
  VALUES ('Craft & Structure', 'reading', 28.0, act_course_id)
  RETURNING id INTO cat_craft_structure_id;

  INSERT INTO topics (name, category_id, weight_in_category) VALUES
    ('Vocabulary in Context', cat_craft_structure_id, 30.0),
    ('Author''s Purpose & Perspective', cat_craft_structure_id, 30.0),
    ('Text Structure & Organization', cat_craft_structure_id, 20.0),
    ('Tone & Style', cat_craft_structure_id, 20.0);

  -- Category: Integration of Knowledge (17%)
  INSERT INTO categories (name, section, weight_in_section, course_id)
  VALUES ('Integration of Knowledge', 'reading', 17.0, act_course_id)
  RETURNING id INTO cat_integration_id;

  INSERT INTO topics (name, category_id, weight_in_category) VALUES
    ('Comparing Texts & Arguments', cat_integration_id, 35.0),
    ('Evaluating Evidence & Claims', cat_integration_id, 35.0),
    ('Synthesizing Information', cat_integration_id, 30.0);

  RAISE NOTICE 'ACT course seeded with % categories and topics', 12;
END $$;
