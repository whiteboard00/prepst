from datetime import date, timedelta
from typing import List, Dict, Tuple
from uuid import UUID
from supabase import Client
import math
import random


class StudyPlanService:
    def __init__(self, db: Client):
        self.db = db

    async def _assign_questions_to_session(
        self,
        session_id: str,
        topics: List[Dict]
    ):
        """
        Assign specific questions to a practice session.

        For each topic, fetch available questions and assign them to session_questions.
        Questions are distributed across difficulty levels (Easy, Medium, Hard).
        """
        display_order = 1  # Track global display order across all topics
        batch_inserts = []  # Collect all inserts for this session

        for topic_info in topics:
            topic_id = topic_info["topic_id"]
            num_questions = topic_info["num_questions"]

            if num_questions == 0:
                continue

            # Fetch available questions for this topic
            # Get more questions than needed so we can distribute by difficulty
            questions_response = self.db.table("questions").select("*").eq(
                "topic_id", topic_id
            ).eq("is_active", True).limit(num_questions * 3).execute()

            available_questions = questions_response.data

            if not available_questions:
                # No questions available for this topic, skip
                continue

            # Distribute questions by difficulty (33% E, 33% M, 33% H)
            # Group by difficulty
            by_difficulty = {"E": [], "M": [], "H": []}
            for q in available_questions:
                difficulty = q.get("difficulty")
                if difficulty in by_difficulty:
                    by_difficulty[difficulty].append(q)

            # Calculate how many questions per difficulty
            questions_per_difficulty = num_questions // 3
            remainder = num_questions % 3

            selected_questions = []

            # Select from each difficulty level
            for i, (difficulty, questions) in enumerate([("E", by_difficulty["E"]), ("M", by_difficulty["M"]), ("H", by_difficulty["H"])]):
                # Add extra question to first difficulty level if there's remainder
                target = questions_per_difficulty + (1 if i < remainder else 0)

                # Randomly sample questions
                if len(questions) >= target:
                    selected = random.sample(questions, target)
                else:
                    # Not enough questions of this difficulty, take all available
                    selected = questions

                selected_questions.extend(selected)

            # If we still don't have enough questions, fill from any available
            if len(selected_questions) < num_questions:
                remaining_needed = num_questions - len(selected_questions)
                selected_ids = {q["id"] for q in selected_questions}
                remaining_pool = [q for q in available_questions if q["id"] not in selected_ids]

                if remaining_pool:
                    additional = random.sample(
                        remaining_pool,
                        min(remaining_needed, len(remaining_pool))
                    )
                    selected_questions.extend(additional)

            # Prepare session questions for batch insert
            for question in selected_questions:
                session_question_data = {
                    "session_id": session_id,
                    "question_id": question["id"],
                    "topic_id": topic_id,  # Denormalized for easier queries
                    "display_order": display_order,
                    "status": "not_started"
                }
                batch_inserts.append(session_question_data)
                display_order += 1

        # Batch insert all questions for this session at once
        if batch_inserts:
            # Insert in batches of 100 to avoid payload size limits
            batch_size = 100
            for i in range(0, len(batch_inserts), batch_size):
                batch = batch_inserts[i:i + batch_size]
                self.db.table("session_questions").insert(batch).execute()

    async def get_categories_and_topics(self) -> Dict[str, List[Dict]]:
        """
        Fetch all categories and their topics from the database.
        Returns a dictionary grouped by section (math, reading_writing).
        """
        # Fetch all categories
        categories_response = self.db.table("categories").select("*").execute()
        categories = categories_response.data

        # Fetch all topics
        topics_response = self.db.table("topics").select("*").execute()
        topics = topics_response.data

        # Group topics by category
        topics_by_category = {}
        for topic in topics:
            category_id = topic["category_id"]
            if category_id not in topics_by_category:
                topics_by_category[category_id] = []
            topics_by_category[category_id].append(topic)

        # Organize by section
        result = {
            "math": [],
            "reading_writing": []
        }

        for category in categories:
            category_with_topics = {
                **category,
                "topics": topics_by_category.get(category["id"], [])
            }
            result[category["section"]].append(category_with_topics)

        return result

    def calculate_total_questions(
        self,
        start_date: date,
        test_date: date,
        current_math: int,
        target_math: int,
        current_rw: int,
        target_rw: int
    ) -> Tuple[int, int, int]:
        """
        Calculate total number of questions needed based on time available
        and score improvement goals.

        Returns: (total_days, total_questions, questions_per_day)
        """
        total_days = (test_date - start_date).days

        if total_days <= 0:
            raise ValueError("Test date must be after start date")

        # Base questions per day (can be adjusted)
        # For MVP, let's use a simple formula:
        # - 20-30 questions per day is reasonable
        # - More days = can spread out more
        # - Bigger score gap = need more practice

        math_gap = target_math - current_math
        rw_gap = target_rw - current_rw
        total_gap = math_gap + rw_gap

        # Base: 20 questions per day
        # Add 1 question per 20 points of gap
        questions_per_day = 20 + (total_gap // 20)

        # Cap between 15-40 questions per day
        questions_per_day = max(15, min(40, questions_per_day))

        total_questions = questions_per_day * total_days

        return total_days, total_questions, questions_per_day

    def distribute_questions_by_topic(
        self,
        categories_and_topics: Dict[str, List[Dict]],
        total_questions: int,
        section: str
    ) -> Dict[str, int]:
        """
        Distribute questions across topics based on category weights.

        Returns: Dictionary mapping topic_id to number of questions
        """
        topic_distribution = {}
        section_data = categories_and_topics.get(section, [])

        for category in section_data:
            category_weight = category["weight_in_section"] / 100.0
            category_questions = int(total_questions * category_weight)

            topics = category["topics"]
            num_topics = len(topics)

            if num_topics == 0:
                continue

            # Distribute evenly among topics in this category
            base_questions = category_questions // num_topics
            remainder = category_questions % num_topics

            for i, topic in enumerate(topics):
                # Give remainder questions to first few topics
                extra = 1 if i < remainder else 0
                topic_distribution[topic["id"]] = base_questions + extra

        return topic_distribution

    def group_topics_into_sessions(
        self,
        topic_distribution: Dict[str, int],
        questions_per_day: int,
        topics_lookup: Dict[str, Dict]
    ) -> List[Dict]:
        """
        Group topics into practice sessions.
        Each session should have roughly questions_per_day questions.
        Sessions are capped at MAX_QUESTIONS_PER_SESSION to keep them manageable.

        Returns: List of sessions with topics and question counts
        """
        MAX_QUESTIONS_PER_SESSION = 40  # Hard cap on questions per session
        sessions = []
        current_session = []
        current_session_questions = 0

        for topic_id, num_questions in topic_distribution.items():
            if num_questions == 0:
                continue

            topic = topics_lookup.get(topic_id)
            if not topic:
                continue

            # If a single topic has more than MAX_QUESTIONS_PER_SESSION,
            # split it across multiple sessions
            remaining_questions = num_questions
            while remaining_questions > 0:
                # How many questions can we add to current session?
                space_in_session = MAX_QUESTIONS_PER_SESSION - current_session_questions
                
                # If current session is not empty and adding this topic would exceed limit,
                # start a new session
                if current_session and remaining_questions > space_in_session:
                    sessions.append(current_session)
                    current_session = []
                    current_session_questions = 0
                    space_in_session = MAX_QUESTIONS_PER_SESSION
                
                # Add as many questions as we can fit
                questions_to_add = min(remaining_questions, space_in_session)
                
                if questions_to_add > 0:
                    current_session.append({
                        "topic_id": topic_id,
                        "topic_name": topic["name"],
                        "num_questions": questions_to_add
                    })
                    current_session_questions += questions_to_add
                    remaining_questions -= questions_to_add
                
                # If current session is full, start a new one
                if current_session_questions >= MAX_QUESTIONS_PER_SESSION:
                    sessions.append(current_session)
                    current_session = []
                    current_session_questions = 0

        # Add the last session if it has content
        if current_session:
            sessions.append(current_session)

        return sessions

    def schedule_sessions(
        self,
        sessions: List[List[Dict]],
        start_date: date,
        total_days: int
    ) -> List[Dict]:
        """
        Assign dates to sessions, spreading them evenly across available days.

        Returns: List of sessions with scheduled dates
        """
        total_sessions = len(sessions)

        if total_sessions == 0:
            return []

        # Distribute sessions evenly across days
        sessions_per_day = total_sessions / total_days

        scheduled_sessions = []
        session_number = 1

        for i, session_topics in enumerate(sessions):
            # Calculate which day this session should be on
            # Start from tomorrow to avoid "overdue" sessions on creation day
            day_index = int(i / sessions_per_day) + 1
            scheduled_date = start_date + timedelta(days=day_index)

            scheduled_sessions.append({
                "session_number": session_number,
                "scheduled_date": scheduled_date,
                "topics": session_topics
            })

            session_number += 1

        return scheduled_sessions

    async def generate_study_plan(
        self,
        user_id: str,
        current_math_score: int,
        target_math_score: int,
        current_rw_score: int,
        target_rw_score: int,
        test_date: date,
        start_date: date = None
    ) -> Dict:
        """
        Generate a complete study plan for a user.

        Main algorithm:
        1. Calculate total questions needed based on time and score gaps
        2. Distribute questions across topics based on category weights
        3. Group topics into practice sessions
        4. Schedule sessions across available days
        5. Save to database
        """
        if start_date is None:
            start_date = date.today()

        # Step 1: Get categories and topics
        categories_and_topics = await self.get_categories_and_topics()

        # Create a lookup for all topics
        topics_lookup = {}
        for section_categories in categories_and_topics.values():
            for category in section_categories:
                for topic in category["topics"]:
                    topics_lookup[topic["id"]] = topic

        # Step 2: Calculate total questions
        total_days, total_questions, questions_per_day = self.calculate_total_questions(
            start_date,
            test_date,
            current_math_score,
            target_math_score,
            current_rw_score,
            target_rw_score
        )

        # Split questions 50/50 between math and reading/writing
        math_questions = total_questions // 2
        rw_questions = total_questions - math_questions

        # Step 3: Distribute questions by topic
        math_topic_distribution = self.distribute_questions_by_topic(
            categories_and_topics, math_questions, "math"
        )
        rw_topic_distribution = self.distribute_questions_by_topic(
            categories_and_topics, rw_questions, "reading_writing"
        )

        # Step 4: Group topics into sessions
        math_sessions = self.group_topics_into_sessions(
            math_topic_distribution, questions_per_day // 2, topics_lookup
        )
        rw_sessions = self.group_topics_into_sessions(
            rw_topic_distribution, questions_per_day // 2, topics_lookup
        )

        # Interleave math and RW sessions for variety
        all_sessions = []
        max_sessions = max(len(math_sessions), len(rw_sessions))
        for i in range(max_sessions):
            if i < len(math_sessions):
                all_sessions.append(math_sessions[i])
            if i < len(rw_sessions):
                all_sessions.append(rw_sessions[i])

        # Step 5: Schedule sessions
        scheduled_sessions = self.schedule_sessions(all_sessions, start_date, total_days)

        # Step 6: Save to database
        # First, deactivate any existing active study plans for this user
        self.db.table("study_plans").update({
            "is_active": False
        }).eq("user_id", user_id).eq("is_active", True).execute()

        # Create the study plan
        study_plan_data = {
            "user_id": user_id,
            "start_date": start_date.isoformat(),
            "test_date": test_date.isoformat(),
            "current_math_score": current_math_score,
            "target_math_score": target_math_score,
            "current_rw_score": current_rw_score,
            "target_rw_score": target_rw_score,
            "is_active": True
        }

        study_plan_response = self.db.table("study_plans").insert(study_plan_data).execute()
        study_plan = study_plan_response.data[0]
        study_plan_id = study_plan["id"]

        # Create practice sessions
        for session in scheduled_sessions:
            session_data = {
                "study_plan_id": study_plan_id,
                "scheduled_date": session["scheduled_date"].isoformat(),
                "session_number": session["session_number"],
                "status": "pending"
            }

            session_response = self.db.table("practice_sessions").insert(session_data).execute()
            session_id = session_response.data[0]["id"]

            # Assign questions to session
            await self._assign_questions_to_session(session_id, session["topics"])

        return {
            "study_plan": study_plan,
            "total_sessions": len(scheduled_sessions),
            "total_days": total_days,
            "sessions_per_day": round(len(scheduled_sessions) / total_days, 2)
        }

    async def get_study_plan_by_user(self, user_id: str) -> Dict:
        """
        Get the active study plan for a user with all sessions and topics.
        """
        # Get active study plan
        study_plan_response = self.db.table("study_plans").select("*").eq(
            "user_id", user_id
        ).eq("is_active", True).execute()

        if not study_plan_response.data:
            return None

        study_plan = study_plan_response.data[0]
        study_plan_id = study_plan["id"]

        # Get all practice sessions
        sessions_response = self.db.table("practice_sessions").select("*").eq(
            "study_plan_id", study_plan_id
        ).order("session_number").execute()

        sessions = sessions_response.data

        # Get ALL session questions with pagination (Supabase has 1000 row limit)
        if sessions:
            session_ids = [s["id"] for s in sessions]
            
            # Fetch ALL session questions - paginate to handle 1000+ records
            all_questions_data = []
            batch_size = 1000
            offset = 0

            while True:
                batch = self.db.table("session_questions").select(
                    "session_id, topic_id, status, question_id"
                ).in_("session_id", session_ids).range(offset, offset + batch_size - 1).execute()

                if not batch.data:
                    break

                all_questions_data.extend(batch.data)

                if len(batch.data) < batch_size:
                    break

                offset += batch_size
            
            # Create a mock response object
            class MockResponse:
                def __init__(self, data):
                    self.data = data
            
            all_session_questions = MockResponse(all_questions_data)
            
            # Get unique topic IDs and fetch topics separately
            topic_ids = list(set(sq["topic_id"] for sq in all_session_questions.data if sq.get("topic_id")))
            if topic_ids:
                topics_response = self.db.table("topics").select("id, name").in_(
                    "id", topic_ids
                ).execute()
                topics_lookup = {t["id"]: t for t in topics_response.data}
            else:
                topics_lookup = {}

            # Group questions by session and topic, and track completion
            questions_by_session = {}
            session_stats = {}  # Track total and completed questions per session

            for sq in all_session_questions.data:
                session_id = sq["session_id"]
                if session_id not in questions_by_session:
                    questions_by_session[session_id] = {}
                    session_stats[session_id] = {"total": 0, "completed": 0}

                topic_id = sq["topic_id"]
                if topic_id not in questions_by_session[session_id]:
                    topic_info = topics_lookup.get(topic_id, {"name": "Unknown Topic"})
                    questions_by_session[session_id][topic_id] = {
                        "topic_id": topic_id,
                        "topic_name": topic_info["name"],
                        "num_questions": 0
                    }

                # Increment question count
                questions_by_session[session_id][topic_id]["num_questions"] += 1
                session_stats[session_id]["total"] += 1

                # Track completed questions
                if sq.get("status") == "answered":
                    session_stats[session_id]["completed"] += 1

            # Attach topics and completion stats to sessions
            for session in sessions:
                session_id = session["id"]
                session["topics"] = list(questions_by_session.get(session_id, {}).values())

                # Add completion statistics
                stats = session_stats.get(session_id, {"total": 0, "completed": 0})
                session["total_questions"] = stats["total"]
                session["completed_questions"] = stats["completed"]

        study_plan["sessions"] = sessions

        total_days = (
            date.fromisoformat(study_plan["test_date"]) -
            date.fromisoformat(study_plan["start_date"])
        ).days

        return {
            "study_plan": study_plan,
            "total_sessions": len(sessions),
            "total_days": total_days,
            "sessions_per_day": round(len(sessions) / total_days, 2) if total_days > 0 else 0
        }
