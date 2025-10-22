from typing import Optional, Dict, Any
from datetime import date, datetime, timedelta
from uuid import UUID
import json
import logging

from ..models.profile import (
    UserProfile,
    UserProfileUpdate,
    UserPreferences,
    UserPreferencesUpdate,
    UserProfileStats
)

logger = logging.getLogger(__name__)

class ProfileService:
    def __init__(self, db):
        self.db = db

    async def get_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """Get complete user profile"""
        response = self.db.table("users").select("*").eq("id", user_id).execute()

        if not response.data:
            logger.info(f"No user profile found for user {user_id}")
            return None

        user_data = response.data[0]
        return UserProfile(**user_data)

    async def update_user_profile(
        self, user_id: str, profile_update: UserProfileUpdate
    ) -> Optional[UserProfile]:
        """Update user profile fields"""
        # Convert to dict and include None values to allow clearing fields
        update_data = profile_update.dict()

        if not update_data:
            logger.info(f"No updates provided for user {user_id}")
            return await self.get_user_profile(user_id)

        try:
            response = self.db.table("users").update(update_data).eq("id", user_id).execute()
            if not response.data:
                logger.warning(f"No data returned when updating profile for user {user_id}")
                return None
            logger.info(f"Successfully updated profile for user {user_id}")
            return UserProfile(**response.data[0])
        except Exception as e:
            logger.error(f"Error updating profile for user {user_id}: {str(e)}", exc_info=True)
            raise

    async def upload_profile_photo(self, user_id: str, file) -> Optional[str]:
        try:
            logger.info(f"Starting upload for user {user_id}, file: {file.filename}, content type: {file.content_type}")

            # Read file content
            content = await file.read()
            if not content:
                logger.error("Error: File content is empty")
                return None

            file_size = len(content)
            logger.info(f"File size: {file_size} bytes")

            # Validate file size (5MB max)
            MAX_SIZE = 5 * 1024 * 1024  # 5MB
            if file_size > MAX_SIZE:
                logger.error(f"Error: File size {file_size} exceeds maximum allowed size {MAX_SIZE}")
                return None

            # Generate unique filename
            file_ext = file.filename.split('.')[-1].lower()
            file_name = f"{user_id}/profile.{file_ext}"

            logger.info(f"Attempting to upload to bucket 'profile-photos' with filename: {file_name}")

            # Upload to Supabase Storage
            try:
                # Get the storage bucket
                bucket = self.db.storage.from_("profile-photos")
                
                # Upload the file with owner metadata
                result = bucket.upload(
                    file_name,
                    content,
                    {
                        "content-type": file.content_type or "application/octet-stream",
                        "x-upsert": "true",
                        "cache-control": "public, max-age=31536000",
                        "x-object-meta-owner": user_id
                    }
                )
                
                logger.info(f"Upload result: {result}")
                
                # Get the public URL
                photo_url = bucket.get_public_url(file_name)
                logger.info(f"Generated public URL: {photo_url}")

                # Update user profile with photo URL
                update_response = self.db.table("users").update(
                    {"profile_photo_url": photo_url}
                ).eq("id", user_id).execute()

                if not update_response.data:
                    logger.error("Error: Failed to update user profile with photo URL")
                    return None

                logger.info("Successfully updated profile photo")
                return photo_url

            except Exception as upload_error:
                logger.error(f"Error during upload: {str(upload_error)}")
                if hasattr(upload_error, 'response') and hasattr(upload_error.response, 'content'):
                    logger.error(f"Error details: {upload_error.response.content}")
                return None

        except Exception as e:
            logger.error(f"Unexpected error in upload_profile_photo: {str(e)}")
            raise

    async def delete_profile_photo(self, user_id: str) -> bool:
        """Delete user profile photo"""
        try:
            # Get current photo URL
            user_response = self.db.table("users").select("profile_photo_url").eq(
                "id", user_id
            ).execute()

            if user_response.data and user_response.data[0].get("profile_photo_url"):
                # Extract file path from URL
                photo_url = user_response.data[0]["profile_photo_url"]
                # Parse file path from URL (implementation depends on URL structure)

                # Delete old photo if exists
                if user_response.data[0].get("profile_photo_url"):
                    try:
                        old_photo_path = user_response.data[0]["profile_photo_url"].split('/profile-photos/')[-1]
                        self.db.storage.from_("profile-photos").remove([old_photo_path])
                        logger.info(f"Deleted old profile photo for user {user_id}")
                    except Exception as e:
                        logger.error(f"Error deleting old profile photo for user {user_id}: {str(e)}", exc_info=True)
                        # Continue with update even if deletion fails

            # Update user profile to remove photo URL
            self.db.table("users").update(
                {"profile_photo_url": None}
            ).eq("id", user_id).execute()

            logger.info(f"Successfully deleted profile photo for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting profile photo: {str(e)}")
            raise

    async def get_user_preferences(self, user_id: str) -> Optional[UserPreferences]:
        """Get user preferences"""
        response = self.db.table("user_preferences").select("*").eq(
            "user_id", user_id
        ).execute()

        if not response.data:
            return None

        return UserPreferences(**response.data[0])

    async def create_default_preferences(self, user_id: str) -> UserPreferences:
        """Create default preferences for a user"""
        default_prefs = {
            "user_id": user_id,
            "theme": "light",
            "font_size": "normal",
            "reduce_animations": False,
            "preferred_study_time": "evening",
            "session_length_preference": 30,
            "learning_style": "balanced",
            "difficulty_adaptation": "balanced",
            "email_notifications": {
                "daily_reminder": True,
                "weekly_progress": True,
                "achievement_unlocked": True,
                "streak_reminder": True,
                "parent_reports": False
            },
            "push_notifications": {
                "enabled": False,
                "daily_reminder": False,
                "achievement_unlocked": False
            },
            "profile_visibility": "private",
            "show_on_leaderboard": False
        }

        response = self.db.table("user_preferences").insert(default_prefs).execute()

        if response.data:
            return UserPreferences(**response.data[0])

        return None

    async def update_user_preferences(
        self, user_id: str, preferences_update: UserPreferencesUpdate
    ) -> Optional[UserPreferences]:
        """Update user preferences"""
        # Filter out None values
        update_data = {k: v for k, v in preferences_update.dict().items() if v is not None}

        if not update_data:
            return await self.get_user_preferences(user_id)

        # Handle JSONB fields
        if "email_notifications" in update_data:
            update_data["email_notifications"] = json.dumps(update_data["email_notifications"])
        if "push_notifications" in update_data:
            update_data["push_notifications"] = json.dumps(update_data["push_notifications"])

        response = self.db.table("user_preferences").update(update_data).eq(
            "user_id", user_id
        ).execute()

        if not response.data:
            # Preferences might not exist, create them
            return await self.create_default_preferences(user_id)

        return UserPreferences(**response.data[0])

    async def get_user_stats(self, user_id: str) -> Optional[UserProfileStats]:
        """Get aggregated user statistics"""
        stats = UserProfileStats()

        # First get the active study plan ID
        study_plan_response = self.db.table("study_plans").select("id").eq(
            "user_id", user_id
        ).eq("is_active", True).execute()

        if not study_plan_response.data:
            # No active study plan, return empty stats
            return stats

        study_plan_id = study_plan_response.data[0]["id"]

        # Get practice session stats
        sessions_response = self.db.table("practice_sessions").select(
            "id, status, completed_at, started_at"
        ).eq("study_plan_id", study_plan_id).execute()

        if sessions_response.data:
            completed_sessions = [s for s in sessions_response.data if s.get("status") == "completed"]
            stats.total_practice_sessions = len(completed_sessions)

            # Calculate total study time
            for session in completed_sessions:
                if session.get("started_at") and session.get("completed_at"):
                    start = datetime.fromisoformat(session["started_at"])
                    end = datetime.fromisoformat(session["completed_at"])
                    duration = (end - start).total_seconds() / 3600  # Convert to hours
                    stats.total_study_hours += duration

            if stats.total_practice_sessions > 0:
                stats.average_session_duration = stats.total_study_hours / stats.total_practice_sessions * 60  # In minutes

        # Get question stats
        # Note: session_questions doesn't have is_correct, we need to check user_answer vs correct answer
        questions_response = self.db.table("session_questions").select(
            "status, user_answer, question_id"
        ).in_("session_id", [s["id"] for s in sessions_response.data] if sessions_response.data else []).execute()

        if questions_response.data:
            answered_questions = [q for q in questions_response.data if q.get("status") == "answered"]
            stats.total_questions_answered = len(answered_questions)

            # For now, we'll skip calculating correct answers since it requires joining with questions table
            # This would need a more complex query to compare user_answer with question's correct_answer
            stats.total_correct_answers = 0
            stats.accuracy_percentage = 0.0

        # Get full study plan details for scores and test date
        # (we already have the ID from earlier)
        full_plan_response = self.db.table("study_plans").select("*").eq(
            "id", study_plan_id
        ).execute()

        if full_plan_response.data:
            plan = full_plan_response.data[0]
            stats.current_math_score = plan.get("current_math_score")
            stats.target_math_score = plan.get("target_math_score")
            stats.current_rw_score = plan.get("current_rw_score")
            stats.target_rw_score = plan.get("target_rw_score")

            if plan.get("test_date"):
                test_date = datetime.fromisoformat(plan["test_date"]).date()
                stats.days_until_test = (test_date - date.today()).days

        # Get latest performance snapshot for improvement tracking
        snapshot_response = self.db.table("user_performance_snapshots").select(
            "predicted_sat_math, predicted_sat_rw"
        ).eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()

        if snapshot_response.data and stats.current_math_score and stats.current_rw_score:
            latest = snapshot_response.data[0]
            if latest.get("predicted_sat_math"):
                stats.improvement_math = latest["predicted_sat_math"] - stats.current_math_score
            if latest.get("predicted_sat_rw"):
                stats.improvement_rw = latest["predicted_sat_rw"] - stats.current_rw_score

        return stats

    async def mark_onboarding_complete(self, user_id: str) -> bool:
        """Mark user onboarding as complete"""
        response = self.db.table("users").update(
            {"onboarding_completed": True}
        ).eq("id", user_id).execute()

        return bool(response.data)