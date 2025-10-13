import { supabase } from "./supabase";
import type {
  StudyPlanResponse,
  CategoriesAndTopicsResponse
} from "./types";

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

  async getCategoriesAndTopics(): Promise<CategoriesAndTopicsResponse> {
    const response = await fetch(`${API_URL}/api/study-plans/`);

    if (!response.ok) {
      throw new Error("Failed to fetch categories and topics");
    }

    return response.json();
  },
};
