"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api, StudyPlanRequest } from "@/lib/api";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function OnboardContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    currentMathScore: "",
    targetMathScore: "",
    currentRwScore: "",
    targetRwScore: "",
    testDate: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate scores
      const currentMath = parseInt(formData.currentMathScore);
      const targetMath = parseInt(formData.targetMathScore);
      const currentRw = parseInt(formData.currentRwScore);
      const targetRw = parseInt(formData.targetRwScore);

      if (currentMath < 200 || currentMath > 800) {
        throw new Error("Current Math score must be between 200-800");
      }
      if (targetMath < 200 || targetMath > 800) {
        throw new Error("Target Math score must be between 200-800");
      }
      if (currentRw < 200 || currentRw > 800) {
        throw new Error(
          "Current Reading/Writing score must be between 200-800"
        );
      }
      if (targetRw < 200 || targetRw > 800) {
        throw new Error("Target Reading/Writing score must be between 200-800");
      }
      if (targetMath < currentMath) {
        throw new Error(
          "Target Math score must be greater than or equal to current score"
        );
      }
      if (targetRw < currentRw) {
        throw new Error(
          "Target Reading/Writing score must be greater than or equal to current score"
        );
      }

      const requestData: StudyPlanRequest = {
        current_math_score: currentMath,
        target_math_score: targetMath,
        current_rw_score: currentRw,
        target_rw_score: targetRw,
        test_date: formData.testDate,
      };

      // User ID will be extracted from auth token in the backend
      await api.generateStudyPlan(requestData);

      // Redirect to study plan view
      router.push("/study-plan");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create study plan"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-3xl">Welcome to SAT Prep</CardTitle>
          <CardDescription>
            Let&apos;s create your personalized study plan. Tell us about your
            current scores and goals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Math Scores */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Math Section</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentMathScore">Current Score</Label>
                  <Input
                    id="currentMathScore"
                    type="number"
                    min="200"
                    max="800"
                    placeholder="400"
                    value={formData.currentMathScore}
                    onChange={(e) =>
                      handleChange("currentMathScore", e.target.value)
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground">200-800</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetMathScore">Target Score</Label>
                  <Input
                    id="targetMathScore"
                    type="number"
                    min="200"
                    max="800"
                    placeholder="700"
                    value={formData.targetMathScore}
                    onChange={(e) =>
                      handleChange("targetMathScore", e.target.value)
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground">200-800</p>
                </div>
              </div>
            </div>

            {/* Reading/Writing Scores */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Reading & Writing Section
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentRwScore">Current Score</Label>
                  <Input
                    id="currentRwScore"
                    type="number"
                    min="200"
                    max="800"
                    placeholder="420"
                    value={formData.currentRwScore}
                    onChange={(e) =>
                      handleChange("currentRwScore", e.target.value)
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground">200-800</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetRwScore">Target Score</Label>
                  <Input
                    id="targetRwScore"
                    type="number"
                    min="200"
                    max="800"
                    placeholder="680"
                    value={formData.targetRwScore}
                    onChange={(e) =>
                      handleChange("targetRwScore", e.target.value)
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground">200-800</p>
                </div>
              </div>
            </div>

            {/* Test Date */}
            <div className="space-y-2">
              <Label htmlFor="testDate">SAT Test Date</Label>
              <Input
                id="testDate"
                type="date"
                value={formData.testDate}
                onChange={(e) => handleChange("testDate", e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
              />
              <p className="text-xs text-muted-foreground">
                When are you planning to take the SAT?
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating your study plan..." : "Create Study Plan"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <ProtectedRoute>
      <OnboardContent />
    </ProtectedRoute>
  );
}
