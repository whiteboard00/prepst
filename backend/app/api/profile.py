from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Optional, List
from datetime import date, datetime, timedelta
from uuid import UUID

from ..models.profile import (
    UserProfile,
    UserProfileUpdate,
    UserPreferences,
    UserPreferencesUpdate,
    UserAchievement,
    UserStreak,
    UserProfileStats,
    ProfileResponse
)
from ..core.auth import get_current_user, get_authenticated_client
from ..services.profile_service import ProfileService
from ..services.achievement_service import AchievementService
from ..services.streak_service import StreakService

router = APIRouter()


@router.get("/profile", response_model=ProfileResponse)
async def get_user_profile(
    user_id: str = Depends(get_current_user),
    supabase=Depends(get_authenticated_client)
):
    """
    Get complete user profile including preferences, streak, stats, and recent achievements
    """
    service = ProfileService(supabase)

    # Get base profile
    profile = await service.get_user_profile(user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )

    # Get preferences
    preferences = await service.get_user_preferences(user_id)

    # Get streak
    streak_service = StreakService(supabase)
    streak = await streak_service.get_user_streak(user_id)

    # Get stats
    stats = await service.get_user_stats(user_id)

    # Get recent achievements
    achievement_service = AchievementService(supabase)
    recent_achievements = await achievement_service.get_recent_achievements(user_id, limit=5)

    return ProfileResponse(
        profile=profile,
        preferences=preferences,
        streak=streak,
        stats=stats,
        recent_achievements=recent_achievements
    )


@router.patch("/profile", response_model=UserProfile)
async def update_user_profile(
    profile_update: UserProfileUpdate,
    user_id: str = Depends(get_current_user),
    supabase=Depends(get_authenticated_client)
):
    """
    Update user profile information
    """
    try:
        service = ProfileService(supabase)

        # Update profile
        updated_profile = await service.update_user_profile(user_id, profile_update)

        if not updated_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update profile"
            )

        return updated_profile
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in update_user_profile endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )


@router.post("/profile/photo")
async def upload_profile_photo(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
    supabase=Depends(get_authenticated_client)
):
    """
    Upload user profile photo
    """
    try:
        # Validate file type
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Only JPEG, PNG, and WebP are allowed."
            )

        # Read file content to check size
        content = await file.read()
        file_size = len(content)
        
        # Validate file size (max 5MB)
        if file_size > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large. Maximum size is 5MB."
            )

        # Reset file pointer and update file object
        await file.seek(0)

        service = ProfileService(supabase)
        photo_url = await service.upload_profile_photo(user_id, file)

        if not photo_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload profile photo"
            )

        return {"profile_photo_url": photo_url}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in upload_profile_photo endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload profile photo: {str(e)}"
        )


@router.delete("/profile/photo")
async def delete_profile_photo(
    user_id: str = Depends(get_current_user),
    supabase=Depends(get_authenticated_client)
):
    """
    Delete user profile photo
    """
    service = ProfileService(supabase)
    success = await service.delete_profile_photo(user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to delete profile photo"
        )

    return {"message": "Profile photo deleted successfully"}


@router.get("/preferences", response_model=UserPreferences)
async def get_user_preferences(
    user_id: str = Depends(get_current_user),
    supabase=Depends(get_authenticated_client)
):
    """
    Get user preferences
    """
    service = ProfileService(supabase)
    preferences = await service.get_user_preferences(user_id)

    if not preferences:
        # Create default preferences if they don't exist
        preferences = await service.create_default_preferences(user_id)

    return preferences


@router.patch("/preferences", response_model=UserPreferences)
async def update_user_preferences(
    preferences_update: UserPreferencesUpdate,
    user_id: str = Depends(get_current_user),
    supabase=Depends(get_authenticated_client)
):
    """
    Update user preferences
    """
    service = ProfileService(supabase)
    updated_preferences = await service.update_user_preferences(user_id, preferences_update)

    if not updated_preferences:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update preferences"
        )

    return updated_preferences


@router.get("/achievements", response_model=List[UserAchievement])
async def get_user_achievements(
    user_id: str = Depends(get_current_user),
    supabase=Depends(get_authenticated_client)
):
    """
    Get all user achievements
    """
    service = AchievementService(supabase)
    achievements = await service.get_user_achievements(user_id)
    return achievements


@router.get("/streak", response_model=UserStreak)
async def get_user_streak(
    user_id: str = Depends(get_current_user),
    supabase=Depends(get_authenticated_client)
):
    """
    Get user streak information
    """
    service = StreakService(supabase)
    streak = await service.get_user_streak(user_id)

    if not streak:
        # Initialize streak if it doesn't exist
        streak = await service.initialize_streak(user_id)

    return streak


@router.post("/streak/freeze")
async def freeze_streak(
    days: int = 7,
    user_id: str = Depends(get_current_user),
    supabase=Depends(get_authenticated_client)
):
    """
    Freeze streak for vacation mode (max 30 days)
    """
    if days < 1 or days > 30:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Freeze duration must be between 1 and 30 days"
        )

    service = StreakService(supabase)
    freeze_until = date.today() + timedelta(days=days)
    success = await service.freeze_streak(user_id, freeze_until)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to freeze streak"
        )

    return {
        "message": f"Streak frozen until {freeze_until}",
        "freeze_until": freeze_until
    }


@router.post("/streak/unfreeze")
async def unfreeze_streak(
    user_id: str = Depends(get_current_user),
    supabase=Depends(get_authenticated_client)
):
    """
    Unfreeze streak (resume tracking)
    """
    service = StreakService(supabase)
    success = await service.unfreeze_streak(user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to unfreeze streak"
        )

    return {"message": "Streak unfrozen successfully"}


@router.get("/stats", response_model=UserProfileStats)
async def get_user_stats(
    user_id: str = Depends(get_current_user),
    supabase=Depends(get_authenticated_client)
):
    """
    Get aggregated user statistics
    """
    service = ProfileService(supabase)
    stats = await service.get_user_stats(user_id)

    if not stats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User statistics not found"
        )

    return stats


@router.post("/complete-onboarding")
async def complete_onboarding(
    user_id: str = Depends(get_current_user),
    supabase=Depends(get_authenticated_client)
):
    """
    Mark user onboarding as complete
    """
    service = ProfileService(supabase)
    success = await service.mark_onboarding_complete(user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to complete onboarding"
        )

    # Check for first-time achievements
    achievement_service = AchievementService(supabase)
    await achievement_service.check_and_award_achievement(
        user_id,
        "onboarding_complete",
        "Welcome Aboard!",
        "Completed profile setup and onboarding"
    )

    return {"message": "Onboarding completed successfully"}