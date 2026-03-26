from typing import List, Dict, Any, Optional
from datetime import date, datetime
import random


# Challenge templates — rotated daily
CHALLENGE_TEMPLATES = [
    {
        "challenge_type": "questions_count",
        "title": "Question Crusher",
        "description": "Answer {target} questions today",
        "target_options": [10, 15, 20],
        "xp_reward": 50,
        "icon": "🎯",
    },
    {
        "challenge_type": "accuracy_target",
        "title": "Sharp Shooter",
        "description": "Get {target}% accuracy on at least 5 questions",
        "target_options": [70, 80, 90],
        "xp_reward": 75,
        "icon": "🎯",
    },
    {
        "challenge_type": "questions_count",
        "title": "Math Blitz",
        "description": "Answer {target} questions today",
        "target_options": [8, 12, 15],
        "xp_reward": 50,
        "icon": "🔢",
    },
    {
        "challenge_type": "streak_maintain",
        "title": "Keep the Flame",
        "description": "Study today to maintain your streak",
        "target_options": [1],
        "xp_reward": 30,
        "icon": "🔥",
    },
    {
        "challenge_type": "questions_count",
        "title": "Endurance Run",
        "description": "Answer {target} questions in a single day",
        "target_options": [25, 30, 40],
        "xp_reward": 100,
        "icon": "🏃",
    },
]


class ChallengeService:
    def __init__(self, db):
        self.db = db

    async def get_or_create_daily_challenges(self, today: date = None) -> List[Dict[str, Any]]:
        """Get today's challenges, creating them if they don't exist"""
        today = today or date.today()

        existing = self.db.table("daily_challenges").select("*").eq(
            "challenge_date", today.isoformat()
        ).execute()

        if existing.data and len(existing.data) >= 3:
            return existing.data

        # Generate 3 challenges for today
        # Use date as seed for deterministic but varied daily selection
        rng = random.Random(today.toordinal())
        templates = rng.sample(CHALLENGE_TEMPLATES, min(3, len(CHALLENGE_TEMPLATES)))

        challenges = []
        for tmpl in templates:
            target = rng.choice(tmpl["target_options"])
            desc = tmpl["description"].format(target=target)

            challenge_data = {
                "challenge_date": today.isoformat(),
                "challenge_type": tmpl["challenge_type"],
                "title": tmpl["title"],
                "description": desc,
                "target_value": target,
                "xp_reward": tmpl["xp_reward"],
                "icon": tmpl["icon"],
            }

            try:
                result = self.db.table("daily_challenges").upsert(
                    challenge_data, on_conflict="challenge_date,challenge_type"
                ).execute()
                if result.data:
                    challenges.extend(result.data)
            except Exception:
                pass

        # Re-fetch to get the final state
        final = self.db.table("daily_challenges").select("*").eq(
            "challenge_date", today.isoformat()
        ).execute()

        return final.data or challenges

    async def get_user_challenge_progress(self, user_id: str, today: date = None) -> List[Dict[str, Any]]:
        """Get user's progress on today's challenges"""
        today = today or date.today()
        challenges = await self.get_or_create_daily_challenges(today)

        if not challenges:
            return []

        challenge_ids = [c["id"] for c in challenges]

        progress_resp = self.db.table("user_challenge_progress").select("*").eq(
            "user_id", user_id
        ).in_("challenge_id", challenge_ids).execute()

        progress_map = {p["challenge_id"]: p for p in (progress_resp.data or [])}

        result = []
        for ch in challenges:
            prog = progress_map.get(ch["id"])
            result.append({
                **ch,
                "current_value": prog["current_value"] if prog else 0,
                "completed": prog["completed"] if prog else False,
                "completed_at": prog.get("completed_at") if prog else None,
                "progress_pct": min(100, round((prog["current_value"] / max(ch["target_value"], 1)) * 100)) if prog else 0,
            })

        return result

    async def update_challenge_progress(
        self, user_id: str, challenge_type: str, increment: int = 1, absolute_value: int = None
    ) -> List[Dict[str, Any]]:
        """Update progress on matching challenges. Returns newly completed challenges."""
        today = date.today()
        challenges = await self.get_or_create_daily_challenges(today)

        matching = [c for c in challenges if c["challenge_type"] == challenge_type]
        newly_completed = []

        for ch in matching:
            # Get or create progress record
            prog_resp = self.db.table("user_challenge_progress").select("*").eq(
                "user_id", user_id
            ).eq("challenge_id", ch["id"]).execute()

            if prog_resp.data:
                prog = prog_resp.data[0]
                if prog["completed"]:
                    continue

                new_value = absolute_value if absolute_value is not None else prog["current_value"] + increment
                completed = new_value >= ch["target_value"]

                update_data = {
                    "current_value": new_value,
                    "completed": completed,
                    "updated_at": datetime.utcnow().isoformat(),
                }
                if completed:
                    update_data["completed_at"] = datetime.utcnow().isoformat()

                self.db.table("user_challenge_progress").update(update_data).eq(
                    "id", prog["id"]
                ).execute()

                if completed:
                    newly_completed.append(ch)
            else:
                new_value = absolute_value if absolute_value is not None else increment
                completed = new_value >= ch["target_value"]

                insert_data = {
                    "user_id": user_id,
                    "challenge_id": ch["id"],
                    "current_value": new_value,
                    "completed": completed,
                }
                if completed:
                    insert_data["completed_at"] = datetime.utcnow().isoformat()

                self.db.table("user_challenge_progress").insert(insert_data).execute()

                if completed:
                    newly_completed.append(ch)

        return newly_completed
