import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
  Sparkles,
  Layers,
  BookOpen,
  GraduationCap,
  CheckSquare,
  Square,
  Users,
  Eye,
} from 'lucide-react';
import { ClassRoom, ExcelPreviewRow, Student } from '../types';
import { parseExcelOrCSVFile, parsePastedText } from '../utils/excelParser';
import { soundEngine } from '../utils/audio';

export interface BatchImportClassItem {
  name: string;
  subject?: string;
  students: Student[];
  targetClassId?: string;
  mode?: 'REPLACE' | 'APPEND';
}

interface ExcelImportScreenProps {
  classes: ClassRoom[];
  activeClassId: string;
  onImportSuccess: (
    targetClassId: string,
    students: Student[],
    mode: 'REPLACE' | 'APPEND',
    newClassName?: string,
    newClassSubject?: string,
    batchClasses?: BatchImportClassItem[]
  ) => void;
  onCancel: () => void;
}

interface EditableParsedClass {
  id: string;
  sheetName?: string;
  className: string;
  subject: string;
  rows: ExcelPreviewRow[];
  warnings: string[];
  selected: boolean;
  targetMode: 'NEW' | 'CURRENT';
  targetClassId: string;
  importMode: 'REPLACE' | 'APPEND';
}

const COMMON_SUBJECTS = [
  'Toán',
  'Ngữ văn',
  'Tiếng Anh',
  'Vật lí',
  'Hóa học',
  'Sinh học',
  'Lịch sử',
  'Địa lí',
  'Tin học',
  'Công nghệ',
  'GDCD',
  'GDQP',
  'Khoa học tự nhiên',
  'Lịch sử & Địa lí',
  'Âm nhạc',
  'Mỹ thuật',
  'GDTC',
  'Hoạt động trải nghiệm',
];

