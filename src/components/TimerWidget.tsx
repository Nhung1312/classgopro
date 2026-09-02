import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Bell, Clock, Minimize2, Maximize2, X } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface TimerWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  isFloating?: boolean;
}

export function TimerWidget({ isOpen, onClose, isFloating = false }: TimerWidgetProps) {
  const [mode, setMode] = useState<'COUNTDOWN' | 'STOPWATCH'>('COUNTDOWN');
  const [totalSeconds, setTotalSeconds] = useState(120); // 2 mins default
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [isRunning, setIsRunning] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

  // Stopwatch state
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        if (mode === 'COUNTDOWN') {
          setSecondsLeft((prev) => {
            if (prev <= 1) {
              setIsRunning(false);
              setIsAlarmPlaying(true);
              soundEngine.playTimerAlarm();
              return 0;
            }
            return prev - 1;
          });
        } else {
          setStopwatchSeconds((prev) => prev + 1);
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, mode]);

  if (!isOpen) return null;

  const handleSetCountdown = (seconds: number) => {
    setIsRunning(false);
    setIsAlarmPlaying(false);
    setTotalSeconds(seconds);
    setSecondsLeft(seconds);
  };

  const handleAddSeconds = (secs: number) => {
    if (mode === 'COUNTDOWN') {
      setSecondsLeft((prev) => prev + secs);
      setTotalSeconds((prev) => Math.max(prev, secondsLeft + secs));
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsAlarmPlaying(false);
    if (mode === 'COUNTDOWN') {
      setSecondsLeft(totalSeconds);
    } else {
      setStopwatchSeconds(0);
    }
  };

  const toggleRunning = () => {
    setIsAlarmPlaying(false);
    setIsRunning(!isRunning);
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progressPercent =
    mode === 'COUNTDOWN' && totalSeconds > 0
      ? Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100))
      : 100;

  // Minimized floating pill view
  if (isMinimized) {
    return (
      <div
        id="timer-minimized-pill"
        className={`fixed z-50 bg-slate-900/95 text-white border border-slate-700 shadow-2xl backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-3 ${
          isFloating ? 'bottom-6 right-6' : 'top-20 right-6'
        }`}
      >
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${isRunning ? 'text-indigo-400 animate-pulse' : 'text-slate-400'}`} />
          <span className="font-mono font-bold text-lg tracking-wider text-amber-300">
            {formatTime(mode === 'COUNTDOWN' ? secondsLeft : stopwatchSeconds)}
          </span>
        </div>
        <button
          id="btn-timer-mini-play"
          onClick={toggleRunning}
          className="p-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          title={isRunning ? 'Tạm dừng' : 'Tiếp tục'}
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>
        <button
          id="btn-timer-mini-maximize"
          onClick={() => setIsMinimized(false)}
          className="p-1 rounded-full hover:bg-slate-800 text-slate-300 transition-colors"
          title="Mở rộng"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          id="btn-timer-mini-close"
          onClick={onClose}
          className="p-1 rounded-full hover:bg-rose-500/20 text-rose-400 transition-colors"
          title="Đóng đồng hồ"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      id="timer-full-widget"
      className={`fixed z-50 bg-slate-900/95 text-white border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md p-5 w-84 sm:w-96 transition-all duration-300 ${
        isFloating ? 'bottom-6 right-6' : 'top-20 right-6'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Đồng Hồ Lớp Học</h3>
            <p className="text-xs text-slate-400">Tiện ích trợ giảng đếm giờ trả lời</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            id="btn-timer-minimize"
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Thu nhỏ thành thanh tiện ích"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            id="btn-timer-close"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex rounded-xl bg-slate-800/80 p-1 mb-4 border border-slate-700/50">
        <button
          id="btn-timer-mode-countdown"
          onClick={() => {
            setIsRunning(false);
            setMode('COUNTDOWN');
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            mode === 'COUNTDOWN'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          ⏱️ Đếm Ngược
        </button>
        <button
          id="btn-timer-mode-stopwatch"
          onClick={() => {
            setIsRunning(false);
            setMode('STOPWATCH');
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            mode === 'STOPWATCH'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          ⏱️ Bấm Giờ Tăng
        </button>
      </div>

      {/* Main Timer Display */}
      <div className="relative flex flex-col items-center justify-center my-3 py-2">
        {mode === 'COUNTDOWN' && (
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-4 border border-slate-700">
            <div
              className={`h-full transition-all duration-1000 ${
                secondsLeft <= 10
                  ? 'bg-rose-500 animate-pulse'
                  : secondsLeft <= 30
                  ? 'bg-amber-400'
                  : 'bg-indigo-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        <div
          className={`font-mono text-5xl font-extrabold tracking-wider ${
            isAlarmPlaying
              ? 'text-rose-400 animate-bounce'
              : secondsLeft <= 10 && mode === 'COUNTDOWN'
              ? 'text-rose-400 animate-pulse'
              : 'text-amber-300'
          }`}
        >
          {formatTime(mode === 'COUNTDOWN' ? secondsLeft : stopwatchSeconds)}
        </div>

        {isAlarmPlaying && (
          <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold mt-2 animate-pulse">
            <Bell className="w-4 h-4" /> Hết giờ làm bài / trả lời!
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 my-4">
        <button
          id="btn-timer-toggle-play"
          onClick={toggleRunning}
          className={`px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 text-sm transition-all shadow-lg ${
            isRunning
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/30'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4" /> Tạm Dừng
            </>
          ) : (
            <>
              <Play className="w-4 h-4 ml-0.5" /> {secondsLeft === 0 ? 'Bắt Đầu Lại' : 'Bắt Đầu'}
            </>
          )}
        </button>

        <button
          id="btn-timer-reset"
          onClick={handleReset}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
          title="Đặt lại từ đầu"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {mode === 'COUNTDOWN' && (
          <button
            id="btn-timer-add-30s"
            onClick={() => handleAddSeconds(30)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors border border-slate-700 flex items-center gap-1"
            title="Thêm 30 giây"
          >
            <Plus className="w-3.5 h-3.5" /> +30s
          </button>
        )}
      </div>

      {/* Quick Presets for Countdown */}
      {mode === 'COUNTDOWN' && (
        <div>
          <div className="text-[11px] font-medium text-slate-400 mb-2 uppercase tracking-wider">
            Thời Gian Nhanh
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: '30s', secs: 30 },
              { label: '1 phút', secs: 60 },
              { label: '2 phút', secs: 120 },
              { label: '3 phút', secs: 180 },
              { label: '5 phút', secs: 300 },
              { label: '7 phút', secs: 420 },
              { label: '10 phút', secs: 600 },
              { label: '15 phút', secs: 900 },
            ].map((p) => (
              <button
                key={p.secs}
                id={`btn-preset-${p.secs}`}
                onClick={() => handleSetCountdown(p.secs)}
                className={`py-1.5 px-1 rounded-lg text-xs font-medium transition-all ${
                  totalSeconds === p.secs
                    ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
