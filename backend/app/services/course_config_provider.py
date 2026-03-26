"""
Course Config Provider

Provides course configuration to services, replacing hardcoded SAT values.
Loads config from the courses table and makes it available for services
like diagnostic tests, mock exams, analytics, and predictions.
"""

from typing import Dict, List, Optional, Tuple
from supabase import Client


# In-memory cache to avoid repeated DB lookups within a request lifecycle
_course_cache: Dict[str, Dict] = {}


class CourseConfigProvider:
    """
    Loads and provides course configuration from the database.
    Replaces hardcoded SAT values throughout the codebase.
    """

    # Fallback defaults matching SAT config (backward compatibility)
    DEFAULT_SECTIONS = [
        {"key": "math", "name": "Math", "score_min": 200, "score_max": 800},
        {"key": "reading_writing", "name": "Reading & Writing", "score_min": 200, "score_max": 800},
    ]
    DEFAULT_TOTAL_SCORE_MIN = 400
    DEFAULT_TOTAL_SCORE_MAX = 1600
    DEFAULT_SCORE_INCREMENT = 10
    DEFAULT_DIAGNOSTIC = {
        "total_questions": 40,
        "section_distribution": {"math": 20, "reading_writing": 20},
        "difficulty_distribution": {"E": 0.33, "M": 0.34, "H": 0.33},
    }
    DEFAULT_MOCK_EXAM = {
        "modules": [
            {"key": "rw_module_1", "section": "reading_writing", "number": 1, "time_limit_minutes": 32},
            {"key": "rw_module_2", "section": "reading_writing", "number": 2, "time_limit_minutes": 32},
            {"key": "math_module_1", "section": "math", "number": 1, "time_limit_minutes": 32},
            {"key": "math_module_2", "section": "math", "number": 2, "time_limit_minutes": 32},
        ]
    }
    DEFAULT_QUESTIONS_PER_MODULE = 27
    DEFAULT_ADAPTIVE_THRESHOLDS = {
        "hard_threshold": 0.7,
        "medium_threshold": 0.4,
    }
    DEFAULT_DIFFICULTY_DISTRIBUTIONS = {
        "easy": {"E": 0.5, "M": 0.35, "H": 0.15},
        "medium": {"E": 0.33, "M": 0.34, "H": 0.33},
        "hard": {"E": 0.15, "M": 0.35, "H": 0.5},
    }

    def __init__(self, db: Client):
        self.db = db
        self._config: Optional[Dict] = None
        self._course: Optional[Dict] = None

    async def load(self, course_slug: str = "sat") -> "CourseConfigProvider":
        """Load course config from DB. Returns self for chaining."""
        global _course_cache

        if course_slug in _course_cache:
            self._course = _course_cache[course_slug]
            self._config = self._course.get("config", {})
            return self

        try:
            response = (
                self.db.table("courses")
                .select("*")
                .eq("slug", course_slug)
                .execute()
            )
            if response.data:
                self._course = response.data[0]
                self._config = self._course.get("config", {})
                _course_cache[course_slug] = self._course
            else:
                self._course = None
                self._config = {}
        except Exception:
            # Table may not exist yet — use defaults
            self._course = None
            self._config = {}

        return self

    async def load_by_id(self, course_id: str) -> "CourseConfigProvider":
        """Load course config by course ID."""
        global _course_cache

        # Check cache
        for cached in _course_cache.values():
            if cached.get("id") == course_id:
                self._course = cached
                self._config = cached.get("config", {})
                return self

        try:
            response = (
                self.db.table("courses")
                .select("*")
                .eq("id", course_id)
                .execute()
            )
            if response.data:
                self._course = response.data[0]
                self._config = self._course.get("config", {})
                slug = self._course.get("slug", course_id)
                _course_cache[slug] = self._course
            else:
                self._course = None
                self._config = {}
        except Exception:
            self._course = None
            self._config = {}

        return self

    @property
    def course_id(self) -> Optional[str]:
        return self._course.get("id") if self._course else None

    @property
    def course_name(self) -> str:
        return self._course.get("name", "SAT") if self._course else "SAT"

    @property
    def sections(self) -> List[Dict]:
        return self._config.get("sections", self.DEFAULT_SECTIONS)

    @property
    def section_keys(self) -> List[str]:
        return [s["key"] for s in self.sections]

    @property
    def total_score_min(self) -> int:
        return self._config.get("total_score_min", self.DEFAULT_TOTAL_SCORE_MIN)

    @property
    def total_score_max(self) -> int:
        return self._config.get("total_score_max", self.DEFAULT_TOTAL_SCORE_MAX)

    @property
    def score_increment(self) -> int:
        return self._config.get("score_increment", self.DEFAULT_SCORE_INCREMENT)

    def section_score_min(self, section_key: str) -> int:
        for s in self.sections:
            if s["key"] == section_key:
                return s.get("score_min", 200)
        return 200

    def section_score_max(self, section_key: str) -> int:
        for s in self.sections:
            if s["key"] == section_key:
                return s.get("score_max", 800)
        return 800

    def section_score_range(self, section_key: str) -> int:
        """Score range for a section (e.g. 600 for SAT math: 800-200)."""
        return self.section_score_max(section_key) - self.section_score_min(section_key)

    # --- Diagnostic config ---

    @property
    def diagnostic_config(self) -> Dict:
        return self._config.get("diagnostic", self.DEFAULT_DIAGNOSTIC)

    @property
    def diagnostic_total_questions(self) -> int:
        return self.diagnostic_config.get("total_questions", 40)

    @property
    def diagnostic_section_distribution(self) -> Dict[str, int]:
        return self.diagnostic_config.get(
            "section_distribution", {"math": 20, "reading_writing": 20}
        )

    @property
    def diagnostic_difficulty_distribution(self) -> Dict[str, float]:
        return self.diagnostic_config.get(
            "difficulty_distribution", {"E": 0.33, "M": 0.34, "H": 0.33}
        )

    # --- Mock exam config ---

    @property
    def mock_exam_config(self) -> Dict:
        return self._config.get("mock_exam", self.DEFAULT_MOCK_EXAM)

    @property
    def mock_exam_modules(self) -> List[Dict]:
        return self.mock_exam_config.get("modules", self.DEFAULT_MOCK_EXAM["modules"])

    def get_module_time_limit(self, module_key: str) -> int:
        for m in self.mock_exam_modules:
            if m["key"] == module_key:
                return m.get("time_limit_minutes", 32)
        return 32

    def get_module_section(self, module_key: str) -> str:
        for m in self.mock_exam_modules:
            if m["key"] == module_key:
                return m["section"]
        # Fallback: infer from key
        return "math" if "math" in module_key else "reading_writing"

    def get_module_number(self, module_key: str) -> int:
        for m in self.mock_exam_modules:
            if m["key"] == module_key:
                return m["number"]
        return 1

    def get_module_2_key_for_section(self, module_1_key: str) -> Optional[str]:
        """Given a module 1 key, find the corresponding module 2 key for the same section."""
        section = self.get_module_section(module_1_key)
        for m in self.mock_exam_modules:
            if m["section"] == section and m["number"] == 2:
                return m["key"]
        return None

    @property
    def questions_per_module(self) -> int:
        return self._config.get("questions_per_module", self.DEFAULT_QUESTIONS_PER_MODULE)

    @property
    def adaptive_thresholds(self) -> Dict[str, float]:
        return self._config.get("adaptive_thresholds", self.DEFAULT_ADAPTIVE_THRESHOLDS)

    @property
    def difficulty_distributions(self) -> Dict[str, Dict[str, float]]:
        return self._config.get("difficulty_distributions", self.DEFAULT_DIFFICULTY_DISTRIBUTIONS)

    def get_difficulty_distribution(self, level: str) -> Dict[str, float]:
        return self.difficulty_distributions.get(level, self.DEFAULT_DIFFICULTY_DISTRIBUTIONS["medium"])

    # --- Score conversion ---

    def convert_to_scaled_score(self, raw_score: int, total_questions: int, section_key: str) -> int:
        """Convert raw score to scaled score using course config."""
        score_min = self.section_score_min(section_key)
        score_max = self.section_score_max(section_key)
        score_range = score_max - score_min
        increment = self.score_increment

        if raw_score <= 0:
            return score_min

        percentage = raw_score / total_questions
        scaled = score_min + (percentage * score_range)

        # Round to nearest increment
        if increment > 1:
            scaled = round(scaled / increment) * increment

        return int(min(score_max, max(score_min, scaled)))

    def ability_to_section_score(self, theta: float, section_key: str) -> int:
        """Convert IRT ability (theta) to section score using course config."""
        score_min = self.section_score_min(section_key)
        score_max = self.section_score_max(section_key)
        midpoint = (score_min + score_max) / 2
        score_range = score_max - score_min

        # theta=0 maps to midpoint, each +1 theta ≈ +score_range/6
        score = midpoint + (theta * (score_range / 6))
        return int(max(score_min, min(score_max, score)))

    def get_default_section_score(self, section_key: str) -> int:
        """Default score for a section (midpoint minus a bit)."""
        score_min = self.section_score_min(section_key)
        score_max = self.section_score_max(section_key)
        # Default to ~2/5 of range above minimum
        return int(score_min + (score_max - score_min) * 0.33)


def clear_course_cache():
    """Clear the course config cache (useful for testing)."""
    global _course_cache
    _course_cache.clear()
