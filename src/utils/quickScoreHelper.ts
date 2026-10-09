import { Student } from '../types';

export const TX_COLUMNS = ['tx1', 'tx2', 'tx3', 'tx4'] as const;
export type TxColumn = typeof TX_COLUMNS[number];

/**
 * Checks if a TX score cell is already filled with a valid numeric score.
 * An active score must be a number and not NaN.
 */
export function isTxSlotFilled(val: unknown): boolean {
  return typeof val === 'number' && !isNaN(val);
}

/**
 * Checks if a TX score cell is considered empty / available:
 * undefined, null, NaN, or empty / whitespace string.
 */
export function isTxSlotEmpty(val: unknown): boolean {
  if (val === undefined || val === null) return true;
  if (typeof val === 'number') return isNaN(val);
  if (typeof val === 'string') return val.trim() === '';
  return false;
}

/**
 * Parses raw score input into a valid number from 0 to 10 rounded to 1 decimal place.
 * Returns null if the value is not a valid score between 0 and 10 (e.g. 'Đạt', 'Chưa đạt', '', etc.).
 */
export function parseNumericScore(val: unknown): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') {
    return !isNaN(val) && val >= 0 && val <= 10 ? Math.round(val * 10) / 10 : null;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '') return null;
    const normalized = trimmed.replace(',', '.');
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 10) {
      return Math.round(parsed * 10) / 10;
    }
  }
  return null;
}

/**
 * Finds the first available TX slot among TX1 -> TX2 -> TX3 -> TX4.
 * Returns null if all 4 slots are already filled.
 */
export function findFirstAvailableTxSlot(scores?: Student['scores']): TxColumn | null {
  const currentScores = scores || {};
  for (const col of TX_COLUMNS) {
    if (!isTxSlotFilled(currentScores[col])) {
      return col;
    }
  }
  return null;
}

export interface QuickScoreResult {
  updatedStudent: Student;
  targetSlot: TxColumn | null;
  isFull: boolean;
  numericScore: number | null;
}

/**
 * Safely applies a quick score to a student's scores:
 * - Never overwrites pre-existing scores.
 * - If preferredSlot is provided (e.g. from the same turn being updated), updates that slot.
 * - Otherwise searches for the first empty slot: TX1 -> TX2 -> TX3 -> TX4.
 * - If all 4 slots are filled, leaves scores unchanged and marks isFull = true.
 */
export function applyQuickScoreToStudent(
  student: Student,
  rawScore: string | number | undefined | null,
  note?: string,
  preferredSlot?: TxColumn | null
): QuickScoreResult {
  const numericScore = parseNumericScore(rawScore);
  const currentScores: NonNullable<Student['scores']> = { ...(student.scores || {}) };

  let targetSlot: TxColumn | null = null;
  let isFull = false;

  if (numericScore !== null) {
    if (preferredSlot && TX_COLUMNS.includes(preferredSlot)) {
      targetSlot = preferredSlot;
      currentScores[preferredSlot] = numericScore;
    } else {
      const firstAvailable = findFirstAvailableTxSlot(student.scores);
      if (firstAvailable) {
        targetSlot = firstAvailable;
        currentScores[firstAvailable] = numericScore;
      } else {
        isFull = true;
      }
    }
  }

  const updatedNotes =
    note !== undefined && note.trim() !== ''
      ? note.trim()
      : student.notes;

  const updatedStudent: Student = {
    ...student,
    notes: updatedNotes,
    scores: currentScores,
  };

  return {
    updatedStudent,
    targetSlot,
    isFull,
    numericScore,
  };
}

/**
 * Formats a user-friendly feedback message for the teacher.
 */
export function getScoreFeedbackMessage(
  studentName: string,
  targetSlot: TxColumn | null,
  isFull: boolean,
  rawScore?: string | number
): string {
  if (isFull) {
    return `⚠️ ${studentName}: Đã đủ 4 điểm thường xuyên (TX1-TX4). Điểm ${rawScore ?? ''} đã lưu vào Lịch sử nhưng không thể ghi thêm vào Sổ điểm.`;
  }
  if (targetSlot) {
    return `✅ ${studentName}: Đã ghi điểm ${rawScore} vào ô ${targetSlot.toUpperCase()} trong Sổ điểm`;
  }
  if (rawScore !== undefined && rawScore !== null && String(rawScore).trim() !== '') {
    return `✅ ${studentName}: Đã lưu đánh giá "${rawScore}" vào Lịch sử gọi`;
  }
  return `✅ ${studentName}: Đã lưu ghi chú`;
}
