from typing import Optional, Dict, Any, List
from datetime import date, datetime
import math


# XP amounts for various actions
XP_REWARDS = {
    "question_correct": 10,
    "question_incorrect": 2,  # Participation XP
    "session_complete": 25,
    "perfect_session": 50,
    "streak_bonus_per_day": 5,  # Multiplied by streak length
    "mock_exam_complete": 100,
    "challenge_complete": 50,  # Base, overridden by challenge config
    "daily_login": 5,
}

# Level thresholds: level N requires this much total XP
def xp_for_level(level: int) -> int:
    """XP required to reach a given level (exponential curve)"""
    return int(100 * (level ** 1.5))


def level_from_xp(total_xp: int) -> int:
    """Calculate level from total XP"""
    level = 1
    while xp_for_level(level + 1) <= total_xp:
        level += 1
    return level


class XPService:
    def __init__(self, db):
        self.db = db

    async def get_user_xp(self, user_id: str) -> Dict[str, Any]:
        """Get user's XP info with level details"""
        response = self.db.table("user_xp").select("*").eq("user_id", user_id).execute()

        if not response.data:
            # Initialize XP record
            init = {
                "user_id": user_id,
                "total_xp": 0,
                "level": 1,
            }
            self.db.table("user_xp").insert(init).execute()
            return {
                "total_xp": 0,
                "level": 1,
                "xp_for_current_level": 0,
                "xp_for_next_level": xp_for_level(2),
                "level_progress": 0,
            }

        data = response.data[0]
        total_xp = data["total_xp"]
        level = level_from_xp(total_xp)
        current_level_xp = xp_for_level(level)
        next_level_xp = xp_for_level(level + 1)
        progress_in_level = total_xp - current_level_xp
        level_range = next_level_xp - current_level_xp

        return {
            "total_xp": total_xp,
            "level": level,
            "xp_for_current_level": current_level_xp,
            "xp_for_next_level": next_level_xp,
            "level_progress": round(progress_in_level / max(level_range, 1) * 100, 1),
        }

    async def award_xp(self, user_id: str, amount: int, reason: str, related_id: str = None) -> Dict[str, Any]:
        """Award XP and return new totals. Returns info about level-ups."""
        # Get current XP
        current = await self.get_user_xp(user_id)
        old_level = current["level"]
        new_total = current["total_xp"] + amount
        new_level = level_from_xp(new_total)

        # Record transaction
        self.db.table("xp_transactions").insert({
            "user_id": user_id,
            "amount": amount,
            "reason": reason,
            "related_id": related_id,
        }).execute()

        # Update user XP
        self.db.table("user_xp").upsert({
            "user_id": user_id,
            "total_xp": new_total,
            "level": new_level,
            "updated_at": datetime.utcnow().isoformat(),
        }, on_conflict="user_id").execute()

        leveled_up = new_level > old_level

        return {
            "xp_gained": amount,
            "total_xp": new_total,
            "level": new_level,
            "leveled_up": leveled_up,
            "old_level": old_level if leveled_up else None,
            "level_progress": round(
                (new_total - xp_for_level(new_level)) / max(xp_for_level(new_level + 1) - xp_for_level(new_level), 1) * 100, 1
            ),
        }

    async def award_session_xp(self, user_id: str, session_id: str, correct: int, total: int, streak: int = 0) -> Dict[str, Any]:
        """Calculate and award XP for a completed session"""
        xp = 0
        reasons = []

        # Base XP for completing session
        xp += XP_REWARDS["session_complete"]
        reasons.append(f"Session complete: +{XP_REWARDS['session_complete']}")

        # XP per question
        xp += correct * XP_REWARDS["question_correct"]
        xp += (total - correct) * XP_REWARDS["question_incorrect"]
        reasons.append(f"Questions: +{correct * XP_REWARDS['question_correct'] + (total - correct) * XP_REWARDS['question_incorrect']}")

        # Perfect session bonus
        if total > 0 and correct == total:
            xp += XP_REWARDS["perfect_session"]
            reasons.append(f"Perfect session: +{XP_REWARDS['perfect_session']}")

        # Streak bonus
        if streak > 1:
            streak_bonus = min(streak, 30) * XP_REWARDS["streak_bonus_per_day"]
            xp += streak_bonus
            reasons.append(f"Streak x{streak}: +{streak_bonus}")

        result = await self.award_xp(user_id, xp, "session_complete", session_id)
        result["breakdown"] = reasons
        return result

    async def get_recent_xp(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent XP transactions"""
        response = self.db.table("xp_transactions").select("*").eq(
            "user_id", user_id
        ).order("created_at", desc=True).limit(limit).execute()

        return response.data or []
