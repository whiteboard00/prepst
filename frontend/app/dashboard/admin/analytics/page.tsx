"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AnalyticsCard } from "@/components/admin/AnalyticsCard";
import { DataTable } from "@/components/admin/DataTable";
import { StatChart } from "@/components/admin/StatChart";
import {
  Brain,
  Clock,
  Activity,
  Camera,
  Users,
  Target,
  RefreshCw,
  FileCheck,
  AlertTriangle,
  Zap,
} from "lucide-react";
import type {
  MasteryTrackingStats,
  ConfidenceTimingStats,
  LearningEventsStats,
  SnapshotsOverview,
  UserProgressSummary,
  DifficultyStats,
  MockExamAnalytics,
  ErrorPatternAnalytics,
  CognitiveEfficiencyAnalytics,
} from "@/lib/types";

function AdminAnalyticsContent() {
  const [masteryStats, setMasteryStats] = useState<MasteryTrackingStats | null>(
    null
  );
  const [confidenceStats, setConfidenceStats] =
    useState<ConfidenceTimingStats | null>(null);
  const [eventsStats, setEventsStats] = useState<LearningEventsStats | null>(
    null
  );
  const [snapshotsStats, setSnapshotsStats] =
    useState<SnapshotsOverview | null>(null);
  const [progressStats, setProgressStats] =
    useState<UserProgressSummary | null>(null);
  const [difficultyStats, setDifficultyStats] =
    useState<DifficultyStats | null>(null);
  const [mockExamStats, setMockExamStats] = useState<MockExamAnalytics | null>(
    null
  );
  const [errorPatternStats, setErrorPatternStats] =
    useState<ErrorPatternAnalytics | null>(null);
  const [cognitiveEfficiencyStats, setCognitiveEfficiencyStats] =
    useState<CognitiveEfficiencyAnalytics | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const loadAllStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [
        mastery,
        confidence,
        events,
        snapshots,
        progress,
        difficulty,
        mockExam,
        errorPattern,
        cognitiveEfficiency,
      ] = await Promise.all([
        api.getMasteryTracking(10),
        api.getConfidenceTiming(100),
        api.getLearningEventsStats(),
        api.getPerformanceSnapshotsOverview(10),
        api.getUserProgressSummary(),
        api.getQuestionDifficultyStats(10).catch(() => null),
        api.getMockExamAnalytics().catch(() => null),
        api.getErrorPatternAnalytics().catch(() => null),
        api.getCognitiveEfficiencyAnalytics().catch(() => null),
      ]);

      setMasteryStats(mastery);
      setConfidenceStats(confidence);
      setEventsStats(events);
      setSnapshotsStats(snapshots);
      setProgressStats(progress);
      setDifficultyStats(difficulty);
      setMockExamStats(mockExam);
      setErrorPatternStats(errorPattern);
      setCognitiveEfficiencyStats(cognitiveEfficiency);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllStats();
  }, []);

  const handleRefresh = () => {
    loadAllStats();
  };

  const toggleCard = (cardId: string) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Prepare chart data for confidence distribution
  const confidenceChartData = confidenceStats
    ? Object.entries(confidenceStats.confidence_distribution).map(
        ([score, count]) => ({
          score: `Level ${score}`,
          count,
        })
      )
    : [];

  // Prepare chart data for event types
  const eventsChartData = eventsStats
    ? Object.entries(eventsStats.event_breakdown).map(([type, count]) => ({
        type,
        count,
      }))
    : [];

  return (
    <div className="py-8 px-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Admin Analytics Dashboard
          </h1>
          <p className="text-gray-600">
            System-wide learning analytics monitoring
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Admin Badge */}
      {masteryStats?.is_admin && (
        <div className="mb-6 inline-block px-4 py-2 bg-purple-100 text-purple-800 rounded-lg font-semibold">
          Admin View - All Users Data
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Mastery Tracking */}
        <AnalyticsCard
          title="Mastery Tracking"
          icon={Brain}
          status={
            masteryStats && masteryStats.total_records > 0
              ? "success"
              : "warning"
          }
        >
          {masteryStats ? (
            <>
              <div className="text-2xl font-bold text-gray-800">
                {masteryStats.total_records} records
              </div>
              <div className="text-sm text-gray-600">
                Avg Mastery: {Math.round(masteryStats.avg_mastery * 100)}%
              </div>
              <button
                onClick={() => toggleCard("mastery")}
                className="mt-2 text-gray-700 text-sm hover:underline"
              >
                {expandedCard === "mastery" ? "Hide Details" : "View Details"}
              </button>
            </>
          ) : (
            <div className="text-gray-600">No data available</div>
          )}
        </AnalyticsCard>

        {/* Confidence & Timing */}
        <AnalyticsCard
          title="Confidence & Timing"
          icon={Clock}
          status={
            confidenceStats && confidenceStats.total_answered > 0
              ? "success"
              : "warning"
          }
        >
          {confidenceStats ? (
            <>
              <div className="text-2xl font-bold text-gray-800">
                {confidenceStats.total_answered} answered
              </div>
              <div className="text-sm text-gray-600">
                Avg Confidence: {confidenceStats.avg_confidence.toFixed(2)} / 5
              </div>
              <div className="text-sm text-gray-600">
                Avg Time: {confidenceStats.avg_time_seconds}s
              </div>
              <button
                onClick={() => toggleCard("confidence")}
                className="mt-2 text-gray-700 text-sm hover:underline"
              >
                {expandedCard === "confidence"
                  ? "Hide Details"
                  : "View Details"}
              </button>
            </>
          ) : (
            <div className="text-gray-600">No data available</div>
          )}
        </AnalyticsCard>

        {/* Learning Events */}
        <AnalyticsCard
          title="Learning Events"
          icon={Activity}
          status={
            eventsStats && eventsStats.total_events > 0 ? "success" : "warning"
          }
        >
          {eventsStats ? (
            <>
              <div className="text-2xl font-bold text-gray-800">
                {eventsStats.total_events} events
              </div>
              <div className="text-sm text-gray-600">
                {Object.keys(eventsStats.event_breakdown).length} event types
              </div>
              <button
                onClick={() => toggleCard("events")}
                className="mt-2 text-gray-700 text-sm hover:underline"
              >
                {expandedCard === "events" ? "Hide Details" : "View Details"}
              </button>
            </>
          ) : (
            <div className="text-gray-600">No data available</div>
          )}
        </AnalyticsCard>

        {/* Performance Snapshots */}
        <AnalyticsCard
          title="Performance Snapshots"
          icon={Camera}
          status={
            snapshotsStats && snapshotsStats.total_snapshots > 0
              ? "success"
              : "warning"
          }
        >
          {snapshotsStats ? (
            <>
              <div className="text-2xl font-bold text-gray-800">
                {snapshotsStats.total_snapshots} snapshots
              </div>
              <button
                onClick={() => toggleCard("snapshots")}
                className="mt-2 text-gray-700 text-sm hover:underline"
              >
                {expandedCard === "snapshots" ? "Hide Details" : "View Details"}
              </button>
            </>
          ) : (
            <div className="text-gray-600">No data available</div>
          )}
        </AnalyticsCard>

        {/* User Progress */}
        <AnalyticsCard
          title="User Progress"
          icon={Users}
          status={
            progressStats && progressStats.total_users > 0
              ? "success"
              : "warning"
          }
        >
          {progressStats ? (
            <>
              <div className="text-2xl font-bold text-gray-800">
                {progressStats.total_users} users
              </div>
              <button
                onClick={() => toggleCard("progress")}
                className="mt-2 text-gray-700 text-sm hover:underline"
              >
                {expandedCard === "progress" ? "Hide Details" : "View Details"}
              </button>
            </>
          ) : (
            <div className="text-gray-600">No data available</div>
          )}
        </AnalyticsCard>

        {/* Mock Exam Analytics */}
        <AnalyticsCard
          title="Mock Exam Performance"
          icon={FileCheck}
          status={
            mockExamStats && mockExamStats.total_exams > 0
              ? "success"
              : "warning"
          }
        >
          {mockExamStats ? (
            <>
              <div className="text-2xl font-bold text-gray-800">
                {mockExamStats.total_exams} exams
              </div>
              <div className="text-sm text-gray-600">
                Completion: {mockExamStats.completion_rate}%
              </div>
              <div className="text-sm text-gray-600">
                Avg Score: {mockExamStats.avg_total_score}
              </div>
              <button
                onClick={() => toggleCard("mockExam")}
                className="mt-2 text-gray-700 text-sm hover:underline"
              >
                {expandedCard === "mockExam" ? "Hide Details" : "View Details"}
              </button>
            </>
          ) : (
            <div className="text-gray-600">No data available</div>
          )}
        </AnalyticsCard>

        {/* Error Patterns */}
        <AnalyticsCard
          title="Error Patterns & Plateaus"
          icon={AlertTriangle}
          status={
            errorPatternStats && errorPatternStats.total_errors > 0
              ? "warning"
              : "success"
          }
        >
          {errorPatternStats ? (
            <>
              <div className="text-2xl font-bold text-gray-800">
                {errorPatternStats.total_errors} errors
              </div>
              <div className="text-sm text-gray-600">
                Recurring: {errorPatternStats.recurring_errors}
              </div>
              <div className="text-sm text-gray-600">
                Plateau Users: {errorPatternStats.plateau_users.length}
              </div>
              <button
                onClick={() => toggleCard("errorPattern")}
                className="mt-2 text-gray-700 text-sm hover:underline"
              >
                {expandedCard === "errorPattern"
                  ? "Hide Details"
                  : "View Details"}
              </button>
            </>
          ) : (
            <div className="text-gray-600">No data available</div>
          )}
        </AnalyticsCard>

        {/* Cognitive Efficiency */}
        <AnalyticsCard
          title="Cognitive Efficiency"
          icon={Zap}
          status={
            cognitiveEfficiencyStats &&
            cognitiveEfficiencyStats.overall_efficiency > 0
              ? "success"
              : "info"
          }
        >
          {cognitiveEfficiencyStats ? (
            <>
              <div className="text-2xl font-bold text-gray-800">
                {cognitiveEfficiencyStats.overall_efficiency.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">
                Overall Efficiency Score
              </div>
              <div className="text-sm text-gray-600">
                Time Patterns:{" "}
                {cognitiveEfficiencyStats.time_of_day_patterns.length} hours
              </div>
              <button
                onClick={() => toggleCard("cognitiveEfficiency")}
                className="mt-2 text-gray-700 text-sm hover:underline"
              >
                {expandedCard === "cognitiveEfficiency"
                  ? "Hide Details"
                  : "View Details"}
              </button>
            </>
          ) : (
            <div className="text-gray-600">No data available</div>
          )}
        </AnalyticsCard>

        {/* Question Difficulty */}
        {difficultyStats && (
          <AnalyticsCard
            title="Question Difficulty (IRT)"
            icon={Target}
            status={difficultyStats.total_calibrated > 0 ? "success" : "info"}
          >
            <>
              <div className="text-2xl font-bold text-gray-800">
                {difficultyStats.total_calibrated} calibrated
              </div>
              <div className="text-sm text-gray-600">
                Avg Difficulty: {difficultyStats.avg_difficulty.toFixed(2)}
              </div>
              <button
                onClick={() => toggleCard("difficulty")}
                className="mt-2 text-gray-700 text-sm hover:underline"
              >
                {expandedCard === "difficulty"
                  ? "Hide Details"
                  : "View Details"}
              </button>
            </>
          </AnalyticsCard>
        )}
      </div>

      {/* Detailed Views */}
      {expandedCard === "mastery" && masteryStats && (
        <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Mastery Tracking Details
          </h2>
          <DataTable
            columns={[
              {
                key: "email",
                label: "Email",
              },
              {
                key: "skill_name",
                label: "Skill",
              },
              {
                key: "mastery_probability",
                label: "Mastery",
                render: (val) => `${Math.round((val as number) * 100)}%`,
              },
              { key: "total_attempts", label: "Attempts" },
              { key: "correct_attempts", label: "Correct" },
              {
                key: "learning_velocity",
                label: "Velocity",
                render: (val) => (val as number | null)?.toFixed(4) ?? "N/A",
              },
              {
                key: "plateau_flag",
                label: "Plateau",
                render: (val) => (val ? "Yes" : "No"),
              },
              {
                key: "prior_knowledge",
                label: "Prior",
                render: (val) => (val as number | null)?.toFixed(2) ?? "N/A",
              },
              {
                key: "learn_rate",
                label: "Learn Rate",
                render: (val) => (val as number | null)?.toFixed(2) ?? "N/A",
              },
              {
                key: "guess_probability",
                label: "Guess",
                render: (val) => (val as number | null)?.toFixed(2) ?? "N/A",
              },
              {
                key: "slip_probability",
                label: "Slip",
                render: (val) => (val as number | null)?.toFixed(2) ?? "N/A",
              },
            ]}
            data={masteryStats.sample_records}
            pageSize={5}
          />
        </div>
      )}

      {expandedCard === "confidence" && confidenceStats && (
        <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Confidence & Timing Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Statistics</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Answered:</span>
                  <span className="font-semibold">
                    {confidenceStats.total_answered}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Confidence:</span>
                  <span className="font-semibold">
                    {confidenceStats.avg_confidence.toFixed(2)} / 5
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Min / Max:</span>
                  <span className="font-semibold">
                    {confidenceStats.min_confidence} /{" "}
                    {confidenceStats.max_confidence}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Time:</span>
                  <span className="font-semibold">
                    {confidenceStats.avg_time_seconds}s
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">
                Confidence Distribution
              </h3>
              <StatChart
                type="bar"
                data={confidenceChartData}
                dataKey="count"
                xKey="score"
                color="#1f2937"
                height={200}
              />
            </div>
          </div>
        </div>
      )}

      {expandedCard === "events" && eventsStats && (
        <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Learning Events Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">
                Event Breakdown
              </h3>
              <div className="space-y-2">
                {Object.entries(eventsStats.event_breakdown).map(
                  ([type, count]) => (
                    <div
                      key={type}
                      className="flex justify-between p-2 bg-gray-50 rounded"
                    >
                      <span className="text-gray-600">{type}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  )
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">
                Event Distribution
              </h3>
              <StatChart
                type="bar"
                data={eventsChartData}
                dataKey="count"
                xKey="type"
                color="#4b5563"
                height={200}
              />
            </div>
          </div>
        </div>
      )}

      {expandedCard === "snapshots" && snapshotsStats && (
        <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Performance Snapshots Details
          </h2>
          <DataTable
            columns={[
              {
                key: "email",
                label: "Email",
              },
              { key: "snapshot_type", label: "Type" },
              {
                key: "predicted_sat_math",
                label: "Math",
                render: (val) => (val as number | null) ?? "N/A",
              },
              {
                key: "predicted_sat_rw",
                label: "R/W",
                render: (val) => (val as number | null) ?? "N/A",
              },
              {
                key: "questions_answered",
                label: "Questions",
              },
              {
                key: "questions_correct",
                label: "Correct",
              },
              {
                key: "created_at",
                label: "Created",
                render: (val) => new Date(val as string).toLocaleDateString(),
              },
            ]}
            data={snapshotsStats.recent_snapshots}
            pageSize={5}
          />
        </div>
      )}

      {expandedCard === "progress" && progressStats && (
        <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            User Progress Details
          </h2>
          <DataTable
            columns={[
              {
                key: "email",
                label: "Email",
              },
              { key: "skills_tracked", label: "Skills" },
              {
                key: "avg_mastery",
                label: "Avg Mastery",
                render: (val) => `${Math.round((val as number) * 100)}%`,
              },
              { key: "total_attempts", label: "Attempts" },
              { key: "total_correct", label: "Correct" },
              {
                key: "accuracy",
                label: "Accuracy",
                render: (val) => `${(val as number).toFixed(1)}%`,
              },
            ]}
            data={progressStats.user_progress}
            pageSize={5}
          />
        </div>
      )}

      {expandedCard === "difficulty" && difficultyStats && (
        <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Question Difficulty Details (IRT)
          </h2>
          <DataTable
            columns={[
              {
                key: "question_id",
                label: "Question ID",
                render: (val) => (val as string).substring(0, 8) + "...",
              },
              {
                key: "difficulty_param",
                label: "Difficulty",
                render: (val) => (val as number | null)?.toFixed(2) ?? "N/A",
              },
              {
                key: "discrimination_param",
                label: "Discrimination",
                render: (val) => (val as number | null)?.toFixed(2) ?? "N/A",
              },
              {
                key: "total_responses",
                label: "Responses",
              },
              {
                key: "correct_responses",
                label: "Correct",
              },
              {
                key: "is_calibrated",
                label: "Calibrated",
                render: (val) => (val ? "Yes" : "No"),
              },
            ]}
            data={difficultyStats.sample_questions}
            pageSize={5}
          />
        </div>
      )}

      {expandedCard === "mockExam" && mockExamStats && (
        <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Mock Exam Analytics Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">
                Performance Overview
              </h3>
              <div className="space-y-2 bg-gray-50 p-4 rounded">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Exams:</span>
                  <span className="font-semibold">
                    {mockExamStats.total_exams}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completion Rate:</span>
                  <span className="font-semibold">
                    {mockExamStats.completion_rate}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Total Score:</span>
                  <span className="font-semibold">
                    {mockExamStats.avg_total_score}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Math Score:</span>
                  <span className="font-semibold">
                    {mockExamStats.avg_math_score}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg R/W Score:</span>
                  <span className="font-semibold">
                    {mockExamStats.avg_rw_score}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-3">
                Stamina Pattern
              </h3>
              <div className="space-y-2 bg-gray-50 p-4 rounded">
                <div className="flex justify-between">
                  <span className="text-gray-600">Module 1 Avg:</span>
                  <span className="font-semibold">
                    {mockExamStats.stamina_pattern.module1_avg}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Module 2 Avg:</span>
                  <span className="font-semibold">
                    {mockExamStats.stamina_pattern.module2_avg}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Performance Drop:</span>
                  <span
                    className={`font-semibold ${
                      mockExamStats.stamina_pattern.drop_percentage > 10
                        ? "text-gray-900"
                        : "text-gray-600"
                    }`}
                  >
                    {mockExamStats.stamina_pattern.drop_percentage}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Improvement Velocity:</span>
                  <span className="font-semibold">
                    {mockExamStats.improvement_velocity} pts/exam
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Readiness Score:</span>
                  <span className="font-semibold">
                    {mockExamStats.readiness_score}/100
                  </span>
                </div>
              </div>
            </div>
          </div>

          {mockExamStats.weak_topics.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3">
                Weak Topics (Below 60% Accuracy)
              </h3>
              <DataTable
                columns={[
                  { key: "topic_name", label: "Topic" },
                  {
                    key: "accuracy",
                    label: "Accuracy",
                    render: (val) => `${val as number}%`,
                  },
                  { key: "attempts", label: "Attempts" },
                ]}
                data={mockExamStats.weak_topics}
                pageSize={5}
              />
            </div>
          )}

          {mockExamStats.recent_exams.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">
                Recent Completed Exams
              </h3>
              <DataTable
                columns={[
                  { key: "email", label: "Student" },
                  { key: "exam_type", label: "Type" },
                  { key: "total_score", label: "Score" },
                  {
                    key: "completed_at",
                    label: "Completed",
                    render: (val) =>
                      new Date(val as string).toLocaleDateString(),
                  },
                ]}
                data={mockExamStats.recent_exams}
                pageSize={5}
              />
            </div>
          )}
        </div>
      )}

      {expandedCard === "errorPattern" && errorPatternStats && (
        <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Error Pattern Analysis Details
          </h2>

          {errorPatternStats.error_by_topic.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3">
                Error Frequency by Topic
              </h3>
              <DataTable
                columns={[
                  { key: "skill_name", label: "Topic" },
                  { key: "error_count", label: "Errors" },
                  { key: "total_attempts", label: "Attempts" },
                  {
                    key: "error_rate",
                    label: "Error Rate",
                    render: (val) => `${val as number}%`,
                  },
                  {
                    key: "last_error",
                    label: "Last Error",
                    render: (val) =>
                      val
                        ? new Date(val as string).toLocaleDateString()
                        : "N/A",
                  },
                ]}
                data={errorPatternStats.error_by_topic}
                pageSize={10}
              />
            </div>
          )}

          {errorPatternStats.cognitive_blocks.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3">
                Cognitive Blocks (Students Stuck on Skills)
              </h3>
              <DataTable
                columns={[
                  { key: "email", label: "Student" },
                  { key: "skill_name", label: "Skill" },
                  { key: "failed_attempts", label: "Failed Attempts" },
                  {
                    key: "mastery_stuck_at",
                    label: "Mastery",
                    render: (val) => `${Math.round((val as number) * 100)}%`,
                  },
                  { key: "days_stuck", label: "Days Stuck" },
                ]}
                data={errorPatternStats.cognitive_blocks}
                pageSize={10}
              />
            </div>
          )}

          {errorPatternStats.plateau_users.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">
                Plateau Users (Need Intervention)
              </h3>
              <DataTable
                columns={[
                  { key: "email", label: "Student" },
                  { key: "plateau_skills", label: "Plateau Skills" },
                  {
                    key: "avg_velocity",
                    label: "Avg Velocity",
                    render: (val) => (val as number).toFixed(4),
                  },
                  {
                    key: "needs_intervention",
                    label: "Needs Intervention",
                    render: (val) => (val ? "YES" : "No"),
                  },
                ]}
                data={errorPatternStats.plateau_users}
                pageSize={10}
              />
            </div>
          )}
        </div>
      )}

      {expandedCard === "cognitiveEfficiency" && cognitiveEfficiencyStats && (
        <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Cognitive Efficiency Details
          </h2>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">
              Time-of-Day Performance Patterns
            </h3>
            {cognitiveEfficiencyStats.time_of_day_patterns.length > 0 ? (
              <>
                <StatChart
                  type="line"
                  data={cognitiveEfficiencyStats.time_of_day_patterns}
                  dataKey="avg_accuracy"
                  xKey="hour"
                  color="#1f2937"
                  height={250}
                />
                <div className="mt-4">
                  <DataTable
                    columns={[
                      {
                        key: "hour",
                        label: "Hour",
                        render: (val) => `${val as number}:00`,
                      },
                      {
                        key: "avg_accuracy",
                        label: "Accuracy",
                        render: (val) => `${val as number}%`,
                      },
                      {
                        key: "avg_time",
                        label: "Avg Time (s)",
                        render: (val) => (val as number).toFixed(1),
                      },
                      {
                        key: "efficiency_score",
                        label: "Efficiency",
                        render: (val) => (val as number).toFixed(3),
                      },
                    ]}
                    data={cognitiveEfficiencyStats.time_of_day_patterns}
                    pageSize={12}
                  />
                </div>
              </>
            ) : (
              <p className="text-gray-600">No time-of-day data available</p>
            )}
          </div>

          {cognitiveEfficiencyStats.confidence_accuracy_map.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">
                Confidence vs Accuracy Calibration
              </h3>
              <DataTable
                columns={[
                  {
                    key: "confidence_level",
                    label: "Confidence Level",
                    render: (val) => `${val as number} / 5`,
                  },
                  {
                    key: "actual_accuracy",
                    label: "Actual Accuracy",
                    render: (val) => `${val as number}%`,
                  },
                  {
                    key: "calibration_gap",
                    label: "Calibration Gap",
                    render: (val) => {
                      const numVal = val as number;
                      const color =
                        numVal > 0 ? "text-gray-600" : "text-gray-900";
                      return (
                        <span className={color}>
                          {numVal > 0 ? "+" : ""}
                          {numVal}%
                        </span>
                      );
                    },
                  },
                ]}
                data={cognitiveEfficiencyStats.confidence_accuracy_map}
                pageSize={5}
              />
              <p className="text-sm text-gray-600 mt-2">
                Positive gap = overconfident, Negative gap = underconfident
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <ProtectedRoute>
      <AdminAnalyticsContent />
    </ProtectedRoute>
  );
}
