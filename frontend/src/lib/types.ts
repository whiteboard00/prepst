/**
 * TypeScript types matching the backend API models
 */

// ============================================================================
// Enums
// ============================================================================

export enum DifficultyLevel {
  EASY = "E",
  MEDIUM = "M",
  HARD = "H",
}

export enum ConfidenceLevel {
  APPLE = "apple", // Confident
  LEMON = "lemon", // 75% confident
  BROCCOLI = "broccoli", // 50% confident
  ICE_CUBE = "ice_cube", // Guessed
}

export enum Module {
  MATH = "math",
  ENGLISH = "english",
}

// ============================================================================
// User & Profile Types
// ============================================================================

export interface TopicMastery {
  topic: string;
  mastery_score: number; // 0 to 1
  last_studied: string; // ISO datetime
  questions_answered: number;
  correct_answers: number;
}

export interface UserProfile {
  user_id: string;
  past_math_score: number; // 200-800
  past_english_score: number; // 200-800
  target_math_score: number; // 200-800
  target_english_score: number; // 200-800
  test_date: string; // ISO datetime
  created_at: string;
  topic_masteries: Record<string, TopicMastery>;
}

export interface UserProgress {
  user_id: string;
  past_math_score: number;
  past_english_score: number;
  current_math_score: number;
  current_english_score: number;
  target_math_score: number;
  target_english_score: number;
  test_date: string;
  days_until_test: number;
  avg_math_mastery: number;
  avg_english_mastery: number;
  total_questions_answered: number;
  total_correct_answers: number;
  overall_accuracy: number;
}

// ============================================================================
// Recommendation Types
// ============================================================================

export interface NextTopicRecommendation {
  topic: string;
  priority_score: number;
  current_mastery: number;
  target_mastery: number;
  questions_count: number;
  estimated_time_minutes: number;
  reason: string;
}

export interface TopicPriority {
  topic: string;
  priority_score: number;
  mastery_gap: number;
  base_weight: number;
  forgetting_factor: number;
  days_since_study: number;
}

// ============================================================================
// Session Types
// ============================================================================

export interface StudySession {
  session_id: string;
  user_id: string;
  topic: string;
  questions: string[]; // Question IDs
  started_at: string;
  completed_at?: string;
  performances: QuestionPerformance[];
}

export interface QuestionPerformance {
  question_id: string;
  topic: string;
  performance_score: number; // 0 to 1.1
  base_score: number;
  time_factor: number;
  confidence_modifier: number;
  timestamp: string;
}

export interface SessionStats {
  session_id: string;
  topic: string;
  total_questions: number;
  correct_answers: number;
  average_time: number;
  mastery_before: number;
  mastery_after: number;
  improvement: number;
}

// ============================================================================
// Question Types
// ============================================================================

export interface Question {
  id: string;
  skill_desc: string; // Topic name
  difficulty: DifficultyLevel;
  module: Module;
  content: {
    stem?: string;
    prompt?: string;
    answer?: {
      choices?: Record<string, { body: string }>;
      correct_choice?: string;
    };
    correct_answer?: string[];
    rationale?: string;
  };
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateUserRequest {
  user_id: string;
  past_math_score: number;
  past_english_score: number;
  target_math_score: number;
  target_english_score: number;
  test_date: string; // ISO datetime
}

export interface GetRecommendationRequest {
  user_id: string;
  module?: "math" | "english";
}

export interface CreateSessionRequest {
  user_id: string;
  topic: string;
  num_questions?: number;
}

export interface AnswerSubmission {
  question_id: string;
  topic: string;
  is_correct: boolean;
  difficulty: DifficultyLevel;
  time_taken: number; // seconds
  expected_time: number; // seconds
  confidence: ConfidenceLevel;
  user_id: string;
}

// ============================================================================
// Topics
// ============================================================================

export interface TopicWeights {
  math: Record<string, number>;
  english: Record<string, number>;
  all: Record<string, number>;
}

// ============================================================================
// Local Storage Types
// ============================================================================

export interface LocalUserData {
  user_id: string;
  created_at: string;
  last_active: string;
}
