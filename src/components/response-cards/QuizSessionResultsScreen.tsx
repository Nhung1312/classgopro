import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Download,
  GraduationCap,
  AlertTriangle,
  RotateCcw,
  BarChart3,
  Search,
  Filter,
  Check,
  X,
  FileSpreadsheet,
  ChevronDown,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { QuizSession, StudentAnswerRecord } from '../../types/responseCardTypes';
import { ClassRoom, Student, HistoryRecord } from '../../types';
import {
  calculateSessionScorePreview,
  StudentScoreTransferPreview,
} from '../../services/responseCardStorage';

interface QuizSessionResultsScreenProps {
  session: QuizSession;
  classes: ClassRoom[];
  currentClass: ClassRoom;
  onUpdateClasses: (updatedClasses: ClassRoom[]) => void;
  onReopenSession: () => void;
  onClose: () => void;
  onUpdateHistory?: (newHistory: HistoryRecord[]) => void;
  history?: HistoryRecord[];
}

export const QuizSessionResultsScreen: React.FC<QuizSessionResultsScreenProps> = ({
  session,
  classes,
  currentClass,
  onUpdateClasses,
  onReopenSession,
  onClose,
  onUpdateHistory,
  history,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTxSlot, setSelectedTxSlot] = useState<'tx1' | 'tx2' | 'tx3' | 'tx4'>('tx1');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferNotice, setTransferNotice] = useState<string | null>(null);

  // Transfer selections state
  const [transferItems, setTransferItems] = useState<StudentScoreTransferPreview[]>([]);
  const [allowOverwriteConflicts, setAllowOverwriteConflicts] = useState(false);

  // Generate Score Preview
  const scorePreviews = useMemo(() => {
    return calculateSessionScorePreview(session, currentClass, selectedTxSlot);
  }, [session, currentClass, selectedTxSlot]);

  // Sync transferItems when modal opens or slot changes
  const handleOpenTransferModal = () => {
    setTransferItems(calculateSessionScorePreview(session, currentClass, selectedTxSlot));
    setIsTransferModalOpen(true);
  };

  // Re-calculate when slot changes inside modal
  const handleSlotChange = (newSlot: 'tx1' | 'tx2' | 'tx3' | 'tx4') => {
    setSelectedTxSlot(newSlot);
    setTransferItems(calculateSessionScorePreview(session, currentClass, newSlot));
  };

  // Total session stats
  const totalQuestions = session.questions.length;
  const totalStudents = currentClass.students.length;

  const totalAnsweredStudents = useMemo(() => {
    const answeredIds = new Set<string>();
    session.results.forEach((res) => {
      Object.keys(res.answers || {}).forEach((sId) => answeredIds.add(sId));
    });
    return answeredIds.size;
  }, [session]);

  const classAverageScore = useMemo(() => {
    if (scorePreviews.length === 0) return 0;
    const answeredPreviews = scorePreviews.filter((p) => p.totalAnswered > 0);
    if (answeredPreviews.length === 0) return 0;
    const sum = answeredPreviews.reduce((acc, p) => acc + p.calculatedScore, 0);
    return Math.round((sum / answeredPreviews.length) * 10) / 10;
  }, [scorePreviews]);

  // Filtered rows for student table
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return scorePreviews;
    const term = searchTerm.toLowerCase().trim();
    return scorePreviews.filter(
      (p) =>
        p.studentName.toLowerCase().includes(term) ||
        (p.studentCode && p.studentCode.toLowerCase().includes(term)) ||
        (p.cardId && p.cardId.toString() === term)
    );
  }, [scorePreviews, searchTerm]);

  // Export results to Excel
  const handleExportExcel = () => {
    try {
      // Sheet 1: Tổng hợp điểm học sinh
      const overviewRows = scorePreviews.map((p, idx) => ({
        STT: idx + 1,
        'Mã Thẻ': p.cardId || '—',
        'Mã HS': p.studentCode || '—',
        'Họ và tên': p.studentName,
        'Số câu đúng': p.correctCount,
        'Số câu đã làm': p.totalAnswered,
        'Tổng số câu': p.totalQuestions,
        'Điểm số (Thang 10)': p.calculatedScore,
        'Xếp loại':
          p.calculatedScore >= 8.0
            ? 'Giỏi'
            : p.calculatedScore >= 6.5
            ? 'Khá'
            : p.calculatedScore >= 5.0
            ? 'Đạt'
            : 'Chưa đạt',
      }));

      // Sheet 2: Chi tiết câu trả lời
      const detailRows = scorePreviews.map((p, idx) => {
        const row: Record<string, any> = {
          STT: idx + 1,
          'Mã Thẻ': p.cardId || '—',
          'Họ và tên': p.studentName,
        };

        session.questions.forEach((q, qIdx) => {
          const ans = session.results[qIdx]?.answers[p.studentId];
          row[`Câu ${qIdx + 1} (${q.correctAnswer})`] = ans
            ? `${ans.selectedOption} ${ans.isCorrect ? '✅' : '❌'}`
            : 'Chưa trả lời';
        });

        return row;
      });

      const wb = XLSX.utils.book_new();
      const wsOverview = XLSX.utils.json_to_sheet(overviewRows);
      const wsDetails = XLSX.utils.json_to_sheet(detailRows);

      XLSX.utils.book_append_sheet(wb, wsOverview, 'Bang_Diem_Tong_Hop');
      XLSX.utils.book_append_sheet(wb, wsDetails, 'Chi_Tiet_Cau_Hoi');

      const fileName = `Ket_Qua_Kiem_Tra_${session.className.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Error exporting Excel:', err);
      alert('Không thể xuất file Excel. Vui lòng thử lại.');
    }
  };

  // Confirm transfer to Gradebook
  const handleConfirmTransfer = () => {
    let transferredCount = 0;
    let conflictCount = 0;

    const updatedClasses = classes.map((cls) => {
      if (cls.id === currentClass.id) {
        const updatedStudents = cls.students.map((student) => {
          const item = transferItems.find((it) => it.studentId === student.id);
          if (!item || !item.selectedForTransfer) return student;

          // Check conflict
          const currentScore = student.scores ? student.scores[selectedTxSlot] : undefined;
          if (currentScore !== undefined && currentScore !== null && !allowOverwriteConflicts) {
            conflictCount++;
            return student; // Skip overwrite if not allowed
          }

          const currentScores = student.scores ? { ...student.scores } : {};
          currentScores[selectedTxSlot] = item.calculatedScore;
          transferredCount++;

          return {
            ...student,
            scores: currentScores,
          };
        });

        return {
          ...cls,
          students: updatedStudents,
          updatedAt: new Date().toISOString(),
        };
      }
      return cls;
    });

    onUpdateClasses(updatedClasses);

    // Record History entries if handler provided
    if (onUpdateHistory && history) {
      const now = new Date();
      const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
      const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newHistoryRecords: HistoryRecord[] = [];

      transferItems.forEach((item) => {
        if (!item.selectedForTransfer) return;
        const currentScore = currentClass.students.find((s) => s.id === item.studentId)?.scores?.[selectedTxSlot];
        if (currentScore !== undefined && currentScore !== null && !allowOverwriteConflicts) return;

        newHistoryRecords.push({
          id: `hist-quiz-${Date.now()}-${item.studentId}`,
          timestamp: now.toISOString(),
          formattedDate,
          formattedTime,
          classId: currentClass.id,
          className: currentClass.name,
          studentId: item.studentId,
          studentName: item.studentName,
          callCountAfter: 1,
          mode: 'FAIR',
          score: item.calculatedScore,
          note: `[Thẻ Trả Lời - ${session.subject || 'Toán'}] ${session.title} (${item.correctCount}/${item.totalQuestions} câu)`,
          assignedTxSlot: selectedTxSlot,
        });
      });

      if (newHistoryRecords.length > 0) {
        onUpdateHistory([...newHistoryRecords, ...history]);
      }
    }

    setIsTransferModalOpen(false);

    setTransferNotice(
      `Đã chuyển thành công điểm của ${transferredCount} học sinh vào cột ${selectedTxSlot.toUpperCase()} (Môn ${session.subject || 'Toán'}) của lớp ${currentClass.name}!${
        conflictCount > 0 ? ` (Bỏ qua ${conflictCount} ô đã có điểm sẵn do không chọn ghi đè).` : ''
      }`
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-100 flex items-center gap-2">
                <span>TỔNG KẾT KẾT QUẢ BUỔI KIỂM TRA</span>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                  Hoàn tất
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {session.title} • Lớp {session.className} ({session.questions.length} câu trắc nghiệm)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Xuất Bảng Điểm Excel</span>
            </button>

            <button
              onClick={handleOpenTransferModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all hover:scale-102 cursor-pointer"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Chuyển Điểm Vào Sổ Điểm TX</span>
            </button>

            <button
              onClick={onReopenSession}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              title="Mở lại camera để quét bổ sung học sinh"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Quét Bổ Sung</span>
            </button>
          </div>
        </div>

        {/* Notice alert */}
        {transferNotice && (
          <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-xs text-emerald-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{transferNotice}</span>
            </div>
            <button onClick={() => setTransferNotice(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider block">
              Tổng số học sinh
            </span>
            <span className="text-2xl font-black text-white">{totalStudents} HS</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider block">
              Đã thu đáp án
            </span>
            <span className="text-2xl font-black text-emerald-400">
              {totalAnsweredStudents}/{totalStudents} HS
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider block">
              Điểm trung bình lớp
            </span>
            <span className="text-2xl font-black text-amber-400">{classAverageScore} / 10</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider block">
              Tỷ lệ hoàn thành
            </span>
            <span className="text-2xl font-black text-indigo-400">
              {totalStudents > 0 ? Math.round((totalAnsweredStudents / totalStudents) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* QUESTION-BY-QUESTION ANALYTICS CARDS */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-400" />
          <span>Phân tích thống kê từng câu hỏi ({session.questions.length} câu)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {session.questions.map((q, idx) => {
            const res = session.results[idx];
            const answers: Record<string, StudentAnswerRecord> = res?.answers || {};
            const totalAns = Object.keys(answers).length;

            const counts = { A: 0, B: 0, C: 0, D: 0 };
            Object.values(answers).forEach((a) => {
              if (counts[a.selectedOption] !== undefined) counts[a.selectedOption]++;
            });

            const correctCount = Object.values(answers).filter((a) => a.isCorrect).length;
            const correctPercent = totalAns > 0 ? Math.round((correctCount / totalAns) * 100) : 0;

            return (
              <div
                key={q.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-md"
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-2.5">
                  <div className="space-y-1">
                    <span className="font-mono text-xs font-black text-amber-400">
                      CÂU {idx + 1}
                    </span>
                    <h4 className="text-sm font-bold text-slate-100 leading-snug">
                      {q.question}
                    </h4>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-block">
                      Đúng: {q.correctAnswer}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {correctCount}/{totalAns} đúng ({correctPercent}%)
                    </div>
                  </div>
                </div>

                {/* Option Distribution Bars */}
                <div className="space-y-2 text-xs">
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                    const isCorrect = q.correctAnswer === opt;
                    const c = counts[opt];
                    const pct = totalAns > 0 ? Math.round((c / totalAns) * 100) : 0;

                    return (
                      <div key={opt} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={`font-bold ${isCorrect ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {opt}. {q.options[opt]} {isCorrect ? '✅' : ''}
                          </span>
                          <span className="font-mono font-bold text-slate-400">
                            {c} HS ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isCorrect ? 'bg-emerald-500' : 'bg-slate-700'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETAILED STUDENT RESULTS TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-wide">
              BẢNG ĐIỂM CHI TIẾT THEO HỌC SINH
            </h3>
            <span className="text-xs text-slate-400">({filteredStudents.length} học sinh)</span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm theo tên, mã HS, mã thẻ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-56 sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">STT</th>
                <th className="py-2.5 px-3">Mã Thẻ</th>
                <th className="py-2.5 px-3">Họ và tên</th>
                <th className="py-2.5 px-3">Mã HS</th>
                {session.questions.map((_, qIdx) => (
                  <th key={qIdx} className="py-2.5 px-2 text-center">
                    C{qIdx + 1}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-center">Số câu đúng</th>
                <th className="py-2.5 px-3 text-right">Điểm (Thang 10)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredStudents.map((p, idx) => (
                <tr key={p.studentId} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 text-[11px]">
                      #{p.cardId || '—'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-100">{p.studentName}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">{p.studentCode || '—'}</td>

                  {/* Question Results Checkmarks */}
                  {session.questions.map((q, qIdx) => {
                    const ans = session.results[qIdx]?.answers[p.studentId];
                    return (
                      <td key={qIdx} className="py-2.5 px-2 text-center font-bold">
                        {ans ? (
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                              ans.isCorrect
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            {ans.selectedOption} {ans.isCorrect ? '✓' : '✗'}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    );
                  })}

                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200">
                    {p.correctCount} / {p.totalQuestions}
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    <span
                      className={`font-black text-sm px-2.5 py-0.5 rounded-xl font-mono ${
                        p.calculatedScore >= 8.0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : p.calculatedScore >= 6.5
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : p.calculatedScore >= 5.0
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {p.calculatedScore}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CHUYỂN ĐIỂM VÀO SỔ ĐIỂM TX (AN TOÀN CÓ XEM TRƯỚC VÀ XÁC NHẬN) */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Chuyển Điểm Vào Sổ Điểm TX</h3>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Verification Banner: Lớp + Môn */}
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Lớp:</span>
                  <span className="font-extrabold text-white bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
                    {session.className}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Môn học:</span>
                  <span className="font-extrabold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                    {session.subject || 'Toán'}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 truncate max-w-xs">
                {session.title}
              </span>
            </div>

            {/* Target Column Selector */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
              <label className="block text-slate-300 font-bold text-xs">
                Chọn cột điểm Thường Xuyên (TX) cần ghi vào môn {session.subject || 'Toán'}:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['tx1', 'tx2', 'tx3', 'tx4'] as const).map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => handleSlotChange(slot)}
                    className={`py-2 px-3 rounded-xl font-black text-xs uppercase border transition-all ${
                      selectedTxSlot === slot
                        ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    {slot.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Conflict Warning & Safety Option */}
            {transferItems.some((it) => it.hasConflict && it.selectedForTransfer) && (
              <div className="p-3.5 bg-amber-950/80 border border-amber-500/50 rounded-2xl text-xs text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Cảnh báo: Có ô điểm đã chứa dữ liệu từ trước!</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Một số học sinh trong lớp đã có điểm ở cột {selectedTxSlot.toUpperCase()}.
                  Để bảo vệ dữ liệu giáo viên, mặc định hệ thống sẽ không ghi đè trừ khi Thầy/Cô tích chọn đồng ý bên dưới.
                </p>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-300 pt-1 select-none">
                  <input
                    type="checkbox"
                    checked={allowOverwriteConflicts}
                    onChange={(e) => setAllowOverwriteConflicts(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-900 border-slate-700"
                  />
                  <span>Xác nhận cho phép ghi đè điểm cũ bằng điểm kiểm tra mới này</span>
                </label>
              </div>
            )}

            {/* Preview Student Scores Table */}
            <div className="flex-1 overflow-y-auto space-y-1.5 max-h-64 border border-slate-800 rounded-2xl p-2 bg-slate-950/50">
              {transferItems.map((item) => (
                <div
                  key={item.studentId}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    item.hasConflict
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={item.selectedForTransfer}
                      onChange={(e) => {
                        setTransferItems(
                          transferItems.map((it) =>
                            it.studentId === item.studentId
                              ? { ...it, selectedForTransfer: e.target.checked }
                              : it
                          )
                        );
                      }}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-slate-800 border-slate-700"
                    />
                    <div>
                      <span className="font-bold text-slate-200">{item.studentName}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Đúng {item.correctCount}/{item.totalQuestions} câu
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {item.hasConflict && (
                      <span className="text-[11px] text-slate-400">
                        Điểm cũ: <strong className="text-amber-400">{item.existingScore}</strong>
                      </span>
                    )}

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 text-[11px]">Điểm mới:</span>
                      <span className="font-black font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-500/40">
                        {item.calculatedScore}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer confirmation */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Sẽ ghi điểm cho{' '}
                <strong className="text-white">
                  {transferItems.filter((it) => it.selectedForTransfer).length} học sinh
                </strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTransfer}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Xác Nhận Ghi Điểm Vào Sổ Môn {session.subject || 'Toán'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
