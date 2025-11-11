"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader } from "@/components/ui/loader";
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { PromptSuggestion } from "@/components/ui/prompt-suggestion";
import { Button } from "@/components/ui/button";
import { Video, ArrowUp, Square, Sparkles, Clock, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { config } from "@/lib/config";
import { toast } from "sonner";

const suggestionGroups = [
  {
    label: "Math Concepts",
    highlight: "Explain",
    items: [
      "Explain quadratic equations visually",
      "Show how derivatives work",
      "Visualize the Pythagorean theorem",
      "Demonstrate trigonometric functions",
    ],
  },
  {
    label: "Geometry",
    highlight: "Show",
    items: [
      "Show how to calculate area of a circle",
      "Visualize triangle properties",
      "Demonstrate parallel lines and angles",
      "Explain coordinate geometry",
    ],
  },
  {
    label: "Algebra",
    highlight: "Visualize",
    items: [
      "Visualize solving linear equations",
      "Show function transformations",
      "Demonstrate polynomial graphs",
      "Explain systems of equations",
    ],
  },
];

interface VideoItem {
  id: string;
  question: string;
  videoUrl: string;
  explanation?: string;
  createdAt: string;
}

const STORAGE_KEY = "visual-explanations-videos";

export default function VisualExplanationPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingQuestion, setGeneratingQuestion] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");

  // Load videos from backend and localStorage on mount
  useEffect(() => {
    const loadVideos = async () => {
      try {
        // Load from backend first
        const backendVideos = await api.listVisualExplanationVideos();
        
        // Convert backend videos to VideoItem format
        const backendVideoItems: VideoItem[] = backendVideos.map((v) => ({
          id: v.id,
          question: v.filename, // filename now contains the question text
          videoUrl: v.video_url.startsWith("http")
            ? v.video_url
            : `${config.apiUrl}${v.video_url}`,
          createdAt: v.created_at,
        }));

        // Load from localStorage
        let localStorageVideos: VideoItem[] = [];
        try {
          const savedVideos = localStorage.getItem(STORAGE_KEY);
          if (savedVideos) {
            localStorageVideos = JSON.parse(savedVideos);
          }
        } catch (e) {
          console.error("Failed to load from localStorage:", e);
        }

        // Merge videos, avoiding duplicates (by videoUrl)
        const videoMap = new Map<string, VideoItem>();
        
        // Add backend videos first (they're the source of truth)
        backendVideoItems.forEach((v) => {
          videoMap.set(v.videoUrl, v);
        });
        
        // Add localStorage videos that aren't already in backend
        localStorageVideos.forEach((v) => {
          if (!videoMap.has(v.videoUrl)) {
            videoMap.set(v.videoUrl, v);
          }
        });

        // Sort by creation date (newest first)
        const mergedVideos = Array.from(videoMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setVideos(mergedVideos);
      } catch (error) {
        console.error("Failed to load videos:", error);
        // Fallback to localStorage only
        try {
          const savedVideos = localStorage.getItem(STORAGE_KEY);
          if (savedVideos) {
            setVideos(JSON.parse(savedVideos));
          }
        } catch (e) {
          console.error("Failed to load from localStorage:", e);
        }
      }
    };

    loadVideos();
  }, []);

  // Save videos to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
    } catch (error) {
      console.error("Failed to save videos:", error);
    }
  }, [videos]);

  const handleGenerateVideo = async () => {
    if (!inputMessage.trim() || isGenerating) return;

    const question = inputMessage.trim();
    setInputMessage("");
    setIsGenerating(true);
    setGeneratingQuestion(question);
    setShowSuggestions(false);

    try {
      const response = await api.generateVisualExplanation({
        question: question,
        conversation_history: [],
      });

      if (response.video_url) {
        // Prepend API URL to video URL if it's a relative path
        const videoUrl = response.video_url.startsWith("http")
          ? response.video_url
          : `${config.apiUrl}${response.video_url}`;

        const newVideo: VideoItem = {
          id: Date.now().toString(),
          question: question,
          videoUrl: videoUrl,
          explanation: response.explanation,
          createdAt: new Date().toISOString(),
        };

        setVideos((prev) => [newVideo, ...prev]);
        toast.success("Video generated successfully!");
      } else {
        toast.error("Video generation failed. Please try again.");
      }
    } catch (error) {
      console.error("Visual explanation error:", error);
      toast.error("Failed to generate visual explanation. Please try again.");
    } finally {
      setIsGenerating(false);
      setGeneratingQuestion(null);
    }
  };

  const handleDeleteVideo = (videoId: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
    toast.success("Video deleted");
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    setShowSuggestions(false);
    setActiveCategory("");
  };

  const handlePromptInputValueChange = (value: string) => {
    setInputMessage(value);
    if (value.trim() === "") {
      setActiveCategory("");
    }
  };

  const activeCategoryData = suggestionGroups.find(
    (group) => group.label === activeCategory
  );

  const showCategorySuggestions = activeCategory !== "";

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Video className="w-8 h-8 text-purple-500" />
          Visual Explanation
        </h1>
        <p className="text-muted-foreground">
          Ask questions and get animated visual explanations powered by Manim
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Generation Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Input Card */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <PromptInput
                value={inputMessage}
                onValueChange={handlePromptInputValueChange}
                isLoading={isGenerating}
                onSubmit={handleGenerateVideo}
                className="w-full"
              >
                <PromptInputTextarea placeholder="Ask for a visual explanation..." />
                <PromptInputActions className="justify-end pt-2">
                  <PromptInputAction
                    tooltip={isGenerating ? "Generating..." : "Generate video"}
                  >
                    <Button
                      variant="default"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={handleGenerateVideo}
                      disabled={isGenerating || !inputMessage.trim()}
                    >
                      {isGenerating ? (
                        <Square className="size-5 fill-current" />
                      ) : (
                        <ArrowUp className="size-5" />
                      )}
                    </Button>
                  </PromptInputAction>
                </PromptInputActions>
              </PromptInput>

              {/* Suggestions */}
              {showSuggestions && !isGenerating && (
                <div className="mt-4 space-y-3">
                  <div className="relative flex w-full flex-wrap items-stretch justify-start gap-2">
                    {showCategorySuggestions ? (
                      <div className="flex w-full flex-col space-y-1">
                        {activeCategoryData?.items.map((suggestion) => (
                          <PromptSuggestion
                            key={suggestion}
                            highlight={activeCategoryData.highlight}
                            onClick={() => {
                              setInputMessage(suggestion);
                              setShowSuggestions(false);
                              setActiveCategory("");
                            }}
                          >
                            {suggestion}
                          </PromptSuggestion>
                        ))}
                      </div>
                    ) : (
                      <div className="relative flex w-full flex-wrap items-stretch justify-start gap-2">
                        {suggestionGroups.map((suggestion) => (
                          <PromptSuggestion
                            key={suggestion.label}
                            onClick={() => {
                              setActiveCategory(suggestion.label);
                              setInputMessage("");
                            }}
                            className="capitalize"
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            {suggestion.label}
                          </PromptSuggestion>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generating State */}
          {isGenerating && (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader variant="spinner" size="lg" />
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">Your video is being generated</h3>
                    <p className="text-sm text-muted-foreground">
                      {generatingQuestion}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This may take a minute or two...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Latest Video */}
          {!isGenerating && videos.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Latest Video
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">{videos[0].question}</h3>
                  {videos[0].explanation && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {videos[0].explanation}
                    </p>
                  )}
                  <div className="rounded-lg overflow-hidden bg-gray-100">
                    <video controls className="w-full" src={videos[0].videoUrl}>
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(videos[0].createdAt)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteVideo(videos[0].id)}
                      className="h-6 px-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Previous Videos Sidebar */}
        <div className="lg:col-span-1">
          <Card className="border-0 shadow-lg h-fit sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Previous Videos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {videos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No videos yet</p>
                  <p className="text-xs mt-1">Generate your first video above</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {videos.slice(1).map((video) => (
                    <div
                      key={video.id}
                      className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                    >
                      <h4 className="font-medium text-sm mb-2 line-clamp-2">
                        {video.question}
                      </h4>
                      <div className="rounded overflow-hidden bg-gray-100 mb-2">
                        <video
                          controls
                          className="w-full"
                          src={video.videoUrl}
                          preload="metadata"
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(video.createdAt)}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteVideo(video.id)}
                          className="h-6 px-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
