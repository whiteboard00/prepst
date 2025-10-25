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
    title: "Study Plan",
    description: "Set your pace & schedule",
  },
  {
    id: 3,
    title: "Diagnostic",
    description: "Optional baseline test",
  },
  {
    id: 4,
    title: "Goals",
    description: "Scores & test date",
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
    weeklyStudyHours: 20,
    mockTestDay: "saturday",
    currentMathScore: "",
    targetMathScore: "",
    currentEnglishScore: "",
    targetEnglishScore: "",
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

  // Restore onboarding progress if returning from diagnostic test
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnFromDiagnostic = params.get('returnFromDiagnostic');

    if (returnFromDiagnostic === 'true') {
      const savedProgress = localStorage.getItem('onboardingProgress');
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        // Convert testDate string back to Date object if it exists
        if (progress.testDate) {
          progress.testDate = new Date(progress.testDate);
        }
        setFormData(progress);
        setCurrentStep(4); // Go to step 4 (Goals)
        localStorage.removeItem('onboardingProgress');
      }
    }
  }, []);

  // Calculate total scores
  const currentMath = parseInt(formData.currentMathScore) || 0;
  const targetMath = parseInt(formData.targetMathScore) || 0;
  const currentEnglish = parseInt(formData.currentEnglishScore) || 0;
  const targetEnglish = parseInt(formData.targetEnglishScore) || 0;

  const currentTotal = formData.isFirstTime ? 0 : currentMath + currentEnglish;
  const targetTotal = targetMath + targetEnglish;

  // Real-time validation
  const validateField = (
    field: string,
    value: string | Date | undefined
  ): string | null => {
    const numValue = typeof value === "string" ? parseInt(value) : 0;

    switch (field) {
      case "currentMathScore":
      case "targetMathScore":
      case "currentEnglishScore":
      case "targetEnglishScore":
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
    const currentEnglish = parseInt(formData.currentEnglishScore);
    const targetEnglish = parseInt(formData.targetEnglishScore);

    if (currentMath && targetMath && targetMath < currentMath) {
      errors.push({
        field: "targetMathScore",
        message: "Target must be ≥ current score",
      });
    }

    if (currentEnglish && targetEnglish && targetEnglish < currentEnglish) {
      errors.push({
        field: "targetEnglishScore",
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
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateFormData = (field: string, value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError(null);

    // Final validation
    const currentMath = parseInt(formData.currentMathScore);
    const targetMath = parseInt(formData.targetMathScore);

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
      const currentEnglish = parseInt(formData.currentEnglishScore);
      const targetEnglish = parseInt(formData.targetEnglishScore);

      // For now, just use the basic study plan request
      // TODO: In the future, pass weeklyStudyHours and mockTestDay to study plan generation
      const requestData: StudyPlanRequest = {
        current_math_score: formData.isFirstTime ? 200 : currentMath,
        target_math_score: targetMath,
        current_rw_score: formData.isFirstTime ? 200 : currentEnglish,
        target_rw_score: targetEnglish,
        test_date: format(formData.testDate, "yyyy-MM-dd"),
      };

      // Start async plan generation
      await api.generateStudyPlan(requestData);

      // Mark onboarding as complete
      await api.post("/api/complete-onboarding");

      // Redirect to dashboard
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
                    ? "bg-muted border-[#866ffe] ring-2 ring-[#866ffe]"
                    : "border-gray-200 hover:shadow-md"
                )}
                onClick={() => updateFormData("isFirstTime", true)}
              >
                <CardContent className="flex items-start space-x-4 p-6">
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#866ffe]/10">
                      <BookOpen className="h-6 w-6 text-[#866ffe]" />
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
                    ? "bg-muted border-[#866ffe] ring-2 ring-[#866ffe]"
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
              <CardTitle className="text-2xl">
                Set Your Study Pace & Schedule
              </CardTitle>
              <CardDescription className="text-base">
                Help us create a personalized study plan that fits your schedule.
              </CardDescription>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Weekly Study Hours */}
              <Card className="border-gray-200">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">
                        Weekly Study Hours
                      </h3>
                      <p className="text-sm text-gray-600">
                        How many hours per week can you dedicate to SAT prep?
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Input
                        id="weeklyStudyHours"
                        type="number"
                        min="1"
                        max="40"
                        value={formData.weeklyStudyHours}
                        onChange={(e) =>
                          updateFormData("weeklyStudyHours", parseInt(e.target.value) || 1)
                        }
                        className="w-24 text-lg font-semibold"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700">hours/week</span>
                        <span className="text-xs text-gray-500">
                          ~{Math.round((formData.weeklyStudyHours / 7) * 60)} min/day
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Mock Test Day */}
              <Card className="border-gray-200">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">
                        Mock Test Day
                      </h3>
                      <p className="text-sm text-gray-600">
                        Which day would you like to take mock exams?
                      </p>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map(
                        (day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => updateFormData("mockTestDay", day)}
                            className={cn(
                              "py-3 px-1 rounded-lg text-xs font-semibold transition-all border-2",
                              formData.mockTestDay === day
                                ? "bg-[#866ffe] text-white border-[#866ffe]"
                                : "bg-white text-gray-700 border-gray-200 hover:border-[#866ffe]"
                            )}
                          >
                            {day.slice(0, 3).toUpperCase()}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-2xl text-center">
                📊 Diagnostic Test
              </CardTitle>
              <CardDescription className="text-center text-base">
                Take an optional diagnostic test to establish your baseline mastery
              </CardDescription>
            </CardHeader>

            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold">
                  Optional Diagnostic Assessment
                </h3>
              </div>

              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 mb-2">
                        Why take the diagnostic test?
                      </h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>
                          • Assess your current mastery level in each SAT subtopic
                        </li>
                        <li>
                          • Identify specific knowledge gaps and weak areas
                        </li>
                        <li>
                          • Get a more accurate baseline for your study plan
                        </li>
                        <li>• Receive targeted practice recommendations</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>This test is optional.</strong> You can skip it and continue
                  to set your goals. The diagnostic will return you to onboarding after completion.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-2xl">Set Your Goals</CardTitle>
              <CardDescription className="text-base">
                Set your target scores and test date.{" "}
                {formData.isFirstTime
                  ? "We'll start from the basics."
                  : "Enter your current scores and targets."}
              </CardDescription>
            </CardHeader>

            <div className="space-y-12">
              {/* Math and English Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Math Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-center">Math</h3>

                  {!formData.isFirstTime && (
                    <div className="text-center">
                      <Label
                        htmlFor="currentMathScore"
                        className="text-base font-medium block text-center"
                      >
                        Current Math Score
                      </Label>
                      <div className="flex justify-center mt-2">
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
                            "w-32",
                            validateField(
                              "currentMathScore",
                              formData.currentMathScore
                            ) && "border-red-500"
                          )}
                        />
                      </div>
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

                  <div className="text-center">
                    <Label
                      htmlFor="targetMathScore"
                      className="text-base font-medium block text-center"
                    >
                      Target Math Score
                    </Label>
                    <div className="flex justify-center mt-2">
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
                          "w-32",
                          getFieldError("targetMathScore") && "border-red-500"
                        )}
                      />
                    </div>
                    {getFieldError("targetMathScore") && (
                      <p className="text-sm text-red-600 mt-1">
                        {getFieldError("targetMathScore")}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      200-800, multiples of 10
                    </p>
                  </div>

                  {/* Math Progress Circle */}
                  {formData.targetMathScore && (
                    <div className="flex justify-center">
                      <div className="relative w-32 h-32">
                        <svg
                          className="w-32 h-32 transform -rotate-90"
                          viewBox="0 0 36 36"
                        >
                          <path
                            className="text-gray-200"
                            stroke="currentColor"
                            strokeWidth="3"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-green-500"
                            stroke="currentColor"
                            strokeWidth="3"
                            fill="none"
                            strokeDasharray={`${
                              (parseInt(formData.targetMathScore) / 800) * 100
                            }, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold text-green-500">
                            {formData.targetMathScore}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* English Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-center">English</h3>

                  {!formData.isFirstTime && (
                    <div className="text-center">
                      <Label
                        htmlFor="currentEnglishScore"
                        className="text-base font-medium block text-center"
                      >
                        Current English Score
                      </Label>
                      <div className="flex justify-center mt-2">
                        <Input
                          id="currentEnglishScore"
                          type="number"
                          min="200"
                          max="800"
                          step="10"
                          placeholder="520"
                          value={formData.currentEnglishScore}
                          onChange={(e) =>
                            updateFormData(
                              "currentEnglishScore",
                              e.target.value
                            )
                          }
                          className={cn(
                            "w-32",
                            validateField(
                              "currentEnglishScore",
                              formData.currentEnglishScore
                            ) && "border-red-500"
                          )}
                        />
                      </div>
                      {validateField(
                        "currentEnglishScore",
                        formData.currentEnglishScore
                      ) && (
                        <p className="text-sm text-red-600 mt-1">
                          {validateField(
                            "currentEnglishScore",
                            formData.currentEnglishScore
                          )}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        200-800, multiples of 10
                      </p>
                    </div>
                  )}

                  <div className="text-center">
                    <Label
                      htmlFor="targetEnglishScore"
                      className="text-base font-medium block text-center"
                    >
                      Target English Score
                    </Label>
                    <div className="flex justify-center mt-2">
                      <Input
                        id="targetEnglishScore"
                        type="number"
                        min="200"
                        max="800"
                        step="10"
                        placeholder="670"
                        value={formData.targetEnglishScore}
                        onChange={(e) =>
                          updateFormData("targetEnglishScore", e.target.value)
                        }
                        className={cn(
                          "w-32",
                          getFieldError("targetEnglishScore") &&
                            "border-red-500"
                        )}
                      />
                    </div>
                    {getFieldError("targetEnglishScore") && (
                      <p className="text-sm text-red-600 mt-1">
                        {getFieldError("targetEnglishScore")}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      200-800, multiples of 10
                    </p>
                  </div>

                  {/* English Progress Circle */}
                  {formData.targetEnglishScore && (
                    <div className="flex justify-center">
                      <div className="relative w-32 h-32">
                        <svg
                          className="w-32 h-32 transform -rotate-90"
                          viewBox="0 0 36 36"
                        >
                          <path
                            className="text-gray-200"
                            stroke="currentColor"
                            strokeWidth="3"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-pink-500"
                            stroke="currentColor"
                            strokeWidth="3"
                            fill="none"
                            strokeDasharray={`${
                              (parseInt(formData.targetEnglishScore) / 800) *
                              100
                            }, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold text-pink-500">
                            {formData.targetEnglishScore}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Total Section */}
              {(formData.targetMathScore || formData.targetEnglishScore) && (
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-black">
                    Total: {targetTotal}
                  </h3>
                </div>
              )}

              {formData.isFirstTime && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <p className="text-sm text-blue-800">
                      <strong>Starting from basics:</strong> We'll begin with
                      fundamental concepts and build up to your target scores.
                    </p>
                  </div>
                </div>
              )}

              {/* Test Date Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">SAT Test Date</h3>
                <Label htmlFor="testDate" className="text-base font-medium">
                  When are you planning to take the SAT?
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
              {formData.testDate && (formData.targetMathScore || formData.targetEnglishScore) && (
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
                      <span className="text-sm font-medium text-[#866ffe]">
                        {targetTotal}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Test date:</span>
                      <span className="text-sm font-medium">
                        {format(formData.testDate, "MMM dd, yyyy")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Weekly study:</span>
                      <span className="text-sm font-medium">
                        {formData.weeklyStudyHours} hours
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Mock test day:</span>
                      <span className="text-sm font-medium capitalize">
                        {formData.mockTestDay}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (checkingPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#866ffe]/5 via-white to-[#866ffe]/5">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#866ffe]"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4 min-h-screen bg-gradient-to-br from-[#866ffe]/5 via-white to-[#866ffe]/5">
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
                      ? "bg-[#866ffe] text-white"
                      : currentStep === step.id
                      ? "bg-[#866ffe] text-white"
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
                      currentStep > step.id && "bg-[#866ffe]/70"
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

            {currentStep === 3 ? (
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={handleNext}
                  className="flex items-center"
                >
                  <span>Skip</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <Button
                  onClick={() => {
                    localStorage.setItem('onboardingProgress', JSON.stringify(formData));
                    router.push('/diagnostic-test?returnToOnboarding=true');
                  }}
                  className="flex items-center bg-black hover:bg-gray-800"
                >
                  <span>Take Diagnostic Test</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={currentStep === 4 ? handleSubmit : handleNext}
                disabled={isLoading}
                className="flex items-center"
              >
                <span>{currentStep === 4 ? "Complete Onboarding" : "Continue"}</span>
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
