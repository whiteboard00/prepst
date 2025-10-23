from datetime import date, timedelta
from typing import List, Dict, Optional
from uuid import UUID
from supabase import Client
import math
import random
from app.services.bkt_service import BKTService


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

    def group_topics_into_sessions(
        self,
        topic_distribution: Dict[str, int],
        questions_per_day: int,
        topics_lookup: Dict[str, Dict],
        target_total_sessions: Optional[int] = None
    ) -> List[Dict]:
        """
        Group topics into practice sessions with spaced repetition.

        Each session is PURE (only Math OR only RW topics).
        Topics are distributed across sessions using spaced repetition
        (each topic appears in multiple sessions for better retention).
        Hard cap of 25 questions per session.

        Args:
            topic_distribution: {topic_id: num_questions}
            questions_per_day: Questions per session (used for target calculation)
            topics_lookup: Lookup for topic metadata
            target_total_sessions: Target total number of sessions (enforces max)

        Returns: List of sessions with topics and question counts
        """
        # Separate topics by section
        math_distribution = {}
        rw_distribution = {}

        for topic_id, num_questions in topic_distribution.items():
            if num_questions == 0:
                continue

            topic = topics_lookup.get(topic_id)
            if not topic:
                continue

            section = topic.get("section", "")
            if section == "math":
                math_distribution[topic_id] = num_questions
            elif section == "reading_writing":
                rw_distribution[topic_id] = num_questions

        # Calculate target sessions for each section based on question proportion
        math_target = None
        rw_target = None

        if target_total_sessions:
            total_questions = sum(topic_distribution.values())
            if total_questions > 0:
                math_questions = sum(math_distribution.values())
                rw_questions = sum(rw_distribution.values())

                # Distribute target sessions proportionally
                math_proportion = math_questions / total_questions
                rw_proportion = rw_questions / total_questions

                math_target = max(1, int(target_total_sessions * math_proportion)) if math_questions > 0 else 0
                rw_target = max(1, int(target_total_sessions * rw_proportion)) if rw_questions > 0 else 0

                # Adjust if sum exceeds target (due to rounding)
                while math_target + rw_target > target_total_sessions:
                    if math_target > rw_target and math_target > 1:
                        math_target -= 1
                    elif rw_target > 1:
                        rw_target -= 1
                    else:
                        break

        # Create pure sessions for each section
        math_sessions = self._create_section_sessions(
            math_distribution, "math", topics_lookup, math_target
        )
        rw_sessions = self._create_section_sessions(
            rw_distribution, "rw", topics_lookup, rw_target
        )

        # Interleave Math and RW sessions for variety
        # Pattern: Math, RW, Math, RW, ... or RW, Math, RW, Math, ...
        # Start with whichever section has more sessions
        all_sessions = []

        if len(math_sessions) >= len(rw_sessions):
            # More Math sessions - start with Math
            max_len = max(len(math_sessions), len(rw_sessions))
            for i in range(max_len):
                if i < len(math_sessions):
                    all_sessions.append(math_sessions[i])
                if i < len(rw_sessions):
                    all_sessions.append(rw_sessions[i])
        else:
            # More RW sessions - start with RW
            max_len = max(len(math_sessions), len(rw_sessions))
            for i in range(max_len):
                if i < len(rw_sessions):
                    all_sessions.append(rw_sessions[i])
                if i < len(math_sessions):
                    all_sessions.append(math_sessions[i])

        print(f"[SESSION GROUPING] Created {len(math_sessions)} Math + {len(rw_sessions)} RW = {len(all_sessions)} total sessions")

        return all_sessions

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

    async def generate_next_batch(
        self,
        study_plan_id: str,
        days: int = 14
    ) -> Dict:
        """
        Generate next batch of sessions (e.g., 14 days) focusing on top priority topics.

        Each session has 25 questions.

        Args:
            study_plan_id: Study plan ID
            days: Number of days to generate sessions for (default 14)

        Returns:
            Dictionary with batch info and created sessions
        """
        QUESTIONS_PER_SESSION = 25

        # Get study plan
        plan_response = self.db.table("study_plans").select("*").eq(
            "id", study_plan_id
        ).execute()

        if not plan_response.data:
            raise ValueError(f"Study plan {study_plan_id} not found")

        plan = plan_response.data[0]
        user_id = plan["user_id"]

        print(f"[BATCH] Generating {days}-day batch for plan {study_plan_id[:8]}...")

        # Calculate top priority topics
        focus_topics = await self._calculate_topic_priorities(user_id, num_topics=8)

        if not focus_topics:
            print("[BATCH] No topics found, cannot generate batch")
            return {"sessions_created": 0}

        # Distribute questions across focus topics
        # 14 days = 14 sessions = 14 × 25 = 350 questions
        total_questions = QUESTIONS_PER_SESSION * days

        topic_distribution = {}
        total_priority = sum(t["priority"] for t in focus_topics)

        if total_priority > 0:
            # First pass: distribute proportionally
            for topic in focus_topics:
                proportion = topic["priority"] / total_priority
                num_questions = int(total_questions * proportion)
                if num_questions > 0:  # Only include topics with questions
                    topic_distribution[topic["topic_id"]] = num_questions

            # Calculate how many questions were lost to rounding
            distributed_total = sum(topic_distribution.values())
            remainder = total_questions - distributed_total

            # Distribute remainder to highest priority topics
            if remainder > 0:
                print(f"[BATCH] Distributing {remainder} remainder questions to top priority topics")
                for i in range(remainder):
                    # Give to highest priority topics first
                    if i < len(focus_topics):
                        topic_id = focus_topics[i]["topic_id"]
                        if topic_id in topic_distribution:
                            topic_distribution[topic_id] += 1

        actual_total = sum(topic_distribution.values())
        print(f"[BATCH] Distributing {total_questions} questions across {len(topic_distribution)} topics (actual: {actual_total})")

        # Create topics lookup
        all_topics = await self._get_all_topics_with_weights()
        topics_lookup = {t["id"]: t for t in all_topics}

        # Group into sessions (25 questions each, target = days)
        sessions = self.group_topics_into_sessions(
            topic_distribution,
            QUESTIONS_PER_SESSION,
            topics_lookup,
            target_total_sessions=days
        )

        print(f"[BATCH] Created {len(sessions)} sessions from {actual_total} questions ({actual_total / QUESTIONS_PER_SESSION:.1f} expected)")

        # Determine start date (after last scheduled session)
        last_session = self.db.table("practice_sessions").select(
            "scheduled_date"
        ).eq("study_plan_id", study_plan_id).order(
            "scheduled_date", desc=True
        ).limit(1).execute()

        if last_session.data:
            last_date = date.fromisoformat(last_session.data[0]["scheduled_date"])
            start_date = last_date + timedelta(days=1)
        else:
            # First batch, start tomorrow
            start_date = date.today() + timedelta(days=1)

        # Schedule sessions
        scheduled_sessions = self.schedule_sessions(
            sessions,
            start_date,
            total_days=days
        )

        print(f"[BATCH] Scheduled {len(scheduled_sessions)} sessions from {start_date}")

        # Save sessions to database
        created_count = 0
        for session in scheduled_sessions:
            session_record = self.db.table("practice_sessions").insert({
                "study_plan_id": study_plan_id,
                "scheduled_date": session["scheduled_date"].isoformat(),
                "session_number": session["session_number"],
                "status": "pending"
            }).execute()

            session_id = session_record.data[0]["id"]

            # Assign questions to session
            await self._assign_questions_to_session(session_id, session["topics"])

            created_count += 1

        print(f"[BATCH] ✓ Created {created_count} sessions")

        return {
            "sessions_created": created_count,
            "start_date": start_date.isoformat(),
            "focus_topics": [t["topic_name"] for t in focus_topics]
        }

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
        Generate a study plan with rolling batch generation.

        Approach:
        1. Create plan metadata (test date, scores)
        2. Generate FIRST 14 days of sessions (25 questions each)
        3. Future batches generated every 2 weeks as user progresses
        """
        if start_date is None:
            start_date = date.today()

        # Calculate total days
        total_days = (test_date - start_date).days

        print(f"[PLAN] Creating study plan: {total_days} days, 25 questions per session")

        # Deactivate any existing active study plans
        self.db.table("study_plans").update({
            "is_active": False
        }).eq("user_id", user_id).eq("is_active", True).execute()

        # Create plan metadata (no sessions yet!)
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

        print(f"[PLAN] Plan created: {study_plan_id[:8]}...")

        # Generate first 14-day batch (14 sessions × 25 questions = 350 questions)
        batch_result = await self.generate_next_batch(study_plan_id, days=14)

        print(f"[PLAN] ✓ Generated {batch_result['sessions_created']} initial sessions (25 questions each)")

        return {
            "study_plan": study_plan,
            "total_days": total_days,
            "total_sessions": batch_result['sessions_created']
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

    async def _get_user_mastery_lookup(self, user_id: str) -> Dict[str, float]:
        """
        Get user's mastery probabilities for all topics.

        Args:
            user_id: User ID

        Returns:
            Dictionary mapping topic_id -> mastery_probability (0.0 - 1.0)
        """
        try:
            bkt_service = BKTService(self.db)
            masteries = await bkt_service.get_all_user_masteries(user_id)

            # Convert to lookup dict: {topic_id: mastery_probability}
            mastery_lookup = {
                record["skill_id"]: float(record["mastery_probability"])
                for record in masteries
            }

            return mastery_lookup

        except Exception as e:
            print(f"Error fetching mastery data: {e}")
            # Return empty dict - will fall back to even distribution
            return {}

    async def _get_all_topics_with_weights(self) -> List[Dict]:
        """
        Get all topics with their category weights flattened.

        Returns:
            List of topics with category metadata
        """
        categories_and_topics = await self.get_categories_and_topics()

        all_topics = []
        for section, categories in categories_and_topics.items():
            for category in categories:
                for topic in category["topics"]:
                    all_topics.append({
                        "id": topic["id"],
                        "name": topic["name"],
                        "category_id": category["id"],
                        "category_name": category["name"],
                        "category_weight": category["weight_in_section"],
                        "section": section
                    })

        return all_topics

    async def _calculate_topic_priorities(
        self,
        user_id: str,
        num_topics: int = 8
    ) -> List[Dict]:
        """
        Calculate priority scores for all topics and return top N.

        Priority = category_weight × (1 - mastery)

        No section balancing - just picks top N by priority!

        Args:
            user_id: User ID
            num_topics: Number of top topics to return (default 8)

        Returns:
            List of top priority topics with scores
        """
        # Get current mastery
        mastery_lookup = await self._get_user_mastery_lookup(user_id)

        # Get all topics with weights
        all_topics = await self._get_all_topics_with_weights()

        # Calculate priorities for ALL topics
        priorities = []
        for topic in all_topics:
            category_weight = topic["category_weight"] / 100.0
            mastery = mastery_lookup.get(topic["id"], 0.25)  # Default 25%
            weakness = 1.0 - mastery

            # Priority = weight × weakness
            priority_score = category_weight * weakness

            priorities.append({
                "topic_id": topic["id"],
                "topic_name": topic["name"],
                "category_name": topic["category_name"],
                "section": topic["section"],
                "priority": priority_score,
                "mastery": mastery,
                "weight": category_weight
            })

        # Sort by priority (highest first)
        priorities.sort(key=lambda x: x["priority"], reverse=True)

        # Take top N (no section balancing!)
        focus_topics = priorities[:num_topics]

        # Log what we picked
        math_count = sum(1 for t in focus_topics if t["section"] == "math")
        rw_count = len(focus_topics) - math_count

        print(f"[PRIORITY] Top {num_topics} topics: {math_count} Math + {rw_count} RW")
        for t in focus_topics:
            print(f"  {t['topic_name']} ({t['section']}): priority={t['priority']:.3f} (mastery={t['mastery']:.2f}, weight={t['weight']:.2f})")

        return focus_topics

    def _create_section_sessions(
        self,
        topic_distribution: Dict[str, int],
        section: str,
        topics_lookup: Dict[str, Dict],
        target_sessions: Optional[int] = None
    ) -> List[List[Dict]]:
        """
        Create sessions for one section with spaced repetition.

        Each topic is divided evenly across all sessions for better retention.
        Sessions are capped at 25 questions max.

        Args:
            topic_distribution: {topic_id: num_questions}
            section: "math" or "reading_writing"
            topics_lookup: Lookup for topic metadata
            target_sessions: Target number of sessions to create (will enforce as max)

        Returns:
            List of sessions, each session is a list of topic allocations
        """
        MAX_QUESTIONS = 25

        if not topic_distribution:
            return []

        # Calculate total questions and number of sessions needed
        total_questions = sum(topic_distribution.values())

        if total_questions == 0:
            return []

        # Calculate initial number of sessions
        num_sessions = max(1, (total_questions + MAX_QUESTIONS - 1) // MAX_QUESTIONS)

        # Initialize sessions
        sessions = [[] for _ in range(num_sessions)]
        session_counts = [0] * num_sessions

        # For each topic, distribute questions evenly across sessions
        for topic_id, total_topic_questions in topic_distribution.items():
            if total_topic_questions == 0:
                continue

            # Divide questions across sessions
            questions_per_session = total_topic_questions // num_sessions
            remainder = total_topic_questions % num_sessions

            for session_idx in range(num_sessions):
                # First 'remainder' sessions get +1 extra question
                questions_for_this_session = questions_per_session + (1 if session_idx < remainder else 0)

                if questions_for_this_session > 0:
                    sessions[session_idx].append({
                        "topic_id": topic_id,
                        "topic_name": topics_lookup[topic_id]["name"],
                        "num_questions": questions_for_this_session
                    })
                    session_counts[session_idx] += questions_for_this_session

        # Check if any session exceeds MAX_QUESTIONS
        max_count = max(session_counts) if session_counts else 0

        if max_count > MAX_QUESTIONS:
            # Need more sessions - recalculate
            num_sessions += 1
            sessions = [[] for _ in range(num_sessions)]
            session_counts = [0] * num_sessions

            for topic_id, total_topic_questions in topic_distribution.items():
                if total_topic_questions == 0:
                    continue

                questions_per_session = total_topic_questions // num_sessions
                remainder = total_topic_questions % num_sessions

                for session_idx in range(num_sessions):
                    questions_for_this_session = questions_per_session + (1 if session_idx < remainder else 0)

                    if questions_for_this_session > 0:
                        sessions[session_idx].append({
                            "topic_id": topic_id,
                            "topic_name": topics_lookup[topic_id]["name"],
                            "num_questions": questions_for_this_session
                        })
                        session_counts[session_idx] += questions_for_this_session

        # Remove empty sessions
        non_empty = [(s, c) for s, c in zip(sessions, session_counts) if s]
        sessions = [s for s, c in non_empty]
        session_counts = [c for s, c in non_empty]

        # If we exceed target sessions, merge the last few sessions
        if target_sessions and len(sessions) > target_sessions:
            print(f"[SESSION] Merging {len(sessions)} sessions down to {target_sessions} (cap enforcement)")

            # Keep first (target_sessions - 1) sessions as-is
            # Merge all remaining sessions into the last one
            merged_sessions = sessions[:target_sessions-1]
            merged_counts = session_counts[:target_sessions-1]

            # Combine all overflow sessions into one final session
            final_session = []
            final_count = 0

            for session, count in zip(sessions[target_sessions-1:], session_counts[target_sessions-1:]):
                # Merge topics from this session
                for topic_item in session:
                    # Check if this topic already exists in final_session
                    existing = next((t for t in final_session if t["topic_id"] == topic_item["topic_id"]), None)
                    if existing:
                        existing["num_questions"] += topic_item["num_questions"]
                    else:
                        final_session.append(topic_item.copy())
                final_count += count

            merged_sessions.append(final_session)
            merged_counts.append(final_count)

            sessions = merged_sessions
            session_counts = merged_counts

        # Log session info
        print(f"[SESSION] Created {len(sessions)} {section} sessions")
        for i, (session, count) in enumerate(zip(sessions, session_counts)):
            topic_names = [t["topic_name"] for t in session]
            print(f"  Session {i+1}: {count} questions - {', '.join(topic_names[:3])}{'...' if len(topic_names) > 3 else ''}")

        return sessions
