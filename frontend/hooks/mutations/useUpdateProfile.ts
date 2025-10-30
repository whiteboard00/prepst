import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import type { components } from "@/lib/types/api.generated";

type UserProfileUpdate = components["schemas"]["UserProfileUpdate"];

/**
 * Hook to update user profile
 * 
 * Automatically invalidates profile cache to refetch updated data
 * Shows toast notifications for success/error states
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (updates: UserProfileUpdate) => api.patch("/api/profile", updates),
    onSuccess: () => {
      // Invalidate and refetch profile
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      toast.success('Profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });
}
