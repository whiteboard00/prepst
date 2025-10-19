from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, Dict, Any
from datetime import date, datetime
from uuid import UUID


class UserProfile(BaseModel):
    """Complete user profile model"""
    id: UUID
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    profile_photo_url: Optional[str] = None
    grade_level: Optional[str] = None
    school_name: Optional[str] = None
    phone_number: Optional[str] = None
    parent_email: Optional[EmailStr] = None
    timezone: str = "America/New_York"
    bio: Optional[str] = None
    study_goal: Optional[str] = None
    onboarding_completed: bool = False
    role: str = "user"
    created_at: datetime
    updated_at: Optional[datetime] = None


class UserProfileUpdate(BaseModel):
    """Model for updating user profile"""
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    full_name: Optional[str] = Field(None, max_length=255)
    profile_photo_url: Optional[str] = None
    grade_level: Optional[str] = Field(None, max_length=20)
    school_name: Optional[str] = Field(None, max_length=255)
    phone_number: Optional[str] = Field(None, max_length=20)
    parent_email: Optional[EmailStr] = None
    timezone: Optional[str] = Field(None, max_length=50)
    bio: Optional[str] = Field(None, max_length=500)
    study_goal: Optional[str] = Field(None, max_length=500)

    @validator('grade_level')
    def validate_grade_level(cls, v):
        if v and v not in ['9', '10', '11', '12', 'gap_year', 'college', 'other']:
            raise ValueError('Invalid grade level')
        return v

    @validator('phone_number')
    def validate_phone_number(cls, v):
        if v:
            # Remove any non-digit characters
            digits = ''.join(filter(str.isdigit, v))
            if len(digits) < 10 or len(digits) > 15:
                raise ValueError('Invalid phone number length')
        return v


class UserPreferences(BaseModel):
    """User preferences model"""
    id: UUID
    user_id: UUID

    # Theme and display
    theme: str = "light"
    font_size: str = "normal"
    reduce_animations: bool = False

    # Study preferences
    preferred_study_time: str = "evening"
    session_length_preference: int = 30
    learning_style: str = "balanced"
    difficulty_adaptation: str = "balanced"

    # Notifications
    email_notifications: Dict[str, bool] = Field(default_factory=lambda: {
        "daily_reminder": True,
        "weekly_progress": True,
        "achievement_unlocked": True,
        "streak_reminder": True,
        "parent_reports": False
    })
    push_notifications: Dict[str, bool] = Field(default_factory=lambda: {
        "enabled": False,
        "daily_reminder": False,
        "achievement_unlocked": False
    })

    # Privacy
    profile_visibility: str = "private"
    show_on_leaderboard: bool = False

    created_at: datetime
    updated_at: Optional[datetime] = None


class UserPreferencesUpdate(BaseModel):
    """Model for updating user preferences"""
    theme: Optional[str] = None
    font_size: Optional[str] = None
    reduce_animations: Optional[bool] = None
    preferred_study_time: Optional[str] = None
    session_length_preference: Optional[int] = None
    learning_style: Optional[str] = None
    difficulty_adaptation: Optional[str] = None
    email_notifications: Optional[Dict[str, bool]] = None
    push_notifications: Optional[Dict[str, bool]] = None
    profile_visibility: Optional[str] = None
    show_on_leaderboard: Optional[bool] = None

    @validator('theme')
    def validate_theme(cls, v):
        if v and v not in ['light', 'dark', 'auto']:
            raise ValueError('Invalid theme')
        return v

    @validator('font_size')
    def validate_font_size(cls, v):
        if v and v not in ['small', 'normal', 'large']:
            raise ValueError('Invalid font size')
        return v

    @validator('session_length_preference')
    def validate_session_length(cls, v):
        if v and v not in [15, 30, 45, 60]:
            raise ValueError('Session length must be 15, 30, 45, or 60 minutes')
        return v


class UserAchievement(BaseModel):
    """User achievement model"""
    id: UUID
    user_id: UUID
    achievement_type: str
    achievement_name: str
    achievement_description: Optional[str] = None
    achievement_icon: Optional[str] = None
    unlocked_at: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)


class UserStreak(BaseModel):
    """User streak model"""
    id: UUID
    user_id: UUID
    current_streak: int = 0
    longest_streak: int = 0
    last_study_date: Optional[date] = None
    streak_frozen_until: Optional[date] = None
    total_study_days: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None


class UserProfileStats(BaseModel):
    """Aggregated user profile statistics"""
    total_practice_sessions: int = 0
    total_questions_answered: int = 0
    total_correct_answers: int = 0
    accuracy_percentage: float = 0.0
    total_study_hours: float = 0.0
    average_session_duration: float = 0.0
    current_math_score: Optional[int] = None
    target_math_score: Optional[int] = None
    current_rw_score: Optional[int] = None
    target_rw_score: Optional[int] = None
    days_until_test: Optional[int] = None
    improvement_math: Optional[int] = None
    improvement_rw: Optional[int] = None


class ProfileResponse(BaseModel):
    """Complete profile response with all related data"""
    profile: UserProfile
    preferences: Optional[UserPreferences] = None
    streak: Optional[UserStreak] = None
    stats: Optional[UserProfileStats] = None
    recent_achievements: list[UserAchievement] = []