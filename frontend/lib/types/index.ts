import { components } from "./api.generated";

// Re-export generated types from OpenAPI
export type Question = components["schemas"]["Question"] & {
  is_flagged?: boolean;
};
export type Topic = components["schemas"]["Topic"];
export type SessionQuestion = Omit<components["schemas"]["SessionQuestion"], "question"> & {
  question: Question;
};
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
export type SubmitModuleAnswerRequest =
  components["schemas"]["SubmitModuleAnswerRequest"];
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
  isMarkedForReview?: boolean;
  optionId?: string;
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

// Session Summary types (holistic AI analysis)
export interface SessionSummaryContent {
  overall_assessment: string;
  strengths: string[];
  weaknesses: string[];
  speed_analysis: string;
  error_patterns: string[];
  improvement_tips: string[];
}

export interface SessionSummaryResponse {
  session_id: string;
  summary: SessionSummaryContent;
  stats: {
    total_questions: number;
    correct_count: number;
    incorrect_count: number;
    accuracy: number;
    topic_performance: Array<{
      topic_name: string;
      correct: number;
      total: number;
      accuracy: number;
    }>;
    speed_stats: {
      avg_time_seconds?: number;
      fast_count?: number;
      slow_count?: number;
      total_time_minutes?: number;
    };
  };
  generated_at: string;
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
    exam_type: string;
    total_score: number;
    math_score: number;
    rw_score: number;
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

// Wrong Answers types
export interface WrongAnswer {
  session_question_id: string;
  session_id: string;
  question_id: string;
  topic_id: string;
  user_answer: string[] | null;
  answered_at: string | null;
  confidence_score: number | null;
  time_spent_seconds: number | null;
  question: {
    id: string;
    stem: string;
    stimulus: string | null;
    difficulty: string;
    question_type: string;
    answer_options: Record<string, any> | null;
    correct_answer: string[];
    acceptable_answers: string[] | null;
    rationale: string | null;
  } | null;
  topic: {
    id: string;
    name: string;
    category: string | null;
    section: string | null;
  } | null;
  session: {
    id: string;
    created_at: string;
    study_plan_name: string | null;
  } | null;
}

export interface SavedQuestion {
  session_question_id: string;
  session_id: string;
  question_id: string;
  topic_id: string;
  is_correct: boolean | null;
  user_answer: string[] | null;
  answered_at: string | null;
  saved_at: string | null;
  confidence_score: number | null;
  time_spent_seconds: number | null;
  question: {
    id: string;
    stem: string;
    stimulus: string | null;
    difficulty: string;
    question_type: string;
    answer_options: Record<string, any> | null;
    correct_answer: string[];
    acceptable_answers: string[] | null;
    rationale: string | null;
  } | null;
  topic: {
    id: string;
    name: string;
    category: string | null;
    section: string | null;
  } | null;
  session: {
    id: string;
    created_at: string;
    study_plan_name: string | null;
  } | null;
}

// Course types
export interface SectionConfig {
  key: string;
  name: string;
  score_min: number;
  score_max: number;
}

export interface DiagnosticConfig {
  total_questions: number;
  section_distribution: Record<string, number>;
  difficulty_distribution: Record<string, number>;
}

export interface MockExamModuleConfig {
  key: string;
  section: string;
  number: number;
  time_limit_minutes: number;
}

export interface MockExamConfig {
  modules: MockExamModuleConfig[];
}

export interface CourseConfig {
  sections: SectionConfig[];
  total_score_min?: number;
  total_score_max?: number;
  score_increment?: number;
  diagnostic?: DiagnosticConfig;
  mock_exam?: MockExamConfig;
}

export interface Course {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  config: CourseConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourseListItem {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  is_active: boolean;
}

export interface CourseListResponse {
  courses: CourseListItem[];
  total_count: number;
}

export interface UserCourseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  is_active: boolean;
  enrolled_at: string;
}

export interface UserCoursesResponse {
  enrollments: UserCourseEnrollment[];
  courses: Course[];
}

// Vocabulary types
export type VocabSource = "practice_session" | "manual" | "suggested";
export type DifficultyLevel = "E" | "M" | "H";

export interface VocabularyWord {
  id: string;
  user_id: string;
  word: string;
  definition: string;
  example_usage: string | null;
  context_sentence: string | null;
  session_question_id: string | null;
  source: VocabSource;
  is_mastered: boolean;
  created_at: string;
  updated_at: string;
}

export interface PopularVocabWord {
  id: string;
  word: string;
  definition: string;
  example_usage: string | null;
  frequency_rank: number;
  difficulty_level: DifficultyLevel;
}

export interface AddVocabManualRequest {
  word: string;
  definition: string;
  example_usage?: string;
}

export interface AddVocabFromSelectionRequest {
  word: string;
  context_sentence?: string;
  session_question_id?: string;
}

export interface AddVocabFromPopularRequest {
  word: string;
  definition: string;
  example_usage?: string;
}

export interface UpdateVocabRequest {
  is_mastered?: boolean;
  definition?: string;
  example_usage?: string;
}

export interface VocabularyListResponse {
  words: VocabularyWord[];
  total: number;
}

export interface PopularVocabListResponse {
  words: PopularVocabWord[];
  total: number;
}
