from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal
from datetime import datetime
from enum import Enum
from .common import SubmitAnswerResponse


class MockExamStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class ModuleType(str, Enum):
    MATH_MODULE_1 = "math_module_1"
    MATH_MODULE_2 = "math_module_2"
    RW_MODULE_1 = "rw_module_1"
    RW_MODULE_2 = "rw_module_2"


class ModuleStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class MockQuestionStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    ANSWERED = "answered"
    MARKED_FOR_REVIEW = "marked_for_review"


# Request Models
class CreateMockExamRequest(BaseModel):
    exam_type: Literal["full_length", "section_only"] = "full_length"


class SubmitModuleAnswerRequest(BaseModel):
    user_answer: List[str]
    status: MockQuestionStatus = MockQuestionStatus.ANSWERED
    is_marked_for_review: bool = False


class CompleteModuleRequest(BaseModel):
    time_remaining_seconds: Optional[int] = None


# Base Models
class MockExamQuestion(BaseModel):
    id: str
    module_id: str
    question_id: str
    display_order: int
    status: MockQuestionStatus
    user_answer: Optional[List[str]] = None
    is_correct: Optional[bool] = None
    is_marked_for_review: bool = False
    answered_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MockExamQuestionWithDetails(BaseModel):
    mock_question_id: str
    question: dict  # Full question object from questions table
    topic: dict  # Topic information
    display_order: int
    status: MockQuestionStatus
    user_answer: Optional[List[str]] = None
    is_correct: Optional[bool] = None
    is_marked_for_review: bool = False
    answered_at: Optional[datetime] = None


class MockExamModule(BaseModel):
    id: str
    exam_id: str
    module_type: ModuleType
    module_number: int
    time_limit_minutes: int = 32
    status: ModuleStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    time_remaining_seconds: Optional[int] = None
    raw_score: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MockExam(BaseModel):
    id: str
    user_id: str
    exam_type: str
    status: MockExamStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_score: Optional[int] = None
    math_score: Optional[int] = None
    rw_score: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    @field_validator('total_score')
    @classmethod
    def validate_total_score(cls, v):
        if v is not None and not (400 <= v <= 1600):
            raise ValueError('Total score must be between 400 and 1600')
        return v

    @field_validator('math_score', 'rw_score')
    @classmethod
    def validate_section_scores(cls, v):
        if v is not None and not (200 <= v <= 800):
            raise ValueError('Section score must be between 200 and 800')
        return v

    class Config:
        from_attributes = True


# Response Models
class MockExamListItem(BaseModel):
    id: str
    exam_type: str
    status: MockExamStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_score: Optional[int] = None
    math_score: Optional[int] = None
    rw_score: Optional[int] = None
    created_at: datetime


class MockExamResponse(BaseModel):
    exam: MockExam
    modules: List[MockExamModule]


class ModuleQuestionsResponse(BaseModel):
    module: MockExamModule
    questions: List[MockExamQuestionWithDetails]
    total_questions: int


class QuestionResultDetail(BaseModel):
    question_id: str
    topic_name: str
    category_name: str
    difficulty: str
    is_correct: Optional[bool]
    user_answer: Optional[List[str]]
    correct_answer: List[str]
    question_type: str


class CategoryPerformance(BaseModel):
    category_name: str
    section: str
    total_questions: int
    correct_answers: int
    percentage: float


class ModuleResultDetail(BaseModel):
    module_type: ModuleType
    module_number: int
    raw_score: int
    total_questions: int
    correct_count: int
    questions: List[QuestionResultDetail]


class MockExamResultsResponse(BaseModel):
    exam: MockExam
    modules: List[ModuleResultDetail]
    category_performance: List[CategoryPerformance]
    total_questions: int
    total_correct: int
    overall_percentage: float


class MockExamListResponse(BaseModel):
    exams: List[MockExamListItem]
    total_count: int
