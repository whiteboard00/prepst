from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class SectionConfig(BaseModel):
    key: str
    name: str
    score_min: int
    score_max: int


class DiagnosticConfig(BaseModel):
    total_questions: int
    section_distribution: Dict[str, int]
    difficulty_distribution: Dict[str, float]


class MockExamModuleConfig(BaseModel):
    key: str
    section: str
    number: int
    time_limit_minutes: int


class MockExamConfig(BaseModel):
    modules: List[MockExamModuleConfig]


class CourseConfig(BaseModel):
    sections: List[SectionConfig] = []
    total_score_min: Optional[int] = None
    total_score_max: Optional[int] = None
    score_increment: Optional[int] = None
    questions_per_module: Optional[int] = None
    diagnostic: Optional[DiagnosticConfig] = None
    mock_exam: Optional[MockExamConfig] = None


class Course(BaseModel):
    id: str
    slug: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    config: CourseConfig = CourseConfig()
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CourseListItem(BaseModel):
    id: str
    slug: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: bool = True


class CourseListResponse(BaseModel):
    courses: List[CourseListItem]
    total_count: int


class UserCourseEnrollment(BaseModel):
    id: str
    user_id: str
    course_id: str
    is_active: bool = True
    enrolled_at: datetime


class EnrollCourseRequest(BaseModel):
    course_id: str


class UserCoursesResponse(BaseModel):
    enrollments: List[UserCourseEnrollment]
    courses: List[Course]
