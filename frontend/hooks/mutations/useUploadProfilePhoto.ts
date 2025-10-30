import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

/**
 * Hook to upload a profile photo
 * 
 * Automatically invalidates profile cache to refetch with new photo URL
 * Shows toast notifications for success/error states
 */
export function useUploadProfilePhoto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post("/api/profile/photo", formData);
    },
    onSuccess: () => {
      // Invalidate and refetch profile
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      toast.success('Profile photo uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload profile photo');
    },
  });
}
