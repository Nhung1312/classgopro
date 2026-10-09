import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sparkles, Trophy, Wand2, Flame } from 'lucide-react';
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
  onSelectStudentProfile?: (student: Student) => void;
}

// Compute concentric orbital ring distribution for ANY student count
function getRingsConfig(total: number) {
  if (total <= 0) return [];
  if (total === 1) {
    return [{ count: 1, rx: 0, ry: 0, speed: 0 }];
  }
  if (total <= 8) {
    return [{ count: total, rx: 160, ry: 95, speed: 1.0 }];
  }
  if (total <= 16) {
    const inner = Math.max(3, Math.floor(total * 0.38));
    const outer = total - inner;
    return [
      { count: inner, rx: 100, ry: 60, speed: -1.1 },
      { count: outer, rx: 210, ry: 120, speed: 0.9 },
    ];
  }
  if (total <= 28) {
    const r1 = Math.max(4, Math.floor(total * 0.22));
    const r2 = Math.max(6, Math.floor(total * 0.38));
    const r3 = total - r1 - r2;
    return [
      { count: r1, rx: 80, ry: 48, speed: 1.2 },
      { count: r2, rx: 160, ry: 95, speed: -0.9 },
      { count: r3, rx: 245, ry: 140, speed: 0.8 },
    ];
  }
  // 29 - 45+ students: 4 balanced celestial orbits
  const r1 = Math.max(4, Math.floor(total * 0.16));
  const r2 = Math.max(6, Math.floor(total * 0.24));
  const r3 = Math.max(8, Math.floor(total * 0.28));
  const r4 = total - r1 - r2 - r3;
  return [
    { count: r1, rx: 70, ry: 42, speed: -1.3 },
    { count: r2, rx: 135, ry: 80, speed: 1.05 },
    { count: r3, rx: 205, ry: 120, speed: -0.85 },
    { count: r4, rx: 275, ry: 155, speed: 0.75 },
  ];
}

