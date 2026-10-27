import React from 'react';
import { MascotMood } from '../../types/arenaTypes';
import { ARENA_MASCOTS } from './arenaData';

interface ArenaMascotProps {
  mascotId: string;
  mood?: MascotMood;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  className?: string;
  animate?: boolean;
}

export const ArenaMascot: React.FC<ArenaMascotProps> = ({
  mascotId,
  mood = 'idle',
  size = 'md',
  showBadge = true,
  className = '',
  animate = true,
}) => {
  const mascot = ARENA_MASCOTS[mascotId] || {
    id: mascotId,
    name: 'Chiến Binh Arena',
    emoji: '⭐',
    badge: 'Chiến Binh',
    accentColor: '#f59e0b',
    bgGradient: 'from-amber-500 to-indigo-600',
    description: 'Linh vật đại diện đấu trường kiến thức.',
  };

  // Dimensions
  const sizeMap = {
    sm: { box: 'w-10 h-10', text: 'text-xl', badgeText: 'text-[9px] px-1 py-0.2' },
    md: { box: 'w-14 h-14 sm:w-16 sm:h-16', text: 'text-2xl sm:text-3xl', badgeText: 'text-[10px] px-1.5 py-0.5' },
    lg: { box: 'w-20 h-20 sm:w-24 sm:h-24', text: 'text-4xl sm:text-5xl', badgeText: 'text-xs px-2 py-0.5' },
    xl: { box: 'w-28 h-28 sm:w-36 sm:h-36', text: 'text-6xl sm:text-7xl', badgeText: 'text-sm px-3 py-1' },
  };

  // Mood reactions
  const moodEffects = {
    idle: animate ? 'animate-bounce-subtle' : '',
    locked: 'scale-105 ring-4 ring-amber-400/80 shadow-lg shadow-amber-500/30',
    correct: 'scale-110 ring-4 ring-emerald-400 shadow-xl shadow-emerald-500/40 animate-pulse',
    wrong: 'opacity-85 grayscale-25',
    winner: 'scale-115 ring-4 ring-yellow-300 shadow-2xl shadow-yellow-500/50 animate-bounce-subtle',
  };

  const moodBadges = {
    idle: mascot.badge,
    locked: '🔒 Đã chốt',
    correct: '✨ Xuất sắc',
    wrong: '💪 Cố lên',
    winner: '👑 Vô Địch',
  };

  return (
    <div className={`relative inline-flex flex-col items-center select-none ${className}`}>
      {/* Crown / Stars for Winner */}
      {mood === 'winner' && (
        <div className="absolute -top-4 z-20 animate-bounce">
          <span className="text-xl sm:text-2xl filter drop-shadow">👑</span>
        </div>
      )}

      {/* Main Avatar Container */}
      <div
        className={`relative ${sizeMap[size].box} rounded-2xl sm:rounded-3xl bg-gradient-to-tr ${mascot.bgGradient} p-1 flex items-center justify-center transition-all duration-300 ${moodEffects[mood]}`}
        style={{
          boxShadow: `0 8px 24px -4px ${mascot.accentColor}40`,
        }}
      >
        {/* Soft inner glow */}
        <div className="w-full h-full rounded-xl sm:rounded-2xl bg-slate-950/20 backdrop-blur-[2px] flex items-center justify-center relative overflow-hidden border border-white/25">
          {/* Subtle shine highlight */}
          <div className="absolute -top-6 -left-6 w-12 h-12 bg-white/20 rounded-full blur-md pointer-events-none" />

          {/* Emoji Avatar Character */}
          <span className={`${sizeMap[size].text} filter drop-shadow-md transform transition-transform duration-200`}>
            {mascot.emoji}
          </span>

          {/* Mood status overlay icon */}
          {mood === 'locked' && (
            <div className="absolute bottom-1 right-1 bg-amber-500 text-slate-950 rounded-full p-0.5 shadow-md">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          )}
          {mood === 'correct' && (
            <div className="absolute bottom-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-md">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {mood === 'wrong' && (
            <div className="absolute bottom-1 right-1 bg-rose-500 text-white rounded-full p-0.5 shadow-md">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Floating Badge */}
      {showBadge && (
        <div className="mt-1">
          <span
            className={`font-black uppercase tracking-wider rounded-full border shadow-sm transition-all duration-200 ${sizeMap[size].badgeText} ${
              mood === 'locked'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold'
                : mood === 'correct'
                ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-extrabold'
                : mood === 'winner'
                ? 'bg-yellow-400 text-slate-950 border-yellow-200 font-extrabold'
                : 'bg-slate-900/90 text-slate-200 border-slate-700'
            }`}
          >
            {moodBadges[mood]}
          </span>
        </div>
      )}
    </div>
  );
};
