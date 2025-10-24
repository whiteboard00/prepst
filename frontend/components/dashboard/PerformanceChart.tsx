"use client";

import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

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

const chartData = [
  { month: "January", math: 186, reading: 80, writing: 45 },
  { month: "February", math: 305, reading: 200, writing: 120 },
  { month: "March", math: 237, reading: 120, writing: 90 },
  { month: "April", math: 73, reading: 190, writing: 110 },
  { month: "May", math: 209, reading: 130, writing: 85 },
  { month: "June", math: 214, reading: 140, writing: 95 },
];

const chartConfig = {
  math: {
    label: "Math",
    color: "#2b7efe",
  },
  reading: {
    label: "Reading",
    color: "var(--chart-2)",
  },
  writing: {
    label: "Writing",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function PerformanceChart() {
  return (
    <Card className="p-8 rounded-3xl shadow-sm border border-gray-100">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-gray-900">
          Performance
        </CardTitle>
        <CardDescription className="text-gray-500">
          Showing practice questions completed by subject over the last 6 months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="writing"
              type="natural"
              fill="var(--color-writing)"
              fillOpacity={0.4}
              stroke="var(--color-writing)"
              stackId="a"
            />
            <Area
              dataKey="reading"
              type="natural"
              fill="var(--color-reading)"
              fillOpacity={0.4}
              stroke="var(--color-reading)"
              stackId="a"
            />
            <Area
              dataKey="math"
              type="natural"
              fill="var(--color-math)"
              fillOpacity={0.4}
              stroke="var(--color-math)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              Trending up by 12.5% this month <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              January - June 2024
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
