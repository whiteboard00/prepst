'use client';

import { useRouter } from 'next/navigation';
import { useStudyPlan } from '@/hooks/useStudyPlan';
import { useAuth } from '@/contexts/AuthContext';
import { HeroCard } from '@/components/dashboard/HeroCard';
import { QuizProgressCard } from '@/components/dashboard/QuizProgressCard';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { Card } from '@/components/ui/card';

export default function DashboardPage() {
  const router = useRouter();
  const { studyPlan, isLoading } = useStudyPlan();
  const { user } = useAuth();

  const getDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "User";
  };

  return (
    <div className="space-y-10 max-w-6xl">
      {/* Hero Section */}
      <HeroCard
        variant="greeting"
        userName={getDisplayName()}
        title="Start practicing to achieve your SAT goals"
        buttonText="Go to Study Plan"
        onButtonClick={() => router.push('/dashboard/study-plan')}
      />

      {/* Metrics Row */}
      <Card className="p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-3 gap-10">
          <MetricCard type="finished" value="18" change="+8 tasks" isPositive={true} />
          <MetricCard type="tracked" value="31h" change="-6 hours" isPositive={false} />
          <MetricCard type="efficiency" value="93%" change="+12%" isPositive={true} />
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
            <p className="font-medium">You have {studyPlan.study_plan.sessions.filter((s: any) => s.status === 'pending').length} upcoming sessions</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No study plan found</p>
            <button
              onClick={() => router.push('/onboard')}
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
