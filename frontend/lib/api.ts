import { supabase } from "./supabase";
import { config } from "./config";
import type {
  StudyPlanResponse,
  CategoriesAndTopicsResponse,
  AIFeedbackRequest,
  AIFeedbackResponse,
  GrowthCurveDataPoint,
  CategoryHeatmap,
  PerformanceSnapshot,
  MasteryTrackingStats,
  ConfidenceTimingStats,
  LearningEventsStats,
  SnapshotsOverview,
  UserProgressSummary,
  DifficultyStats,
  MockExamAnalytics,
  ErrorPatternAnalytics,
  CognitiveEfficiencyAnalytics,
  LearningVelocityAnalytics,
  TopicMasteryImprovement,
  PredictiveScoresAnalytics,
  ChatRequest,
  ChatResponse,
  ChatMessageAPI,
  SessionSummaryResponse,
  VocabularyListResponse,
  PopularVocabListResponse,
  VocabularyWord,
  AddVocabManualRequest,
  AddVocabFromSelectionRequest,
  AddVocabFromPopularRequest,
  UpdateVocabRequest,
  VocabSource,
  Course,
  CourseListResponse,
  UserCourseEnrollment,
  UserCoursesResponse,
} from "./types";

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

export interface StudyPlanRequest {
  current_math_score: number;
  target_math_score: number;
  current_rw_score: number;
  target_rw_score: number;
  test_date: string; // ISO date string
  course_slug?: string;
}

