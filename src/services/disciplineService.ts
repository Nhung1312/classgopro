import * as XLSX from 'xlsx';
import { DisciplineRecord, DisciplineViolationType, Student } from '../types';

const STORAGE_KEYS = {
  RECORDS: 'classgo_discipline_records_v1',
  VIOLATION_TYPES: 'classgo_discipline_violation_types_v1',
};

export const DEFAULT_VIOLATION_TYPES: DisciplineViolationType[] = [
  {
    id: 'noi_chuyen',
    name: 'Nói chuyện',
    icon: '🗣️',
    isDefault: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'khong_lam_bai_tap',
    name: 'Không làm bài tập',
    icon: '📚',
    isDefault: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'khong_thuoc_bai',
    name: 'Không thuộc bài',
    icon: '📖',
    isDefault: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tra_loi_sai',
    name: 'Trả lời sai',
    icon: '❌',
    isDefault: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export function loadViolationTypes(): DisciplineViolationType[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VIOLATION_TYPES);
    if (!raw) {
      saveViolationTypes(DEFAULT_VIOLATION_TYPES);
      return DEFAULT_VIOLATION_TYPES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure all 4 default types exist in the list
      const existingIds = new Set(parsed.map((p) => p.id));
      let updated = [...parsed];
      DEFAULT_VIOLATION_TYPES.forEach((def) => {
        if (!existingIds.has(def.id)) {
          updated.push(def);
        }
      });
      return updated;
    }
  } catch (err) {
    console.error('Failed to load violation types:', err);
  }
  return DEFAULT_VIOLATION_TYPES;
}

export function saveViolationTypes(types: DisciplineViolationType[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.VIOLATION_TYPES, JSON.stringify(types));
  } catch (err) {
    console.error('Failed to save violation types:', err);
  }
}

export function addCustomViolationType(name: string, icon = '⚠️'): DisciplineViolationType {
  const types = loadViolationTypes();
  const trimmed = name.trim();
  const newType: DisciplineViolationType = {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: trimmed,
    icon: icon.trim() || '⚠️',
    isDefault: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  const updated = [...types, newType];
  saveViolationTypes(updated);
  return newType;
}

export function updateViolationType(
  id: string,
  updates: Partial<Pick<DisciplineViolationType, 'name' | 'icon' | 'isActive'>>
): DisciplineViolationType[] {
  const types = loadViolationTypes();
  const updated = types.map((t) => {
    if (t.id === id) {
      return {
        ...t,
        ...updates,
      };
    }
    return t;
  });
  saveViolationTypes(updated);
  return updated;
}

export function loadDisciplineRecords(): DisciplineRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECORDS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load discipline records:', err);
  }
  return [];
}

export function saveDisciplineRecords(records: DisciplineRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save discipline records:', err);
  }
}

export interface CreateRecordParams {
  studentId: string;
  classId: string;
  violationTypeId: string;
  source: 'manual' | 'random_picker';
  lesson?: string;
  note?: string;
  customDate?: string;
  customTime?: string;
}

export function createDisciplineRecord(params: CreateRecordParams): DisciplineRecord {
  const records = loadDisciplineRecords();
  const types = loadViolationTypes();
  const typeObj = types.find((t) => t.id === params.violationTypeId) ||
    DEFAULT_VIOLATION_TYPES.find((t) => t.id === params.violationTypeId);

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = params.customDate || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeStr = params.customTime || `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const newRecord: DisciplineRecord = {
    id: `disc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    studentId: params.studentId,
    classId: params.classId,
    violationTypeId: params.violationTypeId,
    violationName: typeObj ? typeObj.name : 'Lỗi khác',
    violationIcon: typeObj ? typeObj.icon : '⚠️',
    date: dateStr,
    time: timeStr,
    source: params.source,
    lesson: params.lesson || '',
    note: params.note || '',
    createdAt: now.toISOString(),
  };

  const updated = [newRecord, ...records];
  saveDisciplineRecords(updated);
  return newRecord;
}

export function deleteDisciplineRecord(recordId: string): DisciplineRecord[] {
  const records = loadDisciplineRecords();
  const updated = records.filter((r) => r.id !== recordId);
  saveDisciplineRecords(updated);
  return updated;
}

/**
 * Filter records by date range helper
 */
export function filterRecordsByPeriod(
  records: DisciplineRecord[],
  period: 'all' | 'today' | 'week' | 'month' | 'semester'
): DisciplineRecord[] {
  if (period === 'all') return records;

  const now = new Date();
  const nowMs = now.getTime();
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  if (period === 'today') {
    return records.filter((r) => r.date === todayStr);
  }

  if (period === 'week') {
    // Current week starting from Monday
    const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday...
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    return records.filter((r) => {
      const recDate = new Date(r.date).getTime();
      return recDate >= monday.getTime();
    });
  }

  if (period === 'month') {
    const currentMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    return records.filter((r) => r.date.startsWith(currentMonth));
  }

  if (period === 'semester') {
    // Standard Vietnamese school semester: HK1: Aug-Jan, HK2: Feb-Jun
    const month = now.getMonth() + 1; // 1-12
    const isHK1 = month >= 8 || month === 1;
    const year = now.getFullYear();

    return records.filter((r) => {
      const recMonth = parseInt(r.date.split('-')[1] || '0', 10);
      const recYear = parseInt(r.date.split('-')[0] || '0', 10);
      if (isHK1) {
        // Fall semester
        return (
          (recMonth >= 8 && recYear === (month === 1 ? year - 1 : year)) ||
          (recMonth === 1 && recYear === (month >= 8 ? year + 1 : year))
        );
      } else {
        // Spring semester: Feb - July
        return recMonth >= 2 && recMonth <= 7 && recYear === year;
      }
    });
  }

  return records;
}

