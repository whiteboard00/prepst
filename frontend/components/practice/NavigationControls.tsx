import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NavigationControlsProps {
  showFeedback: boolean;
  hasAnswer: boolean;
  isSubmitting: boolean;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  onSubmit: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function NavigationControls({
  showFeedback,
  hasAnswer,
  isSubmitting,
  isFirstQuestion,
  isLastQuestion,
  onSubmit,
  onNext,
  onPrevious,
}: NavigationControlsProps) {
  return (
    <div className="p-6 border-t bg-white space-y-3">
      {!showFeedback ? (
        <>
          <Button
            onClick={onSubmit}
            disabled={!hasAnswer || isSubmitting}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            size="lg"
          >
            {isSubmitting ? 'Checking...' : 'Check Answer'}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onPrevious}
              disabled={isFirstQuestion}
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button variant="outline" onClick={onNext} className="flex-1">
              Skip
            </Button>
          </div>
        </>
      ) : (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={isFirstQuestion}
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Button
            onClick={onNext}
            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            size="lg"
          >
            {isLastQuestion ? (
              'Finish'
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
