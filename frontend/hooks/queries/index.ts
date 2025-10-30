/**
 * Query Hooks Index
 * 
 * Centralized export of all query hooks for easy importing.
 * Usage: import { useStudyPlan, useProfile } from '@/hooks/queries';
 */

// Study Plan
export { useStudyPlan } from './useStudyPlan';
export { useCategoriesAndTopics } from './useCategoriesAndTopics';

// Analytics
export { useGrowthCurve } from './useGrowthCurve';
export { useSkillHeatmap } from './useSkillHeatmap';
export { usePerformanceSnapshots } from './usePerformanceSnapshots';
export { useErrorPatternAnalytics } from './useErrorPatternAnalytics';
export { useCognitiveEfficiencyAnalytics } from './useCognitiveEfficiencyAnalytics';
export { useConfidenceTiming } from './useConfidenceTiming';
export { useLearningVelocity } from './useLearningVelocity';

// Profile
export { useProfile } from './useProfile';

// Practice Sessions
export { useWrongAnswers } from './useWrongAnswers';
export { useCompletedSessions } from './useCompletedSessions';

// Mock Exams
export { useMockExamPerformance } from './useMockExamPerformance';
export { useMockExamAnalytics } from './useMockExamAnalytics';
