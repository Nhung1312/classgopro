import React, { useState, useMemo, useRef } from 'react';
import {
  Calendar,
  Clock,
  Sparkles,
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ShieldCheck,
  Coffee,
  CheckSquare,
  Square,
  Layers,
  Filter,
} from 'lucide-react';
import {
  ClassRoom,
  TimetableSlot,
  TeachingPlanItem,
  PpctItem,
  DayOffItem,
  ScheduleGenerationConfig,
} from '../../types';
import { soundEngine } from '../../utils/audio';
import {
  downloadVnEduPpctTemplate,
  downloadCombinedTimetableAndPpctTemplate,
  parsePpctFromExcel,
  generateTeachingPlanFromTimetable,
  extractGradeFromClassName,
} from '../../utils/timetableExcelService';
import {
  SAMPLE_PPCT_GRADE_7,
  SAMPLE_PPCT_GRADE_8,
  SAMPLE_PPCT_GRADE_10,
  getSamplePpctForGrade,
} from '../../utils/samplePpctData';

interface AutoScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassRoom[];
  timetable: TimetableSlot[];
  existingPlan: TeachingPlanItem[];
  onApplyGeneratedPlan: (newPlan: TeachingPlanItem[]) => void;
  savedDayOffs: DayOffItem[];
  onUpdateDayOffs: (items: DayOffItem[]) => void;
  savedPpctItems: PpctItem[];
  onUpdatePpctItems: (items: PpctItem[]) => void;
  savedConfig: ScheduleGenerationConfig;
  onUpdateConfig: (cfg: ScheduleGenerationConfig) => void;
}

