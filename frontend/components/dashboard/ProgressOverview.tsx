"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  TrendingUp, 
  Calendar, 
  BookOpen,
  CheckCircle2,
  Clock
} from "lucide-react";

interface ProgressOverviewProps {
  studyPlan?: any;
  mockExamPerformance?: any[];
}

export function ProgressOverview({ studyPlan, mockExamPerformance }: ProgressOverviewProps) {
  // Calculate progress metrics
  const totalSessions = studyPlan?.study_plan?.sessions?.length || 0;
  const completedSessions = studyPlan?.study_plan?.sessions?.filter((s: any) => s.status === "completed").length || 0;
  const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
  
  const totalMockExams = mockExamPerformance?.length || 0;
  const averageScore = mockExamPerformance?.length > 0 
    ? Math.round(mockExamPerformance.reduce((sum, exam) => sum + exam.total_score, 0) / mockExamPerformance.length)
    : 0;

  // Calculate days until test
  const testDate = studyPlan?.study_plan?.test_date ? new Date(studyPlan.study_plan.test_date) : null;
  const daysUntilTest = testDate ? Math.ceil((testDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="space-y-6">
      {/* Progress Overview Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Your Progress Overview</h2>
        <p className="text-gray-600">Track your journey to SAT success</p>
      </div>

      {/* Main Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Study Plan Progress */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500 rounded-xl shadow-md">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-purple-700 font-medium">Study Plan</p>
                <p className="text-2xl font-bold text-purple-900">
                  {completedSessions}/{totalSessions}
                </p>
                <p className="text-xs text-purple-600">Sessions completed</p>
              </div>
            </div>
            <div className="mt-4">
              <Progress value={completionRate} className="h-2" />
              <p className="text-xs text-purple-600 mt-1">
                {Math.round(completionRate)}% complete
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mock Exam Performance */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500 rounded-xl shadow-md">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-blue-700 font-medium">Mock Exams</p>
                <p className="text-2xl font-bold text-blue-900">
                  {totalMockExams}
                </p>
                <p className="text-xs text-blue-600">
                  {averageScore > 0 ? `Avg: ${averageScore}` : 'No scores yet'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Days Until Test */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500 rounded-xl shadow-md">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-orange-700 font-medium">Test Date</p>
                <p className="text-2xl font-bold text-orange-900">
                  {daysUntilTest > 0 ? daysUntilTest : 'N/A'}
                </p>
                <p className="text-xs text-orange-600">
                  {daysUntilTest > 0 ? 'days remaining' : 'No date set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Progress */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500 rounded-xl shadow-md">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-green-700 font-medium">Overall</p>
                <p className="text-2xl font-bold text-green-900">
                  {Math.round(completionRate)}%
                </p>
                <p className="text-xs text-green-600">Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Progress Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Study Plan Timeline */}
        <Card className="border-0 shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              Study Plan Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {studyPlan?.study_plan?.sessions?.slice(0, 5).map((session: any, index: number) => (
                <div key={session.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    session.status === 'completed' 
                      ? 'bg-green-500 text-white' 
                      : session.status === 'in_progress'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {session.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{session.topic_name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(session.scheduled_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {session.num_questions} questions
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {session.status.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              ))}
              {totalSessions > 5 && (
                <div className="text-center pt-2">
                  <p className="text-sm text-gray-500">
                    +{totalSessions - 5} more sessions
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Mock Exam Scores */}
        <Card className="border-0 shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Recent Mock Exam Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockExamPerformance?.slice(0, 5).map((exam, index) => (
                <div key={exam.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      Mock Exam #{exam.id}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(exam.completed_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-600">
                      {exam.total_score}
                    </p>
                    <p className="text-xs text-gray-500">
                      {exam.math_score}M / {exam.rw_score}RW
                    </p>
                  </div>
                </div>
              ))}
              {(!mockExamPerformance || mockExamPerformance.length === 0) && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">No mock exams taken yet</p>
                  <p className="text-sm text-gray-400">Take your first mock exam to see scores here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}