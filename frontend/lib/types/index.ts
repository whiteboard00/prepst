import { Database } from './database';

export type Json = Database['public']['Tables']['questions']['Row']['correct_answer'];

// Base table types from database
export type Question = Database['public']['Tables']['questions']['Row'];
export type Topic = Database['public']['Tables']['topics']['Row'];
export type PracticeSession = Database['public']['Tables']['practice_sessions']['Row'];
export type SessionQuestion = Database['public']['Tables']['session_questions']['Row'];
export type StudyPlan = Database['public']['Tables']['study_plans']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];

// Composed types for API responses and UI
export interface SessionTopic {
  topic_id: string;
  topic_name: string;
  num_questions: number;
  questions?: Question[];
}

export interface SessionWithTopics extends PracticeSession {
  topics: SessionTopic[];
}

export interface QuestionWithDetails {
  session_question_id: string;
  question: Question;
  topic: Topic;
  status: string;
  display_order: number;
  user_answer?: string[] | null;
}

export interface StudyPlanWithSessions extends StudyPlan {
  sessions: SessionWithTopics[];
}

// Summary/Results types
export interface QuestionResult {
  question_id: string;
  topic_name: string;
  is_correct: boolean;
  user_answer: string[] | null;
  correct_answer: Json;
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
