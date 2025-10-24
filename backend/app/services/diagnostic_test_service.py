from datetime import datetime
from typing import List, Dict, Optional, Tuple
from supabase import Client
import random
from app.models.diagnostic_test import DiagnosticTestStatus, DiagnosticQuestionStatus
from app.services.bkt_service import BKTService


class DiagnosticTestService:
    """Service for managing diagnostic tests that establish initial BKT mastery baselines."""

    # Diagnostic test configuration
    TOTAL_QUESTIONS = 40
    MATH_QUESTIONS = 20
    RW_QUESTIONS = 20

    # Difficulty distribution (medium difficulty for baseline assessment)
    DIFFICULTY_DISTRIBUTION = {"E": 0.33, "M": 0.34, "H": 0.33}

    def __init__(self, db: Client):
        self.db = db

    async def create_diagnostic_test(self, user_id: str) -> Dict:
        """
        Create a new diagnostic test with 40 questions (20 math, 20 R&W).

        Args:
            user_id: User ID creating the test

        Returns:
            Dict containing test data
        """
        # Create diagnostic test record
        test_data = {
            "user_id": user_id,
            "status": DiagnosticTestStatus.NOT_STARTED.value,
            "total_questions": self.TOTAL_QUESTIONS,
        }

        test_response = self.db.table("diagnostic_tests").insert(test_data).execute()
        test = test_response.data[0]
        test_id = test["id"]

        # Generate questions for both sections
        await self._generate_test_questions(test_id, "math", self.MATH_QUESTIONS)
        await self._generate_test_questions(test_id, "reading_writing", self.RW_QUESTIONS)

        return {"test": test}

    async def _generate_test_questions(
        self, test_id: str, section: str, num_questions: int
    ) -> None:
        """
        Generate questions for a specific section of the diagnostic test.

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

        # Fetch all active questions for this section
        questions_response = (
            self.db.table("questions")
            .select("*, topics(id, category_id, categories(section))")
            .eq("is_active", True)
            .execute()
        )

        # Filter questions for this section
        section_questions = []
        for q in questions_response.data:
            topic = q.get("topics")
            if topic and topic.get("categories", {}).get("section") == section:
                section_questions.append(q)

        # Group questions by difficulty
        by_difficulty = {"E": [], "M": [], "H": []}
        for q in section_questions:
            difficulty = q.get("difficulty")
            if difficulty in by_difficulty:
                by_difficulty[difficulty].append(q)

        # Select questions based on difficulty distribution
        selected_questions = []

        for difficulty, ratio in self.DIFFICULTY_DISTRIBUTION.items():
            target_count = int(num_questions * ratio)
            available = by_difficulty[difficulty]

            if len(available) >= target_count:
                selected = random.sample(available, target_count)
            else:
                selected = available

            selected_questions.extend(selected)

        # Fill remaining slots if needed
        if len(selected_questions) < num_questions:
            remaining_needed = num_questions - len(selected_questions)
            selected_ids = {q["id"] for q in selected_questions}
            remaining_pool = [q for q in section_questions if q["id"] not in selected_ids]

            if remaining_pool:
                additional = random.sample(
                    remaining_pool, min(remaining_needed, len(remaining_pool))
                )
                selected_questions.extend(additional)

        # Shuffle questions for randomness
        random.shuffle(selected_questions)

        # Insert questions with display order (offset by section)
        batch_inserts = []
        start_order = 1 if section == "reading_writing" else self.RW_QUESTIONS + 1

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

        # Calculate performance
        total_correct = sum(1 for q in questions_response.data if q.get("is_correct") is True)

        math_questions = [q for q in questions_response.data if q["section"] == "math"]
        math_correct = sum(1 for q in math_questions if q.get("is_correct") is True)

        rw_questions = [q for q in questions_response.data if q["section"] == "reading_writing"]
        rw_correct = sum(1 for q in rw_questions if q.get("is_correct") is True)

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
