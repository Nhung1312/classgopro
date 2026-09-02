import * as XLSX from 'xlsx';
import { ClassRoom, Student } from '../types';
import { calculateStudentGrade } from './gradeCalculator';

/**
 * Splits a full Vietnamese name into (Họ & tên đệm) and (Tên)
 * e.g. "Đoàn Trần Quốc An" -> hoDem: "Đoàn Trần Quốc", ten: "An"
 */
export function splitVietnameseName(fullName: string): { hoDem: string; ten: string } {
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) {
    return { hoDem: '', ten: trimmed };
  }
  const ten = parts[parts.length - 1];
  const hoDem = parts.slice(0, parts.length - 1).join(' ');
  return { hoDem, ten };
}

/**
 * Exports EXACT vnEdu gradebook format (.xlsx / .xls compatible)
 * Formatted identically to the official vnEdu template (Multi-level headers, Họ đệm / Tên columns)
 */
export function exportVnEduGradebookToExcel(classroom: ClassRoom, schoolName = 'TRƯỜNG TH & THCS LƯƠNG CHÍ', schoolYear = '2025-2026', semester = 'HỌC KỲ 1') {
  // 1. Construct 2D array matrix matching vnEdu layout
  const rows: (string | number)[][] = [
    ['ỦY BAN NHÂN DÂN PHƯỜNG / QUẬN', '', '', '', '', '', '', '', '', '', ''],
    [schoolName.toUpperCase(), '', '', '', '', '', '', '', '', '', ''],
    [`BẢNG ĐIỂM CHI TIẾT - MÔN TOÁN HỌC - ${semester.toUpperCase()} - NĂM HỌC ${schoolYear}`, '', '', '', '', '', '', '', '', '', ''],
    [`Lớp ${classroom.name}`, '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', ''], // empty spacer row
    // Row 6 (Index 5): Header 1
    ['STT', 'Họ và tên', '', 'ĐĐGtx', '', '', '', 'ĐĐGgk', 'ĐĐGck', 'ĐTB mhk', 'Nhận xét'],
    // Row 7 (Index 6): Header 2
    ['', '', '', 'TX1', 'TX2', 'TX3', 'TX4', '', '', '', ''],
  ];

  // 2. Add student rows (from Row 8, index 7)
  classroom.students.forEach((student, idx) => {
    const summary = calculateStudentGrade(student);
    const scores = student.scores || {};
    const { hoDem, ten } = splitVietnameseName(student.name);

    rows.push([
      idx + 1,
      hoDem,
      ten,
      scores.tx1 !== undefined && scores.tx1 !== null ? scores.tx1 : '',
      scores.tx2 !== undefined && scores.tx2 !== null ? scores.tx2 : '',
      scores.tx3 !== undefined && scores.tx3 !== null ? scores.tx3 : '',
      scores.tx4 !== undefined && scores.tx4 !== null ? scores.tx4 : '',
      scores.gk !== undefined && scores.gk !== null ? scores.gk : '',
      scores.ck !== undefined && scores.ck !== null ? scores.ck : '',
      summary.finalAvg !== null ? summary.finalAvg : '',
      student.notes || '',
    ]);
  });

  // 3. Create worksheet from AoA (Array of Arrays)
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // 4. Configure merges matching vnEdu template
  worksheet['!merges'] = [
    // Header title rows
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, // Row 1
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }, // Row 2
    { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } }, // Row 3
    { s: { r: 3, c: 0 }, e: { r: 3, c: 10 } }, // Row 4

    // Table Header Merges (Row 6 & 7)
    { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } }, // STT (A6:A7)
    { s: { r: 5, c: 1 }, e: { r: 6, c: 2 } }, // Họ và tên (B6:C7)
    { s: { r: 5, c: 3 }, e: { r: 5, c: 6 } }, // ĐĐGtx (D6:G6)
    { s: { r: 5, c: 7 }, e: { r: 6, c: 7 } }, // ĐĐGgk (H6:H7)
    { s: { r: 5, c: 8 }, e: { r: 6, c: 8 } }, // ĐĐGck (I6:I7)
    { s: { r: 5, c: 9 }, e: { r: 6, c: 9 } }, // ĐTB mhk (J6:J7)
    { s: { r: 5, c: 10 }, e: { r: 6, c: 10 } }, // Nhận xét (K6:K7)
  ];

  // 5. Column widths
  worksheet['!cols'] = [
    { wch: 6 },  // A: STT
    { wch: 20 }, // B: Họ và tên đệm
    { wch: 10 }, // C: Tên
    { wch: 8 },  // D: TX1
    { wch: 8 },  // E: TX2
    { wch: 8 },  // F: TX3
    { wch: 8 },  // G: TX4
    { wch: 10 }, // H: ĐĐGgk
    { wch: 10 }, // I: ĐĐGck
    { wch: 10 }, // J: ĐTB mhk
    { wch: 45 }, // K: Nhận xét
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Lớp_${classroom.name}`);

  const filename = `so_diem_vnedu_Lop_${classroom.name}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Standard Full subject gradebook export with Call counts, stars, and notes
 */
export function exportEduGradebookToExcel(classroom: ClassRoom) {
  const data = classroom.students.map((student, idx) => {
    const summary = calculateStudentGrade(student);
    const scores = student.scores || {};

    return {
      'STT': idx + 1,
      'Mã học sinh': student.studentCode || `HS-${idx + 1}`,
      'Họ và tên học sinh': student.name,
      'Giới tính': student.gender === 'nu' ? 'Nữ' : student.gender === 'nam' ? 'Nam' : '',
      'Số lần KT bài cũ': student.callCount || 0,
      '⭐ Sao thưởng': student.stars || 0,
      'ĐĐGtx 1 (Miệng)': scores.tx1 !== undefined && scores.tx1 !== null ? scores.tx1 : '',
      'ĐĐGtx 2 (15p)': scores.tx2 !== undefined && scores.tx2 !== null ? scores.tx2 : '',
      'ĐĐGtx 3': scores.tx3 !== undefined && scores.tx3 !== null ? scores.tx3 : '',
      'ĐĐGtx 4': scores.tx4 !== undefined && scores.tx4 !== null ? scores.tx4 : '',
      'ĐĐGgk (Giữa kỳ - HS2)': scores.gk !== undefined && scores.gk !== null ? scores.gk : '',
      'ĐĐGck (Cuối kỳ - HS3)': scores.ck !== undefined && scores.ck !== null ? scores.ck : '',
      'ĐTB môn HK': summary.finalAvg !== null ? summary.finalAvg : '',
      'Xếp loại': summary.evaluation,
      'Nhận xét đánh giá': student.notes || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Sổ Điểm Lớp ${classroom.name}`);

  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Ma HS
    { wch: 24 }, // Ho va ten
    { wch: 10 }, // Gioi tinh
    { wch: 16 }, // So lan KT
    { wch: 14 }, // Sao thuong
    { wch: 16 }, // TX1
    { wch: 16 }, // TX2
    { wch: 12 }, // TX3
    { wch: 12 }, // TX4
    { wch: 20 }, // GK
    { wch: 20 }, // CK
    { wch: 14 }, // DTB
    { wch: 14 }, // Xep loai
    { wch: 35 }, // Nhan xet
  ];

  const filename = `So_Diem_Chi_Tiet_${classroom.name}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
