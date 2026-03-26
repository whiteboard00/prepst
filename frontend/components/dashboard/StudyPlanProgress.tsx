"use client";

import { motion } from "framer-motion";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { useStudyPlan } from "@/hooks/queries";
import { Progress } from "@/components/ui/progress";

export default function StudyPlanProgress() {
  const { data: studyPlanData } = useStudyPlan();
  const sessions = studyPlanData?.study_plan?.sessions || [];

  if (sessions.length === 0) return null;

  const completed = sessions.filter((s: any) => s.status === "completed").length;
  const total = sessions.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Study Plan</h3>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          {completed}/{total} sessions
        </div>
      </div>

      <Progress value={percentage} className="h-3 mb-2" />

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{percentage}% complete</span>
        {percentage === 100 ? (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full"
          >
            Plan Complete!
          </motion.span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {total - completed} remaining
          </span>
        )}
      </div>
    </div>
  );
}
