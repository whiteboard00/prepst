"use client";

import { StatisticsPanel } from "@/components/dashboard/StatisticsPanel";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { useProfile } from "@/hooks/queries";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { data: profileData, isLoading } = useProfile();

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
        <DashboardSidebar />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 overflow-x-hidden pt-6 px-6">
          {children}
        </main>

        {/* Right Statistics Panel */}
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
