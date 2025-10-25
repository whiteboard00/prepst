"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { CategoryHeatmap } from "@/lib/types";
import { RadarChart } from "@/components/charts/RadarChart";
import BentoGrid from "@/components/ui/bento-grid";
import { TopicGraphView } from "@/components/charts/TopicGraphView";

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

        {/* Grid Layout for Charts */}
        {Object.keys(heatmap).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Mastery by Topic - Top Left (Wider) */}
            <div className="md:col-span-2">
              <div className="h-[350px]">
                <TopicGraphView heatmap={heatmap} />
              </div>
            </div>

            {/* Company Info - Top Right (Narrower) */}
            <div className="md:col-span-1">
              <div className="bg-white border rounded-2xl p-6 h-[350px] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4 text-gray-900">
                  Our Mission
                </h3>
                <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
                  <p>
                    We model your brain, identify your unique cognitive blocks, optimize your learning, and help you be good at everything.
                  </p>
                  
                  <div className="border-l-4 border-gray-400 pl-4 py-2 bg-gray-50">
                    <p className="font-medium text-gray-900">
                      Our competitors are in the content business.
                    </p>
                    <p className="font-bold text-gray-900">
                      We are in the cognition business.
                    </p>
                  </div>

                  <p>
                    The human brain is capable of near-continuous improvement if given the right stimulus, at the right time, in the right way.
                  </p>

                  <p className="italic bg-gray-50 p-3 rounded-lg border border-gray-200">
                    Our data isn't about quadratic equations. It's about 10,000 different ways a human mind can fail to grasp it, and 100 different ways it can be taught so that it finally clicks.
                  </p>

                  <p className="font-bold text-lg text-gray-900 pt-2">
                    We are building the world's first atlas of the human learning process.
                  </p>
                </div>
              </div>
            </div>

            {/* Mastery by Category - Bottom (Wider) */}
            <div className="md:col-span-3">
              <div className="bg-white border rounded-2xl p-8 h-[400px]">
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
              </div>
            </div>
          </div>
        )}

        {/* Introduction Text */}
        <div className="mb-8">
          <p className="text-gray-700 leading-relaxed">
            The human brain is capable of near-continuous improvement if given the right stimulus, at the right time, in the right way. 
            We model your brain, identify your unique cognitive blocks, optimize your learning, and help you be good at everything.
          </p>
        </div>

        {/* Bento Grid */}
        <BentoGrid />
      </div>
    </div>
  );
}
