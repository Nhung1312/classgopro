import { Student } from '../types';

/**
 * Chuẩn hóa mã học sinh để so sánh chính xác (bỏ khoảng trắng thừa, chuyển chữ thường)
 */
export function normalizeStudentCode(code?: string): string {
  if (!code) return '';
  return code.toString().trim().toLowerCase();
}

/**
 * Chuẩn hóa họ tên học sinh để so sánh fallback (bỏ khoảng trắng thừa, chuyển chữ thường)
 */
export function normalizeStudentName(name?: string): string {
  if (!name) return '';
  return name.toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Hợp nhất dữ liệu học sinh từ file EDU với học sinh đã có trong ClassGo.
 * Giữ nguyên các metadata nội bộ của ClassGo:
 * - id
 * - parentPhone
 * - stars
 * - callCount
 * - lastCalledAt
 * - isAbsent
 * - notes (giữ notes cũ nếu EDU không có ghi chú mới)
 */
export function mergeSingleEduStudent(existingStudent: Student, importedStudent: Student): Student {
  // Điểm số:
  // Nếu imported có scores thì merge, giữ điểm cũ nếu cột tương ứng trong file EDU để trống
  let mergedScores = existingStudent.scores;
  if (importedStudent.scores) {
    mergedScores = {
      ...(existingStudent.scores || {}),
      ...(importedStudent.scores || {}),
    };
    if (existingStudent.scores) {
      const keys: Array<keyof NonNullable<Student['scores']>> = ['tx1', 'tx2', 'tx3', 'tx4', 'gk', 'ck'];
      keys.forEach((key) => {
        const impVal = importedStudent.scores?.[key];
        const exVal = existingStudent.scores?.[key];
        if ((impVal === undefined || impVal === null) && exVal !== undefined && exVal !== null) {
          mergedScores![key] = exVal;
        }
      });
    }
  }

  // Giới tính:
  // nếu EDU thực sự có dữ liệu giới tính thì có thể cập nhật
  // nếu EDU không có thì giữ nguyên dữ liệu cũ
  // Không được ghi undefined hoặc chuỗi rỗng đè lên gender hiện có
  const finalGender =
    importedStudent.gender && String(importedStudent.gender).trim() !== ''
      ? importedStudent.gender
      : existingStudent.gender;

  // Họ và tên & Mã HS:
  const finalName =
    importedStudent.name && importedStudent.name.trim() !== ''
      ? importedStudent.name.trim()
      : existingStudent.name;

  const finalStudentCode =
    importedStudent.studentCode && importedStudent.studentCode.trim() !== ''
      ? importedStudent.studentCode.trim()
      : existingStudent.studentCode;

  return {
    ...existingStudent,
    id: existingStudent.id, // BẢO VỆ ID để giữ liên kết nề nếp / disciplineRecords
    name: finalName,
    studentCode: finalStudentCode,
    scores: mergedScores,
    gender: finalGender,
    parentPhone: existingStudent.parentPhone, // Metadata nội bộ PHẢI GIỮ, không ghi đè undefined
    stars: existingStudent.stars, // KHÔNG reset stars về 0
    callCount: existingStudent.callCount, // KHÔNG reset callCount
    lastCalledAt: existingStudent.lastCalledAt, // KHÔNG xóa lastCalledAt
    isAbsent: existingStudent.isAbsent, // KHÔNG xóa trạng thái vắng
    notes: existingStudent.notes, // Notes nội bộ LUÔN giữ từ existingStudent, không bị EDU ghi đè
  };
}

/**
 * Hợp nhất danh sách học sinh từ file EDU với danh sách học sinh hiện có của lớp
 * 
 * QUY TẮC GHÉP HỌC SINH:
 * 1. Ưu tiên ghép theo studentCode
 * 2. Chỉ fallback theo họ tên nếu studentCode không có và tên khớp duy nhất, an toàn
 * 
 * CHẾ ĐỘ REPLACE:
 * - Học sinh khớp: merge với Student cũ để giữ metadata (ID, stars, callCount, parentPhone...)
 * - Học sinh mới trong file EDU: tạo Student mới bình thường
 * - Học sinh không còn trong file EDU: xử lý theo hành vi REPLACE hiện tại
 * 
 * CHẾ ĐỘ APPEND:
 * - Học sinh khớp: cập nhật/merge học sinh đó (không tạo trùng lặp học sinh, giữ nguyên metadata)
 * - Học sinh mới trong file EDU: thêm mới vào danh sách
 * - Học sinh cũ không có trong file EDU: vẫn được giữ nguyên đầy đủ trong lớp
 */
export function mergeEduStudentsWithExisting(
  existingStudents: Student[],
  importedStudents: Student[],
  mode: 'REPLACE' | 'APPEND' = 'REPLACE'
): Student[] {
  if (!existingStudents || existingStudents.length === 0) {
    return importedStudents;
  }

  if (!importedStudents || importedStudents.length === 0) {
    return mode === 'APPEND' ? existingStudents : [];
  }

  // 1. Lập bảng tra cứu mã học sinh cho học sinh hiện có
  const existingByCode = new Map<string, Student>();
  existingStudents.forEach((st) => {
    const code = normalizeStudentCode(st.studentCode);
    if (code) {
      existingByCode.set(code, st);
    }
  });

  // 2. Đếm số lần xuất hiện tên trong existingStudents để kiểm tra tính duy nhất khi fallback
  const existingNameCounts = new Map<string, number>();
  const existingByNameSingle = new Map<string, Student>();
  existingStudents.forEach((st) => {
    const normName = normalizeStudentName(st.name);
    if (normName) {
      const count = (existingNameCounts.get(normName) || 0) + 1;
      existingNameCounts.set(normName, count);
      if (count === 1) {
        existingByNameSingle.set(normName, st);
      } else {
        existingByNameSingle.delete(normName);
      }
    }
  });

  // Đếm tần suất tên trong importedStudents để đảm bảo cũng không trùng lặp ở file import khi fallback
  const importedNameCounts = new Map<string, number>();
  importedStudents.forEach((st) => {
    const normName = normalizeStudentName(st.name);
    if (normName) {
      importedNameCounts.set(normName, (importedNameCounts.get(normName) || 0) + 1);
    }
  });

  // Map lưu ghép cặp: importedIndex -> existingStudent
  const matchedExistingByImpIndex = new Map<number, Student>();
  const matchedExistingIds = new Set<string>();

  // Pass 1: Ghép ưu tiên theo studentCode
  importedStudents.forEach((imp, impIdx) => {
    const impCode = normalizeStudentCode(imp.studentCode);
    if (impCode && existingByCode.has(impCode)) {
      const ex = existingByCode.get(impCode)!;
      if (!matchedExistingIds.has(ex.id)) {
        matchedExistingByImpIndex.set(impIdx, ex);
        matchedExistingIds.add(ex.id);
      }
    }
  });

  // Pass 2: Fallback theo họ tên (chỉ khi studentCode không có và tên khớp duy nhất, an toàn)
  importedStudents.forEach((imp, impIdx) => {
    if (matchedExistingByImpIndex.has(impIdx)) {
      return; // Đã ghép theo code
    }

    const impCode = normalizeStudentCode(imp.studentCode);
    const normName = normalizeStudentName(imp.name);

    // Điều kiện an toàn: tên phải duy nhất ở cả existing và imported, và tên không rỗng
    if (
      normName &&
      existingNameCounts.get(normName) === 1 &&
      importedNameCounts.get(normName) === 1 &&
      existingByNameSingle.has(normName)
    ) {
      const ex = existingByNameSingle.get(normName)!;
      const exCode = normalizeStudentCode(ex.studentCode);

      // Chỉ fallback theo họ tên nếu studentCode không có (ở một hoặc cả hai bên)
      const neitherOrOneLacksCode = !impCode || !exCode;
      if (neitherOrOneLacksCode && !matchedExistingIds.has(ex.id)) {
        matchedExistingByImpIndex.set(impIdx, ex);
        matchedExistingIds.add(ex.id);
      }
    }
  });

  if (mode === 'REPLACE') {
    // Với REPLACE:
    // - Danh sách kết quả theo thứ tự file EDU
    // - Học sinh khớp: merge với Student cũ để giữ metadata
    // - Học sinh mới: giữ nguyên importedStudent
    return importedStudents.map((imp, impIdx) => {
      const matchedExisting = matchedExistingByImpIndex.get(impIdx);
      if (matchedExisting) {
        return mergeSingleEduStudent(matchedExisting, imp);
      }
      return imp;
    });
  } else {
    // Với APPEND:
    // - Học sinh khớp: cập nhật/merge học sinh đó (không tạo trùng lặp học sinh, giữ nguyên metadata)
    // - Học sinh cũ không có trong file EDU: giữ nguyên trong lớp
    // - Học sinh mới trong file EDU: thêm mới vào danh sách
    const matchedImportedByExistingId = new Map<string, Student>();
    matchedExistingByImpIndex.forEach((existing, impIdx) => {
      matchedImportedByExistingId.set(existing.id, importedStudents[impIdx]);
    });

    const updatedExistingList = existingStudents.map((ex) => {
      const matchedImp = matchedImportedByExistingId.get(ex.id);
      if (matchedImp) {
        return mergeSingleEduStudent(ex, matchedImp);
      }
      return ex;
    });

    const brandNewImported = importedStudents.filter((_, impIdx) => !matchedExistingByImpIndex.has(impIdx));

    return [...updatedExistingList, ...brandNewImported];
  }
}
