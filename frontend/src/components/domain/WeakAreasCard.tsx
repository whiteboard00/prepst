"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingDown } from "lucide-react";
import type { TopicPriority } from "@/lib/types";

interface WeakAreasCardProps {
  topics: TopicPriority[];
  onStudyTopic?: (topic: string) => void;
}

export function WeakAreasCard({ topics, onStudyTopic }: WeakAreasCardProps) {
  if (topics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Areas for Improvement
          </CardTitle>
          <CardDescription>Topics that need your attention</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No weak areas detected. Great job! 🎉
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          Areas for Improvement
        </CardTitle>
        <CardDescription>
          Focus on these topics to maximize your score gains
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topics.map((topic, index) => (
            <div key={topic.topic} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium truncate">
                      {topic.topic}
                    </span>
                  </div>
                  <div className="ml-8 mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Gap: {(topic.mastery_gap * 100).toFixed(0)}%</span>
                    {topic.days_since_study > 0 && (
                      <span>Last studied: {topic.days_since_study}d ago</span>
                    )}
                  </div>
                </div>
                {onStudyTopic && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStudyTopic(topic.topic)}
                    className="flex-shrink-0"
                  >
                    Study
                  </Button>
                )}
              </div>

              {/* Mastery Progress Bar */}
              <div className="ml-8">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all"
                      style={{
                        width: `${((1 - topic.mastery_gap) * 100).toFixed(0)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground w-10 text-right">
                    {((1 - topic.mastery_gap) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Priority Indicator */}
              {topic.priority_score > 2 && (
                <div className="ml-8 flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  <span className="font-medium">High Priority</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {topics.length >= 5 && (
          <div className="mt-4 pt-4 border-t">
            <Button variant="ghost" size="sm" className="w-full">
              View All Topics
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
