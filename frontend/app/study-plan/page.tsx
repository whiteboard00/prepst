'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, StudyPlanResponse, PracticeSession } from '@/lib/api';

export default function StudyPlanPage() {
  const router = useRouter();
  const [studyPlan, setStudyPlan] = useState<StudyPlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStudyPlan();
  }, []);

  const loadStudyPlan = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: Replace with actual user ID from auth
      // For MVP, use fixed demo user ID that exists in database
      const userId = '00000000-0000-0000-0000-000000000001';

      const data = await api.getStudyPlan(userId);
      setStudyPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load study plan');
    } finally {
      setIsLoading(false);
    }
  };

  const groupSessionsByDate = (sessions: PracticeSession[]) => {
    const grouped: { [date: string]: PracticeSession[] } = {};

    sessions.forEach((session) => {
      const date = session.scheduled_date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(session);
    });

    return grouped;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your study plan...</p>
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
            <Button onClick={() => router.push('/onboard')} className="w-full">
              Create a Study Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!studyPlan) {
    return null;
  }

  const { study_plan, total_sessions, total_days } = studyPlan;
  const sessionsByDate = groupSessionsByDate(study_plan.sessions);
  const totalScore = study_plan.current_math_score + study_plan.current_rw_score;
  const targetTotalScore = study_plan.target_math_score + study_plan.target_rw_score;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Your Study Plan</h1>
              <p className="text-muted-foreground mt-1">
                {total_days} days until your test · {total_sessions} practice sessions
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push('/onboard')}>
              New Plan
            </Button>
          </div>

          {/* Score Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Current Total Score</CardDescription>
                <CardTitle className="text-2xl">{totalScore}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Target Total Score</CardDescription>
                <CardTitle className="text-2xl">{targetTotalScore}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Score Improvement Goal</CardDescription>
                <CardTitle className="text-2xl">+{targetTotalScore - totalScore}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>

      {/* Study Plan Timeline */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Practice Schedule</h2>

        <div className="space-y-8">
          {Object.entries(sessionsByDate)
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
            .map(([date, sessions]) => (
              <div key={date}>
                <h3 className="text-lg font-semibold mb-3 text-muted-foreground">
                  {formatDate(date)}
                </h3>

                <div className="space-y-3">
                  {sessions.map((session) => (
                    <Card key={session.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-base">
                              Session {session.session_number}
                            </CardTitle>
                            <span
                              className={`px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(
                                session.status
                              )}`}
                            >
                              {session.status.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {session.topics.reduce((sum, t) => sum + t.num_questions, 0)}{' '}
                            questions
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Topics:</p>
                          <ul className="space-y-1">
                            {session.topics.map((topic, idx) => (
                              <li
                                key={idx}
                                className="text-sm flex items-center justify-between"
                              >
                                <span>{topic.topic_name}</span>
                                <span className="text-muted-foreground">
                                  {topic.num_questions} questions
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {session.status === 'pending' && (
                          <Button className="w-full mt-4" disabled>
                            Start Practice (Coming Soon)
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
