import * as XLSX from 'xlsx';
import {
  ClassRoom,
  TimetableSlot,
  TeachingPlanItem,
  PpctItem,
  DayOffItem,
  ScheduleGenerationConfig,
} from '../types';
import { getSamplePpctForGrade, SAMPLE_PPCT_GRADE_7, SAMPLE_PPCT_GRADE_8, SAMPLE_PPCT_GRADE_10 } from './samplePpctData';
import { extractGradeFromClassName } from '../services/reviewQuestionService';
export { extractGradeFromClassName };

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

/**
 * Chuẩn hóa tên môn học tương đương:
 * - Toán / Toán học / Toán 7 / Toán 8 -> 'Toán'
 * - GDĐP / GD DP / Giáo dục địa phương -> 'GDĐP'
 * - HĐTN / HĐTN&HN / Hoạt động trải nghiệm, hướng nghiệp -> 'HĐTN&HN'
 * - Các môn khác giữ nguyên tên gốc
 */
export function normalizeSubjectName(raw?: string): string {
  if (!raw) return 'Toán';
  const s = String(raw).trim();
  const lower = s.toLowerCase();

  // Toán / Toán học / Toán 7 / Toán 8...
  if (
    /^(toán|toan)(\s+học|\s+hoc)?(\s+\d+)?$/i.test(s) ||
    lower === 'toán' ||
    lower === 'toan' ||
    lower === 'toán học' ||
    lower === 'toan hoc'
  ) {
    return 'Toán';
  }

  // GDĐP / GD DP / Giáo dục địa phương / GDĐP 7 / GDĐP 8...
  if (
    /^(gdđp|gddp|gd\s*đp|gd\s*dp)(\s+\d+)?$/i.test(s) ||
    /giáo dục địa phương|giao duc dia phuong/i.test(lower)
  ) {
    return 'GDĐP';
  }

  // HĐTN / HĐTN&HN / HĐTN & HN / Hoạt động trải nghiệm / Hoạt động trải nghiệm, hướng nghiệp...
  if (
    /^(hđtn|hdtn|hđtn\s*&\s*hn|hdtn\s*&\s*hn|hđtn&hn|hdtn&hn)(\s+\d+)?$/i.test(s) ||
    /hoạt động trải nghiệm|hoat dong trai nghiem/i.test(lower)
  ) {
    return 'HĐTN&HN';
  }

  return s;
}

/**
 * Chuẩn hóa tên lớp học: xử lý các tiền tố như Lớp, Lop, Class
 */