export const AutoScheduleModal: React.FC<AutoScheduleModalProps> = ({
  isOpen,
  onClose,
  classes,
  timetable,
  existingPlan,
  onApplyGeneratedPlan,
  savedDayOffs,
  onUpdateDayOffs,
  savedPpctItems,
  onUpdatePpctItems,
  savedConfig,
  onUpdateConfig,
}) => {
  // Wizard active step: 1 = TKB & PPCT, 2 = Cấu hình ngày/tuần, 3 = Quản lý ngày nghỉ, 4 = Xem trước & Lưu
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

  // PPCT Source choice: 'BUILTIN' (GDPT 2018 mẫu) or 'EXCEL' (Thầy cô tải lên)
  const [ppctSourceType, setPpctSourceType] = useState<'BUILTIN' | 'EXCEL'>(
    savedPpctItems.length > 0 ? 'EXCEL' : 'BUILTIN'
  );

  // Temporary Day Offs state inside modal
  const [dayOffs, setDayOffs] = useState<DayOffItem[]>(() => {
    return savedDayOffs.length > 0
      ? savedDayOffs.filter((d: DayOffItem) => !(d.date?.includes('-11-20') && /nhà giáo|20\/11/i.test(d.reason || '')))
      : [
          { id: 'do-1', date: '2026-09-02', reason: 'Nghỉ Lễ Quốc Khánh 2/9', allDay: true, classId: 'ALL' },
          { id: 'do-2', date: '2027-01-01', reason: 'Nghỉ Tết Dương Lịch', allDay: true, classId: 'ALL' },
          { id: 'do-3', date: '2027-02-06', reason: 'Nghỉ Tết Nguyên Đán (Ất Tỵ - Bính Ngọ)', allDay: true, classId: 'ALL' },
        ];
  });

  // Config state (Default to 2026-2027 academic year)
  const [config, setConfig] = useState<ScheduleGenerationConfig>(() => ({
    startDate: savedConfig.startDate && savedConfig.startDate.startsWith('2026') ? savedConfig.startDate : '2026-09-07',
    totalWeeks: savedConfig.totalWeeks || 18,
    semester: savedConfig.semester || '1',
    preserveCompleted: savedConfig.preserveCompleted !== undefined ? savedConfig.preserveCompleted : true,
  }));

  // File input ref for PPCT Excel upload
  const ppctFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedPpctItems, setUploadedPpctItems] = useState<PpctItem[]>(savedPpctItems);
  const [ppctUploadNotice, setPpctUploadNotice] = useState<string | null>(null);

  // New Day Off form state
  const [newOffDate, setNewOffDate] = useState<string>('2026-09-05');
  const [newOffReason, setNewOffReason] = useState<string>('Lễ Khai giảng năm học mới');
  const [newOffAllDay, setNewOffAllDay] = useState<boolean>(true);
  const [newOffPeriods, setNewOffPeriods] = useState<number[]>([1, 2]);
  const [newOffClassId, setNewOffClassId] = useState<string>('ALL');

  // Preview generation result
  const [generatedResult, setGeneratedResult] = useState<{
    generatedPlan: TeachingPlanItem[];
    stats: {
      totalSlots: number;
      assignedLessons: number;
      offSlotsCount: number;
      makeupSlotsCount: number;
      completedPreservedCount: number;
      classStats: { [className: string]: { totalSlots: number; lessonsAssigned: number; offCount: number; makeupCount: number } };
    };
    warnings: string[];
    missingPpctClasses: { classId: string; className: string; subject: string; grade: string }[];
  } | null>(null);

  // Preview filter
  const [previewWeekFilter, setPreviewWeekFilter] = useState<string>('ALL');
  const [previewClassFilter, setPreviewClassFilter] = useState<string>('ALL');

  // Effective PPCT pool to use
  const effectivePpctItems = useMemo(() => {
    if (ppctSourceType === 'EXCEL' && uploadedPpctItems.length > 0) {
      return uploadedPpctItems;
    }
    // Combine built-in standard samples
    return [...SAMPLE_PPCT_GRADE_7, ...SAMPLE_PPCT_GRADE_8, ...SAMPLE_PPCT_GRADE_10];
  }, [ppctSourceType, uploadedPpctItems]);

  // Distinct classes in timetable
  const timetableClassNames = useMemo(() => {
    const set = new Set<string>();
    timetable.forEach((s) => set.add(s.className));
    return Array.from(set).sort();
  }, [timetable]);

  // Handle uploading PPCT Excel
  const handlePpctFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await parsePpctFromExcel(file);
      setUploadedPpctItems(res.items);
      setPpctSourceType('EXCEL');
      onUpdatePpctItems(res.items);
      setPpctUploadNotice(`✅ Đã nhập thành công ${res.items.length} bài PPCT từ file Excel!`);
      soundEngine.playSuccess();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi đọc file PPCT.');
      soundEngine.playError();
    } finally {
      if (ppctFileInputRef.current) {
        ppctFileInputRef.current.value = '';
      }
    }
  };

  // Add new day off item
  const handleAddDayOff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOffDate || !newOffReason.trim()) return;

    const newItem: DayOffItem = {
      id: `do-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      date: newOffDate,
      reason: newOffReason.trim(),
      allDay: newOffAllDay,
      periods: !newOffAllDay ? newOffPeriods : undefined,
      classId: newOffClassId,
    };

    const updated = [...dayOffs, newItem];
    setDayOffs(updated);
    onUpdateDayOffs(updated);
    soundEngine.playTick(1.2);
    setNewOffReason('');
  };

  const handleDeleteDayOff = (id: string) => {
    const updated = dayOffs.filter((d) => d.id !== id);
    setDayOffs(updated);
    onUpdateDayOffs(updated);
    soundEngine.playTick(0.8);
  };

  const handleAddQuickHoliday = (date: string, reason: string) => {
    if (dayOffs.some((d) => d.date === date)) {
      alert(`Ngày ${date} (${reason}) đã có trong danh sách.`);
      return;
    }
    const newItem: DayOffItem = {
      id: `do-quick-${Date.now()}`,
      date,
      reason,
      allDay: true,
      classId: 'ALL',
    };
    const updated = [...dayOffs, newItem];
    setDayOffs(updated);
    onUpdateDayOffs(updated);
    soundEngine.playTick(1.4);
  };

  // Trigger calculation when entering Step 4 or when requested
  const handleRunGeneration = () => {
    try {
      const result = generateTeachingPlanFromTimetable({
        timetable,
        ppctItems: effectivePpctItems,
        dayOffs,
        config,
        existingPlan,
        classes,
      });
      setGeneratedResult(result);
      soundEngine.playVictoryFanfare();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tự động sinh lịch dạy.');
      soundEngine.playError();
    }
  };

  // Go to step
  const handleGoToStep = (step: 1 | 2 | 3 | 4) => {
    if (step === 4) {
      handleRunGeneration();
    }
    setActiveStep(step);
    soundEngine.playTick(1.2);
  };

  // Save generated plan
  const handleConfirmAndApply = () => {
    if (!generatedResult || generatedResult.generatedPlan.length === 0) return;
    onApplyGeneratedPlan(generatedResult.generatedPlan);
    onUpdateDayOffs(dayOffs);
    onUpdateConfig(config);
    soundEngine.playSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-slate-900 border-2 border-indigo-500/50 rounded-3xl max-w-4xl w-full flex flex-col max-h-[92vh] shadow-2xl shadow-indigo-500/10 overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="px-5 py-4 bg-slate-850/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/30">
              ✨
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-extrabold text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>CÔNG CỤ TỰ ĐỘNG HÓA GIẢNG DẠY CLASSGO</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Tự Động Sinh Sổ Báo Giảng (TKB + PPCT + Ngày Nghỉ)
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP PROGRESS BAR */}
        <div className="px-5 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between gap-1 overflow-x-auto shrink-0 text-xs font-bold">
          <button
            onClick={() => handleGoToStep(1)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              activeStep === 1
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-900/60 flex items-center justify-center text-[10px]">1</span>
            <span>Nguồn TKB & PPCT</span>
          </button>

          <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />

          <button
            onClick={() => handleGoToStep(2)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              activeStep === 2
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-900/60 flex items-center justify-center text-[10px]">2</span>
            <span>Tuần Học & Ngày Bắt Đầu</span>
          </button>

          <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />

          <button
            onClick={() => handleGoToStep(3)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              activeStep === 3
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-900/60 flex items-center justify-center text-[10px]">3</span>
            <span>Quản Lý Ngày Nghỉ ({dayOffs.length})</span>
          </button>

          <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />

          <button
            onClick={() => handleGoToStep(4)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              activeStep === 4
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-900/60 flex items-center justify-center text-[10px]">4</span>
            <span>Xem Trước & Lưu Lịch</span>
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* ========================================================================= */}
          {/* STEP 1: NGUỒN TKB & PPCT                                                   */}
          {/* ========================================================================= */}
          {activeStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              {/* TKB Summary Card */}
              <div className="bg-slate-850 border border-slate-700/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl font-bold border border-indigo-500/30">
                    📅
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-white">
                      Thời Khóa Biểu Giảng Dạy Đang Sử Dụng
                    </h3>
                    <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap mt-1">
                      <span>Tổng số: <strong className="text-amber-300">{timetable.length} tiết / tuần</strong></span>
                      <span>•</span>
                      <span>Dạy các lớp: <strong className="text-sky-300">{timetableClassNames.join(', ') || 'Chưa có'}</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => downloadCombinedTimetableAndPpctTemplate(classes)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                  title="Tải file mẫu Excel kết hợp cả TKB và PPCT"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Tải Mẫu TKB+PPCT (.xlsx)</span>
                </button>
              </div>

              {/* PPCT Source Selection */}
              <div className="bg-slate-850 border border-slate-700/80 rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <span>📚</span>
                    <span>Nguồn Phân Phối Chương Trình (PPCT) Môn Học</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Hệ thống sẽ lấy từng bài trong PPCT theo thứ tự để tự động gán vào các tiết dạy hàng tuần của Thầy/Cô. Hỗ trợ nhiều lớp cùng khối dùng chung 1 khung PPCT.
                  </p>
                </div>

                {/* Option Tabs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setPpctSourceType('BUILTIN')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      ppctSourceType === 'BUILTIN'
                        ? 'bg-indigo-950/60 border-indigo-500 shadow-md'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-white flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>PPCT Mẫu Chuẩn GDPT 2018</span>
                        </span>
                        {ppctSourceType === 'BUILTIN' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Tích hợp sẵn khung chuẩn 70 tiết Học kỳ 1 cho Toán 7, Toán 8, Toán 10 (Bộ SGK mới: Kết nối tri thức, Cánh Diều, Chân trời sáng tạo).
                      </p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-amber-300 font-bold">
                      ✓ Khuyên dùng: Sẵn sàng ngay, không cần chuẩn bị file
                    </div>
                  </div>

                  <div
                    onClick={() => setPpctSourceType('EXCEL')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      ppctSourceType === 'EXCEL'
                        ? 'bg-indigo-950/60 border-indigo-500 shadow-md'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-white flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                          <span>Nhập File Excel PPCT Của Trường</span>
                        </span>
                        {ppctSourceType === 'EXCEL' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Tải file PPCT bộ môn từ vnEdu, SMAS hoặc tự biên soạn. Hỗ trợ chuẩn hóa số tiết và tên bài học linh hoạt.
                      </p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-emerald-400 font-bold">
                        {uploadedPpctItems.length > 0 ? `Đã nạp ${uploadedPpctItems.length} bài` : 'Chưa tải file'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadVnEduPpctTemplate(classes);
                        }}
                        className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Tải file mẫu PPCT
                      </button>
                    </div>
                  </div>
                </div>

                {/* Upload button if EXCEL option is active */}
                {ppctSourceType === 'EXCEL' && (
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-slate-200">
                          Chọn file Excel Phân phối chương trình (.xlsx, .xls)
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Các cột cần có: Tiết PPCT, Khối lớp (VD: 7), Tên bài dạy.
                        </div>
                      </div>
                      <div>
                        <input
                          ref={ppctFileInputRef}
                          type="file"
                          accept=".xlsx, .xls"
                          className="hidden"
                          onChange={handlePpctFileChange}
                        />
                        <button
                          type="button"
                          onClick={() => ppctFileInputRef.current?.click()}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow cursor-pointer transition-all"
                        >
                          <UploadCloud className="w-4 h-4" />
                          <span>Tải Lên File PPCT Excel</span>
                        </button>
                      </div>
                    </div>
                    {ppctUploadNotice && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-300 font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span>{ppctUploadNotice}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: CẤU HÌNH TUẦN HỌC & NGÀY BẮT ĐẦU                                    */}
          {/* ========================================================================= */}
          {activeStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="bg-slate-850 border border-slate-700/80 rounded-2xl p-5 space-y-4">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <span>🗓️</span>
                  <span>Thiết Lập Khung Thời Gian & Học Kỳ</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Ngày bắt đầu Tuần 1 (Thường là Thứ Hai đầu năm học):
                    </label>
                    <input
                      type="date"
                      value={config.startDate}
                      onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      * Hệ thống tự động căn chỉnh về đúng ngày Thứ Hai của tuần đó.
                    </span>
                  </div>

                  {/* Total Weeks */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Tổng số tuần cần sinh lịch:
                    </label>
                    <div className="flex items-center gap-2">
                      {[18, 19, 35].map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setConfig({ ...config, totalWeeks: w })}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            config.totalWeeks === w
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                              : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                          }`}
                        >
                          {w} Tuần {w === 18 ? '(HK1)' : w === 35 ? '(Cả năm)' : ''}
                        </button>
                      ))}
                      <input
                        type="number"
                        min={1}
                        max={45}
                        value={config.totalWeeks}
                        onChange={(e) => setConfig({ ...config, totalWeeks: parseInt(e.target.value) || 18 })}
                        className="w-20 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white text-center font-bold"
                      />
                    </div>
                  </div>

                  {/* Semester */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Học kỳ áp dụng:
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, semester: '1' })}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          config.semester === '1'
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                            : 'bg-slate-950 text-slate-400 border-slate-700'
                        }`}
                      >
                        Học Kỳ 1
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, semester: '2' })}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          config.semester === '2'
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                            : 'bg-slate-950 text-slate-400 border-slate-700'
                        }`}
                      >
                        Học Kỳ 2
                      </button>
                    </div>
                  </div>

                  {/* Preserve completed lessons checkbox */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 sm:col-span-2">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-white">
                          Bảo toàn các tiết đã đánh dấu &quot;Đã dạy&quot;
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Nếu bật, các bài học Thầy/Cô đã dạy xong trong Sổ báo giảng sẽ giữ nguyên, chỉ tự động tính tiếp cho các tuần và bài học còn lại.
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, preserveCompleted: !config.preserveCompleted })}
                      className="cursor-pointer"
                    >
                      {config.preserveCompleted ? (
                        <CheckSquare className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: QUẢN LÝ NGÀY NGHỈ & TIẾT NGHỈ                                     */}
          {/* ========================================================================= */}
          {activeStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              {/* Feature highlights */}
              <div className="p-3.5 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-xs text-amber-200 flex items-start gap-2.5">
                <Coffee className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-white">Cơ chế quản lý ngày nghỉ thông minh:</strong> Khi chọn nghỉ một ngày hoặc một tiết cụ thể (như Chào cờ, Hội nghị, bão lũ...), tiết đó sẽ <em>không được tính là đã dạy</em>. Bài học PPCT chưa dạy sẽ <strong>tự động chuyển sang tiết tiếp theo</strong> của đúng lớp đó, hoàn toàn không bị nhảy bài hay trùng lặp!
                </div>
              </div>

              {/* Quick Preset Holidays */}
              <div className="bg-slate-850 border border-slate-700/80 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-bold text-slate-300 block">
                  ⚡ Bấm nhanh để thêm ngày nghỉ lễ quốc gia chuẩn:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddQuickHoliday('2026-09-02', 'Nghỉ Lễ Quốc Khánh 2/9')}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-xs font-bold border border-slate-700 hover:border-indigo-500 transition-all cursor-pointer"
                  >
                    + Quốc Khánh 2/9 (2026)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuickHoliday('2027-01-01', 'Nghỉ Tết Dương Lịch')}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-xs font-bold border border-slate-700 hover:border-indigo-500 transition-all cursor-pointer"
                  >
                    + Tết Dương Lịch (1/1/2027)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuickHoliday('2027-02-06', 'Nghỉ Tết Nguyên Đán (Ất Tỵ - Bính Ngọ)')}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-xs font-bold border border-slate-700 hover:border-indigo-500 transition-all cursor-pointer"
                  >
                    + Nghỉ Tết Nguyên Đán (2027)
                  </button>
                </div>
              </div>

              {/* Add Custom Day Off Form */}
              <form onSubmit={handleAddDayOff} className="bg-slate-850 border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  + Thêm Ngày Nghỉ Hoặc Tiết Nghỉ Mới
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Ngày nghỉ:</label>
                    <input
                      type="date"
                      value={newOffDate}
                      onChange={(e) => setNewOffDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Tên ngày nghỉ / Lý do:</label>
                    <input
                      type="text"
                      value={newOffReason}
                      onChange={(e) => setNewOffReason(e.target.value)}
                      placeholder="VD: Nghỉ thi giữa kỳ, Nghỉ bão, Tiết Chào cờ..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Phạm vi nghỉ:</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewOffAllDay(true)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          newOffAllDay
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-slate-950 text-slate-400 border-slate-700'
                        }`}
                      >
                        Nghỉ Cả Ngày
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewOffAllDay(false)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          !newOffAllDay
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-slate-950 text-slate-400 border-slate-700'
                        }`}
                      >
                        Nghỉ Một Số Tiết
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Áp dụng cho:</label>
                    <select
                      value={newOffClassId}
                      onChange={(e) => setNewOffClassId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ALL">Tất cả các lớp dạy</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          Chỉ riêng Lớp {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {!newOffAllDay && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-300">
                      Chọn các tiết nghỉ trong ngày (bấm để bật/tắt):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => {
                        const selected = newOffPeriods.includes(p);
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              if (selected) {
                                setNewOffPeriods(newOffPeriods.filter((item) => item !== p));
                              } else {
                                setNewOffPeriods([...newOffPeriods, p].sort((a, b) => a - b));
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              selected
                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                                : 'bg-slate-850 text-slate-400 border-slate-700'
                            }`}
                          >
                            Tiết {p} {p <= 5 ? '(Sáng)' : '(Chiều)'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Thêm Vào Danh Sách Ngày Nghỉ
                  </button>
                </div>
              </form>

              {/* Day Offs List Table */}
              <div className="bg-slate-850 border border-slate-700/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Danh Sách Ngày Nghỉ Đã Đặt ({dayOffs.length} mục):
                  </span>
                  {dayOffs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Xóa sạch danh sách ngày nghỉ?')) {
                          setDayOffs([]);
                          onUpdateDayOffs([]);
                        }
                      }}
                      className="text-[11px] text-rose-400 hover:underline"
                    >
                      Xóa tất cả
                    </button>
                  )}
                </div>

                {dayOffs.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs italic">
                    Chưa có ngày nghỉ nào. Thầy/Cô có thể bấm vào các ngày lễ ở trên hoặc thêm ngày nghỉ tùy ý!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800 max-h-56 overflow-y-auto pr-1">
                    {dayOffs.map((item) => (
                      <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-amber-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {item.date}
                          </span>
                          <span className="font-extrabold text-white">{item.reason}</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                            {item.allDay
                              ? 'Nghỉ cả ngày'
                              : `Nghỉ tiết: ${item.periods?.join(', ') || '—'}`}
                          </span>
                          {item.classId && item.classId !== 'ALL' && (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                              Lớp: {classes.find((c) => c.id === item.classId)?.name || item.classId}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteDayOff(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                          title="Xóa ngày nghỉ này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: XEM TRƯỚC (PREVIEW) & LƯU LỊCH                                     */}
          {/* ========================================================================= */}
          {activeStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              {generatedResult ? (
                <>
                  {/* Stats summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div className="p-3 rounded-2xl bg-slate-850 border border-slate-700/80">
                      <div className="text-[10px] text-slate-400 font-bold">Tổng số tiết:</div>
                      <div className="text-lg font-black text-indigo-400 mt-0.5">
                        {generatedResult.stats.totalSlots}
                      </div>
                      <div className="text-[10px] text-slate-500">Trong {config.totalWeeks} tuần</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-850 border border-slate-700/80">
                      <div className="text-[10px] text-slate-400 font-bold">Bài PPCT gán vào:</div>
                      <div className="text-lg font-black text-emerald-400 mt-0.5">
                        {generatedResult.stats.assignedLessons}
                      </div>
                      <div className="text-[10px] text-slate-500">Tiến độ độc lập</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-850 border border-slate-700/80">
                      <div className="text-[10px] text-slate-400 font-bold">Đã dạy (Bảo toàn):</div>
                      <div className="text-lg font-black text-teal-400 mt-0.5">
                        {generatedResult.stats.completedPreservedCount || 0}
                      </div>
                      <div className="text-[10px] text-teal-400/80 font-bold">Giữ nguyên 100%</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-850 border border-slate-700/80">
                      <div className="text-[10px] text-slate-400 font-bold">Tiết nghỉ (Dời bài):</div>
                      <div className="text-lg font-black text-amber-400 mt-0.5">
                        {generatedResult.stats.offSlotsCount}
                      </div>
                      <div className="text-[10px] text-amber-400/80 font-bold">Tự chuyển tiết sau</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-850 border border-slate-700/80">
                      <div className="text-[10px] text-slate-400 font-bold">Tiết dạy bù:</div>
                      <div className="text-lg font-black text-orange-400 mt-0.5">
                        {generatedResult.stats.makeupSlotsCount || 0}
                      </div>
                      <div className="text-[10px] text-orange-400/80 font-bold">Chèn đúng thứ tự</div>
                    </div>
                  </div>

                  {/* Warning banner if missing PPCT for any class */}
                  {generatedResult.missingPpctClasses && generatedResult.missingPpctClasses.length > 0 && (
                    <div className="p-4 rounded-2xl bg-rose-950/60 border-2 border-rose-500/70 text-rose-200 space-y-2">
                      <div className="font-extrabold flex items-center gap-2 text-rose-300 text-xs sm:text-sm">
                        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                        <span>CẢNH BÁO DỮ LIỆU: Còn {generatedResult.missingPpctClasses.length} lớp chưa có Phân phối chương trình thực tế</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Hệ thống tuân thủ nghiêm ngặt nguyên tắc <strong>không tự ý lấy PPCT Toán 7 gán cho môn học hoặc khối khác</strong> khi thiếu dữ liệu.
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {generatedResult.missingPpctClasses.map((m, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-xl bg-rose-900/60 border border-rose-700/80 text-rose-200 font-bold text-xs">
                            Lớp {m.className} ({m.subject} - Khối {m.grade || '?'})
                          </span>
                        ))}
                      </div>
                      <div className="pt-2 flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => ppctFileInputRef.current?.click()}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Nạp file PPCT thực tế ngay</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadVnEduPpctTemplate(classes)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Tải mẫu PPCT (.xlsx)</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Per-class breakdown badges */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-bold text-slate-400">Tiến độ theo lớp:</span>
                    {(Object.entries(generatedResult.stats.classStats) as [string, { totalSlots: number; lessonsAssigned: number; offCount: number; makeupCount?: number }][]).map(([cName, stat]) => (
                      <span
                        key={cName}
                        className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-bold"
                      >
                        Lớp <strong className="text-amber-400">{cName}</strong>: {stat.lessonsAssigned} bài PPCT ({stat.offCount} tiết nghỉ{stat.makeupCount ? `, ${stat.makeupCount} tiết bù` : ''})
                      </span>
                    ))}
                  </div>

                  {/* Filters for preview table */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Bảng Xem Trước Sổ Báo Giảng Tự Động:</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 font-bold">Tuần:</span>
                        <select
                          value={previewWeekFilter}
                          onChange={(e) => setPreviewWeekFilter(e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white"
                        >
                          <option value="ALL">Tất cả tuần (1-{config.totalWeeks})</option>
                          {Array.from({ length: config.totalWeeks }, (_, i) => i + 1).map((w) => (
                            <option key={w} value={String(w)}>
                              Tuần {w}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 font-bold">Lớp:</span>
                        <select
                          value={previewClassFilter}
                          onChange={(e) => setPreviewClassFilter(e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white"
                        >
                          <option value="ALL">Tất cả lớp</option>
                          {timetableClassNames.map((name) => (
                            <option key={name} value={name}>
                              Lớp {name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-200">
                      <thead className="bg-slate-950/90 sticky top-0 border-b border-slate-800 text-[11px] uppercase font-bold text-slate-400">
                        <tr>
                          <th className="py-2 px-3">Tuần</th>
                          <th className="py-2 px-3">Thứ / Ngày</th>
                          <th className="py-2 px-3">Tiết TKB</th>
                          <th className="py-2 px-3">Lớp</th>
                          <th className="py-2 px-3">Tiết PPCT</th>
                          <th className="py-2 px-3">Tên bài dạy / Hoạt động</th>
                          <th className="py-2 px-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-medium">
                        {generatedResult.generatedPlan
                          .filter((p) => {
                            const matchWeek = previewWeekFilter === 'ALL' || String(p.week) === previewWeekFilter;
                            const matchClass = previewClassFilter === 'ALL' || p.className === previewClassFilter;
                            return matchWeek && matchClass;
                          })
                          .slice(0, 100) // View first 100 in preview for speed
                          .map((item, idx) => (
                            <tr
                              key={item.id}
                              className={`hover:bg-slate-800/50 transition-colors ${
                                item.isOffDay ? 'bg-amber-950/20 text-amber-200' : ''
                              }`}
                            >
                              <td className="py-2 px-3 font-mono font-bold text-indigo-300">
                                T.{item.week}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                Thứ {item.dayOfWeek} ({item.date})
                              </td>
                              <td className="py-2 px-3 font-mono">
                                Tiết {item.period} ({item.session})
                              </td>
                              <td className="py-2 px-3 font-bold text-amber-300">
                                {item.className}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold">
                                {item.isOffDay ? (
                                  <span className="text-amber-400">NGHỈ</span>
                                ) : (
                                  <span className="text-emerald-400">{item.periodNumber}</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {item.isOffDay ? (
                                  <span className="font-bold text-amber-300 flex items-center gap-1">
                                    <span>🏖️</span>
                                    <span>{item.lessonTitle}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-100">{item.lessonTitle}</span>
                                )}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                {item.isCompleted ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                                    ✓ Đã dạy
                                  </span>
                                ) : item.isOffDay ? (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                                    Dời bài
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[11px]">Chưa dạy</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {generatedResult.warnings.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 space-y-1 text-xs text-amber-300">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>Ghi chú từ hệ thống:</span>
                      </div>
                      <ul className="list-disc pl-5 text-[11px] text-slate-300 space-y-0.5">
                        {generatedResult.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto text-xl animate-pulse">
                    ⚡
                  </div>
                  <div className="text-sm font-bold text-white">Đang chuẩn bị dữ liệu sinh lịch...</div>
                  <button
                    type="button"
                    onClick={handleRunGeneration}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow cursor-pointer"
                  >
                    Bấm để tính toán lịch ngay
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER (CONTROLS) */}
        <div className="px-5 py-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div>
            {activeStep > 1 && (
              <button
                type="button"
                onClick={() => handleGoToStep((activeStep - 1) as any)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              Hủy
            </button>

            {activeStep < 4 ? (
              <button
                type="button"
                onClick={() => handleGoToStep((activeStep + 1) as any)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
              >
                <span>Tiếp tục</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmAndApply}
                disabled={
                  !generatedResult ||
                  generatedResult.generatedPlan.length === 0 ||
                  Boolean(generatedResult.missingPpctClasses && generatedResult.missingPpctClasses.length > 0)
                }
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                title={
                  generatedResult?.missingPpctClasses && generatedResult.missingPpctClasses.length > 0
                    ? 'Còn lớp chưa có file PPCT thực tế, vui lòng nạp file trước khi lưu chính thức.'
                    : 'Lưu toàn bộ lịch đã tính toán vào Sổ Báo Giảng'
                }
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {generatedResult?.missingPpctClasses && generatedResult.missingPpctClasses.length > 0
                    ? '⚠️ Cần Nạp Đủ PPCT Để Lưu'
                    : '🚀 Lưu Toàn Bộ Vào Sổ Báo Giảng'}
                </span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
