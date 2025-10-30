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
  MessageCircle,
  Sun,
  Moon,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  RotateCcw,
} from "lucide-react";
import { StatisticsPanel } from "@/components/dashboard/StatisticsPanel";
import { ProfileDropdown } from "@/components/dashboard/ProfileDropdown";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyPlan } from "@/hooks/useStudyPlan";
import { useProfile } from "@/lib/hooks/useProfile";
import { useTheme } from "@/contexts/ThemeContext";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { PracticeSession } from "@/lib/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isStudyPlanExpanded, setIsStudyPlanExpanded] = useState(true);
  const [isProgressExpanded, setIsProgressExpanded] = useState(true);
  const [isMockExamExpanded, setIsMockExamExpanded] = useState(true);
  const { theme, setTheme, isDarkMode } = useTheme();
  const pathname = usePathname();
  const { user } = useAuth();
  const { profileData, isLoading } = useProfile();

  // Handle responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);

      // Auto-collapse sidebar on mobile
      if (mobile) {
        setIsSidebarCollapsed(true);
        setIsMobileMenuOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Check if user is admin (based on user metadata or role)
  const isAdmin =
    user?.user_metadata?.role === "admin" ||
    user?.app_metadata?.role === "admin";

  const mainNavItems = [
    { name: "Mind Map", href: "/dashboard/mind-map", icon: Brain },
  ];

  const dashboardItems = [
    { name: "Overview", href: "/dashboard", icon: Home },
    {
      name: "Study Plan",
      href: "/dashboard/study-plan",
      icon: BookOpen,
      isCollapsible: true,
      subItems: [
        {
          name: "Practice",
          href: "/dashboard/study-plan",
          icon: PlayCircle,
        },
        {
          name: "Revision",
          href: "/dashboard/revision",
          icon: RotateCcw,
        },
        {
          name: "Drill",
          href: "/dashboard/drill",
          icon: Brain,
        },
      ],
    },
    {
      name: "Mock Exam",
      href: "/dashboard/mock-exam",
      icon: FileText,
      isCollapsible: true,
      subItems: [
        {
          name: "Mock Exam",
          href: "/dashboard/mock-exam",
          icon: FileText,
        },
        {
          name: "Mock Progress",
          href: "/dashboard/mock-progress",
          icon: BarChart3,
        },
      ],
    },
    {
      name: "Progress",
      href: "/dashboard/progress",
      icon: TrendingUp,
      isCollapsible: true,
      subItems: [
        {
          name: "Overview",
          href: "/dashboard/progress",
          icon: BarChart3,
        },
        {
          name: "Lorem",
          href: "/dashboard/lorem",
          icon: FileText,
        },
      ],
    },
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

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex items-start gap-6">
        {/* Mobile Overlay */}
        {isMobile && isMobileMenuOpen && !isSidebarCollapsed && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Left Sidebar */}
        <aside
          key={`sidebar-${isMobile}-${isSidebarCollapsed}`}
          className={`transition-all duration-300 sticky top-0 h-screen flex-shrink-0 bg-white shadow-sm ${
            isSidebarCollapsed ? "w-16" : "w-56"
          } ${
            isMobile
              ? isSidebarCollapsed
                ? "w-0 overflow-hidden" // Hide completely on mobile when collapsed
                : `fixed left-0 z-50 w-56 ${
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                  }`
              : ""
          }`}
        >
          <div
            className={`flex flex-col h-full ${
              isMobile ? "px-3 pt-4" : "px-4 pt-6"
            }`}
          >
            {/* Logo removed per request */}

            {/* Main Navigation Section */}
            <div className="space-y-1 flex-1">
              {/* Dashboard Section */}
              <div className="space-y-1">
                {/* Dashboard Label */}
                {!isSidebarCollapsed && (
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-3">
                    Dashboard
                  </p>
                )}

                {/* Dashboard Items */}
                {dashboardItems.map((item) => {
                  const Icon = item.icon;
                  const hasActiveSubItem =
                    item.subItems &&
                    item.subItems.some((subItem) => pathname === subItem.href);
                  // Only highlight parent if it's directly active AND no sub-item is active
                  const isActive = pathname === item.href && !hasActiveSubItem;

                  if (item.isCollapsible) {
                    const isExpanded =
                      item.name === "Study Plan"
                        ? isStudyPlanExpanded
                        : item.name === "Mock Exam"
                        ? isMockExamExpanded
                        : isProgressExpanded;
                    const setExpanded =
                      item.name === "Study Plan"
                        ? setIsStudyPlanExpanded
                        : item.name === "Mock Exam"
                        ? setIsMockExamExpanded
                        : setIsProgressExpanded;

                    return (
                      <div key={item.name} className="space-y-1">
                        {/* Collapsible Header */}
                        <button
                          onClick={() => setExpanded(!isExpanded)}
                          className={`flex items-center rounded-xl transition-colors hover:bg-gray-100 text-gray-700 ${
                            isActive ? "bg-purple-200 text-gray-900" : ""
                          } ${
                            isSidebarCollapsed
                              ? "justify-center p-3 mx-auto w-11"
                              : `gap-3 py-3 px-4 ${
                                  isMobile ? "py-4" : ""
                                } text-sm`
                          }`}
                          title={isSidebarCollapsed ? item.name : undefined}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          {!isSidebarCollapsed && (
                            <>
                              <span className="whitespace-nowrap">
                                {item.name}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 ml-auto" />
                              ) : (
                                <ChevronDown className="w-4 h-4 ml-auto" />
                              )}
                            </>
                          )}
                        </button>

                        {/* Sub-items */}
                        {!isSidebarCollapsed && isExpanded && item.subItems && (
                          <div className="ml-6 space-y-1">
                            {item.subItems.map((subItem) => {
                              const SubIcon = subItem.icon;
                              const isSubActive = pathname === subItem.href;
                              return (
                                <Link
                                  key={subItem.href}
                                  href={subItem.href}
                                  className={`flex items-center rounded-xl transition-colors ${
                                    isSubActive
                                      ? "bg-purple-200 text-gray-900"
                                      : "hover:bg-gray-100 text-gray-700"
                                  } gap-3 py-2 px-4 text-xs ${
                                    isMobile ? "py-3" : ""
                                  }`}
                                >
                                  <SubIcon className="w-3 h-3 flex-shrink-0" />
                                  <span className="whitespace-nowrap text-sm">
                                    {subItem.name}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Regular navigation item
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
                          : `gap-3 py-3 px-4 ${isMobile ? "py-4" : ""} text-sm`
                      }`}
                      title={isSidebarCollapsed ? item.name : undefined}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!isSidebarCollapsed && (
                        <span className="whitespace-nowrap">{item.name}</span>
                      )}
                    </Link>
                  );
                })}
              </div>

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
                        : `gap-3 py-3 px-4 ${isMobile ? "py-4" : ""} text-sm`
                    }`}
                    title={isSidebarCollapsed ? item.name : undefined}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
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
                        : `gap-3 py-3 px-4 ${isMobile ? "py-4" : ""} text-sm`
                    }`}
                    title={isSidebarCollapsed ? item.name : undefined}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
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

              {/* Profile Section - Show for signed in users */}
              {user && (
                <ProfileDropdown isSidebarCollapsed={isSidebarCollapsed} />
              )}
            </div>

            {/* Auth buttons for non-signed in users */}
            {!user && (
              <div className="space-y-2 pb-2">
                <Link href="/signup" className="block">
                  <Button
                    className="w-full"
                    style={{ backgroundColor: "#866ffe" }}
                    size="sm"
                  >
                    {!isSidebarCollapsed && "Register"}
                  </Button>
                </Link>
                <Link href="/login" className="block">
                  <Button
                    variant="outline"
                    className="w-full border-purple-200 hover:bg-purple-50"
                    size="sm"
                  >
                    {!isSidebarCollapsed && "Log In"}
                  </Button>
                </Link>
              </div>
            )}

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
        <main
          className={`flex-1 min-w-0 overflow-x-hidden ${
            isMobile ? "pt-4 px-4" : "pt-6 px-6"
          }`}
        >
          {children}
        </main>

        {/* Right Statistics Panel - COMMENTED OUT */}

        <div className="hidden lg:block pl-3 pr-4 pt-6">
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
  );
}
