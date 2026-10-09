import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Trophy, Flag } from 'lucide-react';
import { Student } from '../../types';
import { getStudentSTT } from '../../utils/studentDisplay';

interface HorseRaceProps {
  students: Student[];
  isSpinning: boolean;
  hasCompleted: boolean;
  winner: Student | null;
  selectedStudents?: Student[];
  duration?: number;
  allClassStudents?: Student[];
  onSelectStudentProfile?: (student: Student) => void;
}

interface HorseRacer {
  id: string;
  student: Student;
  stt: number;
  laneNumber: number;
  jockeySilk: string;
  silkAccent: string;
  saddleBorder: string;
  horseColor: string;
  horseHighlight: string;
  maneColor: string;
  surgeFreq: number;
  surgePhase: number;
}

// 8 Elite Thoroughbred & Jockey Teams
const HORSE_TEAMS = [
  {
    jockeySilk: '#2563eb', // Team Blue
    silkAccent: '#60a5fa',
    saddleBorder: '#1d4ed8',
    horseColor: '#78350f', // Chestnut
    horseHighlight: '#9a3412',
    maneColor: '#451a03',
  },
  {
    jockeySilk: '#dc2626', // Team Crimson
    silkAccent: '#f87171',
    saddleBorder: '#b91c1c',
    horseColor: '#1e293b', // Midnight Black
    horseHighlight: '#334155',
    maneColor: '#0f172a',
  },
  {
    jockeySilk: '#059669', // Team Emerald
    silkAccent: '#34d399',
    saddleBorder: '#047857',
    horseColor: '#92400e', // Bay Brown
    horseHighlight: '#b45309',
    maneColor: '#451a03',
  },
  {
    jockeySilk: '#d97706', // Team Amber
    silkAccent: '#fbbf24',
    saddleBorder: '#b45309',
    horseColor: '#475569', // Dapple Grey
    horseHighlight: '#64748b',
    maneColor: '#1e293b',
  },
  {
    jockeySilk: '#7c3aed', // Team Royal Purple
    silkAccent: '#a78bfa',
    saddleBorder: '#6d28d9',
    horseColor: '#854d0e', // Golden Sorrel
    horseHighlight: '#a16207',
    maneColor: '#581c87',
  },
  {
    jockeySilk: '#0891b2', // Team Cyan
    silkAccent: '#22d3ee',
    saddleBorder: '#0e7490',
    horseColor: '#52525b', // Slate Thoroughbred
    horseHighlight: '#71717a',
    maneColor: '#27272a',
  },
  {
    jockeySilk: '#ea580c', // Team Tangerine
    silkAccent: '#fb923c',
    saddleBorder: '#c2410c',
    horseColor: '#713f12', // Dark Sorrel
    horseHighlight: '#a16207',
    maneColor: '#361e05',
  },
  {
    jockeySilk: '#db2777', // Team Ruby Rose
    silkAccent: '#f472b6',
    saddleBorder: '#be185d',
    horseColor: '#3f3f46', // Charcoal
    horseHighlight: '#52525b',
    maneColor: '#18181b',
  },
];

