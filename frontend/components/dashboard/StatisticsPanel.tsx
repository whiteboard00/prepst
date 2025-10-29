"use client";

import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { SkillProgressList } from "./SkillProgressList";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from "recharts";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useProfile } from "@/lib/hooks/useProfile";
import { useStudyPlan } from "@/hooks/useStudyPlan";
import { api } from "@/lib/api";
import { 
  Clock, 
  Target, 
  TrendingUp, 
  BookOpen, 
  Calendar as CalendarIcon,
  Award,
  Zap,
  CheckCircle
} from "lucide-react";

interface StatisticsPanelProps {
  userName?: string;
  progressPercentage?: number;
  currentSession?: {
    number: number;
    title: string;
  };
}

interface StudyStats {
  totalStudyTime: number;
  sessionsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  averageScore: number;
  improvementRate: number;
  weeklyActivity: Array<{ day: string; minutes: number; score?: number }>;
  topSkills: Array<{ name: string; mastery: number; color: string }>;
}

export function StatisticsPanel({
  userName = "Buyan Khurelbaatar",
  progressPercentage = 32,
  currentSession,
}: StatisticsPanelProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [studyStats, setStudyStats] = useState<StudyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { getInitials, getDisplayName } = useProfile();
  const { studyPlan } = useStudyPlan();

  // Calculate real progress percentage based on study plan
  const calculateProgressPercentage = () => {
    if (!studyPlan?.study_plan) return 0;
    
    const currentTotal = (studyPlan.study_plan.current_math_score ?? 0) + (studyPlan.study_plan.current_rw_score ?? 0);
    const targetTotal = (studyPlan.study_plan.target_math_score ?? 0) + (studyPlan.study_plan.target_rw_score ?? 0);
    
    if (targetTotal === 0) return 0;
    return Math.min(Math.round((currentTotal / targetTotal) * 100), 100);
  };

  const realProgressPercentage = calculateProgressPercentage();

  useEffect(() => {
    const loadStudyStats = async () => {
      try {
        setIsLoading(true);
        
        // Mock data for now - replace with real API calls
        const mockStats: StudyStats = {
          totalStudyTime: 1240, // minutes
          sessionsCompleted: 23,
          currentStreak: 7,
          longestStreak: 12,
          averageScore: 78,
          improvementRate: 12,
          weeklyActivity: [
            { day: "Mon", minutes: 45, score: 82 },
            { day: "Tue", minutes: 60, score: 85 },
            { day: "Wed", minutes: 30, score: 78 },
            { day: "Thu", minutes: 90, score: 88 },
            { day: "Fri", minutes: 75, score: 91 },
            { day: "Sat", minutes: 120, score: 89 },
            { day: "Sun", minutes: 0, score: 0 },
          ],
          topSkills: [
            { name: "Algebra", mastery: 85, color: "bg-blue-500" },
            { name: "Reading Comprehension", mastery: 78, color: "bg-green-500" },
            { name: "Geometry", mastery: 72, color: "bg-purple-500" },
            { name: "Grammar", mastery: 68, color: "bg-orange-500" },
            { name: "Data Analysis", mastery: 65, color: "bg-pink-500" },
          ],
        };
        
        setStudyStats(mockStats);
      } catch (error) {
        console.error("Failed to load study stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStudyStats();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full max-w-sm lg:w-96 p-4 lg:p-6 flex-shrink-0 bg-white rounded-2xl lg:rounded-3xl shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 lg:h-8 bg-gray-200 rounded mb-6 lg:mb-8"></div>
          <div className="flex flex-col items-center mb-6 lg:mb-8">
            <div className="w-24 h-24 lg:w-36 lg:h-36 bg-gray-200 rounded-full mb-4 lg:mb-5"></div>
            <div className="h-5 lg:h-6 bg-gray-200 rounded w-24 lg:w-32 mb-2"></div>
            <div className="h-3 lg:h-4 bg-gray-200 rounded w-32 lg:w-48"></div>
          </div>
          <div className="space-y-3 lg:space-y-4">
            <div className="h-24 lg:h-32 bg-gray-200 rounded"></div>
            <div className="h-16 lg:h-20 bg-gray-200 rounded"></div>
            <div className="h-32 lg:h-40 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm lg:w-96 p-4 lg:p-6 flex-shrink-0 bg-white rounded-2xl lg:rounded-3xl shadow-sm">
      <h2 className="text-2xl lg:text-3xl font-bold mb-6 lg:mb-8 text-gray-900">Study Statistics</h2>

      {/* Profile with Progress Ring */}
      <div className="flex flex-col items-center mb-6 lg:mb-8">
        <div className="relative mb-4 lg:mb-5">
          {/* Progress ring - simplified version */}
          <div className="w-24 h-24 lg:w-36 lg:h-36 rounded-full bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center relative shadow-sm">
            <div className="w-20 h-20 lg:w-32 lg:h-32 rounded-full bg-white flex items-center justify-center">
              <div className="w-16 h-16 lg:w-28 lg:h-28 rounded-full overflow-hidden">
                <Image
                  src="/profile.png"
                  alt="Profile"
                  width={112}
                  height={112}
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
            <Badge className="absolute -top-1 -right-1 lg:-top-2 lg:-right-2 bg-purple-600 hover:bg-purple-600 text-white px-2 py-1 lg:px-3 lg:py-1 text-xs lg:text-sm font-bold rounded-full shadow-md">
              {realProgressPercentage}%
            </Badge>
          </div>
        </div>
        <h3 className="text-lg lg:text-xl font-bold text-center mb-2 text-gray-900">
          {getDisplayName() || userName}
        </h3>
        <p className="text-xs lg:text-sm text-gray-500 text-center px-2 lg:px-4 leading-relaxed">
          {realProgressPercentage >= 100 
            ? "🎉 Congratulations! You've reached your target!" 
            : `Keep studying! ${100 - realProgressPercentage}% to go!`
          }
        </p>
      </div>

      {/* Study Metrics */}
      {studyStats && (
        <div className="mb-6 lg:mb-8">
          <h3 className="text-base lg:text-lg font-bold text-gray-900 mb-3 lg:mb-4">This Week's Activity</h3>
          <div className="grid grid-cols-2 gap-2 lg:gap-4 mb-4 lg:mb-6">
            <Card className="p-3 lg:p-4 bg-blue-50 border-blue-100">
              <div className="flex items-center gap-2 lg:gap-3">
                <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm text-blue-600 font-medium">Study Time</p>
                  <p className="text-sm lg:text-lg font-bold text-blue-900 truncate">
                    {Math.floor(studyStats.totalStudyTime / 60)}h {studyStats.totalStudyTime % 60}m
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-3 lg:p-4 bg-green-50 border-green-100">
              <div className="flex items-center gap-2 lg:gap-3">
                <Zap className="w-4 h-4 lg:w-5 lg:h-5 text-green-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm text-green-600 font-medium">Current Streak</p>
                  <p className="text-sm lg:text-lg font-bold text-green-900">{studyStats.currentStreak} days</p>
                </div>
              </div>
            </Card>
            <Card className="p-3 lg:p-4 bg-purple-50 border-purple-100">
              <div className="flex items-center gap-2 lg:gap-3">
                <BookOpen className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm text-purple-600 font-medium">Sessions</p>
                  <p className="text-sm lg:text-lg font-bold text-purple-900">{studyStats.sessionsCompleted}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3 lg:p-4 bg-orange-50 border-orange-100">
              <div className="flex items-center gap-2 lg:gap-3">
                <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm text-orange-600 font-medium">Avg Score</p>
                  <p className="text-sm lg:text-lg font-bold text-orange-900">{studyStats.averageScore}%</p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Weekly Activity Chart */}
          <div className="mb-3 lg:mb-4">
            <h4 className="text-xs lg:text-sm font-semibold text-gray-700 mb-2 lg:mb-3">Daily Study Time</h4>
            <ResponsiveContainer width="100%" height={80} className="lg:h-[120px]">
              <BarChart data={studyStats.weeklyActivity}>
                <XAxis
                  dataKey="day"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#6b7280" }}
                />
                <YAxis hide />
                <Bar
                  dataKey="minutes"
                  fill="#8b5cf6"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Skills */}
      {studyStats && (
        <div className="mb-6 lg:mb-8">
          <h3 className="text-base lg:text-lg font-bold text-gray-900 mb-3 lg:mb-4">Top Skills</h3>
          <div className="space-y-2 lg:space-y-3">
            {studyStats.topSkills.map((skill, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                  <div className={`w-2 h-2 lg:w-3 lg:h-3 rounded-full ${skill.color} flex-shrink-0`}></div>
                  <span className="text-xs lg:text-sm font-medium text-gray-700 truncate">{skill.name}</span>
                </div>
                <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
                  <span className="text-xs lg:text-sm font-bold text-gray-900">{skill.mastery}%</span>
                  <div className="w-12 lg:w-16 h-1.5 lg:h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${skill.color} transition-all duration-500`}
                      style={{ width: `${skill.mastery}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Study Calendar */}
      <div className="mb-6 lg:mb-8">
        <h3 className="text-base lg:text-lg font-bold text-gray-900 mb-3 lg:mb-4">Study Calendar</h3>
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-lg lg:rounded-xl bg-gray-50 p-2 lg:p-4 border-0 scale-90 lg:scale-100"
          />
        </div>
        <div className="mt-3 lg:mt-4 text-center">
          <p className="text-xs lg:text-sm text-gray-600">
            {studyStats ? `${studyStats.currentStreak} day streak` : "Start your study streak!"}
          </p>
        </div>
      </div>

      {/* Study Goals & Achievements */}
      {studyStats && (
        <div className="space-y-3 lg:space-y-4">
          <Card className="p-3 lg:p-5 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-100 rounded-xl lg:rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center shadow-sm flex-shrink-0">
                <Target className="w-4 h-4 lg:w-6 lg:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs lg:text-sm font-bold text-gray-900">Study Goal</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {studyStats.currentStreak >= 7 ? "🎉 Weekly goal achieved!" : `${7 - studyStats.currentStreak} more days to weekly goal`}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-3 lg:p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-green-100 rounded-xl lg:rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-sm flex-shrink-0">
                <Award className="w-4 h-4 lg:w-6 lg:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs lg:text-sm font-bold text-gray-900">Achievement</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {studyStats.improvementRate > 0 ? `+${studyStats.improvementRate}% improvement this week` : "Keep studying to see improvement!"}
                </p>
              </div>
            </div>
          </Card>

          {currentSession && (
            <Card className="p-3 lg:p-5 bg-orange-50/50 border-orange-100 rounded-xl lg:rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-full bg-orange-100 flex items-center justify-center shadow-sm flex-shrink-0">
                  <div className="w-5 h-5 lg:w-7 lg:h-7 rounded-full border-2 border-orange-600 border-t-transparent animate-spin" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm font-bold text-gray-900">
                    Session {currentSession.number}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5 truncate">
                    {currentSession.title}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
