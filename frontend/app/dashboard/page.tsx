"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStudyPlan, useMockExamAnalytics } from "@/hooks/queries";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/lib/hooks/useProfile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import {
  Play,
  Target,
  Sparkles,
  ArrowRight,
  Clock,
} from "lucide-react";
import MissionCard from "@/components/dashboard/MissionCard";
import { MarchSATBanner } from "@/components/dashboard/MarchSATBanner";
import { SpecialPractice } from "@/components/my-sat/SpecialPractice";
import QuickActionsGrid from "@/components/dashboard/QuickActionsGrid";
import RecommendationCard from "@/components/dashboard/RecommendationCard";
import QuestionOfTheDayCard from "@/components/dashboard/QuestionOfTheDayCard";
import XPLevelBar from "@/components/dashboard/XPLevelBar";
import AchievementShowcase from "@/components/dashboard/AchievementShowcase";
import DailyChallenges from "@/components/dashboard/DailyChallenges";
import Leaderboard from "@/components/dashboard/Leaderboard";
import MockExamHistory from "@/components/dashboard/MockExamHistory";
import StudyPlanProgress from "@/components/dashboard/StudyPlanProgress";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { FeedbackButton } from "@/components/FeedbackButton";
import { QuestionPracticePopup } from "@/components/revision/QuestionPracticePopup";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { ONBOARDING_CONTENT } from "@/lib/onboardingContent";
import type { SessionQuestion } from "@/lib/types";

