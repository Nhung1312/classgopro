import type { ClassRoom, HistoryRecord } from '../types';
import type { TxColumn } from './quickScoreHelper';

/** Transfer only the exact history record the teacher confirmed; never overwrite a grade. */
export function transferHistoryScoreToTx(args: {
  classes: ClassRoom[]; history: HistoryRecord[]; studentId: string; classId: string;
  score: number; slot: TxColumn; recordId?: string;
}): { saved: boolean; classes: ClassRoom[]; history: HistoryRecord[] } {
  const { classes, history, studentId, classId, score, slot, recordId } = args;
  const fail = { saved: false, classes, history };
  const record = history.find(h => h.id === recordId);
  const student = classes.find(c => c.id === classId)?.students.find(s => s.id === studentId);
  if (!student || !record || record.studentId !== studentId || record.classId !== classId ||
      record.assignedTxSlot || !['tx1', 'tx2', 'tx3', 'tx4'].includes(slot) ||
      !Number.isFinite(score) || score < 0 || score > 10 || Number(record.score) !== score ||
      record.score === '' || record.score === undefined || record.score === null ||
      student.scores?.[slot] !== undefined && student.scores[slot] !== null) return fail;
  return { saved: true,
    classes: classes.map(c => c.id !== classId ? c : { ...c, students: c.students.map(s =>
      s.id !== studentId ? s : { ...s, scores: { ...s.scores, [slot]: score } }) }),
    history: history.map(h => h.id !== recordId ? h : { ...h, assignedTxSlot: slot }),
  };
}
