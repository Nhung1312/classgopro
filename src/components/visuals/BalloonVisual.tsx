import React from 'react';
import { Student } from '../../types';

interface BalloonVisualProps {
  displayName: string;
  isSpinning: boolean;
  hasCompleted: boolean;
  winner: Student | null;
}

export const BalloonVisual: React.FC<BalloonVisualProps> = ({ displayName, isSpinning, hasCompleted, winner }) => {
  const shownName = hasCompleted ? winner?.name : displayName;
  return (
    <div className="w-full max-w-3xl py-4 px-2 select-none flex flex-col items-center">
      <div className="relative w-full max-w-xl h-52 sm:h-64 rounded-3xl overflow-hidden border border-slate-700/70 bg-gradient-to-b from-slate-800/90 to-slate-950/90 shadow-2xl flex items-center justify-center">
        <div className={`text-7xl sm:text-8xl transition-all duration-500 ${isSpinning ? 'animate-bounce scale-110' : hasCompleted ? 'scale-125' : 'opacity-90'}`}>
          🎈
        </div>
        {isSpinning && <div className="absolute inset-x-8 bottom-8 h-1 rounded-full bg-indigo-400/50 animate-pulse" />}
        {hasCompleted && <div className="absolute top-4 right-5 text-3xl animate-bounce">🏆</div>}
      </div>
      <div className="mt-4 min-h-16 flex flex-col items-center justify-center text-center">
        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">BONG BÓNG</div>
        <div className={`mt-1 font-black text-xl sm:text-3xl ${hasCompleted ? 'text-amber-300' : 'text-white'}`}>
          {shownName || (isSpinning ? 'Bóng đang bay...' : 'Sẵn sàng')}
        </div>
      </div>
    </div>
  );
};
