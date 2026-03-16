from typing import Dict, List, Optional
from supabase import Client


class CourseService:
    def __init__(self, db: Client):
        self.db = db

    async def list_courses(self, active_only: bool = True) -> List[Dict]:
        query = self.db.table("courses").select("*")
        if active_only:
            query = query.eq("is_active", True)
        response = query.order("name").execute()
        return response.data

    async def get_course_by_slug(self, slug: str) -> Optional[Dict]:
        response = (
            self.db.table("courses")
            .select("*")
            .eq("slug", slug)
            .execute()
        )
        if response.data:
            return response.data[0]
        return None

    async def get_course_by_id(self, course_id: str) -> Optional[Dict]:
        response = (
            self.db.table("courses")
            .select("*")
            .eq("id", course_id)
            .execute()
        )
        if response.data:
            return response.data[0]
        return None

    async def enroll_user(self, user_id: str, course_id: str) -> Dict:
        # Check if already enrolled
        existing = (
            self.db.table("user_courses")
            .select("*")
            .eq("user_id", user_id)
            .eq("course_id", course_id)
            .execute()
        )
        if existing.data:
            # Reactivate if inactive
            enrollment = existing.data[0]
            if not enrollment["is_active"]:
                self.db.table("user_courses").update(
                    {"is_active": True}
                ).eq("id", enrollment["id"]).execute()
                enrollment["is_active"] = True
            return enrollment

        response = (
            self.db.table("user_courses")
            .insert({
                "user_id": user_id,
                "course_id": course_id,
                "is_active": True,
            })
            .execute()
        )
        return response.data[0]

    async def get_user_enrollments(self, user_id: str) -> List[Dict]:
        response = (
            self.db.table("user_courses")
            .select("*, courses(*)")
            .eq("user_id", user_id)
            .eq("is_active", True)
            .execute()
        )
        return response.data

    async def get_course_categories(self, course_id: str) -> List[Dict]:
        response = (
            self.db.table("categories")
            .select("*, topics(*)")
            .eq("course_id", course_id)
            .execute()
        )
        return response.data
