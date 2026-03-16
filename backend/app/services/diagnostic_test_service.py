from datetime import datetime
from typing import List, Dict, Optional, Tuple
from supabase import Client
import random
from app.models.diagnostic_test import DiagnosticTestStatus, DiagnosticQuestionStatus
from app.services.bkt_service import BKTService
from app.services.course_config_provider import CourseConfigProvider


class DiagnosticTestService:
    """Service for managing diagnostic tests that establish initial BKT mastery baselines."""

    def __init__(self, db: Client):
        self.db = db
        self._config: Optional[CourseConfigProvider] = None

    async def _get_config(self, course_slug: str = "sat") -> CourseConfigProvider:
        """Load and cache course config."""
        if self._config is None:
            self._config = await CourseConfigProvider(self.db).load(course_slug)
        return self._config

    async def create_diagnostic_test(self, user_id: str, course_slug: str = "sat") -> Dict:
        """
        Create a new diagnostic test using course config for question distribution.

        Args:
            user_id: User ID creating the test
            course_slug: Course slug to load config from

        Returns:
            Dict containing test data
        """
        config = await self._get_config(course_slug)
        section_dist = config.diagnostic_section_distribution
        total_questions = config.diagnostic_total_questions

        # Create diagnostic test record
        test_data = {
            "user_id": user_id,
            "status": DiagnosticTestStatus.NOT_STARTED.value,
            "total_questions": total_questions,
        }

        # Include course_id if available
        if config.course_id:
            test_data["course_id"] = config.course_id

        test_response = self.db.table("diagnostic_tests").insert(test_data).execute()
        test = test_response.data[0]
        test_id = test["id"]

        # Generate questions for each section based on course config
        cumulative_order = 0
        for section_key, num_questions in section_dist.items():
            await self._generate_test_questions(
                test_id, section_key, num_questions, start_order=cumulative_order + 1
            )
            cumulative_order += num_questions

        return {"test": test}

    async def _generate_test_questions(
        self, test_id: str, section: str, num_questions: int, start_order: int = 1
    ) -> None:
        """
        Generate questions for a specific section of the diagnostic test.
        Ensures at least 1 question per topic for comprehensive baseline assessment.

        Args:
            test_id: Test ID to assign questions to
            section: Section type (math or reading_writing)
            num_questions: Number of questions to generate
        """
        # Fetch all categories for this section
        categories_response = (
            self.db.table("categories")
            .select("id, name, topics(id, name)")
            .eq("section", section)
            .execute()
        )

        if not categories_response.data:
            raise ValueError(f"No categories found for section: {section}")

        # Get all topics for this section
        all_topics = []
        for category in categories_response.data:
            topics = category.get("topics", [])
            all_topics.extend(topics)

        if not all_topics:
            raise ValueError(f"No topics found for section: {section}")

        # Fetch all active questions for this section, grouped by topic
        questions_response = (
            self.db.table("questions")
            .select("*, topics(id, name, category_id, categories(section))")
            .eq("is_active", True)
            .execute()
        )

        # Group questions by topic
        questions_by_topic = {}
        for q in questions_response.data:
            topic = q.get("topics")
            if topic and topic.get("categories", {}).get("section") == section:
                topic_id = topic["id"]
                if topic_id not in questions_by_topic:
                    questions_by_topic[topic_id] = []
                questions_by_topic[topic_id].append(q)

        # Filter to topics that have questions available
        available_topics = [t for t in all_topics if t["id"] in questions_by_topic]

        if not available_topics:
            raise ValueError(f"No questions available for section: {section}")

        selected_questions = []

        # Strategy: Distribute questions across topics
        # Round 1: Assign 1 question per topic (up to num_questions)
        topics_to_cover = min(len(available_topics), num_questions)
        sampled_topics = random.sample(available_topics, topics_to_cover)

        for topic in sampled_topics:
            topic_id = topic["id"]
            available_questions = questions_by_topic[topic_id]

            if available_questions:
                # Select one question from this topic (prefer medium difficulty)
                medium_questions = [q for q in available_questions if q.get("difficulty") == "M"]
                if medium_questions:
                    selected = random.choice(medium_questions)
                else:
                    selected = random.choice(available_questions)

                selected_questions.append(selected)

        # Round 2: Fill remaining slots from all available questions
        if len(selected_questions) < num_questions:
            remaining_needed = num_questions - len(selected_questions)
            selected_ids = {q["id"] for q in selected_questions}

            # Pool all remaining questions
            remaining_pool = []
            for questions in questions_by_topic.values():
                for q in questions:
                    if q["id"] not in selected_ids:
                        remaining_pool.append(q)

            # Group by difficulty for balanced selection
            by_difficulty = {"E": [], "M": [], "H": []}
            for q in remaining_pool:
                difficulty = q.get("difficulty")
                if difficulty in by_difficulty:
                    by_difficulty[difficulty].append(q)

            # Select additional questions based on difficulty distribution
            config = await self._get_config()
            difficulty_dist = config.diagnostic_difficulty_distribution
            for difficulty, ratio in difficulty_dist.items():
                target_count = int(remaining_needed * ratio)
                available = by_difficulty[difficulty]

                if len(available) >= target_count:
                    selected = random.sample(available, target_count)
                else:
                    selected = available

                selected_questions.extend(selected)

            # Fill any remaining slots
            if len(selected_questions) < num_questions:
                still_needed = num_questions - len(selected_questions)
                selected_ids = {q["id"] for q in selected_questions}
                final_pool = [q for q in remaining_pool if q["id"] not in selected_ids]

                if final_pool:
                    additional = random.sample(
                        final_pool, min(still_needed, len(final_pool))
                    )
                    selected_questions.extend(additional)

        # Shuffle questions for randomness
        random.shuffle(selected_questions)

        # Insert questions with display order
        batch_inserts = []
        for idx, question in enumerate(selected_questions[:num_questions], start=0):
            question_data = {
                "test_id": test_id,
                "question_id": question["id"],
                "section": section,
                "display_order": start_order + idx,
                "status": DiagnosticQuestionStatus.NOT_STARTED.value,
                "is_marked_for_review": False,
            }
            batch_inserts.append(question_data)

        if batch_inserts:
            self.db.table("diagnostic_test_questions").insert(batch_inserts).execute()

    async def start_test(self, test_id: str, user_id: str) -> Dict:
        """
        Start a diagnostic test, setting status and start time.

        Args:
            test_id: Test ID to start
            user_id: User ID starting the test

        Returns:
            Updated test data
        """
        # Verify test belongs to user
        test_response = (
            self.db.table("diagnostic_tests")
            .select("*")
            .eq("id", test_id)
            .execute()
        )

        if not test_response.data:
            raise ValueError("Test not found")

        test = test_response.data[0]
        if test["user_id"] != user_id:
            raise PermissionError("Test does not belong to user")

        # Update test status
        update_data = {
            "status": DiagnosticTestStatus.IN_PROGRESS.value,
            "started_at": datetime.utcnow().isoformat(),
        }

        updated_test = (
            self.db.table("diagnostic_tests")
            .update(update_data)
            .eq("id", test_id)
            .execute()
        )

        return updated_test.data[0]

    async def submit_answer(
        self,
        test_id: str,
        question_id: str,
        user_answer: List[str],
        status: str,
        is_marked_for_review: bool,
        user_id: str,
    ) -> Tuple[bool, List[str]]:
        """
        Submit an answer for a question in a diagnostic test.

        Args:
            test_id: Test ID
            question_id: Question ID
            user_answer: User's answer
            status: Question status
            is_marked_for_review: Whether question is marked for review
            user_id: User ID submitting answer

        Returns:
            Tuple of (is_correct, correct_answer)
        """
        # Verify test belongs to user
        test_response = (
            self.db.table("diagnostic_tests")
            .select("*")
            .eq("id", test_id)
            .execute()
        )

        if not test_response.data:
            raise ValueError("Test not found")

        if test_response.data[0]["user_id"] != user_id:
            raise PermissionError("Test does not belong to user")

        # Get the diagnostic test question and actual question
        dtq_response = (
            self.db.table("diagnostic_test_questions")
            .select("*, questions(correct_answer, acceptable_answers)")
            .eq("test_id", test_id)
            .eq("question_id", question_id)
            .execute()
        )

        if not dtq_response.data:
            raise ValueError("Question not found in test")

        dtq = dtq_response.data[0]
        question = dtq["questions"]

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

        # Update diagnostic test question
        update_data = {
            "status": status,
            "user_answer": user_answer,
            "is_correct": is_correct,
            "is_marked_for_review": is_marked_for_review,
            "answered_at": datetime.utcnow().isoformat(),
        }

        self.db.table("diagnostic_test_questions").update(update_data).eq("id", dtq["id"]).execute()

        return is_correct, correct_answer

    async def complete_test(self, test_id: str, user_id: str) -> Dict:
        """
        Complete a diagnostic test and initialize BKT mastery baselines.

        Args:
            test_id: Test ID to complete
            user_id: User ID completing the test

        Returns:
            Completion summary with mastery initialization data
        """
        # Verify test belongs to user
        test_response = (
            self.db.table("diagnostic_tests")
            .select("*")
            .eq("id", test_id)
            .execute()
        )

        if not test_response.data:
            raise ValueError("Test not found")

        test = test_response.data[0]
        if test["user_id"] != user_id:
            raise PermissionError("Test does not belong to user")

        # Get all test questions with answers
        questions_response = (
            self.db.table("diagnostic_test_questions")
            .select("*, questions(topic_id, topics(id, name))")
            .eq("test_id", test_id)
            .execute()
        )

        # Calculate performance — dynamically per section from course config
        config = await self._get_config()
        total_correct = sum(1 for q in questions_response.data if q.get("is_correct") is True)

        # Build per-section stats dynamically
        section_stats = {}
        for section_key in config.section_keys:
            section_qs = [q for q in questions_response.data if q["section"] == section_key]
            section_stats[section_key] = sum(1 for q in section_qs if q.get("is_correct") is True)

        # Backward-compatible aliases
        math_correct = section_stats.get("math", 0)
        rw_correct = section_stats.get("reading_writing", 0)

        # Group by topic and calculate per-topic performance
        topic_performance = {}
        for q in questions_response.data:
            question_data = q.get("questions", {})
            topic_id = question_data.get("topic_id")

            if not topic_id:
                continue

            if topic_id not in topic_performance:
                topic_info = question_data.get("topics", {})
                topic_performance[topic_id] = {
                    "topic_name": topic_info.get("name", "Unknown"),
                    "correct": 0,
                    "total": 0
                }

            topic_performance[topic_id]["total"] += 1
            if q.get("is_correct"):
                topic_performance[topic_id]["correct"] += 1

        # Initialize BKT mastery for each topic based on performance
        bkt_service = BKTService(self.db)
        mastery_updates = []

        for topic_id, perf in topic_performance.items():
            percentage_correct = perf["correct"] / perf["total"] if perf["total"] > 0 else 0

            # Adjust for guessing (P(G) = 0.25)
            # Formula: P(L0) = (observed - guess) / (1 - guess)
            adjusted_mastery = max(0.01, min(0.99, (percentage_correct - 0.25) / 0.75))

            # Check if mastery record already exists
            existing_mastery = await bkt_service.get_user_mastery(user_id, topic_id)

            mastery_data = {
                "user_id": user_id,
                "skill_id": topic_id,
                "mastery_probability": round(adjusted_mastery, 4),
                "prior_knowledge": round(adjusted_mastery, 4),
                "total_attempts": perf["total"],
                "correct_attempts": perf["correct"],
                "last_practiced_at": datetime.utcnow().isoformat()
            }

            if existing_mastery:
                # Update existing record
                self.db.table("user_skill_mastery").update(mastery_data).eq(
                    "id", existing_mastery["id"]
                ).execute()
            else:
                # Create new record with default BKT parameters
                mastery_data.update({
                    "learn_rate": bkt_service.DEFAULT_LEARN,
                    "guess_probability": bkt_service.DEFAULT_GUESS,
                    "slip_probability": bkt_service.DEFAULT_SLIP,
                })
                self.db.table("user_skill_mastery").insert(mastery_data).execute()

            mastery_updates.append({
                "topic_id": topic_id,
                "topic_name": perf["topic_name"],
                "initial_mastery": round(adjusted_mastery, 4),
                "questions_answered": perf["total"],
                "correct_answers": perf["correct"]
            })

        # Initialize any remaining topics with default prior if not covered in diagnostic
        all_topics_response = self.db.table("topics").select("id").execute()
        for topic in all_topics_response.data:
            topic_id = topic["id"]
            if topic_id not in topic_performance:
                existing = await bkt_service.get_user_mastery(user_id, topic_id)
                if not existing:
                    await bkt_service.initialize_skill_mastery(user_id, topic_id)

        # Update test record
        update_data = {
            "status": DiagnosticTestStatus.COMPLETED.value,
            "completed_at": datetime.utcnow().isoformat(),
            "total_correct": total_correct,
            "math_correct": math_correct,
            "rw_correct": rw_correct,
        }

        self.db.table("diagnostic_tests").update(update_data).eq("id", test_id).execute()

        return {
            "mastery_initialized": True,
            "topics_assessed": len(topic_performance),
            "mastery_updates": mastery_updates,
            "total_correct": total_correct,
            "math_correct": math_correct,
            "rw_correct": rw_correct
        }
