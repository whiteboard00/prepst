from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from app.db import get_db
from app.models.study_plan import (
    StudyPlanCreate,
    StudyPlanResponse,
    CategoriesAndTopicsResponse,
)
from app.services.study_plan_service import StudyPlanService
from app.core.auth import get_current_user, get_authenticated_client

router = APIRouter(prefix="/study-plans", tags=["study-plans"])


@router.post("/generate", response_model=StudyPlanResponse, status_code=status.HTTP_201_CREATED)
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


@router.get("/me", response_model=StudyPlanResponse)
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


@router.post("/me/generate-batch")
async def generate_next_batch(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Generate next 14-day batch of sessions for the active study plan.

    This uses CURRENT mastery data to focus on high-priority topics.
    Useful to call after:
    - Completing a mock exam
    - Every 2 weeks of practice
    - When buffer of pending sessions is low

    Args:
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Batch generation result with created sessions info
    """
    try:
        # Get active study plan
        plan_response = db.table("study_plans").select("*").eq(
            "user_id", user_id
        ).eq("is_active", True).execute()

        if not plan_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active study plan found"
            )

        study_plan_id = plan_response.data[0]["id"]

        # Generate next batch
        service = StudyPlanService(db)
        result = await service.generate_next_batch(study_plan_id, days=14)

        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating batch: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate batch: {str(e)}"
        )


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_study_plan(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Delete the active study plan for the current user.

    Args:
        user_id: User ID from authentication token
        db: Database client

    Returns:
        No content on success
    """
    try:
        result = db.table("study_plans").delete().eq(
            "user_id", user_id
        ).eq("is_active", True).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active study plan found"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete study plan: {str(e)}"
        )


@router.get("/", response_model=CategoriesAndTopicsResponse)
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
