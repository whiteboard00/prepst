import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

/**
 * Hook to fetch cognitive efficiency analytics
 * 
 * Returns analysis of time-of-day patterns, confidence calibration,
 * and overall cognitive efficiency scores
 * Caches data for 5 minutes
 */
export function useCognitiveEfficiencyAnalytics() {
  return useQuery({
    queryKey: queryKeys.analytics.cognitiveEfficiency(),
    queryFn: () => api.getCognitiveEfficiencyAnalytics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once for admin endpoints
  });
}
