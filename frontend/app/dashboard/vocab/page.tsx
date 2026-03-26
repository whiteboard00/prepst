"use client";

import { useState, useMemo } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  BookMarked,
  Plus,
  Sparkles,
  Search,
  Trash2,
  Check,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Filter,
  Loader2,
} from "lucide-react";
import { useVocabulary } from "@/hooks/queries/useVocabulary";
import { usePopularVocab } from "@/hooks/queries/usePopularVocab";
import {
  useAddVocabManually,
  useAddVocabFromPopular,
  useUpdateVocab,
  useDeleteVocab,
} from "@/hooks/mutations/useVocabularyMutations";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { VocabularyWord, PopularVocabWord, VocabSource, DifficultyLevel } from "@/lib/types";
import { VocabCardModal } from "@/components/vocab/VocabCardModal";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { ONBOARDING_CONTENT } from "@/lib/onboardingContent";
import { useCourseConfigSafe } from "@/contexts/CourseContext";

type MasteredFilter = "mastered" | "not_mastered";

function VocabContent() {
  const { course } = useCourseConfigSafe();

  // State
  const [masteredFilter, setMasteredFilter] = useState<MasteredFilter>("not_mastered");
  const [searchQuery, setSearchQuery] = useState("");
  const [popularCollapsed, setPopularCollapsed] = useState(false);
  const [popularDifficulty, setPopularDifficulty] = useState<DifficultyLevel | undefined>();

  // Add word dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [newDefinition, setNewDefinition] = useState("");
  const [newExample, setNewExample] = useState("");

  // Modal state
  const [selectedWord, setSelectedWord] = useState<VocabularyWord | null>(null);

  // Queries
  const { data: vocabData, isLoading: loadingVocab } = useVocabulary({
    mastered: masteredFilter === "mastered",
    search: searchQuery || undefined,
    limit: 100,
  });

  const { data: popularData, isLoading: loadingPopular } = usePopularVocab({
    difficulty: popularDifficulty,
    limit: 30,
  });

  // Mutations
  const addManually = useAddVocabManually();
  const addFromPopular = useAddVocabFromPopular();
  const updateVocab = useUpdateVocab();
  const deleteVocab = useDeleteVocab();

  // Get user's vocabulary words (set for checking if popular word already added)
  const userWordSet = useMemo(() => {
    if (!vocabData?.words) return new Set<string>();
    return new Set(vocabData.words.map(w => w.word.toLowerCase()));
  }, [vocabData?.words]);

  // Handle add word manually
  const handleAddWord = () => {
    if (!newWord.trim() || !newDefinition.trim()) return;

    addManually.mutate({
      word: newWord.trim(),
      definition: newDefinition.trim(),
      example_usage: newExample.trim() || undefined,
    }, {
      onSuccess: () => {
        setAddDialogOpen(false);
        setNewWord("");
        setNewDefinition("");
        setNewExample("");
      }
    });
  };

  // Handle add from popular
  const handleAddFromPopular = (word: PopularVocabWord) => {
    addFromPopular.mutate({
      word: word.word,
      definition: word.definition,
      example_usage: word.example_usage || undefined,
    });
  };

  // Handle toggle mastered
  const handleToggleMastered = (word: VocabularyWord) => {
    updateVocab.mutate({
      wordId: word.id,
      data: { is_mastered: !word.is_mastered },
    });
  };

  // Handle delete word
  const handleDeleteWord = (wordId: string) => {
    deleteVocab.mutate(wordId);
  };

  // Get source badge
  const getSourceBadge = (source: VocabSource) => {
    switch (source) {
      case "practice_session":
        return (
          <Badge variant="secondary" className="text-xs">
            From Practice
          </Badge>
        );
      case "suggested":
        return (
          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
            {course?.name ?? "SAT"} Vocab
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            Manual
          </Badge>
        );
    }
  };

  // Get difficulty badge
  const getDifficultyBadge = (level: DifficultyLevel) => {
    switch (level) {
      case "E":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">
            Easy
          </Badge>
        );
      case "M":
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-xs">
            Medium
          </Badge>
        );
      case "H":
        return (
          <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-0 text-xs">
            Hard
          </Badge>
        );
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
                <BookMarked className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                  Vocabulary
                </span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                Vocabulary Bank
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Build your {course?.name ?? "SAT"} vocabulary by saving words from practice sessions or adding them manually.
              </p>
            </div>
          </div>

          {/* My Vocabulary Section */}
          <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">My Vocabulary</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {vocabData?.total || 0} words saved
                  </p>
                </div>

                {/* Add Word Button */}
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Word
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Vocabulary Word</DialogTitle>
                      <DialogDescription>
                        Add a word to your vocabulary bank with your own definition.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="word">Word</Label>
                        <Input
                          id="word"
                          placeholder="Enter a word..."
                          value={newWord}
                          onChange={(e) => setNewWord(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="definition">Definition</Label>
                        <Textarea
                          id="definition"
                          placeholder="Enter the definition..."
                          value={newDefinition}
                          onChange={(e) => setNewDefinition(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="example">Example Usage (optional)</Label>
                        <Textarea
                          id="example"
                          placeholder="Enter an example sentence..."
                          value={newExample}
                          onChange={(e) => setNewExample(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setAddDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddWord}
                        disabled={!newWord.trim() || !newDefinition.trim() || addManually.isPending}
                      >
                        {addManually.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Add Word
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search words..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Mastered Filter */}
                <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                  {(["not_mastered", "mastered"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setMasteredFilter(filter)}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                        masteredFilter === filter
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {filter === "mastered" ? "Mastered" : "Learning"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Vocabulary Cards */}
            <div className="p-6">
              {loadingVocab ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 rounded-xl" />
                  ))}
                </div>
              ) : !vocabData?.words || vocabData.words.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookMarked className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No vocabulary words yet</p>
                  <p className="text-sm mt-1">
                    Start building your vocabulary by saving words from practice sessions or adding them manually.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vocabData.words.map((word) => (
                    <div
                      key={word.id}
                      className={cn(
                        "p-4 rounded-xl border transition-all group cursor-pointer",
                        word.is_mastered
                          ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800"
                          : "bg-card border-border hover:border-primary/30 hover:shadow-md"
                      )}
                      onClick={() => setSelectedWord(word)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-lg font-bold text-foreground capitalize">
                          {word.word}
                        </h3>
                        <div className="flex items-center gap-1">
                          {getSourceBadge(word.source)}
                        </div>
                      </div>

                      <p className="text-sm text-foreground/80 mb-2 line-clamp-2">
                        {word.definition}
                      </p>

                      {word.example_usage && (
                        <p className="text-xs text-muted-foreground italic line-clamp-2 mb-3">
                          &ldquo;{word.example_usage}&rdquo;
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={word.is_mastered}
                            onCheckedChange={() => handleToggleMastered(word)}
                            id={`mastered-${word.id}`}
                          />
                          <label
                            htmlFor={`mastered-${word.id}`}
                            className="text-xs text-muted-foreground cursor-pointer"
                          >
                            Mastered
                          </label>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWord(word.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Popular SAT Words Section (Collapsible) */}
          <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
            <button
              onClick={() => setPopularCollapsed(!popularCollapsed)}
              className="w-full p-6 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-bold text-foreground">
                    Popular {course?.name ?? "SAT"} Words
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {popularData?.total || 0} curated vocabulary words
                  </p>
                </div>
              </div>
              {popularCollapsed ? (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </button>

            {!popularCollapsed && (
              <div className="p-6 pt-0 space-y-4">
                {/* Difficulty Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                    {([undefined, "E", "M", "H"] as const).map((diff) => (
                      <button
                        key={diff || "all"}
                        onClick={() => setPopularDifficulty(diff)}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                          popularDifficulty === diff
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
                        {diff === undefined
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

                {loadingPopular ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-32 rounded-xl" />
                    ))}
                  </div>
                ) : !popularData?.words || popularData.words.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No popular words found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {popularData.words.map((word) => {
                      const alreadyAdded = userWordSet.has(word.word.toLowerCase());

                      return (
                        <div
                          key={word.id}
                          className={cn(
                            "p-4 rounded-xl border transition-all",
                            alreadyAdded
                              ? "bg-muted/30 border-border opacity-60"
                              : "bg-card border-border hover:border-primary/30"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="text-lg font-bold text-foreground capitalize">
                              {word.word}
                            </h3>
                            {getDifficultyBadge(word.difficulty_level)}
                          </div>

                          <p className="text-sm text-foreground/80 mb-2 line-clamp-2">
                            {word.definition}
                          </p>

                          {word.example_usage && (
                            <p className="text-xs text-muted-foreground italic line-clamp-2 mb-3">
                              &ldquo;{word.example_usage}&rdquo;
                            </p>
                          )}

                          <Button
                            variant={alreadyAdded ? "secondary" : "outline"}
                            size="sm"
                            className="w-full mt-2"
                            disabled={alreadyAdded || addFromPopular.isPending}
                            onClick={() => handleAddFromPopular(word)}
                          >
                            {alreadyAdded ? (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Added
                              </>
                            ) : addFromPopular.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-1" />
                                Add to My Vocab
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vocab Card Modal */}
      {selectedWord && (
        <VocabCardModal
          word={selectedWord}
          isOpen={!!selectedWord}
          onClose={() => setSelectedWord(null)}
          getSourceBadge={getSourceBadge}
        />
      )}
    </div>
  );
}

export default function VocabPage() {
  return (
    <ProtectedRoute>
      <VocabContent />
      <OnboardingModal pageId="vocab" steps={ONBOARDING_CONTENT.vocab} />
    </ProtectedRoute>
  );
}
