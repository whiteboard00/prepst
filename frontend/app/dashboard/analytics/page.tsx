"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  GrowthCurveDataPoint,
  CategoryHeatmap,
  PerformanceSnapshot,
} from "@/lib/types";
import { TrendingUp, Target, Brain, Zap, Calendar } from "lucide-react";

function AnalyticsContent() {
  const [growthData, setGrowthData] = useState<GrowthCurveDataPoint[]>([]);
  const [heatmap, setHeatmap] = useState<Record<string, CategoryHeatmap>>({});
  const [snapshots, setSnapshots] = useState<PerformanceSnapshot[]>([]);
  const [avgMastery, setAvgMastery] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [growthResponse, heatmapResponse, snapshotsResponse] =
        await Promise.all([
          api.getGrowthCurve(undefined, 30),
          api.getSkillHeatmap(),
          api.getPerformanceSnapshots(undefined, 10),
        ]);

      setGrowthData(growthResponse.data);
      setHeatmap(heatmapResponse.heatmap);
      setAvgMastery(heatmapResponse.avg_mastery);
      setSnapshots(snapshotsResponse.snapshots);
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

      {/* Growth Curve */}
      {growthData.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Growth Curve
          </h2>
          <div className="space-y-4">
            {growthData.slice(0, 10).map((point, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
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

      {/* Skill Heatmap */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Skill Mastery Heatmap
        </h2>
        <div className="space-y-6">
          {Object.entries(heatmap).map(([categoryName, category]) => (
            <div key={categoryName}>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">
                {categoryName}
                <span className="text-sm text-gray-500 ml-2">
                  ({category.section})
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.skills.map((skill) => (
                  <div
                    key={skill.skill_id}
                    className={`p-4 rounded-lg border-2 ${getMasteryColor(
                      skill.mastery
                    )}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold">{skill.skill_name}</p>
                      <p className="text-2xl font-bold">
                        {Math.round(skill.mastery * 100)}%
                      </p>
                    </div>
                    <div className="flex justify-between text-xs mt-2">
                      <span>
                        {skill.correct_attempts}/{skill.total_attempts} correct
                      </span>
                      {skill.plateau && (
                        <span className="text-orange-600 font-semibold">
                          ⚠️ Plateau
                        </span>
                      )}
                    </div>
                    {skill.velocity !== 0 && (
                      <div className="mt-2 text-xs">
                        <span
                          className={
                            skill.velocity > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {skill.velocity > 0 ? "↑" : "↓"} Velocity:{" "}
                          {Math.abs(Math.round(skill.velocity * 1000) / 10)}%
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
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
