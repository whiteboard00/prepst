import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

/**
 * Hook to fetch growth curve data showing SAT score predictions over time
 * 
 * @param skillId - Optional skill ID to filter by specific skill
 * @param daysBack - Number of days to look back (default: 30)
 * 
 * Returns data points with predicted SAT scores and mastery levels over time
 * Caches data for 5 minutes
 */
export function useGrowthCurve(skillId?: string, daysBack: number = 30) {
  return useQuery({
    queryKey: queryKeys.analytics.growthCurve(skillId, daysBack),
    queryFn: () => api.getGrowthCurve(skillId, daysBack),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
