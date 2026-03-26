"use client";

import { motion } from "framer-motion";
import { TrendingUp, BarChart3 } from "lucide-react";
import { useMockExamAnalytics } from "@/hooks/queries";

export default function MockExamHistory() {
  const { data: mockData } = useMockExamAnalytics();
  const recentExams = mockData?.recent_exams || [];

  if (recentExams.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-foreground">Score History</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-6">
          Complete mock exams to see your score trend
        </p>
      </div>
    );
  }

  // Take last 8 exams, sorted by date
  const exams = [...recentExams]
    .sort((a: any, b: any) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime())
    .slice(-8);

  const scores = exams.map((e: any) => e.total_score || 0);
  const maxScore = Math.max(...scores, 1);
  const minScore = Math.min(...scores);
  const latestScore = scores[scores.length - 1] || 0;
  const firstScore = scores[0] || 0;
  const improvement = latestScore - firstScore;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-foreground">Score History</h3>
        </div>
        {improvement !== 0 && (
          <div className={`flex items-center gap-1 text-sm font-medium ${improvement > 0 ? "text-emerald-500" : "text-red-500"}`}>
            <TrendingUp className={`w-4 h-4 ${improvement < 0 ? "rotate-180" : ""}`} />
            {improvement > 0 ? "+" : ""}{improvement}
          </div>
        )}
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1.5 h-24 mb-3">
        {exams.map((exam: any, i: number) => {
          const score = exam.total_score || 0;
          const heightPct = maxScore > 0 ? (score / maxScore) * 100 : 0;
          const isLatest = i === exams.length - 1;

          return (
            <motion.div
              key={exam.id || i}
              className="flex-1 flex flex-col items-center gap-1"
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <span className={`text-[10px] font-medium ${isLatest ? "text-primary" : "text-muted-foreground"}`}>
                {score}
              </span>
              <div
                className={`w-full rounded-t-md transition-colors ${
                  isLatest
                    ? "bg-primary"
                    : "bg-primary/30"
                }`}
                style={{ height: `${Math.max(heightPct, 8)}%` }}
              />
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {new Date(exams[0]?.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
        <span>
          {new Date(exams[exams.length - 1]?.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>
    </div>
  );
}
