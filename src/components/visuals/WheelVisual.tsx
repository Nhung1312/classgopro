import React, { useEffect, useRef } from 'react';
import { Student } from '../../types';

interface WheelVisualProps {
  students: Student[];
  isSpinning: boolean;
  hasCompleted: boolean;
  winner: Student | null;
  currentAngle: number;
  highlightName?: string;
  size?: number;
}

// Crisp vibrant color palette for wheel slices
const SLICE_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#84cc16', // Lime
  '#d946ef', // Fuchsia
];

export const WheelVisual: React.FC<WheelVisualProps> = ({
  students,
  isSpinning,
  hasCompleted,
  winner,
  currentAngle,
  highlightName,
  size = 380,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 18; // Margin for border and pointer

    ctx.clearRect(0, 0, size, size);

    if (students.length === 0) {
      // Empty wheel placeholder
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#475569';
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Chưa có học sinh', centerX, centerY);
      return;
    }

    const totalStudents = students.length;
    // Cap visual slices if too many students to keep text legible, but map accurately
    const maxVisualSlices = Math.min(totalStudents, 36);
    const sliceAngle = (2 * Math.PI) / maxVisualSlices;

    ctx.save();
    ctx.translate(centerX, centerY);
    // currentAngle in radians (0 is at 3 o'clock; we want pointer at top 12 o'clock so offset -PI/2)
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
        ctx.fillStyle = '#fbbf24'; // Bright gold for winner
      } else {
        ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length];
      }
      ctx.fill();

      // Slice border line
      ctx.lineWidth = isWinnerSlice ? 3 : 1.5;
      ctx.strokeStyle = isWinnerSlice ? '#ffffff' : 'rgba(15, 23, 42, 0.4)';
      ctx.stroke();

      // Student name text along slice
      ctx.save();
      ctx.rotate(startA + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      if (isWinnerSlice) {
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${Math.max(11, Math.min(15, 220 / maxVisualSlices))}px system-ui, sans-serif`;
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(10, Math.min(13, 200 / maxVisualSlices))}px system-ui, sans-serif`;
      }

      // Truncate name if long
      let displayName = student.name;
      if (displayName.length > 16) {
        const parts = displayName.split(' ');
        displayName = parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : displayName.slice(0, 14) + '..';
      }

      ctx.fillText(displayName, radius - 16, 0);

      // Draw peg pin at edge
      ctx.beginPath();
      ctx.arc(radius - 5, 0, 3, 0, 2 * Math.PI);
      ctx.fillStyle = isWinnerSlice ? '#ffffff' : '#cbd5e1';
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();

    // Outer wheel ring (metallic frame)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 8;
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(0.5, '#6366f1');
    grad.addColorStop(1, '#3b82f6');
    ctx.strokeStyle = isSpinning ? grad : hasCompleted ? '#10b981' : '#475569';
    ctx.stroke();

    // Decorative outer studs
    const studCount = 16;
    for (let i = 0; i < studCount; i++) {
      const angle = (i * 2 * Math.PI) / studCount;
      const sx = centerX + (radius + 4) * Math.cos(angle);
      const sy = centerY + (radius + 4) * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
    }

    // Center Hub (cap)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.2, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = hasCompleted ? '#fbbf24' : '#6366f1';
    ctx.stroke();

    // Center Icon / Sparkle
    ctx.fillStyle = '#f8fafc';
    ctx.font = `bold ${Math.round(radius * 0.1)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⭐', centerX, centerY);

    // Top Pointer Needle (fixed at 12 o'clock pointing down)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX - 14, 4);
    ctx.lineTo(centerX + 14, 4);
    ctx.lineTo(centerX, 28);
    ctx.closePath();
    ctx.fillStyle = '#f43f5e';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Pointer pivot bulb
    ctx.beginPath();
    ctx.arc(centerX, 6, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }, [students, isSpinning, hasCompleted, winner, currentAngle, highlightName, size]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-2">
      {/* Outer ambient glow */}
      <div
        className={`absolute w-72 h-72 rounded-full blur-3xl transition-opacity duration-500 pointer-events-none ${
          isSpinning
            ? 'bg-indigo-500/30 opacity-100 scale-110'
            : hasCompleted
            ? 'bg-amber-400/30 opacity-100 scale-120'
            : 'bg-slate-700/10 opacity-30'
        }`}
      />

      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className={`max-w-full drop-shadow-2xl transition-transform ${
          isSpinning ? 'scale-101' : hasCompleted ? 'scale-105' : 'hover:scale-101'
        }`}
      />
    </div>
  );
};
