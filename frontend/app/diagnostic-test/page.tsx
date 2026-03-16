"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { config } from "@/lib/config";
import { ClipboardList, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { useCourseConfig } from "@/contexts/CourseContext";

function DiagnosticTestLandingContent() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const { diagnosticTotalQuestions, sections, sectionName } = useCourseConfig();

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
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-card rounded-[2rem] shadow-2xl border border-border/40 p-10 md:p-16 relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-primary/10 rounded-[2rem] mb-6 rotate-3 hover:rotate-0 transition-transform duration-300">
              <ClipboardList className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
              Diagnostic Test
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Establish your baseline mastery across all SAT topics to unlock your personalized learning path.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-4 mb-12">
            <div className="bg-accent/30 p-6 rounded-2xl border border-border/50 flex items-start gap-4 hover:bg-accent/50 transition-colors">
              <div className="p-2.5 bg-background rounded-xl shadow-sm">
                <ClipboardList className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{diagnosticTotalQuestions} Questions</h3>
                <p className="text-sm text-muted-foreground">
                  Comprehensive coverage of {sections.map((s) => sectionName(s.key)).join(" and ")}.
                </p>
              </div>
            </div>

            <div className="bg-accent/30 p-6 rounded-2xl border border-border/50 flex items-start gap-4 hover:bg-accent/50 transition-colors">
              <div className="p-2.5 bg-background rounded-xl shadow-sm">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">No Time Limit</h3>
                <p className="text-sm text-muted-foreground">
                  Take your time to answer thoughtfully and accurately.
                </p>
              </div>
            </div>

            <div className="bg-accent/30 p-6 rounded-2xl border border-border/50 flex items-start gap-4 hover:bg-accent/50 transition-colors">
              <div className="p-2.5 bg-background rounded-xl shadow-sm">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Baseline Mastery</h3>
                <p className="text-sm text-muted-foreground">
                  Determines your starting level for adaptive practice.
                </p>
              </div>
            </div>

            <div className="bg-accent/30 p-6 rounded-2xl border border-border/50 flex items-start gap-4 hover:bg-accent/50 transition-colors">
              <div className="p-2.5 bg-background rounded-xl shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Smart Calibration</h3>
                <p className="text-sm text-muted-foreground">
                  Identifies your strengths and areas for improvement.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleCreateTest}
              disabled={isCreating}
              size="lg"
              className="h-14 px-8 text-lg font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-0.5"
            >
              {isCreating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Creating Test...
                </>
              ) : (
                "Start Diagnostic"
              )}
            </Button>
            <Button
              onClick={() => router.push("/dashboard")}
              variant="outline"
              size="lg"
              className="h-14 px-8 text-lg border-2 hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              Back to Dashboard
            </Button>
          </div>
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
