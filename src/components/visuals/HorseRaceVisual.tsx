import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Trophy, Flag } from 'lucide-react';
import { Student } from '../../types';

interface HorseRaceProps {
  students: Student[];
  isSpinning: boolean;
  hasCompleted: boolean;
  winner: Student | null;
  selectedStudents?: Student[];
  duration?: number;
}

interface HorseRacer {
  id: string;
  student: Student;
  laneNumber: number;
  jockeySilk: string;
  saddleBorder: string;
  horseColor: string;
  surgeFreq: number;
  surgePhase: number;
}

// ClassGo palette: blue, indigo, emerald, amber, crimson
const HORSE_LANE_THEMES = [
  { jockeySilk: '#2563eb', saddleBorder: '#1d4ed8', horseColor: '#78350f' },
  { jockeySilk: '#4f46e5', saddleBorder: '#3730a3', horseColor: '#1e293b' },
  { jockeySilk: '#059669', saddleBorder: '#047857', horseColor: '#475569' },
  { jockeySilk: '#d97706', saddleBorder: '#b45309', horseColor: '#92400e' },
  { jockeySilk: '#dc2626', saddleBorder: '#991b1b', horseColor: '#78350f' },
];

export const HorseRaceVisual: React.FC<HorseRaceProps> = ({
  students,
  isSpinning,
  hasCompleted,
  winner,
  duration = 3800,
}) => {
  // Select 5 racers, strictly preserving deterministic winner
  const racers = useMemo<HorseRacer[]>(() => {
    const pool = students.slice(0, 5);
    if (winner && !pool.some((s) => s.id === winner.id)) {
      pool[pool.length > 0 ? pool.length - 1 : 0] = winner;
    }

    return pool.map((student, idx) => ({
      id: student.id,
      student,
      laneNumber: idx + 1,
      ...HORSE_LANE_THEMES[idx % HORSE_LANE_THEMES.length],
      surgeFreq: 1.6 + idx * 0.5,
      surgePhase: idx * 1.5,
    }));
  }, [students, winner]);

  const [animProgress, setAnimProgress] = useState(0);
  const [gallopFrame, setGallopFrame] = useState(0);
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
        setGallopFrame(Math.floor((elapsed / 90) % 4));

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
      {/* Race Track Arena (Slate / Navy + Indigo) */}
      <div className="relative w-full rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-b from-slate-950 via-[#0b1329] to-slate-950 p-3 sm:p-5 shadow-2xl">
        {/* Derby Top Banner */}
        <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2.5">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black tracking-widest uppercase text-indigo-400">
              TRƯỜNG ĐUA NGỰA DERBY
            </span>
          </div>
          <span className="text-xs font-medium text-slate-300">
            {isSpinning ? (
              <span className="text-sky-300 font-bold animate-pulse">
                🏇 Các chiến mã đang bứt tốc và liên tục đổi vị trí...
              </span>
            ) : hasCompleted ? (
              <span className="text-amber-300 font-bold flex items-center gap-1">
                <Flag className="w-3.5 h-3.5 text-amber-400" /> Chiến mã số 1 đã cán đích đầu tiên!
              </span>
            ) : (
              <span className="text-slate-400">Nhấn QUAY TÊN để mở cổng xuất phát</span>
            )}
          </span>
        </div>

        {/* 5 Compact Real Racetrack Lanes */}
        <div className="relative z-10 space-y-1.5 sm:space-y-2">
          {racers.map((racer, idx) => {
            const isWinner = winner?.id === racer.id;
            const isEndingPhase = animProgress >= 0.85;

            // X-position (percentage across screen, 5% to 88%)
            let xPos = 4; // Starting gate

            if (animProgress > 0) {
              const baseRun = animProgress * 70;

              // During race (0 to 0.85): Dynamic surging & lead changes
              const surge =
                Math.sin(animProgress * Math.PI * 4 * racer.surgeFreq + racer.surgePhase) * 12 +
                Math.cos(animProgress * Math.PI * 6 + idx) * 8;

              if (!isEndingPhase) {
                // Anyone can lead in the first 85% of time!
                xPos = Math.max(4, Math.min(74, baseRun + surge));
              } else {
                // Final 15%: Winner breaks away and crosses the wire at 88%!
                const endLerp = (animProgress - 0.85) / 0.15;
                if (isWinner) {
                  xPos = 72 + endLerp * 16; // Crosses finish wire first (88%)!
                } else {
                  // Other horses stay between 62% and 74%
                  xPos = 62 + Math.sin(idx * 2) * 8;
                }
              }
            } else if (hasCompleted) {
              xPos = isWinner ? 88 : 64 + Math.sin(idx * 2) * 8;
            }

            return (
              <div
                key={racer.id}
                className={`relative h-14 sm:h-15 rounded-xl border transition-all duration-300 overflow-hidden flex items-center px-2 ${
                  isWinner && isEndingPhase
                    ? 'border-amber-400 bg-gradient-to-r from-slate-900 via-indigo-950/80 to-amber-500/20 shadow-md ring-1 ring-amber-400/40'
                    : 'border-slate-800/80 bg-slate-900/60'
                }`}
              >
                {/* Turf ground lines */}
                <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(90deg,transparent_0%,rgba(16,185,129,0.3)_50%,transparent_100%)]" />

                {/* Left Stall Gate Number */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
                  <span
                    style={{ backgroundColor: racer.jockeySilk, borderColor: racer.saddleBorder }}
                    className="w-5 h-5 rounded text-white font-black text-[11px] flex items-center justify-center shadow border"
                  >
                    #{racer.laneNumber}
                  </span>
                </div>

                {/* Distance markers along lane */}
                <div className="absolute left-[30%] top-0 bottom-0 border-l border-slate-800/40" />
                <div className="absolute left-[60%] top-0 bottom-0 border-l border-slate-800/40" />

                {/* Checkered Finish Gate Line at 86% */}
                <div className="absolute right-6 sm:right-8 top-0 bottom-0 w-3 flex flex-col justify-between py-1 z-0 opacity-80 pointer-events-none">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-full ${i % 2 === 0 ? 'bg-white' : 'bg-slate-900'}`}
                    />
                  ))}
                </div>

                {/* Large Horse + Jockey + Attached Running Name Tag */}
                <div
                  style={{
                    left: `${xPos}%`,
                    transform: 'translate(-50%, -50%)',
                    transition: isEndingPhase ? 'left 0.25s ease-out' : 'none',
                  }}
                  className={`absolute top-1/2 z-20 flex items-center gap-1.5 pointer-events-none ${
                    isWinner && isEndingPhase ? 'scale-105' : 'scale-100'
                  }`}
                >
                  {/* Dust puffs kicked up behind horse */}
                  {(animProgress > 0 || hasCompleted) && (
                    <div className="flex items-center gap-0.5 opacity-60 -mr-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-ping" />
                      <div className="w-1 h-1 rounded-full bg-slate-300 animate-pulse" />
                    </div>
                  )}

                  {/* Large Horse SVG (approx 68px wide, 52px high) */}
                  <div className="relative w-16 h-12 sm:w-18 sm:h-14 drop-shadow-lg">
                    <svg viewBox="0 0 100 80" className="w-full h-full">
                      {/* Horse Body */}
                      <path
                        d="M18 42 Q32 38, 52 40 Q70 40, 80 32 Q84 28, 78 22 Q74 28, 66 30 Q60 34, 46 36 Q32 37, 18 42 Z"
                        fill={racer.horseColor}
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      />
                      {/* Horse Neck & Head */}
                      <path
                        d="M56 36 L74 20 L84 24 L80 30 L68 36 Z"
                        fill={racer.horseColor}
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      />
                      {/* Flowing Mane */}
                      <path d="M58 32 Q66 22, 72 20" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                      {/* Jockey Cap */}
                      <circle cx="50" cy="24" r="5" fill="#fde047" stroke="#0f172a" strokeWidth="1" />
                      {/* Jockey Silk Jacket */}
                      <path
                        d="M44 28 L56 28 L58 36 L44 36 Z"
                        fill={racer.jockeySilk}
                        stroke={racer.saddleBorder}
                        strokeWidth="1.5"
                      />
                      {/* Front Galloping Legs with frames */}
                      <line
                        x1="64"
                        y1="38"
                        x2={gallopFrame % 2 === 0 ? '78' : '70'}
                        y2="64"
                        stroke={racer.horseColor}
                        strokeWidth="3.2"
                        strokeLinecap="round"
                      />
                      {/* Back Galloping Legs with frames */}
                      <line
                        x1="24"
                        y1="42"
                        x2={gallopFrame % 2 === 0 ? '10' : '18'}
                        y2="64"
                        stroke={racer.horseColor}
                        strokeWidth="3.2"
                        strokeLinecap="round"
                      />
                    </svg>

                    {/* Winner Crown directly on top of horse */}
                    {isWinner && hasCompleted && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce">
                        <span className="text-xl">👑</span>
                      </div>
                    )}
                  </div>

                  {/* Student Name Tag RUNS RIGHT NEXT TO / BEHIND THE HORSE */}
                  <div
                    className={`px-2 py-0.5 rounded-lg text-center border max-w-[80px] sm:max-w-[100px] transition-all shadow-md whitespace-nowrap ${
                      isWinner && isEndingPhase
                        ? 'bg-amber-400 text-slate-950 font-black border-yellow-200 shadow-amber-400/50 scale-105 ring-1 ring-amber-300'
                        : 'bg-slate-900/90 text-slate-200 border-slate-700 font-bold'
                    }`}
                  >
                    <span className="text-[10px] sm:text-xs truncate block">
                      {isWinner && isEndingPhase ? `★ ${racer.student.name}` : racer.student.name}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Grand Victory Announcement inside track when completed */}
          {hasCompleted && winner && (
            <div className="mt-2 text-center p-3 sm:p-4 rounded-2xl bg-slate-900/95 border-2 border-amber-400 shadow-xl shadow-amber-500/20 max-w-md mx-auto animate-scale-in">
              <div className="text-[10px] font-black tracking-widest uppercase text-amber-400">
                CHIẾN MÃ CÁN ĐÍCH ĐẦU TIÊN!
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-amber-300 tracking-tight leading-tight mt-0.5 truncate">
                👑 {winner.name}
              </h2>
              <div className="text-[11px] font-bold text-slate-300 mt-0.5">
                Làn #{racers.find((r) => r.id === winner.id)?.laneNumber || 1} · Lần thứ {winner.callCount} lên bảng
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 pt-2.5 mt-2 border-t border-slate-800/80">
          <span>🚩 Xuất phát từ cổng trái → Cán đích cờ ca-rô bên phải</span>
          <span>Chiến mã bứt tốc cán đích đầu tiên sẽ chiến thắng!</span>
        </div>
      </div>
    </div>
  );
};
