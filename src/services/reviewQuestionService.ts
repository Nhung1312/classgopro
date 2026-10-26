import { requestAiQuestions } from './aiQuestionClient';
import * as XLSX from 'xlsx';
import {
  ReviewQuestion,
  ReviewQuestionBank,
  ReviewQuestionLevel,
  ReviewQuestionSource,
  ClassGoJsonQuestionBankImport,
} from '../types';

/**
 * Built-in initial sample question banks (Phase 1: small test data only)
 */
export const BUILTIN_SAMPLE_BANKS: ReviewQuestionBank[] = [
  {
    id: 'builtin-toan-7-so-huu-ti',
    ownerId: 'system',
    subject: 'Toán',
    grade: '7',
    semester: '1',
    sectionId: 'chuong-1-so-huu-ti',
    sectionName: 'Chương 1: Số hữu tỉ',
    lessonId: 'toan-7-bai-1-tap-hop-so-huu-ti',
    lessonName: 'Bài 1: Tập hợp các số hữu tỉ',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-toan-8-hang-dang-thuc',
    ownerId: 'system',
    subject: 'Toán',
    grade: '8',
    semester: '1',
    sectionId: 'chuong-1-da-thuc',
    sectionName: 'Chương 1: Đa thức nhiều biến',
    lessonId: 'toan-8-bai-3-hang-dang-thuc-dang-nho',
    lessonName: 'Bài 3: Hằng đẳng thức đáng nhớ',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export const BUILTIN_SAMPLE_QUESTIONS: ReviewQuestion[] = [
  // Toán 7 - Bài 1: Tập hợp các số hữu tỉ
  {
    id: 'b7-01',
    bankId: 'builtin-toan-7-so-huu-ti',
    level: 'basic',
    source: 'builtin',
    question: 'Số hữu tỉ là số viết được dưới dạng nào? Cho ví dụ về 2 số hữu tỉ.',
    answer: 'Số hữu tỉ là số viết được dưới dạng phân số $\\frac{a}{b}$ với $a, b \\in \\mathbb{Z}, b \\neq 0$. Ví dụ: $\\frac{2}{3}; -0,5 = -\\frac{1}{2}$.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'b7-02',
    bankId: 'builtin-toan-7-so-huu-ti',
    level: 'basic',
    source: 'builtin',
    question: 'Số đối của số hữu tỉ $\\frac{3}{5}$ là số nào? Biểu diễn trên trục số nằm ở phía nào so với điểm 0?',
    answer: 'Số đối của $\\frac{3}{5}$ là $-\\frac{3}{5}$. Trên trục số, $-\\frac{3}{5}$ nằm ở bên trái điểm gốc 0.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'b7-03',
    bankId: 'builtin-toan-7-so-huu-ti',
    level: 'basic',
    source: 'builtin',
    question: 'Khẳng định nào sau đây là ĐÚNG về số 0?\nA. Số 0 là số hữu tỉ dương\nB. Số 0 là số hữu tỉ âm\nC. Số 0 là số hữu tỉ nhưng không là số hữu tỉ dương cũng không là số hữu tỉ âm\nD. Số 0 không phải là số hữu tỉ',
    answer: 'C. Số 0 là số hữu tỉ nhưng không là số hữu tỉ dương cũng không là số hữu tỉ âm.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'b7-04',
    bankId: 'builtin-toan-7-so-huu-ti',
    level: 'basic',
    source: 'builtin',
    question: 'Kết quả của phép tính $-\\frac{2}{5} + \\frac{3}{5}$ bằng bao nhiêu?\nA. $\\frac{1}{5}$\nB. $-\\frac{1}{5}$\nC. $1$\nD. $\\frac{5}{10}$',
    answer: 'A. $\\frac{1}{5}$',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'a7-01',
    bankId: 'builtin-toan-7-so-huu-ti',
    level: 'advanced',
    source: 'builtin',
    question: 'So sánh hai số hữu tỉ: $x = -\\frac{17}{23}$ và $y = -\\frac{1717}{2323}$.',
    answer: 'Ta có $y = -\\frac{1717}{2323} = -\\frac{17 \\cdot 101}{23 \\cdot 101} = -\\frac{17}{23}$. Vậy $x = y$.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'a7-02',
    bankId: 'builtin-toan-7-so-huu-ti',
    level: 'advanced',
    source: 'builtin',
    question: 'Tìm số hữu tỉ $x$ biết $x - \\frac{1}{2} = \\frac{3}{4}$:\nA. $x = \\frac{5}{4}$\nB. $x = \\frac{1}{4}$\nC. $x = -\\frac{1}{4}$\nD. $x = 1$',
    answer: 'A. $x = \\frac{3}{4} + \\frac{1}{2} = \\frac{5}{4}$',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'a7-03',
    bankId: 'builtin-toan-7-so-huu-ti',
    level: 'advanced',
    source: 'builtin',
    question: 'Tính giá trị của biểu thức $A = \\frac{2}{3} \\cdot \\left(\\frac{3}{4} - \\frac{1}{2}\\right) + \\frac{5}{6}$:\nA. $1$\nB. $\\frac{2}{3}$\nC. $\\frac{7}{6}$\nD. $\\frac{1}{2}$',
    answer: 'A. Ta có: $\\frac{3}{4} - \\frac{1}{2} = \\frac{1}{4}$. Khi đó $A = \\frac{2}{3} \\cdot \\frac{1}{4} + \\frac{5}{6} = \\frac{1}{6} + \\frac{5}{6} = 1$.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'a7-04',
    bankId: 'builtin-toan-7-so-huu-ti',
    level: 'advanced',
    source: 'builtin',
    question: 'Có bao nhiêu số nguyên $x$ thỏa mãn: $-\\frac{3}{2} < x \\le \\frac{5}{2}$?\nA. 3 số\nB. 4 số\nC. 5 số\nD. 2 số',
    answer: 'B. 4 số (đó là $x \\in \\{-1, 0, 1, 2\\}$).',
    createdAt: '2026-01-01T00:00:00.000Z',
  },

  // Toán 8 - Bài 3: Hằng đẳng thức đáng nhớ
  {
    id: 'b8-01',
    bankId: 'builtin-toan-8-hang-dang-thuc',
    level: 'basic',
    source: 'builtin',
    question: 'Phát biểu và viết công thức hằng đẳng thức: Bình phương của một tổng hai biểu thức $A$ và $B$.',
    answer: '$(A + B)^2 = A^2 + 2AB + B^2$.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'b8-02',
    bankId: 'builtin-toan-8-hang-dang-thuc',
    level: 'basic',
    source: 'builtin',
    question: 'Khai triển biểu thức: $(x - 3y)^2$.',
    answer: '$(x - 3y)^2 = x^2 - 2 \\cdot x \\cdot (3y) + (3y)^2 = x^2 - 6xy + 9y^2$.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'b8-03',
    bankId: 'builtin-toan-8-hang-dang-thuc',
    level: 'basic',
    source: 'builtin',
    question: 'Khai triển hằng đẳng thức hiệu hai bình phương $A^2 - B^2$ là:\nA. $(A - B)(A + B)$\nB. $(A - B)^2$\nC. $A^2 - 2AB + B^2$\nD. $(A + B)^2$',
    answer: 'A. $(A - B)(A + B)$',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'b8-04',
    bankId: 'builtin-toan-8-hang-dang-thuc',
    level: 'basic',
    source: 'builtin',
    question: 'Viết biểu thức $x^2 + 4x + 4$ dưới dạng bình phương của một tổng:\nA. $(x + 2)^2$\nB. $(x - 2)^2$\nC. $(x + 4)^2$\nD. $(x + 1)^2$',
    answer: 'A. $(x + 2)^2$',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'a8-01',
    bankId: 'builtin-toan-8-hang-dang-thuc',
    level: 'advanced',
    source: 'builtin',
    question: 'Tính nhanh giá trị của biểu thức $P = 101^2 - 99^2$.',
    answer: '$P = (101 - 99)(101 + 99) = 2 \\cdot 200 = 400$.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'a8-02',
    bankId: 'builtin-toan-8-hang-dang-thuc',
    level: 'advanced',
    source: 'builtin',
    question: 'Cho $x + y = 5$ và $xy = 6$. Tính giá trị của $x^2 + y^2$:\nA. 13\nB. 19\nC. 25\nD. 12',
    answer: 'A. 13. Giải thích: $x^2 + y^2 = (x + y)^2 - 2xy = 5^2 - 2 \\cdot 6 = 25 - 12 = 13$.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'a8-03',
    bankId: 'builtin-toan-8-hang-dang-thuc',
    level: 'advanced',
    source: 'builtin',
    question: 'Tìm giá trị nhỏ nhất của biểu thức $M = x^2 - 6x + 11$:\nA. 2\nB. 11\nC. -2\nD. 3',
    answer: 'A. 2. Giải thích: $M = (x - 3)^2 + 2 \\ge 2$ với mọi $x$. Dấu bằng xảy ra khi $x = 3$.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'a8-04',
    bankId: 'builtin-toan-8-hang-dang-thuc',
    level: 'advanced',
    source: 'builtin',
    question: 'Rút gọn biểu thức $(x + 1)^2 - (x - 1)^2$ ta được kết quả là:\nA. $4x$\nB. $2x^2 + 2$\nC. $2x$\nD. $0$',
    answer: 'A. $4x$',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

/**
 * Normalizes subject names to canonical labels (e.g. "Toán học" -> "Toán", "Ngữ văn" -> "Ngữ văn")
 */
export function normalizeSubjectName(subj?: string): string {
  if (!subj) return '';
  const s = subj.trim().toLowerCase();
  if (s.includes('toan')) return 'Toán';
  if (s.includes('van') || s.includes('ngu van')) return 'Ngữ văn';
  if (s.includes('anh') || s.includes('tieng anh')) return 'Tiếng Anh';
  if (s.includes('ly') || s.includes('vat li') || s.includes('vat ly')) return 'Vật lí';
  if (s.includes('hoa') || s.includes('hoa hoc')) return 'Hóa học';
  if (s.includes('sinh') || s.includes('sinh hoc')) return 'Sinh học';
  if (s.includes('su') || s.includes('lich su')) return 'Lịch sử';
  if (s.includes('dia') || s.includes('dia li')) return 'Địa lí';
  if (s.includes('tin') || s.includes('tin hoc')) return 'Tin học';
  if (s.includes('gdcd') || s.includes('cong dan')) return 'GDCD';
  if (s.includes('khtn') || s.includes('khoa hoc tu nhien')) return 'KHTN';
  return subj.trim();
}

/**
 * Extracts school grade level (6-12) from class name like "7A1", "10A2", "Lớp 8B"
 */
export function extractGradeFromClassName(className?: string): string {
  if (!className) return '';
  const match = className.match(/\b(1[0-2]|[6-9])\b/) || className.match(/(1[0-2]|[6-9])/);
  return match ? match[1] : '';
}

/**
 * Checks if two subject names match flexibly
 */
export function isSubjectMatch(s1?: string, s2?: string): boolean {
  if (!s1 || !s2 || s1 === 'ALL' || s2 === 'ALL') return true;
  const n1 = normalizeSubjectName(s1).toLowerCase();
  const n2 = normalizeSubjectName(s2).toLowerCase();
  if (n1 === n2) return true;
  return n1.includes(n2) || n2.includes(n1);
}

/**
 * Storage key helpers for multi-user isolation
 */
function getStorageKeyForBanks(ownerId?: string): string {
  const safeId = ownerId ? ownerId.trim() : 'local_teacher';
  return `classgo_review_banks_v1_${safeId}`;
}

function getStorageKeyForQuestions(ownerId?: string): string {
  const safeId = ownerId ? ownerId.trim() : 'local_teacher';
  return `classgo_review_questions_v1_${safeId}`;
}

/**
 * Helper slug generator for stable lessonId
 */
export function generateStableLessonId(subject: string, grade: string, lessonName: string): string {
  const clean = `${subject}-${grade}-${lessonName}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || `lesson-${Date.now()}`;
}

/**
 * Load question banks for current teacher (multi-user isolated with safe fallback)
 */
export function loadQuestionBanks(ownerId?: string): ReviewQuestionBank[] {
  try {
    const key = getStorageKeyForBanks(ownerId);
    let raw = localStorage.getItem(key);


    if (!raw) {
      // First time initializing: seed builtin sample banks
      const initial = [...BUILTIN_SAMPLE_BANKS];
      saveQuestionBanks(initial, ownerId);
      saveQuestions([...BUILTIN_SAMPLE_QUESTIONS], ownerId);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure builtin sample banks are also present if not deleted
      const existingIds = new Set(parsed.map((b) => b.id));
      const missingBuiltin = BUILTIN_SAMPLE_BANKS.filter((bb) => !existingIds.has(bb.id));
      if (missingBuiltin.length > 0) {
        const merged = [...parsed, ...missingBuiltin];
        saveQuestionBanks(merged, ownerId);
        return merged;
      }
      return parsed;
    }
  } catch (err) {
    console.error('[reviewQuestionService] Error loading banks:', err);
  }
  return [...BUILTIN_SAMPLE_BANKS];
}

/**
 * Save question banks for current teacher
 */
export function saveQuestionBanks(banks: ReviewQuestionBank[], ownerId?: string): void {
  try {
    const key = getStorageKeyForBanks(ownerId);
    localStorage.setItem(key, JSON.stringify(banks));
  } catch (err) {
    console.error('[reviewQuestionService] Error saving banks:', err);
  }
}

/**
 * Load all questions for current teacher (with safe fallback and builtin enrichment)
 */
export function loadAllQuestions(ownerId?: string): ReviewQuestion[] {
  try {
    const key = getStorageKeyForQuestions(ownerId);
    let raw = localStorage.getItem(key);


    if (!raw) {
      const initial = [...BUILTIN_SAMPLE_QUESTIONS];
      saveQuestions(initial, ownerId);
      return initial;
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Automatically merge in any missing builtin sample questions
      const existingIds = new Set(parsed.map((q) => q.id));
      const missingBuiltin = BUILTIN_SAMPLE_QUESTIONS.filter((bq) => !existingIds.has(bq.id));
      if (missingBuiltin.length > 0) {
        const merged = [...parsed, ...missingBuiltin];
        saveQuestions(merged, ownerId);
        return merged;
      }
      return parsed;
    }
  } catch (err) {
    console.error('[reviewQuestionService] Error loading questions:', err);
  }
  return [...BUILTIN_SAMPLE_QUESTIONS];
}

/**
 * Save all questions for current teacher
 */
export function saveQuestions(questions: ReviewQuestion[], ownerId?: string): void {
  try {
    const key = getStorageKeyForQuestions(ownerId);
    localStorage.setItem(key, JSON.stringify(questions));
  } catch (err) {
    console.error('[reviewQuestionService] Error saving questions:', err);
  }
}

/**
 * Load questions for a specific bank
 */
export function loadQuestionsForBank(bankId: string, ownerId?: string): ReviewQuestion[] {
  const all = loadAllQuestions(ownerId);
  return all.filter((q) => q.bankId === bankId);
}

/**
 * Create a new question bank with duplicate check
 */
export function createQuestionBank(
  data: {
    subject: string;
    grade: string;
    semester?: string;
    sectionId?: string;
    sectionName?: string;
    lessonId?: string;
    lessonName: string;
  },
  ownerId?: string
): { bank: ReviewQuestionBank; isDuplicate: boolean; existingBank?: ReviewQuestionBank } {
  const banks = loadQuestionBanks(ownerId);

  const cleanSubject = data.subject.trim();
  const cleanGrade = String(data.grade).trim();
  const cleanLessonName = data.lessonName.trim();
  const cleanSemester = data.semester?.trim() || '1';
  const cleanSectionName = data.sectionName?.trim() || '';

  const generatedLessonId = data.lessonId?.trim() || generateStableLessonId(cleanSubject, cleanGrade, cleanLessonName);

  // Check for existing duplicate bank by (subject + grade + semester + lessonName/lessonId)
  const existing = banks.find((b) => {
    const matchSubject = b.subject.toLowerCase() === cleanSubject.toLowerCase();
    const matchGrade = String(b.grade).toLowerCase() === cleanGrade.toLowerCase();
    const matchLesson =
      b.lessonId === generatedLessonId ||
      b.lessonName.trim().toLowerCase() === cleanLessonName.toLowerCase();
    return matchSubject && matchGrade && matchLesson;
  });

  if (existing) {
    return {
      bank: existing,
      isDuplicate: true,
      existingBank: existing,
    };
  }

  const now = new Date().toISOString();
  const newBank: ReviewQuestionBank = {
    id: `bank_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ownerId: ownerId || 'local_teacher',
    subject: cleanSubject,
    grade: cleanGrade,
    semester: cleanSemester,
    sectionId: data.sectionId?.trim() || `sec-${Date.now()}`,
    sectionName: cleanSectionName,
    lessonId: generatedLessonId,
    lessonName: cleanLessonName,
    createdAt: now,
    updatedAt: now,
  };

  const updatedBanks = [newBank, ...banks];
  saveQuestionBanks(updatedBanks, ownerId);

  return {
    bank: newBank,
    isDuplicate: false,
  };
}

/**
 * Delete a question bank and its associated questions
 */
export function deleteQuestionBank(bankId: string, ownerId?: string): boolean {
  const banks = loadQuestionBanks(ownerId);
  const updatedBanks = banks.filter((b) => b.id !== bankId);
  saveQuestionBanks(updatedBanks, ownerId);

  const allQuestions = loadAllQuestions(ownerId);
  const updatedQuestions = allQuestions.filter((q) => q.bankId !== bankId);
  saveQuestions(updatedQuestions, ownerId);
  return true;
}

/**
 * Add a manual/imported question to a bank
 */
export function addQuestionToBank(
  data: {
    bankId: string;
    question: string;
    answer: string;
    level: ReviewQuestionLevel;
    source?: ReviewQuestionSource;
    id?: string;
  },
  ownerId?: string
): ReviewQuestion {
  const trimmedQ = data.question.trim();
  const trimmedA = data.answer.trim();

  if (!trimmedQ || !trimmedA) {
    throw new Error('Câu hỏi và đáp án không được để trống.');
  }

  if (data.level !== 'basic' && data.level !== 'advanced') {
    throw new Error('Mức độ câu hỏi chỉ được là "basic" (Cơ bản) hoặc "advanced" (Nâng cao).');
  }

  const now = new Date().toISOString();
  const newQ: ReviewQuestion = {
    id: data.id?.trim() || `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    bankId: data.bankId,
    question: trimmedQ,
    answer: trimmedA,
    level: data.level,
    source: data.source || 'manual',
    createdAt: now,
    updatedAt: now,
  };

  const allQuestions = loadAllQuestions(ownerId);
  const updated = [newQ, ...allQuestions];
  saveQuestions(updated, ownerId);

  return newQ;
}

/**
 * Update an existing question (preserves ID)
 */
export function updateQuestion(
  id: string,
  updates: {
    question?: string;
    answer?: string;
    level?: ReviewQuestionLevel;
  },
  ownerId?: string
): ReviewQuestion | null {
  const allQuestions = loadAllQuestions(ownerId);
  const target = allQuestions.find((q) => q.id === id);
  if (!target) return null;

  if (updates.level && updates.level !== 'basic' && updates.level !== 'advanced') {
    throw new Error('Mức độ câu hỏi chỉ được là "basic" hoặc "advanced".');
  }

  const now = new Date().toISOString();
  const updatedQ: ReviewQuestion = {
    ...target,
    question: updates.question !== undefined ? updates.question.trim() : target.question,
    answer: updates.answer !== undefined ? updates.answer.trim() : target.answer,
    level: updates.level || target.level,
    updatedAt: now,
  };

  const updatedAll = allQuestions.map((q) => (q.id === id ? updatedQ : q));
  saveQuestions(updatedAll, ownerId);

  return updatedQ;
}

/**
 * Delete a single question by id
 */
export function deleteQuestion(id: string, ownerId?: string): boolean {
  const allQuestions = loadAllQuestions(ownerId);
  const filtered = allQuestions.filter((q) => q.id !== id);
  if (filtered.length === allQuestions.length) return false;

  saveQuestions(filtered, ownerId);
  return true;
}

/**
 * Validate ClassGo JSON Schema for Review Question Bank
 */
export interface JsonBankValidationResult {
  isValid: boolean;
  error?: string;
  warnings: string[];
  bankData?: {
    subject: string;
    grade: string;
    semester?: string;
    sectionName?: string;
    lessonId: string;
    lessonName: string;
  };
  validQuestions: Array<{
    id: string;
    level: ReviewQuestionLevel;
    question: string;
    answer: string;
  }>;
  invalidQuestions: Array<{
    raw: any;
    reason: string;
  }>;
  duplicateCountWithExistingBank?: number;
}

export function validateJsonQuestionBank(
  rawJson: any,
  existingBankQuestions: ReviewQuestion[] = []
): JsonBankValidationResult {
  const warnings: string[] = [];

  if (!rawJson || typeof rawJson !== 'object') {
    return {
      isValid: false,
      error: 'Dữ liệu JSON không đúng định dạng đối tượng.',
      warnings,
      validQuestions: [],
      invalidQuestions: [],
    };
  }

  // Schema checks
  if (rawJson.type !== 'classgo_review_question_bank') {
    return {
      isValid: false,
      error: 'Loại file không hợp lệ. type phải là "classgo_review_question_bank".',
      warnings,
      validQuestions: [],
      invalidQuestions: [],
    };
  }

  if (rawJson.version !== 1) {
    return {
      isValid: false,
      error: 'Phiên bản file không được hỗ trợ. version phải là 1.',
      warnings,
      validQuestions: [],
      invalidQuestions: [],
    };
  }

  if (!rawJson.subject || typeof rawJson.subject !== 'string' || !rawJson.subject.trim()) {
    return {
      isValid: false,
      error: 'Thiếu thông tin môn học (subject).',
      warnings,
      validQuestions: [],
      invalidQuestions: [],
    };
  }

  if (!rawJson.grade || (!String(rawJson.grade).trim())) {
    return {
      isValid: false,
      error: 'Thiếu thông tin khối lớp (grade).',
      warnings,
      validQuestions: [],
      invalidQuestions: [],
    };
  }

  if (!rawJson.lessonId || typeof rawJson.lessonId !== 'string' || !rawJson.lessonId.trim()) {
    return {
      isValid: false,
      error: 'Thiếu mã bài học (lessonId).',
      warnings,
      validQuestions: [],
      invalidQuestions: [],
    };
  }

  if (!rawJson.lessonName || typeof rawJson.lessonName !== 'string' || !rawJson.lessonName.trim()) {
    return {
      isValid: false,
      error: 'Thiếu tên bài học (lessonName).',
      warnings,
      validQuestions: [],
      invalidQuestions: [],
    };
  }

  if (!Array.isArray(rawJson.questions)) {
    return {
      isValid: false,
      error: 'Trường "questions" phải là một mảng danh sách câu hỏi.',
      warnings,
      validQuestions: [],
      invalidQuestions: [],
    };
  }

  const existingIds = new Set(existingBankQuestions.map((q) => q.id));
  const seenInFileIds = new Set<string>();

  const validQuestions: Array<{
    id: string;
    level: ReviewQuestionLevel;
    question: string;
    answer: string;
  }> = [];

  const invalidQuestions: Array<{
    raw: any;
    reason: string;
  }> = [];

  let duplicateCountWithExisting = 0;

  rawJson.questions.forEach((qItem: any, index: number) => {
    if (!qItem || typeof qItem !== 'object') {
      invalidQuestions.push({ raw: qItem, reason: `Câu số ${index + 1}: Không phải đối tượng hợp lệ.` });
      return;
    }

    const id = qItem.id ? String(qItem.id).trim() : '';
    const question = qItem.question ? String(qItem.question).trim() : '';
    const answer = qItem.answer ? String(qItem.answer).trim() : '';
    const rawLevel = qItem.level ? String(qItem.level).trim().toLowerCase() : '';

    if (!id) {
      invalidQuestions.push({ raw: qItem, reason: `Câu số ${index + 1}: Thiếu ID câu hỏi.` });
      return;
    }

    if (!question) {
      invalidQuestions.push({ raw: qItem, reason: `Câu [${id}]: Nội dung câu hỏi bị trống.` });
      return;
    }

    if (!answer) {
      invalidQuestions.push({ raw: qItem, reason: `Câu [${id}]: Đáp án câu hỏi bị trống.` });
      return;
    }

    // Strict level check: basic or advanced ONLY. Do NOT guess!
    let level: ReviewQuestionLevel;
    if (rawLevel === 'basic' || rawLevel === 'cơ bản') {
      level = 'basic';
    } else if (rawLevel === 'advanced' || rawLevel === 'nâng cao') {
      level = 'advanced';
    } else {
      invalidQuestions.push({
        raw: qItem,
        reason: `Câu [${id}]: Mức độ "${qItem.level}" không hợp lệ (chỉ chấp nhận "basic" hoặc "advanced").`,
      });
      return;
    }

    if (existingIds.has(id) || seenInFileIds.has(id)) {
      duplicateCountWithExisting++;
      warnings.push(`Câu [${id}] bị trùng ID đã tồn tại, sẽ được bỏ qua an toàn.`);
      return;
    }

    seenInFileIds.add(id);
    validQuestions.push({
      id,
      level,
      question,
      answer,
    });
  });

  return {
    isValid: true,
    warnings,
    bankData: {
      subject: rawJson.subject.trim(),
      grade: String(rawJson.grade).trim(),
      semester: rawJson.semester ? String(rawJson.semester).trim() : '1',
      sectionName: rawJson.sectionName ? String(rawJson.sectionName).trim() : '',
      lessonId: rawJson.lessonId.trim(),
      lessonName: rawJson.lessonName.trim(),
    },
    validQuestions,
    invalidQuestions,
    duplicateCountWithExistingBank: duplicateCountWithExisting,
  };
}

/**
 * Parse Excel file for question importing
 */
export interface ExcelQuestionParseResult {
  totalRows: number;
  validRows: Array<{
    id: string;
    level: ReviewQuestionLevel;
    question: string;
    answer: string;
  }>;
  invalidRows: Array<{
    rowNumber: number;
    reason: string;
    raw: any;
  }>;
  basicCount: number;
  advancedCount: number;
}

export function parseExcelQuestions(fileBuffer: ArrayBuffer): ExcelQuestionParseResult {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

  const validRows: ExcelQuestionParseResult['validRows'] = [];
  const invalidRows: ExcelQuestionParseResult['invalidRows'] = [];
  let basicCount = 0;
  let advancedCount = 0;

  jsonData.forEach((row, idx) => {
    const rowNum = idx + 2; // Accounting for 1-based index and header

    // Find columns by aliases
    let rawLevel = '';
    let rawQuestion = '';
    let rawAnswer = '';
    let customId = '';

    for (const [key, val] of Object.entries(row)) {
      const k = key
        .trim()
        .toLowerCase()
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const strVal = String(val).trim();

      if (k === 'muc do' || k === 'level' || k === 'do kho') {
        rawLevel = strVal;
      } else if (k === 'cau hoi' || k === 'question' || k === 'noi dung' || k === 'de bai') {
        rawQuestion = strVal;
      } else if (k === 'dap an' || k === 'answer' || k === 'loi giai' || k === 'giai') {
        rawAnswer = strVal;
      } else if (k === 'id' || k === 'ma' || k === 'stt' || k === 'ma cau') {
        customId = strVal;
      }
    }

    if (!rawQuestion && !rawAnswer && !rawLevel) {
      // Empty row, skip silently
      return;
    }

    if (!rawQuestion) {
      invalidRows.push({ rowNumber: rowNum, reason: 'Nội dung câu hỏi bị trống.', raw: row });
      return;
    }

    if (!rawAnswer) {
      invalidRows.push({ rowNumber: rowNum, reason: 'Đáp án bị trống.', raw: row });
      return;
    }

    // Map level strictly without guessing
    const normLevel = rawLevel
      .trim()
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    let mappedLevel: ReviewQuestionLevel | null = null;

    if (normLevel === 'co ban' || normLevel === 'basic' || normLevel === 'cb') {
      mappedLevel = 'basic';
    } else if (normLevel === 'nang cao' || normLevel === 'advanced' || normLevel === 'nc') {
      mappedLevel = 'advanced';
    }

    if (!mappedLevel) {
      invalidRows.push({
        rowNumber: rowNum,
        reason: `Mức độ "${rawLevel}" không hợp lệ. Chỉ chấp nhận "Cơ bản" hoặc "Nâng cao".`,
        raw: row,
      });
      return;
    }

    if (mappedLevel === 'basic') basicCount++;
    if (mappedLevel === 'advanced') advancedCount++;

    const finalId = customId || `q_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;

    validRows.push({
      id: finalId,
      level: mappedLevel,
      question: rawQuestion,
      answer: rawAnswer,
    });
  });

  return {
    totalRows: jsonData.length,
    validRows,
    invalidRows,
    basicCount,
    advancedCount,
  };
}

/**
 * Export a question bank to ClassGo JSON format (Version 1)
 */
export function exportBankToJson(bankId: string, ownerId?: string): ClassGoJsonQuestionBankImport | null {
  const banks = loadQuestionBanks(ownerId);
  const targetBank = banks.find((b) => b.id === bankId);
  if (!targetBank) return null;

  const questions = loadQuestionsForBank(bankId, ownerId);

  const cleanQuestions = questions.map((q) => ({
    id: q.id,
    level: q.level,
    question: q.question,
    answer: q.answer,
  }));

  const payload: ClassGoJsonQuestionBankImport = {
    version: 1,
    type: 'classgo_review_question_bank',
    subject: targetBank.subject,
    grade: targetBank.grade,
    semester: targetBank.semester || '1',
    sectionName: targetBank.sectionName || '',
    lessonId: targetBank.lessonId,
    lessonName: targetBank.lessonName,
    questions: cleanQuestions,
  };

  return payload;
}

/**
 * Prepared helper for Mystery Door / Spotlights:
 * Safely fetches questions without mutating data, respecting level and count limit.
 */
export function getReviewQuestions(params: {
  lessonId: string;
  level: ReviewQuestionLevel;
  count: number;
  excludeIds?: string[];
  ownerId?: string;
  bankId?: string;
}): ReviewQuestion[] {
  const { lessonId, level, count, excludeIds = [], ownerId, bankId } = params;

  if (count <= 0) return [];

  const allQuestions = loadAllQuestions(ownerId);
  const banks = loadQuestionBanks(ownerId);

  // Match bank by bankId or lessonId
  let targetBankIds: Set<string>;
  if (bankId) {
    targetBankIds = new Set([bankId]);
  } else {
    const matchedBanks = banks.filter((b) => b.lessonId === lessonId);
    targetBankIds = new Set(matchedBanks.map((b) => b.id));
  }

  const excludeSet = new Set(excludeIds);

  // Filter matching questions
  const candidateQuestions = allQuestions.filter((q) => {
    // 1. Matches bank / lesson
    if (!targetBankIds.has(q.bankId)) return false;
    // 2. Matches exact level (basic stays basic, advanced stays advanced)
    if (q.level !== level) return false;
    // 3. Not in exclude list
    if (excludeSet.has(q.id)) return false;
    return true;
  });

  // Return up to count without mutating original data
  return candidateQuestions.slice(0, count).map((q) => ({ ...q }));
}

/**
 * Phase 2 & Hotfix 2A: Parameters for generating questions via Gemini AI backend
 */
export interface GenerateAiQuestionsParams {
  subject: string;
  bookSeries?: string; // e.g. "Kết nối tri thức với cuộc sống"
  grade: string;
  semester?: string;
  sectionName?: string;
  lessonName: string;
  count: number;
  level: ReviewQuestionLevel; // Strictly 'basic' | 'advanced' - No mixed batch
  customPrompt?: string;
  existingQuestions?: string[];
}

/**
 * Draft question returned from AI before teacher approval
 */
export interface GeneratedAiQuestionDraft {
  tempId: string;
  level: ReviewQuestionLevel;
  question: string;
  answer: string;
  selected: boolean;
}

/**
 * Calls backend API /api/generate-questions to generate review questions using Gemini
 */
export async function generateQuestionsViaAi(
  params: GenerateAiQuestionsParams
): Promise<Array<{ level: ReviewQuestionLevel; question: string; answer: string }>> {
  const data = await requestAiQuestions({ ...params,
    // Match the bounded context the existing server prompt used; preserve the full bank on the device.
    existingQuestions: params.existingQuestions?.slice(0, 25).map(q => q.slice(0, 500)),
  });

  // Strict validation: Reject any item that does not match the requested level
  return data.questions
    .filter((q: any) => q && q.level === params.level && q.question && q.answer)
    .map((q: any) => ({
      level: params.level,
      question: String(q.question).trim(),
      answer: String(q.answer).trim(),
    }));
}

/**
 * Phase 3: Batch generation types for multiple lessons
 */
export interface BatchLessonItem {
  id: string; // temp id or existing bankId
  lessonName: string;
  bankId?: string;
  selected: boolean;
  basicCount?: number; // Per-lesson customization
  advancedCount?: number; // Per-lesson customization
  existingCount?: { basic: number; advanced: number; total: number };
}

export interface BatchLessonAiResult {
  lessonId: string;
  lessonName: string;
  bankId?: string;
  status: 'pending' | 'generating' | 'success' | 'error';
  errorMessage?: string;
  drafts: GeneratedAiQuestionDraft[];
  expanded?: boolean;
}

export interface BatchAiGenerateConfig {
  subject: string;
  bookSeries?: string;
  grade: string;
  semester: string;
  sectionName: string;
  lessons: Array<{ lessonName: string; bankId?: string; basicCount?: number; advancedCount?: number }>;
  basicCount: number; // 0, 5, 10, 15, 20
  advancedCount: number; // 0, 5, 10, 15, 20
  customPrompt?: string;
}

/**
 * Execute batch question generation for a single lesson (basic + advanced strictly sequential)
 */
export async function generateLessonBatchQuestions(params: {
  subject: string;
  bookSeries?: string;
  grade: string;
  semester?: string;
  sectionName?: string;
  lessonName: string;
  basicCount: number;
  advancedCount: number;
  customPrompt?: string;
  existingQuestions?: string[];
  onProgress?: (stage: 'basic' | 'advanced') => void;
}): Promise<GeneratedAiQuestionDraft[]> {
  const {
    subject,
    bookSeries,
    grade,
    semester,
    sectionName,
    lessonName,
    basicCount,
    advancedCount,
    customPrompt,
    existingQuestions = [],
    onProgress,
  } = params;

  const results: GeneratedAiQuestionDraft[] = [];

  // 1. Generate basic if requested
  if (basicCount > 0) {
    if (onProgress) onProgress('basic');
    const basicRes = await generateQuestionsViaAi({
      subject,
      bookSeries,
      grade,
      semester,
      sectionName,
      lessonName,
      count: basicCount,
      level: 'basic',
      customPrompt,
      existingQuestions,
    });
    for (const q of basicRes) {
      results.push({
        tempId: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        level: 'basic',
        question: q.question,
        answer: q.answer,
        selected: true,
      });
    }
  }

  // 2. Generate advanced if requested
  if (advancedCount > 0) {
    if (onProgress) onProgress('advanced');
    const combinedExisting = [
      ...existingQuestions,
      ...results.map((r) => r.question),
    ];
    const advRes = await generateQuestionsViaAi({
      subject,
      bookSeries,
      grade,
      semester,
      sectionName,
      lessonName,
      count: advancedCount,
      level: 'advanced',
      customPrompt,
      existingQuestions: combinedExisting,
    });
    for (const q of advRes) {
      results.push({
        tempId: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        level: 'advanced',
        question: q.question,
        answer: q.answer,
        selected: true,
      });
    }
  }

  return results;
}
