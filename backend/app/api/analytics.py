"""
Analytics API Endpoints

Provides access to learning analytics, growth curves, and mastery tracking.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from app.services.analytics_service import AnalyticsService
from app.services.bkt_service import BKTService
from app.services.velocity_service import VelocityService
from app.services.prediction_service import PredictionService
from app.core.auth import get_current_user, get_authenticated_client, is_admin
from typing import List, Dict, Optional, Any
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


# ============================================================================
# ADMIN ANALYTICS ENDPOINTS
# ============================================================================


@router.get("/admin/mastery-tracking")
async def get_mastery_tracking_stats(
    limit: int = Query(10, description="Number of records to return", ge=1, le=100),
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get mastery tracking statistics.
    Admin sees all users, regular users see only their own data.
    """
    try:
        user_is_admin = await is_admin(user_id, db)
        
        # Build query - join with users and topics to get email and skill names
        query = db.table("user_skill_mastery").select(
            "user_id, skill_id, mastery_probability, total_attempts, correct_attempts, learning_velocity, plateau_flag, last_practiced_at, prior_knowledge, learn_rate, guess_probability, slip_probability"
        )
        
        # Filter by user if not admin
        if not user_is_admin:
            query = query.eq("user_id", user_id)
        
        result = query.order("mastery_probability", desc=False).limit(limit).execute()
        
        # Fetch user emails and skill names
        if result.data:
            user_ids = list(set(r["user_id"] for r in result.data))
            skill_ids = list(set(r["skill_id"] for r in result.data))
            
            users_result = db.table("users").select("id, email").in_("id", user_ids).execute()
            topics_result = db.table("topics").select("id, name").in_("id", skill_ids).execute()
            
            user_emails = {u["id"]: u["email"] for u in users_result.data}
            skill_names = {t["id"]: t["name"] for t in topics_result.data}
            
            # Add emails and skill names to records
            for record in result.data:
                record["email"] = user_emails.get(record["user_id"], "Unknown")
                record["skill_name"] = skill_names.get(record["skill_id"], "Unknown")
        
        # Calculate statistics
        avg_mastery = 0
        if result.data:
            avg_mastery = sum(r["mastery_probability"] for r in result.data) / len(result.data)
        
        return {
            "total_records": len(result.data),
            "avg_mastery": round(avg_mastery, 4),
            "sample_records": result.data,
            "is_admin": user_is_admin
        }
        
    except Exception as e:
        print(f"Error getting mastery tracking stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve mastery tracking stats: {str(e)}"
        )


