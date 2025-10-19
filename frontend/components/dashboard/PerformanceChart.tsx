"use client";

import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import { useState } from "react";

interface PerformanceDataPoint {
  date: string;
  thisMonth: number;
  lastMonth: number;
}

interface PerformanceChartProps {
  data?: PerformanceDataPoint[];
  title?: string;
}

const defaultData: PerformanceDataPoint[] = [
  { date: "01", thisMonth: 6, lastMonth: 8 },
  { date: "02", thisMonth: 7, lastMonth: 6 },
  { date: "03", thisMonth: 8, lastMonth: 6.5 },
  { date: "04", thisMonth: 6.5, lastMonth: 7 },
  { date: "05", thisMonth: 7, lastMonth: 8 },
  { date: "06", thisMonth: 8.5, lastMonth: 7 },
  { date: "07", thisMonth: 8, lastMonth: 7.5 },
];

const CustomTooltip = ({
  active,
  payload,
}: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg">
        <p className="text-sm font-semibold mb-2">03 May 2023</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
            <span className="text-sm">This month</span>
            <span className="text-sm font-semibold ml-auto">7h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-400"></div>
            <span className="text-sm">Last month</span>
            <span className="text-sm font-semibold ml-auto">6h</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function PerformanceChart({
  data = defaultData,
  title = "Performance",
}: PerformanceChartProps) {
  const [dateRange, setDateRange] = useState("01-07 May");

  return (
    <Card className="p-8 rounded-3xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-3xl font-bold text-gray-900">{title}</h3>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[160px] border-gray-200 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="01-07 May">01-07 May</SelectItem>
            <SelectItem value="08-14 May">08-14 May</SelectItem>
            <SelectItem value="15-21 May">15-21 May</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#9ca3af"
            fontSize={13}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#9ca3af"
            fontSize={13}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}h`}
            ticks={[0, 2, 4, 6, 8, 10, 12]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="thisMonth"
            stroke="#60A5FA"
            strokeWidth={3}
            dot={{ fill: "#60A5FA", r: 5, strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 7 }}
          />
          <Line
            type="monotone"
            dataKey="lastMonth"
            stroke="#FB923C"
            strokeWidth={3}
            dot={{ fill: "#FB923C", r: 5, strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
