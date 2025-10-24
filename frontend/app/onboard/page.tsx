"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  AlertTriangle,
  User,
  BookOpen,
  Target,
  Calendar,
  CheckCircle2,
  GraduationCap,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api, StudyPlanRequest } from "@/lib/api";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ValidationError {
  field: string;
  message: string;
}

const steps = [
  {
    id: 1,
    title: "Welcome",
    description: "Choose your starting point",
  },
  {
    id: 2,
    title: "Math Scores",
    description: "Set your math targets",
  },
  {
    id: 3,
    title: "Reading & Writing",
    description: "Set your R&W targets",
  },
  {
    id: 4,
    title: "Test Date",
    description: "When's your test?",
  },
  {
    id: 5,
    title: "Complete",
    description: "Your plan is ready",
  },
];

function OnboardContent() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );
  const [hasExistingPlan, setHasExistingPlan] = useState(false);
  const [checkingPlan, setCheckingPlan] = useState(true);

  const [formData, setFormData] = useState({
    isFirstTime: true,
    currentMathScore: "",
    targetMathScore: "",
    currentRwScore: "",
    targetRwScore: "",
    testDate: undefined as Date | undefined,
  });

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
  const currentTotal = formData.isFirstTime
    ? 0
    : (parseInt(formData.currentMathScore) || 0) +
      (parseInt(formData.currentRwScore) || 0);
  const targetTotal =
    (parseInt(formData.targetMathScore) || 0) +
    (parseInt(formData.targetRwScore) || 0);

  // Real-time validation
  const validateField = (
    field: string,
    value: string | Date | undefined
  ): string | null => {
    const numValue = typeof value === "string" ? parseInt(value) : 0;

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

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
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
        current_math_score: formData.isFirstTime ? 200 : currentMath,
        target_math_score: targetMath,
        current_rw_score: formData.isFirstTime ? 200 : currentRw,
        target_rw_score: targetRw,
        test_date: format(formData.testDate, "yyyy-MM-dd"),
      };

      await api.generateStudyPlan(requestData);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create study plan"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-2xl">Welcome to Prep st</CardTitle>
              <CardDescription className="text-base">
                Let's create your personalized SAT study plan. First, tell us
                about your starting point.
              </CardDescription>
            </CardHeader>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card
                className={cn(
                  "cursor-pointer transition-all",
                  formData.isFirstTime
                    ? "bg-muted border-purple-500 ring-2 ring-purple-500"
                    : "border-gray-200 hover:shadow-md"
                )}
                onClick={() => updateFormData("isFirstTime", true)}
              >
                <CardContent className="flex items-start space-x-4 p-6">
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                      <BookOpen className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-muted-foreground mb-1 font-semibold">
                      First-time test taker
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      I haven't taken the SAT yet and want to start from the
                      basics
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={cn(
                  "cursor-pointer transition-all",
                  !formData.isFirstTime
                    ? "bg-muted border-purple-500 ring-2 ring-purple-500"
                    : "border-gray-200 hover:shadow-md"
                )}
                onClick={() => updateFormData("isFirstTime", false)}
              >
                <CardContent className="flex items-start space-x-4 p-6">
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                      <TrendingUp className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-muted-foreground mb-1 font-semibold">
                      Retaking the SAT
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      I have previous scores and want to improve them
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {hasExistingPlan && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>You already have a study plan!</strong>
                  <br />
                  Creating a new plan will replace your current one and all its
                  progress.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Math Section Scores</CardTitle>
              <CardDescription>
                Set your math score targets.{" "}
                {formData.isFirstTime
                  ? "We'll start from the basics."
                  : "Enter your current score and target."}
              </CardDescription>
            </CardHeader>

            <div className="space-y-6">
              {!formData.isFirstTime && (
                <div>
                  <Label
                    htmlFor="currentMathScore"
                    className="text-base font-medium"
                  >
                    Current Math Score
                  </Label>
                  <Input
                    id="currentMathScore"
                    type="number"
                    min="200"
                    max="800"
                    step="10"
                    placeholder="500"
                    value={formData.currentMathScore}
                    onChange={(e) =>
                      updateFormData("currentMathScore", e.target.value)
                    }
                    className={cn(
                      "mt-2",
                      validateField(
                        "currentMathScore",
                        formData.currentMathScore
                      ) && "border-red-500"
                    )}
                  />
                  {validateField(
                    "currentMathScore",
                    formData.currentMathScore
                  ) && (
                    <p className="text-sm text-red-600 mt-1">
                      {validateField(
                        "currentMathScore",
                        formData.currentMathScore
                      )}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    200-800, multiples of 10
                  </p>
                </div>
              )}

              <div>
                <Label
                  htmlFor="targetMathScore"
                  className="text-base font-medium"
                >
                  Target Math Score
                </Label>
                <Input
                  id="targetMathScore"
                  type="number"
                  min="200"
                  max="800"
                  step="10"
                  placeholder="650"
                  value={formData.targetMathScore}
                  onChange={(e) =>
                    updateFormData("targetMathScore", e.target.value)
                  }
                  className={cn(
                    "mt-2",
                    getFieldError("targetMathScore") && "border-red-500"
                  )}
                />
                {getFieldError("targetMathScore") && (
                  <p className="text-sm text-red-600 mt-1">
                    {getFieldError("targetMathScore")}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  200-800, multiples of 10
                </p>
              </div>

              {formData.isFirstTime && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <p className="text-sm text-blue-800">
                      <strong>Starting from basics:</strong> We'll begin with
                      fundamental math concepts and build up to your target
                      score.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Reading & Writing Scores</CardTitle>
              <CardDescription>
                Set your reading and writing score targets.
              </CardDescription>
            </CardHeader>

            <div className="space-y-6">
              {!formData.isFirstTime && (
                <div>
                  <Label
                    htmlFor="currentRwScore"
                    className="text-base font-medium"
                  >
                    Current Reading & Writing Score
                  </Label>
                  <Input
                    id="currentRwScore"
                    type="number"
                    min="200"
                    max="800"
                    step="10"
                    placeholder="520"
                    value={formData.currentRwScore}
                    onChange={(e) =>
                      updateFormData("currentRwScore", e.target.value)
                    }
                    className={cn(
                      "mt-2",
                      validateField(
                        "currentRwScore",
                        formData.currentRwScore
                      ) && "border-red-500"
                    )}
                  />
                  {validateField("currentRwScore", formData.currentRwScore) && (
                    <p className="text-sm text-red-600 mt-1">
                      {validateField("currentRwScore", formData.currentRwScore)}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    200-800, multiples of 10
                  </p>
                </div>
              )}

              <div>
                <Label
                  htmlFor="targetRwScore"
                  className="text-base font-medium"
                >
                  Target Reading & Writing Score
                </Label>
                <Input
                  id="targetRwScore"
                  type="number"
                  min="200"
                  max="800"
                  step="10"
                  placeholder="670"
                  value={formData.targetRwScore}
                  onChange={(e) =>
                    updateFormData("targetRwScore", e.target.value)
                  }
                  className={cn(
                    "mt-2",
                    getFieldError("targetRwScore") && "border-red-500"
                  )}
                />
                {getFieldError("targetRwScore") && (
                  <p className="text-sm text-red-600 mt-1">
                    {getFieldError("targetRwScore")}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  200-800, multiples of 10
                </p>
              </div>

              {/* Score Summary */}
              {(currentTotal > 0 || targetTotal > 0) && (
                <div className="grid grid-cols-2 gap-4">
                  {!formData.isFirstTime && currentTotal > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">
                        Current Total
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {currentTotal}
                      </p>
                      <p className="text-xs text-gray-500">out of 1600</p>
                    </div>
                  )}
                  {targetTotal > 0 && (
                    <div
                      className={cn(
                        "bg-purple-50 rounded-lg p-4 text-center border border-purple-200",
                        formData.isFirstTime && "col-span-2"
                      )}
                    >
                      <p className="text-sm text-purple-600 mb-1">
                        Target Total
                      </p>
                      <p className="text-2xl font-bold text-purple-900">
                        {targetTotal}
                      </p>
                      <p className="text-xs text-purple-600">
                        {!formData.isFirstTime &&
                          targetTotal > currentTotal &&
                          `+${targetTotal - currentTotal} points to improve`}
                        {formData.isFirstTime && "Starting from scratch"}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Test Date</CardTitle>
              <CardDescription>
                When are you planning to take the SAT? We'll create a study
                schedule based on this date.
              </CardDescription>
            </CardHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="testDate" className="text-base font-medium">
                  SAT Test Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-12 justify-start text-left font-normal mt-2",
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
                    <CalendarComponent
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
                {validateField("testDate", formData.testDate) && (
                  <p className="text-sm text-red-600 mt-1">
                    {validateField("testDate", formData.testDate)}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  We'll create a personalized study schedule based on this date
                </p>
              </div>

              {/* Summary Card */}
              <Card className="bg-gray-50 border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Study Plan Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      Starting point:
                    </span>
                    <span className="text-sm font-medium">
                      {formData.isFirstTime
                        ? "First-time test taker"
                        : `Current: ${currentTotal}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Target total:</span>
                    <span className="text-sm font-medium text-purple-600">
                      {targetTotal}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Test date:</span>
                    <span className="text-sm font-medium">
                      {formData.testDate
                        ? format(formData.testDate, "MMM dd, yyyy")
                        : "Not selected"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-2xl text-center">
                🎉 You're All Set!
              </CardTitle>
              <CardDescription className="text-center text-base">
                Your personalized SAT study plan is ready to go.
              </CardDescription>
            </CardHeader>

            <div className="space-y-4">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">
                  Study Plan Created Successfully!
                </h3>
                <p className="text-gray-600">
                  We've created a personalized study plan based on your goals
                  and timeline.
                </p>
              </div>

              <Alert className="border-blue-200 bg-blue-50">
                <GraduationCap className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Ready to start studying?</strong>
                  <br />
                  Your dashboard is ready with your personalized study plan,
                  practice sessions, and progress tracking.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (checkingPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4 min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <Card className="w-full max-w-3xl shadow-lg">
        <CardHeader className="pb-0">
          {/* Step Indicator */}
          <div className="mb-6 flex items-center justify-between">
            {steps.map((step) => (
              <div
                key={step.id}
                className="relative flex flex-1 flex-col items-center"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-300",
                    currentStep > step.id
                      ? "bg-purple-600 text-white"
                      : currentStep === step.id
                      ? "bg-purple-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <div
                  className={cn(
                    "mt-2 text-center text-sm font-medium",
                    currentStep >= step.id ? "text-gray-800" : "text-gray-500"
                  )}
                >
                  {step.title}
                </div>
                {step.id < steps.length && (
                  <div
                    className={cn(
                      "absolute top-5 left-[calc(50%+20px)] h-0.5 w-[calc(100%-40px)] -translate-y-1/2 bg-gray-200 transition-colors duration-300",
                      currentStep > step.id && "bg-purple-400"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-6 md:p-8">
          {renderStepContent()}

          {/* Error Message */}
          {error && (
            <Alert className="border-red-200 bg-red-50 mt-6">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between border-t pt-6">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span>Previous</span>
            </Button>

            {currentStep < 5 ? (
              <Button
                onClick={currentStep === 4 ? handleSubmit : handleNext}
                disabled={isLoading}
                className="flex items-center"
              >
                <span>{currentStep === 4 ? "Create Plan" : "Continue"}</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={() => router.push("/dashboard")}
                className="flex items-center"
              >
                <span>Go to Dashboard</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
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
