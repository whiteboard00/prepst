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
  LogOut,
  ChevronDown,
} from "lucide-react";
import { StatisticsPanel } from "@/components/dashboard/StatisticsPanel";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyPlan } from "@/hooks/useStudyPlan";
import { useProfile } from "@/lib/hooks/useProfile";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import type { PracticeSession } from "@/lib/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { profileData, isLoading } = useProfile();

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

  const getDisplayName = () => {
    // Don't show anything until profile is loaded
    if (isLoading || !profileData) {
      return "";
    }

    const profile = profileData.profile;

    // First, try the name field
    if (profile.name) {
      return profile.name;
    }

    // Fall back to auth user metadata
    if (user?.user_metadata?.name) {
      return user.user_metadata.name;
    }

    // Only show email as last resort
    if (profile.email) {
      return profile.email.split("@")[0];
    }

    return "";
  };

  const getInitials = () => {
    if (isLoading || !profileData) {
      return "";
    }

    const name = getDisplayName();
    if (!name) return "U";

    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    } else if (name.length > 0) {
      return name[0].toUpperCase();
    }
    return "U";
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
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
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 pt-6 px-6 overflow-x-hidden">
            {/* Top Bar with User Menu */}
            <div className="flex justify-end mb-6">
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {getInitials()}
                    </span>
                  </div>
                  {!isLoading && profileData && (
                    <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                      {getDisplayName()}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      isUserMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                      <div className="px-4 py-3 border-b border-gray-100">
                        {!isLoading && profileData && (
                          <>
                            <p className="text-sm font-semibold text-gray-900">
                              {getDisplayName()}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {user?.email}
                            </p>
                          </>
                        )}
                      </div>
                      <Link
                        href="/dashboard/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                      <div className="border-t border-gray-100 mt-2 pt-2">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            handleSignOut();
                          }}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                        >
                          <LogOut className="w-4 h-4" />
                          Log Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            {children}
          </main>

          {/* Right Statistics Panel */}
          <div className="pr-6 pt-6">
            <StatisticsPanel
              userName={getDisplayName()}
              progressPercentage={32}
              currentSession={{
                number: 2,
                title: "Text Structure and Purpose",
              }}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
