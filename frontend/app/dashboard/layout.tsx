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
  History,
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
  Video,
  Notebook,
  UserPlus,
  LogIn,
  Shield,
  BookMarked,
  XCircle,
  Bookmark,
  Sparkles,
  Database,
} from "lucide-react";
import { motion } from "framer-motion";
// import { StatisticsPanel } from "@/components/dashboard/StatisticsPanel";
import { ProfileDropdown } from "@/components/dashboard/ProfileDropdown";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyPlan } from "@/hooks/useQueries";
import { useProfile } from "@/hooks/queries";
import { useTheme } from "@/contexts/ThemeContext";
import { useCourseConfigSafe } from "@/contexts/CourseContext";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PracticeSession } from "@/lib/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize sidebar collapsed state from localStorage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dashboard-sidebar-collapsed");
      return saved === "true";
    }
    return false;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isStudyPlanExpanded, setIsStudyPlanExpanded] = useState(true);
  const [isProgressExpanded, setIsProgressExpanded] = useState(true);
  const [isMockExamExpanded, setIsMockExamExpanded] = useState(true);
  const { theme, setTheme, isDarkMode } = useTheme();
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: profileData, isLoading } = useProfile();
  const queryClient = useQueryClient();
  const { course, courseSlug, setCourseSlug } = useCourseConfigSafe();

  // Prefetch critical data in parallel for faster navigation
  useEffect(() => {
    if (!user) return;

    // Prefetch profile and study plan in parallel
    Promise.all([
      queryClient.prefetchQuery({
        queryKey: ["profile", user.id],
        queryFn: () => api.get("/api/profile"),
        staleTime: 5 * 60 * 1000, // 5 minutes
      }),
      queryClient.prefetchQuery({
        queryKey: ["studyPlan"],
        queryFn: () => api.getStudyPlan(),
        staleTime: 5 * 60 * 1000,
      }),
    ]).catch((err) => {
      console.error("Prefetch error:", err);
    });
  }, [user, queryClient]);

  // Persist sidebar collapsed state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && !isMobile) {
      localStorage.setItem(
        "dashboard-sidebar-collapsed",
        String(isSidebarCollapsed)
      );
    }
  }, [isSidebarCollapsed, isMobile]);

  // Handle responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);

      // Auto-collapse sidebar on mobile (override saved state)
      if (mobile) {
        setIsSidebarCollapsed(true);
        setIsMobileMenuOpen(false);
      } else {
        // On desktop, restore saved state
        const saved = localStorage.getItem("dashboard-sidebar-collapsed");
        if (saved !== null) {
          setIsSidebarCollapsed(saved === "true");
        }
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Close mobile menus when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMobileMoreOpen(false);
  }, [pathname]);

  // Check if user is admin (based on user metadata or role)
  const isAdmin =
    user?.user_metadata?.role === "admin" ||
    user?.app_metadata?.role === "admin";

  type NavItem = {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  };

  type DashboardNavItem = NavItem & {
    isCollapsible?: boolean;
    subItems?: {
      name: string;
      href: string;
      icon: React.ComponentType<{ className?: string }>;
    }[];
  };

  const mainNavItems: NavItem[] = [
    // Mind Map commented out - keeping implementation as dead code
    // { name: "Mind Map", href: "/dashboard/mind-map", icon: Brain },
  ];

  const dashboardItems: DashboardNavItem[] = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Courses", href: "/dashboard/courses", icon: Sparkles },
    { name: "Study Plan", href: "/dashboard/study-plan", icon: BookOpen },
    { name: "Sessions", href: "/dashboard/sessions", icon: History },
    { name: "Revision", href: "/dashboard/revision", icon: RotateCcw },
    { name: "Drill", href: "/dashboard/drill", icon: Brain },
    { name: "Questions", href: "/dashboard/question-pool", icon: Database },
    {
      name: "Mock Exam",
      href: "/dashboard/mock-exam",
      icon: FileText,
    },
    {
      name: "Vocab",
      href: "/dashboard/vocab",
      icon: BookMarked,
    },
    // {
    //   name: "Missed Questions",
    //   href: "/dashboard/missed",
    //   icon: XCircle,
    // },
    // {
    //   name: "Saved Questions",
    //   href: "/dashboard/saved",
    //   icon: Bookmark,
    // },
    {
      name: "Progress",
      href: "/dashboard/progress",
      icon: TrendingUp,
    },
    // { name: "Manim", href: "/dashboard/manim", icon: Video },
    // { name: "Notebook", href: "/dashboard/notebook", icon: Notebook },
  ];

  // Add admin analytics link if user is admin
  // Commented out - keeping implementation as dead code
  // if (isAdmin) {
  //   mainNavItems.push({
  //     name: "Admin Analytics",
  //     href: "/dashboard/admin/analytics",
  //     icon: Settings,
  //   });
  // }

  const accountItems: {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
      // { name: "Chat", href: "/dashboard/chat", icon: MessageCircle },
      // { name: "Settings", href: "/dashboard/settings", icon: Settings },
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

  const targetSidebarWidth = isMobile
    ? isSidebarCollapsed
      ? 0
      : 100
    : isSidebarCollapsed
      ? 72
      : 120;
  const navIconSize = "w-6 h-6";

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-start gap-4 lg:gap-5">
        {/* Mobile Overlay */}
        {isMobile && isMobileMenuOpen && !isSidebarCollapsed && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Left Sidebar */}
        <motion.aside
          animate={{ width: targetSidebarWidth }}
          initial={false}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className={`sticky top-0 h-screen flex-shrink-0 bg-card border-r border-border z-30 will-change-[width] ${isMobile
              ? isSidebarCollapsed
                ? "overflow-hidden border-none"
                : `fixed left-0 z-50 shadow-2xl ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                }`
              : ""
            }`}
          style={{ width: targetSidebarWidth }}
        >
          <div
            className={`flex flex-col h-full overflow-hidden ${isMobile ? "px-4 pt-6" : "px-4 pt-8"
              }`}
          >
            <Link
              href="/dashboard"
              className="flex-shrink-0 flex items-center mb-4"
              aria-label="Home"
            >
              <img
                src="/prepst.svg"
                alt="Prepst"
                className={`h-[60px] px-2.5 w-auto object-contain ${isSidebarCollapsed ? "mx-auto" : ""
                  }`}
              />
            </Link>
            {/* Course Badge */}
            {!isSidebarCollapsed && course && (
              <div className="flex justify-center mb-2">
                <Link
                  href="/dashboard/courses"
                  className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  {course.name}
                </Link>
              </div>
            )}
            {/* Toggle button aligned with menu items */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`absolute -right-3 top-8 w-8 h-8 bg-background rounded-full flex items-center justify-center hover:bg-muted transition-all duration-300 shadow-sm z-50 group ${isMobile ? "hidden" : "flex"
                }`}
              style={{
                border: "1px solid #866ffe",
              }}
            >
              {isSidebarCollapsed ? (
                <ChevronRight
                  className="w-4 h-4 transition-colors"
                  style={{ color: "#866ffe" }}
                />
              ) : (
                <ChevronLeft
                  className="w-4 h-4 transition-colors"
                  style={{ color: "#866ffe" }}
                />
              )}
            </button>

            {/* Main Navigation Section */}
            <div
              className="flex min-h-0 flex-col justify-start space-y-6 flex-1 overflow-x-hidden overflow-y-auto scrollbar-hide py-5"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {/* Dashboard Section */}
              <div className="space-y-2">
                {/* Dashboard Label */}
                {/* <p
                  className={`text-xs font-bold text-muted-foreground/70 uppercase tracking-widest px-4 mb-4 transition-opacity duration-200 ${isSidebarCollapsed ? "opacity-0 invisible" : "opacity-100"
                    }`}
                >
                  Dashboard
                </p> */}

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
                        {/* Collapsible Header - Navigate when collapsed, expand/collapse when expanded */}
                        {isSidebarCollapsed ? (
                          <Link
                            href={item.href}
                            className={`w-full flex items-center rounded-2xl transition-all duration-200 group ${isActive
                                ? "bg-primary/10 text-primary font-semibold"
                                : "hover:bg-muted/60 text-muted-foreground hover:text-foreground font-medium"
                              } justify-center p-3 mx-auto w-12 h-12`}
                            title={item.name}
                          >
                            <Icon
                              className={`flex-shrink-0 transition-colors ${isActive
                                  ? "text-primary"
                                  : "text-muted-foreground group-hover:text-foreground"
                                } ${navIconSize}`}
                            />
                          </Link>
                        ) : (
                          <button
                            onClick={() => setExpanded(!isExpanded)}
                            className={`w-full flex flex-col items-center gap-1 rounded-2xl transition-all duration-200 group ${isActive
                                ? "bg-primary/10 text-primary font-semibold"
                                : "hover:bg-muted/60 text-muted-foreground hover:text-foreground font-medium"
                              } py-3 px-3 mx-auto ${isMobile ? "py-4" : ""}`}
                          >
                            <Icon
                              className={`flex-shrink-0 transition-colors ${isActive
                                  ? "text-primary"
                                  : "text-muted-foreground group-hover:text-foreground"
                                } ${navIconSize}`}
                            />
                            <span className="text-xs whitespace-nowrap">
                              {item.name}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground/70" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground/70" />
                            )}
                          </button>
                        )}

                        {/* Sub-items */}
                        {!isSidebarCollapsed && isExpanded && item.subItems && (
                          <div className="mt-1 space-y-0 relative">
                            {/* Vertical line for hierarchy */}
                            <div className="absolute left-[26px] top-0 bottom-2 w-px bg-border/60" />

                            {item.subItems.map((subItem) => {
                              const SubIcon = subItem.icon;
                              const isSubActive = pathname === subItem.href;
                              return (
                                <Link
                                  key={subItem.href}
                                  href={subItem.href}
                                  className={`flex items-center rounded-xl transition-all duration-200 relative z-10 ml-3 mr-2 ${isSubActive
                                      ? "bg-primary/5 text-primary font-medium"
                                      : "hover:bg-muted/50 hover:text-foreground text-muted-foreground"
                                    } gap-3 py-2.5 px-4 text-sm ${isMobile ? "py-3" : ""
                                    }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${isSubActive
                                        ? "bg-primary"
                                        : "bg-muted-foreground/40"
                                      } flex-shrink-0`}
                                  />
                                  <span className="whitespace-nowrap">
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
                      className={`rounded-2xl transition-all duration-200 group ${isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "hover:bg-muted/60 hover:text-foreground text-muted-foreground font-medium"
                        } ${isSidebarCollapsed
                          ? "flex justify-center p-3 mx-auto w-12 h-12"
                          : `flex flex-col items-center gap-1 py-3 px-3 ${isMobile ? "py-4" : ""
                          }`
                        }`}
                      title={isSidebarCollapsed ? item.name : undefined}
                    >
                      <Icon
                        className={`flex-shrink-0 transition-colors ${isActive
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-foreground"
                          } ${navIconSize}`}
                      />
                      {!isSidebarCollapsed && (
                        <span className="text-xs whitespace-nowrap">
                          {item.name}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Main Navigation Items */}
              {mainNavItems.length > 0 && (
                <div className="space-y-2">
                  {!isSidebarCollapsed && (
                    <div className="h-px bg-border/50 mx-4 my-2" />
                  )}
                  {mainNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`rounded-2xl transition-all duration-200 group ${isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : item.name === "Mind Map"
                              ? "hover:bg-accent text-purple-500"
                              : "hover:bg-muted/60 hover:text-foreground text-muted-foreground font-medium"
                          } ${isSidebarCollapsed
                            ? "flex justify-center p-3 mx-auto w-12 h-12"
                            : `flex flex-col items-center gap-1 py-3 px-3 ${isMobile ? "py-4" : ""
                            }`
                          }`}
                        title={isSidebarCollapsed ? item.name : undefined}
                      >
                        <Icon
                          className={`flex-shrink-0 transition-colors ${isActive
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground"
                            } ${navIconSize}`}
                        />
                        {!isSidebarCollapsed && (
                          <span className="text-xs whitespace-nowrap">
                            {item.name}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Account section */}
            <div className="space-y-3 pb-3">
              {!isSidebarCollapsed && (
                <div className="h-px bg-border/50 mx-4 mb-2" />
              )}

              {/* Theme Switcher - same compact layout when expanded or collapsed */}
              <div className="flex items-center justify-center p-3 mx-auto w-12 h-12 rounded-2xl transition-all duration-200 group">
                <Switch
                  checked={isDarkMode}
                  onCheckedChange={(checked) =>
                    setTheme(checked ? "dark" : "light")
                  }
                >
                  {isDarkMode ? (
                    <Moon className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <Sun className="h-3 w-3 text-muted-foreground" />
                  )}
                </Switch>
              </div>

              {/* Account Menu Items */}
              {accountItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-2xl transition-all duration-200 group ${isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "hover:bg-muted/60 hover:text-foreground text-muted-foreground font-medium"
                      } ${isSidebarCollapsed
                        ? "flex justify-center p-3 mx-auto w-12 h-12"
                        : `flex flex-col items-center gap-1 py-3 px-3 ${isMobile ? "py-4" : ""
                        }`
                      }`}
                    title={isSidebarCollapsed ? item.name : undefined}
                  >
                    <Icon
                      className={`flex-shrink-0 transition-colors ${isActive
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground"
                        } ${navIconSize}`}
                    />
                    {!isSidebarCollapsed && (
                      <span className="text-xs whitespace-nowrap">
                        {item.name}
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* Admin Button - Show for admin users */}
              {user && isAdmin && (
                <div className={`mt-2 ${isSidebarCollapsed ? "mx-auto" : ""}`}>
                  <Link
                    href="/admin"
                    className={`flex items-center rounded-2xl transition-all duration-200 group hover:bg-muted/60 ${isSidebarCollapsed
                        ? "justify-center p-3 mx-auto w-12 h-12"
                        : "gap-3 py-3 px-4 text-[15px]"
                      }`}
                    title={isSidebarCollapsed ? "Admin Dashboard" : undefined}
                  >
                    <Shield className="flex-shrink-0 text-amber-500 group-hover:text-amber-600 w-5 h-5" />
                    {/* {!isSidebarCollapsed && (
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        Admin Dashboard
                      </span>
                    )} */}
                  </Link>
                </div>
              )}

              {/* Profile Section - Show for signed in users */}
              {user && (
                <div className={`mt-2 ${isSidebarCollapsed ? "mx-auto" : ""}`}>
                  <ProfileDropdown isSidebarCollapsed={isSidebarCollapsed} />
                </div>
              )}
            </div>

            {/* Auth buttons for non-signed in users */}
            {!user && (
              <div className="space-y-4 pb-6 px-2 pt-2">
                <Link href="/signup" className="block">
                  <Button
                    className={`w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-xl ${isSidebarCollapsed
                        ? "h-12 w-12 p-0 rounded-2xl flex items-center justify-center"
                        : "h-12 px-4"
                      }`}
                    size="sm"
                  >
                    {isSidebarCollapsed ? (
                      <UserPlus className="w-5 h-5" />
                    ) : (
                      "Sign Up"
                    )}
                  </Button>
                </Link>
                <Link href="/login" className="block">
                  <Button
                    variant="outline"
                    className={`w-full border-border hover:bg-muted/50 rounded-xl ${isSidebarCollapsed
                        ? "h-12 w-12 p-0 rounded-2xl flex items-center justify-center"
                        : "h-12 px-4"
                      }`}
                    size="sm"
                  >
                    {isSidebarCollapsed ? (
                      <LogIn className="w-5 h-5" />
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </motion.aside>

        {/* Main Content Area */}
        <main
          className={`flex-1 min-w-0 overflow-x-hidden ${isMobile
              ? "pt-4 px-4 pb-20"
              : "pt-6 px-6 lg:max-w-6xl xl:max-w-7xl mx-auto w-full"
            }`}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
          <div className="flex items-center justify-around h-16 px-1">
            {[
              { name: "Home", href: "/dashboard", icon: Home },
              { name: "Study", href: "/dashboard/study-plan", icon: BookOpen },
              { name: "Practice", href: "/dashboard/drill", icon: Brain },
              { name: "Exams", href: "/dashboard/mock-exam", icon: FileText },
              { name: "More", href: "__more__", icon: Menu },
            ].map((item) => {
              if (item.href === "__more__") {
                return (
                  <button
                    key={item.name}
                    onClick={() => setIsMobileMoreOpen(!isMobileMoreOpen)}
                    className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-lg transition-colors ${
                      isMobileMoreOpen
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{item.name}</span>
                  </button>
                );
              }
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile "More" menu overlay */}
          {isMobileMoreOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/40 z-40"
                onClick={() => setIsMobileMoreOpen(false)}
              />
              <div className="absolute bottom-full left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-2xl p-4 pb-2 animate-in slide-in-from-bottom-4">
                <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
                <div className="grid grid-cols-4 gap-3 mb-3">
                  {dashboardItems
                    .filter(
                      (item) =>
                        !["/dashboard", "/dashboard/study-plan", "/dashboard/drill", "/dashboard/mock-exam"].includes(
                          item.href
                        )
                    )
                    .map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileMoreOpen(false)}
                          className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-colors ${
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted/60"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-[10px] font-medium text-center leading-tight">
                            {item.name}
                          </span>
                        </Link>
                      );
                    })}
                  {/* Profile link in More menu */}
                  {user && (
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setIsMobileMoreOpen(false)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-colors ${
                        pathname === "/dashboard/profile"
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      <Settings className="w-5 h-5" />
                      <span className="text-[10px] font-medium text-center leading-tight">
                        Profile
                      </span>
                    </Link>
                  )}
                </div>
                {/* Course badge */}
                {course && (
                  <div className="flex justify-center pb-2">
                    <Link
                      href="/dashboard/courses"
                      onClick={() => setIsMobileMoreOpen(false)}
                      className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full bg-primary/10 text-primary"
                    >
                      {course.name}
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>
      )}
    </div>
  );
}
