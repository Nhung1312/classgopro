import React from 'react';
import { X, Maximize2, Sparkles, Lightbulb, Clock, CheckCircle } from 'lucide-react';
import { QuestionItem } from '../types';
import { MathRenderer } from './MathRenderer';

interface MathQuestionModalProps {
  question: QuestionItem | null;
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
}

export const MathQuestionSpotlightModal: React.FC<MathQuestionModalProps> = ({
  question,
  isOpen,
  onClose,
  studentName,
}) => {
  const [showAnswer, setShowAnswer] = React.useState(false);
  const [timerSeconds, setTimerSeconds] = React.useState(60);
  const [isTimerRunning, setIsTimerRunning] = React.useState(false);

  React.useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  if (!isOpen || !question) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fade-in">
      <div className="bg-slate-900 border-2 border-indigo-500/50 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>CÂU HỎI KIỂM TRA TOÁN HỌC</span>
            </span>
            {studentName && (
              <span className="text-sm font-black text-amber-400">
                👤 Học sinh: {studentName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Quick countdown timer */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-3 py-1 rounded-xl border border-slate-700 text-xs font-bold text-slate-200">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}</span>
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="ml-1 px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-[10px] text-white"
              >
                {isTimerRunning ? 'Dừng' : 'Bắt đầu'}
              </button>
              <button
                onClick={() => { setTimerSeconds(60); setIsTimerRunning(false); }}
                className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] text-slate-300"
              >
                60s
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
          {/* Difficulty Badge */}
          <div className="flex items-center justify-between">
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                question.level === 'Khó'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : question.level === 'Dễ'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              Mức độ: {question.level || 'Trung bình'}
            </span>
          </div>

          {/* Question Text with KaTeX Math Render */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-inner">
            <div className="text-xl sm:text-3xl font-bold text-white leading-relaxed tracking-wide">
              <MathRenderer text={question.content} />
            </div>
          </div>

          {/* Image / Diagram Attachment if available */}
          {question.imageUrl && (
            <div className="rounded-2xl border border-slate-700/80 overflow-hidden bg-slate-950 p-2 flex flex-col items-center">
              <span className="text-[11px] text-slate-400 font-bold mb-2">📸 Hình vẽ / Đề bài đính kèm:</span>
              <img
                src={question.imageUrl}
                alt="Đề bài minh họa"
                className="max-h-[360px] object-contain rounded-xl border border-slate-800 shadow-md"
              />
            </div>
          )}

          {/* Hint */}
          {question.hint && (
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 text-amber-200 text-sm">
              <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-xs uppercase tracking-wider text-amber-400 font-bold mb-1">
                  Gợi ý suy nghĩ:
                </strong>
                <MathRenderer text={question.hint} />
              </div>
            </div>
          )}

          {/* Suggested Answer toggle */}
          {question.suggestedAnswer && (
            <div className="border-t border-slate-800 pt-4">
              <button
                onClick={() => setShowAnswer(!showAnswer)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-bold border border-indigo-500/30 transition-all flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{showAnswer ? 'Ẩn đáp án tham khảo' : 'Hiển thị đáp án tham khảo'}</span>
              </button>

              {showAnswer && (
                <div className="mt-3 p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-emerald-300 text-base font-medium">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
                    Đáp án / Các bước giải:
                  </div>
                  <MathRenderer text={question.suggestedAnswer} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Học sinh có thể nhìn rõ công thức và hình vẽ từ xa
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition-all"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
