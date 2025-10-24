"use client";

import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface RadarChartProps {
  data: Record<string, unknown>[];
  dataKey: string;
  categoryKey: string;
  height?: number;
  color?: string;
  name?: string;
  formatTooltip?: (value: string | number) => string;
}

export function RadarChart({
  data,
  dataKey,
  categoryKey,
  height = 400,
  color = "#8b5cf6",
  name = "Mastery",
  formatTooltip,
}: RadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsRadarChart
        data={data}
        margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
      >
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis
          dataKey={categoryKey}
          tick={{ fontSize: 12, fill: "#6b7280" }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: "#6b7280" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          }}
          formatter={(value: number) => [
            formatTooltip ? formatTooltip(value) : `${value.toFixed(1)}%`,
            name,
          ]}
        />
        <Radar
          name={name}
          dataKey={dataKey}
          stroke={color}
          fill={color}
          fillOpacity={0.6}
          dot={{
            r: 4,
            fillOpacity: 1,
            stroke: color,
            strokeWidth: 2,
          }}
        />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}
