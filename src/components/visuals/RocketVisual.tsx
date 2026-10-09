import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Rocket as RocketIcon, Trophy } from 'lucide-react';
import { Student } from '../../types';
import { getStudentSTT } from '../../utils/studentDisplay';

interface RocketVisualProps {
  students: Student[];
  isSpinning: boolean;
  hasCompleted: boolean;
  winner: Student | null;
  selectedStudents?: Student[];
  duration?: number;
  allClassStudents?: Student[];
  onSelectStudentProfile?: (student: Student) => void;
}

interface RocketItem {
  id: string;
  student: Student;
  stt: number;
  laneIndex: number;
  trimColor: string;
  glowColor: string;
  flameCore: string;
  border: string;
  harmonicPhase1: number;
  harmonicPhase2: number;
  echelon: number;
}

// 8 Distinct Aerospace Trim Styles
const ROCKET_TRIMS = [
  { trimColor: '#38bdf8', glowColor: '#0284c7', flameCore: '#38bdf8', border: '#7dd3fc' }, // Sky Blue
  { trimColor: '#f87171', glowColor: '#dc2626', flameCore: '#fca5a5', border: '#fecaca' }, // Crimson
  { trimColor: '#4ade80', glowColor: '#16a34a', flameCore: '#86efac', border: '#bbf7d0' }, // Emerald
  { trimColor: '#fbbf24', glowColor: '#d97706', flameCore: '#fde047', border: '#fef08a' }, // Amber
  { trimColor: '#c084fc', glowColor: '#9333ea', flameCore: '#d8b4fe', border: '#e9d5ff' }, // Violet
  { trimColor: '#fb923c', glowColor: '#ea580c', flameCore: '#fdba74', border: '#ffedd5' }, // Orange
  { trimColor: '#2dd4bf', glowColor: '#0d9488', flameCore: '#5eead4', border: '#ccfbf1' }, // Teal
  { trimColor: '#e879f9', glowColor: '#c026d3', flameCore: '#f0abfc', border: '#fae8ff' }, // Fuchsia
];

