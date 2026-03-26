from typing import List, Dict, Any
from datetime import date, timedelta, datetime


class LeaderboardService:
    def __init__(self, db):
        self.db = db

    def _get_period_start(self, period_type: str) -> date:
        today = date.today()
        if period_type == "weekly":
            return today - timedelta(days=today.weekday())  # Monday
        elif period_type == "monthly":
            return today.replace(day=1)
        return date(2024, 1, 1)  # all_time

    async def get_leaderboard(self, period_type: str = "weekly", limit: int = 20) -> List[Dict[str, Any]]:
        """Get leaderboard for a period"""
        period_start = self._get_period_start(period_type)

        response = self.db.table("leaderboard_entries").select(
            "*, user_profiles!inner(name, profile_photo_url)"
        ).eq(
            "period_type", period_type
        ).eq(
            "period_start", period_start.isoformat()
        ).order(
            "total_xp", desc=True
        ).limit(limit).execute()

        entries = response.data or []

        # Add rank
        for i, entry in enumerate(entries):
            entry["rank"] = i + 1
            profile = entry.pop("user_profiles", {})
            entry["name"] = profile.get("name", "Anonymous")
            entry["profile_photo_url"] = profile.get("profile_photo_url")

        return entries

    async def update_user_entry(self, user_id: str, period_type: str = "weekly") -> None:
        """Update a user's leaderboard entry for the current period"""
        period_start = self._get_period_start(period_type)

        # Get user's XP transactions for this period
        xp_resp = self.db.table("xp_transactions").select("amount").eq(
            "user_id", user_id
        ).gte("created_at", period_start.isoformat()).execute()

        total_xp = sum(tx["amount"] for tx in (xp_resp.data or []))

        # Get user's questions answered this period
        q_resp = self.db.table("session_questions").select(
            "id, is_correct", count="exact"
        ).eq("user_id", user_id).eq("status", "answered").gte(
            "created_at", period_start.isoformat()
        ).execute()

        questions_answered = q_resp.count or 0
        correct = sum(1 for q in (q_resp.data or []) if q.get("is_correct"))
        accuracy = round(correct / max(questions_answered, 1) * 100, 1)

        self.db.table("leaderboard_entries").upsert({
            "user_id": user_id,
            "period_type": period_type,
            "period_start": period_start.isoformat(),
            "total_xp": total_xp,
            "questions_answered": questions_answered,
            "accuracy": accuracy,
            "updated_at": datetime.utcnow().isoformat(),
        }, on_conflict="user_id,period_type,period_start").execute()

    async def get_user_rank(self, user_id: str, period_type: str = "weekly") -> Dict[str, Any]:
        """Get a specific user's rank"""
        period_start = self._get_period_start(period_type)

        # Get user's entry
        user_resp = self.db.table("leaderboard_entries").select("*").eq(
            "user_id", user_id
        ).eq("period_type", period_type).eq(
            "period_start", period_start.isoformat()
        ).execute()

        if not user_resp.data:
            return {"rank": None, "total_xp": 0}

        user_xp = user_resp.data[0]["total_xp"]

        # Count users with more XP
        higher_resp = self.db.table("leaderboard_entries").select(
            "id", count="exact"
        ).eq("period_type", period_type).eq(
            "period_start", period_start.isoformat()
        ).gt("total_xp", user_xp).execute()

        rank = (higher_resp.count or 0) + 1

        return {
            "rank": rank,
            "total_xp": user_xp,
            "questions_answered": user_resp.data[0].get("questions_answered", 0),
            "accuracy": user_resp.data[0].get("accuracy", 0),
        }
