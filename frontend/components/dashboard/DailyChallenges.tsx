"use client";

import { motion } from "framer-motion";
import { Swords, CheckCircle2, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";

interface Challenge {
  id: string;
  title: string;
  description: string;
  target_value: number;
  xp_reward: number;
  icon: string;
  current_value: number;
  completed: boolean;
  progress_pct: number;
}

export default function DailyChallenges() {
  const { user } = useAuth();

  const { data: challenges = [] } = useQuery<Challenge[]>({
    queryKey: ["gamification", "challenges", user?.id],
    queryFn: () => api.get("/api/gamification/challenges"),
    enabled: !!user,
    staleTime: 30_000,
  });

  if (challenges.length === 0) return null;

  const completedCount = challenges.filter((c) => c.completed).length;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold text-foreground">Daily Challenges</h3>
        </div>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{challenges.length} done
        </span>
      </div>

      <div className="space-y-3">
        {challenges.map((ch, i) => (
          <motion.div
            key={ch.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              ch.completed
                ? "bg-emerald-500/10 border border-emerald-500/20"
                : "bg-muted/30 border border-transparent"
            }`}
          >
            <span className="text-xl flex-shrink-0">{ch.icon}</span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-sm font-medium ${ch.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {ch.title}
                </span>
                {ch.completed && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-1.5">{ch.description}</p>
              <Progress value={ch.progress_pct} className="h-1.5" />
            </div>

            <div className="flex items-center gap-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400 flex-shrink-0">
              <Zap className="w-3 h-3" />
              {ch.xp_reward}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
