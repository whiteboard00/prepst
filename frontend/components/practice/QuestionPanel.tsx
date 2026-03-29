import { useEffect, useRef } from "react";
import type { SessionQuestion } from "@/lib/types";
import { processQuestionBlanks, formatTopicName } from "@/lib/question-utils";
import { useTextHighlighter } from "@/hooks/useTextHighlighter";
import { useAddVocabFromSelection } from "@/hooks/mutations/useVocabularyMutations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tag, BookMarked, Loader2 } from "lucide-react";

interface QuestionPanelProps {
  question: SessionQuestion;
  compact?: boolean;
  isPinned?: boolean;
}

export function QuestionPanel({
  question,
  compact = false,
  isPinned = false,
}: QuestionPanelProps) {
  const stimulusContentRef = useRef<HTMLDivElement | null>(null);
  const stemContentRef = useRef<HTMLDivElement | null>(null);

  const addVocab = useAddVocabFromSelection();

  const handleSaveToVocab = (word: string, contextSentence: string) => {
    addVocab.mutate({
      word,
      context_sentence: contextSentence,
      session_question_id: question.session_question_id,
    });
  };

  const { containerRef, selectionInfo, handleSaveToVocab: saveToVocab, clearSelection, cancelHideTimeout } = useTextHighlighter({
    questionId: question.question.id,
    enabled: true,
    onSaveToVocab: handleSaveToVocab,
  });

  const processedStem = processQuestionBlanks(question.question.stem || "");
  const processedStimulus = processQuestionBlanks(
    question.question.stimulus || ""
  );

  // Set innerHTML once using refs to avoid destroying web-highlighter's elements
  useEffect(() => {
    if (stemContentRef.current && processedStem) {
      stemContentRef.current.innerHTML = processedStem;
    }
  }, [processedStem]);

  useEffect(() => {
    if (stimulusContentRef.current && processedStimulus) {
      stimulusContentRef.current.innerHTML = processedStimulus;
    }
  }, [processedStimulus]);

  const difficultyColor =
    question.question.difficulty === "E"
      ? "bg-emerald-500"
      : question.question.difficulty === "M"
        ? "bg-amber-500"
        : "bg-rose-500";

  const difficultyLabel =
    question.question.difficulty === "E"
      ? "Easy"
      : question.question.difficulty === "M"
        ? "Medium"
        : "Hard";

  return (
    <div
      className={`w-full lg:flex-1 lg:overflow-y-auto ${compact ? "p-6" : isPinned ? "py-8 px-8 lg:py-12" : "py-8 px-4 lg:pl-[250px] lg:pr-0 lg:py-12"
        }`}
    >
      <div
        ref={containerRef}
        className={`${compact ? "max-w-full" : "max-w-3xl"} mx-auto space-y-8`}
      >
        {/* Question Meta */}
        <div className="flex items-center gap-4">
          <Badge
            variant="outline"
            className="pl-2 pr-3 py-1 gap-2 border-border bg-card text-foreground font-medium"
          >
            <div className={`w-1.5 h-1.5 rounded-full ${difficultyColor}`} />
            {difficultyLabel}
          </Badge>
          <Badge
            variant="outline"
            className="pl-2 pr-3 py-1 gap-1.5 border-border bg-card text-foreground font-medium"
          >
            <Tag className="w-3 h-3 text-muted-foreground" />
            <span className="text-sm">
              {formatTopicName(question.topic.name)}
            </span>
          </Badge>
        </div>

        {/* Stimulus (Passage/Context) */}
        {processedStimulus && (
          <div className="relative pl-6 border-l-4 border-primary/20">
            <div
              ref={stimulusContentRef}
              className="prose prose-lg dark:prose-invert max-w-none text-muted-foreground leading-relaxed"
            />
          </div>
        )}

        {/* Question Stem */}
        <div
          ref={stemContentRef}
          className="prose prose-xl dark:prose-invert max-w-none text-foreground font-medium leading-relaxed tracking-tight"
        />
      </div>

      {/* Floating Vocab Save Button */}
      {selectionInfo && (
        <div
          data-vocab-button
          className="fixed z-50 transform -translate-x-1/2 -translate-y-full"
          style={{
            left: selectionInfo.position.x,
            top: selectionInfo.position.y,
          }}
          onMouseEnter={cancelHideTimeout}
        >
          <Button
            size="sm"
            className="shadow-lg gap-1.5 text-xs"
            onClick={saveToVocab}
            disabled={addVocab.isPending}
          >
            {addVocab.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <BookMarked className="w-3 h-3" />
            )}
            Save to Vocab
          </Button>
        </div>
      )}
    </div>
  );
}