export const RocketVisual: React.FC<RocketVisualProps> = ({
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

  // 1 STUDENT = EXACTLY 1 ROCKET (NO HARDCODED CAP, NO SLICE)
  const candidates = useMemo<RocketItem[]>(() => {
    if (!students || students.length === 0) return [];

    return students.map((student, idx) => {
      const stt = getStudentSTT(student, allClassStudents || students);
      const echelon = idx % 3; // 3 staggered echelons for multi-row depth

      return {
        id: student.id,
        student,
        stt,
        laneIndex: idx,
        ...ROCKET_TRIMS[idx % ROCKET_TRIMS.length],
        harmonicPhase1: idx * 1.35,
        harmonicPhase2: idx * 2.15,
        echelon,
      };
    });
  }, [students, allClassStudents]);

  // Adaptive rocket sizing based on total count
  const rocketSizeConfig = useMemo(() => {
    const count = candidates.length;
    if (count <= 10) {
      // Large
      return {
        wrapperClass: 'w-12 h-18 sm:w-14 sm:h-20',
        sttClass: 'text-[11px] sm:text-xs',
        badgePadding: 'px-1.5 py-0.5',
      };
    }
    if (count <= 20) {
      // Medium
      return {
        wrapperClass: 'w-9 h-14 sm:w-10 sm:h-16',
        sttClass: 'text-[9.5px] sm:text-[10.5px]',
        badgePadding: 'px-1 py-0.2',
      };
    }
    if (count <= 30) {
      // Small
      return {
        wrapperClass: 'w-7 h-11 sm:w-8 sm:h-13',
        sttClass: 'text-[8px] sm:text-[9px]',
        badgePadding: 'px-1 py-0.1',
      };
    }
    // 31 - 45+ Compact
    return {
      wrapperClass: 'w-6 h-9 sm:w-7 sm:h-11',
      sttClass: 'text-[7px] sm:text-[8px]',
      badgePadding: 'px-0.5 py-0.1',
    };
  }, [candidates.length]);

  const [animProgress, setAnimProgress] = useState(0);
  const [flameTick, setFlameTick] = useState(0);

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
        setFlameTick(Math.floor((elapsed / 70) % 3));

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

  const count = candidates.length;

  return (
    <div className="w-full max-w-4xl py-2 px-2 select-none flex flex-col items-center">
      {/* Space Gantry Arena */}
      <div className="relative w-full rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-b from-slate-950 via-[#0b1329] to-slate-950 p-4 sm:p-6 shadow-2xl h-[420px] sm:h-[470px] flex flex-col justify-between">
        {/* Starfield Atmosphere */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-1/4 w-80 h-80 rounded-full bg-indigo-950/25 blur-3xl" />
          <div className="absolute bottom-10 left-1/4 w-72 h-72 rounded-full bg-sky-950/20 blur-3xl" />

          {/* Twinkling star dots */}
          {[
            { top: '10%', left: '14%' },
            { top: '20%', left: '80%' },
            { top: '35%', left: '48%' },
            { top: '65%', left: '16%' },
            { top: '75%', left: '86%' },
            { top: '50%', left: '92%' },
          ].map((s, idx) => (
            <div
              key={idx}
              className="absolute w-1 h-1 rounded-full bg-slate-200 opacity-60 animate-pulse"
              style={{ top: s.top, left: s.left }}
            />
          ))}

          {/* Vertical speed streaks during ascent */}
          {animProgress > 0 && animProgress < 1 && (
            <div className="absolute inset-0 flex justify-around pointer-events-none opacity-30">
              <div className="w-0.5 h-28 bg-gradient-to-b from-transparent via-cyan-400 to-transparent animate-pulse translate-y-8" />
              <div className="w-0.5 h-36 bg-gradient-to-b from-transparent via-indigo-300 to-transparent animate-pulse self-center" />
              <div className="w-0.5 h-24 bg-gradient-to-b from-transparent via-white to-transparent animate-pulse translate-y-16" />
            </div>
          )}
        </div>

        {/* Top Header Information */}
        <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-2 mb-1">
          <div className="flex items-center gap-2">
            <RocketIcon className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-black tracking-widest uppercase text-indigo-400">
              TRẠM PHÓNG TÊN LỬA VŨ TRỤ
            </span>
          </div>
          <span className="text-xs font-medium text-slate-300">
            {isSpinning ? (
              <span className="text-sky-300 font-bold animate-pulse">
                🚀 Các tên lửa cùng phóng lên và liên tục đổi thứ hạng...
              </span>
            ) : hasCompleted ? (
              <span className="text-amber-300 font-bold flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                {activeWinners.length > 1
                  ? `Đã có ${activeWinners.length} tên lửa vươn lên dẫn đầu quỹ đạo!`
                  : 'Tên lửa người chiến thắng đã đạt độ cao cao nhất!'}
              </span>
            ) : (
              <span className="text-slate-400">
                {count > 0
                  ? `Hiện có ${count} tên lửa (${count} HS) trên bệ phóng • Nhấn QUAY TÊN để khai hỏa`
                  : 'Chưa có học sinh phù hợp bộ lọc'}
              </span>
            )}
          </span>
        </div>

        {/* Arena Body: Launch Silos & Continuous Ascending Race */}
        <div className="relative z-10 flex-1 w-full h-full overflow-hidden">
          {/* Starting launch pads baseline at bottom */}
          <div className="absolute bottom-3 left-4 right-4 h-1 bg-slate-800 rounded-full" />

          {/* Orbit finish line near top */}
          <div className="absolute top-10 left-4 right-4 border-t border-dashed border-sky-400/30 flex items-center justify-between px-2">
            <span className="text-[10px] font-mono text-sky-400/60 uppercase">Vạch quỹ đạo</span>
            <span className="text-[10px] font-mono text-sky-400/60 uppercase">Orbit 100km</span>
          </div>

          {/* Rockets ascending continuously (GAME STATE ONLY: UNMOUNTED WHEN RESULT IS PRESENTED) */}
          {!hasCompleted &&
            candidates.map((c) => {
              const isWinner = activeWinners.some((w) => w.id === c.student.id);
              const isEndingPhase = animProgress >= 0.85;

              // Multi-echelon staggered horizontal distribution:
              let baseLaneX = 8 + (c.laneIndex / (count - 1 || 1)) * 84;
              // Gentle sinusoidal sway (max +-2%)
              const swayX = Math.sin(animProgress * Math.PI * 3 + c.harmonicPhase1) * 2;
              const xPercent = baseLaneX + swayX;

              // Base launchpad stagger per echelon
              const echelonBaseOffset = c.echelon * 3.5;

              // Continuous upward altitude (percentage from bottom):
              let altitude = 4 + echelonBaseOffset;

              if (animProgress > 0) {
                const baseAscent = 4 + animProgress * 62;
                const harmonic1 = Math.sin(animProgress * Math.PI * 4 + c.harmonicPhase1) * 8;
                const harmonic2 = Math.cos(animProgress * Math.PI * 6 + c.harmonicPhase2) * 4.5;
                const harmonicDelta = harmonic1 + harmonic2;

                if (!isEndingPhase) {
                  altitude = Math.max(4, Math.min(74, baseAscent + harmonicDelta + echelonBaseOffset));
                } else {
                  const endLerp = (animProgress - 0.85) / 0.15;
                  if (isWinner) {
                    altitude = 68 + endLerp * 22; // Surges to 90%
                  } else {
                    altitude = 50 + Math.sin(c.laneIndex * 1.8) * 8 + echelonBaseOffset;
                  }
                }
              }

              return (
                <div
                  key={c.id}
                  style={{
                    left: `${xPercent}%`,
                    bottom: `${altitude}%`,
                    transform: 'translate(-50%, 0)',
                    transition: isEndingPhase ? 'bottom 0.25s ease-out' : 'none',
                    zIndex: isWinner && isEndingPhase ? 35 : 10 + c.echelon * 8 + (c.laneIndex % 8),
                  }}
                  className="absolute flex flex-col items-center pointer-events-none"
                >
                  {/* Rocket Body */}
                  <div
                    onClick={() => {
                      if (!isSpinning) {
                        onSelectStudentProfile?.(c.student);
                      }
                    }}
                    className={`relative ${rocketSizeConfig.wrapperClass} drop-shadow-xl transition-transform pointer-events-auto ${
                      !isSpinning && onSelectStudentProfile ? 'cursor-pointer hover:scale-125 hover:z-40' : ''
                    } ${
                      isWinner && isEndingPhase ? 'scale-125' : 'scale-100'
                    }`}
                    title={!isSpinning && onSelectStudentProfile ? `Bấm để xem Thẻ học sinh: ${c.student.name} (STT #${c.stt})` : undefined}
                  >
                    <svg viewBox="0 0 100 150" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id={`rocket-hull-${c.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#64748b" />
                          <stop offset="30%" stopColor="#f8fafc" />
                          <stop offset="70%" stopColor="#94a3b8" />
                          <stop offset="100%" stopColor="#475569" />
                        </linearGradient>

                        <linearGradient id={`flame-grad-${c.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#ffffff" />
                          <stop offset="25%" stopColor="#fef08a" />
                          <stop offset="60%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                      </defs>

                      {/* Stabilizer Fins */}
                      <path d="M28 95 L8 122 L28 116 Z" fill={c.trimColor} stroke={c.border} strokeWidth="1.8" />
                      <path d="M72 95 L92 122 L72 116 Z" fill={c.trimColor} stroke={c.border} strokeWidth="1.8" />

                      {/* Rocket Fuselage */}
                      <path
                        d="M50 10 C36 32, 28 70, 28 116 L72 116 C72 70, 64 32, 50 10 Z"
                        fill={`url(#rocket-hull-${c.id})`}
                        stroke={isWinner && isEndingPhase ? '#fde047' : '#334155'}
                        strokeWidth={isWinner && isEndingPhase ? 2.5 : 1.5}
                      />

                      {/* Nose Cone Trim */}
                      <path
                        d="M50 10 C44 20, 40 30, 40 38 L60 38 C60 30, 56 20, 50 10 Z"
                        fill={c.trimColor}
                        stroke={c.border}
                        strokeWidth="1.2"
                      />

                      {/* Cockpit Window */}
                      <circle cx="50" cy="58" r="10" fill="#0284c7" stroke="#e2e8f0" strokeWidth="2" />
                      <ellipse cx="47" cy="54" rx="4" ry="2" fill="#ffffff" opacity="0.8" />

                      {/* Exhaust Nozzle */}
                      <polygon points="38,116 62,116 66,124 34,124" fill="#1e293b" />

                      {/* Dynamic Thrust Flame */}
                      {(animProgress > 0 || isSpinning) && (
                        <g>
                          <ellipse
                            cx="50"
                            cy={132 + flameTick * 3}
                            rx={10 + flameTick * 2}
                            ry={16 + flameTick * 4}
                            fill={`url(#flame-grad-${c.id})`}
                            className="opacity-95"
                          />
                          <ellipse
                            cx="50"
                            cy={127 + flameTick * 2}
                            rx={5 + flameTick}
                            ry={9 + flameTick * 2}
                            fill="#ffffff"
                          />
                        </g>
                      )}
                    </svg>

                    {/* STT Badge on Rocket Center */}
                    <div className="absolute inset-0 flex items-center justify-center top-6 pointer-events-none">
                      <span
                        style={{ backgroundColor: c.trimColor, color: '#0f172a' }}
                        className={`font-black ${rocketSizeConfig.sttClass} ${rocketSizeConfig.badgePadding} rounded-full shadow-md border border-white/60 tracking-tight leading-none`}
                      >
                        #{c.stt}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Winner Announcement Card when Orbit Reached (CLEAN RESULT PRESENTATION) */}
          {hasCompleted && activeWinners.length > 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-40 animate-scale-in">
              <div className="relative flex flex-col items-center text-center p-6 sm:p-8 rounded-3xl bg-slate-900/95 border-2 border-sky-400 shadow-2xl shadow-sky-500/25 max-w-lg mx-auto w-[92%]">
                <div className="absolute -top-12 w-52 h-52 rounded-full bg-sky-400/20 blur-3xl pointer-events-none animate-ping" />

                {activeWinners.length === 1 ? (
                  <>
                    <div className="text-[11px] font-black uppercase tracking-widest text-sky-400 mb-1 flex items-center gap-1.5">
                      <span>🚀</span>
                      <span>CHẠM TỚI QUỸ ĐẠO KHÔNG GIAN</span>
                    </div>

                    {/* ROCKET WINNER VISUAL WITH SINGLE STT ON HULL */}
                    <button
                      type="button"
                      onClick={() => onSelectStudentProfile?.(activeWinners[0])}
                      className={`relative flex flex-col items-center my-2 ${
                        onSelectStudentProfile ? 'cursor-pointer hover:scale-105 transition-transform' : ''
                      }`}
                      title={onSelectStudentProfile ? `Bấm để xem Thẻ học sinh: ${activeWinners[0].name}` : undefined}
                    >
                      <div className="text-2xl animate-bounce -mb-1">👑</div>
                      <div className="relative w-16 h-24 sm:w-20 sm:h-28 drop-shadow-[0_0_25px_rgba(56,189,248,0.5)]">
                        <svg viewBox="0 0 100 150" className="w-full h-full overflow-visible">
                          <defs>
                            <linearGradient id={`winner-hull-${activeWinners[0].id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#38bdf8" />
                              <stop offset="35%" stopColor="#ffffff" />
                              <stop offset="70%" stopColor="#bae6fd" />
                              <stop offset="100%" stopColor="#0284c7" />
                            </linearGradient>
                            <linearGradient id="winner-flame-res" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#ffffff" />
                              <stop offset="25%" stopColor="#fef08a" />
                              <stop offset="60%" stopColor="#f59e0b" />
                              <stop offset="100%" stopColor="#ef4444" />
                            </linearGradient>
                          </defs>

                          {/* Fins */}
                          <path d="M28 95 L6 124 L28 116 Z" fill="#f59e0b" stroke="#fef08a" strokeWidth="2" />
                          <path d="M72 95 L94 124 L72 116 Z" fill="#f59e0b" stroke="#fef08a" strokeWidth="2" />

                          {/* Fuselage */}
                          <path
                            d="M50 8 C34 32, 26 70, 26 116 L74 116 C74 70, 66 32, 50 8 Z"
                            fill={`url(#winner-hull-${activeWinners[0].id})`}
                            stroke="#fde047"
                            strokeWidth="2.5"
                          />

                          {/* Nose Cone */}
                          <path d="M50 8 C43 20, 39 30, 39 38 L61 38 C61 30, 57 20, 50 8 Z" fill="#f59e0b" stroke="#fde047" strokeWidth="1.5" />

                          {/* Cockpit Window */}
                          <circle cx="50" cy="56" r="11" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
                          <ellipse cx="47" cy="52" rx="4" ry="2.5" fill="#ffffff" opacity="0.85" />

                          {/* Nozzle */}
                          <polygon points="36,116 64,116 68,124 32,124" fill="#0f172a" />

                          {/* Flame */}
                          <ellipse cx="50" cy="134" rx="11" ry="17" fill="url(#winner-flame-res)" className="animate-pulse" />
                          <ellipse cx="50" cy="128" rx="5" ry="9" fill="#ffffff" />
                        </svg>

                        {/* STT Badge on Rocket Fuselage: ONLY STT DISPLAY */}
                        <div className="absolute inset-0 flex items-center justify-center top-6 pointer-events-none">
                          <span className="font-black text-sm sm:text-base px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-md border border-white leading-none">
                            #{getStudentSTT(activeWinners[0], allClassStudents || students)}
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* FULL STUDENT NAME PROMINENTLY DISPLAYED */}
                    <h2
                      onClick={() => onSelectStudentProfile?.(activeWinners[0])}
                      className={`text-3xl sm:text-4xl font-black text-amber-300 tracking-tight drop-shadow-lg leading-tight px-2 mt-1 ${
                        onSelectStudentProfile ? 'cursor-pointer hover:underline hover:text-white transition-colors' : ''
                      }`}
                      title={onSelectStudentProfile ? `Bấm để xem Thẻ học sinh: ${activeWinners[0].name}` : undefined}
                    >
                      {activeWinners[0].name}
                    </h2>

                    <div className="mt-2 text-xs sm:text-sm font-bold text-slate-300">
                      <span className="px-3.5 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300 shadow-sm">
                        Lần thứ {Math.max(1, activeWinners[0].callCount ?? 1)} lên bảng
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs sm:text-sm font-black tracking-widest uppercase text-sky-400 mb-2 flex items-center gap-1.5">
                      <span>🚀</span>
                      <span>{activeWinners.length} TÊN LỬA ĐẠT QUỸ ĐẠO XUẤT SẮC!</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 max-w-md max-h-48 overflow-y-auto">
                      {activeWinners.map((w) => {
                        const stt = getStudentSTT(w, allClassStudents || students);
                        return (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => onSelectStudentProfile?.(w)}
                            className="px-3.5 py-2 rounded-xl bg-slate-800/95 hover:bg-slate-750 border border-sky-400/80 hover:border-sky-300 text-amber-300 hover:text-white font-black text-sm sm:text-base shadow-md flex items-center gap-2.5 cursor-pointer hover:scale-105 transition-all text-left"
                            title="Bấm để xem Thẻ học sinh"
                          >
                            <span className="w-7 h-7 rounded-full bg-sky-500/20 border border-sky-400 flex items-center justify-center text-xs font-black text-sky-300 shrink-0">
                              #{stt}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="hover:underline truncate text-sm font-black text-amber-300">
                                {w.name}
                              </div>
                              <div className="text-[11px] font-medium text-slate-300">
                                Lần thứ {Math.max(1, w.callCount ?? 1)} lên bảng
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Guidance */}
        <div className="relative z-10 text-center text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
          Mỗi học sinh = 1 tên lửa ({count} tên lửa) • Tên lửa bứt tốc lên đỉnh quỹ đạo đầu tiên là người được chọn!
        </div>
      </div>
    </div>
  );
};
