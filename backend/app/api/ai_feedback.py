from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.services.openai_service import openai_service
from typing import List, Dict, Any

router = APIRouter(prefix="/ai-feedback", tags=["ai-feedback"])

class AIFeedbackRequest(BaseModel):
    question_stem: str
    question_type: str
    correct_answer: List[str]
    user_answer: List[str]
    is_correct: bool
    topic_name: str
    user_performance_context: Dict[str, int]

@router.post("/", response_model=Dict[str, Any])
async def get_ai_feedback(request: AIFeedbackRequest):
    """
    Get AI-generated feedback for a practice question.

    Args:
        request: Feedback request with question details and user performance

    Returns:
        AI-generated feedback including explanation, hints, and learning points
    """
    try:
        # Generate feedback using OpenAI service
        feedback_dict = await openai_service.generate_answer_feedback(
            question_stem=request.question_stem,
            question_type=request.question_type,
            correct_answer=request.correct_answer,
            user_answer=request.user_answer,
            is_correct=request.is_correct,
            topic_name=request.topic_name,
            user_performance_context=request.user_performance_context
        )

        return {
            "success": True,
            "feedback": feedback_dict
        }

    except Exception as e:
        print(f"Error generating AI feedback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate AI feedback: {str(e)}"
        )
