from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from typing import List, Dict, Any
from app.db import get_db
from app.core.auth import get_current_user, get_authenticated_client
from app.services.xp_service import XPService
from app.services.challenge_service import ChallengeService
from app.services.leaderboard_service import LeaderboardService

router = APIRouter(prefix="/gamification", tags=["gamification"])


# ── XP endpoints ─────────────────────────────────────────────

@router.get("/xp")
async def get_user_xp(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """Get user's XP, level, and progress"""
    service = XPService(db)
    return await service.get_user_xp(user_id)


@router.get("/xp/history")
async def get_xp_history(
    limit: int = Query(default=20, le=100),
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """Get recent XP transactions"""
    service = XPService(db)
    return await service.get_recent_xp(user_id, limit)


# ── Daily challenges endpoints ────────────────────────────────

@router.get("/challenges")
async def get_daily_challenges(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """Get today's challenges with user's progress"""
    service = ChallengeService(db)
    return await service.get_user_challenge_progress(user_id)


# ── Leaderboard endpoints ────────────────────────────────────

@router.get("/leaderboard")
async def get_leaderboard(
    period: str = Query(default="weekly", regex="^(weekly|monthly|all_time)$"),
    limit: int = Query(default=20, le=50),
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """Get leaderboard rankings"""
    service = LeaderboardService(db)
    leaderboard = await service.get_leaderboard(period, limit)
    user_rank = await service.get_user_rank(user_id, period)
    return {
        "leaderboard": leaderboard,
        "user_rank": user_rank,
    }
