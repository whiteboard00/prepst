from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import date, datetime
from uuid import UUID
from .common import SubmitAnswerResponse


class StudyPlanCreate(BaseModel):
    """Request model for creating a study plan"""
    current_math_score: int = Field(..., ge=0, le=10000, description="Current Math/section 1 score")
    target_math_score: int = Field(..., ge=0, le=10000, description="Target Math/section 1 score")
    current_rw_score: int = Field(..., ge=0, le=10000, description="Current Reading & Writing/section 2 score")
    target_rw_score: int = Field(..., ge=0, le=10000, description="Target Reading & Writing/section 2 score")
    test_date: date = Field(..., description="Target test date")
    weekly_study_hours: int = Field(default=20, ge=1, le=40, description="Weekly study hours (1-40)")
    course_slug: str = Field(default="sat", description="Course slug")

    class Config:
        json_schema_extra = {
            "example": {
                "current_math_score": 500,
                "target_math_score": 700,
                "current_rw_score": 520,
                "target_rw_score": 680,
                "test_date": "2025-05-01",
                "course_slug": "sat"
            }
        }


class Topic(BaseModel):
    """Topic model"""
    id: UUID
    name: str
    category_id: UUID
    weight_in_category: float
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Category(BaseModel):
    """Category model"""
    id: UUID
    name: str
    section: str
    weight_in_section: float
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SessionTopic(BaseModel):
    """Session topic with question count"""
    topic_id: UUID
    topic_name: str
    section: str
    num_questions: int


class PracticeSession(BaseModel):
    """Practice session model"""
    id: UUID
    study_plan_id: UUID
    scheduled_date: date
    session_number: int
    session_name: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    topics: List[SessionTopic] = []
    total_questions: Optional[int] = 0
    completed_questions: Optional[int] = 0


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
    course_id: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    sessions: List[PracticeSession] = []


class StudyPlanResponse(BaseModel):
    """Response model for study plan"""
    study_plan: StudyPlan
    total_sessions: int
    total_days: int


class Question(BaseModel):
    """Question model"""
    id: UUID
    stimulus: Optional[str] = None  # Reading passage/context for English questions
    stem: str
    difficulty: str
    question_type: str
    answer_options: Optional[Union[Dict[str, Any], List[Any]]] = None
    correct_answer: Optional[List[str]] = None
    acceptable_answers: Optional[Union[Dict[str, Any], List[Any]]] = None
    rationale: Optional[str] = None
    difficulty_score: Optional[int] = None
    module: Optional[str] = None
    topic_id: Optional[UUID] = None
    external_id: Optional[str] = None
    source_uid: Optional[UUID] = None
    is_active: Optional[bool] = None
    is_flagged: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SessionQuestion(BaseModel):
    """Session question with details"""
    session_question_id: UUID
    question: Question
    topic: Topic
    status: str
    display_order: int
    user_answer: Optional[List[str]] = None
    started_at: Optional[datetime] = None
    answered_at: Optional[datetime] = None
    is_saved: bool = False


class SessionQuestionsResponse(BaseModel):
    """Response model for session questions"""
    session: PracticeSession
    questions: List[SessionQuestion]
    total_questions: int


class TopicSimple(BaseModel):
    """Simplified topic model for API responses"""
    id: str
    name: str
    category_id: str
    weight_in_category: float
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class CategoryWithTopics(BaseModel):
    """Category with its topics"""
    id: str
    name: str
    section: str
    weight_in_section: float
    created_at: str
    updated_at: str
    topics: List[TopicSimple]

class CategoriesAndTopicsResponse(BaseModel):
    """Response model for categories and topics"""
    math: List[CategoryWithTopics]
    reading_writing: List[CategoryWithTopics]


class AIFeedbackRequest(BaseModel):
    """Request model for AI feedback generation"""
    question_ids: Optional[List[UUID]] = None  # None = all answered questions


class AIFeedbackContent(BaseModel):
    """AI-generated feedback content"""
    explanation: str
    hints: List[str]
    learning_points: List[str]
    key_concepts: List[str]


class AIFeedbackResponse(BaseModel):
    """Response model for AI feedback"""
    session_question_id: UUID
    question_id: UUID
    feedback: AIFeedbackContent
    is_cached: bool


class SessionSummaryContent(BaseModel):
    """AI-generated session summary content"""
    overall_assessment: str
    strengths: List[str]
    weaknesses: List[str]
    speed_analysis: str
    error_patterns: List[str]
    improvement_tips: List[str]


class SessionSummaryResponse(BaseModel):
    """Response model for session summary"""
    session_id: UUID
    summary: SessionSummaryContent
    stats: Dict[str, Any]  # Raw stats used for display
    generated_at: datetime
