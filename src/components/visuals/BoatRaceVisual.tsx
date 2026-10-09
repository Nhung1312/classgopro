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
  onSelectStudentProfile?: (student: Student) => void;
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
  radiusX: number; // in percentage of chamber (22% to 42%)
  radiusY: number; // in percentage of chamber (16% to 32%)
  phase: number;   // initial angle phase in radians
  speedFactor: number; // subtle variation (0.92 to 1.18)
  tiltAngle: number;   // tilt angle in radians
  bounceFreq: number;  // bounce oscillations per revolution (2.5 to 4.2)
  bounceAmp: number;   // bounce amplitude in % (2.4% to 4.2%)
  bouncePhase: number;

  // Initial rendered position
  initialX: number;
  initialY: number;
  radius: number; // in px
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
  onSelectStudentProfile,
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

  // 2. Initialize lottery balls with deterministic orbit & bounce properties (Expanded Radii & Tiers)
  const initialBalls = useMemo<LotteryBall[]>(() => {
    if (!students || students.length === 0) return [];
    const count = students.length;
    // Ball radius scales gracefully with student count
    const radius = count > 35 ? 17 : count > 20 ? 19 : 23;

    // Number of orbital tracks/rings:
    const numRings = count <= 8 ? 2 : count <= 18 ? 3 : 4;

    return students.map((st, idx) => {
      const theme = LOTTERY_BALL_THEMES[idx % LOTTERY_BALL_THEMES.length];
      const stt = getStudentSTT(st, allClassStudents || students);

      const ringIdx = idx % numRings;
      let radiusX = 28;
      let radiusY = 22;
      let tiltAngle = 0;
      let orbitType: 'circle' | 'ellipse_horizontal' | 'ellipse_tilted' = 'circle';

      if (numRings === 2) {
        if (ringIdx === 0) {
          radiusX = 26;
          radiusY = 20;
          orbitType = 'circle';
        } else {
          radiusX = 38;
          radiusY = 28;
          tiltAngle = ((idx % 3) - 1) * 0.14;
          orbitType = 'ellipse_tilted';
        }
      } else if (numRings === 3) {
        if (ringIdx === 0) {
          radiusX = 24;
          radiusY = 18;
          orbitType = 'circle';
        } else if (ringIdx === 1) {
          radiusX = 32;
          radiusY = 24;
          tiltAngle = ((idx % 4) - 1.5) * 0.12;
          orbitType = 'ellipse_tilted';
        } else {
          radiusX = 40;
          radiusY = 30;
          tiltAngle = (((idx % 5) - 2) * -0.10);
          orbitType = 'ellipse_horizontal';
        }
      } else {
        // 4 Rings for 20 - 45 students
        if (ringIdx === 0) {
          radiusX = 22 + (idx % 2) * 2; // 22% - 24%
          radiusY = 16 + (idx % 2) * 2; // 16% - 18%
          orbitType = 'circle';
        } else if (ringIdx === 1) {
          radiusX = 28 + (idx % 3) * 1.8; // 28% - 31.6%
          radiusY = 21 + (idx % 3) * 1.5; // 21% - 24%
          tiltAngle = ((idx % 3) - 1) * 0.14;
          orbitType = 'ellipse_tilted';
        } else if (ringIdx === 2) {
          radiusX = 34 + (idx % 3) * 1.8; // 34% - 37.6%
          radiusY = 25 + (idx % 3) * 1.5; // 25% - 28%
          tiltAngle = (((idx % 5) - 2) * -0.12);
          orbitType = 'ellipse_tilted';
        } else {
          radiusX = 39 + (idx % 3) * 1.5; // 39% - 42%
          radiusY = 29 + (idx % 3) * 1.5; // 29% - 32%
          orbitType = 'ellipse_horizontal';
        }
      }

      // Phase distributed evenly around 2*PI with offset so no two overlap
      const phase = (idx / count) * Math.PI * 2 + ((idx * 1.618) % 1) * 0.45;
      // Varied speed factor: 0.92 to 1.18
      const speedFactor = 0.92 + ((idx * 3) % 7) * 0.04;
      // Bounce oscillations per revolution: 2.5 to 4.2
      const bounceFreq = 2.5 + (idx % 4) * 0.55;
      // Significant vertical bounce: 2.4% to 4.2%
      const bounceAmp = 2.4 + (idx % 3) * 0.8;
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
        initialX: 50 + tiltedX,
        initialY: 50 + tiltedY,
        radius,
      };
    });
  }, [students, allClassStudents]);

  // Direct DOM references for 60fps hardware-accelerated transforms (0 React re-renders)
  const ballRefs = useRef<(HTMLDivElement | null)[]>([]);
  const drumRef = useRef<HTMLDivElement | null>(null);

  // Animation timing & angle accumulators
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const globalAngleRef = useRef<number>(0);
  const drumAngleRef = useRef<number>(0);

  useEffect(() => {
    const winnerIdSet = new Set(activeWinners.map((w) => w.id));
    const chamberCx = 50;
    const chamberCy = 50;

    if (isSpinning) {
      startTimeRef.current = performance.now();
      lastTimeRef.current = performance.now();

      const updateLoop = (now: number) => {
        const dt = Math.min((now - lastTimeRef.current) / 1000, 0.04);
        lastTimeRef.current = now;

        const elapsed = now - startTimeRef.current;
        const p = Math.min(1, elapsed / duration);

        // High-Energy Angular Speed Profile (in rad/s):
        // 1. Khởi động (p < 0.20): tăng tốc bứt phá mạnh mẽ (~17.5 rad/s, ~2.8 vòng/s)
        // 2. Toàn bộ thân animation (0.20 <= p < 0.80): duy trì tốc độ cao ổn định (~15.0 rad/s, ~2.4 vòng/s)
        // 3. Cuối animation (0.80 <= p < 0.96): hãm tốc mượt mà bằng cubic easing về ~1.5 rad/s
        // 4. Kết thúc (p >= 0.96): dừng êm dịu, winner định vị tại ống chọn
        let currentOmega = 15.0;
        if (p < 0.20) {
          currentOmega = 15.0 + (1 - p / 0.20) * 2.5; // 17.5 -> 15.0
        } else if (p < 0.80) {
          currentOmega = 15.0;
        } else if (p < 0.96) {
          const decelT = (p - 0.80) / 0.16; // 0 -> 1
          const ease = 1 - Math.pow(1 - decelT, 3);
          currentOmega = 15.0 * (1 - ease) + 1.5 * ease;
        } else {
          const stopT = (p - 0.96) / 0.04;
          currentOmega = Math.max(0, 1.5 * (1 - stopT));
        }

        globalAngleRef.current += currentOmega * dt;
        drumAngleRef.current = (drumAngleRef.current + currentOmega * 1.8) % 360;

        // Mechanical drum spokes rotation
        if (drumRef.current) {
          drumRef.current.style.transform = `rotate(${drumAngleRef.current.toFixed(1)}deg)`;
        }

        const currentAngle = globalAngleRef.current;
        const speedNorm = Math.min(1.5, currentOmega / 10.0);

        // Update all ball positions directly in DOM (60fps GPU acceleration, no React re-render lag)
        initialBalls.forEach((b, idx) => {
          const el = ballRefs.current[idx];
          if (!el) return;

          const isWinningBall = winnerIdSet.has(b.id);
          const ballAngle = currentAngle * b.speedFactor + b.phase;

          // Ellipse coordinates with expanded radii (22% to 42%)
          const rawX = b.radiusX * Math.cos(ballAngle);
          const rawY = b.radiusY * Math.sin(ballAngle);

          // Tilted angle transform
          const cosTilt = Math.cos(b.tiltAngle);
          const sinTilt = Math.sin(b.tiltAngle);
          const tiltedX = rawX * cosTilt - rawY * sinTilt;
          const tiltedY = rawX * sinTilt + rawY * cosTilt;

          // Dynamic vertical bounce
          const bounce = Math.sin(ballAngle * b.bounceFreq + b.bouncePhase) * b.bounceAmp * speedNorm;

          let x = chamberCx + tiltedX;
          let y = chamberCy + tiltedY + bounce;
          let rot = Math.sin(ballAngle * 1.5) * 12;
          let scale = 1.0;

          // Smooth Winner Glide to Selection Chute (NO teleportation, clean continuous transition)
          if (isWinningBall && p >= 0.78) {
            const guideT = Math.min(1, (p - 0.78) / 0.22);
            const ease = 1 - Math.pow(1 - guideT, 3);

            const winnerIdx = activeWinners.findIndex((w) => w.id === b.id);
            const targetChuteX = activeWinners.length > 1
              ? 50 + (winnerIdx - (activeWinners.length - 1) / 2) * 12
              : 50;
            const targetChuteY = 16;

            x = x * (1 - ease) + targetChuteX * ease;
            y = y * (1 - ease) + targetChuteY * ease;
            scale = 1.0 + ease * 0.42;
          }

          el.style.left = `${x.toFixed(2)}%`;
          el.style.top = `${y.toFixed(2)}%`;
          el.style.transform = `translate(-50%, -50%) rotate(${rot.toFixed(1)}deg) scale(${scale.toFixed(2)})`;
          el.style.zIndex = isWinningBall && p >= 0.78 ? '35' : '15';
        });

        if (p < 1) {
          animRef.current = requestAnimationFrame(updateLoop);
        }
      };

      animRef.current = requestAnimationFrame(updateLoop);
    } else if (!hasCompleted) {
      // Idle state: gentle living drift inside chamber
      lastTimeRef.current = performance.now();

      const idleLoop = (now: number) => {
        const dt = Math.min((now - lastTimeRef.current) / 1000, 0.04);
        lastTimeRef.current = now;

        globalAngleRef.current += 1.2 * dt;
        drumAngleRef.current = (drumAngleRef.current + 1.2 * 1.5) % 360;

        if (drumRef.current) {
          drumRef.current.style.transform = `rotate(${drumAngleRef.current.toFixed(1)}deg)`;
        }

        const currentAngle = globalAngleRef.current;

        initialBalls.forEach((b, idx) => {
          const el = ballRefs.current[idx];
          if (!el) return;

          const ballAngle = currentAngle * b.speedFactor + b.phase;
          const rawX = b.radiusX * Math.cos(ballAngle);
          const rawY = b.radiusY * Math.sin(ballAngle);
          const cosTilt = Math.cos(b.tiltAngle);
          const sinTilt = Math.sin(b.tiltAngle);
          const tiltedX = rawX * cosTilt - rawY * sinTilt;
          const tiltedY = rawX * sinTilt + rawY * cosTilt;
          const bounce = Math.sin(ballAngle * b.bounceFreq + b.bouncePhase) * (b.bounceAmp * 0.35);

          const x = chamberCx + tiltedX;
          const y = chamberCy + tiltedY + bounce;
          const rot = Math.sin(ballAngle * 1.2) * 6;

          el.style.left = `${x.toFixed(2)}%`;
          el.style.top = `${y.toFixed(2)}%`;
          el.style.transform = `translate(-50%, -50%) rotate(${rot.toFixed(1)}deg) scale(1)`;
          el.style.zIndex = '15';
        });

        animRef.current = requestAnimationFrame(idleLoop);
      };

      animRef.current = requestAnimationFrame(idleLoop);
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isSpinning, hasCompleted, duration, activeWinners, initialBalls]);

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
              ref={drumRef}
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
            {initialBalls.map((b, idx) => {
              const isWinner = activeWinners.some((w) => w.id === b.id);

              // If completed, winning balls will be displayed in the featured extraction area
              if (hasCompleted && isWinner) {
                return null;
              }

              return (
                <div
                  key={b.id}
                  ref={(el) => {
                    ballRefs.current[idx] = el;
                  }}
                  style={{
                    left: `${b.initialX}%`,
                    top: `${b.initialY}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 15,
                  }}
                  onClick={() => onSelectStudentProfile?.(b.student)}
                  className={`absolute transition-shadow ${
                    onSelectStudentProfile ? 'cursor-pointer hover:scale-125 hover:z-40' : 'cursor-default pointer-events-none'
                  }`}
                  title={onSelectStudentProfile ? `Bấm để xem Thẻ học sinh: ${b.student.name} (STT #${b.stt})` : undefined}
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
                    className="relative rounded-full border flex items-center justify-center transition-transform"
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
                    <div
                      onClick={() => onSelectStudentProfile?.(activeWinners[0])}
                      className={`relative ${onSelectStudentProfile ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
                      title={onSelectStudentProfile ? `Bấm để xem Thẻ học sinh: ${activeWinners[0].name}` : undefined}
                    >
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
                      <h2
                        onClick={() => onSelectStudentProfile?.(activeWinners[0])}
                        className={`text-2xl sm:text-4xl font-black text-amber-300 tracking-tight leading-tight mt-1 ${
                          onSelectStudentProfile ? 'cursor-pointer hover:underline hover:text-white transition-colors' : ''
                        }`}
                        title={onSelectStudentProfile ? `Bấm để xem Thẻ học sinh: ${activeWinners[0].name}` : undefined}
                      >
                        {activeWinners[0].name}
                      </h2>
                      <div className="text-xs sm:text-sm font-bold text-slate-300 mt-1.5 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectStudentProfile?.(activeWinners[0])}
                          className={`px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs ${
                            onSelectStudentProfile ? 'hover:bg-amber-400/30 cursor-pointer transition-colors' : ''
                          }`}
                          title={onSelectStudentProfile ? 'Bấm để xem Thẻ học sinh' : undefined}
                        >
                          STT #{getStudentSTT(activeWinners[0], allClassStudents || students)}
                        </button>
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
                            <div className="text-amber-200 hover:text-white hover:underline font-black text-sm truncate">
                              {w.name}
                            </div>
                            <div className="text-[11px] font-medium text-slate-300">
                              STT #{stt} • {Math.max(1, w.callCount ?? 1)} lần lên bảng
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
          <span className="flex items-center gap-1">
            <span>🎱 Mỗi viên bi mang một STT học sinh trong lồng quay</span>
          </span>
          <span>Khi lồng quay dừng, viên bi may mắn sẽ được rút ra và hiển thị đầy đủ họ tên</span>
        </div>
      </div>
    </div>
  );
};
