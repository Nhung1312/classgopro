import React, { useState, useRef } from 'react';
import {
  HelpCircle,
  Plus,
  Trash2,
  Shuffle,
  CheckCircle,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  FileText,
  Upload,
  Eye,
  Maximize2,
  Info,
} from 'lucide-react';
import mammoth from 'mammoth';
import { QuestionItem } from '../types';
import { MathRenderer } from './MathRenderer';
import { MathToolbar } from './MathToolbar';

export interface QuestionBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions?: QuestionItem[];
  onUpdateQuestions?: (questions: QuestionItem[]) => void;
  onSelectQuestionForStudent?: (question: QuestionItem) => void;
  onSelectQuestion?: (question: QuestionItem) => void;
  selectedStudentName?: string;
  activeSubject?: string;
  onOpenSpotlight?: (question: QuestionItem) => void;
}

const DEFAULT_MATH_SAMPLE_QUESTIONS: QuestionItem[] = [
  {
    id: 'q-math-1',
    content: 'Tính đạo hàm của hàm số $y = \\frac{2x - 1}{x + 1}$ tại điểm $x_0 = 1$.',
    level: 'Trung bình',
    suggestedAnswer: 'Áp dụng công thức $(u/v)\' = \\frac{u\'v - uv\'}{v^2}$, ta có $y\' = \\frac{3}{(x+1)^2} \\Rightarrow y\'(1) = \\frac{3}{4}$.',
    hint: 'Nhớ lại công thức tính đạo hàm của phân thức bậc nhất trên bậc nhất.',
  },
  {
    id: 'q-math-2',
    content: 'Nêu công thức nghiệm của phương trình bậc hai $ax^2 + bx + c = 0$ ($a \\neq 0$) khi $\\Delta = b^2 - 4ac > 0$.',
    level: 'Dễ',
    suggestedAnswer: 'Phương trình có 2 nghiệm phân biệt: $x_{1,2} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$.',
  },
  {
    id: 'q-math-3',
    content: 'Tính tích phân: $I = \\int_{0}^{\\frac{\\pi}{2}} \\sin(x) \\cos(x) dx$.',
    level: 'Trung bình',
    suggestedAnswer: '$I = \\int_{0}^{\\frac{\\pi}{2}} \\frac{1}{2}\\sin(2x)dx = [-\\frac{1}{4}\\cos(2x)]_0^{\\frac{\\pi}{2}} = \\frac{1}{2}$. Hoặc đổi biến $t = \\sin(x) \\Rightarrow I = \\frac{1}{2}$.',
  },
  {
    id: 'q-math-4',
    content: 'Trong không gian $Oxyz$, cho mặt phẳng $(P): 2x - y + 2z - 5 = 0$. Tìm khoảng cách từ điểm $M(1; -2; 3)$ đến $(P)$.',
    level: 'Khó',
    suggestedAnswer: '$d(M, (P)) = \\frac{|2(1) - (-2) + 2(3) - 5|}{\\sqrt{2^2 + (-1)^2 + 2^2}} = \\frac{|2 + 2 + 6 - 5|}{\\sqrt{9}} = \\frac{5}{3}$.',
    hint: 'Áp dụng công thức $d(M, (P)) = \\frac{|Ax_0 + By_0 + Cz_0 + D|}{\\sqrt{A^2 + B^2 + C^2}}$.',
  },
  {
    id: 'q-math-5',
    content: 'Giải phương trình lượng giác cơ bản: $2\\sin(x) - \\sqrt{3} = 0$.',
    level: 'Dễ',
    suggestedAnswer: '$\\sin(x) = \\frac{\\sqrt{3}}{2} \\Leftrightarrow x = \\frac{\\pi}{3} + k2\\pi$ hoặc $x = \\frac{2\\pi}{3} + k2\\pi$ ($k \\in \\mathbb{Z}$).',
  },
];

