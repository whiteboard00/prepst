"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useStudyPlan } from "@/hooks/queries";
import { useMockExams } from "@/hooks/queries/useMockExams";
import { getSessionStatus } from "@/lib/utils/session-utils";
import type { PracticeSession } from "@/lib/types";
import { useDeleteStudyPlan } from "@/hooks/mutations";
import { isSameWeek } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Zap, List, Grid3X3 } from "lucide-react";
import { TodoSession } from "@/components/study-plan/types";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedbackButton } from "@/components/FeedbackButton";
import { useCourseConfigSafe } from "@/contexts/CourseContext";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { ONBOARDING_CONTENT } from "@/lib/onboardingContent";
import { StudyPlanStats } from "@/components/study-plan/StudyPlanStats";
import { SessionTableView } from "@/components/study-plan/SessionTableView";
import { SessionGridView } from "@/components/study-plan/SessionGridView";

// Convert PracticeSession to TodoSession
function convertToTodoSessions(
  sessions: PracticeSession[],
  mockExams: any[] = []
): { practiceSessions: TodoSession[]; mockSessions: TodoSession[] } {
  // Convert practice sessions
  const practiceSessions: TodoSession[] = sessions.map((session) => {
    const status = getSessionStatus(session);
    let priority: "important" | "new-product" | "delayed" | undefined;
    if (status === "overdue") {
      priority = "important";
    } else if (status === "in-progress") {
      priority = "delayed";
    }
    return { ...session, priority };
  });

  // Convert mock exams
  const now = new Date();
  const thisWeekMockExams = mockExams.filter((exam) => {
    const examDate = exam.started_at
      ? new Date(exam.started_at)
      : new Date(exam.created_at);
    return isSameWeek(examDate, now);
  });

  const mockSessions: TodoSession[] = thisWeekMockExams.map((exam) => ({
    id: exam.id,
    study_plan_id: sessions[0]?.study_plan_id || "mock",
    scheduled_date: exam.created_at,
    session_number: 0,
    status:
      exam.status === "completed"
        ? "completed"
        : exam.status === "in_progress"
          ? "in-progress"
          : "upcoming",
    started_at: exam.started_at,
    completed_at: exam.completed_at,
    created_at: exam.created_at,
    updated_at: exam.updated_at,
    topics: [],
    total_questions: exam.total_questions || 98,
    completed_questions: exam.completed_questions || 0,
    score: exam.total_score,
    examType: "mock-exam",
  }));

  return { practiceSessions, mockSessions };
}

