import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Trophy, Flag, Flame, Sparkles } from 'lucide-react';
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

interface TrackRacer {
  id: string;
  student: Student;
  stt: number;
  bgGradient: string;
  borderColor: string;
  glowColor: string;
  textColor: string;
  packOffset: number; // 0 (leader) to 1 (tail)
  jostlePhase: number;
}

// 8 Vibrant 3D Neon Acrylic Spherical Ball Palettes
const RACER_PALETTES = [
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

// SVG ViewBox dimensions: 1000 x 500
export const TRACK_PATH_D =
  'M 80 70 C 240 60, 390 90, 540 80 C 710 70, 900 90, 910 190 C 920 270, 740 240, 560 240 C 380 240, 220 220, 120 290 C 40 340, 110 420, 320 420 C 520 420, 730 410, 900 420';

// Mathematical Cubic Bezier Arc-Length Lookup Table Generator (1001 uniform steps)
function buildArcLengthLut() {
  function bezier(
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    t: number
  ) {
    const mt = 1 - t;
    return {
      x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
      y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
    };
  }

  const segments = [
    { p0: { x: 80, y: 70 }, p1: { x: 240, y: 60 }, p2: { x: 390, y: 90 }, p3: { x: 540, y: 80 } },
    { p0: { x: 540, y: 80 }, p1: { x: 710, y: 70 }, p2: { x: 900, y: 90 }, p3: { x: 910, y: 190 } },
    { p0: { x: 910, y: 190 }, p1: { x: 920, y: 270 }, p2: { x: 740, y: 240 }, p3: { x: 560, y: 240 } },
    { p0: { x: 560, y: 240 }, p1: { x: 380, y: 240 }, p2: { x: 220, y: 220 }, p3: { x: 120, y: 290 } },
    { p0: { x: 120, y: 290 }, p1: { x: 40, y: 340 }, p2: { x: 110, y: 420 }, p3: { x: 320, y: 420 } },
    { p0: { x: 320, y: 420 }, p1: { x: 520, y: 420 }, p2: { x: 730, y: 410 }, p3: { x: 900, y: 420 } },
  ];

  const rawPoints: { x: number; y: number; dist: number }[] = [];
  let totalArcLen = 0;
  let prev = segments[0].p0;
  rawPoints.push({ x: prev.x, y: prev.y, dist: 0 });

  for (const seg of segments) {
    const steps = 150;
    for (let i = 1; i <= steps; i++) {
      const pt = bezier(seg.p0, seg.p1, seg.p2, seg.p3, i / steps);
      const d = Math.hypot(pt.x - prev.x, pt.y - prev.y);
      totalArcLen += d;
      rawPoints.push({ x: pt.x, y: pt.y, dist: totalArcLen });
      prev = pt;
    }
  }

  const SAMPLES = 1000;
  const lut: { x: number; y: number }[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const targetDist = (i / SAMPLES) * totalArcLen;
    let lo = 0;
    let hi = rawPoints.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (rawPoints[mid].dist < targetDist) lo = mid + 1;
      else hi = mid;
    }
    const idx = Math.max(1, lo);
    const pA = rawPoints[idx - 1];
    const pB = rawPoints[idx];
    const span = pB.dist - pA.dist || 1;
    const factor = Math.max(0, Math.min(1, (targetDist - pA.dist) / span));
    lut.push({
      x: pA.x + (pB.x - pA.x) * factor,
      y: pA.y + (pB.y - pA.y) * factor,
    });
  }
  return lut;
}

const ARC_LUT = buildArcLengthLut();

