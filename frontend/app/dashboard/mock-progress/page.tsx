"use client";

import { useMockExamAnalytics } from "@/hooks/queries";
import { LineChart } from "@/components/charts/LineChart";
import { Skeleton } from "@/components/ui/skeleton";

export default function MockProgressPage() {
  // Use TanStack Query hook for data fetching
  const { data: mockExamData, isLoading: loading } = useMockExamAnalytics();

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="flex justify-center">
          <div className="w-full max-w-4xl px-4 py-8">
            <Skeleton className="h-10 w-72 mb-8" />
            <div className="bg-white border rounded-2xl p-8">
              <Skeleton className="h-80 w-full rounded-xl" />
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-gray-50 rounded-lg p-4 text-center"
                  >
                    <Skeleton className="h-4 w-24 mx-auto mb-2" />
                    <Skeleton className="h-6 w-16 mx-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl px-4">
        <h1 className="text-4xl font-semibold mb-8">Mock Exam Progress</h1>

        {/* Mock Exam Performance */}
        <div className="mb-12">
          <h2 className="text-3xl font-semibold mb-6">Mock Exam Performance</h2>
          <div className="bg-white border rounded-2xl p-8">
            {mockExamData && mockExamData.recent_exams.length > 0 ? (
              <div>
                <LineChart
                  data={mockExamData.recent_exams.map((exam) => ({
                    ...exam,
                    date: new Date(exam.completed_at).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                      }
                    ),
                  }))}
                  lines={[
                    {
                      dataKey: "total_score",
                      color: "#3b82f6",
                      name: "Total Score",
                    },
                  ]}
                  xKey="date"
                  height={300}
                  yLabel="Score"
                />

                {/* Mock Exam Summary Stats */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600">Total Exams</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {mockExamData.total_exams}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600">Average Score</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {Math.round(mockExamData.avg_total_score)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600">Improvement</p>
                    <p className="text-2xl font-bold text-green-600">
                      {mockExamData.improvement_velocity > 0 ? "+" : ""}
                      {Math.round(mockExamData.improvement_velocity)} pts
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600">Readiness</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {mockExamData.readiness_score}/100
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-80 text-gray-500">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Mock Exams Yet
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Take your first mock exam to start tracking your progress
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
                    <p className="text-sm text-blue-800">
                      <strong>Tip:</strong> Mock exams help you practice under
                      real test conditions and track your improvement over time.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
