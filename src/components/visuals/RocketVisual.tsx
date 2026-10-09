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
}

interface RocketItem {
  id: string;
  student: Student;
  stt: number;
  laneIndex: number;
  trimColor: string;
  border: string;
  harmonicPhase1: number;
  harmonicPhase2: number;
}

// Harmonious ClassGo palette: sky, indigo, emerald, amber, crimson, teal
const ROCKET_TRIMS = [
  { trimColor: '#0ea5e9', border: '#0284c7' }, // Sky
  { trimColor: '#6366f1', border: '#4f46e5' }, // Indigo
  { trimColor: '#10b981', border: '#059669' }, // Emerald
  { trimColor: '#f59e0b', border: '#d97706' }, // Amber
  { trimColor: '#ef4444', border: '#dc2626' }, // Crimson
  { trimColor: '#06b6d4', border: '#0891b2' }, // Cyan
  { trimColor: '#8b5cf6', border: '#7c3aed' }, // Violet
];

export const RocketVisual: React.FC<RocketVisualProps> = ({
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
    const raw = (selectedStudents && selectedStudents.length > 0)
      ? selectedStudents
      : (winner ? [winner] : []);
    const sourcePool = allClassStudents || students;
    return raw.map((w) => sourcePool.find((s) => s.id === w.id) || w);
  }, [selectedStudents, winner, allClassStudents, students]);

  // Select candidate rockets (max 7-8), strictly including all active winners
  const candidates = useMemo<RocketItem[]>(() => {
    const winnerIds = new Set(activeWinners.map((w) => w.id));
    const nonWinners = students.filter((s) => !winnerIds.has(s.id));
    const targetSize = Math.max(5, Math.min(8, Math.max(students.length, activeWinners.length)));

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
        laneIndex: idx,
        ...ROCKET_TRIMS[idx % ROCKET_TRIMS.length],
        harmonicPhase1: idx * 1.3,
        harmonicPhase2: idx * 2.1,
      };
    });
  }, [students, activeWinners, allClassStudents]);

  // Continuous animation progress (0 to 1) and flame flicker frame
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

  const winnerSTT = winner ? getStudentSTT(winner, allClassStudents || students) : 1;
  const count = candidates.length;

  return (
    <div className="w-full max-w-4xl py-2 px-2 select-none flex flex-col items-center">
      {/* Space Gantry Arena */}
      <div className="relative w-full rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-b from-slate-950 via-[#0b1329] to-slate-950 p-4 sm:p-6 shadow-2xl h-[420px] sm:h-[460px] flex flex-col justify-between">
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
                <Trophy className="w-3.5 h-3.5 text-amber-400" /> Tên lửa đã đạt độ cao cao nhất!
              </span>
            ) : (
              <span className="text-slate-400">Tất cả tên lửa xuất phát từ bệ phóng phía dưới</span>
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

          {/* Rockets ascending continuously */}
          {candidates.map((c) => {
            const isWinner = activeWinners.some((w) => w.id === c.student.id);
            const isEndingPhase = animProgress >= 0.85;

            // Horizontal position: distinct lane across the bottom with gentle sway
            const baseLaneX = 10 + (c.laneIndex / (count - 1 || 1)) * 80;
            // Gentle sinusoidal sway (max +-2.5%), keeping direction strictly upward
            const swayX = Math.sin(animProgress * Math.PI * 3 + c.harmonicPhase1) * 2.5;
            const xPercent = baseLaneX + swayX;

            // Continuous upward altitude (percentage from bottom):
            let altitude = 4; // At start: sitting on launchpad

            if (animProgress > 0) {
              // Main ascent ramp: climbs from 4% to 66% smoothly over progress
              const baseAscent = 4 + animProgress * 62;

              // Smooth continuous harmonic oscillations (no Math.random per frame!):
              // Causes rockets to naturally overtake each other smoothly
              const harmonic1 = Math.sin(animProgress * Math.PI * 4 + c.harmonicPhase1) * 9;
              const harmonic2 = Math.cos(animProgress * Math.PI * 6 + c.harmonicPhase2) * 5;
              const harmonicDelta = harmonic1 + harmonic2;

              if (!isEndingPhase) {
                // In first 85%: any rocket can lead as they oscillate naturally!
                altitude = Math.max(4, Math.min(72, baseAscent + harmonicDelta));
              } else {
                // Final 15%: Winner accelerates past all others and breaks out into orbit
                const endLerp = (animProgress - 0.85) / 0.15;
                if (isWinner) {
                  // Surges straight to 88% - 91%
                  altitude = 68 + endLerp * 22;
                } else {
                  // Other rockets stabilize around 52% - 64%
                  altitude = 54 + Math.sin(c.laneIndex * 1.8) * 8;
                }
              }
            } else if (hasCompleted) {
              altitude = isWinner ? 90 : 54 + Math.sin(c.laneIndex * 1.8) * 8;
            }

            return (
              <div
                key={c.id}
                style={{
                  left: `${xPercent}%`,
                  bottom: `${altitude}%`,
                  transform: 'translate(-50%, 0)',
                  transition: isEndingPhase ? 'bottom 0.25s ease-out' : 'none',
                  zIndex: isWinner && isEndingPhase ? 30 : 10 + c.laneIndex,
                }}
                className="absolute flex flex-col items-center pointer-events-none"
              >
                {/* Winner Crown directly on top of rocket when crossing orbit */}
                {isWinner && hasCompleted && (
                  <div className="animate-bounce -mb-1">
                    <span className="text-2xl drop-shadow-md">👑</span>
                  </div>
                )}

                {/* Sleek Aerodynamic Rocket Body */}
                <div
                  className={`relative w-12 h-18 sm:w-14 sm:h-20 drop-shadow-xl transition-transform ${
                    isWinner && isEndingPhase ? 'scale-115' : 'scale-100'
                  }`}
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

                    {/* Animated Thruster Flame Plume */}
                    {(animProgress > 0 || hasCompleted) && (
                      <g>
                        <path
                          d={
                            flameTick === 0
                              ? 'M36 124 Q50 158, 50 172 Q50 158, 64 124 Z'
                              : flameTick === 1
                              ? 'M37 124 Q48 166, 50 180 Q52 166, 63 124 Z'
                              : 'M35 124 Q50 152, 50 164 Q50 152, 65 124 Z'
                          }
                          fill={`url(#flame-grad-${c.id})`}
                        />
                        <path d="M42 124 Q50 146, 50 152 Q50 146, 58 124 Z" fill="#e0f2fe" />
                      </g>
                    )}
                  </svg>
                </div>

                {/* Clear STT badge displayed directly with the rocket (e.g. #3, #12) */}
                <div
                  className={`mt-1 px-1.5 py-0.5 rounded-full text-center border shadow-md font-black text-xs ${
                    isWinner && isEndingPhase
                      ? 'bg-amber-400 text-slate-950 border-yellow-200 shadow-amber-400/50 scale-110 ring-2 ring-amber-300'
                      : 'bg-slate-900/90 text-slate-100 border-slate-700'
                  }`}
                >
                  <span>#{c.stt}</span>
                </div>
              </div>
            );
          })}

          {/* Grand Orbit Victory Announcement in Center when finished */}
          {hasCompleted && activeWinners.length > 0 && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 animate-scale-in text-center px-4 py-3 rounded-2xl bg-slate-900/95 border-2 border-amber-400 shadow-2xl shadow-amber-500/25 max-w-lg w-[94%]">
              <div className="text-[10px] font-black tracking-widest uppercase text-amber-400 flex items-center justify-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                {activeWinners.length === 1
                  ? 'TÊN LỬA VƯỢT QUỸ ĐẠO CHIẾN THẮNG!'
                  : `${activeWinners.length} HỌC SINH ĐƯỢC GỌI LÊN BẢNG!`}
              </div>

              {activeWinners.length === 1 ? (
                <>
                  <h2 className="mt-1 text-2xl sm:text-3xl font-black text-amber-300 tracking-tight leading-tight truncate px-2">
                    👑 {activeWinners[0].name}
                  </h2>
                  <div className="text-[11px] font-bold text-slate-300 mt-1">
                    Lần thứ {Math.max(1, activeWinners[0].callCount ?? 1)} lên bảng
                  </div>
                </>
              ) : (
                <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 max-h-44 overflow-y-auto">
                  {activeWinners.map((w) => (
                    <div
                      key={w.id}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800/95 border border-amber-400/80 text-amber-300 font-black text-sm sm:text-base shadow-md flex items-center gap-2"
                    >
                      <span className="text-amber-400">👑</span>
                      <span>{w.name}</span>
                      <span className="text-[11px] font-medium text-slate-300">
                        ({Math.max(1, w.callCount ?? 1)} lần)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Guidance */}
        <div className="relative z-10 text-center text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
          Các tên lửa mang số thứ tự cùng xuất phát từ bệ phóng phía dưới và bay lên cao — tên lửa bay cao nhất sẽ chiến thắng!
        </div>
      </div>
    </div>
  );
};
