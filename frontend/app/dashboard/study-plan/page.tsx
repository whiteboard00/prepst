"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SessionListItem } from "@/components/study-plan/SessionListItem";
import { useStudyPlan } from "@/hooks/useStudyPlan";
import {
  sortSessionsByPriority,
  getSessionStatus,
} from "@/lib/utils/session-utils";
import type { PracticeSession } from "@/lib/types";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { config } from "@/lib/config";

function StudyPlanContent() {
  const router = useRouter();
  const { studyPlan, isLoading, error, refetch } = useStudyPlan();

  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingTest, setIsCreatingTest] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your study plan...</p>
        </div>
      </div>
    );
  }

  if (error || !studyPlan) {
    return (
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
            Create a personalized study plan tailored to your SAT goals and timeline.
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
    );
  }

  const { study_plan } = studyPlan;
  const sortedSessions = sortSessionsByPriority(study_plan.sessions || []);

  // Group sessions by status
  const sessionsByStatus = {
    overdue: [] as PracticeSession[],
    inProgress: [] as PracticeSession[],
    upcoming: [] as PracticeSession[],
    completed: [] as PracticeSession[],
  };

  sortedSessions.forEach((session) => {
    const status = getSessionStatus(session);
    switch (status) {
      case "overdue":
        sessionsByStatus.overdue.push(session);
        break;
      case "in-progress":
        sessionsByStatus.inProgress.push(session);
        break;
      case "upcoming":
        sessionsByStatus.upcoming.push(session);
        break;
      case "completed":
        sessionsByStatus.completed.push(session);
        break;
    }
  });

  const handleSessionClick = (session: PracticeSession) => {
    const status = getSessionStatus(session);
    if (status !== "completed") {
      router.push(`/practice/${session.id}`);
    }
  };

  const handleDeletePlan = async () => {
    setIsDeleting(true);
    try {
      await api.deleteStudyPlan();
      setShowDeleteConfirm(false);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete study plan");
      setIsDeleting(false);
    }
  };

  const handleCreateDiagnosticTest = async () => {
    if (isCreatingTest) return;

    try {
      setIsCreatingTest(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(`${config.apiUrl}/api/diagnostic-test/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error("Failed to create diagnostic test");

      const data = await response.json();
      router.push(`/diagnostic-test/${data.test.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create diagnostic test");
      setIsCreatingTest(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold">Study Plan</h1>
            <p className="text-gray-600 mt-2">
              Your personalized SAT prep schedule • {study_plan.sessions.length}{" "}
              total sessions
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreateDiagnosticTest}
              disabled={isCreatingTest}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingTest ? "Creating..." : "Take Diagnostic Test"}
            </button>
            <button
              onClick={() => router.push("/onboard")}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
            >
              Generate New Plan
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium border border-red-200"
            >
              Delete Plan
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl w-full space-y-8">
        {/* Overdue Sessions */}
        {sessionsByStatus.overdue.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-red-600">
                Overdue Sessions
              </h2>
              <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                {sessionsByStatus.overdue.length}
              </span>
            </div>
            <div className="space-y-2">
              {sessionsByStatus.overdue.map((session) => (
                <SessionListItem
                  key={session.id}
                  session={session}
                  onClick={() => handleSessionClick(session)}
                />
              ))}
            </div>
          </div>
        )}

        {/* In Progress Sessions */}
        {sessionsByStatus.inProgress.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-blue-600">
                In Progress
              </h2>
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                {sessionsByStatus.inProgress.length}
              </span>
            </div>
            <div className="space-y-2">
              {sessionsByStatus.inProgress.map((session) => (
                <SessionListItem
                  key={session.id}
                  session={session}
                  onClick={() => handleSessionClick(session)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Sessions */}
        {sessionsByStatus.upcoming.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-gray-700">
                Upcoming Sessions
              </h2>
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                {sessionsByStatus.upcoming.length}
              </span>
            </div>
            <div className="space-y-2">
              {(showAllUpcoming
                ? sessionsByStatus.upcoming
                : sessionsByStatus.upcoming.slice(0, 10)
              ).map((session) => (
                <SessionListItem
                  key={session.id}
                  session={session}
                  onClick={() => handleSessionClick(session)}
                />
              ))}
              {sessionsByStatus.upcoming.length > 10 && (
                <div className="text-center py-4">
                  <button
                    className="text-sm text-gray-500 hover:text-gray-700"
                    onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                  >
                    {showAllUpcoming
                      ? "Show less sessions"
                      : `Show ${
                          sessionsByStatus.upcoming.length - 10
                        } more sessions`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completed Sessions */}
        {sessionsByStatus.completed.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-green-600">
                Completed
              </h2>
              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                {sessionsByStatus.completed.length}
              </span>
            </div>
            <div className="space-y-2">
              {(showAllCompleted
                ? sessionsByStatus.completed
                : sessionsByStatus.completed.slice(0, 5)
              ).map((session) => (
                <SessionListItem
                  key={session.id}
                  session={session}
                  onClick={() => handleSessionClick(session)}
                />
              ))}
              {sessionsByStatus.completed.length > 5 && (
                <div className="text-center py-4">
                  <button
                    className="text-sm text-gray-500 hover:text-gray-700"
                    onClick={() => setShowAllCompleted(!showAllCompleted)}
                  >
                    {showAllCompleted
                      ? "Show less completed sessions"
                      : `Show ${
                          sessionsByStatus.completed.length - 5
                        } more completed sessions`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {sortedSessions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No practice sessions scheduled yet.</p>
            <button
              onClick={() => router.push("/onboard")}
              className="mt-4 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              Create Your Study Plan
            </button>
          </div>
        )}
      </div>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Study Plan?</DialogTitle>
            <DialogDescription>
              This will permanently delete your study plan and all {study_plan.sessions.length} practice sessions. This action cannot be undone.
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
      <StudyPlanContent />
    </ProtectedRoute>
  );
}
