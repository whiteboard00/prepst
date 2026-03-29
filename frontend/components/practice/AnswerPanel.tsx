import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X, RefreshCcw, Bookmark, Ban, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { AIFeedbackDisplay } from "./AIFeedbackDisplay";
import { ConfidenceRating } from "./ConfidenceRating";
import { toast } from "sonner";
import type {
  SessionQuestion,
  AnswerState,
  AIFeedbackContent,
} from "@/lib/types";

interface AnswerPanelProps {
  question: SessionQuestion;
  answer: AnswerState | null;
  showFeedback: boolean;
  aiFeedback: AIFeedbackContent | null;
  loadingFeedback: boolean;
  onAnswerChange: (value: string) => void;
  onGetFeedback: () => void;
  onGetSimilarQuestion?: () => void;
  onSaveQuestion?: () => void;
  isQuestionSaved?: boolean;
  onConfidenceSelect?: (confidence: number) => void;
  defaultConfidence?: number;
  compact?: boolean;
  isPinned?: boolean;
}

export function AnswerPanel({
  question,
  answer,
  showFeedback,
  aiFeedback,
  loadingFeedback,
  onAnswerChange,
  onGetFeedback,
  onGetSimilarQuestion,
  onSaveQuestion,
  isQuestionSaved,
  onConfidenceSelect,
  defaultConfidence = 3,
  compact = false,
  isPinned = false,
}: AnswerPanelProps) {
  const [eliminatedOptions, setEliminatedOptions] = useState<Set<string>>(new Set());

  // Reset eliminated options when question changes
  useEffect(() => {
    setEliminatedOptions(new Set());
  }, [question.question.id]);

  const toggleElimination = (optionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newEliminated = new Set(eliminatedOptions);
    if (newEliminated.has(optionId)) {
      newEliminated.delete(optionId);
    } else {
      newEliminated.add(optionId);
    }
    setEliminatedOptions(newEliminated);
  };
  return (
    <div
      className={`w-full bg-background lg:flex-1 lg:overflow-y-auto ${compact ? "p-6" : isPinned ? "py-8 px-8" : "py-8 px-4 lg:pl-8 lg:pr-[250px]"
        }`}
    >
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
        {question.question.question_type === "mc"
          ? "Select an Answer"
          : "Your Answer"}
      </h3>

      {/* Student Produced Response Input */}
      {question.question.question_type === "spr" && (
        <div className="space-y-6">
          <Input
            key={question.question.id}
            id="answer-input"
            type="text"
            placeholder="Enter your answer..."
            value={answer?.userAnswer[0] || ""}
            onChange={(e) => onAnswerChange(e.target.value)}
            disabled={showFeedback}
            className="text-3xl h-20 text-center font-mono tracking-widest bg-card border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl transition-all"
          />

          {/* Show correct answer for wrong SPR answers */}
          {showFeedback &&
            answer &&
            !answer.isCorrect &&
            question.question.correct_answer && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-destructive/20 flex items-center justify-center text-destructive">
                  <X className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Incorrect
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Correct answer:{" "}
                    <span className="font-mono font-bold text-foreground">
                      {Array.isArray(question.question.correct_answer)
                        ? question.question.correct_answer.join(", ")
                        : question.question.correct_answer}
                    </span>
                  </p>
                </div>
              </div>
            )}
        </div>
      )}

      {/* Multiple Choice Options */}
      {question.question.question_type === "mc" &&
        question.question.answer_options && (
          <div className="space-y-3">
            {(() => {
              const options = Array.isArray(question.question.answer_options)
                ? question.question.answer_options
                : Object.entries(question.question.answer_options);

              const labels = ["A", "B", "C", "D", "E", "F"];

              return options.map((option: unknown, index: number) => {
                const label = labels[index];
                const opt = option as Record<string, unknown> & {
                  id?: string;
                  content?: string;
                };
                const optArray = option as unknown[];
                const optionId = String(opt.id || optArray[0]);
                const optionContent =
                  opt.content ||
                  (optArray[1] as Record<string, unknown>)?.content ||
                  optArray[1];

                // Check if this option is selected - match by optionId or by label
                const isSelected =
                  answer?.userAnswer[0] === optionId ||
                  (answer as any)?.optionId === optionId ||
                  (() => {
                    // Also check if answer matches by label (for backwards compatibility)
                    const labels = ["A", "B", "C", "D", "E", "F"];
                    const answerValue = answer?.userAnswer[0];
                    if (
                      answerValue &&
                      labels.includes(String(answerValue).toUpperCase())
                    ) {
                      const answerLabel = String(answerValue).toUpperCase();
                      const optionLabel = label.toUpperCase();
                      return answerLabel === optionLabel;
                    }
                    return false;
                  })();

                const isCorrect =
                  showFeedback && answer?.isCorrect && isSelected;
                const isWrong =
                  showFeedback && !answer?.isCorrect && isSelected;

                const correctAnswer = question.question.correct_answer;
                const isCorrectAnswer =
                  showFeedback &&
                  !answer?.isCorrect &&
                  (() => {
                    const correctAnswerStr = Array.isArray(correctAnswer)
                      ? String(correctAnswer[0]).trim().toUpperCase()
                      : String(correctAnswer).trim().toUpperCase();
                    const optionLabel = label.trim().toUpperCase();
                    return correctAnswerStr === optionLabel;
                  })();

                return (() => {
                  const isEliminated = eliminatedOptions.has(optionId);

                  return (
                  <div
                    key={optionId}
                    className={`
                      group relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ease-in-out
                      ${isCorrect
                        ? "border-green-500 bg-green-500/10 ring-1 ring-green-500/20"
                        : isWrong
                          ? "border-red-500 bg-red-500/10 ring-1 ring-red-500/20"
                          : isCorrectAnswer
                            ? "border-green-500 bg-green-500/10 ring-1 ring-green-500/20 border-dashed"
                            : isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20 scale-[1.01] shadow-sm"
                              : isEliminated
                                ? "border-border/50 bg-muted/50 opacity-60"
                                : "border-border bg-card hover:border-primary/50 hover:bg-accent hover:scale-[1.005]"
                      }
                    `}
                    onClick={() => {
                      if (!showFeedback && !isEliminated) {
                        if (isSelected) {
                          onAnswerChange("");
                        } else {
                          onAnswerChange(optionId);
                        }
                      }
                    }}
                  >
                    {/* Label Badge */}
                    <div
                      className={`
                      flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold transition-colors
                      ${isCorrect
                          ? "border-transparent bg-green-500 text-white"
                          : isWrong
                            ? "border-transparent bg-red-500 text-white"
                            : isCorrectAnswer
                              ? "border-transparent bg-green-500 text-white"
                              : isSelected
                                ? "border-transparent bg-primary text-primary-foreground"
                                : isEliminated
                                  ? "border-border/50 bg-muted text-muted-foreground/50"
                                  : "border-border bg-muted text-muted-foreground group-hover:bg-background"
                        }
                    `}
                    >
                      {label}
                    </div>

                    {/* Answer Content */}
                    <div className={`flex-1 text-foreground font-medium ${isEliminated ? "line-through text-muted-foreground" : ""}`}>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: String(optionContent),
                        }}
                      />
                    </div>

                    {/* Elimination Button (Only show when not in feedback mode) */}
                    {!showFeedback && (
                      <button
                        onClick={(e) => toggleElimination(optionId, e)}
                        className={`
                          p-2 rounded-full transition-colors hover:bg-background/80
                          ${isEliminated ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground"}
                        `}
                        title={isEliminated ? "Restore answer" : "Eliminate answer"}
                      >
                        {isEliminated ? (
                          <RotateCcw className="w-5 h-5" />
                        ) : (
                          <Ban className="w-5 h-5" />
                        )}
                      </button>
                    )}

                    {/* Feedback Icon */}
                    {isCorrect && <Check className="w-5 h-5 text-green-500" />}
                    {isWrong && <X className="w-5 h-5 text-red-500" />}
                  </div>
                  );
                })();
              });
            })()}
          </div>
        )}

      {/* Feedback Section */}
      {showFeedback && answer && (
        <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
          {/* Feedback Card */}
          <div
            className={`
            rounded-xl p-4 border-2 transition-all duration-200
            ${answer.isCorrect
                ? "bg-green-500/10 border-green-500/20 ring-1 ring-green-500/10"
                : "bg-destructive/10 border-destructive/20 ring-1 ring-destructive/10"
              }
          `}
          >
            <div className="flex items-center gap-3">
              <div
                className={`
                h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-all shadow-sm
                ${answer.isCorrect
                    ? "bg-green-500 text-white border border-green-500/30"
                    : "bg-destructive text-white border border-destructive/30"
                  }
              `}
              >
                {answer.isCorrect ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <X className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-lg font-bold text-foreground leading-tight mb-0.5">
                  {answer.isCorrect ? "Excellent Work!" : "Not Quite Right"}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {answer.isCorrect
                    ? "You nailed this concept."
                    : "Review the explanation below to understand why."}
                </p>
              </div>
            </div>
          </div>

          {/* Confidence Rating - Show together with feedback */}
          {onConfidenceSelect && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ConfidenceRating
                onSelect={onConfidenceSelect}
                defaultScore={defaultConfidence}
              />
            </div>
          )}

          {/* Action Buttons Grid */}
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              {onGetSimilarQuestion && (
                <Button
                  onClick={() => {
                    toast("We’ll queue up similar questions for you.");
                    onGetSimilarQuestion();
                  }}
                  variant="outline"
                  className="h-12 border-border/60 bg-background/50 hover:bg-accent transition-all text-base font-semibold"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Practice Similar
                </Button>
              )}
              {onSaveQuestion && (
                <Button
                  onClick={onSaveQuestion}
                  variant="outline"
                  className="h-12 border-border/60 bg-background/50 hover:bg-accent transition-all text-base font-semibold disabled:opacity-50"
                  disabled={!!isQuestionSaved}
                >
                  <Bookmark className="w-4 h-4" />
                  {isQuestionSaved ? "Saved" : "Save Question"}
                </Button>
              )}
            </div>
          </div>

          {/* AI Feedback Display */}
          {aiFeedback && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <AIFeedbackDisplay
                feedback={aiFeedback}
                isCorrect={answer.isCorrect || false}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
