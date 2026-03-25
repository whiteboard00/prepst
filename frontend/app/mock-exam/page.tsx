'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabase';
import { config } from '@/lib/config';
import { Clock, BookOpen, TrendingUp, AlertCircle, Play, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { components } from '@/lib/types/api.generated';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useCourseConfig } from '@/contexts/CourseContext';

type MockExam = components['schemas']['MockExamListItem'];

function MockExamContent() {
  const router = useRouter();
  const { course, mockExamModules, totalScoreMax, sectionScoreMax, courseSlug, sections, sectionName } = useCourseConfig();

  const totalTimeLimitMinutes = mockExamModules.reduce((sum, m) => sum + m.time_limit_minutes, 0);
  const totalHours = Math.floor(totalTimeLimitMinutes / 60);
  const totalMins = totalTimeLimitMinutes % 60;
  const totalTimeDisplay = totalHours > 0
    ? `${totalHours} Hour${totalHours > 1 ? 's' : ''}${totalMins > 0 ? ` ${totalMins} Minutes` : ''}`
    : `${totalMins} Minutes`;

  const [exams, setExams] = useState<MockExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setIsLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(`${config.apiUrl}/api/mock-exams/`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to load exams');

      const data = await response.json();
      setExams(data.exams);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exams');
    } finally {
      setIsLoading(false);
    }
  };

  const createMockExam = async () => {
    try {
      setIsCreating(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(`${config.apiUrl}/api/mock-exams/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exam_type: 'full_length',
          course_slug: courseSlug,
        }),
      });

      if (!response.ok) throw new Error('Failed to create exam');

      const data: components['schemas']['MockExamResponse'] = await response.json();
      const examId = data.exam.id;

      // Navigate to the first module (sorted by module_number)
      const sortedModules = [...data.modules].sort(
        (a, b) => (a.module_number ?? 0) - (b.module_number ?? 0)
      );
      const firstModule = sortedModules[0];

      if (firstModule) {
        router.push(`/mock-exam/${examId}/module/${firstModule.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create exam');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const config = {
      not_started: { 
        label: 'Not Started', 
        className: 'bg-muted text-muted-foreground border-muted-foreground/20' 
      },
      in_progress: { 
        label: 'In Progress', 
        className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' 
      },
      completed: { 
        label: 'Completed', 
        className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
      },
      abandoned: { 
        label: 'Abandoned', 
        className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' 
      },
    };

    const style = config[status as keyof typeof config] || config.not_started;

    return (
      <Badge variant="outline" className={`${style.className} font-medium`}>
        {style.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Mock {course?.name ?? 'SAT'} Exam</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Take a full-length practice test that mimics the real {course?.name ?? 'SAT'} experience.
            Challenge yourself under timed conditions to assess your readiness.
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group bg-card rounded-3xl p-8 shadow-sm border border-border hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Clock className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">{totalTimeDisplay}</h3>
            <p className="text-muted-foreground leading-relaxed">
              Full length simulation including timed breaks, matching the official test duration.
            </p>
          </div>

          <div className="group bg-card rounded-3xl p-8 shadow-sm border border-border hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <BookOpen className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">{mockExamModules.length} Modules</h3>
            <p className="text-muted-foreground leading-relaxed">
              Covers all key topics across {mockExamModules.length} timed modules.
            </p>
          </div>

          <div className="group bg-card rounded-3xl p-8 shadow-sm border border-border hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Adaptive Testing</h3>
            <p className="text-muted-foreground leading-relaxed">
               Module difficulty adapts based on your performance, just like the real test.
            </p>
          </div>
        </div>

        {/* Start New Exam */}
        <div className="relative overflow-hidden bg-card rounded-[2.5rem] p-8 md:p-12 shadow-lg border border-border/50">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl font-bold text-foreground mb-4">Ready to start?</h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Ensure you have at least {totalTimeDisplay.toLowerCase()} available in a quiet environment.
              Once started, the timer cannot be paused.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={createMockExam}
                disabled={isCreating}
                size="lg"
                className="h-14 px-8 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                {isCreating ? (
                  <>Creating Exam...</>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2 fill-current" />
                    Start Mock Exam
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Previous Exams */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Previous Exams</h2>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-card rounded-2xl p-6 border border-border">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full">
                       <Skeleton className="w-12 h-12 rounded-xl" />
                       <div className="space-y-2 flex-1">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-4 w-32" />
                       </div>
                    </div>
                    <Skeleton className="h-10 w-28 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : exams.length === 0 ? (
            <div className="bg-muted/20 rounded-3xl border-2 border-dashed border-border p-16 text-center">
              <div className="w-20 h-20 bg-background rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <BookOpen className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                No exams taken yet
              </h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Your exam history will appear here once you complete your first mock test.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="group bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.01] cursor-pointer"
                  onClick={() => {
                    if (exam.status === 'completed') router.push(`/mock-exam/${exam.id}/results`);
                    if (exam.status === 'in_progress') router.push(`/mock-exam/${exam.id}`);
                  }}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                      {/* Status Icon */}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0
                        ${exam.status === 'completed' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 
                          exam.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 
                          'bg-gray-500/10 text-gray-500'}
                      `}>
                         {exam.status === 'completed' ? <CheckCircle className="w-6 h-6" /> :
                          exam.status === 'in_progress' ? <Play className="w-6 h-6 fill-current" /> :
                          <AlertCircle className="w-6 h-6" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-bold text-foreground">
                            Mock Exam
                          </h3>
                          {getStatusBadge(exam.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Started {exam.started_at ? formatDate(exam.started_at) : 'Unknown date'}
                          {exam.completed_at && ` • Finished ${formatDate(exam.completed_at)}`}
                        </p>

                        {exam.status === 'completed' && exam.total_score && (
                          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 mt-2">
                            <div>
                              <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Total Score</span>
                              <span className="text-2xl font-black text-foreground">{exam.total_score}</span>
                            </div>
                            <div className="h-8 w-px bg-border hidden sm:block" />
                            <div className="flex gap-6">
                              {(exam as any).section_scores ? (
                                Object.entries((exam as any).section_scores as Record<string, number>).map(([key, score]) => (
                                  <div key={key}>
                                    <span className="text-xs font-medium text-muted-foreground block">{sectionName(key)}</span>
                                    <span className="text-lg font-bold text-foreground">{score}</span>
                                  </div>
                                ))
                              ) : (
                                <>
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground block">{sections[0] ? sectionName(sections[0].key) : 'Math'}</span>
                                    <span className="text-lg font-bold text-foreground">{exam.math_score}</span>
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground block">{sections[1] ? sectionName(sections[1].key) : 'Reading & Writing'}</span>
                                    <span className="text-lg font-bold text-foreground">{exam.rw_score}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-4 md:mt-0">
                      {exam.status === 'completed' && (
                        <Button
                          variant="outline"
                          className="rounded-xl"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/mock-exam/${exam.id}/results`);
                          }}
                        >
                          View Results
                        </Button>
                      )}
                      {exam.status === 'in_progress' && (
                        <Button
                          className="rounded-xl"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/mock-exam/${exam.id}`);
                          }}
                        >
                          Resume Exam
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                      <ChevronRight className="w-5 h-5 text-muted-foreground/50 hidden md:block group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MockExamPage() {
  return (
    <ProtectedRoute>
      <MockExamContent />
    </ProtectedRoute>
  );
}