export function normalizeClassName(raw: string): string {
  if (!raw) return '';
  let s = String(raw).trim();
  s = s.replace(/^(lớp|lop|class)\s*/i, '').trim();
  return s;
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

/**
 * Khớp tên lớp an toàn tuyệt đối:
 * - Chuẩn hóa "7.1", "7/1", "7-1" tương thích với "7A1", "7.1"
 * - Không tự ý gán bừa vào classes[0] làm sai lệch danh sách học sinh
 */
export function matchClass(classNameRaw: string, classes: ClassRoom[]): { classId: string; className: string } {
  const raw = String(classNameRaw || '').trim();
  if (!raw) {
    return { classId: classes[0]?.id || 'class-default', className: classes[0]?.name || 'Lớp học' };
  }

  const cleanRaw = raw.replace(/^(lớp|lop|class)\s*/i, '').trim().toLowerCase();

  // 1. Exact match
  const exact = classes.find((c) => {
    const cClean = c.name.replace(/^(lớp|lop|class)\s*/i, '').trim().toLowerCase();
    return cClean === cleanRaw || c.name.toLowerCase() === raw.toLowerCase();
  });
  if (exact) {
    return { classId: exact.id, className: exact.name };
  }

  // 2. Numeric dot/slash normalization: "7.1", "7/1", "7-1" <-> "7A1", "7.1"
  const dotSlashMatch = cleanRaw.match(/^(\d+)[./-](\d+)$/);
  if (dotSlashMatch) {
    const grade = dotSlashMatch[1];
    const secNum = parseInt(dotSlashMatch[2], 10);
    const candidates = [
      `${grade}a${secNum}`,
      `${grade}a0${secNum}`,
      `${grade}.${secNum}`,
      `${grade}/${secNum}`,
      `${grade}-${secNum}`,
    ];
    const found = classes.find((c) => {
      const cClean = c.name.replace(/^(lớp|lop|class)\s*/i, '').trim().toLowerCase();
      return candidates.includes(cClean);
    });
    if (found) {
      return { classId: found.id, className: found.name };
    }
  }

  // Inverse: raw is "7a1" or "7a01" but class name is "7.1"
  const alphaMatch = cleanRaw.match(/^(\d+)[a-z](\d+)$/);
  if (alphaMatch) {
    const grade = alphaMatch[1];
    const secNum = parseInt(alphaMatch[2], 10);
    const candidates = [`${grade}.${secNum}`, `${grade}/${secNum}`, `${grade}-${secNum}`];
    const found = classes.find((c) => {
      const cClean = c.name.replace(/^(lớp|lop|class)\s*/i, '').trim().toLowerCase();
      return candidates.includes(cClean);
    });
    if (found) {
      return { classId: found.id, className: found.name };
    }
  }

  // 3. Partial substring match
  if (cleanRaw.length >= 3) {
    const partial = classes.find((c) => {
      const cClean = c.name.replace(/^(lớp|lop|class)\s*/i, '').trim().toLowerCase();
      return cClean === cleanRaw || cClean.includes(cleanRaw) || cleanRaw.includes(cClean);
    });
    if (partial) {
      return { classId: partial.id, className: partial.name };
    }
  }

  // 4. Safe fallback: use the cleaned raw class name as its own identifier,
  // do NOT force to classes[0] to prevent cross-class contamination!
  const fallbackClean = raw.replace(/^(lớp|lop|class)\s*/i, '').trim();
  return {
    classId: `auto-cls-${fallbackClean.toLowerCase().replace(/[^a-z0-9]/g, '') || Date.now()}`,
    className: fallbackClean || 'Lớp học',
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
    ['SỞ GD&ĐT / PHÒNG GD&ĐT', '', '', '', '', '', '', '', '', '', ''],
    [schoolName.toUpperCase(), '', '', '', '', '', '', '', '', '', ''],
    [`SỔ BÁO GIẢNG - TIẾN ĐỘ DẠY HỌC - ${semester.toUpperCase()}`, '', '', '', '', '', '', '', '', '', ''],
    [`Giáo viên: ${teacherName} | Tổng số: ${plans.length} tiết (${plans.filter((p) => p.isCompleted).length} đã dạy)`, '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', ''],
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
      'Ghi chú / ĐDDH',
      'Trạng thái',
    ],
  ];

  sorted.forEach((item, idx) => {
    const dayLabel = item.dayOfWeek ? `Thứ ${item.dayOfWeek}` : '';
    const dateLabel = item.date ? (dayLabel ? `${dayLabel} (${item.date})` : item.date) : dayLabel;
    const sessionLabel = item.session || (item.period && item.period > 5 ? 'Chiều' : 'Sáng');

    let statusText = 'Chưa dạy';
    if (item.isCompleted) {
      statusText = item.isMakeup ? 'ĐÃ DẠY (BÙ)' : 'ĐÃ DẠY';
    } else if (item.isMakeup) {
      statusText = 'DẠY BÙ';
    } else if (item.isOffDay) {
      statusText = 'TIẾT NGHỈ';
    }

    let noteText = item.notes || '';
    if (item.isMakeup && item.makeupReason && !noteText.includes('[DẠY BÙ]')) {
      noteText = `[DẠY BÙ: ${item.makeupReason}] ${noteText}`.trim();
    } else if (item.isOffDay && item.offReason && !noteText.includes('[NGHỈ]')) {
      noteText = `[NGHỈ: ${item.offReason}] ${noteText}`.trim();
    }

    rows.push([
      idx + 1,
      `Tuần ${item.week}`,
      dateLabel || '—',
      sessionLabel,
      item.period ? `Tiết ${item.period}` : '—',
      `Lớp ${item.className}`,
      item.subject || 'Toán học',
      item.isOffDay ? 'NGHỈ' : item.periodNumber,
      item.lessonTitle,
      noteText,
      statusText,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 10 }, // Tuần
    { wch: 22 }, // Thứ/Ngày
    { wch: 10 }, // Buổi
    { wch: 10 }, // Tiết TKB
    { wch: 12 }, // Lớp
    { wch: 14 }, // Môn
    { wch: 12 }, // Tiết PPCT
    { wch: 45 }, // Tên bài học
    { wch: 25 }, // Ghi chú
    { wch: 14 }, // Trạng thái
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

        let subject = 'Toán';
        if (cellRaw.includes('(')) {
          const subMatch = cellRaw.match(/\(([^)]+)\)/);
          if (subMatch) subject = normalizeSubjectName(subMatch[1]);
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
      const rawSub = subjectCol !== -1 && row[subjectCol] ? String(row[subjectCol]).trim() : '';
      const subject = rawSub ? normalizeSubjectName(rawSub) : 'Toán';
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

/**
 * =========================================================================================
 * 7. TẢI FILE MẪU EXCEL CHUẨN: PHÂN PHỐI CHƯƠNG TRÌNH (PPCT)
 * =========================================================================================
 */
export function buildPpctTemplateWorkbook() {
  const wb = XLSX.utils.book_new();

  // SHEET 1: PPCT (Mẫu chung mọi môn, mọi khối với đúng thứ tự 6 cột)
  const ppctRows: (string | number)[][] = [
    ['Tiết PPCT', 'Khối', 'Môn học', 'Tên bài dạy', 'Học kỳ', 'Ghi chú'],
  ];
  const wsPpct = XLSX.utils.aoa_to_sheet(ppctRows);
  wsPpct['!cols'] = [
    { wch: 12 }, // Tiết PPCT
    { wch: 10 }, // Khối
    { wch: 16 }, // Môn học
    { wch: 45 }, // Tên bài dạy
    { wch: 12 }, // Học kỳ
    { wch: 32 }, // Ghi chú
  ];
  XLSX.utils.book_append_sheet(wb, wsPpct, 'PPCT');

  // SHEET 2: VI_DU_KHONG_NHAP (Dữ liệu mẫu tham khảo minh họa đa môn, đa khối)
  const exampleRows: (string | number)[][] = [
    ['Tiết PPCT', 'Khối', 'Môn học', 'Tên bài dạy', 'Học kỳ', 'Ghi chú'],
    [1, '7', 'Toán', 'Tập hợp các số hữu tỉ', 'Học kỳ 1', 'Bài 1 chương I'],
    [2, '7', 'Toán', 'Cộng, trừ số hữu tỉ', 'Học kỳ 1', 'Bài 2'],
    [1, '7', 'GDĐP', 'Chủ đề 1: Bảo tồn, phát huy giá trị di sản Thành Nhà Hồ', 'Học kỳ 1', 'Tiết 1'],
    [1, '7', 'HĐTN&HN', 'Chủ đề 1: Rèn luyện thói quen', 'Học kỳ 1', 'Tiết 1'],
    [1, '8', 'Toán', 'Đơn thức', 'Học kỳ 1', 'Bài 1 chương I'],
    [1, '8', 'GDĐP', 'Chủ đề 1: Danh lam thắng cảnh quê hương', 'Học kỳ 1', 'Tiết 1'],
    [1, '9', 'Ngữ văn', 'Bài 1: Khát vọng sống', 'Học kỳ 1', 'Tiết 1'],
  ];
  const wsExample = XLSX.utils.aoa_to_sheet(exampleRows);
  wsExample['!cols'] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 16 },
    { wch: 55 },
    { wch: 12 },
    { wch: 32 },
  ];
  XLSX.utils.book_append_sheet(wb, wsExample, 'VI_DU_KHONG_NHAP');

  // SHEET 3: HUONG_DAN (Hướng dẫn sử dụng)
  const guideRows: string[][] = [
    ['HƯỚNG DẪN NHẬP PHÂN PHỐI CHƯƠNG TRÌNH (PPCT) TRONG CLASSGO'],
    ['1. File mẫu này dùng chung cho TẤT CẢ các môn học và khối lớp (Toán, GDĐP, HĐTN&HN, Ngữ văn, KHTN...).'],
    ['2. Thầy cô điền danh sách bài dạy vào sheet "PPCT" theo đúng 6 cột: Tiết PPCT, Khối, Môn học, Tên bài dạy, Học kỳ, Ghi chú.'],
    ['3. Cột "Khối": Điền số khối (VD: 6, 7, 8, 9, 10, 11, 12). Hệ thống tự dùng chung cho các lớp cùng khối.'],
    ['4. Cột "Môn học": Điền tên môn học (Toán, GDĐP, HĐTN&HN...). Hệ thống tự chuẩn hóa tên môn tương đương.'],
    ['5. Tiết PPCT số 1 của các môn khác nhau hoàn toàn độc lập, hệ thống phân biệt chính xác theo Khối + Môn học + Tiết PPCT.'],
    ['6. Sheet "VI_DU_KHONG_NHAP" và "HUONG_DAN" chỉ để tham khảo, phần mềm ClassGo tự động bỏ qua khi nạp file.'],
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 95 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'HUONG_DAN');

  return wb;
}

export function downloadVnEduPpctTemplate(_classes?: ClassRoom[]) {
  XLSX.writeFile(buildPpctTemplateWorkbook(), 'Mau_PPCT_Chung_Moi_Mon_ClassGo.xlsx');
}

/**
 * =========================================================================================
 * 8. TẢI FILE MẪU EXCEL TỔNG HỢP: TKB + PPCT + NGÀY NGHỈ (3 TRONG 1)
 * =========================================================================================
 */
export function downloadCombinedTimetableAndPpctTemplate(classes?: ClassRoom[]) {
  const wb = XLSX.utils.book_new();

  const c1 = classes?.[0]?.name || '7A1';
  const c2 = classes?.[1]?.name || '7A2';
  const grade1 = extractGradeFromClassName(c1) || '7';

  // SHEET 1: MA TRẬN TKB
  const matrixRows: (string | number)[][] = [
    ['THỜI KHÓA BIỂU GIẢNG DẠY (CHUẨN vnEdu / SMAS)', '', '', '', '', '', '', ''],
    ['Năm học: 2025 - 2026 | Môn: Toán học', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['Buổi', 'Tiết', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'],
    ['Sáng', 1, `${c1} (Toán) - P.201`, '', `${c1} (Toán)`, `${c2} (Toán)`, '', 'Chào cờ'],
    ['Sáng', 2, `${c1} (Toán) - P.201`, `${c2} (Toán)`, '', `${c2} (Toán)`, `${c1} (Toán)`, ''],
    ['Sáng', 3, `${c2} (Toán) - P.202`, `${c1} (Toán)`, `${c2} (Toán)`, '', `${c2} (Toán)`, ''],
    ['Sáng', 4, '', '', `${c1} (Toán)`, `${c1} (Toán)`, '', ''],
    ['Sáng', 5, '', '', '', '', '', 'Sinh hoạt lớp'],
    ['Chiều', 6, '', '', '', '', '', ''],
    ['Chiều', 7, '', '', '', '', '', ''],
    ['Chiều', 8, '', '', '', '', '', ''],
    ['Chiều', 9, '', '', '', '', '', ''],
    ['Chiều', 10, '', '', '', '', '', ''],
  ];
  const wsMatrix = XLSX.utils.aoa_to_sheet(matrixRows);
  wsMatrix['!cols'] = [
    { wch: 10 },
    { wch: 8 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsMatrix, '1_ThoiKhoaBieu');

  // SHEET 2: PPCT THEO KHỐI
  const ppctRows: (string | number)[][] = [
    ['PHÂN PHỐI CHƯƠNG TRÌNH MÔN TOÁN (DÙNG CHUNG CHO CÁC LỚP CÙNG KHỐI)', '', '', '', ''],
    ['Tiết PPCT', 'Khối lớp', 'Môn học', 'Tên bài dạy / Nội dung bài học', 'Ghi chú'],
  ];
  SAMPLE_PPCT_GRADE_7.slice(0, 30).forEach((item) => {
    ppctRows.push([
      item.periodNumber,
      `Khối ${grade1}`,
      item.subject || 'Toán học',
      item.lessonTitle,
      item.notes || '',
    ]);
  });
  const wsPpct = XLSX.utils.aoa_to_sheet(ppctRows);
  wsPpct['!cols'] = [
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 45 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPpct, '2_PhanPhoiChuongTrinh');

  // SHEET 3: NGÀY NGHỈ / LỄ
  const offRows: (string | number)[][] = [
    ['DANH SÁCH NGÀY NGHỈ LỄ & TIẾT NGHỈ DỰ KIẾN (TỰ ĐỘNG DỜI TIẾT)', '', '', ''],
    ['Ngày (YYYY-MM-DD)', 'Tên ngày nghỉ / Lý do', 'Nghỉ cả ngày (CÓ/KHÔNG)', 'Tiết nghỉ (Nếu chỉ nghỉ 1 số tiết)'],
    ['2025-09-02', 'Nghỉ Lễ Quốc Khánh 2/9', 'CÓ', ''],
    ['2025-11-20', 'Ngày Nhà giáo Việt Nam 20/11', 'CÓ', ''],
    ['2026-01-01', 'Nghỉ Tết Dương Lịch', 'CÓ', ''],
  ];
  const wsOff = XLSX.utils.aoa_to_sheet(offRows);
  wsOff['!cols'] = [
    { wch: 18 },
    { wch: 35 },
    { wch: 24 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsOff, '3_NgayNghi');

  XLSX.writeFile(wb, 'Mau_TongHop_TKB_PPCT_NgayNghi_ClassGo.xlsx');
}

/**
 * =========================================================================================
 * 9. ĐỌC FILE EXCEL PHÂN PHỐI CHƯƠNG TRÌNH (PPCT)
 * =========================================================================================
 */
export async function parsePpctFromExcel(
  file: File
): Promise<{
  items: PpctItem[];
  warnings: string[];
}> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });

  // Filter out guidance/example sheets to avoid importing sample rows
  const validSheetNames = wb.SheetNames.filter(
    (name) => !/vi_du|ví dụ|huong_dan|hướng dẫn|sample|example|guide|huongdan/i.test(name)
  );

  // Look for sheet with "ppct" or "phân phối" or "kế hoạch" or fallback to first valid sheet
  const targetSheetName =
    validSheetNames.find((name) => /ppct|phân phối|phan phoi|kế hoạch|ke hoach|chương trình/i.test(name)) ||
    validSheetNames[0] ||
    wb.SheetNames[0];

  const ws = wb.Sheets[targetSheetName];
  if (!ws) {
    throw new Error('Không tìm thấy bảng tính phân phối chương trình hợp lệ.');
  }

  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (rawRows.length < 2) {
    throw new Error('File Excel PPCT không có đủ dữ liệu.');
  }

  // Detect header row
  let headerRowIndex = -1;
  let ppctCol = -1;
  let titleCol = -1;
  let gradeCol = -1;
  let subjectCol = -1;
  let semesterCol = -1;
  let noteCol = -1;

  for (let r = 0; r < Math.min(rawRows.length, 12); r++) {
    const row = rawRows[r];
    for (let c = 0; c < row.length; c++) {
      const headerText = normalizeStr(row[c]);
      if (/tiết|tiet|stt|ppct/i.test(headerText) && ppctCol === -1) ppctCol = c;
      if (/tên bài|ten bai|bài dạy|bai day|nội dung|noi dung|bài học|lesson/i.test(headerText) && titleCol === -1) titleCol = c;
      if (/khối|khoi|lớp|lop|grade/i.test(headerText) && gradeCol === -1) gradeCol = c;
      if (/môn|mon|subject/i.test(headerText) && subjectCol === -1) subjectCol = c;
      if (/học kỳ|hoc ky|hk/i.test(headerText) && semesterCol === -1) semesterCol = c;
      if (/ghi chú|ghi chu|thiết bị|thiet bi|đồ dùng|do dung|note|nguồn|nguon/i.test(headerText) && noteCol === -1) noteCol = c;
    }

    if (ppctCol !== -1 && titleCol !== -1) {
      headerRowIndex = r;
      break;
    }
  }

  // If no labeled header row found, assume col 0 is period number and col 1 is title
  if (headerRowIndex === -1) {
    for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
      const col0 = parseInt(String(rawRows[r][0] || '').match(/\d+/)?.[0] || '0', 10);
      const col1 = String(rawRows[r][1] || '').trim();
      if (col0 >= 1 && col1.length >= 3) {
        headerRowIndex = r - 1;
        ppctCol = 0;
        titleCol = 1;
        break;
      }
    }
  }

  if (headerRowIndex === -1 && titleCol === -1) {
    throw new Error(
      'Không nhận diện được cột Tiết PPCT và Tên bài dạy trong file. Vui lòng kiểm tra lại định dạng file mẫu.'
    );
  }

  const items: PpctItem[] = [];
  const warnings: string[] = [];
  const seenMap = new Set<string>();

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    // Period number
    let periodNum = items.length + 1;
    if (ppctCol !== -1 && row[ppctCol] !== undefined && row[ppctCol] !== '') {
      const pMatch = String(row[ppctCol]).match(/\d+/);
      if (pMatch) periodNum = parseInt(pMatch[0], 10);
    }

    // Title
    const titleRaw = titleCol !== -1 ? String(row[titleCol] || '').trim() : '';
    if (!titleRaw) continue;

    // Grade
    let grade = '7';
    if (gradeCol !== -1 && row[gradeCol]) {
      const gMatch = String(row[gradeCol]).match(/\d+/);
      if (gMatch) grade = gMatch[0];
    }

    // Subject: Normalized canonical subject
    const rawSub = subjectCol !== -1 && row[subjectCol] !== undefined ? String(row[subjectCol]).trim() : '';
    const subject = rawSub ? normalizeSubjectName(rawSub) : 'Toán';

    // Semester: Do not invent semester if not provided
    let semester: '1' | '2' | 'ALL' | undefined = undefined;
    if (semesterCol !== -1 && row[semesterCol] !== undefined && row[semesterCol] !== '') {
      const semStr = normalizeStr(row[semesterCol]);
      if (semStr.includes('1') || (semStr.includes('i') && !semStr.includes('ii'))) {
        semester = '1';
      } else if (semStr.includes('2') || semStr.includes('ii')) {
        semester = '2';
      } else if (semStr.includes('all') || semStr.includes('cả năm') || semStr.includes('ca nam')) {
        semester = 'ALL';
      }
    }

    const notes = noteCol !== -1 && row[noteCol] ? String(row[noteCol]).trim() : undefined;

    // Deduplicate strictly by: Khối + Môn học + Tiết PPCT
    const key = `${grade}__${subject.toLowerCase()}__${periodNum}`;
    if (seenMap.has(key)) {
      warnings.push(`Tiết PPCT số ${periodNum} của Khối ${grade} (môn ${subject}) bị trùng ở dòng ${r + 1}. Đã bỏ qua dòng trùng.`);
      continue;
    }
    seenMap.add(key);

    items.push({
      id: `ppct-imp-${grade}-${subject.toLowerCase().replace(/[^a-z0-9]/g, '')}-${periodNum}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      periodNumber: periodNum,
      lessonTitle: titleRaw,
      grade,
      subject,
      semester,
      notes,
    });
  }

  if (items.length === 0) {
    throw new Error('Không tìm thấy danh sách bài học nào trong file PPCT.');
  }

  // Sort items by grade, then subject, then periodNumber asc
  items.sort((a, b) => {
    if ((a.grade || '') !== (b.grade || '')) {
      return Number(a.grade || 0) - Number(b.grade || 0);
    }
    if ((a.subject || '') !== (b.subject || '')) {
      return (a.subject || '').localeCompare(b.subject || '');
    }
    return a.periodNumber - b.periodNumber;
  });

  return { items, warnings };
}

export interface MissingPpctInfo {
  classId: string;
  className: string;
  subject: string;
  grade: string;
}

/**
 * =========================================================================================
 * 10. THUẬT TOÁN TỰ ĐỘNG SINH SỔ BÁO GIẢNG (TKB + PPCT + QUẢN LÝ NGÀY NGHỈ + DẠY BÙ)
 * =========================================================================================
 * - Giữ nguyên tuyệt đối các tiết đã đánh dấu "Đã dạy" (isCompleted === true), bao gồm tiết dạy bù.
 * - Quản lý PPCT độc lập theo từng lớp và môn học; nhiều lớp cùng khối có tiến độ riêng biệt.
 * - Không làm mất, bỏ qua, nhân đôi hoặc đảo thứ tự tiết PPCT.
 * - Không dùng PPCT Toán 7 thay cho môn/khối khác khi thiếu dữ liệu (cảnh báo rõ ràng).
 * - Tự động dời bài chưa dạy qua tiết sau khi gặp ngày nghỉ hoặc tiết nghỉ đột xuất.
 */
export function generateTeachingPlanFromTimetable({
  timetable,
  ppctItems,
  dayOffs,
  config,
  existingPlan = [],
  classes = [],
}: {
  timetable: TimetableSlot[];
  ppctItems: PpctItem[];
  dayOffs: DayOffItem[];
  config: ScheduleGenerationConfig;
  existingPlan?: TeachingPlanItem[];
  classes?: ClassRoom[];
}): {
  generatedPlan: TeachingPlanItem[];
  stats: {
    totalSlots: number;
    assignedLessons: number;
    offSlotsCount: number;
    makeupSlotsCount: number;
    completedPreservedCount: number;
    classStats: { [className: string]: { totalSlots: number; lessonsAssigned: number; offCount: number; makeupCount: number } };
  };
  warnings: string[];
  missingPpctClasses: MissingPpctInfo[];
} {
  const warnings: string[] = [];
  const missingPpctClasses: MissingPpctInfo[] = [];

  if (timetable.length === 0) {
    throw new Error('Thời khóa biểu chưa có tiết học nào. Vui lòng xếp hoặc nhập TKB trước khi sinh Sổ báo giảng.');
  }

  // Helper to normalize strings for comparison
  const norm = (s: any) => normalizeStr(s);

  // 1. Phân loại danh sách lớp & môn học duy nhất có trong TKB
  interface ClassSubjectKeyInfo {
    key: string;
    classId: string;
    className: string;
    subject: string;
    grade: string;
  }

  const classSubjectMap = new Map<string, ClassSubjectKeyInfo>();

  timetable.forEach((slot) => {
    const foundCls = classes.find((c) => c.id === slot.classId);
    const clsName = foundCls ? foundCls.name : slot.className;
    const grade = extractGradeFromClassName(clsName) || '';
    const subject = normalizeSubjectName(slot.subject || foundCls?.subject || 'Toán');
    const key = `${slot.classId}__${subject.toLowerCase()}`;

    if (!classSubjectMap.has(key)) {
      classSubjectMap.set(key, {
        key,
        classId: slot.classId,
        className: clsName,
        subject,
        grade,
      });
    }
  });

  // 2. Tìm nguồn PPCT phù hợp cho từng (Lớp, Môn học, Khối)
  // ƯU TIÊN: 1. PPCT riêng theo Lớp -> 2. PPCT theo Khối & Môn -> 3. PPCT mẫu chuẩn GDPT 2018 (chỉ khi đúng môn Toán 7,8,10)
  interface ClassSubjectState {
    key: string;
    classId: string;
    className: string;
    subject: string;
    grade: string;
    ppctPool: PpctItem[];
    remainingLessons: PpctItem[];
    pointer: number;
    assignedCount: number;
    offCount: number;
    makeupCount: number;
    completedCount: number;
    hasMissingPpct: boolean;
  }

  // Tập hợp các tiết đã hoàn thành trong existingPlan để bảo toàn tuyệt đối
  // Map lưu theo key: classKey -> Set<periodNumber đã dạy>
  const completedPeriodsByClassKey = new Map<string, Set<number>>();
  // Map lưu các tiết đã hoàn thành theo tọa độ thời gian để không sinh đè
  const completedSlotCoordinates = new Set<string>();
  const completedPreservedItems: TeachingPlanItem[] = [];

  existingPlan.forEach((p) => {
    if (p.isCompleted) {
      completedPreservedItems.push(p);

      const pSub = normalizeSubjectName(p.subject || 'Toán');
      const pKey = `${p.classId}__${pSub.toLowerCase()}`;
      if (!completedPeriodsByClassKey.has(pKey)) {
        completedPeriodsByClassKey.set(pKey, new Set<number>());
      }
      if (p.periodNumber && p.periodNumber > 0) {
        completedPeriodsByClassKey.get(pKey)!.add(p.periodNumber);
      }

      // Đánh dấu tọa độ thời gian đã có tiết hoàn thành
      if (p.date && p.period) {
        completedSlotCoordinates.add(`${p.date}__${p.period}__${p.classId}`);
      }
      if (p.week && p.dayOfWeek && p.period) {
        completedSlotCoordinates.add(`w${p.week}__d${p.dayOfWeek}__p${p.period}__${p.classId}`);
      }
    }
  });

  // Giữ lại các tiết dạy bù CHƯA hoàn thành đã lên lịch trước đó để xếp tiếp
  const pendingMakeupItems = existingPlan.filter((p) => p.isMakeup && !p.isCompleted);

  const states = new Map<string, ClassSubjectState>();

  classSubjectMap.forEach((info, key) => {
    // 2.1: Tìm trong PPCT người dùng tải lên theo classId
    let pool = ppctItems.filter(
      (p) => p.classId === info.classId && normalizeSubjectName(p.subject) === info.subject
    );

    // 2.2: Nếu chưa có theo lớp, tìm theo Khối & Môn
    if (pool.length === 0 && info.grade) {
      pool = ppctItems.filter(
        (p) =>
          (!p.classId || p.classId === 'ALL') &&
          String(p.grade || '').trim() === info.grade &&
          normalizeSubjectName(p.subject) === info.subject
      );
    }

    // 2.3: Nếu vẫn chưa có, kiểm tra kho mẫu chuẩn GDPT 2018 (chỉ đúng môn Toán khối 7, 8, 10)
    let isFromSample = false;
    if (pool.length === 0 && info.subject === 'Toán') {
      const samplePool = getSamplePpctForGrade(info.grade, info.subject);
      if (samplePool.length > 0) {
        pool = samplePool;
        isFromSample = true;
      }
    }

    // Sort pool asc
    pool = [...pool].sort((a, b) => a.periodNumber - b.periodNumber);

    let hasMissingPpct = false;
    if (pool.length === 0) {
      hasMissingPpct = true;
      missingPpctClasses.push({
        classId: info.classId,
        className: info.className,
        subject: info.subject,
        grade: info.grade,
      });
      warnings.push(
        `Lớp ${info.className} (${info.subject} - Khối ${info.grade || '?'}) chưa có phân phối chương trình tải lên. Vui lòng nạp file PPCT thực tế.`
      );
    } else if (isFromSample) {
      warnings.push(
        `Lớp ${info.className} (${info.subject} Khối ${info.grade}) đang tạm xem trước bằng PPCT mẫu chuẩn GDPT 2018. Thầy cô nên tải file PPCT thực tế của trường lên.`
      );
    }

    // Lọc ra các bài PPCT CHƯA DẠY (không bị lặp lại những bài đã đánh dấu Đã dạy)
    const taughtSet = completedPeriodsByClassKey.get(key) || new Set<number>();
    const remainingLessons = pool.filter((p) => !taughtSet.has(p.periodNumber));

    states.set(key, {
      ...info,
      ppctPool: pool,
      remainingLessons,
      pointer: 0,
      assignedCount: taughtSet.size,
      offCount: 0,
      makeupCount: 0,
      completedCount: taughtSet.size,
      hasMissingPpct,
    });
  });

  // 3. Mốc thời gian năm học (Mặc định năm học 2026-2027)
  let start = new Date(config.startDate + 'T00:00:00');
  if (isNaN(start.getTime())) {
    start = new Date('2026-09-07T00:00:00'); // Thứ Hai tuần 1 năm học 2026-2027
  }

  // Điều chỉnh về Thứ Hai của Tuần 1
  const dayOfWeekOfStart = start.getDay(); // 0: Sun, 1: Mon
  const diffToMonday = dayOfWeekOfStart === 0 ? -6 : 1 - dayOfWeekOfStart;
  const mondayWeek1 = new Date(start);
  mondayWeek1.setDate(start.getDate() + diffToMonday);

  const generatedPlan: TeachingPlanItem[] = [];
  let totalSlots = 0;
  let assignedLessons = 0;
  let totalOffSlots = 0;
  let totalMakeupSlots = 0;

  // Đưa toàn bộ các tiết ĐÃ HOÀN THÀNH vào kết quả trước tiên (Bảo toàn 100%)
  if (config.preserveCompleted) {
    completedPreservedItems.forEach((compItem) => {
      generatedPlan.push({ ...compItem });
      assignedLessons++;
    });
  }

  // 4. Mô phỏng tuần tự theo thời gian: Tuần 1 đến totalWeeks
  for (let w = 1; w <= config.totalWeeks; w++) {
    const mondayOfW = new Date(mondayWeek1);
    mondayOfW.setDate(mondayWeek1.getDate() + (w - 1) * 7);

    // Ngày trong tuần: Thứ 2 (d=0) đến Thứ 7 (d=5)
    for (let d = 0; d <= 5; d++) {
      const dayDate = new Date(mondayOfW);
      dayDate.setDate(mondayOfW.getDate() + d);

      const dayOfWeekNum = (d + 2) as 2 | 3 | 4 | 5 | 6 | 7;
      const yyyy = dayDate.getFullYear();
      const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dd = String(dayDate.getDate()).padStart(2, '0');
      const dateIso = `${yyyy}-${mm}-${dd}`;
      const dateFormatted = `${dd}/${mm}/${yyyy}`;

      // 4.1: Kiểm tra các tiết DẠY BÙ CHƯA HOÀN THÀNH rơi vào ngày này
      const makeupsToday = pendingMakeupItems.filter((mk) => {
        if (!mk.date) return false;
        // Chuẩn hóa ngày so sánh DD/MM/YYYY hoặc YYYY-MM-DD
        const mkDate = mk.date.includes('/')
          ? mk.date
          : `${mk.date.slice(8, 10)}/${mk.date.slice(5, 7)}/${mk.date.slice(0, 4)}`;
        return mkDate === dateFormatted;
      });

      for (const mk of makeupsToday) {
        const sub = normalizeSubjectName(mk.subject || 'Toán');
        const state = states.get(`${mk.classId}__${sub.toLowerCase()}`);
        if (!state) continue;

        let lessonPeriod = 0;
        let lessonTitle = mk.lessonTitle || 'Tiết Dạy Bù';

        if (state.pointer < state.remainingLessons.length) {
          const nextLesson = state.remainingLessons[state.pointer++];
          lessonPeriod = nextLesson.periodNumber;
          lessonTitle = nextLesson.lessonTitle;
        }

        generatedPlan.push({
          id: mk.id || `plan-mk-${dateIso}-${mk.period}-${mk.classId}-${Date.now()}`,
          week: w,
          date: dateFormatted,
          dayOfWeek: dayOfWeekNum,
          period: mk.period || 1,
          session: mk.session || ((mk.period || 1) <= 5 ? 'Sáng' : 'Chiều'),
          classId: mk.classId,
          className: state.className,
          subject: state.subject,
          room: mk.room,
          periodNumber: lessonPeriod,
          lessonTitle,
          notes: mk.notes || (mk.makeupReason ? `[DẠY BÙ] ${mk.makeupReason}` : '[DẠY BÙ]'),
          isCompleted: false,
          isOffDay: false,
          isMakeup: true,
          makeupReason: mk.makeupReason,
          makeupOriginalDate: mk.makeupOriginalDate,
        });

        state.makeupCount++;
        totalMakeupSlots++;
        assignedLessons++;
      }

      // 4.2: Duyệt các tiết học bình thường trong TKB của ngày này (Tiết 1 -> 10)
      const daySlots = timetable
        .filter((s) => s.dayOfWeek === dayOfWeekNum)
        .sort((a, b) => a.period - b.period);

      for (const slot of daySlots) {
        totalSlots++;
        const sub = normalizeSubjectName(slot.subject || 'Toán');
        const state = states.get(`${slot.classId}__${sub.toLowerCase()}`);
        if (!state) continue;

        // Bỏ qua nếu slot này đã bị chiếm bởi một tiết ĐÃ HOÀN THÀNH
        const coord1 = `${dateFormatted}__${slot.period}__${slot.classId}`;
        const coord2 = `w${w}__d${dayOfWeekNum}__p${slot.period}__${slot.classId}`;
        if (completedSlotCoordinates.has(coord1) || completedSlotCoordinates.has(coord2)) {
          // Tiết này đã được dạy trước đó và đã có trong generatedPlan -> Không ghi đè
          continue;
        }

        // Bỏ qua nếu trùng với một tiết DẠY BÙ vừa xếp ở trên
        const makeupDuplicate = makeupsToday.some(
          (mk) => mk.classId === slot.classId && mk.period === slot.period
        );
        if (makeupDuplicate) {
          continue;
        }

        // Kiểm tra xem slot/ngày này có thuộc NGÀY NGHỈ hay không (Lễ, Tết, Nghỉ đột xuất)
        const offMatch = dayOffs.find((off) => {
          if (off.date !== dateIso) return false;
          const matchClass = !off.classId || off.classId === 'ALL' || off.classId === slot.classId;
          if (!matchClass) return false;
          if (off.allDay) return true;
          if (off.periods && off.periods.includes(slot.period)) return true;
          return false;
        });

        if (offMatch) {
          // 👉 TIẾT NGHỈ: TUYỆT ĐỐI KHÔNG TĂNG CON TRỎ PPCT!
          // Bài học tự động dời sang tiết học tiếp theo của đúng lớp này và môn này!
          state.offCount++;
          totalOffSlots++;

          generatedPlan.push({
            id: `plan-off-${w}-${dayOfWeekNum}-${slot.period}-${slot.classId}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            week: w,
            date: dateFormatted,
            dayOfWeek: dayOfWeekNum,
            period: slot.period,
            session: slot.period <= 5 ? 'Sáng' : 'Chiều',
            classId: slot.classId,
            className: state.className,
            subject: state.subject,
            room: slot.room,
            periodNumber: 0,
            lessonTitle: `[NGHỈ] ${offMatch.reason} (Bài PPCT tự động dời sang tiết sau)`,
            notes: `Nghỉ: ${offMatch.reason}`,
            isCompleted: false,
            isOffDay: true,
            offReason: offMatch.reason,
          });
          continue;
        }

        // 👉 TIẾT DẠY BÌNH THƯỜNG:
        if (state.hasMissingPpct) {
          // Lớp chưa có PPCT: tạo tiết giữ chỗ và cảnh báo
          generatedPlan.push({
            id: `plan-miss-${w}-${dayOfWeekNum}-${slot.period}-${slot.classId}-${Date.now()}`,
            week: w,
            date: dateFormatted,
            dayOfWeek: dayOfWeekNum,
            period: slot.period,
            session: slot.period <= 5 ? 'Sáng' : 'Chiều',
            classId: slot.classId,
            className: state.className,
            subject: state.subject,
            room: slot.room,
            periodNumber: 0,
            lessonTitle: `[CHƯA CÓ PPCT] Lớp ${state.className} (${state.subject}) cần nạp file PPCT`,
            notes: 'Vui lòng tải file PPCT lên để hiển thị đúng tên bài dạy',
            isCompleted: false,
            isOffDay: false,
          });
          continue;
        }

        if (state.pointer < state.remainingLessons.length) {
          // Gán bài PPCT chưa dạy tiếp theo
          const nextLesson = state.remainingLessons[state.pointer++];

          generatedPlan.push({
            id: `plan-gen-${w}-${dayOfWeekNum}-${slot.period}-${slot.classId}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            week: w,
            date: dateFormatted,
            dayOfWeek: dayOfWeekNum,
            period: slot.period,
            session: slot.period <= 5 ? 'Sáng' : 'Chiều',
            classId: slot.classId,
            className: state.className,
            subject: state.subject,
            room: slot.room,
            periodNumber: nextLesson.periodNumber,
            lessonTitle: nextLesson.lessonTitle,
            notes: nextLesson.notes || slot.note || '',
            isCompleted: false,
            isOffDay: false,
          });

          state.assignedCount++;
          assignedLessons++;
        } else {
          // Đã hoàn thành hết toàn bộ khung PPCT chuẩn
          generatedPlan.push({
            id: `plan-ext-${w}-${dayOfWeekNum}-${slot.period}-${slot.classId}-${Date.now()}`,
            week: w,
            date: dateFormatted,
            dayOfWeek: dayOfWeekNum,
            period: slot.period,
            session: slot.period <= 5 ? 'Sáng' : 'Chiều',
            classId: slot.classId,
            className: state.className,
            subject: state.subject,
            room: slot.room,
            periodNumber: state.ppctPool.length + 1,
            lessonTitle: 'Ôn tập & Bổ trợ nâng cao kiến thức',
            notes: 'Đã hoàn thành toàn bộ khung PPCT theo quy định',
            isCompleted: false,
            isOffDay: false,
          });
        }
      }
    }
  }

  // Sắp xếp lại generatedPlan theo thứ tự thời gian chuẩn xác
  generatedPlan.sort((a, b) => {
    if (a.week !== b.week) return a.week - b.week;
    if ((a.dayOfWeek || 0) !== (b.dayOfWeek || 0)) return (a.dayOfWeek || 0) - (b.dayOfWeek || 0);
    return (a.period || 0) - (b.period || 0);
  });

  // 5. Thống kê theo từng lớp (cộng dồn nếu một lớp học nhiều môn, ví dụ 7A1 học cả Toán và GDĐP)
  const classStats: { [className: string]: { totalSlots: number; lessonsAssigned: number; offCount: number; makeupCount: number } } = {};
  states.forEach((state) => {
    const prev = classStats[state.className] || { totalSlots: 0, lessonsAssigned: 0, offCount: 0, makeupCount: 0 };
    classStats[state.className] = {
      totalSlots: prev.totalSlots + state.assignedCount + state.offCount + state.makeupCount,
      lessonsAssigned: prev.lessonsAssigned + state.assignedCount,
      offCount: prev.offCount + state.offCount,
      makeupCount: prev.makeupCount + state.makeupCount,
    };
  });

  return {
    generatedPlan,
    stats: {
      totalSlots,
      assignedLessons,
      offSlotsCount: totalOffSlots,
      makeupSlotsCount: totalMakeupSlots,
      completedPreservedCount: completedPreservedItems.length,
      classStats,
    },
    warnings,
    missingPpctClasses,
  };
}

/**
 * =========================================================================================
 * 11. HỖ TRỢ DẠY BÙ: TỰ ĐỘNG LẤY BÀI PPCT TIẾP THEO & PHÁT HIỆN XUNG ĐỘT
 * =========================================================================================
 */

/**
 * Tìm bài PPCT chưa dạy tiếp theo của một lớp & môn học
 */
export function findNextUntaughtPpctLesson({
  classId,
  subject,
  classes = [],
  ppctItems = [],
  teachingPlan = [],
}: {
  classId: string;
  subject?: string;
  classes?: ClassRoom[];
  ppctItems?: PpctItem[];
  teachingPlan?: TeachingPlanItem[];
}): PpctItem | null {
  const foundCls = classes.find((c) => c.id === classId);
  const clsName = foundCls ? foundCls.name : '';
  const grade = extractGradeFromClassName(clsName) || '';
  const sub = normalizeSubjectName(subject || foundCls?.subject || 'Toán');

  // 1. Tìm pool PPCT phù hợp
  let pool = ppctItems.filter(
    (p) => p.classId === classId && normalizeSubjectName(p.subject) === sub
  );

  if (pool.length === 0 && grade) {
    pool = ppctItems.filter(
      (p) =>
        (!p.classId || p.classId === 'ALL') &&
        String(p.grade || '').trim() === grade &&
        normalizeSubjectName(p.subject) === sub
    );
  }

  if (pool.length === 0 && sub === 'Toán') {
    pool = getSamplePpctForGrade(grade, sub);
  }

  pool = [...pool].sort((a, b) => a.periodNumber - b.periodNumber);
  if (pool.length === 0) return null;

  // 2. Tìm các periodNumber đã dạy hoặc đã được lên lịch
  const taughtPeriods = new Set<number>();
  teachingPlan.forEach((p) => {
    if (p.classId === classId && normalizeSubjectName(p.subject) === sub) {
      if (p.periodNumber && p.periodNumber > 0) {
        // Nếu đã hoàn thành hoặc là một tiết dạy bình thường/bù
        taughtPeriods.add(p.periodNumber);
      }
    }
  });

  // 3. Lấy bài đầu tiên chưa có trong taughtPeriods
  const next = pool.find((p) => !taughtPeriods.has(p.periodNumber));
  return next || null;
}

/**
 * Kiểm tra xung đột thời gian thực khi giáo viên chọn tiết dạy bù
 */
export function checkMakeupCollision({
  date,
  period,
  classId,
  subject,
  timetable,
  teachingPlan,
  dayOffs,
}: {
  date: string; // YYYY-MM-DD
  period: number; // 1 - 10
  classId: string;
  subject?: string;
  timetable: TimetableSlot[];
  teachingPlan: TeachingPlanItem[];
  dayOffs: DayOffItem[];
}): {
  hasConflict: boolean;
  conflicts: string[];
  severity: 'CRITICAL' | 'WARNING' | 'NONE';
} {
  const conflicts: string[] = [];

  // Parse day of week từ date
  const d = new Date(date + 'T00:00:00');
  if (isNaN(d.getTime())) {
    return { hasConflict: true, conflicts: ['Ngày dạy bù không hợp lệ.'], severity: 'CRITICAL' };
  }

  const jsDay = d.getDay(); // 0 is Sun, 1 is Mon
  if (jsDay === 0) {
    conflicts.push('Chủ Nhật: Thầy/Cô đang xếp lịch dạy bù vào Chủ Nhật.');
  }

  const dayOfWeekNum = jsDay === 0 ? 8 : (jsDay + 1); // 2: T2 -> 7: T7

  // 1. Kiểm tra trùng ngày nghỉ / tiết nghỉ
  const offMatch = dayOffs.find((off) => {
    if (off.date !== date) return false;
    const matchClass = !off.classId || off.classId === 'ALL' || off.classId === classId;
    if (!matchClass) return false;
    if (off.allDay) return true;
    if (off.periods && off.periods.includes(period)) return true;
    return false;
  });

  if (offMatch) {
    conflicts.push(`Trùng ngày nghỉ: "${offMatch.reason}" (${offMatch.allDay ? 'Nghỉ cả ngày' : `Nghỉ tiết ${period}`}).`);
  }

  // 2. Kiểm tra trùng Thời khóa biểu chính thức của lớp
  if (dayOfWeekNum >= 2 && dayOfWeekNum <= 7) {
    const classTkbSlot = timetable.find((s) => s.dayOfWeek === dayOfWeekNum && s.period === period && s.classId === classId);
    if (classTkbSlot) {
      conflicts.push(`Trùng TKB lớp: Lớp ${classTkbSlot.className} đã có tiết học môn ${classTkbSlot.subject || 'học'} vào Thứ ${dayOfWeekNum} Tiết ${period}.`);
    }

    // 3. Kiểm tra trùng lịch dạy lớp khác của cùng giáo viên
    const otherClassSlot = timetable.find((s) => s.dayOfWeek === dayOfWeekNum && s.period === period && s.classId !== classId);
    if (otherClassSlot) {
      conflicts.push(`Trùng lịch GV: Thầy/Cô đã có tiết dạy tại Lớp ${otherClassSlot.className} (${otherClassSlot.subject}) vào Thứ ${dayOfWeekNum} Tiết ${period}.`);
    }
  }

  // 4. Kiểm tra trùng với một tiết khác đã có trong Sổ báo giảng vào cùng ngày & tiết
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const dateFormatted = `${dd}/${mm}/${yyyy}`;

  const existingPlanConflict = teachingPlan.find((p) => {
    const pDate = p.date || '';
    const matchDate = pDate === dateFormatted || pDate === date;
    return matchDate && p.period === period && !p.isOffDay;
  });

  if (existingPlanConflict) {
    conflicts.push(`Trùng kế hoạch: Đã có tiết dạy "${existingPlanConflict.lessonTitle}" của Lớp ${existingPlanConflict.className} vào ngày ${dateFormatted} Tiết ${period}.`);
  }

  const hasConflict = conflicts.length > 0;
  const severity = offMatch || conflicts.some((c) => c.includes('Trùng lịch GV') || c.includes('Trùng TKB'))
    ? 'CRITICAL'
    : hasConflict
    ? 'WARNING'
    : 'NONE';

  return { hasConflict, conflicts, severity };
}
