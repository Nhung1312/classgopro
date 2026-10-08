import * as XLSX from 'xlsx';
import { Student } from '../types';

/**
 * Interface cho 1 dòng xem trước khi import thông tin học sinh
 */
export interface StudentInfoPreviewRow {
  studentCode: string;
  name: string;
  genderText?: string;
  parsedGender?: 'nam' | 'nu' | 'khac';
  parentPhone?: string;
  matched: boolean;
  matchedStudent?: Student;
  // Cảnh báo nếu có
  warning?: string;
}

/**
 * Kết quả phân tích file thông tin học sinh
 */
export interface StudentInfoParseResult {
  rows: StudentInfoPreviewRow[];
  totalRows: number;
  matchedCount: number;
  unmatchedCount: number;
  warnings: string[];
}

/**
 * Chuẩn hóa chuỗi header để nhận diện cột
 */
function normalizeHeaderStr(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Chuẩn hóa giới tính từ chuỗi tiếng Việt / ký hiệu
 */
export function normalizeGender(val: any): 'nam' | 'nu' | 'khac' | undefined {
  if (val === undefined || val === null) return undefined;
  const s = String(val).trim().toLowerCase();
  if (!s) return undefined;

  // Nam
  if (s === 'nam' || s === 'm' || s === 'male' || s === 'trai' || s === '1') {
    return 'nam';
  }
  // Nữ
  if (s === 'nu' || s === 'nữ' || s === 'f' || s === 'female' || s === 'gái' || s === '0' || s === 'nu') {
    return 'nu';
  }
  // Khác
  if (s === 'khac' || s === 'khác' || s === 'other') {
    return 'khac';
  }

  // Check normalized
  const norm = s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
  if (norm === 'nam') return 'nam';
  if (norm === 'nu') return 'nu';
  if (norm === 'khac') return 'khac';

  return undefined;
}

/**
 * Chuẩn hóa số điện thoại phụ huynh
 * Giữ lại chuỗi số, loại bỏ khoảng trắng thừa
 */
export function normalizeParentPhone(val: any): string | undefined {
  if (val === undefined || val === null) return undefined;
  const s = String(val).trim();
  if (!s) return undefined;

  // Xóa các ký tự không liên quan trừ số, dấu +, dấu cách, gạch nối
  // Ví dụ "0912 345 678" -> "0912345678" hoặc chuẩn hóa số nguyên từ Excel (vd 912345678 -> 0912345678 nếu thiếu số 0)
  const cleaned = s.replace(/[\s\.\-_]/g, '');
  if (!cleaned) return undefined;

  // Nếu Excel tự chuyển số dạng number bỏ mất số 0 đầu (vd 912345678 9 chữ số)
  if (/^\d{9}$/.test(cleaned)) {
    return '0' + cleaned;
  }
  return cleaned;
}

/**
 * XUẤT FILE THÔNG TIN HỌC SINH (LUỒNG RIÊNG HOÀN TOÀN)
 * Cột: Mã học sinh | Họ và tên | Giới tính | SĐT phụ huynh
 * Tên file ví dụ: Thong_tin_hoc_sinh_7A1.xlsx
 */
export function exportStudentInfoToExcel(className: string, students: Student[]) {
  const data = students.map((std) => ({
    'Mã học sinh': std.studentCode || '',
    'Họ và tên': std.name,
    'Giới tính': std.gender === 'nu' ? 'Nữ' : std.gender === 'nam' ? 'Nam' : std.gender === 'khac' ? 'Khác' : '',
    'SĐT phụ huynh': std.parentPhone || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  // Đặt độ rộng các cột
  worksheet['!cols'] = [
    { wch: 18 }, // Mã học sinh
    { wch: 26 }, // Họ và tên
    { wch: 14 }, // Giới tính
    { wch: 20 }, // SĐT phụ huynh
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, `Thông tin HS Lớp ${className}`);

  const safeClassName = className.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = `Thong_tin_hoc_sinh_${safeClassName}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * ĐỌC VÀ PHÂN TÍCH FILE EXCEL THÔNG TIN HỌC SINH
 * Nhận diện các cột:
 * - Mã học sinh / Mã HS
 * - Họ và tên
 * - Giới tính / Phái / GT
 * - SĐT phụ huynh / SĐT PH / Điện thoại PH / Số điện thoại phụ huynh
 */
export async function parseStudentInfoFile(
  file: File,
  existingStudents: Student[]
): Promise<StudentInfoParseResult> {
  const dataBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(dataBuffer, { type: 'array' });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('File Excel không có sheet dữ liệu nào.');
  }

  // Lấy sheet đầu tiên
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) {
    throw new Error('Không đọc được nội dung sheet.');
  }

  // Chuyển sheet sang mảng 2 chiều
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (rawRows.length === 0) {
    throw new Error('File Excel trống, không có dữ liệu.');
  }

  // Tìm dòng header
  let headerRowIdx = -1;
  let codeColIdx = -1;
  let nameColIdx = -1;
  let genderColIdx = -1;
  let phoneColIdx = -1;

  for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;

    let foundCode = -1;
    let foundName = -1;
    let foundGender = -1;
    let foundPhone = -1;

    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || '').trim();
      const norm = normalizeHeaderStr(cellVal);

      // Mã học sinh
      if (
        norm === 'mahocsinh' ||
        norm === 'mahs' ||
        norm === 'studentcode' ||
        norm === 'code' ||
        norm === 'masohocsinh' ||
        norm === 'macc'
      ) {
        foundCode = c;
      }
      // Họ và tên
      else if (
        norm === 'hovaten' ||
        norm === 'hoten' ||
        norm === 'ten' ||
        norm === 'fullname' ||
        norm === 'studentname'
      ) {
        foundName = c;
      }
      // Giới tính
      else if (
        norm === 'gioitinh' ||
        norm === 'gt' ||
        norm === 'phai' ||
        norm === 'gender' ||
        norm === 'sex'
      ) {
        foundGender = c;
      }
      // SĐT phụ huynh
      else if (
        norm.includes('sdt') ||
        norm.includes('dienthoai') ||
        norm.includes('sodienthoai') ||
        norm.includes('phone') ||
        norm.includes('parentphone') ||
        norm.includes('phuhuynh')
      ) {
        foundPhone = c;
      }
    }

    // Nếu tìm thấy ít nhất cột Mã HS hoặc cột Họ Tên
    if (foundCode !== -1 || (foundName !== -1 && (foundGender !== -1 || foundPhone !== -1))) {
      headerRowIdx = r;
      codeColIdx = foundCode;
      nameColIdx = foundName;
      genderColIdx = foundGender;
      phoneColIdx = foundPhone;
      break;
    }
  }

  if (headerRowIdx === -1 || codeColIdx === -1) {
    throw new Error(
      'Không nhận diện được cột "Mã học sinh" (hoặc "Mã HS"). Vui lòng kiểm tra tiêu đề các cột trong file.'
    );
  }

  // Xây dựng danh sách Map học sinh hiện tại theo studentCode
  // Chuẩn hóa studentCode: trim, lowerCase
  const studentMapByCode = new Map<string, Student>();
  for (const std of existingStudents) {
    if (std.studentCode && std.studentCode.trim()) {
      studentMapByCode.set(std.studentCode.trim().toLowerCase(), std);
    }
  }

  const previewRows: StudentInfoPreviewRow[] = [];
  const warnings: string[] = [];

  for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;

    const rawCode = String(row[codeColIdx] || '').trim();
    const rawName = nameColIdx !== -1 ? String(row[nameColIdx] || '').trim() : '';
    const rawGender = genderColIdx !== -1 ? row[genderColIdx] : undefined;
    const rawPhone = phoneColIdx !== -1 ? row[phoneColIdx] : undefined;

    // Bỏ qua nếu cả dòng trống hoặc không có mã HS và không có tên
    if (!rawCode && !rawName) continue;

    const parsedGender = normalizeGender(rawGender);
    const parsedPhone = normalizeParentPhone(rawPhone);

    let matched = false;
    let matchedStudent: Student | undefined = undefined;
    let warning: string | undefined = undefined;

    if (rawCode) {
      const match = studentMapByCode.get(rawCode.toLowerCase());
      if (match) {
        matched = true;
        matchedStudent = match;
      } else {
        matched = false;
        warning = `Không tìm thấy Mã HS "${rawCode}" trong lớp học này.`;
      }
    } else {
      matched = false;
      warning = 'Dòng này không có Mã học sinh để đối soát.';
    }

    previewRows.push({
      studentCode: rawCode,
      name: rawName || (matchedStudent ? matchedStudent.name : '—'),
      genderText: rawGender !== undefined ? String(rawGender).trim() : undefined,
      parsedGender,
      parentPhone: parsedPhone,
      matched,
      matchedStudent,
      warning,
    });
  }

  const matchedCount = previewRows.filter((r) => r.matched).length;
  const unmatchedCount = previewRows.filter((r) => !r.matched).length;

  if (unmatchedCount > 0) {
    warnings.push(
      `Có ${unmatchedCount} học sinh trong file không khớp với Mã HS hiện tại của lớp. Hệ thống sẽ bỏ qua và chỉ cập nhật những học sinh tìm thấy.`
    );
  }

  return {
    rows: previewRows,
    totalRows: previewRows.length,
    matchedCount,
    unmatchedCount,
    warnings,
  };
}

/**
 * HÀM MERGE DỮ LIỆU THÔNG TIN HỌC SINH (BẢO TOÀN TUYỆT ĐỐI TOÀN BỘ SỔ ĐIỂM VÀ CÁC TRƯỜNG KHÁC)
 *
 * YÊU CẦU CỰC KỲ QUAN TRỌNG:
 * - TUYỆT ĐỐI KHÔNG TẠO LẠI Student object chỉ với dữ liệu file import.
 * - Chỉ cập nhật:
 *     gender: importedGender ?? existingStudent.gender,
 *     parentPhone: importedParentPhone ?? existingStudent.parentPhone
 * - Nếu file để trống Giới tính hoặc SĐT PH: GIỮ NGUYÊN giá trị hiện có!
 * - TUYỆT ĐỐI KHÔNG sửa/reset: scores.tx1, tx2, tx3, tx4, gk, ck, stars, callCount, lastCalledAt, notes, isAbsent.
 * - Trả về mảng students mới với kiểm tra assertion nghiêm ngặt trước & sau.
 */
export function applyStudentInfoUpdates(
  existingStudents: Student[],
  previewRows: StudentInfoPreviewRow[]
): { updatedStudents: Student[]; updatedCount: number } {
  // Tạo map bản cập nhật theo studentCode (chỉ các dòng matched = true)
  const updatesByCode = new Map<string, StudentInfoPreviewRow>();
  for (const row of previewRows) {
    if (row.matched && row.studentCode) {
      updatesByCode.set(row.studentCode.trim().toLowerCase(), row);
    }
  }

  let updatedCount = 0;

  const updatedStudents = existingStudents.map((existingStudent) => {
    if (!existingStudent.studentCode) {
      return existingStudent;
    }

    const codeKey = existingStudent.studentCode.trim().toLowerCase();
    const updateInfo = updatesByCode.get(codeKey);

    if (!updateInfo) {
      return existingStudent;
    }

    // Xác định gender mới: nếu file có giá trị hợp lệ thì lấy, nếu để trống thì giữ nguyên cũ
    const resolvedGender =
      updateInfo.parsedGender !== undefined ? updateInfo.parsedGender : existingStudent.gender;

    // Xác định parentPhone mới: nếu file có thì lấy, nếu file để trống thì giữ nguyên cũ
    const resolvedParentPhone =
      updateInfo.parentPhone !== undefined && updateInfo.parentPhone.trim() !== ''
        ? updateInfo.parentPhone.trim()
        : existingStudent.parentPhone;

    // Kiểm tra xem có gì thay đổi không
    const hasChange =
      resolvedGender !== existingStudent.gender ||
      resolvedParentPhone !== existingStudent.parentPhone;

    if (hasChange) {
      updatedCount++;
    }

    // CHỈ CẬP NHẬT gender VÀ parentPhone - TẤT CẢ CÁC TRƯỜNG KHÁC GIỮ NGUYÊN 100%
    const updatedStudent: Student = {
      ...existingStudent,
      gender: resolvedGender,
      parentPhone: resolvedParentPhone,
    };

    return updatedStudent;
  });

  // KIỂM TRA BẮT BUỘC (CRITICAL ASSERTION)
  // Trước và sau khi import:
  // - So sánh scores (tx1, tx2, tx3, tx4, gk, ck) của từng học sinh
  // - So sánh stars
  // - So sánh callCount
  // - So sánh lastCalledAt, notes, isAbsent
  for (let i = 0; i < existingStudents.length; i++) {
    const before = existingStudents[i];
    const after = updatedStudents[i];

    if (before.id !== after.id || before.name !== after.name) {
      throw new Error(`FAIL: ID hoặc tên học sinh bị xáo trộn tại vị trí ${i}. Hủy cập nhật.`);
    }

    // Check scores
    const bScores = before.scores || {};
    const aScores = after.scores || {};
    if (
      bScores.tx1 !== aScores.tx1 ||
      bScores.tx2 !== aScores.tx2 ||
      bScores.tx3 !== aScores.tx3 ||
      bScores.tx4 !== aScores.tx4 ||
      bScores.gk !== aScores.gk ||
      bScores.ck !== aScores.ck
    ) {
      throw new Error(
        `FAIL: Điểm số của học sinh "${before.name}" bị biến đổi trái phép! Hệ thống đã tự động hủy bỏ cập nhật để bảo toàn sổ điểm.`
      );
    }

    // Check stars & callCount
    if ((before.stars || 0) !== (after.stars || 0)) {
      throw new Error(`FAIL: Sao thưởng của học sinh "${before.name}" bị biến đổi! Hủy cập nhật.`);
    }
    if ((before.callCount || 0) !== (after.callCount || 0)) {
      throw new Error(`FAIL: Số lần gọi của học sinh "${before.name}" bị biến đổi! Hủy cập nhật.`);
    }
    if (before.lastCalledAt !== after.lastCalledAt) {
      throw new Error(`FAIL: Lần gọi gần nhất của học sinh "${before.name}" bị biến đổi! Hủy cập nhật.`);
    }
    if (before.isAbsent !== after.isAbsent) {
      throw new Error(`FAIL: Trạng thái điểm danh của học sinh "${before.name}" bị biến đổi! Hủy cập nhật.`);
    }
    if (before.notes !== after.notes) {
      throw new Error(`FAIL: Ghi chú của học sinh "${before.name}" bị biến đổi! Hủy cập nhật.`);
    }
  }

  return { updatedStudents, updatedCount };
}
