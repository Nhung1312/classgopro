import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sparkles, Trophy } from 'lucide-react';
import { Student } from '../../types';
import { getStudentSTT } from '../../utils/studentDisplay';

interface BalloonVisualProps {
  students: Student[];
  isSpinning: boolean;
  hasCompleted: boolean;
  winner: Student | null;
  selectedStudents?: Student[];
  duration?: number;
  allClassStudents?: Student[];
  onSelectStudentProfile?: (student: Student) => void;
}

interface BalloonCandidate {
  id: string;
  student: Student;
  stt: number;
  colorTheme: {
    name: string;
    tint: string;      // Light reflection & inner refraction
    base: string;      // Body translucent tint
    rim: string;       // Fresnel edge refraction
    glow: string;      // Ambient aura & specular
    border: string;    // Subtle boundary ring
  };
  phaseOffset: number; // Staggered phase on figure-8 loop
  layerIndex: number;  // Multi-tier depth layer
}

// 8 Elegant 3D Transparent / Glass Bubble Themes
const BUBBLE_3D_THEMES = [
  {
    name: 'sapphire',
    tint: '#60a5fa',
    base: '#3b82f6',
    rim: '#1d4ed8',
    glow: '#93c5fd',
    border: 'rgba(147, 197, 253, 0.65)',
  },
  {
    name: 'ruby',
    tint: '#f87171',
    base: '#ef4444',
    rim: '#b91c1c',
    glow: '#fca5a5',
    border: 'rgba(254, 202, 202, 0.65)',
  },
  {
    name: 'emerald',
    tint: '#4ade80',
    base: '#22c55e',
    rim: '#15803d',
    glow: '#86efac',
    border: 'rgba(187, 247, 208, 0.65)',
  },
  {
    name: 'amber',
    tint: '#facc15',
    base: '#f59e0b',
    rim: '#b45309',
    glow: '#fef08a',
    border: 'rgba(254, 240, 138, 0.65)',
  },
  {
    name: 'indigo',
    tint: '#818cf8',
    base: '#6366f1',
    rim: '#4338ca',
    glow: '#c7d2fe',
    border: 'rgba(199, 210, 254, 0.65)',
  },
  {
    name: 'cyan',
    tint: '#38bdf8',
    base: '#06b6d4',
    rim: '#0e7490',
    glow: '#a5f3fc',
    border: 'rgba(165, 243, 252, 0.65)',
  },
  {
    name: 'coral',
    tint: '#fb923c',
    base: '#f97316',
    rim: '#c2410c',
    glow: '#fed7aa',
    border: 'rgba(254, 215, 170, 0.65)',
  },
  {
    name: 'amethyst',
    tint: '#c084fc',
    base: '#a855f7',
    rim: '#7e22ce',
    glow: '#e9d5ff',
    border: 'rgba(233, 213, 255, 0.65)',
  },
];

