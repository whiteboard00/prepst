"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { QuestionPracticePopup } from "@/components/revision/QuestionPracticePopup";
import type { SessionQuestion } from "@/lib/types";

export default function QuestionOfTheDayCard() {
  const [question, setQuestion] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] =
    useState<SessionQuestion | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [todayKey, setTodayKey] = useState<string>("");

  // Helper function to get today's date key
  const getTodayKey = () => {
    return new Date().toISOString().split("T")[0];
  };

  // Check for date changes and reset completion if needed
  useEffect(() => {
    const checkDateChange = () => {
      const currentDateKey = getTodayKey();
      if (todayKey && todayKey !== currentDateKey) {
        // Date has changed, reset completion
        setIsCompleted(false);
      }
      setTodayKey(currentDateKey);
    };

    // Check immediately
    checkDateChange();

    // Set up interval to check every minute (in case user keeps page open overnight)
    const interval = setInterval(checkDateChange, 60000);

    // Also check when window regains focus (user comes back to tab)
    const handleFocus = () => {
      checkDateChange();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [todayKey]);

  useEffect(() => {
    const fetchQuestionOfTheDay = async () => {
      try {
        const { data, error } = await supabase
          .from("questions")
          .select("id, stem, difficulty, topics(id, name)")
          .limit(50);

        if (error) throw error;

        if (data && data.length > 0) {
          const today = new Date();
          const dayOfYear = Math.floor(
            (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          const randomIndex = dayOfYear % data.length;
          const selectedQuestion = data[randomIndex];
          setQuestion(selectedQuestion);

          // Check if today's question has been completed
          const currentDateKey = getTodayKey();
          setTodayKey(currentDateKey);
          const completionKey = `qotd-completed-${selectedQuestion.id}-${currentDateKey}`;
          const completed = localStorage.getItem(completionKey) === "true";
          setIsCompleted(completed);
        }
      } catch (error) {
        console.error("Error fetching question of the day:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestionOfTheDay();
  }, []);

  const stripHtml = (html?: string | null) => {
    if (!html) return "Question text unavailable";
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const transformToSessionQuestion = (q: any): SessionQuestion | null => {
    if (!q || !q.topics) {
      return null;
    }
    return {
      session_question_id: `qotd-${q.id}`,
      question: q as any,
      topic: {
        id: q.topics.id,
        name: q.topics.name,
        category_id: "",
        weight_in_category: 0,
      } as any,
      status: "not_started",
      display_order: 0,
      user_answer: null,
      is_saved: false,
    } as SessionQuestion;
  };

  const handleQuestionClick = async () => {
    if (!question) return;

    try {
      const { data: fullQuestion, error } = await supabase
        .from("questions")
        .select(
          "id, stem, question_type, answer_options, correct_answer, difficulty, topics(id, name)"
        )
        .eq("id", question.id)
        .single();

      if (error) throw error;

      const sessionQuestion = transformToSessionQuestion(fullQuestion);
      if (sessionQuestion) {
        setSelectedQuestion(sessionQuestion);
        setIsPopupOpen(true);
      }
    } catch (error) {
      console.error("Error loading question:", error);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="group relative w-full h-full text-left rounded-[2.5rem] overflow-hidden shadow-lg dark:shadow-none transition-all duration-300 cursor-pointer flex flex-col"
        onClick={handleQuestionClick}
      >
        {/* Base Background */}
        <div className="absolute inset-0 bg-white/90 dark:bg-white/10"></div>

        {/* Blurred Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 via-yellow-500/30 to-amber-500/30 dark:from-orange-500/40 dark:via-yellow-500/40 dark:to-amber-500/40">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-orange-500/40 dark:bg-orange-500/50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-yellow-500/40 dark:bg-yellow-500/50 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col p-6 md:p-10 backdrop-blur-sm bg-white/20 dark:bg-white/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-yellow-400" />
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Question of the Day
              </span>
            </div>
            {isCompleted && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 backdrop-blur-md rounded-md border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                  Done
                </span>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col flex-1 justify-between">
              <div className="flex-1 flex flex-col">
                <p className="text-base text-foreground leading-relaxed mb-4">
                  Practice a new question every day to build consistency and
                  improve your skills.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium uppercase tracking-wide mt-auto">
                  <div className="px-3 py-1.5 bg-background/50 backdrop-blur-md rounded-md border border-border/50">
                    <Loader2 className="w-3 h-3 animate-spin inline-block" />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end">
                <div className="w-10 h-10 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              </div>
            </div>
          ) : question ? (
            <div className="flex flex-col flex-1 justify-between">
              <div className="flex-1 flex flex-col">
                <p className="text-base text-foreground leading-relaxed mb-4">
                  Practice a new question every day to build consistency and
                  improve your skills.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium uppercase tracking-wide mt-auto">
                  {question.topics?.name && (
                    <span className="px-3 py-1.5 bg-background/50 backdrop-blur-md rounded-md border border-border/50">
                      {question.topics.name}
                    </span>
                  )}
                  {question.difficulty && (
                    <span className="px-3 py-1.5 bg-background/50 backdrop-blur-md rounded-md border border-border/50">
                      {question.difficulty === "E"
                        ? "Easy"
                        : question.difficulty === "M"
                        ? "Medium"
                        : "Hard"}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end">
                <div className="w-10 h-10 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 flex items-center justify-center text-primary transition-all duration-300">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center flex-1">
              <div className="text-sm text-muted-foreground">
                No question available
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {selectedQuestion && (
        <QuestionPracticePopup
          open={isPopupOpen}
          onOpenChange={setIsPopupOpen}
          question={selectedQuestion}
          onComplete={() => {
            // Mark question as completed
            if (question) {
              const currentDateKey = getTodayKey();
              const completionKey = `qotd-completed-${question.id}-${currentDateKey}`;
              localStorage.setItem(completionKey, "true");
              setIsCompleted(true);
            }
            setIsPopupOpen(false);
            setSelectedQuestion(null);
          }}
        />
      )}
    </>
  );
}
