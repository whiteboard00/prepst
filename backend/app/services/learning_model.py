"""
Part 2: The Learning Model - Manages per-topic mastery scores
"""
import math
from datetime import datetime
from typing import Dict
from app.models.schemas import (
    TopicMastery,
    QuestionPerformance,
    UserProfile,
    ALL_TOPICS
)


class LearningModel:
    """
    Manages mastery scores for each topic using Exponential Moving Average (EMA).
    Each topic has a mastery score from 0.0 to 1.0.
    """
    
    # Learning rate - higher alpha means new answers change the score faster
    ALPHA = 0.1
    
    def initialize_masteries(
        self,
        math_score: int,
        english_score: int
    ) -> Dict[str, TopicMastery]:
        """
        Initialize mastery scores for all topics based on past SAT scores.
        
        Args:
            math_score: Past SAT math score (200-800)
            english_score: Past SAT English score (200-800)
        
        Returns:
            Dictionary mapping topic names to TopicMastery objects
        """
        masteries = {}
        
        # Convert scores to 0-1 scale (assuming 200 is minimum, 800 is maximum)
        math_mastery = (math_score - 200) / 600
        english_mastery = (english_score - 200) / 600
        
        # Clamp to [0, 1] range
        math_mastery = max(0.0, min(1.0, math_mastery))
        english_mastery = max(0.0, min(1.0, english_mastery))
        
        # Initialize all topics
        for topic in ALL_TOPICS:
            # Determine if this is a math or English topic
            is_math = topic in [
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
            
            initial_mastery = math_mastery if is_math else english_mastery
            
            masteries[topic] = TopicMastery(
                topic=topic,
                mastery_score=initial_mastery,
                last_studied=datetime.utcnow(),
                questions_answered=0,
                correct_answers=0
            )
        
        return masteries
    
    def update_mastery(
        self,
        current_mastery: TopicMastery,
        performance: QuestionPerformance
    ) -> TopicMastery:
        """
        Update the mastery score for a topic using EMA.
        
        Formula: M_t,new = α × S_perf + (1 - α) × M_t,old
        
        Args:
            current_mastery: Current TopicMastery object
            performance: QuestionPerformance from the answered question
        
        Returns:
            Updated TopicMastery object
        """
        # Calculate new mastery using EMA
        old_mastery = current_mastery.mastery_score
        performance_score = performance.performance_score
        
        new_mastery = (self.ALPHA * performance_score) + ((1 - self.ALPHA) * old_mastery)
        
        # Clamp to [0, 1] range
        new_mastery = max(0.0, min(1.0, new_mastery))
        
        # Update statistics
        questions_answered = current_mastery.questions_answered + 1
        correct_answers = current_mastery.correct_answers
        if performance_score > 0.5:  # Consider it correct if performance > 0.5
            correct_answers += 1
        
        return TopicMastery(
            topic=current_mastery.topic,
            mastery_score=new_mastery,
            last_studied=datetime.utcnow(),
            questions_answered=questions_answered,
            correct_answers=correct_answers
        )
    
    def get_target_mastery(
        self,
        current_score: int,
        target_score: int
    ) -> float:
        """
        Calculate the target mastery level needed to reach target score.
        
        Args:
            current_score: Current SAT score (200-800)
            target_score: Target SAT score (200-800)
        
        Returns:
            Target mastery level (0.0 to 1.0)
        """
        target_mastery = (target_score - 200) / 600
        return max(0.0, min(1.0, target_mastery))


# Singleton instance
learning_model = LearningModel()

