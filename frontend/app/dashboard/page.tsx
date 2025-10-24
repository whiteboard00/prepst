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
    <div className="space-y-10 max-w-6xl">
      {/* Hero Section */}
      <div
        className="text-white p-10 border-0 rounded-3xl shadow-lg"
        style={{ backgroundColor: "#866EFF" }}
      >
        <p className="text-sm mb-3 opacity-90 font-medium">Welcome back</p>
        <h1 className="text-5xl font-bold mb-3">
          Hello, {getDisplayName().split(" ")[0]}
        </h1>
        <p className="text-2xl mb-8 opacity-90 font-light">
          Start practicing to achieve your SAT goals
        </p>

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

      {/* Metrics Row */}
      <Card className="p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-3 gap-10">
          <MetricCard
            type="finished"
            value="18"
            change="+8 tasks"
            isPositive={true}
          />
          <MetricCard
            type="tracked"
            value="31h"
            change="-6 hours"
            isPositive={false}
          />
          <MetricCard
            type="efficiency"
            value="93%"
            change="+12%"
            isPositive={true}
          />
        </div>
      </Card>

      {/* Performance Chart */}
      <PerformanceChart />

      {/* Current Tasks Section */}
      <Card className="p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-3xl font-bold text-gray-900">Current Tasks</h3>
            <p className="text-sm text-gray-500 mt-1">Done 30%</p>
          </div>
          <select className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <option>Week</option>
            <option>Month</option>
          </select>
        </div>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mx-auto mb-3"></div>
            <p className="text-sm text-gray-500">Loading tasks...</p>
          </div>
        ) : studyPlan ? (
          <div className="text-sm text-gray-600 py-4">
            <p className="font-medium">
              You have{" "}
              {
                studyPlan.study_plan.sessions.filter(
                  (s: any) => s.status === "pending"
                ).length
              }{" "}
              upcoming sessions
            </p>
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
    </div>
  );
}
