from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from uuid import UUID
import random
from app.db import get_db

from app.models.study_plan import (
    SessionQuestionsResponse,
    SubmitAnswerResponse,
    AIFeedbackResponse,
    AIFeedbackRequest,
    AIFeedbackContent,
    SessionSummaryResponse,
    SessionSummaryContent,
)
from datetime import datetime
from app.services.practice_session_service import PracticeSessionService
from app.services.answer_validation_service import AnswerValidationService
from app.services.openai_service import openai_service
from app.services.bkt_service import BKTService
from app.services.analytics_service import AnalyticsService
from app.core.auth import get_current_user, get_authenticated_client


router = APIRouter(prefix="/practice-sessions", tags=["practice-sessions"])


class SubmitAnswerRequest(BaseModel):
    user_answer: List[str]
    status: str = "answered"
    confidence_score: Optional[int] = None  # 1-5 rating
    time_spent_seconds: Optional[int] = None


class CreateDrillSessionRequest(BaseModel):
    topic_ids: List[str]  # List of topic IDs to create drill from (max 5)
    questions_per_topic: int = 3  # Questions per topic (default 3)


class CreateAISessionRequest(BaseModel):
    prompt: str  # Natural-language description of desired practice


@router.get("/{session_id}/questions", response_model=SessionQuestionsResponse)
async def get_session_questions(
    session_id: str,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get all questions for a specific practice session.

    Args:
        session_id: Practice session ID
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Session questions with full question details
    """
    try:
        # Verify session belongs to user's study plan
        service = PracticeSessionService(db)
        service.verify_session_ownership(session_id, user_id)

        # Fetch session without nested study_plans
        session_response = db.table("practice_sessions").select("*").eq("id", session_id).execute()
        session = session_response.data[0]
        session["topics"] = []

        # Fetch all questions for the session
        # Try with is_flagged first, fall back if column doesn't exist yet
        try:
            questions_response = db.table("session_questions").select(
                "id, session_id, question_id, topic_id, display_order, status, user_answer, is_saved, "
                "questions(id, stimulus, stem, difficulty, question_type, answer_options, correct_answer, rationale, is_flagged), "
                "topics(id, name, category_id, weight_in_category)"
            ).eq("session_id", session_id).order("display_order").execute()
        except Exception as e:
            # If is_flagged column doesn't exist yet, query without it
            if "is_flagged" in str(e) or "column" in str(e).lower():
                questions_response = db.table("session_questions").select(
                    "id, session_id, question_id, topic_id, display_order, status, user_answer, is_saved, "
                    "questions(id, stimulus, stem, difficulty, question_type, answer_options, correct_answer, rationale), "
                    "topics(id, name, category_id, weight_in_category)"
                ).eq("session_id", session_id).order("display_order").execute()
            else:
                raise

        questions = []
        for sq in questions_response.data:
            question_data = sq["questions"]
            # Ensure is_flagged exists in question data (default to False if not present)
            if "is_flagged" not in question_data:
                question_data["is_flagged"] = False
            
            questions.append({
                "session_question_id": sq["id"],
                "question": question_data,
                "topic": sq["topics"],
                "status": sq["status"],
                "display_order": sq["display_order"],
                "user_answer": sq.get("user_answer"),
                "is_saved": sq.get("is_saved", False)
            })

        return {
            "session": session,
            "questions": questions,
            "total_questions": len(questions)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve session questions: {str(e)}"
        )


@router.patch("/{session_id}/questions/{question_id}", response_model=SubmitAnswerResponse)
async def submit_answer(
    session_id: str,
    question_id: str,
    answer_data: SubmitAnswerRequest,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Submit an answer for a question in a practice session.

    Args:
        session_id: Practice session ID
        question_id: Question ID
        answer_data: User's answer and status
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Answer correctness and correct answer
    """
    try:
        # Verify session belongs to user
        service = PracticeSessionService(db)
        service.verify_session_ownership(session_id, user_id)

        # Get the session_question record and the actual question
        sq_response = db.table("session_questions").select(
            "*, questions(correct_answer, acceptable_answers)"
        ).eq("session_id", session_id).eq("question_id", question_id).execute()

        if not sq_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found in this session"
            )

        sq = sq_response.data[0]
        question = sq["questions"]

        # Check if answer is correct using validation service
        correct_answer = question.get("correct_answer", [])
        acceptable_answers = question.get("acceptable_answers", [])
        user_answer = answer_data.user_answer

        is_correct = AnswerValidationService.validate_answer(
            user_answer, correct_answer, acceptable_answers
        )

        # Update session_question record with new tracking data
        update_data = {
            "status": answer_data.status,
            "answered_at": "now()",
            "user_answer": user_answer,
            "is_correct": is_correct,
            "confidence_score": answer_data.confidence_score,
            "time_spent_seconds": answer_data.time_spent_seconds
        }

        db.table("session_questions").update(update_data).eq(
            "id", sq["id"]
        ).execute()
        
        # Update BKT mastery for this skill
        mastery_update = None
        topic_id = sq.get("topic_id")
        
        if topic_id:
            try:
                bkt_service = BKTService(db)
                mastery_update = await bkt_service.update_mastery(
                    user_id=user_id,
                    skill_id=topic_id,
                    is_correct=is_correct,
                    time_spent_seconds=answer_data.time_spent_seconds,
                    confidence_score=answer_data.confidence_score
                )
            except Exception as e:
                print(f"Error updating BKT mastery: {e}")
                # Don't fail the whole request if BKT update fails

        return {
            "is_correct": is_correct,
            "correct_answer": correct_answer,
            "question_id": question_id,
            "junction_question_id": sq["id"],
            "mastery_update": mastery_update
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit answer: {str(e)}"
        )


