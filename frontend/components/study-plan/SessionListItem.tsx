"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  AlertCircle,
  PlayCircle
} from "lucide-react";
import { PracticeSession } from "@/lib/types";
import {
  generateSessionName,
  estimateSessionTime,
  formatTimeEstimate,
  getSessionStatus,
  getSessionColorScheme
} from "@/lib/utils/session-utils";

interface SessionListItemProps {
  session: PracticeSession;
  onClick: () => void;
}

export function SessionListItem({
  session,
  onClick,
}: SessionListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Defensive check for session object
  if (!session) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sessionDate = new Date(date);
    sessionDate.setHours(0, 0, 0, 0);

    // Check if it's today
    if (sessionDate.getTime() === today.getTime()) {
      return "Today";
    }

    // Check if it's tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (sessionDate.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    }

    // Check if it's yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (sessionDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    }

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const sessionNumber = session.session_number || 1; // Provide default value
  const sessionName = generateSessionName(session, sessionNumber);
  const timeEstimate = estimateSessionTime(session);
  const formattedTime = formatTimeEstimate(timeEstimate);
  const status = getSessionStatus(session);
  const colorScheme = getSessionColorScheme(status);

  // Calculate progress percentage
  const progressPercentage = session.total_questions
    ? Math.round((session.completed_questions || 0) / session.total_questions * 100)
    : 0;

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <PlayCircle className="w-5 h-5 text-blue-500" />;
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            Completed
          </span>
        );
      case 'in-progress':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
            {progressPercentage}% Complete
          </span>
        );
      case 'overdue':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
            Overdue
          </span>
        );
      default:
        return null;
    }
  };

  const isClickable = status !== 'completed';

  return (
    <div
      className={`
        py-3 px-4 rounded-lg transition-all duration-200
        ${isClickable ? 'hover:shadow-md cursor-pointer' : 'opacity-75'}
        ${status === 'overdue' ? 'bg-red-50 border border-red-200' : ''}
        ${status === 'in-progress' ? 'bg-blue-50 border border-blue-200' : ''}
        ${status === 'completed' ? 'bg-gray-50' : ''}
        ${status === 'upcoming' ? 'hover:bg-gray-50' : ''}
      `}
    >
      <div
        className="flex items-center justify-between gap-4"
        onClick={isClickable ? onClick : undefined}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex-shrink-0">
            {getStatusIcon()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">
                {sessionName}
              </h3>
              {getStatusBadge()}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formattedTime}
              </span>
              <span>
                {session.total_questions || session.topics?.reduce((sum, t) => sum + t.num_questions, 0) || 0} questions
              </span>
            </div>

            {!isExpanded && session.topics && session.topics.length > 0 && (
              <p className="text-sm text-gray-400 truncate break-words mt-1">
                Topics: {session.topics
                  .slice(0, 3)
                  .map((t) => t.topic_name.split(':').pop()?.trim() || t.topic_name)
                  .join(", ")}
                {session.topics.length > 3 && ` +${session.topics.length - 3} more`}
              </p>
            )}

            {isExpanded && session.topics && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Topics:</p>
                {session.topics.map((topic, idx) => (
                  <div key={idx} className="text-sm text-gray-600 flex items-center justify-between">
                    <span>• {topic.topic_name}</span>
                    <span className="text-xs text-gray-400">{topic.num_questions} questions</span>
                  </div>
                ))}
              </div>
            )}

            {status === 'in-progress' && progressPercentage > 0 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
          <p className={`font-medium whitespace-nowrap ${
            status === 'overdue' ? 'text-red-600' : ''
          }`}>
            {formatDate(session.scheduled_date)}
          </p>

          {session.topics && session.topics.length > 0 && (
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
  );
}