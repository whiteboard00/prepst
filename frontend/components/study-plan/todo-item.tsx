"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock } from "lucide-react";
import { TodoSession } from "./types";
import {
  generateSessionName,
  estimateSessionTime,
  formatTimeEstimate,
  getSessionStatus,
} from "@/lib/utils/session-utils";
import { useRouter } from "next/navigation";

interface TodoItemProps {
  todo: TodoSession;
  onToggle: () => void;
}

// Helper function to get session emoji and color
function getSessionEmojiAndColor(session: TodoSession) {
  if (!session) {
    return {
      emoji: "📚",
      badgeColor: "bg-gray-500",
    };
  }

  const sessionName = generateSessionName(session) || "Session";
  const sessionNumber = session.session_number || 1;

  const colorPalettes = [
    { emoji: "📊", badgeColor: "bg-blue-500" },
    { emoji: "📚", badgeColor: "bg-green-500" },
    { emoji: "🎯", badgeColor: "bg-purple-500" },
    { emoji: "📝", badgeColor: "bg-orange-500" },
    { emoji: "🧮", badgeColor: "bg-pink-500" },
    { emoji: "🔬", badgeColor: "bg-cyan-500" },
    { emoji: "🌍", badgeColor: "bg-emerald-500" },
    { emoji: "⚡", badgeColor: "bg-yellow-500" },
  ];

  const colorIndex = (sessionNumber - 1) % colorPalettes.length;

  if (
    sessionName.includes("Math") ||
    sessionName.includes("Algebra") ||
    sessionName.includes("Geometry")
  ) {
    return colorPalettes[0];
  } else if (
    sessionName.includes("Reading") ||
    sessionName.includes("Writing") ||
    sessionName.includes("Literature")
  ) {
    return colorPalettes[1];
  } else if (
    sessionName.includes("Science") ||
    sessionName.includes("Physics") ||
    sessionName.includes("Chemistry")
  ) {
    return colorPalettes[5];
  } else if (
    sessionName.includes("History") ||
    sessionName.includes("Social")
  ) {
    return colorPalettes[6];
  } else if (sessionName.includes("Mixed") || sessionName.includes("Review")) {
    return colorPalettes[2];
  }
  
  // Default fallback
  return colorPalettes[colorIndex];
}

// Helper function to get session progress
function getSessionProgress(session: TodoSession) {
  if (!session) return 0;
  const totalQuestions = session.total_questions || 0;
  const completedQuestions = session.completed_questions || 0;
  if (totalQuestions === 0) return 0;
  return Math.round((completedQuestions / totalQuestions) * 100);
}

export function TodoItem({ todo, onToggle }: TodoItemProps) {
  const router = useRouter();

  const status = getSessionStatus(todo);
  const progress = getSessionProgress(todo);
  const { emoji, badgeColor } = getSessionEmojiAndColor(todo) || { emoji: "📚", badgeColor: "bg-gray-500" };
  const isMockTest = todo.id === "mock-test" || todo.id === "mock-test-2";
  const sessionName = isMockTest ? "Full-Length Mock Test" : (generateSessionName(todo) || `Session ${todo.session_number || 1}`);
  const timeEstimate = isMockTest ? "~2 hr 14 min" : formatTimeEstimate(estimateSessionTime(todo) || 30);

  const completed = status === "completed";

  const handleClick = () => {
    if (status !== "completed") {
      // Check if this is a mock test session
      if (todo.id === "mock-test" || todo.id === "mock-test-2") {
        router.push("/mock-exam");
      } else {
        router.push(`/practice/${todo.id}`);
      }
    }
  };

  const getPriorityBadge = () => {
    if (!todo.priority) return null;
    
    const priorityConfig = {
      important: { label: "Important", className: "bg-red-500 text-white" },
      "new-product": { label: "New", className: "bg-blue-500 text-white" },
      delayed: { label: "Delayed", className: "bg-yellow-500 text-white" },
    };

    const config = priorityConfig[todo.priority];
    return (
      <Badge className={`${config.className} text-xs`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div
      className={`mb-2 rounded-lg border p-3 transition-all hover:shadow-md ${
        isMockTest ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" : "bg-card"
      } ${completed ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        {/* <Checkbox
          checked={completed}
          onCheckedChange={onToggle}
          className="mt-1 rounded-none border-gray-400 data-[state=checked]:bg-gray-500 data-[state=checked]:border-gray-500"
        /> */}

        {/* Content */}
        <div className="flex-1 cursor-pointer" onClick={handleClick}>
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{emoji}</span>
              <div>
                <h3
                  className={`text-foreground text-sm font-medium ${
                    completed ? "line-through" : ""
                  }`}
                >
                  {sessionName}
                </h3>
                <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeEstimate}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getPriorityBadge()}
            </div>
          </div>

          {/* Progress Bar */}
          {progress > 0 && (
            <div className="mb-2 flex items-center gap-2">
              <Progress value={progress} className="h-1.5 flex-1" />
              <span className="text-muted-foreground text-xs">{progress}%</span>
            </div>
          )}

          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                status === "completed"
                  ? "bg-green-500"
                  : status === "in-progress"
                  ? "bg-blue-500"
                  : status === "overdue"
                  ? "bg-red-500"
                  : "bg-gray-400"
              }`}
            />
            <span className="text-muted-foreground text-xs capitalize">
              {status.replace("-", " ")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
