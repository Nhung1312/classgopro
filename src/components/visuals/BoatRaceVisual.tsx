import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Trophy, Waves, Ship } from 'lucide-react';
import { Student } from '../../types';
import { getStudentSTT } from '../../utils/studentDisplay';

interface BoatRaceProps {
  students: Student[];
  isSpinning: boolean;
  hasCompleted: boolean;
  winner: Student | null;
  selectedStudents?: Student[];
  duration?: number;
  allClassStudents?: Student[];
}

interface BoatRacer {
  id: string;
  student: Student;
  stt: number;
  hullColor: string;
  hullAccent: string;
  oarColor: string;
  yLanePercent: number; // Vertical depth position in water lane (14% to 80%)
  strokeFreq: number;
  strokePhase: number;
}

// 6 Vibrant Rowing / Racing Team Themes matching ClassGo dark theme
const BOAT_THEMES = [
  { hullColor: '#0284c7', hullAccent: '#38bdf8', oarColor: '#bae6fd' }, // Cyan / Sky
  { hullColor: '#4f46e5', hullAccent: '#818cf8', oarColor: '#c7d2fe' }, // Indigo
  { hullColor: '#059669', hullAccent: '#34d399', oarColor: '#a7f3d0' }, // Emerald
  { hullColor: '#d97706', hullAccent: '#fbbf24', oarColor: '#fde68a' }, // Amber
  { hullColor: '#dc2626', hullAccent: '#f87171', oarColor: '#fecaca' }, // Crimson
  { hullColor: '#7c3aed', hullAccent: '#c084fc', oarColor: '#e9d5ff' }, // Royal Purple
];

