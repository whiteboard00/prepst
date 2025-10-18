'use client';

import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SessionListItem } from '@/components/study-plan/SessionListItem';
import { useStudyPlan } from '@/hooks/useStudyPlan';
import { sortSessionsByPriority, getSessionStatus } from '@/lib/utils/session-utils';
import type { PracticeSession } from '@/lib/types';

function StudyPlanContent() {
  const router = useRouter();
  const { studyPlan, isLoading, error } = useStudyPlan();

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
  const sortedSessions = sortSessionsByPriority(study_plan.sessions || []);

  // Group sessions by status
  const sessionsByStatus = {
    overdue: [] as PracticeSession[],
    inProgress: [] as PracticeSession[],
    upcoming: [] as PracticeSession[],
    completed: [] as PracticeSession[]
  };

  sortedSessions.forEach(session => {
    const status = getSessionStatus(session);
    switch (status) {
      case 'overdue':
        sessionsByStatus.overdue.push(session);
        break;
      case 'in-progress':
        sessionsByStatus.inProgress.push(session);
        break;
      case 'upcoming':
        sessionsByStatus.upcoming.push(session);
        break;
      case 'completed':
        sessionsByStatus.completed.push(session);
        break;
    }
  });

  const handleSessionClick = (session: PracticeSession) => {
    const status = getSessionStatus(session);
    if (status !== 'completed') {
      router.push(`/practice/${session.id}`);
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-4xl font-semibold">Study Plan</h1>
        <p className="text-gray-600 mt-2">
          Your personalized SAT prep schedule • {study_plan.sessions.length} total sessions
        </p>
      </div>

      <div className="max-w-4xl w-full space-y-8">
        {/* Overdue Sessions */}
        {sessionsByStatus.overdue.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-red-600">Overdue Sessions</h2>
              <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                {sessionsByStatus.overdue.length}
              </span>
            </div>
            <div className="space-y-2">
              {sessionsByStatus.overdue.map((session) => (
                <SessionListItem
                  key={session.id}
                  session={session}
                  onClick={() => handleSessionClick(session)}
                />
              ))}
            </div>
          </div>
        )}

        {/* In Progress Sessions */}
        {sessionsByStatus.inProgress.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-blue-600">In Progress</h2>
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                {sessionsByStatus.inProgress.length}
              </span>
            </div>
            <div className="space-y-2">
              {sessionsByStatus.inProgress.map((session) => (
                <SessionListItem
                  key={session.id}
                  session={session}
                  onClick={() => handleSessionClick(session)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Sessions */}
        {sessionsByStatus.upcoming.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-gray-700">Upcoming Sessions</h2>
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                {sessionsByStatus.upcoming.length}
              </span>
            </div>
            <div className="space-y-2">
              {sessionsByStatus.upcoming.slice(0, 10).map((session) => (
                <SessionListItem
                  key={session.id}
                  session={session}
                  onClick={() => handleSessionClick(session)}
                />
              ))}
              {sessionsByStatus.upcoming.length > 10 && (
                <div className="text-center py-4">
                  <button
                    className="text-sm text-gray-500 hover:text-gray-700"
                    onClick={() => {
                      // TODO: Implement show all functionality
                    }}
                  >
                    Show {sessionsByStatus.upcoming.length - 10} more sessions
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completed Sessions */}
        {sessionsByStatus.completed.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-green-600">Completed</h2>
              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                {sessionsByStatus.completed.length}
              </span>
            </div>
            <div className="space-y-2">
              {sessionsByStatus.completed.slice(0, 5).map((session) => (
                <SessionListItem
                  key={session.id}
                  session={session}
                  onClick={() => handleSessionClick(session)}
                />
              ))}
              {sessionsByStatus.completed.length > 5 && (
                <div className="text-center py-4">
                  <button
                    className="text-sm text-gray-500 hover:text-gray-700"
                    onClick={() => {
                      // TODO: Implement show all functionality
                    }}
                  >
                    Show {sessionsByStatus.completed.length - 5} more completed sessions
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {sortedSessions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No practice sessions scheduled yet.</p>
            <button
              onClick={() => router.push('/onboard')}
              className="mt-4 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              Create Your Study Plan
            </button>
          </div>
        )}
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