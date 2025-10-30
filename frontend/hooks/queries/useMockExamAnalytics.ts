import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

/**
 * Hook to fetch mock exam analytics
 * 
 * Returns comprehensive mock exam analytics including:
 * - Recent exam scores
 * - Average scores
 * - Improvement velocity
 * - Readiness score
 * 
 * Caches data for 5 minutes
 */
export function useMockExamAnalytics() {
  return useQuery({
    queryKey: queryKeys.adminAnalytics.mockExamAnalytics(),
    queryFn: () => api.getMockExamAnalytics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once for admin endpoints
  });
}
