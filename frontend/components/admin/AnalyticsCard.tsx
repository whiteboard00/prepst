"use client";

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface AnalyticsCardProps {
  title: string;
  icon: LucideIcon;
  status: "success" | "warning" | "error" | "info";
  children: ReactNode;
}

export function AnalyticsCard({
  title,
  icon: Icon,
  status,
  children,
}: AnalyticsCardProps) {
  const statusColors = {
    success: "border-gray-400 bg-gray-50",
    warning: "border-gray-300 bg-gray-100",
    error: "border-gray-500 bg-gray-200",
    info: "border-gray-300 bg-white",
  };

  const iconColors = {
    success: "bg-gray-800 text-white",
    warning: "bg-gray-600 text-white",
    error: "bg-gray-900 text-white",
    info: "bg-gray-700 text-white",
  };

  const statusIcons = {
    success: "✓",
    warning: "⚠",
    error: "✗",
    info: "ℹ",
  };

  return (
    <div
      className={`rounded-xl border-2 p-6 shadow-lg ${statusColors[status]}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center ${iconColors[status]}`}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        </div>
        <div className="text-2xl">{statusIcons[status]}</div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
