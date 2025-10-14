from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from app.db import get_db
from app.models.mock_exam import (
    CreateMockExamRequest,
    SubmitModuleAnswerRequest,
    CompleteModuleRequest,
    MockExamResponse,
    MockExamListResponse,
    ModuleQuestionsResponse,
    SubmitAnswerResponse,
    MockExamResultsResponse,
    ModuleResultDetail,
    QuestionResultDetail,
    CategoryPerformance,
    MockExamListItem,
)
from app.services.mock_exam_service import MockExamService
from app.core.auth import get_current_user, get_authenticated_client
from typing import List

router = APIRouter(prefix="/mock-exams", tags=["mock-exams"])


@router.post("/create", response_model=MockExamResponse, status_code=status.HTTP_201_CREATED)
async def create_mock_exam(
    request: CreateMockExamRequest,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """
    Create a new mock SAT exam with 4 modules.

    Args:
        request: Exam creation request with exam type
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Created exam with modules
    """
    try:
        service = MockExamService(db)
        result = await service.create_mock_exam(
            user_id=user_id, exam_type=request.exam_type
        )
        return result

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create mock exam: {str(e)}",
        )


@router.get("/", response_model=MockExamListResponse)
async def list_mock_exams(
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """
    Get all mock exams for the current user.

    Args:
        user_id: User ID from authentication token
        db: Database client

    Returns:
        List of user's mock exams
    """
    try:
        response = (
            db.table("mock_exams")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

        exams = [MockExamListItem(**exam) for exam in response.data]

        return {"exams": exams, "total_count": len(exams)}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve mock exams: {str(e)}",
        )


@router.get("/{exam_id}", response_model=MockExamResponse)
async def get_mock_exam(
    exam_id: str,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """
    Get a specific mock exam with all modules.

    Args:
        exam_id: Mock exam ID
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Exam with all modules
    """
    try:
        # Verify exam belongs to user
        exam_response = (
            db.table("mock_exams")
            .select("*")
            .eq("id", exam_id)
            .eq("user_id", user_id)
            .execute()
        )

        if not exam_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found"
            )

        exam = exam_response.data[0]

        # Get all modules
        modules_response = (
            db.table("mock_exam_modules")
            .select("*")
            .eq("exam_id", exam_id)
            .order("module_type")
            .execute()
        )

        return {"exam": exam, "modules": modules_response.data}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve exam: {str(e)}",
        )


@router.post("/{exam_id}/modules/{module_id}/start")
async def start_module(
    exam_id: str,
    module_id: str,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """
    Start a module, setting its status and start time.

    Args:
        exam_id: Mock exam ID
        module_id: Module ID to start
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Updated module
    """
    try:
        service = MockExamService(db)
        result = await service.start_module(module_id=module_id, user_id=user_id)
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
            detail=f"Failed to start module: {str(e)}",
        )


@router.get("/{exam_id}/modules/{module_id}/questions", response_model=ModuleQuestionsResponse)
async def get_module_questions(
    exam_id: str,
    module_id: str,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """
    Get all questions for a specific module.

    Args:
        exam_id: Mock exam ID
        module_id: Module ID
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Module with questions
    """
    try:
        # Verify module belongs to user's exam
        module_response = (
            db.table("mock_exam_modules")
            .select("*, mock_exams!inner(user_id)")
            .eq("id", module_id)
            .eq("exam_id", exam_id)
            .execute()
        )

        if not module_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Module not found"
            )

        module = module_response.data[0]
        if module["mock_exams"]["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this module",
            )

        # Remove nested exam data
        module_clean = {k: v for k, v in module.items() if k != "mock_exams"}

        # Get all questions for the module
        questions_response = (
            db.table("mock_exam_questions")
            .select(
                "id, module_id, question_id, display_order, status, user_answer, "
                "is_correct, is_marked_for_review, answered_at, "
                "questions(id, stem, difficulty, question_type, answer_options, correct_answer), "
                "questions!inner(topics(id, name, category_id, categories(id, name, section)))"
            )
            .eq("module_id", module_id)
            .order("display_order")
            .execute()
        )

        questions = []
        for meq in questions_response.data:
            # Extract nested data
            question_data = meq["questions"]
            topic_data = question_data.get("topics", {})

            questions.append({
                "mock_question_id": meq["id"],
                "question": {
                    "id": question_data["id"],
                    "stem": question_data["stem"],
                    "difficulty": question_data["difficulty"],
                    "question_type": question_data["question_type"],
                    "answer_options": question_data["answer_options"],
                    "correct_answer": question_data["correct_answer"],
                },
                "topic": topic_data,
                "display_order": meq["display_order"],
                "status": meq["status"],
                "user_answer": meq.get("user_answer"),
                "is_correct": meq.get("is_correct"),
                "is_marked_for_review": meq.get("is_marked_for_review", False),
                "answered_at": meq.get("answered_at"),
            })

        return {
            "module": module_clean,
            "questions": questions,
            "total_questions": len(questions),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve module questions: {str(e)}",
        )


