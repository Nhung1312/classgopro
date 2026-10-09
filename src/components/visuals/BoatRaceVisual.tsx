import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Trophy, Sparkles, Award, Flame } from 'lucide-react';
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
  onSelectStudentProfile?: (student: Student) => void;
}

interface LotteryBall {
  id: string;
  student: Student;
  stt: number;
  bgGradient: string;
  borderColor: string;
  glowColor: string;
  textColor: string;
  shellIndex: number;
  initialPhase: number;
  speedFactor: number;
  bounceFreq: number;
  bouncePhase: number;
}

// 8 Vibrant 3D Neon Acrylic Spherical Ball Palettes
const BALL_PALETTES = [
  {
    bgGradient: 'radial-gradient(circle at 32% 28%, #67e8f9 0%, #06b6d4 50%, #0e7490 100%)', // Cyan
    borderColor: '#a5f3fc',
    glowColor: 'rgba(6, 182, 212, 0.65)',
    textColor: '#083344',
  },
  {
    bgGradient: 'radial-gradient(circle at 32% 28%, #fca5a5 0%, #ef4444 50%, #991b1b 100%)', // Red
    borderColor: '#fecaca',
    glowColor: 'rgba(239, 68, 68, 0.65)',
    textColor: '#450a0a',
  },
  {
    bgGradient: 'radial-gradient(circle at 32% 28%, #86efac 0%, #22c55e 50%, #15803d 100%)', // Emerald
    borderColor: '#bbf7d0',
    glowColor: 'rgba(34, 197, 94, 0.65)',
    textColor: '#052e16',
  },
  {
    bgGradient: 'radial-gradient(circle at 32% 28%, #fde047 0%, #eab308 50%, #854d0e 100%)', // Gold
    borderColor: '#fef08a',
    glowColor: 'rgba(234, 179, 8, 0.65)',
    textColor: '#1e1b4b',
  },
  {
    bgGradient: 'radial-gradient(circle at 32% 28%, #d8b4fe 0%, #a855f7 50%, #6b21a8 100%)', // Violet
    borderColor: '#f3e8ff',
    glowColor: 'rgba(168, 85, 247, 0.65)',
    textColor: '#2e1065',
  },
  {
    bgGradient: 'radial-gradient(circle at 32% 28%, #fdba74 0%, #f97316 50%, #9a3412 100%)', // Orange
    borderColor: '#ffedd5',
    glowColor: 'rgba(249, 115, 22, 0.65)',
    textColor: '#431407',
  },
  {
    bgGradient: 'radial-gradient(circle at 32% 28%, #f472b6 0%, #ec4899 50%, #9d174d 100%)', // Fuchsia
    borderColor: '#fce7f3',
    glowColor: 'rgba(236, 72, 153, 0.65)',
    textColor: '#500724',
  },
  {
    bgGradient: 'radial-gradient(circle at 32% 28%, #a3e635 0%, #84cc16 50%, #3f6212 100%)', // Lime
    borderColor: '#ecfccb',
    glowColor: 'rgba(132, 204, 22, 0.65)',
    textColor: '#1a2e05',
  },
];

// Multi-Tier Elliptical Orbital Shells (centered at cx=50%, cy=48%)
// Provides wide, clearly visible travel across the full lottery drum
const ORBIT_SHELLS = [
  { rx: 16.5, ry: 13.5 }, // Shell 0: Inner Core
  { rx: 24.0, ry: 19.5 }, // Shell 1: Middle-Inner
  { rx: 31.0, ry: 25.0 }, // Shell 2: Middle-Outer
  { rx: 37.0, ry: 30.5 }, // Shell 3: Outer Perimeter
];

/**
 * Natural continuous angular rotation curve:
 * - Start (p < 0.15): Soft acceleration into motion (nhẹ nhưng rõ)
 * - Mid (0.15 <= p < 0.68): Stable, steady, delightful whirling speed
 * - End (p >= 0.68): Smooth, gentle deceleration (chậm dần nhẹ nhàng)
 * Reaches ~3.4 full revolutions across the spin.
 */
