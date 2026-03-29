"use client";

import { useEffect, useState, useMemo, useRef, useLayoutEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageLoader } from "@/components/ui/page-loader";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorDisplay } from "@/components/ui/error-display";
import { PracticeHeader } from "@/components/practice/PracticeHeader";
import { PracticeFooter } from "@/components/practice/PracticeFooter";
import { QuestionPanel } from "@/components/practice/QuestionPanel";
import { AnswerPanel } from "@/components/practice/AnswerPanel";
import { QuestionListSidebar } from "@/components/practice/QuestionListSidebar";
import { SATToolsToolbar } from "@/components/practice/SATToolsToolbar";
import { usePracticeSession } from "@/hooks/usePracticeSession";
import { useTimer } from "@/hooks/useTimer";
import { useQuestionNavigation } from "@/hooks/useQuestionNavigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import confetti from "canvas-confetti";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lightbulb } from "lucide-react";
import { AIExplanationPanel } from "@/components/practice/AIExplanationPanel";
import { cn } from "@/lib/utils";
import { resolvePracticeReturnPath } from "@/lib/practice-navigation";
import "./practice-session.css";

function PracticeSessionContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Safe access to sessionId, handling potential JSON stringification from previous bugs
  const rawSessionId = params.sessionId as string;
  const sessionId = useMemo(() => {
    if (!rawSessionId) return "";
    // Check if it looks like a JSON object string (starts with { and contains "id")
    if (
      rawSessionId.startsWith("%7B") ||
      (rawSessionId.startsWith("{") && rawSessionId.includes("id"))
    ) {
      try {
        const decoded = decodeURIComponent(rawSessionId);
        const parsed = JSON.parse(decoded);
        return parsed.id || rawSessionId;
      } catch (e) {
        return rawSessionId;
      }
    }
    return rawSessionId;
  }, [rawSessionId]);

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
    handleAddSimilarQuestion,
    clearAiFeedback,
    resetQuestionTimer,
    getTimeSpent,
    updateQuestionFlag,
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

  // Check if user is admin
  const isAdmin =
    user?.user_metadata?.role === "admin" ||
    user?.app_metadata?.role === "admin";

  // Local UI state
  const [showQuestionList, setShowQuestionList] = useState(false);
  const [confidenceScore, setConfidenceScore] = useState<number>(3); // Default confidence
  const [showExplanation, setShowExplanation] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPanelTab, setAiPanelTab] = useState<"ask" | "explanation">("ask");
  const [isAIPanelPinned, setIsAIPanelPinned] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Container ref for calculating middle position
  const containerRef = useRef<HTMLDivElement>(null);

  // Draggable divider state - initialize to middle of viewport
  const [dividerPosition, setDividerPosition] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth / 2;
    }
    return 480;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartPosition, setDragStartPosition] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth / 2;
    }
    return 480;
  });

  // Adjust divider position when panel is pinned/unpinned
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isAIPanelPinned && showAIPanel) {
      // When pinned, move divider to center of remaining space (viewport - 420px panel)
      const availableWidth = window.innerWidth - 420;
      setDividerPosition(availableWidth / 2);
    } else {
      // When unpinned, reset to viewport center
      setDividerPosition(window.innerWidth / 2);
    }
  }, [isAIPanelPinned, showAIPanel]);

  // Track which session questions are saved
  const [savedSessionQuestions, setSavedSessionQuestions] = useState<
    Map<string, boolean>
  >(new Map());
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);

  // Calculate gamification stats
  const { streak, score } = useMemo(() => {
    let currentStreak = 0;
    let totalScore = 0;

    // Sort questions by display order
    const sortedQuestions = [...questions].sort(
      (a, b) => a.display_order - b.display_order
    );

    sortedQuestions.forEach((q) => {
      const answerState = answers[q.question.id];
      if (answerState?.status === "answered") {
        if (answerState.isCorrect) {
          currentStreak++;
          // Base score 100, streak bonus (10 points per streak > 1)
          totalScore +=
            100 + (currentStreak > 1 ? (currentStreak - 1) * 10 : 0);
        } else {
          currentStreak = 0;
        }
      }
    });

    return { streak: currentStreak, score: totalScore };
  }, [questions, answers]);

  // Load session data when component mounts
  useEffect(() => {
    if (sessionId) {
      loadSession().then((firstUnansweredIndex) => {
        if (firstUnansweredIndex >= 0) {
          setCurrentIndex(firstUnansweredIndex);
        }
      });
    }
  }, [sessionId, loadSession, setCurrentIndex]);

  // Initialize saved state when questions load
  useEffect(() => {
    if (questions && questions.length > 0) {
      const savedMap = new Map<string, boolean>();
      questions.forEach((q) => {
        savedMap.set(q.session_question_id, q.is_saved || false);
      });
      setSavedSessionQuestions(savedMap);
    }
  }, [questions]);

  // Auto-start stopwatch when a new question loads
  useEffect(() => {
    if (currentQuestion && !isLoading) {
      // Reset and start stopwatch for the new question
      timer.handleStartStopwatch();
    }
  }, [currentQuestion?.session_question_id, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate middle position for divider on mount
  useEffect(() => {
    const calculateMiddlePosition = () => {
      if (containerRef.current) {
        const containerWidth =
          containerRef.current.offsetWidth || containerRef.current.clientWidth;
        if (containerWidth > 0) {
          const middlePosition = containerWidth / 2;
          setDividerPosition(middlePosition);
          setDragStartPosition(middlePosition);
        }
      }
    };

    // Wait for next tick to ensure container is rendered
    const timeoutId = setTimeout(() => {
      calculateMiddlePosition();
    }, 100);

    // Also recalculate on window resize
    window.addEventListener("resize", calculateMiddlePosition);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", calculateMiddlePosition);
    };
  }, []);

  // Handler functions (defined before useEffect that uses them)
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
      if (isCorrect) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }
  };

  const handleNext = () => {
    clearAiFeedback();
    // Reset and start stopwatch for the next question
    timer.handleStartStopwatch();
    const isLastQuestion = navHandleNext();
    if (isLastQuestion) {
      router.push(`/practice/${sessionId}/summary`);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isInputFocused =
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA";

      // If typing in an input, ONLY handle Enter key (for submission), ignore everything else
      if (isInputFocused && key !== "enter") {
        return;
      }

      // Prevent default behavior for keys we handle (unless typing)
      const isHandledKey = [
        "1",
        "2",
        "3",
        "4",
        "a",
        "b",
        "c",
        "d",
        "Enter",
      ].includes(event.key);
      if (isHandledKey && !isInputFocused) {
        event.preventDefault();
      }

      if (!currentQuestion || isSubmitting) return;

      const isMultipleChoice = currentQuestion.question.question_type === "mc";

      // --- Handle Answer Selection (1, 2, 3, 4, A, B, C, D) ---
      // Only if NOT typing in an input box
      if (!isInputFocused && isMultipleChoice && !showFeedback) {
        const answerOptions = currentQuestion.question.answer_options;
        const options = Array.isArray(answerOptions)
          ? answerOptions
          : answerOptions
            ? Object.entries(answerOptions)
            : [];

        let selectedOptionId: string | undefined;

        // Map numerical keys to options
        if (key >= "1" && key <= "4") {
          // Assuming max 4 options for now
          const index = parseInt(key) - 1;
          if (index < options.length) {
            selectedOptionId = String(
              (options[index] as any).id || (options[index] as any)[0]
            );
          }
        } else if (key >= "a" && key <= "d") {
          // Map alphabetical keys to options
          const index = key.charCodeAt(0) - "a".charCodeAt(0);
          if (index < options.length) {
            selectedOptionId = String(
              (options[index] as any).id || (options[index] as any)[0]
            );
          }
        }

        if (selectedOptionId) {
          handleAnswerChange(selectedOptionId);
        }
      }

      // --- Handle Enter Key for Submit/Next ---
      if (key === "enter") {
        // For Enter, we generally want to prevent default (form submission) and handle it manually
        event.preventDefault();

        if (!showFeedback) {
          // Currently answering
          if (
            currentAnswer?.userAnswer &&
            currentAnswer.userAnswer.length > 0 &&
            !isSubmitting
          ) {
            handleSubmit();
          }
        } else {
          // Feedback is shown
          handleNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    currentQuestion,
    currentAnswer,
    showFeedback,
    isSubmitting,
    handleAnswerChange,
    handleSubmit,
    handleNext,
  ]);

  const handleConfidenceSelected = (selectedConfidence: number) => {
    // Just update the confidence score, don't submit
    setConfidenceScore(selectedConfidence);
  };

  const handlePrevious = () => {
    clearAiFeedback();
    navHandlePrevious();
  };

  const handleExit = () => {
    const returnTo = resolvePracticeReturnPath(
      searchParams.get("returnTo"),
      "/dashboard/study-plan"
    );
    router.push(returnTo);
  };

  const handleQuestionNavigation = (questionIndex: number) => {
    clearAiFeedback();
    resetQuestionTimer();
    navigateToQuestion(questionIndex);
    setShowQuestionList(false);
  };

  const handleGetAiFeedback = () => {
    if (!currentQuestion) return;
    // Open AI panel with Ask Prepy tab
    setAiPanelTab("ask");
    setShowAIPanel(true);
  };

  const handleShowExplanation = () => {
    if (!currentQuestion) return;
    // Open AI panel with Explanation tab
    setAiPanelTab("explanation");
    setShowAIPanel(true);
  };

  const handleGetSimilarQuestion = async () => {
    if (!currentQuestion) return;

    try {
      // Add similar question to the end of the list (don't navigate to it)
      await handleAddSimilarQuestion(
        currentQuestion.question.id,
        currentQuestion.topic.id
      );

      // Just move to the next question like skip button
      handleNext();

      // Let the user know the similar question was queued
      toast.success("Queued similar question");
    } catch (error) {
      console.error("Failed to add similar question:", error);
    }
  };

  const handleSaveQuestion = async () => {
    if (!currentQuestion) return;

    const sessionQuestionId = currentQuestion.session_question_id;

    // Prevent double-clicking
    if (savingQuestionId === sessionQuestionId) return;

    setSavingQuestionId(sessionQuestionId);

    try {
      const result = await api.toggleSaveQuestion(sessionQuestionId);

      // Update local state
      setSavedSessionQuestions((prev) => {
        const newMap = new Map(prev);
        newMap.set(sessionQuestionId, result.is_saved);
        return newMap;
      });

      toast.success(
        result.is_saved
          ? "Question saved for review"
          : "Question removed from saved"
      );
    } catch (error) {
      console.error("Failed to toggle save status:", error);
      toast.error("Failed to save question. Please try again.");
    } finally {
      setSavingQuestionId(null);
    }
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
    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <div className="relative z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between pl-[250px] pr-[250px] h-16">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>
        <div className="flex-1 flex overflow-hidden">
          {/* Question Panel - Flexible width */}
          <div className="flex-1 flex flex-col min-w-0 relative">
            <div className="flex-1 overflow-y-auto py-8 pl-[250px] pr-0 space-y-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-8 w-3/4" />
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </div>
          </div>

          {/* Draggable Divider */}
          <div className="group relative w-1 bg-border hover:bg-primary cursor-col-resize transition-colors ml-5">
            {/* Grip Handle Indicators */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1.5">
              <div className="w-0.5 h-1.5 bg-muted-foreground/40 rounded-full" />
              <div className="w-0.5 h-1.5 bg-muted-foreground/40 rounded-full" />
              <div className="w-0.5 h-1.5 bg-muted-foreground/40 rounded-full" />
            </div>
          </div>

          {/* Right Panel - Answer Choices & Feedback - Dynamic width */}
          <div
            className="border-l border-border bg-card/50 backdrop-blur-sm flex flex-col"
            style={{ width: `480px` }}
          >
            <div className="pt-8 pb-8 pl-8 pr-[250px] flex-1 overflow-y-auto space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-64" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer with Navigation */}
        <div className="relative z-50 bg-background/80 backdrop-blur-xl border-t border-border/40 supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between pl-[250px] pr-[250px] h-16">
            <Skeleton className="h-10 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </div>
    );
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
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Main content wrapper that adjusts for pinned panel */}
      <div className={cn("flex-1 flex flex-col overflow-hidden transition-all duration-300", isAIPanelPinned && showAIPanel ? "mr-[420px]" : "")}>
        {/* Header with Progress */}
        <PracticeHeader
          currentIndex={currentIndex}
          totalQuestions={questions.length}
          timerMode={timer.timerMode}
          time={timer.time}
          isRunning={timer.isRunning}
          formatTime={timer.formatTime}
          onToggleQuestionList={() => setShowQuestionList(!showQuestionList)}
          streak={streak}
          score={score}
          // Timer Props
          showTimerModal={timer.showTimerModal}
          onToggleTimerModal={timer.setShowTimerModal}
          showTimerSetup={timer.showTimerSetup}
          setShowTimerSetup={timer.setShowTimerSetup}
          customHours={timer.customHours}
          setCustomHours={timer.setCustomHours}
          customMinutes={timer.customMinutes}
          setCustomMinutes={timer.setCustomMinutes}
          onStartStopwatch={timer.handleStartStopwatch}
          onStartTimer={timer.handleStartTimer}
          onPauseResume={timer.handlePauseResume}
          onReset={timer.handleReset}
          onCloseTimer={timer.handleCloseTimer}
          onExit={handleExit}
          isPinned={isAIPanelPinned && showAIPanel}
        />

        <div
          ref={containerRef}
          className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden"
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
          <div className="flex-1 flex flex-col min-w-0 relative lg:h-full shrink-0 lg:shrink">
            {/* SAT Tools Toolbar - positioned at top-right of question area */}
            <div className="absolute top-4 right-4 z-30">
              <SATToolsToolbar />
            </div>
            <QuestionPanel 
              key={currentQuestion.session_question_id}
              question={currentQuestion} 
              isPinned={isAIPanelPinned && showAIPanel} 
            />
          </div>

          {/* Draggable Divider */}
          <div
            className={`hidden lg:block group relative w-1 bg-border hover:bg-primary cursor-col-resize transition-colors ml-5 ${isDragging ? "bg-primary" : ""
              }`}
            onMouseDown={handleMouseDown}
            style={{
              userSelect: "none",
              cursor: isDragging ? "col-resize" : "col-resize",
            }}
          >
            {/* Grip Handle Indicators */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1.5">
              <div className="w-0.5 h-1.5 bg-muted-foreground/40 rounded-full" />
              <div className="w-0.5 h-1.5 bg-muted-foreground/40 rounded-full" />
              <div className="w-0.5 h-1.5 bg-muted-foreground/40 rounded-full" />
            </div>
          </div>

          {/* Right Panel - Answer Choices & Feedback - Dynamic width */}
          <div
            className="border-t lg:border-t-0 lg:border-l border-border bg-card/50 backdrop-blur-sm flex flex-col shrink-0 lg:shrink"
            style={{ width: isMobile ? '100%' : `${dividerPosition}px` }}
          >
            <AnswerPanel
              question={currentQuestion}
              answer={currentAnswer}
              showFeedback={showFeedback}
              aiFeedback={aiFeedback}
              loadingFeedback={loadingFeedback}
              onAnswerChange={handleAnswerChange}
              onGetFeedback={handleGetAiFeedback}
              onGetSimilarQuestion={handleGetSimilarQuestion}
              onSaveQuestion={handleSaveQuestion}
              isQuestionSaved={
                savedSessionQuestions.get(currentQuestion.session_question_id) ||
                false
              }
              onConfidenceSelect={handleConfidenceSelected}
              defaultConfidence={confidenceScore}
              isPinned={isAIPanelPinned && showAIPanel}
            />
          </div>
        </div>

        {/* Footer with Navigation */}
        <PracticeFooter
          showFeedback={showFeedback}
          hasAnswer={!!currentAnswer}
          isSubmitting={isSubmitting}
          isFirstQuestion={currentIndex === 0}
          isLastQuestion={currentIndex === questions.length - 1}
          currentIndex={currentIndex}
          totalQuestions={questions.length}
          questions={questions}
          answers={answers}
          onSubmit={handleSubmit}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onNavigate={handleQuestionNavigation}
          onGetFeedback={handleGetAiFeedback}
          loadingFeedback={loadingFeedback}
          onShowExplanation={handleShowExplanation}
          hasRationale={!!currentQuestion?.question.rationale}
          isPinned={isAIPanelPinned && showAIPanel}
          questionId={currentQuestion?.question.id}
          isAdmin={isAdmin}
          isFlagged={currentQuestion?.question.is_flagged || false}
          onQuestionFlagUpdate={updateQuestionFlag}
        />
      </div>

      {/* AI Explanation Panel */}
      <AIExplanationPanel
        key={currentQuestion?.question.id || 'no-question'}
        isOpen={showAIPanel}
        onClose={() => setShowAIPanel(false)}
        isPinned={isAIPanelPinned}
        onPinChange={(pinned) => setIsAIPanelPinned(pinned)}
        initialTab={aiPanelTab}
        questionId={currentQuestion?.question.id}
        questionContext={{
          stem: currentQuestion?.question.stem,
          topic: currentQuestion?.topic.name,
          rationale: currentQuestion?.question.rationale || undefined,
        }}
      />

      {/* Explanation Dialog */}
      <Dialog open={showExplanation} onOpenChange={setShowExplanation}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-purple-600" />
              Explanation
            </DialogTitle>
          </DialogHeader>
          {currentQuestion?.question.rationale ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed mt-4"
              dangerouslySetInnerHTML={{
                __html: currentQuestion.question.rationale,
              }}
            />
          ) : (
            <p className="text-muted-foreground">
              No explanation available for this question.
            </p>
          )}
        </DialogContent>
      </Dialog>
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
