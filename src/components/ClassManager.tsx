import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Search,
  Users,
  GraduationCap,
  Sparkles,
  Check,
  X,
  AlertTriangle,
  FilePlus,
  ArrowUpDown,
  FileSpreadsheet,
} from 'lucide-react';
import { ClassRoom, Student } from '../types';
import { soundEngine } from '../utils/audio';

interface ClassManagerProps {
  classes: ClassRoom[];
  activeClassId: string;
  onSelectClass: (id: string) => void;
  onCreateClass: (name: string, subject?: string) => void;
  onDeleteClass: (id: string) => void;
  onUpdateClass: (updatedClass: ClassRoom) => void;
  onNavigateToImport: () => void;
  onClearClassStudents?: (classId: string) => void;
  onClearAllSampleData?: () => void;
}

export const ClassManager: React.FC<ClassManagerProps> = ({
  classes,
  activeClassId,
  onSelectClass,
  onCreateClass,
  onDeleteClass,
  onUpdateClass,
  onNavigateToImport,
  onClearClassStudents,
  onClearAllSampleData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassSubject, setNewClassSubject] = useState('');

  const hasSampleData = classes.some(
    (c) => c.id === 'class-7a1' || c.id === 'class-7a2' || c.id === 'class-8a1'
  );

  // Add single student form state
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentCode, setNewStudentCode] = useState('');
  const [newStudentGender, setNewStudentGender] = useState<'nam' | 'nu' | 'khac'>('nam');

  // Quick batch paste student modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchText, setBatchText] = useState('');

  // Editing student state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editCount, setEditCount] = useState<number>(0);

  // Class rename state
  const [isRenamingClass, setIsRenamingClass] = useState(false);
  const [renameClassName, setRenameClassName] = useState('');
  const [renameSubject, setRenameSubject] = useState('');

  const activeClass = classes.find((c) => c.id === activeClassId) || classes[0];

  // Filter students by search
  const filteredStudents = (activeClass?.students || []).filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.studentCode && s.studentCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle create class
  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    onCreateClass(newClassName.trim(), newClassSubject.trim() || undefined);
    setNewClassName('');
    setNewClassSubject('');
    setShowAddClassModal(false);
    soundEngine.playTick(1.2);
  };

  // Handle add single student
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !activeClass) return;

    const newStudent: Student = {
      id: `std-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: newStudentName.trim(),
      studentCode: newStudentCode.trim() || undefined,
      gender: newStudentGender,
      callCount: 0,
    };

    const updated = {
      ...activeClass,
      students: [...activeClass.students, newStudent],
    };
    onUpdateClass(updated);
    setNewStudentName('');
    setNewStudentCode('');
    setShowAddStudentModal(false);
    soundEngine.playTick(1.2);
  };

  // Handle batch add students
  const handleBatchAdd = () => {
    if (!batchText.trim() || !activeClass) return;
    const lines = batchText.split('\n').map((l) => l.trim()).filter(Boolean);
    const newStudents: Student[] = lines.map((line, idx) => {
      // remove numbering e.g. "1. Nguyen Van A"
      const clean = line.replace(/^\d+[\.\-\s\)]+/, '').trim();
      return {
        id: `std-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        name: clean,
        callCount: 0,
      };
    });

    const updated = {
      ...activeClass,
      students: [...activeClass.students, ...newStudents],
    };
    onUpdateClass(updated);
    setBatchText('');
    setShowBatchModal(false);
    soundEngine.playTick(1.3);
  };

  // Handle save edit student
  const handleSaveStudentEdit = (studentId: string) => {
    if (!activeClass) return;
    const updatedStudents = activeClass.students.map((s) => {
      if (s.id === studentId) {
        return {
          ...s,
          name: editName.trim() || s.name,
          studentCode: editCode.trim() || undefined,
          callCount: Math.max(0, editCount),
        };
      }
      return s;
    });

    onUpdateClass({ ...activeClass, students: updatedStudents });
    setEditingStudentId(null);
  };

  // Adjust count by delta (+1 / -1)
  const handleAdjustCount = (studentId: string, delta: number) => {
    if (!activeClass) return;
    const updatedStudents = activeClass.students.map((s) => {
      if (s.id === studentId) {
        return {
          ...s,
          callCount: Math.max(0, (s.callCount || 0) + delta),
        };
      }
      return s;
    });
    onUpdateClass({ ...activeClass, students: updatedStudents });
    soundEngine.playTick(delta > 0 ? 1.2 : 0.8);
  };

  // Adjust stars by delta (+1 / -1)
  const handleAdjustStars = (studentId: string, delta: number) => {
    if (!activeClass) return;
    const updatedStudents = activeClass.students.map((s) => {
      if (s.id === studentId) {
        return {
          ...s,
          stars: Math.max(0, (s.stars || 0) + delta),
        };
      }
      return s;
    });
    onUpdateClass({ ...activeClass, students: updatedStudents });
    if (delta > 0) {
      soundEngine.playStarSound();
    } else {
      soundEngine.playTick(0.8);
    }
  };

  // Toggle student absent status
  const handleToggleAbsent = (studentId: string) => {
    if (!activeClass) return;
    const updatedStudents = activeClass.students.map((s) => {
      if (s.id === studentId) {
        return {
          ...s,
          isAbsent: !s.isAbsent,
        };
      }
      return s;
    });
    onUpdateClass({ ...activeClass, students: updatedStudents });
    soundEngine.playTick(1.0);
  };

  // Reset all students to present
  const handleResetAllAttendance = () => {
    if (!activeClass) return;
    const updatedStudents = activeClass.students.map((s) => ({
      ...s,
      isAbsent: false,
    }));
    onUpdateClass({ ...activeClass, students: updatedStudents });
  };

  // Delete student
  const handleDeleteStudent = (studentId: string, studentName: string) => {
    if (!activeClass) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa học sinh "${studentName}" khỏi lớp ${activeClass.name}?`)) {
      const updatedStudents = activeClass.students.filter((s) => s.id !== studentId);
      onUpdateClass({ ...activeClass, students: updatedStudents });
    }
  };

  // Save class rename
  const handleSaveClassRename = () => {
    if (!activeClass || !renameClassName.trim()) return;
    onUpdateClass({
      ...activeClass,
      name: renameClassName.trim(),
      subject: renameSubject.trim() || undefined,
    });
    setIsRenamingClass(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-6">
      
      {/* Top Header & Class Selector Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            <span>QUẢN LÝ DANH SÁCH LỚP HỌC</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Quản lý sĩ số, số lần lên bảng và thông tin học sinh cho từng lớp riêng biệt.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAddClassModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/30 transition-all hover:scale-102"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Lớp Mới</span>
          </button>
          <button
            onClick={onNavigateToImport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 text-xs sm:text-sm font-semibold transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Nhập Excel</span>
          </button>
        </div>
      </div>

      {/* Sample Data Notice & 1-Click Clear */}
      {hasSampleData && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-2.5 text-indigo-200">
            <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span>
              Hệ thống đang hiển thị <strong>dữ liệu lớp mẫu</strong> (7A1, 7A2, 8A1). Thầy/Cô có thể tạo lớp mới, dán danh sách hoặc xóa sạch để bắt đầu từ đầu.
            </span>
          </div>
          {onClearAllSampleData && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    'Bạn có chắc chắn muốn xóa toàn bộ các lớp mẫu (7A1, 7A2, 8A1) để bắt đầu với một lớp mới hoàn toàn sạch sẽ không?'
                  )
                ) {
                  onClearAllSampleData();
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900/90 border border-rose-700/60 text-rose-300 font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa sạch dữ liệu mẫu</span>
            </button>
          )}
        </div>
      )}

      {/* Class Switcher Badges Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {classes.map((cls) => {
          const isSelected = cls.id === activeClassId;
          return (
            <button
              key={cls.id}
              onClick={() => onSelectClass(cls.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all shrink-0 ${
                isSelected
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 scale-102'
                  : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-700/80 hover:text-white'
              }`}
            >
              <span>📚 Lớp {cls.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-900 text-slate-400'}`}>
                {cls.students.length} HS
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Class Detail Card & Action Buttons */}
      {activeClass && (
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-xl space-y-5">
          {/* Class Title & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/80">
            {isRenamingClass ? (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={renameClassName}
                  onChange={(e) => setRenameClassName(e.target.value)}
                  placeholder="Tên lớp (vd: 7A1)"
                  className="bg-slate-900 border border-indigo-500 rounded-lg px-3 py-1.5 text-sm text-white font-bold"
                />
                <input
                  type="text"
                  value={renameSubject}
                  onChange={(e) => setRenameSubject(e.target.value)}
                  placeholder="Môn học (vd: Toán)"
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white"
                />
                <button
                  onClick={handleSaveClassRename}
                  className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsRenamingClass(false)}
                  className="p-2 rounded-lg bg-slate-700 text-slate-300 text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-lg font-black text-indigo-400">
                  {activeClass.name.slice(0, 3)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white">Lớp {activeClass.name}</h2>
                    {activeClass.subject && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-medium">
                        Môn: {activeClass.subject}
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setRenameClassName(activeClass.name);
                        setRenameSubject(activeClass.subject || '');
                        setIsRenamingClass(true);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-slate-200"
                      title="Đổi tên lớp"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    Sĩ số: <strong className="text-slate-200">{activeClass.students.length}</strong> học sinh
                  </p>
                </div>
              </div>
            )}

            {/* Student list action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowAddStudentModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm 1 học sinh</span>
              </button>
              <button
                onClick={() => setShowBatchModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-colors"
              >
                <FilePlus className="w-3.5 h-3.5 text-amber-400" />
                <span>Dán nhanh danh sách</span>
              </button>

              {activeClass.students.length > 0 && (
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        `Bạn có chắc chắn muốn xóa toàn bộ ${activeClass.students.length} học sinh trong lớp "${activeClass.name}" không? Thao tác này sẽ làm trống lớp để bạn nhập danh sách mới.`
                      )
                    ) {
                      if (onClearClassStudents) {
                        onClearClassStudents(activeClass.id);
                      } else {
                        onUpdateClass({ ...activeClass, students: [] });
                      }
                    }
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 text-xs font-semibold transition-colors"
                  title="Xóa tất cả học sinh trong lớp này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa hết HS lớp này</span>
                </button>
              )}

              <button
                onClick={() => {
                  if (classes.length > 1) {
                    if (
                      window.confirm(
                        `Bạn có chắc chắn muốn xóa lớp "${activeClass.name}" và toàn bộ dữ liệu của lớp này không?`
                      )
                    ) {
                      onDeleteClass(activeClass.id);
                    }
                  } else {
                    onDeleteClass(activeClass.id);
                  }
                }}
                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
                title={classes.length > 1 ? "Xóa lớp này" : "Xóa & làm mới lớp này"}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search and Table header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm học sinh theo tên hoặc mã..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
              <span>
                Hiển thị {filteredStudents.length} / {activeClass.students.length} học sinh
              </span>
              {activeClass.students.some((s) => s.isAbsent) && (
                <button
                  onClick={handleResetAllAttendance}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2"
                >
                  Bỏ đánh dấu vắng (Tất cả có mặt)
                </button>
              )}
            </div>
          </div>

          {/* Students Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-700/80">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase text-[11px] border-b border-slate-700">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">STT</th>
                  <th className="py-3 px-3">Họ và tên</th>
                  <th className="py-3 px-3 hidden sm:table-cell">Mã HS</th>
                  <th className="py-3 px-3 text-center">Số lần lên</th>
                  <th className="py-3 px-3 text-center">⭐ Sao thưởng</th>
                  <th className="py-3 px-3 text-center">Điểm danh</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 bg-slate-800/40">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      {searchTerm ? 'Không tìm thấy học sinh phù hợp.' : 'Lớp chưa có học sinh nào. Nhấn "+ Thêm 1 học sinh" hoặc "Nhập Excel".'}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => {
                    const isEditing = editingStudentId === student.id;
                    const count = student.callCount || 0;
                    const isAbsent = !!student.isAbsent;

                    return (
                      <tr
                        key={student.id}
                        className={`transition-colors ${
                          isAbsent
                            ? 'bg-rose-950/20 text-slate-400 hover:bg-rose-950/30'
                            : 'hover:bg-slate-700/40'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>

                        <td className="py-2.5 px-3 font-semibold text-slate-100">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="bg-slate-900 border border-indigo-500 rounded px-2 py-1 text-xs text-white font-bold w-full"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={isAbsent ? 'line-through text-slate-400' : ''}>
                                {student.name}
                              </span>
                              {student.gender === 'nu' && (
                                <span className="text-[10px] px-1 rounded bg-pink-950/60 text-pink-300 font-normal">Nữ</span>
                              )}
                              {isAbsent && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                                  Vắng
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 hidden sm:table-cell text-slate-400 text-xs font-mono">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editCode}
                              onChange={(e) => setEditCode(e.target.value)}
                              placeholder="Mã HS"
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white w-24"
                            />
                          ) : (
                            student.studentCode || '—'
                          )}
                        </td>

                        {/* Call count controls */}
                        <td className="py-2.5 px-3 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={editCount}
                              onChange={(e) => setEditCount(parseInt(e.target.value, 10) || 0)}
                              className="bg-slate-900 border border-indigo-500 rounded px-2 py-1 text-xs text-white font-bold w-16 text-center"
                            />
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleAdjustCount(student.id, -1)}
                                disabled={count <= 0}
                                className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 text-xs font-bold flex items-center justify-center"
                                title="Giảm 1 lần"
                              >
                                -
                              </button>
                              <span className="font-extrabold text-amber-300 w-7 text-center">
                                {count}
                              </span>
                              <button
                                onClick={() => handleAdjustCount(student.id, 1)}
                                className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold flex items-center justify-center"
                                title="Tăng 1 lần"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Star rewards controls */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleAdjustStars(student.id, -1)}
                              disabled={(student.stars || 0) <= 0}
                              className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 text-xs font-bold flex items-center justify-center"
                              title="Trừ 1 sao"
                            >
                              -
                            </button>
                            <span className="font-extrabold text-amber-400 min-w-[28px] text-center flex items-center justify-center gap-0.5">
                              <span>{student.stars || 0}</span>
                              <span className="text-xs">⭐</span>
                            </span>
                            <button
                              onClick={() => handleAdjustStars(student.id, 1)}
                              className="w-6 h-6 rounded bg-amber-600/60 hover:bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center shadow-sm"
                              title="Cộng 1 sao khen thưởng"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Status Badge & Absent Toggle */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleToggleAbsent(student.id)}
                              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                                isAbsent
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                              }`}
                              title={isAbsent ? 'Bấm để đánh dấu có mặt' : 'Bấm để đánh dấu vắng mặt'}
                            >
                              {isAbsent ? '🔴 Vắng mặt' : '🟢 Có mặt'}
                            </button>
                            <span className="text-[11px] text-slate-400">
                              ({count === 0 ? 'Chưa lên' : `${count} lần`})
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleSaveStudentEdit(student.id)}
                                className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                                title="Lưu"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingStudentId(null)}
                                className="p-1 rounded bg-slate-700 text-slate-300"
                                title="Hủy"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingStudentId(student.id);
                                  setEditName(student.name);
                                  setEditCode(student.studentCode || '');
                                  setEditCount(student.callCount || 0);
                                }}
                                className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                                title="Sửa tên & số lần"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(student.id, student.name)}
                                className="p-1.5 rounded hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition-colors"
                                title="Xóa học sinh"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <span>Thêm Lớp Học Mới</span>
              </h3>
              <button
                onClick={() => setShowAddClassModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Tên lớp học *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 7A3, 8A2, 9B..."
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Môn học (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Toán, Văn, Lý, Hóa, Tiếng Anh..."
                  value={newClassSubject}
                  onChange={(e) => setNewClassSubject(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md"
                >
                  Tạo lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Single Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <span>Thêm Học Sinh Mới vào {activeClass?.name}</span>
              </h3>
              <button
                onClick={() => setShowAddStudentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Họ và tên học sinh *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mã học sinh (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: HS01, 7A1-05..."
                  value={newStudentCode}
                  onChange={(e) => setNewStudentCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Giới tính
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStudentGender('nam')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      newStudentGender === 'nam'
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    Nam
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStudentGender('nu')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      newStudentGender === 'nu'
                        ? 'bg-pink-600 border-pink-500 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    Nữ
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md"
                >
                  Lưu học sinh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Paste Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-amber-400" />
                <span>Dán Nhanh Danh Sách Học Sinh</span>
              </h3>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Dán danh sách tên học sinh (mỗi học sinh một dòng) từ Excel, Word hoặc tin nhắn:
            </p>

            <textarea
              rows={8}
              placeholder={`Nguyễn Văn An\nTrần Thị Bình\nLê Văn Chi\nPhạm Tiến Dũng`}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
            />

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Đã nhận diện: {batchText.split('\n').filter((l) => l.trim()).length} học sinh</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-600"
                >
                  Hủy
                </button>
                <button
                  onClick={handleBatchAdd}
                  disabled={!batchText.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md"
                >
                  Thêm vào lớp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
