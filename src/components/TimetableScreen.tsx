import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  MapPin,
  CheckSquare,
  Square,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { ClassRoom, TimetableSlot, TeachingPlanItem } from '../types';
import { soundEngine } from '../utils/audio';

interface TimetableScreenProps {
  classes: ClassRoom[];
  timetable: TimetableSlot[];
  onUpdateTimetable: (slots: TimetableSlot[]) => void;
  teachingPlan: TeachingPlanItem[];
  onUpdateTeachingPlan: (plan: TeachingPlanItem[]) => void;
  onSelectClassAndSpin: (classId: string) => void;
}

const DAYS_OF_WEEK: { day: 2 | 3 | 4 | 5 | 6 | 7; label: string; short: string }[] = [
  { day: 2, label: 'Thứ Hai', short: 'T2' },
  { day: 3, label: 'Thứ Ba', short: 'T3' },
  { day: 4, label: 'Thứ Tư', short: 'T4' },
  { day: 5, label: 'Thứ Năm', short: 'T5' },
  { day: 6, label: 'Thứ Sáu', short: 'T6' },
  { day: 7, label: 'Thứ Bảy', short: 'T7' },
];

const PERIODS = [
  { p: 1, session: 'Sáng', time: '07:00 - 07:45' },
  { p: 2, session: 'Sáng', time: '07:50 - 08:35' },
  { p: 3, session: 'Sáng', time: '08:50 - 09:35' },
  { p: 4, session: 'Sáng', time: '09:40 - 10:25' },
  { p: 5, session: 'Sáng', time: '10:30 - 11:15' },
  { p: 6, session: 'Chiều', time: '13:30 - 14:15' },
  { p: 7, session: 'Chiều', time: '14:20 - 15:05' },
  { p: 8, session: 'Chiều', time: '15:20 - 16:05' },
  { p: 9, session: 'Chiều', time: '16:10 - 16:55' },
  { p: 10, session: 'Chiều', time: '17:00 - 17:45' },
];

