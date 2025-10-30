import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

/**
 * Hook to fetch skill heatmap showing mastery levels across all skills
 * 
 * Returns a heatmap organized by category with skill mastery levels,
 * velocity, and plateau indicators
 * Caches data for 5 minutes
 */
export function useSkillHeatmap() {
  return useQuery({
    queryKey: queryKeys.analytics.skillHeatmap(),
    queryFn: () => api.getSkillHeatmap(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
