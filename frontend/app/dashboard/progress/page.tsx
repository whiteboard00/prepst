"use client";

import { useEffect, useState } from "react";
import { useStudyPlan } from "@/hooks/useStudyPlan";
import { api } from "@/lib/api";
import type {
  GrowthCurveDataPoint,
  CategoryHeatmap,
  MockExamAnalytics,
  PredictiveScoresAnalytics,
} from "@/lib/types";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { AreaChart } from "@/components/charts/AreaChart";
import { PredictiveSATTracker } from "@/components/analytics/PredictiveSATTracker";
import MagicBento from "@/components/dashboard/MagicBento";

export default function ProgressPage() {
  const { studyPlan, isLoading } = useStudyPlan();
  const [growthData, setGrowthData] = useState<GrowthCurveDataPoint[]>([]);
  const [heatmap, setHeatmap] = useState<Record<string, CategoryHeatmap>>({});
  const [mockExamData, setMockExamData] = useState<MockExamAnalytics | null>(
    null
  );
  const [predictiveData, setPredictiveData] =
    useState<PredictiveScoresAnalytics | null>(null);
  const [chartsLoading, setChartsLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    try {
      setChartsLoading(true);
      const [growth, heatmapResponse, mockData, predictiveScores] =
        await Promise.all([
          api.getGrowthCurve(undefined, 30),
          api.getSkillHeatmap(),
          api.getMockExamAnalytics().catch(() => null),
          api.getPredictiveScores().catch(() => null),
        ]);

      setGrowthData(growth.data);
      setHeatmap(heatmapResponse.heatmap);
      setMockExamData(mockData);
      setPredictiveData(predictiveScores);
    } catch (error) {
      console.error("Failed to load chart data:", error);
    } finally {
      setChartsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading progress...</p>
        </div>
      </div>
    );
  }

  if (!studyPlan) {
    return (
      <div className="py-12">
        <h1 className="text-4xl font-semibold mb-4">Progress</h1>
        <p className="text-gray-600">No progress data available</p>
      </div>
    );
  }

  const { study_plan } = studyPlan;
  const currentTotal =
    (study_plan.current_math_score ?? 0) + (study_plan.current_rw_score ?? 0);
  const targetTotal =
    (study_plan.target_math_score ?? 0) + (study_plan.target_rw_score ?? 0);
  const improvement = targetTotal - currentTotal;

  // Create SAT-focused card data with beautiful colors
  // Total scores are in positions 3 & 4 to make them the biggest cards
  const satCardData = [
    {
      color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", // Purple-blue gradient for current math
      title: study_plan.current_math_score?.toString() || "0",
      description: "Current Math Score",
      label: "Math",
    },
    {
      color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", // Pink-red gradient for target math
      title: study_plan.target_math_score?.toString() || "800",
      description: "Target Math Score",
      label: "Target",
    },
    {
      color: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)", // Mint-pink gradient for current total (BIG CARD)
      title: currentTotal.toString(),
      description: "Total Current Score",
      label: "Current",
    },
    {
      color: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", // Pink-yellow gradient for target total (BIG CARD)
      title: targetTotal.toString(),
      description: "Total Target Score",
      label: "Target",
    },
    {
      color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", // Blue-cyan gradient for current R/W
      title: study_plan.current_rw_score?.toString() || "0",
      description: "Current English R/W Score",
      label: "English R/W",
    },
    {
      color: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", // Green-teal gradient for target R/W
      title: study_plan.target_rw_score?.toString() || "800",
      description: "Target English R/W Score",
      label: "Target",
    },
  ];

  return (
    <>
      <h1 className="text-4xl font-semibold mb-8">Progress</h1>

      {/* Magic Bento Cards */}
      <div className="mb-12">
        <MagicBento
          textAutoHide={true}
          enableStars={true}
          enableSpotlight={true}
          enableBorderGlow={true}
          enableTilt={true}
          enableMagnetism={true}
          clickEffect={true}
          spotlightRadius={100}
          particleCount={22}
          glowColor="132, 0, 255"
          cardData={satCardData}
        />
      </div>

      {/* Predictive SAT Score Tracker */}
      {predictiveData && (
        <div className="max-w-4xl mb-12">
          <PredictiveSATTracker data={predictiveData} />
        </div>
      )}

      {/* Charts Section */}
      {chartsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading charts...</p>
          </div>
        </div>
      ) : (
        <>
          {/* SAT Score Progress */}
          {growthData.length > 0 && (
            <div className="max-w-4xl mb-12">
              <h2 className="text-3xl font-semibold mb-6">
                SAT Score Progress
              </h2>
              <div className="bg-white border rounded-2xl p-8">
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
                  height={350}
                  yLabel="SAT Score"
                />
              </div>
            </div>
          )}

          {/* Mock Exam Progress */}
          <div className="max-w-4xl mb-12">
            <h2 className="text-3xl font-semibold mb-6">
              Mock Exam Performance
            </h2>
            <div className="bg-white border rounded-2xl p-8">
              {mockExamData && mockExamData.recent_exams.length > 0 ? (
                <div>
                  <LineChart
                    data={mockExamData.recent_exams.map((exam) => ({
                      ...exam,
                      date: new Date(exam.completed_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                        }
                      ),
                    }))}
                    lines={[
                      {
                        dataKey: "total_score",
                        color: "#3b82f6",
                        name: "Total Score",
                      },
                    ]}
                    xKey="date"
                    height={300}
                    yLabel="Score"
                  />

                  {/* Mock Exam Summary Stats */}
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600">Total Exams</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {mockExamData.total_exams}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600">Average Score</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {Math.round(mockExamData.avg_total_score)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600">Improvement</p>
                      <p className="text-2xl font-bold text-green-600">
                        {mockExamData.improvement_velocity > 0 ? "+" : ""}
                        {Math.round(mockExamData.improvement_velocity)} pts
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600">Readiness</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {mockExamData.readiness_score}/100
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-80 text-gray-500">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Mock Exams Yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Take your first mock exam to start tracking your progress
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
                      <p className="text-sm text-blue-800">
                        <strong>Tip:</strong> Mock exams help you practice under
                        real test conditions and track your improvement over
                        time.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mastery Progress by Category */}
          {Object.keys(heatmap).length > 0 && (
            <div className="max-w-4xl mb-12">
              <h2 className="text-3xl font-semibold mb-6">
                Mastery by Category
              </h2>
              <div className="bg-white border rounded-2xl p-8">
                <BarChart
                  data={Object.entries(heatmap).map(([name, cat]) => ({
                    category: name,
                    mastery:
                      (cat.skills.reduce((sum, s) => sum + s.mastery, 0) /
                        cat.skills.length) *
                      100,
                    section: cat.section,
                  }))}
                  xKey="category"
                  yKey="mastery"
                  name="Mastery %"
                  height={300}
                  yLabel="Mastery %"
                  colorByValue={true}
                  getBarColor={(value) => {
                    if (value >= 80) return "#10b981";
                    if (value >= 60) return "#3b82f6";
                    if (value >= 40) return "#f59e0b";
                    return "#ef4444";
                  }}
                  formatYAxis={(val) => `${val}%`}
                />
              </div>
            </div>
          )}

          {/* Mastery Over Time */}
          {growthData.length > 0 &&
            growthData.some((d) => d.mastery !== undefined) && (
              <div className="max-w-4xl">
                <h2 className="text-3xl font-semibold mb-6">
                  Average Mastery Over Time
                </h2>
                <div className="bg-white border rounded-2xl p-8">
                  <AreaChart
                    data={growthData
                      .filter((d) => d.mastery !== undefined)
                      .map((point) => ({
                        ...point,
                        date: new Date(point.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        }),
                        mastery: (point.mastery || 0) * 100,
                      }))}
                    areas={[
                      {
                        dataKey: "mastery",
                        color: "#8b5cf6",
                        name: "Mastery %",
                      },
                    ]}
                    xKey="date"
                    height={300}
                    yLabel="Mastery %"
                    formatYAxis={(val) => `${val}%`}
                  />
                </div>
              </div>
            )}
        </>
      )}
    </>
  );
}
