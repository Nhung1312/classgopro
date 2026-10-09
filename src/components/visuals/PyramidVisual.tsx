import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Trophy, Sparkles, Flame, Eye, Crown, Zap, Shield, RotateCcw } from 'lucide-react';
import { Student } from '../../types';
import { getStudentSTT } from '../../utils/studentDisplay';
import { getStudentInitials, getStudentAvatarGradient } from '../../utils/studentAvatar';

interface PyramidVisualProps {
  students: Student[];
  isSpinning: boolean;
  hasCompleted: boolean;
  winner: Student | null;
  selectedStudents?: Student[];
  duration?: number;
  allClassStudents?: Student[];
  onSelectStudentProfile?: (student: Student) => void;
}

/**
 * Calculates symmetric, strictly increasing tiers for ANY student count N.
 * The apex (tier 0) starts with 1 stone block, expanding smoothly to the base.
 */
function calculatePyramidTiers(n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [1];
  if (n === 2) return [1, 1];
  if (n === 3) return [1, 2];
  if (n === 4) return [1, 1, 2];
  if (n === 5) return [1, 2, 2];

  let bestR = 2;
  for (let r = 2; r <= 14; r++) {
    const tri = (r * (r + 1)) / 2;
    if (tri <= n) {
      bestR = r;
    }
  }

  const r = bestR;
  const tiers: number[] = [];
  for (let i = 1; i <= r; i++) {
    tiers.push(i);
  }
  let currentSum = (r * (r + 1)) / 2;
  let remaining = n - currentSum;

  let tierIdx = r - 1;
  while (remaining > 0) {
    tiers[tierIdx]++;
    remaining--;
    tierIdx--;
    if (tierIdx < 1) tierIdx = r - 1;
  }
  return tiers;
}

interface PyramidBlock {
  student: Student;
  stt: number;
  initials: string;
  gradient: string;
  isWinner: boolean;
  elimProgress: number; // Progress threshold [0.08, 0.90] at which block dissolves
  tierIndex: number;
  colIndex: number;
}

