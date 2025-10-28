import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { config } from "@/lib/config";
import type {
  SessionQuestion,
  SessionQuestionsResponse,
  AnswerState,
  SubmitAnswerResponse,
  AIFeedbackContent,
} from "@/lib/types";
import { api } from "@/lib/api";

export function usePracticeSession(sessionId: string) {
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState<AIFeedbackContent | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(
    Date.now()
  );

  const loadSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(
        `${config.apiUrl}/api/practice-sessions/${sessionId}/questions`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load session");
      }

      const data: SessionQuestionsResponse = await response.json();
      const sortedQuestions = data.questions.sort(
        (a: SessionQuestion, b: SessionQuestion) =>
          a.display_order - b.display_order
      );

      setQuestions(sortedQuestions);

      const initialAnswers: Record<string, AnswerState> = {};
      sortedQuestions.forEach((q: SessionQuestion) => {
        if (q.status !== "not_started") {
          const hasUserAnswer = q.user_answer && q.user_answer.length > 0;
          const correctAnswer = q.question.correct_answer;
          const correctAnswerArray = Array.isArray(correctAnswer)
            ? correctAnswer
            : [String(correctAnswer)];

          initialAnswers[q.question.id] = {
            userAnswer: q.user_answer || [],
            status: q.status,
            isCorrect:
              hasUserAnswer && q.status === "answered"
                ? JSON.stringify(q.user_answer?.sort()) ===
                  JSON.stringify(correctAnswerArray.sort())
                : undefined,
          };
        }
      });
      setAnswers(initialAnswers);

      const firstUnanswered = sortedQuestions.findIndex(
        (q: SessionQuestion) => q.status === "not_started"
      );
      return firstUnanswered >= 0 ? firstUnanswered : 0;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
      return 0;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const handleAnswerChange = useCallback(
    (questionId: string, value: string) => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          userAnswer: [value],
          status: "in_progress",
        },
      }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (
      questionId: string,
      userAnswer: string[],
      confidenceScore: number,
      timeSpentSeconds: number
    ) => {
      try {
        setIsSubmitting(true);

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Not authenticated");

        const response = await fetch(
          `${config.apiUrl}/api/practice-sessions/${sessionId}/questions/${questionId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_answer: userAnswer,
              status: "answered",
              confidence_score: confidenceScore,
              time_spent_seconds: timeSpentSeconds,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to submit answer");
        }

        const result: SubmitAnswerResponse = await response.json();

        setAnswers((prev) => ({
          ...prev,
          [questionId]: {
            userAnswer,
            isCorrect: result.is_correct,
            status: "answered",
            confidenceScore,
            timeSpentSeconds,
          },
        }));

        return result.is_correct;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to submit answer"
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [sessionId]
  );

  const handleGetFeedback = useCallback(
    async (questionId: string) => {
      setLoadingFeedback(true);
      try {
        const feedbackResponse = await api.getQuestionFeedback(
          sessionId,
          questionId
        );
        setAiFeedback(feedbackResponse.feedback);
      } catch (error) {
        console.error("Failed to load feedback:", error);
      } finally {
        setLoadingFeedback(false);
      }
    },
    [sessionId]
  );

  const clearAiFeedback = useCallback(() => {
    setAiFeedback(null);
  }, []);

  const resetQuestionTimer = useCallback(() => {
    setQuestionStartTime(Date.now());
  }, []);

  const getTimeSpent = useCallback(() => {
    return Math.floor((Date.now() - questionStartTime) / 1000);
  }, [questionStartTime]);

  const handleAddSimilarQuestion = useCallback(
    async (questionId: string, topicId: string) => {
      try {
        const result = await api.addSimilarQuestion(
          sessionId,
          questionId,
          topicId
        );

        // Create a new SessionQuestion object for the similar question
        const newSessionQuestion: SessionQuestion = {
          session_question_id: result.session_question_id,
          question: {
            id: result.question.id,
            stem: result.question.stem,
            question_type: result.question.question_type,
            answer_options: result.question.answer_options,
            correct_answer: result.question.correct_answer,
            difficulty: result.question.difficulty,
            module: "math", // Default module
            topic_id: result.question.topic_id,
            external_id: result.question.id,
            source_uid: result.question.id,
            is_active: result.question.is_active,
            created_at: result.question.created_at,
            updated_at: result.question.updated_at,
          },
          topic: {
            id: result.topic.id,
            name: result.topic.name,
            category_id: result.topic.category_id,
            weight_in_category: result.topic.weight_in_category,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          status: "not_started",
          display_order: result.display_order,
        };

        // Add the new question to the end of the questions array
        setQuestions((prev) => {
          return [...prev, newSessionQuestion];
        });

        // Return the question and its index (at the end)
        return {
          question: newSessionQuestion,
          index: questions.length, // The new question will be at the end
        };
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to add similar question"
        );
        throw err;
      }
    },
    [sessionId]
  );

  return {
    questions,
    answers,
    isLoading,
    isSubmitting,
    error,
    aiFeedback,
    loadingFeedback,
    loadSession,
    handleAnswerChange,
    handleSubmit,
    handleGetFeedback,
    handleAddSimilarQuestion,
    clearAiFeedback,
    resetQuestionTimer,
    getTimeSpent,
  };
}
