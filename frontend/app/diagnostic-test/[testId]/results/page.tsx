"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageLoader } from "@/components/ui/page-loader";
import { supabase } from "@/lib/supabase";
import { config } from "@/lib/config";
import {
  AlertCircle,
  TrendingUp,
  Trophy,
  Target,
  BrainCircuit,
  BookOpen,
  ArrowRight,
  Sparkles,
  Zap,
  BarChart3,
} from "lucide-react";
import { components } from "@/lib/types/api.generated";
import { useCourseConfig } from "@/contexts/CourseContext";

type DiagnosticResults =
  components["schemas"]["DiagnosticTestResultsResponse"];


function ResultsContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sectionName } = useCourseConfig();
  const testId = params.testId as string;
  const returnToOnboarding = searchParams.get("returnToOnboarding") === "true";

  const [results, setResults] = useState<DiagnosticResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animatedScores, setAnimatedScores] = useState({
    overall: 0,
    math: 0,
    rw: 0,
  });

  useEffect(() => {
    const loadResults = async () => {
      try {
        setIsLoading(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Not authenticated");

        const response = await fetch(
          `${config.apiUrl}/api/diagnostic-test/${testId}/results`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) throw new Error("Failed to load results");

        const data = await response.json();
        setResults(data);

        // Animate scores after loading
        setTimeout(() => {
          setAnimatedScores({
            overall: data.overall_percentage,
            math: data.math_percentage,
            rw: data.rw_percentage,
          });
        }, 300);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load results"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadResults();
  }, [testId]);

  if (isLoading) {
    return <PageLoader message="Analyzing your performance..." />;
  }

  if (error || !results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center bg-card border border-border p-8 rounded-3xl shadow-lg max-w-md w-full">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-foreground">
            Unable to Load Results
          </h2>
          <p className="text-muted-foreground mb-6">
            {error || "Results could not be found."}
          </p>
          <Button
            onClick={() => router.push("/dashboard")}
            size="lg"
            variant="default"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const {
    test,
    total_correct,
    total_questions,
    overall_percentage,
    math_correct,
    math_total,
    math_percentage,
    rw_correct,
    rw_total,
    rw_percentage,
    topic_mastery_initialized,
  } = results;

  // Calculate topic counts by mastery level
  const strongTopics = topic_mastery_initialized.filter(
    (t) => t.initial_mastery >= 0.7
  );
  const developingTopics = topic_mastery_initialized.filter(
    (t) => t.initial_mastery >= 0.4 && t.initial_mastery < 0.7
  );
  const focusTopics = topic_mastery_initialized.filter(
    (t) => t.initial_mastery < 0.4
  );

  // Determine stronger section
  const strongerSection =
    math_percentage > rw_percentage
      ? { name: sectionName("math"), percentage: math_percentage, icon: BrainCircuit }
      : { name: sectionName("reading_writing"), percentage: rw_percentage, icon: BookOpen };

  const weakerSection =
    math_percentage <= rw_percentage
      ? { name: sectionName("math"), percentage: math_percentage, icon: BrainCircuit }
      : { name: sectionName("reading_writing"), percentage: rw_percentage, icon: BookOpen };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Diagnostic Complete
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
            Your Results Are In
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We&apos;ve analyzed your performance across {total_questions} questions
            to create your personalized study plan.
          </p>
          <p className="text-sm text-muted-foreground">
            Completed on{" "}
            {test.completed_at
              ? new Date(test.completed_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "N/A"}
          </p>
        </div>

        {/* Success Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-3xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-700 delay-150">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-5">
            <div className="p-4 bg-emerald-500/20 rounded-2xl shrink-0">
              <Trophy className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                Baseline Established
              </h3>
              <p className="text-emerald-600/80 dark:text-emerald-400/80 leading-relaxed max-w-3xl">
                Your diagnostic has revealed key insights about your strengths
                and opportunities. We&apos;ve identified{" "}
                {focusTopics.length > 0
                  ? `${focusTopics.length} priority topic${focusTopics.length > 1 ? "s" : ""}`
                  : "areas"}{" "}
                to focus on and {strongTopics.length} strength
                {strongTopics.length !== 1 ? "s" : ""} to leverage.
              </p>
            </div>
          </div>
        </div>

        {/* Score Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Overall Score */}
          <div className="group relative bg-card border border-border rounded-3xl p-8 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Target className="w-24 h-24 text-primary" />
            </div>
            <div className="relative">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Overall Score
              </p>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-5xl font-black tabular-nums text-foreground">
                  {total_correct}
                </span>
                <span className="text-xl text-muted-font-medium">
                  / {total_questions}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${animatedScores.overall}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-primary tabular-nums">
                  {animatedScores.overall.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Math Score */}
          <div className="group relative bg-card border border-blue-500/20 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <BrainCircuit className="w-24 h-24 text-blue-500" />
            </div>
            <div className="relative">
              <p className="text-sm font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wider mb-3">
                {sectionName("math")} Section
              </p>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-5xl font-black tabular-nums text-blue-600 dark:text-blue-400">
                  {math_correct}
                </span>
                <span className="text-xl text-muted-foreground">
                  / {math_total}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out delay-300"
                    style={{ width: `${animatedScores.math}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                  {animatedScores.math.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* RW Score */}
          <div className="group relative bg-card border border-emerald-500/20 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <BookOpen className="w-24 h-24 text-emerald-500" />
            </div>
            <div className="relative">
              <p className="text-sm font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider mb-3">
                {sectionName("reading_writing")}
              </p>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-5xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                  {rw_correct}
                </span>
                <span className="text-xl text-muted-foreground">
                  / {rw_total}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out delay-500"
                    style={{ width: `${animatedScores.rw}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {animatedScores.rw.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Visual Comparison */}
          <div className="bg-card border border-border rounded-3xl p-8 shadow-sm animate-in fade-in slide-in-from-bottom-6 duration-700 delay-500">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-violet-500/10 rounded-xl">
                <BarChart3 className="w-6 h-6 text-violet-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Section Comparison
                </h2>
                <p className="text-sm text-muted-foreground">
                  How your sections compare
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Math Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-foreground">{sectionName("math")}</span>
                  </div>
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    {math_percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="h-4 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${math_percentage}%` }}
                  />
                </div>
              </div>

              {/* RW Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium text-foreground">
                      {sectionName("reading_writing")}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    {rw_percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="h-4 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out delay-200"
                    style={{ width: `${rw_percentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Insight */}
            <div className="mt-6 p-4 bg-muted/50 rounded-2xl">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">
                    {strongerSection.name} is your stronger section
                  </span>{" "}
                  at {strongerSection.percentage.toFixed(0)}%. Focus extra
                  attention on {weakerSection.name} to maximize your overall
                  score improvement.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-card border border-border rounded-3xl p-8 shadow-sm animate-in fade-in slide-in-from-bottom-6 duration-700 delay-600">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <TrendingUp className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Performance Summary
                </h2>
                <p className="text-sm text-muted-foreground">
                  Key metrics from your diagnostic
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-1 tabular-nums">
                  {strongTopics.length}
                </p>
                <p className="text-sm text-muted-foreground">Strong Topics</p>
              </div>
              <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mb-1 tabular-nums">
                  {developingTopics.length}
                </p>
                <p className="text-sm text-muted-foreground">
                  Developing Areas
                </p>
              </div>
              <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                <p className="text-3xl font-black text-rose-600 dark:text-rose-400 mb-1 tabular-nums">
                  {focusTopics.length}
                </p>
                <p className="text-sm text-muted-foreground">Focus Areas</p>
              </div>
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                <p className="text-3xl font-black text-primary mb-1 tabular-nums">
                  {topic_mastery_initialized.length}
                </p>
                <p className="text-sm text-muted-foreground">Topics Assessed</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-transparent border border-primary/20 rounded-3xl p-8 md:p-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-800">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  Ready to begin?
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Start Your Personalized Journey
              </h2>
              <p className="text-muted-foreground max-w-xl">
                Your diagnostic results have been saved. Continue to generate
                your custom study plan tailored to your specific needs and
                goals.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3 shrink-0">
              <Button
                onClick={() => router.push("/dashboard")}
                variant="outline"
                size="lg"
                className="h-14 px-8 rounded-xl"
              >
                Dashboard
              </Button>
              <Button
                onClick={() => {
                  if (returnToOnboarding) {
                    router.push("/onboard?returnFromDiagnostic=true");
                  } else {
                    router.push("/onboard");
                  }
                }}
                size="lg"
                className="h-14 px-8 rounded-xl font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-300 group"
              >
                {returnToOnboarding ? "Continue Onboarding" : "Create Study Plan"}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DiagnosticTestResultsPage() {
  return (
    <ProtectedRoute>
      <ResultsContent />
    </ProtectedRoute>
  );
}
