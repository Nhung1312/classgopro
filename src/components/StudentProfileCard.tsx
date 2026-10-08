import React, { useState } from 'react';
import {
  X,
  Star,
  Target,
  Clock,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ArrowLeft,
  Calendar,
  Award,
  BookOpen,
  Phone,
} from 'lucide-react';
import { Student, DisciplineRecord, DisciplineViolationType } from '../types';

interface StudentProfileCardProps {
  student: Student;
  className?: string;
  disciplineRecords?: DisciplineRecord[];
  disciplineViolationTypes?: DisciplineViolationType[];
  onClose: () => void;
}

export const StudentProfileCard: React.FC<StudentProfileCardProps> = ({
  student,
  className = '',
  disciplineRecords = [],
  disciplineViolationTypes = [],
  onClose,
}) => {
  const [showParentReport, setShowParentReport] = useState(false);

  // 1. Avatar initials:
  // Nguyễn Minh Anh -> MA (Minh Anh)
  // Trần Đức Nam -> DN (Đức Nam)
  // If single word: "Nam" -> "NA" or "N"
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    // Lấy chữ cái của từ áp chót và từ cuối cùng (ví dụ Nguyễn Minh Anh -> M + A = MA)
    const secondLast = parts[parts.length - 2];
    const last = parts[parts.length - 1];
    return (secondLast[0] + last[0]).toUpperCase();
  };

  // Deterministic color from student.id or student.name so same student always has the same color
  const getAvatarGradient = (idOrName: string) => {
    let hash = 0;
    for (let i = 0; i < idOrName.length; i++) {
      hash = idOrName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gradients = [
      'from-indigo-600 via-indigo-500 to-indigo-700 border-indigo-400/50 shadow-indigo-500/25',
      'from-sky-600 via-blue-600 to-cyan-700 border-sky-400/50 shadow-sky-500/25',
      'from-emerald-600 via-teal-600 to-emerald-700 border-emerald-400/50 shadow-emerald-500/25',
      'from-violet-600 via-purple-600 to-fuchsia-700 border-purple-400/50 shadow-purple-500/25',
      'from-amber-600 via-orange-600 to-rose-600 border-amber-400/50 shadow-amber-500/25',
      'from-rose-600 via-pink-600 to-rose-700 border-rose-400/50 shadow-rose-500/25',
      'from-cyan-600 via-teal-500 to-blue-700 border-cyan-400/50 shadow-cyan-500/25',
      'from-blue-600 via-indigo-600 to-slate-800 border-blue-400/50 shadow-blue-500/25',
    ];
    return gradients[Math.abs(hash) % gradients.length];
  };

  const avatarKey = student.id || student.name;
  const avatarGradientClass = getAvatarGradient(avatarKey);
  const initials = getInitials(student.name);

  // 2. Format last called time
  const formatLastCalled = (dateStr?: string) => {
    if (!dateStr) return 'Chưa được gọi';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Vừa mới gọi';
      if (diffMins < 60) return `${diffMins} phút trước`;
      if (diffHours < 24) return `${diffHours} giờ trước`;
      if (diffDays === 1) return 'Hôm qua';
      if (diffDays < 7) return `${diffDays} ngày trước`;

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const mins = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${mins} ${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // 3. Score helper
  const renderScoreValue = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(val)) {
      return <span className="text-slate-500 font-normal select-none">—</span>;
    }
    const colorClass =
      val >= 8
        ? 'text-emerald-400'
        : val >= 6.5
        ? 'text-sky-300'
        : val >= 5
        ? 'text-amber-300'
        : 'text-rose-400';
    return <span className={`font-black ${colorClass}`}>{val}</span>;
  };

  // 4. Discipline records calculation
  const studentViolations = disciplineRecords
    .filter((r) => r.studentId === student.id)
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || `${a.date}T${a.time}`).getTime();
      const timeB = new Date(b.createdAt || `${b.date}T${b.time}`).getTime();
      return timeB - timeA;
    });

  const totalViolations = studentViolations.length;
  const recentViolations = studentViolations.slice(0, 5);

  const getViolationTypeName = (record: DisciplineRecord) => {
    if (record.violationName) return record.violationName;
    const foundType = disciplineViolationTypes.find((t) => t.id === record.violationTypeId);
    return foundType ? foundType.name : record.violationTypeId || 'Vi phạm nề nếp';
  };

  const getViolationTypeIcon = (record: DisciplineRecord) => {
    if (record.violationIcon) return record.violationIcon;
    const foundType = disciplineViolationTypes.find((t) => t.id === record.violationTypeId);
    return foundType?.icon || '⚠️';
  };

  const formatViolationDate = (record: DisciplineRecord) => {
    const dateStr = record.date || '';
    const timeStr = record.time || '';
    if (!dateStr) return timeStr || '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const formatted = `${parts[2]}/${parts[1]}`;
      return timeStr ? `${timeStr} - ${formatted}` : formatted;
    }
    return timeStr ? `${timeStr} ${dateStr}` : dateStr;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all hover:scale-105 active:scale-95 border border-slate-700/60"
          aria-label="Đóng thẻ học sinh"
          title="Đóng thẻ (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {showParentReport ? (
          /* ======================================================== */
          /* CHẾ ĐỘ XEM: 📄 BÁO CÁO PHỤ HUYNH (CHỈ ĐỌC)                */
          /* ======================================================== */
          <div className="overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
            {/* Header / Back Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <button
                onClick={() => setShowParentReport(false)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại thẻ</span>
              </button>
              <div className="flex items-center gap-1 text-xs font-bold text-indigo-400 bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-800/50">
                <FileText className="w-3.5 h-3.5" />
                <span>BÁO CÁO PHỤ HUYNH</span>
              </div>
            </div>

            {/* School / Class & Student Header */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-sky-500" />
              <div className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase mb-1">
                PHIẾU THEO DÕI HỌC TẬP & RÈN LUYỆN
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">{student.name}</h2>
              <div className="flex items-center justify-center gap-2 mt-1 text-xs text-slate-300 flex-wrap">
                {className && <span className="font-semibold text-indigo-300">Lớp: {className}</span>}
                {student.studentCode && <span className="text-slate-400 font-mono">| Mã HS: {student.studentCode}</span>}
                {student.gender && (
                  <span className="text-slate-400">
                    | Giới tính: {student.gender === 'nam' ? 'Nam' : student.gender === 'nu' ? 'Nữ' : 'Khác'}
                  </span>
                )}
                {student.parentPhone && (
                  <span className="text-emerald-400 font-mono flex items-center gap-1">
                    | SĐT PH: {student.parentPhone}
                  </span>
                )}
              </div>
            </div>

            {/* General Highlights: Sao & Lần gọi & Nề nếp */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-amber-500/30 text-center">
                <div className="text-[10px] text-slate-400 font-medium">Tổng sao</div>
                <div className="text-lg font-black text-amber-300 mt-0.5">{student.stars || 0} ⭐</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-indigo-500/30 text-center">
                <div className="text-[10px] text-slate-400 font-medium">Lần được gọi</div>
                <div className="text-lg font-black text-indigo-300 mt-0.5">{student.callCount || 0} lần</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                <div className="text-[10px] text-slate-400 font-medium">Vi phạm nề nếp</div>
                <div
                  className={`text-lg font-black mt-0.5 ${
                    totalViolations === 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {totalViolations}
                </div>
              </div>
            </div>

            {/* Current Scores */}
            <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  Điểm số hiện tại
                </span>
                <span className="text-[10px] font-normal text-slate-400">Thang điểm 10</span>
              </div>
              <div className="grid grid-cols-6 gap-1.5 text-center">
                <div className="bg-slate-900/80 rounded-lg p-1.5 border border-slate-700/60">
                  <div className="text-[9px] font-bold text-slate-400">TX1</div>
                  <div className="text-sm">{renderScoreValue(student.scores?.tx1)}</div>
                </div>
                <div className="bg-slate-900/80 rounded-lg p-1.5 border border-slate-700/60">
                  <div className="text-[9px] font-bold text-slate-400">TX2</div>
                  <div className="text-sm">{renderScoreValue(student.scores?.tx2)}</div>
                </div>
                <div className="bg-slate-900/80 rounded-lg p-1.5 border border-slate-700/60">
                  <div className="text-[9px] font-bold text-slate-400">TX3</div>
                  <div className="text-sm">{renderScoreValue(student.scores?.tx3)}</div>
                </div>
                <div className="bg-slate-900/80 rounded-lg p-1.5 border border-slate-700/60">
                  <div className="text-[9px] font-bold text-slate-400">TX4</div>
                  <div className="text-sm">{renderScoreValue(student.scores?.tx4)}</div>
                </div>
                <div className="bg-indigo-950/40 rounded-lg p-1.5 border border-indigo-700/50">
                  <div className="text-[9px] font-bold text-indigo-300">GK</div>
                  <div className="text-sm">{renderScoreValue(student.scores?.gk)}</div>
                </div>
                <div className="bg-indigo-950/40 rounded-lg p-1.5 border border-indigo-700/50">
                  <div className="text-[9px] font-bold text-indigo-300">CK</div>
                  <div className="text-sm">{renderScoreValue(student.scores?.ck)}</div>
                </div>
              </div>
            </div>

            {/* Discipline Summary */}
            <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  Tình hình nề nếp
                </span>
                {totalViolations === 0 && (
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60 font-medium">
                    Tốt
                  </span>
                )}
              </div>

              {recentViolations.length === 0 ? (
                <div className="text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Học sinh chăm ngoan, không có vi phạm nào được ghi nhận.</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {recentViolations.map((record) => (
                    <div
                      key={record.id}
                      className="p-2 rounded-xl bg-slate-900/70 border border-slate-700/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span>{getViolationTypeIcon(record)}</span>
                        <div className="truncate">
                          <span className="font-semibold text-rose-300">{getViolationTypeName(record)}</span>
                          {record.note && <span className="text-slate-400 ml-1.5">({record.note})</span>}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 bg-slate-800 px-1.5 py-0.5 rounded">
                        {formatViolationDate(record)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Teacher Notes / Comments */}
            <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-3.5 space-y-1.5">
              <div className="text-xs font-bold text-slate-300">Nhận xét của giáo viên</div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 min-h-[44px]">
                {student.notes && student.notes.trim() !== '' ? (
                  student.notes
                ) : (
                  <span className="text-slate-500 italic">Chưa có nhận xét hoặc ghi chú riêng.</span>
                )}
              </div>
            </div>

            {/* Note info */}
            <div className="text-[11px] text-center text-slate-500 italic">
              Báo cáo hiển thị tức thời phục vụ giáo viên trao đổi và chia sẻ cùng phụ huynh học sinh.
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* CHẾ ĐỘ XEM CHÍNH: THẺ HỌC SINH                           */
          /* ======================================================== */
          <div className="overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
            {/* Header Section */}
            <div className="flex items-center gap-4 pr-8">
              {/* Avatar Circle with deterministic 2-letter initials & consistent color */}
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${avatarGradientClass} border-2 flex items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-lg shrink-0 select-none tracking-tight`}
              >
                {initials}
              </div>

              {/* Name, Class, Code, Gender */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight break-words">
                    {student.name}
                  </h2>
                  {student.gender === 'nu' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 font-medium">
                      Nữ
                    </span>
                  )}
                  {student.gender === 'nam' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                      Nam
                    </span>
                  )}
                  {student.gender === 'khac' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 border border-slate-600 font-medium">
                      Khác
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-slate-300 flex-wrap">
                  {className && (
                    <span className="font-semibold text-indigo-400 bg-indigo-950/60 px-2.5 py-0.5 rounded-lg border border-indigo-800/50">
                      Lớp: {className}
                    </span>
                  )}
                  {student.studentCode && (
                    <span className="text-slate-400 font-mono bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700 text-xs">
                      Mã: {student.studentCode}
                    </span>
                  )}
                  {student.parentPhone && (
                    <span className="text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/60 text-xs flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      {student.parentPhone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Total Stars */}
              <div className="bg-slate-800/70 border border-amber-500/30 rounded-2xl p-3 flex flex-col justify-between shadow-sm">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>Tổng sao</span>
                </div>
                <div className="mt-1 text-xl sm:text-2xl font-black text-amber-300">
                  {student.stars || 0} ⭐
                </div>
              </div>

              {/* Call Count */}
              <div className="bg-slate-800/70 border border-indigo-500/30 rounded-2xl p-3 flex flex-col justify-between shadow-sm">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Lần được gọi</span>
                </div>
                <div className="mt-1 text-xl sm:text-2xl font-black text-indigo-300">
                  {student.callCount || 0} <span className="text-xs font-normal text-slate-400">lần</span>
                </div>
              </div>

              {/* Last Called */}
              <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-3 flex flex-col justify-between shadow-sm">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Gọi gần nhất</span>
                </div>
                <div
                  className="mt-1 text-xs sm:text-sm font-bold text-slate-200 truncate"
                  title={student.lastCalledAt || 'Chưa được gọi'}
                >
                  {formatLastCalled(student.lastCalledAt)}
                </div>
              </div>

              {/* Status (Present / Absent) */}
              <div className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-3 flex flex-col justify-between shadow-sm">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  {student.isAbsent ? (
                    <UserX className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>Trạng thái</span>
                </div>
                <div className="mt-1 text-xs sm:text-sm font-black">
                  {student.isAbsent ? (
                    <span className="text-rose-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      Vắng mặt
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Có mặt
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Scores Section */}
            <div className="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  📊 Bảng điểm học tập
                </span>
                <span className="text-[11px] text-slate-400">TX1, TX2, TX3, TX4 | Giữa kỳ | Cuối kỳ</span>
              </div>

              <div className="grid grid-cols-6 gap-1.5 text-center">
                {/* TX1 */}
                <div className="bg-slate-900/80 rounded-xl p-2 border border-slate-700/60">
                  <div className="text-[10px] font-bold text-slate-400 mb-0.5">TX1</div>
                  <div className="text-base sm:text-lg">{renderScoreValue(student.scores?.tx1)}</div>
                </div>
                {/* TX2 */}
                <div className="bg-slate-900/80 rounded-xl p-2 border border-slate-700/60">
                  <div className="text-[10px] font-bold text-slate-400 mb-0.5">TX2</div>
                  <div className="text-base sm:text-lg">{renderScoreValue(student.scores?.tx2)}</div>
                </div>
                {/* TX3 */}
                <div className="bg-slate-900/80 rounded-xl p-2 border border-slate-700/60">
                  <div className="text-[10px] font-bold text-slate-400 mb-0.5">TX3</div>
                  <div className="text-base sm:text-lg">{renderScoreValue(student.scores?.tx3)}</div>
                </div>
                {/* TX4 */}
                <div className="bg-slate-900/80 rounded-xl p-2 border border-slate-700/60">
                  <div className="text-[10px] font-bold text-slate-400 mb-0.5">TX4</div>
                  <div className="text-base sm:text-lg">{renderScoreValue(student.scores?.tx4)}</div>
                </div>
                {/* GK */}
                <div className="bg-indigo-950/40 rounded-xl p-2 border border-indigo-700/50">
                  <div className="text-[10px] font-bold text-indigo-300 mb-0.5">GK</div>
                  <div className="text-base sm:text-lg">{renderScoreValue(student.scores?.gk)}</div>
                </div>
                {/* CK */}
                <div className="bg-indigo-950/40 rounded-xl p-2 border border-indigo-700/50">
                  <div className="text-[10px] font-bold text-indigo-300 mb-0.5">CK</div>
                  <div className="text-base sm:text-lg">{renderScoreValue(student.scores?.ck)}</div>
                </div>
              </div>

              {/* Teacher Notes if any */}
              {student.notes && student.notes.trim() !== '' && (
                <div className="pt-2 border-t border-slate-700/50 text-xs text-slate-300">
                  <span className="font-semibold text-slate-400 mr-1.5">Ghi chú:</span>
                  <span>{student.notes}</span>
                </div>
              )}
            </div>

            {/* Discipline & Behavior Section */}
            <div className="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    📋 Theo dõi nề nếp
                  </span>
                  {totalViolations === 0 ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Nề nếp tốt
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      {totalViolations} vi phạm
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">
                  {totalViolations > 5 ? `Hiển thị 5 / ${totalViolations} gần nhất` : ''}
                </span>
              </div>

              {/* List or Empty State */}
              {recentViolations.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center flex flex-col items-center justify-center gap-1.5 text-slate-400">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <span className="text-sm font-medium text-slate-300">Không có vi phạm gần đây</span>
                  <span className="text-xs text-slate-500">Học sinh duy trì nề nếp học tập rất tốt!</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentViolations.map((record) => (
                    <div
                      key={record.id}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="text-base select-none mt-0.5">
                          {getViolationTypeIcon(record)}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-rose-300 truncate">
                            {getViolationTypeName(record)}
                          </div>
                          {record.note && (
                            <div className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">
                              {record.note}
                            </div>
                          )}
                          {record.lesson && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Tiết: {record.lesson}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700/60">
                          {formatViolationDate(record)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          {!showParentReport ? (
            <button
              onClick={() => setShowParentReport(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white font-bold transition-all border border-indigo-500/40 flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>📄 Báo cáo phụ huynh</span>
            </button>
          ) : (
            <button
              onClick={() => setShowParentReport(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all border border-slate-700 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại thẻ</span>
            </button>
          )}

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

