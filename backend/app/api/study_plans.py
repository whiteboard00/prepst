from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from app.db import get_db
from app.models.study_plan import StudyPlanCreate, StudyPlanResponse
from app.services.study_plan_service import StudyPlanService
from typing import Dict

router = APIRouter(prefix="/study-plans", tags=["study-plans"])


@router.post("/generate", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def generate_study_plan(
    plan_data: StudyPlanCreate,
    user_id: str,  # TODO: Replace with actual auth
    db: Client = Depends(get_db)
):
    """
    Generate a new study plan for a user.

    Args:
        plan_data: Study plan creation data (scores, test date)
        user_id: User ID (from auth - temporary query param for MVP)
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


@router.get("/{user_id}", response_model=Dict)
async def get_study_plan(
    user_id: str,
    db: Client = Depends(get_db)
):
    """
    Get the active study plan for a user.

    Args:
        user_id: User ID
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
