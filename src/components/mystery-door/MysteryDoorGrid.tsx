import React, { useState } from 'react';
import { ReviewQuestion } from '../../types';
import { HelpCircle, Lock, Sparkles, CheckCircle2, Unlock } from 'lucide-react';

export interface MysteryDoorItem {
  doorNumber: number;
  question: ReviewQuestion;
  isOpened?: boolean;
}

interface MysteryDoorGridProps {
  doors: MysteryDoorItem[];
  onSelectDoor: (door: MysteryDoorItem) => void;
  disabled?: boolean;
}

export const MysteryDoorGrid: React.FC<MysteryDoorGridProps> = ({
  doors,
  onSelectDoor,
  disabled = false,
}) => {
  const [openingDoorNumber, setOpeningDoorNumber] = useState<number | null>(null);

  const handleDoorClick = (door: MysteryDoorItem) => {
    if (disabled || door.isOpened || openingDoorNumber !== null) return;

    setOpeningDoorNumber(door.doorNumber);
    // Smooth door opening suspense animation
    setTimeout(() => {
      onSelectDoor(door);
      setOpeningDoorNumber(null);
    }, 450);
  };

  // Determine grid layout based on number of doors
  const getGridColsClass = () => {
    switch (doors.length) {
      case 2:
        return 'grid-cols-2 max-w-2xl';
      case 4:
        return 'grid-cols-2 max-w-2xl';
      case 6:
        return 'grid-cols-2 sm:grid-cols-3 max-w-4xl';
      case 8:
        return 'grid-cols-2 sm:grid-cols-4 max-w-5xl';
      case 10:
        return 'grid-cols-2 sm:grid-cols-5 max-w-6xl';
      default:
        return 'grid-cols-2 sm:grid-cols-4 max-w-4xl';
    }
  };

  return (
    <div className={`grid gap-4 sm:gap-6 mx-auto w-full ${getGridColsClass()}`}>
      {doors.map((door) => {
        const isOpening = openingDoorNumber === door.doorNumber;
        const isOpened = !!door.isOpened;
        const isOtherLocked = openingDoorNumber !== null && openingDoorNumber !== door.doorNumber;

        if (isOpened) {
          // Render door in OPENED / COMPLETED state (disabled, dimmed, shows badge)
          return (
            <div
              key={door.doorNumber}
              className="relative rounded-3xl p-5 sm:p-7 flex flex-col items-center justify-between text-center select-none overflow-hidden aspect-[3/4] sm:aspect-[4/5] bg-slate-900/40 border border-slate-800 text-slate-500 opacity-60 cursor-not-allowed shadow-inner"
            >
              {/* Top status */}
              <div className="flex items-center justify-between w-full text-slate-500">
                <span className="text-[10px] sm:text-xs font-mono font-bold tracking-wider uppercase">
                  Ô CỬA #{door.doorNumber}
                </span>
                <Unlock className="w-3.5 h-3.5 text-emerald-500/80" />
              </div>

              {/* Center Door Number & Opened Icon */}
              <div className="my-auto flex flex-col items-center justify-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-600 line-through">
                  {door.doorNumber}
                </div>
              </div>

              {/* Bottom Badge */}
              <div className="w-full flex items-center justify-center">
                <span className="text-[11px] font-bold text-emerald-400/90 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full uppercase tracking-wider">
                  Đã mở
                </span>
              </div>
            </div>
          );
        }

        return (
          <button
            key={door.doorNumber}
            type="button"
            disabled={disabled || openingDoorNumber !== null}
            onClick={() => handleDoorClick(door)}
            className={`group relative rounded-3xl p-5 sm:p-7 flex flex-col items-center justify-between transition-all duration-300 text-center select-none overflow-hidden aspect-[3/4] sm:aspect-[4/5] cursor-pointer ${
              isOpening
                ? 'scale-105 ring-4 ring-amber-400 bg-gradient-to-b from-amber-500/40 via-purple-900/60 to-slate-950 shadow-2xl shadow-amber-500/50'
                : isOtherLocked || disabled
                ? 'opacity-40 scale-95 bg-slate-900/80 border border-slate-800 cursor-not-allowed'
                : 'bg-gradient-to-b from-slate-850 via-slate-900 to-slate-950 border-2 border-amber-500/30 hover:border-amber-400 hover:shadow-2xl hover:shadow-amber-500/20 hover:-translate-y-1'
            }`}
          >
            {/* Ambient Background Aura */}
            <div className="absolute inset-0 bg-radial from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            {/* Top Badge: Mystery Icon */}
            <div className="flex items-center justify-between w-full text-amber-400/80">
              <span className="text-[10px] sm:text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Ô CỬA</span>
              </span>
              <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400/60 group-hover:text-amber-300 transition-colors" />
            </div>

            {/* Center: Large Door Number with Depth & Glow */}
            <div className="my-auto flex flex-col items-center justify-center space-y-1">
              <div
                className={`text-5xl sm:text-7xl font-black font-mono tracking-tight transition-all duration-300 ${
                  isOpening
                    ? 'text-amber-300 scale-110 drop-shadow-[0_0_20px_rgba(245,158,11,0.8)]'
                    : 'text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-orange-500 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] group-hover:scale-110'
                }`}
              >
                {door.doorNumber}
              </div>
              <div className="w-8 h-1 bg-amber-500/30 rounded-full group-hover:w-14 group-hover:bg-amber-400 transition-all duration-300" />
            </div>

            {/* Bottom: Mystery Hint */}
            <div className="w-full flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold text-amber-300/80 group-hover:text-amber-200 transition-colors">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>{isOpening ? 'Đang mở cửa...' : 'Bấm để mở'}</span>
            </div>

            {/* Shimmer overlay when opening */}
            {isOpening && (
              <div className="absolute inset-0 bg-gradient-to-t from-amber-400/20 via-white/10 to-transparent animate-pulse pointer-events-none" />
            )}
          </button>
        );
      })}
    </div>
  );
};
