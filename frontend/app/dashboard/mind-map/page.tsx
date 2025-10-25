"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { CategoryHeatmap } from "@/lib/types";
import { RadarChart } from "@/components/charts/RadarChart";

export default function MindMapPage() {
  const [heatmap, setHeatmap] = useState<Record<string, CategoryHeatmap>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHeatmapData();
  }, []);

  const loadHeatmapData = async () => {
    try {
      setLoading(true);
      const heatmapResponse = await api.getSkillHeatmap();
      setHeatmap(heatmapResponse.heatmap);
    } catch (error) {
      console.error("Failed to load heatmap data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading mind map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl px-4">
        <h1 className="text-4xl font-semibold mb-8">Mind Map</h1>

        {/* Mastery by Category */}
        {Object.keys(heatmap).length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-semibold mb-6">
              Mastery by Category
            </h2>
            <div className="bg-white border rounded-2xl p-8">
              <RadarChart
                data={(() => {
                  const categoryData = Object.entries(heatmap).map(
                    ([name, cat]) => ({
                      category: name,
                      mastery:
                        (cat.skills.reduce((sum, s) => sum + s.mastery, 0) /
                          cat.skills.length) *
                        100,
                      section: cat.section,
                      totalAttempts: cat.skills.reduce(
                        (sum, s) => sum + s.total_attempts,
                        0
                      ),
                    })
                  );

                  // Sort by total attempts and take top 8, or all if fewer than 8
                  const sortedData = categoryData.sort(
                    (a, b) => b.totalAttempts - a.totalAttempts
                  );
                  return sortedData.slice(0, 8);
                })()}
                dataKey="mastery"
                categoryKey="category"
                name="Mastery %"
                height={350}
                formatTooltip={(val) => `${Number(val).toFixed(1)}%`}
              />
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Average Mastery:</span>
                  <span className="font-bold text-purple-600">
                    {(() => {
                      const categoryData = Object.entries(heatmap).map(
                        ([name, cat]) =>
                          (cat.skills.reduce(
                            (sum, s) => sum + s.mastery,
                            0
                          ) /
                            cat.skills.length) *
                          100
                      );
                      return `${(
                        categoryData.reduce((sum, val) => sum + val, 0) /
                        categoryData.length
                      ).toFixed(1)}%`;
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
