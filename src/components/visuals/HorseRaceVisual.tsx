import React, { useEffect, useMemo, useState } from 'react';
import { Student } from '../../types';

interface Props {
  students: Student[];
  isSpinning: boolean;
  hasCompleted: boolean;
  winner: Student | null;
}
const clamp = (n:number) => Math.max(6, Math.min(94, n));

export const HorseRaceVisual: React.FC<Props> = ({ students, isSpinning, hasCompleted, winner }) => {
  const racers = useMemo(() => {
    const pool = students.slice(0, 8);
    if (winner && !pool.some(s => s.id === winner.id)) return [...pool.slice(0,7), winner];
    return pool;
  }, [students, winner]);
  const [progress, setProgress] = useState<Record<string,number>>({});
  useEffect(() => {
    if (!isSpinning) return;
    setProgress(Object.fromEntries(racers.map(s => [s.id, 8])));
    const id = window.setInterval(() => setProgress(prev => Object.fromEntries(racers.map((s,i) => {
      const current = prev[s.id] ?? 8;
      return [s.id, clamp(current + 2 + Math.random()*7 - i*0.08)];
    }))), 180);
    return () => window.clearInterval(id);
  }, [isSpinning, racers]);
  return <div className="w-full max-w-4xl px-2 py-3 select-none">
    <div className="mb-3 text-center"><div className="text-xs font-black tracking-[.22em] text-slate-400">ĐUA NGỰA</div><div className="text-sm text-slate-300">{isSpinning?'Các tay đua đang tăng tốc...':hasCompleted?'🏆 ĐÃ VỀ ĐÍCH':'Nhấn BẮT ĐẦU để đua'}</div></div>
    <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-3 sm:p-4 shadow-2xl space-y-2 overflow-hidden">
      {racers.map((s,i) => {
        const won=hasCompleted && winner?.id===s.id;
        const left=won?92:(isSpinning?(progress[s.id]??8):8);
        return <div key={s.id} className="relative h-11 rounded-xl bg-gradient-to-r from-emerald-950/80 to-emerald-900/40 overflow-hidden border border-white/10">
          <div className="absolute right-2 top-0 bottom-0 border-l-2 border-dashed border-white/70"/>
          <div className="absolute top-1/2 -translate-y-1/2 transition-[left] duration-200 ease-out flex items-center gap-1" style={{left:`${left}%`,transform:'translate(-100%,-50%)'}}>
            <span className={`text-2xl ${isSpinning?'animate-bounce':''}`}>🏇</span>
          </div>
          <span className={`absolute left-2 top-1/2 -translate-y-1/2 max-w-[45%] truncate text-xs sm:text-sm font-bold ${won?'text-amber-300':'text-white'}`}>{won?'👑 ':''}{s.name}</span>
        </div>
      })}
    </div>
    {students.length>8 && <div className="mt-2 text-center text-xs text-slate-500">Hiển thị 8 tay đua đại diện • kết quả vẫn chọn từ toàn bộ nhóm</div>}
  </div>;
};