export const HorseRaceVisual: React.FC<HorseRaceProps> = ({
  students,
  isSpinning,
  hasCompleted,
  winner,
  selectedStudents,
  duration = 3800,
  allClassStudents,
  onSelectStudentProfile,
}) => {
  // Resolve active winners strictly from allClassStudents || students by id
  const activeWinners = useMemo(() => {
    const raw = (selectedStudents && selectedStudents.length > 0)
      ? selectedStudents
      : (winner ? [winner] : []);
    const sourcePool = allClassStudents || students;
    return raw.map((w) => sourcePool.find((s) => s.id === w.id) || w);
  }, [selectedStudents, winner, allClassStudents, students]);

  // 1 STUDENT = EXACTLY 1 HORSE (NO SLICE, NO HARDCODED LIMITS)
  const racers = useMemo<HorseRacer[]>(() => {
    if (!students || students.length === 0) return [];

    return students.map((student, idx) => {
      const stt = getStudentSTT(student, allClassStudents || students);
      return {
        id: student.id,
        student,
        stt,
        laneNumber: idx + 1,
        ...HORSE_TEAMS[idx % HORSE_TEAMS.length],
        surgeFreq: 1.5 + (idx % 7) * 0.45,
        surgePhase: idx * 1.35,
      };
    });
  }, [students, allClassStudents]);

  // Adaptive lane & horse styling based on count
  const adaptiveConfig = useMemo(() => {
    const count = racers.length;
    if (count <= 8) {
      // Large
      return {
        laneHeight: 'h-13 sm:h-15',
        horseSize: 'w-16 h-11 sm:w-20 sm:h-14',
        laneBadge: 'w-6 h-6 text-xs',
        sttBadge: 'px-2.5 py-1 text-xs sm:text-sm',
      };
    }
    if (count <= 18) {
      // Medium
      return {
        laneHeight: 'h-10 sm:h-11',
        horseSize: 'w-13 h-9 sm:w-15 sm:h-10',
        laneBadge: 'w-5 h-5 text-[10px]',
        sttBadge: 'px-2 py-0.5 text-[10px] sm:text-xs',
      };
    }
    if (count <= 30) {
      // Small
      return {
        laneHeight: 'h-8 sm:h-9',
        horseSize: 'w-11 h-7 sm:w-13 sm:h-8',
        laneBadge: 'w-4.5 h-4.5 text-[9px]',
        sttBadge: 'px-1.5 py-0.2 text-[9px] sm:text-[10px]',
      };
    }
    // 31 - 45+ Compact
    return {
      laneHeight: 'h-7 sm:h-7.5',
      horseSize: 'w-9 h-6 sm:w-11 sm:h-7',
      laneBadge: 'w-4 h-4 text-[8px]',
      sttBadge: 'px-1 py-0.1 text-[8px] sm:text-[9px]',
    };
  }, [racers.length]);

  const [animProgress, setAnimProgress] = useState(0);
  const [gallopFrame, setGallopFrame] = useState(0);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const trackContainerRef = useRef<HTMLDivElement>(null);
  const winnerLaneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isSpinning) {
      setAnimProgress(0);
      startTimeRef.current = performance.now();

      const loop = (now: number) => {
        const elapsed = now - startTimeRef.current;
        const p = Math.min(1, elapsed / duration);
        setAnimProgress(p);
        setGallopFrame(Math.floor((elapsed / 80) % 4));

        if (p < 1) {
          animRef.current = requestAnimationFrame(loop);
        }
      };

      animRef.current = requestAnimationFrame(loop);
    } else if (hasCompleted) {
      setAnimProgress(1);
      // Auto-scroll to winner lane smoothly if scrollable
      if (winnerLaneRef.current) {
        winnerLaneRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else {
      setAnimProgress(0);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isSpinning, hasCompleted, duration]);

  const count = racers.length;

  return (
    <div className="w-full max-w-4xl py-2 px-2 select-none flex flex-col items-center">
      {/* Race Track Arena */}
      <div className="relative w-full rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-b from-slate-950 via-[#0d1726] to-slate-950 p-3 sm:p-5 shadow-2xl">
        {/* Derby Top Banner */}
        <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black tracking-widest uppercase text-indigo-400">
              TRƯỜNG ĐUA CHIẾN MÃ DERBY
            </span>
          </div>
          <span className="text-xs font-medium text-slate-300">
            {isSpinning ? (
              <span className="text-sky-300 font-bold animate-pulse flex items-center gap-1.5">
                🏇 Các chiến mã đang phi nước đại và bứt tốc...
              </span>
            ) : hasCompleted ? (
              <span className="text-amber-300 font-bold flex items-center gap-1">
                <Flag className="w-3.5 h-3.5 text-amber-400" />
                {activeWinners.length > 1
                  ? `Đã có ${activeWinners.length} chiến mã cán đích vinh quang!`
                  : 'Chiến mã đã cán đích vinh quang!'}
              </span>
            ) : (
              <span className="text-slate-400">
                {count > 0
                  ? `Hiện có ${count} chiến mã (${count} HS) tại cổng xuất phát • Nhấn QUAY TÊN để xuất phát`
                  : 'Chưa có học sinh phù hợp bộ lọc'}
              </span>
            )}
          </span>
        </div>

        {/* Real Racetrack Lanes (Adaptive & Scrollable for crowded classes) */}
        <div
          ref={trackContainerRef}
          className="relative z-10 space-y-1 sm:space-y-1.5 max-h-[350px] sm:max-h-[410px] overflow-y-auto pr-1"
        >
          {racers.map((racer, idx) => {
            const isWinner = activeWinners.some((w) => w.id === racer.id);
            const isEndingPhase = animProgress >= 0.85;

            // X-position (percentage across screen, 5% to 88%)
            let xPos = 5;

            if (animProgress > 0) {
              const baseRun = animProgress * 68;
              const surge =
                Math.sin(animProgress * Math.PI * 4 * racer.surgeFreq + racer.surgePhase) * 11 +
                Math.cos(animProgress * Math.PI * 6 + idx) * 7;

              if (!isEndingPhase) {
                xPos = Math.max(5, Math.min(73, baseRun + surge));
              } else {
                const endLerp = (animProgress - 0.85) / 0.15;
                if (isWinner) {
                  xPos = 72 + endLerp * 16; // Crosses finish wire first (88%)!
                } else {
                  xPos = 58 + Math.sin(idx * 2) * 8;
                }
              }
            } else if (hasCompleted) {
              xPos = isWinner ? 88 : 58 + Math.sin(idx * 2) * 8;
            }

            const yBob = isSpinning
              ? gallopFrame === 0
                ? -2
                : gallopFrame === 2
                ? 2
                : 0
              : 0;

            return (
              <div
                key={racer.id}
                ref={isWinner ? winnerLaneRef : null}
                className={`relative ${adaptiveConfig.laneHeight} rounded-xl border transition-all duration-300 overflow-hidden flex items-center px-2 ${
                  isWinner && isEndingPhase
                    ? 'border-amber-400 bg-gradient-to-r from-slate-900 via-indigo-950/90 to-amber-500/25 shadow-lg ring-1 ring-amber-400/50'
                    : 'border-slate-800/80 bg-slate-900/70 hover:bg-slate-900/90'
                }`}
              >
                {/* Racetrack Turf texture */}
                <div className="absolute inset-0 pointer-events-none opacity-15 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,rgba(255,255,255,0.05)_20px,rgba(255,255,255,0.05)_40px)]" />

                {/* Left Stall Gate & Track Lane Number */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex items-center">
                  <div
                    style={{ backgroundColor: racer.jockeySilk, borderColor: racer.saddleBorder }}
                    className={`${adaptiveConfig.laneBadge} rounded-lg text-white font-black flex items-center justify-center shadow-md border`}
                    title={`Làn đua số ${racer.laneNumber}`}
                  >
                    L{racer.laneNumber}
                  </div>
                </div>

                {/* Distance Markers */}
                <div className="absolute left-[25%] top-0 bottom-0 border-l border-dashed border-slate-700/40 pointer-events-none" />
                <div className="absolute left-[50%] top-0 bottom-0 border-l border-dashed border-slate-700/40 pointer-events-none" />
                <div className="absolute left-[75%] top-0 bottom-0 border-l border-dashed border-slate-700/40 pointer-events-none" />

                {/* Checkered Finish Line at 86% */}
                <div className="absolute right-5 sm:right-7 top-0 bottom-0 w-2.5 sm:w-3 flex flex-col justify-between py-0.5 z-0 opacity-85 pointer-events-none">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 sm:h-2 w-full ${i % 2 === 0 ? 'bg-amber-300' : 'bg-slate-900'}`}
                    />
                  ))}
                </div>

                {/* Running Horse & STT Badge */}
                <div
                  style={{
                    left: `${xPos}%`,
                    top: `calc(50% + ${yBob}px)`,
                    transform: 'translate(-50%, -50%)',
                    transition: isEndingPhase ? 'left 0.25s ease-out' : 'none',
                  }}
                  onClick={() => onSelectStudentProfile?.(racer.student)}
                  className={`absolute z-20 flex items-center gap-1.5 transition-transform ${
                    onSelectStudentProfile ? 'cursor-pointer hover:scale-125 hover:z-30' : ''
                  } ${
                    isWinner && isEndingPhase ? 'scale-105' : 'scale-100'
                  }`}
                  title={onSelectStudentProfile ? `Bấm để xem Thẻ học sinh: ${racer.student.name} (STT #${racer.stt})` : undefined}
                >
                  {/* Dust Particles */}
                  {(animProgress > 0 || hasCompleted) && (
                    <div className="flex items-center gap-1 opacity-70 -mr-1">
                      <div className="w-1.5 h-1 rounded-full bg-amber-400/60 animate-ping" />
                    </div>
                  )}

                  {/* Galloping Thoroughbred Horse SVG */}
                  <div className={`relative ${adaptiveConfig.horseSize} drop-shadow-xl`}>
                    <svg viewBox="0 0 120 75" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id={`horse-body-${racer.id}`} x1="0%" y1="0%" x2="100%" y2="50%">
                          <stop offset="0%" stopColor={racer.horseHighlight} />
                          <stop offset="60%" stopColor={racer.horseColor} />
                          <stop offset="100%" stopColor="#1e1b18" />
                        </linearGradient>
                      </defs>

                      {/* Tail */}
                      <path
                        d={
                          gallopFrame % 2 === 0
                            ? 'M 18 36 C 8 40, 2 54, 8 68 C 12 56, 16 48, 22 42 Z'
                            : 'M 18 36 C 6 34, 0 46, 6 60 C 10 50, 14 44, 22 42 Z'
                        }
                        fill={racer.maneColor}
                        opacity="0.9"
                      />

                      {/* Back Legs */}
                      <path
                        d={
                          gallopFrame === 0
                            ? 'M 24 38 Q 12 54, 4 64'
                            : gallopFrame === 1
                            ? 'M 24 38 Q 18 52, 14 66'
                            : gallopFrame === 2
                            ? 'M 24 38 Q 28 50, 32 66'
                            : 'M 24 38 Q 16 48, 8 58'
                        }
                        stroke={racer.horseColor}
                        strokeWidth="3.6"
                        strokeLinecap="round"
                        fill="none"
                      />

                      {/* Horse Muscular Body */}
                      <path
                        d="M 22 36 C 22 28, 38 28, 48 30 C 58 32, 64 26, 70 18 C 76 10, 84 8, 92 12 C 94 14, 98 16, 94 20 C 88 24, 82 26, 78 34 C 74 42, 68 46, 52 46 C 36 46, 26 44, 22 36 Z"
                        fill={`url(#horse-body-${racer.id})`}
                        stroke="#0f172a"
                        strokeWidth="1.2"
                      />

                      {/* Mane */}
                      <path d="M 68 18 Q 72 26, 66 32" stroke={racer.maneColor} strokeWidth="3" strokeLinecap="round" />

                      {/* Saddle Cloth */}
                      <path
                        d="M 40 30 L 54 30 L 52 38 L 38 38 Z"
                        fill={racer.jockeySilk}
                        stroke={racer.saddleBorder}
                        strokeWidth="1"
                      />

                      {/* Jockey */}
                      <circle cx="46" cy="18" r="4.5" fill={racer.jockeySilk} stroke="#ffffff" strokeWidth="0.8" />
                      <path d="M 42 22 L 50 20 L 48 30 L 42 28 Z" fill={racer.silkAccent} />

                      {/* Front Galloping Legs */}
                      <path
                        d={
                          gallopFrame === 0
                            ? 'M 66 36 Q 80 48, 92 56'
                            : gallopFrame === 1
                            ? 'M 66 36 Q 78 52, 84 66'
                            : gallopFrame === 2
                            ? 'M 66 36 Q 72 50, 70 66'
                            : 'M 66 36 Q 60 48, 54 60'
                        }
                        stroke={racer.horseColor}
                        strokeWidth="3.6"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </svg>

                    {/* Winner Crown on top of champion horse */}
                    {isWinner && hasCompleted && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 animate-bounce">
                        <span className="text-base sm:text-xl filter drop-shadow">👑</span>
                      </div>
                    )}
                  </div>

                  {/* Clean STT Badge */}
                  <div
                    style={{
                      borderColor: isWinner && isEndingPhase ? '#f59e0b' : racer.saddleBorder,
                    }}
                    className={`${adaptiveConfig.sttBadge} rounded-full text-center border shadow-lg font-black tracking-wider whitespace-nowrap transition-transform ${
                      isWinner && isEndingPhase
                        ? 'bg-amber-400 text-slate-950 scale-110 shadow-amber-400/50 ring-2 ring-amber-300'
                        : 'bg-slate-950/95 text-white border-2'
                    }`}
                  >
                    #{racer.stt}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Grand Victory Announcement inside track when completed */}
        {hasCompleted && activeWinners.length > 0 && (
          <div className="mt-2 text-center p-3 sm:p-4 rounded-2xl bg-slate-900/95 border-2 border-amber-400 shadow-xl shadow-amber-500/20 max-w-lg mx-auto animate-scale-in">
            <div className="text-[10px] font-black tracking-widest uppercase text-amber-400 flex items-center justify-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              {activeWinners.length === 1
                ? 'CHIẾN MÃ CÁN ĐÍCH ĐẦU TIÊN!'
                : `${activeWinners.length} CHIẾN MÃ CÁN ĐÍCH XUẤT SẮC!`}
            </div>

            {activeWinners.length === 1 ? (
              <>
                <h2
                  onClick={() => onSelectStudentProfile?.(activeWinners[0])}
                  className={`text-2xl sm:text-3xl font-black text-amber-300 tracking-tight leading-tight mt-1 truncate px-2 ${
                    onSelectStudentProfile ? 'cursor-pointer hover:underline hover:text-white transition-colors' : ''
                  }`}
                  title={onSelectStudentProfile ? `Bấm để xem Thẻ học sinh: ${activeWinners[0].name}` : undefined}
                >
                  👑 {activeWinners[0].name}
                </h2>
                <div className="text-xs font-bold text-slate-300 mt-1 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectStudentProfile?.(activeWinners[0])}
                    className={`px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] ${
                      onSelectStudentProfile ? 'hover:bg-amber-400/30 cursor-pointer transition-colors' : ''
                    }`}
                    title={onSelectStudentProfile ? 'Bấm để xem Thẻ học sinh' : undefined}
                  >
                    STT #{getStudentSTT(activeWinners[0], allClassStudents || students)}
                  </button>
                  <span>Lần thứ {Math.max(1, activeWinners[0].callCount ?? 1)} lên bảng</span>
                </div>
              </>
            ) : (
              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 max-h-48 overflow-y-auto">
                {activeWinners.map((w) => {
                  const stt = getStudentSTT(w, allClassStudents || students);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => onSelectStudentProfile?.(w)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800/95 hover:bg-slate-750 border border-amber-400/80 hover:border-amber-300 text-amber-300 hover:text-white font-black text-sm sm:text-base shadow-md flex items-center gap-2 cursor-pointer hover:scale-105 transition-all text-left"
                      title="Bấm để xem Thẻ học sinh"
                    >
                      <span className="text-amber-400">👑</span>
                      <span>#{stt}</span>
                      <span className="hover:underline">{w.name}</span>
                      <span className="text-[11px] font-medium text-slate-300">
                        ({Math.max(1, w.callCount ?? 1)} lần)
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 pt-2 mt-1.5 border-t border-slate-800/80">
          <span>🚩 Mỗi học sinh = 1 chiến mã ({count} làn đua) • Cán đích cờ ca-rô bên phải</span>
          <span>Chiến mã bứt tốc cán đích đầu tiên sẽ chiến thắng!</span>
        </div>
      </div>
    </div>
  );
};
