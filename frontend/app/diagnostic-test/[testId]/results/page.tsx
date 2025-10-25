"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { config } from "@/lib/config";
import { AlertCircle, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { components } from "@/lib/types/api.generated";

type DiagnosticResults =
  components["schemas"]["DiagnosticTestResultsResponse"];

function ResultsContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const testId = params.testId as string;
  const returnToOnboarding = searchParams.get('returnToOnboarding') === 'true';

  const [results, setResults] = useState<DiagnosticResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadResults = async () => {
      try {
        setIsLoading(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Not authenticated");

        const response = await fetch(
          `${config.apiUrl}/api/diagnostic-test/${testId}/results`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) throw new Error("Failed to load results");

        const data = await response.json();
        setResults(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load results"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadResults();
  }, [testId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error || "Results not found"}</p>
          <Button
            onClick={() => router.push("/dashboard")}
            size="lg"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const {
    test,
    total_correct,
    total_questions,
    overall_percentage,
    math_correct,
    math_total,
    math_percentage,
    rw_correct,
    rw_total,
    rw_percentage,
    topic_mastery_initialized,
  } = results;

  // Sort topics by mastery (weakest first)
  const sortedTopics = [...topic_mastery_initialized].sort(
    (a, b) => a.initial_mastery - b.initial_mastery
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Diagnostic Test Results
          </h1>
          <p className="text-gray-600">
            Completed on{" "}
            {test.completed_at
              ? new Date(test.completed_at).toLocaleDateString()
              : "N/A"}
          </p>
        </div>

        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Baseline Assessment Complete!
              </h3>
              <p className="text-green-800">
                We've established your initial mastery levels across all topics.
                Your personalized study plan will now prioritize topics where
                you need the most improvement.
              </p>
            </div>
          </div>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Overall Score */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-2 opacity-90">
              Overall Score
            </h3>
            <p className="text-5xl font-bold mb-2">
              {total_correct}/{total_questions}
            </p>
            <p className="text-sm opacity-75">
              {overall_percentage.toFixed(1)}% correct
            </p>
          </div>

          {/* Math Score */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-8 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-2 opacity-90">Math</h3>
            <p className="text-5xl font-bold mb-2">
              {math_correct}/{math_total}
            </p>
            <p className="text-sm opacity-75">
              {math_percentage.toFixed(1)}% correct
            </p>
          </div>

          {/* Reading & Writing Score */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-8 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-2 opacity-90">
              Reading & Writing
            </h3>
            <p className="text-5xl font-bold mb-2">
              {rw_correct}/{rw_total}
            </p>
            <p className="text-sm opacity-75">
              {rw_percentage.toFixed(1)}% correct
            </p>
          </div>
        </div>

        {/* Topic Mastery Breakdown */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-violet-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              Initial Mastery Levels
            </h2>
          </div>

          <p className="text-gray-600 mb-6">
            Based on your performance, we've established baseline mastery for
            each topic. Lower scores indicate areas needing more focus.
          </p>

          <div className="space-y-4">
            {sortedTopics.map((topic) => {
              const percentage = topic.initial_mastery * 100;
              let colorClass = "bg-red-500";
              if (percentage >= 70) colorClass = "bg-green-500";
              else if (percentage >= 40) colorClass = "bg-yellow-500";

              return (
                <div key={topic.topic_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {topic.topic_name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">
                        {topic.correct_answers}/{topic.questions_answered}{" "}
                        correct
                      </span>
                      <span className="font-semibold text-gray-900 w-16 text-right">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colorClass} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            What's Next?
          </h2>
          <ul className="space-y-3 text-gray-700 mb-6">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>
                Your baseline mastery has been established for all topics
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>
                Create a study plan that prioritizes your weakest areas
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>
                As you practice, your mastery levels will update automatically
              </span>
            </li>
          </ul>

          <div className="flex gap-4">
            <Button
              onClick={() => {
                if (returnToOnboarding) {
                  router.push('/onboard?returnFromDiagnostic=true');
                } else {
                  router.push('/onboard');
                }
              }}
              size="lg"
              className="flex-1"
            >
              {returnToOnboarding ? 'Continue Onboarding' : 'Create Study Plan'}
            </Button>
            <Button
              onClick={() => router.push("/dashboard")}
              size="lg"
              variant="outline"
              className="flex-1"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DiagnosticTestResultsPage() {
  return (
    <ProtectedRoute>
      <ResultsContent />
    </ProtectedRoute>
  );
}
