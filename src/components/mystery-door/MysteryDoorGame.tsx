import React, { useState, useMemo, useEffect } from 'react';
import {
  ReviewQuestion,
  ReviewQuestionBank,
  ReviewQuestionLevel,
  ReviewSessionState,
  Student,
} from '../../types';
import { getReviewQuestions, loadQuestionsForBank } from '../../services/reviewQuestionService';
import { MysteryDoorGrid, MysteryDoorItem } from './MysteryDoorGrid';
import { MysteryQuestionCard } from './MysteryQuestionCard';
import { TxColumn } from '../../utils/quickScoreHelper';
import {
  Sparkles,
  RotateCcw,
  X,
  BookOpen,
  AlertTriangle,
  Play,
  Layers,
  ArrowLeft,
  CheckCircle2,
  Trophy,
} from 'lucide-react';

interface MysteryDoorGameProps {
  bank: ReviewQuestionBank;
  ownerId?: string;
  student?: Student | null;
  classId?: string;
  className?: string;
  onClose: () => void;
  onSaveHistoryScore?: (score: string, note?: string, questionContent?: string) => void;
  onSaveTxScore?: (score: number, slot: TxColumn, note?: string, questionContent?: string) => Promise<boolean> | boolean;
}

export const MysteryDoorGame: React.FC<MysteryDoorGameProps> = ({
  bank,
  ownerId,
  student,
  classId,
  className,
  onClose,
  onSaveHistoryScore,
  onSaveTxScore,
}) => {
  // Session State (scoped to this bank/lesson)
  const [session, setSession] = useState<ReviewSessionState>({
    lessonId: bank.lessonId,
    bankId: bank.id,
    usedQuestionIds: [],
  });

  // Reset session if bank changes
  useEffect(() => {
    setSession({
      lessonId: bank.lessonId,
      bankId: bank.id,
      usedQuestionIds: [],
    });
    setGamePhase('CONFIG');
    setSelectedDoor(null);
    setDoors([]);
  }, [bank.id, bank.lessonId]);

  // Teacher configurations
  const [level, setLevel] = useState<ReviewQuestionLevel>('basic');
  const [doorCount, setDoorCount] = useState<number>(4);

  // Game flow phases: 'CONFIG' | 'GRID' | 'QUESTION'
  const [gamePhase, setGamePhase] = useState<'CONFIG' | 'GRID' | 'QUESTION'>('CONFIG');

  // Active round state
  const [doors, setDoors] = useState<MysteryDoorItem[]>([]);
  const [selectedDoor, setSelectedDoor] = useState<MysteryDoorItem | null>(null);

  // Confirmation dialog for Reset Session
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Load all questions of the current bank to compute available pools
  const bankQuestions = useMemo(() => {
    return loadQuestionsForBank(bank.id, ownerId);
  }, [bank.id, ownerId]);

  // Calculate available (unused) questions per level
  const availableCounts = useMemo(() => {
    const usedSet = new Set(session.usedQuestionIds);
    const basicAvailable = bankQuestions.filter(
      (q) => q.level === 'basic' && !usedSet.has(q.id)
    ).length;
    const advancedAvailable = bankQuestions.filter(
      (q) => q.level === 'advanced' && !usedSet.has(q.id)
    ).length;

    return {
      basic: basicAvailable,
      advanced: advancedAvailable,
      totalBasic: bankQuestions.filter((q) => q.level === 'basic').length,
      totalAdvanced: bankQuestions.filter((q) => q.level === 'advanced').length,
    };
  }, [bankQuestions, session.usedQuestionIds]);

  const currentAvailableCount =
    level === 'basic' ? availableCounts.basic : availableCounts.advanced;

  // Auto-adjust doorCount if current choice exceeds available count
  useEffect(() => {
    if (doorCount > currentAvailableCount && currentAvailableCount > 0) {
      const allowed = [10, 8, 6, 4, 2].find((c) => c <= currentAvailableCount);
      if (allowed) {
        setDoorCount(allowed);
      }
    }
  }, [currentAvailableCount, doorCount]);

  // Shuffle helper (Fisher-Yates) - executed exactly ONCE when generating round
  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Start round: Fetch questions and assign fixed mapping Door -> Question
  const handleStartRound = () => {
    if (currentAvailableCount < doorCount || doorCount <= 0) return;

    // Call service helper with exact filters
    const fetched = getReviewQuestions({
      lessonId: bank.lessonId,
      bankId: bank.id,
      level,
      count: doorCount,
      excludeIds: session.usedQuestionIds,
      ownerId,
    });

    if (fetched.length < doorCount) {
      return;
    }

    // Shuffle ONCE
    const shuffledQuestions = shuffleArray(fetched);

    // Fixed mapping Door 1..N -> Question A..N
    const roundDoors: MysteryDoorItem[] = shuffledQuestions.map((q, idx) => ({
      doorNumber: idx + 1,
      question: q,
      isOpened: false,
    }));

    setDoors(roundDoors);
    setSelectedDoor(null);
    setGamePhase('GRID');
  };

  // When a student picks a door
  const handleSelectDoor = (door: MysteryDoorItem) => {
    setSelectedDoor(door);

    // Mark question as used in current session
    setSession((prev) => {
      if (prev.usedQuestionIds.includes(door.question.id)) {
        return prev;
      }
      return {
        ...prev,
        usedQuestionIds: [...prev.usedQuestionIds, door.question.id],
      };
    });

    setGamePhase('QUESTION');
  };

  // Return from Question Card back to Grid (marks current door as opened)
  const handleReturnToGrid = () => {
    if (selectedDoor) {
      // Mark this specific door as opened
      setDoors((prevDoors) =>
        prevDoors.map((d) =>
          d.doorNumber === selectedDoor.doorNumber ? { ...d, isOpened: true } : d
        )
      );
    }
    setSelectedDoor(null);
    setGamePhase('GRID');
  };

  // Check if all doors in the current round have been opened
  const areAllDoorsOpened = useMemo(() => {
    return doors.length > 0 && doors.every((d) => d.isOpened);
  }, [doors]);

  // Start a new round / change configuration
  const handleNewRound = () => {
    setSelectedDoor(null);
    setDoors([]);
    setGamePhase('CONFIG');
  };

  // Reset Session (usedQuestionIds = [])
  const handleConfirmResetSession = () => {
    setSession({
      lessonId: bank.lessonId,
      bankId: bank.id,
      usedQuestionIds: [],
    });
    setIsResetConfirmOpen(false);
    setSelectedDoor(null);
    setDoors([]);
    setGamePhase('CONFIG');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 text-slate-100 overflow-y-auto backdrop-blur-md animate-fade-in select-none">
      {/* TOP GAME BAR */}
      <header className="px-4 py-3 sm:px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between flex-shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25">
            🚪
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-amber-300 uppercase">
                Ô CỬA BÍ MẬT
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
                KT Bài Cũ
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
              [{bank.subject} - Lớp {bank.grade}] {bank.lessonName}
            </p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          {/* Reset Session Button */}
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Làm mới lại danh sách câu hỏi đã sử dụng trong phiên"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Làm mới phiên</span>
          </button>

          {/* Close Game Screen */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 transition-colors cursor-pointer"
            title="Đóng Ô Cửa Bí Mật"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MAIN GAME CONTAINER */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-7xl mx-auto w-full">
        {/* ========================================================= */}
        {/* PHASE 1: CONFIGURATION (CHỌN MỨC ĐỘ & SỐ Ô) */}
        {/* ========================================================= */}
        {gamePhase === 'CONFIG' && (
          <div className="w-full max-w-2xl bg-slate-900/90 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in">
            <div className="text-center space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center justify-center gap-2">
                <span>THIẾT LẬP LƯỢT CHƠI</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Thầy cô chọn mức độ phù hợp và số lượng ô cửa bí mật cho học sinh
              </p>
            </div>

            {/* 1. CHỌN MỨC ĐỘ: [CƠ BẢN] / [NÂNG CAO] */}
            <div className="space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-amber-400">
                1. CHỌN MỨC ĐỘ CÂU HỎI:
              </label>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Option Basic */}
                <button
                  type="button"
                  onClick={() => setLevel('basic')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                    level === 'basic'
                      ? 'bg-sky-950/70 border-sky-400 text-sky-100 shadow-lg shadow-sky-500/20 ring-1 ring-sky-400'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="font-extrabold text-sm sm:text-base text-sky-300 flex items-center justify-between mb-1">
                    <span>📘 CƠ BẢN</span>
                    {level === 'basic' && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                    Nhận biết, nhớ công thức, củng cố nền tảng.
                  </p>
                  <div className="text-xs font-mono font-bold text-sky-400 bg-sky-950/90 px-2.5 py-1 rounded-xl border border-sky-500/30">
                    {availableCounts.basic} câu khả dụng{' '}
                    <span className="text-[10px] text-slate-400">
                      ({availableCounts.totalBasic - availableCounts.basic} đã dùng)
                    </span>
                  </div>
                </button>

                {/* Option Advanced */}
                <button
                  type="button"
                  onClick={() => setLevel('advanced')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                    level === 'advanced'
                      ? 'bg-purple-950/70 border-purple-400 text-purple-100 shadow-lg shadow-purple-500/20 ring-1 ring-purple-400'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="font-extrabold text-sm sm:text-base text-purple-300 flex items-center justify-between mb-1">
                    <span>🚀 NÂNG CAO</span>
                    {level === 'advanced' && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                    Vận dụng, 2-3 bước lập luận logic, thông hiểu sâu.
                  </p>
                  <div className="text-xs font-mono font-bold text-purple-400 bg-purple-950/90 px-2.5 py-1 rounded-xl border border-purple-500/30">
                    {availableCounts.advanced} câu khả dụng{' '}
                    <span className="text-[10px] text-slate-400">
                      ({availableCounts.totalAdvanced - availableCounts.advanced} đã dùng)
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. CHỌN SỐ Ô BÍ MẬT: [2] [4] [6] [8] [10] */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-amber-400">
                  2. SỐ Ô BÍ MẬT:
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  (Chỉ khả dụng khi số câu còn lại &gt;= số ô)
                </span>
              </div>

              {currentAvailableCount === 0 ? (
                <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-4 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-rose-300 font-bold text-xs sm:text-sm">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>
                      Đã sử dụng hết câu {level === 'basic' ? 'Cơ bản' : 'Nâng cao'} của bài này trong phiên hiện tại!
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    {level === 'basic' && availableCounts.advanced > 0 && (
                      <button
                        type="button"
                        onClick={() => setLevel('advanced')}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        Đổi sang Nâng cao ({availableCounts.advanced} câu)
                      </button>
                    )}
                    {level === 'advanced' && availableCounts.basic > 0 && (
                      <button
                        type="button"
                        onClick={() => setLevel('basic')}
                        className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        Đổi sang Cơ bản ({availableCounts.basic} câu)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsResetConfirmOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-500/30 transition-colors cursor-pointer"
                    >
                      Làm mới phiên
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2 sm:gap-3">
                  {[2, 4, 6, 8, 10].map((countOption) => {
                    const isEnabled = currentAvailableCount >= countOption;
                    const isSelected = doorCount === countOption && isEnabled;

                    return (
                      <button
                        key={countOption}
                        type="button"
                        disabled={!isEnabled}
                        onClick={() => setDoorCount(countOption)}
                        className={`py-3 rounded-2xl font-black text-sm sm:text-base transition-all flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-orange-500/30 scale-105'
                            : isEnabled
                            ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-amber-500/50 cursor-pointer'
                            : 'bg-slate-900/60 text-slate-600 border border-slate-800/80 cursor-not-allowed opacity-40'
                        }`}
                      >
                        <span>{countOption} ô</span>
                        {!isEnabled && (
                          <span className="text-[9px] font-normal text-slate-500">
                            (thiếu câu)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Start Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={currentAvailableCount < doorCount || currentAvailableCount === 0}
                onClick={handleStartRound}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-450 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-base shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 transition-all hover:scale-102 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>
                  BẮT ĐẦU MỞ {doorCount} Ô CỬA ({level === 'basic' ? 'CƠ BẢN' : 'NÂNG CAO'})
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PHASE 2: MYSTERY DOORS GRID (HỌC SINH CHỌN 1 Ô) */}
        {/* ========================================================= */}
        {gamePhase === 'GRID' && (
          <div className="w-full space-y-6 flex flex-col items-center justify-center animate-fade-in">
            {/* Top Round Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 w-full max-w-5xl bg-slate-900/80 border border-slate-800 px-4 py-2.5 rounded-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    level === 'basic'
                      ? 'bg-sky-950 text-sky-300 border border-sky-500/40'
                      : 'bg-purple-950 text-purple-300 border border-purple-500/40'
                  }`}
                >
                  {level === 'basic' ? 'Mức: CƠ BẢN' : 'Mức: NÂNG CAO'}
                </span>
                <span className="text-xs text-slate-400">
                  {student
                    ? `Học sinh: ${student.name} - Chọn 1 ô bí mật`
                    : 'Học sinh chọn 1 ô bí mật bất kỳ'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleNewRound}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Đổi số ô / mức độ</span>
                </button>
              </div>
            </div>

            {/* Congratulations Banner if ALL DOORS are opened */}
            {areAllDoorsOpened && (
              <div className="w-full max-w-3xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-emerald-950/60 border-2 border-amber-500/50 rounded-3xl p-6 text-center space-y-3 shadow-2xl animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
                  <Trophy className="w-8 h-8" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-amber-300">
                  🎉 Đã Mở Toàn Bộ {doors.length} Ô Cửa Trong Ván Này!
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  Thầy cô có thể tiếp tục tạo ván mới với các câu hỏi chưa sử dụng hoặc làm mới lại phiên chơi.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleNewRound}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
                  >
                    Bắt đầu ván mới
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsResetConfirmOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
                  >
                    Làm mới phiên
                  </button>
                </div>
              </div>
            )}

            {/* The Mystery Doors Grid */}
            <MysteryDoorGrid
              doors={doors}
              onSelectDoor={handleSelectDoor}
              disabled={areAllDoorsOpened}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* PHASE 3: QUESTION CARD (XEM CÂU HỎI & TRẢ LỜI & CHẤM ĐIỂM) */}
        {/* ========================================================= */}
        {gamePhase === 'QUESTION' && selectedDoor && (
          <div className="w-full flex justify-center animate-fade-in">
            <MysteryQuestionCard
              doorNumber={selectedDoor.doorNumber}
              question={selectedDoor.question}
              level={level}
              student={student}
              className={className}
              onReturnToGrid={handleReturnToGrid}
              onSaveHistoryScore={onSaveHistoryScore}
              onSaveTxScore={onSaveTxScore}
            />
          </div>
        )}
      </main>

      {/* CONFIRM RESET SESSION MODAL */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-slate-100">
                Làm Mới Phiên Chơi?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tất cả các câu hỏi đã dùng trong bài này sẽ được mở lại từ đầu. Ngân hàng câu hỏi gốc không bị thay đổi.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmResetSession}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors cursor-pointer"
              >
                Xác nhận làm mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
