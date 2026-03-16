import logging
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from app.db import get_db
from app.models.course import (
    Course,
    CourseListItem,
    CourseListResponse,
    EnrollCourseRequest,
    UserCourseEnrollment,
    UserCoursesResponse,
    CourseConfig,
)
from app.services.course_service import CourseService
from app.core.auth import get_current_user, get_authenticated_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("", response_model=CourseListResponse)
async def list_courses(db: Client = Depends(get_db)):
    """List all active courses."""
    try:
        service = CourseService(db)
        courses = await service.list_courses()
        return CourseListResponse(
            courses=[CourseListItem(**c) for c in courses],
            total_count=len(courses),
        )
    except Exception as e:
        # Gracefully handle missing table (migration not yet applied)
        if "PGRST205" in str(e) or "could not find" in str(e).lower():
            logger.warning("courses table not found — migration 033 not yet applied")
            return CourseListResponse(courses=[], total_count=0)
        raise


@router.get("/me/enrollments", response_model=UserCoursesResponse)
async def get_my_enrollments(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """Get current user's course enrollments."""
    try:
        service = CourseService(db)
        enrollments = await service.get_user_enrollments(user_id)

        courses = []
        enrollment_items = []
        for e in enrollments:
            course_data = e.pop("courses", None)
            if course_data:
                raw_config = course_data.get("config", {})
                course_data["config"] = CourseConfig(**raw_config) if raw_config else CourseConfig()
                courses.append(Course(**course_data))
            enrollment_items.append(UserCourseEnrollment(**e))

        return UserCoursesResponse(enrollments=enrollment_items, courses=courses)
    except Exception as e:
        if "PGRST205" in str(e) or "could not find" in str(e).lower():
            logger.warning("user_courses table not found — migration 033 not yet applied")
            return UserCoursesResponse(enrollments=[], courses=[])
        raise


@router.post("/enroll", response_model=UserCourseEnrollment, status_code=status.HTTP_201_CREATED)
async def enroll_in_course(
    request: EnrollCourseRequest,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """Enroll the current user in a course."""
    service = CourseService(db)

    course = await service.get_course_by_id(request.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    enrollment = await service.enroll_user(user_id, request.course_id)
    return UserCourseEnrollment(**enrollment)


@router.get("/{slug}", response_model=Course)
async def get_course(slug: str, db: Client = Depends(get_db)):
    """Get a course by slug with full config."""
    try:
        service = CourseService(db)
        course = await service.get_course_by_slug(slug)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        raw_config = course.get("config", {})
        course["config"] = CourseConfig(**raw_config) if raw_config else CourseConfig()
        return Course(**course)
    except HTTPException:
        raise
    except Exception as e:
        if "PGRST205" in str(e) or "could not find" in str(e).lower():
            raise HTTPException(status_code=404, detail="Course not found")
        raise
