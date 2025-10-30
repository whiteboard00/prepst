import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

/**
 * Hook to delete profile photo
 * 
 * Automatically invalidates profile cache to refetch without photo
 * Shows toast notifications for success/error states
 */
export function useDeleteProfilePhoto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => api.delete("/api/profile/photo"),
    onSuccess: () => {
      // Invalidate and refetch profile
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      toast.success('Profile photo deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete profile photo');
    },
  });
}