@router.get("/{session_id}/questions/{question_id}/feedback", response_model=AIFeedbackResponse)
async def get_question_feedback(
    session_id: str,
    question_id: str,
    regenerate: bool = False,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get or generate AI feedback for a specific question.

    Args:
        session_id: Practice session ID
        question_id: Question ID
        regenerate: Force regeneration even if cached (default: False)
        user_id: User ID from authentication token
        db: Database client

    Returns:
        AI-generated feedback for the question
    """
    try:
        # Verify session belongs to user
        service = PracticeSessionService(db)
        service.verify_session_ownership(session_id, user_id)

        # Check cache first (unless regenerate is True)
        if not regenerate:
            cached_feedback = db.table("ai_feedback").select("*").eq(
                "session_question_id",
                db.table("session_questions").select("id").eq("session_id", session_id).eq("question_id", question_id).execute().data[0]["id"]
            ).eq("user_id", user_id).eq("feedback_type", "both").execute()

            if cached_feedback.data:
                return AIFeedbackResponse(
                    session_question_id=UUID(cached_feedback.data[0]["session_question_id"]),
                    question_id=UUID(question_id),
                    feedback=AIFeedbackContent(**cached_feedback.data[0]["feedback_content"]),
                    is_cached=True
                )

        # Get session question with all details
        sq_response = db.table("session_questions").select(
            "*, questions(id, stem, question_type, correct_answer, rationale), topics(name)"
        ).eq("session_id", session_id).eq("question_id", question_id).execute()

        if not sq_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found in this session"
            )

        sq = sq_response.data[0]
        question = sq["questions"]
        topic = sq["topics"]

        # Check if question has been answered
        if not sq.get("user_answer") or sq["status"] != "answered":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot generate feedback for unanswered questions"
            )

        # Get user's performance on this topic
        performance_context = service.get_topic_performance(sq["topic_id"], user_id)

        # Determine if answer is correct
        user_answer = sq["user_answer"] or []
        correct_answer = question["correct_answer"] or []
        is_correct = sorted(user_answer) == sorted(correct_answer)

        # Generate feedback using OpenAI
        feedback_dict = await openai_service.generate_answer_feedback(
            question_stem=question["stem"],
            question_type=question["question_type"],
            correct_answer=correct_answer,
            user_answer=user_answer,
            is_correct=is_correct,
            rationale=question.get("rationale"),
            topic_name=topic["name"],
            user_performance_context=performance_context
        )

        feedback = AIFeedbackContent(**feedback_dict)

        # Store in cache
        db.table("ai_feedback").upsert({
            "session_question_id": sq["id"],
            "user_id": user_id,
            "feedback_type": "both",
            "feedback_content": feedback_dict,
            "context_used": {
                "performance": performance_context,
                "is_correct": is_correct
            }
        }, on_conflict="session_question_id,user_id,feedback_type").execute()

        return AIFeedbackResponse(
            session_question_id=UUID(sq["id"]),
            question_id=UUID(question_id),
            feedback=feedback,
            is_cached=False
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating feedback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate feedback: {str(e)}"
        )


@router.post("/{session_id}/generate-feedback", response_model=List[AIFeedbackResponse])
async def generate_session_feedback(
    session_id: str,
    request: AIFeedbackRequest,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Generate AI feedback for all or selected questions in a session (batch).

    Args:
        session_id: Practice session ID
        request: Feedback request with optional question IDs
        user_id: User ID from authentication token
        db: Database client

    Returns:
        List of AI-generated feedback for questions
    """
    try:
        # Verify session belongs to user
        service = PracticeSessionService(db)
        service.verify_session_ownership(session_id, user_id)

        # Get all answered questions in session (or specific ones if provided)
        query = db.table("session_questions").select(
            "*, questions(id, stem, question_type, correct_answer, rationale), topics(name)"
        ).eq("session_id", session_id).eq("status", "answered")

        if request.question_ids:
            query = query.in_("question_id", [str(qid) for qid in request.question_ids])

        sq_response = query.execute()

        if not sq_response.data:
            return []

        feedback_responses = []

        for sq in sq_response.data:
            question = sq["questions"]
            topic = sq["topics"]

            # Skip if question or topic is missing (e.g., deleted or orphaned records)
            if not question or not topic:
                print(f"Skipping session question {sq.get('id')} - missing question or topic data")
                continue

            # Skip if no user answer
            if not sq.get("user_answer"):
                continue

            # Check cache first
            cached_feedback = db.table("ai_feedback").select("*").eq(
                "session_question_id", sq["id"]
            ).eq("user_id", user_id).eq("feedback_type", "both").execute()

            if cached_feedback.data:
                feedback_responses.append(AIFeedbackResponse(
                    session_question_id=UUID(sq["id"]),
                    question_id=UUID(question["id"]),
                    feedback=AIFeedbackContent(**cached_feedback.data[0]["feedback_content"]),
                    is_cached=True
                ))
                continue

            # Get user's performance on this topic
            performance_context = service.get_topic_performance(sq["topic_id"], user_id)

            # Determine if answer is correct
            user_answer = sq["user_answer"] or []
            correct_answer = question["correct_answer"] or []
            is_correct = sorted(user_answer) == sorted(correct_answer)

            # Generate feedback using OpenAI
            feedback_dict = await openai_service.generate_answer_feedback(
                question_stem=question["stem"],
                question_type=question["question_type"],
                correct_answer=correct_answer,
                user_answer=user_answer,
                is_correct=is_correct,
                rationale=question.get("rationale"),
                topic_name=topic["name"],
                user_performance_context=performance_context
            )

            feedback = AIFeedbackContent(**feedback_dict)

            # Store in cache
            db.table("ai_feedback").insert({
                "session_question_id": sq["id"],
                "user_id": user_id,
                "feedback_type": "both",
                "feedback_content": feedback_dict,
                "context_used": {
                    "performance": performance_context,
                    "is_correct": is_correct
                }
            }).execute()

            feedback_responses.append(AIFeedbackResponse(
                session_question_id=UUID(sq["id"]),
                question_id=UUID(question["id"]),
                feedback=feedback,
                is_cached=False
            ))

        return feedback_responses

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating session feedback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate session feedback: {str(e)}"
        )


