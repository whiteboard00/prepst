"""
Question Bank Service - Manages loading and selecting questions
"""
import json
import random
from typing import List, Dict, Optional
from pathlib import Path
from app.models.schemas import DifficultyLevel


class QuestionBankService:
    """
    Service for loading and filtering questions from the question bank.
    """
    
    def __init__(self, question_bank_path: str = None):
        """
        Initialize the question bank service.
        
        Args:
            question_bank_path: Path to question_bank.json file
        """
        if question_bank_path is None:
            # Default path relative to the backend directory
            backend_dir = Path(__file__).parent.parent.parent
            question_bank_path = backend_dir / "data" / "question_bank.json"
        
        self.question_bank_path = Path(question_bank_path)
        self.questions: Dict = {}
        self.load_questions()
    
    def load_questions(self):
        """Load questions from the JSON file."""
        try:
            with open(self.question_bank_path, 'r', encoding='utf-8') as f:
                self.questions = json.load(f)
            print(f"Loaded {len(self.questions)} questions from question bank")
        except Exception as e:
            print(f"Error loading question bank: {e}")
            self.questions = {}
    
    def get_question(self, question_id: str) -> Optional[Dict]:
        """
        Get a specific question by ID.
        
        Args:
            question_id: The question ID
        
        Returns:
            Question dictionary or None if not found
        """
        return self.questions.get(question_id)
    
    def filter_questions(
        self,
        topic: Optional[str] = None,
        difficulty: Optional[DifficultyLevel] = None,
        module: Optional[str] = None
    ) -> List[Dict]:
        """
        Filter questions by topic, difficulty, and/or module.
        
        Args:
            topic: Topic name (e.g., "Linear functions")
            difficulty: Difficulty level (E, M, H)
            module: Module name ("math" or "english")
        
        Returns:
            List of matching questions
        """
        filtered = []
        
        for question_id, question in self.questions.items():
            # Check module
            if module and question.get("module", "").lower() != module.lower():
                continue
            
            # Check topic
            if topic and question.get("skill_desc", "") != topic:
                continue
            
            # Check difficulty
            if difficulty and question.get("difficulty", "") != difficulty.value:
                continue
            
            # Add question ID to the question data
            question_with_id = {**question, "id": question_id}
            filtered.append(question_with_id)
        
        return filtered
    
    def get_questions_for_session(
        self,
        topic: str,
        mastery_score: float,
        num_questions: int = 10
    ) -> List[Dict]:
        """
        Get questions for a practice session based on mastery level.
        
        Dynamic Difficulty Distribution:
        - If M_t < 0.4: Serve 7 Easy, 3 Medium questions
        - If 0.4 ≤ M_t < 0.75: Serve 2 Easy, 6 Medium, 2 Hard questions
        - If M_t ≥ 0.75: Serve 1 Medium, 9 Hard questions
        
        Args:
            topic: Topic name
            mastery_score: Current mastery score (0 to 1)
            num_questions: Number of questions to return
        
        Returns:
            List of selected questions
        """
        # Get all questions for this topic
        all_questions = self.filter_questions(topic=topic)
        
        if not all_questions:
            print(f"Warning: No questions found for topic '{topic}'")
            return []
        
        # Separate by difficulty
        easy_questions = [q for q in all_questions if q.get("difficulty") == "E"]
        medium_questions = [q for q in all_questions if q.get("difficulty") == "M"]
        hard_questions = [q for q in all_questions if q.get("difficulty") == "H"]
        
        # Determine distribution based on mastery
        if mastery_score < 0.4:
            # Beginner level
            easy_count = 7
            medium_count = 3
            hard_count = 0
        elif mastery_score < 0.75:
            # Intermediate level
            easy_count = 2
            medium_count = 6
            hard_count = 2
        else:
            # Advanced level
            easy_count = 0
            medium_count = 1
            hard_count = 9
        
        # Select questions
        selected = []
        
        # Select easy questions
        if easy_count > 0 and easy_questions:
            selected.extend(random.sample(
                easy_questions,
                min(easy_count, len(easy_questions))
            ))
        
        # Select medium questions
        if medium_count > 0 and medium_questions:
            selected.extend(random.sample(
                medium_questions,
                min(medium_count, len(medium_questions))
            ))
        
        # Select hard questions
        if hard_count > 0 and hard_questions:
            selected.extend(random.sample(
                hard_questions,
                min(hard_count, len(hard_questions))
            ))
        
        # If we don't have enough questions, fill with any available
        if len(selected) < num_questions and all_questions:
            remaining = [q for q in all_questions if q not in selected]
            if remaining:
                additional = random.sample(
                    remaining,
                    min(num_questions - len(selected), len(remaining))
                )
                selected.extend(additional)
        
        # Shuffle the selected questions
        random.shuffle(selected)
        
        return selected[:num_questions]
    
    def get_expected_time(self, difficulty: DifficultyLevel) -> float:
        """
        Get the expected time (in seconds) for a question based on difficulty.
        These are rough estimates based on SAT timing.
        
        Args:
            difficulty: Question difficulty level
        
        Returns:
            Expected time in seconds
        """
        expected_times = {
            DifficultyLevel.EASY: 60,    # 1 minute
            DifficultyLevel.MEDIUM: 90,  # 1.5 minutes
            DifficultyLevel.HARD: 120,   # 2 minutes
        }
        return expected_times.get(difficulty, 90)


# Singleton instance
question_bank = QuestionBankService()

