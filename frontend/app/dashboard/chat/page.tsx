"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/ui/chat-container";
import { Markdown } from "@/components/ui/markdown";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ui/message";
import { Loader } from "@/components/ui/loader";
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  ArrowUp,
  Square,
  Sparkles,
  Zap,
  BookOpen,
  PenTool,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { ChatMessageAPI } from "@/lib/types";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { ONBOARDING_CONTENT } from "@/lib/onboardingContent";

const suggestionGroups = [
  {
    label: "Work on math",
    items: [
      "Walk me through a math question",
      "Create 5 algebra practice problems",
      "Explain this math concept step by step",
    ],
  },
  {
    label: "Improve English",
    items: [
      "Help me outline an essay",
      "Quiz me on reading comprehension",
      "Give me vocabulary practice",
    ],
  },
];

interface ChatMessage {
  id: string | number;
  content: string;
  sender: "user" | "ai";
  timestamp?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamContentRef = useRef("");
  const { isDarkMode } = useTheme();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load messages from local storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMessages = localStorage.getItem("peppa-chat-messages");
      if (savedMessages) {
        try {
          setMessages(JSON.parse(savedMessages));
        } catch (e) {
          console.error("Failed to parse chat messages", e);
        }
      }
    }
  }, []);

  // Save messages to local storage whenever they change
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (messages.length > 0) {
      localStorage.setItem("peppa-chat-messages", JSON.stringify(messages));
    } else {
      localStorage.removeItem("peppa-chat-messages");
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isStreaming) return;

    const generateUniqueId = () => {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    const userMessage: ChatMessage = {
      id: generateUniqueId(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    const newMessageId = generateUniqueId();
    setIsStreaming(true);
    streamContentRef.current = "";

    setMessages((prev) => [
      ...prev,
      {
        id: newMessageId,
        sender: "ai" as const,
        content: "",
        timestamp: new Date().toISOString(),
      },
    ]);

    try {
      const conversationHistory: ChatMessageAPI[] = messages.map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content,
        timestamp: msg.timestamp || new Date().toISOString(),
      }));

      await api.chatWithAI(
        {
          message: currentInput,
          conversation_history: conversationHistory,
        },
        (chunk: string) => {
          streamContentRef.current += chunk;
          const currentContent = streamContentRef.current;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === newMessageId
                ? { ...msg, content: currentContent }
                : msg
            )
          );
        }
      );
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to get AI response. Please try again.");
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessageId
            ? {
              ...msg,
              content:
                "Sorry, I'm having trouble responding right now. Please try again in a moment.",
            }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      streamContentRef.current = "";
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    // Optional: auto-send or just fill input
    // handleSendMessage();
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handlePromptInputValueChange = (value: string) => {
    setInputMessage(value);
  };

  const handleClearChat = () => {
    setMessages([]);
    setInputMessage("");
    if (typeof window !== "undefined") {
      localStorage.removeItem("peppa-chat-messages");
    }
  };

  useEffect(() => {
    const chatContainer = document.querySelector(".chat-scroll-area");
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [messages, isStreaming]);

  return (
    <>
      <div className="relative flex min-h-screen flex-col bg-background overflow-x-hidden">
        {/* Chat Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-border/40 bg-background px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl">
              <span className="text-xl font-bold text-foreground">P</span>
            </div>
            <div>
              <h1 className="font-semibold text-foreground">Peppa AI</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Online & Ready
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleClearChat}
            >
              <Trash2 className="h-4 w-4" />
              Delete chat
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <ChatContainerRoot className="chat-scroll-area relative z-10 flex-1 max-h-[calc(100vh-200px)] overflow-y-auto scroll-smooth pb-4">
          <ChatContainerContent className="mx-auto w-full max-w-4xl px-4 py-8">
            <AnimatePresence initial={false} mode="popLayout">
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col items-center justify-center space-y-8 py-12 text-center"
                >
                  <div className="space-y-4">
                    <h2 className="text-4xl font-bold tracking-tight sm:text-5xl bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent pb-2">
                      How can I help you today?
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                      I can help you study, practice problems, explain complex
                      topics, or just chat about your learning goals.
                    </p>
                  </div>

                  <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
                    {suggestionGroups.map((group, index) => (
                      <motion.div
                        key={group.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/80 p-4 text-left transition-all hover:border-foreground/15 hover:shadow-md hover:shadow-foreground/5"
                      >
                        <h3 className="mb-2 text-base font-semibold text-foreground">
                          {group.label}
                        </h3>
                        <div className="space-y-1">
                          {group.items.map((item) => (
                            <button
                              key={item}
                              onClick={() => handleSuggestionClick(item)}
                              className="block w-full rounded-md px-2 py-1 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                messages.map((message) => {
                  const isAssistant = message.sender === "ai";

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className={`flex w-full ${isAssistant ? "justify-start" : "justify-end"
                        } mb-6`}
                    >
                      <div
                        className={`flex max-w-[85%] md:max-w-[75%] gap-4 ${isAssistant ? "flex-row" : "flex-row-reverse"
                          }`}
                      >
                        {/* Avatar */}
                        <div className="flex-shrink-0 pt-1">
                          {isAssistant ? (
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg">
                              <span className="text-sm font-bold text-foreground">
                                P
                              </span>
                            </div>
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-sm">
                              <span className="text-xs font-bold">ME</span>
                            </div>
                          )}
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={`relative rounded-2xl px-5 py-3.5 shadow-sm ${isAssistant
                              ? "bg-card border border-border/50 text-foreground"
                              : "bg-transparent text-foreground"
                            }`}
                        >
                          {isAssistant ? (
                            <div className="prose prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed">
                              {message.content ? (
                                <Markdown>{message.content}</Markdown>
                              ) : (
                                <Loader
                                  variant="typing"
                                  size="sm"
                                  className="opacity-50"
                                />
                              )}
                            </div>
                          ) : (
                            <div className="text-sm leading-relaxed whitespace-pre-wrap">
                              {message.content}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>

            {/* Anchor for scrolling */}
            <div className="h-4" />
          </ChatContainerContent>
        </ChatContainerRoot>

        {/* Input Area */}
        <div className="sticky bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-2 bg-background border-t border-border/40">
          <div className="mx-auto w-full max-w-3xl">
            <div className="relative rounded-[24px] bg-background/80 p-2 shadow-2xl backdrop-blur-xl border border-border/50 ring-1 ring-black/5 dark:ring-white/5 transition-all duration-200 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-500/30">
              <PromptInput
                value={inputMessage}
                onValueChange={handlePromptInputValueChange}
                isLoading={isStreaming}
                onSubmit={handleSendMessage}
                className="border-none bg-transparent shadow-none p-0"
              >
                <PromptInputTextarea
                  ref={textareaRef}
                  placeholder="Ask me anything..."
                  className="min-h-[50px] px-4 py-3 text-base sm:text-sm focus-visible:ring-0 max-h-[200px]"
                />
                <div className="flex items-center justify-between px-2 pb-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground px-2">
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    <span>AI-Enhanced</span>
                  </div>
                  <PromptInputActions>
                    <PromptInputAction
                      tooltip={isStreaming ? "Stop generation" : "Send message"}
                    >
                      <Button
                        size="icon"
                        className={`h-9 w-9 rounded-full transition-all duration-200 ${inputMessage.trim() || isStreaming
                            ? "bg-foreground text-background shadow-md hover:opacity-90 hover:scale-105"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() && !isStreaming}
                      >
                        {isStreaming ? (
                          <Square className="size-4 fill-current" />
                        ) : (
                          <ArrowUp className="size-5" />
                        )}
                      </Button>
                    </PromptInputAction>
                  </PromptInputActions>
                </div>
              </PromptInput>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground/60">
              AI can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </div>
      <OnboardingModal pageId="chat" steps={ONBOARDING_CONTENT.chat} />
    </>
  );
}
