"""
Bayesian Knowledge Tracing (BKT) Service

Tracks student mastery of skills over time using Bayesian inference.
Updates probability of mastery after each practice attempt.
"""

from typing import Dict, Optional
from supabase import Client
from decimal import Decimal


class BKTService:
    """
    Bayesian Knowledge Tracing - Models probability student has mastered a skill.
    
    BKT uses 4 parameters:
    - P(L0): Prior knowledge (initial mastery probability)
    - P(T): Learning rate (probability of learning from one question)
    - P(G): Guess probability (probability of answering correctly without mastery)
    - P(S): Slip probability (probability of answering incorrectly despite mastery)
    """
    
    def __init__(self, db: Client):
        self.db = db
        
        # Default BKT parameters (can be customized per skill in future)
        self.DEFAULT_PRIOR = 0.25  # P(L0) - assume 25% initial mastery
        self.DEFAULT_LEARN = 0.10  # P(T) - 10% chance of learning per question
        self.DEFAULT_GUESS = 0.25  # P(G) - 25% chance of lucky guess
        self.DEFAULT_SLIP = 0.10   # P(S) - 10% chance of careless error
    
    async def update_mastery(
        self,
        user_id: str,
        skill_id: str,
        is_correct: bool,
        time_spent_seconds: Optional[int] = None,
        confidence_score: Optional[int] = None
    ) -> Dict:
        """
        Update student's mastery probability after answering a question.
        
        Uses Bayesian update based on answer correctness:
        1. Update P(L) based on evidence (correct/incorrect)
        2. Apply learning: P(L_new) = P(L_updated) + (1 - P(L_updated)) * P(T)
        
        Args:
            user_id: Student ID
            skill_id: Topic/skill ID
            is_correct: Whether answer was correct
            time_spent_seconds: Time taken (optional, for future cognitive modeling)
            confidence_score: Self-reported confidence 1-5 (optional)
            
        Returns:
            Dictionary with mastery_before, mastery_after, velocity, and skill_id
        """
        
        # Get current mastery state or initialize
        mastery_record = await self._get_or_create_mastery(user_id, skill_id)
        
        current_mastery = float(mastery_record["mastery_probability"])
        p_learn = float(mastery_record["learn_rate"])
        p_guess = float(mastery_record["guess_probability"])
        p_slip = float(mastery_record["slip_probability"])
        
        # Bayesian update based on evidence
        if is_correct:
            # P(L | correct) = P(L) * (1 - P(S)) / [P(L) * (1 - P(S)) + (1 - P(L)) * P(G)]
            numerator = current_mastery * (1 - p_slip)
            denominator = numerator + (1 - current_mastery) * p_guess
            p_learned_given_evidence = numerator / denominator if denominator > 0 else current_mastery
        else:
            # P(L | incorrect) = P(L) * P(S) / [P(L) * P(S) + (1 - P(L)) * (1 - P(G))]
            numerator = current_mastery * p_slip
            denominator = numerator + (1 - current_mastery) * (1 - p_guess)
            p_learned_given_evidence = numerator / denominator if denominator > 0 else current_mastery
        
        # Apply learning: opportunity to transition from not-learned to learned
        new_mastery = p_learned_given_evidence + (1 - p_learned_given_evidence) * p_learn
        
        # Keep within bounds [0.01, 0.99] to avoid certainty
        new_mastery = min(0.99, max(0.01, new_mastery))
        
        # Calculate learning velocity (change in mastery)
        velocity = new_mastery - current_mastery
        
        # Update database
        total_attempts = mastery_record["total_attempts"] + 1
        correct_attempts = mastery_record["correct_attempts"] + (1 if is_correct else 0)
        
        # Detect plateau: low velocity + enough attempts
        plateau_detected = False
        if total_attempts >= 10:
            # If velocity is very small (< 2% change), mark as plateau
            if abs(velocity) < 0.02:
                plateau_detected = True
        
        update_data = {
            "mastery_probability": round(new_mastery, 4),
            "learning_velocity": round(velocity, 4),
            "total_attempts": total_attempts,
            "correct_attempts": correct_attempts,
            "plateau_flag": plateau_detected,
            "last_practiced_at": "now()",
            "updated_at": "now()"
        }
        
        self.db.table("user_skill_mastery").update(update_data).eq(
            "id", mastery_record["id"]
        ).execute()
        
        # Log learning event
        await self._log_learning_event(
            user_id=user_id,
            skill_id=skill_id,
            event_type="mastery_updated",
            mastery_before=current_mastery,
            mastery_after=new_mastery,
            event_data={
                "is_correct": is_correct,
                "velocity": round(velocity, 4),
                "time_spent_seconds": time_spent_seconds,
                "confidence_score": confidence_score
            }
        )
        
        # Check for mastery achievement (threshold: 0.95)
        if new_mastery >= 0.95 and current_mastery < 0.95:
            await self._log_learning_event(
                user_id=user_id,
                skill_id=skill_id,
                event_type="mastery_achieved",
                mastery_before=current_mastery,
                mastery_after=new_mastery,
                event_data={"total_attempts": total_attempts}
            )
        
        # Check for plateau detection
        if plateau_detected:
            await self._log_learning_event(
                user_id=user_id,
                skill_id=skill_id,
                event_type="plateau_detected",
                mastery_before=current_mastery,
                mastery_after=new_mastery,
                event_data={
                    "velocity": round(velocity, 4),
                    "total_attempts": total_attempts
                }
            )
        
        return {
            "skill_id": skill_id,
            "mastery_before": round(current_mastery, 4),
            "mastery_after": round(new_mastery, 4),
            "velocity": round(velocity, 4),
            "total_attempts": total_attempts,
            "correct_attempts": correct_attempts
        }
    
    async def get_user_mastery(self, user_id: str, skill_id: str) -> Optional[Dict]:
        """
        Get current mastery record for a user-skill pair.
        
        Args:
            user_id: Student ID
            skill_id: Topic/skill ID
            
        Returns:
            Mastery record or None if not found
        """
        response = self.db.table("user_skill_mastery").select("*").eq(
            "user_id", user_id
        ).eq("skill_id", skill_id).execute()
        
        if response.data:
            return response.data[0]
        return None
    
    async def get_all_user_masteries(self, user_id: str) -> list:
        """
        Get all mastery records for a user across all skills.
        
        Args:
            user_id: Student ID
            
        Returns:
            List of mastery records with skill details
        """
        response = self.db.table("user_skill_mastery").select(
            "*, topics(id, name, category_id)"
        ).eq("user_id", user_id).order("mastery_probability", desc=False).execute()
        
        return response.data
    
    async def initialize_skill_mastery(self, user_id: str, skill_id: str) -> Dict:
        """
        Initialize a new skill mastery record with default parameters.
        
        Args:
            user_id: Student ID
            skill_id: Topic/skill ID
            
        Returns:
            Newly created mastery record
        """
        insert_data = {
            "user_id": user_id,
            "skill_id": skill_id,
            "mastery_probability": self.DEFAULT_PRIOR,
            "prior_knowledge": self.DEFAULT_PRIOR,
            "learn_rate": self.DEFAULT_LEARN,
            "guess_probability": self.DEFAULT_GUESS,
            "slip_probability": self.DEFAULT_SLIP,
            "total_attempts": 0,
            "correct_attempts": 0,
            "plateau_flag": False
        }
        
        response = self.db.table("user_skill_mastery").insert(insert_data).execute()
        return response.data[0]
    
    async def _get_or_create_mastery(self, user_id: str, skill_id: str) -> Dict:
        """
        Get existing mastery record or create new one.
        
        Args:
            user_id: Student ID
            skill_id: Topic/skill ID
            
        Returns:
            Mastery record
        """
        existing = await self.get_user_mastery(user_id, skill_id)
        
        if existing:
            return existing
        
        return await self.initialize_skill_mastery(user_id, skill_id)
    
    async def _log_learning_event(
        self,
        user_id: str,
        skill_id: str,
        event_type: str,
        mastery_before: float,
        mastery_after: float,
        event_data: Dict
    ):
        """
        Log a learning event to the events table.
        
        Args:
            user_id: Student ID
            skill_id: Topic/skill ID
            event_type: Type of event
            mastery_before: Mastery probability before update
            mastery_after: Mastery probability after update
            event_data: Additional event data
        """
        self.db.table("learning_events").insert({
            "user_id": user_id,
            "skill_id": skill_id,
            "event_type": event_type,
            "mastery_before": round(mastery_before, 4),
            "mastery_after": round(mastery_after, 4),
            "event_data": event_data
        }).execute()

