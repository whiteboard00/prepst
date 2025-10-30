import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { components } from "@/lib/types/api.generated";

type CategoriesAndTopicsResponse = components["schemas"]["CategoriesAndTopicsResponse"];

/**
 * Hook to fetch all categories and topics
 * 
 * This data rarely changes, so we cache it for 30 minutes
 * Used for displaying available topics when creating study plans or practice sessions
 */
export function useCategoriesAndTopics() {
  return useQuery({
    queryKey: queryKeys.studyPlan.categoriesAndTopics(),
    queryFn: () => api.getCategoriesAndTopics(),
    staleTime: 30 * 60 * 1000, // 30 minutes - this data rarely changes
  });
}
