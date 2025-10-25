import { components } from "./api.generated";

// Re-export generated types from OpenAPI
export type Question = components["schemas"]["Question"];
export type Topic = components["schemas"]["Topic"];
export type SessionQuestion = components["schemas"]["SessionQuestion"];
export type StudyPlan = components["schemas"]["StudyPlan"];
export type PracticeSession = components["schemas"]["PracticeSession"];
export type StudyPlanResponse = components["schemas"]["StudyPlanResponse"];
export type SessionQuestionsResponse =
  components["schemas"]["SessionQuestionsResponse"];
export type SubmitAnswerResponse =
  components["schemas"]["SubmitAnswerResponse"];
export type CategoriesAndTopicsResponse =
  components["schemas"]["CategoriesAndTopicsResponse"];

// Alias for compatibility
export type QuestionWithDetails = SessionQuestion;

// Mock exam types
export type SubmitModuleAnswerRequest = components["schemas"]["SubmitModuleAnswerRequest"];
export type BatchSubmitResponse = components["schemas"]["BatchSubmitResponse"];
export type MockQuestionStatus = components["schemas"]["MockQuestionStatus"];

// Re-export SessionTopic from backend (includes section field)
export type SessionTopic = components["schemas"]["SessionTopic"];

// Custom UI type extending SessionTopic with optional questions
export interface SessionTopicWithQuestions extends SessionTopic {
  questions?: Question[];
}

export interface SessionWithTopics extends PracticeSession {
  topics: SessionTopic[];
}

export interface StudyPlanWithSessions {
  study_plan: StudyPlan;
  sessions: SessionWithTopics[];
  total_sessions: number;
  total_days: number;
}

// Summary/Results types
export interface QuestionResult {
  question_id: string;
  topic_name: string;
  is_correct: boolean;
  user_answer: string[] | null;
  correct_answer: string[];
}

export interface TopicPerformance {
  topic_name: string;
  total: number;
  correct: number;
  percentage: number;
}

export interface TopicMasteryImprovement {
  topic_id: string;
  topic_name: string;
  mastery_before: number; // 0-1
  mastery_after: number; // 0-1
  mastery_increase: number; // absolute percentage points
  current_percentage: number; // 0-100
  total_attempts: number;
  correct_attempts: number;
}

// Answer state for practice session
export interface AnswerState {
  userAnswer: string[];
  isCorrect?: boolean;
  status: string;
  confidenceScore?: number;
  timeSpentSeconds?: number;
}

// BKT Mastery Update
export interface MasteryUpdate {
  skill_id: string;
  mastery_before: number;
  mastery_after: number;
  velocity: number;
  total_attempts: number;
  correct_attempts: number;
}

// AI Feedback types (manually defined until backend types are regenerated)
export interface AIFeedbackContent {
  explanation: string;
  hints: string[];
  learning_points: string[];
  key_concepts: string[];
}

export interface AIFeedbackRequest {
  question_ids?: string[];
}

export interface AIFeedbackResponse {
  session_question_id: string;
  question_id: string;
  feedback: AIFeedbackContent;
  is_cached: boolean;
}

// Analytics types
export interface GrowthCurveDataPoint {
  date: string;
  snapshot_type: string;
  predicted_sat_math?: number;
  predicted_sat_rw?: number;
  mastery?: number;
  cognitive_efficiency?: number;
}

export interface SkillMasteryData {
  skill_id: string;
  skill_name: string;
  mastery: number;
  velocity: number;
  plateau: boolean;
  total_attempts: number;
  correct_attempts: number;
}

export interface CategoryHeatmap {
  category_id: string;
  section: string;
  skills: SkillMasteryData[];
}

export interface PerformanceSnapshot {
  id: string;
  user_id: string;
  snapshot_type: string;
  created_at: string;
  predicted_sat_math?: number;
  predicted_sat_rw?: number;
  skills_snapshot?: Record<string, number>;
  avg_time_per_question?: number;
  avg_confidence_score?: number;
  cognitive_efficiency_score?: number;
}

// Admin Analytics types
export interface MasteryTrackingStats {
  total_records: number;
  avg_mastery: number;
  sample_records: Array<{
    user_id: string;
    skill_id: string;
    email: string;
    skill_name: string;
    mastery_probability: number;
    total_attempts: number;
    correct_attempts: number;
    learning_velocity: number | null;
    plateau_flag: boolean;
    last_practiced_at: string | null;
    prior_knowledge: number;
    learn_rate: number;
    guess_probability: number;
    slip_probability: number;
  }>;
  is_admin: boolean;
}

export interface ConfidenceTimingStats {
  total_answered: number;
  avg_confidence: number;
  avg_time_seconds: number;
  min_confidence: number;
  max_confidence: number;
  confidence_distribution: Record<number, number>;
  is_admin: boolean;
}