function getTrackCoordinates(s: number): { xPercent: number; yPercent: number } {
  const clamped = Math.max(0, Math.min(1, s));
  const idx = Math.min(1000, Math.max(0, Math.round(clamped * 1000)));
  const pt = ARC_LUT[idx];
  return {
    xPercent: (pt.x / 1000) * 100,
    yPercent: (pt.y / 500) * 100,
  };
}

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

  // 2. Adaptive number circle sizing based on class size (projector-optimized legibility)
  const sizeConfig = useMemo(() => {
    const count = students.length;
    if (count <= 20) {
      return {
        ballPx: 38,
        sttFont: 'text-sm font-black',
        ringClass: 'ring-2',
        packSpan: 0.22,
      };
    } else if (count <= 35) {
      return {
        ballPx: 31,
        sttFont: 'text-xs font-black',
        ringClass: 'ring-1.5',
        packSpan: 0.28,
      };
    } else {
      return {
        ballPx: 25,
        sttFont: 'text-[10px] font-black',
        ringClass: 'ring-1',
        packSpan: 0.35,
      };
    }
  }, [students.length]);

  // 3. Exact 1:1 Mapping: Every student in `students` = exactly 1 number circle
  const racers = useMemo<TrackRacer[]>(() => {
    if (!students || students.length === 0) return [];
    const count = students.length;

    return students.map((st, idx) => {
      const palette = RACER_PALETTES[idx % RACER_PALETTES.length];
      const stt = getStudentSTT(st, allClassStudents || students);

      // Distribute evenly along the caravan from pack leader (0) to pack tail (1)
      const packOffset = count > 1 ? idx / (count - 1) : 0;
      const jostlePhase = (idx * 1.8) % (Math.PI * 2);

      return {
        id: st.id,
        student: st,
        stt,
        ...palette,
        packOffset,
        jostlePhase,
      };
    });
  }, [students, allClassStudents]);

  // 4. Smooth 60fps Animation Loop with React state
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

  return (
    <div className="w-full max-w-4xl py-2 px-2 select-none flex flex-col items-center">
      {/* Main Track Arena */}
      <div className="relative w-full rounded-3xl overflow-hidden border border-sky-500/30 bg-gradient-to-b from-slate-950 via-[#0a1224] to-[#060a14] p-3 sm:p-5 shadow-2xl h-[430px] sm:h-[470px] flex flex-col justify-between">
        
        {/* Subtle Ambient Stadium Floodlights */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-10 left-1/4 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-500/10 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Top Header Information */}
        <div className="relative z-20 flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sm shadow-md shadow-sky-500/30">
              🏁
            </div>
            <div>
              <span className="text-xs font-black tracking-widest uppercase text-sky-400 block leading-tight">
                ĐƯỜNG ĐUA SỐ
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                Đường đua uốn lượn mềm mại • Bứt tốc về đích
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-300">
              {isSpinning ? (
                <span className="text-amber-300 font-bold animate-pulse flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
                  <span>Đoàn xe số đang bứt phá qua các góc cua uốn lượn...</span>
                </span>
              ) : hasCompleted ? (
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {activeWinners.length > 1
                      ? `Đã có ${activeWinners.length} số xuất sắc cán đích!`
                      : 'Đã có chiến mã số xuất sắc cán đích!'}
                  </span>
                </span>
              ) : (
                <span className="text-slate-400">
                  {students.length > 0
                    ? `Hiện có ${students.length} viên số trên vạch xuất phát • Nhấn QUAY TÊN để bắt đầu`
                    : 'Chưa có học sinh phù hợp bộ lọc'}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Center Arena Canvas: Smooth Ribbon Track Polyline */}
        <div className="relative z-10 flex-1 w-full h-full flex items-center justify-center overflow-hidden">
          
          {/* SVG Asphalt Ribbon Track */}
          <svg
            viewBox="0 0 1000 500"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <defs>
              {/* Neon Glow Filter */}
              <filter id="trackNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* 1. Track Outer Ambient Shadow & Glow */}
            <path
              d={TRACK_PATH_D}
              fill="none"
              stroke="#0284c7"
              strokeWidth="56"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.25"
              filter="url(#trackNeonGlow)"
            />

            {/* 2. Track Curbs / Borders */}
            <path
              d={TRACK_PATH_D}
              fill="none"
              stroke="#0369a1"
              strokeWidth="50"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* 3. Asphalt Surface */}
            <path
              d={TRACK_PATH_D}
              fill="none"
              stroke="#0b1329"
              strokeWidth="42"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* 4. Dashed Golden Guide Divider */}
            <path
              d={TRACK_PATH_D}
              fill="none"
              stroke="#facc15"
              strokeWidth="1.8"
              strokeDasharray="9 7"
              strokeLinecap="round"
              opacity="0.65"
            />
          </svg>

          {/* START BANNER (Start: x=8%, y=14%) */}
          <div
            style={{ left: '8%', top: '14%', transform: 'translate(-50%, -130%)' }}
            className="absolute pointer-events-none z-20 flex flex-col items-center"
          >
            <div className="px-2.5 py-0.5 rounded-md bg-emerald-950/95 border border-emerald-400 text-[10px] font-black tracking-wider text-emerald-300 shadow-lg flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>START 🚦</span>
            </div>
            <div className="w-0.5 h-3 bg-emerald-400/80" />
          </div>

          {/* FINISH ARCH GATE (Finish: x=90%, y=84%) */}
          <div
            style={{ left: '90%', top: '84%', transform: 'translate(-50%, -50%)' }}
            className="absolute pointer-events-none z-25 flex flex-col items-center"
          >
            {/* Checkered Finish Arch Bar */}
            <div className="absolute -top-7 px-3 py-0.5 rounded-md bg-slate-900/95 border-2 border-amber-400 text-amber-300 font-black text-[11px] shadow-[0_0_15px_rgba(251,191,36,0.5)] flex items-center gap-1 animate-pulse">
              <span>🏁 ĐÍCH</span>
            </div>
            {/* Checkered Finish Line Strip */}
            <div className="w-3 h-12 bg-repeating-conic from-white to-slate-950 rounded-sm border border-amber-400/80 shadow-md flex flex-col justify-between py-0.5">
              <div className="w-full h-1 bg-white" />
              <div className="w-full h-1 bg-slate-950" />
              <div className="w-full h-1 bg-white" />
              <div className="w-full h-1 bg-slate-950" />
            </div>
          </div>

          {/* NUMBER RACER CIRCLES TRAVELING ALONG THE WINDING TRACK (GAME STATE ONLY: UNMOUNTED WHEN RESULT IS PRESENTED) */}
          {!hasCompleted &&
            racers.map((racer, idx) => {
              const isWinner = activeWinners.some((w) => w.id === racer.id);
              let s = 0.05;
              let scale = 1.0;
              let isSurging = false;

              if (isSpinning) {
                const p = animProgress;

                // Base caravan progression along the winding path:
                // - Cruising (p < 0.80): smoothly advances across the 3 sweeping tiers
                // - Final Sprint (p >= 0.80): winner accelerates smoothly to finish line
                let baseProgress: number;
                if (p < 0.80) {
                  const cruiseT = p / 0.80;
                  baseProgress =
                    0.04 + sizeConfig.packSpan + Math.pow(cruiseT, 0.96) * (0.84 - sizeConfig.packSpan);
                } else {
                  const decelT = (p - 0.80) / 0.20;
                  const ease = 1 - Math.pow(1 - decelT, 3);
                  baseProgress = 0.84 + ease * 0.08;
                }

                const packPos = racer.packOffset * sizeConfig.packSpan;
                const jostle =
                  Math.sin(p * Math.PI * 7 + racer.jostlePhase) * (p < 0.80 ? 0.015 : 0.005);
                s = baseProgress - packPos + jostle;

                // Winner Acceleration Sprint (p >= 0.80)
                if (isWinner) {
                  if (p >= 0.80) {
                    const surgeT = (p - 0.80) / 0.20;
                    const surgeEase = Math.pow(surgeT, 2.2);
                    const winnerIdx = activeWinners.findIndex((w) => w.id === racer.id);
                    const targetFinishS =
                      activeWinners.length > 1
                        ? 1.0 - winnerIdx * 0.032
                        : 1.0;
                    // Smoothly blend from current position to finish line along the exact curve
                    s = s * (1 - surgeEase) + targetFinishS * surgeEase;
                    scale = 1.0 + surgeEase * 0.32;
                    isSurging = true;
                  }
                } else {
                  // Non-winners keep running smoothly behind
                  s = Math.min(0.86, s);
                }
              } else {
                // Idle state: caravan distributed neatly behind START on top tier
                s = Math.max(
                  0.015,
                  0.04 + sizeConfig.packSpan - racer.packOffset * sizeConfig.packSpan
                );
              }

              s = Math.max(0.01, Math.min(1.0, s));
              const pt = getTrackCoordinates(s);

              return (
                <div
                  key={racer.id}
                  style={{
                    left: `${pt.xPercent.toFixed(2)}%`,
                    top: `${pt.yPercent.toFixed(2)}%`,
                    transform: `translate(-50%, -50%) scale(${scale.toFixed(2)})`,
                    zIndex: isSurging ? 35 : 15 + idx,
                    transition: isSpinning ? 'none' : 'all 0.25s ease-out',
                  }}
                  onClick={() => {
                    // Only allow clicking profile when not in the middle of spinning
                    if (!isSpinning) {
                      onSelectStudentProfile?.(racer.student);
                    }
                  }}
                  className={`absolute select-none pointer-events-auto ${
                    !isSpinning && onSelectStudentProfile ? 'cursor-pointer hover:scale-110' : ''
                  }`}
                  title={
                    !isSpinning && onSelectStudentProfile
                      ? `Bấm để xem Thẻ học sinh: ${racer.student.name}`
                      : undefined
                  }
                >
                  {/* 3D Circular Number Ball */}
                  <div
                    style={{
                      width: `${sizeConfig.ballPx}px`,
                      height: `${sizeConfig.ballPx}px`,
                      background: racer.bgGradient,
                      borderColor: racer.borderColor,
                      boxShadow: `inset -2px -3px 5px rgba(0, 0, 0, 0.65), inset 2px 3px 5px rgba(255, 255, 255, 0.75), 0 4px 10px ${racer.glowColor}`,
                    }}
                    className={`relative rounded-full border flex items-center justify-center transition-shadow ${
                      sizeConfig.ringClass
                    }`}
                  >
                    {/* Gloss Glint */}
                    <div className="absolute top-0.5 left-1 w-2.5 h-1.5 rounded-full bg-white/85 blur-[0.3px] pointer-events-none" />

                    {/* STT Number displayed upright for readability */}
                    <span
                      style={{ color: racer.textColor }}
                      className={`${sizeConfig.sttFont} leading-none tracking-tighter drop-shadow-xs`}
                    >
                      {racer.stt}
                    </span>
                  </div>
                </div>
              );
            })}

          {/* GRAND WINNER PRESENTATION AREA (APPEARS WHEN COMPLETED) */}
          {hasCompleted && activeWinners.length > 0 && (
            <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-3 animate-fade-in pointer-events-auto">
              <div className="text-center max-w-xl w-full px-4 py-4 rounded-3xl bg-slate-900/95 border-2 border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.35)] space-y-3 animate-scale-in">
                
                {/* Winner Header Banner */}
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl animate-bounce">🏁</span>
                  <div className="text-xs sm:text-sm font-black tracking-widest uppercase text-amber-400 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>
                      {activeWinners.length === 1
                        ? 'SỐ CÁN ĐÍCH ĐẦU TIÊN'
                        : `KẾT QUẢ ${activeWinners.length} SỐ CÁN ĐÍCH`}
                    </span>
                  </div>
                  <span className="text-2xl animate-bounce">🏁</span>
                </div>

                {/* Single Winner Display: Big Winner Ball + Full Student Name */}
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
                      const palette = RACER_PALETTES[idx % RACER_PALETTES.length];
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
            <Flag className="w-3.5 h-3.5 text-sky-400" />
            <span>
              Mỗi học sinh = 1 viên số tròn ({racers.length} học sinh) • Chạy nối tiếp trên đường đua uốn lượn
            </span>
          </span>
          <span className="hidden sm:inline">
            Đoạn cuối winner tăng tốc bứt phá về cổng đích 🏁
          </span>
        </div>
      </div>
    </div>
  );
};
