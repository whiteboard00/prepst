import { AlertCircle } from 'lucide-react';
import { Button } from './button';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorDisplay({
  title = 'Oops!',
  message,
  onRetry,
  retryLabel = 'Try Again',
}: ErrorDisplayProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} size="lg">
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
