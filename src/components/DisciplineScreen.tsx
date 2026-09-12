import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Undo2,
  FileSpreadsheet,
  Settings,
  Search,
  ChevronDown,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  Clock,
  Eye,
  ArrowUpDown,
  Filter,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { ClassRoom, DisciplineRecord, DisciplineViolationType, Student } from '../types';
import {
  createDisciplineRecord,
  deleteDisciplineRecord,
  addCustomViolationType,
  updateViolationType,
  filterRecordsByPeriod,
  exportDisciplineReportToExcel,
} from '../services/disciplineService';
import { soundEngine } from '../utils/audio';

interface DisciplineScreenProps {
  classes: ClassRoom[];
  activeClassId: string;
  onSelectClass: (classId: string) => void;
  records: DisciplineRecord[];
  onUpdateRecords: (records: DisciplineRecord[]) => void;
  violationTypes: DisciplineViolationType[];
  onUpdateViolationTypes: (types: DisciplineViolationType[]) => void;
}

type PeriodFilter = 'today' | 'week' | 'month' | 'semester' | 'all';
type SortOption = 'violations-desc' | 'violations-asc' | 'stt' | 'name-asc';

export const DisciplineScreen: React.FC<DisciplineScreenProps> = ({
  classes,
  activeClassId,
  onSelectClass,
  records,
  onUpdateRecords,
  violationTypes,
  onUpdateViolationTypes,
}) => {
  const currentClass = classes.find((c) => c.id === activeClassId) || classes[0];

  // Local state
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('violations-desc');
  const [lastActionMessage, setLastActionMessage] = useState<{ text: string; recordId: string } | null>(null);

  // Modals state
  const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeIcon, setNewTypeIcon] = useState('⚠️');
  const [isManageTypesOpen, setIsManageTypesOpen] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingTypeName, setEditingTypeName] = useState('');

  // Student detail modal
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);

  // Note dialog before adding (optional quick note)
  const [activeNoteTarget, setActiveNoteTarget] = useState<{
    student: Student;
    violationType: DisciplineViolationType;
  } | null>(null);
  const [customNote, setCustomNote] = useState('');
  const [customLesson, setCustomLesson] = useState('');

  // Class selection dropdown
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);

  // Filter records for current class
  const classRecords = useMemo(() => {
    if (!currentClass) return [];
    return records.filter((r) => r.classId === currentClass.id);
  }, [records, currentClass]);

  // Filter records by time period
  const filteredRecords = useMemo(() => {
    return filterRecordsByPeriod(classRecords, period);
  }, [classRecords, period]);

  // Active violation types for recording
  const activeViolationTypes = useMemo(() => {
    return violationTypes.filter((t) => t.isActive);
  }, [violationTypes]);

  // Summary counts for current filtered period
  const violationCountsSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    violationTypes.forEach((t) => {
      counts[t.id] = 0;
    });

    let total = 0;
    filteredRecords.forEach((r) => {
      counts[r.violationTypeId] = (counts[r.violationTypeId] || 0) + 1;
      total += 1;
    });

    return { counts, total };
  }, [filteredRecords, violationTypes]);

  // Student list with aggregated counts
  const studentRows = useMemo(() => {
    if (!currentClass || !currentClass.students) return [];

    const rows = currentClass.students.map((student, idx) => {
      const studentRecords = filteredRecords.filter((r) => r.studentId === student.id);
      const totalViolations = studentRecords.length;

      const typeBreakdown: Record<string, number> = {};
      activeViolationTypes.forEach((vt) => {
        typeBreakdown[vt.id] = studentRecords.filter((r) => r.violationTypeId === vt.id).length;
      });

      return {
        student,
        stt: idx + 1,
        totalViolations,
        typeBreakdown,
        records: studentRecords,
      };
    });

    // Filter by search
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? rows.filter(
          (r) =>
            r.student.name.toLowerCase().includes(query) ||
            (r.student.studentCode && r.student.studentCode.toLowerCase().includes(query))
        )
      : rows;

    // Sort
    return filtered.sort((a, b) => {
      if (sortBy === 'violations-desc') {
        if (b.totalViolations !== a.totalViolations) {
          return b.totalViolations - a.totalViolations;
        }
        return a.stt - b.stt;
      }
      if (sortBy === 'violations-asc') {
        if (a.totalViolations !== b.totalViolations) {
          return a.totalViolations - b.totalViolations;
        }
        return a.stt - b.stt;
      }
      if (sortBy === 'name-asc') {
        return a.student.name.localeCompare(b.student.name, 'vi');
      }
      return a.stt - b.stt;
    });
  }, [currentClass, filteredRecords, activeViolationTypes, searchQuery, sortBy]);

  // Handler: Record manual violation directly
  const handleRecordViolation = (
    student: Student,
    violationType: DisciplineViolationType,
    lessonStr = '',
    noteStr = ''
  ) => {
    if (!currentClass) return;

    const newRec = createDisciplineRecord({
      studentId: student.id,
      classId: currentClass.id,
      violationTypeId: violationType.id,
      source: 'manual',
      lesson: lessonStr,
      note: noteStr,
    });

    const updated = [newRec, ...records];
    onUpdateRecords(updated);

    soundEngine.playTick(1.2);
    setLastActionMessage({
      text: `Đã ghi nhận: ${student.name} (+1 ${violationType.icon} ${violationType.name})`,
      recordId: newRec.id,
    });

    // Auto clear alert message after 6 seconds
    setTimeout(() => {
      setLastActionMessage((curr) => (curr?.recordId === newRec.id ? null : curr));
    }, 6000);
  };

  // Handler: Undo last record
  const handleUndo = () => {
    if (!lastActionMessage?.recordId) return;

    const updated = deleteDisciplineRecord(lastActionMessage.recordId);
    onUpdateRecords(updated);
    soundEngine.playTick(0.8);
    setLastActionMessage(null);
  };

  // Handler: Delete single record from student detail modal
  const handleDeleteRecord = (recordId: string) => {
    const updated = deleteDisciplineRecord(recordId);
    onUpdateRecords(updated);
    soundEngine.playTick(0.8);
  };

  // Handler: Add custom violation type
  const handleAddCustomType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;

    const newType = addCustomViolationType(newTypeName, newTypeIcon);
    onUpdateViolationTypes([...violationTypes, newType]);
    setNewTypeName('');
    setNewTypeIcon('⚠️');
    setIsAddTypeModalOpen(false);
    soundEngine.playVictoryFanfare();
  };

  // Handler: Toggle active status for violation type
  const handleToggleTypeActive = (id: string, currentActive: boolean) => {
    const updated = updateViolationType(id, { isActive: !currentActive });
    onUpdateViolationTypes(updated);
    soundEngine.playTick(1.0);
  };

  // Handler: Rename custom violation type
  const handleSaveRenameType = (id: string) => {
    if (!editingTypeName.trim()) return;
    const updated = updateViolationType(id, { name: editingTypeName.trim() });
    onUpdateViolationTypes(updated);
    setEditingTypeId(null);
    setEditingTypeName('');
    soundEngine.playTick(1.1);
  };

  // Handler: Export Excel
  const handleExportExcel = (singleStudent?: Student) => {
    if (!currentClass) return;
    const periodNames: Record<PeriodFilter, string> = {
      today: 'Hôm nay',
      week: 'Tuần này',
      month: 'Tháng này',
      semester: 'Học kỳ',
      all: 'Cả năm',
    };

    exportDisciplineReportToExcel({
      className: currentClass.name,
      students: currentClass.students,
      records: classRecords,
      violationTypes,
      singleStudent,
      periodLabel: periodNames[period],
    });
    soundEngine.playVictoryFanfare();
  };

  const periodLabels: { id: PeriodFilter; label: string }[] = [
    { id: 'today', label: '📅 Hôm nay' },
    { id: 'week', label: '📆 Tuần này' },
    { id: 'month', label: '🗓️ Tháng này' },
    { id: 'semester', label: '🏫 Học kỳ' },
    { id: 'all', label: '🌐 Cả năm' },
  ];

  if (!currentClass) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-400">
        <AlertCircle className="w-12 h-12 mx-auto text-amber-400 mb-3" />
        <p className="text-lg font-bold text-slate-200">Chưa có dữ liệu lớp học</p>
        <p className="text-sm mt-1">Vui lòng tạo hoặc chọn một lớp học trong mục Quản Lý Lớp.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* 1. Header & Quick Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>THEO DÕI NỀ NẾP MÔN HỌC</span>
              </h1>
              <p className="text-xs text-slate-400">
                Ghi nhận tình hình học tập và nề nếp trực tiếp từ Sổ điểm bộ môn • Tích hợp đồng bộ với Quay tên
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Class switcher dropdown */}
          <div className="relative">
            <button
              onClick={() => setClassDropdownOpen(!classDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs sm:text-sm font-bold text-slate-200 transition-colors shadow-sm"
            >
              <span>Lớp:</span>
              <span className="text-amber-300 font-black">{currentClass.name}</span>
              <span className="text-slate-400 text-xs">({currentClass.students.length} HS)</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${classDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {classDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setClassDropdownOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-60 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1.5 divide-y divide-slate-700/50">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase text-slate-400">Chọn lớp theo dõi</div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    {classes.map((cls) => (
                      <button
                        key={cls.id}
                        onClick={() => {
                          onSelectClass(cls.id);
                          setClassDropdownOpen(false);
                          soundEngine.playTick(1.1);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs sm:text-sm flex items-center justify-between hover:bg-slate-700/70 transition-colors ${
                          cls.id === currentClass.id ? 'bg-indigo-600/30 text-indigo-300 font-bold' : 'text-slate-200'
                        }`}
                      >
                        <span>Lớp {cls.name}</span>
                        <span className="text-xs text-slate-400">{cls.students.length} HS</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Add custom type button */}
          <button
            onClick={() => setIsAddTypeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-semibold transition-all hover:scale-102"
            title="Tự tạo thêm loại lỗi mới"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>＋ Thêm lỗi</span>
          </button>

          {/* Manage types */}
          <button
            onClick={() => setIsManageTypesOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-semibold transition-all"
            title="Quản lý danh sách loại lỗi"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Quản lý lỗi</span>
          </button>

          {/* Export Report Excel */}
          <button
            onClick={() => handleExportExcel()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/30 transition-all hover:scale-102"
            title="Xuất báo cáo nề nếp riêng biệt (File Excel độc lập với Sổ điểm)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Báo Cáo</span>
          </button>
        </div>
      </div>

      {/* 2. Undo Toast Bar (if there is a recent action) */}
      {lastActionMessage && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 shadow-lg text-xs sm:text-sm text-indigo-200 animate-slideDown">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{lastActionMessage.text}</span>
          </div>
          <button
            onClick={handleUndo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-sm"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Hoàn tác</span>
          </button>
        </div>
      )}

      {/* 3. Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total card */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tổng vi phạm</span>
            <span className="text-amber-400 font-mono">⚠️</span>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-300 font-mono">
            {violationCountsSummary.total}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Lớp {currentClass.name}</div>
        </div>

        {/* Default 4 errors cards */}
        {violationTypes.slice(0, 4).map((vt) => (
          <div
            key={vt.id}
            className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="truncate pr-1">{vt.name}</span>
              <span>{vt.icon}</span>
            </div>
            <div className="mt-2 text-2xl font-black text-white font-mono">
              {violationCountsSummary.counts[vt.id] || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Lượt ghi nhận</div>
          </div>
        ))}
      </div>

      {/* 4. Controls: Time Period Filter + Search + Sort */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
        {/* Period Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {periodLabels.map((pl) => (
            <button
              key={pl.id}
              onClick={() => {
                setPeriod(pl.id);
                soundEngine.playTick(1.0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                period === pl.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {pl.label}
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2">
          {/* Search box */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm học sinh theo tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 font-medium focus:outline-none focus:border-amber-500"
            >
              <option value="violations-desc">Vi phạm nhiều nhất ↓</option>
              <option value="violations-asc">Vi phạm ít nhất ↑</option>
              <option value="stt">Theo STT ban đầu</option>
              <option value="name-asc">Tên học sinh A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Main Student Matrix / Recording Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <th className="py-3 px-3 w-12 text-center font-bold">STT</th>
                <th className="py-3 px-4 w-48 font-bold">Họ và tên học sinh</th>
                <th className="py-3 px-3 text-center font-bold w-24">Tổng lỗi</th>
                <th className="py-3 px-4 font-bold">
                  <div className="flex items-center justify-between">
                    <span>Ghi nhận vi phạm nhanh (+1 lần)</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      Bấm vào loại lỗi để ghi nhận ngay
                    </span>
                  </div>
                </th>
                <th className="py-3 px-3 w-24 text-center font-bold">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {studentRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Không tìm thấy học sinh nào phù hợp.
                  </td>
                </tr>
              ) : (
                studentRows.map(({ student, stt, totalViolations, typeBreakdown }) => {
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* STT */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                        {stt}
                      </td>

                      {/* Student Name */}
                      <td className="py-2.5 px-4 font-semibold text-slate-200">
                        <div className="flex items-center gap-2">
                          <span
                            onClick={() => setSelectedStudentForDetail(student)}
                            className="cursor-pointer hover:text-amber-300 hover:underline transition-colors"
                          >
                            {student.name}
                          </span>
                          {student.studentCode && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              ({student.studentCode})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Violations Badge */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full font-black text-xs font-mono ${
                            totalViolations === 0
                              ? 'bg-slate-800 text-slate-400'
                              : totalViolations <= 2
                              ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-500/50 animate-pulse'
                          }`}
                        >
                          {totalViolations}
                        </span>
                      </td>

                      {/* Quick Record Action Buttons */}
                      <td className="py-2.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {activeViolationTypes.map((vt) => {
                            const count = typeBreakdown[vt.id] || 0;
                            return (
                              <button
                                key={vt.id}
                                onClick={() => handleRecordViolation(student, vt)}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                                  count > 0
                                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700 shadow-sm'
                                    : 'bg-slate-950 hover:bg-slate-850 text-slate-400 border-slate-800 hover:text-slate-200'
                                }`}
                                title={`Ghi nhận: ${student.name} vi phạm "${vt.name}" (+1)`}
                              >
                                <span>{vt.icon}</span>
                                <span className="hidden sm:inline">{vt.name}</span>
                                {count > 0 && (
                                  <span className="ml-1 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold font-mono">
                                    {count}
                                  </span>
                                )}
                              </button>
                            );
                          })}

                          {/* Optional note prompt button */}
                          <button
                            onClick={() => {
                              setActiveNoteTarget({
                                student,
                                violationType: activeViolationTypes[0] || violationTypes[0],
                              });
                              setCustomNote('');
                              setCustomLesson('');
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-500 hover:text-slate-300 border border-dashed border-slate-800 text-[11px]"
                            title="Ghi nhận kèm ghi chú chi tiết hoặc số tiết"
                          >
                            + Ghi chú...
                          </button>
                        </div>
                      </td>

                      {/* Detail View Button */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => setSelectedStudentForDetail(student)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors"
                          title={`Xem chi tiết lịch sử vi phạm của ${student.name}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Modal: Add Custom Violation Type */}
      {isAddTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Thêm loại lỗi nề nếp mới</span>
              </h3>
              <button
                onClick={() => setIsAddTypeModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomType} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tên loại lỗi vi phạm:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Không mang vở, Làm việc riêng, Dùng điện thoại..."
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Biểu tượng / Emoji:
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {['📓', '📝', '💤', '📱', '⏳', '🏃', '🤫', '🚫', '⚠️', '🎒'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewTypeIcon(emoji)}
                      className={`w-9 h-9 text-lg rounded-xl flex items-center justify-center border transition-all ${
                        newTypeIcon === emoji
                          ? 'bg-amber-500/30 border-amber-400 scale-110'
                          : 'bg-slate-950 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  maxLength={4}
                  value={newTypeIcon}
                  onChange={(e) => setNewTypeIcon(e.target.value)}
                  className="w-20 px-3 py-1.5 text-center text-sm rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddTypeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20"
                >
                  Thêm vào danh sách
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal: Manage Violation Types */}
      {isManageTypesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Quản lý danh sách loại lỗi</span>
              </h3>
              <button
                onClick={() => setIsManageTypesOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Có thể đổi tên hoặc tạm ngừng sử dụng loại lỗi. Việc ngừng sử dụng sẽ không xóa lịch sử các lần vi phạm đã từng ghi nhận trước đây.
            </p>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 pr-1 space-y-2">
              {violationTypes.map((vt) => {
                const isEditing = editingTypeId === vt.id;
                return (
                  <div
                    key={vt.id}
                    className="pt-2 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-base">{vt.icon}</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="text"
                            value={editingTypeName}
                            onChange={(e) => setEditingTypeName(e.target.value)}
                            className="px-2.5 py-1 bg-slate-950 border border-indigo-500 rounded-lg text-xs text-white flex-1"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveRenameType(vt.id)}
                            className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-bold"
                          >
                            Lưu
                          </button>
                          <button
                            onClick={() => setEditingTypeId(null)}
                            className="px-2 py-1 bg-slate-800 text-slate-400 rounded-lg"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <div>
                          <span className={`font-semibold ${vt.isActive ? 'text-white' : 'text-slate-500 line-through'}`}>
                            {vt.name}
                          </span>
                          {vt.isDefault && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                              Mặc định
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-2">
                        {/* Edit name (allowed for custom types) */}
                        {!vt.isDefault && (
                          <button
                            onClick={() => {
                              setEditingTypeId(vt.id);
                              setEditingTypeName(vt.name);
                            }}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="Đổi tên lỗi"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}

                        {/* Toggle active switch */}
                        <button
                          onClick={() => handleToggleTypeActive(vt.id, vt.isActive)}
                          className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                            vt.isActive
                              ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                              : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                          }`}
                        >
                          {vt.isActive ? 'Đang dùng' : 'Tạm ẩn'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsManageTypesOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal: Student Detail View & History Log */}
      {selectedStudentForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>Hồ Sơ Nề Nếp: {selectedStudentForDetail.name}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Lớp: {currentClass.name} • {selectedStudentForDetail.studentCode ? `Mã HS: ${selectedStudentForDetail.studentCode}` : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentForDetail(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student breakdown stats */}
            {(() => {
              const stdRecords = classRecords.filter((r) => r.studentId === selectedStudentForDetail.id);
              const total = stdRecords.length;

              return (
                <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Tổng số lần vi phạm:</div>
                      <div className="text-2xl font-black text-amber-300 font-mono mt-0.5">
                        {total} lần
                      </div>
                    </div>
                    <button
                      onClick={() => handleExportExcel(selectedStudentForDetail)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                      title="Xuất phiếu báo cáo riêng cho học sinh này"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Xuất phiếu HS (.xlsx)</span>
                    </button>
                  </div>

                  {/* Violation type breakdown pills */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Phân bổ theo loại vi phạm:
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {violationTypes.map((vt) => {
                        const count = stdRecords.filter((r) => r.violationTypeId === vt.id).length;
                        return (
                          <div
                            key={vt.id}
                            className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                          >
                            <span className="text-slate-300 truncate">
                              {vt.icon} {vt.name}
                            </span>
                            <span className="font-mono font-bold text-amber-300 ml-1">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Detailed History Log Table */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Nhật ký từng lần vi phạm ({stdRecords.length}):
                    </h4>
                    {stdRecords.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                        🎉 Chưa có ghi nhận vi phạm nào cho học sinh này.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl bg-slate-950/40 overflow-hidden">
                        {stdRecords.map((rec) => (
                          <div
                            key={rec.id}
                            className="p-3 flex items-center justify-between gap-3 hover:bg-slate-900/60 text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">
                                  {rec.violationIcon} {rec.violationName}
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400 font-medium">
                                  {rec.source === 'random_picker' ? 'Quay tên' : 'Thủ công'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{rec.date}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{rec.time}</span>
                                </span>
                                {rec.lesson && <span>• Tiết {rec.lesson}</span>}
                              </div>
                              {rec.note && (
                                <p className="text-[11px] text-indigo-300 italic pt-0.5">
                                  "{rec.note}"
                                </p>
                              )}
                            </div>

                            <button
                              onClick={() => handleDeleteRecord(rec.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/80 text-slate-400 hover:text-rose-300 transition-colors"
                              title="Xóa bản ghi này (nếu ghi nhầm)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedStudentForDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal: Custom Note Dialog */}
      {activeNoteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white">
                Ghi nhận vi phạm: {activeNoteTarget.student.name}
              </h3>
              <button
                onClick={() => setActiveNoteTarget(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Loại lỗi:</label>
                <select
                  value={activeNoteTarget.violationType.id}
                  onChange={(e) => {
                    const found = violationTypes.find((t) => t.id === e.target.value);
                    if (found) {
                      setActiveNoteTarget({ ...activeNoteTarget, violationType: found });
                    }
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {activeViolationTypes.map((vt) => (
                    <option key={vt.id} value={vt.id}>
                      {vt.icon} {vt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Tiết học (nếu có):</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tiết 2, Tiết 4..."
                  value={customLesson}
                  onChange={(e) => setCustomLesson(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Ghi chú cụ thể:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Không ghi chép bài, gây ồn..."
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setActiveNoteTarget(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  handleRecordViolation(
                    activeNoteTarget.student,
                    activeNoteTarget.violationType,
                    customLesson,
                    customNote
                  );
                  setActiveNoteTarget(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400"
              >
                Lưu ghi nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
