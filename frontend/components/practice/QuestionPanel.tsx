import type { SessionQuestion } from '@/lib/types';

interface QuestionPanelProps {
  question: SessionQuestion;
}

export function QuestionPanel({ question }: QuestionPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-3xl mx-auto">
        {/* Question Header */}
        <div className="flex items-center gap-3 mb-8">
          <span
            className={`px-4 py-1.5 rounded-full text-xs font-semibold ${
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
          <span className="text-sm text-gray-600 font-medium">
            {question.topic.name}
          </span>
        </div>

        {/* Question Stem */}
        <div
          className="question-stem text-lg max-w-none mb-10 text-gray-800 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: question.question.stem,
          }}
        />
      </div>
    </div>
  );
}
