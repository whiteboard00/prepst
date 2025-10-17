"""
Learning Velocity Service

Calculates learning velocity, momentum, and acceleration metrics
for the cognition business analytics.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import statistics
from supabase import Client


class VelocityService:
    """Service for calculating learning velocity metrics"""
    
    def __init__(self, db: Client):
        self.db = db
    
    async def calculate_learning_velocity(self, user_id: str) -> Dict[str, Any]:
        """
        Calculate comprehensive learning velocity metrics for a user.
        
        Returns:
            Dict containing velocity, momentum, acceleration, and trends
        """
        try:
            # Get skill-level mastery data
            mastery_data = await self._get_mastery_data(user_id)
            
            # Get performance snapshots for trend analysis
            snapshots = await self._get_performance_snapshots(user_id)
            
            # Calculate overall velocity from snapshots
            overall_velocity = self._calculate_overall_velocity(snapshots)
            
            # Calculate momentum score
            momentum_score = self._calculate_momentum_score(mastery_data, snapshots)
            
            # Calculate velocity by skill
            velocity_by_skill = self._calculate_velocity_by_skill(mastery_data)
            
            # Calculate velocity trend (last 4 weeks)
            velocity_trend = self._calculate_velocity_trend(snapshots)
            
            # Calculate acceleration (current vs previous period)
            acceleration = self._calculate_acceleration(snapshots)
            
            return {
                "overall_velocity": overall_velocity,
                "momentum_score": momentum_score,
                "velocity_by_skill": velocity_by_skill,
                "velocity_trend": velocity_trend,
                "acceleration": acceleration,
                "is_improving": acceleration > 1.0,
                "velocity_percentile": self._calculate_velocity_percentile(overall_velocity)
            }
            
        except Exception as e:
            print(f"Error calculating learning velocity: {e}")
            return self._get_default_velocity_data()
    
    async def _get_mastery_data(self, user_id: str) -> List[Dict]:
        """Get user skill mastery data with velocity information"""
        result = self.db.table("user_skill_mastery").select(
            "skill_id, velocity, learning_rate, total_attempts, correct_attempts, "
            "mastery_probability, last_practiced_at, created_at"
        ).eq("user_id", user_id).execute()
        
        return result.data if result.data else []
    
    async def _get_performance_snapshots(self, user_id: str, limit: int = 20) -> List[Dict]:
        """Get recent performance snapshots for trend analysis"""
        result = self.db.table("user_performance_snapshots").select(
            "predicted_sat_math, predicted_sat_rw, questions_answered, "
            "questions_correct, created_at, snapshot_type"
        ).eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        
        return result.data if result.data else []
    
    def _calculate_overall_velocity(self, snapshots: List[Dict]) -> float:
        """Calculate overall learning velocity from performance snapshots"""
        if len(snapshots) < 2:
            return 0.0
        
        # Sort by date (oldest first)
        sorted_snapshots = sorted(snapshots, key=lambda x: x["created_at"])
        
        # Calculate total score improvement over time
        first_snapshot = sorted_snapshots[0]
        last_snapshot = sorted_snapshots[-1]
        
        first_total = (first_snapshot.get("predicted_sat_math", 0) or 0) + \
                     (first_snapshot.get("predicted_sat_rw", 0) or 0)
        last_total = (last_snapshot.get("predicted_sat_math", 0) or 0) + \
                    (last_snapshot.get("predicted_sat_rw", 0) or 0)
        
        # Calculate time difference in weeks
        first_date = datetime.fromisoformat(first_snapshot["created_at"].replace('Z', '+00:00'))
        last_date = datetime.fromisoformat(last_snapshot["created_at"].replace('Z', '+00:00'))
        weeks_elapsed = (last_date - first_date).days / 7.0
        
        if weeks_elapsed <= 0:
            return 0.0
        
        # Velocity = points improvement per week
        velocity = (last_total - first_total) / weeks_elapsed
        return round(velocity, 1)
    
    def _calculate_momentum_score(self, mastery_data: List[Dict], snapshots: List[Dict]) -> int:
        """Calculate momentum score (0-100) based on recent activity and improvement"""
        if not mastery_data and not snapshots:
            return 50  # Neutral score
        
        momentum_factors = []
        
        # Factor 1: Recent activity (based on last_practiced_at)
        recent_activity = self._calculate_recent_activity_score(mastery_data)
        momentum_factors.append(recent_activity)
        
        # Factor 2: Velocity consistency (based on snapshots)
        velocity_consistency = self._calculate_velocity_consistency(snapshots)
        momentum_factors.append(velocity_consistency)
        
        # Factor 3: Skill improvement rate
        skill_improvement = self._calculate_skill_improvement_rate(mastery_data)
        momentum_factors.append(skill_improvement)
        
        # Factor 4: Practice frequency
        practice_frequency = self._calculate_practice_frequency(mastery_data)
        momentum_factors.append(practice_frequency)
        
        # Weighted average of factors
        momentum_score = sum(momentum_factors) / len(momentum_factors)
        return max(0, min(100, int(momentum_score)))
    
    def _calculate_recent_activity_score(self, mastery_data: List[Dict]) -> float:
        """Calculate score based on recent practice activity"""
        if not mastery_data:
            return 50.0
        
        now = datetime.now()
        recent_practices = 0
        
        for mastery in mastery_data:
            if mastery.get("last_practiced_at"):
                last_practice = datetime.fromisoformat(
                    mastery["last_practiced_at"].replace('Z', '+00:00')
                )
                days_since = (now - last_practice).days
                
                if days_since <= 7:  # Practiced within last week
                    recent_practices += 1
        
        activity_ratio = recent_practices / len(mastery_data)
        return activity_ratio * 100
    
    def _calculate_velocity_consistency(self, snapshots: List[Dict]) -> float:
        """Calculate how consistent the learning velocity is"""
        if len(snapshots) < 3:
            return 50.0
        
        # Calculate velocity between consecutive snapshots
        velocities = []
        sorted_snapshots = sorted(snapshots, key=lambda x: x["created_at"])
        
        for i in range(1, len(sorted_snapshots)):
            prev = sorted_snapshots[i-1]
            curr = sorted_snapshots[i]
            
            prev_total = (prev.get("predicted_sat_math", 0) or 0) + \
                        (prev.get("predicted_sat_rw", 0) or 0)
            curr_total = (curr.get("predicted_sat_math", 0) or 0) + \
                        (curr.get("predicted_sat_rw", 0) or 0)
            
            prev_date = datetime.fromisoformat(prev["created_at"].replace('Z', '+00:00'))
            curr_date = datetime.fromisoformat(curr["created_at"].replace('Z', '+00:00'))
            weeks = (curr_date - prev_date).days / 7.0
            
            if weeks > 0:
                velocity = (curr_total - prev_total) / weeks
                velocities.append(velocity)
        
        if not velocities:
            return 50.0
        
        # Consistency = inverse of standard deviation
        if len(velocities) > 1:
            std_dev = statistics.stdev(velocities)
            # Convert to 0-100 scale (lower std dev = higher consistency)
            consistency = max(0, 100 - (std_dev * 10))
        else:
            consistency = 75.0  # Single data point, assume moderate consistency
        
        return consistency
    
    def _calculate_skill_improvement_rate(self, mastery_data: List[Dict]) -> float:
        """Calculate rate of skill improvement"""
        if not mastery_data:
            return 50.0
        
        # Count skills with positive velocity
        improving_skills = sum(1 for mastery in mastery_data 
                             if mastery.get("velocity", 0) > 0.01)
        
        improvement_ratio = improving_skills / len(mastery_data)
        return improvement_ratio * 100
    
    def _calculate_practice_frequency(self, mastery_data: List[Dict]) -> float:
        """Calculate practice frequency score"""
        if not mastery_data:
            return 50.0
        
        # Calculate average attempts per skill
        total_attempts = sum(mastery.get("total_attempts", 0) for mastery in mastery_data)
        avg_attempts = total_attempts / len(mastery_data)
        
        # Convert to 0-100 scale (more attempts = higher frequency)
        frequency_score = min(100, avg_attempts * 2)  # Scale factor
        return frequency_score
    
    def _calculate_velocity_by_skill(self, mastery_data: List[Dict]) -> List[Dict]:
        """Calculate velocity metrics by skill"""
        if not mastery_data:
            return []
        
        # Get topic names for skills
        skill_ids = [mastery["skill_id"] for mastery in mastery_data]
        topics_result = self.db.table("topics").select("id, name").in_("id", skill_ids).execute()
        topic_names = {topic["id"]: topic["name"] for topic in topics_result.data}
        
        velocity_by_skill = []
        for mastery in mastery_data:
            skill_name = topic_names.get(mastery["skill_id"], "Unknown Skill")
            velocity = mastery.get("velocity", 0.0)
            
            # Categorize velocity
            if velocity > 0.05:
                category = "Fast"
            elif velocity > 0.02:
                category = "Steady"
            elif velocity > -0.02:
                category = "Plateau"
            else:
                category = "Struggling"
            
            velocity_by_skill.append({
                "skill_name": skill_name,
                "velocity": round(velocity, 4),
                "category": category,
                "total_attempts": mastery.get("total_attempts", 0),
                "mastery": round(mastery.get("mastery_probability", 0) * 100, 1)
            })
        
        # Sort by velocity (highest first)
        return sorted(velocity_by_skill, key=lambda x: x["velocity"], reverse=True)
    
    def _calculate_velocity_trend(self, snapshots: List[Dict]) -> List[Dict]:
        """Calculate velocity trend over last 4 weeks"""
        if len(snapshots) < 2:
            return []
        
        # Group snapshots by week
        weekly_data = {}
        for snapshot in snapshots:
            date = datetime.fromisoformat(snapshot["created_at"].replace('Z', '+00:00'))
            week_key = date.strftime("%Y-W%U")
            
            if week_key not in weekly_data:
                weekly_data[week_key] = []
            weekly_data[week_key].append(snapshot)
        
        # Calculate weekly velocities
        trend_data = []
        sorted_weeks = sorted(weekly_data.keys())
        
        for i in range(1, len(sorted_weeks)):
            prev_week = sorted_weeks[i-1]
            curr_week = sorted_weeks[i]
            
            prev_snapshots = weekly_data[prev_week]
            curr_snapshots = weekly_data[curr_week]
            
            # Use latest snapshot from each week
            prev_latest = max(prev_snapshots, key=lambda x: x["created_at"])
            curr_latest = max(curr_snapshots, key=lambda x: x["created_at"])
            
            prev_total = (prev_latest.get("predicted_sat_math", 0) or 0) + \
                        (prev_latest.get("predicted_sat_rw", 0) or 0)
            curr_total = (curr_latest.get("predicted_sat_math", 0) or 0) + \
                        (curr_latest.get("predicted_sat_rw", 0) or 0)
            
            velocity = curr_total - prev_total  # Weekly improvement
            
            trend_data.append({
                "week": curr_week,
                "velocity": round(velocity, 1),
                "total_score": curr_total
            })
        
        return trend_data[-4:]  # Last 4 weeks
    
    def _calculate_acceleration(self, snapshots: List[Dict]) -> float:
        """Calculate acceleration (current velocity vs previous period)"""
        if len(snapshots) < 4:
            return 1.0  # No acceleration data
        
        # Split snapshots into two periods
        mid_point = len(snapshots) // 2
        recent_period = snapshots[:mid_point]
        previous_period = snapshots[mid_point:]
        
        recent_velocity = self._calculate_overall_velocity(recent_period)
        previous_velocity = self._calculate_overall_velocity(previous_period)
        
        if previous_velocity == 0:
            return 1.0 if recent_velocity > 0 else 1.0
        
        acceleration = recent_velocity / previous_velocity
        return round(acceleration, 2)
    
    def _calculate_velocity_percentile(self, velocity: float) -> int:
        """Calculate velocity percentile (placeholder - would need population data)"""
        # This would ideally compare against all users
        # For now, use a simple mapping
        if velocity >= 10:
            return 90
        elif velocity >= 5:
            return 75
        elif velocity >= 2:
            return 50
        elif velocity >= 0:
            return 25
        else:
            return 10
    
    def _get_default_velocity_data(self) -> Dict[str, Any]:
        """Return default data when calculation fails"""
        return {
            "overall_velocity": 0.0,
            "momentum_score": 50,
            "velocity_by_skill": [],
            "velocity_trend": [],
            "acceleration": 1.0,
            "is_improving": False,
            "velocity_percentile": 25
        }
