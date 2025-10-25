"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Label, Legend } from "recharts";
import { api } from "@/lib/api";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  math: {
    label: "Math",
    color: "#2b7efe",
  },
  rw: {
    label: "English",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

interface ChartDataPoint {
  date: string;
  math: number;
  rw: number;
}

export function PerformanceChart() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trend, setTrend] = useState<{ percentage: number; direction: "up" | "down" } | null>(null);

  useEffect(() => {
    const loadMockExamData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await api.getMockExamPerformance(10);
        
        if (!data.recent_exams || data.recent_exams.length === 0) {
          setChartData([]);
          setIsLoading(false);
          return;
        }

        // Transform the data for the chart
        const formattedData: ChartDataPoint[] = data.recent_exams.map((exam) => {
          const date = new Date(exam.completed_at);
          return {
            date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            math: exam.math_score || 0,
            rw: exam.rw_score || 0,
          };
        });

        setChartData(formattedData);

        // Calculate trend (compare first and last exam)
        if (formattedData.length >= 2) {
          const firstTotal = formattedData[0].math + formattedData[0].rw;
          const lastTotal = formattedData[formattedData.length - 1].math + formattedData[formattedData.length - 1].rw;
          const percentChange = ((lastTotal - firstTotal) / firstTotal) * 100;
          
          setTrend({
            percentage: Math.abs(percentChange),
            direction: percentChange >= 0 ? "up" : "down",
          });
        }
      } catch (err) {
        console.error("Error loading mock exam data:", err);
        setError("Failed to load performance data");
      } finally {
        setIsLoading(false);
      }
    };

    loadMockExamData();
  }, []);

  return (
    <Card 
      className="p-8 rounded-3xl border border-gray-100"
      style={{ boxShadow: "5px 4px 30px 3px rgba(128, 128, 128, 0.2)" }}
    >
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-gray-900">
          Mock Exam Performance
        </CardTitle>
        <CardDescription className="text-gray-500">
          Your SAT scores from completed mock exams over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            {error}
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
            <p className="text-lg font-medium mb-2">No mock exams completed yet</p>
            <p className="text-sm">Complete a mock exam to see your performance here</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig}>
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={['dataMin', 700]}
              />
              <Legend />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent />}
              />
              <Line
                dataKey="math"
                type="monotone"
                stroke="var(--color-math)"
                strokeWidth={2}
                strokeOpacity={0.6}
                dot={{ fill: "var(--color-math)", stroke: "var(--color-math)", r: 4, fillOpacity: 0.2, strokeOpacity: 0.4 }}
                label={{ position: "top", fill: "var(--color-math)", fontSize: 12 }}
              />
              <Line
                dataKey="rw"
                type="monotone"
                stroke="var(--color-rw)"
                strokeWidth={2}
                strokeOpacity={0.6}
                dot={{ fill: "var(--color-rw)", stroke: "var(--color-rw)", r: 4, fillOpacity: 0.2, strokeOpacity: 0.4 }}
                label={{ position: "top", fill: "var(--color-rw)", fontSize: 12 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
      {!isLoading && !error && chartData.length > 0 && (
        <CardFooter>
          <div className="flex w-full items-start gap-2 text-sm">
            <div className="grid gap-2">
              {trend && (
                <div className="flex items-center gap-2 leading-none font-medium">
                  {trend.direction === "up" ? "Trending up" : "Trending down"} by {trend.percentage.toFixed(1)}%{" "}
                  <TrendingUp className={`h-4 w-4 ${trend.direction === "down" ? "rotate-180" : ""}`} />
                </div>
              )}
              <div className="text-muted-foreground flex items-center gap-2 leading-none">
                Based on {chartData.length} completed mock exam{chartData.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
