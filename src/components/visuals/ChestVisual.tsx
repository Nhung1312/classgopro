import React from 'react';
import { Award, Sparkles } from 'lucide-react';
import { Student } from '../../types';

interface ChestVisualProps {
  displayName: string;
  isSpinning: boolean;
  hasCompleted: boolean;
  winner: Student | null;
}

export const ChestVisual: React.FC<ChestVisualProps> = ({
  displayName,
  isSpinning,
  hasCompleted,
  winner,
}) => {
  return (
    <div className="w-full max-w-2xl py-4 px-2 select-none flex flex-col items-center">
      {/* 3D Animated Lucky Chest / Orb Icon */}
      <div className="relative my-2 flex items-center justify-center">
        {/* Glow rings */}
        <div
          className={`absolute w-36 h-36 rounded-full blur-2xl transition-all duration-500 pointer-events-none ${
            isSpinning
              ? 'bg-indigo-500/50 scale-125 animate-ping'
              : hasCompleted
              ? 'bg-amber-400/40 scale-150 animate-pulse'
              : 'bg-indigo-900/20 scale-90'
          }`}
        />

        {/* Floating Box / Orb Element */}
        <div
          className={`w-28 h-28 sm:w-36 sm:h-36 rounded-3xl flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-300 border-2 ${
            hasCompleted
              ? 'bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 border-yellow-200 text-slate-950 scale-110 rotate-3 shadow-amber-500/60 ring-4 ring-amber-300/40'
              : isSpinning
              ? 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-sky-500 border-indigo-300 text-white scale-105 animate-bounce shadow-indigo-500/50'
              : 'bg-slate-800/90 border-slate-700 text-amber-400 hover:border-slate-600 shadow-xl'
          }`}
        >
          {hasCompleted ? (
            <div className="flex flex-col items-center justify-center space-y-1">
              <span className="text-4xl sm:text-5xl animate-bounce">🎁</span>
              <span className="text-[10px] font-black uppercase text-amber-950 tracking-wider">
                MỞ HỘP
              </span>
            </div>
          ) : isSpinning ? (
            <div className="flex flex-col items-center justify-center space-y-1">
              <span className="text-4xl sm:text-5xl animate-spin">🔮</span>
              <span className="text-[10px] font-black uppercase text-indigo-100 tracking-wider">
                ĐANG RUNG...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-1 opacity-90">
              <span className="text-4xl sm:text-5xl">🎁</span>
              <span className="text-[10px] font-bold text-slate-400">HỘP MAY MẮN</span>
            </div>
          )}
        </div>
      </div>

      {/* Name Display Frame */}
      <div className="mt-4 w-full max-w-xl text-center">
        <div
          className={`py-4 px-6 rounded-2xl transition-all duration-300 border ${
            isSpinning
              ? 'bg-slate-900/90 border-indigo-500 shadow-xl shadow-indigo-500/20'
              : hasCompleted
              ? 'bg-slate-900/95 border-amber-500/90 shadow-2xl shadow-amber-500/30 scale-102 ring-2 ring-amber-500/30'
              : 'bg-slate-900/50 border-slate-800'
          }`}
        >
          <div
            className={`text-3xl sm:text-5xl font-black tracking-tight ${
              isSpinning
                ? 'text-indigo-200 blur-[0.6px]'
                : hasCompleted
                ? 'text-amber-300 drop-shadow-lg'
                : 'text-slate-500'
            }`}
          >
            {displayName}
          </div>

          {hasCompleted && winner && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs sm:text-sm font-black text-amber-300">
              <Award className="w-4 h-4 text-amber-400" />
              <span>LẦN THỨ {winner.callCount} LÊN BẢNG</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
