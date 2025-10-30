"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useStudyPlan } from "@/hooks/queries";
import { getSessionStatus } from "@/lib/utils/session-utils";
import type { PracticeSession } from "@/lib/types";
import { useDeleteStudyPlan } from "@/hooks/mutations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import {
  TodoSection as TodoSectionType,
  TodoSession,
} from "@/components/study-plan/types";
import { TodoSection } from "@/components/study-plan/todo-section";
import { Skeleton } from "@/components/ui/skeleton";

// Helper function to sort sessions within a section
function sortSessionsInSection(sessions: TodoSession[]): TodoSession[] {
  return sessions.sort((a, b) => {
    const statusA = getSessionStatus(a);
    const statusB = getSessionStatus(b);

    // In-progress sessions go to top
    if (statusA === "in-progress" && statusB !== "in-progress") return -1;
    if (statusB === "in-progress" && statusA !== "in-progress") return 1;

    // Completed sessions go to bottom
    if (statusA === "completed" && statusB !== "completed") return 1;
    if (statusB === "completed" && statusA !== "completed") return -1;

    // Otherwise maintain date order
    const dateA = new Date(a.scheduled_date || 0).getTime();
    const dateB = new Date(b.scheduled_date || 0).getTime();
    return dateA - dateB;
  });
}

// Helper function to categorize sessions into sections
function categorizeSessions(sessions: PracticeSession[]): TodoSectionType[] {
  // Convert all sessions to TodoSession with priority
  const allSessions: TodoSession[] = sessions.map((session) => {
    const status = getSessionStatus(session);

    // Determine priority
    let priority: "important" | "new-product" | "delayed" | undefined;
    if (status === "overdue") {
      priority = "important";
    } else if (status === "in-progress") {
      priority = "delayed";
    }

    return { ...session, priority };
  });

  // Split all sessions into two halves (regardless of completion status)
  const totalSessions = allSessions.length;
  const firstHalfCount = Math.ceil(totalSessions / 2); // If odd, first half gets the extra one

  const thisWeekSessions = sortSessionsInSection(
    allSessions.slice(0, firstHalfCount)
  );
  const nextWeekSessions = sortSessionsInSection(
    allSessions.slice(firstHalfCount)
  );

  // Create mock test sessions
  const mockSession: TodoSession = {
    id: "mock-test",
    study_plan_id: sessions[0]?.study_plan_id || "",
    scheduled_date: new Date().toISOString(),
    session_number: 0,
    status: "upcoming",
    started_at: null,
    completed_at: null,
    created_at: null,
    updated_at: null,
    topics: [],
    total_questions: 98,
    completed_questions: 0,
  };

  return [
    {
      id: "this-week",
      title: "This Week Batch",
      icon: "📅",
      todos: thisWeekSessions,
    },
    {
      id: "mock-1",
      title: "Mock Test",
      icon: "🎯",
      todos: [mockSession],
    },
    {
      id: "next-week",
      title: "Next Week Batch",
      icon: "📆",
      todos: nextWeekSessions,
    },
    {
      id: "mock-2",
      title: "Mock Test",
      icon: "🎯",
      todos: [{ ...mockSession, id: "mock-test-2" }],
    },
    {
      id: "lorem",
      title: "Lorem Ipsum",
      icon: "📝",
      todos: [], // Static placeholder, no logic
    },
  ];
}

function StudyPlanContent() {
  const router = useRouter();
  const { data: studyPlan, isLoading, error, refetch } = useStudyPlan();
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const deleteStudyPlanMutation = useDeleteStudyPlan();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sections, setSections] = useState<TodoSectionType[]>([]);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "completed" | "lorem"
  >("all");

  // Initialize sections when study plan loads
  // Only update sections when the study plan ID changes or sessions length changes
  // to preserve manual drag-and-drop ordering
  useEffect(() => {
    if (studyPlan?.study_plan?.sessions) {
      setSections(categorizeSessions(studyPlan.study_plan.sessions));
    }
  }, [studyPlan?.study_plan?.id, studyPlan?.study_plan?.sessions?.length]);

  if (isLoading) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-20" />
              <div className="ml-auto flex items-center gap-2">
                <Skeleton className="h-9 w-28" />
                <Skeleton className="h-9 w-28" />
              </div>
            </div>
          </div>

          {/* Sections skeletons */}
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-6 w-40" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-5 w-64" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !studyPlan) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-7xl">
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="max-w-md text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-2">
                <svg
                  className="w-8 h-8 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">
                No Study Plan Yet
              </h2>
              <p className="text-gray-600">
                Create a personalized study plan tailored to your SAT goals and
                timeline.
              </p>
              <Button
                onClick={() => router.push("/onboard")}
                size="lg"
                className="mt-4"
              >
                Create Study Plan
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { study_plan } = studyPlan;

  const handleToggleTodo = (todoId: string) => {
    setSections((prevSections) =>
      prevSections.map((section) => ({
        ...section,
        todos: section.todos.map((todo) => {
          if (todo.id === todoId) {
            const status = getSessionStatus(todo);
            // Toggle between completed and in-progress
            return todo;
          }
          return todo;
        }),
      }))
    );
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
        alert(err instanceof Error ? err.message : "Failed to delete study plan");
        setIsDeleting(false);
      },
    });
  };

  return (
    <>
      <div className="flex justify-center">
        <div className="w-full max-w-4xl px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-foreground text-2xl font-bold">
                  SAT Study Plan
                </h1>
              </div>

              {/* <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                  <Input
                    placeholder="Search sessions..."
                    className="bg-background border-border w-64 pl-10"
                  />
                </div>
              </div> */}
            </div>

            <div className="mb-6">
              <p className="text-muted-foreground mb-4">
                Your personalized SAT prep sessions •{" "}
                {study_plan.sessions.length} total sessions
              </p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Button
                    className="rounded-lg"
                    size="sm"
                    variant={activeFilter === "all" ? "default" : "outline"}
                    onClick={() => setActiveFilter("all")}
                  >
                    View all
                  </Button>
                  <Button
                    variant={
                      activeFilter === "completed" ? "default" : "outline"
                    }
                    className="rounded-lg"
                    size="sm"
                    onClick={() => setActiveFilter("completed")}
                  >
                    Completed
                  </Button>
                  <Button
                    variant={activeFilter === "lorem" ? "default" : "outline"}
                    className="rounded-lg"
                    size="sm"
                    onClick={() => setActiveFilter("lorem")}
                  >
                    Lorem
                  </Button>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/onboard")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Plan
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete Plan
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Todo Sections */}
          {study_plan.sessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold mb-2">
                No Practice Sessions
              </h3>
              <p className="text-gray-500 mb-6">
                Create your study plan to get started with personalized SAT
                prep.
              </p>
              <Button onClick={() => router.push("/onboard")} size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Create Study Plan
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {sections
                .filter((section) => {
                  if (activeFilter === "completed") {
                    return section.id === "lorem";
                  }
                  if (activeFilter === "lorem") {
                    return section.id === "lorem";
                  }
                  // "all" shows everything except lorem
                  return section.id !== "lorem";
                })
                .map((section) => (
                  <TodoSection
                    key={section.id}
                    section={section}
                    onToggleTodo={handleToggleTodo}
                    isDraggedOver={false}
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Study Plan?</DialogTitle>
            <DialogDescription>
              This will permanently delete your study plan and all{" "}
              {study_plan.sessions.length} practice sessions. This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePlan}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
