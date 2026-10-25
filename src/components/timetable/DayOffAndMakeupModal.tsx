import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  Sparkles,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Layers,
  Filter,
} from 'lucide-react';
import {
  ClassRoom,
  TimetableSlot,
  TeachingPlanItem,
  DayOffItem,
  PpctItem,
  ScheduleGenerationConfig,
} from '../../types';
import { soundEngine } from '../../utils/audio';

interface DayOffAndMakeupModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassRoom[];
  timetable: TimetableSlot[];
  teachingPlan: TeachingPlanItem[];
  onUpdateTeachingPlan: (plan: TeachingPlanItem[]) => void;
  dayOffs: DayOffItem[];
  onUpdateDayOffs: (dayOffs: DayOffItem[]) => void;
  ppctItems: PpctItem[];
  config: ScheduleGenerationConfig;
  onOpenAddMakeupModal: () => void;
  onEditMakeupItem: (item: TeachingPlanItem) => void;
  onSelectClassAndSpin: (classId: string) => void;
}

export const DayOffAndMakeupModal: React.FC<DayOffAndMakeupModalProps> = ({
  isOpen,
  onClose,
  classes,
  timetable,
  teachingPlan,
  onUpdateTeachingPlan,
  dayOffs,
  onUpdateDayOffs,
  ppctItems,
  config,
  onOpenAddMakeupModal,
  onEditMakeupItem,
  onSelectClassAndSpin,
}) => {
  const [activeTab, setActiveTab] = useState<'DAY_OFFS' | 'MAKEUP_LESSONS'>('DAY_OFFS');

  // New Day Off Form State
  const [newOffDate, setNewOffDate] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear() < 2026 ? 2026 : now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [newOffReason, setNewOffReason] = useState<string>('');
  const [newOffAllDay, setNewOffAllDay] = useState<boolean>(true);
  const [newOffPeriods, setNewOffPeriods] = useState<number[]>([1, 2]);
  const [newOffClassId, setNewOffClassId] = useState<string>('ALL');

  // Filter for makeup lessons
  const [makeupClassFilter, setMakeupClassFilter] = useState<string>('ALL');

  // Filtered makeup lessons list
  const makeupLessons = useMemo(() => {
    return teachingPlan.filter((p) => {
      if (!p.isMakeup) return false;
      if (makeupClassFilter !== 'ALL' && p.classId !== makeupClassFilter) return false;
      return true;
    });
  }, [teachingPlan, makeupClassFilter]);

  const makeupCompletedCount = useMemo(() => {
    return makeupLessons.filter((p) => p.isCompleted).length;
  }, [makeupLessons]);

  // Handle adding new day off
  const handleAddDayOff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOffDate || !newOffReason.trim()) return;

    const newItem: DayOffItem = {
      id: `do-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      date: newOffDate,
      reason: newOffReason.trim(),
      allDay: newOffAllDay,
      periods: !newOffAllDay ? newOffPeriods : undefined,
      classId: newOffClassId,
    };

    const updated = [...dayOffs, newItem];
    onUpdateDayOffs(updated);
    soundEngine.playSuccess();
    setNewOffReason('');
  };

  // Handle deleting a day off
  const handleDeleteDayOff = (id: string) => {
    const updated = dayOffs.filter((d) => d.id !== id);
    onUpdateDayOffs(updated);
    soundEngine.playTick(0.8);
  };

  // Toggle period in new day off form
  const handleTogglePeriod = (p: number) => {
    if (newOffPeriods.includes(p)) {
      setNewOffPeriods(newOffPeriods.filter((x) => x !== p));
    } else {
      setNewOffPeriods([...newOffPeriods, p].sort((a, b) => a - b));
    }
  };

  // Delete makeup lesson
  const handleDeleteMakeupLesson = (id: string) => {
    const item = teachingPlan.find((p) => p.id === id);
    if (!item) return;

    if (item.isCompleted) {
      if (!window.confirm('Tiết dạy bù này đã được đánh dấu Đã dạy. Thầy/Cô có chắc chắn muốn xóa không?')) {
        return;
      }
    }

    const updated = teachingPlan.filter((p) => p.id !== id);
    onUpdateTeachingPlan(updated);
    soundEngine.playTick(0.8);
  };

  // Toggle completed status of makeup lesson
  const handleToggleCompleted = (id: string) => {
    const updated = teachingPlan.map((p) => {
      if (p.id === id) {
        return { ...p, isCompleted: !p.isCompleted };
      }
      return p;
    });
    onUpdateTeachingPlan(updated);
    soundEngine.playTick(1.2);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-slate-900 border-2 border-indigo-500/50 rounded-3xl max-w-4xl w-full flex flex-col max-h-[92vh] shadow-2xl shadow-indigo-500/10 overflow-hidden">
        
        {/* HEADER */}
        <div className="px-5 py-4 bg-slate-850/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/30">
              📅
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-extrabold text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>QUẢN TRỊ LỊCH GIẢNG DẠY CLASSGO</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Quản Lý Nghỉ Đột Xuất & Tiết Dạy Bù
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

        {/* TABS */}
        <div className="px-5 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('DAY_OFFS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'DAY_OFFS'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>⚡ Nghỉ Đột Xuất & Lễ Tết ({dayOffs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('MAKEUP_LESSONS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'MAKEUP_LESSONS'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>🔄 Quản Lý Dạy Bù ({makeupLessons.length})</span>
            </button>
          </div>

          {activeTab === 'MAKEUP_LESSONS' && (
            <button
              type="button"
              onClick={() => {
                onOpenAddMakeupModal();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-amber-600/30 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Thêm Tiết Dạy Bù</span>
            </button>
          )}
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* TAB 1: NGHỈ ĐỘT XUẤT */}
          {activeTab === 'DAY_OFFS' && (
            <div className="space-y-5">
              
              {/* Form Thêm Ngày Nghỉ */}
              <form
                onSubmit={handleAddDayOff}
                className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Plus className="w-4 h-4 text-rose-400" />
                    <span>Thêm Ngày Nghỉ / Tiết Nghỉ Mới</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Bài PPCT chưa dạy tự động dời sang tiết tiếp theo của đúng lớp
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1 block">Ngày nghỉ</label>
                    <input
                      type="date"
                      value={newOffDate}
                      onChange={(e) => setNewOffDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1 block">Phạm vi áp dụng</label>
                    <select
                      value={newOffClassId}
                      onChange={(e) => setNewOffClassId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-bold"
                    >
                      <option value="ALL">Toàn trường (Tất cả các lớp)</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          Chỉ áp dụng Lớp {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1 block">Thời lượng nghỉ</label>
                    <div className="flex items-center gap-2 pt-1">
                      <label className="flex items-center gap-1.5 text-xs text-slate-200 cursor-pointer">
                        <input
                          type="radio"
                          name="offAllDay"
                          checked={newOffAllDay}
                          onChange={() => setNewOffAllDay(true)}
                          className="text-rose-500 focus:ring-0"
                        />
                        <span>Nghỉ cả ngày</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-slate-200 cursor-pointer ml-3">
                        <input
                          type="radio"
                          name="offAllDay"
                          checked={!newOffAllDay}
                          onChange={() => setNewOffAllDay(false)}
                          className="text-rose-500 focus:ring-0"
                        />
                        <span>Theo tiết cụ thể</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Specific periods picker */}
                {!newOffAllDay && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-300 block">
                      Chọn các tiết nghỉ:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => {
                        const checked = newOffPeriods.includes(p);
                        return (
                          <button
                            type="button"
                            key={p}
                            onClick={() => handleTogglePeriod(p)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              checked
                                ? 'bg-rose-600 text-white shadow'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            Tiết {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reason and Submit */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  <input
                    type="text"
                    value={newOffReason}
                    onChange={(e) => setNewOffReason(e.target.value)}
                    placeholder="Nhập lý do nghỉ: Mưa bão đột xuất, Đại hội Đoàn, Đi tập huấn chuyên môn..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                    required
                  />

                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/30 shrink-0 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Lưu Ngày Nghỉ</span>
                  </button>
                </div>
              </form>

              {/* Danh sách ngày nghỉ đã có */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Danh sách ngày nghỉ đã thiết lập ({dayOffs.length}):</span>
                  <span className="text-slate-500 text-[11px]">
                    (Năm học 2026 - 2027)
                  </span>
                </div>

                {dayOffs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    Chưa có ngày nghỉ nào được thiết lập.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {dayOffs.map((d) => (
                      <div
                        key={d.id}
                        className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3 hover:border-slate-700 transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-amber-300">
                              {d.date}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                              {d.allDay ? 'Nghỉ cả ngày' : `Nghỉ tiết: ${d.periods?.join(', ')}`}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                              {d.classId === 'ALL' || !d.classId
                                ? 'Toàn trường'
                                : `Lớp ${classes.find((c) => c.id === d.classId)?.name || d.classId}`}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-white">
                            {d.reason}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteDayOff(d.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
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

          {/* TAB 2: QUẢN LÝ DẠY BÙ */}
          {activeTab === 'MAKEUP_LESSONS' && (
            <div className="space-y-4">
              
              {/* Toolbar & Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Tổng số:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
                    {makeupLessons.length} tiết dạy bù
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                    {makeupCompletedCount} đã hoàn thành
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-400 font-bold">Lọc lớp:</span>
                  <select
                    value={makeupClassFilter}
                    onChange={(e) => setMakeupClassFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="ALL">Tất cả các lớp</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        Lớp {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* List of makeup lessons */}
              {makeupLessons.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs space-y-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                  <div className="text-3xl">🔄</div>
                  <p>Chưa có tiết dạy bù nào được tạo.</p>
                  <button
                    type="button"
                    onClick={onOpenAddMakeupModal}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/30 transition-all cursor-pointer"
                  >
                    + Thêm Tiết Dạy Bù Đầu Tiên
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {makeupLessons.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        item.isCompleted
                          ? 'bg-slate-950/40 border-slate-800 opacity-80'
                          : 'bg-slate-950 border-amber-500/40 hover:border-amber-500'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleCompleted(item.id)}
                          className="mt-1 cursor-pointer"
                          title={item.isCompleted ? 'Đánh dấu chưa dạy' : 'Đánh dấu đã dạy xong'}
                        >
                          {item.isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <div className="w-5 h-5 rounded border border-amber-500/60 hover:bg-amber-500/20" />
                          )}
                        </button>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-600 to-orange-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                              🔄 DẠY BÙ
                            </span>
                            <span className="font-mono text-xs font-bold text-sky-300">
                              {item.date}
                            </span>
                            <span className="text-[11px] font-bold text-slate-300">
                              Tiết {item.period} ({item.session || (item.period && item.period <= 5 ? 'Sáng' : 'Chiều')})
                            </span>
                            <span className="font-black text-amber-300 text-xs">
                              Lớp {item.className}
                            </span>
                            <span className="text-slate-400 text-xs font-medium">
                              (Tiết PPCT: {item.periodNumber})
                            </span>
                            {item.isCompleted && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                ✓ Đã hoàn thành
                              </span>
                            )}
                          </div>

                          <div
                            className={`text-sm font-bold ${
                              item.isCompleted ? 'line-through text-slate-400' : 'text-white'
                            }`}
                          >
                            {item.lessonTitle}
                          </div>

                          {item.notes && (
                            <div className="text-xs text-slate-400 italic">
                              📝 {item.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => onSelectClassAndSpin(item.classId)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          title="Vào lớp điểm danh và gọi tên học sinh kiểm tra bài cũ"
                        >
                          <span>Vào lớp</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onEditMakeupItem(item)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Chỉnh sửa tiết dạy bù"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteMakeupLesson(item.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                          title="Hủy tiết dạy bù này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="px-5 py-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400">
            Mọi thay đổi về Ngày nghỉ & Dạy bù được tự động cập nhật vào Sổ báo giảng.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
