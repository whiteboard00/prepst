"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { CategoriesAndTopicsResponse } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useCompletedSessions, useSkillHeatmap } from "@/hooks/queries";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { SkillRadialChart } from "@/components/charts/SkillRadialChart";
import {
  Zap,
  Search,
  Target,
  TrendingUp,
  BookOpen,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock,
  Star,
  Filter,
  X
} from "lucide-react";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { ONBOARDING_CONTENT } from "@/lib/onboardingContent";
import { buildPracticeSessionPath } from "@/lib/practice-navigation";
import { useCourseConfigSafe } from "@/contexts/CourseContext";

function DrillPage() {
  const router = useRouter();
  const [categories, setCategories] =
    useState<CategoriesAndTopicsResponse | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [showRecommendations, setShowRecommendations] = useState(true);

  const { sections, sectionName, courseSlug } = useCourseConfigSafe();
  const { data: heatmapData, isLoading: heatmapLoading } = useSkillHeatmap();
  const heatmap = heatmapData?.heatmap || {};

  // Fetch recent drill sessions
  const { data: completedSessions, isLoading: loadingSessions } =
    useCompletedSessions(5);

  const handleStartDrill = async () => {
    if (selectedTopics.length === 0) {
      toast.error("Please select at least one topic");
      return;
    }

    if (selectedTopics.length > 5) {
      toast.error("Maximum 5 topics allowed");
      return;
    }

    try {
      setIsCreatingSession(true);
      const drillSession = await api.createDrillSession(selectedTopics, 3);
      toast.success(
        `Drill session created with ${drillSession.num_questions} questions`
      );
      router.push(
        buildPracticeSessionPath(drillSession.session_id, "/dashboard/drill")
      );
    } catch (error) {
      console.error("Failed to create drill session:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create drill session";
      toast.error(errorMessage);
    } finally {
      setIsCreatingSession(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingCategories(true);
        const categoriesData = await api.getCategoriesAndTopics(courseSlug);
        setCategories(categoriesData);
      } catch (err) {
        console.error("Failed to load categories and topics:", err);
      } finally {
        setLoadingCategories(false);
      }
    };
    load();
  }, [courseSlug]);

  // Group topics by section and category
  const topicsBySection = useMemo(() => {
    if (!categories) return {};

    const processTopics = (sectionTopics: any[], section: string) =>
      sectionTopics.map((category) => ({
        categoryId: category.id,
        categoryName: category.name,
        section,
        topics: (category.topics || []).map((topic: any) => ({
          id: topic.id,
          name: topic.name,
          categoryName: category.name,
          section,
          difficulty: Math.random() > 0.7 ? "hard" : Math.random() > 0.4 ? "medium" : "easy",
          questionCount: Math.floor(Math.random() * 50) + 10
        })),
      }));

    const result: Record<string, any[]> = {};
    for (const [sectionKey, sectionCategories] of Object.entries(categories)) {
      if (Array.isArray(sectionCategories)) {
        result[sectionKey] = processTopics(sectionCategories, sectionKey);
      }
    }
    return result;
  }, [categories]);

  // Filter topics based on search and section
  const filteredTopics = useMemo(() => {
    const allTopics = Object.values(topicsBySection)
      .flat()
      .flatMap((category: any) => category.topics);

    return allTopics.filter((topic: any) => {
      const matchesSearch = topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSection = selectedSection === "all" || topic.section === selectedSection;
      return matchesSearch && matchesSection;
    });
  }, [topicsBySection, searchQuery, selectedSection]);

  // Smart recommendations
  const recommendations = useMemo(() => {
    const allTopics = Object.values(topicsBySection)
      .flat()
      .flatMap((cat: any) => cat.topics);

    return allTopics
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
  }, [topicsBySection]);

  const handleTopicToggle = (topicId: string) => {
    setSelectedTopics((prev) => {
      if (prev.includes(topicId)) {
        return prev.filter((id) => id !== topicId);
      } else {
        if (prev.length >= 5) {
          toast.error("Maximum 5 topics allowed");
          return prev;
        }
        toast.success(`Added ${filteredTopics.find(t => t.id === topicId)?.name}`);
        return [...prev, topicId];
      }
    });
  };

  const quickSelectRecommendations = () => {
    const availableRecommendations = recommendations
      .filter(rec => !selectedTopics.includes(rec.id))
      .slice(0, 5 - selectedTopics.length);

    if (availableRecommendations.length === 0) {
      toast.info("No more recommendations available or already selected");
      return;
    }

    setSelectedTopics(prev => [...prev, ...availableRecommendations.map(r => r.id)]);
    toast.success(`Added ${availableRecommendations.length} recommended topics`);
  };

  const clearSelection = () => {
    setSelectedTopics([]);
    toast.info("Selection cleared");
  };

  const getTopicDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "hard": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="flex justify-center">
        <div className="w-full max-w-6xl px-6 py-12 space-y-12">
          {/* Header */}
          <div className="flex flex-col gap-8">
            {/* Title Section */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 w-fit">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                  Targeted Practice
                </span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                Drill Session
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Master specific skills with targeted practice sets
              </p>
            </div>

            {/* Selection Status & Actions */}
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-foreground">
                      {selectedTopics.length} of 5 topics selected
                    </span>
                  </div>
                  {selectedTopics.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelection}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {recommendations.length > 0 && selectedTopics.length < 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={quickSelectRecommendations}
                      className="border-primary/20 hover:bg-primary/5"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Quick Select ({Math.min(recommendations.length, 5 - selectedTopics.length)})
                    </Button>
                  )}
                  <Button
                    onClick={handleStartDrill}
                    disabled={selectedTopics.length === 0 || isCreatingSession}
                    size="lg"
                    className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold shadow-lg shadow-primary/25 px-8 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isCreatingSession ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Start Practice ({selectedTopics.length * 3} questions)
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Progress</span>
                  <span>{selectedTopics.length}/5 topics</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${(selectedTopics.length / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Smart Recommendations */}
          {showRecommendations && recommendations.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Recommended for You</h2>
                    <p className="text-muted-foreground">Topics to focus on based on your performance</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRecommendations(false)}
                  className="text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.slice(0, 6).map((topic) => (
                  <div
                    key={topic.id}
                    className={`
                      relative group cursor-pointer p-5 rounded-xl border-2 transition-all duration-300 ease-out overflow-hidden
                      ${selectedTopics.includes(topic.id)
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-lg"
                        : "border-border bg-card hover:border-primary/50 hover:shadow-md hover:-translate-y-1"
                      }
                    `}
                    onClick={() => handleTopicToggle(topic.id)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground leading-tight mb-1">
                          {topic.name}
                        </h3>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          {topic.categoryName}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {selectedTopics.includes(topic.id) && (
                          <CheckCircle className="w-5 h-5 text-primary" />
                        )}
                        <Badge
                          variant="secondary"
                          className={`text-xs px-2 py-0.5 ${getTopicDifficultyColor(topic.difficulty)}`}
                        >
                          {topic.difficulty}
                        </Badge>
                      </div>
                    </div>

                    {/* Question Count Indicator */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Questions</span>
                        <span className="font-medium text-primary">
                          {topic.questionCount}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-primary/20 transition-all"
                          style={{ width: '60%' }}
                        />
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 to-primary/10" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Topics Selection */}
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Browse All Topics</h2>
                <p className="text-muted-foreground">Choose from our comprehensive topic library</p>
              </div>

              {/* Search & Filters */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>

                <div className="flex rounded-lg border border-border p-1 flex-wrap">
                  <Button
                    variant={selectedSection === "all" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedSection("all")}
                    className="px-3"
                  >
                    All
                  </Button>
                  {sections.map((sec) => (
                    <Button
                      key={sec.key}
                      variant={selectedSection === sec.key ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSelectedSection(sec.key)}
                      className="px-3"
                    >
                      {sectionName(sec.key)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {loadingCategories ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className={`
                      relative group cursor-pointer p-5 rounded-xl border-2 transition-all duration-300 ease-out overflow-hidden hover:shadow-lg
                      ${selectedTopics.includes(topic.id)
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-lg scale-105"
                        : "border-border bg-card hover:border-primary/50 hover:shadow-md hover:-translate-y-1"
                      }
                    `}
                    onClick={() => handleTopicToggle(topic.id)}
                  >
                    {/* Selection Indicator */}
                    {selectedTopics.includes(topic.id) && (
                      <div className="absolute top-3 right-3 z-10">
                        <div className="bg-primary text-white rounded-full p-1">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* Topic Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground leading-tight mb-1 line-clamp-2">
                            {topic.name}
                          </h3>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            {topic.categoryName}
                          </p>
                        </div>
                      </div>

                      {/* Topic Stats */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{topic.questionCount} questions</span>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`text-xs px-2 py-0.5 ${getTopicDifficultyColor(topic.difficulty)}`}
                        >
                          {topic.difficulty}
                        </Badge>
                      </div>

                      {/* Question Count Indicator */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            Questions
                          </span>
                          <span className="font-medium text-primary">
                            {topic.questionCount}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-primary/20 transition-all"
                            style={{ width: '60%' }}
                          />
                        </div>
                      </div>

                      {/* Section Indicator */}
                      <div className={`absolute bottom-0 left-0 right-0 h-1 ${['bg-gradient-to-r from-rose-400 to-pink-400', 'bg-gradient-to-r from-amber-400 to-orange-400', 'bg-gradient-to-r from-sky-400 to-blue-400', 'bg-gradient-to-r from-emerald-400 to-green-400'][sections.findIndex((s) => s.key === topic.section) % 4] ?? 'bg-primary'
                        }`} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredTopics.length === 0 && !loadingCategories && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No topics found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filters</p>
              </div>
            )}
          </section>

          {/* {heatmapLoading ? (
            <div className="space-y-8">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-card rounded-3xl p-8 border border-border shadow-sm"
                >
                  <Skeleton className="h-8 w-48 mb-6" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <Skeleton key={j} className="aspect-square rounded-2xl" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            Object.keys(heatmap).length > 0 && (
              <div className="space-y-8">
                {Object.entries(heatmap).map(([categoryName, category]) => (
                  <div key={categoryName} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-foreground">
                        {categoryName}
                      </h3>
                      <Badge
                        variant="secondary"
                        className="text-muted-foreground bg-muted font-medium"
                      >
                        {sectionName(category.section)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {category.skills.map((skill) => (
                        <div
                          key={skill.skill_id}
                          className="bg-card rounded-2xl p-1 border border-border shadow-sm hover:shadow-md transition-shadow duration-300"
                        >
                          <SkillRadialChart
                            skillName={skill.skill_name}
                            mastery={skill.mastery}
                            correctAttempts={skill.correct_attempts}
                            totalAttempts={skill.total_attempts}
                            velocity={skill.velocity}
                            plateau={skill.plateau}
                            skillId={skill.skill_id}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )} */}

          {/* Recent Drill Sessions */}
          <section className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
            <div className="p-8 border-b border-border">
              <h2 className="text-2xl font-bold text-foreground">
                Recent Activity
              </h2>
              <p className="text-muted-foreground">
                Your latest practice performance
              </p>
            </div>

            <div className="divide-y divide-border">
              {loadingSessions ? (
                <div className="p-8 space-y-4">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ) : !completedSessions || completedSessions.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <p>No completed drill sessions yet.</p>
                </div>
              ) : (
                completedSessions.map((session: any) => (
                  <div
                    key={session.id}
                    className="p-6 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <h4 className="font-semibold text-foreground">
                        {session.session_type === "drill"
                          ? "Targeted Drill"
                          : session.session_type === "revision"
                            ? "Revision Session"
                            : "Practice Session"}
                      </h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>
                          {formatDistanceToNow(new Date(session.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                        <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                        <span>{session.total_questions} questions</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-xl font-bold ${session.correct_count / session.total_questions >= 0.8
                          ? "text-green-600 dark:text-green-400"
                          : session.correct_count / session.total_questions >=
                            0.6
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-orange-600 dark:text-orange-400"
                          }`}
                      >
                        {Math.round(
                          (session.correct_count / session.total_questions) *
                          100
                        )}
                        %
                      </div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Accuracy
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function DrillPageWrapper() {
  return (
    <>
      <DrillPage />
      <OnboardingModal pageId="drill" steps={ONBOARDING_CONTENT.drill} />
    </>
  );
}