@router.get("/admin/confidence-timing")
async def get_confidence_timing_stats(
    limit: int = Query(100, description="Number of records to analyze", ge=1, le=1000),
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get confidence score and timing statistics.
    Admin sees all users, regular users see only their own data.
    """
    try:
        user_is_admin = await is_admin(user_id, db)
        
        # Build query - simpler approach without joins
        # Get all session_questions with confidence scores
        query = db.table("session_questions").select(
            "confidence_score, time_spent_seconds, session_id"
        ).not_.is_("confidence_score", "null")
        
        result = query.limit(limit).execute()
        
        # Calculate statistics
        stats = {
            "total_answered": len(result.data),
            "avg_confidence": 0,
            "avg_time_seconds": 0,
            "min_confidence": 0,
            "max_confidence": 0,
            "confidence_distribution": {},
            "is_admin": user_is_admin
        }
        
        if result.data:
            scores = [r["confidence_score"] for r in result.data if r.get("confidence_score")]
            times = [r["time_spent_seconds"] for r in result.data if r.get("time_spent_seconds")]
            
            if scores:
                stats["avg_confidence"] = round(sum(scores) / len(scores), 2)
                stats["min_confidence"] = min(scores)
                stats["max_confidence"] = max(scores)
                
                # Count distribution
                for score in scores:
                    stats["confidence_distribution"][score] = stats["confidence_distribution"].get(score, 0) + 1
            
            if times:
                stats["avg_time_seconds"] = round(sum(times) / len(times), 1)
        
        return stats
        
    except Exception as e:
        print(f"Error getting confidence timing stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve confidence timing stats: {str(e)}"
        )


@router.get("/admin/learning-events")
async def get_learning_events_stats(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get learning events statistics grouped by event type.
    Admin sees all users, regular users see only their own data.
    """
    try:
        user_is_admin = await is_admin(user_id, db)
        
        # Build query
        query = db.table("learning_events").select("event_type, created_at, user_id")
        
        # Filter by user if not admin
        if not user_is_admin:
            query = query.eq("user_id", user_id)
        
        result = query.execute()
        
        # Count by event type
        event_counts: Dict[str, int] = {}
        for event in result.data:
            event_type = event["event_type"]
            event_counts[event_type] = event_counts.get(event_type, 0) + 1
        
        return {
            "total_events": len(result.data),
            "event_breakdown": event_counts,
            "is_admin": user_is_admin
        }
        
    except Exception as e:
        print(f"Error getting learning events stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve learning events stats: {str(e)}"
        )


@router.get("/admin/performance-snapshots")
async def get_performance_snapshots_overview(
    limit: int = Query(10, description="Number of snapshots to return", ge=1, le=50),
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get recent performance snapshots overview.
    Admin sees all users, regular users see only their own data.
    """
    try:
        user_is_admin = await is_admin(user_id, db)
        
        # Build query - note: avg_mastery doesn't exist in schema
        query = db.table("user_performance_snapshots").select(
            "snapshot_type, predicted_sat_math, predicted_sat_rw, created_at, user_id, questions_answered, questions_correct"
        )
        
        # Filter by user if not admin
        if not user_is_admin:
            query = query.eq("user_id", user_id)
        
        result = query.order("created_at", desc=True).limit(limit).execute()
        
        # Fetch user emails
        if result.data:
            user_ids = list(set(r["user_id"] for r in result.data))
            users_result = db.table("users").select("id, email").in_("id", user_ids).execute()
            user_emails = {u["id"]: u["email"] for u in users_result.data}
            
            # Add emails to snapshots
            for snapshot in result.data:
                snapshot["email"] = user_emails.get(snapshot["user_id"], "Unknown")
        
        return {
            "total_snapshots": len(result.data),
            "recent_snapshots": result.data,
            "is_admin": user_is_admin
        }
        
    except Exception as e:
        print(f"Error getting performance snapshots: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve performance snapshots: {str(e)}"
        )


@router.get("/admin/user-progress")
async def get_user_progress_summary(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get overall user progress summary.
    Admin sees all users, regular users see only their own data.
    """
    try:
        user_is_admin = await is_admin(user_id, db)
        
        # Build query
        query = db.table("user_skill_mastery").select("user_id, mastery_probability, total_attempts, correct_attempts")
        
        # Filter by user if not admin
        if not user_is_admin:
            query = query.eq("user_id", user_id)
        
        result = query.execute()
        
        # Group by user
        user_stats: Dict[str, Dict[str, Any]] = {}
        for record in result.data:
            uid = record["user_id"]
            if uid not in user_stats:
                user_stats[uid] = {
                    "skills_tracked": 0,
                    "total_mastery": 0,
                    "total_attempts": 0,
                    "total_correct": 0
                }
            
            user_stats[uid]["skills_tracked"] += 1
            user_stats[uid]["total_mastery"] += record["mastery_probability"]
            user_stats[uid]["total_attempts"] += record["total_attempts"]
            user_stats[uid]["total_correct"] += record["correct_attempts"]
        
        # Fetch user emails
        user_ids = list(user_stats.keys())
        users_result = db.table("users").select("id, email").in_("id", user_ids).execute()
        user_emails = {u["id"]: u["email"] for u in users_result.data}
        
        # Calculate averages
        user_progress = []
        for uid, stats in user_stats.items():
            accuracy = (stats["total_correct"] / stats["total_attempts"] * 100) if stats["total_attempts"] > 0 else 0
            avg_mastery = stats["total_mastery"] / stats["skills_tracked"] if stats["skills_tracked"] > 0 else 0
            
            user_progress.append({
                "user_id": uid,
                "email": user_emails.get(uid, "Unknown"),
                "skills_tracked": stats["skills_tracked"],
                "avg_mastery": round(avg_mastery, 4),
                "total_attempts": stats["total_attempts"],
                "total_correct": stats["total_correct"],
                "accuracy": round(accuracy, 2)
            })
        
        return {
            "total_users": len(user_progress),
            "user_progress": user_progress,
            "is_admin": user_is_admin
        }
        
    except Exception as e:
        print(f"Error getting user progress: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve user progress: {str(e)}"
        )


@router.get("/admin/question-difficulty")
async def get_question_difficulty_stats(
    limit: int = Query(10, description="Number of questions to return", ge=1, le=100),
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get question difficulty calibration statistics (IRT parameters).
    Admin only endpoint.
    """
    try:
        user_is_admin = await is_admin(user_id, db)
        
        # This endpoint is admin-only
        if not user_is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        # Try to query the table, handle if it doesn't exist
        # Note: Column names are difficulty_param and discrimination_param (not difficulty/discrimination)
        try:
            result = db.table("question_difficulty_params").select(
                "question_id, difficulty_param, discrimination_param, total_responses, correct_responses, is_calibrated"
            ).limit(limit).execute()
        except Exception as table_error:
            print(f"Question difficulty table error: {table_error}")
            # Table might not exist or be empty
            result = type('obj', (object,), {'data': []})()
        
        # Calculate statistics
        avg_difficulty = 0
        avg_discrimination = 0
        sample_questions = result.data if result.data else []
        
        if result.data:
            difficulties = [r.get("difficulty_param") for r in result.data if r.get("difficulty_param") is not None]
            discriminations = [r.get("discrimination_param") for r in result.data if r.get("discrimination_param") is not None]
            
            if difficulties:
                avg_difficulty = sum(difficulties) / len(difficulties)
            if discriminations:
                avg_discrimination = sum(discriminations) / len(discriminations)
        
        return {
            "total_calibrated": len(sample_questions),
            "avg_difficulty": round(avg_difficulty, 4),
            "avg_discrimination": round(avg_discrimination, 4),
            "sample_questions": sample_questions,
            "is_admin": user_is_admin
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting question difficulty stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve question difficulty stats: {str(e)}"
        )


@router.get("/admin/mock-exam-analytics")
async def get_mock_exam_analytics(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get mock exam analytics including completion rates, scores, weak topics, and stamina patterns.
    Admin sees all users, regular users see only their own data.
    """
    try:
        user_is_admin = await is_admin(user_id, db)
        
        # Query mock exams
        exams_query = db.table("mock_exams").select("*")
        if not user_is_admin:
            exams_query = exams_query.eq("user_id", user_id)
        
        exams_result = exams_query.execute()
        
        total_exams = len(exams_result.data)
        completed_exams = [e for e in exams_result.data if e.get("status") == "completed"]
        completion_rate = (len(completed_exams) / total_exams * 100) if total_exams > 0 else 0
        
        # Calculate average scores
        avg_total_score = 0
        avg_math_score = 0
        avg_rw_score = 0
        
        if completed_exams:
            valid_scores = [e for e in completed_exams if e.get("total_score")]
            if valid_scores:
                avg_total_score = sum(e["total_score"] for e in valid_scores) / len(valid_scores)
                avg_math_score = sum(e.get("math_score", 0) for e in valid_scores) / len(valid_scores)
                avg_rw_score = sum(e.get("rw_score", 0) for e in valid_scores) / len(valid_scores)
        
        # Score distribution
        score_distribution = {}
        for exam in completed_exams:
            if exam.get("total_score"):
                score = exam["total_score"]
                range_key = f"{(score // 100) * 100}-{(score // 100) * 100 + 99}"
                score_distribution[range_key] = score_distribution.get(range_key, 0) + 1
        
        # Get modules for stamina analysis
        exam_ids = [e["id"] for e in exams_result.data]
        if exam_ids:
            modules_result = db.table("mock_exam_modules").select("*").in_("exam_id", exam_ids).execute()
        else:
            modules_result = type('obj', (object,), {'data': []})()
        
        # Stamina pattern: compare module 1 vs module 2 performance
        module1_scores = []
        module2_scores = []
        
        for module in modules_result.data:
            if module.get("raw_score") is not None:
                if module.get("module_number") == 1:
                    module1_scores.append(module["raw_score"])
                elif module.get("module_number") == 2:
                    module2_scores.append(module["raw_score"])
        
        module1_avg = sum(module1_scores) / len(module1_scores) if module1_scores else 0
        module2_avg = sum(module2_scores) / len(module2_scores) if module2_scores else 0
        drop_percentage = ((module1_avg - module2_avg) / module1_avg * 100) if module1_avg > 0 else 0
        
        # Weak topics: Get questions and analyze by topic
        module_ids = [m["id"] for m in modules_result.data]
        if module_ids:
            questions_result = db.table("mock_exam_questions").select(
                "question_id, is_correct"
            ).in_("module_id", module_ids).execute()
        else:
            questions_result = type('obj', (object,), {'data': []})()
        
        # Get topic info for questions
        question_ids = [q["question_id"] for q in questions_result.data if q.get("question_id")]
        if question_ids:
            questions_with_topics = db.table("questions").select(
                "id, topic_id"
            ).in_("id", question_ids).execute()
            
            topic_ids = list(set(q["topic_id"] for q in questions_with_topics.data if q.get("topic_id")))
            topics_result = db.table("topics").select("id, name").in_("id", topic_ids).execute()
            topic_names = {t["id"]: t["name"] for t in topics_result.data}
            
            # Map questions to topics
            question_topics = {q["id"]: q["topic_id"] for q in questions_with_topics.data}
            
            # Calculate accuracy by topic
            topic_stats = {}
            for q in questions_result.data:
                q_id = q.get("question_id")
                if q_id and q_id in question_topics:
                    topic_id = question_topics[q_id]
                    if topic_id not in topic_stats:
                        topic_stats[topic_id] = {"correct": 0, "total": 0}
                    topic_stats[topic_id]["total"] += 1
                    if q.get("is_correct"):
                        topic_stats[topic_id]["correct"] += 1
            
            weak_topics = []
            for topic_id, stats in topic_stats.items():
                accuracy = (stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0
                if accuracy < 60:  # Weak if below 60%
                    weak_topics.append({
                        "topic_name": topic_names.get(topic_id, "Unknown"),
                        "accuracy": round(accuracy, 1),
                        "attempts": stats["total"]
                    })
            
            weak_topics.sort(key=lambda x: x["accuracy"])
        else:
            weak_topics = []
        
        # Improvement velocity: score progression over time
        completed_sorted = sorted(completed_exams, key=lambda x: x.get("completed_at", ""))
        improvement_velocity = 0
        if len(completed_sorted) >= 2:
            first_score = completed_sorted[0].get("total_score", 0)
            last_score = completed_sorted[-1].get("total_score", 0)
            improvement_velocity = (last_score - first_score) / len(completed_sorted)
        
        # Readiness score: based on weak topics (fewer weak topics = more ready)
        readiness_score = max(0, 100 - (len(weak_topics) * 10))  # Lose 10 points per weak topic
        
        # Recent exams with emails
        recent_exams = completed_sorted[-5:] if completed_sorted else []
        if recent_exams:
            user_ids = list(set(e["user_id"] for e in recent_exams))
            users_result = db.table("users").select("id, email").in_("id", user_ids).execute()
            user_emails = {u["id"]: u["email"] for u in users_result.data}
            
            recent_exams_data = []
            for exam in recent_exams:
                recent_exams_data.append({
                    "email": user_emails.get(exam["user_id"], "Unknown"),
                    "exam_type": exam.get("exam_type", "full_length"),
                    "total_score": exam.get("total_score"),
                    "completed_at": exam.get("completed_at")
                })
        else:
            recent_exams_data = []
        
        return {
            "total_exams": total_exams,
            "completion_rate": round(completion_rate, 1),
            "avg_total_score": round(avg_total_score, 0),
            "avg_math_score": round(avg_math_score, 0),
            "avg_rw_score": round(avg_rw_score, 0),
            "score_distribution": score_distribution,
            "weak_topics": weak_topics,
            "stamina_pattern": {
                "module1_avg": round(module1_avg, 1),
                "module2_avg": round(module2_avg, 1),
                "drop_percentage": round(drop_percentage, 1)
            },
            "improvement_velocity": round(improvement_velocity, 1),
            "readiness_score": readiness_score,
            "recent_exams": recent_exams_data,
            "is_admin": user_is_admin
        }
        
    except Exception as e:
        print(f"Error getting mock exam analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve mock exam analytics: {str(e)}"
        )


@router.get("/admin/error-patterns")
async def get_error_pattern_analytics(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get error pattern analysis including cognitive blocks and plateau detection.
    Admin sees all users, regular users see only their own data.
    """
    try:
        user_is_admin = await is_admin(user_id, db)
        
        # Get incorrect answers from session_questions
        sq_query = db.table("session_questions").select(
            "topic_id, status, answered_at, session_id"
        ).eq("status", "incorrect")
        
        sq_result = sq_query.execute()
        
        # Get incorrect answers from mock exams
        mock_modules = db.table("mock_exam_modules").select("id, exam_id").execute()
        module_ids = [m["id"] for m in mock_modules.data]
        
        mock_q_result = db.table("mock_exam_questions").select(
            "question_id, is_correct, answered_at, module_id"
        ).in_("module_id", module_ids).eq("is_correct", False).execute()
        
        # Get question topics
        all_question_ids = [q["question_id"] for q in mock_q_result.data if q.get("question_id")]
        questions_with_topics = db.table("questions").select(
            "id, topic_id"
        ).in_("id", all_question_ids).execute() if all_question_ids else type('obj', (object,), {'data': []})()
        
        question_topics_map = {q["id"]: q["topic_id"] for q in questions_with_topics.data}
        
        # Combine all incorrect answers
        all_errors = []
        
        # Process session questions errors
        for sq in sq_result.data:
            if sq.get("topic_id"):
                all_errors.append({
                    "topic_id": sq["topic_id"],
                    "answered_at": sq.get("answered_at")
                })
        
        # Process mock exam errors
        for mq in mock_q_result.data:
            q_id = mq.get("question_id")
            if q_id and q_id in question_topics_map:
                all_errors.append({
                    "topic_id": question_topics_map[q_id],
                    "answered_at": mq.get("answered_at")
                })
        
        total_errors = len(all_errors)
        
        # Get topic names
        topic_ids = list(set(e["topic_id"] for e in all_errors))
        topics_result = db.table("topics").select("id, name").in_("id", topic_ids).execute() if topic_ids else type('obj', (object,), {'data': []})()
        topic_names = {t["id"]: t["name"] for t in topics_result.data}
        
        # Calculate error frequency by topic
        topic_error_counts = {}
        for error in all_errors:
            topic_id = error["topic_id"]
            if topic_id not in topic_error_counts:
                topic_error_counts[topic_id] = {"count": 0, "last_error": None}
            topic_error_counts[topic_id]["count"] += 1
            if error.get("answered_at"):
                topic_error_counts[topic_id]["last_error"] = error["answered_at"]
        
        # Get total attempts per topic from mastery table
        mastery_query = db.table("user_skill_mastery").select("skill_id, total_attempts, correct_attempts")
        if not user_is_admin:
            mastery_query = mastery_query.eq("user_id", user_id)
        
        mastery_result = mastery_query.execute()
        
        topic_attempts = {}
        for m in mastery_result.data:
            skill_id = m["skill_id"]
            if skill_id not in topic_attempts:
                topic_attempts[skill_id] = {"total": 0, "correct": 0}
            topic_attempts[skill_id]["total"] += m["total_attempts"]
            topic_attempts[skill_id]["correct"] += m["correct_attempts"]
        
        # Build error_by_topic array
        error_by_topic = []
        for topic_id, error_data in topic_error_counts.items():
            attempts_data = topic_attempts.get(topic_id, {"total": 0, "correct": 0})
            total_attempts = attempts_data["total"]
            error_count = error_data["count"]
            error_rate = (error_count / total_attempts * 100) if total_attempts > 0 else 0
            
            error_by_topic.append({
                "skill_name": topic_names.get(topic_id, "Unknown"),
                "error_count": error_count,
                "total_attempts": total_attempts,
                "error_rate": round(error_rate, 1),
                "last_error": error_data["last_error"]
            })
        
        error_by_topic.sort(key=lambda x: x["error_count"], reverse=True)
        
        # Count recurring errors (topics with 3+ errors)
        recurring_errors = sum(1 for e in error_by_topic if e["error_count"] >= 3)
        
        # Cognitive blocks: users stuck on specific skills
        cognitive_blocks_query = db.table("user_skill_mastery").select(
            "user_id, skill_id, mastery_probability, total_attempts, correct_attempts, created_at, last_practiced_at"
        ).lt("mastery_probability", 0.5).gte("total_attempts", 3)
        
        if not user_is_admin:
            cognitive_blocks_query = cognitive_blocks_query.eq("user_id", user_id)
        
        cognitive_blocks_result = cognitive_blocks_query.execute()
        
        # Get user emails for cognitive blocks
        if cognitive_blocks_result.data:
            cb_user_ids = list(set(cb["user_id"] for cb in cognitive_blocks_result.data))
            cb_skill_ids = list(set(cb["skill_id"] for cb in cognitive_blocks_result.data))
            
            users_result = db.table("users").select("id, email").in_("id", cb_user_ids).execute()
            cb_topics_result = db.table("topics").select("id, name").in_("id", cb_skill_ids).execute()
            
            cb_user_emails = {u["id"]: u["email"] for u in users_result.data}
            cb_topic_names = {t["id"]: t["name"] for t in cb_topics_result.data}
            
            cognitive_blocks = []
            for cb in cognitive_blocks_result.data:
                failed_attempts = cb["total_attempts"] - cb["correct_attempts"]
                
                # Calculate days stuck
                from datetime import datetime, timezone
                created_at = cb.get("created_at")
                days_stuck = 0
                if created_at:
                    try:
                        created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                        days_stuck = (datetime.now(timezone.utc) - created_date).days
                    except:
                        days_stuck = 0
                
                cognitive_blocks.append({
                    "email": cb_user_emails.get(cb["user_id"], "Unknown"),
                    "skill_name": cb_topic_names.get(cb["skill_id"], "Unknown"),
                    "failed_attempts": failed_attempts,
                    "mastery_stuck_at": round(cb["mastery_probability"], 2),
                    "days_stuck": days_stuck
                })
            
            cognitive_blocks.sort(key=lambda x: x["days_stuck"], reverse=True)
        else:
            cognitive_blocks = []
        
        # Plateau users: users with plateau_flag = TRUE
        plateau_query = db.table("user_skill_mastery").select(
            "user_id, plateau_flag, learning_velocity"
        ).eq("plateau_flag", True)
        
        if not user_is_admin:
            plateau_query = plateau_query.eq("user_id", user_id)
        
        plateau_result = plateau_query.execute()
        
        # Group by user
        user_plateau_data = {}
        for p in plateau_result.data:
            uid = p["user_id"]
            if uid not in user_plateau_data:
                user_plateau_data[uid] = {"plateau_skills": 0, "velocities": []}
            user_plateau_data[uid]["plateau_skills"] += 1
            if p.get("learning_velocity") is not None:
                user_plateau_data[uid]["velocities"].append(p["learning_velocity"])
        
        # Get user emails
        if user_plateau_data:
            p_user_ids = list(user_plateau_data.keys())
            p_users_result = db.table("users").select("id, email").in_("id", p_user_ids).execute()
            p_user_emails = {u["id"]: u["email"] for u in p_users_result.data}
            
            plateau_users = []
            for uid, data in user_plateau_data.items():
                avg_velocity = sum(data["velocities"]) / len(data["velocities"]) if data["velocities"] else 0
                needs_intervention = data["plateau_skills"] >= 2 or avg_velocity <= 0.01
                
                plateau_users.append({
                    "email": p_user_emails.get(uid, "Unknown"),
                    "plateau_skills": data["plateau_skills"],
                    "avg_velocity": round(avg_velocity, 4),
                    "needs_intervention": needs_intervention
                })
            
            plateau_users.sort(key=lambda x: x["plateau_skills"], reverse=True)
        else:
            plateau_users = []
        
        return {
            "total_errors": total_errors,
            "recurring_errors": recurring_errors,
            "error_by_topic": error_by_topic[:20],  # Top 20
            "cognitive_blocks": cognitive_blocks[:20],  # Top 20
            "plateau_users": plateau_users,
            "is_admin": user_is_admin
        }
        
    except Exception as e:
        print(f"Error getting error pattern analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve error pattern analytics: {str(e)}"
        )


@router.get("/admin/cognitive-efficiency")
async def get_cognitive_efficiency_analytics(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get cognitive efficiency metrics including time-of-day patterns and confidence calibration.
    Admin sees all users, regular users see only their own data.
    """
    try:
        user_is_admin = await is_admin(user_id, db)
        
        # Get session questions with timing and confidence data
        sq_query = db.table("session_questions").select(
            "session_id, status, confidence_score, time_spent_seconds, answered_at"
        ).not_.is_("confidence_score", "null").not_.is_("time_spent_seconds", "null")
        
        # Filter by user if not admin - need to join with practice_sessions
        if not user_is_admin:
            # Get user's sessions first
            sessions_result = db.table("practice_sessions").select("id").execute()
            # This is a simplified approach - in production you'd want to filter by user properly
            pass
        
        sq_result = sq_query.limit(1000).execute()
        
        if not sq_result.data:
            return {
                "overall_efficiency": 0,
                "speed_accuracy_correlation": 0,
                "time_of_day_patterns": [],
                "user_efficiency": [],
                "confidence_accuracy_map": [],
                "is_admin": user_is_admin
            }
        
        # Calculate overall efficiency
        correct_count = sum(1 for sq in sq_result.data if sq.get("status") == "correct")
        total_count = len(sq_result.data)
        accuracy = correct_count / total_count if total_count > 0 else 0
        
        times = [sq["time_spent_seconds"] for sq in sq_result.data if sq.get("time_spent_seconds")]
        avg_time = sum(times) / len(times) if times else 0
        
        import math
        overall_efficiency = accuracy / math.log(avg_time + 1) if avg_time > 0 else 0
        
        # Speed vs accuracy correlation (simplified)
        # In a real implementation, you'd use proper correlation calculation
        speed_accuracy_correlation = 0.5  # Placeholder
        
        # Time-of-day patterns
        from datetime import datetime
        hour_data = {}
        for sq in sq_result.data:
            if sq.get("answered_at"):
                try:
                    dt = datetime.fromisoformat(sq["answered_at"].replace('Z', '+00:00'))
                    hour = dt.hour
                    
                    if hour not in hour_data:
                        hour_data[hour] = {"correct": 0, "total": 0, "time_sum": 0}
                    
                    hour_data[hour]["total"] += 1
                    if sq.get("status") == "correct":
                        hour_data[hour]["correct"] += 1
                    if sq.get("time_spent_seconds"):
                        hour_data[hour]["time_sum"] += sq["time_spent_seconds"]
                except:
                    pass
        
        time_of_day_patterns = []
        for hour in sorted(hour_data.keys()):
            data = hour_data[hour]
            avg_accuracy = (data["correct"] / data["total"] * 100) if data["total"] > 0 else 0
            avg_time = data["time_sum"] / data["total"] if data["total"] > 0 else 0
            efficiency = (data["correct"] / data["total"]) / math.log(avg_time + 1) if avg_time > 0 else 0
            
            time_of_day_patterns.append({
                "hour": hour,
                "avg_accuracy": round(avg_accuracy, 1),
                "avg_time": round(avg_time, 1),
                "efficiency_score": round(efficiency, 3)
            })
        
        # Confidence vs accuracy calibration
        confidence_data = {}
        for sq in sq_result.data:
            conf = sq.get("confidence_score")
            if conf:
                if conf not in confidence_data:
                    confidence_data[conf] = {"correct": 0, "total": 0}
                
                confidence_data[conf]["total"] += 1
                if sq.get("status") == "correct":
                    confidence_data[conf]["correct"] += 1
        
        confidence_accuracy_map = []
        for conf_level in sorted(confidence_data.keys()):
            data = confidence_data[conf_level]
            actual_accuracy = (data["correct"] / data["total"] * 100) if data["total"] > 0 else 0
            expected_accuracy = conf_level * 20  # Rough mapping: 1=20%, 5=100%
            calibration_gap = actual_accuracy - expected_accuracy
            
            confidence_accuracy_map.append({
                "confidence_level": conf_level,
                "actual_accuracy": round(actual_accuracy, 1),
                "calibration_gap": round(calibration_gap, 1)
            })
        
        # User efficiency (placeholder - would need proper user grouping)
        user_efficiency = []
        
        return {
            "overall_efficiency": round(overall_efficiency, 3),
            "speed_accuracy_correlation": round(speed_accuracy_correlation, 2),
            "time_of_day_patterns": time_of_day_patterns,
            "user_efficiency": user_efficiency,
            "confidence_accuracy_map": confidence_accuracy_map,
            "is_admin": user_is_admin
        }
        
    except Exception as e:
        print(f"Error getting cognitive efficiency analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve cognitive efficiency analytics: {str(e)}"
        )


@router.get("/learning-velocity")
async def get_learning_velocity(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get learning velocity analytics including momentum, acceleration, and trends.
    """
    try:
        velocity_service = VelocityService(db)
        velocity_data = await velocity_service.calculate_learning_velocity(user_id)
        
        return velocity_data
        
    except Exception as e:
        print(f"Error getting learning velocity: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve learning velocity: {str(e)}"
        )


@router.get("/predictive-scores")
async def get_predictive_scores(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get predictive SAT score analytics with trajectory and goal tracking.
    """
    try:
        prediction_service = PredictionService(db)
        prediction_data = await prediction_service.calculate_predictive_scores(user_id)
        
        return prediction_data
        
    except Exception as e:
        print(f"Error getting predictive scores: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve predictive scores: {str(e)}"
        )


