"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Layers,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCourse } from "@/hooks/queries";
import { useAuth } from "@/contexts/AuthContext";

function CoursePublicContent({ slug }: { slug: string }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { data: course, isLoading } = useCourse(slug);

  // Redirect logged-in users to dashboard version
  useEffect(() => {
    if (!loading && user) {
      router.replace(`/dashboard/courses/${slug}`);
    }
  }, [user, loading, router, slug]);

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Course not found</p>
      </div>
    );
  }

  const { config } = course;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold text-foreground mb-3">
            {course.icon} {course.name}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            {course.description}
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
        >
          {config.sections.length > 0 && (
            <div className="bg-accent/30 rounded-xl p-4 border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sections</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{config.sections.map((s) => s.name).join(", ")}</p>
            </div>
          )}
          {config.total_score_max && (
            <div className="bg-accent/30 rounded-xl p-4 border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Score Range</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{config.total_score_min}–{config.total_score_max}</p>
            </div>
          )}
          {config.diagnostic && (
            <div className="bg-accent/30 rounded-xl p-4 border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Diagnostic</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{config.diagnostic.total_questions} questions</p>
            </div>
          )}
          {config.mock_exam && (
            <div className="bg-accent/30 rounded-xl p-4 border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mock Exam</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{config.mock_exam.modules.length} modules</p>
            </div>
          )}
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border border-border/50 p-8 mb-8"
        >
          <h2 className="text-xl font-semibold text-foreground mb-6">What's included</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "AI-powered adaptive tutoring",
              "Bayesian mastery tracking (BKT)",
              "Personalized study plans",
              "Diagnostic assessment",
              "Full-length mock exams",
              "Cognitive velocity analytics",
              "AI-generated feedback on every question",
              "Predictive score modeling",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-4"
        >
          <Button
            size="lg"
            onClick={() => router.push("/signup")}
            className="gap-2"
          >
            Start Learning — Free <ArrowRight className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            100% free, no strings attached
          </span>
        </motion.div>
      </div>
    </div>
  );
}

export default function CoursePublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return <CoursePublicContent slug={slug} />;
}
