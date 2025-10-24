"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useStudyPlan } from "@/hooks/useStudyPlan";
import {
  sortSessionsByPriority,
  getSessionStatus,
  generateSessionName,
  estimateSessionTime,
  formatTimeEstimate,
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Plus,
  Calendar,
  Clock,
  Target,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Helper function to get session emoji and color
function getSessionEmojiAndColor(session: PracticeSession) {
  const sessionName = generateSessionName(session);
  const sessionNumber = session.session_number || 1;

  // Create a more diverse color palette based on session number and content
  const colorPalettes = [
    {
      emoji: "📊",
      color: "bg-blue-200 dark:bg-blue-900",
      progressColor: "bg-blue-500",
      badgeColor: "bg-blue-500",
    },
    {
      emoji: "📚",
      color: "bg-green-200 dark:bg-green-900",
      progressColor: "bg-green-500",
      badgeColor: "bg-green-500",
    },
    {
      emoji: "🎯",
      color: "bg-purple-200 dark:bg-purple-900",
      progressColor: "bg-purple-500",
      badgeColor: "bg-purple-500",
    },
    {
      emoji: "📝",
      color: "bg-orange-200 dark:bg-orange-900",
      progressColor: "bg-orange-500",
      badgeColor: "bg-orange-500",
    },
    {
      emoji: "🧮",
      color: "bg-pink-200 dark:bg-pink-900",
      progressColor: "bg-pink-500",
      badgeColor: "bg-pink-500",
    },
    {
      emoji: "🔬",
      color: "bg-cyan-200 dark:bg-cyan-900",
      progressColor: "bg-cyan-500",
      badgeColor: "bg-cyan-500",
    },
    {
      emoji: "🌍",
      color: "bg-emerald-200 dark:bg-emerald-900",
      progressColor: "bg-emerald-500",
      badgeColor: "bg-emerald-500",
    },
    {
      emoji: "⚡",
      color: "bg-yellow-200 dark:bg-yellow-900",
      progressColor: "bg-yellow-500",
      badgeColor: "bg-yellow-500",
    },
  ];

  // Use session number to cycle through colors for variety
  const colorIndex = (sessionNumber - 1) % colorPalettes.length;

  // Override with content-based colors if specific patterns are detected
  if (
    sessionName.includes("Math") ||
    sessionName.includes("Algebra") ||
    sessionName.includes("Geometry")
  ) {
    return colorPalettes[0]; // Blue for Math
  } else if (
    sessionName.includes("Reading") ||
    sessionName.includes("Writing") ||
    sessionName.includes("Literature")
  ) {
    return colorPalettes[1]; // Green for Reading/Writing
  } else if (
    sessionName.includes("Science") ||
    sessionName.includes("Physics") ||
    sessionName.includes("Chemistry")
  ) {
    return colorPalettes[5]; // Cyan for Science
  } else if (
    sessionName.includes("History") ||
    sessionName.includes("Social")
  ) {
    return colorPalettes[6]; // Emerald for History/Social
  } else if (sessionName.includes("Mixed") || sessionName.includes("Review")) {
    return colorPalettes[2]; // Purple for Mixed/Review
  } else {
    return colorPalettes[colorIndex]; // Use session number for variety
  }
}

// Helper function to get session progress
function getSessionProgress(session: PracticeSession) {
  const totalQuestions = session.total_questions || 0;
  const completedQuestions = session.completed_questions || 0;

  if (totalQuestions === 0) return 0;
  return Math.round((completedQuestions / totalQuestions) * 100);
}

// Helper function to format session date
function formatSessionDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Helper function to get time left
function getTimeLeft(session: PracticeSession) {
  const scheduledDate = new Date(session.scheduled_date);
  const today = new Date();
  const diffTime = scheduledDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day left";
  return `${diffDays} days left`;
}

function StudyPlanContent() {
  const router = useRouter();
  const { studyPlan, isLoading, error, refetch } = useStudyPlan();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const sessionsPerPage = 12; // Show 12 sessions per page (3 rows of 4 on xl screens)

  if (isLoading) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your study plan...</p>
            </div>
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
  const sortedSessions = sortSessionsByPriority(study_plan.sessions || []);

  // Pagination calculations
  const totalPages = Math.ceil(sortedSessions.length / sessionsPerPage);
  const startIndex = (currentPage - 1) * sessionsPerPage;
  const endIndex = startIndex + sessionsPerPage;
  const currentSessions = sortedSessions.slice(startIndex, endIndex);

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

  return (
    <>
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Study Plan</h1>
              <p className="text-muted-foreground">
                Your personalized SAT prep sessions •{" "}
                {study_plan.sessions.length} total sessions
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => router.push("/onboard")} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                New Plan
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="destructive"
              >
                Delete Plan
              </Button>
            </div>
          </div>

          {/* Sessions Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {currentSessions.map((session) => {
              const status = getSessionStatus(session);
              const progress = getSessionProgress(session);
              const { emoji, color, progressColor, badgeColor } =
                getSessionEmojiAndColor(session);
              const sessionName = generateSessionName(session);
              const timeEstimate = formatTimeEstimate(
                estimateSessionTime(session)
              );
              const timeLeft = getTimeLeft(session);
              const sessionDate = formatSessionDate(session.scheduled_date);

              return (
                <Card
                  key={session.id}
                  className={`${color} relative overflow-hidden border-0 cursor-pointer hover:shadow-lg transition-shadow`}
                  onClick={() => handleSessionClick(session)}
                >
                  <CardContent className="p-6">
                    {/* Settings Icon */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-4 right-4 h-auto p-1"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>

                    {/* Date */}
                    <div className="mb-4 text-sm opacity-90 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {sessionDate}
                    </div>

                    {/* Session Icon */}
                    <div className="mb-4 text-4xl">{emoji}</div>

                    {/* Session Title */}
                    <div className="mb-6">
                      <h3 className="mb-1 text-lg leading-tight font-semibold">
                        {sessionName}
                      </h3>
                      <p className="text-sm opacity-90 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeEstimate}
                      </p>
                    </div>

                    {/* Progress Section */}
                    <div className="mb-6">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm opacity-90">Progress</span>
                        <span className="text-sm font-semibold">
                          {progress}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/30">
                        <div
                          className={`${progressColor} h-2 rounded-full transition-all duration-300`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Bottom Section */}
                    <div className="flex items-center justify-between">
                      {/* Status Indicator */}
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            status === "completed"
                              ? "bg-green-500"
                              : status === "in-progress"
                              ? "bg-blue-500"
                              : status === "overdue"
                              ? "bg-red-500"
                              : "bg-gray-400"
                          }`}
                        />
                        <span className="text-xs opacity-90 capitalize">
                          {status.replace("-", " ")}
                        </span>
                      </div>

                      {/* Time Left Badge */}
                      <Badge
                        className={`${badgeColor} border-0 text-white hover:${badgeColor}`}
                      >
                        {timeLeft}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  )
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Empty State */}
          {sortedSessions.length === 0 && (
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
      <StudyPlanContent />
    </ProtectedRoute>
  );
}
