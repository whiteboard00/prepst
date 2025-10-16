import { X, Check } from 'lucide-react';
import type { SessionQuestion, AnswerState } from '@/lib/types';

interface QuestionListSidebarProps {
  questions: SessionQuestion[];
  answers: Record<string, AnswerState>;
  currentIndex: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
}

export function QuestionListSidebar({
  questions,
  answers,
  currentIndex,
  onNavigate,
  onClose,
}: QuestionListSidebarProps) {
  return (
    <div className="w-[480px] border-r bg-white/60 backdrop-blur-sm flex flex-col">
      <div className="p-6 border-b bg-white/80">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">Questions</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {questions.map((question, index) => {
          const answer = answers[question.question.id];
          const isCurrent = index === currentIndex;
          const isAnswered = answer?.status === 'answered';
          const isCorrect = answer?.isCorrect === true;
          const isWrong = answer?.isCorrect === false;

          return (
            <button
              key={question.question.id}
              onClick={() => onNavigate(index)}
              className={`w-full p-4 rounded-lg text-left transition-all border-2 ${
                isCurrent
                  ? 'border-blue-500 bg-blue-50'
                  : isCorrect
                  ? 'border-green-300 bg-green-50 hover:bg-green-100'
                  : isWrong
                  ? 'border-red-300 bg-red-50 hover:bg-red-100'
                  : isAnswered
                  ? 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isCurrent
                        ? 'bg-blue-500 text-white'
                        : isCorrect
                        ? 'bg-green-500 text-white'
                        : isWrong
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-800 block">
                      {question.topic.name}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        question.question.difficulty === 'E'
                          ? 'bg-emerald-100 text-emerald-700'
                          : question.question.difficulty === 'M'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {question.question.difficulty === 'E'
                        ? 'Easy'
                        : question.question.difficulty === 'M'
                        ? 'Medium'
                        : 'Hard'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isCorrect && <Check className="w-5 h-5 text-green-600" />}
                  {isWrong && <X className="w-5 h-5 text-red-600" />}
                  {isCurrent && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
