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
from app.services.bkt_service import BKTService
from app.services.course_config_provider import CourseConfigProvider


class MockExamService:
    """Service for managing mock exams, driven by course configuration."""

    def __init__(self, db: Client):
        self.db = db
        self._config: Optional[CourseConfigProvider] = None

    async def _get_config(self, course_slug: str = "sat") -> CourseConfigProvider:
        """Load and cache course config."""
        if self._config is None:
            self._config = await CourseConfigProvider(self.db).load(course_slug)
        return self._config

    async def create_mock_exam(
        self, user_id: str, exam_type: str = "full_length", course_slug: str = "sat"
    ) -> Dict:
        """
        Create a new mock exam using course configuration for modules.

        Args:
            user_id: User ID creating the exam
            exam_type: Type of exam (full_length or section_only)
            course_slug: Course to create exam for

        Returns:
            Dict containing exam and modules data
        """
        config = await self._get_config(course_slug)

        # Create mock exam record
        exam_data = {
            "user_id": user_id,
            "exam_type": exam_type,
            "status": MockExamStatus.NOT_STARTED.value,
        }
        if config.course_id:
            exam_data["course_id"] = config.course_id

        exam_response = self.db.table("mock_exams").insert(exam_data).execute()
        exam = exam_response.data[0]
        exam_id = exam["id"]

        # Create modules from course config
        modules = []
        for mod_cfg in config.mock_exam_modules:
            module_data = {
                "exam_id": exam_id,
                "module_type": mod_cfg["key"],
                "module_number": mod_cfg["number"],
                "time_limit_minutes": mod_cfg["time_limit_minutes"],
                "status": ModuleStatus.NOT_STARTED.value,
            }
            module_response = (
                self.db.table("mock_exam_modules").insert(module_data).execute()
            )
            module = module_response.data[0]
            modules.append(module)

            # Generate questions for module 1 of each section
            # Module 2 questions generated after module 1 completes (adaptive)
            if mod_cfg["number"] == 1:
                await self._generate_module_questions(
                    module["id"], ModuleType(mod_cfg["key"]), difficulty_level="medium"
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
        # Check if questions already exist for this module to prevent duplicates
        existing_count = self.db.table("mock_exam_questions").select(
            "id", count="exact"
        ).eq("module_id", module_id).execute().count

        if existing_count and existing_count > 0:
            return  # Questions already generated, skip

        # Use course config for section and difficulty distribution
        config = await self._get_config()
        section = config.get_module_section(module_type.value)
        distribution = config.get_difficulty_distribution(difficulty_level)

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
        # Filter by section through topics -> categories relationship
        questions_response = (
            self.db.table("questions")
            .select("*, topics(id, category_id, categories(section))")
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

            # Filter by section - only include questions from the correct section
            category = topic.get("categories")
            if not category or category.get("section") != section:
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
            category_target = int(config.questions_per_module * category_weight)

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
        if len(selected_questions) < config.questions_per_module:
            remaining_needed = config.questions_per_module - len(selected_questions)
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
        for idx, question in enumerate(selected_questions[:config.questions_per_module], start=1):
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
            config = await self._get_config()
            thresholds = config.adaptive_thresholds
            percentage = correct_count / config.questions_per_module
            if percentage >= thresholds.get("hard_threshold", 0.7):
                next_difficulty = "hard"
            elif percentage >= thresholds.get("medium_threshold", 0.4):
                next_difficulty = "medium"
            else:
                next_difficulty = "easy"

            # Get module 2 of same section from course config
            next_module_type = config.get_module_2_key_for_section(module_type)
            if not next_module_type:
                # Fallback: infer from key
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
            await self._finalize_exam(exam_id, user_id)

        return module

    async def _finalize_exam(self, exam_id: str, user_id: str) -> None:
        """
        Finalize exam by calculating scores, updating mastery, and updating exam record.

        Args:
            exam_id: Exam ID to finalize
            user_id: User ID who took the exam
        """
        # Get all modules
        modules_response = (
            self.db.table("mock_exam_modules")
            .select("*")
            .eq("exam_id", exam_id)
            .execute()
        )

        # Calculate section scores dynamically from course config
        config = await self._get_config()
        section_raw_scores = {}
        for mod in modules_response.data:
            section_key = config.get_module_section(mod["module_type"])
            if section_key not in section_raw_scores:
                section_raw_scores[section_key] = 0
            section_raw_scores[section_key] += mod["raw_score"] or 0

        # Convert raw scores to scaled scores using course config
        section_scaled = {}
        total_score = 0
        for section_key, raw_score in section_raw_scores.items():
            # Count modules in this section for total questions
            section_modules = [m for m in config.mock_exam_modules if m["section"] == section_key]
            total_questions = config.questions_per_module * len(section_modules)
            scaled = config.convert_to_scaled_score(raw_score, total_questions, section_key)
            section_scaled[section_key] = scaled
            total_score += scaled

        # Backward-compatible aliases
        math_score = section_scaled.get("math", 200)
        rw_score = section_scaled.get("reading_writing", 200)

        # Update skill mastery based on exam performance
        try:
            await self._update_mastery_from_exam(exam_id, user_id)
        except Exception as e:
            print(f"[MOCK EXAM ERROR] Failed to update mastery: {e}")
            # Don't re-raise - we still want to finalize the exam even if mastery update fails

        # Update exam
        update_data = {
            "status": MockExamStatus.COMPLETED.value,
            "completed_at": datetime.utcnow().isoformat(),
            "math_score": math_score,
            "rw_score": rw_score,
            "total_score": total_score,
        }

        self.db.table("mock_exams").update(update_data).eq("id", exam_id).execute()

    async def _update_mastery_from_exam(self, exam_id: str, user_id: str) -> None:
        """
        Update user's skill mastery based on mock exam performance.

        Processes each answered question through BKT iteratively to update mastery probabilities.

        Args:
            exam_id: Exam ID
            user_id: User ID who took the exam
        """
        # Get all modules for this exam
        modules_response = self.db.table("mock_exam_modules").select("id").eq(
            "exam_id", exam_id
        ).execute()

        if not modules_response.data:
            return

        module_ids = [m["id"] for m in modules_response.data]

        # Fetch all answered questions with topic info
        questions_response = self.db.table("mock_exam_questions").select(
            "is_correct, questions(topic_id)"
        ).in_("module_id", module_ids).execute()

        if not questions_response.data:
            return

        # Initialize BKT service
        bkt_service = BKTService(self.db)

        # Update mastery for each answered question
        for q in questions_response.data:
            if q.get("is_correct") is None:
                continue  # Skip unanswered questions

            try:
                topic_id = q["questions"]["topic_id"]
                is_correct = q["is_correct"]

                # Update mastery through BKT
                await bkt_service.update_mastery(
                    user_id=user_id,
                    skill_id=topic_id,
                    is_correct=is_correct
                )
            except Exception as e:
                # Log error but continue processing other questions
                print(f"[MOCK EXAM ERROR] Failed to process question: {e}")
                continue

    def _convert_to_scaled_score(self, raw_score: int, total_questions: int, section_key: str = "math") -> int:
        """
        Convert raw score to scaled score using course config.
        Falls back to default SAT ranges if config not loaded.

        Args:
            raw_score: Number of correct answers
            total_questions: Total questions in section
            section_key: Section key for score range lookup

        Returns:
            Scaled score (rounded to nearest increment)
        """
        if self._config:
            return self._config.convert_to_scaled_score(raw_score, total_questions, section_key)

        # Fallback: default SAT scoring
        if raw_score <= 0:
            return 200
        percentage = raw_score / total_questions
        scaled = 200 + (percentage * 600)
        scaled = round(scaled / 10) * 10
        return int(min(800, max(200, scaled)))

    async def submit_answers_batch(
        self,
        module_id: str,
        answers: List[Dict],  # List of {question_id, user_answer, status, is_marked_for_review}
        user_id: str,
    ) -> Tuple[List[Dict], int, int]:
        """
        Submit multiple answers efficiently.

        Args:
            module_id: Module ID
            answers: List of answer dictionaries
            user_id: User ID submitting answers

        Returns:
            Tuple of (results list, successful count, failed count)
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

        if not answers:
            return [], 0, 0

        question_ids = [a["question_id"] for a in answers]

        # Bulk fetch mock exam questions and actual questions
        # Note: 'in_' expects a list of strings
        meq_response = (
            self.db.table("mock_exam_questions")
            .select("id, question_id, questions(correct_answer, acceptable_answers)")
            .eq("module_id", module_id)
            .in_("question_id", question_ids)
            .execute()
        )

        meq_map = {item["question_id"]: item for item in meq_response.data}
        
        updates = []
        results = []
        successful = 0
        failed = 0
        
        # Helper for normalization
        def normalize_answer(ans_list):
            if not ans_list:
                return []
            if isinstance(ans_list, str):
                return [ans_list.strip().lower()]
            try:
                return [str(a).strip().lower() for a in ans_list]
            except TypeError:
                return []

        for ans in answers:
            qid = ans["question_id"]
            if qid not in meq_map:
                results.append({
                    "question_id": qid,
                    "success": False,
                    "error": "Question not found in module"
                })
                failed += 1
                continue

            meq = meq_map[qid]
            question = meq["questions"]
            
            # Check correctness
            correct_answer = question.get("correct_answer", [])
            acceptable_answers = question.get("acceptable_answers", [])
            user_answer = ans["user_answer"]

            normalized_user = normalize_answer(user_answer)
            normalized_correct = normalize_answer(correct_answer)
            normalized_acceptable = normalize_answer(acceptable_answers) if acceptable_answers else []

            is_correct_bool = normalized_user == normalized_correct or (
                bool(normalized_acceptable)
                and len(normalized_user) > 0
                and normalized_user[0] in normalized_acceptable
            )
            is_correct = bool(is_correct_bool)

            # Prepare update payload
            updates.append({
                "id": meq["id"], # Primary key for upsert
                "status": ans["status"],
                "user_answer": user_answer,
                "is_correct": is_correct,
                "is_marked_for_review": ans.get("is_marked_for_review", False),
                "answered_at": datetime.utcnow().isoformat(),
            })
            
            results.append({
                "question_id": qid,
                "success": True,
                "is_correct": is_correct
            })
            successful += 1

        # Perform bulk update
        if updates:
            try:
                self.db.table("mock_exam_questions").upsert(updates).execute()
            except Exception as e:
                # Log the detailed error for debugging
                print(f"[BATCH SUBMIT ERROR] Bulk upsert failed: {str(e)}")
                if hasattr(e, 'details'):
                    print(f"[BATCH SUBMIT ERROR] Details: {e.details}")
                if hasattr(e, 'hint'):
                    print(f"[BATCH SUBMIT ERROR] Hint: {e.hint}")
                # Re-raise so the API returns 500
                raise e

        return results, successful, failed

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
            # Ensure we are working with strings, handle non-iterable items gracefully
            if isinstance(ans_list, str):
                return [ans_list.strip().lower()]
            try:
                return [str(a).strip().lower() for a in ans_list]
            except TypeError:
                return []

        normalized_user = normalize_answer(user_answer)
        normalized_correct = normalize_answer(correct_answer)
        normalized_acceptable = normalize_answer(acceptable_answers) if acceptable_answers else []

        is_correct_bool = normalized_user == normalized_correct or (
            bool(normalized_acceptable)
            and len(normalized_user) > 0
            and normalized_user[0] in normalized_acceptable
        )

        # Explicitly cast to bool to avoid any ambiguity
        is_correct = bool(is_correct_bool)

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
