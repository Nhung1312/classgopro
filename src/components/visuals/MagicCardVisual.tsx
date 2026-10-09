import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sparkles, Trophy, Wand2, Star, Shield, Flame } from 'lucide-react';
import { Student } from '../../types';
import { getStudentSTT } from '../../utils/studentDisplay';
import { getStudentInitials, getStudentAvatarGradient } from '../../utils/studentAvatar';

interface MagicCardVisualProps {
  students: Student[];
  isSpinning: boolean;
  hasCompleted: boolean;
  winner: Student | null;
  selectedStudents?: Student[];
  duration?: number;
  allClassStudents?: Student[];
}

export const MagicCardVisual: React.FC<MagicCardVisualProps> = ({
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

  // Number of cards in magic fan/deck during spin
  const CARD_SLOTS = 5;

  // Active shuffling highlight index during spin
  const [highlightIndex, setHighlightIndex] = useState<number>(2);
  const [shufflingNames, setShufflingNames] = useState<Student[]>([]);
  const [animProgress, setAnimProgress] = useState<number>(0);
  const [cardFlipRevealed, setCardFlipRevealed] = useState<boolean>(false);

  // Pick candidate pool for shuffling preview
  useEffect(() => {
    if (!students || students.length === 0) {
      setShufflingNames([]);
      return;
    }
    // Random sample of candidates for the 5 visible magic card backs/previews
    const sample: Student[] = [];
    for (let i = 0; i < CARD_SLOTS; i++) {
      sample.push(students[i % students.length]);
    }
    setShufflingNames(sample);
  }, [students]);

  // Shuffling loop during spin
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isSpinning) {
      setCardFlipRevealed(false);
      startTimeRef.current = performance.now();

      let lastShuffleTime = performance.now();
      let currentIdx = 0;

      const loop = (now: number) => {
        const elapsed = now - startTimeRef.current;
        const p = Math.min(1, elapsed / duration);
        setAnimProgress(p);

        // Shuffle interval slows down smoothly near the end
        // Fast early (65ms), slow late (260ms)
        const currentInterval = p < 0.7 ? 75 : 75 + (p - 0.7) * 550;

        if (now - lastShuffleTime >= currentInterval) {
          lastShuffleTime = now;
          currentIdx = (currentIdx + 1) % CARD_SLOTS;
          setHighlightIndex(currentIdx);

          // Rotate shuffling students
          if (students.length > 0) {
            setShufflingNames((prev) => {
              const next = [...prev];
              const randomSt = students[Math.floor(Math.random() * students.length)];
              next[currentIdx] = randomSt;
              return next;
            });
          }
        }

        if (p < 1) {
          animRef.current = requestAnimationFrame(loop);
        } else {
          setHighlightIndex(2); // Center card locks as winner slot
        }
      };

      animRef.current = requestAnimationFrame(loop);
    } else if (hasCompleted) {
      setAnimProgress(1);
      setHighlightIndex(2);
      // Small suspense pause then trigger card flip reveal
      const timer = setTimeout(() => {
        setCardFlipRevealed(true);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setAnimProgress(0);
      setHighlightIndex(2);
      setCardFlipRevealed(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isSpinning, hasCompleted, duration, students]);

  // Single primary winner for main card display
  const primaryWinner = activeWinners.length > 0 ? activeWinners[0] : null;
  const primarySTT = primaryWinner ? getStudentSTT(primaryWinner, allClassStudents || students) : 1;
  const primaryInitials = primaryWinner ? getStudentInitials(primaryWinner.name) : '??';
  const primaryGradient = primaryWinner ? getStudentAvatarGradient(primaryWinner.id || primaryWinner.name) : 'from-purple-600 to-indigo-700';

  return (
    <div className="w-full max-w-4xl py-2 px-2 select-none flex flex-col items-center">
      {/* Magic Deck Arena Container */}
      <div className="relative w-full rounded-3xl overflow-hidden border border-purple-500/40 bg-gradient-to-b from-[#0f0926] via-[#150f38] to-[#0a0518] p-3 sm:p-5 shadow-[0_0_50px_rgba(147,51,234,0.25)] min-h-[440px] sm:min-h-[490px] flex flex-col justify-between">
        
        {/* Mystical Background Particles & Runes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-purple-600/15 blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 left-1/4 w-80 h-80 rounded-full bg-indigo-600/15 blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-fuchsia-600/10 blur-3xl" />

          {/* Arcane Constellation Grid / Magic Circles */}
          <div className="absolute inset-0 opacity-15 flex items-center justify-center">
            <div className="w-[420px] h-[420px] rounded-full border border-purple-400/40 border-dashed animate-spin-slow" />
            <div className="w-[300px] h-[300px] rounded-full border-2 border-indigo-300/30 absolute" />
            <div className="w-[180px] h-[180px] rounded-full border border-fuchsia-400/40 absolute" />
          </div>
        </div>

        {/* Top Header Information */}
        <div className="relative z-20 flex items-center justify-between border-b border-purple-800/60 pb-2.5 mb-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-400 flex items-center justify-center text-xs shadow-sm shadow-purple-500/40 text-purple-300">
              <Wand2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-black tracking-widest uppercase text-purple-300 flex items-center gap-1.5">
              <span>LÁ BÀI MA THUẬT</span>
              <span className="text-[10px] text-fuchsia-400 font-mono">✦ MAGIC TAROT</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-300">
              {isSpinning ? (
                <span className="text-purple-300 font-bold animate-pulse flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-fuchsia-400 animate-ping" />
                  Năng lượng ma thuật đang xáo trộn các lá bài bí ẩn...
                </span>
              ) : hasCompleted ? (
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  {activeWinners.length > 1
                    ? `Đã khai mở ${activeWinners.length} lá bài ma thuật trúng thưởng!`
                    : 'Lá bài ma thuật định mệnh đã được khai mở!'}
                </span>
              ) : (
                <span className="text-slate-400">
                  {students.length > 0
                    ? `Hiện có ${students.length} học sinh trong cỗ bài • Nhấn QUAY TÊN để khai mở`
                    : 'Chưa có học sinh phù hợp bộ lọc'}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Center Arena: Magic Cards Display */}
        <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center py-2">
          
          {/* STATE A: GRAND REVEAL (hasCompleted) */}
          {hasCompleted && primaryWinner ? (
            <div className="w-full flex flex-col items-center justify-center animate-fade-in py-1">
              
              {activeWinners.length === 1 ? (
                /* SINGLE WINNER: Giant 3D Magic Card with Avatar & Full Name */
                <div className="flex flex-col items-center gap-3 animate-scale-in max-w-md w-full">
                  
                  {/* The Grand Magic Card Front */}
                  <div className="relative w-64 sm:w-72 aspect-[3/4.4] rounded-3xl p-1 bg-gradient-to-b from-amber-300 via-purple-500 to-indigo-900 shadow-[0_0_50px_rgba(217,119,6,0.5)] border-2 border-amber-300 ring-4 ring-purple-500/40 transform transition-all duration-500 hover:scale-105">
                    
                    {/* Inner Card Card Face */}
                    <div className="w-full h-full rounded-[22px] bg-gradient-to-b from-slate-950 via-[#160e33] to-[#0d0722] p-4 flex flex-col items-center justify-between relative overflow-hidden border border-amber-300/40">
                      
                      {/* Mystical Card Top Header */}
                      <div className="w-full flex items-center justify-between text-amber-300 text-xs font-mono font-bold">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>STT #{primarySTT}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-900/80 border border-purple-500/50 text-[10px] text-purple-200">
                          {primaryWinner.gender === 'nu' ? 'NỮ 👧' : primaryWinner.gender === 'nam' ? 'NAM 👦' : 'HỌC SINH'}
                        </span>
                        <span>✦ ✦ ✦</span>
                      </div>

                      {/* Giant Student Avatar Badge */}
                      <div className="relative my-2">
                        {/* Radiant halo aura */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400 to-purple-500 blur-lg opacity-80 animate-pulse" />
                        
                        {/* Avatar Circle */}
                        <div className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br ${primaryGradient} border-4 border-amber-300 flex items-center justify-center text-white font-black text-3xl sm:text-4xl shadow-2xl tracking-tight select-none`}>
                          {primaryInitials}
                          
                          {/* Crown accent on top */}
                          <div className="absolute -top-3.5 -right-1 text-2xl filter drop-shadow animate-bounce">
                            👑
                          </div>
                        </div>
                      </div>

                      {/* Card Center: Student Name & Attributes */}
                      <div className="w-full text-center space-y-1 z-10">
                        <div className="text-[10px] font-black uppercase tracking-widest text-amber-400/90">
                          NGƯỜI ĐƯỢC KHAI MỞ
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight px-1">
                          {primaryWinner.name}
                        </h2>
                        
                        {/* Stats / Call count info */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-amber-400/40 text-xs font-bold text-amber-300 mt-1 shadow-sm">
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          <span>Lần thứ {Math.max(1, primaryWinner.callCount ?? 1)} lên bảng</span>
                        </div>
                      </div>

                      {/* Card Bottom: Runic Seal Footer */}
                      <div className="w-full pt-2 border-t border-purple-800/60 flex items-center justify-between text-[10px] text-purple-300/80">
                        <span>LÁ BÀI SỐ {primarySTT}</span>
                        <span className="font-mono text-amber-300/80">CLASSGO MAGIC</span>
                      </div>
                    </div>
                  </div>

                  {/* Congratulation Tagline */}
                  <div className="text-center mt-1">
                    <span className="text-xs sm:text-sm font-bold text-amber-300 bg-amber-950/60 border border-amber-400/50 px-4 py-1.5 rounded-full shadow-lg inline-flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Chúc mừng học sinh đã được lá bài ma thuật gọi tên!
                    </span>
                  </div>
                </div>
              ) : (
                /* MULTIPLE WINNERS: Grid of Magic Cards for pickCount > 1 */
                <div className="w-full max-w-3xl flex flex-col items-center space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 text-xs sm:text-sm font-black uppercase tracking-wider">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>DANH SÁCH {activeWinners.length} LÁ BÀI MA THUẬT ĐÃ ĐƯỢC KHAI MỞ</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full max-h-72 overflow-y-auto p-1">
                    {activeWinners.map((w, idx) => {
                      const stt = getStudentSTT(w, allClassStudents || students);
                      const initials = getStudentInitials(w.name);
                      const grad = getStudentAvatarGradient(w.id || w.name);

                      return (
                        <div
                          key={w.id}
                          className="relative rounded-2xl p-1 bg-gradient-to-b from-amber-300/80 via-purple-600/80 to-indigo-900 border border-amber-300 shadow-xl transition-transform hover:scale-102"
                        >
                          <div className="rounded-[14px] bg-slate-950/90 p-3 flex items-center gap-3">
                            {/* Avatar */}
                            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${grad} border-2 border-amber-300 flex items-center justify-center text-white font-black text-base shadow-md shrink-0`}>
                              {initials}
                            </div>
                            
                            {/* Student Info */}
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold mb-0.5">
                                <span>STT #{stt}</span>
                                <span>#{idx + 1}</span>
                              </div>
                              <div className="text-white font-black text-sm truncate">
                                {w.name}
                              </div>
                              <div className="text-[11px] text-purple-200">
                                Lần thứ {Math.max(1, w.callCount ?? 1)} lên bảng
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STATE B: SHUFFLING / RESTING DECK FAN (isSpinning or Ready) */
            <div className="w-full flex flex-col items-center justify-center space-y-4">
              
              {/* 5 Levitating Magic Cards Row / Fan */}
              <div className="flex items-center justify-center gap-2 sm:gap-4 max-w-2xl w-full px-2">
                {Array.from({ length: CARD_SLOTS }).map((_, idx) => {
                  const isSelected = isSpinning ? highlightIndex === idx : idx === 2;
                  const sampleStudent = shufflingNames[idx];
                  const sampleSTT = sampleStudent ? getStudentSTT(sampleStudent, allClassStudents || students) : idx + 1;
                  const sampleInitials = sampleStudent ? getStudentInitials(sampleStudent.name) : '✦';
                  const sampleGrad = sampleStudent ? getStudentAvatarGradient(sampleStudent.id || sampleStudent.name) : 'from-purple-600 to-indigo-700';

                  // Card float/hover offset
                  const floatY = idx === 2 ? -8 : idx === 1 || idx === 3 ? -4 : 0;
                  const rotateDeg = (idx - 2) * 5; // Fan spread: -10, -5, 0, 5, 10

                  return (
                    <div
                      key={idx}
                      style={{
                        transform: `translateY(${isSelected ? floatY - 10 : floatY}px) rotate(${rotateDeg}deg) scale(${isSelected ? 1.08 : 0.98})`,
                        transition: isSpinning ? 'all 0.12s ease-out' : 'all 0.3s ease-out',
                      }}
                      className={`relative w-20 sm:w-28 md:w-32 aspect-[3/4.6] rounded-2xl p-1 shadow-2xl flex flex-col items-center justify-center cursor-default ${
                        isSelected
                          ? 'bg-gradient-to-b from-amber-300 via-purple-400 to-indigo-700 border-2 border-amber-300 ring-4 ring-purple-500/50 shadow-purple-500/50 z-20'
                          : 'bg-gradient-to-b from-purple-800/40 via-indigo-900/60 to-slate-950 border border-purple-700/60 text-purple-300 opacity-80 z-10'
                      }`}
                    >
                      {/* Inner Card Face / Back Graphic */}
                      <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-[#191038] to-[#0c061d] p-2 flex flex-col items-center justify-between border border-purple-500/30 overflow-hidden relative">
                        
                        {/* Arcane Card Corner Seals */}
                        <div className="w-full flex justify-between text-[9px] font-mono text-purple-400">
                          <span>✦</span>
                          <span>#{sampleSTT}</span>
                          <span>✦</span>
                        </div>

                        {/* Center Magic Orb or Shuffling Avatar Silhouette */}
                        <div className="relative my-auto flex flex-col items-center">
                          {isSpinning ? (
                            /* Shuffling avatar preview */
                            <div className="flex flex-col items-center gap-1">
                              <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br ${sampleGrad} border border-amber-300/80 flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-md animate-pulse`}>
                                {sampleInitials}
                              </div>
                              <span className="text-[10px] font-bold text-amber-300 truncate max-w-[70px] sm:max-w-[90px]">
                                {sampleStudent?.name || '••••'}
                              </span>
                            </div>
                          ) : (
                            /* Resting Mystical Runes Back */
                            <div className="flex flex-col items-center gap-1.5 opacity-90">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-purple-400/60 bg-purple-950/60 flex items-center justify-center text-amber-300 shadow-inner">
                                <Sparkles className="w-5 h-5 animate-spin-slow" />
                              </div>
                              <span className="text-[9px] font-mono tracking-widest text-purple-300 uppercase">
                                TAROT
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Bottom Marker */}
                        <div className="w-full flex justify-center text-[8px] sm:text-[9px] text-purple-400/80 font-mono">
                          {isSelected ? (
                            <span className="text-amber-300 font-bold animate-pulse">CHỌN</span>
                          ) : (
                            <span>CARD #{idx + 1}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Suspense / Subtitle prompt */}
              <div className="text-center max-w-md px-4 py-2 rounded-2xl bg-slate-900/80 border border-purple-700/50 shadow-lg">
                <div className="text-xs sm:text-sm font-bold text-purple-200 flex items-center justify-center gap-2">
                  <Wand2 className="w-4 h-4 text-purple-400 animate-pulse" />
                  <span>
                    {isSpinning
                      ? 'Đang tìm kiếm lá bài ma thuật chứa định mệnh học sinh...'
                      : 'Các lá bài ma thuật đang đợi bạn bấm QUAY TÊN!'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-purple-300/70 pt-2.5 mt-1 border-t border-purple-900/60">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Mỗi lá bài mang avatar và số thứ tự học sinh</span>
          </span>
          <span>Khai mở lá bài để xem avatar và họ tên đầy đủ người được chọn</span>
        </div>
      </div>
    </div>
  );
};
