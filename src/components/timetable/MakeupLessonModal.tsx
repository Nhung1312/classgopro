import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  AlertTriangle,
  Calendar,
  Clock,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
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
  findNextUntaughtPpctLesson,
  checkMakeupCollision,
} from '../../utils/timetableExcelService';

interface MakeupLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassRoom[];
  timetable: TimetableSlot[];
  teachingPlan: TeachingPlanItem[];
  ppctItems: PpctItem[];
  dayOffs: DayOffItem[];
  config: ScheduleGenerationConfig;
  editingItem?: TeachingPlanItem | null;
  onSaveMakeup: (item: TeachingPlanItem) => void;
}

export const MakeupLessonModal: React.FC<MakeupLessonModalProps> = ({
  isOpen,
  onClose,
  classes,
  timetable,
  teachingPlan,
  ppctItems,
  dayOffs,
  config,
  editingItem,
  onSaveMakeup,
}) => {
  // Form state
  const [classId, setClassId] = useState<string>(
    editingItem?.classId || classes[0]?.id || ''
  );
  const [subject, setSubject] = useState<string>(
    editingItem?.subject || classes[0]?.subject || 'Toán học'
  );

  // Date formatted as YYYY-MM-DD
  const [date, setDate] = useState<string>(() => {
    if (editingItem?.date) {
      if (editingItem.date.includes('/')) {
        const [d, m, y] = editingItem.date.split('/');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      return editingItem.date;
    }
    // Default to tomorrow or current date in 2026-2027
    const now = new Date();
    const y = now.getFullYear() < 2026 ? 2026 : now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [period, setPeriod] = useState<number>(editingItem?.period || 1);
  const [session, setSession] = useState<'Sáng' | 'Chiều'>(
    editingItem?.session || (period <= 5 ? 'Sáng' : 'Chiều')
  );
  const [makeupReason, setMakeupReason] = useState<string>(
    editingItem?.makeupReason || ''
  );
  const [customLessonTitle, setCustomLessonTitle] = useState<string>(
    editingItem?.lessonTitle || ''
  );
  const [useAutoLesson, setUseAutoLesson] = useState<boolean>(!editingItem?.lessonTitle);

  // Update subject when class changes
  useEffect(() => {
    const cls = classes.find((c) => c.id === classId);
    if (cls && cls.subject && !editingItem) {
      setSubject(cls.subject);
    }
  }, [classId, classes, editingItem]);

  // Sync session when period changes
  useEffect(() => {
    setSession(period <= 5 ? 'Sáng' : 'Chiều');
  }, [period]);

  // Calculate next untaught PPCT lesson for this class and subject
  const nextLesson = useMemo(() => {
    return findNextUntaughtPpctLesson({
      classId,
      subject,
      classes,
      ppctItems,
      teachingPlan,
    });
  }, [classId, subject, classes, ppctItems, teachingPlan]);

  // Effective lesson title to be used
  const effectiveLessonTitle = useAutoLesson
    ? nextLesson?.lessonTitle || customLessonTitle || 'Tiết Dạy Bù'
    : customLessonTitle || nextLesson?.lessonTitle || 'Tiết Dạy Bù';

  const effectivePeriodNumber = useAutoLesson
    ? nextLesson?.periodNumber || 1
    : editingItem?.periodNumber || nextLesson?.periodNumber || 1;

  // Real-time collision checking
  const collisionResult = useMemo(() => {
    if (!date || !classId) {
      return { hasConflict: false, conflicts: [], severity: 'NONE' as const };
    }
    return checkMakeupCollision({
      date,
      period,
      classId,
      subject,
      timetable,
      teachingPlan: editingItem ? teachingPlan.filter((p) => p.id !== editingItem.id) : teachingPlan,
      dayOffs,
    });
  }, [date, period, classId, subject, timetable, teachingPlan, dayOffs, editingItem]);

  // Calculate week from date
  const calculatedWeek = useMemo(() => {
    try {
      const target = new Date(date + 'T00:00:00');
      const start = new Date((config.startDate || '2026-09-07') + 'T00:00:00');
      const diffMs = target.getTime() - start.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const w = Math.floor(diffDays / 7) + 1;
      return Math.max(1, Math.min(40, w));
    } catch {
      return 1;
    }
  }, [date, config.startDate]);

  // Calculate Vietnamese day of week
  const dayOfWeekNum = useMemo(() => {
    try {
      const target = new Date(date + 'T00:00:00');
      const jsDay = target.getDay();
      return (jsDay === 0 ? 8 : (jsDay + 1)) as 2 | 3 | 4 | 5 | 6 | 7;
    } catch {
      return 2 as const;
    }
  }, [date]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId || !date) return;

    const foundCls = classes.find((c) => c.id === classId);
    const clsName = foundCls ? foundCls.name : 'Lớp học';

    const [yyyy, mm, dd] = date.split('-');
    const dateFormatted = `${dd}/${mm}/${yyyy}`;

    const newItem: TeachingPlanItem = {
      id: editingItem?.id || `plan-makeup-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      week: calculatedWeek,
      date: dateFormatted,
      dayOfWeek: dayOfWeekNum >= 2 && dayOfWeekNum <= 7 ? (dayOfWeekNum as any) : undefined,
      period,
      session,
      classId,
      className: clsName,
      subject,
      periodNumber: effectivePeriodNumber,
      lessonTitle: effectiveLessonTitle,
      notes: `[DẠY BÙ] ${makeupReason || 'Dạy bù theo kế hoạch'}`.trim(),
      isCompleted: editingItem?.isCompleted || false,
      isOffDay: false,
      isMakeup: true,
      makeupReason: makeupReason || 'Dạy bù theo kế hoạch',
    };

    onSaveMakeup(newItem);
    soundEngine.playSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl max-w-2xl w-full flex flex-col shadow-2xl shadow-amber-500/10 overflow-hidden">
        
        {/* HEADER */}
        <div className="px-5 py-4 bg-slate-850/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-amber-500/30">
              🔄
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-extrabold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>KẾ HOẠCH DẠY BÙ CHUẨN XÁC</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {editingItem ? 'Chỉnh Sửa Tiết Dạy Bù' : 'Thêm Tiết Dạy Bù Mới'}
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

        {/* BODY */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          
          {/* Class and Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                Lớp học cần dạy bù <span className="text-rose-400">*</span>
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                required
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.name} {c.subject ? `(${c.subject})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                Môn học <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="VD: Toán học, Đại số..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          {/* Date, Session, Period */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1.5 block flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Ngày dạy bù</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                {dayOfWeekNum === 8 ? 'Chủ Nhật' : `Thứ ${dayOfWeekNum}`} • Tuần {calculatedWeek}
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                Buổi dạy
              </label>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Sáng">Buổi Sáng (Tiết 1 - 5)</option>
                <option value="Chiều">Buổi Chiều (Tiết 6 - 10)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 mb-1.5 block flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>Tiết học (1 - 10)</span>
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
              >
                <optgroup label="Buổi Sáng">
                  <option value={1}>Tiết 1 (07:00 - 07:45)</option>
                  <option value={2}>Tiết 2 (07:50 - 08:35)</option>
                  <option value={3}>Tiết 3 (08:50 - 09:35)</option>
                  <option value={4}>Tiết 4 (09:40 - 10:25)</option>
                  <option value={5}>Tiết 5 (10:30 - 11:15)</option>
                </optgroup>
                <optgroup label="Buổi Chiều">
                  <option value={6}>Tiết 6 (13:30 - 14:15)</option>
                  <option value={7}>Tiết 7 (14:20 - 15:05)</option>
                  <option value={8}>Tiết 8 (15:20 - 16:05)</option>
                  <option value={9}>Tiết 9 (16:10 - 16:55)</option>
                  <option value={10}>Tiết 10 (17:00 - 17:45)</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Reason for makeup */}
          <div>
            <label className="text-xs font-bold text-slate-300 mb-1.5 block">
              Lý do dạy bù (Ghi chú trên Sổ báo giảng)
            </label>
            <input
              type="text"
              value={makeupReason}
              onChange={(e) => setMakeupReason(e.target.value)}
              placeholder="VD: Dạy bù cho tiết 3 ngày 10/09 do mưa bão, Bù chương trình chuyên đề..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* PPCT Lesson Preview & Selection */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Nội Dung Bài Dạy PPCT:</span>
              </span>
              
              <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAutoLesson}
                  onChange={(e) => setUseAutoLesson(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0 bg-slate-800 border-slate-700"
                />
                <span>Tự động lấy bài chưa dạy tiếp theo</span>
              </label>
            </div>

            {useAutoLesson ? (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-700/80 space-y-1">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Hệ thống tự động tra cứu bài PPCT tiếp theo:</span>
                </div>
                {nextLesson ? (
                  <div className="text-xs text-white font-medium pl-5">
                    <strong className="text-amber-300">Tiết PPCT số {nextLesson.periodNumber}:</strong> {nextLesson.lessonTitle}
                    {nextLesson.notes && (
                      <span className="text-slate-400 block text-[11px] italic mt-0.5">
                        📝 {nextLesson.notes}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-amber-300 italic pl-5">
                    Đã hoàn thành hết khung PPCT của lớp này, hoặc chưa tải file PPCT lên.
                  </div>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={customLessonTitle}
                  onChange={(e) => setCustomLessonTitle(e.target.value)}
                  placeholder="Nhập tên bài dạy bù tùy chỉnh..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

          {/* Real-time Collision Alerts */}
          {collisionResult.hasConflict && (
            <div
              className={`p-3.5 rounded-2xl border space-y-1.5 text-xs ${
                collisionResult.severity === 'CRITICAL'
                  ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                  : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
              }`}
            >
              <div className="font-bold flex items-center gap-2">
                <AlertTriangle
                  className={`w-4 h-4 ${
                    collisionResult.severity === 'CRITICAL'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}
                />
                <span>
                  {collisionResult.severity === 'CRITICAL'
                    ? 'Phát hiện xung đột lịch nghiêm trọng:'
                    : 'Cảnh báo về lịch học:'}
                </span>
              </div>
              <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                {collisionResult.conflicts.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
              <p className="text-[10px] opacity-80 pt-1 italic">
                Thầy/Cô vẫn có thể lưu nếu đây là lịch dạy bù đặc biệt theo thỏa thuận với nhà trường.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs shadow-lg shadow-amber-600/30 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingItem ? 'Lưu Thay Đổi' : 'Xác Nhận Thêm Tiết Dạy Bù'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
