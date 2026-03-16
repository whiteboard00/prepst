"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MessageCircle, Sparkles } from "lucide-react";
import { useStudyPlan } from "@/hooks/queries";
import { TestDateCountdown } from "@/components/my-sat/TestDateCountdown";
import { ScoreCalculator } from "@/components/my-sat/ScoreCalculator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { ONBOARDING_CONTENT } from "@/lib/onboardingContent";
import { useCourseConfigSafe } from "@/contexts/CourseContext";

function MySATContent() {
  const router = useRouter();
  const { data: studyPlan, isLoading } = useStudyPlan();
  const { course } = useCourseConfigSafe();
  const courseName = course?.name ?? "SAT";

  const testDate = studyPlan?.study_plan?.test_date
    ? new Date(studyPlan.study_plan.test_date)
    : null;

  const handleEditDate = () => {
    // Navigate to onboarding to update test date
    router.push("/onboard");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="flex justify-center">
        <div className="w-full max-w-6xl px-6 py-12 space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 w-fit">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                  My {courseName}
                </span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                My {courseName} Dashboard
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Your personalized {courseName} preparation hub with tools to practice,
                calculate scores, and track your progress.
              </p>
              <Button asChild className="w-fit">
                <a
                  href="https://discord.gg/A6xqzcvjvZ"
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Join Discord
                </a>
              </Button>
            </div>
          </div>

          {/* Countdown + Score Calculator Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Test Date Countdown - smaller */}
            <div className="lg:col-span-1">
              {isLoading ? (
                <Skeleton className="h-[400px] rounded-2xl" />
              ) : (
                <TestDateCountdown
                  testDate={testDate}
                  onEditClick={handleEditDate}
                />
              )}
            </div>

            {/* Score Calculator - larger */}
            <div className="lg:col-span-2">
              <ScoreCalculator />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MySATPage() {
  return (
    <ProtectedRoute>
      <MySATContent />
      <OnboardingModal pageId="my-sat" steps={ONBOARDING_CONTENT["my-sat"]} />
    </ProtectedRoute>
  );
}
