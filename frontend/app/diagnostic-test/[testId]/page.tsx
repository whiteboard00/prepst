"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageLoader } from "@/components/ui/page-loader";
import { ErrorDisplay } from "@/components/ui/error-display";
import { AnswerPanel } from "@/components/practice/AnswerPanel";
import { supabase } from "@/lib/supabase";
import { config } from "@/lib/config";
import { components } from "@/lib/types/api.generated";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { processQuestionBlanks } from "@/lib/question-utils";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Flag,
  List,
} from "lucide-react";

type DiagnosticQuestionWithDetails = components["schemas"]["DiagnosticTestQuestionWithDetails"];
type DiagnosticTest = components["schemas"]["DiagnosticTest"];

interface AnswerState {
  userAnswer: string[];
  isMarkedForReview: boolean;
}

function DiagnosticTestContent() {
  const params = useParams();
  const router = useRouter();
  const testId = params.testId as string;

  const [questions, setQuestions] = useState<DiagnosticQuestionWithDetails[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testData, setTestData] = useState<DiagnosticTest | null>(null);
  const [showQuestionList, setShowQuestionList] = useState(false);

  // Draggable divider state
  const [dividerPosition, setDividerPosition] = useState(480);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartPosition, setDragStartPosition] = useState(480);

  const currentQuestion = questions[currentIndex];

  // Transform diagnostic question to match SessionQuestion structure
  const transformedQuestion = currentQuestion ? {
    session_question_id: currentQuestion.diagnostic_question_id,
    question: currentQuestion.question,
    topic: currentQuestion.topic,
    status: currentQuestion.status,
    display_order: currentQuestion.display_order,
    user_answer: currentQuestion.user_answer
  } : null;

  const currentAnswer = currentQuestion
    ? answers[currentQuestion.question?.id]
    : null;

  const loadTest = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      // Start the test
      await fetch(`${config.apiUrl}/api/diagnostic-test/${testId}/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      // Load questions
      const response = await fetch(
        `${config.apiUrl}/api/diagnostic-test/${testId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to load diagnostic test");

      const data = await response.json();
      setTestData(data.test);
      setQuestions(data.questions);

      // Initialize answers from saved state
      const initialAnswers: Record<string, AnswerState> = {};
      data.questions.forEach((q: DiagnosticQuestionWithDetails) => {
        if (q.user_answer && q.user_answer.length > 0) {
          initialAnswers[q.question.id] = {
            userAnswer: q.user_answer,
            isMarkedForReview: q.is_marked_for_review || false,
          };
        }
      });
      setAnswers(initialAnswers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load diagnostic test");
    } finally {
      setIsLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    loadTest();
  }, [loadTest]);

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
    if (!currentQuestion) return;

    const answer = answers[currentQuestion.question.id];
    if (!answer) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      await fetch(
        `${config.apiUrl}/api/diagnostic-test/${testId}/questions/${currentQuestion.question.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_answer: answer.userAnswer,
            status: "answered",
            is_marked_for_review: answer.isMarkedForReview,
          }),
        }
      );
    } catch (err) {
      console.error("Failed to submit answer:", err);
    }
  }, [testId, currentQuestion, answers]);

  const handleNext = async () => {
    await submitAnswer();

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = async () => {
    await submitAnswer();

    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleQuestionNavigation = async (index: number) => {
    await submitAnswer();
    setCurrentIndex(index);
    setShowQuestionList(false);
  };

  const handleCompleteTest = async () => {
    if (isSubmitting) return;

    const unansweredCount = questions.filter(
      (q) => !answers[q.question.id]?.userAnswer?.length
    ).length;

    if (unansweredCount > 0) {
      if (
        !confirm(
          `You have ${unansweredCount} unanswered questions. Are you sure you want to complete the test?`
        )
      ) {
        return;
      }
    }

    try {
      setIsSubmitting(true);

      // Submit current answer if any
      await submitAnswer();

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      // Complete the test
      const response = await fetch(
        `${config.apiUrl}/api/diagnostic-test/${testId}/complete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to complete test");

      // Navigate to results
      router.push(`/diagnostic-test/${testId}/results`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete test");
    } finally {
      setIsSubmitting(false);
    }
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

    const deltaX = e.clientX - dragStartX;
    const newPosition = dragStartPosition - deltaX;

    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const minWidth = 250;
    const maxWidth = rect.width - 250;

    const clampedPosition = Math.max(minWidth, Math.min(maxWidth, newPosition));
    setDividerPosition(clampedPosition);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Calculate progress
  const answeredCount = questions.filter(
    (q) => answers[q.question.id]?.userAnswer?.length > 0
  ).length;

  if (isLoading) {
    return <PageLoader message="Loading diagnostic test..." />;
  }

  if (error || !transformedQuestion) {
    return (
      <ErrorDisplay
        message={error || "Question not found"}
        onRetry={() => router.push("/dashboard")}
        retryLabel="Back to Dashboard"
      />
    );
  }

  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div
      className="h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 flex flex-col overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-300 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setShowQuestionList(!showQuestionList)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors border border-gray-200"
              title="View all questions"
            >
              <List className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">
              Diagnostic Test
            </h1>
            <span className="text-sm text-gray-600 font-medium">
              Question {currentIndex + 1} / {questions.length}
            </span>
            <span className="text-sm text-gray-500">
              Answered: {answeredCount} / {questions.length}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
        <Progress value={(answeredCount / questions.length) * 100} className="h-2 bg-gray-200" />
      </div>

      <div className="flex-1 flex overflow-hidden">
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

        {/* Question Content */}
        <div className="flex-1 overflow-y-auto p-8 min-w-0">
          <div className="max-w-3xl mx-auto">
            {/* Question Header */}
            <div className="flex items-center gap-3 mb-8">
              <span className="text-sm text-gray-600 font-medium">
                {currentQuestion.topic.name}
              </span>
            </div>

            {/* Question Stem */}
            <div
              className="question-stem text-lg max-w-none mb-8 text-gray-800 leading-relaxed font-semibold"
              dangerouslySetInnerHTML={{
                __html: processQuestionBlanks(currentQuestion.question.stem || ""),
              }}
            />

            {/* Stimulus (Passage/Context) */}
            {currentQuestion.question.stimulus && (
              <div
                className="stimulus-passage text-base max-w-none mb-10 p-6 bg-slate-50 rounded-lg border border-slate-200 text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: processQuestionBlanks(currentQuestion.question.stimulus),
                }}
              />
            )}
          </div>
        </div>

        {/* Draggable Divider */}
        <div
          className="w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors"
          onMouseDown={handleMouseDown}
        />

        {/* Answer Panel */}
        <div
          className="overflow-y-auto bg-white flex flex-col"
          style={{ width: `${dividerPosition}px` }}
        >
          <div className="flex-1 overflow-y-auto">
            <AnswerPanel
              question={transformedQuestion}
              answer={
                currentAnswer
                  ? {
                      ...currentAnswer,
                      status:
                        currentAnswer.userAnswer.length === 0
                          ? "not_started"
                          : "answered",
                      session_question_id: currentQuestion.question.id,
                      isCorrect: false,
                    } as any
                  : null
              }
              showFeedback={false}
              aiFeedback={null}
              loadingFeedback={false}
              onAnswerChange={handleAnswerChange}
              onGetFeedback={() => {}}
            />
          </div>

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
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                variant="outline"
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {isLastQuestion ? (
                <Button
                  onClick={handleCompleteTest}
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? "Completing..." : "Complete Test"}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="flex-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DiagnosticTestPage() {
  return (
    <ProtectedRoute>
      <DiagnosticTestContent />
    </ProtectedRoute>
  );
}
