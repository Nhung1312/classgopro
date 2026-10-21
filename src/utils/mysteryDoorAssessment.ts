import type { ClassRoom, HistoryRecord, QuestionItem, SelectionMode, Student } from '../types';
import { applyQuickScoreToStudent, findFirstAvailableTxSlot } from './quickScoreHelper';

export type MysteryAssessmentUpdate = {
  outcome?: 'Đạt' | 'Chưa đạt';
  score?: number;
  saveToGradebook?: boolean;
};

export type MysteryAssessmentResult = {
  saved: boolean;
  message: string;
  classes: ClassRoom[];
  history: HistoryRecord[];
  txSlot?: 'tx1' | 'tx2' | 'tx3' | 'tx4' | null;
};

const failure = (classes: ClassRoom[], history: HistoryRecord[], message: string): MysteryAssessmentResult =>
  ({ saved: false, message, classes, history });

/** One id per opened door. Update the SAME review record for both rating and grade. */
export function applyMysteryDoorAssessment(args: {
  classes: ClassRoom[];
  history: HistoryRecord[];
  classId: string;
  studentId: string;
  question: QuestionItem;
  attemptId: string;
  mode: SelectionMode;
  change: MysteryAssessmentUpdate;
  timestamp?: Date;
}): MysteryAssessmentResult {
  const { classes, history, classId, studentId, question, attemptId, mode, change } = args;
  const cls = classes.find(c => c.id === classId);
  const student = cls?.students.find(s => s.id === studentId);
  if (!cls || !student || !attemptId.startsWith('review-') || !question.content.trim())
    return failure(classes, history, 'Không xác định được lớp, học sinh hoặc câu hỏi.');

  const existing = history.find(r => r.id === attemptId);
  if (existing && (existing.recordType !== 'MYSTERY_DOOR' ||
    existing.studentId !== studentId || existing.classId !== classId ||
    existing.questionContent !== question.content))
    return failure(classes, history, 'Mã lượt đánh giá bị trùng với một bản ghi khác.');

  const hasOutcome = change.outcome === 'Đạt' || change.outcome === 'Chưa đạt';
  const hasScore = change.score !== undefined;
  if (!hasOutcome && !hasScore) return failure(classes, history, 'Chưa chọn đánh giá hoặc điểm.');
  if (change.saveToGradebook && !hasScore)
    return failure(classes, history, 'Cần chọn điểm số trước khi ghi vào sổ.');
  if (hasOutcome && existing?.note?.includes('Ô cửa bí mật: Đạt') ||
      hasOutcome && existing?.note?.includes('Ô cửa bí mật: Chưa đạt'))
    return failure(classes, history, 'Lượt này đã có đánh giá Đạt/Chưa đạt.');
  if (hasScore && existing?.score !== undefined)
    return failure(classes, history, 'Điểm của câu hỏi này đã được lưu. Không ghi trùng.');
  if (hasScore && (!Number.isFinite(change.score) || change.score! < 0 ||
     change.score! > 10 || Math.round(change.score! * 10) / 10 !== change.score))
    return failure(classes, history, 'Điểm phải từ 0 đến 10, tối đa một chữ số thập phân.');

  let nextClasses = classes;
  let txSlot: MysteryAssessmentResult['txSlot'] = existing?.assignedTxSlot;
  if (hasScore && change.saveToGradebook) {
    const available = findFirstAvailableTxSlot(student.scores);
    if (!available)
      return failure(classes, history, 'Đã đủ TX1–TX4. Bỏ chọn ghi sổ để chỉ lưu điểm trong lịch sử.');
    const scoreResult = applyQuickScoreToStudent(student, change.score);
    if (!scoreResult.targetSlot || scoreResult.isFull)
      return failure(classes, history, 'Không tìm được ô điểm TX còn trống.');
    txSlot = scoreResult.targetSlot;
    nextClasses = classes.map(c => c.id === classId ? {
      ...c,
      students: c.students.map(s => s.id === studentId ? scoreResult.updatedStudent : s),
    } : c);
  }

  const now = args.timestamp || new Date();
  const record: HistoryRecord = {
    ...(existing || {}),
    id: attemptId,
    timestamp: existing?.timestamp || now.toISOString(),
    formattedDate: existing?.formattedDate || now.toLocaleDateString('vi-VN'),
    formattedTime: existing?.formattedTime || now.toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' }),
    classId, className: cls.name, studentId,
    studentName: student.name, mode,
    callCountAfter: student.callCount || 0,
    questionContent: question.content, recordType:'MYSTERY_DOOR',
    note: hasOutcome ? 'Ô cửa bí mật: ' + change.outcome : existing?.note || 'Ô cửa bí mật: chấm điểm',
    score: hasScore ? String(change.score) : existing?.score,
    assignedTxSlot: txSlot,
  };
  const nextHistory = existing ? history.map(h => h.id === attemptId ? record : h) : [record, ...history];

  const message = hasScore
    ? change.saveToGradebook && txSlot
      ? 'Đã lưu ' + change.score + ' điểm vào lịch sử và ô ' + txSlot.toUpperCase() + ' trong Sổ điểm.'
      : 'Đã lưu ' + change.score + ' điểm vào lịch sử. Chưa ghi vào Sổ điểm.'
    : 'Đã lưu đánh giá ' + change.outcome + ' vào lịch sử.';
  return { saved:true, message, classes:nextClasses, history:nextHistory, txSlot };
}
