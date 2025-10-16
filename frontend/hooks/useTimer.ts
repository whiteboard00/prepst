import { useState, useEffect } from 'react';

export type TimerMode = 'stopwatch' | 'timer' | null;

interface TimerState {
  timerMode: TimerMode;
  time: number;
  isRunning: boolean;
  customMinutes: number;
  customHours: number;
  showTimerModal: boolean;
  showTimerSetup: boolean;
}

export function useTimer(sessionId: string) {
  const timerStorageKey = `timer-state-${sessionId}`;

  const [timerMode, setTimerMode] = useState<TimerMode>(null);
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(0);
  const [customHours, setCustomHours] = useState(1);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showTimerSetup, setShowTimerSetup] = useState(false);

  // Load timer state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(timerStorageKey);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setTimerMode(parsed.timerMode);
        setTime(parsed.time);
        setCustomHours(parsed.customHours);
        setCustomMinutes(parsed.customMinutes);
        // Always pause when returning to the session
        setIsRunning(false);
      } catch (err) {
        console.error('Failed to load timer state:', err);
      }
    }
  }, [timerStorageKey]);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    if (timerMode) {
      const stateToSave = {
        timerMode,
        time,
        customHours,
        customMinutes,
      };
      localStorage.setItem(timerStorageKey, JSON.stringify(stateToSave));
    } else {
      localStorage.removeItem(timerStorageKey);
    }
  }, [timerMode, time, customHours, customMinutes, timerStorageKey]);

  // Timer/Stopwatch effect
  useEffect(() => {
    if (!isRunning || !timerMode) return;

    const interval = setInterval(() => {
      setTime((prev) => {
        if (timerMode === 'stopwatch') {
          return prev + 1;
        } else {
          // Timer mode - countdown
          if (prev <= 0) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timerMode]);

  const handleStartStopwatch = () => {
    setTimerMode('stopwatch');
    setTime(0);
    setIsRunning(true);
    setShowTimerModal(false);
    setShowTimerSetup(false);
  };

  const handleStartTimer = () => {
    const totalSeconds = customHours * 3600 + customMinutes * 60;
    setTimerMode('timer');
    setTime(totalSeconds);
    setIsRunning(true);
    setShowTimerModal(false);
    setShowTimerSetup(false);
  };

  const handlePauseResume = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    if (timerMode === 'stopwatch') {
      setTime(0);
    } else if (timerMode === 'timer') {
      const totalSeconds = customHours * 3600 + customMinutes * 60;
      setTime(totalSeconds);
    }
  };

  const handleCloseTimer = () => {
    setTimerMode(null);
    setIsRunning(false);
    setTime(0);
    localStorage.removeItem(timerStorageKey);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  return {
    timerMode,
    time,
    isRunning,
    customMinutes,
    customHours,
    showTimerModal,
    showTimerSetup,
    setCustomMinutes,
    setCustomHours,
    setShowTimerModal,
    setShowTimerSetup,
    handleStartStopwatch,
    handleStartTimer,
    handlePauseResume,
    handleReset,
    handleCloseTimer,
    formatTime,
  };
}
