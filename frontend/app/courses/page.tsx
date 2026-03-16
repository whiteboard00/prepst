"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Brain, Sparkles, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCourses } from "@/hooks/queries";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { CourseListItem } from "@/lib/types";

const courseIcons: Record<string, typeof BookOpen> = {
  sat: GraduationCap,
  act: BookOpen,
  gre: Brain,
};

export default function PublicCoursesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { data: coursesData, isLoading } = useCourses();

  // Redirect logged-in users to dashboard courses
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard/courses");
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const courses = coursesData?.courses ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-[1.5rem] mb-6 rotate-3 hover:rotate-0 transition-transform duration-300">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
            Learn anything, for free
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            AI-powered tutoring with cognitive mastery tracking.
            Pick a subject and start learning.
          </p>
        </motion.div>

        {/* Course Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {courses.map((course, i) => {
            const Icon = courseIcons[course.slug] ?? BookOpen;
            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="relative bg-card rounded-2xl border border-border/50 p-8 flex flex-col gap-5 shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="p-3 bg-primary/10 rounded-xl w-fit">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-1.5">
                    {course.icon} {course.name}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {course.description}
                  </p>
                </div>
                <div className="mt-auto pt-2">
                  <Button
                    onClick={() => router.push("/signup")}
                    className="w-full gap-2"
                  >
                    Start Learning — Free <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}

          {/* Coming Soon */}
          {["ACT", "GRE", "AP Calculus"].filter(
            (name) => !courses.some((c) => c.name === name)
          ).map((name, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: (courses.length + i) * 0.08 }}
              className="relative bg-card/50 rounded-2xl border border-dashed border-border/50 p-8 flex flex-col gap-5 opacity-60"
            >
              <div className="p-3 bg-muted rounded-xl w-fit">
                <Lock className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-1.5">{name}</h3>
                <p className="text-sm text-muted-foreground">
                  Coming soon. Same AI tutor, same cognitive engine.
                </p>
              </div>
              <div className="mt-auto pt-2">
                <Button variant="outline" disabled className="w-full">
                  Coming Soon
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Already have an account?
          </p>
          <Button variant="outline" onClick={() => router.push("/login")}>
            Sign In
          </Button>
        </div>
      </div>
    </div>
  );
}
