"use client";

import { TrendingUp } from "lucide-react";
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

const chartConfig = {
  mastery: {
    label: "Mastery",
    color: "#307bff",
  },
} satisfies ChartConfig;

interface TopicMasteryRadialChartProps {
  topicName: string;
  currentMastery: number; // 0-100
  masteryIncrease: number; // absolute percentage points
  correctAttempts: number;
  totalAttempts: number;
}

export function TopicMasteryRadialChart({
  topicName,
  currentMastery,
  masteryIncrease,
  correctAttempts,
  totalAttempts,
}: TopicMasteryRadialChartProps) {
  const chartData = [
    {
      mastery: currentMastery,
      fill: "#307bff",
    },
  ];

  const getIncreaseColor = () => {
    if (masteryIncrease > 0) return "text-green-600";
    if (masteryIncrease < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getIncreaseIcon = () => {
    if (masteryIncrease > 0) return "↗️";
    if (masteryIncrease < 0) return "↘️";
    return "➡️";
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="items-center pb-2 min-h-[60px] flex items-center justify-center">
        <CardTitle className="text-sm font-medium text-center leading-tight line-clamp-3">
          {topicName}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[200px]"
        >
          <RadialBarChart
            data={chartData}
            startAngle={90}
            endAngle={90 - currentMastery * 3.6}
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
                          {Math.round(currentMastery)}%
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
        <div className={`leading-none font-medium ${getIncreaseColor()}`}>
          <div className="flex items-center gap-1">
            <span>{getIncreaseIcon()}</span>
            <span>
              {masteryIncrease > 0 ? "+" : ""}
              {masteryIncrease.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
