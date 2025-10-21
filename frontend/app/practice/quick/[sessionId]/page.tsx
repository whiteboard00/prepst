"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageLoader } from "@/components/ui/page-loader";
import { ErrorDisplay } from "@/components/ui/error-display";
import { PracticeHeader } from "@/components/practice/PracticeHeader";
import { QuestionPanel } from "@/components/practice/QuestionPanel";
import { AnswerPanel } from "@/components/practice/AnswerPanel";
import { NavigationControls } from "@/components/practice/NavigationControls";
import { QuestionListSidebar } from "@/components/practice/QuestionListSidebar";
import { TimerModal } from "@/components/practice/TimerModal";
import { useTimer } from "@/hooks/useTimer";
import { SessionQuestion, AnswerState } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface PracticeQuestion {
  id: string;
  stem: string;
  question_type: string;
  answer_options: any;
  correct_answer: any;
  difficulty: string;
  topics: {
    name: string;
  };
}

interface PracticeSession {
  id: string;
  questions: PracticeQuestion[];
  currentIndex: number;
  timeLimit: number;
  createdAt: string;
}

function QuickPracticeContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  // Load session from localStorage
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [showQuestionList, setShowQuestionList] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [confidenceScore, setConfidenceScore] = useState<number>(3);
  const [aiFeedback, setAiFeedback] = useState<any>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  // Draggable divider state
  const [dividerPosition, setDividerPosition] = useState(480); // Initial width for right panel
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartPosition, setDragStartPosition] = useState(480);

  useEffect(() => {
    // Load session from localStorage
    const sessionData = localStorage.getItem(`practice-session-${sessionId}`);
    if (sessionData) {
      try {
        const parsedSession = JSON.parse(sessionData);
        setSession(parsedSession);
        setCurrentIndex(parsedSession.currentIndex || 0);

        // Initialize answers array
        const initialAnswers = parsedSession.questions.map(
          (q: PracticeQuestion) => ({
            questionId: q.id,
            userAnswer: [],
            status: "not_started",
          })
        );
        setAnswers(initialAnswers);
      } catch (err) {
        setError("Failed to load practice session");
      }
    } else {
      setError("Practice session not found");
    }
    setIsLoading(false);
  }, [sessionId]);

  // Timer hook with fixed time limit
  const timer = useTimer(sessionId);

  const currentQuestion = session?.questions[currentIndex];
  const currentAnswer = answers[currentIndex];

  // Format questions for existing components
  const formattedQuestions: SessionQuestion[] =
    session?.questions.map((q: PracticeQuestion, index: number) => ({
      session_question_id: q.id,
      question: {
        id: q.id,
        stem: q.stem,
        question_type: q.question_type,
        answer_options: q.answer_options,
        correct_answer: q.correct_answer,
        difficulty: q.difficulty, // Use actual difficulty from database
        module: "math", // Default module
        topic_id: q.id, // Use question id as topic id for now
        external_id: q.id,
        source_uid: q.id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      topic: {
        id: q.id,
        name: q.topics.name,
        category_id: q.id,
        weight_in_category: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      status: answers[index]?.status || "not_started",
      display_order: index + 1,
    })) || [];

  const answersRecord: Record<string, AnswerState> = {};
  answers.forEach((answer, index) => {
    if (session?.questions[index]) {
      answersRecord[session.questions[index].id] = {
        userAnswer: answer.userAnswer,
        status: answer.status,
        confidenceScore: answer.confidenceScore,
        timeSpentSeconds: answer.timeSpentSeconds,
      };
    }
  });

  const handleAnswerChange = (value: string) => {
    if (showFeedback || !currentQuestion) return;

    setAnswers((prev) =>
      prev.map((answer, index) => {
        if (index === currentIndex) {
          const updatedAnswer = {
            ...answer,
            userAnswer: [value], // Wrap in array for consistency
            status: "answered",
          };

          // Save answer to localStorage for results calculation
          localStorage.setItem(
            `practice-session-${sessionId}-answer-${currentIndex}`,
            JSON.stringify([value])
          );

          return updatedAnswer;
        }
        return answer;
      })
    );
  };

  const handleSubmit = async () => {
    if (!currentAnswer || !currentQuestion) return;

    // Check if answer is correct
    const isCorrect =
      JSON.stringify(currentAnswer.userAnswer.sort()) ===
      JSON.stringify(currentQuestion.correct_answer.sort());

    // Mark as submitted and show feedback
    setShowFeedback(true);

    // Update answer status with correctness
    setAnswers((prev) =>
      prev.map((answer, index) => {
        if (index === currentIndex) {
          return {
            ...answer,
            status: "answered",
            isCorrect: isCorrect,
          };
        }
        return answer;
      })
    );
  };

  const handleNext = () => {
    setShowFeedback(false);
    setConfidenceScore(3);

    if (currentIndex < (session?.questions.length || 0) - 1) {
      setCurrentIndex(currentIndex + 1);

      // Update session in localStorage
      if (session) {
        const updatedSession = { ...session, currentIndex: currentIndex + 1 };
        localStorage.setItem(
          `practice-session-${sessionId}`,
          JSON.stringify(updatedSession)
        );
      }
    } else {
      // Practice session complete
      router.push(`/practice/quick/${sessionId}/complete`);
    }
  };

  const handlePrevious = () => {
    setShowFeedback(false);
    setConfidenceScore(3);

    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);

      // Update session in localStorage
      if (session) {
        const updatedSession = { ...session, currentIndex: currentIndex - 1 };
        localStorage.setItem(
          `practice-session-${sessionId}`,
          JSON.stringify(updatedSession)
        );
      }
    }
  };

  const handleQuestionNavigation = (questionIndex: number) => {
    setShowFeedback(false);
    setConfidenceScore(3);
    setCurrentIndex(questionIndex);
    setShowQuestionList(false);

    // Update session in localStorage
    if (session) {
      const updatedSession = { ...session, currentIndex: questionIndex };
      localStorage.setItem(
        `practice-session-${sessionId}`,
        JSON.stringify(updatedSession)
      );
    }
  };

  const handleExit = () => {
    // Clean up localStorage
    localStorage.removeItem(`practice-session-${sessionId}`);
    router.push("/dashboard");
  };

  // AI Feedback functionality
  const handleGetFeedback = async () => {
    if (!currentQuestion || !session) return;

    setLoadingFeedback(true);
    try {
      // Get user's performance on this topic for context
      const { data: topicPerformance } = await supabase
        .from("questions")
        .select(
          `
          id,
          topic_id,
          correct_answer,
          topics(name)
        `
        )
        .eq("topic_id", currentQuestion.id)
        .limit(100);

      let topicCorrect = 0;
      let topicTotal = 0;

      if (topicPerformance) {
        // This is a simplified calculation - in a real implementation,
        // you'd want to track user's actual performance on this topic
        topicCorrect = Math.floor(Math.random() * 5); // Mock data for now
        topicTotal = Math.floor(Math.random() * 10) + 5; // Mock data for now
      }

      const performanceContext = {
        topic_correct: topicCorrect,
        topic_total: topicTotal,
      };

      // Determine if answer is correct
      const userAnswer = currentAnswer?.userAnswer || [];
      const correctAnswer = currentQuestion.correct_answer || [];
      const isCorrect =
        JSON.stringify(userAnswer.sort()) ===
        JSON.stringify(correctAnswer.sort());

      // Call AI feedback API
      const response = await fetch("/api/ai-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_stem: currentQuestion.stem,
          question_type: currentQuestion.question_type,
          correct_answer: correctAnswer,
          user_answer: userAnswer,
          is_correct: isCorrect,
          topic_name: currentQuestion.topics.name,
          user_performance_context: performanceContext,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI feedback");
      }

      const feedbackData = await response.json();
      setAiFeedback(feedbackData.feedback);
    } catch (error) {
      console.error("Error getting AI feedback:", error);
      // Show a simple error message or fallback feedback
      setAiFeedback({
        explanation:
          "Unable to generate AI feedback at this time. Please try again later.",
        hints: ["Review the question carefully"],
        learning_points: ["Practice similar questions to improve"],
        key_concepts: ["Focus on understanding the core concept"],
      });
    } finally {
      setLoadingFeedback(false);
    }
  };

  const clearAiFeedback = () => {
    // No-op for quick practice
  };

  const resetQuestionTimer = () => {
    // No-op for quick practice
  };

  const getTimeSpent = () => {
    return 0; // No-op for quick practice
  };

  // Draggable divider handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartPosition(dividerPosition);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    // Calculate how much the mouse has moved since drag started
    const deltaX = e.clientX - dragStartX;

    // Invert delta to fix direction
    const newPosition = dragStartPosition - deltaX;

    // Set minimum and maximum widths (ensure both panels have reasonable space)
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const minWidth = 250;
    const maxWidth = rect.width - 250;

    // Clamp the position to reasonable bounds
    const clampedPosition = Math.max(minWidth, Math.min(maxWidth, newPosition));

    setDividerPosition(clampedPosition);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (isLoading) {
    return <PageLoader message="Loading your practice..." />;
  }

  if (error || !currentQuestion || !session) {
    return (
      <ErrorDisplay
        message={error || "Question not found"}
        onRetry={() => router.push("/dashboard")}
        retryLabel="Back to Dashboard"
      />
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 flex flex-col overflow-hidden">
      {/* Header with Progress */}
      <PracticeHeader
        currentIndex={currentIndex}
        totalQuestions={session.questions.length}
        timerMode={timer.timerMode}
        time={timer.time}
        isRunning={timer.isRunning}
        formatTime={timer.formatTime}
        onToggleQuestionList={() => setShowQuestionList(!showQuestionList)}
        onToggleTimerModal={() =>
          timer.setShowTimerModal(!timer.showTimerModal)
        }
        onPauseResume={timer.handlePauseResume}
        onReset={timer.handleReset}
        onCloseTimer={timer.handleCloseTimer}
        onExit={handleExit}
      />

      {/* Timer/Stopwatch Modal */}
      <TimerModal
        showTimerModal={timer.showTimerModal}
        showTimerSetup={timer.showTimerSetup}
        customHours={timer.customHours}
        customMinutes={timer.customMinutes}
        setCustomHours={timer.setCustomHours}
        setCustomMinutes={timer.setCustomMinutes}
        setShowTimerModal={timer.setShowTimerModal}
        setShowTimerSetup={timer.setShowTimerSetup}
        onStartStopwatch={timer.handleStartStopwatch}
        onStartTimer={timer.handleStartTimer}
      />

      <div
        className="flex-1 flex overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Left Sidebar - Question List */}
        {showQuestionList && (
          <QuestionListSidebar
            questions={formattedQuestions}
            answers={answersRecord}
            currentIndex={currentIndex}
            onNavigate={handleQuestionNavigation}
            onClose={() => setShowQuestionList(false)}
          />
        )}

        {/* Question Panel - Flexible width */}
        <div className="flex-1 flex flex-col min-w-0">
          <QuestionPanel question={formattedQuestions[currentIndex]} />
        </div>

        {/* Draggable Divider */}
        <div
          className={`w-1 bg-gray-300 hover:bg-blue-400 cursor-col-resize transition-colors ${
            isDragging ? "bg-blue-500" : ""
          }`}
          onMouseDown={handleMouseDown}
          style={{
            userSelect: "none",
            cursor: isDragging ? "col-resize" : "col-resize",
          }}
        />

        {/* Right Panel - Answer Choices & Feedback - Dynamic width */}
        <div
          className="border-l bg-white/60 backdrop-blur-sm flex flex-col"
          style={{ width: `${dividerPosition}px` }}
        >
          <AnswerPanel
            question={formattedQuestions[currentIndex]}
            answer={currentAnswer}
            showFeedback={showFeedback}
            aiFeedback={aiFeedback}
            loadingFeedback={loadingFeedback}
            onAnswerChange={handleAnswerChange}
            onGetFeedback={handleGetFeedback}
            onConfidenceSelect={setConfidenceScore}
            defaultConfidence={confidenceScore}
          />

          {/* Navigation Controls */}
          <NavigationControls
            showFeedback={showFeedback}
            hasAnswer={!!currentAnswer?.userAnswer?.length}
            isSubmitting={false}
            isFirstQuestion={currentIndex === 0}
            isLastQuestion={currentIndex === session.questions.length - 1}
            onSubmit={handleSubmit}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        </div>
      </div>
    </div>
  );
}

export default function QuickPracticePage() {
  return (
    <ProtectedRoute>
      <QuickPracticeContent />
    </ProtectedRoute>
  );
}
