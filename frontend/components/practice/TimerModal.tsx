import { Clock, Timer, ChevronLeft, X, Play } from 'lucide-react';

interface TimerModalProps {
  showTimerModal: boolean;
  showTimerSetup: boolean;
  customHours: number;
  customMinutes: number;
  setCustomHours: (hours: number) => void;
  setCustomMinutes: (minutes: number) => void;
  setShowTimerModal: (show: boolean) => void;
  setShowTimerSetup: (show: boolean) => void;
  onStartStopwatch: () => void;
  onStartTimer: () => void;
}

export function TimerModal({
  showTimerModal,
  showTimerSetup,
  customHours,
  customMinutes,
  setCustomHours,
  setCustomMinutes,
  setShowTimerModal,
  setShowTimerSetup,
  onStartStopwatch,
  onStartTimer,
}: TimerModalProps) {
  if (!showTimerModal && !showTimerSetup) return null;

  if (showTimerSetup) {
    return (
      <>
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowTimerSetup(false);
            setShowTimerModal(false);
          }}
        />
        <div className="fixed top-20 left-[280px] z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-56">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowTimerSetup(false)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <h3 className="text-sm font-semibold text-gray-700">Set Timer</h3>
            <button
              onClick={() => {
                setShowTimerSetup(false);
                setShowTimerModal(false);
              }}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-center gap-2">
              {/* Hours Input */}
              <div className="flex flex-col items-center">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-1">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={customHours.toString().padStart(2, '0')}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setCustomHours(Math.max(0, Math.min(23, val)));
                    }}
                    className="w-12 text-2xl font-bold text-center bg-transparent text-gray-800 outline-none"
                  />
                </div>
                <span className="text-xs text-gray-500 font-medium">hr</span>
              </div>

              <span className="text-2xl font-bold text-gray-400 mb-5">:</span>

              {/* Minutes Input */}
              <div className="flex flex-col items-center">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-1">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={customMinutes.toString().padStart(2, '0')}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setCustomMinutes(Math.max(0, Math.min(59, val)));
                    }}
                    className="w-12 text-2xl font-bold text-center bg-transparent text-gray-800 outline-none"
                  />
                </div>
                <span className="text-xs text-gray-500 font-medium">min</span>
              </div>
            </div>
          </div>

          <button
            onClick={onStartTimer}
            disabled={customHours === 0 && customMinutes === 0}
            className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Play className="w-3.5 h-3.5" />
            Start Timer
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={() => setShowTimerModal(false)}
      />
      <div className="fixed top-20 left-[280px] z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 w-52">
        <div className="grid grid-cols-2 gap-2">
          {/* Stopwatch Option */}
          <button
            onClick={onStartStopwatch}
            className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-3 transition-all"
          >
            <div className="flex flex-col items-center gap-1.5">
              <Clock className="w-5 h-5 text-gray-700" />
              <span className="text-xs font-medium text-gray-700">
                Stopwatch
              </span>
            </div>
          </button>

          {/* Timer Option */}
          <button
            onClick={() => setShowTimerSetup(true)}
            className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-3 transition-all"
          >
            <div className="flex flex-col items-center gap-1.5">
              <Timer className="w-5 h-5 text-gray-700" />
              <span className="text-xs font-medium text-gray-700">Timer</span>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
