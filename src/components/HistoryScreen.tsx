import React, { useState } from 'react';
import {
  History as HistoryIcon,
  Trash2,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Scale,
  Dices,
  FileSpreadsheet,
} from 'lucide-react';
import { ClassRoom, HistoryRecord } from '../types';
import * as XLSX from 'xlsx';
import { soundEngine } from '../utils/audio';

interface HistoryScreenProps {
  history: HistoryRecord[];
  classes: ClassRoom[];
  onClearHistory: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  history,
  classes,
  onClearHistory,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = history.filter((item) => {
    const matchClass = selectedClassId === 'ALL' || item.classId === selectedClassId;
    const matchSearch =
      item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.note && item.note.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchClass && matchSearch;
  });

  const handleExportHistoryExcel = () => {
    if (history.length === 0) return;
    const data = history.map((h, idx) => ({
      'STT': idx + 1,
      'Thời gian': `${h.formattedDate} ${h.formattedTime}`,
      'Lớp': h.className,
      'Họ và tên học sinh': h.studentName,
      'Số lần lên bảng': h.callCountAfter,
      'Chế độ quay': h.mode === 'FAIR' ? 'Công bằng' : 'Hoàn toàn',
      'Điểm số': h.score || '',
      'Ghi chú': h.note || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'LichSuKiemTra');
    XLSX.writeFile(workbook, `Lich_Su_Kiem_Tra_${new Date().toISOString().slice(0, 10)}.xlsx`);
    soundEngine.playTick(1.2);
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6 animate-fade-in">
      
      {/* Top Header */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-indigo-400">
            <span>📜 NHẬT KÝ KIỂM TRA BÀI CŨ</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
            Lịch Sử Lượt Quay Tên
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportHistoryExcel}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/30 transition-all hover:scale-102"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>
          <button
            onClick={() => {
              if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử quay tên không? (Số lần lên bảng của học sinh vẫn được giữ nguyên)')) {
                onClearHistory();
              }
            }}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 disabled:opacity-40 text-xs sm:text-sm font-semibold transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xóa Lịch Sử</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên học sinh, lớp hoặc ghi chú..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-400 font-medium shrink-0">Lọc theo lớp:</span>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Tất cả các lớp</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                Lớp {cls.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* History Timeline Table */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="text-xs font-semibold text-slate-400">
          Tổng cộng: {filteredHistory.length} lượt kiểm tra
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[11px] font-bold border-b border-slate-700">
              <tr>
                <th className="py-3 px-3 w-12 text-center">STT</th>
                <th className="py-3 px-3">Thời gian</th>
                <th className="py-3 px-3">Lớp</th>
                <th className="py-3 px-3">Học sinh được gọi</th>
                <th className="py-3 px-3 text-center">Lần thứ</th>
                <th className="py-3 px-3 text-center">Chế độ</th>
                <th className="py-3 px-3">Điểm / Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 bg-slate-800/40 font-medium">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Chưa có lịch sử quay tên nào. Hãy chuyển sang tab &quot;Quay Tên&quot; để bắt đầu!
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-700/40 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.formattedDate}</span>
                        <span className="text-slate-500">({item.formattedTime})</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-indigo-300 whitespace-nowrap">
                      Lớp {item.className}
                    </td>
                    <td className="py-2.5 px-3 font-extrabold text-white text-sm">
                      {item.studentName}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40">
                        Lần {item.callCountAfter}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {item.mode === 'FAIR' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                          <Scale className="w-3 h-3" /> Công bằng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                          <Dices className="w-3 h-3" /> Hoàn toàn
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 text-xs">
                      <div className="flex items-center gap-2">
                        {item.score && (
                          <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-200 border border-indigo-700 font-bold">
                            {item.score}
                          </span>
                        )}
                        <span>{item.note || '—'}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
