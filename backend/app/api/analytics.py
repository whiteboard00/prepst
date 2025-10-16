"""
Analytics API Endpoints

Provides access to learning analytics, growth curves, and mastery tracking.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from app.services.analytics_service import AnalyticsService
from app.services.bkt_service import BKTService
from app.core.auth import get_current_user, get_authenticated_client
from typing import List, Dict, Optional
from pydantic import BaseModel


router = APIRouter(prefix="/analytics", tags=["analytics"])


class GrowthCurveResponse(BaseModel):
    """Response model for growth curve data"""
    data: List[Dict]
    skill_id: Optional[str] = None
    days_covered: int


class SkillHeatmapResponse(BaseModel):
    """Response model for skill mastery heatmap"""
    heatmap: Dict
    total_skills: int
    avg_mastery: float


class SnapshotResponse(BaseModel):
    """Response model for performance snapshot"""
    snapshots: List[Dict]
    total_count: int


class LearningEventsResponse(BaseModel):
    """Response model for learning events"""
    events: List[Dict]
    total_count: int


@router.get("/users/me/growth-curve", response_model=GrowthCurveResponse)
async def get_user_growth_curve(
    skill_id: Optional[str] = Query(None, description="Optional skill ID to track"),
    days_back: int = Query(30, description="Number of days to look back", ge=1, le=365),
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get mastery progression over time (growth curve).
    
    Shows how student's mastery has improved across time.
    Can filter to specific skill or show overall progress.
    
    Args:
        skill_id: Optional specific skill to track
        days_back: Number of days to look back (default 30)
        user_id: Authenticated user ID
        db: Database client
        
    Returns:
        Growth curve data with timestamps and mastery values
    """
    try:
        analytics_service = AnalyticsService(db)
        growth_data = await analytics_service.get_growth_curve(
            user_id=user_id,
            skill_id=skill_id,
            days_back=days_back
        )
        
        return {
            "data": growth_data,
            "skill_id": skill_id,
            "days_covered": days_back
        }
        
    except Exception as e:
        print(f"Error getting growth curve: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve growth curve: {str(e)}"
        )


@router.get("/users/me/skill-heatmap", response_model=SkillHeatmapResponse)
async def get_user_skill_heatmap(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get current mastery heatmap across all skills.
    
    Visual representation of student's current mastery state.
    Grouped by category with color-coding based on mastery level.
    
    Args:
        user_id: Authenticated user ID
        db: Database client
        
    Returns:
        Heatmap data grouped by category
    """
    try:
        analytics_service = AnalyticsService(db)
        heatmap = await analytics_service.get_skill_heatmap(user_id=user_id)
        
        # Calculate totals
        total_skills = sum(len(cat["skills"]) for cat in heatmap.values())
        all_masteries = [
            skill["mastery"] 
            for cat in heatmap.values() 
            for skill in cat["skills"]
        ]
        avg_mastery = sum(all_masteries) / len(all_masteries) if all_masteries else 0
        
        return {
            "heatmap": heatmap,
            "total_skills": total_skills,
            "avg_mastery": round(avg_mastery, 4)
        }
        
    except Exception as e:
        print(f"Error getting skill heatmap: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve skill heatmap: {str(e)}"
        )


@router.get("/users/me/snapshots", response_model=SnapshotResponse)
async def get_user_snapshots(
    snapshot_type: Optional[str] = Query(None, description="Filter by snapshot type"),
    limit: int = Query(50, description="Maximum number of snapshots", ge=1, le=200),
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get historical performance snapshots.
    
    Snapshots capture student's state at specific points in time.
    Useful for tracking long-term progress.
    
    Args:
        snapshot_type: Optional filter ('session_complete', 'mock_exam', 'weekly', 'monthly')
        limit: Maximum number of snapshots to return
        user_id: Authenticated user ID
        db: Database client
        
    Returns:
        List of performance snapshots
    """
    try:
        query = db.table("user_performance_snapshots").select("*").eq(
            "user_id", user_id
        ).order("created_at", desc=True).limit(limit)
        
        if snapshot_type:
            query = query.eq("snapshot_type", snapshot_type)
        
        response = query.execute()
        
        return {
            "snapshots": response.data,
            "total_count": len(response.data)
        }
        
    except Exception as e:
        print(f"Error getting snapshots: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve snapshots: {str(e)}"
        )


@router.post("/snapshots")
async def create_snapshot(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Manually create a performance snapshot.
    
    Captures current mastery state for future comparison.
    
    Args:
        user_id: Authenticated user ID
        db: Database client
        
    Returns:
        Created snapshot
    """
    try:
        analytics_service = AnalyticsService(db)
        snapshot = await analytics_service.create_performance_snapshot(
            user_id=user_id,
            snapshot_type="manual"
        )
        
        return snapshot
        
    except Exception as e:
        print(f"Error creating snapshot: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create snapshot: {str(e)}"
        )


@router.get("/users/me/learning-events", response_model=LearningEventsResponse)
async def get_learning_events(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    limit: int = Query(50, description="Maximum number of events", ge=1, le=200),
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get recent learning events.
    
    Events include mastery updates, achievements, and plateaus.
    
    Args:
        event_type: Optional filter by event type
        limit: Maximum number of events
        user_id: Authenticated user ID
        db: Database client
        
    Returns:
        List of learning events
    """
    try:
        analytics_service = AnalyticsService(db)
        events = await analytics_service.get_recent_learning_events(
            user_id=user_id,
            limit=limit,
            event_type=event_type
        )
        
        return {
            "events": events,
            "total_count": len(events)
        }
        
    except Exception as e:
        print(f"Error getting learning events: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve learning events: {str(e)}"
        )


@router.get("/users/me/mastery/{skill_id}")
async def get_skill_mastery(
    skill_id: str,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get detailed mastery data for a specific skill.
    
    Args:
        skill_id: Skill/topic ID
        user_id: Authenticated user ID
        db: Database client
        
    Returns:
        Detailed mastery record
    """
    try:
        bkt_service = BKTService(db)
        mastery = await bkt_service.get_user_mastery(user_id, skill_id)
        
        if not mastery:
            # Initialize if doesn't exist
            mastery = await bkt_service.initialize_skill_mastery(user_id, skill_id)
        
        return mastery
        
    except Exception as e:
        print(f"Error getting skill mastery: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve skill mastery: {str(e)}"
        )


@router.get("/users/me/mastery")
async def get_all_masteries(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get all mastery records for current user.
    
    Args:
        user_id: Authenticated user ID
        db: Database client
        
    Returns:
        List of all skill masteries
    """
    try:
        bkt_service = BKTService(db)
        masteries = await bkt_service.get_all_user_masteries(user_id)
        
        return {
            "masteries": masteries,
            "total_count": len(masteries)
        }
        
    except Exception as e:
        print(f"Error getting all masteries: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve masteries: {str(e)}"
        )

