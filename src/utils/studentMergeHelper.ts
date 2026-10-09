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
 * Kiểm tra điểm số hợp lệ theo thang điểm 10 của Việt Nam (từ 0 đến 10)
 */
export function isValidScore(val: any): boolean {
  if (val === undefined || val === null || val === '') return false;
  const num = typeof val === 'number' ? val : Number(val);
  return !isNaN(num) && num >= 0 && num <= 10;
}

/**
 * Hợp nhất điểm số từ file EDU:
 * - EDU có điểm mới hợp lệ -> cập nhật điểm mới.
 * - EDU để trống / undefined / null -> GIỮ NGUYÊN điểm hiện có trong ClassGo.
 * Không được để ô trống EDU xóa điểm đã có.
 */
export function mergeEduScores(
  existingScores?: Student['scores'],
  importedScores?: Student['scores']
): Student['scores'] {
  if (!existingScores && !importedScores) {
    return undefined;
  }
  const ex = existingScores || {};
  const imp = importedScores || {};

  const keys: Array<keyof NonNullable<Student['scores']>> = ['tx1', 'tx2', 'tx3', 'tx4', 'gk', 'ck'];
  const res: NonNullable<Student['scores']> = {
    tx1: null,
    tx2: null,
    tx3: null,
    tx4: null,
    gk: null,
    ck: null,
  };

  keys.forEach((key) => {
    const impVal = imp[key];
    const exVal = ex[key];
    if (isValidScore(impVal)) {
      res[key] = typeof impVal === 'number' ? impVal : Number(impVal);
    } else if (isValidScore(exVal)) {
      res[key] = typeof exVal === 'number' ? exVal : Number(exVal);
    } else {
      res[key] = null;
    }
  });

  return res;
}

/**
 * Làm sạch học sinh mới được tạo từ file EDU:
 * TUYỆT ĐỐI KHÔNG nhận gender hoặc parentPhone từ file EDU.
 * gender và parentPhone thuộc LUỒNG THÔNG TIN HỌC SINH RIÊNG.
 * Học sinh mới từ EDU chưa có dữ liệu Thông tin HS phải có:
 * gender = undefined
 * parentPhone = undefined
 */
export function sanitizeNewEduStudent(importedStudent: Student): Student {
  return {
    ...importedStudent,
    gender: undefined,
    parentPhone: undefined,
  };
}

/**
 * Hợp nhất 1 học sinh từ file EDU với học sinh đã có trong ClassGo:
 * - Cập nhật điểm mới từ file EDU, bảo toàn điểm cũ nếu EDU để trống.
 * - Cập nhật name / studentCode nếu file EDU có.
 * - TUYỆT ĐỐI BẢO TOÀN toàn bộ metadata nội bộ ClassGo:
 *   + id: Giữ nguyên ID cũ (để bảo vệ liên kết nề nếp / disciplineRecords)
 *   + gender: LUÔN giữ existingStudent.gender (TUYỆT ĐỐI TÁCH BIỆT KHỎI EDU)
 *   + parentPhone: LUÔN giữ existingStudent.parentPhone (TUYỆT ĐỐI TÁCH BIỆT KHỎI EDU)
 *   + stars: Giữ nguyên số sao thưởng, không reset
 *   + callCount: Giữ nguyên số lần gọi, không reset
 *   + lastCalledAt: Giữ nguyên thời gian gọi
 *   + isAbsent: Giữ nguyên trạng thái điểm danh
 *   + notes: Giữ nguyên ghi chú cũ, không để EDU ghi đè
 */
export function mergeSingleEduStudent(existingStudent: Student, importedStudent: Student): Student {
  const mergedScores = mergeEduScores(existingStudent.scores, importedStudent.scores);

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

    // Tên và mã học sinh
    name: finalName,
    studentCode: finalStudentCode,

    // Điểm số được cập nhật an toàn
    scores: mergedScores,

    // TUYỆT ĐỐI BẢO VỆ CÁC TRƯỜNG NỘI BỘ VÀ THÔNG TIN HỌC SINH RIÊNG:
    id: existingStudent.id,
    gender: existingStudent.gender,
    parentPhone: existingStudent.parentPhone,
    stars: existingStudent.stars,
    callCount: existingStudent.callCount,
    lastCalledAt: existingStudent.lastCalledAt,
    isAbsent: existingStudent.isAbsent,
    notes: existingStudent.notes,
  };
}

