import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

/**
 * Hook to fetch performance snapshots
 * 
 * @param snapshotType - Optional filter by snapshot type
 * @param limit - Number of snapshots to fetch (default: 50)
 * 
 * Returns performance snapshots with predicted scores and cognitive metrics
 * Caches data for 2 minutes (more dynamic than other analytics)
 */
export function usePerformanceSnapshots(snapshotType?: string, limit: number = 50) {
  return useQuery({
    queryKey: queryKeys.analytics.snapshots(snapshotType, limit),
    queryFn: () => api.getPerformanceSnapshots(snapshotType, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes - more dynamic data
  });
}
