"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { config } from "@/lib/config";
import { Clock, BookOpen, TrendingUp, AlertCircle } from "lucide-react";
import { components } from "@/lib/types/api.generated";

type MockExam = components["schemas"]["MockExamListItem"];

export default function MockExamPage() {
  const router = useRouter();
  const [exams, setExams] = useState<MockExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setIsLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(`${config.apiUrl}/api/mock-exams/`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to load exams");

      const data = await response.json();
      setExams(data.exams);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load exams");
    } finally {
      setIsLoading(false);
    }
  };

  const createMockExam = async () => {
    try {
      setIsCreating(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(`${config.apiUrl}/api/mock-exams/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exam_type: "full_length",
        }),
      });

      if (!response.ok) throw new Error("Failed to create exam");

      const data: components["schemas"]["MockExamResponse"] =
        await response.json();
      const examId = data.exam.id;

      // Navigate to first module (Reading/Writing Module 1)
      const firstModule = data.modules.find(
        (m) => m.module_type === "rw_module_1"
      );

      if (firstModule) {
        router.push(`/mock-exam/${examId}/module/${firstModule.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create exam");
    } finally {
      setIsCreating(false);
    }
  };

  const handleResumeExam = async (examId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      // Get exam details to find next incomplete module
      const response = await fetch(
        `${config.apiUrl}/api/mock-exams/${examId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to load exam");

      const data: components["schemas"]["MockExamResponse"] =
        await response.json();

      // Find first incomplete module
      const nextModule = data.modules.find(
        (m) => m.status === "not_started" || m.status === "in_progress"
      );

      if (nextModule) {
        router.push(`/mock-exam/${examId}/module/${nextModule.id}`);
      } else {
        // All modules complete, go to results
        router.push(`/mock-exam/${examId}/results`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume exam");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      not_started: "bg-gray-100 text-gray-700",
      in_progress: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      abandoned: "bg-red-100 text-red-700",
    };

    const labels = {
      not_started: "Not Started",
      in_progress: "In Progress",
      completed: "Completed",
      abandoned: "Abandoned",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${
          styles[status as keyof typeof styles] || styles.not_started
        }`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-semibold mb-2">Mock SAT Exam</h1>
          <p className="text-gray-600">
            Take a full-length practice test that mimics the real SAT experience
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">2 Hours 8 Minutes</h3>
            </div>
            <p className="text-sm text-gray-600">Total test time</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">4 Modules</h3>
            </div>
            <p className="text-sm text-gray-600">2 Math, 2 Reading & Writing</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Adaptive Testing</h3>
            </div>
            <p className="text-sm text-gray-600">
              Difficulty adjusts based on performance
            </p>
          </div>
        </div>

        {/* Start New Exam */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Start New Mock Exam
          </h2>
          <p className="text-gray-600 mb-6">
            This is a full-length SAT practice test. Make sure you have 2+ hours
            available and a quiet environment. The test includes 4 modules with
            strict time limits.
          </p>
          <Button
            onClick={createMockExam}
            disabled={isCreating}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-lg px-8"
          >
            {isCreating ? "Creating Exam..." : "Start Mock Exam"}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Previous Exams */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Previous Exams
          </h2>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">Loading exams...</p>
            </div>
          ) : exams.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No exams yet
              </h3>
              <p className="text-gray-600">
                Start your first mock exam to see your progress here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {exams.map((exam, index) => (
                <div
                  key={exam.id}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Mock Exam #{exams.length - index}
                        </h3>
                        {getStatusBadge(exam.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Started:{" "}
                        {exam.started_at
                          ? formatDate(exam.started_at)
                          : "Not started"}
                        {exam.completed_at
                          ? ` • Completed: ${formatDate(exam.completed_at)}`
                          : ""}
                      </p>

                      {exam.status === "completed" &&
                        exam.total_score != null && (
                          <div className="flex items-center gap-6">
                            <div>
                              <p className="text-sm text-gray-600">
                                Total Score
                              </p>
                              <p className="text-2xl font-bold text-gray-900">
                                {exam.total_score}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Math</p>
                              <p className="text-xl font-semibold text-gray-900">
                                {exam.math_score ?? "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">
                                Reading & Writing
                              </p>
                              <p className="text-xl font-semibold text-gray-900">
                                {exam.rw_score ?? "N/A"}
                              </p>
                            </div>
                          </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                      {exam.status === "completed" && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            router.push(`/mock-exam/${exam.id}/results`)
                          }
                        >
                          View Results
                        </Button>
                      )}
                      {exam.status === "in_progress" && (
                        <Button
                          onClick={() => handleResumeExam(exam.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Resume
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
