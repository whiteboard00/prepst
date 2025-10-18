'use client';

import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SessionListItem } from '@/components/study-plan/SessionListItem';
import { useStudyPlan } from '@/hooks/useStudyPlan';
import type { PracticeSession } from '@/lib/types';

function StudyPlanContent() {
  const router = useRouter();
  const { studyPlan, isLoading, error } = useStudyPlan();

  const getSessionColor = (index: number) => {
    const colors = [
      'bg-purple-200',
      'bg-cyan-100',
      'bg-pink-200',
      'bg-green-200',
      'bg-yellow-100',
      'bg-blue-200',
      'bg-purple-300',
    ];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your study plan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-semibold mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/onboard')}
            className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Create a Study Plan
          </button>
        </div>
      </div>
    );
  }

  if (!studyPlan) {
    return null;
  }

  const { study_plan } = studyPlan;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-4xl font-semibold">Study Plan</h1>
      </div>

      <div className="max-w-3xl w-full">
        <div className="flex items-center justify-between mb-4 px-4">
          <h2 className="text-sm text-gray-400">Upcoming sessions</h2>
          <span className="text-sm text-gray-400">Date</span>
        </div>

        <div className="space-y-2 overflow-hidden">
          {study_plan.sessions.map((session: PracticeSession, index: number) => (
            <SessionListItem
              key={session.id}
              sessionNumber={session.session_number}
              topics={session.topics || []}
              scheduledDate={session.scheduled_date}
              colorClass={getSessionColor(index)}
              estimatedTimeMinutes={session.estimated_time_minutes}
              onClick={() => {
                if (session.status === 'pending') {
                  router.push(`/practice/${session.id}`);
                }
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export default function StudyPlanPage() {
  return (
    <ProtectedRoute>
      <StudyPlanContent />
    </ProtectedRoute>
  );
}
