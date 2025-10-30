import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type StudyPlanRequest } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

/**
 * Hook to generate a new study plan
 * 
 * Automatically updates the study plan cache on success
 * Shows toast notifications for success/error states
 */
export function useGenerateStudyPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: StudyPlanRequest) => api.generateStudyPlan(data),
    onSuccess: (data) => {
      // Automatically update cache with new study plan
      queryClient.setQueryData(queryKeys.studyPlan.me(), data);
      toast.success('Study plan generated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate study plan');
    },
  });
}
