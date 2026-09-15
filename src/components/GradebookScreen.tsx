import React, { useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Save,
  Trash2,
  Award,
  Sparkles,
  BarChart2,
  Search,
  Filter,
  CheckCircle,
  HelpCircle,
  MessageSquare,
  Lightbulb,
  Check,
  ChevronDown,
  Settings,
  X,
  Keyboard,
  BookOpen,
} from 'lucide-react';
import { ClassRoom, Student } from '../types';
import { calculateStudentGrade } from '../utils/gradeCalculator';
import { exportEduGradebookToExcel, exportVnEduGradebookToExcel } from '../utils/gradeExporter';
import {
  getAutoCommentByScore,
  getCommentSuggestionsForStudent,
  QUICK_TAG_COMMENTS,
  loadScoreCommentRules,
  getCommentFromRules,
} from '../utils/vnEduComments';
import { AutoCommentRulesModal } from './AutoCommentRulesModal';
import { soundEngine } from '../utils/audio';

const GRADEBOOK_SUBJECT_OPTIONS = [
  'Giáo dục địa phương',
  'Toán',
  'Ngữ văn',
  'Tiếng Anh',
  'Khoa học tự nhiên',
  'Lịch sử & Địa lí',
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
  'Hoạt động trải nghiệm',
];

interface GradebookScreenProps {
  classes: ClassRoom[];
  activeClassId: string;
  onSelectClass: (id: string) => void;
  onUpdateClassStudents: (classId: string, students: Student[]) => void;
  onUpdateAllClasses?: (updatedClasses: ClassRoom[]) => void;
  onAwardStars: (studentId: string, count: number) => void;
}

