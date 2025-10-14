from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from app.db import get_db
from app.models.study_plan import (
    StudyPlanCreate,
    StudyPlanResponse,
    SessionQuestionsResponse,
    SubmitAnswerResponse,
    CategoriesAndTopicsResponse,
    AIFeedbackRequest,
    AIFeedbackContent,
    AIFeedbackResponse
)
from app.services.study_plan_service import StudyPlanService
from app.services.openai_service import openai_service
from app.core.auth import get_current_user, get_authenticated_client
from typing import List, Optional
from pydantic import BaseModel
from uuid import UUID

router = APIRouter(prefix="/study-plans", tags=["study-plans"])


class SubmitAnswerRequest(BaseModel):
    user_answer: List[str]  # e.g., ["A"] for MC or ["42"] for SPR
    status: str = "answered"  # Can be "answered", "skipped", "flagged"


@router.post("/generate", response_model=StudyPlanResponse, status_code=status.HTTP_201_CREATED)
async def generate_study_plan(
    plan_data: StudyPlanCreate,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Generate a new study plan for a user.

    Args:
        plan_data: Study plan creation data (scores, test date)
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Generated study plan with sessions
    """
    try:
        service = StudyPlanService(db)

        result = await service.generate_study_plan(
            user_id=user_id,
            current_math_score=plan_data.current_math_score,
            target_math_score=plan_data.target_math_score,
            current_rw_score=plan_data.current_rw_score,
            target_rw_score=plan_data.target_rw_score,
            test_date=plan_data.test_date
        )

        return result

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate study plan: {str(e)}"
        )


@router.get("/me", response_model=StudyPlanResponse)
async def get_study_plan(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client)
):
    """
    Get the active study plan for the current user.

    Args:
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Active study plan with all sessions and topics
    """
    try:
        service = StudyPlanService(db)
        result = await service.get_study_plan_by_user(user_id)

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active study plan found for this user"
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve study plan: {str(e)}"
        )


@router.get("/sessions/{session_id}/questions", response_model=SessionQuestionsResponse)
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
        # Verify session belongs to user's study plan (separate query for auth)
        auth_check = db.table("practice_sessions").select(
            "id, study_plans!inner(user_id)"
        ).eq("id", session_id).execute()

        if not auth_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        if auth_check.data[0]["study_plans"]["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this session"
            )

        # Fetch session without nested study_plans
        session_response = db.table("practice_sessions").select("*").eq("id", session_id).execute()
        session = session_response.data[0]
        # Add empty topics array for PracticeSession model
        session["topics"] = []

        # Fetch all questions for the session (optimized - only needed fields)
        questions_response = db.table("session_questions").select(
            "id, session_id, question_id, topic_id, display_order, status, user_answer, "
            "questions(id, stem, difficulty, question_type, answer_options, correct_answer), "
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
                "user_answer": sq.get("user_answer")  # Include the user's submitted answer
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


@router.patch("/sessions/{session_id}/questions/{question_id}", response_model=SubmitAnswerResponse)
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
        session_response = db.table("practice_sessions").select(
            "*, study_plans!inner(user_id)"
        ).eq("id", session_id).execute()

        if not session_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        if session_response.data[0]["study_plans"]["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this session"
            )

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

        # Check if answer is correct
        correct_answer = question.get("correct_answer", [])
        acceptable_answers = question.get("acceptable_answers", [])
        user_answer = answer_data.user_answer

        # Normalize answers for comparison (strip whitespace, lowercase for text)
        def normalize_answer(ans_list):
            if not ans_list:
                return []
            return [str(a).strip().lower() for a in ans_list]

        normalized_user = normalize_answer(user_answer)
        normalized_correct = normalize_answer(correct_answer)
        normalized_acceptable = normalize_answer(acceptable_answers) if acceptable_answers else []

        # Check correctness
        is_correct = (
            normalized_user == normalized_correct or
            (normalized_acceptable and len(normalized_user) > 0 and normalized_user[0] in normalized_acceptable)
        )

        # Debug logging
        print(f"DEBUG - User answer: {user_answer}")
        print(f"DEBUG - Correct answer: {correct_answer}")
        print(f"DEBUG - Acceptable answers: {acceptable_answers}")
        print(f"DEBUG - Normalized user: {normalized_user}")
        print(f"DEBUG - Normalized correct: {normalized_correct}")
        print(f"DEBUG - Is correct: {is_correct}")

        # Update session_question record
        update_data = {
            "status": answer_data.status,
            "answered_at": "now()",
            "user_answer": user_answer  # Save the user's answer to the database
        }

        db.table("session_questions").update(update_data).eq(
            "id", sq["id"]
        ).execute()

        return {
            "is_correct": is_correct,
            "correct_answer": correct_answer,
            "question_id": question_id,
            "session_question_id": sq["id"]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit answer: {str(e)}"
        )


@router.get("/", response_model=CategoriesAndTopicsResponse)
async def get_categories_and_topics(db: Client = Depends(get_db)):
    """
    Get all categories and topics for reference.

    Returns:
        Categories and topics grouped by section
    """
    try:
        service = StudyPlanService(db)
        result = await service.get_categories_and_topics()
        return result

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve categories and topics: {str(e)}"
        )


@router.get("/sessions/{session_id}/questions/{question_id}/feedback", response_model=AIFeedbackResponse)
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
        session_response = db.table("practice_sessions").select(
            "*, study_plans!inner(user_id)"
        ).eq("id", session_id).execute()

        if not session_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        if session_response.data[0]["study_plans"]["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this session"
            )
        
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
        topic_performance = db.table("session_questions").select(
            "status, user_answer, questions(correct_answer, topic_id)"
        ).eq("topic_id", sq["topic_id"]).execute()
        
        topic_correct = sum(
            1 for q in topic_performance.data 
            if q["status"] == "answered" and q.get("user_answer") == q["questions"]["correct_answer"]
        )
        topic_total = len([q for q in topic_performance.data if q["status"] == "answered"])
        
        performance_context = {
            "topic_correct": topic_correct,
            "topic_total": topic_total
        }
        
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


@router.post("/sessions/{session_id}/generate-feedback", response_model=List[AIFeedbackResponse])
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
        session_response = db.table("practice_sessions").select(
            "*, study_plans!inner(user_id)"
        ).eq("id", session_id).execute()

        if not session_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        if session_response.data[0]["study_plans"]["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this session"
            )
        
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
            topic_performance = db.table("session_questions").select(
                "status, user_answer, questions(correct_answer, topic_id)"
            ).eq("topic_id", sq["topic_id"]).execute()
            
            topic_correct = sum(
                1 for q in topic_performance.data 
                if q["status"] == "answered" and q.get("user_answer") == q["questions"]["correct_answer"]
            )
            topic_total = len([q for q in topic_performance.data if q["status"] == "answered"])
            
            performance_context = {
                "topic_correct": topic_correct,
                "topic_total": topic_total
            }
            
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