export const api = {
  // Generic HTTP methods
  async get(endpoint: string, options?: RequestInit) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      method: "GET",
      headers,
      ...options,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Request failed" }));
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          `Failed to fetch ${endpoint}`;
      console.error("GET Error:", errorMessage, "Full error:", error);
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async post(endpoint: string, data?: any, options?: RequestInit) {
    const headers = await getAuthHeaders();

    // Handle FormData separately - don't stringify and let browser set Content-Type
    const isFormData = data instanceof FormData;
    const requestHeaders = isFormData
      ? {
        Authorization: headers.Authorization,
      }
      : headers;

    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      method: "POST",
      headers: requestHeaders,
      body: isFormData ? data : data ? JSON.stringify(data) : undefined,
      ...options,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Request failed" }));
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          `Failed to post to ${endpoint}`;
      console.error("POST Error:", errorMessage, "Full error:", error);
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async patch(endpoint: string, data?: any, options?: RequestInit) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      method: "PATCH",
      headers,
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Request failed" }));
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          `Failed to patch ${endpoint}`;
      console.error("PATCH Error:", errorMessage, "Full error:", error);
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async delete(endpoint: string, options?: RequestInit) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      method: "DELETE",
      headers,
      ...options,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Request failed" }));
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          `Failed to delete ${endpoint}`;
      console.error("DELETE Error:", errorMessage, "Full error:", error);
      throw new Error(errorMessage);
    }

    // DELETE might not return a body
    const text = await response.text();
    return text ? JSON.parse(text) : { success: true };
  },

  async generateStudyPlan(data: StudyPlanRequest): Promise<StudyPlanResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${config.apiUrl}/api/study-plans/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to generate study plan";
      console.error(
        "Study Plan Generation Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async getStudyPlan(): Promise<StudyPlanResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${config.apiUrl}/api/study-plans/me`, {
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("No active study plan found");
      }
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to fetch study plan";
      console.error(
        "Study Plan Fetch Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async deleteStudyPlan(): Promise<{ success: boolean }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${config.apiUrl}/api/study-plans/me`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("No active study plan found");
      }
      const error = await response
        .json()
        .catch(() => ({ detail: "Failed to delete study plan" }));
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to delete study plan";
      console.error(
        "Study Plan Delete Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return { success: true };
  },

  async getCategoriesAndTopics(courseSlug?: string): Promise<CategoriesAndTopicsResponse> {
    const params = courseSlug ? `?course_slug=${courseSlug}` : "";
    const response = await fetch(`${config.apiUrl}/api/study-plans/${params}`);

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Failed to fetch categories and topics" }));
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to fetch categories and topics";
      console.error(
        "Categories and Topics Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async getQuestionFeedback(
    sessionId: string,
    questionId: string,
    regenerate: boolean = false
  ): Promise<AIFeedbackResponse> {
    const headers = await getAuthHeaders();
    const url = `${config.apiUrl
      }/api/practice-sessions/${sessionId}/questions/${questionId}/feedback${regenerate ? "?regenerate=true" : ""
      }`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to get feedback";
      console.error(
        "Question Feedback Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async generateSessionFeedback(
    sessionId: string,
    questionIds?: string[]
  ): Promise<AIFeedbackResponse[]> {
    const headers = await getAuthHeaders();
    const body: AIFeedbackRequest = questionIds
      ? { question_ids: questionIds }
      : {};

    const response = await fetch(
      `${config.apiUrl}/api/practice-sessions/${sessionId}/generate-feedback`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to generate feedback";
      console.error(
        "Session Feedback Generation Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async generateSessionSummary(
    sessionId: string
  ): Promise<SessionSummaryResponse> {
    const headers = await getAuthHeaders();

    const response = await fetch(
      `${config.apiUrl}/api/practice-sessions/${sessionId}/generate-session-summary`,
      {
        method: "POST",
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to generate session summary";
      console.error(
        "Session Summary Generation Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async completeSession(sessionId: string): Promise<{
    success: boolean;
    snapshot_created: boolean;
    predicted_sat_math?: number;
    predicted_sat_rw?: number;
    new_achievements?: Array<{
      type: string;
      name: string;
      description: string;
      icon: string;
    }>;
    streak?: {
      current_streak: number;
      longest_streak: number;
    } | null;
  }> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/practice-sessions/${sessionId}/complete`,
      {
        method: "POST",
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to complete session";
      console.error(
        "Session Completion Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async createDrillSession(
    topicIds: string[],
    questionsPerTopic: number = 3
  ): Promise<{
    success: boolean;
    session_id: string;
    topic_names: string[];
    num_questions: number;
    session: any;
  }> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/practice-sessions/create-drill`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          topic_ids: topicIds,
          questions_per_topic: questionsPerTopic,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to create drill session";
      console.error(
        "Drill Session Creation Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async createAISession(
    prompt: string
  ): Promise<{
    success: boolean;
    session_id: string;
    topic_names: string[];
    num_questions: number;
    questions_per_topic: number;
  }> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/practice-sessions/create-ai-session`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt }),
      }
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Request failed" }));
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to create AI session";
      console.error(
        "AI Session Creation Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async getRecentDrills(limit: number = 10): Promise<any[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/practice-sessions/recent-drills?limit=${limit}`,
      { method: "GET", headers }
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(typeof error.detail === "string" ? error.detail : "Failed to fetch recent drills");
    }
    return response.json();
  },

  // Analytics endpoints
  async getGrowthCurve(
    skillId?: string,
    daysBack: number = 30
  ): Promise<{
    data: GrowthCurveDataPoint[];
    skill_id?: string;
    days_covered: number;
  }> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({ days_back: daysBack.toString() });
    if (skillId) params.append("skill_id", skillId);

    const response = await fetch(
      `${config.apiUrl}/api/analytics/users/me/growth-curve?${params}`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to fetch growth curve";
      console.error("Growth Curve Error:", errorMessage, "Full error:", error);
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async getSkillHeatmap(): Promise<{
    heatmap: Record<string, CategoryHeatmap>;
    total_skills: number;
    avg_mastery: number;
  }> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/analytics/users/me/skill-heatmap`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to fetch skill heatmap";
      console.error("Skill Heatmap Error:", errorMessage, "Full error:", error);
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async getPerformanceSnapshots(
    snapshotType?: string,
    limit: number = 50
  ): Promise<{
    snapshots: PerformanceSnapshot[];
    total_count: number;
  }> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({ limit: limit.toString() });
    if (snapshotType) params.append("snapshot_type", snapshotType);

    const response = await fetch(
      `${config.apiUrl}/api/analytics/users/me/snapshots?${params}`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to fetch snapshots";
      console.error(
        "Performance Snapshots Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async createSnapshot(): Promise<PerformanceSnapshot> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${config.apiUrl}/api/analytics/snapshots`, {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to create snapshot";
      console.error(
        "Create Snapshot Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async getLearningEvents(
    eventType?: string,
    limit: number = 50
  ): Promise<{
    events: Record<string, unknown>[];
    total_count: number;
  }> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({ limit: limit.toString() });
    if (eventType) params.append("event_type", eventType);

    const response = await fetch(
      `${config.apiUrl}/api/analytics/users/me/learning-events?${params}`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to fetch learning events";
      console.error(
        "Learning Events Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async getAllMasteries(): Promise<{
    masteries: Record<string, unknown>[];
    total_count: number;
  }> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/analytics/users/me/mastery`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to fetch masteries";
      console.error("Masteries Error:", errorMessage, "Full error:", error);
      throw new Error(errorMessage);
    }

    return response.json();
  },

  // Admin Analytics endpoints
  async getMasteryTracking(limit: number = 10): Promise<MasteryTrackingStats> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/analytics/admin/mastery-tracking?limit=${limit}`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to fetch mastery tracking stats";
      console.error(
        "Mastery Tracking Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async getConfidenceTiming(
    limit: number = 100
  ): Promise<ConfidenceTimingStats> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/analytics/admin/confidence-timing?limit=${limit}`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to fetch confidence timing stats";
      console.error(
        "Confidence Timing Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async getLearningEventsStats(): Promise<LearningEventsStats> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/analytics/admin/learning-events`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to fetch learning events stats";
      console.error(
        "Learning Events Stats Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async getPerformanceSnapshotsOverview(
    limit: number = 10
  ): Promise<SnapshotsOverview> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/analytics/admin/performance-snapshots?limit=${limit}`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to fetch performance snapshots";
      console.error(
        "Performance Snapshots Overview Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async getUserProgressSummary(): Promise<UserProgressSummary> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/analytics/admin/user-progress`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to fetch user progress summary";
      console.error(
        "User Progress Summary Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async getQuestionDifficultyStats(
    limit: number = 10
  ): Promise<DifficultyStats> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/analytics/admin/question-difficulty?limit=${limit}`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.detail || "Failed to fetch question difficulty stats"
      );
    }

    return response.json();
  },

  async getMockExams(): Promise<{ exams: any[] }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${config.apiUrl}/api/mock-exams/`, {
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to fetch mock exams");
    }

    return response.json();
  },

  async getMockExamAnalytics(): Promise<MockExamAnalytics> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/analytics/admin/mock-exam-analytics`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to fetch mock exam analytics";
      console.error(
        "Mock Exam Analytics Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async getStudyTime(daysBack: number = 7): Promise<{
    total_minutes: number;
    sessions_count: number;
    mock_modules_count: number;
    days_back: number;
  }> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/analytics/users/me/study-time?days_back=${daysBack}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch study time");
    }

    return response.json();
  },

  async getMockExamPerformance(limit: number = 10): Promise<{
    recent_exams: Array<{
      exam_type: string;
      total_score: number;
      math_score: number;
      rw_score: number;
      completed_at: string;
    }>;
    total_count: number;
  }> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/analytics/users/me/mock-exam-performance?limit=${limit}`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to fetch mock exam performance";
      console.error(
        "Mock Exam Performance Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async getErrorPatternAnalytics(): Promise<ErrorPatternAnalytics> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/analytics/admin/error-patterns`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.detail || "Failed to fetch error pattern analytics"
      );
    }

    return response.json();
  },

  async getCognitiveEfficiencyAnalytics(): Promise<CognitiveEfficiencyAnalytics> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/analytics/admin/cognitive-efficiency`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.detail || "Failed to fetch cognitive efficiency analytics"
      );
    }

    return response.json();
  },

  async getLearningVelocity(): Promise<LearningVelocityAnalytics> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/analytics/learning-velocity`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.detail || "Failed to fetch learning velocity analytics"
      );
    }

    return response.json();
  },

  async getPredictiveScores(): Promise<PredictiveScoresAnalytics> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/analytics/predictive-scores`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.detail || "Failed to fetch predictive scores analytics"
      );
    }

    return response.json();
  },

  async chatWithAI(
    data: ChatRequest,
    onStream?: (chunk: string) => void
  ): Promise<ChatResponse> {
    const headers = await getAuthHeaders();

    // Keep Content-Type for request body parsing - response will be text/event-stream
    const response = await fetch(`${config.apiUrl}/api/ai-feedback/chat`, {
      method: "POST",
      headers, // Keep all headers including Content-Type
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to chat with AI";
      console.error("Chat API Error:", errorMessage, "Full error:", error);
      throw new Error(errorMessage);
    }

    // If streaming callback provided, stream the response
    if (onStream && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  fullResponse += data.content;
                  onStream(data.content);
                }
                if (data.done || data.error) {
                  break;
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return {
        success: true,
        response: fullResponse,
        timestamp: new Date().toISOString(),
      };
    }

    // Fallback to non-streaming (shouldn't happen with new endpoint)
    return response.json();
  },

  async getSessionMasteryImprovements(
    sessionId: string
  ): Promise<TopicMasteryImprovement[]> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Not authenticated");

    const response = await fetch(
      `${config.apiUrl}/api/practice-sessions/${sessionId}/mastery-improvements`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch mastery improvements");
    }

    return response.json();
  },

  async getWrongAnswers(
    limit: number = 50
  ): Promise<import("./types").WrongAnswer[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/practice-sessions/wrong-answers?limit=${limit}`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to fetch wrong answers";
      console.error(
        "Wrong Answers API Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async getSavedQuestions(
    limit: number = 50
  ): Promise<import("./types").SavedQuestion[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/practice-sessions/saved-questions?limit=${limit}`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to fetch saved questions";
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async toggleSaveQuestion(
    sessionQuestionId: string
  ): Promise<{ success: boolean; is_saved: boolean; message: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/practice-sessions/questions/${sessionQuestionId}/toggle-save`,
      {
        method: "POST",
        headers,
      }
    );

    if (!response.ok) {
      throw new Error("Failed to toggle save status");
    }

    return response.json();
  },

  async getCompletedSessions(
    limit: number = 20
  ): Promise<import("./types").PracticeSession[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/practice-sessions/completed?limit=${limit}`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to fetch completed sessions";
      console.error(
        "Completed Sessions API Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async createRevisionSession(
    sessionId: string,
    numQuestions: number = 10
  ): Promise<{
    success: boolean;
    session_id: string;
    session: any;
  }> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/practice-sessions/create-revision`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          original_session_id: sessionId,
          num_questions: numQuestions,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to create revision session";
      console.error(
        "Revision Session Creation Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async addSimilarQuestion(
    sessionId: string,
    questionId: string,
    topicId: string
  ): Promise<{
    success: boolean;
    question: any;
    topic: any;
    display_order: number;
    session_question_id: string;
  }> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/practice-sessions/${sessionId}/add-similar-question`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          question_id: questionId,
          topic_id: topicId,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorMessage =
        typeof error.detail === "string"
          ? error.detail
          : error.message ||
          JSON.stringify(error.detail) ||
          "Failed to add similar question";
      console.error(
        "Add Similar Question Error:",
        errorMessage,
        "Full error:",
        error
      );
      throw new Error(errorMessage);
    }

    return response.json();
  },

  // Admin Question Management
  async getQuestionStats(): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${config.apiUrl}/api/admin/questions/stats`, {
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch question stats");
    }

    return response.json();
  },

  async listQuestions(params: {
    search?: string;
    module?: string;
    difficulty?: string;
    question_type?: string;
    is_active?: boolean;
    is_flagged?: boolean;
    topic_id?: string;
    has_empty_answers?: boolean;
    has_png_in_stem?: boolean;
    has_png_in_answers?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const headers = await getAuthHeaders();
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const response = await fetch(
      `${config.apiUrl}/api/admin/questions?${queryParams}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch questions");
    }

    return response.json();
  },

  async getQuestionDetail(questionId: string): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/admin/questions/${questionId}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch question detail");
    }

    return response.json();
  },

  async updateQuestion(
    questionId: string,
    updates: {
      stem?: string;
      stimulus?: string;
      answer_options?: Record<string, string> | any;
      correct_answer?: string[];
      acceptable_answers?: string[];
      is_active?: boolean;
      difficulty?: string;
      topic_id?: string;
      rationale?: string;
    }
  ): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/admin/questions/${questionId}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to update question");
    }

    return response.json();
  },

  async bulkUpdateQuestions(
    questionIds: string[],
    updates: Record<string, any>
  ): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/admin/questions/bulk-update`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          question_ids: questionIds,
          updates,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to bulk update questions");
    }

    return response.json();
  },

  async toggleQuestionFlag(questionId: string): Promise<any> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${config.apiUrl}/api/admin/questions/${questionId}/toggle-flag`,
      {
        method: "POST",
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to toggle question flag" }));
      throw new Error(error.detail || "Failed to toggle question flag");
    }

    return response.json();
  },

  // Question Pool API (user-facing browse)
  async browseQuestions(params: {
    section?: string;
    difficulty?: 'E' | 'M' | 'H';
    topicId?: string;
    categoryId?: string;
    courseSlug?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    questions: Array<{
      id: string;
      stem: string;
      stimulus?: string;
      difficulty: string;
      question_type: string;
      answer_options?: Record<string, any>;
      correct_answer?: string[];
      rationale?: string;
      topic?: { id: string; name: string };
      category?: { id: string; name: string; section: string };
    }>;
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  }> {
    const headers = await getAuthHeaders();
    const queryParams = new URLSearchParams();

    if (params.section) queryParams.append('section', params.section);
    if (params.difficulty) queryParams.append('difficulty', params.difficulty);
    if (params.topicId) queryParams.append('topic_id', params.topicId);
    if (params.categoryId) queryParams.append('category_id', params.categoryId);
    if (params.courseSlug) queryParams.append('course_slug', params.courseSlug);
    if (params.search) queryParams.append('search', params.search);
    if (params.limit) queryParams.append('limit', String(params.limit));
    if (params.offset) queryParams.append('offset', String(params.offset));

    const response = await fetch(
      `${config.apiUrl}/api/questions/browse?${queryParams}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error("Failed to browse questions");
    }

    return response.json();
  },

  async getTopicsSummary(section?: string, courseSlug?: string): Promise<Array<{
    topic_id: string;
    topic_name: string;
    category_id: string;
    category_name: string;
    section: string;
    total_questions: number;
    easy_count: number;
    medium_count: number;
    hard_count: number;
  }>> {
    const headers = await getAuthHeaders();
    const queryParams = new URLSearchParams();
    if (section) queryParams.append('section', section);
    if (courseSlug) queryParams.append('course_slug', courseSlug);

    const response = await fetch(
      `${config.apiUrl}/api/questions/topics-summary?${queryParams}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error("Failed to get topics summary");
    }

    return response.json();
  },

  // Vocabulary API methods
  async getVocabulary(params?: {
    mastered?: boolean;
    source?: VocabSource;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<VocabularyListResponse> {
    const headers = await getAuthHeaders();
    const queryParams = new URLSearchParams();

    if (params?.mastered !== undefined) queryParams.append('mastered', String(params.mastered));
    if (params?.source) queryParams.append('source', params.source);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.offset) queryParams.append('offset', String(params.offset));

    const response = await fetch(
      `${config.apiUrl}/api/vocabulary/?${queryParams}`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to fetch vocabulary" }));
      throw new Error(error.detail || "Failed to fetch vocabulary");
    }

    return response.json();
  },

  async addVocabManually(data: AddVocabManualRequest): Promise<VocabularyWord> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${config.apiUrl}/api/vocabulary/`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to add vocabulary word" }));
      throw new Error(error.detail || "Failed to add vocabulary word");
    }

    return response.json();
  },

  async addVocabFromSelection(data: AddVocabFromSelectionRequest): Promise<VocabularyWord> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${config.apiUrl}/api/vocabulary/from-selection`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to add vocabulary word" }));
      throw new Error(error.detail || "Failed to add vocabulary word");
    }

    return response.json();
  },

  async addVocabFromPopular(data: AddVocabFromPopularRequest): Promise<VocabularyWord> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${config.apiUrl}/api/vocabulary/from-popular`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to add vocabulary word" }));
      throw new Error(error.detail || "Failed to add vocabulary word");
    }

    return response.json();
  },

  async updateVocab(wordId: string, data: UpdateVocabRequest): Promise<VocabularyWord> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${config.apiUrl}/api/vocabulary/${wordId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to update vocabulary word" }));
      throw new Error(error.detail || "Failed to update vocabulary word");
    }

    return response.json();
  },

  async deleteVocab(wordId: string): Promise<{ success: boolean; deleted_id: string }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${config.apiUrl}/api/vocabulary/${wordId}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to delete vocabulary word" }));
      throw new Error(error.detail || "Failed to delete vocabulary word");
    }

    return response.json();
  },

  async getPopularVocab(params?: {
    difficulty?: 'E' | 'M' | 'H';
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<PopularVocabListResponse> {
    const headers = await getAuthHeaders();
    const queryParams = new URLSearchParams();

    if (params?.difficulty) queryParams.append('difficulty', params.difficulty);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.offset) queryParams.append('offset', String(params.offset));

    const response = await fetch(
      `${config.apiUrl}/api/vocabulary/popular?${queryParams}`,
      { headers }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to fetch popular vocabulary" }));
      throw new Error(error.detail || "Failed to fetch popular vocabulary");
    }

    return response.json();
  },

  // Courses API
  async getCourses(): Promise<CourseListResponse> {
    const response = await fetch(`${config.apiUrl}/api/courses`);
    if (!response.ok) {
      throw new Error("Failed to fetch courses");
    }
    return response.json();
  },

  async getCourse(slug: string): Promise<Course> {
    const response = await fetch(`${config.apiUrl}/api/courses/${slug}`);
    if (!response.ok) {
      throw new Error("Failed to fetch course");
    }
    return response.json();
  },

  async enrollInCourse(courseId: string): Promise<UserCourseEnrollment> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${config.apiUrl}/api/courses/enroll`, {
      method: "POST",
      headers,
      body: JSON.stringify({ course_id: courseId }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to enroll in course" }));
      throw new Error(error.detail || "Failed to enroll in course");
    }
    return response.json();
  },

  async getMyEnrollments(): Promise<UserCoursesResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${config.apiUrl}/api/courses/me/enrollments`, {
      headers,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to fetch enrollments" }));
      throw new Error(error.detail || "Failed to fetch enrollments");
    }
    return response.json();
  },
};
