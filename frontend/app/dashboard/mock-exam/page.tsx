"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { config } from "@/lib/config";
import { Clock, AlertCircle, Zap, Target, Award, BookOpen } from "lucide-react";
import { components } from "@/lib/types/api.generated";
import { Skeleton } from "@/components/ui/skeleton";
import { MockExamPerformance } from "@/components/analytics/MockExamPerformance";
import { useMockExamAnalytics } from "@/hooks/queries";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { ONBOARDING_CONTENT } from "@/lib/onboardingContent";
import { useCourseConfigSafe } from "@/contexts/CourseContext";

type MockExam = components["schemas"]["MockExamListItem"];

export default function MockExamPage() {
  const router = useRouter();
  const { course, sections, sectionName } = useCourseConfigSafe();
  const [exams, setExams] = useState<MockExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(3);
  const {
    data: mockExamData,
    isLoading: mockExamLoading,
    isError: mockExamError,
  } = useMockExamAnalytics();

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

      // Navigate to the first module (lowest module_number)
      const firstModule = data.modules
        .slice()
        .sort((a, b) => a.module_number - b.module_number)[0];

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
      not_started: "bg-muted text-muted-foreground",
      in_progress: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      completed: "bg-green-500/10 text-green-600 dark:text-green-400",
      abandoned: "bg-red-500/10 text-red-600 dark:text-red-400",
    };

    const labels = {
      not_started: "Not Started",
      in_progress: "In Progress",
      completed: "Completed",
      abandoned: "Abandoned",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles] || styles.not_started
          }`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  return (
    <>
      <div className="min-h-screen bg-background pb-20">
        <div className="flex justify-center">
          <div className="w-full max-w-6xl px-6 py-12 space-y-8">
            {/* Header with integrated CTA */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 w-fit">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                    Full-Length Practice Test
                  </span>
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                  {`Mock ${course?.name ?? "SAT"} Exam`}
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl">
                  {`Simulate the real ${course?.name ?? "SAT"} with timed conditions and adaptive modules.`}
                </p>
              </div>
              <Button
                onClick={createMockExam}
                disabled={isCreating}
                size="lg"
                className="h-14 px-8 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-105 disabled:opacity-70 disabled:hover:scale-100 shrink-0 rounded-xl"
              >
                {isCreating ? (
                  <>
                    <Zap className="w-5 h-5 mr-2 animate-pulse" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <Award className="w-5 h-5 mr-2" />
                    Start New Exam
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3 text-destructive">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            {/* In-Progress Exams - Most urgent, show first */}
            {!isLoading && exams.filter(e => e.status === "in_progress").length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  Continue Your Exam
                </h2>
                {exams.filter(e => e.status === "in_progress").map((exam, index) => (
                  <div
                    key={exam.id}
                    className="bg-blue-500/5 rounded-2xl p-5 border border-blue-500/20 hover:border-blue-500/40 transition-all cursor-pointer"
                    onClick={() => handleResumeExam(exam.id)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <Clock className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">
                            Mock Exam #{exams.length - exams.indexOf(exam)}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Started {exam.started_at ? formatDate(exam.started_at) : "recently"}
                          </p>
                        </div>
                      </div>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        Resume Exam
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Exam Info - Compact horizontal strip */}
            <div className="flex flex-wrap items-center justify-center gap-6 py-4 px-6 bg-muted/30 rounded-2xl text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">~2 hours</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">4 Adaptive Modules</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Instant Scoring</span>
              </div>
            </div>

            {/* Progress Chart - Show trends early */}
            {mockExamData && !mockExamLoading && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">Your Progress</h2>
                <MockExamPerformance
                  data={mockExamData}
                  isLoading={mockExamLoading}
                  isError={mockExamError}
                />
              </div>
            )}

            {/* Exam History - Reference section */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">Exam History</h2>

              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-card rounded-2xl p-5 border border-border shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-5 w-36" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : exams.filter(e => e.status !== "in_progress").length === 0 ? (
                <div className="bg-card rounded-2xl p-12 text-center border border-dashed border-border">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    No completed exams yet
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Start your first mock exam to establish a baseline score.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {exams
                      .filter(e => e.status !== "in_progress")
                      .slice(0, visibleCount)
                      .map((exam, index) => (
                        <div
                          key={exam.id}
                          className="bg-card rounded-2xl p-5 border border-border hover:border-primary/30 transition-all group"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
                                {exams.filter(e => e.status !== "in_progress").length - index}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  {getStatusBadge(exam.status)}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {exam.started_at ? formatDate(exam.started_at) : "Not started"}
                                </p>
                              </div>
                            </div>

                            {exam.status === "completed" && exam.total_score != null && (
                              <div className="flex items-center gap-6">
                                <div className="text-center">
                                  <p className="text-2xl font-black text-foreground">
                                    {exam.total_score}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                    Total
                                  </p>
                                </div>
                                <div className="hidden sm:flex items-center gap-4 text-sm">
                                  {sections.slice(0, 3).map((sec, i) => {
                                    const score = sec.key === "math" ? exam.math_score
                                      : sec.key === "reading_writing" ? exam.rw_score
                                      : null;
                                    const colors = ["text-blue-600 dark:text-blue-400", "text-emerald-600 dark:text-emerald-400", "text-amber-600 dark:text-amber-400"];
                                    return (
                                      <div key={sec.key} className="text-center">
                                        <p className={`font-bold ${colors[i % colors.length]}`}>
                                          {score ?? "-"}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">{sec.name}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {exam.status === "completed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/mock-exam/${exam.id}/results`)}
                              >
                                View Results
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                  {visibleCount < exams.filter(e => e.status !== "in_progress").length && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setVisibleCount((prev) =>
                            Math.min(prev + 5, exams.length)
                          )
                        }
                      >
                        Show More
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <OnboardingModal pageId="mock-exam" steps={ONBOARDING_CONTENT["mock-exam"]} />
    </>
  );
}
