import type { QuestionItem } from '../types';

export type BankTarget = { className: string; subject?: string };
export type BankImportResult = { items: QuestionItem[]; skipped: number; error?: string; label?: string };
type RawBank = Record<string, unknown>;
type RawQuestion = Record<string, unknown>;
const getText = (v: unknown) => typeof v === 'string' ? v.trim() : '';
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
const keyOf = (q: QuestionItem) => [q.chapter || '', q.lesson || '', q.content].map(normalize).join('|');
const getGrade = (name: string) => name.match(/(?:^|\D)([6789])(?=[A-Za-z0-9.]|$)/)?.[1] || '';
const getLevel = (value: unknown): 'basic' | 'advanced' | null => {
  const v = normalize(getText(value));
  return ['basic', 'co ban', 'cb'].includes(v) ? 'basic'
    : ['advanced', 'nang cao', 'nc'].includes(v) ? 'advanced' : null;
};

/** Accept only ClassGo Review Bank v1, no writes until teacher confirms. */
export function importReviewBankJson(raw: unknown, existing: readonly QuestionItem[],
  target?: BankTarget): BankImportResult {
  const reject = (error: string): BankImportResult => ({ items: [], skipped: 0, error });
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return reject('JSON không hợp lệ.');
  const b = raw as RawBank;
  if (b.type !== 'classgo_review_question_bank' || b.version !== 1)
    return reject('Tệp cần có type classgo_review_question_bank và version 1.');
  const subject = getText(b.subject), grade = String(b.grade ?? '').trim();
  const chapter = getText(b.sectionName), lesson = getText(b.lessonName);
  if (!subject || !/^[6789]$/.test(grade) || !getText(b.lessonId) || !lesson)
    return reject('Thiếu thông tin môn, khối THCS, mã hoặc tên bài học.');
  if (!Array.isArray(b.questions)) return reject('Thiếu danh sách câu hỏi.');
  if (b.questions.length > 500) return reject('Một lần nhập tối đa 500 câu.');
  if (target) {
    const targetGrade = getGrade(target.className);
    if (targetGrade && targetGrade !== grade)
      return reject('Tệp khối ' + grade + ' không phù hợp lớp ' + target.className + '.');
    const targetSubject = normalize(target.subject || '').replace(/[6789]/g, '').trim();
    const bankSubject = normalize(subject);
    if (targetSubject && !targetSubject.includes(bankSubject) && !bankSubject.includes(targetSubject))
      return reject('Môn học tệp (' + subject + ') không khớp môn của lớp (' + target.subject + ').');
  }
  const seenKeys = new Set(existing.map(keyOf));
  const seenIds = new Set<string>();
  const items: QuestionItem[] = [];
  let skipped = 0;
  for (const [index, rawQ] of b.questions.entries()) {
    if (!rawQ || typeof rawQ !== 'object' || Array.isArray(rawQ)) { skipped++; continue; }
    const q = rawQ as RawQuestion;
    const sourceId = getText(q.id), content = getText(q.question), answer = getText(q.answer);
    const level = getLevel(q.level);
    if (!sourceId || !content || !answer || !level || seenIds.has(sourceId)) { skipped++; continue; }
    seenIds.add(sourceId);
    const item: QuestionItem = {
      id: 'review-import-' + Date.now() + '-' + index + '-' + Math.random().toString(36).slice(2, 7),
      content, suggestedAnswer: answer, subject, grade,
      semester: getText(b.semester) || '1', chapter, lesson, reviewLevel: level,
      level: level === 'advanced' ? 'Khó' : 'Dễ'
    };
    const key = keyOf(item);
    if (seenKeys.has(key)) { skipped++; continue; }
    seenKeys.add(key);
    items.push(item);
  }
  return { items, skipped, label: subject + ' ' + grade + ' — ' + lesson };
}
