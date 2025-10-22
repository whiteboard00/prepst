"use client";

import { useState } from "react";
import { Target, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { AreaChart } from "@/components/charts/AreaChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PredictiveScoresAnalytics } from "@/lib/types";

interface PredictiveSATTrackerProps {
  data: PredictiveScoresAnalytics;
}

export function PredictiveSATTracker({ data }: PredictiveSATTrackerProps) {
  const [expanded, setExpanded] = useState(false);

  const getGoalStatusVariant = (status: string) => {
    switch (status) {
      case "Ahead of Schedule":
        return "default";
      case "On Track":
        return "secondary";
      case "Behind Schedule":
        return "outline";
      case "Needs Acceleration":
        return "destructive";
      default:
        return "outline";
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
    <Card className="border-0 shadow-xl bg-gradient-to-br from-violet-50/80 to-purple-50/80 backdrop-blur-sm">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Target className="w-7 h-7 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-700 mb-2">
                SAT Score Predictions
              </CardTitle>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                  {data.predicted_total_in_30_days}
                </span>
                <span className="text-sm text-slate-500 font-medium">
                  in 30 days
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="border-violet-200 text-violet-600 hover:bg-violet-50 hover:border-violet-300 transition-all duration-200"
          >
            {expanded ? "Hide Details" : "View Details"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current vs Predicted */}
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white/90 backdrop-blur-sm border border-violet-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Current Total
            </p>
            <p className="text-2xl font-bold text-slate-800">
              {data.current_total}
            </p>
          </div>
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
            <p className="text-xs font-medium text-violet-600 uppercase tracking-wide mb-2">
              30-Day Prediction
            </p>
            <p className="text-2xl font-bold text-violet-700">
              {data.predicted_total_in_30_days}
            </p>
          </div>
        </div>

        {/* Goal Status */}
        <div className="flex items-center gap-3">
          <Badge
            variant={getGoalStatusVariant(data.goal_status)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium shadow-sm rounded-full"
          >
            {getGoalStatusIcon(data.goal_status)}
            {data.goal_status}
          </Badge>
        </div>

        {/* Days to Goal */}
        {data.days_to_goal_total !== null && (
          <div className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="font-medium text-slate-600 mb-2">Days to goal</p>
                <p className="text-xl font-bold text-slate-800">
                  {formatDaysToGoal(data.days_to_goal_total)}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-600 mb-2">
                  Velocity needed
                </p>
                <p className="text-xl font-bold text-slate-800">
                  {data.velocity_needed}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expanded Details */}
        {expanded && (
          <div className="space-y-8 pt-4 border-t border-violet-100">
            {/* Prediction Timeline Chart */}
            {data.prediction_timeline.length > 0 && (
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-slate-800">
                    Score Trajectory (12 Weeks)
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                    formatXAxis={(val) => String(val).replace("Week ", "W")}
                  />
                </CardContent>
              </Card>
            )}

            {/* Confidence Intervals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Confidence Intervals (30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-3">
                      <p className="text-xs text-red-600 font-medium">
                        Pessimistic
                      </p>
                      <p className="text-lg font-bold text-red-700">
                        {data.confidence_intervals.total.pessimistic}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-violet-200 bg-violet-50">
                    <CardContent className="p-3">
                      <p className="text-xs text-violet-600 font-medium">
                        Realistic
                      </p>
                      <p className="text-lg font-bold text-violet-700">
                        {data.confidence_intervals.total.realistic}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-3">
                      <p className="text-xs text-green-600 font-medium">
                        Optimistic
                      </p>
                      <p className="text-lg font-bold text-green-700">
                        {data.confidence_intervals.total.optimistic}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Subject Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subject Predictions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-violet-200 bg-violet-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-violet-800">Math</p>
                        <TrendingUp className="w-4 h-4 text-violet-600" />
                      </div>
                      <p className="text-2xl font-bold text-violet-700">
                        {data.predicted_math_in_30_days}
                      </p>
                      <p className="text-sm text-violet-600">
                        Current: {data.current_math} •
                        {data.days_to_goal_math
                          ? ` Goal in ${formatDaysToGoal(
                              data.days_to_goal_math
                            )}`
                          : " No goal"}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4">
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
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            {data.recommendations.length > 0 && (
              <Card className="border-violet-200 bg-violet-50">
                <CardHeader>
                  <CardTitle className="text-base text-violet-800">
                    Personalized Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.recommendations.map((recommendation, idx) => (
                      <p key={idx} className="text-sm text-violet-700">
                        {recommendation}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progress Alert */}
            {!data.on_track && data.goal_status !== "No Data" && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <h4 className="font-semibold text-yellow-800">
                      Action Needed
                    </h4>
                  </div>
                  <p className="text-sm text-yellow-700">
                    You&apos;re not currently on track to meet your goals.
                    Consider increasing your study time or focusing on your
                    weakest areas for maximum improvement.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
