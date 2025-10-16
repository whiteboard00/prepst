import { supabase } from "./supabase";
import { config } from "./config";
import type {
  StudyPlanResponse,
  CategoriesAndTopicsResponse,
  AIFeedbackRequest,
  AIFeedbackResponse,
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
    const url = `${config.apiUrl}/api/study-plans/sessions/${sessionId}/questions/${questionId}/feedback${
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
      `${config.apiUrl}/api/study-plans/sessions/${sessionId}/generate-feedback`,
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
};