export function QuestionBankModal({
  isOpen,
  onClose,
  questions = [],
  onUpdateQuestions,
  onSelectQuestionForStudent,
  onSelectQuestion,
  selectedStudentName,
  onOpenSpotlight,
}: QuestionBankModalProps) {
  const [activeTab, setActiveTab] = useState<'RANDOM' | 'MANAGE' | 'IMPORT'>('RANDOM');
  const [randomPick, setRandomPick] = useState<QuestionItem | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  // Form state
  const [newContent, setNewContent] = useState('');
  const [newLevel, setNewLevel] = useState<'Dễ' | 'Trung bình' | 'Khó'>('Trung bình');
  const [newAnswer, setNewAnswer] = useState('');
  const [newHint, setNewHint] = useState('');
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [showMathToolbar, setShowMathToolbar] = useState(false);

  // Batch import text state
  const [importText, setImportText] = useState('');
  const [isParsingDocx, setIsParsingDocx] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!isOpen) return null;

  const currentList = questions && questions.length > 0 ? questions : DEFAULT_MATH_SAMPLE_QUESTIONS;

  const handlePickRandom = () => {
    if (currentList.length === 0) return;
    setIsPicking(true);
    setShowAnswer(false);

    let counter = 0;
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * currentList.length);
      setRandomPick(currentList[idx]);
      counter++;
      if (counter > 12) {
        clearInterval(interval);
        setIsPicking(false);
      }
    }, 100);
  };

  // Insert formula symbol into textarea
  const handleInsertSymbol = (symbol: string) => {
    if (!textareaRef.current) {
      setNewContent((prev) => prev + `$${symbol}$`);
      return;
    }
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = newContent;
    const insertVal = `$${symbol}$`;
    const updated = text.substring(0, start) + insertVal + text.substring(end);
    setNewContent(updated);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + insertVal.length, start + insertVal.length);
      }
    }, 50);
  };

  // Handle image upload from computer / screenshots
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      if (loadEvt.target?.result) {
        setNewImageUrl(loadEvt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Paste image directly with Ctrl+V into form
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (loadEvt) => {
            if (loadEvt.target?.result) {
              setNewImageUrl(loadEvt.target.result as string);
            }
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  // Handle parsing Word (.docx) file
  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsParsingDocx(true);
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const rawText = result.value;

      if (rawText) {
        setImportText((prev) => (prev ? prev + '\n\n' + rawText : rawText));
      }
    } catch (err) {
      alert('Không thể đọc file Word này. Vui lòng copy và dán trực tiếp nội dung văn bản.');
    } finally {
      setIsParsingDocx(false);
      if (docxInputRef.current) docxInputRef.current.value = '';
    }
  };

  // Process text batch import (splits by "Câu 1:", "Câu 2:", etc. or double line break)
  const handleProcessBatchImport = () => {
    if (!importText.trim()) return;

    const lines = importText.split('\n');
    const newItems: QuestionItem[] = [];
    let currentBlock = '';

    const pushCurrent = () => {
      if (currentBlock.trim()) {
        newItems.push({
          id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          content: currentBlock.trim(),
          level: 'Trung bình',
        });
        currentBlock = '';
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();
      // Match patterns like "Câu 1:", "Bài 1.", "1.", "1/"
      if (/^(Câu\s*\d+|Bài\s*\d+|\d+[\.\/\)])/i.test(trimmed)) {
        pushCurrent();
        currentBlock = trimmed;
      } else if (trimmed) {
        currentBlock += (currentBlock ? '\n' : '') + trimmed;
      }
    }
    pushCurrent();

    if (newItems.length > 0) {
      const updated = [...newItems, ...(questions || [])];
      if (onUpdateQuestions) {
        onUpdateQuestions(updated);
      }
      setImportText('');
      setActiveTab('MANAGE');
    }
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() && !newImageUrl) return;

    const newQ: QuestionItem = {
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      content: newContent.trim() || 'Xem hình vẽ đính kèm bên dưới:',
      level: newLevel,
      suggestedAnswer: newAnswer.trim() || undefined,
      hint: newHint.trim() || undefined,
      imageUrl: newImageUrl || undefined,
    };

    const updated = [newQ, ...(questions || [])];
    if (onUpdateQuestions) {
      onUpdateQuestions(updated);
    }
    setNewContent('');
    setNewAnswer('');
    setNewHint('');
    setNewImageUrl(null);
  };

  const handleDeleteQuestion = (id: string) => {
    const updated = (questions || []).filter((q) => q.id !== id);
    if (onUpdateQuestions) {
      onUpdateQuestions(updated);
    }
    if (randomPick?.id === id) {
      setRandomPick(null);
    }
  };

  const handleApplyToStudent = (q: QuestionItem) => {
    if (onSelectQuestion) {
      onSelectQuestion(q);
      onClose();
    } else if (onSelectQuestionForStudent) {
      onSelectQuestionForStudent(q);
      onClose();
    }
  };

  return (
    <div
      id="modal-question-bank"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      onPaste={handlePaste}
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
              📐
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Ngân Hàng Câu Hỏi Toán Học</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                  KaTeX / LaTeX & Ảnh
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {selectedStudentName
                  ? `Bốc câu hỏi cho học sinh: ${selectedStudentName}`
                  : 'Hỗ trợ hiển thị phân số, căn thức, tích phân, hình vẽ chống lỗi font'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-questions-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-3 gap-2">
          <button
            id="tab-questions-random"
            onClick={() => setActiveTab('RANDOM')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'RANDOM'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shuffle className="w-3.5 h-3.5" /> Bốc Ngẫu Nhiên
          </button>
          <button
            id="tab-questions-manage"
            onClick={() => setActiveTab('MANAGE')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'MANAGE'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Quản Lý & Thêm Mới ({currentList.length})
          </button>
          <button
            id="tab-questions-import"
            onClick={() => setActiveTab('IMPORT')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'IMPORT'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Nhập Từ Word / Text
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'RANDOM' && (
            <div className="flex flex-col items-center justify-center text-center space-y-6">
              {/* Question Card Display */}
              <div className="w-full bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl relative min-h-[180px] flex flex-col justify-center items-center">
                {randomPick ? (
                  <div className={`space-y-4 w-full ${isPicking ? 'opacity-60 scale-95 transition-all' : 'scale-100 transition-all'}`}>
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          randomPick.level === 'Khó'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : randomPick.level === 'Dễ'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        Mức độ: {randomPick.level || 'Trung bình'}
                      </span>
                      {randomPick.imageUrl && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" /> Có hình vẽ
                        </span>
                      )}
                    </div>

                    {/* Question Content rendered with Math KaTeX */}
                    <div className="text-lg sm:text-xl font-medium text-slate-100 leading-relaxed px-2 py-1">
                      <MathRenderer text={randomPick.content} />
                    </div>

                    {/* Image preview */}
                    {randomPick.imageUrl && (
                      <div className="my-2 max-h-48 overflow-hidden rounded-xl border border-slate-700 mx-auto max-w-sm">
                        <img
                          src={randomPick.imageUrl}
                          alt="Đề bài minh họa"
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    )}

                    {/* Hint if available */}
                    {randomPick.hint && (
                      <div className="text-xs text-amber-300 bg-amber-950/30 border border-amber-500/30 p-2.5 rounded-xl text-left">
                        💡 <strong>Gợi ý:</strong> <MathRenderer text={randomPick.hint} />
                      </div>
                    )}

                    {/* Suggested Answer */}
                    {randomPick.suggestedAnswer && (
                      <div className="pt-2 border-t border-slate-700/50">
                        <button
                          onClick={() => setShowAnswer(!showAnswer)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
                        >
                          {showAnswer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {showAnswer ? 'Ẩn đáp án gợi ý' : 'Xem đáp án gợi ý cho giáo viên'}
                        </button>
                        {showAnswer && (
                          <div className="mt-2 text-xs text-slate-200 bg-slate-950/80 p-3 rounded-xl border border-emerald-500/30 text-left">
                            <strong className="text-emerald-400 block mb-1">Đáp án:</strong>
                            <MathRenderer text={randomPick.suggestedAnswer} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-400 py-6">
                    <Sparkles className="w-8 h-8 mx-auto text-amber-400/50 mb-2 animate-bounce" />
                    <p className="text-sm font-medium">Nhấn nút bên dưới để bốc ngẫu nhiên câu hỏi bài cũ</p>
                    <p className="text-xs text-slate-500 mt-1">Đầy đủ công thức toán học chuẩn KaTeX</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                <button
                  id="btn-spin-random-question"
                  onClick={handlePickRandom}
                  disabled={isPicking}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-900/30 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
                >
                  <Shuffle className={`w-4 h-4 ${isPicking ? 'animate-spin' : ''}`} />
                  {isPicking ? 'Đang bốc câu hỏi...' : '🎲 Bốc Câu Hỏi Ngẫu Nhiên'}
                </button>

                {randomPick && (
                  <>
                    {onOpenSpotlight && (
                      <button
                        onClick={() => onOpenSpotlight(randomPick)}
                        className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-sm border border-indigo-500/40 flex items-center gap-1.5 transition-all"
                        title="Phóng to câu hỏi toàn màn hình cho học sinh nhìn rõ"
                      >
                        <Maximize2 className="w-4 h-4" /> Chiếu Toàn Màn Hình
                      </button>
                    )}

                    {onSelectQuestionForStudent && (
                      <button
                        id="btn-apply-question-student"
                        onClick={() => handleApplyToStudent(randomPick)}
                        className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg flex items-center gap-2 transition-all"
                      >
                        <CheckCircle className="w-4 h-4" /> Gán Vào Lượt Khảo Bài
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'MANAGE' && (
            <div className="space-y-6">
              {/* Add form */}
              <form onSubmit={handleAddQuestion} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <span>Thêm câu hỏi Toán mới</span>
                    <span className="text-[10px] text-slate-400 font-normal">(Gõ $...$ để chèn công thức)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowMathToolbar(!showMathToolbar)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                  >
                    📐 {showMathToolbar ? 'Ẩn bảng ký hiệu' : 'Bảng ký hiệu Toán'}
                  </button>
                </div>

                {/* Math Quick Toolbar */}
                {showMathToolbar && <MathToolbar onInsert={handleInsertSymbol} />}

                {/* Main Textarea with live math preview */}
                <div>
                  <textarea
                    ref={textareaRef}
                    id="input-new-question-content"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Ví dụ: Tính tích phân $I = \int_{0}^{1} (3x^2 + 2x) dx$ hoặc dán ảnh chụp màn hình trực tiếp..."
                    rows={3}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                {/* Live Preview of Math */}
                {newContent.trim() && (
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-indigo-500/30 text-xs">
                    <div className="text-[10px] font-bold uppercase text-indigo-400 mb-1">
                      Xem trước hiển thị trực tiếp (Live Preview):
                    </div>
                    <div className="text-sm text-slate-100">
                      <MathRenderer text={newContent} />
                    </div>
                  </div>
                )}

                {/* Attach Screenshot / Diagram */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Đính kèm ảnh hình vẽ / đề bài</span>
                  </button>
                  <span className="text-[11px] text-slate-400">
                    (Hoặc bấm <strong>Ctrl + V</strong> để dán ảnh chụp màn hình trực tiếp)
                  </span>

                  {newImageUrl && (
                    <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
                      <span className="text-xs text-emerald-400 font-bold">✓ Đã đính kèm ảnh</span>
                      <button
                        type="button"
                        onClick={() => setNewImageUrl(null)}
                        className="text-rose-400 hover:text-rose-300 text-xs"
                      >
                        Xóa ảnh
                      </button>
                    </div>
                  )}
                </div>

                {/* Image thumbnail preview if attached */}
                {newImageUrl && (
                  <div className="relative max-w-xs max-h-36 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-1">
                    <img src={newImageUrl} alt="Preview" className="w-full h-auto object-contain rounded-lg" />
                  </div>
                )}

                {/* Difficulty & Hint */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block font-bold">Mức độ khó</label>
                    <select
                      value={newLevel}
                      onChange={(e) => setNewLevel(e.target.value as 'Dễ' | 'Trung bình' | 'Khó')}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="Dễ">Dễ</option>
                      <option value="Trung bình">Trung bình</option>
                      <option value="Khó">Khó</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block font-bold">Gợi ý cho HS (Tùy chọn)</label>
                    <input
                      type="text"
                      value={newHint}
                      onChange={(e) => setNewHint(e.target.value)}
                      placeholder="Gợi ý công thức hoặc hướng giải..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block font-bold">Đáp án giải (Tùy chọn)</label>
                    <input
                      type="text"
                      value={newAnswer}
                      onChange={(e) => setNewAnswer(e.target.value)}
                      placeholder="Đáp án hoặc kết quả cuối cùng..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <Plus className="w-4 h-4" /> Thêm Vào Kho Câu Hỏi
                  </button>
                </div>
              </form>

              {/* List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Danh Sách Câu Hỏi Hiện Có ({currentList.length})
                </h4>
                {currentList.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex items-start justify-between gap-3 hover:border-slate-600 transition-all"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                            q.level === 'Khó'
                              ? 'bg-rose-500/20 text-rose-300'
                              : q.level === 'Dễ'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {q.level || 'Trung bình'}
                        </span>
                        {q.imageUrl && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" /> Kèm hình vẽ
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-200 font-medium">
                        <MathRenderer text={q.content} />
                      </div>
                      {q.imageUrl && (
                        <div className="mt-1 max-h-24 max-w-[160px] overflow-hidden rounded border border-slate-700">
                          <img src={q.imageUrl} alt="Thumbnail" className="w-full h-auto object-cover" />
                        </div>
                      )}
                      {q.suggestedAnswer && (
                        <div className="text-xs text-slate-400">
                          💡 <strong>Đáp án:</strong> <MathRenderer text={q.suggestedAnswer} />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onOpenSpotlight && (
                        <button
                          onClick={() => onOpenSpotlight(q)}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-indigo-300 transition-colors"
                          title="Phóng to toàn màn hình"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      )}
                      {onSelectQuestionForStudent && (
                        <button
                          onClick={() => handleApplyToStudent(q)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
                        >
                          Chọn
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Xóa câu hỏi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'IMPORT' && (
            <div className="space-y-4">
              <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-4 text-xs text-indigo-200 space-y-2">
                <div className="font-bold text-sm text-indigo-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" /> Hướng dẫn nhập câu hỏi từ Word (.docx) hoặc Văn bản:
                </div>
                <p>
                  Thầy cô có thể tải trực tiếp file <strong>.docx</strong> từ máy tính, hoặc copy và dán danh sách câu hỏi theo định dạng:
                </p>
                <div className="bg-slate-950/60 p-2.5 rounded-lg font-mono text-[11px] text-slate-300 border border-slate-800">
                  Câu 1: Tính đạo hàm $y = 3x^2 - 5x + 1$<br />
                  Câu 2: Cho tam giác $ABC$ vuông tại $A$...<br />
                  Câu 3: Giải phương trình $\sin(2x) = 1$...
                </div>
              </div>

              {/* Upload Word .docx button */}
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={docxInputRef}
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleDocxUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => docxInputRef.current?.click()}
                  disabled={isParsingDocx}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {isParsingDocx ? 'Đang đọc file Word...' : '📄 Tải file Word (.docx) từ máy'}
                </button>
                <span className="text-xs text-slate-400">hoặc dán văn bản trực tiếp vào ô bên dưới</span>
              </div>

              {/* Text Area for batch import */}
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Dán nội dung câu hỏi từ Word / PDF / Text vào đây..."
                rows={8}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 font-mono focus:outline-none focus:border-amber-400"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setImportText('')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Xóa trắng
                </button>
                <button
                  onClick={handleProcessBatchImport}
                  disabled={!importText.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition-all disabled:opacity-40"
                >
                  <CheckCircle className="w-4 h-4" /> Tự Động Phân Tách & Thêm Vào Kho
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
