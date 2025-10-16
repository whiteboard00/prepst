"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfidenceRatingProps {
  onSelect: (confidence: number) => void;
  autoSubmit?: boolean;
}

export function ConfidenceRating({
  onSelect,
  autoSubmit = false,
}: ConfidenceRatingProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const ratings = [
    { value: 1, label: "Guessing", color: "text-red-500" },
    { value: 2, label: "Unsure", color: "text-orange-500" },
    { value: 3, label: "Somewhat Sure", color: "text-yellow-500" },
    { value: 4, label: "Confident", color: "text-green-500" },
    { value: 5, label: "Very Confident", color: "text-blue-500" },
  ];

  const handleSelect = (value: number) => {
    setSelectedRating(value);
    if (autoSubmit) {
      onSelect(value);
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const key = parseInt(e.key);
      if (key >= 1 && key <= 5) {
        handleSelect(key);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleSelect]);

  const handleSubmit = () => {
    if (selectedRating) {
      onSelect(selectedRating);
    }
  };

  const displayRating = hoveredRating || selectedRating;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">
          How confident were you?
        </h3>
        <p className="text-sm text-gray-600 text-center">
          Rate your confidence level (1-5) or press number keys
        </p>
      </div>

      <div className="flex justify-center items-center gap-3">
        {ratings.map((rating) => (
          <button
            key={rating.value}
            onClick={() => handleSelect(rating.value)}
            onMouseEnter={() => setHoveredRating(rating.value)}
            onMouseLeave={() => setHoveredRating(null)}
            className={`
              flex flex-col items-center gap-2 p-4 rounded-xl transition-all
              ${
                selectedRating === rating.value
                  ? "bg-blue-50 border-2 border-blue-500 scale-105"
                  : "bg-gray-50 border-2 border-gray-200 hover:border-blue-300 hover:scale-105"
              }
            `}
          >
            <Star
              className={`
                w-8 h-8 transition-all
                ${
                  displayRating && displayRating >= rating.value
                    ? rating.color
                    : "text-gray-300"
                }
                ${
                  displayRating && displayRating >= rating.value
                    ? "fill-current"
                    : ""
                }
              `}
            />
            <div className="text-center">
              <div className="font-bold text-lg text-gray-700">
                {rating.value}
              </div>
              <div className="text-xs text-gray-600 whitespace-nowrap">
                {rating.label}
              </div>
            </div>
          </button>
        ))}
      </div>

      {!autoSubmit && (
        <div className="flex justify-center">
          <Button
            onClick={handleSubmit}
            disabled={!selectedRating}
            className="px-8 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
          >
            Continue
          </Button>
        </div>
      )}

      <div className="text-center">
        <p className="text-xs text-gray-500">
          Press 1-5 on your keyboard for quick selection
        </p>
      </div>
    </div>
  );
}
