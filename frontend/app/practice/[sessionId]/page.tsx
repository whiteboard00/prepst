"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";

interface Question {
  session_question_id: string;
  question: {
    id: string;
    stem: string;
    difficulty: string;
    question_type: "mc" | "spr";
    answer_options: any;
    correct_answer: string[];
  };
  topic: {
    id: string;
    name: string;
  };
  status: string;
  display_order: number;
}

interface AnswerState {
  userAnswer: string[];
  isCorrect?: boolean;
  status: string;
}

function PracticeSessionContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.question.id]
    : null;

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(
        `http://localhost:8000/api/study-plans/sessions/${sessionId}/questions`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load session");
      }

      const data = await response.json();
      const sortedQuestions = data.questions.sort(
        (a: Question, b: Question) => a.display_order - b.display_order
      );

      setQuestions(sortedQuestions);

      // Initialize answers state with previously answered questions
      const initialAnswers: Record<string, AnswerState> = {};
      sortedQuestions.forEach((q: Question) => {
        if (q.status !== "not_started") {
          initialAnswers[q.question.id] = {
            userAnswer: [], // We don't store the actual answer, just the status
            status: q.status,
          };
        }
      });
      setAnswers(initialAnswers);

      // Find first unanswered question
      const firstUnanswered = sortedQuestions.findIndex(
        (q: Question) => q.status === "not_started"
      );
      setCurrentIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (value: string) => {
    if (!currentQuestion || showFeedback) return;

    setAnswers({
      ...answers,
      [currentQuestion.question.id]: {
        userAnswer: [value],
        status: "in_progress",
      },
    });
  };

  const handleSubmit = async () => {
    if (!currentAnswer || !currentQuestion) return;

    try {
      setIsSubmitting(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(
        `http://localhost:8000/api/study-plans/sessions/${sessionId}/questions/${currentQuestion.question.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_answer: currentAnswer.userAnswer,
            status: "answered",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to submit answer");
      }

      const result = await response.json();

      // Update answer with correctness
      setAnswers({
        ...answers,
        [currentQuestion.question.id]: {
          ...currentAnswer,
          isCorrect: result.is_correct,
          status: "answered",
        },
      });

      setShowFeedback(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit answer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    setShowFeedback(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All questions done - show summary
      router.push(`/practice/${sessionId}/summary`);
    }
  };

  const handleSkip = async () => {
    if (!currentQuestion) return;

    setAnswers({
      ...answers,
      [currentQuestion.question.id]: {
        userAnswer: [],
        status: "skipped",
      },
    });

    handleNext();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading practice session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/study-plan")}
              className="w-full"
            >
              Back to Study Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answeredCount = Object.values(answers).filter(
    (a) => a.status === "answered"
  ).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold">Practice Session</h1>
              <p className="text-sm text-muted-foreground">
                Question {currentIndex + 1} of {questions.length} •{" "}
                {currentQuestion.topic.name}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/study-plan")}
            >
              Exit
            </Button>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Question */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  currentQuestion.question.difficulty === "E"
                    ? "bg-green-100 text-green-800"
                    : currentQuestion.question.difficulty === "M"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {currentQuestion.question.difficulty === "E"
                  ? "Easy"
                  : currentQuestion.question.difficulty === "M"
                  ? "Medium"
                  : "Hard"}
              </span>
              <span className="text-sm text-muted-foreground">
                {currentQuestion.question.question_type === "mc"
                  ? "Multiple Choice"
                  : "Student Produced Response"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {/* Question Stem */}
            <div
              className="prose prose-sm max-w-none mb-6"
              dangerouslySetInnerHTML={{
                __html: currentQuestion.question.stem,
              }}
            />

            {/* Answer Options - Multiple Choice */}
            {currentQuestion.question.question_type === "mc" &&
              currentQuestion.question.answer_options && (
                <RadioGroup
                  value={currentAnswer?.userAnswer[0] || ""}
                  onValueChange={handleAnswerChange}
                  disabled={showFeedback}
                  className="space-y-3"
                >
                  {(() => {
                    // Convert answer options to array and assign A, B, C, D labels
                    const options = Array.isArray(
                      currentQuestion.question.answer_options
                    )
                      ? currentQuestion.question.answer_options
                      : Object.entries(currentQuestion.question.answer_options);

                    const labels = ["A", "B", "C", "D", "E", "F"];

                    return options.map((option: any, index: number) => {
                      const label = labels[index];
                      const optionId = option.id || option[0];
                      const optionContent =
                        option.content || option[1]?.content || option[1];

                      return (
                        <div
                          key={optionId}
                          className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent"
                        >
                          <RadioGroupItem
                            value={optionId}
                            id={`option-${optionId}`}
                          />
                          <Label
                            htmlFor={`option-${optionId}`}
                            className="flex-1 cursor-pointer"
                            dangerouslySetInnerHTML={{
                              __html: `<strong>${label}.</strong> ${optionContent}`,
                            }}
                          />
                        </div>
                      );
                    });
                  })()}
                </RadioGroup>
              )}

            {/* Answer Input - Student Produced Response */}
            {currentQuestion.question.question_type === "spr" && (
              <div className="space-y-2">
                <Label htmlFor="answer-input">Your Answer:</Label>
                <Input
                  id="answer-input"
                  type="text"
                  placeholder="Enter your answer"
                  value={currentAnswer?.userAnswer[0] || ""}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  disabled={showFeedback}
                  className="text-lg"
                />
              </div>
            )}

            {/* Feedback */}
            {showFeedback && currentAnswer && (
              <div
                className={`mt-6 p-4 rounded-lg ${
                  currentAnswer.isCorrect
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <p
                  className={`font-semibold mb-2 ${
                    currentAnswer.isCorrect ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {currentAnswer.isCorrect ? "✅ Correct!" : "❌ Incorrect"}
                </p>
                {!currentAnswer.isCorrect && (
                  <p className="text-sm text-muted-foreground">
                    Correct answer:{" "}
                    {currentQuestion.question.correct_answer.join(", ")}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              {!showFeedback ? (
                <>
                  <Button
                    onClick={handleSubmit}
                    disabled={!currentAnswer || isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Answer"}
                  </Button>
                  <Button variant="outline" onClick={handleSkip}>
                    Skip
                  </Button>
                </>
              ) : (
                <Button onClick={handleNext} className="flex-1">
                  {currentIndex < questions.length - 1
                    ? "Next Question →"
                    : "Finish Session"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progress Summary */}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {answeredCount} answered • {questions.length - answeredCount}{" "}
          remaining
        </div>
      </div>
    </div>
  );
}

export default function PracticeSessionPage() {
  return (
    <ProtectedRoute>
      <PracticeSessionContent />
    </ProtectedRoute>
  );
}
