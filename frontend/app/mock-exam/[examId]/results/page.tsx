'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { components } from '@/lib/types/api.generated';

type ExamResults = components['schemas']['MockExamResultsResponse'];

function ResultsContent() {
  const params = useParams();
  const router = useRouter();
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
          `http://localhost:8000/api/mock-exams/${examId}/results`,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Mock Exam Results</h1>
          <p className="text-gray-600">
            Completed on {exam.completed_at ? new Date(exam.completed_at).toLocaleDateString() : 'N/A'}
          </p>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Score */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-2 opacity-90">Total Score</h3>
            <p className="text-5xl font-bold mb-2">{exam.total_score}</p>
            <p className="text-sm opacity-75">out of 1600</p>
          </div>

          {/* Math Score */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-8 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-2 opacity-90">Math</h3>
            <p className="text-5xl font-bold mb-2">{exam.math_score}</p>
            <p className="text-sm opacity-75">out of 800</p>
          </div>

          {/* Reading & Writing Score */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-8 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-2 opacity-90">Reading & Writing</h3>
            <p className="text-5xl font-bold mb-2">{exam.rw_score}</p>
            <p className="text-sm opacity-75">out of 800</p>
          </div>
        </div>

        {/* Overall Performance */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Overall Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">Questions Answered</p>
              <p className="text-3xl font-bold text-gray-900">
                {total_correct} / {total_questions}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {overall_percentage.toFixed(1)}% correct
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Correct Answers</p>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-10 h-10 text-green-500" />
                <p className="text-3xl font-bold text-gray-900">{total_correct}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Incorrect Answers</p>
              <div className="flex items-center gap-3">
                <XCircle className="w-10 h-10 text-red-500" />
                <p className="text-3xl font-bold text-gray-900">
                  {total_questions - total_correct}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Performance */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Performance by Category</h2>
          <div className="space-y-4">
            {category_performance.map((category) => (
              <div
                key={`${category.category_name}_${category.section}`}
                className="border border-gray-200 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{category.category_name}</h3>
                    <p className="text-sm text-gray-500">
                      {category.section === 'math' ? 'Math' : 'Reading & Writing'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {category.percentage.toFixed(0)}%
                    </p>
                    <p className="text-sm text-gray-500">
                      {category.correct_answers} / {category.total_questions}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      category.percentage >= 70
                        ? 'bg-green-500'
                        : category.percentage >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Module Breakdown */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Module Breakdown</h2>
          <div className="space-y-4">
            {modules.map((module) => (
              <div key={module.module_type} className="border border-gray-200 rounded-xl">
                <button
                  onClick={() =>
                    setExpandedModule(
                      expandedModule === module.module_type ? null : module.module_type
                    )
                  }
                  className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-left">
                        {module.module_type === 'rw_module_1'
                          ? 'Reading and Writing - Module 1'
                          : module.module_type === 'rw_module_2'
                          ? 'Reading and Writing - Module 2'
                          : module.module_type === 'math_module_1'
                          ? 'Math - Module 1'
                          : module.module_type === 'math_module_2'
                          ? 'Math - Module 2'
                          : module.module_type}
                      </h3>
                      <p className="text-sm text-gray-500 whitespace-nowrap">
                        {module.correct_count} / {module.total_questions} correct (
                        {((module.correct_count / module.total_questions) * 100).toFixed(0)}
                        %)
                      </p>
                    </div>
                  </div>
                  {expandedModule === module.module_type ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {expandedModule === module.module_type && (
                  <div className="px-6 pb-6 space-y-2">
                    {module.questions.map((question, idx) => (
                      <div
                        key={question.question_id}
                        className={`p-4 rounded-lg border-2 ${
                          question.is_correct
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {question.is_correct ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600" />
                              )}
                              <span className="font-semibold text-gray-900">
                                Question {idx + 1}
                              </span>
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  question.difficulty === 'E'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : question.difficulty === 'M'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-rose-100 text-rose-700'
                                }`}
                              >
                                {question.difficulty === 'E'
                                  ? 'Easy'
                                  : question.difficulty === 'M'
                                  ? 'Medium'
                                  : 'Hard'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {question.topic_name} • {question.category_name}
                            </p>
                            {!question.is_correct && (
                              <div className="text-sm">
                                <p className="text-gray-700">
                                  <span className="font-medium">Your answer:</span>{' '}
                                  {question.user_answer?.join(', ') || 'No answer'}
                                </p>
                                <p className="text-gray-700">
                                  <span className="font-medium">Correct answer:</span>{' '}
                                  {question.correct_answer.join(', ')}
                                </p>
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
        <div className="flex gap-4 justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => router.push('/dashboard/mock-exam')}
          >
            Back to Mock Exams
          </Button>
          <Button
            size="lg"
            onClick={() => router.push('/dashboard/mock-exam')}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            Take Another Exam
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
