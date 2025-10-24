from pydantic import BaseModel, field_validator
from typing import List, Optional, Literal
from datetime import datetime
from enum import Enum
from .common import SubmitAnswerResponse


class DiagnosticTestStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class DiagnosticQuestionStatus(str, Enum):
    NOT_STARTED = "not_started"
    ANSWERED = "answered"
    MARKED_FOR_REVIEW = "marked_for_review"


# Request Models
class CreateDiagnosticTestRequest(BaseModel):
    pass  # No parameters needed for creation


class SubmitDiagnosticAnswerRequest(BaseModel):
    user_answer: List[str]
    status: DiagnosticQuestionStatus = DiagnosticQuestionStatus.ANSWERED
    is_marked_for_review: bool = False


# Base Models
class DiagnosticTest(BaseModel):
    id: str
    user_id: str
    status: DiagnosticTestStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_questions: int = 40
    total_correct: Optional[int] = None
    math_correct: Optional[int] = None
    rw_correct: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DiagnosticTestQuestion(BaseModel):
    id: str
    test_id: str
    question_id: str
    section: str
    display_order: int
    status: DiagnosticQuestionStatus
    user_answer: Optional[List[str]] = None
    is_correct: Optional[bool] = None
    is_marked_for_review: bool = False
    answered_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DiagnosticTestQuestionWithDetails(BaseModel):
    diagnostic_question_id: str
    question: dict  # Full question object from questions table
    topic: dict  # Topic information
    section: str
    display_order: int
    status: DiagnosticQuestionStatus
    user_answer: Optional[List[str]] = None
    is_correct: Optional[bool] = None
    is_marked_for_review: bool = False
    answered_at: Optional[datetime] = None


# Response Models
class DiagnosticTestResponse(BaseModel):
    test: DiagnosticTest
    questions: List[DiagnosticTestQuestionWithDetails]
    total_questions: int


class TopicMasteryInit(BaseModel):
    topic_id: str
    topic_name: str
    initial_mastery: float
    questions_answered: int
    correct_answers: int


class DiagnosticTestResultsResponse(BaseModel):
    test: DiagnosticTest
    total_correct: int
    total_questions: int
    overall_percentage: float
    math_correct: int
    math_total: int
    math_percentage: float
    rw_correct: int
    rw_total: int
    rw_percentage: float
    topic_mastery_initialized: List[TopicMasteryInit]
    questions: List[DiagnosticTestQuestionWithDetails]


class DiagnosticTestListItem(BaseModel):
    id: str
    status: DiagnosticTestStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_correct: Optional[int] = None
    total_questions: int = 40
    created_at: datetime


class DiagnosticTestListResponse(BaseModel):
    tests: List[DiagnosticTestListItem]
    total_count: int
