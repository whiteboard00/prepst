"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SessionTopic } from "@/lib/types";

interface SessionListItemProps {
  sessionNumber: number;
  topics: SessionTopic[];
  scheduledDate: string;
  colorClass: string;
  onClick: () => void;
  estimatedTimeMinutes?: number;
}

export function SessionListItem({
  sessionNumber,
  topics,
  scheduledDate,
  colorClass,
  onClick,
  estimatedTimeMinutes,
}: SessionListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatEstimatedTime = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors">
      <div
        className="flex items-center justify-between cursor-pointer gap-4"
        onClick={onClick}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div
            className={`w-20 h-20 flex-shrink-0 rounded-2xl ${colorClass}`}
          ></div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg">Session {sessionNumber}</h3>
            {!isExpanded ? (
              <p className="text-sm text-gray-400 truncate break-words">
                {topics
                  .slice(0, 2)
                  .map((t) => t.topic_name)
                  .join(", ")}
                {topics.length > 2 && "..."}
              </p>
            ) : (
              <div className="mt-2 space-y-1">
                {topics.map((topic, idx) => (
                  <p key={idx} className="text-sm text-gray-400 break-words">
                    • {topic.topic_name}
                  </p>
                ))}
              </div>
            )}
            {estimatedTimeMinutes && (
              <p className="text-xs text-gray-500 mt-1">
                Est. {formatEstimatedTime(estimatedTimeMinutes)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
          <p className="font-medium whitespace-nowrap">
            {formatDate(scheduledDate)}
          </p>
          <div className="w-6 h-6 flex items-center justify-center">
            {topics.length > 2 && (
              <button
                onClick={handleToggle}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
