from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from app.db import get_db
from app.models.study_plan import StudyPlanCreate, StudyPlanResponse
from app.services.study_plan_service import StudyPlanService
from app.core.auth import get_current_user, get_authenticated_client
from typing import Dict

router = APIRouter(prefix="/study-plans", tags=["study-plans"])


@router.post("/generate", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def generate_study_plan(
    plan_data: StudyPlanCreate,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Generate a new study plan for a user.

    Args:
        plan_data: Study plan creation data (scores, test date)
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Generated study plan with sessions
    """
    try:
        service = StudyPlanService(db)

        result = await service.generate_study_plan(
            user_id=user_id,
            current_math_score=plan_data.current_math_score,
            target_math_score=plan_data.target_math_score,
            current_rw_score=plan_data.current_rw_score,
            target_rw_score=plan_data.target_rw_score,
            test_date=plan_data.test_date
        )

        return result

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate study plan: {str(e)}"
        )


@router.get("/me", response_model=Dict)
async def get_study_plan(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get the active study plan for the current user.

    Args:
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Active study plan with all sessions and topics
    """
    try:
        service = StudyPlanService(db)
        result = await service.get_study_plan_by_user(user_id)

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active study plan found for this user"
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve study plan: {str(e)}"
        )


@router.get("/sessions/{session_id}/questions", response_model=Dict)
async def get_session_questions(
    session_id: str,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get all questions for a specific practice session.

    Args:
        session_id: Practice session ID
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Session questions with full question details
    """
    try:
        # Verify session belongs to user's study plan
        session_response = db.table("practice_sessions").select(
            "*, study_plans!inner(user_id)"
        ).eq("id", session_id).execute()

        if not session_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        session = session_response.data[0]
        if session["study_plans"]["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this session"
            )

        # Fetch all questions for the session
        questions_response = db.table("session_questions").select(
            "*, questions(*), topics(id, name)"
        ).eq("session_id", session_id).execute()

        questions = []
        for sq in questions_response.data:
            questions.append({
                "session_question_id": sq["id"],
                "question": sq["questions"],
                "topic": sq["topics"],
                "status": sq["status"],
                "display_order": sq["display_order"]
            })

        return {
            "session": session,
            "questions": questions,
            "total_questions": len(questions)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve session questions: {str(e)}"
        )


@router.get("/", response_model=Dict)
async def get_categories_and_topics(db: Client = Depends(get_db)):
    """
    Get all categories and topics for reference.

    Returns:
        Categories and topics grouped by section
    """
    try:
        service = StudyPlanService(db)
        result = await service.get_categories_and_topics()
        return result

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve categories and topics: {str(e)}"
        )
