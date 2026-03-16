"use client";

import { createContext, useContext, useMemo } from "react";
import { useCourse } from "@/hooks/queries";
import type { Course, CourseConfig, SectionConfig, MockExamModuleConfig } from "@/lib/types";

/**
 * SAT defaults — used when course config hasn't loaded yet.
 * These match the SAT course seed in migration 033.
 */
const SAT_DEFAULTS: CourseConfig = {
  sections: [
    { key: "math", name: "Math", score_min: 200, score_max: 800 },
    { key: "reading_writing", name: "Reading & Writing", score_min: 200, score_max: 800 },
  ],
  total_score_min: 400,
  total_score_max: 1600,
  score_increment: 10,
  diagnostic: {
    total_questions: 40,
    section_distribution: { math: 20, reading_writing: 20 },
    difficulty_distribution: { E: 0.33, M: 0.34, H: 0.33 },
  },
  mock_exam: {
    modules: [
      { key: "rw_module_1", section: "reading_writing", number: 1, time_limit_minutes: 32 },
      { key: "rw_module_2", section: "reading_writing", number: 2, time_limit_minutes: 32 },
      { key: "math_module_1", section: "math", number: 1, time_limit_minutes: 32 },
      { key: "math_module_2", section: "math", number: 2, time_limit_minutes: 32 },
    ],
  },
};

interface CourseContextValue {
  course: Course | null;
  config: CourseConfig;
  isLoading: boolean;

  // Helper methods
  sectionScoreMin: (sectionKey: string) => number;
  sectionScoreMax: (sectionKey: string) => number;
  sectionScoreRange: (sectionKey: string) => number;
  sectionName: (sectionKey: string) => string;
  totalScoreMin: number;
  totalScoreMax: number;
  scoreIncrement: number;
  sections: SectionConfig[];
  sectionKeys: string[];
  diagnosticTotalQuestions: number;
  diagnosticSectionDistribution: Record<string, number>;
  mockExamModules: MockExamModuleConfig[];
  getModuleTimeLimitMinutes: (moduleKey: string) => number;
  getModuleDisplayName: (moduleKey: string) => string;
}

const CourseContext = createContext<CourseContextValue | undefined>(undefined);

interface CourseProviderProps {
  children: React.ReactNode;
  courseSlug?: string;
}

export function CourseProvider({ children, courseSlug = "sat" }: CourseProviderProps) {
  const { data: course, isLoading } = useCourse(courseSlug);
  const config = course?.config ?? SAT_DEFAULTS;

  const value = useMemo<CourseContextValue>(() => {
    const sections = config.sections ?? SAT_DEFAULTS.sections!;

    const findSection = (key: string): SectionConfig | undefined =>
      sections.find((s) => s.key === key);

    const sectionScoreMin = (key: string) => findSection(key)?.score_min ?? 200;
    const sectionScoreMax = (key: string) => findSection(key)?.score_max ?? 800;
    const sectionScoreRange = (key: string) => sectionScoreMax(key) - sectionScoreMin(key);
    const sectionName = (key: string) => findSection(key)?.name ?? key;

    const modules = config.mock_exam?.modules ?? SAT_DEFAULTS.mock_exam!.modules;

    const getModuleTimeLimitMinutes = (moduleKey: string) => {
      const mod = modules.find((m) => m.key === moduleKey);
      return mod?.time_limit_minutes ?? 32;
    };

    const getModuleDisplayName = (moduleKey: string) => {
      const mod = modules.find((m) => m.key === moduleKey);
      if (!mod) return moduleKey;
      const secName = sectionName(mod.section);
      return `${secName} - Module ${mod.number}`;
    };

    return {
      course: course ?? null,
      config,
      isLoading,
      sectionScoreMin,
      sectionScoreMax,
      sectionScoreRange,
      sectionName,
      totalScoreMin: config.total_score_min ?? 400,
      totalScoreMax: config.total_score_max ?? 1600,
      scoreIncrement: config.score_increment ?? 10,
      sections,
      sectionKeys: sections.map((s) => s.key),
      diagnosticTotalQuestions: config.diagnostic?.total_questions ?? 40,
      diagnosticSectionDistribution: config.diagnostic?.section_distribution ?? { math: 20, reading_writing: 20 },
      mockExamModules: modules,
      getModuleTimeLimitMinutes,
      getModuleDisplayName,
    };
  }, [course, config, isLoading]);

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
}

export function useCourseConfig(): CourseContextValue {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error("useCourseConfig must be used within a CourseProvider");
  }
  return context;
}

/**
 * Safe version that returns defaults if provider is missing.
 * Use this in components that might render outside CourseProvider.
 */
export function useCourseConfigSafe(): CourseContextValue {
  const context = useContext(CourseContext);
  if (context) return context;

  // Return SAT defaults
  const sections = SAT_DEFAULTS.sections!;
  const modules = SAT_DEFAULTS.mock_exam!.modules;
  const findSection = (key: string) => sections.find((s) => s.key === key);

  return {
    course: null,
    config: SAT_DEFAULTS,
    isLoading: false,
    sectionScoreMin: (key) => findSection(key)?.score_min ?? 200,
    sectionScoreMax: (key) => findSection(key)?.score_max ?? 800,
    sectionScoreRange: (key) => (findSection(key)?.score_max ?? 800) - (findSection(key)?.score_min ?? 200),
    sectionName: (key) => findSection(key)?.name ?? key,
    totalScoreMin: 400,
    totalScoreMax: 1600,
    scoreIncrement: 10,
    sections,
    sectionKeys: sections.map((s) => s.key),
    diagnosticTotalQuestions: 40,
    diagnosticSectionDistribution: { math: 20, reading_writing: 20 },
    mockExamModules: modules,
    getModuleTimeLimitMinutes: (key) => modules.find((m) => m.key === key)?.time_limit_minutes ?? 32,
    getModuleDisplayName: (key) => {
      const mod = modules.find((m) => m.key === key);
      if (!mod) return key;
      const secName = findSection(mod.section)?.name ?? mod.section;
      return `${secName} - Module ${mod.number}`;
    },
  };
}
