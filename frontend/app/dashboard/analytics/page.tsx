"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  GrowthCurveDataPoint,
  CategoryHeatmap,
  PerformanceSnapshot,
  ErrorPatternAnalytics,
  CognitiveEfficiencyAnalytics,
  ConfidenceTimingStats,
  LearningVelocityAnalytics,
} from "@/lib/types";
import {
  TrendingUp,
  Target,
  Brain,
  Zap,
  Calendar,
  AlertTriangle,
  Clock,
  Activity,
} from "lucide-react";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { LearningVelocityCard } from "@/components/analytics/LearningVelocityCard";

function AnalyticsContent() {
  const [growthData, setGrowthData] = useState<GrowthCurveDataPoint[]>([]);
  const [heatmap, setHeatmap] = useState<Record<string, CategoryHeatmap>>({});
  const [snapshots, setSnapshots] = useState<PerformanceSnapshot[]>([]);
  const [avgMastery, setAvgMastery] = useState(0);
  const [errorStats, setErrorStats] = useState<ErrorPatternAnalytics | null>(
    null
  );
  const [cognitiveStats, setCognitiveStats] =
    useState<CognitiveEfficiencyAnalytics | null>(null);
  const [confidenceStats, setConfidenceStats] =
    useState<ConfidenceTimingStats | null>(null);
  const [velocityStats, setVelocityStats] =
    useState<LearningVelocityAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [
        growthResponse,
        heatmapResponse,
        snapshotsResponse,
        errorData,
        cognitiveData,
        confidenceData,
        velocityData,
      ] = await Promise.all([
        api.getGrowthCurve(undefined, 30),
        api.getSkillHeatmap(),
        api.getPerformanceSnapshots(undefined, 10),
        api.getErrorPatternAnalytics().catch(() => null),
        api.getCognitiveEfficiencyAnalytics().catch(() => null),
        api.getConfidenceTiming(100).catch(() => null),
        api.getLearningVelocity().catch(() => null),
      ]);

      setGrowthData(growthResponse.data);
      setHeatmap(heatmapResponse.heatmap);
      setAvgMastery(heatmapResponse.avg_mastery);
      setSnapshots(snapshotsResponse.snapshots);
      setErrorStats(errorData);
      setCognitiveStats(cognitiveData);
      setConfidenceStats(confidenceData);
      setVelocityStats(velocityData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
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
            onClick={loadAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const latestSnapshot = snapshots[0];
  const getMasteryColor = (mastery: number) => {
    if (mastery >= 0.8) return "text-green-600 bg-green-100";
    if (mastery >= 0.6) return "text-blue-600 bg-blue-100";
    if (mastery >= 0.4) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  return (
    <div className="py-8 px-4 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          Learning Analytics
        </h1>
        <p className="text-gray-600">
          Track your mastery growth and cognitive performance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Mastery</p>
              <p className="text-2xl font-bold text-blue-600">
                {Math.round(avgMastery * 100)}%
              </p>
            </div>
          </div>
        </div>

        {latestSnapshot && (
          <>
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Predicted Math</p>
                  <p className="text-2xl font-bold text-green-600">
                    {latestSnapshot.predicted_sat_math || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Predicted R/W</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {latestSnapshot.predicted_sat_rw || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-orange-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cognitive Efficiency</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {latestSnapshot.cognitive_efficiency_score
                      ? Math.round(
                          latestSnapshot.cognitive_efficiency_score * 100
                        )
                      : "N/A"}
                    {latestSnapshot.cognitive_efficiency_score && "%"}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Insights Section */}
      {(errorStats || cognitiveStats || Object.keys(heatmap).length > 0) && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-lg p-6 mb-8 border-2 border-blue-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-600" />
            Personalized Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Best Learning Time */}
            {cognitiveStats &&
              cognitiveStats.time_of_day_patterns.length > 0 && (
                <div className="bg-white rounded-lg p-4 border-2 border-blue-100">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-600 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-800">
                        Your Peak Learning Time
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        You perform best around{" "}
                        {
                          cognitiveStats.time_of_day_patterns.sort(
                            (a, b) => b.efficiency_score - a.efficiency_score
                          )[0].hour
                        }
                        :00 with{" "}
                        {
                          cognitiveStats.time_of_day_patterns.sort(
                            (a, b) => b.efficiency_score - a.efficiency_score
                          )[0].avg_accuracy
                        }
                        % accuracy
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* Plateau Warning */}
            {Object.values(heatmap)
              .flatMap((cat) => cat.skills)
              .filter((s) => s.plateau).length > 0 && (
              <div className="bg-white rounded-lg p-4 border-2 border-orange-100">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-800">
                      Learning Plateau Detected
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {
                        Object.values(heatmap)
                          .flatMap((cat) => cat.skills)
                          .filter((s) => s.plateau).length
                      }{" "}
                      skills need a new learning approach
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Fast Improvement */}
            {Object.values(heatmap)
              .flatMap((cat) => cat.skills)
              .filter((s) => s.velocity > 0.05).length > 0 && (
              <div className="bg-white rounded-lg p-4 border-2 border-green-100">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-green-600 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-800">
                      Great Progress!
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {
                        Object.values(heatmap)
                          .flatMap((cat) => cat.skills)
                          .filter((s) => s.velocity > 0.05).length
                      }{" "}
                      skills showing rapid improvement
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Confidence Calibration */}
            {cognitiveStats &&
              cognitiveStats.confidence_accuracy_map.length > 0 &&
              cognitiveStats.confidence_accuracy_map.some(
                (c) => Math.abs(c.calibration_gap) > 15
              ) && (
                <div className="bg-white rounded-lg p-4 border-2 border-purple-100">
                  <div className="flex items-start gap-3">
                    <Brain className="w-5 h-5 text-purple-600 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-800">
                        Confidence Check
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {cognitiveStats.confidence_accuracy_map.filter(
                          (c) => c.calibration_gap > 15
                        ).length > 0
                          ? "You might be overconfident on some topics"
                          : "You might be underestimating your abilities"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Learning Velocity Card */}
        {velocityStats && <LearningVelocityCard data={velocityStats} />}

        {/* Error Patterns Card */}
        {errorStats && (
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-orange-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Error Patterns</p>
                <p className="text-2xl font-bold text-orange-600">
                  {errorStats.total_errors}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Recurring: {errorStats.recurring_errors}
            </p>
            {expandedCard !== "errors" && (
              <button
                onClick={() => setExpandedCard("errors")}
                className="text-sm text-blue-600 hover:underline"
              >
                View Details
              </button>
            )}
            {expandedCard === "errors" && (
              <button
                onClick={() => setExpandedCard(null)}
                className="text-sm text-gray-600 hover:underline"
              >
                Hide Details
              </button>
            )}
          </div>
        )}

        {/* Cognitive Efficiency Card */}
        {cognitiveStats && (
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Efficiency Score</p>
                <p className="text-2xl font-bold text-blue-600">
                  {cognitiveStats.overall_efficiency.toFixed(2)}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Time Patterns: {cognitiveStats.time_of_day_patterns.length} hours
            </p>
            {expandedCard !== "cognitive" && (
              <button
                onClick={() => setExpandedCard("cognitive")}
                className="text-sm text-blue-600 hover:underline"
              >
                View Details
              </button>
            )}
            {expandedCard === "cognitive" && (
              <button
                onClick={() => setExpandedCard(null)}
                className="text-sm text-gray-600 hover:underline"
              >
                Hide Details
              </button>
            )}
          </div>
        )}

        {/* Confidence Accuracy Card */}
        {confidenceStats && (
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Confidence Tracking</p>
                <p className="text-2xl font-bold text-purple-600">
                  {confidenceStats.avg_confidence.toFixed(1)}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Avg: {confidenceStats.avg_confidence.toFixed(1)}/5
            </p>
            {expandedCard !== "confidence" && (
              <button
                onClick={() => setExpandedCard("confidence")}
                className="text-sm text-blue-600 hover:underline"
              >
                View Details
              </button>
            )}
            {expandedCard === "confidence" && (
              <button
                onClick={() => setExpandedCard(null)}
                className="text-sm text-gray-600 hover:underline"
              >
                Hide Details
              </button>
            )}
          </div>
        )}
      </div>

      {/* Expandable Details: Error Patterns */}
      {expandedCard === "errors" && errorStats && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Your Error Patterns
          </h3>
          {errorStats.error_by_topic.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">
                Most Common Errors
              </h4>
              <div className="space-y-2">
                {errorStats.error_by_topic.slice(0, 5).map((topic, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {topic.skill_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {topic.error_count} errors / {topic.total_attempts}{" "}
                        attempts
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-orange-600">
                        {topic.error_rate}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {errorStats.cognitive_blocks.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">
                Skills Needing Extra Attention
              </h4>
              <div className="space-y-2">
                {errorStats.cognitive_blocks.slice(0, 3).map((block, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-orange-50 border border-orange-200 rounded-lg"
                  >
                    <p className="font-medium text-gray-800">
                      {block.skill_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Stuck at {Math.round(block.mastery_stuck_at * 100)}%
                      mastery for {block.days_stuck} days
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expandable Details: Cognitive Efficiency */}
      {expandedCard === "cognitive" && cognitiveStats && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Your Cognitive Performance Patterns
          </h3>
          {cognitiveStats.time_of_day_patterns.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-700 mb-3">
                Performance by Time of Day
              </h4>
              <LineChart
                data={cognitiveStats.time_of_day_patterns}
                lines={[
                  {
                    dataKey: "avg_accuracy",
                    color: "#3b82f6",
                    name: "Accuracy %",
                  },
                  {
                    dataKey: "efficiency_score",
                    color: "#10b981",
                    name: "Efficiency",
                  },
                ]}
                xKey="hour"
                height={250}
                formatXAxis={(val) => `${val}:00`}
              />
            </div>
          )}
          {cognitiveStats.confidence_accuracy_map.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">
                Confidence vs Actual Performance
              </h4>
              <div className="grid grid-cols-5 gap-2">
                {cognitiveStats.confidence_accuracy_map.map((conf, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg text-center ${
                      Math.abs(conf.calibration_gap) > 10
                        ? "bg-orange-50 border-2 border-orange-200"
                        : "bg-gray-50 border-2 border-gray-200"
                    }`}
                  >
                    <p className="text-xs text-gray-600">
                      Confidence {conf.confidence_level}
                    </p>
                    <p className="text-lg font-bold text-gray-800">
                      {conf.actual_accuracy}%
                    </p>
                    <p
                      className={`text-xs ${
                        conf.calibration_gap > 0
                          ? "text-orange-600"
                          : "text-blue-600"
                      }`}
                    >
                      {conf.calibration_gap > 0 ? "↓" : "↑"}{" "}
                      {Math.abs(conf.calibration_gap)}%
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Orange highlights show where your confidence doesn&apos;t match
                performance
              </p>
            </div>
          )}
        </div>
      )}

      {/* Expandable Details: Confidence */}
      {expandedCard === "confidence" && confidenceStats && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Your Confidence Patterns
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Average Confidence</p>
              <p className="text-3xl font-bold text-purple-600">
                {confidenceStats.avg_confidence.toFixed(1)}/5
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Confidence Distribution</p>
              <BarChart
                data={Object.entries(
                  confidenceStats.confidence_distribution
                ).map(([level, count]) => ({
                  level: parseInt(level),
                  count: count,
                }))}
                xKey="level"
                yKey="count"
                name="Responses"
                color="#8b5cf6"
                height={150}
                formatXAxis={(val) => `${val}⭐`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Growth Curve */}
      {growthData.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            SAT Score Growth Over Time
          </h2>
          <div className="mb-6">
            <LineChart
              data={growthData.map((point) => ({
                ...point,
                date: new Date(point.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }),
                total:
                  (point.predicted_sat_math || 0) +
                  (point.predicted_sat_rw || 0),
              }))}
              lines={[
                {
                  dataKey: "predicted_sat_math",
                  color: "#10b981",
                  name: "Math Score",
                },
                {
                  dataKey: "predicted_sat_rw",
                  color: "#8b5cf6",
                  name: "R/W Score",
                },
                {
                  dataKey: "total",
                  color: "#3b82f6",
                  name: "Total Score",
                },
              ]}
              xKey="date"
              height={300}
              yLabel="SAT Score"
            />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-700 mb-2">
              Recent Snapshots
            </h3>
            {growthData.slice(0, 5).map((point, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-semibold text-gray-800">
                      {new Date(point.date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {point.snapshot_type}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  {point.predicted_sat_math && (
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Math</p>
                      <p className="font-bold text-green-600">
                        {point.predicted_sat_math}
                      </p>
                    </div>
                  )}
                  {point.predicted_sat_rw && (
                    <div className="text-right">
                      <p className="text-xs text-gray-600">R/W</p>
                      <p className="font-bold text-purple-600">
                        {point.predicted_sat_rw}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsContent />
    </ProtectedRoute>
  );
}
