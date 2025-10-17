"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface BarChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  name?: string;
  color?: string;
  xLabel?: string;
  yLabel?: string;
  height?: number;
  formatXAxis?: (value: any) => string;
  formatYAxis?: (value: any) => string;
  formatTooltip?: (value: any) => string;
  colorByValue?: boolean;
  getBarColor?: (value: number) => string;
}

export function BarChart({
  data,
  xKey,
  yKey,
  name = "Value",
  color = "#3b82f6",
  xLabel,
  yLabel,
  height = 300,
  formatXAxis,
  formatYAxis,
  formatTooltip,
  colorByValue = false,
  getBarColor,
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey={xKey}
          label={
            xLabel
              ? { value: xLabel, position: "insideBottom", offset: -5 }
              : undefined
          }
          tickFormatter={formatXAxis}
          stroke="#6b7280"
        />
        <YAxis
          label={
            yLabel
              ? { value: yLabel, angle: -90, position: "insideLeft" }
              : undefined
          }
          tickFormatter={formatYAxis}
          stroke="#6b7280"
        />
        <Tooltip
          formatter={formatTooltip}
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
          }}
        />
        <Legend />
        <Bar dataKey={yKey} name={name} radius={[8, 8, 0, 0]}>
          {colorByValue && getBarColor
            ? data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry[yKey])} />
              ))
            : data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={color} />
              ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