export const GradebookScreen: React.FC<GradebookScreenProps> = ({
  classes,
  activeClassId,
  onSelectClass,
  onUpdateClassStudents,
  onUpdateAllClasses,
  onAwardStars,
}) => {
  const currentClass = classes.find((c) => c.id === activeClassId) || classes[0];
  const [searchTerm, setSearchTerm] = useState('');
  const [quickSaveFeedback, setQuickSaveFeedback] = useState<string | null>(null);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);

  // Subject selector state
  const [isSubjectSelectorOpen, setIsSubjectSelectorOpen] = useState(false);
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [exportSubject, setExportSubject] = useState(currentClass?.subject || 'Giáo dục địa phương');

  useEffect(() => {
    if (currentClass) {
      setExportSubject(currentClass.subject || 'Giáo dục địa phương');
    }
  }, [currentClass?.id, currentClass?.subject]);

  // Auto-comment rules modal state
  const [isAutoCommentModalOpen, setIsAutoCommentModalOpen] = useState(false);

  // vnEdu Export config modal state
  const [isExportConfigOpen, setIsExportConfigOpen] = useState(false);
  const [schoolName, setSchoolName] = useState('TRƯỜNG TH & THCS LƯƠNG CHÍ');
  const [schoolYear, setSchoolYear] = useState('2025-2026');
  const [semester, setSemester] = useState('HỌC KỲ 1');

  // Single student suggestion popover state
  const [activeSuggestionStudentId, setActiveSuggestionStudentId] = useState<string | null>(null);
  const [activeSuggestionTab, setActiveSuggestionTab] = useState<number>(0);

  if (!currentClass) {
    return (
      <div className="text-center py-20 text-slate-400">
        Chưa có dữ liệu lớp học. Vui lòng tạo lớp hoặc nhập danh sách học sinh trước.
      </div>
    );
  }

  // Columns order for Excel-like keyboard navigation
  const GRADE_COLUMNS = ['tx1', 'tx2', 'tx3', 'tx4', 'gk', 'ck', 'notes'] as const;
  type GradeColumn = typeof GRADE_COLUMNS[number];

  // Temporary draft strings for active score editing so decimals (e.g. 8. or 8,) are not truncated while typing
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});

  const handleScoreChange = (
    studentId: string,
    field: 'tx1' | 'tx2' | 'tx3' | 'tx4' | 'gk' | 'ck',
    valStr: string
  ) => {
    let numVal: number | null = null;
    if (valStr.trim() !== '') {
      const parsed = parseFloat(valStr.replace(',', '.'));
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 10) {
        numVal = Math.round(parsed * 10) / 10;
      } else {
        return; // invalid number
      }
    }

    const updatedStudents = currentClass.students.map((std) => {
      if (std.id !== studentId) return std;
      return {
        ...std,
        scores: {
          ...(std.scores || {}),
          [field]: numVal,
        },
      };
    });

    onUpdateClassStudents(currentClass.id, updatedStudents);
  };

  const handleScoreInputChange = (
    studentId: string,
    field: 'tx1' | 'tx2' | 'tx3' | 'tx4' | 'gk' | 'ck',
    rawVal: string
  ) => {
    const draftKey = `${studentId}-${field}`;
    // Allow digits, decimal points and commas up to 4 characters
    const cleaned = rawVal.replace(/[^0-9.,]/g, '').slice(0, 4);
    setScoreDrafts((prev) => ({ ...prev, [draftKey]: cleaned }));

    if (cleaned.trim() === '') {
      handleScoreChange(studentId, field, '');
      return;
    }

    // Only commit immediately if it does not end with pending decimal point or comma
    if (!cleaned.endsWith('.') && !cleaned.endsWith(',')) {
      const parsed = parseFloat(cleaned.replace(',', '.'));
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 10) {
        handleScoreChange(studentId, field, cleaned);
      }
    }
  };

  const handleScoreInputBlur = (
    studentId: string,
    field: 'tx1' | 'tx2' | 'tx3' | 'tx4' | 'gk' | 'ck'
  ) => {
    const draftKey = `${studentId}-${field}`;
    const draftVal = scoreDrafts[draftKey];
    if (draftVal !== undefined) {
      setScoreDrafts((prev) => {
        const next = { ...prev };
        delete next[draftKey];
        return next;
      });
      if (draftVal.trim() === '') {
        handleScoreChange(studentId, field, '');
      } else {
        const parsed = parseFloat(draftVal.replace(',', '.'));
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 10) {
          handleScoreChange(studentId, field, String(Math.round(parsed * 10) / 10));
        }
      }
    }
  };

  const getScoreInputValue = (
    studentId: string,
    field: 'tx1' | 'tx2' | 'tx3' | 'tx4' | 'gk' | 'ck',
    actualScore: number | null | undefined
  ) => {
    const draftKey = `${studentId}-${field}`;
    if (scoreDrafts[draftKey] !== undefined) {
      return scoreDrafts[draftKey];
    }
    return actualScore !== undefined && actualScore !== null ? String(actualScore) : '';
  };

  // Keyboard navigation like Excel: Enter / ArrowDown / ArrowUp / Tab / ArrowLeft / ArrowRight
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    field: GradeColumn,
    totalRows: number
  ) => {
    const colIndex = GRADE_COLUMNS.indexOf(field);
    if (colIndex === -1) return;

    const navigateTo = (targetRow: number, targetCol: number) => {
      const targetField = GRADE_COLUMNS[targetCol];
      const targetEl = document.getElementById(
        `grade-input-${targetRow}-${targetField}`
      ) as HTMLInputElement | null;
      if (targetEl) {
        targetEl.focus();
        targetEl.select();
        targetEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      }
    };

    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift + Enter: Di chuyển lên dòng trên
        if (rowIndex > 0) {
          navigateTo(rowIndex - 1, colIndex);
        }
      } else {
        // Enter: Di chuyển xuống dòng dưới
        if (rowIndex < totalRows - 1) {
          navigateTo(rowIndex + 1, colIndex);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Mũi tên xuống: Di chuyển xuống dòng dưới cùng cột
      if (rowIndex < totalRows - 1) {
        navigateTo(rowIndex + 1, colIndex);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Mũi tên lên: Di chuyển lên dòng trên cùng cột
      if (rowIndex > 0) {
        navigateTo(rowIndex - 1, colIndex);
      }
    } else if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      const isAtEnd = input.selectionEnd === input.value.length;
      const isAllSelected =
        input.selectionStart === 0 && input.selectionEnd === input.value.length;

      // Nếu đang ở cuối nội dung hoặc bôi đen cả ô thì chuyển sang cột tiếp theo
      if (isAtEnd || isAllSelected) {
        if (colIndex < GRADE_COLUMNS.length - 1) {
          e.preventDefault();
          navigateTo(rowIndex, colIndex + 1);
        } else if (rowIndex < totalRows - 1) {
          e.preventDefault();
          navigateTo(rowIndex + 1, 0);
        }
      }
    } else if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      const isAtStart = input.selectionStart === 0 && input.selectionEnd === 0;
      const isAllSelected =
        input.selectionStart === 0 && input.selectionEnd === input.value.length;

      // Nếu đang ở đầu nội dung hoặc bôi đen cả ô thì chuyển sang cột trước đó
      if (isAtStart || isAllSelected) {
        if (colIndex > 0) {
          e.preventDefault();
          navigateTo(rowIndex, colIndex - 1);
        } else if (rowIndex > 0) {
          e.preventDefault();
          navigateTo(rowIndex - 1, GRADE_COLUMNS.length - 1);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift + Tab: Lùi cột
        if (colIndex > 0) {
          navigateTo(rowIndex, colIndex - 1);
        } else if (rowIndex > 0) {
          navigateTo(rowIndex - 1, GRADE_COLUMNS.length - 1);
        }
      } else {
        // Tab: Tiến cột, đến cuối thì xuống dòng đầu của học sinh tiếp theo
        if (colIndex < GRADE_COLUMNS.length - 1) {
          navigateTo(rowIndex, colIndex + 1);
        } else if (rowIndex < totalRows - 1) {
          navigateTo(rowIndex + 1, 0);
        }
      }
    }
  };

  const handleNoteChange = (studentId: string, noteStr: string) => {
    const updatedStudents = currentClass.students.map((std) => {
      if (std.id !== studentId) return std;
      return {
        ...std,
        notes: noteStr,
      };
    });
    onUpdateClassStudents(currentClass.id, updatedStudents);
  };

  // Instant 1-click batch fill for current class using saved rules
  const handleInstantAutoCommentCurrentClass = () => {
    const savedRules = loadScoreCommentRules();
    const updatedStudents = currentClass.students.map((student, idx) => {
      const summary = calculateStudentGrade(student);
      const comment = getCommentFromRules(summary.finalAvg, savedRules, true, idx);
      return {
        ...student,
        notes: comment,
      };
    });

    onUpdateClassStudents(currentClass.id, updatedStudents);
    soundEngine.playSuccess();
    setQuickSaveFeedback(`⚡ Đã điền nhận xét tự động cho Lớp ${currentClass.name} (${currentClass.students.length} HS)!`);
    setIsQuickMenuOpen(false);
    setTimeout(() => setQuickSaveFeedback(null), 3500);
  };

  // Instant 1-click batch fill for ALL classes
  const handleInstantAutoCommentAllClasses = () => {
    const savedRules = loadScoreCommentRules();
    const totalCount = classes.reduce((sum, c) => sum + (c.students?.length || 0), 0);

    const updatedClasses = classes.map((cls) => {
      const updatedStudents = cls.students.map((student, idx) => {
        const summary = calculateStudentGrade(student);
        const comment = getCommentFromRules(summary.finalAvg, savedRules, true, idx);
        return {
          ...student,
          notes: comment,
        };
      });
      return {
        ...cls,
        students: updatedStudents,
        updatedAt: new Date().toISOString(),
      };
    });

    if (onUpdateAllClasses) {
      onUpdateAllClasses(updatedClasses);
    } else {
      updatedClasses.forEach((c) => onUpdateClassStudents(c.id, c.students));
    }

    soundEngine.playSuccess();
    setQuickSaveFeedback(`🚀 Đã điền nhận xét tự động cho TẤT CẢ ${classes.length} LỚP (${totalCount} HS)!`);
    setIsQuickMenuOpen(false);
    setTimeout(() => setQuickSaveFeedback(null), 4000);
  };

  const handleApplyRulesCurrentClass = (updatedStudents: Student[]) => {
    onUpdateClassStudents(currentClass.id, updatedStudents);
    setQuickSaveFeedback(`⚡ Đã cập nhật nhận xét cho Lớp ${currentClass.name}!`);
    setTimeout(() => setQuickSaveFeedback(null), 3500);
  };

  const handleApplyRulesAllClasses = (updatedClasses: ClassRoom[]) => {
    if (onUpdateAllClasses) {
      onUpdateAllClasses(updatedClasses);
    } else {
      updatedClasses.forEach((c) => onUpdateClassStudents(c.id, c.students));
    }
    const totalCount = updatedClasses.reduce((sum, c) => sum + (c.students?.length || 0), 0);
    setQuickSaveFeedback(`🚀 Đã áp dụng nhận xét cho TẤT CẢ ${updatedClasses.length} Lớp (${totalCount} HS)!`);
    setTimeout(() => setQuickSaveFeedback(null), 4000);
  };

  // Change subject for current class
  const handleSelectSubject = (newSubject: string) => {
    const trimmed = newSubject.trim();
    if (!trimmed) return;
    if (onUpdateAllClasses) {
      const updated = classes.map((c) =>
        c.id === currentClass.id ? { ...c, subject: trimmed, updatedAt: new Date().toISOString() } : c
      );
      onUpdateAllClasses(updated);
    }
    setExportSubject(trimmed);
    setIsSubjectSelectorOpen(false);
    soundEngine.playSuccess();
    setQuickSaveFeedback(`Đã cập nhật môn học lớp ${currentClass.name} thành "${trimmed}"!`);
    setTimeout(() => setQuickSaveFeedback(null), 3000);
  };

  // Export vnEdu Template
  const handleExportVnEdu = () => {
    exportVnEduGradebookToExcel(currentClass, schoolName, schoolYear, semester, exportSubject);
    soundEngine.playSuccess();
    setIsExportConfigOpen(false);
    setQuickSaveFeedback('📗 Đã xuất file Excel chuẩn vnEdu thành công!');
    setTimeout(() => setQuickSaveFeedback(null), 3000);
  };

  // Export Detailed Gradebook
  const handleExportDetailed = () => {
    exportEduGradebookToExcel(currentClass);
    soundEngine.playSuccess();
    setQuickSaveFeedback('📊 Đã xuất file Excel sổ điểm chi tiết!');
    setTimeout(() => setQuickSaveFeedback(null), 3000);
  };


  const filteredStudents = currentClass.students.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.studentCode && s.studentCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Stats calculation
  const totalStudents = currentClass.students.length;
  const gradeSummaries = currentClass.students.map((s) => calculateStudentGrade(s));
  const gradedStudentsCount = gradeSummaries.filter((g) => g.finalAvg !== null).length;
  const avgClassScore =
    gradedStudentsCount > 0
      ? (
          gradeSummaries.reduce((sum, g) => sum + (g.finalAvg || 0), 0) /
          gradedStudentsCount
        ).toFixed(1)
      : '—';

  const excellentCount = gradeSummaries.filter((g) => g.evaluation === 'Xuất sắc' || g.evaluation === 'Giỏi').length;
  const passedCount = gradeSummaries.filter((g) => g.evaluation !== 'Chưa đạt' && g.evaluation !== 'Chưa đủ điểm').length;
  const commentedCount = currentClass.students.filter((s) => s.notes && s.notes.trim() !== '').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-2xl border border-emerald-500/30 shadow-inner">
            📊
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Sổ Điểm Bộ Môn (Chuẩn vnEdu / Bộ GD&ĐT)
              </h1>

              {/* Dynamic Subject Selector Badge */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSubjectSelectorOpen(!isSubjectSelectorOpen)}
                  className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40 flex items-center gap-1.5 transition-all shadow-sm group"
                  title="Nhấn để đổi môn học cho lớp này"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Môn: {currentClass.subject || 'Giáo dục địa phương'}</span>
                  <ChevronDown className={`w-3 h-3 text-emerald-400/80 transition-transform ${isSubjectSelectorOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Subject Selector Dropdown */}
                {isSubjectSelectorOpen && (
                  <div className="absolute left-0 top-full mt-2 z-50 w-72 sm:w-80 bg-slate-950 border border-emerald-500/40 rounded-2xl shadow-2xl p-3 space-y-2.5 animate-scale-in">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                      <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Chọn môn học cho lớp {currentClass.name}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsSubjectSelectorOpen(false)}
                        className="text-slate-500 hover:text-slate-300 text-xs p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Chọn nhanh môn học theo chương trình GDPT 2018:
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {GRADEBOOK_SUBJECT_OPTIONS.map((subj) => (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => handleSelectSubject(subj)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                            (currentClass.subject || 'Giáo dục địa phương') === subj
                              ? 'bg-emerald-600 text-white font-bold border-emerald-400 shadow-sm'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          {subj === 'Giáo dục địa phương' ? '🏛️ Giáo dục địa phương' : subj}
                        </button>
                      ))}
                    </div>

                    {/* Custom Subject Input */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Hoặc tự gõ tên môn khác..."
                        value={customSubjectInput}
                        onChange={(e) => setCustomSubjectInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && customSubjectInput.trim()) {
                            handleSelectSubject(customSubjectInput.trim());
                            setCustomSubjectInput('');
                          }
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customSubjectInput.trim()) {
                            handleSelectSubject(customSubjectInput.trim());
                            setCustomSubjectInput('');
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                      >
                        Lưu
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Đồng bộ 2 chiều với vnEdu, tự động nhận xét theo thang điểm &amp; tính ĐTBmhk
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Class Select */}
          <select
            value={activeClassId}
            onChange={(e) => onSelectClass(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-emerald-500 shadow-sm"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                Lớp {c.name} ({c.students.length} HS)
              </option>
            ))}
          </select>

          {/* Quick 1-Click Auto Fill Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setIsQuickMenuOpen(!isQuickMenuOpen)}
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-amber-900/30 transition-all active:scale-95 border border-amber-400/30"
              title="Điền nhận xét tự động ngay lập tức (1 chạm)"
            >
              <span>⚡</span>
              <span>Điền Nhận Xét Nhanh</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isQuickMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Quick Menu Dropdown */}
            {isQuickMenuOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-slate-950 border border-amber-500/40 rounded-2xl shadow-2xl p-2 space-y-1.5 animate-scale-in">
                <div className="text-[11px] font-bold text-amber-300 px-2.5 py-1 border-b border-slate-800">
                  ⚡ Chọn phạm vi điền nhận xét 1 chạm:
                </div>
                <button
                  onClick={handleInstantAutoCommentCurrentClass}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-900 hover:bg-amber-950/60 text-slate-200 hover:text-white border border-slate-800 hover:border-amber-500/40 transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs text-amber-200">
                      ⚡ Chỉ Lớp {currentClass.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Điền ngay cho {currentClass.students.length} học sinh
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    Lớp này
                  </span>
                </button>

                <button
                  onClick={handleInstantAutoCommentAllClasses}
                  className="w-full text-left p-2.5 rounded-xl bg-gradient-to-r from-purple-950/80 to-indigo-950/80 hover:from-purple-900 hover:to-indigo-900 text-white border border-purple-500/40 hover:border-purple-400 transition-all flex items-center justify-between shadow-md"
                >
                  <div>
                    <div className="font-black text-xs text-purple-200 flex items-center gap-1">
                      <span>🚀 TẤT CẢ CÁC LỚP</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500 text-white font-black">
                        1 CHẠM
                      </span>
                    </div>
                    <div className="text-[10px] text-purple-300/80">
                      Áp dụng cho {classes.length} lớp ({classes.reduce((sum, c) => sum + (c.students?.length || 0), 0)} HS)
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Auto Comments Configuration Matrix Modal Button */}
          <button
            onClick={() => setIsAutoCommentModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-purple-900/40 transition-all active:scale-95 border border-purple-400/40"
            title="Mở bảng cấu hình khoảng điểm & câu nhận xét tự động"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Bảng Nhận Xét Theo Điểm</span>
          </button>

          {/* vnEdu Export Button */}
          <button
            onClick={() => setIsExportConfigOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-95 border border-emerald-400/30"
            title="Xuất file Excel đúng định dạng mẫu bảng điểm vnEdu"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Chuẩn vnEdu (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Class Statistics Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="text-xs font-semibold text-slate-400">Sĩ số lớp {currentClass.name}</div>
          <div className="text-2xl font-black text-white mt-1">
            {totalStudents} <span className="text-xs font-normal text-slate-400">học sinh</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Đã có điểm: {gradedStudentsCount}/{totalStudents}</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="text-xs font-semibold text-slate-400">Điểm Trung Bình Môn</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {avgClassScore} <span className="text-xs font-normal text-slate-400">/ 10</span>
          </div>
          <div className="text-[11px] text-emerald-400/70 mt-1">Chuẩn quy chế Bộ GD&ĐT</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="text-xs font-semibold text-slate-400">Học sinh Giỏi / Xuất sắc</div>
          <div className="text-2xl font-black text-indigo-400 mt-1">
            {excellentCount} <span className="text-xs font-normal text-slate-400">HS</span>
          </div>
          <div className="text-[11px] text-indigo-400/70 mt-1">ĐTB từ 8.0 trở lên</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="text-xs font-semibold text-slate-400">Đã Có Nhận Xét</div>
          <div className="text-2xl font-black text-purple-400 mt-1">
            {commentedCount}/{totalStudents}
          </div>
          <div className="text-[11px] text-purple-400/70 mt-1">
            {totalStudents > 0 ? Math.round((commentedCount / totalStudents) * 100) : 0}% hoàn thành
          </div>
        </div>
      </div>

      {/* Grade Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        {/* Search and Helper Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên học sinh hoặc mã HS..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            {quickSaveFeedback && (
              <span className="flex items-center gap-1 text-emerald-400 font-bold animate-pulse">
                <CheckCircle className="w-4 h-4" /> Đã lưu tự động & xuất file thành công!
              </span>
            )}
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" /> Tự động lưu mọi thay đổi
            </span>
          </div>
        </div>

        {/* Keyboard Navigation Tip */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-2">
            <Keyboard className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <span className="font-bold text-slate-200">Nhập điểm nhanh:</span>
            <span className="text-slate-400">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono font-bold text-[11px] border border-slate-700">Enter</kbd> hoặc <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono font-bold text-[11px] border border-slate-700">↓</kbd> xuống dòng • <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono font-bold text-[11px] border border-slate-700">↑</kbd> lên dòng • <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono font-bold text-[11px] border border-slate-700">Tab</kbd> hoặc <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono font-bold text-[11px] border border-slate-700">→</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono font-bold text-[11px] border border-slate-700">←</kbd> chuyển cột
            </span>
          </div>
          <span className="text-[11px] text-emerald-400 font-medium">
            ⚡ Tự động bôi đen ô khi chuyển đến để gõ đè ngay
          </span>
        </div>

        {/* Grade Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
            <thead>
              {/* Header row 1 */}
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider">
                <th rowSpan={2} className="py-3 px-2 text-center w-10 border-r border-slate-800">STT</th>
                <th rowSpan={2} className="py-3 px-3 w-44 border-r border-slate-800">Họ và tên học sinh</th>
                <th rowSpan={2} className="py-3 px-2 text-center w-16 border-r border-slate-800" title="Số lần lên bảng kiểm tra bài cũ">
                  Lên bảng
                </th>
                <th rowSpan={2} className="py-3 px-2 text-center w-14 border-r border-slate-800" title="Sao thưởng tích lũy">
                  ⭐ Sao
                </th>
                <th colSpan={4} className="py-2 px-2 text-center bg-sky-950/40 text-sky-300 border-r border-slate-800 border-b border-sky-800/40">
                  ĐĐGtx (Thường Xuyên / Miệng & 15p)
                </th>
                <th rowSpan={2} className="py-3 px-2 text-center w-20 bg-indigo-950/40 text-indigo-300 border-r border-slate-800">
                  ĐĐGgk (x2)
                </th>
                <th rowSpan={2} className="py-3 px-2 text-center w-20 bg-purple-950/40 text-purple-300 border-r border-slate-800">
                  ĐĐGck (x3)
                </th>
                <th rowSpan={2} className="py-3 px-2 text-center w-20 bg-emerald-950/40 text-emerald-300 border-r border-slate-800">
                  ĐTB mhk
                </th>
                <th rowSpan={2} className="py-3 px-2 text-center w-24 border-r border-slate-800">
                  Xếp loại
                </th>
                <th rowSpan={2} className="py-3 px-3">
                  Nhận xét đánh giá môn {currentClass.subject || 'Giáo dục địa phương'} (vnEdu)
                </th>
              </tr>
              {/* Header row 2 */}
              <tr className="border-b border-slate-800 bg-slate-950/90 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-1 px-1 text-center w-14 bg-sky-950/30 text-sky-300 border-r border-slate-800">TX1</th>
                <th className="py-1 px-1 text-center w-14 bg-sky-950/30 text-sky-300 border-r border-slate-800">TX2</th>
                <th className="py-1 px-1 text-center w-14 bg-sky-950/30 text-sky-300 border-r border-slate-800">TX3</th>
                <th className="py-1 px-1 text-center w-14 bg-sky-950/30 text-sky-300 border-r border-slate-800">TX4</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-500">
                    Không tìm thấy học sinh phù hợp.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const summary = calculateStudentGrade(student);
                  const scores = student.scores || {};
                  const suggestions = getCommentSuggestionsForStudent(summary.finalAvg, currentClass.subject || 'Giáo dục địa phương');
                  const isSuggestionOpen = activeSuggestionStudentId === student.id;

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-800/40 transition-colors group relative"
                    >
                      <td className="py-2.5 px-2 text-center font-bold text-slate-500 border-r border-slate-800/60">
                        {idx + 1}
                      </td>

                      <td className="py-2.5 px-3 border-r border-slate-800/60">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{student.name}</span>
                          {student.gender === 'nu' && (
                            <span className="text-[10px] text-pink-400 font-normal">(Nữ)</span>
                          )}
                        </div>
                        {student.studentCode && (
                          <div className="text-[10px] text-slate-500">{student.studentCode}</div>
                        )}
                      </td>

                      {/* Call count */}
                      <td className="py-2.5 px-2 text-center border-r border-slate-800/60">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-black ${
                            student.callCount > 0
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/30'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {student.callCount || 0}
                        </span>
                      </td>

                      {/* Stars */}
                      <td className="py-2.5 px-2 text-center border-r border-slate-800/60">
                        <button
                          onClick={() => onAwardStars(student.id, 1)}
                          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 hover:bg-amber-800/80 border border-amber-500/30 font-black text-xs transition-all"
                          title="Bấm để thưởng thêm 1 sao"
                        >
                          <span>{student.stars || 0}</span>
                          <span>⭐</span>
                        </button>
                      </td>

                      {/* TX1 */}
                      <td className="py-2 px-1 text-center bg-sky-950/10 border-r border-slate-800/40">
                        <input
                          id={`grade-input-${idx}-tx1`}
                          type="text"
                          maxLength={4}
                          value={getScoreInputValue(student.id, 'tx1', scores.tx1)}
                          onChange={(e) => handleScoreInputChange(student.id, 'tx1', e.target.value)}
                          onBlur={() => handleScoreInputBlur(student.id, 'tx1')}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'tx1', filteredStudents.length)}
                          placeholder="—"
                          className="w-12 text-center font-bold bg-slate-950 border border-slate-700/80 rounded-lg py-1 text-xs text-white focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                        />
                      </td>

                      {/* TX2 */}
                      <td className="py-2 px-1 text-center bg-sky-950/10 border-r border-slate-800/40">
                        <input
                          id={`grade-input-${idx}-tx2`}
                          type="text"
                          maxLength={4}
                          value={getScoreInputValue(student.id, 'tx2', scores.tx2)}
                          onChange={(e) => handleScoreInputChange(student.id, 'tx2', e.target.value)}
                          onBlur={() => handleScoreInputBlur(student.id, 'tx2')}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'tx2', filteredStudents.length)}
                          placeholder="—"
                          className="w-12 text-center font-bold bg-slate-950 border border-slate-700/80 rounded-lg py-1 text-xs text-white focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                        />
                      </td>

                      {/* TX3 */}
                      <td className="py-2 px-1 text-center bg-sky-950/10 border-r border-slate-800/40">
                        <input
                          id={`grade-input-${idx}-tx3`}
                          type="text"
                          maxLength={4}
                          value={getScoreInputValue(student.id, 'tx3', scores.tx3)}
                          onChange={(e) => handleScoreInputChange(student.id, 'tx3', e.target.value)}
                          onBlur={() => handleScoreInputBlur(student.id, 'tx3')}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'tx3', filteredStudents.length)}
                          placeholder="—"
                          className="w-12 text-center font-bold bg-slate-950 border border-slate-700/80 rounded-lg py-1 text-xs text-white focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                        />
                      </td>

                      {/* TX4 */}
                      <td className="py-2 px-1 text-center bg-sky-950/10 border-r border-slate-800/60">
                        <input
                          id={`grade-input-${idx}-tx4`}
                          type="text"
                          maxLength={4}
                          value={getScoreInputValue(student.id, 'tx4', scores.tx4)}
                          onChange={(e) => handleScoreInputChange(student.id, 'tx4', e.target.value)}
                          onBlur={() => handleScoreInputBlur(student.id, 'tx4')}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'tx4', filteredStudents.length)}
                          placeholder="—"
                          className="w-12 text-center font-bold bg-slate-950 border border-slate-700/80 rounded-lg py-1 text-xs text-white focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                        />
                      </td>

                      {/* GK (Giữa kỳ) */}
                      <td className="py-2 px-1 text-center bg-indigo-950/20 border-r border-slate-800/60">
                        <input
                          id={`grade-input-${idx}-gk`}
                          type="text"
                          maxLength={4}
                          value={getScoreInputValue(student.id, 'gk', scores.gk)}
                          onChange={(e) => handleScoreInputChange(student.id, 'gk', e.target.value)}
                          onBlur={() => handleScoreInputBlur(student.id, 'gk')}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'gk', filteredStudents.length)}
                          placeholder="—"
                          className="w-14 text-center font-black bg-slate-950 border border-indigo-500/50 rounded-lg py-1 text-xs text-indigo-300 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all"
                        />
                      </td>

                      {/* CK (Cuối kỳ) */}
                      <td className="py-2 px-1 text-center bg-purple-950/20 border-r border-slate-800/60">
                        <input
                          id={`grade-input-${idx}-ck`}
                          type="text"
                          maxLength={4}
                          value={getScoreInputValue(student.id, 'ck', scores.ck)}
                          onChange={(e) => handleScoreInputChange(student.id, 'ck', e.target.value)}
                          onBlur={() => handleScoreInputBlur(student.id, 'ck')}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, 'ck', filteredStudents.length)}
                          placeholder="—"
                          className="w-14 text-center font-black bg-slate-950 border border-purple-500/50 rounded-lg py-1 text-xs text-purple-300 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all"
                        />
                      </td>

                      {/* ĐTB Môn */}
                      <td className="py-2 px-2 text-center bg-emerald-950/20 font-black border-r border-slate-800/60">
                        {summary.finalAvg !== null ? (
                          <span
                            className={`text-sm ${
                              summary.finalAvg >= 8.0
                                ? 'text-emerald-400'
                                : summary.finalAvg >= 6.5
                                ? 'text-indigo-300'
                                : summary.finalAvg >= 5.0
                                ? 'text-amber-300'
                                : 'text-rose-400'
                            }`}
                          >
                            {summary.finalAvg}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Evaluation status */}
                      <td className="py-2 px-2 text-center border-r border-slate-800/60">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            summary.evaluation === 'Xuất sắc'
                              ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                              : summary.evaluation === 'Giỏi'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : summary.evaluation === 'Khá'
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/40'
                              : summary.evaluation === 'Đạt'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                              : summary.evaluation === 'Chưa đạt'
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {summary.evaluation}
                        </span>
                      </td>

                      {/* Comment Column with Quick Suggestions & Custom Input */}
                      <td className="py-2 px-3 relative">
                        <div className="flex items-center gap-1.5">
                          <input
                            id={`grade-input-${idx}-notes`}
                            type="text"
                            value={student.notes || ''}
                            onChange={(e) => handleNoteChange(student.id, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, 'notes', filteredStudents.length)}
                            placeholder="Gõ nhận xét hoặc bấm 💡 chọn mẫu..."
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                          />

                          {/* Quick Suggestion Button */}
                          <button
                            type="button"
                            onClick={() =>
                              setActiveSuggestionStudentId(isSuggestionOpen ? null : student.id)
                            }
                            className={`p-1.5 rounded-lg border text-xs flex items-center justify-center transition-all ${
                              isSuggestionOpen
                                ? 'bg-purple-600 text-white border-purple-400'
                                : 'bg-slate-800 text-slate-400 hover:text-amber-300 hover:bg-slate-700 border-slate-700'
                            }`}
                            title="Gợi ý câu nhận xét theo điểm"
                          >
                            <Lightbulb className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Interactive Suggestion Popover */}
                        {isSuggestionOpen && (
                          <div className="absolute right-3 top-full mt-1.5 z-50 w-96 bg-slate-950 border border-purple-500/40 rounded-2xl shadow-2xl p-3.5 text-xs animate-scale-in">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                              <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                <span>Gợi ý nhận xét cho {student.name}</span>
                                {summary.finalAvg !== null && (
                                  <span className="px-2 py-0.2 rounded-full bg-purple-900/60 text-[10px] text-purple-200">
                                    ĐTB: {summary.finalAvg}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => setActiveSuggestionStudentId(null)}
                                className="text-slate-500 hover:text-slate-300 p-0.5"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Suggestion tabs */}
                            <div className="flex items-center gap-1 mb-2.5 overflow-x-auto pb-1">
                              <button
                                onClick={() => setActiveSuggestionTab(0)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                                  activeSuggestionTab === 0
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                                }`}
                              >
                                🎯 Theo mức điểm ({summary.evaluation})
                              </button>
                              {QUICK_TAG_COMMENTS.map((cat, catIdx) => (
                                <button
                                  key={catIdx}
                                  onClick={() => setActiveSuggestionTab(catIdx + 1)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                                    activeSuggestionTab === catIdx + 1
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                                  }`}
                                >
                                  {cat.label}
                                </button>
                              ))}
                            </div>

                            {/* Suggestion list */}
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              {activeSuggestionTab === 0 ? (
                                suggestions.map((comm, commIdx) => (
                                  <button
                                    key={commIdx}
                                    onClick={() => {
                                      handleNoteChange(student.id, comm);
                                      setActiveSuggestionStudentId(null);
                                      soundEngine.playSuccess();
                                    }}
                                    className="w-full text-left p-2 rounded-xl bg-slate-900/80 hover:bg-purple-950/50 hover:border-purple-500/40 border border-slate-800/80 text-slate-300 text-xs transition-all flex items-start gap-2"
                                  >
                                    <span className="text-purple-400 mt-0.5">•</span>
                                    <span>{comm}</span>
                                  </button>
                                ))
                              ) : (
                                QUICK_TAG_COMMENTS[activeSuggestionTab - 1]?.comments.map((comm, commIdx) => (
                                  <button
                                    key={commIdx}
                                    onClick={() => {
                                      handleNoteChange(student.id, comm);
                                      setActiveSuggestionStudentId(null);
                                      soundEngine.playSuccess();
                                    }}
                                    className="w-full text-left p-2 rounded-xl bg-slate-900/80 hover:bg-purple-950/50 hover:border-purple-500/40 border border-slate-800/80 text-slate-300 text-xs transition-all flex items-start gap-2"
                                  >
                                    <span className="text-purple-400 mt-0.5">•</span>
                                    <span>{comm}</span>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Guidance & Actions */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300">Công thức tính điểm trung bình môn học kỳ (ĐTBmhk):</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono">
                ĐTBmhk = [Σ(ĐĐGtx) + 2*ĐĐGgk + 3*ĐĐGck] / (Số bài ĐĐGtx + 5)
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              * Tương thích 100% với hệ thống vnEdu & SMAS. Thầy cô có thể tải lên file bảng điểm tải từ vnEdu về hoặc xuất file từ đây để nộp.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportDetailed}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sổ điểm chi tiết (Có số lần lên bảng)</span>
            </button>

            <button
              onClick={() => setIsExportConfigOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/30"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Chuẩn vnEdu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Comment Rules Matrix Modal */}
      <AutoCommentRulesModal
        isOpen={isAutoCommentModalOpen}
        onClose={() => setIsAutoCommentModalOpen(false)}
        classes={classes}
        activeClassId={currentClass.id}
        onApplyCurrentClass={handleApplyRulesCurrentClass}
        onApplyAllClasses={handleApplyRulesAllClasses}
      />


      {/* vnEdu Export Config Modal */}
      {isExportConfigOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  📗
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Xuất File Bảng Điểm vnEdu</h3>
                  <p className="text-xs text-slate-400">Lớp {currentClass.name} ({currentClass.students.length} HS)</p>
                </div>
              </div>
              <button
                onClick={() => setIsExportConfigOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Môn Học (Bộ Môn vnEdu):</label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={exportSubject}
                    onChange={(e) => setExportSubject(e.target.value)}
                    placeholder="Ví dụ: Giáo dục địa phương, Toán..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['Giáo dục địa phương', 'Toán', 'Ngữ văn', 'Tiếng Anh', 'Khoa học tự nhiên', 'Lịch sử & Địa lí', 'Tin học', 'Công nghệ', 'GDCD'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setExportSubject(s)}
                        className={`text-[11px] px-2 py-0.5 rounded-lg border transition-colors ${
                          exportSubject === s
                            ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Tên Trường Học:</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Học Kỳ:</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                  >
                    <option value="HỌC KỲ 1">Học kỳ 1</option>
                    <option value="HỌC KỲ 2">Học kỳ 2</option>
                    <option value="CẢ NĂM">Cả năm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Năm Học:</label>
                  <input
                    type="text"
                    value={schoolYear}
                    onChange={(e) => setSchoolYear(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-300/90 leading-relaxed">
                ✓ File xuất ra có cấu trúc cột (STT, Họ đệm, Tên, TX1, TX2, TX3, TX4, ĐĐGgk, ĐĐGck, ĐTB mhk, Nhận xét) hoàn toàn tương thích để tải trực tiếp lên vnEdu.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsExportConfigOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Hủy
              </button>
              <button
                onClick={handleExportVnEdu}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-900/30"
              >
                <Download className="w-4 h-4" />
                <span>Tải File .xlsx Về Máy</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
