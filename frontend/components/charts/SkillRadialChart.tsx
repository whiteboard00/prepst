"use client";

import { TrendingUp, Target } from "lucide-react";
import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const chartConfig = {
  mastery: {
    label: "Mastery",
    color: "#2b7efe",
  },
} satisfies ChartConfig;

interface SkillRadialChartProps {
  skillName: string;
  mastery: number;
  correctAttempts: number;
  totalAttempts: number;
  velocity?: number;
  plateau?: boolean;
  skillId?: string; // Add skillId for drill functionality
}

export function SkillRadialChart({
  skillName,
  mastery,
  correctAttempts,
  totalAttempts,
  velocity = 0,
  plateau = false,
  skillId,
}: SkillRadialChartProps) {
  const masteryPercentage = Math.round(mastery * 100);

  const chartData = [
    {
      mastery: masteryPercentage,
      fill: "#2b7efe",
    },
  ];

  const getVelocityText = () => {
    if (velocity > 0.05) return "🚀 Improving Fast!";
    if (velocity > 0.02) return "↗️ Steady Progress";
    if (velocity > -0.02) return "⚠️ Plateau - Need New Approach";
    return "📉 Struggling - Review Fundamentals";
  };

  const getVelocityColor = () => {
    if (velocity > 0.05) return "text-green-600";
    if (velocity > 0.02) return "text-blue-600";
    if (velocity > -0.02) return "text-orange-600";
    return "text-red-600";
  };

  const handleDrillClick = async () => {
    if (!skillId) {
      console.error("No skill ID provided for drill");
      return;
    }

    try {
      const drillSession = await api.createDrillSession(skillId, 10);
      // Navigate to practice session
      window.location.href = `/practice/${drillSession.session_id}`;
    } catch (error) {
      console.error("Failed to create drill session:", error);
      // You could add a toast notification here
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="items-center pb-2 min-h-[60px] flex items-center justify-center">
        <CardTitle className="text-sm font-medium text-center leading-tight line-clamp-3">
          {skillName}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[200px]"
        >
          <RadialBarChart
            data={chartData}
            endAngle={100}
            innerRadius={60}
            outerRadius={100}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[70, 60]}
            />
            <RadialBar dataKey="mastery" background />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-2xl font-bold"
                        >
                          {masteryPercentage}%
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 20}
                          className="fill-muted-foreground text-xs"
                        >
                          Mastery
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-xs min-h-[60px] flex items-center justify-start">
        <div className="flex items-center gap-2 leading-none font-medium">
          {correctAttempts}/{totalAttempts} correct
        </div>
        {velocity !== 0 && (
          <div className={`leading-none font-medium ${getVelocityColor()}`}>
            {getVelocityText()}
            {Math.abs(Math.round(velocity * 1000) / 10)}%
          </div>
        )}
        {plateau && (
          <div className="text-orange-600 font-semibold text-xs">
            ⚠️ Plateau
          </div>
        )}
        {skillId && (
          <Button
            onClick={handleDrillClick}
            size="sm"
            variant="outline"
            className="w-full mt-2 hover:bg-[#2b7efe] hover:text-white hover:border-[#2b7efe]"
          >
            <Target className="w-3 h-3 mr-1" />
            Drill
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
