"use client";

import { useMemo } from "react";
import {
  useStudyPlan,
  useGrowthCurve,
  useSkillHeatmap,
  useMockExamAnalytics,
} from "@/hooks/queries";
import { useProfile } from "@/lib/hooks/useProfile";
import { MockExamPerformance } from "@/components/analytics/MockExamPerformance";
import { LineChart } from "@/components/charts/LineChart";
import { RadarChart } from "@/components/charts/RadarChart";
import { AreaChart } from "@/components/charts/AreaChart";
import { SkillRadialChart } from "@/components/charts/SkillRadialChart";
import { PredictiveSATTracker } from "@/components/analytics/PredictiveSATTracker";
import MagicBento from "@/components/dashboard/MagicBento";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TrendingUp, Calendar, Zap, ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { ONBOARDING_CONTENT } from "@/lib/onboardingContent";
import { useCourseConfigSafe } from "@/contexts/CourseContext";

function ProgressContent() {
  const router = useRouter();
  const { course } = useCourseConfigSafe();
  const courseName = course?.name ?? "SAT";
  // Use TanStack Query hooks for automatic caching
  const { data: studyPlan, isLoading: studyPlanLoading } = useStudyPlan();
  const growthCurveQuery = useGrowthCurve(undefined, 30);
  const heatmapQuery = useSkillHeatmap();
  const {
    data: mockExamData,
    isLoading: mockExamLoading,
    isError: mockExamError,
  } = useMockExamAnalytics();
  const { profileData } = useProfile();

  // Derive data from queries
  const growthData = growthCurveQuery.data?.data || [];
  const heatmap = heatmapQuery.data?.heatmap || {};

  // Combined loading state
  const chartsLoading = growthCurveQuery.isLoading || heatmapQuery.isLoading;

  // Compute top strengths and weaknesses from heatmap
  const { strengths, weaknesses } = useMemo(() => {
    const allSkills: { name: string; mastery: number }[] = [];
    for (const cat of Object.values(heatmap) as any[]) {
      for (const skill of (cat?.skills || [])) {
        if (skill?.name && typeof skill.mastery === "number" && skill.mastery > 0) {
          allSkills.push({ name: skill.name, mastery: skill.mastery });
        }
      }
    }
    const sorted = [...allSkills].sort((a, b) => b.mastery - a.mastery);
    return {
      strengths: sorted.slice(0, 2),
      weaknesses: sorted.length > 2 ? sorted.slice(-2).reverse() : [],
    };
  }, [heatmap]);

  // Build trajectory data from real growth curve
  const trajectoryBars = useMemo(() => {
    if (growthData.length === 0) return [];
    // Normalize growth data to 0-1 range for sparkline bars
    const masteryValues = growthData.map((d) => d.mastery ?? 0);
    const maxVal = Math.max(...masteryValues, 0.01);
    return masteryValues.map((v: number) => Math.max(0.1, v / maxVal));
  }, [growthData]);

  // Compute projected score from real improvement velocity
  const projectedImprovement = useMemo(() => {
    if (growthData.length < 2) return 0;
    const first = growthData[0]?.mastery ?? 0;
    const last = growthData[growthData.length - 1]?.mastery ?? 0;
    const delta = last - first;
    // Scale mastery improvement to approximate SAT points (rough heuristic: 0.1 mastery ≈ ~50 points)
    return Math.round(delta * 500);
  }, [growthData]);

  if (studyPlanLoading) {
    return (
      <div className="min-h-screen bg-background py-12 px-6">
        <div className="mx-auto max-w-7xl space-y-12">
          {/* Header Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-12 w-80 rounded-xl" />
            <Skeleton className="h-6 w-[500px] rounded-lg" />
          </div>

          {/* Skill Mastery Section Skeleton */}
          <div className="space-y-6">
            <Skeleton className="h-10 w-56 rounded-lg" />
            <div className="space-y-8">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-card rounded-3xl p-8 border border-border shadow-sm"
                >
                  <Skeleton className="h-8 w-48 mb-6" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <Skeleton key={j} className="aspect-square rounded-2xl" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts Skeleton */}
          <div className="space-y-12">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-96 w-full rounded-3xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!studyPlan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-2xl text-center">
          <div className="bg-card border border-border rounded-[2.5rem] p-12 shadow-xl">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-primary/10 rounded-3xl mb-8">
              <TrendingUp className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground mb-4">
              No Progress Data Yet
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
              Create a study plan to start tracking your {courseName} progress and see
              detailed analytics.
            </p>
            <Button
              onClick={() => router.push("/onboard")}
              size="lg"
              className="h-12 px-8 text-base rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              Create Study Plan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { study_plan } = studyPlan;
  const currentTotal =
    (study_plan.current_math_score ?? 0) + (study_plan.current_rw_score ?? 0);
  const targetTotal =
    (study_plan.target_math_score ?? 0) + (study_plan.target_rw_score ?? 0);
  const improvement = targetTotal - currentTotal;

  // Create SAT-focused card data with beautiful colors
  // Total scores are in positions 3 & 4 to make them the biggest cards
  const satCardData = [
    {
      color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", // Purple-blue gradient for current math
      title: study_plan.current_math_score?.toString() || "0",
      description: "Current Math Score",
      label: "Math",
    },
    {
      color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", // Pink-red gradient for target math
      title: study_plan.target_math_score?.toString() || "800",
      description: "Target Math Score",
      label: "Target",
    },
    {
      color: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)", // Mint-pink gradient for current total (BIG CARD)
      title: currentTotal.toString(),
      description: `Current Total Score • ${improvement > 0 ? `+${improvement} to go` : "Target reached!"
        }`,
      label: "Current Total",
    },
    {
      color: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", // Pink-yellow gradient for target total (BIG CARD)
      title: targetTotal.toString(),
      description: "Total Target Score",
      label: "Target",
    },
    {
      color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", // Blue-cyan gradient for current R/W
      title: study_plan.current_rw_score?.toString() || "0",
      description: "Current English R/W Score",
      label: "English R/W",
    },
    {
      color: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", // Green-teal gradient for target R/W
      title: study_plan.target_rw_score?.toString() || "800",
      description: "Target English R/W Score",
      label: "Target",
    },
  ];

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 w-fit">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                Track Your Progress
              </span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
              Progress Dashboard
            </h1>
            <p className="text-lg text-muted-foreground">
              Monitor your {courseName} preparation journey and track your improvement
            </p>
          </div>
        </div>

        {/* Dream Score Tracker & Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Dream Score Card - Main Feature */}
          <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-[#866ffe]/10 via-card to-card border border-border/60 rounded-3xl p-8 shadow-sm">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div>
                  {/* <Badge
                    variant="outline"
                    className="mb-3 bg-primary/10 border-primary/30 text-primary font-medium"
                  >
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Your Journey
                  </Badge> */}
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    Dream Score Target
                  </h2>
                  <p className="text-muted-foreground">
                    Keep pushing toward your goal!
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Days Until Goal
                  </div>
                  <div className="text-3xl font-bold text-primary font-mono tabular-nums">
                    {study_plan.test_date
                      ? Math.max(
                        0,
                        Math.ceil(
                          (new Date(study_plan.test_date).getTime() -
                            Date.now()) /
                          (1000 * 60 * 60 * 24)
                        )
                      )
                      : "—"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                {/* Current Score */}
                <div className="text-center p-4 bg-background/50 rounded-2xl border border-border/40">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Current
                  </div>
                  <div className="text-4xl font-bold text-foreground font-mono tabular-nums">
                    {currentTotal}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    combined score
                  </div>
                </div>

                {/* Progress Ring */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-24 h-24">
                    <svg
                      className="w-24 h-24 transform -rotate-90"
                      viewBox="0 0 100 100"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-muted/20"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="url(#progressGradient)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(currentTotal / targetTotal) * 251.2
                          } 251.2`}
                        className="transition-all duration-1000 ease-out"
                      />
                      <defs>
                        <linearGradient
                          id="progressGradient"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="0%"
                        >
                          <stop offset="0%" stopColor="#866ffe" />
                          <stop offset="100%" stopColor="#a78bfa" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-foreground">
                        {Math.round((currentTotal / targetTotal) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    of target
                  </div>
                </div>

                {/* Target Score */}
                <div className="text-center p-4 bg-primary/5 rounded-2xl border border-primary/20">
                  <div className="text-sm font-medium text-primary mb-2">
                    Target
                  </div>
                  <div className="text-4xl font-bold text-primary font-mono tabular-nums">
                    {targetTotal}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    dream score
                  </div>
                </div>
              </div>

              {/* Improvement Needed */}
              <div className="mt-6 flex items-center justify-center gap-2 py-3 px-4 bg-background/50 rounded-xl border border-border/40">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-muted-foreground">
                  {improvement > 0
                    ? `${improvement} points to reach your dream score`
                    : "🎉 Congratulations! You've reached your target!"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Column */}
          <div className="space-y-4">
            {/* Study Streak */}
            <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl backdrop-blur-sm border border-orange-500/20">
                    <svg
                      className="w-5 h-5 text-orange-500"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Current Streak
                    </div>
                    <div className="text-2xl font-bold text-foreground font-mono">
                      {profileData?.streak?.current_streak || 0}{" "}
                      <span className="text-sm font-normal text-orange-500">
                        days 🔥
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  Keep it up! Practice daily to maintain momentum.
                </div>
              </div>
            </div>

            {/* Questions Answered */}
            <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-xl backdrop-blur-sm border border-emerald-500/20">
                    <svg
                      className="w-5 h-5 text-emerald-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Questions Solved
                    </div>
                    <div className="text-2xl font-bold text-foreground font-mono">
                      {profileData?.stats?.total_questions_answered || 0}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  {profileData?.stats?.total_questions_answered
                    ? `${profileData.stats.total_questions_answered} total questions answered`
                    : "Start practicing to see your progress!"}
                </div>
              </div>
            </div>

            {/* Accuracy */}
            <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl backdrop-blur-sm border border-blue-500/20">
                    <svg
                      className="w-5 h-5 text-blue-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Accuracy Rate
                    </div>
                    <div className="text-2xl font-bold text-foreground font-mono">
                      {profileData?.stats?.accuracy_percentage
                        ? `${Math.round(
                          profileData.stats.accuracy_percentage
                        )}%`
                        : "0%"}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  {profileData?.stats?.total_questions_answered
                    ? `${profileData.stats.total_correct_answers || 0
                    } correct out of ${profileData.stats.total_questions_answered
                    } answered`
                    : "Answer questions to see your accuracy!"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Insights & Score Projection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* AI Insights Panel - Glassmorphism Style */}
          <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            {/* Background gradient effect */}
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-primary/10 to-transparent opacity-50" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-primary/15 rounded-xl backdrop-blur-sm border border-primary/20">
                  <svg
                    className="w-5 h-5 text-primary"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    AI Insights
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Personalized learning analysis
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Strength */}
                <div className="p-4 bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl hover:bg-card/90 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full shadow-sm shadow-emerald-500/50" />
                    <span className="text-sm font-semibold text-foreground">
                      Your Strengths
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {strengths.length > 0 ? (
                      <>
                        You excel at{" "}
                        <span className="font-medium text-primary">{strengths[0].name}</span>
                        {strengths[1] && (
                          <>
                            {" "}and{" "}
                            <span className="font-medium text-primary">{strengths[1].name}</span>
                          </>
                        )}
                        . Keep leveraging these skills!
                      </>
                    ) : (
                      "Complete more practice sessions to discover your strengths!"
                    )}
                  </p>
                </div>

                {/* Focus Area */}
                <div className="p-4 bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl hover:bg-card/90 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full shadow-sm shadow-amber-500/50" />
                    <span className="text-sm font-semibold text-foreground">
                      Focus Areas
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {weaknesses.length > 0 ? (
                      <>
                        Consider spending more time on{" "}
                        <span className="font-medium text-primary">{weaknesses[0].name}</span>
                        {weaknesses[1] && (
                          <>
                            {" "}and{" "}
                            <span className="font-medium text-primary">{weaknesses[1].name}</span>
                          </>
                        )}
                        .
                      </>
                    ) : (
                      "Practice more topics to identify areas for improvement."
                    )}
                  </p>
                </div>

                {/* Quick Tip */}
                <div className="p-4 bg-gradient-to-br from-primary/10 to-card/80 backdrop-blur-sm border border-primary/30 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 bg-gradient-to-r from-primary to-violet-500 rounded-full shadow-sm shadow-primary/50" />
                    <span className="text-sm font-semibold text-primary">
                      Pro Tip
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {weaknesses.length > 0
                      ? `Focus on ${weaknesses[0].name} during your next drill session to see the biggest score improvement.`
                      : "Students who practice for 30+ minutes daily see 50% faster improvement. Try setting a daily goal!"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Score Projection Card */}
          <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/15 rounded-xl backdrop-blur-sm border border-blue-500/20">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      Score Projection
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Your predicted trajectory
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                >
                  On Track ✓
                </Badge>
              </div>

              {/* Visual Score Gauges */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Math Score Gauge */}
                <div className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl p-4 text-center">
                  <div className="relative w-20 h-20 mx-auto mb-3">
                    <svg
                      className="w-20 h-20 transform -rotate-90"
                      viewBox="0 0 100 100"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-muted/20"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="url(#mathGradient)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${((study_plan.current_math_score || 0) /
                            (study_plan.target_math_score || 800)) *
                          251.2
                          } 251.2`}
                        className="transition-all duration-1000 ease-out"
                      />
                      <defs>
                        <linearGradient
                          id="mathGradient"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="0%"
                        >
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#34d399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold text-foreground font-mono">
                        {study_plan.current_math_score || 0}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Math
                  </div>
                  <div className="flex items-center justify-center gap-1 text-emerald-500 text-xs font-medium">
                    <TrendingUp className="w-3 h-3" />
                    <span>
                      +
                      {Math.min(
                        45,
                        (study_plan.target_math_score || 800) -
                        (study_plan.current_math_score || 0)
                      )}{" "}
                      projected
                    </span>
                  </div>
                </div>

                {/* R/W Score Gauge */}
                <div className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl p-4 text-center">
                  <div className="relative w-20 h-20 mx-auto mb-3">
                    <svg
                      className="w-20 h-20 transform -rotate-90"
                      viewBox="0 0 100 100"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-muted/20"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="url(#rwGradient)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${((study_plan.current_rw_score || 0) /
                            (study_plan.target_rw_score || 800)) *
                          251.2
                          } 251.2`}
                        className="transition-all duration-1000 ease-out"
                      />
                      <defs>
                        <linearGradient
                          id="rwGradient"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="0%"
                        >
                          <stop offset="0%" stopColor="#866ffe" />
                          <stop offset="100%" stopColor="#a78bfa" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold text-foreground font-mono">
                        {study_plan.current_rw_score || 0}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Reading & Writing
                  </div>
                  <div className="flex items-center justify-center gap-1 text-primary text-xs font-medium">
                    <TrendingUp className="w-3 h-3" />
                    <span>
                      +
                      {Math.min(
                        35,
                        (study_plan.target_rw_score || 800) -
                        (study_plan.current_rw_score || 0)
                      )}{" "}
                      projected
                    </span>
                  </div>
                </div>
              </div>

              {/* Mini Trajectory Chart */}
              <div className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Score Trajectory
                  </span>
                  <span className="text-xs text-emerald-500 font-medium">
                    ↑ Improving
                  </span>
                </div>
                {/* Mini sparkline chart */}
                <div className="h-16 flex items-end gap-1">
                  {(trajectoryBars.length > 0 ? trajectoryBars : [0.3]).map((value: number, i: number) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-primary/80 to-primary/40 rounded-t transition-all duration-500"
                      style={{
                        height: `${Math.max(value * 100, 5)}%`,
                        opacity: 0.4 + (i / Math.max(trajectoryBars.length, 1)) * 0.6,
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                  <span>{growthData.length > 0 ? "Start" : "No data yet"}</span>
                  {growthData.length > 0 && <span>Now</span>}
                  {growthData.length > 0 && <span>Test Day</span>}
                </div>
              </div>

              {/* Projected Total */}
              <div className="p-4 bg-gradient-to-br from-primary/10 to-blue-500/5 backdrop-blur-sm border border-primary/30 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Projected Score by Test Day
                    </div>
                    <div className="text-3xl font-bold text-primary font-mono tabular-nums">
                      {projectedImprovement > 0
                        ? Math.min(currentTotal + projectedImprovement, targetTotal)
                        : currentTotal}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground mb-1">
                      {projectedImprovement > 0 ? "Projected gain" : "Points to gain"}
                    </div>
                    <div className="text-xl font-bold text-emerald-500 font-mono">
                      {projectedImprovement > 0
                        ? `+${Math.min(projectedImprovement, targetTotal - currentTotal)}`
                        : `+${targetTotal - currentTotal}`}
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-primary/20">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.min(
                            (currentTotal / targetTotal) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {Math.round((currentTotal / targetTotal) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <Button
            variant="outline"
            className="h-auto py-5 px-6 justify-start gap-4 bg-card hover:bg-accent hover:border-primary/50 rounded-2xl border-border/60 transition-all duration-300 hover:scale-[1.02] group"
            onClick={() => router.push("/dashboard/revision")}
          >
            <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
              <svg
                className="w-6 h-6 text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-semibold text-foreground">
                Review Mistakes
              </div>
              <div className="text-xs text-muted-foreground">
                Practice your weak areas
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-5 px-6 justify-start gap-4 bg-card hover:bg-accent hover:border-primary/50 rounded-2xl border-border/60 transition-all duration-300 hover:scale-[1.02] group"
            onClick={() => router.push("/dashboard/drill")}
          >
            <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
              <svg
                className="w-6 h-6 text-emerald-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-semibold text-foreground">Quick Drill</div>
              <div className="text-xs text-muted-foreground">
                5-minute practice sessions
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-5 px-6 justify-start gap-4 bg-card hover:bg-accent hover:border-primary/50 rounded-2xl border-border/60 transition-all duration-300 hover:scale-[1.02] group"
            onClick={() => router.push("/dashboard/mock-exam")}
          >
            <div className="p-3 bg-amber-500/10 rounded-xl group-hover:bg-amber-500/20 transition-colors">
              <Calendar className="w-6 h-6 text-amber-500" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-foreground">
                Take Mock Exam
              </div>
              <div className="text-xs text-muted-foreground">
                Full practice test
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-5 px-6 justify-start gap-4 bg-card hover:bg-accent hover:border-primary/50 rounded-2xl border-border/60 transition-all duration-300 hover:scale-[1.02] group"
            onClick={() => router.push("/diagnostic-test")}
          >
            <div className="p-3 bg-violet-500/10 rounded-xl group-hover:bg-violet-500/20 transition-colors">
              <ClipboardList className="w-6 h-6 text-violet-500" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-foreground">
                Diagnostic Test
              </div>
              <div className="text-xs text-muted-foreground">
                Calibrate your skill levels
              </div>
            </div>
          </Button>
        </div>

        {/* Skill Mastery Heatmap */}
        {/* <div className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Skill Mastery
          </h2>
          {heatmapQuery.isLoading ? (
            <div className="space-y-8">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-card rounded-3xl p-8 border border-border shadow-sm"
                >
                  <Skeleton className="h-8 w-48 mb-6" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <Skeleton key={j} className="aspect-square rounded-2xl" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            Object.keys(heatmap).length > 0 && (
              <div className="space-y-8">
                {Object.entries(heatmap).map(([categoryName, category]) => (
                  <div key={categoryName} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-foreground">
                        {categoryName}
                      </h3>
                      <Badge
                        variant="secondary"
                        className="text-muted-foreground bg-muted font-medium"
                      >
                        {category.section === "math"
                          ? "Math"
                          : "Reading & Writing"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {category.skills.map((skill) => (
                        <div
                          key={skill.skill_id}
                          className="bg-card rounded-2xl p-1 border border-border shadow-sm hover:shadow-md transition-all duration-300"
                        >
                          <SkillRadialChart
                            skillName={skill.skill_name}
                            mastery={skill.mastery}
                            correctAttempts={skill.correct_attempts}
                            totalAttempts={skill.total_attempts}
                            velocity={skill.velocity}
                            plateau={skill.plateau}
                            skillId={skill.skill_id}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div> */}

        {/* SAT Score Overview */}
        {/* <div className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            {courseName} Score Overview
          </h2>
          <MagicBento
            textAutoHide={true}
            enableStars={true}
            enableSpotlight={true}
            enableBorderGlow={true}
            enableTilt={true}
            enableMagnetism={true}
            clickEffect={true}
            spotlightRadius={120}
            particleCount={25}
            glowColor="132, 0, 255"
            cardData={satCardData}
          />
        </div> */}

        {/* Charts Section */}
        {chartsLoading ? (
          <div className="space-y-16">
            <Skeleton className="h-96 w-full rounded-3xl" />
            <Skeleton className="h-96 w-full rounded-3xl" />
            <Skeleton className="h-80 w-full rounded-3xl" />
          </div>
        ) : (
          <>
            {/* SAT Score Progress */}
            {growthData.length > 0 && (
              <div className="mb-16">
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  {courseName} Score Progress
                </h2>
                <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
                  <LineChart
                    data={growthData.map((point) => ({
                      ...point,
                      date: new Date(point.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      }),
                      total:
                        (point.predicted_sat_math || 0) +
                        (point.predicted_sat_rw || 0),
                    }))}
                    lines={[
                      {
                        dataKey: "predicted_sat_math",
                        color: "#10b981",
                        name: "Math Score",
                      },
                      {
                        dataKey: "predicted_sat_rw",
                        color: "#8b5cf6",
                        name: "R/W Score",
                      },
                      {
                        dataKey: "total",
                        color: "#3b82f6",
                        name: "Total Score",
                      },
                    ]}
                    xKey="date"
                    height={350}
                    yLabel={courseName + " Score"}
                  />
                </div>
              </div>
            )}

            {/* Mastery Progress by Category */}
            {Object.keys(heatmap).length > 0 && (
              <div className="mb-16">
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  Mastery by Category
                </h2>
                <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
                  <RadarChart
                    data={(() => {
                      const categoryData = Object.entries(heatmap).map(
                        ([name, cat]) => ({
                          category: name,
                          mastery:
                            (cat.skills.reduce((sum, s) => sum + s.mastery, 0) /
                              cat.skills.length) *
                            100,
                          section: cat.section,
                          totalAttempts: cat.skills.reduce(
                            (sum, s) => sum + s.total_attempts,
                            0
                          ),
                        })
                      );

                      // Sort by total attempts and take top 8, or all if fewer than 8
                      const sortedData = categoryData.sort(
                        (a, b) => b.totalAttempts - a.totalAttempts
                      );
                      return sortedData.slice(0, 8);
                    })()}
                    dataKey="mastery"
                    categoryKey="category"
                    name="Mastery %"
                    height={350}
                    formatTooltip={(val) => `${Number(val).toFixed(1)}%`}
                  />
                  <div className="mt-6 pt-4 border-t border-border">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">Average Mastery:</span>
                      <span className="font-bold text-primary">
                        {(() => {
                          const categoryData = Object.entries(heatmap).map(
                            ([name, cat]) =>
                              (cat.skills.reduce(
                                (sum, s) => sum + s.mastery,
                                0
                              ) /
                                cat.skills.length) *
                              100
                          );
                          return `${(
                            categoryData.reduce((sum, val) => sum + val, 0) /
                            categoryData.length
                          ).toFixed(1)}%`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mock Exam Progress */}
            <MockExamPerformance
              data={mockExamData}
              isLoading={mockExamLoading}
              isError={mockExamError}
            />

            {/* Mastery Over Time */}
            {growthData.length > 0 &&
              growthData.some((d) => d.mastery !== undefined) && (
                <div className="mb-16">
                  <h2 className="text-2xl font-bold text-foreground mb-6">
                    Average Mastery Over Time
                  </h2>
                  <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
                    <AreaChart
                      data={growthData
                        .filter((d) => d.mastery !== undefined)
                        .map((point) => ({
                          ...point,
                          date: new Date(point.date).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                            }
                          ),
                          mastery: (point.mastery || 0) * 100,
                        }))}
                      areas={[
                        {
                          dataKey: "mastery",
                          color: "#8b5cf6",
                          name: "Mastery %",
                        },
                      ]}
                      xKey="date"
                      height={300}
                      yLabel="Mastery %"
                      formatYAxis={(val) => `${val}%`}
                    />
                  </div>
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ProgressPage() {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <ProgressContent />
        <OnboardingModal pageId="progress" steps={ONBOARDING_CONTENT.progress} />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}
