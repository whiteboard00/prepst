"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api, StudyPlanRequest } from "@/lib/api";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Calendar as CalendarIcon, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ValidationError {
  field: string;
  message: string;
}

function OnboardContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [hasExistingPlan, setHasExistingPlan] = useState(false);
  const [checkingPlan, setCheckingPlan] = useState(true);

  const [formData, setFormData] = useState({
    currentMathScore: "",
    targetMathScore: "",
    currentRwScore: "",
    targetRwScore: "",
    testDate: undefined as Date | undefined,
  });

  const [noCurrentScore, setNoCurrentScore] = useState(false);

  // Check if user already has a study plan
  useEffect(() => {
    const checkExistingPlan = async () => {
      try {
        await api.getStudyPlan();
        setHasExistingPlan(true);
      } catch {
        setHasExistingPlan(false);
      } finally {
        setCheckingPlan(false);
      }
    };
    checkExistingPlan();
  }, []);

  // Calculate total scores
  const currentTotal = noCurrentScore ? 0 : (parseInt(formData.currentMathScore) || 0) + (parseInt(formData.currentRwScore) || 0);
  const targetTotal = (parseInt(formData.targetMathScore) || 0) + (parseInt(formData.targetRwScore) || 0);

  // Handle "no current score" toggle
  useEffect(() => {
    if (noCurrentScore) {
      setFormData(prev => ({
        ...prev,
        currentMathScore: "200",
        currentRwScore: "200",
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        currentMathScore: "",
        currentRwScore: "",
      }));
    }
  }, [noCurrentScore]);

  // Real-time validation
  const validateField = (field: string, value: string | Date | undefined): string | null => {
    const numValue = typeof value === 'string' ? parseInt(value) : 0;

    switch (field) {
      case "currentMathScore":
      case "targetMathScore":
      case "currentRwScore":
      case "targetRwScore":
        if (!value || value === "") return null;
        if (numValue < 200 || numValue > 800) {
          return "Score must be between 200-800";
        }
        if (numValue % 10 !== 0) {
          return "Score must be a multiple of 10";
        }
        break;
      case "testDate":
        if (!value) return null;
        const date = value as Date;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) {
          return "Test date must be in the future";
        }
        break;
    }
    return null;
  };

  // Cross-field validation
  useEffect(() => {
    const errors: ValidationError[] = [];

    const currentMath = parseInt(formData.currentMathScore);
    const targetMath = parseInt(formData.targetMathScore);
    const currentRw = parseInt(formData.currentRwScore);
    const targetRw = parseInt(formData.targetRwScore);

    if (currentMath && targetMath && targetMath < currentMath) {
      errors.push({
        field: "targetMathScore",
        message: "Target must be ≥ current score",
      });
    }

    if (currentRw && targetRw && targetRw < currentRw) {
      errors.push({
        field: "targetRwScore",
        message: "Target must be ≥ current score",
      });
    }

    setValidationErrors(errors);
  }, [formData]);

  const getFieldError = (field: string): string | null => {
    const error = validationErrors.find((e) => e.field === field);
    return error ? error.message : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Final validation
    const currentMath = parseInt(formData.currentMathScore);
    const targetMath = parseInt(formData.targetMathScore);
    const currentRw = parseInt(formData.currentRwScore);
    const targetRw = parseInt(formData.targetRwScore);

    if (!formData.testDate) {
      setError("Please select a test date");
      return;
    }

    if (validationErrors.length > 0) {
      setError("Please fix the errors before submitting");
      return;
    }

    setIsLoading(true);

    try {
      const requestData: StudyPlanRequest = {
        current_math_score: currentMath,
        target_math_score: targetMath,
        current_rw_score: currentRw,
        target_rw_score: targetRw,
        test_date: format(formData.testDate, "yyyy-MM-dd"),
      };

      await api.generateStudyPlan(requestData);
      router.push("/dashboard/study-plan");
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


  if (checkingPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-6">
            <div className="flex items-center justify-center mb-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-purple-600">P</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">
              {hasExistingPlan ? "Create New Study Plan" : "Welcome to Prep st"}
            </h1>
            <p className="text-center text-gray-600 text-sm">
              {hasExistingPlan
                ? "This will replace your current study plan"
                : "Let's create your personalized SAT study plan"}
            </p>
          </div>

          {/* Form */}
          <div className="p-6">
            {hasExistingPlan && (
              <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-amber-900">
                    You already have an active study plan
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Creating a new plan will deactivate your current plan and all its sessions.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* No Current Score Checkbox */}
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <input
                  type="checkbox"
                  id="noCurrentScore"
                  checked={noCurrentScore}
                  onChange={(e) => setNoCurrentScore(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="noCurrentScore" className="text-xs text-gray-700 cursor-pointer">
                  I haven't taken a practice test yet (we'll start from the basics)
                </label>
              </div>

              {/* Total Score Display */}
              {(currentTotal > 0 || targetTotal > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {!noCurrentScore && currentTotal > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">Current Total</p>
                      <p className="text-2xl font-bold text-gray-900">{currentTotal}</p>
                      <p className="text-xs text-gray-500 mt-0.5">out of 1600</p>
                    </div>
                  )}
                  {targetTotal > 0 && (
                    <div className={cn(
                      "bg-purple-50 rounded-lg p-3 text-center border border-purple-200",
                      noCurrentScore && "col-span-2"
                    )}>
                      <p className="text-xs text-purple-600 mb-1">Target Total</p>
                      <p className="text-2xl font-bold text-purple-900">{targetTotal}</p>
                      <p className="text-xs text-purple-600 mt-0.5">
                        {!noCurrentScore && targetTotal > currentTotal && `+${targetTotal - currentTotal} points`}
                        {noCurrentScore && "Starting from scratch"}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Math Scores */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                  <h3 className="text-base font-semibold text-gray-900">Math Section</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {!noCurrentScore && (
                    <div className="space-y-1.5">
                      <Label htmlFor="currentMathScore" className="text-xs font-medium text-gray-700">
                        Current Score
                      </Label>
                      <Input
                        id="currentMathScore"
                        type="number"
                        min="200"
                        max="800"
                        step="10"
                        placeholder="500"
                        value={formData.currentMathScore}
                        onChange={(e) => handleChange("currentMathScore", e.target.value)}
                        className={cn(
                          "h-10",
                          validateField("currentMathScore", formData.currentMathScore) &&
                            "border-red-500"
                        )}
                        required
                      />
                      <p className="text-xs text-gray-500">200-800</p>
                    </div>
                  )}
                  <div className={cn("space-y-1.5", noCurrentScore && "col-span-2")}>
                    <Label htmlFor="targetMathScore" className="text-xs font-medium text-gray-700">
                      Target Score
                    </Label>
                    <Input
                      id="targetMathScore"
                      type="number"
                      min="200"
                      max="800"
                      step="10"
                      placeholder="650"
                      value={formData.targetMathScore}
                      onChange={(e) => handleChange("targetMathScore", e.target.value)}
                      className={cn(
                        "h-10",
                        getFieldError("targetMathScore") && "border-red-500"
                      )}
                      required
                    />
                    {getFieldError("targetMathScore") && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {getFieldError("targetMathScore")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Reading/Writing Scores */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Reading & Writing Section
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {!noCurrentScore && (
                    <div className="space-y-1.5">
                      <Label htmlFor="currentRwScore" className="text-xs font-medium text-gray-700">
                        Current Score
                      </Label>
                      <Input
                        id="currentRwScore"
                        type="number"
                        min="200"
                        max="800"
                        step="10"
                        placeholder="520"
                        value={formData.currentRwScore}
                        onChange={(e) => handleChange("currentRwScore", e.target.value)}
                        className={cn(
                          "h-10",
                          validateField("currentRwScore", formData.currentRwScore) &&
                            "border-red-500"
                        )}
                        required
                      />
                      <p className="text-xs text-gray-500">200-800</p>
                    </div>
                  )}
                  <div className={cn("space-y-1.5", noCurrentScore && "col-span-2")}>
                    <Label htmlFor="targetRwScore" className="text-xs font-medium text-gray-700">
                      Target Score
                    </Label>
                    <Input
                      id="targetRwScore"
                      type="number"
                      min="200"
                      max="800"
                      step="10"
                      placeholder="670"
                      value={formData.targetRwScore}
                      onChange={(e) => handleChange("targetRwScore", e.target.value)}
                      className={cn(
                        "h-10",
                        getFieldError("targetRwScore") && "border-red-500"
                      )}
                      required
                    />
                    {getFieldError("targetRwScore") && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {getFieldError("targetRwScore")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Test Date */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                  <h3 className="text-base font-semibold text-gray-900">Test Date</h3>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="testDate" className="text-xs font-medium text-gray-700">
                    When are you taking the SAT?
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-10 justify-start text-left font-normal",
                          !formData.testDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.testDate ? (
                          format(formData.testDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.testDate}
                        onSelect={(date) =>
                          setFormData((prev) => ({ ...prev, testDate: date }))
                        }
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-gray-500">
                    We'll create a study schedule based on this date
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-2">
                {hasExistingPlan && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-10"
                    onClick={() => router.push("/dashboard/study-plan")}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  className="flex-1 h-10 bg-purple-600 hover:bg-purple-700 text-white font-medium"
                  disabled={isLoading || validationErrors.length > 0}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      {hasExistingPlan ? "Replace Plan" : "Create Plan"}
                      <CheckCircle2 className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
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