export const TimetableScreen: React.FC<TimetableScreenProps> = ({
  classes,
  timetable,
  onUpdateTimetable,
  teachingPlan,
  onUpdateTeachingPlan,
  onSelectClassAndSpin,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'TIMETABLE' | 'TEACHING_LOG'>('TIMETABLE');
  const [editingSlot, setEditingSlot] = useState<Partial<TimetableSlot> | null>(null);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);

  // Teaching Log state
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [newPlanWeek, setNewPlanWeek] = useState<number>(1);
  const [newPlanClassId, setNewPlanClassId] = useState<string>(classes[0]?.id || '');
  const [newPlanPeriodNum, setNewPlanPeriodNum] = useState<number>(1);
  const [newPlanLesson, setNewPlanLesson] = useState<string>('');
  const [newPlanNotes, setNewPlanNotes] = useState<string>('');

  // Get current day of week (Sunday=0, Monday=1/Day 2, Tuesday=2/Day 3)
  const now = new Date();
  const currentJsDay = now.getDay();
  // Map JS Day: 0(Sun) -> 8(Off), 1(Mon) -> 2, 2(Tue) -> 3, ..., 6(Sat) -> 7
  const currentVnDay = currentJsDay === 0 ? 8 : (currentJsDay + 1);

  // Find slot for day & period
  const getSlot = (day: number, period: number) => {
    return timetable.find((s) => s.dayOfWeek === day && s.period === period);
  };

  const handleOpenAddSlot = (day: 2 | 3 | 4 | 5 | 6 | 7, period: number) => {
    const existing = getSlot(day, period);
    if (existing) {
      setEditingSlot(existing);
    } else {
      setEditingSlot({
        id: `slot-${Date.now()}`,
        dayOfWeek: day,
        period,
        classId: classes[0]?.id || '',
        className: classes[0]?.name || 'Lớp học',
        subject: 'Toán học',
        room: 'P.201',
        note: '',
      });
    }
    setIsSlotModalOpen(true);
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot || !editingSlot.classId) return;

    const targetClass = classes.find((c) => c.id === editingSlot.classId);
    const finalizedSlot: TimetableSlot = {
      id: editingSlot.id || `slot-${Date.now()}`,
      dayOfWeek: editingSlot.dayOfWeek as 2 | 3 | 4 | 5 | 6 | 7,
      period: editingSlot.period as number,
      classId: editingSlot.classId,
      className: targetClass ? targetClass.name : (editingSlot.className || ''),
      subject: editingSlot.subject || 'Toán học',
      room: editingSlot.room || '',
      note: editingSlot.note || '',
    };

    const remaining = timetable.filter(
      (s) => !(s.dayOfWeek === finalizedSlot.dayOfWeek && s.period === finalizedSlot.period)
    );

    onUpdateTimetable([...remaining, finalizedSlot]);
    setIsSlotModalOpen(false);
    setEditingSlot(null);
    soundEngine.playSuccess();
  };

  const handleDeleteSlot = (id: string) => {
    onUpdateTimetable(timetable.filter((s) => s.id !== id));
    setIsSlotModalOpen(false);
    setEditingSlot(null);
  };

  // Teaching Log Handlers
  const handleAddTeachingPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanLesson.trim() || !newPlanClassId) return;

    const cls = classes.find((c) => c.id === newPlanClassId);
    const newItem: TeachingPlanItem = {
      id: `tp-${Date.now()}`,
      week: newPlanWeek,
      classId: newPlanClassId,
      className: cls ? cls.name : 'Lớp học',
      periodNumber: newPlanPeriodNum,
      lessonTitle: newPlanLesson.trim(),
      notes: newPlanNotes.trim() || undefined,
      isCompleted: false,
    };

    onUpdateTeachingPlan([...teachingPlan, newItem]);
    setNewPlanLesson('');
    setNewPlanNotes('');
    setNewPlanPeriodNum((prev) => prev + 1);
    soundEngine.playTick(1.2);
  };

  const handleTogglePlanCompleted = (id: string) => {
    const updated = teachingPlan.map((p) =>
      p.id === id ? { ...p, isCompleted: !p.isCompleted } : p
    );
    onUpdateTeachingPlan(updated);
    soundEngine.playTick(1.0);
  };

  const handleDeletePlanItem = (id: string) => {
    onUpdateTeachingPlan(teachingPlan.filter((p) => p.id !== id));
  };

  const filteredPlans = teachingPlan.filter(
    (p) => selectedClassFilter === 'ALL' || p.classId === selectedClassFilter
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header & Quick stats */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-2xl border border-indigo-500/30">
            📅
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Thời Khóa Biểu & Sổ Báo Giảng
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                Toán Học
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Quản lý lịch dạy hàng tuần, bấm 1 click vào lớp quay tên kiểm tra bài cũ
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab('TIMETABLE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'TIMETABLE'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Thời Khóa Biểu Tuần</span>
          </button>
          <button
            onClick={() => setActiveSubTab('TEACHING_LOG')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'TEACHING_LOG'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Sổ Báo Giảng & Tiến Độ ({teachingPlan.length})</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: TIMETABLE */}
      {activeSubTab === 'TIMETABLE' && (
        <div className="space-y-4">
          {/* Today's Alert */}
          <div className="bg-gradient-to-r from-sky-950/60 via-indigo-950/60 to-slate-900 border border-sky-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🔔</span>
              <div>
                <span className="text-xs font-black uppercase text-sky-400 tracking-wider">
                  Hôm nay là{' '}
                  {currentVnDay >= 2 && currentVnDay <= 7
                    ? `Thứ ${currentVnDay}`
                    : 'Chủ Nhật (Nghỉ)'}
                </span>
                <p className="text-xs text-slate-300 mt-0.5">
                  Các tiết dạy hôm nay được làm nổi bật với viền sáng để thầy cô theo dõi nhanh
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-400">
              💡 Bấm vào ô tiết bất kỳ để thêm hoặc chỉnh sửa
            </div>
          </div>

          {/* Timetable Matrix Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 w-28">
                    Tiết / Giờ
                  </th>
                  {DAYS_OF_WEEK.map((d) => {
                    const isToday = d.day === currentVnDay;
                    return (
                      <th
                        key={d.day}
                        className={`p-3 text-center text-xs font-black uppercase tracking-wider border-b border-slate-800 ${
                          isToday
                            ? 'bg-indigo-600/20 text-amber-300 border-indigo-500/40 rounded-t-xl'
                            : 'text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{d.label}</span>
                          {isToday && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {PERIODS.map((period) => {
                  const isBreak = period.p === 5; // After morning
                  return (
                    <React.Fragment key={period.p}>
                      <tr className="hover:bg-slate-800/30 transition-colors">
                        {/* Period header */}
                        <td className="p-3 font-semibold text-slate-400 border-r border-slate-800/80 bg-slate-950/40">
                          <div className="font-bold text-slate-200">Tiết {period.p}</div>
                          <div className="text-[10px] text-slate-500">{period.time}</div>
                          <div className="text-[9px] text-indigo-400 font-bold uppercase mt-0.5">
                            {period.session}
                          </div>
                        </td>

                        {/* Days cols */}
                        {DAYS_OF_WEEK.map((d) => {
                          const slot = getSlot(d.day, period.p);
                          const isToday = d.day === currentVnDay;

                          return (
                            <td
                              key={d.day}
                              onClick={() => handleOpenAddSlot(d.day, period.p)}
                              className={`p-2 border-r border-slate-800/40 cursor-pointer transition-all hover:bg-indigo-950/30 ${
                                isToday ? 'bg-indigo-950/15' : ''
                              }`}
                            >
                              {slot ? (
                                <div className="group relative bg-gradient-to-br from-indigo-950/90 to-slate-800/90 border border-indigo-500/40 hover:border-indigo-400 rounded-xl p-2.5 shadow-md flex flex-col justify-between min-h-[85px] transition-all transform hover:-translate-y-0.5">
                                  <div>
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-black text-amber-300 text-sm">
                                        Lớp {slot.className}
                                      </span>
                                      {slot.room && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 flex items-center gap-0.5">
                                          <MapPin className="w-2.5 h-2.5 text-indigo-400" />
                                          {slot.room}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] font-semibold text-slate-200 mt-1">
                                      {slot.subject}
                                    </div>
                                    {slot.note && (
                                      <div className="text-[10px] text-slate-400 italic line-clamp-1 mt-0.5">
                                        {slot.note}
                                      </div>
                                    )}
                                  </div>

                                  {/* Quick Jump to Spin Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelectClassAndSpin(slot.classId);
                                    }}
                                    className="mt-2 w-full py-1 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] flex items-center justify-center gap-1 shadow transition-all active:scale-95"
                                    title="Chuyển ngay sang lớp này và vào vòng quay bài cũ"
                                  >
                                    <span>🎲 Vào Dạy Ngay</span>
                                    <ArrowRight className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="h-full min-h-[85px] border border-dashed border-slate-800 hover:border-slate-600 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-400 transition-colors">
                                  <Plus className="w-4 h-4 opacity-50" />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Break divider between Morning & Afternoon */}
                      {isBreak && (
                        <tr className="bg-slate-950/80">
                          <td
                            colSpan={7}
                            className="py-2 text-center text-[11px] font-bold text-amber-400/80 uppercase tracking-widest border-y border-slate-800"
                          >
                            ☀️ NGHỈ TRƯA (CHUYỂN CA CHIỀU) ☀️
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TEACHING LOG (SỔ BÁO GIẢNG TỰ ĐỘNG) */}
      {activeSubTab === 'TEACHING_LOG' && (
        <div className="space-y-6">
          {/* Add Teaching Log Form */}
          <form
            onSubmit={handleAddTeachingPlan}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>➕ Thêm Tiến Độ / Tiết Báo Giảng</span>
              </h3>
              <span className="text-xs text-slate-400">
                Ghi nhớ bài học để không bao giờ bị dạy nhầm tiết giữa các lớp
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">Tuần học</label>
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={newPlanWeek}
                  onChange={(e) => setNewPlanWeek(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">Lớp giảng dạy</label>
                <select
                  value={newPlanClassId}
                  onChange={(e) => setNewPlanClassId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      Lớp {c.name} ({c.subject || 'Toán'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">
                  Tiết theo PPCT (Phân phối chương trình)
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={newPlanPeriodNum}
                  onChange={(e) => setNewPlanPeriodNum(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">Tên bài học</label>
                <input
                  type="text"
                  value={newPlanLesson}
                  onChange={(e) => setNewPlanLesson(e.target.value)}
                  placeholder="VD: Khái niệm đạo hàm (Tiết 1)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <input
                type="text"
                value={newPlanNotes}
                onChange={(e) => setNewPlanNotes(e.target.value)}
                placeholder="Ghi chú thêm: Chuẩn bị máy chiếu, bài tập về nhà, phiếu học tập..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shrink-0 transition-all"
              >
                <Plus className="w-4 h-4" /> Lưu Vào Sổ Báo Giảng
              </button>
            </div>
          </form>

          {/* Teaching Plan List */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Sổ Báo Giảng Bộ Môn</h3>
                <span className="text-xs text-slate-400">
                  (Đã hoàn thành {teachingPlan.filter((p) => p.isCompleted).length}/{teachingPlan.length} tiết)
                </span>
              </div>

              {/* Filter by class */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-400 font-bold">Lọc theo lớp:</span>
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
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

            {/* List entries */}
            <div className="space-y-2.5">
              {filteredPlans.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  Chưa có tiết báo giảng nào. Thầy cô hãy thêm tiết học ở khung phía trên nhé!
                </div>
              ) : (
                filteredPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      plan.isCompleted
                        ? 'bg-slate-950/40 border-slate-800 opacity-75'
                        : 'bg-slate-800/80 border-slate-700/80 hover:border-indigo-500/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleTogglePlanCompleted(plan.id)}
                        className="mt-0.5 text-slate-400 hover:text-indigo-400 transition-colors"
                        title={plan.isCompleted ? 'Đánh dấu chưa dạy' : 'Đánh dấu đã dạy xong'}
                      >
                        {plan.isCompleted ? (
                          <CheckSquare className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-500" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold text-[11px] border border-indigo-500/30">
                            Tuần {plan.week}
                          </span>
                          <span className="font-extrabold text-amber-300 text-xs">
                            Lớp {plan.className}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            (Tiết PPCT: {plan.periodNumber})
                          </span>
                          {plan.isCompleted && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                              ✓ Đã dạy
                            </span>
                          )}
                        </div>

                        <div
                          className={`text-sm font-bold mt-1 ${
                            plan.isCompleted ? 'line-through text-slate-400' : 'text-white'
                          }`}
                        >
                          {plan.lessonTitle}
                        </div>

                        {plan.notes && (
                          <div className="text-xs text-slate-400 mt-0.5 italic">
                            📝 {plan.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => onSelectClassAndSpin(plan.classId)}
                        className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        <span>Vào lớp</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePlanItem(plan.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Xóa tiết báo giảng này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Slot Modal */}
      {isSlotModalOpen && editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center justify-between">
              <span>
                Chỉnh sửa: Thứ {editingSlot.dayOfWeek} - Tiết {editingSlot.period}
              </span>
              <button
                onClick={() => setIsSlotModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </h3>

            <form onSubmit={handleSaveSlot} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">Lớp học</label>
                <select
                  value={editingSlot.classId || ''}
                  onChange={(e) => {
                    const cls = classes.find((c) => c.id === e.target.value);
                    setEditingSlot({
                      ...editingSlot,
                      classId: e.target.value,
                      className: cls ? cls.name : '',
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      Lớp {c.name} ({c.subject || 'Toán'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">
                  Phân môn / Chủ đề
                </label>
                <input
                  type="text"
                  value={editingSlot.subject || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, subject: e.target.value })}
                  placeholder="VD: Toán (Đại số), Toán (Hình học)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">Phòng học</label>
                <input
                  type="text"
                  value={editingSlot.room || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, room: e.target.value })}
                  placeholder="VD: P.201, Phòng máy..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">
                  Ghi chú bài dạy
                </label>
                <input
                  type="text"
                  value={editingSlot.note || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, note: e.target.value })}
                  placeholder="VD: Bài tập ôn thi giữa kỳ..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                {editingSlot.id && getSlot(editingSlot.dayOfWeek as number, editingSlot.period as number) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSlot(editingSlot.id!)}
                    className="px-3 py-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-bold"
                  >
                    Xóa tiết này
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsSlotModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow"
                  >
                    Lưu Tiết Học
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
