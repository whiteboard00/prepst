"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Target, Calendar, TrendingUp, BookOpen } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUserId } from "@/lib/storage";
import { userAPI, recommendationAPI } from "@/lib/api";
import type {
  UserProgress,
  NextTopicRecommendation,
  TopicPriority,
} from "@/lib/types";
import { WeakAreasCard } from "@/components/domain/WeakAreasCard";
import { QuickStatsCard } from "@/components/domain/QuickStatsCard";
import { MasteryGauge } from "@/components/domain/MasteryGauge";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [recommendation, setRecommendation] =
    useState<NextTopicRecommendation | null>(null);
  const [weakAreas, setWeakAreas] = useState<TopicPriority[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const userId = getUserId();

      if (!userId) {
        // No user found, redirect to onboarding
        router.push("/");
        return;
      }

      // Load user progress, recommendation, and weak areas in parallel
      const [progressData, recommendationData, weakAreasData] =
        await Promise.all([
          userAPI.getUserProgress(userId),
          recommendationAPI.getNextTopic({ user_id: userId }),
          recommendationAPI.getTopTopics(userId, undefined, 5),
        ]);

      setProgress(progressData);
      setRecommendation(recommendationData);
      setWeakAreas(weakAreasData);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">
              Error Loading Dashboard
            </CardTitle>
            <CardDescription className="text-red-600">
              {error || "Failed to load your data"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalScore =
    progress.current_math_score + progress.current_english_score;
  const targetScore =
    progress.target_math_score + progress.target_english_score;

  return (
    <div className="container max-w-6xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">
          Your SAT Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Track your progress and continue your adaptive learning journey
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Current Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalScore}</div>
            <p className="text-xs text-muted-foreground">
              Math: {progress.current_math_score} | English:{" "}
              {progress.current_english_score}
            </p>
          </CardContent>
        </Card>

        {/* Target Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Target Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{targetScore}</div>
            <p className="text-xs text-muted-foreground">
              Math: {progress.target_math_score} | English:{" "}
              {progress.target_english_score}
            </p>
          </CardContent>
        </Card>

        {/* Days Until Test */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Days Until Test
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress.days_until_test}</div>
            <p className="text-xs text-muted-foreground">
              {new Date(progress.test_date).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        {/* Questions Answered */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Questions Answered
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progress.total_questions_answered}
            </div>
            <p className="text-xs text-muted-foreground">
              {(progress.overall_accuracy * 100).toFixed(0)}% accuracy
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Next Recommended Topic */}
      {recommendation && (
        <Card className="border-primary shadow-md">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              🎯 AI-Recommended Next Topic
            </CardTitle>
            <CardDescription>
              Personalized recommendation based on your learning progress
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-6">
              {/* Mastery Gauge */}
              <MasteryGauge
                value={recommendation.current_mastery}
                size="lg"
                showLabel={true}
                label="Current"
              />

              {/* Topic Info */}
              <div className="flex-1 space-y-2">
                <h3 className="text-2xl font-bold">{recommendation.topic}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {recommendation.reason}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-secondary/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Target Mastery
                </p>
                <p className="text-lg font-semibold">
                  {(recommendation.target_mastery * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Questions</p>
                <p className="text-lg font-semibold">
                  {recommendation.questions_count}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Time</p>
                <p className="text-lg font-semibold">
                  ~{recommendation.estimated_time_minutes} min
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Priority</p>
                <p className="text-lg font-semibold text-orange-600">
                  {recommendation.priority_score.toFixed(1)}
                </p>
              </div>
            </div>

            <Button size="lg" className="w-full">
              Start Study Session →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats and Weak Areas Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Stats */}
        <QuickStatsCard
          questionsToday={0}
          questionsThisWeek={progress?.total_questions_answered || 0}
          currentStreak={0}
          studyTimeThisWeek={0}
          topicsStudiedToday={0}
        />

        {/* Weak Areas */}
        <WeakAreasCard
          topics={weakAreas}
          onStudyTopic={(topic) => {
            console.log("Study topic:", topic);
            // TODO: Navigate to study session for this topic
          }}
        />
      </div>

      {/* Progress Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Math Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Math Progress</CardTitle>
            <CardDescription>
              Current: {progress.current_math_score} / Target:{" "}
              {progress.target_math_score}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Past Score</span>
                <span className="font-medium">{progress.past_math_score}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      ((progress.current_math_score - 200) / 600) * 100
                    }%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>200</span>
                <span>800</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* English Progress */}
        <Card>
          <CardHeader>
            <CardTitle>English Progress</CardTitle>
            <CardDescription>
              Current: {progress.current_english_score} / Target:{" "}
              {progress.target_english_score}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Past Score</span>
                <span className="font-medium">
                  {progress.past_english_score}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      ((progress.current_english_score - 200) / 600) * 100
                    }%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>200</span>
                <span>800</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Study Tips Section */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle>💡 Study Tips</CardTitle>
          <CardDescription className="text-blue-900">
            Maximize your learning effectiveness
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-semibold">→</span>
              <span>
                <strong>Consistency beats intensity:</strong> Study 30 minutes
                daily rather than 3 hours once a week
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-semibold">→</span>
              <span>
                <strong>Trust the algorithm:</strong> Follow AI recommendations
                for optimal learning paths
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-semibold">→</span>
              <span>
                <strong>Be honest with confidence:</strong> Accurate
                self-assessment helps identify knowledge gaps
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-semibold">→</span>
              <span>
                <strong>Review weak areas regularly:</strong> Revisit
                challenging topics before they're forgotten
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
