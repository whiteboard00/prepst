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
  MessageCircle,
  Sun,
  Moon,
} from "lucide-react";
import { StatisticsPanel } from "@/components/dashboard/StatisticsPanel";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyPlan } from "@/hooks/useStudyPlan";
import { useProfile } from "@/lib/hooks/useProfile";
import { useTheme } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Switch } from "@/components/ui/switch";
import type { PracticeSession } from "@/lib/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const { theme, setTheme, isDarkMode } = useTheme();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { profileData, isLoading } = useProfile();

  // Check if user is admin (based on user metadata or role)
  const isAdmin =
    user?.user_metadata?.role === "admin" ||
    user?.app_metadata?.role === "admin";

  const mainNavItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Study Plan", href: "/dashboard/study-plan", icon: BookOpen },
    { name: "Mock Exam", href: "/dashboard/mock-exam", icon: FileText },
    { name: "Progress", href: "/dashboard/progress", icon: TrendingUp },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { name: "Mind Map", href: "/dashboard/mind-map", icon: Brain },
  ];

  // Add admin analytics link if user is admin
  if (isAdmin) {
    mainNavItems.push({
      name: "Admin Analytics",
      href: "/dashboard/admin/analytics",
      icon: Settings,
    });
  }

  const accountItems = [
    { name: "Chat", href: "/dashboard/chat", icon: MessageCircle },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  const getDisplayName = () => {
    // Don't show anything until profile is loaded
    if (isLoading || !profileData) {
      return "";
    }

    const profile = profileData.profile;

    // First, try the name field (new schema)
    if ((profile as any).name) {
      return (profile as any).name;
    }

    // Fall back to combining first_name and last_name (old schema)
    if ((profile as any).first_name || (profile as any).last_name) {
      return [(profile as any).first_name, (profile as any).last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
    }

    // Try full_name (old schema)
    if ((profile as any).full_name) {
      return (profile as any).full_name;
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
            className={`transition-all duration-300 sticky top-0 h-screen flex-shrink-0 bg-white shadow-sm ${
              isSidebarCollapsed ? "w-20" : "w-64"
            }`}
          >
            <div className="flex flex-col h-full px-6 pt-6">
              {/* Logo */}
              {!isSidebarCollapsed && (
                <div className="mb-10">
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">P</span>
                  </div>
                </div>
              )}

              {/* Main Navigation Section */}
              <div className="space-y-1 flex-1">
                {/* Overview Label */}
                {!isSidebarCollapsed && (
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-3">
                    Overview
                  </p>
                )}

                {/* Main Navigation Items */}
                {mainNavItems.map((item) => {
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
              </div>

              {/* Account section */}
              <div className="space-y-1">
                {/* Account Menu Items */}
                {accountItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center rounded-xl transition-colors ${
                        isActive
                          ? "bg-purple-200 text-gray-900"
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

                {/* Theme Toggle */}
                {!isSidebarCollapsed && (
                  <>
                    <div className="flex items-center justify-between px-4 py-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Sun
                          className={`w-4 h-4 ${
                            !isDarkMode ? "text-yellow-500" : "text-gray-400"
                          }`}
                        />
                        <Switch
                          checked={isDarkMode}
                          onCheckedChange={(checked) =>
                            setTheme(checked ? "dark" : "light")
                          }
                        />
                        <Moon
                          className={`w-4 h-4 ${
                            isDarkMode ? "text-blue-400" : "text-gray-400"
                          }`}
                        />
                      </div>
                    </div>
                    {/* Divider after theme toggle */}
                    <div className="border-t border-gray-200 mx-4 mb-4"></div>
                  </>
                )}

                {/* Profile Section */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className={`flex items-center rounded-xl transition-colors hover:bg-gray-100 text-gray-700 ${
                      isSidebarCollapsed
                        ? "justify-center p-3 mx-auto w-11"
                        : "gap-3 py-3 px-4 w-full"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-base font-semibold text-white">
                        {getInitials()}
                      </span>
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="flex flex-col items-start flex-1">
                        <span className="text-sm font-medium text-gray-900">
                          {getDisplayName()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {user?.email?.split("@")[0]}
                        </span>
                      </div>
                    )}
                  </button>

                  {/* Profile Dropdown Menu */}
                  {isProfileMenuOpen && !isSidebarCollapsed && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsProfileMenuOpen(false)}
                      />
                      <div className="absolute left-0 bottom-full mb-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">
                            {getDisplayName()}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user?.email}
                          </p>
                        </div>
                        <Link
                          href="/dashboard/profile"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <User className="w-4 h-4" />
                          Profile
                        </Link>
                        <div className="border-t border-gray-100 mt-2 pt-2">
                          <button
                            onClick={() => {
                              setIsProfileMenuOpen(false);
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
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 pt-6 px-6 overflow-x-hidden">
            {children}
          </main>

          {/* Right Statistics Panel */}
          <div className="px-6 pt-6">
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
