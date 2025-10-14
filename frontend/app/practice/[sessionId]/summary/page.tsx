"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { CheckCircle, XCircle, TrendingUp, ArrowRight } from "lucide-react";
import {
  QuestionResult,
  TopicPerformance,
  SessionQuestion,
  SessionQuestionsResponse,
} from "@/lib/types";

function SummaryContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [results, setResults] = useState<QuestionResult[]>([]);
  const [topicPerformance, setTopicPerformance] = useState<TopicPerformance[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
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
        throw new Error("Failed to load session summary");
      }

      const data: SessionQuestionsResponse = await response.json();

      // Process results
      const questionResults: QuestionResult[] = data.questions.map(
        (q: SessionQuestion) => {
          const correctAnswer = q.question.correct_answer;
          const correctAnswerArray = Array.isArray(correctAnswer)
            ? correctAnswer
            : [String(correctAnswer)];

          return {
            question_id: q.question.id,
            topic_name: q.topic.name,
            is_correct:
              q.user_answer && q.status === "answered"
                ? JSON.stringify(q.user_answer.sort()) ===
                  JSON.stringify(correctAnswerArray.sort())
                : false,
            user_answer: q.user_answer || null,
            correct_answer: q.question.correct_answer || [],
          };
        }
      );

      setResults(questionResults);

      // Calculate topic-wise performance
      const topicMap = new Map<string, { total: number; correct: number }>();

      questionResults.forEach((result) => {
        if (!topicMap.has(result.topic_name)) {
          topicMap.set(result.topic_name, { total: 0, correct: 0 });
        }
        const topic = topicMap.get(result.topic_name)!;
        topic.total += 1;
        if (result.is_correct) topic.correct += 1;
      });

      const topicPerf: TopicPerformance[] = Array.from(topicMap.entries()).map(
        ([name, stats]) => ({
          topic_name: name,
          total: stats.total,
          correct: stats.correct,
          percentage: Math.round((stats.correct / stats.total) * 100),
        })
      );

      setTopicPerformance(topicPerf);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load summary");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading summary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            onClick={() => router.push("/dashboard/study-plan")}
            size="lg"
          >
            Back to Study Plan
          </Button>
        </div>
      </div>
    );
  }

  const answeredQuestions = results.filter(
    (r) => r.user_answer !== null
  ).length;
  const correctAnswers = results.filter((r) => r.is_correct).length;
  const incorrectAnswers = answeredQuestions - correctAnswers;
  const accuracy =
    answeredQuestions > 0
      ? Math.round((correctAnswers / answeredQuestions) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            Session Complete!
          </h1>
          <p className="text-gray-600">
            Great work! Here&apos;s how you performed.
          </p>
        </div>

        {/* Overall Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Accuracy */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Accuracy</p>
                <p className="text-3xl font-bold text-blue-600">{accuracy}%</p>
              </div>
            </div>
          </div>

          {/* Correct */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-green-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Correct</p>
                <p className="text-3xl font-bold text-green-600">
                  {correctAnswers}
                </p>
              </div>
            </div>
          </div>

          {/* Incorrect */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-red-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Incorrect</p>
                <p className="text-3xl font-bold text-red-600">
                  {incorrectAnswers}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Topic Performance */}
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Performance by Topic
          </h2>
          <div className="space-y-4">
            {topicPerformance.map((topic) => (
              <div
                key={topic.topic_name}
                className="border-b border-gray-200 pb-4 last:border-0"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-800">
                    {topic.topic_name}
                  </span>
                  <span className="text-sm text-gray-600">
                    {topic.correct}/{topic.total} correct
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      topic.percentage >= 70
                        ? "bg-green-500"
                        : topic.percentage >= 50
                        ? "bg-amber-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${topic.percentage}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {topic.percentage}% accuracy
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => router.push(`/practice/${sessionId}`)}
            className="px-8"
          >
            Review Session
          </Button>
          <Button
            size="lg"
            onClick={() => router.push("/dashboard/study-plan")}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 px-8"
          >
            Back to Study Plan
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SummaryPage() {
  return (
    <ProtectedRoute>
      <SummaryContent />
    </ProtectedRoute>
  );
}
