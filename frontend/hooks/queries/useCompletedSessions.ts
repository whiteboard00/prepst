import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

/**
 * Hook to fetch user's completed practice sessions
 * 
 * @param limit - Number of sessions to fetch (default: 20)
 * 
 * Returns completed practice sessions with scores and metadata
 * Caches data for 2 minutes (more dynamic as users practice)
 */
export function useCompletedSessions(limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.practice.completed(limit),
    queryFn: () => api.getCompletedSessions(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes - more dynamic data
  });
}
