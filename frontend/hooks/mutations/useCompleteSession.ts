import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

/**
 * Hook to complete a practice session
 *
 * Automatically invalidates related caches (analytics, completed sessions)
 * Shows toast notifications for success/error states
 * Triggers achievement and streak celebrations
 */
export function useCompleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => api.completeSession(sessionId),
    onSuccess: (data) => {
      // Invalidate analytics and practice session caches
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.practice.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      toast.success('Session completed successfully!');

      // Show achievement toasts with delay for dramatic effect
      if (data.new_achievements && data.new_achievements.length > 0) {
        data.new_achievements.forEach((achievement, index) => {
          setTimeout(() => {
            toast.success(`${achievement.icon} ${achievement.name}`, {
              description: achievement.description,
              duration: 5000,
            });
          }, 1000 + index * 1500);
        });
      }

      // Show streak update
      if (data.streak && data.streak.current_streak > 1) {
        setTimeout(() => {
          toast(`🔥 ${data.streak!.current_streak}-day streak!`, {
            description: data.streak!.current_streak === data.streak!.longest_streak
              ? "New personal best!"
              : "Keep it going!",
            duration: 4000,
          });
        }, 500);
      }

      // Show XP gained
      const xp = (data as any).xp;
      if (xp && xp.xp_gained > 0) {
        setTimeout(() => {
          toast(`⚡ +${xp.xp_gained} XP`, {
            description: xp.leveled_up
              ? `Level up! You're now level ${xp.level}!`
              : `Level ${xp.level} — ${Math.round(xp.level_progress)}% to next`,
            duration: 4000,
          });
        }, 800);

        // Invalidate gamification queries
        queryClient.invalidateQueries({ queryKey: ["gamification"] });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete session');
    },
  });
}
