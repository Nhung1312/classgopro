import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  X,
  Dices,
  Sparkles,
  Users,
  BookOpen,
  Clock,
  Zap,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Edit2,
  Trash2,
} from 'lucide-react';
import { ClassRoom, ReviewQuestionBank } from '../../types';
import {
  ArenaMatchSettings,
  ArenaQuestion,
  ArenaTeamPreset,
} from '../../types/arenaTypes';
import {
  ARENA_TEAM_PRESETS,
  ARENA_MASCOTS,
  getRandomTeamPreset,
} from './arenaData';
import { ArenaMascot } from './ArenaMascot';
import {
  loadArenaQuestionsFromBank,
  createQuickArenaQuestion,
  SAMPLE_ARENA_QUESTIONS,
  QuestionValidationResult,
} from './arenaQuestionService';
import { loadQuestionBanks } from '../../services/reviewQuestionService';
import { soundEngine } from '../../utils/audio';
import { MathRenderer } from '../MathRenderer';

interface ArenaSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassRoom[];
  activeClassId?: string;
  ownerId?: string;
  onStartMatch: (
    team1: { name: string; mascotId: string; color: string },
    team2: { name: string; mascotId: string; color: string },
    questions: ArenaQuestion[],
    settings: ArenaMatchSettings
  ) => void;
}

// Validate a repaired bank question without guessing its correct answer.
function isCompleteRepairedQuestion(
  stem: string,
  options: { A: string; B: string; C: string; D: string },
  key: unknown
): key is ArenaQuestion['correctKey'] {
  return typeof stem === 'string' && !!stem.trim()
    && (['A', 'B', 'C', 'D'] as const).every((option) =>
      typeof options[option] === 'string' && !!options[option].trim())
    && (['A', 'B', 'C', 'D'] as const).some((option) => option === key);
}

