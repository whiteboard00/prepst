/**
 * API Client for SAT Prep Backend
 */

import type {
  CreateUserRequest,
  UserProfile,
  UserProgress,
  GetRecommendationRequest,
  NextTopicRecommendation,
  TopicPriority,
  CreateSessionRequest,
  StudySession,
  AnswerSubmission,
  QuestionPerformance,
  SessionStats,
  Question,
  TopicWeights,
  TopicMastery,
} from "./types";

// Base API URL - can be configured via environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_PREFIX = "/api/v1";

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${API_PREFIX}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail ||
          `API Error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    throw error;
  }
}

// ============================================================================
// User Management API
// ============================================================================

export const userAPI = {
  /**
   * Create a new user profile
   */
  createUser: async (data: CreateUserRequest): Promise<UserProfile> => {
    return fetchAPI<UserProfile>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Get user profile
   */
  getUser: async (userId: string): Promise<UserProfile> => {
    return fetchAPI<UserProfile>(`/users/${userId}`);
  },

  /**
   * Get user progress statistics
   */
  getUserProgress: async (userId: string): Promise<UserProgress> => {
    return fetchAPI<UserProgress>(`/users/${userId}/progress`);
  },

  /**
   * Get all topic masteries for a user
   */
  getUserMasteries: async (
    userId: string
  ): Promise<Record<string, TopicMastery>> => {
    return fetchAPI<Record<string, TopicMastery>>(`/users/${userId}/masteries`);
  },

  /**
   * Get mastery for a specific topic
   */
  getTopicMastery: async (
    userId: string,
    topic: string
  ): Promise<TopicMastery> => {
    return fetchAPI<TopicMastery>(
      `/users/${userId}/masteries/${encodeURIComponent(topic)}`
    );
  },
};

// ============================================================================
// Study Planning API
// ============================================================================

export const recommendationAPI = {
  /**
   * Get next recommended topic to study
   */
  getNextTopic: async (
    data: GetRecommendationRequest
  ): Promise<NextTopicRecommendation> => {
    return fetchAPI<NextTopicRecommendation>("/recommendations/next", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Get top N topics to study by priority
   */
  getTopTopics: async (
    userId: string,
    module?: string,
    limit: number = 5
  ): Promise<TopicPriority[]> => {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (module) params.append("module", module);

    return fetchAPI<TopicPriority[]>(
      `/recommendations/${userId}/top-topics?${params.toString()}`
    );
  },
};

// ============================================================================
// Study Session API
// ============================================================================

export const sessionAPI = {
  /**
   * Create a new study session
   */
  createSession: async (data: CreateSessionRequest): Promise<StudySession> => {
    return fetchAPI<StudySession>("/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Get session details
   */
  getSession: async (sessionId: string): Promise<StudySession> => {
    return fetchAPI<StudySession>(`/sessions/${sessionId}`);
  },

  /**
   * Submit an answer for a question
   */
  submitAnswer: async (
    sessionId: string,
    answer: AnswerSubmission
  ): Promise<QuestionPerformance> => {
    return fetchAPI<QuestionPerformance>(`/sessions/${sessionId}/answers`, {
      method: "POST",
      body: JSON.stringify(answer),
    });
  },

  /**
   * Complete a study session
   */
  completeSession: async (sessionId: string): Promise<SessionStats> => {
    return fetchAPI<SessionStats>(`/sessions/${sessionId}/complete`, {
      method: "POST",
    });
  },
};

// ============================================================================
// Question Bank API
// ============================================================================

export const questionAPI = {
  /**
   * Get a specific question by ID
   */
  getQuestion: async (questionId: string): Promise<Question> => {
    return fetchAPI<Question>(`/questions/${questionId}`);
  },

  /**
   * Get questions filtered by topic
   */
  getQuestionsByTopic: async (
    topic: string,
    difficulty?: string,
    limit: number = 10
  ): Promise<Question[]> => {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (difficulty) params.append("difficulty", difficulty);

    return fetchAPI<Question[]>(
      `/questions/filter/topic/${encodeURIComponent(
        topic
      )}?${params.toString()}`
    );
  },
};

// ============================================================================
// Topics API
// ============================================================================

export const topicsAPI = {
  /**
   * Get all topics with their weights
   */
  getAllTopics: async (): Promise<TopicWeights> => {
    return fetchAPI<TopicWeights>("/topics");
  },

  /**
   * Get topics for a specific module
   */
  getTopicsByModule: async (
    module: "math" | "english"
  ): Promise<Record<string, number>> => {
    return fetchAPI<Record<string, number>>(`/topics/${module}`);
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if API is reachable
 */
export async function checkAPIHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get API base URL (useful for debugging)
 */
export function getAPIBaseURL(): string {
  return API_BASE_URL;
}
