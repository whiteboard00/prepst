import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useCourses() {
  return useQuery({
    queryKey: queryKeys.courses.list(),
    queryFn: () => api.getCourses(),
    staleTime: 10 * 60 * 1000, // 10 minutes — courses rarely change
  });
}

export function useCourse(slug: string) {
  return useQuery({
    queryKey: queryKeys.courses.detail(slug),
    queryFn: () => api.getCourse(slug),
    staleTime: 10 * 60 * 1000,
    enabled: !!slug,
  });
}

export function useMyEnrollments() {
  return useQuery({
    queryKey: queryKeys.courses.myEnrollments(),
    queryFn: () => api.getMyEnrollments(),
    staleTime: 5 * 60 * 1000,
  });
}
