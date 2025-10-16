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

  // Load session on mount
  useEffect(() => {
    loadSession().then((firstUnansweredIndex) => {
      if (firstUnansweredIndex !== undefined) {
        setCurrentIndex(firstUnansweredIndex);
      }
    });
  }, [loadSession, setCurrentIndex]);

  // Clear AI feedback when navigating
  const handleNavigation = (navFn: () => void | boolean) => {
    clearAiFeedback();
    return navFn();
  };

  const handleAnswerChange = (value: string) => {
    if (!currentQuestion || showFeedback) return;
    sessionHandleAnswerChange(currentQuestion.question.id, value);
  };

  const handleSubmit = async () => {
    if (!currentAnswer || !currentQuestion) return;
    const isCorrect = await sessionHandleSubmit(
      currentQuestion.question.id,
      currentAnswer.userAnswer
    );
    if (isCorrect !== undefined) {
      setShowFeedback(true);
    }
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
    navigateToQuestion(questionIndex);
    setShowQuestionList(false);
  };

  const handleGetAiFeedback = () => {
    if (!currentQuestion) return;
    handleGetFeedback(currentQuestion.question.id);
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
        onToggleTimerModal={() => timer.setShowTimerModal(!timer.showTimerModal)}
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

      <div className="flex-1 flex overflow-hidden">
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

        {/* Question Panel */}
        <QuestionPanel question={currentQuestion} />

        {/* Right Panel - Answer Choices & Feedback */}
        <div className="w-[480px] border-l bg-white/60 backdrop-blur-sm flex flex-col">
          <AnswerPanel
            question={currentQuestion}
            answer={currentAnswer}
            showFeedback={showFeedback}
            aiFeedback={aiFeedback}
            loadingFeedback={loadingFeedback}
            onAnswerChange={handleAnswerChange}
            onGetFeedback={handleGetAiFeedback}
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