function StudyPlanContent() {
  const router = useRouter();
  const { course } = useCourseConfigSafe();
  const { data: studyPlan, isLoading, error, refetch } = useStudyPlan();
  const { data: mockExamsData } = useMockExams();

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const deleteStudyPlanMutation = useDeleteStudyPlan();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [activeFilter, setActiveFilter] = useState<"all" | "completed">("all");

  // Convert sessions to TodoSessions
  const { allSessions, practiceSessions, mockSessions } = useMemo(() => {
    if (!studyPlan?.study_plan?.sessions) {
      return { allSessions: [], practiceSessions: [], mockSessions: [] };
    }
    const { practiceSessions, mockSessions } = convertToTodoSessions(
      studyPlan.study_plan.sessions,
      mockExamsData?.exams
    );
    return {
      allSessions: [...practiceSessions, ...mockSessions],
      practiceSessions,
      mockSessions,
    };
  }, [studyPlan?.study_plan?.sessions, mockExamsData?.exams]);

  // Filter sessions based on activeFilter
  const filteredSessions = useMemo(() => {
    if (activeFilter === "completed") {
      return {
        practice: practiceSessions.filter(
          (s) => getSessionStatus(s) === "completed"
        ),
        mock: mockSessions.filter((s) => getSessionStatus(s) === "completed"),
      };
    }
    return { practice: practiceSessions, mock: mockSessions };
  }, [practiceSessions, mockSessions, activeFilter]);

  const handleToggleTodo = (todoId: string) => {
    // Find the session and navigate to it
    const session = [...practiceSessions, ...mockSessions].find(
      (s) => s.id === todoId
    );
    if (!session) return;

    const status = getSessionStatus(session);
    const isMockTest =
      session.examType === "mock-exam" ||
      session.id === "mock-test" ||
      session.id === "mock-test-2";

    if (isMockTest) {
      if (status === "completed") {
        router.push(`/mock-exam/${todoId}/results`);
      } else {
        router.push(
          todoId !== "mock-test" && todoId !== "mock-test-2"
            ? `/mock-exam/${todoId}`
            : "/mock-exam"
        );
      }
    } else {
      router.push(
        status === "completed"
          ? `/practice/${todoId}/summary`
          : `/practice/${todoId}`
      );
    }
  };

  const handleDeletePlan = async () => {
    setIsDeleting(true);
    deleteStudyPlanMutation.mutate(undefined, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        setIsDeleting(false);
        refetch();
      },
      onError: (err) => {
        alert(
          err instanceof Error ? err.message : "Failed to delete study plan"
        );
        setIsDeleting(false);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-8 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Header Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-10 w-48 rounded-xl" />
            <Skeleton className="h-5 w-80 rounded-lg" />
          </div>

          {/* Stats Skeleton */}
          <Skeleton className="h-32 w-full rounded-2xl" />

          {/* View Toggle Skeleton */}
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>

          {/* Content Skeleton */}
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !studyPlan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-2xl text-center">
          <div className="bg-card border border-border rounded-3xl p-12 shadow-xl">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-primary/10 rounded-3xl mb-8">
              <Zap className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground mb-4">
              No Study Plan Yet
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
              Create a personalized study plan tailored to your {course?.name ?? "SAT"} goals and
              timeline to start your journey.
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

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-3">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                Personalized Learning
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {course?.name ?? "SAT"} Study Plan
            </h1>
            <p className="text-muted-foreground mt-1">
              {study_plan.sessions.length} sessions •{" "}
              {study_plan.sessions.filter((s) => getSessionStatus(s) === "completed").length} completed
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Buttons */}
            <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/50">
              <Button
                variant={activeFilter === "all" ? "default" : "ghost"}
                size="sm"
                className="rounded-md h-8"
                onClick={() => setActiveFilter("all")}
              >
                All
              </Button>
              <Button
                variant={activeFilter === "completed" ? "default" : "ghost"}
                size="sm"
                className="rounded-md h-8"
                onClick={() => setActiveFilter("completed")}
              >
                Completed
              </Button>
            </div>

            <div className="h-6 w-px bg-border hidden sm:block" />

            {/* View Toggle */}
            <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/50">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="rounded-md h-8 gap-2"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">List</span>
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className="rounded-md h-8 gap-2"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="w-4 h-4" />
                <span className="hidden sm:inline">Grid</span>
              </Button>
            </div>

            <div className="h-6 w-px bg-border hidden sm:block" />

            {/* Actions */}
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg h-8"
              onClick={() => router.push("/onboard")}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Plan
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Compact Stats Dashboard */}
        <StudyPlanStats sessions={allSessions} />

        {/* Content */}
        {study_plan.sessions.length === 0 ? (
          <div className="bg-card border-2 border-dashed border-border rounded-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-2xl mb-6">
              <span className="text-4xl">📚</span>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              No Practice Sessions
            </h3>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
              Your plan is empty. Create a new study plan to generate your
              personalized schedule.
            </p>
            <Button
              onClick={() => router.push("/onboard")}
              size="lg"
              className="rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Study Plan
            </Button>
          </div>
        ) : viewMode === "list" ? (
          // List/Table View
          <SessionTableView
            sessions={filteredSessions.practice}
            mockExams={filteredSessions.mock}
          />
        ) : (
          // Grid View
          <SessionGridView
            sessions={filteredSessions.practice}
            mockExams={filteredSessions.mock}
            onToggleTodo={handleToggleTodo}
          />
        )}
      </div>

      <FeedbackButton />
      <OnboardingModal
        pageId="study-plan"
        steps={ONBOARDING_CONTENT["study-plan"]}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Delete Study Plan?
            </DialogTitle>
            <DialogDescription className="text-sm pt-2">
              This will permanently delete your study plan and all{" "}
              <span className="font-semibold text-foreground">
                {study_plan.sessions.length} practice sessions
              </span>
              . This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="rounded-lg"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePlan}
              disabled={isDeleting}
              className="rounded-lg"
            >
              {isDeleting ? "Deleting..." : "Delete Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StudyPlanPage() {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <StudyPlanContent />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}
