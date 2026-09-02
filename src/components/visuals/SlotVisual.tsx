import React from 'react';
import { Award, Sparkles } from 'lucide-react';
import { Student } from '../../types';

interface SlotVisualProps {
  displayName: string;
  isSpinning: boolean;
  hasCompleted: boolean;
  winner: Student | null;
  reelNames: string[];
}

export const SlotVisual: React.FC<SlotVisualProps> = ({
  displayName,
  isSpinning,
  hasCompleted,
  winner,
  reelNames,
}) => {
  // Compute previous and next name for reel realism
  const currentIndex = reelNames.indexOf(displayName);
  const prevName = reelNames[(currentIndex - 1 + reelNames.length) % reelNames.length] || '—';
  const nextName = reelNames[(currentIndex + 1) % reelNames.length] || '—';

  return (
    <div className="w-full max-w-2xl py-4 px-2 select-none">
      {/* Slot Machine Outer Frame */}
      <div
        className={`relative rounded-3xl p-6 sm:p-8 transition-all duration-300 border-2 overflow-hidden ${
          isSpinning
            ? 'bg-slate-900/90 border-indigo-400 shadow-2xl shadow-indigo-500/30'
            : hasCompleted
            ? 'bg-slate-900/95 border-emerald-500/90 shadow-2xl shadow-emerald-500/30 ring-4 ring-emerald-500/20'
            : 'bg-slate-900/60 border-slate-700/80 shadow-xl'
        }`}
      >
        {/* Top/Bottom Reel Vignettes */}
        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-slate-950 via-slate-950/70 to-transparent pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent pointer-events-none z-10" />

        {/* Center Target Indicator Lines */}
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-20 sm:h-24 border-y-2 border-indigo-500/40 bg-indigo-500/5 rounded-xl pointer-events-none z-0" />

        {/* 3-Row Virtual Slot Column */}
        <div className="relative z-10 flex flex-col items-center justify-center space-y-2 sm:space-y-3">
          {/* Previous item (dimmed & blurred) */}
          <div
            className={`text-sm sm:text-lg font-bold text-slate-500/50 truncate max-w-full transition-opacity ${
              isSpinning ? 'opacity-70 blur-[1px]' : 'opacity-30'
            }`}
          >
            {isSpinning ? prevName : '••••••••••••'}
          </div>

          {/* Main Focus Row */}
          <div
            className={`py-2 px-4 rounded-xl text-3xl sm:text-5xl md:text-6xl font-black tracking-tight transition-all duration-150 text-center ${
              isSpinning
                ? 'text-indigo-200 blur-[0.6px] scale-98 animate-pulse'
                : hasCompleted
                ? 'text-amber-300 drop-shadow-lg scale-105'
                : 'text-slate-400'
            }`}
          >
            {displayName}
          </div>

          {/* Next item (dimmed & blurred) */}
          <div
            className={`text-sm sm:text-lg font-bold text-slate-500/50 truncate max-w-full transition-opacity ${
              isSpinning ? 'opacity-70 blur-[1px]' : 'opacity-30'
            }`}
          >
            {isSpinning ? nextName : '••••••••••••'}
          </div>
        </div>

        {/* Winner Badge on Complete */}
        {hasCompleted && winner && (
          <div className="relative z-20 mt-4 pt-4 border-t border-slate-700/60 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 animate-fade-in">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 text-sm sm:text-base font-extrabold shadow-md">
              <Award className="w-4 h-4 text-amber-400" />
              LẦN THỨ {winner.callCount} LÊN BẢNG
            </span>
            {winner.studentCode && (
              <span className="text-xs text-slate-400 font-medium">Mã HS: {winner.studentCode}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