function getLotteryCumulativeAngle(p: number): number {
  const totalAngle = 3.4 * Math.PI * 2;
  if (p <= 0.15) {
    const t = p / 0.15;
    return totalAngle * 0.15 * (0.35 * t + 0.45 * t * t);
  } else if (p <= 0.68) {
    const base0 = totalAngle * 0.15 * 0.8;
    const t = p - 0.15;
    return base0 + totalAngle * t * 1.25;
  } else {
    const base0 = totalAngle * 0.15 * 0.8;
    const base1 = base0 + totalAngle * 0.53 * 1.25;
    const t = (p - 0.68) / 0.32;
    // Deceleration integral: v(t) = 1.25 * (1 - t^1.5)
    const intDecel = 1.25 * (t - Math.pow(t, 2.5) / 2.5);
    return base1 + totalAngle * 0.32 * intDecel;
  }
}

export const BoatRaceVisual: React.FC<BoatRaceProps> = ({
  students,
  isSpinning,
  hasCompleted,
  winner,
  selectedStudents,
  duration = 3800,
  allClassStudents,
  onSelectStudentProfile,
}) => {
  // 1. Resolve active winners strictly from allClassStudents || students by ID
  const activeWinners = useMemo(() => {
    const raw =
      selectedStudents && selectedStudents.length > 0
        ? selectedStudents
        : winner
        ? [winner]
        : [];
    const pool = allClassStudents || students;
    return raw.map((w) => pool.find((s) => s.id === w.id) || w);
  }, [selectedStudents, winner, allClassStudents, students]);

  // 2. Adaptive ball sizing based on class size
  const sizeConfig = useMemo(() => {
    const count = students.length;
    if (count <= 10) {
      return {
        ballPx: 44,
        sttFont: 'text-base font-black',
        ringClass: 'ring-2',
        numShells: 2,
        bounceAmp: 3.8,
      };
    } else if (count <= 20) {
      return {
        ballPx: 38,
        sttFont: 'text-sm font-black',
        ringClass: 'ring-2',
        numShells: 3,
        bounceAmp: 3.5,
      };
    } else if (count <= 32) {
      return {
        ballPx: 32,
        sttFont: 'text-xs font-black',
        ringClass: 'ring-1.5',
        numShells: 4,
        bounceAmp: 3.0,
      };
    } else {
      return {
        ballPx: 26,
        sttFont: 'text-[10px] font-black',
        ringClass: 'ring-1',
        numShells: 4,
        bounceAmp: 2.5,
      };
    }
  }, [students.length]);

  // 3. Exact 1:1 Mapping: Every single student = exactly 1 number ball
  const balls = useMemo<LotteryBall[]>(() => {
    if (!students || students.length === 0) return [];
    const count = students.length;
    const numShells = sizeConfig.numShells;

    return students.map((st, idx) => {
      const palette = BALL_PALETTES[idx % BALL_PALETTES.length];
      const stt = getStudentSTT(st, allClassStudents || students);

      const shellIndex = idx % numShells;
      const shellCount = Math.ceil(count / numShells);
      const shellPos = Math.floor(idx / numShells);

      // Staggered evenly around 360 deg per shell so balls never bunch up
      const initialPhase =
        (shellPos / (shellCount || 1)) * Math.PI * 2 + shellIndex * 0.72;

      // Subtle organic speed variation (0.94x to 1.06x)
      const speedFactor = 0.94 + ((idx * 5) % 4) * 0.04;
      const bounceFreq = 1.8 + (idx % 3) * 0.4;
      const bouncePhase = (idx * 1.6) % (Math.PI * 2);

      return {
        id: st.id,
        student: st,
        stt,
        ...palette,
        shellIndex,
        initialPhase,
        speedFactor,
        bounceFreq,
        bouncePhase,
      };
    });
  }, [students, allClassStudents, sizeConfig.numShells]);

  // 4. Smooth 60fps Animation Loop with React State
  const [animProgress, setAnimProgress] = useState(0);
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

  // Ambient gentle drift angle when idle so balls look alive
  const [idleAngle, setIdleAngle] = useState(0);
  useEffect(() => {
    if (isSpinning || hasCompleted) return;
    let animId: number;
    let lastT = performance.now();
    const idleLoop = (t: number) => {
      const dt = (t - lastT) / 1000;
      lastT = t;
      setIdleAngle((prev) => (prev + dt * 0.3) % (Math.PI * 2));
      animId = requestAnimationFrame(idleLoop);
    };
    animId = requestAnimationFrame(idleLoop);
    return () => cancelAnimationFrame(animId);
  }, [isSpinning, hasCompleted]);

  // Drum Center Coordinates (in %)
  const CENTER_X = 50;
  const CENTER_Y = 48;

  return (
    <div className="w-full max-w-4xl py-2 px-2 select-none flex flex-col items-center">
      {/* Main Lottery Drum Arena */}
      <div className="relative w-full rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-b from-slate-950 via-[#0a1122] to-[#060a14] p-3 sm:p-5 shadow-2xl h-[440px] sm:h-[480px] flex flex-col justify-between">
        
        {/* Subtle Ambient Stadium Floodlights */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-12 left-1/3 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Top Header Information */}
        <div className="relative z-20 flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-sm shadow-md shadow-amber-500/30">
              🎱
            </div>
            <div>
              <span className="text-xs font-black tracking-widest uppercase text-amber-400 block leading-tight">
                LỒNG QUAY BI XỔ SỐ
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                Quỹ đạo elip phân tầng • Đảo đều tự nhiên
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-300">
              {isSpinning ? (
                <span className="text-amber-300 font-bold animate-pulse flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
                  <span>Lồng đang quay, các viên bi đang đảo đều...</span>
                </span>
              ) : hasCompleted ? (
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {activeWinners.length > 1
                      ? `Đã rút trúng ${activeWinners.length} viên bi may mắn!`
                      : 'Đã rút trúng viên bi may mắn!'}
                  </span>
                </span>
              ) : (
                <span className="text-slate-400">
                  {students.length > 0
                    ? `Hiện có ${students.length} viên bi trong lồng • Nhấn QUAY TÊN để bắt đầu`
                    : 'Chưa có học sinh phù hợp bộ lọc'}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Center Arena: 3D Spherical Glass Lottery Cage */}
        <div className="relative z-10 flex-1 w-full h-full flex items-center justify-center overflow-hidden">
          
          {/* Glass Lottery Drum Outer Frame */}
          <div className="relative w-[340px] h-[340px] sm:w-[380px] sm:h-[380px] rounded-full flex items-center justify-center">
            
            {/* Outer Brass Metallic Ring */}
            <div className="absolute inset-0 rounded-full border-4 border-amber-400/40 shadow-[0_0_35px_rgba(245,158,11,0.25),inset_0_0_30px_rgba(0,0,0,0.8)]" />
            
            {/* Secondary Inner Chrome Ring */}
            <div className="absolute inset-2.5 rounded-full border border-sky-400/30 bg-radial from-slate-900/60 via-slate-950/85 to-slate-950/95 backdrop-blur-[2px]" />
            
            {/* Glass Curvature Specular Highlights (Left Top Glint & Bottom Reflection) */}
            <div className="absolute top-4 left-8 w-44 h-24 rounded-full bg-gradient-to-b from-white/20 to-transparent -rotate-35 blur-[1.5px] pointer-events-none" />
            <div className="absolute bottom-5 right-10 w-36 h-16 rounded-full bg-gradient-to-t from-sky-400/15 to-transparent rotate-25 blur-[2px] pointer-events-none" />

            {/* Central Spindle Hub with Spoke Lines */}
            <div className="absolute w-12 h-12 rounded-full bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 border-2 border-amber-200 shadow-xl flex items-center justify-center z-10 pointer-events-none opacity-85">
              <div className="w-5 h-5 rounded-full bg-slate-950 border border-amber-300/60 shadow-inner flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
              </div>
            </div>

            {/* Subtle Cross Spokes (Golden Rotational Blades) */}
            <svg
              className={`absolute inset-0 w-full h-full pointer-events-none opacity-20 ${
                isSpinning ? 'animate-spin' : ''
              }`}
              style={{ animationDuration: '4s' }}
              viewBox="0 0 100 100"
            >
              <line x1="50" y1="6" x2="50" y2="94" stroke="#f59e0b" strokeWidth="0.75" strokeDasharray="2 3" />
              <line x1="6" y1="50" x2="94" y2="50" stroke="#f59e0b" strokeWidth="0.75" strokeDasharray="2 3" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="4 4" />
            </svg>

            {/* LOTTERY BALLS RUNNING INSIDE THE CAGE (GAME STATE ONLY: UNMOUNTED WHEN RESULT IS PRESENTED) */}
            {!hasCompleted &&
              balls.map((b, idx) => {
                const isWinner = activeWinners.some((w) => w.id === b.id);
                const shell = ORBIT_SHELLS[b.shellIndex] || ORBIT_SHELLS[0];

                let currentX = CENTER_X;
                let currentY = CENTER_Y;
                let scale = 1.0;
                let isSpotlight = false;

                if (isSpinning) {
                  const p = animProgress;
                  const baseAngle = getLotteryCumulativeAngle(p);

                  // Exact user-specified formula:
                  // angle = initialPhase + baseAngle * speedFactor
                  // x = centerX + radiusX * cos(angle)
                  // y = centerY + radiusY * sin(angle) + bounce
                  const angle = b.initialPhase + baseAngle * b.speedFactor;
                  const bounce =
                    Math.sin(baseAngle * b.bounceFreq + b.bouncePhase) * sizeConfig.bounceAmp;

                  const orbitX = CENTER_X + shell.rx * Math.cos(angle);
                  const orbitY = CENTER_Y + shell.ry * Math.sin(angle) + bounce;

                  // WINNER SEPARATION ANIMATION (p >= 0.70):
                  // Smooth transition towards center extraction spot without teleporting
                  if (isWinner) {
                    if (p >= 0.70) {
                      const surgeT = (p - 0.70) / 0.30;
                      // Smooth cubic ease curve for gradual extraction
                      const ease = 1 - Math.pow(1 - surgeT, 2.6);

                      // Multi-winner fanning out horizontally
                      const winnerIdx = activeWinners.findIndex((w) => w.id === b.id);
                      const winnerOffset =
                        activeWinners.length > 1
                          ? (winnerIdx - (activeWinners.length - 1) / 2) * 13
                          : 0;

                      const targetX = CENTER_X + winnerOffset;
                      const targetY = CENTER_Y;

                      currentX = orbitX * (1 - ease) + targetX * ease;
                      currentY = orbitY * (1 - ease) + targetY * ease;
                      scale = 1.0 + ease * 0.35;
                      isSpotlight = true;
                    } else {
                      currentX = orbitX;
                      currentY = orbitY;
                    }
                  } else {
                    currentX = orbitX;
                    currentY = orbitY;
                  }
                } else {
                  // Idle State: Gentle ambient breathing drift around drum
                  const angle = b.initialPhase + idleAngle * b.speedFactor;
                  const bounce =
                    Math.sin(idleAngle * 2 + b.bouncePhase) * (sizeConfig.bounceAmp * 0.4);
                  currentX = CENTER_X + shell.rx * Math.cos(angle);
                  currentY = CENTER_Y + shell.ry * Math.sin(angle) + bounce;
                }

                return (
                  <div
                    key={b.id}
                    style={{
                      left: `${currentX.toFixed(2)}%`,
                      top: `${currentY.toFixed(2)}%`,
                      transform: `translate(-50%, -50%) scale(${scale.toFixed(2)})`,
                      zIndex: isSpotlight ? 40 : 15 + idx,
                      transition: isSpinning ? 'none' : 'transform 0.25s ease-out',
                    }}
                    onClick={() => {
                      if (!isSpinning) {
                        onSelectStudentProfile?.(b.student);
                      }
                    }}
                    className={`absolute select-none pointer-events-auto ${
                      !isSpinning && onSelectStudentProfile ? 'cursor-pointer hover:scale-110' : ''
                    }`}
                    title={
                      !isSpinning && onSelectStudentProfile
                        ? `Bấm để xem Thẻ học sinh: ${b.student.name}`
                        : undefined
                    }
                  >
                    {/* 3D Acrylic Circular Lottery Number Ball */}
                    <div
                      style={{
                        width: `${sizeConfig.ballPx}px`,
                        height: `${sizeConfig.ballPx}px`,
                        background: b.bgGradient,
                        borderColor: b.borderColor,
                        boxShadow: `inset -2px -3px 5px rgba(0, 0, 0, 0.65), inset 2px 3px 5px rgba(255, 255, 255, 0.75), 0 4px 10px ${b.glowColor}`,
                      }}
                      className={`relative rounded-full border flex items-center justify-center transition-shadow ${
                        sizeConfig.ringClass
                      }`}
                    >
                      {/* Gloss Glint on Top-Left */}
                      <div className="absolute top-0.5 left-1 w-2.5 h-1.5 rounded-full bg-white/85 blur-[0.3px] pointer-events-none" />

                      {/* STT Number displayed clearly in center */}
                      <span
                        style={{ color: b.textColor }}
                        className={`${sizeConfig.sttFont} leading-none tracking-tighter drop-shadow-xs`}
                      >
                        {b.stt}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Bottom Extraction Chute & Mechanical Stand Base */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
            {/* Golden Ball Delivery Chute */}
            <div className="px-4 py-1 rounded-full bg-slate-900/95 border-2 border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-1.5 text-[11px] font-black text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>CỬA RÚT BI XỔ SỐ</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            {/* Stand Leg */}
            <div className="w-12 h-2.5 bg-gradient-to-b from-amber-600 to-amber-950 rounded-b-md border-x border-b border-amber-400/40" />
          </div>

          {/* GRAND WINNER CELEBRATION MODAL (APPEARS WHEN COMPLETED) */}
          {hasCompleted && activeWinners.length > 0 && (
            <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-3 animate-fade-in pointer-events-auto">
              <div className="text-center max-w-xl w-full px-4 py-4 rounded-3xl bg-slate-900/95 border-2 border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.35)] space-y-3 animate-scale-in">
                
                {/* Winner Header Banner */}
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl animate-bounce">🎉</span>
                  <div className="text-xs sm:text-sm font-black tracking-widest uppercase text-amber-400 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>
                      {activeWinners.length === 1
                        ? 'KẾT QUẢ QUAY BI XỔ SỐ'
                        : `KẾT QUẢ ${activeWinners.length} VIÊN BI XỔ SỐ`}
                    </span>
                  </div>
                  <span className="text-2xl animate-bounce">🎉</span>
                </div>

                {/* Single Winner Display: Big Acrylic Winner Ball + Full Name */}
                {activeWinners.length === 1 ? (
                  <div className="flex flex-col items-center gap-2.5 py-1">
                    {/* Big 3D Winning Number Ball */}
                    <button
                      type="button"
                      onClick={() => onSelectStudentProfile?.(activeWinners[0])}
                      className={`relative ${
                        onSelectStudentProfile
                          ? 'cursor-pointer hover:scale-105 transition-transform'
                          : ''
                      }`}
                      title={
                        onSelectStudentProfile
                          ? `Bấm để xem Thẻ học sinh: ${activeWinners[0].name}`
                          : undefined
                      }
                    >
                      <div
                        style={{
                          background:
                            'radial-gradient(circle at 35% 30%, #fef08a 0%, #eab308 50%, #854d0e 100%)',
                          boxShadow:
                            'inset -6px -8px 14px rgba(0, 0, 0, 0.7), inset 6px 8px 14px rgba(255, 255, 255, 0.8), 0 10px 25px rgba(234, 179, 8, 0.6)',
                        }}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-amber-200 flex items-center justify-center ring-4 ring-amber-400/50"
                      >
                        {/* Specular Glint */}
                        <div className="absolute top-2 left-3 w-5 h-2.5 rounded-full bg-white/90 blur-[0.5px]" />
                        {/* Center STT Badge: SINGLE STT DISPLAY */}
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white shadow-xl flex items-center justify-center border-2 border-slate-300">
                          <span className="font-black text-xl sm:text-2xl text-slate-950">
                            #{getStudentSTT(activeWinners[0], allClassStudents || students)}
                          </span>
                        </div>
                      </div>
                      <div className="absolute -top-3 -right-2 text-2xl animate-pulse">
                        👑
                      </div>
                    </button>

                    {/* FULL STUDENT NAME PROMINENTLY DISPLAYED */}
                    <div className="text-center">
                      <h2
                        onClick={() => onSelectStudentProfile?.(activeWinners[0])}
                        className={`text-2xl sm:text-4xl font-black text-amber-300 tracking-tight leading-tight mt-1 ${
                          onSelectStudentProfile
                            ? 'cursor-pointer hover:underline hover:text-white transition-colors'
                            : ''
                        }`}
                        title={
                          onSelectStudentProfile
                            ? `Bấm để xem Thẻ học sinh: ${activeWinners[0].name}`
                            : undefined
                        }
                      >
                        {activeWinners[0].name}
                      </h2>
                      <div className="text-xs sm:text-sm font-bold text-slate-300 mt-2 flex items-center justify-center">
                        <span className="px-3.5 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300 shadow-sm">
                          Lần thứ {Math.max(1, activeWinners[0].callCount ?? 1)} lên bảng
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Multiple Winners Display: Grid of Finished Balls + Full Names */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto px-1 py-1">
                    {activeWinners.map((w, idx) => {
                      const stt = getStudentSTT(w, allClassStudents || students);
                      const palette = BALL_PALETTES[idx % BALL_PALETTES.length];
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => onSelectStudentProfile?.(w)}
                          className="px-3.5 py-2 rounded-2xl bg-slate-800/90 hover:bg-slate-750 border border-amber-400/70 hover:border-amber-300 text-amber-300 font-black text-sm sm:text-base shadow-lg flex items-center gap-3 transition-transform hover:scale-[1.02] cursor-pointer text-left w-full"
                          title="Bấm để xem Thẻ học sinh"
                        >
                          {/* Mini 3D Ball */}
                          <div
                            style={{
                              background: palette.bgGradient,
                              boxShadow: `inset -2px -3px 5px rgba(0,0,0,0.6), inset 2px 3px 5px rgba(255,255,255,0.7), 0 2px 6px ${palette.glowColor}`,
                              borderColor: palette.borderColor,
                            }}
                            className="w-10 h-10 rounded-full border flex items-center justify-center shrink-0"
                          >
                            <span
                              style={{ color: palette.textColor }}
                              className="font-black text-sm leading-none"
                            >
                              #{stt}
                            </span>
                          </div>

                          {/* Student Details: Full Name & Stats */}
                          <div className="flex-1 text-left min-w-0">
                            <div className="text-amber-200 hover:text-white hover:underline font-black text-sm truncate">
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
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 pt-2.5 mt-1 border-t border-slate-800/80">
          <span className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Mỗi học sinh = 1 viên bi số ({balls.length} viên bi) • Đảo đều trong lồng quay
            </span>
          </span>
          <span className="hidden sm:inline">
            Viên bi may mắn tách ra tự nhiên về trung tâm 🎱
          </span>
        </div>
      </div>
    </div>
  );
};
