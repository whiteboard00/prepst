import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { components } from "@/lib/types/api.generated";

type ProfileResponse = components["schemas"]["ProfileResponse"];

/**
 * Hook to fetch the current user's profile
 * 
 * Returns complete profile data including:
 * - User profile information
 * - User preferences (theme, notifications, etc)
 * - Streak data
 * - Statistics (practice sessions, accuracy, etc)
 * - Recent achievements
 * 
 * Caches data for 5 minutes
 */
export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: () => api.get("/api/profile") as Promise<ProfileResponse>,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