@router.patch(
    "/{exam_id}/modules/{module_id}/questions/{question_id}",
    response_model=SubmitAnswerResponse,
)
async def submit_answer(
    exam_id: str,
    module_id: str,
    question_id: str,
    answer_data: SubmitModuleAnswerRequest,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """
    Submit an answer for a question in a module.

    Args:
        exam_id: Mock exam ID
        module_id: Module ID
        question_id: Question ID
        answer_data: User's answer and status
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Answer correctness and correct answer
    """
    try:
        service = MockExamService(db)
        is_correct, correct_answer = await service.submit_answer(
            module_id=module_id,
            question_id=question_id,
            user_answer=answer_data.user_answer,
            status=answer_data.status.value,
            is_marked_for_review=answer_data.is_marked_for_review,
            user_id=user_id,
        )

        # Get mock question id
        meq_response = (
            db.table("mock_exam_questions")
            .select("id")
            .eq("module_id", module_id)
            .eq("question_id", question_id)
            .execute()
        )

        mock_question_id = meq_response.data[0]["id"] if meq_response.data else None

        return {
            "is_correct": is_correct,
            "correct_answer": correct_answer,
            "question_id": question_id,
            "mock_question_id": mock_question_id,
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


@router.post("/{exam_id}/modules/{module_id}/complete")
async def complete_module(
    exam_id: str,
    module_id: str,
    request: CompleteModuleRequest,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """
    Complete a module and calculate score. Generates adaptive questions for next module.

    Args:
        exam_id: Mock exam ID
        module_id: Module ID
        request: Completion data with time remaining
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Completed module with score
    """
    try:
        service = MockExamService(db)
        result = await service.complete_module(
            module_id=module_id,
            user_id=user_id,
            time_remaining_seconds=request.time_remaining_seconds,
        )
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
            detail=f"Failed to complete module: {str(e)}",
        )


@router.get("/{exam_id}/results", response_model=MockExamResultsResponse)
async def get_exam_results(
    exam_id: str,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """
    Get comprehensive results for a completed exam.

    Args:
        exam_id: Mock exam ID
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Exam results with detailed breakdown
    """
    try:
        # Verify exam belongs to user
        exam_response = (
            db.table("mock_exams")
            .select("*")
            .eq("id", exam_id)
            .eq("user_id", user_id)
            .execute()
        )

        if not exam_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found"
            )

        exam = exam_response.data[0]

        # Get all modules with questions
        modules_response = (
            db.table("mock_exam_modules")
            .select("*")
            .eq("exam_id", exam_id)
            .order("module_type")
            .execute()
        )

        module_results = []
        category_stats = {}
        total_questions = 0
        total_correct = 0

        for module in modules_response.data:
            # Get questions for this module
            questions_response = (
                db.table("mock_exam_questions")
                .select(
                    "*, questions(id, difficulty, question_type, correct_answer), "
                    "questions!inner(topics(name, categories(name, section)))"
                )
                .eq("module_id", module["id"])
                .order("display_order")
                .execute()
            )

            question_results = []
            correct_in_module = 0

            for meq in questions_response.data:
                question = meq["questions"]
                topic = question["topics"]
                category = topic["categories"]

                is_correct = meq.get("is_correct", False)
                if is_correct:
                    correct_in_module += 1
                    total_correct += 1

                total_questions += 1

                # Track category performance
                cat_key = f"{category['name']}_{category['section']}"
                if cat_key not in category_stats:
                    category_stats[cat_key] = {
                        "category_name": category["name"],
                        "section": category["section"],
                        "total": 0,
                        "correct": 0,
                    }
                category_stats[cat_key]["total"] += 1
                if is_correct:
                    category_stats[cat_key]["correct"] += 1

                question_results.append(
                    QuestionResultDetail(
                        question_id=question["id"],
                        topic_name=topic["name"],
                        category_name=category["name"],
                        difficulty=question["difficulty"],
                        is_correct=is_correct,
                        user_answer=meq.get("user_answer"),
                        correct_answer=question["correct_answer"],
                        question_type=question["question_type"],
                    )
                )

            module_results.append(
                ModuleResultDetail(
                    module_type=module["module_type"],
                    module_number=module["module_number"],
                    raw_score=module.get("raw_score", 0),
                    total_questions=len(question_results),
                    correct_count=correct_in_module,
                    questions=question_results,
                )
            )

        # Calculate category performance
        category_performance = [
            CategoryPerformance(
                category_name=stats["category_name"],
                section=stats["section"],
                total_questions=stats["total"],
                correct_answers=stats["correct"],
                percentage=(stats["correct"] / stats["total"] * 100)
                if stats["total"] > 0
                else 0,
            )
            for stats in category_stats.values()
        ]

        overall_percentage = (
            (total_correct / total_questions * 100) if total_questions > 0 else 0
        )

        return {
            "exam": exam,
            "modules": module_results,
            "category_performance": category_performance,
            "total_questions": total_questions,
            "total_correct": total_correct,
            "overall_percentage": overall_percentage,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve exam results: {str(e)}",
        )
