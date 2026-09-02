import React, { useState, useEffect } from 'react';
import { Award, Sparkles, HelpCircle } from 'lucide-react';
import { Student } from '../../types';

interface CardsVisualProps {
  students: Student[];
  displayName: string;
  isSpinning: boolean;
  hasCompleted: boolean;
  winner: Student | null;
}

export const CardsVisual: React.FC<CardsVisualProps> = ({
  students,
  displayName,
  isSpinning,
  hasCompleted,
  winner,
}) => {
  const [activeCardIndex, setActiveCardIndex] = useState<number>(2);

  // During spinning, cycle through active shuffling cards
  useEffect(() => {
    if (!isSpinning) return;
    const interval = setInterval(() => {
      setActiveCardIndex((prev) => (prev + 1) % 5);
    }, 120);
    return () => clearInterval(interval);
  }, [isSpinning]);

  const cardsCount = 5;

  return (
    <div className="w-full max-w-4xl py-4 px-2 select-none flex flex-col items-center">
      {/* 5 Mystery Cards Row */}
      <div className="grid grid-cols-5 gap-2 sm:gap-4 w-full max-w-2xl justify-center items-center my-2">
        {Array.from({ length: cardsCount }).map((_, idx) => {
          const isSelected = hasCompleted ? idx === 2 : isSpinning && activeCardIndex === idx;
          const isWinnerCard = hasCompleted && idx === 2;

          return (
            <div
              key={idx}
              className={`relative aspect-[3/4] rounded-2xl transition-all duration-300 transform flex flex-col items-center justify-center p-2 text-center border-2 ${
                isWinnerCard
                  ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 border-yellow-200 text-slate-950 scale-110 -translate-y-3 shadow-2xl shadow-amber-500/50 z-20 ring-4 ring-amber-300/40'
                  : isSelected
                  ? 'bg-indigo-600/90 border-indigo-300 text-white scale-105 -translate-y-2 shadow-lg shadow-indigo-500/40 z-10'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:border-slate-600'
              }`}
            >
              {isWinnerCard ? (
                // Winner Card Face Up
                <div className="flex flex-col items-center justify-center space-y-1 animate-scale-in">
                  <span className="text-2xl sm:text-3xl">👑</span>
                  <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-950">
                    ĐƯỢC CHỌN
                  </div>
                  <div className="text-xs sm:text-sm font-black text-slate-950 line-clamp-2 px-0.5">
                    {winner?.name}
                  </div>
                </div>
              ) : isSpinning ? (
                // Shuffling Card
                <div className="flex flex-col items-center justify-center space-y-1">
                  <span className={`text-xl sm:text-2xl ${isSelected ? 'animate-bounce' : ''}`}>
                    ✨
                  </span>
                  <div className="text-[10px] font-bold text-slate-300">
                    {isSelected ? 'ĐANG CHỌN' : '•••'}
                  </div>
                </div>
              ) : (
                // Mystery Card Back
                <div className="flex flex-col items-center justify-center space-y-1.5 opacity-80">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-900/60 border border-slate-700 flex items-center justify-center text-indigo-400">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Big Name Reveal Area Below Cards */}
      <div className="mt-4 w-full max-w-xl text-center">
        <div
          className={`py-3 px-6 rounded-2xl transition-all duration-300 border ${
            isSpinning
              ? 'bg-slate-900/90 border-indigo-500 shadow-xl shadow-indigo-500/20'
              : hasCompleted
              ? 'bg-slate-900/95 border-amber-500/80 shadow-2xl shadow-amber-500/20 scale-102'
              : 'bg-slate-900/50 border-slate-800'
          }`}
        >
          <div
            className={`text-2xl sm:text-4xl md:text-5xl font-black tracking-tight ${
              isSpinning
                ? 'text-indigo-200 blur-[0.6px]'
                : hasCompleted
                ? 'text-amber-300 drop-shadow-md'
                : 'text-slate-500'
            }`}
          >
            {displayName}
          </div>

          {hasCompleted && winner && (
            <div className="mt-2.5 flex items-center justify-center gap-2 text-xs font-bold text-amber-300">
              <Award className="w-4 h-4 text-amber-400" />
              <span>LẦN THỨ {winner.callCount} LÊN BẢNG</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
