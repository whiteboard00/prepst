"use client";

import { AIFeedbackContent } from "@/lib/types";
import { Lightbulb, BookOpen, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface AIFeedbackDisplayProps {
  feedback: AIFeedbackContent;
  isCorrect: boolean;
}

export function AIFeedbackDisplay({
  feedback,
  isCorrect,
}: AIFeedbackDisplayProps) {
  return (
    <Card className="mt-6 p-6 shadow-sm border-border/80">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-base font-semibold tracking-tight">
            AI Tutor Feedback
          </h4>
          <p className="text-xs text-muted-foreground">
            Personalized insights powered by PrepSt AI
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {isCorrect ? "Correct Attempt" : "Review & Improve"}
        </Badge>
      </div>

      <Separator className="my-5" />

      {/* Explanation */}
      <div className="mb-5 rounded-lg p-4 bg-accent/40 border border-accent">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-purple-600" />
          <h5 className="font-semibold">Explanation</h5>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {feedback.explanation}
        </p>
      </div>

      {/* Hints (if incorrect) */}
      {!isCorrect && feedback.hints.length > 0 && (
        <div className="mb-5 rounded-lg p-4 bg-amber-50/60 border border-amber-200">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-700" />
            <h5 className="font-semibold">Strategic Hints</h5>
          </div>
          <ol className="space-y-3 list-decimal pl-5 marker:text-amber-700">
            {feedback.hints.map((hint, i) => (
              <li
                key={i}
                className="text-sm leading-relaxed text-muted-foreground"
              >
                {hint}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Learning Points */}
      {feedback.learning_points.length > 0 && (
        <div className="mb-5 rounded-lg p-4 bg-emerald-50/60 border border-emerald-200">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-emerald-700" />
            <h5 className="font-semibold">Key Learning Points</h5>
          </div>
          <ul className="space-y-2">
            {feedback.learning_points.map((point, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {point}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Concepts */}
      {feedback.key_concepts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            Related Concepts:
          </span>
          {feedback.key_concepts.map((concept, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="rounded-full px-3 py-1 text-xs"
            >
              {concept}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
