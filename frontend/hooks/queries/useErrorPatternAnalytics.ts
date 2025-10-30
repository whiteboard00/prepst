import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

/**
 * Hook to fetch error pattern analytics
 * 
 * Returns analysis of recurring errors, cognitive blocks, and error rates by topic
 * Caches data for 5 minutes
 */
export function useErrorPatternAnalytics() {
  return useQuery({
    queryKey: queryKeys.analytics.errorPatterns(),
    queryFn: () => api.getErrorPatternAnalytics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once for admin endpoints
  });
}
