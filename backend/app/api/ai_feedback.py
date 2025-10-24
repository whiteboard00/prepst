from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.services.openai_service import openai_service
from typing import List, Dict, Any, Optional

router = APIRouter(prefix="/ai-feedback", tags=["ai-feedback"])

class AIFeedbackRequest(BaseModel):
    question_stem: str
    question_type: str
    correct_answer: List[str]
    user_answer: List[str]
    is_correct: bool
    topic_name: str
    user_performance_context: Dict[str, int]

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = None

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

@router.post("/chat", response_model=Dict[str, Any])
async def chat_with_ai(request: ChatRequest):
    """
    Chat with AI assistant for study help and guidance.

    Args:
        request: Chat request with message and optional conversation history

    Returns:
        AI-generated chat response
    """
    try:
        # Convert conversation history to the format expected by OpenAI
        conversation_history = []
        if request.conversation_history:
            for msg in request.conversation_history:
                conversation_history.append({
                    "role": msg.role,
                    "content": msg.content
                })

        # Generate response using OpenAI service
        response = await openai_service.generate_chat_response(
            message=request.message,
            conversation_history=conversation_history
        )

        return {
            "success": True,
            "response": response,
            "timestamp": "2024-01-01T00:00:00Z"  # You might want to use actual timestamp
        }

    except Exception as e:
        print(f"Error in chat: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate chat response: {str(e)}"
        )
