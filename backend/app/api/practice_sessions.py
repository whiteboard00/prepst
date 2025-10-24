from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from app.models.study_plan import (
    SessionQuestionsResponse,
    SubmitAnswerResponse,
    AIFeedbackResponse,
    AIFeedbackRequest,
    AIFeedbackContent,
)
from app.services.practice_session_service import PracticeSessionService
from app.services.answer_validation_service import AnswerValidationService
from app.services.openai_service import openai_service
from app.services.bkt_service import BKTService
from app.services.analytics_service import AnalyticsService
from app.core.auth import get_current_user, get_authenticated_client
from typing import List, Optional
from pydantic import BaseModel
from uuid import UUID
import random


router = APIRouter(prefix="/practice-sessions", tags=["practice-sessions"])


class SubmitAnswerRequest(BaseModel):
    user_answer: List[str]
    status: str = "answered"
    confidence_score: Optional[int] = None  # 1-5 rating
    time_spent_seconds: Optional[int] = None


class CreateDrillSessionRequest(BaseModel):
    skill_id: str
    num_questions: int = 10  # Default to 10 questions for drill


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
        questions_response = db.table("session_questions").select(
            "id, session_id, question_id, topic_id, display_order, status, user_answer, "
            "questions(id, stimulus, stem, difficulty, question_type, answer_options, correct_answer), "
            "topics(id, name, category_id, weight_in_category)"
        ).eq("session_id", session_id).order("display_order").execute()

        questions = []
        for sq in questions_response.data:
            questions.append({
                "session_question_id": sq["id"],
                "question": sq["questions"],
                "topic": sq["topics"],
                "status": sq["status"],
                "display_order": sq["display_order"],
                "user_answer": sq.get("user_answer")
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
        # Verify session belongs to user
        service = PracticeSessionService(db)
        service.verify_session_ownership(session_id, user_id)
        
        # Update session status
        db.table("practice_sessions").update({
            "status": "completed",
            "completed_at": "now()"
        }).eq("id", session_id).execute()
        
        # Create performance snapshot
        analytics_service = AnalyticsService(db)
        snapshot = await analytics_service.create_performance_snapshot(
            user_id=user_id,
            snapshot_type="session_complete",
            related_id=session_id
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete session: {str(e)}"
        )


@router.post("/create-drill")
async def create_drill_session(
    request: CreateDrillSessionRequest,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Create a drill practice session focused on a specific skill/topic.
    
    Args:
        request: Drill session creation data (skill_id, num_questions)
        user_id: User ID from authentication token
        db: Database client
        
    Returns:
        Created drill session with questions
    """
    try:
        # Get user's study plan
        study_plan_response = db.table("study_plans").select("id").eq("user_id", user_id).execute()
        
        if not study_plan_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No study plan found. Please create a study plan first."
            )
        
        study_plan_id = study_plan_response.data[0]["id"]
        
        # Get skill/topic information
        skill_response = db.table("topics").select("id, name, category_id, categories(name, section)").eq("id", request.skill_id).execute()
        
        if not skill_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Skill not found"
            )
        
        skill = skill_response.data[0]
        
        # Create drill session record
        from datetime import date
        session_response = db.table("practice_sessions").insert({
            "study_plan_id": study_plan_id,
            "session_type": "drill",
            "scheduled_date": date.today().isoformat(),  # Required field
            "session_number": 0,  # Required field - use 0 for drill sessions
            "status": "pending",
            "created_at": "now()"
        }).execute()
        
        session_id = session_response.data[0]["id"]
        
        # Get questions for this skill/topic
        questions_response = db.table("questions").select("*").eq(
            "topic_id", request.skill_id
        ).eq("is_active", True).limit(request.num_questions * 2).execute()
        
        available_questions = questions_response.data
        
        if not available_questions:
            # Clean up the session if no questions found
            db.table("practice_sessions").delete().eq("id", session_id).execute()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No questions available for this skill"
            )
        
        # Select random questions for the drill
        num_questions = min(request.num_questions, len(available_questions))
        selected_questions = random.sample(available_questions, num_questions)
        
        # Assign questions to session
        session_questions = []
        for i, question in enumerate(selected_questions):
            session_questions.append({
                "session_id": session_id,
                "question_id": question["id"],
                "display_order": i + 1,
                "status": "pending",
                "created_at": "now()"
            })
        
        # Insert session questions
        if session_questions:
            db.table("session_questions").insert(session_questions).execute()
        
        # Get the session with questions for response
        session_with_questions = db.table("practice_sessions").select(
            "*, session_questions(question_id, display_order, questions(*))"
        ).eq("id", session_id).execute()
        
        return {
            "success": True,
            "session_id": session_id,
            "skill_name": skill["name"],
            "category": skill["categories"]["name"],
            "section": skill["categories"]["section"],
            "num_questions": num_questions,
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
