"""Common models shared across features"""
from typing import List
from pydantic import BaseModel


class SubmitAnswerResponse(BaseModel):
    """Shared response model for submitting an answer"""
    is_correct: bool
    correct_answer: List[str]
    question_id: str
    junction_question_id: str  # Can be session_question_id or mock_question_id
