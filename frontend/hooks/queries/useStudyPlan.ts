import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { components } from "@/lib/types/api.generated";

type StudyPlanResponse = components["schemas"]["StudyPlanResponse"];

/**
 * Hook to fetch the current user's study plan
 * 
 * Returns null if no study plan exists (expected for new users)
 * Caches data for 10 minutes
 */
export function useStudyPlan() {
  return useQuery({
    queryKey: queryKeys.studyPlan.me(),
    queryFn: async () => {
      try {
        return await api.getStudyPlan();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load study plan";
        // Don't throw error for "No active study plan found" as this is expected for new users
        if (errorMessage.includes("No active study plan found")) {
          return null;
        }
        throw err;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - study plans change less frequently
    retry: (failureCount, error) => {
      // Don't retry if it's a "no study plan" error
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage.includes("No active study plan found")) {
        return false;
      }
      return failureCount < 1;
    },
  });
}