/**
 * Hợp nhất danh sách học sinh từ file EDU với danh sách học sinh hiện có của lớp
 * 
 * QUY TẮC GHÉP HỌC SINH:
 * 1. Ưu tiên ghép theo studentCode.
 * 2. Chỉ fallback theo họ tên nếu:
 *    - studentCode thiếu ở ít nhất một bên
 *    - tên duy nhất trong lớp hiện tại
 *    - tên duy nhất trong file import
 *    Nếu trùng tên hoặc không chắc chắn thì KHÔNG tự ghép.
 * 3. Khi tìm thấy học sinh cũ: PHẢI giữ existingStudent.id.
 * 
 * CHẾ ĐỘ REPLACE:
 * - Danh sách cuối vẫn theo học sinh có trong file EDU.
 * - Học sinh đã tồn tại -> merge với existingStudent.
 * - Học sinh mới -> sanitizeNewEduStudent (loại bỏ gender & parentPhone).
 * - Học sinh không còn trong EDU -> loại bỏ theo đúng hành vi REPLACE hiện tại.
 * 
 * CHẾ ĐỘ APPEND:
 * - Nếu studentCode đã tồn tại -> MERGE.
 * - Không tạo học sinh trùng.
 * - Học sinh mới -> sanitizeNewEduStudent (loại bỏ gender & parentPhone), thêm vào cuối.
 * - Học sinh cũ không có trong file -> giữ nguyên.
 */
export function mergeEduStudentsWithExisting(
  existingStudents: Student[],
  importedStudents: Student[],
  mode: 'REPLACE' | 'APPEND' = 'REPLACE'
): Student[] {
  if (!existingStudents || existingStudents.length === 0) {
    return importedStudents.map((imp) => sanitizeNewEduStudent(imp));
  }

  if (!importedStudents || importedStudents.length === 0) {
    return mode === 'APPEND' ? existingStudents : [];
  }

  // 1. Lập bảng tra cứu mã học sinh cho học sinh hiện có (chỉ các mã xuất hiện duy nhất 1 lần trong lớp)
  const existingCodeCounts = new Map<string, number>();
  existingStudents.forEach((st) => {
    const code = normalizeStudentCode(st.studentCode);
    if (code) {
      existingCodeCounts.set(code, (existingCodeCounts.get(code) || 0) + 1);
    }
  });

  const existingByCode = new Map<string, Student>();
  existingStudents.forEach((st) => {
    const code = normalizeStudentCode(st.studentCode);
    if (code && existingCodeCounts.get(code) === 1) {
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

  // 3. Đếm tần suất tên trong importedStudents để đảm bảo cũng không trùng lặp ở file import khi fallback
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

  // Pass 2: Fallback theo họ tên
  // Chỉ fallback theo họ tên nếu:
  // - studentCode thiếu ở ít nhất một bên (!impCode || !exCode)
  // - tên duy nhất trong lớp hiện tại
  // - tên duy nhất trong file import
  importedStudents.forEach((imp, impIdx) => {
    if (matchedExistingByImpIndex.has(impIdx)) {
      return; // Đã ghép theo studentCode
    }

    const impCode = normalizeStudentCode(imp.studentCode);
    const normName = normalizeStudentName(imp.name);

    if (
      normName &&
      existingNameCounts.get(normName) === 1 &&
      importedNameCounts.get(normName) === 1 &&
      existingByNameSingle.has(normName)
    ) {
      const ex = existingByNameSingle.get(normName)!;
      const exCode = normalizeStudentCode(ex.studentCode);

      // Điều kiện: studentCode thiếu ở ít nhất một bên
      // Nếu cả hai đều có studentCode nhưng khác nhau, KHÔNG tự ghép!
      const codeMissingAtLeastOneSide = !impCode || !exCode;
      if (codeMissingAtLeastOneSide && !matchedExistingIds.has(ex.id)) {
        matchedExistingByImpIndex.set(impIdx, ex);
        matchedExistingIds.add(ex.id);
      }
    }
  });

  if (mode === 'REPLACE') {
    // Với REPLACE:
    // - Danh sách cuối vẫn theo học sinh có trong file EDU
    // - Học sinh đã tồn tại -> merge với existingStudent
    // - Học sinh mới -> sanitizeNewEduStudent (loại bỏ triệt để gender & parentPhone)
    // - Học sinh không còn trong EDU -> loại bỏ theo đúng hành vi REPLACE hiện tại
    return importedStudents.map((imp, impIdx) => {
      const matchedExisting = matchedExistingByImpIndex.get(impIdx);
      if (matchedExisting) {
        return mergeSingleEduStudent(matchedExisting, imp);
      }
      return sanitizeNewEduStudent(imp);
    });
  } else {
    // Với APPEND:
    // - Nếu studentCode đã tồn tại -> MERGE, không tạo học sinh trùng
    // - Học sinh cũ không có trong file -> giữ nguyên
    // - Học sinh mới -> sanitizeNewEduStudent (loại bỏ triệt để gender & parentPhone), thêm vào cuối
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

    const brandNewImported = importedStudents
      .filter((_, impIdx) => !matchedExistingByImpIndex.has(impIdx))
      .map((imp) => sanitizeNewEduStudent(imp));

    return [...updatedExistingList, ...brandNewImported];
  }
}
