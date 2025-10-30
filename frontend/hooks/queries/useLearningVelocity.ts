import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

/**
 * Hook to fetch learning velocity analytics
 * 
 * Returns metrics about learning speed, improvement rates,
 * and velocity trends across different skills
 * Caches data for 5 minutes
 */
export function useLearningVelocity() {
  return useQuery({
    queryKey: queryKeys.analytics.learningVelocity(),
    queryFn: () => api.getLearningVelocity(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once
  });
}
