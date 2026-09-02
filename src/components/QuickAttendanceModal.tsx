import React, { useState } from 'react';
import {
  UserCheck,
  UserX,
  Search,
  CheckCircle2,
  X,
  Users,
  AlertCircle,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { ClassRoom, Student } from '../types';
import { soundEngine } from '../utils/audio';

interface QuickAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeClass: ClassRoom;
  onUpdateStudents: (students: Student[]) => void;
}

export const QuickAttendanceModal: React.FC<QuickAttendanceModalProps> = ({
  isOpen,
  onClose,
  activeClass,
  onUpdateStudents,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'PRESENT' | 'ABSENT'>('ALL');

  if (!isOpen) return null;

  const students = activeClass.students || [];
  const absentCount = students.filter((s) => s.isAbsent).length;
  const presentCount = students.length - absentCount;
  const attendanceRate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

  // Toggle single student absent state
  const handleToggleAbsent = (studentId: string) => {
    const updated = students.map((s) => {
      if (s.id === studentId) {
        const nextState = !s.isAbsent;
        return { ...s, isAbsent: nextState };
      }
      return s;
    });
    onUpdateStudents(updated);
    soundEngine.playTick(1.3);
  };

  // Mark all present
  const handleMarkAllPresent = () => {
    const updated = students.map((s) => ({ ...s, isAbsent: false }));
    onUpdateStudents(updated);
    soundEngine.playVictoryFanfare();
  };

  // Filter list
  const filteredStudents = students.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.studentCode && s.studentCode.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchSearch) return false;

    if (filterMode === 'PRESENT') return !s.isAbsent;
    if (filterMode === 'ABSENT') return !!s.isAbsent;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div
        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-800/90 border-b border-slate-700 p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>📋 Điểm Danh Nhanh Đầu Giờ</span>
              </h2>
              <p className="text-xs text-slate-400">
                Lớp <strong className="text-indigo-300">{activeClass.name}</strong> • Đánh dấu các bạn vắng để vòng quay tự động bỏ qua
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats & Quick Actions Bar */}
        <div className="bg-slate-900 px-4 sm:px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Quick Counter Badges */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 font-bold border border-slate-700 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Sĩ số: {students.length}
            </span>
            <span className="px-3 py-1 rounded-xl bg-emerald-950/70 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              Có mặt: {presentCount} ({attendanceRate}%)
            </span>
            {absentCount > 0 && (
              <span className="px-3 py-1 rounded-xl bg-rose-950/70 text-rose-300 font-bold border border-rose-500/40 flex items-center gap-1.5 animate-pulse">
                <UserX className="w-3.5 h-3.5 text-rose-400" />
                Vắng: {absentCount}
              </span>
            )}
          </div>

          {/* Mark all present button */}
          <button
            onClick={handleMarkAllPresent}
            disabled={absentCount === 0}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              absentCount > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:scale-105'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Tất cả có mặt</span>
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="p-4 sm:px-6 bg-slate-900/60 border-b border-slate-800 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc mã học sinh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700 w-full sm:w-auto justify-center">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                filterMode === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tất cả ({students.length})
            </button>
            <button
              onClick={() => setFilterMode('PRESENT')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                filterMode === 'PRESENT' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              Có mặt ({presentCount})
            </button>
            <button
              onClick={() => setFilterMode('ABSENT')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                filterMode === 'ABSENT' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              Vắng ({absentCount})
            </button>
          </div>
        </div>

        {/* Students Fast Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              Không tìm thấy học sinh nào phù hợp với bộ lọc.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredStudents.map((st, idx) => {
                const isAbsent = !!st.isAbsent;
                return (
                  <button
                    key={st.id}
                    onClick={() => handleToggleAbsent(st.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-left group ${
                      isAbsent
                        ? 'bg-rose-950/30 border-rose-800/50 hover:bg-rose-900/40 text-rose-200'
                        : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-100 hover:border-indigo-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 text-xs font-mono flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="font-bold text-sm truncate flex items-center gap-1.5">
                          <span className={isAbsent ? 'line-through text-slate-400' : 'text-white'}>
                            {st.name}
                          </span>
                          {st.gender && (
                            <span className="text-[10px] text-slate-400">
                              {st.gender === 'nam' ? '👦' : st.gender === 'nu' ? '👧' : ''}
                            </span>
                          )}
                          {st.stars && st.stars > 0 ? (
                            <span className="text-[10px] text-amber-300 flex items-center font-mono">
                              ⭐{st.stars}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Lên bảng: <strong className="text-indigo-400">{st.callCount || 0}</strong> lần
                        </div>
                      </div>
                    </div>

                    {/* Fast Status Pill */}
                    <div className="shrink-0 ml-2">
                      {isAbsent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-sm">
                          <UserX className="w-3.5 h-3.5" />
                          <span>Vắng</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-xs group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Có mặt</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-800/90 border-t border-slate-700 p-4 px-6 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            *Nhấn vào từng bạn để đổi nhanh trạng thái Có mặt / Vắng
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md transition-colors"
          >
            Hoàn tất điểm danh
          </button>
        </div>
      </div>
    </div>
  );
};
