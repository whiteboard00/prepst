const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  num_questions: number;
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
  async generateStudyPlan(
    userId: string,
    data: StudyPlanRequest
  ): Promise<StudyPlanResponse> {
    const response = await fetch(
      `${API_URL}/api/study-plans/generate?user_id=${userId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate study plan');
    }

    return response.json();
  },

  async getStudyPlan(userId: string): Promise<StudyPlanResponse> {
    const response = await fetch(`${API_URL}/api/study-plans/${userId}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('No active study plan found');
      }
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch study plan');
    }

    return response.json();
  },

  async getCategoriesAndTopics(): Promise<any> {
    const response = await fetch(`${API_URL}/api/study-plans/`);

    if (!response.ok) {
      throw new Error('Failed to fetch categories and topics');
    }

    return response.json();
  },
};
