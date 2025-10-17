"use client";

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AreaChartProps {
  data: Record<string, unknown>[];
  areas: Array<{
    dataKey: string;
    color: string;
    name: string;
  }>;
  xKey: string;
  xLabel?: string;
  yLabel?: string;
  height?: number;
  formatXAxis?: (value: string | number) => string;
  formatYAxis?: (value: string | number) => string;
  formatTooltip?: (value: string | number) => string;
  stacked?: boolean;
}

export function AreaChart({
  data,
  areas,
  xKey,
  xLabel,
  yLabel,
  height = 300,
  formatXAxis,
  formatYAxis,
  formatTooltip,
  stacked = false,
}: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <defs>
          {areas.map((area) => (
            <linearGradient
              key={area.dataKey}
              id={`gradient-${area.dataKey}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor={area.color} stopOpacity={0.8} />
              <stop offset="95%" stopColor={area.color} stopOpacity={0.1} />
            </linearGradient>
          ))}
        </defs>
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
        {areas.map((area) => (
          <Area
            key={area.dataKey}
            type="monotone"
            dataKey={area.dataKey}
            stroke={area.color}
            strokeWidth={2}
            fill={`url(#gradient-${area.dataKey})`}
            name={area.name}
            stackId={stacked ? "1" : undefined}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
