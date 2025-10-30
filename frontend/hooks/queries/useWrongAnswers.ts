import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

/**
 * Hook to fetch user's wrong answers for revision
 * 
 * @param limit - Number of wrong answers to fetch (default: 50)
 * 
 * Returns questions the user answered incorrectly, useful for creating revision sessions
 * Caches data for 2 minutes (more dynamic as users practice)
 */
export function useWrongAnswers(limit: number = 50) {
  return useQuery({
    queryKey: queryKeys.practice.wrongAnswers(limit),
    queryFn: () => api.getWrongAnswers(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes - more dynamic data
  });
}
