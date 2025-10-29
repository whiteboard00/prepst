"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStudyPlan } from "@/hooks/useStudyPlan";
import { useAuth } from "@/contexts/AuthContext";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { ProgressOverview } from "@/components/dashboard/ProgressOverview";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { TodoItem } from "@/components/study-plan/todo-item";
import Image from "next/image";
import { TypingAnimation } from "@/components/ui/typing-animation";
import {
  Flame,
  Clock,
  Target,
  Calendar,
  BookOpen,
  TrendingUp,
  CheckCircle2,
  Play,
  BarChart3,
  Award,
  Zap,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { studyPlan, isLoading } = useStudyPlan();
  const { user } = useAuth();
  const [showTimeSelection, setShowTimeSelection] = useState(false);
  const [mockExamPerformance, setMockExamPerformance] = useState<any[]>([]);
  const [mockExamData, setMockExamData] = useState<any>(null);

  const getDisplayName = () => {
    if (user?.user_metadata?.name) {
      return user.user_metadata.name;
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "User";
  };

  // Fetch mock exam performance data using the same API as other pages
  useEffect(() => {
    const fetchMockExamPerformance = async () => {
      try {
        const analyticsData = await api.getMockExamAnalytics().catch((err) => {
          console.error("Mock exam analytics error:", err);
          return null;
        });

        if (analyticsData) {
          setMockExamData(analyticsData);
          setMockExamPerformance(analyticsData.recent_exams || []);
        }
      } catch (err) {
        console.error("Error fetching mock exam performance:", err);
      }
    };

    if (user?.id) {
      fetchMockExamPerformance();
    }
  }, [user?.id]);

  const handleStartPractice = async (minutes: number) => {
    if (!user) return;

    try {
      // Calculate number of questions based on time
      // Assuming average 1.5-2 minutes per question
      const questionsPerMinute = 1.5;
      const numQuestions = Math.floor(minutes * questionsPerMinute);

      // Get random questions from the database
      const { data: questions, error } = await supabase
        .from("questions")
        .select(
          "id, stem, question_type, answer_options, correct_answer, difficulty, topics(name)"
        )
        .limit(numQuestions * 2); // Get more than needed for variety

      if (error) throw error;

      if (!questions || questions.length === 0) {
        alert("No questions available. Please try again later.");
        return;
      }

      // Randomly select questions and shuffle them
      const shuffled = questions.sort(() => 0.5 - Math.random());
      const selectedQuestions = shuffled.slice(0, numQuestions);

      // Create a simple practice session in localStorage for now
      const sessionId = `quick-practice-${Date.now()}`;
      const practiceSession = {
        id: sessionId,
        questions: selectedQuestions,
        currentIndex: 0,
        timeLimit: minutes * 60, // Convert to seconds
        createdAt: new Date().toISOString(),
      };

      // Store in localStorage
      localStorage.setItem(
        `practice-session-${sessionId}`,
        JSON.stringify(practiceSession)
      );

      // Navigate to a simple practice page
      router.push(`/practice/quick/${sessionId}`);
    } catch (error) {
      console.error("Error creating practice session:", error);
      alert("Failed to create practice session. Please try again.");
    }
  };

  const timeOptions = [
    { label: "5 minutes", value: 5 },
    { label: "15 minutes", value: 15 },
    { label: "30 minutes", value: 30 },
    { label: "1 hour", value: 60 },
    { label: "2 hours", value: 120 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
      <div className="flex justify-center">
        <div className="w-full max-w-7xl px-4 py-8">
          <div className="space-y-8">
            {/* Hero Section */}
            <div
              className="text-white p-8 md:p-12 border-0 rounded-3xl relative overflow-hidden"
              style={{
                backgroundColor: "#866EFF",
                boxShadow: "0 20px 40px -12px rgba(134, 110, 255, 0.3)",
              }}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-32 -translate-x-32"></div>
              </div>

              <div className="relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                      <p className="text-sm opacity-90 font-medium">
                        Welcome back
                      </p>
                    </div>
                    <TypingAnimation
                      className="text-4xl md:text-6xl font-bold mb-4 leading-tight"
                      typeSpeed={80}
                      showCursor={false}
                      as="h1"
                    >
                      {`Hello, ${getDisplayName().split(" ")[0]} 👋`}
                    </TypingAnimation>
                    <TypingAnimation
                      className="text-lg md:text-2xl mb-8 opacity-90 font-light leading-normal"
                      typeSpeed={50}
                      delay={1500}
                      showCursor={false}
                      as="p"
                    >
                      Ready to crush your SAT goals? Let's get started!
                    </TypingAnimation>
                  </div>
                </div>

                {showTimeSelection ? (
                  <div className="space-y-4">
                    <p className="text-sm opacity-75 mb-4">
                      Choose your practice duration:
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {timeOptions.map((option) => (
                        <Button
                          key={option.value}
                          onClick={() => handleStartPractice(option.value)}
                          className="bg-white text-purple-600 hover:bg-gray-100 px-6 py-3 rounded-full text-sm font-medium transition-all hover:scale-105 shadow-lg"
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                    <Button
                      onClick={() => setShowTimeSelection(false)}
                      variant="ghost"
                      className="text-white hover:bg-white/20 mt-3"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-4">
                    <Button
                      onClick={() => setShowTimeSelection(true)}
                      className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-4 rounded-full text-base font-medium transition-all hover:scale-105 shadow-lg"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Practice
                    </Button>
                    <Button
                      onClick={() => router.push("/mock-exam")}
                      variant="ghost"
                      className="text-white hover:bg-white/20 px-8 py-4 rounded-full text-base font-medium border border-white/20"
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Take Mock Exam
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Study Streak */}
              <Card className="p-6 rounded-2xl border-0 bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-500 rounded-xl shadow-md">
                    <Flame className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-orange-700 font-medium">
                      Study Streak
                    </p>
                    <p className="text-2xl font-bold text-orange-900">0 days</p>
                    <p className="text-xs text-orange-600">Keep it up!</p>
                  </div>
                </div>
              </Card>

              {/* Study Time Today */}
              <Card className="p-6 rounded-2xl border-0 bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500 rounded-xl shadow-md">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-700 font-medium">
                      Today's Study
                    </p>
                    <p className="text-2xl font-bold text-purple-900">0h 0m</p>
                    <p className="text-xs text-purple-600">Goal: 2h 0m</p>
                  </div>
                </div>
              </Card>

              {/* Questions Completed */}
              <Card className="p-6 rounded-2xl border-0 bg-gradient-to-br from-green-50 to-green-100 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500 rounded-xl shadow-md">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-700 font-medium">
                      Questions Done
                    </p>
                    <p className="text-2xl font-bold text-green-900">0</p>
                    <p className="text-xs text-green-600">This week</p>
                  </div>
                </div>
              </Card>

              {/* Mock Exams */}
              <Card className="p-6 rounded-2xl border-0 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500 rounded-xl shadow-md">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 font-medium">
                      Mock Exams
                    </p>
                    <p className="text-2xl font-bold text-blue-900">0</p>
                    <p className="text-xs text-blue-600">Completed</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Next Session */}
              <Card className="lg:col-span-2 p-8 rounded-2xl border-0 shadow-lg bg-white">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Next Study Session
                  </h3>
                </div>
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mx-auto mb-3"></div>
                    <p className="text-sm text-gray-500">Loading session...</p>
                  </div>
                ) : studyPlan ? (
                  <div>
                    {(() => {
                      const nextSession = studyPlan.study_plan.sessions
                        .filter((s: any) => s.status !== "completed")
                        .sort(
                          (a: any, b: any) =>
                            new Date(a.scheduled_date).getTime() -
                            new Date(b.scheduled_date).getTime()
                        )[0];

                      return nextSession ? (
                        <TodoItem todo={nextSession} onToggle={() => {}} />
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                          </div>
                          <p className="text-lg font-medium text-gray-900 mb-2">
                            All sessions completed!
                          </p>
                          <p className="text-gray-500">
                            Great job! Check back tomorrow for new sessions.
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-8 w-8 text-purple-600" />
                    </div>
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      No study plan found
                    </p>
                    <p className="text-gray-500 mb-6">
                      Create a personalized study plan to get started
                    </p>
                    <Button
                      onClick={() => router.push("/onboard")}
                      className="px-8 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium transition-all hover:scale-105 shadow-lg"
                    >
                      Create Study Plan
                    </Button>
                  </div>
                )}
              </Card>

              {/* Quick Actions */}
              <Card className="p-6 rounded-2xl border-0 shadow-lg bg-white">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Zap className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Quick Actions
                  </h3>
                </div>
                <div className="space-y-3">
                  <Button
                    onClick={() => router.push("/practice")}
                    className="w-full justify-start bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl py-3"
                  >
                    <Play className="w-4 h-4 mr-3" />
                    Practice Questions
                  </Button>
                  <Button
                    onClick={() => router.push("/mock-exam")}
                    variant="outline"
                    className="w-full justify-start border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl py-3"
                  >
                    <Target className="w-4 h-4 mr-3" />
                    Take Mock Exam
                  </Button>
                  <Button
                    onClick={() => router.push("/study-plan")}
                    variant="outline"
                    className="w-full justify-start border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl py-3"
                  >
                    <BarChart3 className="w-4 h-4 mr-3" />
                    View Study Plan
                  </Button>
                  <Button
                    onClick={() => router.push("/progress")}
                    variant="outline"
                    className="w-full justify-start border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl py-3"
                  >
                    <TrendingUp className="w-4 h-4 mr-3" />
                    View Progress
                  </Button>
                </div>
              </Card>
            </div>

            {/* Progress Overview */}
            <ProgressOverview
              studyPlan={studyPlan}
              mockExamPerformance={mockExamPerformance}
              mockExamData={mockExamData}
            />

            {/* Performance Chart */}
            <PerformanceChart />
          </div>
        </div>
      </div>
    </div>
  );
}
