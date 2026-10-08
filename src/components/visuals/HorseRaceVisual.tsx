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

// 6 Elite Thoroughbred & Jockey Teams
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
];

export const HorseRaceVisual: React.FC<HorseRaceProps> = ({
  students,
  isSpinning,
  hasCompleted,
  winner,
  selectedStudents,
  duration = 3800,
  allClassStudents,
}) => {
  // Resolve active winners (single or multiple)
  const activeWinners = useMemo(() => {
    if (selectedStudents && selectedStudents.length > 0) return selectedStudents;
    if (winner) return [winner];
    return [];
  }, [selectedStudents, winner]);

  // Select 5-6 racers, strictly including all active winners
  const racers = useMemo<HorseRacer[]>(() => {
    const winnerIds = new Set(activeWinners.map((w) => w.id));
    const nonWinners = students.filter((s) => !winnerIds.has(s.id));
    const targetSize = Math.max(5, Math.min(6, Math.max(students.length, activeWinners.length)));

    const pool = [...activeWinners];
    for (const nw of nonWinners) {
      if (pool.length >= targetSize) break;
      pool.push(nw);
    }

    return pool.map((student, idx) => {
      const stt = getStudentSTT(student, allClassStudents || students);
      return {
        id: student.id,
        student,
        stt,
        laneNumber: idx + 1,
        ...HORSE_TEAMS[idx % HORSE_TEAMS.length],
        surgeFreq: 1.5 + idx * 0.45,
        surgePhase: idx * 1.4,
      };
    });
  }, [students, activeWinners, allClassStudents]);

  const [animProgress, setAnimProgress] = useState(0);
  const [gallopFrame, setGallopFrame] = useState(0);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

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
    } else {
      setAnimProgress(0);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isSpinning, hasCompleted, duration]);

  return (
    <div className="w-full max-w-4xl py-2 px-2 select-none flex flex-col items-center">
      {/* Race Track Arena */}
      <div className="relative w-full rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-b from-slate-950 via-[#0d1726] to-slate-950 p-3 sm:p-5 shadow-2xl">
        {/* Derby Top Banner */}
        <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-2.5">
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
                <Flag className="w-3.5 h-3.5 text-amber-400" /> Chiến mã đã cán đích vinh quang!
              </span>
            ) : (
              <span className="text-slate-400">Nhấn QUAY TÊN để mở cổng xuất phát</span>
            )}
          </span>
        </div>

        {/* Real Racetrack Lanes */}
        <div className="relative z-10 space-y-2">
          {racers.map((racer, idx) => {
            const isWinner = activeWinners.some((w) => w.id === racer.id);
            const isEndingPhase = animProgress >= 0.85;

            // X-position (percentage across screen, 5% to 88%)
            let xPos = 5; // Starting gate

            if (animProgress > 0) {
              const baseRun = animProgress * 68;

              // During race (0 to 0.85): Dynamic surging & lead changes
              const surge =
                Math.sin(animProgress * Math.PI * 4 * racer.surgeFreq + racer.surgePhase) * 12 +
                Math.cos(animProgress * Math.PI * 6 + idx) * 8;

              if (!isEndingPhase) {
                // Anyone can lead in the first 85% of time!
                xPos = Math.max(5, Math.min(73, baseRun + surge));
              } else {
                // Final 15%: Winner breaks away and crosses the wire at 88%!
                const endLerp = (animProgress - 0.85) / 0.15;
                if (isWinner) {
                  xPos = 72 + endLerp * 16; // Crosses finish wire first (88%)!
                } else {
                  // Other horses stay between 60% and 72%
                  xPos = 60 + Math.sin(idx * 2) * 8;
                }
              }
            } else if (hasCompleted) {
              xPos = isWinner ? 88 : 62 + Math.sin(idx * 2) * 8;
            }

            // Bobbing motion matching gallop rhythm
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
                className={`relative h-15 sm:h-16 rounded-xl border transition-all duration-300 overflow-hidden flex items-center px-2 ${
                  isWinner && isEndingPhase
                    ? 'border-amber-400 bg-gradient-to-r from-slate-900 via-indigo-950/90 to-amber-500/20 shadow-lg ring-1 ring-amber-400/50'
                    : 'border-slate-800/80 bg-slate-900/70 hover:bg-slate-900/90'
                }`}
              >
                {/* Racetrack Turf / Sand Texture lines */}
                <div className="absolute inset-0 pointer-events-none opacity-15 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,rgba(255,255,255,0.05)_20px,rgba(255,255,255,0.05)_40px)]" />
                <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(90deg,rgba(16,185,129,0.1)_0%,transparent_50%,rgba(217,119,6,0.1)_100%)]" />

                {/* Left Stall Gate & Track Lane Number */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex items-center">
                  <div
                    style={{ backgroundColor: racer.jockeySilk, borderColor: racer.saddleBorder }}
                    className="w-6 h-6 rounded-lg text-white font-black text-xs flex items-center justify-center shadow-md border"
                    title={`Làn đua số ${racer.laneNumber}`}
                  >
                    L{racer.laneNumber}
                  </div>
                </div>

                {/* Distance Markers along Track */}
                <div className="absolute left-[25%] top-0 bottom-0 border-l border-dashed border-slate-700/40 pointer-events-none" />
                <div className="absolute left-[50%] top-0 bottom-0 border-l border-dashed border-slate-700/40 pointer-events-none" />
                <div className="absolute left-[75%] top-0 bottom-0 border-l border-dashed border-slate-700/40 pointer-events-none" />

                {/* Checkered Finish Line at 86% */}
                <div className="absolute right-6 sm:right-8 top-0 bottom-0 w-3 flex flex-col justify-between py-0.5 z-0 opacity-85 pointer-events-none">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 w-full ${i % 2 === 0 ? 'bg-amber-300' : 'bg-slate-900'}`}
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
                  className={`absolute z-20 flex items-center gap-2 pointer-events-none ${
                    isWinner && isEndingPhase ? 'scale-105' : 'scale-100'
                  }`}
                >
                  {/* Dynamic Dust Particles kicked up by hooves */}
                  {(animProgress > 0 || hasCompleted) && (
                    <div className="flex items-center gap-1 opacity-70 -mr-1">
                      <div className="w-2 h-1.5 rounded-full bg-amber-400/60 animate-ping" />
                      <div className="w-1.5 h-1 rounded-full bg-slate-300/80 animate-pulse" />
                    </div>
                  )}

                  {/* Refined Galloping Thoroughbred Horse SVG */}
                  <div className="relative w-18 h-13 sm:w-20 sm:h-14 drop-shadow-xl">
                    <svg viewBox="0 0 120 75" className="w-full h-full overflow-visible">
                      <defs>
                        {/* Shading gradient for horse body */}
                        <linearGradient id={`horse-body-${racer.id}`} x1="0%" y1="0%" x2="100%" y2="50%">
                          <stop offset="0%" stopColor={racer.horseHighlight} />
                          <stop offset="60%" stopColor={racer.horseColor} />
                          <stop offset="100%" stopColor="#1e1b18" />
                        </linearGradient>
                      </defs>

                      {/* Flowing Tail (swishing with gallop) */}
                      <path
                        d={
                          gallopFrame % 2 === 0
                            ? 'M 18 36 C 8 32, 2 38, 0 46 C 8 42, 14 42, 20 40 Z'
                            : 'M 18 36 C 6 28, 0 32, 0 42 C 8 38, 14 40, 20 40 Z'
                        }
                        fill={racer.maneColor}
                      />

                      {/* Hind Legs (Frame-based galloping motion) */}
                      {/* Hind Leg Left */}
                      <path
                        d={
                          gallopFrame === 0
                            ? 'M 24 38 Q 14 52, 6 66'
                            : gallopFrame === 1
                            ? 'M 24 38 Q 20 54, 16 68'
                            : gallopFrame === 2
                            ? 'M 24 38 Q 26 50, 24 64'
                            : 'M 24 38 Q 16 48, 8 62'
                        }
                        stroke={racer.horseColor}
                        strokeWidth="3.6"
                        strokeLinecap="round"
                        fill="none"
                      />
                      {/* Hind Leg Right */}
                      <path
                        d={
                          gallopFrame === 0
                            ? 'M 28 38 Q 20 50, 14 62'
                            : gallopFrame === 1
                            ? 'M 28 38 Q 24 52, 22 66'
                            : gallopFrame === 2
                            ? 'M 28 38 Q 18 48, 10 58'
                            : 'M 28 38 Q 26 52, 26 64'
                        }
                        stroke={racer.horseHighlight}
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                      />

                      {/* Main Horse Muscular Torso & Rump */}
                      <path
                        d="M 20 38 C 22 28, 38 28, 52 30 C 66 32, 74 28, 80 24 C 84 20, 80 14, 76 12 C 72 16, 68 20, 60 22 C 50 24, 38 26, 26 30 C 18 32, 16 36, 20 38 Z"
                        fill={`url(#horse-body-${racer.id})`}
                      />
                      {/* Barrel / Belly Contour */}
                      <path
                        d="M 22 36 C 30 46, 52 46, 64 36 C 66 32, 54 30, 22 36 Z"
                        fill={`url(#horse-body-${racer.id})`}
                      />

                      {/* Arched Neck & Head */}
                      <path
                        d="M 64 32 L 80 14 L 88 12 C 92 14, 94 18, 92 20 L 84 26 L 72 34 Z"
                        fill={`url(#horse-body-${racer.id})`}
                      />
                      {/* Horse Ears */}
                      <polygon points="86,10 90,6 90,12" fill={racer.horseHighlight} />
                      {/* Horse Eye */}
                      <circle cx="85" cy="14" r="1.5" fill="#ffffff" />
                      <circle cx="85.5" cy="14" r="0.8" fill="#0f172a" />
                      {/* Bridle & Muzzle */}
                      <circle cx="91" cy="18" r="2" fill="#0f172a" />
                      <line x1="84" y1="14" x2="90" y2="18" stroke="#f59e0b" strokeWidth="0.8" />

                      {/* Flowing Mane */}
                      <path
                        d="M 66 30 Q 72 20, 78 14 Q 74 18, 70 24"
                        stroke={racer.maneColor}
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        fill="none"
                      />

                      {/* Saddle Cloth (Numbered Saddle Pad in Team Silk) */}
                      <path
                        d="M 40 28 L 56 28 L 54 38 L 38 38 Z"
                        fill={racer.jockeySilk}
                        stroke={racer.saddleBorder}
                        strokeWidth="1.2"
                      />

                      {/* Jockey Athlete Silhouette in tuck position */}
                      {/* Jockey Cap with peak */}
                      <circle cx="48" cy="18" r="4.5" fill={racer.silkAccent} />
                      <path d="M 49 16 L 55 17 L 51 19 Z" fill="#0f172a" />
                      {/* Jockey Silk Body */}
                      <path
                        d="M 44 22 L 54 22 L 56 30 L 42 30 Z"
                        fill={racer.jockeySilk}
                        stroke="#ffffff"
                        strokeWidth="0.8"
                      />
                      {/* Jockey Arms holding reins */}
                      <path d="M 52 24 L 66 26" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
                      <line x1="66" y1="26" x2="84" y2="20" stroke="#f59e0b" strokeWidth="0.8" />

                      {/* Front Galloping Legs (Frame-based galloping motion) */}
                      {/* Front Leg Left */}
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
                      {/* Front Leg Right */}
                      <path
                        d={
                          gallopFrame === 0
                            ? 'M 68 36 Q 76 46, 84 54'
                            : gallopFrame === 1
                            ? 'M 68 36 Q 72 50, 74 64'
                            : gallopFrame === 2
                            ? 'M 68 36 Q 64 48, 58 62'
                            : 'M 68 36 Q 74 50, 86 62'
                        }
                        stroke={racer.horseHighlight}
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </svg>

                    {/* Winner Crown directly on top of champion horse */}
                    {isWinner && hasCompleted && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce">
                        <span className="text-xl filter drop-shadow">👑</span>
                      </div>
                    )}
                  </div>

                  {/* Clean STT Badge ONLY (No student name during the race) */}
                  <div
                    style={{
                      borderColor: isWinner && isEndingPhase ? '#f59e0b' : racer.saddleBorder,
                    }}
                    className={`px-2.5 py-1 rounded-full text-center border shadow-lg font-black text-xs sm:text-sm tracking-wider whitespace-nowrap transition-transform ${
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

          {/* Grand Victory Announcement inside track when completed */}
          {hasCompleted && activeWinners.length > 0 && (
            <div className="mt-2 text-center p-3 sm:p-4 rounded-2xl bg-slate-900/95 border-2 border-amber-400 shadow-xl shadow-amber-500/20 max-w-lg mx-auto animate-scale-in">
              <div className="text-[10px] font-black tracking-widest uppercase text-amber-400 flex items-center justify-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                {activeWinners.length === 1
                  ? 'CHIẾN MÃ CÁN ĐÍCH ĐẦU TIÊN!'
                  : `${activeWinners.length} HỌC SINH ĐƯỢC GỌI LÊN BẢNG!`}
              </div>

              {activeWinners.length === 1 ? (
                <>
                  <h2 className="text-2xl sm:text-4xl font-black text-amber-300 tracking-tight leading-tight mt-1 truncate">
                    👑 {activeWinners[0].name}
                  </h2>
                  <div className="text-xs font-bold text-slate-300 mt-1 flex items-center justify-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px]">
                      STT #{getStudentSTT(activeWinners[0], allClassStudents || students)}
                    </span>
                    <span>Lần thứ {activeWinners[0].callCount} lên bảng</span>
                  </div>
                </>
              ) : (
                <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 max-h-48 overflow-y-auto">
                  {activeWinners.map((w) => {
                    const stt = getStudentSTT(w, allClassStudents || students);
                    return (
                      <div
                        key={w.id}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800/95 border border-amber-400/80 text-amber-300 font-black text-sm sm:text-base shadow-md flex items-center gap-2"
                      >
                        <span className="text-amber-400">👑</span>
                        <span>#{stt}</span>
                        <span>{w.name}</span>
                        <span className="text-[11px] font-medium text-slate-300">
                          ({w.callCount} lần)
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 pt-2.5 mt-2 border-t border-slate-800/80">
          <span>🚩 Xuất phát từ cổng L1-L6 → Cán đích cờ ca-rô vàng bên phải</span>
          <span>Chiến mã bứt tốc cán đích đầu tiên sẽ chiến thắng!</span>
        </div>
      </div>
    </div>
  );
};
