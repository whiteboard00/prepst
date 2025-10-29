"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RotateCcw,
  Clock,
  Target,
  TrendingUp,
  AlertCircle,
  BookOpen,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { WrongAnswer, CategoriesAndTopicsResponse } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { CompletedSessionsCard } from "@/components/revision/CompletedSessionsCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function RevisionPage() {
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
  const [loadingWrongAnswers, setLoadingWrongAnswers] = useState(true);
  const [categories, setCategories] =
    useState<CategoriesAndTopicsResponse | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Filtering and pagination state
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [debugData, setDebugData] = useState<any>(null);

  // Safely strip HTML. If stem is null/undefined, show a fallback to avoid runtime errors
  const stripHtml = (
    html?: string | null,
    fallback: string = "Question text unavailable"
  ) => (typeof html === "string" ? html.replace(/<[^>]*>/g, "") : fallback);

  // Safely join an array. If array is null/undefined, show a fallback to avoid runtime errors
  const joinArray = (arr?: string[] | null, fallback: string = "No answer") =>
    Array.isArray(arr) && arr.length > 0 ? arr.join(", ") : fallback;

  // Filter wrong answers based on search and filters
  const filteredWrongAnswers = wrongAnswers.filter((answer) => {
    const matchesSearch =
      searchTerm === "" ||
      stripHtml(answer.question?.stem)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      answer.topic.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDifficulty =
      difficultyFilter === "all" ||
      answer.question?.difficulty === difficultyFilter;

    const matchesTopic =
      topicFilter === "all" || answer.topic.id === topicFilter;

    return matchesSearch && matchesDifficulty && matchesTopic;
  });

  // Get unique topics for filter dropdown
  const uniqueTopics = Array.from(
    new Set(wrongAnswers.map((answer) => answer.topic.id))
  ).map((topicId) => {
    const answer = wrongAnswers.find((a) => a.topic.id === topicId);
    return { id: topicId, name: answer?.topic.name || "Unknown" };
  });

  // Pagination
  const totalPages = Math.ceil(filteredWrongAnswers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAnswers = filteredWrongAnswers.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, difficultyFilter, topicFilter]);

  // Fetch wrong answers and categories on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingWrongAnswers(true);
        setLoadingCategories(true);

        // Fetch both wrong answers and categories in parallel
        const [wrongAnswersData, categoriesData] = await Promise.all([
          api.getWrongAnswers(20), // Get last 20 wrong answers
          api.getCategoriesAndTopics(),
        ]);

        // Debug: Log the actual data structure
        console.log("Wrong answers data:", wrongAnswersData);
        console.log("Sample wrong answer:", wrongAnswersData[0]);
        if (wrongAnswersData[0]) {
          console.log("Question data:", wrongAnswersData[0].question);
          console.log("User answer:", wrongAnswersData[0].user_answer);
          console.log(
            "Correct answer:",
            wrongAnswersData[0].question?.correct_answer
          );
        }

        setWrongAnswers(wrongAnswersData);
        setCategories(categoriesData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoadingWrongAnswers(false);
        setLoadingCategories(false);
      }
    };

    fetchData();
  }, []);

  // Generate revision topics from real categories
  const revisionTopics = categories
    ? [
        ...(Array.isArray(categories.math)
          ? categories.math.map((category: any) => ({
              id: category.id,
              name: category.name,
              difficulty: "Medium", // Default difficulty for now
              lastReviewed: "Never", // Could be enhanced with real data
              masteryLevel: 0, // Could be enhanced with real mastery data
              questionsCount: category.topics?.length || 0,
              section: "math",
            }))
          : []),
        ...(Array.isArray(categories.reading_writing)
          ? categories.reading_writing.map((category: any) => ({
              id: category.id,
              name: category.name,
              difficulty: "Medium", // Default difficulty for now
              lastReviewed: "Never", // Could be enhanced with real data
              masteryLevel: 0, // Could be enhanced with real mastery data
              questionsCount: category.topics?.length || 0,
              section: "reading_writing",
            }))
          : []),
      ]
    : [];

  const handleTopicToggle = (topicId: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleStartRevision = () => {
    // TODO: Implement revision session start logic
    console.log("Starting revision with topics:", selectedTopics);
  };

  const handleDebugData = async () => {
    try {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        }/api/practice-sessions/debug-session-questions`,
        {
          headers: {
            Authorization: `Bearer ${
              (
                await supabase.auth.getSession()
              ).data.session?.access_token
            }`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      setDebugData(data);
      console.log("Debug data:", data);
    } catch (error) {
      console.error("Debug error:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Revision Sessions
          </h1>
          <p className="text-gray-600 mt-2">
            Review and reinforce your knowledge with targeted practice
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleDebugData}
            variant="outline"
            className="text-sm"
          >
            Debug Data
          </Button>
          <Button
            onClick={handleStartRevision}
            disabled={selectedTopics.length === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Start Revision
          </Button>
        </div>
      </div>

      {/* Completed Sessions Card */}
      {loadingWrongAnswers || loadingCategories ? (
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-40 mb-3" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-60 mb-2" />
              <Skeleton className="h-4 w-96" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-5 w-48 mb-3" />
                      <Skeleton className="h-2 w-full mb-2" />
                      <Skeleton className="h-2 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <CompletedSessionsCard />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Categories Available
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingCategories ? "..." : revisionTopics.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for revision
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Math Categories
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingCategories
                ? "..."
                : Array.isArray(categories?.math)
                ? categories.math.length
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">Math topics</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Reading/Writing
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingCategories
                ? "..."
                : Array.isArray(categories?.reading_writing)
                ? categories.reading_writing.length
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">RW categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Topics Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Categories for Revision</CardTitle>
          <CardDescription>
            Choose the categories you want to review. You can select multiple
            categories for a comprehensive revision session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCategories ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-5 w-48 mb-3" />
                    <Skeleton className="h-2 w-full mb-2" />
                    <Skeleton className="h-2 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {revisionTopics.map((topic) => (
                <Card
                  key={topic.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedTopics.includes(topic.id)
                      ? "ring-2 ring-purple-500 bg-purple-50"
                      : "hover:shadow-md"
                  }`}
                  onClick={() => handleTopicToggle(topic.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">
                        {topic.name}
                      </h3>
                      <div className="flex gap-2">
                        <Badge
                          className={
                            topic.section === "math"
                              ? "bg-[#FAC710] text-black hover:bg-[#FAC710]/90"
                              : "bg-[#FD87DC] text-black hover:bg-[#FD87DC]/90"
                          }
                        >
                          {topic.section === "math"
                            ? "Math"
                            : "Reading/Writing"}
                        </Badge>
                        <Badge
                          variant={
                            topic.difficulty === "Easy"
                              ? "default"
                              : topic.difficulty === "Medium"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {topic.difficulty}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Topics Available</span>
                        <span className="font-medium">
                          {topic.questionsCount}
                        </span>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            topic.section === "math"
                              ? "bg-[#FAC710]"
                              : "bg-[#FD87DC]"
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              (topic.questionsCount / 10) * 100
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Last reviewed: {topic.lastReviewed}</span>
                        <span>{topic.questionsCount} topics</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Revision Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Revision Sessions</CardTitle>
          <CardDescription>
            Your recent revision activity and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium">
                    Algebra & Advanced Math Review
                  </h4>
                  <p className="text-sm text-gray-500">
                    2 days ago • 25 questions
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-green-600">85%</div>
                <p className="text-sm text-gray-500">Accuracy</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium">Craft and Structure Practice</h4>
                  <p className="text-sm text-gray-500">
                    1 week ago • 18 questions
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-blue-600">72%</div>
                <p className="text-sm text-gray-500">Accuracy</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Section */}
      {debugData && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
              {JSON.stringify(debugData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Wrong Answers Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Questions You Got Wrong
                {filteredWrongAnswers.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filteredWrongAnswers.length} questions
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Review questions you answered incorrectly to improve your
                understanding
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingWrongAnswers ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <Skeleton className="h-5 w-40 mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-3" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : wrongAnswers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Wrong Answers Yet
              </h3>
              <p className="text-gray-500">
                Start practicing to see questions you need to review here.
              </p>
            </div>
          ) : (
            <>
              {/* Search and Filters */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search questions or topics..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={difficultyFilter}
                      onValueChange={setDifficultyFilter}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="E">Easy</SelectItem>
                        <SelectItem value="M">Medium</SelectItem>
                        <SelectItem value="H">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={topicFilter} onValueChange={setTopicFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Topic" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Topics</SelectItem>
                        {uniqueTopics.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id}>
                            {topic.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Results */}
              {filteredWrongAnswers.length === 0 ? (
                <div className="text-center py-8">
                  <Filter className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">
                    No questions match your current filters.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {paginatedAnswers.map((wrongAnswer) => (
                      <div
                        key={wrongAnswer.session_question_id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-gray-900">
                                {wrongAnswer.topic.name}
                              </h4>
                              <Badge
                                variant={
                                  wrongAnswer.question?.difficulty === "E"
                                    ? "default"
                                    : wrongAnswer.question?.difficulty === "M"
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {wrongAnswer.question?.difficulty === "E"
                                  ? "Easy"
                                  : wrongAnswer.question?.difficulty === "M"
                                  ? "Medium"
                                  : "Hard"}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 mb-3">
                              {wrongAnswer.topic.category} •{" "}
                              {wrongAnswer.topic.section}
                            </p>
                            <div className="text-sm text-gray-700 mb-4 p-3 bg-gray-50 rounded border-l-4 border-red-200">
                              <strong>Question:</strong>{" "}
                              {stripHtml(wrongAnswer.question?.stem)}
                              {!wrongAnswer.question?.stem && (
                                <span className="text-red-500 text-xs block mt-1">
                                  Debug: Question data missing -{" "}
                                  {JSON.stringify(wrongAnswer.question)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="p-3 bg-red-50 rounded border-l-4 border-red-300">
                            <span className="font-medium text-gray-600 block mb-1">
                              Your Answer:
                            </span>
                            <div className="text-red-700 font-medium">
                              {wrongAnswer.user_answer?.join(", ") ||
                                "No answer"}
                            </div>
                          </div>
                          <div className="p-3 bg-green-50 rounded border-l-4 border-green-300">
                            <span className="font-medium text-gray-600 block mb-1">
                              Correct Answer:
                            </span>
                            <div className="text-green-700 font-medium">
                              {joinArray(wrongAnswer.question?.correct_answer)}
                            </div>
                          </div>
                        </div>

                        {wrongAnswer.question?.rationale && (
                          <div className="mt-4 p-3 bg-blue-50 rounded border-l-4 border-blue-300">
                            <span className="font-medium text-gray-600 block mb-1">
                              Explanation:
                            </span>
                            <div className="text-sm text-gray-700">
                              {stripHtml(
                                wrongAnswer.question.rationale,
                                "No explanation available"
                              )}
                            </div>
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-4">
                            {wrongAnswer.confidence_score && (
                              <span>
                                <span className="font-medium">Confidence:</span>{" "}
                                {wrongAnswer.confidence_score}/5
                              </span>
                            )}
                            {wrongAnswer.time_spent_seconds && (
                              <span>
                                <span className="font-medium">Time:</span>{" "}
                                {wrongAnswer.time_spent_seconds}s
                              </span>
                            )}
                          </div>
                          <div>
                            Answered{" "}
                            {new Date(
                              wrongAnswer.answered_at ||
                                wrongAnswer.session.created_at
                            ).toLocaleDateString()}
                            {wrongAnswer.session.study_plan_name && (
                              <span>
                                {" "}
                                • {wrongAnswer.session.study_plan_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Showing {startIndex + 1} to{" "}
                        {Math.min(endIndex, filteredWrongAnswers.length)} of{" "}
                        {filteredWrongAnswers.length} questions
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                          }
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from(
                            { length: Math.min(5, totalPages) },
                            (_, i) => {
                              const page = i + 1;
                              return (
                                <Button
                                  key={page}
                                  variant={
                                    currentPage === page ? "default" : "outline"
                                  }
                                  size="sm"
                                  onClick={() => setCurrentPage(page)}
                                  className="w-8 h-8 p-0"
                                >
                                  {page}
                                </Button>
                              );
                            }
                          )}
                          {totalPages > 5 && (
                            <>
                              <span className="text-gray-400">...</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(totalPages)}
                                className="w-8 h-8 p-0"
                              >
                                {totalPages}
                              </Button>
                            </>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(prev + 1, totalPages)
                            )
                          }
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
