"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AnswerPanel } from "@/components/practice/AnswerPanel";
import { supabase } from "@/lib/supabase";
import { config } from "@/lib/config";
import {
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  Flag,
  List,
  Clock,
} from "lucide-react";
import { components } from "@/lib/types/api.generated";

type QuestionWithDetails = components["schemas"]["MockExamQuestionWithDetails"];
type ModuleData = components["schemas"]["MockExamModule"];

interface AnswerState {
  userAnswer: string[];
  isMarkedForReview: boolean;
}

function ModuleContent() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const moduleId = params.moduleId as string;

  const [questions, setQuestions] = useState<QuestionWithDetails[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [showQuestionList, setShowQuestionList] = useState(false);

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(32 * 60); // 32 minutes in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Draggable divider state
  const [dividerPosition, setDividerPosition] = useState(480); // Initial width for right panel
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartPosition, setDragStartPosition] = useState(480);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.question?.id]
    : null;

  const loadModule = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      // Start the module
      await fetch(
        `${config.apiUrl}/api/mock-exams/${examId}/modules/${moduleId}/start`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Load questions
      const response = await fetch(
        `${config.apiUrl}/api/mock-exams/${examId}/modules/${moduleId}/questions`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to load module");

      const data = await response.json();
      setModuleData(data.module);
      setQuestions(data.questions);

      // Initialize answers from saved state
      const initialAnswers: Record<string, AnswerState> = {};
      data.questions.forEach((q: QuestionWithDetails) => {
        if (q.user_answer && q.user_answer.length > 0) {
          initialAnswers[q.question.id] = {
            userAnswer: q.user_answer,
            isMarkedForReview: q.is_marked_for_review || false,
          };
        }
      });
      setAnswers(initialAnswers);

      // Start timer
      setIsTimerRunning(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load module");
    } finally {
      setIsLoading(false);
    }
  }, [examId, moduleId]);

  useEffect(() => {
    loadModule();
  }, [loadModule]);

  const handleAnswerChange = (value: string) => {
    if (!currentQuestion) return;

    setAnswers({
      ...answers,
      [currentQuestion.question.id]: {
        userAnswer: [value],
        isMarkedForReview:
          answers[currentQuestion.question.id]?.isMarkedForReview || false,
      },
    });
  };

  const toggleMarkForReview = () => {
    if (!currentQuestion) return;

    setAnswers({
      ...answers,
      [currentQuestion.question.id]: {
        userAnswer: currentAnswer?.userAnswer || [],
        isMarkedForReview: !(currentAnswer?.isMarkedForReview || false),
      },
    });
  };

  const submitAnswer = useCallback(async () => {
    if (!currentAnswer || !currentQuestion) return;

    try {
      setIsSubmitting(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      await fetch(
        `${config.apiUrl}/api/mock-exams/${examId}/modules/${moduleId}/questions/${currentQuestion.question.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_answer: currentAnswer.userAnswer,
            status: "answered",
            is_marked_for_review: currentAnswer.isMarkedForReview,
          }),
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit answer");
    } finally {
      setIsSubmitting(false);
    }
  }, [currentAnswer, currentQuestion, examId, moduleId]);

  const handleCompleteModule = useCallback(async () => {
    try {
      setIsTimerRunning(false);

      // Submit current answer if exists
      if (currentAnswer?.userAnswer && currentAnswer.userAnswer.length > 0) {
        await submitAnswer();
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      await fetch(
        `${config.apiUrl}/api/mock-exams/${examId}/modules/${moduleId}/complete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            time_remaining_seconds: timeRemaining,
          }),
        }
      );

      // Get exam details to find next module
      const examResponse = await fetch(
        `${config.apiUrl}/api/mock-exams/${examId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (examResponse.ok) {
        const examData: components["schemas"]["MockExamResponse"] =
          await examResponse.json();

        // Find next incomplete module
        const nextModule = examData.modules.find(
          (m) => m.status === "not_started" || m.status === "in_progress"
        );

        if (nextModule) {
          // Only show break screen between sections (after RW Module 2, before Math Module 1)
          const currentModuleType = moduleData?.module_type;
          const nextModuleType = nextModule.module_type;
          const isSectionTransition =
            currentModuleType === "rw_module_2" &&
            nextModuleType === "math_module_1";

          if (isSectionTransition) {
            // Navigate to break screen between sections
            router.push(
              `/mock-exam/${examId}/break?nextModule=${nextModule.id}&completed=${currentModuleType}`
            );
          } else {
            // Navigate directly to next module (within same section)
            router.push(`/mock-exam/${examId}/module/${nextModule.id}`);
          }
        } else {
          // All modules complete, go to results
          router.push(`/mock-exam/${examId}/results`);
        }
      } else {
        // Fallback to mock exam page
        router.push(`/dashboard/mock-exam`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to complete module"
      );
    }
  }, [
    examId,
    moduleId,
    currentAnswer,
    submitAnswer,
    timeRemaining,
    moduleData,
    router,
  ]);

  const handleNext = async () => {
    // Submit current answer if there is one
    if (currentAnswer?.userAnswer && currentAnswer.userAnswer.length > 0) {
      await submitAnswer();
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleQuestionNavigation = (index: number) => {
    setCurrentIndex(index);
    setShowQuestionList(false);
  };

  // Countdown timer effect
  useEffect(() => {
    if (!isTimerRunning || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          // Auto-submit module when time expires
          handleCompleteModule();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, timeRemaining, handleCompleteModule]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Draggable divider handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartPosition(dividerPosition);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    // Calculate how much the mouse has moved since drag started
    const deltaX = e.clientX - dragStartX;

    // Invert delta to fix direction
    const newPosition = dragStartPosition - deltaX;

    // Set minimum and maximum widths (ensure both panels have reasonable space)
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const minWidth = 250;
    const maxWidth = rect.width - 250;

    // Clamp the position to reasonable bounds
    const clampedPosition = Math.max(minWidth, Math.min(maxWidth, newPosition));

    setDividerPosition(clampedPosition);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading module...</p>
        </div>
      </div>
    );
  }

  if (error || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error || "Question not found"}</p>
          <Button onClick={() => router.push("/dashboard/mock-exam")} size="lg">
            Back to Mock Exams
          </Button>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).filter(
    (key) => answers[key].userAnswer.length > 0
  ).length;

  const getModuleTitle = (moduleType: string) => {
    const typeMap: Record<string, string> = {
      rw_module_1: "Reading and Writing - Module 1",
      rw_module_2: "Reading and Writing - Module 2",
      math_module_1: "Math - Module 1",
      math_module_2: "Math - Module 2",
    };
    return typeMap[moduleType] || moduleType;
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 flex flex-col overflow-hidden">
      {/* Header with Progress */}
      <div className="bg-white/90 backdrop-blur-sm border-b px-8 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowQuestionList(!showQuestionList)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors border border-gray-200"
              title="View all questions"
            >
              <List className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">
              {getModuleTitle(moduleData?.module_type || "")}
            </h1>
            <span className="text-sm text-gray-600 font-medium">
              Question {currentIndex + 1} / {questions.length}
            </span>
            <span className="text-sm text-gray-500">
              Answered: {answeredCount} / {questions.length}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Timer */}
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 ${
                timeRemaining <= 300
                  ? "bg-red-50 border-red-300"
                  : timeRemaining <= 600
                  ? "bg-orange-50 border-orange-300"
                  : "bg-blue-50 border-blue-300"
              }`}
            >
              <Clock
                className={`w-5 h-5 ${
                  timeRemaining <= 300
                    ? "text-red-600"
                    : timeRemaining <= 600
                    ? "text-orange-600"
                    : "text-blue-600"
                }`}
              />
              <span
                className={`text-lg font-mono font-bold ${
                  timeRemaining <= 300
                    ? "text-red-700"
                    : timeRemaining <= 600
                    ? "text-orange-700"
                    : "text-blue-700"
                }`}
              >
                {formatTime(timeRemaining)}
              </span>
            </div>

            <button
              onClick={() => router.push("/dashboard/mock-exam")}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
        <Progress value={progress} className="h-2 bg-gray-200" />
      </div>

      <div
        className="flex-1 flex overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Question List Sidebar */}
        {showQuestionList && (
          <div className="w-[480px] border-r bg-white/60 backdrop-blur-sm flex flex-col">
            <div className="p-6 border-b bg-white/80">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">Questions</h3>
                <button
                  onClick={() => setShowQuestionList(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {questions.map((question, index) => {
                const answer = answers[question.question.id];
                const isCurrent = index === currentIndex;
                const isAnswered = answer?.userAnswer.length > 0;
                const isMarked = answer?.isMarkedForReview;

                return (
                  <button
                    key={question.question.id}
                    onClick={() => handleQuestionNavigation(index)}
                    className={`w-full p-4 rounded-lg text-left transition-all border-2 ${
                      isCurrent
                        ? "border-blue-500 bg-blue-50"
                        : isAnswered
                        ? "border-green-300 bg-green-50 hover:bg-green-100"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            isCurrent
                              ? "bg-blue-500 text-white"
                              : isAnswered
                              ? "bg-green-500 text-white"
                              : "bg-gray-300 text-gray-700"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-800 block">
                            Question {index + 1}
                          </span>
                        </div>
                      </div>
                      {isMarked && (
                        <Flag className="w-4 h-4 text-orange-500 fill-orange-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Question Content - Flexible width */}
        <div className="flex-1 overflow-y-auto p-8 min-w-0">
          <div className="max-w-3xl mx-auto">
            {/* Question Header */}
            <div className="flex items-center gap-3 mb-8">
              <span
                className={`px-4 py-1.5 rounded-full text-xs font-semibold ${
                  currentQuestion.question.difficulty === "E"
                    ? "bg-emerald-100 text-emerald-700"
                    : currentQuestion.question.difficulty === "M"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {currentQuestion.question.difficulty === "E"
                  ? "Easy"
                  : currentQuestion.question.difficulty === "M"
                  ? "Medium"
                  : "Hard"}
              </span>
            </div>

            {/* Question Stem */}
            <div
              className="text-lg max-w-none mb-8 text-gray-800 leading-relaxed font-semibold"
              dangerouslySetInnerHTML={{
                __html: currentQuestion.question.stem,
              }}
            />

            {/* Stimulus (Passage/Context) - Only for English questions */}
            {currentQuestion.question.stimulus && (
              <div
                className="text-base max-w-none mb-10 p-6 bg-slate-50 rounded-lg border border-slate-200 text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: currentQuestion.question.stimulus,
                }}
              />
            )}
          </div>
        </div>

        {/* Draggable Divider */}
        <div
          className={`w-1 bg-gray-300 hover:bg-blue-400 cursor-col-resize transition-colors ${
            isDragging ? "bg-blue-500" : ""
          }`}
          onMouseDown={handleMouseDown}
          style={{
            userSelect: "none",
            cursor: isDragging ? "col-resize" : "col-resize",
          }}
        />

        {/* Answer Panel - Dynamic width */}
        <div
          className="border-l bg-white/60 backdrop-blur-sm flex flex-col"
          style={{ width: `${dividerPosition}px` }}
        >
          {/* Transform mock exam data to match AnswerPanel expectations */}
          <AnswerPanel
            question={
              {
                session_question_id: currentQuestion.question.id,
                question: currentQuestion.question,
                topic: "Mock Exam",
                status:
                  currentAnswer?.userAnswer.length === 0
                    ? "not_started"
                    : "answered",
                display_order: currentIndex,
              } as any
            }
            answer={
              currentAnswer
                ? ({
                    ...currentAnswer,
                    status:
                      currentAnswer.userAnswer.length === 0
                        ? "not_started"
                        : "answered",
                    session_question_id: currentQuestion.question.id,
                  } as any)
                : null
            }
            showFeedback={false} // Mock exams don't show feedback during questions
            aiFeedback={null}
            loadingFeedback={false}
            onAnswerChange={handleAnswerChange}
            onGetFeedback={() => {}} // Not used in mock exams
          />

          {/* Action Buttons */}
          <div className="p-6 border-t bg-white space-y-3">
            <div className="flex gap-2 mb-3">
              <Button
                variant="outline"
                onClick={toggleMarkForReview}
                className={`flex-1 ${
                  currentAnswer?.isMarkedForReview
                    ? "bg-orange-50 border-orange-300 text-orange-700"
                    : ""
                }`}
              >
                <Flag
                  className={`w-4 h-4 mr-2 ${
                    currentAnswer?.isMarkedForReview ? "fill-orange-500" : ""
                  }`}
                />
                {currentAnswer?.isMarkedForReview
                  ? "Marked"
                  : "Mark for Review"}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              {currentIndex < questions.length - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleCompleteModule}
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  Complete Module
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ModulePage() {
  return (
    <ProtectedRoute>
      <ModuleContent />
    </ProtectedRoute>
  );
}
