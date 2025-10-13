'use client';

import { useRouter } from 'next/navigation';
import { useStudyPlan } from '@/hooks/useStudyPlan';
import { SessionListItem } from '@/components/study-plan/SessionListItem';
import type { PracticeSession } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const { studyPlan, isLoading } = useStudyPlan();

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

  return (
    <>
      <h1 className="text-4xl font-semibold mb-8">Dashboard</h1>

      {/* Top Cards */}
      <div className="flex gap-6 mb-12">
        <div className="w-36 h-52 rounded-3xl bg-gradient-to-br from-yellow-200 to-yellow-300 p-4 flex flex-col justify-end">
          <h3 className="font-semibold text-gray-900">Lorem Lorem</h3>
          <p className="text-sm text-gray-700">12 tests</p>
        </div>

        <div className="w-36 h-52 rounded-3xl bg-gradient-to-br from-blue-300 to-blue-400 p-4 flex flex-col justify-end">
          <h3 className="font-semibold text-gray-900">Lorem Lorem</h3>
          <p className="text-sm text-gray-700">12 tests</p>
        </div>

        <div className="w-36 h-52 rounded-3xl bg-gradient-to-br from-purple-300 to-purple-400 p-4 flex flex-col justify-end">
          <h3 className="font-semibold text-gray-900">Lorem Lorem</h3>
          <p className="text-sm text-gray-700">12 tests</p>
        </div>
      </div>

      {/* Session List */}
      <div className="max-w-2xl">
        <div className="mb-4">
          <h2 className="text-3xl font-semibold">Upcoming Sessions</h2>
          <p className="text-gray-400 text-sm">Your practice schedule</p>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Loading sessions...</p>
          </div>
        ) : studyPlan ? (
          <div className="space-y-2">
            {studyPlan.study_plan.sessions.slice(0, 4).map((session: PracticeSession, index: number) => (
              <SessionListItem
                key={session.id}
                sessionNumber={session.session_number}
                topics={[]}
                scheduledDate={session.scheduled_date}
                colorClass={getSessionColor(index)}
                onClick={() => {
                  if (session.status === 'pending') {
                    router.push(`/practice/${session.id}`);
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No study plan found</p>
            <button
              onClick={() => router.push('/onboard')}
              className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              Create Study Plan
            </button>
          </div>
        )}
      </div>
    </>
  );
}
