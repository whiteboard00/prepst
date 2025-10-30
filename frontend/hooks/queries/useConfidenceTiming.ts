import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

/**
 * Hook to fetch confidence and timing statistics
 * 
 * @param limit - Number of records to analyze (default: 100)
 * 
 * Returns confidence levels, timing patterns, and calibration data
 * Caches data for 5 minutes
 */
export function useConfidenceTiming(limit: number = 100) {
  return useQuery({
    queryKey: queryKeys.adminAnalytics.confidenceTiming(limit),
    queryFn: () => api.getConfidenceTiming(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once for admin endpoints
  });
}
