import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import type { components } from "@/lib/types/api.generated";

type UserPreferencesUpdate = components["schemas"]["UserPreferencesUpdate"];

/**
 * Hook to update user preferences
 * 
 * Automatically invalidates profile cache to refetch updated preferences
 * Shows toast notifications for success/error states
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (updates: UserPreferencesUpdate) => api.patch("/api/preferences", updates),
    onSuccess: () => {
      // Invalidate and refetch profile (includes preferences)
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      toast.success('Preferences updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update preferences');
    },
  });
}
