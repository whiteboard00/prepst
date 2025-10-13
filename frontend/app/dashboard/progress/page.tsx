'use client';

import { useStudyPlan } from '@/hooks/useStudyPlan';

export default function ProgressPage() {
  const { studyPlan, isLoading } = useStudyPlan();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading progress...</p>
        </div>
      </div>
    );
  }

  if (!studyPlan) {
    return (
      <div className="py-12">
        <h1 className="text-4xl font-semibold mb-4">Progress</h1>
        <p className="text-gray-600">No progress data available</p>
      </div>
    );
  }

  const { study_plan } = studyPlan;
  const currentTotal = (study_plan.current_math_score ?? 0) + (study_plan.current_rw_score ?? 0);
  const targetTotal = (study_plan.target_math_score ?? 0) + (study_plan.target_rw_score ?? 0);
  const improvement = targetTotal - currentTotal;

  return (
    <>
      <h1 className="text-4xl font-semibold mb-8">Progress</h1>

      {/* Score Cards */}
      <div className="flex gap-6 mb-12">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700 mb-2">Current Total Score</p>
          <div className="bg-gradient-to-br from-yellow-200 to-yellow-300 rounded-3xl p-6 h-40 flex items-center justify-center">
            <p className="text-5xl font-bold text-gray-900">{currentTotal}</p>
          </div>
        </div>

        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700 mb-2">Target Total Score</p>
          <div className="bg-gradient-to-br from-blue-300 to-blue-400 rounded-3xl p-6 h-40 flex items-center justify-center">
            <p className="text-5xl font-bold text-gray-900">{targetTotal}</p>
          </div>
        </div>

        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700 mb-2">Score Improvement Goal</p>
          <div className="bg-gradient-to-br from-purple-300 to-purple-400 rounded-3xl p-6 h-40 flex items-center justify-center">
            <p className="text-5xl font-bold text-gray-900">+{improvement}</p>
          </div>
        </div>
      </div>

      {/* Mock Score Progress Chart */}
      <div className="max-w-4xl">
        <h2 className="text-3xl font-semibold mb-6">Mock score progress</h2>

        <div className="bg-white border rounded-2xl p-8 h-96 flex items-center justify-center">
          <p className="text-gray-400">Chart visualization coming soon</p>
        </div>
      </div>
    </>
  );
}
