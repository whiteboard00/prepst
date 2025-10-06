"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, Flame, Clock, BookOpen } from "lucide-react";

interface QuickStatsCardProps {
  questionsToday?: number;
  questionsThisWeek?: number;
  currentStreak?: number;
  studyTimeThisWeek?: number; // in minutes
  topicsStudiedToday?: number;
}

export function QuickStatsCard({
  questionsToday = 0,
  questionsThisWeek = 0,
  currentStreak = 0,
  studyTimeThisWeek = 0,
  topicsStudiedToday = 0,
}: QuickStatsCardProps) {
  const formatStudyTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Study Stats</CardTitle>
        <CardDescription>Keep up the momentum!</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Questions Today */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span className="text-xs">Today</span>
            </div>
            <div className="text-2xl font-bold">{questionsToday}</div>
            <p className="text-xs text-muted-foreground">
              {questionsThisWeek} this week
            </p>
          </div>

          {/* Current Streak */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-xs">Streak</span>
            </div>
            <div className="text-2xl font-bold">
              {currentStreak}
              <span className="text-sm text-muted-foreground ml-1">days</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {currentStreak > 0 ? "Keep it going!" : "Start today!"}
            </p>
          </div>

          {/* Study Time This Week */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Study Time</span>
            </div>
            <div className="text-2xl font-bold">
              {formatStudyTime(studyTimeThisWeek)}
            </div>
            <p className="text-xs text-muted-foreground">this week</p>
          </div>

          {/* Topics Studied Today */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Topics</span>
            </div>
            <div className="text-2xl font-bold">{topicsStudiedToday}</div>
            <p className="text-xs text-muted-foreground">studied today</p>
          </div>
        </div>

        {/* Motivational Message */}
        {currentStreak >= 7 && (
          <div className="mt-4 p-3 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
            <p className="text-sm font-medium text-orange-900">
              🔥 Amazing! You're on a {currentStreak}-day streak!
            </p>
          </div>
        )}

        {questionsToday === 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              💪 Ready to practice? Start your first session today!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
