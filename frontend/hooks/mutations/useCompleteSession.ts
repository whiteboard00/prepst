import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

/**
 * Hook to complete a practice session
 * 
 * Automatically invalidates related caches (analytics, completed sessions)
 * Shows toast notifications for success/error states
 */
export function useCompleteSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (sessionId: string) => api.completeSession(sessionId),
    onSuccess: () => {
      // Invalidate analytics and practice session caches
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.practice.all });
      toast.success('Session completed successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete session');
    },
  });
}