export const ExcelImportScreen: React.FC<ExcelImportScreenProps> = ({
  classes,
  activeClassId,
  onImportSuccess,
  onCancel,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedClasses, setParsedClasses] = useState<EditableParsedClass[]>([]);
  const [activeClassIndex, setActiveClassIndex] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeInputTab, setActiveInputTab] = useState<'FILE' | 'PASTE'>('FILE');
  const [pastedContent, setPastedContent] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process File
  const handleFileChange = async (file: File) => {
    if (!file) return;
    setSelectedFile(file);
    setIsProcessing(true);

    try {
      const result = await parseExcelOrCSVFile(file);
      setWarnings(result.warnings || []);

      const detected = result.classes && result.classes.length > 0
        ? result.classes
        : [
            {
              id: `cls-1`,
              className: result.suggestedClassName || 'Lớp Mới',
              subject: result.suggestedSubject || '',
              rows: result.rows,
              warnings: result.warnings,
              selected: true,
            },
          ];

      const mapped: EditableParsedClass[] = detected.map((cls, idx) => ({
        id: cls.id || `cls-${idx}`,
        sheetName: cls.sheetName,
        className: cls.className || `Lớp ${idx + 1}`,
        subject: cls.subject || result.suggestedSubject || '',
        rows: cls.rows,
        warnings: cls.warnings || [],
        selected: true,
        targetMode: 'NEW',
        targetClassId: activeClassId,
        importMode: 'REPLACE',
      }));

      setParsedClasses(mapped);
      setActiveClassIndex(0);
      soundEngine.playTick(1.2);
    } catch (err) {
      console.error(err);
      setWarnings(['Không thể đọc file. Vui lòng kiểm tra định dạng .xlsx, .xls hoặc .csv']);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process Pasted Text
  const handleProcessPastedText = () => {
    if (!pastedContent.trim()) return;
    setIsProcessing(true);
    try {
      const result = parsePastedText(pastedContent);
      setWarnings(result.warnings || []);

      const detected = result.classes && result.classes.length > 0
        ? result.classes
        : [
            {
              id: `pasted-1`,
              className: result.suggestedClassName || 'Lớp Mới',
              subject: result.suggestedSubject || '',
              rows: result.rows,
              warnings: result.warnings,
              selected: true,
            },
          ];

      const mapped: EditableParsedClass[] = detected.map((cls, idx) => ({
        id: cls.id || `pasted-${idx}`,
        sheetName: cls.sheetName,
        className: cls.className || 'Lớp Mới',
        subject: cls.subject || '',
        rows: cls.rows,
        warnings: cls.warnings || [],
        selected: true,
        targetMode: 'NEW',
        targetClassId: activeClassId,
        importMode: 'REPLACE',
      }));

      setParsedClasses(mapped);
      setActiveClassIndex(0);
      soundEngine.playTick(1.2);
    } catch (err) {
      console.error(err);
      setWarnings(['Có lỗi khi xử lý văn bản đã dán.']);
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  const handleUpdateParsedClass = (index: number, updates: Partial<EditableParsedClass>) => {
    setParsedClasses((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleToggleSelectAll = (select: boolean) => {
    setParsedClasses((prev) => prev.map((c) => ({ ...c, selected: select })));
  };

  // Confirm Import
  const handleConfirmImportAll = () => {
    const selectedClasses = parsedClasses.filter((c) => c.selected && c.rows.length > 0);
    if (selectedClasses.length === 0) return;

    if (selectedClasses.length === 1) {
      const cls = selectedClasses[0];
      const finalStudents: Student[] = cls.rows.map((r, idx) => ({
        id: `std-import-${Date.now()}-${idx}`,
        name: r.name,
        studentCode: r.studentCode,
        gender: r.gender,
        callCount: r.callCount !== undefined ? r.callCount : 0,
        notes: r.notes,
        scores: r.scores,
      }));

      if (cls.targetMode === 'NEW') {
        const cName = cls.className.trim() || `Lớp Mới ${classes.length + 1}`;
        onImportSuccess('', finalStudents, 'REPLACE', cName, cls.subject.trim() || undefined);
      } else {
        onImportSuccess(cls.targetClassId, finalStudents, cls.importMode, undefined, cls.subject.trim() || undefined);
      }
    } else {
      // Multi-class batch
      const batch: BatchImportClassItem[] = selectedClasses.map((cls, cIdx) => {
        const students: Student[] = cls.rows.map((r, idx) => ({
          id: `std-import-${Date.now()}-${cIdx}-${idx}`,
          name: r.name,
          studentCode: r.studentCode,
          gender: r.gender,
          callCount: r.callCount !== undefined ? r.callCount : 0,
          notes: r.notes,
          scores: r.scores,
        }));

        return {
          name: cls.className.trim() || `Lớp ${cIdx + 1}`,
          subject: cls.subject.trim() || undefined,
          students,
          targetClassId: cls.targetMode === 'CURRENT' ? cls.targetClassId : undefined,
          mode: cls.importMode,
        };
      });

      onImportSuccess('', [], 'REPLACE', undefined, undefined, batch);
    }

    soundEngine.playVictoryFanfare();
  };

  const handleConfirmCurrentClassOnly = () => {
    const cls = parsedClasses[activeClassIndex];
    if (!cls || cls.rows.length === 0) return;

    const finalStudents: Student[] = cls.rows.map((r, idx) => ({
      id: `std-import-${Date.now()}-${idx}`,
      name: r.name,
      studentCode: r.studentCode,
      gender: r.gender,
      callCount: r.callCount !== undefined ? r.callCount : 0,
      notes: r.notes,
      scores: r.scores,
    }));

    if (cls.targetMode === 'NEW') {
      const cName = cls.className.trim() || `Lớp Mới ${classes.length + 1}`;
      onImportSuccess('', finalStudents, 'REPLACE', cName, cls.subject.trim() || undefined);
    } else {
      onImportSuccess(cls.targetClassId, finalStudents, cls.importMode, undefined, cls.subject.trim() || undefined);
    }

    soundEngine.playVictoryFanfare();
  };

  const handleClearPreview = () => {
    setParsedClasses([]);
    setSelectedFile(null);
    setWarnings([]);
    setPastedContent('');
    setActiveClassIndex(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const currentClass = parsedClasses[activeClassIndex];
  const selectedCount = parsedClasses.filter((c) => c.selected).length;
  const totalSelectedStudents = parsedClasses
    .filter((c) => c.selected)
    .reduce((sum, c) => sum + c.rows.length, 0);

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 space-y-6 animate-fade-in">
      {/* HTML5 Datalist for fast subject auto-complete */}
      <datalist id="suggested-subjects">
        {COMMON_SUBJECTS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {/* Header */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            <span>NHẬP DANH SÁCH HỌC SINH TỪ EXCEL</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Hỗ trợ file một lớp hoặc nhiều lớp (nhiều Sheet / cột Lớp) kèm nhận diện Môn học tự động từ VnEdu, SMAS, CSDL.
          </p>
        </div>
      </div>

      {parsedClasses.length === 0 ? (
        /* Step 1: Upload / Input */
        <div className="space-y-4">
          {/* Method tabs: File or Paste */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveInputTab('FILE')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeInputTab === 'FILE'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-800/60'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Tải file Excel (.xlsx, .csv)</span>
            </button>
            <button
              onClick={() => setActiveInputTab('PASTE')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeInputTab === 'PASTE'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-800/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Dán danh sách dạng chữ</span>
            </button>
          </div>

          {activeInputTab === 'FILE' ? (
            /* Drag and Drop Zone */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-emerald-400 bg-emerald-950/30 scale-101'
                  : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800/80 hover:border-indigo-500'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />

              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 mb-4">
                <UploadCloud className="w-8 h-8" />
              </div>

              <h3 className="text-base sm:text-lg font-black text-white">
                Kéo thả file Excel vào đây, hoặc nhấn để chọn file
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Hỗ trợ file chứa <strong>nhiều lớp</strong> (nhiều sheet hoặc chung sheet), tự nhận diện <strong>Tên lớp</strong> & <strong>Môn học</strong>
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Hỗ trợ nhiều Sheet / Nhiều Lớp
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Tự nhận diện Tên lớp & Môn học
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Tự động ghép Họ đệm + Tên
                </span>
              </div>
            </div>
          ) : (
            /* Paste area */
            <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-5 space-y-3">
              <label className="block text-xs font-bold text-slate-300">
                Dán cột danh sách học sinh từ file Excel hoặc Word:
              </label>
              <textarea
                rows={10}
                placeholder={`Lớp: 10A1\nMôn: Tin học\n1. Nguyễn Văn An\n2. Trần Thị Bình\n3. Lê Văn Chi\n4. Phạm Tiến Dũng`}
                value={pastedContent}
                onChange={(e) => setPastedContent(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-xs sm:text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleProcessPastedText}
                  disabled={!pastedContent.trim()}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Xem trước danh sách</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Step 2: Multi-class Review & Configuration */
        <div className="space-y-5">
          {/* Multi-class Banner if multiple classes detected */}
          {parsedClasses.length > 1 ? (
            <div className="bg-gradient-to-r from-indigo-950/80 via-purple-950/60 to-slate-900 border border-indigo-500/40 rounded-2xl p-4 sm:p-5 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400 shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <span>🎉 ĐÃ TÌM THẤY {parsedClasses.length} LỚP HỌC TRONG FILE</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                        {totalSelectedStudents} học sinh được chọn
                      </span>
                    </h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Bạn có thể chỉnh sửa nhanh Tên lớp, Môn học giảng dạy cho từng lớp, hoặc bỏ chọn lớp không cần thiết.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(true)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 font-bold"
                  >
                    Bỏ chọn hết
                  </button>
                </div>
              </div>

              {/* Class Cards Grid */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {parsedClasses.map((cls, idx) => {
                  const isViewing = idx === activeClassIndex;
                  return (
                    <div
                      key={cls.id}
                      className={`rounded-xl border p-3.5 transition-all ${
                        cls.selected
                          ? isViewing
                            ? 'bg-indigo-900/40 border-indigo-400 shadow-md ring-1 ring-indigo-400'
                            : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                          : 'bg-slate-900/40 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <label className="flex items-center gap-2.5 cursor-pointer font-bold text-sm text-white">
                          <input
                            type="checkbox"
                            checked={cls.selected}
                            onChange={(e) =>
                              handleUpdateParsedClass(idx, { selected: e.target.checked })
                            }
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-900 border-slate-600"
                          />
                          <span className="flex items-center gap-1.5">
                            <GraduationCap className="w-4 h-4 text-indigo-400" />
                            <span>Lớp {idx + 1}:</span>
                          </span>
                        </label>

                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 font-mono border border-slate-700">
                            {cls.rows.length} HS
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveClassIndex(idx)}
                            className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold transition-colors ${
                              isViewing
                                ? 'bg-indigo-600 text-white shadow'
                                : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            <Eye className="w-3 h-3" />
                            <span>{isViewing ? 'Đang xem' : 'Xem HS'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Inputs for Class Name and Subject */}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            Tên lớp:
                          </label>
                          <input
                            type="text"
                            value={cls.className}
                            onChange={(e) =>
                              handleUpdateParsedClass(idx, { className: e.target.value })
                            }
                            placeholder="Ví dụ: 10A1"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center justify-between">
                            <span>Môn học:</span>
                            {cls.subject && (
                              <span className="text-[10px] text-emerald-400 font-normal">Tự nhận diện</span>
                            )}
                          </label>
                          <input
                            type="text"
                            list="suggested-subjects"
                            value={cls.subject}
                            onChange={(e) =>
                              handleUpdateParsedClass(idx, { subject: e.target.value })
                            }
                            placeholder="Ví dụ: Toán, Tin..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Target selection */}
                      <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 cursor-pointer text-slate-300">
                            <input
                              type="radio"
                              name={`target-${cls.id}`}
                              checked={cls.targetMode === 'NEW'}
                              onChange={() =>
                                handleUpdateParsedClass(idx, { targetMode: 'NEW' })
                              }
                              className="text-indigo-600 focus:ring-0"
                            />
                            <span>Tạo lớp mới</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer text-slate-300">
                            <input
                              type="radio"
                              name={`target-${cls.id}`}
                              checked={cls.targetMode === 'CURRENT'}
                              onChange={() =>
                                handleUpdateParsedClass(idx, { targetMode: 'CURRENT' })
                              }
                              className="text-indigo-600 focus:ring-0"
                            />
                            <span>Ghi vào lớp có sẵn</span>
                          </label>
                        </div>

                        {cls.targetMode === 'CURRENT' && (
                          <select
                            value={cls.targetClassId}
                            onChange={(e) =>
                              handleUpdateParsedClass(idx, { targetClassId: e.target.value })
                            }
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none"
                          >
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Single Class Configuration Card */
            currentClass && (
              <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 sm:p-5 space-y-4">
                <h2 className="text-sm font-black uppercase text-indigo-400 tracking-wider flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  <span>1. Cấu hình lớp học & Môn giảng dạy</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Chế độ lưu:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateParsedClass(0, { targetMode: 'NEW' })
                        }
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                          currentClass.targetMode === 'NEW'
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                      >
                        + Tạo lớp mới
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateParsedClass(0, { targetMode: 'CURRENT' })
                        }
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                          currentClass.targetMode === 'CURRENT'
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                      >
                        Lớp có sẵn
                      </button>
                    </div>
                  </div>

                  {currentClass.targetMode === 'NEW' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Tên lớp:
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: 7A3, 10A1..."
                        value={currentClass.className}
                        onChange={(e) =>
                          handleUpdateParsedClass(0, { className: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-bold placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Chọn lớp có sẵn:
                      </label>
                      <select
                        value={currentClass.targetClassId}
                        onChange={(e) =>
                          handleUpdateParsedClass(0, { targetClassId: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            Lớp {cls.name} ({cls.students.length} HS hiện tại)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Môn học giảng dạy:</span>
                      </span>
                      {currentClass.subject && (
                        <span className="text-[10px] text-emerald-400">Tự động nhận diện</span>
                      )}
                    </label>
                    <input
                      type="text"
                      list="suggested-subjects"
                      placeholder="Ví dụ: Toán, Ngữ văn, Tin học..."
                      value={currentClass.subject}
                      onChange={(e) =>
                        handleUpdateParsedClass(0, { subject: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {currentClass.targetMode === 'CURRENT' && (
                  <div className="pt-2 flex flex-wrap items-center gap-4 text-xs border-t border-slate-700/60">
                    <span className="font-bold text-slate-300">Chế độ ghi dữ liệu:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                      <input
                        type="radio"
                        name="importMode"
                        checked={currentClass.importMode === 'REPLACE'}
                        onChange={() =>
                          handleUpdateParsedClass(0, { importMode: 'REPLACE' })
                        }
                        className="text-indigo-600 focus:ring-0"
                      />
                      <span>Thay thế toàn bộ danh sách cũ</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                      <input
                        type="radio"
                        name="importMode"
                        checked={currentClass.importMode === 'APPEND'}
                        onChange={() =>
                          handleUpdateParsedClass(0, { importMode: 'APPEND' })
                        }
                        className="text-indigo-600 focus:ring-0"
                      />
                      <span>Thêm nối tiếp vào danh sách</span>
                    </label>
                  </div>
                )}
              </div>
            )
          )}

          {/* Warnings list if any */}
          {warnings.length > 0 && (
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 space-y-1.5 text-xs text-amber-300">
              <div className="font-bold flex items-center gap-1.5 text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Thông tin nhận diện file:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                {warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step 2: Preview Table for Active Class */}
          {currentClass && (
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-black uppercase text-emerald-400 tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>
                      DANH SÁCH CHI TIẾT: LỚP {currentClass.className}{' '}
                      {currentClass.subject ? `— MÔN ${currentClass.subject.toUpperCase()}` : ''} ({currentClass.rows.length} HỌC SINH)
                    </span>
                  </h2>
                  {currentClass.sheetName && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Trang tính nguồn: <strong>{currentClass.sheetName}</strong>
                    </p>
                  )}
                </div>

                <button
                  onClick={handleClearPreview}
                  className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors self-start sm:self-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Chọn file khác</span>
                </button>
              </div>

              {/* Class Tabs selector if multi-class */}
              {parsedClasses.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-700/80">
                  <span className="text-xs font-bold text-slate-400 shrink-0 mr-1">Xem lớp:</span>
                  {parsedClasses.map((c, idx) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveClassIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                        idx === activeClassIndex
                          ? 'bg-indigo-600 text-white shadow'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-700'
                      }`}
                    >
                      <span>{c.className || `Lớp ${idx + 1}`}</span>
                      {c.subject && <span className="opacity-80">({c.subject})</span>}
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800/80 text-slate-300">
                        {c.rows.length}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-700">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-900 sticky top-0 text-slate-400 uppercase text-[11px] font-bold border-b border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">STT</th>
                      <th className="py-2.5 px-3">Họ và tên</th>
                      <th className="py-2.5 px-3">Mã HS</th>
                      <th className="py-2.5 px-3">Giới tính</th>
                      <th className="py-2.5 px-3 text-center">Lần lên bảng</th>
                      <th className="py-2.5 px-3 text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60 bg-slate-800/50 font-medium">
                    {currentClass.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-700/30">
                        <td className="py-2 px-3 text-center text-slate-400 font-mono">
                          {row.stt}
                        </td>
                        <td className="py-2 px-3 text-slate-100 font-bold">
                          {row.name}
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-mono text-xs">
                          {row.studentCode || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-xs">
                          {row.gender === 'nu' ? 'Nữ' : row.gender === 'nam' ? 'Nam' : '—'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-slate-900 text-indigo-300 font-bold text-xs border border-slate-700">
                            {row.callCount || 0}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          {row.warning ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                              {row.warning}
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                              Hợp lệ
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions Bottom Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={onCancel}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs sm:text-sm font-semibold transition-colors"
            >
              ❌ Hủy
            </button>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
              {parsedClasses.length > 1 && (
                <button
                  type="button"
                  onClick={handleConfirmCurrentClassOnly}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 text-xs sm:text-sm font-bold transition-all"
                >
                  Chỉ nhập lớp {currentClass?.className || ''} ({currentClass?.rows.length || 0} HS)
                </button>
              )}

              <button
                onClick={handleConfirmImportAll}
                disabled={selectedCount === 0 || totalSelectedStudents === 0}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm sm:text-base font-extrabold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all hover:scale-102"
              >
                <CheckCircle2 className="w-5 h-5" />
                {parsedClasses.length > 1 ? (
                  <span>
                    XÁC NHẬN NHẬP TẤT CẢ ({selectedCount} LỚP - {totalSelectedStudents} HS)
                  </span>
                ) : (
                  <span>
                    XÁC NHẬN NHẬP ({currentClass?.rows.length || 0} HỌC SINH)
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

