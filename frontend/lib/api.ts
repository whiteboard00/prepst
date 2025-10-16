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
  MasteryUpdate,
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
    events: any[];
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
    masteries: any[];
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
};
