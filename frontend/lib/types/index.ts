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

// Custom UI types (not from backend)
export interface SessionTopic {
  topic_id: string;
  topic_name: string;
  num_questions: number;
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
  sessions_per_day: number;
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

// Answer state for practice session
export interface AnswerState {
  userAnswer: string[];
  isCorrect?: boolean;
  status: string;
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
