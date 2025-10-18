from typing import Optional, Dict, Any
from datetime import date, datetime, timedelta
from uuid import UUID

from ..models.profile import UserStreak


class StreakService:
    def __init__(self, db):
        self.db = db

    async def get_user_streak(self, user_id: str) -> Optional[UserStreak]:
        """Get user streak information"""
        response = self.db.table("user_streaks").select("*").eq(
            "user_id", user_id
        ).execute()

        if not response.data:
            return None

        return UserStreak(**response.data[0])

    async def initialize_streak(self, user_id: str) -> UserStreak:
        """Initialize streak for a new user"""
        streak_data = {
            "user_id": user_id,
            "current_streak": 0,
            "longest_streak": 0,
            "last_study_date": None,
            "streak_frozen_until": None,
            "total_study_days": 0
        }

        response = self.db.table("user_streaks").insert(streak_data).execute()

        if response.data:
            return UserStreak(**response.data[0])

        return None

    async def update_streak(self, user_id: str) -> Optional[UserStreak]:
        """Update user streak after completing a study session"""
        # Get current streak
        streak_response = self.db.table("user_streaks").select("*").eq(
            "user_id", user_id
        ).execute()

        if not streak_response.data:
            # Initialize if doesn't exist
            await self.initialize_streak(user_id)
            streak_response = self.db.table("user_streaks").select("*").eq(
                "user_id", user_id
            ).execute()

        if not streak_response.data:
            return None

        streak = streak_response.data[0]
        today = date.today()
        last_study_date = None

        if streak.get("last_study_date"):
            last_study_date = datetime.fromisoformat(streak["last_study_date"]).date()

        # Check if already studied today
        if last_study_date == today:
            return UserStreak(**streak)

        # Check if streak is frozen
        if streak.get("streak_frozen_until"):
            freeze_until = datetime.fromisoformat(streak["streak_frozen_until"]).date()
            if today <= freeze_until:
                # Streak is protected, just update last study date
                update_data = {
                    "last_study_date": today.isoformat(),
                    "total_study_days": streak["total_study_days"] + 1
                }
            else:
                # Freeze expired, check if streak continues
                if last_study_date and (today - last_study_date).days == 1:
                    # Studied the day after freeze expired, streak continues
                    new_streak = streak["current_streak"] + 1
                    update_data = {
                        "current_streak": new_streak,
                        "longest_streak": max(new_streak, streak["longest_streak"]),
                        "last_study_date": today.isoformat(),
                        "streak_frozen_until": None,
                        "total_study_days": streak["total_study_days"] + 1
                    }
                else:
                    # Streak broken
                    update_data = {
                        "current_streak": 1,
                        "last_study_date": today.isoformat(),
                        "streak_frozen_until": None,
                        "total_study_days": streak["total_study_days"] + 1
                    }
        else:
            # Normal streak logic
            if last_study_date is None:
                # First study session
                update_data = {
                    "current_streak": 1,
                    "longest_streak": max(1, streak.get("longest_streak", 0)),
                    "last_study_date": today.isoformat(),
                    "total_study_days": 1
                }
            elif (today - last_study_date).days == 1:
                # Studied consecutive days
                new_streak = streak["current_streak"] + 1
                update_data = {
                    "current_streak": new_streak,
                    "longest_streak": max(new_streak, streak.get("longest_streak", 0)),
                    "last_study_date": today.isoformat(),
                    "total_study_days": streak.get("total_study_days", 0) + 1
                }
            elif (today - last_study_date).days > 1:
                # Streak broken
                update_data = {
                    "current_streak": 1,
                    "last_study_date": today.isoformat(),
                    "total_study_days": streak.get("total_study_days", 0) + 1
                }
            else:
                # Same day, no update needed
                return UserStreak(**streak)

        # Update the streak
        update_response = self.db.table("user_streaks").update(update_data).eq(
            "user_id", user_id
        ).execute()

        if update_response.data:
            return UserStreak(**update_response.data[0])

        return None

    async def freeze_streak(self, user_id: str, freeze_until: date) -> bool:
        """Freeze streak for vacation mode"""
        update_data = {
            "streak_frozen_until": freeze_until.isoformat()
        }

        response = self.db.table("user_streaks").update(update_data).eq(
            "user_id", user_id
        ).execute()

        return bool(response.data)

    async def unfreeze_streak(self, user_id: str) -> bool:
        """Unfreeze streak"""
        update_data = {
            "streak_frozen_until": None
        }

        response = self.db.table("user_streaks").update(update_data).eq(
            "user_id", user_id
        ).execute()

        return bool(response.data)

    async def check_streak_status(self, user_id: str) -> Dict[str, Any]:
        """Check if streak is active, broken, or frozen"""
        streak = await self.get_user_streak(user_id)

        if not streak:
            return {
                "status": "no_streak",
                "current_streak": 0,
                "message": "Start your first session to begin a streak!"
            }

        today = date.today()
        last_study_date = None

        if streak.last_study_date:
            last_study_date = streak.last_study_date

        # Check if frozen
        if streak.streak_frozen_until and streak.streak_frozen_until >= today:
            return {
                "status": "frozen",
                "current_streak": streak.current_streak,
                "frozen_until": streak.streak_frozen_until,
                "message": f"Streak frozen until {streak.streak_frozen_until}"
            }

        # Check if studied today
        if last_study_date == today:
            return {
                "status": "active",
                "current_streak": streak.current_streak,
                "message": "Great job! You've studied today."
            }

        # Check if streak is at risk
        if last_study_date and (today - last_study_date).days == 1:
            return {
                "status": "at_risk",
                "current_streak": streak.current_streak,
                "message": "Study today to keep your streak alive!"
            }

        # Streak is broken
        if last_study_date and (today - last_study_date).days > 1:
            return {
                "status": "broken",
                "current_streak": 0,
                "previous_streak": streak.current_streak,
                "message": f"Streak broken. You had a {streak.current_streak}-day streak."
            }

        return {
            "status": "inactive",
            "current_streak": 0,
            "message": "Start studying to build a streak!"
        }