export const BoatRaceVisual: React.FC<BoatRaceProps> = ({
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

  // Select 5-6 boat racers, strictly including all active winners
  const racers = useMemo<BoatRacer[]>(() => {
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
        ...BOAT_THEMES[idx % BOAT_THEMES.length],
        yLanePercent: 14 + idx * 16, // Staggered vertical water lanes
        strokeFreq: 1.6 + idx * 0.35,
        strokePhase: idx * 1.5,
      };
    });
  }, [students, activeWinners, allClassStudents]);

  const [animProgress, setAnimProgress] = useState(0);
  const [rowStroke, setRowStroke] = useState(0); // Rowing cycle (0 or 1)
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
        setRowStroke(Math.floor((elapsed / 160) % 2));

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
      {/* Open Water Regatta Arena */}
      <div className="relative w-full rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-b from-slate-950 via-[#07192f] to-[#091b33] p-3 sm:p-5 shadow-2xl h-[420px] sm:h-[460px] flex flex-col justify-between">
        {/* Animated Water Surface & Ripples */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Water gradient glows */}
          <div className="absolute top-1/4 left-1/3 w-80 h-80 rounded-full bg-cyan-950/25 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-indigo-950/25 blur-3xl" />

          {/* Flowing river wave lines */}
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="boat-river-waves" width="90" height="24" patternUnits="userSpaceOnUse">
                  <path d="M 0 12 Q 22.5 6, 45 12 T 90 12" fill="none" stroke="#38bdf8" strokeWidth="1.2" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#boat-river-waves)" />
            </svg>
          </div>

          {/* Water lane dividers (subtle dashed buoy lanes) */}
          {[27, 44, 61, 78].map((topPercent) => (
            <div
              key={topPercent}
              style={{ top: `${topPercent}%` }}
              className="absolute left-6 right-16 border-b border-dashed border-sky-500/15"
            />
          ))}
        </div>

        {/* Top Header Information */}
        <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
          <div className="flex items-center gap-2">
            <Waves className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-black tracking-widest uppercase text-indigo-400">
              GIẢI ĐUA THUYỀN SÔNG NƯỚC
            </span>
          </div>
          <span className="text-xs font-medium text-slate-300">
            {isSpinning ? (
              <span className="text-sky-300 font-bold animate-pulse">
                🚣 Các đội thuyền đang rẽ sóng so kè từng nhịp chèo...
              </span>
            ) : hasCompleted ? (
              <span className="text-amber-300 font-bold flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-400" /> Chiếc thuyền về đích đầu tiên đã chiến thắng!
              </span>
            ) : (
              <span className="text-slate-400">Nhấn QUAY TÊN để bắt đầu cuộc đua thuyền</span>
            )}
          </span>
        </div>

        {/* Arena: Open Water Surface where boats race */}
        <div className="relative z-10 flex-1 w-full h-full overflow-hidden">
          {/* Starting line on left bank */}
          <div className="absolute left-4 top-2 bottom-2 w-1 border-r-2 border-dashed border-sky-400/30" />

          {/* Floating Checkered Finish Buoy Line at 86% */}
          <div className="absolute right-8 sm:right-10 top-2 bottom-2 w-3 flex flex-col justify-around items-center opacity-85 pointer-events-none">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full border border-white/60 shadow-md ${
                  i % 2 === 0 ? 'bg-amber-400' : 'bg-red-500'
                }`}
              />
            ))}
          </div>

          {/* Racing Boats with Water Spray Wake & Names */}
          {racers.map((racer, idx) => {
            const isWinner = activeWinners.some((w) => w.id === racer.id);
            const isEndingPhase = animProgress >= 0.85;

            // X-position (percentage across river, 6% to 88%)
            let xPos = 6; // Start near left bank

            if (animProgress > 0) {
              const baseSwim = animProgress * 68;

              // During race (0 to 0.85): Dynamic surges & rank shifts
              const surge =
                Math.sin(animProgress * Math.PI * 4 * racer.strokeFreq + racer.strokePhase) * 12 +
                Math.cos(animProgress * Math.PI * 6 + idx) * 8;

              if (!isEndingPhase) {
                // Anyone can lead in the first 85% of time!
                xPos = Math.max(6, Math.min(73, baseSwim + surge));
              } else {
                // Final 15%: Winner boat powers ahead across finish buoys!
                const endLerp = (animProgress - 0.85) / 0.15;
                if (isWinner) {
                  xPos = 72 + endLerp * 16; // Crosses finish line at 88%!
                } else {
                  // Other boats stay behind between 60% and 72%
                  xPos = 62 + Math.sin(idx * 2) * 8;
                }
              }
            } else if (hasCompleted) {
              xPos = isWinner ? 88 : 62 + Math.sin(idx * 2) * 8;
            }

            // Natural wave bobbing
            const yBob = Math.sin((animProgress * 12 + idx) * Math.PI) * 2.5;

            return (
              <div
                key={racer.id}
                style={{
                  left: `${xPos}%`,
                  top: `calc(${racer.yLanePercent}% + ${yBob}px)`,
                  transform: 'translate(-50%, -50%)',
                  transition: isEndingPhase ? 'left 0.25s ease-out' : 'none',
                  zIndex: isWinner && isEndingPhase ? 30 : 10 + idx,
                }}
                className={`absolute flex items-center gap-1.5 pointer-events-none ${
                  isWinner && isEndingPhase ? 'scale-110' : 'scale-100'
                }`}
              >
                {/* Water spray & Wake foam trail behind boat */}
                {(animProgress > 0 || hasCompleted) && (
                  <div className="flex items-center gap-1 opacity-80 -mr-1 pointer-events-none">
                    <div className="w-3.5 h-1.5 rounded-full bg-cyan-200/90 animate-ping" />
                    <div className="w-5 h-1 rounded-full bg-white/80 animate-pulse" />
                    <div className="w-2.5 h-1 rounded-full bg-sky-300/60" />
                  </div>
                )}

                {/* Sleek Racing Boat SVG */}
                <div
                  className={`relative w-18 h-12 sm:w-22 sm:h-14 drop-shadow-xl transition-transform ${
                    isSpinning && rowStroke === 1
                      ? '-translate-y-0.5 rotate-[-1.5deg]'
                      : 'translate-y-0.5 rotate-[1.5deg]'
                  }`}
                >
                  <svg viewBox="0 0 130 70" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id={`hull-grad-${racer.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={racer.hullColor} />
                        <stop offset="60%" stopColor={racer.hullAccent} />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
                      </linearGradient>

                      <linearGradient id={`deck-grad-${racer.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0f172a" />
                        <stop offset="100%" stopColor="#1e293b" />
                      </linearGradient>
                    </defs>

                    {/* Dual Rowing Oars (Animated pulling motion) */}
                    <g
                      transform={
                        isSpinning && rowStroke === 1
                          ? 'rotate(-14 62 35)'
                          : 'rotate(14 62 35)'
                      }
                      className="transition-transform duration-150"
                    >
                      {/* Top Port Oar */}
                      <line x1="30" y1="10" x2="68" y2="35" stroke={racer.oarColor} strokeWidth="3" strokeLinecap="round" />
                      <ellipse cx="28" cy="9" rx="9" ry="4.5" fill={racer.hullAccent} stroke="#ffffff" strokeWidth="1" transform="rotate(-30 28 9)" />
                      {/* Top Oar Splash Ripple */}
                      {isSpinning && (
                        <circle cx="28" cy="9" r="4" fill="none" stroke="#e0f2fe" strokeWidth="1" opacity="0.7" />
                      )}

                      {/* Bottom Starboard Oar */}
                      <line x1="30" y1="60" x2="68" y2="35" stroke={racer.oarColor} strokeWidth="3" strokeLinecap="round" />
                      <ellipse cx="28" cy="61" rx="9" ry="4.5" fill={racer.hullAccent} stroke="#ffffff" strokeWidth="1" transform="rotate(30 28 61)" />
                      {/* Bottom Oar Splash Ripple */}
                      {isSpinning && (
                        <circle cx="28" cy="61" r="4" fill="none" stroke="#e0f2fe" strokeWidth="1" opacity="0.7" />
                      )}
                    </g>

                    {/* Aerodynamic Racing Hull */}
                    {/* Stern on left (10, 35) -> Sharp pointed Bow on right (124, 35) */}
                    <path
                      d="M 10 35 C 16 22, 65 20, 124 35 C 65 50, 16 48, 10 35 Z"
                      fill={`url(#hull-grad-${racer.id})`}
                      stroke="#0f172a"
                      strokeWidth="2"
                    />

                    {/* Cockpit / Rowing Deck Recess */}
                    <ellipse cx="62" cy="35" rx="38" ry="7.5" fill={`url(#deck-grad-${racer.id})`} />

                    {/* High-speed Racing Stripe */}
                    <path
                      d="M 28 35 L 112 35"
                      stroke="#ffffff"
                      strokeWidth="2"
                      strokeDasharray="5 2.5"
                      opacity="0.95"
                    />

                    {/* Stern Flag / Fin */}
                    <polygon points="12,35 6,24 18,28" fill={racer.hullAccent} stroke="#ffffff" strokeWidth="0.8" />

                    {/* Rower Athlete Silhouette in Rowing Action */}
                    {/* Head / Visor */}
                    <circle cx="62" cy="35" r="6" fill="#f8fafc" stroke={racer.hullColor} strokeWidth="1.8" />
                    {/* Athletic Torso / Shoulders */}
                    <path d="M 58 35 Q 63 30, 70 35" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" />

                    {/* Bow Wave Slicing Splash at pointed front */}
                    <path
                      d="M 120 35 Q 128 28, 124 22 M 120 35 Q 128 42, 124 48"
                      stroke="#e0f2fe"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.85"
                    />
                  </svg>

                  {/* Winner Crown directly on top of champion boat */}
                  {isWinner && hasCompleted && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce">
                      <span className="text-2xl filter drop-shadow">👑</span>
                    </div>
                  )}
                </div>

                {/* Clean STT Badge ONLY (No student name during the race) */}
                <div
                  style={{
                    borderColor: isWinner && isEndingPhase ? '#f59e0b' : racer.hullAccent,
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
            );
          })}

          {/* Grand Regatta Champion Announcement inside arena when completed */}
          {hasCompleted && activeWinners.length > 0 && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 animate-scale-in text-center px-4 py-2.5 rounded-2xl bg-slate-900/95 border-2 border-amber-400 shadow-2xl shadow-amber-500/20 max-w-lg w-[94%]">
              <div className="text-[10px] font-black tracking-widest uppercase text-amber-400 flex items-center justify-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                {activeWinners.length === 1
                  ? 'QUÁN QUÂN ĐƯỜNG ĐUA THUYỀN VỀ ĐÍCH ĐẦU TIÊN!'
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
          <span>🚩 Xuất phát từ bờ trái → Lướt sóng qua hàng phao cờ bên phải</span>
          <span>Các thuyền rẽ sóng so kè nhịp chèo — chiếc thuyền về đích đầu tiên sẽ chiến thắng!</span>
        </div>
      </div>
    </div>
  );
};
