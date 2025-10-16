"""Common models shared across features"""
from typing import List, Optional, Dict
from pydantic import BaseModel


class MasteryUpdate(BaseModel):
    """BKT mastery update data"""
    skill_id: str
    mastery_before: float
    mastery_after: float
    velocity: float
    total_attempts: int
    correct_attempts: int


class SubmitAnswerResponse(BaseModel):
    """Shared response model for submitting an answer"""
    is_correct: bool
    correct_answer: List[str]
    question_id: str
    junction_question_id: str  # Can be session_question_id or mock_question_id
    mastery_update: Optional[Dict] = None  # BKT mastery update (if available)
