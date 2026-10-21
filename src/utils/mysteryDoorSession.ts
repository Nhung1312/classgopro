import type { QuestionItem } from '../types';

export const DOOR_COUNTS = [2, 4, 6, 8, 10] as const;
export type Door = { number: number; question: QuestionItem; opened: boolean };

export function shuffleQuestions<T>(source: readonly T[], random: () => number = Math.random): T[] {
  const result = [...source];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function prepareDoors(
  questions: readonly QuestionItem[],
  count: number,
  usedIds: readonly string[],
  random: () => number = Math.random
): Door[] {
  if (!DOOR_COUNTS.includes(count as typeof DOOR_COUNTS[number])) return [];
  const used = new Set(usedIds);
  const distinct = [...new Map(questions.filter(q => q.id && q.content.trim()).map(q => [q.id, q])).values()];
  const available = distinct.filter(q => !used.has(q.id));
  if (available.length < count) return [];
  return shuffleQuestions(available, random).slice(0, count)
    .map((question, i) => ({ number: i + 1, question, opened: false }));
}

export function markDoorOpened(doors: readonly Door[], number: number): Door[] {
  return doors.map(d => d.number === number ? { ...d, opened: true } : d);
}
