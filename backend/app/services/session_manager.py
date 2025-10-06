"""
Study Session Manager - Manages practice sessions
"""
from typing import Dict, Optional, List
from datetime import datetime
import uuid
from app.models.schemas import (
    StudySession,
    SessionStats,
    QuestionPerformance,
    AnswerSubmission,
    NextTopicRecommendation
)
from app.services.scoring_engine import scoring_engine
from app.services.learning_model import learning_model
from app.services.scheduler import scheduler
from app.services.question_bank import question_bank
from app.services.user_service import user_service


class SessionManager:
    """
    Manages study sessions including creation, question answering, and statistics.
    """
    
    def __init__(self):
        # In-memory storage: session_id -> StudySession
        self.sessions: Dict[str, StudySession] = {}
    
    def get_next_topic_recommendation(
        self,
        user_id: str,
        module: Optional[str] = None
    ) -> Optional[NextTopicRecommendation]:
        """
        Get the next recommended topic to study for a user.
        
        Args:
            user_id: User identifier
            module: Optional filter for "math" or "english"
        
        Returns:
            NextTopicRecommendation or None if user not found
        """
        masteries = user_service.get_all_masteries(user_id)
        if not masteries:
            return None
        
        # Filter by module if specified
        if module:
            masteries = scheduler.filter_topics_by_module(masteries, module)
        
        # Get the highest priority topic
        top_priority = scheduler.get_next_topic(masteries)
        if not top_priority:
            return None
        
        # Get user profile for target mastery
        profile = user_service.get_user_profile(user_id)
        is_math = module == "math" if module else top_priority.topic in [
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
        ]
        
        target_score = profile.target_math_score if is_math else profile.target_english_score
        current_score = profile.past_math_score if is_math else profile.past_english_score
        target_mastery = learning_model.get_target_mastery(current_score, target_score)
        
        # Count available questions
        available_questions = question_bank.filter_questions(topic=top_priority.topic)
        
        # Generate reason
        if top_priority.mastery_gap > 0.5:
            reason = f"This topic has low mastery ({masteries[top_priority.topic].mastery_score:.2f}). Focus here for maximum improvement."
        elif top_priority.days_since_study > 7:
            reason = f"It's been {top_priority.days_since_study} days since you studied this. Time for a review!"
        else:
            reason = f"This topic offers the best balance of need and retention for your goals."
        
        return NextTopicRecommendation(
            topic=top_priority.topic,
            priority_score=top_priority.priority_score,
            current_mastery=masteries[top_priority.topic].mastery_score,
            target_mastery=target_mastery,
            questions_count=len(available_questions),
            estimated_time_minutes=15,  # ~10 questions × 90 seconds average
            reason=reason
        )
    
    def create_session(
        self,
        user_id: str,
        topic: str,
        num_questions: int = 10
    ) -> Optional[StudySession]:
        """
        Create a new study session for a topic.
        
        Args:
            user_id: User identifier
            topic: Topic to practice
            num_questions: Number of questions in the session
        
        Returns:
            Created StudySession or None if error
        """
        # Get user's current mastery for this topic
        mastery = user_service.get_topic_mastery(user_id, topic)
        if not mastery:
            return None
        
        # Get questions based on mastery level
        questions = question_bank.get_questions_for_session(
            topic,
            mastery.mastery_score,
            num_questions
        )
        
        if not questions:
            return None
        
        # Create session
        session_id = str(uuid.uuid4())
        session = StudySession(
            session_id=session_id,
            user_id=user_id,
            topic=topic,
            questions=[q["id"] for q in questions]
        )
        
        self.sessions[session_id] = session
        return session
    
    def submit_answer(
        self,
        session_id: str,
        answer: AnswerSubmission
    ) -> Optional[QuestionPerformance]:
        """
        Submit an answer for a question in a session.
        
        Args:
            session_id: Session identifier
            answer: Answer submission
        
        Returns:
            QuestionPerformance or None if error
        """
        session = self.sessions.get(session_id)
        if not session:
            return None
        
        # Calculate performance score
        performance = scoring_engine.calculate_performance_score(answer)
        
        # Add to session
        session.performances.append(performance)
        
        # Update user's mastery for this topic
        current_mastery = user_service.get_topic_mastery(
            answer.user_id,
            answer.topic
        )
        
        if current_mastery:
            new_mastery = learning_model.update_mastery(
                current_mastery,
                performance
            )
            user_service.update_topic_mastery(
                answer.user_id,
                answer.topic,
                new_mastery
            )
        
        return performance
    
    def complete_session(self, session_id: str) -> Optional[SessionStats]:
        """
        Complete a session and generate statistics.
        
        Args:
            session_id: Session identifier
        
        Returns:
            SessionStats or None if session not found
        """
        session = self.sessions.get(session_id)
        if not session:
            return None
        
        session.completed_at = datetime.utcnow()
        
        # Calculate statistics
        total_questions = len(session.performances)
        correct_answers = sum(
            1 for p in session.performances
            if p.performance_score > 0.5
        )
        
        avg_time = sum(
            p.time_factor for p in session.performances
        ) / total_questions if total_questions > 0 else 0
        
        # Get mastery before and after
        current_mastery = user_service.get_topic_mastery(
            session.user_id,
            session.topic
        )
        
        # Calculate initial mastery (reverse engineer from final)
        # This is simplified - in production you'd track this at session start
        mastery_after = current_mastery.mastery_score if current_mastery else 0
        
        # Estimate initial mastery (rough approximation)
        avg_performance = sum(p.performance_score for p in session.performances) / total_questions if total_questions > 0 else 0
        mastery_before = mastery_after - (learning_model.ALPHA * (avg_performance - mastery_after))
        mastery_before = max(0.0, min(1.0, mastery_before))
        
        return SessionStats(
            session_id=session_id,
            topic=session.topic,
            total_questions=total_questions,
            correct_answers=correct_answers,
            average_time=avg_time,
            mastery_before=mastery_before,
            mastery_after=mastery_after,
            improvement=mastery_after - mastery_before
        )
    
    def get_session(self, session_id: str) -> Optional[StudySession]:
        """Get a session by ID."""
        return self.sessions.get(session_id)


# Singleton instance
session_manager = SessionManager()

