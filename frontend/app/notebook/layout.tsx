"use client";

import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default function NotebookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex items-start gap-6">
        <DashboardSidebar />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