export const MagicCardVisual: React.FC<MagicCardVisualProps> = ({
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

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [stageScale, setStageScale] = useState<number>(1);
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);

  // Responsive stage scaling based on container width
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const s = Math.min(1.15, Math.max(0.52, w / 720));
      setStageScale(s);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. Generate EXACTLY 1 card per student in `students`
  const cardItems = useMemo(() => {
    if (!students || students.length === 0) return [];
    const total = students.length;
    const rings = getRingsConfig(total);

    let currentStudentIdx = 0;
    const items: Array<{
      student: Student;
      stt: number;
      initials: string;
      gradient: string;
      rx: number;
      ry: number;
      baseAngle: number;
      speedMult: number;
      wobblePhase: number;
      tilt: number;
    }> = [];

    rings.forEach((ring, ringIdx) => {
      const ringOffset = (ringIdx * Math.PI) / 4;
      for (let j = 0; j < ring.count; j++) {
        if (currentStudentIdx >= total) break;
        const st = students[currentStudentIdx];
        const stt = getStudentSTT(st, allClassStudents || students);
        const initials = getStudentInitials(st.name);
        const gradient = getStudentAvatarGradient(st.id || st.name);
        const baseAngle = (2 * Math.PI * j) / ring.count + ringOffset;
        const wobblePhase = (currentStudentIdx * 1.37) % (2 * Math.PI);
        const tilt = ((j % 5) - 2) * 2.5;

        items.push({
          student: st,
          stt,
          initials,
          gradient,
          rx: ring.rx,
          ry: ring.ry,
          baseAngle,
          speedMult: ring.speed,
          wobblePhase,
          tilt,
        });

        currentStudentIdx++;
      }
    });

    return items;
  }, [students, allClassStudents]);

  useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, cardItems.length);
  }, [cardItems.length]);

  // 3. Adaptive card scale based on students.length - Avatar takes center stage!
  const cardSizeConfig = useMemo(() => {
    const count = cardItems.length;
    if (count <= 8) {
      // Large
      return {
        cardClass: 'w-18 sm:w-22 md:w-26 aspect-[3/4.4]',
        avatarClass: 'w-11 h-11 sm:w-14 sm:h-14 text-sm sm:text-base font-black',
        padding: 'p-1.5 sm:p-2',
      };
    }
    if (count <= 16) {
      // Medium
      return {
        cardClass: 'w-15 sm:w-18 md:w-21 aspect-[3/4.4]',
        avatarClass: 'w-9 h-9 sm:w-11 sm:h-11 text-xs sm:text-sm font-black',
        padding: 'p-1 sm:p-1.5',
      };
    }
    if (count <= 25) {
      // Small
      return {
        cardClass: 'w-12 sm:w-15 md:w-17 aspect-[3/4.4]',
        avatarClass: 'w-7 h-7 sm:w-9 sm:h-9 text-[11px] sm:text-xs font-black',
        padding: 'p-1',
      };
    }
    // 26 - 45+ Compact
    return {
      cardClass: 'w-10 sm:w-12 md:w-14 aspect-[3/4.4]',
      avatarClass: 'w-6 h-6 sm:w-7 sm:h-7 text-[10px] sm:text-[11px] font-bold',
      padding: 'p-0.5 sm:p-1',
    };
  }, [cardItems.length]);

  // 4. Smooth 60FPS physics loop (requestAnimationFrame)
  const animRef = useRef<number | null>(null);
  const angleAccumRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const spinStartRef = useRef<number>(0);
  const lastHighlightSwitchRef = useRef<number>(0);

  useEffect(() => {
    if (isSpinning) {
      spinStartRef.current = performance.now();
      lastHighlightSwitchRef.current = performance.now();
    }
  }, [isSpinning]);

  useEffect(() => {
    if (hasCompleted) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const loop = (now: number) => {
      const dt = Math.min(64, now - lastTimeRef.current);
      lastTimeRef.current = now;

      if (isSpinning) {
        const elapsed = now - spinStartRef.current;
        const p = Math.min(1, elapsed / duration);

        const speedFactor = p < 0.65 ? 4.2 : 4.2 * Math.pow(1 - (p - 0.65) / 0.35, 2) + 0.15;
        angleAccumRef.current += dt * 0.0018 * speedFactor;

        const highlightInterval = p < 0.7 ? 80 : 80 + (p - 0.7) * 450;
        if (now - lastHighlightSwitchRef.current >= highlightInterval && cardItems.length > 0) {
          lastHighlightSwitchRef.current = now;
          if (p >= 0.95 && activeWinners.length > 0) {
            setFocusedCardId(activeWinners[0].id);
          } else {
            const randomIdx = Math.floor(Math.random() * cardItems.length);
            setFocusedCardId(cardItems[randomIdx].student.id);
          }
        }
      } else {
        angleAccumRef.current += dt * 0.00045;
      }

      cardItems.forEach((item, idx) => {
        const el = cardRefs.current[idx];
        if (!el) return;

        const currentAngle = item.baseAngle + item.speedMult * angleAccumRef.current;
        const wobble = Math.sin(angleAccumRef.current * 1.6 + item.wobblePhase) * 5;
        const x = item.rx * Math.cos(currentAngle) * stageScale;
        const y = (item.ry * Math.sin(currentAngle) + wobble) * stageScale;
        const tilt = item.tilt + Math.sin(currentAngle) * 5;
        const isFocal = focusedCardId === item.student.id;
        const cardScale = isSpinning ? (isFocal ? 1.18 : 0.96) : 1;

        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${tilt.toFixed(1)}deg) scale(${cardScale})`;
        el.style.zIndex = Math.round(y + 200).toString();
      });

      animRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [cardItems, isSpinning, hasCompleted, duration, stageScale, focusedCardId, activeWinners]);

  const primaryWinner = activeWinners.length > 0 ? activeWinners[0] : null;
  const primarySTT = primaryWinner ? getStudentSTT(primaryWinner, allClassStudents || students) : 1;
  const primaryInitials = primaryWinner ? getStudentInitials(primaryWinner.name) : '??';
  const primaryGradient = primaryWinner
    ? getStudentAvatarGradient(primaryWinner.id || primaryWinner.name)
    : 'from-purple-600 to-indigo-700';

  return (
    <div className="w-full max-w-4xl py-2 px-2 select-none flex flex-col items-center">
      {/* Magic Deck Arena Container */}
      <div
        ref={containerRef}
        className="relative w-full rounded-3xl overflow-hidden border border-purple-500/40 bg-gradient-to-b from-[#0f0926] via-[#150f38] to-[#0a0518] p-3 sm:p-5 shadow-[0_0_50px_rgba(147,51,234,0.25)] min-h-[460px] sm:min-h-[510px] flex flex-col justify-between"
      >
        {/* Mystical Background Particles & Runes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-purple-600/15 blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 left-1/4 w-80 h-80 rounded-full bg-indigo-600/15 blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-fuchsia-600/10 blur-3xl" />

          {/* Arcane Constellation Grid / Magic Circles */}
          <div className="absolute inset-0 opacity-15 flex items-center justify-center">
            <div className="w-[440px] h-[440px] rounded-full border border-purple-400/40 border-dashed animate-spin-slow" />
            <div className="w-[320px] h-[320px] rounded-full border-2 border-indigo-300/30 absolute" />
            <div className="w-[190px] h-[190px] rounded-full border border-fuchsia-400/40 absolute" />
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
                  Năng lượng ma thuật đang xoay chuyển cỗ bài định mệnh...
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
                    ? `Hiện có ${students.length} lá bài (${students.length} HS) trong cỗ bài • Nhấn QUAY TÊN để khai mở`
                    : 'Chưa có học sinh phù hợp bộ lọc'}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Center Arena */}
        <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center py-2 min-h-[340px]">
          {/* STATE A: GRAND REVEAL (hasCompleted) */}
          {hasCompleted && primaryWinner ? (
            <div className="w-full flex flex-col items-center justify-center animate-fade-in py-1">
              {activeWinners.length === 1 ? (
                /* SINGLE WINNER:
                   - ON THE CARD FACE: ONLY AVATAR (NO NAME, NO STT, NO TEXT)
                   - OUTSIDE THE CARD (BELOW): FULL NAME & BADGES
                */
                <div className="flex flex-col items-center gap-3 animate-scale-in max-w-md w-full">
                  {/* The Grand Magic Card Front */}
                  <div
                    onClick={() => onSelectStudentProfile?.(primaryWinner)}
                    className={`relative w-56 sm:w-64 aspect-[3/4.4] rounded-3xl p-1 bg-gradient-to-b from-amber-300 via-purple-500 to-indigo-900 shadow-[0_0_50px_rgba(217,119,6,0.5)] border-2 border-amber-300 ring-4 ring-purple-500/40 transform transition-all duration-500 hover:scale-105 ${
                      onSelectStudentProfile ? 'cursor-pointer' : ''
                    }`}
                    title={onSelectStudentProfile ? `Bấm để xem Thẻ học sinh: ${primaryWinner.name}` : undefined}
                  >
                    {/* Inner Card Face - PURE AVATAR FOCUS */}
                    <div className="w-full h-full rounded-[22px] bg-gradient-to-b from-slate-950 via-[#160e33] to-[#0d0722] p-4 flex flex-col items-center justify-between relative overflow-hidden border border-amber-300/40">
                      {/* Mystical Arcane Runes Header (NO TEXT) */}
                      <div className="w-full flex items-center justify-between text-amber-300 text-xs font-mono">
                        <span>✦</span>
                        <span className="text-[10px] tracking-widest text-purple-300">✦ ✦ ✦</span>
                        <span>✦</span>
                      </div>

                      {/* Prominent Center Student Avatar Badge */}
                      <div className="relative my-auto flex flex-col items-center">
                        {/* Radiant halo aura */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400 to-purple-500 blur-xl opacity-80 animate-pulse" />

                        {/* Avatar Circle */}
                        <div
                          className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br ${primaryGradient} border-4 border-amber-300 flex items-center justify-center text-white font-black text-4xl sm:text-5xl shadow-2xl tracking-tight select-none`}
                        >
                          {primaryInitials}

                          {/* Crown accent on top */}
                          <div className="absolute -top-4 -right-1 text-3xl filter drop-shadow animate-bounce">
                            👑
                          </div>
                        </div>
                      </div>

                      {/* Card Bottom: Arcane Rune Seal (NO STUDENT TEXT) */}
                      <div className="w-full pt-1 border-t border-purple-800/60 flex items-center justify-center text-[10px] text-amber-300/80 font-mono tracking-widest">
                        <span>✦ CLASSGO MAGIC TAROT ✦</span>
                      </div>
                    </div>
                  </div>

                  {/* OUTSIDE THE CARD: FULL NAME & RESULT DETAILS */}
                  <div className="w-full text-center space-y-1.5 z-10 px-2 mt-1">
                    <div className="text-[11px] font-black uppercase tracking-widest text-amber-400">
                      NGƯỜI ĐƯỢC KHAI MỞ
                    </div>
                    {/* FULL STUDENT NAME PROMINENTLY OUTSIDE THE CARD */}
                    <h2
                      onClick={() => onSelectStudentProfile?.(primaryWinner)}
                      className={`text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight px-1 drop-shadow-lg ${
                        onSelectStudentProfile ? 'cursor-pointer hover:underline hover:text-amber-300 transition-colors' : ''
                      }`}
                      title={onSelectStudentProfile ? `Bấm để xem Thẻ học sinh: ${primaryWinner.name}` : undefined}
                    >
                      {primaryWinner.name}
                    </h2>

                    {/* Stats / Call count info */}
                    <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onSelectStudentProfile?.(primaryWinner)}
                        className={`px-3 py-1 rounded-full bg-purple-950/90 border border-purple-500/50 text-xs font-bold text-purple-200 ${
                          onSelectStudentProfile ? 'hover:bg-purple-900 cursor-pointer transition-colors' : ''
                        }`}
                        title={onSelectStudentProfile ? 'Bấm để xem Thẻ học sinh' : undefined}
                      >
                        STT #{primarySTT}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectStudentProfile?.(primaryWinner)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-amber-400/40 text-xs font-bold text-amber-300 shadow-sm ${
                          onSelectStudentProfile ? 'hover:bg-slate-800 cursor-pointer transition-colors' : ''
                        }`}
                        title={onSelectStudentProfile ? 'Bấm để xem Thẻ học sinh' : undefined}
                      >
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        <span>Lần thứ {Math.max(1, primaryWinner.callCount ?? 1)} lên bảng</span>
                      </button>
                    </div>
                  </div>

                  {/* Congratulation Tagline */}
                  <div className="text-center mt-0.5">
                    <span className="text-xs sm:text-sm font-bold text-amber-300 bg-amber-950/60 border border-amber-400/50 px-4 py-1.5 rounded-full shadow-lg inline-flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Chúc mừng học sinh đã được lá bài ma thuật gọi tên!
                    </span>
                  </div>
                </div>
              ) : (
                /* MULTIPLE WINNERS:
                   - ON EACH CARD: ONLY AVATAR
                   - OUTSIDE/BELOW EACH CARD: FULL NAME & CALL COUNT
                */
                <div className="w-full max-w-3xl flex flex-col items-center space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 text-xs sm:text-sm font-black uppercase tracking-wider">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>DANH SÁCH {activeWinners.length} LÁ BÀI MA THUẬT ĐÃ ĐƯỢC KHAI MỞ</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 w-full max-h-72 overflow-y-auto p-1">
                    {activeWinners.map((w, idx) => {
                      const stt = getStudentSTT(w, allClassStudents || students);
                      const initials = getStudentInitials(w.name);
                      const grad = getStudentAvatarGradient(w.id || w.name);

                      return (
                        <div
                          key={w.id}
                          onClick={() => onSelectStudentProfile?.(w)}
                          className={`relative rounded-2xl p-2.5 bg-gradient-to-b from-slate-900 via-[#160e33] to-[#0d0722] border-2 border-amber-300/80 shadow-xl flex flex-col items-center text-center gap-2 transition-all ${
                            onSelectStudentProfile ? 'cursor-pointer hover:border-amber-300 hover:scale-105' : ''
                          }`}
                          title={onSelectStudentProfile ? `Bấm để xem Thẻ học sinh: ${w.name}` : undefined}
                        >
                          {/* Mini Magic Card Face: ONLY AVATAR */}
                          <div className="relative w-16 h-22 sm:w-18 sm:h-24 rounded-xl p-1 bg-gradient-to-b from-amber-300 via-purple-500 to-indigo-900 border border-amber-300 flex items-center justify-center shadow-md">
                            <div className="w-full h-full rounded-lg bg-slate-950 flex flex-col items-center justify-between p-1">
                              <span className="text-[7px] text-amber-400">✦</span>
                              {/* Avatar in Center */}
                              <div
                                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br ${grad} border-2 border-amber-300 flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-md`}
                              >
                                {initials}
                              </div>
                              <span className="text-[7px] text-amber-400">✦</span>
                            </div>
                          </div>

                          {/* OUTSIDE / BELOW CARD: FULL STUDENT NAME & INFO */}
                          <div className="w-full text-center">
                            <div className="text-[10px] text-amber-400 font-bold mb-0.5">
                              STT #{stt} • #{idx + 1}
                            </div>
                            <div className="text-white hover:text-amber-300 hover:underline font-black text-sm truncate px-1">
                              {w.name}
                            </div>
                            <div className="text-[11px] text-purple-200 mt-0.5">
                              Lần thứ {Math.max(1, w.callCount ?? 1)} lên bảng
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
            /* STATE B: ORBITAL DECK STAGE - 100% CANDIDATES, EACH CARD SHOWS ONLY AVATAR */
            <div className="relative w-full h-[320px] sm:h-[370px] flex items-center justify-center overflow-hidden">
              {/* Mystic Central Core */}
              <div className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-purple-500/40 bg-purple-950/30 flex items-center justify-center pointer-events-none shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                <Wand2 className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400/70 animate-pulse" />
              </div>

              {/* RENDER EXACTLY students.length CARDS - ONLY AVATAR ON CARD FACE */}
              {cardItems.map((item, idx) => {
                const isFocal = isSpinning && focusedCardId === item.student.id;
                return (
                  <div
                    key={item.student.id}
                    ref={(el) => {
                      cardRefs.current[idx] = el;
                    }}
                    style={{
                      position: 'absolute',
                      willChange: 'transform',
                      top: '50%',
                      left: '50%',
                      marginTop: '-36px',
                      marginLeft: '-24px',
                    }}
                    onClick={() => onSelectStudentProfile?.(item.student)}
                    className={`rounded-xl ${cardSizeConfig.cardClass} ${cardSizeConfig.padding} transition-all duration-150 flex flex-col items-center justify-between border ${
                      onSelectStudentProfile ? 'cursor-pointer hover:scale-125 hover:z-50 hover:shadow-[0_0_25px_rgba(251,191,36,0.9)]' : 'cursor-default'
                    } ${
                      isFocal
                        ? 'bg-gradient-to-b from-amber-300 via-purple-500 to-indigo-800 border-amber-300 ring-2 ring-amber-300/80 shadow-[0_0_20px_rgba(251,191,36,0.8)]'
                        : 'bg-gradient-to-b from-[#1d1240] via-[#120a2e] to-[#0a0518] border-purple-500/40 shadow-[0_0_12px_rgba(147,51,234,0.35)]'
                    }`}
                    title={onSelectStudentProfile ? `Bấm để xem Thẻ học sinh: ${item.student.name} (STT #${item.stt})` : undefined}
                  >
                    {/* Card Inner Face - ONLY AVATAR, NO STUDENT NAME, NO STT, NO TEXT */}
                    <div className="w-full h-full rounded-lg bg-gradient-to-b from-[#180e38] to-[#0b051e] p-1 flex flex-col items-center justify-between border border-purple-500/30 overflow-hidden relative">
                      {/* Top Corner Arcane Runes (NO STT TEXT) */}
                      <div className="w-full flex items-center justify-between text-purple-400/70 font-mono text-[7px] leading-none">
                        <span>✦</span>
                        <span>✦</span>
                      </div>

                      {/* Center Student Avatar - PROMINENT & CLEAR */}
                      <div className="relative my-auto flex flex-col items-center justify-center">
                        <div
                          className={`rounded-full bg-gradient-to-br ${item.gradient} border border-amber-300/80 flex items-center justify-center text-white shadow-md select-none ${cardSizeConfig.avatarClass}`}
                        >
                          {item.initials}
                        </div>
                      </div>

                      {/* Bottom Arcane Rune */}
                      <div className="w-full flex items-center justify-between text-purple-400/70 font-mono text-[7px] leading-none">
                        <span>✦</span>
                        <span>✦</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Status prompt in center bottom */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none z-30">
                <div className="px-3 py-1 rounded-full bg-slate-950/80 border border-purple-700/50 text-[11px] text-purple-200 font-semibold shadow-lg backdrop-blur-sm flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>
                    {isSpinning
                      ? 'Năng lượng đang hội tụ vào lá bài định mệnh...'
                      : `Cỗ bài gồm ${cardItems.length} lá bài ma thuật đang đợi khai mở!`}
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
            <span>
              Mỗi học sinh = 1 lá bài độc lập (hiện có {cardItems.length} lá tương ứng {cardItems.length} HS)
            </span>
          </span>
          <span>Mặt lá bài hiển thị avatar ma thuật • Người chiến thắng sẽ lộ diện họ tên đầy đủ</span>
        </div>
      </div>
    </div>
  );
};