/**
 * Export Discipline Report to Excel (Independent from Gradebook & Edu file)
 */
export function exportDisciplineReportToExcel(params: {
  className: string;
  students: Student[];
  records: DisciplineRecord[];
  violationTypes: DisciplineViolationType[];
  singleStudent?: Student;
  periodLabel: string;
}) {
  const { className, students, records, violationTypes, singleStudent, periodLabel } = params;

  // Active types for columns
  const activeTypes = violationTypes.filter((t) => t.isActive);

  // Workbook creation
  const wb = XLSX.utils.book_new();

  if (singleStudent) {
    // Single student report
    const studentRecords = records.filter((r) => r.studentId === singleStudent.id);
    const summaryRows: (string | number)[][] = [
      ['BÁO CÁO NỀ NẾP HỌC SINH CHI TIẾT', ''],
      [`Học sinh: ${singleStudent.name}`, `Lớp: ${className}`],
      [`Kỳ báo cáo: ${periodLabel}`, `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`],
      ['', ''],
      ['Loại lỗi vi phạm', 'Số lần ghi nhận'],
    ];

    let totalViolations = 0;
    violationTypes.forEach((vt) => {
      const count = studentRecords.filter((r) => r.violationTypeId === vt.id).length;
      if (count > 0 || vt.isActive) {
        summaryRows.push([`${vt.icon} ${vt.name}`, count]);
        totalViolations += count;
      }
    });
    summaryRows.push(['TỔNG CỘNG', totalViolations]);
    summaryRows.push(['', '']);
    summaryRows.push(['LỊCH SỬ CHI TIẾT TỪNG LẦN', '', '', '', '']);
    summaryRows.push(['STT', 'Ngày', 'Giờ', 'Lỗi vi phạm', 'Nguồn ghi nhận', 'Ghi chú']);

    studentRecords.forEach((rec, idx) => {
      summaryRows.push([
        idx + 1,
        rec.date,
        rec.time,
        `${rec.violationIcon || ''} ${rec.violationName || ''}`.trim(),
        rec.source === 'random_picker' ? 'Quay tên' : 'Thủ công',
        rec.note || '',
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(summaryRows);
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, 'ChiTietHocSinh');

    const fileName = `Bao_cao_ne_nep_${singleStudent.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    return;
  }

  // Entire class report
  // Sheet 1: Tổng hợp cả lớp
  const classSummaryRows: (string | number)[][] = [
    [`BÁO CÁO TỔNG HỢP NỀ NẾP MÔN HỌC - LỚP ${className.toUpperCase()}`],
    [`Kỳ báo cáo: ${periodLabel} | Ngày xuất: ${new Date().toLocaleDateString('vi-VN')} | Tổng số HS: ${students.length}`],
    [''],
  ];

  // Header row
  const header = ['STT', 'Mã HS', 'Họ và tên'];
  activeTypes.forEach((vt) => {
    header.push(`${vt.icon} ${vt.name}`);
  });
  header.push('Tổng vi phạm');
  classSummaryRows.push(header);

  // Student rows
  students.forEach((std, idx) => {
    const stdRecords = records.filter((r) => r.studentId === std.id);
    const row: (string | number)[] = [idx + 1, std.studentCode || '', std.name];
    let studentTotal = 0;

    activeTypes.forEach((vt) => {
      const c = stdRecords.filter((r) => r.violationTypeId === vt.id).length;
      row.push(c > 0 ? c : 0);
      studentTotal += c;
    });

    row.push(studentTotal);
    classSummaryRows.push(row);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(classSummaryRows);
  wsSummary['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 26 },
    ...activeTypes.map(() => ({ wch: 18 })),
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'TongHopLop');

  // Sheet 2: Toàn bộ nhật ký chi tiết
  const logRows: (string | number)[][] = [
    ['NHẬT KÝ CHI TIẾT TỪNG LẦN GHI NHẬN NỀ NẾP'],
    [`Lớp: ${className} | Tổng số bản ghi: ${records.length}`],
    [''],
    ['STT', 'Họ và tên học sinh', 'Ngày', 'Giờ', 'Loại vi phạm', 'Nguồn ghi nhận', 'Ghi chú / Tiết'],
  ];

  records.forEach((rec, idx) => {
    const std = students.find((s) => s.id === rec.studentId);
    logRows.push([
      idx + 1,
      std ? std.name : 'Chưa rõ',
      rec.date,
      rec.time,
      `${rec.violationIcon || ''} ${rec.violationName || ''}`.trim(),
      rec.source === 'random_picker' ? 'Quay tên' : 'Thủ công',
      [rec.lesson ? `Tiết: ${rec.lesson}` : '', rec.note || ''].filter(Boolean).join(' - '),
    ]);
  });

  const wsLogs = XLSX.utils.aoa_to_sheet(logRows);
  wsLogs['!cols'] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 14 },
    { wch: 10 },
    { wch: 22 },
    { wch: 16 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsLogs, 'NhatKyChiTiet');

  const fileName = `Bao_cao_ne_nep_Lop_${className}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
