-- Migration: Create learning analytics tables for BKT and IRT
-- Purpose: Track student mastery, learning velocity, and performance over time
-- Date: 2025-10-16

-- ============================================================================
-- TABLE 1: USER SKILL MASTERY (BKT Foundation)
-- ============================================================================
-- Tracks Bayesian Knowledge Tracing parameters for each user-skill pair

CREATE TABLE user_skill_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    
    -- BKT Parameters
    mastery_probability DECIMAL(5,4) DEFAULT 0.2500 CHECK (mastery_probability >= 0 AND mastery_probability <= 1),
    prior_knowledge DECIMAL(5,4) DEFAULT 0.2500 CHECK (prior_knowledge >= 0 AND prior_knowledge <= 1),
    learn_rate DECIMAL(5,4) DEFAULT 0.1000 CHECK (learn_rate >= 0 AND learn_rate <= 1),
    guess_probability DECIMAL(5,4) DEFAULT 0.2500 CHECK (guess_probability >= 0 AND guess_probability <= 1),
    slip_probability DECIMAL(5,4) DEFAULT 0.1000 CHECK (slip_probability >= 0 AND slip_probability <= 1),
    
    -- Tracking
    total_attempts INTEGER DEFAULT 0 CHECK (total_attempts >= 0),
    correct_attempts INTEGER DEFAULT 0 CHECK (correct_attempts >= 0),
    last_practiced_at TIMESTAMPTZ,
    
    -- Learning Velocity (rate of mastery improvement)
    learning_velocity DECIMAL(6,4),
    plateau_flag BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, skill_id),
    CHECK (correct_attempts <= total_attempts)
);

-- Indexes for performance
CREATE INDEX idx_user_skill_mastery_user ON user_skill_mastery(user_id);
CREATE INDEX idx_user_skill_mastery_skill ON user_skill_mastery(skill_id);
CREATE INDEX idx_user_skill_mastery_plateau ON user_skill_mastery(user_id, plateau_flag) WHERE plateau_flag = TRUE;
CREATE INDEX idx_user_skill_mastery_updated ON user_skill_mastery(updated_at DESC);

COMMENT ON TABLE user_skill_mastery IS 'BKT mastery tracking - probability student has mastered each skill';


-- ============================================================================
-- TABLE 2: QUESTION DIFFICULTY PARAMETERS (IRT Foundation)
-- ============================================================================
-- Stores Item Response Theory parameters for adaptive question selection

CREATE TABLE question_difficulty_params (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    
    -- IRT Parameters (2-Parameter Logistic Model)
    difficulty_param DECIMAL(5,3) DEFAULT 0.000 CHECK (difficulty_param >= -3 AND difficulty_param <= 3),
    discrimination_param DECIMAL(5,3) DEFAULT 1.000 CHECK (discrimination_param >= 0.1 AND discrimination_param <= 3),
    
    -- Calibration Metadata
    total_responses INTEGER DEFAULT 0,
    correct_responses INTEGER DEFAULT 0,
    is_calibrated BOOLEAN DEFAULT FALSE,
    
    -- Quality Metrics
    point_biserial DECIMAL(4,3),  -- Item discrimination index
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(question_id),
    CHECK (correct_responses <= total_responses)
);

-- Indexes
CREATE INDEX idx_question_difficulty_calibrated ON question_difficulty_params(is_calibrated) WHERE is_calibrated = TRUE;
CREATE INDEX idx_question_difficulty_param ON question_difficulty_params(difficulty_param);

COMMENT ON TABLE question_difficulty_params IS 'IRT parameters for adaptive question selection';


-- ============================================================================
-- TABLE 3: USER PERFORMANCE SNAPSHOTS (Growth Tracking)
-- ============================================================================
-- Historical snapshots of user performance for tracking improvement over time

