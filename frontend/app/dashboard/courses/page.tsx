"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Brain, Sparkles, ArrowRight, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCourses, useMyEnrollments } from "@/hooks/queries";
import { useEnrollCourse } from "@/hooks/mutations";
import { cn } from "@/lib/utils";
import type { CourseListItem } from "@/lib/types";

const courseIcons: Record<string, typeof BookOpen> = {
  sat: GraduationCap,
  act: BookOpen,
  gre: Brain,
};

export default function DashboardCoursesPage() {
  const router = useRouter();
  const { data: coursesData, isLoading: coursesLoading } = useCourses();
  const { data: enrollmentsData, isLoading: enrollmentsLoading } = useMyEnrollments();
  const enrollMutation = useEnrollCourse();

  const isLoading = coursesLoading || enrollmentsLoading;
  const courses = coursesData?.courses ?? [];
  const enrolledIds = new Set(enrollmentsData?.enrollments?.map((e) => e.course_id) ?? []);

  const handleEnroll = async (courseId: string) => {
    await enrollMutation.mutateAsync(courseId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">
          Courses
        </h1>
        <p className="text-muted-foreground">
          Pick a course to start mastering. Our AI tutor adapts to any subject.
        </p>
      </motion.div>

      {/* Course Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {courses.map((course, i) => {
          const Icon = courseIcons[course.slug] ?? BookOpen;
          const isEnrolled = enrolledIds.has(course.id);

          return (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className={cn(
                "relative bg-card rounded-2xl border border-border/50 p-7 flex flex-col gap-4 shadow-sm hover:shadow-lg transition-shadow",
                isEnrolled && "ring-2 ring-primary/50"
              )}
            >
              {isEnrolled && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  <Check className="w-3.5 h-3.5" />
                  Enrolled
                </div>
              )}

              <div className="p-3 bg-primary/10 rounded-xl w-fit">
                <Icon className="w-6 h-6 text-primary" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {course.icon} {course.name}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {course.description}
                </p>
              </div>

              <div className="mt-auto pt-2 flex gap-2">
                {isEnrolled ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/courses/${course.slug}`)}
                      className="flex-1"
                    >
                      Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => router.push("/dashboard")}
                      className="flex-1 gap-1.5"
                    >
                      Dashboard <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => handleEnroll(course.id)}
                    disabled={enrollMutation.isPending}
                    size="sm"
                    className="w-full gap-2"
                  >
                    {enrollMutation.isPending ? "Enrolling..." : "Start Learning — Free"}
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Coming Soon Cards */}
        {["ACT", "GRE", "AP Calculus"].filter(
          (name) => !courses.some((c) => c.name === name)
        ).map((name, i) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: (courses.length + i) * 0.08 }}
            className="relative bg-card/50 rounded-2xl border border-dashed border-border/50 p-7 flex flex-col gap-4 opacity-60"
          >
            <div className="p-3 bg-muted rounded-xl w-fit">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">{name}</h3>
              <p className="text-sm text-muted-foreground">
                Coming soon. Same AI tutor, same cognitive engine.
              </p>
            </div>
            <div className="mt-auto pt-2">
              <Button variant="outline" size="sm" disabled className="w-full">
                Coming Soon
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
