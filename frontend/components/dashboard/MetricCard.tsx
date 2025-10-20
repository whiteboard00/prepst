import { Card } from "@/components/ui/card";
import { ThumbsUp, Clock, Zap, LucideIcon } from "lucide-react";

type MetricType = "finished" | "tracked" | "efficiency";

interface MetricCardProps {
  type: MetricType;
  value: string | number;
  change?: string;
  isPositive?: boolean;
}

const metricConfig: Record<
  MetricType,
  { icon: LucideIcon; label: string; color: string }
> = {
  finished: {
    icon: ThumbsUp,
    label: "Finished",
    color: "text-gray-700",
  },
  tracked: {
    icon: Clock,
    label: "Tracked",
    color: "text-gray-700",
  },
  efficiency: {
    icon: Zap,
    label: "Efficiency",
    color: "text-gray-700",
  },
};

export function MetricCard({
  type,
  value,
  change,
  isPositive = true,
}: MetricCardProps) {
  const config = metricConfig[type];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-5">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
        <Icon className={`w-7 h-7 ${config.color}`} />
      </div>
      <div>
        <p className="text-sm text-gray-500 mb-1.5 font-medium">{config.label}</p>
        <div className="flex items-baseline gap-3">
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {change && (
            <span
              className={`text-sm font-semibold ${
                isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {isPositive ? "↗" : "↘"} {change}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
