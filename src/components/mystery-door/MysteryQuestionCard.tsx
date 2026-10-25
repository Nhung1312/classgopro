import React, { useState } from 'react';
import { ReviewQuestion, ReviewQuestionLevel, Student } from '../../types';
import { MathRenderer } from '../MathRenderer';
import { parseQuestionChoices, ParsedOption } from '../../utils/questionParser';
import { findFirstAvailableTxSlot, TxColumn } from '../../utils/quickScoreHelper';
import { soundEngine } from '../../utils/audio';
import {
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  BookOpen,
  User,
  AlertTriangle,
  FileCheck2,
  Check,
} from 'lucide-react';

interface MysteryQuestionCardProps {
  doorNumber: number;
  question: ReviewQuestion;
  level: ReviewQuestionLevel;
  student?: Student | null;
  className?: string;
  onReturnToGrid: () => void;
  onSaveHistoryScore?: (score: string, note?: string, questionContent?: string) => void;
  onSaveTxScore?: (score: number, slot: TxColumn, note?: string, questionContent?: string) => Promise<boolean> | boolean;
}

export const MysteryQuestionCard: React.FC<MysteryQuestionCardProps> = ({
  doorNumber,
  question,
  level,
  student,
  className,
  onReturnToGrid,
  onSaveHistoryScore,
  onSaveTxScore,
}) => {
  const isBasic = level === 'basic';

  // Parse question to detect MCQ vs Essay
  const parsed = parseQuestionChoices(question.question, question.answer);

  // Student MCQ answer state
  const [selectedOptionKey, setSelectedOptionKey] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [isCheckedAnswer, setIsCheckedAnswer] = useState<boolean>(false);

  // Essay answer visibility state
  const [showEssayAnswer, setShowEssayAnswer] = useState<boolean>(false);

  // Teacher Evaluation States
  const [scoreInput, setScoreInput] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // Confirmation modal for writing to Sổ điểm TX
  const [pendingTxConfirm, setPendingTxConfirm] = useState<{
    numericScore: number;
    slot: TxColumn;
  } | null>(null);

  // Warning modal when TX slots are all full
  const [txFullWarningOpen, setTxFullWarningOpen] = useState(false);

  const handleSelectOption = (key: 'A' | 'B' | 'C' | 'D') => {
    if (isCheckedAnswer) return; // Locked once verified
    setSelectedOptionKey(key);
    soundEngine.playTick(1.3);
  };

  const handleCheckAnswer = () => {
    setIsCheckedAnswer(true);
    if (parsed.correctKey && selectedOptionKey) {
      if (selectedOptionKey === parsed.correctKey) {
        soundEngine.playSuccess();
        // Pre-fill score 10 for correct MCQ
        if (!scoreInput) setScoreInput('10');
      } else {
        soundEngine.playTick(0.8);
      }
    } else {
      soundEngine.playTick(1.2);
    }
  };

  // Helper: Save score ONLY to history
  const handleSaveToHistoryOnly = () => {
    if (!student) {
      setFeedbackNotice({
        type: 'warning',
        message: 'Lưu vào lịch sử áp dụng khi có học sinh được chọn.',
      });
      return;
    }

    const trimmedScore = scoreInput.trim();
    if (!trimmedScore) {
      setFeedbackNotice({
        type: 'warning',
        message: 'Vui lòng chọn hoặc nhập điểm trước khi lưu.',
      });
      return;
    }

    if (onSaveHistoryScore) {
      onSaveHistoryScore(trimmedScore, noteInput.trim(), question.question);
    }

    soundEngine.playTick(1.4);
    setFeedbackNotice({
      type: 'success',
      message: `Đã lưu đánh giá "${trimmedScore}" của ${student.name} vào Lịch sử gọi.`,
    });
  };

  // Helper: Initiate writing score into Sổ điểm TX
  const handleInitiateWriteToTx = () => {
    if (!student) {
      setFeedbackNotice({
        type: 'warning',
        message: 'Ghi điểm TX áp dụng khi có học sinh được chọn.',
      });
      return;
    }

    const trimmed = scoreInput.trim().replace(',', '.');
    const numeric = parseFloat(trimmed);

    if (isNaN(numeric) || numeric < 0 || numeric > 10) {
      setFeedbackNotice({
        type: 'warning',
        message: 'Điểm ghi vào Sổ điểm TX phải là số từ 0 đến 10 (ví dụ: 8, 8.5, 10).',
      });
      return;
    }

    // Find first available slot TX1 -> TX2 -> TX3 -> TX4
    const firstAvailable = findFirstAvailableTxSlot(student.scores);

    if (!firstAvailable) {
      // All 4 TX slots are full!
      setTxFullWarningOpen(true);
      return;
    }

    // Open confirmation modal
    setPendingTxConfirm({
      numericScore: Math.round(numeric * 10) / 10,
      slot: firstAvailable,
    });
  };

  // Confirm writing score to TX
  const handleConfirmWriteToTx = async () => {
    if (!pendingTxConfirm || !student) return;

    const { numericScore, slot } = pendingTxConfirm;

    if (onSaveTxScore) {
      await onSaveTxScore(numericScore, slot, noteInput.trim(), question.question);
    }

    soundEngine.playSuccess();
    setFeedbackNotice({
      type: 'success',
      message: `Đã ghi thành công điểm ${numericScore} vào ô ${slot.toUpperCase()} của học sinh ${student.name}!`,
    });
    setPendingTxConfirm(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900/95 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-8 shadow-2xl shadow-amber-500/10 backdrop-blur-md animate-fade-in space-y-6">
      {/* 1. TOP HEADER ROW */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-500/30">
            {doorNumber}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-extrabold text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ô CỬA BÍ MẬT SỐ {doorNumber}</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-100">
              Kiểm Tra Bài Cũ
            </h3>
          </div>
        </div>

        {/* Level Badge & Question Type Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm ${
              isBasic
                ? 'bg-sky-950/90 text-sky-300 border-sky-500/50'
                : 'bg-purple-950/90 text-purple-300 border-purple-500/50'
            }`}
          >
            {isBasic ? '📘 CƠ BẢN' : '🚀 NÂNG CAO'}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
            {parsed.isMultipleChoice ? 'Trắc nghiệm' : 'Tự luận'}
          </span>
        </div>
      </div>

      {/* 2. STUDENT INFORMATION BANNER (If called with a specific student) */}
      {student && (
        <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900/90 to-purple-950/70 border border-indigo-500/40 rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black text-white">
                  {student.name}
                </span>
                {className && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                    Lớp {className}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Đã lên bảng:{' '}
                <span className="text-amber-400 font-bold">{student.callCount || 0} lần</span>
              </p>
            </div>
          </div>

          {/* Current TX Gradebook Preview */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium mr-1">Điểm TX:</span>
            {(['tx1', 'tx2', 'tx3', 'tx4'] as const).map((col) => {
              const val = student.scores?.[col];
              const isFilled = typeof val === 'number' && !isNaN(val);
              return (
                <div
                  key={col}
                  className={`px-2 py-0.5 rounded font-mono font-bold text-center min-w-8 ${
                    isFilled
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                  title={`${col.toUpperCase()}: ${isFilled ? val : 'Trống'}`}
                >
                  <span className="text-[10px] text-slate-400 mr-0.5 uppercase">{col}:</span>
                  {isFilled ? val : '—'}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. QUESTION CONTENT STEM (With KaTeX support) */}
      <div className="bg-slate-950/85 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-inner space-y-2">
        <div className="text-[11px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          <span>NỘI DUNG CÂU HỎI:</span>
        </div>
        <div className="text-lg sm:text-2xl font-semibold text-slate-100 leading-relaxed tracking-wide">
          <MathRenderer text={parsed.stem} />
        </div>
      </div>

      {/* 4. INTERACTIVE CHOICES OR ESSAY ANSWER */}
      {parsed.isMultipleChoice ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Chọn 1 trong các phương án dưới đây:</span>
            {selectedOptionKey && !isCheckedAnswer && (
              <span className="text-amber-400">Đã chọn: Phương án {selectedOptionKey}</span>
            )}
          </div>

          {/* 4 Choices Grid (2x2 on desktop, 1-col on mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {parsed.options.map((opt) => {
              const isSelected = selectedOptionKey === opt.key;
              const isCorrect = parsed.correctKey === opt.key;

              let buttonStyle = 'bg-slate-850/80 border-slate-700 text-slate-200 hover:border-amber-400/60 hover:bg-slate-800';
              let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';

              if (isCheckedAnswer) {
                if (isCorrect) {
                  buttonStyle = 'bg-emerald-950/80 border-emerald-400 text-emerald-100 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/20';
                  badgeStyle = 'bg-emerald-500 text-slate-950 font-black';
                } else if (isSelected && !isCorrect) {
                  buttonStyle = 'bg-rose-950/70 border-rose-500 text-rose-200 ring-1 ring-rose-500/40';
                  badgeStyle = 'bg-rose-600 text-white font-black';
                } else {
                  buttonStyle = 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-60';
                  badgeStyle = 'bg-slate-800 text-slate-600 border-slate-700';
                }
              } else if (isSelected) {
                buttonStyle = 'bg-indigo-950/80 border-indigo-400 text-white ring-2 ring-indigo-400/50 shadow-lg shadow-indigo-500/20';
                badgeStyle = 'bg-indigo-500 text-white font-black';
              }

              return (
                <button
                  key={opt.key}
                  type="button"
                  disabled={isCheckedAnswer}
                  onClick={() => handleSelectOption(opt.key)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3.5 cursor-pointer shadow-sm ${buttonStyle}`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border transition-all ${badgeStyle}`}
                  >
                    {opt.key}
                  </div>
                  <div className="text-sm sm:text-base font-medium leading-relaxed my-auto pt-0.5 break-words overflow-hidden">
                    <MathRenderer text={opt.text} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Action Row for MCQ: Check Answer */}
          <div className="flex items-center justify-between gap-3 pt-2">
            {!isCheckedAnswer ? (
              <button
                type="button"
                onClick={handleCheckAnswer}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer hover:scale-102"
              >
                <Eye className="w-4 h-4" />
                <span>KIỂM TRA ĐÁP ÁN</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsCheckedAnswer(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
              >
                <EyeOff className="w-3.5 h-3.5 inline mr-1.5" />
                <span>Ẩn kiểm tra</span>
              </button>
            )}

            {/* Answer Result Banner */}
            {isCheckedAnswer && parsed.correctKey && (
              <div
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 ${
                  selectedOptionKey === parsed.correctKey
                    ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50'
                    : 'bg-amber-950/90 text-amber-300 border border-amber-500/50'
                }`}
              >
                {selectedOptionKey === parsed.correctKey ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Chính xác! Đáp án đúng là {parsed.correctKey}.</span>
                  </>
                ) : (
                  <>
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    <span>Đáp án đúng là: {parsed.correctKey}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Detailed explanation if checked */}
          {isCheckedAnswer && parsed.explanation && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-1.5 text-xs sm:text-sm text-slate-300 animate-fade-in">
              <div className="font-bold text-amber-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>GỢI Ý & HƯỚNG DẪN GIẢI:</span>
              </div>
              <div className="text-slate-200 leading-relaxed font-mono">
                <MathRenderer text={parsed.explanation} />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Essay Question Answer Section */
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowEssayAnswer(!showEssayAnswer)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                showEssayAnswer
                  ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25'
              }`}
            >
              {showEssayAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showEssayAnswer ? 'ẨN ĐÁP ÁN' : 'HIỆN ĐÁP ÁN & GỢI Ý'}</span>
            </button>
          </div>

          {showEssayAnswer && (
            <div className="bg-emerald-950/40 border-2 border-emerald-500/50 rounded-2xl p-5 sm:p-6 shadow-lg shadow-emerald-500/10 animate-fade-in space-y-2">
              <div className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>ĐÁP ÁN & GỢI Ý ĐỐI CHIẾU:</span>
              </div>
              <div className="text-base sm:text-xl font-medium text-emerald-200 leading-relaxed font-mono">
                <MathRenderer text={question.answer} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. TEACHER EVALUATION & SCORING SECTION (Available for both modes) */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Award className="w-4 h-4" />
            <span>ĐÁNH GIÁ & CHẤM ĐIỂM:</span>
          </span>
          <span className="text-[11px] text-slate-400">
            Giáo viên chọn mức điểm hoặc nhập số lẻ (0 - 10)
          </span>
        </div>

        {/* Feedback message banner if any */}
        {feedbackNotice && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in ${
              feedbackNotice.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
                : feedbackNotice.type === 'error'
                ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
                : 'bg-amber-950/80 text-amber-300 border border-amber-500/50'
            }`}
          >
            {feedbackNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{feedbackNotice.message}</span>
          </div>
        )}

        {/* Quick Score Preset Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {['10', '9', '8', '7', '6', '5', 'Đạt', 'Chưa đạt'].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => {
                setScoreInput(val);
                soundEngine.playTick(1.3);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                scoreInput === val
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
              }`}
            >
              {val}
            </button>
          ))}

          {/* Custom Score Input */}
          <input
            type="text"
            placeholder="Điểm khác..."
            value={!['10', '9', '8', '7', '6', '5', 'Đạt', 'Chưa đạt'].includes(scoreInput) ? scoreInput : ''}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9.,]/g, '').slice(0, 4);
              setScoreInput(val);
            }}
            className="w-24 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 placeholder-slate-500 text-center font-bold outline-none"
          />

          {/* Note Input */}
          <input
            type="text"
            placeholder="Ghi chú nhận xét (tùy chọn)..."
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            className="flex-1 min-w-[200px] bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none"
          />
        </div>

        {/* 2 Clear Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Action 1: Save to History ONLY */}
          <button
            type="button"
            onClick={handleSaveToHistoryOnly}
            disabled={!student}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-xs sm:text-sm font-bold border border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
            title="Lưu kết quả vào Lịch sử gọi, không can thiệp vào Sổ điểm"
          >
            <FileCheck2 className="w-4 h-4 text-sky-400" />
            <span>Chỉ lưu vào Lịch sử</span>
          </button>

          {/* Action 2: Write to TX Gradebook */}
          <button
            type="button"
            onClick={handleInitiateWriteToTx}
            disabled={!student}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer hover:scale-102"
            title="Ghi điểm trực tiếp vào ô TX đầu tiên còn trống (TX1 -> TX4) của học sinh"
          >
            <CheckCircle2 className="w-4 h-4 text-indigo-200" />
            <span>Ghi điểm vào Sổ điểm TX</span>
          </button>
        </div>
      </div>

      {/* 6. BOTTOM NAVIGATION (RETURN TO REMAINING DOORS) */}
      <div className="pt-3 flex items-center justify-between border-t border-slate-800">
        <span className="text-xs text-slate-400">
          Ô cửa số {doorNumber} sẽ được đánh dấu đã mở
        </span>

        <button
          type="button"
          onClick={onReturnToGrid}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-450 text-white font-black text-sm sm:text-base flex items-center gap-2.5 shadow-xl shadow-orange-500/25 hover:scale-102 transition-all cursor-pointer"
        >
          <span>TIẾP TỤC (VỀ CÁC Ô CÒN LẠI)</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* CONFIRMATION MODAL: WRITE SCORE TO TX GRADEBOOK */}
      {pendingTxConfirm && student && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border-2 border-indigo-500/50 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-white">
                Xác Nhận Ghi Điểm TX
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Bạn có chắc chắn muốn ghi điểm{' '}
                <span className="text-amber-400 font-black text-sm">
                  {pendingTxConfirm.numericScore}
                </span>{' '}
                vào ô{' '}
                <span className="text-indigo-400 font-black text-sm uppercase">
                  {pendingTxConfirm.slot}
                </span>{' '}
                của học sinh{' '}
                <span className="text-white font-bold">{student.name}</span> không?
              </p>
              <p className="text-[11px] text-slate-400">
                (Điểm sẽ được lưu ngay vào Sổ điểm và đồng bộ trên hệ thống)
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingTxConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmWriteToTx}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs transition-all shadow-md"
              >
                Xác nhận ghi điểm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WARNING MODAL: TX SLOTS ARE FULL */}
      {txFullWarningOpen && student && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-amber-300">
                Đã Đủ 4 Điểm Thường Xuyên (TX1 - TX4)
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Học sinh <span className="text-white font-bold">{student.name}</span> đã có đủ 4 cột điểm thường xuyên trong sổ điểm.
              </p>
              <p className="text-xs text-slate-400">
                Theo quy chế, hệ thống không thể ghi đè lên các điểm đã có. Bạn có muốn lưu kết quả lượt này vào <span className="text-sky-300 font-bold">Lịch sử gọi</span> không?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTxFullWarningOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setTxFullWarningOpen(false);
                  handleSaveToHistoryOnly();
                }}
                className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs transition-colors shadow-md"
              >
                Lưu vào Lịch sử
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
