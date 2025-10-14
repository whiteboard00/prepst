"use client";

import { AIFeedbackContent } from "@/lib/types";
import { Sparkles, Lightbulb, BookOpen, Target } from "lucide-react";

interface AIFeedbackDisplayProps {
  feedback: AIFeedbackContent;
  isCorrect: boolean;
}

export function AIFeedbackDisplay({
  feedback,
  isCorrect,
}: AIFeedbackDisplayProps) {
  return (
    <div className="mt-6 p-6 rounded-xl bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border-2 border-purple-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className="text-lg font-bold text-purple-900">
            AI Tutor Feedback
          </h4>
          <p className="text-xs text-purple-600">
            Personalized insights powered by PrepSt AI
          </p>
        </div>
      </div>

      {/* Explanation */}
      <div className="mb-5 bg-white/70 rounded-lg p-4 border border-purple-100">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-purple-600" />
          <h5 className="font-semibold text-gray-800">Explanation</h5>
        </div>
        <p className="text-gray-700 leading-relaxed">{feedback.explanation}</p>
      </div>

      {/* Hints (if incorrect) */}
      {!isCorrect && feedback.hints.length > 0 && (
        <div className="mb-5 bg-white/70 rounded-lg p-4 border border-amber-100">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-600" />
            <h5 className="font-semibold text-gray-800">Strategic Hints</h5>
          </div>
          <ul className="space-y-2">
            {feedback.hints.map((hint, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-amber-700">
                  {i + 1}
                </span>
                <span className="text-gray-700 leading-relaxed flex-1">
                  {hint}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Learning Points */}
      {feedback.learning_points.length > 0 && (
        <div className="mb-5 bg-white/70 rounded-lg p-4 border border-green-100">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-green-600" />
            <h5 className="font-semibold text-gray-800">Key Learning Points</h5>
          </div>
          <ul className="space-y-2">
            {feedback.learning_points.map((point, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-2" />
                <span className="text-gray-700 leading-relaxed flex-1">
                  {point}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Concepts */}
      {feedback.key_concepts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-semibold text-gray-600">
            Related Concepts:
          </span>
          {feedback.key_concepts.map((concept, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium border border-purple-200"
            >
              {concept}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
