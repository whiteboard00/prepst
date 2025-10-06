"""
Part 1: The Scoring Engine - Scores a single question answer
"""
import math
from app.models.schemas import (
    AnswerSubmission,
    QuestionPerformance,
    DifficultyLevel,
    ConfidenceLevel
)


class ScoringEngine:
    """
    Calculates a QuestionPerformanceScore (0 to 1.1) based on:
    - Correctness and difficulty
    - Time performance
    - Confidence level
    """
    
    # Base scores for correct answers by difficulty
    BASE_SCORES = {
        DifficultyLevel.EASY: 0.9,
        DifficultyLevel.MEDIUM: 1.0,
        DifficultyLevel.HARD: 1.1,
    }
    
    # Confidence modifiers: [correct_bonus, incorrect_penalty]
    CONFIDENCE_MODIFIERS = {
        ConfidenceLevel.APPLE: {
            "correct": 0.0,      # Expected outcome
            "incorrect": -0.4    # CRITICAL - confident but wrong
        },
        ConfidenceLevel.LEMON: {
            "correct": 0.0,
            "incorrect": -0.2    # Significant penalty
        },
        ConfidenceLevel.BROCCOLI: {
            "correct": 0.05,     # Small bonus for being right when unsure
            "incorrect": -0.1    # Small penalty
        },
        ConfidenceLevel.ICE_CUBE: {
            "correct": 0.1,      # Bonus for correct guess
            "incorrect": 0.0     # No penalty - they admitted guessing
        }
    }
    
    def calculate_base_score(
        self,
        is_correct: bool,
        difficulty: DifficultyLevel
    ) -> float:
        """
        Calculate base score based on correctness and difficulty.
        Correct answers on harder questions score higher.
        """
        if not is_correct:
            return 0.0
        
        return self.BASE_SCORES[difficulty]
    
    def calculate_time_factor(
        self,
        time_taken: float,
        expected_time: float
    ) -> float:
        """
        Calculate time performance factor (0.75 to 1.0).
        Penalizes for slowness but doesn't overly punish.
        
        Formula: If time_taken > expected_time:
            F_time = max(0.75, 1 - (time_taken - expected_time) / (2 * expected_time))
        """
        if time_taken <= expected_time:
            return 1.0
        
        overtime = time_taken - expected_time
        penalty = overtime / (2 * expected_time)
        factor = 1.0 - penalty
        
        return max(0.75, factor)
    
    def calculate_confidence_modifier(
        self,
        is_correct: bool,
        confidence: ConfidenceLevel
    ) -> float:
        """
        Calculate confidence modifier based on correctness and confidence level.
        This identifies "unknown unknowns" - cases where the user was confident but wrong.
        """
        result_key = "correct" if is_correct else "incorrect"
        return self.CONFIDENCE_MODIFIERS[confidence][result_key]
    
    def calculate_performance_score(
        self,
        answer: AnswerSubmission
    ) -> QuestionPerformance:
        """
        Calculate the final QuestionPerformanceScore (0 to 1.1).
        
        Formula: S_perf = clamp(S_base × F_time + M_conf, 0, 1.1)
        """
        # Calculate components
        base_score = self.calculate_base_score(
            answer.is_correct,
            answer.difficulty
        )
        
        time_factor = self.calculate_time_factor(
            answer.time_taken,
            answer.expected_time
        )
        
        confidence_modifier = self.calculate_confidence_modifier(
            answer.is_correct,
            answer.confidence
        )
        
        # Calculate final performance score
        raw_score = (base_score * time_factor) + confidence_modifier
        performance_score = max(0.0, min(1.1, raw_score))  # Clamp to [0, 1.1]
        
        return QuestionPerformance(
            question_id=answer.question_id,
            topic=answer.topic,
            performance_score=performance_score,
            base_score=base_score,
            time_factor=time_factor,
            confidence_modifier=confidence_modifier
        )


# Singleton instance
scoring_engine = ScoringEngine()