CREATE TABLE user_performance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Snapshot Type & Context
    snapshot_type VARCHAR(50) NOT NULL CHECK (snapshot_type IN ('session_complete', 'mock_exam', 'weekly', 'monthly')),
    related_id UUID,  -- session_id or exam_id if applicable
    
    -- Estimated Ability Scores (IRT theta)
    estimated_ability_math DECIMAL(5,3),
    estimated_ability_rw DECIMAL(5,3),
    predicted_sat_math INTEGER CHECK (predicted_sat_math >= 200 AND predicted_sat_math <= 800),
    predicted_sat_rw INTEGER CHECK (predicted_sat_rw >= 200 AND predicted_sat_rw <= 800),
    
    -- Skill Mastery Snapshot (JSONB for flexibility)
    skills_snapshot JSONB,  -- {skill_id: mastery_probability, ...}
    
    -- Cognitive Metrics
    avg_time_per_question DECIMAL(6,2),
    avg_confidence_score DECIMAL(3,2),
    cognitive_efficiency_score DECIMAL(4,3),  -- Correctness / time metric
    
    -- Additional Stats
    questions_answered INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_performance_snapshots_user_time ON user_performance_snapshots(user_id, created_at DESC);
CREATE INDEX idx_performance_snapshots_type ON user_performance_snapshots(snapshot_type);
CREATE INDEX idx_performance_snapshots_related ON user_performance_snapshots(related_id) WHERE related_id IS NOT NULL;

COMMENT ON TABLE user_performance_snapshots IS 'Historical performance data for growth curve visualization';


-- ============================================================================
-- TABLE 4: LEARNING EVENTS (Granular Event Log)
-- ============================================================================
-- Detailed log of learning events for analysis and intervention triggers

CREATE TABLE learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_question_id UUID REFERENCES session_questions(id) ON DELETE SET NULL,
    skill_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    
    -- Event Type
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'mastery_updated', 
        'mastery_achieved', 
        'plateau_detected', 
        'intervention_triggered',
        'skill_practiced'
    )),
    
    -- Event Data (flexible JSON storage)
    event_data JSONB,
    
    -- Context (mastery before/after for tracking)
    mastery_before DECIMAL(5,4),
    mastery_after DECIMAL(5,4),
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_learning_events_user_time ON learning_events(user_id, created_at DESC);
CREATE INDEX idx_learning_events_type ON learning_events(event_type, created_at);
CREATE INDEX idx_learning_events_skill ON learning_events(skill_id, created_at DESC);

COMMENT ON TABLE learning_events IS 'Granular event log for learning analytics and intervention triggers';


-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_skill_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_difficulty_params ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;

-- user_skill_mastery: Users can view their own mastery data
CREATE POLICY "Users can view own skill mastery"
ON user_skill_mastery
FOR SELECT
USING (auth.uid() = user_id);

-- user_skill_mastery: System can insert/update (service role)
CREATE POLICY "System can manage skill mastery"
ON user_skill_mastery
FOR ALL
USING (true);

-- question_difficulty_params: All authenticated users can view
CREATE POLICY "Authenticated users can view question difficulty"
ON question_difficulty_params
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- question_difficulty_params: System can manage
CREATE POLICY "System can manage question difficulty"
ON question_difficulty_params
FOR ALL
USING (true);

-- user_performance_snapshots: Users can view their own snapshots
CREATE POLICY "Users can view own performance snapshots"
ON user_performance_snapshots
FOR SELECT
USING (auth.uid() = user_id);

-- user_performance_snapshots: System can insert
CREATE POLICY "System can create performance snapshots"
ON user_performance_snapshots
FOR INSERT
WITH CHECK (true);

-- learning_events: Users can view their own events
CREATE POLICY "Users can view own learning events"
ON learning_events
FOR SELECT
USING (auth.uid() = user_id);

-- learning_events: System can insert
CREATE POLICY "System can create learning events"
ON learning_events
FOR INSERT
WITH CHECK (true);


-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at for user_skill_mastery
CREATE TRIGGER update_user_skill_mastery_updated_at
BEFORE UPDATE ON user_skill_mastery
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for question_difficulty_params
CREATE TRIGGER update_question_difficulty_params_updated_at
BEFORE UPDATE ON question_difficulty_params
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

