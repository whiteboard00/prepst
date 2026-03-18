-- Migration: Seed ACT questions across all categories
-- Provides enough questions for diagnostics (30), drills, and mock exams

DO $$
DECLARE
  topic_rec RECORD;
  q_count INT;
BEGIN
  -- Loop through all ACT topics (topics belonging to ACT course categories)
  FOR topic_rec IN
    SELECT t.id AS topic_id, t.name AS topic_name, c.section, c.name AS category_name
    FROM topics t
    JOIN categories c ON t.category_id = c.id
    JOIN courses co ON c.course_id = co.id
    WHERE co.slug = 'act'
    ORDER BY c.section, c.name, t.name
  LOOP
    -- Seed 3 Easy, 3 Medium, 3 Hard questions per topic
    -- This gives us 9 questions per topic × ~40 topics = ~360 questions total

    -- Easy questions
    FOR q_count IN 1..3 LOOP
      INSERT INTO questions (stem, difficulty, question_type, answer_options, correct_answer, topic_id, is_active)
      VALUES (
        format('ACT %s: %s practice question %s (Easy)', topic_rec.section, topic_rec.topic_name, q_count),
        'E',
        'mc',
        '["Option A", "Option B", "Option C", "Option D"]'::jsonb,
        '["Option A"]'::jsonb,
        topic_rec.topic_id,
        true
      )
      ON CONFLICT DO NOTHING;
    END LOOP;

    -- Medium questions
    FOR q_count IN 1..3 LOOP
      INSERT INTO questions (stem, difficulty, question_type, answer_options, correct_answer, topic_id, is_active)
      VALUES (
        format('ACT %s: %s practice question %s (Medium)', topic_rec.section, topic_rec.topic_name, q_count),
        'M',
        'mc',
        '["Option A", "Option B", "Option C", "Option D"]'::jsonb,
        '["Option B"]'::jsonb,
        topic_rec.topic_id,
        true
      )
      ON CONFLICT DO NOTHING;
    END LOOP;

    -- Hard questions
    FOR q_count IN 1..3 LOOP
      INSERT INTO questions (stem, difficulty, question_type, answer_options, correct_answer, topic_id, is_active)
      VALUES (
        format('ACT %s: %s practice question %s (Hard)', topic_rec.section, topic_rec.topic_name, q_count),
        'H',
        'mc',
        '["Option A", "Option B", "Option C", "Option D"]'::jsonb,
        '["Option C"]'::jsonb,
        topic_rec.topic_id,
        true
      )
      ON CONFLICT DO NOTHING;
    END LOOP;

  END LOOP;

  RAISE NOTICE 'ACT questions seeded for all topics';
END $$;
