import { supabase } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

export interface Topic {
  topic_id: string;
  topic_name: string;
  questions?: Array<{ id: string; status?: string }>;
}

export interface PracticeSession {
  id: string;
  study_plan_id: string;
  scheduled_date: string;
  session_number: number;
  status: string;
  topics: Topic[];
}

export interface StudyPlan {
  id: string;
  user_id: string;
  start_date: string;
  test_date: string;
  current_math_score: number;
  target_math_score: number;
  current_rw_score: number;
  target_rw_score: number;
  is_active: boolean;
  created_at: string;
  sessions: PracticeSession[];
}

export interface StudyPlanResponse {
  study_plan: StudyPlan;
  total_sessions: number;
  total_days: number;
  sessions_per_day?: number;
}

export const api = {
  async generateStudyPlan(data: StudyPlanRequest): Promise<StudyPlanResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/study-plans/generate`, {
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
    const response = await fetch(`${API_URL}/api/study-plans/me`, {
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

  async getCategoriesAndTopics(): Promise<Record<string, unknown>> {
    const response = await fetch(`${API_URL}/api/study-plans/`);

    if (!response.ok) {
      throw new Error("Failed to fetch categories and topics");
    }

    return response.json();
  },
};
