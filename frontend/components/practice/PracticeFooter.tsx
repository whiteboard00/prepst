import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Lightbulb,
  ChevronDown,
  Sparkles,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QuestionNavigatorPopup } from "./QuestionNavigatorPopup";
import type { SessionQuestion, AnswerState } from "@/lib/types";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { useToggleQuestionFlag } from "@/hooks/queries/useAdminQuestions";
import { useState, useEffect } from "react";

interface PracticeFooterProps {
  showFeedback: boolean;
  hasAnswer: boolean;
  isSubmitting: boolean;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  currentIndex: number;
  totalQuestions: number;
  questions?: SessionQuestion[];
  answers?: Record<string, AnswerState>;
  onSubmit: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onNavigate?: (index: number) => void;
  onGetFeedback?: () => void;
  loadingFeedback?: boolean;
  onShowExplanation?: () => void;
  hasRationale?: boolean;
  isPinned?: boolean;
  questionId?: string;
  isAdmin?: boolean;
  isFlagged?: boolean;
  onQuestionFlagUpdate?: (questionId: string, isFlagged: boolean) => void;
}

export function PracticeFooter({
  showFeedback,
  hasAnswer,
  isSubmitting,
  isFirstQuestion,
  isLastQuestion,
  currentIndex,
  totalQuestions,
  questions = [],
  answers = {},
  onSubmit,
  onNext,
  onPrevious,
  onNavigate,
  onGetFeedback,
  loadingFeedback = false,
  onShowExplanation,
  hasRationale = false,
  isPinned = false,
  questionId,
  isAdmin = false,
  isFlagged = false,
  onQuestionFlagUpdate,
}: PracticeFooterProps) {
  const handleNavigate = (index: number) => {
    if (onNavigate) {
      onNavigate(index);
    }
  };

  const toggleFlagMutation = useToggleQuestionFlag();
  const [localIsFlagged, setLocalIsFlagged] = useState(isFlagged);

  // Reset local state when questionId or isFlagged changes
  useEffect(() => {
    setLocalIsFlagged(isFlagged);
  }, [isFlagged, questionId]);

  const handleToggleFlag = async () => {
    if (!questionId) return;
    try {
      const result = await toggleFlagMutation.mutateAsync(questionId);
      // Use the result from the API instead of toggling local state
      setLocalIsFlagged(result.is_flagged);
      // Update the question in the parent's questions array
      if (onQuestionFlagUpdate) {
        onQuestionFlagUpdate(questionId, result.is_flagged);
      }
    } catch (error) {
      console.error("Failed to toggle flag:", error);
    }
  };

  return (
    <div className="relative z-50 bg-background/80 backdrop-blur-xl border-t border-border/40 supports-[backdrop-filter]:bg-background/60">
      <div
        className={cn(
          "flex items-center justify-between h-16",
          isPinned ? "px-8" : "px-4 lg:pl-[250px] lg:pr-[250px]"
        )}
      >
        {/* Left: Question Counter - Clickable */}
        <div className="flex items-center gap-3">
          {questions.length > 0 ? (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg bg-muted border border-border/60 hover:bg-muted/80 transition-colors cursor-pointer">
                  <span className="text-sm font-medium text-foreground tabular-nums">
                    {currentIndex + 1}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    of
                  </span>
                  <span className="text-sm font-medium text-foreground tabular-nums">
                    {totalQuestions}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                side="top"
                sideOffset={8}
                className="w-auto min-w-[100px] max-w-[600px] p-0 max-h-[80vh] overflow-hidden"
              >
                <QuestionNavigatorPopup
                  questions={questions}
                  answers={answers}
                  currentIndex={currentIndex}
                  onNavigate={handleNavigate}
                />
              </PopoverContent>
            </Popover>
          ) : (
            <div className="flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg bg-muted border border-border/60">
              <span className="text-sm font-medium text-foreground tabular-nums">
                {currentIndex + 1}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                of
              </span>
              <span className="text-sm font-medium text-foreground tabular-nums">
                {totalQuestions}
              </span>
            </div>
          )}
        </div>

        {/* Right: AI Explanation / Explanation / Check / Back / Next */}
        <div className="flex items-center gap-3">
          {/* Admin Flag Button */}
          {isAdmin && questionId && (
            <Button
              onClick={handleToggleFlag}
              disabled={toggleFlagMutation.isPending}
              className="h-10 px-4 font-semibold transition-all shadow-sm text-base flex items-center gap-2"
              style={{
                backgroundColor: localIsFlagged
                  ? "rgba(239, 68, 68, 0.2)"
                  : "rgba(239, 68, 68, 0.1)",
                color: "#ef4444",
              }}
            >
              <Flag className="size-4" />
              {localIsFlagged ? "Flagged" : "Flag"}
            </Button>
          )}

          {/* AI Explanation Button */}
          {onGetFeedback && (
            <Button
              onClick={onGetFeedback}
              disabled={loadingFeedback}
              className="h-10 px-3 sm:px-6 font-semibold transition-all shadow-sm text-base flex items-center gap-2 !text-white"
              style={{
                backgroundColor: loadingFeedback
                  ? "rgba(134, 111, 254, 0.5)"
                  : "#866ffe",
                color: "#ffffff",
              }}
            >
              {loadingFeedback ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  <span className="hidden sm:inline">AI Explanation</span>
                </>
              )}
            </Button>
          )}

          {/* Explanation Button */}
          {onShowExplanation && (
            <Button
              onClick={onShowExplanation}
              disabled={!hasRationale}
              className="h-10 px-3 sm:px-6 font-semibold transition-all shadow-sm text-base flex items-center gap-2"
              style={{
                backgroundColor: "rgba(134, 111, 254, 0.3)",
                color: "#866ffe",
              }}
            >
              <Lightbulb className="size-4" />
              <span className="hidden sm:inline">Explanation</span>
            </Button>
          )}

          {/* Check Button */}
          <Button
            onClick={onSubmit}
            disabled={!hasAnswer || isSubmitting || showFeedback}
            className={cn(
              "h-10 px-3 sm:px-6 font-semibold transition-all shadow-sm hover:opacity-90 disabled:opacity-50 text-base flex items-center gap-2",
              !hasAnswer && "opacity-60"
            )}
            style={{
              backgroundColor: "rgba(254, 165, 0, 0.25)",
              color: "#fea500",
            }}
          >
            <Check className="size-4" />
            <span className="hidden sm:inline">Check</span>
          </Button>

          {/* Back Button */}
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={isFirstQuestion}
            className={cn(
              "h-10 px-3 sm:px-4 border-border/60 bg-background/50 hover:bg-accent transition-all text-base",
              isFirstQuestion && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className="hidden sm:inline">Back</span>
            <ChevronLeft className="size-4 sm:hidden" />
          </Button>

          {/* Next Button */}
          <Button
            variant="outline"
            onClick={onNext}
            className="h-10 px-3 sm:px-4 border-border/60 bg-background/50 hover:bg-muted/80 text-foreground transition-all text-base"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-4 sm:hidden" />
          </Button>
        </div>
      </div>
    </div>
  );
}
