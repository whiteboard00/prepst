"""
User Profile Service - Manages user profiles and mastery data
"""
from typing import Dict, Optional
from datetime import datetime, timezone
from app.models.schemas import UserProfile, TopicMastery
from app.services.learning_model import learning_model


class UserService:
    """
    Service for managing user profiles and their learning progress.
    In a production app, this would interface with a database.
    For now, we'll use in-memory storage.
    """
    
    def __init__(self):
        # In-memory storage: user_id -> UserProfile
        self.users: Dict[str, UserProfile] = {}
    
    def create_user_profile(
        self,
        user_id: str,
        past_math_score: int,
        past_english_score: int,
        target_math_score: int,
        target_english_score: int,
        test_date: datetime
    ) -> UserProfile:
        """
        Create a new user profile with initialized topic masteries.
        
        Args:
            user_id: Unique user identifier
            past_math_score: Past SAT math score (200-800)
            past_english_score: Past SAT English score (200-800)
            target_math_score: Target SAT math score (200-800)
            target_english_score: Target SAT English score (200-800)
            test_date: Target test date
        
        Returns:
            Created UserProfile
        """
        # Initialize topic masteries based on past scores
        topic_masteries = learning_model.initialize_masteries(
            past_math_score,
            past_english_score
        )
        
        profile = UserProfile(
            user_id=user_id,
            past_math_score=past_math_score,
            past_english_score=past_english_score,
            target_math_score=target_math_score,
            target_english_score=target_english_score,
            test_date=test_date,
            topic_masteries=topic_masteries
        )
        
        self.users[user_id] = profile
        return profile
    
    def get_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """
        Get a user's profile.
        
        Args:
            user_id: User identifier
        
        Returns:
            UserProfile or None if not found
        """
        return self.users.get(user_id)
    
    def update_topic_mastery(
        self,
        user_id: str,
        topic: str,
        new_mastery: TopicMastery
    ) -> bool:
        """
        Update the mastery score for a specific topic.
        
        Args:
            user_id: User identifier
            topic: Topic name
            new_mastery: Updated TopicMastery object
        
        Returns:
            True if successful, False if user not found
        """
        profile = self.users.get(user_id)
        if not profile:
            return False
        
        profile.topic_masteries[topic] = new_mastery
        return True
    
    def get_topic_mastery(
        self,
        user_id: str,
        topic: str
    ) -> Optional[TopicMastery]:
        """
        Get the mastery score for a specific topic.
        
        Args:
            user_id: User identifier
            topic: Topic name
        
        Returns:
            TopicMastery or None if not found
        """
        profile = self.users.get(user_id)
        if not profile:
            return None
        
        return profile.topic_masteries.get(topic)
    
    def get_all_masteries(
        self,
        user_id: str
    ) -> Optional[Dict[str, TopicMastery]]:
        """
        Get all topic masteries for a user.
        
        Args:
            user_id: User identifier
        
        Returns:
            Dictionary of topic masteries or None if user not found
        """
        profile = self.users.get(user_id)
        if not profile:
            return None
        
        return profile.topic_masteries
    
    def get_overall_progress(self, user_id: str) -> Optional[Dict]:
        """
        Get overall progress statistics for a user.
        
        Args:
            user_id: User identifier
        
        Returns:
            Dictionary with progress stats or None if user not found
        """
        profile = self.users.get(user_id)
        if not profile:
            return None
        
        masteries = profile.topic_masteries
        
        # Calculate average mastery scores
        math_topics = [m for t, m in masteries.items() if t in [
            "Linear equations in one variable",
            "Linear functions",
            "Linear equations in two variables",
            "Systems of two linear equations in two variables",
            "Linear inequalities in one or two variables",
            "Equivalent expressions",
            "Nonlinear equations in one variable and systems of equations in two variables",
            "Nonlinear functions",
            "Ratios, rates, proportional relationships, and units",
            "Percentages",
            "One-variable data: Distributions and measures of center and spread",
            "Two-variable data: Models and scatterplots",
            "Probability and conditional probability",
            "Inference from sample statistics and margin of error",
            "Evaluating statistical claims: Observational studies and experiments",
            "Area and volume",
            "Lines, angles, and triangles",
            "Right triangles and trigonometry",
            "Circles"
        ]]
        
        english_topics = [m for t, m in masteries.items() if m not in math_topics]
        
        avg_math_mastery = sum(m.mastery_score for m in math_topics) / len(math_topics) if math_topics else 0
        avg_english_mastery = sum(m.mastery_score for m in english_topics) / len(english_topics) if english_topics else 0
        
        # Estimate current scores based on mastery
        current_math_score = int(200 + (avg_math_mastery * 600))
        current_english_score = int(200 + (avg_english_mastery * 600))
        
        total_questions = sum(m.questions_answered for m in masteries.values())
        total_correct = sum(m.correct_answers for m in masteries.values())
        
        return {
            "user_id": user_id,
            "past_math_score": profile.past_math_score,
            "past_english_score": profile.past_english_score,
            "current_math_score": current_math_score,
            "current_english_score": profile.target_english_score,
            "target_math_score": profile.target_math_score,
            "target_english_score": profile.target_english_score,
            "test_date": profile.test_date,
            "days_until_test": (profile.test_date - datetime.now(timezone.utc)).days,
            "avg_math_mastery": avg_math_mastery,
            "avg_english_mastery": avg_english_mastery,
            "total_questions_answered": total_questions,
            "total_correct_answers": total_correct,
            "overall_accuracy": total_correct / total_questions if total_questions > 0 else 0
        }


# Singleton instance
user_service = UserService()

