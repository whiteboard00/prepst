/**
 * Centralized Query Key Factory
 * 
 * This file contains all query keys used in TanStack Query.
 * Using a factory pattern ensures type safety and prevents key collisions.
 * 
 * Pattern: Each domain has a nested structure:
 * - all: base key for the domain
 * - specific keys: functions that return arrays with parameters
 */

export const queryKeys = {
  // Study Plans
  studyPlan: {
    all: ['studyPlan'] as const,
    me: () => [...queryKeys.studyPlan.all, 'me'] as const,
    categoriesAndTopics: () => [...queryKeys.studyPlan.all, 'categoriesAndTopics'] as const,
  },

  // Analytics
  analytics: {
    all: ['analytics'] as const,
    growthCurve: (skillId?: string, daysBack: number = 30) => 
      [...queryKeys.analytics.all, 'growthCurve', { skillId, daysBack }] as const,
    skillHeatmap: () => 
      [...queryKeys.analytics.all, 'skillHeatmap'] as const,
    snapshots: (snapshotType?: string, limit: number = 50) => 
      [...queryKeys.analytics.all, 'snapshots', { snapshotType, limit }] as const,
    learningEvents: (eventType?: string, limit: number = 50) => 
      [...queryKeys.analytics.all, 'learningEvents', { eventType, limit }] as const,
    masteries: () => 
      [...queryKeys.analytics.all, 'masteries'] as const,
    errorPatterns: () => 
      [...queryKeys.analytics.all, 'errorPatterns'] as const,
    cognitiveEfficiency: () => 
      [...queryKeys.analytics.all, 'cognitiveEfficiency'] as const,
    learningVelocity: () => 
      [...queryKeys.analytics.all, 'learningVelocity'] as const,
    predictiveScores: () => 
      [...queryKeys.analytics.all, 'predictiveScores'] as const,
  },

  // Admin Analytics
  adminAnalytics: {
    all: ['adminAnalytics'] as const,
    masteryTracking: (limit: number = 10) => 
      [...queryKeys.adminAnalytics.all, 'masteryTracking', { limit }] as const,
    confidenceTiming: (limit: number = 100) => 
      [...queryKeys.adminAnalytics.all, 'confidenceTiming', { limit }] as const,
    learningEvents: () => 
      [...queryKeys.adminAnalytics.all, 'learningEvents'] as const,
    snapshotsOverview: (limit: number = 10) => 
      [...queryKeys.adminAnalytics.all, 'snapshotsOverview', { limit }] as const,
    userProgress: () => 
      [...queryKeys.adminAnalytics.all, 'userProgress'] as const,
    questionDifficulty: (limit: number = 10) => 
      [...queryKeys.adminAnalytics.all, 'questionDifficulty', { limit }] as const,
    mockExamAnalytics: () => 
      [...queryKeys.adminAnalytics.all, 'mockExamAnalytics'] as const,
  },

  // Profile
  profile: {
    all: ['profile'] as const,
    me: () => [...queryKeys.profile.all, 'me'] as const,
  },

  // Practice Sessions
  practice: {
    all: ['practice'] as const,
    session: (id: string) => 
      [...queryKeys.practice.all, 'session', id] as const,
    completed: (limit: number = 20) => 
      [...queryKeys.practice.all, 'completed', { limit }] as const,
    wrongAnswers: (limit: number = 50) => 
      [...queryKeys.practice.all, 'wrongAnswers', { limit }] as const,
    masteryImprovements: (sessionId: string) => 
      [...queryKeys.practice.all, 'masteryImprovements', sessionId] as const,
    feedback: (sessionId: string, questionId: string) => 
      [...queryKeys.practice.all, 'feedback', sessionId, questionId] as const,
  },

  // Mock Exams
  mockExam: {
    all: ['mockExam'] as const,
    performance: (limit: number = 10) => 
      [...queryKeys.mockExam.all, 'performance', { limit }] as const,
  },
} as const;
