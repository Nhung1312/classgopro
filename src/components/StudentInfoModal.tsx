import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Users,
  Phone,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  Info,
} from 'lucide-react';
import { ClassRoom, Student } from '../types';
import {
  exportStudentInfoToExcel,
  parseStudentInfoFile,
  applyStudentInfoUpdates,
  StudentInfoParseResult,
} from '../utils/studentInfoImportExport';
import { soundEngine } from '../utils/audio';

interface StudentInfoModalProps {
  classroom: ClassRoom;
  onUpdateStudents: (classId: string, updatedStudents: Student[]) => void;
  onClose: () => void;
}

export const StudentInfoModal: React.FC<StudentInfoModalProps> = ({
  classroom,
  onUpdateStudents,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'EXPORT' | 'IMPORT'>('EXPORT');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<StudentInfoParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Thống kê sơ bộ về lớp
  const totalStudents = classroom.students.length;
  const hasCodeCount = classroom.students.filter((s) => s.studentCode && s.studentCode.trim()).length;
  const hasGenderCount = classroom.students.filter((s) => s.gender).length;
  const hasPhoneCount = classroom.students.filter((s) => s.parentPhone && s.parentPhone.trim()).length;

  // 1. Xử lý xuất file
  const handleExport = () => {
    try {
      exportStudentInfoToExcel(classroom.name, classroom.students);
      soundEngine.playSuccess();
    } catch (err: any) {
      alert(`Lỗi khi xuất file: ${err?.message || err}`);
    }
  };

  // 2. Xử lý chọn file import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsing(true);
    setParseError(null);
    setParseResult(null);
    setSuccessMessage(null);

    try {
      const res = await parseStudentInfoFile(file, classroom.students);
      setParseResult(res);
      soundEngine.playTick(1.2);
    } catch (err: any) {
      setParseError(err?.message || 'Không thể đọc file Excel. Vui lòng kiểm tra định dạng.');
    } finally {
      setIsParsing(false);
    }
  };

  // 3. Xử lý xác nhận cập nhật
  const handleConfirmUpdate = () => {
    if (!parseResult) return;

    try {
      // Thực thi merge với kiểm tra assertion nghiêm ngặt
      const { updatedStudents, updatedCount } = applyStudentInfoUpdates(
        classroom.students,
        parseResult.rows
      );

      // Cập nhật lên lớp học
      onUpdateStudents(classroom.id, updatedStudents);

      soundEngine.playSuccess();
      setSuccessMessage(
        `Đã cập nhật thành công Giới tính & SĐT phụ huynh cho ${updatedCount} học sinh! Toàn bộ sổ điểm và dữ liệu khác được bảo toàn tuyệt đối.`
      );
      setParseResult(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      alert(`Lỗi an toàn: ${err?.message || err}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Thông Tin Học Sinh - Lớp {classroom.name}
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  Luồng riêng biệt
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cập nhật Giới tính và Số điện thoại phụ huynh qua file Excel riêng mà không ảnh hưởng tới Sổ điểm.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle: Xuất File / Nhập File */}
        <div className="px-5 sm:px-6 pt-4 pb-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('EXPORT');
                setSuccessMessage(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'EXPORT'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>1. Xuất file thông tin HS</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('IMPORT');
                setSuccessMessage(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'IMPORT'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>2. Tải lên & Ghép mã HS</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Bảo vệ Sổ điểm 100%</span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar flex-1">
          {/* Success Banner */}
          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-3 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-emerald-200">Thành công!</div>
                <div className="mt-0.5">{successMessage}</div>
              </div>
            </div>
          )}

          {/* TAB 1: XUẤT FILE THÔNG TIN */}
          {activeTab === 'EXPORT' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Hiện trạng thông tin lớp {classroom.name}
                  </span>
                  <span className="text-xs text-indigo-400 font-bold">
                    Tổng: {totalStudents} học sinh
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400">Có Mã học sinh</div>
                    <div className="text-base font-black text-white mt-0.5">
                      {hasCodeCount} / {totalStudents}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400">Đã có Giới tính</div>
                    <div className="text-base font-black text-sky-400 mt-0.5">
                      {hasGenderCount} / {totalStudents}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400">Đã có SĐT phụ huynh</div>
                    <div className="text-base font-black text-emerald-400 mt-0.5">
                      {hasPhoneCount} / {totalStudents}
                    </div>
                  </div>
                </div>

                {hasCodeCount < totalStudents && (
                  <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-600/30 text-[11px] text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Lưu ý: Có {totalStudents - hasCodeCount} học sinh chưa có Mã HS. Bạn có thể gõ trực tiếp Mã HS vào file Excel để hệ thống nhận diện.
                    </span>
                  </div>
                )}
              </div>

              {/* Instructions Box */}
              <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/60 space-y-2 text-xs text-slate-300">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-sky-400" />
                  <span>Quy trình cập nhật thông tin học sinh:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] pl-1">
                  <li>Bấm nút <strong>"Tải file Excel mẫu lớp {classroom.name}"</strong> bên dưới.</li>
                  <li>File sẽ có 4 cột: <strong>Mã học sinh | Họ và tên | Giới tính | SĐT phụ huynh</strong>.</li>
                  <li>Giáo viên điền cột <strong>Giới tính</strong> (Nam/Nữ) và <strong>SĐT phụ huynh</strong>.</li>
                  <li>Chuyển sang tab <strong>"2. Tải lên & Ghép mã HS"</strong> để tải file đã điền lên.</li>
                </ol>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex justify-center">
                <button
                  onClick={handleExport}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/40 flex items-center gap-2.5 transition-all hover:scale-102"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  <span>Tải file Excel thông tin lớp {classroom.name} (.xlsx)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TẢI LÊN & GHÉP MÃ HS */}
          {activeTab === 'IMPORT' && (
            <div className="space-y-4">
              {/* File upload drag/select area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-2xl border-2 border-dashed border-indigo-500/40 hover:border-indigo-400 bg-slate-950/40 hover:bg-slate-900/60 transition-all cursor-pointer text-center space-y-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    {selectedFile ? selectedFile.name : 'Bấm vào đây để chọn file Excel thông tin học sinh'}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hỗ trợ định dạng .xlsx, .xls (Tự động nhận diện Mã HS, Họ tên, Giới tính, SĐT PH)
                  </p>
                </div>
              </div>

              {/* Parsing Indicator */}
              {isParsing && (
                <div className="p-3 text-center text-xs text-indigo-300 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span>Đang phân tích dữ liệu và đối soát mã học sinh...</span>
                </div>
              )}

              {/* Error Box */}
              {parseError && (
                <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Không thể đối soát file:</div>
                    <div className="mt-0.5">{parseError}</div>
                  </div>
                </div>
              )}

              {/* Preview Table & Analysis */}
              {parseResult && (
                <div className="space-y-3">
                  {/* Summary Bar */}
                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-300">
                        Tổng đọc được: <strong>{parseResult.totalRows}</strong> dòng
                      </span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Khớp mã HS: {parseResult.matchedCount}
                      </span>
                      {parseResult.unmatchedCount > 0 && (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Không khớp: {parseResult.unmatchedCount}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 italic">
                      (Chỉ cập nhật những dòng tìm thấy Mã HS)
                    </div>
                  </div>

                  {/* Warnings if any */}
                  {parseResult.warnings.map((w, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-600/30 text-[11px] text-amber-300 flex items-start gap-2"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}

                  {/* Preview Table */}
                  <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-64 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/80 text-slate-400 font-bold text-[11px] sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">Mã HS</th>
                          <th className="py-2 px-3">Họ và tên</th>
                          <th className="py-2 px-3 text-center">Giới tính</th>
                          <th className="py-2 px-3">SĐT phụ huynh</th>
                          <th className="py-2 px-3 text-center">Trạng thái đối soát</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                        {parseResult.rows.map((row, idx) => (
                          <tr
                            key={idx}
                            className={row.matched ? 'hover:bg-slate-800/40' : 'bg-rose-950/10 text-slate-500'}
                          >
                            <td className="py-2 px-3 font-mono text-slate-300">
                              {row.studentCode || '—'}
                            </td>
                            <td className="py-2 px-3 font-medium text-white">
                              {row.name}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {row.parsedGender === 'nam' ? (
                                <span className="text-sky-300 font-medium">Nam</span>
                              ) : row.parsedGender === 'nu' ? (
                                <span className="text-pink-300 font-medium">Nữ</span>
                              ) : row.parsedGender === 'khac' ? (
                                <span className="text-slate-300 font-medium">Khác</span>
                              ) : (
                                <span className="text-slate-500 italic">Giữ nguyên</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-emerald-300 font-mono">
                              {row.parentPhone ? (
                                <span>{row.parentPhone}</span>
                              ) : (
                                <span className="text-slate-500 italic">Giữ nguyên</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {row.matched ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  ✓ Tìm thấy
                                </span>
                              ) : (
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 cursor-help"
                                  title={row.warning || 'Không tìm thấy'}
                                >
                                  ✕ Không khớp
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Safety Assurance Note */}
                  <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-700/40 text-[11px] text-indigo-300 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Cam kết bảo toàn:</strong> Hệ thống chỉ ghi đè <code>gender</code> và <code>parentPhone</code>. Điểm số (TX1–TX4, GK, CK), sao thưởng, số lần gọi và nề nếp được bảo vệ 100%.
                    </span>
                  </div>

                  {/* Confirm Button */}
                  <div className="pt-2 flex justify-end gap-2.5">
                    <button
                      onClick={() => setParseResult(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      onClick={handleConfirmUpdate}
                      disabled={parseResult.matchedCount === 0}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Xác nhận cập nhật ({parseResult.matchedCount} học sinh)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Luồng thông tin độc lập • Không can thiệp Sổ điểm/EDU</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all border border-slate-700"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
