import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

/**
 * Hook to create a revision session from a previous session's wrong answers
 * 
 * Shows toast notifications for success/error states
 * Returns session ID on success for navigation
 */
export function useCreateRevisionSession() {
  return useMutation({
    mutationFn: ({ sessionId, numQuestions = 10 }: { sessionId: string; numQuestions?: number }) => 
      api.createRevisionSession(sessionId, numQuestions),
    onSuccess: () => {
      toast.success('Revision session created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create revision session');
    },
  });
}
