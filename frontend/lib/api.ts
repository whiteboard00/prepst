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
      method: 'GET',
      headers,
      ...options
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `Failed to fetch ${endpoint}`);
    }

    return response.json();
  },

  async post(endpoint: string, data?: any, options?: RequestInit) {
    const headers = await getAuthHeaders();
    
    // Handle FormData separately - don't stringify and let browser set Content-Type
    const isFormData = data instanceof FormData;
    const requestHeaders = isFormData ? {
      Authorization: headers.Authorization
    } : headers;
    
    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: requestHeaders,
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
      ...options
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      const errorMessage = typeof error.detail === 'string' 
        ? error.detail 
        : (error.message || JSON.stringify(error.detail) || `Failed to post to ${endpoint}`);
      console.error('POST Error:', errorMessage, 'Full error:', error);
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async patch(endpoint: string, data?: any, options?: RequestInit) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      ...options
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `Failed to patch ${endpoint}`);
    }

    return response.json();
  },

  async delete(endpoint: string, options?: RequestInit) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      method: 'DELETE',
      headers,
      ...options
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `Failed to delete ${endpoint}`);
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
      throw new Error(error.detail || "Failed to generate study plan");
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
      throw new Error(error.detail || "Failed to fetch study plan");
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
      const error = await response.json().catch(() => ({ detail: 'Failed to delete study plan' }));
      throw new Error(error.detail || "Failed to delete study plan");
    }

    return { success: true };
  },

  async getCategoriesAndTopics(): Promise<CategoriesAndTopicsResponse> {
    const response = await fetch(`${config.apiUrl}/api/study-plans/`);

    if (!response.ok) {
      throw new Error("Failed to fetch categories and topics");
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
      throw new Error(error.detail || "Failed to get feedback");
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
      throw new Error(error.detail || "Failed to generate feedback");
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
      throw new Error(error.detail || "Failed to complete session");
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
      throw new Error(error.detail || "Failed to fetch growth curve");
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
      throw new Error(error.detail || "Failed to fetch skill heatmap");
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
      throw new Error(error.detail || "Failed to fetch snapshots");
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
      throw new Error(error.detail || "Failed to create snapshot");
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
      throw new Error(error.detail || "Failed to fetch learning events");
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
      throw new Error(error.detail || "Failed to fetch masteries");
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
      throw new Error(error.detail || "Failed to fetch mastery tracking stats");
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
      throw new Error(
        error.detail || "Failed to fetch confidence timing stats"
      );
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
      throw new Error(error.detail || "Failed to fetch learning events stats");
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
      throw new Error(error.detail || "Failed to fetch performance snapshots");
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
      throw new Error(error.detail || "Failed to fetch user progress summary");
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
      throw new Error(error.detail || "Failed to fetch mock exam analytics");
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
};
