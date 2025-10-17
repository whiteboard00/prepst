"use client";

import { useState } from "react";
import { Target, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { AreaChart } from "@/components/charts/AreaChart";
import type { PredictiveScoresAnalytics } from "@/lib/types";

interface PredictiveSATTrackerProps {
  data: PredictiveScoresAnalytics;
}

export function PredictiveSATTracker({ data }: PredictiveSATTrackerProps) {
  const [expanded, setExpanded] = useState(false);

  const getGoalStatusColor = (status: string) => {
    switch (status) {
      case "Ahead of Schedule":
        return "text-green-600 bg-green-100";
      case "On Track":
        return "text-blue-600 bg-blue-100";
      case "Behind Schedule":
        return "text-yellow-600 bg-yellow-100";
      case "Needs Acceleration":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getGoalStatusIcon = (status: string) => {
    switch (status) {
      case "Ahead of Schedule":
        return <CheckCircle className="w-4 h-4" />;
      case "On Track":
        return <Target className="w-4 h-4" />;
      case "Behind Schedule":
        return <AlertTriangle className="w-4 h-4" />;
      case "Needs Acceleration":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const formatDaysToGoal = (days: number | null) => {
    if (days === null) return "No goal set";
    if (days === 0) return "Goal reached!";
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.round(days / 7)} weeks`;
    return `${Math.round(days / 365)} years`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <Target className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">SAT Score Predictions</p>
            <p className="text-2xl font-bold text-purple-600">
              {data.predicted_total_in_30_days}
            </p>
            <p className="text-xs text-gray-500">in 30 days</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-purple-600 hover:underline"
        >
          {expanded ? "Hide Details" : "View Details"}
        </button>
      </div>

      {/* Current vs Predicted */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-600">Current Total</p>
          <p className="text-lg font-bold text-gray-800">
            {data.current_total}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-600">30-Day Prediction</p>
          <p className="text-lg font-bold text-purple-600">
            {data.predicted_total_in_30_days}
          </p>
        </div>
      </div>

      {/* Goal Status */}
      <div className="mb-4">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getGoalStatusColor(
            data.goal_status
          )}`}
        >
          {getGoalStatusIcon(data.goal_status)}
          {data.goal_status}
        </div>
      </div>

      {/* Days to Goal */}
      {data.days_to_goal_total !== null && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            <strong>Days to goal:</strong>{" "}
            {formatDaysToGoal(data.days_to_goal_total)}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Velocity needed:</strong> {data.velocity_needed}
          </p>
        </div>
      )}

      {/* Expanded Details */}
      {expanded && (
        <div className="space-y-6">
          {/* Prediction Timeline Chart */}
          {data.prediction_timeline.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">
                Score Trajectory (12 Weeks)
              </h4>
              <AreaChart
                data={data.prediction_timeline.map((point) => ({
                  ...point,
                  week: `Week ${point.week}`,
                }))}
                areas={[
                  {
                    dataKey: "total_score",
                    color: "#8b5cf6",
                    name: "Total Score",
                  },
                  {
                    dataKey: "math_score",
                    color: "#3b82f6",
                    name: "Math",
                  },
                  {
                    dataKey: "rw_score",
                    color: "#10b981",
                    name: "R/W",
                  },
                ]}
                xKey="week"
                height={300}
                yLabel="Score"
                formatXAxis={(val) => val.replace("Week ", "W")}
              />
            </div>
          )}

          {/* Confidence Intervals */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">
              Confidence Intervals (30 Days)
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-600 font-medium">Pessimistic</p>
                <p className="text-lg font-bold text-red-700">
                  {data.confidence_intervals.total.pessimistic}
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium">Realistic</p>
                <p className="text-lg font-bold text-blue-700">
                  {data.confidence_intervals.total.realistic}
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-600 font-medium">Optimistic</p>
                <p className="text-lg font-bold text-green-700">
                  {data.confidence_intervals.total.optimistic}
                </p>
              </div>
            </div>
          </div>

          {/* Subject Breakdown */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">
              Subject Predictions
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-blue-800">Math</p>
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-700">
                  {data.predicted_math_in_30_days}
                </p>
                <p className="text-sm text-blue-600">
                  Current: {data.current_math} •
                  {data.days_to_goal_math
                    ? ` Goal in ${formatDaysToGoal(data.days_to_goal_math)}`
                    : " No goal"}
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-green-800">
                    Reading & Writing
                  </p>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-700">
                  {data.predicted_rw_in_30_days}
                </p>
                <p className="text-sm text-green-600">
                  Current: {data.current_rw} •
                  {data.days_to_goal_rw
                    ? ` Goal in ${formatDaysToGoal(data.days_to_goal_rw)}`
                    : " No goal"}
                </p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {data.recommendations.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-800 mb-3">
                Personalized Recommendations
              </h4>
              <div className="space-y-2">
                {data.recommendations.map((recommendation, idx) => (
                  <p key={idx} className="text-sm text-purple-700">
                    {recommendation}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Progress Alert */}
          {!data.on_track && data.goal_status !== "No Data" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <h4 className="font-semibold text-yellow-800">Action Needed</h4>
              </div>
              <p className="text-sm text-yellow-700">
                You&apos;re not currently on track to meet your goals. Consider
                increasing your study time or focusing on your weakest areas for
                maximum improvement.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
