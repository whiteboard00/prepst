from datetime import datetime
from typing import List, Dict, Optional, Tuple
from supabase import Client
import random
from app.models.mock_exam import (
    ModuleType,
    MockExamStatus,
    ModuleStatus,
    MockQuestionStatus,
)


class MockExamService:
    """Service for managing mock SAT exams."""

    # SAT exam configuration constants
    QUESTIONS_PER_MODULE = 27
    TIME_LIMIT_MINUTES = 32

    # Difficulty distribution for adaptive modules
    EASY_DISTRIBUTION = {"E": 0.5, "M": 0.35, "H": 0.15}  # Module 1 or if did poorly
    MEDIUM_DISTRIBUTION = {"E": 0.33, "M": 0.34, "H": 0.33}  # Balanced
    HARD_DISTRIBUTION = {"E": 0.15, "M": 0.35, "H": 0.5}  # Module 2 if did well

    def __init__(self, db: Client):
        self.db = db

    async def create_mock_exam(
        self, user_id: str, exam_type: str = "full_length"
    ) -> Dict:
        """
        Create a new mock exam with 4 modules (2 math, 2 reading/writing).

        Args:
            user_id: User ID creating the exam
            exam_type: Type of exam (full_length or section_only)

        Returns:
            Dict containing exam and modules data
        """
        # Create mock exam record
        exam_data = {
            "user_id": user_id,
            "exam_type": exam_type,
            "status": MockExamStatus.NOT_STARTED.value,
        }

        exam_response = self.db.table("mock_exams").insert(exam_data).execute()
        exam = exam_response.data[0]
        exam_id = exam["id"]

        # Create 4 modules - Start with Reading/Writing as per SAT format
        modules = []
        module_types = [
            (ModuleType.RW_MODULE_1, 1),
            (ModuleType.RW_MODULE_2, 2),
            (ModuleType.MATH_MODULE_1, 1),
            (ModuleType.MATH_MODULE_2, 2),
        ]

        for module_type, module_number in module_types:
            module_data = {
                "exam_id": exam_id,
                "module_type": module_type.value,
                "module_number": module_number,
                "time_limit_minutes": self.TIME_LIMIT_MINUTES,
                "status": ModuleStatus.NOT_STARTED.value,
            }
            module_response = (
                self.db.table("mock_exam_modules").insert(module_data).execute()
            )
            module = module_response.data[0]
            modules.append(module)

            # Generate questions for module 1 of each section
            # Module 2 questions will be generated after module 1 is completed (adaptive)
            if module_number == 1:
                await self._generate_module_questions(
                    module["id"], module_type, difficulty_level="medium"
                )

        return {"exam": exam, "modules": modules}

    async def _generate_module_questions(
        self,
        module_id: str,
        module_type: ModuleType,
        difficulty_level: str = "medium",
    ) -> None:
        """
        Generate questions for a module based on module type, difficulty, and category weights.

        Args:
            module_id: Module ID to assign questions to
            module_type: Type of module (math or rw)
            difficulty_level: Overall difficulty (easy, medium, hard) for adaptive testing
        """
        # Determine section type
        section = "math" if "math" in module_type.value else "reading_writing"

        # Select difficulty distribution
        if difficulty_level == "easy":
            distribution = self.EASY_DISTRIBUTION
        elif difficulty_level == "hard":
            distribution = self.HARD_DISTRIBUTION
        else:
            distribution = self.MEDIUM_DISTRIBUTION

        # Fetch categories with their weights for this section
        categories_response = (
            self.db.table("categories")
            .select("id, name, weight_in_section, topics(id, name)")
            .eq("section", section)
            .execute()
        )

        if not categories_response.data:
            raise ValueError(f"No categories found for section: {section}")

        # Fetch all active questions for this section
        questions_response = (
            self.db.table("questions")
            .select("*, topics(id, category_id)")
            .eq("is_active", True)
            .execute()
        )

        # Group questions by category and difficulty
        # Structure: {category_id: {difficulty: [questions]}}
        questions_by_category = {}
        for q in questions_response.data:
            topic = q.get("topics")
            if not topic:
                continue

            category_id = topic.get("category_id")
            difficulty = q.get("difficulty")

            if category_id not in questions_by_category:
                questions_by_category[category_id] = {"E": [], "M": [], "H": []}

            if difficulty in ["E", "M", "H"]:
                questions_by_category[category_id][difficulty].append(q)

        # Select questions per category based on weights
        selected_questions = []

        for category in categories_response.data:
            category_id = category["id"]
            category_weight = category["weight_in_section"] / 100.0
            category_target = int(self.QUESTIONS_PER_MODULE * category_weight)

            if category_target == 0:
                continue

            # Get questions for this category
            category_questions = questions_by_category.get(category_id, {"E": [], "M": [], "H": []})

            # Distribute questions within category by difficulty
            category_selected = []
            for difficulty, ratio in distribution.items():
                difficulty_target = int(category_target * ratio)
                available = category_questions[difficulty]

                if len(available) >= difficulty_target:
                    selected = random.sample(available, difficulty_target)
                else:
                    selected = available

                category_selected.extend(selected)

            # If we don't have enough for this category, fill from any available in category
            if len(category_selected) < category_target:
                remaining_needed = category_target - len(category_selected)
                selected_ids = {q["id"] for q in category_selected}

                # Pool all questions in category not yet selected
                remaining_pool = []
                for diff_questions in category_questions.values():
                    for q in diff_questions:
                        if q["id"] not in selected_ids:
                            remaining_pool.append(q)

                if remaining_pool:
                    additional = random.sample(
                        remaining_pool, min(remaining_needed, len(remaining_pool))
                    )
                    category_selected.extend(additional)

            selected_questions.extend(category_selected)

        # If we still don't have enough questions total, fill from any available
        if len(selected_questions) < self.QUESTIONS_PER_MODULE:
            remaining_needed = self.QUESTIONS_PER_MODULE - len(selected_questions)
            selected_ids = {q["id"] for q in selected_questions}

            # Pool all available questions
            all_questions = []
            for cat_questions in questions_by_category.values():
                for diff_questions in cat_questions.values():
                    all_questions.extend(diff_questions)

            remaining_pool = [q for q in all_questions if q["id"] not in selected_ids]

            if remaining_pool:
                additional = random.sample(
                    remaining_pool, min(remaining_needed, len(remaining_pool))
                )
                selected_questions.extend(additional)

        # Shuffle questions for randomness
        random.shuffle(selected_questions)

        # Insert questions with display order
        batch_inserts = []
        for idx, question in enumerate(selected_questions[:self.QUESTIONS_PER_MODULE], start=1):
            question_data = {
                "module_id": module_id,
                "question_id": question["id"],
                "display_order": idx,
                "status": MockQuestionStatus.NOT_STARTED.value,
                "is_marked_for_review": False,
            }
            batch_inserts.append(question_data)

        if batch_inserts:
            self.db.table("mock_exam_questions").insert(batch_inserts).execute()

    async def start_module(self, module_id: str, user_id: str) -> Dict:
        """
        Start a module, setting status and start time.

        Args:
            module_id: Module ID to start
            user_id: User ID starting the module

        Returns:
            Updated module data
        """
        # Verify module belongs to user
        module_response = (
            self.db.table("mock_exam_modules")
            .select("*, mock_exams!inner(user_id)")
            .eq("id", module_id)
            .execute()
        )

        if not module_response.data:
            raise ValueError("Module not found")

        module = module_response.data[0]
        if module["mock_exams"]["user_id"] != user_id:
            raise PermissionError("Module does not belong to user")

        # Update module status
        update_data = {
            "status": ModuleStatus.IN_PROGRESS.value,
            "started_at": datetime.utcnow().isoformat(),
        }

        updated_module = (
            self.db.table("mock_exam_modules")
            .update(update_data)
            .eq("id", module_id)
            .execute()
        )

        # Update exam status if this is the first module
        exam_id = module["exam_id"]
        exam_response = self.db.table("mock_exams").select("*").eq("id", exam_id).execute()
        exam = exam_response.data[0]

        if exam["status"] == MockExamStatus.NOT_STARTED.value:
            self.db.table("mock_exams").update({
                "status": MockExamStatus.IN_PROGRESS.value,
                "started_at": datetime.utcnow().isoformat(),
            }).eq("id", exam_id).execute()

        return updated_module.data[0]

    async def complete_module(
        self, module_id: str, user_id: str, time_remaining_seconds: Optional[int] = None
    ) -> Dict:
        """
        Complete a module and calculate raw score. Generate adaptive questions for next module if needed.

        Args:
            module_id: Module ID to complete
            user_id: User ID completing the module
            time_remaining_seconds: Remaining time when module was completed

        Returns:
            Completed module with score
        """
        # Verify module belongs to user
        module_response = (
            self.db.table("mock_exam_modules")
            .select("*, mock_exams!inner(user_id, id)")
            .eq("id", module_id)
            .execute()
        )

        if not module_response.data:
            raise ValueError("Module not found")

        module = module_response.data[0]
        if module["mock_exams"]["user_id"] != user_id:
            raise PermissionError("Module does not belong to user")

        # Calculate raw score (count correct answers)
        questions_response = (
            self.db.table("mock_exam_questions")
            .select("*")
            .eq("module_id", module_id)
            .execute()
        )

        correct_count = sum(
            1 for q in questions_response.data if q.get("is_correct") is True
        )

        # Update module
        update_data = {
            "status": ModuleStatus.COMPLETED.value,
            "completed_at": datetime.utcnow().isoformat(),
            "raw_score": correct_count,
            "time_remaining_seconds": time_remaining_seconds,
        }

        self.db.table("mock_exam_modules").update(update_data).eq("id", module_id).execute()

        # If this is module 1, generate adaptive questions for module 2
        exam_id = module["mock_exams"]["id"]
        module_type = module["module_type"]
        module_number = module["module_number"]

        if module_number == 1:
            # Determine difficulty for module 2 based on module 1 performance
            percentage = correct_count / self.QUESTIONS_PER_MODULE
            if percentage >= 0.7:
                next_difficulty = "hard"
            elif percentage >= 0.4:
                next_difficulty = "medium"
            else:
                next_difficulty = "easy"

            # Get module 2 of same section
            section_prefix = "math" if "math" in module_type else "rw"
            next_module_type = f"{section_prefix}_module_2"

            next_module_response = (
                self.db.table("mock_exam_modules")
                .select("*")
                .eq("exam_id", exam_id)
                .eq("module_type", next_module_type)
                .execute()
            )

            if next_module_response.data:
                next_module = next_module_response.data[0]
                await self._generate_module_questions(
                    next_module["id"],
                    ModuleType(next_module_type),
                    difficulty_level=next_difficulty,
                )

        # Check if all modules are completed
        all_modules_response = (
            self.db.table("mock_exam_modules")
            .select("*")
            .eq("exam_id", exam_id)
            .execute()
        )

        all_completed = all(
            m["status"] == ModuleStatus.COMPLETED.value
            for m in all_modules_response.data
        )

        if all_completed:
            await self._finalize_exam(exam_id)

        return module

    async def _finalize_exam(self, exam_id: str) -> None:
        """
        Finalize exam by calculating scores and updating exam record.

        Args:
            exam_id: Exam ID to finalize
        """
        # Get all modules
        modules_response = (
            self.db.table("mock_exam_modules")
            .select("*")
            .eq("exam_id", exam_id)
            .execute()
        )

        # Calculate section scores
        math_raw = sum(
            m["raw_score"] or 0
            for m in modules_response.data
            if "math" in m["module_type"]
        )
        rw_raw = sum(
            m["raw_score"] or 0
            for m in modules_response.data
            if "rw" in m["module_type"]
        )

        # Convert raw scores to scaled scores (simplified linear scaling)
        # Real SAT uses complex equating, but this is a reasonable approximation
        math_score = self._convert_to_scaled_score(math_raw, self.QUESTIONS_PER_MODULE * 2)
        rw_score = self._convert_to_scaled_score(rw_raw, self.QUESTIONS_PER_MODULE * 2)
        total_score = math_score + rw_score

        # Update exam
        update_data = {
            "status": MockExamStatus.COMPLETED.value,
            "completed_at": datetime.utcnow().isoformat(),
            "math_score": math_score,
            "rw_score": rw_score,
            "total_score": total_score,
        }

        self.db.table("mock_exams").update(update_data).eq("id", exam_id).execute()

    def _convert_to_scaled_score(self, raw_score: int, total_questions: int) -> int:
        """
        Convert raw score to SAT scaled score (200-800).
        Uses simplified linear scaling and rounds to nearest 10.

        Args:
            raw_score: Number of correct answers
            total_questions: Total questions in section

        Returns:
            Scaled score between 200 and 800 (rounded to nearest 10)
        """
        if raw_score <= 0:
            return 200

        percentage = raw_score / total_questions
        # Linear scale from 200 to 800
        scaled = 200 + (percentage * 600)
        # Round to nearest 10
        scaled = round(scaled / 10) * 10
        return int(min(800, max(200, scaled)))

    async def submit_answer(
        self,
        module_id: str,
        question_id: str,
        user_answer: List[str],
        status: str,
        is_marked_for_review: bool,
        user_id: str,
    ) -> Tuple[bool, List[str]]:
        """
        Submit an answer for a question in a module.

        Args:
            module_id: Module ID
            question_id: Question ID
            user_answer: User's answer
            status: Question status
            is_marked_for_review: Whether question is marked for review
            user_id: User ID submitting answer

        Returns:
            Tuple of (is_correct, correct_answer)
        """
        # Verify module belongs to user
        module_response = (
            self.db.table("mock_exam_modules")
            .select("*, mock_exams!inner(user_id)")
            .eq("id", module_id)
            .execute()
        )

        if not module_response.data:
            raise ValueError("Module not found")

        if module_response.data[0]["mock_exams"]["user_id"] != user_id:
            raise PermissionError("Module does not belong to user")

        # Get the mock exam question and actual question
        meq_response = (
            self.db.table("mock_exam_questions")
            .select("*, questions(correct_answer, acceptable_answers)")
            .eq("module_id", module_id)
            .eq("question_id", question_id)
            .execute()
        )

        if not meq_response.data:
            raise ValueError("Question not found in module")

        meq = meq_response.data[0]
        question = meq["questions"]

        # Check correctness
        correct_answer = question.get("correct_answer", [])
        acceptable_answers = question.get("acceptable_answers", [])

        def normalize_answer(ans_list):
            if not ans_list:
                return []
            return [str(a).strip().lower() for a in ans_list]

        normalized_user = normalize_answer(user_answer)
        normalized_correct = normalize_answer(correct_answer)
        normalized_acceptable = normalize_answer(acceptable_answers) if acceptable_answers else []

        is_correct = normalized_user == normalized_correct or (
            normalized_acceptable
            and len(normalized_user) > 0
            and normalized_user[0] in normalized_acceptable
        )

        # Update mock exam question
        update_data = {
            "status": status,
            "user_answer": user_answer,
            "is_correct": is_correct,
            "is_marked_for_review": is_marked_for_review,
            "answered_at": datetime.utcnow().isoformat(),
        }

        self.db.table("mock_exam_questions").update(update_data).eq("id", meq["id"]).execute()

        return is_correct, correct_answer
