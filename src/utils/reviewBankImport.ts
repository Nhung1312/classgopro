import type { QuestionItem } from '../types';

type SourceItem = { question?: string; answer?: string; level?: string };
type SourceBank = {
  type?: string; subject?: string; semester?: string; sectionName?: string;
  lessonName?: string; questions?: SourceItem[];
};
const normalized = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/\s+/g, ' ').trim();
const keyOf = (q: QuestionItem) => [q.chapter || '', q.lesson || '', q.content].map(normalized).join('|');

export function importReviewBankJson(
  raw: unknown, existing: readonly QuestionItem[]
): { items: QuestionItem[]; skipped: number } {
  if (!raw || typeof raw !== 'object') return { items: [], skipped: 0 };
  const bank = raw as SourceBank;
  if (bank.type !== 'classgo_review_question_bank' || !Array.isArray(bank.questions))
    return { items: [], skipped: 0 };
  const keys = new Set(existing.map(keyOf));
  const items: QuestionItem[] = [];
  let skipped = 0;
  for (const [index, item] of bank.questions.entries()) {
    if (!item || typeof item.question !== 'string' || !item.question.trim() ||
        (item.level !== 'basic' && item.level !== 'advanced')) { skipped++; continue; }
    const mapped: QuestionItem = {
      id: `review-import-${Date.now()}-${index}-${Math.random().toString(36).slice(2,7)}`,
      content: item.question.trim(),
      suggestedAnswer: typeof item.answer === 'string' ? item.answer : undefined,
      subject: bank.subject, semester: bank.semester,
      chapter: bank.sectionName, lesson: bank.lessonName,
      reviewLevel: item.level, level: item.level === 'advanced' ? 'Khó' : 'Dễ',
    };
    const key = keyOf(mapped);
    if (keys.has(key)) { skipped++; continue; }
    keys.add(key); items.push(mapped);
  }
  return { items, skipped };
}
