import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

/**
 * Hook to delete the current study plan
 * 
 * Automatically removes the study plan from cache on success
 * Shows toast notifications for success/error states
 */
export function useDeleteStudyPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => api.deleteStudyPlan(),
    onSuccess: () => {
      // Remove from cache
      queryClient.setQueryData(queryKeys.studyPlan.me(), null);
      toast.success('Study plan deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete study plan');
    },
  });
}
