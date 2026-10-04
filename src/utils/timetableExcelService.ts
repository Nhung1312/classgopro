import * as XLSX from 'xlsx';
import { ClassRoom, TimetableSlot, TeachingPlanItem } from '../types';

/**
 * =========================================================================================
 * 📅 VNEDU EXCEL SERVICE FOR TIMETABLE & TEACHING LOG (THỜI KHÓA BIỂU & SỔ BÁO GIẢNG)
 * =========================================================================================
 */

// Helper to normalize strings for comparison
function normalizeStr(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim().toLowerCase();
}

// Convert Vietnamese Day text to Day Number (2 - 7)
function parseVietnameseDay(dayRaw: any): 2 | 3 | 4 | 5 | 6 | 7 | null {
  if (!dayRaw) return null;
  const s = normalizeStr(dayRaw);

  if (s.includes('hai') || s === '2' || s === 't2' || s.includes('thứ 2') || s.includes('thu 2')) return 2;
  if (s.includes('ba') || s === '3' || s === 't3' || s.includes('thứ 3') || s.includes('thu 3')) return 3;
  if (s.includes('tư') || s.includes('tu') || s.includes('bốn') || s === '4' || s === 't4' || s.includes('thứ 4') || s.includes('thu 4')) return 4;
  if (s.includes('năm') || s.includes('nam') || s === '5' || s === 't5' || s.includes('thứ 5') || s.includes('thu 5')) return 5;
  if (s.includes('sáu') || s.includes('sau') || s === '6' || s === 't6' || s.includes('thứ 6') || s.includes('thu 6')) return 6;
  if (s.includes('bảy') || s.includes('bay') || s === '7' || s === 't7' || s.includes('thứ 7') || s.includes('thu 7')) return 7;

  return null;
}

// Parse Period Number (1 - 10)
function parsePeriodNumber(periodRaw: any, sessionRaw?: any): number | null {
  if (periodRaw === null || periodRaw === undefined) return null;
  const str = String(periodRaw).trim();
  const numMatch = str.match(/\d+/);
  if (!numMatch) return null;

  let p = parseInt(numMatch[0], 10);
  const session = normalizeStr(sessionRaw);

  // If marked as Afternoon (Chiều) and period is 1-5, convert to 6-10
  if ((session.includes('chiều') || session.includes('chieu')) && p >= 1 && p <= 5) {
    p += 5;
  }

  if (p >= 1 && p <= 10) return p;
  return null;
}

// Find closest matching class
function matchClass(classNameRaw: string, classes: ClassRoom[]): { classId: string; className: string } {
  const raw = classNameRaw.trim();
  const cleanRaw = raw.replace(/^(lớp|lop)\s*/i, '').trim().toLowerCase();

  // 1. Exact match
  const exact = classes.find((c) => {
    const cClean = c.name.replace(/^(lớp|lop)\s*/i, '').trim().toLowerCase();
    return cClean === cleanRaw || c.name.toLowerCase() === raw.toLowerCase();
  });
  if (exact) {
    return { classId: exact.id, className: exact.name };
  }

  // 2. Partial match
  const partial = classes.find((c) => {
    const cClean = c.name.replace(/^(lớp|lop)\s*/i, '').trim().toLowerCase();
    return cClean.includes(cleanRaw) || cleanRaw.includes(cClean);
  });
  if (partial) {
    return { classId: partial.id, className: partial.name };
  }

  // 3. Fallback: use raw name
  const fallbackName = raw.startsWith('Lớp ') ? raw.replace('Lớp ', '') : raw;
  return {
    classId: classes[0]?.id || `auto-${Date.now()}`,
    className: fallbackName || 'Lớp học',
  };
}

/**
 * =========================================================================================
 * 1. TẢI FILE MẪU EXCEL CHUẨN vnEdu: THỜI KHÓA BIỂU
 * =========================================================================================
 */
