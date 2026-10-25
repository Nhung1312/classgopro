import type { QuestionItem } from '../types';

export type ReviewExcelStats = { items: QuestionItem[]; skipped: number };
const norm = (s: string) => s.trim().toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ');
const aliases = (key: string) => norm(key);
const keyOf = (q: QuestionItem) => [q.chapter||'', q.lesson||'', q.content].map(norm).join('|');

export function convertExcelReviewRows(
  rows: Record<string, unknown>[], context: {
    subject?: string; grade?: string; chapter: string; lesson: string
  }, existing: readonly QuestionItem[] = []
): ReviewExcelStats {
  const known = new Set(existing.map(keyOf));
  const items: QuestionItem[] = [];
  let skipped = 0;
  rows.forEach((row, index) => {
    const values: Record<string,string> = {};
    Object.entries(row).forEach(([heading, value]) => {
      values[aliases(heading)] = String(value ?? '').trim();
    });
    const question = values['cau hoi'] || values['question'] || values['noi dung'] || values['de bai'] || '';
    const answer = values['dap an'] || values['answer'] || values['loi giai'] || values['giai'] || '';
    const levelText = norm(values['muc do'] || values['level'] || values['do kho'] || '');
    const level = ['co ban','basic','cb'].includes(levelText) ? 'basic'
      : ['nang cao','advanced','nc'].includes(levelText) ? 'advanced' : null;
    if (!question || !answer || !level) { skipped++; return; }
    const item: QuestionItem = {
      id: 'review-excel-' + Date.now() + '-' + index + '-' + Math.random().toString(36).slice(2,7),
      content: question, suggestedAnswer: answer,
      subject: context.subject, grade: context.grade,
      chapter: context.chapter, lesson: context.lesson,
      reviewLevel: level, level: level === 'advanced' ? 'Khó' : 'Dễ',
    };
    const key = keyOf(item);
    if (known.has(key)) { skipped++; return; }
    known.add(key); items.push(item);
  });
  return { items, skipped };
}

/** The exact v1 JSON schema expected by Google AI Studio. */
export function buildReviewBankJson(input: {
  questions: readonly QuestionItem[]; subject: string; grade: string;
  chapter: string; lesson: string; semester?: string
}) {
  if (!/^[6789]$/.test(input.grade) || !input.subject.trim() || !input.lesson.trim())
    throw new Error('Thiếu tên môn, khối THCS hoặc bài học.');
  const questions = input.questions.filter(q =>
    (q.chapter || '') === input.chapter &&
    (q.lesson || '') === input.lesson &&
    q.content.trim() && q.suggestedAnswer?.trim()
  ).map(q => ({
    id: q.id,
    level: q.reviewLevel || (q.level === 'Khó' ? 'advanced' as const : 'basic' as const),
    question: q.content, answer: q.suggestedAnswer!.trim()
  }));
  if (!questions.length) throw new Error('Bài học không có câu hỏi kèm đáp án để xuất.');
  return {
    type: 'classgo_review_question_bank' as const, version: 1,
    subject: input.subject, grade: input.grade,
    semester: input.semester || '1', sectionName: input.chapter,
    lessonId: [input.subject,input.grade,input.lesson].join('-').normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-'),
    lessonName: input.lesson, questions
  };
}
