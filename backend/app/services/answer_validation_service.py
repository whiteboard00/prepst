from typing import List, Optional


class AnswerValidationService:
    """
    Service for validating user answers against correct answers.
    Shared between practice sessions and mock exams.
    """

    @staticmethod
    def normalize_answer(answer_list: Optional[List[str]]) -> List[str]:
        """
        Normalize answers for comparison by stripping whitespace and lowercasing.

        Args:
            answer_list: List of answer strings

        Returns:
            Normalized list of answers
        """
        if not answer_list:
            return []
        return [str(a).strip().lower() for a in answer_list]

    @staticmethod
    def validate_answer(
        user_answer: List[str],
        correct_answer: List[str],
        acceptable_answers: Optional[List[str]] = None
    ) -> bool:
        """
        Check if user's answer is correct.

        Args:
            user_answer: User's submitted answer
            correct_answer: The correct answer
            acceptable_answers: Optional list of alternative acceptable answers

        Returns:
            True if answer is correct, False otherwise
        """
        normalized_user = AnswerValidationService.normalize_answer(user_answer)
        normalized_correct = AnswerValidationService.normalize_answer(correct_answer)
        normalized_acceptable = (
            AnswerValidationService.normalize_answer(acceptable_answers)
            if acceptable_answers
            else []
        )

        # Check exact match with correct answer
        if normalized_user == normalized_correct:
            return True

        # Check if answer is in acceptable answers
        if normalized_acceptable and len(normalized_user) > 0:
            return normalized_user[0] in normalized_acceptable

        return False
