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
  User,
} from "lucide-react";
import { StatisticsPanel } from "@/components/dashboard/StatisticsPanel";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyPlan } from "@/hooks/useStudyPlan";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import type { PracticeSession } from "@/lib/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();

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
    { name: "Profile", href: "/dashboard/profile", icon: User },
  ];

  // Add admin analytics link if user is admin
  if (isAdmin) {
    menuItems.push({
      name: "Admin Analytics",
      href: "/dashboard/admin/analytics",
      icon: Settings,
    });
  }

  const getDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "User";
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <div className="flex gap-6 items-start">
          {/* Left Sidebar */}
          <aside
            className={`transition-all duration-300 sticky top-0 h-screen flex-shrink-0 bg-white rounded-r-3xl shadow-sm ${
              isSidebarCollapsed ? "w-20" : "w-64"
            }`}
          >
            <div className="p-6 flex flex-col">
              {/* Logo */}
              {!isSidebarCollapsed && (
                <div className="mb-10">
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">P</span>
                  </div>
                </div>
              )}

              <nav className="space-y-2 flex-1">
                {/* Overview Label */}
                {!isSidebarCollapsed && (
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-3">
                    Overview
                  </p>
                )}

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
                  className="absolute -right-9 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm z-10"
                >
                  {isSidebarCollapsed ? (
                    <ChevronRight className="w-3 h-3 text-gray-600" />
                  ) : (
                    <ChevronLeft className="w-3 h-3 text-gray-600" />
                  )}
                </button>
              </nav>

              {/* Bottom Buttons */}
              {!isSidebarCollapsed && (
                <div className="pt-6">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-3">
                    Settings
                  </p>
                  <div className="space-y-2">
                    <Link
                      href="/dashboard/settings"
                      className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-gray-100 text-gray-700 transition-colors"
                    >
                      <Settings className="w-5 h-5 flex-shrink-0" />
                      <span className="whitespace-nowrap">Settings</span>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-gray-100 text-gray-700 transition-colors"
                    >
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className="whitespace-nowrap">Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 pt-6 px-6 overflow-x-hidden">{children}</main>

          {/* Right Statistics Panel */}
          <div className="pr-6 pt-6">
            <StatisticsPanel
              userName={getDisplayName()}
              progressPercentage={32}
              currentSession={{
                number: 2,
                title: "Text Structure and Purpose"
              }}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
