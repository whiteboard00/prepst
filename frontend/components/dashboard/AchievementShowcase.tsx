"use client";

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// All possible achievements with their locked state info
const ALL_ACHIEVEMENTS = [
  { type: "first_session", name: "First Steps", icon: "🎯", description: "Complete your first practice session" },
  { type: "streak_3", name: "On a Roll", icon: "🔥", description: "Maintain a 3-day study streak" },
  { type: "streak_7", name: "Week Warrior", icon: "💪", description: "Maintain a 7-day study streak" },
  { type: "streak_30", name: "Dedicated Scholar", icon: "🏆", description: "Maintain a 30-day study streak" },
  { type: "questions_100", name: "Century Club", icon: "💯", description: "Answer 100 questions" },
  { type: "questions_500", name: "Question Master", icon: "📚", description: "Answer 500 questions" },
  { type: "questions_1000", name: "Knowledge Seeker", icon: "🎓", description: "Answer 1000 questions" },
  { type: "perfect_session", name: "Perfect Score", icon: "⭐", description: "Complete a session with 100% accuracy" },
  { type: "early_bird", name: "Early Bird", icon: "🌅", description: "Complete a session before 7 AM" },
  { type: "night_owl", name: "Night Owl", icon: "🦉", description: "Complete a session after 10 PM" },
  { type: "mock_exam_complete", name: "Test Ready", icon: "📝", description: "Complete your first mock exam" },
  { type: "speed_demon", name: "Speed Demon", icon: "⚡", description: "Complete a session in under 15 minutes" },
  { type: "consistency_king", name: "Consistency King", icon: "👑", description: "Study for 5 days in a row" },
  { type: "score_improvement_50", name: "Rising Star", icon: "📈", description: "Improve your predicted score by 50 points" },
  { type: "score_improvement_100", name: "Breakthrough", icon: "🚀", description: "Improve your predicted score by 100 points" },
  { type: "onboarding_complete", name: "Welcome Aboard", icon: "🎉", description: "Complete profile setup and onboarding" },
];

interface Achievement {
  id: string;
  achievement_type: string;
  achievement_name: string;
  achievement_description?: string;
  achievement_icon?: string;
  unlocked_at: string;
}

export default function AchievementShowcase() {
  const { user } = useAuth();

  const { data: achievements = [] } = useQuery<Achievement[]>({
    queryKey: ["achievements", user?.id],
    queryFn: () => api.get("/api/profile/achievements"),
    enabled: !!user,
    staleTime: 60_000,
  });

  const unlockedTypes = new Set(achievements.map((a) => a.achievement_type));
  const unlockedCount = unlockedTypes.size;
  const totalCount = ALL_ACHIEVEMENTS.length;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className="font-semibold text-foreground">Achievements</h3>
        </div>
        <span className="text-sm text-muted-foreground">
          {unlockedCount}/{totalCount}
        </span>
      </div>

      <TooltipProvider delayDuration={200}>
        <div className="grid grid-cols-8 gap-2">
          {ALL_ACHIEVEMENTS.map((ach, i) => {
            const unlocked = unlockedTypes.has(ach.type);
            return (
              <Tooltip key={ach.type}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03, type: "spring", stiffness: 400 }}
                    className={`
                      aspect-square flex items-center justify-center rounded-xl text-lg cursor-default
                      transition-all duration-200
                      ${unlocked
                        ? "bg-yellow-500/10 border border-yellow-500/30 hover:scale-110 hover:shadow-md"
                        : "bg-muted/50 border border-transparent opacity-40 grayscale"
                      }
                    `}
                  >
                    {ach.icon}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <p className="font-medium">{ach.name}</p>
                  <p className="text-xs text-muted-foreground">{ach.description}</p>
                  {unlocked && (
                    <p className="text-xs text-yellow-500 mt-1">Unlocked!</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {unlockedCount === 0 && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          Complete sessions to unlock achievements!
        </p>
      )}
    </div>
  );
}