export function downloadVnEduTimetableTemplate(classes?: ClassRoom[]) {
  const wb = XLSX.utils.book_new();

  // SAMPLE CLASS NAMES
  const c1 = classes?.[0]?.name || '10A1';
  const c2 = classes?.[1]?.name || '10A2';
  const c3 = classes?.[2]?.name || '11B3';

  // SHEET 1: MA TRẬN LƯỚI TUẦN CHUẨN vnEdu (Weekly Matrix Format)
  const matrixRows: (string | number)[][] = [
    ['SỞ GD&ĐT / PHÒNG GD&ĐT', '', '', '', '', '', '', ''],
    ['TRƯỜNG TRUNG HỌC PHỔ THÔNG / THCS', '', '', '', '', '', '', ''],
    ['THỜI KHÓA BIỂU GIẢNG DẠY CỦA GIÁO VIÊN (CHUẨN vnEdu)', '', '', '', '', '', '', ''],
    ['Năm học: 2025 - 2026 | Áp dụng từ: Học kỳ 1 | Môn: Toán học', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['Buổi', 'Tiết', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'],
    ['Sáng', 1, `${c1} (Toán) - P.201`, '', `${c1} (Toán)`, `${c2} (Toán)`, '', 'Chào cờ / SHDC'],
    ['Sáng', 2, `${c1} (Toán) - P.201`, `${c2} (Toán)`, '', `${c2} (Toán)`, `${c3} (Toán)`, ''],
    ['Sáng', 3, `${c2} (Toán) - P.202`, `${c1} (Toán)`, `${c3} (Toán)`, '', `${c1} (Toán)`, `${c2} (Toán)`],
    ['Sáng', 4, '', `${c3} (Toán)`, `${c2} (Toán)`, `${c1} (Toán)`, '', `${c3} (Toán)`],
    ['Sáng', 5, '', '', '', '', `${c2} (Toán)`, 'Sinh hoạt lớp'],
    ['Chiều', 6, `${c3} (Bồi dưỡng)`, '', '', `${c3} (Toán)`, '', ''],
    ['Chiều', 7, `${c3} (Bồi dưỡng)`, '', `${c1} (Phụ đạo)`, '', '', ''],
    ['Chiều', 8, '', '', '', '', '', ''],
    ['Chiều', 9, '', '', '', '', '', ''],
    ['Chiều', 10, '', '', '', '', '', ''],
  ];

  const wsMatrix = XLSX.utils.aoa_to_sheet(matrixRows);
  wsMatrix['!cols'] = [
    { wch: 10 }, // Buổi
    { wch: 8 },  // Tiết
    { wch: 24 }, // T2
    { wch: 24 }, // T3
    { wch: 24 }, // T4
    { wch: 24 }, // T5
    { wch: 24 }, // T6
    { wch: 24 }, // T7
  ];
  XLSX.utils.book_append_sheet(wb, wsMatrix, 'TKB_Luoi_vnEdu');

  // SHEET 2: DẠNG DANH SÁCH CHI TIẾT (List format)
  const listRows: (string | number)[][] = [
    ['BẢNG PHÂN CÔNG GIẢNG DẠY THEO TIẾT (CHUẨN vnEdu / SMAS)'],
    ['STT', 'Thứ', 'Buổi', 'Tiết', 'Lớp', 'Môn học', 'Phòng học', 'Ghi chú'],
    [1, 'Thứ Hai', 'Sáng', 1, c1, 'Toán học', 'P.201', 'Đại số'],
    [2, 'Thứ Hai', 'Sáng', 2, c1, 'Toán học', 'P.201', 'Hình học'],
    [3, 'Thứ Hai', 'Sáng', 3, c2, 'Toán học', 'P.202', 'Kiểm tra 15p'],
    [4, 'Thứ Ba', 'Sáng', 2, c2, 'Toán học', 'P.202', 'Luyện tập'],
    [5, 'Thứ Ba', 'Sáng', 3, c1, 'Toán học', 'P.201', 'Đại số'],
    [6, 'Thứ Ba', 'Sáng', 4, c3, 'Toán học', 'P.301', 'Chuyên đề'],
    [7, 'Thứ Tư', 'Sáng', 1, c1, 'Toán học', 'P.201', 'Luyện tập'],
    [8, 'Thứ Tư', 'Sáng', 3, c3, 'Toán học', 'P.301', 'Hình học'],
    [9, 'Thứ Năm', 'Sáng', 1, c2, 'Toán học', 'P.202', 'Đại số'],
    [10, 'Thứ Năm', 'Sáng', 2, c2, 'Toán học', 'P.202', 'Hình học'],
    [11, 'Thứ Sáu', 'Sáng', 2, c3, 'Toán học', 'P.301', 'Đại số'],
    [12, 'Thứ Sáu', 'Sáng', 3, c1, 'Toán học', 'P.201', 'Hình học'],
  ];

  const wsList = XLSX.utils.aoa_to_sheet(listRows);
  wsList['!cols'] = [
    { wch: 6 },  // STT
    { wch: 12 }, // Thứ
    { wch: 10 }, // Buổi
    { wch: 8 },  // Tiết
    { wch: 12 }, // Lớp
    { wch: 16 }, // Môn
    { wch: 12 }, // Phòng
    { wch: 25 }, // Ghi chú
  ];
  XLSX.utils.book_append_sheet(wb, wsList, 'TKB_DanhSach_vnEdu');

  // SHEET 3: HƯỚNG DẪN
  const guideRows: string[][] = [
    ['HƯỚNG DẪN NHẬP THỜI KHÓA BIỂU vnEdu VÀO CLASSGO'],
    ['1. Thầy cô có thể điền vào Sheet "TKB_Luoi_vnEdu" (dạng lưới tuần) hoặc "TKB_DanhSach_vnEdu" (dạng danh sách).'],
    ['2. Hệ thống ClassGo hỗ trợ nhận diện tự động cả 2 định dạng file xuất ra từ vnEdu hoặc SMAS.'],
    ['3. Ở Sheet dạng lưới: mỗi ô điền Tên lớp kèm môn hoặc phòng, VD: "10A1", "10A1 (Toán)", "10A1 - P.201".'],
    ['4. Sau khi điền xong, lưu file và bấm "Nhập từ Excel (.xlsx)" trên ClassGo để tự động xếp lịch!'],
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'HuongDan');

  XLSX.writeFile(wb, 'Mau_ThoiKhoaBieu_vnEdu_ClassGo.xlsx');
}

/**
 * =========================================================================================
 * 2. TẢI FILE MẪU EXCEL CHUẨN vnEdu: SỔ BÁO GIẢNG / LỊCH BÁO GIẢNG
 * =========================================================================================
 */
export function downloadVnEduTeachingPlanTemplate(classes?: ClassRoom[]) {
  const wb = XLSX.utils.book_new();

  const c1 = classes?.[0]?.name || '10A1';
  const c2 = classes?.[1]?.name || '10A2';

  const rows: (string | number)[][] = [
    ['SỞ GD&ĐT / PHÒNG GD&ĐT', '', '', '', '', '', '', '', '', ''],
    ['TRƯỜNG TRUNG HỌC CƠ SỞ / THPT', '', '', '', '', '', '', '', '', ''],
    ['LỊCH BÁO GIẢNG - KẾ HOẠCH DẠY HỌC BỘ MÔN (CHUẨN vnEdu / BỘ GD&ĐT)', '', '', '', '', '', '', '', '', ''],
    ['Năm học: 2025 - 2026 | Môn: Toán học | Giáo viên: .......................................', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    [
      'STT',
      'Tuần',
      'Thứ / Ngày',
      'Buổi',
      'Tiết TKB',
      'Lớp',
      'Môn học',
      'Tiết PPCT',
      'Tên bài dạy / Nội dung công việc',
      'Đồ dùng dạy học / Ghi chú',
    ],
    // Sample rows for Week 1
    [1, 1, 'Thứ Hai', 'Sáng', 1, c1, 'Toán học', 1, 'Mệnh đề toán học (Tiết 1)', 'Máy chiếu, SGK'],
    [2, 1, 'Thứ Hai', 'Sáng', 2, c1, 'Toán học', 2, 'Mệnh đề toán học (Tiết 2)', 'Phiếu học tập số 1'],
    [3, 1, 'Thứ Ba', 'Sáng', 2, c2, 'Toán học', 1, 'Mệnh đề toán học (Tiết 1)', 'Máy chiếu'],
    [4, 1, 'Thứ Ba', 'Sáng', 3, c1, 'Toán học', 3, 'Tập hợp và các phép toán trên tập hợp (Tiết 1)', 'Bảng phụ'],
    [5, 1, 'Thứ Tư', 'Sáng', 1, c1, 'Toán học', 4, 'Tập hợp và các phép toán trên tập hợp (Tiết 2)', 'Phiếu bài tập'],
    [6, 1, 'Thứ Năm', 'Sáng', 1, c2, 'Toán học', 2, 'Mệnh đề toán học (Tiết 2)', 'Thước kẻ, compa'],
    [7, 1, 'Thứ Năm', 'Sáng', 2, c2, 'Toán học', 3, 'Tập hợp (Tiết 1)', 'Phiếu học tập'],
    // Sample rows for Week 2
    [8, 2, 'Thứ Hai', 'Sáng', 1, c1, 'Toán học', 5, 'Các số đặc trưng đo xu thế trung tâm (Tiết 1)', 'Máy tính cầm tay'],
    [9, 2, 'Thứ Hai', 'Sáng', 2, c1, 'Toán học', 6, 'Các số đặc trưng đo xu thế trung tâm (Tiết 2)', 'Bảng số liệu thống kê'],
    [10, 2, 'Thứ Ba', 'Sáng', 2, c2, 'Toán học', 4, 'Tập hợp và các phép toán (Tiết 2)', 'SGK'],
    [11, 2, 'Thứ Ba', 'Sáng', 3, c1, 'Toán học', 7, 'Luyện tập chung chương I', 'Đề cương ôn tập'],
    [12, 2, 'Thứ Năm', 'Sáng', 1, c2, 'Toán học', 5, 'Số gần đúng và sai số (Tiết 1)', 'Máy chiếu'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 8 },  // Tuần
    { wch: 14 }, // Thứ/Ngày
    { wch: 10 }, // Buổi
    { wch: 10 }, // Tiết TKB
    { wch: 12 }, // Lớp
    { wch: 14 }, // Môn
    { wch: 12 }, // Tiết PPCT
    { wch: 45 }, // Tên bài dạy
    { wch: 30 }, // Ghi chú / ĐDDH
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'SoBaoGiang_vnEdu');

  // Sheet hướng dẫn
  const guideRows: string[][] = [
    ['HƯỚNG DẪN SỬ DỤNG SỔ BÁO GIẢNG vnEdu TRONG CLASSGO'],
    ['1. Thầy cô có thể xuất file Lịch báo giảng từ vnEdu về máy, rồi tải trực tiếp lên ClassGo.'],
    ['2. Hoặc điền vào file mẫu này: Cột "Tuần", "Lớp", "Tiết PPCT", "Tên bài dạy" là quan trọng nhất.'],
    ['3. ClassGo sẽ tự động lập tiến độ dạy học và gắn nút "Vào lớp" 1-click để kiểm tra bài cũ nhanh chóng.'],
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 85 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'HuongDan');

  XLSX.writeFile(wb, 'Mau_SoBaoGiang_vnEdu_ClassGo.xlsx');
}

/**
 * =========================================================================================
 * 3. XUẤT THỜI KHÓA BIỂU RA FILE EXCEL CHUẨN vnEdu
 * =========================================================================================
 */
export function exportTimetableToExcel(
  timetable: TimetableSlot[],
  schoolName = 'TRƯỜNG TRUNG HỌC PHỔ THÔNG / THCS',
  teacherName = 'Giáo viên bộ môn',
  semester = 'HỌC KỲ 1'
) {
  const wb = XLSX.utils.book_new();

  const getSlot = (day: number, period: number) => {
    return timetable.find((s) => s.dayOfWeek === day && s.period === period);
  };

  const rows: (string | number)[][] = [
    ['SỞ GD&ĐT / PHÒNG GD&ĐT', '', '', '', '', '', '', ''],
    [schoolName.toUpperCase(), '', '', '', '', '', '', ''],
    [`THỜI KHÓA BIỂU GIẢNG DẠY - ${semester.toUpperCase()}`, '', '', '', '', '', '', ''],
    [`Giáo viên: ${teacherName} | Tổng số tiết: ${timetable.length} tiết/tuần`, '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['Buổi', 'Tiết', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'],
  ];

  const PERIOD_LABELS = [
    { p: 1, session: 'Sáng' },
    { p: 2, session: 'Sáng' },
    { p: 3, session: 'Sáng' },
    { p: 4, session: 'Sáng' },
    { p: 5, session: 'Sáng' },
    { p: 6, session: 'Chiều' },
    { p: 7, session: 'Chiều' },
    { p: 8, session: 'Chiều' },
    { p: 9, session: 'Chiều' },
    { p: 10, session: 'Chiều' },
  ];

  PERIOD_LABELS.forEach(({ p, session }) => {
    const row: (string | number)[] = [session, p];
    for (let day = 2; day <= 7; day++) {
      const slot = getSlot(day, p);
      if (slot) {
        let cellText = `Lớp ${slot.className}`;
        if (slot.subject) cellText += ` (${slot.subject})`;
        if (slot.room) cellText += ` - ${slot.room}`;
        row.push(cellText);
      } else {
        row.push('');
      }
    }
    rows.push(row);
  });

  // Summary statistics
  const morningCount = timetable.filter((s) => s.period <= 5).length;
  const afternoonCount = timetable.filter((s) => s.period > 5).length;

  rows.push(['', '', '', '', '', '', '', '']);
  rows.push(['THỐNG KÊ SỐ TIẾT DẠY:', '', '', '', '', '', '', '']);
  rows.push([`- Tiết buổi sáng: ${morningCount} tiết`, '', '', '', '', '', '', '']);
  rows.push([`- Tiết buổi chiều: ${afternoonCount} tiết`, '', '', '', '', '', '', '']);
  rows.push([`- Tổng số tiết toàn tuần: ${timetable.length} tiết`, '', '', '', '', '', '', '']);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 10 },
    { wch: 8 },
    { wch: 26 },
    { wch: 26 },
    { wch: 26 },
    { wch: 26 },
    { wch: 26 },
    { wch: 26 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'ThoiKhoaBieu_vnEdu');
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `ThoiKhoaBieu_vnEdu_${dateStr}.xlsx`);
}

/**
 * =========================================================================================
 * 4. XUẤT SỔ BÁO GIẢNG RA FILE EXCEL CHUẨN vnEdu (Bộ GD&ĐT)
 * =========================================================================================
 */
export function exportTeachingPlanToExcel(
  plans: TeachingPlanItem[],
  schoolName = 'TRƯỜNG TRUNG HỌC PHỔ THÔNG / THCS',
  teacherName = 'Giáo viên bộ môn',
  semester = 'HỌC KỲ 1'
) {
  const wb = XLSX.utils.book_new();

  // Sort plans by week asc, then periodNumber asc
  const sorted = [...plans].sort((a, b) => {
    if (a.week !== b.week) return a.week - b.week;
    return a.periodNumber - b.periodNumber;
  });

  const rows: (string | number)[][] = [
    ['SỞ GD&ĐT / PHÒNG GD&ĐT', '', '', '', '', '', '', '', '', ''],
    [schoolName.toUpperCase(), '', '', '', '', '', '', '', '', ''],
    [`SỔ BÁO GIẢNG - TIẾN ĐỘ DẠY HỌC - ${semester.toUpperCase()}`, '', '', '', '', '', '', '', '', ''],
    [`Giáo viên: ${teacherName} | Tổng số: ${plans.length} tiết (${plans.filter((p) => p.isCompleted).length} đã dạy)`, '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    [
      'STT',
      'Tuần',
      'Lớp',
      'Tiết PPCT',
      'Tên bài dạy / Nội dung bài học',
      'Ghi chú / Thiết bị ĐDDH',
      'Trạng thái',
      'Ngày hoàn thành',
    ],
  ];

  sorted.forEach((item, idx) => {
    rows.push([
      idx + 1,
      `Tuần ${item.week}`,
      `Lớp ${item.className}`,
      item.periodNumber,
      item.lessonTitle,
      item.notes || '',
      item.isCompleted ? 'ĐÃ DẠY' : 'Chưa dạy',
      item.date || '',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 10 }, // Tuần
    { wch: 14 }, // Lớp
    { wch: 12 }, // Tiết PPCT
    { wch: 50 }, // Tên bài học
    { wch: 30 }, // Ghi chú
    { wch: 14 }, // Trạng thái
    { wch: 16 }, // Ngày
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'SoBaoGiang_vnEdu');
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `SoBaoGiang_vnEdu_${dateStr}.xlsx`);
}

/**
 * =========================================================================================
 * 5. ĐỌC FILE EXCEL THỜI KHÓA BIỂU (Tự động nhận diện Ma trận hoặc Danh sách vnEdu)
 * =========================================================================================
 */
export async function parseTimetableFromExcel(
  file: File,
  classes: ClassRoom[]
): Promise<{
  slots: TimetableSlot[];
  detectedFormat: 'MATRIX' | 'LIST';
  warnings: string[];
}> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });

  // Use the first sheet or the sheet with "TKB" or "Thời khóa biểu"
  const targetSheetName =
    wb.SheetNames.find((name) => /tkb|thời khóa biểu|thoi khoa bieu|matrix|luoi/i.test(name)) ||
    wb.SheetNames[0];

  const ws = wb.Sheets[targetSheetName];
  if (!ws) {
    throw new Error('Không tìm thấy bảng tính hợp lệ trong file Excel.');
  }

  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (rawRows.length < 2) {
    throw new Error('File Excel không có đủ dữ liệu.');
  }

  const warnings: string[] = [];
  const parsedSlots: TimetableSlot[] = [];

  // Check whether it is MATRIX format or LIST format
  let isMatrix = false;
  let matrixHeaderRowIndex = -1;
  const dayColMap: { [colIdx: number]: 2 | 3 | 4 | 5 | 6 | 7 } = {};

  for (let r = 0; r < Math.min(rawRows.length, 12); r++) {
    const row = rawRows[r];
    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c]).toLowerCase();
      if (/thứ 2|thứ hai|t2/i.test(cellVal)) {
        isMatrix = true;
        matrixHeaderRowIndex = r;
        break;
      }
    }
    if (isMatrix) break;
  }

  if (isMatrix && matrixHeaderRowIndex >= 0) {
    // MATRIX FORMAT: Find column indices for Thứ 2 -> Thứ 7
    const headerRow = rawRows[matrixHeaderRowIndex];
    headerRow.forEach((cell: any, cIdx: number) => {
      const day = parseVietnameseDay(cell);
      if (day) {
        dayColMap[cIdx] = day;
      }
    });

    let currentSession: 'Sáng' | 'Chiều' = 'Sáng';

    for (let r = matrixHeaderRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      // Detect session text (Sáng / Chiều)
      const firstColText = normalizeStr(row[0]);
      if (firstColText.includes('chiều') || firstColText.includes('chieu')) {
        currentSession = 'Chiều';
      } else if (firstColText.includes('sáng') || firstColText.includes('sang')) {
        currentSession = 'Sáng';
      }

      // Check period number (usually in col 0 or 1)
      let periodNum: number | null = null;
      for (let c = 0; c <= 2; c++) {
        const val = row[c];
        const p = parsePeriodNumber(val, currentSession);
        if (p) {
          periodNum = p;
          break;
        }
      }

      if (!periodNum) continue;

      // Read day columns
      Object.entries(dayColMap).forEach(([cIdxStr, dayOfWeek]) => {
        const cIdx = parseInt(cIdxStr, 10);
        const cellRaw = String(row[cIdx] || '').trim();
        if (!cellRaw || cellRaw === '-' || cellRaw === 'x') return;

        // Skip non-class slots like "Chào cờ", "Sinh hoạt lớp" if desired or map them
        // Parse cell content: "10A1 (Toán) - P.201" or "10A1" or "Lớp 10A1"
        const parts = cellRaw.split(/[-–()]/);
        const classNameRaw = parts[0]?.trim() || cellRaw;
        const matched = matchClass(classNameRaw, classes);

        let subject = 'Toán học';
        if (cellRaw.includes('(')) {
          const subMatch = cellRaw.match(/\(([^)]+)\)/);
          if (subMatch) subject = subMatch[1].trim();
        }

        let room = '';
        const roomMatch = cellRaw.match(/p\.?\s*\d+|phòng\s*\d+/i);
        if (roomMatch) room = roomMatch[0].trim();

        parsedSlots.push({
          id: `slot-imp-${dayOfWeek}-${periodNum}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          dayOfWeek,
          period: periodNum!,
          classId: matched.classId,
          className: matched.className,
          subject,
          room: room || undefined,
          note: cellRaw !== matched.className ? cellRaw : undefined,
        });
      });
    }

    return {
      slots: parsedSlots,
      detectedFormat: 'MATRIX',
      warnings,
    };
  }

  // LIST FORMAT: Look for header row with 'Thứ', 'Tiết', 'Lớp'
  let listHeaderIndex = -1;
  let dayCol = -1;
  let periodCol = -1;
  let classCol = -1;
  let subjectCol = -1;
  let roomCol = -1;
  let noteCol = -1;
  let sessionCol = -1;

  for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
    const row = rawRows[r];
    for (let c = 0; c < row.length; c++) {
      const headerText = normalizeStr(row[c]);
      if (/thứ|thu|day/i.test(headerText) && dayCol === -1) dayCol = c;
      if (/tiết|tiet|period/i.test(headerText) && periodCol === -1) periodCol = c;
      if (/lớp|lop|class/i.test(headerText) && classCol === -1) classCol = c;
      if (/môn|mon|subject/i.test(headerText) && subjectCol === -1) subjectCol = c;
      if (/phòng|phong|room/i.test(headerText) && roomCol === -1) roomCol = c;
      if (/ghi chú|ghi chu|note/i.test(headerText) && noteCol === -1) noteCol = c;
      if (/buổi|buoi|session/i.test(headerText) && sessionCol === -1) sessionCol = c;
    }
    if (dayCol !== -1 && periodCol !== -1 && classCol !== -1) {
      listHeaderIndex = r;
      break;
    }
  }

  if (listHeaderIndex >= 0) {
    for (let r = listHeaderIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const dayRaw = row[dayCol];
      const day = parseVietnameseDay(dayRaw);
      if (!day) continue;

      const sessionRaw = sessionCol !== -1 ? row[sessionCol] : '';
      const periodRaw = row[periodCol];
      const period = parsePeriodNumber(periodRaw, sessionRaw);
      if (!period) continue;

      const classRaw = String(row[classCol] || '').trim();
      if (!classRaw) continue;

      const matched = matchClass(classRaw, classes);
      const subject = subjectCol !== -1 && row[subjectCol] ? String(row[subjectCol]).trim() : 'Toán học';
      const room = roomCol !== -1 && row[roomCol] ? String(row[roomCol]).trim() : undefined;
      const note = noteCol !== -1 && row[noteCol] ? String(row[noteCol]).trim() : undefined;

      parsedSlots.push({
        id: `slot-list-${day}-${period}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        dayOfWeek: day,
        period,
        classId: matched.classId,
        className: matched.className,
        subject,
        room,
        note,
      });
    }

    return {
      slots: parsedSlots,
      detectedFormat: 'LIST',
      warnings,
    };
  }

  throw new Error(
    'Không nhận diện được định dạng Thời khóa biểu vnEdu. Vui lòng sử dụng file mẫu chuẩn của hệ thống hoặc xuất file TKB từ vnEdu.'
  );
}

