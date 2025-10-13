"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function StudyPlanRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the dashboard study plan page
    router.replace("/dashboard/study-plan");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-700 font-medium">
          Redirecting to study plan...
        </p>
      </div>
    </div>
  );
}

export default function StudyPlanPage() {
  return (
    <ProtectedRoute>
      <StudyPlanRedirect />
    </ProtectedRoute>
  );
}