const timeOptions = [
  { label: "5 min", value: 5 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
];

export default function DashboardPage() {
  const router = useRouter();
  const { data: studyPlan, isLoading } = useStudyPlan();
  const { user } = useAuth();
  const { profileData } = useProfile();
  const [showTimeSelection, setShowTimeSelection] = useState(false);
  const { isDarkMode } = useTheme();

  // Lightweight question popup state
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  const getDisplayName = () => {
    if (user?.user_metadata?.name) {
      return user.user_metadata.name;
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "User";
  };

  // Fetch mock exam performance data using TanStack Query
  const mockExamQuery = useMockExamAnalytics();
  const mockExamData = mockExamQuery.data || null;
  const mockExamPerformance = mockExamData?.recent_exams || [];

  // Transform raw question data to SessionQuestion format
  const transformToSessionQuestion = (
    q: any,
    index: number
  ): SessionQuestion | null => {
    if (!q || !q.topics) {
      return null;
    }
    return {
      session_question_id: `quick-${q.id}-${index}`,
      question: {
        id: q.id,
        stem: q.stem,
        stimulus: q.stimulus || null,
        question_type: q.question_type,
        answer_options: q.answer_options,
        correct_answer: q.correct_answer,
        difficulty: q.difficulty,
        rationale: q.rationale || null,
        module: "math",
        topic_id: q.topics?.id || q.id,
        external_id: q.id,
        source_uid: q.id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any,
      topic: {
        id: q.topics?.id || q.id,
        name: q.topics?.name || "Unknown Topic",
        category_id: "",
        weight_in_category: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any,
      status: "not_started",
      display_order: index + 1,
      user_answer: null,
      is_saved: false,
    } as SessionQuestion;
  };

  const handleStartPractice = async (minutes: number) => {
    if (!user) return;

    setIsLoadingQuestions(true);
    try {
      // Calculate number of questions based on time
      // Assuming average 1.5-2 minutes per question
      const questionsPerMinute = 1.5;
      const numQuestions = Math.floor(minutes * questionsPerMinute);

      // Get random questions from the database
      const { data: rawQuestions, error } = await supabase
        .from("questions")
        .select(
          "id, stem, stimulus, question_type, answer_options, correct_answer, difficulty, rationale, topics(id, name)"
        )
        .limit(numQuestions * 2); // Get more than needed for variety

      if (error) throw error;

      if (!rawQuestions || rawQuestions.length === 0) {
        alert("No questions available. Please try again later.");
        setIsLoadingQuestions(false);
        return;
      }

      // Randomly select questions and shuffle them
      const shuffled = rawQuestions.sort(() => 0.5 - Math.random());
      const selectedQuestions = shuffled.slice(0, numQuestions);

      // Transform to SessionQuestion format
      const sessionQuestions = selectedQuestions
        .map((q, index) => transformToSessionQuestion(q, index))
        .filter((q): q is SessionQuestion => q !== null);

      if (sessionQuestions.length === 0) {
        alert("Failed to load questions. Please try again.");
        setIsLoadingQuestions(false);
        return;
      }

      // Set questions and open popup
      setQuestions(sessionQuestions);
      setCurrentQuestionIndex(0);
      setIsPopupOpen(true);
      setShowTimeSelection(false);
    } catch (error) {
      console.error("Error creating practice session:", error);
      alert("Failed to create practice session. Please try again.");
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleQuestionComplete = (isCorrect: boolean) => {
    // This is called when user clicks "Done" after checking answer
    // Navigation is handled by onNext prop
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // All questions completed
      setIsPopupOpen(false);
      setQuestions([]);
      setCurrentQuestionIndex(0);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSkip = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePopupClose = () => {
    setIsPopupOpen(false);
    setQuestions([]);
    setCurrentQuestionIndex(0);
  };

  // Get next session and transform it to match MissionCard's expected type
  const nextSessionRaw = studyPlan?.study_plan?.sessions
    ?.filter((s: any) => s.status !== "completed")
    .sort(
      (a: any, b: any) =>
        new Date(a.scheduled_date).getTime() -
        new Date(b.scheduled_date).getTime()
    )[0];

  // Transform PracticeSession to MissionCard's Session type
  type SessionForMissionCard = {
    id: string;
    topic_name: string;
    description?: string;
    scheduled_date: string;
    duration_minutes: number;
    status: string;
    num_questions: number;
  };

  const nextSession: SessionForMissionCard | undefined = nextSessionRaw
    ? ({
        id: nextSessionRaw.id,
        topic_name:
          nextSessionRaw.session_name ||
          `Session ${nextSessionRaw.session_number}`,
        scheduled_date: nextSessionRaw.scheduled_date,
        duration_minutes: (() => {
          const qCount =
            nextSessionRaw.total_questions ||
            nextSessionRaw.topics?.reduce(
              (sum: number, t: any) => sum + (t.num_questions || 0),
              0
            ) ||
            0;
          return qCount ? Math.round(qCount * 2) : 30;
        })(),
        status: nextSessionRaw.status,
        num_questions:
          nextSessionRaw.total_questions ||
          nextSessionRaw.topics?.reduce(
            (sum: number, t: any) => sum + (t.num_questions || 0),
            0
          ) ||
          0,
      } as SessionForMissionCard)
    : undefined;

  const heroBgClass = isDarkMode ? "bg-[#0F172A]" : "bg-[#9184ff]";
  const heroTextColorClass = isDarkMode ? "text-white" : "text-foreground";
  const heroBlursPrimary = isDarkMode ? "bg-purple-600/30" : "bg-orange-200/50";
  const heroBlursSecondary = isDarkMode ? "bg-blue-600/30" : "bg-orange-200/50";

  return (
    <div className="min-h-screen bg-background/50">
      <div className="flex justify-center">
        <div className="w-full max-w-7xl px-4 py-8 space-y-8">
          {/* March SAT Campaign Banner */}
          <MarchSATBanner />

          {/* Hero Section with Question of the Day */}
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-stretch">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative overflow-hidden rounded-[2.5rem] ${heroBgClass} ${heroTextColorClass} shadow-2xl flex-1 flex flex-col`}
            >
              {/* Abstract Background */}
              <div className="absolute inset-0">
                <div
                  className={`absolute top-0 right-0 w-[600px] h-[600px] ${heroBlursPrimary} rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3`}
                ></div>
                <div
                  className={`absolute bottom-0 left-0 w-[500px] h-[500px] ${heroBlursSecondary} rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4`}
                ></div>
              </div>

              <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 flex-1">
                <div className="flex-1 space-y-4">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 dark:bg-black/10 backdrop-blur-md border border-white/10 dark:border-black/10">
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium">
                        AI-Powered Learning
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h1 className="text-3xl md:text-5xl font-bold leading-tight">
                        {user ? (
                          <>
                            Hello, <span>{getDisplayName().split(" ")[0]}</span>
                          </>
                        ) : (
                          "Hey there!"
                        )}
                      </h1>
                      <p className="text-base md:text-lg text-gray-700 dark:text-gray-300 max-w-lg">
                        Prep St is free, so you can jump straight into practice.
                        Your personalized study plan is optimized for maximum
                        score improvement from day one.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() => {
                          if (!user) {
                            router.push("/signup");
                          } else {
                            setShowTimeSelection(true);
                          }
                        }}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 py-4 text-base font-bold transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                      >
                        <Play className="w-4 h-4 mr-2 fill-current" />
                        {user ? "Quick Start" : "Sign Up"}
                      </Button>
                      <Button
                        onClick={() => {
                          if (!user) {
                            router.push("/login");
                          } else {
                            router.push("/dashboard/mock-exam");
                          }
                        }}
                        variant="outline"
                        className="border-border text-foreground hover:bg-accent rounded-full px-6 py-4 text-base font-medium backdrop-blur-sm"
                      >
                        <Target className="w-4 h-4 mr-2" />
                        {user ? "Mock Exam" : "Log In"}
                      </Button>
                    </div>
                  </motion.div>
                </div>

                {/* Hero Illustration / Stats or 3D Element placeholder */}
                <div className="hidden lg:block relative w-48 h-48">
                  {/* Circle Progress Concept */}
                  <div className="absolute inset-0 rounded-full border-3 border-purple-300 dark:border-white/10 flex items-center justify-center animate-[spin_10s_linear_infinite]">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                  </div>
                  <div className="absolute inset-6 rounded-full border-3 border-blue-300 dark:border-white/10 flex items-center justify-center animate-[spin_15s_linear_infinite_reverse]">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                  </div>

                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-bold relative">
                      {profileData?.stats?.target_math_score &&
                      profileData?.stats?.target_rw_score ? (
                        profileData.stats.target_math_score +
                        profileData.stats.target_rw_score
                      ) : studyPlan?.study_plan?.target_math_score &&
                        studyPlan?.study_plan?.target_rw_score ? (
                        studyPlan.study_plan.target_math_score +
                        studyPlan.study_plan.target_rw_score
                      ) : (
                        <span
                          className="select-none bg-gradient-to-r from-gray-400/50 via-gray-300/50 to-gray-400/50 dark:from-gray-500/50 dark:via-gray-400/50 dark:to-gray-500/50 bg-clip-text text-transparent"
                          style={{
                            backgroundSize: "200% 100%",
                            animation: "shimmer 2s ease-in-out infinite",
                          }}
                        >
                          1600
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">
                      Target Score
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Question of the Day Card - Outside Hero */}
            <div className="hidden lg:block w-full lg:w-auto lg:min-w-[280px] lg:max-w-[320px] flex">
              <QuestionOfTheDayCard />
            </div>
          </div>

          {/* XP Level Bar */}
          {user && <XPLevelBar />}

          {/* Stats Overview */}
          <div className="mb-8">
            <QuickActionsGrid />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column — mission + recommendations */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Target className="w-6 h-6 text-primary" />
                  Current Objective
                </h3>
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-primary"
                  onClick={() => router.push("/dashboard/sessions")}
                >
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="md:col-span-2 lg:col-span-1 xl:col-span-2">
                  <MissionCard
                    session={nextSession}
                    isLoading={isLoading}
                    onStart={() => router.push("/dashboard/study-plan")}
                  />
                </div>
                <div className="md:col-span-1 lg:col-span-1 xl:col-span-1">
                  <RecommendationCard
                    onStart={() => router.push("/dashboard/drill")}
                  />
                </div>
              </div>

              {/* Achievements */}
              {user && <AchievementShowcase />}

              {/* Score History + Study Plan Progress */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MockExamHistory />
                <StudyPlanProgress />
              </div>
            </div>

            {/* Right sidebar — gamification */}
            <div className="space-y-6">
              {user && <DailyChallenges />}
              {user && <Leaderboard />}
            </div>
          </div>

          {/* Special Practice with Peppa */}
          <SpecialPractice />
        </div>
      </div>

      {/* Quick Start Time Selection Modal */}
      <Dialog open={showTimeSelection} onOpenChange={setShowTimeSelection}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Choose Duration
            </DialogTitle>
            <DialogDescription>
              How much time do you have? We'll generate a custom practice
              session that fits perfectly into your schedule.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            {timeOptions.map((option) => (
              <Button
                key={option.value}
                onClick={() => {
                  handleStartPractice(option.value);
                }}
                disabled={isLoadingQuestions}
                variant="outline"
                className="h-auto py-4 flex flex-col gap-1 border-border/50 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 group disabled:opacity-50"
              >
                <span className="text-lg font-bold">{option.label}</span>
                <span className="text-xs opacity-70 group-hover:opacity-100 font-normal">
                  ~{Math.floor(option.value * (option.value <= 30 ? 2 : 1.5))}{" "}
                  questions
                </span>
              </Button>
            ))}
          </div>
          {isLoadingQuestions && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Loading questions...
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightweight Question Popup */}
      {questions.length > 0 && questions[currentQuestionIndex] && (
        <QuestionPracticePopup
          open={isPopupOpen && !!questions[currentQuestionIndex]}
          onOpenChange={handlePopupClose}
          question={questions[currentQuestionIndex]}
          onComplete={handleQuestionComplete}
          currentIndex={currentQuestionIndex}
          totalQuestions={questions.length}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSkip={handleSkip}
          hasPrevious={currentQuestionIndex > 0}
          hasNext={currentQuestionIndex < questions.length - 1}
        />
      )}

      <OnboardingModal
        pageId="dashboard"
        steps={ONBOARDING_CONTENT.dashboard}
      />
      <FeedbackButton />
    </div>
  );
}
