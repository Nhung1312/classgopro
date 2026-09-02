import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  ArrowUpDown,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileSpreadsheet,
  FileText,
  Users,
} from 'lucide-react';
import { ClassRoom, Student } from '../types';
import { getStudentStats } from '../utils/fairAlgorithm';
import { exportClassToCSV, exportClassToExcel } from '../utils/excelParser';
import { soundEngine } from '../utils/audio';

interface StatsScreenProps {
  activeClass: ClassRoom;
}

type SortField = 'CALL_COUNT_DESC' | 'CALL_COUNT_ASC' | 'STARS_DESC' | 'NAME_ASC' | 'STT_ASC';
type FilterStatus = 'ALL' | 'UNCALLED' | 'CALLED';

export const StatsScreen: React.FC<StatsScreenProps> = ({ activeClass }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortField>('CALL_COUNT_ASC');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');

  const students = activeClass?.students || [];
  const stats = getStudentStats(students);
  const totalStars = students.reduce((acc, s) => acc + (s.stars || 0), 0);

  // Filter & sort students
  const filteredStudents = students.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.studentCode && s.studentCode.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchSearch) return false;

    if (filterStatus === 'UNCALLED') {
      return (s.callCount || 0) === 0;
    }
    if (filterStatus === 'CALLED') {
      return (s.callCount || 0) > 0;
    }
    return true;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortOption === 'STARS_DESC') {
      return (b.stars || 0) - (a.stars || 0);
    }
    if (sortOption === 'CALL_COUNT_DESC') {
      return (b.callCount || 0) - (a.callCount || 0);
    }
    if (sortOption === 'CALL_COUNT_ASC') {
      return (a.callCount || 0) - (b.callCount || 0);
    }
    if (sortOption === 'NAME_ASC') {
      // Sort by Vietnamese first name (last word)
      const nameA = a.name.split(' ').pop() || '';
      const nameB = b.name.split(' ').pop() || '';
      return nameA.localeCompare(nameB, 'vi');
    }
    // STT Default
    return 0;
  });

  const handleExportExcel = () => {
    exportClassToExcel(activeClass.name, activeClass.subject, students);
    soundEngine.playTick(1.2);
  };

  const handleExportCSV = () => {
    exportClassToCSV(activeClass.name, students);
    soundEngine.playTick(1.2);
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6 animate-fade-in">
      
      {/* Top Header */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-indigo-400">
            <span>📊 BÁO CÁO THỐNG KÊ KIỂM TRA BÀI CŨ</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
            Lớp {activeClass?.name} {activeClass?.subject ? `– Môn: ${activeClass.subject}` : ''}
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/30 transition-all hover:scale-102"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel (.xlsx)</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 text-xs sm:text-sm font-semibold transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Students */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-md">
          <div className="text-xs font-semibold text-slate-400">Tổng Sĩ Số</div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1">
            {stats.total} <span className="text-xs font-normal text-slate-400">học sinh</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Lớp {activeClass?.name}</div>
        </div>

        {/* Uncalled highlight card */}
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 shadow-md">
          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>🟢 Chưa Lên Bảng</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-300 mt-1">
            {stats.uncalledCount}{' '}
            <span className="text-xs font-normal text-emerald-400/80">
              ({stats.total > 0 ? Math.round((stats.uncalledCount / stats.total) * 100) : 0}%)
            </span>
          </div>
          <div className="text-[11px] text-emerald-400/70 mt-1">Được thuật toán ưu tiên số 1</div>
        </div>

        {/* Called highlight card */}
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 shadow-md">
          <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>🟡 Đã Lên Bảng</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-300 mt-1">
            {stats.calledCount}{' '}
            <span className="text-xs font-normal text-amber-400/80">
              ({stats.total > 0 ? Math.round((stats.calledCount / stats.total) * 100) : 0}%)
            </span>
          </div>
          <div className="text-[11px] text-amber-400/70 mt-1">Đã có ít nhất 1 lần kiểm tra</div>
        </div>

        {/* Frequency & Avg */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-md">
          <div className="text-xs font-semibold text-slate-400">Số Lần Lên Bảng</div>
          <div className="text-2xl sm:text-3xl font-black text-sky-400 mt-1">
            {stats.minCount} ~ {stats.maxCount}{' '}
            <span className="text-xs font-normal text-slate-400">lần</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Trung bình: {stats.avgCount} lượt / HS</div>
        </div>

        {/* Total Stars Metric Card (Optimization #4) */}
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 shadow-md col-span-2 lg:col-span-1">
          <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <span>⭐ Tổng Sao Thưởng</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1 flex items-baseline gap-1">
            {totalStars} <span className="text-xs font-normal text-amber-300">sao</span>
          </div>
          <div className="text-[11px] text-amber-300/70 mt-1">Khen thưởng & khích lệ</div>
        </div>
      </div>

      {/* Distribution visualizer */}
      {stats.distribution.length > 0 && (
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
          <h2 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
            Phân Bố Tần Suất Lên Bảng
          </h2>
          <div className="space-y-2">
            {stats.distribution.map((d) => (
              <div key={d.count} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">
                    {d.count === 0 ? '🟢 Chưa lên bảng (0 lần)' : `🟡 Đã lên bảng ${d.count} lần`}
                  </span>
                  <span className="text-slate-400">
                    <strong>{d.studentCount}</strong> học sinh ({d.percentage}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      d.count === 0
                        ? 'bg-emerald-500'
                        : d.count === 1
                        ? 'bg-sky-500'
                        : d.count === 2
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.max(4, d.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters, Search & Table */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm học sinh theo tên hoặc mã..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Filter Status buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                filterStatus === 'ALL'
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-300'
              }`}
            >
              Tất cả ({students.length})
            </button>
            <button
              onClick={() => setFilterStatus('UNCALLED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                filterStatus === 'UNCALLED'
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-slate-900 border-slate-700 text-emerald-400'
              }`}
            >
              🟢 Chưa lên ({stats.uncalledCount})
            </button>
            <button
              onClick={() => setFilterStatus('CALLED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                filterStatus === 'CALLED'
                  ? 'bg-amber-600 border-amber-500 text-white'
                  : 'bg-slate-900 border-slate-700 text-amber-400'
              }`}
            >
              🟡 Đã lên ({stats.calledCount})
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Sắp xếp:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortField)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="CALL_COUNT_ASC">Số lần: Ít → Nhiều (Ưu tiên)</option>
              <option value="CALL_COUNT_DESC">Số lần: Nhiều → Ít</option>
              <option value="STARS_DESC">⭐ Sao thưởng: Nhiều → Ít</option>
              <option value="NAME_ASC">Theo tên: A → Z</option>
              <option value="STT_ASC">Theo danh sách ban đầu</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-700/80">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[11px] font-bold border-b border-slate-700">
              <tr>
                <th className="py-3 px-3 w-12 text-center">STT</th>
                <th className="py-3 px-3">Họ và tên học sinh</th>
                <th className="py-3 px-3 hidden sm:table-cell">Mã HS</th>
                <th className="py-3 px-3 text-center">Số lần lên bảng</th>
                <th className="py-3 px-3 text-center">⭐ Sao thưởng</th>
                <th className="py-3 px-3 text-center">Trạng thái</th>
                <th className="py-3 px-3 hidden md:table-cell">Lần gần nhất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 bg-slate-800/40">
              {sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Không có học sinh nào phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                sortedStudents.map((student, idx) => {
                  const count = student.callCount || 0;
                  const isMin = count === stats.minCount;
                  const stars = student.stars || 0;

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-700/40 transition-colors ${
                        count === 0 ? 'bg-emerald-950/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-100">
                        <div className="flex items-center gap-2">
                          <span>{student.name}</span>
                          {isMin && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                              Ưu tiên
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 hidden sm:table-cell text-slate-400 text-xs font-mono">
                        {student.studentCode || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-extrabold text-amber-300 text-sm">
                        {count}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-950/60 text-amber-400 border border-amber-500/30">
                          <span>{stars}</span>
                          <span>⭐</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {count === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Chưa lên bảng
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-700/80 text-slate-300">
                            Đã lên {count} lần
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 hidden md:table-cell text-slate-400 text-xs">
                        {student.lastCalledAt
                          ? new Date(student.lastCalledAt).toLocaleString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Chưa có'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
