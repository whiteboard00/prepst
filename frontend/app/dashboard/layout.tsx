"use client";

import {
  Home,
  BookOpen,
  TrendingUp,
  Brain,
  ChevronLeft,
  ChevronRight,
  FileText,
  BarChart3,
  Settings,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyPlan } from "@/hooks/useStudyPlan";
import type { PracticeSession } from "@/lib/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const { studyPlan } = useStudyPlan();

  // Check if user is admin (based on user metadata or role)
  const isAdmin =
    user?.user_metadata?.role === "admin" ||
    user?.app_metadata?.role === "admin";

  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Study Plan", href: "/dashboard/study-plan", icon: BookOpen },
    { name: "Mock Exam", href: "/dashboard/mock-exam", icon: FileText },
    { name: "Progress", href: "/dashboard/progress", icon: TrendingUp },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { name: "Mind Map", href: "/dashboard/mind-map", icon: Brain },
  ];

  // Add admin analytics link if user is admin
  if (isAdmin) {
    menuItems.push({
      name: "Admin Analytics",
      href: "/dashboard/admin/analytics",
      icon: Settings,
    });
  }

  const completedSessions =
    studyPlan?.study_plan.sessions.filter(
      (s: PracticeSession) => s.status === "completed"
    ) || [];

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
    <div className="min-h-screen bg-white">
      <div className="flex">
        {/* Left Sidebar */}
        <aside
          className={`border-r h-screen transition-all duration-300 relative flex-shrink-0 ${
            isSidebarCollapsed ? "w-20" : "w-64"
          }`}
        >
          <div className="h-full p-6">
            <nav className="space-y-2 relative h-full">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center rounded-xl transition-colors ${
                      isActive
                        ? "bg-purple-200 text-gray-900"
                        : item.name === "Mind Map"
                        ? "hover:bg-gray-100 text-purple-500"
                        : "hover:bg-gray-100 text-gray-700"
                    } ${
                      isSidebarCollapsed
                        ? "justify-center p-3 mx-auto w-11"
                        : "gap-3 py-3 px-4"
                    }`}
                    title={isSidebarCollapsed ? item.name : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!isSidebarCollapsed && (
                      <span className="whitespace-nowrap">{item.name}</span>
                    )}
                  </Link>
                );
              })}

              {/* Toggle button aligned with menu items */}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="absolute -right-9 top-0 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm z-10"
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="w-3 h-3 text-gray-600" />
                ) : (
                  <ChevronLeft className="w-3 h-3 text-gray-600" />
                )}
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-8 overflow-x-hidden">{children}</main>

        {/* Right Profile Section */}
        <aside className="w-80 border-l h-screen p-6 flex-shrink-0">
          <h2 className="text-4xl font-semibold mb-8">Profile</h2>

          {/* Profile Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-4xl font-bold mb-4">
              {getDisplayName().charAt(0).toUpperCase()}
            </div>
            <h3 className="text-xl font-semibold">{getDisplayName()}</h3>
          </div>

          {/* Calendar */}
          <div className="mb-8 flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md bg-gray-50 p-3"
            />
          </div>

          {/* Progress Section */}
          <div>
            <h3 className="text-2xl font-semibold mb-6">Progress</h3>

            {completedSessions.length > 0 ? (
              <div className="space-y-4">
                {completedSessions
                  .slice(0, 3)
                  .map((session: PracticeSession) => (
                    <div key={session.id} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-1">
                        <svg
                          className="w-5 h-5 text-purple-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold">
                          Session {session.session_number}
                        </h4>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          Practice session
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No completed sessions yet</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
