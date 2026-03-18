import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCourseConfigSafe } from "@/contexts/CourseContext";

export interface QuestionPoolFilters {
    section?: string;
    difficulty?: 'E' | 'M' | 'H';
    topicId?: string;
    categoryId?: string;
    search?: string;
    limit?: number;
    offset?: number;
}

/**
 * Hook to browse questions in the question pool, scoped to active course
 */
export function useQuestionPool(params: QuestionPoolFilters) {
    const { courseSlug } = useCourseConfigSafe();
    return useQuery({
        queryKey: ["question-pool", courseSlug, params],
        queryFn: () => api.browseQuestions({
            section: params.section,
            difficulty: params.difficulty,
            topicId: params.topicId,
            categoryId: params.categoryId,
            search: params.search,
            limit: params.limit || 20,
            offset: params.offset || 0,
            courseSlug,
        }),
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook to get topics summary with question counts, scoped to active course
 */
export function useTopicsSummary(section?: string) {
    const { courseSlug } = useCourseConfigSafe();
    return useQuery({
        queryKey: ["topics-summary", courseSlug, section],
        queryFn: () => api.getTopicsSummary(section, courseSlug),
        staleTime: 10 * 60 * 1000,
    });
}
