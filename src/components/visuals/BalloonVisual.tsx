import React, { useMemo } from 'react';
import { Student } from '../../types';
interface Props { students:Student[]; isSpinning:boolean; hasCompleted:boolean; winner:Student|null; }
export const BalloonVisual:React.FC<Props>=({students,isSpinning,hasCompleted,winner})=>{
 const items=useMemo(()=>{const p=students.slice(0,10); if(winner&&!p.some(s=>s.id===winner.id)) return [...p.slice(0,9),winner]; return p;},[students,winner]);
 return <div className="w-full max-w-4xl px-2 py-3 select-none">
  <div className="mb-3 text-center"><div className="text-xs font-black tracking-[.22em] text-slate-400">BONG BÓNG</div><div className="text-sm text-slate-300">{isSpinning?'Bóng đang bay...':hasCompleted?'✨ ĐÃ CHỌN':'Nhấn BẮT ĐẦU'}</div></div>
  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 rounded-3xl border border-slate-700 bg-gradient-to-b from-sky-950/50 to-slate-950 p-4 shadow-2xl">
   {items.map((s,i)=>{const won=hasCompleted&&winner?.id===s.id; return <div key={s.id} className={`min-h-28 rounded-2xl border flex flex-col items-center justify-center p-2 transition-all duration-500 ${won?'scale-110 border-amber-300 bg-amber-500/20 shadow-xl':'border-white/10 bg-white/5'}`}>
    <span className={`text-5xl ${isSpinning?(i%2?'animate-pulse':'animate-bounce'):''}`}>🎈</span><span className={`mt-2 w-full truncate text-center text-xs font-bold ${won?'text-amber-300':'text-white'}`}>{won?'👑 ':''}{s.name}</span>
   </div>})}
  </div>
 </div>
};