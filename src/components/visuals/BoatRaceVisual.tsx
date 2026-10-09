import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Trophy, Sparkles } from 'lucide-react';
import { Student } from '../../types';
import { getStudentSTT } from '../../utils/studentDisplay';

interface LotteryBallsVisualProps {
  students: Student[];
  isSpinning: boolean;
  hasCompleted: boolean;
  winner: Student | null;
  selectedStudents?: Student[];
  duration?: number;
  allClassStudents?: Student[];
}

interface LotteryBall {
  id: string;
  student: Student;
  stt: number;
  // Visual theme
  bgGradient: string;
  borderColor: string;
  glowColor: string;
  stripeColor: string;
  textColor: string;

  // Orbit parameters (deterministic, smooth, physics-free)
  orbitType: 'circle' | 'ellipse_horizontal' | 'ellipse_tilted';
  radiusX: number; // in percentage of chamber (12% to 30%)
  radiusY: number; // in percentage of chamber (10% to 22%)
  phase: number;   // initial angle phase in radians
  speedFactor: number; // subtle variation (0.85 to 1.25)
  tiltAngle: number;   // tilt angle in radians
  bounceFreq: number;  // bounce oscillations per revolution (2.0 to 4.0)
  bounceAmp: number;   // bounce amplitude in % (1.2% to 2.8%)
  bouncePhase: number;

  // Rendered position & orientation
  x: number;
  y: number;
  radius: number; // in px
  rot: number;    // subtle visual wobble
}

// 8 Vibrant 3D Lottery Ball Color Palettes (Rich casino / television lottery style)
const LOTTERY_BALL_THEMES = [
  {
    bgGradient: 'radial-gradient(circle at 35% 30%, #fef08a 0%, #eab308 50%, #854d0e 100%)', // Gold / Amber
    borderColor: '#fef9c3',
    glowColor: 'rgba(234, 179, 8, 0.45)',
    stripeColor: 'rgba(113, 63, 18, 0.4)',
    textColor: '#1e1b4b',
  },
  {
    bgGradient: 'radial-gradient(circle at 35% 30%, #bae6fd 0%, #0284c7 50%, #0c4a6e 100%)', // Sky / Cyan
    borderColor: '#e0f2fe',
    glowColor: 'rgba(2, 132, 199, 0.45)',
    stripeColor: 'rgba(12, 74, 110, 0.4)',
    textColor: '#0f172a',
  },
  {
    bgGradient: 'radial-gradient(circle at 35% 30%, #fecaca 0%, #ef4444 50%, #7f1d1d 100%)', // Ruby / Red
    borderColor: '#fee2e2',
    glowColor: 'rgba(239, 68, 68, 0.45)',
    stripeColor: 'rgba(127, 29, 29, 0.4)',
    textColor: '#450a0a',
  },
  {
    bgGradient: 'radial-gradient(circle at 35% 30%, #bbf7d0 0%, #10b981 50%, #064e3b 100%)', // Emerald / Green
    borderColor: '#dcfce7',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    stripeColor: 'rgba(6, 78, 59, 0.4)',
    textColor: '#022c22',
  },
  {
    bgGradient: 'radial-gradient(circle at 35% 30%, #e9d5ff 0%, #8b5cf6 50%, #4c1d95 100%)', // Violet / Purple
    borderColor: '#f3e8ff',
    glowColor: 'rgba(139, 92, 246, 0.45)',
    stripeColor: 'rgba(76, 29, 149, 0.4)',
    textColor: '#2e1065',
  },
  {
    bgGradient: 'radial-gradient(circle at 35% 30%, #fed7aa 0%, #f97316 50%, #7c2d12 100%)', // Orange / Tangerine
    borderColor: '#ffedd5',
    glowColor: 'rgba(249, 115, 22, 0.45)',
    stripeColor: 'rgba(124, 45, 18, 0.4)',
    textColor: '#431407',
  },
  {
    bgGradient: 'radial-gradient(circle at 35% 30%, #fbcfe8 0%, #ec4899 50%, #831843 100%)', // Pink / Rose
    borderColor: '#fce7f3',
    glowColor: 'rgba(236, 72, 153, 0.45)',
    stripeColor: 'rgba(131, 24, 67, 0.4)',
    textColor: '#500724',
  },
  {
    bgGradient: 'radial-gradient(circle at 35% 30%, #c7d2fe 0%, #4f46e5 50%, #1e1b4b 100%)', // Indigo / Deep Blue
    borderColor: '#e0e7ff',
    glowColor: 'rgba(79, 70, 229, 0.45)',
    stripeColor: 'rgba(30, 27, 75, 0.4)',
    textColor: '#0f172a',
  },
];

