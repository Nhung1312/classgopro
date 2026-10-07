import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Student, NameDisplayStyle } from '../../types';
import { formatStudentDisplayName } from '../../utils/studentDisplay';

interface WheelVisualProps {
  students: Student[];
  isSpinning: boolean;
  hasCompleted: boolean;
  winner: Student | null;
  currentAngle: number;
  highlightName?: string;
  size?: number;
  nameStyle?: NameDisplayStyle;
  allClassStudents?: Student[];
}

// Sophisticated ClassGo palette: slate/navy, soft indigo, blue, emerald, amber, soft red (no neon purple or harsh orange)
const SLICE_COLORS = [
  '#3b82f6', // Blue
  '#4f46e5', // Indigo
  '#0ea5e9', // Sky
  '#10b981', // Emerald
  '#f59e0b', // Soft Amber
  '#ef4444', // Soft Red
  '#0d9488', // Teal
  '#6366f1', // Indigo
  '#64748b', // Slate
  '#8b5cf6', // Muted Violet
  '#0284c7', // Deep Sky
  '#059669', // Forest Emerald
];

interface FlyingLetter {
  char: string;
  index: number;
  scatterX: number;
  scatterY: number;
  scatterRotate: number;
  scatterScale: number;
}

export const WheelVisual: React.FC<WheelVisualProps> = ({
  students,
  isSpinning,
  hasCompleted,
  winner,
  currentAngle,
  highlightName,
  size = 460,
  nameStyle = 'FULL_NAME',
  allClassStudents,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Winner's display name for letter assembly
  const winnerDisplayName = useMemo(() => {
    if (!winner) return '';
    return formatStudentDisplayName(
      winner,
      allClassStudents || students,
      nameStyle as NameDisplayStyle,
      false
    );
  }, [winner, allClassStudents, students, nameStyle]);

  // Generate letter state for flying effect
  const [letters, setLetters] = useState<FlyingLetter[]>([]);

  // Update letters when winner or spinning state changes
  useEffect(() => {
    if (!winnerDisplayName) {
      setLetters([]);
      return;
    }

    const chars = winnerDisplayName.split('');
    const newLetters: FlyingLetter[] = chars.map((char, index) => ({
      char,
      index,
      scatterX: (Math.random() - 0.5) * 220,
      scatterY: (Math.random() - 0.5) * 60 - 20,
      scatterRotate: (Math.random() - 0.5) * 50,
      scatterScale: 0.85 + Math.random() * 0.35,
    }));
    setLetters(newLetters);
  }, [winnerDisplayName]);

  // While spinning, periodically animate the flying scattered letters
  useEffect(() => {
    if (!isSpinning || letters.length === 0) return;

    const interval = setInterval(() => {
      setLetters((prev) =>
        prev.map((l) => ({
          ...l,
          scatterX: (Math.random() - 0.5) * 240,
          scatterY: (Math.random() - 0.5) * 70 - 15,
          scatterRotate: (Math.random() - 0.5) * 60,
          scatterScale: 0.8 + Math.random() * 0.4,
        }))
      );
    }, 160);

    return () => clearInterval(interval);
  }, [isSpinning, letters.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const scaleFactor = Math.max(0.75, size / 380);
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - Math.round(20 * scaleFactor); // Margin for border and pointer

    ctx.clearRect(0, 0, size, size);

    if (students.length === 0) {
      // Empty wheel placeholder
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.lineWidth = 4 * scaleFactor;
      ctx.strokeStyle = '#334155';
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = `bold ${Math.round(15 * scaleFactor)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Chưa có học sinh', centerX, centerY);
      return;
    }

    const totalStudents = students.length;
    // Cap visual slices if too many students to keep text legible
    const maxVisualSlices = Math.min(totalStudents, 36);
    const sliceAngle = (2 * Math.PI) / maxVisualSlices;

    ctx.save();
    ctx.translate(centerX, centerY);
    // currentAngle in radians (0 is at 3 o'clock; offset -PI/2 for top 12 o'clock pointer)
    ctx.rotate((currentAngle * Math.PI) / 180 - Math.PI / 2);

    // Draw slices
    for (let i = 0; i < maxVisualSlices; i++) {
      const startA = i * sliceAngle;
      const endA = (i + 1) * sliceAngle;
      const student = students[i % totalStudents];
      const isWinnerSlice = hasCompleted && winner && student.id === winner.id;

      // Slice background
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startA, endA);
      ctx.closePath();

      if (isWinnerSlice) {
        ctx.fillStyle = '#fbbf24'; // Warm gold for winner
      } else {
        ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length];
      }
      ctx.fill();

      // Slice border line
      ctx.lineWidth = isWinnerSlice ? 3.5 * scaleFactor : 1.5 * scaleFactor;
      ctx.strokeStyle = isWinnerSlice ? '#ffffff' : 'rgba(15, 23, 42, 0.45)';
      ctx.stroke();

      // Student name text along slice
      ctx.save();
      ctx.rotate(startA + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      let fontSize: number;
      if (nameStyle === 'ONLY_STT') {
        fontSize = isWinnerSlice
          ? Math.round(18 * scaleFactor)
          : Math.round(15 * scaleFactor);
      } else {
        fontSize = isWinnerSlice
          ? Math.max(12 * scaleFactor, Math.min(18 * scaleFactor, (260 * scaleFactor) / maxVisualSlices))
          : Math.max(10 * scaleFactor, Math.min(15 * scaleFactor, (230 * scaleFactor) / maxVisualSlices));
      }

      if (isWinnerSlice) {
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${Math.round(fontSize)}px system-ui, sans-serif`;
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(fontSize)}px system-ui, sans-serif`;
      }

      // Truncate name based on style and available radius space
      const displayName = formatStudentDisplayName(
        student,
        allClassStudents || students,
        nameStyle as NameDisplayStyle,
        true
      );

      ctx.fillText(displayName, radius - Math.round(16 * scaleFactor), 0);

      // Draw peg pin at edge
      ctx.beginPath();
      ctx.arc(radius - Math.round(5 * scaleFactor), 0, Math.round(3.5 * scaleFactor), 0, 2 * Math.PI);
      ctx.fillStyle = isWinnerSlice ? '#ffffff' : '#cbd5e1';
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();

    // Outer wheel ring (metallic frame with ClassGo navy/indigo theme)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = Math.round(9 * scaleFactor);
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(0.5, '#4f46e5');
    grad.addColorStop(1, '#0284c7');
    ctx.strokeStyle = isSpinning ? grad : hasCompleted ? '#10b981' : '#334155';
    ctx.stroke();

    // Decorative outer studs
    const studCount = 18;
    for (let i = 0; i < studCount; i++) {
      const angle = (i * 2 * Math.PI) / studCount;
      const sx = centerX + (radius + 5 * scaleFactor) * Math.cos(angle);
      const sy = centerY + (radius + 5 * scaleFactor) * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(2, 3 * scaleFactor), 0, 2 * Math.PI);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
    }

    // Center Hub (cap)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.2, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = Math.round(4 * scaleFactor);
    ctx.strokeStyle = hasCompleted ? '#fbbf24' : '#4f46e5';
    ctx.stroke();

    // Center Icon / Sparkle
    ctx.fillStyle = '#f8fafc';
    ctx.font = `bold ${Math.round(radius * 0.1)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⭐', centerX, centerY);

    // Top Pointer Needle (fixed at 12 o'clock pointing down)
    const pointerW = Math.round(15 * scaleFactor);
    const pointerH = Math.round(30 * scaleFactor);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX - pointerW, 4);
    ctx.lineTo(centerX + pointerW, 4);
    ctx.lineTo(centerX, pointerH);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.lineWidth = Math.max(2, 2.5 * scaleFactor);
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Pointer pivot bulb
    ctx.beginPath();
    ctx.arc(centerX, 6, Math.round(5 * scaleFactor), 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }, [students, isSpinning, hasCompleted, winner, currentAngle, highlightName, size, nameStyle, allClassStudents]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-2">
      {/* Flying & Converging Letters Banner above the wheel */}
      {(isSpinning || hasCompleted) && winnerDisplayName && (
        <div className="mb-2 h-11 flex items-center justify-center relative z-20 overflow-visible px-4">
          <div className="relative flex items-center justify-center min-w-[200px]">
            {letters.map((item) => {
              const isSpace = item.char === ' ';
              // When spinning: scattered; when completed: perfectly converged (0, 0, 0)
              const posX = hasCompleted ? 0 : item.scatterX;
              const posY = hasCompleted ? 0 : item.scatterY;
              const rot = hasCompleted ? 0 : item.scatterRotate;
              const scale = hasCompleted ? 1 : item.scatterScale;

              return (
                <span
                  key={item.index}
                  style={{
                    transform: `translate(${posX}px, ${posY}px) rotate(${rot}deg) scale(${scale})`,
                    transition: hasCompleted
                      ? 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.3s, color 0.3s'
                      : 'transform 0.16s ease-out',
                  }}
                  className={`inline-flex items-center justify-center font-black ${
                    isSpace
                      ? 'w-2.5 sm:w-3'
                      : hasCompleted
                      ? 'px-1 sm:px-1.5 py-0.5 mx-0.5 rounded-lg bg-amber-400 text-slate-950 text-base sm:text-xl shadow-md border border-amber-200'
                      : 'px-1 sm:px-1.5 py-0.5 mx-0.5 rounded-lg bg-indigo-900/90 text-indigo-100 text-sm sm:text-base border border-indigo-400/50 shadow-md backdrop-blur-sm'
                  }`}
                >
                  {isSpace ? '\u00A0' : item.char}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Outer ambient glow in subtle navy/indigo or amber */}
      <div
        style={{ width: Math.round(size * 0.75), height: Math.round(size * 0.75) }}
        className={`absolute rounded-full blur-3xl transition-opacity duration-500 pointer-events-none ${
          isSpinning
            ? 'bg-indigo-500/25 opacity-100 scale-110'
            : hasCompleted
            ? 'bg-amber-400/25 opacity-100 scale-120'
            : 'bg-slate-800/10 opacity-30'
        }`}
      />

      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, maxWidth: '100%', maxHeight: '72vh' }}
        className={`max-w-full drop-shadow-2xl transition-transform ${
          isSpinning ? 'scale-101' : hasCompleted ? 'scale-105' : 'hover:scale-101'
        }`}
      />
    </div>
  );
};
