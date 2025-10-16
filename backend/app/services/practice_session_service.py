from typing import Dict, Optional
from supabase import Client
from fastapi import HTTPException, status


class PracticeSessionService:
    """
    Service for practice session operations.
    Handles session ownership verification and common queries.
    """

    def __init__(self, db: Client):
        self.db = db

    def verify_session_ownership(self, session_id: str, user_id: str) -> Dict:
        """
        Verify that a session belongs to the user's study plan.

        Args:
            session_id: Practice session ID
            user_id: User ID to verify

        Returns:
            Session data if verification succeeds

        Raises:
            HTTPException: If session not found or doesn't belong to user
        """
        session_response = self.db.table("practice_sessions").select(
            "*, study_plans!inner(user_id)"
        ).eq("id", session_id).execute()

        if not session_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        session = session_response.data[0]
        if session["study_plans"]["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this session"
            )

        return session

    def get_topic_performance(self, topic_id: str, user_id: str) -> Dict[str, int]:
        """
        Calculate user's performance on a specific topic.

        Args:
            topic_id: Topic ID to calculate performance for
            user_id: User ID

        Returns:
            Dictionary with topic_correct and topic_total counts
        """
        # Get all questions for this topic across user's sessions
        topic_performance = self.db.table("session_questions").select(
            "status, user_answer, questions(correct_answer, topic_id), "
            "practice_sessions!inner(study_plans!inner(user_id))"
        ).eq("topic_id", topic_id).execute()

        # Filter to only this user's data
        user_questions = [
            q for q in topic_performance.data
            if q["practice_sessions"]["study_plans"]["user_id"] == user_id
        ]

        topic_correct = sum(
            1 for q in user_questions
            if q["status"] == "answered" and q.get("user_answer") == q["questions"]["correct_answer"]
        )
        topic_total = len([q for q in user_questions if q["status"] == "answered"])

        return {
            "topic_correct": topic_correct,
            "topic_total": topic_total
        }
