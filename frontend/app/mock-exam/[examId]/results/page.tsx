'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabase';
import { config } from '@/lib/config';
import { AlertCircle, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { components } from '@/lib/types/api.generated';
import { useCourseConfig } from '@/contexts/CourseContext';

type ExamResults = components['schemas']['MockExamResultsResponse'];

function ResultsContent() {
  const params = useParams();
  const router = useRouter();
  const { getModuleDisplayName, totalScoreMax, sectionScoreMax, sectionName, sections } = useCourseConfig();
  const examId = params.examId as string;

  const [results, setResults] = useState<ExamResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  useEffect(() => {
    const loadResults = async () => {
      try {
        setIsLoading(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Not authenticated');

        const response = await fetch(
          `${config.apiUrl}/api/mock-exams/${examId}/results`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) throw new Error('Failed to load results');

        const data = await response.json();
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load results');
      } finally {
        setIsLoading(false);
      }
    };

    loadResults();
  }, [examId]);

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
          <p className="text-gray-600 mb-6">{error || 'Results not found'}</p>
          <Button onClick={() => router.push('/dashboard/mock-exam')} size="lg">
            Back to Mock Exams
          </Button>
        </div>
      </div>
    );
  }

  const { exam, modules, category_performance, total_correct, total_questions, overall_percentage } = results;

  return (
    <div className="min-h-screen bg-background p-8 flex flex-col">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Mock Exam Results</h1>
          <p className="text-muted-foreground">
            Completed on {exam.completed_at ? new Date(exam.completed_at).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'N/A'}
          </p>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Score */}
          <div className="bg-card rounded-2xl p-8 border border-purple-500/20 shadow-sm bg-purple-500/5">
            <h3 className="text-lg font-medium mb-1 text-purple-600 dark:text-purple-400">Total Score</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-bold tracking-tighter text-foreground">{exam.total_score}</span>
              <span className="text-lg font-medium text-muted-foreground">/ {totalScoreMax}</span>
            </div>
          </div>

          {/* Section Scores (dynamic) */}
          {sections.map((sec, i) => {
            const colors = [
              { border: "border-blue-500/20", bg: "bg-blue-500/5", text: "text-blue-600 dark:text-blue-400" },
              { border: "border-emerald-500/20", bg: "bg-emerald-500/5", text: "text-emerald-600 dark:text-emerald-400" },
              { border: "border-amber-500/20", bg: "bg-amber-500/5", text: "text-amber-600 dark:text-amber-400" },
            ];
            const color = colors[i % colors.length];
            // Use section_scores (dynamic) if available, fall back to backward-compat fields
            const sectionScores = (exam as any).section_scores as Record<string, number> | undefined;
            const sectionScore = sectionScores?.[sec.key]
              ?? (sec.key === "math" ? exam.math_score : undefined)
              ?? (sec.key === "reading_writing" ? exam.rw_score : undefined)
              ?? null;
            return (
              <div key={sec.key} className={`bg-card rounded-2xl p-8 ${color.border} shadow-sm ${color.bg}`}>
                <h3 className={`text-lg font-medium mb-1 ${color.text}`}>{sectionName(sec.key)}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold tracking-tighter text-foreground">{sectionScore ?? "—"}</span>
                  <span className="text-lg font-medium text-muted-foreground">/ {sectionScoreMax(sec.key)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overall Performance */}
        <div className="bg-card rounded-2xl p-8 shadow-sm border border-border">
          <h2 className="text-2xl font-bold text-foreground mb-6">Overall Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Accuracy</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground">{overall_percentage.toFixed(0)}%</span>
                <span className="text-sm text-muted-foreground">correct</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${overall_percentage}%` }}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="p-3 bg-green-500/20 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{total_correct}</p>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Correct Answers</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <div className="p-3 bg-destructive/20 rounded-full">
                <XCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{total_questions - total_correct}</p>
                <p className="text-sm font-medium text-destructive">Incorrect Answers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Performance */}
        <div className="bg-card rounded-2xl p-8 shadow-sm border border-border">
          <h2 className="text-2xl font-bold text-foreground mb-6">Performance by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {category_performance.map((category) => (
              <div
                key={`${category.category_name}_${category.section}`}
                className="p-5 rounded-xl border border-border bg-muted/30"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground">{category.category_name}</h3>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {sectionName(category.section)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xl font-bold ${
                      category.percentage >= 70 ? 'text-green-600 dark:text-green-400' :
                      category.percentage >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-destructive'
                    }`}>
                      {category.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      category.percentage >= 70 ? 'bg-green-500' :
                      category.percentage >= 50 ? 'bg-yellow-500' :
                      'bg-destructive'
                    }`}
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  {category.correct_answers} / {category.total_questions} questions
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Module Breakdown */}
        <div className="bg-card rounded-2xl p-8 shadow-sm border border-border">
          <h2 className="text-2xl font-bold text-foreground mb-6">Module Breakdown</h2>
          <div className="space-y-4">
            {modules.map((module) => (
              <div key={module.module_type} className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() =>
                    setExpandedModule(
                      expandedModule === module.module_type ? null : module.module_type
                    )
                  }
                  className="w-full p-5 flex items-center justify-between hover:bg-muted/50 transition-colors bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <h3 className="font-semibold text-foreground">
                        {getModuleDisplayName(module.module_type)}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium text-foreground">{module.correct_count}</span> of {module.total_questions} correct
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      (module.correct_count / module.total_questions) >= 0.7 
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                        : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                    }`}>
                      {((module.correct_count / module.total_questions) * 100).toFixed(0)}%
                    </span>
                    {expandedModule === module.module_type ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {expandedModule === module.module_type && (
                  <div className="p-4 bg-muted/30 space-y-3 border-t border-border">
                    {module.questions.map((question, idx) => (
                      <div
                        key={question.question_id}
                        className={`p-4 rounded-xl border transition-colors ${
                          question.is_correct
                            ? 'bg-green-500/5 border-green-500/20'
                            : 'bg-destructive/5 border-destructive/20'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 p-1 rounded-full ${
                            question.is_correct 
                              ? 'text-green-600 dark:text-green-400 bg-green-500/10' 
                              : 'text-destructive bg-destructive/10'
                          }`}>
                            {question.is_correct ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="font-semibold text-foreground text-sm">
                                Question {idx + 1}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                                question.difficulty === 'E'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : question.difficulty === 'M'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              }`}>
                                {question.difficulty === 'E' ? 'Easy' : question.difficulty === 'M' ? 'Medium' : 'Hard'}
                              </span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {question.topic_name}
                              </span>
                            </div>
                            
                            {!question.is_correct && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 text-sm">
                                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                  <p className="text-xs font-semibold text-destructive uppercase mb-1">Your Answer</p>
                                  <p className="text-foreground font-medium font-mono">
                                    {question.user_answer?.join(', ') || 'Skipped'}
                                  </p>
                                </div>
                                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                  <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase mb-1">Correct Answer</p>
                                  <p className="text-foreground font-medium font-mono">
                                    {question.correct_answer.join(', ')}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center pt-8 pb-12">
          <Button
            variant="outline"
            size="lg"
            onClick={() => router.push('/dashboard/mock-exam')}
            className="border-border text-foreground hover:bg-accent h-12 px-8"
          >
            Back to Dashboard
          </Button>
          <Button
            size="lg"
            onClick={() => router.push('/dashboard/mock-exam')}
            className="bg-[#866ffe] hover:bg-[#7a5ffe] text-white border-0 h-12 px-8 font-semibold shadow-lg shadow-primary/20"
          >
            Start New Exam
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <ProtectedRoute>
      <ResultsContent />
    </ProtectedRoute>
  );
}
