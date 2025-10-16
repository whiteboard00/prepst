"""
Analytics Service

Handles performance snapshots, growth curves, and cognitive metrics.
"""

from typing import Dict, List, Optional
from supabase import Client
from datetime import datetime, timedelta
import statistics


class AnalyticsService:
    """Service for tracking and analyzing student performance over time."""
    
    def __init__(self, db: Client):
        self.db = db
    
    async def create_performance_snapshot(
        self,
        user_id: str,
        snapshot_type: str,
        related_id: Optional[str] = None
    ) -> Dict:
        """
        Create a performance snapshot capturing current mastery state.
        
        Args:
            user_id: Student ID
            snapshot_type: Type of snapshot ('session_complete', 'mock_exam', 'weekly', 'monthly')
            related_id: Related session or exam ID (optional)
            
        Returns:
            Created snapshot record
        """
        
        # Get all current mastery states
        mastery_response = self.db.table("user_skill_mastery").select(
            "skill_id, mastery_probability, topics(category_id, categories(section))"
        ).eq("user_id", user_id).execute()
        
        # Build skills snapshot
        skills_snapshot = {}
        math_masteries = []
        rw_masteries = []
        
        for record in mastery_response.data:
            skill_id = record["skill_id"]
            mastery = float(record["mastery_probability"])
            skills_snapshot[skill_id] = mastery
            
            # Separate by section for ability calculation
            section = record["topics"]["categories"]["section"]
            if section == "math":
                math_masteries.append(mastery)
            else:
                rw_masteries.append(mastery)
        
        # Calculate estimated abilities (theta) and predicted SAT scores
        estimated_ability_math = self._calculate_ability(math_masteries) if math_masteries else None
        estimated_ability_rw = self._calculate_ability(rw_masteries) if rw_masteries else None
        
        predicted_sat_math = self._ability_to_sat_score(estimated_ability_math) if estimated_ability_math else None
        predicted_sat_rw = self._ability_to_sat_score(estimated_ability_rw) if estimated_ability_rw else None
        
        # Get recent practice stats for cognitive metrics
        cognitive_metrics = await self._calculate_cognitive_metrics(user_id)
        
        # Get recent performance stats
        performance_stats = await self._get_recent_performance_stats(user_id)
        
        # Create snapshot
        snapshot_data = {
            "user_id": user_id,
            "snapshot_type": snapshot_type,
            "related_id": related_id,
            "estimated_ability_math": estimated_ability_math,
            "estimated_ability_rw": estimated_ability_rw,
            "predicted_sat_math": predicted_sat_math,
            "predicted_sat_rw": predicted_sat_rw,
            "skills_snapshot": skills_snapshot,
            "avg_time_per_question": cognitive_metrics["avg_time"],
            "avg_confidence_score": cognitive_metrics["avg_confidence"],
            "cognitive_efficiency_score": cognitive_metrics["efficiency"],
            "questions_answered": performance_stats["total_answered"],
            "questions_correct": performance_stats["total_correct"]
        }
        
        response = self.db.table("user_performance_snapshots").insert(snapshot_data).execute()
        return response.data[0]
    
    async def get_growth_curve(
        self,
        user_id: str,
        skill_id: Optional[str] = None,
        days_back: int = 30
    ) -> List[Dict]:
        """
        Get mastery progression over time (growth curve).
        
        Args:
            user_id: Student ID
            skill_id: Optional specific skill to track (None = overall)
            days_back: Number of days to look back
            
        Returns:
            List of snapshots with dates and mastery values
        """
        cutoff_date = datetime.now() - timedelta(days=days_back)
        
        query = self.db.table("user_performance_snapshots").select("*").eq(
            "user_id", user_id
        ).gte("created_at", cutoff_date.isoformat()).order("created_at")
        
        response = query.execute()
        
        growth_data = []
        for snapshot in response.data:
            data_point = {
                "date": snapshot["created_at"],
                "snapshot_type": snapshot["snapshot_type"],
                "predicted_sat_math": snapshot.get("predicted_sat_math"),
                "predicted_sat_rw": snapshot.get("predicted_sat_rw"),
                "cognitive_efficiency": snapshot.get("cognitive_efficiency_score")
            }
            
            # If tracking specific skill, extract from snapshot
            if skill_id and snapshot.get("skills_snapshot"):
                data_point["mastery"] = snapshot["skills_snapshot"].get(skill_id, 0)
            else:
                # Overall mastery (average across all skills)
                if snapshot.get("skills_snapshot"):
                    masteries = list(snapshot["skills_snapshot"].values())
                    data_point["mastery"] = statistics.mean(masteries) if masteries else 0
            
            growth_data.append(data_point)
        
        return growth_data
    
    async def get_skill_heatmap(self, user_id: str) -> Dict:
        """
        Get current mastery heatmap across all skills.
        
        Args:
            user_id: Student ID
            
        Returns:
            Dictionary grouped by category with skill mastery data
        """
        response = self.db.table("user_skill_mastery").select(
            "*, topics(id, name, category_id, categories(id, name, section))"
        ).eq("user_id", user_id).execute()
        
        # Group by category
        heatmap = {}
        
        for record in response.data:
            topic = record["topics"]
            category = topic["categories"]
            category_name = category["name"]
            
            if category_name not in heatmap:
                heatmap[category_name] = {
                    "category_id": category["id"],
                    "section": category["section"],
                    "skills": []
                }
            
            heatmap[category_name]["skills"].append({
                "skill_id": record["skill_id"],
                "skill_name": topic["name"],
                "mastery": float(record["mastery_probability"]),
                "velocity": float(record["learning_velocity"]) if record["learning_velocity"] else 0,
                "plateau": record["plateau_flag"],
                "total_attempts": record["total_attempts"],
                "correct_attempts": record["correct_attempts"]
            })
        
        return heatmap
    
    async def get_recent_learning_events(
        self,
        user_id: str,
        limit: int = 50,
        event_type: Optional[str] = None
    ) -> List[Dict]:
        """
        Get recent learning events for a user.
        
        Args:
            user_id: Student ID
            limit: Maximum number of events
            event_type: Optional filter by event type
            
        Returns:
            List of learning events
        """
        query = self.db.table("learning_events").select(
            "*, topics(name)"
        ).eq("user_id", user_id).order("created_at", desc=True).limit(limit)
        
        if event_type:
            query = query.eq("event_type", event_type)
        
        response = query.execute()
        return response.data
    
    def calculate_cognitive_efficiency(
        self,
        time_spent: int,
        confidence: int,
        is_correct: bool,
        difficulty: float = 0.0
    ) -> float:
        """
        Calculate cognitive efficiency score.
        
        Efficiency = correctness * time_factor * confidence_factor * difficulty_adjustment
        
        Args:
            time_spent: Seconds spent on question
            confidence: Self-reported confidence (1-5)
            is_correct: Whether answer was correct
            difficulty: Question difficulty (-3 to 3, default 0)
            
        Returns:
            Cognitive efficiency score (0-2 range typically)
        """
        # Base score from correctness
        base = 1.0 if is_correct else 0.0
        
        # Time factor (optimal is 60-90 seconds)
        if time_spent < 30:
            time_factor = 0.7  # Too fast, possible guess
        elif time_spent < 90:
            time_factor = 1.0  # Optimal
        elif time_spent < 180:
            time_factor = 0.8  # Slower but acceptable
        else:
            time_factor = 0.5  # Struggling
        
        # Confidence factor
        confidence_factor = confidence / 5.0
        
        # Difficulty adjustment (harder questions weighted more)
        difficulty_factor = 1.0 + (difficulty / 3.0) if difficulty >= 0 else 1.0 + (difficulty / 6.0)
        
        efficiency = base * time_factor * confidence_factor * difficulty_factor
        
        return round(efficiency, 3)
    
    def _calculate_ability(self, masteries: List[float]) -> float:
        """
        Convert mastery probabilities to IRT ability (theta).
        
        Uses logit transformation: theta = ln(p / (1-p))
        
        Args:
            masteries: List of mastery probabilities
            
        Returns:
            Estimated ability theta (-3 to 3 scale)
        """
        if not masteries:
            return 0.0
        
        avg_mastery = statistics.mean(masteries)
        # Clamp to avoid log(0)
        avg_mastery = max(0.01, min(0.99, avg_mastery))
        
        # Logit transformation
        import math
        theta = math.log(avg_mastery / (1 - avg_mastery))
        
        # Clamp to reasonable range
        return max(-3.0, min(3.0, theta))
    
    def _ability_to_sat_score(self, theta: float) -> int:
        """
        Convert IRT ability (theta) to SAT score.
        
        Rough mapping: theta = 0 → 500, theta = 1 → 600, etc.
        
        Args:
            theta: Ability parameter (-3 to 3)
            
        Returns:
            Estimated SAT score (200-800)
        """
        # Linear mapping: theta of 0 = 500, each +1 theta ≈ +100 points
        score = 500 + (theta * 100)
        
        # Clamp to SAT range
        return int(max(200, min(800, score)))
    
    async def _calculate_cognitive_metrics(self, user_id: str) -> Dict:
        """
        Calculate recent cognitive metrics (last 30 days).
        
        Args:
            user_id: Student ID
            
        Returns:
            Dictionary with avg_time, avg_confidence, efficiency
        """
        cutoff_date = datetime.now() - timedelta(days=30)
        
        # Get recent answered questions with metrics
        response = self.db.table("session_questions").select(
            "time_spent_seconds, confidence_score, user_answer, questions(correct_answer)"
        ).eq("status", "answered").gte(
            "answered_at", cutoff_date.isoformat()
        ).in_(
            "session_id",
            self.db.table("practice_sessions").select("id").eq(
                "study_plan_id",
                self.db.table("study_plans").select("id").eq("user_id", user_id).execute().data[0]["id"]
            ).execute().data
        ).execute()
        
        if not response.data:
            return {"avg_time": None, "avg_confidence": None, "efficiency": None}
        
        times = []
        confidences = []
        efficiencies = []
        
        for record in response.data:
            if record.get("time_spent_seconds"):
                times.append(record["time_spent_seconds"])
            
            if record.get("confidence_score"):
                confidences.append(record["confidence_score"])
            
            # Calculate efficiency if we have required data
            if record.get("time_spent_seconds") and record.get("confidence_score"):
                user_ans = record.get("user_answer", [])
                correct_ans = record["questions"]["correct_answer"]
                is_correct = sorted(user_ans) == sorted(correct_ans) if user_ans else False
                
                eff = self.calculate_cognitive_efficiency(
                    record["time_spent_seconds"],
                    record["confidence_score"],
                    is_correct
                )
                efficiencies.append(eff)
        
        return {
            "avg_time": round(statistics.mean(times), 2) if times else None,
            "avg_confidence": round(statistics.mean(confidences), 2) if confidences else None,
            "efficiency": round(statistics.mean(efficiencies), 3) if efficiencies else None
        }
    
    async def _get_recent_performance_stats(self, user_id: str) -> Dict:
        """
        Get recent answer statistics (last 30 days).
        
        Args:
            user_id: Student ID
            
        Returns:
            Dictionary with total_answered and total_correct
        """
        cutoff_date = datetime.now() - timedelta(days=30)
        
        # This is a simplified version - in production you'd optimize this query
        try:
            # Get user's study plan
            plan_response = self.db.table("study_plans").select("id").eq(
                "user_id", user_id
            ).eq("is_active", True).execute()
            
            if not plan_response.data:
                return {"total_answered": 0, "total_correct": 0}
            
            plan_id = plan_response.data[0]["id"]
            
            # Get sessions from this plan
            sessions_response = self.db.table("practice_sessions").select("id").eq(
                "study_plan_id", plan_id
            ).execute()
            
            if not sessions_response.data:
                return {"total_answered": 0, "total_correct": 0}
            
            session_ids = [s["id"] for s in sessions_response.data]
            
            # Get answered questions
            questions_response = self.db.table("session_questions").select(
                "user_answer, questions(correct_answer)"
            ).in_("session_id", session_ids).eq(
                "status", "answered"
            ).gte("answered_at", cutoff_date.isoformat()).execute()
            
            total_answered = len(questions_response.data)
            total_correct = 0
            
            for record in questions_response.data:
                user_ans = record.get("user_answer", [])
                correct_ans = record["questions"]["correct_answer"]
                if user_ans and sorted(user_ans) == sorted(correct_ans):
                    total_correct += 1
            
            return {
                "total_answered": total_answered,
                "total_correct": total_correct
            }
        except Exception as e:
            print(f"Error getting performance stats: {e}")
            return {"total_answered": 0, "total_correct": 0}

