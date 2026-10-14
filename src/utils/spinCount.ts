import type { Student } from '../types';

/**
 * One completed round increments the chosen student's shared class counter
 * exactly once. Parent storage updates asynchronously; present the expected
 * count until the refreshed class roster arrives. All visual modes use this.
 */
export function resolveCompletedSpinStudents(selected: Student[], classStudents: Student[]): Student[] {
  const byId = new Map(classStudents.map(student => [student.id, student]));
  return selected.map(chosen => {
    const saved = byId.get(chosen.id) || chosen;
    const before = Math.max(0, Number(chosen.callCount) || 0);
    const persisted = Math.max(0, Number(saved.callCount) || 0);
    return { ...saved, callCount: Math.max(before + 1, persisted) };
  });
}
