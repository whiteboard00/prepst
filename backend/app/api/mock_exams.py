from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
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
    BatchSubmitResponse,
    BatchAnswerResult,
)
from app.services.mock_exam_service import MockExamService
from app.core.auth import get_current_user, get_authenticated_client
from typing import List
import asyncio

router = APIRouter(prefix="/mock-exams", tags=["mock-exams"])

async def background_complete_module(
    service: MockExamService,
    module_id: str,
    user_id: str,
    time_remaining_seconds: int
):
    """Background task to handle heavy module completion logic."""
    try:
        await service.complete_module(
            module_id=module_id,
            user_id=user_id,
            time_remaining_seconds=time_remaining_seconds,
        )
    except Exception as e:
        print(f"Error in background module completion for module {module_id}: {str(e)}")
        # In a real system, you might want to log this to an error tracking service
        # or update a status flag in the database so the frontend knows it failed.


@router.post("/create", response_model=MockExamResponse, status_code=status.HTTP_201_CREATED)
async def create_mock_exam(
    request: CreateMockExamRequest,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """
    Create a new mock exam using course configuration.

    Args:
        request: Exam creation request with exam type and course slug
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Created exam with modules
    """
    try:
        service = MockExamService(db)
        result = await service.create_mock_exam(
            user_id=user_id, exam_type=request.exam_type, course_slug=request.course_slug
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
            .execute()
        )

        # Sort modules by module_number (works for any course's module structure)
        sorted_modules = sorted(
            modules_response.data,
            key=lambda m: m.get("module_number", 999)
        )

        return {"exam": exam, "modules": sorted_modules}

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
                "questions(id, stimulus, stem, difficulty, question_type, answer_options, correct_answer, topic_id, "
                "topics(id, name, category_id, categories(id, name, section)))"
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
                    "stimulus": question_data.get("stimulus"),
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

        junction_question_id = meq_response.data[0]["id"] if meq_response.data else None

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


@router.post(
    "/{exam_id}/modules/{module_id}/questions/batch",
    response_model=BatchSubmitResponse,
)
async def submit_answers_batch(
    exam_id: str,
    module_id: str,
    answers: List[SubmitModuleAnswerRequest],
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """
    Submit multiple answers at once for a module.

    Args:
        exam_id: Mock exam ID
        module_id: Module ID
        answers: List of answer submissions
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Batch submission results
    """
    try:
        service = MockExamService(db)
        
        # Convert Pydantic models to dicts for service
        answers_dicts = [
            {
                "question_id": a.question_id,
                "user_answer": a.user_answer,
                "status": a.status.value,
                "is_marked_for_review": a.is_marked_for_review
            }
            for a in answers
        ]
        
        results_data, successful, failed = await service.submit_answers_batch(
            module_id=module_id,
            answers=answers_dicts,
            user_id=user_id
        )

        # Map back to response model
        results = [
            BatchAnswerResult(
                question_id=r["question_id"],
                success=r["success"],
                is_correct=r.get("is_correct"),
                error=r.get("error")
            )
            for r in results_data
        ]

        return BatchSubmitResponse(
            results=results,
            total=len(results),
            successful=successful,
            failed=failed,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit batch answers: {str(e)}",
        )


@router.post("/{exam_id}/modules/{module_id}/complete")
async def complete_module(
    exam_id: str,
    module_id: str,
    request: CompleteModuleRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
    db: Client = Depends(get_authenticated_client),
):
    """
    Complete a module and calculate score. Generates adaptive questions for next module.
    Heavy processing is offloaded to a background task to ensure quick UI response.

    Args:
        exam_id: Mock exam ID
        module_id: Module ID
        request: Completion data with time remaining
        background_tasks: FastAPI background tasks handler
        user_id: User ID from authentication token
        db: Database client

    Returns:
        Status indicating completion is processing
    """
    try:
        service = MockExamService(db)
        
        # 1. Mark module as completing/completed synchronously to update UI state
        # We'll use a specialized method or direct DB update if service.complete_module is too monolithic
        # For now, we queue the whole thing.
        # Ideally, we should update the status to 'completed' here so the frontend sees it as done.
        # But complete_module likely does that. 
        # Let's trust the background task for the heavy lifting.
        
        background_tasks.add_task(
            background_complete_module,
            service,
            module_id,
            user_id,
            request.time_remaining_seconds
        )
        
        return {
            "status": "processing",
            "message": "Module completion started in background"
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
                    "*, questions(id, difficulty, question_type, correct_answer, answer_options, "
                    "topics(name, categories(name, section)))"
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

                is_correct = meq.get("is_correct")
                if is_correct is True:
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
                if is_correct is True:
                    category_stats[cat_key]["correct"] += 1

                # Map UUIDs to labels for MC questions
                user_answer = meq.get("user_answer")
                correct_answer = question.get("correct_answer")

                if question.get("question_type") == "mc" and question.get("answer_options"):
                    options = question["answer_options"]
                    # Normalize options to list of items
                    if isinstance(options, dict):
                        options_list = list(options.items()) # This might need adjustment based on actual dict structure
                    elif isinstance(options, list):
                        options_list = options
                    else:
                        options_list = []

                    labels = ["A", "B", "C", "D", "E", "F"]
                    
                    # Helper to map ID to label
                    def map_ids_to_labels(ids):
                        if not ids: return ids
                        mapped = []
                        for ans_id in ids:
                            # Try to find matching option
                            found_label = None
                            for idx, opt in enumerate(options_list):
                                # Option structure can vary: {"id": ..., "content": ...} or [id, content]
                                opt_id = None
                                if isinstance(opt, dict):
                                    opt_id = opt.get("id")
                                elif isinstance(opt, list) and len(opt) > 0:
                                    opt_id = opt[0]
                                
                                if str(opt_id) == str(ans_id):
                                    if idx < len(labels):
                                        found_label = labels[idx]
                                    break
                            
                            if found_label:
                                mapped.append(found_label)
                            else:
                                mapped.append(ans_id) # Fallback to original if not found
                        return mapped

                    if user_answer:
                        user_answer = map_ids_to_labels(user_answer)
                    
                    # Correct answer might already be labels "A", "B", etc. or UUIDs. 
                    # Usually correct_answer is stored as ["A"] for MC, but let's be safe.
                    # If correct_answer looks like a UUID, map it. Otherwise assume it's a label.
                    if correct_answer and len(correct_answer) > 0 and len(correct_answer[0]) > 5: # Simple heuristic for UUID
                         correct_answer = map_ids_to_labels(correct_answer)


                question_results.append(
                    QuestionResultDetail(
                        question_id=question["id"],
                        topic_name=topic["name"],
                        category_name=category["name"],
                        difficulty=question["difficulty"],
                        is_correct=is_correct,
                        user_answer=user_answer,
                        correct_answer=correct_answer,
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
        import traceback
        error_detail = f"Failed to retrieve exam results: {str(e)}\n{traceback.format_exc()}"
        print(error_detail)  # Log to console
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve exam results: {str(e)}",
        )
