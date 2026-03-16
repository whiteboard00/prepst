"use client";

import { useState, useEffect } from "react";
import { Calendar, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useCourseConfigSafe } from "@/contexts/CourseContext";

interface TestDateCountdownProps {
    testDate: Date | null;
    onEditClick?: () => void;
    compact?: boolean;
}

const motivationalMessages = [
    "Every practice session brings you closer to your goal! 💪",
    "You've got this! Consistency is key. 🔑",
    "Small steps lead to big achievements. 🚀",
    "Your future self will thank you for studying today. ⭐",
    "Stay focused, stay determined. You're doing great! 🎯",
];

export function TestDateCountdown({ testDate, onEditClick, compact = false }: TestDateCountdownProps) {
    const { course } = useCourseConfigSafe();
    const courseName = course?.name ?? "SAT";

    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
    });
    const [motivationalIndex, setMotivationalIndex] = useState(0);

    useEffect(() => {
        if (!testDate) return;

        const updateCountdown = () => {
            const now = new Date();
            const target = new Date(testDate);

            if (target <= now) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                return;
            }

            const totalSeconds = Math.floor((target.getTime() - now.getTime()) / 1000);
            const days = Math.floor(totalSeconds / (24 * 60 * 60));
            const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
            const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
            const seconds = totalSeconds % 60;

            setTimeLeft({ days, hours, minutes, seconds });
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [testDate]);

    useEffect(() => {
        const interval = setInterval(() => {
            setMotivationalIndex((prev) => (prev + 1) % motivationalMessages.length);
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    const TimeBlock = ({ value, label }: { value: number; label: string }) => (
        <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20 flex items-center justify-center">
                <span className="text-xl font-bold text-foreground tabular-nums">
                    {value.toString().padStart(2, "0")}
                </span>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground mt-1.5 uppercase tracking-wider">
                {label}
            </span>
        </div>
    );

    if (!testDate) {
        return (
            <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/20 shadow-sm h-full flex flex-col justify-center">
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-primary">Test Date</span>
                    </div>
                    <h2 className="text-lg font-bold text-foreground">Set Your {courseName} Date</h2>
                    <p className="text-sm text-muted-foreground">
                        Set your test date for a personalized countdown.
                    </p>
                    <Button
                        onClick={onEditClick}
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    >
                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                        Set Date
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/20 shadow-sm h-full flex flex-col">
            {/* Header */}
            <div className="text-center mb-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                    Your {courseName} is in
                </p>
            </div>

            {/* Countdown - No animation, just smooth updates */}
            <div className="flex justify-center gap-2 mb-4">
                <TimeBlock value={timeLeft.days} label="Days" />
                <div className="flex items-center text-lg font-bold text-muted-foreground/40 pb-5">:</div>
                <TimeBlock value={timeLeft.hours} label="Hrs" />
                <div className="flex items-center text-lg font-bold text-muted-foreground/40 pb-5">:</div>
                <TimeBlock value={timeLeft.minutes} label="Min" />
                <div className="flex items-center text-lg font-bold text-muted-foreground/40 pb-5">:</div>
                <TimeBlock value={timeLeft.seconds} label="Sec" />
            </div>

            {/* Test Date & Edit */}
            <div className="flex items-center justify-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-background/50 rounded-full border border-border/50 text-sm">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                        {format(new Date(testDate), "MMM d, yyyy")}
                    </span>
                </div>
                {onEditClick && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onEditClick}
                        className="text-muted-foreground hover:text-foreground h-8 px-2"
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                )}
            </div>

            {/* Motivational Message */}
            <p className="text-xs text-muted-foreground text-center italic mt-auto">
                {motivationalMessages[motivationalIndex]}
            </p>
        </div>
    );
}
