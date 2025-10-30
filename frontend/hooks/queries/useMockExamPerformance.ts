import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

/**
 * Hook to fetch mock exam performance history
 * 
 * @param limit - Number of recent exams to fetch (default: 10)
 * 
 * Returns recent mock exam scores with math, reading/writing, and total scores
 * Caches data for 5 minutes
 */
export function useMockExamPerformance(limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.mockExam.performance(limit),
    queryFn: () => api.getMockExamPerformance(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
