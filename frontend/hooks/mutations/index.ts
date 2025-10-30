/**
 * Mutation Hooks Index
 * 
 * Centralized export of all mutation hooks for easy importing.
 * Usage: import { useGenerateStudyPlan, useUpdateProfile } from '@/hooks/mutations';
 */

// Study Plan
export { useGenerateStudyPlan } from './useGenerateStudyPlan';
export { useDeleteStudyPlan } from './useDeleteStudyPlan';

// Profile
export { useUpdateProfile } from './useUpdateProfile';
export { useUpdatePreferences } from './useUpdatePreferences';
export { useUploadProfilePhoto } from './useUploadProfilePhoto';
export { useDeleteProfilePhoto } from './useDeleteProfilePhoto';

// Practice Sessions
export { useCompleteSession } from './useCompleteSession';
export { useCreateDrillSession } from './useCreateDrillSession';
export { useCreateRevisionSession } from './useCreateRevisionSession';
