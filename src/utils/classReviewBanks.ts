import type { ClassRoom, ReviewQuestionBank } from '../types';
/** Adapter only: retains ClassRoom.questions and the teacher's original IDs, no migration/write. */
export function classReviewBanks(cls: ClassRoom): ReviewQuestionBank[] {
  const grouped = new Map<string, ReviewQuestionBank>();
  for (const q of cls.questions || []) {
    const lesson = q.lesson || 'Câu hỏi của lớp';
    const subject = q.subject || cls.subject || 'Toán';
    const grade = q.grade || cls.name.match(/\d+/)?.[0] || '';
    const key = JSON.stringify([subject, grade, q.chapter, lesson, q.semester]);
    let bank = grouped.get(key);
    if (!bank) {
      const id = `class-bank-${cls.id}-${grouped.size}`;
      bank = { id, subject, grade, lessonId: id, lessonName: lesson, sectionName: q.chapter,
        semester: q.semester, createdAt: cls.createdAt, updatedAt: cls.updatedAt || cls.createdAt,
        inlineQuestions: [] };
      grouped.set(key, bank);
    }
    bank.inlineQuestions!.push({ id: q.id, bankId: bank.id, question: q.content,
      answer: q.suggestedAnswer || '', level: q.reviewLevel || (q.level === 'Khó' ? 'advanced' : 'basic'), source: 'import' });
  }
  return [...grouped.values()];
}
