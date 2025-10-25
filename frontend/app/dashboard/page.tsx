"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStudyPlan } from "@/hooks/useStudyPlan";
import { useAuth } from "@/contexts/AuthContext";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { TodoItem } from "@/components/study-plan/todo-item";
import Image from "next/image";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { Flame, Clock } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { studyPlan, isLoading } = useStudyPlan();
  const { user } = useAuth();
  const [showTimeSelection, setShowTimeSelection] = useState(false);

  const getDisplayName = () => {
    if (user?.user_metadata?.name) {
      return user.user_metadata.name;
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "User";
  };

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
    <div className="flex justify-center">
      <div className="w-full max-w-4xl px-4">
        <div className="space-y-10">
          {/* Hero Section */}
          <div
            className="text-white p-10 border-0 rounded-3xl relative"
            style={{ 
              backgroundColor: "#866EFF",
              boxShadow: "5px 4px 30px 3px rgba(128, 128, 128, 0.2)"
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm mb-3 opacity-90 font-medium">Welcome back</p>
                <TypingAnimation
                  className="text-5xl font-bold mb-3 leading-tight"
                  typeSpeed={80}
                  showCursor={false}
                  as="h1"
                >
                  {`Hello, ${getDisplayName().split(" ")[0]} 👋`}
                </TypingAnimation>
                <TypingAnimation
                  className="text-2xl mb-8 opacity-90 font-light leading-normal"
                  typeSpeed={50}
                  delay={1500}
                  showCursor={false}
                  as="p"
                >
                  Start practicing to achieve your SAT goals !
                </TypingAnimation>
              </div>
              {/* <div className="flex-shrink-0 ml-8">
                <Image
                  src="/prepst.png"
                  alt="Prep St. Logo"
                  width={200}
                  height={200}
                  className="object-contain"
                />
              </div> */}
            </div>

            {showTimeSelection ? (
              <div className="space-y-3">
                <p className="text-sm opacity-75 mb-4">
                  Choose your practice duration:
                </p>
                <div className="flex flex-wrap gap-3">
                  {timeOptions.map((option) => (
                    <Button
                      key={option.value}
                      onClick={() => handleStartPractice(option.value)}
                      className="bg-white text-purple-600 hover:bg-gray-100 px-6 py-3 rounded-full text-sm font-medium transition-colors"
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
              <Button
                onClick={() => setShowTimeSelection(true)}
                className="bg-black hover:bg-gray-800 text-white px-10 py-3 rounded-full text-sm font-medium"
              >
                Start practicing
              </Button>
            )}
          </div>

          {/* Next Session & Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Next Session */}
            <Card 
              className="p-8 rounded-3xl border border-gray-100"
              style={{ boxShadow: "5px 4px 30px 3px rgba(128, 128, 128, 0.2)" }}
            >
              <div className="mb-6">
                <h3 className="text-3xl font-bold text-gray-900">
                  Next Session
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
                      .sort((a: any, b: any) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())[0];

                    return nextSession ? (
                      <TodoItem
                        todo={nextSession}
                        onToggle={() => {}}
                      />
                    ) : (
                      <p className="text-center text-gray-500 py-8">
                        All sessions completed!
                      </p>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No study plan found</p>
                  <button
                    onClick={() => router.push("/onboard")}
                    className="px-8 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium transition-colors"
                  >
                    Create Study Plan
                  </button>
                </div>
              )}
            </Card>

            {/* Quick Stats */}
            <Card 
              className="p-8 rounded-3xl border border-gray-100"
              style={{ boxShadow: "5px 4px 30px 3px rgba(128, 128, 128, 0.2)" }}
            >
              <div className="mb-6">
                <h3 className="text-3xl font-bold text-gray-900">
                  Quick Stats
                </h3>
              </div>
              <div className="space-y-4">
                {/* Streak */}
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl border border-orange-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500 rounded-xl">
                      <Flame className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Current Streak</p>
                      <p className="text-2xl font-bold text-gray-900">0 days</p>
                    </div>
                  </div>
                </div>

                {/* Study Time */}
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500 rounded-xl">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Study Time Today</p>
                      <p className="text-2xl font-bold text-gray-900">0h 0m</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Performance Chart */}
          <PerformanceChart />
        </div>
      </div>
    </div>
  );
}
