import { useState, useCallback } from 'react';
import type { SessionQuestion, AnswerState } from '@/lib/types';

export function useQuestionNavigation(
  questions: SessionQuestion[],
  answers: Record<string, AnswerState>
) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.question.id]
    : null;

  const navigateToQuestion = useCallback(
    (questionIndex: number) => {
      if (questionIndex >= 0 && questionIndex < questions.length) {
        const targetQuestion = questions[questionIndex];
        const targetAnswer = answers[targetQuestion.question.id];
        const wasAnswered =
          targetAnswer &&
          targetAnswer.status === 'answered' &&
          targetAnswer.isCorrect !== undefined;

        setCurrentIndex(questionIndex);
        setTimeout(() => {
          setShowFeedback(wasAnswered);
        }, 0);
      }
    },
    [questions, answers]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      navigateToQuestion(currentIndex + 1);
    }
    return currentIndex >= questions.length - 1; // returns true if this was the last question
  }, [currentIndex, questions.length, navigateToQuestion]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      navigateToQuestion(currentIndex - 1);
    }
  }, [currentIndex, navigateToQuestion]);

  return {
    currentIndex,
    currentQuestion,
    currentAnswer,
    showFeedback,
    setCurrentIndex,
    setShowFeedback,
    navigateToQuestion,
    handleNext,
    handlePrevious,
  };
}
