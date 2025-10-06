from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Literal
from datetime import datetime
from enum import Enum


class DifficultyLevel(str, Enum):
    EASY = "E"
    MEDIUM = "M"
    HARD = "H"


class ConfidenceLevel(str, Enum):
    APPLE = "apple"  # Confident
    LEMON = "lemon"  # 75% confident
    BROCCOLI = "broccoli"  # 50% confident
    ICE_CUBE = "ice_cube"  # Guessed


class Module(str, Enum):
    MATH = "math"
    ENGLISH = "english"


# Topic definitions with their weights (importance on the test)
MATH_TOPICS = {
    # Algebra
    "Linear equations in one variable": 0.9,
    "Linear functions": 1.0,
    "Linear equations in two variables": 0.9,
    "Systems of two linear equations in two variables": 0.85,
    "Linear inequalities in one or two variables": 0.8,
    
    # Advanced Math
    "Equivalent expressions": 0.95,
    "Nonlinear equations in one variable and systems of equations in two variables": 0.95,
    "Nonlinear functions": 0.9,
    
    # Problem-Solving and Data Analysis
    "Ratios, rates, proportional relationships, and units": 0.9,
    "Percentages": 0.85,
    "One-variable data: Distributions and measures of center and spread": 0.8,
    "Two-variable data: Models and scatterplots": 0.85,
    "Probability and conditional probability": 0.8,
    "Inference from sample statistics and margin of error": 0.75,
    "Evaluating statistical claims: Observational studies and experiments": 0.7,
    
    # Geometry and Trigonometry
    "Area and volume": 0.8,
    "Lines, angles, and triangles": 0.85,
    "Right triangles and trigonometry": 0.9,
    "Circles": 0.75,
}

ENGLISH_TOPICS = {
    # Craft and Structure
    "Cross-Text Connections": 0.85,
    "Text Structure and Purpose": 0.9,
    "Words in Context": 0.95,
    
    # Expression of Ideas
    "Rhetorical Synthesis": 0.85,
    "Transitions": 0.9,
    
    # Information and Ideas
    "Central Ideas and Details": 0.95,
    "Command of Evidence": 0.9,
    "Inferences": 0.9,
    
    # Standard English Conventions
    "Boundaries": 0.85,
    "Form, Structure, and Sense": 0.9,
}

ALL_TOPICS = {**MATH_TOPICS, **ENGLISH_TOPICS}


class AnswerSubmission(BaseModel):
    """User's answer submission for a single question"""
    question_id: str
    topic: str
    is_correct: bool
    difficulty: DifficultyLevel
    time_taken: float  # in seconds
    expected_time: float  # in seconds
    confidence: ConfidenceLevel
    user_id: str


class QuestionPerformance(BaseModel):
    """Performance score for a single question"""
    question_id: str
    topic: str
    performance_score: float  # 0 to 1.1
    base_score: float
    time_factor: float
    confidence_modifier: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class TopicMastery(BaseModel):
    """Mastery score for a topic"""
    topic: str
    mastery_score: float = Field(ge=0.0, le=1.0)  # 0 to 1
    last_studied: datetime = Field(default_factory=datetime.utcnow)
    questions_answered: int = 0
    correct_answers: int = 0


class TopicPriority(BaseModel):
    """Priority calculation for a topic"""
    topic: str
    priority_score: float
    mastery_gap: float
    base_weight: float
    forgetting_factor: float
    days_since_study: int


class UserProfile(BaseModel):
    """User profile with initial scores and goals"""
    user_id: str
    past_math_score: int = Field(ge=200, le=800)
    past_english_score: int = Field(ge=200, le=800)
    target_math_score: int = Field(ge=200, le=800)
    target_english_score: int = Field(ge=200, le=800)
    test_date: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Topic masteries - initialized based on past scores
    topic_masteries: Dict[str, TopicMastery] = {}


class StudySession(BaseModel):
    """A practice session for a specific topic"""
    session_id: str
    user_id: str
    topic: str
    questions: List[str]  # List of question IDs
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    performances: List[QuestionPerformance] = []


class NextTopicRecommendation(BaseModel):
    """Recommendation for the next topic to study"""
    topic: str
    priority_score: float
    current_mastery: float
    target_mastery: float
    questions_count: int
    estimated_time_minutes: int
    reason: str


class SessionStats(BaseModel):
    """Statistics for a completed session"""
    session_id: str
    topic: str
    total_questions: int
    correct_answers: int
    average_time: float
    mastery_before: float
    mastery_after: float
    improvement: float

