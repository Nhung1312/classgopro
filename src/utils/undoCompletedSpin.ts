import type { ClassRoom, HistoryRecord } from '../types';

/** Revert exactly the records from the last completed selection. */
export function undoCompletedSpin(
  classes: ClassRoom[],
  history: HistoryRecord[],
  recordId: string,
  selectedStudentIds?: string[],
): { classes: ClassRoom[]; history: HistoryRecord[] } | null {
  const anchor = history.find((entry) => entry.id === recordId);
  if (!anchor) return null;

  const studentIds = new Set(selectedStudentIds?.length ? selectedStudentIds : [anchor.studentId]);
  if (!studentIds.has(anchor.studentId)) return null;

  // Every record from one multi-pick shares the same timestamp and class.
  // Never undo another student's older (or newer) call.
  const records = history.filter((entry) =>
    entry.classId === anchor.classId &&
    entry.timestamp === anchor.timestamp &&
    studentIds.has(entry.studentId)
  );
  if (records.length !== studentIds.size || new Set(records.map((r) => r.studentId)).size !== studentIds.size) {
    return null; // Incomplete/ambiguous history: do not alter saved counters.
  }

  const targetClass = classes.find((cls) => cls.id === anchor.classId);
  if (!targetClass || ![...studentIds].every((id) => targetClass.students.some((s) => s.id === id))) {
    return null;
  }

  const byStudent = new Map(records.map((r) => [r.studentId, r]));
  const undoneRecordIds = new Set(records.map((r) => r.id));
  const restoredClasses = classes.map((cls) => {
    if (cls.id !== anchor.classId) return cls;
    return {
      ...cls,
      students: cls.students.map((student) => {
        const record = byStudent.get(student.id);
        if (!record) return student;
        const scores = student.scores ? { ...student.scores } : {};
        if (record.assignedTxSlot && scores[record.assignedTxSlot] !== undefined) {
          scores[record.assignedTxSlot] = null;
        }
        return {
          ...student,
          callCount: Math.max(0, (student.callCount || 0) - 1),
          scores,
        };
      }),
    };
  });

  return {
    classes: restoredClasses,
    history: history.filter((record) => !undoneRecordIds.has(record.id)),
  };
}
