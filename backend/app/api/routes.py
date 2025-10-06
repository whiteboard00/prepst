"""
API Routes for the SAT Prep platform
"""
from fastapi import APIRouter, HTTPException, Body
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

from app.models.schemas import (
    UserProfile,
    AnswerSubmission,
    NextTopicRecommendation,
    StudySession,
    SessionStats,
    QuestionPerformance,
    TopicPriority,
    TopicMastery
)
from app.services.user_service import user_service
from app.services.session_manager import session_manager
from app.services.scheduler import scheduler
from app.services.question_bank import question_bank


router = APIRouter(prefix="/api/v1", tags=["SAT Prep"])


# ============================================================================
# Request/Response Models
# ============================================================================

class CreateUserRequest(BaseModel):
    """Request to create a new user profile"""
    user_id: str
    past_math_score: int = Field(ge=200, le=800)
    past_english_score: int = Field(ge=200, le=800)
    target_math_score: int = Field(ge=200, le=800)
    target_english_score: int = Field(ge=200, le=800)
    test_date: datetime


class CreateSessionRequest(BaseModel):
    """Request to create a new study session"""
    user_id: str
    topic: str
    num_questions: int = 10


class GetRecommendationRequest(BaseModel):
    """Request to get next topic recommendation"""
    user_id: str
    module: Optional[str] = None  # "math" or "english"


# ============================================================================
# User Management Endpoints
# ============================================================================

@router.post("/users", response_model=UserProfile)
async def create_user(request: CreateUserRequest):
    """
    Create a new user profile with initialized topic masteries.
    
    This endpoint sets up a user's learning profile based on their past scores
    and goals. It initializes mastery scores for all topics.
    """
    try:
        profile = user_service.create_user_profile(
            user_id=request.user_id,
            past_math_score=request.past_math_score,
            past_english_score=request.past_english_score,
            target_math_score=request.target_math_score,
            target_english_score=request.target_english_score,
            test_date=request.test_date
        )
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users/{user_id}", response_model=UserProfile)
async def get_user(user_id: str):
    """
    Get a user's profile including all topic masteries.
    """
    profile = user_service.get_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return profile


@router.get("/users/{user_id}/progress")
async def get_user_progress(user_id: str):
    """
    Get overall progress statistics for a user.
    
    Returns current estimated scores, mastery levels, and activity stats.
    """
    progress = user_service.get_overall_progress(user_id)
    if not progress:
        raise HTTPException(status_code=404, detail="User not found")
    return progress


@router.get("/users/{user_id}/masteries", response_model=dict)
async def get_user_masteries(user_id: str):
    """
    Get all topic masteries for a user.
    """
    masteries = user_service.get_all_masteries(user_id)
    if masteries is None:
        raise HTTPException(status_code=404, detail="User not found")
    return masteries


@router.get("/users/{user_id}/masteries/{topic}", response_model=TopicMastery)
async def get_topic_mastery(user_id: str, topic: str):
    """
    Get mastery score for a specific topic.
    """
    mastery = user_service.get_topic_mastery(user_id, topic)
    if not mastery:
        raise HTTPException(status_code=404, detail="Topic or user not found")
    return mastery


# ============================================================================
# Study Planning Endpoints
# ============================================================================

@router.post("/recommendations/next", response_model=NextTopicRecommendation)
async def get_next_topic(request: GetRecommendationRequest):
    """
    Get the next recommended topic to study.
    
    Uses the dynamic scheduler to calculate priorities based on:
    - Mastery gaps
    - Topic importance
    - Spaced repetition (forgetting factor)
    """
    recommendation = session_manager.get_next_topic_recommendation(
        request.user_id,
        request.module
    )
    if not recommendation:
        raise HTTPException(status_code=404, detail="User not found or no topics available")
    return recommendation


@router.get("/recommendations/{user_id}/top-topics", response_model=List[TopicPriority])
async def get_top_topics(
    user_id: str,
    module: Optional[str] = None,
    limit: int = 5
):
    """
    Get the top N topics to study by priority.
    
    Useful for showing users their weak areas or what they should focus on.
    """
    masteries = user_service.get_all_masteries(user_id)
    if not masteries:
        raise HTTPException(status_code=404, detail="User not found")
    
    if module:
        masteries = scheduler.filter_topics_by_module(masteries, module)
    
    top_topics = scheduler.get_top_topics(masteries, limit)
    return top_topics


# ============================================================================
# Study Session Endpoints
# ============================================================================

@router.post("/sessions", response_model=StudySession)
async def create_session(request: CreateSessionRequest):
    """
    Create a new study session with dynamically selected questions.
    
    Questions are selected based on the user's current mastery level:
    - Low mastery (< 0.4): More easy questions
    - Medium mastery (0.4 - 0.75): Balanced mix
    - High mastery (≥ 0.75): More hard questions
    """
    session = session_manager.create_session(
        request.user_id,
        request.topic,
        request.num_questions
    )
    if not session:
        raise HTTPException(
            status_code=400,
            detail="Could not create session. Check user exists and topic is valid."
        )
    return session


@router.get("/sessions/{session_id}", response_model=StudySession)
async def get_session(session_id: str):
    """
    Get details about a specific study session.
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/sessions/{session_id}/answers", response_model=QuestionPerformance)
async def submit_answer(session_id: str, answer: AnswerSubmission):
    """
    Submit an answer for a question in a session.
    
    This endpoint:
    1. Calculates a performance score based on correctness, difficulty, time, and confidence
    2. Updates the user's mastery score using EMA
    3. Returns the performance details
    """
    performance = session_manager.submit_answer(session_id, answer)
    if not performance:
        raise HTTPException(status_code=404, detail="Session not found")
    return performance


@router.post("/sessions/{session_id}/complete", response_model=SessionStats)
async def complete_session(session_id: str):
    """
    Complete a study session and get statistics.
    
    Returns overall performance metrics including:
    - Questions answered
    - Accuracy
    - Mastery improvement
    """
    stats = session_manager.complete_session(session_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Session not found")
    return stats


# ============================================================================
# Question Bank Endpoints
# ============================================================================

@router.get("/questions/{question_id}")
async def get_question(question_id: str):
    """
    Get a specific question by ID.
    """
    question = question_bank.get_question(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


@router.get("/questions/filter/topic/{topic}")
async def get_questions_by_topic(
    topic: str,
    difficulty: Optional[str] = None,
    limit: int = 10
):
    """
    Get questions filtered by topic and optionally by difficulty.
    """
    from app.models.schemas import DifficultyLevel
    
    diff_level = None
    if difficulty:
        try:
            diff_level = DifficultyLevel(difficulty.upper())
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid difficulty level")
    
    questions = question_bank.filter_questions(
        topic=topic,
        difficulty=diff_level
    )
    
    return questions[:limit]


# ============================================================================
# Utility Endpoints
# ============================================================================

@router.get("/topics")
async def get_all_topics():
    """
    Get a list of all available topics with their base weights.
    """
    from app.models.schemas import MATH_TOPICS, ENGLISH_TOPICS, ALL_TOPICS
    
    return {
        "math": MATH_TOPICS,
        "english": ENGLISH_TOPICS,
        "all": ALL_TOPICS
    }


@router.get("/topics/{module}")
async def get_topics_by_module(module: str):
    """
    Get topics for a specific module (math or english).
    """
    from app.models.schemas import MATH_TOPICS, ENGLISH_TOPICS
    
    if module.lower() == "math":
        return MATH_TOPICS
    elif module.lower() == "english":
        return ENGLISH_TOPICS
    else:
        raise HTTPException(status_code=400, detail="Module must be 'math' or 'english'")

