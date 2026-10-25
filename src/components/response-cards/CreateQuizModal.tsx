import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  BookOpen,
  ArrowRight,
  Layers,
  HelpCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  Wand2,
} from 'lucide-react';
import { ClassRoom } from '../../types';
import { QuizQuestionItem, CardOrientationAnswer, QuizSession } from '../../types/responseCardTypes';
import { createNewQuizSession } from '../../services/responseCardStorage';
import { loadQuestionBanks, loadQuestionsForBank } from '../../services/reviewQuestionService';
import { parseBankQuizQuestion, isReadyQuizQuestion, type QuizQuestionDraft } from './questionBankImport';

interface CreateQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassRoom[];
  currentClass: ClassRoom;
  onSelectClass: (id: string) => void;
  onSessionCreated: (session: QuizSession) => void;
  currentUser?: any;
}

export const CreateQuizModal: React.FC<CreateQuizModalProps> = ({
  isOpen,
  onClose,
  classes,
  currentClass,
  onSelectClass,
  onSessionCreated,
  currentUser,
}) => {
  if (!isOpen) return null;

  const SUBJECT_OPTIONS = [
    'Toán',
    'Ngữ văn',
    'Tiếng Anh',
    'Khoa học tự nhiên',
    'Lịch sử & Địa lí',
    'Giáo dục địa phương',
    'Hoạt động trải nghiệm, hướng nghiệp',
    'Vật lí',
    'Hóa học',
    'Sinh học',
    'Lịch sử',
    'Địa lí',
    'Tin học',
    'Công nghệ',
    'GDCD',
    'GDQP',
    'Âm nhạc',
    'Mỹ thuật',
    'GDTC',
  ];

  const [selectedSubject, setSelectedSubject] = useState<string>(
    currentClass.subject || 'Toán'
  );
  const [sessionTitle, setSessionTitle] = useState(
    `Kiểm tra ${currentClass.subject || 'Toán'} - Lớp ${currentClass.name}`
  );
  const [creationMode, setCreationMode] = useState<'quick' | 'bank'>('quick');
  const [questionsList, setQuestionsList] = useState<QuizQuestionDraft[]>([]);

  const unresolvedCount = questionsList.filter(q => !isReadyQuizQuestion(q)).length;

  // Update sessionTitle when class or subject changes if using default title
  const handleSubjectChange = (newSubject: string) => {
    setSelectedSubject(newSubject);
    setSessionTitle(`Kiểm tra ${newSubject} - Lớp ${currentClass.name}`);
  };

  const handleClassChange = (newClassId: string) => {
    onSelectClass(newClassId);
    const target = classes.find((c) => c.id === newClassId);
    if (target) {
      const subj = target.subject || selectedSubject;
      setSelectedSubject(subj);
      setSessionTitle(`Kiểm tra ${subj} - Lớp ${target.name}`);
    }
  };

  // Form state for quick question input
  const [currentForm, setCurrentForm] = useState<{
    question: string;
    A: string;
    B: string;
    C: string;
    D: string;
    correctAnswer: CardOrientationAnswer;
    explanation: string;
  }>({
    question: '',
    A: '',
    B: '',
    C: '',
    D: '',
    correctAnswer: 'A',
    explanation: '',
  });

  // State for Bank Picker (Mode B)
  const ownerId = currentUser?.uid;
  const questionBanks = useMemo(() => {
    return loadQuestionBanks(ownerId);
  }, [ownerId]);

  // Filter banks by subject if matching banks exist, otherwise show all
  const filteredQuestionBanks = useMemo(() => {
    const matched = questionBanks.filter((b) => {
      const bankSubj = (b.subject || '').toLowerCase().trim();
      const currSubj = selectedSubject.toLowerCase().trim();
      return bankSubj === currSubj || bankSubj.includes(currSubj) || currSubj.includes(bankSubj);
    });
    return matched.length > 0 ? matched : questionBanks;
  }, [questionBanks, selectedSubject]);

  const [selectedBankId, setSelectedBankId] = useState<string>(() => {
    return filteredQuestionBanks.length > 0 ? filteredQuestionBanks[0].id : '';
  });

  // Keep selectedBankId synced when filtered list changes
  useEffect(() => {
    if (filteredQuestionBanks.length > 0) {
      if (!filteredQuestionBanks.some((b) => b.id === selectedBankId)) {
        setSelectedBankId(filteredQuestionBanks[0].id);
      }
    } else {
      setSelectedBankId('');
    }
  }, [filteredQuestionBanks]);

  const bankQuestions = useMemo(() => {
    if (!selectedBankId) return [];
    return loadQuestionsForBank(selectedBankId, ownerId);
  }, [selectedBankId, ownerId]);

  const [selectedBankQuestionIds, setSelectedBankQuestionIds] = useState<Set<string>>(new Set());

  // Handle adding a quick question
  const handleAddQuickQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentForm.question.trim() || !currentForm.A.trim() || !currentForm.B.trim()) {
      alert('Vui lòng nhập nội dung câu hỏi và ít nhất phương án A, B!');
      return;
    }

    const newQ: QuizQuestionItem = {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      question: currentForm.question.trim(),
      options: {
        A: currentForm.A.trim(),
        B: currentForm.B.trim(),
        C: currentForm.C.trim() || 'Phương án C',
        D: currentForm.D.trim() || 'Phương án D',
      },
      correctAnswer: currentForm.correctAnswer,
      explanation: currentForm.explanation.trim() || undefined,
    };

    setQuestionsList([...questionsList, newQ]);

    // Reset form for next question
    setCurrentForm({
      question: '',
      A: '',
      B: '',
      C: '',
      D: '',
      correctAnswer: 'A',
      explanation: '',
    });
  };

  // Handle adding selected questions from Question Bank
  const handleImportFromBank = () => {
    if (selectedBankQuestionIds.size === 0) {
      alert('Vui lòng tích chọn ít nhất 1 câu hỏi từ kho!');
      return;
    }

    const matchedBank = questionBanks.find((b) => b.id === selectedBankId);
    const chosen = bankQuestions.filter((q) => selectedBankQuestionIds.has(q.id));

    const converted: QuizQuestionDraft[] = [];
    const skipped: number[] = [];
    chosen.forEach((q, idx) => {
      const parsed = parseBankQuizQuestion(q.question, q.answer || '');
      if (!parsed) {
        skipped.push(idx + 1);
        return;
      }
      converted.push({
        id: `bank-q-${Date.now()}-${idx}-${q.id}`,
        ...parsed,
        explanation: q.answer || undefined,
        subject: matchedBank?.subject,
        grade: matchedBank?.grade,
        chapter: matchedBank?.sectionName,
        lesson: matchedBank?.lessonName,
        level: q.level,
      });
    });
    if (skipped.length) {
      alert(`Chưa nhập câu ${skipped.join(', ')} trong nhóm đã chọn vì chưa đọc đủ 4 phương án A–D. Thầy cô dùng chế độ Soạn câu hỏi nhanh để bổ sung trước khi sử dụng.`);
    }
    if (!converted.length) return;

    setQuestionsList([...questionsList, ...converted]);
    setSelectedBankQuestionIds(new Set());
    setCreationMode('quick'); // Return to list view
  };

  // Remove question from queue
  const handleRemoveQuestion = (idx: number) => {
    setQuestionsList(questionsList.filter((_, i) => i !== idx));
  };

  // Reorder questions
  const handleMoveQuestion = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === questionsList.length - 1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...questionsList];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setQuestionsList(updated);
  };

  // Start Session
  const handleStartSession = () => {
    if (questionsList.length === 0) {
      alert('Vui lòng thêm ít nhất 1 câu hỏi để bắt đầu phiên kiểm tra!');
      return;
    }

    const readyQuestions = questionsList.filter(isReadyQuizQuestion);
    if (readyQuestions.length !== questionsList.length) {
      alert('Thầy cô cần chọn đáp án đúng A, B, C hoặc D cho tất cả câu hỏi trước khi bắt đầu.');
      return;
    }
    try {
      const session = createNewQuizSession(currentClass, sessionTitle, readyQuestions, selectedSubject);
      onSessionCreated(session);
      onClose();
    } catch (error) { alert(error instanceof Error ? error.message : 'Không lưu được phiên kiểm tra.'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                <span>TẠO BUỔI KIỂM TRA TRẮC NGHIỆM</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
                  Thẻ thông minh
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Soạn câu hỏi nhanh hoặc chọn từ Kho KT bài cũ có sẵn của ClassGo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          {/* 3-Step Selection: 1. Lớp -> 2. Môn học -> 3. Bộ câu hỏi */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px]">1</span>
              <span>Chọn Lớp</span>
              <span className="text-slate-600">➔</span>
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px]">2</span>
              <span>Chọn Môn học</span>
              <span className="text-slate-600">➔</span>
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px]">3</span>
              <span>Chọn / Soạn Bộ câu hỏi</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  1. Lớp kiểm tra:
                </label>
                <select
                  value={currentClass.id}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-amber-500 text-xs"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      Lớp {cls.name} ({cls.students.length} HS)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  2. Môn học kiểm tra:
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-bold focus:outline-none focus:border-amber-500 text-xs"
                >
                  {SUBJECT_OPTIONS.map((sub) => (
                    <option key={sub} value={sub}>
                      Môn {sub}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Tên buổi kiểm tra:
                </label>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="VD: Kiểm tra 15 phút"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-900/60 rounded-xl px-3 py-1.5 border border-slate-800/80 flex items-center justify-between">
              <span>
                💡 <em>Lớp <strong>{currentClass.name}</strong> dùng chung 1 bộ thẻ cố định cho tất cả các môn.</em>
              </span>
              <span className="text-amber-400 font-mono font-bold">
                Môn: {selectedSubject}
              </span>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setCreationMode('quick')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all ${
                creationMode === 'quick'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Chế độ A: Soạn câu hỏi nhanh</span>
            </button>

            <button
              type="button"
              onClick={() => setCreationMode('bank')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all ${
                creationMode === 'bank'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Chế độ B: Lấy từ Kho KT bài cũ</span>
            </button>
          </div>

          {/* MODE A: QUICK QUESTION FORM */}
          {creationMode === 'quick' && (
            <form onSubmit={handleAddQuickQuestion} className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3.5">
              <div className="font-bold text-amber-400 text-xs uppercase tracking-wide flex items-center justify-between">
                <span>Soạn câu hỏi mới</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Đã thêm: <strong>{questionsList.length} câu</strong> vào phiên
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nội dung câu hỏi *</label>
                <textarea
                  required
                  rows={2}
                  value={currentForm.question}
                  onChange={(e) => setCurrentForm({ ...currentForm, question: e.target.value })}
                  placeholder="Nhập nội dung câu hỏi trắc nghiệm..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-amber-500 text-xs leading-relaxed"
                />
              </div>

              {/* 4 Options A, B, C, D */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                  <div key={opt} className="relative">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-6 h-6 rounded-lg font-black flex items-center justify-center text-xs ${
                        currentForm.correctAnswer === opt
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {opt}
                      </span>
                      <input
                        type="text"
                        required={opt === 'A' || opt === 'B'}
                        value={currentForm[opt]}
                        onChange={(e) => setCurrentForm({ ...currentForm, [opt]: e.target.value })}
                        placeholder={`Phương án ${opt}...`}
                        className={`flex-1 bg-slate-900 border rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none ${
                          currentForm.correctAnswer === opt
                            ? 'border-emerald-500/60 ring-1 ring-emerald-500/30'
                            : 'border-slate-700 focus:border-amber-500'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Select Correct Answer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-semibold">Đáp án đúng:</span>
                  <div className="flex items-center gap-1">
                    {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCurrentForm({ ...currentForm, correctAnswer: opt })}
                        className={`w-8 h-8 rounded-xl font-black text-xs transition-all ${
                          currentForm.correctAnswer === opt
                            ? 'bg-emerald-500 text-slate-950 scale-105 shadow-md shadow-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Thêm câu này vào phiên</span>
                </button>
              </div>
            </form>
          )}

          {/* MODE B: IMPORT FROM QUESTION BANK */}
          {creationMode === 'bank' && (
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="font-bold text-amber-400 text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  <span>Chọn bài học từ Kho kiểm tra bài cũ</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">
                    Đã chọn: <strong>{selectedBankQuestionIds.size} câu</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleImportFromBank}
                    disabled={selectedBankQuestionIds.size === 0}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Lấy vào phiên ({selectedBankQuestionIds.size})</span>
                  </button>
                </div>
              </div>

              {/* Select Bank */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Bài học trong kho:</label>
                <select
                  value={selectedBankId}
                  onChange={(e) => {
                    setSelectedBankId(e.target.value);
                    setSelectedBankQuestionIds(new Set());
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-amber-500 text-xs"
                >
                  {filteredQuestionBanks.length === 0 ? (
                    <option value="">Chưa có bài nào phù hợp môn {selectedSubject} trong kho</option>
                  ) : (
                    filteredQuestionBanks.map((b) => (
                      <option key={b.id} value={b.id}>
                        [{b.subject} - K{b.grade}] {b.lessonName} ({b.sectionName})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Bank Questions List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {bankQuestions.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">
                    Bài này chưa có câu hỏi trong kho.
                  </div>
                ) : (
                  bankQuestions.map((q, idx) => {
                    const isChecked = selectedBankQuestionIds.has(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => {
                          const next = new Set(selectedBankQuestionIds);
                          if (isChecked) next.delete(q.id);
                          else next.add(q.id);
                          setSelectedBankQuestionIds(next);
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                          isChecked
                            ? 'bg-slate-900 border-amber-500/50 text-slate-100'
                            : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900'
                        }`}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Chọn câu hỏi ${idx + 1} từ kho`}
                          checked={isChecked}
                          onChange={() => {}} // handled by parent onClick
                          className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-800 border-slate-700 mt-0.5"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="font-semibold text-xs text-slate-200">
                            #{idx + 1}. {q.question}
                          </div>
                          {q.answer && (
                            <div className="text-[11px] text-emerald-400/90 italic">
                              Đáp án: {q.answer}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* QUEUED QUESTIONS IN THIS SESSION */}
          <div className="space-y-3">
            <div className="font-bold text-slate-200 text-xs uppercase tracking-wide flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <FileQuestion className="w-4 h-4 text-amber-400" />
                <span>Danh sách câu hỏi trong phiên ({questionsList.length} câu)</span>
              </div>
              {questionsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQuestionsList([])}
                  className="text-slate-500 hover:text-rose-400 text-[11px]"
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            {questionsList.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500 space-y-1">
                <p>Chưa có câu hỏi nào trong phiên.</p>
                <p className="text-[11px]">Hãy soạn câu hỏi ở trên hoặc lấy từ kho để tiếp tục.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {questionsList.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-start justify-between gap-3 shadow-sm hover:border-slate-700 transition-all"
                  >
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 text-[11px]">
                          Câu {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-200 text-xs">
                          {q.question}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                        {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                          <div
                            key={opt}
                            className={`px-2 py-1 rounded-lg border truncate ${
                              q.correctAnswer === opt
                                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            <strong>{opt}:</strong> {q.options[opt]}
                          </div>
                        ))}
                      </div>
                      {q.correctAnswer === null && (
                        <p role="alert" className="text-xs font-semibold text-amber-300">
                          Chưa xác định được đáp án đúng. Thầy cô chọn A, B, C hoặc D trước khi sử dụng câu này.
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Đáp án đúng câu ${idx + 1}`}>
                        <span className="text-xs text-slate-300">Đáp án đúng:</span>
                        {(['A', 'B', 'C', 'D'] as const).map(opt => (
                          <button key={opt} type="button" aria-label={`Câu ${idx + 1}: chọn đáp án ${opt}`}
                            aria-pressed={q.correctAnswer === opt}
                            onClick={() => setQuestionsList(previous => previous.map(item => item.id === q.id ? { ...item, correctAnswer: opt } : item))}
                            className={`w-8 h-8 rounded-lg font-bold text-xs ${q.correctAnswer === opt ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                        title="Di chuyển lên"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(idx, 'down')}
                        disabled={idx === questionsList.length - 1}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                        title="Di chuyển xuống"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        className="p-1 text-slate-500 hover:text-rose-400"
                        title="Xóa câu này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-slate-400">
            Tổng cộng: <strong className="text-amber-300">{questionsList.length} câu hỏi</strong> cho lớp{' '}
            <strong className="text-white">{currentClass.name}</strong>
            {unresolvedCount > 0 && <p className="mt-1 text-amber-300">Còn {unresolvedCount} câu cần giáo viên chọn đáp án đúng.</p>}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleStartSession}
              disabled={questionsList.length === 0 || unresolvedCount > 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all hover:scale-102 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>BẮT ĐẦU BUỔI KIỂM TRA</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
