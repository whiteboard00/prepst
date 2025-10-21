"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TimeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartPractice: (minutes: number) => void;
}

const timeOptions = [
  { label: "5 minutes", value: 5 },
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
];

export function TimeSelectionModal({
  isOpen,
  onClose,
  onStartPractice,
}: TimeSelectionModalProps) {
  const [selectedTime, setSelectedTime] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleStartPractice = () => {
    if (selectedTime) {
      onStartPractice(selectedTime);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="p-8 max-w-md w-full mx-4 bg-white rounded-3xl shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            How much time do you want to practice?
          </h2>
          <p className="text-gray-600 mb-8">
            Choose a time duration and we'll create a custom practice session
            for you.
          </p>

          <div className="space-y-3 mb-8">
            {timeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedTime(option.value)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  selectedTime === option.value
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="font-medium">{option.label}</div>
                <div className="text-sm text-gray-500">
                  {option.value <= 30
                    ? `~${Math.floor(option.value * 2)} questions`
                    : `~${Math.floor(option.value * 1.5)} questions`}
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleStartPractice}
              disabled={!selectedTime}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              Start Practice
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
