"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { StudyPlanResponse } from "@/lib/types";

export function useStudyPlan() {
  const [studyPlan, setStudyPlan] = useState<StudyPlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStudyPlan();
  }, []);

  const loadStudyPlan = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getStudyPlan();
      setStudyPlan(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load study plan";
      // Don't set error for "No active study plan found" as this is expected for new users
      if (!errorMessage.includes("No active study plan found")) {
        setError(errorMessage);
      }
      setStudyPlan(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = () => {
    loadStudyPlan();
  };

  return {
    studyPlan,
    isLoading,
    error,
    refetch,
  };
}
