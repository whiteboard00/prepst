import { ReactNode } from "react";

export interface OnboardingStep {
    illustration?: ReactNode | string;
    title: string;
    description: string;
}

export const ONBOARDING_CONTENT: Record<string, OnboardingStep[]> = {
    dashboard: [
        {
            illustration: "/icon-sessions.png",
            title: "Welcome to PrepSt!",
            description: "Your personalized test prep dashboard. Everything you need to crush your test is right here.",
        },
        {
            illustration: "/icon-drilling.png",
            title: "Quick Start Practice",
            description: "Hit 'Quick Start' to jump into a timed practice session — we'll pick questions based on your skill level.",
        },
        {
            illustration: "/icon-sessions.png",
            title: "Track Your Progress",
            description: "Your study plan and performance insights update in real-time. Stay on track and watch your score grow!",
        },
    ],

    "study-plan": [
        {
            illustration: "/icon-sessions.png",
            title: "Your Personalized Study Plan",
            description: "We've created a custom schedule based on your goals and available time. Each session targets your weak areas.",
        },
        {
            illustration: "/icon-drilling.png",
            title: "Complete Sessions",
            description: "Work through each session in order. Mark them complete as you go — consistency is key!",
        },
        {
            illustration: "/icon-sessions.png",
            title: "Adapt & Improve",
            description: "Your plan updates automatically based on your performance. The more you practice, the smarter it gets.",
        },
    ],

    drill: [
        {
            illustration: "/icon-drilling.png",
            title: "Unlimited Topic Drills",
            description: "Practice any concept as much as you need. No daily limits — master topics at your own pace.",
        },
        {
            illustration: "/icon-ai-help.png",
            title: "Focus on Weak Spots",
            description: "Choose topics where you need the most practice. Each drill adapts to challenge you appropriately.",
        },
    ],

    analytics: [
        {
            illustration: "/icon-sessions.png",
            title: "Your Performance Dashboard",
            description: "See exactly where you stand. Track score trends, accuracy rates, and time per question.",
        },
        {
            illustration: "/icon-ai-help.png",
            title: "Identify Weak Areas",
            description: "Pinpoint which topics need the most attention so you can study smarter, not harder.",
        },
    ],

    "mock-exam": [
        {
            illustration: "/icon-mock-exam.png",
            title: "Full SAT Simulation",
            description: "Experience the real test format. Complete mock exams with accurate timing and question distribution.",
        },
        {
            illustration: "/icon-mock-exam.png",
            title: "Detailed Score Reports",
            description: "After each exam, get a full breakdown of your performance with actionable insights.",
        },
    ],

    "question-pool": [
        {
            illustration: "/icon-drilling.png",
            title: "Browse All Questions",
            description: "Explore our complete question bank. Filter by topic, difficulty, or question type.",
        },
        {
            illustration: "/icon-sessions.png",
            title: "Save for Later",
            description: "Bookmark questions you want to revisit. Build your own custom review sets.",
        },
    ],

    progress: [
        {
            illustration: "/icon-sessions.png",
            title: "Track Your Journey",
            description: "See how far you've come! Your progress history shows every session and improvement.",
        },
    ],

    saved: [
        {
            illustration: "/icon-sessions.png",
            title: "Your Saved Questions",
            description: "All your bookmarked questions in one place. Perfect for targeted review sessions.",
        },
    ],

    revision: [
        {
            illustration: "/icon-drilling.png",
            title: "Smart Review",
            description: "Revisit questions you got wrong. Our spaced repetition helps you actually remember.",
        },
    ],

    chat: [
        {
            illustration: "/icon-ai-help.png",
            title: "Meet Peppa AI",
            description: "Your 24/7 study companion! Ask any question and get instant, step-by-step explanations.",
        },
        {
            illustration: "/icon-ai-help.png",
            title: "Ask Follow-ups",
            description: "Don't understand something? Keep asking! Peppa will explain it differently until it clicks.",
        },
    ],

    "my-sat": [
        {
            illustration: "/icon-sessions.png",
            title: "Your SAT Profile",
            description: "Set your target score and test date. We'll tailor everything to help you reach your goals.",
        },
    ],

    vocab: [
        {
            illustration: "/icon-ai-help.png",
            title: "SAT Vocabulary Builder",
            description: "Master essential words that appear on the test. Learn with context and spaced repetition.",
        },
    ],

    "mind-map": [
        {
            illustration: "/icon-sessions.png",
            title: "Visual Learning",
            description: "See how concepts connect. Mind maps help you understand the big picture.",
        },
    ],

    profile: [
        {
            illustration: "/profile.png",
            title: "Your Profile",
            description: "View and update your account information, goals, and preferences.",
        },
    ],

    settings: [
        {
            illustration: "/icon-sessions.png",
            title: "Customize Your Experience",
            description: "Adjust themes, notifications, and study preferences. Reset your study plan if needed.",
        },
    ],
};
