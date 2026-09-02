import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { ClassRoom, ExcelPreviewRow, Student } from '../types';
import { parseExcelOrCSVFile, parsePastedText } from '../utils/excelParser';
import { soundEngine } from '../utils/audio';

interface ExcelImportScreenProps {
  classes: ClassRoom[];
  activeClassId: string;
  onImportSuccess: (targetClassId: string, students: Student[], mode: 'REPLACE' | 'APPEND', newClassName?: string) => void;
  onCancel: () => void;
}

export const ExcelImportScreen: React.FC<ExcelImportScreenProps> = ({
  classes,
  activeClassId,
  onImportSuccess,
  onCancel,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewRows, setPreviewRows] = useState<ExcelPreviewRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [targetClassMode, setTargetClassMode] = useState<'CURRENT' | 'NEW'>('CURRENT');
  const [targetClassId, setTargetClassId] = useState<string>(activeClassId);
  const [newClassName, setNewClassName] = useState<string>('');
  const [importMode, setImportMode] = useState<'REPLACE' | 'APPEND'>('REPLACE');
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeInputTab, setActiveInputTab] = useState<'FILE' | 'PASTE'>('FILE');
  const [pastedContent, setPastedContent] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeClass = classes.find((c) => c.id === targetClassId) || classes[0];

  // Process File
  const handleFileChange = async (file: File) => {
    if (!file) return;
    setSelectedFile(file);
    setIsProcessing(true);

    try {
      const result = await parseExcelOrCSVFile(file);
      setPreviewRows(result.rows);
      setWarnings(result.warnings);
      if (result.suggestedClassName) {
        setNewClassName(result.suggestedClassName);
      }
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
      setPreviewRows(result.rows);
      setWarnings(result.warnings);
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

  // Confirm Import
  const handleConfirmImport = () => {
    if (previewRows.length === 0) return;

    const finalStudents: Student[] = previewRows.map((r, idx) => ({
      id: `std-import-${Date.now()}-${idx}`,
      name: r.name,
      studentCode: r.studentCode,
      gender: r.gender,
      callCount: r.callCount !== undefined ? r.callCount : 0, // Retain existing call count if present in file
      notes: r.notes,
      scores: r.scores,
    }));

    if (targetClassMode === 'NEW') {
      const clsName = newClassName.trim() || `Lớp Mới ${classes.length + 1}`;
      onImportSuccess('', finalStudents, 'REPLACE', clsName);
    } else {
      onImportSuccess(targetClassId, finalStudents, importMode);
    }

    soundEngine.playVictoryFanfare();
  };

  const handleClearPreview = () => {
    setPreviewRows([]);
    setSelectedFile(null);
    setWarnings([]);
    setPastedContent('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            <span>📥 NHẬP DANH SÁCH HỌC SINH TỪ EXCEL</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Hỗ trợ file .xlsx, .csv từ VnEdu, SMAS, CSDL ngành hoặc bảng tính Excel thông thường.
          </p>
        </div>
      </div>

      {previewRows.length === 0 ? (
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
                Hỗ trợ định dạng <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong>
              </p>

              <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Tự động nhận diện Họ và Tên
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Tự động ghép Họ đệm + Tên
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Tự lọc dòng tiêu đề & dòng trống
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
                placeholder={`1. Nguyễn Văn An\n2. Trần Thị Bình\n3. Lê Văn Chi\n4. Phạm Tiến Dũng`}
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
        /* Step 2: Preview & Configuration */
        <div className="space-y-5">
          {/* Target class selector & options */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 sm:p-5 space-y-4">
            <h2 className="text-sm font-black uppercase text-indigo-400 tracking-wider">
              1. Cấu hình nơi lưu danh sách
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Lưu vào lớp:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetClassMode('CURRENT')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      targetClassMode === 'CURRENT'
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    Lớp có sẵn
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetClassMode('NEW')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      targetClassMode === 'NEW'
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    + Tạo lớp mới
                  </button>
                </div>
              </div>

              {targetClassMode === 'CURRENT' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Chọn lớp đích:
                  </label>
                  <select
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        Lớp {cls.name} ({cls.students.length} học sinh hiện tại)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Tên lớp mới:
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 7A3, 8A4..."
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            {targetClassMode === 'CURRENT' && (
              <div className="pt-2 flex items-center gap-4 text-xs">
                <span className="font-bold text-slate-300">Chế độ ghi dữ liệu:</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'REPLACE'}
                    onChange={() => setImportMode('REPLACE')}
                    className="text-indigo-600 focus:ring-0"
                  />
                  <span>Thay thế toàn bộ danh sách cũ ({activeClass?.students.length || 0} HS)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'APPEND'}
                    onChange={() => setImportMode('APPEND')}
                    className="text-indigo-600 focus:ring-0"
                  />
                  <span>Thêm nối tiếp vào danh sách</span>
                </label>
              </div>
            )}
          </div>

          {/* Warnings list if any */}
          {warnings.length > 0 && (
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 space-y-1.5 text-xs text-amber-300">
              <div className="font-bold flex items-center gap-1.5 text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Thông báo nhận diện dữ liệu:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                {warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step 2: Preview Table */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-sm font-black uppercase text-emerald-400 tracking-wider flex items-center gap-2">
                <span>👀 XEM TRƯỚC DANH SÁCH ({previewRows.length} HỌC SINH)</span>
              </h2>
              <button
                onClick={handleClearPreview}
                className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Chọn file khác</span>
              </button>
            </div>

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
                  {previewRows.map((row, idx) => (
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

          {/* Actions Bottom Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={onCancel}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs sm:text-sm font-semibold transition-colors"
            >
              ❌ Hủy
            </button>

            <button
              onClick={handleConfirmImport}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm sm:text-base font-extrabold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all hover:scale-102"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>✅ XÁC NHẬN NHẬP ({previewRows.length} HỌC SINH)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