export const ArenaSetupModal: React.FC<ArenaSetupModalProps> = ({
  isOpen,
  onClose,
  classes,
  activeClassId,
  ownerId,
  onStartMatch,
}) => {
  // --- 1. Class Selection ---
  const [selectedClassId, setSelectedClassId] = useState<string>(activeClassId || 'FREE_PLAY');

  // --- 2. Team Naming & Mascot ---
  const [namingMode, setNamingMode] = useState<'PRESET' | 'LOTTERY' | 'CUSTOM'>('PRESET');
  const [selectedPreset, setSelectedPreset] = useState<ArenaTeamPreset>(() => ARENA_TEAM_PRESETS[0]);
  const [isLotterySpinning, setIsLotterySpinning] = useState(false);
  const [customTeam1Name, setCustomTeam1Name] = useState(selectedPreset.team1.name);
  const [customTeam2Name, setCustomTeam2Name] = useState(selectedPreset.team2.name);
  const [customTeam1Mascot, setCustomTeam1Mascot] = useState(selectedPreset.team1.mascotId);
  const [customTeam2Mascot, setCustomTeam2Mascot] = useState(selectedPreset.team2.mascotId);

  // --- 3. Question Bank Selection ---
  const [banks, setBanks] = useState<ReviewQuestionBank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>('SAMPLE');
  const [bankSubject, setBankSubject] = useState<string>('ALL');
  const [bankGrade, setBankGrade] = useState<string>('ALL');
  const [selectedQuestions, setSelectedQuestions] = useState<ArenaQuestion[]>(SAMPLE_ARENA_QUESTIONS);
  const [invalidQuestions, setInvalidQuestions] = useState<QuestionValidationResult[]>([]);
  const [showQuestionFixModal, setShowQuestionFixModal] = useState<QuestionValidationResult | null>(null);

  // Quick custom question adding
  const [isAddingQuickQuestion, setIsAddingQuickQuestion] = useState(false);
  const [quickStem, setQuickStem] = useState('');
  const [quickOptA, setQuickOptA] = useState('');
  const [quickOptB, setQuickOptB] = useState('');
  const [quickOptC, setQuickOptC] = useState('');
  const [quickOptD, setQuickOptD] = useState('');
  const [quickCorrectKey, setQuickCorrectKey] = useState<'A' | 'B' | 'C' | 'D'>('A');

  // --- 4. Game Configuration ---
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(30); // 0 = unlimited
  const [speedBonus, setSpeedBonus] = useState<boolean>(false);
  const [doubleFinalQuestion, setDoubleFinalQuestion] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [autoReveal, setAutoReveal] = useState<boolean>(true);
  const [showMascots, setShowMascots] = useState<boolean>(true);

  // Load banks on open
  useEffect(() => {
    if (isOpen) {
      const bList = loadQuestionBanks(ownerId);
      setBanks(bList);
    }
  }, [isOpen, ownerId]);

  // Load questions when selectedBankId changes
  useEffect(() => {
    if (selectedBankId === 'SAMPLE') {
      setSelectedQuestions(SAMPLE_ARENA_QUESTIONS);
      setInvalidQuestions([]);
      return;
    }

    const bank = banks.find((b) => b.id === selectedBankId);
    if (bank) {
      const { validQuestions, invalidQuestions: invalid } = loadArenaQuestionsFromBank(
        bank.id,
        ownerId,
        bank
      );
      setSelectedQuestions(validQuestions);
      setInvalidQuestions(invalid);
    }
  }, [selectedBankId, banks, ownerId]);

  // Sync custom names if preset changes
  useEffect(() => {
    setCustomTeam1Name(selectedPreset.team1.name);
    setCustomTeam2Name(selectedPreset.team2.name);
    setCustomTeam1Mascot(selectedPreset.team1.mascotId);
    setCustomTeam2Mascot(selectedPreset.team2.mascotId);
  }, [selectedPreset]);

  // Filtered banks for bank selector
  const filteredBanks = useMemo(() => {
    return banks.filter((b) => {
      if (bankSubject !== 'ALL' && b.subject !== bankSubject) return false;
      if (bankGrade !== 'ALL' && String(b.grade) !== bankGrade) return false;
      return true;
    });
  }, [banks, bankSubject, bankGrade]);

  const availableSubjects = useMemo(() => {
    const list = Array.from(new Set(banks.map((b) => b.subject).filter(Boolean)));
    return list.sort();
  }, [banks]);

  // Lottery draw (Bốc thăm tên đội)
  const handleLotteryDraw = () => {
    if (isLotterySpinning) return;
    setIsLotterySpinning(true);
    setNamingMode('LOTTERY');
    if (soundEnabled) soundEngine.playWhoosh();

    let counter = 0;
    const interval = setInterval(() => {
      counter++;
      const randomPreset = getRandomTeamPreset(selectedPreset.id);
      setSelectedPreset(randomPreset);
      if (soundEnabled) soundEngine.playTick(1.2 + (counter % 3) * 0.2);

      if (counter >= 12) {
        clearInterval(interval);
        setIsLotterySpinning(false);
        if (soundEnabled) soundEngine.playSuccess();
      }
    }, 70);
  };

  // Add quick question
  const handleSaveQuickQuestion = () => {
    if (!quickStem.trim() || !quickOptA.trim() || !quickOptB.trim() || !quickOptC.trim() || !quickOptD.trim()) {
      alert('Vui lòng nhập đầy đủ câu hỏi và 4 đáp án A, B, C, D.');
      return;
    }
    const q = createQuickArenaQuestion(
      quickStem,
      { A: quickOptA, B: quickOptB, C: quickOptC, D: quickOptD },
      quickCorrectKey
    );
    setSelectedQuestions((prev) => [q, ...prev]);
    setIsAddingQuickQuestion(false);
    setQuickStem('');
    setQuickOptA('');
    setQuickOptB('');
    setQuickOptC('');
    setQuickOptD('');
    setQuickCorrectKey('A');
    if (soundEnabled) soundEngine.playSuccess();
  };

  // Fix invalid question from bank
  const handleFixInvalidQuestion = (
    fixedStem: string,
    fixedOptions: { A: string; B: string; C: string; D: string },
    fixedKey: 'A' | 'B' | 'C' | 'D'
  ) => {
    if (!showQuestionFixModal) return;
    if (!isCompleteRepairedQuestion(fixedStem, fixedOptions, fixedKey)) {
      alert('Vui lòng nhập nội dung câu hỏi, đủ 4 phương án A–D và chọn đáp án đúng hợp lệ.');
      return;
    }
    const fixedQ: ArenaQuestion = {
      ...showQuestionFixModal.question,
      stem: fixedStem.trim(),
      options: [
        { key: 'A', text: fixedOptions.A.trim() },
        { key: 'B', text: fixedOptions.B.trim() },
        { key: 'C', text: fixedOptions.C.trim() },
        { key: 'D', text: fixedOptions.D.trim() },
      ],
      correctKey: fixedKey,
    };
    setSelectedQuestions((prev) => [fixedQ, ...prev]);
    setInvalidQuestions((prev) => prev.filter((item) => item.question.id !== fixedQ.id));
    setShowQuestionFixModal(null);
    if (soundEnabled) soundEngine.playSuccess();
  };

  // Final validation before launch
  const handleLaunchArena = () => {
    if (selectedQuestions.length === 0) {
      alert('Vui lòng chọn ít nhất 1 câu hỏi hợp lệ để bắt đầu.');
      return;
    }

    // Determine final questions to play (sliced to questionCount)
    const count = Math.min(questionCount, selectedQuestions.length);
    const questionsToPlay = selectedQuestions.slice(0, count);

    // Final team info
    const finalTeam1 = {
      name: (namingMode === 'CUSTOM' ? customTeam1Name : selectedPreset.team1.name).trim() || 'Đội 1',
      mascotId: namingMode === 'CUSTOM' ? customTeam1Mascot : selectedPreset.team1.mascotId,
      color: selectedPreset.team1.color,
    };

    const finalTeam2 = {
      name: (namingMode === 'CUSTOM' ? customTeam2Name : selectedPreset.team2.name).trim() || 'Đội 2',
      mascotId: namingMode === 'CUSTOM' ? customTeam2Mascot : selectedPreset.team2.mascotId,
      color: selectedPreset.team2.color,
    };

    const matchSettings: ArenaMatchSettings = {
      questionCount: count,
      timePerQuestion,
      basePoints: 10,
      speedBonus,
      speedBonusPoints: 5,
      doubleFinalQuestion,
      soundEnabled,
      reducedMotion,
      autoReveal,
      showMascots,
      classId: selectedClassId === 'FREE_PLAY' ? undefined : selectedClassId,
      className: classes.find((c) => c.id === selectedClassId)?.name,
    };

    if (soundEnabled) soundEngine.playVictoryFanfare();
    onStartMatch(finalTeam1, finalTeam2, questionsToPlay, matchSettings);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden text-xs my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/25">
              <Trophy className="w-6 h-6 text-yellow-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  CLASSGO ARENA
                </span>
                <span className="text-slate-400 text-[11px] font-semibold">Bảng tương tác 2 đội</span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>🏆 ĐẤU TRƯỜNG KIẾN THỨC</span>
                <span className="hidden sm:inline text-xs font-normal text-amber-200/80 italic">
                  – Hai đội tranh tài, kiến thức tỏa sáng!
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Đóng thiết lập"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Section 1: Team Names & Mascots */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 font-black flex items-center justify-center text-xs border border-amber-500/30">
                  1
                </span>
                <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-tight">
                  TÊN VÀ LINH VẬT HAI ĐỘI TRANH TÀI
                </h3>
              </div>

              {/* Mode switch: Preset vs Lottery vs Custom */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setNamingMode('PRESET')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    namingMode === 'PRESET'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Chọn mẫu ({ARENA_TEAM_PRESETS.length})
                </button>
                <button
                  type="button"
                  onClick={handleLotteryDraw}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    namingMode === 'LOTTERY'
                      ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm'
                      : 'text-orange-400 hover:bg-orange-950/40'
                  }`}
                  title="Bốc thăm ngẫu nhiên một cặp tên vui nhộn"
                >
                  <Dices className={`w-3.5 h-3.5 ${isLotterySpinning ? 'animate-spin' : ''}`} />
                  <span>🎲 BỐC THĂM</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNamingMode('CUSTOM')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    namingMode === 'CUSTOM'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tự đặt tên
                </button>
              </div>
            </div>

            {/* Visual Team Cards Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
              {/* Center VS Badge */}
              <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-slate-900 border-2 border-amber-400 text-amber-300 font-black items-center justify-center text-xs shadow-xl shadow-amber-500/20">
                VS
              </div>

              {/* Team 1 (Left / Red-Orange) */}
              <div className="bg-gradient-to-br from-orange-950/40 to-slate-900/90 border border-orange-500/40 rounded-2xl p-4 flex items-center gap-4 shadow-md transition-all">
                {showMascots && (
                  <ArenaMascot
                    mascotId={namingMode === 'CUSTOM' ? customTeam1Mascot : selectedPreset.team1.mascotId}
                    size="lg"
                    showBadge={false}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wider text-orange-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                    <span>ĐỘI 1 (BÊN TRÁI SÂN KHẤU)</span>
                  </div>
                  {namingMode === 'CUSTOM' ? (
                    <input
                      type="text"
                      value={customTeam1Name}
                      onChange={(e) => setCustomTeam1Name(e.target.value)}
                      placeholder="Nhập tên Đội 1..."
                      className="mt-1 w-full bg-slate-900 border border-orange-500/50 rounded-xl px-3 py-1.5 text-base font-black text-orange-200 focus:outline-none focus:border-orange-400"
                    />
                  ) : (
                    <h4 className="text-lg font-black text-white truncate mt-0.5">
                      {selectedPreset.team1.name}
                    </h4>
                  )}
                  <div className="text-[11px] text-orange-300/80 font-medium truncate mt-0.5">
                    Linh vật: {ARENA_MASCOTS[namingMode === 'CUSTOM' ? customTeam1Mascot : selectedPreset.team1.mascotId]?.name}
                  </div>
                </div>
              </div>

              {/* Team 2 (Right / Cyan-Blue) */}
              <div className="bg-gradient-to-br from-cyan-950/40 to-slate-900/90 border border-cyan-500/40 rounded-2xl p-4 flex items-center gap-4 shadow-md transition-all">
                {showMascots && (
                  <ArenaMascot
                    mascotId={namingMode === 'CUSTOM' ? customTeam2Mascot : selectedPreset.team2.mascotId}
                    size="lg"
                    showBadge={false}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>ĐỘI 2 (BÊN PHẢI SÂN KHẤU)</span>
                  </div>
                  {namingMode === 'CUSTOM' ? (
                    <input
                      type="text"
                      value={customTeam2Name}
                      onChange={(e) => setCustomTeam2Name(e.target.value)}
                      placeholder="Nhập tên Đội 2..."
                      className="mt-1 w-full bg-slate-900 border border-cyan-500/50 rounded-xl px-3 py-1.5 text-base font-black text-cyan-200 focus:outline-none focus:border-cyan-400"
                    />
                  ) : (
                    <h4 className="text-lg font-black text-white truncate mt-0.5">
                      {selectedPreset.team2.name}
                    </h4>
                  )}
                  <div className="text-[11px] text-cyan-300/80 font-medium truncate mt-0.5">
                    Linh vật: {ARENA_MASCOTS[namingMode === 'CUSTOM' ? customTeam2Mascot : selectedPreset.team2.mascotId]?.name}
                  </div>
                </div>
              </div>
            </div>

            {/* Preset Selector Dropdown if in PRESET mode */}
            {namingMode === 'PRESET' && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-slate-400 font-semibold shrink-0">Chọn cặp tên mẫu:</span>
                <select
                  value={selectedPreset.id}
                  onChange={(e) => {
                    const found = ARENA_TEAM_PRESETS.find((p) => p.id === e.target.value);
                    if (found) {
                      setSelectedPreset(found);
                      if (soundEnabled) soundEngine.playTick(1.1);
                    }
                  }}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-amber-500 truncate"
                >
                  {ARENA_TEAM_PRESETS.map((p, idx) => (
                    <option key={p.id} value={p.id}>
                      {idx + 1}. {p.pairLabel}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleLotteryDraw}
                  className="px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black flex items-center gap-1 shadow-md transition-all shrink-0 cursor-pointer"
                  title="Nhấn để bốc thăm ngẫu nhiên"
                >
                  <Dices className="w-4 h-4" />
                  <span className="hidden sm:inline">Bốc thăm</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Class & Question Source */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 font-black flex items-center justify-center text-xs border border-indigo-500/30">
                  2
                </span>
                <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-tight">
                  CHỌN LỚP HỌC & CÂU HỎI THI ĐẤU
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingQuickQuestion(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm câu hỏi nhanh</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Lớp học */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">Lớp học tham gia:</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-bold focus:outline-none focus:border-indigo-500"
                >
                  <option value="FREE_PLAY">🎮 Chơi tự do (Giao lưu không chọn lớp)</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      📚 Lớp {cls.name} ({cls.students.length} HS)
                    </option>
                  ))}
                </select>
              </div>

              {/* Môn lọc */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">Lọc môn học:</label>
                <select
                  value={bankSubject}
                  onChange={(e) => setBankSubject(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-bold focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">Tất cả môn</option>
                  {availableSubjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Khối lớp */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">Khối lớp:</label>
                <select
                  value={bankGrade}
                  onChange={(e) => setBankGrade(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-bold focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">Tất cả khối</option>
                  {['6', '7', '8', '9', '10', '11', '12'].map((g) => (
                    <option key={g} value={g}>
                      Khối {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Question Bank Picker */}
            <div>
              <label className="block text-slate-400 font-bold mb-1">
                Kho kiểm tra bài cũ ({filteredBanks.length} bài học):
              </label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-bold focus:outline-none focus:border-indigo-500"
              >
                <option value="SAMPLE">⭐ Bộ câu hỏi mẫu chuẩn THCS (5 câu Toán học - KaTeX)</option>
                {filteredBanks.map((b) => (
                  <option key={b.id} value={b.id}>
                    [{b.subject} {b.grade}] {b.sectionName ? `${b.sectionName} - ` : ''}{b.lessonName}
                  </option>
                ))}
              </select>
            </div>

            {/* Questions Validation & List */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-300">
                  Danh sách câu hỏi sẵn sàng ({selectedQuestions.length} câu hợp lệ):
                </span>
                {invalidQuestions.length > 0 && (
                  <span className="text-amber-400 font-bold flex items-center gap-1 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-500/40">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{invalidQuestions.length} câu cần bổ sung đáp án</span>
                  </span>
                )}
              </div>

              {/* Warning box if invalid questions found */}
              {invalidQuestions.length > 0 && (
                <div className="p-3 bg-amber-950/50 border border-amber-500/50 rounded-xl text-amber-200 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-black text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>LƯU Ý QUY CHUẨN ĐẤU TRƯỜNG:</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    Có {invalidQuestions.length} câu hỏi trong kho chưa có 4 phương án trắc nghiệm A, B, C, D hoặc chưa xác định đáp án đúng. Hệ thống tuyệt đối KHÔNG tự ý chọn đáp án A. Thầy cô có thể nhấn <strong>"Bổ sung đáp án"</strong> bên dưới để dùng cho trận đấu.
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                    {invalidQuestions.map((inv) => (
                      <div
                        key={inv.question.id}
                        className="bg-slate-900/80 p-2 rounded-lg border border-amber-500/30 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="truncate flex-1">
                          <span className="font-bold text-slate-300">{inv.question.stem || inv.rawQuestion?.question}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowQuestionFixModal(inv)}
                          className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-black text-[11px] hover:bg-amber-400 shrink-0 cursor-pointer"
                        >
                          Bổ sung đáp án
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Questions Preview List (Compact) */}
              <div className="max-h-44 overflow-y-auto space-y-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                {selectedQuestions.length === 0 ? (
                  <p className="text-center py-4 text-slate-500">
                    Chưa có câu hỏi hợp lệ nào trong bài học này. Vui lòng chọn bài khác hoặc bấm "Thêm câu hỏi nhanh".
                  </p>
                ) : (
                  selectedQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 font-black text-[10px] flex items-center justify-center border border-indigo-500/40">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-200">
                            <MathRenderer text={q.stem} />
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pl-7 text-[11px]">
                          {q.options.map((opt) => (
                            <span
                              key={opt.key}
                              className={`px-2 py-0.5 rounded border truncate ${
                                opt.key === q.correctKey
                                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400'
                              }`}
                            >
                              <strong>{opt.key}.</strong> <MathRenderer text={opt.text} />
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-black border border-emerald-500/40 text-[10px]">
                          Đúng: {q.correctKey}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedQuestions((prev) => prev.filter((item) => item.id !== q.id))}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Bỏ câu này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Match Rules & Settings */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 font-black flex items-center justify-center text-xs border border-emerald-500/30">
                3
              </span>
              <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-tight">
                LUẬT THI ĐẤU & ĐIỀU KHIỂN GAMESHOW
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Số câu thi đấu */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">Số câu thi đấu:</label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value={3}>3 câu (Khởi động)</option>
                  <option value={5}>5 câu (Chuẩn)</option>
                  <option value={10}>10 câu (Gameshow)</option>
                  <option value={15}>15 câu (Đầy đủ)</option>
                  <option value={20}>20 câu (Toàn diện)</option>
                </select>
              </div>

              {/* Thời gian đếm ngược */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">Thời gian / câu:</label>
                <select
                  value={timePerQuestion}
                  onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value={15}>15 giây (Nhanh)</option>
                  <option value={20}>20 giây</option>
                  <option value={30}>30 giây (Khuyên dùng)</option>
                  <option value={45}>45 giây</option>
                  <option value={60}>60 giây (Tính toán)</option>
                  <option value={0}>Không giới hạn</option>
                </select>
              </div>

              {/* Thưởng tốc độ */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">Thưởng tốc độ (+5đ):</label>
                <button
                  type="button"
                  onClick={() => setSpeedBonus(!speedBonus)}
                  className={`w-full py-2 px-3 rounded-xl font-bold border transition-all text-left flex items-center justify-between ${
                    speedBonus
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-black'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  <span>{speedBonus ? '⚡ BẬT' : 'TẮT'}</span>
                  <Zap className={`w-3.5 h-3.5 ${speedBonus ? 'text-amber-400' : 'text-slate-600'}`} />
                </button>
              </div>

              {/* Nhân đôi câu cuối */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">Nhân đôi câu cuối (x2):</label>
                <button
                  type="button"
                  onClick={() => setDoubleFinalQuestion(!doubleFinalQuestion)}
                  className={`w-full py-2 px-3 rounded-xl font-bold border transition-all text-left flex items-center justify-between ${
                    doubleFinalQuestion
                      ? 'bg-indigo-500/20 border-indigo-500/60 text-indigo-300 font-black'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  <span>{doubleFinalQuestion ? '🔥 BẬT' : 'TẮT'}</span>
                  <Trophy className={`w-3.5 h-3.5 ${doubleFinalQuestion ? 'text-indigo-400' : 'text-slate-600'}`} />
                </button>
              </div>
            </div>

            {/* Additional Switches */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-300 border-t border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-0"
                />
                <span>🔊 Âm thanh gameshow</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMascots}
                  onChange={(e) => setShowMascots(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-0"
                />
                <span>🐾 Hiển thị linh vật</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoReveal}
                  onChange={(e) => setAutoReveal(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-0"
                />
                <span>🎯 Tự động công bố khi cả 2 đội chốt</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-0"
                />
                <span>🌿 Giảm hiệu ứng chuyển động</span>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer with Start Button */}
        <div className="p-4 sm:p-5 border-t border-slate-800 flex items-center justify-between bg-slate-900/95 flex-shrink-0">
          <div className="text-[11px] text-slate-400 hidden sm:block">
            <span>Sẵn sàng: </span>
            <strong className="text-amber-300">{Math.min(questionCount, selectedQuestions.length)} câu</strong>
            <span> • </span>
            <strong className="text-orange-400">
              {namingMode === 'CUSTOM' ? customTeam1Name : selectedPreset.team1.name}
            </strong>
            <span> vs </span>
            <strong className="text-cyan-400">
              {namingMode === 'CUSTOM' ? customTeam2Name : selectedPreset.team2.name}
            </strong>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleLaunchArena}
              disabled={selectedQuestions.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-sm shadow-xl shadow-orange-500/30 flex items-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              <span>🚀 BẮT ĐẦU ĐẤU TRƯỜNG</span>
            </button>
          </div>
        </div>

        {/* --- Quick Question Add Submodal --- */}
        {isAddingQuickQuestion && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/90 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="font-black text-sm text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>THÊM CÂU HỎI NHANH CHO ĐẤU TRƯỜNG</span>
                </h4>
                <button
                  onClick={() => setIsAddingQuickQuestion(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Nội dung câu hỏi (hỗ trợ KaTeX $...$):</label>
                  <textarea
                    rows={2}
                    value={quickStem}
                    onChange={(e) => setQuickStem(e.target.value)}
                    placeholder="Ví dụ: Phép tính $\frac{1}{2} + \frac{1}{3}$ bằng bao nhiêu?"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Phương án A:</label>
                    <input
                      type="text"
                      value={quickOptA}
                      onChange={(e) => setQuickOptA(e.target.value)}
                      placeholder="Đáp án A"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Phương án B:</label>
                    <input
                      type="text"
                      value={quickOptB}
                      onChange={(e) => setQuickOptB(e.target.value)}
                      placeholder="Đáp án B"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Phương án C:</label>
                    <input
                      type="text"
                      value={quickOptC}
                      onChange={(e) => setQuickOptC(e.target.value)}
                      placeholder="Đáp án C"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Phương án D:</label>
                    <input
                      type="text"
                      value={quickOptD}
                      onChange={(e) => setQuickOptD(e.target.value)}
                      placeholder="Đáp án D"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Đáp án đúng chính thức:</label>
                  <div className="flex items-center gap-2">
                    {(['A', 'B', 'C', 'D'] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setQuickCorrectKey(k)}
                        className={`flex-1 py-1.5 rounded-xl font-black text-sm border transition-all ${
                          quickCorrectKey === k
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingQuickQuestion(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickQuestion}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md"
                >
                  Lưu vào trận đấu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- Fix Invalid Question Submodal --- */}
        {showQuestionFixModal && (
          <FixQuestionSubmodal
            item={showQuestionFixModal}
            onClose={() => setShowQuestionFixModal(null)}
            onSave={handleFixInvalidQuestion}
          />
        )}
      </div>
    </div>
  );
};

// Subcomponent to quickly edit and add choices to an invalid question from the bank
interface FixQuestionSubmodalProps {
  item: QuestionValidationResult;
  onClose: () => void;
  onSave: (
    stem: string,
    options: { A: string; B: string; C: string; D: string },
    key: 'A' | 'B' | 'C' | 'D'
  ) => void;
}

const FixQuestionSubmodal: React.FC<FixQuestionSubmodalProps> = ({ item, onClose, onSave }) => {
  const [stem, setStem] = useState(item.question.stem || item.rawQuestion?.question || '');
  const [optA, setOptA] = useState(item.question.options.find((option) => option.key === 'A')?.text || '');
  const [optB, setOptB] = useState(item.question.options.find((option) => option.key === 'B')?.text || '');
  const [optC, setOptC] = useState(item.question.options.find((option) => option.key === 'C')?.text || '');
  const [optD, setOptD] = useState(item.question.options.find((option) => option.key === 'D')?.text || '');
  // An invalid bank question may contain a placeholder 'A'; require a deliberate choice.
  const [key, setKey] = useState<ArenaQuestion['correctKey'] | null>(null);

  const repairedOptions = { A: optA, B: optB, C: optC, D: optD };
  const canConfirm = isCompleteRepairedQuestion(stem, repairedOptions, key);
  const handleConfirm = () => {
    if (!isCompleteRepairedQuestion(stem, repairedOptions, key)) {
      alert('Vui lòng nhập nội dung câu hỏi, đủ 4 phương án A–D và chọn đáp án đúng.');
      return;
    }
    onSave(stem, repairedOptions, key);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/90 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-amber-500/50 rounded-2xl w-full max-w-xl p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h4 className="font-black text-sm text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>BỔ SUNG 4 ĐÁP ÁN CHO CÂU HỎI TỪ KHO</span>
          </h4>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 font-bold mb-1">Nội dung câu hỏi:</label>
            <textarea
              rows={2}
              value={stem}
              onChange={(e) => setStem(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 text-xs focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 font-bold mb-1">Đáp án A:</label>
              <input
                type="text"
                value={optA}
                onChange={(e) => setOptA(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-100 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Đáp án B:</label>
              <input
                type="text"
                value={optB}
                onChange={(e) => setOptB(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-100 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Đáp án C:</label>
              <input
                type="text"
                value={optC}
                onChange={(e) => setOptC(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-100 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Đáp án D:</label>
              <input
                type="text"
                value={optD}
                onChange={(e) => setOptD(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-100 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-amber-300 font-bold mb-1">Chọn đáp án đúng:</label>
            <div className="flex items-center gap-2">
              {(['A', 'B', 'C', 'D'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKey(k)}
                  className={`flex-1 py-1.5 rounded-xl font-black text-sm border transition-all ${
                    key === k
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            Xác nhận & Sử dụng
          </button>
        </div>
      </div>
    </div>
  );
};
