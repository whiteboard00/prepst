"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  AlertCircle,
  Clock,
  Timer,
  Pause,
  Play,
  RotateCcw,
  List,
} from "lucide-react";
import "./practice-session.css";
import { QuestionWithDetails, AnswerState } from "@/lib/types";

function PracticeSessionContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [questions, setQuestions] = useState<QuestionWithDetails[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timer/Stopwatch states
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerMode, setTimerMode] = useState<"stopwatch" | "timer" | null>(
    null
  );
  const [time, setTime] = useState(0); // in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(0);
  const [customHours, setCustomHours] = useState(1);
  const [showTimerSetup, setShowTimerSetup] = useState(false);

  // Question list modal state
  const [showQuestionList, setShowQuestionList] = useState(false);

  // localStorage key for this session's timer
  const timerStorageKey = `timer-state-${sessionId}`;

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.question.id]
    : null;

  const loadSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(
        `http://localhost:8000/api/study-plans/sessions/${sessionId}/questions`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load session");
      }

      const data = await response.json();
      const sortedQuestions = data.questions.sort(
        (a: QuestionWithDetails, b: QuestionWithDetails) =>
          a.display_order - b.display_order
      );

      setQuestions(sortedQuestions);

      const initialAnswers: Record<string, AnswerState> = {};
      sortedQuestions.forEach((q: QuestionWithDetails) => {
        if (q.status !== "not_started") {
          const hasUserAnswer = q.user_answer && q.user_answer.length > 0;
          const correctAnswer = q.question.correct_answer;
          const correctAnswerArray = Array.isArray(correctAnswer)
            ? correctAnswer
            : [String(correctAnswer)];

          initialAnswers[q.question.id] = {
            userAnswer: q.user_answer || [],
            status: q.status,
            isCorrect:
              hasUserAnswer && q.status === "answered"
                ? JSON.stringify(q.user_answer?.sort()) ===
                  JSON.stringify(correctAnswerArray.sort())
                : undefined,
          };
        }
      });
      setAnswers(initialAnswers);

      const firstUnanswered = sortedQuestions.findIndex(
        (q: QuestionWithDetails) => q.status === "not_started"
      );
      setCurrentIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Load timer state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(timerStorageKey);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setTimerMode(parsed.timerMode);
        setTime(parsed.time);
        setCustomHours(parsed.customHours);
        setCustomMinutes(parsed.customMinutes);
        // Always pause when returning to the session
        setIsRunning(false);
      } catch (err) {
        console.error("Failed to load timer state:", err);
      }
    }
  }, [sessionId, timerStorageKey]);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    if (timerMode) {
      const stateToSave = {
        timerMode,
        time,
        customHours,
        customMinutes,
        // Don't save isRunning - always pause on reload
      };
      localStorage.setItem(timerStorageKey, JSON.stringify(stateToSave));
    } else {
      // Clear localStorage when timer is closed
      localStorage.removeItem(timerStorageKey);
    }
  }, [timerMode, time, customHours, customMinutes, timerStorageKey]);

  // Timer/Stopwatch effect
  useEffect(() => {
    if (!isRunning || !timerMode) return;

    const interval = setInterval(() => {
      setTime((prev) => {
        if (timerMode === "stopwatch") {
          return prev + 1;
        } else {
          // Timer mode - countdown
          if (prev <= 0) {
            setIsRunning(false);
            // Play sound or notification when timer ends
            return 0;
          }
          return prev - 1;
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timerMode]);

  const handleStartStopwatch = () => {
    setTimerMode("stopwatch");
    setTime(0);
    setIsRunning(true);
    setShowTimerModal(false);
    setShowTimerSetup(false);
  };

  const handleStartTimer = () => {
    const totalSeconds = customHours * 3600 + customMinutes * 60;
    setTimerMode("timer");
    setTime(totalSeconds);
    setIsRunning(true);
    setShowTimerModal(false);
    setShowTimerSetup(false);
  };

  const handlePauseResume = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    if (timerMode === "stopwatch") {
      setTime(0);
    } else if (timerMode === "timer") {
      const totalSeconds = customHours * 3600 + customMinutes * 60;
      setTime(totalSeconds);
    }
  };

  const handleAnswerChange = (value: string) => {
    if (!currentQuestion || showFeedback) return;

    setAnswers({
      ...answers,
      [currentQuestion.question.id]: {
        userAnswer: [value],
        status: "in_progress",
      },
    });
  };

  const handleSubmit = async () => {
    if (!currentAnswer || !currentQuestion) return;

    try {
      setIsSubmitting(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(
        `http://localhost:8000/api/study-plans/sessions/${sessionId}/questions/${currentQuestion.question.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_answer: currentAnswer.userAnswer,
            status: "answered",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to submit answer");
      }

      const result = await response.json();

      setAnswers({
        ...answers,
        [currentQuestion.question.id]: {
          ...currentAnswer,
          isCorrect: result.is_correct,
          status: "answered",
        },
      });

      setShowFeedback(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit answer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextQuestion = questions[nextIndex];

      const nextAnswer = answers[nextQuestion.question.id];
      const wasAnswered =
        nextAnswer &&
        nextAnswer.status === "answered" &&
        nextAnswer.isCorrect !== undefined;

      setCurrentIndex(nextIndex);
      setTimeout(() => {
        setShowFeedback(wasAnswered);
      }, 0);
    } else {
      router.push(`/practice/${sessionId}/summary`);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const prevQuestion = questions[prevIndex];

      const prevAnswer = answers[prevQuestion.question.id];
      const wasAnswered =
        prevAnswer &&
        prevAnswer.status === "answered" &&
        prevAnswer.isCorrect !== undefined;

      setCurrentIndex(prevIndex);
      setTimeout(() => {
        setShowFeedback(wasAnswered);
      }, 0);
    }
  };

  const handleQuestionNavigation = (questionIndex: number) => {
    if (questionIndex >= 0 && questionIndex < questions.length) {
      const targetQuestion = questions[questionIndex];
      const targetAnswer = answers[targetQuestion.question.id];
      const wasAnswered =
        targetAnswer &&
        targetAnswer.status === "answered" &&
        targetAnswer.isCorrect !== undefined;

      setCurrentIndex(questionIndex);
      setShowQuestionList(false);
      setTimeout(() => {
        setShowFeedback(wasAnswered);
      }, 0);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading your practice...</p>
        </div>
      </div>
    );
  }

  if (error || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error || "Question not found"}</p>
          <Button
            onClick={() => router.push("/dashboard/study-plan")}
            size="lg"
          >
            Back to Study Plan
          </Button>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / questions.length) * 100;

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 flex flex-col overflow-hidden">
      {/* Header with Progress */}
      <div className="bg-white/90 backdrop-blur-sm border-b px-8 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            {/* Question List Button */}
            <button
              onClick={() => setShowQuestionList(!showQuestionList)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors border border-gray-200"
              title="View all questions"
            >
              <List className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">
              Practice Session
            </h1>
            <span className="text-sm text-gray-600 font-medium">
              {currentIndex + 1} / {questions.length}
            </span>

            {/* Timer/Stopwatch Button */}
            {!timerMode ? (
              <div className="relative">
                <button
                  onClick={() => setShowTimerModal(!showTimerModal)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors border border-gray-200"
                >
                  <Clock className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            ) : (
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
                  timerMode === "timer"
                    ? "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200"
                    : "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200"
                }`}
              >
                <span className="text-sm font-mono font-semibold text-gray-800">
                  {formatTime(time)}
                </span>
                <button
                  onClick={handlePauseResume}
                  className="p-1 hover:bg-white/50 rounded-full transition-colors"
                >
                  {isRunning ? (
                    <Pause
                      className={`w-3.5 h-3.5 ${
                        timerMode === "timer"
                          ? "text-orange-600"
                          : "text-blue-600"
                      }`}
                    />
                  ) : (
                    <Play
                      className={`w-3.5 h-3.5 ${
                        timerMode === "timer"
                          ? "text-orange-600"
                          : "text-blue-600"
                      }`}
                    />
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="p-1 hover:bg-white/50 rounded-full transition-colors"
                >
                  <RotateCcw
                    className={`w-3.5 h-3.5 ${
                      timerMode === "timer"
                        ? "text-orange-600"
                        : "text-blue-600"
                    }`}
                  />
                </button>
                <button
                  onClick={() => {
                    setTimerMode(null);
                    setIsRunning(false);
                    setTime(0);
                    localStorage.removeItem(timerStorageKey);
                  }}
                  className="p-1 hover:bg-white/50 rounded-full transition-colors"
                >
                  <X
                    className={`w-3.5 h-3.5 ${
                      timerMode === "timer"
                        ? "text-orange-600"
                        : "text-blue-600"
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => router.push("/dashboard/study-plan")}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <Progress value={progress} className="h-2 bg-gray-200" />
      </div>

      {/* Timer/Stopwatch Dropdown */}
      {showTimerModal && !showTimerSetup && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowTimerModal(false)}
          />
          <div className="fixed top-20 left-[280px] z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 w-52">
            <div className="grid grid-cols-2 gap-2">
              {/* Stopwatch Option */}
              <button
                onClick={handleStartStopwatch}
                className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-3 transition-all"
              >
                <div className="flex flex-col items-center gap-1.5">
                  <Clock className="w-5 h-5 text-gray-700" />
                  <span className="text-xs font-medium text-gray-700">
                    Stopwatch
                  </span>
                </div>
              </button>

              {/* Timer Option */}
              <button
                onClick={() => setShowTimerSetup(true)}
                className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-3 transition-all"
              >
                <div className="flex flex-col items-center gap-1.5">
                  <Timer className="w-5 h-5 text-gray-700" />
                  <span className="text-xs font-medium text-gray-700">
                    Timer
                  </span>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Timer Setup Dropdown */}
      {showTimerSetup && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setShowTimerSetup(false);
              setShowTimerModal(false);
            }}
          />
          <div className="fixed top-20 left-[280px] z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-56">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => {
                  setShowTimerSetup(false);
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <h3 className="text-sm font-semibold text-gray-700">Set Timer</h3>
              <button
                onClick={() => {
                  setShowTimerSetup(false);
                  setShowTimerModal(false);
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-center gap-2">
                {/* Hours Input */}
                <div className="flex flex-col items-center">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-1">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={customHours.toString().padStart(2, "0")}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setCustomHours(Math.max(0, Math.min(23, val)));
                      }}
                      className="w-12 text-2xl font-bold text-center bg-transparent text-gray-800 outline-none"
                    />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">hr</span>
                </div>

                <span className="text-2xl font-bold text-gray-400 mb-5">:</span>

                {/* Minutes Input */}
                <div className="flex flex-col items-center">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-1">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={customMinutes.toString().padStart(2, "0")}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setCustomMinutes(Math.max(0, Math.min(59, val)));
                      }}
                      className="w-12 text-2xl font-bold text-center bg-transparent text-gray-800 outline-none"
                    />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">min</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartTimer}
              disabled={customHours === 0 && customMinutes === 0}
              className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Play className="w-3.5 h-3.5" />
              Start Timer
            </button>
          </div>
        </>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Question List */}
        {showQuestionList && (
          <div className="w-[480px] border-r bg-white/60 backdrop-blur-sm flex flex-col">
            <div className="p-6 border-b bg-white/80">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">Questions</h3>
                <button
                  onClick={() => setShowQuestionList(false)}
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
                const isAnswered = answer?.status === "answered";
                const isCorrect = answer?.isCorrect === true;
                const isWrong = answer?.isCorrect === false;

                return (
                  <button
                    key={question.question.id}
                    onClick={() => handleQuestionNavigation(index)}
                    className={`w-full p-4 rounded-lg text-left transition-all border-2 ${
                      isCurrent
                        ? "border-blue-500 bg-blue-50"
                        : isCorrect
                        ? "border-green-300 bg-green-50 hover:bg-green-100"
                        : isWrong
                        ? "border-red-300 bg-red-50 hover:bg-red-100"
                        : isAnswered
                        ? "border-gray-300 bg-gray-50 hover:bg-gray-100"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            isCurrent
                              ? "bg-blue-500 text-white"
                              : isCorrect
                              ? "bg-green-500 text-white"
                              : isWrong
                              ? "bg-red-500 text-white"
                              : "bg-gray-300 text-gray-700"
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
                              question.question.difficulty === "E"
                                ? "bg-emerald-100 text-emerald-700"
                                : question.question.difficulty === "M"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {question.question.difficulty === "E"
                              ? "Easy"
                              : question.question.difficulty === "M"
                              ? "Medium"
                              : "Hard"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCorrect && (
                          <Check className="w-5 h-5 text-green-600" />
                        )}
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
        )}

        {/* Left Panel - Question */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto">
            {/* Question Header */}
            <div className="flex items-center gap-3 mb-8">
              <span
                className={`px-4 py-1.5 rounded-full text-xs font-semibold ${
                  currentQuestion.question.difficulty === "E"
                    ? "bg-emerald-100 text-emerald-700"
                    : currentQuestion.question.difficulty === "M"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {currentQuestion.question.difficulty === "E"
                  ? "Easy"
                  : currentQuestion.question.difficulty === "M"
                  ? "Medium"
                  : "Hard"}
              </span>
              <span className="text-sm text-gray-600 font-medium">
                {currentQuestion.topic.name}
              </span>
            </div>

            {/* Question Stem */}
            <div
              className="question-stem text-lg max-w-none mb-10 text-gray-800 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: currentQuestion.question.stem,
              }}
            />
          </div>
        </div>

        {/* Right Panel - Answer Choices & Feedback */}
        <div className="w-[480px] border-l bg-white/60 backdrop-blur-sm flex flex-col">
          <div className="p-8 flex-1 overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-6">
              {currentQuestion.question.question_type === "mc"
                ? "Answer Choices"
                : "Your Answer"}
            </h3>

            {/* Student Produced Response Input */}
            {currentQuestion.question.question_type === "spr" && (
              <div className="space-y-4">
                <Input
                  id="answer-input"
                  type="text"
                  placeholder="Type your answer here..."
                  value={currentAnswer?.userAnswer[0] || ""}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  disabled={showFeedback}
                  className="text-xl h-14 bg-white border-2 focus:border-blue-500 rounded-xl"
                />
              </div>
            )}

            {/* Multiple Choice Options */}
            {currentQuestion.question.question_type === "mc" &&
              currentQuestion.question.answer_options && (
                <RadioGroup
                  value={currentAnswer?.userAnswer[0] || ""}
                  onValueChange={handleAnswerChange}
                  disabled={showFeedback}
                  className="space-y-3"
                >
                  {(() => {
                    const options = Array.isArray(
                      currentQuestion.question.answer_options
                    )
                      ? currentQuestion.question.answer_options
                      : Object.entries(currentQuestion.question.answer_options);

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

                      const isSelected =
                        currentAnswer?.userAnswer[0] === optionId;
                      const isCorrect =
                        showFeedback && currentAnswer?.isCorrect && isSelected;
                      const isWrong =
                        showFeedback && !currentAnswer?.isCorrect && isSelected;

                      return (
                        <div
                          key={optionId}
                          className={`flex items-center gap-3 p-4 border-2 rounded-xl transition-all cursor-pointer ${
                            isCorrect
                              ? "border-green-500 bg-green-50"
                              : isWrong
                              ? "border-red-500 bg-red-50"
                              : isSelected
                              ? "border-blue-500 bg-blue-50 shadow-sm"
                              : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
                          }`}
                        >
                          <RadioGroupItem
                            value={optionId}
                            id={`option-${optionId}`}
                            className="flex-shrink-0 self-start mt-0.5"
                          />
                          <Label
                            htmlFor={`option-${optionId}`}
                            className="answer-choice-label flex-1 cursor-pointer text-gray-800"
                            dangerouslySetInnerHTML={{
                              __html: `<span class="font-bold text-blue-600">${label}.</span> ${optionContent}`,
                            }}
                          />
                        </div>
                      );
                    });
                  })()}
                </RadioGroup>
              )}

            {/* Feedback Section */}
            {showFeedback && currentAnswer && (
              <div className="mt-8">
                {currentAnswer.isCorrect ? (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="text-2xl font-bold text-green-700">
                        Correct!
                      </h4>
                    </div>
                    <p className="text-green-600 font-medium">
                      Great job! Keep it up! 🎉
                    </p>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-300 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                        <X className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="text-2xl font-bold text-red-700">
                        Not quite
                      </h4>
                    </div>
                    <p className="text-red-600 font-medium mb-3">
                      Don&apos;t worry, keep practicing!
                    </p>
                    <div className="bg-white/70 rounded-lg p-4 border border-red-200">
                      <p className="text-sm text-gray-600 mb-1 font-medium">
                        Correct answer:
                      </p>
                      <p className="text-lg font-bold text-gray-800">
                        {Array.isArray(currentQuestion.question.correct_answer)
                          ? currentQuestion.question.correct_answer.join(", ")
                          : String(currentQuestion.question.correct_answer)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="p-6 border-t bg-white space-y-3">
            {!showFeedback ? (
              <>
                <Button
                  onClick={handleSubmit}
                  disabled={!currentAnswer || isSubmitting}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                  size="lg"
                >
                  {isSubmitting ? "Checking..." : "Check Answer"}
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className="flex-1"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleNext}
                    className="flex-1"
                  >
                    Skip
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="flex-1"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                  size="lg"
                >
                  {currentIndex < questions.length - 1 ? (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    "Finish"
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
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
