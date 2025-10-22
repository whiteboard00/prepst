"use client";

import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { SkillProgressList } from "./SkillProgressList";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { useProfile } from "@/lib/hooks/useProfile";

interface StatisticsPanelProps {
  userName?: string;
  progressPercentage?: number;
  currentSession?: {
    number: number;
    title: string;
  };
}

const weeklyData = [
  { period: "1-10 Aug", value: 35 },
  { period: "11-20 Aug", value: 45 },
  { period: "21-30 Aug", value: 38 },
  { period: "31-40 Aug", value: 60 },
  { period: "41-50 Aug", value: 40 },
];

export function StatisticsPanel({
  userName = "Buyan Khurelbaatar",
  progressPercentage = 32,
  currentSession,
}: StatisticsPanelProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { getInitials, getDisplayName } = useProfile();

  return (
    <div className="w-96 p-8 flex-shrink-0 bg-white rounded-3xl shadow-sm">
      <h2 className="text-3xl font-bold mb-10 text-gray-900">Statistics</h2>

      {/* Profile with Progress Ring */}
      <div className="flex flex-col items-center mb-10">
        <div className="relative mb-5">
          {/* Progress ring - simplified version */}
          <div className="w-36 h-36 rounded-full bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center relative shadow-sm">
            <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
                {getInitials()}
              </div>
            </div>
            <Badge className="absolute -top-2 -right-2 bg-purple-600 hover:bg-purple-600 text-white px-3 py-1 text-sm font-bold rounded-full shadow-md">
              {progressPercentage}%
            </Badge>
          </div>
        </div>
        <h3 className="text-xl font-bold text-center mb-2 text-gray-900">
          {getDisplayName() || userName}
        </h3>
        <p className="text-sm text-gray-500 text-center px-4 leading-relaxed">
          Continue your learning to achieve your target!
        </p>
      </div>

      {/* Weekly Bar Chart */}
      <div className="mb-10">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={weeklyData}>
            <XAxis
              dataKey="period"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#9ca3af" }}
            />
            <YAxis hide />
            <Bar
              dataKey="value"
              fill="#A78BFA"
              radius={[10, 10, 0, 0]}
              maxBarSize={45}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Calendar */}
      <div className="mb-10 flex justify-center">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-xl bg-gray-50 p-4 border-0"
        />
      </div>

      {/* Skill Progress */}
      <div className="mb-10">
        <SkillProgressList />
      </div>

      {/* Current Session */}
      {currentSession && (
        <Card className="p-5 bg-purple-50/50 border-purple-100 rounded-2xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
              <div className="w-7 h-7 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                Session {currentSession.number}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {currentSession.title}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
