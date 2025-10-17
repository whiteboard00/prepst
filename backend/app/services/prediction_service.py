"""
Prediction Service

Calculates predictive SAT scores, goal tracking, and confidence intervals
for the cognition business analytics.
"""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import statistics
from supabase import Client


class PredictionService:
    """Service for calculating predictive SAT score analytics"""
    
    def __init__(self, db: Client):
        self.db = db
    
    async def calculate_predictive_scores(self, user_id: str) -> Dict[str, Any]:
        """
        Calculate predictive SAT scores with trajectory and goal tracking.
        
        Returns:
            Dict containing current scores, predictions, and goal analysis
        """
        try:
            # Get historical performance snapshots
            snapshots = await self._get_snapshots_last_90_days(user_id)
            
            # Get active study plan for goals
            study_plan = await self._get_active_study_plan(user_id)
            
            # Calculate current scores
            current_scores = self._get_current_scores(snapshots)
            
            # Calculate trends using linear regression
            math_trend = self._calculate_trend(snapshots, "predicted_sat_math")
            rw_trend = self._calculate_trend(snapshots, "predicted_sat_rw")
            
            # Calculate predictions for different time horizons
            predictions = self._calculate_predictions(
                current_scores, math_trend, rw_trend, study_plan
            )
            
            # Calculate goal analysis
            goal_analysis = self._calculate_goal_analysis(
                current_scores, predictions, study_plan
            )
            
            # Generate prediction timeline
            prediction_timeline = self._generate_prediction_timeline(
                current_scores, math_trend, rw_trend, 12  # 12 weeks
            )
            
            return {
                "current_math": current_scores["math"],
                "current_rw": current_scores["rw"],
                "current_total": current_scores["total"],
                "predicted_math_in_30_days": predictions["math_30_days"],
                "predicted_rw_in_30_days": predictions["rw_30_days"],
                "predicted_total_in_30_days": predictions["total_30_days"],
                "days_to_goal_math": goal_analysis["days_to_goal_math"],
                "days_to_goal_rw": goal_analysis["days_to_goal_rw"],
                "days_to_goal_total": goal_analysis["days_to_goal_total"],
                "velocity_needed": goal_analysis["velocity_needed"],
                "confidence_intervals": predictions["confidence_intervals"],
                "prediction_timeline": prediction_timeline,
                "goal_status": goal_analysis["goal_status"],
                "on_track": goal_analysis["on_track"],
                "recommendations": goal_analysis["recommendations"]
            }
            
        except Exception as e:
            print(f"Error calculating predictive scores: {e}")
            return self._get_default_prediction_data()
    
    async def _get_snapshots_last_90_days(self, user_id: str) -> List[Dict]:
        """Get performance snapshots from the last 90 days"""
        cutoff_date = (datetime.now() - timedelta(days=90)).isoformat()
        
        result = self.db.table("user_performance_snapshots").select(
            "predicted_sat_math, predicted_sat_rw, created_at, snapshot_type"
        ).eq("user_id", user_id).gte("created_at", cutoff_date).order(
            "created_at", desc=False
        ).execute()
        
        return result.data if result.data else []
    
    async def _get_active_study_plan(self, user_id: str) -> Optional[Dict]:
        """Get the user's active study plan"""
        result = self.db.table("study_plans").select(
            "target_math_score, target_rw_score, test_date, start_date"
        ).eq("user_id", user_id).eq("is_active", True).execute()
        
        return result.data[0] if result.data else None
    
    def _get_current_scores(self, snapshots: List[Dict]) -> Dict[str, int]:
        """Get current scores from the most recent snapshot"""
        if not snapshots:
            return {"math": 400, "rw": 400, "total": 800}
        
        latest = snapshots[-1]
        math = latest.get("predicted_sat_math", 400) or 400
        rw = latest.get("predicted_sat_rw", 400) or 400
        
        return {
            "math": math,
            "rw": rw,
            "total": math + rw
        }
    
    def _calculate_trend(self, snapshots: List[Dict], score_field: str) -> Dict[str, float]:
        """
        Calculate linear regression trend for a score field.
        Returns slope (points per week) and R-squared.
        """
        if len(snapshots) < 2:
            return {"slope": 0.0, "r_squared": 0.0, "intercept": 400.0}
        
        # Prepare data for linear regression
        data_points = []
        for snapshot in snapshots:
            score = snapshot.get(score_field, 400) or 400
            date = datetime.fromisoformat(snapshot["created_at"].replace('Z', '+00:00'))
            # Convert to weeks since first snapshot
            weeks = (date - datetime.fromisoformat(snapshots[0]["created_at"].replace('Z', '+00:00'))).days / 7.0
            data_points.append((weeks, score))
        
        if len(data_points) < 2:
            return {"slope": 0.0, "r_squared": 0.0, "intercept": 400.0}
        
        # Simple linear regression
        n = len(data_points)
        sum_x = sum(point[0] for point in data_points)
        sum_y = sum(point[1] for point in data_points)
        sum_xy = sum(point[0] * point[1] for point in data_points)
        sum_x2 = sum(point[0] ** 2 for point in data_points)
        sum_y2 = sum(point[1] ** 2 for point in data_points)
        
        # Calculate slope and intercept
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x ** 2)
        intercept = (sum_y - slope * sum_x) / n
        
        # Calculate R-squared
        y_mean = sum_y / n
        ss_tot = sum((point[1] - y_mean) ** 2 for point in data_points)
        ss_res = sum((point[1] - (slope * point[0] + intercept)) ** 2 for point in data_points)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
        
        return {
            "slope": round(slope, 2),
            "r_squared": round(r_squared, 3),
            "intercept": round(intercept, 1)
        }
    
    def _calculate_predictions(
        self, 
        current_scores: Dict[str, int], 
        math_trend: Dict[str, float], 
        rw_trend: Dict[str, float],
        study_plan: Optional[Dict]
    ) -> Dict[str, Any]:
        """Calculate predictions for different time horizons"""
        
        # 30-day predictions
        math_30_days = current_scores["math"] + (math_trend["slope"] * 4.3)  # ~4.3 weeks
        rw_30_days = current_scores["rw"] + (rw_trend["slope"] * 4.3)
        total_30_days = math_30_days + rw_30_days
        
        # Confidence intervals (based on R-squared and historical variance)
        math_confidence = self._calculate_confidence_interval(
            current_scores["math"], math_trend, 4.3
        )
        rw_confidence = self._calculate_confidence_interval(
            current_scores["rw"], rw_trend, 4.3
        )
        
        return {
            "math_30_days": round(math_30_days),
            "rw_30_days": round(rw_30_days),
            "total_30_days": round(total_30_days),
            "confidence_intervals": {
                "math": math_confidence,
                "rw": rw_confidence,
                "total": {
                    "optimistic": math_confidence["optimistic"] + rw_confidence["optimistic"],
                    "realistic": math_confidence["realistic"] + rw_confidence["realistic"],
                    "pessimistic": math_confidence["pessimistic"] + rw_confidence["pessimistic"]
                }
            }
        }
    
    def _calculate_confidence_interval(
        self, 
        current_score: int, 
        trend: Dict[str, float], 
        weeks: float
    ) -> Dict[str, int]:
        """Calculate confidence intervals for predictions"""
        predicted = current_score + (trend["slope"] * weeks)
        
        # Uncertainty based on R-squared and trend consistency
        uncertainty_factor = max(0.1, 1 - trend["r_squared"])
        uncertainty = 50 * uncertainty_factor  # Base uncertainty of 50 points
        
        return {
            "optimistic": round(predicted + uncertainty),
            "realistic": round(predicted),
            "pessimistic": round(predicted - uncertainty)
        }
    
    def _calculate_goal_analysis(
        self,
        current_scores: Dict[str, int],
        predictions: Dict[str, Any],
        study_plan: Optional[Dict]
    ) -> Dict[str, Any]:
        """Calculate goal analysis and recommendations"""
        if not study_plan:
            return {
                "days_to_goal_math": None,
                "days_to_goal_rw": None,
                "days_to_goal_total": None,
                "velocity_needed": "No goal set",
                "goal_status": "No goal",
                "on_track": False,
                "recommendations": ["Set a target score in your study plan to get predictions"]
            }
        
        target_math = study_plan.get("target_math_score", 0)
        target_rw = study_plan.get("target_rw_score", 0)
        target_total = target_math + target_rw
        
        # Calculate days to goal based on current velocity
        math_velocity = (predictions["math_30_days"] - current_scores["math"]) / 30
        rw_velocity = (predictions["rw_30_days"] - current_scores["rw"]) / 30
        total_velocity = math_velocity + rw_velocity
        
        days_to_goal_math = self._calculate_days_to_goal(
            current_scores["math"], target_math, math_velocity
        )
        days_to_goal_rw = self._calculate_days_to_goal(
            current_scores["rw"], target_rw, rw_velocity
        )
        days_to_goal_total = self._calculate_days_to_goal(
            current_scores["total"], target_total, total_velocity
        )
        
        # Calculate velocity needed
        test_date = datetime.fromisoformat(study_plan["test_date"])
        days_until_test = (test_date - datetime.now()).days
        
        if days_until_test > 0:
            math_velocity_needed = (target_math - current_scores["math"]) / days_until_test
            rw_velocity_needed = (target_rw - current_scores["rw"]) / days_until_test
            total_velocity_needed = math_velocity_needed + rw_velocity_needed
            
            velocity_needed = f"+{round(total_velocity_needed, 1)} pts/day"
        else:
            velocity_needed = "Test date passed"
        
        # Determine goal status
        goal_status = self._determine_goal_status(
            current_scores, predictions, study_plan
        )
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            current_scores, predictions, study_plan, goal_status
        )
        
        return {
            "days_to_goal_math": days_to_goal_math,
            "days_to_goal_rw": days_to_goal_rw,
            "days_to_goal_total": days_to_goal_total,
            "velocity_needed": velocity_needed,
            "goal_status": goal_status,
            "on_track": goal_status in ["On Track", "Ahead of Schedule"],
            "recommendations": recommendations
        }
    
    def _calculate_days_to_goal(
        self, 
        current_score: int, 
        target_score: int, 
        daily_velocity: float
    ) -> Optional[int]:
        """Calculate days needed to reach goal at current velocity"""
        if daily_velocity <= 0:
            return None
        
        days_needed = (target_score - current_score) / daily_velocity
        return max(0, int(days_needed))
    
    def _determine_goal_status(
        self,
        current_scores: Dict[str, int],
        predictions: Dict[str, Any],
        study_plan: Dict
    ) -> str:
        """Determine if user is on track to meet goals"""
        target_total = study_plan.get("target_math_score", 0) + study_plan.get("target_rw_score", 0)
        predicted_total = predictions["total_30_days"]
        
        if predicted_total >= target_total:
            return "Ahead of Schedule"
        elif predicted_total >= target_total * 0.95:
            return "On Track"
        elif predicted_total >= target_total * 0.85:
            return "Behind Schedule"
        else:
            return "Needs Acceleration"
    
    def _generate_recommendations(
        self,
        current_scores: Dict[str, int],
        predictions: Dict[str, Any],
        study_plan: Dict,
        goal_status: str
    ) -> List[str]:
        """Generate personalized recommendations"""
        recommendations = []
        
        if goal_status == "Ahead of Schedule":
            recommendations.append("🎉 You're ahead of schedule! Consider setting higher goals.")
            recommendations.append("Focus on maintaining your current study pace.")
        elif goal_status == "On Track":
            recommendations.append("✅ You're on track to meet your goals!")
            recommendations.append("Keep up the consistent practice routine.")
        elif goal_status == "Behind Schedule":
            recommendations.append("⚠️ You're slightly behind schedule. Consider increasing study time.")
            recommendations.append("Focus on your weakest areas for maximum improvement.")
        else:
            recommendations.append("🚨 You need to accelerate your learning pace.")
            recommendations.append("Consider intensive practice sessions or tutoring.")
        
        # Subject-specific recommendations
        math_gap = study_plan.get("target_math_score", 0) - current_scores["math"]
        rw_gap = study_plan.get("target_rw_score", 0) - current_scores["rw"]
        
        if math_gap > rw_gap:
            recommendations.append("📊 Focus more on Math practice - it's your bigger opportunity.")
        elif rw_gap > math_gap:
            recommendations.append("📚 Focus more on Reading & Writing practice.")
        
        return recommendations
    
    def _generate_prediction_timeline(
        self,
        current_scores: Dict[str, int],
        math_trend: Dict[str, float],
        rw_trend: Dict[str, float],
        weeks: int
    ) -> List[Dict[str, Any]]:
        """Generate prediction timeline for the next N weeks"""
        timeline = []
        
        for week in range(1, weeks + 1):
            math_score = current_scores["math"] + (math_trend["slope"] * week)
            rw_score = current_scores["rw"] + (rw_trend["slope"] * week)
            total_score = math_score + rw_score
            
            timeline.append({
                "week": week,
                "math_score": round(math_score),
                "rw_score": round(rw_score),
                "total_score": round(total_score),
                "date": (datetime.now() + timedelta(weeks=week)).strftime("%Y-%m-%d")
            })
        
        return timeline
    
    def _get_default_prediction_data(self) -> Dict[str, Any]:
        """Return default data when calculation fails"""
        return {
            "current_math": 400,
            "current_rw": 400,
            "current_total": 800,
            "predicted_math_in_30_days": 400,
            "predicted_rw_in_30_days": 400,
            "predicted_total_in_30_days": 800,
            "days_to_goal_math": None,
            "days_to_goal_rw": None,
            "days_to_goal_total": None,
            "velocity_needed": "No data",
            "confidence_intervals": {
                "math": {"optimistic": 600, "realistic": 500, "pessimistic": 400},
                "rw": {"optimistic": 600, "realistic": 500, "pessimistic": 400},
                "total": {"optimistic": 1200, "realistic": 1000, "pessimistic": 800}
            },
            "prediction_timeline": [],
            "goal_status": "No Data",
            "on_track": False,
            "recommendations": ["Complete more practice sessions to get accurate predictions"]
        }