export const BoatRaceVisual: React.FC<LotteryBallsVisualProps> = ({
  students,
  isSpinning,
  hasCompleted,
  winner,
  selectedStudents,
  duration = 3800,
  allClassStudents,
}) => {
  // 1. Resolve up-to-date active winners strictly from allClassStudents || students by id
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

  // 2. Initialize lottery balls with deterministic orbit & bounce properties
  const initialBalls = useMemo<LotteryBall[]>(() => {
    if (!students || students.length === 0) return [];
    const count = students.length;
    // Ball radius scales nicely: smaller if many students, bigger if few
    const radius = count > 35 ? 18 : count > 20 ? 21 : 25;

    return students.map((st, idx) => {
      const theme = LOTTERY_BALL_THEMES[idx % LOTTERY_BALL_THEMES.length];
      const stt = getStudentSTT(st, allClassStudents || students);

      // Assign one of 3 orbit patterns:
      // Pattern 0: Tròn (Circle)
      // Pattern 1: Elip ngang (Horizontal Ellipse)
      // Pattern 2: Elip nghiêng (Tilted Ellipse)
      const patternMode = idx % 3;
      let orbitType: 'circle' | 'ellipse_horizontal' | 'ellipse_tilted' = 'circle';
      let radiusX = 22;
      let radiusY = 22;
      let tiltAngle = 0;

      if (patternMode === 0) {
        orbitType = 'circle';
        const ring = 15 + (idx % 3) * 6; // 15%, 21%, 27%
        radiusX = ring;
        radiusY = ring * 0.85; // Slight perspective squish to fit drum glass
        tiltAngle = 0;
      } else if (patternMode === 1) {
        orbitType = 'ellipse_horizontal';
        radiusX = 24 + (idx % 4) * 2.2; // 24% to 30.6%
        radiusY = 13 + (idx % 3) * 2.5; // 13% to 18%
        tiltAngle = 0;
      } else {
        orbitType = 'ellipse_tilted';
        radiusX = 22 + (idx % 3) * 2.8;
        radiusY = 14 + (idx % 3) * 2.2;
        // Tilt between -14 deg and +14 deg
        tiltAngle = (((idx % 5) - 2) * 0.12);
      }

      // Phase distributed evenly around 2*PI with offset so no two overlap
      const phase = (idx / count) * Math.PI * 2 + ((idx * 1.618) % 1) * 0.4;
      // Varied speed factor: 0.88 to 1.22
      const speedFactor = 0.88 + (idx % 7) * 0.055;
      // Bounce oscillations per revolution: 2.0 to 4.0
      const bounceFreq = 2.2 + (idx % 4) * 0.55;
      // Subtle vertical bounce: 1.2% to 2.8% (not too high or erratic)
      const bounceAmp = 1.2 + (idx % 3) * 0.7;
      const bouncePhase = (idx * 2.1) % (Math.PI * 2);

      // Initial resting position
      const initialAngle = phase;
      const rx = radiusX * Math.cos(initialAngle);
      const ry = radiusY * Math.sin(initialAngle);
      const tiltedX = rx * Math.cos(tiltAngle) - ry * Math.sin(tiltAngle);
      const tiltedY = rx * Math.sin(tiltAngle) + ry * Math.cos(tiltAngle);

      return {
        id: st.id,
        student: st,
        stt,
        ...theme,
        orbitType,
        radiusX,
        radiusY,
        phase,
        speedFactor,
        tiltAngle,
        bounceFreq,
        bounceAmp,
        bouncePhase,
        x: 50 + tiltedX,
        y: 50 + tiltedY,
        radius,
        rot: ((idx % 7) - 3) * 4, // gentle resting angle
      };
    });
  }, [students, allClassStudents]);

  // Balls state
  const [renderedBalls, setRenderedBalls] = useState<LotteryBall[]>([]);
  const [drumRotation, setDrumRotation] = useState<number>(0);
  const [animProgress, setAnimProgress] = useState<number>(0);

  // Sync initial balls
  useEffect(() => {
    setRenderedBalls(initialBalls.map((b) => ({ ...b })));
  }, [initialBalls]);

  // Continuous angle & animation loop
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const globalAngleRef = useRef<number>(0);

  useEffect(() => {
    const winnerIdSet = new Set(activeWinners.map((w) => w.id));
    const chamberCx = 50;
    const chamberCy = 50;
    const chuteX = 50;
    const chuteY = 16;

    if (isSpinning) {
      setAnimProgress(0);
      startTimeRef.current = performance.now();
      lastTimeRef.current = performance.now();

      const updateLoop = (now: number) => {
        const dt = Math.min((now - lastTimeRef.current) / 1000, 0.04); // clamp dt in seconds
        lastTimeRef.current = now;

        const elapsed = now - startTimeRef.current;
        const p = Math.min(1, elapsed / duration);
        setAnimProgress(p);

        // 3-Stage Speed Profile as requested:
        // 1. Đầu animation (p <= 0.25): chuyển động nhanh hơn
        // 2. Giữa animation (0.25 < p <= 0.70): chuyển động ổn định
        // 3. Gần cuối (0.70 < p <= 0.88): giảm tốc dần
        // 4. Kết thúc (p >= 0.88): winner tiến vào ống chọn, bi khác trôi êm dịu
        let currentAngularVelocity = 5.2; // rad/s
        let drumSpeed = 8.5;

        if (p <= 0.25) {
          // Đầu: nhanh hơn
          currentAngularVelocity = 5.8;
          drumSpeed = 9.0;
        } else if (p <= 0.70) {
          // Giữa: ổn định
          currentAngularVelocity = 4.2;
          drumSpeed = 6.5;
        } else if (p <= 0.88) {
          // Gần cuối: giảm tốc dần mượt mà
          const decelT = (p - 0.70) / 0.18; // 0 -> 1
          currentAngularVelocity = 4.2 * (1 - decelT * 0.8); // 4.2 -> 0.84
          drumSpeed = 6.5 * (1 - decelT * 0.8);
        } else {
          // Giai đoạn chốt winner: trôi chậm nhẹ nhàng
          const endT = (p - 0.88) / 0.12; // 0 -> 1
          currentAngularVelocity = Math.max(0.2, 0.84 * (1 - endT));
          drumSpeed = Math.max(0.3, 1.3 * (1 - endT));
        }

        // Integrate angle smoothly (guarantees NO jitter, NO teleport, pure mathematical continuity)
        globalAngleRef.current += currentAngularVelocity * dt;
        setDrumRotation((prev) => (prev + drumSpeed) % 360);

        const currentAngle = globalAngleRef.current;
        const speedScale = currentAngularVelocity / 4.2;

        // Compute updated ball positions
        const nextBalls = initialBalls.map((b) => {
          const isWinningBall = winnerIdSet.has(b.id);

          // Ball's individual angle along orbit
          const ballAngle = currentAngle * b.speedFactor + b.phase;

          // Ellipse base coords
          const rawX = b.radiusX * Math.cos(ballAngle);
          const rawY = b.radiusY * Math.sin(ballAngle);

          // Tilted rotation transform
          const cosTilt = Math.cos(b.tiltAngle);
          const sinTilt = Math.sin(b.tiltAngle);
          const tiltedX = rawX * cosTilt - rawY * sinTilt;
          const tiltedY = rawX * sinTilt + rawY * cosTilt;

          // Natural vertical bounce (scaled by speed so it settles down when slowing)
          const bounce = Math.sin(ballAngle * b.bounceFreq + b.bouncePhase) * b.bounceAmp * Math.min(1.4, speedScale);

          let x = chamberCx + tiltedX;
          let y = chamberCy + tiltedY + bounce;

          // Subtle wobble that keeps STT easily readable: ±8 degrees maximum
          const rot = Math.sin(ballAngle * 1.5) * 8;

          // If winner and in landing phase (p >= 0.85):
          // Winner smoothly glides into the selection chute (chuteX, chuteY)
          if (p >= 0.85 && isWinningBall) {
            const guideT = Math.min(1, (p - 0.85) / 0.15);
            // Cubic ease-out
            const ease = 1 - Math.pow(1 - guideT, 3);
            x = x * (1 - ease) + chuteX * ease;
            y = y * (1 - ease) + chuteY * ease;
          }

          return {
            ...b,
            x,
            y,
            rot,
          };
        });

        setRenderedBalls(nextBalls);

        if (p < 1) {
          animRef.current = requestAnimationFrame(updateLoop);
        }
      };

      animRef.current = requestAnimationFrame(updateLoop);
    } else if (hasCompleted) {
      setAnimProgress(1);
    } else {
      // Idle state: slow, ambient, relaxing drift inside chamber
      setAnimProgress(0);
      lastTimeRef.current = performance.now();

      const idleLoop = (now: number) => {
        const dt = Math.min((now - lastTimeRef.current) / 1000, 0.04);
        lastTimeRef.current = now;

        globalAngleRef.current += 0.35 * dt; // slow idle spin
        const currentAngle = globalAngleRef.current;

        const nextBalls = initialBalls.map((b) => {
          const ballAngle = currentAngle * b.speedFactor + b.phase;
          const rawX = b.radiusX * Math.cos(ballAngle);
          const rawY = b.radiusY * Math.sin(ballAngle);
          const cosTilt = Math.cos(b.tiltAngle);
          const sinTilt = Math.sin(b.tiltAngle);
          const tiltedX = rawX * cosTilt - rawY * sinTilt;
          const tiltedY = rawX * sinTilt + rawY * cosTilt;
          const bounce = Math.sin(ballAngle * b.bounceFreq + b.bouncePhase) * (b.bounceAmp * 0.4);

          return {
            ...b,
            x: chamberCx + tiltedX,
            y: chamberCy + tiltedY + bounce,
            rot: Math.sin(ballAngle * 1.2) * 5,
          };
        });

        setRenderedBalls(nextBalls);
        animRef.current = requestAnimationFrame(idleLoop);
      };

      animRef.current = requestAnimationFrame(idleLoop);
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isSpinning, hasCompleted, duration, activeWinners, initialBalls]);

  const isEndingOrCompleted = hasCompleted || animProgress >= 0.90;

  return (
    <div className="w-full max-w-4xl py-2 px-2 select-none flex flex-col items-center">
      {/* Main Lottery Arena Drum */}
      <div className="relative w-full rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-b from-slate-950 via-[#101426] to-[#0b0e1b] p-3 sm:p-5 shadow-2xl h-[440px] sm:h-[480px] flex flex-col justify-between">
        
        {/* Subtle Luxury Background Lighting / Glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-sky-500/10 blur-3xl" />

          {/* Golden studio radial spotlight */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/15 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Top Header Information */}
        <div className="relative z-20 flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-xs shadow-sm shadow-amber-500/30">
              🎱
            </div>
            <span className="text-xs font-black tracking-widest uppercase text-amber-400">
              LỒNG QUAY BI XỔ SỐ
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-300">
              {isSpinning ? (
                <span className="text-amber-300 font-bold animate-pulse flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  Các viên bi đang nhào lộn cuồng nhiệt trong lồng quay...
                </span>
              ) : hasCompleted ? (
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  {activeWinners.length > 1
                    ? `Đã rút ra ${activeWinners.length} viên bi trúng thưởng!`
                    : 'Đã rút ra viên bi trúng thưởng may mắn!'}
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

        {/* Center Arena: 3D Transparent Lottery Drum Chamber */}
        <div className="relative z-10 flex-1 w-full h-full flex items-center justify-center overflow-hidden">
          
          {/* Top Selection Chute Tube */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 sm:w-20 h-14 z-25 pointer-events-none flex flex-col items-center">
            {/* Glass Tube Funnel */}
            <div className="w-14 sm:w-16 h-10 border-2 border-amber-400/60 rounded-b-2xl bg-gradient-to-b from-slate-900/40 via-sky-500/10 to-amber-400/20 shadow-lg backdrop-blur-xs flex items-center justify-center">
              <span className="text-[9px] font-black uppercase text-amber-300 tracking-wider">
                ỐNG RÚT BI
              </span>
            </div>
            {/* Tube neck */}
            <div className="w-6 h-4 border-x-2 border-amber-400/40 bg-slate-900/60" />
          </div>

          {/* Spherical Transparent Glass Lottery Chamber */}
          <div className="relative w-[340px] sm:w-[420px] md:w-[460px] h-[270px] sm:h-[310px] md:h-[330px] rounded-[48%] border-4 border-amber-400/50 shadow-[0_0_50px_rgba(245,158,11,0.25)] bg-radial from-transparent via-slate-950/40 to-slate-900/80 backdrop-blur-xs flex items-center justify-center overflow-hidden">
            
            {/* Outer golden metallic drum rim ring */}
            <div className="absolute inset-1 rounded-[47%] border-2 border-amber-300/30 pointer-events-none" />
            <div className="absolute inset-3 rounded-[46%] border border-sky-400/20 pointer-events-none" />

            {/* Rotating drum cage ribs / spokes (Mechanical feel) */}
            <div
              style={{
                transform: `rotate(${drumRotation}deg)`,
                transition: isSpinning ? 'none' : 'transform 0.5s ease-out',
              }}
              className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30"
            >
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
              <div className="w-0.5 h-full bg-gradient-to-b from-transparent via-amber-300 to-transparent absolute" />
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent rotate-45 absolute" />
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent -rotate-45 absolute" />
            </div>

            {/* Center Drum Axle Hub with golden gear */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-2 border-amber-400 bg-slate-950/90 shadow-xl flex items-center justify-center z-12 pointer-events-none">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-600 to-amber-300 flex items-center justify-center shadow-inner">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-950" />
              </div>
            </div>

            {/* Glass Curvature Specular Highlights */}
            <div className="absolute top-2 left-6 right-6 h-10 rounded-[50%] bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
            <div className="absolute bottom-3 left-12 right-12 h-6 rounded-[50%] bg-gradient-to-t from-white/10 to-transparent pointer-events-none" />

            {/* LOTTERY BALLS INSIDE THE CHAMBER */}
            {renderedBalls.map((b) => {
              const isWinner = activeWinners.some((w) => w.id === b.id);
              const isEndingAndWinner = isEndingOrCompleted && isWinner;

              // If completed, winning balls will be displayed in the featured extraction area
              if (hasCompleted && isWinner) {
                return null;
              }

              return (
                <div
                  key={b.id}
                  style={{
                    left: `${b.x}%`,
                    top: `${b.y}%`,
                    transform: `translate(-50%, -50%) rotate(${b.rot}deg) ${
                      isEndingAndWinner ? 'scale(1.35)' : 'scale(1)'
                    }`,
                    zIndex: isEndingAndWinner ? 28 : 15,
                    transition: isEndingAndWinner ? 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
                  }}
                  className="absolute pointer-events-none cursor-default"
                >
                  {/* 3D Spherical Lottery Ball */}
                  <div
                    style={{
                      width: `${b.radius * 2}px`,
                      height: `${b.radius * 2}px`,
                      background: b.bgGradient,
                      boxShadow: `inset -3px -4px 6px rgba(0, 0, 0, 0.6), inset 3px 4px 6px rgba(255, 255, 255, 0.6), 0 4px 10px ${b.glowColor}`,
                      borderColor: b.borderColor,
                    }}
                    className={`relative rounded-full border flex items-center justify-center transition-transform ${
                      isEndingAndWinner ? 'ring-4 ring-amber-300 ring-offset-2 ring-offset-slate-950 animate-pulse' : ''
                    }`}
                  >
                    {/* Equatorial Characteristic Lottery Stripe */}
                    <div
                      style={{ backgroundColor: b.stripeColor }}
                      className="absolute inset-y-[38%] inset-x-0 pointer-events-none opacity-60"
                    />

                    {/* Specular 3D Glass Light Glint */}
                    <div className="absolute top-1 left-1.5 w-2 sm:w-2.5 h-1 sm:h-1.5 rounded-full bg-white/80 blur-[0.5px] pointer-events-none" />

                    {/* Center White Number Badge: always right-side-up and easily readable */}
                    <div
                      style={{
                        transform: `rotate(${-b.rot}deg)`,
                      }}
                      className="w-[58%] h-[58%] rounded-full bg-white shadow-inner flex items-center justify-center z-10 border border-slate-300/80"
                    >
                      <span
                        style={{ color: b.textColor }}
                        className="font-black text-[11px] sm:text-xs leading-none tracking-tighter"
                      >
                        {b.stt}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mechanical Drum Stand / Base */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 sm:w-64 h-6 border-t-2 border-amber-400/50 bg-gradient-to-b from-slate-800 to-slate-950 rounded-t-xl z-5 shadow-2xl flex items-center justify-center">
            <div className="w-16 h-1.5 bg-amber-400/70 rounded-full" />
          </div>

          {/* GRAND WINNER PRESENTATION AREA (Extracted Lottery Balls with Full Names) */}
          {hasCompleted && activeWinners.length > 0 && (
            <div className="absolute inset-0 z-35 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-3 animate-fade-in">
              <div className="text-center max-w-xl w-full px-4 py-4 rounded-3xl bg-slate-900/95 border-2 border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.35)] space-y-3 animate-scale-in">
                
                {/* Winner Header Banner */}
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl animate-bounce">🎱</span>
                  <div className="text-xs sm:text-sm font-black tracking-widest uppercase text-amber-400 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    {activeWinners.length === 1
                      ? 'KẾT QUẢ VIÊN BI MAY MẮN ĐƯỢC CHỌN!'
                      : `KẾT QUẢ ${activeWinners.length} VIÊN BI TRÚNG THƯỞNG!`}
                  </div>
                  <span className="text-2xl animate-bounce">🎱</span>
                </div>

                {/* Single Winner Display: Massive 3D Ball + Full Student Name */}
                {activeWinners.length === 1 ? (
                  <div className="flex flex-col items-center gap-2.5 py-1">
                    {/* Big 3D Extracted Ball */}
                    <div className="relative">
                      <div
                        style={{
                          background: 'radial-gradient(circle at 35% 30%, #fef08a 0%, #eab308 50%, #854d0e 100%)',
                          boxShadow: 'inset -6px -8px 14px rgba(0, 0, 0, 0.7), inset 6px 8px 14px rgba(255, 255, 255, 0.8), 0 10px 25px rgba(234, 179, 8, 0.6)',
                        }}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-amber-200 flex items-center justify-center ring-4 ring-amber-400/50"
                      >
                        {/* Specular Glint */}
                        <div className="absolute top-2 left-3 w-5 h-2.5 rounded-full bg-white/90 blur-[0.5px]" />
                        {/* Center STT Badge */}
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white shadow-xl flex items-center justify-center border-2 border-slate-300">
                          <span className="font-black text-xl sm:text-2xl text-slate-950">
                            #{getStudentSTT(activeWinners[0], allClassStudents || students)}
                          </span>
                        </div>
                      </div>
                      <div className="absolute -top-3 -right-2 text-2xl animate-pulse">
                        👑
                      </div>
                    </div>

                    {/* Full Name of Student */}
                    <div className="text-center">
                      <h2 className="text-2xl sm:text-4xl font-black text-amber-300 tracking-tight leading-tight mt-1">
                        {activeWinners[0].name}
                      </h2>
                      <div className="text-xs sm:text-sm font-bold text-slate-300 mt-1.5 flex items-center justify-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs">
                          STT #{getStudentSTT(activeWinners[0], allClassStudents || students)}
                        </span>
                        <span className="text-slate-300">
                          Lần thứ {Math.max(1, activeWinners[0].callCount ?? 1)} lên bảng
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Multiple Winners Display: Grid of Extracted Balls + Names */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto px-1 py-1">
                    {activeWinners.map((w, idx) => {
                      const stt = getStudentSTT(w, allClassStudents || students);
                      const theme = LOTTERY_BALL_THEMES[idx % LOTTERY_BALL_THEMES.length];
                      return (
                        <div
                          key={w.id}
                          className="px-3.5 py-2 rounded-2xl bg-slate-800/90 border border-amber-400/70 text-amber-300 font-black text-sm sm:text-base shadow-lg flex items-center gap-3 transition-transform hover:scale-[1.02]"
                        >
                          {/* Mini 3D Ball */}
                          <div
                            style={{
                              background: theme.bgGradient,
                              boxShadow: `inset -2px -3px 5px rgba(0,0,0,0.6), inset 2px 3px 5px rgba(255,255,255,0.7), 0 2px 6px ${theme.glowColor}`,
                              borderColor: theme.borderColor,
                            }}
                            className="w-10 h-10 rounded-full border flex items-center justify-center shrink-0"
                          >
                            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-xs">
                              <span style={{ color: theme.textColor }} className="font-black text-[11px] leading-none">
                                {stt}
                              </span>
                            </div>
                          </div>

                          {/* Student Details */}
                          <div className="flex-1 text-left min-w-0">
                            <div className="text-amber-200 font-black text-sm truncate">
                              {w.name}
                            </div>
                            <div className="text-[11px] font-medium text-slate-300">
                              STT #{stt} • {Math.max(1, w.callCount ?? 1)} lần lên bảng
                            </div>
                          </div>
                        </div>
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
          <span className="flex items-center gap-1">
            <span>🎱 Mỗi viên bi mang một STT học sinh trong lồng quay</span>
          </span>
          <span>Khi lồng quay dừng, viên bi may mắn sẽ được rút ra và hiển thị đầy đủ họ tên</span>
        </div>
      </div>
    </div>
  );
};
