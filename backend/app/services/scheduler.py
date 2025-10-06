"""
Part 3: The Dynamic Scheduler - Calculates topic priorities using spaced repetition
"""
import math
from datetime import datetime, timedelta
from typing import List, Dict
from app.models.schemas import (
    TopicMastery,
    TopicPriority,
    ALL_TOPICS
)


class DynamicScheduler:
    """
    Calculates priority scores for topics to determine what to study next.
    Implements spaced repetition through the forgetting factor.
    
    Priority = (Mastery Gap) × (Base Weight) × (Forgetting Factor)
    """
    
    def calculate_days_since_study(
        self,
        last_studied: datetime
    ) -> int:
        """Calculate the number of days since a topic was last studied."""
        now = datetime.utcnow()
        delta = now - last_studied
        return delta.days
    
    def calculate_forgetting_factor(
        self,
        days_since_study: int
    ) -> float:
        """
        Calculate the forgetting factor using spaced repetition.
        The longer it's been since studying, the higher the boost.
        
        Formula: F_t = ln(d + 1) + 1
        
        Examples:
        - Studied today (d=0): F = ln(1) + 1 = 1.0 (no boost)
        - Studied yesterday (d=1): F = ln(2) + 1 ≈ 1.69
        - Studied a week ago (d=7): F = ln(8) + 1 ≈ 3.07
        
        Args:
            days_since_study: Number of days since last study
        
        Returns:
            Forgetting factor (minimum 1.0)
        """
        return math.log(days_since_study + 1) + 1
    
    def calculate_mastery_gap(
        self,
        mastery_score: float
    ) -> float:
        """
        Calculate the mastery gap (1 - M_t).
        Higher gap means lower mastery, which should increase priority.
        
        Args:
            mastery_score: Current mastery score (0 to 1)
        
        Returns:
            Mastery gap (0 to 1)
        """
        return 1.0 - mastery_score
    
    def calculate_priority(
        self,
        mastery: TopicMastery
    ) -> TopicPriority:
        """
        Calculate the priority score for a topic.
        
        Formula: P_t = (Mastery Gap) × (Base Weight) × (Forgetting Factor)
        
        Args:
            mastery: TopicMastery object
        
        Returns:
            TopicPriority object with calculated priority score
        """
        # Get the base weight for this topic
        base_weight = ALL_TOPICS.get(mastery.topic, 0.8)  # Default to 0.8 if not found
        
        # Calculate components
        mastery_gap = self.calculate_mastery_gap(mastery.mastery_score)
        days_since_study = self.calculate_days_since_study(mastery.last_studied)
        forgetting_factor = self.calculate_forgetting_factor(days_since_study)
        
        # Calculate final priority
        priority_score = mastery_gap * base_weight * forgetting_factor
        
        return TopicPriority(
            topic=mastery.topic,
            priority_score=priority_score,
            mastery_gap=mastery_gap,
            base_weight=base_weight,
            forgetting_factor=forgetting_factor,
            days_since_study=days_since_study
        )
    
    def get_next_topic(
        self,
        masteries: Dict[str, TopicMastery]
    ) -> TopicPriority:
        """
        Determine the next topic to study by finding the highest priority.
        
        Args:
            masteries: Dictionary of all topic masteries
        
        Returns:
            TopicPriority for the highest priority topic
        """
        priorities = [
            self.calculate_priority(mastery)
            for mastery in masteries.values()
        ]
        
        # Sort by priority score (descending)
        priorities.sort(key=lambda p: p.priority_score, reverse=True)
        
        return priorities[0] if priorities else None
    
    def get_top_topics(
        self,
        masteries: Dict[str, TopicMastery],
        n: int = 5
    ) -> List[TopicPriority]:
        """
        Get the top N topics to study by priority.
        
        Args:
            masteries: Dictionary of all topic masteries
            n: Number of top topics to return
        
        Returns:
            List of TopicPriority objects, sorted by priority (descending)
        """
        priorities = [
            self.calculate_priority(mastery)
            for mastery in masteries.values()
        ]
        
        # Sort by priority score (descending)
        priorities.sort(key=lambda p: p.priority_score, reverse=True)
        
        return priorities[:n]
    
    def filter_topics_by_module(
        self,
        masteries: Dict[str, TopicMastery],
        module: str
    ) -> Dict[str, TopicMastery]:
        """
        Filter masteries to only include topics from a specific module (math or english).
        
        Args:
            masteries: Dictionary of all topic masteries
            module: "math" or "english"
        
        Returns:
            Filtered dictionary of masteries
        """
        from app.models.schemas import MATH_TOPICS, ENGLISH_TOPICS
        
        if module.lower() == "math":
            topic_names = set(MATH_TOPICS.keys())
        elif module.lower() == "english":
            topic_names = set(ENGLISH_TOPICS.keys())
        else:
            return masteries
        
        return {
            topic: mastery
            for topic, mastery in masteries.items()
            if topic in topic_names
        }


# Singleton instance
scheduler = DynamicScheduler()

