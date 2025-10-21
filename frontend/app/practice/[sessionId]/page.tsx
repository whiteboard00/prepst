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
import { usePracticeSession } from "@/hooks/usePracticeSession";
import { useTimer } from "@/hooks/useTimer";
import { useQuestionNavigation } from "@/hooks/useQuestionNavigation";
import "./practice-session.css";

function PracticeSessionContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  // Custom hooks
  const {
    questions,
    answers,
    isLoading,
    isSubmitting,
    error,
    aiFeedback,
    loadingFeedback,
    loadSession,
    handleAnswerChange: sessionHandleAnswerChange,
    handleSubmit: sessionHandleSubmit,
    handleGetFeedback,
    clearAiFeedback,
    resetQuestionTimer,
    getTimeSpent,
  } = usePracticeSession(sessionId);

  const timer = useTimer(sessionId);

  const {
    currentIndex,
    currentQuestion,
    currentAnswer,
    showFeedback,
    setCurrentIndex,
    setShowFeedback,
    navigateToQuestion,
    handleNext: navHandleNext,
    handlePrevious: navHandlePrevious,
  } = useQuestionNavigation(questions, answers);

  // Local UI state
  const [showQuestionList, setShowQuestionList] = useState(false);
  const [confidenceScore, setConfidenceScore] = useState<number>(3); // Default confidence

  // Draggable divider state
  const [dividerPosition, setDividerPosition] = useState(480); // Initial width for right panel
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartPosition, setDragStartPosition] = useState(480);

  // Load session on mount
  useEffect(() => {
    loadSession().then((firstUnansweredIndex) => {
      if (firstUnansweredIndex !== undefined) {
        setCurrentIndex(firstUnansweredIndex);
      }
    });
  }, [loadSession, setCurrentIndex]);

  // Clear AI feedback, mastery update, and reset timer when navigating
  const handleNavigation = (navFn: () => void | boolean) => {
    clearAiFeedback();
    resetQuestionTimer();
    setConfidenceScore(3); // Reset to default confidence
    return navFn();
  };

  const handleAnswerChange = (value: string) => {
    if (!currentQuestion || showFeedback) return;
    sessionHandleAnswerChange(currentQuestion.question.id, value);
  };

  const handleSubmit = async () => {
    if (!currentAnswer || !currentQuestion) return;
    // Submit with current confidence score (default or user-selected)
    const timeSpent = getTimeSpent();
    const isCorrect = await sessionHandleSubmit(
      currentQuestion.question.id,
      currentAnswer.userAnswer,
      confidenceScore, // Use current confidence score
      timeSpent
    );

    if (isCorrect !== undefined) {
      setShowFeedback(true);
    }
  };

  const handleConfidenceSelected = (selectedConfidence: number) => {
    // Just update the confidence score, don't submit
    setConfidenceScore(selectedConfidence);
  };

  const handleNext = () => {
    const isLastQuestion = handleNavigation(() => navHandleNext());
    if (isLastQuestion) {
      router.push(`/practice/${sessionId}/summary`);
    }
  };

  const handlePrevious = () => {
    handleNavigation(() => navHandlePrevious());
  };

  const handleQuestionNavigation = (questionIndex: number) => {
    clearAiFeedback();
    resetQuestionTimer();
    navigateToQuestion(questionIndex);
    setShowQuestionList(false);
  };

  const handleGetAiFeedback = () => {
    if (!currentQuestion) return;
    handleGetFeedback(currentQuestion.question.id);
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

  // Loading state
  if (isLoading) {
    return <PageLoader message="Loading your practice..." />;
  }

  // Error state
  if (error || !currentQuestion) {
    return (
      <ErrorDisplay
        message={error || "Question not found"}
        onRetry={() => router.push("/dashboard/study-plan")}
        retryLabel="Back to Study Plan"
      />
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 flex flex-col overflow-hidden">
      {/* Header with Progress */}
      <PracticeHeader
        currentIndex={currentIndex}
        totalQuestions={questions.length}
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
        onExit={() => router.push("/dashboard/study-plan")}
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
            questions={questions}
            answers={answers}
            currentIndex={currentIndex}
            onNavigate={handleQuestionNavigation}
            onClose={() => setShowQuestionList(false)}
          />
        )}

        {/* Question Panel - Flexible width */}
        <div className="flex-1 flex flex-col min-w-0">
          <QuestionPanel question={currentQuestion} />
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
            question={currentQuestion}
            answer={currentAnswer}
            showFeedback={showFeedback}
            aiFeedback={aiFeedback}
            loadingFeedback={loadingFeedback}
            onAnswerChange={handleAnswerChange}
            onGetFeedback={handleGetAiFeedback}
            onConfidenceSelect={handleConfidenceSelected}
            defaultConfidence={confidenceScore}
          />

          {/* Navigation Controls */}
          <NavigationControls
            showFeedback={showFeedback}
            hasAnswer={!!currentAnswer}
            isSubmitting={isSubmitting}
            isFirstQuestion={currentIndex === 0}
            isLastQuestion={currentIndex === questions.length - 1}
            onSubmit={handleSubmit}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        </div>
      </div>
    </div>
  );
}

export default function PracticeSessionPage() {
  return (
    <ProtectedRoute>
      <PracticeSessionContent />
    </ProtectedRoute>
  );
}
