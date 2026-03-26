"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Medal, Crown, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  profile_photo_url?: string;
  total_xp: number;
  questions_answered: number;
  accuracy: number;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  user_rank: {
    rank: number | null;
    total_xp: number;
  };
}

const RANK_COLORS = ["text-yellow-500", "text-gray-400", "text-orange-600"];
const RANK_ICONS = [Crown, Medal, Medal];

export default function Leaderboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");

  const { data } = useQuery<LeaderboardData>({
    queryKey: ["gamification", "leaderboard", period, user?.id],
    queryFn: () => api.get(`/api/gamification/leaderboard?period=${period}`),
    enabled: !!user,
    staleTime: 60_000,
  });

  const entries = data?.leaderboard || [];
  const userRank = data?.user_rank;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Medal className="w-5 h-5 text-yellow-500" />
          <h3 className="font-semibold text-foreground">Leaderboard</h3>
        </div>

        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          {(["weekly", "monthly"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                period === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "weekly" ? "Week" : "Month"}
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Complete sessions to appear on the leaderboard!
        </p>
      ) : (
        <div className="space-y-2">
          {entries.slice(0, 10).map((entry, i) => {
            const isUser = entry.user_id === user?.id;
            const RankIcon = i < 3 ? RANK_ICONS[i] : null;

            return (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                  isUser ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/30"
                }`}
              >
                {/* Rank */}
                <div className="w-7 text-center flex-shrink-0">
                  {RankIcon ? (
                    <RankIcon className={`w-5 h-5 mx-auto ${RANK_COLORS[i]}`} />
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">
                      {entry.rank}
                    </span>
                  )}
                </div>

                {/* Avatar + Name */}
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarImage src={entry.profile_photo_url} />
                  <AvatarFallback className="text-xs">
                    {(entry.name || "?")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <span className={`text-sm flex-1 min-w-0 truncate ${isUser ? "font-semibold text-foreground" : "text-foreground"}`}>
                  {isUser ? "You" : entry.name}
                </span>

                {/* XP */}
                <div className="flex items-center gap-1 text-sm font-medium text-yellow-600 dark:text-yellow-400 flex-shrink-0">
                  <Zap className="w-3.5 h-3.5" />
                  {entry.total_xp.toLocaleString()}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* User's own rank if not in top 10 */}
      {userRank?.rank && userRank.rank > 10 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <div className="w-7 text-center">
              <span className="text-sm font-medium text-muted-foreground">
                {userRank.rank}
              </span>
            </div>
            <span className="text-sm font-semibold flex-1">You</span>
            <div className="flex items-center gap-1 text-sm font-medium text-yellow-600 dark:text-yellow-400">
              <Zap className="w-3.5 h-3.5" />
              {userRank.total_xp.toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
