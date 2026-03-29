import {
  Clock,
  List,
  X,
  Pause,
  Play,
  RotateCcw,
  Flame,
  Trophy,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TimerConfig } from "./TimerModal";
import type { TimerMode } from "@/hooks/useTimer";
import { cn } from "@/lib/utils";

interface PracticeHeaderProps {
  currentIndex: number;
  totalQuestions: number;
  timerMode: TimerMode;
  time: number;
  isRunning: boolean;
  formatTime: (seconds: number) => string;
  onToggleQuestionList: () => void;
  // Gamification Props
  streak?: number;
  score?: number;
  // Timer State Props
  showTimerModal?: boolean; // Optional now if we use internal state, but better controlled
  onToggleTimerModal: (open: boolean) => void; // Changed signature to match onOpenChange

  // Timer Config Props
  showTimerSetup?: boolean;
  setShowTimerSetup?: (show: boolean) => void;
  customHours?: number;
  setCustomHours?: (hours: number) => void;
  customMinutes?: number;
  setCustomMinutes?: (minutes: number) => void;

  // Timer Actions
  onPauseResume: () => void;
  onReset: () => void;
  onCloseTimer: () => void;
  onStartStopwatch?: () => void;
  onStartTimer?: () => void;

  onExit: () => void;
  isPinned?: boolean;
}

export function PracticeHeader({
  currentIndex,
  totalQuestions,
  timerMode,
  time,
  isRunning,
  formatTime,
  onToggleQuestionList,
  streak = 0,
  score = 0,

  // Timer props
  showTimerModal,
  onToggleTimerModal,
  showTimerSetup = false,
  setShowTimerSetup = () => { },
  customHours = 0,
  setCustomHours = () => { },
  customMinutes = 0,
  setCustomMinutes = () => { },
  onStartStopwatch = () => { },
  onStartTimer = () => { },

  onPauseResume,
  onReset,
  onCloseTimer,
  onExit,
  isPinned = false,
}: PracticeHeaderProps) {
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="relative z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 supports-[backdrop-filter]:bg-background/60">
      <div className={cn(
        "flex items-center justify-between h-16",
        isPinned ? "px-8" : "px-4 lg:pl-[250px] lg:pr-[250px]"
      )}>
        {/* Left: Branding & Session Info */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="font-bold text-primary">P</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground leading-none">
                Practice Session
              </span>
              <span className="text-[10px] text-muted-foreground font-medium mt-1">
                SAT Prep
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-border/60 hidden sm:block" />

          <div className="flex items-center gap-2 hidden sm:flex">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleQuestionList}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Question List"
            >
              <List className="w-4 h-4" />
            </Button>
            <Badge
              variant="secondary"
              className="font-mono font-medium bg-secondary/50 hover:bg-secondary/50"
            >
              <span className="text-foreground">{currentIndex + 1}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-muted-foreground">{totalQuestions}</span>
            </Badge>
          </div>
        </div>

        {/* Center: Timer (Absolute Center) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {!timerMode ? (
            <Popover open={showTimerModal} onOpenChange={onToggleTimerModal}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full border-border/60 bg-background/80 backdrop-blur-sm hover:bg-accent hover:border-primary/50 gap-2 px-4 shadow-sm transition-all duration-200"
                >
                  <div className="h-4 w-4 rounded-md bg-primary/10 flex items-center justify-center">
                    <Clock className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    Timer
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-2 bg-popover border-border shadow-xl"
                align="center"
                sideOffset={8}
              >
                <TimerConfig
                  showTimerSetup={showTimerSetup}
                  setShowTimerSetup={setShowTimerSetup}
                  customHours={customHours}
                  setCustomHours={setCustomHours}
                  customMinutes={customMinutes}
                  setCustomMinutes={setCustomMinutes}
                  onStartStopwatch={onStartStopwatch}
                  onStartTimer={onStartTimer}
                  onClose={() => onToggleTimerModal(false)}
                />
              </PopoverContent>
            </Popover>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-border/60 bg-background/80 backdrop-blur-sm shadow-md transition-all duration-300">
              {/* Timer Display */}
              <div className="px-3 min-w-[70px] text-center">
                <span className="text-sm font-mono font-bold tabular-nums tracking-tight text-foreground">
                  {formatTime(time)}
                </span>
              </div>

              {/* Divider */}
              <div className="h-5 w-px bg-border/60" />

              {/* Control Buttons */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPauseResume}
                  className="h-7 w-7 rounded-lg transition-all duration-200 hover:bg-muted text-foreground"
                  title={isRunning ? "Pause" : "Resume"}
                >
                  {isRunning ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onReset}
                  className="h-7 w-7 rounded-lg transition-all duration-200 hover:bg-muted text-foreground"
                  title="Reset"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCloseTimer}
                  className="h-7 w-7 rounded-lg transition-all duration-200 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                  title="Close Timer"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Gamification Stats */}
          <div className="hidden md:flex items-center gap-3 mr-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
              <Flame
                className={cn(
                  "w-4 h-4 text-orange-500",
                  streak > 0 && "fill-orange-500 animate-pulse"
                )}
              />
              <span className="text-sm font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                {streak}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
              <Trophy className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
              <span className="text-sm font-bold text-yellow-700 dark:text-yellow-400 tabular-nums">
                {score}
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-border/60 hidden md:block" />

          <Button
            variant="ghost"
            size="icon"
            onClick={onExit}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Exit Session"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Progress Bar - Premium Design */}
      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-muted/20 overflow-hidden">
        {/* Animated gradient progress bar */}
        <div
          className="relative h-full transition-all duration-700 ease-out overflow-hidden"
          style={{ width: `${progress}%` }}
        >
          {/* Main gradient fill */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/95 to-primary/90" />
        </div>

        {/* Bottom shadow for depth */}
        <div className="absolute bottom-0 left-0 w-full h-px bg-black/5 dark:bg-white/5" />
      </div>
    </div>
  );
}
