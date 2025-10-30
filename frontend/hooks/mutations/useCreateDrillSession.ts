import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

/**
 * Hook to create a new drill session for a specific skill
 * 
 * Shows toast notifications for success/error states
 * Returns session ID on success for navigation
 */
export function useCreateDrillSession() {
  return useMutation({
    mutationFn: ({ skillId, numQuestions = 10 }: { skillId: string; numQuestions?: number }) => 
      api.createDrillSession(skillId, numQuestions),
    onSuccess: (data) => {
      toast.success(`Drill session created: ${data.skill_name}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create drill session');
    },
  });
}
