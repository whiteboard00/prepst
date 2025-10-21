"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageLoader } from "@/components/ui/page-loader";
import { ErrorDisplay } from "@/components/ui/error-display";

interface PracticeQuestion {
  id: string;
  stem: string;
  question_type: string;
  answer_options: any;
  correct_answer: any;
  difficulty: string;
  topics: {
    name: string;
  };
}

interface PracticeSession {
  id: string;
  questions: PracticeQuestion[];
  currentIndex: number;
  timeLimit: number;
  createdAt: string;
}

interface AnswerResult {
  questionId: string;
  userAnswer: string[];
  correctAnswer: any;
  isCorrect: boolean;
  topicName: string;
  difficulty: string;
}

function QuickPracticeCompleteContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<PracticeSession | null>(null);
  const [results, setResults] = useState<AnswerResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load session from localStorage
    const sessionData = localStorage.getItem(`practice-session-${sessionId}`);
    if (sessionData) {
      const parsedSession = JSON.parse(sessionData);
      setSession(parsedSession);

      // Calculate results
      const answerResults: AnswerResult[] = [];
      parsedSession.questions.forEach(
        (question: PracticeQuestion, index: number) => {
          const answerKey = `practice-session-${sessionId}-answer-${index}`;
          const savedAnswer = localStorage.getItem(answerKey);

          if (savedAnswer) {
            const userAnswer = JSON.parse(savedAnswer);
            const isCorrect =
              JSON.stringify(userAnswer.sort()) ===
              JSON.stringify(question.correct_answer.sort());

            answerResults.push({
              questionId: question.id,
              userAnswer: userAnswer,
              correctAnswer: question.correct_answer,
              isCorrect: isCorrect,
              topicName: question.topics.name,
              difficulty: question.difficulty,
            });
          }
        }
      );

      setResults(answerResults);
    }
    setIsLoading(false);
  }, [sessionId]);

  // Calculate results
  const correctAnswers = results.filter((r) => r.isCorrect).length;
  const totalAnswered = results.length;
  const percentage =
    totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;

  const handleStartNewPractice = () => {
    // Clean up current session and answers
    localStorage.removeItem(`practice-session-${sessionId}`);
    for (let i = 0; i < (session?.questions.length || 0); i++) {
      localStorage.removeItem(`practice-session-${sessionId}-answer-${i}`);
    }
    router.push("/dashboard");
  };

  const handleReturnToDashboard = () => {
    // Clean up current session and answers
    localStorage.removeItem(`practice-session-${sessionId}`);
    for (let i = 0; i < (session?.questions.length || 0); i++) {
      localStorage.removeItem(`practice-session-${sessionId}-answer-${i}`);
    }
    router.push("/dashboard");
  };

  if (isLoading) {
    return <PageLoader message="Loading results..." />;
  }

  if (!session) {
    return (
      <ErrorDisplay
        message="Practice session not found"
        onRetry={() => router.push("/dashboard")}
        retryLabel="Back to Dashboard"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <div className="mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎉</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Practice Complete!
            </h1>
            <p className="text-gray-600">
              Great job! You've finished your quick practice session.
            </p>
          </div>

          {/* Results Display */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 mb-8 border-2 border-purple-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Your Results
            </h2>

            {/* Score Display */}
            <div className="text-center mb-6">
              <div
                className={`text-6xl font-bold mb-2 ${
                  percentage >= 70
                    ? "text-green-600"
                    : percentage >= 50
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {percentage}%
              </div>
              <div className="text-gray-600">
                {correctAnswers} of {totalAnswered} correct
              </div>
            </div>

            {/* Performance Indicator */}
            <div className="text-center mb-4">
              {percentage >= 90 && (
                <div className="text-green-600 font-semibold">
                  🌟 Excellent Work!
                </div>
              )}
              {percentage >= 70 && percentage < 90 && (
                <div className="text-blue-600 font-semibold">👍 Good Job!</div>
              )}
              {percentage >= 50 && percentage < 70 && (
                <div className="text-yellow-600 font-semibold">
                  📚 Keep Practicing!
                </div>
              )}
              {percentage < 50 && (
                <div className="text-red-600 font-semibold">
                  💪 You Can Do Better!
                </div>
              )}
            </div>

            {/* Session Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Questions:</span>
                <span className="font-medium ml-2">
                  {session.questions.length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Time Limit:</span>
                <span className="font-medium ml-2">
                  {Math.floor(session.timeLimit / 60)} minutes
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleStartNewPractice}
              className="w-full bg-purple-600 hover:bg-purple-700 py-3"
            >
              Start Another Practice
            </Button>
            <Button
              onClick={handleReturnToDashboard}
              variant="outline"
              className="w-full py-3"
            >
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function QuickPracticeCompletePage() {
  return (
    <ProtectedRoute>
      <QuickPracticeCompleteContent />
    </ProtectedRoute>
  );
}
