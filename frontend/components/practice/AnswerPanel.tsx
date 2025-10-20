import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { AIFeedbackDisplay } from "./AIFeedbackDisplay";
import { ConfidenceRating } from "./ConfidenceRating";
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
  onConfidenceSelect?: (confidence: number) => void;
  defaultConfidence?: number;
}

export function AnswerPanel({
  question,
  answer,
  showFeedback,
  aiFeedback,
  loadingFeedback,
  onAnswerChange,
  onGetFeedback,
  onConfidenceSelect,
  defaultConfidence = 3,
}: AnswerPanelProps) {
  return (
    <div className="p-8 flex-1 overflow-y-auto">
      <h3 className="text-lg font-bold text-gray-800 mb-6">
        {question.question.question_type === "mc"
          ? "Answer Choices"
          : "Your Answer"}
      </h3>

      {/* Student Produced Response Input */}
      {question.question.question_type === "spr" && (
        <div className="space-y-4">
          <Input
            id="answer-input"
            type="text"
            placeholder="Type your answer here..."
            value={answer?.userAnswer[0] || ""}
            onChange={(e) => onAnswerChange(e.target.value)}
            disabled={showFeedback}
            className="text-xl h-14 bg-white border-2 focus:border-blue-500 rounded-xl"
          />
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

                const isSelected = answer?.userAnswer[0] === optionId;
                const isCorrect =
                  showFeedback && answer?.isCorrect && isSelected;
                const isWrong =
                  showFeedback && !answer?.isCorrect && isSelected;

                // Check if this option is the correct answer (for highlighting when wrong)
                const correctAnswer = question.question.correct_answer;
                const isCorrectAnswer =
                  showFeedback &&
                  !answer?.isCorrect &&
                  (() => {
                    // Compare correct_answer with the label (A, B, C, D), not the optionId (UUID)
                    const correctAnswerStr = Array.isArray(correctAnswer)
                      ? String(correctAnswer[0]).trim().toUpperCase()
                      : String(correctAnswer).trim().toUpperCase();

                    const optionLabel = label.trim().toUpperCase();

                    return correctAnswerStr === optionLabel;
                  })();

                return (
                  <div key={optionId} className="flex items-center gap-3">
                    {/* Label outside the box */}
                    <div className="flex-shrink-0">
                      <span className="font-bold text-blue-600 text-lg">
                        {label}.
                      </span>
                    </div>

                    {/* Clickable box without label */}
                    <div
                      className={`flex items-center gap-3 p-4 border-2 rounded-xl transition-all cursor-pointer flex-1 ${
                        isCorrect
                          ? "border-green-500 bg-green-50"
                          : isWrong
                          ? "border-red-500 bg-red-50"
                          : isCorrectAnswer
                          ? "border-green-500 bg-green-100"
                          : isSelected && !isCorrectAnswer
                          ? "border-blue-500 bg-blue-50 shadow-sm"
                          : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
                      }`}
                      onClick={() => !showFeedback && onAnswerChange(optionId)}
                    >
                      {/* Custom Radio Button */}
                      <div className="flex-shrink-0 self-start mt-0.5">
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${
                            isSelected
                              ? "bg-blue-600 border-blue-600"
                              : "border-gray-400"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-full h-full rounded-full bg-white scale-50" />
                          )}
                        </div>
                      </div>

                      {/* Answer Content */}
                      <div className="flex-1 text-gray-800">
                        <span
                          dangerouslySetInnerHTML={{
                            __html: String(optionContent),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

      {/* Confidence Rating - Show when answer is selected but before feedback */}
      {answer && !showFeedback && onConfidenceSelect && (
        <ConfidenceRating
          onSelect={onConfidenceSelect}
          defaultScore={defaultConfidence}
        />
      )}

      {/* Feedback Section */}
      {showFeedback && answer && (
        <div className="mt-8">
          {answer.isCorrect ? (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-2xl font-bold text-green-700">Correct!</h4>
              </div>
              <p className="text-green-600 font-medium">
                Great job! Keep it up! 🎉
              </p>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-300 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <X className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-2xl font-bold text-red-700">Not quite</h4>
              </div>
              <p className="text-red-600 font-medium">
                Don't worry, keep practicing!
              </p>
            </div>
          )}

          {/* AI Feedback Button */}
          <div className="mt-6">
            <Button
              onClick={onGetFeedback}
              disabled={loadingFeedback}
              variant="outline"
              className="w-full border-2 border-purple-200 hover:bg-purple-50 text-purple-700 font-semibold"
            >
              {loadingFeedback ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent mr-2"></div>
                  Generating AI Explanation...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  Get AI Explanation
                </>
              )}
            </Button>
          </div>

          {/* AI Feedback Display */}
          {aiFeedback && (
            <AIFeedbackDisplay
              feedback={aiFeedback}
              isCorrect={answer.isCorrect || false}
            />
          )}
        </div>
      )}
    </div>
  );
}