export interface LearningEventsStats {
  total_events: number;
  event_breakdown: Record<string, number>;
  is_admin: boolean;
}

export interface SnapshotsOverview {
  total_snapshots: number;
  recent_snapshots: Array<{
    snapshot_type: string;
    predicted_sat_math: number | null;
    predicted_sat_rw: number | null;
    created_at: string;
    user_id: string;
    email: string;
    questions_answered: number;
    questions_correct: number;
  }>;
  is_admin: boolean;
}

export interface UserProgressSummary {
  total_users: number;
  user_progress: Array<{
    user_id: string;
    email: string;
    skills_tracked: number;
    avg_mastery: number;
    total_attempts: number;
    total_correct: number;
    accuracy: number;
  }>;
  is_admin: boolean;
}

export interface DifficultyStats {
  total_calibrated: number;
  avg_difficulty: number;
  avg_discrimination: number;
  sample_questions: Array<{
    question_id: string;
    difficulty_param: number;
    discrimination_param: number;
    total_responses: number;
    correct_responses: number;
    is_calibrated: boolean;
  }>;
  is_admin: boolean;
}

export interface MockExamAnalytics {
  total_exams: number;
  completion_rate: number;
  avg_total_score: number;
  avg_math_score: number;
  avg_rw_score: number;
  score_distribution: Record<string, number>;
  weak_topics: Array<{
    topic_name: string;
    accuracy: number;
    attempts: number;
  }>;
  stamina_pattern: {
    module1_avg: number;
    module2_avg: number;
    drop_percentage: number;
  };
  improvement_velocity: number;
  readiness_score: number;
  recent_exams: Array<{
    email: string;
    exam_type: string;
    total_score: number;
    completed_at: string;
  }>;
  is_admin: boolean;
}

export interface ErrorPatternAnalytics {
  total_errors: number;
  recurring_errors: number;
  error_by_topic: Array<{
    skill_name: string;
    error_count: number;
    total_attempts: number;
    error_rate: number;
    last_error: string | null;
  }>;
  cognitive_blocks: Array<{
    email: string;
    skill_name: string;
    failed_attempts: number;
    mastery_stuck_at: number;
    days_stuck: number;
  }>;
  plateau_users: Array<{
    email: string;
    plateau_skills: number;
    avg_velocity: number;
    needs_intervention: boolean;
  }>;
  is_admin: boolean;
}

export interface CognitiveEfficiencyAnalytics {
  overall_efficiency: number;
  speed_accuracy_correlation: number;
  time_of_day_patterns: Array<{
    hour: number;
    avg_accuracy: number;
    avg_time: number;
    efficiency_score: number;
  }>;
  user_efficiency: Array<{
    email: string;
    avg_time: number;
    accuracy: number;
    efficiency_score: number;
    optimal_time_of_day: number;
  }>;
  confidence_accuracy_map: Array<{
    confidence_level: number;
    actual_accuracy: number;
    calibration_gap: number;
  }>;
  is_admin: boolean;
}

export interface LearningVelocityAnalytics {
  overall_velocity: number;
  momentum_score: number;
  velocity_by_skill: Array<{
    skill_name: string;
    velocity: number;
    category: string;
    total_attempts: number;
    mastery: number;
  }>;
  velocity_trend: Array<{
    week: string;
    velocity: number;
    total_score: number;
  }>;
  acceleration: number;
  is_improving: boolean;
  velocity_percentile: number;
}

export interface PredictiveScoresAnalytics {
  current_math: number;
  current_rw: number;
  current_total: number;
  predicted_math_in_30_days: number;
  predicted_rw_in_30_days: number;
  predicted_total_in_30_days: number;
  days_to_goal_math: number | null;
  days_to_goal_rw: number | null;
  days_to_goal_total: number | null;
  velocity_needed: string;
  confidence_intervals: {
    math: {
      optimistic: number;
      realistic: number;
      pessimistic: number;
    };
    rw: {
      optimistic: number;
      realistic: number;
      pessimistic: number;
    };
    total: {
      optimistic: number;
      realistic: number;
      pessimistic: number;
    };
  };
  prediction_timeline: Array<{
    week: number;
    math_score: number;
    rw_score: number;
    total_score: number;
    date: string;
  }>;
  goal_status: string;
  on_track: boolean;
  recommendations: string[];
}

// Chat types (frontend UI)
export interface ChatMessage {
  id: number;
  content: string;
  sender: "user" | "ai";
  timestamp?: string;
}

// Chat types (backend API)
export interface ChatMessageAPI {
  role: string;
  content: string;
  timestamp?: string;
}

export interface ChatRequest {
  message: string;
  conversation_history?: ChatMessageAPI[];
}

export interface ChatResponse {
  success: boolean;
  response: string;
  timestamp: string;
}