@router.post("/{session_id}/generate-session-summary", response_model=SessionSummaryResponse)
async def generate_session_summary(
    session_id: str,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Generate a holistic AI summary for a completed practice session.
    
    Instead of per-question feedback, this provides:
    - Overall assessment of the session
    - Strengths and weaknesses by topic
    - Speed/pacing analysis
    - Error patterns detected
    - Actionable improvement tips
    
    Args:
        session_id: Practice session ID
        user_id: User ID from authentication token
        db: Database client
    
    Returns:
        Session summary with AI-generated insights
    """
    try:
        # Verify session belongs to user
        service = PracticeSessionService(db)
        service.verify_session_ownership(session_id, user_id)
        
        # Get all session questions with details
        sq_response = db.table("session_questions").select(
            "*, questions(id, stem, question_type, correct_answer, topic_id), topics(id, name)"
        ).eq("session_id", session_id).execute()
        
        if not sq_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No questions found for this session"
            )
        
        # Aggregate stats
        total_questions = len(sq_response.data)
        correct_count = 0
        incorrect_count = 0
        topic_stats = {}  # {topic_name: {correct: 0, total: 0}}
        question_details = []
        time_spent_list = []
        
        for sq in sq_response.data:
            question = sq.get("questions")
            topic = sq.get("topics")
            
            if not question or not topic:
                continue
            
            topic_name = topic.get("name", "Unknown")
            
            # Initialize topic stats
            if topic_name not in topic_stats:
                topic_stats[topic_name] = {"correct": 0, "total": 0}
            
            # Check if answered
            if sq.get("status") == "answered" and sq.get("user_answer"):
                topic_stats[topic_name]["total"] += 1
                
                # Check correctness
                user_answer = sq.get("user_answer") or []
                correct_answer = question.get("correct_answer") or []
                is_correct = sorted(user_answer) == sorted(correct_answer)
                
                if is_correct:
                    correct_count += 1
                    topic_stats[topic_name]["correct"] += 1
                else:
                    incorrect_count += 1
                
                # Track time
                time_spent = sq.get("time_spent_seconds")
                if time_spent:
                    time_spent_list.append(time_spent)
                
                # Question details for pattern detection
                question_details.append({
                    "topic_name": topic_name,
                    "is_correct": is_correct,
                    "time_spent": time_spent,
                    "question_type": question.get("question_type")
                })
        
        # Calculate accuracy
        answered_count = correct_count + incorrect_count
        accuracy = (correct_count / answered_count * 100) if answered_count > 0 else 0
        
        # Format topic performance
        topic_performance = []
        for topic_name, stats in topic_stats.items():
            if stats["total"] > 0:
                topic_performance.append({
                    "topic_name": topic_name,
                    "correct": stats["correct"],
                    "total": stats["total"],
                    "accuracy": stats["correct"] / stats["total"] * 100
                })
        
        # Sort by accuracy ascending (worst first for focus areas)
        topic_performance.sort(key=lambda x: x["accuracy"])
        
        # Speed stats
        speed_stats = {}
        if time_spent_list:
            avg_time = sum(time_spent_list) / len(time_spent_list)
            fast_count = sum(1 for t in time_spent_list if t < 30)
            slow_count = sum(1 for t in time_spent_list if t > 90)
            total_time = sum(time_spent_list)
            
            speed_stats = {
                "avg_time_seconds": avg_time,
                "fast_count": fast_count,
                "slow_count": slow_count,
                "total_time_minutes": total_time / 60
            }
        
        # Get historical performance for comparison
        historical_comparison = {}
        topic_ids = list(set(sq.get("topic_id") for sq in sq_response.data if sq.get("topic_id")))
        
        for topic_id in topic_ids:
            perf = service.get_topic_performance(topic_id, user_id)
            if perf.get("topic_total", 0) > 0:
                # Find topic name
                for sq in sq_response.data:
                    if sq.get("topic_id") == topic_id and sq.get("topics"):
                        topic_name = sq["topics"].get("name", "")
                        if topic_name:
                            historical_comparison[topic_name] = {
                                "historical_accuracy": perf["topic_correct"] / perf["topic_total"] * 100
                            }
                        break
        
        # Prepare stats for OpenAI
        session_stats = {
            "total_questions": total_questions,
            "correct_count": correct_count,
            "incorrect_count": incorrect_count,
            "accuracy": accuracy,
            "topic_performance": topic_performance,
            "speed_stats": speed_stats,
            "historical_comparison": historical_comparison,
            "question_details": question_details
        }
        
        # Generate AI summary
        summary_dict = await openai_service.generate_session_summary(session_stats)
        summary = SessionSummaryContent(**summary_dict)
        
        # Build response stats for frontend display
        display_stats = {
            "total_questions": total_questions,
            "correct_count": correct_count,
            "incorrect_count": incorrect_count,
            "accuracy": round(accuracy, 1),
            "topic_performance": topic_performance,
            "speed_stats": speed_stats
        }
        
        return SessionSummaryResponse(
            session_id=UUID(session_id),
            summary=summary,
            stats=display_stats,
            generated_at=datetime.utcnow()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating session summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate session summary: {str(e)}"
        )


@router.post("/{session_id}/complete")
async def complete_session(
    session_id: str,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Mark session as complete and create performance snapshot.
    
    Args:
        session_id: Practice session ID
        user_id: User ID from authentication token
        db: Database client
        
    Returns:
        Confirmation with snapshot data
    """
    try:
        # Ensure session_id is a clean string
        if isinstance(session_id, dict):
            session_id = session_id.get('id')
        elif isinstance(session_id, str) and session_id.startswith('{') and session_id.endswith('}'):
            # Handle case where a dict was stringified
            try:
                import ast
                parsed_dict = ast.literal_eval(session_id)
                if isinstance(parsed_dict, dict) and 'id' in parsed_dict:
                    session_id = parsed_dict['id']
            except:
                session_id = None
        session_id = str(session_id) if session_id else None
        
        # Verify session belongs to user
        service = PracticeSessionService(db)
        service.verify_session_ownership(session_id, user_id)
        
        # Update session status
        db.table("practice_sessions").update({
            "status": "completed",
            "completed_at": "now()"
        }).eq("id", session_id).execute()
        
        # Create performance snapshot with validated session_id
        analytics_service = AnalyticsService(db)
        
        # Create performance snapshot
        
        snapshot = await analytics_service.create_performance_snapshot(
            user_id=user_id,
            snapshot_type="session_complete",
            related_id=session_id  # Already validated as string
        )
        
        return {
            "success": True,
            "session_id": session_id,
            "snapshot_created": True,
            "predicted_sat_math": snapshot.get("predicted_sat_math"),
            "predicted_sat_rw": snapshot.get("predicted_sat_rw")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error completing session: {str(e)}")
        print(f"Session ID type: {type(session_id)}, value: {session_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete session: {str(e)}"
        )


@router.get("/{session_id}/mastery-improvements")
async def get_session_mastery_improvements(
    session_id: str,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get mastery improvements for topics in this session.
    Compares current mastery with the most recent snapshot before this session.
    
    Returns list of topics with:
    - topic_id, topic_name
    - mastery_before, mastery_after
    - mastery_increase (absolute percentage points)
    - current_percentage (0-100)
    - total_attempts: number of questions in this session for this topic
    - correct_attempts: number of correct answers in this session for this topic
    """
    try:
        # Verify session belongs to user
        service = PracticeSessionService(db)
        service.verify_session_ownership(session_id, user_id)
        
        # Get session details
        session_response = db.table("practice_sessions").select(
            "created_at, status"
        ).eq("id", session_id).execute()
        
        if not session_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        session = session_response.data[0]
        session_created_at = session["created_at"]
        
        # Get most recent snapshot before this session
        snapshot_response = db.table("user_performance_snapshots").select(
            "skills_snapshot, created_at"
        ).eq("user_id", user_id).lt("created_at", session_created_at).order(
            "created_at", desc=True
        ).limit(1).execute()
        
        # Get session questions for stats
        session_questions_response = db.table("session_questions").select(
            "topic_id, is_correct, topics(name)"
        ).eq("session_id", session_id).execute()
        
        if not session_questions_response.data:
            return []
            
        # Aggregate stats per topic for this session
        session_stats = {}
        unique_topics = {}
        
        for sq in session_questions_response.data:
            topic_id = sq["topic_id"]
            if topic_id not in session_stats:
                session_stats[topic_id] = {
                    "total": 0,
                    "correct": 0
                }
                unique_topics[topic_id] = sq["topics"]["name"]
            
            session_stats[topic_id]["total"] += 1
            if sq.get("is_correct"):
                session_stats[topic_id]["correct"] += 1
        
        # Get current mastery for all unique topics
        topic_ids = list(unique_topics.keys())
        current_mastery_response = db.table("user_skill_mastery").select(
            "skill_id, mastery_probability"
        ).eq("user_id", user_id).in_("skill_id", topic_ids).execute()
        
        current_mastery_map = {
            record["skill_id"]: float(record["mastery_probability"])
            for record in current_mastery_response.data
        }
        
        # Get previous mastery from snapshot
        previous_mastery_map = {}
        if snapshot_response.data:
            skills_snapshot = snapshot_response.data[0].get("skills_snapshot", {})
            if isinstance(skills_snapshot, dict):
                previous_mastery_map = {
                    skill_id: float(mastery) 
                    for skill_id, mastery in skills_snapshot.items()
                }
        
        # Calculate improvements and format response
        improvements = []
        for topic_id, topic_name in unique_topics.items():
            
            # Skip if we don't have current mastery data (shouldn't happen if BKT is working)
            if topic_id not in current_mastery_map:
                continue
                
            current_mastery = current_mastery_map[topic_id]
            previous_mastery = previous_mastery_map.get(topic_id, 0.0)
            
            # Calculate absolute increase in percentage points
            mastery_increase = (current_mastery - previous_mastery) * 100
            current_percentage = current_mastery * 100
            
            stats = session_stats[topic_id]
            
            improvements.append({
                "topic_id": topic_id,
                "topic_name": topic_name,
                "mastery_before": previous_mastery,
                "mastery_after": current_mastery,
                "mastery_increase": round(mastery_increase, 1),
                "current_percentage": round(current_percentage, 1),
                "total_attempts": stats["total"],
                "correct_attempts": stats["correct"]
            })
        
        # Sort by mastery increase descending
        improvements.sort(key=lambda x: x["mastery_increase"], reverse=True)
        
        return improvements
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting mastery improvements: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get mastery improvements: {str(e)}"
        )


@router.post("/create-drill")
async def create_drill_session(
    request: CreateDrillSessionRequest,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Create a drill practice session from multiple topics.

    Args:
        request: Drill session creation data (topic_ids, questions_per_topic)
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Created drill session with questions
    """
    try:
        # Validate max 5 topics
        if len(request.topic_ids) > 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 5 topics allowed per drill session"
            )

        if len(request.topic_ids) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least 1 topic required"
            )

        # Get user's study plan (with course_id)
        study_plan_response = db.table("study_plans").select("id, course_id").eq("user_id", user_id).execute()

        if not study_plan_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No study plan found. Please create a study plan first."
            )

        study_plan_id = study_plan_response.data[0]["id"]
        course_id = study_plan_response.data[0].get("course_id")

        # Get topics information
        topics_response = db.table("topics").select("id, name, category_id, categories(name, section)").in_("id", request.topic_ids).execute()

        if not topics_response.data or len(topics_response.data) != len(request.topic_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more topics not found"
            )

        topics = topics_response.data
        
        # Create drill session record
        from datetime import date
        import time

        # Generate a unique negative session number for drill sessions
        # Use last 9 digits of timestamp in microseconds to fit in 32-bit integer (max ~2.1B)
        unique_session_number = -int(time.time() * 1_000_000) % 1_000_000_000

        session_data = {
            "study_plan_id": study_plan_id,
            "session_type": "drill",
            "scheduled_date": date.today().isoformat(),  # Required field
            "session_number": unique_session_number,  # Use timestamp-based negative numbers for drill sessions
            "status": "pending",
            "created_at": "now()"
        }
        if course_id:
            session_data["course_id"] = course_id

        session_response = db.table("practice_sessions").insert(session_data).execute()

        session_id = session_response.data[0]["id"]

        # Get questions for all topics
        questions_response = db.table("questions").select("*").in_(
            "topic_id", request.topic_ids
        ).eq("is_active", True).execute()

        all_questions = questions_response.data

        if not all_questions:
            # Clean up the session if no questions found
            db.table("practice_sessions").delete().eq("id", session_id).execute()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No questions available for the selected topics"
            )

        # Group questions by topic
        questions_by_topic = {}
        for question in all_questions:
            topic_id = question["topic_id"]
            if topic_id not in questions_by_topic:
                questions_by_topic[topic_id] = []
            questions_by_topic[topic_id].append(question)

        # Select questions_per_topic from each topic
        selected_questions = []
        for topic_id in request.topic_ids:
            topic_questions = questions_by_topic.get(topic_id, [])
            if topic_questions:
                # Take up to questions_per_topic random questions from this topic
                num_to_select = min(request.questions_per_topic, len(topic_questions))
                selected_questions.extend(random.sample(topic_questions, num_to_select))

        if not selected_questions:
            # Clean up the session if no questions selected
            db.table("practice_sessions").delete().eq("id", session_id).execute()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No questions available for the selected topics"
            )

        # Shuffle to mix topics
        random.shuffle(selected_questions)

        # Assign questions to session
        session_questions = []
        for i, question in enumerate(selected_questions):
            session_questions.append({
                "session_id": session_id,
                "question_id": question["id"],
                "topic_id": question["topic_id"],
                "display_order": i + 1,
                "status": "not_started",
                "created_at": "now()"
            })

        # Insert session questions
        if session_questions:
            db.table("session_questions").insert(session_questions).execute()

        # Get the session with questions for response
        session_with_questions = db.table("practice_sessions").select(
            "*, session_questions(question_id, display_order, questions(*))"
        ).eq("id", session_id).execute()

        # Get topic names for response
        topic_names = [topic["name"] for topic in topics]
        
        # Ensure session_id is a string
        session_id_str = str(session_id)

        return {
            "success": True,
            "session_id": session_id_str,
            "topic_names": topic_names,
            "num_questions": len(selected_questions),
            "session": session_with_questions.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating drill session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create drill session: {str(e)}"
        )