export const PyramidVisual: React.FC<PyramidVisualProps> = ({
  students,
  isSpinning,
  hasCompleted,
  winner,
  selectedStudents,
  duration = 3800,
  allClassStudents,
  onSelectStudentProfile,
}) => {
  // 1. Resolve up-to-date active winners strictly from allClassStudents || students
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
  const [stageScale, setStageScale] = useState<number>(1);
  const [inspectMode, setInspectMode] = useState<boolean>(false);

  // Responsive scale to fit various container widths
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const s = Math.min(1.15, Math.max(0.65, w / 750));
      setStageScale(s);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. Continuous 60fps Animation State
  const [animProgress, setAnimProgress] = useState<number>(0);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isSpinning) {
      setInspectMode(false);
      setAnimProgress(0.01);
      startTimeRef.current = performance.now();

      const runLoop = (now: number) => {
        const elapsed = now - startTimeRef.current;
        const p = Math.min(1, elapsed / duration);
        setAnimProgress(p);

        if (p < 1) {
          animRef.current = requestAnimationFrame(runLoop);
        }
      };

      animRef.current = requestAnimationFrame(runLoop);

      return () => {
        if (animRef.current) {
          cancelAnimationFrame(animRef.current);
          animRef.current = null;
        }
      };
    } else if (hasCompleted) {
      setAnimProgress(1);
    } else {
      setAnimProgress(0);
    }
  }, [isSpinning, hasCompleted, duration]);

  // 3. Build Pyramid Grid & assign elimination milestones
  const { tiers, blocks, winnerBlock } = useMemo(() => {
    if (!students || students.length === 0) {
      return { tiers: [], blocks: [], winnerBlock: null };
    }

    const total = students.length;
    const tierCounts = calculatePyramidTiers(total);

    // Identify winners by id
    const winnerIds = new Set<string>(activeWinners.map((w) => w.id));

    // Separate non-winners and winners
    const nonWinnerStudents: Student[] = [];
    const winnerStudentPool: Student[] = [];

    students.forEach((s) => {
      if (winnerIds.has(s.id)) {
        winnerStudentPool.push(s);
      } else {
        nonWinnerStudents.push(s);
      }
    });

    // Pseudo-random deterministic shuffle for non-winners elimination order
    const shuffledNonWinners = [...nonWinnerStudents].sort((a, b) => {
      const hA = (a.id.charCodeAt(0) * 31 + a.name.charCodeAt(0)) % 100;
      const hB = (b.id.charCodeAt(0) * 31 + b.name.charCodeAt(0)) % 100;
      return hA - hB;
    });

    // Distribute students into tiers: place primary winner at apex or prominent tier
    // Arrange students so apex (tier 0) gets winner if possible, or distributes naturally
    const allOrdered: Student[] = [];
    if (winnerStudentPool.length > 0) {
      allOrdered.push(...winnerStudentPool);
      allOrdered.push(...shuffledNonWinners);
    } else {
      allOrdered.push(...students);
    }

    let studentPointer = 0;
    const allBlocks: PyramidBlock[] = [];
    let foundWinnerBlock: PyramidBlock | null = null;

    tierCounts.forEach((count, tIdx) => {
      for (let c = 0; c < count; c++) {
        if (studentPointer >= allOrdered.length) break;
        const st = allOrdered[studentPointer];
        const isW = winnerIds.has(st.id);
        const stt = getStudentSTT(st, allClassStudents || students);
        const initials = getStudentInitials(st?.name);
        const gradient = getStudentAvatarGradient(st.id || st.name);

        const blk: PyramidBlock = {
          student: st,
          stt,
          initials,
          gradient,
          isWinner: isW,
          elimProgress: isW ? 999 : 0.5,
          tierIndex: tIdx,
          colIndex: c,
        };

        allBlocks.push(blk);
        if (isW && !foundWinnerBlock) {
          foundWinnerBlock = blk;
        }

        studentPointer++;
      }
    });

    if (winnerIds.size === 0 && allBlocks.length > 0) {
      allBlocks[0].isWinner = true;
      allBlocks[0].elimProgress = 999;
      foundWinnerBlock = allBlocks[0];
    }

    // Elimination sequence: BOTTOM (đáy) TO TOP (đỉnh)
    // Non-winner blocks at highest tierIndex (base / đáy) eliminate first;
    // blocks at lower tierIndex (towards apex / đỉnh) eliminate last.
    const nonWinnerBlocks = allBlocks.filter((b) => !b.isWinner);
    nonWinnerBlocks.sort((a, b) => {
      // 1. Higher tierIndex (bottom of pyramid) eliminates first
      if (b.tierIndex !== a.tierIndex) {
        return b.tierIndex - a.tierIndex;
      }
      // 2. Within the same tier, pseudo-random deterministic stagger
      const hA = (a.student.id.charCodeAt(0) * 31 + a.student.name.charCodeAt(0)) % 100;
      const hB = (b.student.id.charCodeAt(0) * 31 + b.student.name.charCodeAt(0)) % 100;
      return hA - hB;
    });

    const totalNonWinners = nonWinnerBlocks.length;
    nonWinnerBlocks.forEach((blk, idx) => {
      blk.elimProgress = 0.08 + (idx / Math.max(1, totalNonWinners)) * 0.80;
    });

    return {
      tiers: tierCounts,
      blocks: allBlocks,
      winnerBlock: foundWinnerBlock,
    };
  }, [students, activeWinners, allClassStudents]);

  // Dynamic block sizing based on total count
  const blockSizeConfig = useMemo(() => {
    const count = students.length;
    if (count <= 12) {
      return {
        block: 'w-14 sm:w-16 h-12 sm:h-14',
        sttText: 'text-xs sm:text-sm',
        initialsText: 'text-xs sm:text-sm',
        gap: 'gap-2 sm:gap-3',
        rowGap: 'gap-2 sm:gap-2.5',
      };
    }
    if (count <= 25) {
      return {
        block: 'w-11 sm:w-12 h-10 sm:h-12',
        sttText: 'text-[11px] sm:text-xs',
        initialsText: 'text-[10px] sm:text-[11px]',
        gap: 'gap-1.5 sm:gap-2',
        rowGap: 'gap-1.5 sm:gap-2',
      };
    }
    if (count <= 38) {
      return {
        block: 'w-[38px] sm:w-[46px] h-[38px] sm:h-[44px]',
        sttText: 'text-[10px] sm:text-[11px]',
        initialsText: 'text-[9px] sm:text-[10px]',
        gap: 'gap-1 sm:gap-1.5',
        rowGap: 'gap-1 sm:gap-1.5',
      };
    }
    // 39 - 50+ students
    return {
      block: 'w-[32px] sm:w-[38px] h-[34px] sm:h-[40px]',
      sttText: 'text-[9px] sm:text-[10px]',
      initialsText: 'text-[8px] sm:text-[9px]',
      gap: 'gap-1',
      rowGap: 'gap-1',
    };
  }, [students.length]);

  // Live count of surviving blocks during spin
  const survivingCount = useMemo(() => {
    if (!isSpinning && !hasCompleted) return blocks.length;
    if (hasCompleted) return activeWinners.length || 1;
    return blocks.filter((b) => b.isWinner || animProgress < b.elimProgress + 0.05).length;
  }, [blocks, isSpinning, hasCompleted, animProgress, activeWinners.length]);

  const primaryWinner = activeWinners[0] || (winnerBlock ? winnerBlock.student : null);
  const primarySTT = primaryWinner ? getStudentSTT(primaryWinner, allClassStudents || students) : 1;
  const primaryInitials = primaryWinner ? getStudentInitials(primaryWinner.name) : 'HS';
  const primaryGradient = primaryWinner
    ? getStudentAvatarGradient(primaryWinner.id || primaryWinner.name)
    : 'from-amber-500 to-amber-700';

  // Group blocks by tier for structured pyramid rows
  const tierRows = useMemo(() => {
    const rows: PyramidBlock[][] = [];
    tiers.forEach((_, tIdx) => {
      rows.push(blocks.filter((b) => b.tierIndex === tIdx));
    });
    return rows;
  }, [tiers, blocks]);

  const showWinnerModal = hasCompleted && activeWinners.length > 0 && !inspectMode;

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-[460px] sm:min-h-[520px] rounded-3xl overflow-hidden bg-gradient-to-b from-[#090814] via-[#140e0b] to-[#080507] border border-amber-600/40 p-3 sm:p-5 flex flex-col justify-between shadow-[0_0_50px_rgba(217,119,6,0.2)] select-none"
    >
      {/* Mystical Egyptian Starfield & Rune Atmosphere */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-orange-600/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between text-xs px-2 py-1 border-b border-amber-900/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-amber-300 shadow-md">
            🔺
          </div>
          <span className="font-black text-amber-300 tracking-wide uppercase text-sm sm:text-base drop-shadow">
            KIM TỰ THÁP BÍ ẨN
          </span>
          <span className="text-[10px] sm:text-xs text-amber-400/80 bg-amber-950/70 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
            {survivingCount} / {blocks.length} KHỐI
          </span>
        </div>

        {/* Status prompt */}
        <div className="flex items-center gap-2">
          {hasCompleted && (
            <button
              onClick={() => setInspectMode(!inspectMode)}
              className="px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900/90 border border-amber-500/40 text-[11px] font-bold text-amber-200 flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
              title="Chuyển đổi xem lại cấu trúc kim tự tháp / Thẻ kết quả"
            >
              {inspectMode ? (
                <>
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Xem Người Chiến Thắng</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Xem Lại Kim TỰ Tháp</span>
                </>
              )}
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 text-amber-300/80 text-[11px] bg-slate-950/70 px-2.5 py-1 rounded-lg border border-amber-800/40">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {isSpinning
                ? 'Các khối đang dần tan biến...'
                : hasCompleted
                ? 'Khối đỉnh cao đã lộ diện!'
                : 'Mỗi học sinh là 1 khối cổ tự'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-3 overflow-hidden">
        {/* ==============================================================
            WINNER PRESENTATION CARD (WHEN RESULT IS PRESENTED)
            FOLLOWS THE PRISTINE RESULT UI: ZERO STRAY CANDIDATE BLOCKS!
           ============================================================== */}
        {showWinnerModal && primaryWinner ? (
          <div className="w-full flex flex-col items-center justify-center animate-fade-in relative z-30 py-2">
            {activeWinners.length === 1 ? (
              /* SINGLE WINNER CELEBRATION */
              <div className="w-full max-w-md flex flex-col items-center text-center space-y-3 sm:space-y-4">
                {/* 3D Golden Pyramid Capstone / Pharaoh Seal */}
                <div className="relative group">
                  {/* Glowing divine aura */}
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-amber-500/40 via-yellow-400/30 to-amber-600/40 blur-2xl animate-pulse pointer-events-none" />

                  {/* 3D Egyptian Beveled Capstone Box */}
                  <div className="relative w-44 sm:w-52 aspect-[1/1.1] rounded-3xl p-3 bg-gradient-to-b from-amber-400 via-amber-700 to-amber-950 border-2 border-amber-300 shadow-[0_0_40px_rgba(245,158,11,0.6)] flex flex-col items-center justify-between overflow-hidden">
                    {/* Top Glyph Banner */}
                    <div className="w-full flex items-center justify-between text-[11px] font-mono text-amber-950 bg-amber-300/90 py-0.5 px-2 rounded-lg font-black uppercase tracking-wider">
                      <span>𓁹 APEX</span>
                      <span>#STT {primarySTT}</span>
                    </div>

                    {/* Central Large Avatar with Royal Crown */}
                    <div className="relative my-auto flex flex-col items-center justify-center">
                      <div
                        className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br ${primaryGradient} border-4 border-amber-200 flex items-center justify-center text-white font-black text-3xl sm:text-4xl shadow-2xl tracking-tight select-none`}
                      >
                        {primaryInitials}

                        {/* Floating Crown Accent */}
                        <div className="absolute -top-4 -right-2 text-3xl filter drop-shadow animate-bounce">
                          👑
                        </div>
                      </div>
                    </div>

                    {/* Bottom Golden Seal */}
                    <div className="w-full text-center py-0.5 border-t border-amber-400/40 text-[10px] text-amber-200/90 font-bold uppercase tracking-widest">
                      ✦ KHỐI CUỐI CÙNG ✦
                    </div>
                  </div>
                </div>

                {/* Winner Details & Full Name */}
                <div className="w-full text-center space-y-2 px-3 mt-1">
                  <div className="text-[11px] font-black uppercase tracking-widest text-amber-400 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>LỜI NGUYỀN KIM TỰ THÁP ĐÃ GỌI TÊN</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  </div>

                  {/* Full Student Name: Clickable to open Profile */}
                  <h2
                    onClick={() => onSelectStudentProfile?.(primaryWinner)}
                    className={`text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight px-1 drop-shadow-md ${
                      onSelectStudentProfile
                        ? 'cursor-pointer hover:underline hover:text-amber-300 transition-colors'
                        : ''
                    }`}
                    title={onSelectStudentProfile ? `Bấm để xem Thẻ học sinh: ${primaryWinner.name}` : undefined}
                  >
                    {primaryWinner.name}
                  </h2>

                  {/* Badges: STT & Call count */}
                  <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onSelectStudentProfile?.(primaryWinner)}
                      className={`px-3.5 py-1 rounded-full bg-amber-950/90 border border-amber-500/60 text-xs font-bold text-amber-200 shadow-md ${
                        onSelectStudentProfile ? 'hover:bg-amber-900 cursor-pointer transition-colors' : ''
                      }`}
                      title={onSelectStudentProfile ? 'Bấm để xem Thẻ học sinh' : undefined}
                    >
                      STT #{primarySTT}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectStudentProfile?.(primaryWinner)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-900/90 border border-amber-400/40 text-xs font-bold text-amber-300 shadow-sm ${
                        onSelectStudentProfile ? 'hover:bg-slate-800 cursor-pointer transition-colors' : ''
                      }`}
                      title={onSelectStudentProfile ? 'Bấm để xem Thẻ học sinh' : undefined}
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>Lần thứ {Math.max(1, primaryWinner.callCount ?? 1)} lên bảng</span>
                    </button>
                  </div>
                </div>

                {/* Congratulation Footer */}
                <div className="text-center pt-1">
                  <span className="text-xs sm:text-sm font-bold text-amber-300 bg-amber-950/70 border border-amber-400/50 px-4 py-1.5 rounded-full shadow-lg inline-flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    Chúc mừng học sinh đã đứng vững trên đỉnh Kim Tự Tháp!
                  </span>
                </div>
              </div>
            ) : (
              /* MULTIPLE WINNERS CELEBRATION GRID */
              <div className="w-full max-w-3xl flex flex-col items-center space-y-3">
                <div className="flex items-center gap-2 text-amber-300 text-xs sm:text-sm font-black uppercase tracking-wider">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>DANH SÁCH {activeWinners.length} KHỐI CHIẾN THẮNG TRÊN ĐỈNH KIM TỰ THÁP</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full max-h-72 overflow-y-auto p-1">
                  {activeWinners.map((w) => {
                    const stt = getStudentSTT(w, allClassStudents || students);
                    const initials = getStudentInitials(w.name);
                    const grad = getStudentAvatarGradient(w.id || w.name);

                    return (
                      <div
                        key={w.id}
                        onClick={() => onSelectStudentProfile?.(w)}
                        className={`relative rounded-2xl p-3 bg-gradient-to-b from-amber-950/80 via-slate-900 to-black border-2 border-amber-400/80 shadow-xl flex items-center gap-3 transition-all ${
                          onSelectStudentProfile ? 'cursor-pointer hover:border-amber-300 hover:scale-105' : ''
                        }`}
                        title={onSelectStudentProfile ? `Bấm để xem Thẻ học sinh: ${w.name}` : undefined}
                      >
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} border border-amber-300 flex items-center justify-center text-white font-black text-lg shadow-md flex-shrink-0`}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-[10px] font-black text-amber-400 uppercase">
                            STT #{stt}
                          </div>
                          <div className="text-sm font-bold text-white truncate">
                            {w.name}
                          </div>
                          <div className="text-[10px] text-amber-300/80 flex items-center gap-1 mt-0.5">
                            <Flame className="w-3 h-3 text-amber-400" />
                            <span>Lần {Math.max(1, w.callCount ?? 1)}</span>
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
          /* ==============================================================
              PYRAMID VISUAL STAGE: 3D STONE TIERS & BLOCKS
             ============================================================== */
          <div
            style={{
              transform: `scale(${stageScale})`,
              transformOrigin: 'center center',
            }}
            className="flex flex-col items-center justify-center transition-transform duration-300 ease-out"
          >
            {/* Glowing Golden Apex Beacon */}
            <div className="relative mb-2 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-b from-amber-300 via-amber-500 to-orange-700 flex items-center justify-center text-amber-950 font-black shadow-[0_0_25px_rgba(251,191,36,0.9)] border border-amber-200">
                <Zap className="w-4 h-4 text-amber-950 fill-amber-950 animate-pulse" />
              </div>
              {/* Divine Light Beam dropping into the Pyramid Apex */}
              <div className="w-0.5 h-4 bg-gradient-to-b from-amber-300 to-transparent" />
            </div>

            {/* Structured Pyramid Rows */}
            <div className={`flex flex-col items-center ${blockSizeConfig.rowGap} w-full`}>
              {tierRows.map((rowBlocks, tIdx) => (
                <div
                  key={`tier-${tIdx}`}
                  className={`flex items-center justify-center ${blockSizeConfig.gap} flex-nowrap`}
                >
                  {rowBlocks.map((blk) => {
                    const isWinner = blk.isWinner;
                    // Determine state during spin
                    const isEliminated =
                      !isWinner && animProgress >= blk.elimProgress + 0.05;
                    const isDisintegrating =
                      !isWinner &&
                      animProgress >= blk.elimProgress &&
                      animProgress < blk.elimProgress + 0.05;
                    const isSurvivingWinner =
                      isWinner && (isSpinning || hasCompleted);

                    if (isEliminated) {
                      // Block dissolved: render empty ghost space to maintain layout integrity while shrinking
                      return (
                        <div
                          key={blk.student.id}
                          className={`${blockSizeConfig.block} transition-all duration-300 opacity-0 scale-50 pointer-events-none`}
                        />
                      );
                    }

                    return (
                      <div
                        key={blk.student.id}
                        onClick={() => onSelectStudentProfile?.(blk.student)}
                        title={
                          onSelectStudentProfile
                            ? `Bấm để xem Thẻ học sinh: ${blk.student.name} (STT #${blk.stt})`
                            : blk.student.name
                        }
                        className={`relative rounded-xl ${blockSizeConfig.block} flex flex-col items-center justify-between p-1 transition-all duration-200 ${
                          onSelectStudentProfile
                            ? 'cursor-pointer hover:scale-115 hover:z-30 hover:border-amber-300'
                            : 'cursor-default'
                        } ${
                          isDisintegrating
                            ? 'bg-gradient-to-b from-rose-600 to-orange-600 border-2 border-rose-300 scale-110 shadow-[0_0_20px_rgba(244,63,94,0.9)] animate-ping'
                            : isSurvivingWinner
                            ? 'bg-gradient-to-b from-amber-300 via-amber-500 to-amber-800 border-2 border-yellow-200 shadow-[0_0_30px_rgba(251,191,36,0.9)] scale-110 z-20 animate-pulse'
                            : 'bg-gradient-to-b from-amber-700/60 via-stone-900 to-amber-950/80 border border-amber-600/50 shadow-[0_4px_8px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(251,191,36,0.4)] hover:shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                        }`}
                      >
                        {/* Top Capstone Notch */}
                        <div className="w-full flex items-center justify-between text-[7px] text-amber-400/80 font-mono leading-none flex-shrink-0 select-none">
                          <span>✦</span>
                          <span>✦</span>
                        </div>

                        {/* STT Number on Line 1 & Initials 2 Letters on Line 2 */}
                        <div className="flex-1 flex flex-col items-center justify-center my-auto min-h-0 w-full overflow-hidden select-none">
                          <div
                            className={`${blockSizeConfig.sttText} leading-tight font-black truncate ${
                              isSurvivingWinner
                                ? 'text-amber-950 font-black'
                                : 'text-amber-200 drop-shadow'
                            }`}
                          >
                            #{blk.stt}
                          </div>

                          <div
                            className={`${blockSizeConfig.initialsText} leading-tight font-extrabold tracking-wider truncate flex-shrink-0 mt-0.5 ${
                              isSurvivingWinner
                                ? 'text-amber-950/90 font-black'
                                : 'text-amber-300 drop-shadow'
                            }`}
                          >
                            {blk.initials}
                          </div>
                        </div>

                        {/* Bottom Stone Bevel */}
                        <div className="w-full h-0.5 bg-amber-500/30 rounded-full flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Base Sarcophagus Pedestal */}
            <div className="mt-3 w-48 sm:w-72 h-2.5 rounded-full bg-gradient-to-r from-transparent via-amber-500/50 to-transparent blur-[1px]" />
          </div>
        )}
      </div>

      {/* Footer Info Bar */}
      <div className="relative z-10 flex items-center justify-between text-[11px] text-amber-400/70 pt-2 border-t border-amber-900/60">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>
            Kim tự tháp gồm {blocks.length} khối đá cổ tương ứng với {blocks.length} học sinh
          </span>
        </span>
        <span className="hidden sm:inline text-amber-300/60">
          Các khối sẽ tiêu biến dần • Khối trên đỉnh cao là người chiến thắng
        </span>
      </div>
    </div>
  );
};