/**
 * =========================================================================================
 * 6. ĐỌC FILE EXCEL SỔ BÁO GIẢNG (vnEdu / Kế hoạch dạy học)
 * =========================================================================================
 */
export async function parseTeachingPlanFromExcel(
  file: File,
  classes: ClassRoom[]
): Promise<{
  items: TeachingPlanItem[];
  warnings: string[];
}> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });

  const targetSheetName =
    wb.SheetNames.find((name) => /báo giảng|bao giang|kế hoạch|ke hoach|tiến độ|tien do/i.test(name)) ||
    wb.SheetNames[0];

  const ws = wb.Sheets[targetSheetName];
  if (!ws) {
    throw new Error('Không tìm thấy bảng tính hợp lệ trong file Excel.');
  }

  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (rawRows.length < 2) {
    throw new Error('File Excel không có đủ dữ liệu.');
  }

  // Find column headers
  let headerRowIndex = -1;
  let weekCol = -1;
  let classCol = -1;
  let ppctCol = -1;
  let titleCol = -1;
  let noteCol = -1;
  let statusCol = -1;

  for (let r = 0; r < Math.min(rawRows.length, 12); r++) {
    const row = rawRows[r];
    for (let c = 0; c < row.length; c++) {
      const headerText = normalizeStr(row[c]);
      if (/tuần|tuan|week/i.test(headerText) && weekCol === -1) weekCol = c;
      if (/lớp|lop|class/i.test(headerText) && classCol === -1) classCol = c;
      if ((/ppct|tiết ppct|tiết theo ppct|tiết|tiet/i.test(headerText)) && ppctCol === -1) ppctCol = c;
      if ((/tên bài|ten bai|bài dạy|bai day|nội dung|noi dung|bài học|lesson/i.test(headerText)) && titleCol === -1) titleCol = c;
      if ((/ghi chú|ghi chu|đồ dùng|do dung|thiết bị|thiet bi|note/i.test(headerText)) && noteCol === -1) noteCol = c;
      if ((/trạng thái|trang thai|hoàn thành|hoan thanh|status/i.test(headerText)) && statusCol === -1) statusCol = c;
    }

    if (classCol !== -1 && titleCol !== -1) {
      headerRowIndex = r;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(
      'Không nhận diện được các cột tiêu đề của Sổ báo giảng vnEdu (Cần có ít nhất cột: Lớp và Tên bài dạy).'
    );
  }

  const items: TeachingPlanItem[] = [];
  const warnings: string[] = [];
  let currentWeek = 1;

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    // Extract Week
    if (weekCol !== -1 && row[weekCol]) {
      const weekMatch = String(row[weekCol]).match(/\d+/);
      if (weekMatch) {
        currentWeek = parseInt(weekMatch[0], 10);
      }
    }

    // Extract Class
    const classRaw = String(row[classCol] || '').trim();
    if (!classRaw) continue;
    const matched = matchClass(classRaw, classes);

    // Extract Lesson Title
    const titleRaw = String(row[titleCol] || '').trim();
    if (!titleRaw) continue;

    // Extract PPCT Period Number
    let periodNum = items.length + 1;
    if (ppctCol !== -1 && row[ppctCol]) {
      const pMatch = String(row[ppctCol]).match(/\d+/);
      if (pMatch) periodNum = parseInt(pMatch[0], 10);
    }

    // Extract Notes
    const noteText = noteCol !== -1 && row[noteCol] ? String(row[noteCol]).trim() : undefined;

    // Extract completed status
    let isCompleted = false;
    if (statusCol !== -1 && row[statusCol]) {
      const st = normalizeStr(row[statusCol]);
      isCompleted = st.includes('đã') || st.includes('da') || st.includes('xong') || st === 'true' || st === '1';
    }

    items.push({
      id: `plan-imp-${Date.now()}-${r}-${Math.random().toString(36).substring(2, 6)}`,
      week: currentWeek,
      classId: matched.classId,
      className: matched.className,
      periodNumber: periodNum,
      lessonTitle: titleRaw,
      notes: noteText,
      isCompleted,
    });
  }

  if (items.length === 0) {
    throw new Error('Không tìm thấy dòng bài dạy nào hợp lệ trong file Excel.');
  }

  return { items, warnings };
}
