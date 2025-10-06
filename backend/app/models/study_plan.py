from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID


class StudyPlanCreate(BaseModel):
    """Request model for creating a study plan"""
    current_math_score: int = Field(..., ge=200, le=800, description="Current Math score (200-800)")
    target_math_score: int = Field(..., ge=200, le=800, description="Target Math score (200-800)")
    current_rw_score: int = Field(..., ge=200, le=800, description="Current Reading/Writing score (200-800)")
    target_rw_score: int = Field(..., ge=200, le=800, description="Target Reading/Writing score (200-800)")
    test_date: date = Field(..., description="SAT test date")

    class Config:
        json_schema_extra = {
            "example": {
                "current_math_score": 500,
                "target_math_score": 700,
                "current_rw_score": 520,
                "target_rw_score": 680,
                "test_date": "2025-05-01"
            }
        }


class Topic(BaseModel):
    """Topic model"""
    id: UUID
    name: str
    category_id: UUID
    weight_in_category: float


class Category(BaseModel):
    """Category model"""
    id: UUID
    name: str
    section: str
    weight_in_section: float


class SessionTopic(BaseModel):
    """Session topic with question count"""
    topic_id: UUID
    topic_name: str
    num_questions: int


class PracticeSession(BaseModel):
    """Practice session model"""
    id: UUID
    study_plan_id: UUID
    scheduled_date: date
    session_number: int
    status: str
    topics: List[SessionTopic] = []


class StudyPlan(BaseModel):
    """Complete study plan model"""
    id: UUID
    user_id: UUID
    start_date: date
    test_date: date
    current_math_score: int
    target_math_score: int
    current_rw_score: int
    target_rw_score: int
    is_active: bool
    created_at: datetime
    sessions: List[PracticeSession] = []


class StudyPlanResponse(BaseModel):
    """Response model for study plan"""
    study_plan: StudyPlan
    total_sessions: int
    total_days: int
    sessions_per_day: float
