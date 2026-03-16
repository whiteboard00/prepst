"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Layers,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCourse, useMyEnrollments } from "@/hooks/queries";
import { useEnrollCourse } from "@/hooks/mutations";

function CourseDetailContent({ slug }: { slug: string }) {
  const router = useRouter();
  const { data: course, isLoading } = useCourse(slug);
  const { data: enrollmentsData } = useMyEnrollments();
  const enrollMutation = useEnrollCourse();

  const isEnrolled = enrollmentsData?.enrollments?.some(
    (e) => e.course_id === course?.id
  );

  const handleEnroll = async () => {
    if (!course) return;
    await enrollMutation.mutateAsync(course.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Course not found</p>
      </div>
    );
  }

  const { config } = course;

  return (
    <div className="py-8">
      {/* Back */}
      <Button
        variant="ghost"
        onClick={() => router.push("/dashboard/courses")}
        className="mb-6 gap-2 text-muted-foreground -ml-2"
      >
        <ArrowLeft className="w-4 h-4" /> All Courses
      </Button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {course.icon} {course.name}
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          {course.description}
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
      >
        {config.sections.length > 0 && (
          <StatCard
            icon={Layers}
            label="Sections"
            value={config.sections.map((s) => s.name).join(", ")}
          />
        )}
        {config.total_score_max && (
          <StatCard
            icon={Target}
            label="Score Range"
            value={`${config.total_score_min}–${config.total_score_max}`}
          />
        )}
        {config.diagnostic && (
          <StatCard
            icon={Brain}
            label="Diagnostic"
            value={`${config.diagnostic.total_questions} questions`}
          />
        )}
        {config.mock_exam && (
          <StatCard
            icon={Clock}
            label="Mock Exam"
            value={`${config.mock_exam.modules.length} modules`}
          />
        )}
      </motion.div>

      {/* What You Get */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-2xl border border-border/50 p-8 mb-8"
      >
        <h2 className="text-lg font-semibold text-foreground mb-5">
          What's included
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
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
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
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
        {isEnrolled ? (
          <Button
            size="lg"
            onClick={() => router.push("/dashboard")}
            className="gap-2"
          >
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={handleEnroll}
            disabled={enrollMutation.isPending}
            className="gap-2"
          >
            {enrollMutation.isPending ? "Enrolling..." : "Start Learning — Free"}
            {!enrollMutation.isPending && <ArrowRight className="w-4 h-4" />}
          </Button>
        )}
        <span className="text-sm text-muted-foreground">
          100% free, no strings attached
        </span>
      </motion.div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-accent/30 rounded-xl p-4 border border-border/30">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return <CourseDetailContent slug={slug} />;
}
