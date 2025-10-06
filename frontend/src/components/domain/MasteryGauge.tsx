"use client";

interface MasteryGaugeProps {
  value: number; // 0 to 1
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
}

export function MasteryGauge({
  value,
  size = "md",
  showLabel = true,
  label,
}: MasteryGaugeProps) {
  // Ensure value is between 0 and 1
  const clampedValue = Math.max(0, Math.min(1, value));
  const percentage = Math.round(clampedValue * 100);

  // Determine color based on mastery level
  const getColor = (val: number): string => {
    if (val < 0.4) return "text-red-600";
    if (val < 0.7) return "text-yellow-600";
    return "text-green-600";
  };

  const getBackgroundColor = (val: number): string => {
    if (val < 0.4) return "from-red-500 to-red-600";
    if (val < 0.7) return "from-yellow-500 to-orange-500";
    return "from-green-500 to-emerald-600";
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      outerSize: "w-12 h-12",
      innerSize: "w-10 h-10",
      strokeWidth: 4,
      fontSize: "text-xs",
    },
    md: {
      outerSize: "w-16 h-16",
      innerSize: "w-14 h-14",
      strokeWidth: 6,
      fontSize: "text-sm",
    },
    lg: {
      outerSize: "w-24 h-24",
      innerSize: "w-20 h-20",
      strokeWidth: 8,
      fontSize: "text-lg",
    },
  };

  const config = sizeConfig[size];
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - clampedValue * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative ${config.outerSize}`}>
        {/* SVG Circle Gauge */}
        <svg className="transform -rotate-90 w-full h-full">
          {/* Background circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            fill="none"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke="url(#gradient)"
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                className={
                  clampedValue < 0.4
                    ? "text-red-500"
                    : clampedValue < 0.7
                    ? "text-yellow-500"
                    : "text-green-500"
                }
                stopColor="currentColor"
              />
              <stop
                offset="100%"
                className={
                  clampedValue < 0.4
                    ? "text-red-600"
                    : clampedValue < 0.7
                    ? "text-orange-500"
                    : "text-emerald-600"
                }
                stopColor="currentColor"
              />
            </linearGradient>
          </defs>
        </svg>

        {/* Percentage text in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`font-bold ${config.fontSize} ${getColor(clampedValue)}`}
          >
            {percentage}%
          </span>
        </div>
      </div>

      {/* Label */}
      {showLabel && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">{label || "Mastery"}</p>
        </div>
      )}
    </div>
  );
}