@router.post("/create-ai-session")
async def create_ai_session(
    request: CreateAISessionRequest,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Create a practice session from a natural-language prompt using AI.

    The prompt is parsed by OpenAI to select relevant topics and question count,
    then a drill session is created using the same logic as create-drill.

    Args:
        request: Contains the user's free-text prompt
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Created session with session_id, topic_names, and num_questions
    """
    try:
        if not request.prompt or not request.prompt.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please describe what you'd like to practice"
            )

        # 1. Get user's study plan (with course_id)
        study_plan_response = db.table("study_plans").select("id, course_id").eq("user_id", user_id).execute()
        if not study_plan_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No study plan found. Please create a study plan first."
            )
        study_plan_id = study_plan_response.data[0]["id"]
        ai_course_id = study_plan_response.data[0].get("course_id")

        # 2. Fetch all available topics with their categories
        topics_response = db.table("topics").select(
            "id, name, category_id, categories(name, section)"
        ).execute()

        if not topics_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No topics available in the database"
            )

        # Build a flat list for the AI
        available_topics = []
        for t in topics_response.data:
            cat = t.get("categories") or {}
            available_topics.append({
                "id": t["id"],
                "name": t["name"],
                "category_name": cat.get("name", "Unknown"),
                "section": cat.get("section", "unknown"),
            })

        # 3. Ask OpenAI to parse the prompt
        parsed = await openai_service.parse_practice_prompt(
            prompt=request.prompt.strip(),
            available_topics=available_topics,
        )

        topic_ids = parsed["topic_ids"]
        questions_per_topic = parsed["questions_per_topic"]

        # 4. Validate selected topics exist
        selected_topics_response = db.table("topics").select(
            "id, name, category_id, categories(name, section)"
        ).in_("id", topic_ids).execute()

        if not selected_topics_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Could not find matching topics for your request"
            )

        topics = selected_topics_response.data

        # 5. Create drill session record (reuses same logic as create-drill)
        from datetime import date
        import time

        unique_session_number = -int(time.time() * 1_000_000) % 1_000_000_000

        # Build a descriptive name from selected topics (for response only — column not in DB)
        topic_names = [t["name"] for t in topics]
        if len(topic_names) <= 2:
            ai_session_name = "AI Practice: " + " & ".join(topic_names)
        else:
            ai_session_name = "AI Practice: " + ", ".join(topic_names[:2]) + f" +{len(topic_names) - 2}"

        ai_session_data = {
            "study_plan_id": study_plan_id,
            "session_type": "drill",
            "scheduled_date": date.today().isoformat(),
            "session_number": unique_session_number,
            "status": "pending",
            "created_at": "now()"
        }
        if ai_course_id:
            ai_session_data["course_id"] = ai_course_id

        session_response = db.table("practice_sessions").insert(ai_session_data).execute()

        session_id = session_response.data[0]["id"]

        # 6. Get questions for selected topics
        questions_response = db.table("questions").select("*").in_(
            "topic_id", topic_ids
        ).eq("is_active", True).execute()

        all_questions = questions_response.data

        if not all_questions:
            db.table("practice_sessions").delete().eq("id", session_id).execute()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No questions available for the selected topics"
            )

        # 7. Group questions by topic and select per-topic count
        questions_by_topic = {}
        for question in all_questions:
            tid = question["topic_id"]
            if tid not in questions_by_topic:
                questions_by_topic[tid] = []
            questions_by_topic[tid].append(question)

        selected_questions = []
        for tid in topic_ids:
            topic_questions = questions_by_topic.get(tid, [])
            if topic_questions:
                num_to_select = min(questions_per_topic, len(topic_questions))
                selected_questions.extend(random.sample(topic_questions, num_to_select))

        if not selected_questions:
            db.table("practice_sessions").delete().eq("id", session_id).execute()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No questions available for the selected topics"
            )

        # 8. Shuffle and assign to session
        random.shuffle(selected_questions)

        session_questions = []
        for i, question in enumerate(selected_questions):
            session_questions.append({
                "session_id": session_id,
                "question_id": question["id"],
                "topic_id": question["topic_id"],
                "display_order": i + 1,
                "status": "not_started",
                "created_at": "now()"
            })

        if session_questions:
            db.table("session_questions").insert(session_questions).execute()

        topic_names = [t["name"] for t in topics]
        session_id_str = str(session_id)

        return {
            "success": True,
            "session_id": session_id_str,
            "topic_names": topic_names,
            "num_questions": len(selected_questions),
            "questions_per_topic": questions_per_topic,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating AI session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create AI session: {str(e)}"
        )


class AddSimilarQuestionRequest(BaseModel):
    question_id: str
    topic_id: str


@router.post("/{session_id}/add-similar-question", response_model=Dict[str, Any])
async def add_similar_question(
    session_id: str,
    request: AddSimilarQuestionRequest,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Add a similar question to an existing practice session.
    
    Args:
        session_id: Practice session ID
        request: Question and topic information
        user_id: User ID from authentication token
        db: Database client
        
    Returns:
        Added question details
    """
    try:
        # Verify session belongs to user
        service = PracticeSessionService(db)
        service.verify_session_ownership(session_id, user_id)
        
        # Get the current session to check if it exists
        session_response = db.table("practice_sessions").select("*").eq("id", session_id).execute()
        if not session_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Practice session not found"
            )
        
        # Get the highest display order in the session to add the similar question at the end
        max_order_response = db.table("session_questions").select("display_order").eq("session_id", session_id).order("display_order", desc=True).limit(1).execute()
        
        if max_order_response.data:
            next_order = max_order_response.data[0]["display_order"] + 1
        else:
            next_order = 1  # First question in session
        
        # For now, create a static similar question
        # In the future, this would use LLM to generate a similar question
        similar_question_data = {
            "stem": f"<p>This is a similar question to help you practice the same concept. What is the value of x in the equation 2x + 5 = 13?</p>",
            "question_type": "mc",
            "difficulty": "M",
            "answer_options": {
                "A": "x = 3",
                "B": "x = 4", 
                "C": "x = 5",
                "D": "x = 6"
            },
            "correct_answer": ["B"],
            "topic_id": request.topic_id,
            "module": "math",  # Add required module field
            "is_active": True,
            "created_at": "now()",
            "updated_at": "now()"
        }
        
        # Insert the similar question into the questions table
        question_response = db.table("questions").insert(similar_question_data).execute()
        if not question_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create similar question"
            )
        
        created_question = question_response.data[0]
        
        # Add the question to the session
        session_question_data = {
            "session_id": session_id,
            "question_id": created_question["id"],
            "topic_id": request.topic_id,
            "display_order": next_order,
            "status": "not_started",
            "created_at": "now()"
        }
        
        session_question_response = db.table("session_questions").insert(session_question_data).execute()
        if not session_question_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to add question to session"
            )
        
        # Get the topic information
        topic_response = db.table("topics").select("id, name, category_id, weight_in_category").eq("id", request.topic_id).execute()
        topic = topic_response.data[0] if topic_response.data else None
        
        return {
            "success": True,
            "question": created_question,
            "topic": topic,
            "display_order": next_order,
            "session_question_id": session_question_response.data[0]["id"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error adding similar question: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add similar question: {str(e)}"
        )


@router.get("/wrong-answers", response_model=List[Dict[str, Any]])
async def get_wrong_answers(
    limit: int = Query(50, description="Maximum number of wrong answers to return", ge=1, le=100),
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get questions that the user answered incorrectly across all practice sessions.
    
    Args:
        limit: Maximum number of wrong answers to return
        user_id: User ID from authentication token
        db: Database client
        
    Returns:
        List of questions answered incorrectly with session context
    """
    try:
        # Get the user's study plans (there might be multiple)
        study_plan_response = db.table("study_plans").select("id").eq("user_id", user_id).order("created_at", desc=True).execute()
        if not study_plan_response.data:
            return []

        # Use all study plans for this user (in case they have multiple)
        study_plan_ids = [sp["id"] for sp in study_plan_response.data]

        # Get sessions that belong to these study plans
        sessions_response = db.table("practice_sessions").select("id").in_("study_plan_id", study_plan_ids).execute()
        if not sessions_response.data:
            return []

        user_session_ids = [s["id"] for s in sessions_response.data]

        # Get wrong answers from session_questions for user's sessions only
        wrong_answers_response = db.table("session_questions").select(
            "*"
        ).in_("session_id", user_session_ids).eq("is_correct", False).order("answered_at", desc=True).limit(limit).execute()

        if not wrong_answers_response.data:
            return []

        # Get unique IDs for batch fetching
        question_ids = list(set(sq["question_id"] for sq in wrong_answers_response.data if sq.get("question_id")))
        topic_ids = list(set(sq["topic_id"] for sq in wrong_answers_response.data if sq.get("topic_id")))
        session_ids = list(set(sq["session_id"] for sq in wrong_answers_response.data if sq.get("session_id")))

        # Batch fetch related data
        questions_map = {}
        topics_map = {}
        sessions_map = {}

        # Fetch questions
        if question_ids:
            questions_response = db.table("questions").select("*").in_("id", question_ids).execute()
            questions_map = {q["id"]: q for q in questions_response.data} if questions_response.data else {}

        # Fetch topics with categories
        if topic_ids:
            topics_response = db.table("topics").select("*, categories(name, section)").in_("id", topic_ids).execute()
            if topics_response.data:
                for topic in topics_response.data:
                    topics_map[topic["id"]] = {
                        "id": topic["id"],
                        "name": topic.get("name"),
                        "category_name": topic.get("categories", {}).get("name") if topic.get("categories") else None,
                        "section": topic.get("categories", {}).get("section") if topic.get("categories") else None
                    }

        # Fetch sessions (without study_plans join since it doesn't have a name column)
        if session_ids:
            sessions_response = db.table("practice_sessions").select("*").in_("id", session_ids).execute()
            if sessions_response.data:
                for session in sessions_response.data:
                    sessions_map[session["id"]] = {
                        "id": session["id"],
                        "created_at": session.get("created_at"),
                        "study_plan_name": None  # study_plans table doesn't have a name column
                    }
        
        # Format the response
        wrong_answers = []
        for sq in wrong_answers_response.data:
            # Get related data from maps
            question = questions_map.get(sq["question_id"], {})
            topic = topics_map.get(sq["topic_id"], {})
            session = sessions_map.get(sq["session_id"], {})

            wrong_answer = {
                "session_question_id": sq["id"],
                "session_id": sq["session_id"],
                "question_id": sq["question_id"],
                "topic_id": sq["topic_id"],
                "user_answer": sq.get("user_answer"),
                "answered_at": sq.get("answered_at"),
                "confidence_score": sq.get("confidence_score"),
                "time_spent_seconds": sq.get("time_spent_seconds"),
                "question": {
                    "id": question.get("id"),
                    "stem": question.get("stem"),
                    "stimulus": question.get("stimulus"),
                    "difficulty": question.get("difficulty"),
                    "question_type": question.get("question_type"),
                    "answer_options": question.get("answer_options"),
                    "correct_answer": question.get("correct_answer"),
                    "acceptable_answers": question.get("acceptable_answers"),
                    "rationale": question.get("rationale")
                } if question else None,
                "topic": {
                    "id": topic.get("id"),
                    "name": topic.get("name"),
                    "category": topic.get("category_name"),
                    "section": topic.get("section")
                } if topic else None,
                "session": {
                    "id": session.get("id"),
                    "created_at": session.get("created_at")
                } if session else None
            }
            wrong_answers.append(wrong_answer)
        
        # Return formatted wrong answers
        
        return wrong_answers
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve wrong answers: {str(e)}"
        )


@router.get("/saved-questions", response_model=List[Dict[str, Any]])
async def get_saved_questions(
    limit: int = Query(50, description="Maximum number of saved questions to return", ge=1, le=100),
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get questions that the user has saved/bookmarked for review.

    Args:
        limit: Maximum number of saved questions to return
        user_id: User ID from authentication token
        db: Database client

    Returns:
        List of saved questions with session context
    """
    try:
        # Get ALL the user's study plans (user can have multiple)
        study_plan_response = db.table("study_plans").select("id").eq("user_id", user_id).order("created_at", desc=True).execute()
        if not study_plan_response.data:
            return []

        # Use all study plans for this user
        study_plan_ids = [sp["id"] for sp in study_plan_response.data]

        # Get sessions that belong to ALL these study plans
        sessions_response = db.table("practice_sessions").select("id").in_("study_plan_id", study_plan_ids).execute()
        if not sessions_response.data:
            return []

        user_session_ids = [s["id"] for s in sessions_response.data]

        # Get saved questions from session_questions for user's sessions only
        saved_questions_response = db.table("session_questions").select(
            "*"
        ).in_("session_id", user_session_ids).eq("is_saved", True).order("created_at", desc=True).limit(limit).execute()

        if not saved_questions_response.data:
            return []

        # Get unique IDs for batch fetching
        question_ids = list(set(sq["question_id"] for sq in saved_questions_response.data if sq.get("question_id")))
        topic_ids = list(set(sq["topic_id"] for sq in saved_questions_response.data if sq.get("topic_id")))
        session_ids = list(set(sq["session_id"] for sq in saved_questions_response.data if sq.get("session_id")))

        # Batch fetch related data
        questions_map = {}
        topics_map = {}
        sessions_map = {}

        # Fetch questions
        if question_ids:
            questions_response = db.table("questions").select("*").in_("id", question_ids).execute()
            questions_map = {q["id"]: q for q in questions_response.data} if questions_response.data else {}

        # Fetch topics with categories
        if topic_ids:
            topics_response = db.table("topics").select("*, categories(name, section)").in_("id", topic_ids).execute()
            if topics_response.data:
                for topic in topics_response.data:
                    topics_map[topic["id"]] = {
                        "id": topic["id"],
                        "name": topic.get("name"),
                        "category_name": topic.get("categories", {}).get("name") if topic.get("categories") else None,
                        "section": topic.get("categories", {}).get("section") if topic.get("categories") else None
                    }

        # Fetch sessions (without study_plans join since it doesn't have a name column)
        if session_ids:
            sessions_response = db.table("practice_sessions").select("*").in_("id", session_ids).execute()
            if sessions_response.data:
                for session in sessions_response.data:
                    sessions_map[session["id"]] = {
                        "id": session["id"],
                        "created_at": session.get("created_at"),
                        "study_plan_name": None  # study_plans table doesn't have a name column
                    }

        # Format the response
        saved_questions = []
        for sq in saved_questions_response.data:
            # Get related data from maps
            question = questions_map.get(sq["question_id"], {})
            topic = topics_map.get(sq["topic_id"], {})
            session = sessions_map.get(sq["session_id"], {})

            saved_question = {
                "session_question_id": sq["id"],
                "session_id": sq["session_id"],
                "question_id": sq["question_id"],
                "topic_id": sq["topic_id"],
                "is_correct": sq.get("is_correct"),
                "user_answer": sq.get("user_answer"),
                "answered_at": sq.get("answered_at"),
                "saved_at": sq.get("updated_at") or sq.get("created_at"),  # When it was saved (fallback to created_at)
                "confidence_score": sq.get("confidence_score"),
                "time_spent_seconds": sq.get("time_spent_seconds"),
                "question": {
                    "id": question.get("id"),
                    "stem": question.get("stem"),
                    "stimulus": question.get("stimulus"),
                    "difficulty": question.get("difficulty"),
                    "question_type": question.get("question_type"),
                    "answer_options": question.get("answer_options"),
                    "correct_answer": question.get("correct_answer"),
                    "acceptable_answers": question.get("acceptable_answers"),
                    "rationale": question.get("rationale")
                } if question else None,
                "topic": {
                    "id": topic.get("id"),
                    "name": topic.get("name"),
                    "category": topic.get("category_name"),
                    "section": topic.get("section")
                } if topic else None,
                "session": {
                    "id": session.get("id"),
                    "created_at": session.get("created_at")
                } if session else None
            }
            saved_questions.append(saved_question)

        return saved_questions

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve saved questions: {str(e)}"
        )


@router.post("/questions/{session_question_id}/toggle-save")
async def toggle_save_question(
    session_question_id: str,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Toggle the saved status of a question for later review.

    Args:
        session_question_id: The session_question ID to toggle
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Updated saved status
    """
    try:
        # First check if the session_question exists
        sq_response = db.table("session_questions").select(
            "*, practice_sessions!inner(study_plan_id)"
        ).eq("id", session_question_id).execute()

        if not sq_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session question not found"
            )

        session_question = sq_response.data[0]
        session = session_question.get("practice_sessions")

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found for this question"
            )

        # Check if the study plan belongs to the user
        study_plan_id = session.get("study_plan_id")
        study_plan_response = db.table("study_plans").select("user_id").eq("id", study_plan_id).single().execute()

        if not study_plan_response.data or study_plan_response.data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to save this question"
            )

        # Toggle is_saved status
        current_saved_status = session_question.get("is_saved", False)
        new_saved_status = not current_saved_status

        # Update the saved status (without updated_at since column doesn't exist)
        update_response = db.table("session_questions").update({
            "is_saved": new_saved_status
        }).eq("id", session_question_id).execute()

        if not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update saved status"
            )

        return {
            "success": True,
            "is_saved": new_saved_status,
            "message": "Question saved for review" if new_saved_status else "Question removed from saved items"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle save status: {str(e)}"
        )


@router.get("/recent-drills")
async def get_recent_drills(
    limit: int = Query(10, ge=1, le=50),
    db: Client = Depends(get_authenticated_client),
    user_id: str = Depends(get_current_user)
):
    """
    Get recent drill sessions (all statuses) for the current user.
    Returns pending, in-progress, and completed drill sessions for history + resume.
    """
    try:
        sessions_response = db.table("practice_sessions").select(
            "id, created_at, completed_at, started_at, session_number, session_type, status, study_plans!inner(user_id)"
        ).eq("study_plans.user_id", user_id).eq(
            "session_type", "drill"
        ).order("created_at", desc=True).limit(limit).execute()

        if not sessions_response.data:
            return []

        results = []
        for session in sessions_response.data:
            # Count correct + total questions
            correct_resp = db.table("session_questions").select(
                "id", count="exact"
            ).eq("session_id", session["id"]).eq("is_correct", True).execute()

            total_resp = db.table("session_questions").select(
                "id", count="exact"
            ).eq("session_id", session["id"]).execute()

            answered_resp = db.table("session_questions").select(
                "id", count="exact"
            ).eq("session_id", session["id"]).neq("status", "not_started").execute()

            correct = correct_resp.count or 0
            total = total_resp.count or 0
            answered = answered_resp.count or 0

            # Get topic names for display
            topic_resp = db.table("session_questions").select(
                "topic_id, topics(name)"
            ).eq("session_id", session["id"]).execute()

            topic_names = list({
                sq["topics"]["name"]
                for sq in (topic_resp.data or [])
                if sq.get("topics") and sq["topics"].get("name")
            })

            results.append({
                "id": session["id"],
                "created_at": session["created_at"],
                "completed_at": session["completed_at"],
                "started_at": session["started_at"],
                "status": session["status"],
                "session_type": session.get("session_type", "drill"),
                "total_questions": total,
                "correct_count": correct,
                "answered_count": answered,
                "topic_names": topic_names[:3],
            })

        return results

    except Exception as e:
        print(f"Error getting recent drills: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get recent drills: {str(e)}"
        )


@router.get("/completed")
async def get_completed_sessions(
    limit: int = Query(20, ge=1, le=100),
    db: Client = Depends(get_authenticated_client),
    user_id: str = Depends(get_current_user)
):
    """
    Get completed practice sessions for the current user.
    
    Args:
        limit: Maximum number of sessions to return (1-100)
        db: Database client
        user_id: Current authenticated user ID
        
    Returns:
        List of completed practice sessions with basic info
    """
    try:
        # Query completed sessions joining through study_plans to filter by user
        # practice_sessions -> study_plans -> user_id
        sessions_response = db.table("practice_sessions").select(
            "id, created_at, completed_at, session_number, session_type, status, study_plans!inner(user_id)"
        ).eq("study_plans.user_id", user_id).eq("status", "completed").order(
            "completed_at", desc=True
        ).limit(limit).execute()
        
        if not sessions_response.data:
            return []
        
        # Format the response and get scores
        completed_sessions = []
        for session in sessions_response.data:
            study_plan = session.get("study_plans", {})
            
            # Calculate score for this session
            # Count correct answers
            correct_count_response = db.table("session_questions").select(
                "id", count="exact"
            ).eq("session_id", session["id"]).eq("is_correct", True).execute()
            
            correct_count = correct_count_response.count if correct_count_response.count is not None else 0
            
            # Count total questions
            total_questions_response = db.table("session_questions").select(
                "id", count="exact"
            ).eq("session_id", session["id"]).execute()
            
            total_questions = total_questions_response.count if total_questions_response.count is not None else 0
            
            completed_sessions.append({
                "id": session["id"],
                "created_at": session["created_at"],
                "completed_at": session["completed_at"],
                "session_number": session["session_number"],
                "session_type": session.get("session_type", "practice"),
                "total_questions": total_questions,
                "correct_count": correct_count,
                "completed_questions": total_questions, # Assuming completed means all answered
                "study_plan_name": study_plan.get("name") if study_plan else None,
                "topics": []  # We can add topic info later if needed
            })
        
        return completed_sessions
        
    except Exception as e:
        print(f"Error getting completed sessions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get completed sessions: {str(e)}"
        )


@router.get("/debug-session-questions")
async def debug_session_questions(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Debug endpoint to check session_questions data structure
    """
    try:
        # Get all session questions for this user (not just wrong ones)
        debug_response = db.table("session_questions").select(
            """
            id,
            session_id,
            question_id,
            user_answer,
            is_correct,
            answered_at,
            questions(
                id,
                stem,
                answer_options,
                correct_answer
            )
            """
        ).limit(5).execute()
        
        return {
            "total_questions": len(debug_response.data) if debug_response.data else 0,
            "sample_data": debug_response.data[:2] if debug_response.data else [],
            "message": "Check console for detailed logs"
        }
        
    except Exception as e:
        return {"error": str(e)}