export const BalloonVisual: React.FC<BalloonVisualProps> = ({
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

  // 1 STUDENT = EXACTLY 1 BALLOON (NO SLICE, NO HARDCODED LIMITS)
  const candidates = useMemo<BalloonCandidate[]>(() => {
    if (!students || students.length === 0) return [];
    const count = students.length;

    return students.map((student, idx) => {
      const stt = getStudentSTT(student, allClassStudents || students);
      const layerIndex = idx % 4;
      // Phase offset distributed around the loop plus layer stagger
      const phaseOffset = (idx / count) * 2 * Math.PI + (layerIndex * Math.PI) / 4;

      return {
        id: student.id,
        student,
        stt,
        colorTheme: BUBBLE_3D_THEMES[idx % BUBBLE_3D_THEMES.length],
        phaseOffset,
        layerIndex,
      };
    });
  }, [students, allClassStudents]);

  // Adaptive balloon size config based on student count
  const balloonSizeConfig = useMemo(() => {
    const count = candidates.length;
    if (count <= 10) {
      // Large
      return {
        svgSize: 78,
        sttClass: 'text-sm sm:text-base',
        badgePadding: 'px-2.5 py-0.5',
      };
    }
    if (count <= 20) {
      // Medium
      return {
        svgSize: 62,
        sttClass: 'text-xs sm:text-sm',
        badgePadding: 'px-2 py-0.5',
      };
    }
    if (count <= 30) {
      // Small
      return {
        svgSize: 48,
        sttClass: 'text-[10px] sm:text-xs',
        badgePadding: 'px-1.5 py-0.2',
      };
    }
    // 31 - 45+ Compact
    return {
      svgSize: 38,
      sttClass: 'text-[8.5px] sm:text-[9.5px]',
      badgePadding: 'px-1 py-0.1',
    };
  }, [candidates.length]);

  const [animProgress, setAnimProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPopped, setIsPopped] = useState(false);

  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isSpinning) {
      setIsPopped(false);
      setAnimProgress(0);
      setElapsedTime(0);
      startTimeRef.current = performance.now();

      const loop = (now: number) => {
        const elapsed = now - startTimeRef.current;
        const p = Math.min(1, elapsed / duration);
        setAnimProgress(p);
        setElapsedTime(elapsed);

        if (p < 1) {
          animRef.current = requestAnimationFrame(loop);
        }
      };

      animRef.current = requestAnimationFrame(loop);
    } else if (hasCompleted) {
      setAnimProgress(1);
      const popTimer = setTimeout(() => {
        setIsPopped(true);
      }, 350);
      return () => clearTimeout(popTimer);
    } else {
      setAnimProgress(0);
      setElapsedTime(0);
      setIsPopped(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isSpinning, hasCompleted, duration]);

  const trajectorySpeed = 0.0028;

  return (
    <div className="w-full max-w-4xl py-2 px-2 select-none flex flex-col items-center">
      {/* Sky Arena Container */}
      <div className="relative w-full rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-b from-slate-950 via-[#0b1329] to-slate-950 p-4 sm:p-6 shadow-2xl h-[420px] sm:h-[470px] flex flex-col justify-between">
        {/* Soft Background Clouds & Depth */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/3 w-80 h-80 rounded-full bg-indigo-900/15 blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-72 h-72 rounded-full bg-sky-950/20 blur-3xl" />
        </div>

        {/* Top Header Information */}
        <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg">🎈</span>
            <span className="text-xs font-black tracking-widest uppercase text-indigo-400">
              BÓNG BAY MAY MẮN
            </span>
          </div>
          <span className="text-xs font-medium text-slate-300">
            {isSpinning ? (
              <span className="text-sky-300 font-bold animate-pulse">
                🎈 Các quả bóng đang bay lượn... Bóng trúng sẽ phóng to và nổ tung!
              </span>
            ) : hasCompleted ? (
              <span className="text-amber-300 font-bold flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                {activeWinners.length > 1
                  ? `Đã tìm thấy ${activeWinners.length} quả bóng may mắn!`
                  : 'Quả bóng định mệnh đã nổ tung lộ diện học sinh!'}
              </span>
            ) : (
              <span className="text-slate-400">
                {candidates.length > 0
                  ? `Hiện có ${candidates.length} quả bóng (${candidates.length} HS) • Nhấn QUAY TÊN để bắt đầu`
                  : 'Chưa có học sinh phù hợp bộ lọc'}
              </span>
            )}
          </span>
        </div>

        {/* Arena Body: Balloons Floating */}
        <div className="relative z-10 flex-1 w-full h-full overflow-hidden">
          {/* Subtle Ambient Sky Drift Trails */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-[320px] h-[180px] rounded-full border border-sky-400/30 border-dashed" />
          </div>

          {/* Render ALL balloons */}
          {!isPopped &&
            candidates.map((c, idx) => {
              const isWinner = activeWinners.some((w) => w.id === c.student.id);
              const winnerIdx = activeWinners.findIndex((w) => w.id === c.student.id);
              const isEndingPhase = animProgress >= 0.82;

              // Multi-layer figure-8 trajectory with amplitude variance:
              const layer = c.layerIndex;
              const A = 36 - layer * 4; // Horizontal amplitude (36%, 32%, 28%, 24%)
              const B = 28 - layer * 3.5; // Vertical amplitude (28%, 24.5%, 21%, 17.5%)

              const t = elapsedTime * trajectorySpeed + c.phaseOffset;
              let xPercent = 50 + A * Math.sin(t);
              let yPercent = 50 + B * (Math.sin(2 * t) / 2) + (layer - 1.5) * 2;
              let opacity = 1;
              let scale = 1;

              if (isEndingPhase) {
                const endLerp = (animProgress - 0.82) / 0.18;
                if (isWinner) {
                  const targetX =
                    activeWinners.length > 1
                      ? 50 + (winnerIdx - (activeWinners.length - 1) / 2) * 20
                      : 50;
                  xPercent = xPercent + (targetX - xPercent) * endLerp;
                  yPercent = yPercent + (48 - yPercent) * endLerp;
                  scale = 1 + endLerp * 0.45;
                } else {
                  opacity = Math.max(0, 1 - endLerp * 1.5);
                }
              }

              if (!isSpinning && !hasCompleted) {
                const idleT = c.phaseOffset;
                xPercent = 50 + A * Math.sin(idleT);
                yPercent = 50 + B * (Math.sin(2 * idleT) / 2) + (layer - 1.5) * 2;
              }

              return (
                <div
                  key={c.id}
                  style={{
                    left: `${xPercent}%`,
                    top: `${yPercent}%`,
                    transform: 'translate(-50%, -50%)',
                    opacity,
                    transition: isEndingPhase ? 'opacity 0.3s ease-out' : 'none',
                    zIndex: isWinner && isEndingPhase ? 35 : 10 + idx,
                  }}
                  className="absolute pointer-events-none flex flex-col items-center"
                >
                  {/* 3D Glass Bubble Container */}
                  <div
                    style={{
                      transform: `scale(${scale})`,
                      transition: isEndingPhase ? 'transform 0.25s ease-out' : 'none',
                    }}
                    onClick={() => onSelectStudentProfile?.(c.student)}
                    className={`relative select-none pointer-events-auto flex items-center justify-center filter drop-shadow-[0_6px_16px_rgba(0,0,0,0.55)] transition-transform ${
                      onSelectStudentProfile ? 'cursor-pointer hover:scale-125 hover:z-50' : ''
                    }`}
                    title={onSelectStudentProfile ? `Bấm để xem Thẻ học sinh: ${c.student.name} (STT #${c.stt})` : undefined}
                  >
                    <svg
                      width={balloonSizeConfig.svgSize}
                      height={balloonSizeConfig.svgSize}
                      viewBox="0 0 100 100"
                      className="overflow-visible"
                    >
                      <defs>
                        <radialGradient id={`bubble-glow-${c.id}`} cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor={c.colorTheme.glow} stopOpacity="0.25" />
                          <stop offset="80%" stopColor={c.colorTheme.tint} stopOpacity="0.1" />
                          <stop offset="100%" stopColor={c.colorTheme.glow} stopOpacity="0" />
                        </radialGradient>

                        <radialGradient
                          id={`bubble-glass-${c.id}`}
                          cx="38%"
                          cy="34%"
                          r="62%"
                          fx="32%"
                          fy="28%"
                        >
                          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
                          <stop offset="20%" stopColor={c.colorTheme.tint} stopOpacity="0.2" />
                          <stop offset="60%" stopColor={c.colorTheme.base} stopOpacity="0.35" />
                          <stop offset="88%" stopColor={c.colorTheme.rim} stopOpacity="0.75" />
                          <stop offset="100%" stopColor={c.colorTheme.glow} stopOpacity="0.9" />
                        </radialGradient>

                        <linearGradient id={`bubble-specular-${c.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                        </linearGradient>

                        <linearGradient id={`bubble-reflect-${c.id}`} x1="100%" y1="100%" x2="0%" y2="0%">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                          <stop offset="45%" stopColor={c.colorTheme.tint} stopOpacity="0.25" />
                          <stop offset="100%" stopColor={c.colorTheme.base} stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      <circle cx="50" cy="50" r="48" fill={`url(#bubble-glow-${c.id})`} />
                      <circle
                        cx="50"
                        cy="50"
                        r="44"
                        fill={`url(#bubble-glass-${c.id})`}
                        stroke={c.colorTheme.border}
                        strokeWidth="1.2"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42.5"
                        fill="none"
                        stroke={`url(#bubble-specular-${c.id})`}
                        strokeWidth="0.8"
                        opacity="0.6"
                      />
                      <ellipse
                        cx="36"
                        cy="30"
                        rx="17"
                        ry="9"
                        transform="rotate(-38 36 30)"
                        fill={`url(#bubble-specular-${c.id})`}
                      />
                      <ellipse cx="26" cy="43" rx="4.5" ry="2.5" transform="rotate(-30 26 43)" fill="#ffffff" opacity="0.8" />
                      <path
                        d="M 64 68 C 68 64, 71 58, 71 52 C 71 63, 62 72, 51 72 C 57 72, 61 70, 64 68 Z"
                        fill={`url(#bubble-reflect-${c.id})`}
                        opacity="0.75"
                      />
                    </svg>

                    {/* STT Display inside the bubble */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className={`${balloonSizeConfig.badgePadding} rounded-full bg-slate-950/50 backdrop-blur-[2px] border border-white/30 shadow-[0_2px_8px_rgba(0,0,0,0.6)] flex items-center justify-center`}>
                        <span className={`text-white font-black ${balloonSizeConfig.sttClass} tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]`}>
                          #{c.stt}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Balloon Pop & Winner Result Reveal in Center */}
          {isPopped && activeWinners.length > 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-40 animate-scale-in">
              <div className="relative flex flex-col items-center text-center p-6 sm:p-8 rounded-3xl bg-slate-900/95 border-2 border-amber-400 shadow-2xl shadow-amber-500/25 max-w-lg mx-auto w-[92%]">
                <div className="absolute -top-12 w-52 h-52 rounded-full bg-amber-400/20 blur-3xl pointer-events-none animate-ping" />

                <span className="text-4xl sm:text-5xl animate-bounce mb-2">👑</span>

                {activeWinners.length === 1 ? (
                  <>
                    <h2
                      onClick={() => onSelectStudentProfile?.(activeWinners[0])}
                      className={`text-3xl sm:text-4xl font-black text-amber-300 tracking-tight drop-shadow-lg leading-tight px-2 ${
                        onSelectStudentProfile ? 'cursor-pointer hover:underline hover:text-white transition-colors' : ''
                      }`}
                      title={onSelectStudentProfile ? `Bấm để xem Thẻ học sinh: ${activeWinners[0].name}` : undefined}
                    >
                      {activeWinners[0].name}
                    </h2>

                    <div className="mt-2 text-xs sm:text-sm font-bold text-slate-300">
                      <button
                        type="button"
                        onClick={() => onSelectStudentProfile?.(activeWinners[0])}
                        className={`px-3 py-1 rounded-full bg-slate-800 border border-slate-700 ${
                          onSelectStudentProfile ? 'hover:bg-slate-700 hover:border-amber-400/50 cursor-pointer transition-colors' : ''
                        }`}
                        title={onSelectStudentProfile ? 'Bấm để xem Thẻ học sinh' : undefined}
                      >
                        Lần thứ {Math.max(1, activeWinners[0].callCount ?? 1)} lên bảng
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs sm:text-sm font-black tracking-widest uppercase text-amber-400 mb-2">
                      {activeWinners.length} HỌC SINH ĐƯỢC GỌI LÊN BẢNG!
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 max-w-md max-h-48 overflow-y-auto">
                      {activeWinners.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => onSelectStudentProfile?.(w)}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-800/95 hover:bg-slate-750 border border-amber-400/80 hover:border-amber-300 text-amber-300 hover:text-white font-black text-sm sm:text-base shadow-md flex items-center gap-2 cursor-pointer hover:scale-105 transition-all text-left"
                          title="Bấm để xem Thẻ học sinh"
                        >
                          <span className="text-amber-400">👑</span>
                          <span className="hover:underline">{w.name}</span>
                          <span className="text-[11px] font-medium text-slate-300">
                            ({Math.max(1, w.callCount ?? 1)} lần)
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Guidance */}
        <div className="relative z-10 text-center text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
          Mỗi học sinh = 1 bóng bay ({candidates.length} bóng) • Bóng may mắn sẽ phóng to và nổ tung lộ diện người thắng!
        </div>
      </div>
    </div>
  );
};
