"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { config } from "@/lib/config";
import { ClipboardList, TrendingUp, Clock, CheckCircle } from "lucide-react";

function DiagnosticTestLandingContent() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateTest = async () => {
    try {
      setIsCreating(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(`${config.apiUrl}/api/diagnostic-test/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error("Failed to create diagnostic test");

      const data = await response.json();

      // Preserve returnToOnboarding parameter if present
      const urlParams = new URLSearchParams(window.location.search);
      const returnToOnboarding = urlParams.get('returnToOnboarding');
      if (returnToOnboarding === 'true') {
        router.push(`/diagnostic-test/${data.test.id}?returnToOnboarding=true`);
      } else {
        router.push(`/diagnostic-test/${data.test.id}`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create diagnostic test");
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-xl p-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
            <ClipboardList className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Diagnostic Test
          </h1>
          <p className="text-lg text-gray-600">
            Establish your baseline mastery across all SAT topics
          </p>
        </div>

        {/* What to Expect */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            What to Expect
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <ClipboardList className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">40 Questions Total</p>
                <p className="text-sm text-gray-600">
                  20 Math and 20 Reading & Writing questions
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">No Time Limit</p>
                <p className="text-sm text-gray-600">
                  Take your time and answer thoughtfully
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">
                  Establishes Baseline Mastery
                </p>
                <p className="text-sm text-gray-600">
                  Your results determine initial mastery levels for personalized
                  study plans
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">
                  Adaptive Learning Starts Here
                </p>
                <p className="text-sm text-gray-600">
                  Your performance helps us identify which topics need more
                  attention
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Instructions
          </h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                Answer all questions to the best of your ability
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                You can navigate between questions and mark them for review
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                Your answers are saved automatically as you progress
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                Results will show your mastery level for each topic
              </span>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="flex gap-4">
          <Button
            onClick={handleCreateTest}
            disabled={isCreating}
            size="lg"
            className="flex-1 text-lg h-14"
          >
            {isCreating ? "Creating..." : "Start Diagnostic Test"}
          </Button>
          <Button
            onClick={() => router.push("/dashboard")}
            variant="outline"
            size="lg"
            className="flex-1 text-lg h-14"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DiagnosticTestLandingPage() {
  return (
    <ProtectedRoute>
      <DiagnosticTestLandingContent />
    </ProtectedRoute>
  );
}
