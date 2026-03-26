"use client";

import { motion } from "framer-motion";
import { Zap, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";

interface XPData {
  total_xp: number;
  level: number;
  xp_for_current_level: number;
  xp_for_next_level: number;
  level_progress: number;
}

export default function XPLevelBar() {
  const { user } = useAuth();

  const { data: xp } = useQuery<XPData>({
    queryKey: ["gamification", "xp", user?.id],
    queryFn: () => api.get("/api/gamification/xp"),
    enabled: !!user,
    staleTime: 30_000,
  });

  if (!xp) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card p-4 flex items-center gap-4"
    >
      {/* Level badge */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
          <span className="text-lg font-bold text-white">{xp.level}</span>
        </div>
        <Star className="w-4 h-4 text-yellow-400 absolute -top-1 -right-1 fill-yellow-400" />
      </div>

      {/* Progress info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-foreground">Level {xp.level}</span>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Zap className="w-3.5 h-3.5 text-yellow-500" />
            <span className="font-medium">{xp.total_xp.toLocaleString()} XP</span>
          </div>
        </div>
        <Progress value={xp.level_progress} className="h-2.5" />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">
            {Math.round(xp.xp_for_next_level - xp.total_xp)} XP to level {xp.level + 1}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {Math.round(xp.level_progress)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}
