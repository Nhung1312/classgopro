import { ArenaQuestion, ArenaQuestionOption } from '../../types/arenaTypes';
import { ReviewQuestion, ReviewQuestionBank } from '../../types';
import { parseQuestionChoices } from '../../utils/questionParser';
import { loadQuestionsForBank } from '../../services/reviewQuestionService';

export interface QuestionValidationResult {
  question: ArenaQuestion;
  isValid: boolean;
  missingField?: 'options' | 'correctKey' | 'stem';
  rawQuestion?: ReviewQuestion;
}

/**
 * Validates and transforms a ReviewQuestion from the bank into an ArenaQuestion.
 * Strictly adheres to rule: NEVER default to 'A' if correctKey is missing.
 */
export function validateAndConvertReviewQuestion(
  q: ReviewQuestion,
  bank?: ReviewQuestionBank
): QuestionValidationResult {
  const parsed = parseQuestionChoices(q.question, q.answer);

  const options: ArenaQuestionOption[] = (parsed.options || []).map((opt) => ({
    key: opt.key,
    text: opt.text.trim(),
  }));

  const correctKey = parsed.correctKey;
  const stem = parsed.stem ? parsed.stem.trim() : q.question.trim();

  const arenaQ: ArenaQuestion = {
    id: q.id,
    stem,
    options,
    correctKey: correctKey || 'A', // placeholder if invalid, but isValid will be false
    explanation: q.answer,
    level: q.level,
    bankId: q.bankId,
    lessonName: bank?.lessonName,
  };

  if (!stem) {
    return { question: arenaQ, isValid: false, missingField: 'stem', rawQuestion: q };
  }

  // Must have exactly 4 choices (A, B, C, D)
  const optionKeys = options.map((o) => o.key).join('');
  if (options.length !== 4 || optionKeys !== 'ABCD' || options.some((o) => !o.text)) {
    return { question: arenaQ, isValid: false, missingField: 'options', rawQuestion: q };
  }

  // Must have a valid correct key that is explicitly A, B, C, or D
  if (!correctKey || !['A', 'B', 'C', 'D'].includes(correctKey)) {
    return { question: arenaQ, isValid: false, missingField: 'correctKey', rawQuestion: q };
  }

  arenaQ.correctKey = correctKey;
  return { question: arenaQ, isValid: true, rawQuestion: q };
}

/**
 * Load all questions from a bank and classify valid vs needs-attention
 */
export function loadArenaQuestionsFromBank(
  bankId: string,
  ownerId?: string,
  bank?: ReviewQuestionBank
): {
  validQuestions: ArenaQuestion[];
  invalidQuestions: QuestionValidationResult[];
} {
  const rawList = loadQuestionsForBank(bankId, ownerId);
  const validQuestions: ArenaQuestion[] = [];
  const invalidQuestions: QuestionValidationResult[] = [];

  rawList.forEach((q) => {
    const res = validateAndConvertReviewQuestion(q, bank);
    if (res.isValid) {
      validQuestions.push(res.question);
    } else {
      invalidQuestions.push(res);
    }
  });

  return { validQuestions, invalidQuestions };
}

/**
 * Creates a quick on-the-fly arena question
 */
export function createQuickArenaQuestion(
  stem: string,
  options: { A: string; B: string; C: string; D: string },
  correctKey: 'A' | 'B' | 'C' | 'D',
  explanation?: string
): ArenaQuestion {
  return {
    id: `quick-arena-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    stem: stem.trim(),
    options: [
      { key: 'A', text: options.A.trim() },
      { key: 'B', text: options.B.trim() },
      { key: 'C', text: options.C.trim() },
      { key: 'D', text: options.D.trim() },
    ],
    correctKey,
    explanation: explanation?.trim(),
  };
}

/**
 * Built-in sample arena questions for immediate testing & demo
 * Covers Middle school Math with KaTeX formulas
 */
export const SAMPLE_ARENA_QUESTIONS: ArenaQuestion[] = [
  {
    id: 'arena-demo-1',
    stem: 'Số đối của số hữu tỉ $\\frac{3}{5}$ là số nào sau đây?',
    options: [
      { key: 'A', text: '$-\\frac{3}{5}$' },
      { key: 'B', text: '$\\frac{5}{3}$' },
      { key: 'C', text: '$-\\frac{5}{3}$' },
      { key: 'D', text: '$\\frac{3}{-5}$ và $0$' },
    ],
    correctKey: 'A',
    explanation: 'Số đối của số hữu tỉ $\\frac{a}{b}$ là $-\\frac{a}{b}$. Do đó số đối của $\\frac{3}{5}$ là $-\\frac{3}{5}$.',
  },
  {
    id: 'arena-demo-2',
    stem: 'Kết quả của phép tính $(-2)^3 \\cdot (-2)^2$ bằng bao nhiêu?',
    options: [
      { key: 'A', text: '$(-2)^6$' },
      { key: 'B', text: '$(-2)^5 = -32$' },
      { key: 'C', text: '$(-4)^5$' },
      { key: 'D', text: '$32$' },
    ],
    correctKey: 'B',
    explanation: 'Theo quy tắc nhân hai lũy thừa cùng cơ số: $a^m \\cdot a^n = a^{m+n}$. Do đó $(-2)^3 \\cdot (-2)^2 = (-2)^5 = -32$.',
  },
  {
    id: 'arena-demo-3',
    stem: 'Trong các phân số sau, phân số nào viết được dưới dạng số thập phân hữu hạn?',
    options: [
      { key: 'A', text: '$\\frac{1}{3}$' },
      { key: 'B', text: '$\\frac{7}{15}$' },
      { key: 'C', text: '$\\frac{3}{8}$' },
      { key: 'D', text: '$\\frac{5}{7}$' },
    ],
    correctKey: 'C',
    explanation: 'Mẫu số $8 = 2^3$ chỉ chứa ước nguyên tố 2, nên $\\frac{3}{8} = 0,375$ là số thập phân hữu hạn.',
  },
  {
    id: 'arena-demo-4',
    stem: 'Hằng đẳng thức $(A + B)^2$ khai triển thành:',
    options: [
      { key: 'A', text: '$A^2 + B^2$' },
      { key: 'B', text: '$A^2 - 2AB + B^2$' },
      { key: 'C', text: '$A^2 + 2AB + B^2$' },
      { key: 'D', text: '$A^2 + AB + B^2$' },
    ],
    correctKey: 'C',
    explanation: 'Bình phương của một tổng: $(A + B)^2 = A^2 + 2AB + B^2$.',
  },
  {
    id: 'arena-demo-5',
    stem: 'Tổng ba góc trong một tam giác luôn bằng bao nhiêu độ?',
    options: [
      { key: 'A', text: '$90^\\circ$' },
      { key: 'B', text: '$180^\\circ$' },
      { key: 'C', text: '$360^\\circ$' },
      { key: 'D', text: '$270^\\circ$' },
    ],
    correctKey: 'B',
    explanation: 'Định lý: Tổng ba góc của một tam giác luôn bằng $180^\\circ$.',
  },
];
