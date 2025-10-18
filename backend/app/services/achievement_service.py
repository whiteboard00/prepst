from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

from ..models.profile import UserAchievement


class AchievementService:
    def __init__(self, db):
        self.db = db

    # Define achievement types and their requirements
    ACHIEVEMENTS = {
        "first_session": {
            "name": "First Steps",
            "description": "Complete your first practice session",
            "icon": "🎯"
        },
        "streak_3": {
            "name": "On a Roll",
            "description": "Maintain a 3-day study streak",
            "icon": "🔥"
        },
        "streak_7": {
            "name": "Week Warrior",
            "description": "Maintain a 7-day study streak",
            "icon": "💪"
        },
        "streak_30": {
            "name": "Dedicated Scholar",
            "description": "Maintain a 30-day study streak",
            "icon": "🏆"
        },
        "questions_100": {
            "name": "Century Club",
            "description": "Answer 100 questions",
            "icon": "💯"
        },
        "questions_500": {
            "name": "Question Master",
            "description": "Answer 500 questions",
            "icon": "📚"
        },
        "questions_1000": {
            "name": "Knowledge Seeker",
            "description": "Answer 1000 questions",
            "icon": "🎓"
        },
        "perfect_session": {
            "name": "Perfect Score",
            "description": "Complete a session with 100% accuracy",
            "icon": "⭐"
        },
        "early_bird": {
            "name": "Early Bird",
            "description": "Complete a session before 7 AM",
            "icon": "🌅"
        },
        "night_owl": {
            "name": "Night Owl",
            "description": "Complete a session after 10 PM",
            "icon": "🦉"
        },
        "score_improvement_50": {
            "name": "Rising Star",
            "description": "Improve your predicted score by 50 points",
            "icon": "📈"
        },
        "score_improvement_100": {
            "name": "Breakthrough",
            "description": "Improve your predicted score by 100 points",
            "icon": "🚀"
        },
        "mock_exam_complete": {
            "name": "Test Ready",
            "description": "Complete your first mock exam",
            "icon": "📝"
        },
        "speed_demon": {
            "name": "Speed Demon",
            "description": "Complete a session in under 15 minutes",
            "icon": "⚡"
        },
        "consistency_king": {
            "name": "Consistency King",
            "description": "Study for 5 days in a row",
            "icon": "👑"
        },
        "onboarding_complete": {
            "name": "Welcome Aboard",
            "description": "Complete profile setup and onboarding",
            "icon": "🎉"
        }
    }

    async def get_user_achievements(self, user_id: str) -> List[UserAchievement]:
        """Get all achievements for a user"""
        response = self.db.table("user_achievements").select("*").eq(
            "user_id", user_id
        ).order("unlocked_at", desc=True).execute()

        if not response.data:
            return []

        return [UserAchievement(**achievement) for achievement in response.data]

    async def get_recent_achievements(
        self, user_id: str, limit: int = 5
    ) -> List[UserAchievement]:
        """Get recent achievements for a user"""
        response = self.db.table("user_achievements").select("*").eq(
            "user_id", user_id
        ).order("unlocked_at", desc=True).limit(limit).execute()

        if not response.data:
            return []

        return [UserAchievement(**achievement) for achievement in response.data]

    async def check_and_award_achievement(
        self,
        user_id: str,
        achievement_type: str,
        achievement_name: Optional[str] = None,
        achievement_description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[UserAchievement]:
        """Check if user has earned an achievement and award it if not already awarded"""

        # Check if already awarded
        existing = self.db.table("user_achievements").select("id").eq(
            "user_id", user_id
        ).eq("achievement_type", achievement_type).execute()

        if existing.data:
            return None  # Already has this achievement

        # Get achievement details
        achievement_info = self.ACHIEVEMENTS.get(achievement_type, {})

        # Award the achievement
        achievement_data = {
            "user_id": user_id,
            "achievement_type": achievement_type,
            "achievement_name": achievement_name or achievement_info.get("name", "Achievement"),
            "achievement_description": achievement_description or achievement_info.get("description", ""),
            "achievement_icon": achievement_info.get("icon", "🏆"),
            "metadata": metadata or {}
        }

        response = self.db.table("user_achievements").insert(achievement_data).execute()

        if response.data:
            return UserAchievement(**response.data[0])

        return None

    async def check_session_achievements(self, user_id: str, session_id: str):
        """Check for achievements after completing a session"""
        achievements_awarded = []

        # Check for first session
        sessions_count = self.db.table("practice_sessions").select(
            "id", count="exact"
        ).eq("status", "completed").execute()

        if sessions_count.count == 1:
            achievement = await self.check_and_award_achievement(
                user_id, "first_session"
            )
            if achievement:
                achievements_awarded.append(achievement)

        # Check for perfect session
        questions = self.db.table("session_questions").select(
            "is_correct"
        ).eq("session_id", session_id).eq("status", "answered").execute()

        if questions.data and all(q.get("is_correct") for q in questions.data):
            achievement = await self.check_and_award_achievement(
                user_id, "perfect_session", metadata={"session_id": session_id}
            )
            if achievement:
                achievements_awarded.append(achievement)

        # Check for time-based achievements
        current_hour = datetime.now().hour
        if current_hour < 7:
            achievement = await self.check_and_award_achievement(
                user_id, "early_bird"
            )
            if achievement:
                achievements_awarded.append(achievement)
        elif current_hour >= 22:
            achievement = await self.check_and_award_achievement(
                user_id, "night_owl"
            )
            if achievement:
                achievements_awarded.append(achievement)

        # Check for questions milestones
        total_questions = self.db.table("session_questions").select(
            "id", count="exact"
        ).eq("user_id", user_id).eq("status", "answered").execute()

        if total_questions.count >= 100:
            achievement = await self.check_and_award_achievement(
                user_id, "questions_100"
            )
            if achievement:
                achievements_awarded.append(achievement)

        if total_questions.count >= 500:
            achievement = await self.check_and_award_achievement(
                user_id, "questions_500"
            )
            if achievement:
                achievements_awarded.append(achievement)

        if total_questions.count >= 1000:
            achievement = await self.check_and_award_achievement(
                user_id, "questions_1000"
            )
            if achievement:
                achievements_awarded.append(achievement)

        return achievements_awarded

    async def check_streak_achievements(self, user_id: str, current_streak: int):
        """Check for streak-related achievements"""
        achievements_awarded = []

        if current_streak >= 3:
            achievement = await self.check_and_award_achievement(
                user_id, "streak_3"
            )
            if achievement:
                achievements_awarded.append(achievement)

        if current_streak >= 5:
            achievement = await self.check_and_award_achievement(
                user_id, "consistency_king"
            )
            if achievement:
                achievements_awarded.append(achievement)

        if current_streak >= 7:
            achievement = await self.check_and_award_achievement(
                user_id, "streak_7"
            )
            if achievement:
                achievements_awarded.append(achievement)

        if current_streak >= 30:
            achievement = await self.check_and_award_achievement(
                user_id, "streak_30"
            )
            if achievement:
                achievements_awarded.append(achievement)

        return achievements_awarded

    async def check_score_improvement_achievements(
        self, user_id: str, initial_score: int, current_score: int
    ):
        """Check for score improvement achievements"""
        achievements_awarded = []
        improvement = current_score - initial_score

        if improvement >= 50:
            achievement = await self.check_and_award_achievement(
                user_id, "score_improvement_50",
                metadata={"improvement": improvement}
            )
            if achievement:
                achievements_awarded.append(achievement)

        if improvement >= 100:
            achievement = await self.check_and_award_achievement(
                user_id, "score_improvement_100",
                metadata={"improvement": improvement}
            )
            if achievement:
                achievements_awarded.append(achievement)

        return achievements_awarded