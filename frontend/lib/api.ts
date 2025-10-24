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
  PredictiveScoresAnalytics,
  ChatRequest,
  ChatResponse,
  ChatMessageAPI,
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

  async getCategoriesAndTopics(): Promise<CategoriesAndTopicsResponse> {
    const response = await fetch(`${config.apiUrl}/api/study-plans/`);

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
    const url = `${
      config.apiUrl
    }/api/practice-sessions/${sessionId}/questions/${questionId}/feedback${
      regenerate ? "?regenerate=true" : ""
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

  async completeSession(sessionId: string): Promise<{
    success: boolean;
    snapshot_created: boolean;
    predicted_sat_math?: number;
    predicted_sat_rw?: number;
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
    skillId: string,
    numQuestions: number = 10
  ): Promise<{
    success: boolean;
    session_id: string;
    skill_name: string;
    category: string;
    section: string;
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
          skill_id: skillId,
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

  async chatWithAI(data: ChatRequest): Promise<ChatResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${config.apiUrl}/api/ai-feedback/chat`, {
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
            "Failed to chat with AI";
      console.error("Chat API Error:", errorMessage, "Full error:", error);
      throw new Error(errorMessage);
    }

    return response.json();
  },
};
