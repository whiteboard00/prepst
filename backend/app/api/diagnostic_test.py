from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from app.db import get_db
from app.models.diagnostic_test import (
    CreateDiagnosticTestRequest,
    SubmitDiagnosticAnswerRequest,
    DiagnosticTestResponse,
    DiagnosticTestListResponse,
    DiagnosticTestResultsResponse,
    DiagnosticTestListItem,
    SubmitAnswerResponse,
    TopicMasteryInit,
    DiagnosticTestQuestionWithDetails,
)
from app.services.diagnostic_test_service import DiagnosticTestService
from app.core.auth import get_current_user, get_authenticated_client
from typing import List

router = APIRouter(prefix="/diagnostic-test", tags=["diagnostic-test"])


@router.post("/create", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_diagnostic_test(
    request: CreateDiagnosticTestRequest,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """
    Create a new diagnostic test with 40 questions.

    Args:
        request: Diagnostic test creation request
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Created diagnostic test
    """
    try:
        service = DiagnosticTestService(db)
        result = await service.create_diagnostic_test(user_id=user_id)
        return result

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create diagnostic test: {str(e)}",
        )


@router.get("/", response_model=DiagnosticTestListResponse)
async def list_diagnostic_tests(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """
    Get all diagnostic tests for the current user.

    Args:
        user_id: User ID from authentication token
        db: Database client

    Returns:
        List of user's diagnostic tests
    """
    try:
        response = (
            db.table("diagnostic_tests")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

        tests = [DiagnosticTestListItem(**test) for test in response.data]

        return {"tests": tests, "total_count": len(tests)}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve diagnostic tests: {str(e)}",
        )


@router.get("/{test_id}", response_model=DiagnosticTestResponse)
async def get_diagnostic_test(
    test_id: str,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """
    Get a specific diagnostic test with all questions.

    Args:
        test_id: Diagnostic test ID
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Test with all questions
    """
    try:
        # Verify test belongs to user
        test_response = (
            db.table("diagnostic_tests")
            .select("*")
            .eq("id", test_id)
            .eq("user_id", user_id)
            .execute()
        )

        if not test_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Test not found"
            )

        test = test_response.data[0]

        # Get all questions for the test
        questions_response = (
            db.table("diagnostic_test_questions")
            .select(
                "id, test_id, question_id, section, display_order, status, user_answer, "
                "is_correct, is_marked_for_review, answered_at, "
                "questions(id, stimulus, stem, difficulty, question_type, answer_options, correct_answer, topic_id, "
                "topics(id, name, category_id, categories(id, name, section)))"
            )
            .eq("test_id", test_id)
            .order("display_order")
            .execute()
        )

        questions = []
        for dtq in questions_response.data:
            # Extract nested data
            question_data = dtq["questions"]
            topic_data = question_data.get("topics", {})

            questions.append({
                "diagnostic_question_id": dtq["id"],
                "question": {
                    "id": question_data["id"],
                    "stimulus": question_data.get("stimulus"),
                    "stem": question_data["stem"],
                    "difficulty": question_data["difficulty"],
                    "question_type": question_data["question_type"],
                    "answer_options": question_data["answer_options"],
                    "correct_answer": question_data["correct_answer"],
                },
                "topic": topic_data,
                "section": dtq["section"],
                "display_order": dtq["display_order"],
                "status": dtq["status"],
                "user_answer": dtq.get("user_answer"),
                "is_correct": dtq.get("is_correct"),
                "is_marked_for_review": dtq.get("is_marked_for_review", False),
                "answered_at": dtq.get("answered_at"),
            })

        return {
            "test": test,
            "questions": questions,
            "total_questions": len(questions),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve diagnostic test: {str(e)}",
        )


@router.post("/{test_id}/start")
async def start_diagnostic_test(
    test_id: str,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """
    Start a diagnostic test, setting its status and start time.

    Args:
        test_id: Diagnostic test ID to start
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Updated test
    """
    try:
        service = DiagnosticTestService(db)
        result = await service.start_test(test_id=test_id, user_id=user_id)
        return result

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start diagnostic test: {str(e)}",
        )


@router.patch(
    "/{test_id}/questions/{question_id}",
    response_model=SubmitAnswerResponse,
)
async def submit_answer(
    test_id: str,
    question_id: str,
    answer_data: SubmitDiagnosticAnswerRequest,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """
    Submit an answer for a question in a diagnostic test.

    Args:
        test_id: Diagnostic test ID
        question_id: Question ID
        answer_data: User's answer and status
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Answer correctness and correct answer
    """
    try:
        service = DiagnosticTestService(db)
        is_correct, correct_answer = await service.submit_answer(
            test_id=test_id,
            question_id=question_id,
            user_answer=answer_data.user_answer,
            status=answer_data.status.value,
            is_marked_for_review=answer_data.is_marked_for_review,
            user_id=user_id,
        )

        # Get diagnostic question id
        dtq_response = (
            db.table("diagnostic_test_questions")
            .select("id")
            .eq("test_id", test_id)
            .eq("question_id", question_id)
            .execute()
        )

        junction_question_id = dtq_response.data[0]["id"] if dtq_response.data else None

        return {
            "is_correct": is_correct,
            "correct_answer": correct_answer,
            "question_id": question_id,
            "junction_question_id": junction_question_id,
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit answer: {str(e)}",
        )


@router.post("/{test_id}/complete")
async def complete_diagnostic_test(
    test_id: str,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """
    Complete a diagnostic test and initialize BKT mastery baselines.

    Args:
        test_id: Diagnostic test ID
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Completion summary with mastery initialization
    """
    try:
        service = DiagnosticTestService(db)
        result = await service.complete_test(test_id=test_id, user_id=user_id)
        return result

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete diagnostic test: {str(e)}",
        )


@router.get("/{test_id}/results", response_model=DiagnosticTestResultsResponse)
async def get_diagnostic_test_results(
    test_id: str,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """
    Get comprehensive results for a completed diagnostic test.

    Args:
        test_id: Diagnostic test ID
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Test results with mastery initialization data
    """
    try:
        # Verify test belongs to user
        test_response = (
            db.table("diagnostic_tests")
            .select("*")
            .eq("id", test_id)
            .eq("user_id", user_id)
            .execute()
        )

        if not test_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Test not found"
            )

        test = test_response.data[0]

        # Get all questions with results
        questions_response = (
            db.table("diagnostic_test_questions")
            .select(
                "id, test_id, question_id, section, display_order, status, user_answer, "
                "is_correct, is_marked_for_review, answered_at, "
                "questions(id, stimulus, stem, difficulty, question_type, answer_options, correct_answer, topic_id, "
                "topics(id, name, category_id, categories(id, name, section)))"
            )
            .eq("test_id", test_id)
            .order("display_order")
            .execute()
        )

        questions = []
        for dtq in questions_response.data:
            question_data = dtq["questions"]
            topic_data = question_data.get("topics", {})

            questions.append({
                "diagnostic_question_id": dtq["id"],
                "question": {
                    "id": question_data["id"],
                    "stimulus": question_data.get("stimulus"),
                    "stem": question_data["stem"],
                    "difficulty": question_data["difficulty"],
                    "question_type": question_data["question_type"],
                    "answer_options": question_data["answer_options"],
                    "correct_answer": question_data["correct_answer"],
                },
                "topic": topic_data,
                "section": dtq["section"],
                "display_order": dtq["display_order"],
                "status": dtq["status"],
                "user_answer": dtq.get("user_answer"),
                "is_correct": dtq.get("is_correct"),
                "is_marked_for_review": dtq.get("is_marked_for_review", False),
                "answered_at": dtq.get("answered_at"),
            })

        # Calculate statistics
        total_correct = sum(1 for q in questions_response.data if q.get("is_correct") is True)
        total_questions = len(questions_response.data)

        math_questions = [q for q in questions_response.data if q["section"] == "math"]
        math_correct = sum(1 for q in math_questions if q.get("is_correct") is True)
        math_total = len(math_questions)

        rw_questions = [q for q in questions_response.data if q["section"] == "reading_writing"]
        rw_correct = sum(1 for q in rw_questions if q.get("is_correct") is True)
        rw_total = len(rw_questions)

        # Get topic mastery data
        mastery_response = (
            db.table("user_skill_mastery")
            .select("*, topics(id, name)")
            .eq("user_id", user_id)
            .execute()
        )

        topic_mastery_initialized = [
            TopicMasteryInit(
                topic_id=m["skill_id"],
                topic_name=m["topics"]["name"],
                initial_mastery=float(m["mastery_probability"]),
                questions_answered=m["total_attempts"],
                correct_answers=m["correct_attempts"]
            )
            for m in mastery_response.data
            if m.get("topics")
        ]

        return {
            "test": test,
            "total_correct": total_correct,
            "total_questions": total_questions,
            "overall_percentage": (total_correct / total_questions * 100) if total_questions > 0 else 0,
            "math_correct": math_correct,
            "math_total": math_total,
            "math_percentage": (math_correct / math_total * 100) if math_total > 0 else 0,
            "rw_correct": rw_correct,
            "rw_total": rw_total,
            "rw_percentage": (rw_correct / rw_total * 100) if rw_total > 0 else 0,
            "topic_mastery_initialized": topic_mastery_initialized,
            "questions": questions,
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"Failed to retrieve test results: {str(e)}\n{traceback.format_exc()}"
        print(error_detail)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve test results: {str(e)}",
        )
