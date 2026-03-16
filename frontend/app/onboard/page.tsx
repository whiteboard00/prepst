"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  AlertTriangle,
  BookOpen,
  Target,
  Calendar,
  CheckCircle2,
  GraduationCap,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useCourseConfig } from "@/contexts/CourseContext";
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
    description: "Starting point",
  },
  {
    id: 2,
    title: "Schedule",
    description: "Pace & availability",
  },
  {
    id: 3,
    title: "Diagnostic",
    description: "Optional test",
  },
  {
    id: 4,
    title: "Goals",
    description: "Scores & dates",
  },
];

function OnboardContent() {
  const router = useRouter();
  const { sectionScoreMin, sectionScoreMax, scoreIncrement, course } = useCourseConfig();
  const courseName = course?.name ?? "SAT";
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
    weeklyStudyHours: 10,
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

  // Restore onboarding progress
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnFromDiagnostic = params.get("returnFromDiagnostic");

    if (returnFromDiagnostic === "true") {
      const savedProgress = localStorage.getItem("onboardingProgress");
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        if (progress.testDate) {
          progress.testDate = new Date(progress.testDate);
        }
        setFormData(progress);
        setCurrentStep(4);
        localStorage.removeItem("onboardingProgress");
      }
    }
  }, []);

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateField = (field: string, value: any): string | null => {
    const numValue = typeof value === "string" ? parseInt(value) : 0;
    switch (field) {
      case "currentMathScore":
      case "targetMathScore": {
        if (!value || value === "") return null;
        const mathMin = sectionScoreMin("math");
        const mathMax = sectionScoreMax("math");
        if (numValue < mathMin || numValue > mathMax) return `Score must be ${mathMin}-${mathMax}`;
        if (numValue % scoreIncrement !== 0) return `Score must be multiple of ${scoreIncrement}`;
        break;
      }
      case "currentEnglishScore":
      case "targetEnglishScore": {
        if (!value || value === "") return null;
        const rwMin = sectionScoreMin("reading_writing");
        const rwMax = sectionScoreMax("reading_writing");
        if (numValue < rwMin || numValue > rwMax) return `Score must be ${rwMin}-${rwMax}`;
        if (numValue % scoreIncrement !== 0) return `Score must be multiple of ${scoreIncrement}`;
        break;
      }
      case "testDate":
        if (!value) return null;
        const date = value as Date;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) return "Must be future date";
        break;
    }
    return null;
  };

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    setError(null);

    // Validate scores
    const currentMath = parseInt(formData.currentMathScore);
    const targetMath = parseInt(formData.targetMathScore);
    const currentEnglish = parseInt(formData.currentEnglishScore);
    const targetEnglish = parseInt(formData.targetEnglishScore);

    // Check if target scores are valid numbers
    if (isNaN(targetMath) || isNaN(targetEnglish)) {
      setError("Please enter valid target scores");
      return;
    }

    // Check score ranges
    const mathMin = sectionScoreMin("math");
    const mathMax = sectionScoreMax("math");
    const rwMin = sectionScoreMin("reading_writing");
    const rwMax = sectionScoreMax("reading_writing");
    if (
      targetMath < mathMin ||
      targetMath > mathMax ||
      targetEnglish < rwMin ||
      targetEnglish > rwMax
    ) {
      setError(`Target scores must be between ${mathMin} and ${mathMax}`);
      return;
    }

    // If not first time, validate current scores too
    if (!formData.isFirstTime) {
      if (isNaN(currentMath) || isNaN(currentEnglish)) {
        setError("Please enter your current scores");
        return;
      }
      if (
        currentMath < mathMin ||
        currentMath > mathMax ||
        currentEnglish < rwMin ||
        currentEnglish > rwMax
      ) {
        setError(`Current scores must be between ${mathMin} and ${mathMax}`);
        return;
      }
    }

    if (!formData.testDate) {
      setError("Please select a test date");
      return;
    }

    setIsLoading(true);

    try {
      const requestData: StudyPlanRequest = {
        current_math_score: formData.isFirstTime ? mathMin : currentMath,
        target_math_score: targetMath,
        current_rw_score: formData.isFirstTime ? rwMin : currentEnglish,
        target_rw_score: targetEnglish,
        test_date: format(formData.testDate, "yyyy-MM-dd"),
      };

      await api.generateStudyPlan(requestData);
      await api.post("/api/complete-onboarding");
      window.location.assign("/dashboard");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create study plan";
      // User-friendly error for the specific API validation error
      if (
        errorMessage.includes("int_type") ||
        errorMessage.includes("Input should be a valid integer")
      ) {
        setError("Please ensure all score fields are valid numbers.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Shared Animation Variants
  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" as const },
    },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
  };

  const cardVariants = {
    hover: {
      y: -4,
      shadow:
        "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    },
    tap: { scale: 0.98 },
  };

  if (checkingPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleSkip = async () => {
    try {
      await api.post("/api/complete-onboarding");
      router.push("/dashboard");
    } catch (err) {
      console.error("Error skipping onboarding:", err);
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-card rounded-[2rem] shadow-2xl border border-border/40 p-10 md:p-16 relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        {/* Close Button */}
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 z-20 p-2 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Skip onboarding"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep} of 4
            </span>
            <div className="w-32 h-2 bg-accent rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / 4) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>
          </div>

          <div className="w-full">
            <AnimatePresence mode="wait">
              {/* STEP 1: WELCOME */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-8"
                >
                  {/* Header */}
                  <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-primary/10 rounded-[2rem] mb-6 rotate-3 hover:rotate-0 transition-transform duration-300">
                      <GraduationCap className="w-12 h-12 text-primary" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
                      Let's customize your journey
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                      Tell us about your experience with the {courseName} so we can build
                      the perfect plan for you.
                    </p>
                  </div>

                  {/* Features Grid */}
                  <div className="grid md:grid-cols-2 gap-4 mb-12">
                    <motion.button
                      variants={cardVariants}
                      whileHover="hover"
                      whileTap="tap"
                      onClick={() => updateFormData("isFirstTime", true)}
                      className={cn(
                        "bg-accent/30 p-6 rounded-2xl border border-border/50 flex items-start gap-4 hover:bg-accent/50 transition-colors text-left relative",
                        formData.isFirstTime && "ring-2 ring-primary"
                      )}
                    >
                      <div className="p-2.5 bg-background rounded-xl shadow-sm">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">
                          First-time
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          I'm new to the {courseName}. I want to start from the basics
                          and build a strong foundation.
                        </p>
                      </div>
                      {formData.isFirstTime && (
                        <div className="absolute top-4 right-4">
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        </div>
                      )}
                    </motion.button>

                    <motion.button
                      variants={cardVariants}
                      whileHover="hover"
                      whileTap="tap"
                      onClick={() => updateFormData("isFirstTime", false)}
                      className={cn(
                        "bg-accent/30 p-6 rounded-2xl border border-border/50 flex items-start gap-4 hover:bg-accent/50 transition-colors text-left relative",
                        !formData.isFirstTime && "ring-2 ring-primary"
                      )}
                    >
                      <div className="p-2.5 bg-background rounded-xl shadow-sm">
                        <Target className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">
                          Retaking
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          I want to improve my previous score. I need advanced
                          practice and targeted drills.
                        </p>
                      </div>
                      {!formData.isFirstTime && (
                        <div className="absolute top-4 right-4">
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        </div>
                      )}
                    </motion.button>
                  </div>

                  {hasExistingPlan && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-accent/30 border border-border/50 rounded-lg p-4 flex items-start gap-3 mb-12"
                    >
                      <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                      <div className="text-sm text-muted-foreground">
                        <strong>Note:</strong> You already have a plan.
                        Continuing will replace it.
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* STEP 2: SCHEDULE */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-8"
                >
                  {/* Header */}
                  <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-primary/10 rounded-[2rem] mb-6 rotate-3 hover:rotate-0 transition-transform duration-300">
                      <Calendar className="w-12 h-12 text-primary" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
                      Your study schedule
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                      Consistency is key. Set a realistic pace you can stick to.
                    </p>
                  </div>

                  <div className="grid gap-4 mb-12">
                    {/* Hours Slider */}
                    <div className="bg-accent/30 rounded-2xl p-6 border border-border/50">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-background rounded-xl shadow-sm">
                            <Clock className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">
                              Weekly Commitment
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Hours per week
                            </p>
                          </div>
                        </div>
                        <div className="text-3xl font-bold text-primary">
                          {formData.weeklyStudyHours}{" "}
                          <span className="text-lg font-medium text-muted-foreground">
                            hrs
                          </span>
                        </div>
                      </div>

                      <input
                        type="range"
                        min="1"
                        max="40"
                        value={formData.weeklyStudyHours}
                        onChange={(e) =>
                          updateFormData(
                            "weeklyStudyHours",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        <span>Casual (5h)</span>
                        <span>Serious (20h)</span>
                        <span>Intense (40h)</span>
                      </div>
                    </div>

                    {/* Mock Test Day */}
                    <div className="bg-accent/30 rounded-2xl p-6 border border-border/50">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-background rounded-xl shadow-sm">
                          <Calendar className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            Mock Test Day
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Best day for full-length practice exams
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                        {[
                          "sunday",
                          "monday",
                          "tuesday",
                          "wednesday",
                          "thursday",
                          "friday",
                          "saturday",
                        ].map((day) => (
                          <button
                            key={day}
                            onClick={() => updateFormData("mockTestDay", day)}
                            className={cn(
                              "aspect-square rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center gap-1 border",
                              formData.mockTestDay === day
                                ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                                : "bg-background text-muted-foreground border-border hover:bg-accent/50"
                            )}
                          >
                            <span className="capitalize">
                              {day.slice(0, 3)}
                            </span>
                            {formData.mockTestDay === day && (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: DIAGNOSTIC */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-8"
                >
                  {/* Header */}
                  <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-primary/10 rounded-[2rem] mb-6 rotate-3 hover:rotate-0 transition-transform duration-300">
                      <Target className="w-12 h-12 text-primary" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
                      Baseline Diagnostic
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                      Take a quick 20-minute mini-test to let our AI analyze
                      your current strengths and weaknesses.
                    </p>
                  </div>

                  {/* Features Grid */}
                  <div className="grid md:grid-cols-3 gap-4 mb-12">
                    {[
                      {
                        label: "Precision",
                        text: "Pinpoint weak spots",
                        icon: CheckCircle2,
                        color: "text-primary",
                      },
                      {
                        label: "Efficiency",
                        text: "Skip what you know",
                        icon: Clock,
                        color: "text-blue-500",
                      },
                      {
                        label: "Customization",
                        text: "Tailored curriculum",
                        icon: TrendingUp,
                        color: "text-green-500",
                      },
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={i}
                          className="bg-accent/30 p-6 rounded-2xl border border-border/50 flex flex-col items-center text-center hover:bg-accent/50 transition-colors"
                        >
                          <div className="p-2.5 bg-background rounded-xl shadow-sm mb-3">
                            <Icon className={`w-5 h-5 ${item.color}`} />
                          </div>
                          <h3 className="font-semibold text-foreground mb-1">
                            {item.label}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {item.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-accent/30 border border-border/50 rounded-lg p-4 flex items-center gap-3 justify-center mb-12">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Recommended for the most accurate study plan.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: GOALS */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-8"
                >
                  {/* Header */}
                  <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-primary/10 rounded-[2rem] mb-6 rotate-3 hover:rotate-0 transition-transform duration-300">
                      <Target className="w-12 h-12 text-primary" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
                      Set your targets
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                      Aim high. We'll help you get there.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-12">
                    {/* MATH CARD */}
                    <div className="bg-accent/30 rounded-2xl p-6 border border-border/50 space-y-6">
                      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                        <div className="w-10 h-10 rounded-lg bg-background text-primary flex items-center justify-center font-bold text-lg shadow-sm">
                          M
                        </div>
                        <h3 className="font-bold text-lg text-foreground">
                          Math
                        </h3>
                      </div>

                      <div className="space-y-4">
                        {!formData.isFirstTime && (
                          <div>
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">
                              Current Score
                            </Label>
                            <Input
                              type="number"
                              placeholder="e.g. 500"
                              value={formData.currentMathScore}
                              onChange={(e) =>
                                updateFormData(
                                  "currentMathScore",
                                  e.target.value
                                )
                              }
                              className="text-lg h-12 bg-background border-border"
                            />
                          </div>
                        )}
                        <div>
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">
                            Target Score
                          </Label>
                          <Input
                            type="number"
                            placeholder="e.g. 700"
                            value={formData.targetMathScore}
                            onChange={(e) =>
                              updateFormData("targetMathScore", e.target.value)
                            }
                            className="text-lg h-12 bg-background border-green-500/50 focus:border-green-500 focus:ring-green-500/20"
                          />
                        </div>
                      </div>
                    </div>

                    {/* ENGLISH CARD */}
                    <div className="bg-accent/30 rounded-2xl p-6 border border-border/50 space-y-6">
                      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                        <div className="w-10 h-10 rounded-lg bg-background text-primary flex items-center justify-center font-bold text-lg shadow-sm">
                          E
                        </div>
                        <h3 className="font-bold text-lg text-foreground">
                          English
                        </h3>
                      </div>

                      <div className="space-y-4">
                        {!formData.isFirstTime && (
                          <div>
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">
                              Current Score
                            </Label>
                            <Input
                              type="number"
                              placeholder="e.g. 500"
                              value={formData.currentEnglishScore}
                              onChange={(e) =>
                                updateFormData(
                                  "currentEnglishScore",
                                  e.target.value
                                )
                              }
                              className="text-lg h-12 bg-background border-border"
                            />
                          </div>
                        )}
                        <div>
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">
                            Target Score
                          </Label>
                          <Input
                            type="number"
                            placeholder="e.g. 700"
                            value={formData.targetEnglishScore}
                            onChange={(e) =>
                              updateFormData(
                                "targetEnglishScore",
                                e.target.value
                              )
                            }
                            className="text-lg h-12 bg-background border-blue-500/50 focus:border-blue-500 focus:ring-blue-500/20"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TEST DATE */}
                  <div className="bg-accent/30 rounded-2xl p-6 border border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4 mb-12">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-background rounded-xl shadow-sm">
                        <Calendar className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          Target Test Date
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          When is your exam?
                        </p>
                      </div>
                    </div>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full sm:w-[240px] justify-start text-left font-normal text-base h-12 bg-background",
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
                      <PopoverContent className="w-auto p-0" align="end">
                        <CalendarComponent
                          mode="single"
                          selected={formData.testDate}
                          onSelect={(date) => updateFormData("testDate", date)}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ERROR DISPLAY */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12"
              >
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  size="lg"
                  className="h-14 px-8 text-lg border-2 hover:bg-accent text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}

              {currentStep === 3 ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleNext}
                    size="lg"
                    className="h-14 px-8 text-lg border-2 hover:bg-accent text-muted-foreground hover:text-foreground"
                  >
                    Skip for now
                  </Button>
                  <Button
                    onClick={() => {
                      localStorage.setItem(
                        "onboardingProgress",
                        JSON.stringify(formData)
                      );
                      router.push("/diagnostic-test?returnToOnboarding=true");
                    }}
                    size="lg"
                    className="h-14 px-8 text-lg font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-0.5"
                  >
                    Start Diagnostic
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              ) : (
                <Button
                  onClick={currentStep === 4 ? handleSubmit : handleNext}
                  disabled={isLoading}
                  size="lg"
                  className="h-14 px-8 text-lg font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-0.5"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Creating Plan...
                    </>
                  ) : (
                    <>
                      {currentStep === 4 ? "Finish Setup" : "Continue"}
                      {!isLoading && <ChevronRight className="w-4 h-4 ml-2" />}
                    </>
                  )}
                </Button>
              )}
            </div>
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
