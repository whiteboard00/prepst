"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  Database,
  Bookmark,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Filter,
  Calculator,
  BookText,
  Sparkles,
  Play,
} from "lucide-react";
import {
  useSavedQuestions,
  useWrongAnswers,
  useTopicsSummary,
  useQuestionPool,
} from "@/hooks/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { QuestionPracticePopup } from "@/components/revision/QuestionPracticePopup";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { processQuestionBlanks, formatTopicName } from "@/lib/question-utils";
import { useCourseConfigSafe } from "@/contexts/CourseContext";
import type { SavedQuestion, WrongAnswer } from "@/lib/types";
import type { SessionQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { ONBOARDING_CONTENT } from "@/lib/onboardingContent";
import { toast } from "sonner";
import { buildPracticeSessionPath } from "@/lib/practice-navigation";

type SectionTab = "all" | "reading_writing" | "math";
type DifficultyFilter = "all" | "E" | "M" | "H";

function QuestionPoolContent() {
  const router = useRouter();
  const { course } = useCourseConfigSafe();
  // Existing hooks for saved/missed questions
  const { data: savedQuestions = [], isLoading: loadingSavedQuestions } =
    useSavedQuestions(20);
  const { data: wrongAnswers = [], isLoading: loadingWrongAnswers } =
    useWrongAnswers(20);

  // Section filter state
  const [activeSection, setActiveSection] = useState<SectionTab>("all");
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>("all");
  const [searchQuery] = useState(""); // Kept for API compatibility, but UI removed
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  // Fetch ALL topics summary (for accurate counts in tabs)
  const { data: allTopicsSummary = [], isLoading: loadingTopics } =
    useTopicsSummary(); // Always fetch all - no filter

  // Filter topics based on active section for display
  const topicsSummary = useMemo(() => {
    if (activeSection === "all") return allTopicsSummary;
    return allTopicsSummary.filter((t) => t.section === activeSection);
  }, [allTopicsSummary, activeSection]);

  // Fetch questions for selected topic
  const { data: topicQuestions, isLoading: loadingQuestions } = useQuestionPool(
    {
      section: activeSection === "all" ? undefined : activeSection,
      difficulty: difficultyFilter === "all" ? undefined : difficultyFilter,
      topicId: selectedTopicId || undefined,
      search: searchQuery || undefined,
      limit: 50,
    }
  );

  // Question practice popup state
  const [selectedQuestion, setSelectedQuestion] =
    useState<SessionQuestion | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [correctlyAnsweredIds, setCorrectlyAnsweredIds] = useState<Set<string>>(
    new Set()
  );
  const [creatingTopicSessionId, setCreatingTopicSessionId] = useState<
    string | null
  >(null);

  // Saved/Missed questions state
  const [savedQuestionsSort, setSavedQuestionsSort] =
    useState<string>("recent");
  const [wrongAnswersSort, setWrongAnswersSort] = useState<string>("recent");
  const [timeRange, setTimeRange] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [visibleSavedQuestionsCount, setVisibleSavedQuestionsCount] =
    useState(5);
  const [visibleWrongAnswersCount, setVisibleWrongAnswersCount] = useState(5);
  const [savedCollapsed, setSavedCollapsed] = useState(true);
  const [missedCollapsed, setMissedCollapsed] = useState(true);

  // Process question text for proper HTML/MathML rendering
  const processQuestionText = (text?: string | null): string => {
    if (!text) return "";
    return processQuestionBlanks(text);
  };

  // Group topics by category
  const topicsByCategory = useMemo(() => {
    const grouped: Record<
      string,
      {
        categoryId: string;
        categoryName: string;
        section: string;
        topics: typeof topicsSummary;
      }
    > = {};

    for (const topic of topicsSummary) {
      if (!grouped[topic.category_id]) {
        grouped[topic.category_id] = {
          categoryId: topic.category_id,
          categoryName: topic.category_name,
          section: topic.section,
          topics: [],
        };
      }
      grouped[topic.category_id].topics.push(topic);
    }

    return Object.values(grouped).sort((a, b) => {
      // Sort by section first (reading_writing before math), then by category name
      if (a.section !== b.section) {
        return a.section === "reading_writing" ? -1 : 1;
      }
      return a.categoryName.localeCompare(b.categoryName);
    });
  }, [topicsSummary]);

  // Filter topics by section
  const filteredCategories = useMemo(() => {
    if (activeSection === "all") return topicsByCategory;
    return topicsByCategory.filter((cat) => cat.section === activeSection);
  }, [topicsByCategory, activeSection]);

  // Calculate totals (always from ALL topics, not filtered)
  const totalQuestions = useMemo(() => {
    return allTopicsSummary.reduce((acc, t) => acc + t.total_questions, 0);
  }, [allTopicsSummary]);

  const sectionCounts = useMemo(() => {
    const counts = { reading_writing: 0, math: 0 };
    for (const topic of allTopicsSummary) {
      if (topic.section === "reading_writing") {
        counts.reading_writing += topic.total_questions;
      } else if (topic.section === "math") {
        counts.math += topic.total_questions;
      }
    }
    return counts;
  }, [allTopicsSummary]);

  // Toggle topic expansion
  const toggleTopic = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
      if (selectedTopicId === topicId) {
        setSelectedTopicId(null);
      }
    } else {
      newExpanded.add(topicId);
      setSelectedTopicId(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  // Transform a pool question to SessionQuestion for practice
  const transformPoolQuestion = (q: any): SessionQuestion => {
    return {
      session_question_id: q.id, // Use question ID as session_question_id
      question: {
        id: q.id,
        stem: q.stem,
        stimulus: q.stimulus,
        difficulty: q.difficulty,
        question_type: q.question_type,
        answer_options: q.answer_options,
        correct_answer: q.correct_answer,
        rationale: q.rationale,
      } as any,
      topic: {
        id: q.topic?.id || "",
        name: q.topic?.name || "",
        category_id: q.category?.id || "",
        weight_in_category: 0,
      } as any,
      status: "not_started",
      display_order: 0,
      is_saved: false,
    } as SessionQuestion;
  };

  // Handle question click from pool
  const handlePoolQuestionClick = (question: any) => {
    const sessionQuestion = transformPoolQuestion(question);
    setSelectedQuestion(sessionQuestion);
    setIsPopupOpen(true);
  };

  const handlePracticeTopic = async (
    topicId: string,
    topicName: string,
    totalQuestions: number
  ) => {
    try {
      setCreatingTopicSessionId(topicId);
      const drillSession = await api.createDrillSession([topicId], totalQuestions);
      toast.success(`Created ${topicName} practice with ${drillSession.num_questions} questions`);
      router.push(
        buildPracticeSessionPath(
          drillSession.session_id,
          "/dashboard/question-pool"
        )
      );
    } catch (error) {
      console.error("Failed to create topic practice session:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create topic practice session";
      toast.error(errorMessage);
    } finally {
      setCreatingTopicSessionId(null);
    }
  };

  // Transform SavedQuestion to SessionQuestion format
  const transformSavedToSessionQuestion = (
    item: SavedQuestion
  ): SessionQuestion | null => {
    if (!item.question || !item.topic) {
      return null;
    }
    return {
      session_question_id: item.session_question_id,
      question: item.question as any,
      topic: {
        id: item.topic.id,
        name: item.topic.name,
        category_id: item.topic.category || "",
        weight_in_category: 0,
      } as any,
      status:
        item.user_answer && item.user_answer.length > 0
          ? "answered"
          : "not_started",
      display_order: 0,
      user_answer: item.user_answer,
      is_saved: true,
    } as SessionQuestion;
  };

  // Transform WrongAnswer to SessionQuestion format
  const transformWrongToSessionQuestion = (
    item: WrongAnswer
  ): SessionQuestion | null => {
    if (!item.question || !item.topic) {
      return null;
    }
    return {
      session_question_id: item.session_question_id,
      question: item.question as any,
      topic: {
        id: item.topic.id,
        name: item.topic.name,
        category_id: item.topic.category || "",
        weight_in_category: 0,
      } as any,
      status:
        item.user_answer && item.user_answer.length > 0
          ? "answered"
          : "not_started",
      display_order: 0,
      user_answer: item.user_answer,
      is_saved: false,
    } as SessionQuestion;
  };

  const handleSavedQuestionClick = (item: SavedQuestion) => {
    const sessionQuestion = transformSavedToSessionQuestion(item);
    if (sessionQuestion) {
      setSelectedQuestion(sessionQuestion);
      setIsPopupOpen(true);
    }
  };

  const handleWrongQuestionClick = (item: WrongAnswer) => {
    const sessionQuestion = transformWrongToSessionQuestion(item);
    if (sessionQuestion) {
      setSelectedQuestion(sessionQuestion);
      setIsPopupOpen(true);
    }
  };

  // Deduplicate wrong answers by question_id
  const deduplicatedWrongAnswers = useMemo(() => {
    return wrongAnswers.reduce((acc, wrongAnswer) => {
      const questionId = wrongAnswer.question_id;
      const existing = acc.get(questionId);

      if (!existing) {
        acc.set(questionId, wrongAnswer);
      } else {
        const existingDate = existing.answered_at
          ? new Date(existing.answered_at).getTime()
          : 0;
        const currentDate = wrongAnswer.answered_at
          ? new Date(wrongAnswer.answered_at).getTime()
          : 0;

        if (currentDate > existingDate) {
          acc.set(questionId, wrongAnswer);
        }
      }

      return acc;
    }, new Map<string, WrongAnswer>());
  }, [wrongAnswers]);

  // Filter and sort saved questions
  const sortedSavedQuestions = useMemo(() => {
    let filtered = [...savedQuestions];

    if (timeRange !== "all" && filtered.length > 0) {
      const now = new Date().getTime();
      let daysAgo = 0;
      if (timeRange === "7") daysAgo = 7;
      else if (timeRange === "30") daysAgo = 30;
      else if (timeRange === "90") daysAgo = 90;

      const cutoffDate = now - daysAgo * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((savedQuestion) => {
        if (!savedQuestion.session?.created_at) return false;
        const savedDate = new Date(savedQuestion.session.created_at).getTime();
        return savedDate >= cutoffDate;
      });
    }

    if (categoryFilter !== "all" && filtered.length > 0) {
      filtered = filtered.filter((savedQuestion) => {
        const section = savedQuestion.topic?.section;
        if (categoryFilter === "math") {
          return section === "math";
        } else if (categoryFilter === "rw") {
          return section === "reading_writing";
        }
        return true;
      });
    }

    if (savedQuestionsSort === "recent") {
      return filtered.sort((a, b) => {
        const dateA = a.session?.created_at
          ? new Date(a.session.created_at).getTime()
          : 0;
        const dateB = b.session?.created_at
          ? new Date(b.session.created_at).getTime()
          : 0;
        return dateB - dateA;
      });
    } else if (savedQuestionsSort === "oldest") {
      return filtered.sort((a, b) => {
        const dateA = a.session?.created_at
          ? new Date(a.session.created_at).getTime()
          : 0;
        const dateB = b.session?.created_at
          ? new Date(b.session.created_at).getTime()
          : 0;
        return dateA - dateB;
      });
    } else if (savedQuestionsSort === "topic") {
      return filtered.sort((a, b) => {
        const topicA = a.topic?.name || "";
        const topicB = b.topic?.name || "";
        return topicA.localeCompare(topicB);
      });
    }
    return filtered;
  }, [savedQuestions, savedQuestionsSort, timeRange, categoryFilter]);

  // Filter and sort wrong answers
  const sortedWrongAnswers = useMemo(() => {
    let filtered = Array.from(deduplicatedWrongAnswers.values()).filter(
      (wrongAnswer) => !correctlyAnsweredIds.has(wrongAnswer.question_id)
    );

    if (timeRange !== "all" && filtered.length > 0) {
      const now = new Date().getTime();
      let daysAgo = 0;
      if (timeRange === "7") daysAgo = 7;
      else if (timeRange === "30") daysAgo = 30;
      else if (timeRange === "90") daysAgo = 90;

      const cutoffDate = now - daysAgo * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((wrongAnswer) => {
        if (!wrongAnswer.answered_at) return false;
        const answerDate = new Date(wrongAnswer.answered_at).getTime();
        return answerDate >= cutoffDate;
      });
    }

    if (categoryFilter !== "all" && filtered.length > 0) {
      filtered = filtered.filter((wrongAnswer) => {
        const section = wrongAnswer.topic?.section;
        if (categoryFilter === "math") {
          return section === "math";
        } else if (categoryFilter === "rw") {
          return section === "reading_writing";
        }
        return true;
      });
    }

    if (wrongAnswersSort === "recent") {
      return filtered.sort((a, b) => {
        const dateA = a.answered_at ? new Date(a.answered_at).getTime() : 0;
        const dateB = b.answered_at ? new Date(b.answered_at).getTime() : 0;
        return dateB - dateA;
      });
    } else if (wrongAnswersSort === "oldest") {
      return filtered.sort((a, b) => {
        const dateA = a.answered_at ? new Date(a.answered_at).getTime() : 0;
        const dateB = b.answered_at ? new Date(b.answered_at).getTime() : 0;
        return dateA - dateB;
      });
    } else if (wrongAnswersSort === "topic") {
      return filtered.sort((a, b) => {
        const topicA = a.topic?.name || "";
        const topicB = b.topic?.name || "";
        return topicA.localeCompare(topicB);
      });
    }
    return filtered;
  }, [
    deduplicatedWrongAnswers,
    correctlyAnsweredIds,
    wrongAnswersSort,
    timeRange,
    categoryFilter,
  ]);

  // Get difficulty badge color
  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "E":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 font-medium text-xs">
            Easy
          </Badge>
        );
      case "M":
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 font-medium text-xs">
            Medium
          </Badge>
        );
      case "H":
        return (
          <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-0 font-medium text-xs">
            Hard
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="flex justify-center">
        <div className="w-full max-w-6xl px-6 py-12 space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 w-fit">
                <Database className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                  Question Pool
                </span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                Question Pool
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Browse and practice from {totalQuestions.toLocaleString()}{" "}
                questions across all {course?.name ?? "SAT"} topics.
              </p>
            </div>
          </div>

          {/* Section Tabs & Filters */}
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Section Tabs */}
              <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl">
                <button
                  onClick={() => setActiveSection("all")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    activeSection === "all"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    All
                    <span className="text-xs text-muted-foreground">
                      ({totalQuestions})
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveSection("reading_writing")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    activeSection === "reading_writing"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <BookText className="w-4 h-4" />
                    Reading & Writing
                    <span className="text-xs text-muted-foreground">
                      ({sectionCounts.reading_writing})
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveSection("math")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    activeSection === "math"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Math
                    <span className="text-xs text-muted-foreground">
                      ({sectionCounts.math})
                    </span>
                  </span>
                </button>
              </div>

              {/* Difficulty Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                  {(["all", "E", "M", "H"] as const).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setDifficultyFilter(diff)}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                        difficultyFilter === diff
                          ? diff === "E"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : diff === "M"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : diff === "H"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                : "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {diff === "all"
                        ? "All"
                        : diff === "E"
                          ? "Easy"
                          : diff === "M"
                            ? "Medium"
                            : "Hard"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Topics Browser */}
          <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">
                Browse by Topic
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Select a topic to view and practice questions
              </p>
            </div>

            {loadingTopics ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No topics found</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredCategories.map((category) => (
                  <div key={category.categoryId} className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={cn(
                          "w-1.5 h-6 rounded-full",
                          category.section === "reading_writing"
                            ? "bg-rose-500"
                            : "bg-amber-500"
                        )}
                      />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        {category.categoryName}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {category.topics.reduce(
                          (acc, t) => acc + t.total_questions,
                          0
                        )}{" "}
                        Qs
                      </Badge>
                    </div>

                    <div className="space-y-2 ml-4">
                      {category.topics.map((topic) => (
                        <div key={topic.topic_id}>
                          {/* Topic Row */}
                          <button
                            onClick={() => toggleTopic(topic.topic_id)}
                            className={cn(
                              "w-full flex items-center justify-between p-4 rounded-xl transition-all",
                              expandedTopics.has(topic.topic_id)
                                ? "bg-primary/5 border border-primary/20"
                                : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              {expandedTopics.has(topic.topic_id) ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              )}
                              <span className="font-medium text-foreground">
                                {topic.topic_name}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Difficulty distribution */}
                              <div className="flex items-center gap-1">
                                {topic.easy_count > 0 && (
                                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                    {topic.easy_count}E
                                  </span>
                                )}
                                {topic.medium_count > 0 && (
                                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                    {topic.medium_count}M
                                  </span>
                                )}
                                {topic.hard_count > 0 && (
                                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                                    {topic.hard_count}H
                                  </span>
                                )}
                              </div>
                              <Badge
                                variant="outline"
                                className="text-xs font-semibold"
                              >
                                {topic.total_questions} Questions
                              </Badge>
                              <Button
                                type="button"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePracticeTopic(
                                    topic.topic_id,
                                    topic.topic_name,
                                    topic.total_questions
                                  );
                                }}
                                disabled={creatingTopicSessionId === topic.topic_id}
                                className="h-7 rounded-md border-transparent bg-[#866ffe] px-2.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#7b63fe] !text-white"
                              >
                                <Play className="mr-1 h-3 w-3 fill-current" />
                                {creatingTopicSessionId === topic.topic_id
                                  ? "Creating..."
                                  : "Practice"}
                              </Button>
                            </div>
                          </button>

                          {/* Expanded Questions */}
                          {expandedTopics.has(topic.topic_id) &&
                            selectedTopicId === topic.topic_id && (
                              <div className="mt-2 ml-8 space-y-2">
                                {loadingQuestions ? (
                                  <div className="space-y-2">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                      <Skeleton
                                        key={i}
                                        className="h-20 rounded-lg"
                                      />
                                    ))}
                                  </div>
                                ) : topicQuestions?.questions?.length === 0 ? (
                                  <p className="text-sm text-muted-foreground py-4">
                                    No questions match your filters
                                  </p>
                                ) : (
                                  topicQuestions?.questions
                                    ?.slice(0, 10)
                                    .map((q) => (
                                      <button
                                        key={q.id}
                                        onClick={() =>
                                          handlePoolQuestionClick(q)
                                        }
                                        className="w-full text-left p-4 rounded-lg bg-background border border-border hover:border-primary/50 hover:shadow-sm transition-all group"
                                      >
                                        <div className="flex items-start justify-between gap-4">
                                          <div className="flex-1 min-w-0">
                                            <div
                                              className="text-sm text-foreground line-clamp-2 prose prose-sm dark:prose-invert max-w-none"
                                              dangerouslySetInnerHTML={{
                                                __html: processQuestionText(
                                                  q.stem
                                                ),
                                              }}
                                            />
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            {getDifficultyBadge(q.difficulty)}
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              {q.question_type === "mc"
                                                ? "Multiple Choice"
                                                : "Free Response"}
                                            </Badge>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </div>
                                        </div>
                                      </button>
                                    ))
                                )}
                                {topicQuestions?.questions &&
                                  topicQuestions.questions.length > 10 && (
                                    <p className="text-sm text-muted-foreground text-center py-2">
                                      +{topicQuestions.questions.length - 10}{" "}
                                      more questions
                                    </p>
                                  )}
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Saved Questions Section (Collapsible) */}
          <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
            <button
              onClick={() => setSavedCollapsed(!savedCollapsed)}
              className="w-full p-6 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Bookmark className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-bold text-foreground">
                    Saved Questions
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {sortedSavedQuestions.length} bookmarked for review
                  </p>
                </div>
              </div>
              {savedCollapsed ? (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </button>

            {!savedCollapsed && (
              <div className="p-6 pt-0 space-y-4">
                {loadingSavedQuestions ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 rounded-xl" />
                    ))}
                  </div>
                ) : sortedSavedQuestions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No saved questions yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedSavedQuestions
                      .slice(0, visibleSavedQuestionsCount)
                      .map((savedQuestion: any) => (
                        <button
                          key={savedQuestion.session_question_id}
                          onClick={() =>
                            handleSavedQuestionClick(savedQuestion)
                          }
                          className="w-full text-left p-4 rounded-xl bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-primary/30 transition-all"
                        >
                          <div
                            className="text-sm font-medium text-foreground line-clamp-2 prose prose-sm dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: processQuestionText(
                                savedQuestion.question?.stem
                              ),
                            }}
                          />
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span className="px-2 py-0.5 bg-muted rounded">
                              {formatTopicName(
                                savedQuestion.topic?.name || "Unknown"
                              )}
                            </span>
                          </div>
                        </button>
                      ))}
                    {sortedSavedQuestions.length > visibleSavedQuestionsCount && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setVisibleSavedQuestionsCount((prev) => prev + 5)
                        }
                        className="w-full"
                      >
                        Show more
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Missed Questions Section (Collapsible) */}
          <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
            <button
              onClick={() => setMissedCollapsed(!missedCollapsed)}
              className="w-full p-6 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <BookOpen className="w-5 h-5 text-destructive" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-bold text-foreground">
                    Missed Questions
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {sortedWrongAnswers.length} questions to review
                  </p>
                </div>
              </div>
              {missedCollapsed ? (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </button>

            {!missedCollapsed && (
              <div className="p-6 pt-0 space-y-4">
                {loadingWrongAnswers ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 rounded-xl" />
                    ))}
                  </div>
                ) : sortedWrongAnswers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No missed questions</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedWrongAnswers
                      .slice(0, visibleWrongAnswersCount)
                      .map((wrongAnswer) => (
                        <button
                          key={wrongAnswer.question_id}
                          onClick={() => handleWrongQuestionClick(wrongAnswer)}
                          className="w-full text-left p-4 rounded-xl bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-primary/30 transition-all"
                        >
                          <div
                            className="text-sm font-medium text-foreground line-clamp-2 prose prose-sm dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: processQuestionText(
                                wrongAnswer.question?.stem
                              ),
                            }}
                          />
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span className="px-2 py-0.5 bg-muted rounded">
                              {formatTopicName(
                                wrongAnswer.topic?.name || "Unknown"
                              )}
                            </span>
                          </div>
                        </button>
                      ))}
                    {sortedWrongAnswers.length > visibleWrongAnswersCount && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setVisibleWrongAnswersCount((prev) => prev + 5)
                        }
                        className="w-full"
                      >
                        Show more
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Question Practice Popup */}
      {selectedQuestion && (
        <QuestionPracticePopup
          open={isPopupOpen}
          onOpenChange={setIsPopupOpen}
          question={selectedQuestion}
          onComplete={(isCorrect) => {
            if (isCorrect && selectedQuestion) {
              const questionId = selectedQuestion.question?.id;
              if (questionId) {
                setCorrectlyAnsweredIds((prev) => {
                  const newSet = new Set(prev);
                  newSet.add(questionId);
                  return newSet;
                });
              }
            }
          }}
        />
      )}
    </div>
  );
}

export default function QuestionPoolPage() {
  return (
    <ProtectedRoute>
      <QuestionPoolContent />
      <OnboardingModal pageId="question-pool" steps={ONBOARDING_CONTENT["question-pool"]} />
    </ProtectedRoute>
  );
}
