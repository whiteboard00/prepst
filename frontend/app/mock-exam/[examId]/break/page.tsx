'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Coffee, Clock, CheckCircle } from 'lucide-react';

function BreakContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = params.examId as string;
  const nextModuleId = searchParams.get('nextModule');
  const completedModule = searchParams.get('completed');

  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
  const [canContinue, setCanContinue] = useState(false);

  useEffect(() => {
    // Allow continuing immediately for now (can enforce 10min break later)
    setCanContinue(true);

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getModuleTitle = (moduleType: string) => {
    const typeMap: Record<string, string> = {
      'rw_module_1': 'Reading and Writing - Module 1',
      'rw_module_2': 'Reading and Writing - Module 2',
      'math_module_1': 'Math - Module 1',
      'math_module_2': 'Math - Module 2',
    };
    return typeMap[moduleType] || moduleType;
  };

  const handleContinue = () => {
    if (nextModuleId) {
      router.push(`/mock-exam/${examId}/module/${nextModuleId}`);
    } else {
      router.push(`/mock-exam/${examId}/results`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl p-12 shadow-lg border border-gray-200 text-center">
          {/* Icon */}
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <Coffee className="w-12 h-12 text-blue-600" />
          </div>

          {/* Completed Module */}
          {completedModule && (
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700 font-semibold">
                {getModuleTitle(completedModule)} Complete!
              </span>
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Take a Break</h1>
          <p className="text-lg text-gray-600 mb-8">
            You&apos;ve completed a module. Take a moment to rest before continuing.
          </p>

          {/* Break Timer */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-8 mb-8 border-2 border-blue-200">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Clock className="w-8 h-8 text-blue-600" />
              <span className="text-5xl font-mono font-bold text-blue-700">
                {formatTime(timeRemaining)}
              </span>
            </div>
            <p className="text-sm text-blue-600 font-medium">
              {timeRemaining > 0 ? 'Break time remaining' : 'Break time is up!'}
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
            <h3 className="font-semibold text-gray-900 mb-3">During your break:</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Stretch and move around</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Get a drink or snack</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Take deep breaths and relax</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Don&apos;t review your answers or study materials</span>
              </li>
            </ul>
          </div>

          {/* Continue Button */}
          <Button
            onClick={handleContinue}
            disabled={!canContinue}
            size="lg"
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-lg py-6"
          >
            {nextModuleId ? 'Continue to Next Module' : 'View Results'}
          </Button>

          {!canContinue && (
            <p className="text-sm text-gray-500 mt-4">
              You can continue after {formatTime(timeRemaining)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BreakPage() {
  return (
    <ProtectedRoute>
      <BreakContent />
    </ProtectedRoute>
  );
}
